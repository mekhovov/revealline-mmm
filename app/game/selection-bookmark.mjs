import { canonicalJSON } from './data-json.mjs';

const FORMAT = 'revealline-selection.v1';
const MAX_BYTES = 1024;
const id = (value) => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value);
const campaignKey = (value) =>
  typeof value === 'string' &&
  /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}\/[^/]{1,180}\/[0-9a-f]{16}$/.test(value);

export function validateSelectionBookmark(value) {
  const encoded = canonicalJSON(value);
  if (encoded.length > MAX_BYTES) throw new Error('Selection bookmark is too large.');
  const data = JSON.parse(encoded);
  if (
    !data ||
    Array.isArray(data) ||
    Object.keys(data).sort().join(',') !== 'campaignKey,format,levelId,themeId' ||
    data.format !== FORMAT ||
    !campaignKey(data.campaignKey) ||
    !id(data.levelId) ||
    !id(data.themeId)
  )
    throw new Error('Selection bookmark is invalid.');
  return Object.freeze(data);
}

/** Local menu convenience only. This is never a save, a grant of access, an
 * automatic install, or part of the transferable player-library schema.
 * A writer may remember a deliberate selection; training/read-only tabs may not.
 */
export function createSelectionBookmark({ storage, key, canWrite = () => false }) {
  if (typeof key !== 'string' || !key) throw new Error('A selection storage key is required.');
  return Object.freeze({
    read() {
      try {
        const raw = storage.getItem(key);
        if (raw === null) return { status: 'empty', selection: null };
        if (typeof raw !== 'string' || raw.length > MAX_BYTES)
          return { status: 'unavailable', selection: null };
        return { status: 'ready', selection: validateSelectionBookmark(JSON.parse(raw)) };
      } catch {
        // Preserve malformed/unavailable bytes; menu recovery never repairs saves.
        return { status: 'unavailable', selection: null };
      }
    },
    remember({ campaignKey, levelId, themeId }) {
      try {
        if (canWrite() !== true) return false;
        const selection = validateSelectionBookmark({
          format: FORMAT,
          campaignKey,
          levelId,
          themeId,
        });
        const encoded = canonicalJSON(selection);
        if (storage.getItem(key) !== encoded) storage.setItem(key, encoded);
        return true;
      } catch {
        return false;
      }
    },
  });
}

/** Resolve only against already-validated installed content. Exact campaign
 * identity prevents silently adopting a replacement pack. A locked/missing map
 * uses the campaign's ordinary accessible continuation, never its stored index.
 */
export function resolveSelectionBookmark(selection, { select, playable }) {
  if (!selection) return null;
  let checked;
  try {
    checked = validateSelectionBookmark(selection);
  } catch {
    return null;
  }
  const entry = select(checked.campaignKey);
  if (!entry) return null;
  const index = entry.campaign.levels.findIndex((level) => level.id === checked.levelId);
  return Object.freeze({
    entry,
    levelId: index >= 0 && playable(entry, index) ? checked.levelId : undefined,
    themeId: entry.themes.some((theme) => theme.id === checked.themeId)
      ? checked.themeId
      : undefined,
  });
}
