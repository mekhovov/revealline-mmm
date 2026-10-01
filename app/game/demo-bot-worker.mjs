import { planDemoMacro } from './demo-bot.mjs';

// This module is a dedicated Worker entry point, never imported by the UI.
globalThis.addEventListener('message', ({ data }) => {
  if (data?.type !== 'plan' || !Number.isSafeInteger(data.id)) return;
  try {
    const result = planDemoMacro(data.state, {
      plannerSeed: data.plannerSeed,
      decision: data.decision,
    });
    globalThis.postMessage({ id: data.id, result });
  } catch (error) {
    globalThis.postMessage({ id: data.id, error: error.message });
  }
});
