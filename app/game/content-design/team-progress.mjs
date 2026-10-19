import { createJourneyBackend, createJourneyProfileStore } from '../journey/profile.mjs';
import { validateJourneyPicture } from '../journey/pictures.mjs';
import { verifiedTeamHuntRestore } from '../coop/hunt-attempts.mjs';
import { applyGameplayTuning, recoverGameplayTuning } from '../gameplay-tuning.mjs';
import { prepareTeamRunningEnemies } from '../hunt/team-running-enemies.mjs';
import { createCoop } from '../coop/core.mjs';
import { dataIdentity } from '../data-json.mjs';

function runningCompletion(row, run, verified = null) {
  if (!run?.level.runningEnemies) return null;
  try {
    const tuning = recoverGameplayTuning(run.level);
    if (!tuning || tuning.adminOverride) return null;
    const level = applyGameplayTuning(row.level, tuning),
      matched = prepareTeamRunningEnemies(level, {
        style: run.level.pursuit ? 'varied' : 'original',
        generation: run.level.pursuit?.version ?? 'pursuit-goals.v1',
      }),
      original = createCoop(level, {
        seed: run.seed,
        difficulty: run.difficulty,
        ...run.config,
      });
    if (level.version !== row.level.version || original.ruleset !== row.pack.ruleset) return null;
    const actualGameplayId = dataIdentity({ ruleset: run.ruleset, level: matched });
    // Team initializes and later moves the inherited enemies in run.level.
    // Fresh binding compares initialized data; Continue has the stronger exact
    // source, journal and current-state proof retained by the restore owner.
    if (verified) {
      if (verified.gameplayId !== actualGameplayId) return null;
    } else {
      const expected = createCoop(matched, {
        seed: run.seed,
        difficulty: run.difficulty,
        ...run.config,
      });
      if (dataIdentity(expected.level) !== dataIdentity(run.level)) return null;
    }
    return {
      level,
      ruleset: original.ruleset,
      actualGameplayId,
      gameplayId: dataIdentity({ ruleset: original.ruleset, level }),
    };
  } catch {
    return null;
  }
}

function availableBackend(profileKey) {
  // Resolve inside the store's bounded operation: a denied global getter is
  // session-only, not a boot error. A successful retry reuses one connection.
  let backend;
  const current = () => (backend ??= createJourneyBackend({ profileKey }));
  return {
    profileKey,
    read: () => current().read(),
    commit: (events) => current().commit(events),
    readState: () => current().readState(),
    commitState: (events) => current().commitState(events),
  };
}

/** Shared, release-independent Team bookmarks/receipts. Only runs admitted by
 * the owning host can clear an owned candidate; imports never gain authority
 * from matching IDs. Local receipts are not official scores or human approval. */
export function createTeamJourneyProgress(
  journey,
  {
    backend,
    profileKey = backend?.profileKey ?? 'journey',
    sessionId = crypto.randomUUID(),
    operationTimeoutMs,
  } = {},
) {
  const listeners = new Set(),
    attempts = new WeakMap();
  let disposed = false,
    sequence = 0;
  const store = createJourneyProfileStore({
    backend: backend ?? availableBackend(profileKey),
    profileKey,
    operationTimeoutMs,
    onStatus(status) {
      for (const listener of [...listeners]) {
        if (disposed || !listeners.has(listener)) continue;
        try {
          listener(status);
        } catch {
          /* UI cannot veto persistence. */
        }
      }
    },
  });
  function bind(row, run, { skipped = null, gameplayId = null, picture = null, attemptId = null }) {
    const runId = attemptId ?? `${sessionId}/${++sequence}`,
      exactGameplayId = gameplayId ?? row.simulationIdentity;
    let exactPicture = null;
    if (picture)
      try {
        exactPicture = validateJourneyPicture({
          ...picture,
          mode: 'team',
          missionId: row.mission.id,
          levelId: row.level.id,
          levelRevision: String(row.level.revision),
          runId,
          gameplayId: exactGameplayId,
          difficulty: row.difficulty,
          name: row.mission.name,
          campaignTitle: row.mission.campaignTitle,
        });
      } catch {
        // A presentation mismatch cannot invalidate an otherwise legal Team
        // attempt or invent a weaker picture receipt. The clear remains valid.
      }
    attempts.set(run, {
      row,
      runId,
      gameplayId: exactGameplayId,
      picture: exactPicture,
      completed: false,
    });
    store.recordMany([
      ...(skipped ? [{ type: 'skip', mode: 'team', missionId: skipped.mission.id }] : []),
      { type: 'select', mode: 'team', missionId: row.mission.id },
    ]);
    return true;
  }
  return Object.freeze({
    editionId: profileKey,
    load: () => store.load(),
    snapshot: () => store.snapshot(),
    pictures: () => store.pictures(),
    status: () => store.status(),
    retry: () => store.flush(),
    export: () => store.export(),
    backupFilename: store.backupFilename,
    initial(difficulty) {
      const profile = store.snapshot(),
        cursor = journey.catalog.find(profile.cursors.team);
      const mission =
        cursor && journey.isCore(cursor.id)
          ? Object.hasOwn(profile.clears.team, cursor.id)
            ? (journey.next(cursor.id) ?? cursor)
            : cursor
          : journey.catalog.missions.find((item) => journey.isCore(item.id));
      return journey.row(mission, difficulty);
    },
    started(
      row,
      run,
      {
        skipped = null,
        gameplayId = null,
        adminOverride = false,
        picture = null,
        attemptId = null,
      } = {},
    ) {
      const running = journey.owns(row) ? runningCompletion(row, run) : null;
      if (
        disposed ||
        adminOverride ||
        (attemptId !== null &&
          (typeof attemptId !== 'string' || attemptId.length === 0 || attemptId.length > 160)) ||
        (gameplayId !== null &&
          (typeof gameplayId !== 'string' || !/^[0-9a-f]{16}$/.test(gameplayId))) ||
        !journey.owns(row) ||
        !run ||
        attempts.has(run) ||
        run.tick !== 0 ||
        !['ready', 'running'].includes(run.status) ||
        run.level.id !== row.level.id ||
        (run.level.runningEnemies &&
          (!running || (gameplayId !== null && gameplayId !== running.actualGameplayId))) ||
        (running?.level.version ?? run.level.version) !== row.level.version ||
        (running?.ruleset ?? run.ruleset) !== row.pack.ruleset ||
        run.difficulty !== row.difficulty ||
        (skipped && (!journey.owns(skipped) || journey.destination(skipped).next !== row))
      )
        return false;
      return bind(row, run, {
        skipped,
        gameplayId: running?.gameplayId ?? gameplayId,
        picture,
        attemptId,
      });
    },
    resumed(row, run, { gameplayId = null, adminOverride = false, picture = null } = {}) {
      if (disposed || adminOverride || !journey.owns(row) || !run || attempts.has(run))
        return false;
      const verified = verifiedTeamHuntRestore(run, row);
      const running = verified ? runningCompletion(row, run, verified) : null;
      if (
        !verified ||
        verified.adminOverride ||
        verified.encounterVariant !== 'authored' ||
        (gameplayId !== null && gameplayId !== verified.gameplayId) ||
        run.level.id !== row.level.id ||
        (run.level.runningEnemies &&
          (!running || verified.gameplayId !== running.actualGameplayId)) ||
        (running?.level.version ?? run.level.version) !== row.level.version ||
        (running?.ruleset ?? run.ruleset) !== row.pack.ruleset ||
        run.difficulty !== row.difficulty
      )
        return false;
      return bind(row, run, {
        gameplayId: running?.gameplayId ?? verified.gameplayId,
        attemptId: verified.attemptId,
        picture,
      });
    },
    complete(run) {
      const attempt = attempts.get(run);
      if (disposed || !attempt || attempt.completed || run.status !== 'won') return false;
      attempt.completed = true;
      const event = {
        type: 'complete',
        mode: 'team',
        missionId: attempt.row.mission.id,
        runId: attempt.runId,
        gameplayId: attempt.gameplayId,
        difficulty: attempt.row.difficulty,
        ...(attempt.picture ? { picture: attempt.picture } : {}),
      };
      try {
        store.record(event);
      } catch {
        // Capacity or conflicting presentation history must not erase the legal
        // gameplay clear. Do not claim or substitute a different original.
        const { picture: _picture, ...receipt } = event;
        store.record(receipt);
      }
      return true;
    },
    skipped(from, to) {
      if (
        disposed ||
        !journey.owns(from) ||
        !journey.owns(to) ||
        journey.destination(from).next !== to
      )
        return false;
      store.record({ type: 'skip', mode: 'team', missionId: from.mission.id });
      return true;
    },
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      store.status();
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      listeners.clear();
    },
  });
}
