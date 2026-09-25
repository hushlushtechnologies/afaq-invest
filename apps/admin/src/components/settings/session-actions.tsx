'use client';

import { LogOut, MonitorSmartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Button, Card, CardHeader, ConfirmationDialog, Divider } from '@afaq/ui';
import { useSignOut } from '@/lib/auth/use-sign-out';

type PendingAction = 'others' | 'global' | null;

/**
 * Ending sessions on other devices, or everywhere.
 *
 * Supabase does not offer a list of a person's active sessions, so there is
 * nothing to enumerate — but the useful actions are all available, and both
 * ask for confirmation because neither can be undone.
 */
export function SessionActions(): ReactNode {
  const t = useTranslations('settings.sections.security.sessions');
  const { signOut } = useSignOut();
  const [confirming, setConfirming] = useState<PendingAction>(null);
  const [signedOutOthers, setSignedOutOthers] = useState(false);

  async function confirm(): Promise<void> {
    if (!confirming) return;

    await signOut(confirming);

    // Signing out globally navigates away; signing out others leaves us here,
    // so the outcome needs saying.
    if (confirming === 'others') setSignedOutOthers(true);
    setConfirming(null);
  }

  return (
    <>
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <MonitorSmartphone className="size-4" aria-hidden="true" />
              {t('title')}
            </span>
          }
          description={t('description')}
        />

        <Divider className="my-5" />

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setConfirming('others')}>
            {t('signOutOthers')}
          </Button>
          <Button variant="outline" iconStart={<LogOut />} onClick={() => setConfirming('global')}>
            {t('signOutEverywhere')}
          </Button>
        </div>

        {signedOutOthers ? (
          <p role="status" className="mt-4 text-body-small text-success">
            {t('othersSignedOut')}
          </p>
        ) : null}
      </Card>

      <ConfirmationDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={confirm}
        tone="warning"
        title={confirming === 'global' ? t('confirmEverywhereTitle') : t('confirmOthersTitle')}
        message={confirming === 'global' ? t('confirmEverywhereBody') : t('confirmOthersBody')}
        confirmLabel={confirming === 'global' ? t('signOutEverywhere') : t('signOutOthers')}
      />
    </>
  );
}
