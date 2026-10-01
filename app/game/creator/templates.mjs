import { boundedJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { createStarterProject } from '../content-design/starter.mjs';
import { compileContentProject, resolveMission } from '../content-design/project.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import { createRun, stepRun, getSummary, CLASSES } from '../core/index.mjs';
import { createRecorder, recordInput, exportReplay, verifyReplayAsync } from '../replay.mjs';

export const CREATOR_GAMEPLAY_POLICY = 'compiled-preset-v1';
// Retained so installed Phase 1 editions can still be revalidated byte for byte.
export const CREATOR_TEMPLATE_VERSION = 'creator-crossing.v1';
const CREATOR_TEMPLATE_REGISTRY_LEGACY_VERSION = 'creator-layouts.v2';
export const CREATOR_TEMPLATE_REGISTRY_VERSION = 'creator-layouts.v3';
export const CREATOR_ROUTE_FORMAT = 'revealline-creator-route.v1';

const difficulties = ['gentle', 'standard', 'expert'];
const turnPolicies = ['immediate', 'grid-center'];
const rect = (x, y, w, h) => ({ x, y, w, h });
const terrain = (id, kind, x, y, w, h) => ({ id, kind, x, y, w, h });

/** Bounded authored recipes. Selection chooses among these exact layouts; it
 * never perturbs arbitrary gameplay fields. Each route is replayed against the
 * compiled result before the creator can approve it. */
const templateRecipesV2 = freezeDesign([
  {
    id: 'first-crossing',
    name: 'First crossing',
    description: 'An open introductory field with a direct border-to-border crossing.',
    mapName: 'An open crossing',
    design: {
      routeDecision: 'Cross directly or turn to make a smaller return?',
      lesson: 'A line closes when you reach safe ground.',
      captureConsequence: 'Closing a line reclaims the unoccupied field.',
      memorableMoment: 'Your picture appears after the first complete crossing.',
      mastery: 'Make one continuous crossing.',
    },
    variants: [
      { id: 'center', spawn: { x: 36.5, y: 0.5 }, direction: 'down' },
      { id: 'west', spawn: { x: 18.5, y: 0.5 }, direction: 'down' },
    ],
  },
  {
    id: 'island-chain',
    name: 'Island chain',
    description: 'Permanent islands frame an open channel through the field.',
    mapName: 'A chain of safe islands',
    design: {
      routeDecision: 'Take the open channel between the permanent islands.',
      lesson: 'Safe islands can create future return points without blocking a crossing.',
      captureConsequence: 'The crossing joins the outer boundary around the island chain.',
      memorableMoment: 'The reveal opens between two permanent islands.',
      mastery: 'Hold a direct course through the island channel.',
    },
    variants: [
      {
        id: 'middle-channel',
        spawn: { x: 36.5, y: 0.5 },
        direction: 'down',
        foundations: [rect(9, 8, 9, 5), rect(53, 23, 9, 5)],
      },
      {
        id: 'offset-channel',
        spawn: { x: 25.5, y: 0.5 },
        direction: 'down',
        foundations: [rect(42, 7, 8, 6), rect(8, 23, 8, 5), rect(53, 25, 6, 4)],
      },
    ],
  },
  {
    id: 'twin-corridors',
    name: 'Twin corridors',
    description: 'Long wall pairs define a clear vertical lane.',
    mapName: 'Twin vertical corridors',
    design: {
      routeDecision: 'Commit to the open lane between the two long walls.',
      lesson: 'Walls shape a route while the field inside the lane remains claimable.',
      captureConsequence: 'The lane divides the remaining field into bounded chambers.',
      memorableMoment: 'The picture unfolds through a narrow central passage.',
      mastery: 'Cross the full corridor without turning.',
    },
    variants: [
      {
        id: 'central-lane',
        spawn: { x: 36.5, y: 0.5 },
        direction: 'down',
        walls: [rect(27, 5, 4, 26), rect(42, 5, 4, 26)],
      },
      {
        id: 'west-lane',
        spawn: { x: 17.5, y: 0.5 },
        direction: 'down',
        walls: [rect(8, 4, 4, 27), rect(25, 4, 4, 27)],
      },
    ],
  },
  {
    id: 'open-terraces',
    name: 'Open terraces',
    description: 'Three staggered wall terraces preserve one continuous crossing gap.',
    mapName: 'Three open terraces',
    design: {
      routeDecision: 'Read the aligned gaps and cross all three terraces.',
      lesson: 'Separated wall segments can preserve a deliberate route through the board.',
      captureConsequence: 'The crossing closes the open terrace channel.',
      memorableMoment: 'Three gaps align into one clean reveal.',
      mastery: 'Keep the terrace gaps centered for the full crossing.',
    },
    variants: [
      {
        id: 'center-gaps',
        spawn: { x: 36.5, y: 0.5 },
        direction: 'down',
        walls: [
          rect(1, 8, 31, 2),
          rect(41, 8, 30, 2),
          rect(1, 17, 33, 2),
          rect(39, 17, 32, 2),
          rect(1, 26, 30, 2),
          rect(42, 26, 29, 2),
        ],
      },
      {
        id: 'west-gaps',
        spawn: { x: 22.5, y: 0.5 },
        direction: 'down',
        walls: [
          rect(1, 8, 17, 2),
          rect(28, 8, 43, 2),
          rect(1, 17, 19, 2),
          rect(27, 17, 44, 2),
          rect(1, 26, 16, 2),
          rect(29, 26, 42, 2),
        ],
      },
    ],
  },
  {
    id: 'soft-current',
    name: 'Soft current',
    description: 'A slow material band changes crossing time without changing the legal route.',
    mapName: 'A soft current',
    design: {
      routeDecision: 'Stay on course while the slow material changes your timing.',
      lesson: 'Slow terrain affects movement time but remains claimable field.',
      captureConsequence: 'The crossing neutralizes the material inside the captured region.',
      memorableMoment: 'The reveal accelerates again after the slow current.',
      mastery: 'Complete the crossing through one slow band.',
    },
    variants: [
      {
        id: 'horizontal-current',
        spawn: { x: 35.5, y: 0.5 },
        direction: 'down',
        terrain: [terrain('slow-current', 'slow', 1, 13, 70, 8)],
      },
      {
        id: 'vertical-current',
        spawn: { x: 0.5, y: 18.5 },
        direction: 'right',
        terrain: [terrain('slow-current', 'slow', 27, 1, 10, 34)],
      },
    ],
  },
  {
    id: 'ember-garden',
    name: 'Ember garden',
    description: 'Bounded lethal beds leave one visible safe passage across the board.',
    mapName: 'A safe path through embers',
    design: {
      routeDecision: 'Follow the clear passage between the ember beds.',
      lesson: 'Lethal terrain is readable and avoidable when a route stays outside it.',
      captureConsequence: 'The safe passage encloses the unattended ember beds.',
      memorableMoment: 'The picture appears along the one clear path through the garden.',
      mastery: 'Cross without entering an ember bed.',
    },
    variants: [
      {
        id: 'vertical-passage',
        spawn: { x: 36.5, y: 0.5 },
        direction: 'down',
        terrain: [
          terrain('west-embers', 'lethal', 5, 9, 24, 18),
          terrain('east-embers', 'lethal', 44, 9, 23, 18),
        ],
      },
      {
        id: 'horizontal-passage',
        spawn: { x: 0.5, y: 18.5 },
        direction: 'right',
        terrain: [
          terrain('north-embers', 'lethal', 15, 4, 42, 9),
          terrain('south-embers', 'lethal', 15, 24, 42, 8),
        ],
      },
    ],
  },
]);

const generatedThreats = freezeDesign({
  'first-crossing:center': {
    walls: [rect(8, 8, 14, 2), rect(50, 26, 14, 2)],
    actors: [
      {
        id: 'west-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 8.5,
        y: 18.5,
        heading: [0, 1],
      },
    ],
  },
  'first-crossing:west': {
    walls: [rect(31, 5, 2, 10), rect(31, 22, 2, 9)],
    actors: [
      {
        id: 'west-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 7.5,
        y: 18.5,
        heading: [0, 1],
      },
    ],
  },
  'island-chain:middle-channel': {
    walls: [rect(4, 16, 10, 2), rect(58, 18, 10, 2)],
    actors: [
      {
        id: 'west-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 8.5,
        y: 28.5,
        heading: [0, 1],
      },
    ],
  },
  'island-chain:offset-channel': {
    walls: [rect(38, 15, 10, 2)],
    actors: [
      {
        id: 'west-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 8.5,
        y: 14.5,
        heading: [0, 1],
      },
    ],
  },
  'twin-corridors:central-lane': {
    actors: [
      {
        id: 'west-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 6.5,
        y: 18.5,
        heading: [0, 1],
      },
    ],
  },
  'twin-corridors:west-lane': {
    actors: [
      {
        id: 'west-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 5.5,
        y: 17.5,
        heading: [0, 1],
      },
    ],
  },
  'open-terraces:center-gaps': {
    actors: [
      {
        id: 'west-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 7.5,
        y: 13.5,
        heading: [0, 1],
      },
    ],
  },
  'open-terraces:west-gaps': {
    actors: [
      {
        id: 'west-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 8.5,
        y: 22.5,
        heading: [0, 1],
      },
    ],
  },
  'soft-current:horizontal-current': {
    walls: [rect(8, 8, 12, 2), rect(52, 26, 12, 2)],
    actors: [
      {
        id: 'west-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 7.5,
        y: 26.5,
        heading: [0, 1],
      },
    ],
  },
  'soft-current:vertical-current': {
    walls: [rect(14, 5, 2, 10), rect(54, 22, 2, 9)],
    actors: [
      {
        id: 'north-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 58.5,
        y: 5.5,
        heading: [1, 0],
      },
    ],
  },
  'ember-garden:vertical-passage': {
    walls: [rect(32, 6, 2, 8), rect(39, 22, 2, 8)],
    actors: [
      {
        id: 'west-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 3.5,
        y: 31.5,
        heading: [0, 1],
      },
    ],
  },
  'ember-garden:horizontal-passage': {
    walls: [rect(8, 15, 12, 2), rect(52, 20, 12, 2)],
    actors: [
      {
        id: 'north-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 60.5,
        y: 3.5,
        heading: [1, 0],
      },
    ],
  },
});

const templateRecipes = freezeDesign(
  templateRecipesV2.map((template) => ({
    ...structuredClone(template),
    description: `${template.description} A seeded field keeper adds live pressure.`,
    variants: template.variants.map((variant) => {
      const generated = generatedThreats[`${template.id}:${variant.id}`];
      required(generated, 'Every generated layout needs a verified threat pattern.');
      return {
        ...structuredClone(variant),
        ...(generated.walls
          ? {
              walls: [...structuredClone(variant.walls ?? []), ...structuredClone(generated.walls)],
            }
          : {}),
        actors: structuredClone(generated.actors),
      };
    }),
  })),
);

export const CREATOR_TEMPLATES = freezeDesign(
  templateRecipes.map((template) => ({
    id: template.id,
    version: CREATOR_TEMPLATE_REGISTRY_VERSION,
    name: template.name,
    description: template.description,
    variants: template.variants.map((variant) => variant.id),
    modes: ['solo', 'versus'],
    difficulties,
    turnPolicies,
    maxTicks: 2400,
  })),
);

const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Level generation cancelled.', 'AbortError');
};
const uint32 = (value) => Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
const text = (value) => typeof value === 'string' && value.trim() && value.length <= 160;
const recipesFor = (version) =>
  version === CREATOR_TEMPLATE_REGISTRY_VERSION ? templateRecipes : templateRecipesV2;
const recipe = (id, version = CREATOR_TEMPLATE_REGISTRY_VERSION) =>
  recipesFor(version).find((template) => template.id === id);

function currentSelection(seed, templateId, version = CREATOR_TEMPLATE_REGISTRY_VERSION) {
  const recipes = recipesFor(version);
  const template = templateId ? recipe(templateId, version) : recipes[seed % recipes.length];
  required(template, 'Choose a registered creator template.');
  const variant = template.variants[Math.floor(seed / recipes.length) % template.variants.length];
  return { template, variant, version };
}

function legacySelection(seed) {
  const template = recipe('first-crossing', CREATOR_TEMPLATE_REGISTRY_LEGACY_VERSION);
  return { template, variant: template.variants[seed % 2], version: CREATOR_TEMPLATE_VERSION };
}

/** Deterministic registry selection for batch generators and review UIs. */
export function selectCreatorTemplate(seed) {
  required(uint32(seed), 'Generation seed must be an unsigned 32-bit integer.');
  const { template, variant } = currentSelection(seed);
  return freezeDesign({
    templateId: template.id,
    templateVersion: CREATOR_TEMPLATE_REGISTRY_VERSION,
    variantId: variant.id,
  });
}

function buildCreatorProject(value, selection) {
  const { template, variant, version } = selection;
  const source = createStarterProject(value.id);
  source.revision = '1';
  source.name = value.name.trim();
  source.assets = [];
  const map = source.maps[0];
  Object.assign(map, {
    id: `${template.id}-map`,
    name: template.mapName,
    width: 72,
    height: 36,
    walls: structuredClone(variant.walls ?? []),
    foundations: structuredClone(variant.foundations ?? []),
    terrain: structuredClone(variant.terrain ?? []),
    spawns: [{ id: 'home', ...variant.spawn }],
  });
  // Historical Phase 1 projects used this exact map identity.
  if (version === CREATOR_TEMPLATE_VERSION) map.id = 'crossing-map';
  const mission = source.missions[0];
  Object.assign(mission, {
    id: 'picture-1',
    name: 'First picture',
    map: { id: map.id, revision: map.revision },
    modes: version === CREATOR_TEMPLATE_REGISTRY_VERSION ? ['solo', 'versus'] : ['solo'],
    actors: structuredClone(variant.actors ?? []),
    coverage: 0.5,
    design: {
      routeDecision: template.design.routeDecision,
      lesson: template.design.lesson,
      counterplay:
        variant.actors?.length > 0
          ? 'Read the seeded keeper, use the authored obstacles and close the verified route behind its movement.'
          : 'There are no enemies in this verified creator template.',
      captureConsequence: template.design.captureConsequence,
      introduces: ['closure'],
      practices: [],
      combines: [],
      memorableMoment: template.design.memorableMoment,
      mastery: template.design.mastery,
      durationSeconds: [10, 45],
      difficulty: {
        band: 1,
        planning: 0,
        execution: 1,
        threatDensity: variant.actors?.length ?? 0,
        timePressure: 0,
        mechanicLoad: 0,
        coordination: 0,
      },
    },
  });
  if (version === CREATOR_TEMPLATE_VERSION) {
    map.name = 'An open crossing';
    mission.design.counterplay = 'There are no enemies in this introductory template.';
  }
  Object.assign(source.campaigns[0], {
    id: 'pictures',
    name: source.name,
    missionIds: [mission.id],
  });
  Object.assign(source.packs[0], {
    id: 'collection',
    name: source.name,
    campaignIds: ['pictures'],
  });
  const project = compileContentProject(source).source;
  return freezeDesign({
    project,
    provenance: {
      format: 'revealline-creator-generation.v1',
      templateId: template.id,
      templateVersion: version,
      variantId: variant.id,
      generationSeed: value.seed,
      runtimeSeed: value.seed,
      missionId: mission.id,
      gameplayPolicy: CREATOR_GAMEPLAY_POLICY,
      policyId: source.policyId,
    },
  });
}

/** Geometry depends only on the versioned template and generation seed. No file
 * names, encoded images, clock, browser storage or random perturbation are read. */
export function generateCreatorProject(options) {
  const value = boundedJSON(options, { maxBytes: 2048, maxNodes: 16, maxDepth: 2 });
  exactKeys(value, ['id', 'name', 'seed', 'templateId'], 'creator generation');
  required(
    stableId(value.id) && text(value.name),
    'Choose a project identity and collection name.',
  );
  required(uint32(value.seed), 'Generation seed must be an unsigned 32-bit integer.');
  if (value.templateId !== undefined)
    required(stableId(value.templateId), 'Choose a registered creator template.');
  return buildCreatorProject(value, currentSelection(value.seed, value.templateId));
}

function selectionForProvenance(value) {
  if (value.templateVersion === CREATOR_TEMPLATE_VERSION && value.templateId === 'first-crossing')
    return legacySelection(value.generationSeed);
  if (
    [CREATOR_TEMPLATE_REGISTRY_LEGACY_VERSION, CREATOR_TEMPLATE_REGISTRY_VERSION].includes(
      value.templateVersion,
    )
  )
    return currentSelection(value.generationSeed, value.templateId, value.templateVersion);
  return null;
}

export function validateCreatorProvenance(source) {
  const value = boundedJSON(source, { maxBytes: 4096, maxNodes: 20, maxDepth: 2 });
  exactKeys(
    value,
    [
      'format',
      'templateId',
      'templateVersion',
      'variantId',
      'generationSeed',
      'runtimeSeed',
      'missionId',
      'gameplayPolicy',
      'policyId',
    ],
    'creator provenance',
  );
  const selection =
    uint32(value.generationSeed) && uint32(value.runtimeSeed)
      ? selectionForProvenance(value)
      : null;
  required(
    value.format === 'revealline-creator-generation.v1' &&
      selection &&
      value.gameplayPolicy === CREATOR_GAMEPLAY_POLICY &&
      stableId(value.missionId),
    'Unsupported creator template, seed or gameplay policy. Regenerate this level.',
  );
  const generated = buildCreatorProject(
    { id: 'template-check', name: 'Check', seed: value.generationSeed },
    selection,
  );
  required(
    value.variantId === generated.provenance.variantId &&
      value.policyId === generated.provenance.policyId &&
      value.runtimeSeed === generated.provenance.runtimeSeed,
    'Template variant or runtime seed differs from its generation recipe.',
  );
  return freezeDesign(value);
}

/** Check the actual compiled level, seed and preset through public legal input.
 * Uploaded success flags never bypass execution. Artwork/labels can change while
 * simulation stays identical. Gameplay edits require regeneration or a future
 * explicit recorded-completion workflow; they cannot borrow template evidence. */
export async function verifyCreatorRoutes(
  source,
  provenance,
  { signal, buildVersion = 'dev' } = {},
) {
  abort(signal);
  const generated = validateCreatorProvenance(provenance);
  const selection = selectionForProvenance(generated);
  const metadata =
    generated.templateVersion === CREATOR_TEMPLATE_VERSION
      ? { difficulties, turnPolicies, maxTicks: 2400 }
      : CREATOR_TEMPLATES.find((template) => template.id === generated.templateId);
  const project = compileContentProject(source);
  const reference = compileContentProject(
    buildCreatorProject(
      { id: 'template-check', name: 'Check', seed: generated.generationSeed },
      selection,
    ).project,
  );
  const results = [];
  for (const difficulty of metadata.difficulties) {
    const manifest = resolveMission(project, generated.missionId, { mode: 'solo', difficulty });
    const expected = resolveMission(reference, 'picture-1', { mode: 'solo', difficulty });
    required(
      manifest.simulationIdentity === expected.simulationIdentity,
      'Gameplay changed after generation. Regenerate the level or keep it as an unapproved draft.',
    );
    for (const turnPolicy of metadata.turnPolicies) {
      abort(signal);
      const options = {
        seed: generated.runtimeSeed,
        turnPolicy,
        classId: 'scout',
        classRecipes: CLASSES,
      };
      const run = createRun(manifest.level, options);
      const recorder = createRecorder(manifest.level, options, buildVersion);
      const input = { direction: selection.variant.direction };
      for (
        let tick = 0;
        tick < metadata.maxTicks && run.status !== 'won' && run.status !== 'lost';
        tick++
      ) {
        if (tick % 120 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          abort(signal);
        }
        recordInput(recorder, input);
        stepRun(run, input);
      }
      required(getSummary(run).won, 'The generated route did not complete. Regenerate this level.');
      const replay = exportReplay(recorder, run);
      const verified = await verifyReplayAsync(replay, { signal });
      required(
        verified.match && verified.actual.summary.won,
        'The generated completion did not replay successfully.',
      );
      results.push({
        format: CREATOR_ROUTE_FORMAT,
        kind: 'automated',
        check: 'route-feasibility',
        missionId: manifest.missionId,
        mode: 'solo',
        difficulty,
        simulationIdentity: manifest.simulationIdentity,
        gameplayPolicy: CREATOR_GAMEPLAY_POLICY,
        seed: generated.runtimeSeed,
        turnPolicy,
        ...(generated.templateVersion !== CREATOR_TEMPLATE_VERSION
          ? {
              templateId: generated.templateId,
              templateVersion: generated.templateVersion,
              variantId: generated.variantId,
            }
          : {}),
        replay,
      });
    }
  }
  abort(signal);
  return freezeDesign(results);
}
