import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvestmentRulesManagementService } from './investment-rules-management.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StaffContext } from '../auth/staff-context.types.js';
import type { StepUpService } from './step-up.service.js';

/**
 * The one control that has to defend itself.
 *
 * Publishing a ladder asks for the administrator's own password. That control
 * is stored as a setting, which means it can be switched off — and if
 * switching it off needed nothing, the control would be decorative: anybody
 * holding investment_rule.manage could disable it, publish whatever they
 * liked, and leave a trail of two ordinary-looking changes.
 *
 * So turning it off requires the password it turns off. These tests exist
 * because that is circular enough to look like a bug and get "simplified"
 * away by somebody reading the code a year from now.
 */

const ACTOR: StaffContext = {
  staffUserId: '11111111-1111-4111-8111-111111111111',
  authUserId: '22222222-2222-4222-8222-222222222222',
  email: 'admin@example.com',
  fullName: 'An Administrator',
  status: 'ACTIVE',
  roleKeys: ['SUPER_ADMIN'],
  permissionKeys: [],
  isSuperAdmin: true,
};

/** The settings row as stored, before the change under test. */
function stored(requireStepUpToPublish: boolean) {
  return {
    currency: 'AED',
    minimumInvestment: 25_000,
    maxRoiPercent: 10,
    maxRoiBasis: 'MONTHLY',
    defaultNoticePeriodDays: 90,
    requireStepUpToPublish,
  };
}

function makeService(current: ReturnType<typeof stored>, passwordIsCorrect: boolean) {
  const update = vi.fn().mockResolvedValue({ id: 'global' });
  const auditCreate = vi.fn().mockResolvedValue({});

  // The service reaches the tables through `prisma.db`, never `prisma`
  // itself — a bare { investmentSettings: … } leaves `prisma.db` undefined.
  const prisma = {
    db: {
      investmentSettings: {
        findUnique: vi.fn().mockResolvedValue(current),
        update,
      },
      auditLog: { create: auditCreate },
      // Runs the callback immediately, so the transaction body is exercised
      // rather than skipped.
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          investmentSettings: { update },
          auditLog: { create: auditCreate },
        }),
      ),
    },
  } as unknown as PrismaService;

  const verifyPassword = vi.fn(async () => {
    if (!passwordIsCorrect) {
      throw new UnauthorizedException({ reason: 'step_up_failed' });
    }
  });

  const stepUp = { verifyPassword } as unknown as StepUpService;

  return {
    service: new InvestmentRulesManagementService(prisma, stepUp),
    verifyPassword,
    update,
    auditCreate,
  };
}

describe('turning step-up off requires step-up', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses without the password', async () => {
    const { service, update } = makeService(stored(true), false);

    await expect(service.updateSettings(ACTOR, { requireStepUpToPublish: false })).rejects.toThrow(
      UnauthorizedException,
    );

    // The important half: nothing was written.
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses when the password is wrong', async () => {
    const { service, verifyPassword, update } = makeService(stored(true), false);

    await expect(
      service.updateSettings(ACTOR, { requireStepUpToPublish: false, password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(verifyPassword).toHaveBeenCalledWith(ACTOR.email, 'wrong');
    expect(update).not.toHaveBeenCalled();
  });

  /**
   * A refused attempt to remove this particular control is worth seeing in
   * the trail even though nothing changed — and it must not carry the
   * password that was tried.
   */
  it('records the refusal as a security event, without the password', async () => {
    const { service, auditCreate } = makeService(stored(true), false);

    await expect(
      service.updateSettings(ACTOR, { requireStepUpToPublish: false, password: 'hunter2' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(auditCreate).toHaveBeenCalledTimes(1);

    const entry = auditCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };

    expect(entry.data).toMatchObject({
      category: 'SECURITY',
      action: 'investment_rule.step_up_disable_refused',
    });

    expect(JSON.stringify(entry.data)).not.toContain('hunter2');
  });

  it('allows it with the correct password', async () => {
    const { service, verifyPassword, update } = makeService(stored(true), true);

    await service.updateSettings(ACTOR, {
      requireStepUpToPublish: false,
      password: 'correct',
    });

    expect(verifyPassword).toHaveBeenCalledWith(ACTOR.email, 'correct');
    expect(update).toHaveBeenCalled();
  });
});

describe('every other settings change is an ordinary edit', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Adding a control is not the dangerous direction. */
  it('needs no password to switch step-up on', async () => {
    const { service, verifyPassword, update } = makeService(stored(false), false);

    await service.updateSettings(ACTOR, { requireStepUpToPublish: true });

    expect(verifyPassword).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it('needs no password to change the cap', async () => {
    const { service, verifyPassword, update } = makeService(stored(true), false);

    await service.updateSettings(ACTOR, { maxRoiPercent: 8 });

    expect(verifyPassword).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  /**
   * Sending `false` when it is already off changes nothing, so there is no
   * control to defend — and the service refuses the request as a no-op before
   * it ever reaches the gate.
   */
  it('does not ask for a password when step-up is already off', async () => {
    const { service, verifyPassword } = makeService(stored(false), false);

    await expect(service.updateSettings(ACTOR, { requireStepUpToPublish: false })).rejects.toThrow(
      /nothing to change/i,
    );

    expect(verifyPassword).not.toHaveBeenCalled();
  });
});
