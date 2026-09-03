import { formatInteger, formatValue } from '../format';
import { GREETING_NIGHT, themeFor, tonesFor, type Theme } from '../palette';
import { shapeLayer } from '../shapes';
import type { Card, FigureCard, GreetingCard, OpeningCard, SplitCard, WordCard } from './types';

/** Every string here comes from the export, so nothing is ever set as HTML. */
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

/**
 * The figure, always built with a hidden ghost at the final value. The ghost
 * holds the width so a counting number cannot shift under its own digits, and
 * it is what the print stylesheet shows in place of the live span.
 */
function figureValue(text: string, countTo?: number): HTMLElement {
  const wrap = el('span', 'figure__value');
  wrap.dataset.fit = text;
  wrap.append(el('span', 'figure__ghost', text));

  const live = el('span', 'figure__live', countTo === undefined ? text : formatInteger(0));
  if (countTo !== undefined) live.dataset.countTo = String(countTo);
  wrap.append(live);
  return wrap;
}

function renderFigure(card: FigureCard): HTMLElement {
  const { text, suffix } = formatValue(card.value, card.format);
  const figure = el('p', 'figure');
  figure.append(
    figureValue(text, card.countUp && card.format === 'integer' ? card.value : undefined)
  );
  const unit = suffix ?? card.unit;
  if (unit) figure.append(el('span', 'figure__unit', unit));
  // A <span>, not a <p>: `figure` is itself a <p>, and a nested <p> would
  // close it early, splitting the grid layout across two siblings instead of
  // stacking within one. `.figure`'s own grid still lays it out on its own
  // line, same as the unit above it.
  if (card.context) figure.append(el('span', 'footnote', card.context));
  return figure;
}

/**
 * Both sides race to their number at once. Integers only — a clock doesn't
 * have a "more of it", so those keep the plain, static value. The winning
 * side is marked once counting finishes; see the `data-count-winner` wiring
 * in deck.ts, which decides that without either side knowing about the other.
 */
function splitValue(text: string, countTo?: number): HTMLElement {
  const wrap = el('span', 'split__value');
  wrap.dataset.fit = text;
  wrap.append(el('span', 'split__ghost', text));

  const live = el('span', 'split__live', countTo === undefined ? text : formatInteger(0));
  if (countTo !== undefined) live.dataset.countTo = String(countTo);
  wrap.append(live);
  return wrap;
}

function renderSplit(card: SplitCard): HTMLElement {
  const split = el('div', 'split');
  const [first, second] = card.sides;
  const races = card.format === 'integer';

  const side = (label: string, value: number): HTMLElement => {
    const box = el('div', 'split__side');
    if (races) box.dataset.countBox = '';
    const text = formatValue(value, card.format).text;
    box.append(splitValue(text, races ? value : undefined), el('span', 'split__label', label));
    return box;
  };

  split.append(side(first.label, first.value), el('div', 'split__seam'), side(second.label, second.value));
  if (!card.context) return split;

  // A plain wrapper so both this and the context line land in .card__head
  // together — `display: contents` (see cards.css) so it never becomes a
  // second grid item competing with .split's own width:100%.
  const wrap = el('div', undefined);
  wrap.dataset.splitWrap = '';
  wrap.append(split, el('p', 'footnote', card.context));
  return wrap;
}

/**
 * The word arrives a letter at a time, so it reads as something being said.
 * Given the numeral treatment: letter-by-letter, with its count
 * underneath. Shared by the plain word card and by each side of the
 * goodnight/good-morning toggle, which rebuilds one of these fresh on every
 * switch rather than trying to mutate letters in place.
 */
export function wordBlock(word: string, value: number, unit: string | undefined): HTMLElement {
  const wrap = el('div', 'word');
  const text = el('span', 'word__text');
  text.dataset.fit = word;

  for (const [i, character] of [...word].entries()) {
    const letter = el('span', 'word__letter', character);
    letter.style.setProperty('--i', String(i));
    text.append(letter);
  }

  wrap.append(text);
  wrap.append(el('span', 'word__count', `${formatInteger(value)} ${unit ?? 'times'}`));
  return wrap;
}

function renderWord(card: WordCard): HTMLElement {
  return wordBlock(card.word, card.value, card.unit);
}

/**
 * A message, reproduced exactly. No name attached: the caption underneath
 * already says whose it is, and the last card says nothing at all.
 */
function renderQuote(text: string): HTMLElement {
  const quote = el('blockquote', 'quote');
  const body = el('p', 'quote__text');
  body.textContent = text;
  quote.append(body);
  return quote;
}

/**
 * The coda under the first-message card: src/elapsed.ts drives the actual
 * sequence once the card is current — this just leaves it the timestamp and
 * marks itself decorative. It's a rapidly-changing aside, not information the
 * card depends on, so it stays out of the screen-reader announcement the
 * caption and footnote already cover in `describe()` below.
 */
function elapsedSince(sinceIso: string): HTMLElement {
  const p = el('p', 'quote__elapsed');
  p.dataset.elapsedSince = sinceIso;
  p.setAttribute('aria-hidden', 'true');
  return p;
}

function renderOpening(card: OpeningCard): HTMLElement {
  const opening = el('div', 'opening');
  opening.append(el('h1', 'opening__title', card.title));
  opening.append(el('p', 'opening__dateline', card.dateline));
  return opening;
}

type NonGreetingCard = Exclude<Card, GreetingCard>;

function head(card: NonGreetingCard): HTMLElement {
  switch (card.kind) {
    case 'opening':
      return renderOpening(card);
    case 'figure':
      return renderFigure(card);
    case 'split':
      return renderSplit(card);
    case 'word':
      return renderWord(card);
    case 'quote':
    case 'closing':
      return renderQuote(card.text);
  }
}

/** Exported: src/greeting.ts repaints the same card between two palettes
 *  on a click, rather than a fresh card being built. */
export function paint(root: HTMLElement, theme: Theme): void {
  root.style.setProperty('--ground', theme.ground);
  root.style.setProperty('--glow', theme.glow);
  root.style.setProperty('--ink', theme.ink);
  root.style.setProperty('--quiet', theme.quiet);
  root.style.setProperty('--faint', theme.faint);
  root.style.setProperty('--accent', theme.accent);

  for (const [name, value] of Object.entries(tonesFor(theme))) {
    root.style.setProperty(`--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value);
  }

  root.dataset.align = theme.align;
  root.dataset.ground = theme.ground;
}

/**
 * The one card with two states. Built entirely apart from the generic path
 * below — it doesn't take a `theme` pin (it owns two palettes outright, see
 * GREETING_NIGHT/GREETING_DAY in palette.ts) and its caption lives one level
 * down, per side, rather than shared. Starts on the night side; src/deck.ts
 * wires the toggle once, right after this builds, via wireGreeting() in
 * src/greeting.ts — not on every visit, the way the count-ups and the
 * first-message coda are, because a switch should stay where she left it,
 * not reset itself each time she comes back to the card.
 */
function renderGreetingCard(card: GreetingCard, index: number, total: number): HTMLElement {
  const root = el('article', 'card card--greeting');
  root.dataset.state = 'upcoming';
  root.dataset.greetingState = 'night';
  root.setAttribute('aria-label', `${index + 1} of ${total}`);
  root.inert = true;
  paint(root, GREETING_NIGHT);

  const shapesHolder = el('div', undefined);
  shapesHolder.dataset.greetingShapes = '';
  shapesHolder.append(shapeLayer(GREETING_NIGHT.shape, `${index}-night`));
  root.append(shapesHolder);

  const stack = el('div', 'card__stack');

  const headBox = el('div', 'card__head');
  const wordHolder = el('div', undefined);
  wordHolder.dataset.greetingWord = '';
  wordHolder.append(wordBlock(card.night.word, card.night.value, card.night.unit));
  headBox.append(wordHolder);
  stack.append(headBox);

  const foot = el('div', 'card__foot');
  foot.append(el('hr', 'rule'));
  const caption = el('p', 'caption', card.night.caption);
  caption.dataset.greetingCaption = '';
  foot.append(caption);

  const toggle = el('button', 'greeting__toggle');
  toggle.type = 'button';
  toggle.dataset.greetingToggle = '';
  toggle.setAttribute('aria-pressed', 'false');
  const label = el('span', undefined, 'See it by morning');
  label.dataset.greetingToggleLabel = '';
  toggle.append(label);
  foot.append(toggle);

  stack.append(foot);
  root.append(stack);
  return root;
}

export function renderCard(card: Card, index: number, total: number): HTMLElement {
  if (card.kind === 'greeting') return renderGreetingCard(card, index, total);

  const theme = themeFor(index, card.kind === 'closing', 'theme' in card ? card.theme : undefined);

  const root = el('article', `card card--${card.kind}`);
  root.dataset.state = 'upcoming';
  root.setAttribute('aria-label', `${index + 1} of ${total}`);
  root.inert = true;
  paint(root, theme);
  root.append(shapeLayer(theme.shape, String(index)));

  const stack = el('div', 'card__stack');
  const headBox = el('div', 'card__head');
  headBox.append(head(card));
  stack.append(headBox);

  if (card.kind !== 'closing') {
    const foot = el('div', 'card__foot');
    foot.append(el('hr', 'rule'));
    foot.append(el('p', 'caption', card.caption));
    if ('footnote' in card && card.footnote) {
      foot.append(el('p', 'footnote', card.footnote));
    }
    if (card.kind === 'quote') {
      foot.append(elapsedSince(card.timestamp));
    }
    stack.append(foot);
  }

  root.append(stack);
  return root;
}

/** What the live region says when a card becomes current. */
export function describe(card: Card): string {
  switch (card.kind) {
    case 'opening':
      return `${card.title}. ${card.dateline}. ${card.caption}`;
    case 'figure':
      return `${formatValue(card.value, card.format).text} ${card.unit ?? ''}. ${card.caption}`;
    case 'split':
      return card.sides
        .map((side) => `${side.label}, ${formatInteger(side.value)}`)
        .join('. ')
        .concat(`. ${card.caption}`);
    case 'word':
      return `${card.word}, ${formatInteger(card.value)} ${card.unit ?? 'times'}. ${card.caption}`;
    case 'quote':
      return `${card.author} said, ${card.text}. ${card.caption}`;
    case 'closing':
      return `${card.author} said, ${card.text}`;
    case 'greeting':
      return (
        `${card.night.word}, ${formatInteger(card.night.value)} ${card.night.unit ?? 'times'}. ` +
        `${card.night.caption} A button switches it to good morning.`
      );
  }
}
