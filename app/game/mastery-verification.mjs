import { createRun } from './core/index.mjs';
import { normalizedLevel } from './core/level.mjs';
import { boundedJSON, canonicalJSON, dataIdentity, required } from './data-json.mjs';
import { campaignKey } from './library.mjs';
import { snapshotReplay, verifyReplayAsync } from './replay.mjs';
import { resolveMasteryDefinition, masteryDefinitionIdentity } from './mastery.mjs';
import { MASTERY_RECORD_VERSION, resolveMasteryRecord } from './mastery-records.mjs';

export const MASTERY_VERIFICATION_VERSION = 'xonix-mastery-verification.v1';
const verified = new WeakMap();
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const abortIfNeeded = (signal) => {
  if (signal?.aborted) {
    const error = new Error('Equipment goal verification cancelled.');
    error.name = 'AbortError';
    throw error;
  }
};

/** Reconstruct one complete attempt against an installed campaign. The host
 * separately owns live/practice eligibility and its profile generation guard.
 */
export async function verifyMasteryRun(
  { replay, campaign, definition, runId, earnedAt },
  { signal, onProgress, chunkTicks = 600 } = {},
) {
  abortIfNeeded(signal);
  // Take all caller-owned data before the first asynchronous yield. Reuse the
  // replay parser so this boundary cannot loosen or reinterpret its contract.
  const recording = snapshotReplay(replay),
    installed = boundedJSON(campaign),
    rule = resolveMasteryDefinition(definition),
    key = campaignKey(installed);
  required(rule.campaignId === installed.id, 'Equipment goal belongs to another campaign.');
  const level = installed.levels.find((item) => item.id === rule.levelId);
  required(level && recording.level.id === rule.levelId, 'Equipment goal belongs to another map.');
  const expected = createRun(level, {
    ...recording.options,
    classRecipes: installed.classRecipes,
  });
  required(
    canonicalJSON(normalizedLevel(recording.level)) === canonicalJSON(expected.level) &&
      canonicalJSON(recording.options.classRecipes) === canonicalJSON(expected.classRecipes),
    'Recorded map or equipment differs from the installed campaign.',
  );
  // Validate final metadata now as well, even for an otherwise unqualified run.
  const base = resolveMasteryRecord({
    format: MASTERY_RECORD_VERSION,
    campaignKey: key,
    levelId: level.id,
    levelRevision: level.revision,
    levelIdentity: `level-v1-${dataIdentity(expected.level)}`,
    definitionId: rule.id,
    definitionRevision: rule.revision,
    definitionHash: masteryDefinitionIdentity(rule),
    setup: {
      ruleset: expected.ruleset,
      seed: expected.seed,
      turnPolicy: expected.turnPolicy,
      classId: expected.classId,
      classRevision: expected.classRevision,
      loadoutHash: expected.loadoutHash,
      rosterHash: expected.rosterHash,
      classHistory: expected.classHistory,
    },
    runId,
    earnedAt,
  });
  const checked = await verifyReplayAsync(recording, {
    signal,
    onProgress,
    chunkTicks,
    mastery: { definition: rule, campaignId: installed.id, campaignKey: key, runId: base.runId },
  });
  abortIfNeeded(signal);
  required(checked.match, 'Equipment goal replay verification failed.');
  required(checked.state.status === 'won', 'Only a completed winning attempt can earn a seal.');
  const preview = checked.masteryPreview;
  required(
    preview?.complete && preview.status === 'won',
    'Equipment goal observation is incomplete.',
  );
  const record = preview.qualified
    ? resolveMasteryRecord({
        ...base,
        levelIdentity: preview.setup.levelIdentity,
        definitionHash: preview.definitionIdentity,
        setup: { ...base.setup, classHistory: preview.classHistory },
      })
    : null;
  const result = freeze({
    format: MASTERY_VERIFICATION_VERSION,
    qualified: record !== null,
    runId: base.runId,
    campaignKey: key,
    levelId: level.id,
    definitionId: rule.id,
    definitionName: rule.name,
    preview,
  });
  verified.set(result, record);
  return result;
}

export const isVerifiedMasteryResult = (value) => verified.has(value);

/** Only the in-memory result from the verifier can yield a new award record.
 * Exported/imported records remain ordinary local metadata, never certificates.
 */
export function verifiedMasteryRecord(result) {
  required(verified.has(result), 'A completed equipment-goal verification is required.');
  return structuredClone(verified.get(result));
}
