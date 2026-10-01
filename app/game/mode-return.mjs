import { validateSelectionBookmark } from './selection-bookmark.mjs';

const FORMAT = 'revealline-mmm.mode-return.v1';
const LIMIT = 2048;
const LIFETIME = 30 * 60 * 1000;
const tokenValid = (value) => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
const exactKeys = (value, keys) =>
  value &&
  typeof value === 'object' &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value)) &&
  Object.keys(value).sort().join(',') === keys &&
  Reflect.ownKeys(value).length === keys.split(',').length &&
  Object.values(Object.getOwnPropertyDescriptors(value)).every(
    (descriptor) => descriptor.enumerable && Object.hasOwn(descriptor, 'value'),
  );
const base = (href) => {
  const url = new URL('./', href);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Mode return needs an ordinary game origin.');
  return url;
};
const keyFor = (url) => `${FORMAT}:${url.pathname}`;
function selection(value) {
  if (!exactKeys(value, 'campaignKey,levelId,themeId'))
    throw new Error('Invalid return selection.');
  const { campaignKey, levelId, themeId } = validateSelectionBookmark({
    ...value,
    format: 'revealline-selection.v1',
  });
  return { campaignKey, levelId, themeId };
}
function validAuthority(value) {
  return (
    exactKeys(value, 'channel,sourceRevision,version') &&
    typeof value.channel === 'string' &&
    /^[a-zA-Z0-9._-]{1,80}$/.test(value.channel) &&
    typeof value.version === 'string' &&
    /^[a-zA-Z0-9._-]{1,80}$/.test(value.version) &&
    (value.sourceRevision === null ||
      (typeof value.sourceRevision === 'string' && /^[0-9a-f]{40,64}$/.test(value.sourceRevision)))
  );
}
function read(storage, url) {
  const raw = storage?.getItem(keyFor(url));
  if (typeof raw !== 'string' || raw.length > LIMIT || new TextEncoder().encode(raw).length > LIMIT)
    return null;
  const record = JSON.parse(raw);
  return { raw, record };
}
function valid(record, url, token, time) {
  return (
    exactKeys(record, 'authority,baseURL,createdAt,focus,format,selection,token,view') &&
    record.format === FORMAT &&
    record.baseURL === url.href &&
    record.token === token &&
    tokenValid(token) &&
    record.view === 'missions' &&
    record.focus === 'team' &&
    Number.isSafeInteger(time) &&
    Number.isSafeInteger(record.createdAt) &&
    record.createdAt <= time &&
    time - record.createdAt <= LIFETIME &&
    validAuthority(record.authority) &&
    !!selection(record.selection)
  );
}

/** One same-tab presentation hint; never a save, history URL, or content install. */
export function createModeReturn({
  storage,
  baseURL,
  authority,
  now = Date.now,
  nonce = () => globalThis.crypto.randomUUID().replaceAll('-', ''),
}) {
  const url = base(baseURL);
  if (!validAuthority(authority)) throw new Error('Invalid return source authority.');
  const pinnedAuthority = { ...authority };
  return Object.freeze({
    prepare(value) {
      const record = {
        format: FORMAT,
        baseURL: url.href,
        authority: pinnedAuthority,
        createdAt: now(),
        token: nonce(),
        view: 'missions',
        focus: 'team',
        selection: selection(value),
      };
      if (!valid(record, url, record.token, record.createdAt))
        throw new Error('Invalid return token or clock.');
      const raw = JSON.stringify(record);
      if (new TextEncoder().encode(raw).length > LIMIT)
        throw new Error('Return record is too large.');
      storage.setItem(keyFor(url), raw);
      if (storage.getItem(keyFor(url)) !== raw)
        throw new Error('Return context could not be retained.');
      const target = new URL('couch/relay-rescue.html', url);
      target.searchParams.set('return', 'solo');
      target.searchParams.set('return-token', record.token);
      return { token: record.token, href: target.href };
    },
    consume(search) {
      try {
        const tokens = new URLSearchParams(search).getAll('mode-return');
        if (tokens.length !== 1 || !tokenValid(tokens[0])) return null;
        const held = read(storage, url);
        if (!held || held.record?.token !== tokens[0]) return null;
        // Consume before validation; stale or incompatible own tickets are one-use too.
        storage.removeItem(keyFor(url));
        if (storage.getItem(keyFor(url)) === held.raw) return null;
        if (!valid(held.record, url, tokens[0], now())) return null;
        if (
          Object.keys(pinnedAuthority).some(
            (name) => held.record.authority[name] !== pinnedAuthority[name],
          )
        )
          return null;
        return selection(held.record.selection);
      } catch {
        return null;
      }
    },
    clear(token) {
      try {
        const held = read(storage, url);
        if (held?.record?.token === token && storage.getItem(keyFor(url)) === held.raw)
          storage.removeItem(keyFor(url));
      } catch {
        /* Never disturb another return record or any saved flight. */
      }
    },
  });
}

/** Fixed Team destinations only. The receiving Solo page validates its own source. */
export function teamReturnHref({ href, storage, now = Date.now }) {
  const current = new URL(href);
  const returns = current.searchParams.getAll('return');
  if (returns.length !== 1 || returns[0] !== 'solo') return './';
  const tokens = current.searchParams.getAll('return-token');
  if (tokens.length !== 1 || !tokenValid(tokens[0])) return '../';
  try {
    const solo = base(new URL('../', current).href);
    const held = read(storage, solo);
    if (held && valid(held.record, solo, tokens[0], now())) return `../?mode-return=${tokens[0]}`;
  } catch {
    /* Presentation storage may be unavailable; Solo title remains reachable. */
  }
  return '../';
}
