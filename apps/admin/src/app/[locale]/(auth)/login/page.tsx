import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { getAuthUser } from '@/lib/auth/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: `${t('login.title')} — Afaq Invest` };
}

/**
 * Signing in.
 *
 * Someone who already has a session is sent to the portal rather than shown a
 * form they do not need — checked on the server, before anything renders.
 */
export default async function LoginPage({
  params,
}: Readonly<{ params: Promise<{ locale: AppLocale }> }>): Promise<ReactNode> {
  const { locale } = await params;
  const user = await getAuthUser();

  if (user) {
    redirect({ href: '/dashboard', locale });
  }

  return <LoginForm />;
}
