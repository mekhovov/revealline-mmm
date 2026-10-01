import { TRAIL_IMPACT_JOURNEY_POLICY } from './catalogs.mjs';
import { compileContentProject } from './project.mjs';
import { createTeamSpatialOriginalCandidates } from './team-spatial-originals.mjs';

export const TEAM_IMPACT_PROFILE_KEY = 'team-trail-impact-originals-1';

/** Successor execution edition. It preserves the twelve accepted Team maps,
 * pictures, actors and objectives while giving every unfinished cut an owned
 * travelling-impact contract. Earlier Team rules and receipts stay immutable. */
export function createTeamImpactOriginalCandidates() {
  const source = createTeamSpatialOriginalCandidates();
  source.id = 'team-impact-originals-review';
  source.revision = 'owned-trail-impact-1';
  source.name = 'Team Journey · owned travelling impacts · balance review pending';
  source.policyId = TRAIL_IMPACT_JOURNEY_POLICY.id;
  for (const [index, mission] of source.missions.entries()) {
    mission.revision = source.revision;
    mission.team = { ...mission.team, format: 'TeamMissionV5' };
    const introduces = new Set(mission.design.introduces);
    const practices = new Set(mission.design.practices);
    if (index === 1) introduces.add('travelling-trail-impact');
    else if (index > 1) practices.add('travelling-trail-impact');
    mission.design = {
      ...mission.design,
      lesson:
        index === 1
          ? 'A hit on either unfinished Team line sends visible fronts along that player’s current cut. Bank it before the craft-bound front arrives.'
          : mission.design.lesson,
      introduces: [...introduces],
      practices: [...practices],
    };
  }
  for (const item of [...source.campaigns, ...source.packs]) item.revision = source.revision;
  return structuredClone(compileContentProject(source).source);
}
