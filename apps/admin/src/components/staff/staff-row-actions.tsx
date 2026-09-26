'use client';

import { ApiRequestError } from '@afaq/api-client';
import {
  AtSign,
  Ban,
  KeyRound,
  MailPlus,
  PencilLine,
  RotateCcw,
  ShieldCheck,
  UserX,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import type { StaffListItem } from '@afaq/types';
import { ConfirmationDialog, RowActions, type RowAction } from '@afaq/ui';

import { usePermissions } from '@/lib/auth/use-permissions';
import { useResendInvitation, useUpdateStaffStatus } from '@/lib/staff/use-staff-mutations';

type PendingChange = 'SUSPENDED' | 'DISABLED' | 'ACTIVE' | null;

/**
 * What can be done to one staff member.
 *
 * Only offers what makes sense for their current state:
 * - An invited person cannot be suspended.
 * - Somebody already disabled cannot be disabled again.
 * - Actions on yourself are left out entirely because the API refuses them.
 * - Only a Super Admin may act on a Super Admin.
 */
export function StaffRowActions({
  staff,
  onEdit,
  onEditRoles,
  onResetPassword,
  onChangeEmail,
}: {
  staff: StaffListItem;
  onEdit: (staff: StaffListItem) => void;
  onEditRoles: (staff: StaffListItem) => void;
  onResetPassword: (staff: StaffListItem) => void;
  onChangeEmail: (staff: StaffListItem) => void;
}): ReactNode {
  const t = useTranslations('staff.actions');
  const tActions = useTranslations('actions');

  const { can, isSuperAdmin, staff: me } = usePermissions();

  const updateStatus = useUpdateStaffStatus();
  const resend = useResendInvitation();
  const [resent, setResent] = useState<'done' | 'failed' | null>(null);

  const [pending, setPending] = useState<PendingChange>(null);

  const [failure, setFailure] = useState<string | null>(null);

  const isSelf = me?.staffUserId === staff.id;

  /**
   * A Super Admin can only be managed by another Super Admin.
   *
   * The API enforces this rule as well. Hiding the action here prevents
   * users from seeing an action that would only result in an API error.
   */
  const targetIsSuperAdmin = staff.roles.some((role) => role.key === 'SUPER_ADMIN');

  const mayManage = can('staff.manage') && (!targetIsSuperAdmin || isSuperAdmin);

  const actions: RowAction[] = [
    // Edit
    ...(can('staff.edit') && (!targetIsSuperAdmin || isSuperAdmin)
      ? [
          {
            label: t('edit'),
            icon: <PencilLine />,
            onSelect: () => onEdit(staff),
          },
        ]
      : []),

    // Change roles
    ...(mayManage
      ? [
          {
            label: t('changeRoles'),
            icon: <ShieldCheck />,
            onSelect: () => onEditRoles(staff),
          },
        ]
      : []),

    // Sign-in details: only a Super Admin, and only for somebody who has
    // actually got an account yet.
    ...(isSuperAdmin && staff.status !== 'INVITED'
      ? [
          {
            label: t('changeEmail'),
            icon: <AtSign />,
            separated: true,
            onSelect: () => onChangeEmail(staff),
          },
          {
            label: t('resetPassword'),
            icon: <KeyRound />,
            onSelect: () => onResetPassword(staff),
          },
        ]
      : []),

    // Invitations get lost in spam filters and run out after a week, so the
    // way to rescue one sits beside the person it belongs to.
    ...(can('staff.create') && staff.status === 'INVITED'
      ? [
          {
            label: t('resendInvitation'),
            icon: <MailPlus />,
            onSelect: () => {
              setResent(null);
              resend.mutate(staff.id, {
                onSuccess: () => setResent('done'),
                onError: () => setResent('failed'),
              });
            },
          },
        ]
      : []),

    // Suspend
    // Never allow status actions on yourself.
    ...(mayManage && !isSelf && staff.status === 'ACTIVE'
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

    // Reactivate
    ...(mayManage && !isSelf && (staff.status === 'SUSPENDED' || staff.status === 'DISABLED')
      ? [
          {
            label: t('reactivate'),
            icon: <RotateCcw />,
            onSelect: () => setPending('ACTIVE'),
          },
        ]
      : []),

    // Disable / Cancel invitation
    ...(mayManage && !isSelf && staff.status !== 'DISABLED'
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

  if (actions.length === 0) {
    return null;
  }

  async function confirm(): Promise<void> {
    if (!pending) {
      return;
    }

    setFailure(null);

    try {
      await updateStatus.mutateAsync({
        id: staff.id,
        status: pending,
      });

      // The dialog closes itself once this resolves.
    } catch (error) {
      /**
       * The API's reason is the useful part.
       *
       * For example:
       * "This is the only active Super Admin"
       *
       * Rethrowing keeps the dialog open so the user can read the error.
       */
      setFailure(error instanceof ApiRequestError ? error.message : t('failed'));

      throw error;
    }
  }

  const dialogKey =
    pending === 'ACTIVE' ? 'reactivate' : pending === 'SUSPENDED' ? 'suspend' : 'disable';

  return (
    <>
      <RowActions
        actions={actions}
        label={t('menuLabel', {
          name: staff.fullName,
        })}
      />
      {/* Announced rather than shown as a dialog: resending is a small,
          reversible thing, and a dialog for it would be in the way. */}
      {resent ? (
        <span role="status" className="sr-only">
          {resent === 'done' ? t('resendSent') : t('resendFailed')}
        </span>
      ) : null}

      <ConfirmationDialog
        open={pending !== null}
        onClose={() => {
          setPending(null);
          setFailure(null);
        }}
        onConfirm={confirm}
        tone={pending === 'ACTIVE' ? 'info' : 'danger'}
        title={t(`confirm.${dialogKey}Title`, {
          name: staff.fullName,
        })}
        message={
          failure ??
          t(`confirm.${dialogKey}Body`, {
            name: staff.fullName,
          })
        }
        confirmLabel={t(`confirm.${dialogKey}Confirm`)}
        cancelLabel={tActions('cancel')}
      />
    </>
  );
}
