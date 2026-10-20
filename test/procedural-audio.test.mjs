import test from 'node:test';
import assert from 'node:assert/strict';
import { FeedbackDirector, GAMEPLAY_EFFECTS } from '../app/game/ui/feedback-director.mjs';
import { encounterSoundRecipe } from '../app/game/ui/encounter-audio.mjs';
import { createHumanReactionPolicy } from '../app/game/ui/human-reaction-policy.mjs';

test('gameplay cues use procedural fallbacks without requesting omitted recordings', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('The branded procedural sound bank must not request recordings');
  });
  const sound = {
    context: { state: 'running', currentTime: 1 },
    settings: { master: 1, sfx: 1 },
    audioMaster: { muted: false, volume: 1 },
    enabled: true,
    paused: false,
    gameplayPaused: false,
    voices: new Set(),
    humanReactions: createHumanReactionPolicy(),
  };
  const director = new FeedbackDirector(sound);
  try {
    await director.prepare();
    for (const board of ['solo', 'versus', 'team']) {
      for (const name of GAMEPLAY_EFFECTS)
        assert.equal(director.play(name, { board }), null, name);
      for (const cue of ['catch', 'warning']) {
        const recipe = encounterSoundRecipe(cue, { humanoid: true, vocals: true });
        assert.ok(recipe.tone.from > 0 && recipe.tone.to > 0, cue);
        assert.ok(recipe.tone.gain > 0 && recipe.tone.duration > 0, cue);
      }
    }
    await Promise.all(director.pending.values());
    assert.equal(fetch.mock.callCount(), 0);
    assert.equal(director.resourceSnapshot().loading, 0);
    assert.equal(sound.humanReactions.request(1, { humanoid: true, vocals: true }), null);
    assert.equal(sound.humanReactions.snapshot().admitted, 0);
  } finally {
    director.close();
  }
});
