#!/usr/bin/env node
/**
 * Checks that every `t('key', { … })` passes the values its message expects.
 *
 * next-intl's type augmentation checks message *keys* at build time — a typo
 * in `t('audit.detail.notice')` is a compile error. It does not check the
 * *arguments*: `t('notice', { day: 90 })` against a message reading
 * "{days} days notice" compiles, builds, and then renders the literal text
 * `{days}` to whoever is reading the page. That is the gap this closes.
 *
 * It also catches the reverse, which is the one that bites in Arabic: a
 * message in one language using a placeholder the other does not, so the page
 * is correct in English and broken in Arabic.
 *
 *   Run from the repository root:
 *     node scripts/check-message-placeholders.mjs            # every app
 *     node scripts/check-message-placeholders.mjs admin      # just one
 *
 * Exits non-zero when it finds a mismatch, so it can be wired into CI.
 */

import console from 'node:console';
import process from 'node:process';

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPS = process.argv.slice(2);
const LOCALES = ['en', 'ar'];

/* -------------------------------------------------------------------------- */
/* Reading the messages                                                       */
/* -------------------------------------------------------------------------- */

function lookup(tree, path) {
  return path
    .split('.')
    .reduce((node, key) => (node === undefined ? undefined : node?.[key]), tree);
}

/**
 * The values an ICU message needs supplied.
 *
 * Walks the braces rather than pattern-matching them, because the inside of a
 * plural is full of things that look like placeholders and are not:
 * `{count, plural, =0 {Nobody} other {# people}}` needs `count` and nothing
 * else — `Nobody` is a branch of the plural, not a value anybody passes.
 */
function placeholdersIn(message) {
  if (typeof message !== 'string') return null;

  const names = new Set();
  let depth = 0;

  for (let index = 0; index < message.length; index += 1) {
    const char = message[index];

    if (char === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char !== '{') continue;

    depth += 1;

    // Only the outermost braces hold an argument name. Anything nested is
    // inside a plural or select body, where the braces wrap display text.
    if (depth !== 1) continue;

    const name = /^\s*([A-Za-z_]\w*)\s*[,}]/.exec(message.slice(index + 1));
    if (name) names.add(name[1]);
  }

  return [...names].sort();
}

/* -------------------------------------------------------------------------- */
/* Reading the calls                                                          */
/* -------------------------------------------------------------------------- */

function sourceFiles(dir) {
  const out = [];

  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;

    const path = join(dir, name);

    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(path)) out.push(path);
  }

  return out;
}

/** The object literal that starts at `open`, as text, brace-balanced. */
function objectAt(source, open) {
  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }

  return null;
}

/**
 * The names a call supplies, including shorthand.
 *
 * `{ email }` and `{ email: address }` pass the same value under the same
 * name, and an earlier version of this check only understood the second —
 * which made it report four working call sites as broken. Nested braces are
 * blanked first so that a value which is itself an object does not contribute
 * its own keys.
 */
function argumentNames(text) {
  let flat = text;
  let previous = null;

  while (flat !== previous) {
    previous = flat;
    flat = flat.replace(/\{[^{}]*\}/g, '');
  }

  const names = new Set();

  for (const part of flat.split(',')) {
    const named = /^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_]\w*))\s*:/.exec(part);

    if (named) {
      names.add(named[1] ?? named[2] ?? named[3]);
      continue;
    }

    const shorthand = /^\s*([A-Za-z_]\w*)\s*$/.exec(part);
    if (shorthand) names.add(shorthand[1]);
  }

  return [...names].sort();
}

/* -------------------------------------------------------------------------- */

function checkApp(app) {
  const src = join(ROOT, 'apps', app, 'src');
  const messagesDir = join(ROOT, 'apps', app, 'messages');

  const messages = {};
  for (const locale of LOCALES) {
    messages[locale] = JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8'));
  }

  const problems = [];
  let checked = 0;

  for (const file of sourceFiles(src)) {
    const source = readFileSync(file, 'utf8');
    const where = relative(ROOT, file);

    /*
     * Where each `t`-like binding is declared, and to what namespace.
     *
     * A list rather than a map, keyed by position, because one file commonly
     * declares `t` more than once — `use-component-labels.ts` binds it to
     * `pagination` in one hook and to `table` in the next. A flat map lets
     * the second overwrite the first and then reports six working call sites
     * as broken, which is how this list came to exist.
     */
    const bindings = [];

    for (const match of source.matchAll(
      /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:'([^']+)')?\s*\)/g,
    )) {
      // No argument means keys are already fully qualified.
      bindings.push({ name: match[1], namespace: match[2] ?? '', at: match.index });
    }

    /** The declaration of `name` nearest above `at` — near enough to scope. */
    function namespaceFor(name, at) {
      let found;

      for (const binding of bindings) {
        if (binding.name === name && binding.at < at) found = binding.namespace;
      }

      return found;
    }

    for (const match of source.matchAll(/\b(\w+)\(\s*'([\w.]+)'\s*,\s*(?=\{)/g)) {
      const [, binding, key] = match;
      const namespace = namespaceFor(binding, match.index);

      if (namespace === undefined) continue;

      const open = match.index + match[0].length;
      const body = objectAt(source, open);

      if (body === null) continue;

      const full = namespace === '' ? key : `${namespace}.${key}`;
      const passed = argumentNames(body);
      checked += 1;

      for (const locale of LOCALES) {
        const expected = placeholdersIn(lookup(messages[locale], full));

        if (expected === null) {
          problems.push(`${where}: ${full} has no message in ${locale}`);
          continue;
        }

        const missing = expected.filter((name) => !passed.includes(name));
        const extra = passed.filter((name) => !expected.includes(name));

        if (missing.length > 0) {
          problems.push(
            `${where}: ${full} (${locale}) needs {${missing.join('}, {')}} — the call does not pass it`,
          );
        }

        if (extra.length > 0) {
          problems.push(
            `${where}: ${full} (${locale}) is passed ${extra.join(', ')}, which the message does not use`,
          );
        }
      }
    }
  }

  return { app, checked, problems };
}

/** Every app that has a messages directory, unless the caller named some. */
function appsToCheck() {
  if (APPS.length > 0) return APPS;

  return readdirSync(join(ROOT, 'apps')).filter((app) => {
    try {
      return statSync(join(ROOT, 'apps', app, 'messages')).isDirectory();
    } catch {
      return false;
    }
  });
}

let failed = false;

for (const app of appsToCheck()) {
  const { checked, problems } = checkApp(app);

  console.log(`${app}: ${checked} parameterised calls checked, ${problems.length} problems`);

  for (const problem of problems) console.log(`  ${problem}`);

  if (problems.length > 0) failed = true;
}

process.exit(failed ? 1 : 0);
