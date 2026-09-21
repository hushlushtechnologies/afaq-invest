'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@afaq/utils';
import { Link, usePathname } from '@/i18n/navigation';

const LINKS = [
  { href: '/', key: 'home' },
  { href: '/opportunities', key: 'opportunities' },
  { href: '/how-it-works', key: 'howItWorks' },
  { href: '/about', key: 'about' },
  { href: '/faq', key: 'faq' },
  { href: '/contact', key: 'contact' },
] as const;

export function SiteHeader(): ReactNode {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-widest text-emerald-600 uppercase">
          {tc('appName')}
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {LINKS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'text-sm transition-colors',
                pathname === href
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',
              )}
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {t('signIn')}
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          >
            {t('register')}
          </Link>
        </div>
      </div>
    </header>
  );
}
