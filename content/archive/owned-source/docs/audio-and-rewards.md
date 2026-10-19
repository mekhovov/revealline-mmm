# Original sound and picture rewards

The game now generates five original music styles with Web Audio and gives each of the four world families a palette-matched, skippable confetti celebration. It imports no music files, recorded samples, copyrighted riffs or artist-specific melodies. The arrangements use authored oscillator/noise voices and deterministic composition rules; pack descriptors select their genre, tempo, tonic and scale. The style names describe intended timbre and rhythm, not a claim that synthesized guitar is a recorded band.

The implementation is in `game/ui/audio.mjs`, `music.mjs`, `celebration.mjs`, `scene-art.mjs` and `render.mjs`. Simulation, input latency, score, collision, progression and replay identity do not depend on these presentation modules.

## Music and controls

| Genre ID | Intended sound | Default original track |
| --- | --- | --- |
| `synthwave` | Pulsing bass, soft saw pads, triangle arpeggios and drum-machine rhythm | Signal Afterglow |
| `chiptune` | Short square-wave notes, stepwise arpeggios and compact noise percussion | Pocket Constellation |
| `rock` | Overdriven saw-wave power intervals, bass and a backbeat | Copper Highway |
| `metal` | Lower tonic, short distorted pedal notes and a denser kick pattern | Iron Comet |
| `ambient` | Slower sustained chords and sparse bell figures | Quiet Orchard |

`MUSIC_STYLES` and `DEFAULT_TRACKS` are exported from `audio.mjs`. `rock` is the pack ID; `configure({style:'arcade-rock'})` accepts an alias for existing callers. The default master/music/effects gains are 0.65/0.55/0.70. All three controls accept 0..1. Music and effects have separate buses feeding the master and a compressor; guitar voices pass through a small shared waveshaper. Volume changes use short gain transitions.

The selected track has exactly this pack-compatible shape:

```json
{
  "id": "orchard-after-hours",
  "name": "Orchard After Hours",
  "genre": "synthwave",
  "tempo": 112,
  "root": 48,
  "scale": "dorian"
}
```

Genres are the five IDs above, tempo is 60..180 beats/minute, MIDI root is an integer 36..84, and scale is `minor`, `major` or `dorian`. Unknown fields such as audio URLs or executable score code fail validation. The descriptor is copied when selected. Changing the style selects that style's default track; adjusting a volume preserves an already selected custom track.

```js
const sound = new Soundscape();
sound.configure({style:'metal', master:0.6, music:0.4, sfx:0.7});
sound.setTrack(descriptor);
// Call from a real click, tap or keyboard action; no automatic startup sound.
await sound.enable(); // toggle() remains compatible with the original UI
sound.update(isPlaying, theme, run); // call once per presentation frame
await sound.preview({seconds:4}); // settings-button gesture, even while paused/terminal
sound.event(event); // pass the whole event so loss and victory differ
sound.pause();     // actual pause/focus loss: stop voices and suspend context
await sound.resume(); // explicit user resume after pause
sound.disable();   // adopt mute immediately; resume cannot re-enable it
sound.reset();     // new attempt: clear notes, cursor and cue deduplication
await sound.dispose(); // teardown: disconnect nodes and close the context
```

`getSettings()` returns style/master/music/sfx plus the current `trackId`; pass the four explicit configuration fields to `configure()` when restoring settings. `tone()` and the old `event(type)`/`update(active,theme)` calls remain compatible. An event name alone cannot distinguish a winning completion from a loss, so new code passes the full event. `update(false,theme,run)` stops backing music while allowing a terminal fanfare to finish; do not call `pause()` solely because a completed run is no longer simulating. An actual focus loss or hidden page should pause audio, including during the finale.

No sound context is created by ordinary frame updates. `enable()` reports false if context creation is unavailable or browser resume is denied. After browser interruption, request `resume()` through an appropriate user gesture; do not assume autoplay permission. A disposed instance cannot restart.

When restoring a profile with sound disabled, call `disable()` rather than toggling: it synchronously cancels preview and scheduled voices, invalidates pending activation, and creates no context. Only a later explicit `enable()`/`toggle()` can restore sound; ordinary game `resume()` preserves the mute preference.

`preview({seconds:4})` auditions the selected track for 1..8 seconds and returns whether gesture activation succeeded. The UI keeps calling `update()` while its settings dialog is open; preview temporarily permits music when the game is inactive or terminal. It uses the same bounded scheduler and gain buses. Each preview note is clipped to the deadline, so a stopped presentation loop cannot leave a long pad ringing past it. `previewActive` reports whether the audition is still active. Pause, reset, mute or disposal cancel it. A successful preview enables audio and leaves it enabled afterward; the caller decides whether to persist that preference. Preview does not resume or change the game.

Music uses the audio clock with a 120 ms look-ahead and at most four score steps per update. A long scheduling gap restarts at the current clock instead of queuing missed beats. There is no background interval. Voices stop at authored envelope ends, disconnect after ending, and are capped at 64. Repeated effect bursts are coalesced; disabling sound, pausing, resetting or disposing removes scheduled voices. A quarter-second locally generated noise buffer supplies percussion. These are resource bounds, not a measured guarantee about every phone or browser.

Tension reads live-cut state, trail length, one remaining life and boss warning/active state. It changes percussion density and note emphasis while leaving the track tempo and all gameplay state untouched. Failure uses a descending cue. Picture victory uses a six-note phrase of soft sine chimes with quiet octave partials, followed by a warm sine-chord bloom; the ending releases after about 2.3 seconds. The fifteen scheduled voices use gentle attacks and exponential tails on the existing effects bus, with no percussion, square-wave fanfare or extra audio context. Heritage and spend-network families and accepted campaign feedback retain their distinctive phrases. All ordinary wins take this same path even after the sample bank has loaded; explicitly published victory audio still takes priority. Repeated result frames do not replay the cue, and mute, effects volume, pause, reset and disposal retain their existing control over the ending.

## Completed-picture animation

The normal finale lasts 3.8 presentation seconds: a 0.85-second reveal opening, a tiny 1.4% picture arrival ease over 1.35 seconds, then tumbling paper confetti that fades away. Gameplay is already terminal and receives no extra ticks or rewards during this sequence. All world families use the same gentle paper motion with their own palette; equipment silhouettes, smoke and radial explosions have been removed.

The completed Solo picture fills the available game view with its original aspect ratio. Both Journey and ordinary campaigns stay on that picture indefinitely. The brief victory caption fades away and **Continue** opens results only when the player chooses it. **Keep picture** skips the effects without opening a menu. Returning through **View picture** keeps the exact earned artwork and does not repeat its celebration or award progress again.

There is no full-screen flash or continuous zoom. At most 72 paper pieces and eight small edge glints are drawn, clipped to the board. Reduced effects immediately shows the still picture, without particles or scaling. The finale has its own pause flag so a terminal game pause does not accidentally freeze it, while a hidden page/dialog freezes the presentation deliberately. Sound remains governed by the existing sound/effects settings.

```js
painter.setLevel(level, {seed}); // stable new picture, clears the previous finale
painter.startCelebration({levelId:level.id, seed, reduced});
painter.draw(ctx, run, dt, {
  fullReveal:run.status === 'won', paused:gamePaused, reduced,
  celebrationPaused:document.hidden || dialogIsOpen
});
if (!painter.celebrationStatus.active) showCompletedPictureControls();
painter.skipCelebration();
```

`draw()` also starts the finale once when it first sees a winning run and `fullReveal:true`, so existing callers keep working. The `celebrationStatus` getter reports active/finished, progress, phase, elapsed and duration. Repeated draws of the same completed run do not restart the animation. `setLevel()` resets presentation state for the next attempt. Background masks, permanent-wall art, enemies and transient border cues are absent at the final picture state. The run object is read-only throughout.

Changing skins never changes the board geometry. Signal zones and hangars are rendered from their authoritative state: a zone has a rectangle and emitter marker, suppression uses a dim dashed treatment, and a hangar has a landing-circle/H symbol. Impact-pulse fields show a faint full-radius area plus an expanding presentation ring. The ring does not determine hits or territory capture.

## Class appearance bindings

A theme may include an optional `classBodies` object, for example `{"scout":"scout-quad","carrier":"heavy-lift","bomber":"fpv-body"}`. It accepts at most 40 stable class-to-preset references. Unknown future preset IDs are allowed as references; URLs, objects, reserved names and executable data are rejected. Existing themes without this map continue to use `theme.player`.

`recommendedBody(theme, classId, fallback)` from `game/content.mjs` returns the mapped ID or the fallback (by default `theme.player`, then `neutral-marker`). This is a presentation recommendation, never a grant of cosmetic ownership. Before applying it, the UI must check both its registered preset catalog and the player's allowed appearances; a locked or missing recommendation falls back to an allowed starter or neutral rig. An explicitly imported player image still follows the existing independent image/rig binding and anchor warning.

The shipped FPV map uses three already-free silhouettes: the scout quad for Scout/Interceptor, the heavy multirotor for Heavy carrier, and the compact FPV body for the other classes. Atlas, retro and Spend Network retain their free bird, craft and helper starters. Fixed-wing, delta, night, falcon, vector and auditor cosmetics retain their existing unlock conditions. A body recommendation does not alter movement, dimensions used for collision, abilities, score or replay identity. Packs can supply different mappings through JSON without embedding a class-to-art table in the game loop.

## Level art and gallery

`scene-art.mjs` creates a deterministic 384×288 pixel composition from theme ID, level ID/revision and seed. Every campaign level receives its own arrangement. Dawn/heritage scenes vary hills, village roofs, fields, waterways, trees, windmills, towers and bridges. Retro scenes vary skylines, perspective grids and a small arcade display. Spend-network scenes place connected document cards over a city/grid composition. The same level/theme/seed produces the same picture without consuming simulation randomness. Imported background artwork takes precedence.

The gallery does not need a fake winning run:

```js
painter.drawGallery(thumbnailContext, {
  theme, level, seed, width:240, height:180,
  image:decodedImportedBackgroundOrNull,
  fit:'cover' // or contain
});
```

This draws a completed procedural scene or supplied decoded image directly; it never changes progress or produces a reward. Imported media still uses the shared header and full-decode import pipeline. The gallery caller owns whether a picture is unlocked and which recorded seed/theme to show.

## Authoring prompts

- “Create an original chiptune track descriptor named Amber Cartridge, in Dorian mode, with a moderate tempo. Return only the six supported descriptor fields. Do not quote a commercial melody or attach a remote sample.”
- “Propose five original synthwave/rock/metal track descriptors for a fictional pixel-art FPV campaign. Use genre mood and rhythm descriptions, no artist imitation. Explain which map gets each descriptor and why the tempo stays independent of player speed.”
- “Add a new heritage scene composition using the registered Canvas primitives. Keep the 384×288 design grid and deterministic level seed. Review the Ukrainian architectural and textile references separately before making a specific historical claim.”
- “Design a new celebration recipe using only bounded sparks, stitches or nodes. Specify its duration, skip behavior, reduced-effects still state and final clear-picture acceptance test. Do not change gameplay or award progression from the renderer.”

## Verification and references

`node --test game/test/audio.test.mjs game/test/rewards.test.mjs` covers user-gesture gating, descriptor/config bounds, gain independence, scheduling after a long stall, pause/resume/dispose, voice limits, cue deduplication, win/loss differences, deterministic genre arrangements, frame-independent celebration time, skip/reduced behavior, clear final pictures, seeded art variety, gallery isolation and render-only access to new terrain state. Audio tests use a controlled Web Audio double; Canvas tests inspect drawing commands and state invariance. They do not establish subjective sound quality, actual audio output, readability on every device or real mobile frame pacing. Live listening and device checks remain necessary.

The implementation follows the distinction between scheduling against the audio clock and maintaining a short scheduling window described by Chris Wilson. The score and instruments here are newly authored. [A tale of two clocks](https://web.dev/articles/audio-scheduling).

Oscillator envelopes, filter shaping and a locally generated noise source use the public Web Audio primitives illustrated by MDN. We did not copy its modem demo, melody or sample files. [MDN advanced audio techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques).

Explicit user activation, clear controls and recoverable browser audio state follow MDN's usage guidance. [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

Context suspension stops the audio clock; closing and releasing node references are separate teardown work. [AudioContext.suspend](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend), [AudioContext.close](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/close). Sources accessed 12 September 2026.
