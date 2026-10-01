import { canonicalJSON, plainObject, required } from './data-json.mjs';
import { freezeProfileData } from './profile-channel-json.mjs';
import { isStoredStillMedia, validateStoredStillMedia } from './media-storage-record.mjs';
import { validateMediaLibrary } from './media-library.mjs';
import { prepareStillAsset } from './media-still.mjs';
import { createPictureIdentityCatalog } from './ui/picture-identity.mjs';

export const ORIGINAL_REPORT_LIMIT = 256 * 1024;

/** Options carry control signals only, never caller-supplied identities or decoders. */
export function originalRecoveryOptions(options = {}, exporting = false) {
  required(plainObject(options), 'Expected original recovery options.');
  const descriptors = Object.getOwnPropertyDescriptors(options);
  for (const key of Reflect.ownKeys(descriptors)) {
    const field = descriptors[key];
    required(
      (key === 'signal' || (exporting && key === 'component')) &&
        field.enumerable &&
        Object.hasOwn(field, 'value'),
      'Unsupported original recovery option.',
    );
  }
  const component = descriptors.component?.value;
  if (exporting)
    required(
      component === 'original-file' || component === 'identity-report',
      'Choose an explicit original-file or identity-report component.',
    );
  return { signal: descriptors.signal?.value, component };
}

/** Stored owners validate picture references only; they never register execution entries. */
export function reviewOriginalMetadata(captured, entries) {
  const document = captured.marker.media.library;
  if (!isStoredStillMedia(document)) return Object.freeze([]);
  const safe = validateStoredStillMedia(document);
  const identityCatalog = createPictureIdentityCatalog({ entries, metadata: { document: safe } });
  const library = validateMediaLibrary(safe.library, { identityCatalog });
  const files = new Map(captured.files.map((file) => [file.sha256, file]));
  return freezeProfileData(
    library.assets.map((asset) => {
      const file = files.get(asset.sha256);
      return {
        asset,
        references: library.presentations.filter((item) => item.poster.assetId === asset.id),
        availability: !file
          ? 'missing'
          : file.bytes !== asset.bytes
            ? 'length-mismatch'
            : 'available-unverified',
        verified: false,
      };
    }),
  );
}

/** Real selected-byte preparation; compare every captured asset field, not just the hash. */
export async function verifyOriginalBytes(choice, captured, { decodeImage, signal } = {}) {
  const file = captured.files.find((item) => item.sha256 === choice.asset.sha256);
  required(
    file && file.bytes === choice.asset.bytes,
    'Selected original is absent or its byte length differs.',
  );
  const prepared = await prepareStillAsset(
    file.blob,
    {
      id: choice.asset.id,
      provenance: choice.asset.provenance,
    },
    { decodeImage, signal },
  );
  required(
    canonicalJSON(prepared.asset) === canonicalJSON(choice.asset),
    'Selected original bytes do not match its complete captured identity.',
  );
  return prepared;
}

/** Independent files only. The report is diagnostic data, not any existing import schema. */
export function originalRecoveryComponent(prepared, identity, component) {
  const stem = `revealline-${prepared.asset.id}-${prepared.asset.sha256}`;
  if (component === 'original-file')
    return Object.freeze({
      blob: prepared.blob,
      filename: `${stem}.${prepared.asset.mime === 'image/png' ? 'png' : 'jpg'}`,
      component,
      scope: 'selected-original',
      fullBackup: false,
    });
  required(component === 'identity-report', 'Unsupported original recovery component.');
  const report = {
    format: 'revealline-selected-original-report.v1',
    ...identity,
    fullBackup: false,
    earnedReceiptAuthority: false,
    restoreAuthority: false,
  };
  const text = JSON.stringify(report, null, 2);
  required(
    new TextEncoder().encode(text).byteLength <= ORIGINAL_REPORT_LIMIT,
    'Selected identity report exceeds its byte bound.',
  );
  return Object.freeze({
    blob: new Blob([text], { type: 'application/json' }),
    filename: `${stem}-identity.json`,
    component,
    scope: 'selected-original',
    fullBackup: false,
  });
}
