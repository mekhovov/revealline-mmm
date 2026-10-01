import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import { snapshotPictureChoice } from './presentation-pins.mjs';
import { isMediaIdentityCatalog } from './media-library.mjs';

export const PICTURE_RECEIPT_LIMITS = Object.freeze({ records: 4096, bytes: 2 * 1024 * 1024 });
const stamp = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;

/** Local earned-picture metadata; original bytes remain in immutable media history. */
export function resolvePictureReceipts(source, gallery) {
  const records = boundedJSON(source, {
    maxBytes: PICTURE_RECEIPT_LIMITS.bytes,
    maxArray: PICTURE_RECEIPT_LIMITS.records,
    maxNodes: 100000,
    maxString: 512,
  });
  required(
    Array.isArray(records) && records.length <= PICTURE_RECEIPT_LIMITS.records,
    'Too many earned picture receipts.',
  );
  const rows = new Map(gallery.map((row) => [row.key, row])),
    seen = new Set();
  return records.map((record) => {
    exactKeys(
      record,
      ['galleryKey', 'earnedRunId', 'earnedAt', 'seed', 'bodyId', 'presentationPin'],
      'earned picture receipt',
    );
    required(
      typeof record.galleryKey === 'string' &&
        /^gallery-v1-[0-9a-f]{16}$/.test(record.galleryKey) &&
        !seen.has(record.galleryKey),
      'Earned picture identity is invalid or duplicated.',
    );
    const row = rows.get(record.galleryKey);
    required(row, 'Earned picture needs a completed gallery identity.');
    required(
      typeof record.earnedRunId === 'string' &&
        record.earnedRunId.trim().length > 0 &&
        record.earnedRunId.length <= 159 &&
        stamp(record.earnedAt) &&
        Number.isInteger(record.seed) &&
        record.seed >= 0 &&
        record.seed <= 0xffffffff &&
        stableId(record.bodyId),
      'Earned picture metadata is invalid.',
    );
    const pin = snapshotPictureChoice(record.presentationPin);
    required(
      pin.identity.levelId === row.levelId && pin.identity.themeId === row.themeId,
      'Earned picture belongs to a different map or world.',
    );
    if (pin.identity.baseCampaignKey === row.campaignKey)
      required(
        pin.identity.levelRevision === row.levelRevision,
        'Earned picture authored revision differs from the completed map.',
      );
    seen.add(record.galleryKey);
    return { ...record, presentationPin: pin };
  });
}

/** The committed remote row owns first earn, including an implicit legacy picture. */
export function mergePictureReceipts(local, remote, remoteGallery, mergedGallery) {
  const kept = new Map(remote.map((record) => [record.galleryKey, record]));
  const existing = new Set(remoteGallery.map((row) => row.key));
  for (const record of local)
    if (!kept.has(record.galleryKey) && !existing.has(record.galleryKey))
      kept.set(record.galleryKey, record);
  return resolvePictureReceipts([...kept.values()], mergedGallery);
}

/** Reconstruct exact execution→authored ownership from installed or retained owners. */
export function validatePictureReceiptOwners(source, gallery, identityCatalog) {
  required(
    isMediaIdentityCatalog(identityCatalog),
    'Earned pictures need a verified execution catalog.',
  );
  const records = resolvePictureReceipts(source, gallery),
    rows = new Map(gallery.map((row) => [row.key, row]));
  for (const record of records) {
    const row = rows.get(record.galleryKey),
      identity = identityCatalog.resolve({
        executionKey: row.campaignKey,
        levelId: row.levelId,
        levelRevision: row.levelRevision,
        themeId: row.themeId,
      });
    required(
      identity && canonicalJSON(identity) === canonicalJSON(record.presentationPin.identity),
      identity
        ? 'Earned picture owner differs from the completed execution.'
        : 'Original picture data is unavailable. Re-download the chapter or restore its media backup.',
    );
  }
  return records;
}
