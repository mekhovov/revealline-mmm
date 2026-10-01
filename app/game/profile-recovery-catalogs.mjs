import { externalChapterHash } from './external-chapter.mjs';
import { createExternalRecoveryCatalog } from './external-recovery-catalog.mjs';
import { recoveryChannel, targetVersion } from './profile-channel.mjs';
import { freezeProfileData } from './profile-channel-json.mjs';

// Reviewed immutable historical source, never a current-content or stored-owner fallback.
export const RECOVERY_CATALOG_PIN = Object.freeze({
  bytes: 279846,
  sha256: 'd7ee8ce41428960520907e29e7550b6f4dad8ad7a7d21686db6677f2f293e02a',
});
const sources = Object.freeze([
  ['v0.39.0', '23b886bbdbea717be79a54d9c0fffe5eded46bdf', 12],
  ['v0.40.0', '57bee98f23a6bf5882f19065f1d70473ece7a12e', 12],
  ['v0.41.0', '4d0357a14f9640b884a429475035f20731d94773', 16],
  ['v0.42.0', 'e9928cdaad2f55d912aadd2ef25f635fb99e938c', 16],
]);
const check = (signal) => signal?.throwIfAborted();
function wait(signal, begin, discard = () => {}) {
  check(signal);
  return new Promise((resolve, reject) => {
    const stop = () => reject(signal.reason);
    signal?.addEventListener('abort', stop, { once: true });
    Promise.resolve()
      .then(() => {
        check(signal);
        return begin();
      })
      .then((value) => {
        if (signal?.aborted) {
          discard(value);
          return;
        }
        resolve(value);
      }, reject)
      .finally(() => signal?.removeEventListener('abort', stop));
  });
}

export async function parseRecoveryCatalogs(raw, currentVersion, { signal } = {}) {
  targetVersion(currentVersion);
  if (!(raw instanceof Uint8Array) || raw.byteLength !== RECOVERY_CATALOG_PIN.bytes)
    throw new Error('The packaged historical catalog differs from its reviewed identity.');
  // Hash and parse one private byte snapshot across the asynchronous digest boundary.
  const owned = new Uint8Array(raw);
  if ((await wait(signal, () => externalChapterHash(owned))) !== RECOVERY_CATALOG_PIN.sha256)
    throw new Error('The packaged historical catalog differs from its reviewed identity.');
  check(signal);
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(owned));
  if (data.format !== 'revealline-recovery-catalogs.v1' || data.catalogs.length !== sources.length)
    throw new Error('Unsupported historical catalog registry.');
  const result = [];
  for (const [index, catalog] of data.catalogs.entries()) {
    const [version, sourceCommit, count] = sources[index];
    const channels = [`release-${version}`, `release-${version.slice(1)}`];
    if (
      catalog.version !== version ||
      catalog.sourceCommit !== sourceCommit ||
      JSON.stringify(catalog.channels) !== JSON.stringify(channels) ||
      catalog.registeredEntries.length !== 1 ||
      catalog.knownDescriptors.length !== count
    )
      throw new Error('Historical catalog source or exact channel binding differs.');
    createExternalRecoveryCatalog(catalog);
    for (const channelId of channels) {
      const channel = recoveryChannel(channelId, currentVersion);
      if (channel.support === 'protected-unknown') continue;
      result.push({
        channelId,
        registeredEntries: catalog.registeredEntries,
        knownDescriptors: catalog.knownDescriptors,
      });
    }
  }
  return freezeProfileData(result);
}

/** One fixed packaged URL; never fetched from a selected channel, query or storage value. */
export async function loadProfileRecoveryCatalogs(
  currentVersion,
  { fetch: request = globalThis.fetch, signal } = {},
) {
  const response = await wait(
    signal,
    () =>
      request(new URL('./content/recovery-catalogs.json', import.meta.url), {
        signal,
        redirect: 'error',
        cache: 'no-store',
      }),
    (late) => {
      void late.body?.cancel().catch(() => {});
    },
  );
  if (response.status !== 200 || response.redirected || !response.body) {
    void response.body?.cancel().catch(() => {});
    throw new Error('The packaged historical catalog is unavailable.');
  }
  const reader = response.body.getReader(),
    chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await wait(signal, () => reader.read());
      if (done) break;
      size += value.byteLength;
      if (size > RECOVERY_CATALOG_PIN.bytes)
        throw new Error('Historical catalog exceeds its exact byte bound.');
      chunks.push(value);
    }
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const raw = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    raw.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return parseRecoveryCatalogs(raw, currentVersion, { signal });
}
