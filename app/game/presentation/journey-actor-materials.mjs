// Original code-native pixel drawings. An explicit presentation successor may
// select these; existing theme IDs and uploaded artwork never select them.
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const JOURNEY_ACTOR_MATERIALS = freeze([
  {
    id: 'horizon-enamel-v1',
    sourceThemeId: 'horizon',
    name: 'Horizon enamel',
    material: 'sunlit ceramic',
    motif: 'glaze',
    flange: -2,
    metal: '#ceb492',
    inset: '#61594a',
  },
  {
    id: 'border-seedpod-v1',
    sourceThemeId: 'border-bloom',
    name: 'Border seedpod',
    material: 'ribbed botanical casing',
    motif: 'seed',
    flange: 0,
    metal: '#b9ca96',
    inset: '#485c4a',
  },
  {
    id: 'signal-porcelain-v1',
    sourceThemeId: 'signal-gardens',
    name: 'Signal porcelain',
    material: 'porcelain circuit inlays',
    motif: 'circuit',
    flange: 2,
    metal: '#b8d4d4',
    inset: '#425665',
  },
  {
    id: 'neon-glass-v1',
    sourceThemeId: 'neon-contours',
    name: 'Neon glass',
    material: 'stepped smoked glass',
    motif: 'steps',
    flange: -2,
    metal: '#adacd5',
    inset: '#4b4869',
  },
  {
    id: 'rover-rivets-v1',
    sourceThemeId: 'rover-yard',
    name: 'Rover rivets',
    material: 'riveted workshop plates',
    motif: 'rivets',
    flange: 0,
    metal: '#c6b18e',
    inset: '#5b5149',
  },
  {
    id: 'fracture-basalt-v1',
    sourceThemeId: 'fractured-grid',
    name: 'Fracture basalt',
    material: 'split basalt plates',
    motif: 'fracture',
    flange: 2,
    metal: '#b6afb4',
    inset: '#514c5b',
  },
  {
    id: 'phase-prism-v1',
    sourceThemeId: 'phaseworks',
    name: 'Phase prism',
    material: 'diagonal prism facets',
    motif: 'prism',
    flange: -2,
    metal: '#bdb2d0',
    inset: '#504b68',
  },
  {
    id: 'livewire-copper-v1',
    sourceThemeId: 'livewire-foundry',
    name: 'Livewire copper',
    material: 'vented copper housings',
    motif: 'vents',
    flange: 0,
    metal: '#d0a17e',
    inset: '#674b42',
  },
  {
    id: 'relay-lacquer-v1',
    sourceThemeId: 'relay-labyrinth',
    name: 'Relay lacquer',
    material: 'linked lacquer tiles',
    motif: 'links',
    flange: 2,
    metal: '#b6cbb0',
    inset: '#475b58',
  },
  {
    id: 'crosswind-sail-v1',
    sourceThemeId: 'crosswind-array',
    name: 'Crosswind sail',
    material: 'woven sail panels',
    motif: 'weave',
    flange: -2,
    metal: '#a9cbcf',
    inset: '#465a69',
  },
  {
    id: 'sentinel-gilt-v1',
    sourceThemeId: 'sentinel-crown',
    name: 'Sentinel gilt',
    material: 'gilt crown armor',
    motif: 'crown',
    flange: 0,
    metal: '#d1bb8c',
    inset: '#5e516b',
  },
  {
    id: 'apex-ice-v1',
    sourceThemeId: 'apex-aurora',
    name: 'Apex ice',
    material: 'polar ice facets',
    motif: 'frost',
    flange: 2,
    metal: '#c5d5df',
    inset: '#4a5b75',
  },
]);
const byId = new Map(JOURNEY_ACTOR_MATERIALS.map((entry) => [entry.id, entry]));
export const journeyActorMaterial = (id) => byId.get(id) ?? null;
const themeMaterials = new Map(
  JOURNEY_ACTOR_MATERIALS.map((entry) => [`${entry.sourceThemeId}-actors-v1`, entry]),
);
export const journeyActorThemeMaterial = (themeId) => themeMaterials.get(themeId) ?? null;

/** Explicit cosmetic successor, not a new theme schema or a changed old ID.
 * Keep palette/labels/player bodies from the existing theme authority. */
export function createJourneyActorTheme(theme) {
  const material = JOURNEY_ACTOR_MATERIALS.find((entry) => entry.sourceThemeId === theme?.id);
  if (!material) throw new Error('A registered Journey campaign theme is required.');
  return {
    ...structuredClone(theme),
    id: `${theme.id}-actors-v1`,
    name: `${theme.name} · material review`,
  };
}

/** Explicit route catalog preparation; old callers keep their original array. */
export function journeyActorThemeCandidates(themes, { includeOriginals = false } = {}) {
  const candidates = themes.map((theme) => createJourneyActorTheme(theme));
  return includeOriginals ? [...candidates, ...structuredClone(themes)] : candidates;
}

// Role topology stays recognizable across all materials: diamond keeper, long
// perimeter shuttle, bent frontier crawler, feet, bite, lanes and locked crown.
const bodies = {
  bouncer: (x, y) => Math.abs(x) <= 5 && Math.abs(y) <= 5 && Math.abs(x) + Math.abs(y) <= 8,
  'border-patrol': (x, y) => Math.abs(y) <= 6 && Math.abs(x) <= (Math.abs(y) <= 2 ? 5 : 2),
  'contour-patrol': (x, y) => Math.abs(x) <= 5 && Math.abs(y) <= 5 && (x <= -2 || y >= 2),
  'claimed-rover': (x, y) =>
    (Math.abs(x) <= 5 && y >= -4 && y <= 2) ||
    (Math.abs(x) >= 3 && Math.abs(x) <= 5 && y >= 3 && y <= 6),
  eroder: (x, y) =>
    Math.abs(x) <= 5 &&
    Math.abs(y) <= 5 &&
    Math.abs(x) + Math.abs(y) <= 8 &&
    !(x >= 2 && Math.abs(y) <= 1),
  'lane-boss': (x, y) =>
    Math.abs(y) <= 5 && (Math.abs(x) <= 1 || (Math.abs(x) >= 3 && Math.abs(x) <= 5) || y >= 3),
  'relay-sentinel': (x, y) =>
    (Math.abs(x) <= 5 && Math.abs(y) <= 4) ||
    (y === -5 && [-4, 0, 4].includes(x)) ||
    (y === -6 && x === 0),
};
const patterns = {
  glaze: (x, y) => y === -2 && x < 2,
  seed: (x, y) => x % 3 === 0 && y % 2 === 0,
  circuit: (x, y) => (y === 1 && x <= 2) || (x === 2 && y <= 1),
  steps: (x, y) => (x + y + 20) % 4 === 0,
  rivets: (x, y) => Math.abs(x) === 3 && Math.abs(y) === 2,
  fracture: (x, y) => x === (y < 0 ? -1 : 1),
  prism: (x, y) => x === y || x === y + 3,
  vents: (x, y) => y % 2 === 0 && Math.abs(x) <= 3,
  links: (x, y) => (Math.abs(x) === 2 && Math.abs(y) <= 2) || (y === 0 && Math.abs(x) < 2),
  weave: (x, y) => (x + 14) % 3 === (y + 14) % 3,
  crown: (x, y) => y === 2 || (y < 2 && y >= -2 && x % 2 === 0),
  frost: (x, y) => x === 0 || y === 0 || (Math.abs(x) === Math.abs(y) && Math.abs(x) <= 2),
};

/** Bounded immutable recipe in a 28×28 logical envelope. No actor, RNG, clock,
 * state, image allocation, storage, network or presentation lease is consumed. */
export function journeyActorPixels(materialId, type) {
  const material = journeyActorMaterial(materialId);
  if (!material || !Object.hasOwn(bodies, type)) return null;
  const inside = (x, y) => bodies[type](x, y) || (x === -6 && y === material.flange);
  const pixels = [];
  for (let y = -7; y < 7; y++)
    for (let x = -7; x < 7; x++) {
      if (!inside(x, y)) continue;
      const edge = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ].some(([dx, dy]) => !inside(x + dx, y + dy));
      const tone = edge
        ? 'outline'
        : patterns[material.motif](x, y)
          ? 'inset'
          : x < 0 && y < 0
            ? 'metal'
            : 'role';
      pixels.push({ x: x * 2, y: y * 2, size: 2, tone });
    }
  return freeze(pixels);
}

// Precompile the tiny finite table once, never regenerate pixel recipes per tick.
const recipes = new Map(
  JOURNEY_ACTOR_MATERIALS.flatMap(({ id }) =>
    Object.keys(bodies).map((type) => [`${id}/${type}`, journeyActorPixels(id, type)]),
  ),
);
export function drawJourneyActorMaterial(ctx, frame, colors) {
  const material = journeyActorMaterial(frame?.journeyMaterial);
  // Team drifters share only the field-body drawing, never the Solo actor type,
  // movement policy, counterplay, radius or functional badges.
  const bodyType = frame?.type === 'drifter' ? 'bouncer' : frame?.type;
  const pixels = material && recipes.get(`${material.id}/${bodyType}`);
  if (!pixels) return false;
  const palette = {
    outline: colors.dark,
    role: colors.body,
    metal: frame.dormant ? colors.body : material.metal,
    inset: frame.dormant ? colors.dark : material.inset,
  };
  for (const pixel of pixels) {
    ctx.fillStyle = palette[pixel.tone];
    ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
  }
  return true;
}
