# Round 08 — live preview checks

Date: 2026-09-12. Root used the connected in-app browser against the actual local HTTP page. The isolated `localhost:8767` test origin kept the existing `127.0.0.1:8767` user profile untouched. Tests used visible controls and DOM readouts; they did not inspect or modify browser storage directly.

## Collection and appearance flows

| Check | Observed result |
|---|---|
| Inspect locked Skyline | Inspection changed; Daybreak remained on board; Equip disabled; first-clear condition showed 0/1 |
| Apply first FPV fixture | Skyline unlocked; Daybreak stayed on board until explicit Equip |
| Repeat same fixture | Rejected as duplicate-event; no extra progress |
| Equip Skyline for first-flight context | Body loaded at 1312×1199; explicit saved-choice message; arena used the new body |
| Clean relay reward | Night signal unlocked with the authored clean objective result |
| Broader theme choice vs exact context | First-flight retained exact-context Skyline; relay used theme-wide Night; returning restored Skyline |
| Reload | Saved first-flight Skyline resolved again through the normal page load |
| Blade settings | Two/four/three-blade selections and paddle/swept shape changes updated the inspection label and painted rig |
| Ukrainian family | Apply family look selected stone/reeds/thorns and the loaded bird body; heritage fixture unlocked Falcon trim |
| Retro reward stages | Two stars on the first level left Vector trail locked at 2/5; three stars on a second level unlocked it at five best-result stars |
| Business family | Apply family look loaded the original helper with pulse/blink; fictional anomaly fixture unlocked Audit pulse |
| Art switching | All four families loaded actual body images, while terrain remained independently replaceable diagrams |

Five earned cosmetics were unlocked through the six authored simulated fixtures. These were UI fixture tests, not real game wins. Three body families have shared-body earned treatments; they were not counted as additional unique illustrations.

Two defects found during review were fixed: body labels differed between the collection and onboard readout, and generic Equip feedback did not explain a more-specific saved choice taking precedence. Independent source review also found wing phase discontinuity on speed changes and a pause pose snap; the animation now accumulates wing phase and preserves the paused cosmetic speed.

## Responsive layout

The existing viewport comparison embeds the current lab, with its expanded collection and animation controls. The frame's own layout readout measures the actual iframe document. This is a CSS check, not hardware emulation.

| CSS viewport | Arena CSS size | Default body slot | Result |
|---|---|---|---|
| 390×844 | 360.0×270.0 | 9 px | Whole arena visible; no horizontal overflow |
| 844×390 | 367.7×275.7 | 10 px | Whole arena visible with turn selector; no horizontal overflow; settings scroll at right |
| 1024×768 | 695.3×521.5 | 18 px | Whole arena visible with turn selector; no horizontal overflow |
| 1280×720 | 620.0×465.0 | 16 px | Whole arena visible; no horizontal overflow |
| 320×640 | 290.0×217.5 | 8 px | Whole arena visible; no horizontal overflow |

All five rows were rechecked after the turn selector landed. The short-landscape and tablet arenas were resized to make room for it. Body slot size is not measured opaque-pixel occupancy. Phone-size characters still need a deliberate low-resolution export and physical-device readability testing.

## Configurable turning

The user requested both modes during this round. The actual demo selector offers Immediate and Grid center + buffer; the authored default remains immediate.

Browser checks confirmed selecting grid mode disables autoplay, pauses, clears held commands and reports reset position (6.5, 6.5). A short right-key press releases with a zero-speed, empty-buffer readout. Enabling autoplay runs at the configured 9 cells/s with the grid-aligned route and an explicitly empty human buffer. Selecting immediate resets and pauses at (6.0, 6.0), with autoplay disabled and no queued command. Collection ownership/equipment remain present across these changes.

Autoplay does not test human buffering. Sustained command sequences were verified through the pure movement tests and independent timed traces: perpendicular turns, reversal, latest-command replacement, immediate stop/release, pause, restart off-center, remaining distance after a corner, boosted/slow frames, all four board edges and frame rates from 10 to 120. The grid's centers are n+0.5; its bounds include the outer cell centers. Immediate retains the earlier bounds. This is a movement comparison without trail, collision or capture simulation.

The root ran the combined Node suite: **51/51 passed** — 12 original motion/preset checks, 12 grid movement checks, 9 animation checks and 18 collection checks. Scope-feedback, label and continuous-wing fixes were separately reviewed. The final browser recheck confirmed the clearer broader-preference message and actual Night signal body with three blades at each motor.

## Source and automation evidence

The source review confirmed the three FPV bodies use independent motor anchors, image fitting preserves aspect ratio, missing art has a neutral fallback, and cosmetics cannot change authoritative travel speed. Source review of local background selection checked accepted image types, size rejection, asynchronous decode, object URL cleanup and retained-original behavior. The native file chooser was not exercised by browser automation; successful local-file selection is not claimed here.

All six body PNGs were inspected read-only for dimensions and alpha. The five new bound images have real transparency; the Daybreak source/copy is byte-identical. Rejected RGB checkerboard outputs were never bound. [Asset provenance](../../docs/concepts/round-08-review.md) records the generation attempts and accepted originals.

Separate [authoring checks](round-08-authoring-checks.md) cover skills, prompt rendering, media tools and the existing pack contract. Passing collection/motion tests does not establish territory-game correctness, controller support, native iPhone performance, complete production art, or a trusted real-results adapter.

Final integration checks: 152 local Markdown links across 25 current skill/review/guide documents resolve; all five new bound body images are byte-identical to their accepted native originals. The strengthened off-center grid trace test was rerun after its final change: 12/12 grid tests pass. Syntax was rechecked after the keyboard-repeat guard fix. The updated main demo was refreshed at the isolated test origin with the full collection available for comparison.
