'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button, StateView } from '@afaq/ui';
import { Ban } from 'lucide-react';
import { useSignOut } from '@/lib/auth/use-sign-out';

/**
 * The account-level refusals: the reasons somebody with a valid password
 * still cannot be here.
 *
 * These are different in kind from a missing permission. A missing permission
 * means "not this page"; these mean "not this application, right now", so
 * there is nowhere else in the app to send them and the only useful control
 * is to sign out.
 */
const BLOCKING_REASONS = ['not_staff', 'suspended', 'disabled', 'invited'] as const;

export type BlockingReason = (typeof BLOCKING_REASONS)[number];

export function isBlockingReason(reason: string | null): reason is BlockingReason {
  return reason !== null && (BLOCKING_REASONS as readonly string[]).includes(reason);
}

/**
 * Shown in place of the whole application when the account itself is refused.
 *
 * Each reason gets its own words. "Your account has been suspended" and "you
 * have not accepted your invitation yet" call for completely different next
 * steps, and a single generic message would leave both people stuck.
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
