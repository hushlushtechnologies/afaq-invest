import type { PermissionAction, PermissionKey, PermissionResource } from './rbac';

/**
 * Roles and permissions as the API reports them.
 *
 * These describe what is actually stored, which is not the same as the
 * catalogue in rbac.ts: a system role's stored rows can drift from its
 * definition if a seed has not been re-run, and custom roles have no
 * definition at all. The Admin Portal shows what is stored.
 */

/** One row of the roles list. */
export interface RoleListItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  /** System roles are seeded and cannot be renamed or deleted. */
  isSystem: boolean;
  /**
   * Super Admin carries every permission through a central override rather
   * than stored rows, so its count would otherwise read as zero.
   */
  isSuperAdmin: boolean;
  permissionCount: number;
  permissionKeys: PermissionKey[];
  /** How many staff currently hold this role, in any status. */
  staffCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A role with the permissions it actually carries. */
/** A role, for the detail view. Same shape today; kept for clarity at call sites. */
export type RoleDetail = RoleListItem;

/** One permission in the catalogue. */
export interface PermissionListItem {
  key: PermissionKey;
  resource: PermissionResource;
  action: PermissionAction;
  description: string;
}

/**
 * The catalogue grouped by what it acts on.
 *
 * Fifty-three flat checkboxes are unreadable; grouped by resource they match
 * how somebody thinks about the question ("what can they do with staff?").
 */
export interface PermissionGroup {
  resource: PermissionResource;
  permissions: PermissionListItem[];
}
