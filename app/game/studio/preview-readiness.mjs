/** A slow boot is a warning, not a terminal failure. Keep observing only the
 * owned preview until it settles or its caller closes/replaces/disposes it.
 * A practice host may opt into post-ready failure monitoring; readiness is
 * announced once while the same document remains owned. */
export function observePreviewReadiness({
  readDocument,
  expectedURL,
  isCurrent,
  notify,
  watchPractice = false,
  now = Date.now,
  schedule = setInterval,
  cancel = clearInterval,
}) {
  const deadline = now() + 20000;
  let stopped = false,
    warned = false,
    ready = false,
    timer;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancel(timer);
  };
  timer = schedule(() => {
    if (stopped) return;
    if (!isCurrent()) return stop();
    let document;
    try {
      document = readDocument();
    } catch {
      // A navigating/inaccessible frame cannot establish readiness.
    }
    const owned = document?.URL === expectedURL ? document.documentElement?.dataset : null;
    const state = owned?.bootState;
    if (state === 'failed' || (watchPractice && owned?.practiceRenderState === 'failed')) {
      stop();
      notify('failed');
    } else if (state === 'ready' && !ready) {
      ready = true;
      if (!watchPractice) stop();
      notify('ready');
    } else if (!ready && !warned && now() >= deadline) {
      warned = true;
      notify('slow');
    }
  }, 250);
  return stop;
}
