import { acquirePinnedStory } from './story-dialog.mjs';
import { createVictoryStoryPresentation } from './victory-story.mjs';
import { REWARD_STORY_SECONDS } from './reward-arrival.mjs';

/** Optional earned media only. No award, simulation, profile or assignment writes. */
export function createDemoReward({
  document: doc,
  canvas,
  readMedia,
  audioMaster = null,
  acquire = acquirePinnedStory,
  createPresentation = createVictoryStoryPresentation,
}) {
  let controller = null,
    presentation = null,
    stage = null,
    poster = null,
    pendingPreparations = 0,
    attempted = false,
    state = 'idle',
    previousPreferences = null;
  function reset() {
    controller?.abort();
    controller = null;
    presentation?.dispose();
    presentation = null;
    stage?.remove();
    stage = null;
    poster = null;
    attempted = false;
    previousPreferences = null;
    state = 'idle';
  }
  function pause() {
    if (state === 'preparing' && !presentation) {
      controller?.abort();
      state = 'poster';
    }
    presentation?.pause();
  }
  async function open(pin, preferences) {
    pendingPreparations++;
    attempted = true;
    const own = new AbortController();
    controller = own;
    state = 'preparing';
    const deadline = setTimeout(() => {
      own.abort();
      if (controller === own) state = 'error';
    }, 15000);
    own.signal.addEventListener('abort', () => clearTimeout(deadline), { once: true });
    try {
      const media = await readMedia({ signal: own.signal });
      if (own.signal.aborted) return;
      const prepared = await acquire({ pin, media }, { signal: own.signal });
      if (own.signal.aborted) return;
      stage = doc.createElement('div');
      stage.className = 'demo-reward-story';
      stage.setAttribute('data-demo-ui', '');
      poster = doc.createElement('canvas');
      poster.width = canvas.width;
      poster.height = canvas.height;
      poster.getContext('2d').drawImage(canvas, 0, 0);
      stage.append(poster);
      canvas.parentElement.append(stage);
      presentation = createPresentation({
        container: stage,
        posterElement: poster,
        picturePin: pin.picturePin,
        prepared,
        document: doc,
        window: doc.defaultView,
        signal: own.signal,
        audioMaster,
        autoplay: true,
        cinematicTransition: true,
        ...preferences,
        onChange: (snapshot) => {
          if (controller === own && !own.signal.aborted) state = snapshot.state;
        },
      });
    } catch {
      if (!own.signal.aborted) state = 'error';
    } finally {
      pendingPreparations--;
      clearTimeout(deadline);
    }
  }
  return {
    // Only the currently displayed, already admitted media can leave the scene.
    // A decoded video frame avoids flashing back to its poster on Next.
    departureFrame() {
      const video = stage?.querySelector('video');
      return video && video.readyState >= 2 && ['playing', 'paused'].includes(state)
        ? video
        : canvas;
    },
    reset,
    pause,
    update({ won, age, allowed, pin, paused, reduced, volume = 0.7, muted = true }) {
      if (!won || !allowed || !pin || reduced) {
        reset();
        return false;
      }
      if (paused) pause();
      const preferences = { volume, muted, reducedMotion: reduced };
      const key = JSON.stringify(preferences);
      if (presentation && key !== previousPreferences) {
        presentation.setPreferences(preferences);
        previousPreferences = key;
      }
      if (!attempted && !paused && age >= REWARD_STORY_SECONDS)
        void open(pin, { volume, muted, reducedMotion: reduced });
      // A blocked/paused/finished movie leaves the poster; an active or preparing
      // movie owns the recap until completion. The native player bounds loading.
      return ['preparing', 'starting', 'playing'].includes(state);
    },
    snapshot: () => ({ state, attempted }),
    resourceSnapshot() {
      const pixels = (poster?.width || 0) * (poster?.height || 0);
      return {
        state,
        pendingPreparations,
        poster: { canvases: Number(pixels > 0), pixels, rgbaBytesEstimate: pixels * 4 },
        presentation: presentation?.resourceSnapshot?.() ?? null,
        presentationUnavailable:
          !!presentation && typeof presentation.resourceSnapshot !== 'function',
        accounting:
          'Pending acquisitions include canceled work until actual settlement; their native allocation is unknown.',
      };
    },
  };
}
