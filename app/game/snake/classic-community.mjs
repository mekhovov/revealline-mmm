import { boundedJSON, canonicalJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import { createProfileRecordBackend } from '../profile-storage.mjs';
import { creatorSHA256 } from '../creator/bytes.mjs';
import { validateClassicSnakeLevel } from './classic-core.mjs';

export const CLASSIC_PACKAGE_FORMAT = 'revealline-classic-package.v1';
const LIBRARY_FORMAT = 'revealline-classic-library.v1';
export const CLASSIC_PACKAGE_MAX_BYTES = 1536 * 1024;
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
function localized(source, label, maximum) {
  exactKeys(source, ['en', 'uk'], label);
  for (const language of ['en', 'uk'])
    required(
      typeof source[language] === 'string' &&
        source[language].trim().length > 0 &&
        source[language].length <= maximum,
      `${label} needs bounded EN/UK text.`,
    );
  return source;
}
/** Data-only portable content. No script, asset URL or self-attested clear is admitted. */
export function validateClassicSnakePackage(source) {
  const pack = boundedJSON(source, {
    maxBytes: CLASSIC_PACKAGE_MAX_BYTES,
    maxNodes: 160000,
    maxArray: 1536,
    maxDepth: 12,
  });
  exactKeys(pack, ['format', 'title', 'entries'], 'Classic Snake package');
  required(pack.format === CLASSIC_PACKAGE_FORMAT, 'Unsupported Classic Snake package.');
  localized(pack.title, 'Package title', 120);
  required(
    Array.isArray(pack.entries) && pack.entries.length >= 1 && pack.entries.length <= 12,
    'A Classic Snake package contains one to twelve authored missions.',
  );
  const ids = new Set();
  for (const entry of pack.entries) {
    exactKeys(entry, ['title', 'description', 'level'], 'Classic package mission');
    localized(entry.title, 'Mission title', 120);
    localized(entry.description, 'Mission brief', 1200);
    entry.level = validateClassicSnakeLevel(entry.level);
    required(!ids.has(entry.level.id), 'Package mission source IDs must be distinct.');
    ids.add(entry.level.id);
  }
  return freeze(pack);
}
/** Identity is a content address, not an author signature or publication approval. */
export function classicSnakePackageIdentity(source) {
  return dataIdentity(validateClassicSnakePackage(source));
}
export function classicSnakePackageEntries(source) {
  const pack = validateClassicSnakePackage(source),
    identity = dataIdentity(pack);
  return freeze(
    pack.entries.map((entry, index) => {
      const id = `custom-snake-${identity}-${index + 1}`;
      const level = { ...structuredClone(entry.level), id, revision: `community:${identity}` };
      return {
        id,
        chapterId: `custom-snake-${identity}`,
        title: entry.title,
        description: entry.description,
        level: validateClassicSnakeLevel(level),
        communityIdentity: identity,
      };
    }),
  );
}
export async function importClassicSnakePackage(blob) {
  required(
    blob &&
      Number.isSafeInteger(blob.size) &&
      blob.size > 0 &&
      blob.size <= CLASSIC_PACKAGE_MAX_BYTES &&
      typeof blob.text === 'function',
    'Choose a bounded Classic Snake package file.',
  );
  return validateClassicSnakePackage(await blob.text());
}
export function exportClassicSnakePackage(source) {
  return new Blob([canonicalJSON(validateClassicSnakePackage(source))], {
    type: 'application/json',
  });
}
const emptyLegacy = () => ({ format: LIBRARY_FORMAT, packages: {} });
function validateLegacyLibrary(source) {
  const value = boundedJSON(source, {
    maxBytes: 24 * 1024 * 1024,
    maxNodes: 2400000,
    maxArray: 1536,
    maxDepth: 16,
  });
  exactKeys(value, ['format', 'packages'], 'Classic community library');
  required(value.format === LIBRARY_FORMAT, 'Invalid historical Classic library.');
  validatePackages(value.packages);
  return value;
}
const RECEIPT_FORMAT = 'community-classic-installed.v1';
function validateReceipts(editions) {
  required(
    editions &&
      typeof editions === 'object' &&
      !Array.isArray(editions) &&
      Object.keys(editions).length <= 16,
    'Invalid Classic installed receipts.',
  );
  for (const [hash, receipt] of Object.entries(editions)) {
    exactKeys(receipt, ['runtimeIdentity', 'title', 'count', 'text'], 'Classic installed receipt');
    required(
      /^[a-f0-9]{64}$/.test(hash) &&
        /^[a-f0-9]{16}$/.test(receipt.runtimeIdentity) &&
        typeof receipt.title === 'string' &&
        receipt.title.length <= 120 &&
        Number.isInteger(receipt.count) &&
        receipt.count >= 1 &&
        receipt.count <= 12 &&
        (receipt.text === null || typeof receipt.text === 'string'),
      'Invalid Classic package receipt.',
    );
    if (receipt.text !== null)
      required(
        classicSnakePackageIdentity(validateClassicSnakePackage(receipt.text)) ===
          receipt.runtimeIdentity,
        'Classic installed recipe changed.',
      );
  }
}
function validatePackages(packages) {
  required(
    packages &&
      typeof packages === 'object' &&
      !Array.isArray(packages) &&
      Object.keys(packages).length <= 16,
    'Classic community library is full or invalid.',
  );
  for (const [identity, sourcePack] of Object.entries(packages)) {
    const pack = validateClassicSnakePackage(sourcePack);
    required(identity === dataIdentity(pack), 'Stored Classic package content changed.');
    packages[identity] = pack;
  }
}
const OWNED_FORMAT = 'revealline-classic-library.v2';
const emptyOwned = () => ({
  format: OWNED_FORMAT,
  migrated: false,
  generation: 0,
  packages: {},
  localOwners: {},
  editions: {},
});
function validateOwned(source) {
  const value = boundedJSON(source, {
    maxBytes: 50 * 1024 * 1024,
    maxNodes: 2500000,
    maxArray: 1536,
    maxDepth: 16,
    maxString: CLASSIC_PACKAGE_MAX_BYTES,
  });
  exactKeys(
    value,
    ['format', 'migrated', 'generation', 'packages', 'localOwners', 'editions'],
    'Classic owned library',
  );
  required(
    value.format === OWNED_FORMAT &&
      typeof value.migrated === 'boolean' &&
      Number.isSafeInteger(value.generation) &&
      value.generation >= 0,
    'Invalid Classic ownership record.',
  );
  validatePackages(value.packages);
  validateReceipts(value.editions);
  required(
    value.localOwners && typeof value.localOwners === 'object' && !Array.isArray(value.localOwners),
    'Invalid Classic local owners.',
  );
  for (const [identity, owner] of Object.entries(value.localOwners))
    required(
      Object.hasOwn(value.packages, identity) && ['studio', 'legacy'].includes(owner),
      'Invalid Classic local owner.',
    );
  for (const receipt of Object.values(value.editions))
    required(
      receipt.text === null || Object.hasOwn(value.packages, receipt.runtimeIdentity),
      'Classic receipt has no installed recipe.',
    );
  for (const identity of Object.keys(value.packages))
    required(
      value.localOwners[identity] ||
        Object.values(value.editions).some(
          (receipt) => receipt.runtimeIdentity === identity && receipt.text !== null,
        ),
      'Classic recipe has no owner.',
    );
  return value;
}
const requireIdentity = (identity) =>
  required(
    typeof identity === 'string' && /^[a-f0-9]{16}$/.test(identity),
    'Invalid Classic package identity.',
  );
function collectUnowned(state, identity) {
  if (
    !state.localOwners[identity] &&
    !Object.values(state.editions).some(
      (receipt) => receipt.runtimeIdentity === identity && receipt.text !== null,
    )
  )
    delete state.packages[identity];
}
function putPackage(state, pack, identity) {
  const old = state.packages[identity];
  required(
    !old || canonicalJSON(old) === canonicalJSON(pack),
    'A different package already owns this content address. Export both before proceeding.',
  );
  state.packages[identity] = pack;
}
/** Native recipes, exact Community receipts and local Studio ownership commit in
 * one existing profile transaction. Progress remains in its unchanged namespace. */
export function createClassicSnakeCommunityLibrary({ indexedDB = globalThis.indexedDB } = {}) {
  const backend = createProfileRecordBackend({
    key: OWNED_FORMAT,
    empty: emptyOwned,
    validate: validateOwned,
    indexedDB,
    operationTimeoutMs: 5000,
  });
  const migrationOwners = new Set();
  let opening = null,
    closed = false;
  const ready = () => {
    required(!closed, 'Classic library is closed.');
    if (!opening)
      opening = (async () => {
        const current = await backend.read();
        // A primary read may finish while its page is entering history. Never
        // open migration connections on behalf of that retired page afterward.
        required(!closed, 'Classic library is closed.');
        if (current.migrated) return;
        const historical = createProfileRecordBackend({
          key: LIBRARY_FORMAT,
          empty: emptyLegacy,
          validate: validateLegacyLibrary,
          indexedDB,
          operationTimeoutMs: 5000,
        });
        const receipts = createProfileRecordBackend({
          key: RECEIPT_FORMAT,
          empty: () => ({ format: RECEIPT_FORMAT, editions: {} }),
          validate: (source) => {
            const value = boundedJSON(source, {
              maxBytes: 26 * 1024 * 1024,
              maxNodes: 180000,
              maxDepth: 8,
              maxString: CLASSIC_PACKAGE_MAX_BYTES,
            });
            exactKeys(value, ['format', 'editions'], 'Historical Classic receipts');
            required(value.format === RECEIPT_FORMAT, 'Invalid historical Classic receipts.');
            validateReceipts(value.editions);
            return value;
          },
          indexedDB,
          operationTimeoutMs: 5000,
        });
        migrationOwners.add(historical);
        migrationOwners.add(receipts);
        try {
          const legacy = await historical.read(),
            oldReceipts = await receipts.read();
          for (const [hash, receipt] of Object.entries(oldReceipts.editions))
            if (receipt.text !== null)
              required(
                (await creatorSHA256(new TextEncoder().encode(receipt.text))) === hash,
                'Historical Classic package bytes changed. Export recovery data before migrating.',
              );
          await backend.update((state) => {
            if (state.migrated) return state;
            // Historical storage did not record whether Studio owned a package.
            // Preserve that possible local owner instead of silently deleting it.
            for (const [identity, pack] of Object.entries(legacy.packages)) {
              putPackage(state, pack, identity);
              state.localOwners[identity] = 'legacy';
            }
            for (const [hash, receipt] of Object.entries(oldReceipts.editions)) {
              if (receipt.text !== null)
                putPackage(
                  state,
                  validateClassicSnakePackage(receipt.text),
                  receipt.runtimeIdentity,
                );
              state.editions[hash] = receipt;
            }
            state.migrated = true;
            state.generation++;
            return state;
          });
          // Leave both old records intact for recovery; never rewrite old progress.
        } finally {
          historical.close();
          receipts.close();
          migrationOwners.delete(historical);
          migrationOwners.delete(receipts);
        }
      })().catch((error) => {
        opening = null;
        throw error;
      });
    return opening;
  };
  const read = async () => {
    await ready();
    return backend.read();
  };
  const update = async (mutate) => {
    await ready();
    return backend.update((state) => {
      mutate(state);
      state.generation++;
      return state;
    });
  };
  const load = async (identity) => {
    requireIdentity(identity);
    const state = await read(),
      pack = state.packages[identity];
    required(pack, 'This Classic package is not installed. Import it in Snake Studio first.');
    return { identity, pack, entries: classicSnakePackageEntries(pack) };
  };
  return Object.freeze({
    async install(source, { owner = 'studio' } = {}) {
      required(owner === 'studio', 'Classic local content needs a Studio owner.');
      const pack = validateClassicSnakePackage(source),
        identity = dataIdentity(pack);
      await update((state) => {
        putPackage(state, pack, identity);
        state.localOwners[identity] = owner;
      });
      return { identity, pack, entries: classicSnakePackageEntries(pack) };
    },
    load,
    async list() {
      const state = await read();
      return Object.entries(state.packages).map(([identity, pack]) => ({
        identity,
        title: pack.title,
        count: pack.entries.length,
        localOwner: state.localOwners[identity] ?? null,
      }));
    },
    async remove(identity) {
      requireIdentity(identity);
      return update((state) => {
        delete state.localOwners[identity];
        collectUnowned(state, identity);
      });
    },
    async installEdition(inspected) {
      required(
        inspected.family === 'classic',
        'Classic installation needs its native package validator.',
      );
      const { editionId, runtimeIdentity, text } = inspected;
      const pack = validateClassicSnakePackage(text);
      required(
        (await creatorSHA256(new TextEncoder().encode(text))) === editionId &&
          dataIdentity(pack) === runtimeIdentity &&
          canonicalJSON(pack) === canonicalJSON(inspected.pack),
        'Classic package bytes changed before installation.',
      );
      await update((state) => {
        const old = state.editions[editionId];
        required(
          !old || old.runtimeIdentity === runtimeIdentity,
          'An installed edition cannot replace its accepted recipe.',
        );
        putPackage(state, pack, runtimeIdentity);
        state.editions[editionId] = {
          runtimeIdentity,
          title: pack.title.en,
          count: pack.entries.length,
          text,
        };
      });
      return { missions: pack.entries.length, assets: 0, family: 'classic' };
    },
    async editionStorage(hash) {
      const state = await read(),
        receipt = state.editions[hash];
      if (!receipt) return null;
      const installed = receipt.text !== null;
      return {
        installed,
        offloaded: !installed,
        manifestRetained: true,
        localCopyRetained: !!state.localOwners[receipt.runtimeIdentity],
        runtimeIdentity: receipt.runtimeIdentity,
        playHref: installed
          ? `../snake/play.html?community=${receipt.runtimeIdentity}&mode=solo`
          : null,
      };
    },
    async editions() {
      const state = await read();
      return Object.entries(state.editions)
        .filter(([, receipt]) => receipt.text !== null)
        .map(([hash]) => hash);
    },
    async exportEdition(hash) {
      const state = await read(),
        receipt = state.editions[hash];
      required(
        typeof receipt?.text === 'string',
        'Classic exact installed bytes are unavailable. Keep the recovery download.',
      );
      const blob = new Blob([receipt.text], { type: 'application/json' });
      required(
        (await creatorSHA256(await blob.arrayBuffer())) === hash,
        'Classic installed bytes do not match their immutable package.',
      );
      return blob;
    },
    async reviewEditionOffload(hash) {
      const state = await read(),
        receipt = state.editions[hash];
      required(typeof receipt?.text === 'string', 'Classic edition is not installed.');
      return {
        generation: state.generation,
        detachableBytes: new TextEncoder().encode(receipt.text).length,
        detachedAssets: 0,
        family: 'classic',
        editionId: hash,
        runtimeIdentity: receipt.runtimeIdentity,
        localCopyRetained: !!state.localOwners[receipt.runtimeIdentity],
      };
    },
    async offloadEdition(review) {
      await update((state) => {
        const receipt = state.editions[review.editionId];
        required(
          state.generation === review.generation &&
            typeof receipt?.text === 'string' &&
            receipt.runtimeIdentity === review.runtimeIdentity,
          'Classic edition changed before offload.',
        );
        receipt.text = null;
        collectUnowned(state, receipt.runtimeIdentity);
      });
    },
    close() {
      if (closed) return;
      closed = true;
      backend.close();
      for (const owner of migrationOwners) owner.close();
      migrationOwners.clear();
    },
  });
}
