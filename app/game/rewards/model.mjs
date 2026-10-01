import { boundedJSON, dataIdentity, exactKeys, required, stableId } from '../data-json.mjs';
import { validateKnowledgeProfiles } from './learning-profiles.mjs';
import { explorationAssetReferences, validateExplorationPayload } from './exploration.mjs';
import { validateRewardAudioGroups } from './audio-groups.mjs';

export const COMPLETION_REWARD_FORMAT = 'revealline-completion-reward.v1';
export const COMPLETION_REWARD_V2_FORMAT = 'revealline-completion-reward.v2';
export const EARNED_REWARD_FORMAT = 'revealline-earned-reward.v1';
export const EARNED_REWARD_V2_FORMAT = 'revealline-earned-reward.v2';
export const REWARD_STATE_FORMAT = 'revealline-reward-state.v1';
export const REWARD_STATE_V2_FORMAT = 'revealline-reward-state.v2';

// Only outputs created here may skip a boundary validation. A frozen caller
// object (including a structured clone of an output) is not trusted.
const ownedDefinitions = new WeakSet(),
  ownedDefinitionLists = new WeakSet(),
  ownedEvidence = new WeakSet(),
  ownedReceipts = new WeakSet(),
  ownedStates = new WeakSet(),
  frozenOutputs = new WeakSet(),
  definitionIdentities = new WeakMap();
const definitionListLimits = { maxBytes: 8 * 1024 * 1024, maxNodes: 500000, maxArray: 512 };
const stateLimits = { maxBytes: 16 * 1024 * 1024, maxNodes: 1000000, maxArray: 512 };
const receiptLimits = { maxBytes: 256 * 1024, maxNodes: 20000, maxArray: 512 };
const remember = (set, value) => {
  freeze(value);
  set.add(value);
  return value;
};
const freeze = (value) => {
  if (value && typeof value === 'object' && !frozenOutputs.has(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
    frozenOutputs.add(value);
  }
  return value;
};
const text = (value, max = 2048) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const unique = (values) => new Set(values).size === values.length;
const identity = (value) => typeof value === 'string' && /^[a-f0-9]{16}$/.test(value);
const sha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const array = (value, max, label, min = 0) =>
  required(Array.isArray(value) && value.length >= min && value.length <= max, `Invalid ${label}.`);
const ids = (value, max, label) => {
  array(value, max, label);
  required(value.every(stableId) && unique(value), `Invalid ${label}.`);
};

function https(value) {
  required(
    text(value) && value === value.trim() && !/[\u0000-\u0020\u007f]/.test(value),
    'Invalid reward URL.',
  );
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('Invalid reward URL.');
  }
  required(
    url.protocol === 'https:' && !url.username && !url.password && !value.includes('\\'),
    'Rewards require an HTTPS URL without credentials.',
  );
}

function asset(value) {
  exactKeys(value, ['assetId', 'sha256'], 'reward asset');
  required(
    stableId(value.assetId) && sha256(value.sha256),
    'Reward assets require an ID and exact SHA-256.',
  );
}

function locales(value, keys, requiredKeys = keys) {
  exactKeys(value, ['en', 'uk'], 'reward locales');
  for (const locale of ['en', 'uk']) {
    exactKeys(value[locale], keys, `reward ${locale}`);
    for (const key of requiredKeys)
      required(text(value[locale][key]), `Missing reward ${locale}.${key}.`);
  }
}

/** A separate, localized image that is safe to show before earning a reward. */
export function validateRewardTeaserImage(input) {
  const value = boundedJSON(input, { maxBytes: 8192, maxNodes: 32, maxArray: 8 });
  exactKeys(value, ['asset', 'locales'], 'reward teaser image');
  asset(value.asset);
  locales(value.locales, ['alt']);
  return freeze(value);
}

const payloadAssetReferences = (item) =>
  [
    item.asset,
    item.poster,
    ...Object.values(item.transcript ?? {}),
    ...Object.values(item.captions ?? {}),
    ...(item.type === 'exploration' ? explorationAssetReferences(item.recipe) : []),
  ].filter(Boolean);

function source(value) {
  exactKeys(value, ['title', 'url'], 'reward source');
  required(text(value.title), 'Missing reward source title.');
  https(value.url);
}

function payload(value) {
  if (value?.type === 'exploration') {
    validateExplorationPayload(value);
    return;
  }
  const shared = ['id', 'type', 'locales'];
  const fields = {
    knowledge: ['profiles'],
    image: ['asset'],
    url: ['url', 'qr'],
    'public-code': ['code', 'issuer', 'termsUrl', 'expiresOn'],
    audio: ['asset', 'transcript'],
    video: ['asset', 'poster', 'captions', 'transcript'],
    cosmetic: ['recipeId', 'recipeRevision'],
  };
  required(Object.hasOwn(fields, value?.type), 'Unknown reward payload type.');
  exactKeys(value, [...shared, ...fields[value.type]], 'reward payload');
  required(stableId(value.id), 'Invalid reward payload ID.');
  if (value.type === 'knowledge') {
    if (value.profiles !== undefined) validateKnowledgeProfiles(value.profiles);
    locales(value.locales, ['title', 'paragraphs', 'sources'], ['title']);
    for (const locale of Object.values(value.locales)) {
      array(locale.paragraphs, 12, 'knowledge paragraphs', 1);
      required(
        locale.paragraphs.every((item) => text(item)),
        'Invalid knowledge paragraph.',
      );
      if (locale.sources !== undefined) {
        array(locale.sources, 12, 'knowledge sources');
        locale.sources.forEach(source);
      }
    }
  } else if (value.type === 'image') locales(value.locales, ['title', 'alt']);
  else if (value.type === 'public-code') locales(value.locales, ['title', 'terms']);
  else locales(value.locales, ['title']);
  if (['image', 'audio', 'video'].includes(value.type)) asset(value.asset);
  if (value.type === 'url') {
    https(value.url);
    if (value.qr !== undefined) {
      required(typeof value.qr === 'boolean', 'QR presentation must be a boolean.');
      if (value.qr)
        required(
          new TextEncoder().encode(new URL(value.url).href).length <= 256,
          'A QR reward URL must fit within 256 encoded bytes; use its direct resource address.',
        );
    }
  }
  if (value.type === 'public-code') {
    required(
      text(value.code, 256) && text(value.issuer, 256),
      'Public codes require an issuer and code.',
    );
    if (value.termsUrl !== undefined) https(value.termsUrl);
    if (value.expiresOn !== undefined) {
      required(
        typeof value.expiresOn === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(value.expiresOn) &&
          Number.isFinite(Date.parse(value.expiresOn)) &&
          new Date(value.expiresOn).toISOString().slice(0, 10) === value.expiresOn,
        'Invalid public code expiry.',
      );
    }
  }
  if (value.type === 'audio' || value.type === 'video') {
    exactKeys(value.transcript, ['en', 'uk'], 'reward transcripts');
    asset(value.transcript.en);
    asset(value.transcript.uk);
  }
  if (value.type === 'video') {
    asset(value.poster);
    exactKeys(value.captions, ['en', 'uk'], 'reward captions');
    asset(value.captions.en);
    asset(value.captions.uk);
  }
  if (value.type === 'cosmetic')
    required(
      stableId(value.recipeId) && text(value.recipeRevision, 128),
      'Invalid cosmetic recipe reference.',
    );
}

/** A standalone typed payload validator for shared authoring/player viewers. */
export function validateCompletionRewardPayload(input) {
  const value = boundedJSON(input, { maxBytes: 65536, maxNodes: 8192, maxArray: 256 });
  payload(value);
  return freeze(value);
}

function learningRequirement(value) {
  exactKeys(
    value,
    ['lessonId', 'lessonRevision', 'fixtureRevision', 'lessonIdentity', 'missionId'],
    'reward learning requirement',
  );
  required(
    stableId(value.lessonId) &&
      stableId(value.missionId) &&
      text(value.lessonRevision, 128) &&
      text(value.fixtureRevision, 128) &&
      identity(value.lessonIdentity),
    'Invalid exact learning requirement.',
  );
}

function masteryRequirement(value) {
  exactKeys(value, ['id', 'revision', 'missionId'], 'reward mastery requirement');
  required(
    stableId(value.id) && stableId(value.missionId) && text(value.revision, 128),
    'Invalid exact mastery requirement.',
  );
}

function practiceRequirement(value) {
  exactKeys(
    value,
    ['model', 'course', 'courseIdentity', 'modes', 'responseIdentities'],
    'reward practice requirement',
  );
  required(
    text(value.model, 128) && stableId(value.course) && identity(value.courseIdentity),
    'Invalid exact practice requirement.',
  );
  ids(value.modes, 16, 'practice modes');
  required(value.modes.length > 0, 'Practice requires at least one explicit mode.');
  if (value.responseIdentities !== null) {
    array(value.responseIdentities, 32, 'practice response identities', 1);
    required(
      value.responseIdentities.every(identity) && unique(value.responseIdentities),
      'Invalid exact practice response identities.',
    );
  }
}

function acceptedPractice(value) {
  exactKeys(
    value,
    ['model', 'course', 'courseIdentity', 'mode', 'responseIdentity', 'attemptId'],
    'accepted practice evidence',
  );
  required(
    text(value.model, 128) &&
      stableId(value.course) &&
      identity(value.courseIdentity) &&
      stableId(value.mode) &&
      identity(value.responseIdentity) &&
      stableId(value.attemptId),
    'Invalid accepted practice evidence.',
  );
}

/** Validates a verifier's typed projection, not an attempt or a claimed completion.
 * The supplying simulator must replay a normal practice attempt and validate its
 * response profile. A null authored response policy explicitly accepts any such
 * verifier-valid response; it never bypasses the simulator's response validator. */
export function validateAcceptedPracticeEvidence(input) {
  const value = boundedJSON(input, { maxBytes: 2048, maxNodes: 16, maxArray: 8 });
  acceptedPractice(value);
  return freeze(value);
}

const practiceMatches = (wanted, actual) =>
  wanted.model === actual.model &&
  wanted.course === actual.course &&
  wanted.courseIdentity === actual.courseIdentity &&
  wanted.modes.includes(actual.mode) &&
  (wanted.responseIdentities === null ||
    wanted.responseIdentities.includes(actual.responseIdentity));
const isV2 = (definition) => definition.format === COMPLETION_REWARD_V2_FORMAT;
// Select a container version for an internal fragment. This does not validate
// its definitions; every import or merge still crosses validateRewardState.
export const rewardStateFormatFor = (promises) =>
  promises.some(isV2) ? REWARD_STATE_V2_FORMAT : REWARD_STATE_FORMAT;

/** Data-only authoring sidecar. Compilation separately verifies selected campaign/media ownership. */
export function validateCompletionReward(input) {
  if (ownedDefinitions.has(input)) return input;
  const value = boundedJSON(input, { maxBytes: 65536, maxNodes: 8192, maxArray: 256 });
  exactKeys(
    value,
    [
      'format',
      'id',
      'revision',
      'brandId',
      'campaignId',
      'scope',
      'locales',
      'requirements',
      'payloads',
      'teaserImage',
      'audioGroups',
    ],
    'completion reward',
  );
  required(
    [COMPLETION_REWARD_FORMAT, COMPLETION_REWARD_V2_FORMAT].includes(value.format),
    'Unsupported completion reward format.',
  );
  for (const field of ['id', 'brandId', 'campaignId'])
    required(stableId(value[field]), `Invalid reward ${field}.`);
  required(text(value.revision, 128), 'Missing reward revision.');
  exactKeys(value.scope, ['kind', 'id'], 'reward scope');
  required(
    [...['mission', 'campaign', 'edition'], ...(isV2(value) ? ['practice'] : [])].includes(
      value.scope.kind,
    ) && stableId(value.scope.id),
    'Invalid reward scope.',
  );
  if (value.scope.kind === 'campaign')
    required(value.scope.id === value.campaignId, 'Reward campaign scope must match its owner.');
  locales(value.locales, ['title', 'teaser']);
  exactKeys(
    value.requirements,
    ['missions', 'learning', 'mastery', ...(isV2(value) ? ['practice'] : [])],
    'reward requirements',
  );
  array(value.requirements.missions, 128, 'mission requirements', isV2(value) ? 0 : 1);
  if (isV2(value)) {
    array(value.requirements.practice, 128, 'practice requirements', 1);
    value.requirements.practice.forEach(practiceRequirement);
    required(
      unique(value.requirements.practice.map((item) => item.course)),
      'Duplicate required practice course.',
    );
    if (value.scope.kind === 'practice')
      required(
        value.requirements.missions.length === 0 &&
          value.requirements.practice.length === 1 &&
          value.requirements.practice[0].course === value.scope.id,
        'A practice reward requires its own course only.',
      );
  }
  for (const mission of value.requirements.missions) {
    exactKeys(mission, ['missionId', 'bindings'], 'reward mission requirement');
    required(stableId(mission.missionId), 'Invalid required mission ID.');
    array(mission.bindings, 16, 'gameplay bindings', 1);
    for (const binding of mission.bindings) {
      exactKeys(binding, ['gameplayId', 'difficulty'], 'reward gameplay binding');
      required(
        text(binding.gameplayId, 128) && stableId(binding.difficulty),
        'Invalid reward gameplay binding.',
      );
    }
    required(
      unique(mission.bindings.map((binding) => `${binding.gameplayId}:${binding.difficulty}`)),
      'Duplicate gameplay binding.',
    );
  }
  const missionIds = value.requirements.missions.map((mission) => mission.missionId);
  required(unique(missionIds), 'Duplicate required mission.');
  if (value.scope.kind === 'mission')
    required(
      missionIds.length === 1 && missionIds[0] === value.scope.id,
      'A mission reward requires its own mission only.',
    );
  array(value.requirements.learning, 128, 'learning requirements');
  value.requirements.learning.forEach(learningRequirement);
  required(
    unique(value.requirements.learning.map((item) => item.lessonId)),
    'Duplicate learning requirement.',
  );
  array(value.requirements.mastery, 128, 'mastery requirements');
  value.requirements.mastery.forEach(masteryRequirement);
  required(
    unique(value.requirements.mastery.map((item) => `${item.missionId}:${item.id}`)),
    'Duplicate mastery requirement.',
  );
  for (const item of [...value.requirements.learning, ...value.requirements.mastery])
    required(
      missionIds.includes(item.missionId),
      'Learning/mastery requirements must reference a declared required mission.',
    );
  array(value.payloads, 16, 'reward payloads', 1);
  value.payloads.forEach(payload);
  required(unique(value.payloads.map((item) => item.id)), 'Duplicate reward payload.');
  if (value.audioGroups !== undefined) validateRewardAudioGroups(value.audioGroups, value.payloads);
  if (value.teaserImage !== undefined) {
    validateRewardTeaserImage(value.teaserImage);
    const teaser = value.teaserImage.asset;
    required(
      value.payloads
        .flatMap(payloadAssetReferences)
        .every(
          (reference) => reference.assetId !== teaser.assetId && reference.sha256 !== teaser.sha256,
        ),
      'Reward teaser artwork must be separate from earned payload media.',
    );
  }
  return remember(ownedDefinitions, value);
}

export function validateCompletionRewards(input) {
  if (ownedDefinitionLists.has(input)) return input;
  const value = boundedJSON(input, definitionListLimits);
  array(value, 512, 'completion rewards');
  const definitions = value.map(validateCompletionReward);
  required(unique(definitions.map((item) => item.id)), 'Duplicate completion reward ID.');
  return remember(ownedDefinitionLists, definitions);
}

export function completionRewardIdentity(input) {
  const definition = validateCompletionReward(input);
  if (!definitionIdentities.has(definition))
    definitionIdentities.set(definition, dataIdentity(definition));
  return definitionIdentities.get(definition);
}

export function completionRewardAssetReferences(input) {
  const references = new Map();
  for (const definition of validateCompletionRewards(input)) {
    for (const reference of [
      ...(definition.teaserImage ? [definition.teaserImage.asset] : []),
      ...definition.payloads.flatMap(payloadAssetReferences),
    ]) {
      required(
        !references.has(reference.assetId) ||
          references.get(reference.assetId).sha256 === reference.sha256,
        'A reward asset ID has conflicting revisions.',
      );
      references.set(reference.assetId, reference);
    }
  }
  return freeze([...references.values()]);
}

function acceptedClear(clear) {
  exactKeys(clear, ['runId', 'gameplayId', 'difficulty'], 'accepted reward clear');
  required(
    text(clear.runId, 256) && text(clear.gameplayId, 128) && stableId(clear.difficulty),
    'Invalid accepted reward clear.',
  );
}

const clearIdentity = (clear) => JSON.stringify([clear.runId, clear.gameplayId, clear.difficulty]);

function evidence(input) {
  if (ownedEvidence.has(input)) return input;
  const value = boundedJSON(input, { maxBytes: 2 * 1024 * 1024, maxNodes: 100000, maxArray: 4096 });
  exactKeys(
    value,
    [
      'editionId',
      'brandId',
      'campaignIds',
      'clears',
      'clearAlternatives',
      'learning',
      'mastery',
      'practice',
    ],
    'reward evidence',
  );
  required(
    stableId(value.editionId) && stableId(value.brandId),
    'Invalid reward evidence edition/brand.',
  );
  ids(value.campaignIds, 512, 'reward evidence campaigns');
  exactKeys(value.clears, Object.keys(value.clears ?? {}), 'accepted reward clears');
  required(Object.keys(value.clears).length <= 4096, 'Too many accepted reward clears.');
  for (const [missionId, clear] of Object.entries(value.clears)) {
    required(stableId(missionId), 'Invalid accepted clear mission ID.');
    acceptedClear(clear);
  }
  if (value.clearAlternatives !== undefined) {
    exactKeys(value.clearAlternatives, Object.keys(value.clears), 'accepted clear alternatives');
    let count = 0;
    for (const [missionId, alternatives] of Object.entries(value.clearAlternatives)) {
      array(alternatives, 128, 'accepted clear alternatives', 1);
      alternatives.forEach(acceptedClear);
      required(
        unique([value.clears[missionId], ...alternatives].map(clearIdentity)),
        'Duplicate accepted clear alternative.',
      );
      count += alternatives.length;
    }
    required(count <= 4096, 'Too many accepted clear alternatives.');
  }
  value.learning ??= [];
  array(value.learning, 4096, 'accepted learning evidence');
  for (const item of value.learning) {
    exactKeys(
      item,
      ['lessonId', 'lessonRevision', 'fixtureRevision', 'lessonIdentity', 'missionId', 'attemptId'],
      'accepted learning evidence',
    );
    const { attemptId, ...reference } = item;
    learningRequirement(reference);
    required(stableId(attemptId), 'Invalid accepted learning attempt ID.');
  }
  value.mastery ??= [];
  array(value.mastery, 4096, 'accepted mastery evidence');
  for (const item of value.mastery) {
    exactKeys(item, ['id', 'revision', 'missionId', 'runId'], 'accepted mastery evidence');
    const { runId, ...reference } = item;
    masteryRequirement(reference);
    required(text(runId, 256), 'Invalid accepted mastery run ID.');
  }
  if (value.practice !== undefined) {
    array(value.practice, 4096, 'accepted practice evidence');
    value.practice.forEach(acceptedPractice);
    required(
      unique(value.practice.map((item) => item.attemptId)),
      'Duplicate accepted practice attempt.',
    );
  }
  return remember(ownedEvidence, value);
}

const sameFields = (wanted, actual) =>
  Object.entries(wanted).every(([key, value]) => actual[key] === value);

// One normalized clear must explain each mission in a saved receipt. Prefer a
// compatible run satisfying all its mastery requirements, never combine mastery
// evidence from different runs to manufacture a qualifying receipt.
function qualifyingClears(definition, accepted) {
  return Object.fromEntries(
    definition.requirements.missions.map((mission) => {
      const candidates = [
        accepted.clears[mission.missionId],
        ...(accepted.clearAlternatives?.[mission.missionId] ?? []),
      ].filter((clear) => clear && mission.bindings.some((binding) => sameFields(binding, clear)));
      const mastery = definition.requirements.mastery.filter(
        (item) => item.missionId === mission.missionId,
      );
      const clear =
        candidates.find((candidate) =>
          mastery.every((item) =>
            accepted.mastery.some(
              (record) => sameFields(item, record) && record.runId === candidate.runId,
            ),
          ),
        ) ?? candidates[0];
      return [mission.missionId, clear];
    }),
  );
}

/** The caller supplies only accepted clears and verified learning/mastery outcomes, never raw attempts. */
export function projectRewardProgress(input, context) {
  const definition = validateCompletionReward(input);
  const accepted = evidence(context);
  const available =
    accepted.brandId === definition.brandId &&
    accepted.campaignIds.includes(definition.campaignId) &&
    (definition.scope.kind !== 'edition' || definition.scope.id === accepted.editionId);
  const selected = qualifyingClears(definition, accepted);
  const missions = definition.requirements.missions.map((mission) => {
    return {
      missionId: mission.missionId,
      complete: available && !!selected[mission.missionId],
    };
  });
  const learning = definition.requirements.learning.map((item) => ({
    lessonId: item.lessonId,
    complete: available && accepted.learning.some((record) => sameFields(item, record)),
  }));
  const mastery = definition.requirements.mastery.map((item) => ({
    id: item.id,
    missionId: item.missionId,
    complete:
      available &&
      accepted.mastery.some(
        (record) => sameFields(item, record) && selected[item.missionId]?.runId === record.runId,
      ),
  }));
  const practice = (definition.requirements.practice ?? []).map((item) => ({
    course: item.course,
    complete:
      available && (accepted.practice ?? []).some((record) => practiceMatches(item, record)),
  }));
  const all = [...missions, ...learning, ...mastery, ...practice];
  return freeze({
    rewardId: definition.id,
    definitionIdentity: completionRewardIdentity(definition),
    available,
    eligible: available && all.every((item) => item.complete),
    completed: all.filter((item) => item.complete).length,
    total: all.length,
    missions,
    learning,
    mastery,
    missingMissionIds: missions.filter((item) => !item.complete).map((item) => item.missionId),
    ...(isV2(definition)
      ? {
          practice,
          missingCourseIds: practice.filter((item) => !item.complete).map((item) => item.course),
        }
      : {}),
  });
}

function retainedEvidence(definition, context) {
  const accepted = evidence(context);
  const selected = qualifyingClears(definition, accepted);
  return {
    editionId: accepted.editionId,
    brandId: accepted.brandId,
    campaignIds: [definition.campaignId],
    clears: Object.fromEntries(
      definition.requirements.missions.map(({ missionId }) => [missionId, selected[missionId]]),
    ),
    learning: definition.requirements.learning.map((item) =>
      accepted.learning.find((record) => sameFields(item, record)),
    ),
    mastery: definition.requirements.mastery.map((item) =>
      accepted.mastery.find(
        (record) => sameFields(item, record) && selected[item.missionId]?.runId === record.runId,
      ),
    ),
    ...(isV2(definition)
      ? {
          practice: definition.requirements.practice.map((item) =>
            accepted.practice.find((record) => practiceMatches(item, record)),
          ),
        }
      : {}),
  };
}

export function validateEarnedRewardReceipt(input, { editionId } = {}) {
  if (ownedReceipts.has(input)) {
    required(
      editionId === undefined || input.editionId === editionId,
      'Reward receipt belongs to another edition.',
    );
    return input;
  }
  const value = boundedJSON(input, receiptLimits);
  exactKeys(
    value,
    ['format', 'editionId', 'definition', 'definitionIdentity', 'evidence'],
    'earned reward receipt',
  );
  required(
    [EARNED_REWARD_FORMAT, EARNED_REWARD_V2_FORMAT].includes(value.format) &&
      stableId(value.editionId),
    'Invalid earned reward format/edition.',
  );
  required(
    editionId === undefined || value.editionId === editionId,
    'Reward receipt belongs to another edition.',
  );
  value.definition = validateCompletionReward(value.definition);
  required(
    value.format === (isV2(value.definition) ? EARNED_REWARD_V2_FORMAT : EARNED_REWARD_FORMAT),
    'Earned reward format must match its definition version.',
  );
  required(
    value.definitionIdentity === completionRewardIdentity(value.definition),
    'Earned reward definition identity does not match.',
  );
  value.evidence = evidence(value.evidence);
  required(
    isV2(value.definition)
      ? Array.isArray(value.evidence.practice)
      : value.evidence.practice === undefined,
    'Earned reward practice evidence must match its definition version.',
  );
  if (isV2(value.definition)) {
    required(
      value.evidence.practice.length === value.definition.requirements.practice.length &&
        value.definition.requirements.practice.every(
          (item) =>
            value.evidence.practice.filter((record) => practiceMatches(item, record)).length === 1,
        ),
      'Earned practice receipts require one normalized accepted attempt per course.',
    );
  }
  required(
    value.evidence.clearAlternatives === undefined,
    'Earned reward receipts require one normalized clear per mission.',
  );
  required(
    value.evidence.editionId === value.editionId &&
      projectRewardProgress(value.definition, value.evidence).eligible,
    'Earned reward evidence does not satisfy its requirements.',
  );
  return remember(ownedReceipts, value);
}

export function createRewardState(editionId) {
  required(stableId(editionId), 'Invalid reward state edition.');
  return remember(ownedStates, {
    format: REWARD_STATE_FORMAT,
    editionId,
    promises: [],
    receipts: [],
    acknowledged: [],
  });
}

export function validateRewardState(input, { editionId } = {}) {
  if (ownedStates.has(input)) {
    required(
      editionId === undefined || input.editionId === editionId,
      'Reward state belongs to another edition.',
    );
    return input;
  }
  const value = boundedJSON(input, stateLimits);
  exactKeys(value, ['format', 'editionId', 'promises', 'receipts', 'acknowledged'], 'reward state');
  required(
    [REWARD_STATE_FORMAT, REWARD_STATE_V2_FORMAT].includes(value.format) &&
      stableId(value.editionId),
    'Invalid reward state format/edition.',
  );
  required(
    editionId === undefined || value.editionId === editionId,
    'Reward state belongs to another edition.',
  );
  value.promises = validateCompletionRewards(value.promises);
  required(
    value.format === rewardStateFormatFor(value.promises),
    'Reward state format must match its retained definition versions.',
  );
  for (const promise of value.promises)
    required(
      promise.scope.kind !== 'edition' || promise.scope.id === value.editionId,
      'Reward promise belongs to another edition.',
    );
  array(value.receipts, 512, 'earned reward receipts');
  value.receipts = value.receipts.map((receipt) =>
    validateEarnedRewardReceipt(receipt, { editionId: value.editionId }),
  );
  required(
    unique(value.receipts.map((receipt) => receipt.definition.id)),
    'Duplicate earned reward receipt.',
  );
  const promises = new Map(value.promises.map((item) => [item.id, item]));
  for (const receipt of value.receipts)
    required(
      promises.has(receipt.definition.id) &&
        completionRewardIdentity(promises.get(receipt.definition.id)) ===
          receipt.definitionIdentity,
      'Earned reward must match its retained promise.',
    );
  ids(value.acknowledged, 512, 'acknowledged rewards');
  required(
    value.acknowledged.every((id) =>
      value.receipts.some((receipt) => receipt.definition.id === id),
    ),
    'Cannot acknowledge an unearned reward.',
  );
  return remember(ownedStates, value);
}

// These private compositions preserve validated subtree ownership. Aggregate
// parser limits still apply, including the separate promise-list budget.
function composeState(editionId, promises, receipts, acknowledged) {
  required(
    promises.every((item) => ownedDefinitions.has(item)),
    'Unvalidated reward promise.',
  );
  required(
    receipts.every((item) => ownedReceipts.has(item)),
    'Unvalidated reward receipt.',
  );
  if (!ownedDefinitionLists.has(promises)) boundedJSON(promises, definitionListLimits);
  const candidate = {
    format: rewardStateFormatFor(promises),
    editionId,
    promises,
    receipts,
    acknowledged,
  };
  boundedJSON(candidate, stateLimits);
  // All callers preserve validated edition, unique IDs, receipt/promise identity
  // and acknowledgement membership; no external graph reaches this constructor.
  remember(ownedDefinitionLists, promises);
  return remember(ownedStates, candidate);
}

function composeReceipt(definition, accepted) {
  const candidate = {
    format: isV2(definition) ? EARNED_REWARD_V2_FORMAT : EARNED_REWARD_FORMAT,
    editionId: accepted.editionId,
    definition,
    definitionIdentity: completionRewardIdentity(definition),
    evidence: evidence(retainedEvidence(definition, accepted)),
  };
  boundedJSON(candidate, receiptLimits);
  // Called only after projectRewardProgress accepted this exact evidence.
  return remember(ownedReceipts, candidate);
}

/** Call with a campaign's definitions when its promise is first shown/started; older promises win. */
export function reconcileEarnedRewards(
  inputs,
  context,
  state = createRewardState(context.editionId),
) {
  const definitions = validateCompletionRewards(inputs);
  const accepted = evidence(context);
  const previous = validateRewardState(state, { editionId: accepted.editionId });
  const promises = new Map(previous.promises.map((item) => [item.id, item]));
  for (const definition of definitions) {
    if (!promises.has(definition.id) && projectRewardProgress(definition, accepted).available)
      promises.set(definition.id, definition);
  }
  const receipts = new Map(previous.receipts.map((item) => [item.definition.id, item]));
  const granted = [];
  const progress = [];
  for (const definition of promises.values()) {
    const current = projectRewardProgress(definition, accepted);
    progress.push(current);
    if (!current.eligible || receipts.has(definition.id)) continue;
    const receipt = composeReceipt(definition, accepted);
    receipts.set(definition.id, receipt);
    granted.push(receipt);
  }
  return freeze({
    state:
      promises.size === previous.promises.length && !granted.length
        ? previous
        : composeState(
            accepted.editionId,
            promises.size === previous.promises.length ? previous.promises : [...promises.values()],
            [...receipts.values()],
            previous.acknowledged,
          ),
    granted,
    progress,
  });
}

export function acknowledgeReward(input, rewardId) {
  const state = validateRewardState(input);
  required(
    state.receipts.some((receipt) => receipt.definition.id === rewardId),
    'Cannot acknowledge an unearned reward.',
  );
  if (state.acknowledged.includes(rewardId)) return state;
  return composeState(state.editionId, state.promises, state.receipts, [
    ...state.acknowledged,
    rewardId,
  ]);
}

/** An explicit backup import must not silently discard a different promise or
 * earned payload. Keep this distinct from current-first background merging. */
export class RewardImportConflictError extends Error {
  constructor(rewardIds) {
    super('The backup contains different discovery revisions. No discoveries were imported.');
    this.name = 'RewardImportConflictError';
    this.code = 'REWARD_IMPORT_CONFLICT';
    this.rewardIds = Object.freeze([...rewardIds]);
  }
}

export function mergeImportedRewardStates(currentInput, incomingInput, { editionId } = {}) {
  const current = validateRewardState(currentInput, { editionId });
  const incoming = validateRewardState(incomingInput, {
    editionId: current.editionId,
  });
  const promises = new Map(current.promises.map((definition) => [definition.id, definition]));
  const conflicts = incoming.promises
    .filter((definition) => {
      const existing = promises.get(definition.id);
      return (
        existing && completionRewardIdentity(existing) !== completionRewardIdentity(definition)
      );
    })
    .map((definition) => definition.id);
  if (conflicts.length) throw new RewardImportConflictError(conflicts);
  return mergeRewardStates(current, incoming, { editionId: current.editionId });
}

/** Atomic store transactions supply their current value first; existing promises and pins win. */
export function mergeRewardStates(currentInput, incomingInput, { editionId } = {}) {
  const current = validateRewardState(currentInput, { editionId });
  const incoming = validateRewardState(incomingInput, { editionId: current.editionId });
  const promises = new Map(current.promises.map((definition) => [definition.id, definition]));
  for (const definition of incoming.promises)
    if (!promises.has(definition.id)) promises.set(definition.id, definition);
  const receipts = new Map(current.receipts.map((receipt) => [receipt.definition.id, receipt]));
  for (const receipt of incoming.receipts) {
    if (
      !receipts.has(receipt.definition.id) &&
      completionRewardIdentity(promises.get(receipt.definition.id)) === receipt.definitionIdentity
    )
      receipts.set(receipt.definition.id, receipt);
  }
  const acknowledged = [...new Set([...current.acknowledged, ...incoming.acknowledged])].filter(
    (id) => receipts.has(id),
  );
  if (
    promises.size === current.promises.length &&
    receipts.size === current.receipts.length &&
    acknowledged.length === current.acknowledged.length
  )
    return current;
  return composeState(
    current.editionId,
    promises.size === current.promises.length ? current.promises : [...promises.values()],
    [...receipts.values()],
    acknowledged,
  );
}
