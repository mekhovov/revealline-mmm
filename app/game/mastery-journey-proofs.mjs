import { required, canonicalJSON } from './data-json.mjs';
import { createReplayProofStore } from './replay-proof-store.mjs';
import { freezeDesign } from './content-design/catalogs.mjs';
import {
  resolveJourneyMasteryRequirement,
  resolveJourneyMasteryClear,
  verifyJourneyMasteryRun,
  verifiedJourneyMasteryEvidence,
} from './mastery-journey.mjs';

export const JOURNEY_MASTERY_PROOF_FORMAT = 'revealline-journey-mastery-proof.v1';
const keyFor = (requirement) =>
  `${requirement.missionId}/${requirement.id}/${requirement.revision}`;

/** Optional replay evidence under the same proof authority used by learning.
 * It neither accepts a Journey win nor writes the Journey completion profile. */
export function createJourneyMasteryProofStore({
  editionId,
  storage,
  requirements,
  bindings,
  acceptClear,
  acceptOwnedClear = acceptClear,
}) {
  required(
    typeof acceptClear === 'function' && typeof acceptOwnedClear === 'function',
    'Journey mastery needs an accepted-clear authority.',
  );
  required(
    Array.isArray(requirements) && requirements.length <= 4096,
    'Journey mastery requirements exceed their budget.',
  );
  const catalog = new Map(
    requirements.map((source) => {
      const requirement = resolveJourneyMasteryRequirement(source);
      return [keyFor(requirement), requirement];
    }),
  );
  const inspect = (source) => {
    const requirement = resolveJourneyMasteryRequirement(source.requirement);
    required(
      catalog.has(keyFor(requirement)),
      'Journey mastery requires a selected authored requirement.',
    );
    const clear = resolveJourneyMasteryClear(source.clear, requirement, bindings);
    required(
      acceptOwnedClear(clear) === true,
      'Journey mastery needs an owned accepted winning run.',
    );
    return { requirement, clear };
  };
  const store = createReplayProofStore({
    editionId,
    storage,
    maxRecords: catalog.size,
    codec: {
      label: 'mastery',
      format: JOURNEY_MASTERY_PROOF_FORMAT,
      storeFormat: 'revealline-journey-mastery-proof-store.v1',
      recoveryFormat: 'revealline-journey-mastery-proof-recovery.v1',
      keyPrefix: 'revealline-mmm.journey-mastery-proofs',
      evidenceKey: 'mastery',
      durableEvidenceKey: 'durableMastery',
      payloadKeys: ['requirement', 'clear', 'replay'],
      recordKey: (source) => keyFor(source?.requirement ?? {}),
      loadedRecord: (source) => source,
      rewardRow: (source) => ({
        ...source.requirement,
        runId: source.clear.runId,
        acceptedClear: source.clear,
      }),
      inspect,
      async verify(source, { signal }) {
        const result = await verifyJourneyMasteryRun({ ...source, bindings }, { signal });
        if (!verifiedJourneyMasteryEvidence(result)) {
          const error = new Error(
            'That accepted win lost a life; optional mastery remains available for another attempt.',
          );
          error.code = 'mastery-unqualified';
          throw error;
        }
        inspect(source);
      },
    },
  });
  const importVerified = (entries) => {
    // Current profile/retained presentation can change after async verification.
    // Recheck the host's accepted identity at this synchronous adoption boundary.
    for (const entry of entries) inspect(entry);
    return store.importVerified(entries);
  };
  // Keep historical accepted clears beside the verified rule evidence. The
  // persisted proof format stays byte-compatible; session and durable maps in
  // the shared authority retain their own exact winning attempt independently.
  let projected;
  const rewardEvidence = () => {
    const source = store.rewardEvidence();
    if (projected?.revision === source.revision) return projected;
    const rows = (entries) => entries.map(({ acceptedClear, ...record }) => record);
    projected = freezeDesign({
      revision: source.revision,
      mastery: rows(source.mastery),
      durableMastery: rows(source.durableMastery),
      historicalClears: source.mastery.map((record) => record.acceptedClear),
      durableHistoricalClears: source.durableMastery.map((record) => record.acceptedClear),
    });
    return projected;
  };
  return Object.freeze({
    ...store,
    rewardEvidence,
    load: (requirement) => store.load(keyFor(resolveJourneyMasteryRequirement(requirement))),
    async prove({ requirement, clear, replay, signal }) {
      // Creation must observe the exact accepted transition. Only already
      // recorded proofs can retain that attempt after a later mission replay.
      const accepted = resolveJourneyMasteryClear(clear, requirement, bindings);
      required(
        acceptClear(accepted) === true,
        'Journey mastery needs its exact accepted winning run.',
      );
      return store.prove({ requirement, clear: accepted, replay }, { signal });
    },
    importVerified,
    saveVerified: (entry) => importVerified([entry]),
    matchesRequirement: (source) =>
      catalog.has(keyFor(source)) &&
      canonicalJSON(catalog.get(keyFor(source))) === canonicalJSON(source),
  });
}
