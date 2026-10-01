import { boundedJSON, dataIdentity, exactKeys, required, stableId } from '../data-json.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import { validateAnimationRecipes } from '../../authoring/motion-lab/animation.mjs';
import { bodyMotionPose, validateBodyBacking } from '../ui/body-motion.mjs';
import { validateRewardState } from './model.mjs';

/** Existing preset bodies become optional rewards only through an explicit
 * playable-character allowlist. Absence preserves historical starter behavior. */
export function validateRewardCharacterIds(presets, themes = []) {
  if (presets?.rewardCharacters === undefined) return [];
  const ids = presets.rewardCharacters;
  required(
    Array.isArray(ids) &&
      ids.length <= 32 &&
      new Set(ids).size === ids.length &&
      ids.every((id) => stableId(id) && Object.hasOwn(presets.characters ?? {}, id)),
    'Reward characters must be distinct registered playable body IDs.',
  );
  const starters = new Set([
    ...themes.flatMap((theme) => [theme.player, ...Object.values(theme.classBodies ?? {})]),
    ...(presets.characterPresentations?.sets ?? []).flatMap((set) => set.starterBodies ?? []),
    ...Object.entries(presets.characters)
      .filter(([, body]) => body.availability === 'starter')
      .map(([id]) => id),
  ]);
  const actors = new Set(themes.flatMap((theme) => Object.values(theme.actorRecipes ?? {})));
  required(
    ids.every((id) => !starters.has(id) && !actors.has(id)),
    'A reward character cannot be a starter/class body or an enemy actor.',
  );
  return ids;
}

/** Resolve only the exact selected preset and approved local media closure.
 * The resulting recipe changes drawing, never classes, collision or scoring. */
export function createRewardCosmeticRegistry({
  presets,
  assets = [],
  themes = [],
  publication = 'public',
}) {
  if (!presets?.rewardCharacters?.length) {
    validateRewardCharacterIds(presets, themes);
    return freezeDesign([]);
  }
  const source = boundedJSON(presets, {
    maxBytes: 128 * 1024,
    maxNodes: 16000,
    maxDepth: 16,
    maxArray: 128,
    maxString: 2048,
  });
  const ids = validateRewardCharacterIds(source, themes);
  validateAnimationRecipes(source);
  const ledger = new Map(assets.map((asset) => [asset.id, asset]));
  return freezeDesign(
    ids.map((recipeId) => {
      const body = source.characters[recipeId];
      exactKeys(
        body,
        [
          'label',
          'sourceStatus',
          'src',
          'widthCells',
          'heightCells',
          'sampling',
          'headingOffsetDegrees',
          'animationRecipe',
          'rotors',
          'bodyMotion',
          'bodyBacking',
          'compactMinimumCSSPixels',
          'presentationPivot',
          'originalSha256',
          'derivation',
          'presentationSetId',
          'availability',
          'centerMark',
        ],
        'Reward character preset',
      );
      required(
        typeof body.label === 'string' &&
          body.label.trim() &&
          body.label.length <= 160 &&
          ['widthCells', 'heightCells'].every(
            (key) => Number.isFinite(body[key]) && body[key] >= 0.1 && body[key] <= 16,
          ) &&
          ['linear', 'nearest'].includes(body.sampling) &&
          Number.isFinite(body.headingOffsetDegrees) &&
          Math.abs(body.headingOffsetDegrees) <= 360,
        'Reward character needs the existing bounded body presentation.',
      );
      if (body.bodyMotion)
        exactKeys(
          body.bodyMotion,
          ['kind', 'radiansPerSecond', 'travelGain'],
          'Reward body motion',
        );
      if (body.presentationPivot) {
        exactKeys(body.presentationPivot, ['x', 'y'], 'Reward character pivot');
        required(
          ['x', 'y'].every(
            (key) =>
              Number.isFinite(body.presentationPivot[key]) &&
              body.presentationPivot[key] >= 0 &&
              body.presentationPivot[key] <= 1,
          ),
          'Invalid reward character pivot.',
        );
      }
      if (body.centerMark) {
        exactKeys(
          body.centerMark,
          ['widthCells', 'heightCells', 'topColor', 'bottomColor'],
          'Reward character mark',
        );
        required(
          ['widthCells', 'heightCells'].every(
            (key) =>
              Number.isFinite(body.centerMark[key]) &&
              body.centerMark[key] > 0 &&
              body.centerMark[key] <= body[key],
          ) &&
            ['topColor', 'bottomColor'].every((key) =>
              /^#[a-f0-9]{6}$/i.test(body.centerMark[key]),
            ),
          'Invalid bounded reward character mark.',
        );
      }
      validateBodyBacking(body);
      bodyMotionPose(body, { reduced: true });
      const selected = new Map();
      let image = null;
      const add = (asset) => {
        required(
          asset &&
            asset.approved === true &&
            (publication !== 'public' || asset.publication === 'public') &&
            /^[a-f0-9]{64}$/.test(asset.sha256) &&
            Number.isSafeInteger(asset.bytes) &&
            asset.bytes > 0,
          'Reward character media is outside the selected approved closure.',
        );
        if (selected.has(asset.id)) return;
        selected.set(asset.id, { assetId: asset.id, sha256: asset.sha256 });
        for (const dependency of asset.dependencies ?? []) add(ledger.get(dependency));
      };
      if (body.src !== null) {
        required(
          typeof body.src === 'string' &&
            body.src.length <= 512 &&
            !/[:\\?#%]/.test(body.src) &&
            !body.src.startsWith('/') &&
            body.src
              .split('/')
              .every(
                (part) => ['.', '..'].includes(part) || /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(part),
              ),
          'Reward character artwork requires a local preset path.',
        );
        const path = new URL(
          body.src,
          'https://edition.invalid/authoring/motion-lab/',
        ).pathname.slice(1);
        const asset = assets.find((item) => item.path === path);
        required(
          asset && /\.(?:png|jpe?g|webp)$/i.test(path) && asset.bytes <= 4 * 1024 * 1024,
          'Reward character needs a selected raster image within the existing limit.',
        );
        add(asset);
        image = { assetId: asset.id, sha256: asset.sha256 };
      }
      const references = [...selected.values()].sort((a, b) => a.assetId.localeCompare(b.assetId));
      const animation = source.animationRecipes[body.animationRecipe];
      const recipeRevision = `character-v1-${dataIdentity({ recipeId, body, animation, assets: references })}`;
      return { recipeId, recipeRevision, body, animation, image, assets: references };
    }),
  );
}

export function resolveRewardCosmetic(registry, reference) {
  required(
    stableId(reference?.recipeId) && typeof reference.recipeRevision === 'string',
    'Reward appearance needs an exact character recipe.',
  );
  const recipe = registry.find(
    (entry) =>
      entry.recipeId === reference.recipeId && entry.recipeRevision === reference.recipeRevision,
  );
  required(recipe, 'This exact reward character is not registered in the selected edition.');
  return recipe;
}

/** The reward authority owns receipts. This read-only projection adds no new
 * entitlement store and cannot derive an unlock from a preview or raw XP. */
export function projectEarnedRewardCosmetics(state, { registry, editionId, brandId, campaignIds }) {
  if (!state) return freezeDesign({ available: [], unavailable: [] });
  const accepted = validateRewardState(state, { editionId });
  const available = new Map(),
    unavailable = new Map();
  for (const receipt of accepted.receipts) {
    const definition = receipt.definition;
    if (definition.brandId !== brandId || !campaignIds.includes(definition.campaignId)) continue;
    for (const payload of definition.payloads.filter((item) => item.type === 'cosmetic')) {
      const key = `${payload.recipeId}@${payload.recipeRevision}`;
      const recipe = registry.find(
        (item) =>
          item.recipeId === payload.recipeId && item.recipeRevision === payload.recipeRevision,
      );
      if (recipe) available.set(key, recipe);
      else
        unavailable.set(key, {
          recipeId: payload.recipeId,
          recipeRevision: payload.recipeRevision,
        });
    }
  }
  return freezeDesign({
    available: [...available.values()],
    unavailable: [...unavailable.values()],
  });
}
