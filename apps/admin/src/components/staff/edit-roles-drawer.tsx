'use client';

import { ApiRequestError } from '@afaq/api-client';
import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { SYSTEM_ROLES, type StaffListItem } from '@afaq/types';
import { Button, Checkbox, Drawer, FormDescription, InfoCard } from '@afaq/ui';
import { usePermissions } from '@/lib/auth/use-permissions';
import { useUpdateStaffRoles } from '@/lib/staff/use-staff-mutations';

/**
 * Changing what someone is allowed to do.
 *
 * The roles sent are the roles they end up with, so removing one is as
 * deliberate as adding one. Only roles the current administrator could grant
 * themselves are offered; the API applies the same rule.
 */
export function EditRolesDrawer({
  staff,
  onClose,
}: {
  staff: StaffListItem | null;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('staff.roles');
  const { canAll, isSuperAdmin, staff: me } = usePermissions();
  const update = useUpdateStaffRoles();

  const [selected, setSelected] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  // Opening the drawer for a different person resets the ticks and any error
  // from last time. Done during render rather than in an effect: React applies
  // it before anything is painted, so the previous person's roles never flash
  // up under the new person's name.
  if (staff && staff.id !== openedFor) {
    setOpenedFor(staff.id);
    setSelected(staff.roles.map((role) => role.key));
    setFailure(null);
  }

  const grantable = SYSTEM_ROLES.filter(
    (role) => isSuperAdmin || (role.key !== 'SUPER_ADMIN' && canAll([...role.permissions])),
  );

  // A role they already hold but we could not grant is shown, ticked and
  // locked: hiding it would make "save" quietly strip it.
  const lockedRoles = (staff?.roles ?? []).filter(
    (role) => !grantable.some((option) => option.key === role.key),
  );

  const isSelf = me?.staffUserId === staff?.id;

  async function save(): Promise<void> {
    if (!staff) return;
    setFailure(null);

    try {
      await update.mutateAsync({
        id: staff.id,
        roleKeys: [...new Set([...selected, ...lockedRoles.map((role) => role.key)])],
      });
      onClose();
    } catch (error) {
      // Stay open with their ticks intact so they can adjust and retry. The
      // API's message says which role it objected to.
      setFailure(error instanceof ApiRequestError ? error.message : t('failed'));
    }
  }

  return (
    <Drawer
      open={staff !== null}
      onClose={onClose}
      side="end"
      size="md"
      title={t('title')}
      description={staff?.fullName}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            iconStart={<ShieldCheck />}
            loading={update.isPending}
            disabled={selected.length === 0 && lockedRoles.length === 0}
            onClick={save}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {failure ? (
          <InfoCard tone="danger" announce>
            {failure}
          </InfoCard>
        ) : null}

        {isSelf ? <InfoCard tone="warning">{t('editingSelf')}</InfoCard> : null}

        <FormDescription>{t('help')}</FormDescription>

        <div className="space-y-2">
          {lockedRoles.map((role) => (
            <Checkbox
              key={role.key}
              label={role.name}
              description={t('lockedRole')}
              checked
              disabled
              onChange={() => undefined}
            />
          ))}

          {grantable.map((role) => (
            <Checkbox
              key={role.key}
              label={role.name}
              description={role.description}
              checked={selected.includes(role.key)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, role.key]
                    : current.filter((key) => key !== role.key),
                )
              }
            />
          ))}
        </div>
      </div>
    </Drawer>
  );
}
