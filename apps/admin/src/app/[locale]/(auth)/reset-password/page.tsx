import { LinkIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Button } from '@afaq/ui';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Link } from '@/i18n/navigation';
import { getAuthUser } from '@/lib/auth/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: `${t('reset.title')} — Afaq Invest` };
}

/**
 * Choosing a new password.
 *
 * Reaching this page at all requires a session, which the recovery link
 * produced moments earlier. Without one the link was wrong, used already, or
 * expired — and the page says so rather than showing a form that cannot work.
 *
 * Signed-in staff may also open it deliberately to change their password, so
 * it is not on the list of pages a session redirects away from.
 */
export default async function ResetPasswordPage(): Promise<ReactNode> {
  const t = await getTranslations('auth');
  const user = await getAuthUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-warning-surface text-warning-strong">
          <LinkIcon className="size-6" aria-hidden="true" />
        </span>

        <div>
          <h1 className="text-h2 text-fg">{t('reset.invalidTitle')}</h1>
          <p className="mt-2 text-body-small text-fg-subtle">{t('reset.invalidBody')}</p>
        </div>

        <Button asChild variant="gradient" size="lg" className="w-full">
          <Link href="/forgot-password">{t('reset.requestNew')}</Link>
        </Button>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
