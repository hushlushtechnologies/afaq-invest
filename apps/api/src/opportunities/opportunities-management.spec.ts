import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StaffContext } from '../auth/staff-context.types.js';
import { OpportunitiesManagementService } from './opportunities-management.service.js';

/**
 * The write side, against a stand-in database.
 *
 * Real service code making real decisions; only the storage is fake. Each
 * test reads back what was written — which ladder was pinned, which columns
 * changed, what the audit entry says — because those are the things that
 * matter years later, when somebody asks what an investor was offered.
 */

const ACTOR = {
  staffUserId: '11111111-1111-4111-8111-111111111111',
  authUserId: '22222222-2222-4222-8222-222222222222',
  email: 'manager@example.com',
  fullName: 'An Investment Manager',
  status: 'ACTIVE',
  roleKeys: ['INVESTMENT_MANAGER'],
  permissionKeys: [],
} as unknown as StaffContext;

const COMPANY_ID = 'c0000000-0000-4000-8000-000000000001';
const OPP_ID = 'a0000000-0000-4000-8000-000000000001';

const FUTURE = new Date(Date.now() + 90 * 86_400_000);
const PAST = new Date(Date.now() - 86_400_000);

interface Ladder {
  id: string;
  name: string;
  version: number;
  scope: string;
}

const GLOBAL_LADDER: Ladder = {
  id: 'r-global',
  name: 'Platform rates',
  version: 3,
  scope: 'GLOBAL',
};
const OWN_LADDER: Ladder = { id: 'r-own', name: 'Manzil rates', version: 1, scope: 'COMPANY' };

interface World {
  status?: string;
  ruleSetId?: string | null;
  targetAmount?: number;
  committedAmount?: number;
  closesAt?: Date | null;
  opensAt?: Date | null;
  company?: { name: string; type: string; status: string; verification: string };
  ladders?: { own?: Ladder; global?: Ladder };
  /** Simulates somebody else changing the row between load and write. */
  lostRace?: boolean;
  takenSlugs?: string[];
  noOpportunity?: boolean;
}

function makeService(world: World = {}) {
  const row = {
    id: OPP_ID,
    slug: 'al-jaddaf-tower',
    title: 'Al Jaddaf Tower',
    summary: null,
    description: null,
    coverImageUrl: null,
    status: world.status ?? 'DRAFT',
    companyId: COMPANY_ID,
    ruleSetId: world.ruleSetId ?? null,
    targetAmount: world.targetAmount ?? 5_000_000,
    committedAmount: world.committedAmount ?? 0,
    opensAt: world.opensAt ?? null,
    closesAt: world.closesAt === undefined ? FUTURE : world.closesAt,
    isFeatured: false,
    displayOrder: 0,
    company: world.company ?? {
      name: 'Afaq Al Manzil Properties',
      type: 'INTERNAL',
      status: 'ACTIVE',
      verification: 'NOT_REQUIRED',
    },
  };

  const ladders = world.ladders ?? { global: GLOBAL_LADDER };

  const findLadder = vi.fn(async ({ where }: { where: { activeKey: string } }) => {
    if (where.activeKey === 'GLOBAL') return ladders.global ?? null;
    if (where.activeKey === COMPANY_ID) return ladders.own ?? null;
    return null;
  });

  // Each records the one argument Prisma would receive, so the tests can read
  // back what was written. Typed, so reading it back typechecks.
  type Call = { where?: unknown; data?: unknown };
  const create = vi.fn(async (_call: Call) => ({ id: 'new-id' }));
  const update = vi.fn(async (_call: Call) => ({}));
  const updateMany = vi.fn(async (_call: Call) => ({ count: world.lostRace ? 0 : 1 }));
  const deleteMany = vi.fn(async (_call: Call) => ({ count: world.lostRace ? 0 : 1 }));
  const audit = vi.fn(async (_call: Call) => ({}));

  const tx = {
    investmentOpportunity: { create, update, updateMany, deleteMany },
    investmentRuleSet: { findUnique: findLadder },
    auditLog: { create: audit },
  };

  const prisma = {
    db: {
      investmentOpportunity: {
        findUnique: vi.fn(async () => (world.noOpportunity ? null : row)),
        findMany: vi.fn(async () => (world.takenSlugs ?? []).map((slug) => ({ slug }))),
      },
      company: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          where.id === COMPANY_ID ? { id: COMPANY_ID, name: row.company.name } : null,
        ),
      },
      investmentSettings: {
        findUnique: vi.fn(async () => ({ minimumInvestment: 25_000 })),
      },
      investmentRuleSet: { findUnique: findLadder },
      // Runs the callback against the transaction client; a throw inside
      // propagates, which is what rolls a real transaction back.
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    },
  } as unknown as PrismaService;

  return {
    service: new OpportunitiesManagementService(prisma),
    create,
    update,
    updateMany,
    deleteMany,
    audit,
  };
}

/** The `data` of the first call to a recorded function. */
function firstData(fn: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return (fn.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
}

function issueCodes(error: unknown): string[] {
  const body = (error as BadRequestException).getResponse() as { issues?: Array<{ code: string }> };
  return (body.issues ?? []).map((issue) => issue.code).sort();
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to be refused');
}

/* -------------------------------------------------------------------------- */

describe('opening a raise', () => {
  it('pins the platform-wide ladder when the company has none of its own', async () => {
    const { service, updateMany, audit } = makeService();

    await service.open(ACTOR, OPP_ID, {});

    expect(firstData(updateMany)).toMatchObject({
      status: 'OPEN',
      ruleSetId: 'r-global',
      openedById: ACTOR.staffUserId,
    });
    expect(firstData(updateMany).opensAt).toBeInstanceOf(Date);

    expect(firstData(audit)).toMatchObject({
      category: 'OPPORTUNITY',
      action: 'opportunity.opened',
      after: { status: 'OPEN', pinnedRuleSet: 'Platform rates v3' },
      metadata: { pinnedFrom: 'GLOBAL' },
    });
  });

  it("prefers the company's own live ladder", async () => {
    const { service, updateMany, audit } = makeService({
      ladders: { own: OWN_LADDER, global: GLOBAL_LADDER },
    });

    await service.open(ACTOR, OPP_ID, {});

    expect(firstData(updateMany).ruleSetId).toBe('r-own');
    expect(firstData(audit).metadata).toMatchObject({ pinnedFrom: 'COMPANY' });
  });

  /**
   * Conditional on the status still being DRAFT, so two administrators
   * pressing Open at once produce one opening and one audit entry.
   */
  it('writes conditionally, so it cannot open twice', async () => {
    const { service, updateMany } = makeService();

    await service.open(ACTOR, OPP_ID, {});

    expect((updateMany.mock.calls[0]?.[0] as { where: unknown }).where).toEqual({
      id: OPP_ID,
      status: 'DRAFT',
    });
  });

  it('writes no audit entry when it loses the race', async () => {
    const { service, audit } = makeService({ lostRace: true });

    const error = await caught(service.open(ACTOR, OPP_ID, {}));

    expect(error).toBeInstanceOf(ConflictException);
    expect(((error as ConflictException).getResponse() as { reason: string }).reason).toBe(
      'changed_meanwhile',
    );
    expect(audit).not.toHaveBeenCalled();
  });

  it('refuses with every reason at once when it is not ready', async () => {
    const { service, updateMany } = makeService({
      ladders: {},
      closesAt: PAST,
      company: { name: 'X', type: 'THIRD_PARTY', status: 'ACTIVE', verification: 'PENDING' },
    });

    const error = await caught(service.open(ACTOR, OPP_ID, {}));

    expect(error).toBeInstanceOf(BadRequestException);
    expect(issueCodes(error)).toEqual(['close_in_past', 'company_not_accepting', 'no_live_ladder']);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('refuses to open anything that is not a draft', async () => {
    const { service } = makeService({ status: 'SUSPENDED', ruleSetId: 'r-old' });

    const error = await caught(service.open(ACTOR, OPP_ID, {}));

    expect(error).toBeInstanceOf(ConflictException);
  });
});

describe('resuming a raise', () => {
  /**
   * The promise that makes "pinned when opened" mean something: a suspended
   * raise comes back on the terms investors already saw, even if a new
   * ladder has been published in the meantime.
   */
  it('never re-pins, even when a newer ladder is live', async () => {
    const { service, updateMany } = makeService({
      status: 'SUSPENDED',
      ruleSetId: 'r-old',
      opensAt: new Date(Date.now() - 10 * 86_400_000),
      ladders: { own: OWN_LADDER, global: GLOBAL_LADDER },
    });

    await service.resume(ACTOR, OPP_ID, {});

    expect(firstData(updateMany)).toEqual({ status: 'OPEN' });
  });

  it('refuses to resume past its closing date', async () => {
    const { service } = makeService({
      status: 'SUSPENDED',
      ruleSetId: 'r-old',
      opensAt: new Date(Date.now() - 10 * 86_400_000),
      closesAt: PAST,
    });

    expect(issueCodes(await caught(service.resume(ACTOR, OPP_ID, {})))).toEqual(['close_in_past']);
  });

  it('refuses to resume while the company cannot take money', async () => {
    const { service } = makeService({
      status: 'SUSPENDED',
      ruleSetId: 'r-old',
      opensAt: new Date(Date.now() - 10 * 86_400_000),
      company: { name: 'X', type: 'INTERNAL', status: 'SUSPENDED', verification: 'NOT_REQUIRED' },
    });

    expect(issueCodes(await caught(service.resume(ACTOR, OPP_ID, {})))).toEqual([
      'company_not_accepting',
    ]);
  });
});

describe('suspending, closing and cancelling', () => {
  it('records the required reason for a suspension', async () => {
    const { service, audit } = makeService({ status: 'OPEN', ruleSetId: 'r-global' });

    await service.suspend(ACTOR, OPP_ID, { reason: 'Pending a valuation update' });

    expect(firstData(audit)).toMatchObject({
      action: 'opportunity.suspended',
      before: { status: 'OPEN' },
      after: { status: 'SUSPENDED' },
      metadata: { reason: 'Pending a valuation update' },
    });
  });

  it('stamps who closed it and when', async () => {
    const { service, updateMany } = makeService({ status: 'FULLY_FUNDED', ruleSetId: 'r-global' });

    await service.close(ACTOR, OPP_ID, {});

    const data = firstData(updateMany);
    expect(data).toMatchObject({ status: 'CLOSED', closedById: ACTOR.staffUserId });
    expect(data.closedAt).toBeInstanceOf(Date);
  });

  it('cannot cancel a raise that has been fully funded', async () => {
    const { service } = makeService({ status: 'FULLY_FUNDED', ruleSetId: 'r-global' });

    expect(
      await caught(service.cancel(ACTOR, OPP_ID, { reason: 'Changed our minds' })),
    ).toBeInstanceOf(ConflictException);
  });
});

describe('editing a raise', () => {
  it('lets a running raise have its target raised', async () => {
    const { service, update, audit } = makeService({ status: 'OPEN', ruleSetId: 'r-global' });

    await service.update(ACTOR, OPP_ID, { targetAmount: 8_000_000 });

    expect(firstData(update)).toEqual({ targetAmount: 8_000_000 });
    expect(firstData(audit)).toMatchObject({
      action: 'opportunity.updated',
      before: { targetAmount: 5_000_000 },
      after: { targetAmount: 8_000_000 },
    });
  });

  it('refuses to lower the target of a running raise', async () => {
    const { service, update } = makeService({ status: 'OPEN', ruleSetId: 'r-global' });

    expect(
      issueCodes(await caught(service.update(ACTOR, OPP_ID, { targetAmount: 4_000_000 }))),
    ).toEqual(['target_lowered']);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses to move a running raise to another company', async () => {
    const { service } = makeService({ status: 'OPEN', ruleSetId: 'r-global' });

    const error = await caught(
      service.update(ACTOR, OPP_ID, { companyId: 'c0000000-0000-4000-8000-000000000002' }),
    );

    expect(((error as ConflictException).getResponse() as { reason: string }).reason).toBe(
      'company_locked',
    );
  });

  /**
   * Moving the closing date into the past would shut the raise without the
   * audited close. Refused for a running raise; a draft may hold any date
   * while it is being written.
   */
  it('refuses to move the closing date of a running raise into the past', async () => {
    const running = makeService({ status: 'OPEN', ruleSetId: 'r-global' });
    expect(
      issueCodes(await caught(running.service.update(ACTOR, OPP_ID, { closesAt: PAST }))),
    ).toEqual(['close_in_past']);

    const draft = makeService({ status: 'DRAFT' });
    await draft.service.update(ACTOR, OPP_ID, { closesAt: PAST });
    expect(firstData(draft.update)).toEqual({ closesAt: PAST });
  });

  it('records dates in the trail as text, not as objects', async () => {
    const { service, audit } = makeService({ status: 'DRAFT', closesAt: null });

    await service.update(ACTOR, OPP_ID, { closesAt: FUTURE });

    expect(firstData(audit).after).toEqual({ closesAt: FUTURE.toISOString() });
  });

  it('refuses any edit to a finished raise', async () => {
    const { service } = makeService({ status: 'CLOSED', ruleSetId: 'r-global' });

    expect(await caught(service.update(ACTOR, OPP_ID, { title: 'New title' }))).toBeInstanceOf(
      ConflictException,
    );
  });

  it('refuses an edit that changes nothing, rather than logging an empty one', async () => {
    const { service, audit } = makeService({ targetAmount: 5_000_000 });

    const error = await caught(service.update(ACTOR, OPP_ID, { targetAmount: 5_000_000 }));

    expect(((error as BadRequestException).getResponse() as { reason: string }).reason).toBe(
      'no_change',
    );
    expect(audit).not.toHaveBeenCalled();
  });
});

describe('creating and deleting drafts', () => {
  it('numbers the slug when the title is already in use', async () => {
    const { service, create } = makeService({ takenSlugs: ['phase-2', 'phase-2-2'] });

    await service.create(ACTOR, {
      companyId: COMPANY_ID,
      title: 'Phase 2',
      targetAmount: 1_000_000,
    });

    expect(firstData(create)).toMatchObject({ slug: 'phase-2-3', status: 'DRAFT' });
  });

  it('refuses a company that does not exist, naming the field', async () => {
    const { service } = makeService();

    const error = await caught(
      service.create(ACTOR, {
        companyId: 'c0000000-0000-4000-8000-00000000dead',
        title: 'X raise',
        targetAmount: 1_000_000,
      }),
    );

    expect(((error as BadRequestException).getResponse() as { field: string }).field).toBe(
      'companyId',
    );
  });

  it('deletes a draft conditionally, and records what was discarded', async () => {
    const { service, deleteMany, audit } = makeService();

    await service.deleteDraft(ACTOR, OPP_ID);

    expect((deleteMany.mock.calls[0]?.[0] as { where: unknown }).where).toEqual({
      id: OPP_ID,
      status: 'DRAFT',
    });
    expect(firstData(audit)).toMatchObject({
      action: 'opportunity.draft_deleted',
      targetId: null,
      targetLabel: 'Al Jaddaf Tower',
    });
  });

  it('will not delete a draft somebody opened a moment ago', async () => {
    const { service, audit } = makeService({ lostRace: true });

    expect(await caught(service.deleteDraft(ACTOR, OPP_ID))).toBeInstanceOf(ConflictException);
    expect(audit).not.toHaveBeenCalled();
  });
});
