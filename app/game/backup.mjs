import { boundedJSON, exactKeys, plainObject, required } from './data-json.mjs';
import { CONTENT_LIMITS } from './content.mjs';
import { browserDecodeImage } from './imports.mjs';
import { importLibrary, campaignKey, LIBRARY_LIMITS } from './library.mjs';
import {
  packLibrarySnapshot,
  importPackLibrary,
  resolvePackCampaign,
  PACK_LIMITS,
} from './packs.mjs';
import {
  restoreSession,
  snapshotSession,
  SESSION_IMPORT_BYTES,
  PRESENTATION_SESSION_FORMAT,
  STORY_SESSION_FORMAT,
  VISUAL_SESSION_FORMAT,
  ACTOR_SESSION_FORMAT,
} from './sessions.mjs';
import { MAX_REPLAY_TICKS } from './replay.mjs';
import { isMediaIdentityCatalog } from './media-library.mjs';
import { validatePictureReceiptOwners } from './picture-receipts.mjs';
import { validateExternalChapterIndex } from './external-chapter.mjs';

export const BACKUP_FORMAT = 'xonix-backup.v1';
export const EXTERNAL_BACKUP_FORMAT = 'xonix-backup.v2';
// The existing limits remain authoritative for each member. This outer guard
// fits them together without requiring players to coordinate several files.
export const MAX_BACKUP_BYTES =
  PACK_LIMITS.libraryBytes + LIBRARY_LIMITS.maxBytes + SESSION_IMPORT_BYTES + 16384;
const limits = Object.freeze({
  maxBytes: MAX_BACKUP_BYTES,
  maxNodes: 3400000,
  maxDepth: 30,
  maxArray: MAX_REPLAY_TICKS,
  maxString: CONTENT_LIMITS.maxEncodedImageChars,
});
// This is an in-memory context bound, not a larger portable-file budget. It
// accommodates two execution modes for the existing 104 authored contexts,
// including repeated filtered rosters resolved from the bounded pack library.
const expandedCampaignLimits = Object.freeze({
  maxBytes: 128 * 1024 * 1024,
  maxNodes: 1000000,
  maxDepth: 24,
  maxArray: 4096,
  maxString: 65536,
});
const preparedBackups = new WeakSet();
export const isPreparedBackup = (value) => preparedBackups.has(value);
const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
function checkAbort(signal) {
  if (signal?.aborted) {
    const error = new Error('Backup preparation was cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}
function packEnvelope(value) {
  if (!plainObject(value)) return value;
  const fields = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(fields).some(
      (key) =>
        typeof key !== 'string' || !fields[key].enumerable || !Object.hasOwn(fields[key], 'value'),
    )
  )
    return value;
  if (!fields.packs) return value;
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [
      key,
      key === 'packs' ? packLibrarySnapshot(field.value) : field.value,
    ]),
  );
}
function envelope(candidate) {
  const value = boundedJSON(packEnvelope(candidate), limits);
  required(
    [BACKUP_FORMAT, EXTERNAL_BACKUP_FORMAT].includes(value.format),
    'Unsupported full-backup format.',
  );
  exactKeys(
    value,
    [
      'format',
      'library',
      'packs',
      'session',
      ...(value.format === EXTERNAL_BACKUP_FORMAT ? ['externalChapters'] : []),
    ],
    'backup',
  );
  if (value.format === EXTERNAL_BACKUP_FORMAT)
    value.externalChapters = validateExternalChapterIndex(value.externalChapters);
  required(
    plainObject(value.library) && plainObject(value.packs),
    'A full backup must include its player library and expansion library.',
  );
  required(
    value.session === null || plainObject(value.session),
    'A full backup must include an unfinished attempt or explicit session: null.',
  );
  return value;
}

/**
 * Fully prepare a portable backup, without storage or live-state mutations.
 * `campaigns` and optional synchronous `resolveCampaign(key)` are trusted host
 * content (for example the built-in campaign and dated challenge generator).
 * Pack campaigns always come from this backup's successfully prepared packs.
 * Optional trusted `expandCampaigns(originals)` synchronously returns the full
 * campaign array to recognize. Its frozen input contains only those registered
 * originals and the backup's own resolved packs, never another installed set.
 */
export async function prepareBackup(
  candidate,
  {
    campaigns = [],
    decodeImage = browserDecodeImage,
    signal,
    onProgress,
    resolveCampaign,
    expandCampaigns,
    resolveMediaIdentityCatalog,
    prepareExternalChapters,
  } = {},
) {
  checkAbort(signal);
  // Snapshot every supplied data object before the first await; do not permit
  // caller edits during image decoding/replay verification to change adoption.
  const value = envelope(candidate);
  required(
    prepareExternalChapters === undefined || typeof prepareExternalChapters === 'function',
    'External backup preparation must be a trusted capability.',
  );
  required(
    value.format !== EXTERNAL_BACKUP_FORMAT || prepareExternalChapters,
    'This external backup needs the supported descriptor companion. Restore its separate originals first.',
  );
  const registered = boundedJSON(campaigns);
  required(Array.isArray(registered), 'Registered backup campaigns must be an array.');
  required(
    resolveCampaign === undefined || typeof resolveCampaign === 'function',
    'The campaign resolver must be a trusted function, not backup data.',
  );
  required(
    expandCampaigns === undefined || typeof expandCampaigns === 'function',
    'The campaign expander must be a trusted function, not backup data.',
  );
  required(
    resolveMediaIdentityCatalog === undefined || typeof resolveMediaIdentityCatalog === 'function',
    'The picture catalog resolver must be a trusted function.',
  );
  const known = new Map(registered.map((campaign) => [campaignKey(campaign), campaign]));
  const originals = [...registered];
  // Fail malformed profile data before any image allocation. Repeat known-
  // campaign validation after the backup's expansions become available.
  importLibrary(value.library, { campaigns: registered });
  if (value.session !== null) value.session = snapshotSession(value.session);
  const packs = await importPackLibrary(value.packs, {
    decodeImage: async (...args) => {
      checkAbort(signal);
      const decoded = await decodeImage(...args);
      checkAbort(signal);
      return decoded;
    },
  });
  checkAbort(signal);
  if (prepareExternalChapters) {
    await prepareExternalChapters(packs, value.externalChapters ?? null, { signal });
    checkAbort(signal);
  }
  for (const pack of packs.packs)
    for (const source of pack.campaigns) {
      const { campaign } = resolvePackCampaign(pack, source.id);
      originals.push(campaign);
      known.set(campaignKey(campaign), campaign);
    }
  if (expandCampaigns) {
    const output = expandCampaigns(freeze(originals));
    required(
      Array.isArray(output) && output.length <= 208,
      'Expanded backup campaigns must be a synchronous array of at most 208 campaigns.',
    );
    const expanded = boundedJSON(output, expandedCampaignLimits);
    known.clear();
    for (const campaign of expanded) known.set(campaignKey(campaign), campaign);
    checkAbort(signal);
  }
  if (value.session !== null) {
    const key = value.session.campaignKey;
    required(
      typeof key === 'string' && key.length > 0 && key.length <= 300,
      'Saved attempt campaign identity is invalid.',
    );
    if (!known.has(key) && resolveCampaign) {
      const found = resolveCampaign(key);
      if (found !== null && found !== undefined) {
        const campaign = boundedJSON(found);
        required(campaignKey(campaign) === key, 'Resolved backup campaign identity differs.');
        known.set(key, campaign);
      }
    }
    required(
      known.has(key),
      'The unfinished attempt requires a matching included pack or registered campaign.',
    );
  }
  let mediaIdentityCatalog;
  if (
    ([
      PRESENTATION_SESSION_FORMAT,
      STORY_SESSION_FORMAT,
      VISUAL_SESSION_FORMAT,
      ACTOR_SESSION_FORMAT,
    ].includes(value.session?.format) &&
      value.session?.presentationPins !== null) ||
    value.library.pictureReceipts?.length
  ) {
    required(
      resolveMediaIdentityCatalog,
      'This backup needs its original picture library and exact historical owners.',
    );
    mediaIdentityCatalog = resolveMediaIdentityCatalog(
      freeze({ originals, packs, campaigns: [...known.values()] }),
    );
    required(
      isMediaIdentityCatalog(mediaIdentityCatalog),
      'The picture resolver must return a verified synchronous execution catalog.',
    );
    checkAbort(signal);
  }
  if (value.session !== null) {
    const key = value.session.campaignKey;
    await restoreSession(value.session, {
      campaign: known.get(key),
      campaignKey: key,
      signal,
      onProgress,
      mediaIdentityCatalog,
    });
  }
  checkAbort(signal);
  const library = importLibrary(value.library, { campaigns: [...known.values()] });
  if (library.pictureReceipts?.length)
    validatePictureReceiptOwners(library.pictureReceipts, library.gallery, mediaIdentityCatalog);
  const prepared = freeze({
    library,
    packs,
    session: value.session,
    ...(value.format === EXTERNAL_BACKUP_FORMAT
      ? { externalChapters: value.externalChapters }
      : {}),
  });
  preparedBackups.add(prepared);
  return prepared;
}

/** Validation includes image decoding and any replay; errors reject the promise. */
export const validateBackup = prepareBackup;

/** Produce compact, validated JSON. Member exports keep their existing formats. */
export async function exportBackup(contents, options = {}) {
  const value = boundedJSON(packEnvelope(contents), limits);
  const format = Object.hasOwn(value, 'externalChapters') ? EXTERNAL_BACKUP_FORMAT : BACKUP_FORMAT;
  exactKeys(
    value,
    [
      'library',
      'packs',
      'session',
      ...(format === EXTERNAL_BACKUP_FORMAT ? ['externalChapters'] : []),
    ],
    'backup contents',
  );
  const prepared = await prepareBackup(
    { format, ...value, session: value.session ?? null },
    options,
  );
  const text = JSON.stringify({ format, ...prepared, packs: packLibrarySnapshot(prepared.packs) });
  required(new TextEncoder().encode(text).byteLength <= MAX_BACKUP_BYTES, 'Backup is too large.');
  return text;
}
