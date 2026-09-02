---
typography:
  figure:
    fontFamily: Gloock
    fontSize: clamp(5.5rem, 36vw, 15rem)
  split:
    fontFamily: Gloock
    fontSize: clamp(2.75rem, 16vw, 6rem)
  word:
    fontFamily: Gloock
    fontSize: clamp(3.25rem, 22vw, 9rem)
  quote:
    fontFamily: Schibsted Grotesk
    fontSize: clamp(1.625rem, 7vw, 2.75rem)
  title:
    fontFamily: Schibsted Grotesk
    fontSize: clamp(2rem, 9vw, 4rem)
  caption:
    fontFamily: Schibsted Grotesk
    fontSize: clamp(1rem, 4.4vw, 1.1875rem)
  small:
    fontFamily: Schibsted Grotesk
    fontSize: 0.8125rem
colors:
  paper: "#fcf8f7"
  paper-shade: "#f7ebe9"
  lacquer: "#f3d9d7"
  coat-base: "rgb(232 190 184 / 0.55)"
  coat-top: "rgb(247 223 224 / 0.5)"
  lacquer-edge: "rgb(214 176 170 / 0.5)"
  ink: "#2b2320"
  ink-quiet: "#574641"
  ink-faint: "#6e5d56"
  gold: "#9c7431"
  gold-line: "rgb(156 116 49 / 0.45)"
rounded:
  none: 0
  pill: 999px
---

# Three months, timestamped — the system

A sequence of thirteen full-bleed cards, one statistic each, advanced by tap,
swipe or arrow key. One recipient, on a phone, at night. Mobile is the target
and desktop is the accommodation.

## Colour

The pink is not a mood-board pink. It is the shade she wears: two coats of OPI
Funny Bunny under one of Bubble Bath. It is held in CSS the way it goes on the
nail — `--coat-base` over the paper, then the sheer `--coat-top` over that —
rather than flattened into one hex, which is why it reads slightly opaque and
warm instead of printed. Composited it lands on `#f3d9d7`; that value is
declared above so the detector has something to match, but no rule sets it
directly.

The ground is `--paper`, a warm off-white with a faint pink cast. Not white,
not black, and deliberately not the cream-and-terracotta register.

Gold is the only accent, because she wears gold and not silver. It appears as
one 2.5rem hairline above the caption, as the seam on the split card, as the
pace line at the bottom edge, and as focus rings. It never sets text.

Cards alternate: every third one and the last one carry the lacquer, the rest
carry paper. That is the whole visual rhythm of the set.

Every text tone clears WCAG AA against both grounds — the quiet tone at 6.7:1
on lacquer, the faint tone at 4.7:1. Gold is decorative only and is held to the
3:1 non-text bar.

## Type

Two families, and one rule that decides between them:

**Gloock sets the figures and the one word, and nothing else, ever.** All of
the boldness in the piece is spent there. Its figures are proportional — a 1 is
far narrower than a 0 — so each figure is measured against the real font at
runtime (`src/fit.ts`), and CSS takes whichever is smaller: the size the design
wants, or the size that fits the measure. Long numbers end up filling the
measure edge to edge, which is the intended look, not an accident.

**Schibsted Grotesk sets everything with a sentence in it** — captions,
footnotes, units, the opening title, and her verbatim messages. A message
someone typed at midnight should look typed, not engraved, so the quote cards
use the text face at size rather than the display face.

## Layout

Every card is the same skeleton: `1fr auto`, the figure pinned to the bottom of
the first row, the caption block to the start of the second. The result is
bottom-weighted — a large calm field above, the figure and the line it belongs
to together in the half of the screen a thumb reaches. The closing card is the
only one that centres, which is how it announces itself as the last.

The figure centres; the caption block is left-aligned. That asymmetry is
deliberate and is the only compositional device in the set.

## Motion

The reveal is the medium, so it is spent carefully.

- **One orchestration per card, in two beats.** The caption block settles
  (260ms), then the figure lands (420ms after a 220ms hold). Nothing else moves.
  No per-element sequence.
- **Curves** come from the animation standards verbatim:
  `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for anything entering,
  `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for on-screen movement.
  There is no `ease-in` anywhere and no `transition: all`.
- **420ms is over the 300ms UI bound on purpose.** This is not UI feedback; it
  is the narrative beat the whole page exists for, and it is seen thirteen times
  in one sitting, once each.
- **Asymmetric.** A card leaves in 220ms and the next figure takes 420ms to
  arrive: the system snaps the old one away, the new number takes its time.
- **Count-ups on three cards only** — messages, words, laughs — where the
  magnitude is the point. If every number counted, none of them would mean
  anything. The counter runs on the same cubic-bezier as the landing, solved
  exactly rather than approximated, and a hidden ghost at the final value holds
  the width so the digits cannot shift under themselves.
- **`transform` and `opacity` only.**
- **`prefers-reduced-motion` is gentler, not off:** opacity alone, no movement,
  no count-up, every card still correct read statically.
- **No autoplay, no timer.** She sets the pace.

## Chrome

There is none. No nav, no footer, no credit, no share. The only persistent
element is a one-pixel line at the very bottom that fills as she goes — no
labels, no marks, no hit area. Previous and next are real buttons for keyboard
and assistive tech, invisible until they take focus, parked at the top of the
card where nothing else lives.

## Print

The set doubles as plates for the printed companion piece: A5 portrait, one
card per page, backgrounds preserved, counting figures shown at their final
value.

## Not this

The banned list, kept here so it stays banned: AI-beige with terracotta,
italic-serif accenting of a single word, all-caps eyebrow labels, `01 / 02 / 03`
markers, nested cards, middle-dot meta strings, arrows appended to text, purple
gradients, glassmorphism.
