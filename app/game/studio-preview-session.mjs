import { createJourneyBackend } from './journey/profile.mjs';

export const STUDIO_PREVIEW_PARAMETER = 'studio-preview';
export function isStudioPreview(href) {
  return new URL(href).searchParams.get(STUDIO_PREVIEW_PARAMETER) === '1';
}

function memoryStorage() {
  const values = new Map();
  return Object.freeze({
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(String(key)) ?? null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: (key) => values.delete(String(key)),
    clear: () => values.clear(),
  });
}

/** A fresh authoring session owns no player storage, browser database or writer
 * lock. Existing Journey/reward stores keep failed writes in memory, so normal
 * progression and first-win presentation can be tested without saving awards. */
export function createStudioPreviewSession(href) {
  if (!isStudioPreview(href)) return null;
  const assets = new Map();
  return Object.freeze({
    storage: memoryStorage(),
    sessionStorage: memoryStorage(),
    writer: Object.freeze({
      writable: false,
      reason: 'Studio preview keeps progress only in this tab. Close it to discard the preview.',
      release() {},
    }),
    readAsset: async (key) => structuredClone(assets.get(key) ?? null),
    writeAsset: async (key, value) => {
      assets.set(key, structuredClone(value));
    },
    journeyOptions(profileKey = 'journey') {
      return {
        backend: createJourneyBackend({ profileKey, indexedDB: null, canWrite: () => false }),
        canWrite: () => false,
      };
    },
  });
}
