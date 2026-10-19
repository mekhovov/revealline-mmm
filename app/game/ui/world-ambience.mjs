/** Shared, original atmosphere recipes. They use the existing SFX owner and
 * require no decoded files, independent context or background scheduler. */
const WORLDS = Object.freeze({
  'field-crossing': { filter: 760, air: 0.009, hum: 108, humGain: 0.0015 },
  'freight-depot': { filter: 310, air: 0.006, hum: 61, humGain: 0.0035 },
  'relay-ruins': { filter: 480, air: 0.008, hum: 89, humGain: 0.002 },
  'river-port': { filter: 570, air: 0.008, hum: 74, humGain: 0.0016 },
  'chalk-quarry': { filter: 930, air: 0.007, hum: 48, humGain: 0.0022 },
  'orchard-strongpoint': { filter: 1120, air: 0.006, hum: 123, humGain: 0.0012 },
});

export function worldAmbienceRecipe(world) {
  const profile = WORLDS[world];
  if (!profile) return null;
  return {
    name: `ambience-${world}`,
    procedural: true,
    ambience: true,
    gain: 1,
    priority: 0,
    movement: false,
    cooldown: 1.25,
    tone: {
      kind: 'snare',
      from: profile.filter,
      to: profile.filter,
      filterFrequency: profile.filter,
      duration: 1.75,
      gain: profile.air,
      type: 'sine',
    },
    layers: [
      {
        from: profile.hum,
        to: profile.hum * 0.985,
        duration: 1.7,
        gain: profile.humGain,
        type: 'sine',
      },
    ],
  };
}
