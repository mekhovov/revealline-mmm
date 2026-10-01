/** Versioned ordinary-keeper steering. No player sensing or ambient randomness. */
export const FIELD_COURSE_VERSION = 'field-course.v1';
export const COLLISION_COURSE_VERSION = 'field-course.v2';

export function validFieldCourse(enemy, type = 'bouncer') {
  return (
    !Object.hasOwn(enemy, 'course') ||
    ([FIELD_COURSE_VERSION, COLLISION_COURSE_VERSION].includes(enemy.course) &&
      enemy.type === type &&
      Math.hypot(enemy.vx, enemy.vy) > 0)
  );
}

/** Called only after a real axis-face reflection, on the planner's owned copy
 * (or Team's committed contact). Stable flight, bounded departure variation.
 * Surface normals and tangential signs remain authoritative. At corners both
 * components must already depart their faces. No clock, sensing, RNG or turn debt. */
export function varyCollisionCourse(enemy, nx, ny, seed) {
  if (
    enemy.course !== COLLISION_COURSE_VERSION ||
    !['bouncer', 'drifter'].includes(enemy.type) ||
    (!nx && !ny) ||
    (nx && enemy.vx * nx <= 0) ||
    (ny && enemy.vy * ny <= 0)
  )
    return;
  const speed = Math.hypot(enemy.vx, enemy.vy);
  if (!speed) return;
  const normal = nx ? enemy.vx * Math.sign(nx) : enemy.vy * Math.sign(ny);
  if (normal <= 0) return;
  const tangent = nx ? enemy.vy : enemy.vx;
  const key = `${enemy.id}:${Math.round(enemy.x * 1e5)}:${Math.round(enemy.y * 1e5)}`;
  const choice = hash(seed, key, 0, 0x434f4c4c);
  const radians = Math.PI / 180;
  const incidence = Math.atan2(Math.abs(tangent), normal);
  const angle = Math.max(
    8 * radians,
    Math.min(82 * radians, incidence + (choice * 12 - 6) * radians),
  );
  const outward = Math.cos(angle) * speed;
  const along = Math.sin(angle) * speed * (Math.sign(tangent) || (choice < 0.5 ? -1 : 1));
  if (nx) {
    enemy.vx = outward * Math.sign(nx);
    enemy.vy = along;
  } else {
    enemy.vx = along;
    enemy.vy = outward * Math.sign(ny);
  }
}

function hash(seed, id, block, salt) {
  let value = (seed ^ Math.imul(block + 1, 0x9e3779b1) ^ salt) >>> 0;
  for (let i = 0; i < id.length; i++) value = Math.imul(value ^ id.charCodeAt(i), 16777619) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

const ease = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Incremental angle, not an absolute heading: lawful bounces remain authoritative.
 * One call per fixed tick before any swept collision subdivision. Skipped frozen,
 * stunned or promised-attack ticks are never caught up in a sudden later turn. */
export function steerFieldCourse(enemy, seed, tick) {
  if (enemy.course !== FIELD_COURSE_VERSION || !['bouncer', 'drifter'].includes(enemy.type)) return;
  const speed = Math.hypot(enemy.vx, enemy.vy);
  if (!speed) return;
  const block = Math.floor(tick / 360),
    phase = tick % 360,
    start = 120 + Math.floor(hash(seed, enemy.id, block, 0x1234) * 121),
    duration = 60 + Math.floor(hash(seed, enemy.id, block, 0x5678) * 31),
    choice = hash(seed, enemy.id, block, 0x9abc),
    angle = ((30 + hash(seed, enemy.id, block, 0xdef0) * 45) * Math.PI) / 180,
    delta =
      (choice < 0.5 ? -1 : 1) *
      angle *
      (ease((phase + 1 - start) / duration) - ease((phase - start) / duration));
  if (!delta) return;
  const c = Math.cos(delta),
    s = Math.sin(delta),
    vx = enemy.vx * c - enemy.vy * s,
    vy = enemy.vx * s + enemy.vy * c,
    normalize = speed / Math.hypot(vx, vy);
  enemy.vx = vx * normalize;
  enemy.vy = vy * normalize;
}
