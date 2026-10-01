import { mergeEditionProjects } from '../bootstrap.mjs';
const ROUTE_ID = "coupa-all";
let loading;
const seatIds = Object.freeze(['coupa-seat-one', 'coupa-seat-two']);
function multiplayerProject(source) {
  const maps = source.maps.map((map) => {
    const primary = map.spawns.find((spawn) => spawn.id === source.missions.find((mission) =>
      mission.map.id === map.id && mission.map.revision === map.revision)?.spawnId) ?? map.spawns[0];
    const x1 = Math.max(.5, Math.min(map.width - 2.5, primary.x - 1));
    const x2 = Math.min(map.width - .5, x1 + 2);
    const { gates, speedZones, ...base } = map;
    return { ...base, format: 'MapDesignV1', terrain: [], spawns: [
      ...map.spawns.filter((spawn) => !seatIds.includes(spawn.id)),
      { id: seatIds[0], x: x1, y: primary.y },
      { id: seatIds[1], x: x2, y: primary.y },
    ] };
  });
  const missions = source.missions.map((mission) => ({
    ...mission,
    format: 'MissionDesignV1',
    spawnId: seatIds[0],
    modes: ['team', 'versus'],
    team: { format: 'TeamMissionV1', spawnIds: [...seatIds] },
    actors: mission.actors.filter((actor) => actor.role === 'field-keeper'),
    objectives: [],
    bonuses: [],
    timeLimitSeconds: 0,
    design: { ...mission.design, difficulty: {
      ...mission.design.difficulty,
      coordination: Math.max(1, mission.design.difficulty.coordination ?? 0),
      timePressure: 0,
    } },
  })).map(({ combat, timedBonuses, encounter, relayLinks, ...mission }) => mission);
  return { ...source, id: 'edition-' + ROUTE_ID + '-multiplayer', maps, missions };
}
async function readJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new TypeError('The Coupa multiplayer campaign is unavailable.');
  return response.json();
}
export async function loadAuthoredJourneyRoute(id) {
  if (id !== ROUTE_ID) return null;
  return loading ??= (async () => {
    const catalogURL = new URL('../../../edition-catalog.json', import.meta.url);
    const runtime = await readJSON(catalogURL);
    const edition = runtime.editions.find((entry) => entry.id === ROUTE_ID);
    if (!edition) throw new TypeError('The Coupa multiplayer edition is unavailable.');
    const campaigns = edition.campaignIds.map((campaignId) =>
      runtime.campaigns.find((entry) => entry.id === campaignId));
    if (campaigns.some((entry) => !entry))
      throw new TypeError('The Coupa multiplayer campaign list is incomplete.');
    const sources = await Promise.all(campaigns.map((entry) =>
      readJSON(new URL(entry.sourcePath, catalogURL))));
    const source = multiplayerProject(mergeEditionProjects({ edition, campaigns }, sources));
    return Object.freeze({
      id: ROUTE_ID,
      label: edition.name,
      profileKey: ROUTE_ID + '-multiplayer',
      sessionKey: "revealline-mmm" + '.suspended.multiplayer.v1',
      source,
      corePackIds: Object.freeze(source.packs.map((entry) => entry.id)),
      optionalCampaignIds: Object.freeze([]),
      preserveOriginalThemes: true,
    });
  })();
}
