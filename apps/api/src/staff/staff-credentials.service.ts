import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { PrismaTransactionClient } from '@afaq/database';
import type { StaffContext } from '../auth/staff-context.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

interface StaffWithRoles {
  id: string;
  email: string;
  roles: Array<{ roleId: string }>;
}

/**
 * Changing a staff member's sign-in details on their behalf.
 *
 * Only a Super Admin reaches any of this — it is the strongest thing an
 * administrator can do to somebody else's account.
 *
 * There is deliberately no way to read an existing password. Supabase stores
 * a one-way hash, so the original does not exist anywhere to be read; and a
 * system where an administrator could read one would make every entry in the
 * audit trail deniable ("someone with my password did that"). What an
 * administrator can do instead is set a NEW password, once, and hand it over
 * — which solves the lockout without ever exposing what came before.
 */
@Injectable()
export class StaffCredentialsService {
  private readonly logger = new Logger(StaffCredentialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Sets a new password and returns it once.
   *
   * The generated password is in the response and nowhere else: not in the
   * database, not in the audit entry, not in the logs. The administrator
   * passes it to the person, who changes it. If the administrator loses it
   * before then, they generate another — which is cheap, and much safer than
   * storing it somewhere "just in case".
   */
  async resetPassword(
    actor: StaffContext,
    staffUserId: string,
  ): Promise<{ temporaryPassword: string }> {
    const staff = await this.load(staffUserId);

    if (!staff.authUserId) {
      throw new BadRequestException({
        reason: 'not_activated',
        message: 'They have not accepted their invitation yet, so there is no password to reset.',
      });
    }

    const temporaryPassword = generatePassword();

    const { error } = await this.supabase
      .getAdminClient()
      .auth.admin.updateUserById(staff.authUserId, { password: temporaryPassword });

    if (error) {
      this.logger.warn(`Could not reset the password for ${staff.email}: ${error.message}`);
      throw new BadRequestException({
        reason: 'reset_failed',
        message: 'The password could not be changed. Try again in a moment.',
      });
    }

    await this.prisma.db.auditLog.create({
      data: {
        actorStaffUserId: actor.staffUserId,
        actorEmail: actor.email,
        category: 'SECURITY',
        action: 'staff.password_reset_by_admin',
        targetType: 'StaffUser',
        targetId: staff.id,
        targetLabel: staff.email,
        // The fact, never the password. Somebody reading this trail needs to
        // know it happened and who did it — nothing more.
        metadata: { method: 'temporary_password' },
      },
    });

    await this.prisma.db.authActivity.create({
      data: {
        staffUserId: staff.id,
        email: staff.email,
        event: 'PASSWORD_RESET_COMPLETED',
        succeeded: true,
        deviceLabel: 'set by administrator',
      },
    });

    return { temporaryPassword };
  }

  /**
   * Changes the address somebody signs in with.
   *
   * Both places have to agree: Supabase decides who they are, our record
   * decides what they may do. Supabase goes first, because if it refuses —
   * the address is taken, say — nothing here has changed yet.
   */
  async changeEmail(
    actor: StaffContext,
    staffUserId: string,
    newEmail: string,
  ): Promise<{ id: string }> {
    const staff = await this.load(staffUserId);
    const email = newEmail.trim().toLowerCase();

    if (email === staff.email) {
      throw new BadRequestException({
        reason: 'no_change',
        message: 'That is already their email.',
      });
    }

    const taken = await this.prisma.db.staffUser.findUnique({
      where: { email },
      select: { id: true },
    });

    if (taken) {
      throw new ConflictException({
        reason: 'email_taken',
        message: 'Another staff member already uses that email address.',
      });
    }

    if (staff.authUserId) {
      const { error } = await this.supabase.getAdminClient().auth.admin.updateUserById(
        staff.authUserId,
        // Confirmed outright: an administrator changing this on somebody's
        // behalf has already established who they are, and an unconfirmed
        // address would lock the person out of the account entirely.
        { email, email_confirm: true },
      );

      if (error) {
        this.logger.warn(`Could not change the email for ${staff.email}: ${error.message}`);
        throw new BadRequestException({
          reason: 'email_change_failed',
          message: 'That email could not be set. It may already be in use.',
        });
      }
    }

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.staffUser.update({ where: { id: staff.id }, data: { email } });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'SECURITY',
          action: 'staff.email_changed',
          targetType: 'StaffUser',
          targetId: staff.id,
          targetLabel: email,
          before: { email: staff.email },
          after: { email },
        },
      });
    });

    return { id: staff.id };
  }

  /**
   * Moves somebody's roles to a colleague.
   *
   * For the case where a person is leaving or being suspended and their work
   * has to continue: it puts the same roles on somebody else in one step,
   * rather than an administrator reading one screen while typing into
   * another and getting it subtly wrong.
   */
  async transferRoles(
    actor: StaffContext,
    fromStaffUserId: string,
    toStaffUserId: string,
    options: { removeFromSource: boolean },
  ): Promise<{ id: string }> {
    if (fromStaffUserId === toStaffUserId) {
      throw new BadRequestException({
        reason: 'same_person',
        message: 'Choose a different person to transfer the roles to.',
      });
    }

    const [source, target] = await Promise.all([
      this.loadWithRoles(fromStaffUserId),
      this.loadWithRoles(toStaffUserId),
    ]);

    if (source.roles.length === 0) {
      throw new BadRequestException({
        reason: 'nothing_to_transfer',
        message: 'They hold no roles to transfer.',
      });
    }

    const existing = new Set(target.roles.map((entry) => entry.roleId));
    const toAdd = source.roles.filter((entry) => !existing.has(entry.roleId));

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      if (toAdd.length > 0) {
        await tx.staffUserRole.createMany({
          data: toAdd.map((entry) => ({
            staffUserId: target.id,
            roleId: entry.roleId,
            assignedById: actor.staffUserId,
          })),
        });
      }

      if (options.removeFromSource) {
        await tx.staffUserRole.deleteMany({ where: { staffUserId: source.id } });
      }

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'PERMISSION',
          action: 'staff.roles_transferred',
          targetType: 'StaffUser',
          targetId: target.id,
          targetLabel: target.email,
          before: { from: source.email, hadRoles: target.roles.length },
          after: {
            addedRoles: toAdd.length,
            removedFromSource: options.removeFromSource,
          },
        },
      });
    });

    return { id: target.id };
  }

  private async load(staffUserId: string) {
    const staff = await this.prisma.db.staffUser.findUnique({
      where: { id: staffUserId },
      select: { id: true, email: true, authUserId: true, status: true },
    });

    if (!staff) throw new NotFoundException({ message: 'That staff member no longer exists.' });

    return staff;
  }

  private async loadWithRoles(staffUserId: string): Promise<StaffWithRoles> {
    const staff: StaffWithRoles | null = await this.prisma.db.staffUser.findUnique({
      where: { id: staffUserId },
      select: { id: true, email: true, roles: { select: { roleId: true } } },
    });

    if (!staff) throw new NotFoundException({ message: 'That staff member no longer exists.' });

    return staff;
  }
}

/**
 * A password strong enough that handing it over is safe, and short enough to
 * read down a phone line.
 *
 * Built from crypto randomness rather than Math.random, which is predictable
 * and has no business anywhere near a credential.
 */
function generatePassword(): string {
  // No look-alike characters: someone is going to read this aloud or retype
  // it, and 0/O, 1/l/I cost more support calls than they save entropy.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(20);

  const body = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');

  // Guarantees the mix our own password rules demand, so the temporary one
  // would itself pass validation.
  return `${body.slice(0, 18)}-${randomBytes(1)[0]! % 10}A`;
}
