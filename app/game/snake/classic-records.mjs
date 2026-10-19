import { boundedJSON, canonicalJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import { CLASSIC_SNAKE_OFFICIAL_RECORDS_KEY } from './classic-campaign.mjs';
import { createProfileRecordBackend } from '../profile-storage.mjs';
import {
  exportClassicSnakeReplay,
  validateClassicSnakeLevel,
  classicSnakeUsesVariableHazards,
} from './classic-core.mjs';
import { restoreClassicSnakeMatch } from './classic-match.mjs';
import { CLASSIC_SNAKE_LEVELS } from './classic-catalogue.mjs';
import { classicSnakeRecipeEntries } from './classic-catalogue-archive.mjs';
import {
  validateClassicSnakePackage,
  classicSnakePackageEntries,
  classicSnakePackageIdentity,
} from './classic-community.mjs';
import { CLASSIC_PACES, prepareClassicSnakeLevel } from './classic-setup.mjs';
import { classicSnakeRatingForRecord } from './classic-ratings.mjs';

// Distinct from the earlier unreleased, metric-only candidate. Its bytes are kept.
const FORMAT = 'classic-snake-progress.proof.v2';
const PROFILE_BYTES = 24 * 1024 * 1024;
const PROFILE_ROWS = 2048;
const ROW_PROOFS = 6;
class ColdSnakeProof extends Error {}
const empty = () => ({ format: FORMAT, rows: {}, lastPlayed: null });
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
const policies = ['mission', 'endless', 'score', 'survival'];
export const classicRecordKey = (run, mode, policy = 'mission') =>
  `${mode}/${policy}/${run.levelIdentity}/${run.seed}`;
const completionOnly = (row) => {
  const witness = Object.values(row.proofs ?? {})[0];
  return classicSnakeUsesVariableHazards(witness?.match?.replays?.[witness.board]?.level);
};

/** Match only definitions that the public setup can actually prepare. This is
 * cached per catalogue entry, not inferred from an imported level's own ID. */
function ownedRecipe(level, catalogue, recipes, allowArchive) {
  const entry = catalogue.get(level?.id);
  required(entry, 'Snake records require a catalogue mission.');
  if (!recipes.has(entry.id)) {
    const variants = new Map();
    for (const candidate of classicSnakeRecipeEntries(entry, { allowArchive }))
      for (const pace of Object.keys(CLASSIC_PACES))
        for (const format of ['campaign', 'endless'])
          for (const targetRules of ['authored', 'moving', 'varied'])
            for (const preset of ['classic', 'pursuit', 'tactical', 'arcade']) {
              try {
                const prepared = validateClassicSnakeLevel(
                  prepareClassicSnakeLevel(candidate, { pace, format, targetRules, preset }),
                );
                variants.set(canonicalJSON(prepared), prepared);
              } catch {
                // A preset not admitted for this geometry cannot own a record.
              }
            }
    recipes.set(entry.id, variants);
  }
  const accepted = recipes.get(entry.id).get(canonicalJSON(validateClassicSnakeLevel(level)));
  required(accepted, 'Snake record recipe differs from its catalogue definition.');
  return { entry, level: accepted };
}

/** Only exact match proofs can own progress. Cache bounded serialized witnesses
 * to avoid replaying the same stored rounds inside every database transaction. */
function proofVerifier(catalogue, recipes, allowArchive) {
  const cache = new Map();
  // Canonical JSON has no more UTF-16 code units than UTF-8 bytes. A valid
  // 24 MiB profile therefore fits in 24 Mi code units (at most 48 MiB in JS).
  // Allow one largest admitted 6 MiB match plus metadata while merging it.
  const characterLimit = PROFILE_BYTES + 8 * 1024 * 1024;
  const entryLimit = PROFILE_ROWS * ROW_PROOFS + ROW_PROOFS;
  let characters = 0,
    verified = 0,
    hits = 0;
  const remove = (encoded) => {
    characters -= encoded.length;
    cache.delete(encoded);
  };
  const verify = (witness, { cachedOnly = false } = {}) => {
    exactKeys(witness, ['match', 'board'], 'Snake record proof');
    required(
      Number.isInteger(witness.board) && witness.board >= 0 && witness.board <= 1,
      'Invalid Snake proof board.',
    );
    const encoded = canonicalJSON(witness);
    if (cache.has(encoded)) {
      const summary = cache.get(encoded);
      cache.delete(encoded);
      cache.set(encoded, summary);
      hits++;
      return summary;
    }
    if (cachedOnly) throw new ColdSnakeProof('Snake progress needs replay verification.');
    const { entry, level } = ownedRecipe(
      witness.match?.replays?.[witness.board]?.level,
      catalogue,
      recipes,
      allowArchive,
    );
    const accepted = restoreClassicSnakeMatch(witness.match, { level });
    const run = accepted.runs[witness.board];
    required(run, 'Snake proof board is absent.');
    const { mode, policy, seed } = accepted.options;
    const clear = policy === 'mission' && run.status === 'won';
    const summary = {
      key: classicRecordKey(run, mode, policy),
      levelId: entry.id,
      chapterId: entry.chapterId,
      mode,
      policy,
      seed,
      levelIdentity: run.levelIdentity,
      score: run.score,
      catches: run.catches,
      elapsedMs: run.elapsedMs,
      tick: run.tick,
      clear,
      teamwork: clear && mode === 'team' && run.snakes.every((snake) => snake.catches >= 2),
      noSupplies:
        clear &&
        !level.operation &&
        [
          'classic-snake-level.v2',
          'classic-snake-level.v3',
          'classic-snake-level.v4',
          'classic-snake-level.v6',
        ].includes(level.version) &&
        level.pickups.length > 0 &&
        run.pickupsUsed === 0,
      identity: dataIdentity(witness),
    };
    verified++;
    // Full canonical text is the cache identity; the short noncryptographic
    // proof ID is checked only after that exact text has been verified.
    while (cache.size >= entryLimit || characters + encoded.length > characterLimit)
      remove(cache.keys().next().value);
    cache.set(encoded, summary);
    characters += encoded.length;
    return summary;
  };
  return {
    verify,
    prune(...snapshots) {
      const used = new Set();
      for (const snapshot of snapshots)
        for (const row of Object.values(snapshot.rows))
          for (const witness of Object.values(row.proofs)) used.add(canonicalJSON(witness));
      for (const encoded of cache.keys()) if (!used.has(encoded)) remove(encoded);
    },
    diagnostics: () => ({
      verified,
      hits,
      cachedProofs: cache.size,
      cachedCharacters: characters,
      characterLimit,
    }),
  };
}

function validator(verifier, catalogue) {
  return (source, { cachedOnly = false } = {}) => {
    const value = boundedJSON(source, {
      maxBytes: PROFILE_BYTES,
      maxNodes: 1200000,
      maxArray: 32768,
      maxDepth: 18,
    });
    exactKeys(value, ['format', 'rows', 'lastPlayed'], 'Snake progress');
    required(
      value.format === FORMAT &&
        value.rows &&
        typeof value.rows === 'object' &&
        !Array.isArray(value.rows),
      'Unsupported Snake progress.',
    );
    required(
      Object.keys(value.rows).length <= PROFILE_ROWS,
      'Snake progress capacity reached. Export your replay.',
    );
    for (const [key, row] of Object.entries(value.rows)) {
      exactKeys(
        row,
        [
          'levelId',
          'chapterId',
          'mode',
          'policy',
          'levelIdentity',
          'seed',
          'proofs',
          'score',
          'catches',
          'clear',
          'fastest',
          'fewest',
          'scoreProof',
          'catchesProof',
          'teamwork',
          'noSupplies',
          'teamworkProof',
          'noSuppliesProof',
        ],
        'Snake record',
      );
      required(
        catalogue.get(row.levelId)?.chapterId === row.chapterId &&
          ['solo', 'versus', 'team'].includes(row.mode) &&
          policies.includes(row.policy) &&
          integer(row.seed) &&
          row.seed <= 0xffffffff &&
          typeof row.levelIdentity === 'string' &&
          key === classicRecordKey(row, row.mode, row.policy),
        'Invalid Snake record identity.',
      );
      required(
        [row.score, row.catches].every(integer) &&
          typeof row.clear === 'boolean' &&
          typeof row.teamwork === 'boolean' &&
          typeof row.noSupplies === 'boolean',
        'Invalid Snake record metrics.',
      );
      required(
        row.proofs &&
          typeof row.proofs === 'object' &&
          !Array.isArray(row.proofs) &&
          Object.keys(row.proofs).length >= 1 &&
          Object.keys(row.proofs).length <= ROW_PROOFS,
        'Invalid Snake proof budget.',
      );
      const proofs = new Map();
      for (const [id, witness] of Object.entries(row.proofs)) {
        let proof;
        try {
          proof = verifier.verify(witness, { cachedOnly });
        } catch (error) {
          if (error instanceof ColdSnakeProof) error.snapshot = value;
          throw error;
        }
        required(id === proof.identity, 'Snake proof identity differs.');
        required(
          proof.key === key && proof.levelId === row.levelId && proof.chapterId === row.chapterId,
          'Snake proof belongs to a different record.',
        );
        proofs.set(id, proof);
      }
      required(
        proofs.get(row.scoreProof)?.score === row.score &&
          proofs.get(row.catchesProof)?.catches === row.catches,
        'Snake score has no exact witness.',
      );
      for (const [field, metric] of [
        ['fastest', 'elapsedMs'],
        ['fewest', 'tick'],
      ]) {
        const record = row[field];
        if (record === null) continue;
        exactKeys(record, ['value', 'proof'], 'Snake mastery metric');
        const proof = proofs.get(record.proof);
        required(
          proof?.clear && integer(record.value) && proof[metric] === record.value,
          'Snake mastery has no completed witness.',
        );
      }
      required(
        (row.fastest === null) === (row.fewest === null) &&
          row.clear === (row.fastest !== null && row.fewest !== null),
        'Snake clear is not witnessed.',
      );
      required(
        row.teamwork === (row.teamworkProof !== null) &&
          (!row.teamwork || proofs.get(row.teamworkProof)?.teamwork === true),
        'Snake Team medal is not witnessed.',
      );
      required(
        row.noSupplies === (row.noSuppliesProof !== null) &&
          (!row.noSupplies || proofs.get(row.noSuppliesProof)?.noSupplies === true),
        'Snake supply medal is not witnessed.',
      );
    }
    required(
      value.lastPlayed === null ||
        (catalogue.has(value.lastPlayed.levelId) && integer(value.lastPlayed.at)),
      'Invalid Snake recent level.',
    );
    if (value.lastPlayed) exactKeys(value.lastPlayed, ['levelId', 'at'], 'Snake recent level');
    return value;
  };
}

function keepReferencedProofs(row) {
  const used = new Set(
    [
      row.scoreProof,
      row.catchesProof,
      row.fastest?.proof,
      row.fewest?.proof,
      row.teamworkProof,
      row.noSuppliesProof,
    ].filter(Boolean),
  );
  row.proofs = Object.fromEntries(Object.entries(row.proofs).filter(([id]) => used.has(id)));
  return row;
}
function mergeProgress(base, pending) {
  const rows = { ...base.rows };
  for (const [key, next] of Object.entries(pending.rows)) {
    const before = rows[key];
    if (!before) {
      rows[key] = next;
      continue;
    }
    const faster = !before.fastest || (next.fastest && next.fastest.value < before.fastest.value);
    const fewer = !before.fewest || (next.fewest && next.fewest.value < before.fewest.value);
    rows[key] = keepReferencedProofs({
      ...before,
      proofs: { ...before.proofs, ...next.proofs },
      score: Math.max(before.score, next.score),
      scoreProof: next.score > before.score ? next.scoreProof : before.scoreProof,
      catches: Math.max(before.catches, next.catches),
      catchesProof: next.catches > before.catches ? next.catchesProof : before.catchesProof,
      clear: before.clear || next.clear,
      fastest: faster ? next.fastest : before.fastest,
      fewest: fewer ? next.fewest : before.fewest,
      teamwork: before.teamwork || next.teamwork,
      teamworkProof: before.teamworkProof ?? next.teamworkProof,
      noSupplies: before.noSupplies || next.noSupplies,
      noSuppliesProof: before.noSuppliesProof ?? next.noSuppliesProof,
    });
  }
  const lastPlayed =
    !base.lastPlayed || (pending.lastPlayed && pending.lastPlayed.at >= base.lastPlayed.at)
      ? pending.lastPlayed
      : base.lastPlayed;
  return { ...base, rows, lastPlayed };
}

/** Validating the entire stored merge preserves unknown/corrupt bytes on failure.
 * Database transactions merge independent tab writes; the local queue also keeps
 * stale reads and failed-write fallbacks from replacing newer in-memory progress. */
function availableDatabase() {
  try {
    return globalThis.indexedDB;
  } catch {
    return null;
  }
}

export function createClassicSnakeRecords({
  onChange = () => {},
  onWarning = () => {},
  indexedDB = availableDatabase(),
  contentPack = null,
} = {}) {
  const pack = contentPack === null ? null : validateClassicSnakePackage(contentPack);
  const entries = pack ? classicSnakePackageEntries(pack) : CLASSIC_SNAKE_LEVELS;
  const catalogue = new Map(entries.map((entry) => [entry.id, entry])),
    recipes = new Map();
  const verifier = proofVerifier(catalogue, recipes, false),
    validate = validator(verifier, catalogue);
  const backend = createProfileRecordBackend({
    key: pack
      ? `${FORMAT}/community/${classicSnakePackageIdentity(pack)}`
      : CLASSIC_SNAKE_OFFICIAL_RECORDS_KEY,
    empty,
    indexedDB,
    // Replays never execute inside an IndexedDB transaction. Its timeout covers
    // bounded profile parsing, cache checks and storage only.
    validate: (source) => validate(source, { cachedOnly: true }),
    operationTimeoutMs: 5000,
  });
  let state = empty(),
    pending = empty(),
    queue = Promise.resolve(),
    closed = false;
  const publish = (value) => {
    if (!closed) {
      state = value;
      verifier.prune(state, pending);
      onChange({
        lastPlayed: structuredClone(state.lastPlayed),
        recordCount: Object.keys(state.rows).length,
      });
    }
    return state;
  };
  const enqueue = (operation) => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };
  const warm = async (snapshot) => {
    let yieldedAt = globalThis.performance?.now?.() ?? Date.now();
    for (const row of Object.values(snapshot.rows)) {
      required(
        row.proofs &&
          typeof row.proofs === 'object' &&
          !Array.isArray(row.proofs) &&
          Object.keys(row.proofs).length <= ROW_PROOFS,
        'Invalid Snake proof budget.',
      );
      for (const witness of Object.values(row.proofs)) {
        required(!closed, 'Snake records are closed.');
        verifier.verify(witness);
        const now = globalThis.performance?.now?.() ?? Date.now();
        if (now - yieldedAt >= 8) {
          await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
          yieldedAt = globalThis.performance?.now?.() ?? Date.now();
        }
      }
    }
    validate(snapshot, { cachedOnly: true });
  };
  const transaction = async (operation) => {
    // A newly written proof from another tab can race the warmed read. Retry
    // against the latest atomic snapshot; never overwrite an unverified row.
    for (let attempt = 0; attempt < 4; attempt++) {
      required(!closed, 'Snake records are closed.');
      try {
        return await operation();
      } catch (error) {
        if (!(error instanceof ColdSnakeProof) || attempt === 3) throw error;
        await warm(error.snapshot);
      }
    }
    throw new Error('Snake records changed during verification. Retry later.');
  };
  const flush = async () => {
    const saved = await transaction(() => backend.update((base) => mergeProgress(base, pending)));
    pending = empty();
    publish(saved);
  };
  const update = (merge) =>
    enqueue(async () => {
      if (closed) return { saved: false };
      const previousPending = pending;
      try {
        pending = validate(mergeProgress(pending, validate(merge(empty()))));
      } catch (error) {
        // The accepted proof was verified before this bounded profile merge.
        // A full profile must not turn a valid result into a failed verification.
        onWarning(error);
        return { saved: false };
      }
      try {
        await flush();
        return { saved: true };
      } catch (error) {
        try {
          publish(validate(mergeProgress(state, pending)));
        } catch {
          // Neither evict old proofs nor retain an oversized retry queue. The
          // current result remains verified in its host; the stored profile and
          // earlier retryable writes remain intact.
          pending = previousPending;
          verifier.prune(state, pending);
        }
        onWarning(error);
        return { saved: false };
      }
    });
  return {
    ratingScope: backend.key,
    read: () =>
      enqueue(async () => {
        if (closed) return structuredClone(state);
        try {
          if (Object.keys(pending.rows).length || pending.lastPlayed) await flush();
          else publish(await transaction(() => backend.read()));
        } catch (error) {
          onWarning(error);
        }
        return structuredClone(state);
      }),
    snapshot: () => structuredClone(state),
    ratingEvidence: () =>
      Object.entries(state.rows).map(([key, row]) => ({
        key,
        mode: row.mode,
        policy: row.policy,
        seed: row.seed,
        levelIdentity: row.levelIdentity,
        clear: row.clear,
        completionOnly: completionOnly(row),
        fewestMoves: row.fewest?.value ?? null,
      })),
    diagnostics: () => verifier.diagnostics(),
    recent: () => structuredClone(state.lastPlayed),
    get: (run, mode, policy = 'mission') => {
      const row = state.rows[classicRecordKey(run, mode, policy)];
      if (!row) return null;
      // The HUD reads every frame; never copy archived match journals here.
      return {
        levelId: row.levelId,
        chapterId: row.chapterId,
        mode: row.mode,
        policy: row.policy,
        score: row.score,
        catches: row.catches,
        clear: row.clear,
        fastest: row.fastest ? { value: row.fastest.value } : null,
        fewest: row.fewest ? { value: row.fewest.value } : null,
        teamwork: row.teamwork,
        noSupplies: row.noSupplies,
        rating: classicSnakeRatingForRecord({ ...row, completionOnly: completionOnly(row) }),
        variableHazards: completionOnly(row),
      };
    },
    async remember(run, { mode, chapterId, level, match, policy = 'mission', allowClear = true }) {
      const expected = ownedRecipe(level, catalogue, recipes, false);
      required(
        chapterId === expected.entry.chapterId && typeof allowClear === 'boolean',
        'Snake record chapter differs.',
      );
      required(
        match?.options?.mode === mode && match.options.policy === policy,
        'Snake record match policy differs.',
      );
      const replay = canonicalJSON(exportClassicSnakeReplay(run));
      const board = match.replays.findIndex((candidate) => canonicalJSON(candidate) === replay);
      required(board >= 0, 'Snake record is not a board in the accepted match.');
      const witness = { match: structuredClone(match), board },
        proof = verifier.verify(witness);
      required(
        proof.levelIdentity === dataIdentity(expected.level),
        'Snake record expected recipe differs.',
      );
      const id = proof.identity,
        key = proof.key,
        clear = allowClear && proof.clear;
      const storage = await update((previous) => {
        const before = previous.rows[key] ?? {
          levelId: proof.levelId,
          chapterId: proof.chapterId,
          mode,
          policy,
          levelIdentity: proof.levelIdentity,
          seed: proof.seed,
          proofs: {},
          score: 0,
          catches: 0,
          clear: false,
          fastest: null,
          fewest: null,
          scoreProof: id,
          catchesProof: id,
          teamwork: false,
          noSupplies: false,
          teamworkProof: null,
          noSuppliesProof: null,
        };
        const row = { ...before, proofs: { ...before.proofs, [id]: witness } };
        if (proof.score > row.score) {
          row.score = proof.score;
          row.scoreProof = id;
        }
        if (proof.catches > row.catches) {
          row.catches = proof.catches;
          row.catchesProof = id;
        }
        if (clear) {
          row.clear = true;
          if (!row.fastest || proof.elapsedMs < row.fastest.value)
            row.fastest = { value: proof.elapsedMs, proof: id };
          if (!row.fewest || proof.tick < row.fewest.value)
            row.fewest = { value: proof.tick, proof: id };
          if (proof.teamwork) {
            row.teamwork = true;
            row.teamworkProof ??= id;
          }
          if (proof.noSupplies) {
            row.noSupplies = true;
            row.noSuppliesProof ??= id;
          }
        }
        keepReferencedProofs(row);
        return { ...previous, rows: { ...previous.rows, [key]: row } };
      });
      return { verified: true, saved: storage.saved };
    },
    visit: (levelId) => {
      required(catalogue.has(levelId), 'Unknown Snake recent mission.');
      const at = Date.now();
      return update((previous) => ({ ...previous, lastPlayed: { levelId, at } }));
    },
    cleared: (levelId) =>
      Object.values(state.rows).some((row) => row.levelId === levelId && row.clear),
    chapter: (entries) =>
      entries.filter((entry) =>
        Object.values(state.rows).some((row) => row.levelId === entry.id && row.clear),
      ).length,
    close: () => {
      closed = true;
      backend.close();
    },
  };
}
