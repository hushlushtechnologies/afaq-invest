'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Ban, PencilLine, RotateCcw, ShieldCheck, UserX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { StaffListItem } from '@afaq/types';
import { ConfirmationDialog, RowActions, type RowAction } from '@afaq/ui';
import { usePermissions } from '@/lib/auth/use-permissions';
import { useUpdateStaffStatus } from '@/lib/staff/use-staff-mutations';

type PendingChange = 'SUSPENDED' | 'DISABLED' | 'ACTIVE' | null;

/**
 * What can be done to one staff member.
 *
 * Only offers what makes sense for their current state: an invited person
 * cannot be suspended, and somebody already disabled cannot be disabled
 * again. Actions on yourself are left out entirely — the API refuses them,
 * and offering them would be an invitation to a mistake.
 */
export function StaffRowActions({
  staff,
  onEdit,
  onEditRoles,
}: {
  staff: StaffListItem;
  onEdit: (staff: StaffListItem) => void;
  onEditRoles: (staff: StaffListItem) => void;
}): ReactNode {
  const t = useTranslations('staff.actions');
  const tActions = useTranslations('actions');
  const { can, staff: me } = usePermissions();
  const updateStatus = useUpdateStaffStatus();

  const [pending, setPending] = useState<PendingChange>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const isSelf = me?.staffUserId === staff.id;

  const actions: RowAction[] = [
    ...(can('staff.edit')
      ? [{ label: t('edit'), icon: <PencilLine />, onSelect: () => onEdit(staff) }]
      : []),
    ...(can('staff.manage')
      ? [
          {
            label: t('changeRoles'),
            icon: <ShieldCheck />,
            onSelect: () => onEditRoles(staff),
          },
        ]
      : []),
    // Status changes: only those that are actually possible, and never on
    // yourself.
    ...(can('staff.manage') && !isSelf && staff.status === 'ACTIVE'
      ? [
          {
            label: t('suspend'),
            icon: <Ban />,
            tone: 'danger' as const,
            separated: true,
            onSelect: () => setPending('SUSPENDED'),
          },
        ]
      : []),
    ...(can('staff.manage') &&
    !isSelf &&
    (staff.status === 'SUSPENDED' || staff.status === 'DISABLED')
      ? [
          {
            label: t('reactivate'),
            icon: <RotateCcw />,
            onSelect: () => setPending('ACTIVE'),
          },
        ]
      : []),
    ...(can('staff.manage') && !isSelf && staff.status !== 'DISABLED'
      ? [
          {
            label: staff.status === 'INVITED' ? t('cancelInvitation') : t('disable'),
            icon: <UserX />,
            tone: 'danger' as const,
            onSelect: () => setPending('DISABLED'),
          },
        ]
      : []),
  ];

  if (actions.length === 0) return null;

  async function confirm(): Promise<void> {
    if (!pending) return;
    setFailure(null);

    try {
      await updateStatus.mutateAsync({ id: staff.id, status: pending });
      // The dialog closes itself once this resolves.
    } catch (error) {
      // The API's reason is the useful part: "This is the only active Super
      // Admin" tells somebody what to do next. Rethrowing keeps the dialog
      // open so they can read it.
      setFailure(error instanceof ApiRequestError ? error.message : t('failed'));
      throw error;
    }
  }

  const dialogKey =
    pending === 'ACTIVE' ? 'reactivate' : pending === 'SUSPENDED' ? 'suspend' : 'disable';

  return (
    <>
      <RowActions actions={actions} label={t('menuLabel', { name: staff.fullName })} />

      <ConfirmationDialog
        open={pending !== null}
        onClose={() => {
          setPending(null);
          setFailure(null);
        }}
        onConfirm={confirm}
        tone={pending === 'ACTIVE' ? 'info' : 'danger'}
        title={t(`confirm.${dialogKey}Title`, { name: staff.fullName })}
        message={failure ?? t(`confirm.${dialogKey}Body`, { name: staff.fullName })}
        confirmLabel={t(`confirm.${dialogKey}Confirm`)}
        cancelLabel={tActions('cancel')}
      />
    </>
  );
}
