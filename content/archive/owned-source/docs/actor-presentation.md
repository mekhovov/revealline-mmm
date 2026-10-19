# Actor and cut presentation

This pass changes rendering only. The simulation still owns positions, collision radii, capture, enemy behavior and replay results.

The inspected Reloaded reference frames show bright compact bodies, short motion tails, clear centers and thin secured boundaries against black concealment: [Pack 1](research/evidence/round-05/reloaded-pack1-0433.png) and [Pack 6 Level 7](research/evidence/round-06/reloaded-pack6-l7-114.png). A still frame does not establish animation timing or input behavior. The new silhouettes are original procedural pixel drawings, not extracted game artwork.

## Body, motion and scale

[`createActorPresentation`](../game/ui/actor-presentation.mjs) keeps a bounded previous-position cache and cosmetic clocks. Heading follows observed positions on new simulation ticks; `vx/vy` supplies only the initial orientation when available. Walking/treads use movement distance, while rotors and radar can idle. Pause, stun, dormancy and classic enemy freeze stop the relevant pose clocks. Reduced effects retain clear facing without banking, moving trails or capture pulses.

| Theme         | Default body vocabulary                                          |
| ------------- | ---------------------------------------------------------------- |
| FPV Front     | Tracked vehicles, quad rotors, radar arrays and a toothed eroder |
| Ukraine Atlas | Thorn beetles, patterned winged spirits and floral guardians     |
| 1994 Forever  | Arcade robots, compact comets and glitch machinery               |
| Spend Network | Walking invoices, parcels and linked accounting machinery        |

`microtile` reduces fine details but keeps tread/leg movement; `hybrid` and `props` retain highlights and larger body treatments. New themes with the existing `fpv`, `atlas`, `retro` or `navi` family inherit the matching presentation. The existing eight artwork slots and additional classic `contour`, `rover`, `eroder` slots remain independent replacements. Imported bodies face upward at zero rotation; the renderer rotates them with observed travel. Existing player body/propeller rigs are retained.

The normal body box targets 24–32 CSS pixels on canvases at least 480 CSS pixels wide, and at least 16 on ordinary phone-sized canvases (bosses may reach 40 CSS pixels). Logical caps of 64 pixels (80 for bosses) prevent unlimited enlargement on very small embedded canvases. At smaller sizes the cap can take precedence over the desired minimum. `BoardPainter.draw(..., {actorScale})` accepts a bounded cosmetic multiplier; it is not a physics setting or a new persisted player preference.

The player uses its existing animated rig with a separately bounded `playerScale`. Its contained image box targets 24–32 CSS pixels on desktop and at least 16 on ordinary phones, capped at 64 logical pixels. The current drone's transparent source margins make the visible body roughly 18/12 pixels at these minima; arbitrary replacement images can have different margins. Source rectangles are not cropped, so rotor anchors and non-square image proportions stay intact. The neutral fallback uses its visible triangle extent. Shield and queued-turn cues move outside the enlarged body, while the player contact ring stays at the authored `rules.playerRadius`.

The solo Phaser host passes `displayCSSWidth` from its visible game canvas into `BoardPainter.draw`. Its detached texture canvas has no displayed width and cannot supply this measurement. Direct-canvas hosts such as couch and replay theater retain the context canvas's `clientWidth` fallback; an unavailable or invalid measurement falls back to the logical board width. Resizing changes presentation size without changing simulation geometry.

A small light center marker and double-contrast radius outline remain at the simulation contact footprint independently of the larger body. Two nose pixels inside the body envelope reinforce heading, including for uploaded bodies. Functional light/plate colors are independent of `ink`/`paper`, which the dark R4 theme reverses. Warning/rejoining brackets, dormant-rover cues, freeze/slow icons and all terrain/pickup roles remain visible. Custom artwork does not remove these functional cues.

## Live cut and capture

The active cut has a dark contrast outline, a roughly 3-CSS-pixel colored body and a 1-CSS-pixel light center at ordinary display widths. Logical caps keep unusually small embedded arenas bounded. A bright scaled head remains visible with reduced effects. Its moving highlight stays on the final short section of the actual line. Enemy tails have at most three nearby points; there is no ambient particle field over hazards.

`cells.claimed` indices are copied into a bounded presentation effect. A brief low-opacity sweep and crisp inner perimeter touch those newly safe cells only, with no additional coverage or score. They paint beneath current actors, hazards and the live cut; a recent capture cannot wash over a new cut. All pulse pixels stay inside still-SAFE event cells, opacity is at most 0.2 and duration is below 0.65 seconds. Reduced effects remove this sweep. Paused gameplay does not advance it; terminal victory animation retains its separate pause/lifecycle handling.

## Original pressure extension

When the core supplies the optional `enemy-pressure-state.v1`, `classicView` returns an owned, frozen `pressure` display record. `AIM` shows a dashed amber line to the exact locked target; `CHASE` retains target brackets; `REST` removes the target and marks cooldown. Targets, phase and actor-clock countdowns come from the core, not animation prediction. Pause and freeze preserve the state; reduced effects retain the static warning. This is an original opt-in mechanic, not an observed Reloaded AI claim. Earlier actors gain no pressure fields or drawing.

## Occupied-raster inspection, round 40

The current drawing functions were rasterized with the bundled `@napi-rs/canvas` at actual display scales in a right-facing static body pose across seven roles × four themes × three detail treatments × three arena widths (**252 measurements**). Colored body pixels exclude badges, tails, nose/contact overlays, dark outlines and low-alpha fringes. At a **294 CSS-pixel arena**, occupied major-axis span is **14–16 pixels**, compared with **9–12** for the frozen v0.29.2 renderer. At **600**, it is **20–24** versus **13–24**; at **1152**, **20–40** versus **19–34**, including bosses. A contact-radius-0.25 fixture still measures 2.04/4.17/8 CSS pixels at those respective widths. The cosmetic body is deliberately larger, with its physical footprint separately marked; do not infer hit size from sprite edges.

Raw measurements, the tagged baseline comparison and sampled-pose sheet are retained in `.cache/round40/presentation-audit/`. This is actual CPU rasterization of current drawing code, not browser animation playback, hardware performance or a claim that arbitrary uploaded art has matching alpha bounds. The sheet contains sampled poses; live browser inspection remains separate.

## Verification

Run the focused checks:

```sh
node --test game/test/renderer-readability.test.mjs game/test/actor-presentation.test.mjs game/test/host-presentation-size.test.mjs game/test/classic-presentation.test.mjs game/test/wide-presentation.test.mjs game/test/rewards.test.mjs game/test/gallery-reduced-effects.test.mjs
```

They check motion/pose clocks, separate contact scale, theme geometry, replaceable role dispatch, bounded history, captured-cell effects and unchanged authoritative checkpoints. Player checks cover four rigs on legacy and wide boards, phone/desktop canvas sizes, independent actor/player scaling, non-square replacement images and intact rotor anchors. Canvas command recording establishes rendering behavior, not visual quality, browser frame rate or physical-device certification. Actual browser play and screenshots remain the visual review gate.

The actual-host sizing test selects the R2 featured chapter through the app, confirms its Daybreak FPV binding, and passes 306/600 CSS-pixel visible widths to a detached texture with `clientWidth=0`. It exercises resizing and demonstrates the old missing-handoff undersizing on that same texture. App, renderer and simulation run normally; Phaser, Canvas2D and image decoding are modeled boundaries, so these measurements establish image-box sizing rather than occupied raster silhouettes.
