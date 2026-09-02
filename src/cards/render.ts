import { formatInteger, formatValue } from '../format';
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
  figure.append(figureValue(text, card.countUp && card.format === 'integer' ? card.value : undefined));
  if (suffix) figure.append(el('span', 'figure__unit', suffix));
  else if (card.unit) figure.append(el('span', 'figure__unit', card.unit));
  return figure;
}

function renderSplit(card: SplitCard): HTMLElement {
  const split = el('div', 'split');
  const [first, second] = card.sides;

  for (const [index, side] of [first, second].entries()) {
    const box = el('div', 'split__side');
    const value = el('span', 'split__value', formatValue(side.value, card.format).text);
    value.dataset.fit = value.textContent ?? '';
    box.append(value);
    box.append(el('span', 'split__label', side.label));
    if (index === 0) {
      split.append(box, el('div', 'split__seam'));
    } else {
      split.append(box);
    }
  }
  return split;
}

function renderWord(card: WordCard): HTMLElement {
  const word = el('div', 'word');
  const text = el('span', 'word__text', card.word);
  text.dataset.fit = card.word;
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
      return renderQuote(card.text);
    case 'closing':
      return renderQuote(card.text);
  }
}

/** Milk every third card and always on the last one, so the pink paces the set. */
function ground(index: number, card: Card): 'milk' | 'paper' {
  return index % 3 === 0 || card.kind === 'closing' ? 'milk' : 'paper';
}

export function renderCard(card: Card, index: number, total: number): HTMLElement {
  const root = el('article', `card card--${card.kind}`);
  root.dataset.ground = ground(index, card);
  root.dataset.state = 'upcoming';
  root.setAttribute('aria-label', `${index + 1} of ${total}`);
  root.inert = true;

  const headBox = el('div', 'card__head');
  headBox.append(head(card));
  root.append(headBox);

  if (card.kind === 'closing') return root;

  const foot = el('div', 'card__foot');
  foot.append(el('hr', 'rule'));
  foot.append(el('p', 'caption', card.caption));
  if ('footnote' in card && card.footnote) {
    foot.append(el('p', 'footnote', card.footnote));
  }
  root.append(foot);
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
