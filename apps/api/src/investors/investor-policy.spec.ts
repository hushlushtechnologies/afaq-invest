import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  INVESTOR_MOVES,
  INVESTOR_STATUSES,
  KYC_STANDINGS,
  canInvestorMove,
  kycStanding,
  type InvestorMove,
  type StoredKycStanding,
} from '@afaq/types';
import {
  assertInvestorEditable,
  assertInvestorMove,
  assertNameEditable,
  cannotWithdraw,
  matchesStanding,
  standingWhere,
} from './investor-policy.js';
import { orderFor, searchWhere } from './investors.service.js';

/**
 * The investor rules on the API side, without a database.
 *
 * The standing filter is the part most worth guarding. The list filters by
 * standing in SQL; the detail page works the standing out in TypeScript. If
 * the two ever disagree, an investor appears under "Approved" in the list and
 * as "Expired" on their own page — so both are checked against the one
 * definition, `kycStanding`, over every combination that can be stored.
 */

const NOW = new Date('2026-10-08T08:00:00.000Z');

const STORED: StoredKycStanding[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
];

/** Every kind of expiry date that matters: none, gone, exactly now, still running. */
const EXPIRIES: Array<[string, Date | null]> = [
  ['no date', null],
  ['a year ago', new Date(NOW.getTime() - 365 * 86_400_000)],
  ['exactly now', NOW],
  ['one millisecond from now', new Date(NOW.getTime() + 1)],
  ['next year', new Date(NOW.getTime() + 365 * 86_400_000)],
];

const MATRIX = STORED.flatMap((kycStatus) =>
  EXPIRIES.map(([label, kycExpiresAt]) => ({ kycStatus, kycExpiresAt, label })),
);

/**
 * A tiny evaluator for the Prisma `where` fragments this policy builds —
 * AND, OR, `in`, `gt`, `lte` and null — so the SQL-side filter can be run
 * over the same matrix without a database.
 */
function evaluate(where: unknown, row: Record<string, unknown>): boolean {
  const clause = where as Record<string, unknown>;

  return Object.entries(clause).every(([key, condition]) => {
    if (key === 'AND') return (condition as unknown[]).every((part) => evaluate(part, row));
    if (key === 'OR') return (condition as unknown[]).some((part) => evaluate(part, row));

    const value = row[key];
    if (condition === null) return value === null;

    const ops = condition as Record<string, unknown>;
    return Object.entries(ops).every(([op, operand]) => {
      switch (op) {
        case 'in':
          return (operand as unknown[]).includes(value);
        case 'gt':
          return value instanceof Date && value.getTime() > (operand as Date).getTime();
        case 'lte':
          return value instanceof Date && value.getTime() <= (operand as Date).getTime();
        default:
          throw new Error(`The evaluator does not know "${op}"`);
      }
    });
  });
}

describe('filtering the list by KYC standing', () => {
  it.each([...KYC_STANDINGS])(
    '%s in memory matches exactly what kycStanding calls %s',
    (standing) => {
      for (const row of MATRIX) {
        expect(matchesStanding(standing, row, NOW), `${row.kycStatus}, ${row.label}`).toBe(
          kycStanding(row, NOW) === standing,
        );
      }
    },
  );

  it.each([...KYC_STANDINGS])('%s as a database filter matches the same rows', (standing) => {
    const where = standingWhere(standing, NOW);

    for (const row of MATRIX) {
      expect(evaluate(where, row), `${row.kycStatus}, ${row.label}`).toBe(
        kycStanding(row, NOW) === standing,
      );
    }
  });

  it('puts every stored combination under exactly one standing', () => {
    for (const row of MATRIX) {
      const under = KYC_STANDINGS.filter((standing) => matchesStanding(standing, row, NOW));
      expect(under, `${row.kycStatus}, ${row.label}`).toHaveLength(1);
    }
  });

  it('counts an approval that ends this very instant as expired, not approved', () => {
    expect(
      evaluate(standingWhere('EXPIRED', NOW), { kycStatus: 'APPROVED', kycExpiresAt: NOW }),
    ).toBe(true);
  });
});

describe('account changes', () => {
  const MOVES = Object.keys(INVESTOR_MOVES) as InvestorMove[];

  it('allows exactly what the shared move table allows', () => {
    for (const move of MOVES) {
      for (const status of INVESTOR_STATUSES) {
        const call = () => assertInvestorMove(move, status);
        if (canInvestorMove(move, status)) expect(call).not.toThrow();
        else expect(call, `${move} from ${status}`).toThrow();
      }
    }
  });

  it('calls a move to where the account already is "no change", a 400', () => {
    expect(() => assertInvestorMove('suspend', 'SUSPENDED')).toThrow(BadRequestException);
    expect(() => assertInvestorMove('reinstate', 'ACTIVE')).toThrow(BadRequestException);
  });

  it('says a closed account is closed, rather than that the move is invalid', () => {
    try {
      assertInvestorMove('reinstate', 'CLOSED');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({ reason: 'closed' });
    }
  });

  it('refuses reinstating an invitation as an invalid transition', () => {
    try {
      assertInvestorMove('reinstate', 'INVITED');
      expect.unreachable();
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({
        reason: 'invalid_transition',
        move: 'reinstate',
        from: 'INVITED',
      });
    }
  });
});

describe('editing', () => {
  it('is refused once the account is closed, and allowed before', () => {
    expect(() => assertInvestorEditable('CLOSED')).toThrow(ConflictException);
    for (const status of ['INVITED', 'ACTIVE', 'SUSPENDED'] as const) {
      expect(() => assertInvestorEditable(status)).not.toThrow();
    }
  });

  it('locks the name once an identity check has confirmed it', () => {
    expect(() => assertNameEditable(null)).not.toThrow();

    try {
      assertNameEditable(NOW);
      expect.unreachable();
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({
        reason: 'name_verified',
        field: 'displayName',
      });
    }
  });
});

describe('withdrawing', () => {
  it('explains which rule stood in the way', () => {
    expect(cannotWithdraw('INVITED').getResponse()).toMatchObject({ reason: 'has_kyc_records' });
    expect(cannotWithdraw('ACTIVE').getResponse()).toMatchObject({ reason: 'not_withdrawable' });
  });
});

describe('searching', () => {
  it('searches name, email and phone', () => {
    const where = searchWhere('sara') as { OR: Array<Record<string, unknown>> };
    expect(where.OR.map((part) => Object.keys(part)[0])).toEqual(['displayName', 'email', 'phone']);
  });

  it('also finds the investor a typed reference names', () => {
    const where = searchWhere('INV-42') as { OR: Array<Record<string, unknown>> };
    expect(where.OR).toContainEqual({ number: 42 });
  });

  it('runs against real rows', () => {
    const rows = [
      { displayName: 'Sara Ali', email: 'sara@example.com', phone: null, number: 42 },
      {
        displayName: 'Omar Saeed',
        email: 'omar@example.com',
        phone: '+971 50 000 0042',
        number: 7,
      },
    ];

    const matching = (text: string) =>
      rows
        .filter((row) =>
          (searchWhere(text) as { OR: Array<Record<string, unknown>> }).OR.some((part) => {
            const [key, condition] = Object.entries(part)[0]!;
            const value = row[key as keyof typeof row];
            if (typeof condition === 'number') return value === condition;
            const needle = (condition as { contains: string }).contains.toLowerCase();
            return typeof value === 'string' && value.toLowerCase().includes(needle);
          }),
        )
        .map((row) => row.number);

    expect(matching('SARA')).toEqual([42]);
    expect(matching('INV-000042')).toEqual([42]);
    expect(matching('0042')).toEqual([7]);
  });
});

describe('ordering', () => {
  it('always ends on the sequence number, so paging is stable', () => {
    for (const field of ['displayName', 'createdAt', 'lastLoginAt'] as const) {
      expect(orderFor(field, 'asc').at(-1)).toEqual({ number: 'asc' });
    }
    expect(orderFor('number', 'desc')).toEqual([{ number: 'desc' }]);
  });

  it('puts people who never signed in last, whichever way', () => {
    expect(orderFor('lastLoginAt', 'desc')[0]).toEqual({
      lastLoginAt: { sort: 'desc', nulls: 'last' },
    });
  });
});
