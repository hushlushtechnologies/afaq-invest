/**
 * Roles and permissions, in one place.
 *
 * This file is the single source of truth shared by the database seed, the
 * API's authorization guards and the frontend's permission-aware UI. It has no
 * dependencies, so every side can import it.
 *
 * The string values match the Prisma enums exactly.
 */

// ===========================================================================
// RESOURCES AND ACTIONS
// ===========================================================================

export const PERMISSION_RESOURCES = [
  'DASHBOARD',
  'INVESTOR',
  'KYC',
  'COMPANY',
  'PARTNER',
  'OPPORTUNITY',
  'INVESTMENT_RULE',
  'INVESTMENT_REQUEST',
  'FINANCE',
  'DOCUMENT',
  'REPORT',
  'STAFF',
  'ROLE',
  'PERMISSION',
  'SETTINGS',
  'AUDIT',
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export const PERMISSION_ACTIONS = [
  'VIEW',
  'CREATE',
  'EDIT',
  'DELETE',
  'APPROVE',
  'REJECT',
  'VERIFY',
  'MANAGE',
  'EXPORT',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

// ===========================================================================
// THE PERMISSION CATALOGUE
// ===========================================================================

export interface PermissionDefinition {
  /** The dotted key used everywhere, e.g. "staff.create". */
  key: string;
  resource: PermissionResource;
  action: PermissionAction;
  description: string;
}

/**
 * Every permission the platform recognises. Each one corresponds to a real
 * screen or action — there are deliberately no speculative entries.
 *
 * Adding one here and re-running the seed is all it takes; removing one
 * requires a migration step, because roles may still reference it.
 */
export const PERMISSIONS = [
  // --- dashboard
  {
    key: 'dashboard.view',
    resource: 'DASHBOARD',
    action: 'VIEW',
    description: 'See the admin dashboard',
  },

  // --- investors
  {
    key: 'investor.view',
    resource: 'INVESTOR',
    action: 'VIEW',
    description: 'See investor records',
  },
  { key: 'investor.create', resource: 'INVESTOR', action: 'CREATE', description: 'Add investors' },
  {
    key: 'investor.edit',
    resource: 'INVESTOR',
    action: 'EDIT',
    description: 'Change investor records',
  },
  {
    key: 'investor.delete',
    resource: 'INVESTOR',
    action: 'DELETE',
    description: 'Remove investor records',
  },
  {
    key: 'investor.export',
    resource: 'INVESTOR',
    action: 'EXPORT',
    description: 'Export investor data',
  },

  // --- KYC and verification
  { key: 'kyc.view', resource: 'KYC', action: 'VIEW', description: 'See KYC submissions' },
  { key: 'kyc.verify', resource: 'KYC', action: 'VERIFY', description: 'Check KYC documents' },
  {
    key: 'kyc.approve',
    resource: 'KYC',
    action: 'APPROVE',
    description: 'Approve KYC submissions',
  },
  { key: 'kyc.reject', resource: 'KYC', action: 'REJECT', description: 'Reject KYC submissions' },

  // --- companies
  { key: 'company.view', resource: 'COMPANY', action: 'VIEW', description: 'See companies' },
  { key: 'company.create', resource: 'COMPANY', action: 'CREATE', description: 'Add companies' },
  { key: 'company.edit', resource: 'COMPANY', action: 'EDIT', description: 'Change companies' },
  {
    // One permission rather than separate activate / disable / feature /
    // reorder ones: they are the same job — deciding how an existing company
    // appears and whether it trades. Nobody sensibly features a company but
    // may not deactivate it.
    key: 'company.manage',
    resource: 'COMPANY',
    action: 'MANAGE',
    description: 'Activate, disable, feature and reorder companies',
  },
  {
    // Separate from company.edit on purpose. Editing is housekeeping; this is
    // a compliance decision that says an outside company has been checked and
    // may take investors' money. Whoever onboards a partner should not also be
    // the one who certifies them — a control the same person can grant
    // themselves is not a control.
    key: 'company.verify',
    resource: 'COMPANY',
    action: 'VERIFY',
    description: 'Confirm an outside company has passed its checks',
  },
  { key: 'company.delete', resource: 'COMPANY', action: 'DELETE', description: 'Remove companies' },

  // --- partners
  { key: 'partner.view', resource: 'PARTNER', action: 'VIEW', description: 'See partners' },
  { key: 'partner.create', resource: 'PARTNER', action: 'CREATE', description: 'Add partners' },
  { key: 'partner.edit', resource: 'PARTNER', action: 'EDIT', description: 'Change partners' },
  { key: 'partner.delete', resource: 'PARTNER', action: 'DELETE', description: 'Remove partners' },

  // --- investment opportunities
  {
    key: 'opportunity.view',
    resource: 'OPPORTUNITY',
    action: 'VIEW',
    description: 'See opportunities',
  },
  {
    key: 'opportunity.create',
    resource: 'OPPORTUNITY',
    action: 'CREATE',
    description: 'Create opportunities',
  },
  {
    key: 'opportunity.edit',
    resource: 'OPPORTUNITY',
    action: 'EDIT',
    description: 'Change opportunities',
  },
  {
    key: 'opportunity.delete',
    resource: 'OPPORTUNITY',
    action: 'DELETE',
    description: 'Remove opportunities',
  },
  {
    key: 'opportunity.approve',
    resource: 'OPPORTUNITY',
    action: 'APPROVE',
    description: 'Publish opportunities to investors',
  },

  // --- investment rules (ROI and tiers)
  {
    key: 'investment_rule.view',
    resource: 'INVESTMENT_RULE',
    action: 'VIEW',
    description: 'See return and tier rules',
  },
  {
    key: 'investment_rule.manage',
    resource: 'INVESTMENT_RULE',
    action: 'MANAGE',
    description: 'Set return and tier rules',
  },

  // --- investment requests
  {
    key: 'investment_request.view',
    resource: 'INVESTMENT_REQUEST',
    action: 'VIEW',
    description: 'See investment requests',
  },
  {
    key: 'investment_request.approve',
    resource: 'INVESTMENT_REQUEST',
    action: 'APPROVE',
    description: 'Approve investment requests',
  },
  {
    key: 'investment_request.reject',
    resource: 'INVESTMENT_REQUEST',
    action: 'REJECT',
    description: 'Reject investment requests',
  },

  // --- finance
  {
    key: 'finance.view',
    resource: 'FINANCE',
    action: 'VIEW',
    description: 'See payments, ledger and distributions',
  },
  {
    key: 'finance.manage',
    resource: 'FINANCE',
    action: 'MANAGE',
    description: 'Record and change financial entries',
  },
  {
    key: 'finance.approve',
    resource: 'FINANCE',
    action: 'APPROVE',
    description: 'Approve payments and distributions',
  },
  {
    key: 'finance.export',
    resource: 'FINANCE',
    action: 'EXPORT',
    description: 'Export financial data',
  },

  // --- documents
  { key: 'document.view', resource: 'DOCUMENT', action: 'VIEW', description: 'See documents' },
  {
    key: 'document.create',
    resource: 'DOCUMENT',
    action: 'CREATE',
    description: 'Upload documents',
  },
  {
    key: 'document.delete',
    resource: 'DOCUMENT',
    action: 'DELETE',
    description: 'Remove documents',
  },
  {
    key: 'document.verify',
    resource: 'DOCUMENT',
    action: 'VERIFY',
    description: 'Mark documents as checked',
  },

  // --- reports
  { key: 'report.view', resource: 'REPORT', action: 'VIEW', description: 'See reports' },
  { key: 'report.export', resource: 'REPORT', action: 'EXPORT', description: 'Export reports' },

  // --- staff
  { key: 'staff.view', resource: 'STAFF', action: 'VIEW', description: 'See staff members' },
  {
    key: 'staff.create',
    resource: 'STAFF',
    action: 'CREATE',
    description: 'Invite staff members',
  },
  { key: 'staff.edit', resource: 'STAFF', action: 'EDIT', description: 'Change staff details' },
  {
    key: 'staff.delete',
    resource: 'STAFF',
    action: 'DELETE',
    description: 'Disable staff members',
  },
  {
    key: 'staff.manage',
    resource: 'STAFF',
    action: 'MANAGE',
    description: 'Assign roles and change status',
  },

  // --- roles
  { key: 'role.view', resource: 'ROLE', action: 'VIEW', description: 'See roles' },
  { key: 'role.create', resource: 'ROLE', action: 'CREATE', description: 'Create custom roles' },
  { key: 'role.edit', resource: 'ROLE', action: 'EDIT', description: 'Change roles' },
  { key: 'role.delete', resource: 'ROLE', action: 'DELETE', description: 'Remove custom roles' },

  // --- permissions
  {
    key: 'permission.view',
    resource: 'PERMISSION',
    action: 'VIEW',
    description: 'See the permission catalogue',
  },
  {
    key: 'permission.manage',
    resource: 'PERMISSION',
    action: 'MANAGE',
    description: 'Change which permissions a role carries',
  },

  // --- settings
  {
    key: 'settings.view',
    resource: 'SETTINGS',
    action: 'VIEW',
    description: 'See organisation settings',
  },
  {
    key: 'settings.manage',
    resource: 'SETTINGS',
    action: 'MANAGE',
    description: 'Change organisation settings',
  },

  // --- audit
  { key: 'audit.view', resource: 'AUDIT', action: 'VIEW', description: 'See the audit trail' },
  {
    key: 'audit.export',
    resource: 'AUDIT',
    action: 'EXPORT',
    description: 'Export audit records',
  },
] as const satisfies readonly PermissionDefinition[];

/**
 * Every permission key as a union type. `can('staff.edit')` is checked when
 * the code is compiled, so a typo fails the build instead of quietly
 * denying access forever.
 */
export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

export const PERMISSION_KEYS: readonly PermissionKey[] = PERMISSIONS.map((item) => item.key);

// ===========================================================================
// SYSTEM ROLES
// ===========================================================================

export const SYSTEM_ROLE_KEYS = [
  'SUPER_ADMIN',
  'INVESTMENT_MANAGER',
  'COMPLIANCE_MANAGER',
  'COMPLIANCE_OFFICER',
  'FINANCE_MANAGER',
  'FINANCE_OFFICER',
  'SUPPORT',
  'AUDITOR',
] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

/**
 * The one place Super Admin is special.
 *
 * Authorization asks `hasPermission()`, which grants everything to this role.
 * Nowhere else in the codebase should compare against a role name.
 */
export const SUPER_ADMIN_ROLE_KEY: SystemRoleKey = 'SUPER_ADMIN';

export interface SystemRoleDefinition {
  key: SystemRoleKey;
  name: string;
  description: string;
  /**
   * The permissions this role carries. Super Admin's list is empty because it
   * is granted everything by the central override rather than by stored rows —
   * so a permission added later needs no re-seed to reach it.
   */
  permissions: readonly PermissionKey[];
}

export const SYSTEM_ROLES = [
  {
    key: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full access to everything, including staff, roles and settings.',
    permissions: [],
  },
  {
    key: 'INVESTMENT_MANAGER',
    name: 'Investment Manager',
    description: 'Runs companies, partners and investment opportunities.',
    permissions: [
      'dashboard.view',
      'investor.view',
      'investor.create',
      'investor.edit',
      'company.view',
      'company.create',
      'company.edit',
      'company.manage',
      // Deliberately not company.verify: see that permission's note. This role
      // onboards outside companies, so it must not also be the role that
      // certifies them as checked.
      'partner.view',
      'partner.create',
      'partner.edit',
      'opportunity.view',
      'opportunity.create',
      'opportunity.edit',
      'opportunity.approve',
      'investment_rule.view',
      'investment_rule.manage',
      'investment_request.view',
      'investment_request.approve',
      'investment_request.reject',
      'document.view',
      'document.create',
      'report.view',
      'report.export',
    ],
  },
  {
    key: 'COMPLIANCE_MANAGER',
    name: 'Compliance Manager',
    description: 'Owns KYC, verification and the audit trail.',
    permissions: [
      'dashboard.view',
      'investor.view',
      'investor.edit',
      // Verifying an outside company belongs here rather than with whoever
      // onboarded it. Needs company.view too, or there is nothing to act on.
      'company.view',
      'company.verify',
      'kyc.view',
      'kyc.verify',
      'kyc.approve',
      'kyc.reject',
      'document.view',
      'document.create',
      'document.verify',
      'report.view',
      'report.export',
      'audit.view',
      'audit.export',
    ],
  },
  {
    key: 'COMPLIANCE_OFFICER',
    name: 'Compliance Officer',
    description: 'Checks KYC submissions and documents, without final approval.',
    permissions: [
      'dashboard.view',
      'investor.view',
      'kyc.view',
      'kyc.verify',
      'document.view',
      'document.create',
      'report.view',
    ],
  },
  {
    key: 'FINANCE_MANAGER',
    name: 'Finance Manager',
    description: 'Owns payments, the ledger and distributions.',
    permissions: [
      'dashboard.view',
      'investor.view',
      'finance.view',
      'finance.manage',
      'finance.approve',
      'finance.export',
      'document.view',
      'document.create',
      'report.view',
      'report.export',
    ],
  },
  {
    key: 'FINANCE_OFFICER',
    name: 'Finance Officer',
    description: 'Records financial entries; approval stays with the manager.',
    permissions: [
      'dashboard.view',
      'investor.view',
      'finance.view',
      'finance.manage',
      'document.view',
      'report.view',
    ],
  },
  {
    key: 'SUPPORT',
    name: 'Support',
    description: 'Answers investor questions with read-only access.',
    permissions: ['dashboard.view', 'investor.view', 'kyc.view', 'document.view', 'report.view'],
  },
  {
    key: 'AUDITOR',
    name: 'Auditor',
    description: 'Reads and exports everything; changes nothing.',
    permissions: [
      'dashboard.view',
      'investor.view',
      'investor.export',
      'kyc.view',
      'company.view',
      'partner.view',
      'opportunity.view',
      'investment_rule.view',
      'investment_request.view',
      'finance.view',
      'finance.export',
      'document.view',
      'report.view',
      'report.export',
      'staff.view',
      'role.view',
      'permission.view',
      'settings.view',
      'audit.view',
      'audit.export',
    ],
  },
] as const satisfies readonly SystemRoleDefinition[];

// ===========================================================================
// THE AUTHORIZATION DECISION
// ===========================================================================

/** What the API and the frontend both need in order to decide access. */
export interface PermissionContext {
  roleKeys: readonly string[];
  permissionKeys: readonly string[];
}

/**
 * The only place an access decision is made.
 *
 * Super Admin passes everything — that override lives here and nowhere else,
 * so there is never an `if (role === 'SUPER_ADMIN')` scattered through the
 * codebase. The API uses this for enforcement; the frontend uses the same
 * function to decide what to show.
 */
export function hasPermission(context: PermissionContext, permission: PermissionKey): boolean {
  if (context.roleKeys.includes(SUPER_ADMIN_ROLE_KEY)) return true;
  return context.permissionKeys.includes(permission);
}

/** True when the person holds every one of these permissions. */
export function hasAllPermissions(
  context: PermissionContext,
  permissions: readonly PermissionKey[],
): boolean {
  return permissions.every((permission) => hasPermission(context, permission));
}

/** True when the person holds at least one of these permissions. */
export function hasAnyPermission(
  context: PermissionContext,
  permissions: readonly PermissionKey[],
): boolean {
  return permissions.some((permission) => hasPermission(context, permission));
}

export function isSuperAdmin(context: PermissionContext): boolean {
  return context.roleKeys.includes(SUPER_ADMIN_ROLE_KEY);
}

// ===========================================================================
// STAFF STATUS
// ===========================================================================

export const STAFF_STATUSES = ['INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED'] as const;

export type StaffStatus = (typeof STAFF_STATUSES)[number];

/** Only ACTIVE staff may use the Admin Portal. Enforced by the API. */
export function canSignIn(status: StaffStatus): boolean {
  return status === 'ACTIVE';
}
