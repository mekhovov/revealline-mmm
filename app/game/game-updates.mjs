import { installedAppURL, validateInstalledEdition } from './installed-app.mjs';
import { communityDirectoryReturnURL } from './community-routes.mjs';

/** Update navigation leaves the old game's worker without clearing its caches. */
export function gameUpdatesURL(locationRef = globalThis.location) {
  const url = new URL('update.html', installedAppURL(locationRef));
  url.searchParams.set('return', locationRef.href);
  return url;
}

/** Only the publisher's exact update page may load a different edition's marker. */
export function readGameUpdateContext(
  doc = globalThis.document,
  locationRef = globalThis.location,
) {
  try {
    const page = new URL(locationRef.href);
    if (page.pathname !== new URL('update.html', installedAppURL(locationRef)).pathname)
      return null;
    const value = JSON.parse(
      doc.querySelector('meta[name="revealline-update"]')?.content || 'null',
    );
    const config = JSON.parse(
      doc.querySelector('meta[name="revealline-offline"]')?.content || 'null',
    );
    if (
      value?.format !== 'revealline-app-update.v1' ||
      !/^[a-f0-9]{64}$/.test(value.buildId) ||
      value.buildId !== config?.buildId
    )
      return null;
    const scope = new URL(value.scope, page).href;
    if (scope !== new URL(config.scope, page).href) return null;
    validateInstalledEdition({ version: config.version, scope }, locationRef);
    return { ...value, scope };
  } catch {
    return null;
  }
}

export function updateReturnURL(
  locationRef,
  candidateScope,
  active,
  { sourceActive, remap = false } = {},
) {
  const page = new URL(locationRef.href);
  let scope = candidateScope;
  try {
    if (active) scope = validateInstalledEdition(active, locationRef).scope;
  } catch {
    // Invalid installed metadata cannot select an external destination.
  }
  const directory = new URL('game/communities/', scope);
  const requested = page.searchParams.get('return') || new URL('game/', scope).href;
  if (remap && sourceActive) {
    try {
      // Only the edition recorded before activation can authorize a remap.
      // Query text alone cannot select a different release or public origin.
      const sourceScope = validateInstalledEdition(sourceActive, locationRef).scope;
      const sourceGame = new URL('game/', sourceScope);
      const source = communityDirectoryReturnURL(requested, new URL('communities/', sourceGame));
      const target = new URL(
        source.pathname.slice(sourceGame.pathname.length),
        new URL('game/', scope),
      );
      target.search = source.search;
      target.hash = source.hash;
      return communityDirectoryReturnURL(target, directory);
    } catch {
      // Invalid earlier metadata falls back to the target's own game entry.
    }
  }
  return communityDirectoryReturnURL(requested, directory);
}

/** Preserve all-current intent across new chapters, but never opt into music. */
export function restoredGameplaySelection(catalogue, { saved, active, edition, updating = false }) {
  const installed = updating || active?.scope === edition ? active : null;
  const retained = saved || installed;
  // Preparing a bookmarked mode extends the active installation without
  // rewriting its completed bulk-download checkpoint. Keep both selections
  // during updates; an unfinished checkpoint still owns its explicit choices.
  const mergeInstalled = updating && saved?.complete === true && installed;
  const available = new Set(catalogue.groups.filter((g) => g.kind === 'gameplay').map((g) => g.id));
  const selected = [
    ...new Set([
      ...(retained?.selection || []),
      ...(mergeInstalled ? installed.selection || [] : []),
    ]),
  ].filter((id) => available.has(id));
  const all =
    mergeInstalled && installed.allGameplay === true
      ? true
      : typeof saved?.allGameplay === 'boolean'
        ? saved.allGameplay
        : installed?.allGameplay === true ||
          (selected.length > 0 &&
            catalogue.groups
              .filter(
                (g) =>
                  g.kind === 'gameplay' &&
                  g.current !== false &&
                  !['archive', 'tooling'].includes(g.category),
              )
              .every((g) => selected.includes(g.id)));
  return { selected, all };
}
