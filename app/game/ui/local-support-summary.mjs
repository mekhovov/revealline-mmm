import { t, localizedText } from '../i18n/index.mjs';
import { collectSupportSummary } from '../local-support-summary.mjs';
import { exportJSONFile } from '../platform.mjs';

const copy = (key, values) => t(`interface:supportSummary.${key}`, values);

/** Explicit local observations with a preview of the exact exported document. */
export function attachLocalSupportSummary({
  document: doc = globalThis.document,
  window: win = globalThis.window,
  root = doc.getElementById('support-summary-root'),
  settings = doc.getElementById('settings-dialog'),
  getHost,
  collect = collectSupportSummary,
  exportFile = exportJSONFile,
} = {}) {
  const node = (tag, id, text) => {
    const element = doc.createElement(tag);
    element.id = `support-summary-${id}`;
    if (text) localizedText(element, text);
    return element;
  };
  const title = node('h3', 'title', () => copy('title')),
    help = node('p', 'help', () => copy('help')),
    prepare = node('button', 'prepare', () => copy('prepare')),
    download = node('button', 'download', () => copy('download')),
    status = node('p', 'status', () => copy('notPrepared')),
    preview = node('section', 'preview'),
    facts = node('dl', 'facts'),
    details = node('details', 'details'),
    output = node('pre', 'json');
  prepare.type = download.type = 'button';
  prepare.className = download.className = 'button secondary';
  download.disabled = true;
  status.setAttribute('role', 'status');
  preview.hidden = true;
  output.style.whiteSpace = 'pre-wrap';
  output.style.overflowWrap = 'anywhere';
  details.append(
    node('summary', 'exact', () => copy('exact')),
    output,
  );
  preview.append(
    facts,
    node('p', 'limits', () => copy('limits')),
    details,
  );
  root.setAttribute('aria-labelledby', title.id);
  root.append(title, help, prepare, download, status, preview);
  let generation = 0,
    active = null,
    report = null,
    exporting = false,
    disposed = false;
  const visible = () =>
    !disposed &&
    settings.open &&
    root.isConnected &&
    !root.closest('[hidden],[inert]') &&
    !doc.hidden &&
    doc.hasFocus?.() !== false;
  function reset() {
    generation++;
    active?.abort();
    active = null;
    report = null;
    download.disabled = true;
    download.setAttribute('aria-busy', String(exporting));
    preview.hidden = true;
    output.textContent = '';
    facts.replaceChildren();
    prepare.setAttribute('aria-busy', 'false');
    localizedText(status, () => copy('notPrepared'));
  }
  function show(value) {
    const row = (label, text) => {
      facts.append(
        node('dt', `label-${label}`, () => copy(label)),
        node('dd', label, text),
      );
    };
    facts.replaceChildren();
    row('captured', () => value.capturedAt ?? copy('unavailable'));
    row('build', () => value.build.version ?? copy('unavailable'));
    row('game', () => copy(`game.${value.game.state}`));
    row('controller', () =>
      value.controller.freshness === 'recent'
        ? copy(`controller.${value.controller.status}`)
        : copy(`freshness.${value.controller.freshness}`),
    );
    row('saving', () =>
      value.game.saving.writable === null
        ? copy('unavailable')
        : copy(value.game.saving.writable ? 'savingAvailable' : 'savingSession'),
    );
    row('retention', () => copy(`retention.${value.storage.retention}`));
    row('storage', () =>
      value.storage.estimate.status === 'observed'
        ? copy('storageEstimate', value.storage.estimate)
        : copy('unavailable'),
    );
    row('offline', () => copy('offlineNotVerified'));
    output.textContent = JSON.stringify(value, null, 2);
    preview.hidden = false;
  }
  async function refresh() {
    if (!visible()) return false;
    reset();
    const version = generation,
      controller = new AbortController();
    active = controller;
    prepare.setAttribute('aria-busy', 'true');
    localizedText(status, () => copy('preparing'));
    try {
      const value = await collect({ host: getHost(), signal: controller.signal });
      if (version !== generation || !visible()) return false;
      report = value;
      show(value);
      download.disabled = exporting;
      localizedText(status, () => copy(exporting ? 'preparedWaiting' : 'prepared'));
      return true;
    } catch {
      if (version === generation && visible()) localizedText(status, () => copy('failed'));
      return false;
    } finally {
      if (version === generation) {
        if (!visible()) reset();
        else {
          active = null;
          prepare.setAttribute('aria-busy', 'false');
        }
      }
    }
  }
  async function downloadReport() {
    if (!visible() || !report || exporting || download.disabled) return false;
    const version = generation,
      value = report;
    exporting = true;
    download.setAttribute('aria-busy', 'true');
    try {
      // Keep native export within the deliberate download action. The existing
      // platform owner handles browser downloads and the iOS share sheet.
      const result = await exportFile(value, 'revealline-local-support-summary.json');
      if (version !== generation || report !== value || !visible()) return false;
      localizedText(status, () =>
        copy(
          result?.status === 'shared'
            ? 'shared'
            : result?.status === 'cancelled'
              ? 'cancelled'
              : result?.status === 'requested'
                ? 'requested'
                : 'exportUnconfirmed',
        ),
      );
      return true;
    } catch {
      if (version === generation && visible()) localizedText(status, () => copy('exportFailed'));
      return false;
    } finally {
      exporting = false;
      download.setAttribute('aria-busy', 'false');
      download.disabled = !report || !visible();
      if (version !== generation && report && visible()) {
        localizedText(status, () => copy('prepared'));
      }
    }
  }
  const closed = () => {
    if (!settings.open) reset();
  };
  const hidden = () => {
    if (doc.hidden) reset();
  };
  const pagehide = (event) => {
    reset();
    if (!event.persisted) destroy();
  };
  function destroy() {
    reset();
    disposed = true;
    prepare.removeEventListener('click', refresh);
    download.removeEventListener('click', downloadReport);
    settings.removeEventListener('close', closed);
    doc.removeEventListener('visibilitychange', hidden);
    win.removeEventListener('pagehide', pagehide);
  }
  prepare.addEventListener('click', refresh);
  download.addEventListener('click', downloadReport);
  settings.addEventListener('close', closed);
  doc.addEventListener('visibilitychange', hidden);
  win.addEventListener('pagehide', pagehide);
  return { refresh, download: downloadReport, destroy };
}
