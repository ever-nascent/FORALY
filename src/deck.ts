import { countUp, type CountHandle } from './countup';
import { describe, renderCard } from './cards/render';
import { fit } from './fit';
import type { Card } from './cards/types';

export interface DeckElements {
  stage: HTMLElement;
  pace: HTMLElement;
  live: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
}

/** How far a card slides out of the way. Small: the swipe is the spatial cue. */
const SHIFT = '2.5%';
/** Past this, a pointer gesture is a swipe rather than a tap. */
const SWIPE_PX = 40;
const TAP_PX = 10;
const TAP_MS = 600;

function cssMs(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  return raw.endsWith('ms') ? value : value * 1000;
}

export function createDeck(cards: Card[], els: DeckElements): void {
  if (cards.length === 0) throw new Error('wrapped.json holds no cards');

  const nodes = cards.map((card, i) => renderCard(card, i, cards.length));
  els.stage.replaceChildren(...nodes);
  fit(els.stage);

  let index = -1;
  let counting: CountHandle | null = null;

  function show(target: number, direction: 1 | -1): void {
    const wanted = Math.min(Math.max(target, 0), cards.length - 1);
    if (wanted === index) return;

    counting?.cancel();
    counting = null;

    const leaving = nodes[index];
    if (leaving) {
      leaving.style.setProperty('--card-shift', direction > 0 ? `-${SHIFT}` : SHIFT);
      leaving.dataset.state = 'past';
      leaving.inert = true;
    }

    const entering = nodes[wanted];
    const card = cards[wanted];
    if (!entering || !card) return;

    // Park the incoming card off its mark without animating it there.
    entering.style.transition = 'none';
    entering.style.setProperty('--card-shift', direction > 0 ? SHIFT : `-${SHIFT}`);
    void entering.offsetWidth;
    entering.style.transition = '';
    entering.dataset.state = 'current';
    entering.inert = false;

    const live = entering.querySelector<HTMLElement>('[data-count-to]');
    if (live?.dataset.countTo) {
      counting = countUp(
        live,
        Number(live.dataset.countTo),
        cssMs('--dur-count'),
        cssMs('--delay-land')
      );
    }

    index = wanted;
    els.pace.style.transform = `scaleX(${(index + 1) / cards.length})`;
    els.live.textContent = describe(card);
    els.prev.disabled = index === 0;
    els.next.disabled = index === cards.length - 1;
  }

  const forward = (): void => show(index + 1, 1);
  const back = (): void => show(index - 1, -1);

  els.next.addEventListener('click', forward);
  els.prev.addEventListener('click', back);

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const onControl = event.target instanceof HTMLButtonElement;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        event.preventDefault();
        forward();
        break;
      case ' ':
        if (onControl) return;
        event.preventDefault();
        forward();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault();
        back();
        break;
      case 'Home':
        event.preventDefault();
        show(0, -1);
        break;
      case 'End':
        event.preventDefault();
        show(cards.length - 1, 1);
        break;
      default:
    }
  });

  let origin: { x: number; y: number; at: number } | null = null;

  els.stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    origin = { x: event.clientX, y: event.clientY, at: event.timeStamp };
  });

  els.stage.addEventListener('pointerup', (event) => {
    if (!origin) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    const elapsed = event.timeStamp - origin.at;
    origin = null;

    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) forward();
      else back();
      return;
    }
    if (Math.abs(dx) < TAP_PX && Math.abs(dy) < TAP_PX && elapsed < TAP_MS) forward();
  });

  els.stage.addEventListener('pointercancel', () => {
    origin = null;
  });

  show(0, 1);
  els.stage.focus({ preventScroll: true });
}
