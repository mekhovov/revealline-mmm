import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import { snapshotStoryPin } from './story-bindings.mjs';
import { PICTURE_RECEIPT_LIMITS, resolvePictureReceipts } from './picture-receipts.mjs';

export const STORY_RECEIPT_FORMAT = 'revealline-earned-story.v1';

/** Receipt metadata alone grants no new award or original-byte availability. */
export function resolveStoryReceipts(source, pictures, gallery) {
  const owned = boundedJSON(
    { pictures, stories: source },
    {
      maxBytes: PICTURE_RECEIPT_LIMITS.bytes,
      maxArray: PICTURE_RECEIPT_LIMITS.records,
      maxNodes: 100000,
      maxString: 512,
    },
  );
  const byKey = new Map(
    resolvePictureReceipts(owned.pictures, gallery).map((p) => [p.galleryKey, p]),
  );
  required(Array.isArray(owned.stories), 'Earned stories must be a bounded array.');
  const seen = new Set();
  return owned.stories.map((record) => {
    exactKeys(record, ['format', 'galleryKey', 'earnedRunId', 'storyPin'], 'earned story');
    const picture = byKey.get(record.galleryKey);
    required(
      record.format === STORY_RECEIPT_FORMAT && picture && !seen.has(record.galleryKey),
      'Earned story requires one exact first-earned picture receipt.',
    );
    required(
      record.earnedRunId === picture.earnedRunId,
      'Story and picture first-earned runs differ.',
    );
    const storyPin = snapshotStoryPin(record.storyPin);
    required(
      storyPin === null ||
        canonicalJSON(storyPin.picturePin) === canonicalJSON(picture.presentationPin),
      'Earned story belongs to a different exact original picture.',
    );
    seen.add(record.galleryKey);
    return { ...record, storyPin };
  });
}

/** Existing remote gallery rows retain null/old history as well as explicit S. */
export function mergeStoryReceipts(local, remote, remoteGallery, pictures, gallery) {
  const kept = new Map(remote.map((row) => [row.galleryKey, row])),
    earned = new Set(remoteGallery.map((row) => row.key));
  for (const row of local)
    if (!kept.has(row.galleryKey) && !earned.has(row.galleryKey)) kept.set(row.galleryKey, row);
  return resolveStoryReceipts([...kept.values()], pictures, gallery);
}
