'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { IconButton } from '@afaq/ui';

/**
 * Opens global search. On wide screens it is a search-box-shaped button with
 * the keyboard shortcut; on narrow screens, just the icon.
 */
export function SearchTrigger({ onOpen }: { onOpen: () => void }): ReactNode {
  const t = useTranslations('search');

  return (
    <>
      <button
        type="button"
        data-search-trigger
        onClick={onOpen}
        className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-body-small text-fg-muted transition-colors outline-none hover:border-border-strong hover:text-fg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:flex xl:w-72"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-start">{t('placeholder')}</span>
        <kbd className="shrink-0 rounded border border-border bg-background-subtle px-1.5 font-mono text-[0.6875rem] text-fg-subtle">
          Ctrl K
        </kbd>
      </button>

      <IconButton
        icon={<Search />}
        label={t('open')}
        variant="ghost"
        data-search-trigger
        onClick={onOpen}
        className="md:hidden"
      />
    </>
  );
}
