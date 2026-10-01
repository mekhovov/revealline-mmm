import { required, stableId } from '../data-json.mjs';

/** Shared exact identities for the publisher and selected company startup. */
export function editionOfflinePackageId(editionId, presentationId = null) {
  required(stableId(editionId), 'An exact company edition is required.');
  required(
    presentationId === null || /^[a-f0-9]{64}$/.test(presentationId),
    'An exact retained presentation is required.',
  );
  const id = 'company:' + editionId + (presentationId ? ':' + presentationId : '');
  required(id.length <= 200, 'The company offline package identity is too long.');
  return id;
}
