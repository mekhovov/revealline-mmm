import { required } from '../data-json.mjs';

/** Project an already admitted brand/boot view to its selected missions. This
 * operates on cloned runtime data; original source bytes remain provenance. */
export function projectEditionThemeSelection({ brand, projects, themes }) {
  if (!brand.themeIds) return { brand, themes };
  const selected = new Set([brand.themeId]);
  for (const project of projects)
    for (const mission of project.missions) selected.add(mission.presentation.themeId);
  required(
    [...selected].every(
      (id) => brand.themeIds.includes(id) && themes.themes.some((theme) => theme.id === id),
    ),
    'Selected mission theme is missing from its edition boot inventory.',
  );
  return {
    brand: { ...brand, themeIds: brand.themeIds.filter((id) => selected.has(id)) },
    themes: { ...themes, themes: themes.themes.filter((theme) => selected.has(theme.id)) },
  };
}

/** A shared mechanic lesson retains its exact rules and recipe parameters.
 * Only the surrounding presentation and explanatory class copy are selected. */
export function projectEditionGuideScenario(source, { theme, classes }) {
  required(
    theme && Array.isArray(classes),
    'Guide practice needs selected presentation and class labels.',
  );
  const scenario = structuredClone(source);
  scenario.theme = structuredClone(theme);
  scenario.classRecipes = scenario.classRecipes.map((recipe) => {
    const selected = classes.find((entry) => entry.id === recipe.id);
    required(
      selected && typeof selected.label === 'string' && typeof selected.description === 'string',
      'Selected guide practice class labels are required.',
    );
    return { ...recipe, label: selected.label, description: selected.description };
  });
  if (theme.soundtrack) scenario.music = structuredClone(theme.soundtrack);
  else delete scenario.music;
  return scenario;
}
