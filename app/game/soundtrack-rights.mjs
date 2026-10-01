import { boundedJSON, exactKeys, required, stableId } from './data-json.mjs';

export const SOUNDTRACK_PERMISSIONS = Object.freeze([
  'webPlayback',
  'offlineCache',
  'redistribute',
  'modify',
  'gameplayVideo',
]);
const states = ['allowed', 'denied', 'unknown'];
const text = (value, max) => typeof value === 'string' && value.trim() && value.length <= max;
export function resolveSoundtrackPolicy(value, { id, sha256 } = {}) {
  const policy = boundedJSON(value, { maxBytes: 4096, maxNodes: 32, maxDepth: 2, maxString: 128 });
  exactKeys(
    policy,
    ['id', 'sha256', ...SOUNDTRACK_PERMISSIONS, 'contentId'],
    'soundtrack rights policy',
  );
  required(
    stableId(policy.id) && /^[a-f0-9]{64}$/.test(policy.sha256),
    'Invalid soundtrack policy identity.',
  );
  required(
    (id === undefined || policy.id === id) && (sha256 === undefined || policy.sha256 === sha256),
    'Soundtrack policy must bind the exact track ID and audio hash.',
  );
  required(
    SOUNDTRACK_PERMISSIONS.every((key) => states.includes(policy[key])) &&
      ['registered', 'not-registered', 'unknown'].includes(policy.contentId),
    'Invalid soundtrack rights permission.',
  );
  return Object.freeze(policy);
}
export function resolveSoundtrackWebsites(value) {
  required(Array.isArray(value) && value.length <= 4, 'Invalid soundtrack website links.');
  return Object.freeze(
    value.map((entry) => {
      exactKeys(entry, ['label', 'url'], 'soundtrack website');
      required(
        text(entry.label, 80) && text(entry.url, 1024),
        'Invalid soundtrack website label or URL.',
      );
      const url = new URL(entry.url);
      required(
        ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password,
        'Soundtrack websites require HTTP(S) URLs without credentials.',
      );
      return Object.freeze({ ...entry });
    }),
  );
}
const combine = (values) =>
  values.includes('denied')
    ? 'denied'
    : values.every((value) => value === 'allowed')
      ? 'allowed'
      : 'unknown';
/** The host-supplied catalogue is authority; imported pins can only narrow it.
 * Hash matches also constrain renamed uploads. This is an export guard, not DRM. */
export function effectiveSoundtrackPolicy(track, catalogue) {
  if (track.kind === 'synth')
    return Object.freeze(
      Object.fromEntries([
        ...SOUNDTRACK_PERMISSIONS.map((key) => [key, 'allowed']),
        ['contentId', 'not-registered'],
      ]),
    );
  const known = (catalogue?.tracks ?? []).filter(
    (item) => item.asset.sha256 === track.asset.sha256,
  );
  const restricted = known.filter((item) => item.policy).map((item) => item.policy);
  if (track.policy) restricted.push(track.policy);
  const authority = known.filter((item) => item.policy).map((item) => item.policy);
  // Legacy v1/v2 declarations preserve their established local recovery behavior.
  // New catalogue records always require a reviewed, exact policy.
  const modern = Boolean(track.policy || authority.length);
  if (!modern)
    return Object.freeze({
      webPlayback: 'allowed',
      offlineCache: 'allowed',
      redistribute: 'allowed',
      modify: 'unknown',
      gameplayVideo: 'unknown',
      contentId: 'unknown',
    });
  const result = {};
  for (const key of SOUNDTRACK_PERMISSIONS) {
    const claims = restricted.map((policy) => policy[key]);
    result[key] = combine([...claims, ...(authority.length ? [] : ['unknown'])]);
  }
  const content = restricted.map((policy) => policy.contentId);
  result.contentId = content.includes('registered')
    ? 'registered'
    : authority.length && content.every((value) => value === 'not-registered')
      ? 'not-registered'
      : 'unknown';
  return Object.freeze(result);
}
