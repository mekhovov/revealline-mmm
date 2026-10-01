import { t, localizedText, localizedAttribute, formatNumber } from '../i18n/index.mjs';
const terminalStates = new Set(['ready', 'error', 'cancelled', 'detached']);
const progressMessages = Object.freeze({
  files: 'common:progress.files',
  tracks: 'common:progress.tracks',
  chapters: 'common:progress.chapters',
  ticks: 'common:progress.ticks',
});

function checkedProgress(value) {
  if (value == null) return null;
  const { completed, total, unit } = value;
  if (
    !Number.isFinite(completed) ||
    !Number.isFinite(total) ||
    completed < 0 ||
    total <= 0 ||
    completed > total ||
    typeof unit !== 'string' ||
    !unit.trim()
  )
    throw new TypeError(t('interface:operationProgressNeedsAMeasuredCompletedTotalCountAndUnit'));
  return { completed, total, unit };
}

/** Owns status DOM, never the operation, its cancellation, focus or durable writes. */
export function createOperationStatus(target, { isCurrent: hostCurrent = () => true } = {}) {
  const doc = target.ownerDocument;
  const signal = doc.createElement('span');
  signal.className = 'operation-status-signal';
  signal.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) signal.append(doc.createElement('i'));
  const label = doc.createElement('span');
  label.className = 'operation-status-label';
  label.setAttribute('role', 'status');
  label.setAttribute('aria-live', 'polite');
  label.setAttribute('aria-atomic', 'true');
  const meter = doc.createElement('progress');
  meter.className = 'operation-status-progress';
  const count = doc.createElement('span');
  count.className = 'operation-status-count';
  count.setAttribute('aria-hidden', 'true');
  target.classList.add('operation-status');
  // Only meaningful message changes are live. Numeric updates remain available
  // through the native progress control without repeatedly interrupting speech.
  target.removeAttribute('role');
  target.removeAttribute('aria-live');
  target.removeAttribute('aria-atomic');
  target.removeAttribute('aria-busy');
  target.replaceChildren(signal, label, meter, count);
  let generation = 0;
  let disposed = false;
  const reset = () => {
    target.hidden = true;
    localizedText(label, () => '');
    localizedText(count, () => '');
    meter.hidden = count.hidden = true;
    delete target.dataset.state;
    delete target.dataset.stage;
  };
  reset();
  function begin({ message, stage = 'preparing', progress = null, isCurrent = () => true }) {
    const initialProgress = checkedProgress(progress);
    const ticket = ++generation;
    const current = () => !disposed && ticket === generation && hostCurrent() && isCurrent();
    const update = (options = {}) => {
      if (!current()) return false;
      const next = Object.hasOwn(options, 'progress')
        ? checkedProgress(options.progress)
        : undefined;
      if (options.message !== undefined) localizedText(label, options.message);
      if (options.stage !== undefined) target.dataset.stage = String(options.stage);
      if (next !== undefined) {
        meter.hidden = count.hidden = next === null;
        if (!next) localizedText(count, () => '');
        if (next) {
          meter.max = next.total;
          meter.value = next.completed;
          const text = () =>
            progressMessages[next.unit]
              ? t(progressMessages[next.unit], {
                  count: next.total,
                  completed: formatNumber(next.completed),
                  total: formatNumber(next.total),
                })
              : `${formatNumber(next.completed)} / ${formatNumber(next.total)} ${next.unit}`;
          localizedAttribute(meter, 'aria-label', text);
          localizedText(count, text);
        }
      }
      target.hidden = false;
      return true;
    };
    if (current()) {
      target.dataset.state = 'busy';
      update({ message, stage, progress: initialProgress });
    }
    return {
      update,
      finish({ message = '', state = 'ready' } = {}) {
        if (!current()) return false;
        if (!terminalStates.has(state)) throw new TypeError(t('interface:unknownOperationOutcome'));
        update({ message, progress: null });
        target.dataset.state = state;
        target.hidden = !message;
        // Detached observation can later reconcile the actual durable outcome.
        // Only a new lease or explicit cleanup revokes this lease's DOM access.
        return true;
      },
      clear() {
        if (!current()) return false;
        generation++;
        reset();
        return true;
      },
    };
  }
  return {
    begin,
    clear() {
      generation++;
      reset();
    },
    dispose() {
      disposed = true;
      generation++;
      reset();
    },
  };
}
