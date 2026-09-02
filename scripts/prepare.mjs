// Runs before dev and before build. Puts the two things the page fetches at
// runtime — the fonts and the single data file — where it expects them, and
// refuses to produce a build that still carries placeholder figures.
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => resolve(root, ...parts);

const fonts = [
  ['@fontsource/gloock/files/gloock-latin-400-normal.woff2', 'display-latin.woff2'],
  ['@fontsource/gloock/files/gloock-latin-ext-400-normal.woff2', 'display-latin-ext.woff2'],
  [
    '@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2',
    'text-latin.woff2',
  ],
  [
    '@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-ext-wght-normal.woff2',
    'text-latin-ext.woff2',
  ],
];

await mkdir(p('public/fonts'), { recursive: true });
for (const [from, to] of fonts) {
  await copyFile(p('node_modules', from), p('public/fonts', to));
}

const wrapped = JSON.parse(await readFile(p('data/wrapped.json'), 'utf8'));
await copyFile(p('data/wrapped.json'), p('public/wrapped.json'));

const building = process.argv.includes('--build');
if (wrapped.meta.placeholder) {
  const message =
    'data/wrapped.json still holds placeholder figures. Run `npm run data` against the real Discord export.';
  if (building && process.env.ALLOW_PLACEHOLDER !== '1') {
    console.error(`\nRefusing to build: ${message}\n`);
    process.exit(1);
  }
  console.warn(`prepare: ${message}`);
}

console.log(`prepare: ${wrapped.cards.length} cards, fonts synced`);
