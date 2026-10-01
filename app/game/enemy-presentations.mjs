import { boundedJSON, exactKeys, required, stableId } from './data-json.mjs';
import { ENEMY_CATALOG, enemyCatalogRecord, enemySkinId } from './enemy-catalog.mjs';
import { validateBodyDerivative } from './body-derivative.mjs';

export const ENEMY_PRESENTATION_LIMITS = Object.freeze({
  records: 7,
  bytes: 32768,
  imageBytes: 2 * 1024 * 1024,
  components: 8,
  bitmapSize: 128,
});
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const number = (value, low, high) =>
  typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;

export function validateEnemyPresentations(source) {
  const data = boundedJSON(source, {
    maxBytes: ENEMY_PRESENTATION_LIMITS.bytes,
    maxNodes: 1024,
    maxArray: 8,
    maxString: 256,
    maxDepth: 6,
  });
  exactKeys(data, ['format', 'entries'], 'enemy presentations');
  required(
    data.format === 'revealline-enemy-presentations.v1',
    'Unknown enemy presentation format.',
  );
  required(
    Array.isArray(data.entries) && data.entries.length === 7,
    'Seven enemy presentations required.',
  );
  const ids = new Set();
  data.entries.forEach((row, index) => {
    exactKeys(
      row,
      [
        'type',
        'skinId',
        'presentationId',
        'src',
        'bytes',
        'sha256',
        'width',
        'height',
        'pivot',
        'motion',
        ...(Object.hasOwn(row, 'derivation') ? ['derivation'] : []),
      ],
      'enemy presentation',
    );
    required(row.type === ENEMY_CATALOG[index].type, 'Enemy presentation type/order differs.');
    required(row.skinId === enemySkinId(row.type, 'fpv'), 'Enemy presentation skin differs.');
    required(
      stableId(row.presentationId) && !ids.has(row.presentationId),
      'Unique presentation identity required.',
    );
    ids.add(row.presentationId);
    const originalSrc = `authoring/library/fpv-enemy-presentations/originals/${row.type}.png`;
    if (Object.hasOwn(row, 'derivation')) {
      const output = validateBodyDerivative(row.derivation, {
        id: row.presentationId,
        src: row.src,
        sourceSrc: originalSrc,
      });
      required(
        ['bytes', 'sha256', 'width', 'height'].every((key) => row[key] === output[key]),
        'Enemy runtime derivative identity differs.',
      );
    } else required(row.src === originalSrc, 'Unregistered enemy image path.');
    required(
      Number.isSafeInteger(row.bytes) &&
        row.bytes > 0 &&
        row.bytes <= ENEMY_PRESENTATION_LIMITS.imageBytes,
      'Enemy image byte bound.',
    );
    required(
      typeof row.sha256 === 'string' && /^[a-f0-9]{64}$/.test(row.sha256),
      'Enemy image hash required.',
    );
    required(
      row.width === (row.derivation ? 128 : 1254) && row.height === row.width,
      'Registered enemy image dimensions differ.',
    );
    required(
      Array.isArray(row.pivot) && row.pivot.length === 2 && row.pivot.every((n) => n === 0.5),
      'Enemy frame-center pivot required.',
    );
    required(Array.isArray(row.motion) && row.motion.length <= 8, 'Enemy motion component bound.');
    row.motion.forEach((part) => {
      exactKeys(
        part,
        ['kind', 'x', 'y', 'width', 'height', 'color', 'rate'],
        'enemy surface motion',
      );
      required(
        ['travel-glint', 'phase-sweep'].includes(part.kind),
        'Unsupported enemy surface motion.',
      );
      required(
        number(part.width, 0.005, 0.5) && number(part.height, 0.005, 0.5),
        'Enemy motion extent bound.',
      );
      required(
        number(part.x, part.width / 2, 1 - part.width / 2) &&
          number(part.y, part.height / 2, 1 - part.height / 2),
        'Enemy motion leaves image envelope.',
      );
      required(
        number(part.rate, 0.25, 8) &&
          typeof part.color === 'string' &&
          /^#[a-fA-F0-9]{6}$/.test(part.color),
        'Enemy motion color/rate bound.',
      );
    });
    required(
      !['border-patrol', 'contour-patrol', 'relay-sentinel'].includes(row.type) ||
        row.motion.length === 0,
      'Baked rotor and relay bodies have no independent motion rig.',
    );
  });
  return freeze(data);
}

export function createEnemyPresentations(source) {
  const data = validateEnemyPresentations(source);
  const byType = new Map(data.entries.map((entry) => [entry.type, entry]));
  return Object.freeze({
    entries: data.entries,
    forFrame(frame, overrides = {}) {
      const role = enemyCatalogRecord(frame?.type)?.role;
      // Even an unavailable requested upload keeps its existing vector fallback.
      if (!role || Object.hasOwn(overrides, role) || frame.themeId !== 'fpv') return null;
      return byType.get(frame.type) ?? null;
    },
  });
}
