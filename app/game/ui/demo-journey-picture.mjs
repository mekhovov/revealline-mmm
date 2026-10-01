import { canonicalJSON } from '../data-json.mjs';
import { campaignKey } from '../library.mjs';
import { journeyMissionId } from '../journey/catalog.mjs';
import { validateJourneyProfile } from '../journey/profile.mjs';
import { validateJourneyPictures } from '../journey/pictures.mjs';
import { compileAssetRevision } from '../content-design/assets.mjs';
import {
  acquireCandidatePicture,
  claimCandidatePicture,
  discardUnclaimedCandidatePicture,
} from '../content-design/picture.mjs';

const same = (left, right) => canonicalJSON(left) === canonicalJSON(right);
const check = (signal) => {
  if (signal?.aborted) throw new DOMException('Demo Journey picture cancelled.', 'AbortError');
};
const result = (backdrop = null, pictureVisibility = 'blurred', previewAvailable = false) => {
  let disposed = false;
  return Object.freeze({
    backdrop,
    pictureVisibility,
    previewAvailable,
    artSeed: null,
    dispose() {
      if (disposed) return;
      disposed = true;
      backdrop?.release();
    },
  });
};

function manifestFor(entry, level, themeId) {
  const installed = entry.campaign.levels.find((item) => item.id === level.id);
  if (!installed || !same(installed, level)) return null;
  const manifest = entry.manifests?.find((item) => item.level.id === level.id);
  return manifest?.mode === 'solo' &&
    manifest.difficulty === entry.difficulty &&
    manifest.presentation.themeId === themeId &&
    same(manifest.level, installed)
    ? manifest
    : null;
}

function earnedCurrentAsset({ entry, level, theme, journey, entries, asset }) {
  try {
    const profile = validateJourneyProfile(journey.profile);
    const pictures = validateJourneyPictures(journey.pictures);
    if (!Object.hasOwn(profile.clears.solo, journey.missionId)) return false;
    // Display follows Collection's retained-original policy. A later legitimate
    // win replaces the latest clear, but does not revoke the first earned art.
    // The stricter latest-run equality check belongs to portable backup import.
    return pictures.records.some((record) => {
      if (
        record.mode !== 'solo' ||
        record.editionId !== journey.editionId ||
        record.missionId !== journey.missionId ||
        record.levelId !== level.id ||
        record.themeId !== theme.id ||
        !same(record.asset, asset)
      )
        return false;
      const owner = entries.find(
        (candidate) =>
          candidate.sourceProjectId === entry.sourceProjectId &&
          candidate.sourcePackId === entry.sourcePackId &&
          candidate.campaignId === entry.campaignId &&
          candidate.difficulty === record.difficulty &&
          campaignKey(candidate.campaign) === record.campaignKey,
      );
      const recordedLevel = owner?.campaign.levels.find(
        (item) => item.id === record.levelId && String(item.revision) === record.levelRevision,
      );
      const recordedManifest = recordedLevel && manifestFor(owner, recordedLevel, record.themeId);
      return !!recordedManifest?.background && same(recordedManifest.background, asset);
    });
  } catch {
    return false;
  }
}

/** Called only for an entry owned by the current candidate host. Its scoped
 * profile/ledger and optional owned difficulty entries are read-only inputs.
 * Always load the current manifest's exact art; receipts authorize clarity only. */
export async function resolveDemoJourneyPicture({
  entry,
  level,
  theme,
  journey,
  signal,
  acquire = acquireCandidatePicture,
} = {}) {
  let picture = null,
    claimed = false;
  try {
    check(signal);
    const entries = journey?.entries ?? [entry];
    if (!entries.includes(entry) || !entry.themes.some((item) => item.id === theme.id))
      return result();
    const manifest = manifestFor(entry, level, theme.id);
    if (
      !manifest?.background ||
      !journey?.editionId ||
      journey.missionId !==
        journeyMissionId({
          source: 'candidate',
          packId: entry.sourcePackId,
          campaignId: entry.campaignId,
          levelId: level.id,
        })
    )
      return result();
    const asset = compileAssetRevision(manifest.background);
    const earned = earnedCurrentAsset({ entry, level, theme, journey, entries, asset });
    picture = await acquire(asset, { signal });
    check(signal);
    claimCandidatePicture(asset, picture);
    claimed = true;
    return result(picture, earned ? 'clear' : 'blurred', true);
  } catch (error) {
    if (claimed) picture.release();
    else discardUnclaimedCandidatePicture(picture);
    if (signal?.aborted || error?.name === 'AbortError') throw error;
    return result();
  }
}
