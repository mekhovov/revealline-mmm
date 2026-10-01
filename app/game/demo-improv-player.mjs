import { createRun, stepRun, FIXED_DT } from './core/index.mjs';
import { createRecorder, recordInput, exportReplay, verifyReplay } from './replay.mjs';
import { prepareReplayPlayer } from './replay-player.mjs';

const MAX_TICKS = 120 * 18;
const DIRECTIONS = ['up', 'right', 'down', 'left'];
const opposite = (direction) => DIRECTIONS[(DIRECTIONS.indexOf(direction) + 2) % 4];
const sides = (direction) => {
  const index = DIRECTIONS.indexOf(direction);
  return [DIRECTIONS[(index + 1) % 4], DIRECTIONS[(index + 3) % 4]];
};
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Improvised demo cancelled.', 'AbortError');
};
const randomFor = (seed) => {
  let value = seed >>> 0 || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
};
const inwardDirection = (run) => {
  const distances = [
    run.player.y,
    run.width - run.player.x,
    run.height - run.player.y,
    run.player.x,
  ];
  return ['down', 'left', 'up', 'right'][distances.indexOf(Math.min(...distances))];
};

/** Build one bounded, replay-verifiable performance through the ordinary core.
 * It is a fallback for installed levels without a reviewed recording or
 * qualified planner. The pilot mixes attempted closures with recoverable
 * mistakes; no state, reward or persistence adapter is available here. */
export async function prepareImprovPlayer(level, options = {}, { signal, performanceSeed } = {}) {
  abort(signal);
  const seed = Number.isInteger(performanceSeed) ? performanceSeed >>> 0 : options.seed >>> 0,
    random = randomFor(seed),
    run = createRun(level, options),
    recorder = createRecorder(level, options, 'revealline-improvised-demo.v1');
  let yielded = 0,
    attempt = 0;
  async function input(command = {}, ticks = 1, until = null) {
    for (let index = 0; index < ticks && run.tick < MAX_TICKS; index++) {
      if (['won', 'lost'].includes(run.status) || until?.()) break;
      stepRun(run, command, FIXED_DT);
      recordInput(recorder, command);
      if (++yielded >= 240) {
        yielded = 0;
        await new Promise((resolve) => setTimeout(resolve, 0));
        abort(signal);
      }
    }
  }
  while (run.tick < MAX_TICKS && !['won', 'lost'].includes(run.status)) {
    if (run.status === 'respawning') {
      await input({}, 600, () => run.status !== 'respawning');
      continue;
    }
    const inward = inwardDirection(run),
      side = sides(inward)[random() < 0.5 ? 0 : 1],
      livesBefore = run.lives;
    // Reposition visibly on safe ground before committing to another route.
    await input({ direction: side }, 24 + Math.floor(random() * 84), () => run.player.cutting);
    await input({ direction: inward }, 240, () => run.player.cutting);
    if (!run.player.cutting) {
      await input({ direction: opposite(side) }, 36 + Math.floor(random() * 72));
      attempt++;
      continue;
    }
    await input({ direction: inward }, 24 + Math.floor(random() * 72));
    await input({ direction: side }, 18 + Math.floor(random() * 72));
    const mistake = (seed + attempt * 5) % 4 === 0 || (attempt > 0 && random() < 0.28);
    if (mistake) {
      // Reversing over the live cable is an ordinary, legible player error.
      await input({ direction: opposite(side) }, 2, () => run.lives < livesBefore);
    } else {
      // Try to reconnect toward the nearest original edge. Obstacles and live
      // hazards still decide whether this is a capture, a recovery or a miss.
      await input({ direction: opposite(inward) }, 480, () => !run.player.cutting);
      if (run.player.cutting) await input({ direction: inward }, 2, () => run.lives < livesBefore);
    }
    await input({}, 36 + Math.floor(random() * 96));
    attempt++;
    if (attempt >= 5 && run.status === 'running' && !run.player.cutting) break;
  }
  abort(signal);
  const replay = exportReplay(recorder, run),
    verified = verifyReplay(replay);
  if (!verified.match) throw new Error('Improvised demo did not reproduce its real simulation.');
  return prepareReplayPlayer(replay, { signal });
}
