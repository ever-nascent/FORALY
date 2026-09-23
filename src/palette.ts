/**
 * The colour arc. Thirteen worlds, one per card, ordered so the sequence moves
 * rather than alternates: a dark curtain, then voltage, then a stretch of loud
 * colour, her own pink at the centre where the word she says most lands, a
 * breath of bone for the first message she ever sent, the small hours in gold
 * on black, and back to her rose to close.
 *
 * Every pairing clears WCAG AA against both ends of its own gradient — the
 * figures at the large-text bar, captions and footnotes at 4.5:1, accents at
 * the 3:1 non-text bar. Checked, not eyeballed.
 */

/** Which composition sits behind the card. Each one says something about the
 *  statistic in front of it; none of them are wallpaper. */
export type ShapeKind =
  | 'rings'
  | 'orbit'
  | 'bars'
  | 'twin'
  | 'arc'
  | 'grid'
  | 'blob'
  | 'burst'
  | 'halo'
  | 'moon'
  | 'spiral'
  | 'sparse'
  | 'bloom'
  | 'stars'
  | 'sunrise'
  | 'megaphone';

/** Where the stack sits in the frame. Variety, so thirteen cards are not
 *  thirteen identical centred columns. */
export type Align = 'center' | 'end' | 'start';

export interface Theme {
  name: string;
  ground: string;
  glow: string;
  ink: string;
  quiet: string;
  faint: string;
  accent: string;
  shape: ShapeKind;
  align: Align;
}

/**
 * The translucent tones are worked out here rather than with `color-mix()` in
 * CSS. `color-mix` is only a few years old, and a browser that does not know it
 * drops the whole declaration — which would leave every shape with no fill and
 * the page looking like it forgot to draw anything. A plain `rgba()` string
 * cannot fail.
 */
function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export interface Tones {
  shapeA: string;
  shapeB: string;
  shapeLine: string;
  track: string;
  edge: string;
  seam: string;
  veil: string;
}

export function tonesFor(theme: Theme): Tones {
  return {
    shapeA: alpha(theme.accent, 0.3),
    shapeB: alpha(theme.ink, 0.18),
    shapeLine: alpha(theme.accent, 0.48),
    track: alpha(theme.ink, 0.26),
    edge: alpha(theme.ink, 0.38),
    seam: alpha(theme.ink, 0.3),
    veil: alpha(theme.ground, 0.7),
  };
}

export const THEMES: Theme[] = [
  { name: 'curtain',  ground: '#17121c', glow: '#312c35', ink: '#fff3e4', quiet: '#c9bbd1', faint: '#a697b0', accent: '#e8b84b', shape: 'rings',  align: 'center' },
  { name: 'voltage',  ground: '#2e1638', glow: '#45304e', ink: '#d9ff5c', quiet: '#c6b4d6', faint: '#b9a8cb', accent: '#d9ff5c', shape: 'orbit',  align: 'center' },
  { name: 'acid',     ground: '#dfff6b', glow: '#e1ff72', ink: '#2e1638', quiet: '#4a2a5c', faint: '#5e3b72', accent: '#2e1638', shape: 'bars',   align: 'end'    },
  { name: 'coral',    ground: '#ff5e4d', glow: '#ff7061', ink: '#26100e', quiet: '#3f1a15', faint: '#4a1f19', accent: '#26100e', shape: 'twin',   align: 'center' },
  { name: 'teal',     ground: '#0b3b3c', glow: '#265151', ink: '#ff8a6b', quiet: '#bfd8d6', faint: '#b4cfcd', accent: '#ff8a6b', shape: 'arc',    align: 'center' },
  { name: 'cobalt',   ground: '#1b37c4', glow: '#344dca', ink: '#fff3e4', quiet: '#dce2ff', faint: '#d2daff', accent: '#dfff6b', shape: 'grid',   align: 'start'  },
  { name: 'hers',     ground: '#f3d9d7', glow: '#f4dbd9', ink: '#2e1638', quiet: '#61414c', faint: '#6e4a56', accent: '#8a6224', shape: 'blob',   align: 'center' },
  { name: 'marigold', ground: '#ffb020', glow: '#ffb42b', ink: '#2e1638', quiet: '#4a360d', faint: '#553f18', accent: '#2e1638', shape: 'burst',  align: 'center' },
  { name: 'bone',     ground: '#fff3e4', glow: '#fff4e5', ink: '#17121c', quiet: '#5a5048', faint: '#726557', accent: '#d63b28', shape: 'halo',   align: 'center' },
  { name: 'night',    ground: '#0e0b14', glow: '#29262e', ink: '#e8b84b', quiet: '#b3a48c', faint: '#a4957a', accent: '#e8b84b', shape: 'moon',   align: 'end'    },
  { name: 'crimson',  ground: '#9c0f31', glow: '#a72948', ink: '#ffd9e8', quiet: '#fccedb', faint: '#f9c6d5', accent: '#dfff6b', shape: 'spiral', align: 'center' },
  { name: 'slate',    ground: '#3a4a52', glow: '#505e65', ink: '#fff3e4', quiet: '#d3dcdf', faint: '#cbd6d9', accent: '#ffa98f', shape: 'sparse', align: 'start'  },
  { name: 'rose',     ground: '#e8a0a8', glow: '#e9a5ac', ink: '#2e1638', quiet: '#4a2630', faint: '#573039', accent: '#5e2f24', shape: 'bloom',  align: 'center' },
  // Every card now carries an explicit `theme` pin (see build-data.mjs), so
  // this array is really a lookup table by name more than a cycled arc.
  // Added after `rose` rather than resorting the list to keep it first —
  // CLOSING below finds it by name, not position, so this is safe.
  { name: 'fuchsia',  ground: '#a81863', glow: '#c02a72', ink: '#fff3e4', quiet: '#f4d9ea', faint: '#f0cade', accent: '#eafd6b', shape: 'megaphone', align: 'center' },
];

/**
 * The one card with two palettes instead of one — src/greeting.ts crossfades
 * the card between these on a click, rather than the deck picking one at
 * render time the way `THEMES` does. Not part of that arc: skipped by
 * `themeFor`'s cycling, and never a valid `theme` pin.
 *
 * Contrast checked the same way as the arc above — ink and accent both clear
 * their bars against each ground, computed against the actual hex values,
 * not eyeballed.
 */
export const GREETING_NIGHT: Theme = {
  name: 'goodnight',
  ground: '#0b1526',
  glow: '#182a44',
  ink: '#eef4ff',
  quiet: '#aebcd6',
  faint: '#93a2bd',
  accent: '#ffd166',
  shape: 'stars',
  align: 'center',
};

export const GREETING_DAY: Theme = {
  name: 'goodmorning',
  ground: '#bfe6f2',
  glow: '#d8f1f8',
  ink: '#122437',
  quiet: '#33506b',
  faint: '#456180',
  accent: '#b3400f',
  shape: 'sunrise',
  align: 'center',
};

// By name, not position — `rose` no longer has to stay the array's last
// entry for this to find it, so a theme can be added after it (as `fuchsia`
// is, below) without silently reassigning the closing card's colour.
const CLOSING = THEMES.find((theme) => theme.name === 'rose') as Theme;

export type ThemeName = (typeof THEMES)[number]['name'];

/**
 * The arc is written for the thirteen cards the generator produces. If the set
 * ever grows or shrinks it cycles rather than running out, and the last card
 * always gets her rose — that ending is the point, not a position in a list.
 *
 * `name`, when a card carries one, pins it to a specific place in the arc
 * regardless of where it lands in the deck — a card whose shape and colour
 * were chosen for what it is (the clock for the hour, the dot grid for the
 * streak) can't have that scrambled by moving cards around it. Falls back to
 * cycling by position for anything that doesn't specify one, same as before.
 */
export function themeFor(index: number, isClosing: boolean, name?: ThemeName): Theme {
  if (isClosing) return CLOSING;
  if (name) {
    const pinned = THEMES.find((theme) => theme.name === name);
    if (pinned) return pinned;
  }
  return THEMES[index % THEMES.length] as Theme;
}
