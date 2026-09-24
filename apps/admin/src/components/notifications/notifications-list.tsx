'use client';

import { AlertTriangle, FileText, ShieldCheck, TrendingUp, type LucideIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { Locale } from '@afaq/types';
import { Button, EmptyState } from '@afaq/ui';
import { cn, formatRelativeTime } from '@afaq/utils';

import { Link } from '@/i18n/navigation';
import { useNotifications, type NotificationKind } from '@/lib/notification/notifications-context';

const KIND_ICONS: Record<NotificationKind, LucideIcon> = {
  investment: TrendingUp,
  kyc: ShieldCheck,
  payment: AlertTriangle,
  system: FileText,
};

const KIND_TONES: Record<
  NotificationKind,
  {
    container: string;
    icon: string;
    glow: string;
  }
> = {
  investment: {
    container: 'bg-primary/10',
    icon: 'text-primary',
    glow: 'bg-primary/10',
  },

  kyc: {
    container: 'bg-info-surface/80',
    icon: 'text-info',
    glow: 'bg-info/8',
  },

  payment: {
    container: 'bg-warning-surface/80',
    icon: 'text-warning-strong',
    glow: 'bg-warning/8',
  },

  system: {
    container: 'bg-background-subtle/80',
    icon: 'text-fg-subtle',
    glow: 'bg-fg-muted/5',
  },
};

/**
 * Notification list shared by the desktop popover and mobile drawer.
 */
export function NotificationsList({ onNavigate }: { onNavigate?: () => void }): ReactNode {
  const t = useTranslations('notifications');
  const locale = useLocale() as Locale;

  const { notifications, markRead, restoreSamples } = useNotifications();

  if (notifications.length === 0) {
    return (
      <div className="px-4 py-5">
        <EmptyState
          size="sm"
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Button size="sm" variant="outline" onClick={restoreSamples}>
              {t('restoreSamples')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <ul className="space-y-1.5 p-1.5">
      {notifications.map((item) => {
        const Icon = KIND_ICONS[item.kind];
        const tone = KIND_TONES[item.kind];

        return (
          <li key={item.id}>
            <Link
              href={item.href}
              onClick={() => {
                markRead(item.id);
                onNavigate?.();
              }}
              className={cn(
                'group relative flex gap-3 overflow-hidden',
                'rounded-xl px-2.5 py-2.5',
                'outline-none',
                'transition-[background-color,transform,box-shadow]',
                'duration-200 ease-out-soft',

                // Hover
                'hover:bg-surface-hover/70',
                'hover:-translate-y-px',

                // Keyboard
                'focus-visible:bg-surface-hover/70',
                'focus-visible:ring-2',
                'focus-visible:ring-primary/25',

                // Unread
                !item.read && [
                  'bg-primary/[0.035]',
                  'shadow-[inset_0_0_0_1px_oklch(1_0_0_/_0.025)]',
                ],
              )}
            >
              {/* Ambient glow for unread notifications */}
              {!item.read ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute',
                    '-start-8 -top-8',
                    'size-20 rounded-full blur-2xl',
                    'opacity-70',
                    tone.glow,
                  )}
                />
              ) : null}

              {/* Icon */}
              <span
                aria-hidden="true"
                className={cn(
                  'relative mt-0.5 flex size-9 shrink-0',
                  'items-center justify-center',
                  'rounded-xl',
                  'border border-border/40',
                  'backdrop-blur-md',
                  'transition-transform duration-200',
                  'group-hover:scale-[1.04]',
                  tone.container,
                )}
              >
                <Icon className={cn('size-[17px]', tone.icon)} />
              </span>

              {/* Content */}
              <span className="relative min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate pe-1',
                    'text-body-small leading-5',
                    item.read ? 'text-fg-secondary' : 'font-medium text-fg',
                  )}
                >
                  {t(`samples.${item.key}`)}
                </span>

                <span className={cn('mt-1 block', 'text-caption', 'text-fg-muted')}>
                  {formatRelativeTime(item.createdAt, {
                    locale,
                    now: new Date('2026-03-15T10:00:00Z'),
                  })}
                </span>
              </span>

              {/* Unread indicator */}
              {!item.read ? (
                <span className="relative mt-2.5 flex size-2 shrink-0" aria-hidden="true">
                  <span
                    className={cn('absolute inset-0 rounded-full', 'bg-primary/30 blur-[3px]')}
                  />

                  <span className="relative size-2 rounded-full bg-primary" />
                </span>
              ) : null}

              {!item.read ? <span className="sr-only">{t('unread')}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
