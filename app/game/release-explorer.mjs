/** Resolve the shared Pages release catalog from a source checkout or frozen release site. */
export function releaseExplorerHref(locationHref) {
  const location = new URL(locationHref);
  const frozenGame = /^(.*\/)releases\/v\d+\.\d+\.\d+\/site\/game(?:\/.*)?$/.exec(
    location.pathname,
  );
  if (frozenGame) return new URL(`${frozenGame[1]}releases/`, location.origin).href;
  const gameRoot = location.pathname.lastIndexOf('/game/');
  if (gameRoot >= 0)
    return new URL(`${location.pathname.slice(0, gameRoot + 1)}releases/`, location.origin).href;
  return new URL('../releases/', location).href;
}
