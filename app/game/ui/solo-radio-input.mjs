import { SOLO_RESTORE_KEY } from '../couch/controller-restore.mjs';
import { createControllerSession } from '../couch/controller-session.mjs';
export const SOLO_RADIO_PROFILE_KEY = 'revealline-mmm.solo-radio-profiles.v1';

// Standard pads retain their existing Solo bindings. Only explicitly configured
// raw devices enter the router; neither snapshots nor FPV profiles are modified.
export function createSoloRadioInput({ readPads, eventTarget, getScope }) {
  const session = createControllerSession({
    eventTarget,
    restoreKey: SOLO_RESTORE_KEY,
    restoreInFlight: true,
  });
  let capturing = false;
  let profiles = new Map();
  const capture = session.capture;
  session.capture = (value) => {
    capturing = !!value;
    capture(value);
  };
  function read() {
    try {
      const pads = readPads();
      session.sample(
        Array.from(pads || []).filter((p) => p?.mapping === ''),
        {
          active: getScope() === 'flight',
        },
      );
      profiles = new Map(session.state().devices.map((d) => [d.index, d.profile]));
      return pads;
    } catch (error) {
      session.sample([], { error });
      profiles.clear();
      throw error;
    }
  }
  return {
    session,
    readPads: read,
    rawProfile: (index) => (capturing ? null : profiles.get(index)),
    completeFlight: (index) => {
      const profile = profiles.get(index);
      return !!profile && Object.values(profile.flight).every((sources) => sources.length > 0);
    },
    dispose: () => session.dispose(),
  };
}
