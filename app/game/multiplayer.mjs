import { createRun, stepRun, releaseInputs, FIXED_DT, RULESET } from './core/index.mjs';
import { resolveVersions } from './core/versions.mjs';

export const DUEL_PROTOCOL = 'xonix-duel.v1';
export const UNTIMED_DUEL_PROTOCOL = 'xonix-duel.untimed.v1';
export const neutralCommand = () => ({
  direction: null,
  boost: false,
  action: false,
  pickup: false,
});
const terminal = (run) => ['won', 'lost'].includes(run.status);

export function createDuel(level, options = {}, { seconds = 90, protocol = DUEL_PROTOCOL } = {}) {
  const untimed = protocol === UNTIMED_DUEL_PROTOCOL;
  if (protocol !== DUEL_PROTOCOL && !untimed) throw new TypeError('Unknown race protocol.');
  if (untimed && seconds !== 0)
    throw new TypeError('Untimed races require an explicit zero duration.');
  if (!untimed && (!Number.isInteger(seconds) || seconds < 10 || seconds > 600))
    throw new TypeError('Round duration must be 10–600 seconds.');
  const runs = [createRun(level, options), createRun(level, options)];
  return {
    protocol,
    ruleset: runs[0].ruleset,
    runs,
    tick: 0,
    limitTicks: untimed ? null : seconds * 120,
    status: 'ready',
    winner: null,
    reason: '',
  };
}

export function releaseDuel(match) {
  match.runs.forEach(releaseInputs);
}
export function pauseDuel(match, { preserveContinuation = false } = {}) {
  if (match.status === 'running') match.status = 'paused';
  if (!preserveContinuation) releaseDuel(match);
}
export function resumeDuel(match, { preserveContinuation = false } = {}) {
  if (['ready', 'paused'].includes(match.status)) match.status = 'running';
  if (!preserveContinuation) releaseDuel(match);
}
function rankedWinner(runs) {
  const a = runs[0],
    b = runs[1];
  for (const key of ['coverage', 'lives', 'score']) {
    if (Math.abs(a[key] - b[key]) > 1e-8) return a[key] > b[key] ? 0 : 1;
  }
  return null;
}
function duelCommand(input) {
  if (
    !input ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).some((key) => !['direction', 'boost', 'action', 'pickup'].includes(key))
  )
    throw new TypeError('Invalid race command.');
  const command = { ...neutralCommand(), ...input };
  if (
    ![null, 'up', 'down', 'left', 'right'].includes(command.direction) ||
    ['boost', 'action', 'pickup'].some((key) => typeof command[key] !== 'boolean')
  )
    throw new TypeError('Invalid race command.');
  return command;
}
export function stepDuel(match, commands) {
  if (match.status !== 'running') return match;
  if (!Array.isArray(commands) || commands.length !== 2)
    throw new TypeError('Two player commands are required.');
  const validated = commands.map(duelCommand);
  // Both boards receive this tick before judging: simultaneous finishes can draw.
  for (let i = 0; i < 2; i++)
    if (!terminal(match.runs[i])) stepRun(match.runs[i], validated[i], FIXED_DT);
  match.tick++;
  const winners = match.runs.map((r, i) => (r.status === 'won' ? i : -1)).filter((i) => i >= 0);
  const expired = match.protocol === DUEL_PROTOCOL && match.tick >= match.limitTicks;
  if (winners.length || match.runs.every(terminal) || expired) {
    match.status = 'finished';
    match.winner =
      winners.length === 1 ? winners[0] : winners.length === 2 ? null : rankedWinner(match.runs);
    match.reason = winners.length
      ? 'First clear'
      : expired
        ? 'Time — coverage, then lives, then score'
        : 'Both flights ended';
    releaseDuel(match);
  }
  return match;
}

/** Transport-independent future input envelope. It never accepts state or rewards.
 * Supply the selected match.ruleset and match.protocol; omitted context retains
 * the legacy core2/timed-v1 gate.
 * This validator does not create a transport or authorize another match's input.
 */
export function validateDuelPacket(
  packet,
  { nextTick, player, matchId, ruleset = RULESET, protocol = DUEL_PROTOCOL },
) {
  try {
    resolveVersions({ ruleset });
  } catch {
    return false;
  }
  if (
    !packet ||
    Object.getPrototypeOf(packet) !== Object.prototype ||
    Object.keys(packet).some(
      (k) => !['protocol', 'ruleset', 'matchId', 'tick', 'player', 'input'].includes(k),
    ) ||
    ![DUEL_PROTOCOL, UNTIMED_DUEL_PROTOCOL].includes(protocol) ||
    packet.protocol !== protocol ||
    packet.ruleset !== ruleset ||
    packet.matchId !== matchId ||
    packet.tick !== nextTick ||
    packet.player !== player ||
    ![0, 1].includes(player)
  )
    return false;
  const input = packet.input;
  return (
    !!input &&
    Object.getPrototypeOf(input) === Object.prototype &&
    Object.keys(input).every((k) => ['direction', 'boost', 'action', 'pickup'].includes(k)) &&
    [null, 'up', 'down', 'left', 'right'].includes(input.direction) &&
    ['boost', 'action', 'pickup'].every((k) => typeof input[k] === 'boolean')
  );
}
