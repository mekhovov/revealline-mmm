import { WHOLE_JOURNEY_REMIX_PACK_IDS } from '../content-design/whole-journey-order.mjs';
import {
  UKRAINIAN_ORNAMENT_ATLAS_REVISION,
  UKRAINIAN_ORNAMENT_ATLAS_IDS,
} from '../content-design/ukrainian-ornament-atlas-registry.mjs';
import { contentText } from '../i18n/content.mjs';
import { t } from '../i18n/index.mjs';

const DIFFICULTY_KEYS = Object.freeze({
  gentle: 'interface:missionLibrary.difficulty.gentle',
  standard: 'interface:missionLibrary.difficulty.standard',
  expert: 'interface:missionLibrary.difficulty.expert',
});

const UKRAINIAN_CULTURAL_SPATIAL_REVISION = 'cultural-spatial-triptych-1';
const UKRAINIAN_HORIZON_JOINS_REVISION = 'horizon-cultural-joins-1';
const UKRAINIAN_BORDER_ROUTES_REVISION = 'border-cultural-routes-1';
const UKRAINIAN_BORDER_SIGNAL_ROUTES_REVISION = 'border-signal-cultural-routes-1';
const UKRAINIAN_EARLY_ROUTES_REVISION = 'early-cultural-routes-1';
const UKRAINIAN_SIGNAL_ROUTES_REVISION = 'signal-cultural-routes-1';
const UKRAINIAN_NEON_ROUTES_REVISION = 'neon-cultural-routes-1';
const UKRAINIAN_NEON_FINALE_ROUTES_REVISION = 'neon-cultural-routes-2';
const UKRAINIAN_ROVER_ROUTES_REVISION = 'rover-cultural-routes-1';
const UKRAINIAN_FRACTURE_ROUTES_REVISION = 'fracture-cultural-routes-1';
const UKRAINIAN_PHASEWORKS_ROUTES_REVISION = 'phaseworks-cultural-routes-1';
const UKRAINIAN_LIVEWIRE_ROUTES_REVISION = 'livewire-cultural-routes-1';
const UKRAINIAN_RELAY_ROUTES_REVISION = 'relay-cultural-routes-1';
const UKRAINIAN_CROSSWIND_ROUTES_REVISION = 'crosswind-cultural-routes-1';
const UKRAINIAN_SENTINEL_ROUTES_REVISION = 'sentinel-cultural-routes-1';
const UKRAINIAN_APEX_ROUTES_REVISION = 'apex-cultural-routes-1';

/** Text-only projection of an already resolved manifest. No engine, geometry,
 * image fetching or decoding is needed to describe a mission at its preset. */
export function journeyMissionDetails(manifest) {
  if (!manifest) return null;
  const band = manifest.design?.difficulty?.band;
  const preset = manifest.difficulty;
  if (
    !Number.isInteger(band) ||
    band < 1 ||
    band > 12 ||
    !['gentle', 'standard', 'expert'].includes(preset)
  )
    throw new TypeError('Journey cards need an actual resolved band and preset.');
  return Object.freeze({
    challenge: t('interface:missionLibrary.challenge', {
      band,
      difficulty: t(DIFFICULTY_KEYS[preset]),
    }),
    route: contentText(manifest, 'design.routeDecision'),
    mastery: contentText(manifest, 'design.mastery'),
  });
}

/** Curated, stable authored identities, never keyword guesses or imported IDs. */
export function authoredJourneyMissionTags(mission, manifest) {
  if (mission?.source !== 'candidate' || !manifest) return [];
  const tags = [];
  if (['journey-arcade-v2', 'journey-trail-impact-v3'].includes(manifest.policyId))
    tags.push('Arcade');
  if (WHOLE_JOURNEY_REMIX_PACK_IDS.includes(mission.packId)) tags.push('Remix');
  if (
    (mission.packId === 'ornament-crossings-study' &&
      mission.campaignId === 'ornament-crossings') ||
    (manifest.level?.revision === UKRAINIAN_ORNAMENT_ATLAS_REVISION &&
      UKRAINIAN_ORNAMENT_ATLAS_IDS.includes(mission.levelId))
  )
    tags.push('Ukrainian');
  if (
    [
      UKRAINIAN_CULTURAL_SPATIAL_REVISION,
      UKRAINIAN_HORIZON_JOINS_REVISION,
      UKRAINIAN_BORDER_ROUTES_REVISION,
      UKRAINIAN_BORDER_SIGNAL_ROUTES_REVISION,
      UKRAINIAN_EARLY_ROUTES_REVISION,
      UKRAINIAN_SIGNAL_ROUTES_REVISION,
      UKRAINIAN_NEON_ROUTES_REVISION,
      UKRAINIAN_NEON_FINALE_ROUTES_REVISION,
      UKRAINIAN_ROVER_ROUTES_REVISION,
      UKRAINIAN_FRACTURE_ROUTES_REVISION,
      UKRAINIAN_PHASEWORKS_ROUTES_REVISION,
      UKRAINIAN_LIVEWIRE_ROUTES_REVISION,
      UKRAINIAN_RELAY_ROUTES_REVISION,
      UKRAINIAN_CROSSWIND_ROUTES_REVISION,
      UKRAINIAN_SENTINEL_ROUTES_REVISION,
      UKRAINIAN_APEX_ROUTES_REVISION,
    ].includes(manifest.level?.revision)
  )
    tags.push('Ukrainian');
  if (mission.packId === 'workshop-routing-study' && mission.campaignId === 'workshop-routing')
    tags.push('FPV');
  return tags;
}
