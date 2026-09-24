'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type NotificationKind = 'investment' | 'kyc' | 'payment' | 'system';

/**
 * The sample texts available under notifications.samples. Listing them as a
 * union keeps the translated-key checking working: a key with no translation
 * fails the build instead of showing a raw key in the panel.
 */
export type NotificationTextKey =
  | 'kycSubmitted'
  | 'investmentRequest'
  | 'paymentFailed'
  | 'distributionApproved'
  | 'reportReady'
  | 'opportunityFunded';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  /** Translation key under notifications.samples. */
  key: NotificationTextKey;
  /** When it happened. Shown as "3 hours ago". */
  createdAt: string;
  read: boolean;
  /** Where clicking it goes. */
  href: string;
}

/**
 * SAMPLE DATA — fixed examples so the panel can be designed and reviewed.
 * A later sprint replaces this with real notifications from the API; the
 * panel, the badge and the unread logic stay exactly as they are.
 */
const SAMPLE_NOTIFICATIONS: readonly AppNotification[] = [
  {
    id: 'n1',
    kind: 'kyc',
    key: 'kycSubmitted',
    createdAt: '2026-03-15T08:40:00Z',
    read: false,
    href: '/compliance',
  },
  {
    id: 'n2',
    kind: 'investment',
    key: 'investmentRequest',
    createdAt: '2026-03-15T06:10:00Z',
    read: false,
    href: '/investments',
  },
  {
    id: 'n3',
    kind: 'payment',
    key: 'paymentFailed',
    createdAt: '2026-03-14T17:25:00Z',
    read: false,
    href: '/finance',
  },
  {
    id: 'n4',
    kind: 'payment',
    key: 'distributionApproved',
    createdAt: '2026-03-14T09:00:00Z',
    read: false,
    href: '/finance',
  },
  {
    id: 'n5',
    kind: 'system',
    key: 'reportReady',
    createdAt: '2026-03-13T12:30:00Z',
    read: true,
    href: '/reports',
  },
  {
    id: 'n6',
    kind: 'investment',
    key: 'opportunityFunded',
    createdAt: '2026-03-12T15:45:00Z',
    read: true,
    href: '/investments',
  },
];

interface NotificationsContextValue {
  notifications: readonly AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  /** Puts the samples back, so the empty state can be tried out. */
  restoreSamples: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used inside <NotificationsProvider>.');
  return context;
}

export function NotificationsProvider({ children }: { children: ReactNode }): ReactNode {
  const [notifications, setNotifications] =
    useState<readonly AppNotification[]>(SAMPLE_NOTIFICATIONS);

  const markRead = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);
  const restoreSamples = useCallback(() => setNotifications(SAMPLE_NOTIFICATIONS), []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      markRead,
      markAllRead,
      clearAll,
      restoreSamples,
    }),
    [notifications, markRead, markAllRead, clearAll, restoreSamples],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
