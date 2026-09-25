import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SUPER_ADMIN_ROLE_KEY } from '@afaq/types';
import type { PrismaTransactionClient } from '@afaq/database';
import type { StaffContext } from '../auth/staff-context.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  UpdateStaffDto,
  UpdateStaffRolesDto,
  UpdateStaffStatusDto,
} from './dto/update-staff.dto.js';
import {
  assertMayGrantRoles,
  assertNotLastSuperAdmin,
  assertNotSelf,
  assertStatusTransition,
  type RoleWithPermissions,
} from './staff-policy.js';

interface TargetStaff {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  preferredLocale: string;
  status: string;
  roles: Array<{ role: { id: string; key: string; name: string } }>;
}

/**
 * Changing a staff member: their details, their roles, or their access.
 *
 * Every change is checked against the rules in staff-policy, applied in a
 * transaction with its audit entry, and recorded with what it was before —
 * because "who gave them that role?" is a question somebody will ask.
 */
@Injectable()
export class StaffManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async updateDetails(
    actor: StaffContext,
    staffUserId: string,
    input: UpdateStaffDto,
  ): Promise<{ id: string }> {
    const target = await this.loadTarget(staffUserId);

    const changes = {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle || null } : {}),
      ...(input.preferredLocale !== undefined ? { preferredLocale: input.preferredLocale } : {}),
    };

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException({ reason: 'no_change', message: 'Nothing to change.' });
    }

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.staffUser.update({ where: { id: staffUserId }, data: changes });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'STAFF',
          action: 'staff.details_changed',
          targetType: 'StaffUser',
          targetId: target.id,
          targetLabel: target.email,
          before: {
            fullName: target.fullName,
            jobTitle: target.jobTitle,
            preferredLocale: target.preferredLocale,
          },
          after: changes,
        },
      });
    });

    return { id: staffUserId };
  }

  /**
   * Replaces someone's roles.
   *
   * The list sent is the list they end up with, so removals are as explicit
   * as additions and there is no "add one, forget to remove the other".
   */
  async updateRoles(
    actor: StaffContext,
    staffUserId: string,
    input: UpdateStaffRolesDto,
  ): Promise<{ id: string }> {
    const target = await this.loadTarget(staffUserId);
    const roles = await this.resolveRoles(input.roleKeys);

    const before = target.roles.map((entry) => entry.role.key).sort();
    const after = roles.map((role) => role.key).sort();

    if (before.join() === after.join()) {
      throw new BadRequestException({
        reason: 'no_change',
        message: 'Those are already their roles.',
      });
    }

    // You may only grant what you hold — checked against the roles being
    // added, not the ones already there.
    assertMayGrantRoles(actor, roles);

    const losingSuperAdmin =
      before.includes(SUPER_ADMIN_ROLE_KEY) && !after.includes(SUPER_ADMIN_ROLE_KEY);

    if (losingSuperAdmin) {
      assertNotSelf(actor, staffUserId, 'remove your own Super Admin role from');
      assertNotLastSuperAdmin({
        targetIsSuperAdmin: true,
        activeSuperAdmins: await this.countActiveSuperAdmins(),
        action: 'remove it',
      });
    }

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.staffUserRole.deleteMany({ where: { staffUserId } });
      await tx.staffUserRole.createMany({
        data: roles.map((role) => ({
          staffUserId,
          roleId: role.id,
          assignedById: actor.staffUserId,
        })),
      });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'PERMISSION',
          action: 'staff.roles_changed',
          targetType: 'StaffUser',
          targetId: target.id,
          targetLabel: target.email,
          before: { roles: before },
          after: { roles: after },
        },
      });
    });

    return { id: staffUserId };
  }

  /** Suspending, disabling or reactivating someone. */
  async updateStatus(
    actor: StaffContext,
    staffUserId: string,
    input: UpdateStaffStatusDto,
  ): Promise<{ id: string }> {
    const target = await this.loadTarget(staffUserId);

    assertNotSelf(actor, staffUserId, input.status === 'ACTIVE' ? 'reactivate' : 'close');
    assertStatusTransition(target.status, input.status);

    const targetIsSuperAdmin = target.roles.some(
      (entry) => entry.role.key === SUPER_ADMIN_ROLE_KEY,
    );

    // Only losing access matters; making someone active again never reduces
    // the number of Super Admins.
    if (input.status !== 'ACTIVE') {
      assertNotLastSuperAdmin({
        targetIsSuperAdmin,
        activeSuperAdmins: await this.countActiveSuperAdmins(),
        action: input.status === 'SUSPENDED' ? 'suspend them' : 'close their account',
      });
    }

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.staffUser.update({
        where: { id: staffUserId },
        data: {
          status: input.status,
          // Coming back from suspension is not a first activation.
          ...(input.status === 'ACTIVE' && target.status === 'DISABLED'
            ? { activatedAt: new Date() }
            : {}),
          // A cancelled invitation should not leave a usable expiry behind.
          ...(input.status === 'DISABLED' && target.status === 'INVITED'
            ? { invitationExpiresAt: null }
            : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'STAFF',
          action: `staff.${input.status.toLowerCase()}`,
          targetType: 'StaffUser',
          targetId: target.id,
          targetLabel: target.email,
          before: { status: target.status },
          after: { status: input.status },
          // Free text from the actor — never anything the person typed as a
          // credential.
          metadata: input.reason ? { reason: input.reason } : undefined,
        },
      });
    });

    return { id: staffUserId };
  }

  private async loadTarget(staffUserId: string): Promise<TargetStaff> {
    const target: TargetStaff | null = await this.prisma.db.staffUser.findUnique({
      where: { id: staffUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        jobTitle: true,
        preferredLocale: true,
        status: true,
        roles: { select: { role: { select: { id: true, key: true, name: true } } } },
      },
    });

    if (!target) {
      throw new NotFoundException({ message: 'That staff member no longer exists.' });
    }

    return target;
  }

  private async resolveRoles(roleKeys: string[]): Promise<RoleWithPermissions[]> {
    const unique = [...new Set(roleKeys)];

    const roles: RoleWithPermissions[] = await this.prisma.db.role.findMany({
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
      throw new BadRequestException({
        reason: 'unknown_role',
        message: `Unknown role: ${unique.filter((key) => !found.has(key)).join(', ')}`,
      });
    }

    return roles;
  }

  /**
   * How many Super Admins can actually sign in.
   *
   * Counting everyone with the role would include suspended and invited
   * accounts, which cannot rescue anybody.
   */
  private countActiveSuperAdmins(): Promise<number> {
    return this.prisma.db.staffUser.count({
      where: {
        status: 'ACTIVE',
        roles: { some: { role: { key: SUPER_ADMIN_ROLE_KEY } } },
      },
    });
  }
}
