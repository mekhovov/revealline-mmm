import { dataIdentity } from '../data-json.mjs';
import { compileContentProject, resolveMission } from './project.mjs';
import { PRESSURE_DIFFICULTY_CATALOG, freezeDesign } from './catalogs.mjs';
import {
  applyGameplayTuning,
  resolveGameplayTuning,
  gameplayTuningDescription,
} from '../gameplay-tuning.mjs';

/** Read-only projection through the same adapter used for fresh Solo, Versus and
 * Team attempts. Authored previews and historical replay recipes stay separate. */
export function inspectEffectiveGameplay(
  source,
  missionId,
  { difficulty = 'standard', mode = 'solo', overrides = {} } = {},
) {
  const project = compileContentProject(source);
  const manifest = resolveMission(project, missionId, { difficulty, mode });
  const mission = project.missions.find((item) => item.id === missionId);
  const recipe = resolveGameplayTuning(difficulty, overrides);
  const level = applyGameplayTuning(manifest.level, recipe);
  const keeperType = mode === 'team' ? 'drifter' : 'bouncer';
  const authoredIds = new Set(mission.actors.map((actor) => actor.id));
  const authoredKeepers = manifest.level.enemies.filter(
    (actor) => actor.type === keeperType && Math.hypot(actor.vx, actor.vy) > 0,
  ).length;
  const additions = level.enemies.filter((actor) => !authoredIds.has(actor.id));
  const requestedAdditions = Math.ceil(authoredKeepers * recipe.enemyDensity);
  const combat = level.classic?.combatPatrols;
  const actors = [...level.enemies, ...(combat?.actors ?? [])].map((actor) => {
    const authored = mission.actors.find((item) => item.id === actor.id);
    const role =
      authored?.role ??
      (level.classic?.lineImpact?.actorIds?.includes(actor.id) ? 'impact-carrier' : 'field-keeper');
    const definition = project.actors.roles[role];
    const optional = combat?.actors.some((item) => item.id === actor.id) ?? false;
    const speed = actor.speed ?? Math.hypot(actor.vx ?? 0, actor.vy ?? 0);
    return {
      id: actor.id,
      role,
      authoredTier: authored?.tier ?? null,
      origin: authored ? 'authored' : 'density-addition',
      domain: definition.domain,
      retainsField: definition.retainsField,
      enabled: optional ? combat.enabled : true,
      speed,
      speedRelativeToCraft: speed / level.rules.moveSpeed,
      ...(optional ? { activeSpeed: combat.enabled ? speed : 0 } : {}),
      runtime: actor,
    };
  });
  const warnings = [
    {
      code: 'projection-not-balance-evidence',
      message:
        'Fresh-attempt values before temporary bonuses, terrain and actor activation. This is not a playtest or a prediction of capture outcomes. Studio Play retains its authored preview rules.',
    },
  ];
  if (recipe.adminOverride)
    warnings.push({
      code: 'admin-playtest-no-awards',
      message: 'Non-default admin settings describe a playtest and earn no normal awards.',
    });
  if (additions.length < requestedAdditions)
    warnings.push({
      code: 'density-target-not-reached',
      message: `Added ${additions.length} of ${requestedAdditions} requested field keepers. Runtime population limits, spawn clearance and retained-region restrictions still apply.`,
    });
  if (mode !== 'team' && level.encounter && recipe.enemyDensity > 0)
    warnings.push({
      code: 'encounter-roster-preserved',
      message:
        'The boss encounter preserves its authored field-retention contract; density adds no enemies.',
    });
  return freezeDesign({
    format: 'EffectiveJourneyGameplayV1',
    label: 'Current gameplay · fresh attempt',
    sourceSimulationIdentity: manifest.simulationIdentity,
    identityScope: 'fresh-attempt-level-input-not-live-state',
    runtimeLevelIdentity: dataIdentity(level),
    runtimeVersion: level.version,
    runtimeRevision: level.revision,
    mode,
    difficulty,
    recipe,
    description: gameplayTuningDescription(recipe),
    speedUnits: 'cells-per-second-before-temporary-effects',
    playerSpeed: level.rules.moveSpeed,
    lives: level.rules.lives ?? project.difficulty.presets[difficulty].lives,
    rules: level.rules,
    actors,
    population: {
      authoredEnemies: manifest.level.enemies.length,
      actualEnemies: level.enemies.length,
      fieldKeepers: level.enemies.filter((actor) => actor.type === keeperType).length,
      requestedAdditionalKeepers: requestedAdditions,
      addedKeepers: additions.length,
      authoredOptionalActors: combat?.actors.length ?? 0,
      enabledOptionalActors: combat?.enabled ? combat.actors.length : 0,
    },
    encounter: level.encounter ?? null,
    lineImpact: (mode === 'team' ? level.lineImpact : level.classic?.lineImpact) ?? null,
    supportRoles: level.supportRoles ?? null,
    enemyPressure: level.classic?.enemyPressure ?? null,
    warnings,
    validation: 'runtime-projection-not-balance-qualified',
  });
}

/** Copy-on-write pressure edition. No enrollment, migration or implied balance
 * approval. Stable content IDs preserve navigation; revised execution identities
 * prevent a suspended old flight from impersonating the successor. */
export function withPressureDifficulty(source) {
  const owned = compileContentProject(source).source;
  if (owned.difficultyCatalogId === PRESSURE_DIFFICULTY_CATALOG.id) return structuredClone(owned);
  const next = structuredClone(owned);
  const token = dataIdentity({ source: owned, difficulty: PRESSURE_DIFFICULTY_CATALOG });
  next.revision = `pressure-v2-${token}`;
  next.difficultyCatalogId = PRESSURE_DIFFICULTY_CATALOG.id;
  for (const key of ['missions', 'campaigns', 'packs'])
    for (const item of next[key])
      item.revision = `pressure-v2-${dataIdentity({ token, id: item.id, revision: item.revision })}`;
  // Eager compilation validates every supported mode and preset before returning
  // any candidate. Maps and immutable assets are shared by reference identity only.
  return structuredClone(compileContentProject(next).source);
}

/** Exact authored/compiled facts, not a prediction of moving capture outcomes or
 * a measured human difficulty rating. Used by tools without alternate physics. */
export function inspectPressureDifficulty(source, { overrides = {} } = {}) {
  const project = compileContentProject(source);
  const rows = [];
  for (const mission of project.missions)
    for (const mode of mission.modes)
      for (const difficulty of Object.keys(project.difficulty.presets)) {
        const manifest = resolveMission(project, mission.id, { mode, difficulty });
        const { level } = manifest;
        rows.push({
          missionId: mission.id,
          missionRevision: mission.revision,
          name: mission.name,
          mode,
          difficulty,
          difficultyCatalogId: project.difficulty.id,
          simulationIdentity: manifest.simulationIdentity,
          design: mission.design,
          playerSpeed: level.rules.moveSpeed,
          lives: level.rules.lives ?? project.difficulty.presets[difficulty].lives,
          coverage: mission.coverage,
          countdownSeconds: level.rules.timeLimitSeconds ?? 0,
          actors: mission.actors.map((sourceActor) => {
            const optional = level.classic?.combatPatrols?.actors.find(
              (item) => item.id === sourceActor.id,
            );
            const actor = optional ?? level.enemies.find((item) => item.id === sourceActor.id);
            const speed = actor.speed ?? Math.hypot(actor.vx ?? 0, actor.vy ?? 0);
            return {
              id: actor.id,
              role: sourceActor.role,
              tier: sourceActor.tier,
              domain: project.actors.roles[sourceActor.role].domain,
              retainsField: project.actors.roles[sourceActor.role].retainsField,
              speed,
              speedRelativeToCraft: speed / level.rules.moveSpeed,
              ...(optional
                ? {
                    combatEnabled: level.classic.combatPatrols.enabled,
                    activeSpeed: level.classic.combatPatrols.enabled ? speed : 0,
                    combatTiming: Object.fromEntries(
                      Object.entries(optional).filter(([key]) =>
                        [
                          'turnTicks',
                          'senseRadius',
                          'scanTicks',
                          'openingTicks',
                          'warningTicks',
                          'recoveryTicks',
                          'restTicks',
                          'shotSpeed',
                          'shotLifeTicks',
                        ].includes(key),
                      ),
                    ),
                  }
                : {}),
              ...(level.classic?.enemyPressure?.actors.some((entry) => entry.id === actor.id)
                ? {
                    pressureTiming: level.classic.enemyPressure.actors.find(
                      (entry) => entry.id === actor.id,
                    ),
                  }
                : {}),
              laneTiming:
                actor.type === 'lane-boss'
                  ? {
                      warningSeconds: actor.warningSeconds,
                      activeSeconds: actor.activeSeconds,
                      period: actor.period,
                    }
                  : null,
            };
          }),
          encounter: level.encounter ?? null,
          topologyDiagnostics: manifest.topology.diagnostics,
          validation: 'compiled-candidate-not-balance-qualified',
          effectiveGameplay: inspectEffectiveGameplay(project, mission.id, {
            mode,
            difficulty,
            overrides,
          }),
        });
      }
  return freezeDesign({
    format: 'JourneyPressureAuditV1',
    projectId: project.source.id,
    projectRevision: project.source.revision,
    missionCount: project.missions.length,
    rows,
    pending: [
      'first-safe-return-and-enemy-exposure',
      'spawn-pressure-and-alternate-routes',
      'bonus-independent-clear-and-replay',
      'quota-cleanup-and-campaign-boundary-pacing',
      'native-readability-and-human-balance',
    ],
  });
}

/** Authored erosion evidence only. This intentionally does not simulate a live
 * route or label a mission balanced: Studio/CI can reject missing foundations,
 * decisions or mechanic records while human play still owns usefulness. */
export function inspectErosionCounterplay(source) {
  const project = compileContentProject(source);
  const rows = project.missions
    .filter((mission) => mission.actors.some((actor) => actor.role === 'territory-eroder'))
    .map((mission) => {
      const map = project.maps.find(
        (candidate) =>
          candidate.source.id === mission.map.id &&
          candidate.source.revision === mission.map.revision,
      );
      const permanentReturnCount =
        (map.source.foundations?.length ?? 0) + (map.source.gates?.length ?? 0);
      const explicitRouteChoice = /\bor\b/i.test(mission.design.routeDecision);
      const escapeEvidence = /return|reserve|foundation|connector|circuit|landing|route/i.test(
        [
          mission.design.routeDecision,
          mission.design.counterplay,
          mission.design.captureConsequence,
        ].join(' '),
      );
      const recordsErosion = [...mission.design.introduces, ...mission.design.practices].includes(
        'territory-erosion',
      );
      return {
        missionId: mission.id,
        missionRevision: mission.revision,
        name: mission.name,
        coverage: mission.coverage,
        eroderIds: mission.actors
          .filter((actor) => actor.role === 'territory-eroder')
          .map((actor) => actor.id),
        permanentReturnCount,
        requiredCaptureObjectiveIds: mission.objectives
          .filter((objective) => objective.required)
          .map((objective) => objective.id),
        explicitRouteChoice,
        escapeEvidence,
        recordsErosion,
        authoredSignalsPresent:
          permanentReturnCount > 0 &&
          explicitRouteChoice &&
          escapeEvidence &&
          recordsErosion &&
          mission.coverage <= 0.85,
        validation: 'authored-signals-only-human-route-review-pending',
      };
    });
  return freezeDesign({
    format: 'JourneyErosionCounterplayAuditV1',
    projectId: project.source.id,
    projectRevision: project.source.revision,
    missionCount: rows.length,
    rows,
    pending: [
      'repair-versus-escape-route-usefulness',
      'ordinary-clear-without-prolonged-cleanup',
      'warning-readability-and-voluntary-retry',
    ],
  });
}
