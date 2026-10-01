/** Small first-party chapters ship in the mandatory offline cache. They still
 * cross the normal validator on first play, but never need a separate network
 * download decision in the mission browser. */
export const INCLUDED_BUNDLED_PACK_MAX_BYTES = 64 * 1024;

export function isIncludedBundledMission(row) {
  return (
    row?.source === 'bundled' &&
    Number.isSafeInteger(row?.sourceFile?.bytes) &&
    row.sourceFile.bytes > 0 &&
    row.sourceFile.bytes <= INCLUDED_BUNDLED_PACK_MAX_BYTES
  );
}
