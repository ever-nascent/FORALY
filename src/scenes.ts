/**
 * Scenes: the backgrounds too particular to be a shape composition. Each is
 * built once with its card and styled in src/styles/scenes.css.
 *
 *   greetingScene  a pop-up book's night-and-day wheel: moon and sun on one
 *                  disc behind a hill, turned half a revolution by the toggle
 *   clubScene      a comedy club: brick wall, spotlight, a mic on its stand,
 *                  and an audience in silhouette that laughs on the beat
 *   warmScene      the last card's glow, and every "I love you" drifting up
 *
 * All decoration, all hidden from assistive tech; any text placed here goes
 * in as text, never as HTML.
 */

const NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function hidden<T extends Element>(node: T): T {
  node.setAttribute('aria-hidden', 'true');
  return node;
}

/** A four-point sparkle, unit size, centred on the origin. */
const SPARKLE = 'M 0 -1 Q 0.14 -0.14 1 0 Q 0.14 0.14 0 1 Q -0.14 0.14 -1 0 Q -0.14 -0.14 0 -1 Z';

/** A five-point star, unit size, centred on the origin. */
const STAR = (() => {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 1 : 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${(Math.cos(a) * r).toFixed(3)} ${(Math.sin(a) * r).toFixed(3)}`);
  }
  return `M ${points.join(' L ')} Z`;
})();

/**
 * The night-and-day wheel from a pop-up book. The moon sits at the top of a
 * large disc and the sun at the bottom; the disc turns half a revolution to
 * swap them, rising and setting behind a hill in front. Two skies, stars for
 * the night and clouds for the day, crossfade with it.
 */
export function greetingScene(): HTMLElement {
  const scene = hidden(el('div', 'gscene'));
  scene.append(el('div', 'gscene__sky gscene__sky--night'), el('div', 'gscene__sky gscene__sky--day'));

  const stars = svg('svg', { class: 'gscene__stars', viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMid slice' });
  const spots: [number, number, number, boolean][] = [
    [10, 9, 1.9, true], [27, 5, 1.1, false], [44, 12, 1.4, false], [63, 7, 2.2, true], [81, 11, 1.2, false],
    [93, 21, 1.6, true], [6, 26, 1.2, false], [20, 20, 0.9, false], [36, 24, 2.4, true], [70, 17, 1, false],
    [72, 27, 1.5, false], [88, 33, 1, false], [14, 38, 1.5, true], [24, 33, 1.1, false], [66, 40, 1.8, true],
    [30, 43, 1, false], [84, 47, 1.3, false], [4, 50, 1, false],
  ];
  for (const [i, [x, y, s, sparkle]] of spots.entries()) {
    const at = svg('g', { transform: `translate(${x} ${y}) scale(${s})` });
    const shape = svg('path', { d: sparkle ? SPARKLE : STAR, class: sparkle ? 'gstar gstar--sparkle' : 'gstar' });
    shape.setAttribute('style', `--i: ${i}`);
    at.append(shape);
    stars.append(at);
  }
  scene.append(stars);

  // Shooting stars, now and then, each on its own long interval.
  const shooting = el('div', 'gscene__shooting');
  for (let i = 0; i < 3; i += 1) {
    const streak = el('span', 'gshoot');
    streak.style.setProperty('--i', String(i));
    shooting.append(streak);
  }
  scene.append(shooting);

  const clouds = el('div', 'gscene__clouds');
  for (let i = 0; i < 3; i += 1) {
    const cloud = el('span', 'gcloud');
    cloud.style.setProperty('--i', String(i));
    clouds.append(cloud);
  }
  scene.append(clouds);

  const wheel = el('div', 'gwheel');
  wheel.append(el('span', 'gwheel__rim'), el('span', 'gmoon'), el('span', 'gsun'));
  scene.append(wheel);

  const hills = svg('svg', { class: 'gscene__hills', viewBox: '0 0 100 30', preserveAspectRatio: 'none' });
  hills.append(
    svg('path', { class: 'ghill ghill--back', d: 'M 0 14 Q 18 4 36 12 T 70 9 T 100 13 L 100 30 L 0 30 Z' }),
    svg('path', { class: 'ghill ghill--front', d: 'M 0 21 Q 22 11 46 19 T 100 17 L 100 30 L 0 30 Z' })
  );
  scene.append(hills);
  return scene;
}

/**
 * A comedy club: a brick wall, one spotlight on the figure, a stage with the
 * mic on its stand in the middle of it, and the audience in silhouette in
 * rows of chairs along the bottom — the heads bob with laughter on the beat
 * (src/gimmicks.ts).
 */
export function clubScene(): HTMLElement {
  const scene = hidden(el('div', 'club'));
  scene.append(el('div', 'club__bricks'), el('div', 'club__spot'), el('div', 'club__stage'));

  const mic = svg('svg', { class: 'club__mic', viewBox: '0 0 40 120' });
  mic.append(
    svg('path', { d: 'M 8 118 L 32 118 L 26 112 L 14 112 Z', class: 'club__stand' }),
    svg('line', { x1: 20, y1: 112, x2: 20, y2: 34, class: 'club__pole' }),
    svg('line', { x1: 20, y1: 36, x2: 27, y2: 20, class: 'club__pole' }),
    svg('rect', { x: 23, y: 6, width: 9, height: 17, rx: 4.5, transform: 'rotate(22 27.5 14.5)', class: 'club__head' })
  );
  scene.append(mic);

  const crowd = el('div', 'club__crowd');
  for (const [row, count] of [[0, 7], [1, 6]] as const) {
    const line = el('div', `club__row club__row--${row}`);
    for (let i = 0; i < count; i += 1) {
      // A seat for each of them: its back shows in front of their shoulders.
      const seat = el('span', 'club__seat');
      const person = el('span', 'club__person');
      person.style.setProperty('--i', String(i + row * 7));
      seat.append(person, el('span', 'club__chair'));
      line.append(seat);
    }
    crowd.append(line);
  }
  scene.append(crowd);
  return scene;
}

/**
 * The last card's warmth: a glow that swells on the heartbeat, and — when
 * the data carries them — every "I love you" from the conversation, drifting
 * up behind her last line.
 */
export function warmScene(loves: string[]): HTMLElement {
  const scene = hidden(el('div', 'warm'));
  scene.append(el('div', 'warm__glow'));
  if (loves.length > 0) {
    const drift = el('div', 'warm__loves');
    for (const [i, text] of loves.entries()) {
      const note = el('span', 'warm__love', text);
      note.style.setProperty('--i', String(i));
      note.style.setProperty('--n', String(loves.length));
      // Kept to the middle of the frame so a long one never runs off an edge.
      note.style.setProperty('--x', `${22 + ((i * 37) % 56)}%`);
      drift.append(note);
    }
    scene.append(drift);
  }
  return scene;
}
