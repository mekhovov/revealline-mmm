import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { createDifficultyContext } from '../campaign-difficulty.mjs';
import { EXECUTION_CATALOG_LIMITS } from '../campaign-contexts.mjs';
import { COOP_PACK_MAX_BYTES, validateCoopPack } from '../coop/recipes.mjs';
import { hashPresentationBytes } from './bundle.mjs';
import { snapshotVisualThemeContext } from './visual-theme-catalogue.mjs';

const campaignBounds = Object.freeze({
  maxBytes: EXECUTION_CATALOG_LIMITS.entryBytes,
  maxNodes: EXECUTION_CATALOG_LIMITS.entryNodes,
  maxDepth: 24,
  maxArray: 4096,
  maxString: 6 * 1024 * 1024,
});
const teamBounds = Object.freeze({
  maxBytes: COOP_PACK_MAX_BYTES,
  maxNodes: 200000,
  maxDepth: 18,
  maxArray: 4096,
  maxString: 8192,
});
const abort = (signal) => {
  if (signal?.aborted)
    throw new DOMException('Theme identity preparation cancelled.', 'AbortError');
};
function association(source, modes) {
  const value = boundedJSON(source, { maxBytes: 2048, maxNodes: 16, maxString: 128 });
  exactKeys(value, ['editionId', 'contentThemeId', 'mode'], 'theme content association');
  required(
    stableId(value.editionId) && stableId(value.contentThemeId) && modes.includes(value.mode),
    'Use the code-owned edition, content theme and supported mode.',
  );
  return value;
}
const sha = (value) => hashPresentationBytes(new TextEncoder().encode(canonicalJSON(value)));
const memberIndex = (levels, level) => {
  const key = canonicalJSON(level);
  const index = levels.findIndex((candidate) => canonicalJSON(candidate) === key);
  required(index >= 0, 'Selected map differs from its accepted content owner.');
  return index;
};

/** Legacy standard/gentle execution owners only. Pass the authored execution
 * level, never the mutable run, and a trusted edition association. This does
 * not authenticate installed packs, select visuals or grant progression.
 */
export async function prepareCampaignVisualThemeContext(
  { entry: source, level: selected, association: declared },
  { signal } = {},
) {
  abort(signal);
  const scope = association(declared, ['solo', 'versus']);
  const entry = boundedJSON(source, campaignBounds);
  const level = boundedJSON(selected, campaignBounds);
  required(['standard', 'gentle'].includes(entry.difficulty), 'Unsupported execution owner.');
  const context = createDifficultyContext(entry.baseCampaign, entry.difficulty);
  required(
    entry.baseCampaignKey === context.baseCampaignKey &&
      entry.executionKey === context.campaignKey &&
      entry.policyVersion === context.policyVersion &&
      canonicalJSON(entry.campaign) === canonicalJSON(context.campaign),
    'Theme execution owner differs from its verified authored campaign.',
  );
  required(
    entry.activity !== 'challenge',
    'Dated challenges need a separate theme identity adapter.',
  );
  const index = memberIndex(context.campaign.levels, level);
  const original = entry.baseCampaign.levels[index];
  const sha256 = await sha(original);
  abort(signal);
  return snapshotVisualThemeContext({
    ...scope,
    owner: { kind: 'campaign', baseCampaignKey: context.baseCampaignKey },
    level: { id: original.id, revision: original.revision, sha256 },
  });
}

/** Team identities retain the entire accepted pack, not just a same-ID map.
 * Presentation stays outside historical level/pack objects and save readers.
 */
export async function prepareTeamVisualThemeContext(
  { pack: source, level: selected, association: declared },
  { signal } = {},
) {
  abort(signal);
  const scope = association(declared, ['team']);
  const pack = boundedJSON(source, teamBounds);
  const level = boundedJSON(selected, teamBounds);
  const validation = validateCoopPack(pack);
  required(validation.valid, `Invalid Team theme owner: ${validation.errors.join('; ')}`);
  const original = pack.levels[memberIndex(pack.levels, level)];
  const [packSha256, levelSha256] = await Promise.all([sha(pack), sha(original)]);
  abort(signal);
  return snapshotVisualThemeContext({
    ...scope,
    owner: { kind: 'team-pack', id: pack.id, revision: pack.revision, sha256: packSha256 },
    level: { id: original.id, revision: original.revision, sha256: levelSha256 },
  });
}
