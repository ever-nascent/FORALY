/**
 * The one interactive card. A button flips it between two states — goodnight
 * by night, good morning by day. The picture is a pop-up book's night-and-day
 * wheel (src/scenes.ts): the button turns it half a revolution, so the moon
 * sets behind the hill as the sun comes up, while the skies crossfade and
 * the colours shift with it (src/styles/scenes.css). The word, count and
 * caption swap on a short fade of their own.
 *
 * Wired once, right after the card is built (see deck.ts), not on every
 * visit the way the count-ups and the first-message coda are: this is a
 * switch, not a reveal, and it should stay wherever she left it.
 */

import { paint, wordBlock } from './cards/render';
import { fit } from './fit';
import { GREETING_DAY, GREETING_NIGHT } from './palette';
import type { GreetingCard, GreetingSide } from './cards/types';

function cssMs(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  return raw.endsWith('ms') ? value : value * 1000;
}

type Phase = 'night' | 'day';

export function wireGreeting(root: HTMLElement, card: GreetingCard): void {
  const shapesHolder = root.querySelector<HTMLElement>('[data-greeting-shapes]');
  const stack = root.querySelector<HTMLElement>('.card__stack');
  const wordHolder = root.querySelector<HTMLElement>('[data-greeting-word]');
  const caption = root.querySelector<HTMLElement>('[data-greeting-caption]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-greeting-toggle]');
  const label = root.querySelector<HTMLElement>('[data-greeting-toggle-label]');
  if (!shapesHolder || !stack || !wordHolder || !caption || !toggle || !label) return;

  let phase: Phase = 'night';

  const apply = (next: Phase, side: GreetingSide): void => {
    phase = next;
    const theme = next === 'night' ? GREETING_NIGHT : GREETING_DAY;
    paint(root, theme);
    root.dataset.greetingState = next;
    wordHolder.replaceChildren(wordBlock(side.word, side.value, side.unit));
    // fit() runs once at deck startup, over every [data-fit] element that
    // exists then — this word didn't exist yet, so its --fit-em would
    // otherwise sit at the CSS fallback calibrated for whichever word was
    // measured first, not this one.
    fit(wordHolder);
    caption.textContent = side.caption;
    label.textContent = next === 'night' ? 'See it by morning' : 'See it by night';
    toggle.setAttribute('aria-pressed', String(next === 'day'));
  };

  // The card sequence advances on a tap anywhere in #stage (see deck.ts's
  // pointerdown/pointerup handling), and this button lives inside a card —
  // unlike prev/next/sound/motion, which sit outside #stage entirely. Left
  // alone, tapping the toggle would both flip it and advance to the next
  // card. Stopping propagation at pointerdown is enough (deck.ts bails out
  // of pointerup with nothing to compare against), but all three are
  // stopped so this can't regress if that handling ever changes shape.
  for (const type of ['pointerdown', 'pointerup', 'click'] as const) {
    toggle.addEventListener(type, (event) => event.stopPropagation());
  }

  toggle.addEventListener('click', () => {
    const next: Phase = phase === 'night' ? 'day' : 'night';
    const side = next === 'night' ? card.night : card.day;
    const dur = cssMs('--dur-greeting');

    // The wheel, the skies and the colours turn at once, from the state
    // attribute; only the words wait for the stack's fade to swap.
    root.dataset.greetingState = next;
    if (dur <= 0) {
      apply(next, side);
      return;
    }
    stack.classList.add('greeting-fade');
    window.setTimeout(() => {
      apply(next, side);
      void stack.offsetWidth;
      stack.classList.remove('greeting-fade');
    }, dur / 2);
  });
}
