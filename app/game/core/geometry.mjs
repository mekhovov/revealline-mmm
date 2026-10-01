import { versionsForLevel, resolveVersions, WIDE_VERSIONS, isClassicRuleset } from './versions.mjs';

/** Deterministic continuous geometry. Times returned here are fractions in [0, 1]. */
export const EPS = 1e-9;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const pointAt = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export function circleTime(a, b, center, radius) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    px = a.x - center.x,
    py = a.y - center.y;
  const c = px * px + py * py - radius * radius;
  if (c <= EPS) return 0;
  const q = dx * dx + dy * dy;
  if (q < EPS * EPS) return null;
  const k = 2 * (px * dx + py * dy),
    d = k * k - 4 * q * c;
  if (d < -EPS) return null;
  const t = (-k - Math.sqrt(Math.max(0, d))) / (2 * q);
  return t >= -EPS && t <= 1 + EPS ? clamp(t, 0, 1) : null;
}

/** Intersect a time interval with low <= origin + delta*t <= high. */
export function linearInterval(interval, origin, delta, low, high) {
  if (!interval) return null;
  if (Math.abs(delta) < EPS) return origin >= low - EPS && origin <= high + EPS ? interval : null;
  let a = (low - origin) / delta,
    b = (high - origin) / delta;
  if (a > b) [a, b] = [b, a];
  const lo = Math.max(interval[0], a),
    hi = Math.min(interval[1], b);
  return lo <= hi + EPS ? [clamp(lo, 0, 1), clamp(hi, 0, 1)] : null;
}

export function boxTime(a, b, box) {
  let interval = linearInterval([0, 1], a.x, b.x - a.x, box.x, box.x + box.w);
  interval = linearInterval(interval, a.y, b.y - a.y, box.y, box.y + box.h);
  return interval ? interval[0] : null;
}

/** Swept point against a capsule, including its endpoint circles. */
export function capsuleTime(a, b, start, end, radius = 0) {
  const sx = end.x - start.x,
    sy = end.y - start.y,
    length = Math.hypot(sx, sy);
  if (length < EPS) return circleTime(a, b, start, radius);
  const ux = sx / length,
    uy = sy / length,
    px = a.x - start.x,
    py = a.y - start.y;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  let interval = linearInterval([0, 1], px * ux + py * uy, dx * ux + dy * uy, 0, length);
  interval = linearInterval(interval, px * -uy + py * ux, dx * -uy + dy * ux, -radius, radius);
  const candidates = [
    interval?.[0],
    circleTime(a, b, start, radius),
    circleTime(a, b, end, radius),
  ].filter((v) => v != null);
  return candidates.length ? Math.min(...candidates) : null;
}

export function movingCirclesTime(a, b, c, d, radius) {
  return circleTime(
    { x: a.x - c.x, y: a.y - c.y },
    { x: b.x - d.x, y: b.y - d.y },
    { x: 0, y: 0 },
    radius,
  );
}

const board = (width, height) =>
  Object.freeze({
    width,
    height,
    cellCount: width * height,
    maxX: width - 0.5,
    maxY: height - 0.5,
    interiorWidth: width - 2,
    interiorHeight: height - 2,
    perimeter: 2 * (width - 1 + height - 1),
  });
export const LEGACY_GEOMETRY = board(48, 36);
export const WIDE_GEOMETRY = board(72, 36);
export function geometryForLevel(level) {
  const pair = versionsForLevel(level);
  const geometry =
    pair.ruleset === WIDE_VERSIONS.ruleset || isClassicRuleset(pair.ruleset)
      ? WIDE_GEOMETRY
      : LEGACY_GEOMETRY;
  for (const field of ['width', 'height']) {
    const property = Object.getOwnPropertyDescriptor(level, field);
    if (!property || !Object.hasOwn(property, 'value') || property.value !== geometry[field])
      throw new TypeError('level dimensions do not match its simulation version');
  }
  return geometry;
}
/** Runs are core-owned; this lookup never changes another run's geometry. */
export function geometryForRun(run) {
  const pair = resolveVersions({ ruleset: run.ruleset });
  const geometry =
    pair.ruleset === WIDE_VERSIONS.ruleset || isClassicRuleset(pair.ruleset)
      ? WIDE_GEOMETRY
      : LEGACY_GEOMETRY;
  if (run.width !== geometry.width || run.height !== geometry.height)
    throw new TypeError('run dimensions do not match its simulation version');
  return geometry;
}
