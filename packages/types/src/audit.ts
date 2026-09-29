/**
 * Reading the record of what happened.
 *
 * Two separate trails, deliberately. The audit log answers "who changed
 * what?" — deliberate acts by staff on the system. Sign-in activity answers
 * "who tried to get in?" — including attempts that failed and people who do
 * not exist. Mixing them would bury a handful of meaningful changes under
 * thousands of routine sign-ins.
 */

export const AUDIT_CATEGORIES = [
  'AUTH',
  'STAFF',
  'ROLE',
  'PERMISSION',
  'SECURITY',
  'SETTINGS',
  'COMPANY',
  'INVESTMENT_RULE',
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUTH_EVENT_TYPES = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGIN_BLOCKED',
  'LOGOUT',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'INVITATION_SENT',
  'INVITATION_ACCEPTED',
  'SESSION_REVOKED',
] as const;

export type AuthEventType = (typeof AUTH_EVENT_TYPES)[number];

/** One entry in the audit trail. */
export interface AuditLogListItem {
  id: string;
  occurredAt: string;
  /** Null once that staff member is removed; the email below still names them. */
  actorStaffUserId: string | null;
  /** Copied when the entry was written, so it survives the account. */
  actorEmail: string;
  category: AuditCategory;
  /** Dotted event name, e.g. "staff.role_assigned". */
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  /** Present only on entries where the change is worth reconstructing. */
  before: unknown;
  after: unknown;
  metadata: unknown;
  ipAddress: string | null;
}

/** One sign-in attempt, successful or not. */
export interface AuthActivityListItem {
  id: string;
  occurredAt: string;
  staffUserId: string | null;
  /** The address used — a failed attempt may match no account at all. */
  email: string;
  event: AuthEventType;
  succeeded: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  deviceLabel: string | null;
}

export const AUDIT_SORT_DIRECTIONS = ['asc', 'desc'] as const;

/** What the audit list can be narrowed by. */
export interface AuditListQuery {
  page?: number;
  pageSize?: number;
  category?: AuditCategory;
  action?: string;
  actorStaffUserId?: string;
  /** Everything about one thing — a person, a role — however it was changed. */
  targetType?: string;
  targetId?: string;
  /** ISO dates. Inclusive of the whole "to" day. */
  from?: string;
  to?: string;
  /** Matches the actor's email or the target's label. */
  search?: string;
  sortDirection?: (typeof AUDIT_SORT_DIRECTIONS)[number];
}

/** What the sign-in activity list can be narrowed by. */
export interface AuthActivityListQuery {
  page?: number;
  pageSize?: number;
  event?: AuthEventType;
  staffUserId?: string;
  email?: string;
  /** Failures only — the question people actually ask of this list. */
  failuresOnly?: boolean;
  from?: string;
  to?: string;
}
