/**
 * Guards the built CSS against constructs that work in one engine and quietly
 * do nothing in another. Every rule here exists because it actually shipped
 * broken once.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'dist/assets');

const names = (await readdir(dir)).filter((f) => f.endsWith('.css'));
if (names.length === 0) {
  console.error('\ncheck-css: no stylesheet in dist/assets\n');
  process.exit(1);
}

const problems = [];

for (const name of names) {
  const css = await readFile(join(dir, name), 'utf8');

  // A custom property supplying an animation *name*. Chromium resolves it;
  // other engines drop the whole declaration, taking the entrance with it.
  for (const [, value] of css.matchAll(/animation(?:-name)?\s*:\s*([^;{}]+)/g)) {
    for (const segment of value.split(',')) {
      if (segment.trim().startsWith('var(')) {
        problems.push(`animation name comes from a custom property: "${value.trim()}"`);
      }
    }
  }

  // A custom property inside a keyframe. Interpolation of these is not
  // something every engine does.
  for (const [, body] of css.matchAll(/@keyframes[^{]+\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
    if (body.includes('var(')) {
      problems.push(`a keyframe reads a custom property: "${body.trim().slice(0, 70)}…"`);
    }
  }

  // color-mix() is recent enough that an older browser drops the declaration,
  // which for a fill means the shape simply never appears.
  if (css.includes('color-mix(')) problems.push('color-mix() is used in a shipped stylesheet');
}

if (problems.length > 0) {
  console.error(`\ncheck-css found ${problems.length} portability problem(s):`);
  for (const p of [...new Set(problems)]) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(`check-css: ${names.join(', ')} clean`);
