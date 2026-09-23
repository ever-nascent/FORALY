/**
 * The longest-quiet card's heart monitor. A trace runs straight through the
 * middle of the number and beats like the real thing — a P wave, the sharp
 * QRS spike, a T wave, flat between — while a bright sweep writes it from
 * left to right with a fading trail, the way a bedside monitor does. When the
 * sweep passes through the number, the number lights up.
 *
 * Driven from here rather than from CSS because a monitor sweeps at a
 * constant speed across the screen, and the trace has to be drawn in real
 * pixels to line up with the digits at every size. Rebuilt on resize.
 */

import { currentMotion } from './motion';

const NS = 'http://www.w3.org/2000/svg';

/** One sweep across the frame. About one beat a second, like a resting pulse. */
const SWEEP_MS = 3200;
const BEATS_PER_SWEEP = 3.4;
/** Let the figure land before the first sweep starts. */
const START_DELAY_MS = 800;
/** The trail behind the write head, as fractions of the width. */
const TRAIL = 0.42;
const HOT = 0.1;
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

/** The skeleton render.ts puts in the figure; the path is drawn on mount. */
export function monitorLayer(): SVGSVGElement {
  const svg = node('svg', 'ecg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.dataset.monitor = '';
  // The radius as an attribute: the CSS `r` property is not in every engine.
  const head = node('circle', 'ecg__head');
  head.setAttribute('r', '4.5');
  svg.append(node('path', 'ecg__base'), node('path', 'ecg__trail'), node('path', 'ecg__hot'), head);
  return svg;
}

/** A rhythm strip `w` × `h` pixels, beats evenly spaced, baseline centred. */
function strip(w: number, h: number): string {
  const mid = h / 2;
  const amp = mid - 3;
  const gap = w / BEATS_PER_SWEEP;
  const parts = [`M 0 ${mid}`];
  // The first beat lands a little way in, so the sweep never opens on a spike.
  for (let x = gap * 0.55; x < w + gap; x += gap) {
    const u = gap / 10;
    const at = (dx: number, dy: number): string => `${(x + dx * u).toFixed(1)} ${(mid + dy * amp).toFixed(1)}`;
    parts.push(
      `L ${at(-3.2, 0)}`,
      `Q ${at(-2.5, -0.28)} ${at(-1.8, 0)}`, // P
      `L ${at(-0.5, 0)}`,
      `L ${at(-0.25, 0.14)}`, // Q
      `L ${at(0.1, -1)}`, // R
      `L ${at(0.5, 0.42)}`, // S
      `L ${at(0.8, 0)}`,
      `L ${at(1.6, 0)}`,
      `Q ${at(2.5, -0.38)} ${at(3.4, 0)}` // T
    );
  }
  parts.push(`L ${w} ${mid}`);
  return parts.join(' ');
}

export function mountMonitor(svg: SVGSVGElement): MonitorHandle {
  const base = svg.querySelector<SVGPathElement>('.ecg__base');
  const trail = svg.querySelector<SVGPathElement>('.ecg__trail');
  const hot = svg.querySelector<SVGPathElement>('.ecg__hot');
  const head = svg.querySelector<SVGCircleElement>('.ecg__head');
  const figure = svg.closest<HTMLElement>('.figure__value');
  const digits = figure?.querySelector<HTMLElement>('.figure__ghost') ?? figure;
  if (!base || !trail || !hot || !head || !figure || !digits) return { cancel() {} };

  let width = 0;
  let length = 0;
  /** Path length at evenly spaced x, so the head moves at constant speed across. */
  let table: number[] = [];

  const draw = (): void => {
    // The laid-out size, not getBoundingClientRect: that one includes the
    // figure's landing zoom, and clientWidth is 0 on an <svg> in some engines.
    const style = getComputedStyle(svg);
    const w = Number.parseFloat(style.width);
    const h = Number.parseFloat(style.height);
    if (w === 0 || h === 0 || w === width) return;
    width = w;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const d = strip(w, h);
    for (const path of [base, trail, hot]) path.setAttribute('d', d);
    length = base.getTotalLength();

    table = [];
    const samples = 400;
    let at = 0;
    for (let i = 0; i <= samples; i += 1) {
      const x = (i / samples) * w;
      while (at < length && base.getPointAtLength(at).x < x) at += 2;
      table.push(Math.min(at, length));
    }
  };

  const lengthAtX = (x: number): number => {
    const f = (Math.min(Math.max(x / width, 0), 1) * (table.length - 1));
    const i = Math.floor(f);
    const a = table[i] ?? 0;
    const b = table[Math.min(i + 1, table.length - 1)] ?? a;
    return a + (b - a) * (f - i);
  };

  draw();
  const watch = new ResizeObserver(() => draw());
  watch.observe(svg);

  if (currentMotion() === 'off') {
    // Still: the whole strip, drawn once, nothing sweeping.
    svg.dataset.still = '';
    return {
      cancel() {
        watch.disconnect();
      },
    };
  }
  delete svg.dataset.still;

  let frame = 0;
  let begun = 0;

  const paint = (tail: SVGPathElement, at: number, span: number): void => {
    const from = Math.max(at - span, 0);
    tail.style.strokeDasharray = `0 ${from} ${at - from} ${length * 2}`;
  };

  const step = (now: number): void => {
    if (begun === 0) begun = now;
    const t = now - begun - START_DELAY_MS;
    if (t >= 0 && length > 0) {
      const x = ((t % SWEEP_MS) / SWEEP_MS) * width;
      const at = lengthAtX(x);
      paint(trail, at, lengthAtX(x) - lengthAtX(x - width * TRAIL));
      paint(hot, at, lengthAtX(x) - lengthAtX(x - width * HOT));
      const point = base.getPointAtLength(at);
      head.setAttribute('cx', String(point.x));
      head.setAttribute('cy', String(point.y));
      svg.dataset.running = '';

      // Is the write head inside the digits? Measured against the ghost,
      // which holds the number's real width.
      const s = svg.getBoundingClientRect();
      const n = digits.getBoundingClientRect();
      const scale = s.width / width || 1;
      const headX = s.left + x * scale;
      const inside = headX >= n.left - REACH_PX && headX <= n.right + REACH_PX;
      if (inside) figure.dataset.lit = '';
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
