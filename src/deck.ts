import { countUp, type CountHandle } from './countup';
import { describe, renderCard } from './cards/render';
import { mountElapsed, type ElapsedHandle } from './elapsed';
import { fit } from './fit';
import { mountGimmick, type GimmickHandle } from './gimmicks';
import { mountMonitor, type MonitorHandle } from './monitor';
import { wireGreeting } from './greeting';
import type { Card } from './cards/types';
import type { Score } from './audio';

export interface DeckElements {
  stage: HTMLElement;
  pace: HTMLElement;
  live: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  sound: HTMLButtonElement;
  /** Shown on the opening card when the browser wants a tap before sound. */
  begin: HTMLElement;
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

  // The greeting toggle is wired once, here, rather than per-visit like the
  // count-ups below — a switch should stay wherever she left it, not reset
  // itself every time she comes back to the card.
  for (const [i, card] of cards.entries()) {
    if (card.kind !== 'greeting') continue;
    const node = nodes[i];
    if (node) wireGreeting(node, card, i);
  }

  const segments = cards.map(() => {
    const seg = document.createElement('span');
    seg.className = 'pace__seg';
    return seg;
  });
  els.pace.replaceChildren(...segments);

  // Fonts that missed the preload ceiling change every measurement; re-fit
  // once they are in so no figure is left sized for the fallback face.
  if ('fonts' in document) void document.fonts.ready.then(() => fit(els.stage));

  let index = -1;
  let counting: CountHandle[] = [];
  let elapsed: ElapsedHandle | null = null;
  let monitor: MonitorHandle | null = null;
  let gimmick: GimmickHandle | null = null;
  let score: Score | null = null;
  let woken = false;
  /**
   * True while the opening card is waiting on the tap that starts the score.
   * That tap starts the music and stays put, so the song fades in over the
   * opening card rather than over the second one.
   */
  let armed = false;

  const disarm = (): void => {
    armed = false;
    delete els.begin.dataset.shown;
  };

  /**
   * A card keeps its animations (`data-live`) for as long as it is on screen:
   * while it is current, and for the length of the push that takes it away.
   * Dropping them the moment it starts leaving would blank its shapes and jump
   * its light mid-push. These timers take `data-live` off once it is gone.
   */
  const exits = new Map<HTMLElement, number>();

  function retire(node: HTMLElement): void {
    window.clearTimeout(exits.get(node));
    exits.set(
      node,
      window.setTimeout(() => {
        exits.delete(node);
        if (node.dataset.state === 'past') delete node.dataset.live;
      }, cssMs('--dur-push') + 60)
    );
  }

  function show(target: number, direction: 1 | -1): void {
    const wanted = Math.min(Math.max(target, 0), cards.length - 1);
    if (wanted === index) return;

    for (const handle of counting) handle.cancel();
    counting = [];
    elapsed?.cancel();
    elapsed = null;
    monitor?.cancel();
    monitor = null;
    gimmick?.cancel();
    gimmick = null;

    const leaving = nodes[index];
    if (leaving) {
      leaving.style.setProperty('--card-x', `${direction > 0 ? -EXIT : EXIT}%`);
      leaving.dataset.state = 'past';
      leaving.inert = true;
      retire(leaving);
    }

    const entering = nodes[wanted];
    const card = cards[wanted];
    if (!entering || !card) return;

    // Called back while it is still on its way out: let it turn round from
    // wherever it is, still moving, rather than snapping it off-screen and
    // replaying its entrance from the top.
    const returning = exits.has(entering);
    window.clearTimeout(exits.get(entering));
    exits.delete(entering);

    if (!returning) {
      // Park the incoming card off-screen without animating it there, with
      // its animations removed so they replay from the start.
      entering.style.transition = 'none';
      entering.dataset.state = 'upcoming';
      delete entering.dataset.live;
      entering.style.setProperty('--card-x', `${direction > 0 ? ENTER : -ENTER}%`);
      void entering.offsetWidth;
      entering.style.transition = '';
    }
    entering.dataset.state = 'current';
    entering.dataset.live = '';
    entering.inert = false;

    // The seam behind the push takes the colour of the card arriving.
    if (entering.dataset.ground) {
      document.body.style.setProperty('--behind', entering.dataset.ground);
    }

    const liveEls = [...entering.querySelectorAll<HTMLElement>('[data-count-to]')];
    // A card called back mid-exit keeps the values it already settled on.
    if (liveEls.length > 0 && !returning) {
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

    const trace = entering.querySelector<SVGSVGElement>('[data-monitor]');
    if (trace) monitor = mountMonitor(trace, () => score?.time() ?? null);
    // Called back mid-exit, a card keeps what its gimmick already settled on.
    if (!returning) gimmick = mountGimmick(entering, card, () => score?.time() ?? null);

    if (wanted !== 0 && armed) disarm();

    index = wanted;
    for (const [i, seg] of segments.entries()) seg.dataset.done = String(i <= index);
    els.live.textContent = describe(card);
    els.prev.disabled = index === 0;
    els.next.disabled = index === cards.length - 1;
    score?.dip();
  }

  /** Browsers will not start audio without a gesture; the first one starts it.
   *  Returns true when that gesture was spent starting the score. */
  const wake = (): boolean => {
    woken = true;
    score?.start();
    if (!armed) return false;
    disarm();
    return true;
  };

  const forward = (): void => {
    if (wake()) return;
    show(index + 1, 1);
  };
  const back = (): void => {
    wake();
    show(index - 1, -1);
  };

  els.next.addEventListener('click', forward);
  els.prev.addEventListener('click', back);

  els.sound.addEventListener('click', () => {
    if (!score) return;
    // Waiting on the first tap, the score is on but silent; this tap is it.
    if (armed) {
      wake();
      return;
    }
    woken = true;
    els.sound.setAttribute('aria-pressed', String(score.toggle()));
  });

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const onControl = event.target instanceof HTMLButtonElement;
    // A held key would otherwise race through the whole sequence.
    if (event.repeat) {
      if (!onControl) event.preventDefault();
      return;
    }

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
        wake();
        show(0, -1);
        break;
      case 'End':
        event.preventDefault();
        wake();
        show(cards.length - 1, 1);
        break;
      default:
        wake();
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
    if (Math.abs(dx) < TAP_PX && Math.abs(dy) < TAP_PX && elapsed < TAP_MS) {
      forward();
      return;
    }
    // Neither a tap nor a swipe, but still a gesture: enough to start the score.
    wake();
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
      if (woken) {
        ready.start();
        return;
      }
      // Otherwise try to start it straight away. Where the browser wants a
      // gesture first, ask for one tap on the opening card.
      void ready.autoplay().then((playing) => {
        if (playing || woken || index !== 0) return;
        armed = true;
        els.begin.dataset.shown = 'true';
      });
    },
  };
}
