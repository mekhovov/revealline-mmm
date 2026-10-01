import { t } from '../i18n/index.mjs';

/** Optional browser fullscreen. The demo's viewport layout never depends on it. */
export function attachDemoFullscreen({ document: doc = globalThis.document, dialog, button }) {
  if (!dialog || !button) return null;
  const target = doc.documentElement;
  const supported =
    !!doc.fullscreenEnabled &&
    typeof target?.requestFullscreen === 'function' &&
    typeof doc.exitFullscreen === 'function';
  let disposed = false;
  let pending = null;
  let exiting = false;
  let owned = false;
  let generation = 0;
  let denied = false;
  const isOwned = () => owned && doc.fullscreenElement === target;
  function refresh() {
    if (disposed) return;
    if (owned && doc.fullscreenElement !== target) owned = false;
    // A pre-existing fullscreen session belongs to its original owner.
    button.hidden = !supported || (!!doc.fullscreenElement && !isOwned());
    button.disabled = !!pending || exiting;
    const label = t(isOwned() ? 'demo:exitFullscreen' : 'demo:enterFullscreen');
    button.textContent = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(isOwned()));
    button.title = denied ? t('demo:fullscreenUnavailable') : label;
  }
  async function exitOwned() {
    if (!isOwned() || exiting) return;
    exiting = true;
    refresh();
    try {
      await doc.exitFullscreen();
    } catch {
      // Browser rejection leaves the viewport layout and explicit Back intact.
    }
    if (doc.fullscreenElement !== target) owned = false;
    exiting = false;
    refresh();
  }
  async function release() {
    generation++;
    await exitOwned();
    refresh();
  }
  function changed() {
    if (pending && doc.fullscreenElement === target && !pending.entered) {
      pending.entered = true;
      owned = true;
    } else if (doc.fullscreenElement !== target) {
      if (pending?.entered) pending.revoked = true;
      owned = false;
    }
    refresh();
  }
  async function activate() {
    if (disposed || !dialog.open || pending || exiting || !supported) return;
    if (isOwned()) {
      await exitOwned();
      return;
    }
    if (doc.fullscreenElement) return;
    const request = { generation, entered: false };
    pending = request;
    refresh();
    try {
      // Dialog elements themselves cannot be fullscreen targets.
      await target.requestFullscreen({ navigationUI: 'hide' });
      if (!request.revoked && doc.fullscreenElement === target) {
        request.entered = true;
        owned = true;
      }
      denied = false;
      if (disposed || !dialog.open || request.generation !== generation) await exitOwned();
    } catch {
      denied = true;
    } finally {
      if (pending === request) pending = null;
      refresh();
    }
  }
  const click = () => activate();
  const close = () => release();
  button.addEventListener('click', click);
  dialog.addEventListener('close', close);
  doc.addEventListener('fullscreenchange', changed);
  refresh();
  return {
    refresh,
    release,
    async dispose() {
      if (disposed) return;
      disposed = true;
      button.removeEventListener('click', click);
      dialog.removeEventListener('close', close);
      doc.removeEventListener('fullscreenchange', changed);
      await release();
    },
  };
}
