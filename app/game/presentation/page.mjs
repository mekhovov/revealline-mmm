import { localizedMessage } from '../i18n/index.mjs';
import { createPresentationHost } from './host.mjs';

// One cosmetic release loader per document, regardless of board or module count.
// Uploaded media, authoring drafts, player libraries and run state never enter here.
const pages = new WeakMap();

export function mountPresentationPage({
  document: doc = globalThis.document,
  window: win = doc?.defaultView ?? globalThis.window,
  createHost = createPresentationHost,
  onError = () => {},
  onStatus = () => {},
} = {}) {
  if (!doc?.documentElement) throw new TypeError('Presentation needs a page document.');
  let page = pages.get(doc);
  if (!page) {
    page = {
      host: null,
      snapshot: null,
      error: null,
      status: {
        status: 'preparing',
        stage: 'reading',
        progress: null,
        message: localizedMessage('interface:presentation.loadingRelease'),
      },
      closed: false,
      leases: new Set(),
      painters: new Map(),
    };
    pages.set(doc, page);
    const applyPainter = (painter, binding) => {
      if (page.snapshot && (painter.presentation ?? null) === binding.before)
        painter.setPresentation(page.snapshot);
    };
    page.applyPainter = applyPainter;
    page.report = (status) => {
      if (page.closed) return;
      page.status = status;
      for (const lease of page.leases) {
        if (page.status !== status || page.closed) break;
        lease.report(status);
      }
    };
    page.dispose = () => {
      if (page.closed) return;
      page.closed = true;
      for (const lease of [...page.leases]) lease.close();
      page.host?.close();
      win?.removeEventListener?.('pagehide', page.pagehide);
      if (pages.get(doc) === page) pages.delete(doc);
    };
    page.pagehide = (event) => {
      if (!event.persisted) page.dispose();
    };
    win?.addEventListener?.('pagehide', page.pagehide);
    // A failed initial load may be retried explicitly. All live leases share the
    // pending operation; accepted snapshots and their resource leases never reload.
    page.load = () => {
      if (page.closed) return Promise.resolve(null);
      if (page.pending || page.snapshot) return page.ready;
      const operation = {};
      page.pending = operation;
      page.error = null;
      const current = () => !page.closed && page.pending === operation;
      // Defer host creation until the lease and this promise are registered.
      const ready = Promise.resolve()
        .then(() => {
          if (!current()) return null;
          page.host = createHost({ document: doc });
          return page.host.load({
            onStatus: (status) => {
              // Readiness additionally includes applying the accepted snapshot.
              if (current() && status.status !== 'ready' && status.status !== 'error')
                page.report(status);
            },
          });
        })
        .then((snapshot) => {
          if (!current()) return null;
          if (!snapshot) {
            page.host?.close();
            page.host = null;
            return null;
          }
          page.host.apply(doc.documentElement);
          if (!current()) return null;
          page.snapshot = snapshot;
          for (const [painter, binding] of page.painters) applyPainter(painter, binding);
          page.report({
            status: 'ready',
            stage: 'ready',
            progress: null,
            message: localizedMessage('interface:presentation.releaseReady'),
          });
          return page.closed ? null : snapshot;
        })
        .catch((error) => {
          if (!current()) return null;
          for (const [painter, binding] of page.painters)
            if (page.snapshot && painter.presentation === page.snapshot)
              painter.setPresentation(binding.before);
          page.snapshot = null;
          page.host?.close();
          page.host = null;
          if (error.name === 'AbortError') return null;
          page.error = error;
          // Status/error observers may deliberately retry. Retire this owner
          // first, and do not send old errors after a replacement begins.
          page.pending = null;
          page.report({
            status: 'error',
            stage: 'error',
            progress: null,
            message: localizedMessage('interface:presentation.releaseUnavailable', {
              error: error.message,
            }),
          });
          for (const lease of page.leases) {
            if (page.ready !== ready || page.closed) break;
            lease.notify(error);
          }
          return null;
        })
        .finally(() => {
          if (page.pending === operation) page.pending = null;
        });
      page.ready = ready;
      page.report({
        status: 'preparing',
        stage: 'reading',
        progress: null,
        message: localizedMessage('interface:presentation.loadingRelease'),
      });
      return ready;
    };
    page.load();
  }
  let closed = false;
  const bindings = new Set();
  const pictureReads = new Set();
  const lease = {
    get ready() {
      return page.ready;
    },
    retry() {
      return closed || page.closed ? Promise.resolve(null) : page.load();
    },
    current: () => (closed || page.closed ? null : page.snapshot),
    report(status) {
      if (closed || page.closed) return;
      try {
        onStatus(status);
      } catch {}
    },
    readAudio(slot, options) {
      if (closed || page.closed || !page.host)
        return Promise.reject(new Error('Presentation page is closed.'));
      return page.host.readAudio(slot, options);
    },
    async readPicture(slot, options = {}) {
      if (closed || page.closed || !page.host) throw new Error('Presentation page is closed.');
      const controller = new AbortController(),
        abort = () => controller.abort();
      pictureReads.add(controller);
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) abort();
      try {
        const original = await page.host.readPicture(slot, {
          ...options,
          snapshot: options.snapshot ?? page.snapshot,
          signal: controller.signal,
          onStatus(status) {
            if (closed || page.closed || controller.signal.aborted) return;
            try {
              options.onStatus?.(status);
            } catch {}
          },
        });
        if (closed || page.closed || controller.signal.aborted)
          throw new DOMException('Picture page lease closed.', 'AbortError');
        return original;
      } finally {
        options.signal?.removeEventListener('abort', abort);
        pictureReads.delete(controller);
      }
    },
    notify(error) {
      if (!closed) {
        try {
          onError(error);
        } catch {
          // A display notice must not affect playback or page cleanup.
        }
      }
    },
    bindPainter(painter) {
      if (closed || page.closed) return () => {};
      if (typeof painter?.setPresentation !== 'function')
        throw new TypeError('Presentation needs a compatible painter.');
      let binding = page.painters.get(painter);
      if (!binding) {
        binding = { before: painter.presentation ?? null, users: 0 };
        page.painters.set(painter, binding);
      }
      binding.users++;
      page.applyPainter(painter, binding);
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        bindings.delete(release);
        if (--binding.users > 0) return;
        if (page.snapshot && painter.presentation === page.snapshot)
          painter.setPresentation(binding.before);
        page.painters.delete(painter);
      };
      bindings.add(release);
      return release;
    },
    close() {
      if (closed) return;
      closed = true;
      for (const controller of pictureReads) controller.abort();
      for (const release of [...bindings]) release();
      page.leases.delete(lease);
      if (!page.leases.size) page.dispose();
    },
  };
  page.leases.add(lease);
  lease.report(page.status);
  if (page.error) lease.notify(page.error);
  return Object.freeze(lease);
}
