import { localizedText, t } from '../i18n/index.mjs';
import { setMenuIcon } from './native-menu-icons.mjs';

// Synchronous, same-origin focus handoff for the registered Controller practice
// frame. This is a UI boundary, not an application-state or input transport.
const EXIT_EVENT = 'revealline-controller-practice-focus-exit';
const validSession = (value) => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);

export function requestControllerPracticeExit({
  window: child = globalThis.window,
  session,
  backward = false,
  beforeExit = () => {},
} = {}) {
  try {
    const frame = child?.frameElement;
    if (
      !validSession(session) ||
      typeof backward !== 'boolean' ||
      typeof beforeExit !== 'function' ||
      !frame ||
      child.parent === child ||
      child.location.origin === 'null' ||
      child.parent.location.origin !== child.location.origin ||
      frame.contentWindow !== child ||
      child.document.hidden ||
      child.document.hasFocus?.() === false
    )
      return false;
    const event = new child.CustomEvent(EXIT_EVENT, {
      cancelable: true,
      detail: { session, source: child, backward, beforeExit },
    });
    frame.dispatchEvent(event);
    return event.defaultPrevented;
  } catch {
    return false;
  }
}

/** An ordinary menu action uses the same checked handoff as keyboard Tab. */
export function attachControllerPracticeReturn({
  enabled = false,
  window: child = globalThis.window,
  document: doc = globalThis.document,
  session,
  beforeExit = () => {},
} = {}) {
  const actions = doc.getElementById('game-overlay')?.querySelector('.overlay-actions');
  if (
    !enabled ||
    child.parent === child ||
    child.name !== 'revealline-controller-practice' ||
    !validSession(session) ||
    !actions
  )
    return { dispose() {} };
  const button = doc.createElement('button');
  button.id = 'controller-practice-return';
  button.type = 'button';
  button.className = 'button secondary';
  localizedText(button, () => t('interface:returnToControllerPractice'));
  setMenuIcon(button, 'back');
  let disposed = false;
  button.onclick = () => {
    if (disposed || button.disabled) return;
    requestControllerPracticeExit({ window: child, session, beforeExit });
  };
  actions.append(button);
  return {
    dispose() {
      disposed = true;
      button.onclick = null;
      button.remove();
    },
  };
}

export function attachControllerPracticeExit({
  frame,
  document: doc = globalThis.document,
  getSession,
  isReady,
  getTarget,
  releaseInputs,
}) {
  let destroyed = false;
  const available = (element) =>
    !!element?.isConnected &&
    element.ownerDocument === doc &&
    !element.disabled &&
    !element.closest('[hidden],[inert],[aria-hidden="true"]') &&
    element.getClientRects().length > 0 &&
    doc.defaultView?.getComputedStyle(element).visibility !== 'hidden';
  function receive(event) {
    if (destroyed || event.target !== frame || event.defaultPrevented) return;
    try {
      const detail = event.detail;
      if (
        !detail ||
        !validSession(detail.session) ||
        typeof detail.backward !== 'boolean' ||
        typeof detail.beforeExit !== 'function'
      )
        return;
      const target = getTarget(detail.backward);
      const current = () =>
        !destroyed &&
        isReady() &&
        detail.session === getSession() &&
        detail.source === frame.contentWindow &&
        detail.source.location.origin === doc.defaultView.location.origin &&
        doc.activeElement === frame &&
        !doc.hidden &&
        doc.hasFocus?.() !== false &&
        available(frame) &&
        target === getTarget(detail.backward) &&
        available(target);
      if (!current()) return;
      event.preventDefault();
      // The accepted synchronous owner also consumes retirement during callbacks;
      // the child must never wrap back over a newer parent focus choice.
      // Suspend and neutralize before moving focus. Recheck the same frame and
      // session after callbacks; a replacement or newer focus owns its result.
      detail.beforeExit();
      if (!current()) return;
      releaseInputs();
      if (!current()) return;
      target.focus({ preventScroll: true });
      if (doc.activeElement !== target) return;
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    } catch {
      // A gone/replaced/opaque child or unavailable target cannot steal focus.
    }
  }
  frame.addEventListener(EXIT_EVENT, receive);
  return {
    destroy() {
      destroyed = true;
      frame.removeEventListener(EXIT_EVENT, receive);
    },
  };
}
