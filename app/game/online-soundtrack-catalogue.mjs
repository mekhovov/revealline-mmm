import { boundedJSON, canonicalJSON, exactKeys } from './data-json.mjs';
import { throwIfSoundtrackAborted } from './mp3.mjs';

export const ONLINE_SOUNDTRACK_CATALOGUE_URL =
  'https://mekhovov.github.io/revealline-soundtracks/catalogue.json';
const BASE_URL = 'https://mekhovov.github.io/revealline-soundtracks/';
const FORMAT = 'revealline-public-soundtrack-catalogue.v1';
// The canonical catalogue currently averages a little over 2 KiB per entry.
// Keep the 512-recording schema ceiling usable while retaining a hard response
// budget that is small enough to parse before any media request is attempted.
const MAX_BYTES = 2 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const LICENSES = new Set([
  'https://creativecommons.org/publicdomain/zero/1.0/',
  'https://creativecommons.org/licenses/by/3.0/',
  'https://creativecommons.org/licenses/by/4.0/',
  'https://creativecommons.org/licenses/by-sa/3.0/',
  'https://creativecommons.org/licenses/by-sa/4.0/',
]);
const LICENSE_IDENTITIES = new Map([
  [
    'https://creativecommons.org/publicdomain/zero/1.0/',
    { id: 'CC0', version: '1.0', label: 'CC0 1.0 Universal', shareAlike: false },
  ],
  [
    'https://creativecommons.org/licenses/by/3.0/',
    { id: 'CC-BY', version: '3.0', label: 'CC BY 3.0 Unported', shareAlike: false },
  ],
  [
    'https://creativecommons.org/licenses/by/4.0/',
    { id: 'CC-BY', version: '4.0', label: 'CC BY 4.0 International', shareAlike: false },
  ],
  [
    'https://creativecommons.org/licenses/by-sa/3.0/',
    { id: 'CC-BY-SA', version: '3.0', label: 'CC BY-SA 3.0 Unported', shareAlike: true },
  ],
  [
    'https://creativecommons.org/licenses/by-sa/4.0/',
    { id: 'CC-BY-SA', version: '4.0', label: 'CC BY-SA 4.0 International', shareAlike: true },
  ],
]);
const AUDIO_PATH = /^(?:objects|batches\/[a-z0-9][a-z0-9-]{0,63}\/objects)\/[a-f0-9]{64}\.mp3$/;
const RELEASE_AUDIO =
  /^https:\/\/github\.com\/mekhovov\/revealline-soundtracks\/releases\/download\/audio-[a-z0-9-]+\/([a-f0-9]{64})\.mp3$/;
const RESOLVED_TRACKS = new WeakSet();
const TRACK_AUTHORITIES = new WeakMap();
const MERGED_TRACKS = new WeakMap();
const SOURCE_AUTHORITIES = new WeakMap();
const MAIN_AUTHORITY = Object.freeze({});
SOURCE_AUTHORITIES.set(MAIN_AUTHORITY, {
  url: ONLINE_SOUNDTRACK_CATALOGUE_URL,
  baseURL: BASE_URL,
  allowUnknown: false,
  active: true,
  members: new Map(),
});

function catalogueFailure(key, message, values = Object.create(null), cause = null) {
  const error = cause instanceof Error ? cause : new TypeError(message);
  error.localization = Object.freeze({
    key: `errors:soundtrack.catalogue.${key}`,
    values: Object.freeze({ ...values }),
  });
  return error;
}

function catalogueRequired(condition, key, message, values) {
  if (!condition) throw catalogueFailure(key, message, values);
}

function catalogueExactKeys(value, allowed, label) {
  try {
    exactKeys(value, allowed, label);
  } catch (error) {
    throw catalogueFailure('invalidShape', error.message, undefined, error);
  }
}

function catalogueJSON(source) {
  try {
    return boundedJSON(source, {
      maxBytes: MAX_BYTES,
      maxNodes: 65536,
      maxDepth: 8,
      maxArray: 512,
      maxString: 4096,
    });
  } catch (error) {
    throw catalogueFailure('invalidData', error.message, undefined, error);
  }
}

export function isResolvedOnlineSoundtrackTrack(value) {
  if (typeof value !== 'object' || value === null || !RESOLVED_TRACKS.has(value)) return false;
  const members = MERGED_TRACKS.get(value);
  if (members) return members.every(isResolvedOnlineSoundtrackTrack);
  const provenance = TRACK_AUTHORITIES.get(value);
  return (
    provenance.state.active &&
    (!provenance.fetched || provenance.state.members.get(value.sha256) === provenance.identity)
  );
}

export function onlineSoundtrackOfflineAllowed(value) {
  return (
    isResolvedOnlineSoundtrackTrack(value) &&
    value.rights.kind === 'licensed' &&
    value.rightsConflict !== true
  );
}

export function onlineSoundtrackRecordingAllowed(value) {
  return (
    value?.rights?.kind === 'licensed' &&
    value?.rightsConflict !== true &&
    value?.recordingModeEligible === true &&
    value?.contentId === false
  );
}

export function onlineSoundtrackRecordingURL(value, sha256, baseURL = BASE_URL) {
  try {
    const url = new URL(value),
      base = new URL(baseURL),
      prefix = base.pathname,
      path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : '';
    const release = RELEASE_AUDIO.exec(url.href);
    return (
      HASH.test(sha256) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      ((url.origin === base.origin &&
        path.length > 0 &&
        AUDIO_PATH.test(path) &&
        path.endsWith(`/${sha256}.mp3`)) ||
        (baseURL === BASE_URL && release?.[1] === sha256))
    );
  } catch {
    return false;
  }
}

const EXPIRING_AUDIO_PARAMETERS = new Set([
  'x-amz-signature',
  'x-amz-expires',
  'x-amz-credential',
  'x-amz-security-token',
  'signature',
  'expires',
  'access_token',
  'download_token',
  'token',
]);

function externalRecordingURL(value) {
  try {
    const url = new URL(value),
      host = url.hostname
        .toLowerCase()
        .replace(/^\[|\]$/g, '')
        .replace(/\.$/, '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hash ||
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      /^(?:0|10|127|169\.254|192\.168)\./.test(host) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(host) ||
      host === '::1'
    )
      return false;
    return [...url.searchParams.keys()].every(
      (key) => !EXPIRING_AUDIO_PARAMETERS.has(key.toLowerCase()),
    );
  } catch {
    return false;
  }
}

/** Lexical browser-side checks only; DNS resolution is not pinned here. */
export function normalizeOnlineSoundtrackSourceURL(input) {
  catalogueRequired(
    typeof input === 'string' && input.trim().length > 0 && input.length <= 1024,
    'urlInvalid',
    'Invalid soundtrack source URL.',
  );
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw catalogueFailure('urlInvalid', 'Invalid soundtrack source URL.');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  catalogueRequired(
    externalRecordingURL(url.href) &&
      !url.search &&
      !url.hash &&
      !host.includes(':') &&
      host.includes('.') &&
      !host.endsWith('.localdomain') &&
      !host.endsWith('.internal') &&
      !host.endsWith('.lan') &&
      !host.endsWith('.home') &&
      !/^(?:192\.0\.|198\.(?:18|19)\.|(?:22[4-9]|23\d|24\d|25[0-5])\.)/.test(host) &&
      !/^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host),
    'urlInvalid',
    'Soundtrack sources require a stable public HTTPS URL.',
  );
  if (!url.pathname.endsWith('.json')) {
    url.pathname = url.pathname.replace(/\/?$/, '/') + 'catalogue.json';
  }
  return url.href;
}

export function createOnlineSoundtrackSourceAuthority(input, { allowUnknown = false } = {}) {
  const url = normalizeOnlineSoundtrackSourceURL(input);
  catalogueRequired(
    typeof allowUnknown === 'boolean' && !(url === ONLINE_SOUNDTRACK_CATALOGUE_URL && allowUnknown),
    'urlInvalid',
    'The main soundtrack archive remains licensed-only.',
  );
  const authority = Object.freeze({});
  SOURCE_AUTHORITIES.set(authority, {
    url,
    baseURL: new URL('.', url).href,
    allowUnknown,
    active: true,
    members: new Map(),
  });
  return authority;
}

export function revokeOnlineSoundtrackSource(authority) {
  const state = SOURCE_AUTHORITIES.get(authority);
  catalogueRequired(
    state && authority !== MAIN_AUTHORITY,
    'urlInvalid',
    'Unknown soundtrack source.',
  );
  state.active = false;
  state.members.clear();
}

function sourceState(authority) {
  const state = SOURCE_AUTHORITIES.get(authority);
  catalogueRequired(state?.active, 'urlInvalid', 'Soundtrack source is no longer enabled.');
  return state;
}

/** Only already-resolved tracks can create an exact-hash union. */
export function mergeOnlineSoundtrackTracks(values) {
  catalogueRequired(
    Array.isArray(values) &&
      values.length > 0 &&
      values.length <= 4 &&
      values.every(isResolvedOnlineSoundtrackTrack) &&
      values.every((track) => track.sha256 === values[0].sha256 && track.bytes === values[0].bytes),
    'audioIdentityInvalid',
    'Conflicting soundtrack source identities.',
  );
  if (values.length === 1) return values[0];
  const first = values[0],
    licensed = values.every((track) => track.rights.kind === 'licensed');
  const rightsConflict = values.some(
    (track) =>
      track.rightsConflict === true ||
      track.rights.license !== first.rights.license ||
      track.rights.credit !== first.rights.credit ||
      track.rights.source !== first.rights.source,
  );
  const resolved = Object.freeze({
    ...first,
    tags: Object.freeze([...new Set(values.flatMap((track) => track.tags))]),
    collections: Object.freeze([...new Set(values.flatMap((track) => track.collections))]),
    websites: Object.freeze([
      ...new Map(
        values.flatMap((track) => track.websites).map((site) => [site.url, site]),
      ).values(),
    ]),
    sourceURLs: Object.freeze([...new Set(values.flatMap((track) => track.sourceURLs))]),
    sourceCredits: Object.freeze(
      values.map((track) =>
        Object.freeze({
          sourceURL: track.sourceURLs[0],
          title: track.title,
          artist: track.artist,
          license: track.rights.license,
          licenseURL:
            track.rights.evidence?.licenseURL ??
            track.websites.find((site) => LICENSES.has(site.url))?.url ??
            null,
          rightsEvidenceURL: track.rights.source,
          recordingURL: track.url,
          credit: track.rights.credit ?? track.artist,
        }),
      ),
    ),
    rightsConflict,
    contentId: values.every((track) => track.contentId === false) ? false : 'unknown',
    recordingModeEligible: !rightsConflict && values.every(onlineSoundtrackRecordingAllowed),
    rights: licensed
      ? first.rights
      : Object.freeze({
          ...first.rights,
          kind: 'unknown',
          license: 'Unknown — uploader-confirmed rights',
          evidence: null,
        }),
  });
  RESOLVED_TRACKS.add(resolved);
  MERGED_TRACKS.set(resolved, Object.freeze([...values]));
  return resolved;
}

function externalDelivery(value, url) {
  catalogueExactKeys(
    value,
    ['type', 'verifiedAt', 'rangeRequests', 'cors'],
    'online soundtrack external delivery',
  );
  catalogueRequired(
    value?.type === 'external-url' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.verifiedAt) &&
      value.rangeRequests === true &&
      value.cors === true &&
      externalRecordingURL(url),
    'audioDeliveryInvalid',
    'Online soundtrack external delivery evidence is invalid.',
  );
  return Object.freeze({ ...value });
}

function secureURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function text(value, label, maximum = 2048) {
  catalogueRequired(
    typeof value === 'string' &&
      value.trim() === value &&
      value.length >= 1 &&
      value.length <= maximum,
    'invalidField',
    `Online soundtrack ${label} is invalid.`,
    { field: label },
  );
  return value;
}

function normalizedText(value, label, maximum = 2048) {
  return text(typeof value === 'string' ? value.trim() : value, label, maximum);
}

function originalFileName(value) {
  catalogueRequired(
    typeof value === 'string' &&
      value.trim().length >= 1 &&
      value.length <= 300 &&
      !/[\u0000-\u001f\u007f]/.test(value),
    'invalidField',
    'Online soundtrack filename is invalid.',
    { field: 'filename' },
  );
  return value;
}

function structuredRights(value, legacy, id, allowUnknown) {
  if (allowUnknown && legacy.licenseURL === null) {
    catalogueExactKeys(
      value,
      [
        'licenseId',
        'licenseVersion',
        'licenseURL',
        'rightsEvidenceURL',
        'attribution',
        'derivativeChangeNotice',
        'permissionBasis',
        'shareAlike',
      ],
      'optional soundtrack rights',
    );
    catalogueExactKeys(
      value?.shareAlike,
      ['required', 'deliveryLicenseId', 'deliveryLicenseVersion', 'deliveryLicenseURL'],
      'optional soundtrack share-alike rights',
    );
    catalogueRequired(
      value?.licenseId === 'UNKNOWN' &&
        value.licenseVersion === null &&
        value.licenseURL === null &&
        normalizedText(value.rightsEvidenceURL, 'rights evidence URL') === legacy.source &&
        normalizedText(value.attribution, 'rights attribution') === legacy.credit &&
        value.permissionBasis === 'uploader-confirmed-public-redistribution-and-web-playback' &&
        Object.values(value.shareAlike).every((entry) => entry === null),
      'rightsMismatch',
      'Optional soundtrack uploader-confirmed rights are incomplete.',
    );
    return Object.freeze({
      ...value,
      derivativeChangeNotice: text(value.derivativeChangeNotice, 'derivative change notice'),
      shareAlike: Object.freeze({ ...value.shareAlike }),
    });
  }
  const identity = LICENSE_IDENTITIES.get(legacy.licenseURL);
  catalogueRequired(
    identity,
    'rightsLicenceUnsupported',
    `Online soundtrack rights licence is unsupported: ${id}.`,
    { id },
  );
  if (value === undefined) {
    catalogueRequired(
      !identity.shareAlike,
      'shareAlikeRequired',
      `Online soundtrack ShareAlike rights are required: ${id}.`,
      { id },
    );
    return null;
  }
  catalogueExactKeys(
    value,
    [
      'licenseId',
      'licenseVersion',
      'licenseURL',
      'rightsEvidenceURL',
      'attribution',
      'derivativeChangeNotice',
      'shareAlike',
      'permissionBasis',
    ],
    'online soundtrack rights',
  );
  const evidence = normalizedText(value.rightsEvidenceURL, 'rights evidence URL');
  const attribution = normalizedText(value.attribution, 'rights attribution');
  catalogueRequired(
    value.licenseId === identity.id &&
      value.licenseVersion === identity.version &&
      value.licenseURL === legacy.licenseURL &&
      evidence === legacy.source &&
      attribution === legacy.credit &&
      secureURL(evidence),
    'rightsMismatch',
    `Online soundtrack rights differ from the trusted recording metadata: ${id}.`,
    { id },
  );
  const derivativeChangeNotice = text(
    value.derivativeChangeNotice,
    'derivative change notice',
    2048,
  );
  catalogueExactKeys(
    value.shareAlike,
    ['required', 'deliveryLicenseId', 'deliveryLicenseVersion', 'deliveryLicenseURL'],
    'online soundtrack share-alike rights',
  );
  const shareAlike = value.shareAlike;
  catalogueRequired(
    shareAlike.required === identity.shareAlike &&
      (identity.shareAlike
        ? shareAlike.deliveryLicenseId === identity.id &&
          shareAlike.deliveryLicenseVersion === identity.version &&
          shareAlike.deliveryLicenseURL === legacy.licenseURL
        : shareAlike.deliveryLicenseId === null &&
          shareAlike.deliveryLicenseVersion === null &&
          shareAlike.deliveryLicenseURL === null),
    'shareAlikeInvalid',
    `Online soundtrack share-alike rights are invalid: ${id}.`,
    { id },
  );
  return Object.freeze({
    licenseId: identity.id,
    licenseVersion: identity.version,
    licenseURL: legacy.licenseURL,
    evidence,
    attribution: legacy.credit,
    derivativeChangeNotice,
    shareAlike: Object.freeze({ ...shareAlike }),
  });
}

function track(value, ids, hashes, state) {
  catalogueExactKeys(
    value,
    [
      'id',
      'title',
      'artist',
      'durationSeconds',
      'tags',
      'source',
      'license',
      'licenseURL',
      'credit',
      'fileName',
      'archiveId',
      'collection',
      'collections',
      'status',
      'listeningApproval',
      'gameCatalogueAdmission',
      'contentId',
      'recordingModeEligible',
      'default',
      'audio',
      'aliases',
      'rights',
      ...(Object.hasOwn(value, 'visibility') ? ['visibility'] : []),
    ],
    'online soundtrack track',
  );
  const id = text(value.id, 'identity', 160);
  catalogueRequired(
    !ids.has(id),
    'duplicateIdentity',
    'Online soundtrack identities must be unique.',
  );
  ids.add(id);
  catalogueRequired(
    value.durationSeconds === null ||
      (Number.isFinite(value.durationSeconds) &&
        value.durationSeconds > 0 &&
        value.durationSeconds <= 3600),
    'durationInvalid',
    `Online soundtrack duration is invalid: ${id}.`,
    { id },
  );
  catalogueRequired(
    Array.isArray(value.tags) &&
      value.tags.length <= 32 &&
      value.tags.every((tag) => typeof tag === 'string' && tag.trim() === tag && tag.length <= 100),
    'tagsInvalid',
    `Online soundtrack tags are invalid: ${id}.`,
    { id },
  );
  const source = normalizedText(value.source, 'source');
  catalogueRequired(
    secureURL(source),
    'sourceInvalid',
    `Online soundtrack source is invalid: ${id}.`,
    { id },
  );
  catalogueRequired(
    LICENSES.has(value.licenseURL) || (state.allowUnknown && value.licenseURL === null),
    'licenceUnsupported',
    `Online soundtrack licence is unsupported: ${id}.`,
    { id },
  );
  const licenseIdentity = LICENSE_IDENTITIES.get(value.licenseURL);
  catalogueRequired(
    licenseIdentity
      ? value.license === licenseIdentity.label
      : value.license === 'Unknown — uploader-confirmed rights',
    'licenceInvalid',
    `Online soundtrack licence is invalid: ${id}.`,
    { id },
  );
  catalogueRequired(
    value.gameCatalogueAdmission === false &&
      typeof value.status === 'string' &&
      typeof value.listeningApproval === 'string',
    'reviewInvalid',
    `Online soundtrack review status is invalid: ${id}.`,
    { id },
  );
  catalogueRequired(
    [true, false, null, 'unknown'].includes(value.contentId) &&
      typeof value.recordingModeEligible === 'boolean' &&
      (!value.recordingModeEligible || value.contentId === false),
    'recordingPolicyInvalid',
    `Online soundtrack recording policy is invalid: ${id}.`,
    { id },
  );
  catalogueRequired(
    value.default === undefined || value.default === false,
    'defaultPolicyInvalid',
    `Online soundtrack default policy is invalid: ${id}.`,
    { id },
  );
  catalogueExactKeys(
    value.audio,
    ['path', 'bytes', 'sha256', ...(Object.hasOwn(value.audio, 'delivery') ? ['delivery'] : [])],
    'online soundtrack audio',
  );
  const delivery = value.audio.delivery
    ? externalDelivery(value.audio.delivery, value.audio.path)
    : null;
  catalogueRequired(
    HASH.test(value.audio.sha256) &&
      (delivery
        ? externalRecordingURL(value.audio.path) &&
          (state.baseURL === BASE_URL ||
            onlineSoundtrackRecordingURL(value.audio.path, value.audio.sha256, state.baseURL))
        : onlineSoundtrackRecordingURL(
            new URL(value.audio.path, state.baseURL).href,
            value.audio.sha256,
            state.baseURL,
          )) &&
      Number.isSafeInteger(value.audio.bytes) &&
      value.audio.bytes > 0 &&
      value.audio.bytes <= 100_000_000 &&
      !hashes.has(value.audio.sha256),
    'audioIdentityInvalid',
    `Online soundtrack audio identity is invalid: ${id}.`,
    { id },
  );
  hashes.add(value.audio.sha256);
  catalogueRequired(
    Array.isArray(value.aliases) && value.aliases.length <= 16,
    'aliasesInvalid',
    `Online aliases are invalid: ${id}.`,
    { id },
  );
  const credit = normalizedText(value.credit, 'credit');
  const collection = text(value.collection, 'collection', 200);
  const collections = value.collections ?? [collection];
  catalogueRequired(
    Array.isArray(collections) &&
      collections.length >= 1 &&
      collections.length <= 16 &&
      new Set(collections).size === collections.length &&
      collections.every(
        (item) =>
          typeof item === 'string' &&
          item.trim() === item &&
          item.length >= 1 &&
          item.length <= 200,
      ),
    'collectionsInvalid',
    `Online soundtrack collections are invalid: ${id}.`,
    { id },
  );
  catalogueRequired(
    value.visibility === undefined || value.visibility === 'review-only',
    'visibilityInvalid',
    `Online soundtrack visibility is invalid: ${id}.`,
    { id },
  );
  const rightsEvidence = structuredRights(
    value.rights,
    { licenseURL: value.licenseURL, source, credit },
    id,
    state.allowUnknown,
  );
  const resolved = Object.freeze({
    id: `online.${value.audio.sha256}`,
    archiveTrackId: id,
    kind: 'remote',
    title: text(value.title, 'title', 200),
    artist: text(value.artist, 'artist', 200),
    durationSeconds: value.durationSeconds,
    tags: Object.freeze([...value.tags]),
    collection,
    collections: Object.freeze([...collections]),
    fileName: originalFileName(value.fileName),
    url: new URL(value.audio.path, state.baseURL).href,
    sourceURLs: Object.freeze([state.url]),
    bytes: value.audio.bytes,
    sha256: value.audio.sha256,
    delivery,
    contentId: licenseIdentity ? value.contentId : 'unknown',
    recordingModeEligible: Boolean(licenseIdentity) && value.recordingModeEligible,
    websites: Object.freeze([
      Object.freeze({ label: 'Creator source', url: source }),
      ...(value.licenseURL
        ? [Object.freeze({ label: value.license ?? 'Recording licence', url: value.licenseURL })]
        : []),
    ]),
    rights: Object.freeze({
      kind: licenseIdentity ? 'licensed' : 'unknown',
      credit,
      license: value.license,
      source,
      evidence: rightsEvidence,
    }),
  });
  TRACK_AUTHORITIES.set(resolved, { state, fetched: false, identity: canonicalJSON(resolved) });
  return { resolved, visibility: value.visibility };
}

function hasDisclosedLicense(value) {
  return (
    LICENSES.has(value?.licenseURL) &&
    typeof value.license === 'string' &&
    value.license.trim().length > 0 &&
    !/^unknown\b/i.test(value.license.trim()) &&
    (value.rights === undefined ||
      (typeof value.rights?.licenseId === 'string' &&
        value.rights.licenseId.trim().length > 0 &&
        !/^unknown\b/i.test(value.rights.licenseId.trim()) &&
        typeof value.rights.licenseURL === 'string' &&
        value.rights.licenseURL.trim().length > 0))
  );
}

export function resolveOnlineSoundtrackCatalogue(
  source,
  { sourceAuthority = MAIN_AUTHORITY } = {},
) {
  const state = sourceState(sourceAuthority);
  const value = catalogueJSON(source);
  catalogueExactKeys(
    value,
    ['format', 'archive', 'sources', 'counts', 'tracks'],
    'online soundtrack catalogue',
  );
  catalogueRequired(
    value.format === FORMAT,
    'unsupported',
    'Unsupported online soundtrack catalogue.',
  );
  catalogueExactKeys(value.archive, ['id', 'baseURL'], 'online soundtrack archive');
  catalogueRequired(
    typeof value.archive.id === 'string' &&
      /^[a-z0-9][a-z0-9-]{0,63}$/.test(value.archive.id) &&
      (state.url !== ONLINE_SOUNDTRACK_CATALOGUE_URL ||
        value.archive.id === 'revealline-soundtracks') &&
      value.archive.baseURL === state.baseURL,
    'archiveInvalid',
    'Online soundtrack catalogue must use the project archive.',
  );
  catalogueRequired(
    Array.isArray(value.sources) && value.sources.length <= 32,
    'sourcesInvalid',
    'Online soundtrack sources are invalid.',
  );
  catalogueExactKeys(
    value.counts,
    ['declaredTracks', 'uniqueRecordings', 'duplicateAliases', 'audioBytes'],
    'online soundtrack counts',
  );
  catalogueRequired(
    Array.isArray(value.tracks) && value.tracks.length <= 512,
    'listTooLarge',
    'Online soundtrack list is too large.',
  );
  const ids = new Set(),
    hashes = new Set(),
    // Quarantine missing/unknown/unsupported licences before resolving playback
    // metadata. Uploader confirmation never substitutes for a source licence.
    parsedTracks = value.tracks
      .filter(
        (entry) =>
          hasDisclosedLicense(entry) ||
          (state.allowUnknown &&
            entry?.licenseURL === null &&
            entry.license === 'Unknown — uploader-confirmed rights'),
      )
      .map((entry) => track(entry, ids, hashes, state));
  catalogueRequired(
    value.tracks.every(
      (entry) =>
        Number.isSafeInteger(entry?.audio?.bytes) &&
        entry.audio.bytes > 0 &&
        entry.audio.bytes <= 100_000_000,
    ) &&
      value.counts.uniqueRecordings === value.tracks.length &&
      value.counts.declaredTracks >= value.tracks.length &&
      value.counts.duplicateAliases === value.counts.declaredTracks - value.tracks.length &&
      value.counts.audioBytes === value.tracks.reduce((sum, entry) => sum + entry.audio.bytes, 0),
    'countsMismatch',
    'Online soundtrack counts differ from the recording list.',
  );
  const tracks = parsedTracks
    .filter(({ visibility }) => visibility !== 'review-only')
    .map(({ resolved }) => resolved);
  for (const entry of tracks) RESOLVED_TRACKS.add(entry);
  return Object.freeze({
    format: FORMAT,
    tracks: Object.freeze(tracks),
    counts: Object.freeze({ ...value.counts }),
  });
}

export async function fetchOnlineSoundtrackCatalogue({
  fetch: request = globalThis.fetch,
  signal,
  sourceAuthority = MAIN_AUTHORITY,
  url = SOURCE_AUTHORITIES.get(sourceAuthority)?.url,
  preparation = null,
  onResolved = () => {},
} = {}) {
  const state = sourceState(sourceAuthority);
  catalogueRequired(
    url === state.url,
    'urlInvalid',
    'Online soundtracks require the project catalogue URL.',
  );
  throwIfSoundtrackAborted(signal);
  const read = async () => {
    throwIfSoundtrackAborted(signal);
    const response = await request(url, {
      signal,
      redirect: 'error',
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
    });
    catalogueRequired(
      response?.status === 200 && !response.redirected && response.url === url,
      'directResponseRequired',
      'Online soundtrack catalogue needs a direct HTTP 200 response.',
    );
    const length = response.headers.get('content-length');
    catalogueRequired(
      length === null || (/^[0-9]+$/.test(length) && Number(length) <= MAX_BYTES),
      'byteLimit',
      'Online soundtrack catalogue exceeds its byte limit.',
    );
    const reader = response.body?.getReader?.();
    catalogueRequired(
      reader,
      'responseUnreadable',
      'Online soundtrack catalogue response cannot be read safely.',
    );
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        throwIfSoundtrackAborted(signal);
        const { done, value } = await reader.read();
        if (done) break;
        catalogueRequired(
          value instanceof Uint8Array,
          'responseInvalid',
          'Online soundtrack catalogue response is invalid.',
        );
        size += value.byteLength;
        if (size > MAX_BYTES) {
          try {
            await reader.cancel('Online soundtrack catalogue exceeds its byte limit.');
          } catch {
            // The byte limit remains authoritative even if cancellation is unavailable.
          }
          throw catalogueFailure(
            'byteLimit',
            'Online soundtrack catalogue exceeds its byte limit.',
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock?.();
    }
    throwIfSoundtrackAborted(signal);
    return { chunks, size };
  };
  // Release the network slot before waiting for a safe main-thread phase.
  const { chunks, size } = preparation
    ? await preparation.run('fetch', read, { signal })
    : await read();
  const accept = () => {
    throwIfSoundtrackAborted(signal);
    sourceState(sourceAuthority);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let source;
    try {
      source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error) {
      throw catalogueFailure(
        'responseInvalid',
        'Online soundtrack catalogue response is invalid.',
        undefined,
        error,
      );
    }
    const catalogue = resolveOnlineSoundtrackCatalogue(source, { sourceAuthority });
    state.members = new Map(
      catalogue.tracks.map((entry) => [entry.sha256, TRACK_AUTHORITIES.get(entry).identity]),
    );
    for (const entry of catalogue.tracks) TRACK_AUTHORITIES.get(entry).fetched = true;
    // Authority adoption and synchronous subscribers share this admitted turn.
    // Deferring publication separately could invalidate an active older playlist.
    onResolved(catalogue);
    return catalogue;
  };
  return preparation ? preparation.run('main', accept, { signal }) : accept();
}

export async function fetchVerifiedOnlineSoundtrack(
  track,
  { fetch: request = globalThis.fetch, signal } = {},
) {
  catalogueRequired(
    onlineSoundtrackOfflineAllowed(track) && track.delivery?.type === 'external-url',
    'audioDeliveryInvalid',
    'Only a verified external soundtrack recording can be installed directly.',
  );
  throwIfSoundtrackAborted(signal);
  let response;
  try {
    response = await request(track.url, {
      signal,
      redirect: 'error',
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
      headers: { Range: `bytes=0-${track.bytes - 1}` },
    });
  } catch (error) {
    throw catalogueFailure(
      'responseUnreadable',
      'This recording is stream-only because its host no longer permits verified browser fetching.',
      undefined,
      error,
    );
  }
  catalogueRequired(
    [200, 206].includes(response?.status) && !response.redirected && response.url === track.url,
    'directResponseRequired',
    'External soundtrack installation needs a direct stable response.',
  );
  const declared = response.headers.get('content-length');
  catalogueRequired(
    declared === null || (/^[0-9]+$/.test(declared) && Number(declared) === track.bytes),
    'countsMismatch',
    'External soundtrack byte count changed.',
  );
  const reader = response.body?.getReader?.();
  catalogueRequired(
    reader,
    'responseUnreadable',
    'External soundtrack response cannot be read safely.',
  );
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      throwIfSoundtrackAborted(signal);
      const { done, value } = await reader.read();
      if (done) break;
      catalogueRequired(
        value instanceof Uint8Array,
        'responseInvalid',
        'External soundtrack response is invalid.',
      );
      size += value.byteLength;
      if (size > track.bytes) {
        try {
          await reader.cancel('External soundtrack exceeds its verified byte count.');
        } catch {}
        throw catalogueFailure('countsMismatch', 'External soundtrack byte count changed.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  throwIfSoundtrackAborted(signal);
  catalogueRequired(
    bytes.byteLength === track.bytes,
    'countsMismatch',
    'External soundtrack download was truncated.',
  );
  const actual = [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  throwIfSoundtrackAborted(signal);
  catalogueRequired(
    actual === track.sha256,
    'audioIdentityInvalid',
    'External soundtrack SHA-256 changed.',
  );
  catalogueRequired(
    onlineSoundtrackOfflineAllowed(track),
    'audioDeliveryInvalid',
    'The soundtrack source no longer permits this installation.',
  );
  return new Blob([bytes], { type: 'audio/mpeg' });
}
