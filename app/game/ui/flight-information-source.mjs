import { t } from '../i18n/index.mjs';
import { EPS } from '../core/geometry.mjs';
import { isClassicRuleset } from '../core/versions.mjs';
import { classicEffectActive } from '../core/classic-state.mjs';
import { foundationCompatibleView as classicView } from './foundation-view.mjs';
import { encounterView } from './encounter-view.mjs';
import { combatView } from './combat-view.mjs';

const ordinaryEvents = new Set([
  'class.switched',
  'class.rejected',
  'cells.claimed',
  'cut.closed',
  'objective.captured',
  'relay.opened',
  'ability.rejected',
  'ability.used',
  'craft.redeployed',
  'pickup.collected',
  'capture.stopped',
  'powerup.collected',
  'bonus.announced',
  'bonus.appeared',
  'bonus.expired',
  'bonus.cancelled',
  'cells.eroded',
  'rover.activationCancelled',
  'erosion.blocked',
  'contour.routeChanged',
  'player.respawned',
  'run.completed',
  'lineImpact.cleared',
  'lineImpact.ended',
  'signal.changed',
  'pressure.cancelled',
  'pressure.cooldown',
  'encounter.stageChanged',
  'encounter.phaseChanged',
  'encounter.defeated',
  'combat.cancelled',
  'combat.eliminated',
  'combat.expired',
  'combat.projectileRemoved',
  'combat.shotSkipped',
]);
const criticalEvents = new Set([
  'cut.started',
  'player.failed',
  'lineImpact.seeded',
  'lineImpact.arrived',
  'shield.absorbed',
  'rover.warning',
  'rover.activated',
  'erosion.warning',
  'boss.warning',
  'pressure.warning',
  'pressure.committed',
  'combat.locked',
  'combat.fired',
  'combat.impact',
]);
const statuses = new Set(['running', 'respawning', 'won', 'lost']);
const rulesets = new Set([
  'xonix-core.v2',
  'xonix-core.v3',
  'xonix-core.v4',
  'xonix-core.v5',
  'xonix-core.v6',
  'xonix-core.v7',
  'xonix-core.v8',
  'xonix-core.v9',
]);
const finite = (value) => Number.isFinite(value) && value >= 0;
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const check = (condition, message) => {
  if (!condition) throw new TypeError(message);
};
const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

/** Event urgency is historical metadata, never a claim about current field safety. */
export function flightEventKind(type) {
  return criticalEvents.has(type) ? 'critical' : ordinaryEvents.has(type) ? 'ordinary' : 'unknown';
}

/**
 * Read an accepted engine run. Reuse the existing display projections unchanged and
 * expose missing lane facts separately; do not parse their English captions.
 * No DOM, wall clock, simulation mutation, arbitration or layout qualification.
 */
export function flightInformationSnapshot(run, { started, paused }) {
  check(run && typeof run === 'object', t('interface:anAcceptedRunIsRequired'));
  check(
    typeof started === 'boolean' && typeof paused === 'boolean',
    t('interface:hostStateIsRequired'),
  );
  const issues = [];
  const classicExpected = isClassicRuleset(run.ruleset);
  const encounterExpected = Boolean(run.level?.encounter);
  const classic = classicView(run);
  // This richer geometry projection belongs to paused reading. Live event
  // capture does not need another board/actor validation on every fixed step.
  const combat = paused ? combatView(run) : null;
  if (combat?.valid === false) issues.push('combat-projection');
  let encounter = null;
  try {
    encounter = encounterView(run);
  } catch {
    issues.push('encounter-projection');
  }
  if (!rulesets.has(run.ruleset)) issues.push('ruleset');
  if (!statuses.has(run.status)) issues.push('status');
  if (!finite(run.time) || !integer(run.tick)) issues.push('simulation-clock');
  if (classicExpected && !classic) issues.push('classic-projection');
  if (Boolean(run.classic) !== classicExpected) issues.push('classic-capability');
  if (encounterExpected !== Boolean(run.encounter) || (encounterExpected && !encounter))
    issues.push('encounter-capability');
  const player = { cutting: run.player?.cutting, speed: run.player?.speed };
  if (typeof player.cutting !== 'boolean' || !finite(player.speed)) issues.push('player');
  let objectives = null;
  if (
    Array.isArray(run.objectives) &&
    run.objectives.every(
      (objective) =>
        objective &&
        typeof objective.required === 'boolean' &&
        typeof objective.captured === 'boolean',
    )
  ) {
    const required = run.objectives.filter((objective) => objective.required);
    objectives = {
      done: required.filter((objective) => objective.captured).length,
      total: required.length,
    };
  } else issues.push('objectives');

  // A missing Classic projection must not turn suppression into a false "safe" fact.
  const frozen = classicExpected && !classic ? null : classicEffectActive(run, 'enemy-freeze');
  const clock = classicExpected ? run.classic?.actorTime : run.time;
  const clockKind = classicExpected ? 'actor-seconds' : 'simulation-seconds';
  const laneBosses = [];
  if (!Array.isArray(run.enemies)) issues.push('enemies');
  else
    for (const enemy of run.enemies) {
      if (enemy.type !== 'lane-boss') continue;
      const phase = enemy.bossPhase;
      const deadline = {
        warning: enemy.warningUntil,
        active: enemy.activeUntil,
        idle: enemy.nextWarningAt,
      }[phase];
      if (
        typeof enemy.id !== 'string' ||
        !enemy.id ||
        !['warning', 'active', 'idle'].includes(phase) ||
        !['horizontal', 'vertical'].includes(enemy.axis) ||
        !finite(enemy.lane) ||
        !finite(deadline) ||
        !finite(clock) ||
        !finite(enemy.stunnedUntil) ||
        frozen === null
      ) {
        issues.push(`lane-boss:${enemy.id ?? 'unknown'}`);
        continue;
      }
      const stunned = enemy.stunnedUntil > run.time + EPS;
      laneBosses.push({
        id: enemy.id,
        phase,
        axis: enemy.axis,
        lane: enemy.lane,
        laneWidth: enemy.laneWidth ?? 1.2,
        seconds: ['won', 'lost'].includes(run.status) ? 0 : Math.max(0, deadline - clock),
        clock: clockKind,
        clockFrozen: frozen,
        frozen,
        stunned,
        suppressed: frozen || stunned,
      });
    }
  let encounterLane = null;
  if (encounter && run.encounter) {
    const e = run.encounter;
    if (
      !finite(encounter.seconds) ||
      (!e.defeated && !integer(e.phaseEndTick)) ||
      (classicExpected && !integer(run.classic?.actorTick))
    )
      issues.push('encounter-clock');
    const marked = ['warning', 'active'].includes(e.phase);
    if (marked && (!['horizontal', 'vertical'].includes(e.axis) || !finite(e.lane)))
      issues.push('encounter-lane');
    else
      encounterLane = {
        id: run.level.encounter.enemyId,
        axis: e.axis,
        lane: e.lane,
        laneWidth: run.level.encounter.laneWidth,
        marked,
        clock: classicExpected ? 'actor-ticks' : 'simulation-ticks',
        clockFrozen: frozen,
        suppressed: encounter.suppressed,
      };
  }
  return freeze({
    status: run.status,
    started,
    paused,
    tick: run.tick,
    time: run.time,
    player,
    objectives,
    classicExpected,
    encounterExpected,
    classic,
    ...(combat === null ? {} : { combat }),
    encounter,
    laneBosses,
    encounterLane,
    issues,
  });
}

/**
 * Capture one complete eventFeedback call after its existing warning calls.
 * Messages are observations of those calls, in order, with their original expiry.
 * Conditional/silent events may have no message. Never reconstruct or rewrite copy.
 * Owner + sequence are host-issued tokens; later async acceptance must compare them.
 */
export function flightInformationBatch({ owner, sequence, events, messages }) {
  check(
    typeof owner?.attempt === 'string' && owner.attempt.length > 0 && integer(owner.generation),
    t('interface:anAcceptedAttemptAndPresentationGenerationAreRequired'),
  );
  check(integer(sequence), t('interface:aHostFeedbackSequenceIsRequired'));
  check(
    Array.isArray(events) && Array.isArray(messages),
    t('interface:aCompleteEventBatchIsRequired'),
  );
  const facts = events.map((event, index) => {
    check(
      event &&
        typeof event.type === 'string' &&
        event.type.length > 0 &&
        integer(event.tick) &&
        finite(event.time),
      t('interface:typedEngineEventIdentityAndClockAreRequired'),
    );
    return {
      index,
      type: event.type,
      kind: flightEventKind(event.type),
      tick: event.tick,
      time: event.time,
      event: structuredClone(event),
      sourceId:
        typeof event.id === 'string'
          ? event.id
          : typeof event.actorId === 'string'
            ? event.actorId
            : null,
    };
  });
  let previous = -1;
  const captions = messages.map((message) => {
    check(
      integer(message.eventIndex) &&
        message.eventIndex < facts.length &&
        message.eventIndex >= previous,
      t('interface:warningObservationsMustFollowTheirSourceEventOrder'),
    );
    check(
      typeof message.fullText === 'string' &&
        (message.cue === null || typeof message.cue === 'string') &&
        finite(message.expiresAt),
      t('interface:retainTheCompleteWarningTextCueAndSimulationExpiry'),
    );
    previous = message.eventIndex;
    const fact = facts[message.eventIndex];
    return { ...fact, fullText: message.fullText, cue: message.cue, expiresAt: message.expiresAt };
  });
  return freeze({
    owner: { attempt: owner.attempt, generation: owner.generation },
    sequence,
    events: facts,
    messages: captions,
    lastCaption: captions.at(-1) ?? null,
    unknownEvents: facts.filter((event) => event.kind === 'unknown'),
  });
}
