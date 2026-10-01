import {
  boundedJSON,
  dataIdentity,
  exactKeys,
  plainObject,
  required,
  stableId,
} from './data-json.mjs';
import { CLASSES, validateClassRecipes } from './core/registry.mjs';
import { normalizedLevel } from './core/level.mjs';
import { versionsForCampaign } from './core/versions.mjs';

export const DEFAULT_CAMPAIGN_DIFFICULTY = 'standard';
export const CAMPAIGN_DIFFICULTIES = Object.freeze(['standard', 'gentle']);
export const GENTLE_POLICY_VERSION = 'gentle.v1';
export const CLASSIC_GENTLE_POLICY_VERSION = 'gentle-classic.v1';
export const CAMPAIGN_DIFFICULTY_LIMITS = Object.freeze({
  maxBytes: 16 * 1024 * 1024,
  maxNodes: 400000,
  maxDepth: 24,
  maxArray: 4096,
  maxString: 65536,
  levels: 128,
});

// Exact keys belong only to campaigns this module validated, copied and froze.
// Caller-frozen campaigns never enter this registry.
const ownedCampaignKeys = new WeakMap();
export const ownedDifficultyCampaignKey = (campaign) => ownedCampaignKeys.get(campaign);

const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const text = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function resolveCampaignDifficulty(value) {
  required(CAMPAIGN_DIFFICULTIES.includes(value), 'Unsupported campaign difficulty.');
  return value;
}

function ownCampaign(source) {
  required(plainObject(source), 'Difficulty needs an installed campaign.');
  const campaign = boundedJSON(source, CAMPAIGN_DIFFICULTY_LIMITS);
  exactKeys(
    campaign,
    [
      'version',
      'id',
      'revision',
      'title',
      'name',
      'levels',
      'classRecipes',
      'classIds',
      'themeId',
      'musicId',
      'briefs',
    ],
    'difficulty campaign',
  );
  required(
    campaign.version === 'xonix-campaign.v1' &&
      stableId(campaign.id) &&
      text(campaign.revision, 60),
    'Invalid difficulty campaign identity.',
  );
  for (const key of ['title', 'name'])
    required(campaign[key] === undefined || text(campaign[key], 160), `Invalid campaign ${key}.`);
  for (const key of ['themeId', 'musicId'])
    required(campaign[key] === undefined || stableId(campaign[key]), `Invalid campaign ${key}.`);
  required(
    Array.isArray(campaign.levels) &&
      campaign.levels.length >= 1 &&
      campaign.levels.length <= CAMPAIGN_DIFFICULTY_LIMITS.levels,
    'Difficulty needs 1..128 maps.',
  );
  required(
    campaign.briefs === undefined ||
      (Array.isArray(campaign.briefs) &&
        campaign.briefs.length <= campaign.levels.length &&
        campaign.briefs.every((brief) => text(brief, 4096))),
    'Invalid campaign briefs.',
  );
  const recipes = campaign.classRecipes ?? CLASSES;
  const checked = validateClassRecipes(recipes);
  required(checked.valid, `Invalid difficulty equipment: ${checked.errors.join('; ')}`);
  required(
    recipes.every(
      (recipe) =>
        stableId(recipe.id) &&
        text(recipe.revision, 80) &&
        text(recipe.label, 80) &&
        text(recipe.description, 600),
    ),
    'Invalid difficulty recipe labels.',
  );
  // The host supplies the actual filtered roster. Never silently repartition an
  // installed campaign whose library identity includes a different recipe list.
  if (campaign.classIds !== undefined) {
    required(
      Array.isArray(campaign.classIds) &&
        campaign.classIds.length === recipes.length &&
        new Set(campaign.classIds).size === recipes.length &&
        campaign.classIds.every((id) => stableId(id) && recipes.some((recipe) => recipe.id === id)),
      'Difficulty needs the installed filtered roster.',
    );
  }
  const ids = new Set();
  for (const level of campaign.levels) {
    required(
      plainObject(level) &&
        stableId(level.id) &&
        !ids.has(level.id) &&
        text(level.revision, 80) &&
        (level.name === undefined || text(level.name, 280)),
      'Invalid or duplicate difficulty map identity.',
    );
    ids.add(level.id);
    normalizedLevel(level);
  }
  versionsForCampaign(campaign);
  return campaign;
}

// Deliberately independent of library.mjs: its preference validator can import
// the enum without a cycle. Exact equivalence to library.campaignKey is tested.
function keyFor(campaign) {
  return `${campaign.id}/${encodeURIComponent(campaign.revision)}/${dataIdentity({
    ruleset: versionsForCampaign(campaign).ruleset,
    levels: campaign.levels.map(normalizedLevel),
    classRecipes: campaign.classRecipes ?? CLASSES,
  })}`;
}

function gentleLevel(source, token, classic = false) {
  const level = normalizedLevel(source);
  level.revision = `${classic ? 'gentle-classic-v1' : 'gentle-v1'}-${dataIdentity({ token, levelId: source.id, sourceRevision: source.revision })}`;
  level.rules.lives = Math.max(level.rules.lives, 5);
  for (const key of ['timeLimitSeconds', 'cutTimeLimitSeconds', 'maxTrailCells'])
    level.rules[key] = 0;
  for (const enemy of level.enemies) {
    if (enemy.type === 'bouncer' || (classic && ['claimed-rover', 'eroder'].includes(enemy.type))) {
      enemy.vx *= 0.6;
      enemy.vy *= 0.6;
    } else if (enemy.type === 'border-patrol' || (classic && enemy.type === 'contour-patrol'))
      enemy.speed = (enemy.speed ?? 4) * 0.6;
    else if (enemy.type === 'lane-boss') {
      const warning = enemy.warningSeconds ?? 1.5,
        active = enemy.activeSeconds ?? 0.7,
        period = enemy.period ?? 6;
      enemy.warningSeconds = Math.min(10, warning * 2);
      enemy.period =
        enemy.warningSeconds +
        active +
        Math.min(60 - enemy.warningSeconds - active, 2 * (period - warning - active));
    }
  }
  if (level.encounter) {
    for (const [stage, keys] of [
      ['shielded', ['warningTicks', 'restTicks']],
      ['exposed', ['warningTicks', 'openTicks']],
    ])
      for (const key of keys)
        level.encounter[stage][key] = Math.min(7200, level.encounter[stage][key] * 2);
  }
  return normalizedLevel(level);
}

function contextFor(base, mode, baseCampaignKey) {
  const campaign = structuredClone(base);
  const classic = versionsForCampaign(base).ruleset === 'xonix-core.v5';
  const policyVersion = classic ? CLASSIC_GENTLE_POLICY_VERSION : GENTLE_POLICY_VERSION;
  if (mode === 'gentle') {
    const token = dataIdentity({ policyVersion, baseCampaignKey });
    campaign.id = `${classic ? 'gentle-classic-v1' : 'gentle-v1'}-${token}`;
    campaign.revision = '1';
    campaign.levels = base.levels.map((level) => gentleLevel(level, token, classic));
  }
  const context = freeze({
    mode,
    policyVersion: mode === 'gentle' ? policyVersion : null,
    baseCampaignKey,
    campaign,
    campaignKey: mode === 'standard' ? baseCampaignKey : keyFor(campaign),
  });
  ownedCampaignKeys.set(context.campaign, context.campaignKey);
  return context;
}

/** Pure setup projection; neither context nor a local identity grants an award. */
export function createDifficultyContext(source, mode = DEFAULT_CAMPAIGN_DIFFICULTY) {
  resolveCampaignDifficulty(mode);
  const base = ownCampaign(source);
  return contextFor(base, mode, keyFor(base));
}

/** Resolve only exact contexts derivable from this installed original campaign. */
export function findDifficultyContext(source, executionKey) {
  required(text(executionKey, 300), 'Invalid execution campaign key.');
  const base = ownCampaign(source),
    baseKey = keyFor(base);
  if (executionKey === baseKey) return contextFor(base, 'standard', baseKey);
  const gentle = contextFor(base, 'gentle', baseKey);
  return gentle.campaignKey === executionKey ? gentle : null;
}
