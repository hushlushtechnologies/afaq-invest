import type { PermissionKey } from '@afaq/types';
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
  permissions?: readonly PermissionKey[];
}

export const MODULE_TABS: Partial<Record<NavModule['key'], readonly ModuleSection[]>> = {
  administration: [
    { key: 'staff', href: '/administration/staff', permissions: ['staff.view'] },
    { key: 'roles', href: '/administration/roles', permissions: ['role.view'] },
    { key: 'audit', href: '/administration/audit', permissions: ['audit.view'] },
  ],
  investors: [
    { key: 'all', href: '/investors/all', permissions: ['investor.view'] },
    { key: 'kyc', href: '/investors/kyc', permissions: ['kyc.view'] },
    { key: 'compliance', href: '/investors/compliance', permissions: ['kyc.view'] },
  ],
  investments: [
    // Opportunities arrive in a later phase. Rules is the only section that
    // exists, and a one-tab strip is still worth having: it is where the
    // second tab will appear, and the module reads the same as every other.
    { key: 'rules', href: '/investments/rules', permissions: ['investment_rule.view'] },
  ],
  finance: [
    { key: 'payments', href: '/finance/payments', permissions: ['finance.view'] },
    { key: 'ledger', href: '/finance/ledger', permissions: ['finance.view'] },
    {
      key: 'distributions',
      href: '/finance/distributions',
      permissions: ['finance.view'],
    },
    {
      key: 'reconciliation',
      href: '/finance/reconciliation',
      // Reconciliation is a controller's job, not a viewer's.
      permissions: ['finance.manage'],
    },
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
