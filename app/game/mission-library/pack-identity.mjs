import { canonicalJSON } from '../data-json.mjs';
import { externalChapterHash } from '../external-chapter.mjs';
import { resolvePackCampaign } from '../packs.mjs';
import { campaignKey } from '../library.mjs';

const identities = new WeakMap();

/** Full immutable prepared-pack identity, including artwork, computed once per
 * actual object. No fetch, decode, persistence or install happens here. */
export function preparedPackIdentity(pack) {
  if (!pack?.campaigns?.[0]) throw new TypeError('Choose a prepared installed pack.');
  if (!identities.has(pack)) {
    // The private prepared-pack registration is required before trusting/fingerprinting.
    resolvePackCampaign(pack, pack.campaigns[0].id);
    const text = canonicalJSON(pack);
    const bytes = new TextEncoder().encode(text).length;
    const pending = externalChapterHash(text).then((sha256) => Object.freeze({ bytes, sha256 }));
    identities.set(pack, pending);
    pending.catch(() => {
      if (identities.get(pack) === pending) identities.delete(pack);
    });
  }
  return identities.get(pack);
}

/** Compare with the build-authenticated lightweight index. A true result only
 * proves the original pack edition, not managed artwork readiness or installation
 * in the current library. The host must still check both immediately before Play.
 */
export async function verifyIndexedInstalledPack(pack, row) {
  const identity = await preparedPackIdentity(pack);
  if (
    !row ||
    row.source === 'base' ||
    pack.id !== row.packId ||
    pack.version !== row.packVersion ||
    identity.bytes !== row.packIdentity?.bytes ||
    identity.sha256 !== row.packIdentity?.sha256
  )
    return false;
  const source = pack.campaigns.find((campaign) => campaign.id === row.campaignId);
  if (!source) return false;
  const entry = resolvePackCampaign(pack, source.id);
  const level = entry.campaign.levels[row.levelIndex];
  return (
    campaignKey(entry.campaign) === row.campaignKey &&
    level?.id === row.levelId &&
    level?.revision === row.levelRevision
  );
}
