import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * What must never leave the API.
 *
 * Read from the source rather than from a running server, because the point
 * is to catch the mistake while it is being written. A query that selects
 * whole records is the usual way a secret escapes: somebody adds a column
 * and every endpoint starts returning it.
 */
function read(path: string): string {
  return readFileSync(join(SRC, path), 'utf8');
}

const QUERY_FILES = [
  'staff/staff.service.ts',
  'staff/staff-management.service.ts',
  'staff/invitation-lifecycle.service.ts',
  'roles/roles.service.ts',
  'roles/roles-management.service.ts',
  'audit/audit.service.ts',
  'auth/staff-context.service.ts',
];

describe('data exposure', () => {
  it.each(QUERY_FILES)('%s asks for named columns, never whole records', (file) => {
    const source = read(file);

    // Every findMany/findUnique should carry a select. Without one Prisma
    // returns every column, including ones added later by somebody who never
    // saw this file.
    const queries = source.match(/\.(findMany|findUnique|findFirst)\(/g) ?? [];

    if (queries.length === 0) return;

    const selects = source.match(/select:/g) ?? [];
    expect(
      selects.length,
      `${file}: ${queries.length} queries, ${selects.length} selects`,
    ).toBeGreaterThanOrEqual(queries.length);
  });

  it('never selects the raw user agent into a list', () => {
    // Long, noisy, and a fingerprint; the readable device label is enough.
    expect(read('audit/audit.service.ts')).not.toMatch(/userAgent: true/);
  });

  it('does not log tokens, passwords or secrets anywhere', () => {
    const suspicious = /logger\.\w+\([^)]*\b(token|password|secret|apiKey)\b/i;

    for (const file of [
      ...QUERY_FILES,
      'staff/staff-invitations.service.ts',
      'auth/auth.guard.ts',
    ]) {
      expect(suspicious.test(read(file)), `${file} looks like it logs a secret`).toBe(false);
    }
  });

  it('keeps the audit trail free of before/after secrets', () => {
    // The schema promises this in a comment; here it is as a check. Anything
    // writing a password or token into an audit entry would be recording the
    // secret in the one table nobody is allowed to delete from.
    const writers = [
      'staff/staff-management.service.ts',
      'staff/invitation-lifecycle.service.ts',
      'roles/roles-management.service.ts',
      'staff/staff-invitations.service.ts',
    ];

    for (const file of writers) {
      const source = read(file);
      const auditBlocks = source.match(/auditLog\.create\({[\s\S]*?\n\s{6}}\);/g) ?? [];

      for (const block of auditBlocks) {
        expect(/\b(password|token|secret)\b/i.test(block), `${file} audit entry`).toBe(false);
      }
    }
  });

  it('refuses requests with no bearer token before looking anything up', () => {
    // The order matters: a missing token must not reach the database.
    const guard = read('auth/auth.guard.ts');
    const tokenCheck = guard.indexOf('missing_token');
    const resolve = guard.indexOf('staffContext.resolve');

    expect(tokenCheck).toBeGreaterThan(-1);
    expect(tokenCheck).toBeLessThan(resolve);
  });
});
