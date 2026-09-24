'use client';

import { LogOut, Settings2, ShieldCheck, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import {
  Avatar,
  Badge,
  ConfirmationDialog,
  Drawer,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  useMediaQuery,
} from '@afaq/ui';
import { Link } from '@/i18n/navigation';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { useSignOut } from '@/lib/auth/use-sign-out';

/**
 * The account menu. A dropdown on desktop, a bottom sheet on phones.
 * Signing out asks first — an accidental click costs a re-login, and on a
 * shared office machine that is a real annoyance.
 * The pages it links to are built in Phase 24 and Sprint 3.
 */
export function ProfileMenu(): ReactNode {
  const t = useTranslations('profile');
  const [open, setOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const user = useCurrentUser();
  const { signOut } = useSignOut();

  const items = [
    { key: 'myProfile', href: '/settings/profile', icon: <UserRound /> },
    { key: 'security', href: '/settings/security', icon: <ShieldCheck /> },
    { key: 'preferences', href: '/settings/preferences', icon: <Settings2 /> },
  ] as const;

  const trigger = (
    <button
      type="button"
      aria-label={t('openMenu', { name: user.name })}
      className="flex items-center gap-2 rounded-full transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={!isDesktop ? () => setOpen(true) : undefined}
    >
      <Avatar name={user.name} src={user.avatarUrl} size="sm" />
      <span className="hidden min-w-0 text-start xl:block">
        <span className="block max-w-36 truncate text-body-small font-medium text-fg">
          {user.name}
        </span>
        <span className="block max-w-36 truncate text-caption text-fg-muted">{user.roleLabel}</span>
      </span>
    </button>
  );

  const identity = (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Avatar name={user.name} src={user.avatarUrl} size="md" />
      <div className="min-w-0">
        <p className="truncate text-body-small font-medium text-fg">{user.name}</p>
        <p className="truncate text-caption text-fg-muted">{user.email}</p>
        <Badge size="sm" variant="primary" className="mt-1.5">
          {user.roleLabel}
        </Badge>
      </div>
    </div>
  );

  const signOutDialog = (
    <ConfirmationDialog
      open={confirmSignOut}
      onClose={() => setConfirmSignOut(false)}
      onConfirm={signOut}
      tone="warning"
      title={t('signOutTitle')}
      message={t('signOutMessage')}
      confirmLabel={t('signOut')}
    />
  );

  if (!isDesktop) {
    return (
      <>
        {trigger}
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          side="bottom"
          title={t('title')}
          closeLabel={t('close')}
        >
          <div className="-mx-2">
            {identity}
            <div className="mt-2 space-y-1 border-t border-border-subtle pt-2">
              {items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center gap-3 rounded-lg px-3 text-body-small text-fg-secondary outline-none hover:bg-surface-hover focus-visible:bg-surface-hover [&_svg]:size-4"
                >
                  {item.icon}
                  {t(item.key)}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirmSignOut(true);
                }}
                className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-body-small text-danger-strong outline-none hover:bg-danger-surface focus-visible:bg-danger-surface [&_svg]:size-4"
              >
                <LogOut />
                {t('signOut')}
              </button>
            </div>
          </div>
        </Drawer>
        {signOutDialog}
      </>
    );
  }

  return (
    <>
      <Dropdown
        label={t('title')}
        placement="bottom-end"
        open={open}
        onOpenChange={setOpen}
        trigger={trigger}
        className="w-64"
      >
        {identity}
        <DropdownSeparator />
        {items.map((item) => (
          <DropdownItem key={item.key} icon={item.icon} href={item.href} linkComponent={Link}>
            {t(item.key)}
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <DropdownItem icon={<LogOut />} tone="danger" onSelect={() => setConfirmSignOut(true)}>
          {t('signOut')}
        </DropdownItem>
      </Dropdown>
      {signOutDialog}
    </>
  );
}
