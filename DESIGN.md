---
typography:
  figure:
    fontFamily: Gloock
    fontSize: clamp(6rem, 42vw, 18rem)
  split:
    fontFamily: Gloock
    fontSize: clamp(3rem, 19vw, 7.5rem)
  word:
    fontFamily: Gloock
    fontSize: clamp(3.5rem, 24vw, 10rem)
  quote:
    fontFamily: Schibsted Grotesk
    fontSize: clamp(1.75rem, 7.6vw, 3.25rem)
  title:
    fontFamily: Schibsted Grotesk
    fontSize: clamp(2.5rem, 12vw, 6rem)
  caption:
    fontFamily: Schibsted Grotesk
    fontSize: clamp(1.0625rem, 4.6vw, 1.3125rem)
  small:
    fontFamily: Schibsted Grotesk
    fontSize: 0.8125rem
colors:
  curtain-ground: "#17121c"
  curtain-glow: "#312c35"
  curtain-ink: "#fff3e4"
  curtain-quiet: "#c9bbd1"
  curtain-faint: "#a697b0"
  curtain-accent: "#e8b84b"
  voltage-ground: "#2e1638"
  voltage-glow: "#45304e"
  voltage-ink: "#d9ff5c"
  voltage-quiet: "#c6b4d6"
  voltage-faint: "#b9a8cb"
  voltage-accent: "#d9ff5c"
  acid-ground: "#dfff6b"
  acid-glow: "#e1ff72"
  acid-ink: "#2e1638"
  acid-quiet: "#4a2a5c"
  acid-faint: "#5e3b72"
  acid-accent: "#2e1638"
  coral-ground: "#ff5e4d"
  coral-glow: "#ff7061"
  coral-ink: "#26100e"
  coral-quiet: "#3f1a15"
  coral-faint: "#4a1f19"
  coral-accent: "#26100e"
  teal-ground: "#0b3b3c"
  teal-glow: "#265151"
  teal-ink: "#ff8a6b"
  teal-quiet: "#bfd8d6"
  teal-faint: "#b4cfcd"
  teal-accent: "#ff8a6b"
  cobalt-ground: "#1b37c4"
  cobalt-glow: "#344dca"
  cobalt-ink: "#fff3e4"
  cobalt-quiet: "#dce2ff"
  cobalt-faint: "#d2daff"
  cobalt-accent: "#dfff6b"
  hers-ground: "#f3d9d7"
  hers-glow: "#f4dbd9"
  hers-ink: "#2e1638"
  hers-quiet: "#61414c"
  hers-faint: "#6e4a56"
  hers-accent: "#8a6224"
  marigold-ground: "#ffb020"
  marigold-glow: "#ffb42b"
  marigold-ink: "#2e1638"
  marigold-quiet: "#4a360d"
  marigold-faint: "#553f18"
  marigold-accent: "#2e1638"
  bone-ground: "#fff3e4"
  bone-glow: "#fff4e5"
  bone-ink: "#17121c"
  bone-quiet: "#5a5048"
  bone-faint: "#726557"
  bone-accent: "#d63b28"
  night-ground: "#0e0b14"
  night-glow: "#29262e"
  night-ink: "#e8b84b"
  night-quiet: "#b3a48c"
  night-faint: "#a4957a"
  night-accent: "#e8b84b"
  crimson-ground: "#9c0f31"
  crimson-glow: "#a72948"
  crimson-ink: "#ffd9e8"
  crimson-quiet: "#fccedb"
  crimson-faint: "#f9c6d5"
  crimson-accent: "#dfff6b"
  slate-ground: "#3a4a52"
  slate-glow: "#505e65"
  slate-ink: "#fff3e4"
  slate-quiet: "#d3dcdf"
  slate-faint: "#cbd6d9"
  slate-accent: "#ffa98f"
  rose-ground: "#e8a0a8"
  rose-glow: "#e9a5ac"
  rose-ink: "#2e1638"
  rose-quiet: "#4a2630"
  rose-faint: "#573039"
  rose-accent: "#5e2f24"
  gate-ground: "#17121c"
  gate-ink: "#fff3e4"
  gate-quiet: "#c9bbd1"
  gate-accent: "#e8b84b"
rounded:
  none: 0
  hair: 2px
  seg: 3px
  pill: 999px
---

# Three months, timestamped — the system

Thirteen full-bleed cards, one statistic each, advanced by tap, swipe or arrow
key. One recipient, on a phone, at night. Mobile is the target and desktop is
the accommodation.

Spotify Wrapped is the reference for the *format* and, at the client's
direction, for the register too: loud colour, big shapes, a scored sequence.
The earlier restrained version of this system is in the git history if it is
ever wanted back.

## Colour

Thirteen worlds, one per card, in `src/palette.ts`. The order is an arc rather
than an alternation: a dark curtain, voltage, a stretch of loud colour, her own
pink at the centre where the word she says most lands, a breath of bone for the
first message she ever sent, the small hours in gold on black, and back to her
rose to close. The last card always gets the rose — that ending is the point,
not a position in a list.

Two colours in her life anchor the set even though the arc is free to leave
them: the pink is the shade she wears (two coats of OPI Funny Bunny under one
of Bubble Bath) and the gold is the metal she wears. They get the card about the
word she says most, and the card that ends it.

No violet anywhere, and no purple gradient: it is the single most recognisable
tell of a generated interface, and the brief ruled it out by name. The card that
wanted it — the longest unbroken conversation, one night in July — gets deep
crimson instead.

Every pairing clears WCAG AA against **both** ends of its own gradient —
figures at the large-text bar, captions and footnotes at 4.5:1, accents at the
3:1 non-text bar. Checked with a script, not eyeballed; the tightest in the set
is 4.5:1 exactly.

A grain overlay sits above everything at low opacity. Without it these become
thirteen flat vector fields; with it they read as printed.

## Shapes

One composition per card, built as SVG on a 0–100 grid and slice-fitted, in
`src/shapes.ts`. They are not wallpaper — each one is chosen for the statistic
in front of it:

| Card | Shape | Why |
| --- | --- | --- |
| Opening | Concentric rings | The curtain going up |
| Messages | One enormous disc, one satellite | The count, and the small thing orbiting it |
| Words | Bars hung from the top edge | Words stacking up |
| Who wrote more | Two overlapping circles | Two people, and the overlap |
| The hour | A clock face, off-centre | The hand points at the hour without crossing it |
| Streak | A grid of dots below the figure | One mark per day, unbroken |
| Her word | A soft blob | The only unruled shape in the set, on her card |
| Laughs | Rays going outward | Everything leaving at once |
| First message | One halo | A single message, held |
| 4am | A crescent and two small stars | The small hours |
| Longest conversation | Nested rotated rounded rects | Something that kept turning back on itself |
| Longest silence | One line, one dot | Emptiness, made literal |
| Closing | Overlapping ellipses | Her rose, opening |

Compositions are placed to complement each card's alignment — a card that sets
its type at the top gets its shapes below it, and the reverse — so nothing ever
runs through a numeral.

## Type

Two families, and one rule that decides between them:

**Gloock sets the figures and the one word, and nothing else, ever.** Its
figures are proportional — a 1 is far narrower than a 0 — so each figure is
measured against the real font at runtime (`src/fit.ts`) and CSS takes whichever
is smaller: the size the design wants, or the size that fits the measure, less a
2% sliver so a rounding error cannot wrap a word that was sized to fit.

**Schibsted Grotesk sets everything with a sentence in it** — captions,
footnotes, units, the opening title, and her verbatim messages. A message
someone typed at midnight should look typed, not engraved.

## Motion

Thirteen cards are thirteen moments, not one moment thirteen times. Each kind
of card enters in its own way, and the figure always lands last:

| Card | How it arrives |
| --- | --- |
| Figures | The number lands at size and settles, punching down from 1.16 |
| Who wrote more | The two sides come in from opposite edges, 70ms apart |
| Her word | One letter at a time, 38ms apart, each with a little rotation |
| Quotes | A clip-path wipe down the lines, like it is being typed |
| Opening | The title wipes across |

Behind all of them the shapes scale up on a 46ms stagger.

**And then nothing stops.** A card that freezes after its reveal is a still
image she is looking at for the next twenty seconds, so every part keeps moving
once it has arrived — each on its own period, so a composition breathes rather
than marching:

| Card | What keeps moving |
| --- | --- |
| Opening | The rings go out as sonar, over and over |
| Messages | The satellite orbits the count; the disc breathes |
| Words | The bars rise and fall like a meter |
| Who wrote more | The two circles drift together and apart |
| The hour | The clock runs — two hands, different rates |
| Streak | The days light up in a diagonal wave |
| Her word | The blob turns slowly, two layers against each other |
| Laughs | The rays pulse outward |
| First message | The halo breathes; the ring ripples off it |
| 4am | The moon drifts, the stars go in and out |
| Longest conversation | Four rings turning at four different speeds |
| Longest silence | Almost nothing: a line that stretches, a dot that drifts |
| Closing | Five petals turning at different rates |

The light in the ground moves too: the glow is its own oversized element on a
26s drift, so the light source travels across the card rather than sitting where
it was painted.

Every part of this is `transform` and `opacity` only, so it runs on the
compositor rather than the main thread, and only ever on the card that is
actually up — the other twelve are idle.

Between cards is a parallax push: the incoming card travels the full width, the
outgoing one 28% of it, on `cubic-bezier(0.32, 0.72, 0, 1)` over 520ms. The seam
behind the push takes the colour of the card arriving, so the join between two
worlds is never a flash of something else.

Curves come from the animation standards verbatim; `transform`, `opacity` and
`clip-path` only; no `ease-in` anywhere and no `transition: all`.

**Count-ups on three cards only** — messages, words, laughs — where the
magnitude is the point. The counter runs on the same cubic-bezier as the
landing, solved exactly rather than approximated, and a hidden ghost at the
final value holds the width so the digits cannot shift under themselves.

**`prefers-reduced-motion` is gentler, not off:** every part still arrives, but
opacity alone, no push, no per-letter stagger, no count-up, no drifting light,
and nothing loops — verified as zero running infinite animations. The score
starts muted.

## Chrome

Thirteen segments across the top — the one piece of Wrapped's own grammar the
sequence borrows, because it is what tells her how much is left without a word
on screen. A sound toggle, which is not optional: audio that starts on its own
needs a way to stop it. Back and next are real buttons for keyboard and
assistive tech, invisible until they take focus.

## Score

`public/score.mp3`, supplied separately, never committed. It is loaded in the
background and never gates the first card; if the file is not there,
`loadScore()` resolves to null and the sound control never appears. Browsers
will not start audio without a gesture, so the first tap starts it and it fades
up over 1.8s rather than cutting in. Each card change dips it briefly so the
music answers the tap. The mute choice is remembered per browser.

## Print

The set doubles as plates for the printed companion piece: A5 portrait, one card
per page, grounds and shapes preserved, counting figures at their final value.

## Not this

Still banned, and still banned after the loud rebuild: italic-serif accenting of
a single word, all-caps eyebrow labels, `01 / 02 / 03` markers, nested cards,
middle-dot meta strings, arrows appended to text, purple-to-blue gradient heroes,
glassmorphism.
