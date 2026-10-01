import { DEFAULT_JOURNEY_ROUTES } from './default-entry.mjs';
import { AUTHORED_JOURNEY_ROUTE_IDS } from './mode-href.mjs';

export const CONTENT_LIFECYCLE_VERSION = 'revealline-content-lifecycle.v1';
export const CONTENT_CLASSIFICATIONS = Object.freeze([
  'current',
  'archived',
  'compatibility-only',
  'tooling',
]);

// Discovery policy only. Never add archived flags to immutable project sources:
// the compiler filters those flags, including when recovering historical runs.
export const TEAM_CONTENT_ROUTES = Object.freeze(
  [
    { id: 'team-greybox', classification: 'tooling' },
    { id: 'team-originals', classification: 'archived' },
    { id: 'team-pressure-originals-1', classification: 'archived' },
    { id: 'team-spatial-originals-1', classification: 'archived' },
    { id: 'team-trail-impact-originals-1', classification: 'archived' },
    { id: 'team-specialist-originals-1', classification: 'tooling' },
    { id: 'team-complete-specialist-originals-1', classification: 'tooling' },
    { id: 'team-cultural-specialist-originals-1', classification: 'archived' },
    { id: 'team-cultural-specialist-originals-2', classification: 'current' },
    { id: 'team-timed-originals', classification: 'archived' },
    { id: 'team-window-spatial-1', classification: 'archived' },
    { id: 'team-depot-spatial-1', classification: 'tooling' },
  ].map(Object.freeze),
);

export const ARCHIVED_CLASSIC_PACK_IDS = Object.freeze([
  'fpv-arcade',
  'fpv-arcade-r2',
  'fpv-arcade-r3',
  'fpv-arcade-r4',
  'original-fpv-pressure-external',
]);

/** Code-owned catalogue entries only. Imported names never acquire this policy. */
export function classifyContent({ family, id, source } = {}) {
  if (family === 'journey') {
    if (!AUTHORED_JOURNEY_ROUTE_IDS.includes(id)) return null;
    return Object.values(DEFAULT_JOURNEY_ROUTES).includes(id) ? 'current' : 'archived';
  }
  if (family === 'team')
    return TEAM_CONTENT_ROUTES.find((route) => route.id === id)?.classification ?? null;
  if (family === 'classic') {
    if (
      !['base', 'bundled', 'built-in', 'archived', 'archive', 'optional', 'external'].includes(
        source,
      )
    )
      return null;
    return ['archived', 'archive'].includes(source) || ARCHIVED_CLASSIC_PACK_IDS.includes(id)
      ? 'archived'
      : 'current';
  }
  if (family === 'compatibility' && source === 'saved-dependency') return 'compatibility-only';
  if (family === 'tooling' && source === 'build-owned') return 'tooling';
  return null;
}

export function discoverableContent(classification, { archive = false, tooling = false } = {}) {
  return (
    classification === 'current' ||
    (archive && classification === 'archived') ||
    (tooling && classification === 'tooling')
  );
}
