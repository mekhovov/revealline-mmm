import { createRun, CELL } from '../core/index.mjs';
import { createCoop } from '../coop/core.mjs';
import { freezeDesign } from './catalogs.mjs';
import { paintMaterialMarker } from './material-markers.mjs';
import {
  traceContentActor,
  contentActorMarkerType,
  contentCombatMarkers,
} from './actor-marker.mjs';
const cards = new WeakMap();

/** Read-only initial-state diagram. Uses the engine's actual topology and actor
 * placement, never predicts a future capture or reveals the reward picture. */
export function createMissionCard(manifest) {
  if (cards.has(manifest)) return cards.get(manifest);
  const team = manifest.mode === 'team';
  const run = team
    ? createCoop(manifest.level, { seed: 1 })
    : createRun(manifest.level, { seed: 1, classId: 'scout' });
  const card = freezeDesign({
    preset: manifest.difficulty,
    band: manifest.design.difficulty.band,
    route: manifest.design.routeDecision,
    mastery: manifest.design.mastery,
    width: run.width,
    height: run.height,
    cells: [...run.cells],
    terrain: [...(team ? (run.terrain ?? new Uint8Array(run.cells.length)) : run.classic.terrain)],
    spawn: team
      ? { x: run.players[0].x, y: run.players[0].y }
      : { x: run.player.x, y: run.player.y },
    ...(team ? { spawns: run.players.map(({ id, x, y }) => ({ seat: id, x, y })) } : {}),
    actors: [
      ...run.enemies.map((actor) => ({
        type: contentActorMarkerType(manifest.level, actor),
        x: actor.x,
        y: actor.y,
      })),
      ...contentCombatMarkers(manifest.level),
    ],
    objectives: (run.objectives ?? [])
      .filter((objective) => objective.revealed)
      .map(({ x, y }) => ({ x, y })),
  });
  cards.set(manifest, card);
  return card;
}

export function paintMissionThumbnail(ctx, card, width = 288) {
  const unit = width / card.width;
  ctx.save();
  ctx.fillStyle = '#102720';
  ctx.fillRect(0, 0, width, card.height * unit);
  for (let i = 0; i < card.cells.length; i++) {
    const cell = card.cells[i],
      terrain = card.terrain[i];
    if (cell === CELL.FIELD && !terrain) continue;
    ctx.fillStyle =
      cell === CELL.SAFE
        ? '#94c6b0'
        : cell === CELL.WALL
          ? '#68766e'
          : terrain === 2
            ? '#c65d48'
            : '#ac8750';
    const x = (i % card.width) * unit,
      y = Math.floor(i / card.width) * unit;
    ctx.fillRect(x, y, unit, unit);
    if (cell === CELL.WALL) {
      ctx.fillStyle = '#102720';
      ctx.fillRect(x + unit * 0.3, y + unit * 0.3, unit * 0.4, unit * 0.4);
    }
    if (cell === CELL.FIELD) paintMaterialMarker(ctx, terrain, x, y, unit);
  }
  ctx.fillStyle = '#ffad88';
  for (const actor of card.actors) {
    const x = actor.x * unit,
      y = actor.y * unit,
      r = Math.max(3, unit);
    ctx.beginPath();
    traceContentActor(ctx, actor.type, x, y, r);
    ctx.fill();
    if (actor.inactive) {
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x - r, y + r);
      ctx.lineTo(x + r, y - r);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#fff0ad';
  ctx.lineWidth = 1.5;
  for (const objective of card.objectives)
    ctx.strokeRect(objective.x * unit - 3, objective.y * unit - 3, 6, 6);
  // The launch cross is inset at outer rails so every arm remains visible.
  for (const spawn of card.spawns ?? [card.spawn]) {
    const x = Math.max(5, Math.min(width - 5, spawn.x * unit));
    const y = Math.max(5, Math.min(card.height * unit - 5, spawn.y * unit));
    ctx.fillStyle = spawn.seat === 1 ? '#aee8ff' : '#f5ffba';
    ctx.fillRect(x - 5, y - 1.5, 10, 3);
    ctx.fillRect(x - 1.5, y - 5, 3, 10);
    if (card.spawns) {
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(spawn.seat + 1), x, Math.max(10, y - 7));
    }
  }
  ctx.restore();
}
