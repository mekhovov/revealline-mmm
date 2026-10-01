// The dedicated game has campaign music and normal volume controls only.
export function attachSoundtrackPanel({ document: doc = globalThis.document } = {}) {
  const element = doc.createElement('div');
  element.hidden = true;
  return Object.freeze({
    element,
    isOpen: () => false,
    open: async () => false,
    close() {},
    update() {},
    dispose() { element.remove?.(); },
  });
}
