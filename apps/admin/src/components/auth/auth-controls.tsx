'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@afaq/ui';
import { LanguageSwitcher } from '@/components/language-switcher';

/**
 * Language and theme on the authentication pages.
 *
 * Someone who prefers Arabic needs it before they sign in, not after — the
 * topbar that normally carries these controls is not on screen yet.
 */
export function AuthControls(): ReactNode {
  const t = useTranslations('theme');

  return (
    <>
      <LanguageSwitcher />
      <ThemeToggle label={t('toggle')} />
    </>
  );
}
