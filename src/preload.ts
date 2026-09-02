import type { Wrapped } from './cards/types';

/**
 * Nothing should hitch mid-sequence, so both faces and the whole data file are
 * in memory before the first card is built. Fonts get a ceiling — a font that
 * never arrives must not leave her looking at the loader.
 */
const FONT_CEILING_MS = 4000;

function faces(): Promise<unknown> {
  if (!('fonts' in document)) return Promise.resolve();
  return Promise.all([
    document.fonts.load('400 10rem "Gloock"'),
    document.fonts.load('400 2rem "Gloock"'),
    document.fonts.load('450 1rem "Schibsted Grotesk"'),
    document.fonts.load('500 3rem "Schibsted Grotesk"'),
  ]).then(() => document.fonts.ready);
}

function ceiling(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function preload(): Promise<Wrapped> {
  const data = fetch('/wrapped.json', { cache: 'no-cache' }).then(async (res) => {
    if (!res.ok) throw new Error(`wrapped.json: ${res.status}`);
    return (await res.json()) as Wrapped;
  });

  const [wrapped] = await Promise.all([data, Promise.race([faces(), ceiling(FONT_CEILING_MS)])]);
  return wrapped;
}
