import { boundedJSON, dataIdentity, exactKeys, required, stableId } from '../data-json.mjs';

export const DISCOVERY_EXPLORATION_RECIPE = Object.freeze({
  id: 'inspect-compare-atlas',
  revision: 1,
});
export const DISCOVERY_DIAGRAM_RECIPE = Object.freeze({ id: 'inspect-image-atlas', revision: 1 });
const SESSION = 'revealline-exploration-session.v1';
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const text = (value) => typeof value === 'string' && value.trim() && value.length <= 2048;
const list = (value, max, label, min = 0) =>
  required(
    Array.isArray(value) && value.length >= min && value.length <= max,
    `Invalid exploration ${label}.`,
  );
const unique = (rows, label) =>
  required(
    rows.every((row) => stableId(row.id)) &&
      new Set(rows.map((row) => row.id)).size === rows.length,
    `Invalid exploration ${label} identities.`,
  );
const locales = (value, keys, optional = []) => {
  exactKeys(value, ['en', 'uk'], 'exploration locales');
  for (const locale of ['en', 'uk']) {
    exactKeys(value[locale], [...keys, ...optional], `exploration ${locale}`);
    for (const key of keys)
      required(text(value[locale][key]), `Missing exploration ${locale}.${key}.`);
    for (const key of optional)
      if (value[locale][key] !== undefined)
        required(text(value[locale][key]), `Invalid exploration ${locale}.${key}.`);
  }
};

/** Registered presentation-only exercise. No author-supplied code, timers,
 * gameplay parameters, earning predicates or serialized completion flags. */
export function validateExplorationRecipe(input) {
  const value = boundedJSON(input, {
    maxBytes: 48 * 1024,
    maxNodes: 2048,
    maxDepth: 12,
    maxArray: 12,
    maxString: 2048,
  });
  const diagram = value.id === DISCOVERY_DIAGRAM_RECIPE.id;
  exactKeys(
    value,
    ['id', 'revision', 'cards', 'predictions', 'sources', ...(diagram ? ['diagram'] : [])],
    'exploration recipe',
  );
  required(
    [DISCOVERY_EXPLORATION_RECIPE.id, DISCOVERY_DIAGRAM_RECIPE.id].includes(value.id) &&
      value.revision === 1,
    'Unsupported exploration recipe revision.',
  );
  list(value.sources, 12, 'sources');
  unique(value.sources, 'source');
  for (const source of value.sources) {
    exactKeys(source, ['id', 'title', 'url'], 'exploration source');
    let url;
    try {
      url = new URL(source.url);
    } catch {
      /* rejected below */
    }
    required(
      text(source.title) &&
        typeof source.url === 'string' &&
        source.url.length <= 2048 &&
        /^https:\/\//.test(source.url) &&
        !/[\\\u0000-\u0020\u007f]/.test(source.url) &&
        url?.protocol === 'https:' &&
        !url.username &&
        !url.password,
      'Exploration sources require safe HTTPS links.',
    );
  }
  const sourceIds = new Set(value.sources.map((source) => source.id));
  list(value.cards, 8, 'cards', 2);
  unique(value.cards, 'card');
  for (const card of value.cards) {
    exactKeys(card, ['id', 'locales', 'sourceIds', 'asset'], 'exploration card');
    locales(card.locales, ['title', 'body', 'sourceNote'], ['alt']);
    list(card.sourceIds, 12, 'card sources');
    required(
      new Set(card.sourceIds).size === card.sourceIds.length &&
        card.sourceIds.every((id) => sourceIds.has(id)),
      'Exploration card source is missing.',
    );
    if (card.asset !== undefined) {
      exactKeys(card.asset, ['assetId', 'sha256'], 'exploration image');
      required(
        stableId(card.asset.assetId) && /^[a-f0-9]{64}$/.test(card.asset.sha256),
        'Exploration images require exact asset pins.',
      );
      for (const locale of ['en', 'uk'])
        required(
          text(card.locales[locale].alt),
          'Exploration images require bilingual alternative text.',
        );
    }
  }
  const cardIds = new Set(value.cards.map((card) => card.id));
  if (diagram) {
    exactKeys(value.diagram, ['asset', 'locales', 'hotspots'], 'exploration diagram');
    exactKeys(value.diagram.asset, ['assetId', 'sha256'], 'diagram image');
    required(
      stableId(value.diagram.asset.assetId) && /^[a-f0-9]{64}$/.test(value.diagram.asset.sha256),
      'Diagram images require exact asset pins.',
    );
    locales(value.diagram.locales, ['alt', 'caption']);
    list(value.diagram.hotspots, 8, 'diagram hotspots', 1);
    const located = new Set();
    for (const hotspot of value.diagram.hotspots) {
      exactKeys(hotspot, ['cardId', 'x', 'y'], 'diagram hotspot');
      required(
        cardIds.has(hotspot.cardId) && !located.has(hotspot.cardId),
        'Diagram hotspots require unique known cards.',
      );
      required(
        ['x', 'y'].every(
          (key) => Number.isFinite(hotspot[key]) && hotspot[key] >= 0 && hotspot[key] <= 1,
        ),
        'Diagram coordinates must be normalized to 0–1.',
      );
      located.add(hotspot.cardId);
    }
  }
  list(value.predictions, 4, 'predictions');
  unique(value.predictions, 'prediction');
  for (const prediction of value.predictions) {
    exactKeys(
      prediction,
      ['id', 'cardIds', 'locales', 'choices', 'expectedChoiceId'],
      'exploration prediction',
    );
    locales(prediction.locales, ['prompt', 'explanation']);
    list(prediction.cardIds, 8, 'prediction cards', 1);
    required(
      new Set(prediction.cardIds).size === prediction.cardIds.length &&
        prediction.cardIds.every((id) => cardIds.has(id)),
      'Prediction references an unknown card.',
    );
    list(prediction.choices, 4, 'prediction choices', 2);
    unique(prediction.choices, 'choice');
    for (const choice of prediction.choices) {
      exactKeys(choice, ['id', 'locales'], 'exploration choice');
      locales(choice.locales, ['label', 'feedback']);
    }
    required(
      prediction.choices.some((choice) => choice.id === prediction.expectedChoiceId),
      'Prediction expected choice is missing.',
    );
  }
  return freeze(value);
}

export function validateExplorationPayload(input) {
  const value = boundedJSON(input, {
    maxBytes: 52 * 1024,
    maxNodes: 2300,
    maxDepth: 13,
    maxArray: 12,
    maxString: 2048,
  });
  exactKeys(value, ['id', 'type', 'locales', 'recipe'], 'exploration payload');
  required(stableId(value.id) && value.type === 'exploration', 'Invalid exploration payload.');
  locales(value.locales, ['title', 'intro']);
  validateExplorationRecipe(value.recipe);
  return freeze(value);
}

export function explorationAssetReferences(input) {
  const recipe = validateExplorationRecipe(input);
  return [
    ...(recipe.diagram ? [recipe.diagram.asset] : []),
    ...recipe.cards.flatMap((card) => (card.asset ? [card.asset] : [])),
  ];
}

export function createExplorationState(input) {
  const recipe = validateExplorationRecipe(input);
  return freeze({
    format: SESSION,
    recipeIdentity: dataIdentity(recipe),
    selectedCardIds: [recipe.cards[0].id],
    answers: {},
  });
}

/** This transient state is never a Journey clear, learning attempt or mastery
 * receipt. Reopening starts fresh; each answer is recomputed from known choices. */
export function applyExplorationAction(input, previous, command) {
  const recipe = validateExplorationRecipe(input),
    state = boundedJSON(previous, { maxBytes: 4096, maxNodes: 64, maxDepth: 3, maxArray: 2 }),
    action = boundedJSON(command, { maxBytes: 1024, maxNodes: 8, maxDepth: 2 });
  exactKeys(state, ['format', 'recipeIdentity', 'selectedCardIds', 'answers'], 'exploration state');
  required(
    state.format === SESSION && state.recipeIdentity === dataIdentity(recipe),
    'Exploration state belongs to another recipe.',
  );
  list(state.selectedCardIds, 2, 'selected cards');
  required(
    new Set(state.selectedCardIds).size === state.selectedCardIds.length &&
      state.selectedCardIds.every((id) => recipe.cards.some((card) => card.id === id)),
    'Unknown inspected card.',
  );
  exactKeys(
    state.answers,
    recipe.predictions.map((row) => row.id),
    'exploration answers',
  );
  for (const [id, answer] of Object.entries(state.answers))
    required(
      recipe.predictions.find((row) => row.id === id).choices.some((row) => row.id === answer),
      'Unknown exploration answer.',
    );
  if (action.type === 'inspect') {
    exactKeys(action, ['type', 'cardId'], 'inspect action');
    required(
      recipe.cards.some((card) => card.id === action.cardId),
      'Unknown inspected card.',
    );
    state.selectedCardIds = state.selectedCardIds.includes(action.cardId)
      ? state.selectedCardIds.filter((id) => id !== action.cardId)
      : [...state.selectedCardIds.slice(-1), action.cardId];
  } else if (action.type === 'predict') {
    exactKeys(action, ['type', 'predictionId', 'choiceId'], 'prediction action');
    const prediction = recipe.predictions.find((row) => row.id === action.predictionId);
    required(
      prediction?.choices.some((row) => row.id === action.choiceId),
      'Unknown prediction or choice.',
    );
    state.answers[action.predictionId] = action.choiceId;
  } else {
    exactKeys(action, ['type'], 'reset action');
    required(action.type === 'reset', 'Unknown exploration action.');
    return createExplorationState(recipe);
  }
  return freeze(state);
}
