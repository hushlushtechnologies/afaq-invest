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
    <aside className="hidden w-60 shrink-0 flex-col border-e border-sidebar-border bg-sidebar-background px-3 py-5 md:flex">
      <div className="px-3 pb-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-sidebar-active uppercase">
          {tc('appName')}
        </p>
        <p className="mt-1 text-sm text-sidebar-text-muted">{tc('portal')}</p>
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
                'rounded-md px-3 py-2 text-sm transition-colors duration-150',
                isActive
                  ? 'gradient-ghost text-sidebar-active'
                  : 'text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text',
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
