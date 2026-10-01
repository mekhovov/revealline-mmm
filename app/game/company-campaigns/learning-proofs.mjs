import { required, stableId } from '../data-json.mjs';
import { createReplayProofStore } from '../replay-proof-store.mjs';
import { validateCompanyLessons } from './learning.mjs';
import { verifyLearningEvidence } from './evidence.mjs';

export const LEARNING_PROOF_FORMAT = 'revealline-learning-proof.v1';

/** Preserve the original lesson proof keys, JSON and public API while sharing
 * bounded replay retention and durable/session adoption with other evidence. */
export function createCompanyLearningProofStore({ editionId, storage, lessons, acceptSimulation }) {
  required(stableId(editionId), 'Invalid learning proof edition.');
  required(typeof acceptSimulation === 'function', 'Selected simulation identities are required.');
  const catalog = validateCompanyLessons(lessons);
  const findLesson = (source) =>
    catalog.find((entry) => entry.missionId === source.attempt?.missionId);
  const store = createReplayProofStore({
    editionId,
    storage,
    maxRecords: catalog.length,
    codec: {
      label: 'learning',
      format: LEARNING_PROOF_FORMAT,
      storeFormat: 'revealline-learning-proof-store.v1',
      recoveryFormat: 'revealline-learning-proof-recovery.v1',
      keyPrefix: 'revealline-mmm.company-learning-proofs',
      evidenceKey: 'learning',
      durableEvidenceKey: 'durableLearning',
      payloadKeys: ['attempt', 'replay'],
      recordKey: (entry) => entry?.attempt?.missionId,
      loadedRecord: (entry) => entry.attempt,
      rewardRow: ({ attempt }) => ({
        lessonId: attempt.lessonId,
        lessonRevision: attempt.lessonRevision,
        fixtureRevision: attempt.fixtureRevision,
        lessonIdentity: attempt.lessonIdentity,
        missionId: attempt.missionId,
        attemptId: attempt.id,
      }),
      inspect(source) {
        const lesson = findLesson(source);
        required(
          lesson && source.attempt.status === 'complete',
          'Historical proof needs a completed selected lesson.',
        );
        required(
          acceptSimulation(lesson.missionId, source.attempt.simulationIdentity),
          'Learning proof needs its selected simulation.',
        );
      },
      verify: (source, { signal }) =>
        verifyLearningEvidence({
          lesson: findLesson(source),
          attempt: source.attempt,
          replay: source.replay,
          signal,
        }),
    },
  });
  return Object.freeze({
    ...store,
    prove: ({ attempt, replay, signal }) => store.prove({ attempt, replay }, { signal }),
  });
}
