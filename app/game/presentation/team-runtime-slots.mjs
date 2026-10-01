/** Shared immutable Team slot contracts. This leaf has no renderer dependencies. */
export const TEAM_OUTCOME_SLOTS = Object.freeze(['team.capture.joint', 'team.recovery']);

export const TEAM_ENEMY_SLOTS = Object.freeze([
  'team.enemy.drifter',
  'team.enemy.hunter.patrol',
  'team.enemy.hunter.warning',
  'team.enemy.hunter.charge',
  'team.enemy.hunter.recovery',
]);

export const TEAM_PILOT_STATES = Object.freeze([
  'normal',
  'cutting',
  'downed',
  'crawling',
  'rescuing',
  'recovery',
]);

export const TEAM_PILOT_SLOTS = Object.freeze(
  [1, 2].flatMap((seat) =>
    TEAM_PILOT_STATES.flatMap((state) =>
      ['compact', 'detailed'].map((treatment) => `team.pilot.p${seat}.${state}.${treatment}`),
    ),
  ),
);

export const TEAM_ANCHOR_SLOTS = Object.freeze(['team.anchor.available', 'team.anchor.captured']);

export const TEAM_CORE_SLOTS = Object.freeze([
  'team.core.shielded',
  'team.core.exposed',
  'team.core.secured',
]);

export const TEAM_SUPPORT_SLOTS = Object.freeze(['team.support.pulse', 'team.enemy.slowed']);

export const TEAM_EMITTER_SLOTS = Object.freeze(['team.emitter.warning', 'team.emitter.spark']);

export const TEAM_RESCUE_SLOTS = Object.freeze(['team.rescue.progress', 'team.player.recovery']);

/** Exact code-owned renderer contracts. A team.* prefix alone is not authority. */
export const TEAM_RUNTIME_IMAGE_SLOTS = Object.freeze([
  ...TEAM_ANCHOR_SLOTS,
  ...TEAM_CORE_SLOTS,
  ...TEAM_SUPPORT_SLOTS,
  ...TEAM_EMITTER_SLOTS,
  ...TEAM_RESCUE_SLOTS,
  ...TEAM_PILOT_SLOTS,
  ...TEAM_ENEMY_SLOTS,
  ...TEAM_OUTCOME_SLOTS,
]);
export const isTeamRuntimeImageSlot = (id) => TEAM_RUNTIME_IMAGE_SLOTS.includes(id);
