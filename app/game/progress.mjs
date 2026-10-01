import {
  CLASSES,
  DEFAULT_RULES,
  TURN_POLICIES,
  validateClassRecipes,
  loadoutHash,
  rosterHash,
} from './core/registry.mjs';
import { versionsForCampaign, isClassicRuleset } from './core/versions.mjs';
import { EPS } from './core/geometry.mjs';
import { dataIdentity, stableId } from './data-json.mjs';

export const PROGRESS_VERSION = 'revealline-progress.v1';
const record = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const runIdValid = (value) => typeof value === 'string' && value.length > 0 && value.length < 160;
const uint32 = (value) => Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
const statsValid = (value) =>
  record(value) &&
  Number.isFinite(value.score) &&
  value.score >= 0 &&
  Number.isFinite(value.time) &&
  value.time >= 0 &&
  Number.isInteger(value.medals) &&
  value.medals >= 1 &&
  value.medals <= 3 &&
  typeof value.clean === 'boolean';
function variantKeyValid(key, classIds) {
  const parts = key.split('/');
  let revision;
  try {
    revision = decodeURIComponent(parts[2] ?? '');
  } catch {
    return false;
  }
  return (
    (parts.length === 5 ||
      (parts.length === 7 &&
        /^roster-v1-[0-9a-f]{8}$/.test(parts[5]) &&
        /^route-v1-[0-9a-f]{16}$/.test(parts[6]))) &&
    TURN_POLICIES.includes(parts[0]) &&
    classIds.has(parts[1]) &&
    revision.length > 0 &&
    encodeURIComponent(revision) === parts[2] &&
    /^loadout-v1-[0-9a-f]{8}$/.test(parts[3]) &&
    /^(0|[1-9]\d*)$/.test(parts[4]) &&
    uint32(Number(parts[4]))
  );
}
const best = (old, current) => ({
  score: Math.max(old?.score ?? 0, current.score),
  time: Math.min(old?.time ?? Infinity, current.time),
  medals: Math.max(old?.medals ?? 0, current.medals),
  clean: !!old?.clean || current.clean,
});

export function emptyProgress(campaign) {
  return {
    version: PROGRESS_VERSION,
    campaignId: campaign.id,
    revision: campaign.revision,
    clears: {},
    seen: [],
  };
}
export function validateProgress(value, campaign) {
  try {
    versionsForCampaign(campaign);
  } catch {
    return false;
  }
  if (
    !record(value) ||
    value.version !== PROGRESS_VERSION ||
    value.campaignId !== campaign.id ||
    value.revision !== campaign.revision ||
    !record(value.clears) ||
    !Array.isArray(value.seen) ||
    value.seen.length > 256
  )
    return false;
  const recipes = campaign.classRecipes ?? CLASSES;
  if (!validateClassRecipes(recipes).valid) return false;
  const classIds = new Set(recipes.map((c) => c.id));
  const ids = new Set(campaign.levels.map((l) => l.id));
  return (
    value.seen.every(runIdValid) &&
    new Set(value.seen).size === value.seen.length &&
    Object.entries(value.clears).every(
      ([id, r]) =>
        ids.has(id) &&
        statsValid(r) &&
        record(r.variants) &&
        Object.keys(r.variants).length > 0 &&
        Object.entries(r.variants).every(
          ([key, v]) => variantKeyValid(key, classIds) && statsValid(v),
        ),
    )
  );
}
/** Legacy five-part variants remain readable; new awards partition the full roster and route. */
export function completionVariantKey(result) {
  const route = result.classHistory.map(({ classId, classRevision, loadoutHash }) => ({
    classId,
    classRevision,
    loadoutHash,
  }));
  return `${result.turnPolicy}/${result.classId}/${encodeURIComponent(result.classRevision)}/${result.loadoutHash}/${result.seed}/${result.rosterHash}/route-v1-${dataIdentity(route)}`;
}
function historyValid(result, recipes) {
  if (
    result.rosterHash !== rosterHash(recipes) ||
    !Array.isArray(result.classHistory) ||
    result.classHistory.length < 1 ||
    result.classHistory.length > 4096 ||
    result.switches !== result.classHistory.length - 1
  )
    return false;
  let previousTick = -1,
    previousClass = null;
  for (const [index, entry] of result.classHistory.entries()) {
    if (!record(entry)) return false;
    const recipe = recipes.find((c) => c.id === entry.classId);
    if (
      !recipe ||
      entry.classRevision !== recipe.revision ||
      entry.loadoutHash !== loadoutHash(recipe) ||
      !Number.isInteger(entry.tick) ||
      entry.tick < 0 ||
      entry.tick <= previousTick ||
      entry.tick > result.tick ||
      (index === 0 && (entry.tick !== 0 || entry.classId !== result.classId)) ||
      entry.classId === previousClass
    )
      return false;
    previousTick = entry.tick;
    previousClass = entry.classId;
  }
  return (
    Number.isInteger(result.tick) && result.tick >= 0 && result.activeClassId === previousClass
  );
}
/** Accept only the shell's matching core completion. Local data is not an authenticated achievement service. */
export function awardCompletion(progress, campaign, result, { runId, practice = false } = {}) {
  if (!validateProgress(progress, campaign)) throw new Error('Progress format is invalid.');
  if (
    practice ||
    !record(result) ||
    result.practice === true ||
    result.status !== 'won' ||
    result.won !== true ||
    !runIdValid(runId) ||
    progress.seen.includes(runId)
  )
    return progress;
  const level = campaign.levels.find((l) => l.id === result.levelId);
  const recipe = (campaign.classRecipes ?? CLASSES).find((c) => c.id === result.classId);
  if (
    !level ||
    !recipe ||
    result.ruleset !== versionsForCampaign(campaign).ruleset ||
    !historyValid(result, campaign.classRecipes ?? CLASSES) ||
    result.revision !== level.revision ||
    result.classRevision !== recipe.revision ||
    result.loadoutHash !== loadoutHash(recipe) ||
    !TURN_POLICIES.includes(result.turnPolicy) ||
    !uint32(result.seed) ||
    !Number.isFinite(result.score) ||
    result.score < 0 ||
    !Number.isFinite(result.time) ||
    result.time < 0 ||
    !Number.isFinite(result.coverage) ||
    result.coverage < level.goal.coverage - EPS ||
    result.coverage > 1
  )
    return progress;
  const rules = { ...DEFAULT_RULES, ...level.rules };
  const classic = isClassicRuleset(result.ruleset);
  if (
    !Number.isInteger(result.lives) ||
    result.lives < 1 ||
    result.lives > (classic ? 9 : rules.lives)
  )
    return progress;
  if (classic) {
    const possibleGains = level.classic.powerups.filter(
      (item) => item.kind === 'extra-life',
    ).length;
    if (
      !Number.isInteger(result.livesLost) ||
      result.livesLost < 0 ||
      result.lives + result.livesLost < rules.lives ||
      result.lives + result.livesLost > rules.lives + possibleGains
    )
      return progress;
  }
  const clean = classic ? result.livesLost === 0 : result.lives === rules.lives;
  const medal =
    result.time <= rules.timeMedals[0] + EPS && clean
      ? 'gold'
      : result.time <= rules.timeMedals[1] + EPS
        ? 'silver'
        : 'bronze';
  if (result.medal !== medal) return progress;
  const medals = medal === 'gold' ? 3 : medal === 'silver' ? 2 : 1;
  const next = structuredClone(progress),
    old = Object.hasOwn(next.clears, level.id) ? next.clears[level.id] : null;
  const key = completionVariantKey(result);
  const variant = {
    score: result.score,
    time: result.time,
    medals,
    clean,
  };
  const variants = { ...old?.variants };
  // Keep the 256 most recently used setup records while retaining aggregate bests.
  delete variants[key];
  variants[key] = best(old?.variants[key], variant);
  next.clears[level.id] = {
    ...best(old, variant),
    variants: Object.fromEntries(Object.entries(variants).slice(-256)),
  };
  next.seen = [...next.seen, runId].slice(-256);
  return next;
}
const STARTER_BODIES = Object.freeze([
  'fpv-body',
  'scout-quad',
  'heavy-lift',
  'ukrainian-bird',
  'retro-craft',
  'navi-avatar',
  'neutral-marker',
]);
const APPEARANCE_TIERS = Object.freeze([
  Object.freeze({
    id: 'first-clear',
    name: 'First clear',
    bodyIds: Object.freeze([
      'fpv-racer',
      'fixedwing-body',
      'ukrainian-falcon',
      'retro-vector',
      'navi-auditor',
    ]),
  }),
  Object.freeze({
    id: 'chapter-explorer',
    name: 'Chapter explorer',
    bodyIds: Object.freeze(['fpv-night', 'delta-interceptor']),
  }),
]);
const projectionData = (value, key) => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value'))
    throw new TypeError(`Reward projection requires an own data field: ${key}.`);
  return descriptor.value;
};

/** Read only the identity/map projection. Simulation validation remains in the core. */
function chapterRewards(progress, campaign) {
  if (!record(campaign))
    throw new TypeError('Reward campaign must be a nonempty valid projection.');
  const id = projectionData(campaign, 'id'),
    revision = projectionData(campaign, 'revision'),
    levels = projectionData(campaign, 'levels');
  if (
    projectionData(campaign, 'version') !== 'xonix-campaign.v1' ||
    !stableId(id) ||
    typeof revision !== 'string' ||
    !revision.trim() ||
    revision.length > 60 ||
    !Array.isArray(levels) ||
    levels.length < 1 ||
    levels.length > 128
  )
    throw new TypeError('Reward campaign must be a nonempty valid projection.');
  const ids = new Set();
  for (let index = 0; index < levels.length; index++) {
    const level = projectionData(levels, String(index));
    if (!record(level)) throw new TypeError('Reward map IDs must be valid.');
    const levelId = projectionData(level, 'id');
    if (!stableId(levelId)) throw new TypeError('Reward map IDs must be valid.');
    ids.add(levelId);
  }
  if (
    !record(progress) ||
    projectionData(progress, 'version') !== PROGRESS_VERSION ||
    projectionData(progress, 'campaignId') !== id ||
    projectionData(progress, 'revision') !== revision
  )
    throw new TypeError('Reward progress must match the campaign identity.');
  const clears = projectionData(progress, 'clears');
  if (!record(clears)) throw new TypeError('Reward clears must be an object.');
  const entries = [];
  for (const levelId of ids) {
    if (!Object.hasOwn(clears, levelId)) continue;
    const entry = projectionData(clears, levelId);
    if (!record(entry)) throw new TypeError('Reward clear must contain valid statistics.');
    const stats = Object.fromEntries(
      ['score', 'time', 'medals', 'clean'].map((key) => [key, projectionData(entry, key)]),
    );
    if (!statsValid(stats)) throw new TypeError('Reward clear must contain valid statistics.');
    entries.push(stats);
  }
  return { entries, count: entries.length, total: ids.size, finalTarget: Math.min(4, ids.size) };
}
function milestonesFor(count, finalTarget) {
  return APPEARANCE_TIERS.map((tier, index) => {
    const target = index === 0 ? 1 : finalTarget;
    return { ...tier, bodyIds: [...tier.bodyIds], count, target, earned: count >= target };
  });
}

/** Campaign-local derived rewards, not an award service. Count is distinct clears, not capped. */
export function appearanceMilestones(progress, campaign) {
  const { count, finalTarget } = chapterRewards(progress, campaign);
  return milestonesFor(count, finalTarget);
}

export function achievements(progress, campaign) {
  const { entries, count, total, finalTarget } = chapterRewards(progress, campaign);
  return [
    {
      id: 'first-light',
      name: 'First light',
      description: 'Complete your first mission.',
      earned: count >= 1,
    },
    {
      id: 'clear-skies',
      name: 'Clear skies',
      description: 'Complete a mission without losing a life.',
      earned: entries.some((r) => r.clean),
    },
    {
      id: 'pathfinder',
      name: 'Pathfinder',
      description: `Complete ${finalTarget} different ${finalTarget === 1 ? 'mission' : 'missions'} in this campaign.`,
      earned: count >= finalTarget,
    },
    {
      id: 'golden-line',
      name: 'Golden line',
      description: 'Earn a gold time medal.',
      earned: entries.some((r) => r.medals === 3),
    },
    {
      id: 'last-light',
      name: 'Last light',
      description: 'Complete the full campaign.',
      earned: count === total,
    },
  ];
}
/** Omitted campaign retains the legacy one/four-clear policy for existing callers. */
export function unlockedBodies(progress, campaign) {
  const milestones =
    campaign === undefined
      ? milestonesFor(Object.keys(progress.clears).length, 4)
      : appearanceMilestones(progress, campaign);
  return new Set([
    ...STARTER_BODIES,
    ...milestones.filter((tier) => tier.earned).flatMap((tier) => tier.bodyIds),
  ]);
}
/** Caller supplies a real live award transition; adoption/imports never emit events here. */
export function newAppearanceBodies(before, after, campaign) {
  // Require chapter context even though unlockedBodies also supports a legacy API.
  const previous = new Set(
    appearanceMilestones(before, campaign)
      .filter((tier) => tier.earned)
      .flatMap((tier) => tier.bodyIds),
  );
  return appearanceMilestones(after, campaign)
    .filter((tier) => tier.earned)
    .flatMap((tier) => tier.bodyIds)
    .filter((id) => !previous.has(id));
}
export function canPlay(progress, campaign, index) {
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < campaign.levels.length &&
    (index === 0 ||
      Object.hasOwn(progress.clears, campaign.levels[index].id) ||
      Object.hasOwn(progress.clears, campaign.levels[index - 1].id))
  );
}

export function loadProgress(storage, key, campaign) {
  let raw = null;
  try {
    raw = storage.getItem(key);
    if (!raw) return { progress: emptyProgress(campaign), warning: '', recovery: null };
    const parsed = JSON.parse(raw);
    if (validateProgress(parsed, campaign))
      return { progress: parsed, warning: '', recovery: null };
  } catch {}
  return {
    progress: emptyProgress(campaign),
    warning: 'Saved progress could not be read. It will be preserved before a new save.',
    recovery: raw,
  };
}
export function saveProgress(storage, key, progress, recovery = null) {
  try {
    const encoded = JSON.stringify(progress);
    if (recovery !== null) {
      const base = `${key}.recovery.${Date.now()}`;
      let backup = base,
        suffix = 0;
      while (storage.getItem(backup) !== null) {
        backup = `${base}.${++suffix}`;
      }
      storage.setItem(backup, recovery);
    }
    storage.setItem(key, encoded);
    return { ok: true, warning: '' };
  } catch {
    return {
      ok: false,
      warning: 'Progress is available for this session only; browser storage is unavailable.',
    };
  }
}
