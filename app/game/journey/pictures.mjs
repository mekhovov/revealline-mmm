import { boundedJSON, exactKeys, required, dataIdentity } from '../data-json.mjs';
import { compileAssetRevision } from '../content-design/assets.mjs';
import { t } from '../i18n/index.mjs';
import { JOURNEY_MODES } from './catalog.mjs';

export const JOURNEY_PICTURES_VERSION = 'revealline-journey-pictures.v1';
export const JOURNEY_PICTURES_LIMIT = 2048;
export const emptyJourneyPictures = () => ({ format: JOURNEY_PICTURES_VERSION, records: [] });
const fields = [
  'mode',
  'editionId',
  'missionId',
  'campaignKey',
  'levelId',
  'levelRevision',
  'runId',
  'gameplayId',
  'difficulty',
  'name',
  'campaignTitle',
  'themeId',
  'asset',
];
const key = (record) =>
  JSON.stringify([
    record.mode,
    record.editionId,
    record.missionId,
    record.campaignKey,
    record.levelId,
    record.levelRevision,
    record.themeId,
    record.asset.id,
    record.asset.revision,
    record.asset.sha256,
  ]);

/** Presentation provenance only: never a Legacy award, score or replay authority. */
export function validateJourneyPicture(source) {
  const record = boundedJSON(source, { maxBytes: 16384, maxNodes: 64, maxDepth: 3 });
  exactKeys(record, fields, t('interface:journeyPictures.validation.record'));
  for (const field of fields.filter((field) => field !== 'asset'))
    required(
      typeof record[field] === 'string' && record[field].trim() && record[field].length <= 1024,
      t('interface:journeyPictures.validation.needsField', { field }),
    );
  required(
    JOURNEY_MODES.includes(record.mode),
    t('interface:journeyPictures.validation.invalidMode'),
  );
  required(
    ['gentle', 'standard', 'expert'].includes(record.difficulty),
    t('interface:journeyPictures.validation.invalidDifficulty'),
  );
  record.asset = compileAssetRevision(record.asset);
  return record;
}
export function validateJourneyPictures(source) {
  const ledger = boundedJSON(source, {
    maxBytes: 8 * 1024 * 1024,
    maxNodes: 100000,
    maxDepth: 5,
    maxArray: JOURNEY_PICTURES_LIMIT,
  });
  exactKeys(ledger, ['format', 'records'], t('interface:journeyPictures.validation.collection'));
  required(
    ledger.format === JOURNEY_PICTURES_VERSION && Array.isArray(ledger.records),
    t('interface:journeyPictures.validation.unsupported'),
  );
  const keys = new Set(),
    runs = new Set();
  ledger.records = ledger.records.map((source) => {
    const record = validateJourneyPicture(source),
      identity = key(record),
      run = JSON.stringify([record.mode, record.runId]);
    required(
      !keys.has(identity) && !runs.has(run),
      t('interface:journeyPictures.validation.duplicateIdentity'),
    );
    keys.add(identity);
    runs.add(run);
    return record;
  });
  return ledger;
}

/** Portable picture references only become earned originals when the same
 * scoped profile carries the exact completion that admitted them. */
export function validateJourneyPictureCompletions(profile, source, { editionId = null } = {}) {
  const ledger = validateJourneyPictures(source);
  for (const record of ledger.records) {
    if (editionId !== null)
      required(
        record.editionId === editionId,
        t('interface:journeyPictures.validation.differentEdition'),
      );
    const receipt = profile.clears?.[record.mode]?.[record.missionId];
    required(receipt, t('interface:journeyPictures.validation.missingReceipt'));
    required(
      receipt.runId === record.runId &&
        receipt.gameplayId === record.gameplayId &&
        receipt.difficulty === record.difficulty,
      t('interface:journeyPictures.validation.receiptMismatch'),
    );
  }
  return ledger;
}
function addPicture(ledger, source) {
  const record = validateJourneyPicture(source);
  const sameRun = ledger.records.find(
    (old) => old.mode === record.mode && old.runId === record.runId,
  );
  required(
    !sameRun || dataIdentity(sameRun) === dataIdentity(record),
    t('interface:journeyPictures.validation.runCannotReplace'),
  );
  // A fresh replay of the same original preserves its first accepted receipt.
  const existing = ledger.records.find((old) => key(old) === key(record));
  if (existing) {
    required(
      dataIdentity(existing.asset) === dataIdentity(record.asset),
      t('interface:journeyPictures.validation.assetChanged'),
    );
    return;
  }
  required(
    ledger.records.length < JOURNEY_PICTURES_LIMIT,
    t('interface:journeyPictures.validation.storageFull'),
  );
  ledger.records.push(record);
}
export function applyJourneyPictureEvent(source, event) {
  const ledger = validateJourneyPictures(source);
  if (event.type === 'restore' && event.pictures) {
    for (const record of validateJourneyPictures(event.pictures).records)
      addPicture(ledger, record);
  } else if (event.picture !== undefined) {
    required(event.type === 'complete', t('interface:journeyPictures.validation.completedOnly'));
    const record = validateJourneyPicture(event.picture);
    for (const field of ['mode', 'missionId', 'runId', 'gameplayId', 'difficulty'])
      required(
        record[field] === event[field],
        t('interface:journeyPictures.validation.gameplayReceiptMismatch'),
      );
    addPicture(ledger, record);
  }
  return ledger;
}

/** Old profile scopes can span several editions. Never guess an earned original
 * from a current mission name, current asset, or a display string such as Cleared. */
export function journeyPictureCompletion({ profile, pictures, mode, editionId, missionId }) {
  const records = pictures.records.filter(
    (record) =>
      record.mode === mode && record.editionId === editionId && record.missionId === missionId,
  );
  if (records.length) return { state: 'earned', record: records.at(-1) };
  if (Object.hasOwn(profile.clears[mode] ?? {}, missionId))
    return {
      state: 'unavailable',
      reason:
        'Earlier edition · original unavailable. Complete this mission again to earn its current picture.',
      reasonKey: 'interface:journeyPictures.earlierEditionUnavailable',
    };
  return { state: 'unfinished' };
}
