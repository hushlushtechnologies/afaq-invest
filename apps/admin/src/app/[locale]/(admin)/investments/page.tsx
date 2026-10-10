import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

/**
 * /investments has no page of its own — it opens its first section.
 *
 * Opportunities rather than rules: the raises are what people come here to
 * look at day to day. The rules change rarely and sit one tab along.
 */
export default async function InvestmentsPage({
  params,
}: Readonly<{ params: Promise<{ locale: AppLocale }> }>): Promise<null> {
  const { locale } = await params;
  redirect({ href: '/investments/opportunities', locale });
  return null;
}
