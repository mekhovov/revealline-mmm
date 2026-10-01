import { required, stableId } from '../data-json.mjs';

/** Navigation policy shared by real Solo and paired-board hosts. IDs are an
 * explicit authoring selection, not inferred from titles or imported flags. */
export function createCandidateSequence(catalog, corePackIds, optionalCampaignIds = []) {
  required(
    Array.isArray(corePackIds) &&
      corePackIds.length > 0 &&
      corePackIds.every(stableId) &&
      new Set(corePackIds).size === corePackIds.length &&
      corePackIds.every((id) => catalog.missions.some((mission) => mission.packId === id)),
    'Choose unique existing core packs for this candidate route.',
  );
  const core = catalog.missions.filter((mission) => corePackIds.includes(mission.packId));
  const indices = new Map(core.map((mission, index) => [mission.id, index]));
  required(
    Array.isArray(optionalCampaignIds) &&
      optionalCampaignIds.every(stableId) &&
      new Set(optionalCampaignIds).size === optionalCampaignIds.length &&
      optionalCampaignIds.every((id) => {
        const missions = catalog.missions.filter((mission) => mission.campaignId === id);
        return missions.length > 0 && missions.every((mission) => !indices.has(mission.id));
      }),
    'Choose unique existing optional campaigns outside the core route.',
  );
  const optionalNext = new Map();
  for (const id of optionalCampaignIds) {
    const owners = new Map();
    for (const mission of catalog.missions.filter((item) => item.campaignId === id)) {
      const owner = JSON.stringify([mission.source, mission.packId, mission.campaignId]);
      if (!owners.has(owner)) owners.set(owner, []);
      owners.get(owner).push(mission);
    }
    for (const missions of owners.values())
      missions.forEach((mission, index) =>
        optionalNext.set(mission.id, missions[index + 1] ?? null),
      );
  }
  return Object.freeze({
    isCore: (id) => indices.has(id),
    isOptionalSequence: (id) => optionalNext.has(id),
    next(id) {
      const index = indices.get(id);
      return index === undefined ? (optionalNext.get(id) ?? null) : (core[index + 1] ?? null);
    },
  });
}
