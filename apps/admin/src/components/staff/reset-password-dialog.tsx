'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Check, Copy, KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { StaffListItem } from '@afaq/types';
import { Button, Drawer, InfoCard } from '@afaq/ui';
import { useResetStaffPassword } from '@/lib/staff/use-staff-mutations';

/**
 * Setting a new password for a staff member who cannot sign in.
 *
 * The new password is shown once, here, and never again — it is not stored,
 * not written to the audit trail, and not kept in the browser's cache. That
 * is deliberate: an existing password cannot be read by anybody, including a
 * Super Admin, because Supabase keeps only a one-way hash of it. What can be
 * done is replace it, which solves the lockout without ever exposing what
 * came before.
 */
export function ResetPasswordDialog({
  staff,
  onClose,
}: {
  staff: StaffListItem | null;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('staff.resetPassword');
  const reset = useResetStaffPassword();

  const [password, setPassword] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Clearing on open matters more than usual: a password left on screen from
  // the previous person would be shown under this one's name.
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  if (staff && staff.id !== openedFor) {
    setOpenedFor(staff.id);
    setPassword(null);
    setFailure(null);
    setCopied(false);
  }

  if (!staff && openedFor !== null) setOpenedFor(null);

  async function generate(): Promise<void> {
    if (!staff) return;
    setFailure(null);

    try {
      const result = await reset.mutateAsync(staff.id);
      setPassword(result.temporaryPassword);
    } catch (error) {
      setFailure(error instanceof ApiRequestError ? error.message : t('failed'));
    }
  }

  async function copy(): Promise<void> {
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the password is on screen to read.
      setCopied(false);
    }
  }

  return (
    <Drawer
      open={staff !== null}
      onClose={onClose}
      side="end"
      size="md"
      title={t('title')}
      description={staff?.email}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {password ? t('done') : t('cancel')}
          </Button>
          {!password ? (
            <Button
              variant="danger"
              iconStart={<KeyRound />}
              loading={reset.isPending}
              onClick={generate}
            >
              {t('generate')}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-5">
        {failure ? (
          <InfoCard tone="danger" announce>
            {failure}
          </InfoCard>
        ) : null}

        {!password ? (
          <>
            <InfoCard tone="warning">{t('warning', { name: staff?.fullName ?? '' })}</InfoCard>
            <p className="text-body-small text-fg-muted">{t('explainer')}</p>
          </>
        ) : (
          <>
            <InfoCard tone="success">{t('onceOnly')}</InfoCard>

            <div className="space-y-2">
              <span className="text-caption text-fg-muted">{t('newPassword')}</span>
              <div className="flex items-center gap-2">
                <code className="bg-surface-subtle flex-1 rounded-lg border border-border px-3 py-2 font-mono text-body text-fg">
                  {password}
                </code>
                <Button
                  variant="outline"
                  iconStart={copied ? <Check /> : <Copy />}
                  onClick={copy}
                  aria-label={t('copy')}
                >
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>
            </div>

            <p className="text-body-small text-fg-muted">{t('handOver')}</p>
          </>
        )}
      </div>
    </Drawer>
  );
}
