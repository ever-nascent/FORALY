/**
 * The first-message card's coda. Once everything else on the card has
 * landed, this counts the same stretch of time back out in ever-smaller
 * units — the same span, re-expressed as days, then hours, then minutes,
 * seconds, milliseconds — because it's always been the same amount of time
 * no matter how it's sliced, and the joke is watching the number get
 * sillier as the unit shrinks.
 *
 * Computed live against the moment the card is actually looked at, not
 * baked into the data at build time — the whole point is that it keeps
 * growing for as long as this page exists.
 */

import { countUp, type CountHandle } from './countup';
import { currentMotion } from './motion';
import { formatInteger } from './format';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;
const SECOND = 1_000;

interface Step {
  per: number;
  prefix: string;
  suffix: string;
}

const STEPS: Step[] = [
  { per: DAY, prefix: '', suffix: ' days ago' },
  { per: HOUR, prefix: "that's ", suffix: ' hours' },
  { per: MINUTE, prefix: 'or ', suffix: ' minutes' },
  { per: SECOND, prefix: 'or ', suffix: ' seconds' },
  { per: 1, prefix: 'or ', suffix: ' milliseconds' },
];

const FINAL_LINE = 'or... you get the idea';

/** Before the entrance animations have had a chance to settle. */
const START_DELAY_MS = 1300;
const COUNT_MS = 700;
const HOLD_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function line(text: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'quote__elapsed-line';
  el.textContent = text;
  return el;
}

export interface ElapsedHandle {
  cancel(): void;
}

export function mountElapsed(container: HTMLElement, sinceIso: string): ElapsedHandle {
  const since = Date.parse(sinceIso);
  const elapsedMs = Math.max(0, Date.now() - since);

  if (currentMotion() === 'off') {
    // Still means still: every line, already at its final number, all at
    // once. The joke still reads; nothing counts or waits to get there.
    container.replaceChildren(
      ...STEPS.map((step) =>
        line(`${step.prefix}${formatInteger(Math.floor(elapsedMs / step.per))}${step.suffix}`)
      ),
      line(FINAL_LINE)
    );
    return { cancel() {} };
  }

  let cancelled = false;
  let counting: CountHandle | null = null;
  let resolveStep: (() => void) | null = null;

  async function run(): Promise<void> {
    await sleep(START_DELAY_MS);

    for (const step of STEPS) {
      if (cancelled) return;
      const to = Math.floor(elapsedMs / step.per);

      const el = document.createElement('span');
      el.className = 'quote__elapsed-line';
      const num = document.createElement('span');
      num.textContent = '0';
      if (step.prefix) el.append(step.prefix);
      el.append(num, step.suffix);
      container.replaceChildren(el);

      await new Promise<void>((resolve) => {
        resolveStep = resolve;
        counting = countUp(num, to, COUNT_MS, 0, () => {
          counting = null;
          resolveStep = null;
          resolve();
        });
      });
      if (cancelled) return;

      await sleep(HOLD_MS);
      if (cancelled) return;
    }

    container.replaceChildren(line(FINAL_LINE));
  }

  void run();

  return {
    cancel() {
      cancelled = true;
      counting?.cancel();
      counting = null;
      resolveStep?.();
      resolveStep = null;
    },
  };
}
