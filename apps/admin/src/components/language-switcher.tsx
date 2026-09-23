'use client';

import { Check, Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition, type ReactNode } from 'react';
import { LOCALES, LOCALE_CODES, type Locale } from '@afaq/types';
import { Dropdown, DropdownItem, IconButton } from '@afaq/ui';
import { usePathname, useRouter } from '@/i18n/navigation';

export interface LanguageSwitcherProps {
  /** 'full' shows the language name beside the icon; 'icon' is icon-only. */
  variant?: 'icon' | 'full';
  className?: string;
}

/**
 * Switches between English and Arabic. It keeps the current page — /en/finance
 * becomes /ar/finance — and next-intl stores the choice in a cookie, so the
 * language is remembered next time.
 */
export function LanguageSwitcher({
  variant = 'icon',
  className,
}: LanguageSwitcherProps): ReactNode {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale): void {
    if (next === locale) return;
    startTransition(() => {
      // pathname is the current page without its language prefix — including
      // any id in the address — so the same page opens in the other language.
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <Dropdown
      label={t('changeLanguage')}
      placement="bottom-end"
      trigger={
        variant === 'full' ? (
          <button
            type="button"
            disabled={pending}
            className="inline-flex h-9.5 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-body-small text-fg-secondary transition-colors outline-none hover:bg-surface-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
          >
            <Globe className="size-4" aria-hidden="true" />
            {LOCALES[locale].nativeLabel}
          </button>
        ) : (
          <IconButton
            icon={<Globe />}
            label={t('changeLanguage')}
            variant="outline"
            disabled={pending}
            className={className}
          />
        )
      }
    >
      {LOCALE_CODES.map((code) => (
        <DropdownItem
          key={code}
          onSelect={() => switchTo(code)}
          icon={
            code === locale ? (
              <Check aria-hidden="true" />
            ) : (
              <span className="size-4" aria-hidden="true" />
            )
          }
        >
          <span lang={code} dir={LOCALES[code].dir}>
            {LOCALES[code].nativeLabel}
          </span>
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
