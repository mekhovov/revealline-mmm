import { required } from '../data-json.mjs';
import { prepareCampaignVisualThemeContext } from './visual-theme-identities.mjs';
import { VISUAL_THEME_PIN_FORMAT } from './visual-theme-pin.mjs';
import { readSavedVisualCatalogue, prepareSavedVisualTheme } from './saved-visual-theme.mjs';

// This is release policy, not an ID/name heuristic. Advancing the default must
// accompany a reviewed catalogue entry and retained previous compiled output.
export const FRESH_SOLO_VISUAL_RELEASE = Object.freeze({
  campaignKey: 'first-signal/2/88639f3aab7b6cc1',
  selection: Object.freeze({ id: 'field-kit-fpv', revision: 54 }),
});
export function freshSoloVisualSelection(entry, themeId) {
  return entry?.baseCampaignKey === FRESH_SOLO_VISUAL_RELEASE.campaignKey &&
    themeId === 'fpv' &&
    entry.activity !== 'challenge' &&
    ['standard', 'gentle'].includes(entry.difficulty)
    ? FRESH_SOLO_VISUAL_RELEASE.selection
    : null;
}

/** Fresh default selection is code-owned and coverage-limited. A broken covered
 * release fails preparation; it never silently launches a different revision. */
export async function prepareFreshSoloVisualTheme(
  { entry, level, themeId, currentManifestSha256 = null },
  options = {},
) {
  const selection = freshSoloVisualSelection(entry, themeId);
  required(selection, 'This mission does not declare a complete fresh visual collection.');
  const content = await prepareCampaignVisualThemeContext(
    { entry, level, association: { editionId: 'field-kit', contentThemeId: 'fpv', mode: 'solo' } },
    { signal: options.signal },
  );
  const catalogue = await readSavedVisualCatalogue(options);
  const match = catalogue.resolve(selection, content);
  required(
    match.kind === 'compatible',
    'The selected release theme is unavailable for this exact mission. Your flight is kept.',
  );
  return prepareSavedVisualTheme(
    {
      pin: {
        format: VISUAL_THEME_PIN_FORMAT,
        content,
        selection,
        presentation: match.presentation,
      },
      entry,
      currentManifestSha256,
    },
    { ...options, catalogue, fresh: true },
  );
}
