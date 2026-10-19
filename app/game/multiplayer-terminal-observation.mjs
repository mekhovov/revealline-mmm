/** A deliberately narrower, exact terminal contract. This is not a resumable
 * checkpoint: continuous positions, velocities and second-based clocks remain
 * exclusively in the raw native-state digest. No number is rounded or tolerated.
 * Changing the observations below requires a successor contract version. */
export const LOCAL_TERMINAL_OBSERVATIONS = 'revealline-capture-terminal-observations.v1';
export const EXPEDITION_TERMINAL_OBSERVATIONS = 'revealline-capture-terminal-observations.v2';
export const localTerminalObservationContract = (mode, state) =>
  mode === 'team' && state.ruleset === 'revealline-coop.v17'
    ? EXPEDITION_TERMINAL_OBSERVATIONS
    : LOCAL_TERMINAL_OBSERVATIONS;

// Deliberately pinned here, not collected from the engine's evolving registry.
// A new native generation needs an explicit observation-contract review.
const supportedRulesets = Object.freeze({
  versus: Object.freeze([
    'xonix-core.v2',
    'xonix-core.v3',
    'xonix-core.v4',
    'xonix-core.v5',
    'xonix-core.v6',
    'xonix-core.v7',
    'xonix-core.v8',
    'xonix-core.v9',
    'xonix-core.v10',
    'xonix-core.v11',
    'xonix-core.v12',
    'xonix-core.v13',
    'xonix-core.v14',
    'xonix-core.v15',
    'xonix-core.v16',
  ]),
  team: Object.freeze([
    'revealline-coop.v3',
    'revealline-coop.v4',
    'revealline-coop.v5',
    'revealline-coop.v6',
    'revealline-coop.v7',
    'revealline-coop.v8',
    'revealline-coop.v9',
    'revealline-coop.v10',
    'revealline-coop.v11',
    'revealline-coop.v12',
    'revealline-coop.v13',
    'revealline-coop.v14',
    'revealline-coop.v15',
    'revealline-coop.v16',
    'revealline-coop.v17',
  ]),
});

export function assertLocalTerminalObservationSupport(mode, state) {
  if (!Object.hasOwn(supportedRulesets, mode) || !supportedRulesets[mode].includes(state.ruleset))
    throw new TypeError('Native ruleset is not supported by the terminal observation contract.');
  if (
    mode === 'versus' &&
    (state.runs.length !== 2 || state.runs.some((run) => run.ruleset !== state.ruleset))
  )
    throw new TypeError('Both recorded boards must use the accepted observation ruleset.');
}

const pick = (value, keys) =>
  value == null
    ? null
    : Object.fromEntries(
        keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]]),
      );
const cells = (value) => (value == null ? null : Array.from(value));
const trail = (value) =>
  (value ?? []).map((cell) => (typeof cell === 'number' ? cell : cell.index));
const rows = (value, keys) => (value ?? []).map((item) => pick(item, keys));
const pursuit = (value) =>
  pick(value, [
    'behavior',
    'cursor',
    'partnerId',
    'partnerLost',
    'phase',
    'heading',
    'nextHeading',
    'nextDecisionTick',
    'restUntil',
    'phaseUntil',
    'committedUntil',
  ]);
const combat = (value) =>
  value == null
    ? null
    : {
        ...pick(value, ['version', 'actorTick', 'nextShotId']),
        actors: (value.actors ?? []).map((actor) => ({
          ...pick(actor, [
            'id',
            'role',
            'alive',
            'random',
            'phase',
            'nextTurnTick',
            'nextScanTick',
            'warningUntil',
            'recoveryUntil',
            'targetPlayer',
          ]),
          pursuit: pursuit(actor.pursuit),
        })),
        projectiles: rows(value.projectiles, ['id', 'actorId', 'expiresAtTick']),
        eliminations: rows(value.eliminations, ['id', 'cause', 'tick', 'players']),
      };
const hunt = (value) => pick(value, ['version', 'kills', 'touchKills', 'captureKills', 'score']);
const snake = (value) =>
  value == null
    ? null
    : {
        ...pick(value, [
          'version',
          'catches',
          'caughtIds',
          'chain',
          'bestChain',
          'bonusScore',
          'lastCatchTick',
          'orderIndex',
        ]),
        // Capture-Snake length and points are continuous, capacity is authored growth.
        bodies: rows(value.bodies, ['playerId', 'capacity', 'heading']),
      };
const bonuses = (value) =>
  value == null
    ? null
    : {
        ...pick(value, ['version', 'clock']),
        schedules: rows(value.schedules, [
          'id',
          'phase',
          'deadline',
          'currentAnchor',
          'previousAnchor',
          'appearances',
          'collections',
        ]),
      };
const topology = (run) => ({
  width: run.width,
  height: run.height,
  cells: cells(run.cells),
  terrain: cells(run.terrain ?? run.classic?.terrain),
  permanent: cells(run.foundation?.permanent),
  eligible: cells(run.classic?.eligible),
  everClaimed: cells(run.classic?.everClaimed),
  coverageEligible: cells(run.classic?.coverageEligible),
});
const enemies = (value) =>
  (value ?? []).map((enemy) => ({
    ...pick(enemy, ['id', 'type', 'active', 'phase', 'bossPhase', 'target']),
    classic: pick(enemy.classic, [
      'mode',
      'activationTick',
      'target',
      'erosionAt',
      'cooldownUntil',
      'edgeId',
      'pathIndex',
      'topologyRevision',
    ]),
    pressure: pick(enemy.classic?.pressure, [
      'version',
      'phase',
      'nextScanTick',
      'warningUntil',
      'commitUntil',
      'cooldownUntil',
      'pathIndex',
      'topologyRevision',
      'aborted',
    ]),
  }));

function soloBoard(run) {
  const owner = run.classic ?? run.runningEnemies;
  return {
    ...pick(run, [
      'ruleset',
      'levelId',
      'revision',
      'seed',
      'tick',
      'status',
      'failureCause',
      'lives',
      'score',
      'claimedCount',
      'totalClaimable',
      'medal',
      'classId',
      'activeClassId',
      'classHistory',
      '_input',
      '_abilitySerial',
      '_terminalEmitted',
    ]),
    topology: topology(run),
    player: pick(run.player, ['direction', 'queuedDirection', 'cutting']),
    loadouts: Object.fromEntries(
      Object.entries(run._loadouts).map(([id, ability]) => [
        id,
        pick(ability, ['kind', 'ammo', 'capacity']),
      ]),
    ),
    trail: trail(run.trail),
    objectives: rows(run.objectives, ['id', 'captured', 'revealed', 'required']),
    encounter: pick(run.encounter, [
      'version',
      'kind',
      'stage',
      'phase',
      'phaseStartTick',
      'phaseEndTick',
      'axis',
      'lane',
      'cycle',
      'defeated',
      'transitionTick',
      'defeatTick',
      'defeatCause',
      'qualifyingCutCells',
    ]),
    relay:
      run.relay == null
        ? null
        : {
            version: run.relay.version,
            gates: rows(run.relay.gates, ['id', 'objectiveId', 'cells', 'openedTick']),
          },
    classic: pick(run.classic, [
      'uniqueClaimedCount',
      'livesLost',
      'actorTick',
      'topologyRevision',
      'effects',
    ]),
    powerups: rows(run.classic?.powerups, ['id', 'kind', 'collectedTick']),
    timedBonuses: bonuses(run.classic?.timedBonuses),
    enemies: enemies(run.enemies),
    hunt: hunt(owner?.hunt),
    combat: combat(owner?.combatPatrols),
    snake: snake(run.snake),
  };
}

function teamBoard(run) {
  return {
    ...pick(run, [
      'ruleset',
      'seed',
      'tick',
      'status',
      'difficulty',
      'config',
      'claimedCount',
      'totalClaimable',
      'huntDowns',
      'headsTouching',
      'needsNeutral',
      'nextImpactId',
    ]),
    topology: topology(run),
    team: pick(run.team, ['reserves', 'captureCredits', 'interceptions', 'jointCuts', 'rescues']),
    players: run.players.map((player) => ({
      ...pick(player, [
        'id',
        'cellIndex',
        'direction',
        'status',
        'cutting',
        'blockedDirection',
        'departureIndex',
        'downedClaimedAt',
        'supportRole',
        'rescueBlocked',
        'cutId',
        'nextCutId',
        'impactSources',
      ]),
      trail: trail(player.trail),
      support: pick(player.support, ['held', 'uses', 'intercepts', 'slows']),
      rescue: pick(player.rescue, ['target']),
    })),
    strongholds: run.strongholds.map((item) => ({
      ...pick(item, ['id', 'shielded', 'defeated']),
      anchors: rows(item.anchors, ['id', 'captured']),
      emitter: pick(item.emitter, ['phase', 'target', 'cellIndex']),
    })),
    impacts: rows(run.impacts, [
      'id',
      'version',
      'owner',
      'source',
      'player',
      'cutId',
      'direction',
      'cellIndex',
    ]),
    enemies: enemies(run.enemies),
    hunt: hunt(run.hunt),
    combat: combat(run.combatPatrols),
    snake: snake(run.snake),
    powerups: rows(run.bonuses?.items, ['id', 'kind', 'collectedTick']),
    timedBonuses: bonuses(run.bonuses?.timed),
    effects: run.bonuses?.effects ?? null,
    ...(run.environment
      ? {
          environment: {
            ...pick(run.environment, ['version', 'stage', 'patrolTick']),
            protected: cells(run.environment.protected),
            relays: rows(run.environment.relays, ['id', 'open']),
            emitters: rows(run.environment.emitters, [
              'id',
              'phase',
              'until',
              'target',
              'line',
              'cutId',
              'disabled',
            ]),
            erosion: rows(run.environment.erosion, ['id', 'until', 'warning', 'disabled']),
            patrols: rows(run.environment.patrols, ['id', 'offset', 'clockwise']),
          },
        }
      : {}),
  };
}

/** Called only on owned native state, never on uploaded actor positions. Exact
 * arrays preserve board/seat/actor order. Recipe/source pins are hashed separately. */
export function localTerminalObservations(mode, state) {
  assertLocalTerminalObservationSupport(mode, state);
  return {
    contract: localTerminalObservationContract(mode, state),
    mode,
    ...(mode === 'versus'
      ? {
          ...pick(state, [
            'protocol',
            'ruleset',
            'tick',
            'limitTicks',
            'status',
            'winner',
            'reason',
          ]),
          boards: state.runs.map(soloBoard),
        }
      : { board: teamBoard(state) }),
  };
}
