/**
 * Whether the sequence moves.
 *
 * The question is asked once, here, and the answer is written to
 * `<html data-motion>`. Every stylesheet reads it from that one attribute
 * rather than repeating `prefers-reduced-motion` in four files — which matters
 * because a media query cannot be overruled from inside the page, and this one
 * has to be: a sequence that has gone still because the operating system asked
 * is indistinguishable from a sequence that is broken. That is the report this
 * exists to answer.
 *
 * Inputs, in order of authority:
 *   1. `?motion=on` or `?motion=off` in the URL, which also becomes the choice
 *   2. a choice made on this device, kept in localStorage
 *   3. otherwise on — the operating system's reduced-motion setting does not
 *      still it on its own
 *
 * Nothing here runs without JavaScript, and neither does the sequence.
 */

export type MotionState = 'on' | 'off';

const KEY = 'three-months:motion';

function read(): MotionState | null {
  try {
    const kept = localStorage.getItem(KEY);
    return kept === 'on' || kept === 'off' ? kept : null;
  } catch {
    // Private browsing, or storage switched off. The choice simply does not keep.
    return null;
  }
}

function keep(state: MotionState): void {
  try {
    localStorage.setItem(KEY, state);
  } catch {
    // As above. Nothing to do and nothing worth saying.
  }
}

function apply(state: MotionState): void {
  document.documentElement.dataset.motion = state;
}

function fromUrl(): MotionState | null {
  const asked = new URLSearchParams(location.search).get('motion');
  return asked === 'on' || asked === 'off' ? asked : null;
}

/**
 * Settle the question before the first card is built. The motion is the
 * piece, so it is on unless someone has turned it off by hand — the system's
 * reduced-motion setting alone does not still it, because a still sequence
 * reads as a broken one.
 */
export function startMotion(): MotionState {
  const asked = fromUrl();
  if (asked) keep(asked);

  const state: MotionState = asked ?? read() ?? 'on';
  apply(state);
  return state;
}

export function currentMotion(): MotionState {
  return document.documentElement.dataset.motion === 'off' ? 'off' : 'on';
}

/** Flips it, remembers it, and hands back what it is now. */
export function toggleMotion(): MotionState {
  const next: MotionState = currentMotion() === 'on' ? 'off' : 'on';
  keep(next);
  apply(next);
  return next;
}
