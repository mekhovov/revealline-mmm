const aborted = () => new DOMException('Media preparation cancelled.', 'AbortError');
const phases = new Set(['menu', 'preparing', 'playing', 'paused', 'suspended']);
const priorities = { required: 0, demand: 1, background: 2 };

/** Admission only: callers retain validation, ownership and playback policy.
 * A cancelled native decode still owns its slot until the native promise settles.
 */
export function createMediaPreparation({
  fetches = 2,
  decodes = 1,
  decodeBytes = 16 * 1024 * 1024,
} = {}) {
  const limits = { fetch: fetches, decode: decodes, inspect: 1, main: 1 };
  const active = { fetch: 0, decode: 0, inspect: 0, main: 0 };
  const queue = [],
    unsettled = new Set();
  let phase = 'menu',
    closed = false,
    reservedBytes = 0,
    sequence = 0;
  function remove(task, error) {
    const at = queue.indexOf(task);
    if (at >= 0) queue.splice(at, 1);
    task.signal?.removeEventListener('abort', task.cancel);
    task.reject(error);
  }
  function drain() {
    for (const task of [...queue])
      if (
        closed ||
        task.signal?.aborted ||
        !task.eligible() ||
        (['playing', 'suspended'].includes(phase) && task.priority === 'background')
      )
        remove(task, aborted());
    queue.sort(
      (a, b) => priorities[a.priority] - priorities[b.priority] || a.sequence - b.sequence,
    );
    for (const task of [...queue]) {
      if (
        phase === 'suspended' ||
        active[task.kind] >= limits[task.kind] ||
        (task.kind === 'main' && phase === 'playing')
      )
        continue;
      if (task.kind === 'decode' && reservedBytes + task.bytes > decodeBytes) continue;
      queue.splice(queue.indexOf(task), 1);
      task.signal?.removeEventListener('abort', task.cancel);
      active[task.kind]++;
      if (task.kind === 'decode') reservedBytes += task.bytes;
      let deferred = false;
      Promise.resolve()
        .then(() => {
          if (
            closed ||
            phase === 'suspended' ||
            task.signal?.aborted ||
            !task.eligible() ||
            (phase === 'playing' && task.priority === 'background')
          )
            throw aborted();
          // Phase can change after admission but before this microtask runs.
          // Keep required fallback work pending until a safe phase instead of
          // starting a scan during gameplay or rejecting its playback request.
          if (task.kind === 'main' && phase === 'playing') {
            deferred = true;
            queue.push(task);
            task.signal?.addEventListener('abort', task.cancel, { once: true });
            return;
          }
          return task.work();
        })
        .then((value) => {
          if (deferred) return;
          if (closed || task.signal?.aborted || !task.eligible()) task.reject(aborted());
          else task.resolve(value);
        }, task.reject)
        .finally(() => {
          active[task.kind]--;
          if (task.kind === 'decode') reservedBytes -= task.bytes;
          drain();
        });
    }
  }
  return Object.freeze({
    run(kind, work, { priority = 'demand', signal, bytes = 0, eligible = () => true } = {}) {
      if (
        !(kind in limits) ||
        !(priority in priorities) ||
        typeof work !== 'function' ||
        !Number.isFinite(bytes) ||
        bytes < 0
      )
        return Promise.reject(new TypeError('Invalid media preparation task.'));
      if (kind === 'decode' && bytes > decodeBytes)
        return Promise.reject(new RangeError('Media decode exceeds its memory budget.'));
      return new Promise((resolve, reject) => {
        const task = {
          kind,
          work,
          priority,
          signal,
          bytes,
          eligible,
          resolve(value) {
            unsettled.delete(task);
            resolve(value);
          },
          reject(error) {
            unsettled.delete(task);
            reject(error);
          },
          sequence: sequence++,
        };
        task.cancel = () => {
          remove(task, aborted());
          drain();
        };
        unsettled.add(task);
        queue.push(task);
        signal?.addEventListener('abort', task.cancel, { once: true });
        drain();
      });
    },
    // Upgrade existing work only. Removed/cancelled tasks cannot be revived.
    promote(signal, priority = 'demand') {
      if (!signal || typeof signal.aborted !== 'boolean' || !(priority in priorities))
        throw new TypeError('Invalid media preparation promotion.');
      if (closed || signal.aborted) return 0;
      let promoted = 0;
      for (const task of unsettled)
        if (
          task.signal === signal &&
          priorities[priority] < priorities[task.priority] &&
          task.eligible()
        ) {
          task.priority = priority;
          promoted++;
        }
      if (promoted) drain();
      return promoted;
    },
    setPhase(value) {
      if (!phases.has(value)) throw new TypeError('Invalid media preparation phase.');
      phase = value;
      drain();
    },
    refresh: drain,
    snapshot: () =>
      Object.freeze({
        phase,
        queued: queue.length,
        active: { ...active },
        reservedDecodeBytes: reservedBytes,
      }),
    close() {
      closed = true;
      drain();
    },
  });
}
