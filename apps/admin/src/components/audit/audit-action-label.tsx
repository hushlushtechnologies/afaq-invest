'use client';

import { useTranslations } from 'next-intl';
import { auditActionArea, isKnownAuditAction } from '@afaq/types';

/**
 * What an event is called, in words.
 *
 * The action arrives as a dotted string — `investment_rule.ladder_replaced` —
 * because the API writes it as one. Looking it up is the only thing standing
 * between the viewer and showing that string to whoever came to read the
 * trail, which is what it did for seventeen of them until this phase.
 *
 * Two deliberate choices here:
 *
 * `t.has` before `t`, rather than a lookup that throws, because an entry
 * written by a newer API than this build of the admin portal is a normal
 * thing to meet after a deployment and not an error.
 *
 * And the dotted key as the fallback, not a friendly invention: a reader who
 * sees `role.cloned` can search for it and find out what it was, where
 * "Something changed" leads nowhere. The drawer says separately that it has
 * no wording for this one yet.
 */
export interface ActionLabel {
  /** The readable label, or the stored key when there is no label for it. */
  text: string;
  /** False when this build has no wording for the action. */
  known: boolean;
  /** `staff`, `company`, `investment_rule` — the module that wrote it. */
  area: string;
}

export function useActionLabel(): (action: string) => ActionLabel {
  const t = useTranslations('audit.actions');

  return (action: string) => {
    const area = auditActionArea(action);

    // The catalogue and the message files are checked against each other in
    // `apps/api/src/audit/audit-actions.spec.ts`, so in practice a catalogued
    // action always has a label. `t.has` covers the case the test cannot: an
    // entry written by a deployment newer than this bundle.
    const known = isKnownAuditAction(action) && t.has(action as never);

    return {
      text: known ? t(action as never) : action,
      known,
      area,
    };
  };
}
