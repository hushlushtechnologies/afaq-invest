import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { hasAllPermissions, PERMISSION_KEYS, type PermissionKey } from '@afaq/types';
import type { StaffContext } from '../auth/staff-context.types.js';

/**
 * The rules for creating, changing and removing custom roles.
 *
 * Pure functions for the same reason as staff-policy: these decide who ends
 * up able to do what, so they are worth being able to read and test on their
 * own.
 */

/**
 * Nobody may create a role more powerful than themselves.
 *
 * Without this, anyone with role.create could write a role holding every
 * permission, assign it to themselves, and become a Super Admin in two
 * clicks. It is the same rule as granting roles, applied a step earlier.
 */
export function assertMayDefineRole(actor: StaffContext, permissions: PermissionKey[]): void {
  if (actor.isSuperAdmin) return;

  const beyond = permissions.filter((permission) => !hasAllPermissions(actor, [permission]));

  if (beyond.length > 0) {
    throw new ForbiddenException({
      reason: 'permission_beyond_actor',
      permission: beyond[0],
      message: `You cannot put permissions in a role that you do not hold yourself: ${beyond.join(', ')}.`,
    });
  }
}

/** Every requested permission must be one the platform recognises. */
export function assertKnownPermissions(permissions: string[]): PermissionKey[] {
  const known = new Set<string>(PERMISSION_KEYS);
  const unknown = permissions.filter((permission) => !known.has(permission));

  if (unknown.length > 0) {
    throw new BadRequestException({
      reason: 'unknown_permission',
      message: `Unknown permission: ${unknown.join(', ')}`,
    });
  }

  return [...new Set(permissions)] as PermissionKey[];
}

/**
 * Built-in roles are not editable.
 *
 * They are re-seeded on deploy, so any change made here would be silently
 * reverted later — which is worse than refusing, because the change appears
 * to work.
 */
export function assertNotSystemRole(
  role: { isSystem: boolean; name: string },
  action: string,
): void {
  if (!role.isSystem) return;

  throw new BadRequestException({
    reason: 'system_role',
    message: `"${role.name}" is a built-in role and cannot be ${action}. Create a custom role instead.`,
  });
}

/**
 * A role still held by somebody cannot be deleted.
 *
 * Deleting it would either strip their access without anyone deciding to, or
 * fail at the database (the assignment is Restrict). Saying so plainly, with
 * the number, gives them the next step.
 */
export function assertRoleUnused(staffCount: number, roleName: string): void {
  if (staffCount === 0) return;

  throw new BadRequestException({
    reason: 'role_in_use',
    message: `${staffCount} staff still hold "${roleName}". Move them to another role before deleting it.`,
  });
}

/**
 * Builds the stored key from the name, e.g. "Regional Auditor" → REGIONAL_AUDITOR.
 *
 * The key is what code and audit entries refer to, so it is generated once at
 * creation and never changes afterwards: renaming a role should not orphan
 * the history that mentions it.
 */
export function roleKeyFromName(name: string): string {
  const key = name
    // NFKC, not NFKD: decomposing splits Arabic hamza into a base letter plus
    // a combining mark, and the mark is not a letter, so "إقليمي" would come
    // out as "ا_قليمي".
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 64);

  if (key.length < 2) {
    throw new BadRequestException({
      reason: 'invalid_name',
      message: 'Give the role a name with at least two letters or numbers.',
    });
  }

  return key;
}
