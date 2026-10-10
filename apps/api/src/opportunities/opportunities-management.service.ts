import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  acceptsInvestment,
  validateOpportunity,
  type CompanyStatus,
  type CompanyType,
  type CompanyVerification,
  type OpportunityStatus,
} from '@afaq/types';

import type { PrismaTransactionClient } from '@afaq/database';
import type { AuditJsonObject, AuditJsonValue } from '../audit/audit-json.js';
import type { StaffContext } from '../auth/staff-context.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateOpportunityDto,
  OpportunityNoteDto,
  OpportunityReasonDto,
  UpdateOpportunityDto,
} from './dto/write-opportunity.dto.js';
import {
  assertCompanyChangeable,
  assertDeletable,
  assertEditable,
  assertMove,
  changedMeanwhile,
  firstFreeSlug,
  noLadderToPin,
  OPPORTUNITY_MOVES,
  opportunityRejection,
  slugBaseFromTitle,
  type OpportunityMove,
} from './opportunity-policy.js';

/** The key a live global ladder carries; a company's live ladder uses its id. */
const GLOBAL_SCOPE_KEY = 'GLOBAL';
function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}
/** What the write side needs to know about a raise before changing it. */
interface TargetOpportunity {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  coverImageUrl: string | null;
  status: string;
  companyId: string;
  ruleSetId: string | null;
  targetAmount: unknown;
  committedAmount: unknown;
  opensAt: Date | null;
  closesAt: Date | null;
  isFeatured: boolean;
  displayOrder: number;
  company: {
    name: string;
    type: string;
    status: string;
    verification: string;
  };
}
const TARGET_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  description: true,
  coverImageUrl: true,
  status: true,
  companyId: true,
  ruleSetId: true,
  targetAmount: true,
  committedAmount: true,
  opensAt: true,
  closesAt: true,
  isFeatured: true,
  displayOrder: true,
  company: { select: { name: true, type: true, status: true, verification: true } },
} as const;
/**

 * What each move is called in the audit trail.

 *

 * Verbs, so each entry reads as something somebody did. Spelled out rather

 * than derived from the status, because two moves end at OPEN and must not

 * share a name — and so renaming a status never silently renames history.

 * Every value is in AUDIT_ACTIONS, which audit-actions.spec.ts enforces.

 */
const MOVE_ACTIONS: Record<OpportunityMove, string> = {
  open: 'opportunity.opened',
  suspend: 'opportunity.suspended',
  resume: 'opportunity.resumed',
  close: 'opportunity.closed',
  cancel: 'opportunity.cancelled',
};
/** The fields an edit may carry, in the order the audit entry lists them. */
const EDITABLE_FIELDS = [
  'companyId',
  'title',
  'summary',
  'description',
  'coverImageUrl',
  'targetAmount',
  'closesAt',
  'isFeatured',
  'displayOrder',
] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];
/**

 * A value as it should appear in an audit entry.

 *

 * Dates as ISO strings and Decimals as numbers, so the entry reads the same

 * years from now without the code that wrote it. Everything an opportunity

 * edit can carry is one of these shapes; anything else would be a bug, and is

 * recorded as null rather than as something unreadable.

 */
function auditValue(value: unknown): AuditJsonValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  // A Prisma Decimal, which stringifies to its exact value.
  if (typeof value === 'object' && 'toFixed' in value) return toNumber(value);
  return null;
}
/** Whether two stored-or-submitted values are the same value. */
function sameValue(stored: unknown, next: unknown): boolean {
  if (stored instanceof Date || next instanceof Date) {
    const a = stored instanceof Date ? stored.getTime() : stored;
    const b = next instanceof Date ? next.getTime() : next;
    return a === b;
  }
  // A Decimal from the database against a number from the request.
  if (typeof next === 'number') return toNumber(stored) === next;
  return stored === next;
}
/**

 * Changing opportunities.

 *

 * Every change has the same shape: load the raise, ask the policy whether it

 * is allowed, then apply it in one transaction together with its audit entry.

 * A change without its audit record is worse than no change at all, because

 * the trail then lies by omission.

 *

 * Status changes go further and are written conditionally — "move it to OPEN

 * if it is still DRAFT". Two administrators pressing the same button at the

 * same moment then produce one change and one audit entry, and the second is

 * told somebody beat them to it, rather than both succeeding.

 */
@Injectable()
export class OpportunitiesManagementService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    actor: StaffContext,
    input: CreateOpportunityDto,
  ): Promise<{
    id: string;
  }> {
    const company = await this.requireCompany(input.companyId);
    const minimumInvestment = await this.minimumInvestment();
    const issues = validateOpportunity(
      {
        companyId: input.companyId,
        title: input.title,
        targetAmount: input.targetAmount,
        closesAt: input.closesAt ?? null,
      },
      {
        minimumInvestment,
        currentStatus: null,
        committedAmount: 0,
        previousTarget: null,
        // Only asked when opening; a draft may belong to a company that is not
        // yet able to take money.
        companyAcceptsInvestment: true,
        hasLiveLadder: true,
        opensAt: null,
        now: new Date(),
      },
    );
    if (issues.length > 0) throw opportunityRejection(issues);
    const slug = await this.freeSlug(slugBaseFromTitle(input.title));
    try {
      const created = await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
        const opportunity = await tx.investmentOpportunity.create({
          data: {
            slug,
            companyId: input.companyId,
            title: input.title,
            summary: input.summary ?? null,
            description: input.description ?? null,
            coverImageUrl: input.coverImageUrl ?? null,
            status: 'DRAFT',
            targetAmount: input.targetAmount,
            closesAt: input.closesAt ?? null,
            isFeatured: input.isFeatured ?? false,
            displayOrder: input.displayOrder ?? 0,
            createdById: actor.staffUserId,
          },
          select: { id: true },
        });
        await tx.auditLog.create({
          data: {
            actorStaffUserId: actor.staffUserId,
            actorEmail: actor.email,
            category: 'OPPORTUNITY',
            action: 'opportunity.created',
            targetType: 'InvestmentOpportunity',
            targetId: opportunity.id,
            targetLabel: input.title,
            after: {
              slug,
              title: input.title,
              companyId: input.companyId,
              targetAmount: input.targetAmount,
              closesAt: auditValue(input.closesAt ?? null),
            },
            metadata: { company: company.name },
          },
        });
        return opportunity;
      });
      return { id: created.id };
    } catch (error) {
      // The slug was free when checked and taken by the time it was written:
      // two raises with the same title created in the same instant. The unique
      // index is what caught it; the person only needs to press save again.
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          reason: 'slug_race',
          field: 'title',
          message:
            'Another opportunity with that title was created at the same moment. Save again.',
        });
      }
      throw error;
    }
  }
  /**
   * Editing a raise.
   *
   * A draft may change anything. Once opened, the description and closing
   * date may still change, the target may rise but not fall, and the company
   * may not change at all. A finished raise may not change. The slug never
   * follows the title, so saved links keep working.
   */
  async update(
    actor: StaffContext,
    id: string,
    input: UpdateOpportunityDto,
  ): Promise<{
    id: string;
  }> {
    const target = await this.loadTarget(id);
    const status = target.status as OpportunityStatus;
    assertEditable(status);
    const before: AuditJsonObject = {};
    const changes: Record<string, string | number | boolean | Date | null> = {};
    for (const field of EDITABLE_FIELDS) {
      const next = input[field];
      if (next === undefined) continue;
      const stored = target[field as EditableField];
      if (sameValue(stored, next)) continue;
      changes[field] = next;
      before[field] = auditValue(stored);
    }
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException({ reason: 'no_change', message: 'Nothing to change.' });
    }
    if (changes.companyId !== undefined) {
      assertCompanyChangeable(status);
      await this.requireCompany(changes.companyId as string);
    }
    // A running raise cannot be given a closing date in the past.
    // Use the same structured issue shape as the shared validator so the
    // caller can display the translated `close_in_past` issue and the API
    // test can recognize the refusal. Drafts may retain an old deadline.
    const changedClosingDate = changes.closesAt;
    if (
      (status === 'OPEN' || status === 'SUSPENDED') &&
      changedClosingDate !== undefined &&
      changedClosingDate !== null &&
      (changedClosingDate as Date).getTime() <= Date.now()
    ) {
      throw opportunityRejection([
        {
          code: 'close_in_past',
          field: 'closesAt',
          message: 'A running opportunity cannot have its closing date moved into the past.',
        },
      ]);
    }
    const issues = validateOpportunity(
      {
        companyId: (changes.companyId as string | undefined) ?? target.companyId,
        title: (changes.title as string | undefined) ?? target.title,
        targetAmount: (changes.targetAmount as number | undefined) ?? toNumber(target.targetAmount),
        closesAt:
          changes.closesAt !== undefined ? (changes.closesAt as Date | null) : target.closesAt,
      },
      {
        minimumInvestment: await this.minimumInvestment(),
        currentStatus: status,
        committedAmount: toNumber(target.committedAmount),
        previousTarget: toNumber(target.targetAmount),
        companyAcceptsInvestment: true,
        hasLiveLadder: true,
        opensAt: target.opensAt,
        now: new Date(),
      },
    );
    if (issues.length > 0) throw opportunityRejection(issues);
    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.investmentOpportunity.update({ where: { id }, data: changes });
      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'OPPORTUNITY',
          action: 'opportunity.updated',
          targetType: 'InvestmentOpportunity',
          targetId: target.id,
          targetLabel: target.title,
          before,
          after: Object.fromEntries(
            Object.entries(changes).map(([key, value]) => [key, auditValue(value)]),
          ),
          // The slug deliberately does not follow the title; worth recording
          // so nobody later reads the mismatch as a bug.
          ...(changes.title !== undefined ? { metadata: { slugUnchanged: target.slug } } : {}),
        },
      });
    });
    return { id };
  }
  /**
   * Opens a draft to investors, pinning the terms it will be sold under.
   *
   * The ladder is resolved *inside* the transaction — the company's own live
   * ladder if it has one, otherwise the platform-wide one — so the version
   * pinned is the one that is live at the instant the raise opens, even if a
   * new version was published while the administrator was reading the form.
   */
  async open(
    actor: StaffContext,
    id: string,
    input: OpportunityNoteDto,
  ): Promise<{
    id: string;
  }> {
    const target = await this.loadTarget(id);
    assertMove('open', target.status as OpportunityStatus);
    // Checked here as well as inside the transaction, so the refusal arrives
    // with every reason at once rather than the first one the write trips on.
    const hasLiveLadder = (await this.liveLadder(this.prisma.db, target.companyId)) !== null;
    const issues = validateOpportunity(
      {
        companyId: target.companyId,
        title: target.title,
        targetAmount: toNumber(target.targetAmount),
        closesAt: target.closesAt,
      },
      {
        minimumInvestment: await this.minimumInvestment(),
        currentStatus: 'DRAFT',
        committedAmount: toNumber(target.committedAmount),
        previousTarget: null,
        companyAcceptsInvestment: companyAccepts(target.company),
        hasLiveLadder,
        opensAt: null,
        now: new Date(),
      },
      { opening: true },
    );
    if (issues.length > 0) throw opportunityRejection(issues);
    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      const ladder = await this.liveLadder(tx, target.companyId);
      if (!ladder) throw noLadderToPin();
      await this.move(tx, actor, target, 'open', {
        data: { ruleSetId: ladder.id, opensAt: new Date(), openedById: actor.staffUserId },
        after: {
          ruleSetId: ladder.id,
          pinnedRuleSet: `${ladder.name} v${ladder.version}`,
          targetAmount: toNumber(target.targetAmount),
          closesAt: auditValue(target.closesAt),
        },
        metadata: { pinnedFrom: ladder.scope, ...(input.reason ? { reason: input.reason } : {}) },
      });
    });
    return { id };
  }
  /** Halts a running raise. Still visible; not accepting. */
  async suspend(
    actor: StaffContext,
    id: string,
    input: OpportunityReasonDto,
  ): Promise<{
    id: string;
  }> {
    const target = await this.loadTarget(id);
    assertMove('suspend', target.status as OpportunityStatus);
    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await this.move(tx, actor, target, 'suspend', { metadata: { reason: input.reason } });
    });
    return { id };
  }
  /**
   * Resumes a suspended raise, on the terms it was pinned to.
   *
   * Never re-pins: investors saw this raise priced one way, and resuming it
   * must not quietly re-price it. It does re-check what could have changed
   * while it was halted — the company's standing, and the closing date.
   */
  async resume(
    actor: StaffContext,
    id: string,
    input: OpportunityNoteDto,
  ): Promise<{
    id: string;
  }> {
    const target = await this.loadTarget(id);
    assertMove('resume', target.status as OpportunityStatus);
    const issues = validateOpportunity(
      {
        companyId: target.companyId,
        title: target.title,
        targetAmount: toNumber(target.targetAmount),
        closesAt: target.closesAt,
      },
      {
        minimumInvestment: await this.minimumInvestment(),
        currentStatus: 'SUSPENDED',
        committedAmount: toNumber(target.committedAmount),
        previousTarget: null,
        companyAcceptsInvestment: companyAccepts(target.company),
        // Already pinned at opening; nothing is resolved now.
        hasLiveLadder: target.ruleSetId !== null,
        opensAt: target.opensAt,
        now: new Date(),
      },
      { opening: true },
    );
    if (issues.length > 0) throw opportunityRejection(issues);
    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await this.move(tx, actor, target, 'resume', {
        ...(input.reason ? { metadata: { reason: input.reason } } : {}),
      });
    });
    return { id };
  }
  /** Finishes a raise. Terminal: a raise that needs to run again is a new one. */
  async close(
    actor: StaffContext,
    id: string,
    input: OpportunityNoteDto,
  ): Promise<{
    id: string;
  }> {
    const target = await this.loadTarget(id);
    assertMove('close', target.status as OpportunityStatus);
    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await this.move(tx, actor, target, 'close', {
        data: { closedAt: new Date(), closedById: actor.staffUserId },
        ...(input.reason ? { metadata: { reason: input.reason } } : {}),
      });
    });
    return { id };
  }
  /** Withdraws a raise. Terminal, and the reason is required. */
  async cancel(
    actor: StaffContext,
    id: string,
    input: OpportunityReasonDto,
  ): Promise<{
    id: string;
  }> {
    const target = await this.loadTarget(id);
    assertMove('cancel', target.status as OpportunityStatus);
    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await this.move(tx, actor, target, 'cancel', {
        data: { closedAt: new Date(), closedById: actor.staffUserId },
        metadata: { reason: input.reason },
      });
    });
    return { id };
  }
  /** Discards a draft. Only ever a draft — anything opened is part of the record. */
  async deleteDraft(
    actor: StaffContext,
    id: string,
  ): Promise<{
    id: string;
  }> {
    const target = await this.loadTarget(id);
    assertDeletable(target.status as OpportunityStatus);
    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      // Conditional, so a draft opened a moment ago by somebody else is not
      // deleted out from under the investors who can now see it.
      const { count } = await tx.investmentOpportunity.deleteMany({
        where: { id, status: 'DRAFT' },
      });
      if (count !== 1) throw changedMeanwhile();
      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'OPPORTUNITY',
          action: 'opportunity.draft_deleted',
          targetType: 'InvestmentOpportunity',
          // The row is gone, so the id would dangle; the label and the
          // snapshot are what still say what was discarded.
          targetId: null,
          targetLabel: target.title,
          before: {
            title: target.title,
            companyId: target.companyId,
            targetAmount: toNumber(target.targetAmount),
          },
          metadata: { company: target.company.name },
        },
      });
    });
    return { id };
  }
  // =========================================================================
  // SHARED
  // =========================================================================
  /**
   * One status change and its audit entry.
   *
   * The update is conditional on the status still being what was loaded, so
   * a race produces one change and one entry rather than two. Called inside
   * the caller's transaction, so throwing here rolls back everything.
   */
  private async move(
    tx: PrismaTransactionClient,
    actor: StaffContext,
    target: TargetOpportunity,
    move: OpportunityMove,
    extra: {
      /** Exactly the columns a move may set beyond the status, and no others. */
      data?: {
        ruleSetId?: string;
        opensAt?: Date;
        openedById?: string;
        closedAt?: Date;
        closedById?: string;
      };
      after?: AuditJsonObject;
      metadata?: AuditJsonObject;
    } = {},
  ): Promise<void> {
    const to = OPPORTUNITY_MOVES[move].to;
    const { count } = await tx.investmentOpportunity.updateMany({
      where: { id: target.id, status: target.status as OpportunityStatus },
      data: { status: to, ...(extra.data ?? {}) },
    });
    if (count !== 1) throw changedMeanwhile();
    await tx.auditLog.create({
      data: {
        actorStaffUserId: actor.staffUserId,
        actorEmail: actor.email,
        category: 'OPPORTUNITY',
        action: MOVE_ACTIONS[move],
        targetType: 'InvestmentOpportunity',
        targetId: target.id,
        targetLabel: target.title,
        before: { status: target.status },
        after: { status: to, ...(extra.after ?? {}) },
        ...(extra.metadata ? { metadata: extra.metadata } : {}),
      },
    });
  }
  /**
   * The ladder that is live for this company right now, or null.
   *
   * Its own if it has one, otherwise the platform-wide one — the same rule
   * InvestmentRulesService.activeFor applies. Looked up by `activeKey`, the
   * unique column that guarantees at most one live ladder per scope.
   */
  private async liveLadder(
    // The transaction client's type, which the full client also satisfies —
    // so this works inside a transaction and outside one without a union,
    // which TypeScript cannot call Prisma's generic methods through.
    client: PrismaTransactionClient,
    companyId: string,
  ): Promise<{
    id: string;
    name: string;
    version: number;
    scope: string;
  } | null> {
    const select = { id: true, name: true, version: true, scope: true } as const;
    const own = await client.investmentRuleSet.findUnique({
      where: { activeKey: companyId },
      select,
    });
    if (own) return own;
    return client.investmentRuleSet.findUnique({ where: { activeKey: GLOBAL_SCOPE_KEY }, select });
  }
  private async loadTarget(id: string): Promise<TargetOpportunity> {
    const target: TargetOpportunity | null = await this.prisma.db.investmentOpportunity.findUnique({
      where: { id },
      select: TARGET_SELECT,
    });
    if (!target) {
      throw new NotFoundException({
        reason: 'not_found',
        message: 'That opportunity no longer exists.',
      });
    }
    return target;
  }
  private async requireCompany(companyId: string): Promise<{
    id: string;
    name: string;
  }> {
    const company = await this.prisma.db.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });
    if (!company) {
      throw new BadRequestException({
        reason: 'unknown_company',
        field: 'companyId',
        message: 'That company does not exist.',
      });
    }
    return company;
  }
  /** The platform minimum, read fresh: an administrator may have changed it. */
  private async minimumInvestment(): Promise<number> {
    const settings = await this.prisma.db.investmentSettings.findUnique({
      where: { id: 'global' },
      select: { minimumInvestment: true },
    });
    if (!settings) {
      throw new NotFoundException({
        reason: 'not_seeded',
        message: 'Investment settings have not been created yet. Run the database seed.',
      });
    }
    return toNumber(settings.minimumInvestment);
  }
  /** The first free slug for this title. */
  private async freeSlug(base: string): Promise<string> {
    const rows: Array<{
      slug: string;
    }> = await this.prisma.db.investmentOpportunity.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    return firstFreeSlug(base, new Set(rows.map((row) => row.slug)));
  }
}
function companyAccepts(company: { type: string; status: string; verification: string }): boolean {
  return acceptsInvestment({
    type: company.type as CompanyType,
    status: company.status as CompanyStatus,
    verification: company.verification as CompanyVerification,
  });
}
/** Prisma's unique-constraint failure, recognised without importing Prisma. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (
      error as {
        code?: unknown;
      }
    ).code === 'P2002'
  );
}
