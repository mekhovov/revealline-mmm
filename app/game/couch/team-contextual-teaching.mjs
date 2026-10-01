const FORMAT = 'revealline.team-contextual-teaching.v1';
const DEFAULT_KEY = 'revealline.team-contextual-teaching.v1';
const SKILLS = Object.freeze(['cut', 'support', 'rescue']);

const blank = () => ({ introduced: new Set(), completed: new Set() });

function readStored(storage, key) {
  if (!storage) return blank();
  const value = storage.getItem(key);
  if (value === null) return blank();
  const parsed = JSON.parse(value);
  if (parsed?.format !== FORMAT) return blank();
  const valid = (items) =>
    new Set(Array.isArray(items) ? items.filter((item) => SKILLS.includes(item)) : []);
  return {
    introduced: valid(parsed.introduced),
    completed: valid(parsed.completed),
  };
}

function supportCue(guidance) {
  const capabilities = guidance?.supportCapabilities;
  if (capabilities?.specialist && capabilities.intercept && capabilities.slow)
    return {
      key: 'interface:team.teaching.supportSpecialists',
      values: {
        interceptor: capabilities.interceptorSeat,
        disruptor: capabilities.disruptorSeat,
      },
    };
  if (capabilities?.specialist && capabilities.intercept)
    return {
      key: 'interface:team.teaching.supportSpecialistIntercept',
      values: { player: capabilities.interceptorSeat },
    };
  if (capabilities?.specialist && capabilities.slow)
    return {
      key: 'interface:team.teaching.supportSpecialistSlow',
      values: { player: capabilities.disruptorSeat },
    };
  if (capabilities?.intercept && capabilities?.slow)
    return { key: 'interface:team.teaching.supportSlowAndIntercept', values: {} };
  if (capabilities?.intercept)
    return { key: 'interface:team.teaching.supportIntercept', values: {} };
  if (capabilities?.slow) return { key: 'interface:team.teaching.supportSlow', values: {} };
  return null;
}

/**
 * Small, presentation-only teaching memory. It observes authoritative events,
 * never changes the simulation, and falls back to this page visit when storage
 * is unavailable.
 */
export function createTeamContextualTeaching({
  getStorage = () => globalThis.localStorage,
  key = DEFAULT_KEY,
  onWarning = () => {},
} = {}) {
  if (typeof getStorage !== 'function' || typeof onWarning !== 'function')
    throw new TypeError('Team teaching needs storage and warning callbacks.');
  let storage = null;
  let state = blank();
  try {
    storage = getStorage();
    state = readStored(storage, key);
  } catch (error) {
    onWarning(`Teaching progress stays on this page: ${error.message}`);
  }

  const save = () => {
    if (!storage) return;
    try {
      storage.setItem(
        key,
        JSON.stringify({
          format: FORMAT,
          introduced: SKILLS.filter((skill) => state.introduced.has(skill)),
          completed: SKILLS.filter((skill) => state.completed.has(skill)),
        }),
      );
    } catch (error) {
      storage = null;
      onWarning(`Teaching progress stays on this page: ${error.message}`);
    }
  };
  const introduce = (kind, key, values = {}) => {
    if (state.introduced.has(kind) || state.completed.has(kind)) return null;
    state.introduced.add(kind);
    save();
    return Object.freeze({ kind, key, values: Object.freeze({ ...values }) });
  };

  return Object.freeze({
    opening(guidance) {
      if (state.introduced.has('cut')) return null;
      return introduce('cut', 'interface:team.teaching.firstCut', {
        context: guidance?.groundContext,
      });
    },
    observe(events, guidance) {
      if (!Array.isArray(events))
        throw new TypeError('Team teaching needs the current event list.');
      let changed = false;
      for (const event of events) {
        if (event?.type === 'cut.closed' || event?.type === 'cut.joint') {
          if (!state.completed.has('cut')) {
            state.completed.add('cut');
            changed = true;
          }
        }
        if (
          event?.type === 'support.pulse' &&
          (event.slowedEnemies?.length > 0 || event.interceptedImpacts?.length > 0) &&
          !state.completed.has('support')
        ) {
          state.completed.add('support');
          changed = true;
        }
        if (event?.type === 'rescue.completed' && !state.completed.has('rescue')) {
          state.completed.add('rescue');
          changed = true;
        }
      }
      if (changed) save();
      if (events.some((event) => event?.type === 'player.downed'))
        return introduce('rescue', 'interface:team.teaching.rescue', {
          context: guidance?.groundContext,
        });
      if (events.some((event) => event?.type === 'cut.closed' || event?.type === 'cut.joint')) {
        const cue = supportCue(guidance);
        if (cue) return introduce('support', cue.key, cue.values);
      }
      return null;
    },
    snapshot() {
      return Object.freeze({
        introduced: Object.freeze(SKILLS.filter((skill) => state.introduced.has(skill))),
        completed: Object.freeze(SKILLS.filter((skill) => state.completed.has(skill))),
      });
    },
  });
}

export const TEAM_CONTEXTUAL_TEACHING_FORMAT = FORMAT;
