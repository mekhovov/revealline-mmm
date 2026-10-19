import { ACTOR_VISUALS, actorVisual } from './actor-catalog.mjs';
/** Original 16-pixel art and cosmetic recipes. A catalog version never changes rules. */
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const body = (kind, pose) => [
  ['edge', 5, 0, 6, 6],
  ['ink', 6, 0, 4, 1],
  ['skin', 6, 1, 4, 4],
  ['ink', 8, 2, 2, 1],
  ['edge', 4, 5, 8, 6],
  ['coat', 5, 5, 6, 6],
  ['edge', 2, 6, 3, 6],
  ['skin', 3, 7 + (pose === 1 ? 1 : 0), 2, 4],
  ['edge', 11, 5, 3, 6],
  ['skin', 11, 6 + (pose === 2 ? 1 : 0), 2, 4],
  ...[
    [5, pose === 1 ? -1 : 0],
    [9, pose === 2 ? -1 : 0],
  ].flatMap(([x, step]) => [
    ['edge', x - 1, 10, 4, 6 + step],
    ['ink', x, 11, 2, 4 + step],
  ]),
  ...(kind === 'guard'
    ? [
        ['ink', 5, 0, 6, 2],
        ['badge', 6, 0, 4, 1],
        ['ink', 11, 7, 5, 2],
        ['edge', 14, 7, 2, 1],
        ['armor', 6, 6, 4, 2],
      ]
    : [
        ['ink', 6, 6, 1, 3],
        ['edge', 8, 6, 2, 2],
      ]),
];
export const HUNT_PRESENTATION_CATALOG = freeze({
  version: 'humanoid-presentation.v1',
  pixelSize: 16,
  palette: {
    ink: '#141820',
    edge: '#f3eddd',
    skin: '#dfaa87',
    blood: '#8c1934',
    flesh: '#d75a6b',
    bone: '#f5debb',
    rib: '#f3d7bb',
    spark: '#ffc36c',
  },
  actors: {
    runner: {
      material: 'flesh',
      tintWithAccent: true,
      palette: { coat: '#68cbb5' },
      artwork: { frames: [0, 1, 2].map((pose) => body('runner', pose)) },
    },
    guard: {
      material: 'flesh',
      tintWithAccent: false,
      palette: { coat: '#786888', badge: '#ffd27b', armor: '#c9b2e2' },
      artwork: { frames: [0, 1, 2].map((pose) => body('guard', pose)) },
    },
  },
  materials: {
    flesh: {
      fragments: [
        [
          ['ink', -2, -3, 5, 5],
          ['skin', -1, -2, 3, 3],
          ['ink', 1, -1, 1, 1],
          ['blood', -1, 1, 3, 2],
          ['bone', 0, 1, 1, 1],
        ],
        [
          ['ink', -3, -3, 6, 6],
          ['coat', -3, -3, 2, 4],
          ['blood', -1, -2, 4, 5],
          ['flesh', -1, -1, 3, 3],
          ['rib', 0, -1, 1, 3],
          ['blood', 1, 0, 2, 1],
        ],
        [
          ['blood', -1, -3, 3, 6],
          ['skin', 0, -2, 2, 4],
          ['bone', 0, -3, 1, 1],
          ['skin', 1, 2, 2, 1],
        ],
        [
          ['ink', -1, -3, 3, 6],
          ['coat', 0, -2, 2, 3],
          ['blood', -1, -3, 3, 1],
          ['bone', 0, -3, 1, 1],
          ['ink', -1, 2, 4, 2],
        ],
      ],
    },
    neutral: {
      fragments: [
        [
          ['ink', -2, -2, 4, 4],
          ['coat', -1, -1, 3, 2],
          ['edge', -1, -1, 1, 1],
        ],
      ],
    },
  },
  recipes: {
    contact: {
      radial: false,
      life: 0.85,
      envelopeLife: 0.23,
      speed: 28,
      speedRange: 34,
      spread: 1.8,
      gravity: 25,
      fragments: 6,
      trail: 4,
      radius: 4,
      radiusChange: 13,
      opacity: 0.5,
    },
    enclosure: {
      radial: true,
      life: 0.85,
      envelopeLife: 0.23,
      speed: 15,
      speedRange: 21,
      spread: 0,
      gravity: 25,
      fragments: 6,
      trail: 2,
      radius: 11,
      radiusChange: -5,
      opacity: 0.5,
    },
    group: { delayStep: 0.018, maximumDelaySteps: 5, crowdedAt: 8, fragments: 2, opacity: 0.65 },
    settled: { fullPieces: 4, cleanPieces: 2, fullScale: 0.8, cleanScale: 0.6, poolOpacity: 0.74 },
  },
  budgets: {
    pageParticles: 128,
    pageEnvelopes: 4,
    painters: 2,
    settledClustersPerBoard: 24,
    staleFrameMs: 250,
  },
});
// The historical catalog remains intact for imported previews. Runtime family
// lookups use the same original palette as live actors, including their cast.
const sharedActors = new Map(
  ACTOR_VISUALS.map((visual) => [
    visual.id,
    freeze({
      family: visual.family,
      cast: visual.cast,
      visualId: visual.id,
      material: visual.material,
      tintWithAccent: false,
      palette: { ...visual.palette, badge: visual.palette.light, armor: visual.palette.trim },
    }),
  ]),
);
export function huntActorPresentation(kind, cast = 'rivals') {
  const visual = actorVisual(kind, cast);
  return visual ? sharedActors.get(visual.id) : null;
}
export const huntDestructionRecipe = (cause) =>
  HUNT_PRESENTATION_CATALOG.recipes[cause === 'capture' ? 'enclosure' : 'contact'];
