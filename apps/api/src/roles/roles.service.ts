import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PERMISSIONS,
  PERMISSION_KEYS,
  PERMISSION_RESOURCES,
  SUPER_ADMIN_ROLE_KEY,
  type PermissionGroup,
  type PermissionKey,
  type PermissionListItem,
  type RoleDetail,
  type RoleListItem,
} from '@afaq/types';
import { PrismaService } from '../prisma/prisma.service.js';

/** The database shape this service reads, written out rather than inferred. */
interface RoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{ permission: { key: string } }>;
  _count: { staff: number };
}

/**
 * Reading roles and the permission catalogue.
 *
 * Roles come from the database rather than the catalogue in rbac.ts, because
 * the two can legitimately differ: a system role's stored permissions lag its
 * definition until the seed is re-run, and custom roles have no definition.
 * Showing the definition would mean showing something that is not true.
 */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every role, with how many permissions and people it carries.
   *
   * Not paged: the list is the eight system roles plus however many custom
   * ones an organisation writes, which is a screenful, not a dataset.
   */
  async list(): Promise<RoleListItem[]> {
    const rows: RoleRow[] = await this.prisma.db.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: ROLE_SELECT,
    });

    return rows.map(toListItem);
  }

  async findOne(id: string): Promise<RoleDetail> {
    const row: RoleRow | null = await this.prisma.db.role.findUnique({
      where: { id },
      select: ROLE_SELECT,
    });

    if (!row) {
      throw new NotFoundException({ message: 'That role no longer exists.' });
    }

    return {
      ...toListItem(row),
      permissionKeys: permissionsOf(row),
    };
  }

  /**
   * The permission catalogue, grouped by resource.
   *
   * Served from the shared constant rather than the permission table: they
   * are seeded from the same source, and reading the constant means the
   * screen cannot show a permission the code does not recognise.
   */
  catalogue(): PermissionGroup[] {
    return PERMISSION_RESOURCES.map((resource) => ({
      resource,
      permissions: PERMISSIONS.filter(
        (permission) => permission.resource === resource,
      ) as unknown as PermissionListItem[],
    })).filter((group) => group.permissions.length > 0);
  }
}

const ROLE_SELECT = {
  id: true,
  key: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  permissions: { select: { permission: { select: { key: true } } } },
  _count: { select: { staff: true } },
} as const;

/**
 * What a role actually grants.
 *
 * Super Admin stores no rows — it is granted everything by the central
 * override — so reporting its stored count would read as "no permissions" on
 * the most powerful role in the system.
 */
function permissionsOf(row: RoleRow): PermissionKey[] {
  if (row.key === SUPER_ADMIN_ROLE_KEY) return [...PERMISSION_KEYS];

  return row.permissions.map((link) => link.permission.key as PermissionKey);
}

function toListItem(row: RoleRow): RoleListItem {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    isSuperAdmin: row.key === SUPER_ADMIN_ROLE_KEY,
    permissionCount: permissionsOf(row).length,
    staffCount: row._count.staff,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
