'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { PermissionGroup, PermissionKey } from '@afaq/types';
import { Button, Checkbox } from '@afaq/ui';
import { usePermissions } from '@/lib/auth/use-permissions';

/**
 * Choosing what a role grants.
 *
 * Grouped by resource with a per-group toggle, because ticking twenty boxes
 * one at a time to build "can do everything with investors" is a chore that
 * invites mistakes.
 *
 * Permissions the current administrator does not hold are shown but locked:
 * the API refuses to put them in a role (that is how role.create would
 * otherwise become a route to Super Admin), and hiding them would make the
 * refusal look arbitrary.
 */
export function PermissionSelector({
  groups,
  selected,
  onChange,
}: {
  groups: PermissionGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
}): ReactNode {
  const t = useTranslations('roles');
  const { can, isSuperAdmin } = usePermissions();

  const held = new Set(selected);
  const mayGrant = (permission: PermissionKey): boolean => isSuperAdmin || can(permission);

  function toggle(key: string, checked: boolean): void {
    onChange(checked ? [...selected, key] : selected.filter((entry) => entry !== key));
  }

  function toggleGroup(group: PermissionGroup, checked: boolean): void {
    const keys = group.permissions.filter((p) => mayGrant(p.key)).map((p) => p.key);

    onChange(
      checked
        ? [...new Set([...selected, ...keys])]
        : selected.filter((entry) => !keys.includes(entry as PermissionKey)),
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const grantable = group.permissions.filter((p) => mayGrant(p.key));
        const allChosen = grantable.length > 0 && grantable.every((p) => held.has(p.key));

        return (
          <section key={group.resource} className="space-y-2">
            <header className="flex items-center justify-between gap-3">
              <h3 className="text-label font-medium text-fg">{t(`resources.${group.resource}`)}</h3>

              {grantable.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(group, !allChosen)}
                  aria-label={
                    allChosen
                      ? t('clearGroupLabel', { group: t(`resources.${group.resource}`) })
                      : t('selectGroupLabel', { group: t(`resources.${group.resource}`) })
                  }
                >
                  {allChosen ? t('clearGroup') : t('selectGroup')}
                </Button>
              ) : null}
            </header>

            <div className="space-y-1.5 rounded-lg border border-border-subtle p-3">
              {group.permissions.map((permission) => {
                const locked = !mayGrant(permission.key);

                return (
                  <Checkbox
                    key={permission.key}
                    label={permission.description}
                    description={locked ? t('permissionLocked') : permission.key}
                    checked={held.has(permission.key)}
                    disabled={locked}
                    onChange={(event) => toggle(permission.key, event.target.checked)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
