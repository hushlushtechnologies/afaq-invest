'use client';

import { useTranslations } from 'next-intl';

/**
 * Turns a stored action key into something a person can read.
 *
 * Unknown keys fall back to the key itself rather than an empty cell: an
 * entry written by a newer version of the API should still be readable here,
 * and "staff.something_new" tells a reader more than a blank space.
 */
export function useActionLabel(): (action: string) => string {
  const t = useTranslations('audit.actions');

  return (action: string) => {
    // Keys are nested by resource ("staff" → "roles_changed"), which is how
    // next-intl reads a dotted path anyway. has() rather than try/catch: a
    // missing key is logged as an error by next-intl before it throws, and an
    // unfamiliar action is not an error — it is just newer than these labels.
    return t.has(action as never) ? t(action as never) : action;
  };
}
