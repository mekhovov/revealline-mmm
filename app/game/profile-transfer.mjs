import { versionParts, compare, targetVersion, sourceFor } from './profile-channel.mjs';
import { profileWriterOwns } from './profile-writer.mjs';
import {
  BACKUP_FORMAT,
  EXTERNAL_BACKUP_FORMAT,
  isPreparedBackup,
  prepareBackup,
} from './backup.mjs';
import { emptyLibrary, importLibrary } from './library.mjs';
import { emptyPackLibrary, PACK_LIMITS } from './packs.mjs';
import { emptyExternalChapterIndex } from './external-chapter.mjs';
import { SESSION_STORAGE_BYTES } from './sessions.mjs';
import { browserDecodeImage } from './imports.mjs';
import { boundedJSON, canonicalJSON, exactKeys, plainObject, required } from './data-json.mjs';

export const TRANSFER_LIMITS = Object.freeze({
  storageKeys: 4096,
  candidates: 32,
  timeoutMs: 120000,
  maxTimeoutMs: 300000,
});
const prefix = 'revealline-mmm.library.';
const discoveryPrefixes = [prefix, 'revealline-mmm.suspended.'];
const suffix = '.v1';
const compareSources = (a, b) =>
  compare(versionParts(b.version), versionParts(a.version)) || a.id.localeCompare(b.id);
async function sha256(bytes) {
  required(
    globalThis.crypto?.subtle,
    'A secure SHA-256 implementation is required to review collection changes.',
  );
  return globalThis.crypto.subtle.digest('SHA-256', bytes);
}

/** Fingerprint normalized, validated content only: no origin, timestamp, raw
 * storage generation or property insertion order. This detects changed review
 * snapshots; it is not a signature or proof of ownership. A trusted injected
 * digest accepts Uint8Array bytes and returns exactly 32 SHA-256 bytes.
 */
export async function transferFingerprint(prepared, { digest = sha256 } = {}) {
  required(isPreparedBackup(prepared), 'Fingerprint only a prepared complete backup.');
  return fingerprintValue(prepared, digest);
}
async function fingerprintValue(value, digest) {
  required(typeof digest === 'function', 'A SHA-256 digest function is required.');
  const result = await digest(new TextEncoder().encode(canonicalJSON(value)));
  const bytes =
    result instanceof ArrayBuffer
      ? new Uint8Array(result)
      : ArrayBuffer.isView(result)
        ? new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
        : null;
  required(bytes?.byteLength === 32, 'The SHA-256 digest must contain exactly 32 bytes.');
  return `sha256-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
/** Bounded key discovery only: candidates are not verified until prepared.
 * Frozen v0.2.0 used exactly `release`; v0.2.1 onward uses the build label in
 * `release-vN.N.N` (or `release-N.N.N`). These sources share the writer/journal
 * protocol. Dev, motion-lab, old per-campaign progress and future channels are
 * deliberately excluded. A saved flight can exist before the first profile
 * write, so discover both exact namespaces. No value reads or writes.
 */
export function discoverProfileTransfers({ storage, currentVersion, editionId } = {}) {
  const current = targetVersion(currentVersion);
  required(storage && typeof storage.key === 'function', 'Storage key discovery is unavailable.');
  const length = storage.length;
  required(
    Number.isInteger(length) && length >= 0 && length <= TRANSFER_LIMITS.storageKeys,
    'Storage has too many keys to inspect safely; use a complete backup file instead.',
  );
  const sources = new Map();
  for (let index = 0; index < length; index++) {
    const key = storage.key(index);
    required(key === null || typeof key === 'string', 'Storage key discovery failed.');
    const namespace = discoveryPrefixes.find((value) => key?.startsWith(value));
    if (!namespace || !key.endsWith(suffix)) continue;
    const source = sourceFor(key.slice(namespace.length, -suffix.length), current, { editionId });
    if (!source) continue;
    sources.set(source.id, source);
    if (sources.size > TRANSFER_LIMITS.candidates) {
      const oldest = [...sources.values()].sort(compareSources).at(-1);
      sources.delete(oldest.id);
    }
  }
  return Object.freeze([...sources.values()].sort(compareSources));
}

function operation(signal, timeoutMs) {
  required(
    Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= TRANSFER_LIMITS.maxTimeoutMs,
    'Collection transfer timeout is invalid.',
  );
  const controller = new AbortController();
  const cancel = () => {
    const error = new Error('Collection transfer was cancelled; the earlier release is unchanged.');
    error.name = 'AbortError';
    controller.abort(error);
  };
  if (signal?.aborted) cancel();
  else signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => {
    const error = new Error('Collection transfer timed out; the earlier release is unchanged.');
    error.name = 'TimeoutError';
    controller.abort(error);
  }, timeoutMs);
  const check = () => {
    if (controller.signal.aborted) throw controller.signal.reason;
  };
  return {
    signal: controller.signal,
    check,
    wait(task) {
      check();
      return new Promise((resolve, reject) => {
        const stop = () => reject(controller.signal.reason);
        controller.signal.addEventListener('abort', stop, { once: true });
        Promise.resolve()
          .then(() => {
            check();
            return task();
          })
          .then(resolve, reject)
          .finally(() => controller.signal.removeEventListener('abort', stop));
      });
    },
    dispose() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    },
  };
}
function rawJSON(candidate, maxBytes, label) {
  required(candidate !== undefined, `${label} could not be read.`);
  if (typeof candidate !== 'string') return candidate;
  required(
    candidate.length <= maxBytes && new TextEncoder().encode(candidate).byteLength <= maxBytes,
    `${label} exceeds its stored byte budget; use its portable file instead.`,
  );
  try {
    return JSON.parse(candidate);
  } catch {
    throw new TypeError(
      `${label} contains invalid JSON; repair or export it from the earlier release.`,
    );
  }
}

/** Take a read-only, source-locked snapshot and validate it using the existing
 * complete-backup pipeline. The caller explicitly applies `prepared` through
 * its target commitBackup/Undo path after success. This never applies a backup.
 * Only successful null reads mean absence. A never-written profile is accepted
 * only alongside a verified saved flight; undefined, corruption, pending
 * recovery or an entirely missing source never becomes an empty replacement.
 */
export async function prepareProfileTransfer(
  sourceId,
  {
    storage,
    readAsset,
    lockManager,
    currentVersion,
    editionId,
    heldWriter,
    campaigns = [],
    resolveCampaign,
    expandCampaigns,
    resolveMediaIdentityCatalog,
    prepareExternalChapters,
    readExternalSnapshot,
    decodeImage = browserDecodeImage,
    digest = sha256,
    signal,
    onProgress,
    timeoutMs = TRANSFER_LIMITS.timeoutMs,
  } = {},
) {
  const source = sourceFor(sourceId, targetVersion(currentVersion), { editionId });
  required(source, 'Choose a recognized earlier release collection.');
  required(
    storage && typeof storage.getItem === 'function' && typeof readAsset === 'function',
    'Collection storage readers are unavailable.',
  );
  required(
    lockManager && typeof lockManager.request === 'function',
    'Safe collection transfer requires Web Locks; export a complete backup in the earlier release instead.',
  );
  required(
    readExternalSnapshot === undefined || typeof readExternalSnapshot === 'function',
    'Use a trusted external source snapshot reader.',
  );
  const op = operation(signal, timeoutMs);
  // The Web Locks API forbids combining signal with ifAvailable. Cancellation
  // instead stops our callback's reads/validation and lets its promise release
  // the held locks. No steal or queued lock request is used.
  const locked = (key, task) =>
    op.wait(() =>
      key === source.writerKey && profileWriterOwns(heldWriter, key)
        ? (async () => {
            const result = await task();
            op.check();
            required(
              profileWriterOwns(heldWriter, key),
              'The edition saving lease was released during transfer.',
            );
            return result;
          })()
        : lockManager.request(key, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
            op.check();
            required(
              lock,
              `The ${source.version} collection is busy. Close its other game tabs before copying progress.`,
            );
            return task();
          }),
    );
  try {
    return await locked(source.writerKey, () =>
      locked(source.lockKey, async () => {
        const readExternal = async () => {
          const value = boundedJSON(
            await op.wait(() => readExternalSnapshot(source, { signal: op.signal })),
            {
              maxBytes: PACK_LIMITS.libraryBytes + 1024 * 1024,
              maxString: PACK_LIMITS.libraryBytes,
              maxNodes: 900000,
              maxArray: 4096,
              maxDepth: 28,
            },
          );
          exactKeys(value, ['packs', 'index', 'backup', 'external'], 'earlier external snapshot');
          required(
            value.backup === null && value.external === null,
            'The earlier release has pending external or backup recovery.',
          );
          return value;
        };
        const external = readExternalSnapshot ? await readExternal() : null;
        required(
          storage.getItem(source.lockKey) === null,
          'The earlier release has an unfinished backup lock. Open it to recover before copying progress.',
        );
        required(
          (await op.wait(() => readAsset(source.journalKey))) === null,
          'The earlier release has a pending or unreadable recovery journal. Recover it before copying progress.',
        );
        op.check();
        const rawProfile = storage.getItem(source.profileKey);
        required(
          rawProfile === null || typeof rawProfile === 'string',
          'The earlier player library is missing or unreadable; no empty replacement was created.',
        );
        // Unlike loadLibrary, importLibrary never falls back to an empty profile.
        const library = rawProfile === null ? null : importLibrary(rawProfile, { campaigns });
        const rawPacks = external
          ? external.packs
          : await op.wait(() => readAsset(source.packsKey));
        const rawSession = storage.getItem(source.sessionKey);
        required(
          rawSession === null || typeof rawSession === 'string',
          'The earlier saved-flight slot could not be read.',
        );
        required(
          library !== null || rawSession !== null,
          'The earlier player library and saved flight are missing; no empty replacement was created.',
        );
        const packs =
          rawPacks === null
            ? emptyPackLibrary()
            : rawJSON(rawPacks, PACK_LIMITS.libraryBytes, 'Earlier expansion library');
        const session =
          rawSession === null
            ? null
            : rawJSON(rawSession, SESSION_STORAGE_BYTES, 'Earlier saved flight');
        required(
          rawSession === null || plainObject(session),
          'The earlier saved flight is corrupt; an empty replacement was not created.',
        );
        const prepared = await op.wait(() =>
          prepareBackup(
            {
              // A trusted locked snapshot proves absence. Copy explicitly replaces
              // all target packs, so retain that meaning even if the target has
              // already written an empty index. Legacy file imports stay strict.
              format: external ? EXTERNAL_BACKUP_FORMAT : BACKUP_FORMAT,
              library: library ?? emptyLibrary(),
              packs,
              session,
              ...(external
                ? { externalChapters: external.index ?? emptyExternalChapterIndex() }
                : {}),
            },
            {
              campaigns,
              resolveCampaign,
              expandCampaigns,
              resolveMediaIdentityCatalog,
              prepareExternalChapters,
              decodeImage: (...args) => op.wait(() => decodeImage(...args)),
              signal: op.signal,
              onProgress,
            },
          ),
        );
        op.check();
        required(
          library !== null || prepared.session !== null,
          'An absent player profile requires a verified saved flight; no empty replacement was created.',
        );
        if (external) {
          required(
            canonicalJSON(external) === canonicalJSON(await readExternal()) &&
              rawProfile === storage.getItem(source.profileKey) &&
              rawSession === storage.getItem(source.sessionKey),
            'The earlier release changed during transfer review.',
          );
        }
        const fingerprint = await op.wait(() =>
          external
            ? fingerprintValue(
                { prepared, sourceId: source.id, rawProfile, rawSession, assets: external },
                digest,
              )
            : transferFingerprint(prepared, { digest }),
        );
        op.check();
        const packIds = new Set(prepared.packs.packs.map((pack) => pack.id));
        const missingPackIds = Object.freeze(
          [...new Set(prepared.library.gallery.map((item) => item.sourcePackId))]
            .filter((id) => id !== null && !packIds.has(id))
            .sort(),
        );
        const preview = Object.freeze({
          version: source.version,
          campaigns: Object.keys(prepared.library.campaigns).length,
          completedLevels: Object.values(prepared.library.campaigns).reduce(
            (sum, progress) => sum + Object.keys(progress.clears).length,
            0,
          ),
          pictures: prepared.library.gallery.length,
          scores: prepared.library.scores.length,
          packs: prepared.packs.packs.length,
          hasSession: prepared.session !== null,
          ...(library === null ? { profileAbsent: true } : {}),
          missingOptional: Object.freeze({
            packs: rawPacks === null,
            session: rawSession === null,
          }),
          missingPackIds,
        });
        return Object.freeze({ source, preview, prepared, fingerprint });
      }),
    );
  } catch (error) {
    if (['AbortError', 'TimeoutError'].includes(error?.name)) throw error;
    throw new Error(`Could not copy ${source.version}: ${error.message}`);
  } finally {
    op.dispose();
  }
}
