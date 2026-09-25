import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PrismaTransactionClient } from '@afaq/database';
import type { StaffContext } from '../auth/staff-context.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { INVITATION_VALID_DAYS } from './staff-invitations.service.js';

/**
 * What happens to an invitation after it is sent: accepting it, and sending
 * it again when it is lost or has run out.
 *
 * Separate from the service that creates invitations because the actors are
 * different. Creating one is an administrator acting on somebody else;
 * accepting one is that person acting on themselves, before they are allowed
 * to do anything else at all.
 */
@Injectable()
export class InvitationLifecycleService {
  private readonly logger = new Logger(InvitationLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Turns an invited person into an active one.
   *
   * They reach this having followed the emailed link and set a password, so
   * Supabase already knows them; what is left is our own record. The password
   * itself is set in the browser against Supabase — it never passes through
   * here, which is why there is nothing to validate.
   */
  async accept(actor: StaffContext): Promise<{ id: string }> {
    const staff = await this.prisma.db.staffUser.findUnique({
      where: { id: actor.staffUserId },
      select: { id: true, email: true, status: true, invitationExpiresAt: true },
    });

    // The guard only lets ACTIVE and INVITED through here, and ACTIVE means
    // they have already done this — a reload of the page, most likely.
    if (staff?.status === 'ACTIVE') return { id: actor.staffUserId };

    if (!staff || staff.status !== 'INVITED') {
      throw new BadRequestException({
        reason: 'not_invited',
        message: 'This invitation is no longer open.',
      });
    }

    if (staff.invitationExpiresAt && staff.invitationExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        reason: 'invitation_expired',
        message: 'This invitation has expired. Ask an administrator to send you a new one.',
      });
    }

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.staffUser.update({
        where: { id: staff.id },
        data: { status: 'ACTIVE', activatedAt: new Date(), invitationExpiresAt: null },
      });

      await tx.auditLog.create({
        data: {
          // They act on themselves here, which is worth being able to see.
          actorStaffUserId: staff.id,
          actorEmail: staff.email,
          category: 'STAFF',
          action: 'staff.invitation_accepted',
          targetType: 'StaffUser',
          targetId: staff.id,
          targetLabel: staff.email,
          before: { status: 'INVITED' },
          after: { status: 'ACTIVE' },
        },
      });

      await tx.authActivity.create({
        data: {
          staffUserId: staff.id,
          email: staff.email,
          event: 'INVITATION_ACCEPTED',
        },
      });
    });

    return { id: staff.id };
  }

  /**
   * Sends the invitation again and restarts its clock.
   *
   * Needed more often than it sounds: invitation emails get filtered, and an
   * invitation that has run out otherwise leaves the person stuck with a
   * record nobody can use.
   */
  async resend(actor: StaffContext, staffUserId: string): Promise<{ id: string }> {
    const staff = await this.prisma.db.staffUser.findUnique({
      where: { id: staffUserId },
      select: { id: true, email: true, status: true, preferredLocale: true },
    });

    if (!staff) {
      throw new BadRequestException({ message: 'That staff member no longer exists.' });
    }

    if (staff.status !== 'INVITED') {
      throw new BadRequestException({
        reason: 'not_invited',
        message: 'They have already accepted their invitation.',
      });
    }

    const adminAppUrl = this.config.get<string>('adminAppUrl') ?? 'http://localhost:3000';

    const { error } = await this.supabase
      .getAdminClient()
      .auth.admin.inviteUserByEmail(staff.email, {
        redirectTo: `${adminAppUrl}/${staff.preferredLocale}/auth/callback?next=/accept-invitation`,
      });

    if (error) {
      // Supabase limits how often it will send to one address. Saying so is
      // more use than "something went wrong", because waiting actually works.
      const rateLimited = error.status === 429;

      this.logger.warn(`Could not resend invitation to ${staff.email}: ${error.message}`);

      throw new BadRequestException({
        reason: rateLimited ? 'rate_limited' : 'invite_failed',
        message: rateLimited
          ? 'That was sent recently. Wait a minute before trying again.'
          : 'The invitation could not be sent. Check the email address and try again.',
      });
    }

    const expiresAt = new Date(Date.now() + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.staffUser.update({
        where: { id: staff.id },
        data: { invitationExpiresAt: expiresAt },
      });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'STAFF',
          action: 'staff.invitation_resent',
          targetType: 'StaffUser',
          targetId: staff.id,
          targetLabel: staff.email,
          after: { invitationExpiresAt: expiresAt.toISOString() },
        },
      });

      await tx.authActivity.create({
        data: { staffUserId: staff.id, email: staff.email, event: 'INVITATION_SENT' },
      });
    });

    return { id: staff.id };
  }
}
