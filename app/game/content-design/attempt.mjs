import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { validateTheme } from '../content.mjs';
import { createRun, CLASSES } from '../core/index.mjs';
import { TURN_POLICIES } from '../core/registry.mjs';
import { createRecorder } from '../replay.mjs';
import { freezeDesign } from './catalogs.mjs';
import { createContentExecutionCatalog } from './execution.mjs';
import { loadPreviewArtwork, verifiedPreviewBackground } from './assets.mjs';
import { acquireCandidatePicture } from './picture.mjs';
import { applyGameplayTuning, validateGameplayTuning } from '../gameplay-tuning.mjs';
import { CONTENT_ATTEMPT_PREPARATION_TIMEOUT_MS } from './limits.mjs';

const cancelled = () => new DOMException('Candidate preparation cancelled.', 'AbortError');

/** Prepare, never adopt. A host must additionally retain its own run/focus/save
 * ownership before replacing a flight. This boundary has no storage, awards,
 * library projection or UI side effects. The mutable run and recorder are new
 * for each request; immutable design and presentation are owned snapshots.
 * Solo only: paired-board hosts must retain their separate race coordinator. */
export function createContentAttemptPreparer(
  source,
  {
    packIds,
    themes,
    buildVersion = 'dev',
    loadArtwork = loadPreviewArtwork,
    decodeImage,
    timeoutMs = CONTENT_ATTEMPT_PREPARATION_TIMEOUT_MS,
  } = {},
) {
  required(
    Number.isFinite(timeoutMs) &&
      timeoutMs > 0 &&
      timeoutMs <= CONTENT_ATTEMPT_PREPARATION_TIMEOUT_MS,
    'Invalid candidate preparation timeout.',
  );
  required(typeof loadArtwork === 'function', 'Candidate preparation needs an artwork loader.');
  required(
    decodeImage === undefined || typeof decodeImage === 'function',
    'Candidate preparation needs a picture decoder.',
  );
  required(
    typeof buildVersion === 'string' && buildVersion.length > 0 && buildVersion.length <= 80,
    'Invalid candidate build version.',
  );
  const catalog = createContentExecutionCatalog(source, {
    ...(packIds === undefined ? {} : { packIds }),
    mode: 'solo',
  });
  const ownedThemes = boundedJSON(themes, { maxBytes: 262144, maxNodes: 8192, maxDepth: 12 });
  required(Array.isArray(ownedThemes) && ownedThemes.length > 0, 'Candidate themes are required.');
  const themeById = new Map();
  for (const theme of ownedThemes) {
    const result = validateTheme(theme);
    required(result.valid, result.errors.join(' '));
    required(!themeById.has(theme.id), 'Duplicate candidate theme.');
    themeById.set(theme.id, freezeDesign(theme));
  }
  const missionById = new Map(catalog.journey().missions.map((mission) => [mission.id, mission]));
  let disposed = false,
    generation = 0,
    pending = null,
    prepared = null;
  const cancel = () => {
    generation++;
    const retired = prepared;
    prepared = null;
    const previous = pending;
    pending = null;
    previous?.abort();
    retired?.picture?.release();
  };
  async function prepare(request, { signal, onStatus = () => {}, gameplayTuning } = {}) {
    required(!disposed, 'Candidate preparer is disposed.');
    const selected = boundedJSON(request, { maxBytes: 4096, maxNodes: 12, maxDepth: 1 });
    exactKeys(selected, ['missionId', 'difficulty', 'seed', 'turnPolicy'], 'candidate attempt');
    const mission = missionById.get(selected.missionId);
    required(mission, 'Choose a mission from this candidate catalog.');
    required(
      Number.isInteger(selected.seed) && selected.seed >= 0 && selected.seed <= 0xffffffff,
      'Candidate seed must be an unsigned 32-bit integer.',
    );
    required(TURN_POLICIES.includes(selected.turnPolicy), 'Unsupported candidate steering policy.');
    required(typeof selected.difficulty === 'string', 'Choose an explicit candidate difficulty.');
    const tuning = gameplayTuning === undefined ? null : validateGameplayTuning(gameplayTuning);
    required(
      !tuning || tuning.difficulty === selected.difficulty,
      'Candidate tuning difficulty must match its selection.',
    );
    const entry = catalog.select(mission.packId, mission.campaignId, selected.difficulty);
    const levelIndex = entry.campaign.levels.findIndex((level) => level.id === mission.levelId);
    const manifest = entry.manifests[levelIndex];
    const theme = themeById.get(manifest.presentation.themeId);
    required(theme, 'This candidate’s exact presentation theme is unavailable.');
    // A rejected request does not retire a valid prepared replacement.
    if (signal?.aborted) throw cancelled();
    const ticket = generation + 1;
    cancel();
    // An abort listener from the retired request may start a newer request.
    const controller = new AbortController();
    if (disposed || pending || generation !== ticket) throw cancelled();
    pending = controller;
    const check = () => {
      if (disposed || controller.signal.aborted || generation !== ticket) throw cancelled();
    };
    const report = (stage, message) => {
      check();
      try {
        onStatus({ status: 'preparing', stage, message });
      } catch {
        // A presentation observer does not own preparation.
      }
      check();
    };
    let timer,
      abort,
      candidatePicture = null;
    const stopped = new Promise((_, reject) => {
      abort = () => {
        reject(cancelled());
        controller.abort();
      };
      controller.signal.addEventListener('abort', () => reject(cancelled()), { once: true });
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => {
        reject(new Error('Candidate preparation timed out. The current flight is unchanged.'));
        controller.abort();
      }, timeoutMs);
    });
    try {
      const result = await Promise.race([
        stopped,
        Promise.resolve().then(async () => {
          report('verifying', 'Checking the exact authored mission and picture…');
          const media = manifest.background
            ? await loadArtwork(manifest.background, { signal: controller.signal })
            : null;
          check();
          const visualOverrides = manifest.background
            ? { background: verifiedPreviewBackground(manifest.background, media) }
            : {};
          if (manifest.background) {
            report('decoding', 'Opening this mission’s verified original picture…');
            candidatePicture = await acquireCandidatePicture(manifest.background, {
              signal: controller.signal,
              loadArtwork: async () => media,
              decodeImage,
            });
            check();
          }
          report('preparing', 'Preparing the authored rules without changing the current flight…');
          const options = {
            seed: selected.seed,
            turnPolicy: selected.turnPolicy,
            classId: 'scout',
            classRecipes: CLASSES,
          };
          const run = createRun(
            tuning ? applyGameplayTuning(manifest.level, tuning) : manifest.level,
            options,
          );
          const recorder = createRecorder(run.level, options, buildVersion);
          check();
          return Object.freeze({
            format: 'PreparedCandidateAttemptV1',
            selection: freezeDesign({ ...selected }),
            mission,
            entry,
            manifest,
            levelIndex,
            theme,
            visualOverrides: freezeDesign(visualOverrides),
            picture: candidatePicture,
            run,
            recorder,
            ...(tuning ? { tuning } : {}),
            officialProgressEligible: false,
          });
        }),
      ]);
      check();
      prepared = result;
      candidatePicture = null;
      return result;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (pending === controller) pending = null;
      controller.abort();
      candidatePicture?.release();
    }
  }
  return Object.freeze({
    catalog,
    prepare,
    cancel,
    current: (candidate) => !disposed && candidate != null && candidate === prepared,
    take(candidate) {
      required(
        !disposed && candidate != null && candidate === prepared,
        'Candidate is no longer current.',
      );
      // Transfer exactly once. The accepting host now owns picture.release(),
      // including when its own adoption fails after this point.
      prepared = null;
      return candidate;
    },
    dispose() {
      disposed = true;
      cancel();
    },
  });
}
