import { boundedJSON, stableId } from '../data-json.mjs';

export const JOURNEY_CATALOG_VERSION = 'revealline-journey-catalog.v1';
export const JOURNEY_MODES = Object.freeze(['solo', 'versus', 'team']);

/** Display names, application versions and array positions never identify a mission. */
export function journeyMissionId({ source = 'official', packId = null, campaignId, levelId }) {
  if (
    !stableId(source) ||
    (packId !== null && !stableId(packId)) ||
    !stableId(campaignId) ||
    !stableId(levelId)
  )
    throw new TypeError('A Journey mission needs stable source, pack, campaign and level IDs.');
  return [source, packId ?? '_base', campaignId, levelId].map(encodeURIComponent).join('/');
}

/** Navigation metadata only. Hosts must validate exact gameplay before activation. */
export function createJourneyCatalog(campaigns) {
  const owned = boundedJSON(campaigns, {
    maxBytes: 2 * 1024 * 1024,
    maxNodes: 50000,
    maxArray: 4096,
    maxDepth: 12,
    maxString: 1024,
  });
  if (!Array.isArray(owned)) throw new TypeError('Journey campaigns must be an array.');
  const missions = [],
    byId = new Map();
  const label = (value) => typeof value === 'string' && value.trim() && value.length <= 160;
  for (const campaign of owned) {
    if (!label(campaign.title) || !Array.isArray(campaign.levels) || !campaign.levels.length)
      throw new TypeError('A Journey campaign needs a title and missions.');
    for (const [levelIndex, level] of campaign.levels.entries()) {
      const id = journeyMissionId({
        source: campaign.source ?? 'official',
        packId: campaign.packId ?? null,
        campaignId: campaign.id,
        levelId: level.id,
      });
      const modes = level.modes ?? campaign.modes ?? ['solo', 'versus'];
      if (
        !label(level.name) ||
        !Array.isArray(modes) ||
        !modes.length ||
        new Set(modes).size !== modes.length ||
        !modes.every((mode) => JOURNEY_MODES.includes(mode)) ||
        byId.has(id)
      )
        throw new TypeError(`Invalid or duplicate Journey mission: ${id}`);
      const mission = Object.freeze({
        id,
        source: campaign.source ?? 'official',
        packId: campaign.packId ?? null,
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        levelId: level.id,
        levelIndex,
        name: level.name,
        hook: typeof level.hook === 'string' ? level.hook : '',
        modes: Object.freeze([...modes]),
      });
      missions.push(mission);
      byId.set(id, mission);
    }
  }
  if (missions.length > 4096) throw new TypeError('Journey contains too many missions.');
  const modeMissions = (mode) => {
    if (!JOURNEY_MODES.includes(mode)) throw new TypeError('Unknown Journey mode.');
    return missions.filter((mission) => mission.modes.includes(mode));
  };
  return Object.freeze({
    version: JOURNEY_CATALOG_VERSION,
    missions: Object.freeze(missions),
    find: (id) => byId.get(id) ?? null,
    forMode: (mode) => Object.freeze(modeMissions(mode)),
    next(id, mode = 'solo') {
      const available = modeMissions(mode),
        index = available.findIndex((mission) => mission.id === id);
      return index < 0 ? null : (available[index + 1] ?? null);
    },
    search(query = '', { mode = 'solo', campaignId = null } = {}) {
      const words = String(query).trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
      return modeMissions(mode).filter((mission) => {
        if (campaignId && mission.campaignId !== campaignId) return false;
        const text = `${mission.name} ${mission.campaignTitle} ${mission.levelId} ${mission.hook}`
          .normalize('NFKC')
          .toLocaleLowerCase();
        return words.every((word) => text.includes(word.normalize('NFKC')));
      });
    },
  });
}

/** Exclude historical editions at the caller: never classify an import by its name. */
export function journeyFromPackCatalog(baseCampaign, catalog) {
  return createJourneyCatalog([
    {
      id: baseCampaign.id,
      title: baseCampaign.title || baseCampaign.name || baseCampaign.id,
      levels: baseCampaign.levels.map(({ id, name }) => ({ id, name })),
    },
    ...catalog.packs.flatMap((pack) =>
      pack.campaigns.map((campaign) => ({
        id: campaign.id,
        title: campaign.title || pack.name,
        packId: pack.id,
        levels: campaign.levels,
      })),
    ),
  ]);
}
