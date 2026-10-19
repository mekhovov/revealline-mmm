/** Explicit, session-only art review pin; never changes a saved appearance or a
 * gameplay recipe. Unrecognized revisions use the released artwork. */
export function actorArtReviewRevision(location = globalThis.location) {
  try {
    const params = new URL(location.href).searchParams;
    return params.getAll('artReview').length === 1 &&
      ['industrial-pilot-v1', 'industrial-overhead-v2', 'industrial-roster-v3'].includes(
        params.get('artReview'),
      )
      ? params.get('artReview')
      : null;
  } catch {
    return null;
  }
}

// These are routes owned by this build, not a general-purpose URL allowlist.
// Do not transfer preview choices to community/provider links or another edition.
const ART_REVIEW_NATIVE_PAGE =
  /^(.*\/)(?:game\/(?:(?:index|company)\.html|couch\/(?:index\.html|relay-rescue\.html)?|snake\/(?:(?:index|play)\.html)?|overflight\/(?:play|raid)\.html|studio\/(?:(?:index|snake|overflight|raid)\.html)?|(?:hunt\/military-levels\.html|(?:playground|hunt|online|replay-theater|controller-lab)\/(?:index\.html)?))?|authoring\/(?:asset-studio|motion-lab|enemy-catalog|still-media|video-poster|design-atlas|industrial-art-review)\/(?:index\.html)?|optional-practice\/(?:civilian-fpv|fpv-worlds)\/(?:index\.html)?)$/;

/** Inherit an explicit review-only art pin along a caller-owned native link.
 * Does not validate arbitrary navigation, persist preferences, transfer content,
 * or change an explicit destination choice. Missing/ambiguous pins stay absent.
 */
export function nativeArtReviewURL(href, sourceHref) {
  let source, target;
  try {
    source = new URL(sourceHref);
    target = new URL(href, source);
  } catch {
    return href;
  }
  const revision = actorArtReviewRevision(source),
    sourceRoot = ART_REVIEW_NATIVE_PAGE.exec(source.pathname)?.[1],
    targetRoot = ART_REVIEW_NATIVE_PAGE.exec(target.pathname)?.[1];
  if (
    revision &&
    ['http:', 'https:', 'file:', 'capacitor:'].includes(source.protocol) &&
    source.protocol === target.protocol &&
    source.origin === target.origin &&
    source.host === target.host &&
    !source.username &&
    !source.password &&
    !target.username &&
    !target.password &&
    sourceRoot &&
    sourceRoot === targetRoot &&
    !target.searchParams.has('artReview')
  ) {
    target.searchParams.set('artReview', revision);
    return target.href;
  }
  return href;
}
