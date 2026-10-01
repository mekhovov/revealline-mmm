import { isPackLibraryMetadata } from '../packs.mjs';
import { preparedPackIdentity } from './pack-identity.mjs';

/** Convert one exact browsing edition into a genuinely prepared pack only after
 * explicit Play. inspect must use the host's real validator/decoder and release
 * its decode resources before returning the prepared library. No DTO is ever
 * forwarded to a runtime. The caller still owns staged picture/attempt adoption.
 */
export async function materializeMissionPack({
  inventory,
  metadata,
  metadataPack,
  inspect,
  signal,
}) {
  if (
    !inventory ||
    typeof inventory.materialize !== 'function' ||
    !isPackLibraryMetadata(metadata) ||
    !metadata.packs.includes(metadataPack) ||
    typeof inspect !== 'function'
  )
    throw new TypeError('Choose an exact inspected mission edition and genuine preparer.');
  return inventory.materialize(
    metadata,
    async (context) => {
      context.checkCurrent();
      const result = await inspect({ signal: context.signal });
      context.checkCurrent();
      const pack = result?.library?.packs?.find((item) => item.id === metadataPack.id);
      if (!pack) throw new Error('This installed mission was removed. Refresh the library.');
      // This function also demands the private prepared-pack registration.
      const identity = await preparedPackIdentity(pack);
      context.checkCurrent();
      if (
        pack.version !== metadataPack.version ||
        identity.bytes !== metadataPack.identity.bytes ||
        identity.sha256 !== metadataPack.identity.sha256
      )
        throw new Error(
          'This installed mission changed. Refresh the exact edition before playing.',
        );
      return pack;
    },
    {
      signal,
      // The real inspection owns/releases decoder resources before returning.
      // A prepared pack is immutable JSON data, not a live picture or staged run.
      disposeFailed: () => {},
    },
  );
}
