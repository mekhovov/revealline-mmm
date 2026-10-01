import { required } from './data-json.mjs';
import { presentationPicturePins } from './flight-media-pins.mjs';
import { snapshotVisualThemePin } from './presentation/visual-theme-pin.mjs';

/** Save-envelope binding only. Actual collection approval, exact authored hash
 * and decoded dependencies are rechecked by the staged visual-theme lease.
 * Never derive a new visual choice from current settings while reading a save. */
export function snapshotSessionVisualPin(
  source,
  { pictures, campaignKey, themeId, simulationLevel, presentationLevel },
) {
  const pin = snapshotVisualThemePin(source),
    media = presentationPicturePins(pictures);
  const picture = media.choices.find((choice) => choice.identity.themeId === themeId);
  required(
    media.executionKey === campaignKey &&
      media.levelId === simulationLevel?.id &&
      (presentationLevel === undefined ||
        (presentationLevel !== null &&
          media.levelId === presentationLevel.id &&
          media.levelRevision === presentationLevel.revision)) &&
      picture &&
      pin.content.mode === 'solo' &&
      pin.content.contentThemeId === themeId &&
      ['campaign', 'journey'].includes(pin.content.owner.kind) &&
      pin.content.owner.baseCampaignKey === picture.identity.baseCampaignKey &&
      pin.content.level.id === picture.identity.levelId &&
      pin.content.level.revision === picture.identity.levelRevision,
    'Saved visual collection differs from the flight and its original picture owner.',
  );
  return pin;
}
