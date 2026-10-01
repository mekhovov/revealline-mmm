import { localizedText, t } from '../i18n/index.mjs';

const primary = new Set([
  'next-button',
  'retry-button',
  'view-picture',
  'journey-save-options',
  'flight-preparation-cancel',
  // Soundtrack controls are inserted after this anchor asynchronously.
  'start-button',
]);

/** Presentation-only composition of existing controls. Nodes, handlers and
 * launch/save authorities remain owned by their existing hosts. */
export function createEarnedResultLayout({ document, reading, result }) {
  const unit = reading.parentElement,
    actions = unit?.querySelector('.overlay-actions'),
    moved = new Map();
  if (!actions) return { sync() {}, close: () => false, dispose() {} };
  const more = document.createElement('details'),
    summary = document.createElement('summary'),
    content = document.createElement('div');
  more.id = 'earned-result-more';
  more.className = 'earned-result-more';
  more.hidden = true;
  summary.className = 'button secondary';
  localizedText(summary, () => t('common:navigation.more'));
  content.className = 'earned-result-more-content';
  more.append(summary, content);
  actions.append(more);
  let owner = null,
    disposed = false;
  function move(node) {
    if (!node || !unit.contains(node) || moved.has(node) || node === more) return;
    const marker = document.createElement('span');
    marker.hidden = true;
    marker.setAttribute('data-earned-result-anchor', '');
    node.before(marker);
    moved.set(node, marker);
    content.append(node);
  }
  function close({ focus = true } = {}) {
    if (more.hidden || unit.closest('[hidden]') || !more.open) return false;
    more.open = false;
    if (focus) summary.focus({ preventScroll: true });
    return true;
  }
  function restore() {
    for (const [node, marker] of moved) {
      // The existing host can dispose or reparent a control while the
      // disclosure is open. Only restore nodes we still own.
      if (node.parentElement === content) {
        if (marker.isConnected) marker.before(node);
        else node.remove();
      }
      marker.remove();
    }
    moved.clear();
  }
  return {
    sync(active, run) {
      if (disposed) return;
      if (!active) {
        more.open = false;
        restore();
        more.hidden = true;
        delete unit.dataset.earnedResultLayout;
        owner = null;
        return;
      }
      if (owner !== run) more.open = false;
      owner = run;
      unit.dataset.earnedResultLayout = 'true';
      // A reward re-render retires its old save notice, while controls keep
      // their original placeholders until the completed result is dismissed.
      for (const [node, marker] of moved) {
        if (marker.isConnected && node.parentElement === content) continue;
        if (node.parentElement === content) node.remove();
        marker.remove();
        moved.delete(node);
      }
      for (const node of [...actions.children]) {
        if (node === more || node.hasAttribute('data-earned-result-anchor') || primary.has(node.id))
          continue;
        move(node);
      }
      for (const id of ['overlay-footnote', 'journey-reactions']) move(document.getElementById(id));
      move(result.querySelector('.completion-reward-save-note'));
      more.hidden = ![...moved.keys()].some((node) => !node.hidden);
    },
    close,
    dispose() {
      if (disposed) return;
      disposed = true;
      close({ focus: false });
      restore();
      delete unit.dataset.earnedResultLayout;
      more.remove();
    },
  };
}
