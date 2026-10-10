import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AUDIT_ACTIONS, auditActionArea } from '@afaq/types';

/**
 * Audit catalogue contract:
 * 1. the API only writes actions registered in AUDIT_ACTIONS;
 * 2. every action is labelled in English and Arabic;
 * 3. no orphaned labels are kept for unregistered actions.
 *
 * This test intentionally reads both API source and Admin message files.
 */
const API_SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const MESSAGES = join(API_SRC, '..', '..', '..', 'apps', 'admin', 'messages');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];

  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) {
      out.push(path);
    }
  }

  return out;
}

interface EmitterSite {
  file: string;
  line: number;
  expression: string;
}

/**
 * Finds action expressions only in auditLog.create call sites.
 * Keeping the expression is deliberate: new dynamic writers must be explicitly
 * enumerated below, rather than silently escaping the audit catalogue.
 */
function emitterSites(): EmitterSite[] {
  const sites: EmitterSite[] = [];

  for (const path of sourceFiles(API_SRC)) {
    const lines = readFileSync(path, 'utf8').split('\n');

    lines.forEach((line, index) => {
      if (!line.includes('auditLog.create')) return;

      const window = lines.slice(index, index + 40);
      const actionAt = window.findIndex((candidate) => /^\s*action:/.test(candidate));

      sites.push({
        file: relative(API_SRC, path),
        line: index + 1,
        expression:
          actionAt === -1
            ? ''
            : window
                .slice(actionAt, actionAt + 3)
                .join(' ')
                .replace(/\s+/g, ' ')
                .replace(/(targetType|targetId|targetLabel|before|after|metadata|category):.*$/, '')
                .trim(),
      });
    });
  }

  return sites;
}

/**
 * All possible actions from expressions that cannot be read as literals.
 * The keys must match the source expression as captured by emitterSites().
 * A stale key or a new unrecognized expression fails the tests below.
 */
const DYNAMIC_SITES: Record<string, readonly string[]> = {
  'action: STATUS_ACTIONS[input.status],': [
    'company.activated',
    'company.deactivated',
    'company.suspended',
  ],
  'action: `staff.${input.status.toLowerCase()}`,': [
    'staff.active',
    'staff.suspended',
    'staff.disabled',
  ],
  // Every lifecycle move in opportunities-management.service.ts.
  // Investor lifecycle operations are selected through this finite map.
  'action: INVESTOR_MOVE_ACTIONS[move],': [
    'investor.suspended',
    'investor.reinstated',
    'investor.closed',
  ],
  'action: MOVE_ACTIONS[move],': [
    'opportunity.opened',
    'opportunity.suspended',
    'opportunity.resumed',
    'opportunity.closed',
    'opportunity.cancelled',
  ],
};

/** Extracts quoted action names, including literals in ternary expressions. */
function literalsIn(expression: string): string[] {
  return [...expression.matchAll(/'([a-z_]+\.[a-z_]+)'/g)].map((match) => match[1] as string);
}

function labels(locale: string): Record<string, Record<string, unknown>> {
  const file = JSON.parse(readFileSync(join(MESSAGES, `${locale}.json`), 'utf8')) as {
    audit?: { actions?: Record<string, Record<string, unknown>> };
  };

  return file.audit?.actions ?? {};
}

function labelFor(tree: Record<string, Record<string, unknown>>, action: string): unknown {
  const area = auditActionArea(action);
  const event = action.slice(area.length + 1);
  return tree[area]?.[event];
}

describe('the catalogue covers what the API writes', () => {
  const sites = emitterSites();

  it('finds the audit writers at all', () => {
    expect(sites.length).toBeGreaterThan(20);
  });

  it('reads an action expression at every writer', () => {
    const blind = sites.filter((site) => site.expression === '');
    expect(blind.map((site) => `${site.file}:${site.line}`)).toEqual([]);
  });

  it('writes only actions the catalogue lists', () => {
    const unknown: string[] = [];

    for (const site of sites) {
      const found = literalsIn(site.expression);
      const enumerated = DYNAMIC_SITES[site.expression] ?? [];

      for (const action of [...found, ...enumerated]) {
        if (!(AUDIT_ACTIONS as readonly string[]).includes(action)) {
          unknown.push(`${site.file}:${site.line} → ${action}`);
        }
      }
    }

    expect(unknown).toEqual([]);
  });

  it('enumerates every action it cannot read off the page', () => {
    const unexplained = sites.filter(
      (site) =>
        literalsIn(site.expression).length === 0 && DYNAMIC_SITES[site.expression] === undefined,
    );

    expect(unexplained.map((site) => `${site.file}:${site.line} → ${site.expression}`)).toEqual([]);
  });

  it('has no enumerated site that has since moved or changed', () => {
    const expressions = new Set(sites.map((site) => site.expression));
    const stale = Object.keys(DYNAMIC_SITES).filter((key) => !expressions.has(key));
    expect(stale).toEqual([]);
  });
});

describe('every catalogued action is readable', () => {
  it.each(['en', 'ar'])('%s has a label for all of them', (locale) => {
    const tree = labels(locale);
    const missing = AUDIT_ACTIONS.filter((action) => {
      const label = labelFor(tree, action);
      return typeof label !== 'string' || label.trim() === '';
    });
    expect(missing).toEqual([]);
  });

  it('labels the same actions in both languages', () => {
    const flatten = (tree: Record<string, Record<string, unknown>>): string[] =>
      Object.entries(tree)
        .flatMap(([area, events]) => Object.keys(events).map((event) => `${area}.${event}`))
        .sort();

    expect(flatten(labels('ar'))).toEqual(flatten(labels('en')));
  });

  it('carries no label for an action nothing writes', () => {
    const catalogued = new Set<string>(AUDIT_ACTIONS);
    const orphans = Object.entries(labels('en'))
      .flatMap(([area, events]) => Object.keys(events).map((event) => `${area}.${event}`))
      .filter((action) => !catalogued.has(action));

    expect(orphans).toEqual([]);
  });
});
