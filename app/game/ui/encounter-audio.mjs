/** Shared semantic cues; both recorded and offline procedural renditions use
 * these recipes. No context, clock, randomness or actor mutation lives here. */
import { destructionSoundRecipe } from './destruction-audio.mjs';
import { worldAmbienceRecipe } from './world-ambience.mjs';
const FAMILY_PITCH = Object.freeze({
  lookout: 1.1,
  patroller: 0.94,
  runner: 1.06,
  sprinter: 1.18,
  courier: 1.24,
  guard: 0.84,
  refuge: 0.98,
  switchback: 1.14,
  pair: 1.04,
  shield: 0.72,
  brace: 0.68,
  'refuge-seeker': 0.98,
  'rendezvous-pair': 1.04,
  'shield-bearer': 0.72,
  'brace-trooper': 0.68,
  'relay-warden': 0.62,
});
// Original material accents reuse the admitted bank. Cadence follows observed
// movement, never a sprite frame, random choice or simulation mutation.
const ACTOR_SOUNDS = Object.freeze({
  runner: Object.freeze({
    cadence: 0.32,
    rate: 1.08,
    equipment: 'paper',
    from: 240,
    to: 150,
  }),
  courier: Object.freeze({
    cadence: 0.29,
    rate: 1.19,
    equipment: 'ratchet',
    from: 360,
    to: 210,
  }),
  guard: Object.freeze({
    cadence: 0.41,
    rate: 0.87,
    equipment: 'contact-metal',
    from: 210,
    to: 90,
  }),
  shield: Object.freeze({
    cadence: 0.48,
    rate: 0.7,
    equipment: 'contact-metal',
    from: 135,
    to: 48,
  }),
});
export function actorSoundProfile(family) {
  return ACTOR_SOUNDS[family === 'shield-bearer' ? 'shield' : family] ?? ACTOR_SOUNDS.runner;
}
export function encounterSoundRecipe(type, details = {}) {
  if (type === 'catch') return destructionSoundRecipe(details);
  if (type === 'ambience') return worldAmbienceRecipe(details.world);
  if (type === 'warning-charge') {
    const progress = Math.max(0, Math.min(1, details.progress ?? 0));
    return {
      name: 'warning-charge',
      procedural: true,
      gain: 0.18,
      priority: 5,
      movement: false,
      cooldown: 0.16,
      tone: {
        from: 660 + progress * 360,
        to: 740 + progress * 360,
        duration: 0.055,
        gain: 0.024,
        type: 'sine',
      },
    };
  }
  if (type === 'escort-shot') {
    const breaker = details.role === 'breaker';
    return {
      name: breaker ? 'escort-breaker' : 'escort-sweeper',
      procedural: true,
      gain: 0.15,
      priority: 2,
      movement: false,
      cooldown: 0.65,
      tone: {
        from: breaker ? 520 : 160,
        to: breaker ? 180 : 60,
        duration: breaker ? 0.075 : 0.12,
        gain: 0.016,
        type: breaker ? 'triangle' : 'sine',
      },
    };
  }
  const pitch = FAMILY_PITCH[details.family] ?? 1;
  const actor = actorSoundProfile(details.family),
    tracked = details.machine === 'tracked',
    metal = details.material === 'metal' || [true, 'tracked', 'wheeled'].includes(details.machine);
  const recipes = {
    step: ['grain', 0.11, 0, 130 * actor.rate, 65 * actor.rate, 0.055],
    equipment: [actor.equipment, 0.12, 1, actor.from, actor.to, 0.085],
    drive: [tracked ? 'ratchet' : 'wheels', 0.17, 1, tracked ? 110 : 210, tracked ? 48 : 90, 0.16],
    notice: ['switch', 0.17, 2, 360, 520, 0.09],
    warning: ['warning', 0.44, 5, 620, 860, 0.13],
    burst: ['paper', 0.19, 2, 190, 320, 0.09],
    recover: ['cancel', 0.13, 1, 310, 210, 0.08],
    blocked: ['contact-soft', 0.1, 1, 150, 100, 0.055],
    fire: ['attack', 0.34, 4, 620, 110, 0.08],
    impact: ['impact', 0.48, 5, 170, 38, 0.15],
    pulse: ['deploy', 0.33, 3, 880, 260, 0.19],
    reel: ['ratchet', 0.3, 3, 220, 510, 0.16],
    supply: ['pickup', 0.2, 2, 520, 780, 0.09],
    shutter: [
      details.closed ? 'closure' : 'gate',
      0.22,
      3,
      details.closed ? 360 : 260,
      details.closed ? 160 : 520,
      0.13,
    ],
    objective: ['confirm', 0.4, 4, 660, 990, 0.18],
    failure: ['loss', 0.42, 5, 260, 65, 0.23],
  };
  const row = recipes[type];
  if (!row) return null;
  const [name, gain, priority, from, to, duration] = row;
  const scale = Number.isFinite(details.gainScale)
    ? Math.max(0, Math.min(1, details.gainScale))
    : 1;
  const movement = ['step', 'equipment', 'drive'].includes(type);
  return {
    name,
    gain: gain * scale,
    priority:
      details.semantic === 'armor-break'
        ? 4
        : details.semantic === 'harmful-contact'
          ? 5
          : details.semantic === 'friendly-impact'
            ? 3
            : priority,
    movement,
    // Loop textures are deliberately sampled as short envelopes for footsteps.
    maxDuration: movement ? duration : null,
    cooldown:
      type === 'step' ? actor.cadence : type === 'equipment' ? 0.7 : type === 'drive' ? 1.2 : null,
    rate: type === 'step' ? actor.rate : pitch,
    tone: {
      from: from * pitch,
      to: to * pitch,
      duration,
      gain: gain * scale * 0.14,
      type: metal || type === 'equipment' ? 'triangle' : 'sine',
    },
  };
}

/** Phase changes are incidental cues; blocked/idling actors never emit per frame. */
export function actorPhaseSound(previous, next) {
  if (!previous || previous === next) return null;
  if (['warning', 'telegraph', 'turning'].includes(next)) return 'warning';
  if (['burst', 'dash'].includes(next)) return 'burst';
  if (['recover', 'recovering', 'recovery', 'rest'].includes(next)) return 'recover';
  if (next === 'blocked') return 'blocked';
  if (['flee', 'fleeing', 'notice', 'committed'].includes(next)) return 'notice';
  return null;
}
