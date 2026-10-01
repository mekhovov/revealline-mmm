import { required } from '../data-json.mjs';

/** Code-owned release paths only. A retained revision reuses the release's
 * hash-addressed assets; callers cannot supply URLs or arbitrary filenames. */
export function presentationManifestPath(retainedManifestSha256 = null) {
  required(
    retainedManifestSha256 === null ||
      (typeof retainedManifestSha256 === 'string' && /^[a-f0-9]{64}$/.test(retainedManifestSha256)),
    'Use an exact SHA-256 retained presentation manifest pin.',
  );
  return retainedManifestSha256 === null
    ? 'runtime.json'
    : `runtime.${retainedManifestSha256}.json`;
}
