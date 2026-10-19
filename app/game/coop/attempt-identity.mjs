import { required } from '../data-json.mjs';

/** Persistence follows the simulation attempt, independently of reusable artwork leases. */
export function createTeamAttemptIdentity(sessionId) {
  required(
    typeof sessionId === 'string' && sessionId.length > 0 && sessionId.length <= 96,
    'Invalid Team attempt session.',
  );
  const identities = new WeakMap();
  let sequence = 0;
  return (run, restored = null) => {
    const retained = restored?.snapshot.attemptId;
    required(
      retained === undefined ||
        (typeof retained === 'string' && retained.length > 0 && retained.length <= 160),
      'Invalid retained Team attempt identity.',
    );
    const previous = identities.get(run);
    required(
      previous === undefined || retained === undefined || previous === retained,
      'Team attempt identity changed during activation.',
    );
    if (previous !== undefined) return previous;
    const identity = retained ?? `${sessionId}:attempt:${++sequence}`;
    identities.set(run, identity);
    return identity;
  };
}
