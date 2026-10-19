import { canonicalJSON } from '../data-json.mjs';

/** Journals use the same append/compression policy; only the final movement
 * segment may grow. Releases remain explicit ordered transitions. */
export function teamInputHistoryExtends(completed, saved) {
  return saved.every((segment, index) => {
    const next = completed[index];
    if (!next) return false;
    if (segment.release) return next.release === true;
    return (
      !next.release &&
      canonicalJSON(segment.commands) === canonicalJSON(next.commands) &&
      (index === saved.length - 1 ? next.ticks >= segment.ticks : next.ticks === segment.ticks)
    );
  });
}
