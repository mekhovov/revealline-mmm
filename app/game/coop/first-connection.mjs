import { buildCoopLevel, createCoopLevelRecipe } from './recipes.mjs';

/** First Connection: authored revision 2, with mirrored pressure and no prebuilt crossing. */
export const FIRST_CONNECTION_RECIPE = createCoopLevelRecipe('coverage', { revision: 2 });
export const FIRST_CONNECTION = buildCoopLevel(FIRST_CONNECTION_RECIPE);

export const COOP_EXPERIMENTS = [
  { id: 'joint', label: 'Joint Cuts', jointCuts: true, assistCaptures: true },
  { id: 'independent', label: 'Individual cuts', jointCuts: false, assistCaptures: false },
];
