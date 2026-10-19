/** Shared, bounded cosmetic surfaces. Live boards and signal scratch buffers are
 * owned elsewhere. Four MiB leaves headroom for decoded backdrops, material atlases and receivers. */
export const CLASSIC_TERRAIN_CACHE_BYTES = 4 * 1024 * 1024;
const owners = new WeakMap();
const images = new WeakMap();
let nextImage = 1;
export function classicTerrainImageKey(image) {
  if (!image || typeof image !== 'object') return 'none';
  if (!images.has(image)) images.set(image, nextImage++);
  return `${images.get(image)}/${image.naturalWidth ?? image.width}/${image.naturalHeight ?? image.height}`;
}
function store(owner) {
  if (!owners.has(owner)) owners.set(owner, { entries: new Map(), bytes: 0, hits: 0, misses: 0 });
  return owners.get(owner);
}
export function classicTerrainCacheStats(owner) {
  const cache = owners.get(owner);
  return {
    bytes: cache?.bytes ?? 0,
    entries: cache?.entries.size ?? 0,
    hits: cache?.hits ?? 0,
    misses: cache?.misses ?? 0,
    limit: CLASSIC_TERRAIN_CACHE_BYTES,
  };
}
export function drawClassicCachedTerrain(ctx, owner, key, width, height, paint, enabled = true) {
  if (!enabled || !owner?.createElement) {
    paint(ctx);
    return;
  }
  const cache = store(owner);
  let entry = cache.entries.get(key);
  if (entry) {
    cache.hits++;
    cache.entries.delete(key);
    cache.entries.set(key, entry);
  } else {
    cache.misses++;
    const bytes = width * height * 4;
    if (bytes > CLASSIC_TERRAIN_CACHE_BYTES) {
      paint(ctx);
      return;
    }
    while (cache.bytes + bytes > CLASSIC_TERRAIN_CACHE_BYTES && cache.entries.size) {
      const oldest = cache.entries.keys().next().value;
      const released = cache.entries.get(oldest);
      cache.entries.delete(oldest);
      cache.bytes -= released.bytes;
      // Explicitly release backing pixels, rather than waiting for GC while scrolling.
      released.canvas.width = released.canvas.height = 1;
    }
    const canvas = owner.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext?.('2d');
    if (!context?.fillRect || !context?.stroke) {
      canvas.width = canvas.height = 1;
      paint(ctx);
      return;
    }
    context.imageSmoothingEnabled = false;
    paint(context);
    entry = { canvas, bytes };
    cache.entries.set(key, entry);
    cache.bytes += bytes;
  }
  ctx.drawImage(entry.canvas, 0, 0, width, height);
}
