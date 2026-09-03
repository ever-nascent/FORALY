/**
 * The score. Drop an audio file at public/score.mp3 and it plays; leave the
 * file out and every one of these functions is a no-op and the control never
 * appears. Nothing about the sequence depends on it.
 *
 * Browsers will not start audio without a gesture, so the first tap starts it
 * and it fades up rather than cutting in.
 */

import { currentMotion } from './motion';

const SRC = '/score.mp3';
const TARGET = 0.55;
const FADE_MS = 1800;
/** How far the score dips when she advances, so the music answers the tap. */
const DIP = 0.62;
const DIP_MS = 520;
const STORE_KEY = 'three-months:muted';
/** A file that has not buffered by now is not worth waiting on any longer. */
const PROBE_MS = 4000;

export interface Score {
  /** Called on the first gesture; safe to call again. */
  start(): void;
  /** A short dip and recover on each card change. */
  dip(): void;
  toggle(): boolean;
  readonly muted: boolean;
}

function remembered(): boolean | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw === null ? null : raw === '1';
  } catch {
    return null;
  }
}

function remember(muted: boolean): void {
  try {
    localStorage.setItem(STORE_KEY, muted ? '1' : '0');
  } catch {
    // A private window is not a reason to fail.
  }
}

/**
 * Ask for the file before handing it to a media element. A missing file fails
 * this in milliseconds, where an <audio> element pointed at a 404 can sit in
 * its own error handling for seconds.
 */
async function present(): Promise<boolean> {
  try {
    const res = await fetch(SRC, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Resolves with the element once it can play through, null if it cannot. */
function buffer(): Promise<HTMLAudioElement | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;

    let settled = false;
    const done = (value: HTMLAudioElement | null): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    audio.addEventListener('canplaythrough', () => done(audio), { once: true });
    audio.addEventListener('error', () => done(null), { once: true });
    setTimeout(() => done(audio.readyState >= 2 ? audio : null), PROBE_MS);

    audio.src = SRC;
    audio.load();
  });
}

export async function loadScore(): Promise<Score | null> {
  if (!(await present())) return null;
  const audio = await buffer();
  if (!audio) return null;

  // A still sequence is a silent one until she asks for sound. Read from the
  // resolved motion state rather than the media query, so turning the movement
  // back on and turning the sound back on stay one decision apart.
  let muted = remembered() ?? currentMotion() === 'off';
  let started = false;
  let ramp = 0;

  const rampTo = (to: number, ms: number): void => {
    cancelAnimationFrame(ramp);
    const from = audio.volume;
    const at = performance.now();
    const step = (now: number): void => {
      const t = ms <= 0 ? 1 : Math.min((now - at) / ms, 1);
      audio.volume = from + (to - from) * t;
      if (t < 1) ramp = requestAnimationFrame(step);
    };
    ramp = requestAnimationFrame(step);
  };

  const play = (): void => {
    void audio.play().catch(() => {
      // Autoplay refused. The next gesture will try again.
      started = false;
    });
  };

  return {
    start() {
      if (started || muted) return;
      started = true;
      audio.volume = 0;
      play();
      rampTo(TARGET, FADE_MS);
    },
    dip() {
      if (!started || muted) return;
      rampTo(TARGET * DIP, 90);
      setTimeout(() => {
        if (started && !muted) rampTo(TARGET, DIP_MS);
      }, 110);
    },
    toggle() {
      muted = !muted;
      remember(muted);
      if (muted) {
        rampTo(0, 320);
        setTimeout(() => {
          if (muted) audio.pause();
        }, 340);
      } else {
        started = true;
        play();
        rampTo(TARGET, 700);
      }
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
