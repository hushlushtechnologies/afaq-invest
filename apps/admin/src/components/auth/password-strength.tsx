'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { passwordStrength } from '@afaq/validation';

const BAR_TONES = ['bg-border', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success'] as const;

const LABEL_TONES = [
  'text-fg-muted',
  'text-danger-strong',
  'text-warning-strong',
  'text-info',
  'text-success',
] as const;

/**
 * How strong the chosen password is, as four filling bars.
 *
 * Guidance, not a gate: the rules that must be met are enforced by validation
 * and shown as ordinary field errors. This only tells someone whether they
 * have chosen something comfortably strong or merely acceptable.
 */
export function PasswordStrength({ value }: { value: string }): ReactNode {
  const t = useTranslations('auth.reset.strength');
  const score = passwordStrength(value);

  if (!value) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              step <= score ? BAR_TONES[score] : 'bg-border-subtle',
            )}
          />
        ))}
      </div>
      {/* Announced politely: useful to hear, not worth interrupting for. */}
      <p role="status" className={cn('mt-1.5 text-caption', LABEL_TONES[score])}>
        {t(String(score) as '0' | '1' | '2' | '3' | '4')}
      </p>
    </div>
  );
}
