import { boundedJSON, exactKeys, required, canonicalJSON } from '../data-json.mjs';
import { validateProfile } from './controller-profiles.mjs';

export const COUCH_RESTORE_KEY = 'revealline-mmm.couch-radio-setup.v1';
export const SOLO_RESTORE_KEY = 'revealline-mmm.solo-radio-setup.v1';
export const radioIdentity = (d) => canonicalJSON(d);

function validate(value) {
  const data = boundedJSON(value, {
    maxBytes: 262144,
    maxNodes: 32768,
    maxArray: 256,
    maxDepth: 12,
    maxString: 512,
  });
  exactKeys(data, ['format', 'entries'], 'saved radio setup');
  required(
    data.format === 'RadioSetup.v1' && Array.isArray(data.entries) && data.entries.length <= 16,
    'Unsupported saved radio setup',
  );
  const occupied = new Set();
  for (const entry of data.entries) {
    exactKeys(entry, ['profiles', 'seats'], 'saved radio');
    required(
      Array.isArray(entry.profiles) && [1, 2].includes(entry.profiles.length),
      'Invalid radio profiles',
    );
    entry.profiles = entry.profiles.map(validateProfile);
    if (entry.profiles.length === 2) {
      const channels = entry.profiles.map(
        (p) =>
          new Set(
            [...Object.values(p.flight), ...Object.values(p.menu)]
              .flat()
              .map((s) => `${s.kind === 'button' ? 'button' : 'axis'}:${s.index}`),
          ),
      );
      required(
        ![...channels[0]].some((key) => channels[1].has(key)),
        'Shared radio channels overlap',
      );
    }
    required(
      entry.profiles.every(
        (p) => radioIdentity(p.device) === radioIdentity(entry.profiles[0].device),
      ),
      'Shared profiles must match one radio',
    );
    required(
      Array.isArray(entry.seats) && entry.seats.length === entry.profiles.length,
      'Invalid saved seats',
    );
    for (const seat of entry.seats) {
      required(
        seat === null || ([0, 1].includes(seat) && !occupied.has(seat)),
        'Duplicate or invalid saved seat',
      );
      if (seat !== null) occupied.add(seat);
    }
  }
  return data;
}

// Separate from the recipe library and FPV calibration. Never overwrite unknown
// data or another tab's newer setup. A failed write leaves session input usable.
export function createRadioRestoreStore(storage, key) {
  let data = { format: 'RadioSetup.v1', entries: [] },
    baseline = null,
    error = null,
    blocked = false;
  try {
    baseline = storage?.getItem(key) ?? null;
    if (baseline !== null) data = validate(JSON.parse(baseline));
  } catch {
    error = 'invalid';
    blocked = true;
  }
  const save = (entries) => {
    if (blocked) return false;
    let next;
    try {
      next = validate({ format: 'RadioSetup.v1', entries });
    } catch {
      error = 'invalid';
      return false;
    }
    data = next;
    try {
      if (!storage?.setItem) throw new Error('unavailable');
      if ((storage.getItem(key) ?? null) !== baseline) {
        blocked = true;
        error = 'changed';
        return false;
      }
      const text = canonicalJSON(next);
      storage.setItem(key, text);
      if (storage.getItem(key) !== text) throw new Error('unavailable');
      baseline = text;
      error = null;
      return true;
    } catch {
      error = 'unavailable';
      return false;
    }
  };
  return {
    entries: () => structuredClone(data.entries),
    save,
    error: () => error,
    forget() {
      // Explicit forgetting may replace unreadable data from this tab's baseline,
      // but must still refuse to overwrite a newer setup written by another tab.
      if (blocked && error === 'invalid') blocked = false;
      return save([]);
    },
  };
}
