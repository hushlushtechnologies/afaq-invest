import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hasAllPermissions, SUPER_ADMIN_ROLE_KEY, type PermissionKey } from '@afaq/types';
import type { PrismaTransactionClient } from '@afaq/database';
import type { StaffContext } from '../auth/staff-context.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { InviteStaffDto } from './dto/invite-staff.dto.js';

/** How long an invitation stays usable. */
export const INVITATION_VALID_DAYS = 7;

interface RoleRecord {
  id: string;
  key: string;
  name: string;
  permissions: Array<{ permission: { key: string } }>;
}

/**
 * Inviting staff.
 *
 * Two systems have to agree: Supabase holds the account, we hold the person.
 * They are created in that order, and if our half fails the Supabase account
 * is removed again — a half-invited person is worse than none, because the
 * email address is then taken and nobody can see why.
 */
@Injectable()
export class StaffInvitationsService {
  private readonly logger = new Logger(StaffInvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  async invite(actor: StaffContext, input: InviteStaffDto): Promise<{ id: string }> {
    const roles = await this.resolveRoles(input.roleKeys);
    this.assertMayGrant(actor, roles);
    await this.assertNotAlreadyStaff(input.email);

    const locale = input.preferredLocale ?? 'en';
    const adminAppUrl = this.config.get<string>('adminAppUrl') ?? 'http://localhost:3000';

    // Supabase first: it owns the identity, and it is the step most likely to
    // refuse (a duplicate account, a rate limit, a bad address).
    const { data, error } = await this.supabase
      .getAdminClient()
      .auth.admin.inviteUserByEmail(input.email, {
        redirectTo: `${adminAppUrl}/${locale}/auth/callback?next=/accept-invitation`,
        data: { full_name: input.fullName },
      });

    if (error || !data.user) {
      this.logger.warn(`Invitation refused by Supabase for ${input.email}: ${error?.message}`);

      // A rate limit is temporary and worth saying; anything else is ours.
      if (error?.status === 429) {
        throw new BadRequestException({
          reason: 'rate_limited',
          message: 'Too many invitations just now. Try again in a few minutes.',
        });
      }

      throw new InternalServerErrorException({
        message: 'The invitation could not be sent. Try again shortly.',
      });
    }

    const authUserId = data.user.id;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000);

    try {
      return await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
        const staff = await tx.staffUser.create({
          data: {
            authUserId,
            email: input.email,
            fullName: input.fullName,
            jobTitle: input.jobTitle ?? null,
            preferredLocale: locale,
            status: 'INVITED',
            invitedAt: now,
            invitationExpiresAt: expiresAt,
            invitationSentCount: 1,
            invitedById: actor.staffUserId,
          },
        });

        await tx.staffUserRole.createMany({
          data: roles.map((role) => ({
            staffUserId: staff.id,
            roleId: role.id,
            assignedById: actor.staffUserId,
          })),
        });

        await tx.auditLog.create({
          data: {
            actorStaffUserId: actor.staffUserId,
            actorEmail: actor.email,
            category: 'STAFF',
            action: 'staff.invited',
            targetType: 'StaffUser',
            targetId: staff.id,
            targetLabel: staff.email,
            after: {
              fullName: staff.fullName,
              status: staff.status,
              roles: roles.map((role) => role.key),
            },
          },
        });

        await tx.authActivity.create({
          data: {
            staffUserId: staff.id,
            email: staff.email,
            event: 'INVITATION_SENT',
            succeeded: true,
          },
        });

        return { id: staff.id };
      });
    } catch (failure) {
      // Our half failed after Supabase created the account. Remove it, or the
      // address is taken by an account nobody can reach.
      await this.supabase
        .getAdminClient()
        .auth.admin.deleteUser(authUserId)
        .catch(() => undefined);

      this.logger.error(
        `Rolled back the Supabase account for ${input.email}: ${
          failure instanceof Error ? failure.message : String(failure)
        }`,
      );

      throw new InternalServerErrorException({
        message: 'The invitation could not be completed. Nothing was saved — try again.',
      });
    }
  }

  /** Every requested role must exist; an unknown key is a mistake, not a silent skip. */
  private async resolveRoles(roleKeys: string[]): Promise<RoleRecord[]> {
    const unique = [...new Set(roleKeys)];

    const roles: RoleRecord[] = await this.prisma.db.role.findMany({
      where: { key: { in: unique } },
      select: {
        id: true,
        key: true,
        name: true,
        permissions: { select: { permission: { select: { key: true } } } },
      },
    });

    if (roles.length !== unique.length) {
      const found = new Set(roles.map((role) => role.key));
      const missing = unique.filter((key) => !found.has(key));

      throw new BadRequestException({
        reason: 'unknown_role',
        message: `Unknown role: ${missing.join(', ')}`,
      });
    }

    return roles;
  }

  /**
   * Nobody may hand out more than they hold.
   *
   * Without this, anyone who can invite staff could invite a Super Admin and
   * sign in as them — a complete bypass of every other permission. Super
   * Admins are exempt, since they already hold everything.
   */
  private assertMayGrant(actor: StaffContext, roles: RoleRecord[]): void {
    if (actor.isSuperAdmin) return;

    if (roles.some((role) => role.key === SUPER_ADMIN_ROLE_KEY)) {
      throw new ForbiddenException({
        reason: 'cannot_grant_super_admin',
        message: 'Only a Super Admin can grant the Super Admin role.',
      });
    }

    for (const role of roles) {
      const permissions = role.permissions.map((link) => link.permission.key as PermissionKey);

      if (!hasAllPermissions(actor, permissions)) {
        throw new ForbiddenException({
          reason: 'cannot_grant_role',
          message: `You cannot grant "${role.name}": it includes permissions you do not hold.`,
        });
      }
    }
  }

  /** One person, one staff record — whatever state they are in. */
  private async assertNotAlreadyStaff(email: string): Promise<void> {
    const existing = await this.prisma.db.staffUser.findUnique({
      where: { email },
      select: { status: true },
    });

    if (!existing) return;

    throw new ConflictException({
      reason: existing.status === 'INVITED' ? 'already_invited' : 'already_staff',
      message:
        existing.status === 'INVITED'
          ? 'That person has already been invited. Resend the invitation instead.'
          : 'Someone with that email address is already on the staff list.',
    });
  }
}
