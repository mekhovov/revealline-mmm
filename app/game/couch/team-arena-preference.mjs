import { t } from '../i18n/index.mjs';
export const TEAM_ARENA_PREFERENCE_KEY = 'revealline.team-arena.v1';
const version = 'revealline-team-arena.v1';
const fields = ['version', 'packId', 'packRevision', 'levelId'];
const identifier = (value) => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,95}$/.test(value);

function decode(raw) {
  if (typeof raw !== 'string' || raw.length > 512) return null;
  try {
    const record = JSON.parse(raw);
    if (
      !record ||
      Array.isArray(record) ||
      Object.keys(record).length !== fields.length ||
      fields.some((key) => !Object.hasOwn(record, key)) ||
      record.version !== version ||
      !identifier(record.packId) ||
      !Number.isSafeInteger(record.packRevision) ||
      record.packRevision < 1 ||
      !identifier(record.levelId)
    )
      return null;
    return record;
  } catch {
    return null;
  }
}

/** A built-in arena bookmark, never a saved attempt or imported pack. Read once
 * on entry; another tab or BFCache restoration must not alter this visit's setup. */
export function createTeamArenaPreference({
  pack,
  getStorage = () => globalThis.localStorage,
  writable = () => true,
  onWarning = () => {},
}) {
  const ids = new Set(pack.levels.map((level) => level.id));
  const packId = pack.id,
    packRevision = pack.revision;
  let levelId = pack.levels[0].id,
    disposed = false,
    revision = 0;
  const read = () => {
    const storage = getStorage();
    if (!storage) throw new Error(t('interface:storageUnavailable'));
    const raw = storage.getItem(TEAM_ARENA_PREFERENCE_KEY);
    return { storage, raw, record: decode(raw) };
  };
  try {
    const { record } = read();
    if (
      record?.packId === packId &&
      record.packRevision === packRevision &&
      ids.has(record.levelId)
    )
      levelId = record.levelId;
  } catch {
    // A denied bookmark read cannot stop the ordinary first arena.
  }
  const notice = (message) => {
    try {
      onWarning(message);
    } catch {
      /* Feedback cannot veto local intent. */
    }
  };
  return Object.freeze({
    current: () => levelId,
    choose(value) {
      if (disposed) throw new Error(t('interface:teamArenaPreferenceIsDisposed'));
      if (!ids.has(value)) throw new TypeError(t('interface:chooseABuiltInTeamArena'));
      levelId = value;
      const owned = ++revision;
      const current = () => !disposed && revision === owned;
      try {
        const allowed = writable();
        if (!current()) return levelId;
        if (!allowed) {
          notice(t('interface:arenaChosenForThisVisitSavingIsDisabledHere'));
          return levelId;
        }
        const { storage, raw, record } = read();
        if (!current()) return levelId;
        if (raw !== null && !record) {
          notice(t('interface:arenaChosenForThisVisitAnUnrecognizedSavedSelectionWas'));
          return levelId;
        }
        storage.setItem(
          TEAM_ARENA_PREFERENCE_KEY,
          JSON.stringify({
            version,
            packId,
            packRevision,
            levelId,
          }),
        );
        if (current()) notice('');
      } catch {
        if (current()) notice(t('interface:arenaChosenForThisVisitButCouldNotBeSaved'));
      }
      return levelId;
    },
    dispose() {
      disposed = true;
      revision++;
    },
  });
}
