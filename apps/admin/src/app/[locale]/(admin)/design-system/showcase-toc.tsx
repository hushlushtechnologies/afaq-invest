'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Select } from '@afaq/ui';
import { cn } from '@afaq/utils';

interface TocEntry {
  id: string;
  title: string;
}

/**
 * Contents for a very long page: a sticky list on wide screens that follows
 * where you are, and a jump menu on narrow ones. Plus a back-to-top button,
 * which appears only once there is something to go back up from.
 *
 * The list is read from the page itself, so adding a section to the showcase
 * adds it here with nothing else to update.
 */
export function ShowcaseToc(): ReactNode {
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [current, setCurrent] = useState('');
  const [showTop, setShowTop] = useState(false);
  const scrollerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>('#main-content');
    scrollerRef.current = scroller;

    const sections = [...document.querySelectorAll<HTMLElement>('[data-showcase-section]')];
    const found = sections.map((section) => ({
      id: section.dataset.showcaseSection ?? '',
      // The heading's own text, minus the "link to this section" icon.
      title: (section.querySelector('h2')?.firstChild?.textContent ?? '').trim(),
    }));

    // Applied on the next frame rather than during the effect itself, so this
    // doesn't trigger a second render pass while the page is still settling.
    const frame = window.requestAnimationFrame(() => {
      setEntries(found);
      setCurrent(found[0]?.id ?? '');
    });

    if (!scroller) {
      return () => window.cancelAnimationFrame(frame);
    }

    // Highlight whichever section is nearest the top of the reading area.
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = (visible?.target as HTMLElement | undefined)?.dataset.showcaseSection;
        if (id) setCurrent(id);
      },
      { root: scroller, rootMargin: '-72px 0px -70% 0px', threshold: 0 },
    );
    for (const section of sections) observer.observe(section);

    function handleScroll(): void {
      setShowTop((scroller?.scrollTop ?? 0) > 600);
    }
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener('scroll', handleScroll);
    };
  }, []);

  function jumpTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
    setCurrent(id);
  }

  if (entries.length === 0) return null;

  return (
    <>
      {/* Narrow screens: a plain jump menu, no sticky column. */}
      <div className="xl:hidden">
        <Select
          aria-label="Jump to section"
          value={current}
          onChange={(event) => jumpTo(event.target.value)}
          options={entries.map((entry) => ({ value: entry.id, label: entry.title }))}
        />
      </div>

      <nav
        aria-label="On this page"
        className="sticky top-4 hidden scrollbar-subtle max-h-[calc(100dvh-8rem)] overflow-y-auto xl:block"
      >
        <p className="mb-2 px-3 text-caption font-medium text-fg-muted">On this page</p>
        <ul className="flex flex-col gap-0.5">
          {entries.map((entry) => (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={current === entry.id ? 'true' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  jumpTo(entry.id);
                }}
                className={cn(
                  'block rounded-lg px-3 py-1.5 text-body-small transition-colors outline-none',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                  current === entry.id
                    ? 'bg-primary/10 font-medium text-primary-strong'
                    : 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
                )}
              >
                {entry.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {showTop ? (
        <Button
          variant="secondary"
          size="sm"
          iconStart={<ArrowUp />}
          onClick={() => scrollerRef.current?.scrollTo({ top: 0 })}
          className="fixed end-5 bottom-5 z-raised shadow-elevated"
        >
          Back to top
        </Button>
      ) : null}
    </>
  );
}
