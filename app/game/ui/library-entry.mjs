import { t } from '../i18n/index.mjs';
import { createOperationStatus } from './operation-status.mjs';

/** Defers only the existing optional Library UI; data and public dialogs stay host-owned. */
export function attachLibraryEntry({
  document,
  window,
  api,
  admit,
  load = () => import('./library-panel.mjs'),
}) {
  const $ = (id) => document.getElementById(id);
  let owner = null,
    loading = null,
    pending = null,
    disposed = false,
    constructionFailure = null;
  const feedback = new Map();
  const foreground = () => !document.hidden && document.hasFocus?.() !== false;
  const retire = () => {
    const previous = pending;
    pending = null;
    previous?.controller.abort();
    previous?.presenter.clear();
    unobserve();
  };
  const statusFor = (dialog) => {
    let status = feedback.get(dialog);
    if (!status) {
      const target = document.createElement('p');
      target.id = `${dialog.id}-entry-status`;
      const heading = dialog.querySelector('h2');
      if (heading) heading.after(target);
      else dialog.append(target);
      status = createOperationStatus(target);
      feedback.set(dialog, status);
    }
    return status;
  };
  const readModule = () => {
    if (!loading)
      loading = Promise.resolve()
        .then(load)
        .catch((error) => {
          loading = null; // A new explicit public visit may retry a failed import.
          throw error;
        });
    return loading;
  };
  async function demand(kind, argument) {
    if (disposed || !foreground()) return false;
    if (owner) {
      retire();
      return kind === 'library' ? owner.open(argument) : owner.populateGallery(argument);
    }
    retire();
    api.pause(); // Required before main admission: never wait behind our own active flight.
    const dialog = $(kind === 'library' ? 'library-dialog' : 'collection-dialog');
    if (kind === 'library') {
      for (const name of ['scores', 'saves', 'packs', 'challenges'])
        $(`library-${name}`).hidden = true;
      if (!dialog.open) dialog.showModal();
    }
    if (!dialog.open) return false; // The host owns the actual Collection visit.
    const controller = new AbortController();
    const ticket = { dialog, controller, presenter: statusFor(dialog), status: null };
    observe();
    const current = () =>
      !disposed &&
      pending === ticket &&
      !controller.signal.aborted &&
      dialog.isConnected &&
      dialog.open &&
      foreground();
    pending = ticket;
    ticket.status = ticket.presenter.begin({
      message: () => t('interface:preparing'),
      isCurrent: current,
    });
    try {
      if (constructionFailure) throw constructionFailure;
      const module = await waitForModule(controller.signal);
      if (!current()) return false;
      await admit(
        () => {
          if (!current()) return;
          try {
            owner = module.attachLibraryPanel(api);
            if (disposed) owner.dispose();
            else bindEntryControls();
          } catch (error) {
            constructionFailure = error; // Never repeat a partially constructed owner.
            bindEntryControls(); // Partial construction cannot replace the guarded public entry.
            throw error;
          }
        },
        { signal: controller.signal, eligible: current },
      );
      if (!current() || !owner) return false;
      ticket.status.clear();
      pending = null;
      unobserve();
      return kind === 'library' ? owner.open(argument) : owner.populateGallery(argument);
    } catch (error) {
      if (current())
        ticket.status.finish({
          message: error instanceof Error ? error.message : '',
          state: 'error',
        });
      return false;
    }
  }
  const closed = (event) => {
    if (pending?.dialog === event.currentTarget && !pending.dialog.open) retire();
  };
  const hidden = () => {
    if (document.hidden) retire();
  };
  const library = $('library-dialog'),
    collection = $('collection-dialog');
  let observing = false;
  function observe() {
    if (observing) return;
    observing = true;
    library.addEventListener('close', closed);
    collection.addEventListener('close', closed);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', retire);
    window.addEventListener('pagehide', retire);
  }
  function unobserve() {
    if (!observing) return;
    observing = false;
    library.removeEventListener('close', closed);
    collection.removeEventListener('close', closed);
    document.removeEventListener('visibilitychange', hidden);
    window.removeEventListener('blur', retire);
    window.removeEventListener('pagehide', retire);
  }
  async function waitForModule(signal) {
    let cancel;
    const aborted = new Promise((_, reject) => {
      cancel = () => reject(new DOMException('Cancelled.', 'AbortError'));
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) cancel();
    });
    try {
      return await Promise.race([readModule(), aborted]);
    } finally {
      signal.removeEventListener('abort', cancel);
    }
  }
  const entry = {
    open: (panel = 'scores') => demand('library', panel),
    populateGallery: (opener) => demand('collection', opener),
    refresh: () => owner?.refresh(),
    refreshMasteries: () => owner?.refreshMasteries(),
    cancelAttemptExport: () => owner?.cancelAttemptExport() ?? false,
    dispose() {
      if (disposed) return;
      retire();
      disposed = true;
      for (const status of feedback.values()) status.dispose();
      owner?.dispose();
    },
  };
  function bindEntryControls() {
    $('library-button').onclick = () => entry.open();
    for (const button of document.querySelectorAll('[data-library-panel]'))
      button.onclick = () => entry.open(button.dataset.libraryPanel);
  }
  bindEntryControls();
  return entry;
}
