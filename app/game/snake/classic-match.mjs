import { boundedJSON, canonicalJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import {
  createClassicSnake,
  queueClassicSnakeTurn,
  stepClassicSnake,
  classicSnakeSummary,
  exportClassicSnakeReplay,
  restoreClassicSnakeReplay,
  classicSnakeUsesVariableHazards,
} from './classic-core.mjs';

export const CLASSIC_SNAKE_MATCH_VERSION = 'classic-snake-match.v1';
const MAX_TURNS = 32768;
const MAX_TIME = 9000300;
const copy = (v) => structuredClone(v);
const freeze = (v) => {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
};
const integer = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
const finiteTime = (t) => Number.isFinite(t) && t >= 0 && t <= MAX_TIME;

function optionsFor(level, input) {
  const value = boundedJSON(input, { maxBytes: 2048, maxNodes: 20, maxDepth: 1 });
  exactKeys(
    value,
    ['mode', 'seed', 'hazardSeed', 'policy', 'durationMs', 'catchDeadlineMs'],
    'Snake match options',
  );
  const mode = value.mode ?? 'solo',
    seed = value.seed ?? 17;
  const policy =
    value.policy ??
    (level.objective === 'endless' ? (mode === 'versus' ? 'score' : 'endless') : 'mission');
  const durationMs = value.durationMs ?? 180000,
    catchDeadlineMs = value.catchDeadlineMs ?? 30000;
  required(
    classicSnakeUsesVariableHazards(level)
      ? integer(value.hazardSeed, 0, 0xffffffff)
      : !Object.hasOwn(value, 'hazardSeed'),
    'Snake match interference seed differs from its recipe.',
  );
  required(
    ['solo', 'versus', 'team'].includes(mode) && integer(seed, 0, 0xffffffff),
    'Invalid Snake match seats or seed.',
  );
  required(
    ['mission', 'endless', 'score', 'survival'].includes(policy),
    'Invalid Snake match policy.',
  );
  required(
    durationMs === 180000 && catchDeadlineMs === 30000,
    'Use the registered Snake match clocks.',
  );
  required(
    policy === 'mission'
      ? level.objective !== 'endless'
      : [
          'classic-snake-level.v2',
          'classic-snake-level.v3',
          'classic-snake-level.v4',
          'classic-snake-level.v6',
        ].includes(level.version) && level.objective === 'endless',
    'Snake objective and match policy differ.',
  );
  required(
    ['score', 'survival'].includes(policy)
      ? mode === 'versus'
      : policy !== 'endless' || mode !== 'versus',
    'This Snake match policy needs its supported seats.',
  );
  if (policy === 'survival')
    required(
      !level.wrap &&
        !level.walls.length &&
        !level.shutters.length &&
        !level.pickups.length &&
        level.targets.maxActive === 1 &&
        level.targets.required.every((p) => p.kind === 'still') &&
        level.targets.bonus === null,
      'Survival duel uses the open, stationary-target field.',
    );
  return freeze({
    mode,
    seed,
    ...(Object.hasOwn(value, 'hazardSeed') ? { hazardSeed: value.hazardSeed } : {}),
    policy,
    durationMs,
    catchDeadlineMs,
  });
}

export function createClassicSnakeMatch(level, options = {}) {
  const first = createClassicSnake(level, {
    mode: options.mode === 'team' ? 'team' : 'solo',
    seed: options.seed ?? 17,
    ...(Object.hasOwn(options, 'hazardSeed') ? { hazardSeed: options.hazardSeed } : {}),
  });
  const recipe = optionsFor(first.level, options);
  return {
    version: CLASSIC_SNAKE_MATCH_VERSION,
    options: recipe,
    runs:
      recipe.mode === 'versus'
        ? [
            first,
            createClassicSnake(first.level, {
              mode: 'solo',
              seed: recipe.seed,
              ...(Object.hasOwn(recipe, 'hazardSeed') ? { hazardSeed: recipe.hazardSeed } : {}),
            }),
          ]
        : [first],
    elapsedMs: 0,
    status: 'running',
    result: null,
    boardResults: Array(recipe.mode === 'versus' ? 2 : 1).fill(null),
    lastCatchAt: Array(recipe.mode === 'versus' ? 2 : 1).fill(0),
    turns: [],
  };
}
function complete(match, result) {
  match.status = 'finished';
  match.result = result;
}
function scoreWinner(match) {
  return match.runs[0].score === match.runs[1].score
    ? 'draw'
    : match.runs[0].score > match.runs[1].score
      ? 'p1'
      : 'p2';
}
function observeResults(match) {
  for (let i = 0; i < match.runs.length; i++) {
    const run = match.runs[i];
    if (!match.boardResults[i] && run.status !== 'running')
      match.boardResults[i] = {
        atMs: match.elapsedMs,
        status: run.status,
        cause: run.failure?.cause ?? 'quota',
      };
  }
  const { mode, policy, durationMs } = match.options;
  if (mode !== 'versus') {
    if (match.boardResults[0]) complete(match, match.runs[0].status === 'won' ? 'won' : 'lost');
    return;
  }
  if (policy === 'mission' || policy === 'survival') {
    const [a, b] = match.boardResults;
    if (a || b) {
      if (a && b)
        complete(match, a.status === b.status ? 'draw' : a.status === 'won' ? 'p1' : 'p2');
      else if (a) complete(match, a.status === 'won' ? 'p1' : 'p2');
      else complete(match, b.status === 'won' ? 'p2' : 'p1');
      return;
    }
  }
  if (policy === 'score' && match.boardResults.every(Boolean)) {
    complete(match, scoreWinner(match));
    return;
  }
  if (['score', 'survival'].includes(policy) && match.elapsedMs === durationMs) {
    match.boardResults = match.boardResults.map(
      (r) => r ?? { atMs: durationMs, status: 'survived', cause: 'time' },
    );
    complete(match, scoreWinner(match));
  }
}
export function nextClassicSnakeMatchEventAt(match) {
  if (match.status !== 'running') return Infinity;
  const times = match.runs.flatMap((run, i) =>
    match.boardResults[i] ? [] : [run.elapsedMs + classicSnakeSummary(run).stepMs],
  );
  if (match.options.policy === 'survival')
    for (let i = 0; i < match.runs.length; i++)
      if (!match.boardResults[i]) times.push(match.lastCatchAt[i] + match.options.catchDeadlineMs);
  if (['score', 'survival'].includes(match.options.policy)) times.push(match.options.durationMs);
  return Math.min(...times);
}

/** Inputs are journaled at the shared accepted game clock, never wall time. */
export function queueClassicSnakeMatchTurn(match, seat, direction) {
  if (
    match.status !== 'running' ||
    !integer(seat, 0, match.options.mode === 'solo' ? 0 : 1) ||
    match.turns.length >= MAX_TURNS
  )
    return false;
  const index = match.options.mode === 'versus' ? seat : 0,
    player = match.options.mode === 'team' ? seat : 0;
  if (match.boardResults[index]) return false;
  if (!queueClassicSnakeTurn(match.runs[index], player, direction)) return false;
  match.turns.push({ atMs: match.elapsedMs, seat, direction });
  observeResults(match);
  return true;
}

/** Moves at one timestamp resolve on every due board before expiry or victory. */
export function advanceClassicSnakeMatchTo(match, time, { onStep } = {}) {
  required(finiteTime(time) && time >= match.elapsedMs, 'Invalid monotonic Snake match time.');
  if (match.status !== 'running') return match;
  let next = nextClassicSnakeMatchEventAt(match);
  while (next <= time && match.status === 'running') {
    required(next >= match.elapsedMs && Number.isFinite(next), 'Invalid Snake event clock.');
    match.elapsedMs = next;
    for (let i = 0; i < match.runs.length; i++) {
      const run = match.runs[i];
      if (match.boardResults[i] || run.elapsedMs + classicSnakeSummary(run).stepMs !== next)
        continue;
      stepClassicSnake(run);
      onStep?.({ match, run, board: i, elapsedMs: next });
      if (run.events.some((event) => event.type === 'target.caught')) match.lastCatchAt[i] = next;
    }
    // A legal catch on the deadline refreshes it. Fatal movement still owns its
    // board result, and a match cap never erases a catch at that same instant.
    for (let i = 0; i < match.runs.length; i++)
      if (!match.boardResults[i]) {
        const run = match.runs[i];
        if (run.status !== 'running')
          match.boardResults[i] = {
            atMs: next,
            status: run.status,
            cause: run.failure?.cause ?? 'quota',
          };
        else if (
          match.options.policy === 'survival' &&
          match.lastCatchAt[i] + match.options.catchDeadlineMs === next
        )
          match.boardResults[i] = { atMs: next, status: 'lost', cause: 'catch-deadline' };
      }
    observeResults(match);
    next = nextClassicSnakeMatchEventAt(match);
  }
  if (match.status === 'running') match.elapsedMs = time;
  return match;
}
export function classicSnakeMatchSummary(match) {
  return {
    version: match.version,
    mode: match.options.mode,
    policy: match.options.policy,
    status: match.status,
    result: match.result,
    elapsedMs: match.elapsedMs,
    remainingMs: ['score', 'survival'].includes(match.options.policy)
      ? Math.max(0, match.options.durationMs - match.elapsedMs)
      : null,
    boards: match.runs.map((run, i) => ({
      ...classicSnakeSummary(run),
      finished: !!match.boardResults[i],
      result: copy(match.boardResults[i]),
      catchRemainingMs:
        match.options.policy === 'survival' && !match.boardResults[i]
          ? Math.max(0, match.lastCatchAt[i] + match.options.catchDeadlineMs - match.elapsedMs)
          : null,
    })),
  };
}
const checkpoint = (match) =>
  dataIdentity({
    options: match.options,
    elapsedMs: match.elapsedMs,
    status: match.status,
    result: match.result,
    boardResults: match.boardResults,
    lastCatchAt: match.lastCatchAt,
    replays: match.runs.map(exportClassicSnakeReplay),
  });
export function exportClassicSnakeMatch(match) {
  return {
    format: CLASSIC_SNAKE_MATCH_VERSION,
    options: copy(match.options),
    elapsedMs: match.elapsedMs,
    turns: copy(match.turns),
    replays: match.runs.map(exportClassicSnakeReplay),
    checkpoint: checkpoint(match),
  };
}
export function restoreClassicSnakeMatch(source, { level: expected, onStart, onStep } = {}) {
  const value = boundedJSON(source, {
    maxBytes: 6 * 1024 * 1024,
    maxNodes: 500000,
    maxArray: MAX_TURNS,
    maxDepth: 14,
  });
  exactKeys(
    value,
    ['format', 'options', 'elapsedMs', 'turns', 'replays', 'checkpoint'],
    'Snake match replay',
  );
  required(
    value.format === CLASSIC_SNAKE_MATCH_VERSION &&
      finiteTime(value.elapsedMs) &&
      Array.isArray(value.replays) &&
      value.replays.length >= 1 &&
      value.replays.length <= 2 &&
      Array.isArray(value.turns) &&
      value.turns.length <= MAX_TURNS &&
      /^[a-f0-9]{16}$/.test(value.checkpoint),
    'Invalid Snake match replay.',
  );
  const checked = value.replays.map((r) => restoreClassicSnakeReplay(r, { level: expected }));
  const match = createClassicSnakeMatch(checked[0].level, value.options);
  required(
    checked.length === match.runs.length &&
      checked.every(
        (r, i) =>
          r.levelIdentity === match.runs[i].levelIdentity &&
          r.seed === match.options.seed &&
          r.hazardSeed === match.options.hazardSeed &&
          r.mode === match.runs[i].mode,
      ),
    'Snake boards do not share the accepted match recipe.',
  );
  onStart?.(match);
  let prior = 0;
  for (const turn of value.turns) {
    exactKeys(turn, ['atMs', 'seat', 'direction'], 'Snake match input');
    required(
      finiteTime(turn.atMs) && turn.atMs >= prior && turn.atMs <= value.elapsedMs,
      'Invalid Snake match input time.',
    );
    prior = turn.atMs;
    advanceClassicSnakeMatchTo(match, turn.atMs, { onStep });
    required(
      match.elapsedMs === turn.atMs && queueClassicSnakeMatchTurn(match, turn.seat, turn.direction),
      'Snake match contains a late or rejected input.',
    );
  }
  advanceClassicSnakeMatchTo(match, value.elapsedMs, { onStep });
  required(
    match.elapsedMs === value.elapsedMs &&
      canonicalJSON(match.runs.map(exportClassicSnakeReplay)) === canonicalJSON(value.replays) &&
      checkpoint(match) === value.checkpoint,
    'Snake match failed exact timeline verification.',
  );
  return match;
}

/** Historical wrappers had board journals only. Recover earliest legal input
 * times; the sole input-limit result retains its accepted fractional end time. */
export function restoreClassicSnakeLegacyMatch(source, { level, onStart, onStep } = {}) {
  const value = boundedJSON(source, {
    maxBytes: 4 * 1024 * 1024,
    maxNodes: 200000,
    maxArray: 16384,
    maxDepth: 10,
  });
  exactKeys(value, ['replays', 'elapsedMs', 'mode'], 'Legacy Snake match');
  required(
    ['solo', 'versus', 'team'].includes(value.mode) &&
      finiteTime(value.elapsedMs) &&
      Array.isArray(value.replays) &&
      value.replays.length === (value.mode === 'versus' ? 2 : 1),
    'Invalid historical Snake match.',
  );
  required(
    value.replays.every((r) => r.version === 'classic-snake-replay.v1'),
    'Only historical v1 Snake sessions use this migration.',
  );
  const checked = value.replays.map((r) => restoreClassicSnakeReplay(r, { level })),
    seed = checked[0].seed;
  required(
    checked.every((r) => r.seed === seed && r.mode === (value.mode === 'team' ? 'team' : 'solo')),
    'Historical Snake setup differs.',
  );
  const terminal = checked.filter((r) => r.status !== 'running'),
    limited = terminal.filter((r) => r.failure?.cause === 'input-limit');
  required(
    value.elapsedMs >= Math.max(...checked.map((r) => r.elapsedMs)) &&
      value.elapsedMs <
        Math.min(...checked.map((r) => r.elapsedMs + classicSnakeSummary(r).stepMs)) &&
      (limited.length
        ? terminal.length === 1
        : !terminal.length || value.elapsedMs === Math.min(...terminal.map((r) => r.elapsedMs))),
    'Historical Snake timing differs.',
  );
  const commands = [];
  for (let board = 0; board < checked.length; board++) {
    const saved = value.replays[board],
      run = createClassicSnake(saved.level, { mode: saved.mode, seed: saved.seed });
    let cursor = 0;
    for (let tick = 0; tick <= saved.steps; tick++) {
      while (saved.turns[cursor]?.tick === tick) {
        const t = saved.turns[cursor++],
          atMs =
            checked[board].failure?.cause === 'input-limit' && cursor === saved.turns.length
              ? value.elapsedMs
              : run.elapsedMs;
        commands.push({
          atMs,
          seat: value.mode === 'versus' ? board : t.playerId,
          direction: t.direction,
          order: commands.length,
        });
        required(
          queueClassicSnakeTurn(run, t.playerId, t.direction),
          'Invalid historical Snake input.',
        );
      }
      if (tick < saved.steps) stepClassicSnake(run);
    }
  }
  commands.sort((a, b) => a.atMs - b.atMs || a.order - b.order);
  const match = createClassicSnakeMatch(checked[0].level, {
    mode: value.mode,
    seed,
    policy: 'mission',
  });
  onStart?.(match);
  for (const { atMs, seat, direction } of commands) {
    advanceClassicSnakeMatchTo(match, atMs, { onStep });
    required(
      match.elapsedMs === atMs && queueClassicSnakeMatchTurn(match, seat, direction),
      'Historical Snake boards disagree.',
    );
  }
  advanceClassicSnakeMatchTo(match, value.elapsedMs, { onStep });
  required(
    match.elapsedMs === value.elapsedMs &&
      canonicalJSON(match.runs.map(exportClassicSnakeReplay)) === canonicalJSON(value.replays),
    'Historical Snake match failed exact migration.',
  );
  return match;
}
