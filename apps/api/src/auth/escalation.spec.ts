import { describe, expect, it } from 'vitest';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  PERMISSION_KEYS,
  SUPER_ADMIN_ROLE_KEY,
} from '@afaq/types';
import type { StaffContext } from './staff-context.types.js';

/**
 * The ways somebody might try to gain access they were not given.
 *
 * These are written as attacks rather than as features, because that is how
 * they arrive. Each one names what an attacker would be attempting.
 */
function staff(overrides: Partial<StaffContext> = {}): StaffContext {
  return {
    staffUserId: 'a1',
    authUserId: 'b1',
    email: 'someone@afaq.ae',
    fullName: 'Someone',
    status: 'ACTIVE',
    roleKeys: ['SUPPORT'],
    permissionKeys: ['dashboard.view'],
    isSuperAdmin: false,
    ...overrides,
  };
}

describe('privilege escalation', () => {
  it('does not trust a forged isSuperAdmin flag', () => {
    // The decision is made from roleKeys, so a context claiming to be a Super
    // Admin without the role gains nothing.
    const pretender = staff({ isSuperAdmin: true });

    expect(hasPermission(pretender, 'staff.delete')).toBe(false);
  });

  it('grants everything to a real Super Admin, including permissions nobody stored', () => {
    const real = staff({ roleKeys: [SUPER_ADMIN_ROLE_KEY], permissionKeys: [] });

    for (const permission of PERMISSION_KEYS) {
      expect(hasPermission(real, permission)).toBe(true);
    }
  });

  it('refuses an empty permission list rather than treating it as "no requirement"', () => {
    // A guard that let an empty list through would open every endpoint whose
    // decorator was written wrong.
    expect(hasAnyPermission(staff(), [])).toBe(false);
  });

  it('requires every permission when several are demanded', () => {
    const partial = staff({ permissionKeys: ['staff.view'] });

    expect(hasAllPermissions(partial, ['staff.view', 'staff.manage'])).toBe(false);
  });

  it('gives nothing to somebody with no roles at all', () => {
    const nobody = staff({ roleKeys: [], permissionKeys: [] });

    for (const permission of PERMISSION_KEYS) {
      expect(hasPermission(nobody, permission)).toBe(false);
    }
  });

  it('does not match permissions by prefix', () => {
    // "staff.view" must never satisfy "staff.view_salary" or vice versa.
    const viewer = staff({ permissionKeys: ['staff.view'] });

    expect(hasPermission(viewer, 'staff.edit')).toBe(false);
    expect(hasPermission(viewer, 'staff.manage')).toBe(false);
  });

  it('is unaffected by the order permissions were granted in', () => {
    const forwards = staff({ permissionKeys: ['staff.view', 'role.view'] });
    const backwards = staff({ permissionKeys: ['role.view', 'staff.view'] });

    expect(hasAllPermissions(forwards, ['role.view', 'staff.view'])).toBe(
      hasAllPermissions(backwards, ['staff.view', 'role.view']),
    );
  });
});

describe('status is enforced separately from permissions', () => {
  it.each(['INVITED', 'SUSPENDED', 'DISABLED'] as const)(
    'a %s account can still hold permissions — the status check is what stops them',
    (status) => {
      // Worth pinning: permissions and status answer different questions, and
      // conflating them would mean a suspended Super Admin either keeps
      // everything or loses their roles.
      const suspended = staff({
        status,
        roleKeys: [SUPER_ADMIN_ROLE_KEY],
      });

      expect(hasPermission(suspended, 'staff.delete')).toBe(true);
    },
  );
});
