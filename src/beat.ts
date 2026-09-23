/**
 * The heartbeat the whole piece shares: the song's own strong beats while the
 * score is playing (src/scoreBeats.ts), the same tempo on its own when it is
 * not. The 28 card's monitor, the buzzing phone and the tug-of-war all move
 * on it, so they stay in time with the music and with one another.
 */

import { SCORE_BEATS, SCORE_BEAT_SECONDS } from './scoreBeats';

/** Seconds into the song while it is audibly playing; null when it is not. */
export type SongClock = () => number | null;

/** The latest strong beat of the song at or before `t`, or null before the first. */
export function lastSongBeat(t: number): number | null {
  let lo = 0;
  let hi = SCORE_BEATS.length - 1;
  if (hi < 0 || t < (SCORE_BEATS[0] ?? 0)) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((SCORE_BEATS[mid] ?? 0) <= t) lo = mid;
    else hi = mid - 1;
  }
  return SCORE_BEATS[lo] ?? null;
}

/** Seconds since the last beat, on the song's beats or on the free-running pulse. */
export function sinceBeat(song: number | null, wall: number): number {
  if (song !== null) {
    const beat = lastSongBeat(song);
    if (beat !== null) return song - beat;
  }
  return wall % SCORE_BEAT_SECONDS;
}

/**
 * Call once a frame with seconds since the card came up; answers true on the
 * frame a new beat lands — the moment the time since the last one drops back.
 */
export function beatWatcher(songTime: SongClock): (wall: number) => boolean {
  let last: number | null = null;
  return (wall) => {
    const phase = sinceBeat(songTime(), wall);
    const fresh = last !== null && phase < last;
    last = phase;
    return fresh;
  };
}
