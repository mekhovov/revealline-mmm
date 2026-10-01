import { campaignKey } from './library.mjs';
import { createDifficultyContext } from './campaign-difficulty.mjs';
import { t } from './i18n/index.mjs';

const labelKeys = Object.freeze({
  standard: 'interface:missionLibrary.difficulty.standard',
  gentle: 'interface:missionLibrary.difficulty.gentle',
});
const archivedLabelKey = 'interface:library.archivedDifficultyLabel';

/** Resolve a semantic gallery context through the active locale on every read. */
export function galleryDifficultyLabel(context) {
  return t(context?.labelKey ?? archivedLabelKey);
}

/** A cached display projection of trusted installed contexts, never saved data. */
export function createGalleryDifficultyResolver(entries) {
  const known = new Map();
  for (const entry of entries) {
    try {
      const key = campaignKey(entry.campaign);
      let difficulty = 'standard',
        baseCampaignKey = key;
      if (entry.activity === 'challenge') difficulty = null;
      else if (
        ['difficulty', 'baseCampaignKey', 'baseCampaign', 'executionKey', 'policyVersion'].some(
          (field) => Object.hasOwn(entry, field),
        )
      ) {
        if (!Object.hasOwn(labelKeys, entry.difficulty)) continue;
        const context = createDifficultyContext(entry.baseCampaign, entry.difficulty);
        if (
          context.campaignKey !== key ||
          context.baseCampaignKey !== entry.baseCampaignKey ||
          entry.executionKey !== key ||
          (Object.hasOwn(entry, 'policyVersion') && entry.policyVersion !== context.policyVersion)
        )
          continue;
        difficulty = context.mode;
        baseCampaignKey = context.baseCampaignKey;
      }
      // Older hosts provide authored wrappers. Their exact keys are Standard;
      // an ID resembling a Gentle key never implies a derived difficulty.
      if (!known.has(key))
        known.set(
          key,
          Object.freeze({
            entry,
            difficulty,
            baseCampaignKey,
            labelKey: difficulty === null ? 'interface:challenge' : labelKeys[difficulty],
          }),
        );
    } catch {
      // Missing/changed/invalid installed context can only produce archived copy.
    }
  }
  function resolve(key) {
    return known.get(key) ?? null;
  }
  function label(key) {
    return galleryDifficultyLabel(resolve(key));
  }
  function picture(item) {
    const context = resolve(item.campaignKey);
    if (!context) return null;
    const { entry } = context;
    const level = entry.campaign.levels.find((candidate) => candidate.id === item.levelId);
    const theme = entry.themes?.find((candidate) => candidate.id === item.themeId);
    if (!level || !theme) return null;
    return Object.freeze({
      ...context,
      item,
      level,
      theme,
      visualOverrides: {
        ...entry.visualOverrides,
        ...entry.levelVisuals?.find((candidate) => candidate.levelId === item.levelId)
          ?.visualOverrides,
      },
    });
  }
  function group(items) {
    const groups = new Map();
    for (const item of items) {
      const found = picture(item);
      const key = JSON.stringify(
        found ? [found.baseCampaignKey, item.levelId, item.themeId] : ['archived', item.key],
      );
      if (!groups.has(key)) groups.set(key, { key, item, variants: [] });
      if (found) groups.get(key).variants.push(found);
    }
    return Object.freeze(
      [...groups.values()].map((entry) => {
        entry.variants.sort(
          (a, b) => Number(a.difficulty === 'gentle') - Number(b.difficulty === 'gentle'),
        );
        return Object.freeze({
          ...entry,
          item: entry.variants[0]?.item ?? entry.item,
          variants: Object.freeze(entry.variants),
        });
      }),
    );
  }
  return Object.freeze({ resolve, label, picture, group });
}
