import { redirect } from '@/i18n/navigation';

/** /en and /ar land on sign-in. `redirect` throws, so nothing renders. */
export default async function PartnerRootPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<null> {
  const { locale } = await params;
  redirect({ href: '/sign-in', locale });
  return null;
}
