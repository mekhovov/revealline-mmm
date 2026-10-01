import { JOURNEY_ACTOR_MATERIALS } from '../presentation/journey-actor-materials.mjs';
/** Presentation policy only: board units, never CSS pixels or gameplay randomness. */
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function distanceGain(distance, shorterSide) {
  if (!(shorterSide > 0) || !Number.isFinite(distance)) return 0;
  const x = Math.max(0, distance / shorterSide);
  const stops = [
    [0.08, 1],
    [0.25, 10 ** (-6 / 20)],
    [0.6, 0.1],
    [0.8, 0],
  ];
  if (x <= stops[0][0]) return 1;
  for (let i = 1; i < stops.length; i++) {
    const [a, g] = stops[i - 1],
      [b, h] = stops[i];
    if (x < b) return g + ((h - g) * (x - a)) / (b - a);
  }
  return 0;
}
export function screenPan(x, width, placement = { left: 0, width: 1 }) {
  return clamp(
    ((placement.left + clamp(x / width, 0, 1) * placement.width) * 2 - 1) * 0.6,
    -0.6,
    0.6,
  );
}
export function captureRecipe(event, run) {
  const count = new Set(
    (event.indices ?? []).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < (run?.cells?.length ?? Infinity),
    ),
  ).size;
  const fraction = count / Math.max(1, run?.totalClaimable ?? run?.cells?.length ?? 1);
  const tier = fraction < 0.02 ? 'small' : fraction < 0.08 ? 'medium' : 'large';
  return { fraction, tier, duration: { small: 0.2, medium: 0.4, large: 0.65 }[tier] };
}
export function materialFor(theme = {}) {
  const id = `${theme.sourceThemeId ?? ''} ${theme.id ?? ''} ${theme.family ?? ''}`;
  if (/seedpod|sail|atlas|ukrain|wood|lacquer/.test(id)) return 'wood';
  if (/porcelain|glass|prism|ice/.test(id)) return 'glass';
  if (/navi|coupa|spend|paper/.test(id)) return 'soft';
  return 'metal';
}
export { recordedMovement as movementFor } from './movement-profiles.mjs';
export function eventCue(event) {
  const type = event.type;
  if (type === 'ability.used')
    return (
      {
        scan: 'interference',
        shield: 'deploy',
        'stun-field': 'deploy',
        'slow-field': 'paper',
        'impact-pulse': 'impact',
      }[event.primitive] ?? 'deploy'
    );
  if (type === 'run.completed')
    return event.won === false || event.status === 'lost' ? 'loss' : 'win';
  if (/warning|targetLocked|lockAcquired|player.downed|rescue.started/.test(type)) return 'warning';
  if (type === 'encounter.phaseChanged')
    return event.phase === 'warning' ? 'warning' : event.phase === 'open' ? 'gate' : 'attack';
  if (type === 'signal.changed') return event.zoneIds?.length ? 'interference' : 'neutralized';
  return (
    {
      'cut.started': 'paper',
      'cut.closed': 'closure',
      'player.failed': 'impact',
      'player.respawned': 'respawn',
      'craft.redeployed': 'deploy',
      'cells.eroded': 'erosion',
      'erosion.blocked': 'contact-metal',
      'rover.activated': 'deploy',
      'rover.activationCancelled': 'cancel',
      'lineImpact.seeded': 'warning',
      'lineImpact.arrived': 'impact',
      'lineImpact.cleared': 'neutralized',
      'relay.opened': 'gate',
      'objective.captured': 'pickup',
      'shield.absorbed': 'deploy',
      'ability.used': 'deploy',
      'ability.rejected': 'cancel',
      'class.rejected': 'cancel',
      'class.switched': 'switch',
      'pickup.collected': 'pickup',
      'powerup.collected': 'pickup',
      'encounter.stageChanged': 'deploy',
      'contour.routeChanged': 'contact-soft',
      'capture.stopped': 'contact-metal',
      'combat.locked': 'warning',
      'combat.fired': 'attack',
      'combat.impact': 'impact',
      'combat.cancelled': 'cancel',
      'combat.eliminated': 'pickup',
      'combat.projectileRemoved': 'neutralized',
      'player.revived': 'respawn',
      'rescue.completed': 'respawn',
      'rescue.cancelled': 'cancel',
      'team.recovery': 'respawn',
      'enemy.commit': 'attack',
      'impact.launched': 'warning',
      'impact.intercepted': 'deploy',
      'impact.cleared': 'neutralized',
      'enemy.recovery': 'cancel',
      'enemy.defeated': 'pickup',
      'core.defeated': 'pickup',
      'shield.disabled': 'gate',
      'support.pulse': 'deploy',
      'support.recharged': 'pickup',
      'trail.anchored': 'closure',
    }[type] ?? null
  );
}

/** Real board placement, including stacked narrow-screen Versus layouts. */
export function boardPlacement(canvas) {
  const rect = canvas?.getBoundingClientRect?.();
  const viewport = globalThis.innerWidth;
  return rect && viewport > 0
    ? { left: rect.left / viewport, width: rect.width / viewport }
    : { left: 0, width: 1 };
}
export const MATERIAL_PROFILES = Object.freeze({
  'horizon-enamel': ['metal', 1.08],
  'border-seedpod': ['wood', 1.12],
  'signal-porcelain': ['glass', 0.84],
  'neon-glass': ['glass', 1.18],
  'rover-rivets': ['metal', 0.8],
  'fracture-basalt': ['soft', 0.65],
  'phase-prism': ['glass', 1.3],
  'livewire-copper': ['metal', 1.22],
  'relay-lacquer': ['wood', 0.85],
  'crosswind-sail': ['soft', 1.15],
  'sentinel-gilt': ['metal', 0.7],
  'apex-ice': ['glass', 1.04],
});
export function materialProfile(theme) {
  const source = theme?.sourceThemeId ?? theme?.id ?? '';
  const material = JOURNEY_ACTOR_MATERIALS.find(
    (entry) => source === entry.sourceThemeId || source === `${entry.sourceThemeId}-actors-v1`,
  );
  const id = `${material?.id ?? ''} ${source}`;
  return (
    Object.entries(MATERIAL_PROFILES).find(([key]) => id.includes(key))?.[1] ?? [
      materialFor(theme),
      1,
    ]
  );
}

export function movementRate(body = '', type = '') {
  if (/heavy|carrier|chest|basket/.test(body)) return 0.72;
  if (/racer|interceptor|swallow|falcon/.test(body)) return 1.18;
  if (/pottery|bell/.test(body)) return 0.88;
  return (
    {
      bouncer: 0.86,
      'claimed-rover': 0.78,
      eroder: 0.66,
      'border-patrol': 1.14,
      'contour-patrol': 0.98,
    }[type] ?? 1
  );
}
