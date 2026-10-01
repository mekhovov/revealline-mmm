import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { DEFAULT_RULES, FIXED_DT } from '../core/registry.mjs';
import { ARCADE_ACTIONS_VERSION } from '../core/arcade-actions.mjs';

export const freezeDesign = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDesign);
    Object.freeze(value);
  }
  return value;
};

export const LEGACY_JOURNEY_POLICY = freezeDesign({
  format: 'JourneyGameplayPolicyV1',
  id: 'journey-v1',
  fixedTimestep: FIXED_DT,
  capture: 'enemy-seeded-four-connected',
  turnPolicy: 'immediate-or-global-grid-buffer',
  recovery: 'fresh-direction',
  transitionInput: 'consume-and-rearm-per-control',
  rules: {
    ...DEFAULT_RULES,
    moveSpeed: 10,
    lives: 3,
    respawnSeconds: 0.65,
    timeLimitSeconds: 0,
    cutTimeLimitSeconds: 0,
    maxTrailCells: 0,
    stopOnCapture: true,
  },
});
// New projects select contact bonuses explicitly; old imported projects retain their rules.
export const JOURNEY_POLICY = freezeDesign({
  ...LEGACY_JOURNEY_POLICY,
  id: 'journey-arcade-v2',
  arcadeActions: { version: ARCADE_ACTIONS_VERSION },
});
// Explicit successor: every eligible enemy and active lane uses the proven
// Pressure Lines travelling-impact contract. Historical projects retain their
// selective carrier descriptors and exact replay identities.
export const TRAIL_IMPACT_JOURNEY_POLICY = freezeDesign({
  ...JOURNEY_POLICY,
  id: 'journey-trail-impact-v3',
  lineImpact: { version: 'line-impact.v1', speed: 24 },
});
export function journeyPolicy(id) {
  if (id === LEGACY_JOURNEY_POLICY.id) return LEGACY_JOURNEY_POLICY;
  if (id === JOURNEY_POLICY.id) return JOURNEY_POLICY;
  if (id === TRAIL_IMPACT_JOURNEY_POLICY.id) return TRAIL_IMPACT_JOURNEY_POLICY;
  throw new Error('Project must pin a registered Journey policy.');
}
export const DIFFICULTY_CATALOG = freezeDesign({
  format: 'DifficultyCatalogV1',
  id: 'journey-difficulty-v1',
  presets: {
    gentle: {
      lives: 5,
      enemySpeedFactor: 0.85,
      failingDeadline: false,
      description: 'Five lives, enemies 15% slower, no failing countdown.',
    },
    standard: {
      lives: 3,
      enemySpeedFactor: 1,
      failingDeadline: true,
      description: 'Three lives and the authored enemy tier.',
    },
    expert: {
      lives: 2,
      enemySpeedFactor: 1.1,
      failingDeadline: true,
      description: 'Two lives, enemies 10% faster. Player handling is unchanged.',
    },
  },
});
// Explicit successor: historical projects/replays keep v1, including its exact
// floating-point timings. These values are pressure-test hypotheses, not a claim
// of human-balanced content. Player handling and warning windows never scale.
export const PRESSURE_DIFFICULTY_CATALOG = freezeDesign({
  format: 'DifficultyCatalogV1',
  id: 'journey-difficulty-v2',
  presets: {
    gentle: {
      lives: 5,
      enemySpeedFactor: 1,
      attackRestFactor: 1.25,
      failingDeadline: false,
      description: 'Five lives, base enemy speed, 25% longer attack rests, no failing countdown.',
    },
    standard: {
      lives: 3,
      enemySpeedFactor: 1.4,
      attackRestFactor: 0.85,
      failingDeadline: true,
      description: 'Three lives, enemies 40% faster than base, 15% shorter attack rests.',
    },
    expert: {
      lives: 2,
      enemySpeedFactor: 1.75,
      attackRestFactor: 0.65,
      failingDeadline: true,
      description: 'Two lives, enemies 75% faster than base, 35% shorter attack rests.',
    },
  },
});

export function journeyDifficultyCatalog(id = DIFFICULTY_CATALOG.id) {
  if (id === DIFFICULTY_CATALOG.id) return DIFFICULTY_CATALOG;
  if (id === PRESSURE_DIFFICULTY_CATALOG.id) return PRESSURE_DIFFICULTY_CATALOG;
  throw new Error('Project must pin a registered difficulty catalog.');
}

export function journeyLaneTiming(timing, difficulty, catalogId = DIFFICULTY_CATALOG.id) {
  const preset = journeyPreset(difficulty, catalogId);
  if (preset.attackRestFactor === undefined) return { ...timing };
  const activeTicks = Math.round((timing.warningSeconds + timing.activeSeconds) / FIXED_DT);
  const restTicks = Math.max(
    1,
    Math.round(
      ((timing.period - timing.warningSeconds - timing.activeSeconds) * preset.attackRestFactor) /
        FIXED_DT,
    ),
  );
  return { ...timing, period: (activeTicks + restTicks) * FIXED_DT };
}

export function journeySentinelTiming(difficulty, catalogId = DIFFICULTY_CATALOG.id) {
  const preset = journeyPreset(difficulty, catalogId);
  const recipe = structuredClone(SENTINEL_RECIPE.definition);
  if (preset.attackRestFactor !== undefined)
    recipe.shielded.restTicks = Math.max(
      1,
      Math.round(recipe.shielded.restTicks * preset.attackRestFactor),
    );
  // CORE OPEN is an objective opportunity, not ordinary attack downtime.
  return recipe;
}
export const ACTOR_CATALOG = freezeDesign({
  format: 'ActorCatalogV1',
  id: 'journey-actors-v1',
  roles: {
    'field-keeper': {
      type: 'bouncer',
      domain: 'unclaimed-field',
      damageTarget: 'body-and-trail',
      retainsField: true,
      captureResponse: 'remains-in-retained-region',
      warning: 'continuous-visible-motion',
      action: 'reflect-in-field',
      recovery: 'continuous',
      counterplay: 'Time a short cut or herd it away from a larger enclosure.',
      speeds: { measured: 2.4, standard: 3.2, brisk: 4 },
    },
    'perimeter-patrol': {
      type: 'border-patrol',
      domain: 'outer-perimeter',
      damageTarget: 'body',
      retainsField: false,
      captureResponse: 'outer-route-unchanged',
      warning: 'visible-perimeter-route',
      action: 'follow-outer-perimeter',
      recovery: 'continuous',
      counterplay: 'Depart before it arrives; return behind its path.',
      speeds: { measured: 1.8, standard: 2.4, brisk: 3 },
    },
    'frontier-patrol': {
      type: 'contour-patrol',
      domain: 'moving-frontier',
      damageTarget: 'body-and-trail',
      retainsField: false,
      captureResponse: 'rejoin-connected-frontier-without-teleport',
      warning: 'visible-frontier-route',
      action: 'follow-field-reclaimed-boundary',
      recovery: 'safe-route-rejoin',
      counterplay: 'Shape the frontier to move patrol pressure away from your next return.',
      speeds: { measured: 1.8, standard: 2.4, brisk: 3 },
    },
  },
});

// A new authored catalogue adds an existing engine role without rewriting v1.
// Historical projects keep their exact role set and compiled motion values.
export const ROVER_ACTOR_CATALOG = freezeDesign({
  format: 'ActorCatalogV1',
  id: 'journey-actors-v2',
  roles: {
    ...ACTOR_CATALOG.roles,
    'reclaimed-roamer': {
      type: 'claimed-rover',
      domain: 'reclaimed-ground',
      damageTarget: 'body-and-trail-while-active',
      retainsField: false,
      captureResponse: 'warn-then-activate-on-reclaimed-ground',
      warning: '120-actor-ticks-after-full-body-reclamation',
      action: 'reflect-within-reclaimed-ground',
      recovery: 'continuous-domain-reflection',
      counterplay:
        'Keep an escape corridor before enclosing it; the warning gives time to move away. Reclaimed ground still closes cuts but is not universally safe.',
      speeds: { measured: 1.6, standard: 2.2, brisk: 2.8 },
    },
  },
});

export const FRACTURE_ACTOR_CATALOG = freezeDesign({
  format: 'ActorCatalogV1',
  id: 'journey-actors-v3',
  roles: {
    ...ROVER_ACTOR_CATALOG.roles,
    'territory-eroder': {
      type: 'eroder',
      domain: 'unclaimed-field',
      damageTarget: 'body-and-trail',
      retainsField: true,
      captureResponse: 'retains-field-and-can-reopen-earned-frontier',
      warning: '60-actor-ticks-on-a-marked-eligible-cell',
      action: 'pause-then-reopen-one-unprotected-earned-cell',
      recovery: '120-actor-tick-erosion-cooldown',
      counterplay:
        'Use permanent foundations and captured required-objective anchors to protect return routes. Repair valuable gaps; reclaim restores coverage without awarding points again.',
      speeds: { measured: 2.4, standard: 3.2, brisk: 4 },
    },
  },
});

// Opt-in role, not a level-wide replacement of ordinary trail collision.
export const PHASE_ACTOR_CATALOG = freezeDesign({
  format: 'ActorCatalogV1',
  id: 'journey-actors-v4',
  roles: {
    ...FRACTURE_ACTOR_CATALOG.roles,
    'impact-carrier': {
      type: 'bouncer',
      domain: 'unclaimed-field',
      damageTarget: 'body-and-propagating-trail-impact',
      retainsField: true,
      captureResponse: 'remains-in-retained-region; closure-clears-impact-fronts',
      warning: 'distinct-carrier-silhouette-and-visible-moving-impact-fronts',
      action: 'trail-contact-sends-fronts-along-the-live-trail',
      recovery: 'fronts-clear-on-closure-or-life-loss',
      counterplay:
        'Keep a short return route and close before an impact reaches you. Body contact and a hit at the live endpoint remain immediate dangers. Ordinary field keepers still break trails immediately.',
      speeds: { measured: 2.4, standard: 3.2, brisk: 4 },
      impactSpeed: 24,
    },
  },
});

// Stationary lane timing is a cadence, not an invented movement speed. Presets
// do not shorten warnings; existing moving roles retain their speed scaling.
export const LIVEWIRE_ACTOR_CATALOG = freezeDesign({
  format: 'ActorCatalogV1',
  id: 'journey-actors-v5',
  roles: {
    ...PHASE_ACTOR_CATALOG.roles,
    'lane-emitter': {
      type: 'lane-boss',
      domain: 'stationary-unclaimed-field',
      damageTarget: 'exposed-body-and-trail-in-active-lane',
      retainsField: true,
      captureResponse: 'retains-field; reclaimed-ground-shelters-player',
      warning: 'locks-player-row-or-column-before-attack; first-warning-at-2-actor-seconds',
      action: 'warn-then-fire-the-locked-interior-lane',
      recovery: 'rest-until-next-warning; freeze-pauses-actor-clock',
      counterplay:
        'Watch the locked lane, leave it during the warning, and close before it fires. Reclaimed ground shelters the craft from the lane, not from other enemy roles. Enclosure does not silently disable this field-retaining emitter.',
      timings: {
        measured: { warningSeconds: 1.5, activeSeconds: 0.7, period: 6 },
        standard: { warningSeconds: 1.5, activeSeconds: 0.7, period: 5.5 },
        brisk: { warningSeconds: 1.5, activeSeconds: 0.7, period: 5 },
      },
      laneWidth: 1.2,
    },
  },
});

// One shared two-stage cadence. Authored missions choose relay placement/order,
// not shorter warnings, faster physics or an unmarked per-level boss recipe.
export const SENTINEL_RECIPE = freezeDesign({
  id: 'shield-relays-v1',
  definition: {
    version: 'xonix-encounter.v2',
    kind: 'relay-sentinel',
    minReleaseCutCells: 8,
    initialDelayTicks: 240,
    transitionTicks: 180,
    shielded: { warningTicks: 240, activeTicks: 84, restTicks: 396 },
    exposed: { warningTicks: 240, activeTicks: 84, openTicks: 480 },
    laneWidth: 1.2,
  },
});
export const SENTINEL_ACTOR_CATALOG = freezeDesign({
  format: 'ActorCatalogV1',
  id: 'journey-actors-v6',
  roles: {
    ...LIVEWIRE_ACTOR_CATALOG.roles,
    'relay-sentinel': {
      type: 'relay-sentinel',
      domain: 'stationary-unclaimed-field',
      damageTarget: 'body-contact-and-exposed-body-or-trail-in-active-lane',
      retainsField: true,
      captureResponse: 'all-shield-relays-open-explicit-core-release-stage',
      warning: 'locked-horizontal-then-vertical-lanes; 240-actor-tick-warning',
      action: 'shielded-warning-attack-rest; exposed-warning-attack-open',
      recovery: '180-actor-tick-transition; freeze-pauses-clock; captures-persist-after-life-loss',
      counterplay:
        'Capture every marked shield relay in a chosen order. Watch the locked lane and shelter on reclaimed ground. After the vertical attack, close a fresh eight-cell cut during CORE OPEN, or isolate the core and wait on reclaimed ground with no live trail.',
      recipeId: SENTINEL_RECIPE.id,
    },
  },
});

// Add existing, telegraphed engine behaviours without changing earlier catalogues.
const pressureRole = (mode) => ({
  type: 'bouncer',
  domain: 'unclaimed-field',
  damageTarget: 'body-and-trail',
  retainsField: true,
  captureResponse: 'remains-in-retained-region; closure-cancels-commit',
  warning: 'locked-target-and-120-actor-tick-warning',
  action: mode === 'trail-pursuit' ? 'commit-to-observed-trail' : 'commit-to-observed-heading',
  recovery: 'registered-cooldown; topology-change-or-return-cancels-attack',
  counterplay:
    mode === 'trail-pursuit'
      ? 'Close before the committed approach reaches your trail. The marked target locks before the attack; walls and reclaimed ground block sensing.'
      : 'Turn after the heading target locks and take another return. It predicts only your observed direction, not your next turn; close to cancel the attack.',
  speeds: { measured: 2.4, standard: 3.2, brisk: 4 },
  pressureRecipe: {
    mode,
    senseRadius: 18,
    scanTicks: 24,
    warningTicks: 120,
    commitTicks: 180,
    cooldownTicks: 360,
    leadTicks: mode === 'head-intercept' ? 36 : 0,
  },
});
export const PRESSURE_ACTOR_CATALOG = freezeDesign({
  format: 'ActorCatalogV1',
  id: 'journey-actors-v7',
  roles: {
    ...SENTINEL_ACTOR_CATALOG.roles,
    'trail-pursuer': pressureRole('trail-pursuit'),
    'heading-interceptor': pressureRole('head-intercept'),
  },
});

const combatRole = (role) => ({
  type: 'combat-patrol',
  combatRole: role,
  domain: 'unclaimed-field',
  damageTarget: role === 'sentry' ? 'exposed-body-by-projectile-only' : 'none',
  retainsField: false,
  captureResponse: 'removed-by-craft-contact-or-capture; never-retains-field',
  warning: role === 'sentry' ? 'locked-aim-and-180-actor-tick-warning' : 'visible-wandering',
  action: role === 'sentry' ? 'wander-lock-one-shot-recover' : 'wander-with-seeded-turns',
  recovery: 'no-respawn; owner-removal-cancels-projectiles',
  counterplay:
    role === 'sentry'
      ? 'Change route after aim locks, return to ground, or remove the sentry by contact or enclosure. Only its shot harms the craft; ordinary keepers remain dangerous.'
      : 'Choose direct contact or enclose the scout. It never retains a field region and awards no extra score. Ordinary keepers still damage body and trail.',
  speeds: { measured: 1.8, standard: 2.2, brisk: 2.6 },
  combatRecipe: {
    turnTicks: 120,
    ...(role === 'sentry'
      ? {
          senseRadius: 16,
          scanTicks: 30,
          openingTicks: 480,
          warningTicks: 180,
          recoveryTicks: 180,
          restTicks: 1200,
          shotSpeed: 8,
          shotLifeTicks: 360,
        }
      : {}),
  },
});

export const COMBAT_ACTOR_CATALOG = freezeDesign({
  format: 'ActorCatalogV1',
  id: 'journey-actors-v8',
  roles: {
    ...PRESSURE_ACTOR_CATALOG.roles,
    'optional-scout': combatRole('scout'),
    'optional-sentry': combatRole('sentry'),
  },
});

// Current-rules pressure tells match the accepted Pressure Lines cadence without
// rewriting the earlier v7 encounter studies. The authored recovery value is
// intentionally 353 ticks: the registered Standard rest factor (0.85) resolves
// it once to 300 ticks / 2.5 seconds. Gentle and Expert keep their established
// difficulty-specific recovery windows.
const currentPressureRole = (mode) => {
  const role = pressureRole(mode);
  return {
    ...role,
    warning: 'locked-target-and-90-actor-tick-warning',
    pressureRecipe: {
      ...role.pressureRecipe,
      warningTicks: 90,
      commitTicks: 144,
      cooldownTicks: 353,
    },
  };
};
export const CURRENT_PRESSURE_ACTOR_CATALOG = freezeDesign({
  format: 'ActorCatalogV1',
  id: 'journey-actors-v9',
  roles: {
    ...COMBAT_ACTOR_CATALOG.roles,
    'trail-pursuer': currentPressureRole('trail-pursuit'),
    'heading-interceptor': currentPressureRole('head-intercept'),
  },
});

/** Resolved once by authoring; the simulation never applies preset factors. */
export function journeyCombatTiming(
  roleId,
  difficulty = 'standard',
  catalogId = COMBAT_ACTOR_CATALOG.id,
  difficultyCatalogId = DIFFICULTY_CATALOG.id,
) {
  const recipe = journeyActors(catalogId).roles[roleId]?.combatRecipe;
  required(recipe, 'Combat timing needs a registered optional combat actor role.');
  const preset = journeyPreset(difficulty, difficultyCatalogId);
  return {
    ...recipe,
    ...(recipe.restTicks === undefined
      ? {}
      : {
          restTicks: Math.round(recipe.restTicks * (preset.attackRestFactor ?? 1)),
        }),
  };
}

export function journeyPressureTiming(
  roleId,
  difficulty = 'standard',
  catalogId = PRESSURE_ACTOR_CATALOG.id,
  difficultyCatalogId = DIFFICULTY_CATALOG.id,
) {
  const recipe = journeyActors(catalogId).roles[roleId]?.pressureRecipe;
  required(recipe, 'Pressure timing needs a registered pressure actor role.');
  const preset = journeyPreset(difficulty, difficultyCatalogId);
  return {
    ...recipe,
    cooldownTicks: Math.round(recipe.cooldownTicks * (preset.attackRestFactor ?? 1)),
  };
}

export function compileJourneyEncounter(
  source,
  catalogId,
  difficulty = 'standard',
  difficultyCatalogId = DIFFICULTY_CATALOG.id,
) {
  if (source === null) return null;
  const value = boundedJSON(source, { maxBytes: 2048, maxNodes: 16, maxDepth: 3, maxArray: 4 });
  exactKeys(
    value,
    ['recipeId', 'enemyId', 'shieldObjectiveIds', 'coreObjectiveId'],
    'Journey encounter',
  );
  required(
    value.recipeId === SENTINEL_RECIPE.id &&
      journeyActors(catalogId).roles['relay-sentinel']?.recipeId === value.recipeId,
    'Journey encounter needs its registered Sentinel recipe and actor catalog.',
  );
  return {
    ...journeySentinelTiming(difficulty, difficultyCatalogId),
    enemyId: value.enemyId,
    shieldObjectiveIds: value.shieldObjectiveIds,
    coreObjectiveId: value.coreObjectiveId,
  };
}

export function journeyActors(id = ACTOR_CATALOG.id) {
  const catalogs = {
    [ACTOR_CATALOG.id]: ACTOR_CATALOG,
    [ROVER_ACTOR_CATALOG.id]: ROVER_ACTOR_CATALOG,
    [FRACTURE_ACTOR_CATALOG.id]: FRACTURE_ACTOR_CATALOG,
    [PHASE_ACTOR_CATALOG.id]: PHASE_ACTOR_CATALOG,
    [LIVEWIRE_ACTOR_CATALOG.id]: LIVEWIRE_ACTOR_CATALOG,
    [SENTINEL_ACTOR_CATALOG.id]: SENTINEL_ACTOR_CATALOG,
    [PRESSURE_ACTOR_CATALOG.id]: PRESSURE_ACTOR_CATALOG,
    [COMBAT_ACTOR_CATALOG.id]: COMBAT_ACTOR_CATALOG,
    [CURRENT_PRESSURE_ACTOR_CATALOG.id]: CURRENT_PRESSURE_ACTOR_CATALOG,
  };
  required(Object.hasOwn(catalogs, id), 'Project must pin a registered actor catalog.');
  return catalogs[id];
}

export function journeyPreset(id = 'standard', catalogId = DIFFICULTY_CATALOG.id) {
  const catalog = journeyDifficultyCatalog(catalogId);
  required(Object.hasOwn(catalog.presets, id), 'Unsupported Journey difficulty.');
  return catalog.presets[id];
}

export function compileActor(
  source,
  difficulty = 'standard',
  catalogId = ACTOR_CATALOG.id,
  difficultyCatalogId = DIFFICULTY_CATALOG.id,
) {
  const actor = boundedJSON(source, { maxBytes: 4096, maxNodes: 64, maxDepth: 5, maxArray: 2 });
  const catalog = journeyActors(catalogId);
  const role = catalog.roles[actor.role];
  required(Object.hasOwn(catalog.roles, actor.role), 'Unsupported actor role.');
  const preset = journeyPreset(difficulty, difficultyCatalogId);
  if (role.type === 'relay-sentinel') {
    exactKeys(actor, ['id', 'role', 'tier', 'x', 'y'], 'actor');
    required(actor.tier === 'measured', 'Sentinel uses the shared measured cadence.');
    return { id: actor.id, type: role.type, x: actor.x, y: actor.y };
  }
  if (role.type === 'lane-boss') {
    exactKeys(actor, ['id', 'role', 'tier', 'x', 'y', 'axis'], 'actor');
    required(Object.hasOwn(role.timings, actor.tier), 'Unsupported actor cadence tier.');
    required(['horizontal', 'vertical'].includes(actor.axis), 'Lane axis must be explicit.');
    return {
      id: actor.id,
      type: role.type,
      x: actor.x,
      y: actor.y,
      axis: actor.axis,
      ...journeyLaneTiming(role.timings[actor.tier], difficulty, difficultyCatalogId),
      laneWidth: role.laneWidth,
    };
  }
  required(Object.hasOwn(role.speeds, actor.tier), 'Unsupported actor speed tier.');
  const speed = role.speeds[actor.tier] * preset.enemySpeedFactor;
  if (['bouncer', 'claimed-rover', 'eroder', 'combat-patrol'].includes(role.type)) {
    exactKeys(actor, ['id', 'role', 'tier', 'x', 'y', 'heading'], 'actor');
    required(
      Array.isArray(actor.heading) &&
        actor.heading.length === 2 &&
        actor.heading.every((n) => Number.isInteger(n) && n >= -1 && n <= 1) &&
        actor.heading.some((n) => n !== 0),
      'Actor heading must be a nonzero eight-way direction.',
    );
    const magnitude = Math.hypot(...actor.heading);
    if (role.combatRole)
      return {
        id: actor.id,
        role: role.combatRole,
        x: actor.x,
        y: actor.y,
        headingX: actor.heading[0],
        headingY: actor.heading[1],
        speed,
        ...journeyCombatTiming(actor.role, difficulty, catalogId, difficultyCatalogId),
      };
    return {
      id: actor.id,
      type: role.type,
      x: actor.x,
      y: actor.y,
      vx: (actor.heading[0] * speed) / magnitude,
      vy: (actor.heading[1] * speed) / magnitude,
    };
  }
  exactKeys(
    actor,
    ['id', 'role', 'tier', 'clockwise', ...(role.type === 'border-patrol' ? ['x', 'y'] : ['edge'])],
    'actor',
  );
  required(typeof actor.clockwise === 'boolean', 'Patrol direction must be explicit.');
  return {
    id: actor.id,
    type: role.type,
    speed,
    clockwise: actor.clockwise,
    ...(role.type === 'border-patrol' ? { x: actor.x, y: actor.y } : { edge: actor.edge }),
  };
}
