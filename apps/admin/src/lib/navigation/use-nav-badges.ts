'use client';

import type { NavModule } from '@/config/navigation';

export type NavBadges = Partial<Record<NavModule['key'], number>>;

/**
 * PLACEHOLDER — the counts of items waiting for attention beside each module.
 *
 * These are fixed sample numbers. When the modules are built, this hook will
 * fetch real counts with TanStack Query (one small request, refreshed in the
 * background) and everything that shows a badge will update with no other
 * change. Zero or missing means no badge.
 */
export function useNavBadges(): NavBadges {
  return {
    investors: 7,
    compliance: 3,
    documents: 2,
    support: 5,
  };
}
