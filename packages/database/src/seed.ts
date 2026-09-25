/**
 * Seeds the permission catalogue and the eight system roles.
 *
 * Safe to run as often as you like:
 *   - permissions and system roles are created or updated, never duplicated
 *   - a system role's permission list is brought back in line with the code,
 *     so this file stays the source of truth
 *   - custom roles, staff members, role assignments and audit records are
 *     never touched
 *
 * Run with:  pnpm db:seed
 */

import 'dotenv/config';
import { PERMISSIONS, SYSTEM_ROLES, SUPER_ADMIN_ROLE_KEY } from '@afaq/types';
import { createPrismaClient } from './client.js';

function getConnectionString(): string {
  // Migrations and seeding use the direct connection; the pooler is for the
  // running application.
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'No database connection string. Set DIRECT_URL (or DATABASE_URL) in packages/database/.env',
    );
  }

  return url;
}

async function main(): Promise<void> {
  const prisma = createPrismaClient({ connectionString: getConnectionString() });

  try {
    // --- permissions -------------------------------------------------------
    for (const permission of PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key: permission.key },
        create: {
          key: permission.key,
          resource: permission.resource,
          action: permission.action,
          description: permission.description,
        },
        // The description may improve over time; the key never changes.
        update: {
          resource: permission.resource,
          action: permission.action,
          description: permission.description,
        },
      });
    }
    console.log(`Permissions:  ${PERMISSIONS.length} in place`);

    const stored: Array<{ id: string; key: string }> = await prisma.permission.findMany({
      select: { id: true, key: true },
    });
    const permissionIdByKey = new Map(stored.map((row) => [row.key, row.id]));

    // --- system roles ------------------------------------------------------
    for (const role of SYSTEM_ROLES) {
      const record = await prisma.role.upsert({
        where: { key: role.key },
        create: {
          key: role.key,
          name: role.name,
          description: role.description,
          isSystem: true,
        },
        update: {
          name: role.name,
          description: role.description,
          isSystem: true,
        },
      });

      // Super Admin is granted everything by the central override in
      // @afaq/types, so it deliberately carries no stored permissions: a
      // permission added later reaches it with no re-seed.
      if (role.key === SUPER_ADMIN_ROLE_KEY) {
        await prisma.rolePermission.deleteMany({ where: { roleId: record.id } });
        console.log(`Role:         ${role.key.padEnd(20)} central override`);
        continue;
      }

      const wanted = role.permissions
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => Boolean(id));

      // Bring the stored list back in line with the code — in one transaction,
      // so the role is never briefly left without its permissions.
      await prisma.$transaction([
        prisma.rolePermission.deleteMany({
          where: { roleId: record.id, permissionId: { notIn: wanted } },
        }),
        prisma.rolePermission.createMany({
          data: wanted.map((permissionId) => ({ roleId: record.id, permissionId })),
          skipDuplicates: true,
        }),
      ]);

      console.log(`Role:         ${role.key.padEnd(20)} ${wanted.length} permissions`);
    }

    const [permissionCount, roleCount, customRoleCount, staffCount] = await Promise.all([
      prisma.permission.count(),
      prisma.role.count({ where: { isSystem: true } }),
      prisma.role.count({ where: { isSystem: false } }),
      prisma.staffUser.count(),
    ]);

    console.log('');
    console.log('Seed complete.');
    console.log(`  permissions:   ${permissionCount}`);
    console.log(`  system roles:  ${roleCount}`);
    console.log(`  custom roles:  ${customRoleCount} (untouched)`);
    console.log(`  staff:         ${staffCount} (untouched)`);

    if (staffCount === 0) {
      console.log('');
      console.log('No staff yet. Create the first Super Admin with:  pnpm db:bootstrap');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
