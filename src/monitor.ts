/**
 * The longest-quiet card's heart monitor. A trace runs straight through the
 * middle of the number and is written live, the way a bedside monitor writes
 * it: a head sweeps left to right at a constant speed, drawing a flat line
 * until the heart beats, when it draws one sharp spike. Behind the head the
 * fresh trace glows and fades; just ahead of it, the old sweep is erased.
 *
 * The heart beats in time with the score: on the song's own strong beats
 * while it is playing (src/scoreBeats.ts), and at the same tempo on its own
 * when it is not. On every beat the number beats too — lub, dub — and while
 * the head is passing through the digits the number lights up.
 */

import { currentMotion } from './motion';
import { sinceBeat, type SongClock } from './beat';
import { SCORE_BEAT_SECONDS } from './scoreBeats';

const NS = 'http://www.w3.org/2000/svg';

/** How fast the head sweeps, in px a second — about three beats a sweep on a
 *  phone, kept within bounds so a wide screen does not smear each spike. */
const SPEED = { perWidth: 1 / 3.2, min: 110, max: 260 };
/** Let the figure land before the head starts writing. */
const START_DELAY_MS = 800;
/** The glowing fresh trace behind the head, and the erased gap ahead of it. */
const FRESH_PX = 70;
const GAP_PX = 14;
/** Columns are kept every STEP_PX; plenty for a line this simple. */
const STEP_PX = 2;
/** How far either side of the digits still counts as "passing through". */
const REACH_PX = 6;

export interface MonitorHandle {
  cancel(): void;
}

function node<K extends keyof SVGElementTagNameMap>(tag: K, className: string): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  el.setAttribute('class', className);
  return el;
}

/** The skeleton render.ts puts in the figure; the trace is drawn on mount. */
export function monitorLayer(): SVGSVGElement {
  const svg = node('svg', 'ecg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.dataset.monitor = '';
  // The radius as an attribute: the CSS `r` property is not in every engine.
  const head = node('circle', 'ecg__head');
  head.setAttribute('r', '4.5');
  svg.append(node('path', 'ecg__old'), node('path', 'ecg__fresh'), head);
  return svg;
}

/**
 * The spike, as a function of seconds since the beat: a small dip, the tall
 * sharp rise, a dip below the line, and back. Flat everywhere else — no
 * humps before or after. Positive is down, in units of the half-height.
 */
function spike(dt: number): number {
  const shape: [number, number][] = [
    [0, 0],
    [0.025, 0.16],
    [0.06, -1],
    [0.095, 0.45],
    [0.13, 0],
  ];
  if (dt <= 0 || dt >= 0.13) return 0;
  for (let i = 1; i < shape.length; i += 1) {
    const [t1, y1] = shape[i] as [number, number];
    const [t0, y0] = shape[i - 1] as [number, number];
    if (dt <= t1) return y0 + ((y1 - y0) * (dt - t0)) / (t1 - t0);
  }
  return 0;
}

const LUB_DUB: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.09)', offset: 0.12 },
  { transform: 'scale(1)', offset: 0.3 },
  { transform: 'scale(1.05)', offset: 0.42 },
  { transform: 'scale(1)', offset: 0.7 },
  { transform: 'scale(1)' },
];

export function mountMonitor(svg: SVGSVGElement, songTime: SongClock): MonitorHandle {
  const old = svg.querySelector<SVGPathElement>('.ecg__old');
  const fresh = svg.querySelector<SVGPathElement>('.ecg__fresh');
  const head = svg.querySelector<SVGCircleElement>('.ecg__head');
  const figure = svg.closest<HTMLElement>('.figure__value');
  const digits = figure?.querySelector<HTMLElement>('.figure__ghost') ?? figure;
  const number = figure?.querySelector<HTMLElement>('.figure__live');
  if (!old || !fresh || !head || !figure || !digits || !number) return { cancel() {} };

  let width = 0;
  let mid = 0;
  let amp = 0;
  /** One y per column, as a multiple of `amp` from the centre line. */
  let trace = new Float32Array(0);

  const size = (): boolean => {
    // The laid-out size, not getBoundingClientRect: that one includes the
    // figure's landing zoom, and clientWidth is 0 on an <svg> in some engines.
    const style = getComputedStyle(svg);
    const w = Number.parseFloat(style.width);
    const h = Number.parseFloat(style.height);
    if (!(w > 0 && h > 0)) return false;
    if (w !== width) trace = new Float32Array(Math.ceil(w / STEP_PX) + 1);
    width = w;
    mid = h / 2;
    amp = mid - 3;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    return true;
  };

  const line = (from: number, to: number): string => {
    const a = Math.max(0, Math.floor(from / STEP_PX));
    const b = Math.min(trace.length - 1, Math.ceil(to / STEP_PX));
    if (b <= a) return '';
    const points: string[] = [];
    for (let i = a; i <= b; i += 1) {
      points.push(`${i * STEP_PX} ${(mid + (trace[i] ?? 0) * amp).toFixed(1)}`);
    }
    return `M ${points.join(' L ')}`;
  };

  size();
  const watch = new ResizeObserver(() => size());
  watch.observe(svg);

  if (currentMotion() === 'off') {
    // Still: a strip already written, one spike a beat, nothing sweeping.
    svg.dataset.still = '';
    const speed = Math.min(Math.max(width * SPEED.perWidth, SPEED.min), SPEED.max);
    for (let i = 0; i < trace.length; i += 1) {
      trace[i] = spike(((i * STEP_PX) / speed + 0.3) % SCORE_BEAT_SECONDS);
    }
    old.setAttribute('d', line(0, width));
    return {
      cancel() {
        watch.disconnect();
      },
    };
  }
  delete svg.dataset.still;

  let frame = 0;
  let begun = 0;
  let headX = 0;
  let lastWall = 0;
  let lastPhase: number | null = null;

  const step = (now: number): void => {
    if (begun === 0) begun = now;
    const elapsed = now - begun - START_DELAY_MS;
    if (elapsed >= 0 && width > 0) {
      const wall = elapsed / 1000;
      const song = songTime();
      const speed = Math.min(Math.max(width * SPEED.perWidth, SPEED.min), SPEED.max);
      const dt = Math.min(wall - lastWall, 0.1);

      // Write every column the head crossed since the last frame, each at its
      // own moment, so a spike keeps its shape however the frames fall.
      const from = headX;
      headX += dt * speed;
      for (let x = from; x < headX; x += STEP_PX) {
        const back = (headX - x) / speed;
        const at = sinceBeat(song === null ? null : song - back, wall - back);
        const col = Math.floor((x % width) / STEP_PX);
        trace[col] = spike(at);
      }
      if (headX >= width) headX -= width;
      lastWall = wall;

      // The number beats on each new beat: the moment the time since the last
      // beat drops back towards zero.
      const phase = sinceBeat(song, wall);
      if (lastPhase !== null && phase < lastPhase) {
        number.animate(LUB_DUB, { duration: 760, easing: 'ease-out' });
      }
      lastPhase = phase;

      old.setAttribute('d', `${line(0, headX - FRESH_PX)} ${line(headX + GAP_PX, width)}`);
      fresh.setAttribute('d', line(headX - FRESH_PX, headX));
      const y = mid + (trace[Math.floor(headX / STEP_PX)] ?? 0) * amp;
      head.setAttribute('cx', String(headX));
      head.setAttribute('cy', String(y));
      svg.dataset.running = '';

      // Inside the digits? Measured against the ghost, which holds the
      // number's real width, in the same (transformed) space as the head.
      const s = svg.getBoundingClientRect();
      const n = digits.getBoundingClientRect();
      const px = s.left + headX * (s.width / width || 1);
      if (px >= n.left - REACH_PX && px <= n.right + REACH_PX) figure.dataset.lit = '';
      else delete figure.dataset.lit;
    }
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);

  return {
    cancel() {
      cancelAnimationFrame(frame);
      watch.disconnect();
      delete svg.dataset.running;
      delete figure.dataset.lit;
    },
  };
}
