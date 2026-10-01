import { boundedJSON, canonicalJSON, exactKeys, required } from '../data-json.mjs';
import { LIBRARY_MODES, LIBRARY_TAGS, libraryMissionId } from './library.mjs';

const METHODS = [
  'describe',
  'presentation',
  'availability',
  'prepare',
  'progress',
  'progressState',
  'completion',
  'card',
  'details',
  'launch',
];
const label = (value, maximum = 160) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;

function describe(source, entry, mode) {
  const info = boundedJSON(source.describe.call(source.receiver, entry), {
    maxBytes: 16384,
    maxNodes: 128,
    maxDepth: 4,
    maxString: 2048,
  });
  exactKeys(
    info,
    [
      'id',
      'revision',
      'campaignKey',
      'campaignTitle',
      'name',
      'levelIndex',
      'canonicalLevelKey',
      'globalLevelNumber',
      'campaignLevelCount',
      'modes',
      'tags',
      'rules',
      'hook',
    ],
    'Journey display mission',
  );
  required(
    label(info.campaignTitle) &&
      label(info.name) &&
      Number.isSafeInteger(info.levelIndex) &&
      info.levelIndex >= 0 &&
      Array.isArray(info.modes) &&
      info.modes.includes(mode) &&
      new Set(info.modes).size === info.modes.length &&
      info.modes.every((value) => LIBRARY_MODES.includes(value)),
    'Journey source must describe an exact mission qualified for its declared mode.',
  );
  const tags = info.tags ?? [];
  required(
    Array.isArray(tags) &&
      tags.every((tag) => LIBRARY_TAGS.includes(tag) && !['Classic', 'Custom'].includes(tag)),
    'Journey source has invalid display tags.',
  );
  for (const key of ['rules', 'hook'])
    required(
      info[key] === undefined || typeof info[key] === 'string',
      'Journey display text must be a string.',
    );
  required(
    info.revision === undefined ||
      typeof info.revision === 'string' ||
      Number.isSafeInteger(info.revision),
    'Journey display revision must be a string or integer.',
  );
  const common = Object.freeze({
    id: info.id,
    revision: String(info.revision ?? ''),
    campaignKey: info.campaignKey,
    campaignTitle: info.campaignTitle,
    name: info.name,
    levelIndex: info.levelIndex,
    canonicalLevelKey: info.canonicalLevelKey,
    globalLevelNumber: info.globalLevelNumber,
    campaignLevelCount: info.campaignLevelCount,
    tags: Object.freeze([...tags]),
    rules: info.rules ?? '',
    hook: info.hook ?? '',
  });
  const id = libraryMissionId({
    owner: source.id,
    edition: source.editionId,
    campaign: common.campaignKey,
    mission: common.id,
    revision: common.revision,
  });
  return { id, common };
}

/** Compose already compiler-qualified Journey sources for one exact edition.
 * Display tokens are NOT runtime missions. Each mode delegates to its own
 * original entry and adapters; no artwork, geometry, progress or Next is made
 * here. A metadata match never grants an unbound mode gameplay authority.
 */
export function combineJourneyLibrarySources(qualifiedSources) {
  required(
    Array.isArray(qualifiedSources) &&
      qualifiedSources.length > 0 &&
      qualifiedSources.length <= LIBRARY_MODES.length,
    'Provide one to three mode-qualified Journey sources.',
  );
  const byId = new Map(),
    bindings = new WeakMap(),
    modes = new Set();
  let identity = null;
  for (const qualified of qualifiedSources) {
    const { mode, source } = qualified ?? {};
    required(
      LIBRARY_MODES.includes(mode) && !modes.has(mode),
      'Each Journey mode needs one source.',
    );
    modes.add(mode);
    required(
      source?.collection === 'Journey' &&
        label(source.editionId, 1024) &&
        source.id === `journey:${source.editionId}` &&
        label(source.edition) &&
        Array.isArray(source.entries) &&
        source.entries.length <= 4096 &&
        ['describe', 'availability', 'launch'].every((key) => typeof source[key] === 'function') &&
        METHODS.every((key) => source[key] === undefined || typeof source[key] === 'function'),
      'Only validated Journey source adapters can be combined.',
    );
    const header = {
      id: source.id,
      editionId: source.editionId,
      edition: source.edition,
      collection: 'Journey',
      lifecycle: source.lifecycle ?? 'current',
    };
    if (identity)
      required(
        canonicalJSON(header) === canonicalJSON(identity),
        'Journey sources must belong to the same exact edition.',
      );
    else identity = header;
    // Capture adapter functions once, without cloning or interpreting the
    // original runtime objects their validators own.
    const owner = Object.freeze({
      ...header,
      receiver: source,
      ...Object.fromEntries(METHODS.map((key) => [key, source[key]])),
    });
    const seen = new Set();
    for (const entry of [...source.entries]) {
      const { id, common } = describe(owner, entry, mode);
      required(!seen.has(id), 'A Journey mode contains a duplicate exact mission.');
      seen.add(id);
      let record = byId.get(id);
      if (record)
        required(
          canonicalJSON(record.common) === canonicalJSON(common),
          'Journey mission metadata differs between modes for the same identity.',
        );
      else {
        record = { id, common, token: Object.freeze({}), modes: new Map(), description: null };
        byId.set(id, record);
        bindings.set(record.token, record);
        required(byId.size <= 4096, 'The combined Journey contains too many missions.');
      }
      record.modes.set(mode, Object.freeze({ owner, entry }));
    }
  }
  const entries = Object.freeze(
    [...byId.values()].map((record) => {
      record.description = Object.freeze({
        ...record.common,
        modes: Object.freeze(LIBRARY_MODES.filter((mode) => record.modes.has(mode))),
      });
      return record.token;
    }),
  );
  function owned(entry) {
    const record = bindings.get(entry);
    required(record, 'Unknown Journey display binding.');
    return record;
  }
  function delegate(entry, mode, method, context) {
    const record = owned(entry),
      binding = record.modes.get(mode);
    required(binding, 'This Journey mission has no qualified source for that mode.');
    if (method === 'launch' || method === 'prepare') {
      required(
        context?.libraryMissionId === undefined || context.libraryMissionId === record.id,
        'Journey launch context belongs to another display mission.',
      );
      required(
        typeof binding.owner[method] === 'function',
        `This Journey source cannot ${method} a mission.`,
      );
      return binding.owner[method].call(binding.owner.receiver, binding.entry, context);
    }
    return binding.owner[method]?.call(binding.owner.receiver, binding.entry, mode);
  }
  return Object.freeze({
    ...identity,
    entries,
    describe: (entry) => owned(entry).description,
    // Common display metadata was checked for equality across modes above.
    // Keep its locale projection delegated to an exact original entry too.
    presentation: (entry) => delegate(entry, owned(entry).description.modes[0], 'presentation'),
    availability: (entry, mode) => delegate(entry, mode, 'availability'),
    progress: (entry, mode) => delegate(entry, mode, 'progress') ?? '',
    progressState: (entry, mode) =>
      delegate(entry, mode, 'progressState') ?? { state: 'new', bestStars: null },
    completion: (entry, mode) => delegate(entry, mode, 'completion') ?? null,
    card: (entry, mode) => delegate(entry, mode, 'card') ?? null,
    details: (entry, mode) => delegate(entry, mode, 'details') ?? null,
    prepare: (entry, context) => delegate(entry, context?.mode, 'prepare', context),
    launch: (entry, context) => delegate(entry, context?.mode, 'launch', context),
  });
}
