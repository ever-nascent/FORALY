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

async function start(): Promise<void> {
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

void start();
