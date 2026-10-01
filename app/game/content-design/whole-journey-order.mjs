import { freezeDesign } from './catalogs.mjs';

// Stable navigation metadata must not eagerly import every chapter factory.
// This is also the composer order, never inferred from titles/imported flags.
const chapters = [
  ['horizon', 'journey-opening', 'opening-remixes'],
  ['border', 'journey-border', 'border-remixes'],
  ['signal', 'journey-signal', 'signal-remixes'],
  ['neon', 'journey-neon', 'neon-remixes'],
  ['rover', 'journey-rover', 'rover-remixes'],
  ['fracture', 'journey-fracture', 'fracture-remixes'],
  ['phase', 'journey-phase', 'phase-remixes'],
  ['livewire', 'journey-livewire', 'livewire-remixes'],
  ['relay', 'journey-relay', 'relay-remixes'],
  ['crosswind', 'journey-crosswind', 'crosswind-remixes'],
  ['sentinel', 'journey-sentinel', 'sentinel-remixes'],
  ['apex', 'journey-apex', 'apex-remixes'],
];
export const WHOLE_JOURNEY_CHAPTERS = freezeDesign(
  chapters.map(([id, corePackId, remixPackId]) => ({ id, corePackId, remixPackId })),
);
export const WHOLE_JOURNEY_CORE_PACK_IDS = freezeDesign(chapters.map((row) => row[1]));
export const WHOLE_JOURNEY_REMIX_PACK_IDS = freezeDesign(chapters.map((row) => row[2]));
