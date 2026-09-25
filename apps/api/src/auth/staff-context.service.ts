import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { SUPER_ADMIN_ROLE_KEY, type PermissionKey, type StaffStatus } from '@afaq/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { AuthRefusalReason, StaffContext } from './staff-context.types.js';

/**
 * The shape this service reads from the database. Written out rather than
 * inferred so the code says plainly what it depends on.
 */
interface StaffRecord {
  id: string;
  authUserId: string | null;
  email: string;
  fullName: string;
  status: string;
  roles: Array<{
    role: {
      key: string;
      permissions: Array<{ permission: { key: string } }>;
    };
  }>;
}

interface CachedIdentity {
  authUserId: string;
  email: string;
  expiresAt: number;
}

/** How long a verified token is trusted before Supabase is asked again. */
const TOKEN_CACHE_MS = 30_000;

/** How often "last seen" is written for one person. */
const LAST_SEEN_INTERVAL_MS = 5 * 60_000;

/**
 * Turns a bearer token into a staff member, or refuses the request.
 *
 * The chain is deliberate:
 *   token → Supabase identity → our staff record → status → roles →
 *   permissions
 *
 * Every link can refuse, and the reasons are distinct: an unknown token is
 * 401 (who are you?), while a known person who is suspended is 403 (we know
 * who you are, and the answer is no).
 */

export interface ResolveOptions {
  /** Set only by the endpoint where an invitation is accepted. */
  allowInvited?: boolean;
}
@Injectable()
export class StaffContextService {
  private readonly logger = new Logger(StaffContextService.name);

  /**
   * Verified tokens, briefly. Supabase is a network call, and a busy screen
   * makes several requests at once; thirty seconds removes the repetition
   * without letting a revoked token linger meaningfully.
   */
  private readonly identityCache = new Map<string, CachedIdentity>();

  /** When each person's "last seen" was last written. */
  private readonly lastSeenWrites = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async resolve(token: string, options: ResolveOptions = {}): Promise<StaffContext> {
    const identity = await this.verifyToken(token);
    return this.loadStaff(identity.authUserId, identity.email, options);
  }

  /** Checks the token with Supabase; anything unverifiable is a 401. */
  private async verifyToken(token: string): Promise<CachedIdentity> {
    const cached = this.identityCache.get(token);

    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    const { data, error } = await this.supabase.getAdminClient().auth.getUser(token);

    if (error || !data.user?.id) {
      throw this.refuse('invalid_token');
    }

    const identity: CachedIdentity = {
      authUserId: data.user.id,
      email: data.user.email ?? '',
      expiresAt: Date.now() + TOKEN_CACHE_MS,
    };

    this.identityCache.set(token, identity);
    this.pruneCache();

    return identity;
  }

  /**
   * Finds the staff member behind an authenticated account.
   *
   * A valid Supabase account that is not staff is refused: identity alone
   * grants nothing here.
   */
  private async loadStaff(
    authUserId: string,
    email: string,
    options: ResolveOptions = {},
  ): Promise<StaffContext> {
    const staff: StaffRecord | null = await this.prisma.db.staffUser.findUnique({
      where: { authUserId },
      select: {
        id: true,
        authUserId: true,
        email: true,
        fullName: true,
        status: true,
        roles: {
          select: {
            role: {
              select: {
                key: true,
                permissions: { select: { permission: { select: { key: true } } } },
              },
            },
          },
        },
      },
    });

    if (!staff?.authUserId) {
      this.logger.warn(`Authenticated account with no staff record: ${email}`);
      throw this.refuse('not_staff');
    }

    this.assertStatusAllowsAccess(staff.status as StaffStatus, options);

    const roleKeys: string[] = staff.roles.map((entry) => entry.role.key);

    // A Set: two roles commonly grant the same permission.
    const permissionKeys: PermissionKey[] = [
      ...new Set(
        staff.roles.flatMap((entry) =>
          entry.role.permissions.map((link) => link.permission.key as PermissionKey),
        ),
      ),
    ];

    return {
      staffUserId: staff.id,
      authUserId: staff.authUserId,
      email: staff.email,
      fullName: staff.fullName,
      status: staff.status as StaffStatus,
      roleKeys,
      permissionKeys,
      isSuperAdmin: roleKeys.includes(SUPER_ADMIN_ROLE_KEY),
    };
  }

  /**
   * Only ACTIVE staff may use the portal.
   *
   * Hiding buttons in the browser is not security: this is the check that
   * actually stops a suspended account, whatever it sends us.
   */
  private assertStatusAllowsAccess(status: StaffStatus, options: ResolveOptions = {}): void {
    if (status === 'ACTIVE') return;
    if (status === 'INVITED' && options.allowInvited) return;

    const reason: AuthRefusalReason =
      status === 'INVITED' ? 'invited' : status === 'SUSPENDED' ? 'suspended' : 'disabled';

    throw this.refuse(reason);
  }

  /**
   * One place where refusals are shaped.
   *
   * The message says what the person can do about it without describing our
   * internals, and the machine-readable reason is there for the audit trail.
   */
  private refuse(reason: AuthRefusalReason): UnauthorizedException | ForbiddenException {
    switch (reason) {
      case 'missing_token':
      case 'invalid_token':
        return new UnauthorizedException({
          reason,
          message: 'Sign in to continue.',
        });
      case 'not_staff':
        return new ForbiddenException({
          reason,
          message: 'This account does not have access to the Admin Portal.',
        });
      case 'invited':
        return new ForbiddenException({
          reason,
          message: 'Finish setting up your account from your invitation email first.',
        });
      case 'suspended':
        return new ForbiddenException({
          reason,
          message: 'Your access is suspended. Contact an administrator.',
        });
      case 'disabled':
        return new ForbiddenException({
          reason,
          message: 'This account has been closed.',
        });
      // Permission refusals are raised by the permissions guard, not here;
      // handled for completeness so the set of reasons stays exhaustive.
      case 'missing_permission':
        return new ForbiddenException({
          reason,
          message: 'You do not have permission to do this.',
        });
    }
  }

  /** Drops expired entries so the cache cannot grow without bound. */
  private pruneCache(): void {
    if (this.identityCache.size < 500) return;

    const now = Date.now();
    for (const [token, entry] of this.identityCache) {
      if (entry.expiresAt <= now) this.identityCache.delete(token);
    }
  }

  /**
   * Records that this person is still working, at most once every few
   * minutes — the staff list wants "last seen today", not a write per request.
   */
  async touchLastSeen(staffUserId: string): Promise<void> {
    const last = this.lastSeenWrites.get(staffUserId) ?? 0;
    if (Date.now() - last < LAST_SEEN_INTERVAL_MS) return;

    this.lastSeenWrites.set(staffUserId, Date.now());

    try {
      await this.prisma.db.staffUser.update({
        where: { id: staffUserId },
        data: { lastSeenAt: new Date() },
      });
    } catch {
      // Activity tracking must never break a request.
    }
  }

  /** Forgets a token immediately — used when someone signs out. */
  forgetToken(token: string): void {
    this.identityCache.delete(token);
  }
}
