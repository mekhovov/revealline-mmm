import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { getArcadeCollection } from './industrial-arcade.mjs';
import {
  acceptIndustrialEnvironment,
  restoreIndustrialEnvironment,
  validateIndustrialEnvironmentPin,
  resolveIndustrialEnvironment,
} from './industrial-environments.mjs';

export const ATTEMPT_APPEARANCE_BYTES = 2048;
export const ATTEMPT_ART_REVISIONS = Object.freeze([
  null,
  'industrial-pilot-v1',
  'industrial-overhead-v2',
  'industrial-roster-v3',
]);

function collectionRef(value) {
  if (value === null) return null;
  exactKeys(value, ['id', 'revision'], 'accepted artwork collection');
  required(
    typeof value.id === 'string' &&
      value.id.length > 0 &&
      value.id.length <= 80 &&
      typeof value.revision === 'string' &&
      value.revision.length > 0 &&
      value.revision.length <= 80,
    'Accepted artwork needs an exact collection revision.',
  );
  const registered = getArcadeCollection(value.id, value.revision);
  required(
    registered && registered.id === value.id && registered.revision === value.revision,
    'Accepted artwork collection is unavailable.',
  );
  return Object.freeze({ id: value.id, revision: value.revision });
}

function compatibleEnvironment(value, environment) {
  if (!environment) return;
  required(
    value.artRevision === environment.artRevision &&
      value.collection?.id === environment.collection.id &&
      value.collection?.revision === environment.collection.revision,
    'Accepted environment and artwork differ.',
  );
}

/** Portable validation only. A structural pin never grants renderer authority. */
export function snapshotAttemptAppearance(value) {
  if (value === null || value === undefined) return null;
  const owned = boundedJSON(value, { maxBytes: ATTEMPT_APPEARANCE_BYTES, maxDepth: 5 });
  exactKeys(owned, ['artRevision', 'collection', 'environmentPin'], 'accepted attempt artwork');
  required(
    ATTEMPT_ART_REVISIONS.includes(owned.artRevision),
    'Unsupported accepted artwork revision.',
  );
  const collection = collectionRef(owned.collection);
  const environmentPin = validateIndustrialEnvironmentPin(owned.environmentPin);
  // Structural validation must reject incompatible portable combinations too.
  // Renderer authority is acquired separately, against the trusted native source.
  if (environmentPin !== null)
    required(
      owned.artRevision === 'industrial-roster-v3' && collection?.id === 'military-field',
      'Accepted environment and artwork differ.',
    );
  return Object.freeze({ artRevision: owned.artRevision, collection, environmentPin });
}

/** Called exactly once for a new accepted attempt. No global preference reads. */
export function acceptAttemptAppearance(candidate, { artRevision, collection }) {
  const base = snapshotAttemptAppearance({
    artRevision,
    collection: collection === null ? null : { id: collection.id, revision: collection.revision },
    environmentPin: null,
  });
  const environmentPin = acceptIndustrialEnvironment(candidate, base);
  const accepted = Object.freeze({ ...base, environmentPin });
  compatibleEnvironment(accepted, resolveIndustrialEnvironment(environmentPin));
  return accepted;
}

/** Missing historical metadata remains absent, regardless of current preferences. */
export function restoreAttemptAppearance(saved, candidate) {
  const owned = snapshotAttemptAppearance(saved);
  if (owned === null) return null;
  const environmentPin = restoreIndustrialEnvironment(owned.environmentPin, candidate);
  const restored = Object.freeze({ ...owned, environmentPin });
  compatibleEnvironment(restored, resolveIndustrialEnvironment(environmentPin));
  return restored;
}

/** Renderers retain the original branded pin, never the validator's JSON copy. */
export function requireAcceptedAttemptAppearance(value) {
  const checked = snapshotAttemptAppearance(value);
  if (checked === null) return null;
  const environmentPin = value.environmentPin;
  compatibleEnvironment(checked, resolveIndustrialEnvironment(environmentPin));
  return Object.freeze({ ...checked, environmentPin });
}
