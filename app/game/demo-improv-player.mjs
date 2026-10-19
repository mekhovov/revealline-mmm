import { createRun, stepRun, FIXED_DT } from './core/index.mjs';
import {
  createRecorder,
  recordInput,
  exportReplay,
  verifyReplayAsync,
  MAX_REPLAY_TICKS,
} from './replay.mjs';
import { prepareReplayPlayer } from './replay-player.mjs';
import { planImprovMacro } from './demo-bot.mjs';

// Resource guards reject preparation, never publish unfinished scene endpoints.
const MAX_TICKS = MAX_REPLAY_TICKS;
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Improvised demo cancelled.', 'AbortError');
};

/** Build one bounded, replay-verifiable performance through the ordinary core.
 * It is a fallback for installed levels without a reviewed recording or
 * qualified live planner. Routes approach through safe ground and attempt
 * actual closures. A real hazard may catch an occasional ambitious cut;
 * no scripted suicide, reward or persistence adapter is available here. */
export async function prepareImprovPlayer(level, options = {}, { signal, performanceSeed } = {}) {
  abort(signal);
  const seed = Number.isInteger(performanceSeed) ? performanceSeed >>> 0 : options.seed >>> 0,
    run = createRun(level, options),
    recorder = createRecorder(level, options, 'revealline-improvised-demo.v2');
  let yielded = 0,
    captures = 0,
    losses = 0,
    misses = 0;
  async function input(command = {}, ticks = 1, until = null) {
    for (let index = 0; index < ticks && run.tick < MAX_TICKS; index++) {
      if (['won', 'lost'].includes(run.status) || until?.()) break;
      stepRun(run, command, FIXED_DT);
      recordInput(recorder, command);
      captures += run.events.filter((event) => event.type === 'cut.closed').length;
      losses += run.events.filter((event) => event.type === 'player.failed').length;
      if (++yielded >= 240) {
        yielded = 0;
        await new Promise((resolve) => setTimeout(resolve, 0));
        abort(signal);
      }
    }
  }
  for (let decision = 0; decision < 512 && run.tick < MAX_TICKS; decision++) {
    if (['won', 'lost'].includes(run.status)) break;
    const macro = await planImprovMacro(run, {
      plannerSeed: seed,
      decision,
      // Establish competence first. Later losses must still come from a
      // simulated sustained cut caught by a real hazard, never steering jitter.
      allowRisk: captures > 0,
      preferSafe: losses > 0,
      signal,
    });
    // Try a different shortlist without changing the real run. Bounded
    // preparation failure cannot masquerade as the end of a playable level.
    if (!macro) {
      if (++misses >= 12) break;
      continue;
    }
    misses = 0;
    if (run.tick + macro.ticks > MAX_TICKS) break;
    for (const segment of macro.segments) await input(segment.input, segment.ticks);
    if (run.status === 'respawning') await input({}, 600, () => run.status !== 'respawning');
  }
  abort(signal);
  if (!captures || !['won', 'lost'].includes(run.status))
    throw new Error('No complete purposeful performance is available for this level.');
  const replay = exportReplay(recorder, run),
    verified = await verifyReplayAsync(replay, { signal });
  if (!verified.match) throw new Error('Improvised demo did not reproduce its real simulation.');
  return prepareReplayPlayer(replay, { signal });
}
