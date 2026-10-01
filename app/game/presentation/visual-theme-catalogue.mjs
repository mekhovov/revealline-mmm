import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';

export const VISUAL_THEME_CATALOGUE_FORMAT = 'revealline-visual-theme-catalogue.v1';
export const VISUAL_THEME_CATALOGUE_LIMITS = Object.freeze({
  bytes: 1024 * 1024,
  entries: 128,
  coverage: 512,
  slots: 512,
});
const hash = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const text = (v, max) => typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= max;
const revision = (v) => Number.isSafeInteger(v) && v > 0 && v <= 1000000;
const authoredText = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const authoredRevision = (v) => revision(v) || authoredText(v, 80);
const key = (v) => canonicalJSON(v);
const catalogues = new WeakMap();
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
function fields(value, names, label) {
  exactKeys(value, names, label);
  required(
    names.every((name) => Object.hasOwn(value, name)),
    `${label} is incomplete.`,
  );
}
function ref(value) {
  fields(value, ['id', 'revision'], 'visual theme reference');
  required(stableId(value.id) && revision(value.revision), 'Invalid exact visual theme reference.');
  return value;
}
function own(source, maxBytes = VISUAL_THEME_CATALOGUE_LIMITS.bytes) {
  return boundedJSON(source, {
    maxBytes,
    maxNodes: 100000,
    maxDepth: 14,
    maxArray: 512,
    maxString: 512,
  });
}
function context(value) {
  fields(value, ['editionId', 'contentThemeId', 'mode', 'owner', 'level'], 'visual theme content');
  required(
    stableId(value.editionId) && stableId(value.contentThemeId),
    'Invalid content edition or theme.',
  );
  required(['solo', 'versus', 'team'].includes(value.mode), 'Unsupported visual theme mode.');
  const owner = value.owner;
  if (owner.kind === 'journey') {
    fields(
      owner,
      [
        'kind',
        'projectId',
        'projectRevision',
        'projectSha256',
        'packId',
        'campaignId',
        'baseCampaignKey',
        'policyId',
      ],
      'Journey content owner',
    );
    required(
      stableId(owner.projectId) &&
        authoredRevision(owner.projectRevision) &&
        hash(owner.projectSha256) &&
        stableId(owner.packId) &&
        stableId(owner.campaignId) &&
        authoredText(owner.baseCampaignKey, 512) &&
        stableId(owner.policyId),
      'Invalid exact Journey owner.',
    );
  } else if (value.mode === 'team') {
    fields(owner, ['kind', 'id', 'revision', 'sha256'], 'Team content owner');
    required(
      owner.kind === 'team-pack' &&
        stableId(owner.id) &&
        authoredRevision(owner.revision) &&
        hash(owner.sha256),
      'Invalid exact Team pack owner.',
    );
  } else {
    fields(owner, ['kind', 'baseCampaignKey'], 'campaign content owner');
    required(
      owner.kind === 'campaign' && authoredText(owner.baseCampaignKey, 512),
      'Use the accepted authored campaign key.',
    );
  }
  fields(
    value.level,
    owner.kind === 'journey'
      ? ['id', 'revision', 'sha256', 'simulationIdentity']
      : ['id', 'revision', 'sha256'],
    'visual theme level',
  );
  if (owner.kind === 'journey')
    required(
      typeof value.level.simulationIdentity === 'string' &&
        /^[a-f0-9]{16}$/.test(value.level.simulationIdentity),
      'Use the existing Journey simulation identity.',
    );
  required(
    stableId(value.level.id) && authoredRevision(value.level.revision) && hash(value.level.sha256),
    'Invalid exact visual theme level.',
  );
  return value;
}
export function snapshotVisualThemeContext(source) {
  return freeze(context(own(source, 4096)));
}
function presentation(value) {
  fields(value, ['source', 'theme', 'collection', 'sha256'], 'visual theme presentation');
  ref(value.source);
  ref(value.theme);
  if (value.collection !== null) ref(value.collection);
  required(hash(value.sha256), 'Visual theme needs the exact compiled manifest hash.');
  return value;
}
function slots(source) {
  const value = own(source, 64 * 1024);
  required(
    Array.isArray(value) &&
      value.length > 0 &&
      value.length <= VISUAL_THEME_CATALOGUE_LIMITS.slots &&
      value.every(stableId) &&
      new Set(value).size === value.length,
    'Use a nonempty unique list of required asset slots.',
  );
  return value;
}

/** Declared release compatibility, not art approval or a storage/launch authority.
 * Owners supply already accepted authored identities. Numeric Team revisions
 * remain numeric; legacy campaign keys are copied, never rebuilt from a label.
 */
export function createVisualThemeCatalogue(source, { previous = null } = {}) {
  const value = own(source);
  fields(value, ['format', 'id', 'revision', 'entries'], 'visual theme catalogue');
  required(
    value.format === VISUAL_THEME_CATALOGUE_FORMAT &&
      stableId(value.id) &&
      revision(value.revision),
    'Unsupported visual theme catalogue.',
  );
  required(
    Array.isArray(value.entries) && value.entries.length <= VISUAL_THEME_CATALOGUE_LIMITS.entries,
    'Too many visual theme entries.',
  );
  const entries = new Map();
  for (const entry of value.entries) {
    fields(entry, ['id', 'revision', 'name', 'presentation', 'coverage'], 'visual theme entry');
    const identity = ref({ id: entry.id, revision: entry.revision });
    required(!entries.has(key(identity)), 'Duplicate immutable visual theme entry.');
    required(text(entry.name, 120), 'Invalid visual theme name.');
    presentation(entry.presentation);
    required(
      Array.isArray(entry.coverage) &&
        entry.coverage.length > 0 &&
        entry.coverage.length <= VISUAL_THEME_CATALOGUE_LIMITS.coverage,
      'Visual theme needs explicit bounded content coverage.',
    );
    const coverage = new Set();
    for (const row of entry.coverage) {
      context(row);
      const identity = key(row);
      required(!coverage.has(identity), 'Duplicate visual theme content coverage.');
      coverage.add(identity);
    }
    entries.set(key(identity), { entry, coverage });
  }
  if (previous !== null) {
    const prior = catalogues.get(previous);
    required(prior, 'Previous catalogue must be a validated owner.');
    required(
      prior.id === value.id && value.revision > prior.revision,
      'Advance the same catalogue revision.',
    );
    for (const old of prior.entries) {
      const next = entries.get(key({ id: old.id, revision: old.revision }));
      required(next && key(next.entry) === key(old), 'Retain immutable historical theme entries.');
    }
  }
  freeze(value);
  const matches = new WeakSet();
  const catalogue = Object.freeze({
    snapshot: () => value,
    resolve(selection, target) {
      const content = snapshotVisualThemeContext(target);
      if (selection === null) return freeze({ kind: 'campaign-style', content });
      const chosen = freeze(ref(own(selection, 1024)));
      const record = entries.get(key(chosen));
      if (!record) return freeze({ kind: 'unavailable', selection: chosen, content });
      if (!record.coverage.has(key(content)))
        return freeze({
          kind: 'unsupported',
          selection: chosen,
          content,
          alternative: 'campaign-style',
        });
      const match = freeze({
        kind: 'compatible',
        selection: chosen,
        content,
        presentation: record.entry.presentation,
      });
      matches.add(match);
      return match;
    },
    /** Compare a declaration produced by the verified compiled-asset loader.
     * The caller's authoritative mode/scene registry supplies requiredSlots.
     * This does not fetch, hash, decode, apply, pin, or approve any artwork.
     */
    verifyPresentationIdentity(match, declaration, requiredSlots) {
      required(matches.has(match), 'Resolve compatible content with this catalogue first.');
      const checked = own(declaration, 128 * 1024);
      fields(
        checked,
        ['source', 'theme', 'collection', 'sha256', 'slots'],
        'loaded presentation declaration',
      );
      const { slots: loaded, ...identity } = checked;
      presentation(identity);
      required(
        key(identity) === key(match.presentation),
        'Loaded presentation does not match its exact declared revision and hash.',
      );
      const available = new Set(slots(loaded));
      const missing = slots(requiredSlots).filter((slot) => !available.has(slot));
      required(
        missing.length === 0,
        `Required presentation slots are missing: ${missing.join(', ')}.`,
      );
      return match;
    },
  });
  catalogues.set(catalogue, value);
  return catalogue;
}
