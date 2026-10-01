/** Demo presentation adapter for the ordinary gameplay feedback pipeline. */
export function updateDemoFeedback(sound, { active, theme, state, bodyId }) {
  sound.feedback(active, theme, state, { bodyId, board: 'demo' });
}

export function emitDemoEvents(sound, events, state, theme, { bodyId, source } = {}) {
  sound.events(events, state, theme, {
    bodyId,
    board: 'demo',
    resultContext: source?.entry?.campaignFeedback
      ? {
          owned: false,
          mode: 'solo',
          outcome: state?.status,
          feedback: source.entry.campaignFeedback,
        }
      : null,
  });
}
