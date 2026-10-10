#!/usr/bin/env node
/**
 * Phase 22: applies the edits to existing files that are too large to paste
 * whole for the lines that changed.
 *
 * Generated from the actual change, not written by hand: each edit is the
 * smallest surrounding text that appears exactly once in the end-of-Phase-21
 * file, and the whole set was proven by replaying it onto those files and
 * getting the end-of-Phase-22 files back byte for byte.
 *
 * Checked before writing: if any expected text is not there exactly once,
 * nothing at all is written and it names the edit. Edits already in place are
 * skipped, so running it twice is harmless. Windows line endings are kept.
 *
 *   Run from the repository root:  node scripts/apply-phase-22.mjs
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
    "  return status === 'CLOSED' || status === 'CANCELLED';\n}\n\n/* -------------------------------------------------------------------------- */",
    "  return status === 'CLOSED' || status === 'CANCELLED';\n}\n\n/**\n * The status changes an administrator can make, each by name.\n *\n * Named moves rather than \"set the status to X\", because two of them end in\n * the same place and mean different things. Opening a draft pins the live\n * ladder; resuming a suspended raise must not, or it would quietly re-price a\n * raise investors have already seen. So `open` starts only from DRAFT and\n * `resume` only from SUSPENDED, even though both end at OPEN.\n *\n * FULLY_FUNDED is not here: no administrator declares a raise full. It will be\n * set by the investment that fills it, in the phase that accepts investments.\n *\n * Shared, so the API's refusals and the Admin Portal's buttons are read off\n * the same table: a button cannot appear for a move the API would refuse.\n * Every move here must also be allowed by OPPORTUNITY_STATUS_TRANSITIONS\n * above; apps/api/src/opportunities/opportunity-policy.spec.ts fails if the\n * two disagree.\n */\nexport const OPPORTUNITY_MOVES = {\n  open: { from: ['DRAFT'], to: 'OPEN' },\n  suspend: { from: ['OPEN'], to: 'SUSPENDED' },\n  resume: { from: ['SUSPENDED'], to: 'OPEN' },\n  close: { from: ['OPEN', 'SUSPENDED', 'FULLY_FUNDED'], to: 'CLOSED' },\n  cancel: { from: ['DRAFT', 'OPEN', 'SUSPENDED'], to: 'CANCELLED' },\n} as const satisfies Record<string, { from: readonly OpportunityStatus[]; to: OpportunityStatus }>;\n\nexport type OpportunityMove = keyof typeof OPPORTUNITY_MOVES;\n\n/** In the order the Admin Portal shows them: forward first, final last. */\nexport const OPPORTUNITY_MOVE_ORDER: readonly OpportunityMove[] = [\n  'open',\n  'resume',\n  'suspend',\n  'close',\n  'cancel',\n];\n\n/** Whether `move` may start from `status`. */\nexport function canMove(move: OpportunityMove, status: OpportunityStatus): boolean {\n  return (OPPORTUNITY_MOVES[move].from as readonly OpportunityStatus[]).includes(status);\n}\n\n/** Every move a raise in this status allows, in display order. */\nexport function availableMoves(status: OpportunityStatus): OpportunityMove[] {\n  return OPPORTUNITY_MOVE_ORDER.filter((move) => canMove(move, status));\n}\n\n/**\n * Moves that need a written reason.\n *\n * Suspending and cancelling both take a raise away from investors who may be\n * looking at it, so whoever does it has to say why. The API enforces this;\n * the Admin form asks for it up front.\n */\nexport const OPPORTUNITY_MOVES_NEEDING_REASON: readonly OpportunityMove[] = ['suspend', 'cancel'];\n\n/** The shortest reason the API accepts where one is required. */\nexport const MIN_MOVE_REASON_LENGTH = 3;\n\n/** The longest note or reason the API accepts on any move. */\nexport const MAX_MOVE_REASON_LENGTH = 500;\n\n/* -------------------------------------------------------------------------- */",
  ],
  [
    'apps/api/src/opportunities/opportunity-policy.ts',
    'opportunity-policy.ts (1/3)',
    "import { BadRequestException, ConflictException } from '@nestjs/common';\nimport { isFinished, type OpportunityIssue, type OpportunityStatus } from '@afaq/types';\n",
    "import { BadRequestException, ConflictException } from '@nestjs/common';\nimport {\n  isFinished,\n  OPPORTUNITY_MOVES,\n  type OpportunityIssue,\n  type OpportunityMove,\n  type OpportunityStatus,\n} from '@afaq/types';\n",
  ],
  [
    'apps/api/src/opportunities/opportunity-policy.ts',
    'opportunity-policy.ts (2/3)',
    ' * The status changes an administrator can make, each by name.\n *\n * Named moves rather than "set the status to X", because two of them end in\n * the same place and mean different things. Opening a draft pins the live\n * ladder; resuming a suspended raise must not, or it would quietly re-price a\n * raise investors have already seen. So `open` starts only from DRAFT and\n * `resume` only from SUSPENDED, even though both end at OPEN.\n *\n * FULLY_FUNDED is not here: no administrator declares a raise full. It will be\n * set by the investment that fills it, in the phase that accepts investments.\n *\n * Every move here must also be allowed by OPPORTUNITY_STATUS_TRANSITIONS in\n * @afaq/types; opportunity-policy.spec.ts fails if the two disagree.',
    " * The named status changes. Defined in @afaq/types so the Admin Portal's\n * buttons are read off the same table, and re-exported here for the services\n * and specs that have always imported them from the policy.",
  ],
  [
    'apps/api/src/opportunities/opportunity-policy.ts',
    'opportunity-policy.ts (3/3)',
    "export const OPPORTUNITY_MOVES = {\n  open: { from: ['DRAFT'], to: 'OPEN' },\n  suspend: { from: ['OPEN'], to: 'SUSPENDED' },\n  resume: { from: ['SUSPENDED'], to: 'OPEN' },\n  close: { from: ['OPEN', 'SUSPENDED', 'FULLY_FUNDED'], to: 'CLOSED' },\n  cancel: { from: ['DRAFT', 'OPEN', 'SUSPENDED'], to: 'CANCELLED' },\n} as const satisfies Record<string, { from: readonly OpportunityStatus[]; to: OpportunityStatus }>;\n\nexport type OpportunityMove = keyof typeof OPPORTUNITY_MOVES;",
    'export { OPPORTUNITY_MOVES, type OpportunityMove };',
  ],
  [
    'apps/api/src/opportunities/opportunity-contract.spec.ts',
    'opportunity-contract.spec.ts (1/2)',
    'import {\n  canTransition,',
    'import {\n  availableMoves,\n  canTransition,',
  ],
  [
    'apps/api/src/opportunities/opportunity-contract.spec.ts',
    'opportunity-contract.spec.ts (2/2)',
    '      expect(() => closingInstant(bad), bad).toThrow(RangeError);\n    }\n  });\n});\n',
    "      expect(() => closingInstant(bad), bad).toThrow(RangeError);\n    }\n  });\n});\n\ndescribe('the moves each status offers', () => {\n  /**\n   * What the Admin Portal turns into buttons. Written out by hand so a change\n   * to the table has to be made deliberately in two places.\n   */\n  it.each([\n    ['DRAFT', ['open', 'cancel']],\n    ['OPEN', ['suspend', 'close', 'cancel']],\n    ['SUSPENDED', ['resume', 'close', 'cancel']],\n    ['FULLY_FUNDED', ['close']],\n    ['CLOSED', []],\n    ['CANCELLED', []],\n  ] as const)('%s offers %j', (status, moves) => {\n    expect(availableMoves(status)).toEqual(moves);\n  });\n\n  it('never offers \"open\" to a suspended raise, which would re-price it', () => {\n    expect(availableMoves('SUSPENDED')).not.toContain('open');\n  });\n});\n",
  ],
  [
    'apps/api/src/opportunities/opportunity-dto.spec.ts',
    'opportunity-dto.spec.ts (1/3)',
    "import { describe, expect, it } from 'vitest';\nimport { UpdateCompanyDto } from '../companies/dto/write-company.dto.js';",
    "import { describe, expect, it } from 'vitest';\nimport { MAX_MOVE_REASON_LENGTH, MIN_MOVE_REASON_LENGTH } from '@afaq/types';\nimport { UpdateCompanyDto } from '../companies/dto/write-company.dto.js';",
  ],
  [
    'apps/api/src/opportunities/opportunity-dto.spec.ts',
    'opportunity-dto.spec.ts (2/3)',
    '  CreateOpportunityDto,\n  OpportunityReasonDto,',
    '  CreateOpportunityDto,\n  OpportunityNoteDto,\n  OpportunityReasonDto,',
  ],
  [
    'apps/api/src/opportunities/opportunity-dto.spec.ts',
    'opportunity-dto.spec.ts (3/3)',
    "    expect(check(OpportunityReasonDto, { reason: 'Valuation under review' }).failed).toEqual([]);\n  });\n});\n",
    "    expect(check(OpportunityReasonDto, { reason: 'Valuation under review' }).failed).toEqual([]);\n  });\n});\n\ndescribe('the reason limits the Admin form is built against', () => {\n  /**\n   * The Admin Portal disables its confirm button using the shared constants.\n   * If the API's decorators drifted from them, the form would either refuse a\n   * reason the API accepts or send one the API refuses with English text.\n   */\n  it('requires at least the shared minimum where a reason is required', () => {\n    const short = 'x'.repeat(MIN_MOVE_REASON_LENGTH - 1);\n    const enough = 'x'.repeat(MIN_MOVE_REASON_LENGTH);\n\n    expect(check(OpportunityReasonDto, { reason: short }).failed).toEqual(['reason']);\n    expect(check(OpportunityReasonDto, { reason: enough }).failed).toEqual([]);\n  });\n\n  it('accepts up to the shared maximum on both kinds of move, and no more', () => {\n    const longest = 'x'.repeat(MAX_MOVE_REASON_LENGTH);\n    const tooLong = 'x'.repeat(MAX_MOVE_REASON_LENGTH + 1);\n\n    for (const cls of [OpportunityReasonDto, OpportunityNoteDto]) {\n      expect(check(cls, { reason: longest }).failed).toEqual([]);\n      expect(check(cls, { reason: tooLong }).failed).toEqual(['reason']);\n    }\n  });\n});\n",
  ],
  [
    'apps/admin/src/lib/investment-rules/use-investment-rules.ts',
    'use-investment-rules.ts (1/2)',
    ' */\nexport function useActiveRuleSet(companyId?: string): UseQueryResult<RuleSetDetail> {\n  return useQuery({',
    ' */\nexport function useActiveRuleSet(\n  companyId?: string,\n  { enabled = true }: { enabled?: boolean } = {},\n): UseQueryResult<RuleSetDetail> {\n  return useQuery({',
  ],
  [
    'apps/admin/src/lib/investment-rules/use-investment-rules.ts',
    'use-investment-rules.ts (2/2)',
    '    // shows rather than an error to retry into.\n    retry: false,\n  });\n}',
    '    // shows rather than an error to retry into.\n    retry: false,\n    // Off until it is needed — the "open this raise" dialog asks only once it\n    // is actually opening, not every time the page renders.\n    enabled,\n  });\n}',
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
    console.error('Nothing has been written. Check that file matches the end of Phase 21.');
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
