import { resolveEnemySkin } from '../enemy-catalog.mjs';
import { journeyActorThemeMaterial } from '../presentation/journey-actor-materials.mjs';

// Recorded ingredients are shared; authored body/role and playback rate provide identity.
export const PLAYER_MOVEMENT = Object.freeze({
  'fpv-body': 'rotor',
  'neutral-marker': 'motor',
  'ukrainian-bird': 'wings',
  'retro-craft': 'motor',
  'navi-avatar': 'grain',
  'fpv-racer': 'rotor',
  'fpv-night': 'rotor',
  'ukrainian-falcon': 'wings',
  'retro-vector': 'motor',
  'navi-auditor': 'grain',
  'scout-quad': 'rotor',
  'heavy-lift': 'rotor',
  'fixedwing-body': 'motor',
  'delta-interceptor': 'motor',
  'fpv-scout-v1': 'rotor',
  'fpv-light-carrier-v1': 'rotor',
  'fpv-heavy-carrier-v1': 'rotor',
  'fpv-interceptor-v1': 'rotor',
  'fpv-fiber-relay-v1': 'rotor',
  'fpv-impact-v1': 'rotor',
  'fpv-trapper-v1': 'rotor',
  'atlas-swallow-v3': 'wings',
  'atlas-pottery-courier-v1': 'ceramic',
  'atlas-carved-chest-v1': 'wood',
  'atlas-falcon-crest-v3': 'wings',
  'atlas-weaver-shuttle-v3': 'grain',
  'atlas-bell-warden-v1': 'bell',
  'atlas-woven-basket-v1': 'wood',
});
export const ENEMY_MOVEMENT = Object.freeze(
  Object.fromEntries(
    Object.entries({
      fpv: {
        bouncer: 'wheels',
        'border-patrol': 'rotor',
        'contour-patrol': 'rotor',
        'claimed-rover': 'wheels',
        eroder: 'ratchet',
        'lane-boss': 'motor',
        'relay-sentinel': 'motor',
      },
      ukraine: {
        bouncer: 'grain',
        'border-patrol': 'wings',
        'contour-patrol': 'grain',
        'claimed-rover': 'wheels',
        eroder: 'wheels',
        'lane-boss': 'wings',
        'relay-sentinel': 'grain',
      },
      retro: {
        bouncer: 'motor',
        'border-patrol': 'motor',
        'contour-patrol': 'wheels',
        'claimed-rover': 'wheels',
        eroder: 'ratchet',
        'lane-boss': 'motor',
        'relay-sentinel': 'motor',
      },
      coupa: {
        bouncer: 'grain',
        'border-patrol': 'grain',
        'contour-patrol': 'grain',
        'claimed-rover': 'wheels',
        eroder: 'motor',
        'lane-boss': 'grain',
        'relay-sentinel': 'grain',
      },
    }).map(([family, roles]) => [family, Object.freeze(roles)]),
  ),
);
const familyFor = (theme) =>
  ({ atlas: 'ukraine', navi: 'coupa', arcade: 'retro' })[theme.family] ?? theme.family ?? theme.id;
const explicitBody = (body) =>
  PLAYER_MOVEMENT[body] ??
  (/bird|falcon|swallow|sail|moth/.test(body)
    ? 'wings'
    : /pottery|chest|weaver|bell|basket|navi|auditor|invoice|cursor|paper|document|card/.test(body)
      ? 'grain'
      : /fpv|quad|rotor|propeller|heavy-lift/.test(body)
        ? 'rotor'
        : /rover|tank|cart|wheel/.test(body)
          ? 'wheels'
          : /retro|arcade|fixedwing|delta/.test(body)
            ? 'motor'
            : null);
export function recordedMovement(body = '', theme = {}, type = '', skinId = '') {
  const known = explicitBody(body);
  if (known) return known;
  const role =
    {
      drifter: 'bouncer',
      hunter: 'border-patrol',
      patrol: 'border-patrol',
      scout: 'border-patrol',
      interceptor: 'border-patrol',
      sentry: 'lane-boss',
    }[type] ?? type;
  const skin = resolveEnemySkin(role, skinId);
  const recipe = theme.actorRecipes?.[role];
  // Company recipes are actual visible bodies and override generic role topology.
  if (recipe?.startsWith('fpv-')) return 'rotor';
  if (['paper-tangle', 'missing-cloud', 'stale-fragments', 'backlog-knot'].includes(recipe))
    return 'grain';
  const material = !skin && journeyActorThemeMaterial(theme.id);
  if (material) {
    if (['glaze', 'circuit'].includes(material.motif)) return 'ceramic';
    if (material.motif === 'rivets') return 'ratchet';
    if (material.motif === 'weave') return 'wings';
    if (['seed', 'links'].includes(material.motif)) return 'grain';
    return ['claimed-rover', 'contour-patrol'].includes(role) ? 'wheels' : 'motor';
  }
  const family = skin ?? familyFor(theme);
  if (role === 'eroder' && ['fpv', 'retro'].includes(family)) return 'ratchet';
  if (role && ENEMY_MOVEMENT[family]?.[role]) return ENEMY_MOVEMENT[family][role];
  if (role === 'claimed-rover' || role === 'eroder') return 'wheels';
  return { fpv: 'rotor', ukraine: 'wings', coupa: 'grain' }[family] ?? 'motor';
}
export function playerMovementBody(player, run, theme, options = {}) {
  if (options.actorStyle === 'fpv') return `fpv-${player.classId ?? run.activeClassId ?? 'scout'}`;
  return (
    options.bodyId ??
    player.bodyId ??
    theme.classBodies?.[player.classId ?? run.activeClassId] ??
    theme.player ??
    ''
  );
}
