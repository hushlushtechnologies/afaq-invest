import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  validateTierLadder,
  type LadderContext,
  type RoiBasis,
  type RuleSetStatus,
  type TierDraft,
} from '@afaq/types';
import type { PrismaTransactionClient } from '@afaq/database';
import type { StaffContext } from '../auth/staff-context.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ArchiveRuleSetDto,
  CreateRuleSetDto,
  PublishRuleSetDto,
  ReplaceLadderDto,
  UpdateInvestmentSettingsDto,
  UpdateRuleSetDto,
} from './dto/write-rule-set.dto.js';
import {
  assertArchivable,
  assertDeletable,
  assertEditable,
  assertPublishable,
  ladderRejection,
  scopeKeyFor,
} from './investment-rules-policy.js';
import { StepUpService } from './step-up.service.js';

/** What the write side needs to know about a rule set before changing it. */
interface TargetRuleSet {
  id: string;
  name: string;
  version: number;
  scope: string;
  companyId: string | null;
  scopeKey: string;
  status: string;
  roiBasis: string;
  notes: string | null;
}

const TARGET_SELECT = {
  id: true,
  name: true,
  version: true,
  scope: true,
  companyId: true,
  scopeKey: true,
  status: true,
  roiBasis: true,
  notes: true,
} as const;

/** The tier shape the shared validator takes, read back from the database. */
interface StoredTier {
  name: string;
  minAmount: unknown;
  maxAmount: unknown;
  options: Array<{
    mode: string;
    roiPercent: unknown;
    payoutFrequency: string;
    minTermMonths: number | null;
    maxTermMonths: number | null;
    noticePeriodDays: number;
    earnsDuringNotice: boolean;
  }>;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

/** Tens, so a tier can be inserted between two others later. */
const ORDER_STEP = 10;

type AuditJsonValue = string | number | boolean | null | AuditJsonObject | AuditJsonValue[];

interface AuditJsonObject {
  [key: string]: AuditJsonValue;
}

/**
 * Changing investment rules.
 *
 * Every change follows the shape the companies module established: load the
 * record, ask the policy whether it is allowed, then apply it in one
 * transaction together with its audit entry. The transaction matters more
 * here than anywhere else — a rate change without its audit record leaves no
 * way to answer what somebody was sold and who decided it.
 *
 * The one rule underneath all of this: a live ladder is never edited. Changing
 * the rules means publishing a new version, and the old one is archived rather
 * than overwritten, because existing investments point at it.
 */
@Injectable()
export class InvestmentRulesManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stepUp: StepUpService,
  ) {}

  // =========================================================================
  // SETTINGS
  // =========================================================================

  async updateSettings(
    actor: StaffContext,
    input: UpdateInvestmentSettingsDto,
  ): Promise<{ id: string }> {
    const current = await this.prisma.db.investmentSettings.findUnique({
      where: { id: 'global' },
      select: {
        currency: true,
        minimumInvestment: true,
        maxRoiPercent: true,
        maxRoiBasis: true,
        defaultNoticePeriodDays: true,
        requireStepUpToPublish: true,
      },
    });

    if (!current) {
      throw new NotFoundException({
        reason: 'not_seeded',
        message: 'Investment settings have not been created yet. Run the database seed.',
      });
    }

    const before: AuditJsonObject = {};
    const changes: AuditJsonObject = {};

    const stored = {
      currency: current.currency,
      minimumInvestment: toNumber(current.minimumInvestment),
      maxRoiPercent: toNumber(current.maxRoiPercent),
      maxRoiBasis: current.maxRoiBasis,
      defaultNoticePeriodDays: current.defaultNoticePeriodDays,
      requireStepUpToPublish: current.requireStepUpToPublish,
    };

    for (const field of [
      'currency',
      'minimumInvestment',
      'maxRoiPercent',
      'maxRoiBasis',
      'defaultNoticePeriodDays',
      'requireStepUpToPublish',
    ] as const) {
      const next = input[field];
      if (next === undefined) continue;
      if (next === stored[field]) continue;

      changes[field] = next;
      before[field] = stored[field];
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException({ reason: 'no_change', message: 'Nothing to change.' });
    }

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.investmentSettings.update({
        where: { id: 'global' },
        data: { ...changes, updatedById: actor.staffUserId },
      });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'INVESTMENT_RULE',
          // Named separately when the control itself is switched off: that is
          // the single most security-relevant thing anybody can do here, and
          // it should not hide inside a generic "settings changed".
          action:
            changes.requireStepUpToPublish === false
              ? 'investment_rule.step_up_disabled'
              : 'investment_rule.settings_changed',
          targetType: 'InvestmentSettings',
          targetId: 'global',
          targetLabel: 'Investment settings',
          before,
          after: changes,
        },
      });
    });

    return { id: 'global' };
  }

  // =========================================================================
  // DRAFTS
  // =========================================================================

  /**
   * Starts a new draft, optionally copying an existing ladder.
   *
   * Copying is how a live ladder is actually changed: clone it, edit the
   * clone, publish it. The live one keeps serving investors the whole time and
   * is archived only at the moment the new version goes out.
   */
  async createDraft(actor: StaffContext, input: CreateRuleSetDto): Promise<{ id: string }> {
    const companyId = input.companyId ?? null;
    const scopeKey = scopeKeyFor(input.scope, companyId);

    if (companyId) {
      const company = await this.prisma.db.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });

      if (!company) {
        throw new NotFoundException({
          reason: 'company_not_found',
          field: 'companyId',
          message: 'That company no longer exists.',
        });
      }
    }

    const tiers = input.fromRuleSetId ? await this.loadTiersToCopy(input.fromRuleSetId) : [];

    // Versions are numbered per ladder line, so a company's first ladder is
    // its own v1 rather than continuing the global numbering.
    const highest = await this.prisma.db.investmentRuleSet.findFirst({
      where: { scopeKey },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const version = (highest?.version ?? 0) + 1;

    const created = await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      const ruleSet = await tx.investmentRuleSet.create({
        data: {
          name: input.name,
          version,
          scope: input.scope,
          companyId,
          scopeKey,
          status: 'DRAFT',
          roiBasis: input.roiBasis,
          notes: input.notes ?? null,
          // Null until published. The unique index on this column is what
          // keeps two live ladders from existing at once, and a draft is not
          // live.
          activeKey: null,
          createdById: actor.staffUserId,
          tiers: {
            create: tiers.map((tier, index) => ({
              name: tier.name,
              minAmount: tier.minAmount,
              maxAmount: tier.maxAmount,
              displayOrder: (index + 1) * ORDER_STEP,
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
        select: { id: true, name: true, version: true },
      });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'INVESTMENT_RULE',
          action: 'investment_rule.draft_created',
          targetType: 'InvestmentRuleSet',
          targetId: ruleSet.id,
          targetLabel: `${ruleSet.name} v${ruleSet.version}`,
          after: {
            name: ruleSet.name,
            version: ruleSet.version,
            scope: input.scope,
            companyId,
            roiBasis: input.roiBasis,
            tierCount: tiers.length,
          },
          ...(input.fromRuleSetId ? { metadata: { copiedFrom: input.fromRuleSetId } } : {}),
        },
      });

      return ruleSet;
    });

    return { id: created.id };
  }

  /** Renaming a draft, or changing its basis or notes. Not its tiers. */
  async updateDraft(
    actor: StaffContext,
    id: string,
    input: UpdateRuleSetDto,
  ): Promise<{ id: string }> {
    const target = await this.loadTarget(id);
    assertEditable(target.status as RuleSetStatus);

    const before: AuditJsonObject = {};
    const changes: AuditJsonObject = {};

    for (const field of ['name', 'roiBasis', 'notes'] as const) {
      const next = input[field];
      if (next === undefined) continue;
      if (next === target[field]) continue;

      changes[field] = next;
      before[field] = target[field];
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException({ reason: 'no_change', message: 'Nothing to change.' });
    }

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.investmentRuleSet.update({ where: { id }, data: changes });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'INVESTMENT_RULE',
          action: 'investment_rule.draft_updated',
          targetType: 'InvestmentRuleSet',
          targetId: target.id,
          targetLabel: `${target.name} v${target.version}`,
          before,
          after: changes,
        },
      });
    });

    return { id };
  }

  /**
   * Replaces a draft's whole ladder.
   *
   * Whole, not tier by tier: contiguity is a property of the set, so a ladder
   * is only ever valid or invalid as one thing. Accepting a single tier would
   * mean either checking nothing or rejecting an edit that was on its way to
   * being correct.
   */
  async replaceLadder(
    actor: StaffContext,
    id: string,
    input: ReplaceLadderDto,
  ): Promise<{ id: string; tierCount: number }> {
    const target = await this.loadTarget(id);
    assertEditable(target.status as RuleSetStatus);

    const tiers: TierDraft[] = input.tiers.map((tier) => ({
      name: tier.name,
      minAmount: tier.minAmount,
      maxAmount: tier.maxAmount ?? null,
      options: tier.options.map((option) => ({
        mode: option.mode,
        roiPercent: option.roiPercent,
        payoutFrequency: option.payoutFrequency,
        minTermMonths: option.minTermMonths ?? null,
        maxTermMonths: option.maxTermMonths ?? null,
        noticePeriodDays: option.noticePeriodDays,
        earnsDuringNotice: option.earnsDuringNotice,
      })),
    }));

    const context = await this.ladderContext(target.roiBasis as RoiBasis);
    const issues = validateTierLadder(tiers, context);

    if (issues.length > 0) throw ladderRejection(issues);

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      // Deleting the tiers cascades to their options, so the draft is empty
      // before it is refilled. Inside the transaction, so nobody ever reads a
      // half-written ladder.
      await tx.investmentTier.deleteMany({ where: { ruleSetId: id } });

      for (const [index, tier] of tiers.entries()) {
        await tx.investmentTier.create({
          data: {
            ruleSetId: id,
            name: tier.name,
            minAmount: tier.minAmount,
            maxAmount: tier.maxAmount,
            displayOrder: (index + 1) * ORDER_STEP,
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
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'INVESTMENT_RULE',
          action: 'investment_rule.ladder_replaced',
          targetType: 'InvestmentRuleSet',
          targetId: target.id,
          targetLabel: `${target.name} v${target.version}`,
          after: { tiers: summarise(tiers) },
        },
      });
    });

    return { id, tierCount: tiers.length };
  }

  /**
   * Publishes a draft, archiving whatever it replaces.
   *
   * Three things happen together or not at all: the old ladder is stood down,
   * the new one goes live, and the audit entry records who did it. Half of
   * that would leave either two live ladders or none.
   *
   * The ladder is re-validated here even though it was checked when it was
   * written — the settings it is judged against may have moved since, and a
   * cap lowered after a draft was prepared should stop the draft going out.
   */
  async publish(
    actor: StaffContext,
    id: string,
    input: PublishRuleSetDto,
  ): Promise<{ id: string; version: number }> {
    const target = await this.loadTarget(id);
    assertPublishable(target.status as RuleSetStatus);

    const settings = await this.requireSettings();

    if (settings.requireStepUpToPublish) {
      try {
        await this.stepUp.verifyPassword(actor.email, input.password);
      } catch (error) {
        // A refused attempt to change what the business owes people is worth
        // recording even though nothing changed. SECURITY rather than
        // INVESTMENT_RULE: nothing about the rules happened, someone failed
        // to get through a door.
        await this.prisma.db.auditLog.create({
          data: {
            actorStaffUserId: actor.staffUserId,
            actorEmail: actor.email,
            category: 'SECURITY',
            action: 'investment_rule.publish_refused',
            targetType: 'InvestmentRuleSet',
            targetId: target.id,
            targetLabel: `${target.name} v${target.version}`,
            // No password, no token, nothing but the fact of the refusal.
            metadata: { reason: 'step_up_failed' },
          },
        });

        throw error;
      }
    }

    const stored = await this.loadTiersToCopy(id);

    if (stored.length === 0) {
      throw new BadRequestException({
        reason: 'empty_ladder',
        message: 'This draft has no tiers yet, so there is nothing to publish.',
      });
    }

    const context = await this.ladderContext(target.roiBasis as RoiBasis);
    const issues = validateTierLadder(stored, context);

    if (issues.length > 0) throw ladderRejection(issues);

    const now = new Date();

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      // Stand the old one down first. The unique index on activeKey would
      // refuse the new one otherwise, which is the index doing its job.
      const outgoing = await tx.investmentRuleSet.findUnique({
        where: { activeKey: target.scopeKey },
        select: { id: true, name: true, version: true },
      });

      if (outgoing) {
        await tx.investmentRuleSet.update({
          where: { id: outgoing.id },
          data: { status: 'ARCHIVED', activeKey: null, effectiveTo: now },
        });
      }

      await tx.investmentRuleSet.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          activeKey: target.scopeKey,
          effectiveFrom: now,
          effectiveTo: null,
          publishedById: actor.staffUserId,
          publishedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'INVESTMENT_RULE',
          action: 'investment_rule.published',
          targetType: 'InvestmentRuleSet',
          targetId: target.id,
          targetLabel: `${target.name} v${target.version}`,
          // The whole ladder, as published. This is the record somebody will
          // come back to in two years to establish what was on offer.
          before: outgoing
            ? { replaced: `${outgoing.name} v${outgoing.version}`, replacedId: outgoing.id }
            : { replaced: null },
          after: { scope: target.scope, roiBasis: target.roiBasis, tiers: summarise(stored) },
          metadata: {
            stepUp: settings.requireStepUpToPublish ? 'own_password' : 'not_required',
            ...(input.reason ? { reason: input.reason } : {}),
          },
        },
      });
    });

    return { id, version: target.version };
  }

  /**
   * Takes the live ladder out of service.
   *
   * Leaves nothing live for that scope, so pricing stops until something else
   * is published — which is why it is a deliberate act with its own endpoint
   * rather than a side effect of anything.
   */
  async archive(
    actor: StaffContext,
    id: string,
    input: ArchiveRuleSetDto,
  ): Promise<{ id: string }> {
    const target = await this.loadTarget(id);
    assertArchivable(target.status as RuleSetStatus);

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.investmentRuleSet.update({
        where: { id },
        data: { status: 'ARCHIVED', activeKey: null, effectiveTo: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'INVESTMENT_RULE',
          action: 'investment_rule.archived',
          targetType: 'InvestmentRuleSet',
          targetId: target.id,
          targetLabel: `${target.name} v${target.version}`,
          before: { status: target.status },
          after: { status: 'ARCHIVED' },
          metadata: {
            scope: target.scope,
            leavesNothingLive: true,
            ...(input.reason ? { reason: input.reason } : {}),
          },
        },
      });
    });

    return { id };
  }

  /** Discards a draft. Only ever a draft — see assertDeletable. */
  async deleteDraft(actor: StaffContext, id: string): Promise<{ id: string }> {
    const target = await this.loadTarget(id);
    assertDeletable(target.status as RuleSetStatus);

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      // Cascades to the tiers and their options.
      await tx.investmentRuleSet.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'INVESTMENT_RULE',
          action: 'investment_rule.draft_deleted',
          targetType: 'InvestmentRuleSet',
          // The row is gone, so the id would dangle; the label is what still
          // says what was discarded.
          targetId: null,
          targetLabel: `${target.name} v${target.version}`,
          before: { name: target.name, version: target.version, scope: target.scope },
        },
      });
    });

    return { id };
  }

  // =========================================================================
  // SHARED
  // =========================================================================

  private async loadTarget(id: string): Promise<TargetRuleSet> {
    const target: TargetRuleSet | null = await this.prisma.db.investmentRuleSet.findUnique({
      where: { id },
      select: TARGET_SELECT,
    });

    if (!target) {
      throw new NotFoundException({
        reason: 'not_found',
        message: 'That rule set no longer exists.',
      });
    }

    return target;
  }

  private async requireSettings(): Promise<{
    minimumInvestment: number;
    maxRoiPercent: number;
    maxRoiBasis: RoiBasis;
    requireStepUpToPublish: boolean;
  }> {
    const row = await this.prisma.db.investmentSettings.findUnique({
      where: { id: 'global' },
      select: {
        minimumInvestment: true,
        maxRoiPercent: true,
        maxRoiBasis: true,
        requireStepUpToPublish: true,
      },
    });

    if (!row) {
      throw new NotFoundException({
        reason: 'not_seeded',
        message: 'Investment settings have not been created yet. Run the database seed.',
      });
    }

    return {
      minimumInvestment: toNumber(row.minimumInvestment),
      maxRoiPercent: toNumber(row.maxRoiPercent),
      maxRoiBasis: row.maxRoiBasis as RoiBasis,
      requireStepUpToPublish: row.requireStepUpToPublish,
    };
  }

  /** What a ladder is judged against: the settings as actually stored. */
  private async ladderContext(roiBasis: RoiBasis): Promise<LadderContext> {
    const settings = await this.requireSettings();

    return {
      roiBasis,
      minimumInvestment: settings.minimumInvestment,
      maxRoiPercent: settings.maxRoiPercent,
      maxRoiBasis: settings.maxRoiBasis,
    };
  }

  /** A rule set's tiers, in the shape the validator and the copier both take. */
  private async loadTiersToCopy(ruleSetId: string): Promise<TierDraft[]> {
    const rows: StoredTier[] = await this.prisma.db.investmentTier.findMany({
      where: { ruleSetId },
      orderBy: { displayOrder: 'asc' },
      select: {
        name: true,
        minAmount: true,
        maxAmount: true,
        options: {
          orderBy: { mode: 'asc' },
          select: {
            mode: true,
            roiPercent: true,
            payoutFrequency: true,
            minTermMonths: true,
            maxTermMonths: true,
            noticePeriodDays: true,
            earnsDuringNotice: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      name: row.name,
      minAmount: toNumber(row.minAmount),
      maxAmount: row.maxAmount === null ? null : toNumber(row.maxAmount),
      options: row.options.map((option) => ({
        mode: option.mode as TierDraft['options'][number]['mode'],
        roiPercent: toNumber(option.roiPercent),
        payoutFrequency: option.payoutFrequency as TierDraft['options'][number]['payoutFrequency'],
        minTermMonths: option.minTermMonths,
        maxTermMonths: option.maxTermMonths,
        noticePeriodDays: option.noticePeriodDays,
        earnsDuringNotice: option.earnsDuringNotice,
      })),
    }));
  }
}

/**
 * A ladder, small enough to live inside an audit entry.
 *
 * The rates and ranges, not the identifiers: this has to stay readable to
 * somebody looking at it years later who no longer has the rows to join to.
 */
function summarise(tiers: readonly TierDraft[]): AuditJsonValue[] {
  return tiers.map((tier) => ({
    name: tier.name,
    min: tier.minAmount,
    max: tier.maxAmount,
    options: tier.options.map((option) => ({
      mode: option.mode,
      roi: option.roiPercent,
      payout: option.payoutFrequency,
      term: [option.minTermMonths, option.maxTermMonths],
      notice: option.noticePeriodDays,
    })),
  }));
}
