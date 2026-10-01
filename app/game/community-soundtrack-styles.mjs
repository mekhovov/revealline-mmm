import {
  DEFAULT_PUBLIC_SOUNDTRACK_STYLE_IDS,
  PUBLIC_SOUNDTRACK_STYLE_IDS,
} from './soundtrack-style-taxonomy.mjs';

const SPECIAL_STYLES_BY_BRAND = Object.freeze({
  'social-drone-ua': Object.freeze(['ukrainian', 'fpv']),
  'victory-drones': Object.freeze(['ukrainian', 'fpv']),
  'fpv-learning': Object.freeze(['ukrainian', 'fpv']),
  'ukraine-culture': Object.freeze(['ukrainian']),
});

/** The unbranded FPV / LINE game owns the complete catalogue. Community
 * editions add only the special collections that fit their public identity. */
export function availableCommunitySoundtrackStyles(brandId = null) {
  if (brandId === null || brandId === undefined) return PUBLIC_SOUNDTRACK_STYLE_IDS;
  const allowed = new Set([
    ...DEFAULT_PUBLIC_SOUNDTRACK_STYLE_IDS,
    ...(SPECIAL_STYLES_BY_BRAND[brandId] ?? []),
  ]);
  return Object.freeze(PUBLIC_SOUNDTRACK_STYLE_IDS.filter((style) => allowed.has(style)));
}
