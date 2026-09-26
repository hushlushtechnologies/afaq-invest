'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button, StateView } from '@afaq/ui';
import { Ban } from 'lucide-react';
import { useSignOut } from '@/lib/auth/use-sign-out';
import { type BlockingReason } from '@/lib/auth/refusals';

export { isBlockingReason, type BlockingReason } from '@/lib/auth/refusals';

/**
 * Shown in place of the whole application when the account itself is refused.
 *
 * Each reason gets its own words. "Your account has been suspended" and "you
 * have not accepted your invitation yet" call for completely different next
 * steps, and a single generic message would leave both people stuck.
 *
 * The reasons themselves live in @/lib/auth/refusals, so the permissions hook
 * can recognise them without importing this component.
 */
export function AccountBlocked({ reason }: { reason: BlockingReason }): ReactNode {
  const t = useTranslations('accessDenied.account');
  const { signOut, pending } = useSignOut();

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <StateView
        icon={<Ban />}
        tone="danger"
        size="lg"
        title={t(`${reason}.title`)}
        description={t(`${reason}.description`)}
        actions={
          <Button variant="outline" loading={pending} onClick={() => void signOut()}>
            {t('signOut')}
          </Button>
        }
      />
    </div>
  );
}
