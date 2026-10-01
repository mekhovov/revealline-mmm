import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { createContentExecutionCatalog } from '../content-design/execution.mjs';
import { hashPresentationBytes } from './bundle.mjs';
import { snapshotVisualThemeContext } from './visual-theme-catalogue.mjs';
import { publishedSourceAuthority } from '../content-design/published-journey.mjs';

const bounds = Object.freeze({
  maxBytes: 4 * 1024 * 1024,
  maxNodes: 100000,
  maxDepth: 20,
  maxArray: 512,
});
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Journey theme preparation cancelled.', 'AbortError');
};
const sha = (value) => hashPresentationBytes(new TextEncoder().encode(canonicalJSON(value)));

/** Rebuild the accepted project's existing execution authority once. This adapter
 * authenticates neither imported authorship nor official progression. Its source
 * hash scopes visual compatibility; it is never a new save/progress key.
 */
export async function createJourneyVisualThemeIdentityAdapter(source, { mode, signal } = {}) {
  abort(signal);
  required(['solo', 'versus', 'team'].includes(mode), 'Choose an explicit Journey mode.');
  const project = boundedJSON(source, bounds);
  const catalogue = createContentExecutionCatalog(project, { mode });
  const published = publishedSourceAuthority(source);
  required(
    !published ||
      (published.projectId === project.id && published.projectRevision === project.revision),
    'Published chapter project authority differs.',
  );
  const projectSha256 = published?.projectSha256 ?? (await sha(project));
  abort(signal);
  const adapter = Object.freeze({
    async prepareHostSelection({ host, selection, level, association }, options = {}) {
      abort(options.signal);
      required(
        host &&
          typeof host.owns === 'function' &&
          host.owns(selection) &&
          typeof host.visualThemeSelection === 'function',
        'Use an owned Journey host selection.',
      );
      const selected = host.visualThemeSelection(selection, level);
      required(selected, 'The selected level does not belong to this Journey host selection.');
      return adapter.prepare({ ...selected, association }, options);
    },
    async prepare({ entry: supplied, level: selected, association: declared }, { signal } = {}) {
      abort(signal);
      const association = boundedJSON(declared, { maxBytes: 2048, maxNodes: 16, maxString: 128 });
      exactKeys(association, ['editionId', 'contentThemeId', 'mode'], 'Journey association');
      required(
        stableId(association.editionId) &&
          stableId(association.contentThemeId) &&
          association.mode === mode,
        'Use the code-owned association for this Journey mode.',
      );
      const entry = boundedJSON(supplied, bounds);
      const level = boundedJSON(selected, bounds);
      const accepted = catalogue.find(entry.sourcePackId, entry.campaignId, entry.executionKey);
      required(
        accepted && canonicalJSON(accepted) === canonicalJSON(entry),
        'Journey execution differs from its accepted source project.',
      );
      const index = accepted.campaign.levels.findIndex(
        (candidate) => canonicalJSON(candidate) === canonicalJSON(level),
      );
      required(index >= 0, 'Selected Journey map differs from its execution owner.');
      const standard = catalogue.select(entry.sourcePackId, entry.campaignId, 'standard');
      const original = standard.manifests[index];
      required(original && original.missionId === level.id, 'Journey authored membership changed.');
      const levelSha256 = await sha(original.level);
      abort(signal);
      return snapshotVisualThemeContext({
        ...association,
        owner: {
          kind: 'journey',
          projectId: project.id,
          projectRevision: project.revision,
          projectSha256,
          packId: standard.sourcePackId,
          campaignId: standard.campaignId,
          baseCampaignKey: standard.baseCampaignKey,
          policyId: standard.policyVersion,
        },
        level: {
          id: original.level.id,
          revision: original.level.revision,
          sha256: levelSha256,
          simulationIdentity: original.simulationIdentity,
        },
      });
    },
  });
  return adapter;
}
