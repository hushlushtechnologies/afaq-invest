import { redirect } from '@/i18n/navigation';

/** /en and /ar land on the dashboard. `redirect` throws, so nothing renders. */
export default async function AdminRootPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<null> {
  const { locale } = await params;
  redirect({ href: '/dashboard', locale });
  return null;
}
