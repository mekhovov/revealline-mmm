import { dataIdentity, required } from '../data-json.mjs';
import { CELL, CLASSES } from '../core/registry.mjs';
import { createRun } from '../core/index.mjs';
import { createCoop, validateCoopLevel } from '../coop/core.mjs';
import { normalizedLevel } from '../core/level.mjs';
import { prepareHuntLevel } from './level.mjs';
import { compileMapDesign } from '../content-design/map.mjs';
import { compileContentProject } from '../content-design/project.mjs';
import { journeyActors, COMBAT_ACTOR_CATALOG, freezeDesign } from '../content-design/catalogs.mjs';
import { ENCOUNTER_VARIANTS } from './preferences.mjs';

const huntModes = ['bonus', 'capture-quota', 'hunt'];
const slowest = Math.min(...CLASSES.map((entry) => entry.moveSpeedMultiplier ?? 1));
const actorIsOptional = (actor) => ['optional-scout', 'optional-sentry'].includes(actor.role);
const revision = (value, variant) => `hunt-${dataIdentity({ value, variant })}`;
function removeHuntVersion(level) {
  if (level.version !== 'xonix-level.v9') return;
  if (level.classic.coverage) {
    // The Hunt validator admits route coverage only on inherited v5 geometry.
    // Preserve its denominator when returning to a historical non-Hunt edition.
    required(
      level.relayGates?.gates?.length === 0 &&
        level.directionalFields?.zones?.length === 0 &&
        level.encounter === null,
      'Route-coverage variants require the inherited classic geometry.',
    );
    level.version = 'xonix-level.v5';
    delete level.relayGates;
    delete level.directionalFields;
  } else level.version = 'xonix-level.v8';
}

/** Authoring-time placement only. The resulting positions, population and rules
 * are serialized into an immutable variant before a run is created. */
export function placeHuntPopulation({
  width,
  height,
  cells,
  terrain = [],
  spawns,
  occupied = [],
  count = 6,
}) {
  if (!Number.isSafeInteger(count) || count < 1) return [];
  // Admit only points reachable from a player spawn without crossing walls or
  // lethal terrain. Safe foundations remain traversable; closed gates do not.
  const reachable = new Uint8Array(width * height),
    queue = [];
  for (const spawn of spawns) {
    const x = Math.floor(spawn.x),
      y = Math.floor(spawn.y),
      index = y * width + x;
    if (
      x >= 0 &&
      x < width &&
      y >= 0 &&
      y < height &&
      cells[index] !== CELL.WALL &&
      !(cells[index] === CELL.FIELD && terrain[index] === 2)
    ) {
      reachable[index] = 1;
      queue.push(index);
    }
  }
  for (let n = 0; n < queue.length; n++) {
    const index = queue[n],
      x = index % width,
      y = Math.floor(index / width);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (
        reachable[next] ||
        cells[next] === CELL.WALL ||
        (cells[next] === CELL.FIELD && terrain[next] === 2)
      )
        continue;
      reachable[next] = 1;
      queue.push(next);
    }
  }
  const spots = [];
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      if (cells[y * width + x] !== CELL.FIELD || !reachable[y * width + x]) continue;
      const point = { x: x + 0.5, y: y + 0.5 };
      if (spawns.some((spawn) => Math.hypot(point.x - spawn.x, point.y - spawn.y) < 3)) continue;
      if (occupied.some((actor) => Math.hypot(point.x - actor.x, point.y - actor.y) < 2)) continue;
      // Keep the first encounter a short detour. Later picks maximize separation,
      // so a whole Hunt population is not clustered around one easy first cut.
      const distance = Math.min(
        ...spawns.map((spawn) => Math.hypot(point.x - spawn.x, point.y - spawn.y)),
      );
      spots.push({ ...point, distance });
    }
  spots.sort(
    (a, b) => Math.abs(a.distance - 8) - Math.abs(b.distance - 8) || a.y - b.y || a.x - b.x,
  );
  const chosen = [];
  while (chosen.length < count) {
    let best = null,
      bestDistance = -1;
    for (const spot of spots) {
      const distance = chosen.length
        ? Math.min(...chosen.map((other) => Math.hypot(other.x - spot.x, other.y - spot.y)))
        : Infinity;
      if (distance < 5 || distance <= bestDistance) continue;
      best = spot;
      bestDistance = distance;
      if (!chosen.length) break;
    }
    if (!best) break;
    chosen.push({ x: best.x, y: best.y });
  }
  return chosen;
}
const descriptor = (variant, actors) => ({
  version: 'humanoid-hunt.v1',
  mode: variant,
  quota: variant === 'bonus' ? 0 : variant === 'hunt' ? actors.length : Math.min(4, actors.length),
  targets: actors.map((actor) => ({
    id: actor.id,
    kind: actor.role === 'sentry' || actor.role === 'optional-sentry' ? 'guard' : 'runner',
  })),
});
function runtimeActors(spots, speed, variant) {
  return spots.map((point, index) => {
    const guard = index >= 4,
      role = guard ? 'sentry' : 'scout';
    return {
      id: `hunt-${guard ? 'guard' : 'runner'}-${index + 1}`,
      role,
      ...point,
      headingX: index % 2 ? -1 : 1,
      headingY: index % 3 === 0 ? 1 : 0,
      speed: variant === 'patrol' ? Math.min(3, speed * 0.3) : speed * (guard ? 0.3 : 0.7),
      turnTicks: guard ? 120 : 60,
      ...(guard
        ? {
            senseRadius: 8,
            scanTicks: 30,
            openingTicks: 480,
            warningTicks: 180,
            recoveryTicks: 180,
            restTicks: 480,
            shotSpeed: 6,
            shotLifeTicks: 360,
          }
        : {}),
    };
  });
}

export function deriveEncounterLevel(source, variant, { mode = 'solo', count = 6 } = {}) {
  required(ENCOUNTER_VARIANTS.includes(variant), 'Unknown encounter variant.');
  if (variant === 'authored') return source;
  const team = mode === 'team';
  if (
    team
      ? !/^revealline-coop-level\.v[2-8]$/.test(source.version)
      : !/^xonix-level\.v[5-9]$/.test(source.version)
  )
    return null;
  if (!team && source.encounter && source.encounter.version !== 'xonix-encounter.v2') return null;
  const level = structuredClone(source),
    original = team ? level : level.classic;
  if (variant === 'off') {
    if (!original.combatPatrols && !original.hunt) return source;
    delete original.hunt;
    delete original.combatPatrols;
    if (!team) removeHuntVersion(level);
    level.revision = revision(source, variant);
    if (team) {
      const result = validateCoopLevel(level);
      return result.valid ? freezeDesign(level) : null;
    }
    return freezeDesign(normalizedLevel(level));
  }
  const run = team ? createCoop(source, { seed: 1 }) : createRun(source, { seed: 1 });
  const ordinary = source.enemies ?? [];
  const spawns = team ? source.spawns : [source.spawn];
  const capacity = Math.min(count, 24 - ordinary.length);
  if (capacity < 1) return null;
  const spots = placeHuntPopulation({
    width: source.width,
    height: source.height,
    cells: run.cells,
    terrain: run.classic?.terrain ?? run.terrain,
    spawns,
    occupied: ordinary,
    count: capacity,
  });
  if (!spots.length) return null;
  const speed = (source.rules?.moveSpeed ?? 8) * (team ? 1 : slowest);
  const actors = runtimeActors(spots, speed, variant);
  const hunt = huntModes.includes(variant) ? descriptor(variant, actors) : null;
  if (team) {
    level.version = 'revealline-coop-level.v8';
    level.terrain ??= [];
    level.revision = revision(source, variant);
    level.combatPatrols = { version: 'combat-patrols.v1', enabled: true, actors };
    if (hunt) level.hunt = hunt;
    else delete level.hunt;
    const result = validateCoopLevel(level);
    return result.valid ? freezeDesign(level) : null;
  }
  if (hunt)
    return freezeDesign(
      prepareHuntLevel(source, {
        id: source.id,
        revision: revision(source, variant),
        actors,
        hunt,
      }),
    );
  level.revision = revision(source, variant);
  delete level.classic.hunt;
  removeHuntVersion(level);
  level.classic.combatPatrols = { version: 'combat-patrols.v1', enabled: true, actors };
  return freezeDesign(normalizedLevel(level));
}

/** A complete source edition preserves picture/map bindings and carries all
 * generated placements. No population is injected into a running simulation. */
export function encounterVariantSource(source, variant, { missionIds = null } = {}) {
  required(ENCOUNTER_VARIANTS.includes(variant), 'Unknown encounter variant.');
  if (variant === 'authored') return source;
  const project = structuredClone(compileContentProject(source).source);
  const roles = journeyActors(project.actorCatalogId).roles;
  if (!roles['optional-scout']) project.actorCatalogId = COMBAT_ACTOR_CATALOG.id;
  const changed = new Set();
  for (const mission of project.missions) {
    // Snake objectives own their population and order; other missions in a
    // mixed creator project can still use ordinary encounter variants.
    if (mission.snake || mission.archived || (missionIds && !missionIds.includes(mission.id)))
      continue;
    if (variant === 'off') {
      if (!mission.combat && !mission.hunt) continue;
      mission.actors = mission.actors.filter((actor) => !actorIsOptional(actor));
      delete mission.combat;
      delete mission.hunt;
    } else {
      const map = project.maps.find(
        (item) => item.id === mission.map.id && item.revision === mission.map.revision,
      );
      const geometry = compileMapDesign(map).geometry;
      const spawns = (mission.team?.spawnIds ?? [mission.spawnId]).map((id) =>
        geometry.spawns.find((item) => item.id === id),
      );
      const ordinary = mission.actors.filter((actor) => !actorIsOptional(actor));
      const spots = placeHuntPopulation({
        width: map.width,
        height: map.height,
        cells: geometry.cells,
        terrain: geometry.terrain,
        spawns,
        occupied: ordinary,
        count: Math.min(6, 24 - ordinary.length),
      });
      if (!spots.length) continue;
      const actors = spots.map((point, index) => ({
        id: `hunt-${index >= 4 ? 'guard' : 'runner'}-${index + 1}`,
        role: index >= 4 ? 'optional-sentry' : 'optional-scout',
        tier: 'measured',
        ...point,
        heading: [index % 2 ? -1 : 1, 0],
      }));
      mission.actors = [...ordinary, ...actors];
      mission.combat = { version: 'mission-combat.v1', enabled: true };
      if (huntModes.includes(variant)) mission.hunt = descriptor(variant, actors);
      else delete mission.hunt;
      if (mission.team) {
        const before = mission.team.format;
        mission.team.format = 'TeamMissionV7';
        mission.team.lineImpact ??= ['TeamMissionV5', 'TeamMissionV6'].includes(before);
      }
    }
    mission.revision = revision(mission, variant);
    changed.add(mission.id);
  }
  for (const campaign of project.campaigns)
    if (campaign.missionIds.some((id) => changed.has(id)))
      campaign.revision = revision(campaign, variant);
  for (const pack of project.packs) pack.revision = revision(pack, variant);
  project.revision = revision(project, variant);
  return freezeDesign(compileContentProject(project).source);
}
