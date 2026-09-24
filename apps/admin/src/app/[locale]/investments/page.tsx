import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

/** /investors has no page of its own — it opens its first section. */
export default async function InvestorsPage({
  params,
}: Readonly<{ params: Promise<{ locale: AppLocale }> }>): Promise<null> {
  const { locale } = await params;
  redirect({ href: '/investors/all', locale });
  return null;
}
