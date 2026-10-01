import { boundedJSON, exactKeys, required, stableId } from '../data-json.mjs';

export const REWARD_AUDIO_GROUP_FORMAT = 'revealline-ordered-audio-group.v1';

/** A presentation recipe over existing payloads. It adds no media references,
 * entitlement, listening history or automatic playback rule. */
export function validateRewardAudioGroups(input, payloads) {
  const groups = boundedJSON(input, { maxBytes: 8192, maxNodes: 256, maxArray: 8, maxString: 256 });
  required(
    Array.isArray(groups) && groups.length > 0 && groups.length <= 4,
    'Audio playlists require one to four groups.',
  );
  const ids = new Set(),
    used = new Set();
  for (const group of groups) {
    exactKeys(group, ['format', 'id', 'locales', 'payloadIds'], 'audio group');
    required(
      group.format === REWARD_AUDIO_GROUP_FORMAT && stableId(group.id) && !ids.has(group.id),
      'Audio playlist requires a unique ID and registered recipe version.',
    );
    ids.add(group.id);
    exactKeys(group.locales, ['en', 'uk'], 'audio group locales');
    for (const language of ['en', 'uk']) {
      exactKeys(group.locales[language], ['title'], 'audio group title');
      const title = group.locales[language].title;
      required(
        typeof title === 'string' && title.trim().length > 0 && title.length <= 256,
        'Audio playlists require bounded English and Ukrainian titles.',
      );
    }
    required(
      Array.isArray(group.payloadIds) &&
        group.payloadIds.length >= 2 &&
        group.payloadIds.length <= 8,
      'Audio playlists require two to eight recordings.',
    );
    for (const id of group.payloadIds) {
      required(
        stableId(id) && !used.has(id) && payloads.some((p) => p.id === id && p.type === 'audio'),
        'Audio playlists require unique audio payloads in this exact reward.',
      );
      used.add(id);
    }
    Object.freeze(group.payloadIds);
    Object.values(group.locales).forEach(Object.freeze);
    Object.freeze(group.locales);
    Object.freeze(group);
  }
  return Object.freeze(groups);
}

/** Place each playlist at its first member's authored position, then use its
 * explicit track order. Ungrouped payloads keep their original relative order. */
export function rewardPresentationItems(definition) {
  const groups =
    definition.audioGroups === undefined
      ? []
      : validateRewardAudioGroups(definition.audioGroups, definition.payloads);
  const seen = new Set(),
    items = [];
  for (const payload of definition.payloads) {
    const group = groups.find((value) => value.payloadIds.includes(payload.id));
    if (!group) items.push({ kind: 'payload', payload });
    else if (!seen.has(group.id)) {
      seen.add(group.id);
      items.push({
        kind: 'audio-group',
        group,
        payloads: group.payloadIds.map((id) =>
          definition.payloads.find((value) => value.id === id),
        ),
      });
    }
  }
  return items;
}
