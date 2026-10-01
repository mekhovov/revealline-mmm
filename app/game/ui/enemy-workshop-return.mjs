import { localizedText, t } from '../i18n/index.mjs';
const FORMAT = 'revealline.enemy-workshop-return.v1';
const PARAM = 'enemy-workshop-session';
const validToken = (value) => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const destinations = ['workshop', 'enemy-guide'];

function returnMessage(value, token) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const fields = Object.getOwnPropertyDescriptors(value);
  return (
    Reflect.ownKeys(fields).length === 2 &&
    Object.hasOwn(fields.format ?? {}, 'value') &&
    Object.hasOwn(fields.session ?? {}, 'value') &&
    fields.format.value === FORMAT &&
    fields.session.value === token
  );
}

/** Owns one same-origin practice launch. It never reads a child's document or game state. */
export function attachEnemyWorkshopReturnHost({
  window: host = globalThis.window,
  frame,
  onReturn,
  gameURL = null,
  returnTo = 'workshop',
}) {
  const origin = new URL(host.location.href).origin;
  if (!destinations.includes(returnTo))
    throw new TypeError(t('interface:unknownPracticeReturnDestination'));
  const target = new URL(gameURL ?? '../../game/', host.location.href);
  if (!['http:', 'https:'].includes(target.protocol) || target.origin !== origin)
    throw new TypeError(t('interface:practiceMustRemainOnTheSameOrigin'));
  let token = null,
    disposed = false;
  const receive = (event) => {
    if (
      disposed ||
      !token ||
      event.origin !== origin ||
      event.source !== frame.contentWindow ||
      !returnMessage(event.data, token)
    )
      return;
    token = null;
    frame.hidden = true;
    frame.src = 'about:blank';
    onReturn();
  };
  host.addEventListener('message', receive);
  return {
    launchURL() {
      if (disposed) throw new Error(t('interface:theEnemyWorkshopIsClosed'));
      const bytes = host.crypto.getRandomValues(new Uint8Array(16));
      token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      const url = new URL(target);
      url.search = '';
      url.hash = '';
      url.searchParams.set('practice', '1');
      url.searchParams.set(PARAM, token);
      if (returnTo !== 'workshop') url.searchParams.set('practice-return', returnTo);
      return url.href;
    },
    dispose() {
      disposed = true;
      token = null;
      host.removeEventListener('message', receive);
    },
  };
}

/** An explicit native action in the ordinary practice briefing/pause/results menu. */
export function attachEnemyWorkshopReturn({
  enabled = false,
  window: host = globalThis.window,
  document: doc = globalThis.document,
  onReturn,
} = {}) {
  const noop = { dispose() {} };
  if (!enabled || host.parent === host) return noop;
  const url = new URL(host.location.href),
    token = url.searchParams.get(PARAM),
    returnTo = url.searchParams.get('practice-return') ?? 'workshop',
    actions = doc.getElementById('game-overlay')?.querySelector('.overlay-actions');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.searchParams.getAll('practice').length !== 1 ||
    url.searchParams.get('practice') !== '1' ||
    url.searchParams.getAll(PARAM).length !== 1 ||
    url.searchParams.getAll('practice-return').length > 1 ||
    !destinations.includes(returnTo) ||
    !validToken(token) ||
    !actions
  )
    return noop;
  const button = doc.createElement('button');
  button.id = 'enemy-workshop-return';
  button.type = 'button';
  button.className = 'button secondary';
  localizedText(button, () =>
    returnTo === 'enemy-guide'
      ? t('interface:returnToFieldGuide')
      : t('interface:returnToWorkshop'),
  );
  let disposed = false;
  button.onclick = () => {
    if (disposed || button.disabled) return;
    onReturn();
    host.parent.postMessage({ format: FORMAT, session: token }, url.origin);
    button.disabled = true;
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
