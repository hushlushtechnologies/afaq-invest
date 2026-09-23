import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { ThemeProvider } from '@afaq/ui';
import { routing } from '@/i18n/routing';
import { fontVariables } from '../fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Afaq Invest — Partner',
  description: 'Partner portal for Afaq Invest',
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

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={fontVariables}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>
          <ThemeProvider storageKey="afaq-partner-theme">
            <div className="min-h-screen bg-background">{children}</div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
