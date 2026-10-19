import { freezePresentation } from '../presentation/model.mjs';

/** Exact starter-pack parity reuse of the approved Orchard and Foundry derivatives.
 * The injected lease verifies these identities before reading or decoding; other
 * imports/themes have no implicit procedural or wider FPV-picture fallback.
 * Lease output retains the complete frame with contain fit and nearest sampling.
 * fpv38 is an exact reviewed metadata successor: all127 original payloads, including
 * these two derivatives, remain byte-identical. No other revision is admitted.
 */
export const COOP_LEGACY38_PICTURE_BINDINGS = freezePresentation([
  {
    packId: 'relay-rescue-starter',
    packRevision: 2,
    packSha256: '51735f71d1ac5c7f9dfe72d3032ea78d48a8113179385132fb4aec03078a32d5',
    levelId: 'first-connection',
    levelRevision: 2,
    levelSha256: '31041ad693f59418fb34e91f6f7bdae4d46fb6294b5e4ba49f8035aab4e79246',
    themeId: 'fpv',
    themeRevision: 38,
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
    themeRevision: 38,
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
export const COOP_LEGACY38_IMPORT_POLICY = freezePresentation({
  version: 'revealline-team-historical-import-picture.v1',
  themeId: 'fpv',
  themeRevision: 38,
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

/** Only these unambiguous published v1 envelope identities are admitted. The
 * envelope's own manifest hash is NOT a theme-runtime hash. No uploaded URL,
 * inferred revision range or later ambiguous lineage may choose a host. */
export const COOP_RETAINED_PRESENTATIONS = freezePresentation([
  {
    source: { id: 'field-kit', revision: 38 },
    theme: { id: 'fpv', revision: 38 },
    collection: null,
    sha256: 'a0ad21cd1412fed07b73dbf0e1ec31ded747a8210a97ccc1efeb1e2c26b24584',
    bindings: COOP_LEGACY38_PICTURE_BINDINGS,
    policy: COOP_LEGACY38_IMPORT_POLICY,
  },
  {
    source: { id: 'field-kit', revision: 50 },
    theme: { id: 'fpv', revision: 50 },
    collection: null,
    sha256: '29298673ed6cc49222b1d52d77efc4f8968abe42a29df5c29b2861bd8f9ce1ed',
    bindings: COOP_LEGACY38_PICTURE_BINDINGS.map((row) => ({ ...row, themeRevision: 50 })),
    policy: { ...COOP_LEGACY38_IMPORT_POLICY, themeRevision: 50 },
  },
]);
