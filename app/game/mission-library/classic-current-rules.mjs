import { boundedJSON, dataIdentity } from '../data-json.mjs';
import { campaignKey } from '../library.mjs';
import { isClassicRuleset, versionsForCampaign, versionsForLevel } from '../core/versions.mjs';

export const CLASSIC_RULES_ORIGINAL = 'original';
export const CLASSIC_RULES_CURRENT = 'current-line-impact.v1';
export const CLASSIC_CURRENT_LINE_IMPACT = Object.freeze({
  version: 'line-impact.v1',
  speed: 24,
});

const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export function supportsClassicCurrentRules(row) {
  return isClassicRuleset(row?.ruleDetails?.ruleset);
}

export function classicRulesCampaignIdentity(row) {
  if (row?.rulesEdition === CLASSIC_RULES_CURRENT)
    return `${row.campaignKey}::${CLASSIC_RULES_CURRENT}`;
  return row.campaignKey;
}

function revision(kind, source) {
  return `current-impact-${dataIdentity({ kind, source, policy: CLASSIC_RULES_CURRENT })}`;
}

export function projectClassicCurrentRulesLevel(
  level,
  rulesEdition = CLASSIC_RULES_ORIGINAL,
  sourceIdentity = '',
) {
  if (rulesEdition === CLASSIC_RULES_ORIGINAL || rulesEdition === undefined) return level;
  if (rulesEdition !== CLASSIC_RULES_CURRENT)
    throw new TypeError('Unsupported Classic rules edition.');
  if (!isClassicRuleset(versionsForLevel(level).ruleset))
    throw new TypeError('This Classic mission is not compatible with Current rules.');
  const projected = boundedJSON(level, {
    maxBytes: 4 * 1024 * 1024,
    maxNodes: 100000,
    maxDepth: 20,
    maxArray: 4096,
    maxString: 1024,
  });
  projected.revision = revision('level', `${sourceIdentity}:${projected.id}:${projected.revision}`);
  projected.classic.lineImpact = { ...CLASSIC_CURRENT_LINE_IMPACT };
  return freeze(projected);
}

/** Project an already authenticated resolved Classic entry. The source object is
 * never changed. Hosts must authenticate the indexed original before calling
 * this function; this policy layer does not grant pack or artwork ownership. */
export function projectClassicCurrentRulesEntry(entry, rulesEdition = CLASSIC_RULES_ORIGINAL) {
  if (rulesEdition === CLASSIC_RULES_ORIGINAL || rulesEdition === undefined) return entry;
  if (rulesEdition !== CLASSIC_RULES_CURRENT)
    throw new TypeError('Unsupported Classic rules edition.');
  const ruleset = versionsForCampaign(entry?.campaign).ruleset;
  if (!isClassicRuleset(ruleset))
    throw new TypeError('This Classic mission is not compatible with Current rules.');
  const sourceKey = campaignKey(entry.campaign);
  const projected = boundedJSON(entry, {
    maxBytes: 32 * 1024 * 1024,
    maxNodes: 400000,
    maxDepth: 24,
    maxArray: 4096,
    maxString: 6 * 1024 * 1024,
  });
  // Current rules change simulation identity, not the authenticated picture
  // owner. Keep the exact original campaign so hosts can resolve its Standard
  // or Gentle execution key and level revision when preparing artwork.
  projected.classicRulesPresentationCampaign = boundedJSON(entry.campaign, {
    maxBytes: 16 * 1024 * 1024,
    maxNodes: 400000,
    maxDepth: 24,
    maxArray: 4096,
    maxString: 65536,
  });
  projected.campaign.revision = revision('campaign', sourceKey);
  projected.campaign.levels = projected.campaign.levels.map((level) =>
    projectClassicCurrentRulesLevel(level, rulesEdition, sourceKey),
  );
  projected.classicRulesEdition = CLASSIC_RULES_CURRENT;
  projected.classicRulesSourceCampaignKey = sourceKey;
  // Exercise the canonical campaign validator after the policy mutation.
  campaignKey(projected.campaign);
  return freeze(projected);
}
