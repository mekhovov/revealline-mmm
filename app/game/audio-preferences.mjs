export const AUDIO_PREFERENCES_KEY = 'revealline-mmm.audio-master.v1';
const MAX_RECORD_LENGTH = 256;

function values(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2 ||
    !Object.hasOwn(value, 'muted') ||
    !Object.hasOwn(value, 'volume') ||
    typeof value.muted !== 'boolean' ||
    !Number.isFinite(value.volume) ||
    value.volume < 0 ||
    value.volume > 1
  )
    throw new TypeError(
      'Audio preferences require a mute boolean and volume between zero and one.',
    );
  return { muted: value.muted, volume: value.volume };
}

function decode(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_RECORD_LENGTH) return null;
  try {
    return values(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Page-owned persistence for the shared output authority. This adapter never
 * starts media or writes a player profile. Only its explicit setters save. */
export function createAudioPreferences({
  audioMaster,
  getStorage = () => globalThis.localStorage,
  window: eventTarget = globalThis,
  fallback = { muted: true, volume: 0.65 },
  writable = () => true,
  onWarning = () => {},
} = {}) {
  const initial = values(fallback);
  let disposed = false,
    explicit = false,
    stored = false,
    unsaved = false,
    warning = '';
  const notify = (message) => {
    warning = message;
    try {
      onWarning(message);
    } catch {
      // A notice cannot prevent the synchronous sound change.
    }
  };
  const read = () => {
    try {
      const storage = getStorage(),
        raw = storage?.getItem(AUDIO_PREFERENCES_KEY);
      return { storage, raw, value: decode(raw) };
    } catch {
      return { storage: null, raw: null, value: null };
    }
  };
  const apply = (record) => {
    let revision = audioMaster.snapshot().revision;
    // Close the mute gate before increasing volume; open it after the fader.
    for (const key of record.muted ? ['muted', 'volume'] : ['volume', 'muted']) {
      const current = audioMaster.snapshot();
      if (disposed || current.revision !== revision) return false;
      if (current[key] === record[key]) continue;
      audioMaster[key === 'muted' ? 'setMuted' : 'setVolume'](record[key]);
      revision++;
      // A subscriber's newer intent must also win over this synchronous seed.
      if (audioMaster.snapshot().revision !== revision) return false;
    }
    return true;
  };
  let seedRevision = audioMaster.snapshot().revision;
  explicit = seedRevision !== 0;
  const first = read();
  if (first.value) {
    stored = true;
    apply(first.value);
  } else if (seedRevision === 0 && apply(initial)) {
    seedRevision = audioMaster.snapshot().revision;
  }
  const persist = () => {
    try {
      const allowed = writable();
      if (disposed) return;
      if (!allowed) {
        unsaved = true;
        notify('Sound changes apply only to this session; saving is disabled here.');
        return;
      }
      const { muted, volume } = audioMaster.snapshot(),
        storage = getStorage();
      if (disposed) return;
      if (!storage) throw new Error('Storage unavailable.');
      storage.setItem(AUDIO_PREFERENCES_KEY, JSON.stringify(values({ muted, volume })));
      if (disposed) return;
      stored = true;
      unsaved = false;
      notify('');
    } catch {
      if (disposed) return;
      unsaved = true;
      notify('Sound changed for this session, but could not be saved for another page.');
    }
  };
  const change = (key, value) => {
    if (disposed) throw new Error('Audio preferences are disposed.');
    const before = audioMaster.snapshot();
    values({ muted: before.muted, volume: before.volume, [key]: value });
    explicit = true;
    try {
      audioMaster[key === 'muted' ? 'setMuted' : 'setVolume'](value);
    } finally {
      // Output listeners may throw after the authority accepted the intent.
      if (!disposed && audioMaster.snapshot().revision !== before.revision) persist();
    }
    return audioMaster.snapshot();
  };
  const receive = (event) => {
    if (disposed || unsaved || event.key !== AUDIO_PREFERENCES_KEY) return;
    const revision = audioMaster.snapshot().revision,
      current = read();
    if (
      disposed ||
      unsaved ||
      audioMaster.snapshot().revision !== revision ||
      !current.storage ||
      event.storageArea !== current.storage ||
      event.newValue !== current.raw ||
      !current.value
    )
      return;
    stored = true;
    apply(current.value);
  };
  // Reconcile a restored page with fresh storage rather than a missed event's
  // payload, without discarding local intent that could not be saved.
  const restored = (event) => {
    if (disposed || unsaved || event.persisted !== true) return;
    const revision = audioMaster.snapshot().revision,
      current = read();
    if (disposed || unsaved || audioMaster.snapshot().revision !== revision || !current.value)
      return;
    stored = true;
    apply(current.value);
  };
  eventTarget?.addEventListener?.('storage', receive);
  eventTarget?.addEventListener?.('pageshow', restored);
  return Object.freeze({
    setMuted: (value) => change('muted', value),
    setVolume: (value) => change('volume', value),
    seed(candidate) {
      if (disposed || stored || explicit || audioMaster.snapshot().revision !== seedRevision)
        return false;
      const current = read();
      if (current.value) {
        stored = true;
        apply(current.value);
        return false;
      }
      if (!apply(values(candidate))) return false;
      seedRevision = audioMaster.snapshot().revision;
      return true;
    },
    getWarning: () => warning,
    dispose() {
      if (disposed) return;
      disposed = true;
      eventTarget?.removeEventListener?.('storage', receive);
      eventTarget?.removeEventListener?.('pageshow', restored);
    },
  });
}
