import { createTeamPressureOriginalCandidates } from './team-pressure-originals.mjs';
import { createTeamRoamerSpatialCandidates } from './team-roamer-spatial-candidates.mjs';
import { compileContentProject } from './project.mjs';

export const TEAM_SPATIAL_PROFILE_KEY = 'team-spatial-originals-1';

/** Exact two-map spatial donors in the continuous twelve-mission picture route.
 * Old editions remain immutable. Only the affected campaign/pack gains a new
 * execution revision; no new rule, quota, speed or artwork interpretation. */
export function createTeamSpatialOriginalCandidates() {
  const source = createTeamPressureOriginalCandidates();
  const donor = createTeamRoamerSpatialCandidates();
  const changed = new Set(donor.missions.map((m) => m.id));
  source.id = 'team-spatial-originals-review';
  source.revision = 'return-network-1';
  source.name = 'Team Journey · changing returns · human validation pending';
  for (const mission of donor.missions) {
    const index = source.missions.findIndex((m) => m.id === mission.id);
    const presentation = source.missions[index].presentation;
    source.missions[index] = { ...structuredClone(mission), presentation };
    const map = donor.maps.find((m) => m.id === mission.map.id);
    source.maps[source.maps.findIndex((m) => m.id === map.id)] = structuredClone(map);
  }
  const campaigns = new Set();
  for (const campaign of source.campaigns)
    if (campaign.missionIds.some((id) => changed.has(id))) {
      campaign.revision = 'return-network-1';
      campaigns.add(campaign.id);
    }
  for (const pack of source.packs)
    if (pack.campaignIds.some((id) => campaigns.has(id))) pack.revision = 'return-network-1';
  return structuredClone(compileContentProject(source).source);
}
