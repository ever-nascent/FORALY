/**
 * The score. Drop an audio file at public/score.mp3 and it plays; leave the
 * file out and every one of these functions is a no-op and the control never
 * appears. Nothing about the sequence depends on it.
 *
 * It tries to start the moment it is ready. Most browsers refuse sound before
 * a gesture; when they do, the deck asks for one tap on the opening card, and
 * that tap starts it. Either way it fades up rather than cutting in.
 *
 * The volume runs through a Web Audio gain node rather than the element's own
 * `volume`, which iOS ignores outright — there the fade would be a hard cut.
 */


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
  /**
   * Tries to start without a gesture. Resolves true if the score is playing,
   * or is muted by her own choice — false if the browser wants a tap first.
   */
  autoplay(): Promise<boolean>;
  /** Called from a gesture; safe to call again. */
  start(): void;
  /** A short dip and recover on each card change. */
  dip(): void;
  toggle(): boolean;
  readonly muted: boolean;
  /** Seconds into the song while it is audibly playing; null otherwise. */
  time(): number | null;
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
    // A host with a single-page fallback answers a missing file with the page
    // itself and a 200, so the status alone is not proof there is any audio.
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('audio/');
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

  // On unless she has turned it off herself. A reduced-motion setting says
  // nothing about sound, and muting on it left the score silent with no clue why.
  let muted = remembered() ?? false;
  let started = false;
  let ramp = 0;

  // The gain node, where the platform has one. Built lazily: until it exists
  // the element plays straight out at its own volume.
  type Ctor = typeof AudioContext;
  const Context: Ctor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  let ctx: AudioContext | null = null;
  let gain: GainNode | null = null;

  const graph = (): void => {
    if (ctx || !Context) return;
    try {
      const context = new Context();
      const node = context.createGain();
      node.gain.value = 0;
      context.createMediaElementSource(audio).connect(node).connect(context.destination);
      audio.volume = 1;
      ctx = context;
      gain = node;
    } catch {
      ctx = null;
      gain = null;
    }
  };

  /** Must be called inside a gesture the first time; harmless otherwise. */
  const wakeGraph = (): void => {
    if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {});
  };

  const setNow = (value: number): void => {
    if (ctx && gain) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(value, ctx.currentTime);
    } else {
      audio.volume = value;
    }
  };

  const rampTo = (to: number, ms: number): void => {
    if (ctx && gain) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(to, now + Math.max(ms, 1) / 1000);
      return;
    }
    cancelAnimationFrame(ramp);
    const from = audio.volume;
    const at = performance.now();
    const step = (now: number): void => {
      // A frame's timestamp can sit a hair before `at`, which would push t
      // negative and the volume below zero — an exception, not a quiet note.
      const t = ms <= 0 ? 1 : Math.min(Math.max((now - at) / ms, 0), 1);
      audio.volume = Math.min(Math.max(from + (to - from) * t, 0), 1);
      if (t < 1) ramp = requestAnimationFrame(step);
    };
    ramp = requestAnimationFrame(step);
  };

  const play = (): void => {
    void audio.play().catch(() => {
      // Refused. The next gesture will try again.
      started = false;
    });
  };

  const settle = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  return {
    async autoplay() {
      if (muted || started) return true;
      graph();
      setNow(0);
      const playing = await audio.play().then(
        () => true,
        () => false
      );
      if (ctx) {
        // The element can be allowed to play while the context that carries
        // its sound is still held silent; that is not playing either.
        wakeGraph();
        await settle(60);
      }
      if (!playing || (ctx && ctx.state !== 'running')) {
        audio.pause();
        return false;
      }
      if (started) return true;
      started = true;
      rampTo(TARGET, FADE_MS);
      return true;
    },
    start() {
      graph();
      wakeGraph();
      if (started || muted) return;
      started = true;
      setNow(0);
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
        graph();
        wakeGraph();
        started = true;
        play();
        rampTo(TARGET, 700);
      }
      return muted;
    },
    get muted() {
      return muted;
    },
    time() {
      return started && !muted && !audio.paused ? audio.currentTime : null;
    },
  };
}
