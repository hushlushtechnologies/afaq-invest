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
  'OPPORTUNITY',
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

/**
 * Every event name the API is allowed to write.
 *
 * This list exists because the action is the one field in an audit entry that
 * is written as a bare string by whichever service happens to be making the
 * change. Nothing stopped a new feature from inventing a name, and nothing
 * told anybody the viewer had no words for it — so the entry quietly rendered
 * as `investment_rule.ladder_replaced` to whoever came looking.
 *
 * Listing them here turns that into two checkable facts: the API may only
 * write a name on this list, and every name on this list must have a label in
 * both languages. Both are asserted in `apps/api/src/audit/audit-actions.spec.ts`,
 * which reads the source and the message files rather than trusting either.
 *
 * Names are `area.event`, past tense, snake_case. The area matches the module
 * that writes it, not the audit category: `staff.suspended` is written by the
 * staff module and filed under STAFF, while `investment_rule.publish_refused`
 * is written by the investment-rules module and filed under SECURITY.
 */
export const AUDIT_ACTIONS = [
  // --- companies -----------------------------------------------------------
  'company.created',
  'company.updated',
  'company.activated',
  'company.deactivated',
  'company.suspended',
  'company.verification_changed',
  'company.featured',
  'company.unfeatured',
  'company.reordered',

  // --- investment opportunities --------------------------------------------
  'opportunity.created',
  'opportunity.updated',
  'opportunity.draft_deleted',
  'opportunity.opened',
  'opportunity.suspended',
  'opportunity.resumed',
  'opportunity.closed',
  'opportunity.cancelled',

  // --- investment rules ----------------------------------------------------
  'investment_rule.settings_changed',
  'investment_rule.step_up_disabled',
  'investment_rule.step_up_disable_refused',
  'investment_rule.draft_created',
  'investment_rule.draft_updated',
  'investment_rule.ladder_replaced',
  'investment_rule.published',
  'investment_rule.publish_refused',
  'investment_rule.archived',
  'investment_rule.draft_deleted',

  // --- roles ---------------------------------------------------------------
  'role.created',
  'role.updated',
  'role.deleted',

  // --- staff ---------------------------------------------------------------
  'staff.invited',
  'staff.invitation_accepted',
  'staff.invitation_resent',
  'staff.details_changed',
  'staff.roles_changed',
  'staff.email_changed',
  'staff.password_reset_by_admin',
  'staff.roles_transferred',
  'staff.suspended',
  'staff.disabled',
  'staff.active',
  'staff.super_admin_bootstrapped',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Whether a recorded action is one this build of the viewer has words for. */
export function isKnownAuditAction(action: string): action is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(action);
}

/**
 * The part before the dot.
 *
 * Older entries survive a rename, so this reads the stored string rather than
 * assuming it is still on the list above.
 */
export function auditActionArea(action: string): string {
  const dot = action.indexOf('.');
  return dot === -1 ? action : action.slice(0, dot);
}

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

/* -------------------------------------------------------------------------- */
/* The shape of a recorded ladder                                             */
/* -------------------------------------------------------------------------- */

/**
 * One tier option as the audit trail stores it.
 *
 * Shorter field names than the live model, and no identifiers: this is the
 * record somebody reads years later to establish what an investor was sold,
 * by which time the rows it was copied from may not exist to join to. The API
 * writes it in `summarise()`; the admin viewer reads it with `readAuditLadder`
 * below. Both sides share this one declaration so the shape cannot drift.
 */
export interface AuditLadderOption {
  /** LOCKED or UNLOCKED, as recorded. A string, because an old entry may
   *  carry a mode this build no longer knows. */
  mode: string;
  /** The rate as a percentage. Its period is the entry's `roiBasis`. */
  roi: number;
  payout: string;
  /** [minimum, maximum] months. Either end may be open. */
  term: [number | null, number | null];
  notice: number;
}

/** One tier as the audit trail stores it. */
export interface AuditLadderTier {
  name: string;
  min: number;
  /** Null on the top tier: "and upwards". */
  max: number | null;
}

/** A tier with the options recorded against it. */
export interface AuditLadderTierWithOptions extends AuditLadderTier {
  options: AuditLadderOption[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readOption(value: unknown): AuditLadderOption | null {
  if (!isRecord(value)) return null;

  const roi = numberOrNull(value.roi);
  const notice = numberOrNull(value.notice);

  if (typeof value.mode !== 'string' || roi === null) return null;

  const term = Array.isArray(value.term) ? value.term : [];

  return {
    mode: value.mode,
    roi,
    payout: typeof value.payout === 'string' ? value.payout : '',
    term: [numberOrNull(term[0]), numberOrNull(term[1])],
    notice: notice ?? 0,
  };
}

/**
 * Reads a ladder out of an audit payload, or gives up.
 *
 * Defensive on purpose. The payload is JSON that may have been written by an
 * older build of the API, by a build that recorded a field this one does not
 * know, or by nothing at all — most entries carry no ladder. Returning null
 * rather than throwing lets the viewer fall back to showing the payload
 * plainly, which is worse to read but never wrong.
 */
export function readAuditLadder(payload: unknown): AuditLadderTierWithOptions[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.tiers)) return null;

  const tiers: AuditLadderTierWithOptions[] = [];

  for (const raw of payload.tiers) {
    if (!isRecord(raw)) return null;

    const min = numberOrNull(raw.min);
    if (typeof raw.name !== 'string' || min === null) return null;

    const options: AuditLadderOption[] = [];

    for (const rawOption of Array.isArray(raw.options) ? raw.options : []) {
      const option = readOption(rawOption);
      if (option === null) return null;
      options.push(option);
    }

    tiers.push({ name: raw.name, min, max: numberOrNull(raw.max), options });
  }

  return tiers.length > 0 ? tiers : null;
}

/**
 * The period the recorded rates are quoted over, if the entry says.
 *
 * Entries written before the ladder payload carried its basis do not say, and
 * the viewer has to admit that rather than assume monthly — a rate shown with
 * the wrong period is out by a factor of twelve.
 */
export function readAuditRoiBasis(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  return typeof payload.roiBasis === 'string' ? payload.roiBasis : null;
}
