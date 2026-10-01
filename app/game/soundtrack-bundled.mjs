import { boundedJSON, exactKeys, required, stableId } from './data-json.mjs';
import { effectiveSoundtrackPolicy } from './soundtrack-rights.mjs';

const corePrefix = 'game/audio/soundtracks/';
/** Code-owned build registrations only. Never accept these from library or share metadata. */
export function resolveBundledSoundtrackAssets(value, catalogue) {
  const entries = boundedJSON(value, {
    maxBytes: 16384,
    maxNodes: 128,
    maxDepth: 2,
    maxArray: 16,
    maxString: 512,
  });
  required(Array.isArray(entries) && entries.length <= 16, 'Invalid bundled soundtrack assets.');
  const ids = new Set();
  const hashes = new Set();
  let bytes = 0;
  for (const entry of entries) {
    exactKeys(entry, ['id', 'sha256', 'bytes', 'path'], 'bundled soundtrack asset');
    const track = catalogue.tracks.find((item) => item.id === entry.id);
    const policy = track && effectiveSoundtrackPolicy(track, catalogue);
    required(
      stableId(entry.id) &&
        !ids.has(entry.id) &&
        /^[a-f0-9]{64}$/.test(entry.sha256) &&
        !hashes.has(entry.sha256) &&
        Number.isSafeInteger(entry.bytes) &&
        entry.bytes > 0 &&
        entry.path === `${corePrefix}${entry.sha256}.mp3`,
      'Invalid or duplicate bundled soundtrack registration.',
    );
    required(
      track &&
        track.asset.sha256 === entry.sha256 &&
        track.asset.bytes === entry.bytes &&
        track.policy?.id === entry.id &&
        track.policy.sha256 === entry.sha256 &&
        policy.webPlayback === 'allowed' &&
        policy.offlineCache === 'allowed' &&
        policy.redistribute === 'allowed',
      'Bundled soundtrack must match an admitted recording with offline and redistribution permission.',
    );
    ids.add(entry.id);
    hashes.add(entry.sha256);
    bytes += entry.bytes;
    Object.freeze(entry);
  }
  required(bytes <= 64 * 1024 * 1024, 'Bundled soundtrack assets exceed the core byte budget.');
  return Object.freeze(entries);
}
