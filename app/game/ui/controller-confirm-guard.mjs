import { t } from '../i18n/index.mjs';

/**
 * Own native compatibility events while one sampled Gamepad Confirm
 * transaction is active. A trusted native activation that finishes before the
 * first sampled Gamepad frame may win; the later controller release then does
 * not activate the same target again.
 */
export function attachControllerConfirmGuard({
  document: doc = globalThis.document,
  confirmPressed = () => false,
  beforeNativeActivation = () => {},
  now = () => globalThis.performance?.now?.() ?? Date.now(),
  echoWindowMs = 1250,
  nativeLeadWindowMs = 250,
  onTrace = null,
} = {}) {
  if (onTrace !== null && typeof onTrace !== 'function')
    throw new TypeError(t('errors:controller.confirmTrace.function'));
  const keys = new Set(),
    listeners = [];
  let primaryPointer = null,
    transaction = null,
    suppressUntil = -Infinity,
    tailTarget = null,
    nativeActivation = null,
    activationDepth = 0,
    compatibilityHeld = false,
    compatibilityActivated = false,
    neutralRequired = false;

  const targetId = (target) =>
    target?.id || target?.getAttribute?.('name') || target?.tagName || '';
  const trace = (event, extra = {}) =>
    onTrace?.({
      event,
      time: now(),
      phase: transaction ? 'active' : neutralRequired ? 'neutral-required' : 'idle',
      targetId: targetId(transaction?.target),
      winner: transaction?.winner || null,
      ...extra,
    });
  const listen = (type, callback) => {
    doc.addEventListener(type, callback, { capture: true });
    listeners.push(() => doc.removeEventListener(type, callback, { capture: true }));
  };
  const consume = (event) => {
    event.preventDefault();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    else event.stopPropagation?.();
  };
  const confirmKey = (event) =>
    ['Enter', ' '].includes(event.key) &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.shiftKey;
  const isPrimaryActivation = (event) =>
    (event.button == null || event.button === 0 || event.button === -1) &&
    // click is a device-independent activation. Pointer Events specifies its
    // isPrimary default as false, even after a primary pointerdown/pointerup.
    (event.type === 'click' || event.isPrimary !== false);
  const pointerId = (event) =>
    Number.isInteger(event.pointerId) && event.pointerId >= 0 ? event.pointerId : null;
  const tailActive = () => now() <= suppressUntil;
  const ownsGesture = () => !!transaction || compatibilityHeld || neutralRequired || tailActive();
  const ownsPointerEvent = (event) => {
    if (transaction || compatibilityHeld || neutralRequired) return true;
    if (!tailActive()) return false;
    if (event.isTrusted === true) return true;
    const target = event.target;
    return (
      !tailTarget ||
      !target ||
      target === doc ||
      target === tailTarget ||
      tailTarget.contains?.(target) ||
      target.contains?.(tailTarget)
    );
  };
  const hasActivePointer = () => {
    if (primaryPointer !== null && now() > primaryPointer.expiresAt) primaryPointer = null;
    return primaryPointer !== null;
  };
  const ownsPointer = (event) =>
    hasActivePointer() &&
    (primaryPointer.id === null ||
      pointerId(event) === null ||
      primaryPointer.id === pointerId(event));
  const recordNativeActivation = (event) => {
    if (event.isTrusted !== true) return;
    nativeActivation = { at: now(), target: event.target || null, eventType: event.type };
    trace('native-candidate', {
      nativeEventType: event.type,
      targetId: targetId(event.target),
      winner: 'native',
    });
  };

  const consumeConfirmKey = (event) => {
    if (!confirmKey(event)) return;
    beforeNativeActivation(event);
    if (!keys.has(event.key) && !ownsGesture()) return;
    keys.add(event.key);
    trace('native-consumed', { nativeEventType: event.type, targetId: targetId(event.target) });
    consume(event);
  };
  listen('keydown', consumeConfirmKey);
  listen('keypress', consumeConfirmKey);
  listen('keyup', (event) => {
    if (confirmKey(event)) beforeNativeActivation(event);
    const owned = keys.delete(event.key);
    if (owned || (confirmKey(event) && ownsGesture())) {
      trace('native-consumed', { nativeEventType: event.type, targetId: targetId(event.target) });
      consume(event);
    }
  });
  listen('pointerdown', (event) => {
    if (isPrimaryActivation(event)) beforeNativeActivation(event);
    if (!isPrimaryActivation(event) || !ownsPointerEvent(event)) return;
    primaryPointer = { id: pointerId(event), expiresAt: Infinity };
    trace('native-consumed', { nativeEventType: event.type, targetId: targetId(event.target) });
    consume(event);
  });
  listen('pointerup', (event) => {
    if (isPrimaryActivation(event)) beforeNativeActivation(event);
    if (!isPrimaryActivation(event) || (!ownsPointer(event) && !ownsPointerEvent(event))) return;
    primaryPointer = { id: pointerId(event), expiresAt: now() + echoWindowMs };
    trace('native-consumed', { nativeEventType: event.type, targetId: targetId(event.target) });
    consume(event);
  });
  for (const type of ['mousedown', 'mouseup'])
    listen(type, (event) => {
      if (isPrimaryActivation(event)) beforeNativeActivation(event);
      if (!isPrimaryActivation(event) || (!hasActivePointer() && !ownsPointerEvent(event))) return;
      trace('native-consumed', { nativeEventType: event.type, targetId: targetId(event.target) });
      consume(event);
    });
  listen('click', (event) => {
    if (activationDepth > 0) return;
    if (!isPrimaryActivation(event)) return;
    beforeNativeActivation(event);
    if (hasActivePointer() || ownsPointerEvent(event)) {
      primaryPointer = null;
      trace('native-consumed', { nativeEventType: event.type, targetId: targetId(event.target) });
      consume(event);
      return;
    }
    recordNativeActivation(event);
  });
  listen('pointercancel', (event) => {
    if (isPrimaryActivation(event)) beforeNativeActivation(event);
    if (!ownsPointer(event)) return;
    primaryPointer = null;
    trace('native-consumed', { nativeEventType: event.type, targetId: targetId(event.target) });
    consume(event);
  });

  const reset = (reason = 'reset') => {
    if (transaction || compatibilityHeld || neutralRequired) trace('cancel', { reason });
    keys.clear();
    primaryPointer = null;
    transaction = null;
    compatibilityHeld = false;
    compatibilityActivated = false;
    neutralRequired = false;
    suppressUntil = -Infinity;
    tailTarget = null;
    nativeActivation = null;
    // A click handler can synchronously blur the page or open a child frame.
    // Its call-stack depth still unwinds in activate(), even after input resets.
  };
  const blur = () => reset('blur');
  const visibility = () => reset('visibility');
  doc.defaultView?.addEventListener?.('blur', blur);
  listen('visibilitychange', visibility);

  function begin(element, metadata = {}) {
    const age = now() - (nativeActivation?.at ?? -Infinity),
      matchingTarget =
        !nativeActivation?.target ||
        !element ||
        nativeActivation.target === element ||
        element.contains?.(nativeActivation.target);
    transaction = {
      target: element || null,
      winner: age >= 0 && age <= nativeLeadWindowMs && matchingTarget ? 'native' : null,
      activated: false,
      ...metadata,
    };
    compatibilityHeld = false;
    neutralRequired = false;
    suppressUntil = Infinity;
    tailTarget = null;
    if (transaction.winner === 'native') nativeActivation = null;
    trace('transaction-start', { targetId: targetId(element) });
    return transaction.winner;
  }

  function activate(element) {
    if (!element || typeof element.click !== 'function') return false;
    // Couch hosts still drive the guard with observe(pressed) and activate() on
    // the press edge. Keep that finite compatibility path independent from the
    // release transaction used by Solo, otherwise its first activation would
    // create a transaction that the legacy host can never finish.
    if (!transaction && compatibilityHeld) {
      if (compatibilityActivated) return false;
      compatibilityActivated = true;
      const age = now() - (nativeActivation?.at ?? -Infinity),
        matchingTarget =
          !nativeActivation?.target ||
          nativeActivation.target === element ||
          element.contains?.(nativeActivation.target);
      tailTarget = element;
      if (age >= 0 && age <= nativeLeadWindowMs && matchingTarget) {
        nativeActivation = null;
        trace('commit-skipped', { targetId: targetId(element), winner: 'native' });
        return false;
      }
      activationDepth++;
      try {
        element.click();
        trace('commit', { targetId: targetId(element), winner: 'gamepad-compatibility' });
        return true;
      } finally {
        activationDepth--;
      }
    }
    if (!transaction) begin(element);
    if (transaction.activated || transaction.winner === 'native') {
      trace('commit-skipped', { targetId: targetId(element), winner: transaction.winner });
      transaction.activated = true;
      return false;
    }
    transaction.activated = true;
    transaction.winner = 'gamepad';
    activationDepth++;
    try {
      element.click();
      trace('commit', { targetId: targetId(element), winner: 'gamepad' });
      return true;
    } finally {
      activationDepth--;
    }
  }

  function finish(reason = 'release') {
    const winner = transaction?.winner || null;
    tailTarget = transaction?.target || tailTarget;
    trace('transaction-finish', { reason, winner });
    transaction = null;
    compatibilityHeld = false;
    compatibilityActivated = false;
    neutralRequired = false;
    suppressUntil = now() + echoWindowMs;
    if (primaryPointer !== null) primaryPointer.expiresAt = suppressUntil;
    return winner;
  }

  function cancel(reason = 'cancel', { suppressTail = true } = {}) {
    // Activation handlers commonly clear all game input while replacing a
    // menu. The release commit still owns that synchronous cleanup and must
    // reach finish() as one committed transaction.
    if (transaction?.activated) return;
    const owned = !!transaction || compatibilityHeld || neutralRequired;
    if (owned) tailTarget = transaction?.target || tailTarget;
    if (owned) trace('cancel', { reason });
    transaction = null;
    compatibilityHeld = false;
    compatibilityActivated = false;
    neutralRequired = false;
    keys.clear();
    primaryPointer = null;
    if (suppressTail && owned) suppressUntil = now() + echoWindowMs;
    else if (!suppressTail) {
      suppressUntil = -Infinity;
      tailTarget = null;
    }
  }

  return {
    begin,
    activate,
    finish,
    cancel,
    observe(pressed) {
      // Compatibility for secondary hosts that have not adopted transaction
      // phase commands yet.
      if (neutralRequired) {
        if (!pressed && !confirmPressed()) reset('neutral');
        return;
      }
      if (pressed) {
        if (!compatibilityHeld) compatibilityActivated = false;
        compatibilityHeld = true;
        suppressUntil = Infinity;
      } else if (compatibilityHeld) {
        compatibilityHeld = false;
        compatibilityActivated = false;
        suppressUntil = now() + echoWindowMs;
      }
    },
    requireNeutral() {
      keys.clear();
      primaryPointer = null;
      transaction = null;
      compatibilityHeld = false;
      compatibilityActivated = false;
      neutralRequired = true;
      suppressUntil = Infinity;
    },
    active: () => !!transaction,
    owned: ownsGesture,
    destroy() {
      reset('destroy');
      listeners.forEach((remove) => remove());
      doc.defaultView?.removeEventListener?.('blur', blur);
    },
  };
}
