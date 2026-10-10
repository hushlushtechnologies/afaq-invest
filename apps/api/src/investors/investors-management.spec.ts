import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { StaffContext } from '../auth/staff-context.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';
import { InvestorsManagementService } from './investors-management.service.js';

/**
 * The investor write side, against a stand-in database and a stand-in
 * Supabase.
 *
 * Real service code making real decisions; only storage and the sign-in
 * provider are fake. Each test reads back what was written — which columns
 * changed, under what condition, and what the audit entry says — because
 * those are what matter when somebody later asks who closed an account.
 */

const ACTOR = {
  staffUserId: '11111111-1111-4111-8111-111111111111',
  authUserId: '22222222-2222-4222-8222-222222222222',
  email: 'officer@example.com',
  fullName: 'A Compliance Officer',
  status: 'ACTIVE',
  roleKeys: ['COMPLIANCE_OFFICER'],
  permissionKeys: [],
} as unknown as StaffContext;

const INVESTOR_ID = 'b0000000-0000-4000-8000-000000000001';
const AUTH_ID = 'd0000000-0000-4000-8000-000000000001';

interface World {
  status?: string;
  kycApprovedAt?: Date | null;
  kycSubmissions?: number;
  authUserId?: string | null;
  noInvestor?: boolean;
  /** An investor already holds the address being invited. */
  existingInvestor?: { status: string };
  /** A staff member already holds the address being invited. */
  existingStaff?: boolean;
  /** What Supabase says when asked to send an invitation. */
  supabaseError?: { status?: number; code?: string; message: string };
  /** Supabase refuses to delete the account. */
  deleteFails?: boolean;
  /** Our write fails after Supabase created the account. */
  createFails?: unknown;
  /** Simulates somebody else changing the row between load and write. */
  lostRace?: boolean;
  noSettings?: boolean;
}

function makeService(world: World = {}) {
  const row = {
    id: INVESTOR_ID,
    number: 42,
    authUserId: world.authUserId === undefined ? AUTH_ID : world.authUserId,
    type: 'INDIVIDUAL',
    email: 'sara@example.com',
    displayName: 'Sara Ali',
    phone: null,
    countryOfResidence: 'AE',
    preferredLocale: 'en',
    status: world.status ?? 'ACTIVE',
    kycApprovedAt: world.kycApprovedAt ?? null,
    invitationSentCount: 1,
    _count: { kycSubmissions: world.kycSubmissions ?? 0 },
  };

  type Call = { where?: Record<string, unknown>; data?: Record<string, unknown> };
  const create = vi.fn(async (_call: Call) => {
    if (world.createFails) throw world.createFails;
    return { id: 'new-investor', number: 43 };
  });
  const updateMany = vi.fn(async (_call: Call) => ({ count: world.lostRace ? 0 : 1 }));
  const deleteMany = vi.fn(async (_call: Call) => ({ count: world.lostRace ? 0 : 1 }));
  const audit = vi.fn(async (_call: Call) => ({}));

  const tx = {
    investor: { create, updateMany, deleteMany },
    auditLog: { create: audit },
  };

  const findInvestor = vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
    if (where.email !== undefined) return world.existingInvestor ?? null;
    return world.noInvestor ? null : row;
  });

  const prisma = {
    db: {
      investor: { findUnique: findInvestor },
      staffUser: {
        findUnique: vi.fn(async () => (world.existingStaff ? { id: 'staff-id' } : null)),
      },
      complianceSettings: {
        findUnique: vi.fn(async () => (world.noSettings ? null : { investorInvitationDays: 5 })),
      },
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    },
  } as unknown as PrismaService;

  const inviteUserByEmail = vi.fn(async (_email: string, _options: Record<string, unknown>) =>
    world.supabaseError
      ? { data: { user: null }, error: world.supabaseError }
      : { data: { user: { id: AUTH_ID } }, error: null },
  );
  const deleteUser = vi.fn(async (_id: string) =>
    world.deleteFails ? { error: { message: 'Supabase is down' } } : { error: null },
  );

  const supabase = {
    getAdminClient: () => ({ auth: { admin: { inviteUserByEmail, deleteUser } } }),
  } as unknown as SupabaseService;

  const config = {
    get: (key: string) => (key === 'investorAppUrl' ? 'https://invest.example.com' : undefined),
  } as unknown as ConfigService;

  return {
    service: new InvestorsManagementService(prisma, supabase, config),
    create,
    updateMany,
    deleteMany,
    audit,
    inviteUserByEmail,
    deleteUser,
  };
}

/** The response body of a Nest HTTP exception, for reading its reason. */
async function refusal(promise: Promise<unknown>): Promise<Record<string, unknown>> {
  try {
    await promise;
  } catch (error) {
    return (error as { getResponse(): Record<string, unknown> }).getResponse();
  }
  throw new Error('Expected a refusal');
}

const INVITE = {
  type: 'INDIVIDUAL' as const,
  email: 'new@example.com',
  displayName: 'New Investor',
  phone: '+971 50 123 4567',
  countryOfResidence: 'AE',
  preferredLocale: 'ar',
};

describe('inviting an investor', () => {
  it('creates the sign-in account, then the investor, then the audit entry', async () => {
    const { service, inviteUserByEmail, create, audit } = makeService();

    await expect(service.invite(ACTOR, INVITE)).resolves.toEqual({ id: 'new-investor' });

    // The link lands on the Investor Portal, in their language — not on the admin.
    expect(inviteUserByEmail).toHaveBeenCalledWith('new@example.com', {
      redirectTo: 'https://invest.example.com/ar/auth/callback?next=/accept-invitation',
      data: { full_name: 'New Investor' },
    });

    const data = create.mock.calls[0]![0].data!;
    expect(data).toMatchObject({
      authUserId: AUTH_ID,
      source: 'STAFF_INVITED',
      status: 'INVITED',
      invitedById: ACTOR.staffUserId,
      invitationSentCount: 1,
    });

    // The expiry comes from the compliance settings (5 days here), not a constant.
    const days =
      ((data.invitationExpiresAt as Date).getTime() - (data.invitedAt as Date).getTime()) /
      86_400_000;
    expect(days).toBe(5);

    expect(audit.mock.calls[0]![0].data).toMatchObject({
      category: 'INVESTOR',
      action: 'investor.invited',
      targetId: 'new-investor',
      targetLabel: 'New Investor (INV-000043)',
    });
  });

  it.each([
    [{ status: 'INVITED' }, 'already_invited'],
    [{ status: 'ACTIVE' }, 'already_investor'],
    [{ status: 'CLOSED' }, 'already_investor'],
  ])('refuses an address already on an investor account (%j)', async (existing, reason) => {
    const { service, inviteUserByEmail } = makeService({ existingInvestor: existing });

    expect(await refusal(service.invite(ACTOR, INVITE))).toMatchObject({ reason });
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("refuses a staff member's address", async () => {
    const { service, inviteUserByEmail } = makeService({ existingStaff: true });

    expect(await refusal(service.invite(ACTOR, INVITE))).toMatchObject({
      reason: 'email_is_staff',
    });
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('says so when Supabase is rate limiting', async () => {
    const { service, create } = makeService({
      supabaseError: { status: 429, message: 'Too many requests' },
    });

    await expect(service.invite(ACTOR, INVITE)).rejects.toThrow(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('names an address Supabase already has an account for', async () => {
    const { service } = makeService({
      supabaseError: { status: 422, code: 'email_exists', message: 'Already registered' },
    });

    expect(await refusal(service.invite(ACTOR, INVITE))).toMatchObject({ reason: 'email_in_use' });
  });

  it('removes the Supabase account again when our half fails', async () => {
    const { service, deleteUser, audit } = makeService({ createFails: new Error('db down') });

    await expect(service.invite(ACTOR, INVITE)).rejects.toThrow(InternalServerErrorException);
    expect(deleteUser).toHaveBeenCalledWith(AUTH_ID);
    expect(audit).not.toHaveBeenCalled();
  });

  it('turns a same-instant duplicate into "already invited", and still cleans up', async () => {
    const { service, deleteUser } = makeService({ createFails: { code: 'P2002' } });

    expect(await refusal(service.invite(ACTOR, INVITE))).toMatchObject({
      reason: 'already_invited',
    });
    expect(deleteUser).toHaveBeenCalledWith(AUTH_ID);
  });

  it('refuses to invite before the compliance settings exist', async () => {
    const { service, inviteUserByEmail } = makeService({ noSettings: true });

    await expect(service.invite(ACTOR, INVITE)).rejects.toThrow(NotFoundException);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });
});

describe('sending an invitation again', () => {
  it('sends it, extends it, and counts it — only while still invited', async () => {
    const { service, inviteUserByEmail, updateMany, audit } = makeService({ status: 'INVITED' });

    await service.resendInvitation(ACTOR, INVESTOR_ID);

    expect(inviteUserByEmail.mock.calls[0]![1]).toMatchObject({
      redirectTo: 'https://invest.example.com/en/auth/callback?next=/accept-invitation',
    });

    const call = updateMany.mock.calls[0]![0];
    expect(call.where).toEqual({ id: INVESTOR_ID, status: 'INVITED' });
    expect(call.data).toMatchObject({ invitationSentCount: { increment: 1 } });
    expect(audit.mock.calls[0]![0].data).toMatchObject({
      action: 'investor.invitation_resent',
      after: { invitationSentCount: 2 },
    });
  });

  it.each(['ACTIVE', 'SUSPENDED', 'CLOSED'])('is refused once %s', async (status) => {
    const { service, inviteUserByEmail } = makeService({ status });

    expect(await refusal(service.resendInvitation(ACTOR, INVESTOR_ID))).toMatchObject({
      reason: 'not_invited',
    });
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('reports a rate limit as one', async () => {
    const { service, updateMany } = makeService({
      status: 'INVITED',
      supabaseError: { status: 429, message: 'slow down' },
    });

    expect(await refusal(service.resendInvitation(ACTOR, INVESTOR_ID))).toMatchObject({
      reason: 'rate_limited',
    });
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe('editing an account', () => {
  it('writes only what changed, and records before and after', async () => {
    const { service, updateMany, audit } = makeService();

    await service.update(ACTOR, INVESTOR_ID, {
      phone: '+971 50 999 0000',
      countryOfResidence: 'AE', // unchanged
    });

    expect(updateMany.mock.calls[0]![0]).toEqual({
      where: { id: INVESTOR_ID, status: 'ACTIVE' },
      data: { phone: '+971 50 999 0000' },
    });
    expect(audit.mock.calls[0]![0].data).toMatchObject({
      action: 'investor.updated',
      before: { phone: null },
      after: { phone: '+971 50 999 0000' },
    });
  });

  it('says when there is nothing to change', async () => {
    const { service } = makeService();

    expect(
      await refusal(service.update(ACTOR, INVESTOR_ID, { displayName: 'Sara Ali' })),
    ).toMatchObject({ reason: 'no_change' });
  });

  it('refuses a closed account', async () => {
    const { service, updateMany } = makeService({ status: 'CLOSED' });

    await expect(service.update(ACTOR, INVESTOR_ID, { phone: null })).rejects.toThrow(
      ConflictException,
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('refuses to retype a name an identity check confirmed', async () => {
    const { service } = makeService({ kycApprovedAt: new Date('2026-01-01') });

    expect(
      await refusal(service.update(ACTOR, INVESTOR_ID, { displayName: 'Someone Else' })),
    ).toMatchObject({ reason: 'name_verified' });
  });

  it('still lets a verified investor’s phone change', async () => {
    const { service, updateMany } = makeService({ kycApprovedAt: new Date('2026-01-01') });

    await service.update(ACTOR, INVESTOR_ID, { phone: '+971 50 999 0000' });
    expect(updateMany.mock.calls[0]![0].where).toEqual({ id: INVESTOR_ID, status: 'ACTIVE' });
  });

  it('makes a rename lose a race with an approval', async () => {
    const { service, updateMany } = makeService();

    await service.update(ACTOR, INVESTOR_ID, { displayName: 'Sara A. Ali' });
    expect(updateMany.mock.calls[0]![0].where).toEqual({
      id: INVESTOR_ID,
      status: 'ACTIVE',
      kycApprovedAt: null,
    });
  });

  it('reports a lost race as one', async () => {
    const { service, audit } = makeService({ lostRace: true });

    expect(
      await refusal(service.update(ACTOR, INVESTOR_ID, { phone: '+971 50 999 0000' })),
    ).toMatchObject({
      reason: 'changed_meanwhile',
    });
    expect(audit).not.toHaveBeenCalled();
  });
});

describe('suspending, reinstating and closing', () => {
  it('suspends an active account, conditionally, with the reason on record', async () => {
    const { service, updateMany, audit } = makeService({ status: 'ACTIVE' });

    await service.suspend(ACTOR, INVESTOR_ID, { reason: 'Documents under query' });

    expect(updateMany.mock.calls[0]![0]).toEqual({
      where: { id: INVESTOR_ID, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' },
    });
    expect(audit.mock.calls[0]![0].data).toMatchObject({
      action: 'investor.suspended',
      before: { status: 'ACTIVE' },
      after: { status: 'SUSPENDED' },
      metadata: { reason: 'Documents under query' },
    });
  });

  it('reinstates without needing a note', async () => {
    const { service, audit } = makeService({ status: 'SUSPENDED' });

    await service.reinstate(ACTOR, INVESTOR_ID, {});

    const data = audit.mock.calls[0]![0].data!;
    expect(data).toMatchObject({ action: 'investor.reinstated', after: { status: 'ACTIVE' } });
    expect(data).not.toHaveProperty('metadata');
  });

  it('closes, stamping when', async () => {
    const { service, updateMany, audit } = makeService({ status: 'INVITED' });

    await service.close(ACTOR, INVESTOR_ID, { reason: 'Wrong address' });

    expect(updateMany.mock.calls[0]![0].data).toMatchObject({ status: 'CLOSED' });
    expect(updateMany.mock.calls[0]![0].data!.closedAt).toBeInstanceOf(Date);
    expect(audit.mock.calls[0]![0].data).toMatchObject({
      action: 'investor.closed',
      after: { status: 'CLOSED' },
    });
  });

  it('refuses from the wrong state without writing anything', async () => {
    const { service, updateMany } = makeService({ status: 'CLOSED' });

    expect(await refusal(service.reinstate(ACTOR, INVESTOR_ID, {}))).toMatchObject({
      reason: 'closed',
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('reports a lost race and writes no audit entry', async () => {
    const { service, audit } = makeService({ status: 'ACTIVE', lostRace: true });

    expect(
      await refusal(service.suspend(ACTOR, INVESTOR_ID, { reason: 'Documents under query' })),
    ).toMatchObject({ reason: 'changed_meanwhile' });
    expect(audit).not.toHaveBeenCalled();
  });

  it('refuses an investor that does not exist', async () => {
    const { service } = makeService({ noInvestor: true });

    await expect(service.close(ACTOR, INVESTOR_ID, { reason: 'Gone' })).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('withdrawing an invitation', () => {
  it('deletes the row only if still invited with no KYC records, then the sign-in account', async () => {
    const { service, deleteMany, audit, deleteUser } = makeService({ status: 'INVITED' });

    await service.withdraw(ACTOR, INVESTOR_ID);

    expect(deleteMany.mock.calls[0]![0].where).toEqual({
      id: INVESTOR_ID,
      status: 'INVITED',
      kycSubmissions: { none: {} },
    });
    expect(audit.mock.calls[0]![0].data).toMatchObject({
      action: 'investor.invitation_withdrawn',
      targetId: null,
      before: { reference: 'INV-000042', email: 'sara@example.com' },
    });
    expect(deleteUser).toHaveBeenCalledWith(AUTH_ID);
  });

  it('keeps an invitation that already has identity-check records', async () => {
    const { service, deleteMany } = makeService({ status: 'INVITED', kycSubmissions: 1 });

    expect(await refusal(service.withdraw(ACTOR, INVESTOR_ID))).toMatchObject({
      reason: 'has_kyc_records',
    });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it.each(['ACTIVE', 'SUSPENDED', 'CLOSED'])('never deletes a %s account', async (status) => {
    const { service, deleteMany } = makeService({ status });

    expect(await refusal(service.withdraw(ACTOR, INVESTOR_ID))).toMatchObject({
      reason: 'not_withdrawable',
    });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('does not touch Supabase when the race is lost', async () => {
    const { service, deleteUser } = makeService({ status: 'INVITED', lostRace: true });

    expect(await refusal(service.withdraw(ACTOR, INVESTOR_ID))).toMatchObject({
      reason: 'changed_meanwhile',
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('still succeeds when Supabase will not delete the account — the record is ours', async () => {
    const { service } = makeService({ status: 'INVITED', deleteFails: true });

    await expect(service.withdraw(ACTOR, INVESTOR_ID)).resolves.toEqual({ id: INVESTOR_ID });
  });
});
