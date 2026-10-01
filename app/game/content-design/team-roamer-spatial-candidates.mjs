import { createTeamRoamerCandidates } from './team-roamer-candidates.mjs';
import { withPressureDifficulty } from './pressure-candidates.mjs';
import { compileContentProject } from './project.mjs';

const rect = (x, y, w, h) => ({ x, y, w, h });
const keeper = (id, x, y, heading) => ({
  id,
  role: 'field-keeper',
  tier: 'measured',
  x,
  y,
  heading,
});
const roamer = (id, x, y, heading) => ({
  id,
  role: 'reclaimed-roamer',
  tier: 'measured',
  x,
  y,
  heading,
});

/** Original geometry successors, not replacements for published/recorded maps.
 * The shared Studio import/compiler/export path remains the only authoring path.
 * No new Team rule, altered warning, private speed, quota inflation or enrollment. */
export function createTeamRoamerSpatialCandidates() {
  const project = withPressureDifficulty(createTeamRoamerCandidates());
  const ids = new Set(['shared-lookout', 'twin-depots']);
  project.id = 'team-roamer-spatial-review';
  project.revision = 'return-network-1';
  project.name = 'Team changing returns · unvalidated spatial study';
  project.missions = project.missions.filter((mission) => ids.has(mission.id));
  const mapIds = new Set(project.missions.map((mission) => mission.map.id));
  project.maps = project.maps.filter((map) => mapIds.has(map.id));
  for (const mission of project.missions) {
    const map = project.maps.find((item) => item.id === mission.map.id);
    map.revision = mission.revision = mission.map.revision = 'return-network-1';
    if (mission.id === 'shared-lookout') {
      map.foundations.push(rect(32, 15, 8, 6));
      map.walls = [rect(5, 16, 22, 2), rect(45, 18, 22, 2)];
      mission.actors = [
        keeper('keeper-1', 25.5, 5.5, [1, 1]),
        keeper('keeper-2', 46.5, 30.5, [-1, -1]),
        roamer('roamer-1', 6.5, 10.5, [-1, 0]),
      ];
      Object.assign(mission.design, {
        routeDecision:
          'Take the short outside return and wake its roamer, or connect toward the middle landing before opening that escape?',
        lesson:
          'A quick return can become a shared patrol route. The full one-second wake warning gives time to choose a fresh departure.',
        counterplay:
          'The tracked body marks the western outside route. Prepare another exit, turn along the perimeter after banking, or have your partner connect the middle landing before you return through the changed ground. Baffles are walls, never returns.',
        captureConsequence:
          'The short western connection wakes a non-retaining roamer; broader enclosures expand its reclaimed movement domain. The central landing offers a different next return.',
        memorableMoment:
          'The line that rescued one craft becomes a moving threat while a partner opens a second approach.',
        mastery:
          'Activate the roamer before clearing, with a closure from each craft and no knockdowns.',
        combines: ['complementary-routes', 'changing-ground', 'shared-return-network'],
      });
    } else {
      map.foundations.push(rect(30, 14, 3, 8), rect(39, 14, 3, 8));
      map.walls.push(rect(25, 10, 2, 16), rect(45, 10, 2, 16));
      mission.actors = [
        keeper('keeper-1', 8.5, 5.5, [1, 1]),
        keeper('keeper-2', 63.5, 30.5, [-1, -1]),
        keeper('inner-keeper-1', 30.5, 27.5, [-1, -1]),
        keeper('inner-keeper-2', 41.5, 8.5, [1, 1]),
        roamer('roamer-1', 6.5, 17.5, [-1, 0]),
        roamer('roamer-2', 65.5, 17.5, [1, 0]),
      ];
      Object.assign(mission.design, {
        routeDecision:
          'Wake the outer return patrols for quick perimeter access, or wrap the inner baffles to establish receiver landings first?',
        lesson:
          'Each chamber offers a short changing return and a longer inner connection; opening one chamber never clears the other occupied field.',
        counterplay:
          'The top and bottom baffle ends stay open. Watch both local keepers before crossing; after waking a roamer, turn onto a different return rather than waiting on its new rail. Either partner may travel around the divider to help.',
        captureConsequence:
          'An inner landing shortens a later cut without banking against a wall. Outer returns introduce reclaimed-ground pressure, and two retainers keep each chamber contested until deliberately enclosed.',
        memorableMoment:
          'A quick outside escape and a protected inner receiver become two different ways to reopen the same depot.',
        mastery:
          'Activate both roamers, with each craft closing in its starting chamber and no knockdowns.',
        combines: ['complementary-routes', 'changing-ground', 'shared-return-network'],
      });
      mission.design.difficulty.threatDensity = 6;
      mission.design.difficulty.planning = 6;
    }
  }
  for (const campaign of project.campaigns) {
    campaign.revision = 'return-network-1';
    campaign.missionIds = campaign.missionIds.filter((id) => ids.has(id));
    campaign.name = 'Changing returns · spatial study';
  }
  for (const pack of project.packs) {
    pack.revision = 'return-network-1';
    pack.name = project.name;
  }
  return structuredClone(compileContentProject(project).source);
}
