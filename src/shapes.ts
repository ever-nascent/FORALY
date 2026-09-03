/**
 * The shape layer. One composition per card, built as SVG on a 0–100 grid and
 * slice-fitted to the card, sitting behind the type.
 *
 * These are not wallpaper. Each composition is chosen for the statistic in
 * front of it — the split card is two overlapping circles, the streak is a grid
 * of days, the hour is a clock that actually runs, and the card about how long
 * they went quiet gets a nearly empty frame with one mark in it.
 *
 * Every part carries a `data-motion` naming how it keeps moving once it has
 * arrived, and an index the CSS uses to give each one its own period so a
 * composition never moves as a single block.
 */

import type { ShapeKind } from './palette';

const NS = 'http://www.w3.org/2000/svg';

/** How a part behaves after its entrance. The CSS owns the actual keyframes. */
type Motion =
  | 'pulse'
  | 'breathe'
  | 'ripple'
  | 'orbit'
  | 'sweep'
  | 'spin'
  | 'stretch'
  | 'widen'
  | 'driftX'
  | 'driftY'
  | 'twinkle';

type Attrs = Record<string, string | number>;

interface Options {
  motion?: Motion;
  /** Rotation or scaling centre in view-box units. Defaults to the part itself. */
  pivot?: [number, number];
  /** Reverses the direction of a paired motion, so two parts move oppositely. */
  mirror?: boolean;
}

function node(tag: string, attrs: Attrs = {}): SVGElement {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

/** `a` picks up the accent, `b` the ink; both land as soft washes over the ground. */
function part(
  tag: string,
  attrs: Attrs,
  tone: 'a' | 'b' | 'line',
  index: number,
  options: Options = {}
): SVGElement {
  const el = node(tag, attrs);
  el.setAttribute('class', `shape shape--${tone}`);

  const style = [`--i: ${index}`];
  if (options.pivot) {
    // Pivot about a point in the drawing rather than about the part's own box.
    style.push('transform-box: view-box');
    style.push(`transform-origin: ${options.pivot[0]}px ${options.pivot[1]}px`);
  }
  if (options.mirror) style.push('--dir: -1');
  el.setAttribute('style', style.join('; '));

  if (options.motion) el.setAttribute('data-motion', options.motion);
  return el;
}

function group(children: SVGElement[], options: Options = {}, index = 0): SVGElement {
  const g = node('g');
  g.setAttribute('class', 'shape');
  const style = [`--i: ${index}`];
  if (options.pivot) {
    style.push('transform-box: view-box');
    style.push(`transform-origin: ${options.pivot[0]}px ${options.pivot[1]}px`);
  }
  g.setAttribute('style', style.join('; '));
  if (options.motion) g.setAttribute('data-motion', options.motion);
  g.append(...children);
  return g;
}

/**
 * A rotated shape goes inside a group that carries the rotation, because the
 * animations set `transform` in CSS and a CSS transform overrides an element's
 * own transform attribute outright.
 */
function turned(el: SVGElement, degrees: number): SVGElement {
  const g = node('g', { transform: `rotate(${degrees} 50 50)` });
  g.append(el);
  return g;
}

const CENTRE: [number, number] = [50, 50];

function build(kind: ShapeKind, uid: string): SVGElement[] {
  switch (kind) {
    // The curtain going up, and then a slow sonar out of the same centre.
    case 'rings':
      return [16, 28, 42, 58, 76].map((r, i) =>
        part('circle', { cx: 50, cy: 38, r }, 'line', i, { motion: 'ripple', pivot: [50, 38] })
      );

    // One enormous count, and the small thing that keeps going round it.
    case 'orbit':
      return [
        part('circle', { cx: 12, cy: 74, r: 52 }, 'a', 0, { motion: 'breathe' }),
        group(
          [
            part('circle', { cx: 80, cy: 20, r: 11 }, 'b', 1),
            part('circle', { cx: 80, cy: 20, r: 20 }, 'line', 2),
          ],
          { motion: 'orbit', pivot: CENTRE },
          1
        ),
      ];

    // Words stacking up, breathing like a meter. Hung from the top edge,
    // because this card sets its figure at the bottom of the frame.
    case 'bars':
      return [26, 44, 32, 54, 36, 48, 24].map((h, i) =>
        part(
          'rect',
          { x: 4 + i * 14, y: 0, width: 9, height: h, rx: 4.5 },
          i % 2 ? 'b' : 'a',
          i,
          { motion: 'stretch', pivot: [8.5 + i * 14, 0] }
        )
      );

    // Two people, drifting together and apart.
    case 'twin':
      return [
        part('circle', { cx: 30, cy: 50, r: 33 }, 'a', 0, { motion: 'driftX' }),
        part('circle', { cx: 70, cy: 50, r: 33 }, 'b', 1, { motion: 'driftX', mirror: true }),
      ];

    // A clock that runs. The hands turn at different rates, off the centre of
    // the frame so neither ever crosses the hour it is pointing at.
    case 'arc':
      return [
        part('circle', { cx: 24, cy: 22, r: 26 }, 'line', 0, { motion: 'pulse', pivot: [24, 22] }),
        part('path', { d: 'M 24 22 L 24 2', fill: 'none' }, 'line', 1, {
          motion: 'sweep',
          pivot: [24, 22],
        }),
        part('path', { d: 'M 24 22 L 40 30', fill: 'none' }, 'line', 2, {
          motion: 'sweep',
          pivot: [24, 22],
          mirror: true,
        }),
        part('circle', { cx: 24, cy: 22, r: 2.6 }, 'a', 3),
        part('circle', { cx: 78, cy: 82, r: 20 }, 'a', 4, { motion: 'driftY' }),
      ];

    // One mark per day, unbroken, lighting up in a diagonal wave.
    case 'grid': {
      const dots: SVGElement[] = [];
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 9; col += 1) {
          dots.push(
            part('circle', { cx: 8 + col * 10.5, cy: 52 + row * 12, r: 2.4 }, 'a', row + col, {
              motion: 'twinkle',
            })
          );
        }
      }
      return dots;
    }

    // Hers: the one soft, unruled shape in the set, turning slowly.
    case 'blob':
      return [
        part(
          'path',
          {
            d: 'M 74 22 C 92 34 96 60 82 74 C 68 88 40 92 24 80 C 8 68 6 42 20 28 C 34 14 56 10 74 22 Z',
          },
          'a',
          0,
          { motion: 'spin', pivot: CENTRE }
        ),
        part(
          'path',
          { d: 'M 62 34 C 74 42 74 60 62 68 C 50 76 34 72 28 60 C 22 48 30 34 44 31 Z' },
          'b',
          1,
          { motion: 'spin', pivot: CENTRE, mirror: true }
        ),
      ];

    // Laughing: everything going outward at once, over and over.
    case 'burst': {
      const rays: SVGElement[] = [];
      for (let i = 0; i < 14; i += 1) {
        const angle = (i / 14) * Math.PI * 2;
        const inner = 14;
        const outer = i % 2 === 0 ? 52 : 38;
        rays.push(
          part(
            'path',
            {
              d:
                `M ${50 + Math.cos(angle) * inner} ${50 + Math.sin(angle) * inner} ` +
                `L ${50 + Math.cos(angle) * outer} ${50 + Math.sin(angle) * outer}`,
              fill: 'none',
            },
            'line',
            i,
            { motion: 'pulse', pivot: CENTRE }
          )
        );
      }
      return rays;
    }

    // A single message, held and breathing.
    case 'halo':
      return [
        part('circle', { cx: 50, cy: 46, r: 40 }, 'a', 0, { motion: 'breathe', pivot: [50, 46] }),
        part('circle', { cx: 50, cy: 46, r: 47 }, 'line', 1, { motion: 'ripple', pivot: [50, 46] }),
      ];

    // Four in the morning: the moon drifting, the stars going in and out.
    case 'moon': {
      const mask = node('mask', { id: `moon-${uid}` });
      // Mask channel values, not palette colours: white keeps, black cuts.
      // impeccable-disable-next-line design-system-color
      mask.append(node('rect', { x: 0, y: 0, width: 100, height: 100, fill: '#fff' }));
      // impeccable-disable-next-line design-system-color
      mask.append(node('circle', { cx: 74, cy: 30, r: 30, fill: '#000' }));
      const defs = node('defs');
      defs.append(mask);
      return [
        defs,
        part('circle', { cx: 58, cy: 36, r: 32, mask: `url(#moon-${uid})` }, 'a', 0, {
          motion: 'driftY',
        }),
        part('circle', { cx: 22, cy: 74, r: 1.8 }, 'b', 1, { motion: 'twinkle' }),
        part('circle', { cx: 32, cy: 86, r: 1.2 }, 'b', 4, { motion: 'twinkle' }),
        part('circle', { cx: 14, cy: 58, r: 1.4 }, 'b', 7, { motion: 'twinkle' }),
      ];
    }

    // A conversation that kept turning back on itself — each ring at its own rate.
    case 'spiral':
      return [0, 1, 2, 3].map((i) =>
        turned(
          part(
            'rect',
            { x: 22 + i * 4, y: 22 + i * 4, width: 56 - i * 8, height: 56 - i * 8, rx: 10, fill: 'none' },
            'line',
            i,
            { motion: 'spin', pivot: CENTRE, mirror: i % 2 === 1 }
          ),
          i * 12
        )
      );

    // The quiet one. Almost nothing in the frame, on purpose, barely moving.
    case 'sparse':
      return [
        part('path', { d: 'M 6 62 L 58 62', fill: 'none' }, 'line', 0, {
          motion: 'widen',
          pivot: [6, 62],
        }),
        part('circle', { cx: 84, cy: 32, r: 3 }, 'a', 1, { motion: 'driftY' }),
      ];

    // Her rose, opening — petals turning at slightly different rates.
    case 'bloom':
      return [0, 1, 2, 3, 4].map((i) =>
        turned(
          part('ellipse', { cx: 50, cy: 50, rx: 40, ry: 15 }, i % 2 ? 'b' : 'a', i, {
            motion: 'spin',
            pivot: CENTRE,
            mirror: i % 2 === 1,
          }),
          i * 36
        )
      );
  }
}

export function shapeLayer(kind: ShapeKind, uid: string): SVGSVGElement {
  const svg = node('svg', {
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'xMidYMid slice',
    'aria-hidden': 'true',
    focusable: 'false',
  }) as SVGSVGElement;
  svg.setAttribute('class', `shapes shapes--${kind}`);
  svg.append(...build(kind, uid));
  return svg;
}
