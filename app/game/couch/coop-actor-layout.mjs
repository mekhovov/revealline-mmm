import { actorImagePaintMetrics } from '../ui/actor-presentation.mjs';
import { resolveTextSize } from '../text-size.mjs';

// Cosmetic geometry only. All positions passed to the core remain untouched.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export function coopCueScale(width, columns = 72, textSize = 'standard') {
  // Canvas role labels have their own readable minimum: 12 → 16 CSS pixels.
  // Scale after the existing clamp so resizing introduces no new breakpoint.
  const factor = resolveTextSize(textSize) === 'large' ? 4 / 3 : 1;
  const cssWidth = Number.isFinite(width) && width > 0 ? width : 1152;
  const cell = cssWidth / columns;
  return Object.freeze({
    width: cssWidth,
    cell,
    px: (value) => value * factor,
    font: (cells, minimum = 12, maximum = 18) =>
      (clamp(cells * cell, minimum, maximum) / cell) * factor,
  });
}

/** Relative full-frame/rotor/nose bounds after the shared heading and banking transforms. */
export function coopBodyBounds(frame, geometry) {
  const diameter = frame.diameter,
    paint = actorImagePaintMetrics(diameter, geometry),
    { width, height } = paint,
    sx = 1 - frame.bank * 0.35,
    sy = 1 + frame.bank * 0.2,
    cosine = Math.cos(frame.heading),
    sine = Math.sin(frame.heading);
  const points = [];
  const rectangle = (left, top, right, bottom) => {
    for (const [x, y] of [
      [left, top],
      [right, top],
      [left, bottom],
      [right, bottom],
    ])
      points.push({ x: x * sx * cosine - y * sy * sine, y: x * sx * sine + y * sy * cosine });
  };
  rectangle(
    -geometry.pivot.x * width,
    -geometry.pivot.y * height,
    (1 - geometry.pivot.x) * width,
    (1 - geometry.pivot.y) * height,
  );
  rectangle((-4 * diameter) / 28, (-13 * diameter) / 28, (4 * diameter) / 28, (-9 * diameter) / 28);
  return Object.freeze({
    left: Math.min(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
    right: Math.max(...points.map((point) => point.x)),
    bottom: Math.max(...points.map((point) => point.y)),
  });
}

export function coopPilotBodyOffset(frame, geometry, width, height, margin = 0) {
  const bounds = coopBodyBounds(frame, geometry),
    x = Math.round(frame.x),
    y = Math.round(frame.y);
  return Object.freeze({
    x: clamp(x, margin - bounds.left, width - margin - bounds.right) - x,
    y: clamp(y, margin - bounds.top, height - margin - bounds.bottom) - y,
  });
}

const intersects = (a, b) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
/** Bounded label placement in CSS pixels; true heads are hard exclusions. */
export function placeCoopCue({
  x,
  y,
  width,
  height,
  arenaWidth,
  arenaHeight,
  heads,
  occupied = [],
  avoid = [],
}) {
  if (width > arenaWidth - 2 || height > arenaHeight - 2) return null;
  const margin = 1,
    halfWidth = width / 2,
    halfHeight = height / 2,
    candidates = [],
    add = (cx, cy) => {
      cx = clamp(cx, margin + halfWidth, arenaWidth - margin - halfWidth);
      cy = clamp(cy, margin + halfHeight, arenaHeight - margin - halfHeight);
      const rect = {
        x: cx,
        y: cy,
        left: cx - halfWidth,
        top: cy - halfHeight,
        right: cx + halfWidth,
        bottom: cy + halfHeight,
        width,
        height,
      };
      if (!heads.some((head) => intersects(rect, head))) candidates.push(rect);
    };
  add(x, y);
  for (let ring = 1; ring <= 3; ring++) {
    const dx = (width + 3) * ring,
      dy = (height + 3) * ring;
    for (const [ox, oy] of [
      [0, -dy],
      [0, dy],
      [-dx, 0],
      [dx, 0],
      [-dx, -dy],
      [dx, -dy],
      [-dx, dy],
      [dx, dy],
    ])
      add(x + ox, y + oy);
  }
  for (const cx of [halfWidth + margin, arenaWidth - halfWidth - margin])
    for (const cy of [halfHeight + margin, arenaHeight - halfHeight - margin]) add(cx, cy);
  const score = (rect) =>
    occupied.filter((other) => intersects(rect, other)).length * 100000 +
    avoid.filter((other) => intersects(rect, other)).length * 10000 +
    (rect.x - x) ** 2 +
    (rect.y - y) ** 2;
  candidates.sort((a, b) => score(a) - score(b));
  const original = candidates[0] ?? null;
  // Retain clear existing placements exactly, including their historical tie
  // order. Width-sized rings skip usable gaps on compact translated boards.
  if (original && !occupied.some((other) => intersects(original, other))) return original;

  // A free axis-aligned rectangle can be slid to an arena/obstacle edge.
  // Search those exact edges only when the established placement would collide.
  // This is bounded by the content's cue count, not pixels or animation time.
  const blockers = [...heads, ...occupied],
    xs = new Set([margin + halfWidth, arenaWidth - margin - halfWidth, original?.x ?? x]),
    ys = new Set([margin + halfHeight, arenaHeight - margin - halfHeight, original?.y ?? y]);
  for (const rect of blockers) {
    xs.add(clamp(rect.left - halfWidth, margin + halfWidth, arenaWidth - margin - halfWidth));
    xs.add(clamp(rect.right + halfWidth, margin + halfWidth, arenaWidth - margin - halfWidth));
    ys.add(clamp(rect.top - halfHeight, margin + halfHeight, arenaHeight - margin - halfHeight));
    ys.add(clamp(rect.bottom + halfHeight, margin + halfHeight, arenaHeight - margin - halfHeight));
  }
  let best = null,
    bestScore = Infinity;
  for (const cx of xs)
    for (const cy of ys) {
      const rect = {
        x: cx,
        y: cy,
        left: cx - halfWidth,
        top: cy - halfHeight,
        right: cx + halfWidth,
        bottom: cy + halfHeight,
        width,
        height,
      };
      if (blockers.some((other) => intersects(rect, other))) continue;
      const value = score(rect);
      if (value < bestScore) {
        best = rect;
        bestScore = value;
      }
    }
  // Saturated authored maps keep the existing visible fallback. Never turn a
  // formerly visible warning into null merely because collision-free packing
  // failed. A host-owned overflow presentation is a separate contract.
  return best ?? original;
}

/** Pure, bounded group packing for compact boards. Measurements are immutable:
 * callers must retain their visible fallback when `unplaced` is nonempty. */
export function layoutCoopCues(requests, { arenaWidth, arenaHeight, heads = [] }) {
  const placements = requests.map(() => null),
    result = (extra = {}) => ({
      placements,
      unplaced: placements.flatMap((rect, index) => (rect ? [] : [index])),
      ...extra,
    }),
    finite = Number.isFinite,
    rectangle = (rect) =>
      rect &&
      ['left', 'top', 'right', 'bottom'].every((key) => finite(rect[key])) &&
      rect.right >= rect.left &&
      rect.bottom >= rect.top;
  if (
    !finite(arenaWidth) ||
    !finite(arenaHeight) ||
    arenaWidth <= 2 ||
    arenaHeight <= 2 ||
    requests.length > 128 ||
    heads.length > 128 ||
    !heads.every(rectangle)
  )
    return result({ exhausted: false });
  const valid = requests.map(
      (request) =>
        ['x', 'y', 'width', 'height'].every((key) => finite(request?.[key])) &&
        request.width > 0 &&
        request.height > 0 &&
        request.width <= arenaWidth - 2 &&
        request.height <= arenaHeight - 2,
    ),
    clear = (rect, others) => !others.some((other) => intersects(rect, other)),
    contained = (rect) =>
      rectangle(rect) &&
      rect.left >= 1 &&
      rect.top >= 1 &&
      rect.right <= arenaWidth - 1 &&
      rect.bottom <= arenaHeight - 1;
  let originalClear = valid.every(Boolean);
  for (let index = 0; index < requests.length && originalClear; index++) {
    const request = requests[index],
      rect = request.original;
    originalClear =
      contained(rect) &&
      rect.width === request.width &&
      rect.height === request.height &&
      finite(rect.x) &&
      finite(rect.y) &&
      Math.abs(rect.right - rect.left - request.width) < 1e-9 &&
      Math.abs(rect.bottom - rect.top - request.height) < 1e-9 &&
      Math.abs((rect.left + rect.right) / 2 - rect.x) < 1e-9 &&
      Math.abs((rect.top + rect.bottom) / 2 - rect.y) < 1e-9 &&
      clear(rect, heads) &&
      clear(rect, placements.filter(Boolean));
    if (originalClear) placements[index] = rect;
  }
  if (originalClear) return result({ exhausted: false });
  placements.fill(null);

  const indices = requests.flatMap((_, index) => (valid[index] ? [index] : [])),
    priority = (index) => (finite(requests[index].priority) ? requests[index].priority : 0),
    orders = [
      (a, b) =>
        priority(b) - priority(a) ||
        requests[b].width * requests[b].height - requests[a].width * requests[a].height,
      (a, b) => priority(b) - priority(a) || requests[b].width - requests[a].width,
      (a, b) => priority(b) - priority(a) || requests[b].height - requests[a].height,
    ].map((compare) => [...indices].sort((a, b) => compare(a, b) || a - b)),
    best = requests.map(() => null);
  let bestCount = 0,
    probes = 0,
    exhausted = false,
    nodeLimited = false;
  // Limits count geometry work rather than elapsed time, so identical states
  // have identical outcomes at different frame rates or while paused.
  const probeLimit = 24000,
    nodeLimit = 128,
    candidateLimit = 40;
  function candidates(index, occupied) {
    const request = requests[index],
      halfWidth = request.width / 2,
      halfHeight = request.height / 2,
      blockers = [...heads, ...occupied],
      xs = new Set([1 + halfWidth, arenaWidth - 1 - halfWidth]),
      ys = new Set([1 + halfHeight, arenaHeight - 1 - halfHeight]),
      addX = (x) => xs.add(clamp(x, 1 + halfWidth, arenaWidth - 1 - halfWidth)),
      addY = (y) => ys.add(clamp(y, 1 + halfHeight, arenaHeight - 1 - halfHeight));
    addX(request.x);
    addY(request.y);
    for (const rect of blockers) {
      addX(rect.left - halfWidth);
      addX(rect.right + halfWidth);
      addY(rect.top - halfHeight);
      addY(rect.bottom + halfHeight);
    }
    const found = [];
    for (const x of xs)
      for (const y of ys) {
        if (++probes > probeLimit) {
          exhausted = true;
          return [];
        }
        const rect = {
          x,
          y,
          left: x - halfWidth,
          top: y - halfHeight,
          right: x + halfWidth,
          bottom: y + halfHeight,
          width: request.width,
          height: request.height,
        };
        if (clear(rect, blockers))
          found.push({ rect, distance: (x - request.x) ** 2 + (y - request.y) ** 2 });
      }
    found.sort(
      (a, b) => a.distance - b.distance || a.rect.top - b.rect.top || a.rect.left - b.rect.left,
    );
    return found.slice(0, candidateLimit).map((entry) => entry.rect);
  }
  for (const order of orders) {
    let nodes = 0;
    placements.fill(null);
    function search(depth, occupied) {
      if (depth > bestCount) {
        bestCount = depth;
        for (let index = 0; index < placements.length; index++) best[index] = placements[index];
      }
      if (depth === order.length) return true;
      if (++nodes > nodeLimit) {
        nodeLimited = true;
        return false;
      }
      if (exhausted) return false;
      const index = order[depth];
      for (const rect of candidates(index, occupied)) {
        placements[index] = rect;
        if (search(depth + 1, [...occupied, rect])) return true;
        placements[index] = null;
        if (nodes > nodeLimit || exhausted) break;
      }
      return false;
    }
    if (search(0, [])) return result({ exhausted: false });
    if (exhausted) break;
  }
  for (let index = 0; index < placements.length; index++) placements[index] = best[index];
  return result({ exhausted: exhausted || nodeLimited });
}
