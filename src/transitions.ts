/**
 * The move from one card to the next. Every card has its own way in and its
 * own way out, and a change of card plays the old one's exit and the new
 * one's entrance together, over the same stretch of time. One of the two
 * sits on top: the one whose move reveals the other (a page turning away, a
 * curtain going up, a torn-off calendar page) or covers it (a keyboard
 * sliding up, a box of sky coming down). Going back plays the same pair in
 * reverse, so every seam works in both directions.
 *
 *   opening    exit: the curtain goes up
 *   buzz       in: the phone buzzes into view
 *   scale      in: drops in from above and bounces
 *   typo       in: slides up like a phone keyboard;  out: the page turns
 *   chatter    in: the dictionary under the turning page
 *   dial       in: opens out from the clock, like an alarm going off
 *   calendar   in: dealt in;  out: torn off like a calendar page
 *   greeting   in: dusk under the page;  out: a dive into the moon (or sun)
 *   giggle     in: out of the spotlight;  out: an iris closing on the mic
 *   chat       in: the lights come up
 *   flipclock  in: flips down like a clock's leaf
 *   stream     in: scrolls up like a chat;  out: switches off like an old TV
 *   monitor    in: out of the dark
 *   closing    in: the sky comes down, and the box falls out of it
 *
 * Every entrance ends on the card at rest, so once the move is over nothing
 * is left applied; src/deck.ts cancels both animations once they finish.
 */

import type { Card } from './cards/types';

type Frames = Keyframe[];

interface Move {
  /** Keyframes for this card, given where its focal point is, in px. */
  frames(focus: { x: number; y: number }): Frames;
  /** True when this card sits above the other one during the move. */
  top?: boolean;
  duration: number;
  easing?: string;
  /** What to aim at, when it is on the card; otherwise its centre. */
  focus?: (card: HTMLElement) => Element | null;
}

const PUSH = 'cubic-bezier(0.32, 0.72, 0, 1)';
const IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
const OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const FALL = 'cubic-bezier(0.55, 0, 1, 0.45)';

// --- Ways in ----------------------------------------------------------------

const ENTER: Record<string, Move> = {
  // Underneath, waking up while the other card clears off it.
  under: {
    duration: 800,
    easing: OUT,
    frames: () => [
      { transform: 'scale(0.95)', filter: 'brightness(0.55)' },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ],
  },
  // The first figure: the phone buzzes as it arrives.
  buzz: {
    duration: 900,
    frames: () => [
      { transform: 'translateX(0) scale(1.1)', filter: 'brightness(0.5)', easing: OUT },
      { transform: 'translateX(0) scale(1)', filter: 'brightness(1)', offset: 0.7 },
      { transform: 'translateX(-7px) scale(1)', offset: 0.77 },
      { transform: 'translateX(7px) scale(1)', offset: 0.84 },
      { transform: 'translateX(-4px) scale(1)', offset: 0.91 },
      { transform: 'translateX(0) scale(1)', filter: 'brightness(1)' },
    ],
  },
  // The scale: dropped in from above, landing with a bounce.
  drop: {
    top: true,
    duration: 900,
    frames: () => [
      { transform: 'translateY(-100%)', easing: FALL },
      { transform: 'translateY(0)', offset: 0.55, easing: OUT },
      { transform: 'translateY(-4%)', offset: 0.75, easing: 'ease-in' },
      { transform: 'translateY(0)' },
    ],
  },
  // The keyboard: up from the bottom, as a phone's does.
  keyboard: {
    top: true,
    duration: 760,
    easing: PUSH,
    frames: () => [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
  },
  // The dictionary, lit up as the page above it turns away.
  page: {
    duration: 1000,
    easing: 'ease-out',
    frames: () => [{ filter: 'brightness(0.4)' }, { filter: 'brightness(1)' }],
  },
  // The alarm clock: the card opens out from the clock's face.
  alarm: {
    top: true,
    duration: 900,
    easing: IN_OUT,
    focus: (card) => card.querySelector('.dial'),
    frames: ({ x, y }) => [
      { clipPath: `circle(0% at ${x}px ${y}px)` },
      { clipPath: `circle(150% at ${x}px ${y}px)` },
    ],
  },
  // Dealt in from the right, turning straight as it lands.
  deal: {
    top: true,
    duration: 800,
    easing: PUSH,
    frames: () => [
      { transform: 'translateX(105%) rotate(7deg)' },
      { transform: 'translateX(0) rotate(0deg)' },
    ],
  },
  // Dusk: the sky under the torn-off page, darker, settling.
  dusk: {
    duration: 1000,
    easing: OUT,
    frames: () => [
      { transform: 'scale(1.06)', filter: 'brightness(0.35)' },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ],
  },
  // Out of the spotlight: the club pulls back from the mic as the moon
  // above it opens up.
  spotlight: {
    duration: 1200,
    easing: OUT,
    focus: (card) => card.querySelector('.club__mic'),
    frames: ({ x, y }) => [
      { transformOrigin: `${x}px ${y}px`, transform: 'scale(2.6)', filter: 'brightness(0.4)' },
      { transformOrigin: `${x}px ${y}px`, transform: 'scale(1)', filter: 'brightness(1)' },
    ],
  },
  // The letter card: dark while the iris closes, then the lights come up.
  lights: {
    duration: 1100,
    frames: () => [
      { filter: 'brightness(0.12)' },
      { filter: 'brightness(0.12)', offset: 0.6, easing: 'ease-out' },
      { filter: 'brightness(1)' },
    ],
  },
  // The flip clock: the card flips down from the top, as a clock's leaf.
  flip: {
    top: true,
    duration: 900,
    frames: () => [
      { transformOrigin: '50% 0', transform: 'perspective(1400px) rotateX(-88deg)', easing: 'ease-in' },
      { transformOrigin: '50% 0', transform: 'perspective(1400px) rotateX(10deg)', offset: 0.65, easing: 'ease-out' },
      { transformOrigin: '50% 0', transform: 'perspective(1400px) rotateX(-4deg)', offset: 0.83 },
      { transformOrigin: '50% 0', transform: 'perspective(1400px) rotateX(0deg)' },
    ],
  },
  // The stream: scrolled up into view, like a chat that won't stop.
  scroll: {
    top: true,
    duration: 800,
    easing: PUSH,
    frames: () => [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
  },
  // The quiet: out of the black the television left behind.
  dark: {
    duration: 1100,
    frames: () => [
      { filter: 'brightness(0)' },
      { filter: 'brightness(0)', offset: 0.55, easing: 'ease-out' },
      { filter: 'brightness(1)' },
    ],
  },
  // The last card: the sky comes down; the box falls out of it after.
  sky: {
    top: true,
    duration: 1000,
    easing: PUSH,
    frames: () => [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }],
  },
};

// --- Ways out ---------------------------------------------------------------

const EXIT: Record<string, Move> = {
  // Underneath, sinking back and darkening as the next one covers it.
  sink: {
    duration: 800,
    easing: OUT,
    frames: () => [
      { transform: 'scale(1)', filter: 'brightness(1)' },
      { transform: 'scale(0.92)', filter: 'brightness(0.45)' },
    ],
  },
  // Pushed up a little as the next one slides up under it.
  lift: {
    duration: 800,
    easing: PUSH,
    frames: () => [
      { transform: 'translateY(0)', filter: 'brightness(1)' },
      { transform: 'translateY(-22%)', filter: 'brightness(0.5)' },
    ],
  },
  // The opening: the curtain goes up.
  curtain: {
    top: true,
    duration: 1000,
    easing: IN_OUT,
    frames: () => [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
  },
  // The page turns, from its left edge, darkening as it goes over.
  page: {
    top: true,
    duration: 1000,
    easing: 'cubic-bezier(0.45, 0, 0.25, 1)',
    frames: () => [
      { transformOrigin: '0 50%', transform: 'perspective(1800px) rotateY(0deg)', filter: 'brightness(1)' },
      { transformOrigin: '0 50%', transform: 'perspective(1800px) rotateY(-92deg)', filter: 'brightness(0.6)' },
    ],
  },
  // A calendar page, torn off: it peels at a corner, then drops away.
  tear: {
    top: true,
    duration: 1000,
    frames: () => [
      { transformOrigin: '0 0', transform: 'translateY(0) rotate(0deg)', easing: 'ease-out' },
      { transformOrigin: '0 0', transform: 'translateY(0) rotate(-5deg)', offset: 0.28, easing: FALL },
      { transformOrigin: '0 0', transform: 'translateY(115%) rotate(12deg)' },
    ],
  },
  // Into the moon, or the sun in the morning: the sky zooms in on it until
  // it fills the screen, then fades into what is behind.
  zoom: {
    top: true,
    duration: 1200,
    focus: (card) => card.querySelector(card.dataset.greetingState === 'day' ? '.gsun' : '.gmoon'),
    frames: ({ x, y }) => [
      { transformOrigin: `${x}px ${y}px`, transform: 'scale(1)', opacity: 1, easing: 'cubic-bezier(0.6, 0, 0.9, 0.6)' },
      { transformOrigin: `${x}px ${y}px`, transform: 'scale(9)', opacity: 1, offset: 0.62 },
      { transformOrigin: `${x}px ${y}px`, transform: 'scale(14)', opacity: 0 },
    ],
  },
  // The club: an iris closes on the mic, the way an old cartoon ends.
  iris: {
    top: true,
    duration: 1100,
    focus: (card) => card.querySelector('.club__mic'),
    frames: ({ x, y }) => [
      { clipPath: `circle(150% at ${x}px ${y}px)`, easing: IN_OUT },
      { clipPath: `circle(9% at ${x}px ${y}px)`, offset: 0.55 },
      { clipPath: `circle(9% at ${x}px ${y}px)`, offset: 0.68, easing: 'ease-in' },
      { clipPath: `circle(0% at ${x}px ${y}px)` },
    ],
  },
  // The stream: switched off like an old television. The picture squeezes
  // to a bright line, the line to a dot, and the dot goes out.
  tv: {
    top: true,
    duration: 1100,
    frames: () => [
      { transform: 'scale(1, 1)', filter: 'brightness(1)', opacity: 1, easing: 'ease-in' },
      { transform: 'scale(1, 0.006)', filter: 'brightness(3)', opacity: 1, offset: 0.3, easing: 'ease-in' },
      { transform: 'scale(0.002, 0.006)', filter: 'brightness(4)', opacity: 1, offset: 0.5 },
      { transform: 'scale(0.002, 0.006)', filter: 'brightness(4)', opacity: 0 },
    ],
  },
};

/** Which entrance and exit each card has. */
function movesFor(card: Card): { enter: string; exit: string } {
  switch (card.kind) {
    case 'opening':
      return { enter: 'under', exit: 'curtain' };
    case 'greeting':
      return { enter: 'dusk', exit: 'zoom' };
    case 'closing':
      return { enter: 'sky', exit: 'sink' };
    default:
      break;
  }
  if (card.kind === 'figure' && card.calendar) return { enter: 'deal', exit: 'tear' };
  if (card.kind === 'figure' && card.monitor) return { enter: 'dark', exit: 'sink' };
  switch ('gimmick' in card ? card.gimmick : undefined) {
    case 'buzz':
      return { enter: 'buzz', exit: 'sink' };
    case 'scale':
      return { enter: 'drop', exit: 'lift' };
    case 'typo':
      return { enter: 'keyboard', exit: 'page' };
    case 'chatter':
      return { enter: 'page', exit: 'sink' };
    case 'dial':
      return { enter: 'alarm', exit: 'sink' };
    case 'giggle':
      return { enter: 'spotlight', exit: 'iris' };
    case 'chat':
      return { enter: 'lights', exit: 'sink' };
    case 'flipclock':
      return { enter: 'flip', exit: 'lift' };
    case 'stream':
      return { enter: 'scroll', exit: 'tv' };
    default:
      return { enter: 'deal', exit: 'sink' };
  }
}

/** The centre of the move's focus on the card, in the card's own px. */
function focusOf(node: HTMLElement, move: Move): { x: number; y: number } {
  const box = node.getBoundingClientRect();
  const r = move.focus?.(node)?.getBoundingClientRect();
  if (!r || (r.width === 0 && r.height === 0)) return { x: box.width / 2, y: box.height / 2 };
  return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
}

/**
 * Plays the move between two cards. `earlier` and `later` are in deck order;
 * `forward` says which way she is going. The pair is always the earlier
 * card's exit with the later card's entrance, run forwards or backwards.
 */
export function playTransition(
  earlier: HTMLElement,
  earlierCard: Card,
  later: HTMLElement,
  laterCard: Card,
  forward: boolean
): Animation[] {
  const exit = EXIT[movesFor(earlierCard).exit] ?? (EXIT.sink as Move);
  const enter = ENTER[movesFor(laterCard).enter] ?? (ENTER.deal as Move);
  const duration = Math.max(exit.duration, enter.duration);

  // The exit sits on top if it reveals; otherwise the entrance covers.
  const earlierOnTop = Boolean(exit.top);
  earlier.style.zIndex = earlierOnTop ? '3' : '2';
  later.style.zIndex = earlierOnTop ? '2' : '3';

  const options: KeyframeAnimationOptions = {
    duration,
    easing: 'linear',
    fill: 'both',
    direction: forward ? 'normal' : 'reverse',
  };
  // A move's own easing goes on its keyframes, so it holds either way round.
  const eased = (move: Move, frames: Frames): Frames => {
    const easing = move.easing;
    if (!easing) return frames;
    return frames.map((f, i) => (i < frames.length - 1 && !f.easing ? { ...f, easing } : f));
  };

  const a = earlier.animate(eased(exit, exit.frames(focusOf(earlier, exit))), options);
  const b = later.animate(eased(enter, enter.frames(focusOf(later, enter))), options);
  return [a, b];
}
