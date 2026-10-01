import { TEAM_OUTCOME_SLOTS } from '../presentation/team-runtime-slots.mjs';
export { TEAM_OUTCOME_SLOTS } from '../presentation/team-runtime-slots.mjs';
const LIFE = 1;
const slotFor = (type) =>
  type === 'cut.joint'
    ? TEAM_OUTCOME_SLOTS[0]
    : type === 'team.recovery'
      ? TEAM_OUTCOME_SLOTS[1]
      : null;

/** Consume every fixed step. The core replaces events each step; rendering may
 * skip several steps. Retain only the two recent visual outcomes, never rewards. */
export function createTeamOutcomeFeedback() {
  let owner = null,
    tick = -1,
    time = -1,
    records = [];
  function observe(run) {
    if (owner !== run || run.tick < tick || run.time < time) {
      owner = run;
      tick = -1;
      records = [];
    }
    if (tick !== run.tick) {
      for (const event of run.events ?? []) {
        const slot = slotFor(event.type);
        if (!slot || !Number.isFinite(event.time) || event.time > run.time) continue;
        const players = event.type === 'cut.joint' ? event.players : [0, 1];
        if (
          !Array.isArray(players) ||
          players.length !== 2 ||
          !players.includes(0) ||
          !players.includes(1)
        )
          continue;
        records = records.filter((record) => record.slot !== slot);
        records.push(
          Object.freeze({
            slot,
            time: event.time,
            tick: event.tick,
            players: Object.freeze([0, 1]),
          }),
        );
      }
    }
    tick = run.tick;
    time = run.time;
    records = records.filter((record) => run.time - record.time < LIFE && run.time >= record.time);
    return read(run);
  }
  function read(run) {
    if (owner !== run || !['running', 'paused'].includes(run.status)) return Object.freeze([]);
    return Object.freeze(
      records.filter((record) => run.time >= record.time && run.time - record.time < LIFE),
    );
  }
  // Only the isolated Studio fixture restores its own command-earned sample.
  function restore(run, sample) {
    owner = run;
    tick = run.tick;
    time = run.time;
    records = sample
      .filter(
        (record) =>
          TEAM_OUTCOME_SLOTS.includes(record.slot) &&
          Number.isFinite(record.time) &&
          run.time >= record.time &&
          run.time - record.time < LIFE,
      )
      .map((record) => Object.freeze({ ...record, players: Object.freeze([0, 1]) }));
    return read(run);
  }
  return Object.freeze({ observe, read, restore });
}

export function prepareTeamOutcomes(snapshot) {
  const frames = {};
  for (const id of TEAM_OUTCOME_SLOTS) {
    const asset = snapshot?.resolved?.assets?.[id] ?? snapshot?.canvas?.assets?.[id];
    if (!asset) continue;
    if (asset.kind === 'recipe') {
      if (asset.recipe?.id !== 'team.outcome.v1')
        throw new TypeError(`Wrong Team outcome recipe: ${id}.`);
      frames[id] = Object.freeze({ kind: 'recipe' });
      continue;
    }
    const frame = snapshot.image?.(id),
      g = frame?.geometry;
    if (
      asset.kind !== 'image' ||
      (frame?.image?.naturalWidth ?? frame?.image?.width) !== 32 ||
      (frame?.image?.naturalHeight ?? frame?.image?.height) !== 32 ||
      g?.frame?.x !== 0 ||
      g?.frame?.y !== 0 ||
      g?.frame?.width !== 32 ||
      g?.frame?.height !== 32 ||
      g?.pivot?.x !== 0.5 ||
      g?.pivot?.y !== 0.5
    )
      throw new TypeError(`Team outcome ${id} needs a prepared centered 32×32 frame.`);
    frames[id] = Object.freeze({ kind: 'image', image: frame.image });
  }
  return Object.freeze(frames);
}

/** Bounded header badge; labels remain real game text, never baked into artwork. */
export function drawTeamOutcomeBadge(ctx, frame, rect, cssCell, colors, reduced, age) {
  const side = 24 / cssCell,
    x = rect.left / cssCell,
    y = (rect.y - 12) / cssCell;
  ctx.save();
  try {
    ctx.globalAlpha = reduced ? 1 : Math.min(1, Math.max(0, (LIFE - age) * 4));
    ctx.fillStyle = '#07111c';
    ctx.fillRect(x - 2 / cssCell, y - 2 / cssCell, side + 4 / cssCell, side + 4 / cssCell);
    if (frame?.kind === 'image') {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame.image, x, y, side, side);
    } else {
      ctx.lineWidth = 2 / cssCell;
      ctx.strokeStyle = colors[0];
      ctx.beginPath();
      ctx.arc(x + 7 / cssCell, y + 12 / cssCell, 6 / cssCell, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = colors[1];
      ctx.beginPath();
      ctx.moveTo(x + 17 / cssCell, y + 3 / cssCell);
      ctx.lineTo(x + 23 / cssCell, y + 12 / cssCell);
      ctx.lineTo(x + 17 / cssCell, y + 21 / cssCell);
      ctx.lineTo(x + 11 / cssCell, y + 12 / cssCell);
      ctx.closePath();
      ctx.stroke();
    }
  } finally {
    ctx.restore();
  }
}
