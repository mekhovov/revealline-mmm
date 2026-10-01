import { t } from '../i18n/index.mjs';
import { canonicalJSON, required } from '../data-json.mjs';
import { createMediaIdentityCatalog } from '../media-library.mjs';
import { createStoredStillIdentityCatalog } from '../media-storage-record.mjs';
import { validatePictureReceiptOwners } from '../picture-receipts.mjs';
import { normalizedLevel } from '../core/level.mjs';
import { createExecutionCatalog } from '../campaign-contexts.mjs';
import { createGalleryDifficultyResolver } from '../gallery-difficulty.mjs';
import { acquirePresentationImage } from './presentation-image.mjs';

/** Resolve first-earned originals using retained owners, never today's assignment.
 * Retained contexts are presentation-only and do not install playable content.
 */
export function resolveEarnedPicture({ item, receipt, metadata, entries }) {
  const installed = createGalleryDifficultyResolver(entries).picture(item);
  if (!receipt) return installed ? Object.freeze({ ...installed, receipt: null }) : null;
  required(
    receipt.galleryKey === item.key,
    t('interface:thisEarnedPictureBelongsToAnotherGalleryRow'),
  );
  if (receipt.presentationPin?.kind === 'legacy') {
    // Legacy pictures retain their authored-pack behavior. A receipt does not
    // preserve that pack's original embedded art if the pack is removed.
    if (!installed) return null;
    const [verified] = validatePictureReceiptOwners(
      [receipt],
      [item],
      createMediaIdentityCatalog({ entries: [installed.entry] }),
    );
    return Object.freeze({
      ...installed,
      item: { ...item, seed: verified.seed },
      receipt: verified,
    });
  }
  const catalog = createStoredStillIdentityCatalog(metadata.document);
  const [verified] = validatePictureReceiptOwners([receipt], [item], catalog);
  const owner = metadata.document.owners.find((candidate) => {
    const contexts = createExecutionCatalog([
      { campaign: candidate.campaign, themes: candidate.themeIds.map((id) => ({ id })) },
    ]);
    return contexts.entries.some((entry) => entry.executionKey === item.campaignKey);
  });
  required(owner, t('interface:theEarnedPictureOwnerIsMissingRestoreItsOriginalMedia'));
  const contexts = createExecutionCatalog([
    {
      campaign: owner.campaign,
      classRecipes: owner.campaign.classRecipes,
      themes: owner.themeIds.map((id) => ({ id, name: id })),
      visualOverrides: {},
      levelVisuals: [],
    },
  ]);
  const retained = createGalleryDifficultyResolver(contexts.entries).picture(item);
  required(retained, t('interface:theEarnedPictureNoLongerMatchesItsRetainedMapAnd'));
  required(
    retained.level.revision === item.levelRevision &&
      (!installed ||
        canonicalJSON(normalizedLevel(installed.level)) ===
          canonicalJSON(normalizedLevel(retained.level))),
    t('interface:earnedPictureGeometryDiffersFromItsRecordedCompletion'),
  );
  return Object.freeze({
    ...(installed ?? retained),
    item: { ...item, seed: verified.seed },
    receipt: verified,
    archived: !installed,
    replayable: !!installed,
    // Without the installed visual recipe only the original still is available;
    // no invented theme, actors, celebration or playability is implied.
    celebratable: !!installed,
  });
}

export async function acquireEarnedPicture(source, options = {}) {
  const picture = resolveEarnedPicture(source);
  if (!picture || picture.receipt?.presentationPin.kind !== 'still')
    return Object.freeze({ picture, backdrop: null, release() {} });
  const backdrop = await acquirePresentationImage(
    { pin: picture.receipt.presentationPin, metadata: source.metadata, store: source.store },
    options,
  );
  return Object.freeze({ picture, backdrop, release: () => backdrop.release() });
}
