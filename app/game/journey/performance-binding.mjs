import { canonicalJSON } from '../data-json.mjs';
import { CLASSES } from '../core/index.mjs';
import { matchRecordedGameplayTuning, recoverGameplayTuning } from '../gameplay-tuning.mjs';
import { createContentExecutionCatalog } from '../content-design/execution.mjs';
import { journeyMissionId } from './catalog.mjs';
import { resolveEditionSelection } from '../editions/model.mjs';
import { loadRetainedPresentation } from '../editions/retained-presentation.mjs';

const matches = (record, state, level, classes = CLASSES) => {
  const tuning = recoverGameplayTuning(state.level);
  if (!level || !tuning || tuning.adminOverride || tuning.difficulty !== record.difficulty)
    return false;
  return (
    canonicalJSON(state.classRecipes) === canonicalJSON(classes) &&
    matchRecordedGameplayTuning(level, state.level) !== null
  );
};
const sourceMatches = (source, record, state) => {
  const catalog = createContentExecutionCatalog(source, { mode: 'solo' });
  return catalog.entries.some(
    (entry) =>
      entry.difficulty === record.difficulty &&
      entry.manifests.some((manifest) => {
        const id = journeyMissionId({
          source: 'candidate',
          packId: entry.sourcePackId,
          campaignId: entry.campaignId,
          levelId: manifest.missionId,
        });
        return id === record.missionId && matches(record, state, manifest.level);
      }),
  );
};

/** Admit only the current host's exact loaded source or an explicitly registered
 * selected-edition snapshot. No imported names, URLs, or naked history files. */
export function createSoloPerformanceBinding({
  host,
  provider = null,
  fetcher = globalThis.fetch,
  timeoutMs = 10000,
}) {
  return async (record, state, { signal } = {}) => {
    signal?.throwIfAborted();
    const mission = host?.catalog.find(record.missionId);
    const entry = mission && host.select(mission, record.difficulty);
    if (entry && host.owns(entry)) {
      const level = entry.campaign.levels.find((row) => row.id === mission.levelId);
      if (matches(record, state, level, entry.classRecipes)) return true;
    }
    if (!provider) return false;
    const { edition } = resolveEditionSelection(provider.currentCatalog ?? provider.catalog, {
      editionId: provider.editionId,
    });
    if (
      edition.brandId !== provider.selection.edition.brandId ||
      edition.audience !== provider.selection.edition.audience
    )
      return false;
    const controller = new AbortController(),
      abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      for (const descriptor of edition.presentationHistory ?? []) {
        controller.signal.throwIfAborted();
        try {
          const retained = await loadRetainedPresentation(descriptor, {
            edition,
            baseURL: provider.rootURL,
            fetcher,
            signal: controller.signal,
            timeoutMs,
          });
          controller.signal.throwIfAborted();
          if (sourceMatches(retained.bootstrap.source, record, state)) return true;
        } catch {
          controller.signal.throwIfAborted();
        }
      }
      return false;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      controller.abort();
    }
  };
}
