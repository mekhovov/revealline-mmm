import { inspectMP3 } from './mp3-inspection.mjs';

// The original Blob is immutable; reading and scanning its bytes happens here.
// Only the existing, bounded verification result crosses back to the UI.
globalThis.addEventListener('message', async ({ data }) => {
  const { id, source } = data ?? {};
  if (!Number.isSafeInteger(id)) return;
  try {
    globalThis.postMessage({ id, result: await inspectMP3(source) });
  } catch (error) {
    globalThis.postMessage({ id, error: { name: error.name, message: error.message } });
  }
});
