import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PermissionKey } from '@afaq/types';
import type { PrismaTransactionClient } from '@afaq/database';
import type { StaffContext } from '../auth/staff-context.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateRoleDto, UpdateRoleDto } from './dto/write-role.dto.js';
import {
  assertKnownPermissions,
  assertMayDefineRole,
  assertNotSystemRole,
  assertRoleUnused,
  roleKeyFromName,
} from './role-policy.js';

interface ExistingRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{ permission: { key: string } }>;
  _count: { staff: number };
}

/**
 * Creating, changing and removing custom roles.
 *
 * Built-in roles are refused throughout: they are re-seeded on deploy, so a
 * change here would be silently reverted later — worse than refusing, because
 * it looks like it worked.
 */
@Injectable()
export class RolesManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: StaffContext, input: CreateRoleDto): Promise<{ id: string }> {
    const permissions = assertKnownPermissions(input.permissionKeys);
    assertMayDefineRole(actor, permissions);

    const key = roleKeyFromName(input.name);
    await this.assertKeyIsFree(key);

    const permissionIds = await this.resolvePermissionIds(permissions);

    const role = await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      const created = await tx.role.create({
        data: {
          key,
          name: input.name,
          description: input.description || null,
          isSystem: false,
          createdById: actor.staffUserId,
          permissions: { createMany: { data: permissionIds.map((id) => ({ permissionId: id })) } },
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'PERMISSION',
          action: 'role.created',
          targetType: 'Role',
          targetId: created.id,
          targetLabel: input.name,
          after: { key, name: input.name, permissions: permissions.sort() },
        },
      });

      return created;
    });

    return { id: role.id };
  }

  async update(actor: StaffContext, id: string, input: UpdateRoleDto): Promise<{ id: string }> {
    const role = await this.load(id);
    assertNotSystemRole(role, 'edited');

    const before = {
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((link) => link.permission.key).sort(),
    };

    const permissions =
      input.permissionKeys === undefined ? null : assertKnownPermissions(input.permissionKeys);

    if (permissions) assertMayDefineRole(actor, permissions);

    const after = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(permissions ? { permissions: [...permissions].sort() } : {}),
    };

    if (Object.keys(after).length === 0) {
      throw new BadRequestException({ reason: 'no_change', message: 'Nothing to change.' });
    }

    const permissionIds = permissions ? await this.resolvePermissionIds(permissions) : null;

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.role.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description || null } : {}),
        },
      });

      // Permissions are replaced wholesale: the list sent is the list the
      // role ends up with, so a removal is as explicit as an addition.
      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'PERMISSION',
          action: 'role.updated',
          targetType: 'Role',
          targetId: id,
          targetLabel: input.name ?? role.name,
          before,
          after,
          // How many people this change reached, which is the part somebody
          // reviewing the trail actually wants to know.
          metadata: { affectedStaff: role._count.staff },
        },
      });
    });

    return { id };
  }

  async remove(actor: StaffContext, id: string): Promise<{ id: string }> {
    const role = await this.load(id);

    assertNotSystemRole(role, 'deleted');
    assertRoleUnused(role._count.staff, role.name);

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      // The permission links go with it (Cascade); the role itself is gone.
      await tx.role.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'PERMISSION',
          action: 'role.deleted',
          targetType: 'Role',
          targetId: id,
          targetLabel: role.name,
          // Recorded in full: once deleted there is nothing left to look up.
          before: {
            key: role.key,
            name: role.name,
            permissions: role.permissions.map((link) => link.permission.key).sort(),
          },
        },
      });
    });

    return { id };
  }

  private async load(id: string): Promise<ExistingRole> {
    const role: ExistingRole | null = await this.prisma.db.role.findUnique({
      where: { id },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        isSystem: true,
        permissions: { select: { permission: { select: { key: true } } } },
        _count: { select: { staff: true } },
      },
    });

    if (!role) {
      throw new NotFoundException({ message: 'That role no longer exists.' });
    }

    return role;
  }

  /** Two roles cannot share a key, and the key comes from the name. */
  private async assertKeyIsFree(key: string): Promise<void> {
    const existing = await this.prisma.db.role.findUnique({
      where: { key },
      select: { name: true },
    });

    if (existing) {
      throw new ConflictException({
        reason: 'role_exists',
        message: `"${existing.name}" already uses that name.`,
      });
    }
  }

  /**
   * Turns permission keys into ids.
   *
   * A key missing from the table means the seed has not been run since it was
   * added — worth saying plainly rather than writing a role with a silently
   * missing permission.
   */
  private async resolvePermissionIds(permissions: PermissionKey[]): Promise<string[]> {
    const rows: Array<{ id: string; key: string }> = await this.prisma.db.permission.findMany({
      where: { key: { in: permissions } },
      select: { id: true, key: true },
    });

    if (rows.length !== permissions.length) {
      const found = new Set(rows.map((row) => row.key));
      throw new BadRequestException({
        reason: 'permission_not_seeded',
        message: `These permissions are not in the database yet — run the seed: ${permissions
          .filter((key) => !found.has(key))
          .join(', ')}`,
      });
    }

    return rows.map((row) => row.id);
  }
}
