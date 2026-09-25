import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { Providers } from '@/components/providers';
import { routing } from '@/i18n/routing';
import { getServerSession } from '@/lib/auth/server';
import { fontVariables } from '../fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Afaq Invest — Admin',
  description: 'Administration portal for Afaq Invest',
};

/**
 * viewportFit: 'cover' lets the app use the whole screen on phones with a
 * notch or a home indicator; components then keep clear of those areas with
 * safe-area padding.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * The document and everything shared by every page — language, theme, data
 * fetching and the session.
 *
 * The admin shell is not here: signing in happens outside it, so the sidebar
 * and topbar belong to the (admin) group rather than to every page.
 */
export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>): Promise<ReactNode> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Read on the server so the first paint already knows who is signed in.
  const session = await getServerSession();

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={fontVariables}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>
          <Providers initialSession={session}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
