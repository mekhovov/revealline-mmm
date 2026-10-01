/** A wake lock is a best-effort lease, never a prerequisite for a game or audio gesture. */
export function createGameWakeLock({
  navigator: nav = globalThis.navigator,
  document: doc = globalThis.document,
  channel = globalThis.BroadcastChannel
    ? new BroadcastChannel('revealline-mmm.game-activity.v1')
    : null,
} = {}) {
  // Node's host-test adapter exposes BroadcastChannel; it must not keep a test process alive.
  channel?.unref?.();
  let active = false,
    sentinel = null,
    pending = false,
    attempted = false,
    disposed = false;
  const owner = globalThis.crypto?.randomUUID?.() || `game-${Date.now()}-${Math.random()}`;
  if (channel)
    channel.onmessage = (event) => {
      if (event.data?.probe) channel.postMessage({ active: active && !doc.hidden, owner });
    };
  async function update() {
    if (disposed || !active || doc.hidden) {
      const previous = sentinel;
      sentinel = null;
      await previous?.release?.().catch(() => {});
      return;
    }
    if (pending || sentinel || attempted || !nav?.wakeLock?.request) return;
    pending = true;
    attempted = true;
    try {
      const lease = await nav.wakeLock.request('screen');
      if (disposed || !active || doc.hidden) await lease.release();
      else {
        sentinel = lease;
        lease.addEventListener?.('release', () => {
          if (sentinel === lease) sentinel = null;
        });
      }
    } catch {
      /* Denied or unavailable wake locks do not change gameplay. */
    } finally {
      pending = false;
    }
  }
  const visibility = () => {
    attempted = false;
    channel?.postMessage({ active: active && !doc.hidden, owner });
    void update();
  };
  doc?.addEventListener('visibilitychange', visibility);
  return {
    setActive(value) {
      if (disposed) return;
      value = Boolean(value);
      if (value === active) return;
      active = value;
      attempted = false;
      channel?.postMessage({ active, owner });
      void update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active = false;
      doc?.removeEventListener('visibilitychange', visibility);
      channel?.postMessage({ active: false, owner });
      channel?.close();
      void update();
    },
  };
}
