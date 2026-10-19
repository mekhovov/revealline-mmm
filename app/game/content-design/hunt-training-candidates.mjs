import { createOpeningCandidates } from './horizon-candidates.mjs';
import { COMBAT_ACTOR_CATALOG, freezeDesign } from './catalogs.mjs';

export const HUNT_TRAINING_ROUTE_ID = 'humanoid-hunt-v1';
export const HUNT_TRAINING_PACK_ID = 'journey-humanoid-hunt';
export const HUNT_TRAINING_CAMPAIGN_ID = 'humanoid-hunt-training';

const runner = (id, x, y, heading = [1, 0]) => ({
  id,
  role: 'optional-scout',
  tier: 'measured',
  x,
  y,
  heading,
});
const guard = (id, x, y, heading = [0, 1]) => ({
  id,
  role: 'optional-sentry',
  tier: 'measured',
  x,
  y,
  heading,
});

// Deliberate populations and positions, not the random-variant overlay. Keepers
// from the familiar board retain exactly the same capture regions and hazards.
export const HUNT_TRAINING_STAGES = freezeDesign([
  {
    id: 'hunt-first-contact',
    base: 'first-return',
    name: 'First contact',
    mode: 'bonus',
    quota: 0,
    actors: [runner('near-runner', 24.5, 4.5, [0, 1]), runner('far-runner', 38.5, 12.5)],
    coverage: 0.3,
    introduces: 'humanoid-contact',
    route: 'Touch the nearby runner on your first cut, then return to the rail.',
    lesson:
      'Touching a humanoid removes it immediately. No attack button or power-up is needed. The round keeper remains dangerous.',
    counterplay:
      'Choose a short return before leaving the rail. Hunt points are optional here; capture 30% to finish.',
    consequence:
      'A contact earns 100 Hunt points; a captured target earns 50. Hunt points are separate from territory score.',
    mastery: 'Remove a runner by touch and complete the ordinary capture goal.',
  },
  {
    id: 'hunt-cutoff-route',
    base: 'nearby-shore',
    name: 'Cut off the escape',
    mode: 'bonus',
    quota: 0,
    actors: [
      runner('north-runner', 32.5, 7.5, [0, 1]),
      runner('west-runner', 25.5, 17.5, [0, 1]),
      runner('east-runner', 40.5, 17.5, [0, -1]),
    ],
    coverage: 0.45,
    introduces: 'humanoid-interception',
    route:
      'Reach the island and approach the runner from its next exit instead of following every turn.',
    lesson:
      'Runners flee when an active craft is within six cells. Your craft is faster; an interception uses less exposed trail than a long chase.',
    counterplay:
      'Use the island as a return and departure point. The two ordinary keepers still threaten your body and live trail.',
    consequence: 'Connecting the island creates a safe approach to the runners on either flank.',
    mastery: 'Intercept a runner after returning to the island.',
  },
  {
    id: 'hunt-close-the-bay',
    base: 'two-bays',
    name: 'Close the bay',
    mode: 'capture-quota',
    quota: 2,
    actors: [
      runner('west-near', 29.5, 16.5, [-1, 0]),
      runner('west-far', 20.5, 25.5),
      runner('east-near', 42.5, 17.5),
    ],
    coverage: 0.4,
    introduces: 'humanoid-quota',
    route:
      'Use the central return strip to enclose two runners while keeping the ordinary keeper on the other side.',
    lesson:
      'Complete both goals: capture 40% and remove at least two humanoids. Touch and enclosure both count toward the quota.',
    counterplay:
      'Inspect the keeper position before closing a bay. Humanoids do not keep a region unclaimed.',
    consequence:
      'An enclosed humanoid disappears once and awards 50 Hunt points even when several are captured together.',
    mastery: 'Remove two runners in one enclosure.',
  },
  {
    id: 'hunt-break-the-aim',
    base: 'courtyard-return',
    name: 'Break the aim',
    mode: 'capture-quota',
    quota: 2,
    actors: [
      guard('courtyard-guard', 31.5, 16.5),
      runner('inside-runner', 40.5, 21.5, [-1, 0]),
      runner('outside-runner', 19.5, 20.5, [0, -1]),
    ],
    coverage: 0.35,
    introduces: 'humanoid-guard',
    route:
      'Let the guard lock its warning, change direction, then use the courtyard return to approach it.',
    lesson:
      'A guard aims at a fixed point before firing. Its body is removable by one touch; its shot can hurt an exposed craft.',
    counterplay:
      'Move away from the warning line or reach reclaimed ground. Ordinary keepers remain dangerous inside and outside the courtyard.',
    consequence:
      'Removing a guard also removes its remaining shots. Reach 35% capture and two eliminations to finish.',
    mastery: 'Evade a warning and remove its guard without losing a life.',
  },
  {
    id: 'hunt-island-roundup',
    base: 'stepping-stones',
    name: 'Island roundup',
    mode: 'capture-quota',
    quota: 3,
    actors: [
      runner('near-island', 18.5, 10.5, [0, 1]),
      runner('middle-island', 28.5, 24.5),
      runner('far-island', 49.5, 9.5),
      guard('middle-guard', 39.5, 17.5),
      guard('far-guard', 60.5, 13.5, [-1, 0]),
    ],
    coverage: 0.5,
    introduces: null,
    route:
      'Connect the stepping stones, intercept one runner and enclose another while planning around guard warnings.',
    lesson:
      'Combine the same contact, enclosure and fixed-aim rules. Any three of the five humanoids satisfy the quota.',
    counterplay:
      'Keep an island return nearby and distinguish humanoids from the two retaining keepers.',
    consequence:
      'Every new return can shorten a chase or provide cover; capture 50% as well as meeting the quota.',
    mastery: 'Finish with both a contact elimination and an enclosure elimination.',
  },
  {
    id: 'hunt-final-roundup',
    base: 'long-way-home',
    name: 'The final roundup',
    mode: 'hunt',
    quota: 6,
    actors: [
      runner('west-runner', 19.5, 17.5, [0, 1]),
      runner('north-runner', 26.5, 12.5),
      runner('east-runner', 50.5, 16.5, [0, -1]),
      runner('south-runner', 41.5, 24.5, [-1, 0]),
      guard('north-guard', 45.5, 7.5),
      guard('south-guard', 26.5, 29.5, [0, -1]),
    ],
    coverage: 0.5,
    introduces: 'humanoid-hunt-objective',
    route: 'Choose your circuit through the four landings and remove all six humanoids.',
    lesson:
      'This dedicated Hunt ends when the finite population is gone. There is no required capture percentage.',
    counterplay:
      'Capture still creates useful returns and removes enclosed targets. Keepers remain dangerous and cannot be hunted.',
    consequence:
      'Each contact or enclosure advances the same six-target objective. Targets never respawn.',
    mastery:
      'Clear all six targets without losing a life, choosing contact when its extra points justify the route.',
  },
]);

/** Explicit successor chapter. No existing mission, campaign, route, score or
 * suspended-flight identity is rewritten; pictures retain their original pins. */
export function createHuntTrainingCandidates({ artwork = true } = {}) {
  const opening = createOpeningCandidates({ artwork });
  const project = {
    ...opening,
    id: 'humanoid-hunt-training-project',
    revision: 'hunt-training-1',
    name: 'Hunt lessons',
    actorCatalogId: COMBAT_ACTOR_CATALOG.id,
    maps: [],
    missions: [],
    campaigns: [
      {
        format: 'CampaignDesignV1',
        id: HUNT_TRAINING_CAMPAIGN_ID,
        revision: '1',
        name: 'Hunt lessons · six familiar boards',
        band: 1,
        missionIds: HUNT_TRAINING_STAGES.map((stage) => stage.id),
      },
    ],
    packs: [
      {
        format: 'PackDesignV1',
        id: HUNT_TRAINING_PACK_ID,
        revision: '1',
        name: 'Hunt lessons',
        campaignIds: [HUNT_TRAINING_CAMPAIGN_ID],
      },
    ],
  };
  for (const [index, stage] of HUNT_TRAINING_STAGES.entries()) {
    const base = opening.missions.find((mission) => mission.id === stage.base);
    const map = structuredClone(opening.maps.find((map) => map.id === base.map.id));
    map.id = `${stage.id}-map`;
    map.revision = '1';
    map.name = stage.name;
    project.maps.push(map);
    project.missions.push({
      ...structuredClone(base),
      id: stage.id,
      revision: '1',
      name: stage.name,
      map: { id: map.id, revision: map.revision },
      actors: [...structuredClone(base.actors), ...structuredClone(stage.actors)],
      combat: { version: 'mission-combat.v1', enabled: true },
      hunt: {
        version: 'humanoid-hunt.v1',
        mode: stage.mode,
        quota: stage.quota,
        targets: stage.actors.map((actor) => ({
          id: actor.id,
          kind: actor.role === 'optional-sentry' ? 'guard' : 'runner',
        })),
      },
      coverage: stage.coverage,
      design: {
        routeDecision: stage.route,
        lesson: stage.lesson,
        counterplay: stage.counterplay,
        captureConsequence: stage.consequence,
        memorableMoment: stage.mastery,
        mastery: stage.mastery,
        introduces: stage.introduces ? [stage.introduces] : [],
        practices: ['enemy-seeded-closure', ...(index ? ['humanoid-contact'] : [])],
        combines: index >= 4 ? ['humanoid-contact', 'humanoid-quota', 'humanoid-guard'] : [],
        durationSeconds: [30, 150],
        difficulty: {
          band: index < 3 ? 1 : 2,
          planning: index < 2 ? 1 : 2,
          execution: index < 3 ? 1 : 2,
          threatDensity: index < 3 ? 1 : 2,
          timePressure: 0,
          mechanicLoad: index < 3 ? 1 : 2,
          coordination: 0,
        },
      },
    });
  }
  const used = new Set(project.missions.map((mission) => mission.presentation.backgroundAssetId));
  project.assets = (opening.assets ?? []).filter((asset) => used.has(asset.id));
  return project;
}
