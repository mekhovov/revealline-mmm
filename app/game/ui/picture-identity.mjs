import { t } from '../i18n/index.mjs';
import { createDifficultyContext } from '../campaign-difficulty.mjs';
import { normalizedLevel } from '../core/level.mjs';
import { CLASSES } from '../core/registry.mjs';
import { createExecutionCatalog, isOwnedExecutionEntries } from '../campaign-contexts.mjs';
import { createMediaIdentityCatalog } from '../media-library.mjs';
import { hydrateStoredStillMedia } from '../media-storage-record.mjs';
import { campaignKey } from '../library.mjs';
import { resolvePackCampaign } from '../packs.mjs';
import { canonicalJSON, required } from '../data-json.mjs';

const ownedPictureCatalogs = new WeakMap();

/** Presentation owners only: strip art, merge exact bases and real theme IDs.
 * Retained owners provide validation context, never install playable content. */
export function createPictureIdentityCatalog({ entries = [], metadata } = {}) {
  const cacheable = metadata === undefined && isOwnedExecutionEntries(entries);
  if (cacheable && ownedPictureCatalogs.has(entries)) return ownedPictureCatalogs.get(entries);
  const owners = new Map();
  const add = (source, themes) => {
    const effective = createDifficultyContext(source).campaign;
    const campaign = {
      ...effective,
      levels: effective.levels.map(normalizedLevel),
      classRecipes: effective.classRecipes ?? CLASSES,
    };
    const identity = (value) => ({
      version: value.version,
      id: value.id,
      revision: value.revision,
      levels: value.levels,
      classRecipes: value.classRecipes,
    });
    const key = campaignKey(campaign),
      prior = owners.get(key);
    if (prior)
      required(
        canonicalJSON(identity(prior.campaign)) === canonicalJSON(identity(campaign)),
        t('interface:pictureOwnersWithTheSameKeyDiffer'),
      );
    const owner = prior ?? { campaign, themes: new Map() };
    for (const theme of themes) owner.themes.set(theme.id, { id: theme.id });
    owners.set(key, owner);
  };
  for (const entry of entries) {
    if (entry.activity === 'challenge') continue;
    add(entry.baseCampaign ?? entry.campaign, entry.themes);
  }
  if (metadata)
    for (const owner of hydrateStoredStillMedia(metadata.document).owners)
      add(
        owner.campaign,
        owner.themeIds.map((id) => ({ id })),
      );
  const result = createMediaIdentityCatalog(
    createExecutionCatalog(
      [...owners.values()].map((owner) => ({
        campaign: owner.campaign,
        themes: [...owner.themes.values()],
      })),
    ),
  );
  if (cacheable) ownedPictureCatalogs.set(entries, result);
  return result;
}

/** Capture awaited media metadata, then return prepareBackup's synchronous hook.
 * Included packs provide their own worlds; unrelated installed packs cannot help. */
export function createBackupPictureIdentityResolver({ baseEntries, metadata }) {
  return ({ originals, packs, campaigns }) => {
    const originalKeys = new Set(originals.map(campaignKey));
    const entries = baseEntries.filter((entry) => originalKeys.has(campaignKey(entry.campaign)));
    for (const pack of packs.packs)
      for (const source of pack.campaigns) entries.push(resolvePackCampaign(pack, source.id));
    const result = createPictureIdentityCatalog({ entries, metadata });
    // campaigns may include an exact dynamic or Gentle execution. It is deliberately
    // not relabeled as an authored base: result.resolve must reconstruct its owner.
    required(Array.isArray(campaigns), t('interface:expectedVerifiedBackupExecutionCampaigns'));
    return result;
  };
}
