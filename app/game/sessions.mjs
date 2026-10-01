import { createRun, releaseInputs } from './core/index.mjs';
import { resolveVersions, versionsForCampaign } from './core/versions.mjs';
import {
  createRecorder,
  exportReplay,
  recordRelease,
  verifyReplayAsync,
  takeReplayMasteryObserver,
  MAX_REPLAY_BYTES,
  MAX_REPLAY_TICKS,
} from './replay.mjs';
import { boundedJSON, exactKeys, stableId, required } from './data-json.mjs';
import { resolveMasteryDefinition } from './mastery.mjs';
import { matchRecordedGameplayTuning, recoverGameplayTuning } from './gameplay-tuning.mjs';
import { snapshotSessionVisualPin } from './session-visual-pin.mjs';
import { snapshotSessionActorPin } from './session-actor-pin.mjs';
import { ACTOR_APPEARANCE_PIN_BYTES } from './presentation/actor-appearance-pin.mjs';
import { matchReplayInstalledRules } from './replay-installed-rules.mjs';
import { PRESENTATION_PINS_FORMAT } from './presentation-pins.mjs';
import {
  FLIGHT_MEDIA_PINS_FORMAT,
  snapshotFlightPresentationPins,
  presentationPicturePins,
  validateFlightPresentationPinsForRun,
} from './flight-media-pins.mjs';

export const SESSION_FORMAT = 'xonix-session.v1';
export const CONTINUOUS_SESSION_FORMAT = 'xonix-session.v2';
export const PRESENTATION_SESSION_FORMAT = 'xonix-session.v3';
export const STORY_SESSION_FORMAT = 'xonix-session.v4';
export const VISUAL_SESSION_FORMAT = 'xonix-session.v5';
export const ACTOR_SESSION_FORMAT = 'xonix-session.v6';
const pictureFormats = [
  PRESENTATION_SESSION_FORMAT,
  STORY_SESSION_FORMAT,
  VISUAL_SESSION_FORMAT,
  ACTOR_SESSION_FORMAT,
];
const continuationFormats = [CONTINUOUS_SESSION_FORMAT, ...pictureFormats];
export const SESSION_STORAGE_BYTES = 2 * 1024 * 1024;
const legacyImportBytes = MAX_REPLAY_BYTES + 16384;
// Additional bounded metadata only; the embedded replay keeps its 32 MiB limit.
export const SESSION_IMPORT_BYTES = legacyImportBytes + ACTOR_APPEARANCE_PIN_BYTES;
const canonical = (v) =>
  v === null || typeof v !== 'object'
    ? JSON.stringify(v)
    : Array.isArray(v)
      ? `[${v.map(canonical).join(',')}]`
      : `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
          .join(',')}}`;
const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const stamp = (v) =>
  typeof v === 'string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString() === v;
function metadata(session) {
  required(
    text(session.campaignKey, 300) &&
      stableId(session.themeId) &&
      stableId(session.bodyId) &&
      text(session.runId, 159),
    'Saved attempt identity is invalid.',
  );
  required(stamp(session.savedAt), 'Saved attempt date must be a valid UTC ISO timestamp.');
}
function continuationValue(value) {
  const owned = boundedJSON(value, { maxBytes: 1024 });
  exactKeys(owned, ['direction'], 'saved flight continuation');
  required(
    owned.direction === null || ['up', 'down', 'left', 'right'].includes(owned.direction),
    'Saved flight continuation must contain a cardinal direction or null.',
  );
  return owned;
}
function envelope(candidate) {
  required(
    candidate !== null && candidate !== undefined,
    'Choose a saved flight file or suspend an unfinished attempt first.',
  );
  const session = boundedJSON(candidate, {
    maxBytes: SESSION_IMPORT_BYTES,
    maxNodes: 3100000,
    maxDepth: 28,
    maxArray: MAX_REPLAY_TICKS,
    maxString: 262144,
  });
  if (session.format !== ACTOR_SESSION_FORMAT)
    required(
      new TextEncoder().encode(typeof candidate === 'string' ? candidate : JSON.stringify(session))
        .byteLength <= legacyImportBytes,
      'JSON file exceeds its byte budget.',
    );
  exactKeys(
    session,
    [
      'format',
      'campaignKey',
      'themeId',
      'bodyId',
      'runId',
      'savedAt',
      'replay',
      ...(continuationFormats.includes(session.format) ? ['continuation'] : []),
      ...(pictureFormats.includes(session.format) ? ['presentationPins'] : []),
      ...(session.format === VISUAL_SESSION_FORMAT || session.format === ACTOR_SESSION_FORMAT
        ? ['visualThemePin']
        : []),
      ...(session.format === ACTOR_SESSION_FORMAT ? ['actorAppearancePin'] : []),
    ],
    'saved attempt',
  );
  required(
    [
      SESSION_FORMAT,
      CONTINUOUS_SESSION_FORMAT,
      PRESENTATION_SESSION_FORMAT,
      STORY_SESSION_FORMAT,
      VISUAL_SESSION_FORMAT,
      ACTOR_SESSION_FORMAT,
    ].includes(session.format),
    'Unsupported saved attempt format.',
  );
  if (continuationFormats.includes(session.format))
    session.continuation = continuationValue(session.continuation);
  const authoredJourneyPictures =
    session.format === ACTOR_SESSION_FORMAT && session.presentationPins === null;
  if (authoredJourneyPictures)
    required(
      session.visualThemePin === null,
      'Authored Journey pictures cannot carry a Classic visual pin.',
    );
  if (pictureFormats.includes(session.format) && !authoredJourneyPictures) {
    session.presentationPins = snapshotFlightPresentationPins(session.presentationPins);
    required(
      session.format === VISUAL_SESSION_FORMAT ||
        session.format === ACTOR_SESSION_FORMAT ||
        session.presentationPins.format ===
          (session.format === STORY_SESSION_FORMAT
            ? FLIGHT_MEDIA_PINS_FORMAT
            : PRESENTATION_PINS_FORMAT),
      'Saved attempt and presentation versions differ.',
    );
  }
  metadata(session);
  required(
    session.replay !== null && typeof session.replay === 'object' && !Array.isArray(session.replay),
    'Saved attempt replay is missing.',
  );
  if (session.format === ACTOR_SESSION_FORMAT)
    required(
      new TextEncoder().encode(JSON.stringify(session.replay)).byteLength <= MAX_REPLAY_BYTES,
      'Saved replay exceeds its unchanged byte budget.',
    );
  resolveVersions({
    levelVersion: session.replay.level?.version,
    ruleset: session.replay.ruleset,
    replayVersion: session.replay.version,
    checkpointAlgorithm: session.replay.checkpoint?.algorithm,
  });
  if (
    session.format === VISUAL_SESSION_FORMAT ||
    (session.format === ACTOR_SESSION_FORMAT && session.visualThemePin !== null)
  )
    session.visualThemePin = snapshotSessionVisualPin(session.visualThemePin, {
      pictures: session.presentationPins,
      campaignKey: session.campaignKey,
      themeId: session.themeId,
      simulationLevel: session.replay.level,
    });
  if (session.format === ACTOR_SESSION_FORMAT)
    session.actorAppearancePin = snapshotSessionActorPin(session.actorAppearancePin, {
      pictures: session.presentationPins,
      campaignKey: session.campaignKey,
      themeId: session.themeId,
      simulationLevel: session.replay.level,
    });
  return session;
}

/** Owned metadata and simulation-pair preflight; does not verify a replay outcome. */
export const snapshotSession = envelope;

export function suspendSession({
  run,
  recorder,
  campaignKey,
  themeId,
  bodyId,
  runId,
  savedAt = new Date().toISOString(),
  continuation,
  presentationPins,
  presentationLevel,
  visualThemePin,
  actorAppearancePin,
}) {
  if (!run || !['running', 'respawning'].includes(run.status))
    throw new Error('Only an unfinished attempt can be suspended.');
  metadata({ campaignKey, themeId, bodyId, runId, savedAt });
  required(
    recorder && typeof recorder === 'object',
    'This attempt has no recoverable input recording.',
  );
  const intent = continuation === undefined ? undefined : continuationValue(continuation);
  const pictures =
    presentationPins === undefined ? undefined : snapshotFlightPresentationPins(presentationPins);
  const tuning = recoverGameplayTuning(run.level);
  let pictureRevision = run.level.revision;
  if (presentationLevel && tuning) {
    const matched = matchRecordedGameplayTuning(presentationLevel, run.level);
    required(matched, 'Tuned picture source differs from this flight.');
    const expected = createRun(matched, {
      classId: run.classId,
      classRecipes: run.classRecipes,
    });
    required(
      canonical(expected.level) === canonical(run.level),
      'Tuned picture source differs from this flight.',
    );
    pictureRevision = presentationLevel.revision;
  }
  if (pictures !== undefined && tuning)
    required(presentationLevel, 'Tuned pictures require their authored presentation level.');
  if (pictures !== undefined)
    required(
      intent !== undefined &&
        pictures.executionKey === campaignKey &&
        pictures.levelId === run.level.id &&
        pictures.levelRevision === pictureRevision &&
        presentationPicturePins(pictures).choices.some(
          (choice) => choice.identity.themeId === themeId,
        ),
      'Saved pictures require matching flight identity and explicit continuation.',
    );
  const visuals =
    visualThemePin === undefined || (actorAppearancePin !== undefined && visualThemePin === null)
      ? undefined
      : snapshotSessionVisualPin(visualThemePin, {
          pictures,
          campaignKey,
          themeId,
          simulationLevel: run.level,
          presentationLevel: tuning ? presentationLevel : run.level,
        });
  let actors;
  if (actorAppearancePin !== undefined) {
    required(intent !== undefined, 'Saved actors require explicit continuation.');
    actors = snapshotSessionActorPin(actorAppearancePin, {
      pictures,
      campaignKey,
      themeId,
      simulationLevel: run.level,
      presentationLevel: tuning ? presentationLevel : run.level,
    });
  }
  if (intent === undefined) {
    releaseInputs(run);
    recordRelease(recorder);
  }
  return {
    format:
      actors !== undefined
        ? ACTOR_SESSION_FORMAT
        : visuals !== undefined
          ? VISUAL_SESSION_FORMAT
          : pictures !== undefined
            ? pictures.format === FLIGHT_MEDIA_PINS_FORMAT
              ? STORY_SESSION_FORMAT
              : PRESENTATION_SESSION_FORMAT
            : intent === undefined
              ? SESSION_FORMAT
              : CONTINUOUS_SESSION_FORMAT,
    campaignKey,
    themeId,
    bodyId,
    runId,
    savedAt,
    ...(intent === undefined ? {} : { continuation: intent }),
    ...(pictures === undefined
      ? actors !== undefined
        ? { presentationPins: null }
        : {}
      : { presentationPins: pictures }),
    ...(actors !== undefined
      ? { visualThemePin: visuals ?? null, actorAppearancePin: actors }
      : visuals === undefined
        ? {}
        : { visualThemePin: visuals }),
    replay: exportReplay(recorder, run),
  };
}

export async function restoreSession(
  candidate,
  { campaign, campaignKey, signal, onProgress, masteryDefinition, mediaIdentityCatalog } = {},
) {
  // Snapshot the entire bounded envelope before the first await. Replay checks
  // alone cannot protect outer metadata or later reads from caller mutation.
  const session = envelope(candidate);
  if (session.campaignKey !== campaignKey)
    throw new Error('This saved attempt belongs to a different campaign or rules revision.');
  const installed = boundedJSON(campaign);
  const versions = versionsForCampaign(installed);
  required(
    session.replay.ruleset === versions.ruleset,
    'Saved attempt and installed campaign simulation versions differ.',
  );
  const mastery =
    masteryDefinition === undefined
      ? undefined
      : {
          definition: resolveMasteryDefinition(masteryDefinition),
          campaignId: installed.id,
          campaignKey: session.campaignKey,
          runId: session.runId,
        };
  const checked = await verifyReplayAsync(session.replay, { signal, onProgress, mastery });
  // A final progress callback can cancel after the verifier's last yield.
  if (signal?.aborted) {
    const error = new Error('Saved attempt verification cancelled.');
    error.name = 'AbortError';
    throw error;
  }
  if (!checked.match)
    throw new Error('Saved attempt verification failed. The current game is unchanged.');
  if (!['running', 'respawning'].includes(checked.state.status))
    throw new Error('This attempt has already ended.');
  const level = matchReplayInstalledRules({
    campaign: installed,
    replay: session.replay,
    state: checked.state,
  });
  if (pictureFormats.includes(session.format) && session.presentationPins !== null)
    validateFlightPresentationPinsForRun(session.presentationPins, {
      identityCatalog: mediaIdentityCatalog,
      campaignKey,
      level,
      themeId: session.themeId,
    });
  if (
    session.format === VISUAL_SESSION_FORMAT ||
    (session.format === ACTOR_SESSION_FORMAT && session.visualThemePin !== null)
  )
    session.visualThemePin = snapshotSessionVisualPin(session.visualThemePin, {
      pictures: session.presentationPins,
      campaignKey,
      themeId: session.themeId,
      simulationLevel: checked.state.level,
      presentationLevel: level,
    });
  if (session.format === ACTOR_SESSION_FORMAT)
    session.actorAppearancePin = snapshotSessionActorPin(session.actorAppearancePin, {
      pictures: session.presentationPins,
      campaignKey,
      themeId: session.themeId,
      simulationLevel: checked.state.level,
      presentationLevel: level,
    });
  const recorder = createRecorder(
    session.replay.level,
    session.replay.options,
    session.replay.build,
  );
  recorder.segments = structuredClone(session.replay.segments);
  recorder.ticks = session.replay.ticks;
  recorder.releaseAfter = session.replay.releaseAfter;
  if (session.format === SESSION_FORMAT) {
    releaseInputs(checked.state);
    recordRelease(recorder);
  }
  const { replay: _replay, ...identity } = session;
  if (mastery === undefined) return { session: identity, run: checked.state, recorder };
  // Take only after installed map/roster checks. This in-memory continuation
  // rebuilds preview progress; it is never serialized into the saved envelope.
  const masteryObserver = takeReplayMasteryObserver(checked);
  required(masteryObserver, 'Saved equipment-goal observation could not be reconstructed.');
  return { session: identity, run: checked.state, recorder, masteryObserver };
}

export function saveSession(storage, key, session) {
  let text;
  try {
    text = JSON.stringify(envelope(session));
  } catch (error) {
    return {
      ok: false,
      warning: `The saved attempt is invalid; your previous saved attempt is kept. ${error.message}`,
    };
  }
  if (new TextEncoder().encode(text).length > SESSION_STORAGE_BYTES)
    return {
      ok: false,
      warning:
        'This attempt exceeds the local save budget. Export it to a file; your previous saved attempt is kept.',
    };
  try {
    storage.setItem(key, text);
    return { ok: true, warning: '' };
  } catch {
    return {
      ok: false,
      warning: 'Browser storage is full or unavailable. Export the attempt to keep it.',
    };
  }
}
