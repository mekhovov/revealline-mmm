import { HUNT_PRESENTATION_CATALOG } from '../hunt/presentation-catalog.mjs';
import { sampleActorAnimation } from '../presentation/actor-animation.mjs';
import { actorImagePaintMetrics } from './actor-presentation.mjs';

export const ACTOR_DEFEAT_LIMITS = Object.freeze({ count: 4, life: 0.42 });

/** Accepted fixed-step events only. Borrow already prepared atlas references;
 * no decode, simulation writes, inferred disappearance, audio or persistent data. */
export function createActorDefeatPresentation({
  kind,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
} = {}) {
  if (!['capture', 'team'].includes(kind)) throw new TypeError('Unknown actor defeat host.');
  let owner = null,
    tick = -1,
    time = -1,
    lastFrame = null,
    records = [];
  function reset() {
    owner = null;
    tick = -1;
    time = -1;
    lastFrame = null;
    records = [];
  }
  function bind(run) {
    if (owner !== run || run.tick < tick || run.time < time) {
      reset();
      owner = run;
      tick = run.tick;
      time = run.time;
      return false;
    }
    return true;
  }
  function observe(run, events, bodyFor) {
    if (!run || !bind(run) || run.tick <= tick) return;
    if (run.tick !== tick + 1) {
      records = [];
      tick = run.tick;
      time = run.time;
      return;
    }
    const eventTick = run.tick - Number(kind === 'team');
    for (const event of events ?? []) {
      if (
        event.tick !== eventTick ||
        !Number.isFinite(event.time) ||
        event.time < time ||
        event.time > run.time
      )
        continue;
      const id = kind === 'team' ? event.enemy : event.id;
      const actor = run.enemies.find((entry) => entry.id === id);
      const accepted =
        kind === 'team'
          ? event.type === 'enemy.defeated' &&
            event.cause === 'captured' &&
            actor?.type === 'hunter' &&
            actor.active === false
          : event.type === 'encounter.defeated' &&
            actor?.type === 'relay-sentinel' &&
            run.encounter?.defeated === true &&
            run.level.encounter?.enemyId === id;
      if (!accepted || records.some((entry) => entry.id === id)) continue;
      const body = bodyFor(id);
      if (!body?.sprite?.geometry?.animation || !body.sprite.image || !body.frame) continue;
      records.push({
        id,
        frame: Object.freeze({ ...body.frame, x: actor.x * 16, y: actor.y * 16 }),
        sprite: body.sprite,
        age: 0,
        observedAt: now(),
      });
      records = records.slice(-ACTOR_DEFEAT_LIMITS.count);
    }
    tick = run.tick;
    time = run.time;
  }
  function advance(run, { dt, paused = false, reduced = false, concealed = false } = {}) {
    if (!run) return reset();
    bind(run);
    const clock = now();
    if (concealed) records = [];
    else if (
      lastFrame !== null &&
      clock - lastFrame > HUNT_PRESENTATION_CATALOG.budgets.staleFrameMs
    )
      records = records.filter(
        (entry) => clock - entry.observedAt <= HUNT_PRESENTATION_CATALOG.budgets.staleFrameMs,
      );
    const elapsed = Number.isFinite(dt) ? dt : lastFrame === null ? 0 : (clock - lastFrame) / 1000;
    lastFrame = clock;
    if (!paused)
      records = records
        .map((entry) => ({ ...entry, age: entry.age + Math.max(0, Math.min(0.1, elapsed)) }))
        .filter((entry) => entry.age < ACTOR_DEFEAT_LIMITS.life);
    return records.map((entry) => Object.freeze({ ...entry, reduced }));
  }
  function draw(ctx, sampled, reserve) {
    const reserved = reserve(sampled.length);
    const admitted = Number.isSafeInteger(reserved)
      ? Math.max(0, Math.min(sampled.length, ACTOR_DEFEAT_LIMITS.count, reserved))
      : 0;
    if (!admitted) return;
    for (const entry of sampled.slice(-admitted)) {
      const { frame, sprite } = entry;
      const { width, height } = actorImagePaintMetrics(frame.diameter, sprite.geometry);
      const region = sampleActorAnimation(sprite.geometry.animation, {
        clip: 'caught',
        timeMs: entry.age * 1000,
        reducedEffects: entry.reduced,
      }).region;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(frame.x), Math.round(frame.y));
      ctx.rotate(frame.heading);
      // A retired body has no trail, rotor, targeting marker or contact ring.
      ctx.drawImage(
        sprite.image,
        region.x,
        region.y,
        region.width,
        region.height,
        -sprite.geometry.pivot.x * width,
        -sprite.geometry.pivot.y * height,
        width,
        height,
      );
      ctx.restore();
    }
  }
  return Object.freeze({
    reset,
    bind,
    observe,
    advance,
    draw,
    snapshot: () => Object.freeze(records.map(({ id, age }) => Object.freeze({ id, age }))),
  });
}
