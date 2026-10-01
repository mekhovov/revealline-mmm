/** Distribution identity is independent of Journey's logical campaign progress. */
const editionPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const versionPattern = /^v?(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/;

// Public addresses may change; stored profiles, content pins and installed app
// IDs keep the original edition identity. This is an alias, never a new edition.
const publicSlugs = Object.freeze({ 'droneaid-nl-community': 'droneaid' });

export function editionIdentityId(selector) {
  validateEditionId(selector);
  return Object.keys(publicSlugs).find((id) => publicSlugs[id] === selector) ?? selector;
}

export function editionPublicSlug(editionId) {
  validateEditionId(editionId);
  return publicSlugs[editionId] ?? editionId;
}

export function validateEditionId(editionId) {
  if (typeof editionId !== 'string' || editionId.length > 64 || !editionPattern.test(editionId))
    throw new TypeError('Invalid edition identity.');
  return editionId;
}

export function editionIdFromLocation(locationRef = globalThis.location) {
  if (!locationRef?.href) return undefined;
  const path = new URL(locationRef.href).pathname;
  const match = /\/editions\/([^/]+)\//.exec(path);
  return match ? editionIdentityId(match[1]) : undefined;
}

export function resolveEditionContext({ editionId, version } = {}) {
  if (typeof version !== 'string' || (version !== 'DEV' && !versionPattern.test(version)))
    throw new TypeError('A stable release version or DEV is required.');
  const brand = editionId === undefined ? '' : `${validateEditionId(editionId)}.`;
  const channel =
    editionId === undefined
      ? version === 'DEV'
        ? 'dev'
        : `release-${version}`
      : `edition-${brand}${version === 'DEV' ? 'dev' : `release-${version}`}`;
  const profileKey = `revealline-mmm.library.${channel}.v1`;
  return Object.freeze({
    ...(editionId === undefined ? {} : { editionId }),
    version,
    channel,
    profileKey,
    packsKey: `revealline-mmm.packs.${channel}.v1`,
    sessionKey: `revealline-mmm.suspended.${channel}.v1`,
    writerKey: `${profileKey}.writer`,
    lockKey: `${profileKey}.backup-lock`,
    journalKey: `${profileKey}.backup-journal`,
    indexKey: `${profileKey}.external-chapter-index.v1`,
    externalJournalKey: `${profileKey}.external-chapter-journal.v1`,
  });
}

export function parseEditionChannel(channel) {
  if (typeof channel !== 'string') return null;
  const match = /^edition-([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\.(dev|release-(v?\d+\.\d+\.\d+))$/.exec(
    channel,
  );
  if (!match) return null;
  try {
    return resolveEditionContext({
      editionId: match[1],
      version: match[2] === 'dev' ? 'DEV' : match[3],
    });
  } catch {
    return null;
  }
}

export function installedStateKey(editionId) {
  return editionId === undefined
    ? 'revealline-mmm.installed-app.v1'
    : `revealline-mmm.installed-app.edition-${validateEditionId(editionId)}.v1`;
}

/** Stable explicit manifest IDs avoid origin-wide './' identity collisions. */
export function editionAppIdentity({ editionId, basePath = '/' } = {}) {
  validateEditionId(editionId);
  if (typeof basePath !== 'string' || !/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(basePath))
    throw new TypeError('Edition base path must be an absolute directory path.');
  const root = `${basePath}editions/${editionPublicSlug(editionId)}/`;
  return Object.freeze({
    id: `${basePath}editions/${editionId}/`,
    start_url: `${root}app/`,
    scope: root,
  });
}

/** A launcher may select only a retained immutable release of its own edition.
 * Relative current.json pointers are resolved against the document, never a
 * stored origin. This module also ships inside the stable launcher directory. */
export function validateCompanyInstallationReference(
  value,
  { editionId, baseURL, editionRoot } = {},
) {
  validateEditionId(editionId);
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value.editionId !== editionId ||
    !versionPattern.test(value.version) ||
    typeof value.version !== 'string' ||
    typeof value.scope !== 'string' ||
    value.scope.length > 2048 ||
    value.entry !== 'game/company.html' ||
    (value.buildId !== undefined && !/^[a-f0-9]{64}$/.test(value.buildId))
  )
    throw new TypeError('Edition installation identity differs.');
  const base = new URL(baseURL),
    scope = new URL(value.scope, base);
  const root =
    typeof editionRoot === 'string'
      ? /^(\/(?:[A-Za-z0-9_-]+\/)*)editions\/([^/]+)\/$/.exec(editionRoot)
      : null;
  const aliases = [editionId, editionPublicSlug(editionId)];
  if (
    !root ||
    !aliases.includes(root[2]) ||
    !/^https?:$/.test(base.protocol) ||
    scope.origin !== base.origin ||
    scope.username ||
    scope.password ||
    scope.search ||
    scope.hash ||
    !aliases.some(
      (slug) =>
        scope.pathname ===
        `${root[1]}editions/${slug}/releases/v${value.version.replace(/^v/, '')}/site/`,
    )
  )
    throw new TypeError('Install from the matching published edition address.');
  return Object.freeze({
    editionId,
    version: value.version,
    scope: scope.href,
    entry: value.entry,
    ...(value.buildId === undefined ? {} : { buildId: value.buildId }),
  });
}

/** Hash caches may share bytes; ownership and removal must remain separate. */
export function officialContentOwner({ editionId, packId, revision } = {}) {
  if (
    typeof packId !== 'string' ||
    !editionPattern.test(packId) ||
    packId.length > 100 ||
    typeof revision !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9.-]{0,63}$/.test(revision)
  )
    throw new TypeError('Invalid official content ownership.');
  return `${editionId === undefined ? 'default' : validateEditionId(editionId)}:${packId}:${revision}`;
}
