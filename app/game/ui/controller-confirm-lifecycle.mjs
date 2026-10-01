const sameAssignment = (a, b) => !!a && !!b && a.index === b.index && a.generation === b.generation;
const control = (target) =>
  target?.closest?.('button,a[href],select,input,textarea,summary,[data-controller-reading]') ||
  null;
const sameTarget = (a, b) => !!a && !!b && (a === b || a.contains?.(b));

/** One Confirm owner, advanced by read-only native probes and ordinary frames.
 * This never samples the full router: doing so would steal direction/Back/flight
 * edges from the host. Native candidates retain their pre-handoff context.
 */
export function createControllerConfirmLifecycle({
  document: doc = globalThis.document,
  readConfirm,
  getContext,
  navigation,
  guard,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
  aliasEchoWindowMs = 1250,
  nativeLeadWindowMs = 250,
  onTrace = null,
} = {}) {
  if (!Number.isFinite(aliasEchoWindowMs) || aliasEchoWindowMs < 0 || aliasEchoWindowMs > 5000)
    throw new RangeError('Controller Confirm alias echo timing is out of bounds.');
  if (onTrace !== null && typeof onTrace !== 'function')
    throw new TypeError('Controller Confirm trace must be a function.');
  let transaction = null,
    candidate = null,
    lastCommit = null,
    committing = false,
    sequence = 0,
    lastSampleTime = null;
  const trace = (event, snapshot, extra = {}) =>
    onTrace?.({
      event,
      time: now(),
      phase: transaction?.kind || 'idle',
      transactionId: transaction?.id,
      buttons: snapshot?.buttons || [],
      gamepadTimestamp: snapshot?.timestamp,
      selectedGamepadIndex: snapshot?.assigned?.index,
      selectedGamepadIdentity: snapshot?.assigned?.id,
      selectedGamepadGeneration: snapshot?.assigned?.generation,
      rawGamepads: snapshot?.rawGamepads,
      targetId: transaction?.target?.id || '',
      winner: transaction?.kind === 'native' ? 'native' : null,
      reason: snapshot?.reason,
      ...extra,
    });
  const context = () => ({ active: true, ...getContext() });
  const candidateCurrent = (snapshot, time) =>
    candidate &&
    time - candidate.at >= 0 &&
    time - candidate.at <= nativeLeadWindowMs &&
    sameAssignment(candidate.assigned, snapshot?.assigned);

  function cancel(reason = 'cancel', { hard = false } = {}) {
    if (committing) return;
    navigation.cancelConfirm();
    if (hard) {
      trace('cancel', null, { reason });
      transaction = null;
      candidate = null;
      lastCommit = null;
      guard.cancel(reason, { suppressTail: false });
    } else if (transaction && transaction.kind !== 'native') {
      transaction.kind = 'cancelled';
      trace('cancel', null, { reason });
      // The held gesture still owns its native release even after a scope
      // change. A finite post-release timer cannot replace waiting for neutral.
    }
  }

  function sample(snapshot, { source = 'frame', nativeEventType = null } = {}) {
    const current = context(),
      time = now();
    trace('confirm-sample', snapshot, {
      sampleSource: source,
      nativeEventType,
      pollIntervalMs: lastSampleTime === null ? null : time - lastSampleTime,
      focusTargetId: doc?.activeElement?.id || '',
      hasFocus: doc?.hasFocus?.() !== false,
      visibilityState: doc?.visibilityState || (doc?.hidden ? 'hidden' : 'visible'),
      fullscreen: !!doc?.fullscreenElement,
    });
    lastSampleTime = time;
    if (!current.active || !snapshot?.assigned) {
      if (transaction || candidate || guard.owned())
        cancel(!current.active ? 'inactive' : 'assignment-lost', { hard: true });
      return false;
    }
    if (candidate && !candidateCurrent(snapshot, time)) candidate = null;
    if (transaction && !sameAssignment(transaction.assigned, snapshot.assigned))
      cancel('assignment-changed', { hard: true });
    const held = snapshot.buttons.length > 0;
    if (transaction) {
      if (
        transaction.kind === 'controller' &&
        (transaction.scope !== current.scope ||
          transaction.root !== current.root ||
          !navigation.confirmCurrent())
      )
        cancel('invalid-target');
      if (held) {
        transaction.buttons = [...new Set([...transaction.buttons, ...snapshot.buttons])];
        return true;
      }
      const released = transaction;
      committing = true;
      try {
        if (released.kind === 'controller') navigation.commitConfirm();
        else navigation.cancelConfirm();
        trace('release', snapshot, {
          winner: released.kind === 'controller' ? 'gamepad' : released.kind,
        });
        guard.finish(released.kind === 'cancelled' ? 'cancelled-release' : 'release');
      } finally {
        committing = false;
        transaction = null;
      }
      if (released.kind === 'controller' || released.kind === 'native')
        lastCommit = {
          at: time,
          assigned: released.assigned,
          originalButton: released.originalButton,
        };
      return true;
    }
    if (!held) {
      // A separate stick/D-pad/button gesture retires a recent native click,
      // including while the router is still waiting for neutral after handoff.
      if (!snapshot.neutral) candidate = null;
      return false;
    }
    // A deliberate focus move in the same menu starts a different gesture.
    // A native winner that opened another menu keeps its original ownership.
    if (
      candidate &&
      !candidate.activated &&
      candidate.scope === current.scope &&
      candidate.root === current.root &&
      current.focused &&
      !sameTarget(candidate.target, current.focused)
    )
      candidate = null;
    const leading = candidateCurrent(snapshot, time) ? candidate : null;
    if (!snapshot.eligible && !leading) return false;
    const alias =
      lastCommit &&
      sameAssignment(lastCommit.assigned, snapshot.assigned) &&
      time - lastCommit.at <= aliasEchoWindowMs &&
      !snapshot.buttons.includes(lastCommit.originalButton);
    let target = null,
      kind = alias ? 'alias' : leading?.activated ? 'native' : 'controller';
    if (kind === 'native') target = leading.target;
    else if (kind === 'controller') {
      if (leading && (leading.scope !== current.scope || leading.root !== current.root))
        kind = 'cancelled';
      else target = navigation.beginConfirm(leading?.target);
      if (!target) kind = 'cancelled';
    }
    transaction = {
      id: ++sequence,
      assigned: snapshot.assigned,
      scope: current.scope,
      root: current.root,
      target,
      kind,
      originalButton: snapshot.buttons[0],
      buttons: [...snapshot.buttons],
    };
    candidate = null;
    guard.begin(target, {
      winner: kind === 'native' ? 'native' : null,
      buttons: snapshot.buttons,
      gamepadTimestamp: snapshot.timestamp,
    });
    trace('start', snapshot, { winner: kind === 'native' ? 'native' : null });
    return true;
  }

  function beforeNativeActivation(event, { activated = event.type === 'click' } = {}) {
    if (committing) return;
    const current = context(),
      snapshot = readConfirm({ scope: current.scope });
    sample(snapshot, { source: 'native', nativeEventType: event.type });
    if (!current.active || transaction || guard.owned() || event.isTrusted !== true) return;
    const target = control(event.target),
      time = now();
    if (!target || event.type === 'pointercancel') return;
    const prior =
      candidateCurrent(snapshot, time) && sameTarget(candidate.target, target) ? candidate : null;
    const down = ['keydown', 'pointerdown', 'mousedown'].includes(event.type);
    if (!down && event.type !== 'click') return;
    if (!prior && !snapshot.eligible) return;
    candidate = {
      ...(prior || {
        target,
        scope: current.scope,
        root: current.root,
        assigned: snapshot.assigned,
      }),
      // Some hosts commit a native button action on down. Record that actual
      // activation before its handler changes scope, without inventing a click.
      // Later Gamepad edges stay associated with the winning native activation.
      at: activated ? time : (prior?.at ?? time),
      activated: prior?.activated === true || activated === true,
    };
    trace('native-candidate', snapshot, {
      nativeEventType: event.type,
      targetId: target.id || '',
      winner: candidate.activated ? 'native' : null,
    });
  }
  const blur = () => cancel('blur', { hard: true });
  const visibility = () => {
    if (doc?.hidden) cancel('visibility', { hard: true });
  };
  doc?.defaultView?.addEventListener?.('blur', blur);
  doc?.addEventListener?.('visibilitychange', visibility);
  return {
    sample,
    beforeNativeActivation,
    nativeInput(event) {
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) candidate = null;
    },
    cancel,
    owned: () => transaction !== null,
    phase: () => transaction?.kind || 'idle',
    destroy() {
      cancel('destroy', { hard: true });
      doc?.defaultView?.removeEventListener?.('blur', blur);
      doc?.removeEventListener?.('visibilitychange', visibility);
    },
  };
}
