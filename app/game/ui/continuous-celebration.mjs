import { createCelebration, celebrationFrame, drawCelebration } from './celebration.mjs';

/** The same core confetti renderer, with no input, audio or gameplay ownership. */
export function mountContinuousCelebration({
  document: doc = globalThis.document,
  parent = doc.body,
  controller,
  reduced = () => false,
  theme = () => ({ family: 'fpv' }),
  seed = () => 0,
} = {}) {
  const canvas = doc.createElement('canvas');
  canvas.className = 'continuous-celebration';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '30',
  });
  parent.append(canvas);
  let context;
  try {
    context = canvas.getContext('2d');
  } catch {
    /* Headless/static hosts keep the textual celebration. */
  }
  let identity, state;
  const stop = controller.subscribe((value) => {
    canvas.hidden = value.outcome !== 'won' || value.phase !== 'celebration' || reduced();
    if (canvas.hidden || !context) return;
    if (identity !== value.identity) {
      identity = value.identity;
      state = createCelebration({ theme: theme(), seed: seed(), levelId: String(identity ?? '') });
    }
    canvas.width = doc.defaultView?.innerWidth || parent.clientWidth || 768;
    canvas.height = doc.defaultView?.innerHeight || parent.clientHeight || 576;
    state.elapsed = Math.max(0, state.duration - value.remainingMs / 1000);
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawCelebration(
      context,
      celebrationFrame(state),
      { accent: '#eac15d', safe: '#b9d995', paper: '#fff4dc', danger: '#e37b6d' },
      canvas.width,
      canvas.height,
    );
  });
  return {
    dispose() {
      stop();
      canvas.remove();
    },
  };
}
