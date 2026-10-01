import { exactKeys, required } from './data-json.mjs';

const RECIPE = 'rgba8-full-frame-nearest-center-stored-deflate.v1';
const DIRECTORY = 'authoring/library/runtime-sprite-candidates-v1/export/';
const identity = (value, size, maxBytes, label) => {
  required(
    Number.isSafeInteger(value.bytes) &&
      value.bytes > 0 &&
      value.bytes <= maxBytes &&
      typeof value.sha256 === 'string' &&
      /^[a-f0-9]{64}$/.test(value.sha256) &&
      value.width === size &&
      value.height === size,
    `${label} identity differs.`,
  );
};

/** Validates an optional transport derivative, never an appearance or compiled slot. */
export function validateBodyDerivative(derivation, { id, src, sourceSrc }) {
  exactKeys(derivation, ['recipe', 'source', 'output'], 'body derivation');
  required(derivation.recipe === RECIPE, 'Unregistered body derivative recipe.');
  exactKeys(derivation.source, ['src', 'bytes', 'sha256', 'width', 'height'], 'source original');
  exactKeys(derivation.output, ['bytes', 'sha256', 'width', 'height'], 'runtime derivative');
  identity(derivation.source, 1254, 2 * 1024 * 1024, 'Source original');
  identity(derivation.output, 128, 128 * 1024, 'Runtime derivative');
  required(derivation.source.src === sourceSrc, 'Source original role/path differs.');
  required(
    src === `${DIRECTORY}${id}-${derivation.output.sha256}.png`,
    'Runtime derivative role/path/hash differs.',
  );
  return derivation.output;
}
