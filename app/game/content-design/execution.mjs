import { boundedJSON, exactKeys, required, stableId, dataIdentity } from '../data-json.mjs';
import { campaignKey } from '../library.mjs';
import { resolveContentJourney } from './journey.mjs';
import { compileContentProject } from './project.mjs';
import { freezeDesign, journeyPreset } from './catalogs.mjs';

/** Host-facing candidate executions. Each preset is resolved from authored source,
 * never projected from another execution (in particular, never Legacy Gentle).
 * This does not install content, load media, or authorize official progress. */
export function createContentExecutionCatalog(source, options = {}) {
  const selected = boundedJSON(options, { maxBytes: 8192, maxNodes: 100, maxDepth: 3 });
  exactKeys(selected, ['packIds', 'mode'], 'candidate execution selection');
  const project = compileContentProject(source);
  const journeys = new Map(
    Object.keys(project.difficulty.presets).map((difficulty) => [
      difficulty,
      resolveContentJourney(project, { ...selected, difficulty }),
    ]),
  );
  const standard = journeys.get('standard');
  // Team has a separately versioned simulation, not Solo level normalization.
  // resolveContentJourney has already validated each exact immutable pack.
  const executionIdentity =
    standard.mode === 'team'
      ? (pack) => `${pack.id}/${encodeURIComponent(pack.revision)}/${dataIdentity(pack)}`
      : campaignKey;
  const entries = [],
    byKey = new Map(),
    byBase = new Map();
  for (const base of standard.campaigns) {
    const baseCampaignKey = executionIdentity(base.runtime),
      campaignFeedback = project.source.campaigns.find((item) => item.id === base.campaignId)
        ?.discovery?.feedback;
    // Shared campaign membership can appear in several packs. Keep ownership
    // explicit, rather than silently selecting the first identically named one.
    const owner = `${base.packId}/${base.campaignId}`;
    for (const [difficulty, journey] of journeys) {
      const resolved = journey.campaigns.find(
        (entry) => entry.packId === base.packId && entry.campaignId === base.campaignId,
      );
      required(resolved, 'Preset campaign membership changed.');
      const executionKey = executionIdentity(resolved.runtime);
      const entry = freezeDesign({
        campaign: resolved.runtime,
        baseCampaign: base.runtime,
        baseCampaignKey,
        executionKey,
        difficulty,
        policyVersion: standard.policyId,
        sourceProjectId: standard.projectId,
        sourcePackId: base.packId,
        campaignId: base.campaignId,
        manifests: resolved.manifests,
        ...(campaignFeedback ? { campaignFeedback } : {}),
        officialProgressEligible: false,
      });
      entries.push(entry);
      const key = `${owner}/${executionKey}`;
      required(!byKey.has(key), 'Duplicate candidate execution owner.');
      byKey.set(key, entry);
      if (!byBase.has(owner)) byBase.set(owner, new Map());
      byBase.get(owner).set(difficulty, entry);
    }
  }
  return Object.freeze({
    entries: Object.freeze(entries),
    officialProgressEligible: false,
    journey(difficulty = 'standard') {
      journeyPreset(difficulty, project.difficulty.id);
      return journeys.get(difficulty);
    },
    select(packId, campaignId, difficulty = 'standard') {
      journeyPreset(difficulty, project.difficulty.id);
      if (!stableId(packId) || !stableId(campaignId)) return null;
      return byBase.get(`${packId}/${campaignId}`)?.get(difficulty) ?? null;
    },
    find(packId, campaignId, executionKey) {
      if (!stableId(packId) || !stableId(campaignId) || typeof executionKey !== 'string')
        return null;
      return byKey.get(`${packId}/${campaignId}/${executionKey}`) ?? null;
    },
  });
}
