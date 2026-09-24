'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

interface SidebarPromoProps {
  collapsed?: boolean;
}

export function SidebarPromo({ collapsed = false }: SidebarPromoProps): ReactNode {
  if (collapsed) {
    return (
      <motion.a
        href="#"
        aria-label="Powered by Hush Lush Technologies"
        whileHover={{
          y: -2,
          scale: 1.04,
        }}
        whileTap={{
          scale: 0.96,
        }}
        transition={{
          duration: 0.2,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={cn(
          'group relative mx-auto flex size-10 items-center justify-center',
          'rounded-xl border border-sidebar-border/80',
          'bg-sidebar-surface/80 backdrop-blur-md',
          'shadow-[0_8px_20px_-10px_oklch(0_0_0_/_0.7)]',
          'outline-none',
          'transition-[border-color,box-shadow] duration-200',
          'hover:border-sidebar-active/30',
          'hover:shadow-[0_10px_24px_-10px_oklch(0_0_0_/_0.8)]',
          'focus-visible:ring-2 focus-visible:ring-sidebar-active',
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl bg-sidebar-active/5 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
        />

        <Image
          src="/logo/hush.svg"
          alt=""
          width={26}
          height={26}
          className="relative size-6 object-contain"
        />
      </motion.a>
    );
  }

  return (
    <motion.a
      href="#"
      aria-label="Powered by Hush Lush Technologies"
      whileHover={{ y: -2 }}
      transition={{
        duration: 0.2,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        'group relative block overflow-hidden',
        'rounded-2xl border border-sidebar-border/80',
        'bg-sidebar-surface/75 p-3 backdrop-blur-md',
        'shadow-[0_12px_30px_-16px_oklch(0_0_0_/_0.8)]',
        'outline-none',
        'transition-[border-color,box-shadow] duration-200',
        'hover:border-sidebar-active/25',
        'hover:shadow-[0_16px_34px_-16px_oklch(0_0_0_/_0.85)]',
        'focus-visible:ring-2 focus-visible:ring-sidebar-active',
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-8 -top-8 size-20 rounded-full bg-sidebar-active/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute start-2 top-5 size-10 rounded-full bg-[#F7D726]/10 blur-xl transition-opacity duration-300 group-hover:bg-[#F7D726]/20"
      />

      <div className="relative">
        <p className="text-[10px] font-medium tracking-[0.12em] text-sidebar-text-muted uppercase">
          Powered by
        </p>

        <div className="mt-2 flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center',
              'rounded-xl border border-sidebar-border/80',
              'bg-sidebar-background/70',
            )}
          >
            <Image
              src="/logo/hush.svg"
              alt=""
              width={28}
              height={28}
              className="size-7 object-cover"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-sidebar-text">Hush Lush Technologies</p>

            <p className="mt-0.5 text-[10px] text-sidebar-text-muted">Technology partner</p>
          </div>
        </div>
      </div>
    </motion.a>
  );
}
