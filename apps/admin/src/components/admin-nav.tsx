'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@afaq/utils';
import { Link, usePathname } from '@/i18n/navigation';

const MODULES = [
  'dashboard',
  'investors',
  'companies',
  'partners',
  'investments',
  'finance',
  'compliance',
  'documents',
  'reports',
  'support',
  'administration',
  'settings',
] as const;

export function AdminNav(): ReactNode {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-neutral-950 px-3 py-5 md:flex">
      <div className="px-3 pb-5">
        <p className="text-xs font-medium tracking-widest text-emerald-400 uppercase">
          {tc('appName')}
        </p>
        <p className="mt-1 text-sm text-neutral-400">{tc('portal')}</p>
      </div>
      <nav className="flex flex-col gap-0.5">
        {MODULES.map((module) => {
          const href = `/${module}`;
          const isActive = pathname === href;

          return (
            <Link
              key={module}
              href={href}
              className={cn(
                'rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-emerald-600/15 text-emerald-400'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100',
              )}
            >
              {t(module)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
