import { prepareTeamEnemies, teamEnemySlot } from './coop-enemy-slots.mjs';
import { prepareTeamPilots, teamPilotSlot } from './coop-pilot-slots.mjs';
import { prepareTeamCores, teamCoreState } from './coop-core-presentation.mjs';
import {
  actorDiameter,
  actorImagePaintMetrics,
  createActorPresentation,
  drawPresentedActor,
} from '../ui/actor-presentation.mjs';
import { drawPresentationImage } from '../ui/presentation-draw-image.mjs';
import { loadEnemyPresentationCatalog } from '../ui/enemy-body-assets.mjs';

import { coopPilotBodyOffset } from './coop-actor-layout.mjs';

const CELL = 16;
const DIRECTION = Object.freeze({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] });
// Image reuse is explicit. These roles never replace a Team behavior/type.
export const COOP_ACTOR_ROLES = Object.freeze({
  pilot: Object.freeze({ role: 'team-pilot', slot: 'player.scout' }),
  drifter: Object.freeze({
    role: 'team-field-bouncer',
    slot: 'enemy.bouncer',
    motionType: 'bouncer',
  }),
  hunter: Object.freeze({
    role: 'team-line-hunter',
    slot: 'enemy.border-patrol',
    motionType: 'border-patrol',
  }),
  'claimed-rover': Object.freeze({
    role: 'team-reclaimed-roamer',
    slot: 'enemy.claimed-rover',
    motionType: 'claimed-rover',
  }),
  core: Object.freeze({ role: 'team-stronghold', slot: 'enemy.relay-sentinel' }),
});
const key = (kind, id) => `${kind}:${id}`;
const TAU = Math.PI * 2;
const turnDelta = (target, heading) =>
  ((((target - heading + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

/** Two cosmetic observations only: downed rotors stay frozen while real crawl
 * displacement can turn the body. State transitions may teleport to an anchor;
 * those displacements must never masquerade as crawling. */
function pilotPose(run, player, frame, old, dt, reduced, recovered) {
  const running = run.status === 'running',
    changed = old && old.tick !== run.tick,
    sameStatus = old?.status === player.status && !recovered;
  let heading = old?.heading ?? frame.heading,
    target = sameStatus ? old.target : heading,
    moving = running && sameStatus && !changed ? old.moving : false;
  if (running && changed && sameStatus) {
    const dx = player.x - old.x,
      dy = player.y - old.y;
    moving = Math.hypot(dx, dy) > 0.00001;
    if (moving) target = Math.atan2(dy, dx) + Math.PI / 2;
    if (player.status === 'active' || moving)
      heading = reduced
        ? target
        : heading + Math.max(-dt * 12, Math.min(dt * 12, turnDelta(target, heading)));
  }
  const rescue = player.rescue,
    partner =
      running && player.status === 'active' && Number.isInteger(rescue?.target)
        ? run.players.find((other) => other.id === rescue.target && other.id !== player.id)
        : null,
    rescueTarget = partner?.status === 'downed' ? partner.id : null;
  const pilotState =
    player.status === 'downed'
      ? moving
        ? 'crawling'
        : 'downed'
      : rescueTarget !== null
        ? 'rescuing'
        : player.cutting
          ? 'cutting'
          : player.graceUntil > run.time
            ? 'recovery'
            : 'normal';
  return {
    sample: {
      x: player.x,
      y: player.y,
      tick: run.tick,
      status: player.status,
      graceUntil: player.graceUntil,
      reserves: run.team.reserves,
      rescues: run.team.rescues,
      recoveryTick: recovered ? run.tick : null,
      heading,
      target,
      moving,
    },
    pose: { heading, pilotState, rescueTarget },
  };
}

/** Hunters lock an exposed point before moving. Their prepared body's nose
 * must agree with that lock, not the previous patrol or a live player position.
 * Commitment uses the core's actual velocity; recovery retains its last pose.
 * No interpolation delays the visible aim or advances a paused checkpoint. */
function hunterPose(run, enemy, frame, old) {
  if (run.status !== 'running' && old)
    return { heading: old.heading, bank: frame.reduced ? 0 : old.bank };
  let dx, dy;
  if (enemy.phase === 'warning') {
    dx = enemy.targetPoint?.x - enemy.x;
    dy = enemy.targetPoint?.y - enemy.y;
  } else if (enemy.phase === 'commit') {
    dx = enemy.vx;
    dy = enemy.vy;
  } else if (enemy.phase !== 'recovery') return null;
  const heading =
    Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) > 0.00001
      ? Math.atan2(dy, dx) + Math.PI / 2
      : (old?.heading ?? frame.heading);
  return { heading, bank: 0 };
}

/** Borrow prepared sprites and keep cosmetic samples only; never acquire assets or mutate a run. */
export function createCoopActorPresentation({
  loadEnemyCatalog = loadEnemyPresentationCatalog,
} = {}) {
  const sampler = createActorPresentation();
  let snapshot = null,
    sprites = new Map(),
    pilotSprites = new Map(),
    enemySprites = new Map(),
    coreFrames = Object.freeze({}),
    entries = new Map(),
    pilots = new Map(),
    attempt = null,
    previousTick = null,
    previousTime = 0,
    motionCatalog = null,
    catalogGeneration = 0;
  function reset() {
    sampler.reset();
    entries = new Map();
    pilots = new Map();
    attempt = null;
    previousTick = null;
    previousTime = 0;
  }
  function setPresentation(next) {
    const nextEnemies = prepareTeamEnemies(next);
    const nextPilots = prepareTeamPilots(next);
    const prepared = new Map();
    const nextCoreFrames = prepareTeamCores(next);
    if (typeof next?.image === 'function') {
      for (const slot of [
        'player.scout.compact',
        'player.scout.detailed',
        'enemy.bouncer',
        'enemy.border-patrol',
        'enemy.relay-sentinel',
      ]) {
        const sprite = next.image(slot);
        if (sprite?.image && sprite.geometry) prepared.set(slot, sprite);
      }
    }
    for (const [id, frame] of Object.entries(nextCoreFrames))
      if (frame.kind === 'image') prepared.set(id, frame);
    snapshot = next;
    sprites = prepared;
    pilotSprites = nextPilots;
    enemySprites = nextEnemies;
    coreFrames = nextCoreFrames;
    reset();
    const ticket = ++catalogGeneration;
    motionCatalog = null;
    const theme = next?.resolved?.theme;
    if (!next || (theme?.id !== 'fpv' && theme?.family !== 'fpv')) return Promise.resolve();
    return Promise.resolve()
      .then(loadEnemyCatalog)
      .then(
        (catalog) => {
          if (ticket === catalogGeneration) motionCatalog = catalog;
        },
        () => {
          // Surface accents are optional. Prepared bodies and functional Team
          // cues remain usable when the bounded catalog is unavailable.
        },
      );
  }
  function update(
    run,
    {
      reduced = false,
      motionScale = 1,
      canvasCSSWidth = 1152,
      style = 'hybrid',
      previousRun = null,
    } = {},
  ) {
    if (
      attempt !== run &&
      previousRun &&
      previousRun.level === run.level &&
      previousRun.tick === run.tick - 1 &&
      previousRun.time < run.time
    ) {
      update(previousRun, { reduced, motionScale, canvasCSSWidth, style });
      attempt = run;
    }
    if (attempt !== run || run.tick < previousTick || run.time < previousTime) {
      reset();
      attempt = run;
    }
    const width = Number.isFinite(canvasCSSWidth) && canvasCSSWidth > 0 ? canvasCSSWidth : 1152;
    const screenScale = width / (run.width * CELL);
    const elapsed =
      previousTick === null || previousTick === run.tick
        ? 0
        : Math.max(0, Math.min(0.1, run.time - previousTime));
    const scale = Number.isFinite(motionScale) ? Math.max(0, Math.min(1, motionScale)) : 1;
    reduced ||= scale === 0;
    const treatment = style === 'microtile' || width < 480 ? 'compact' : 'detailed';
    const actors = [],
      descriptions = new Map(),
      frozen = [];
    // The Team core preserves authored velocity during a timed freeze. Read
    // its exact active interval rather than inferring motion from that velocity;
    // this holds cosmetic parts without dimming bodies or changing role cues.
    const freeze = run.bonuses?.effects?.['enemy-freeze'],
      enemiesFrozen = Boolean(freeze && run.tick >= freeze.from && run.tick < freeze.until);
    for (const player of run.players) {
      const id = key('pilot', player.id),
        vector = DIRECTION[player.direction] ?? [0, 0],
        prior = pilots.get(id),
        // Both pilots can be downed and revived inside one core step. Grace
        // can also clear before the next observed frame when a new cut starts.
        // Durable reserve/rescue changes therefore discard one displacement
        // sample for both pilots when the recovered seat is no longer known.
        // The unaffected partner resumes normal motion on the next core tick.
        recovered = Boolean(
          prior &&
            player.status === 'active' &&
            (player.graceUntil > prior.graceUntil ||
              run.team.reserves < prior.reserves ||
              run.team.rescues > prior.rescues ||
              prior.recoveryTick === run.tick),
        );
      actors.push({
        id,
        type: 'team-pilot',
        x: player.x,
        y: player.y,
        vx: vector[0],
        vy: vector[1],
        radius: player.radius,
      });
      descriptions.set(id, {
        ...COOP_ACTOR_ROLES.pilot,
        player,
        recovered,
        radius: player.radius,
        slot: `${COOP_ACTOR_ROLES.pilot.slot}.${treatment}`,
      });
      if (player.status === 'downed') frozen.push({ id, frozen: true, stunned: true });
      else if (recovered) frozen.push({ id, frozen: true });
    }
    for (const enemy of run.enemies) {
      if (enemy.active === false || !['drifter', 'hunter', 'claimed-rover'].includes(enemy.type))
        continue;
      const id = key('enemy', enemy.id);
      if (enemy.type === 'claimed-rover') {
        const slot = COOP_ACTOR_ROLES[enemy.type].slot;
        if (!sprites.has(slot)) sprites.set(slot, snapshot?.image?.(slot) ?? null);
        frozen.push({
          id,
          mode: enemy.rover?.mode,
          frozen: enemiesFrozen || enemy.rover?.mode !== 'active',
        });
      } else if (enemiesFrozen) frozen.push({ id, frozen: true });
      actors.push({
        id,
        type: enemy.type,
        x: enemy.x,
        y: enemy.y,
        vx: enemy.vx,
        vy: enemy.vy,
        radius: enemy.radius,
      });
      descriptions.set(id, { ...COOP_ACTOR_ROLES[enemy.type], radius: enemy.radius, enemy });
    }
    for (const stronghold of run.strongholds || []) {
      const id = key('core', stronghold.id);
      actors.push({ id, type: 'team-stronghold', x: stronghold.core.x, y: stronghold.core.y });
      const stateSlot = `team.core.${teamCoreState(stronghold)}`;
      descriptions.set(id, {
        ...COOP_ACTOR_ROLES.core,
        slot: coreFrames[stateSlot]?.kind === 'image' ? stateSlot : COOP_ACTOR_ROLES.core.slot,
        secured: stronghold.defeated,
        customCore: coreFrames[stateSlot]?.kind === 'image',
      });
      frozen.push({ id, frozen: true });
    }
    const frames = sampler.sample(actors, {
      tick: run.tick,
      time: run.time,
      dt: elapsed * scale,
      paused: run.status !== 'running',
      reduced,
      classic: { enemies: frozen },
      style,
      themeId: 'fpv',
      screenScale,
      canvasCSSWidth: width,
    });
    const next = new Map(),
      nextPilots = new Map();
    for (const [id, sampled] of frames) {
      const description = descriptions.get(id),
        core = description.role === COOP_ACTOR_ROLES.core.role;
      let frame = sampled;
      if (description.player) {
        const result = pilotPose(
          run,
          description.player,
          sampled,
          pilots.get(id),
          elapsed * scale,
          reduced,
          description.recovered,
        );
        nextPilots.set(id, result.sample);
        // Geometry must use the final heading, including pivot and rotor bounds.
        frame = { ...sampled, ...result.pose };
      } else if (description.enemy?.type === 'hunter') {
        const pose = hunterPose(run, description.enemy, sampled, entries.get(id)?.frame);
        if (pose) frame = { ...sampled, ...pose };
      }
      const stateSlot = description.player
        ? teamPilotSlot(description.player.id, frame.pilotState, treatment)
        : description.enemy
          ? teamEnemySlot(description.enemy)
          : null;
      const sourceSlot =
        pilotSprites.has(stateSlot) || enemySprites.has(stateSlot) ? stateSlot : description.slot;
      const sprite =
        pilotSprites.get(sourceSlot) ??
        enemySprites.get(sourceSlot) ??
        sprites.get(sourceSlot) ??
        null;
      const bodyOffset =
        description.role === COOP_ACTOR_ROLES.pilot.role && sprite
          ? coopPilotBodyOffset(
              frame,
              sprite.geometry,
              run.width * CELL,
              run.height * CELL,
              1 / screenScale,
            )
          : null;
      const bodyRecord = description.enemy
        ? (motionCatalog?.forFrame(
            { ...frame, type: description.motionType, themeId: 'fpv' },
            {},
          ) ?? null)
        : null;
      next.set(id, {
        sprite,
        bodyRecord,
        secured: description.secured === true,
        customCore: description.customCore === true,
        frame: Object.freeze({
          ...frame,
          role: description.role,
          sourceSlot,
          stateSlot,
          enemyState: description.enemy ? (stateSlot?.split('.').at(-1) ?? null) : null,
          bodyOffset,
          // The shared sampler bounds cosmetic data; Team owns the real footprint.
          radius: core ? 0 : description.radius * CELL,
          // Team cores have no circular contact hitbox. Only their body uses boss sizing.
          diameter: core
            ? actorDiameter({ role: 'boss', style, screenScale, canvasCSSWidth: width })
            : frame.diameter,
        }),
      });
    }
    entries = next;
    pilots = nextPilots;
    previousTick = run.tick;
    previousTime = run.time;
  }
  function frame(kind, id) {
    return entries.get(key(kind, id))?.frame ?? null;
  }
  function draw(ctx, kind, id, palette) {
    const entry = entries.get(key(kind, id));
    if (!snapshot || !entry?.sprite) return false;
    const { frame, sprite } = entry;
    ctx.save();
    try {
      // Shared actor helpers use pixels; Team's surrounding painter uses cells.
      ctx.scale(1 / CELL, 1 / CELL);
      ctx.imageSmoothingEnabled = false;
      if (kind === 'core') {
        const paint = actorImagePaintMetrics(frame.diameter, sprite.geometry);
        ctx.globalAlpha = entry.secured && !entry.customCore ? 0.45 : 1;
        drawPresentationImage(
          ctx,
          sprite.image,
          frame.x,
          frame.y,
          paint.width,
          paint.height,
          sprite.geometry,
        );
      } else
        drawPresentedActor(ctx, frame, palette, sprite.image, sprite.geometry, entry.bodyRecord, {
          bodyOffset: frame.bodyOffset,
          // Prepared geometry owns the motor hubs in every Team state.
          showRotors: true,
          // The Team host paints one contact ring and an external numbered,
          // shaped badge. Do not paint a second face/crosshair over the craft.
          showBodyCues: kind !== 'pilot',
        });
    } finally {
      ctx.restore();
    }
    return true;
  }
  return { setPresentation, reset, update, frame, draw };
}
