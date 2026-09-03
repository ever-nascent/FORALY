import { countUp, type CountHandle } from './countup';
import { describe, renderCard } from './cards/render';
import { mountElapsed, type ElapsedHandle } from './elapsed';
import { fit } from './fit';
import type { Card } from './cards/types';
import type { Score } from './audio';

export interface DeckElements {
  stage: HTMLElement;
  pace: HTMLElement;
  live: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  sound: HTMLButtonElement;
}

/** How far a card travels. The outgoing one moves a fraction of the incoming
 *  one's distance, so the push reads as depth rather than as a slide. */
const ENTER = 100;
const EXIT = 28;
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

/**
 * Called once every counter on the card has landed. A card with one counter
 * has nothing to compare; a card with two — a split, racing to their values —
 * gets the higher one marked, so the CSS can give it a quiet glow. Reads the
 * numbers back off the elements themselves rather than the card data, so this
 * stays generic to "however many things counted" instead of knowing about
 * split cards specifically.
 */
function markRaceWinner(liveEls: HTMLElement[]): void {
  if (liveEls.length < 2) return;

  let winner: HTMLElement | null = null;
  let max = -Infinity;
  let tie = false;

  for (const liveEl of liveEls) {
    const box = liveEl.closest<HTMLElement>('[data-count-box]');
    if (!box) continue;
    const value = Number(liveEl.dataset.countTo);
    if (value > max) {
      max = value;
      winner = box;
      tie = false;
    } else if (value === max) {
      tie = true;
    }
  }

  if (winner && !tie) winner.dataset.countWinner = 'true';
}

export interface Deck {
  /** The score arrives after the first card, so it can never delay it. */
  attachScore(score: Score): void;
}

export function createDeck(cards: Card[], els: DeckElements): Deck {
  if (cards.length === 0) throw new Error('wrapped.json holds no cards');

  const nodes = cards.map((card, i) => renderCard(card, i, cards.length));
  els.stage.replaceChildren(...nodes);
  fit(els.stage);

  const segments = cards.map(() => {
    const seg = document.createElement('span');
    seg.className = 'pace__seg';
    return seg;
  });
  els.pace.replaceChildren(...segments);

  let index = -1;
  let counting: CountHandle[] = [];
  let elapsed: ElapsedHandle | null = null;
  let score: Score | null = null;
  let woken = false;

  function show(target: number, direction: 1 | -1): void {
    const wanted = Math.min(Math.max(target, 0), cards.length - 1);
    if (wanted === index) return;

    for (const handle of counting) handle.cancel();
    counting = [];
    elapsed?.cancel();
    elapsed = null;

    const leaving = nodes[index];
    if (leaving) {
      leaving.style.setProperty('--card-x', `${direction > 0 ? -EXIT : EXIT}%`);
      leaving.dataset.state = 'past';
      leaving.inert = true;
    }

    const entering = nodes[wanted];
    const card = cards[wanted];
    if (!entering || !card) return;

    // Park the incoming card off-screen without animating it there.
    entering.style.transition = 'none';
    entering.style.setProperty('--card-x', `${direction > 0 ? ENTER : -ENTER}%`);
    void entering.offsetWidth;
    entering.style.transition = '';
    entering.dataset.state = 'current';
    entering.inert = false;

    // The seam behind the push takes the colour of the card arriving.
    if (entering.dataset.ground) {
      document.body.style.setProperty('--behind', entering.dataset.ground);
    }

    const liveEls = [...entering.querySelectorAll<HTMLElement>('[data-count-to]')];
    if (liveEls.length > 0) {
      let remaining = liveEls.length;
      counting = liveEls.map((liveEl) =>
        countUp(liveEl, Number(liveEl.dataset.countTo), cssMs('--dur-count'), cssMs('--delay-land'), () => {
          remaining -= 1;
          if (remaining === 0) markRaceWinner(liveEls);
        })
      );
    }

    const elapsedEl = entering.querySelector<HTMLElement>('[data-elapsed-since]');
    if (elapsedEl?.dataset.elapsedSince) {
      elapsed = mountElapsed(elapsedEl, elapsedEl.dataset.elapsedSince);
    }

    index = wanted;
    for (const [i, seg] of segments.entries()) seg.dataset.done = String(i <= index);
    els.live.textContent = describe(card);
    els.prev.disabled = index === 0;
    els.next.disabled = index === cards.length - 1;
    score?.dip();
  }

  const forward = (): void => show(index + 1, 1);
  const back = (): void => show(index - 1, -1);

  // Browsers will not start audio without a gesture; the first one starts it.
  const wake = (): void => {
    woken = true;
    score?.start();
  };

  els.next.addEventListener('click', forward);
  els.prev.addEventListener('click', back);

  els.sound.addEventListener('click', () => {
    if (!score) return;
    woken = true;
    els.sound.setAttribute('aria-pressed', String(score.toggle()));
  });

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const onControl = event.target instanceof HTMLButtonElement;
    wake();

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
    wake();

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

  return {
    attachScore(ready: Score) {
      score = ready;
      els.sound.dataset.available = 'true';
      els.sound.setAttribute('aria-pressed', String(ready.muted));
      // If she has already tapped by the time the file lands, start it now.
      if (woken) ready.start();
    },
  };
}
