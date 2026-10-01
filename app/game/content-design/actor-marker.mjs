import { t } from '../i18n/index.mjs';

/** Shared color-independent silhouettes for Studio and mission diagrams.
 * Adds a path only; the caller owns ink, fill and frozen capture overlays.
 */
export function traceContentActor(ctx, type, x, y, radius) {
  if (['optional-scout', 'optional-sentry'].includes(type)) {
    // Bracketed biped: intentionally different from a retaining keeper circle.
    ctx.rect(x - radius * 0.3, y - radius, radius * 0.6, radius * 0.5);
    ctx.rect(x - radius * 0.5, y - radius * 0.35, radius, radius * 0.7);
    ctx.rect(x - radius * 0.5, y + radius * 0.35, radius * 0.3, radius * 0.65);
    ctx.rect(x + radius * 0.2, y + radius * 0.35, radius * 0.3, radius * 0.65);
    if (type === 'optional-sentry')
      ctx.rect(x + radius * 0.5, y - radius * 0.2, radius * 0.6, radius * 0.2);
  } else if (type === 'relay-sentinel') {
    // A three-point crown remains distinct from emitter posts and patrol arrows.
    ctx.moveTo(x - radius, y - radius);
    ctx.lineTo(x - radius * 0.35, y);
    ctx.lineTo(x, y - radius);
    ctx.lineTo(x + radius * 0.35, y);
    ctx.lineTo(x + radius, y - radius);
    ctx.lineTo(x + radius * 0.7, y + radius);
    ctx.lineTo(x - radius * 0.7, y + radius);
    ctx.closePath();
  } else if (type === 'impact-carrier') {
    // A split lightning bolt is readable without motion or color cues.
    ctx.moveTo(x + radius * 0.2, y - radius);
    ctx.lineTo(x - radius, y + radius * 0.15);
    ctx.lineTo(x - radius * 0.15, y + radius * 0.15);
    ctx.lineTo(x - radius * 0.2, y + radius);
    ctx.lineTo(x + radius, y - radius * 0.15);
    ctx.lineTo(x + radius * 0.15, y - radius * 0.15);
    ctx.closePath();
  } else if (type === 'lane-boss') {
    // Twin posts and a bridge: distinct from moving patrols and tracked roamers.
    ctx.rect(x - radius, y - radius, radius * 0.45, radius * 2);
    ctx.rect(x + radius * 0.55, y - radius, radius * 0.45, radius * 2);
    ctx.rect(x - radius * 0.55, y - radius * 0.2, radius * 1.1, radius * 0.4);
  } else if (['bouncer', 'drifter'].includes(type)) ctx.arc(x, y, radius, 0, Math.PI * 2);
  else if (type === 'border-patrol') {
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y);
    ctx.lineTo(x, y + radius);
    ctx.lineTo(x - radius, y);
    ctx.closePath();
  } else if (type === 'claimed-rover') {
    ctx.rect(x - radius * 0.7, y - radius * 0.65, radius * 1.4, radius * 1.3);
    ctx.rect(x - radius, y - radius, radius * 0.3, radius * 2);
    ctx.rect(x + radius * 0.7, y - radius, radius * 0.3, radius * 2);
  } else if (type === 'eroder') {
    // A toothed blade, not a patrol triangle or the roamer's tracked square.
    ctx.rect(x - radius * 0.45, y - radius * 0.2, radius * 0.9, radius * 1.2);
    ctx.rect(x - radius, y - radius * 0.6, radius * 2, radius * 0.5);
    for (const tooth of [-1, -0.2, 0.6])
      ctx.rect(x + radius * tooth, y - radius, radius * 0.4, radius * 0.4);
  } else {
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y + radius);
    ctx.lineTo(x - radius, y + radius);
    ctx.closePath();
  }
}

/** The validated manifest owns role selection; historical global v1 is unchanged. */
export function contentActorMarkerType(level, actor) {
  const impact = level.classic?.lineImpact;
  return actor.type === 'bouncer' &&
    impact?.version === 'line-impact.v2' &&
    impact.actorIds.includes(actor.id)
    ? 'impact-carrier'
    : actor.type;
}

/** Initial authored positions are also shown when the gameplay modifier is off. */
export function contentCombatMarkers(level) {
  return (level.classic?.combatPatrols?.actors ?? []).map(({ id, role, x, y }) => ({
    id,
    type: `optional-${role}`,
    x,
    y,
    inactive: !level.classic.combatPatrols.enabled,
  }));
}

/** Initial authoring facts come from the resolved descriptor, not map-marker guesses. */
const actorTypeKeys = {
  bouncer: 'tools:studio.actor.bouncer',
  drifter: 'tools:studio.actor.drifter',
  'border-patrol': 'tools:studio.actor.borderPatrol',
  'contour-patrol': 'tools:studio.actor.contourPatrol',
  'claimed-rover': 'tools:studio.actor.claimedRover',
  eroder: 'tools:studio.actor.eroder',
  'relay-sentinel': 'tools:studio.actor.relaySentinel',
};
export function contentActorDescription(level, actor) {
  if (['optional-scout', 'optional-sentry'].includes(actor.type)) {
    const recipe = level.classic.combatPatrols.actors.find((entry) => entry.id === actor.id);
    const active = level.classic.combatPatrols.enabled;
    const key =
      recipe.role === 'sentry'
        ? active
          ? 'tools:studio.actor.sentryActive'
          : 'tools:studio.actor.sentryInactive'
        : active
          ? 'tools:studio.actor.scoutActive'
          : 'tools:studio.actor.scoutInactive';
    return t(key, {
      speed: recipe.speed,
      opening: recipe.openingTicks / 120,
      warning: recipe.warningTicks / 120,
      recovery: recipe.recoveryTicks / 120,
      rest: recipe.restTicks / 120,
    });
  }
  if (actor.type === 'relay-sentinel' && level.encounter?.version === 'xonix-encounter.v2') {
    const recipe = level.encounter;
    return t('tools:studio.actor.sentinel', {
      count: recipe.shieldObjectiveIds.length,
      warning: recipe.shielded.warningTicks / 120,
      cells: recipe.minReleaseCutCells,
    });
  }
  if (actor.type === 'lane-boss') {
    const recipe = level.enemies.find((entry) => entry.id === actor.id);
    return t('tools:studio.actor.emitter', {
      axis: t(
        recipe.axis === 'horizontal'
          ? 'tools:studio.actor.horizontal'
          : 'tools:studio.actor.vertical',
      ),
      warning: recipe.warningSeconds,
      active: recipe.activeSeconds,
      period: recipe.period,
    });
  }
  return contentActorMarkerType(level, actor) === 'impact-carrier'
    ? t('tools:studio.actor.impactCarrier')
    : actorTypeKeys[actor.type]
      ? t(actorTypeKeys[actor.type])
      : actor.type;
}
