import { t, render, onLocaleChange, localizedMessage, formatNumber } from '../i18n/index.mjs';
import { encounterCopy } from './encounter-copy.mjs';
import { FIXED_DT } from '../core/registry.mjs';

const roleName = (type) => {
  const names = {
    bouncer: 'bouncer',
    'border-patrol': 'borderPatrol',
    'contour-patrol': 'contourPatrol',
    'claimed-rover': 'claimedRover',
    eroder: 'eroder',
    'lane-boss': 'laneBoss',
    'relay-sentinel': 'relaySentinel',
  };
  return names[type]
    ? t(`interface:flightDetails.roles.${names[type]}`)
    : t('interface:unfamiliarEnemy');
};
const bonusName = (item) =>
  ({
    'extra-life': () => t('interface:life'),
    'player-speed': () => t('interface:speed'),
    'enemy-slow': () => t('interface:enemiesSlow'),
    'enemy-freeze': () => t('interface:enemiesFrozen'),
  })[item.kind]?.() || item.label;
const encounterText = (view) => (view.copyFacts ? encounterCopy(view.copyFacts) : view);
const laneDirection = (axis) =>
  axis === 'horizontal'
    ? t('interface:flightDetails.horizontal')
    : t('interface:flightDetails.vertical');
const fieldSummary = (classic) => {
  if (!Array.isArray(classic.terrain))
    return classic.summary || t('interface:noClassicFieldSummary');
  const roles = new Map();
  for (const enemy of classic.enemies) {
    const role = enemy.impactCarrier ? 'impact-carrier' : enemy.type;
    roles.set(role, (roles.get(role) || 0) + 1);
  }
  return (
    [
      ...[...roles].map(
        ([type, count]) =>
          `${count} × ${type === 'impact-carrier' ? t('interface:trailImpactCarrier') : roleName(type)}`,
      ),
      ...(classic.terrain.some((cell) => cell.kind === 'slow')
        ? [t('interface:flightDetails.terrainSlow')]
        : []),
      ...(classic.terrain.some((cell) => cell.kind === 'lethal')
        ? [t('interface:flightDetails.terrainLethal')]
        : []),
      ...(classic.powerups.length
        ? [t('interface:flightDetails.contactPickups', { count: classic.powerups.length })]
        : []),
    ].join(' · ') || t('interface:noClassicFieldSummary')
  );
};
const sentence = (text) => (/[.!?]$/.test(text) ? text : `${text}.`);
const encounterClock = (phase) =>
  ({
    delay: t('interface:nextLaneWarning'),
    rest: t('interface:nextLaneWarning'),
    transition: t('interface:nextVerticalLaneWarning'),
    warning: t('interface:laneWarningEnds'),
    active: t('interface:activeLaneEnds'),
    open: t('interface:coreOpeningCloses'),
  })[phase] || t('interface:currentEncounterPhase');
const seconds = (n) =>
  Number.isFinite(n)
    ? t('interface:flightDetails.secondsRemaining', {
        seconds: formatNumber(n, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
          useGrouping: false,
        }),
      })
    : t('interface:timingUnavailable');
const section = (id, title, lines) => Object.freeze({ id, title, lines: Object.freeze(lines) });
const group = (lines) => {
  const counts = new Map();
  for (const line of lines) counts.set(line, (counts.get(line) || 0) + 1);
  return [...counts].map(([line, count]) => (count > 1 ? `${count} × ${line}` : line));
};
const enemyRole = (enemy) => {
  const pressure =
    enemy.pressure?.mode === 'trail-pursuit'
      ? t('interface:trailPursuer')
      : enemy.pressure?.mode === 'head-intercept'
        ? t('interface:headingInterceptor')
        : null;
  return (
    [pressure, enemy.impactCarrier ? t('interface:trailImpactCarrier') : null]
      .filter(Boolean)
      .join(' · ') || roleName(enemy.type)
  );
};
const enemyState = (enemy, snapshot) => {
  if (enemy.type === 'relay-sentinel')
    return snapshot.encounterLane?.id === enemy.id && snapshot.encounter
      ? encounterText(snapshot.encounter).instruction
      : t('interface:encounterGuidanceIsUnavailableWatchItsVisibleShieldAndLane');
  if (enemy.type === 'contour-patrol') {
    const state =
      {
        patrolling: t(
          'interface:patrollingTheChangingFrontierBetweenUnclaimedFieldAndReclaimedGround',
        ),
        rejoining: t('interface:rejoiningTheChangingFrontierAlongReclaimedGround'),
        idle: t('interface:holdingPositionCapturesMayLeaveItInsideReclaimedGroundAway'),
      }[enemy.mode] || t('interface:flightDetails.frontierFallback');
    return t('interface:flightDetails.frontierRoute', {
      state,
      contact: enemy.frozen
        ? t('interface:whenFreezeEndsContactWithYourCraftOrUnfinishedLine')
        : t('interface:contactWithYourCraftOrUnfinishedLineIsStillDangerous'),
    });
  }
  if (enemy.pressure) {
    const state =
      {
        patrol: t('interface:flightDetails.pressurePatrol'),
        warning: t('interface:flightDetails.pressureWarning', {
          time: seconds(enemy.pressure.seconds),
        }),
        committed: t('interface:flightDetails.pressureCommitted', {
          time: seconds(enemy.pressure.seconds),
        }),
        cooldown: t('interface:flightDetails.pressureCooldown', {
          time: seconds(enemy.pressure.seconds),
        }),
      }[enemy.pressure.phase] || t('interface:watchItsMovementInTheField');
    // Preserve both independent hazards, including while a charge recovers.
    return enemy.impactCarrier
      ? `${sentence(state)} ${t('interface:trailContactSendsVisibleFrontsAlongYourUnfinishedLineClose')}`
      : state;
  }
  if (enemy.impactCarrier)
    return t('interface:trailContactSendsVisibleFrontsAlongYourUnfinishedLineClose');
  return (
    {
      dormant: t('interface:waitingRevealingItsPositionCanWakeIt'),
      warning: `${enemy.type === 'eroder' ? t('interface:flightDetails.eroderWarning') : t('interface:preparingToMoveAcrossRevealedGround')} · ${seconds(enemy.seconds)}`,
      active: t('interface:flightDetails.revealedActive'),
    }[enemy.mode] ||
    {
      bouncer: t('interface:threatensYouAndYourUnfinishedLineInHiddenTerritory'),
      'border-patrol': t('interface:flightDetails.perimeter', {
        contact: enemy.frozen
          ? t('interface:whenFreezeEndsReclaimedGroundDoesNotProtectYouFrom')
          : t('interface:reclaimedGroundDoesNotProtectYouFromContact'),
      }),
      'lane-boss': t('interface:stationaryFieldAnchorWatchTheLockedLaneAndSecureAny'),
      eroder: t('interface:flightDetails.eroder'),
    }[enemy.type] ||
    t('interface:watchItsMovementInTheField')
  );
};
const laneState = (value) => {
  const direction = laneDirection(value.axis);
  return (
    {
      warning: t('interface:flightDetails.laneWarning', {
        direction,
        time: seconds(value.seconds),
      }),
      active: t('interface:flightDetails.laneActive', { direction, time: seconds(value.seconds) }),
      idle: t('interface:flightDetails.laneIdle', { time: seconds(value.seconds) }),
    }[value.phase] || t('interface:watchTheHighlightedLane')
  );
};
// Consume only the existing owned combat projection. Counts describe this paused
// view; a recovering body does not imply that its earlier shot has disappeared.
function optionalPatrolDetails(combat) {
  if (!combat) return null;
  const text = (key, values) => t(`interface:optionalPatrolDetails.${key}`, values),
    title = localizedMessage('interface:optionalPatrolDetails.title');
  if (!combat.valid) return section('optional-patrols', title, [text('unavailable')]);
  const ended = ['won', 'lost'].includes(combat.status);
  if (!combat.actors.length)
    return combat.eliminations.length
      ? section('optional-patrols', title, [text(ended ? 'ended' : 'removed')])
      : null;
  const scouts = combat.actors.filter((actor) => actor.role === 'scout').length,
    sentries = combat.actors.length - scouts,
    warning = combat.actors.filter((actor) => actor.phase === 'warning'),
    recovering = combat.actors.filter((actor) => actor.phase === 'recovery').length,
    lines = [text('counts', { scouts, sentries })];
  if (ended) lines.push(text('ended'));
  else {
    if (warning.length) {
      // Round upward to a tenth: a positive remaining tick must not read as zero.
      const seconds = formatNumber(
        Math.ceil(Math.min(...warning.map((actor) => actor.warningTicks)) * FIXED_DT * 10) / 10,
        { minimumFractionDigits: 1, maximumFractionDigits: 1 },
      );
      lines.push(
        text(combat.frozen ? 'warningHeld' : 'warning', { warnings: warning.length, seconds }),
      );
    }
    if (recovering) lines.push(text('recovery', { recovering }));
    if (combat.projectiles.length) lines.push(text('shots', { shots: combat.projectiles.length }));
    if (combat.frozen) lines.push(text('frozen'));
    lines.push(text(sentries ? 'counterplay' : 'scoutCounterplay'));
  }
  return section('optional-patrols', title, lines);
}

/** Full paused player information. Typed diagnostic details remain in the read-only source. */
export function flightDetailsModel(information, context) {
  const s = information?.snapshot,
    parts = [];
  parts.push(
    section('mission', render(context.mission), [render(context.goal), render(context.steering)]),
  );
  if (!s)
    return Object.freeze([
      ...parts,
      section('unavailable', localizedMessage('interface:fieldInformationUnavailable'), [
        t('interface:theExistingFieldCuesRemainAvailableCloseThisViewTo'),
      ]),
    ]);
  parts.push(
    section('state', localizedMessage('interface:flightState'), [
      `${s.status === 'respawning' ? t('interface:recovering2') : s.paused ? t('interface:paused') : { running: t('interface:inFlight'), won: t('interface:missionComplete'), lost: t('interface:flightEnded') }[s.status] || t('interface:stateUnavailable')}. ${s.player.cutting === true ? t('interface:yourUnfinishedLineRemainsExposed') : s.player.cutting === false ? t('interface:noUnfinishedLine') : t('interface:lineStateIsUnavailable')}`,
      ...(s.objectives
        ? s.objectives.total > 0
          ? [
              t('interface:flightDetails.requiredObjectives', {
                label: render(context.objectiveLabel),
                done: s.objectives.done,
                total: s.objectives.total,
              }),
            ]
          : []
        : [t('interface:requiredObjectiveProgressIsUnavailable')]),
    ]),
  );
  if (information.lastWarning)
    parts.push(
      section('current-notice', localizedMessage('interface:currentMessage'), [
        information.lastWarning.fullText,
      ]),
    );
  const issues = [...(s.issues || []), ...(information.issue ? [information.issue] : [])];
  if (issues.length)
    parts.push(
      section('issues', localizedMessage('interface:someGuidanceIsUnavailable'), [
        t('interface:someFieldEffectsCannotBeDescribedHereKeepWatchingThe'),
      ]),
    );
  const classic = s.classic;
  if (classic) {
    parts.push(
      section('field', localizedMessage('interface:fieldAndTerrain'), [fieldSummary(classic)]),
    );
    const threats = [];
    for (const front of classic.lineImpacts)
      threats.push(
        front.direction === 1
          ? t('interface:impactTravellingTowardYourCraftCloseTheCutOnRevealed')
          : t('interface:impactTravellingTowardTheStartingPointOfYourUnfinishedLine'),
      );
    if (classic.lineImpacts.length)
      threats.push(t('interface:enemyFreezeDoesNotStopTravellingLineImpacts'));
    for (const enemy of classic.enemies) {
      const effect = enemy.frozen
        ? ' ' + t('interface:frozenMovementAndAttackCountdownsAreHeld') + ''
        : enemy.stunned
          ? ' ' + t('interface:temporarilyStunnedAttackCountdownsCanContinue') + ''
          : enemy.slowed
            ? ' ' + t('interface:movementSlowed') + ''
            : '';
      threats.push(`${enemyRole(enemy)}: ${sentence(enemyState(enemy, s))}${effect}`);
    }
    for (const mark of classic.erosion)
      threats.push(t('interface:flightDetails.erosion', { time: seconds(mark.seconds) }));
    if (threats.length)
      parts.push(
        section('threats', localizedMessage('interface:actorsAndLineDanger'), group(threats)),
      );
    if (classic.effects.length)
      parts.push(
        section(
          'effects',
          localizedMessage('interface:bonuses'),
          classic.effects.map((e) =>
            t('interface:flightDetails.effect', {
              label: bonusName(e),
              state:
                e.phase === 'active'
                  ? t('interface:flightDetails.effectActive')
                  : t('interface:flightDetails.effectPending'),
              time: seconds(e.seconds),
            }),
          ),
        ),
      );
    if (classic.powerups.length)
      parts.push(
        section(
          'pickups',
          localizedMessage('interface:contactPickups'),
          group(
            classic.powerups.map((p) =>
              p.timed
                ? t('interface:flightDetails.timedPickup', {
                    label: bonusName(p),
                    time: seconds(p.seconds),
                  })
                : t('interface:flightDetails.pickup', { label: bonusName(p) }),
            ),
          ),
        ),
      );
    const upcoming = classic.timedBonuses?.filter((p) => p.phase === 'announce') ?? [];
    if (upcoming.length)
      parts.push(
        section(
          'timed-pickups',
          localizedMessage('interface:upcomingOptionalPickups'),
          upcoming.map((p) =>
            t('interface:flightDetails.upcoming', {
              label: bonusName(p),
              time: seconds(p.seconds),
            }),
          ),
        ),
      );
  } else if (context.actorRoles?.length)
    parts.push(
      section(
        'field',
        localizedMessage('interface:fieldActors'),
        context.actorRoles.map((r) => `${r.count} × ${roleName(r.type)}`),
      ),
    );
  const patrols = optionalPatrolDetails(s.combat);
  if (patrols) parts.push(patrols);
  if (s.laneBosses.length)
    parts.push(
      section(
        'lanes',
        localizedMessage('interface:laneAttacks'),
        s.laneBosses.map(
          (p) =>
            `${laneState(p)}${p.clockFrozen ? ' ' + t('interface:enemyFreezeHoldsThisCountdown') + '' : p.stunned ? ' ' + t('interface:temporarilyStunnedTheCountdownContinues') + '' : ''}`,
        ),
      ),
    );
  if (s.encounter) {
    const e = s.encounter,
      stage =
        s.status === 'lost'
          ? t('interface:flightEnded')
          : e.phase === 'defeated'
            ? t('interface:coreReleased2')
            : e.stage === 'shielded'
              ? e.shields?.total > 1
                ? t('interface:captureAllRemainingShieldRelays')
                : t('interface:captureTheShieldRelay2')
              : {
                  transition: t('interface:shieldOpening2'),
                  exposed: t('interface:releaseTheCore'),
                }[e.stage] || t('interface:encounterInProgress'),
      lines = [
        encounterText(e).instruction,
        `${stage}.`,
        ...(s.status === 'lost' || e.phase === 'defeated'
          ? []
          : [`${encounterClock(e.phase)} · ${seconds(e.seconds)}.`]),
        t('interface:flightDetails.cut', {
          cells: e.cutCells,
          minimum: e.min,
          remaining: e.remaining,
        }),
        ...(e.isolated ? [t('interface:coreIsolated')] : []),
        ...(e.suppressed ? [t('interface:theLaneAttackIsTemporarilySuppressed')] : []),
      ];
    if (s.encounterLane?.marked)
      lines.push(
        `${t('interface:flightDetails.markedLane', { direction: laneDirection(s.encounterLane.axis) })}${s.encounterLane.clockFrozen ? ' ' + t('interface:enemyFreezeHoldsItsAttackCountdown') : ''}`,
      );
    parts.push(section('encounter', encounterText(e).title, lines));
  }
  parts.push(
    section(
      'actions',
      localizedMessage('interface:controlsAfterResume'),
      context.actions.length
        ? context.actions.map((a) => `${render(a.label)}: ${render(a.detail)}`)
        : [t('interface:noManualEquipmentActionsBonusesActivateThroughPlay')],
    ),
  );
  if ((information.recentBatches || []).some((b) => b.unknownEvents.length))
    parts.push(
      section('unknown', localizedMessage('interface:additionalFieldEffects'), [
        t('interface:someRecentEffectsAreNotDescribedHereTheirVisibleField'),
      ]),
    );
  const history = [...(information.recentNotices || [])].reverse().map((n) => n.fullText);
  if (information.omittedNotices || information.omittedBatches)
    history.push(t('interface:earlierMessagesAreNoLongerShownThisIsRecentContext'));
  if (history.length)
    parts.push(
      section('history', localizedMessage('interface:recentMessagesNewestFirst'), history),
    );
  return Object.freeze(parts);
}

/** The host supplies its real pause, reading/navigation and accepted owner boundary. */
export function attachFlightDetails({
  document: doc = globalThis.document,
  read,
  getContext,
  pause,
  clearInput,
  topDialog,
  onReadingChange,
  canOpen,
}) {
  const byId = (id) => doc.getElementById(id),
    dialog = byId('flight-details-dialog'),
    opener = byId('overlay-field-details'),
    readButton = byId('flight-details-read'),
    content = byId('flight-details-content'),
    back = byId('flight-details-back');
  let disposed = false,
    revision = 0,
    visit = null;
  const ownerIsCurrent = (owner) => {
    const current = read()?.owner;
    return current?.attempt === owner?.attempt && current?.generation === owner?.generation;
  };
  const paintVisit = (accepted) => {
    const nodes = [];
    for (const part of flightDetailsModel(accepted.information, accepted.context)) {
      const heading = doc.createElement('h3');
      heading.textContent = render(part.title);
      nodes.push(heading);
      for (const line of part.lines) {
        const p = doc.createElement('p');
        p.textContent = render(line);
        nodes.push(p);
      }
    }
    content.replaceChildren(...nodes);
  };
  // Refresh only the accepted paused facts. No current-run reads, input reset,
  // focus changes or reader re-entry: the shared locale transaction retains the
  // existing reading owner and scroll while its text is updated.
  const stopLocale = onLocaleChange(() => {
    if (!disposed && visit && dialog.open) paintVisit(visit);
  });
  function open() {
    if (
      disposed ||
      doc.hidden ||
      doc.hasFocus?.() === false ||
      dialog.open ||
      !canOpen() ||
      topDialog()
    )
      return false;
    const origin = doc.activeElement,
      initial = read()?.owner;
    if (!initial) return false;
    pause(true);
    clearInput();
    const information = read();
    if (
      !information?.snapshot?.paused ||
      !ownerIsCurrent(initial) ||
      disposed ||
      doc.hidden ||
      doc.hasFocus?.() === false
    )
      return false;
    const context = getContext();
    const accepted = {
      revision: ++revision,
      owner: initial,
      origin,
      information,
      context: {
        ...context,
        actions: context.actions.map((action) => ({ ...action })),
        actorRoles: context.actorRoles?.map((role) => ({ ...role })),
      },
    };
    paintVisit(accepted);
    visit = accepted;
    dialog.showModal();
    dialog.scrollTop = 0;
    readButton.focus({ preventScroll: true });
    return true;
  }
  function closed() {
    if (dialog.open || !visit) return;
    const ending = visit;
    visit = null;
    clearInput();
    onReadingChange();
    queueMicrotask(() => {
      if (
        disposed ||
        dialog.open ||
        ending.revision !== revision ||
        !ownerIsCurrent(ending.owner) ||
        doc.hidden ||
        doc.hasFocus?.() === false ||
        topDialog()
      )
        return;
      const active = doc.activeElement;
      if (
        active !== doc.body &&
        active !== dialog &&
        !dialog.contains(active) &&
        active !== ending.origin &&
        active?.isConnected
      )
        return;
      const target =
        ending.origin?.isConnected &&
        !ending.origin.disabled &&
        !ending.origin.closest('[hidden],[inert]')
          ? ending.origin
          : opener;
      if (target?.isConnected && !target.hidden && !target.closest('[hidden],[inert]'))
        target.focus({ preventScroll: true });
    });
  }
  function close() {
    if (dialog.open) dialog.close();
  }
  function cancel(e) {
    e.preventDefault();
    close();
  }
  opener.addEventListener('click', open);
  back.addEventListener('click', close);
  dialog.addEventListener('cancel', cancel);
  dialog.addEventListener('close', closed);
  return Object.freeze({
    reconcile() {
      if (visit && !ownerIsCurrent(visit.owner)) {
        revision++;
        visit = null;
        clearInput();
        close();
      }
    },
    suspend() {
      revision++;
      visit = null;
      close();
    },
    dispose() {
      disposed = true;
      stopLocale();
      revision++;
      visit = null;
      close();
      opener.removeEventListener('click', open);
      back.removeEventListener('click', close);
      dialog.removeEventListener('cancel', cancel);
      dialog.removeEventListener('close', closed);
    },
  });
}
