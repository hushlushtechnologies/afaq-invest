import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it } from 'vitest';
import { hasPermission, SYSTEM_ROLES, type PermissionKey, type SystemRoleKey } from '@afaq/types';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator.js';
import { InvestorsController } from './investors.controller.js';

/**
 * Which permission each investor route needs, and who holds it.
 *
 * Written down as decisions rather than left as decorators to be read. The
 * route that closes somebody's account quietly moving from .delete to .edit
 * would let anyone who can fix a phone number end a customer relationship;
 * this file makes that change fail until somebody decides it on purpose.
 */

const VERBS: Record<number, string> = { 0: 'GET', 1: 'POST', 2: 'PUT', 3: 'DELETE', 4: 'PATCH' };

function routes(): Record<string, string[]> {
  const prototype = InvestorsController.prototype as unknown as Record<string, unknown>;
  const found: Record<string, string[]> = {};

  for (const name of Object.getOwnPropertyNames(prototype)) {
    const handler = prototype[name];
    if (name === 'constructor' || typeof handler !== 'function') continue;

    const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
    if (path === undefined) continue;

    const verb = VERBS[Reflect.getMetadata(METHOD_METADATA, handler) as number];
    found[`${verb} ${path}`] = (Reflect.getMetadata(PERMISSIONS_KEY, handler) as string[]) ?? [];
  }

  return found;
}

describe('the investor routes', () => {
  it('each need exactly the permission decided for them', () => {
    expect(routes()).toEqual({
      'GET /': ['investor.view'],
      'GET summary': ['investor.view'],
      'GET :id': ['investor.view'],
      // Bringing somebody in, and reminding them.
      'POST /': ['investor.create'],
      'POST :id/resend-invitation': ['investor.create'],
      // Housekeeping, and the reversible block.
      'PATCH :id': ['investor.edit'],
      'POST :id/suspend': ['investor.edit'],
      'POST :id/reinstate': ['investor.edit'],
      // The two ways a relationship ends.
      'POST :id/close': ['investor.delete'],
      'DELETE :id': ['investor.delete'],
    });
  });
});

function holders(permission: PermissionKey): SystemRoleKey[] {
  return SYSTEM_ROLES.filter((role) =>
    hasPermission({ roleKeys: [role.key], permissionKeys: role.permissions }, permission),
  ).map((role) => role.key);
}

describe('who may act on investors', () => {
  it('lets the Auditor read but change nothing', () => {
    expect(holders('investor.view')).toContain('AUDITOR');

    for (const write of ['investor.create', 'investor.edit', 'investor.delete'] as const) {
      expect(holders(write), write).not.toContain('AUDITOR');
    }
  });

  /**
   * Recorded as it stands. Closing an account ends a customer relationship
   * and cannot be undone, so it stays with the Super Admin until the business
   * decides otherwise — changing it means changing this line on purpose.
   */
  it('keeps closing an account to the Super Admin', () => {
    expect(holders('investor.delete')).toEqual(['SUPER_ADMIN']);
  });
});
