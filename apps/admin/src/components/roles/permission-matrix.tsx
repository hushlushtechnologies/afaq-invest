'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { PermissionGroup, PermissionKey } from '@afaq/types';
import { Badge } from '@afaq/ui';

/**
 * What a role grants, grouped by what it acts on.
 *
 * Fifty-three permissions in one flat list is unreadable. Grouped by
 * resource, it matches how somebody actually asks the question: "what can
 * this role do with staff?"
 *
 * Permissions the role does not have are shown greyed rather than hidden, so
 * the answer to "can they approve KYC?" is visible instead of inferred from
 * an absence.
 */
export function PermissionMatrix({
  groups,
  granted,
  /** Super Admin holds everything through a central override, not stored rows. */
  grantsEverything = false,
}: {
  groups: PermissionGroup[];
  granted: readonly PermissionKey[];
  grantsEverything?: boolean;
}): ReactNode {
  const t = useTranslations('roles');
  const held = new Set(granted);

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const count = grantsEverything
          ? group.permissions.length
          : group.permissions.filter((permission) => held.has(permission.key)).length;

        return (
          <section key={group.resource} className="space-y-2">
            <header className="flex items-center justify-between gap-3">
              <h3 className="text-label font-medium text-fg">{t(`resources.${group.resource}`)}</h3>
              <Badge variant={count > 0 ? 'info' : 'neutral'} size="sm">
                {t('grantedCount', { count, total: group.permissions.length })}
              </Badge>
            </header>

            <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
              {group.permissions.map((permission) => {
                const isGranted = grantsEverything || held.has(permission.key);

                return (
                  <li
                    key={permission.key}
                    className="flex items-start gap-3 px-3 py-2.5 text-body-small"
                  >
                    <span
                      aria-hidden
                      className={
                        isGranted
                          ? 'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-success-surface text-success'
                          : 'mt-0.5 size-4 shrink-0 rounded-full border border-border'
                      }
                    >
                      {isGranted ? <Check className="size-3" /> : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className={isGranted ? 'text-fg' : 'text-fg-subtle'}>
                        {permission.description}
                      </span>
                      <code className="ms-2 text-caption text-fg-subtle">{permission.key}</code>
                    </span>

                    {/* Read by screen readers in place of the tick, which is decorative. */}
                    <span className="sr-only">
                      {isGranted ? t('permissionGranted') : t('permissionNotGranted')}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
