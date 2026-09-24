'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Clock, CornerDownLeft, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  Backdrop,
  IconButton,
  Portal,
  useBodyScrollLock,
  useEscapeKey,
  useFocusTrap,
  useMotionPreset,
  useOverlayStack,
} from '@afaq/ui';
import { cn } from '@afaq/utils';
import { NAV_MODULES, type NavModule } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { useRecentSearches } from './use-recent-searches';

export interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Global search. Today it searches what genuinely exists — the twelve modules —
 * and keeps your recent terms. Investor, company and payment results arrive
 * with those modules; until then the dialog says so rather than inventing rows.
 */
export function SearchDialog({ open, onClose }: SearchDialogProps): ReactNode {
  return (
    <Portal>
      <AnimatePresence>
        {/* Mounted only while open, so every visit starts with an empty box —
            no effect needed to reset it. */}
        {open ? <SearchDialogContent onClose={onClose} /> : null}
      </AnimatePresence>
    </Portal>
  );
}

function SearchDialogContent({ onClose }: { onClose: () => void }): ReactNode {
  const t = useTranslations('search');
  const tNav = useTranslations('nav');
  const router = useRouter();

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const isTopmost = useOverlayStack(true);
  const motionProps = useMotionPreset('modal');
  const { recent, remember, clear } = useRecentSearches();

  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);

  useBodyScrollLock(true);
  useEscapeKey(true, onClose, isTopmost);
  useFocusTrap(panelRef, true, isTopmost);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return NAV_MODULES;
    return NAV_MODULES.filter((item) => tNav(item.key).toLowerCase().includes(term));
  }, [query, tNav]);

  const go = useCallback(
    (item: NavModule) => {
      remember(query);
      onClose();
      router.push(item.href);
    },
    [onClose, query, remember, router],
  );

  // The panel's container covers the screen, so the backdrop underneath never
  // receives clicks; the container closes on a press outside the panel instead.
  function handleOutsidePress(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (matches.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((index) => (index + 1) % matches.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setHighlighted(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setHighlighted(matches.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = matches[highlighted];
      if (item) go(item);
    }
  }

  return (
    <div className="fixed inset-0 z-modal">
      <Backdrop />
      <div
        onMouseDown={handleOutsidePress}
        className="fixed inset-0 flex items-start justify-center p-0 sm:p-6 sm:pt-[12vh]"
      >
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('title')}
          onKeyDown={handleKeyDown}
          {...motionProps}
          // Full screen on phones, a floating panel from tablet up.
          className="flex h-dvh w-full flex-col bg-surface shadow-overlay outline-none sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-2xl sm:border sm:border-border"
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-border-subtle px-4 py-3">
            <Search className="size-4.5 shrink-0 text-fg-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              data-autofocus
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlighted(0);
              }}
              placeholder={t('placeholder')}
              aria-label={t('title')}
              aria-controls={listId}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-muted"
            />
            <IconButton
              icon={<X />}
              label={t('close')}
              size="sm"
              onClick={onClose}
              className="w-8"
            />
          </div>

          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-2">
            {!query && recent.length > 0 ? (
              <div className="mb-2">
                <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1">
                  <p className="text-caption font-medium text-fg-muted">{t('recent')}</p>
                  <button
                    type="button"
                    onClick={clear}
                    className="rounded px-1 text-caption text-fg-muted outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t('clearRecent')}
                  </button>
                </div>
                {recent.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      setHighlighted(0);
                      inputRef.current?.focus();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-body-small text-fg-secondary outline-none hover:bg-surface-hover focus-visible:bg-surface-hover"
                  >
                    <Clock className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
                    <span className="truncate">{term}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <p className="px-2.5 pt-1.5 pb-1 text-caption font-medium text-fg-muted">
              {t('modules')}
            </p>
            <ul id={listId} role="listbox" aria-label={t('modules')}>
              {matches.map((item, index) => (
                <li key={item.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === highlighted}
                    tabIndex={-1}
                    onMouseMove={() => setHighlighted(index)}
                    onClick={() => go(item)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-body-small outline-none',
                      index === highlighted
                        ? 'bg-primary/10 text-primary-strong'
                        : 'text-fg-secondary',
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{tNav(item.key)}</span>
                    {index === highlighted ? (
                      <CornerDownLeft
                        className="size-3.5 shrink-0 text-fg-muted rtl:-scale-x-100"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>

            {matches.length === 0 ? (
              <p role="status" className="px-2.5 py-6 text-center text-body-small text-fg-subtle">
                {t('noModules', { query })}
              </p>
            ) : null}

            <p className="mt-2 border-t border-border-subtle px-2.5 pt-3 pb-1.5 text-caption text-fg-muted">
              {t('recordsNote')}
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-4 border-t border-border-subtle px-4 py-2.5 text-caption text-fg-muted sm:flex">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border bg-background-subtle px-1.5 font-mono text-fg-subtle">
                ↑↓
              </kbd>
              {t('hintNavigate')}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border bg-background-subtle px-1.5 font-mono text-fg-subtle">
                Enter
              </kbd>
              {t('hintSelect')}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border bg-background-subtle px-1.5 font-mono text-fg-subtle">
                Esc
              </kbd>
              {t('hintClose')}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
