import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  INVESTOR_MOVES,
  investorIsWithdrawable,
  investorReference,
  type InvestorMove,
  type InvestorStatus,
} from '@afaq/types';

import type { PrismaTransactionClient } from '@afaq/database';

import type { AuditJsonObject, AuditJsonValue } from '../audit/audit-json.js';

import type { StaffContext } from '../auth/staff-context.types.js';

import { PrismaService } from '../prisma/prisma.service.js';

import { SupabaseService } from '../supabase/supabase.service.js';

import type {
  InviteInvestorDto,
  InvestorNoteDto,
  InvestorReasonDto,
  UpdateInvestorDto,
} from './dto/write-investor.dto.js';

import {
  assertInvestorEditable,
  assertInvestorMove,
  assertNameEditable,
  cannotWithdraw,
  changedMeanwhile,
  investorNotFound,
} from './investor-policy.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**

 * What each account change is called in the audit trail.

 *

 * Verbs, so each entry reads as something somebody did. Spelled out rather

 * than derived from the status, because reinstating and the investor's own

 * activation both end at ACTIVE and must not share a name. Every value is in

 * AUDIT_ACTIONS, which audit-actions.spec.ts enforces.

 */

export const INVESTOR_MOVE_ACTIONS: Record<InvestorMove, string> = {
  suspend: 'investor.suspended',

  reinstate: 'investor.reinstated',

  close: 'investor.closed',
};

/** The fields an edit may carry, in the order the audit entry lists them. */

const EDITABLE_FIELDS = ['displayName', 'phone', 'countryOfResidence', 'preferredLocale'] as const;

/** What the write side needs to know about an account before changing it. */

interface TargetInvestor {
  id: string;

  number: number;

  authUserId: string | null;

  type: string;

  email: string;

  displayName: string;

  phone: string | null;

  countryOfResidence: string | null;

  preferredLocale: string;

  status: string;

  kycApprovedAt: Date | null;

  invitationSentCount: number;

  _count: { kycSubmissions: number };
}

const TARGET_SELECT = {
  id: true,

  number: true,

  authUserId: true,

  type: true,

  email: true,

  displayName: true,

  phone: true,

  countryOfResidence: true,

  preferredLocale: true,

  status: true,

  kycApprovedAt: true,

  invitationSentCount: true,

  _count: { select: { kycSubmissions: true } },
} as const;

/** How an investor is named in the audit trail: what staff search for. */

function auditLabel(investor: { number: number; displayName: string }): string {
  return `${investor.displayName} (${investorReference(investor.number)})`;
}

/** Everything an investor edit carries is a string or null. */

function auditValue(value: string | null | undefined): AuditJsonValue {
  return value ?? null;
}

/**

 * Changing investor accounts.

 *

 * Every change has the same shape: load the account, ask the policy whether

 * the change is allowed, then apply it in one transaction together with its

 * audit entry. A change without its audit record is worse than no change at

 * all, because the trail then lies by omission.

 *

 * Every write is conditional on the account still being in the state that

 * was checked — "suspend it if it is still ACTIVE" — so two people pressing

 * buttons at the same moment produce one change and one audit entry, and the

 * second is told somebody beat them to it.

 *

 * Invitations involve a second system. Supabase holds the sign-in account and

 * we hold the investor; they are created in that order, and if our half fails

 * the Supabase account is removed again, because a half-invited person has

 * their email address taken by an account nobody can see.

 */

@Injectable()
export class InvestorsManagementService {
  private readonly logger = new Logger(InvestorsManagementService.name);

  constructor(
    private readonly prisma: PrismaService,

    private readonly supabase: SupabaseService,

    private readonly config: ConfigService,
  ) {}

  /** Staff inviting somebody to invest. They set their own password from the email. */

  async invite(actor: StaffContext, input: InviteInvestorDto): Promise<{ id: string }> {
    await this.assertEmailFree(input.email);

    const locale = input.preferredLocale ?? 'en';

    const days = await this.invitationDays();

    // Supabase first: it owns the identity, and it is the step most likely to

    // refuse (an address already registered, a rate limit, a bad address).

    const { data, error } = await this.supabase

      .getAdminClient()

      .auth.admin.inviteUserByEmail(input.email, {
        redirectTo: this.acceptUrl(locale),

        // A display name for the email template only. User metadata can be

        // changed by the user themselves, so nothing ever trusts it for access.

        data: { full_name: input.displayName },
      });

    if (error || !data.user) {
      this.logger.warn(`Investor invitation refused by Supabase: ${error?.message ?? 'no user'}`);

      throw invitationRefused(error);
    }

    const authUserId = data.user.id;

    const now = new Date();

    const expiresAt = new Date(now.getTime() + days * DAY_MS);

    try {
      return await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
        const investor = await tx.investor.create({
          data: {
            authUserId,

            type: input.type,

            source: 'STAFF_INVITED',

            email: input.email,

            phone: input.phone ?? null,

            displayName: input.displayName,

            countryOfResidence: input.countryOfResidence ?? null,

            preferredLocale: locale,

            status: 'INVITED',

            invitedAt: now,

            invitationExpiresAt: expiresAt,

            invitationSentCount: 1,

            invitedById: actor.staffUserId,
          },

          select: { id: true, number: true },
        });

        await tx.auditLog.create({
          data: {
            actorStaffUserId: actor.staffUserId,

            actorEmail: actor.email,

            category: 'INVESTOR',

            action: 'investor.invited',

            targetType: 'Investor',

            targetId: investor.id,

            targetLabel: auditLabel({ number: investor.number, displayName: input.displayName }),

            after: {
              type: input.type,

              email: input.email,

              displayName: input.displayName,

              phone: input.phone ?? null,

              countryOfResidence: input.countryOfResidence ?? null,

              source: 'STAFF_INVITED',

              status: 'INVITED',

              invitationExpiresAt: expiresAt.toISOString(),
            },
          },
        });

        return { id: investor.id };
      });
    } catch (failure) {
      // Our half failed after Supabase created the account. Remove it, or the

      // address is taken by an account nobody can reach.

      await this.removeAuthUser(authUserId);

      // Somebody invited the same address in the same instant; the unique

      // index caught it, and the other invitation is the one that stands.

      if (isUniqueViolation(failure)) {
        throw new ConflictException({
          reason: 'already_invited',

          field: 'email',

          message: 'That person was invited a moment ago by somebody else.',
        });
      }

      this.logger.error(`Rolled back an investor invitation: ${describeFailure(failure)}`);

      throw new InternalServerErrorException({
        message: 'The invitation could not be completed. Nothing was saved — try again.',
      });
    }
  }

  /** Sends the invitation again, with a fresh expiry. Only while nobody has accepted it. */

  async resendInvitation(actor: StaffContext, id: string): Promise<{ id: string }> {
    const target = await this.loadTarget(id);

    if (target.status !== 'INVITED') {
      throw new ConflictException({
        reason: 'not_invited',

        message:
          target.status === 'CLOSED'
            ? 'That account is closed, so its invitation cannot be sent again.'
            : 'They have already accepted their invitation.',
      });
    }

    const days = await this.invitationDays();

    const { data, error } = await this.supabase

      .getAdminClient()

      .auth.admin.inviteUserByEmail(target.email, {
        redirectTo: this.acceptUrl(target.preferredLocale),

        data: { full_name: target.displayName },
      });

    if (error) {
      this.logger.warn(`Could not resend an investor invitation: ${error.message}`);

      // Supabase limits how often it will send to one address. Saying so is

      // more use than "something went wrong", because waiting actually works.

      throw new BadRequestException({
        reason: error.status === 429 ? 'rate_limited' : 'invite_failed',

        message:
          error.status === 429
            ? 'That was sent recently. Wait a minute before trying again.'
            : 'The invitation could not be sent. Check the email address and try again.',
      });
    }

    const expiresAt = new Date(Date.now() + days * DAY_MS);

    const sentCount = target.invitationSentCount + 1;

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      const { count } = await tx.investor.updateMany({
        where: { id: target.id, status: 'INVITED' },

        data: {
          invitationExpiresAt: expiresAt,

          invitationSentCount: { increment: 1 },

          // An invitation record that somehow lost its sign-in account gets the

          // one Supabase has just created or found for the address.

          ...(target.authUserId === null && data.user ? { authUserId: data.user.id } : {}),
        },
      });

      if (count !== 1) throw changedMeanwhile();

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,

          actorEmail: actor.email,

          category: 'INVESTOR',

          action: 'investor.invitation_resent',

          targetType: 'Investor',

          targetId: target.id,

          targetLabel: auditLabel(target),

          after: { invitationExpiresAt: expiresAt.toISOString(), invitationSentCount: sentCount },
        },
      });
    });

    return { id: target.id };
  }

  /**

   * Housekeeping on an account: contact details, language, and the name until

   * identity has been confirmed.

   */

  async update(actor: StaffContext, id: string, input: UpdateInvestorDto): Promise<{ id: string }> {
    const target = await this.loadTarget(id);

    assertInvestorEditable(target.status as InvestorStatus);

    const before: AuditJsonObject = {};

    const after: AuditJsonObject = {};

    // Typed column by column: displayName and preferredLocale are required

    // columns, and the DTO already refuses null for them.

    const changes: {
      displayName?: string;

      phone?: string | null;

      countryOfResidence?: string | null;

      preferredLocale?: string;
    } = {};

    for (const field of EDITABLE_FIELDS) {
      const next = input[field];

      if (next === undefined || next === target[field]) continue;

      Object.assign(changes, { [field]: next });

      before[field] = auditValue(target[field]);

      after[field] = auditValue(next);
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException({ reason: 'no_change', message: 'Nothing to change.' });
    }

    const renaming = changes.displayName !== undefined;

    if (renaming) assertNameEditable(target.kycApprovedAt);

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      const { count } = await tx.investor.updateMany({
        where: {
          id: target.id,

          status: target.status as InvestorStatus,

          // Approval could land between the check above and this write. The

          // condition makes the rename lose that race instead of overwriting

          // the name that was just confirmed.

          ...(renaming ? { kycApprovedAt: null } : {}),
        },

        data: changes,
      });

      if (count !== 1) throw changedMeanwhile();

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,

          actorEmail: actor.email,

          category: 'INVESTOR',

          action: 'investor.updated',

          targetType: 'Investor',

          targetId: target.id,

          targetLabel: auditLabel(target),

          before,

          after,
        },
      });
    });

    return { id: target.id };
  }

  /** Temporarily blocks an account. Everything is kept and it can be lifted. */

  suspend(actor: StaffContext, id: string, input: InvestorReasonDto): Promise<{ id: string }> {
    return this.move(actor, id, 'suspend', input.reason);
  }

  reinstate(actor: StaffContext, id: string, input: InvestorNoteDto): Promise<{ id: string }> {
    return this.move(actor, id, 'reinstate', input.reason ?? null);
  }

  /** Ends the relationship. Final; the record is kept for the retention period. */

  close(actor: StaffContext, id: string, input: InvestorReasonDto): Promise<{ id: string }> {
    return this.move(actor, id, 'close', input.reason);
  }

  /**

   * Removes an invitation outright — the typo in an email address.

   *

   * Only while nobody has accepted it and there are no identity-check records

   * at all; anything else is a customer record and is closed instead. The

   * database row goes first, with its audit entry, because that is the

   * record. The Supabase account follows; if that fails it is logged rather

   * than undoing a withdrawal that has already been written down.

   */

  async withdraw(actor: StaffContext, id: string): Promise<{ id: string }> {
    const target = await this.loadTarget(id);

    const status = target.status as InvestorStatus;

    if (
      !investorIsWithdrawable({ status, hasEverSubmittedKyc: target._count.kycSubmissions > 0 })
    ) {
      throw cannotWithdraw(status);
    }

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      // Conditional on both rules still holding: an invitation accepted, or a

      // draft started, a moment ago is not deleted out from under them.

      const { count } = await tx.investor.deleteMany({
        where: { id: target.id, status: 'INVITED', kycSubmissions: { none: {} } },
      });

      if (count !== 1) throw changedMeanwhile();

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,

          actorEmail: actor.email,

          category: 'INVESTOR',

          action: 'investor.invitation_withdrawn',

          targetType: 'Investor',

          // The row is gone, so the id would dangle; the label and the

          // snapshot are what still say what was withdrawn.

          targetId: null,

          targetLabel: auditLabel(target),

          before: {
            reference: investorReference(target.number),

            type: target.type,

            email: target.email,

            displayName: target.displayName,

            status: target.status,
          },
        },
      });
    });

    if (target.authUserId !== null) await this.removeAuthUser(target.authUserId);

    return { id: target.id };
  }

  // =========================================================================

  // SHARED

  // =========================================================================

  /**

   * One account change and its audit entry.

   *

   * The update is conditional on the status still being what was loaded, so

   * a race produces one change and one entry rather than two.

   */

  private async move(
    actor: StaffContext,

    id: string,

    move: InvestorMove,

    reason: string | null,
  ): Promise<{ id: string }> {
    const target = await this.loadTarget(id);

    const from = target.status as InvestorStatus;

    assertInvestorMove(move, from);

    const to = INVESTOR_MOVES[move].to;

    const closedAt = move === 'close' ? new Date() : null;

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      const { count } = await tx.investor.updateMany({
        where: { id: target.id, status: from },

        data: { status: to, ...(closedAt ? { closedAt } : {}) },
      });

      if (count !== 1) throw changedMeanwhile();

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,

          actorEmail: actor.email,

          category: 'INVESTOR',

          action: INVESTOR_MOVE_ACTIONS[move],

          targetType: 'Investor',

          targetId: target.id,

          targetLabel: auditLabel(target),

          before: { status: from },

          after: { status: to, ...(closedAt ? { closedAt: closedAt.toISOString() } : {}) },

          ...(reason ? { metadata: { reason } } : {}),
        },
      });
    });

    return { id: target.id };
  }

  /**

   * One email address, one person.

   *

   * An address already on an investor account is refused, and so is a staff

   * member's: both kinds of account sign in through the same Supabase

   * project, so one address cannot be both — and keeping them apart means a

   * staff member's sign-in can never be mistaken for an investor's.

   */

  private async assertEmailFree(email: string): Promise<void> {
    const investor = await this.prisma.db.investor.findUnique({
      where: { email },

      select: { status: true },
    });

    if (investor) {
      const invited = investor.status === 'INVITED';

      throw new ConflictException({
        reason: invited ? 'already_invited' : 'already_investor',

        field: 'email',

        message: invited
          ? 'That person has already been invited. Resend the invitation instead.'
          : 'An investor with that email address already exists.',
      });
    }

    const staff = await this.prisma.db.staffUser.findUnique({
      where: { email },

      select: { id: true },
    });

    if (staff) {
      throw new ConflictException({
        reason: 'email_is_staff',

        field: 'email',

        message: 'That email address belongs to a staff account. Use a different address.',
      });
    }
  }

  /** Where the invitation email sends them: the Investor Portal's own sign-in callback. */

  private acceptUrl(locale: string): string {
    const investorAppUrl = this.config.get<string>('investorAppUrl') ?? 'http://localhost:3001';

    return `${investorAppUrl}/${locale}/auth/callback?next=/accept-invitation`;
  }

  /** How long an invitation stays usable, from the compliance settings. */

  private async invitationDays(): Promise<number> {
    const settings = await this.prisma.db.complianceSettings.findUnique({
      where: { id: 'global' },

      select: { investorInvitationDays: true },
    });

    if (!settings) {
      throw new NotFoundException({
        reason: 'not_seeded',

        message: 'Compliance settings have not been created yet. Run the database seed.',
      });
    }

    return settings.investorInvitationDays;
  }

  /** Best effort: a failure here is logged, never thrown over a change already made. */

  private async removeAuthUser(authUserId: string): Promise<void> {
    try {
      const { error } = await this.supabase.getAdminClient().auth.admin.deleteUser(authUserId);

      if (error) throw error;
    } catch (failure) {
      this.logger.error(
        `Could not remove Supabase account ${authUserId}; delete it from the Supabase dashboard ` +
          `before inviting that address again: ${describeFailure(failure)}`,
      );
    }
  }

  private async loadTarget(id: string): Promise<TargetInvestor> {
    const target: TargetInvestor | null = await this.prisma.db.investor.findUnique({
      where: { id },

      select: TARGET_SELECT,
    });

    if (!target) throw investorNotFound();

    return target;
  }
}

/** What to tell staff when Supabase will not send an invitation. */

function invitationRefused(
  error: { status?: number; code?: string; message?: string } | null,
): Error {
  if (error?.status === 429) {
    return new BadRequestException({
      reason: 'rate_limited',

      message: 'Too many invitations just now. Try again in a few minutes.',
    });
  }

  // The address already has a sign-in account that is neither an investor

  // nor staff here — most likely left behind by an earlier failure.

  if (error?.status === 422 || error?.code === 'email_exists') {
    return new ConflictException({
      reason: 'email_in_use',

      field: 'email',

      message: 'That email address already has a sign-in account. Contact support to resolve it.',
    });
  }

  return new InternalServerErrorException({
    message: 'The invitation could not be sent. Try again shortly.',
  });
}

/**

 * A failure in words, for the log.

 *

 * Supabase hands back plain objects with a message rather than Error

 * instances, which String() would print as "[object Object]".

 */

function describeFailure(failure: unknown): string {
  if (failure instanceof Error) return failure.message;

  if (typeof failure === 'object' && failure !== null && 'message' in failure) {
    return String((failure as { message: unknown }).message);
  }

  return String(failure);
}

/** Prisma's unique-constraint failure, recognised without importing Prisma. */

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}
