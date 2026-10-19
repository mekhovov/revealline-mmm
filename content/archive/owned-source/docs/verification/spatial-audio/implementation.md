# Spatial sound implementation record

> Historical completion and remaining priorities as reviewed 1 October 2026: [audio plan snapshot](../../spatial-audio-plan.md). The entries below are chronological evidence; older blockers and packaging policies may be superseded.

## Phases

1. Baseline: isolated managed checkout of current main `321408a3cfd75ae230d760f39fb692503652601a`; preserve the original working directory. Inspected runtime actors, capture and terrain events, replay ownership, multiplayer hosts and existing audio transport. Acquired three official CC0 packs and preserved used originals/licenses.
2. Infrastructure: presentation-only `FeedbackDirector`, local PCM bank, bounded voices, asynchronous preload with no delayed event replay, per-source gains/stereo, independent menu bus and preferences. Existing published-asset aliases remain supported; music catalogue and save/replay schemas remain unchanged.
3. Integration: Solo, Versus, Team, company player and Replay Theater call the shared director. Gameplay-event identities are per run, tick/time/index. Versus has two decorative slots per board; shared Team sources use nearest active listener once. Existing simulation commands are unchanged.
4. Presentation: three capture sizes, material contact variations, body movement families, separate result/terrain-state signatures, independent menu toggle/volume, cell-clipped reveal gestures and gate release pulses. Existing win/loss presentation durations are unchanged.
5. Qualification: focused tests and native observations recorded below. Complete release qualification remains required before immutable publication.

## Coverage matrix

| Authority | Feedback |
|---|---|
| Moving player body | Rotor/motor, wing/cloth, grain/paper, wheel textures; body override remains independent of ability |
| Moving field, border, contour enemies | Distance gain, screen-position pan, source retirement; no decorative idle or blink sounds |
| Ground rover | Dormant quiet; warning, activation, cancellation, moving layer |
| Eroder | Preparation warning, actual erosion, blocked erosion; changed terrain reactivation |
| Lane/relay encounter | Warning/opening/phase/stage events; final run result supersedes capture ending |
| Combat patrol | Lock, fire, impact, cancellation, elimination, projectile removal |
| Team threats | Warning, committed attack, launched/intercepted/cleared impact, recovery, down/revive, rescue, shared support |
| Walls/foundations | Blocked held-direction transition or authoritative capture stop; no repeating collision while held |
| Slow terrain | Entry/release, active texture; safe captured cells no longer emit |
| Signal zone | Entry/exit and authoritative suppression/recovery; one positioned texture per zone |
| Directional field | Movement-dependent flow/resistance rate |
| Relay gate | Release cue and short safe-cell pulse; passability remains immediate |
| Pickup/hangar | Successful supply, class switch, rejected action, deployment, shield/scan/pulse |
| Picture capture | Claimable-area tiers; closure + reveal + material gesture; terrain neutralization |
| Results | Start/retry, damage, respawn, loss and victory |
| Menus | Keyboard navigation, confirm/back; independent persisted enable + 35% default volume |
| Replay/practice | Existing controlled subject; replay pause/restart/inactive cleanup; historical events never replay after decoding |

All twelve Journey material entries select a material profile from their registered source theme, with legacy FPV/Atlas/Retro/Spend Network and custom-family fallback. Source assets are shared to keep memory bounded. This is not a claim of individually recorded vocalizations for every skin.

## Verification evidence

- Focused sound/mixer/render/offline suite: 115 tests passed (audio lifecycle, published aliases, attenuation, capture sizes, per-board deduplication/fairness, freeze/frame stability, storage defaults and binary provenance).
- Content and presentation validation passed, including English/Ukrainian localization.
- Native Chromium 154 / macOS: final 42-asset bank decoded 42/42 in the production audition page.
- Native shared-master probe at 48 kHz, 2026-09-29T08:06:23Z: all six checks passed; initial/mid-play mute and zero volume measured zero; quarter-volume RMS ratio 0.24965009; restored ratio 0.99944865; owned context closed.
- Local production build passed (1818 files); all 42 WAV files plus the bank module are now in the core offline cache, and their built bytes match source. See `build.json`; this is packaging evidence, not an immutable release certificate.
- Native Solo keyboard run completed the first mission: 34.3% coverage, 8160 score, three lives retained, no console errors. Master was muted, so this verifies gameplay/presentation only.
- Native Solo booted and showed Audio → Menu sounds enabled, Menu volume 35. Disabled/20% settings survived reload; enabled/35% was then restored.
- The initial full repository run exposed stale expectations/imports and an initial new fake-DOM compatibility failure; subsequent inspection also found new Team/Versus initialization regressions, corrected in the radio follow-up below. The new widget was corrected to use normal span elements. The broad run was stopped after failures and a pending Couch fixture; its output is not a green release gate. Replay/offline integration subsequently passed 19 tests, and the two Team reveal tests plus paused-music effects regression passed independently.
- Baseline evidence: main's combat adapter test imports missing `game/ui/player-locator.mjs`; continuous-host asserts historical session v4 while current runtime emits v6; boot build fixture omits `authoring/motion-lab/animation.mjs`. These require separate qualification/triage.
- Offline audit caught WAV references missing from the core cache. The scanner now follows WAV literals in the bank; a dedicated closure regression preserves essential effects while excluding source originals and optional music.
- A temporary full baseline extraction exhausted disk space. Only this task's incomplete `.cache/main-baseline` extraction was removed; user projects and existing worktrees were preserved. Subsequent checks use bounded fixtures.

## Release gate

Do not mark the sound design fully qualified from modeled or native digital checks alone. Remaining acceptance includes matched-level subjective audition, speaker/headphone and native device playback, sustained listening, and a fully green exact-source release gate. The intended attenuation and budgets are implemented policy, not subjective approval. Keep a draft review available while those gates remain open; do not publish a production release certificate claiming they passed.

## FPV radio follow-up — 29 September 2026

- Add original ESC-style startup/retry cues (explicitly not a real drone recording) and official EdgeTX English/Ukrainian “Armed” recordings. The EdgeTX GPL-2.0 assets have a pinned upstream revision, preserved unmodified sources, processing recipe and full license distributed through the Credits page.
- Speech has independent persisted enable/volume controls (35% default), one shared voice, foreground placement, urgency interruption and SFX lifecycle cleanup. Non-FPV bodies do not speak; replay silent starts stay silent. No unsupported battery, telemetry, disarm or mode claims are announced.
- Correct the earlier broad actorStyle insertion: it read uninitialized appearance state in Team/Versus routing. Actor hints now exist only in feedback calls, leaving route/save contracts unchanged. The actual host cohort passed 15 tests; cross-mode entry passed 16; Team Next passed 2. Company teardown fixture now verifies retiring the new menu/radio controls.
- Native Chromium decoded 46/46 assets. Solo radio off/20% survived reload while menu remained on/35%; restored radio on/35% afterward. Native Versus entered both running boards, Team entered a shared arena and paused after capture; no console errors observed. These are browser observations, not physical-device or subjective listening results.
- Updated focused sound/master/preferences/offline/company/replay cohort passed 114 tests; the 17-case director cohort includes a successful twenty-minute simulated two-board voice/lifecycle soak. The bank totals 1,431,432 bytes (~1.37 MiB, ~4.10 MiB decoded at 48 kHz). File inspection found no clipped PCM samples; this does not certify mixed-output headroom or listening quality.
- Targeted baseline reruns reproduced 17 failures on the original main source across route expectations, session v4/v6 expectations, Team teaching-preference writes, controller ownership and a missing actor-artwork fixture. See `radio-baseline.json`. Other full-suite failures and timeouts are not automatically classified as baseline. The broad run used 60-second file timeouts for diagnosis and included sources subsequently repaired; it cannot be an exact-source release certificate.
- A real CC0 startup-click recording was found at https://freesound.org/people/LudwigMueller/sounds/329545/, but its original requires login and it is not a verified Betaflight ESC melody. It remains a research candidate, not a bundled sample.

Release remains held for unresolved full-suite qualification and subjective/device listening. Neither the original 42-sound evidence nor the new radio checks close those gates.

## Repeated-cue comfort revision — user listening feedback

- Replace confirm with edited Kenney UI Audio clicks; replace sharp scratch/maximize gestures with filtered scroll/pluck/drop ingredients. Three variants each for confirm, paper and pickup; all used CC0 originals are retained. Capture tiers use a brushed seal rather than arpeggios, equal RMS with longer/broader texture. Lower routine contacts and closure; suppress redundant closure when capture supplies the seal.
- Measured file RMS: confirm −34.8 dBFS (previous −13.5), paper −41.2 (previous −13.8), pickup −32.4 (previous −11.2); all reveal tiers −37.0. These values describe PCM, not perceived loudness or comfort approval.
- Movement loops were about −30 dBFS before additional gains of 0.10 player/0.18 enemy. New rotor/motor/wheel loops are −21 dBFS with near gains 0.25/0.30 and stronger midrange; this raises near movement roughly 17/13.5 dB respectively. Correct FPV field enemies selecting wheel textures. Reserve a moving player and nearby enemy before filling decorative slots; preserve the four-layer ceiling and distance curve.
- The audition's player was stationary and therefore silent. It now moves, supports body selection, and shows actual active source names. Native browser decoded 52/52 assets, displayed player/enemy rotor sources, switched the player to wings, and retired the enemy at the distance cutoff. This is scheduling/decoding evidence, not a claim to have listened through the user's speakers.
- Current focused cohort: 117 passed; current Team/Versus actor and cross-mode entry cohort: 31 passed. Focused coverage includes crowded-board source reservations, variation-wide cooldowns, capture-layer coalescing, radio lifecycle and the simulated twenty-minute soak. Current bank: 52 runtime assets, 1,453,856 bytes (~1.39 MiB; ~4.16 MiB decoded at 48 kHz). See `comfort-file-inspection.json`; older file-inspection evidence is historical.
- Explicitly retain the EdgeTX license, provenance and unmodified recordings in every mode's offline closure. Ordinary Credits links are not dependency roots. The new closure regression passes.
- Stop the superseded broad diagnostic run after source changes; no exact-source full-suite pass is claimed. Broader Team Next fixture tests also expose unresolved cancellation/preparation waits. Keep the release gate open.

- Current packaging build passed: 1,833 files; 52 runtime WAVs plus bank, radio sources, provenance and license total 57 effects entries in the core cache. Built effects/modules match current source; license HTML has the standard offline installer prefix. See `comfort-build.json`. Lint, formatting and content/presentation validation passed. This remains local packaging evidence with `sourceRevision: null`.

## Optional movement layer — second listening revision

- User feedback rejected the louder tonal movement mix. Replace six short pitched/pulsing loops with soft filtered broadband textures, 3.92 seconds each with an 80 ms seam overlap. Actor sources target −25 dBFS RMS; grain/flow target −29 dBFS. At the new 50% movement bus default, actor playback is roughly 9–10 dB below the preceding audition. No subjective comfort approval is inferred.
- Add independent persisted Movement sounds and Movement volume controls in Settings → Audio (`revealline.movement-audio.v1`, enabled at 50%). Stop existing actor voices on opt-out/zero, reject new ones, resume eligible moving bodies on opt-in; preserve foreground cues, environmental textures and gameplay behavior.
- 119 focused tests pass, including movement mute, mixer independence, storage defaults, replay read isolation, lifecycle and voice limits. Browser observations: both actor sources retire/reappear on toggle, all 52 files decode, disabled/25% persisted across reload while menu/radio remained enabled/35%. Restored movement enabled/50% afterward; paused music restored. Ukrainian controls visible in `movement-settings.png`.
- Current bank is 2,575,136 bytes (~2.46 MiB transfer, ~7.36 MiB decoded at 48 kHz). `movement-file-inspection.json` supersedes prior loop measurements. Earlier build receipts remain historical until the current packaging check is recorded.

- Current movement packaging build, lint, formatting and validation passed (10,857 localized messages). All 52 runtime WAVs and the new movement preference module are in the core offline cache and match source; see `movement-build.json`. This supersedes prior packaging evidence for the movement revision and remains a local build, not an immutable release certificate.


## Recorded movement revision — 2026-09-29

User rejected the generic broadband actor sounds. Five real CC0 Freesound HQ preview recordings now replace rotor, wings, grain, wheels and motor; all source bytes, creators, page/preview URLs, licenses and hashes are preserved under `authoring/audio/revealline-v1/originals/freesound`. Production is reproducible offline from `produce.py` plus `recorded_movement.py`. PCM masters are derived from MP3 previews, not lossless source originals. Current bank: 52 files / 2,827,936 bytes (~8.1 MiB decoded at 48 kHz), within budgets.

Wings and paper use spaced recorded gestures; mechanical bodies use crossfaded recordings. Isolated source handling spikes are softened. Audio menu movement enable/volume, spatial attenuation, voice priorities and warning behavior remain unchanged. No simulation modules changed. Arcade audition family selection was corrected (it previously demonstrated rotor instead of motor).

Verification: 119 focused audio/preferences/director/replay/offline tests pass (`.cache/recorded-movement-tests.log`). Native audition decodes 52/52; all five selected player voices confirmed; mute removes player/enemy voices and reenabling restores them; no browser console errors. See `recorded-movement-file-inspection.json` for PCM measurements and `recorded-movement-audition.png` for visible fixture evidence. Prior test and release limitations remain in force; no 20-minute speaker/headphone approval is claimed.

Recorded-movement packaging completed: 1,834 files, all 57 effect/license/source entries in the core cache verified against final source bytes. Exact distribution and offline IDs are in `recorded-movement-build.json`. Re-running production reproduced all 52 WAVs byte for byte. This remains local packaging evidence, not an immutable release.

## Actor-wide recorded movement mapping — 2026-09-29

Extend the user-approved five recorded ingredients to explicit assignments for all 28 player bodies, 28 world/enemy combinations, 12 Journey palettes, company recipes, Team threats and combat scouts. Export the coverage matrix under `authoring/audio/revealline-v1/actor-movement-coverage.json`. Unknown custom artwork retains a recorded role/family fallback. Stationary bosses retain their authoritative event cues without idle sound. Equipped class and replay FPV appearance now choose the visible body; freeze/dormant/inactive details suppress motion loops. No simulation or source audio files changed.

126 focused audio/preferences/director/profile/company/replay/offline tests pass. Catalogue tests compare the explicit player map against the shipped presets and exhaust all world/enemy combinations; integration tests move each mobile enemy role and combat scout, then verify authoritative movement suppression. Global lint passed. Native audition: 52/52 decoded; heritage swallow/moth uses wings, weaver/serpent uses paper, document rover uses wheels, stationary lane emitter stays quiet. Full-suite and sustained physical listening qualifications remain open.

Actor-movement build passed: all four changed/new runtime modules match source and are in the offline core cache. Exact identifiers are in `actor-movement-build.json`; the 52-file recorded bank is unchanged. Global formatting and lint passed. Audition evidence is `actor-movement-audition.png`.


## Full-bank volume calibration — 2026-09-29

Measured all 52 effects and found previously uncalibrated action/radio/ESC families, with short sections up to 25.6 dB above their new role target. Replace the partial RMS policy with explicit whole-bank maximum rolling 50 ms RMS calibration plus gentle one-shot transient shaping and sample-peak limits. Movement receives scalar gain only. Preserve sources, cue duration, priority, spatial behavior and saved volume preferences. All repeated variants, capture tiers, radio locales and ESC cues now match within 0.6 dB within each group. Fix alternate confirm audition buttons bypassing the menu bus.

127 focused tests pass, including direct packaged-PCM loudness/peak/variation regression checks. Global lint and formatting pass. Browser decodes 52/52 with no console errors (`normalized-audition.png`). `normalization-measurements.json` contains previous/current file measurements and 192 kHz oversampled peaks; loudest one-shot oversampled peak −19.3 dBFS. Bank is 2,827,664 bytes. Measurements do not certify subjective loudness matching or sustained speaker/headphone comfort. Earlier release limitations remain open.

Normalized-bank packaging passed: 1,835 files; all 57 effect/license/source entries match final source and offline-cache hashes. Exact distribution/build identifiers are in `normalized-audio-build.json`. Regeneration reproduces every runtime WAV byte for byte.

## Lifecycle and native qualification — 2026-09-29

Retry, run replacement and backward seeking stop board-owned cue tails and clear that board's cooldowns. Pause stops transient gameplay sounds without cutting off terminal victory/loss cues. Restored movement loops now seek with their actual playback rate. Menu and other-board voices remain independent. Three director regressions cover these cases.

The Team Next cancellation fixture now waits beyond the controller-confirm compatibility echo window before sending its deliberately keyboard-driven Next action. This repairs the fixture's input timing; production controller semantics are unchanged. Focused audio cohort: 130 passed. Team/Versus appearance and Team Next cohort: 36 passed, no failures or skips. Lint and formatting passed.

Added a native OfflineAudioContext mix-headroom check to the audition. Six SFX-only overlap scenes use actual decoded assets, four movement layers, maximum bus gains and no compressor. Highest stereo peak: −19.46 dBFS; all six stereo and averaged-mono renders remain unclipped. This is digital SFX headroom evidence, not a music mix, physical-device test, or subjective listening approval. See `native-mix-headroom.json` and `.png`.

The 1,835-file production build passed. All 57 effect/license entries match offline-cache hashes; non-HTML effect assets and relevant runtime modules match source (license HTML receives ordinary build transformation). Exact identities are in `lifecycle-build.json`.

Native offline smoke: on a fresh local origin, installed Solo Starter through the game's download UI, confirmed “ready offline”, stopped the task-owned HTTP server, reloaded the game, enabled sound and completed First Return with 67.1% capture, 15,980 points and three lives. No browser warning/error logs. `offline-native-game.png` records the result. This verifies starter gameplay with sound enabled and unavailable origin, not subjective audibility of every asset or all optional chapters.

The fresh official repository suite has encountered the previously reproduced v34–v37 bootstrap route assertions and host readiness timeouts. It cannot currently certify a green exact-source gate. Latest status is in `qualification-status.json`; no unrelated gameplay assertions were weakened. Sustained human speaker/headphone listening and physical/native-device qualification remain open. PR #794 is draft and unallocated: the current coordinator-owned workflow must allocate its immutable release slot before publication.

## Prioritized recording polish and combined-PR qualification — 2026-09-29

At the user's request, prioritize distinct recorded materials and real hardware before release preparation. Add ceramic, wood, ratchet and bell movement gestures, with lower calibrated targets and long gaps. Map pottery/chest/basket/bell bodies, ceramic/riveted Journey materials and mechanical eroders to these recordings. Existing approved rotor, cloth, paper, wheel and motor ingredients remain. An audition candidate used actual Orqa launch beeps extracted from qubodup's CC0 recording (upstream public-domain DVIDS 1005552, Sgt. Max Elliott). Firmware is unspecified; these must not be described as verified Betaflight power-on tones. The user preferred the previous startup sound, so both original synthesized ESC cues were restored byte-for-byte; the Orqa recording is research-only. No Bluejay firmware or melody was adopted. The equipped heavy-lift/fixed-wing/delta body now also receives its proper FPV launch cue.

56 PCM assets total 4,479,040 bytes (~4.27 MiB transfer; ~12.8 MiB decoded at 48 kHz). Production from preserved sources reproduces every WAV byte-for-byte. Licenses, source links, SHA-256 and exact editing recipes are retained. New loops are sparse gestures, not additional simultaneous voices; the existing four-layer ceiling, spatial policy and independent Movement controls apply.

Final scoped audio/preferences/director/profile/company/replay/offline cohort: 135 passed, zero failures/skips. Team/Versus appearance and Team Next cohort: 36 passed, zero failures/skips. Content/localization/presentation validation, lint and formatting pass. Native browser decodes 56/56, reports ceramic/wood/bell player and ratchet enemy voices, and has no warning/error logs. Seven native OfflineAudioContext SFX-only overlap scenes remain unclipped; highest stereo peak −17.73 dBFS. `polish-native-mix.json`, `polish-native-audition.png` and `polish-reproduction.json` bind these observations; no subjective listening or music-mix certification is claimed.

Full-suite triage: preserve the failing lifecycle diagnostic, stopped before new source production. Rerun its exact failed test names against current main 321408a3c using a read-only symlink mirror with base blobs for changed files. 45/47 failures reproduce on main. The two remaining host-readiness cases pass on both baseline and candidate targeted reruns (2 passed / 25 filtered skips), consistent with timing sensitivity rather than proof of absence of intermittent defects. One additionally selected foundation-feedback caption test fails identically on main due to the existing SUPPORT READY suffix. `polish-baseline-triage.json` records these limits. No full-suite pass or blanket waiver is claimed, and unrelated gameplay tests were not weakened.

The combined PR contains all audio changes from this task. Merge/publication still depends on the repository's release-slot allocation; unallocated product PRs receive `release-train-hold` and fail the required release-ready check. Sustained human listening and physical/native-device qualification remain separately open. This implementation and its targeted evidence are available for review; an unallocated branch is not an accepted immutable release.

User steering: preserve the previous original startup/retry (both byte-identical to 29467477b); 35 affected tests pass after restoration. The seven-scene native mix and reproduction receipt above preceded restoration and are historical candidate evidence. A new combined PR will incorporate frozen #795 head 81df80dda259ba8e1cef5378af1cec91260eb51e without modifying #795. Final standalone build was stopped before integration; combined-source build/receipts supersede it.

## Installed audio follow-up — 30 September 2026

After PR #851 merged, the [installed audio qualification](offline-ready-qualification.md)
verified an exact-commit build with the optional spatial sound pack, origin-server-offline
Solo capture/win/Next/damage, and zero missing/corrupt selected files. PR #858 also
bounds failed recording retries: 120 frames now produce one failed request instead
of 120. All 167 integration checks pass. Sustained listening, physical devices and
canonical immutable release/public acceptance remain separate outstanding gates.
