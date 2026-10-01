import { canonicalJSON, required } from './data-json.mjs';
import { isMediaLibrary, isMediaIdentityCatalog } from './media-library.mjs';

const unavailable = Object.freeze({ kind: 'legacy', reason: 'unavailable-context' });
const unassigned = Object.freeze({ kind: 'legacy', reason: 'unassigned' });
/** Snapshot-only resolution. A legacy result means retain the host's existing
 * pack/level/theme artwork exactly; it is not a generated replacement image.
 * A still result identifies metadata, not loaded/decoded/available media bytes.
 * Hosts must also keep old art on byte/decode failure. No host adopts this yet.
 */
export function createPresentationResolver(library, identityCatalog) {
  required(
    isMediaLibrary(library) && isMediaIdentityCatalog(identityCatalog),
    'Resolver needs validated media and identity catalogs.',
  );
  const assets = new Map(library.assets.map((item) => [item.id, item]));
  const presentations = new Map(
    library.presentations.map((item) => [JSON.stringify([item.id, item.revision]), item]),
  );
  const selected = new Map(
    library.assignments.map((item) => {
      const presentation = presentations.get(JSON.stringify([item.presentationId, item.revision]));
      return [
        canonicalJSON(item.identity),
        Object.freeze({
          kind: 'still',
          identity: presentation.identity,
          presentation,
          asset: assets.get(presentation.poster.assetId),
        }),
      ];
    }),
  );
  return Object.freeze({
    resolve(request) {
      const identity = identityCatalog.resolve(request);
      return identity ? (selected.get(canonicalJSON(identity)) ?? unassigned) : unavailable;
    },
  });
}
