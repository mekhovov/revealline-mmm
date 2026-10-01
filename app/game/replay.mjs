import { createRun, stepRun, releaseInputs, getSummary, FIXED_DT, CLASSES } from './core/index.mjs';
import {
  LEGACY_VERSIONS,
  ENCOUNTER_VERSIONS,
  WIDE_VERSIONS,
  CLASSIC_VERSIONS,
  FOUNDATION_VERSIONS,
  isDirectionalRuleset,
  isRelayRuleset,
  isFoundationRuleset,
  isClassicRuleset,
  resolveVersions,
  versionsForLevel,
} from './core/versions.mjs';
import { boundedJSON, stableId } from './data-json.mjs';
import { projectClassicState } from './core/classic-state.mjs';
import {
  MASTERY_DEFINITION_VERSION,
  resolveMasteryDefinition,
  captureMasterySetup,
  captureMasteryFacts,
  createMasteryObserver,
} from './mastery.mjs';

export const REPLAY_VERSION = 'xonix-replay.v3';
export const ENCOUNTER_REPLAY_VERSION = ENCOUNTER_VERSIONS.replayVersion;
export const WIDE_REPLAY_VERSION = WIDE_VERSIONS.replayVersion;
export const CLASSIC_REPLAY_VERSION = CLASSIC_VERSIONS.replayVersion;
export const MAX_REPLAY_TICKS = 30 * 60 * 120;
export const MAX_REPLAY_BYTES = 32 * 1024 * 1024;
export const CHECKPOINT_ALGORITHM = 'fnv1a64-state-v2';
const MAX_NODES = 3_000_000,
  MAX_DEPTH = 24,
  MAX_STRING = 262_144;
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const INPUT_KEYS = ['direction', 'boost', 'action', 'pickup', 'switchClass'];
const SECTIONS = [
  'identity',
  'configuration',
  'board',
  'player',
  'trail',
  'enemies',
  'objectives',
  'supplies',
  'ability',
  'clock',
  'continuation',
  'result',
];
const encoder = new TextEncoder();
const sectionNames = (versions) =>
  isRelayRuleset(versions.ruleset)
    ? [
        ...SECTIONS,
        'encounter',
        'classic',
        'foundations',
        'relays',
        ...(isDirectionalRuleset(versions.ruleset) ? ['directionalFields'] : []),
      ]
    : versions.ruleset === FOUNDATION_VERSIONS.ruleset
      ? [...SECTIONS, 'encounter', 'classic', 'foundations']
      : versions.ruleset === CLASSIC_VERSIONS.ruleset
        ? [...SECTIONS, 'encounter', 'classic']
        : versions.ruleset !== LEGACY_VERSIONS.ruleset
          ? [...SECTIONS, 'encounter']
          : SECTIONS;
function replayVersions(value) {
  try {
    return resolveVersions({
      levelVersion: value.level?.version,
      ruleset: value.ruleset,
      replayVersion: value.version,
      checkpointAlgorithm: value.checkpoint?.algorithm,
    });
  } catch {
    reject('Unsupported or mismatched replay version, level, ruleset or checkpoint algorithm.');
  }
}

export class ReplayValidationError extends TypeError {
  constructor(message, code = 'invalid-replay') {
    super(message);
    this.name = 'ReplayValidationError';
    this.code = code;
  }
}
const reject = (message, code) => {
  throw new ReplayValidationError(message, code);
};
const record = (v) =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

/** Copy only bounded, plain JSON data. Reject accessors before reading values. */
function boundedCopy(source) {
  let nodes = 0,
    characters = 0;
  const seen = new Set();
  function visit(value, depth) {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH)
      reject('Replay JSON exceeds its structural budget.', 'json-budget');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) reject('Replay numbers must be finite.');
      return value;
    }
    if (typeof value === 'string') {
      characters += value.length;
      if (value.length > MAX_STRING || characters > MAX_REPLAY_BYTES)
        reject('Replay text exceeds its size budget.', 'json-budget');
      return value;
    }
    if (typeof value !== 'object' || !value) reject('Replay must contain JSON values only.');
    const array = Array.isArray(value);
    if (array ? Object.getPrototypeOf(value) !== Array.prototype : !record(value))
      reject('Replay objects must have plain JSON prototypes.');
    if (seen.has(value)) reject('Replay must not contain cycles.');
    seen.add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value),
      out = array ? [] : {};
    if (array && value.length > MAX_REPLAY_TICKS)
      reject('Replay array exceeds its item budget.', 'json-budget');
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string') reject('Replay JSON cannot contain symbol properties.');
      if (array && key === 'length') continue;
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))
        reject('Replay JSON cannot contain accessors or hidden properties.');
      if (FORBIDDEN.has(key)) reject(`Forbidden replay key: ${key}.`);
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))
        reject('Replay arrays cannot contain custom properties.');
      characters += key.length;
      if (characters > MAX_REPLAY_BYTES)
        reject('Replay text exceeds its size budget.', 'json-budget');
      out[key] = visit(descriptor.value, depth + 1);
    }
    if (array && Object.keys(out).length !== value.length)
      reject('Replay arrays cannot be sparse.');
    seen.delete(value);
    return out;
  }
  const copy = visit(source, 0);
  if (encoder.encode(JSON.stringify(copy)).length > MAX_REPLAY_BYTES)
    reject('Replay exceeds 32 MiB.', 'json-budget');
  return copy;
}

function keysExactly(value, required, optional = []) {
  if (
    !record(value) ||
    required.some((k) => !Object.hasOwn(value, k)) ||
    Object.keys(value).some((k) => !required.includes(k) && !optional.includes(k))
  )
    return false;
  return true;
}

function inputCopy(input = {}) {
  if (!record(input) || Object.keys(input).some((key) => !INPUT_KEYS.includes(key)))
    reject(
      'Input must contain only direction, boost, action, pickup and switchClass.',
      'invalid-input',
    );
  const direction = input.direction ?? null;
  if (![null, 'up', 'right', 'down', 'left'].includes(direction))
    reject('Replay input needs a cardinal direction or null.', 'invalid-input');
  for (const key of ['boost', 'action', 'pickup'])
    if (input[key] !== undefined && typeof input[key] !== 'boolean')
      reject(`Replay input ${key} must be boolean.`, 'invalid-input');
  const switchClass = input.switchClass ?? null;
  if (
    switchClass !== null &&
    (typeof switchClass !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(switchClass))
  )
    reject('Replay switchClass must be a stable ID or null.', 'invalid-input');
  return {
    direction,
    boost: !!input.boost,
    action: !!input.action,
    pickup: !!input.pickup,
    switchClass,
  };
}
const sameInput = (a, b) => INPUT_KEYS.every((key) => a[key] === b[key]);

function canonical(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value))
      reject('Authoritative state contains a non-finite number.', 'invalid-state');
    if (
      value === undefined ||
      typeof value === 'function' ||
      typeof value === 'symbol' ||
      typeof value === 'bigint'
    )
      reject('Authoritative state contains a non-JSON value.', 'invalid-state');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
    .join(',')}}`;
}

/** Deterministic checksum, deliberately not a signature or security proof. */
function checksum(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of encoder.encode(canonical(value)))
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return hash.toString(16).padStart(16, '0');
}

const pick = (value, keys) =>
  Object.fromEntries(
    keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]),
  );
const physicsRecipe = (recipe) =>
  pick(recipe, [
    'id',
    'revision',
    'primitive',
    'capacity',
    'cooldown',
    'duration',
    'radius',
    'slowFactor',
    'signalResistance',
    'moveSpeedMultiplier',
  ]);
function authoritativeSections(state, versions) {
  return {
    identity: pick(state, [
      'ruleset',
      'levelId',
      'revision',
      'seed',
      'turnPolicy',
      'classId',
      'classRevision',
      'loadoutHash',
      'activeClassId',
      'rosterHash',
      'width',
      'height',
    ]),
    configuration: {
      rules: state.rules,
      spawn: state.level.spawn,
      goal: state.level.goal,
      classRecipe: physicsRecipe(state.classRecipe),
      classRecipes: state.classRecipes.map(physicsRecipe),
      hangars: state.hangars,
      ...(versions.ruleset !== LEGACY_VERSIONS.ruleset ? { encounter: state.level.encounter } : {}),
    },
    board: {
      cells: Array.from(state.cells),
      claimedCount: state.claimedCount,
      totalClaimable: state.totalClaimable,
      coverage: state.coverage,
    },
    player: pick(state.player, [
      'x',
      'y',
      'direction',
      'queuedDirection',
      'speed',
      'cutting',
      'graceUntil',
    ]),
    trail: {
      cells: state.trail.map((cell) => pick(cell, ['x', 'y', 'index'])),
      segments: state.trailSegments.map((segment) => pick(segment, ['x1', 'y1', 'x2', 'y2'])),
    },
    enemies: state.enemies.map((enemy) =>
      pick(enemy, [
        'id',
        'type',
        'course',
        'x',
        'y',
        'radius',
        'vx',
        'vy',
        'speed',
        'clockwise',
        'perimeter',
        'stunnedUntil',
        'slowUntil',
        'slowFactor',
        'axis',
        'period',
        'warningSeconds',
        'activeSeconds',
        'laneWidth',
        'bossPhase',
        'lane',
        'nextWarningAt',
        'warningUntil',
        'activeUntil',
      ]),
    ),
    objectives: state.objectives.map((objective) =>
      pick(objective, ['id', 'x', 'y', 'required', 'hidden', 'captured', 'revealed']),
    ),
    supplies: state.supplies.map((supply) => pick(supply, ['id', 'x', 'y', 'radius'])),
    ability: {
      ...pick(state.ability, [
        'primitive',
        'ammo',
        'capacity',
        'cooldownUntil',
        'scanUntil',
        'shieldUntil',
      ]),
      classHistory: state.classHistory,
      switchCooldownUntil: state.switchCooldownUntil,
      loadouts: Object.fromEntries(
        Object.entries(state._loadouts).map(([id, ability]) => [
          id,
          pick(ability, [
            'primitive',
            'ammo',
            'capacity',
            'cooldownUntil',
            'scanUntil',
            'shieldUntil',
          ]),
        ]),
      ),
      signal: state.signal,
      signalZones: state.signalZones,
      fields: state.ability.fields.map((field) =>
        pick(field, ['id', 'kind', 'x', 'y', 'radius', 'until', 'slowFactor']),
      ),
    },
    clock: pick(state, [
      'status',
      'tick',
      'time',
      'lives',
      'score',
      'respawnAt',
      'medal',
      'cutStartedAt',
      'failureCause',
    ]),
    continuation: pick(state, ['_accumulator', '_input', '_abilitySerial', '_terminalEmitted']),
    result: state.result,
    ...(versions.ruleset !== LEGACY_VERSIONS.ruleset ? { encounter: state.encounter } : {}),
    ...(isClassicRuleset(versions.ruleset) ? { classic: projectClassicState(state) } : {}),
    ...(isFoundationRuleset(versions.ruleset)
      ? {
          foundations: {
            definition: structuredClone(state.level.foundations),
            version: state.foundation.version,
            permanent: Array.from(state.foundation.permanent),
          },
        }
      : {}),
    ...(isRelayRuleset(versions.ruleset)
      ? {
          relays: {
            definition: structuredClone(state.level.relayGates),
            state: structuredClone(state.relay),
          },
        }
      : {}),
    ...(isDirectionalRuleset(versions.ruleset)
      ? { directionalFields: structuredClone(state.level.directionalFields) }
      : {}),
  };
}

/** Covers future-affecting simulation state, including action latches. */
export function authoritativeCheckpoint(state) {
  const versions = resolveVersions({ levelVersion: state.level.version, ruleset: state.ruleset });
  const projected = authoritativeSections(state, versions),
    sections = {};
  for (const name of sectionNames(versions)) sections[name] = checksum(projected[name]);
  return { algorithm: versions.checkpointAlgorithm, hash: checksum(sections), sections };
}

/** Recorder owns copies; recordInput never steps the simulation itself. */
export function createRecorder(level, options = {}, build = 'unknown') {
  const copied = boundedCopy({ level, options, build });
  if (typeof copied.build !== 'string' || copied.build.length < 1 || copied.build.length > 160)
    reject('Build must be a nonempty string up to 160 characters.');
  if (!keysExactly(copied.options, [], ['seed', 'turnPolicy', 'classId', 'classRecipes']))
    reject('Unsupported replay run option.');
  const state = createRun(copied.level, copied.options);
  const versions = versionsForLevel(state.level);
  return {
    version: versions.replayVersion,
    build: copied.build,
    ruleset: versions.ruleset,
    level: state.level,
    options: {
      seed: state.seed,
      turnPolicy: state.turnPolicy,
      classId: state.classId,
      classRecipes: copied.options.classRecipes ?? structuredClone(CLASSES),
    },
    segments: [],
    ticks: 0,
    releaseAfter: false,
    _identity: pick(state, [
      'levelId',
      'revision',
      'seed',
      'turnPolicy',
      'classId',
      'classRevision',
      'loadoutHash',
    ]),
  };
}

export function recordInput(recorder, input) {
  if (recorder.ticks >= MAX_REPLAY_TICKS)
    reject('Replay exceeds the 30-minute recording budget.', 'tick-budget');
  const command = inputCopy(input),
    last = recorder.segments.at(-1);
  if (last && !recorder.releaseAfter && sameInput(last.input, command)) last.ticks++;
  else recorder.segments.push({ ticks: 1, input: command, releaseBefore: recorder.releaseAfter });
  recorder.ticks++;
  recorder.releaseAfter = false;
  return recorder;
}

/** Mirror each official releaseInputs(state) call, including a trailing pause. */
export function recordRelease(recorder) {
  recorder.releaseAfter = true;
  return recorder;
}

export function exportReplay(recorder, state) {
  const versions = resolveVersions({
    levelVersion: recorder.level.version,
    replayVersion: recorder.version,
    ruleset: recorder.ruleset,
  });
  if (state.ruleset !== versions.ruleset || state.level.version !== versions.levelVersion)
    reject('Recorder and run simulation versions differ.', 'recording-mismatch');
  if (state.tick !== recorder.ticks)
    reject(
      'Recorder tick count differs from the run. Record once per actual fixed tick.',
      'recording-mismatch',
    );
  if (Math.abs(state._accumulator) > 1e-12)
    reject(
      'Replay export requires fixed-tick recording with no core accumulator remainder.',
      'recording-mismatch',
    );
  if (canonical(pick(state, Object.keys(recorder._identity))) !== canonical(recorder._identity))
    reject('Recorder and run identities differ.', 'recording-mismatch');
  return boundedCopy({
    version: versions.replayVersion,
    build: recorder.build,
    ruleset: versions.ruleset,
    level: recorder.level,
    options: recorder.options,
    segments: recorder.segments,
    releaseAfter: recorder.releaseAfter,
    ticks: recorder.ticks,
    summary: getSummary(state),
    checkpoint: authoritativeCheckpoint(state),
  });
}

function prepareReplay(source) {
  if (typeof source === 'string') {
    if (encoder.encode(source).length > MAX_REPLAY_BYTES)
      reject('Replay exceeds 32 MiB.', 'json-budget');
    try {
      source = JSON.parse(source);
    } catch {
      reject('Replay is not valid JSON.');
    }
  }
  const data = boundedCopy(source);
  if (['xonix-replay.v1', 'xonix-replay.v2'].includes(data?.version))
    reject(
      'Legacy replay version: use its archived game build. Current runs use replay v3 with class switches and signal challenges.',
      'legacy-replay',
    );
  if (
    !keysExactly(data, [
      'version',
      'build',
      'ruleset',
      'level',
      'options',
      'segments',
      'releaseAfter',
      'ticks',
      'summary',
      'checkpoint',
    ])
  )
    reject('Unsupported replay version, ruleset or document fields.');
  const versions = replayVersions(data);
  if (typeof data.build !== 'string' || !data.build.length || data.build.length > 160)
    reject('Invalid recorded build.');
  if (!keysExactly(data.options, ['seed', 'turnPolicy', 'classId', 'classRecipes']))
    reject('Replay options must preserve seed, policy, class and classRecipes.');
  if (
    !Array.isArray(data.segments) ||
    data.segments.length > MAX_REPLAY_TICKS ||
    !Number.isInteger(data.ticks) ||
    data.ticks < 0 ||
    data.ticks > MAX_REPLAY_TICKS
  )
    reject('Replay exceeds the 30-minute verification budget.', 'tick-budget');
  if (typeof data.releaseAfter !== 'boolean') reject('releaseAfter must be boolean.');
  let ticks = 0;
  for (const segment of data.segments) {
    if (
      !keysExactly(segment, ['ticks', 'input', 'releaseBefore']) ||
      !Number.isInteger(segment.ticks) ||
      segment.ticks <= 0 ||
      typeof segment.releaseBefore !== 'boolean'
    )
      reject('Invalid RLE segment.');
    if (!keysExactly(segment.input, INPUT_KEYS)) reject('Replay segment input must be explicit.');
    segment.input = inputCopy(segment.input);
    ticks += segment.ticks;
    if (ticks > MAX_REPLAY_TICKS)
      reject('Replay exceeds the 30-minute verification budget.', 'tick-budget');
  }
  if (ticks !== data.ticks) reject('Replay tick total differs from its segments.');
  const c = data.checkpoint,
    hex = (value) => typeof value === 'string' && /^[0-9a-f]{16}$/.test(value);
  if (
    !keysExactly(c, ['algorithm', 'hash', 'sections']) ||
    c.algorithm !== versions.checkpointAlgorithm ||
    !hex(c.hash) ||
    !keysExactly(c.sections, sectionNames(versions)) ||
    Object.values(c.sections).some((value) => !hex(value))
  )
    reject('Invalid authoritative checkpoint.');
  if (checksum(c.sections) !== c.hash)
    reject('Checkpoint root does not match its section checksums.');
  if (!record(data.summary)) reject('Expected summary must be an object.');
  const state = createRun(data.level, data.options);
  return { data, state, versions };
}

/** Owned, structurally validated document. This does not verify its outcome. */
export function snapshotReplay(source) {
  return prepareReplay(source).data;
}

function* replaySteps({ data, state, mastery }) {
  let processed = 0;
  for (const segment of data.segments) {
    if (segment.releaseBefore) releaseInputs(state);
    for (let i = 0; i < segment.ticks; i++) {
      if (state.status === 'won' || state.status === 'lost')
        reject('Replay contains tick commands after the run ended.', 'commands-after-terminal');
      stepRun(state, segment.input, FIXED_DT);
      if (mastery)
        mastery.observer.observe(
          captureMasteryFacts(state, { runId: mastery.runId, definition: mastery.definition }),
        );
      processed++;
      yield processed;
    }
  }
  if (data.releaseAfter) releaseInputs(state);
}

const verifiedMasteryObservers = new WeakMap();

/** In-memory continuation only. A preview observer never authorizes an award. */
export function takeReplayMasteryObserver(verification) {
  const observer = verifiedMasteryObservers.get(verification) ?? null;
  verifiedMasteryObservers.delete(verification);
  return observer;
}

function finishVerification({ data, state, mastery, versions }) {
  const checkpoint = authoritativeCheckpoint(state),
    summary = getSummary(state),
    diagnostics = [];
  for (const name of sectionNames(versions))
    if (checkpoint.sections[name] !== data.checkpoint.sections[name])
      diagnostics.push({
        code: 'state-mismatch',
        section: name,
        message: `Authoritative ${name} differs.`,
        expected: data.checkpoint.sections[name],
        actual: checkpoint.sections[name],
      });
  if (canonical(summary) !== canonical(data.summary))
    diagnostics.push({
      code: 'summary-mismatch',
      message: 'Recorded and reconstructed summaries differ.',
    });
  if (state.tick !== data.ticks)
    diagnostics.push({
      code: 'tick-mismatch',
      message: 'Simulation tick count differs from the recording.',
    });
  const result = {
    state,
    match: diagnostics.length === 0,
    diagnostics,
    actual: { summary, checkpoint },
    recordedBuild: data.build,
    ticks: data.ticks,
    ...(mastery ? { masteryPreview: mastery.observer.snapshot() } : {}),
  };
  if (mastery && result.match) verifiedMasteryObservers.set(result, mastery.observer);
  return result;
}

function masteryRequest(source) {
  if (source === undefined) return null;
  const value = boundedJSON(source, {
    maxBytes: 16384,
    maxNodes: 320,
    maxDepth: 6,
    maxArray: 4,
    maxString: 512,
  });
  if (
    !keysExactly(value, ['definition', 'campaignId', 'campaignKey', 'runId']) ||
    !stableId(value.campaignId) ||
    typeof value.campaignKey !== 'string' ||
    value.campaignKey.length < 1 ||
    value.campaignKey.length > 300 ||
    typeof value.runId !== 'string' ||
    !value.runId.trim() ||
    value.runId.length > 159
  )
    reject('Invalid optional mastery observation request.');
  value.definition = resolveMasteryDefinition(value.definition);
  // The envelope needs one extra nesting level for v2 region references.
  // Resolve the owned definition before dispatch; never read caller getters.
  // Preserve the original request budget for the archived Steady contract.
  if (value.definition.version === MASTERY_DEFINITION_VERSION)
    boundedJSON(value, {
      maxBytes: 16384,
      maxNodes: 320,
      maxDepth: 5,
      maxArray: 2,
      maxString: 512,
    });
  return value;
}

/** Synchronous verification for Node tooling and short trusted-size test fixtures. */
export function verifyReplay(data) {
  const prepared = prepareReplay(data);
  for (const ignored of replaySteps(prepared)) {
    void ignored;
  }
  return finishVerification(prepared);
}

const yieldToHost = () => new Promise((resolve) => setTimeout(resolve, 0));
function checkAbort(signal) {
  if (signal?.aborted) {
    const error = new Error('Replay verification cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}

/** Browser verification yields before work and every bounded simulation chunk. */
export async function verifyReplayAsync(
  data,
  { chunkTicks = 600, onProgress, signal, mastery } = {},
) {
  if (!Number.isInteger(chunkTicks) || chunkTicks < 1 || chunkTicks > 1200)
    reject('chunkTicks must be an integer in 1..1200.');
  if (onProgress !== undefined && typeof onProgress !== 'function')
    reject('onProgress must be a function.');
  // Snapshot optional data before yielding. No caller callback receives core
  // state, and the ordinary verifier path retains its exact result contract.
  const requestedMastery = masteryRequest(mastery);
  checkAbort(signal);
  const prepared = prepareReplay(data);
  await yieldToHost();
  checkAbort(signal);
  if (requestedMastery) {
    if (prepared.versions.ruleset !== LEGACY_VERSIONS.ruleset)
      reject('Optional mastery observation is supported only for legacy core v2 maps.');
    const { definition, ...identity } = requestedMastery;
    prepared.mastery = {
      runId: identity.runId,
      definition,
      observer: createMasteryObserver({
        definition,
        setup: captureMasterySetup(prepared.state, { ...identity, definition }),
        initial: captureMasteryFacts(prepared.state, { ...identity, definition }),
      }),
    };
  }
  const iterator = replaySteps(prepared),
    total = prepared.data.ticks;
  const now = () => globalThis.performance?.now?.() ?? Date.now();
  let processed = 0,
    done = false;
  onProgress?.({ ticks: 0, total, fraction: total ? 0 : 1 });
  while (!done) {
    checkAbort(signal);
    const started = now();
    for (let count = 0; count < chunkTicks; count++) {
      const next = iterator.next();
      if (next.done) {
        done = true;
        break;
      }
      processed = next.value;
      if (count % 8 === 7 && now() - started >= 8) break;
    }
    onProgress?.({ ticks: processed, total, fraction: total ? processed / total : 1 });
    if (!done) {
      await yieldToHost();
      checkAbort(signal);
    }
  }
  checkAbort(signal);
  return finishVerification(prepared);
}
