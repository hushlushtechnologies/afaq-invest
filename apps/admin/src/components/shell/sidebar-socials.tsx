'use client';

import type { ReactNode } from 'react';
import { FaFacebookF, FaInstagram, FaTelegramPlane } from 'react-icons/fa';
import { cn } from '@afaq/utils';

const SOCIALS = [
  {
    label: 'Telegram',
    icon: FaTelegramPlane,
    href: '#',
  },
  {
    label: 'Instagram',
    icon: FaInstagram,
    href: '#',
  },
  {
    label: 'Facebook',
    icon: FaFacebookF,
    href: '#',
  },
];

export function SidebarSocials(): ReactNode {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-1',
        'rounded-2xl',
        'border border-sidebar-border/70',
        'bg-sidebar-surface/70',
        'p-1',
        'shadow-[0_8px_24px_-12px_oklch(0_0_0_/_0.7)]',
        'backdrop-blur-md',
      )}
    >
      {SOCIALS.map((social) => {
        const Icon = social.icon;

        return (
          <a
            key={social.label}
            href={social.href}
            aria-label={social.label}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex size-8 items-center justify-center',
              'rounded-xl',
              'text-sidebar-text-muted',
              'transition-all duration-200 ease-out-soft',
              'hover:-translate-y-0.5',
              'hover:bg-sidebar-hover',
              'hover:text-sidebar-text',
              'focus-visible:outline-none',
              'focus-visible:ring-2',
              'focus-visible:ring-sidebar-active',
              'focus-visible:ring-offset-1',
              'focus-visible:ring-offset-sidebar-background',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}
