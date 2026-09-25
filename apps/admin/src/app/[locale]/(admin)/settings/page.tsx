import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

/** /settings opens the first section. */
export default async function SettingsPage({
  params,
}: Readonly<{ params: Promise<{ locale: AppLocale }> }>): Promise<null> {
  const { locale } = await params;
  redirect({ href: '/settings/profile', locale });
  return null;
}
