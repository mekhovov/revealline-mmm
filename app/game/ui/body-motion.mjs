/** Cosmetic transforms only. Motion never changes simulation or collision data. */
export function bodyMotionPose(
  body,
  { seconds = 0, heading = 0, bank = 0, speedRatio = 0, reduced = false } = {},
) {
  const motion = body?.bodyMotion;
  if (!motion) return { heading, bank: reduced ? 0 : bank };
  if (
    motion.kind !== 'rigid-spin' ||
    !Number.isFinite(motion.radiansPerSecond) ||
    Math.abs(motion.radiansPerSecond) > 4 * Math.PI ||
    !Number.isFinite(motion.travelGain) ||
    motion.travelGain < 0 ||
    motion.travelGain > 1
  )
    throw new TypeError('Invalid cosmetic body motion.');
  // A logo is rotated as one rigid image. No shear, scaling or petal deformation.
  return {
    heading: reduced
      ? 0
      : seconds * motion.radiansPerSecond +
        Math.sin(heading) * Math.min(1, speedRatio) * motion.travelGain,
    bank: 0,
  };
}

/** A bounded opaque center behind a transparent identity image. Its envelope
 * stays inside the image rectangle and never supplies a collision radius. */
export function validateBodyBacking(body) {
  const backing = body?.bodyBacking;
  if (backing === undefined) return null;
  if (
    !backing ||
    Object.keys(backing).some((key) => !['kind', 'color', 'radiusRatio'].includes(key)) ||
    !['disc', 'opaque-interior'].includes(backing.kind) ||
    !/^#[a-f0-9]{6}$/i.test(backing.color) ||
    (backing.kind === 'disc' &&
      (!Number.isFinite(backing.radiusRatio) ||
        backing.radiusRatio <= 0 ||
        backing.radiusRatio > 0.5)) ||
    (backing.kind === 'opaque-interior' && backing.radiusRatio !== undefined)
  )
    throw new TypeError('Invalid cosmetic body backing.');
  return backing;
}
