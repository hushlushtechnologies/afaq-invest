import { describe, expect, it } from 'vitest';
import { readAuditLadder, readAuditRoiBasis, type TierDraft } from '@afaq/types';
import { summarise } from '../investment-rules/investment-rules-management.service.js';

/**
 * The two halves of a recorded ladder agree.
 *
 * Publishing a rule set writes the whole ladder into the audit entry, and the
 * admin viewer reads it back to show it tier by tier. Those are two functions
 * in two packages, and nothing but a shared declaration connects them — so
 * this runs the real `summarise` and feeds its output to the real reader,
 * rather than testing each against a hand-written fixture that could drift
 * from both.
 *
 * `summarise` is exported for exactly this. Its return type is the same
 * `AuditLadderTierWithOptions` the viewer consumes, so a change to either
 * side is a compile error first and a failure here second.
 */

const LADDER: TierDraft[] = [
  {
    name: 'Starter',
    minAmount: 25_000,
    maxAmount: 250_000,
    options: [
      {
        mode: 'LOCKED',
        roiPercent: 4,
        payoutFrequency: 'MONTHLY',
        minTermMonths: 12,
        maxTermMonths: 24,
        noticePeriodDays: 0,
        earnsDuringNotice: false,
      },
      {
        mode: 'UNLOCKED',
        roiPercent: 3,
        payoutFrequency: 'MONTHLY',
        minTermMonths: null,
        maxTermMonths: null,
        noticePeriodDays: 90,
        earnsDuringNotice: true,
      },
    ],
  },
  {
    // The top tier, with no ceiling — the shape most likely to be mishandled.
    name: 'Partner',
    minAmount: 2_000_001,
    maxAmount: null,
    options: [
      {
        mode: 'LOCKED',
        roiPercent: 10,
        payoutFrequency: 'QUARTERLY',
        minTermMonths: 36,
        maxTermMonths: null,
        noticePeriodDays: 0,
        earnsDuringNotice: false,
      },
    ],
  },
];

describe('a recorded ladder can be read back', () => {
  it('survives the round trip the audit trail puts it through', () => {
    // Through JSON, because that is what the column is: anything the summary
    // holds that does not survive serialisation is a field the viewer will
    // never see.
    const stored: unknown = JSON.parse(
      JSON.stringify({ roiBasis: 'MONTHLY', tiers: summarise(LADDER) }),
    );

    const read = readAuditLadder(stored);

    expect(read).not.toBeNull();
    expect(read).toHaveLength(2);

    expect(read?.[0]).toMatchObject({ name: 'Starter', min: 25_000, max: 250_000 });
    expect(read?.[0]?.options).toHaveLength(2);
    expect(read?.[0]?.options[0]).toMatchObject({
      mode: 'LOCKED',
      roi: 4,
      payout: 'MONTHLY',
      term: [12, 24],
      notice: 0,
    });

    // An open-ended top tier and an open-ended term both have to come back as
    // null rather than as 0, which would read as "up to nothing".
    expect(read?.[1]).toMatchObject({ name: 'Partner', min: 2_000_001, max: null });
    expect(read?.[1]?.options[0]?.term).toEqual([36, null]);
  });

  it('carries the period the rates are quoted over', () => {
    // Without this the viewer shows "10%" with no period, and 10% a month and
    // 10% a year differ by a factor of twelve.
    const stored: unknown = JSON.parse(
      JSON.stringify({ roiBasis: 'MONTHLY', tiers: summarise(LADDER) }),
    );

    expect(readAuditRoiBasis(stored)).toBe('MONTHLY');
  });

  it('admits when an older entry did not record the period', () => {
    const stored: unknown = JSON.parse(JSON.stringify({ tiers: summarise(LADDER) }));

    expect(readAuditLadder(stored)).not.toBeNull();
    expect(readAuditRoiBasis(stored)).toBeNull();
  });
});

describe('the reader gives up rather than guessing', () => {
  it.each([
    ['nothing at all', null],
    ['a string', 'published'],
    ['an entry with no tiers', { status: 'ARCHIVED' }],
    ['an empty ladder', { tiers: [] }],
    ['a tier with no name', { tiers: [{ min: 1000, max: null, options: [] }] }],
    ['a tier with no floor', { tiers: [{ name: 'Starter', options: [] }] }],
    ['an option with no rate', { tiers: [{ name: 'A', min: 1, options: [{ mode: 'LOCKED' }] }] }],
  ])('returns null for %s', (_label, payload) => {
    // Null, not a throw and not a half-read ladder: the drawer falls back to
    // showing the stored record, which is harder to read but never wrong.
    expect(readAuditLadder(payload)).toBeNull();
  });

  it('keeps a tier whose options are missing entirely', () => {
    // Distinct from the cases above: a tier with no `options` key is a tier
    // that recorded no options, which is a fact worth showing, not a payload
    // this build cannot parse.
    const read = readAuditLadder({ tiers: [{ name: 'Starter', min: 25_000, max: null }] });

    expect(read).toHaveLength(1);
    expect(read?.[0]?.options).toEqual([]);
  });
});
