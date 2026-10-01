/** A lazy menu request owns only the input turn that opened it. Arm after that
 * event finishes so its own bubbling click/Enter is not mistaken for a newer
 * action. Never consume input or prevent a newer screen from handling it. */
export function trackMissionLibraryOpening({ document: doc = globalThis.document, onRetire }) {
  const origin = doc.activeElement;
  let retired = false,
    disposed = false,
    armed = false,
    claimed = false;
  const inputs = ['keydown', 'pointerdown', 'click'];
  function dispose() {
    disposed = true;
    if (!armed) return;
    doc.removeEventListener('focusin', focusChanged, true);
    for (const type of inputs) doc.removeEventListener(type, retire, true);
    armed = false;
  }
  function retire() {
    if (retired || disposed) return;
    retired = true;
    dispose();
    onRetire?.();
  }
  function focusChanged() {
    if (!claimed && doc.activeElement !== origin) retire();
  }
  queueMicrotask(() => {
    if (disposed) return;
    armed = true;
    if (!claimed) doc.addEventListener('focusin', focusChanged, true);
    for (const type of inputs) doc.addEventListener(type, retire, true);
    focusChanged();
  });
  const current = () => !retired && (claimed || doc.activeElement === origin);
  return {
    current,
    claim: () => {
      if (!current()) return false;
      claimed = true;
      if (armed) doc.removeEventListener('focusin', focusChanged, true);
      return true;
    },
    dispose,
  };
}
