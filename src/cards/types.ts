// The shape of data/wrapped.json. Everything the sequence renders comes from
// this file and nothing else — there is no runtime data fetching beyond it.

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
  /** Rendered quietly under the caption — a date, a qualifier. */
  footnote?: string;
}

/** Two figures, hers and his. */
export interface SplitCard extends Base {
  kind: 'split';
  sides: [{ label: string; value: number }, { label: string; value: number }];
  format: Format;
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

export type Card =
  | OpeningCard
  | FigureCard
  | SplitCard
  | WordCard
  | QuoteCard
  | ClosingCard;

export interface Wrapped {
  meta: Meta;
  cards: Card[];
}
