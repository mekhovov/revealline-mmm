import { buildCoopLevel, createCoopLevelRecipe } from './recipes.mjs';

/** Relay Yard: authored revision 2, with mirrored pressure and no prebuilt crossing. */
export const RELAY_YARD_RECIPE = createCoopLevelRecipe('stronghold', { revision: 2 });
export const RELAY_YARD = buildCoopLevel(RELAY_YARD_RECIPE);

export const COOP_PLAYTEST_CONFIGURATIONS = [
  {
    id: 'full',
    label: 'Full teamwork',
    jointCuts: true,
    assistCaptures: true,
    advancedCooperation: true,
  },
  {
    id: 'joint',
    label: 'Joint Cuts + ordinary cover',
    jointCuts: true,
    assistCaptures: true,
    advancedCooperation: false,
  },
  {
    id: 'independent',
    label: 'Individual cuts + ordinary cover',
    jointCuts: false,
    assistCaptures: false,
    advancedCooperation: false,
  },
];
