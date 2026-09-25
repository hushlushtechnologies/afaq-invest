import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: `${t('forgot.title')} — Afaq Invest` };
}

/**
 * Requesting a password reset.
 *
 * Public by design: somebody who cannot sign in has to be able to reach it.
 * The proxy sends signed-in staff to the portal instead.
 */
export default function ForgotPasswordPage(): ReactNode {
  return <ForgotPasswordForm />;
}
