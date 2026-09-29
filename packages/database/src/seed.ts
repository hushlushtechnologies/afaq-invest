/**
 * Seeds the permission catalogue, the eight system roles, Afaq's own nine
 * companies, and the starter investment configuration.
 *
 * Safe to run as often as you like:
 *   - permissions and system roles are created or updated, never duplicated
 *   - a system role's permission list is brought back in line with the code,
 *     so this file stays the source of truth
 *   - a company is created if it is missing and then never altered
 *   - investment settings are created if missing and then never altered
 *   - the starter ladder is written only when no rule set exists at all
 *   - custom roles, staff members, role assignments and audit records are
 *     never touched
 *
 * Run with:  pnpm db:seed
 */

import 'dotenv/config';
import {
  annualisedRoi,
  PERMISSIONS,
  SYSTEM_ROLES,
  SUPER_ADMIN_ROLE_KEY,
  validateTierLadder,
  type LadderContext,
  type RoiBasis,
} from '@afaq/types';
import { createPrismaClient } from './client.js';
import { SEED_COMPANIES } from './seed-companies.js';
import {
  SEED_INVESTMENT_SETTINGS,
  SEED_ROI_BASIS,
  SEED_RULE_SET_NAME,
  SEED_TIERS,
} from './seed-investment.js';

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

/** Whole AED with thousands separators, for the printed ladder. */
function money(value: number | null): string {
  return value === null ? 'and above' : value.toLocaleString('en-US');
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

    // --- Afaq's own companies ----------------------------------------------
    //
    // Created if missing, then left alone — deliberately unlike the roles
    // above, which are re-synced from the code every run.
    //
    // The difference is who owns the record. A system role is defined by the
    // code and should be corrected by a re-seed. A company is a business record
    // that somebody maintains in the Admin Portal: they will fix a description,
    // add a legal name, reorder the marketplace. Overwriting their work on every
    // deploy would be maddening, and they would stop trusting the screen.
    let companiesCreated = 0;

    for (const company of SEED_COMPANIES) {
      const existing = await prisma.company.findUnique({
        where: { slug: company.slug },
        select: { id: true },
      });

      if (existing) continue;

      await prisma.company.create({
        data: {
          slug: company.slug,
          name: company.name,
          // Null on purpose: see the note in seed-companies.ts.
          legalName: null,
          type: 'INTERNAL',
          status: 'ACTIVE',
          // Afaq's own companies have nothing to vet.
          verification: 'NOT_REQUIRED',
          sector: company.sector,
          description: company.description,
          website: company.website,
          isFeatured: company.isFeatured,
          displayOrder: company.displayOrder,
        },
      });

      companiesCreated += 1;
    }

    console.log(
      `Companies:    ${SEED_COMPANIES.length} expected, ${companiesCreated} created, ` +
        `${SEED_COMPANIES.length - companiesCreated} already present`,
    );

    // --- investment settings -----------------------------------------------
    //
    // Business data, like the companies above: created once, then owned by
    // whoever maintains Administration → Investment Rules.
    const existingSettings = await prisma.investmentSettings.findUnique({
      where: { id: 'global' },
      select: { id: true },
    });

    if (!existingSettings) {
      await prisma.investmentSettings.create({
        data: {
          id: 'global',
          currency: SEED_INVESTMENT_SETTINGS.currency,
          minimumInvestment: SEED_INVESTMENT_SETTINGS.minimumInvestment,
          maxRoiPercent: SEED_INVESTMENT_SETTINGS.maxRoiPercent,
          maxRoiBasis: SEED_INVESTMENT_SETTINGS.maxRoiBasis,
          defaultNoticePeriodDays: SEED_INVESTMENT_SETTINGS.defaultNoticePeriodDays,
          requireStepUpToPublish: SEED_INVESTMENT_SETTINGS.requireStepUpToPublish,
        },
      });
    }

    // Read them back rather than trusting the constants: if the row was
    // already there, an administrator may have raised the minimum or lowered
    // the cap, and the ladder has to be judged against what is actually
    // stored.
    const settings = await prisma.investmentSettings.findUniqueOrThrow({
      where: { id: 'global' },
      select: {
        currency: true,
        minimumInvestment: true,
        maxRoiPercent: true,
        maxRoiBasis: true,
      },
    });

    console.log(
      `Settings:     ${existingSettings ? 'already present' : 'created'} — ` +
        `${settings.currency}, minimum ${money(Number(settings.minimumInvestment))}, ` +
        `cap ${Number(settings.maxRoiPercent)}% ${settings.maxRoiBasis.toLowerCase()}`,
    );

    // --- the starter ladder -------------------------------------------------
    //
    // Only when there is no rule set at all. A second run must not stack up
    // duplicate ladders, and it must never touch one somebody has published.
    const ruleSetCount = await prisma.investmentRuleSet.count();

    if (ruleSetCount > 0) {
      console.log(`Ladder:       ${ruleSetCount} rule set(s) already present, left alone`);
    } else {
      const context: LadderContext = {
        roiBasis: SEED_ROI_BASIS,
        minimumInvestment: Number(settings.minimumInvestment),
        maxRoiPercent: Number(settings.maxRoiPercent),
        maxRoiBasis: settings.maxRoiBasis as RoiBasis,
      };

      // The same check the Admin form and the API run. A gap, an overlap or a
      // rate above the cap stops the seed rather than going live.
      const issues = validateTierLadder(SEED_TIERS, context);

      if (issues.length > 0) {
        throw new Error(
          `The starter ladder in seed-investment.ts is not valid:\n` +
            issues.map((issue) => `  - [${issue.code}] ${issue.message}`).join('\n'),
        );
      }

      await prisma.investmentRuleSet.create({
        data: {
          name: SEED_RULE_SET_NAME,
          version: 1,
          scope: 'GLOBAL',
          companyId: null,
          scopeKey: 'GLOBAL',
          status: 'ACTIVE',
          roiBasis: SEED_ROI_BASIS,
          // Equal to scopeKey while active. The unique index on this column is
          // what guarantees one live global ladder.
          activeKey: 'GLOBAL',
          publishedAt: new Date(),
          notes:
            'Created by the seed so the platform starts with a valid ladder. Every figure ' +
            'is a placeholder — replace them from Administration → Investment Rules.',
          tiers: {
            create: SEED_TIERS.map((tier, index) => ({
              name: tier.name,
              minAmount: tier.minAmount,
              maxAmount: tier.maxAmount,
              // Tens, so a tier can be inserted between two others later.
              displayOrder: (index + 1) * 10,
              options: {
                create: tier.options.map((option) => ({
                  mode: option.mode,
                  roiPercent: option.roiPercent,
                  payoutFrequency: option.payoutFrequency,
                  minTermMonths: option.minTermMonths,
                  maxTermMonths: option.maxTermMonths,
                  noticePeriodDays: option.noticePeriodDays,
                  earnsDuringNotice: option.earnsDuringNotice,
                  isEnabled: true,
                })),
              },
            })),
          },
        },
      });

      console.log(
        `Ladder:       "${SEED_RULE_SET_NAME}" v1 published — ${SEED_TIERS.length} tiers, ` +
          `rates quoted ${SEED_ROI_BASIS.toLowerCase()}`,
      );
      console.log('');

      // Printed in full, with the yearly equivalent beside each rate, so what
      // went into the database is visible without opening a table viewer.
      for (const tier of SEED_TIERS) {
        const range = `${money(tier.minAmount)} – ${money(tier.maxAmount)}`;
        console.log(`  ${tier.name.padEnd(8)} ${range}`);

        for (const option of tier.options) {
          const yearly = annualisedRoi(option.roiPercent, SEED_ROI_BASIS);
          const term =
            option.minTermMonths === null
              ? 'open-ended'
              : `${option.minTermMonths}–${option.maxTermMonths} months`;
          const notice =
            option.noticePeriodDays > 0 ? `${option.noticePeriodDays}-day notice` : 'no notice';

          console.log(
            `           ${option.mode.toLowerCase().padEnd(9)} ` +
              `${String(option.roiPercent).padStart(5)}% ` +
              `(${yearly}% a year)`.padEnd(16) +
              `${term}, ${notice}`,
          );
        }
      }
    }

    const [
      permissionCount,
      roleCount,
      customRoleCount,
      staffCount,
      companyCount,
      internalCount,
      tierCount,
    ] = await Promise.all([
      prisma.permission.count(),
      prisma.role.count({ where: { isSystem: true } }),
      prisma.role.count({ where: { isSystem: false } }),
      prisma.staffUser.count(),
      prisma.company.count(),
      prisma.company.count({ where: { type: 'INTERNAL' } }),
      prisma.investmentTier.count(),
    ]);

    console.log('');
    console.log('Seed complete.');
    console.log(`  permissions:   ${permissionCount}`);
    console.log(`  system roles:  ${roleCount}`);
    console.log(`  custom roles:  ${customRoleCount} (untouched)`);
    console.log(`  staff:         ${staffCount} (untouched)`);
    console.log(`  companies:     ${companyCount} (${internalCount} internal)`);
    console.log(`  tiers:         ${tierCount}`);

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
