import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import { freezeMedia, isMediaIdentityCatalog, isMediaLibrary } from './media-library.mjs';
import { createPresentationResolver } from './media-presentation.mjs';

export const PRESENTATION_PINS_FORMAT = 'revealline-flight-pictures.v1';
export const PRESENTATION_PINS_BYTES = 8192;
const text = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const own = (source) =>
  boundedJSON(source, {
    maxBytes: PRESENTATION_PINS_BYTES,
    maxArray: 64,
    maxNodes: 2048,
    maxString: 512,
  });

/** A picture choice records identity, never image bytes or simulation state. */
export function snapshotPictureChoice(source) {
  const value = own(source),
    managed = value?.kind === 'still';
  exactKeys(
    value,
    [
      'kind',
      'identity',
      ...(managed ? ['presentationId', 'presentationRevision', 'assetId', 'sha256'] : []),
    ],
    'saved picture choice',
  );
  required(managed || value.kind === 'legacy', 'Unsupported saved picture choice.');
  exactKeys(
    value.identity,
    ['baseCampaignKey', 'levelId', 'levelRevision', 'themeId'],
    'saved picture identity',
  );
  required(
    text(value.identity.baseCampaignKey, 512) &&
      stableId(value.identity.levelId) &&
      text(value.identity.levelRevision, 80) &&
      stableId(value.identity.themeId),
    'Invalid saved picture identity.',
  );
  if (managed)
    required(
      stableId(value.presentationId) &&
        Number.isSafeInteger(value.presentationRevision) &&
        value.presentationRevision > 0 &&
        value.presentationRevision <= 1000000 &&
        stableId(value.assetId) &&
        typeof value.sha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(value.sha256),
      'Invalid saved picture revision or original hash.',
    );
  return freezeMedia(value);
}

export function snapshotPresentationPins(source) {
  const value = own(source);
  exactKeys(
    value,
    ['format', 'executionKey', 'levelId', 'levelRevision', 'choices'],
    'saved flight pictures',
  );
  required(
    value.format === PRESENTATION_PINS_FORMAT &&
      text(value.executionKey, 512) &&
      stableId(value.levelId) &&
      text(value.levelRevision, 80),
    'Invalid saved flight picture identity.',
  );
  required(
    Array.isArray(value.choices) && value.choices.length > 0 && value.choices.length <= 64,
    'Saved flight needs bounded theme choices.',
  );
  const themes = new Set();
  let base = null;
  value.choices = value.choices.map((sourceChoice) => {
    const choice = snapshotPictureChoice(sourceChoice);
    required(
      choice.identity.levelId === value.levelId && !themes.has(choice.identity.themeId),
      'Saved picture themes must be unique and belong to this map.',
    );
    const owner = canonicalJSON([
      choice.identity.baseCampaignKey,
      choice.identity.levelId,
      choice.identity.levelRevision,
    ]);
    required(base === null || base === owner, 'Saved pictures cannot mix authored map owners.');
    base = owner;
    themes.add(choice.identity.themeId);
    return choice;
  });
  return freezeMedia(value);
}

/** Freeze all installed worlds once, including explicit authored-art choices. */
export function createPresentationPins({
  library,
  identityCatalog,
  executionKey,
  levelId,
  levelRevision,
  themeIds,
}) {
  required(
    isMediaLibrary(library) && isMediaIdentityCatalog(identityCatalog),
    'Picture preparation requires verified media and execution catalogs.',
  );
  const ids = own(themeIds);
  required(
    Array.isArray(ids) &&
      ids.length > 0 &&
      ids.length <= 64 &&
      ids.every(stableId) &&
      new Set(ids).size === ids.length,
    'Expected unique installed picture themes.',
  );
  const resolver = createPresentationResolver(library, identityCatalog);
  return snapshotPresentationPins({
    format: PRESENTATION_PINS_FORMAT,
    executionKey,
    levelId,
    levelRevision,
    choices: ids.map((themeId) => {
      const request = { executionKey, levelId, levelRevision, themeId },
        identity = identityCatalog.resolve(request);
      required(identity, 'Picture choice is not in the installed execution catalog.');
      const result = resolver.resolve(request);
      return result.kind === 'still'
        ? {
            kind: 'still',
            identity,
            presentationId: result.presentation.id,
            presentationRevision: result.presentation.revision,
            assetId: result.asset.id,
            sha256: result.asset.sha256,
          }
        : { kind: 'legacy', identity };
    }),
  });
}

/** Validate against the exact restored execution, without resolving new assignments. */
export function validatePresentationPinsForRun(
  source,
  { identityCatalog, campaignKey, level, themeId },
) {
  const pins = snapshotPresentationPins(source);
  required(
    isMediaIdentityCatalog(identityCatalog),
    'Restoring saved pictures needs the verified execution catalog.',
  );
  required(
    pins.executionKey === campaignKey &&
      pins.levelId === level?.id &&
      pins.levelRevision === level?.revision,
    'Saved pictures belong to a different flight context.',
  );
  required(
    pins.choices.some((choice) => choice.identity.themeId === themeId),
    'Saved flight has no picture choice for its selected world.',
  );
  for (const choice of pins.choices) {
    const identity = identityCatalog.resolve({
      executionKey: campaignKey,
      levelId: level.id,
      levelRevision: level.revision,
      themeId: choice.identity.themeId,
    });
    required(
      identity && canonicalJSON(identity) === canonicalJSON(choice.identity),
      'Saved picture owner differs from the installed authored map.',
    );
  }
  return pins;
}

/** Historical revision lookup. Missing originals never select a newer assignment. */
export function resolvePinnedPicture(source, themeId, library) {
  const pins = snapshotPresentationPins(source);
  required(stableId(themeId), 'Invalid picture world.');
  const pin = pins.choices.find((choice) => choice.identity.themeId === themeId);
  required(pin, 'This world was not included when the attempt was prepared.');
  if (pin.kind === 'legacy') return Object.freeze({ kind: 'legacy', pin });
  required(isMediaLibrary(library), 'Pinned picture lookup requires a verified media library.');
  const presentation = library.presentations.find(
      (item) => item.id === pin.presentationId && item.revision === pin.presentationRevision,
    ),
    asset = library.assets.find((item) => item.id === pin.assetId);
  if (
    !presentation ||
    !asset ||
    canonicalJSON(presentation.identity) !== canonicalJSON(pin.identity) ||
    presentation.poster.assetId !== pin.assetId ||
    asset.sha256 !== pin.sha256
  )
    return Object.freeze({ kind: 'unavailable', reason: 'saved-picture-missing', pin });
  return Object.freeze({ kind: 'still', pin, presentation, asset });
}
