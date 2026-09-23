// The shape of data/wrapped.json. Everything the sequence renders comes from
// this file and nothing else — there is no runtime data fetching beyond it.

import type { ThemeName } from '../palette';

/** `clock` values are minutes since midnight in Meta.timezone. */
export type Format = 'integer' | 'clock';

export interface Meta {
  /** True until scripts/build-data.mjs has run against the real export. */
  placeholder: boolean;
  generatedAt: string;
  /** Inclusive date range the statistics cover, ISO dates. */
  range: { start: string; end: string };
  /** IANA zone every hour-of-day figure was computed in. */
  timezone: string;
  people: { her: string; him: string };
}

interface Base {
  /** The one short line of copy. Sentence case, no exclamation marks. */
  caption: string;
  /**
   * Pins this card to a specific place in the colour arc — see themeFor() in
   * palette.ts — so reordering cards in the deck can't scramble which shape
   * and palette a card gets. Omit to fall back to cycling by position.
   */
  theme?: ThemeName;
}

/** Sets the sequence up. No figure. */
export interface OpeningCard extends Base {
  kind: 'opening';
  title: string;
  dateline: string;
}

/** One number, set large. The default card. */
export interface FigureCard extends Base {
  kind: 'figure';
  value: number;
  format: Format;
  /** Rendered small beside the figure — "messages", "days". Optional. */
  unit?: string;
  /** Only true where the magnitude itself is the point. Integers only. */
  countUp?: boolean;
  /**
   * Rendered quietly under the figure itself, above the rule — for a card
   * whose caption is doing something other than saying what the number is
   * (a joke, a reaction), and a unit like "messages" isn't carrying that on
   * its own (a clock has no unit at all; "31 hours" doesn't say the hours
   * were spent in silence). Same quiet register as `footnote`; the
   * difference is only where it sits.
   */
  context?: string;
  /** Rendered quietly under the caption — a date, a qualifier. */
  footnote?: string;
}

/** Two figures, hers and his. */
export interface SplitCard extends Base {
  kind: 'split';
  sides: [{ label: string; value: number }, { label: string; value: number }];
  format: Format;
  /** Same job as FigureCard's `context` — what these two numbers actually
   *  are, for a caption that's a reaction rather than a description of them. */
  context?: string;
  footnote?: string;
}

/** A word given the numeral treatment, with its count underneath. */
export interface WordCard extends Base {
  kind: 'word';
  word: string;
  value: number;
  unit?: string;
}

/** A message reproduced verbatim, typos and all. */
export interface QuoteCard extends Base {
  kind: 'quote';
  text: string;
  author: string;
  timestamp: string;
  footnote?: string;
}

/** The last card. One line she said, and nothing else. */
export interface ClosingCard {
  kind: 'closing';
  text: string;
  author: string;
}

/** One side of GreetingCard — the word, its count, and what to say about it. */
export interface GreetingSide {
  word: string;
  value: number;
  unit?: string;
  caption: string;
}

/**
 * A word given the numeral treatment twice over, with a button between them:
 * "goodnight" by night, "good morning" by day, her choice which one she's
 * looking at. Doesn't extend Base — each side carries its own caption rather
 * than sharing one, and the card manages its own night/day palette rather
 * than taking a `theme` pin, so neither of Base's fields apply here.
 */
export interface GreetingCard {
  kind: 'greeting';
  night: GreetingSide;
  day: GreetingSide;
}

export type Card =
  | OpeningCard
  | FigureCard
  | SplitCard
  | WordCard
  | QuoteCard
  | ClosingCard
  | GreetingCard;

export interface Wrapped {
  meta: Meta;
  cards: Card[];
}
