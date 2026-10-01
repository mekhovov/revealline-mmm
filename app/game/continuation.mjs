import { canPlay } from './progress.mjs';

/** Navigation only. A clear never grants another clear, and optional mastery
 * does not gate the next accessible unfinished mission.
 */
export function campaignContinuation(progress, campaign) {
  const levels = campaign?.levels;
  if (!Array.isArray(levels) || !levels.length)
    throw new Error('A continuation needs a campaign with missions.');
  const clears = progress?.clears;
  if (!clears || typeof clears !== 'object' || Array.isArray(clears))
    throw new Error('A continuation needs readable campaign progress.');
  const completed = levels.filter((level) => Object.hasOwn(clears, level.id)).length;
  const complete = completed === levels.length;
  const levelIndex = complete
    ? null
    : levels.findIndex(
        (level, index) => !Object.hasOwn(clears, level.id) && canPlay(progress, campaign, index),
      );
  return Object.freeze({
    complete,
    completed,
    total: levels.length,
    levelIndex: levelIndex < 0 ? null : levelIndex,
  });
}

/** Preserve an explicit replay/restoration target. Callers remain responsible
 * for validating saves and for disabling locked mission buttons.
 */
export function campaignSelection(progress, campaign, { levelId } = {}) {
  const continuation = campaignContinuation(progress, campaign);
  const explicit =
    levelId === undefined ? -1 : campaign.levels.findIndex((level) => level.id === levelId);
  return Object.freeze({
    ...continuation,
    overview: explicit < 0 && continuation.complete,
    levelIndex: explicit >= 0 ? explicit : (continuation.levelIndex ?? campaign.levels.length - 1),
    explicit: explicit >= 0,
  });
}

/** Safe, bounded preview labels only; this is deliberately not save validation.
 * The existing restoreSession pipeline must verify before adopting any state.
 */
export function savedFlightPreview(candidate, entries = []) {
  if (candidate === null || candidate === undefined) return null;
  const text = (value, max = 100) =>
    typeof value === 'string' && value.trim() && value.length <= max ? value : null;
  const key = text(candidate?.campaignKey, 300);
  const levelId = text(candidate?.replay?.level?.id);
  const entry = entries.find((item) => item.key === key);
  const level = entry?.campaign?.levels.find((item) => item.id === levelId);
  const campaignName =
    text(entry?.campaign?.title) || text(entry?.campaign?.name) || 'Saved campaign';
  const title = level ? `${campaignName} · ${text(level.name) || 'Saved mission'}` : 'Saved flight';
  const coverage = candidate?.replay?.summary?.coverage;
  const detail =
    Number.isFinite(coverage) && coverage >= 0 && coverage <= 1
      ? `Recorded ${Math.round(coverage * 100)}% revealed. `
      : '';
  return Object.freeze({ title, note: `${detail}Verified before loading; flight stays paused.` });
}
