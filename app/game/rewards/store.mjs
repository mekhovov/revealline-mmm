import {
  createProfileRecordBackend,
  boundedOperation,
  validateTimeout,
} from '../profile-storage.mjs';
import { canonicalJSON, required, stableId } from '../data-json.mjs';
import {
  createRewardState,
  rewardStateFormatFor,
  validateRewardState,
  validateCompletionRewards,
  mergeRewardStates,
  mergeImportedRewardStates,
  reconcileEarnedRewards,
} from './model.mjs';

export function createRewardBackend({ editionId, ...options } = {}) {
  required(stableId(editionId), 'Rewards require a logical edition identity.');
  return createProfileRecordBackend({
    ...options,
    key: `journey-${editionId}:rewards.v1`,
    empty: () => createRewardState(editionId),
    validate: (state) => validateRewardState(state, { editionId }),
  });
}

/** Local collectible access only. Eligibility always comes from the host's
 * accepted evidence; this is neither a completion store nor a coupon issuer. */
export function createRewardStore({
  editionId,
  backend,
  onStatus = () => {},
  operationTimeoutMs = 1500,
}) {
  validateTimeout(operationTimeoutMs);
  let state = createRewardState(editionId),
    eligible = state,
    durable = false,
    error = null;
  let queue = Promise.resolve(),
    closed = false,
    closing = null,
    pendingOperations = 0;
  // Reserve only incoming IDs. Repeated frames replace bounded model projections,
  // never append raw contexts or a second history of accepted actions.
  const reservations = new Map(),
    deferredReleases = new Map();
  let capacityFailure = null,
    deferredImportSaved = false;
  const retainedPromises = () => [
    ...[...reservations.values()].map((slot) => slot.definition),
    ...[...deferredReleases.values()]
      .flatMap((pair) => pair.state.promises)
      .filter((definition) => !reservations.has(definition.id)),
  ];
  const fragment = ({ promises = [], receipts = [], acknowledged = [] }) => ({
    ...createRewardState(editionId),
    format: rewardStateFormatFor(promises),
    promises,
    receipts,
    acknowledged,
  });
  const emptyPair = () => ({
    state: createRewardState(editionId),
    eligible: createRewardState(editionId),
  });
  const project = (definitions, context, pair, persist, persistenceContext) => {
    const result = reconcileEarnedRewards(definitions, context, pair.state);
    let nextEligible = pair.eligible;
    if (persist) {
      const ids = new Set(definitions.map((definition) => definition.id));
      const retainedIds = new Set(pair.eligible.promises.map((definition) => definition.id));
      const missingPromises = result.state.promises.filter(
        (definition) => ids.has(definition.id) && !retainedIds.has(definition.id),
      );
      const promised = missingPromises.length
        ? mergeRewardStates(pair.eligible, fragment({ promises: missingPromises }), { editionId })
        : pair.eligible;
      nextEligible = reconcileEarnedRewards(definitions, persistenceContext, promised).state;
    }
    return { ...result, eligible: nextEligible };
  };
  const snapshot = () => structuredClone(state);
  const status = () => ({
    durable,
    pending: pendingOperations > 0,
    error: error?.message ?? null,
    ...(capacityFailure
      ? { deferred: { count: deferredReleases.size, importSaved: deferredImportSaved } }
      : {}),
  });
  const announce = () => {
    if (closed) return;
    try {
      onStatus(status());
    } catch {
      /* Observers never own persistence. */
    }
  };
  const write = async (pending) => {
    try {
      const saved = validateRewardState(
        await boundedOperation(
          (signal) =>
            backend.update(
              (current) => {
                signal.throwIfAborted();
                return mergeRewardStates(current, pending, { editionId });
              },
              { signal },
            ),
          operationTimeoutMs,
        ),
        { editionId },
      );
      eligible = mergeRewardStates(saved, eligible, { editionId });
      state = mergeRewardStates(saved, state);
      durable = !capacityFailure && canonicalJSON(saved) === canonicalJSON(state);
      error = capacityFailure;
    } catch (failure) {
      error = failure;
      durable = false;
    }
  };
  const save = () => {
    required(!closed, 'Reward store is closed.');
    // Session-only discoveries must not leak through a later retry or unrelated save.
    const pending = eligible;
    durable = false;
    pendingOperations++;
    queue = queue.then(async () => {
      await write(pending);
      pendingOperations--;
      announce();
      return status();
    });
    announce();
    return queue;
  };
  const applyDeferred = () => {
    if (!deferredReleases.size) return false;
    const combined = (field) =>
      fragment({
        promises: [...deferredReleases.values()].flatMap((pair) => pair[field].promises),
        receipts: [...deferredReleases.values()].flatMap((pair) => pair[field].receipts),
        acknowledged: [...deferredReleases.values()].flatMap((pair) => pair[field].acknowledged),
      });
    try {
      // Validate both complete outcomes before assigning either. A valid set of
      // promises can exceed the collection budget once every receipt is earned.
      const nextState = mergeRewardStates(state, combined('state'), { editionId });
      const nextEligible = mergeRewardStates(eligible, combined('eligible'), { editionId });
      const saveNeeded = canonicalJSON(eligible) !== canonicalJSON(nextEligible);
      if (canonicalJSON(state) !== canonicalJSON(nextState)) durable = false;
      state = nextState;
      eligible = nextEligible;
      deferredReleases.clear();
      if (error === capacityFailure) error = null;
      capacityFailure = null;
      deferredImportSaved = false;
      return saveNeeded;
    } catch (failure) {
      // Keep exact local projections for an explicit retry. Backups of the host
      // evidence and original import remain the cross-session recovery sources.
      capacityFailure = failure;
      error = failure;
      durable = false;
      return false;
    }
  };
  const retainLocal = (localState, localEligible) => {
    const slice = (input, id) =>
      fragment({
        promises: input.promises.filter((definition) => definition.id === id),
        receipts: input.receipts.filter((receipt) => receipt.definition.id === id),
        acknowledged: input.acknowledged.filter((rewardId) => rewardId === id),
      });
    for (const definition of localState.promises) {
      const previous = deferredReleases.get(definition.id) ?? emptyPair();
      deferredReleases.set(definition.id, {
        state: mergeRewardStates(previous.state, slice(localState, definition.id), { editionId }),
        eligible: mergeRewardStates(previous.eligible, slice(localEligible, definition.id), {
          editionId,
        }),
      });
    }
  };
  const releaseReservation = (restored, committed) => {
    let released = false;
    for (const definition of restored.promises) {
      const slot = reservations.get(definition.id);
      if (--slot.count) continue;
      reservations.delete(definition.id);
      if (!slot.deferred) continue;
      const current = state.promises.find((promise) => promise.id === definition.id);
      const selected =
        current && canonicalJSON(current) === canonicalJSON(slot.definition)
          ? slot.deferred.reserved
          : slot.deferred.local;
      deferredReleases.set(definition.id, selected);
      released = true;
    }
    if (!released) return false;
    deferredImportSaved ||= committed;
    return applyDeferred();
  };
  return {
    snapshot,
    current: () => state,
    status,
    load() {
      required(!closed, 'Reward store is closed.');
      pendingOperations++;
      queue = queue.then(async () => {
        try {
          const saved = validateRewardState(
            await boundedOperation((signal) => backend.read({ signal }), operationTimeoutMs),
            { editionId },
          );
          eligible = mergeRewardStates(saved, eligible, { editionId });
          state = mergeRewardStates(saved, state, { editionId });
          durable = !capacityFailure && canonicalJSON(saved) === canonicalJSON(state);
          error = capacityFailure;
        } catch (failure) {
          error = failure;
          durable = false;
        } finally {
          pendingOperations--;
        }
        announce();
        return snapshot();
      });
      announce();
      return queue;
    },
    reconcile(definitions, context, { persist = true, persistenceContext = context } = {}) {
      required(!closed, 'Reward store is closed.');
      required(context.editionId === editionId, 'Reward evidence belongs to another edition.');
      required(
        persistenceContext.editionId === editionId,
        'Durable reward evidence belongs to another edition.',
      );
      let active = definitions;
      const deferred = [],
        released = [];
      let releasedChanged = false;
      if (reservations.size || deferredReleases.size) {
        active = [];
        for (const definition of validateCompletionRewards(definitions)) {
          const pending = deferredReleases.get(definition.id);
          if (pending) {
            const updated = project(
              pending.state.promises,
              context,
              pending,
              persist,
              persistenceContext,
            );
            releasedChanged ||= ['state', 'eligible'].some(
              (field) =>
                updated[field].promises.length !== pending[field].promises.length ||
                updated[field].receipts.length !== pending[field].receipts.length,
            );
            released.push([definition.id, updated]);
            continue;
          }
          const slot = reservations.get(definition.id);
          if (
            slot &&
            !state.promises.some((promise) => promise.id === definition.id) &&
            canonicalJSON(definition) !== canonicalJSON(slot.definition)
          ) {
            const previous = slot.deferred ?? {
              definition,
              local: emptyPair(),
              reserved: emptyPair(),
            };
            deferred.push([
              slot,
              {
                definition: previous.definition,
                local: project(
                  [previous.definition],
                  context,
                  previous.local,
                  persist,
                  persistenceContext,
                ),
                reserved: project(
                  [slot.definition],
                  context,
                  previous.reserved,
                  persist,
                  persistenceContext,
                ),
              },
            ]);
          } else active.push(definition);
        }
      }
      const before = canonicalJSON(state),
        beforeEligible = canonicalJSON(eligible);
      const withoutDeferred = (input) =>
        deferredReleases.size
          ? fragment({
              promises: input.promises.filter((definition) => !deferredReleases.has(definition.id)),
              receipts: input.receipts.filter(
                (receipt) => !deferredReleases.has(receipt.definition.id),
              ),
              acknowledged: input.acknowledged.filter((id) => !deferredReleases.has(id)),
            })
          : input;
      const result = project(
        active,
        context,
        { state: withoutDeferred(state), eligible: withoutDeferred(eligible) },
        persist,
        persistenceContext,
      );
      if (deferredReleases.size) {
        result.state = mergeRewardStates(state, result.state, { editionId });
        result.eligible = mergeRewardStates(eligible, result.eligible, { editionId });
      }
      if (reservations.size || deferredReleases.size) {
        mergeRewardStates(result.state, fragment({ promises: retainedPromises() }), { editionId });
      }
      state = result.state;
      eligible = result.eligible;
      for (const [slot, pending] of deferred) slot.deferred = pending;
      for (const [id, pending] of released) deferredReleases.set(id, pending);
      const changed = before !== canonicalJSON(state) || beforeEligible !== canonicalJSON(eligible);
      if (changed || releasedChanged) applyDeferred();
      if (changed || releasedChanged) {
        durable = false;
        if (persist) void save();
        else announce();
      } else if (persist && !durable && error && !capacityFailure) {
        void save();
      }
      return Object.freeze({
        state,
        granted: result.granted,
        progress: result.progress,
      });
    },
    async restore(input) {
      required(!closed, 'Reward store is closed.');
      const restored = validateRewardState(input, { editionId });
      // Preflight before changing session state, then check again after queued
      // saves and inside the durable transaction. Another tab may have already
      // registered a different exact promise since this store last read it.
      mergeImportedRewardStates(state, restored, { editionId });
      mergeImportedRewardStates(eligible, restored, { editionId });
      // Bound the union to the same 512-promise schema and refuse simultaneous
      // imports that disagree, before adding any transient reservation.
      const reserved = fragment({ promises: retainedPromises() });
      mergeImportedRewardStates(
        mergeImportedRewardStates(state, reserved, { editionId }),
        restored,
        { editionId },
      );
      for (const definition of restored.promises) {
        const slot = reservations.get(definition.id);
        if (slot) slot.count++;
        else reservations.set(definition.id, { definition, count: 1, deferred: null });
      }
      pendingOperations++;
      const importing = queue.then(async () => {
        let committed = false;
        try {
          const saved = validateRewardState(
            await boundedOperation(
              (signal) =>
                backend.update(
                  (current) => {
                    signal.throwIfAborted();
                    mergeImportedRewardStates(state, restored, { editionId });
                    mergeImportedRewardStates(eligible, restored, {
                      editionId,
                    });
                    mergeImportedRewardStates(current, restored, { editionId });
                    const pending = mergeRewardStates(
                      mergeRewardStates(current, eligible, { editionId }),
                      fragment({ promises: state.promises }),
                      { editionId },
                    );
                    return mergeImportedRewardStates(pending, restored, {
                      editionId,
                    });
                  },
                  { signal },
                ),
              operationTimeoutMs,
            ),
            { editionId },
          );
          committed = true;
          try {
            const nextEligible = mergeRewardStates(saved, eligible, { editionId });
            const nextState = mergeRewardStates(saved, state, { editionId });
            eligible = nextEligible;
            state = nextState;
          } catch {
            // Local discoveries may arrive after the transaction's update and
            // remain valid alone while overflowing the combined collection.
            retainLocal(state, eligible);
            state = saved;
            eligible = saved;
            deferredImportSaved = true;
            applyDeferred();
          }
          durable = !capacityFailure && canonicalJSON(saved) === canonicalJSON(state);
          error = capacityFailure;
        } catch (failure) {
          error = failure;
          durable = false;
          throw failure;
        } finally {
          // Finish already accepted local evidence within this queue operation,
          // including when close() is waiting. Failed imported data never enters it.
          try {
            if (releaseReservation(restored, committed)) await write(eligible);
          } finally {
            pendingOperations--;
            announce();
          }
        }
        return status();
      });
      // Expose failure to this caller without poisoning later writes or close().
      queue = importing.catch(() => {});
      announce();
      return importing;
    },
    export() {
      return JSON.stringify(snapshot());
    },
    flush() {
      required(!closed, 'Reward store is closed.');
      applyDeferred();
      return save();
    },
    settled: () => closing ?? queue,
    close() {
      if (closing) return closing;
      closed = true;
      // Already queued writes must finish before releasing this connection.
      closing = queue.then(async () => {
        try {
          await boundedOperation(() => backend.close?.(), operationTimeoutMs);
        } catch (failure) {
          error = failure;
        }
        return status();
      });
      return closing;
    },
  };
}
