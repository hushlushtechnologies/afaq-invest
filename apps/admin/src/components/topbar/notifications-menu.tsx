'use client';

import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Badge, Button, Drawer, IconButton, Popover, useMediaQuery } from '@afaq/ui';
import { NotificationsList } from '@/components/notifications/notifications-list';
import { Link } from '@/i18n/navigation';
import { useNotifications } from '@/lib/notification/notifications-context';

/**
 * The bell and its panel. A popover anchored to the bell on desktop; a bottom
 * sheet on phones, where a small floating panel would be awkward to reach.
 */
export function NotificationsMenu(): ReactNode {
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const { unreadCount, markAllRead, clearAll, notifications } = useNotifications();

  const label = unreadCount > 0 ? t('openWithCount', { count: unreadCount }) : t('open');

  // The trigger is the button itself: Popover puts aria-haspopup and
  // aria-expanded on whatever it is given, and those attributes belong on a
  // button, not on a wrapper span. The badge is positioned around it instead.
  const trigger = (
    <IconButton icon={<Bell />} label={label} variant="ghost" onClick={() => setOpen(!open)} />
  );

  const unreadBadge =
    unreadCount > 0 ? (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute end-1 top-1 z-raised flex min-w-4 justify-center rounded-full bg-danger px-1 text-[0.625rem] leading-4 text-numeric font-medium text-status-foreground ring-2 ring-background"
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    ) : null;

  const actions =
    notifications.length > 0 ? (
      <div className="flex items-center gap-1">
        <Button
          size="xs"
          variant="ghost"
          iconStart={<CheckCheck />}
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          {t('markAllRead')}
        </Button>
        <IconButton
          icon={<Trash2 />}
          label={t('clearAll')}
          size="sm"
          onClick={clearAll}
          className="w-8"
        />
      </div>
    ) : null;

  const footer = (
    <Link
      href="/support"
      onClick={() => setOpen(false)}
      className="block rounded-lg px-4 py-2.5 text-center text-body-small text-primary-strong outline-none hover:bg-surface-hover focus-visible:bg-surface-hover"
    >
      {t('viewAll')}
    </Link>
  );

  if (!isDesktop) {
    return (
      <>
        {trigger}
        {unreadBadge}
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          side="bottom"
          title={
            <span className="flex items-center gap-2">
              {t('title')}
              {unreadCount > 0 ? (
                <Badge size="sm" variant="primary">
                  {unreadCount}
                </Badge>
              ) : null}
            </span>
          }
          footer={<div className="w-full">{footer}</div>}
        >
          <div className="-mx-5 -my-5">
            {actions ? <div className="px-4 py-2">{actions}</div> : null}
            <NotificationsList onNavigate={() => setOpen(false)} />
          </div>
        </Drawer>
      </>
    );
  }

  return (
    <span className="relative inline-flex">
      {unreadBadge}
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="bottom-end"
        width="lg"
        className="p-0"
        trigger={trigger}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-2.5">
          <p className="flex items-center gap-2 text-h6 text-fg">
            {t('title')}
            {unreadCount > 0 ? (
              <Badge size="sm" variant="primary">
                {unreadCount}
              </Badge>
            ) : null}
          </p>
          {actions}
        </div>
        <div className="max-h-96 scrollbar-none overflow-y-auto">
          <NotificationsList onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t border-border-subtle p-1">{footer}</div>
      </Popover>
    </span>
  );
}
