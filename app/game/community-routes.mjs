export const COMMUNITY_ROUTES = Object.freeze([]);
export function communityRouteFromURL() { return null; }
export function communityHref() { return null; }
export function communityEntryURL() { throw new TypeError('Community selection is unavailable.'); }
export function gameDocumentURL(href) { const source = new URL(href), target = new URL('index.html', source); target.search = source.search; target.hash = source.hash; return target; }
