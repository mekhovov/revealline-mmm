/** Fade only an already composited frame. No raw art, simulation or timers. */
export function createDemoSceneTransition(canvas, doc) {
  const veil = doc.createElement('canvas');
  veil.className = 'demo-scene-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.hidden = true;
  canvas.parentElement.append(veil);
  let departing = 1,
    arriving = 1,
    loading = false;
  const ease = (x) => x * x * (3 - 2 * x);
  function clear() {
    loading = false;
    departing = arriving = 1;
    veil.hidden = true;
    veil.width = veil.height = 0;
    canvas.style.opacity = '1';
  }
  return {
    begin(frame = canvas) {
      // Keep the current fade on repeated fallback/loading notifications.
      if (loading) return;
      loading = true;
      if (departing < 1) {
        arriving = 0;
        canvas.style.opacity = '0';
        return;
      }
      departing = 0;
      arriving = 0;
      veil.width = canvas.width;
      veil.height = canvas.height;
      try {
        const context = veil.getContext('2d');
        if (context) {
          context.globalAlpha = Number(canvas.style.opacity || 1);
          context.drawImage(frame, 0, 0, canvas.width, canvas.height);
        }
      } catch {
        veil.width = veil.height = 0;
      }
      veil.hidden = false;
      veil.style.opacity = '1';
      canvas.style.opacity = '0';
    },
    ready() {
      loading = false;
      arriving = 0;
    },
    paint(seconds, reduced = false) {
      if (departing === 1 && (loading || arriving === 1)) return;
      const dt = Math.max(0, Math.min(seconds, 0.1));
      departing = Math.min(1, departing + dt / (reduced ? 0.12 : 0.45));
      veil.style.opacity = String(1 - ease(departing));
      if (departing === 1 && !veil.hidden) {
        veil.hidden = true;
        veil.width = veil.height = 0;
      }
      if (!loading && departing === 1)
        arriving = Math.min(1, arriving + dt / (reduced ? 0.12 : 0.55));
      canvas.style.opacity = String(loading ? 0 : ease(arriving));
    },
    clear,
    resourceSnapshot() {
      const pixels = (veil.width || 0) * (veil.height || 0);
      return {
        canvases: Number(pixels > 0),
        pixels,
        rgbaBytesEstimate: pixels * 4,
        loading,
      };
    },
    dispose() {
      clear();
      veil.remove();
    },
  };
}
