/**
 * The display face has proportional figures — a 1 is much narrower than a 0 — so
 * how wide a number sets depends entirely on which digits it contains. Rather
 * than pick a font size small enough for the worst case, measure each figure
 * once against the real font and let CSS take whichever is smaller: the size
 * the design wants, or the size that fits the measure.
 */

const PROBE_PX = 100;

export function fit(root: ParentNode): void {
  const targets = root.querySelectorAll<HTMLElement>('[data-fit]');
  if (targets.length === 0) return;

  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:fixed;top:-200vh;left:0;visibility:hidden;white-space:pre;pointer-events:none;';
  probe.style.fontSize = `${PROBE_PX}px`;
  document.body.append(probe);

  for (const el of targets) {
    const text = el.dataset.fit;
    if (!text) continue;

    const style = getComputedStyle(el);
    const size = Number.parseFloat(style.fontSize) || PROBE_PX;
    const spacing = Number.parseFloat(style.letterSpacing);

    probe.style.fontFamily = style.fontFamily;
    probe.style.fontWeight = style.fontWeight;
    probe.style.fontVariationSettings = style.fontVariationSettings;
    // Computed letter-spacing is px at the element's current size; re-express
    // it against the probe's size so the measurement stays in em.
    probe.style.letterSpacing = Number.isNaN(spacing)
      ? 'normal'
      : `${(spacing / size) * PROBE_PX}px`;
    probe.textContent = text;

    el.style.setProperty('--fit-em', String(probe.getBoundingClientRect().width / PROBE_PX));
  }

  probe.remove();
}
