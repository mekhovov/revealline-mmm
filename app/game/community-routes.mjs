export const COMMUNITY_ROUTES = Object.freeze([]);
export function communityRouteFromURL() { return null; }
export function communityHref() { return null; }
export function communityEntryURL() { throw new TypeError('Community selection is unavailable.'); }
export function gameDocumentURL(href) { const source = new URL(href), target = new URL('index.html', source); target.search = source.search; target.hash = source.hash; return target; }
export function communityDirectoryURL(href) { return gameDocumentURL(href); }
export function communityDirectoryReturnURL(value, directoryURL) {
  const game = new URL('../', directoryURL);
  try {
    const target = new URL(value, game);
    if (target.origin === game.origin && target.pathname.startsWith(game.pathname)) return target;
  } catch {}
  return game;
}
