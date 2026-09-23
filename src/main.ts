import './styles/tokens.css';
import './styles/base.css';
import './styles/cards.css';
import './styles/print.css';

import { loadScore } from './audio';
import { createDeck } from './deck';
import { preload } from './preload';

function need<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`missing ${selector}`);
  return node;
}

/**
 * The motion is the piece, and a still sequence is indistinguishable from a
 * broken one, so it moves even where the system asks for less: <html> ships
 * with data-motion="on". Opening it with ?motion=off hands the choice back to
 * the system's reduced-motion setting.
 */
function honourMotionOverride(): void {
  if (new URLSearchParams(location.search).get('motion') === 'off') {
    delete document.documentElement.dataset.motion;
  }
}

async function start(): Promise<void> {
  honourMotionOverride();
  const wrapped = await preload();

  if (wrapped.meta.placeholder) {
    // eslint-disable-next-line no-console
    console.warn(
      'wrapped.json is still the placeholder. Run `npm run data` against the real export.'
    );
  }

  const deck = createDeck(wrapped.cards, {
    stage: need<HTMLElement>('#stage'),
    pace: need<HTMLElement>('#pace'),
    live: need<HTMLElement>('#live'),
    prev: need<HTMLButtonElement>('#prev'),
    next: need<HTMLButtonElement>('#next'),
    sound: need<HTMLButtonElement>('#sound'),
  });

  // The score is optional and never gates the sequence. If public/score.mp3 is
  // not there this resolves to null and the sound control never appears.
  void loadScore().then((score) => {
    if (score) deck.attachScore(score);
  });

  need<HTMLElement>('#loader').dataset.done = 'true';
}

/** If the data never arrives, say so rather than leave the loader breathing forever. */
function fail(error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(error);
  const loader = document.querySelector<HTMLElement>('#loader');
  if (!loader) return;
  const message = document.createElement('p');
  message.className = 'loader__error';
  message.setAttribute('role', 'alert');
  message.textContent = 'Something did not load. Refresh the page to try again.';
  loader.replaceChildren(message);
}

start().catch(fail);
