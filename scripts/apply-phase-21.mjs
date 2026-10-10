#!/usr/bin/env node
/**
 * Phase 21: applies the edits to existing files that are too large to paste
 * whole for the lines that changed.
 *
 * Generated from the actual change, not written by hand: each edit is the
 * smallest surrounding text that appears exactly once in the end-of-Phase-20
 * file, and the whole set was proven by replaying it onto those files and
 * getting the end-of-Phase-21 files back byte for byte.
 *
 * Checked before writing: if any expected text is not there exactly once,
 * nothing at all is written and it names the edit. Edits already in place are
 * skipped, so running it twice is harmless. Windows line endings are kept.
 *
 *   Run from the repository root:  node scripts/apply-phase-21.mjs
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
    'packages/types/src/opportunity.ts',
    'opportunity.ts (1/1)',
    '  return Math.max(0, Math.ceil(millis / 86_400_000));\n}',
    "  return Math.max(0, Math.ceil(millis / 86_400_000));\n}\n\n/* -------------------------------------------------------------------------- */\n/* The closing date, as a person picks it                                     */\n/* -------------------------------------------------------------------------- */\n\n/**\n * The platform's offset from UTC.\n *\n * Fixed because the UAE observes no daylight saving: Asia/Dubai is +04:00 all\n * year. Written down here, next to the one place it is used, rather than\n * derived at runtime, because deriving it means trusting whichever time-zone\n * database the browser happens to ship.\n */\nconst PLATFORM_UTC_OFFSET = '+04:00';\n\nconst ISO_DATE = /^(\\d{4})-(\\d{2})-(\\d{2})$/;\n\n/**\n * The instant a raise closes, from the day somebody picked.\n *\n * \"Closes on 31 December\" means investors can put money in all of that day,\n * in UAE time — so the instant is the last millisecond of that day in Dubai,\n * not midnight UTC, which would shut it four hours early. The API enforces\n * closing dates strictly; getting this wrong would turn people away on the\n * last afternoon of a raise.\n */\nexport function closingInstant(date: string): string {\n  const match = ISO_DATE.exec(date);\n  if (!match) throw new RangeError(`Not a calendar date: \"${date}\"`);\n\n  const instant = new Date(`${date}T23:59:59.999${PLATFORM_UTC_OFFSET}`);\n\n  // Rejects dates that parse but do not exist, such as 2026-02-30: they come\n  // back as a different day, which would silently move the deadline.\n  if (Number.isNaN(instant.getTime()) || closingDate(instant) !== date) {\n    throw new RangeError(`Not a calendar date: \"${date}\"`);\n  }\n\n  return instant.toISOString();\n}\n\n/**\n * The day a raise closes, as the platform calendar reads it.\n *\n * The inverse of `closingInstant`, for putting a stored deadline back into a\n * date field. Read in Asia/Dubai, so a raise closing at 23:59 on the 31st in\n * Dubai shows as the 31st — not the 1st, which is what that same instant is\n * in some other time zone.\n */\nexport function closingDate(instant: Date | string): string {\n  const parts = new Intl.DateTimeFormat('en-CA', {\n    timeZone: 'Asia/Dubai',\n    year: 'numeric',\n    month: '2-digit',\n    day: '2-digit',\n  }).formatToParts(typeof instant === 'string' ? new Date(instant) : instant);\n\n  const part = (type: string): string => parts.find((item) => item.type === type)?.value ?? '';\n\n  return `${part('year')}-${part('month')}-${part('day')}`;\n}",
  ],
  [
    'apps/api/src/opportunities/opportunity-contract.spec.ts',
    'opportunity-contract.spec.ts (1/2)',
    '  canTransition,\n  daysRemaining,',
    '  canTransition,\n  closingDate,\n  closingInstant,\n  daysRemaining,',
  ],
  [
    'apps/api/src/opportunities/opportunity-contract.spec.ts',
    'opportunity-contract.spec.ts (2/2)',
    '    ).toEqual([]);\n  });\n});\n',
    "    ).toEqual([]);\n  });\n});\n\ndescribe('the closing date a person picks', () => {\n  /**\n   * \"Closes on 31 December\" means open all of the 31st in the UAE. Midnight\n   * UTC would shut it at 4am Dubai time on the 31st, turning away a whole\n   * day of investors. The last millisecond of the 31st in Dubai is right.\n   */\n  it('closes at the end of that day in UAE time', () => {\n    expect(closingInstant('2026-12-31')).toBe('2026-12-31T19:59:59.999Z');\n  });\n\n  it('reads a stored deadline back as the day it was picked', () => {\n    expect(closingDate('2026-12-31T19:59:59.999Z')).toBe('2026-12-31');\n  });\n\n  /**\n   * The same instant is already the 1st in some time zones. The platform's\n   * calendar is Dubai's, so the field must show the 31st whoever reads it.\n   */\n  it('uses the platform calendar, not the reader’s', () => {\n    // 21:00 UTC on the 31st is 01:00 on the 1st in Dubai.\n    expect(closingDate('2026-12-31T21:00:00.000Z')).toBe('2027-01-01');\n  });\n\n  it('round-trips every day of a year', () => {\n    const day = new Date('2026-01-01T12:00:00.000Z');\n\n    for (let n = 0; n < 365; n += 1) {\n      const date = closingDate(day);\n      expect(closingDate(closingInstant(date)), date).toBe(date);\n      day.setUTCDate(day.getUTCDate() + 1);\n    }\n  });\n\n  it('refuses something that is not a real calendar day', () => {\n    for (const bad of ['2026-02-30', '2026-13-01', '31/12/2026', '', '2026-12-31T00:00']) {\n      expect(() => closingInstant(bad), bad).toThrow(RangeError);\n    }\n  });\n});\n",
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
    console.error('Nothing has been written. Check that file matches the end of Phase 20.');
    process.exit(1);
  }

  files.set(path, source.replace(from, to));
  plan.push(`apply  ${name}`);
}

for (const [path, source] of files) {
  writeFileSync(path, crlf.has(path) ? source.replace(/\n/g, '\r\n') : source, 'utf8');
}

for (const line of plan) console.log(line);
console.log('\nDone. Next: node scripts/write-opportunity-labels.mjs');
