/**
 * The account-level refusals: the reasons somebody with a valid password
 * still cannot be here.
 *
 * These are different in kind from a missing permission. A missing permission
 * means "not this page"; these mean "not this application, right now".
 *
 * Kept in its own module because both the hook that reads permissions and the
 * component that renders the refusal need it, and a hook importing a component
 * would be the wrong way round.
 */
export const BLOCKING_REASONS = ['not_staff', 'suspended', 'disabled', 'invited'] as const;

export type BlockingReason = (typeof BLOCKING_REASONS)[number];

export function isBlockingReason(reason: string | null): reason is BlockingReason {
  return reason !== null && (BLOCKING_REASONS as readonly string[]).includes(reason);
}
