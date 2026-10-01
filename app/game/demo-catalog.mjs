import { withDemoLoadingDeadline } from './demo-loading.mjs';
import { boundedJSON, dataIdentity, exactKeys, required, stableId } from './data-json.mjs';
import { normalizedLevel } from './core/level.mjs';
import { CLASSES } from './core/registry.mjs';
import { campaignKey } from './library.mjs';
import { snapshotReplay, MAX_REPLAY_BYTES } from './replay.mjs';
import { applyGameplayTuning, recoverGameplayTuning } from './gameplay-tuning.mjs';

export const DEMO_CATALOG_VERSION = 'revealline-demo-catalog.v1';
export const DEMO_CATALOG_URL = new URL('./demo-data/catalog.json', import.meta.url);

/** Presentation metadata is separate from the strict portable replay format. */
export function demoIdentity(level, classRecipes = CLASSES) {
  return dataIdentity({ level: normalizedLevel(level), classRecipes });
}

/** Runtime variants may differ only in their independently recorded outcomes. */
export function demoInputTraceIdentity(replay) {
  return dataIdentity(
    Object.fromEntries(
      ['version', 'ruleset', 'level', 'options', 'segments', 'ticks', 'releaseAfter'].map((key) => [
        key,
        replay[key],
      ]),
    ),
  );
}

const bundledReplayURL = (value) =>
  typeof value === 'string' && /^\.\/demo-data\/[a-z0-9][a-z0-9.-]*\.replay\.json$/.test(value);

export function validateDemoCatalog(source) {
  const catalog = boundedJSON(source, {
    maxBytes: 256 * 1024,
    maxNodes: 16000,
    maxDepth: 8,
    maxArray: 128,
    maxString: 512,
  });
  exactKeys(catalog, ['format', 'clips'], 'demo catalogue');
  required(
    catalog.format === DEMO_CATALOG_VERSION && Array.isArray(catalog.clips),
    'Invalid demo catalogue.',
  );
  const ids = new Set();
  for (const clip of catalog.clips) {
    exactKeys(
      clip,
      [
        'id',
        'campaignId',
        'campaignKey',
        'levelId',
        'levelRevision',
        'identity',
        'recordingIdentity',
        'inputTraceIdentity',
        'replayURL',
        'replayVariants',
        'title',
        'provenance',
        'tags',
        'durationSeconds',
        'turnPolicy',
      ],
      'demo clip',
    );
    required(
      stableId(clip.id) && !ids.has(clip.id) && stableId(clip.campaignId) && stableId(clip.levelId),
      'Invalid demo identity.',
    );
    ids.add(clip.id);
    required(
      typeof clip.campaignKey === 'string' &&
        clip.campaignKey.length <= 256 &&
        typeof clip.levelRevision === 'string' &&
        clip.levelRevision.length <= 80,
      'Invalid demo owner.',
    );
    required(/^[0-9a-f]{16}$/.test(clip.identity), 'Invalid demo map identity.');
    required(/^[0-9a-f]{16}$/.test(clip.recordingIdentity), 'Invalid demo recording identity.');
    required(/^[0-9a-f]{16}$/.test(clip.inputTraceIdentity), 'Invalid demo input trace identity.');
    required(bundledReplayURL(clip.replayURL), 'Demo recordings must use bundled relative URLs.');
    if (clip.replayVariants !== undefined)
      required(
        Array.isArray(clip.replayVariants) &&
          clip.replayVariants.length <= 3 &&
          clip.replayVariants.every(bundledReplayURL) &&
          new Set([clip.replayURL, ...clip.replayVariants]).size === clip.replayVariants.length + 1,
        'Demo variants must be distinct bounded bundled relative URLs.',
      );
    required(
      typeof clip.title === 'string' && clip.title.length > 0 && clip.title.length <= 160,
      'Invalid demo title.',
    );
    required(['authored', 'recorded'].includes(clip.provenance), 'Invalid demo provenance.');
    required(
      Array.isArray(clip.tags) && clip.tags.length <= 8 && clip.tags.every(stableId),
      'Invalid demo tags.',
    );
    required(
      Number.isFinite(clip.durationSeconds) &&
        clip.durationSeconds > 0 &&
        clip.durationSeconds <= 1800,
      'Invalid demo duration.',
    );
    required(['immediate', 'grid-center'].includes(clip.turnPolicy), 'Invalid demo steering.');
  }
  return catalog;
}

/** Fetch and body consumption share one deadline. Cancelling also releases an
 * eventual response from a transport which ignored the original signal. */
function loadBundledText(url, { fetch: fetcher, signal, maxBytes, label, ...loading }) {
  return withDemoLoadingDeadline(
    async (signal) => {
      const response = await fetcher(url, { signal });
      let bodyCancelled = false;
      const cancelBody = () => {
        if (bodyCancelled) return;
        bodyCancelled = true;
        try {
          Promise.resolve(response.body?.cancel?.()).catch(() => {});
        } catch {
          /* A locked native body is cancelled by the transport's abort signal. */
        }
      };
      if (signal.aborted) {
        cancelBody();
        throw signal.reason;
      }
      signal.addEventListener('abort', cancelBody, { once: true });
      try {
        if (!response.ok) throw new Error(`The demo ${label} could not load.`);
        if (Number(response.headers?.get?.('content-length')) > maxBytes)
          throw new Error(`The demo ${label} exceeds its size budget.`);
        return await response.text();
      } catch (error) {
        cancelBody();
        throw error;
      } finally {
        signal.removeEventListener('abort', cancelBody);
      }
    },
    { ...loading, signal },
  );
}

export async function loadDemoCatalog({
  fetch: fetcher = globalThis.fetch,
  signal,
  ...loading
} = {}) {
  const text = await loadBundledText(DEMO_CATALOG_URL, {
    ...loading,
    fetch: fetcher,
    signal,
    maxBytes: 256 * 1024,
    label: 'catalogue',
  });
  return validateDemoCatalog(text);
}

/** Only supplied installed entries are eligible. This never fetches a pack. */
export function resolveDemoCatalog(catalog, installedEntries) {
  const checked = validateDemoCatalog(catalog);
  const contexts = new Map();
  for (const entry of installedEntries) {
    if (!entry?.campaign) continue;
    const campaign = {
      ...entry.campaign,
      classRecipes: entry.classRecipes ?? entry.campaign.classRecipes ?? CLASSES,
    };
    contexts.set(campaignKey(campaign), { entry, campaign });
  }
  return checked.clips.flatMap((clip) => {
    const context = contexts.get(clip.campaignKey);
    if (!context || context.campaign.id !== clip.campaignId) return [];
    const level = context.campaign.levels.find((candidate) => candidate.id === clip.levelId);
    if (
      !level ||
      level.revision !== clip.levelRevision ||
      demoIdentity(level, context.campaign.classRecipes) !== clip.identity
    )
      return [];
    return [{ ...clip, entry: context.entry, level, source: 'curated' }];
  });
}

export function demoReplayMatchesEntry(replay, entry) {
  const level = entry?.campaign?.levels?.find((candidate) => candidate.id === replay?.level?.id);
  if (!level) return false;
  try {
    // A recovered recipe is metadata, never authority. Rebuild it from the
    // installed authored map and compare the entire normalized execution.
    const tuning = recoverGameplayTuning(replay.level);
    if (tuning?.adminOverride) return false;
    const expected = tuning ? applyGameplayTuning(level, tuning) : level;
    return (
      demoIdentity(expected, entry.classRecipes ?? entry.campaign.classRecipes ?? CLASSES) ===
      demoIdentity(replay.level, replay.options.classRecipes)
    );
  } catch {
    return false;
  }
}

/** Load only a resolved local/bundled descriptor. Playback still verifies its
 * final checkpoint before adopting it. No remote pack acquisition is possible. */
export async function loadDemoRecording(
  clip,
  { fetch: fetcher = globalThis.fetch, signal, ...loading } = {},
) {
  const check = () => {
    if (signal?.aborted) throw new DOMException('Demo loading cancelled.', 'AbortError');
  };
  check();
  let source = clip.source === 'local' ? clip.replay : null;
  if (!source) {
    required(bundledReplayURL(clip.replayURL), 'Demo recordings must use bundled relative URLs.');
    source = await loadBundledText(new URL(clip.replayURL, import.meta.url), {
      ...loading,
      fetch: fetcher,
      signal,
      maxBytes: MAX_REPLAY_BYTES,
      label: 'recording',
    });
  }
  check();
  const replay = snapshotReplay(source),
    actual = demoDescriptor(replay, clip.entry);
  required(
    replay.level.id === clip.levelId &&
      actual.identity === clip.identity &&
      actual.recordingIdentity === clip.recordingIdentity &&
      actual.inputTraceIdentity === clip.inputTraceIdentity &&
      actual.campaignKey === clip.campaignKey,
    'The demo recording no longer matches its installed catalogue entry.',
  );
  return replay;
}

export function demoDescriptor(replay, entry, { id, provenance = 'recorded' } = {}) {
  required(
    demoReplayMatchesEntry(replay, entry),
    'The recording does not match the installed level and equipment.',
  );
  const campaign = {
    ...entry.campaign,
    classRecipes: entry.classRecipes ?? entry.campaign.classRecipes ?? CLASSES,
  };
  const authoredLevel = campaign.levels.find((level) => level.id === replay.level.id);
  return {
    id:
      id ??
      `local-${dataIdentity({ campaignKey: campaignKey(campaign), checkpoint: replay.checkpoint.hash })}`,
    campaignId: campaign.id,
    campaignKey: campaignKey(campaign),
    levelId: replay.level.id,
    levelRevision: authoredLevel.revision,
    identity: demoIdentity(authoredLevel, campaign.classRecipes),
    recordingIdentity: demoIdentity(replay.level, replay.options.classRecipes),
    inputTraceIdentity: demoInputTraceIdentity(replay),
    title: authoredLevel.name || authoredLevel.id,
    provenance,
    tags: ['capture'],
    durationSeconds: replay.ticks / 120,
    turnPolicy: replay.options.turnPolicy,
  };
}
