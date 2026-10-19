import { exportJSONFile } from '../platform.mjs';
import { localizedText, t } from '../i18n/index.mjs';
import { platformExportText } from './export-copy.mjs';

/** A terminal export is an offer, not proof that the browser saved a file.
 * Retain the exact compact JSON before requesting the platform download. */
export function attachTerminalRecordingExport({
  document: doc = globalThis.document,
  container,
  status,
  getOwner,
  isTerminal,
  exportFile = exportJSONFile,
  getClipboard = () => globalThis.navigator?.clipboard,
}) {
  const details = doc.createElement('details'),
    summary = doc.createElement('summary'),
    help = doc.createElement('p'),
    label = doc.createElement('label'),
    labelText = doc.createElement('span'),
    output = doc.createElement('textarea'),
    actions = doc.createElement('div'),
    copy = doc.createElement('button'),
    select = doc.createElement('button'),
    copyStatus = doc.createElement('p');
  details.className = 'terminal-recording-export';
  summary.id = `${container.id}-toggle`;
  output.id = `${container.id}-json`;
  output.readOnly = true;
  output.rows = 5;
  output.spellcheck = false;
  copy.id = `${container.id}-copy`;
  select.id = `${container.id}-select`;
  copy.type = select.type = 'button';
  copyStatus.setAttribute('role', 'status');
  localizedText(summary, () => t('interface:recording.copyDetails'));
  localizedText(labelText, () => t('interface:recording.copyLabel'));
  localizedText(copy, () => t('interface:recording.copy'));
  localizedText(select, () => t('interface:recording.select'));
  label.append(labelText, output);
  actions.append(copy, select);
  details.append(summary, help, label, actions, copyStatus);
  container.append(details);
  container.hidden = true;
  let owner = null,
    pending = null,
    copyGeneration = 0,
    disposed = false;
  const current = (value) => !disposed && getOwner() === value && isTerminal(value);
  function reset() {
    pending = null;
    copyGeneration++;
    owner = null;
    output.value = '';
    localizedText(status, '');
    localizedText(copyStatus, '');
    details.open = false;
    container.hidden = true;
  }
  const copyJSON = async () => {
    if (!current(owner) || !output.value) return;
    const originalOwner = owner,
      text = output.value,
      generation = ++copyGeneration;
    try {
      const clipboard = getClipboard();
      if (!clipboard?.writeText) throw new Error('Clipboard unavailable.');
      // Invoke within the deliberate click's activation; never copy on export.
      await clipboard.writeText(text);
      if (current(originalOwner) && generation === copyGeneration)
        localizedText(copyStatus, () => t('interface:recording.copied'));
    } catch {
      if (current(originalOwner) && generation === copyGeneration)
        localizedText(copyStatus, () => t('interface:recording.copyUnavailable'));
    }
  };
  const selectJSON = () => {
    if (!current(owner) || !output.value) return;
    copyGeneration++;
    output.focus({ preventScroll: true });
    output.select();
    localizedText(copyStatus, () => t('interface:recording.selected'));
  };
  copy.addEventListener('click', copyJSON);
  select.addEventListener('click', selectJSON);
  return {
    refresh() {
      if (!disposed && owner && !current(owner)) reset();
    },
    async request(value, recorder, filename) {
      if (!current(value) || pending?.owner === value) return;
      if (owner !== value) reset();
      owner = value;
      const operation = { owner: value };
      pending = operation;
      const active = () => current(value) && pending === operation;
      localizedText(status, () => t('interface:recording.preparing'));
      try {
        const recording = await recorder.snapshot(value);
        if (!active()) return;
        // Match exportJSONFile's bytes, including its absence of pretty-printing.
        output.value = JSON.stringify(recording);
        localizedText(help, () => t('interface:recording.copyHelp', { filename }));
        localizedText(copyStatus, '');
        details.open = true;
        container.hidden = false;
        let result;
        try {
          result = await exportFile(recording, filename);
        } catch {
          if (active()) localizedText(status, () => t('interface:recording.exportFailed'));
          return;
        }
        if (active()) localizedText(status, () => platformExportText(result));
      } catch (error) {
        if (active()) localizedText(status, () => error.message);
      } finally {
        if (pending === operation) pending = null;
      }
    },
    dispose() {
      if (disposed) return;
      reset();
      disposed = true;
      copy.removeEventListener('click', copyJSON);
      select.removeEventListener('click', selectJSON);
      details.remove();
    },
  };
}
