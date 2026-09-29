import {
  PERMISSIONS,
  SYSTEM_ROLES,
  hasPermission,
  type PermissionKey,
  type SystemRoleKey,
} from '@afaq/types';
import { describe, expect, it } from 'vitest';

/**
 * The company permissions, and who holds them.
 *
 * These are decisions, not implementation details: which role may certify an
 * outside company is a separation-of-duties question, and the kind of thing
 * that gets quietly widened later by someone adding a key to a list to unblock
 * themselves. Writing them down here means that change has to be deliberate.
 *
 * Only @afaq/types is imported, so this runs without a database.
 */

const COMPANY_KEYS = [
  'company.view',
  'company.create',
  'company.edit',
  'company.manage',
  'company.verify',
  'company.delete',
] as const;

function permissionsOf(roleKey: SystemRoleKey): readonly PermissionKey[] {
  const role = SYSTEM_ROLES.find((candidate) => candidate.key === roleKey);
  if (!role) throw new Error(`No such system role: ${roleKey}`);
  return role.permissions;
}

/** Who ends up holding a permission, Super Admin's override included. */
function rolesHolding(permission: PermissionKey): SystemRoleKey[] {
  return SYSTEM_ROLES.filter((role) =>
    hasPermission({ roleKeys: [role.key], permissionKeys: role.permissions }, permission),
  ).map((role) => role.key);
}

describe('the company permission catalogue', () => {
  it.each(COMPANY_KEYS)('%s exists', (key) => {
    expect(PERMISSIONS.map((permission) => permission.key)).toContain(key);
  });

  it('files every company permission under the COMPANY resource', () => {
    const companyPermissions = PERMISSIONS.filter((permission) =>
      permission.key.startsWith('company.'),
    );

    expect(companyPermissions).toHaveLength(COMPANY_KEYS.length);
    for (const permission of companyPermissions) {
      expect(permission.resource, permission.key).toBe('COMPANY');
    }
  });

  it('describes each one in words an administrator can act on', () => {
    for (const permission of PERMISSIONS.filter((p) => p.key.startsWith('company.'))) {
      // The permissions matrix shows these to whoever is assigning a role. A
      // stub like "company verify" tells them nothing.
      expect(permission.description.length, permission.key).toBeGreaterThan(10);
    }
  });
});

describe('who may run companies', () => {
  it('gives the Investment Manager the day-to-day work', () => {
    const held = permissionsOf('INVESTMENT_MANAGER');

    expect(held).toContain('company.view');
    expect(held).toContain('company.create');
    expect(held).toContain('company.edit');
    expect(held).toContain('company.manage');
  });

  /**
   * The separation of duties, and the reason this file exists.
   *
   * The Investment Manager onboards outside companies. If they could also mark
   * one as verified, the check would be theirs to grant themselves, which is
   * not a check at all. Verification sits with Compliance.
   */
  it('keeps verification away from whoever onboards the company', () => {
    expect(permissionsOf('INVESTMENT_MANAGER')).not.toContain('company.verify');
  });

  it('gives Compliance verification, and something to verify', () => {
    const held = permissionsOf('COMPLIANCE_MANAGER');

    expect(held).toContain('company.verify');
    // Without view there is no screen on which to do it.
    expect(held).toContain('company.view');
  });

  it('does not let Compliance edit or create companies', () => {
    const held = permissionsOf('COMPLIANCE_MANAGER');

    expect(held).not.toContain('company.create');
    expect(held).not.toContain('company.edit');
    expect(held).not.toContain('company.manage');
  });

  it('leaves the Auditor reading only', () => {
    const held = permissionsOf('AUDITOR');

    expect(held).toContain('company.view');
    for (const key of [
      'company.create',
      'company.edit',
      'company.manage',
      'company.verify',
      'company.delete',
    ] as const) {
      expect(held, key).not.toContain(key);
    }
  });

  /**
   * Deleting a company destroys the history of every investment ever made in
   * it. No system role carries it: the permission exists so the API can guard
   * the route, and only a Super Admin reaches it, through the central override.
   */
  it('grants company.delete to no role but Super Admin', () => {
    expect(rolesHolding('company.delete')).toEqual(['SUPER_ADMIN']);
  });

  it('lets Super Admin do all of it without storing a single row', () => {
    const superAdmin = SYSTEM_ROLES.find((role) => role.key === 'SUPER_ADMIN');

    expect(superAdmin?.permissions).toEqual([]);
    for (const key of COMPANY_KEYS) {
      expect(hasPermission({ roleKeys: ['SUPER_ADMIN'], permissionKeys: [] }, key), key).toBe(true);
    }
  });

  it('refuses a role that holds nothing', () => {
    for (const key of COMPANY_KEYS) {
      expect(hasPermission({ roleKeys: ['SUPPORT'], permissionKeys: [] }, key), key).toBe(false);
    }
  });
});
