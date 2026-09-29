import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

/**
 * /investments has no page of its own — it opens its first section.
 *
 * Rules rather than opportunities: the rules exist and the opportunity
 * screens do not yet. When they arrive this points at them instead.
 */
export default async function InvestmentsPage({
  params,
}: Readonly<{ params: Promise<{ locale: AppLocale }> }>): Promise<null> {
  const { locale } = await params;
  redirect({ href: '/investments/rules', locale });
  return null;
}
