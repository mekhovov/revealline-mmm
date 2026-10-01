import { required } from './data-json.mjs';
import { presentationPicturePins } from './flight-media-pins.mjs';
import { snapshotActorAppearancePin } from './presentation/actor-appearance-pin.mjs';

/** Save-envelope binding only, matching the existing picture-owner boundary.
 * The staged actor lease still verifies exact accepted content hashes, approved
 * source and decoded roles. No current preference is read while parsing a save.
 */
export function snapshotSessionActorPin(
  source,
  { pictures, campaignKey, themeId, simulationLevel, presentationLevel },
) {
  const pin = snapshotActorAppearancePin(source);
  if (pictures === null || pictures === undefined) {
    // Authored Journey images are owned by the immutable project, not the
    // managed Classic picture library. The host must re-resolve this complete
    // project context before acquiring/adopting actors. A pin cannot create a
    // managed-photo receipt or authorize a different installed Journey.
    required(
      pin.content.owner.kind === 'journey' &&
        pin.content.mode === 'solo' &&
        pin.content.contentThemeId === themeId &&
        pin.content.level.id === simulationLevel?.id &&
        (presentationLevel === undefined ||
          (presentationLevel !== null &&
            pin.content.level.id === presentationLevel.id &&
            pin.content.level.revision === presentationLevel.revision)),
      'Saved actors without picture pins require matching authored Journey context.',
    );
    return pin;
  }
  const media = presentationPicturePins(pictures);
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
    'Saved actors differ from the flight and its original picture owner.',
  );
  return pin;
}
