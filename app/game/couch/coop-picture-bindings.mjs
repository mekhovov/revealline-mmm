import { freezePresentation } from '../presentation/model.mjs';

/** Exact starter-pack parity reuse of the approved Orchard and Foundry derivatives.
 * Current canonical fpv104 preserves both published and preview presentation histories.
 * Revision101 is admitted only for its published manifest; the preview source-stage
 * revision101 and fpv98 never gained a picture association. Revision102/103 preview
 * restores remain pinned by the presentation host to their original runtime manifests.
 * This association grants no additional artwork or physical-play approval.
 */
export const COOP_PICTURE_BINDINGS = freezePresentation([
  {
    packId: 'relay-rescue-starter',
    packRevision: 2,
    packSha256: '51735f71d1ac5c7f9dfe72d3032ea78d48a8113179385132fb4aec03078a32d5',
    levelId: 'first-connection',
    levelRevision: 2,
    levelSha256: '31041ad693f59418fb34e91f6f7bdae4d46fb6294b5e4ba49f8035aab4e79246',
    themeId: 'fpv',
    themeRevision: 104,
    collection: null,
    picture: {
      slot: 'scene.reveal.wide',
      assetId: 'scene.reveal.wide.field-kit',
      assetRevision: 2,
      bytes: 52720,
      height: 576,
      mime: 'image/png',
      sha256: '53f1206a11a8791892f5c844c0641529acbc2c09c8d558676d0d801d72113850',
      width: 1152,
    },
  },
  {
    packId: 'relay-rescue-starter',
    packRevision: 2,
    packSha256: '51735f71d1ac5c7f9dfe72d3032ea78d48a8113179385132fb4aec03078a32d5',
    levelId: 'relay-yard',
    levelRevision: 2,
    levelSha256: 'fcb1014f8b2c60047a2d10e4c0558b9ca03dcfe50c23ad48a5d2dabf9852c2a7',
    themeId: 'fpv',
    themeRevision: 104,
    collection: null,
    picture: {
      slot: 'picture.fpv.adf5c9eea274ba7f',
      assetId: 'picture.fpv.adf5c9eea274ba7f.field-kit',
      assetRevision: 2,
      bytes: 38090,
      height: 576,
      mime: 'image/png',
      sha256: 'd76f309d8385cd5d20fc2fff72b7f3abc19299cccdde767d76dd9f4a4960929d',
      width: 1152,
    },
  },
]);

/** Explicit approved scenery for valid historical imports outside closed binding
 * namespaces. This is an association policy, not approval of imported level art.
 * Each attempt pins the complete imported pack/level and this exact picture.
 */
export const COOP_HISTORICAL_IMPORT_PICTURE_POLICY = freezePresentation({
  version: 'revealline-team-historical-import-picture.v1',
  themeId: 'fpv',
  themeRevision: 104,
  collection: null,
  picture: {
    slot: 'scene.reveal.wide',
    assetId: 'scene.reveal.wide.field-kit',
    assetRevision: 2,
    bytes: 52720,
    height: 576,
    mime: 'image/png',
    sha256: '53f1206a11a8791892f5c844c0641529acbc2c09c8d558676d0d801d72113850',
    width: 1152,
  },
});

/** Numeric identities shared by published and preview histories require exact
 * manifest constraints when their picture associations differ.
 */
const PUBLISHED_101_MANIFEST = '7e8db95cec2eaab6b031e12bb44e036173611539393d44bbdfc50ff784d098b8';
const retainedIdentity = (themeRevision) => ({
  themeRevision,
  ...(themeRevision === 101 ? { manifestSha256: PUBLISHED_101_MANIFEST } : {}),
});
const COOP_RETAINED_THEME_REVISIONS = Object.freeze([
  58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81,
  82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 99, 100, 101, 102, 103,
]);
export const COOP_RETAINED_PICTURE_BINDINGS = freezePresentation(
  COOP_RETAINED_THEME_REVISIONS.flatMap((themeRevision) =>
    COOP_PICTURE_BINDINGS.map((row) => ({ ...row, ...retainedIdentity(themeRevision) })),
  ),
);
export const COOP_SUPPORTED_PICTURE_BINDINGS = freezePresentation([
  ...COOP_PICTURE_BINDINGS,
  ...COOP_RETAINED_PICTURE_BINDINGS,
]);
export const COOP_RETAINED_HISTORICAL_IMPORT_PICTURE_POLICY = freezePresentation({
  ...COOP_HISTORICAL_IMPORT_PICTURE_POLICY,
  themeRevision: 59,
});
export const COOP_HISTORICAL_IMPORT_PICTURE_POLICIES = freezePresentation([
  COOP_HISTORICAL_IMPORT_PICTURE_POLICY,
  ...COOP_RETAINED_THEME_REVISIONS.map((themeRevision) => ({
    ...COOP_HISTORICAL_IMPORT_PICTURE_POLICY,
    ...retainedIdentity(themeRevision),
  })),
]);
