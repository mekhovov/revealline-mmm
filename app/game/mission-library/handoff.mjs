import { isAuthoredJourneyRouteId } from '../content-design/mode-href.mjs';
import { LIBRARY_COLLECTIONS, LIBRARY_LIFECYCLES, LIBRARY_MODES } from './library.mjs';

export const MISSION_LIBRARY_HANDOFF_PARAM = 'library-mission';
export const MISSION_LIBRARY_INTENT_PARAM = 'library-intent';
export const MISSION_LIBRARY_STATE_PREFIX = 'revealline-mmm.mission-library.selector.v1';
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const UNPAIRED_SURROGATE = /[\ud800-\udfff]/u;

function missionId(value) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 2048 ||
    CONTROL_CHARACTERS.test(value) ||
    UNPAIRED_SURROGATE.test(value)
  )
    throw new TypeError('Mission handoff needs a nonempty bounded display identity.');
  return value;
}

function modeId(value) {
  if (!LIBRARY_MODES.includes(value)) throw new TypeError('Unknown mission library mode.');
  return value;
}
const journeyForMode = (journey, mode) =>
  journey === 'legacy' ||
  (mode === 'team'
    ? journey === 'team-cultural-specialist-originals-2'
    : isAuthoredJourneyRouteId(journey));
// These finite historical Team routes are retained by relay-rescue's entry
// factory. Source navigation may return to them; this does not qualify any new
// destination mission for the unified library or fabricate a Team edition.
const TEAM_SOURCE_ROUTES = Object.freeze([
  'team-greybox',
  'team-originals',
  'team-pressure-originals-1',
  'team-spatial-originals-1',
  'team-trail-impact-originals-1',
  'team-specialist-originals-1',
  'team-complete-specialist-originals-1',
  'team-cultural-specialist-originals-1',
  'team-cultural-specialist-originals-2',
  'team-timed-originals',
  'team-window-spatial-1',
  'team-depot-spatial-1',
]);
export const isMissionLibrarySourceJourney = (journey, mode) =>
  LIBRARY_MODES.includes(mode) &&
  (journey === 'legacy' ||
    (mode === 'team' ? TEAM_SOURCE_ROUTES.includes(journey) : isAuthoredJourneyRouteId(journey)));
const returnTokenValid = (token) => typeof token === 'string' && /^[0-9a-f]{32}$/.test(token);

/** An opaque lookup request, not runtime, installation, progress or award authority.
 * Missing is different from malformed: hosts must show explicit invalid intent
 * instead of silently launching another mission when this reader throws.
 */
export function readMissionLibraryHandoff(params) {
  if (!(params instanceof URLSearchParams))
    throw new TypeError('Mission handoff needs URLSearchParams.');
  const values = params.getAll(MISSION_LIBRARY_HANDOFF_PARAM);
  if (!values.length) return null;
  if (values.length !== 1) throw new TypeError('Duplicate mission handoff parameters.');
  return missionId(values[0]);
}

/** Explicit Solo briefing intent; it never grants installation or progression. */
export function readMissionLibraryReady(params) {
  if (!(params instanceof URLSearchParams))
    throw new TypeError('Mission handoff needs URLSearchParams.');
  const values = params.getAll('library-ready');
  if (!values.length) return false;
  if (
    values.length !== 1 ||
    values[0] !== '1' ||
    !readMissionLibraryHandoff(params) ||
    params.getAll('journey').length !== 1 ||
    params.get('journey') !== 'legacy'
  )
    throw new TypeError('Ready handoff needs one exact Legacy mission request.');
  return true;
}

/** Existing links are explicit Play requests. A mode switch may only select a
 * row; malformed intent never silently upgrades that request into Play. */
export function readMissionLibraryIntent(params) {
  const id = readMissionLibraryHandoff(params),
    values = params.getAll(MISSION_LIBRARY_INTENT_PARAM);
  if (!values.length) return 'play';
  if (!id || values.length !== 1 || !['play', 'select'].includes(values[0]))
    throw new TypeError('Mission handoff needs one valid intent and an exact mission identity.');
  return values[0];
}

/** Independent, finite source navigation for an exact library handoff. Invalid
 * hints fall back normally; they never change the selected destination owner.
 * Token authenticity still belongs to the existing mode-return reader, not here.
 */
export function readMissionLibraryReturn(params, { mode } = {}) {
  try {
    modeId(mode);
    if (!readMissionLibraryHandoff(params)) return null;
    const destinations = params.getAll('journey'),
      sources = params.getAll('return'),
      routes = params.getAll('journey-return');
    if (
      destinations.length !== 1 ||
      !journeyForMode(destinations[0], mode) ||
      sources.length !== 1 ||
      !LIBRARY_MODES.includes(sources[0]) ||
      sources[0] === mode ||
      routes.length !== 1 ||
      !isMissionLibrarySourceJourney(routes[0], sources[0]) ||
      ['mode-return', 'mode-return-v2', 'practice'].some((key) => params.has(key))
    )
      return null;
    const tokens = params.getAll('return-token'),
      tokensV2 = params.getAll('return-token-v2');
    if (tokens.length || tokensV2.length) {
      const expected = mode === 'team' ? tokens : mode === 'versus' ? tokensV2 : [];
      if (
        sources[0] !== 'solo' ||
        routes[0] !== 'legacy' ||
        tokens.length + tokensV2.length !== 1 ||
        expected.length !== 1 ||
        !returnTokenValid(expected[0])
      )
        return null;
    }
    return Object.freeze({ mode: sources[0], journey: routes[0] });
  } catch {
    return null;
  }
}

/** Fixed same-game routes retain the selected release prefix. No inherited query,
 * arbitrary path or token is transported. Explicit source intent and an optional
 * token issued by the checked mode-return flow are separate from mission owner.
 */
export function missionLibraryHref({
  baseURL,
  currentMode,
  mode,
  journey,
  missionId: id,
  intent = 'play',
  sourceJourney,
  returnToken,
  ready = false,
}) {
  modeId(currentMode);
  modeId(mode);
  missionId(id);
  if (!['play', 'select'].includes(intent) || (intent === 'select' && mode !== 'versus'))
    throw new TypeError('Select-only mission handoff is supported in Versus.');
  if (typeof ready !== 'boolean' || (ready && (mode !== 'solo' || journey !== 'legacy')))
    throw new TypeError('Ready handoff is supported only for Solo Legacy missions.');
  if (!journeyForMode(journey, mode))
    throw new TypeError('Mission handoff needs a registered destination Journey route.');
  if (sourceJourney !== undefined && !isMissionLibrarySourceJourney(sourceJourney, currentMode))
    throw new TypeError('Mission handoff needs a registered source Journey route.');
  if (
    returnToken !== undefined &&
    (currentMode !== 'solo' ||
      !['team', 'versus'].includes(mode) ||
      sourceJourney !== 'legacy' ||
      !returnTokenValid(returnToken))
  )
    throw new TypeError('Mission handoff needs an issued, mode-qualified return token.');
  const base = new URL(baseURL);
  if (!['http:', 'https:', 'file:'].includes(base.protocol) || base.username || base.password)
    throw new TypeError('Mission handoff needs a same-game HTTP or file URL.');
  const root = new URL(currentMode === 'solo' ? './' : '../', base);
  const target = new URL(
    { solo: './', versus: 'couch/', team: 'couch/relay-rescue.html' }[mode],
    root,
  );
  target.searchParams.set('journey', journey);
  target.searchParams.set(MISSION_LIBRARY_HANDOFF_PARAM, id);
  if (intent === 'select') target.searchParams.set(MISSION_LIBRARY_INTENT_PARAM, intent);
  if (ready) target.searchParams.set('library-ready', '1');
  if (sourceJourney !== undefined && currentMode !== mode) {
    target.searchParams.set('return', currentMode);
    target.searchParams.set('journey-return', sourceJourney);
    if (returnToken !== undefined)
      target.searchParams.set(mode === 'team' ? 'return-token' : 'return-token-v2', returnToken);
  }
  return target.href;
}

function chooserState(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (key) =>
        !['search', 'collection', 'lifecycle', 'campaign', 'mode', 'selectedId', 'scroll'].includes(
          key,
        ),
    )
  )
    throw new TypeError('Invalid mission library chooser state.');
  const boundedText = (text, limit) =>
    typeof text === 'string' && text.length <= limit && !CONTROL_CHARACTERS.test(text);
  if (
    !boundedText(value.search, 512) ||
    !['', ...LIBRARY_COLLECTIONS].includes(value.collection) ||
    (value.lifecycle !== undefined && !['', ...LIBRARY_LIFECYCLES].includes(value.lifecycle)) ||
    !boundedText(value.campaign, 2048) ||
    !boundedText(value.selectedId, 2048) ||
    !LIBRARY_MODES.includes(value.mode) ||
    !Number.isFinite(value.scroll) ||
    value.scroll < 0 ||
    value.scroll > 10000000
  )
    throw new TypeError('Invalid mission library chooser state.');
  return {
    search: value.search,
    collection: value.collection,
    ...(value.lifecycle !== undefined ? { lifecycle: value.lifecycle } : {}),
    campaign: value.campaign,
    mode: value.mode,
    selectedId: value.selectedId,
    scroll: value.scroll,
  };
}

/** Session-only browsing continuity, scoped by host mode and independent of release.
 * This never reads or writes progress, settings, installed packs or media. Storage
 * failures retain the in-memory copy; malformed existing bytes remain untouched.
 */
export function createMissionLibrarySessionState({ mode, storage } = {}) {
  modeId(mode);
  const key = `${MISSION_LIBRARY_STATE_PREFIX}.${mode}`;
  const resolveStorage = () => (storage === undefined ? globalThis.sessionStorage : storage);
  let memory = null,
    pendingWrite = false;
  return Object.freeze({
    key,
    read() {
      if (pendingWrite) return memory ? { ...memory } : null;
      try {
        const raw = resolveStorage()?.getItem(key);
        if (typeof raw === 'string' && raw.length <= 32768) memory = chooserState(JSON.parse(raw));
      } catch {
        // Browsing remains usable while storage is unavailable or damaged.
      }
      return memory ? { ...memory } : null;
    },
    write(value) {
      memory = chooserState(value);
      pendingWrite = true;
      try {
        const target = resolveStorage();
        if (!target || typeof target.setItem !== 'function') return false;
        target.setItem(key, JSON.stringify(memory));
        pendingWrite = false;
        return true;
      } catch {
        return false;
      }
    },
  });
}
