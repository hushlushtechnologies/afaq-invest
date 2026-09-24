'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

/**
 * The first thing a keyboard user reaches. Hidden until focused, it jumps
 * straight to the page content, past the whole sidebar.
 */
export function SkipLink({ targetId }: { targetId: string }): ReactNode {
  const t = useTranslations('shell');

  return (
    <a
      href={`#${targetId}`}
      className="inset-s-4` sr-only-focusable absolute top-4 z-toast rounded-lg bg-primary px-4 py-2 text-body-small font-medium text-primary-foreground shadow-elevated"
    >
      {t('skipToContent')}
    </a>
  );
}
