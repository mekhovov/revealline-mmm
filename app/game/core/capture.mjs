import { CELL } from './registry.mjs';
import { EPS, capsuleTime, pointAt } from './geometry.mjs';
import { ownershipSpans, cellIndex } from './movement.mjs';
import { releaseCutCells, finishEncounterCapture, defeatEncounter } from './encounter.mjs';
import { classicClaim, updateClassicAnchors } from './classic-topology.mjs';
import { retainedCaptureCells } from './capture-regions.mjs';
import { openCapturedRelays } from './relay-gates.mjs';
import { captureCombatPatrols } from './combat-patrols.mjs';

export function tracePlan(state, paths, duration) {
  const additions = [],
    cells = [],
    spans = ownershipSpans(paths, state);
  let cutting = state.player.cutting,
    started = null,
    closure = null,
    stop = null;
  for (const span of spans) {
    const kind = state.cells[span.index];
    if (kind === CELL.SAFE) {
      if (cutting) {
        closure = span.t0;
        break;
      }
      continue;
    }
    if (kind === CELL.WALL) {
      stop = span.t0;
      break;
    }
    if (!cutting) {
      if (state.player.graceUntil > state.time + span.t0 + EPS) {
        stop = span.t0;
        break;
      }
      started = span.t0;
      cutting = true;
    }
    additions.push(span);
    cells.push({ index: span.index, time: span.t0 });
  }
  // A path may finish exactly at the safe cell boundary. Its travel direction
  // determines the cell entered, avoiding an extra tick of ambiguous ownership.
  if (cutting && closure === null && spans.length) {
    const end = spans.at(-1),
      dx = Math.sign(end.x2 - end.x1),
      dy = Math.sign(end.y2 - end.y1);
    const index = cellIndex(end.x2 + dx * EPS * 4, end.y2 + dy * EPS * 4, state);
    if (state.cells[index] === CELL.SAFE) closure = end.t1;
  }
  return { additions, cells, started, closure, stop, duration };
}

function samePoint(a, b) {
  return Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
}
export function selfContact(state, trace, horizon) {
  const previous = state.trailSegments.map((s) => ({ ...s }));
  let best = null;
  const visited = new Set(state.trail.map((c) => c.index));
  let last = state.trail.at(-1)?.index;
  for (const cell of trace.cells) {
    if (cell.time > horizon + EPS) break;
    if (visited.has(cell.index) && cell.index !== last)
      best = Math.min(best ?? Infinity, cell.time);
    visited.add(cell.index);
    last = cell.index;
  }
  for (const s of trace.additions) {
    if (s.t0 > horizon + EPS) break;
    const fraction = s.t1 > s.t0 ? Math.min(1, (horizon - s.t0) / (s.t1 - s.t0)) : 1;
    const a = { x: s.x1, y: s.y1 },
      b = pointAt(a, { x: s.x2, y: s.y2 }, fraction);
    for (let i = 0; i < previous.length; i++) {
      const old = previous[i],
        tail = { x: old.x1, y: old.y1 },
        head = { x: old.x2, y: old.y2 };
      if (i === previous.length - 1 && samePoint(a, head)) {
        const dot = (b.x - a.x) * (head.x - tail.x) + (b.y - a.y) * (head.y - tail.y);
        const cross = (b.x - a.x) * (head.y - tail.y) - (b.y - a.y) * (head.x - tail.x);
        if (dot < -EPS && Math.abs(cross) < EPS) best = Math.min(best ?? Infinity, s.t0);
        continue;
      }
      const t = capsuleTime(a, b, tail, head, 0);
      if (t != null) best = Math.min(best ?? Infinity, s.t0 + (Math.min(s.t1, horizon) - s.t0) * t);
    }
    previous.push(s);
  }
  return best;
}

export function appendTrail(state, trace, time) {
  if (trace.started !== null && trace.started <= time + EPS && !state.player.cutting) {
    state.player.cutting = true;
    if (state.classic) {
      const first = trace.additions[0];
      const dx = Math.sign(first.x2 - first.x1),
        dy = Math.sign(first.y2 - first.y1);
      state.classic.departure = cellIndex(first.x1 - dx * EPS * 4, first.y1 - dy * EPS * 4, state);
    }
    state.cutStartedAt = state.time + trace.started;
    state.events.push({ type: 'cut.started', tick: state.tick, time: state.time + trace.started });
  }
  const have = new Set(state.trail.map((c) => c.index));
  for (const c of trace.cells)
    if (c.time < time + EPS && !have.has(c.index)) {
      have.add(c.index);
      state.trail.push({
        x: c.index % state.width,
        y: Math.floor(c.index / state.width),
        index: c.index,
      });
    }
  for (const s of trace.additions) {
    if (s.t0 >= time - EPS) continue;
    const end = pointAt(
      { x: s.x1, y: s.y1 },
      { x: s.x2, y: s.y2 },
      Math.min(1, (time - s.t0) / (s.t1 - s.t0)),
    );
    const next = { x1: s.x1, y1: s.y1, x2: end.x, y2: end.y },
      last = state.trailSegments.at(-1);
    const merge =
      last &&
      Math.abs(last.x2 - next.x1) < EPS &&
      Math.abs(last.y2 - next.y1) < EPS &&
      Math.abs(
        (last.x2 - last.x1) * (next.y2 - next.y1) - (last.y2 - last.y1) * (next.x2 - next.x1),
      ) < EPS &&
      (last.x2 - last.x1) * (next.x2 - next.x1) + (last.y2 - last.y1) * (next.y2 - next.y1) > 0;
    if (merge) {
      last.x2 = next.x2;
      last.y2 = next.y2;
    } else state.trailSegments.push(next);
  }
}

/** Four-neighbor enemy-seeded fill. Each field enemy center retains its region. */
function captureCells(state, releaseSeed, closeCut) {
  const secured = [];
  for (const c of closeCut ? state.trail : [])
    if (state.cells[c.index] === CELL.FIELD) {
      state.cells[c.index] = CELL.SAFE;
      secured.push(c.index);
    }
  const retained = retainedCaptureCells(state, releaseSeed);
  for (let y = 1; y < state.height - 1; y++)
    for (let x = 1; x < state.width - 1; x++) {
      const i = y * state.width + x;
      if (state.cells[i] === CELL.FIELD && !retained[i]) {
        state.cells[i] = CELL.SAFE;
        secured.push(i);
      }
    }
  state.claimedCount += secured.length;
  state.coverage = state.claimedCount / state.totalClaimable;
  state.score +=
    (state.classic ? classicClaim(state, secured) : secured.length) * state.rules.pointsPerCell;
  if (closeCut) {
    state.player.cutting = false;
    state.cutStartedAt = null;
    state.trail = [];
    state.trailSegments = [];
    state.events.push({
      type: 'cut.closed',
      tick: state.tick,
      time: state.time,
      cells: secured.length,
    });
  }
  state.events.push({
    type: 'cells.claimed',
    tick: state.tick,
    time: state.time,
    indices: secured,
    coverage: state.coverage,
  });
  for (const objective of state.objectives)
    if (
      !objective.captured &&
      state.cells[cellIndex(objective.x, objective.y, state)] === CELL.SAFE
    ) {
      objective.captured = true;
      objective.revealed = true;
      state.score += state.rules.objectivePoints;
      state.events.push({
        type: 'objective.captured',
        tick: state.tick,
        time: state.time,
        id: objective.id,
      });
    }
  openCapturedRelays(state);
  captureCombatPatrols(state);
  if (state.classic) updateClassicAnchors(state);
}

/** Capture eligibility is frozen before any trail or objective mutation. */
export function commitCapture(state) {
  const releaseCells = releaseCutCells(state);
  captureCells(state, releaseCells > 0, true);
  finishEncounterCapture(state, releaseCells);
}

/** End-tick isolated release owns a fill transaction, never a fabricated cut. */
export function releaseIsolatedCapture(state) {
  captureCells(state, true, false);
  defeatEncounter(state, 'isolated');
}
