// Navigation hints open a fixed presentation surface; they never adopt game data.
const journey = (source, target) => {
  const values = source.searchParams.getAll('journey');
  if (values.length === 1 && /^(?:1|[a-z][a-z0-9-]{0,39})$/.test(values[0]))
    target.searchParams.set('journey', values[0]);
  const editions = source.searchParams.getAll('edition');
  if (
    editions.length === 1 &&
    editions[0].length <= 64 &&
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(editions[0])
  )
    target.searchParams.set('edition', editions[0]);
  return target;
};

export function assetStudioHref(gameHref) {
  const game = new URL(gameHref);
  return journey(game, new URL('../authoring/asset-studio/', game)).href;
}

export function studioReturnLinks(studioHref) {
  const studio = new URL(studioHref);
  const game = journey(studio, new URL('../../game/', studio));
  const workshop = new URL(game);
  workshop.searchParams.set('workshop', 'asset-studio');
  return Object.freeze({ game: game.href, workshop: workshop.href });
}

export function isAssetStudioReturn(search) {
  const parameters = new URLSearchParams(search);
  return (
    parameters.getAll('workshop').length === 1 &&
    parameters.get('workshop') === 'asset-studio' &&
    !['course', 'practice', 'pack', 'mode-return', 'mode-return-v2'].some((name) =>
      parameters.has(name),
    )
  );
}

export function clearAssetStudioReturn(host) {
  try {
    const url = new URL(host.location.href);
    if (!isAssetStudioReturn(url.search)) return;
    url.searchParams.delete('workshop');
    host.history.replaceState(host.history.state, '', url.href);
  } catch {
    // Restricted history does not block the explicit return or touch saved data.
  }
}

/** Prepare navigation independently of the large editing/registry dependency graph. */
export function mountStudioReturnLinks({ document: doc, href }) {
  const links = studioReturnLinks(href);
  for (const [id, target] of [
    ['studio-workshop-return', links.workshop],
    ['studio-game-return', links.game],
  ]) {
    const link = doc.getElementById(id);
    if (!link) continue;
    link.href = target;
    link.removeAttribute('inert');
    link.inert = false;
    link.removeAttribute('aria-disabled');
  }
}
