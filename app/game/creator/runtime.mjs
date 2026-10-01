import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { createContentAttemptPreparer } from '../content-design/attempt.mjs';
import { stepRun, releaseInputs } from '../core/index.mjs';
import { recordInput, recordRelease, exportReplay, verifyReplayAsync } from '../replay.mjs';
import { suspendSession, restoreSession, SESSION_STORAGE_BYTES } from '../sessions.mjs';
import {
  creatorArtworkLoader,
  creatorVictoryStoryDependency,
  isPreparedCreatorBundle,
} from './bundle.mjs';
import { preparePinnedVictoryStory, VICTORY_STORY_FORMAT } from '../victory-story.mjs';

export const creatorProfileKey = (editionId) => `custom-${editionId}`;
export const creatorAttemptKey = (editionId) => `revealline-mmm.creator.attempt.v1.${editionId}`;

function creatorMissionOrder(missionOrder) {
  required(
    Array.isArray(missionOrder) &&
      missionOrder.length > 0 &&
      missionOrder.every((missionId) => typeof missionId === 'string' && missionId.length > 0) &&
      new Set(missionOrder).size === missionOrder.length,
    'Custom campaign needs an ordered mission list.',
  );
  return missionOrder;
}

/** Resolve the primary Custom-player destination without granting progress.
 * An explicit library choice wins. Otherwise an unfinished cursor is retained,
 * then the first uncleared authored mission continues the campaign. A completed
 * campaign keeps its final mission available for an explicit replay action. */
export function creatorCampaignDestination(missionOrder, progress, { missionId = null } = {}) {
  creatorMissionOrder(missionOrder);
  const clears = progress?.clears?.solo;
  required(
    clears && typeof clears === 'object' && !Array.isArray(clears),
    'Custom campaign progress is unreadable.',
  );
  if (missionId !== null) {
    required(missionOrder.includes(missionId), 'Choose a mission from this installed edition.');
    return Object.freeze({ missionId, complete: false, explicit: true });
  }
  const cursor = progress?.cursors?.solo;
  if (missionOrder.includes(cursor) && !Object.hasOwn(clears, cursor))
    return Object.freeze({ missionId: cursor, complete: false, explicit: false });
  const unfinished = missionOrder.find((id) => !Object.hasOwn(clears, id));
  return Object.freeze({
    missionId: unfinished ?? missionOrder.at(-1),
    complete: unfinished === undefined,
    explicit: false,
  });
}

/** Choose the most relevant retained reward for the Custom-player lobby. */
export function creatorEarnedMissionId(missionOrder, progress) {
  creatorMissionOrder(missionOrder);
  const clears = progress?.clears?.solo;
  required(
    clears && typeof clears === 'object' && !Array.isArray(clears),
    'Custom campaign progress is unreadable.',
  );
  const cursor = progress?.cursors?.solo;
  if (missionOrder.includes(cursor) && Object.hasOwn(clears, cursor)) return cursor;
  return [...missionOrder].reverse().find((missionId) => Object.hasOwn(clears, missionId)) ?? null;
}

/** Ordinary installed Custom gameplay. It shares the compiler, attempt/picture
 * preparer, legal inputs and session verifier. This host never adopts Journey
 * eligibility, global tuning or a different edition's progression. */
export function createCreatorRuntime(prepared, { decodeImage, buildVersion = 'dev' } = {}) {
  required(isPreparedCreatorBundle(prepared), 'Verify the installed edition before playing.');
  const { project, themes, provenance } = prepared.manifest.content;
  const provenances = Array.isArray(provenance) ? provenance : [provenance];
  const provenanceByMission = new Map(provenances.map((entry) => [entry.missionId, entry]));
  const pack = project.packs.find((entry) => entry.id === prepared.manifest.content.packId);
  const campaigns = new Map(project.campaigns.map((entry) => [entry.id, entry]));
  const missionOrder = pack.campaignIds.flatMap(
    (campaignId) => campaigns.get(campaignId).missionIds,
  );
  const preparer = createContentAttemptPreparer(project, {
    themes,
    buildVersion,
    loadArtwork: creatorArtworkLoader(prepared),
    decodeImage,
  });
  let attempt = null,
    runId = null,
    generation = 0,
    disposed = false;
  const completions = new WeakSet();
  const key = (entry) => `creator:${prepared.editionId}:${entry.executionKey}`;
  async function prepare(missionId, difficulty, turnPolicy, { signal } = {}) {
    required(!disposed, 'Custom player is closed.');
    const ticket = ++generation;
    const mission = preparer.catalog
      .journey()
      .missions.find((item) => item.id === missionId || item.levelId === missionId);
    required(mission, 'Choose a mission from this installed edition.');
    const missionProvenance = provenanceByMission.get(mission.levelId);
    required(missionProvenance, 'This mission is missing its generation evidence.');
    const candidate = await preparer.prepare(
      { missionId: mission.id, difficulty, turnPolicy, seed: missionProvenance.runtimeSeed },
      { signal },
    );
    if (disposed || ticket !== generation || signal?.aborted) {
      if (preparer.current(candidate)) preparer.cancel();
      throw new DOMException('Custom attempt superseded.', 'AbortError');
    }
    return candidate;
  }
  function adopt(candidate, restored = null) {
    const next = preparer.take(candidate);
    attempt?.picture?.release();
    attempt = { ...next, ...(restored ? { run: restored.run, recorder: restored.recorder } : {}) };
    runId = restored?.session.runId ?? crypto.randomUUID();
    return attempt;
  }
  return Object.freeze({
    editionId: prepared.editionId,
    catalog: preparer.catalog,
    missionOrder: Object.freeze([...missionOrder]),
    nextMissionId(missionId) {
      const index = missionOrder.indexOf(missionId);
      required(index >= 0, 'Choose a mission from this installed edition.');
      return missionOrder[index + 1] ?? null;
    },
    current: () => attempt,
    runId: () => runId,
    async start(
      { missionId = missionOrder[0], difficulty = 'standard', turnPolicy = 'immediate' } = {},
      options,
    ) {
      return adopt(await prepare(missionId, difficulty, turnPolicy, options));
    },
    step(input) {
      required(attempt && !disposed, 'Start an installed Custom mission first.');
      if (!['running', 'respawning'].includes(attempt.run.status)) return attempt.run;
      recordInput(attempt.recorder, input);
      stepRun(attempt.run, input);
      return attempt.run;
    },
    pause() {
      if (!attempt || disposed) return;
      releaseInputs(attempt.run);
      recordRelease(attempt.recorder);
    },
    suspend() {
      required(attempt && !disposed, 'There is no unfinished Custom mission.');
      return {
        format: 'revealline-creator-attempt.v1',
        editionId: prepared.editionId,
        missionId: attempt.selection.missionId,
        difficulty: attempt.selection.difficulty,
        session: suspendSession({
          run: attempt.run,
          recorder: attempt.recorder,
          campaignKey: key(attempt.entry),
          themeId: attempt.theme.id,
          bodyId: 'neutral-marker',
          runId,
        }),
      };
    },
    async restore(source, { signal } = {}) {
      const saved = boundedJSON(source, {
        maxBytes: SESSION_STORAGE_BYTES,
        maxNodes: 250000,
        maxDepth: 28,
        maxArray: 200000,
      });
      exactKeys(
        saved,
        ['format', 'editionId', 'missionId', 'difficulty', 'session'],
        'Custom attempt',
      );
      required(
        saved.format === 'revealline-creator-attempt.v1' && saved.editionId === prepared.editionId,
        'This saved attempt belongs to a different installed edition.',
      );
      const candidate = await prepare(
        saved.missionId,
        saved.difficulty,
        saved.session.replay.options.turnPolicy,
        { signal },
      );
      try {
        required(
          saved.session?.replay?.options?.seed ===
            provenanceByMission.get(candidate.manifest.missionId)?.runtimeSeed,
          'Saved attempt uses a different runtime seed.',
        );
        const restored = await restoreSession(saved.session, {
          campaign: candidate.entry.campaign,
          campaignKey: key(candidate.entry),
          signal,
        });
        required(
          preparer.current(candidate) && !disposed,
          'A newer attempt replaced this recovery.',
        );
        required(
          restored.run.level.id === candidate.manifest.missionId &&
            restored.session.themeId === candidate.theme.id,
          'Saved mission or picture differs from this edition.',
        );
        return adopt(candidate, restored);
      } catch (error) {
        if (preparer.current(candidate)) preparer.cancel();
        throw error;
      }
    },
    async completion({ signal } = {}) {
      required(
        attempt?.run.status === 'won' && !disposed,
        'Only a legal win can earn a Custom picture.',
      );
      const current = attempt,
        identity = runId;
      const checked = await verifyReplayAsync(exportReplay(current.recorder, current.run), {
        signal,
      });
      required(
        attempt === current &&
          runId === identity &&
          !disposed &&
          checked.match &&
          checked.actual.summary.won,
        'This Custom completion changed or did not verify.',
      );
      const receipt = Object.freeze({
        type: 'complete',
        mode: 'solo',
        missionId: current.manifest.missionId,
        runId: identity,
        gameplayId: `${prepared.editionId}:${current.manifest.simulationIdentity}`,
        difficulty: current.selection.difficulty,
      });
      completions.add(receipt);
      return receipt;
    },
    async prepareVictoryStory(receipt, options = {}) {
      required(
        completions.has(receipt) &&
          attempt &&
          !disposed &&
          receipt.runId === runId &&
          receipt.missionId === attempt.manifest.missionId,
        'Victory story requires this runtime’s verified legal completion.',
      );
      const current = attempt,
        dependency = creatorVictoryStoryDependency(prepared, receipt.missionId);
      if (!dependency) return null;
      const index = missionOrder.indexOf(receipt.missionId);
      required(index >= 0, 'Victory story mission is outside this installed edition.');
      const picturePin = Object.freeze({
        kind: 'still',
        identity: Object.freeze({
          baseCampaignKey: current.entry.baseCampaignKey,
          levelId: current.manifest.missionId,
          levelRevision: current.run.level.revision,
          themeId: current.theme.id,
        }),
        presentationId: `creator-${prepared.editionId.slice(0, 32)}`,
        presentationRevision: index + 1,
        assetId: dependency.poster.id,
        sha256: dependency.poster.sha256,
      });
      const story = dependency.story,
        descriptor = {
          format: VICTORY_STORY_FORMAT,
          id: `story-${prepared.editionId.slice(0, 32)}`,
          revision: index + 1,
          picturePin,
          source: story.video,
          segment: {
            startSeconds: story.playbackRange.startSeconds,
            endSeconds: story.playbackRange.endSeconds,
          },
          description: story.description,
        };
      const storyPrepared = await preparePinnedVictoryStory(
        { descriptor, blob: dependency.original, picturePin },
        options,
      );
      required(
        completions.has(receipt) && attempt === current && !disposed && receipt.runId === runId,
        'A newer Custom attempt replaced this victory story.',
      );
      return Object.freeze({
        prepared: storyPrepared,
        picturePin,
        poster: dependency.poster,
        playbackRange: story.playbackRange,
      });
    },
    dispose() {
      disposed = true;
      generation++;
      preparer.dispose();
      attempt?.picture?.release();
      attempt = null;
    },
  });
}
