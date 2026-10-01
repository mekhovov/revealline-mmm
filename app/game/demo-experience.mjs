import { FIXED_DT, releaseInputs, stepRun } from './core/index.mjs';

export function createDemoIdle(timeout = 60) {
  let elapsed = 0;
  return {
    activity() {
      elapsed = 0;
    },
    advance(seconds, eligible) {
      if (!eligible || !Number.isFinite(seconds) || seconds < 0 || seconds > 0.25) {
        elapsed = 0;
        return false;
      }
      elapsed += seconds;
      if (elapsed < timeout) return false;
      elapsed = 0;
      return true;
    },
  };
}

export function readDemoSettings(storage, key, reduced = false) {
  const defaults = { auto: !reduced, collect: false, gameSounds: false, hidePictures: false };
  try {
    const value = JSON.parse(storage.getItem(key));
    if (
      value?.version !== 1 ||
      typeof value.auto !== 'boolean' ||
      typeof value.collect !== 'boolean' ||
      (value.gameSounds !== undefined && typeof value.gameSounds !== 'boolean') ||
      (value.hidePictures !== undefined && typeof value.hidePictures !== 'boolean') ||
      Object.keys(value).some(
        (name) => !['version', 'auto', 'collect', 'gameSounds', 'hidePictures'].includes(name),
      )
    )
      return defaults;
    return {
      auto: value.auto,
      collect: value.collect,
      gameSounds: value.gameSounds === true,
      hidePictures: value.hidePictures === true,
    };
  } catch {
    return defaults;
  }
}

// This ephemeral session has no persistence, progression, or completion adapter.
export function createDemoPractice(run) {
  if (!run || ['won', 'lost'].includes(run.status))
    throw new Error('Practice needs an unfinished run.');
  releaseInputs(run);
  let phase = 'paused',
    accumulator = 0,
    direction = null,
    initiatingAction = null;
  const report = (events = [], reason = null) => ({ phase, events, tick: run.tick, reason });
  return {
    get state() {
      return run;
    },
    get phase() {
      return phase;
    },
    start(intent = {}) {
      if (phase === 'complete') return;
      if (['up', 'right', 'down', 'left'].includes(intent.direction)) direction = intent.direction;
      if (['ability', 'pickup', 'boost'].includes(intent.action)) initiatingAction = intent.action;
      if (direction || initiatingAction) phase = 'playing';
    },
    steer(next) {
      if (!['up', 'right', 'down', 'left'].includes(next) || phase === 'complete') return;
      direction = next;
      phase = 'playing';
    },
    pause() {
      if (phase !== 'complete') phase = 'paused';
      direction = null;
      initiatingAction = null;
      accumulator = 0;
      return report();
    },
    advance(seconds, controls = {}) {
      if (!Number.isFinite(seconds) || seconds < 0) throw new TypeError('Invalid practice frame.');
      if (seconds > 0.25) {
        this.pause();
        return report([], 'frame-gap');
      }
      if (phase !== 'playing') return report();
      accumulator += seconds;
      const events = [];
      while (accumulator + 1e-9 >= FIXED_DT && phase === 'playing') {
        accumulator = Math.max(0, accumulator - FIXED_DT);
        // Consume one-shot input only when a simulation tick can use it.
        const input = typeof controls === 'function' ? controls() : controls;
        const first = initiatingAction;
        initiatingAction = null;
        stepRun(
          run,
          {
            direction,
            boost: input.boost === true || first === 'boost',
            action: input.action === true || first === 'ability',
            pickup: input.pickup === true || first === 'pickup',
            switchClass: input.switchClass ?? null,
          },
          FIXED_DT,
        );
        events.push(...run.events.map((event) => structuredClone(event)));
        if (run.events.some((event) => ['capture.stopped', 'player.failed'].includes(event.type)))
          direction = null;
        if (['won', 'lost'].includes(run.status)) {
          phase = 'complete';
          accumulator = 0;
        }
      }
      return report(events);
    },
  };
}

export function createDemoCaptions() {
  let clock = 0,
    until = 0,
    key = 'demo:tipStart',
    pending = [];
  const seen = new Set();
  const cues = {
    'cut.started': 'demo:tipCut',
    'cut.closed': 'demo:tipClose',
    'capture.stopped': 'demo:tipStop',
    'boss.warning': 'demo:tipLane',
    'pickup.collected': 'demo:tipPickup',
    'powerup.collected': 'demo:tipPowerup',
    'ability.used': 'demo:tipAbility',
    'class.switched': 'demo:tipClass',
    'player.failed': 'demo:tipFailure',
    'lineImpact.seeded': 'demo:tipImpact',
    'objective.captured': 'demo:tipObjective',
  };
  const cue = (event) => {
    if (event.type === 'ability.used' && event.primitive === 'scan') return 'demo:tipScan';
    if (event.type === 'signal.changed')
      return Array.isArray(event.zoneIds) &&
        event.zoneIds.length > 0 &&
        event.resistant === false &&
        ((Number.isFinite(event.speedFactor) && event.speedFactor < 1) ||
          event.boostBlocked === true ||
          event.abilityBlocked === true)
        ? 'demo:tipSignal'
        : null;
    return Object.hasOwn(cues, event.type) ? cues[event.type] : null;
  };
  return {
    reset() {
      clock = 0;
      until = 6;
      key = 'demo:tipStart';
      pending = [];
      seen.clear();
    },
    advance(seconds, events = []) {
      clock += Math.min(0.25, Math.max(0, seconds));
      for (const event of events) {
        const next = cue(event);
        // The finite cue vocabulary bounds this queue. Keep each lesson once,
        // including same-tick capture/objective events, in its observed order.
        if (next && !seen.has(next) && !pending.includes(next)) pending.push(next);
      }
      if (pending.length && clock >= until) {
        key = pending.shift();
        seen.add(key);
        until = clock + 6;
      }
      return key;
    },
  };
}
