import { required } from '../data-json.mjs';
import { mergeStoredMediaDocuments } from '../media-bundle.mjs';
import { acquirePresentationImage } from '../ui/presentation-image.mjs';

/** Collection/backup ownership metadata, not a durable-store snapshot. Acquisition
 * resolves session originals explicitly and passes the real branded metadata to
 * the durable store for all other pins. No generation or persistence is invented.
 */
export function createSessionPictureView(media, registry) {
  const session = registry.metadata();
  if (!session.document.library.presentations.length) return media;
  required(
    session.scope === 'session' && Number.isSafeInteger(session.revision) && session.revision >= 0,
    'Expected explicit session picture history.',
  );
  const metadata = Object.freeze({
    scope: 'durable-and-session',
    durableGeneration: media.metadata.generation,
    sessionRevision: session.revision,
    document: mergeStoredMediaDocuments(media.metadata.document, session.document),
  });
  return Object.freeze({
    ...media,
    metadata,
    async acquire(request, options) {
      required(request.metadata === metadata, 'Picture view belongs to another metadata snapshot.');
      return registry.has(request.pin)
        ? registry.acquire(request.pin, options)
        : acquirePresentationImage(
            { ...request, metadata: media.metadata, store: media.store },
            options,
          );
    },
  });
}
