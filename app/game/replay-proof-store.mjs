import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import { freezeDesign } from './content-design/catalogs.mjs';

const MEMORY_BYTES = 32 * 1024 * 1024;
const STORAGE_BYTES = 2 * 1024 * 1024;
const TOTAL_TICKS = 216000;
const limits = { maxBytes: MEMORY_BYTES, maxNodes: 3000000, maxArray: 216000, maxDepth: 40 };
const copy = (value) => boundedJSON(value, limits);
async function proofIdentity(value) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalJSON(value)),
  );
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Bounded replay-backed evidence lifecycle shared by optional learning and
 * mastery. A trusted codec owns domain verification; this authority owns proof
 * hashes, imports, historical recovery and session/durable adoption. It never
 * writes Journey clears or awards gameplay progression.
 */
export function createReplayProofStore({ editionId, storage, codec, maxRecords }) {
  const {
    label,
    format,
    storeFormat,
    recoveryFormat,
    keyPrefix,
    evidenceKey,
    durableEvidenceKey,
    payloadKeys,
    recordKey,
    loadedRecord,
    rewardRow,
    inspect,
    verify: verifyPayload,
  } = codec;
  required(stableId(editionId), `Invalid ${label} proof edition.`);
  required(
    Number.isSafeInteger(maxRecords) && maxRecords >= 0 && maxRecords <= 4096,
    'Invalid replay proof capacity.',
  );
  const key = `${keyPrefix}.${editionId}.v1`;
  const recoveryKey = `${key}.recovery`;
  const trusted = new WeakSet();
  const trustedRecovery = new WeakSet();
  let records = new Map(),
    durableRecords = new Map();
  const listeners = new Set();
  let rewardSnapshot = freezeDesign({ revision: 0, [evidenceKey]: [], [durableEvidenceKey]: [] });
  const rewardRows = (entries) => [...entries.values()].map(rewardRow);
  const publishRewardEvidence = () => {
    const learning = rewardRows(records),
      durableLearning = rewardRows(durableRecords);
    if (
      canonicalJSON([learning, durableLearning]) ===
      canonicalJSON([rewardSnapshot[evidenceKey], rewardSnapshot[durableEvidenceKey]])
    )
      return;
    rewardSnapshot = freezeDesign({
      revision: rewardSnapshot.revision + 1,
      [evidenceKey]: learning,
      [durableEvidenceKey]: durableLearning,
    });
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        /* A presentation observer cannot own proof adoption. */
      }
    }
  };
  let recoverySources = new Set(),
    recoveryBlocked = false;
  const recoveryEnvelope = () => ({
    format: recoveryFormat,
    editionId,
    sources: [...recoverySources],
  });
  const recoveryLimits = {
    maxBytes: 8 * 1024 * 1024,
    maxString: 8 * 1024 * 1024,
    maxNodes: 256,
    maxArray: 32,
  };
  const mergeRecovery = (sources) => {
    const merged = new Set([...recoverySources, ...sources]);
    boundedJSON({ format: recoveryFormat, editionId, sources: [...merged] }, recoveryLimits);
    return merged;
  };
  const inspectRecovery = (input) => {
    const source = boundedJSON(input, recoveryLimits);
    exactKeys(source, ['format', 'editionId', 'sources'], `${label} proof recovery`);
    required(
      source.format === recoveryFormat &&
        source.editionId === editionId &&
        Array.isArray(source.sources) &&
        source.sources.length <= 32 &&
        source.sources.every((entry) => typeof entry === 'string'),
      `Invalid ${label} proof recovery.`,
    );
    // Backup admission must include the retained local journal, before the host
    // adopts any profile changes. Never silently discard the last imported row.
    mergeRecovery(source.sources);
    const checked = freezeDesign(source);
    trustedRecovery.add(checked);
    return checked;
  };
  const preserve = (raw) => {
    if (typeof raw !== 'string' || recoverySources.has(raw)) return;
    try {
      const sources = [...recoverySources, raw];
      inspectRecovery({ format: recoveryFormat, editionId, sources });
      recoverySources = new Set(sources);
    } catch {
      // Keep the original storage key untouched when recovery exceeds its budget.
      recoveryBlocked = true;
    }
  };
  const envelope = (entries) => ({ format: storeFormat, editionId, proofs: [...entries] });
  const checkCollection = (source) => {
    const entries = copy(source);
    required(Array.isArray(entries) && entries.length <= maxRecords, `Too many ${label} proofs.`);
    const ids = new Set();
    let ticks = 0;
    for (const entry of entries) {
      required(!ids.has(recordKey(entry)), `Duplicate ${label} proof mission.`);
      ids.add(recordKey(entry));
      required(
        Number.isSafeInteger(entry?.replay?.ticks) && entry.replay.ticks >= 0,
        `Invalid ${label} proof ticks.`,
      );
      ticks += entry.replay.ticks;
      required(
        ticks <= TOTAL_TICKS,
        `${label[0].toUpperCase() + label.slice(1)} proof history exceeds its replay budget.`,
      );
    }
    return entries;
  };
  const verify = async (input, { signal } = {}) => {
    const source = copy(input);
    exactKeys(source, ['format', 'editionId', 'proofId', ...payloadKeys], `${label} proof`);
    required(
      source.format === format && source.editionId === editionId,
      `Wrong ${label} proof edition.`,
    );
    required(
      typeof source.proofId === 'string' && /^[a-f0-9]{64}$/.test(source.proofId),
      `Invalid ${label} proof identity.`,
    );
    inspect(source);
    const body = {
      format: source.format,
      editionId,
      ...Object.fromEntries(payloadKeys.map((key) => [key, source[key]])),
    };
    required(
      source.proofId === (await proofIdentity(body)),
      `${label[0].toUpperCase() + label.slice(1)} proof identity does not match its bytes.`,
    );
    await verifyPayload(source, { signal });
    if (signal?.aborted) {
      const error = new Error('Replay proof verification cancelled.');
      error.name = 'AbortError';
      throw error;
    }
    const checked = freezeDesign(source);
    trusted.add(checked);
    return checked;
  };
  const persist = () => {
    try {
      if (!storage?.setItem) return false;
      if (recoveryBlocked) return false;
      if (recoverySources.size) storage.setItem(recoveryKey, JSON.stringify(recoveryEnvelope()));
      const serialized = JSON.stringify(envelope(records.values()));
      boundedJSON(serialized, { ...limits, maxBytes: STORAGE_BYTES });
      storage.setItem(key, serialized);
      durableRecords = new Map(records);
      return true;
    } catch {
      return false;
    } finally {
      publishRewardEvidence();
    }
  };
  const importVerified = (entries) => {
    required(
      Array.isArray(entries) && entries.every((entry) => trusted.has(entry)),
      `Only replay-verified ${label} proofs may be stored.`,
    );
    const next = new Map(records);
    for (const entry of entries) next.set(recordKey(entry), entry);
    checkCollection([...next.values()]);
    records = next;
    return persist();
  };
  return Object.freeze({
    key,
    recoveryKey,
    rewardEvidence: () => rewardSnapshot,
    onRewardEvidenceChange(listener) {
      required(
        typeof listener === 'function',
        `${label[0].toUpperCase() + label.slice(1)} evidence observer must be a function.`,
      );
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load: (id) => (records.has(id) ? loadedRecord(records.get(id)) : null),
    exportProofs: () => [...records.values()],
    exportRecovery: () => recoveryEnvelope(),
    inspectRecovery,
    importRecovery(source) {
      required(trustedRecovery.has(source), 'Recovery must be bounded before import.');
      recoverySources = mergeRecovery(source.sources);
      return persist();
    },
    async hydrate({ signal } = {}) {
      let entries, raw;
      const read = (name) => {
        try {
          return storage?.getItem(name);
        } catch (error) {
          // An unavailable read cannot authorize replacement of unseen history.
          recoveryBlocked = true;
          throw error;
        }
      };
      try {
        const recovered = read(recoveryKey);
        if (recovered) {
          try {
            recoverySources = new Set(inspectRecovery(recovered).sources);
          } catch {
            preserve(recovered);
          }
        }
        raw = read(key);
        if (!raw) return { verified: 0, rejected: 0 };
        const data = boundedJSON(raw, { ...limits, maxBytes: STORAGE_BYTES });
        exactKeys(data, ['format', 'editionId', 'proofs'], `${label} proof storage`);
        required(
          data.format === storeFormat && data.editionId === editionId,
          `Wrong ${label} proof store edition.`,
        );
        entries = checkCollection(data.proofs);
      } catch (error) {
        preserve(raw);
        return { verified: 0, rejected: 1, error: error.message };
      }
      let rejected = 0;
      const next = new Map();
      for (const source of entries) {
        try {
          const entry = await verify(source, { signal });
          next.set(recordKey(entry), entry);
        } catch (error) {
          if (signal?.aborted) throw error;
          rejected++;
        }
      }
      records = next;
      durableRecords = new Map(next);
      publishRewardEvidence();
      if (rejected) preserve(raw);
      return { verified: next.size, rejected };
    },
    async prove(payload, { signal } = {}) {
      const body = copy({
        format,
        editionId,
        ...Object.fromEntries(payloadKeys.map((key) => [key, payload[key]])),
      });
      return verify({ ...body, proofId: await proofIdentity(body) }, { signal });
    },
    async inspectProofs(input, { signal } = {}) {
      const entries = checkCollection(input),
        checked = [];
      for (const entry of entries) checked.push(await verify(entry, { signal }));
      const merged = new Map(records);
      checked.forEach((entry) => merged.set(recordKey(entry), entry));
      // Admission checks the merged history before the host changes its profile.
      checkCollection([...merged.values()]);
      return checked;
    },
    saveVerified: (entry) => importVerified([entry]),
    importVerified,
  });
}
