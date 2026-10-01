import { AUTHORED_JOURNEY_ROUTE_IDS } from '../content-design/mode-href.mjs';

const ROUTES = new Set(AUTHORED_JOURNEY_ROUTE_IDS);

/** Code-owned destinations only. Mode entry retains the library route, never a
 * simulation, mission selection, save slot, receipt or arbitrary return URL. */
export function authoredModeDestinations(mode, route) {
  if (route === 'legacy' && ['solo', 'versus'].includes(mode))
    return Object.freeze(
      mode === 'solo'
        ? {
            versus: 'couch/?journey=legacy&return=solo',
            team: 'couch/relay-rescue.html?journey=legacy&return=solo',
          }
        : {
            solo: '../?journey=legacy',
            team: 'relay-rescue.html?journey=legacy&return=versus',
          },
    );
  if (!ROUTES.has(route) || !['solo', 'versus'].includes(mode)) return null;
  return Object.freeze(
    mode === 'solo'
      ? {
          versus: `couch/?journey=${route}&return=solo`,
          team: `couch/relay-rescue.html?return=solo&journey-return=${route}`,
        }
      : {
          solo: `../?journey=${route}`,
          team: `relay-rescue.html?return=versus&journey-return=${route}`,
        },
  );
}

/** Team remains its separate experience. A finite origin hint restores only
 * navigation to an authored host; it cannot select or import Team content. */
export function authoredTeamReturn(href) {
  try {
    const params = new URL(href).searchParams;
    const routes = params.getAll('journey-return'),
      origins = params.getAll('return');
    if (
      routes.length !== 1 ||
      !ROUTES.has(routes[0]) ||
      origins.length !== 1 ||
      !['solo', 'versus'].includes(origins[0]) ||
      [
        'journey',
        'practice',
        'return-token',
        'return-token-v2',
        'mode-return',
        'mode-return-v2',
      ].some((key) => params.has(key))
    )
      return null;
    return Object.freeze({
      solo: `../?journey=${routes[0]}`,
      versus: `./?journey=${routes[0]}`,
      origin: origins[0],
    });
  } catch {
    return null;
  }
}
