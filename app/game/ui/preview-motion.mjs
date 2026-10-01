/** Own only preview frames and the motion subscription. Changing a cap must not
 * decode assets again, recreate a fixture, change a draft or start audio. */
export function startPreviewMotion({
  own,
  draw,
  motion,
  preferences = null,
  window: host = globalThis,
}) {
  let alive = true,
    initialized = false,
    reduced = false,
    frame = null,
    generation = 0,
    last = host.performance.now(),
    stopPreferences = () => {};
  const cancelFrame = () => {
    if (frame !== null) host.cancelAnimationFrame(frame);
    frame = null;
  };
  const dispose = () => {
    if (!alive) return;
    alive = false;
    generation++;
    cancelFrame();
    stopPreferences();
  };
  own(dispose);
  if (!alive) return dispose;
  const tick = (now, expected) => {
    if (!alive || generation !== expected) return;
    frame = null;
    const playing = motion === 'playing' && !reduced;
    const elapsed = playing ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0;
    last = now;
    draw(elapsed, reduced);
    if (alive && generation === expected && playing)
      frame = host.requestAnimationFrame((next) => tick(next, expected));
  };
  const update = (snapshot) => {
    if (!alive) return;
    const next = motion === 'reduced' || snapshot.effectiveReducedEffects === true;
    if (initialized && reduced === next) return;
    initialized = true;
    reduced = next;
    generation++;
    cancelFrame();
    last = host.performance.now();
    tick(last, generation);
  };
  try {
    if (preferences) {
      // The shared authority subscribes synchronously. Repeated text-only
      // changes are filtered by update and cannot restart this frame clock.
      stopPreferences = preferences.subscribe(update);
      if (!initialized) update(preferences.snapshot());
    } else {
      // Standalone preview callers retain a live system-motion policy too.
      let media;
      try {
        media = host.matchMedia?.('(prefers-reduced-motion: reduce)');
      } catch {
        // The local inspection choice remains usable without this capability.
      }
      const changed = () => update({ effectiveReducedEffects: media?.matches === true });
      if (media?.addEventListener) {
        media.addEventListener('change', changed);
        stopPreferences = () => media.removeEventListener('change', changed);
      } else if (media?.addListener) {
        media.addListener(changed);
        stopPreferences = () => media.removeListener(changed);
      }
      changed();
    }
    // A synchronous initial draw may already have retired its owner.
    if (!alive) stopPreferences();
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
}
