#!/usr/bin/env node
/**
 * Phase 20: applies the edits to existing files that are too large to paste
 * whole for the lines that changed.
 *
 * Generated from the actual change, not written by hand: each edit is the
 * smallest surrounding text that appears exactly once in the end-of-Phase-19
 * file, and the whole set was proven by replaying it onto those files and
 * getting the end-of-Phase-20 files back byte for byte.
 *
 * Checked before writing: if any expected text is not there exactly once,
 * nothing at all is written and it names the edit. Edits already in place are
 * skipped, so running it twice is harmless. Windows line endings are kept.
 *
 *   Run from the repository root:  node scripts/apply-phase-20.mjs
 *
 * Safe to delete once it reports success.
 */

import console from 'node:console';
import process from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** [file, which edit, text expected, text it becomes] */
const EDITS = [
  [
    'packages/types/src/audit.ts',
    'audit.ts (1/3)',
    "  'investment_rule.archived',\n  'investment_rule.draft_deleted',\n\n  // --- roles ---------------------------------------------------------------\n  'role.created',\n  'role.updated',",
    "  'investment_rule.archived',\n  'investment_rule.draft_deleted',\n\n  // --- investment opportunities -------------------------------------------\n  'opportunity.created',\n  'opportunity.updated',\n  'opportunity.opened',\n  'opportunity.suspended',\n  'opportunity.resumed',\n  'opportunity.closed',\n  'opportunity.cancelled',\n  'opportunity.draft_deleted',\n\n  // --- roles ---------------------------------------------------------------\n  'role.created',\n  'role.updated',",
  ],
  [
    'packages/types/src/audit.ts',
    'audit.ts (2/3)',
    ' * writes it in `summarise()`; the admin viewer reads it with `readAuditLadder`\n * below. Both sides share this one declaration so the shape cannot drift.\n */\nexport interface AuditLadderOption {\n  /** LOCKED or UNLOCKED, as recorded. A string, because an old entry may\n   *  carry a mode this build no longer knows. */\n  mode: string;',
    ' * writes it in `summarise()`; the admin viewer reads it with `readAuditLadder`\n * below. Both sides share this one declaration so the shape cannot drift.\n */\nexport type AuditLadderOption = {\n  /** LOCKED or UNLOCKED, as recorded. A string, because an old entry may\n   *  carry a mode this build no longer knows. */\n  mode: string;',
  ],
  [
    'packages/types/src/audit.ts',
    'audit.ts (3/3)',
    '  /** [minimum, maximum] months. Either end may be open. */\n  term: [number | null, number | null];\n  notice: number;\n}\n\n/** One tier as the audit trail stores it. */\nexport interface AuditLadderTier {\n  name: string;\n  min: number;\n  /** Null on the top tier: "and upwards". */\n  max: number | null;\n}\n\n/** A tier with the options recorded against it. */\nexport interface AuditLadderTierWithOptions extends AuditLadderTier {\n  options: AuditLadderOption[];\n}\n\nfunction isRecord(value: unknown): value is Record<string, unknown> {\n  return typeof value === \'object\' && value !== null && !Array.isArray(value);',
    "  /** [minimum, maximum] months. Either end may be open. */\n  term: [number | null, number | null];\n  notice: number;\n};\n\n/** One tier as the audit trail stores it. */\nexport type AuditLadderTier = {\n  name: string;\n  min: number;\n  /** Null on the top tier: \"and upwards\". */\n  max: number | null;\n};\n\n/**\n * A tier with the options recorded against it.\n *\n * These three are `type` aliases rather than interfaces on purpose. They are\n * written into a Json column, and TypeScript only lets an object type stand\n * in for JSON if it can be read as having an index signature — which a type\n * alias can and an interface cannot. As interfaces, the API's audit writes\n * failed to typecheck.\n */\nexport type AuditLadderTierWithOptions = AuditLadderTier & {\n  options: AuditLadderOption[];\n};\n\nfunction isRecord(value: unknown): value is Record<string, unknown> {\n  return typeof value === 'object' && value !== null && !Array.isArray(value);",
  ],
  [
    'packages/types/src/opportunity.ts',
    'opportunity.ts (1/5)',
    "  type CompanyVerification,\n} from './company';\nimport type { InvestmentMode, RoiBasis, RuleSetScope } from './investment';\n\n/* -------------------------------------------------------------------------- */\n/* Status                                                                     */",
    "  type CompanyVerification,\n} from './company';\nimport type { InvestmentMode, RoiBasis, RuleSetScope } from './investment';\nimport type { SortDirection } from './staff';\n\n/* -------------------------------------------------------------------------- */\n/* Status                                                                     */",
  ],
  [
    'packages/types/src/opportunity.ts',
    'opportunity.ts (2/5)',
    "  liveOnly?: boolean;\n  search?: string;\n  sortField?: OpportunitySortField;\n  sortDirection?: 'asc' | 'desc';\n}\n\n/**",
    '  liveOnly?: boolean;\n  search?: string;\n  sortField?: OpportunitySortField;\n  sortDirection?: SortDirection;\n}\n\n/**',
  ],
  [
    'packages/types/src/opportunity.ts',
    'opportunity.ts (3/5)',
    ' * receive investment, and a closing date that has not already passed. Those\n * three are checked only when opening, so a half-finished draft is not\n * covered in errors about a decision nobody has made yet.\n */\nexport function validateOpportunity(\n  draft: { companyId: string; title: string; targetAmount: number; closesAt: Date | string | null },\n  context: OpportunityContext,\n  { opening = false }: { opening?: boolean } = {},\n): OpportunityIssue[] {\n  const issues: OpportunityIssue[] = [];\n',
    " * receive investment, and a closing date that has not already passed. Those\n * three are checked only when opening, so a half-finished draft is not\n * covered in errors about a decision nobody has made yet.\n *\n * `live` is for editing a raise that is already running. It checks the\n * closing date alone: moving it into the past would quietly shut the raise\n * without going through the audited close, so that is refused. It does not\n * re-check the company or the ladder, because fixing a typo in a live raise's\n * description must not be blocked by the company having been suspended in\n * the meantime — suspension has its own consequences elsewhere.\n */\nexport function validateOpportunity(\n  draft: { companyId: string; title: string; targetAmount: number; closesAt: Date | string | null },\n  context: OpportunityContext,\n  { opening = false, live = false }: { opening?: boolean; live?: boolean } = {},\n): OpportunityIssue[] {\n  const issues: OpportunityIssue[] = [];\n",
  ],
  [
    'packages/types/src/opportunity.ts',
    'opportunity.ts (4/5)',
    "        message: 'The closing date must be after the opening date.',\n      });\n\n    if (opening && closes <= context.now.getTime())\n      issues.push({\n        code: 'close_in_past',\n        field: 'closesAt',",
    "        message: 'The closing date must be after the opening date.',\n      });\n\n    if ((opening || live) && closes <= context.now.getTime())\n      issues.push({\n        code: 'close_in_past',\n        field: 'closesAt',",
  ],
  [
    'packages/types/src/opportunity.ts',
    'opportunity.ts (5/5)',
    'export function isOpportunityValid(\n  draft: Parameters<typeof validateOpportunity>[0],\n  context: OpportunityContext,\n  options?: { opening?: boolean },\n): boolean {\n  return validateOpportunity(draft, context, options).length === 0;\n}',
    'export function isOpportunityValid(\n  draft: Parameters<typeof validateOpportunity>[0],\n  context: OpportunityContext,\n  options?: { opening?: boolean; live?: boolean },\n): boolean {\n  return validateOpportunity(draft, context, options).length === 0;\n}',
  ],
  [
    'apps/api/src/audit/audit-actions.spec.ts',
    'audit-actions.spec.ts (1/2)',
    '/**\n * Actions built at runtime, and every value they can take.\n *\n * Two sites compose the name from a value rather than writing it out, so no\n * scan can read the possible results off the page. They are enumerated here\n * instead — and because the list is keyed by the expression as written, a\n * third such site, or a change to one of these two, fails the test below\n * until somebody comes back and says what it can now produce.\n */\nconst DYNAMIC_SITES: Record<string, readonly string[]> = {',
    '/**\n * Actions built at runtime, and every value they can take.\n *\n * Three sites compose the name from a value rather than writing it out, so no\n * scan can read the possible results off the page. They are enumerated here\n * instead — and because the list is keyed by the expression as written, a\n * fourth such site, or a change to one of these three, fails the test below\n * until somebody comes back and says what it can now produce.\n */\nconst DYNAMIC_SITES: Record<string, readonly string[]> = {',
  ],
  [
    'apps/api/src/audit/audit-actions.spec.ts',
    'audit-actions.spec.ts (2/2)',
    "    'staff.suspended',\n    'staff.disabled',\n  ],\n};\n\n/** The quoted names in an expression, which covers the literals and ternaries. */",
    "    'staff.suspended',\n    'staff.disabled',\n  ],\n  // Keyed by OpportunityMove. The map is at the top of the service, and open\n  // and resume deliberately have different names though both end at OPEN.\n  'action: MOVE_ACTIONS[move],': [\n    'opportunity.opened',\n    'opportunity.suspended',\n    'opportunity.resumed',\n    'opportunity.closed',\n    'opportunity.cancelled',\n  ],\n};\n\n/** The quoted names in an expression, which covers the literals and ternaries. */",
  ],
  [
    'apps/api/src/auth/route-protection.spec.ts',
    'route-protection.spec.ts (1/2)',
    "import { CompaniesController } from '../companies/companies.controller.js';\nimport { HealthController } from '../health/health.controller.js';\nimport { InvestmentRulesController } from '../investment-rules/investment-rules.controller.js';\nimport { RolesController } from '../roles/roles.controller.js';\nimport { StaffController } from '../staff/staff.controller.js';\nimport { ALLOW_INVITED_KEY } from './allow-invited.decorator.js';",
    "import { CompaniesController } from '../companies/companies.controller.js';\nimport { HealthController } from '../health/health.controller.js';\nimport { InvestmentRulesController } from '../investment-rules/investment-rules.controller.js';\nimport { OpportunitiesController } from '../opportunities/opportunities.controller.js';\nimport { RolesController } from '../roles/roles.controller.js';\nimport { StaffController } from '../staff/staff.controller.js';\nimport { ALLOW_INVITED_KEY } from './allow-invited.decorator.js';",
  ],
  [
    'apps/api/src/auth/route-protection.spec.ts',
    'route-protection.spec.ts (2/2)',
    '  AuditController,\n  CompaniesController,\n  InvestmentRulesController,\n];\n\n/**',
    '  AuditController,\n  CompaniesController,\n  InvestmentRulesController,\n  OpportunitiesController,\n];\n\n/**',
  ],
  [
    'apps/api/src/companies/dto/write-company.dto.ts',
    'write-company.dto.ts (1/4)',
    "  MaxLength,\n  Min,\n  MinLength,\n} from 'class-validator';\nimport { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';\nimport {",
    "  MaxLength,\n  Min,\n  MinLength,\n  ValidateIf,\n} from 'class-validator';\nimport { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';\nimport {",
  ],
  [
    'apps/api/src/companies/dto/write-company.dto.ts',
    'write-company.dto.ts (2/4)',
    "const trimmed = ({ value }: { value: unknown }): unknown =>\n  typeof value === 'string' ? value.trim() : value;\n\n/**\n * Creating a company.\n *",
    'const trimmed = ({ value }: { value: unknown }): unknown =>\n  typeof value === \'string\' ? value.trim() : value;\n\n/**\n * Optional, but never null — for the columns that cannot be empty.\n *\n * `@IsOptional()` skips validation for null as well as for a missing field,\n * so `{ "name": null }` used to pass every check and reach a required column,\n * where Postgres refused it and the caller got a 500. This skips only when the\n * field is absent, so an explicit null is validated, and refused with a 400.\n */\nconst presentOnly = ValidateIf((_object: object, value: unknown) => value !== undefined);\n\n/**\n * Creating a company.\n *',
  ],
  [
    'apps/api/src/companies/dto/write-company.dto.ts',
    'write-company.dto.ts (3/4)',
    '  @IsString()\n  @MinLength(2)\n  @MaxLength(160)\n  @IsOptional()\n  name?: string;\n\n  @ApiPropertyOptional()',
    '  @IsString()\n  @MinLength(2)\n  @MaxLength(160)\n  @presentOnly\n  name?: string;\n\n  @ApiPropertyOptional()',
  ],
  [
    'apps/api/src/companies/dto/write-company.dto.ts',
    'write-company.dto.ts (4/4)',
    '  @IsString()\n  @MinLength(2)\n  @MaxLength(80)\n  @IsOptional()\n  sector?: string;\n\n  @ApiPropertyOptional()',
    '  @IsString()\n  @MinLength(2)\n  @MaxLength(80)\n  @presentOnly\n  sector?: string;\n\n  @ApiPropertyOptional()',
  ],
  [
    'apps/api/src/investment-rules/investment-rules-management.service.ts',
    'investment-rules-management.service.ts (1/3)',
    "  type TierDraft,\n} from '@afaq/types';\nimport type { PrismaTransactionClient } from '@afaq/database';\nimport type { StaffContext } from '../auth/staff-context.types.js';\nimport { PrismaService } from '../prisma/prisma.service.js';\nimport type {",
    "  type TierDraft,\n} from '@afaq/types';\nimport type { PrismaTransactionClient } from '@afaq/database';\nimport type { AuditJsonObject } from '../audit/audit-json.js';\nimport type { StaffContext } from '../auth/staff-context.types.js';\nimport { PrismaService } from '../prisma/prisma.service.js';\nimport type {",
  ],
  [
    'apps/api/src/investment-rules/investment-rules-management.service.ts',
    'investment-rules-management.service.ts (2/3)',
    '      });\n    }\n\n    const before: Record<string, unknown> = {};\n    const changes: Record<string, unknown> = {};\n\n    const stored: Record<string, unknown> = {\n      currency: current.currency,\n      minimumInvestment: toNumber(current.minimumInvestment),\n      maxRoiPercent: toNumber(current.maxRoiPercent),',
    '      });\n    }\n\n    const before: AuditJsonObject = {};\n    const changes: AuditJsonObject = {};\n\n    const stored: AuditJsonObject = {\n      currency: current.currency,\n      minimumInvestment: toNumber(current.minimumInvestment),\n      maxRoiPercent: toNumber(current.maxRoiPercent),',
  ],
  [
    'apps/api/src/investment-rules/investment-rules-management.service.ts',
    'investment-rules-management.service.ts (3/3)',
    "    const target = await this.loadTarget(id);\n    assertEditable(target.status as RuleSetStatus);\n\n    const before: Record<string, unknown> = {};\n    const changes: Record<string, unknown> = {};\n\n    for (const field of ['name', 'roiBasis', 'notes'] as const) {\n      const next = input[field];",
    "    const target = await this.loadTarget(id);\n    assertEditable(target.status as RuleSetStatus);\n\n    const before: AuditJsonObject = {};\n    const changes: AuditJsonObject = {};\n\n    for (const field of ['name', 'roiBasis', 'notes'] as const) {\n      const next = input[field];",
  ],
  [
    'apps/api/src/investment-rules/step-up-gate.spec.ts',
    'step-up-gate.spec.ts (1/1)',
    "  status: 'ACTIVE',\n  roleKeys: ['SUPER_ADMIN'],\n  permissionKeys: [],\n} as StaffContext;\n\n/** The settings row as stored, before the change under test. */",
    "  status: 'ACTIVE',\n  roleKeys: ['SUPER_ADMIN'],\n  permissionKeys: [],\n  isSuperAdmin: true,\n} as StaffContext;\n\n/** The settings row as stored, before the change under test. */",
  ],
  [
    'apps/api/src/opportunities/opportunity-contract.spec.ts',
    'opportunity-contract.spec.ts (1/1)',
    "      expect(issue.message.trim(), issue.code).not.toBe('');\n      expect(issue.message, issue.code).not.toMatch(/undefined|NaN|null/);\n    }\n  });\n});",
    "      expect(issue.message.trim(), issue.code).not.toBe('');\n      expect(issue.message, issue.code).not.toMatch(/undefined|NaN|null/);\n    }\n  });\n});\n\ndescribe('editing a raise that is running', () => {\n  /**\n   * `live` checks the closing date alone. Moving it into the past would shut\n   * the raise without the audited close; but a typo fix on a live raise must\n   * not be blocked because its company was suspended in the meantime.\n   */\n  it('refuses a closing date in the past, and nothing else it does not need', () => {\n    const past = { ...DRAFT, closesAt: '2026-01-01T00:00:00.000Z' };\n\n    expect(\n      codes(\n        validateOpportunity(\n          past,\n          context({\n            currentStatus: 'OPEN',\n            companyAcceptsInvestment: false,\n            hasLiveLadder: false,\n          }),\n          { live: true },\n        ),\n      ),\n    ).toEqual(['close_in_past']);\n  });\n\n  it('leaves a running raise with a future closing date alone', () => {\n    expect(\n      validateOpportunity(\n        DRAFT,\n        context({ currentStatus: 'OPEN', companyAcceptsInvestment: false }),\n        { live: true },\n      ),\n    ).toEqual([]);\n  });\n});",
  ],
  [
    'scripts/write-audit-action-labels.mjs',
    'write-audit-action-labels.mjs (1/8)',
    "      archived: 'Rule set archived',\n      draft_deleted: 'Draft deleted',\n    },\n    role: {\n      created: 'Role created',\n      updated: 'Role changed',",
    "      archived: 'Rule set archived',\n      draft_deleted: 'Draft deleted',\n    },\n    opportunity: {\n      created: 'Opportunity drafted',\n      updated: 'Opportunity details changed',\n      opened: 'Opportunity opened to investors',\n      suspended: 'Opportunity suspended',\n      resumed: 'Opportunity resumed',\n      closed: 'Opportunity closed',\n      cancelled: 'Opportunity cancelled',\n      draft_deleted: 'Opportunity draft deleted',\n    },\n    role: {\n      created: 'Role created',\n      updated: 'Role changed',",
  ],
  [
    'scripts/write-audit-action-labels.mjs',
    'write-audit-action-labels.mjs (2/8)',
    "    removedFromSource: 'Removed from the other account',\n    method: 'Method',\n    invitationExpiresAt: 'Invitation expires',\n    nothing: 'Nothing',\n  },\n",
    "    removedFromSource: 'Removed from the other account',\n    method: 'Method',\n    invitationExpiresAt: 'Invitation expires',\n    title: 'Title',\n    summary: 'Summary',\n    description: 'Description',\n    coverImageUrl: 'Cover image',\n    targetAmount: 'Target',\n    closesAt: 'Closing date',\n    pinnedRuleSet: 'Priced by',\n    ruleSetId: 'Rule set reference',\n    nothing: 'Nothing',\n  },\n",
  ],
  [
    'scripts/write-audit-action-labels.mjs',
    'write-audit-action-labels.mjs (3/8)',
    "    affectedStaff: 'Staff affected',\n    method: 'Method',\n    source: 'Source',\n    values: {\n      own_password: 'The administrator re-entered their own password',\n      not_required: 'Not required by the settings at the time',",
    "    affectedStaff: 'Staff affected',\n    method: 'Method',\n    source: 'Source',\n    company: 'Company',\n    pinnedFrom: 'Terms taken from',\n    values: {\n      own_password: 'The administrator re-entered their own password',\n      not_required: 'Not required by the settings at the time',",
  ],
  [
    'scripts/write-audit-action-labels.mjs',
    'write-audit-action-labels.mjs (4/8)',
    "      invitation: 'By invitation',\n      password: 'With a password set directly',\n      'bootstrap-cli': 'The first-administrator command',\n    },\n    yes: 'Yes',\n    no: 'No',",
    "      invitation: 'By invitation',\n      password: 'With a password set directly',\n      'bootstrap-cli': 'The first-administrator command',\n      GLOBAL: 'The platform-wide rules',\n      COMPANY: \"The company's own rules\",\n    },\n    yes: 'Yes',\n    no: 'No',",
  ],
  [
    'scripts/write-audit-action-labels.mjs',
    'write-audit-action-labels.mjs (5/8)',
    "      archived: 'تم أرشفة مجموعة القواعد',\n      draft_deleted: 'تم حذف المسودة',\n    },\n    role: {\n      created: 'تم إنشاء دور',\n      updated: 'تم تعديل دور',",
    "      archived: 'تم أرشفة مجموعة القواعد',\n      draft_deleted: 'تم حذف المسودة',\n    },\n    opportunity: {\n      created: 'تم إنشاء مسودة فرصة استثمارية',\n      updated: 'تم تعديل بيانات الفرصة',\n      opened: 'تم فتح الفرصة للمستثمرين',\n      suspended: 'تم تعليق الفرصة',\n      resumed: 'تم استئناف الفرصة',\n      closed: 'تم إغلاق الفرصة',\n      cancelled: 'تم إلغاء الفرصة',\n      draft_deleted: 'تم حذف مسودة الفرصة',\n    },\n    role: {\n      created: 'تم إنشاء دور',\n      updated: 'تم تعديل دور',",
  ],
  [
    'scripts/write-audit-action-labels.mjs',
    'write-audit-action-labels.mjs (6/8)',
    "    removedFromSource: 'أزيلت من الحساب الآخر',\n    method: 'الطريقة',\n    invitationExpiresAt: 'انتهاء صلاحية الدعوة',\n    nothing: 'لا شيء',\n  },\n",
    "    removedFromSource: 'أزيلت من الحساب الآخر',\n    method: 'الطريقة',\n    invitationExpiresAt: 'انتهاء صلاحية الدعوة',\n    title: 'العنوان',\n    summary: 'الملخص',\n    description: 'الوصف',\n    coverImageUrl: 'صورة الغلاف',\n    targetAmount: 'المبلغ المستهدف',\n    closesAt: 'تاريخ الإغلاق',\n    pinnedRuleSet: 'مُسعّرة وفق',\n    ruleSetId: 'مرجع مجموعة القواعد',\n    nothing: 'لا شيء',\n  },\n",
  ],
  [
    'scripts/write-audit-action-labels.mjs',
    'write-audit-action-labels.mjs (7/8)',
    "    affectedStaff: 'الموظفون المتأثرون',\n    method: 'الطريقة',\n    source: 'المصدر',\n    values: {\n      own_password: 'أعاد المسؤول إدخال كلمة المرور الخاصة به',\n      not_required: 'غير مطلوب حسب الإعدادات في ذلك الوقت',",
    "    affectedStaff: 'الموظفون المتأثرون',\n    method: 'الطريقة',\n    source: 'المصدر',\n    company: 'الشركة',\n    pinnedFrom: 'الشروط مأخوذة من',\n    values: {\n      own_password: 'أعاد المسؤول إدخال كلمة المرور الخاصة به',\n      not_required: 'غير مطلوب حسب الإعدادات في ذلك الوقت',",
  ],
  [
    'scripts/write-audit-action-labels.mjs',
    'write-audit-action-labels.mjs (8/8)',
    "      invitation: 'عن طريق دعوة',\n      password: 'بكلمة مرور محددة مباشرة',\n      'bootstrap-cli': 'أمر إنشاء أول مسؤول',\n    },\n    yes: 'نعم',\n    no: 'لا',",
    "      invitation: 'عن طريق دعوة',\n      password: 'بكلمة مرور محددة مباشرة',\n      'bootstrap-cli': 'أمر إنشاء أول مسؤول',\n      GLOBAL: 'قواعد المنصة العامة',\n      COMPANY: 'القواعد الخاصة بالشركة',\n    },\n    yes: 'نعم',\n    no: 'لا',",
  ],
];

const files = new Map();
const crlf = new Set();
const plan = [];

for (const [file, name, from, to] of EDITS) {
  const path = join(ROOT, file);
  if (!files.has(path)) {
    const raw = readFileSync(path, 'utf8');
    if (raw.includes('\r\n')) crlf.add(path);
    files.set(path, raw.replace(/\r\n/g, '\n'));
  }
  const source = files.get(path);

  // Already applied when the new text is there and the old text is either
  // gone, or only present because it sits inside the new text — the shape of
  // an edit that adds lines. (A deletion leaves its new text inside its old,
  // so the old text being present is what says it has not been applied.)
  const applied = source.includes(to) && (!source.includes(from) || to.includes(from));

  if (applied) {
    plan.push(`skip   ${name} (already applied)`);
    continue;
  }

  const hits = source.split(from).length - 1;
  if (hits !== 1) {
    console.error(`STOPPED: ${name} expected its text once in ${file}, found it ${hits} times.`);
    console.error('Nothing has been written. Check that file matches the end of Phase 19.');
    process.exit(1);
  }

  files.set(path, source.replace(from, to));
  plan.push(`apply  ${name}`);
}

for (const [path, source] of files) {
  writeFileSync(path, crlf.has(path) ? source.replace(/\n/g, '\r\n') : source, 'utf8');
}

for (const line of plan) console.log(line);
console.log('\nDone. Next: node scripts/write-audit-action-labels.mjs');
