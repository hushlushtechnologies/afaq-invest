/**
 * Cross-platform clean. Deletes the folders passed as arguments, relative to
 * the current working directory. Replaces `rm -rf`, which does not exist in
 * the default Windows shell.
 *
 * Usage: node ../../scripts/clean.mjs dist .turbo
 */
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const targets = process.argv.slice(2);

for (const target of targets) {
  rmSync(resolve(process.cwd(), target), { recursive: true, force: true });
}
