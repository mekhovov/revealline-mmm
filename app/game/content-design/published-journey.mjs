import { createJourneyCatalog } from '../journey/catalog.mjs';
import { freezeDesign } from './catalogs.mjs';
import { t, getLocale } from '../i18n/index.mjs';

const admitted = new WeakSet(),
  views = new WeakMap(),
  chapterAuthority = new WeakMap();
export function admitPublishedRoute(route) {
  if (route.navigation?.format !== 'revealline-journey-navigation.v1')
    throw new Error('Unsupported published navigation.');
  admitted.add(route);
  return route;
}
export function publishedSourceAuthority(source) {
  return chapterAuthority.get(source) ?? null;
}
export function admitPublishedChapter(route, descriptor, source) {
  if (!admitted.has(route) || !route.navigation.chapters.includes(descriptor))
    throw new Error('Use a publisher-pinned chapter descriptor.');
  chapterAuthority.set(
    source,
    Object.freeze({
      projectSha256: route.navigation.project.sha256,
      projectId: route.navigation.project.id,
      projectRevision: route.navigation.project.revision,
    }),
  );
  return source;
}
const expand = (values, count) => {
  if (!Array.isArray(values) || values.length % 2 || count > 65536)
    throw new Error('Invalid published diagram.');
  const result = [];
  for (let i = 0; i < values.length; i += 2) {
    const length = values[i + 1];
    if (!Number.isInteger(length) || length < 1 || result.length + length > count)
      throw new Error('Invalid published diagram run.');
    for (let j = 0; j < length; j++) result.push(values[i]);
  }
  if (result.length !== count) throw new Error('Incomplete published diagram.');
  return result;
};

/** Only hash-verified, code-owned publication metadata enters these views. */
export function publishedRouteViews(route) {
  if (!route?.navigation) return null;
  if (!admitted.has(route)) throw new Error('Published navigation has not been verified.');
  if (views.has(route)) return views.get(route);
  const cards = new Map();
  const view = (projection) => {
    const baseCatalog = createJourneyCatalog(projection.campaigns);
    const remap = (mission) => (mission ? byId.get(mission.id) : null);
    const missions = Object.freeze(
      baseCatalog.missions.map((mission) =>
        Object.freeze({
          ...mission,
          levelIndex: projection.ordinals?.[mission.id] ?? mission.levelIndex,
        }),
      ),
    );
    const byId = new Map(missions.map((mission) => [mission.id, mission]));
    const catalog = Object.freeze({
      ...baseCatalog,
      missions,
      find: (id) => byId.get(id) ?? null,
      forMode: (mode) => Object.freeze(baseCatalog.forMode(mode).map(remap)),
      next: (...args) => remap(baseCatalog.next(...args)),
      search: (...args) => baseCatalog.search(...args).map(remap),
    });
    const presentation = (mission, difficulty) =>
      catalog.find(mission?.id) === mission
        ? projection.presentations[mission.id]?.[difficulty]
        : null;
    return Object.freeze({
      catalog,
      executionMetadata: projection.executionMetadata,
      card(mission, difficulty = 'standard') {
        const id = presentation(mission, difficulty)?.card;
        if (!id) return null;
        if (!cards.has(id)) {
          const compact = route.navigation.cards[id],
            count = compact.width * compact.height;
          cards.set(
            id,
            freezeDesign({
              ...compact,
              cells: expand(compact.cells, count),
              terrain: expand(compact.terrain, count),
            }),
          );
        }
        return cards.get(id);
      },
      details(mission, difficulty = 'standard') {
        const item = presentation(mission, difficulty);
        if (!item) return null;
        const translated = (field, fallback) => {
          const value = item.translations[field];
          return getLocale() !== 'en' && value?.source === fallback ? t(value.key) : fallback;
        };
        return Object.freeze({
          challenge: t('interface:missionLibrary.challenge', {
            band: item.band,
            difficulty: t(`interface:missionLibrary.difficulty.${difficulty}`),
          }),
          route: translated('routeDecision', item.route),
          mastery: translated('mastery', item.mastery),
        });
      },
      tags(mission, difficulty = 'standard') {
        return presentation(mission, difficulty)?.tags ?? [];
      },
    });
  };
  const navigation = route.navigation;
  const result = Object.freeze({
    solo: view(navigation.views.solo),
    versus: view(navigation.views.versus),
    team: Object.freeze({
      route: navigation.team.route,
      view: view(navigation.team.view),
      arenas: navigation.team.arenas,
    }),
    archives: Object.freeze(
      navigation.archives.map((archive) =>
        Object.freeze({
          route: archive.route,
          solo: view(archive.views.solo),
          versus: view(archive.views.versus),
        }),
      ),
    ),
  });
  views.set(route, result);
  return result;
}

/** The published arena rows retain the existing Team Classic library IDs. */
export function publishedTeamArenaSource(metadata, { launch }) {
  return {
    id: metadata.sourceId,
    editionId: metadata.editionId,
    edition: metadata.edition,
    collection: 'Classic',
    entries: metadata.rows,
    describe: (row) => ({
      id: row.levelId,
      revision: metadata.revision,
      campaignKey: metadata.packId,
      campaignTitle: metadata.packName,
      name: row.title,
      levelIndex: row.levelIndex,
      modes: ['team'],
      rules: row.goal,
    }),
    presentation: () => ({ edition: metadata.edition }),
    availability: () => ({ state: 'ready' }),
    progress: () => '',
    launch: (_row, context) => launch(context),
  };
}
