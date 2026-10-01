import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { validateEditionId } from '../edition-context.mjs';
import { LIBRARY_MODES } from './library.mjs';

export const MISSION_GOAL_FORMAT = 'revealline-mission-goal.v1';
export const MISSION_GOAL_KEY_PREFIX = 'revealline-mmm.mission-goal.v1';
const missionId = (value) =>
  value === null ||
  (typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= 2048 &&
    !/[\u0000-\u001f\u007f-\u009f]/u.test(value) &&
    !/[\ud800-\udfff]/u.test(value));
export function validateMissionGoal(input, { editionId, mode }) {
  const value = boundedJSON(input, { maxBytes: 16384, maxNodes: 8, maxDepth: 1, maxString: 2048 });
  exactKeys(value, ['format', 'editionId', 'mode', 'missionId'], 'Pinned mission goal');
  required(
    value.format === MISSION_GOAL_FORMAT &&
      value.editionId === editionId &&
      value.mode === mode &&
      missionId(value.missionId),
    'Invalid exact edition/mode mission goal.',
  );
  return Object.freeze(value);
}

/** A convenience preference, never a clear, entitlement, route or download
 * request. Loading does not write; corrupt/future bytes are left recoverable. */
export function createMissionGoalPreferences({
  editionId = 'default',
  mode = 'solo',
  getStorage = () => globalThis.localStorage,
  window: eventTarget = globalThis,
} = {}) {
  validateEditionId(editionId);
  required(LIBRARY_MODES.includes(mode), 'Choose a supported mission-goal mode.');
  const key = `${MISSION_GOAL_KEY_PREFIX}.${editionId}.${mode}`,
    listeners = new Set();
  let selected = null,
    durable = true,
    pending = false,
    disposed = false;
  const snapshot = () => Object.freeze({ editionId, mode, missionId: selected, durable });
  const read = () => {
    const storage = getStorage();
    required(storage, 'Mission-goal storage is unavailable.');
    const raw = storage.getItem(key);
    return {
      storage,
      raw,
      value: raw === null ? null : validateMissionGoal(raw, { editionId, mode }),
    };
  };
  const notify = () => {
    for (const listener of [...listeners]) {
      if (disposed || !listeners.has(listener)) continue;
      try {
        listener(snapshot());
      } catch {
        /* Preferences cannot stop play. */
      }
    }
    return snapshot();
  };
  try {
    selected = read().value?.missionId ?? null;
  } catch {
    durable = false;
  }
  function refresh(event) {
    if (
      disposed ||
      pending ||
      (event.type === 'storage' && event.key !== key) ||
      (event.type === 'pageshow' && event.persisted !== true)
    )
      return;
    try {
      const current = read();
      if (
        event.type === 'storage' &&
        (event.storageArea !== current.storage || event.newValue !== current.raw)
      )
        return;
      selected = current.value?.missionId ?? null;
      durable = true;
    } catch {
      durable = false;
    }
    notify();
  }
  function save() {
    if (disposed) return snapshot();
    try {
      const { storage } = read(); // Never replace an unreadable/future record.
      const raw = JSON.stringify({
        format: MISSION_GOAL_FORMAT,
        editionId,
        mode,
        missionId: selected,
      });
      storage.setItem(key, raw);
      required(storage.getItem(key) === raw, 'Mission-goal readback failed.');
      pending = false;
      durable = true;
    } catch {
      durable = false;
    }
    return notify();
  }
  eventTarget?.addEventListener?.('storage', refresh);
  eventTarget?.addEventListener?.('pageshow', refresh);
  return Object.freeze({
    key,
    snapshot,
    choose(value) {
      if (disposed) return snapshot();
      required(missionId(value), 'Choose a bounded mission identity.');
      selected = value;
      pending = true;
      return save();
    },
    retry() {
      if (pending) return save();
      refresh({ type: 'pageshow', persisted: true });
      return snapshot();
    },
    subscribe(listener) {
      required(
        !disposed && typeof listener === 'function',
        'Active mission-goal listener required.',
      );
      listeners.add(listener);
      try {
        listener(snapshot());
      } catch {
        /* Keep the choice usable. */
      }
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      eventTarget?.removeEventListener?.('storage', refresh);
      eventTarget?.removeEventListener?.('pageshow', refresh);
    },
  });
}
