import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it } from 'vitest';
import { hasPermission, SYSTEM_ROLES, type PermissionKey, type SystemRoleKey } from '@afaq/types';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator.js';
import { OpportunitiesController } from './opportunities.controller.js';

/**
 * Which permission each opportunity route needs, and who holds it.
 *
 * Written down as decisions rather than left as decorators to be read. A
 * route that opens a raise to investors quietly moving from .approve to .edit
 * would let anyone who can fix a typo publish an offer; this file makes that
 * change fail until somebody decides it on purpose.
 */

const VERBS: Record<number, string> = { 0: 'GET', 1: 'POST', 2: 'PUT', 3: 'DELETE', 4: 'PATCH' };

function routes(): Record<string, string[]> {
  const prototype = OpportunitiesController.prototype as unknown as Record<string, unknown>;
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

describe('the opportunity routes', () => {
  it('each need exactly the permission decided for them', () => {
    expect(routes()).toEqual({
      'GET /': ['opportunity.view'],
      'GET summary': ['opportunity.view'],
      'GET by-slug/:slug': ['opportunity.view'],
      'GET :id': ['opportunity.view'],
      'POST /': ['opportunity.create'],
      'PATCH :id': ['opportunity.edit'],
      // Everything that decides whether investors can see or enter a raise.
      'POST :id/open': ['opportunity.approve'],
      'POST :id/suspend': ['opportunity.approve'],
      'POST :id/resume': ['opportunity.approve'],
      'POST :id/close': ['opportunity.approve'],
      'POST :id/cancel': ['opportunity.approve'],
      'DELETE :id': ['opportunity.delete'],
    });
  });
});

function holders(permission: PermissionKey): SystemRoleKey[] {
  return SYSTEM_ROLES.filter((role) =>
    hasPermission({ roleKeys: [role.key], permissionKeys: role.permissions }, permission),
  ).map((role) => role.key);
}

describe('who may act on opportunities', () => {
  it('lets the Auditor read but change nothing', () => {
    expect(holders('opportunity.view')).toContain('AUDITOR');

    for (const write of [
      'opportunity.create',
      'opportunity.edit',
      'opportunity.approve',
      'opportunity.delete',
    ] as const) {
      expect(holders(write), write).not.toContain('AUDITOR');
    }
  });

  /**
   * Recorded as it stands, not as a recommendation. Today the Investment
   * Manager can both draft a raise and open it to investors, so one person
   * can take an opportunity from nothing to live. Company verification was
   * deliberately split from that role; whether opening a raise should be too
   * is a business decision, raised with the owner in Phase 20. Changing it
   * means changing this line on purpose.
   */
  it('lets the same role draft and open a raise, for now', () => {
    expect(holders('opportunity.create')).toEqual(['SUPER_ADMIN', 'INVESTMENT_MANAGER']);
    expect(holders('opportunity.approve')).toEqual(['SUPER_ADMIN', 'INVESTMENT_MANAGER']);
  });

  it('keeps deleting a draft to the Super Admin', () => {
    expect(holders('opportunity.delete')).toEqual(['SUPER_ADMIN']);
  });
});
