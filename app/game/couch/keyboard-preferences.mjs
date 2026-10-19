import {
  couchKeyboardActions,
  resolveCouchKeyboard,
  replaceCouchKey,
} from './keyboard-bindings.mjs';

import { claimProfileWriter, ownsProfileWriter } from '../profile-writer.mjs';

export const COUCH_KEYBOARD_KEY = 'revealline-mmm.couch-keyboard.v1';
export const TEAM_KEYBOARD_KEY = 'revealline-mmm.team-keyboard.v1';
const decode = (raw, mode) => {
  if (typeof raw !== 'string' || raw.length > 4096) return null;
  try {
    return resolveCouchKeyboard(JSON.parse(raw), mode);
  } catch {
    return null;
  }
};
/** The caller refreshes only at an explicit Settings boundary. Other tabs never
 * change a running round's keyboard map. Pending fields merge at verified save. */
export function createCouchKeyboardPreferences({
  mode = 'duel',
  getStorage = () => globalThis.localStorage,
  getLockManager = () => globalThis.navigator?.locks,
} = {}) {
  const actions = couchKeyboardActions(mode),
    storageKey = mode === 'team' ? TEAM_KEYBOARD_KEY : COUCH_KEYBOARD_KEY,
    writerKey = `${storageKey}:writer`;
  let state = resolveCouchKeyboard(null, mode),
    status = 'idle',
    reason = '',
    disposed = false,
    revision = 0,
    writing = false;
  const pending = new Map(),
    listeners = new Set();
  const read = () => {
    const storage = getStorage();
    if (!storage) throw new Error('Storage unavailable.');
    return { storage, value: decode(storage.getItem(storageKey), mode) };
  };
  try {
    state = read().value ?? state;
  } catch {}
  const snapshot = () => {
    state.seats.forEach(Object.freeze);
    Object.freeze(state.seats);
    Object.freeze(state);
    return { bindings: state, status, reason, revision, saving: writing };
  };
  const notify = () => {
    for (const listener of listeners) listener(snapshot());
  };
  async function save() {
    if (disposed || !pending.size) return;
    if (writing) {
      notify();
      return;
    }
    writing = true;
    const action = revision;
    let phase = 'lockUnavailable',
      lease;
    const current = () => !disposed && action === revision;
    reason = 'saving';
    notify();
    try {
      lease = await claimProfileWriter(getLockManager(), writerKey);
      if (!current()) return;
      if (!ownsProfileWriter(lease, writerKey)) {
        reason = lease.reasonCode === 'occupied' ? 'occupied' : 'lockUnavailable';
        return;
      }
      phase = 'unavailable';
      const { storage, value } = read();
      if (!current()) return;
      const candidate = value ?? resolveCouchKeyboard(null, mode);
      for (const [field, code] of pending) {
        const [seat, kind] = field.split(':');
        candidate.seats[Number(seat)][kind] = code;
      }
      phase = 'conflict';
      const accepted = resolveCouchKeyboard(candidate, mode),
        raw = JSON.stringify(accepted);
      if (!current() || !ownsProfileWriter(lease, writerKey)) return;
      phase = 'write';
      storage.setItem(storageKey, raw);
      if (!current()) return;
      phase = 'verify';
      if (storage.getItem(storageKey) !== raw) {
        reason = 'unconfirmed';
        return;
      }
      if (!current()) return;
      state = accepted;
      pending.clear();
      status = 'saved';
      reason = '';
    } catch (error) {
      if (current())
        reason =
          error?.name === 'SecurityError'
            ? 'blocked'
            : error?.name === 'QuotaExceededError'
              ? 'full'
              : phase;
    } finally {
      lease?.release();
      writing = false;
      if (!disposed) {
        if (pending.size) status = 'session';
        notify();
      }
    }
  }
  return {
    snapshot,
    subscribe(listener) {
      if (disposed) throw new Error('Keyboard preferences disposed.');
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    set(seat, kind, code) {
      if (disposed) return;
      state = replaceCouchKey(state, seat, kind, code, mode);
      pending.set(`${seat}:${kind}`, code);
      revision++;
      status = 'session';
      reason = 'unconfirmed';
      return save();
    },
    reset() {
      if (disposed) return;
      state = resolveCouchKeyboard(null, mode);
      for (let seat = 0; seat < 2; seat++)
        for (const kind of actions) pending.set(`${seat}:${kind}`, state.seats[seat][kind]);
      revision++;
      status = 'session';
      reason = 'unconfirmed';
      return save();
    },
    retry: save,
    suspend() {
      if (disposed || !writing) return;
      revision++;
      reason = 'unconfirmed';
    },
    refresh() {
      if (disposed || pending.size) return;
      try {
        const next = read().value ?? resolveCouchKeyboard(null, mode);
        if (JSON.stringify(next) === JSON.stringify(state)) return;
        state = next;
        revision++;
        status = 'external';
        reason = '';
        notify();
      } catch {}
    },
    dispose() {
      disposed = true;
      listeners.clear();
    },
  };
}
