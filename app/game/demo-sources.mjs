import { withDemoLoadingDeadline } from './demo-loading.mjs';
import {
  loadDemoCatalog,
  resolveDemoCatalog,
  demoIdentity,
  loadDemoRecording,
} from './demo-catalog.mjs';
import { prepareReplayPlayer, prepareReviewedReplayPlayer } from './replay-player.mjs';
import { prepareBotPlayer } from './demo-bot-player.mjs';
import { prepareImprovPlayer } from './demo-improv-player.mjs';
import { LIVE_BOT_LEVEL_IDS, supportsDemoBot } from './demo-bot.mjs';
import { campaignKey } from './library.mjs';
import { applyGameplayTuning, resolveGameplayTuning } from './gameplay-tuning.mjs';

export async function loadDemoSources({
  entries,
  library,
  turnPolicy = 'immediate',
  signal,
  fetch: fetcher = globalThis.fetch,
  WorkerClass = globalThis.Worker,
  loading = {},
}) {
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  };
  checkAbort();
  let clips = [];
  try {
    clips = resolveDemoCatalog(
      await loadDemoCatalog({ ...loading, fetch: fetcher, signal }),
      entries,
    );
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  checkAbort();
  try {
    clips.push(
      ...(await withDemoLoadingDeadline((signal) => library.list(entries, { signal }), {
        ...loading,
        signal,
      })),
    );
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  checkAbort();
  const sources = clips.map((clip, index) => ({
    ...clip,
    kind: 'replay',
    levelKey: `${clip.campaignKey}/${clip.levelId}`,
    approachable: index === 0,
    async create({ signal }) {
      // Native math can differ between engines. Each alternative is a frozen,
      // independently authored ordinary replay of this exact pinned input trace.
      // Only a complete strict verification can select it; never replace outcomes.
      const candidates = [clip.replayURL, ...(clip.replayVariants ?? [])];
      for (let index = 0; index < candidates.length; index++) {
        const replay = await loadDemoRecording(
          { ...clip, replayURL: candidates[index] },
          { ...loading, fetch: fetcher, signal },
        );
        try {
          const isLastCandidate = index === candidates.length - 1;
          return await (isLastCandidate && clip.source !== 'local'
            ? prepareReviewedReplayPlayer(replay, { signal })
            : prepareReplayPlayer(replay, { signal }));
        } catch (error) {
          if (
            error.name !== 'ReplayVerificationError' ||
            signal?.aborted ||
            index === candidates.length - 1
          )
            throw error;
        }
      }
    },
  }));
  if (typeof WorkerClass === 'function')
    for (const entry of entries) {
      if (entry.difficulty && entry.difficulty !== 'standard') continue;
      for (const level of entry.campaign.levels) {
        if (!LIVE_BOT_LEVEL_IDS.includes(level.id)) continue;
        const simulationLevel = applyGameplayTuning(level, resolveGameplayTuning('standard'));
        const options = {
          seed: 1,
          turnPolicy,
          classId: 'scout',
          classRecipes: entry.classRecipes ?? entry.campaign.classRecipes,
        };
        if (!supportsDemoBot(simulationLevel, options)) continue;
        for (const seed of [1, 2, 3])
          sources.push({
            id: `live-${campaignKey(entry.campaign)}-${level.id}-${seed}`,
            kind: 'bot',
            levelId: level.id,
            level,
            entry,
            identity: demoIdentity(level, options.classRecipes),
            recordingIdentity: demoIdentity(simulationLevel, options.classRecipes),
            campaignKey: campaignKey(entry.campaign),
            levelKey: `${campaignKey(entry.campaign)}/${level.id}`,
            create: ({ signal }) =>
              prepareBotPlayer(
                simulationLevel,
                { ...options, seed },
                { signal, WorkerClass, plannerSeed: seed },
              ),
          });
      }
    }
  const represented = new Set(sources.map((source) => source.levelKey));
  for (const entry of entries) {
    if (entry.difficulty && entry.difficulty !== 'standard') continue;
    const recipes = entry.classRecipes ?? entry.campaign.classRecipes;
    if (!Array.isArray(recipes) || !recipes.length) continue;
    for (const [levelIndex, level] of entry.campaign.levels.entries()) {
      const key = `${campaignKey(entry.campaign)}/${level.id}`;
      if (represented.has(key)) continue;
      const simulationLevel = applyGameplayTuning(level, resolveGameplayTuning('standard')),
        classId = recipes[levelIndex % recipes.length].id,
        baseSeed = (levelIndex + 1) * 2654435761;
      let performance = 0;
      sources.push({
        id: `improv-${campaignKey(entry.campaign)}-${level.id}`,
        kind: 'improv',
        levelId: level.id,
        level,
        entry,
        identity: demoIdentity(level, recipes),
        recordingIdentity: demoIdentity(simulationLevel, recipes),
        campaignKey: campaignKey(entry.campaign),
        levelKey: key,
        create: ({ signal }) => {
          performance++;
          const seed = (baseSeed ^ Math.imul(performance, 2246822519)) >>> 0;
          return prepareImprovPlayer(
            simulationLevel,
            { seed, turnPolicy, classId, classRecipes: recipes },
            { signal, performanceSeed: seed },
          );
        },
      });
      represented.add(key);
    }
  }
  return sources;
}
