# Round 08 — character collections and component recipes

This supplement adds **16 templates** for selectable and earned characters, configurable attachments, applied-asset review and deeper game planning. Round 08 brought the CLI to **104 templates**: 56 base + 16 source/asset variations + 16 animation variants + these 16 collection templates. The shared CLI now includes [Round 09 abilities and world templates](round-09-abilities-and-world.md), for 124 total. These are reusable instructions, not executed AI runs or evidence of completed art.

Use [Character Collection](../skills/xonix-character-collection/SKILL.md) for stable roster identity, context eligibility, unlock conditions, selection and asset exchange. Use [Animation Director](../skills/xonix-animation-director/SKILL.md) for the component motion itself. Its updated recipe guidance distinguishes **four rotor hubs with three blades each** from the number of hubs, and covers phase, spin direction, anchors, low-rate aliasing, pause and reduced motion. Wings, thrusters and pulses keep distinct motion recipes.

The [Round 08 character direction](../../docs/round-08-character-collection.md) and [gameplay plan](../../docs/round-08-gameplay-plan.md) explain the current design choices. The [motion lab](../motion-lab/README.md) documents the actual preview. Its [collection definitions](../motion-lab/collection-presets.json) and [evaluator](../motion-lab/collection.mjs) use an independent format; they do not extend the existing content-pack or media contracts and do not implement territory gameplay.

## Template index

Exact text, variables and reference requirements live in [round-08-character-collections.json](round-08-character-collections.json).

| ID | Purpose | Output mode |
|---|---|---|
| `collection-01-roster-recipe` | Stable identity, cosmetic variants, component references and collection scope. | Text plan |
| `collection-02-fpv-body-variants` | Compact Ukrainian FPV bodies with independently replaceable propellers. | Requested image edit |
| `collection-03-three-blade-recipe` | Hub/blade count, phase, anchors and visual-rate review. | Text plan |
| `collection-04-atlas-character` | A specific Ukrainian cultural/material character. | Requested image generation |
| `collection-05-retro-character` | Original 80s–90s craft with a clear small silhouette. | Requested image generation |
| `collection-07-exchange-asset` | Apply an actual replacement and verify the displayed switch. | Asset execution |
| `collection-08-context-selection` | Eligibility, selection and fallback across supported scopes. | Text plan |
| `collection-09-earned-reward-fixtures` | Understandable cosmetic rewards and duplicate-safe simulated results. | Text plan |
| `collection-10-selection-interface` | Preview/equip/locked/missing-art/focus states across inputs. | Text plan |
| `collection-11-applied-comparison` | Inspect actual swaps at normal and small viewport sizes. | Review |
| `collection-12-collection-readiness` | Separate data, media, application, motion and progress evidence. | Review |
| `collection-13-cosmetics-and-stats` | Identify explicit gameplay-class proposals without silently adding stats. | Text plan |
| `collection-14-gameplan-review` | Check the deeper game plan before implementing more logic. | Review |
| `collection-15-nonrotor-recipes` | Distinct wing, thruster and pulse behavior with clean cancellation. | Text plan |
| `collection-16-source-faithful-style` | Preserve accepted character identity through optional style derivatives. | Requested image edit |

## Concrete current collection vocabulary

The following IDs and labels come from the current collection definitions. The table describes authored collection roles, not whether a unique body image or production sprite exists. Read the visual presets and their actual review before claiming applied readiness.

| Family | Starter | Earned cosmetics |
|---|---|---|
| FPV FRONT | `fpv-body` — Daybreak FPV | `fpv-racer` — Skyline FPV; `fpv-night` — Night signal FPV |
| UKRAINE ATLAS | `ukrainian-bird` — Atlas bird | `ukrainian-falcon` — Falcon trim, currently a shared-bird-body trim |
| 1994 FOREVER | `retro-craft` — Tape runner | `retro-vector` — Vector trail, currently a shared-craft-body treatment |

Character IDs are stable across visual replacements. A new paint treatment or propeller recipe should not discard a player's collection identity. The collection definitions own availability and acquisition; renderer presets own body/attachment references. Do not insert image, animation or stat fields into a collection record that rejects them.

Current component recipe IDs live in [presets.json](../motion-lab/presets.json), with validation and pose sampling in [animation.mjs](../motion-lab/animation.mjs): `fpv-tri`, `fpv-two`, `fpv-four`, `night-tri`, `swallow-flight`, `falcon-trim`, `retro-thruster`, `vector-thruster`, `helper-guidance`, `audit-guidance` and `still`. Rotor `bladeCount` accepts 2, 3 or 4; `bladeShape` accepts `swept`, `tapered` or `paddle`. `phaseDegrees` is a cosmetic phase offset. `idleRps` is the baseline visual revolutions per second, `travelRps` adds a rate per normalized travel-speed ratio, and `maxVisualRps` caps the visual rate; none is physical rotor RPM or a gameplay travel-speed setting. The lab limits displayed phase steps to reduce sampled-motion aliasing. Use its actual anchor convention and parameter bounds when editing recipes.

The current UI separates inspecting a character from explicit Equip, and can save a choice for the context, theme or global scope in its isolated lab profile. Recipe/blade/shape/radius edits are temporary preview changes; they are not a saved collection format or a production export. The enlarged north-facing inspection view supports slower motion review. Palette and terrain controls remain independent of equipment, and applying a family look preserves equipment preferences. Verify actual painting/playback before describing these controls as evidence that a particular asset works.

## Simulated reward examples

These fixture IDs contain explicitly simulated `run.completed.v1` results in an isolated lab profile. They do not mean that a playable level was completed, a real save advanced or a real customer saved money.

| Fixture ID | Authored example |
|---|---|
| `fpv-first-clear` | One distinct FPV clear; satisfies Skyline FPV's first-clear condition. |
| `fpv-clean-map` | Relay Islands clear with zero lives lost and `relay-restored`; satisfies Night signal FPV's clean-relay alternative. |
| `atlas-heritage` | Heritage clear with `heritage-fragment`; satisfies Falcon trim's condition. |
| `retro-first-clear` | Two stars on `retro-l01`; insufficient alone for Vector trail's five-star alternative. |
| `retro-second-clear` | Three stars on different level `retro-l02`; together with the first fixture reaches five best-result stars. |

The actual definitions also give Night signal FPV and Vector trail alternative distinct-clear paths. Repeating a fixture must not inflate distinct-level or best-star totals. Earning a character and equipping it are separate actions; context eligibility still applies. Test a failure case, repeated event and context switch in addition to the happy path. Never reuse these lab fixtures as production telemetry or save data.

The preview/game mode boundary is **namespace segregation, not authentication**. Structurally valid local results can be rewritten; a changed flag does not prove a real run occurred. A production result/save adapter must supply trusted game facts and versioned content/ruleset identities before production unlock guarantees are possible. This collection preview does not implement that adapter.

## Resolve examples locally

Rendering only substitutes text and validates variables. To execute a requested image edit, inspect the actual reference and use the built-in image tool; preserve originals and save derived copies with their complete effective prompts. Do not treat a path written in a prompt as evidence that the file was inspected or generated.

## Application and readiness

For an asset exchange, record the stable character ID, actual source/parent file, component/preset changed and effective selected context. Inspect the painted result, including while paused; a successful image load can still display the wrong source, duplicate old attachments or fit the image poorly. Switching should clear old rotors, wings, pulses and other transient components while preserving the fixed motion/collider reference.

Compare compact/microtile, detailed-object and hybrid terrain with the same character, geometry and trace. Measure occupied pixels and live-trail clarity at the actual preview size. High visual propeller rates need aliasing review, and a steady reduced-motion view should preserve the central player cue. Native iPhone, controller and performance evidence remains separate from browser viewport inspection.

Preserve the user's configured turning policy: **immediate** and **grid-center buffered** movement are both intended comparison options. Use the motion lab's current README and tests for exact queue, release, reversal, alignment and mode-switch behavior; this guide does not define those semantics. Inspect cosmetic independence in each supported mode against that mode's own baseline. The same inputs can produce different intended paths between policies. A character, palette, terrain or animation-recipe change must not silently reset the mode or replace buffered movement with immediate turns. Record mode coverage with each review and keep this setting out of collection fields that do not accept it.

Track data validity, source provenance, generated concept, applied visual, played motion and simulated reward results separately. A contact sheet is not a working animation; a collection evaluator is not full game progression; a well-specified plan is not proven fun. See [Round 08 authoring checks](../evaluations/round-08-authoring-checks.md) for executed tool and package validation.

## Existing-state and optional-residue review prompt

“Show the actual Team freeze pickup interval using both a labelled prepared custom
rig and the current tank body. Hold moving-part clocks without dimming contact cues;
resume only at expiry. Compare real core checkpoints and paused/reduced states.
For optional enemy remains, use the shared cosmetic Settings preference and keep
warnings/projectiles/hit cues. Verify explicit Studio Show/Hide wins for that
preview, no player-save mutation, and exact native return focus. Report production
art adoption separately from renderer/host checks.”

“Revise the Poltava source through the image tool using the retained original and
museum text as reference only. Keep previous sources untouched, record all observed
versus requested geometry, and retain the exact revised source in a new immutable
collection revision. Do not call generated detail native pixel cleanup or cultural
approval; require separate board preparation and actor-contrast inspection.”
