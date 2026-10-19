/** Original, opaque material specimens. Shared pixel source for existing board
 * tiles, native SIM maps and creator review; never a collision/material policy. */
export const INDUSTRIAL_MATERIAL_REVISION = 'industrial-pilot-v1';
export const INDUSTRIAL_MATERIALS = Object.freeze(['concrete', 'earth', 'metal']);
export const INDUSTRIAL_ENVIRONMENT_REVISION = 'industrial-roster-v3';
export const INDUSTRIAL_ENVIRONMENT_MATERIALS = Object.freeze([
  ...INDUSTRIAL_MATERIALS,
  'masonry',
  'timber',
  'damaged',
]);
export const INDUSTRIAL_TERRAIN_MATERIALS = Object.freeze({
  'terrain.wall': 'concrete',
  'terrain.slow': 'earth',
  'terrain.lethal': 'metal',
});
const colors = Object.freeze({
  concrete: ['#414b46', '#697267', '#899184', '#a6ad9d', '#c0c5b5', '#596257'],
  earth: ['#37382d', '#514c36', '#6b6043', '#887751', '#a08c62', '#666b49'],
  metal: ['#273632', '#414f45', '#5d6e54', '#849070', '#b0b897', '#796347'],
  masonry: ['#303733', '#52594d', '#72786b', '#959b86', '#b2b79c', '#606353'],
  timber: ['#302f26', '#49432d', '#746341', '#938054', '#b3a174', '#635637'],
  damaged: ['#343b36', '#555f53', '#798171', '#9aa28d', '#b6bda8', '#665c45'],
});
const rgb = (hex) => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));

/** No random stream, time, source image or DOM dependency. Full alpha coverage
 * keeps the hidden photograph concealed even when used as the final tile layer. */
export function industrialMaterialPixels(
  { width, height },
  material,
  { revision = INDUSTRIAL_MATERIAL_REVISION, variant = 0 } = {},
) {
  const expanded = revision === INDUSTRIAL_ENVIRONMENT_REVISION;
  if (
    ![INDUSTRIAL_MATERIAL_REVISION, INDUSTRIAL_ENVIRONMENT_REVISION].includes(revision) ||
    !Number.isInteger(variant) ||
    variant < 0 ||
    variant > 3 ||
    (!expanded && variant !== 0) ||
    !(expanded ? INDUSTRIAL_ENVIRONMENT_MATERIALS : INDUSTRIAL_MATERIALS).includes(material) ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 16 ||
    height < 16 ||
    width > 128 ||
    height > 128
  )
    throw new TypeError('Industrial material needs a known role and a 16–128 pixel frame.');
  const rgba = new Uint8ClampedArray(width * height * 4),
    palette = colors[material].map(rgb);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = Math.floor((x * 32) / width),
        v = Math.floor((y * 32) / height),
        grain = (u * 13 + v * 23 + Math.floor(u / 3) * 7 + variant * 11) % 37;
      let color = 2;
      if (material === 'concrete') {
        if (grain < 3) color = 3;
        if (grain === 12) color = 1;
        if (v < 2 || (u < 2 && v < 28)) color = 4;
        if (v >= 28) color = v < 30 ? 1 : 0;
        if (u >= 30) color = 0;
        // Cast shuttering seam, recessed lifting pockets and a restrained chip.
        if (v === 8 || v === 22) color = 3;
        if (((u >= 6 && u < 10) || (u >= 22 && u < 26)) && v >= 12 && v < 18)
          color = v < 16 ? 0 : 1;
        if ((u >= 16 && u < 18 && v >= 2 && v < 6) || (u >= 18 && u < 20 && v >= 6 && v < 8))
          color = 5;
      } else if (material === 'earth') {
        if (grain < 5) color = 3;
        if (grain === 18 || grain === 19) color = 1;
        const rut = (u >= 4 && u < 11) || (u >= 21 && u < 28);
        if (rut) color = u === 4 || u === 21 ? 0 : 1;
        if (rut && v % 8 < 2) color = 3;
        if ((u === 12 || u === 14) && v >= 22 && v < 26) color = 5;
        if (u >= 16 && u < 20 && v >= 10 && v < 12) color = 4;
      } else if (material === 'metal') {
        if (grain < 3) color = 3;
        if (u < 2 || v < 2) color = 4;
        if (u >= 29 || v >= 29) color = 0;
        if (u === 28 || v === 28) color = 1;
        // Raised diagonal tread clusters; rivets read independently of color.
        if (u > 7 && u < 25 && v > 7 && v < 25 && (u + v) % 12 < 2) color = 3;
        if (
          ((u >= 4 && u < 7) || (u >= 24 && u < 27)) &&
          ((v >= 4 && v < 7) || (v >= 24 && v < 27))
        )
          color = u % 2 === 0 && v % 2 === 0 ? 4 : 0;
        if (u >= 12 && u < 22 && v >= 26 && v < 28) color = 5;
      }
      if (expanded) {
        // Broad, low-contrast wear precedes small accents. Variation is authored,
        // never sampled from simulation RNG or the concealed reward photograph.
        const patch = (Math.floor(u / 8) * 3 + Math.floor(v / 8) * 5 + variant) % 7;
        if (color === 2 && patch === 0) color = 1;
        if (color === 2 && patch === 3) color = 3;
        if (material === 'masonry') {
          const course = Math.floor(v / 8),
            joint = (u + (course % 2) * 8) % 16;
          color = 2 + ((Math.floor((u + (course % 2) * 8) / 16) + course + variant) % 2);
          if (v % 8 === 0 || joint === 0) color = 0;
          else if (v % 8 === 1 || joint === 1) color = 4;
          else if (v % 8 === 7) color = 1;
          else if (grain < 2) color = 5;
        } else if (material === 'timber') {
          const plank = Math.floor(u / 8),
            across = u % 8;
          color = 2 + ((plank + variant) % 2);
          if (across === 0) color = 0;
          else if (across === 1) color = 4;
          else if ((v + plank * 3 + variant * 3) % 13 === 0 && across > 3) color = 1;
          if ((v === 4 || v === 27) && (across === 3 || across === 4)) color = 0;
          if (v === 3 && across === 3) color = 4;
          if (Math.abs(v - 16 - plank) < 2 && across === 5) color = 5;
        } else if (material === 'damaged') {
          const fissure = 13 + (Math.floor(v / 5) % 3) + variant;
          color = grain < 3 ? 3 : 2;
          if (u === fissure || (v > 17 && u + v === 39)) color = 0;
          else if (u === fissure + 1) color = 4;
          if ((u > 3 && u < 8 && v > 22 && v < 26) || (u > 23 && u < 29 && v > 6 && v < 10))
            color = v % 2 ? 1 : 5;
          if (v < 2) color = 3;
          if (v > 29 || u > 29) color = 1;
        }
      }
      rgba.set([...palette[color], 255], (y * width + x) * 4);
    }
  return { width, height, rgba };
}

/** Review-only drawing API. Paints the same native pixels without allocating
 * canvases or loading assets. Gameplay markers belong to each native renderer. */
export function drawIndustrialMaterialSpecimen(
  ctx,
  {
    material,
    x = 0,
    y = 0,
    width = 96,
    height = 96,
    size = 32,
    revision = INDUSTRIAL_MATERIAL_REVISION,
    variant = 0,
  },
) {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
    throw new TypeError('Material specimen needs finite positive dimensions.');
  const frame = industrialMaterialPixels({ width: size, height: size }, material, {
    revision,
    variant,
  });
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    for (let row = 0; row < size; row++)
      for (let column = 0; column < size; column++) {
        const at = (row * size + column) * 4;
        ctx.fillStyle = `rgb(${frame.rgba[at]},${frame.rgba[at + 1]},${frame.rgba[at + 2]})`;
        ctx.fillRect(
          x + (column * width) / size,
          y + (row * height) / size,
          width / size,
          height / size,
        );
      }
  } finally {
    ctx.restore();
  }
  return frame;
}
