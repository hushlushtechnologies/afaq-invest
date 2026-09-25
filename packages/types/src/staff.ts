import type { Locale } from './locale';
import type { PermissionKey } from './rbac';
import type { StaffStatus } from './rbac';

/**
 * The signed-in staff member, as the API reports them.
 *
 * Shared so the API and the Admin Portal cannot drift apart: the API returns
 * exactly this from /auth/me, and the interface reads exactly this.
 */
export interface StaffContextDto {
  /** Our own staff id — not the Supabase one. */
  staffUserId: string;
  authUserId: string;
  email: string;
  fullName: string;
  status: StaffStatus;
  roleKeys: readonly string[];
  permissionKeys: readonly PermissionKey[];
  isSuperAdmin: boolean;
}

/**
 * Why a request was refused. Returned as `reason` alongside a 401 or 403, so
 * the interface can say something useful instead of "forbidden".
 */
export type AuthRefusalReason =
  | 'missing_token'
  | 'invalid_token'
  | 'not_staff'
  | 'invited'
  | 'suspended'
  | 'disabled'
  | 'missing_permission';

// ===========================================================================
// STAFF DIRECTORY
// ===========================================================================

/** A role as the staff list shows it. */
export interface StaffRoleSummary {
  key: string;
  name: string;
}

/**
 * One row of the staff list.
 *
 * Deliberately not the whole record: the list shows what staff need to scan
 * and act on, and nothing that only matters on a detail screen.
 */
export interface StaffListItem {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  status: StaffStatus;
  preferredLocale: Locale;
  roles: StaffRoleSummary[];
  /** ISO timestamps, or null where it has not happened yet. */
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  invitationExpiresAt: string | null;
  createdAt: string;
}

export const STAFF_SORT_FIELDS = [
  'fullName',
  'email',
  'status',
  'lastLoginAt',
  'createdAt',
] as const;

export type StaffSortField = (typeof STAFF_SORT_FIELDS)[number];

export type SortDirection = 'asc' | 'desc';

/** What the staff list can be narrowed and ordered by. */
export interface StaffListQuery {
  page?: number;
  pageSize?: number;
  /** Matches name or email, case-insensitively. */
  search?: string;
  status?: StaffStatus;
  /** A role key, e.g. FINANCE_MANAGER. */
  role?: string;
  sortBy?: StaffSortField;
  sortDirection?: SortDirection;
}

/** What inviting a staff member needs. */
export interface InviteStaffInput {
  email: string;
  fullName: string;
  jobTitle?: string;
  /** Role keys, e.g. ["FINANCE_OFFICER"]. At least one. */
  roleKeys: string[];
  /** Which language to write to them in. */
  preferredLocale?: string;
}
