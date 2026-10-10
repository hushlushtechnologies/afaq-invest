import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { canTransition, OPPORTUNITY_STATUSES, type OpportunityStatus } from '@afaq/types';
import {
  assertCompanyChangeable,
  assertDeletable,
  assertEditable,
  assertMove,
  firstFreeSlug,
  MAX_SLUG_ATTEMPTS,
  OPPORTUNITY_MOVES,
  opportunityRejection,
  slugBaseFromTitle,
  type OpportunityMove,
} from './dto/opportunity-policy.js';

/**
 * The refusals, checked without a database.
 *
 * The business rules live in @afaq/types and have their own tests; these
 * check that the API turns them into the right refusals, and that the named
 * moves never drift from the transition table they are meant to obey.
 */

const MOVES = Object.keys(OPPORTUNITY_MOVES) as OpportunityMove[];

function refusal(fn: () => void): { status: number; body: Record<string, unknown> } {
  try {
    fn();
  } catch (error) {
    if (error instanceof BadRequestException || error instanceof ConflictException) {
      return { status: error.getStatus(), body: error.getResponse() as Record<string, unknown> };
    }
    throw error;
  }
  throw new Error('expected a refusal');
}

describe('the named moves', () => {
  /**
   * The table in @afaq/types is the rule; these moves are how the API offers
   * it. If somebody adds a source state to a move that the table forbids, the
   * API would allow a transition the portals believe impossible.
   */
  it('only ever offer transitions the shared table allows', () => {
    for (const move of MOVES) {
      const { from, to } = OPPORTUNITY_MOVES[move];

      for (const source of from) {
        expect(canTransition(source, to), `${move}: ${source} → ${to}`).toBe(true);
      }
    }
  });

  it('cover every transition the table allows, except the one nobody declares', () => {
    const offered = new Set(
      MOVES.flatMap((move) =>
        OPPORTUNITY_MOVES[move].from.map((source) => `${source}→${OPPORTUNITY_MOVES[move].to}`),
      ),
    );

    const allowed = OPPORTUNITY_STATUSES.flatMap((from) =>
      OPPORTUNITY_STATUSES.filter((to) => canTransition(from, to)).map((to) => `${from}→${to}`),
    );

    // OPEN → FULLY_FUNDED is set by the investment that fills the raise, in
    // a later phase. No administrator declares a raise full.
    expect(allowed.filter((pair) => !offered.has(pair))).toEqual(['OPEN→FULLY_FUNDED']);
  });

  it('allows each move from exactly its own starting states', () => {
    for (const move of MOVES) {
      const { from, to } = OPPORTUNITY_MOVES[move];

      for (const status of OPPORTUNITY_STATUSES) {
        const permitted = (from as readonly OpportunityStatus[]).includes(status);

        if (permitted) {
          expect(() => assertMove(move, status), `${move} from ${status}`).not.toThrow();
        } else if (status === to) {
          expect(refusal(() => assertMove(move, status)).status, `${move} from ${status}`).toBe(
            400,
          );
        } else {
          expect(refusal(() => assertMove(move, status)).status, `${move} from ${status}`).toBe(
            409,
          );
        }
      }
    }
  });

  /**
   * The case named moves exist for. Opening pins the live ladder; resuming
   * must not. If "open" were allowed on a suspended raise it would quietly
   * re-price something investors have already seen.
   */
  it('refuses to open a suspended raise, and says to resume it', () => {
    const { status, body } = refusal(() => assertMove('open', 'SUSPENDED'));

    expect(status).toBe(409);
    expect(String(body.message)).toMatch(/resume/i);
    expect(String(body.message)).toMatch(/re-price/i);
  });

  it('explains that a finished raise is final', () => {
    for (const finished of ['CLOSED', 'CANCELLED'] as const) {
      const { body } = refusal(() => assertMove('resume', finished));
      expect(String(body.message), finished).toMatch(/new opportunity/i);
    }
  });

  it('treats a move to where the raise already is as nothing to do', () => {
    const { status, body } = refusal(() => assertMove('suspend', 'SUSPENDED'));

    expect(status).toBe(400);
    expect(body.reason).toBe('no_change');
  });
});

describe('what may be changed', () => {
  it('refuses any edit to a finished raise', () => {
    expect(() => assertEditable('DRAFT')).not.toThrow();
    expect(() => assertEditable('OPEN')).not.toThrow();
    expect(() => assertEditable('SUSPENDED')).not.toThrow();
    expect(() => assertEditable('FULLY_FUNDED')).not.toThrow();

    expect(refusal(() => assertEditable('CLOSED')).status).toBe(409);
    expect(refusal(() => assertEditable('CANCELLED')).status).toBe(409);
  });

  it('deletes drafts only', () => {
    expect(() => assertDeletable('DRAFT')).not.toThrow();

    for (const status of OPPORTUNITY_STATUSES.filter((value) => value !== 'DRAFT')) {
      expect(refusal(() => assertDeletable(status)).body.reason, status).toBe('not_a_draft');
    }
  });

  it('fixes the company once the raise has opened', () => {
    expect(() => assertCompanyChangeable('DRAFT')).not.toThrow();

    for (const status of OPPORTUNITY_STATUSES.filter((value) => value !== 'DRAFT')) {
      expect(refusal(() => assertCompanyChangeable(status)).body.field, status).toBe('companyId');
    }
  });
});

describe('slugs', () => {
  it('keeps letters in any script', () => {
    expect(slugBaseFromTitle('Al Jaddaf Tower — Phase 2')).toBe('al-jaddaf-tower-phase-2');
    expect(slugBaseFromTitle('برج الجداف')).toBe('برج-الجداف');
  });

  it('refuses a title that makes no address, naming the title', () => {
    const { status, body } = refusal(() => slugBaseFromTitle('— & —'));

    expect(status).toBe(400);
    expect(body.field).toBe('title');
  });

  /**
   * Two raises may share a title — "Phase 2" at two developers — so a clash
   * is numbered rather than refused, unlike a company's.
   */
  it('numbers a clash rather than refusing it', () => {
    expect(firstFreeSlug('phase-2', new Set())).toBe('phase-2');
    expect(firstFreeSlug('phase-2', new Set(['phase-2']))).toBe('phase-2-2');
    expect(firstFreeSlug('phase-2', new Set(['phase-2', 'phase-2-2']))).toBe('phase-2-3');
  });

  it('fills the first gap rather than always counting up', () => {
    expect(firstFreeSlug('phase-2', new Set(['phase-2', 'phase-2-3']))).toBe('phase-2-2');
  });

  it('gives up with a useful message rather than looping for ever', () => {
    const taken = new Set(['x-y']);
    for (let n = 2; n <= MAX_SLUG_ATTEMPTS; n += 1) taken.add(`x-y-${n}`);

    const { status, body } = refusal(() => firstFreeSlug('x-y', taken));

    expect(status).toBe(409);
    expect(body.field).toBe('title');
  });
});

describe('a rejected draft', () => {
  it('returns every issue, so the form can mark every field at once', () => {
    const error = opportunityRejection([
      { code: 'no_title', field: 'title', message: 'Give the opportunity a title.' },
      {
        code: 'target_not_positive',
        field: 'targetAmount',
        message: 'The target must be more than zero.',
      },
    ]);

    const body = error.getResponse() as { reason: string; issues: unknown[]; message: string };

    expect(error.getStatus()).toBe(400);
    expect(body.reason).toBe('invalid_opportunity');
    expect(body.issues).toHaveLength(2);
    expect(body.message).toContain('title');
    expect(body.message).toContain('zero');
  });
});
