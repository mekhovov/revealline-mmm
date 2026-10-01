import { boundedJSON, exactKeys, plainObject, required, stableId } from './data-json.mjs';
import { recommendedBody as authoredRecommendedBody } from './content.mjs';
import { validateAnimationRecipes } from '../authoring/motion-lab/animation.mjs';
import { validateBodyDerivative } from './body-derivative.mjs';

const fields = (value, names, label) => {
  exactKeys(value, names, label);
  required(
    names.every((name) => Object.hasOwn(value, name)),
    `${label} fields are required.`,
  );
};
const sameMapping = (a, b) =>
  plainObject(a) &&
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(b).every(([key, value]) => Object.hasOwn(a, key) && a[key] === value);

/** Current presentation data only. No theme, reward, preference or session mutation.
 * A missing catalog preserves the original recommendation and availability behavior.
 */
export function createCharacterPresentations(presets) {
  const owned = boundedJSON(presets, {
    maxBytes: 128 * 1024,
    maxNodes: 16000,
    maxDepth: 16,
    maxArray: 128,
    maxString: 2048,
  });
  required(
    plainObject(owned) && plainObject(owned.characters),
    'Registered character presets required.',
  );
  const catalog = Object.hasOwn(owned, 'characterPresentations')
    ? boundedJSON(owned.characterPresentations, {
        maxBytes: 16 * 1024,
        maxNodes: 2048,
        maxDepth: 8,
        maxArray: 12,
        maxString: 160,
      })
    : { format: 'revealline-character-presentations.v1', sets: [] };
  fields(catalog, ['format', 'sets'], 'Character presentation catalog');
  required(
    catalog.format === 'revealline-character-presentations.v1',
    'Unknown character presentation format.',
  );
  required(
    Array.isArray(catalog.sets) && catalog.sets.length <= 8,
    'At most eight presentation sets.',
  );
  const ids = new Set(),
    starters = new Set(),
    guards = new Set();
  for (const set of catalog.sets) {
    fields(
      set,
      [
        'id',
        'themeId',
        'themeFamily',
        'legacyPlayer',
        'matchClassBodies',
        'classBodies',
        'starterBodies',
      ],
      'Presentation set',
    );
    required(
      [set.id, set.themeId, set.themeFamily, set.legacyPlayer].every(stableId),
      'Stable presentation IDs required.',
    );
    required(!ids.has(set.id), 'Duplicate presentation set.');
    ids.add(set.id);
    required(
      plainObject(set.matchClassBodies) && plainObject(set.classBodies),
      'Class body maps required.',
    );
    const classes = Object.keys(set.matchClassBodies);
    required(
      classes.length > 0 && classes.length <= 12 && classes.every(stableId),
      'One to twelve stable class keys.',
    );
    required(
      sameMapping(
        Object.fromEntries(classes.map((id) => [id, true])),
        Object.fromEntries(Object.keys(set.classBodies).map((id) => [id, true])),
      ),
      'Exact matching class key set required.',
    );
    required(
      Object.values(set.matchClassBodies).every(
        (id) => stableId(id) && Object.hasOwn(owned.characters, id),
      ),
      'Original recommendations must be registered.',
    );
    required(
      Object.hasOwn(owned.characters, set.legacyPlayer),
      'Original default body must be registered.',
    );
    const guard = JSON.stringify([
      set.themeId,
      set.themeFamily,
      set.legacyPlayer,
      classes.sort().map((id) => [id, set.matchClassBodies[id]]),
    ]);
    required(!guards.has(guard), 'Ambiguous presentation match.');
    guards.add(guard);
    const bodies = Object.values(set.classBodies);
    required(
      bodies.every(stableId) && new Set(bodies).size === bodies.length,
      'Independent stable body IDs required.',
    );
    required(
      Array.isArray(set.starterBodies) &&
        set.starterBodies.length === bodies.length &&
        new Set(set.starterBodies).size === bodies.length &&
        bodies.every((id) => set.starterBodies.includes(id)),
      'Starter availability must match this set exactly.',
    );
    const characters = {},
      recipes = {};
    for (const id of bodies) {
      required(
        !starters.has(id) && Object.hasOwn(owned.characters, id),
        'Unique registered presentation body required.',
      );
      const body = owned.characters[id];
      fields(
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
          'presentationSetId',
          'availability',
          'compactMinimumCSSPixels',
          'originalSha256',
          ...(Object.hasOwn(body, 'derivation') ? ['derivation'] : []),
        ],
        'Current presentation body',
      );
      required(
        body.presentationSetId === set.id && body.availability === 'starter',
        'Body must declare this starter set.',
      );
      required(
        typeof body.label === 'string' &&
          body.label.length > 0 &&
          body.label.length <= 80 &&
          typeof body.sourceStatus === 'string' &&
          body.sourceStatus.length <= 512,
        'Bounded character copy required.',
      );
      const sourceSrc = Object.hasOwn(body, 'derivation') ? body.derivation?.source?.src : body.src;
      required(
        typeof sourceSrc === 'string' &&
          /^(?:assets\/[a-zA-Z0-9._-]+|\.\.\/library\/[a-z0-9-]+\/originals\/[a-z0-9-]+)\.png$/.test(
            sourceSrc,
          ),
        'Portable original PNG path required.',
      );
      required(
        typeof body.originalSha256 === 'string' && /^[0-9a-f]{64}$/.test(body.originalSha256),
        'Original hash required.',
      );
      if (Object.hasOwn(body, 'derivation')) {
        required(
          typeof body.src === 'string' && body.src.startsWith('../library/'),
          'Portable runtime PNG path required.',
        );
        const role = Object.keys(set.classBodies).find((key) => set.classBodies[key] === id);
        required(set.id === 'ukraine-roles-v1', 'Unregistered derivative presentation set.');
        const originalSrc = ['scout', 'interceptor', 'fiber'].includes(role)
          ? `../library/ukraine-role-wide-variants/originals/${role}-v3.png`
          : `../library/ukraine-role-presentations/originals/${role}.png`;
        validateBodyDerivative(body.derivation, {
          id,
          src: `authoring/${body.src.slice(3)}`,
          sourceSrc: originalSrc,
        });
        required(
          body.originalSha256 === body.derivation.source.sha256,
          'Character source original hash differs.',
        );
      }
      required(
        body.widthCells === 1.25 &&
          body.heightCells === 1.25 &&
          body.sampling === 'nearest' &&
          body.headingOffsetDegrees === 0 &&
          body.compactMinimumCSSPixels === 20,
        'Registered compact body contract required.',
      );
      required(
        stableId(body.animationRecipe) &&
          plainObject(owned.animationRecipes) &&
          Object.hasOwn(owned.animationRecipes, body.animationRecipe),
        'Registered animation required.',
      );
      const recipe = owned.animationRecipes[body.animationRecipe];
      fields(recipe, ['components'], 'Presentation recipe');
      required(
        Array.isArray(recipe.components) && recipe.components.length === 1,
        'One supported presentation component required.',
      );
      const component = recipe.components[0];
      required(plainObject(component), 'Presentation component must be an object.');
      if (component.type === 'wings') {
        fields(
          component,
          [
            'id',
            'type',
            'anchors',
            'span',
            'chord',
            'frequencyHz',
            'speedFrequencyGain',
            'amplitudeDegrees',
            'foldFraction',
            'color',
            'tipColor',
          ],
          'Wing component',
        );
        required(component.id === 'wings', 'Registered wing component ID required.');
        required(
          Array.isArray(body.rotors) && body.rotors.length === 0,
          'Wing bodies have no rotor hubs.',
        );
        required(
          Array.isArray(component.anchors) && component.anchors.length === 2,
          'Two wing roots required.',
        );
        required(
          Number.isFinite(component.span) && Number.isFinite(component.chord),
          'Finite wing envelope required.',
        );
        // Conservative radius contains every rotated wing corner in the existing body frame.
        const radius = Math.hypot(component.span, component.chord * 0.5);
        for (const [index, anchor] of component.anchors.entries()) {
          required(
            Array.isArray(anchor) &&
              anchor.length === 3 &&
              anchor.every(Number.isFinite) &&
              Math.abs(anchor[0]) <= 0.4 &&
              Math.abs(anchor[1]) <= 0.4 &&
              anchor[2] === (index === 0 ? -1 : 1) &&
              (index === 0 ? anchor[0] < 0 : anchor[0] > 0),
            'Ordered finite left and right wing roots required.',
          );
          required(
            Math.abs(anchor[0]) + radius <= 0.5 && Math.abs(anchor[1]) + radius <= 0.5,
            'Wing envelope must fit the body frame.',
          );
        }
      } else {
        required(Array.isArray(body.rotors) && body.rotors.length > 0, 'Rotor hubs required.');
        for (const anchor of body.rotors)
          fields(anchor, ['x', 'y', 'radiusScale', 'direction', 'phaseDegrees'], 'Rotor hub');
        fields(
          component,
          [
            'id',
            'type',
            'bladeCount',
            'bladeShape',
            'radius',
            'bladeWidth',
            'idleRps',
            'travelRps',
            'maxVisualRps',
            'blurOpacity',
            'phaseDegrees',
            'direction',
            'fillColor',
            'tipColor',
            'hubColor',
          ],
          'Rotor component',
        );
        required(
          component.type === 'rotors' && component.bladeCount === 3,
          'Current presentation uses three-blade rotors.',
        );
      }
      characters[id] = body;
      recipes[body.animationRecipe] = recipe;
      starters.add(id);
    }
    validateAnimationRecipes({ characters, animationRecipes: recipes });
  }
  return Object.freeze({
    recommendedBody(theme, classId, fallback) {
      const current = boundedJSON(theme ?? {}, {
        maxBytes: 64 * 1024,
        maxNodes: 4096,
        maxDepth: 12,
      });
      const original = authoredRecommendedBody(
        current,
        classId,
        fallback ?? current.player ?? 'neutral-marker',
      );
      if (!stableId(classId)) return original;
      const match = catalog.sets.find(
        (set) =>
          current.id === set.themeId &&
          current.family === set.themeFamily &&
          current.player === set.legacyPlayer &&
          sameMapping(current.classBodies, set.matchClassBodies),
      );
      return match && Object.hasOwn(match.classBodies, classId)
        ? match.classBodies[classId]
        : original;
    },
    availableBodies(earned) {
      required(
        earned instanceof Set && Object.getPrototypeOf(earned) === Set.prototype,
        'Existing body availability Set required.',
      );
      const result = new Set(Set.prototype.values.call(earned));
      for (const id of starters) result.add(id);
      return result;
    },
  });
}
