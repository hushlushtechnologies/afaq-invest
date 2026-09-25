import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

/** /finance has no page of its own — it opens its first section. */
export default async function FinancePage({
  params,
}: Readonly<{ params: Promise<{ locale: AppLocale }> }>): Promise<null> {
  const { locale } = await params;
  redirect({ href: '/finance/payments', locale });
  return null;
}
