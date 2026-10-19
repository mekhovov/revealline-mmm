import { snapshotAttemptAppearance } from '../presentation/attempt-appearance.mjs';
import { prepareTeamRunningEnemies } from '../hunt/team-running-enemies.mjs';
import { boundedJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import { deriveEncounterLevel } from '../hunt/variants.mjs';
import { ENCOUNTER_VARIANTS } from '../hunt/preferences.mjs';
import { applyGameplayTuning, validateGameplayTuning } from '../gameplay-tuning.mjs';
import { createCoop, releaseCoopInputs, startCoop, stepCoop } from './core.mjs';
import { teamInputHistoryExtends } from './attempt-history.mjs';

export const TEAM_PRESENTATION_ATTEMPT_FORMAT = 'revealline-team-presentation-attempt.v1';
export const TEAM_HUNT_ATTEMPT_KEY = 'revealline-mmm.team-hunt-attempt.v1';
export const TEAM_HUNT_ATTEMPT_FORMAT = 'revealline-team-hunt-attempt.v1';
export const TEAM_RUNNING_ATTEMPT_FORMAT = 'revealline-team-hunt-attempt.v2';
export const TEAM_PURSUIT_ATTEMPT_FORMAT = 'revealline-team-hunt-attempt.v3';
export const TEAM_PURSUIT_V2_ATTEMPT_FORMAT = 'revealline-team-hunt-attempt.v4';
export const TEAM_HUNT_ATTEMPT_MAX_BYTES = 1024 * 1024;
const MAX_SEGMENTS = 8192;
const MAX_TICKS = 240000;
const identity = (value) => typeof value === 'string' && /^[a-f0-9]{16}$/.test(value);
const packIdentities = new WeakMap();
const verifiedRestores = new WeakMap();
function requireRestorable(condition, code, message) {
  if (condition) return;
  const error = new TypeError(message);
  error.code = code;
  throw error;
}
export function teamHuntSourceIdentity(pack, level) {
  if (!packIdentities.has(pack)) packIdentities.set(pack, dataIdentity(pack));
  return { pack: packIdentities.get(pack), level: dataIdentity(level) };
}

// JSON preserves the same typed-array projection as the installed Team verifier.
// Pausing changes no simulation time; its input release is a separate journal entry.
function checkpoint(run) {
  const state = JSON.parse(JSON.stringify(run));
  if (state.status === 'paused') state.status = 'running';
  return { tick: run.tick, stateIdentity: dataIdentity(state) };
}

export function validateTeamHuntAttempt(source) {
  const value = boundedJSON(source, {
    maxBytes: TEAM_HUNT_ATTEMPT_MAX_BYTES,
    maxNodes: 150000,
    maxDepth: 12,
    maxArray: MAX_SEGMENTS,
    maxString: 160,
  });
  exactKeys(
    value,
    [
      'format',
      ...(value.format === TEAM_PURSUIT_V2_ATTEMPT_FORMAT ? ['pursuitGeneration'] : []),
      'attemptId',
      'levelId',
      'source',
      'seed',
      'difficulty',
      'config',
      'ruleset',
      'gameplayId',
      'encounterVariant',
      'encounterLevelIdentity',
      'tuning',
      'segments',
      'checkpoint',
      ...([TEAM_PURSUIT_ATTEMPT_FORMAT, TEAM_PURSUIT_V2_ATTEMPT_FORMAT].includes(value.format)
        ? ['runningEnemyStyle']
        : []),
      ...([
        TEAM_RUNNING_ATTEMPT_FORMAT,
        TEAM_PURSUIT_ATTEMPT_FORMAT,
        TEAM_PURSUIT_V2_ATTEMPT_FORMAT,
      ].includes(value.format)
        ? ['runningEnemies']
        : []),
    ],
    'Team Hunt attempt',
  );
  required(
    [
      TEAM_HUNT_ATTEMPT_FORMAT,
      TEAM_RUNNING_ATTEMPT_FORMAT,
      TEAM_PURSUIT_ATTEMPT_FORMAT,
      TEAM_PURSUIT_V2_ATTEMPT_FORMAT,
    ].includes(value.format),
    'Unsupported Team Hunt save version.',
  );
  required(
    typeof value.attemptId === 'string' &&
      value.attemptId.length > 0 &&
      typeof value.levelId === 'string' &&
      value.levelId.length > 0 &&
      typeof value.ruleset === 'string' &&
      value.ruleset.length > 0 &&
      Number.isInteger(value.seed) &&
      value.seed >= 0 &&
      value.seed <= 0xffffffff &&
      ['gentle', 'standard', 'expert'].includes(value.difficulty) &&
      ENCOUNTER_VARIANTS.includes(value.encounterVariant) &&
      identity(value.gameplayId) &&
      identity(value.encounterLevelIdentity),
    'Damaged Team Hunt recipe.',
  );
  if ([TEAM_PURSUIT_ATTEMPT_FORMAT, TEAM_PURSUIT_V2_ATTEMPT_FORMAT].includes(value.format))
    required(value.runningEnemyStyle === 'varied', 'Unsupported varied pursuit recipe.');
  if (
    [
      TEAM_RUNNING_ATTEMPT_FORMAT,
      TEAM_PURSUIT_ATTEMPT_FORMAT,
      TEAM_PURSUIT_V2_ATTEMPT_FORMAT,
    ].includes(value.format)
  )
    required(
      value.runningEnemies === 'running-enemies.v1',
      'Unsupported Team running-enemy recipe.',
    );
  if (value.format === TEAM_PURSUIT_V2_ATTEMPT_FORMAT)
    required(
      value.pursuitGeneration === 'pursuit-goals.v2',
      'Unsupported Team pursuit generation.',
    );
  exactKeys(value.source, ['pack', 'level'], 'Team Hunt source');
  required(
    identity(value.source.pack) && identity(value.source.level),
    'Damaged Team Hunt source.',
  );
  exactKeys(
    value.config,
    ['jointCuts', 'assistCaptures', 'advancedCooperation'],
    'Team Hunt cooperation',
  );
  required(
    ['jointCuts', 'assistCaptures', 'advancedCooperation'].every(
      (key) => typeof value.config[key] === 'boolean',
    ),
    'Damaged Team Hunt cooperation.',
  );
  const tuning = validateGameplayTuning(value.tuning);
  required(tuning.difficulty === value.difficulty, 'Team Hunt difficulty changed.');
  required(Array.isArray(value.segments), 'Team Hunt input journal is missing.');
  let ticks = 0;
  for (const segment of value.segments) {
    if (segment.release === true) {
      exactKeys(segment, ['release'], 'Team Hunt release');
      continue;
    }
    exactKeys(segment, ['ticks', 'commands'], 'Team Hunt input');
    required(
      Number.isSafeInteger(segment.ticks) &&
        segment.ticks > 0 &&
        Array.isArray(segment.commands) &&
        segment.commands.length === 2,
      'Damaged Team Hunt input.',
    );
    for (const command of segment.commands) {
      exactKeys(
        command,
        ['direction', 'boost', 'support', ...(Object.hasOwn(command, 'steer') ? ['steer'] : [])],
        'Team Hunt command',
      );
      required(
        (command.direction === null ||
          ['up', 'down', 'left', 'right'].includes(command.direction)) &&
          typeof command.boost === 'boolean' &&
          typeof command.support === 'boolean' &&
          (command.steer === undefined || typeof command.steer === 'boolean'),
        'Damaged Team Hunt command.',
      );
    }
    ticks += segment.ticks;
    required(ticks <= MAX_TICKS, 'Team Hunt save reached its input budget.');
  }
  exactKeys(value.checkpoint, ['tick', 'stateIdentity'], 'Team Hunt checkpoint');
  required(
    value.checkpoint.tick === ticks && identity(value.checkpoint.stateIdentity),
    'Damaged Team Hunt checkpoint.',
  );
  return value;
}

/** Portable presentation wraps, but never upgrades, a native Team recording. */
export function snapshotTeamHuntPresentation(source) {
  const value = boundedJSON(source, {
    maxBytes: TEAM_HUNT_ATTEMPT_MAX_BYTES,
    maxNodes: 150020,
    maxDepth: 14,
    maxArray: MAX_SEGMENTS,
    maxString: 512,
  });
  if (value.format !== TEAM_PRESENTATION_ATTEMPT_FORMAT)
    return { snapshot: validateTeamHuntAttempt(value), attemptAppearance: null, envelope: null };
  exactKeys(value, ['format', 'attempt', 'appearance'], 'Team presentation attempt');
  const snapshot = validateTeamHuntAttempt(value.attempt);
  const attemptAppearance = snapshotAttemptAppearance(value.appearance);
  required(attemptAppearance !== null, 'A Team presentation attempt needs accepted artwork.');
  return {
    snapshot,
    attemptAppearance,
    envelope: {
      format: TEAM_PRESENTATION_ATTEMPT_FORMAT,
      attempt: snapshot,
      appearance: attemptAppearance,
    },
  };
}

export function createTeamHuntRecorder({
  run,
  pack,
  level,
  tuning,
  encounterLevel,
  encounterVariant,
  runningEnemies = false,
  attemptId,
  gameplayId,
  restored,
}) {
  required(run.level.hunt && run.status === 'running', 'Only a running Team Hunt can be saved.');
  const recipe = [
    TEAM_HUNT_ATTEMPT_FORMAT,
    TEAM_RUNNING_ATTEMPT_FORMAT,
    TEAM_PURSUIT_ATTEMPT_FORMAT,
    TEAM_PURSUIT_V2_ATTEMPT_FORMAT,
  ].includes(restored?.snapshot.format)
    ? structuredClone(restored.snapshot)
    : {
        format: runningEnemies
          ? run.level.pursuit
            ? run.level.pursuit.version === 'pursuit-goals.v2'
              ? TEAM_PURSUIT_V2_ATTEMPT_FORMAT
              : TEAM_PURSUIT_ATTEMPT_FORMAT
            : TEAM_RUNNING_ATTEMPT_FORMAT
          : TEAM_HUNT_ATTEMPT_FORMAT,
        ...(runningEnemies && run.level.pursuit
          ? {
              runningEnemyStyle: 'varied',
              ...(run.level.pursuit.version === 'pursuit-goals.v2'
                ? { pursuitGeneration: run.level.pursuit.version }
                : {}),
            }
          : {}),
        ...(runningEnemies ? { runningEnemies: 'running-enemies.v1' } : {}),
        attemptId: restored?.snapshot.attemptId ?? attemptId,
        levelId: level.id,
        source: teamHuntSourceIdentity(pack, level),
        seed: run.seed,
        difficulty: run.difficulty,
        config: structuredClone(run.config),
        ruleset: run.ruleset,
        gameplayId:
          gameplayId ??
          dataIdentity({
            ruleset: run.ruleset,
            level: runningEnemies
              ? prepareTeamRunningEnemies(applyGameplayTuning(encounterLevel, tuning), {
                  style: run.level.pursuit ? 'varied' : 'original',
                  generation: run.level.pursuit?.version ?? 'pursuit-goals.v1',
                })
              : applyGameplayTuning(encounterLevel, tuning),
          }),
        encounterVariant,
        encounterLevelIdentity: dataIdentity(encounterLevel),
        tuning: structuredClone(tuning),
        segments: structuredClone(restored?.snapshot.segments ?? []),
        checkpoint: checkpoint(run),
      };
  let stopped = false;
  return {
    attemptId: recipe.attemptId,
    append(commands) {
      if (stopped) return;
      const previous = recipe.segments.at(-1);
      if (previous?.commands && JSON.stringify(previous.commands) === JSON.stringify(commands))
        previous.ticks++;
      else recipe.segments.push({ ticks: 1, commands: structuredClone(commands) });
      if (recipe.segments.length > MAX_SEGMENTS || run.tick >= MAX_TICKS) stopped = true;
    },
    release() {
      if (!stopped && !recipe.segments.at(-1)?.release) recipe.segments.push({ release: true });
    },
    snapshot() {
      required(
        !stopped,
        'Team Hunt save reached its input budget. The previous checkpoint is kept.',
      );
      return validateTeamHuntAttempt({ ...recipe, checkpoint: checkpoint(run) });
    },
  };
}

/** Recreate from the currently owned source, then verify every authoritative state field. */
export async function restoreTeamHuntAttempt(
  source,
  { pack, level, signal, yieldControl = () => new Promise((resolve) => setTimeout(resolve, 0)) },
) {
  const { snapshot, attemptAppearance } = snapshotTeamHuntPresentation(source);
  const check = () => {
    if (signal?.aborted) throw new DOMException('Team Hunt Continue cancelled.', 'AbortError');
  };
  check();
  const actualSource = teamHuntSourceIdentity(pack, level);
  requireRestorable(
    snapshot.levelId === level.id &&
      actualSource.pack === snapshot.source.pack &&
      actualSource.level === snapshot.source.level,
    'sourceChanged',
    'Reopen the exact Team mission and difficulty used by this save.',
  );
  const encounterLevel = deriveEncounterLevel(level, snapshot.encounterVariant, { mode: 'team' });
  requireRestorable(
    encounterLevel && dataIdentity(encounterLevel) === snapshot.encounterLevelIdentity,
    'recipeChanged',
    'The saved Team Hunt recipe is unavailable in this edition.',
  );
  const baseTuned = applyGameplayTuning(encounterLevel, snapshot.tuning);
  const tuned = snapshot.runningEnemies
    ? prepareTeamRunningEnemies(baseTuned, {
        style: snapshot.runningEnemyStyle ?? 'original',
        generation: snapshot.pursuitGeneration ?? 'pursuit-goals.v1',
      })
    : baseTuned;
  const run = startCoop(
    createCoop(tuned, { seed: snapshot.seed, difficulty: snapshot.difficulty, ...snapshot.config }),
  );
  const gameplayId = dataIdentity({ ruleset: run.ruleset, level: tuned });
  // Early development saves hashed the initialized level. Both identities must
  // come from this exact trusted recipe; the complete replay check still applies.
  const initializedIdentity = dataIdentity({ ruleset: run.ruleset, level: run.level });
  requireRestorable(
    run.level.hunt &&
      run.ruleset === snapshot.ruleset &&
      [gameplayId, initializedIdentity].includes(snapshot.gameplayId),
    'rulesChanged',
    'The saved Team Hunt rules changed.',
  );
  for (const segment of snapshot.segments) {
    check();
    if (segment.release) releaseCoopInputs(run);
    else
      for (let i = 0; i < segment.ticks; i++) {
        requireRestorable(
          run.status === 'running',
          'inputsEnded',
          'Saved Team Hunt inputs continue after the result.',
        );
        stepCoop(run, segment.commands);
        if (run.tick % 600 === 0) {
          await yieldControl();
          check();
        }
      }
  }
  requireRestorable(
    run.status === 'running' && dataIdentity(checkpoint(run)) === dataIdentity(snapshot.checkpoint),
    'verificationFailed',
    'Saved Team Hunt failed exact replay verification.',
  );
  snapshot.gameplayId = gameplayId;
  verifiedRestores.set(run, {
    source: { ...snapshot.source },
    levelId: snapshot.levelId,
    checkpoint: { ...snapshot.checkpoint },
    receipt: Object.freeze({
      attemptId: snapshot.attemptId,
      gameplayId,
      encounterVariant: snapshot.encounterVariant,
      adminOverride: snapshot.tuning.adminOverride,
    }),
  });
  return { run, snapshot, attemptAppearance, huntAttempt: true };
}

/** A receipt is available only for this exact, unchanged replay-verified core.
 * Matching IDs or a copied run cannot grant campaign-progress authority. */
export function verifiedTeamHuntRestore(run, { pack, level }) {
  const verified = verifiedRestores.get(run);
  if (!verified || run.status !== 'running' || run.tick !== verified.checkpoint.tick) return null;
  const source = teamHuntSourceIdentity(pack, level);
  if (
    level.id !== verified.levelId ||
    source.pack !== verified.source.pack ||
    source.level !== verified.source.level ||
    checkpoint(run).stateIdentity !== verified.checkpoint.stateIdentity
  )
    return null;
  return verified.receipt;
}

/** An installed Continue may reclaim its older mirrored Hunt checkpoint only
 * after its complete saved history verifies against the same accepted recipe.
 * A same-tick trailing release can promote the verified neutral-input core and
 * journal together. Callers supply a verified installed restore; no storage changes. */
export async function matchingTeamHuntMirror(
  restored,
  { pack, level, saved, signal, yieldControl },
) {
  if (!restored?.run.level.hunt || !saved?.snapshot || saved.raw === null) return null;
  const previous = saved.snapshot,
    snapshot = restored.snapshot,
    source = teamHuntSourceIdentity(pack, level);
  if (
    previous.attemptId !== snapshot.attemptId ||
    previous.levelId !== level.id ||
    previous.source.pack !== source.pack ||
    previous.source.level !== source.level ||
    previous.seed !== restored.run.seed ||
    previous.ruleset !== restored.run.ruleset ||
    previous.difficulty !== snapshot.difficulty ||
    previous.encounterVariant !== (snapshot.encounterVariant ?? 'authored') ||
    previous.runningEnemies !== snapshot.runningEnemies ||
    previous.runningEnemyStyle !== snapshot.runningEnemyStyle ||
    previous.pursuitGeneration !== snapshot.pursuitGeneration ||
    dataIdentity(previous.tuning) !== dataIdentity(snapshot.tuning) ||
    dataIdentity(previous.config) !== dataIdentity(restored.run.config)
  )
    return null;
  const covered = teamInputHistoryExtends(snapshot.segments, previous.segments);
  const releaseOnly =
    previous.checkpoint.tick === snapshot.checkpoint.tick &&
    previous.segments.length > snapshot.segments.length &&
    teamInputHistoryExtends(previous.segments, snapshot.segments) &&
    previous.segments.slice(snapshot.segments.length).every((segment) => segment.release === true);
  if (!covered && !releaseOnly) return null;
  try {
    const verified = await restoreTeamHuntAttempt(saved.envelope ?? previous, {
      pack,
      level,
      signal,
      yieldControl,
    });
    if (verified.snapshot.gameplayId !== snapshot.gameplayId) return null;
    return {
      raw: saved.raw,
      attemptAppearance: verified.attemptAppearance,
      promotion: releaseOnly ? verified : null,
    };
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return null;
  }
}

/** One bounded slot, with compare-and-swap ownership. Unknown/corrupt bytes are never replaced. */
export function createTeamHuntAttemptStore({ getStorage = () => globalThis.localStorage } = {}) {
  return Object.freeze({
    read() {
      let raw = null;
      try {
        raw = getStorage().getItem(TEAM_HUNT_ATTEMPT_KEY);
        return raw === null
          ? { raw, snapshot: null, attemptAppearance: null, error: null }
          : { raw, ...snapshotTeamHuntPresentation(raw), error: null };
      } catch (error) {
        return { raw, snapshot: null, error };
      }
    },
    save(source, expectedRaw = null, { replaceAttemptId = null, attemptAppearance } = {}) {
      const incoming = snapshotTeamHuntPresentation(source);
      const snapshot = incoming.snapshot;
      let appearance =
        attemptAppearance === undefined
          ? incoming.attemptAppearance
          : snapshotAttemptAppearance(attemptAppearance);
      const storage = getStorage();
      const previous = storage.getItem(TEAM_HUNT_ATTEMPT_KEY);
      required(
        previous === expectedRaw,
        'Another Team Hunt save is kept. Continue or explicitly discard it first.',
      );
      if (previous !== null) {
        const retained = snapshotTeamHuntPresentation(previous);
        const existing = retained.snapshot;
        if (
          attemptAppearance === undefined &&
          incoming.envelope === null &&
          existing.attemptId === snapshot.attemptId
        )
          appearance = retained.attemptAppearance;
        required(
          existing.attemptId === snapshot.attemptId || existing.attemptId === replaceAttemptId,
          'A different Team Hunt attempt is kept.',
        );
      }
      if (
        appearance &&
        appearance.artRevision === null &&
        appearance.collection === null &&
        appearance.environmentPin === null
      )
        appearance = null;
      const output =
        appearance === null
          ? snapshot
          : { format: TEAM_PRESENTATION_ATTEMPT_FORMAT, attempt: snapshot, appearance };
      // The outer presentation does not increase the existing local slot budget.
      const checked = snapshotTeamHuntPresentation(output);
      const raw = JSON.stringify(checked.envelope ?? checked.snapshot);
      storage.setItem(TEAM_HUNT_ATTEMPT_KEY, raw);
      return raw;
    },
    discard(expectedRaw) {
      const storage = getStorage();
      required(
        storage.getItem(TEAM_HUNT_ATTEMPT_KEY) === expectedRaw,
        'Team Hunt save changed in another tab. Review it again.',
      );
      storage.removeItem(TEAM_HUNT_ATTEMPT_KEY);
    },
  });
}
