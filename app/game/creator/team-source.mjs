import { boundedJSON, canonicalJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import { createContentExecutionCatalog } from '../content-design/execution.mjs';
import { compileContentProject } from '../content-design/project.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import { createCoop } from '../coop/core.mjs';

export const CREATOR_TEAM_SOURCE_PROVENANCE = 'revealline-creator-team-source.v1';
export const CREATOR_TEAM_SOURCE_PORTABLE = 'revealline-creator-team-portable.v2';
const admitted = new Map();
const limits = { maxBytes: 768 * 1024, maxNodes: 50000, maxDepth: 24, maxArray: 4096 };
function execution(source, { sourcePackId, campaignId, difficulty }) {
  const project = compileContentProject(source);
  const catalogue = createContentExecutionCatalog(project.source, { mode: 'team' });
  const entry = catalogue.select(sourcePackId, campaignId, difficulty);
  required(entry, 'Choose an accepted native Team source campaign and difficulty.');
  // Admission uses the native constructor, without inventing completion evidence.
  for (const level of entry.campaign.levels) createCoop(level, { seed: 17, difficulty });
  return { entry, source: project.source };
}
export function creatorTeamSourceSelection(source, selection) {
  const { entry, source: accepted } = execution(source, selection);
  return freezeDesign({
    pack: entry.campaign,
    provenance: {
      format: CREATOR_TEAM_SOURCE_PROVENANCE,
      sourceProject: accepted,
      sourcePackId: entry.sourcePackId,
      campaignId: entry.campaignId,
      difficulty: entry.difficulty,
      executionKey: entry.executionKey,
    },
  });
}
export function validateCreatorTeamSource(pack, provenanceSource) {
  const provenance = boundedJSON(provenanceSource, limits);
  pack = boundedJSON(pack, { ...limits, maxBytes: 1024 * 1024 });
  exactKeys(
    provenance,
    ['format', 'sourceProject', 'sourcePackId', 'campaignId', 'difficulty', 'executionKey'],
    'Team source provenance',
  );
  required(
    provenance.format === CREATOR_TEAM_SOURCE_PROVENANCE,
    'Unsupported Team source provenance.',
  );
  const key = canonicalJSON({ pack, provenance });
  if (admitted.has(key)) return admitted.get(key);
  const { entry, source } = execution(provenance.sourceProject, provenance);
  required(
    entry.executionKey === provenance.executionKey &&
      canonicalJSON(entry.campaign) === canonicalJSON(pack),
    'Team runtime differs from its accepted source campaign.',
  );
  const accepted = freezeDesign({
    pack: entry.campaign,
    provenance: { ...provenance, sourceProject: source },
  });
  if (admitted.size >= 8) admitted.delete(admitted.keys().next().value);
  admitted.set(key, accepted);
  return accepted;
}
export function creatorTeamSourceEvidence(pack, provenance) {
  return freezeDesign(
    pack.levels.map((level) => ({
      format: 'revealline-creator-team-source-admission.v1',
      levelId: level.id,
      levelIdentity: dataIdentity(level),
      sourceIdentity: dataIdentity(provenance.sourceProject),
      difficulty: provenance.difficulty,
      qualification: 'structural-only',
      officialProgressEligible: false,
    })),
  );
}
