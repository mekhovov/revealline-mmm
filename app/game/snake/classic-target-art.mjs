



const HEADINGS = new Set(['up', 'right', 'down', 'left']);
const ANGLES = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };

/** Historical v1 targets have positions but no saved heading. Observe only the
 * last rendered position of each of the two admitted targets, outside the run.
 * Accepted successor headings always win, including protected specialist fronts.
 * An unseen/ambiguous move retains the last heading rather than guessing inputs. */
export function createClassicTargetFacing() {
  let owner,
    identity,
    tick = -1,
    previous = new Map();
  return (run, attemptKey = run) => {
    const { width, height, wrap } = run.level;
    const nextIdentity = JSON.stringify([
      run.version,
      run.levelIdentity,
      run.seed,
      run.mode,
      width,
      height,
      wrap,
    ]);
    if (owner !== attemptKey || identity !== nextIdentity || run.tick < tick) previous.clear();
    const next = new Map(),
      result = new Map();
    for (const target of (run.targets ?? (run.target ? [run.target] : [])).slice(0, 2)) {
      const old = previous.get(target.id);
      let heading = HEADINGS.has(target.heading) ? target.heading : (old?.heading ?? 'up');
      if (!HEADINGS.has(target.heading) && old && run.tick > tick) {
        let dx = target.x - old.x,
          dy = target.y - old.y;
        if (wrap) {
          // Native v1 prey moves one grid cell at a time, including wrap seams.
          if (Math.abs(dx) === width - 1) dx = -Math.sign(dx);
          if (Math.abs(dy) === height - 1) dy = -Math.sign(dy);
        }
        if (dy === 0 && dx !== 0) heading = dx > 0 ? 'right' : 'left';
        else if (dx === 0 && dy !== 0) heading = dy > 0 ? 'down' : 'up';
      }
      next.set(target.id, { x: target.x, y: target.y, heading });
      result.set(target.id, heading);
    }
    previous = next;
    owner = attemptKey;
    identity = nextIdentity;
    tick = run.tick;
    return result;
  };
}

/** Pose comes from accepted phase only. The clock changes gait, never tells
 * the player a resting enemy is about to attack or predicts a future decision. */
export function classicTargetPose(options = {}, fallback = 0) {
  const phase = options.phase ?? options.tactical?.phase;
  const warning = ['warning', 'turning', 'windup', 'prepare', 'primed'].includes(phase);
  const mobileRecovery =
    ['jammer', 'guard'].includes(options.kind) &&
    phase === 'rest' &&
    options.tactical &&
    !options.tactical.stationary;
  const blocked = phase === 'blocked' || options.state === 'blocked';
  const recovering =
    !mobileRecovery &&
    ['rest', 'recovery', 'recovering', 'waiting', 'dormant', 'open'].includes(phase);
  const active = ['active', 'locked', 'burst', 'dash', 'jamming'].includes(phase);
  const stationaryAction = active && ['jammer', 'lane', 'guard', 'relay'].includes(options.kind);
  const idle = options.kind === 'still' || phase === 'dormant' || phase === 'waiting';
  const staticPose =
    options.frozen ||
    options.reducedEffects ||
    options.paused ||
    recovering ||
    warning ||
    blocked ||
    idle ||
    stationaryAction;
  const clip = warning
    ? 'anticipation'
    : blocked
      ? 'blocked'
      : idle || stationaryAction
        ? 'idle'
        : recovering
          ? 'recovery'
          : 'move';
  return {
    warning,
    recovering,
    active,
    blocked,
    clip,
    animationState: warning
      ? 'notice'
      : blocked
        ? 'blocked'
        : recovering
          ? 'recover'
          : idle || stationaryAction
            ? 'idle'
            : options.state,
    stride: staticPose
      ? 0
      : Number.isFinite(options.timeMs)
        ? Math.floor(options.timeMs / (active ? 70 : 115)) % 6
        : fallback,
    stance: warning
      ? 'prepare'
      : blocked
        ? 'blocked'
        : active
          ? 'action'
          : recovering || idle
            ? 'recover'
            : 'travel',
  };
}


import { drawConnectionToken } from './coupa-art.mjs';
export function drawClassicTarget(ctx, x, y, size, pose=0, options={}) {
  drawConnectionToken(ctx, x, y, size, options, classicTargetPose(options, pose));
}
