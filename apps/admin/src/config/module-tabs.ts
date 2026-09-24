import type { NavModule } from './navigation';

/**
 * Sections inside a module. Each one is its own address — /finance/ledger —
 * so it can be bookmarked, shared, and reached with the back button.
 *
 * The keys are translated under `moduleTabs.<module>.<section>`.
 */
export interface ModuleSection {
  key: string;
  /** Full path, without the language prefix. */
  href: string;
}

export const MODULE_TABS: Partial<Record<NavModule['key'], readonly ModuleSection[]>> = {
  investors: [
    { key: 'all', href: '/investors/all' },
    { key: 'kyc', href: '/investors/kyc' },
    { key: 'compliance', href: '/investors/compliance' },
  ],
  finance: [
    { key: 'payments', href: '/finance/payments' },
    { key: 'ledger', href: '/finance/ledger' },
    { key: 'distributions', href: '/finance/distributions' },
    { key: 'reconciliation', href: '/finance/reconciliation' },
  ],
};

export function sectionsFor(moduleKey: NavModule['key']): readonly ModuleSection[] {
  return MODULE_TABS[moduleKey] ?? [];
}

/** The section a path belongs to, e.g. /finance/ledger/42 → /finance/ledger. */
export function findActiveSection(
  moduleKey: NavModule['key'],
  pathname: string,
): ModuleSection | undefined {
  return sectionsFor(moduleKey).find(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  );
}
