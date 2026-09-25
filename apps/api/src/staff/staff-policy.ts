import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { hasAllPermissions, SUPER_ADMIN_ROLE_KEY, type PermissionKey } from '@afaq/types';
import type { StaffContext } from '../auth/staff-context.types.js';

export interface RoleWithPermissions {
  id: string;
  key: string;
  name: string;
  permissions: Array<{ permission: { key: string } }>;
}

/**
 * The rules that decide whether a change to a staff member is allowed.
 *
 * Pure functions, deliberately: they are the most security-sensitive code in
 * the sprint, and keeping them free of database and network calls means they
 * can be tested exhaustively and read in one sitting.
 *
 * Every one of them is enforced again by the service that calls it — this is
 * where the reasoning lives, not a substitute for it.
 */

/**
 * Nobody may hand out more than they hold.
 *
 * Without this, anyone who can manage staff could grant themselves or someone
 * else a role with more power than they have — which makes every other
 * permission decorative.
 */
export function assertMayGrantRoles(actor: StaffContext, roles: RoleWithPermissions[]): void {
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

/**
 * Nobody may lock themselves out.
 *
 * An administrator suspending their own account is almost always a misclick,
 * and the cost is high: they cannot undo it, because undoing it requires the
 * access they just removed.
 */
export function assertNotSelf(
  actor: StaffContext,
  targetStaffUserId: string,
  action: string,
): void {
  if (actor.staffUserId !== targetStaffUserId) return;

  throw new BadRequestException({
    reason: 'cannot_act_on_self',
    message: `You cannot ${action} your own account. Ask another administrator.`,
  });
}

/**
 * Only a Super Admin may act on a Super Admin.
 *
 * Without this, staff.manage reaches upward: a Finance Manager could suspend
 * the people who granted them their role, or strip their roles, so long as
 * one other Super Admin survived the last-one rule. Authority has to flow
 * downward or it is not authority.
 */
export function assertMayManageSuperAdmin(
  actor: StaffContext,
  targetIsSuperAdmin: boolean,
  action: string,
): void {
  if (!targetIsSuperAdmin) return;
  if (actor.isSuperAdmin) return;

  throw new ForbiddenException({
    reason: 'target_is_super_admin',
    message: `Only a Super Admin can ${action} another Super Admin.`,
  });
}

/**
 * You may not remove your own ability to manage staff.
 *
 * Changing your own roles is allowed — people reorganise — but dropping the
 * one that lets you reach this screen is a door that locks behind you: undoing
 * it needs the permission you just gave away. Somebody else has to do it.
 */
export function assertKeepsOwnAccess(options: {
  actor: StaffContext;
  targetStaffUserId: string;
  /** What they would hold afterwards. */
  resultingRoleKeys: string[];
  resultingPermissions: string[];
}): void {
  if (options.actor.staffUserId !== options.targetStaffUserId) return;

  const keepsAccess =
    options.resultingRoleKeys.includes(SUPER_ADMIN_ROLE_KEY) ||
    options.resultingPermissions.includes('staff.manage');

  if (keepsAccess) return;

  throw new BadRequestException({
    reason: 'would_lock_yourself_out',
    message:
      'That would remove your own access to staff management, and you could not undo it. Ask another administrator to make this change.',
  });
}
/**
 * The organisation must keep at least one Super Admin who can actually sign in.
 *
 * Losing the last one means nobody can manage staff, roles or settings ever
 * again — recoverable only by running a command against the database.
 */
export function assertNotLastSuperAdmin(options: {
  targetIsSuperAdmin: boolean;
  /** How many ACTIVE Super Admins exist, including the target. */
  activeSuperAdmins: number;
  action: string;
}): void {
  if (!options.targetIsSuperAdmin) return;
  if (options.activeSuperAdmins > 1) return;

  throw new BadRequestException({
    reason: 'last_super_admin',
    message: `This is the only active Super Admin. Give someone else the role before you ${options.action}.`,
  });
}

/** Which status changes make sense, and which are simply wrong. */
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  INVITED: ['DISABLED'],
  ACTIVE: ['SUSPENDED', 'DISABLED'],
  SUSPENDED: ['ACTIVE', 'DISABLED'],
  DISABLED: ['ACTIVE'],
};

/**
 * Checks a status change is one we recognise.
 *
 * An invited person cannot be "reactivated": they have never been active, and
 * marking them so would let them in without ever setting a password. They can
 * only be disabled, which cancels the invitation.
 */
export function assertStatusTransition(from: string, to: string): void {
  if (from === to) {
    throw new BadRequestException({
      reason: 'no_change',
      message: 'That is already their status.',
    });
  }

  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException({
      reason: 'invalid_transition',
      message: `A staff member cannot go from ${from.toLowerCase()} to ${to.toLowerCase()}.`,
    });
  }
}
