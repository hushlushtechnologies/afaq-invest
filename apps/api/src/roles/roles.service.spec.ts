import { NotFoundException } from '@nestjs/common';
import { PERMISSION_KEYS } from '@afaq/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesService } from './roles.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const ROLE_ID = '55555555-5555-4555-8555-555555555555';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: ROLE_ID,
    key: 'FINANCE_OFFICER',
    name: 'Finance Officer',
    description: 'Handles day-to-day finance',
    isSystem: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-02-01T00:00:00Z'),
    permissions: [
      { permission: { key: 'finance.view' } },
      { permission: { key: 'finance.create' } },
    ],
    _count: { staff: 3 },
    ...overrides,
  };
}

function makeService(rows: unknown[] | null) {
  const findMany = vi.fn().mockResolvedValue(rows ?? []);
  const findUnique = vi.fn().mockResolvedValue(rows === null ? null : rows[0]);
  // The service reaches the tables through `prisma.db`, never `prisma` itself.
  // The stub has to mirror that: a bare { role: … } leaves `prisma.db`
  // undefined and every call dies on "Cannot read properties of undefined".
  // The `as unknown as` cast is what let that ship — it silences exactly the
  // type error that would have caught it, so keep the shape honest by hand.
  const prisma = { db: { role: { findMany, findUnique } } } as unknown as PrismaService;
  return { service: new RolesService(prisma), findMany };
}

describe('RolesService.list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports permission and staff counts', async () => {
    const { service } = makeService([row()]);

    const [role] = await service.list();

    expect(role).toMatchObject({
      key: 'FINANCE_OFFICER',
      isSystem: true,
      isSuperAdmin: false,
      permissionCount: 2,
      staffCount: 3,
    });
  });

  it('returns ISO date strings, not Date objects', async () => {
    const { service } = makeService([row()]);

    const [role] = await service.list();

    expect(role.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('reports Super Admin as carrying every permission', async () => {
    // It stores no rows — everything comes from the central override — so a
    // stored count would read as zero on the most powerful role there is.
    const { service } = makeService([
      row({ key: 'SUPER_ADMIN', name: 'Super Admin', permissions: [] }),
    ]);

    const [role] = await service.list();

    expect(role.isSuperAdmin).toBe(true);
    expect(role.permissionCount).toBe(PERMISSION_KEYS.length);
  });

  it('lists system roles before custom ones', async () => {
    const { service, findMany } = makeService([row()]);

    await service.list();

    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([{ isSystem: 'desc' }, { name: 'asc' }]);
  });
});

describe('RolesService.findOne', () => {
  beforeEach(() => vi.clearAllMocks());

  it('includes the permission keys', async () => {
    const { service } = makeService([row()]);

    const role = await service.findOne(ROLE_ID);

    expect(role.permissionKeys).toEqual(['finance.view', 'finance.create']);
  });

  it('expands Super Admin to the full catalogue', async () => {
    const { service } = makeService([row({ key: 'SUPER_ADMIN', permissions: [] })]);

    const role = await service.findOne(ROLE_ID);

    expect(role.permissionKeys).toHaveLength(PERMISSION_KEYS.length);
  });

  it('reports a missing role as not found', async () => {
    const { service } = makeService(null);

    await expect(service.findOne(ROLE_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RolesService.catalogue', () => {
  it('groups every permission by resource, with none lost or duplicated', () => {
    const { service } = makeService([]);

    const groups = service.catalogue();
    const keys = groups.flatMap((group) => group.permissions.map((p) => p.key));

    expect(keys).toHaveLength(PERMISSION_KEYS.length);
    expect(new Set(keys).size).toBe(PERMISSION_KEYS.length);
  });

  it('leaves out resources that have no permissions', () => {
    const { service } = makeService([]);

    expect(service.catalogue().every((group) => group.permissions.length > 0)).toBe(true);
  });

  it('keeps each permission in its own resource group', () => {
    const { service } = makeService([]);

    for (const group of service.catalogue()) {
      expect(group.permissions.every((p) => p.resource === group.resource)).toBe(true);
    }
  });
});
