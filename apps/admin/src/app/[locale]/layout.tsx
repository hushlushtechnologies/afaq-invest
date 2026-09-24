import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ThemeProvider } from '@afaq/ui';
import { AdminShell } from '@/components/shell/admin-shell';
import { getEnvironment } from '@/config/app-meta';
import { routing } from '@/i18n/routing';
import { isCollapsed, SIDEBAR_COOKIE } from '@/lib/shell/sidebar-preference';
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

  // Reading the sidebar choice here means the very first HTML has the right
  // width — no flash of an expanded sidebar collapsing a moment later.
  const cookieStore = await cookies();
  const sidebarCollapsed = isCollapsed(cookieStore.get(SIDEBAR_COOKIE)?.value);

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={fontVariables}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>
          <ThemeProvider storageKey="afaq-admin-theme">
            <AdminShell initialSidebarCollapsed={sidebarCollapsed} environment={getEnvironment()}>
              {children}
            </AdminShell>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
