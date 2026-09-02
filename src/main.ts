import './styles/tokens.css';
import './styles/base.css';
import './styles/cards.css';
import './styles/print.css';

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

  createDeck(wrapped.cards, {
    stage: need<HTMLElement>('#stage'),
    pace: need<HTMLElement>('#pace-fill'),
    live: need<HTMLElement>('#live'),
    prev: need<HTMLButtonElement>('#prev'),
    next: need<HTMLButtonElement>('#next'),
  });

  need<HTMLElement>('#loader').dataset.done = 'true';
}

void start();
