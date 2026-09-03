import { formatInteger, formatValue } from '../format';
import { themeFor, tonesFor, type Theme } from '../palette';
import { shapeLayer } from '../shapes';
import type { Card, FigureCard, OpeningCard, SplitCard, WordCard } from './types';

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
  return split;
}

/** The word arrives a letter at a time, so it reads as something being said. */
function renderWord(card: WordCard): HTMLElement {
  const word = el('div', 'word');
  const text = el('span', 'word__text');
  text.dataset.fit = card.word;

  for (const [i, character] of [...card.word].entries()) {
    const letter = el('span', 'word__letter', character);
    letter.style.setProperty('--i', String(i));
    text.append(letter);
  }

  word.append(text);
  word.append(el('span', 'word__count', `${formatInteger(card.value)} ${card.unit ?? 'times'}`));
  return word;
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

function head(card: Card): HTMLElement {
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

function paint(root: HTMLElement, theme: Theme): void {
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

export function renderCard(card: Card, index: number, total: number): HTMLElement {
  const theme = themeFor(index, card.kind === 'closing');

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
  }
}
