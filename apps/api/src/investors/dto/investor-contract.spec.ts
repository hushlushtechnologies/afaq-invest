import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AUDIT_CATEGORIES,
  availableInvestorMoves,
  canInvestorTransition,
  INVESTOR_MOVES,
  INVESTOR_MOVES_NEEDING_REASON,
  INVESTOR_SOURCES,
  INVESTOR_STATUSES,
  INVESTOR_TYPES,
  investorIsWithdrawable,
  investorReference,
  KYC_DOCUMENT_KINDS,
  KYC_DOCUMENT_STATUSES,
  KYC_STANDINGS,
  KYC_SUBMISSION_STATUSES,
  normaliseEmail,
  parseInvestorReference,
  RISK_RATINGS,
  type InvestorMove,
} from '@afaq/types';

/**
 * The investor account rules, and the promise that the shared types and the
 * database agree about every enum.
 *
 * Only @afaq/types and the schema file are read, so this runs without a
 * database.
 */

const SCHEMA = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'packages',
  'database',
  'prisma',
  'schema.prisma',
);

/** The values of one enum block in schema.prisma, in order. */
function prismaEnum(name: string): string[] {
  const source = readFileSync(SCHEMA, 'utf8');
  const block = new RegExp(`\\benum ${name} \\{([^}]*)\\}`).exec(source);
  if (!block) throw new Error(`No enum ${name} in schema.prisma`);

  return block[1]!
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter((line) => line !== '');
}

describe('the shared types and the database agree', () => {
  /**
   * A value in one and not the other fails at runtime, not at build time: the
   * API would accept a status the database refuses, or read back one the
   * portals have no words for. Checked here so it fails in CI instead.
   */
  it.each([
    ['InvestorType', INVESTOR_TYPES],
    ['InvestorSource', INVESTOR_SOURCES],
    ['InvestorStatus', INVESTOR_STATUSES],
    ['KycSubmissionStatus', KYC_SUBMISSION_STATUSES],
    ['RiskRating', RISK_RATINGS],
    ['KycDocumentKind', KYC_DOCUMENT_KINDS],
    ['KycDocumentStatus', KYC_DOCUMENT_STATUSES],
    ['AuditCategory', AUDIT_CATEGORIES],
  ] as const)('%s', (name, values) => {
    expect(prismaEnum(name)).toEqual([...values]);
  });

  it('stores every standing except EXPIRED, which is always computed', () => {
    expect(prismaEnum('KycStanding')).toEqual(KYC_STANDINGS.filter((s) => s !== 'EXPIRED'));
  });
});

describe('account moves', () => {
  const MOVES = Object.keys(INVESTOR_MOVES) as InvestorMove[];

  it('every move is a transition the status table allows', () => {
    for (const move of MOVES) {
      const { from, to } = INVESTOR_MOVES[move];
      for (const source of from) expect(canInvestorTransition(source, to), `${move}`).toBe(true);
    }
  });

  it('a closed account is final', () => {
    expect(availableInvestorMoves('CLOSED')).toEqual([]);
    for (const status of INVESTOR_STATUSES) {
      expect(canInvestorTransition('CLOSED', status)).toBe(false);
    }
  });

  it.each([
    ['INVITED', ['close']],
    ['ACTIVE', ['suspend', 'close']],
    ['SUSPENDED', ['reinstate', 'close']],
    ['CLOSED', []],
  ] as const)('%s offers %j', (status, moves) => {
    expect(availableInvestorMoves(status)).toEqual(moves);
  });

  it('no staff move activates an invitation — only accepting it does', () => {
    expect(
      MOVES.some(
        (move) =>
          INVESTOR_MOVES[move].from.includes('INVITED' as never) &&
          INVESTOR_MOVES[move].to === 'ACTIVE',
      ),
    ).toBe(false);
  });

  it('suspending and closing need a reason; reinstating does not', () => {
    expect([...INVESTOR_MOVES_NEEDING_REASON].sort()).toEqual(['close', 'suspend']);
  });
});

describe('withdrawing a record outright', () => {
  it('only an unanswered invitation with nothing submitted', () => {
    expect(investorIsWithdrawable({ status: 'INVITED', hasEverSubmittedKyc: false })).toBe(true);
  });

  /**
   * Anything else is a customer record the anti-money-laundering rules say
   * must be kept — it is closed, never removed.
   */
  it.each([
    ['INVITED', true],
    ['ACTIVE', false],
    ['SUSPENDED', false],
    ['CLOSED', false],
  ] as const)('not %s (submitted before: %s)', (status, hasEverSubmittedKyc) => {
    expect(investorIsWithdrawable({ status, hasEverSubmittedKyc })).toBe(false);
  });
});

describe('the reference staff read out', () => {
  it('pads to six digits and grows past them', () => {
    expect(investorReference(42)).toBe('INV-000042');
    expect(investorReference(1_234_567)).toBe('INV-1234567');
  });

  it('reads back what people actually type', () => {
    for (const typed of ['INV-000042', 'inv-42', 'INV42', '  INV-0042 ']) {
      expect(parseInvestorReference(typed), typed).toBe(42);
    }
  });

  it('round-trips', () => {
    for (const number of [1, 9, 10, 999_999, 1_000_000]) {
      expect(parseInvestorReference(investorReference(number))).toBe(number);
    }
  });

  it('is not fooled by other text', () => {
    for (const typed of ['', 'INV-', 'INV-0', 'sara@example.com', '42', 'INV-4x2']) {
      expect(parseInvestorReference(typed), typed).toBeNull();
    }
  });
});

describe('emails', () => {
  it('one investor however the address is typed', () => {
    expect(normaliseEmail('  Sara.Ali@Example.COM ')).toBe('sara.ali@example.com');
  });
});
