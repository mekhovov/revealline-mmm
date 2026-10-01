import { t, localizedText } from '../i18n/index.mjs';

const safeText = (value, limit = 80) =>
  typeof value === 'string' ? value.replace(/[\r\n\t]/g, ' ').slice(0, limit) : undefined;
const number = (value) => (Number.isFinite(value) ? Math.round(value) : null);
const indexes = (value) =>
  Array.isArray(value)
    ? value.filter((index) => Number.isInteger(index) && index >= 0 && index < 64).slice(0, 16)
    : [];
const pad = (value = {}) => ({
  index: number(value.index),
  id: safeText(value.id),
  timestamp: number(value.timestamp),
  mapping: safeText(value.mapping, 24),
  connected: value.connected === true,
  buttonCount:
    Number.isInteger(value.buttonCount) && value.buttonCount >= 0
      ? Math.min(value.buttonCount, 64)
      : null,
  buttons: indexes(value.buttons),
});
const frameSignature = (entry) =>
  JSON.stringify({
    ...entry,
    t: undefined,
    gp: undefined,
    interval: undefined,
    since: undefined,
    samples: undefined,
    raw: entry.raw.map((value) => ({ ...value, timestamp: undefined })),
  });

/** Opt-in, memory-only diagnostics for physical controller acceptance. */
export function attachControllerConfirmTrace({
  document: doc = globalThis.document,
  enabled = false,
  version = 'dev',
  limit = 160,
  getHost = () => doc?.body,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
} = {}) {
  if (!Number.isInteger(limit) || limit < 16 || limit > 1000)
    throw new RangeError(t('errors:controller.confirmTrace.limit'));
  const entries = [],
    listeners = [];
  let panel = null,
    contextOutput = null,
    output = null,
    active = false,
    destroyed = false,
    lastFrameSignature = null,
    context = {};

  const renderOutput = () => {
    if (!output) return;
    const devices = [...(context.raw || [])].sort(
      (left, right) =>
        Number(right.index === context.selected) - Number(left.index === context.selected),
    );
    contextOutput.textContent = `selected:${context.selected ?? '-'} identity:${context.identity || '-'} generation:${context.generation ?? '-'} · focus:${context.focus || '-'} hasFocus:${context.hasFocus ?? '-'} visibility:${context.visibility || '-'} fullscreen:${context.fullscreen ?? '-'} · devices:${devices.length ? devices.map((value) => `${value.index} ${value.id || '-'} mapping:${value.mapping || '-'} buttons:${value.buttonCount ?? '-'}`).join('; ') : '-'}`;
    localizedText(output, () =>
      entries.length
        ? entries
            .slice(-24)
            .map(
              (item) =>
                `${item.t ?? '-'} gp:${item.gp ?? '-'} [${item.buttons.join(',') || '-'}] ${item.phase || '-'} ${item.event || '-'}${item.source ? ` from:${item.source}` : ''}${item.native ? ` native:${item.native}` : ''}${item.trusted !== undefined ? ` trusted:${item.trusted}` : ''}${item.prevented !== undefined ? ` prevented:${item.prevented}` : ''}${item.pointer ? ` pointer:${item.pointer}` : ''}${item.pointerId !== null ? ` pointerId:${item.pointerId}` : ''}${item.primary !== undefined ? ` primary:${item.primary}` : ''}${item.button !== null ? ` button:${item.button}` : ''}${item.target ? ` target:${item.target}` : ''}${item.winner ? ` winner:${item.winner}` : ''}${item.reason ? ` reason:${item.reason}` : ''}${item.selected !== null ? ` selected:${item.selected}/${item.generation ?? '-'}` : ''}${item.raw.length ? ` pads:${item.raw.map((value) => `${value.index}:${value.buttons.join(',') || '-'}`).join(';')}` : ''}${item.interval !== null ? ` dt:${item.interval}` : ''}${item.focus ? ` focus:${item.focus}` : ''}${item.samples > 1 ? ` ×${item.samples}` : ''}`,
            )
            .join('\n')
        : t('interface:controller.confirmTrace.waiting'),
    );
    output.scrollTop = output.scrollHeight;
  };

  function syncHost(host = getHost()) {
    if (!panel) return;
    // Modal dialogs occupy the browser top layer and make body siblings inert.
    // Follow the host's active modal without opening a new focusable overlay.
    const parent = host?.append ? host : doc?.body;
    if (parent && panel.parentElement !== parent) parent.append(panel);
  }

  function record(value = {}) {
    if (!active) return;
    const entry = {
      t: number(value.time),
      gp: number(value.gamepadTimestamp),
      event: safeText(value.event),
      phase: safeText(value.phase),
      buttons: indexes(value.buttons),
      native: safeText(value.nativeEventType),
      target: safeText(value.targetId),
      winner: safeText(value.winner),
      reason: safeText(value.reason),
      transaction: number(value.transactionId),
      selected: number(value.selectedGamepadIndex),
      identity: safeText(value.selectedGamepadIdentity),
      generation: number(value.selectedGamepadGeneration),
      source: safeText(value.sampleSource, 24),
      raw: Array.isArray(value.rawGamepads) ? value.rawGamepads.slice(0, 32).map(pad) : [],
      interval: number(value.pollIntervalMs),
      focus: safeText(value.focusTargetId),
      visibility: safeText(value.visibilityState, 16),
      hasFocus: typeof value.hasFocus === 'boolean' ? value.hasFocus : undefined,
      fullscreen: typeof value.fullscreen === 'boolean' ? value.fullscreen : undefined,
      pointer: safeText(value.pointerType, 16),
      pointerId: number(value.pointerId),
      primary: typeof value.isPrimary === 'boolean' ? value.isPrimary : undefined,
      trusted: typeof value.isTrusted === 'boolean' ? value.isTrusted : undefined,
      button: number(value.button),
      prevented: typeof value.defaultPrevented === 'boolean' ? value.defaultPrevented : undefined,
      since: number(value.time),
      samples: 1,
    };
    const sampled = entry.event === 'frame' || entry.event === 'confirm-sample';
    for (const [input, field] of [
      ['selectedGamepadIndex', 'selected'],
      ['selectedGamepadIdentity', 'identity'],
      ['selectedGamepadGeneration', 'generation'],
      ['rawGamepads', 'raw'],
      ['focusTargetId', 'focus'],
      ['visibilityState', 'visibility'],
      ['hasFocus', 'hasFocus'],
      ['fullscreen', 'fullscreen'],
    ])
      if (Object.hasOwn(value, input) && value[input] !== undefined) context[field] = entry[field];
    const signature = sampled ? frameSignature(entry) : null;
    const previous = entries.at(-1);
    if (signature && signature === lastFrameSignature && previous?.event === entry.event) {
      entry.since = previous.since;
      entry.samples = previous.samples + 1;
      entries[entries.length - 1] = entry;
    } else {
      entries.push(entry);
      if (entries.length > limit) entries.splice(0, entries.length - limit);
    }
    lastFrameSignature = signature;
    syncHost();
    renderOutput();
  }

  function observe(event) {
    if (
      event.type.startsWith('key') &&
      !['Enter', 'NumpadEnter', 'Space'].includes(event.code) &&
      !['Enter', ' '].includes(event.key)
    )
      return;
    record({
      time: now(),
      event: 'native-observed',
      nativeEventType: event.type,
      targetId: event.target?.id,
      focusTargetId: doc?.activeElement?.id,
      visibilityState: doc?.visibilityState,
      hasFocus: doc?.hasFocus?.(),
      fullscreen: Boolean(doc?.fullscreenElement),
      pointerType: event.pointerType,
      pointerId: event.pointerId,
      isPrimary: event.isPrimary,
      isTrusted: event.isTrusted,
      button: event.button,
      defaultPrevented: event.defaultPrevented,
    });
  }

  function setEnabled(value) {
    if (destroyed || active === Boolean(value)) return;
    active = Boolean(value);
    if (!active) {
      for (const remove of listeners.splice(0)) remove();
      entries.length = 0;
      lastFrameSignature = null;
      context = {};
      panel?.remove();
      panel = contextOutput = output = null;
      return;
    }
    if (doc?.body) {
      panel = doc.createElement('aside');
      panel.id = 'controller-confirm-trace';
      panel.className = 'controller-confirm-trace';
      panel.setAttribute('data-controller-diagnostic', '');
      panel.setAttribute('aria-live', 'off');
      const title = doc.createElement('div');
      localizedText(title, () => t('interface:controller.confirmTrace.title', { version }));
      contextOutput = doc.createElement('div');
      contextOutput.id = 'controller-confirm-trace-context';
      output = doc.createElement('pre');
      panel.append(title, contextOutput, output);
      syncHost();
      renderOutput();
    }
    if (doc?.addEventListener) {
      // A settings toggle may enable this after the document Confirm guard.
      // Window capture still observes the original event before that guard can
      // stopImmediatePropagation, independent of listener registration order.
      const observerTarget = doc.defaultView?.addEventListener ? doc.defaultView : doc;
      for (const type of [
        'pointerdown',
        'pointerup',
        'pointercancel',
        'mousedown',
        'mouseup',
        'click',
        'keydown',
        'keyup',
        'focusin',
        'visibilitychange',
      ]) {
        observerTarget.addEventListener(type, observe, true);
        listeners.push(() => observerTarget.removeEventListener(type, observe, true));
      }
      doc.defaultView?.addEventListener?.('blur', observe, true);
      listeners.push(() => doc.defaultView?.removeEventListener?.('blur', observe, true));
    }
  }

  setEnabled(enabled);
  return {
    get enabled() {
      return active;
    },
    setEnabled,
    syncHost,
    record,
    snapshot: () =>
      entries.map((entry) => ({
        ...entry,
        buttons: [...entry.buttons],
        raw: entry.raw.map((value) => ({ ...value, buttons: [...value.buttons] })),
      })),
    destroy() {
      setEnabled(false);
      destroyed = true;
    },
  };
}
