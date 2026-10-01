// Runs after visible loading feedback, before the native setup controls are parsed.
// Module loading must not replace a
// native choice, including a deliberate choice equal to the markup default.
(() => {
  const host = globalThis,
    doc = host.document;
  let live = true,
    claimed = false,
    changed = false,
    value,
    difficultyChanged = false,
    difficultyValue;
  const selected = (event) => {
    if (!live) return;
    if (event.target?.id === 'coop-level') {
      claimed = true;
      changed = true;
      value = event.target.value;
    } else if (event.target?.id === 'coop-difficulty') {
      difficultyChanged = true;
      difficultyValue = event.target.value;
    }
  };
  const claim = (event) => {
    if (!live || event.target?.id !== 'coop-level') return;
    if (event.type === 'keydown') {
      if (event.ctrlKey || event.metaKey || event.isComposing) return;
      if (event.altKey && !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      if (
        ![
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Home',
          'End',
          'PageUp',
          'PageDown',
          'Enter',
          'F4',
          ' ',
          'Spacebar',
        ].includes(event.key) &&
        !(typeof event.key === 'string' && event.key.length === 1)
      )
        return;
    } else if (event.button !== 0 || event.isPrimary === false) return;
    // Opening and cancelling a native selector is ownership, not a saved edit.
    claimed = true;
  };
  const retire = () => {
    live = false;
    doc.removeEventListener('input', selected, true);
    doc.removeEventListener('change', selected, true);
    doc.removeEventListener('pointerdown', claim, true);
    doc.removeEventListener('click', claim, true);
    doc.removeEventListener('keydown', claim, true);
    host.removeEventListener('pagehide', departed);
  };
  const departed = (event) => {
    if (!event.persisted) retire();
  };
  doc.addEventListener('input', selected, true);
  doc.addEventListener('change', selected, true);
  doc.addEventListener('pointerdown', claim, true);
  doc.addEventListener('click', claim, true);
  doc.addEventListener('keydown', claim, true);
  host.addEventListener('pagehide', departed);
  host.RevealLineTeamEntry = Object.freeze({
    take() {
      if (!live) return null;
      retire();
      return Object.freeze({
        claimed,
        changed,
        value,
        difficulty: Object.freeze({ changed: difficultyChanged, value: difficultyValue }),
      });
    },
  });
})();
