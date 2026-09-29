'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Ban, PauseCircle, Play, Star, StarOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { CompanyListItem, CompanyStatus } from '@afaq/types';
import { ConfirmationDialog, RowActions, Textarea, type RowAction } from '@afaq/ui';
import { usePermissions } from '@/lib/auth/use-permissions';
import {
  useChangeCompanyStatus,
  useSetCompanyFeatured,
} from '@/lib/companies/use-company-mutations';

/** Which confirmation is open, if any. */
type Pending = { kind: 'status'; status: CompanyStatus } | { kind: 'featured' } | null;

/**
 * What can be done to one company from the list.
 *
 * Only what makes sense for its current state is offered: an active company
 * cannot be activated, a suspended one cannot be suspended again. Featuring is
 * immediate; anything that changes whether the company trades asks first,
 * because it decides whether investors can see it at all.
 *
 * Editing and verification are not here — they belong to the detail page and to
 * Compliance respectively, and neither screen exists yet.
 */
export function CompanyRowActions({ company }: { company: CompanyListItem }): ReactNode {
  const t = useTranslations('companies.actions');
  const tActions = useTranslations('actions');

  const { can } = usePermissions();
  const changeStatus = useChangeCompanyStatus();
  const setFeatured = useSetCompanyFeatured();

  const [pending, setPending] = useState<Pending>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const mayManage = can('company.manage');

  const actions: readonly RowAction[] = [
    ...(mayManage
      ? [
          {
            label: company.isFeatured ? t('unfeature') : t('feature'),
            icon: company.isFeatured ? <StarOff /> : <Star />,
            onSelect: () => setPending({ kind: 'featured' }),
          },
        ]
      : []),
    ...(mayManage && company.status !== 'ACTIVE'
      ? [
          {
            label: t('activate'),
            icon: <Play />,
            onSelect: () => setPending({ kind: 'status', status: 'ACTIVE' as const }),
          },
        ]
      : []),
    ...(mayManage && company.status !== 'INACTIVE'
      ? [
          {
            label: t('deactivate'),
            icon: <PauseCircle />,
            tone: 'default' as const,
            separated: true,
            onSelect: () => setPending({ kind: 'status', status: 'INACTIVE' as const }),
          },
        ]
      : []),
    ...(mayManage && company.status !== 'SUSPENDED'
      ? [
          {
            label: t('suspend'),
            icon: <Ban />,
            tone: 'danger' as const,
            onSelect: () => setPending({ kind: 'status', status: 'SUSPENDED' as const }),
          },
        ]
      : []),
  ];

  if (actions.length === 0) return null;

  async function confirm(): Promise<void> {
    if (!pending) return;

    setFailure(null);

    try {
      if (pending.kind === 'featured') {
        await setFeatured.mutateAsync({ id: company.id, isFeatured: !company.isFeatured });
      } else {
        await changeStatus.mutateAsync({
          id: company.id,
          status: pending.status,
          // Optional, and only asked for when a company stops trading. It
          // lands in the audit entry's metadata, which is the only place
          // anybody will ever look to find out why.
          reason: reason.trim() || undefined,
        });
      }
      // The dialog closes itself once this resolves.
    } catch (error) {
      // The API's own message is the useful part — "it is already inactive",
      // for instance. Rethrowing keeps the dialog open so it can be read.
      setFailure(error instanceof ApiRequestError ? error.message : t('failed'));
      throw error;
    }
  }

  const dialogKey =
    pending === null
      ? 'feature'
      : pending.kind === 'featured'
        ? company.isFeatured
          ? 'unfeature'
          : 'feature'
        : pending.status === 'ACTIVE'
          ? 'activate'
          : pending.status === 'INACTIVE'
            ? 'deactivate'
            : 'suspend';

  // Asked for only when a company stops trading. Reactivating needs no excuse,
  // and featuring is not the kind of decision anybody comes back asking about.
  const wantsReason = dialogKey === 'deactivate' || dialogKey === 'suspend';

  return (
    <>
      <RowActions actions={actions} label={t('menuLabel', { name: company.name })} />

      <ConfirmationDialog
        open={pending !== null}
        onClose={() => {
          setPending(null);
          setFailure(null);
          setReason('');
        }}
        onConfirm={confirm}
        tone={dialogKey === 'suspend' ? 'danger' : dialogKey === 'deactivate' ? 'warning' : 'info'}
        title={t(`confirm.${dialogKey}Title`, { name: company.name })}
        message={
          <span className="flex flex-col gap-3">
            <span>{failure ?? t(`confirm.${dialogKey}Body`, { name: company.name })}</span>

            {wantsReason ? (
              <label className="flex flex-col gap-1.5 text-start">
                <span className="text-label text-fg-secondary">{t('reason.label')}</span>
                <Textarea
                  rows={2}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={t('reason.placeholder')}
                />
                <span className="text-caption text-fg-muted">{t('reason.help')}</span>
              </label>
            ) : null}
          </span>
        }
        confirmLabel={t(`confirm.${dialogKey}Confirm`)}
        cancelLabel={tActions('cancel')}
      />
    </>
  );
}
