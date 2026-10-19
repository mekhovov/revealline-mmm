import { boundedJSON, canonicalJSON, dataIdentity, exactKeys, required } from './data-json.mjs';
import { createRecorder } from './replay.mjs';
import { FIXED_DT, releaseInputs, getSummary } from './core/index.mjs';
import {
  createCoop,
  startCoop,
  stepCoop,
  releaseCoopInputs,
  getCoopSummary,
} from './coop/core.mjs';
import { createDuel, resumeDuel, stepDuel } from './multiplayer.mjs';
import {
  localTerminalObservationContract,
  assertLocalTerminalObservationSupport,
  localTerminalObservations,
} from './multiplayer-terminal-observation.mjs';

// Keep the original identifier and exact reader for historical recordings.
export const LOCAL_MATCH_RECORDING = 'revealline-local-capture-recording.v1';
export const LOCAL_MATCH_RECORDING_V2 = 'revealline-local-capture-recording.v2';
export const LOCAL_MATCH_RECORDINGS = Object.freeze([
  LOCAL_MATCH_RECORDING,
  LOCAL_MATCH_RECORDING_V2,
]);
export const LOCAL_MATCH_MAX_BYTES = 4 * 1024 * 1024;
export const LOCAL_MATCH_MAX_TICKS = 240000;
const MAX_SEGMENTS = 32768;
const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const same = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const copy = (value) =>
  boundedJSON(value, {
    maxBytes: LOCAL_MATCH_MAX_BYTES,
    maxNodes: 700000,
    maxArray: MAX_SEGMENTS,
    maxDepth: 32,
    maxString: 16384,
  });
const terminal = (mode, state) =>
  mode === 'versus' ? state.status === 'finished' : ['won', 'lost'].includes(state.status);
const text = (value) => typeof value === 'string' && value.length > 0 && value.length <= 256;

/** These source pins describe ownership; importing a recording never authorizes progress. */
export function localMatchProvenance(level, ownership = {}) {
  const value = {
    sourceLevelId: level.id,
    sourceRevision: String(level.revision),
    sourceIdentity: dataIdentity(level),
    ...ownership,
  };
  exactKeys(
    value,
    ['sourceLevelId', 'sourceRevision', 'sourceIdentity', 'editionId', 'packageIdentity'],
    'Recording provenance',
  );
  required(Object.values(value).every(text), 'Invalid recording source pins.');
  required(/^[a-f0-9]{16}$/.test(value.sourceIdentity), 'Invalid recording source identity.');
  if (value.packageIdentity !== undefined)
    required(
      /^(?:[a-f0-9]{16}|[a-f0-9]{64})$/.test(value.packageIdentity),
      'Invalid recording package identity.',
    );
  return value;
}

function prepare(mode, level, options, duel) {
  required(['versus', 'team'].includes(mode), 'Unsupported local recording mode.');
  if (mode === 'versus') {
    exactKeys(duel, ['seconds', 'protocol'], 'Recorded race rules');
    const recorder = createRecorder(level, options);
    const state = createDuel(recorder.level, recorder.options, duel);
    resumeDuel(state, { preserveContinuation: true });
    return {
      state,
      level: recorder.level,
      options: recorder.options,
      duel: {
        seconds: state.limitTicks === null ? 0 : state.limitTicks / 120,
        protocol: state.protocol,
      },
    };
  }
  required(duel === null, 'Team recordings cannot contain race rules.');
  exactKeys(
    options,
    ['seed', 'difficulty', 'jointCuts', 'assistCaptures', 'advancedCooperation'],
    'Recorded Team options',
  );
  const state = createCoop(level, options);
  startCoop(state);
  return {
    state,
    level: copy(level),
    options: { seed: state.seed, difficulty: state.difficulty, ...state.config },
    duel: null,
  };
}
function command(value, mode) {
  const flags = mode === 'team' ? ['boost', 'support'] : ['boost', 'action', 'pickup'];
  exactKeys(
    value,
    ['direction', ...flags, ...(mode === 'team' ? ['steer'] : [])],
    'Recorded input',
  );
  const result = { direction: value.direction ?? null };
  required(
    [null, 'up', 'down', 'left', 'right'].includes(result.direction),
    'Invalid recorded direction.',
  );
  for (const key of flags) {
    result[key] = value[key] ?? false;
    required(typeof result[key] === 'boolean', 'Invalid recorded action.');
  }
  if (Object.hasOwn(value, 'steer')) {
    required(typeof value.steer === 'boolean', 'Invalid recorded steering.');
    result.steer = value.steer;
  }
  return result;
}
function journal(segments, mode) {
  required(
    Array.isArray(segments) && segments.length <= MAX_SEGMENTS,
    'Recording exceeds its input budget.',
  );
  let ticks = 0;
  for (const segment of segments) {
    if (Object.hasOwn(segment, 'release')) {
      exactKeys(segment, ['release'], 'Recorded input release');
      required(
        Array.isArray(segment.release) &&
          segment.release.length > 0 &&
          segment.release.length <= 2 &&
          segment.release.every(
            (seat, i) => [0, 1].includes(seat) && (i === 0 || seat > segment.release[i - 1]),
          ) &&
          (mode !== 'team' || same(segment.release, [0, 1])),
        'Invalid recorded input release.',
      );
      continue;
    }
    exactKeys(segment, ['ticks', 'commands'], 'Recorded input segment');
    required(
      Number.isSafeInteger(segment.ticks) &&
        segment.ticks > 0 &&
        Array.isArray(segment.commands) &&
        segment.commands.length === 2,
      'Invalid recorded input segment.',
    );
    required(
      segment.commands.every((value) => same(value, command(value, mode))),
      'Recorded commands must be canonical.',
    );
    ticks += segment.ticks;
    required(ticks <= LOCAL_MATCH_MAX_TICKS, 'Recording exceeds its simulation budget.');
  }
  return ticks;
}

// Hash native state constructed by this engine, never an imported object. Typed
// arrays and collections retain their type/content instead of disappearing in JSON.
function project(value) {
  if (ArrayBuffer.isView(value)) return { type: value.constructor.name, values: Array.from(value) };
  if (value instanceof Set) return { type: 'Set', values: [...value].map(project) };
  if (value instanceof Map) return { type: 'Map', values: [...value].map(project) };
  if (Array.isArray(value)) return value.map(project);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, project(item)]),
    );
  return value;
}
async function sha256(value) {
  const result = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalJSON(value)),
  );
  return [...new Uint8Array(result)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function summary(mode, state) {
  return mode === 'team'
    ? getCoopSummary(state)
    : {
        protocol: state.protocol,
        ticks: state.tick,
        status: state.status,
        winner: state.winner,
        reason: state.reason,
        boards: state.runs.map(getSummary),
      };
}

/** Observes native input only. Budget exhaustion disables export, never live play. */
export function createLocalMatchRecorder({
  mode,
  level,
  options = {},
  duel = null,
  provenance = localMatchProvenance(level),
  build = 'unknown',
  segments = [],
  format = LOCAL_MATCH_RECORDING_V2,
}) {
  required(LOCAL_MATCH_RECORDINGS.includes(format), 'Unsupported local recording format.');
  const accepted = prepare(mode, copy(level), copy(options), duel === null ? null : copy(duel));
  if (format === LOCAL_MATCH_RECORDING_V2)
    assertLocalTerminalObservationSupport(mode, accepted.state);
  const recipe = copy({
    mode,
    ruleset: accepted.state.ruleset,
    level: accepted.level,
    options: accepted.options,
    duel: accepted.duel,
    provenance,
  });
  let entries = copy(
    segments.map((segment) => (segment.release === true ? { release: [0, 1] } : segment)),
  );
  let ticks = journal(entries, mode),
    error = null,
    boundSource = null;
  const observe = (operation) => {
    if (error) return;
    try {
      operation();
      required(entries.length <= MAX_SEGMENTS, 'Recording exceeds its input budget.');
    } catch (failure) {
      error = failure.message;
      entries = [];
    }
  };
  return {
    get error() {
      return error;
    },
    bindSource(ownership) {
      // The host calls this at accepted-content handoff, before any fresh input.
      observe(() => {
        const source = copy(ownership);
        exactKeys(source, ['editionId', 'packageIdentity'], 'Recording source owner');
        required(
          boundSource === null || same(boundSource, source),
          'Recording source owner changed.',
        );
        recipe.provenance = copy(localMatchProvenance(level, { ...recipe.provenance, ...source }));
        boundSource = source;
      });
    },
    append(commands) {
      observe(() => {
        required(ticks < LOCAL_MATCH_MAX_TICKS, 'Recording exceeds its simulation budget.');
        required(
          Array.isArray(commands) && commands.length === 2,
          'Two recorded commands are required.',
        );
        const inputs = commands.map((value) => command(value, mode)),
          previous = entries.at(-1);
        if (previous?.commands && same(previous.commands, inputs)) previous.ticks++;
        else entries.push({ ticks: 1, commands: inputs });
        ticks++;
      });
    },
    release(seats = [0, 1]) {
      observe(() => {
        // Do not deduplicate releases: native Team release can emit a rescue event.
        const release = [...seats].sort();
        journal([{ release }], mode);
        entries.push({ release });
      });
    },
    async snapshot(state) {
      required(!error, error ?? 'Recording unavailable.');
      required(terminal(mode, state), 'Finish this Team attempt or Versus round before exporting.');
      required(state.tick === ticks, 'Recording is missing native input steps.');
      // Own everything before the first async yield; Retry may replace the host run.
      const native = project(state),
        observations =
          format === LOCAL_MATCH_RECORDING_V2 ? copy(localTerminalObservations(mode, state)) : null,
        value = copy({ format, build, recipe, segments: entries });
      value.recipeSha256 = await sha256(value.recipe);
      if (observations) value.inputSha256 = await sha256(value.segments);
      value.final = { tick: native.tick, status: native.status, stateSha256: await sha256(native) };
      if (observations) {
        value.final.observationContract = observations.contract;
        value.final.observationSha256 = await sha256(observations);
      }
      return snapshotLocalMatchRecording(value);
    },
  };
}

/** Bounded, descriptor-safe copy and native admission, without simulation stepping. */
export function snapshotLocalMatchRecording(source) {
  const value = copy(source);
  exactKeys(
    value,
    [
      'format',
      'build',
      'recipe',
      'recipeSha256',
      'segments',
      'final',
      ...(value.format === LOCAL_MATCH_RECORDING_V2 ? ['inputSha256'] : []),
    ],
    'Local recording',
  );
  required(
    LOCAL_MATCH_RECORDINGS.includes(value.format) && text(value.build),
    'Unsupported local recording format.',
  );
  exactKeys(
    value.recipe,
    ['mode', 'ruleset', 'level', 'options', 'duel', 'provenance'],
    'Recorded recipe',
  );
  const { mode, level, options, duel, provenance } = value.recipe;
  const accepted = prepare(mode, level, options, duel);
  if (value.format === LOCAL_MATCH_RECORDING_V2)
    assertLocalTerminalObservationSupport(mode, accepted.state);
  required(
    same(level, accepted.level) &&
      same(options, accepted.options) &&
      same(duel, accepted.duel) &&
      value.recipe.ruleset === accepted.state.ruleset,
    'Recorded recipe is not canonical.',
  );
  required(
    same(
      provenance,
      localMatchProvenance(
        { id: provenance?.sourceLevelId, revision: provenance?.sourceRevision },
        provenance,
      ),
    ),
    'Recorded source pins are not canonical.',
  );
  required(digest(value.recipeSha256), 'Invalid recorded recipe hash.');
  const ticks = journal(value.segments, mode);
  const portable = value.format === LOCAL_MATCH_RECORDING_V2;
  if (portable) required(digest(value.inputSha256), 'Invalid recorded input hash.');
  exactKeys(
    value.final,
    [
      'tick',
      'status',
      'stateSha256',
      ...(portable ? ['observationContract', 'observationSha256'] : []),
    ],
    'Recorded terminal checkpoint',
  );
  required(
    value.final.tick === ticks && digest(value.final.stateSha256) && terminal(mode, value.final),
    'Invalid recorded terminal checkpoint.',
  );
  if (portable)
    required(
      value.final.observationContract === localTerminalObservationContract(mode, accepted.state) &&
        digest(value.final.observationSha256),
      'Invalid recorded terminal observation contract.',
    );
  return value;
}

/** Replay integrity only: no installed-content, achievement or reward mutation. */
export async function verifyLocalMatchRecordingAsync(
  source,
  { signal, onProgress = () => {}, chunkTicks = 1200 } = {},
) {
  const value = snapshotLocalMatchRecording(source);
  required(
    Number.isSafeInteger(chunkTicks) && chunkTicks >= 1 && chunkTicks <= 12000,
    'Invalid verification chunk.',
  );
  const aborted = () => {
    if (signal?.aborted) throw new DOMException('Recording verification cancelled.', 'AbortError');
  };
  aborted();
  required((await sha256(value.recipe)) === value.recipeSha256, 'Recording recipe hash differs.');
  if (value.format === LOCAL_MATCH_RECORDING_V2)
    required((await sha256(value.segments)) === value.inputSha256, 'Recording input hash differs.');
  const { mode, level, options, duel } = value.recipe;
  const { state } = prepare(mode, level, options, duel);
  let ticks = 0;
  for (const segment of value.segments) {
    aborted();
    if (segment.release) {
      if (mode === 'team') releaseCoopInputs(state);
      else segment.release.forEach((seat) => releaseInputs(state.runs[seat]));
      continue;
    }
    for (let tick = 0; tick < segment.ticks; tick++) {
      required(!terminal(mode, state), 'Recorded inputs continue after the native result.');
      if (mode === 'team') stepCoop(state, segment.commands, FIXED_DT);
      else stepDuel(state, segment.commands);
      ticks++;
      if (ticks % chunkTicks === 0) {
        onProgress({ ticks, total: value.final.tick });
        await new Promise((resolve) => setTimeout(resolve, 0));
        aborted();
      }
    }
  }
  const actual = {
    summary: summary(mode, state),
    tick: ticks,
    status: state.status,
    stateSha256: await sha256(project(state)),
  };
  const portable = value.format === LOCAL_MATCH_RECORDING_V2;
  if (portable) {
    const observations = localTerminalObservations(mode, state);
    actual.observationContract = observations.contract;
    actual.observationSha256 = await sha256(observations);
  }
  aborted();
  const terminalMatch =
    terminal(mode, state) &&
    value.final.tick === actual.tick &&
    value.final.status === actual.status;
  const exactStateMatch = terminalMatch && value.final.stateSha256 === actual.stateSha256;
  const terminalObservationMatch = portable
    ? terminalMatch &&
      value.final.observationContract === actual.observationContract &&
      value.final.observationSha256 === actual.observationSha256
    : null;
  // V1 never falls back to the narrower successor observation contract.
  const match = portable ? terminalObservationMatch : exactStateMatch;
  onProgress({ ticks, total: ticks });
  return {
    match,
    exactStateMatch,
    terminalObservationMatch,
    verificationScope: portable ? actual.observationContract : 'exact-native-state.v1',
    diagnostics: !match
      ? [
          portable
            ? 'Declared terminal gameplay observations differ.'
            : 'Native terminal state differs.',
        ]
      : portable && !exactStateMatch
        ? ['Only declared terminal observations match; the raw native-state digest differs.']
        : [],
    actual,
    state,
    ticks,
    recordedBuild: value.build,
    recipe: value.recipe,
    recipeSha256: value.recipeSha256,
    ...(portable ? { inputSha256: value.inputSha256 } : {}),
    authority: portable ? 'local-terminal-observations-only' : 'local-replay-integrity-only',
  };
}
