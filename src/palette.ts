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
  | 'bloom';

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
];

const CLOSING = THEMES[THEMES.length - 1] as Theme;

/**
 * The arc is written for the thirteen cards the generator produces. If the set
 * ever grows or shrinks it cycles rather than running out, and the last card
 * always gets her rose — that ending is the point, not a position in a list.
 */
export function themeFor(index: number, isClosing: boolean): Theme {
  if (isClosing) return CLOSING;
  return THEMES[index % THEMES.length] as Theme;
}
