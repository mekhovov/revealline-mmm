import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { createProfileRecordBackend } from '../profile-storage.mjs';
import {
  CLASSIC_SNAKE_RATING_CALIBRATIONS,
  CLASSIC_SNAKE_RATING_REVISION,
} from './classic-rating-calibrations.mjs';

export { CLASSIC_SNAKE_RATING_REVISION };
export const CLASSIC_SNAKE_RATINGS_FORMAT = 'classic-snake-ratings.v1';
const calibration = new Map(CLASSIC_SNAKE_RATING_CALIBRATIONS.map((row) => [row.key, row]));
const empty = () => ({
  format: CLASSIC_SNAKE_RATINGS_FORMAT,
  revision: CLASSIC_SNAKE_RATING_REVISION,
  best: {},
});
const recordKey = (row) => `${row.mode}/${row.policy}/${row.levelIdentity}/${row.seed}`;

/** Input is a compact projection of already-verified classic records. Nothing
 * here treats an imported score, arbitrary replay, or endless round as a clear. */
export function classicSnakeRatingForRecord(row) {
  if (
    !row?.clear ||
    row.policy !== 'mission' ||
    row.mode === 'versus' ||
    row.key?.startsWith('versus/')
  )
    return {
      stars: 0,
      calibrated: false,
      revision: CLASSIC_SNAKE_RATING_REVISION,
      goldMoves: null,
      silverMoves: null,
    };
  const thresholds = row.completionOnly ? null : calibration.get(row.key ?? recordKey(row));
  const moves = row.fewest?.value ?? row.fewestMoves;
  const stars =
    thresholds && Number.isSafeInteger(moves)
      ? moves <= thresholds.goldMoves
        ? 3
        : moves <= thresholds.silverMoves
          ? 2
          : 1
      : 1;
  return {
    stars,
    calibrated: !!thresholds,
    revision: CLASSIC_SNAKE_RATING_REVISION,
    goldMoves: thresholds?.goldMoves ?? null,
    silverMoves: thresholds?.silverMoves ?? null,
  };
}

/** Shared player-facing criteria, available before play and on results. The
 * same exact-setup lookup drives both the promise and the awarded grade. */
export function classicSnakeRatingCriteriaText({
  seed,
  levelIdentity,
  mode = 'solo',
  format = 'campaign',
  variableConditions = false,
  locale = 'en',
} = {}) {
  const uk = locale === 'uk';
  if (format !== 'campaign' || mode === 'versus')
    return uk
      ? 'Особисті рекорди зберігаються. У цій грі немає зірок за місію.'
      : 'Personal bests are saved. This game has no mission stars.';
  if (variableConditions)
    return uk
      ? '★ За перевірене завершення. Перешкоди змінюються з кожною спробою, тому тут немає срібної чи золотої оцінки. Особисті рекорди зберігаються за змінних умов.'
      : '★ For a verified clear. Interference changes each attempt, so silver and gold are unavailable here. Personal bests are saved under variable conditions.';
  const criteria = classicSnakeRatingForRecord({
    clear: true,
    policy: 'mission',
    mode,
    seed,
    levelIdentity,
  });
  if (criteria.calibrated)
    return uk
      ? `★ Завершити · ★★ ≤ ${criteria.silverMoves} ходів · ★★★ ≤ ${criteria.goldMoves} ходів`
      : `★ Complete · ★★ ≤ ${criteria.silverMoves} moves · ★★★ ≤ ${criteria.goldMoves} moves`;
  return uk
    ? '★ За перевірене завершення. Для цього набору доступна одна зірка та особисті рекорди; срібної чи золотої оцінки немає.'
    : '★ For a verified clear. This setup offers one completion star and personal bests; silver and gold are unavailable.';
}

function availableDatabase() {
  try {
    return globalThis.indexedDB;
  } catch {
    return null;
  }
}

export function createClassicSnakeRatings({
  records,
  indexedDB = availableDatabase(),
  onWarning = () => {},
  canWrite = () => true,
} = {}) {
  required(
    typeof records?.ratingEvidence === 'function',
    'Snake ratings require verified progress records.',
  );
  const validate = (source) => {
    const value = boundedJSON(source, {
      maxBytes: 1024 * 1024,
      maxNodes: 8192,
      maxDepth: 3,
      maxString: 1024,
    });
    exactKeys(value, ['format', 'revision', 'best'], 'Snake ratings');
    required(
      value.format === CLASSIC_SNAKE_RATINGS_FORMAT &&
        value.revision === CLASSIC_SNAKE_RATING_REVISION &&
        value.best &&
        typeof value.best === 'object' &&
        !Array.isArray(value.best) &&
        Object.keys(value.best).length <= 2048,
      'Unsupported Snake ratings.',
    );
    const evidence = new Map(records.ratingEvidence().map((row) => [row.key, row]));
    for (const [key, stars] of Object.entries(value.best)) {
      const row = evidence.get(key);
      required(
        [1, 2, 3].includes(stars) && row && classicSnakeRatingForRecord(row).stars >= stars,
        'Snake rating has no compatible completion proof.',
      );
    }
    return value;
  };
  const backend = createProfileRecordBackend({
    key: `${CLASSIC_SNAKE_RATINGS_FORMAT}/${CLASSIC_SNAKE_RATING_REVISION}/${records.ratingScope ?? 'official'}`,
    empty,
    validate,
    indexedDB,
    canWrite,
  });
  let state = empty(),
    queue = Promise.resolve();
  const derive = () => ({
    ...empty(),
    best: Object.fromEntries(
      records
        .ratingEvidence()
        .filter((row) => row.clear && row.policy === 'mission' && row.mode !== 'versus')
        .map((row) => [row.key, classicSnakeRatingForRecord(row).stars]),
    ),
  });
  const merge = (base, next) => {
    const value = validate(base);
    for (const [key, stars] of Object.entries(next.best))
      value.best[key] = Math.max(value.best[key] ?? 0, stars);
    return validate(value);
  };
  return {
    refresh() {
      const run = queue.then(async () => {
        const derived = derive();
        state = merge(empty(), derived);
        try {
          state = await backend.update((base) => merge(base, derived));
        } catch (error) {
          onWarning(error);
        }
        return structuredClone(state);
      });
      queue = run.catch(() => {});
      return run;
    },
    get(run, mode, policy = 'mission') {
      const key = recordKey({ ...run, mode, policy });
      return classicSnakeRatingForRecord(records.ratingEvidence().find((row) => row.key === key));
    },
    snapshot: () => structuredClone(state),
    close: () => backend.close(),
  };
}
