/**
 * Each card's own trick. `decorate` adds whatever extra markup a gimmick
 * needs when the card is built; the CSS in cards.css does most of the rest.
 * Most are timed from here instead. `typo` types the figure out on its
 * keyboard and fixes a mistake on the way; `flipclock` rolls a clock forward
 * through the night; `dial` ticks round an hour at a time; `buzz`, `scale`
 * and `chatter` move on the song's beat (src/beat.ts), so the phone goes off,
 * the scale rocks and the mouths run in time with the music. `mountGimmick` starts
 * those when the card comes up, and hands back a way to stop them.
 *
 * Every string placed here comes from the data or is fixed decoration, and
 * all of it goes in as text, never as HTML.
 */

import { beatWatcher, type SongClock } from './beat';
import { formatClock } from './format';
import { clubScene } from './scenes';
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

/** How far the scale tips for the heavier side, in degrees. The honest
 *  difference between two close totals would barely move it, so the tilt is
 *  exaggerated — still toward the right side, still more for a bigger lead. */
function scaleTilt(card: SplitCard): number {
  const [a, b] = card.sides;
  const lead = (a.value - b.value) / Math.max(a.value + b.value, 1);
  // Left side heavier: the beam turns anticlockwise, which is negative here.
  return -Math.max(-14, Math.min(14, lead * 120));
}

/** The beam's pivot and half-length, in the scale's own units. */
const BEAM = { x: 100, y: 22, arm: 78 };

/** A balance scale under the two numbers: a post, a beam, and two pans. */
function scale(head: HTMLElement, card: SplitCard): void {
  const tilt = scaleTilt(card);
  const holder = el('div', 'scale');
  holder.setAttribute('aria-hidden', 'true');
  holder.dataset.tilt = String(tilt);
  const pic = svg('svg', { viewBox: '0 0 200 96', class: 'scale__svg' });
  pic.append(
    svg('path', { d: 'M 84 92 L 116 92 L 108 84 L 92 84 Z', class: 'scale__base' }),
    svg('line', { x1: BEAM.x, y1: BEAM.y, x2: BEAM.x, y2: 86, class: 'scale__post' })
  );
  const beam = svg('g', { class: 'scale__beam' });
  beam.append(
    svg('line', { x1: BEAM.x - BEAM.arm, y1: BEAM.y, x2: BEAM.x + BEAM.arm, y2: BEAM.y, class: 'scale__bar' })
  );
  pic.append(beam);
  for (const side of [-1, 1]) {
    const pan = svg('g', { class: 'scale__pan' });
    pan.dataset.side = String(side);
    pan.append(
      svg('path', { d: 'M 0 0 L -17 30 M 0 0 L 17 30', class: 'scale__string' }),
      svg('path', { d: 'M -22 30 L 22 30 Q 20 42 0 42 Q -20 42 -22 30 Z', class: 'scale__bowl' })
    );
    pic.append(pan);
  }
  pic.append(svg('circle', { cx: BEAM.x, cy: BEAM.y, r: 3.6, class: 'scale__pivot' }));
  holder.append(pic);
  head.querySelector('.split')?.after(holder);
  poseScale(holder, tilt);
}

/**
 * Puts the scale at an angle: the beam turns and each pan hangs straight
 * down from its end of it. The numbers above stay where they are.
 */
function poseScale(holder: HTMLElement, degrees: number): void {
  const beam = holder.querySelector('.scale__beam');
  beam?.setAttribute('transform', `rotate(${degrees.toFixed(2)} ${BEAM.x} ${BEAM.y})`);
  const rad = (degrees * Math.PI) / 180;
  const drop = Math.sin(rad) * BEAM.arm;
  for (const pan of holder.querySelectorAll<SVGElement>('.scale__pan')) {
    const side = Number(pan.dataset.side);
    const x = BEAM.x + side * Math.cos(rad) * BEAM.arm;
    const y = BEAM.y + side * drop;
    pan.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  }
}

/** The keyboard the figure is typed on. Each key knows the character it types. */
const KEY_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
  [' '],
];

function keyboard(root: HTMLElement): void {
  const board = el('div', 'keys');
  board.setAttribute('aria-hidden', 'true');
  for (const row of KEY_ROWS) {
    const line = el('div', 'keys__row');
    for (const k of row) {
      const key = el('span', 'key', k === ' ' ? '' : k);
      key.dataset.key = k;
      if (k === '⌫') key.dataset.wide = '';
      if (k === ' ') key.dataset.space = '';
      line.append(key);
    }
    board.append(line);
  }
  root.prepend(board);
}

/**
 * The words-each card's background: an open dictionary, a full page of
 * entries set the way a dictionary sets them. The definitions are written
 * for this piece, not quoted from the conversation. `mark` entries get the
 * highlighter in turn.
 */
const ENTRIES: [string, string, string, string, boolean?][] = [
  ['adore', '/əˈdɔːr/', 'v.', 'to love deeply; to find everything they do a little funny.'],
  ['always', '/ˈɔːl.weɪz/', 'adv.', 'at every time; see also goodnight.'],
  ['banter', '/ˈbæn.tər/', 'n.', 'teasing exchanged at length and past midnight.'],
  ['butterflies', '/ˈbʌt.ə.flaɪz/', 'n. pl.', 'the feeling of a name lighting up the screen.'],
  ['cherish', '/ˈtʃer.ɪʃ/', 'v.', 'to keep something safe because it matters.'],
  ['company', '/ˈkʌm.pə.ni/', 'n.', 'someone to say nothing with.'],
  ['darling', '/ˈdɑː.lɪŋ/', 'n.', 'a person much loved; used freely.'],
  ['devotion', '/dɪˈvəʊ.ʃən/', 'n.', 'choosing the same person every morning.', true],
  ['forever', '/fəˈrev.ər/', 'adv.', 'the plan.', true],
  ['goodnight', '/ɡʊdˈnaɪt/', 'interj.', 'the last word, said several times.'],
  ['home', '/həʊm/', 'n.', 'not a place; a person.', true],
  ['honesty', '/ˈɒn.ɪ.sti/', 'n.', 'saying the hard thing gently.'],
  ['hug', '/hʌɡ/', 'n.', 'what a message is standing in for.'],
  ['laughter', '/ˈlɑːf.tər/', 'n.', 'the sound of 364 messages.'],
  ['love', '/lʌv/', 'n.', 'the reason the phone is never down for long.', true],
  ['lovebird', '/ˈlʌv.bɜːd/', 'n.', 'one of a pair that talks all day.'],
  ['loyalty', '/ˈlɔɪ.əl.ti/', 'n.', 'staying, especially when leaving would be easier.', true],
  ['miss', '/mɪs/', 'v.', 'to feel the length of an hour without a reply.'],
  ['patience', '/ˈpeɪ.ʃəns/', 'n.', 'waiting through “typing…” without complaint.'],
  ['promise', '/ˈprɒm.ɪs/', 'n.', 'a word given and kept.'],
  ['smile', '/smaɪl/', 'v.', 'what happens at a notification, involuntarily.'],
  ['soulmate', '/ˈsəʊl.meɪt/', 'n.', 'the one the rest of this book is about.'],
  ['talk', '/tɔːk/', 'v.', 'what we do instead of sleeping.'],
  ['together', '/təˈɡeð.ər/', 'adv.', 'in each other’s company, however far apart.'],
  ['trust', '/trʌst/', 'n.', 'handing someone your heart and not checking on it.', true],
  ['us', '/ʌs/', 'pron.', 'the two people this page is about.'],
  ['yours', '/jɔːz/', 'pron.', 'belonging to you; as in, I’m.'],
];

/** The open book behind the words-each card: a leather cover at the edges,
 *  stacked page edges, the spine's shadow, and the page itself. */
function dictionary(): HTMLElement {
  const book = el('div', 'book');
  book.setAttribute('aria-hidden', 'true');
  const page = el('div', 'book__page');
  // A dictionary page's running head: the first and last words on it.
  const head = el('p', 'book__head');
  head.append(el('span', undefined, ENTRIES[0]?.[0] ?? ''), el('span', undefined, ENTRIES[ENTRIES.length - 1]?.[0] ?? ''));
  const columns = el('div', 'book__columns');
  const marked = ENTRIES.filter((entry) => entry[4]).length;
  let mark = 0;
  for (const [word, sound, part, meaning, highlight] of ENTRIES) {
    const entry = el('p', 'dict__entry');
    const headword = el('span', 'dict__word', word);
    if (highlight) {
      headword.dataset.mark = '';
      headword.style.setProperty('--i', String(mark));
      headword.style.setProperty('--n', String(marked));
      mark += 1;
    }
    entry.append(
      headword,
      el('span', 'dict__sound', ` ${sound} `),
      el('span', 'dict__part', `${part} `),
      el('span', 'dict__meaning', meaning)
    );
    columns.append(entry);
  }
  page.append(head, columns, el('p', 'book__folio', '214'));
  book.append(el('div', 'book__edges'), page);
  return book;
}

/** Where the chatter bubbles rise from, one layer per side. */
function chatterLayer(head: HTMLElement): void {
  for (const side of head.querySelectorAll<HTMLElement>('.split__side')) {
    const layer = el('span', 'chatter');
    layer.setAttribute('aria-hidden', 'true');
    side.append(layer);
  }
}

/**
 * An alarm clock round the figure: a face with the twelve hours, two hands,
 * twin bells with a hammer between them, and two feet. The hands tick round
 * to the hour (mountDial); when they get there, it rings.
 */
function dial(value: HTMLElement, card: FigureCard): void {
  const hours = card.value / 60;
  const clock = svg('svg', { viewBox: '0 0 100 100', class: 'dial', 'aria-hidden': 'true' });
  // Bells, hammer and feet sit outside the face and draw first, behind it.
  for (const side of [-1, 1]) {
    const bell = svg('g', { class: 'dial__bell', transform: `rotate(${side * 38} 50 50)` });
    bell.append(
      svg('path', { d: 'M 38 -6 Q 50 -16 62 -6 L 62 -2 L 38 -2 Z', class: 'dial__bellcap' }),
      svg('line', { x1: 50, y1: -2, x2: 50, y2: 4, class: 'dial__stem' })
    );
    clock.append(bell);
    clock.append(svg('line', { x1: 50 + side * 28, y1: 88, x2: 50 + side * 38, y2: 101, class: 'dial__foot' }));
    // The little lines that flash out beside each bell while it rings.
    const buzz = svg('g', { class: 'dial__buzz' });
    buzz.append(
      svg('line', { x1: 50 + side * 36, y1: -8, x2: 50 + side * 44, y2: -14 }),
      svg('line', { x1: 50 + side * 40, y1: -1, x2: 50 + side * 49, y2: -3 })
    );
    clock.append(buzz);
  }
  clock.append(svg('line', { x1: 50, y1: 6, x2: 50, y2: -4, class: 'dial__stem' }));
  clock.append(svg('circle', { cx: 50, cy: -5, r: 3, class: 'dial__hammer' }));
  clock.append(svg('circle', { cx: 50, cy: 50, r: 44, class: 'dial__face' }));
  for (let h = 0; h < 12; h += 1) {
    const major = h % 3 === 0;
    clock.append(
      svg('line', {
        x1: 50,
        y1: major ? 9 : 10,
        x2: 50,
        y2: major ? 16 : 14,
        class: major ? 'dial__tick dial__tick--major' : 'dial__tick',
        transform: `rotate(${h * 30} 50 50)`,
      })
    );
  }
  const minute = svg('g', { class: 'dial__minute' });
  minute.append(svg('line', { x1: 50, y1: 50, x2: 50, y2: 14 }));
  const hour = svg('g', { class: 'dial__hand' });
  hour.style.setProperty('--deg', `${(hours % 12) * 30}deg`);
  hour.append(svg('line', { x1: 50, y1: 50, x2: 50, y2: 26 }));
  clock.append(minute, hour, svg('circle', { cx: 50, cy: 50, r: 3, class: 'dial__pin' }));
  value.prepend(clock);
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

/**
 * The first message, delivered: a pigeon flies in with an envelope, drops
 * it, the flap opens and the letter comes out, and the message writes itself
 * onto it (mountChat). The timing is CSS; see "chat" in gimmicks.css.
 */
function chat(head: HTMLElement, card: QuoteCard): void {
  const quote = head.querySelector('.quote');
  if (!quote) return;

  const post = el('div', 'post');

  const letter = el('div', 'post__letter');
  const from = el('p', 'post__from');
  from.append(el('span', 'post__label', 'From'), el('span', 'post__name', card.author));
  if (card.footnote) from.append(el('span', 'post__date', card.footnote));
  letter.append(from, quote);
  // The full message, invisible, holds the space; the written copy sits on top.
  const text = quote.querySelector<HTMLElement>('.quote__text');
  if (text) {
    const full = text.textContent ?? '';
    text.replaceChildren(el('span', 'dm__ghost', full), el('span', 'dm__typed', full));
  }

  const envelope = el('div', 'post__env');
  envelope.setAttribute('aria-hidden', 'true');
  const flap = el('span', 'post__flap');
  flap.append(el('span', 'post__seal'));
  envelope.append(el('span', 'post__fold'), flap);

  const bird = el('div', 'post__bird');
  bird.setAttribute('aria-hidden', 'true');
  const drawing = svg('svg', { viewBox: '0 0 60 42', class: 'post__pigeon' });
  const wing = svg('path', { d: 'M 17 21 Q 27 1 41 18 Q 30 15 17 21 Z', class: 'post__wing' });
  drawing.append(
    svg('path', { d: 'M 8 23 L 0 18 L 2 28 Z', class: 'post__tail' }),
    svg('ellipse', { cx: 26, cy: 25, rx: 17, ry: 10, class: 'post__body' }),
    svg('circle', { cx: 44, cy: 17, r: 7, class: 'post__head' }),
    svg('path', { d: 'M 50 16 L 57 18 L 50 20 Z', class: 'post__beak' }),
    svg('circle', { cx: 46, cy: 15.5, r: 1.3, class: 'post__eye' }),
    svg('line', { x1: 24, y1: 34, x2: 22, y2: 41, class: 'post__leg' }),
    svg('line', { x1: 30, y1: 34, x2: 32, y2: 41, class: 'post__leg' }),
    wing
  );
  bird.append(drawing);

  post.append(letter, envelope, bird);
  head.append(post);
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
/**
 * Her last line, engraved inside a ring box. The box lands, knocks twice,
 * and its lid swings open on the hinge: the satin inside the lid carries
 * her words, and the ring rises out of the cushion and catches the light.
 * The quote is moved in, not copied, so it is still the card's one text.
 */
function ringBox(root: HTMLElement): void {
  const quote = root.querySelector<HTMLElement>('.card__head .quote');
  if (!quote) return;
  const box = el('div', 'ring');
  const rays = el('span', 'ring__rays');
  rays.setAttribute('aria-hidden', 'true');

  const lid = el('div', 'ring__lid');
  quote.replaceWith(box);
  lid.append(quote);

  const art = svg('svg', { class: 'ring__band', viewBox: '0 0 60 72', 'aria-hidden': 'true', focusable: 'false' });
  const defs = svg('defs');
  const gold = svg('linearGradient', { id: 'ring-gold', x1: 0, y1: 0, x2: 1, y2: 1 });
  gold.append(
    svg('stop', { offset: '0', 'stop-color': '#fff1c4' }),
    svg('stop', { offset: '0.45', 'stop-color': '#e2b45a' }),
    svg('stop', { offset: '1', 'stop-color': '#a8741f' })
  );
  const ice = svg('linearGradient', { id: 'ring-ice', x1: 0, y1: 0, x2: 0, y2: 1 });
  ice.append(
    svg('stop', { offset: '0', 'stop-color': '#ffffff' }),
    svg('stop', { offset: '0.6', 'stop-color': '#d9f0ff' }),
    svg('stop', { offset: '1', 'stop-color': '#9ec9ea' })
  );
  defs.append(gold, ice);
  art.append(
    defs,
    // The band, and the setting that holds the stone.
    svg('ellipse', { cx: 30, cy: 48, rx: 18, ry: 20, class: 'ring__metal' }),
    svg('path', { d: 'M 23 29 L 26 24 L 34 24 L 37 29 Z', class: 'ring__setting' }),
    // The stone: a table, a crown and the pavilion, with a few facet lines.
    svg('path', { d: 'M 18 13 L 23 6 L 37 6 L 42 13 L 30 27 Z', class: 'ring__stone' }),
    svg('path', { d: 'M 18 13 L 42 13 M 23 6 L 27 13 L 30 6 L 33 13 L 37 6 M 27 13 L 30 27 L 33 13', class: 'ring__facets' })
  );
  const glint = el('span', 'ring__glint');
  glint.setAttribute('aria-hidden', 'true');

  const lip = el('span', 'ring__lip');
  const cover = el('span', 'ring__cover');
  const front = el('span', 'ring__front');
  for (const part of [lip, cover, front]) part.setAttribute('aria-hidden', 'true');
  const well = el('span', 'ring__well');
  well.setAttribute('aria-hidden', 'true');

  const body = el('div', 'ring__box');
  body.append(lid, well, art, glint, lip, cover, front);
  box.append(rays, body);
}

export function decorate(root: HTMLElement, card: Card): void {
  if (card.kind === 'closing') {
    ringBox(root);
    return;
  }
  if (!('gimmick' in card) || !card.gimmick) return;
  root.dataset.gimmick = card.gimmick;
  const head = root.querySelector<HTMLElement>('.card__head');
  const value = root.querySelector<HTMLElement>('.figure__value');
  if (!head) return;

  switch (card.gimmick) {
    case 'buzz':
      badges(root);
      break;
    case 'scale':
      if (card.kind === 'split') scale(head, card);
      break;
    case 'chatter':
      chatterLayer(head);
      root.prepend(dictionary());
      break;
    case 'dial':
      if (card.kind === 'figure' && value) dial(value, card);
      break;
    case 'giggle':
      if (card.kind === 'figure') laughs(root, card);
      root.prepend(clubScene());
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
      keyboard(root);
      // The unit and the caption type out too; each keeps its final text,
      // hidden, to hold the space, with the typed copy laid over it.
      for (const holder of root.querySelectorAll<HTMLElement>('.figure__unit, .caption')) {
        const full = holder.textContent ?? '';
        holder.dataset.typed = '';
        holder.replaceChildren(el('span', 'typo-ghost', full), el('span', 'typo-live', full));
      }
      break;
  }
}

// --- Timed gimmicks ---------------------------------------------------------

/** Wait for the figure's landing before starting. */
const START_MS = 420;

/** A slip: two neighbouring characters typed the wrong way round at `at`,
 *  and `overrun` more typed after them before it is noticed. */
interface Slip {
  at: number;
  overrun: number;
}

/** Keystrokes for `text` with its slips: a character, null for backspace,
 *  or 'pause' for the beat where the mistake is seen. */
function keystrokes(text: string, slips: Slip[]): (string | null)[] {
  const keys: (string | null)[] = [];
  const ordered = [...slips].sort((a, b) => a.at - b.at);
  let i = 0;
  for (const slip of ordered) {
    for (; i < slip.at; i += 1) keys.push(text[i] ?? '');
    const wrong = [text[slip.at + 1] ?? '', text[slip.at] ?? '', ...text.slice(slip.at + 2, slip.at + 2 + slip.overrun)];
    keys.push(...wrong, 'pause', ...wrong.map(() => null));
  }
  for (; i < text.length; i += 1) keys.push(text[i] ?? '');
  return keys;
}

/** Where to slip in a piece of text: swapping the first letter of `inside`
 *  with the next one, or the last swappable pair of digits for a number. */
function slipIn(text: string, inside: string, overrun: number): Slip | null {
  const start = text.indexOf(inside);
  if (start >= 0 && inside.length > 2) return { at: start + 1, overrun };
  for (let k = text.length - 2; k >= 0; k -= 1) {
    const [c, d] = [text[k] ?? '', text[k + 1] ?? ''];
    if (/\d/.test(c) && /\d/.test(d) && c !== d) return { at: k, overrun };
  }
  return null;
}

/**
 * Types the whole line out on the keyboard — the figure, then "words", then
 * the caption — a key at a time, with the caret moving along. It slips more
 * than once: letters go in the wrong way round, sometimes a couple more get
 * typed before it notices, and it backspaces and tries again. Each piece
 * keeps its final size reserved, so nothing on the card moves while it types.
 */
function mountTypo(root: HTMLElement): GimmickHandle {
  const figure = root.querySelector<HTMLElement>('.figure__live');
  const figureText = root.querySelector<HTMLElement>('.figure__ghost')?.textContent ?? '';
  const pieces: { live: HTMLElement; text: string; slips: Slip[] }[] = [];
  if (figure && figureText) {
    const slip = slipIn(figureText, '', 0);
    pieces.push({ live: figure, text: figureText, slips: slip ? [slip] : [] });
  }
  for (const holder of root.querySelectorAll<HTMLElement>('[data-typed]')) {
    const live = holder.querySelector<HTMLElement>('.typo-live');
    const text = holder.querySelector('.typo-ghost')?.textContent ?? '';
    if (!live || !text) continue;
    const slips = [slipIn(text, 'words', 1), slipIn(text, 'typo', 0), slipIn(text, 'included', 2)].filter(
      (x): x is Slip => x !== null && text.slice(x.at - 1).length > 2 && /[a-z]/i.test(text)
    );
    pieces.push({ live, text, slips });
  }
  const finish = (): void => {
    for (const piece of pieces) piece.live.textContent = piece.text;
  };
  if (pieces.length === 0 || currentMotion() === 'off') {
    finish();
    return { cancel: finish };
  }

  const caret = el('span', 'caret');
  caret.setAttribute('aria-hidden', 'true');
  const shown = pieces.map(() => document.createTextNode(''));
  pieces.forEach((piece, n) => piece.live.replaceChildren(shown[n] as Text));

  const press = (k: string): void => {
    const key = k === null ? '⌫' : k.toLowerCase();
    const cap = [...root.querySelectorAll<HTMLElement>('.key')].find((c) => c.dataset.key === key);
    if (!cap) return;
    cap.dataset.down = '';
    window.setTimeout(() => delete cap.dataset.down, 130);
  };

  const rand = seeded(154);
  let piece = 0;
  let at = 0;
  let keys = keystrokes(pieces[0]?.text ?? '', pieces[0]?.slips ?? []);
  pieces[0]?.live.append(caret);
  let timer = 0;

  const tick = (): void => {
    const key = keys[at];
    at += 1;
    if (key === undefined) {
      // On to the next piece, the caret with it; or done.
      piece += 1;
      const next = pieces[piece];
      if (!next) {
        caret.dataset.idle = '';
        return;
      }
      keys = keystrokes(next.text, next.slips);
      at = 0;
      next.live.append(caret);
      timer = window.setTimeout(tick, 380);
      return;
    }
    const node = shown[piece] as Text;
    if (key === null) {
      press('⌫');
      node.data = node.data.slice(0, -1);
    } else if (key !== 'pause') {
      press(key === ' ' ? ' ' : key);
      node.data += key;
      pieces[piece]?.live.animate([{ transform: 'translateY(0.015em)' }, { transform: 'none' }], 90);
    }
    const wait = key === 'pause' ? 520 : key === null ? 80 : 75 + rand() * 65;
    timer = window.setTimeout(tick, wait);
  };
  timer = window.setTimeout(tick, START_MS);

  return {
    cancel() {
      window.clearTimeout(timer);
      caret.remove();
      finish();
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
 * The scale, as a spring. While the two totals count up it rocks from side
 * to side, a push on every beat from one pan and then the other, as if the
 * numbers were landing on it; when the counting stops it tips toward the
 * bigger one and settles there, breathing a little on the beat.
 */
function mountScale(root: HTMLElement, songTime: SongClock, countMs: number): GimmickHandle {
  const holder = root.querySelector<HTMLElement>('.scale');
  if (!holder) return { cancel() {} };
  const tilt = Number(holder.dataset.tilt) || 0;
  const settle = (): void => poseScale(holder, tilt);
  if (currentMotion() === 'off') {
    settle();
    return { cancel: settle };
  }

  const STIFF = 16;
  const DAMP = 2.6;
  const rockUntil = (START_MS / 2 + countMs) / 1000;
  let angle = 0;
  let v = 0;
  let pushes = 0;
  const onBeat = beatWatcher(songTime);

  let frame = 0;
  let begun = 0;
  let last = 0;
  const step = (now: number): void => {
    if (begun === 0) begun = last = now;
    const wall = (now - begun) / 1000;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const counting = wall < rockUntil;
    if (onBeat(wall)) {
      // Rocking: even pushes, one side then the other. Settled: a breath.
      const dir = pushes % 2 === 0 ? 1 : -1;
      v += dir * (counting ? 34 : 4);
      pushes += 1;
    }
    const target = counting ? 0 : tilt;
    v += (-STIFF * (angle - target) - DAMP * v) * dt;
    angle = Math.max(-24, Math.min(24, angle + v * dt));
    poseScale(holder, angle);
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);

  return {
    cancel() {
      cancelAnimationFrame(frame);
      settle();
    },
  };
}

/**
 * The dial ticks round like a clock: the hand jumps an hour at a time from
 * midnight, the figure counts the hours with it, and it stops on the hour.
 */
function mountDial(root: HTMLElement, card: FigureCard): GimmickHandle {
  const hand = root.querySelector<SVGElement>('.dial__hand');
  const minute = root.querySelector<SVGElement>('.dial__minute');
  const live = root.querySelector<HTMLElement>('.figure__live');
  const unit = root.querySelector<HTMLElement>('.figure__unit');
  const hours = Math.round(card.value / 60);
  const final = formatClock(card.value);
  const settle = (): void => {
    for (const part of [hand, minute]) part?.style.removeProperty('transition');
    hand?.style.setProperty('--deg', `${((card.value / 60) % 12) * 30}deg`);
    minute?.style.setProperty('--deg', '0deg');
    if (live) live.textContent = final.text;
    if (unit) unit.textContent = final.suffix ?? '';
    delete root.dataset.ticking;
  };
  if (!hand || !minute || !live || currentMotion() === 'off') {
    settle();
    return { cancel: settle };
  }

  const show = (h: number): void => {
    hand.style.setProperty('--deg', `${h * 30}deg`);
    // The minute hand goes all the way round for every hour the hour hand moves.
    minute.style.setProperty('--deg', `${h * 360}deg`);
    const t = formatClock(h * 60);
    live.textContent = t.text;
    if (unit) unit.textContent = t.suffix ?? '';
  };

  // Start at midnight without sweeping back there.
  for (const part of [hand, minute]) part.style.transition = 'none';
  show(0);
  void hand.getBoundingClientRect();
  for (const part of [hand, minute]) part.style.removeProperty('transition');
  root.dataset.ticking = '';

  let h = 0;
  let timer = 0;
  const TICK_MS = 260;
  const tick = (): void => {
    h += 1;
    show(h);
    live.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
    if (h < hours) timer = window.setTimeout(tick, TICK_MS);
    // It is there: the alarm goes off (the ring is CSS, on a loop).
    else delete root.dataset.ticking;
  };
  timer = window.setTimeout(tick, START_MS + 200);

  return {
    cancel() {
      window.clearTimeout(timer);
      settle();
    },
  };
}

/** Horizontal starting points round the left number, in px — leaning in
 *  toward the middle so a bubble never runs off the screen's edge. The right
 *  number uses the same lanes mirrored. */
const LANES = [-40, 25, 65, -10];

/** Filler, not quotes: what a mouth running sounds like. */
const CHATTER = ['omg', 'wait', 'anyway', 'ok but', 'listen', 'lol', 'no bc', 'literally', 'hear me out', 'and then', 'blah', 'so'];

/**
 * Speech bubbles pop out of each side on every beat — as many as that side's
 * share of the words, exaggerated so the bigger mouth plainly talks more.
 */
function mountChatter(root: HTMLElement, card: SplitCard, songTime: SongClock): GimmickHandle {
  const layers = [...root.querySelectorAll<HTMLElement>('.chatter')];
  if (layers.length < 2 || currentMotion() === 'off') return { cancel() {} };
  const most = Math.max(card.sides[0].value, card.sides[1].value, 1);
  const rates = card.sides.map((side) => Math.max(0.6, 3 * (side.value / most) ** 6));
  const owed = [0, 0];
  const lanes = [0, 2];
  const rand = seeded(118);
  let said = 0;
  const onBeat = beatWatcher(songTime);

  const pop = (layer: HTMLElement, i: number, delay: number): void => {
    const bubble = el('span', 'chat-bubble', CHATTER[said % CHATTER.length]);
    said += 1;
    if (i === 1) bubble.dataset.side = 'right';
    // Each side takes its lanes in turn, so neighbours never start on top of
    // one another; a little jitter keeps it from looking like a grid.
    const lane = LANES[(lanes[i] = ((lanes[i] ?? 0) + 1) % LANES.length)] ?? 0;
    const x = Math.round((i === 0 ? lane : -lane) + (rand() - 0.5) * 14);
    const rise = 70 + rand() * 90;
    layer.append(bubble);
    const run = bubble.animate(
      [
        { opacity: 0, transform: `translate(${x}px, 0) scale(0.5)` },
        { opacity: 1, transform: `translate(${x}px, -${rise * 0.3}px) scale(1)`, offset: 0.18 },
        { opacity: 1, transform: `translate(${x}px, -${rise * 0.75}px) scale(1)`, offset: 0.7 },
        { opacity: 0, transform: `translate(${x}px, -${rise}px) scale(0.95)` },
      ],
      { duration: 1900, delay, easing: 'ease-out', fill: 'both' }
    );
    run.onfinish = () => bubble.remove();
  };

  let frame = 0;
  let begun = 0;
  const step = (now: number): void => {
    if (begun === 0) begun = now;
    const wall = (now - begun) / 1000;
    if (onBeat(wall) && wall * 1000 > START_MS) {
      for (const [i, layer] of layers.entries()) {
        owed[i] = (owed[i] ?? 0) + (rates[i] ?? 0);
        let n = 0;
        while ((owed[i] ?? 0) >= 1) {
          owed[i] = (owed[i] ?? 0) - 1;
          pop(layer, i, n * 230);
          n += 1;
        }
      }
    }
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return {
    cancel() {
      cancelAnimationFrame(frame);
      for (const layer of layers) layer.replaceChildren();
    },
  };
}

/** The audience laughs on the beat: a few heads bob each time. */
function mountGiggle(root: HTMLElement, songTime: SongClock): GimmickHandle {
  const people = [...root.querySelectorAll<HTMLElement>('.club__person')];
  if (people.length === 0 || currentMotion() === 'off') return { cancel() {} };
  const rand = seeded(9);
  const onBeat = beatWatcher(songTime);
  let frame = 0;
  let begun = 0;
  const step = (now: number): void => {
    if (begun === 0) begun = now;
    const wall = (now - begun) / 1000;
    if (onBeat(wall)) {
      for (const person of people) {
        if (rand() > 0.55) continue;
        const lift = 4 + rand() * 7;
        person.animate(
          [
            { transform: 'translateY(0) rotate(0deg)' },
            { transform: `translateY(-${lift}px) rotate(${(rand() - 0.5) * 8}deg)`, offset: 0.35 },
            { transform: 'translateY(0) rotate(0deg)' },
          ],
          { duration: 420 + rand() * 200, delay: rand() * 120, easing: 'ease-out' }
        );
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

/** How long the delivery takes before the message starts writing itself:
 *  the flight, the drop, the flap and the letter coming out (gimmicks.css). */
const CHAT_TYPING_MS = 2900;

/** The first message writes itself onto the letter, a character at a time. */
function mountChat(root: HTMLElement): GimmickHandle {
  const typed = root.querySelector<HTMLElement>('.dm__typed');
  const full = root.querySelector<HTMLElement>('.dm__ghost')?.textContent ?? '';
  if (!typed || !full) return { cancel() {} };
  const settle = (): void => {
    typed.textContent = full;
  };
  if (currentMotion() === 'off') {
    settle();
    return { cancel: settle };
  }
  const caret = el('span', 'caret dm__caret');
  caret.setAttribute('aria-hidden', 'true');
  const shown = document.createTextNode('');
  typed.replaceChildren(shown, caret);

  const rand = seeded(23);
  let at = 0;
  let timer = 0;
  const tick = (): void => {
    at += 1;
    shown.data = full.slice(0, at);
    if (at >= full.length) {
      caret.dataset.idle = '';
      window.setTimeout(() => caret.remove(), 1600);
      return;
    }
    const ch = full[at - 1] ?? '';
    // A beat longer after punctuation, the way someone actually types.
    const wait = /[.!?]/.test(ch) ? 260 : ch === ',' ? 140 : 14 + rand() * 22;
    timer = window.setTimeout(tick, wait);
  };
  timer = window.setTimeout(tick, START_MS + CHAT_TYPING_MS);
  return {
    cancel() {
      window.clearTimeout(timer);
      settle();
    },
  };
}

/**
 * The last card beats with the song: on each beat the heart gives a lub-dub
 * and the warm glow behind it swells.
 */
function mountWarm(root: HTMLElement, songTime: SongClock): GimmickHandle {
  const glint = root.querySelector<HTMLElement>('.ring__glint');
  const glow = root.querySelector<HTMLElement>('.warm__glow');
  const loves = [...root.querySelectorAll<HTMLElement>('.warm__love')];
  if (currentMotion() === 'off') return { cancel() {} };
  const onBeat = beatWatcher(songTime);
  const onBeatForLoves = beatWatcher(songTime);
  const rising: Animation[] = [];
  let beats = 0;
  let next = 0;
  let frame = 0;
  let begun = 0;
  const step = (now: number): void => {
    if (begun === 0) begun = now;
    const wall = (now - begun) / 1000;
    // Every other beat, once the box is open, the next "I love you" is sent
    // up from the bottom, so only a handful are ever on screen at once.
    if (loves.length > 0 && wall > 3.2 && onBeatForLoves(wall)) {
      beats += 1;
      const love = beats % 2 === 1 ? loves[next % loves.length] : undefined;
      if (love) {
        next += 1;
        const rise = love.animate(
          [
            { opacity: 0, transform: 'translateY(0)' },
            { opacity: 0.9, offset: 0.1 },
            { opacity: 0.9, offset: 0.72 },
            { opacity: 0, transform: 'translateY(-108vh)' },
          ],
          { duration: 13000, easing: 'linear' }
        );
        rising.push(rise);
        rise.onfinish = () => rising.splice(rising.indexOf(rise), 1);
      }
    }
    // Once the box is open and the ring is up, the stone flashes on the beat.
    if (onBeat(wall) && wall > 4.1) {
      glint?.animate(
        [
          { opacity: 0.2, scale: '0.4', rotate: '0deg' },
          { opacity: 1, scale: '1.15', rotate: '45deg', offset: 0.18 },
          { opacity: 0.2, scale: '0.4', rotate: '90deg' },
        ],
        { duration: 760, easing: 'ease-out' }
      );
      glow?.animate(
        [
          { opacity: 0.75, scale: '1' },
          { opacity: 1, scale: '1.08', offset: 0.2 },
          { opacity: 0.75, scale: '1' },
        ],
        { duration: 820, easing: 'ease-out' }
      );
    }
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return {
    cancel() {
      cancelAnimationFrame(frame);
      for (const rise of rising.splice(0)) rise.cancel();
    },
  };
}

/** How long each day of the streak takes to light, in ms; the calendar's
 *  CSS takes it from the element render.ts sets it on, and the figure
 *  counts up in step with it. */
export const CAL_STEP_MS = 40;

/** When the first day of the streak lights: the landing delay plus 300ms,
 *  as in cards.css. */
const CAL_START_MS = 170 + 300;

/** The streak's figure counts up a day at a time as each day lights. */
function mountCalendar(root: HTMLElement, card: FigureCard): GimmickHandle {
  const live = root.querySelector<HTMLElement>('.figure__live');
  const final = String(card.value);
  const settle = (): void => {
    if (live) live.textContent = final;
  };
  if (!live || currentMotion() === 'off') {
    settle();
    return { cancel: settle };
  }
  live.textContent = '0';
  let frame = 0;
  let begun = 0;
  const step = (now: number): void => {
    if (begun === 0) begun = now;
    const lit = Math.floor((now - begun - CAL_START_MS) / CAL_STEP_MS) + 1;
    const shown = Math.max(0, Math.min(card.value, lit));
    live.textContent = String(shown);
    if (shown < card.value) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return {
    cancel() {
      cancelAnimationFrame(frame);
      settle();
    },
  };
}

/** Starts a card's timed gimmick, if it has one. */
export function mountGimmick(root: HTMLElement, card: Card, songTime: SongClock): GimmickHandle | null {
  if (card.kind === 'closing') return mountWarm(root, songTime);
  if (card.kind === 'figure' && card.calendar) return mountCalendar(root, card);
  if (!('gimmick' in card)) return null;
  if (card.gimmick === 'giggle') return mountGiggle(root, songTime);
  if (card.gimmick === 'chat') return mountChat(root);
  if (card.gimmick === 'buzz') return mountBuzz(root, songTime);
  if (card.gimmick === 'scale') {
    // Either unit: the minifier is free to turn 3400ms into 3.4s.
    const raw = getComputedStyle(root).getPropertyValue('--dur-count').trim();
    const value = Number.parseFloat(raw);
    const ms = Number.isNaN(value) ? 1500 : raw.endsWith('ms') ? value : value * 1000;
    return mountScale(root, songTime, ms);
  }
  if (card.gimmick === 'typo') return mountTypo(root);
  if (card.gimmick === 'dial' && card.kind === 'figure') return mountDial(root, card);
  if (card.gimmick === 'chatter' && card.kind === 'split') return mountChatter(root, card, songTime);
  if (card.gimmick === 'flipclock' && card.kind === 'figure') return mountFlipclock(root, card);
  return null;
}
