import './styles/tokens.css';
import './styles/base.css';
import './styles/cards.css';
import './styles/print.css';

import { loadScore } from './audio';
import { createDeck } from './deck';
import { currentMotion, startMotion, toggleMotion } from './motion';
import { preload } from './preload';

function need<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`missing ${selector}`);
  return node;
}

/**
 * Someone who has asked their system for less motion gets a still sequence,
 * which is right — but it is indistinguishable from the page being broken. The
 * control says which of the two it is and turns the movement back on, and the
 * answer keeps for next time.
 */
function wireMotion(button: HTMLButtonElement): void {
  const show = (state: 'on' | 'off'): void => {
    button.setAttribute('aria-pressed', String(state === 'on'));
  };

  show(currentMotion());
  button.addEventListener('click', () => show(toggleMotion()));
}

async function start(): Promise<void> {
  startMotion();
  wireMotion(need<HTMLButtonElement>('#motion'));
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
