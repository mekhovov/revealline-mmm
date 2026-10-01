import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import {
  CREATOR_MEDIA_DEPENDENCIES_FORMAT,
  validateCreatorMediaDependencies,
} from './media-intake.mjs';

export const CREATOR_STORY_BINDINGS_FORMAT = 'revealline-creator-story-bindings.v1';
const hashValid = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const copy = (value) =>
  boundedJSON(value, {
    maxBytes: 2 * 1024 * 1024,
    maxNodes: 10000,
    maxDepth: 14,
    maxArray: 512,
    maxString: 2048,
  });

/** Bind already inspected intake dependencies to authored missions. Filenames
 * never participate in this contract; the selected exact hashes do. */
export function creatorMediaBundleInput(intake, missionIds, { descriptionFor } = {}) {
  required(
    intake?.format === 'revealline-creator-media-intake.v1' &&
      Array.isArray(intake.assets) &&
      intake.dependencies?.format === CREATOR_MEDIA_DEPENDENCIES_FORMAT,
    'Prepare creator media intake before binding victory stories.',
  );
  const dependencies = validateCreatorMediaDependencies(intake.dependencies);
  required(
    Array.isArray(missionIds) &&
      missionIds.length === dependencies.stories.length &&
      missionIds.length > 0 &&
      missionIds.length <= 50 &&
      missionIds.every(stableId) &&
      new Set(missionIds).size === missionIds.length,
    'Assign one inspected victory story to every selected mission.',
  );
  required(
    descriptionFor === undefined || typeof descriptionFor === 'function',
    'Victory story descriptions need an explicit adapter.',
  );
  const stories = dependencies.stories.map((story, index) => {
    const description =
      descriptionFor?.({ missionId: missionIds[index], story, index }) ??
      'A creator-supplied victory story.';
    required(
      typeof description === 'string' &&
        description.trim().length > 0 &&
        description.length <= 2048,
      'Victory story descriptions need bounded text.',
    );
    return { missionId: missionIds[index], ...story, description };
  });
  const wanted = new Set(stories.flatMap((story) => [story.poster.sha256, story.video.sha256]));
  const assets = new Map();
  for (const item of intake.assets) {
    required(
      item && hashValid(item.sha256) && item.blob instanceof Blob,
      'Creator media intake returned an invalid asset.',
    );
    if (wanted.has(item.sha256)) assets.set(item.sha256, item.blob);
  }
  required(
    assets.size === wanted.size && [...wanted].every((sha256) => assets.has(sha256)),
    'Creator media intake is missing a selected poster or complete video original.',
  );
  return Object.freeze({
    media: validateCreatorStoryBindings({
      format: CREATOR_STORY_BINDINGS_FORMAT,
      stories,
    }),
    assets: Object.freeze(
      [...assets]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sha256, blob]) => Object.freeze({ sha256, blob })),
    ),
  });
}

/** Bind stories by their immutable video hashes. This is the production adapter:
 * sorting review rows, inserting an image or changing a filename cannot move a
 * story onto another mission. */
export function creatorMediaBundleInputByHash(intake, bindings, { descriptionFor } = {}) {
  required(
    intake?.format === 'revealline-creator-media-intake.v1' &&
      Array.isArray(intake.assets) &&
      intake.dependencies?.format === CREATOR_MEDIA_DEPENDENCIES_FORMAT,
    'Prepare creator media intake before binding victory stories.',
  );
  const dependencies = validateCreatorMediaDependencies(intake.dependencies);
  required(
    Array.isArray(bindings) &&
      bindings.length === dependencies.stories.length &&
      bindings.length > 0 &&
      bindings.length <= 50,
    'Assign one exact video hash to every selected story mission.',
  );
  const missionByVideo = new Map();
  for (const binding of bindings) {
    const value = copy(binding);
    exactKeys(value, ['videoSha256', 'missionId'], 'creator story mission binding');
    required(
      hashValid(value.videoSha256) &&
        stableId(value.missionId) &&
        !missionByVideo.has(value.videoSha256),
      'Story mission bindings need unique video hashes and valid missions.',
    );
    missionByVideo.set(value.videoSha256, value.missionId);
  }
  required(
    dependencies.stories.every((story) => missionByVideo.has(story.video.sha256)),
    'A selected video is missing its exact story mission binding.',
  );
  const stories = dependencies.stories.map((story, index) => {
    const missionId = missionByVideo.get(story.video.sha256);
    const description =
      descriptionFor?.({ missionId, story, index, videoSha256: story.video.sha256 }) ??
      'A creator-supplied victory story.';
    required(
      typeof description === 'string' &&
        description.trim().length > 0 &&
        description.length <= 2048,
      'Victory story descriptions need bounded text.',
    );
    return { missionId, ...story, description };
  });
  const wanted = new Set(stories.flatMap((story) => [story.poster.sha256, story.video.sha256]));
  const assets = new Map();
  for (const item of intake.assets) {
    required(
      item && hashValid(item.sha256) && item.blob instanceof Blob,
      'Creator media intake returned an invalid asset.',
    );
    if (wanted.has(item.sha256)) assets.set(item.sha256, item.blob);
  }
  required(
    assets.size === wanted.size && [...wanted].every((sha256) => assets.has(sha256)),
    'Creator media intake is missing a selected poster or complete video original.',
  );
  return Object.freeze({
    media: validateCreatorStoryBindings({
      format: CREATOR_STORY_BINDINGS_FORMAT,
      stories,
    }),
    assets: Object.freeze(
      [...assets]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sha256, blob]) => Object.freeze({ sha256, blob })),
    ),
  });
}

export function validateCreatorStoryBindings(source, { project } = {}) {
  const value = copy(source);
  exactKeys(value, ['format', 'stories'], 'creator story bindings');
  required(
    value.format === CREATOR_STORY_BINDINGS_FORMAT &&
      Array.isArray(value.stories) &&
      value.stories.length > 0 &&
      value.stories.length <= 50,
    'Unsupported or empty creator story bindings.',
  );
  const dependencies = validateCreatorMediaDependencies({
    format: CREATOR_MEDIA_DEPENDENCIES_FORMAT,
    stories: value.stories.map(
      ({ missionId: _missionId, description: _description, ...story }) => story,
    ),
  });
  const missionIds = new Set();
  value.stories.forEach((story, index) => {
    exactKeys(
      story,
      ['missionId', 'video', 'poster', 'playbackRange', 'description'],
      'creator story binding',
    );
    required(
      stableId(story.missionId) && !missionIds.has(story.missionId),
      'Duplicate or invalid creator story mission.',
    );
    required(
      typeof story.description === 'string' &&
        story.description.trim().length > 0 &&
        story.description.length <= 2048,
      'Creator victory story needs a bounded description.',
    );
    missionIds.add(story.missionId);
    required(
      canonicalJSON({
        video: story.video,
        poster: story.poster,
        playbackRange: story.playbackRange,
      }) === canonicalJSON(dependencies.stories[index]),
      'Creator story dependency changed while binding its mission.',
    );
  });
  if (project) {
    const missions = new Map(project.missions.map((mission) => [mission.id, mission]));
    const assets = new Map(project.assets.map((asset) => [asset.id, asset]));
    for (const story of value.stories) {
      const mission = missions.get(story.missionId),
        poster = mission && assets.get(mission.presentation.backgroundAssetId);
      required(mission && poster, 'Creator story belongs to a missing mission or poster.');
      required(
        poster.sha256 === story.poster.sha256 &&
          poster.bytes === story.poster.bytes &&
          poster.width === story.poster.width &&
          poster.height === story.poster.height,
        'Creator story poster differs from the mission reveal picture.',
      );
    }
  }
  return freezeDesign(value);
}

export function creatorStoryAssetFacts(media) {
  if (!media) return new Map();
  const checked = validateCreatorStoryBindings(media),
    facts = new Map();
  for (const story of checked.stories) {
    const poster = {
      sha256: story.poster.sha256,
      bytes: story.poster.bytes,
      mime: 'image/png',
      kind: 'poster',
    };
    const oldPoster = facts.get(poster.sha256);
    required(
      !oldPoster || canonicalJSON(oldPoster) === canonicalJSON(poster),
      'One creator poster hash cannot claim different facts.',
    );
    facts.set(poster.sha256, poster);
    const video = {
      sha256: story.video.sha256,
      bytes: story.video.bytes,
      mime: story.video.mime,
      kind: 'victory-video-original',
    };
    const oldVideo = facts.get(video.sha256);
    required(
      !oldVideo || canonicalJSON(oldVideo) === canonicalJSON(video),
      'One creator video hash cannot claim different facts.',
    );
    facts.set(video.sha256, video);
  }
  return facts;
}
