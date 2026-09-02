/**
 * The count-up. Used on the two or three cards where the magnitude is the
 * point; if every number counted, none of them would mean anything.
 *
 * It runs on the same curve as the figure's landing animation, so the digits
 * are still resolving as the number arrives and settle just after it does.
 */

import { formatInteger } from './format';

/** cubic-bezier(0.23, 1, 0.32, 1) — the same strong ease-out the CSS uses. */
const P1X = 0.23;
const P1Y = 1;
const P2X = 0.32;
const P2Y = 1;

function bezier(t: number, a: number, b: number): number {
  const c = 3 * a;
  const d = 3 * (b - a) - c;
  const e = 1 - c - d;
  return ((e * t + d) * t + c) * t;
}

function slope(t: number, a: number, b: number): number {
  const c = 3 * a;
  const d = 3 * (b - a) - c;
  const e = 1 - c - d;
  return (3 * e * t + 2 * d) * t + c;
}

/** Newton–Raphson against the x curve, then read y. Exact, not approximated. */
function ease(x: number): number {
  let t = x;
  for (let i = 0; i < 6; i += 1) {
    const dx = slope(t, P1X, P2X);
    if (dx === 0) break;
    t -= (bezier(t, P1X, P2X) - x) / dx;
  }
  return bezier(Math.min(Math.max(t, 0), 1), P1Y, P2Y);
}

export interface CountHandle {
  cancel(): void;
}

export function countUp(
  el: HTMLElement,
  to: number,
  durationMs: number,
  delayMs: number
): CountHandle {
  if (durationMs <= 0) {
    el.textContent = formatInteger(to);
    return { cancel() {} };
  }

  let frame = 0;
  let start = 0;
  el.textContent = formatInteger(0);

  const step = (now: number): void => {
    if (start === 0) start = now;
    const elapsed = now - start - delayMs;
    if (elapsed < 0) {
      frame = requestAnimationFrame(step);
      return;
    }
    const t = Math.min(elapsed / durationMs, 1);
    el.textContent = formatInteger(to * ease(t));
    if (t < 1) frame = requestAnimationFrame(step);
  };

  frame = requestAnimationFrame(step);

  return {
    cancel() {
      cancelAnimationFrame(frame);
      el.textContent = formatInteger(to);
    },
  };
}
