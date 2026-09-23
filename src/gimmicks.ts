/**
 * Each card's own trick. `decorate` adds whatever extra markup a gimmick
 * needs when the card is built; the CSS in cards.css does most of the rest.
 * Four are timed from here instead. `typo` types the figure out and fixes a
 * mistake on the way; `flipclock` rolls a clock forward through the night;
 * `buzz` and `tug` move on the song's beat (src/beat.ts), so the phone goes
 * off and the rope gets yanked in time with the music. `mountGimmick` starts
 * those when the card comes up, and hands back a way to stop them.
 *
 * Every string placed here comes from the data or is fixed decoration, and
 * all of it goes in as text, never as HTML.
 */

import { beatWatcher, type SongClock } from './beat';
import { formatClock } from './format';
import { currentMotion } from './motion';
import type { Card, FigureCard, QuoteCard, SplitCard } from './cards/types';

export interface GimmickHandle {
  cancel(): void;
}

const NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {}
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** A small fixed-seed generator, so the decoration is the same every visit. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// --- Render-time markup -----------------------------------------------------

/** Notification badges scattered round the edges, clear of the figure. */
function badges(root: HTMLElement): void {
  const spots: [number, number, string][] = [
    [14, 16, '3'],
    [82, 12, '12'],
    [84, 24, '99+'],
    [9, 52, '1'],
    [78, 76, '27'],
    [22, 84, '5'],
    [52, 91, '8'],
  ];
  const layer = el('div', 'badges');
  layer.setAttribute('aria-hidden', 'true');
  for (const [i, [x, y, n]] of spots.entries()) {
    const badge = el('span', 'badge', n);
    badge.style.setProperty('--x', `${x}%`);
    badge.style.setProperty('--y', `${y}%`);
    badge.style.setProperty('--i', String(i));
    layer.append(badge);
  }
  root.prepend(layer);
}

/**
 * The rope, pulled toward whoever is ahead. The honest difference between two
 * close totals would move it a hair, so the pull is exaggerated — still
 * pointing the right way, still bigger for a bigger lead.
 */
function tug(head: HTMLElement, card: SplitCard): void {
  const [a, b] = card.sides;
  const lead = (b.value - a.value) / Math.max(a.value + b.value, 1);
  // Kept well inside the rope, so the heaves on the beat have room to swing
  // it back and forth rather than pinning it at one end.
  const pull = Math.max(-0.2, Math.min(0.2, lead * 2.2));
  const rope = el('div', 'tug');
  rope.setAttribute('aria-hidden', 'true');
  rope.style.setProperty('--pull', `${(pull * 100).toFixed(2)}%`);
  rope.style.setProperty('--pull-rope', `${((pull * 100) / 3).toFixed(2)}%`);
  const track = el('div', 'tug__track');
  track.append(el('div', 'tug__rope'));
  rope.append(track, el('span', 'tug__mid'), el('span', 'tug__marker'));
  const split = head.querySelector('.split');
  split?.after(rope);
}

/** Each side's balloon, inflated by its share; the bigger mouth wobbles. */
function balloons(head: HTMLElement, card: SplitCard): void {
  const [a, b] = card.sides;
  const most = Math.max(a.value, b.value, 1);
  const sides = head.querySelectorAll<HTMLElement>('.split__side');
  for (const [i, side] of [...sides].entries()) {
    const value = i === 0 ? a.value : b.value;
    const share = value / most;
    // Never smaller than the number it holds: the winner over-inflates, the
    // other stays snug round its own figure.
    const size = share >= 1 ? 1.16 : 0.92 + 0.08 * share ** 2;
    side.style.setProperty('--balloon', size.toFixed(3));
    if (share >= 1 && a.value !== b.value) side.dataset.bigger = '';
  }
}

/** A 24-hour dial round the figure, swept from midnight to the hour. */
function dial(value: HTMLElement, card: FigureCard): void {
  const hours = card.value / 60;
  const ring = svg('svg', { viewBox: '0 0 100 100', class: 'dial', 'aria-hidden': 'true' });
  ring.append(svg('circle', { cx: 50, cy: 50, r: 44, class: 'dial__track', pathLength: 24 }));
  for (let h = 0; h < 24; h += 1) {
    const major = h % 6 === 0;
    const tick = svg('line', {
      x1: 50,
      y1: major ? 2.5 : 3.5,
      x2: 50,
      y2: major ? 9 : 7,
      class: major ? 'dial__tick dial__tick--major' : 'dial__tick',
      transform: `rotate(${h * 15} 50 50)`,
    });
    ring.append(tick);
  }
  const fill = svg('circle', { cx: 50, cy: 50, r: 44, class: 'dial__fill', pathLength: 24 });
  fill.style.setProperty('--to', String(24 - hours));
  ring.append(fill);
  const hand = svg('g', { class: 'dial__hand' });
  hand.style.setProperty('--deg', `${hours * 15}deg`);
  hand.append(svg('circle', { cx: 50, cy: 6, r: 3.2, class: 'dial__tip' }));
  ring.append(hand);
  value.prepend(ring);
}

/** The laughs themselves, popping out round the figure. */
function laughs(root: HTMLElement, card: FigureCard): void {
  const words = card.laughs?.length ? card.laughs : ['haha', 'lol', 'lmao'];
  const rand = seeded(364);
  // Above and below the figure and caption, never on them.
  const spots: [number, number][] = [
    [18, 13], [52, 9], [83, 17], [30, 24], [72, 26], [16, 74], [50, 82], [84, 72], [34, 90], [68, 91],
  ];
  const layer = el('div', 'laughs');
  layer.setAttribute('aria-hidden', 'true');
  for (const [i, [x, y]] of spots.entries()) {
    const word = el('span', 'laugh', words[i % words.length]);
    word.style.setProperty('--x', `${x}%`);
    word.style.setProperty('--y', `${y}%`);
    word.style.setProperty('--i', String(i));
    word.style.setProperty('--r', `${Math.round(rand() * 30 - 15)}deg`);
    word.style.setProperty('--size', (0.85 + rand() * 0.9).toFixed(2));
    layer.append(word);
  }
  root.prepend(layer);
}

/** The first message, arriving the way it did: typing, then there it is. */
function chat(head: HTMLElement, card: QuoteCard): void {
  const quote = head.querySelector('.quote');
  if (!quote) return;
  const initial = [...card.author][0]?.toUpperCase() ?? '';

  const dm = el('div', 'dm');
  const typing = el('div', 'dm__typing');
  typing.setAttribute('aria-hidden', 'true');
  const dots = el('span', 'dm__dots');
  dots.append(el('i'), el('i'), el('i'));
  typing.append(el('span', 'dm__avatar', initial), el('span', 'dm__who', `${card.author} is typing`), dots);

  const message = el('div', 'dm__message');
  const body = el('div', 'dm__body');
  const meta = el('div', 'dm__meta');
  meta.append(el('span', 'dm__name', card.author));
  if (card.footnote) meta.append(el('span', 'dm__time', card.footnote));
  body.append(meta, quote);
  message.append(el('span', 'dm__avatar', initial), body);

  dm.append(typing, message);
  head.append(dm);
}

/** Blank bubbles, both sides, twice over so the loop never shows a seam. */
function stream(root: HTMLElement): void {
  const rand = seeded(476);
  const layer = el('div', 'stream');
  layer.setAttribute('aria-hidden', 'true');
  const column = el('div', 'stream__col');
  const bubbles: HTMLElement[] = [];
  for (let i = 0; i < 14; i += 1) {
    const bubble = el('span', 'bub');
    if (rand() > 0.5) bubble.dataset.side = 'right';
    bubble.style.setProperty('--w', `${Math.round(28 + rand() * 42)}%`);
    bubble.style.setProperty('--lines', String(rand() > 0.6 ? 2 : 1));
    bubbles.push(bubble);
  }
  column.append(...bubbles, ...bubbles.map((b) => b.cloneNode(true) as HTMLElement));
  layer.append(column);
  root.prepend(layer);
}

/** Dawn coming up behind the clock. */
function dawn(root: HTMLElement): void {
  const layer = el('div', 'dawn');
  layer.setAttribute('aria-hidden', 'true');
  root.prepend(layer);
}

/** Adds a card's gimmick markup. Called once, when the card is built. */
export function decorate(root: HTMLElement, card: Card): void {
  if (!('gimmick' in card) || !card.gimmick) return;
  root.dataset.gimmick = card.gimmick;
  const head = root.querySelector<HTMLElement>('.card__head');
  const value = root.querySelector<HTMLElement>('.figure__value');
  if (!head) return;

  switch (card.gimmick) {
    case 'buzz':
      badges(root);
      break;
    case 'tug':
      if (card.kind === 'split') tug(head, card);
      break;
    case 'balloons':
      if (card.kind === 'split') balloons(head, card);
      break;
    case 'dial':
      if (card.kind === 'figure' && value) dial(value, card);
      break;
    case 'giggle':
      if (card.kind === 'figure') laughs(root, card);
      break;
    case 'chat':
      if (card.kind === 'quote') chat(head, card);
      break;
    case 'stream':
      stream(root);
      break;
    case 'flipclock':
      dawn(root);
      break;
    case 'typo':
      break;
  }
}

// --- Timed gimmicks ---------------------------------------------------------

/** Wait for the figure's landing before starting. */
const START_MS = 420;

/**
 * Types the figure out a key at a time. Near the end, two neighbouring digits
 * go in the wrong way round, sit there a beat, get backspaced, and go in
 * right — "Typos included."
 */
function mountTypo(root: HTMLElement): GimmickHandle {
  const live = root.querySelector<HTMLElement>('.figure__live');
  const ghost = root.querySelector<HTMLElement>('.figure__ghost');
  const final = ghost?.textContent ?? '';
  if (!live || !final) return { cancel() {} };

  const text = el('span', 'typed');
  const caret = el('span', 'caret');
  caret.setAttribute('aria-hidden', 'true');
  live.replaceChildren(text, caret);

  if (currentMotion() === 'off') {
    text.textContent = final;
    return {
      cancel() {
        live.textContent = final;
      },
    };
  }

  // Keystrokes: a character to add, or null for a backspace.
  const keys: (string | null)[] = [];
  let swap = -1;
  // The last pair that can be swapped: a slip near the end reads as a slip.
  for (let i = final.length - 2; i >= 0; i -= 1) {
    const [c, d] = [final[i] ?? '', final[i + 1] ?? ''];
    if (/\d/.test(c) && /\d/.test(d) && c !== d) {
      swap = i;
      break;
    }
  }
  for (let i = 0; i < final.length; i += 1) {
    if (i === swap) {
      keys.push(final[i + 1] ?? '', final[i] ?? '', 'pause', null, null);
    }
    keys.push(final[i] ?? '');
  }

  const rand = seeded(154);
  let timer = 0;
  let at = 0;
  const tick = (): void => {
    const key = keys[at];
    at += 1;
    if (key === undefined) {
      caret.dataset.idle = '';
      return;
    }
    if (key === null) text.textContent = (text.textContent ?? '').slice(0, -1);
    else if (key !== 'pause') text.textContent = (text.textContent ?? '') + key;
    if (key !== 'pause') live.animate([{ transform: 'translateY(0.015em)' }, { transform: 'none' }], 90);
    const wait = key === 'pause' ? 520 : key === null ? 110 : 110 + rand() * 90;
    timer = window.setTimeout(tick, wait);
  };
  timer = window.setTimeout(tick, START_MS);

  return {
    cancel() {
      window.clearTimeout(timer);
      live.textContent = final;
    },
  };
}

/** Rolls the clock forward from 1 am to the figure's time, easing in. */
function mountFlipclock(root: HTMLElement, card: FigureCard): GimmickHandle {
  const live = root.querySelector<HTMLElement>('.figure__live');
  const unit = root.querySelector<HTMLElement>('.figure__unit');
  const finalText = formatClock(card.value);
  const settle = (): void => {
    if (live) live.textContent = finalText.text;
    if (unit) unit.textContent = finalText.suffix ?? '';
  };
  if (!live || currentMotion() === 'off') {
    settle();
    return { cancel: settle };
  }

  // Count through the small hours: from 1:00 am, all the same width, so the
  // figure never outgrows the space its final value measured for it.
  const from = 60;
  const to = card.value >= from ? card.value : card.value + 1440;
  const duration = 2400;
  let frame = 0;
  let begun = 0;
  let lastHour = -1;

  const show = (minutes: number): void => {
    const t = formatClock(minutes);
    live.textContent = t.text;
    if (unit) unit.textContent = t.suffix ?? '';
    const hour = Math.floor(minutes / 60) % 24;
    if (hour !== lastHour) {
      if (lastHour !== -1) {
        live.animate(
          [
            { transform: 'perspective(600px) rotateX(-65deg)', opacity: 0.4 },
            { transform: 'perspective(600px) rotateX(0deg)', opacity: 1 },
          ],
          { duration: 160, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
        );
      }
      lastHour = hour;
    }
  };

  show(from);
  const step = (now: number): void => {
    if (begun === 0) begun = now;
    const t = Math.min(Math.max((now - begun - START_MS) / duration, 0), 1);
    // Fast through the night, slowing as it gets light.
    const eased = 1 - (1 - t) ** 3;
    show(Math.round(from + (to - from) * eased));
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);

  return {
    cancel() {
      cancelAnimationFrame(frame);
      settle();
    },
  };
}

/** A phone buzz: two short shakes, then still. */
const BUZZ: Keyframe[] = [
  { transform: 'translate(0, 0) rotate(0deg)' },
  { transform: 'translate(-4px, 1px) rotate(-1.2deg)', offset: 0.1 },
  { transform: 'translate(4px, -1px) rotate(1.2deg)', offset: 0.2 },
  { transform: 'translate(-4px, 1px) rotate(-1.2deg)', offset: 0.3 },
  { transform: 'translate(4px, -1px) rotate(1.2deg)', offset: 0.4 },
  { transform: 'translate(-2px, 0) rotate(-0.5deg)', offset: 0.55 },
  { transform: 'translate(0, 0) rotate(0deg)' },
];

const BUMP: Keyframe[] = [
  { transform: 'translate(-50%, -50%) scale(1)' },
  { transform: 'translate(-50%, -50%) scale(1.2)', offset: 0.3 },
  { transform: 'translate(-50%, -50%) scale(0.95)', offset: 0.6 },
  { transform: 'translate(-50%, -50%) scale(1)' },
];

/** The phone goes off on every beat of the song, and every badge jumps. */
function mountBuzz(root: HTMLElement, songTime: SongClock): GimmickHandle {
  const value = root.querySelector<HTMLElement>('.figure__value');
  const badgeEls = [...root.querySelectorAll<HTMLElement>('.badge')];
  if (!value || currentMotion() === 'off') return { cancel() {} };

  const onBeat = beatWatcher(songTime);
  let frame = 0;
  let begun = 0;
  const step = (now: number): void => {
    if (begun === 0) begun = now;
    const wall = (now - begun) / 1000;
    if (onBeat(wall) && wall * 1000 > START_MS) {
      value.animate(BUZZ, { duration: 340, easing: 'linear' });
      for (const [i, badge] of badgeEls.entries()) {
        badge.animate(BUMP, { duration: 380, delay: i * 22, easing: 'ease-out' });
      }
    }
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return {
    cancel() {
      cancelAnimationFrame(frame);
    },
  };
}

/**
 * The tug-of-war, as a spring. It plays out in three acts, heaved on the
 * song's beat from alternate ends the whole way:
 *   1. an even fight — the knot sways back and forth across the middle;
 *   2. the winner takes over — the knot climbs steadily toward their side;
 *   3. held — it rests on their side, still swaying, gently now.
 * Both numbers lean with the rope.
 */
const TUG = {
  /** When the even fight ends and the climb begins, and how long the climb takes. */
  climbAt: 3.6,
  climbFor: 3.4,
  stiff: 14,
  damp: 2.4,
  /** Heave strength in each act: [ahead, behind]. */
  even: [24, 24],
  climbing: [30, 16],
  held: [13, 9],
} as const;

/** Eased at both ends, steady through the middle. */
const steady = (t: number): number => {
  const c = Math.min(Math.max(t, 0), 1);
  return c < 0.15 ? (c * c) / 0.3 : c > 0.85 ? 1 - ((1 - c) * (1 - c)) / 0.3 : c - 0.075;
};

function mountTug(root: HTMLElement, songTime: SongClock): GimmickHandle {
  const tugEl = root.querySelector<HTMLElement>('.tug');
  const marker = root.querySelector<HTMLElement>('.tug__marker');
  const rope = root.querySelector<HTMLElement>('.tug__rope');
  const sides = [...root.querySelectorAll<HTMLElement>('.split__side')];
  if (!tugEl || !marker || !rope || currentMotion() === 'off') return { cancel() {} };

  const pull = Number.parseFloat(tugEl.style.getPropertyValue('--pull')) || 0;
  const toward = pull === 0 ? -1 : Math.sign(pull);
  let x = 0;
  let v = 0;
  let pulls = 0;
  const onBeat = beatWatcher(songTime);

  const paint = (): void => {
    marker.style.left = `calc(50% + ${x.toFixed(2)}%)`;
    rope.style.transform = `translateX(${(x / 3).toFixed(2)}%)`;
    for (const side of sides) side.style.rotate = `${(x * 0.12).toFixed(2)}deg`;
  };

  let frame = 0;
  let begun = 0;
  let last = 0;
  const step = (now: number): void => {
    if (begun === 0) begun = last = now;
    const wall = (now - begun) / 1000;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (wall * 1000 > START_MS / 2) {
      const climb = (wall - TUG.climbAt) / TUG.climbFor;
      const target = pull * steady(climb);
      if (onBeat(wall)) {
        const [ahead, behind] = climb < 0 ? TUG.even : climb < 1 ? TUG.climbing : TUG.held;
        const dir = pulls % 2 === 0 ? toward : -toward;
        v += dir * (dir === toward ? ahead : behind);
        pulls += 1;
      }
      v += (-TUG.stiff * (x - target) - TUG.damp * v) * dt;
      x = Math.max(-46, Math.min(46, x + v * dt));
    }
    paint();
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);

  return {
    cancel() {
      cancelAnimationFrame(frame);
      marker.style.left = '';
      rope.style.transform = '';
      for (const side of sides) side.style.rotate = '';
    },
  };
}

/** Starts a card's timed gimmick, if it has one. */
export function mountGimmick(root: HTMLElement, card: Card, songTime: SongClock): GimmickHandle | null {
  if (!('gimmick' in card)) return null;
  if (card.gimmick === 'buzz') return mountBuzz(root, songTime);
  if (card.gimmick === 'tug') return mountTug(root, songTime);
  if (card.gimmick === 'typo') return mountTypo(root);
  if (card.gimmick === 'flipclock' && card.kind === 'figure') return mountFlipclock(root, card);
  return null;
}
