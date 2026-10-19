# Round 08 — character progression and propeller presentation

Research and implementation review: 12 September 2026. This is a targeted source update and a collection-design brief. It does not add territory simulation, prove retention, audition audio or benchmark an engine. The [gameplay plan](../round-08-gameplay-plan.md) separates the working collection preview from the next proposed playable slice.

## What the reference actually supports

Reloaded supplies a strong collection loop: expose a picture, review earned medals, preview the full image and choose another level. In the [Pack 6 recording](https://www.youtube.com/watch?v=-qG4k6dkd-c&t=0s), gallery → image preview → gallery is visible at 0:00, 0:03 and 0:05. Earlier inspection verified completion, retained-life and per-level speed conditions. The [Round 07 audit](round-07-reloaded-ui-motion.md) documents those samples and their limits.

The inspected Reloaded footage does **not** establish earnable player-character skins, equipment stats or a character economy. Those are our extension. Nor do the videos establish player retention rates. The useful design hypothesis is that a visible, attainable next picture and a small mastery challenge encourage voluntary replay; this needs our own playtests.

The speed countdown is also not a universal failure timer. [Foreseen's gameplay](https://www.youtube.com/watch?v=HEM9_sQGRJQ&t=180s) continues at 3:00 and 3:30 after TIME reaches zero. Keep optional speed medals separate from main completion and offer a route to collection rewards without requiring perfect speed. Reloaded's observed pack gates have purchase/entitlement ambiguities; our lab deliberately contains neither purchases nor opaque star gates. [Round 06 gate evidence](round-06-reloaded-observations.md)

## Fresh primary sources: physical appearance only

The manufacturer lists the **Gemfan SBANG 4934** as a three-blade propeller and offers clockwise and counter-clockwise versions in the same pack. Another manufacturer listing, the **Hurricane 5127**, identifies three blades and several translucent color options. These are concrete references for blade count, handed shapes and material appearance; their performance marketing is not evidence for our game feel. [SBANG 4934](https://www.gemfanhobby.com/sbang-4934-pc-3-blade-props.html), [Hurricane 5127](https://www.gemfanhobby.com/5127-hurricane-pc-3-blade.html)

Three blades describe **one propeller around one hub**, not the number of drone arms. For our original four-rotor FPV character, author a body with four clear motor anchors and draw one three-blade propeller at each anchor. Inspect the propeller silhouette independently of the X-shaped frame. A cosmetic can change blade color, hub cap, attachment or glow without changing the simulation footprint.

Proposed visual treatment:

- In the collection card and large inspection inset, show the three distinct blades with intentional spacing and a readable central hub. The inset explains details that cannot survive at normal arena scale.
- In motion, use a restrained translucent rotor disc or short arcs when blades would alias. Keep the bright player center and direction more prominent than rotor effects. Blade animation is a stylized cue, not a physical RPM display.
- Compute visual phase from elapsed presentation time; do not advance a fixed angle per rendered frame. Reduced-motion mode can hold a static three-blade pose or omit the disc while preserving direction and input feedback.
- Store anchors, blade count, spin sign, phase offset, color and scale as presentation data. Do not infer steering speed, acceleration, damage or hitbox size from those fields. A visible spin-direction choice here does not certify a real aircraft motor configuration.

No real flight tuning, motor setup, payload, weaponization or operational tactic is specified. This research concerns the appearance of a fictional arcade avatar. The chosen blade illustration should be original artwork, rather than reusing manufacturer product photography as a game asset.

## Collection shipped in the preview format

The new [collection definition](../../authoring/motion-lab/collection-presets.json) is a separate, versioned lab document. It is not an extension silently inserted into the [content-pack contract](../../authoring/CONTRACT.md). The [pure evaluator](../../authoring/motion-lab/collection.mjs) reads only data and result records; it cannot change movement, collisions, terrain, score or artwork files.

| Family | Starter | Earned cosmetic | Authored unlock route |
|---|---|---|---|
| FPV Front | Daybreak FPV (`fpv-body`) | Skyline FPV (`fpv-racer`) | First distinct FPV level clear. “Racer” is a cosmetic identifier, not a speed bonus. |
| FPV Front | Same starter | Night signal FPV (`fpv-night`) | Clean Relay Islands completion with its relay objective **or** three different FPV level clears. |
| Ukraine Atlas | Atlas bird (`ukrainian-bird`) | Falcon trim (`ukrainian-falcon`) | Complete a heritage level and its fragment objective. This is a trim on the shared bird body. |
| 1994 Forever | Tape runner (`retro-craft`) | Vector trail (`retro-vector`) | Five best-result stars across distinct retro levels **or** three different retro level clears. Shared craft body, alternate visual treatment. |
| Business | Spend Sprite (`navi-avatar`) | Audit pulse (`navi-auditor`) | Complete the fictional spend-review case and resolve its anomaly. Shared helper body, alternate visual treatment. |
| Any context | Neutral marker (`neutral-marker`) | — | Always available as a diagnostic fallback. |

Spend Sprite is an original business helper, **not an official Coupa or Navi character**. The retained `navi-*` IDs are technical vocabulary from earlier drafts. No real client data, savings result or brand endorsement is implied.

The six supplied buttons are deliberately named **Simulate**. They submit complete, fixed test results for first FPV clear, clean relay map, heritage fragment, two retro clears and a fictional clean spend case. Applying all six unlocks all five earned cosmetics for review. Clicking one repeatedly does not manufacture progress. Unlocking never changes the equipped character automatically.

Character availability and ownership are separate: a bird can be owned while unavailable in an FPV theme. A profile may save choices at game, theme, case, challenge, level, map or combined scopes. More matching constraints win; ties use map → level → challenge → case → theme → game. An eligible saved selection takes precedence over an authored default, followed by the global neutral fallback. A stale or locked selection is skipped with a deterministic result.

## Progression that remains understandable

The supported criteria count distinct level clears or sum each level's best qualifying result-star count. Replays, renamed event IDs and different challenge/map variants of the same level do not inflate those totals. Optional filters require a particular scope, minimum result stars, a maximum number of lives lost, a duration bound or named objectives. Multiple conditions can be required together, and alternative routes can be offered explicitly. Locked cards expose the unmet counts and conditions.

These are modest, authored goals. There are no paid unlocks, random loot rolls, daily streak requirements, login timers or forced loss-recovery purchases. A level-clear route is offered beside selected mastery routes so players can progress through new content when a perfect run is frustrating. Accessibility assists should be explicit ruleset choices in the future game; their effect on particular challenge medals must be explained before the run.

The preview stores validated result facts, not an editable `unlocked:true` switch. Unique event and run IDs make repeat delivery harmless and conflicting duplicates invalid. Lab profiles accept only `simulated:true`; a future game profile rejects those fixtures. This is **mode separation, not authentication**: a future production adapter must produce results from the simulation and use a separate versioned save system. Browser-local JSON is not an authoritative achievement service.

The lab caps saved history at 2,000 result records and returns a visible error if that limit is reached. Corrupt, foreign-profile or unknown-version saves yield a fresh session plus a warning; the storage owner should preserve the old raw data before an intentional replacement. The evaluator never accesses localStorage. Long-running production progress needs explicit migration/compaction, rather than silently discarding event IDs and allowing replay inflation.

## Engineering source update

The official release page still documents **Phaser 4.2.1**, dated 9 July 2026. Use a pinned, tested release for the next proof. Generic API documentation can show a different documentation-version banner, so inspect the actual installed version before using renderer-specific APIs. No Phaser dependency was installed by this round's collection work. [Release record](https://phaser.io/download/release/v4.2.1)

Phaser exposes a per-frame `Scene.update(time, delta)` hook; the documented delta is smoothed and capped. Arcade Physics separately supports a fixed timestep. Neither fact makes our fill/collision rules deterministic automatically. Our recommendation remains an engine-independent territory kernel with its own tick contract, called by a thin Phaser scene adapter. [Scene API](https://docs.phaser.io/api-documentation/class/scene), [Arcade World timestep](https://docs.phaser.io/api-documentation/class/physics-arcade-world#fixedstep)

Phaser's FIT mode preserves the configured aspect ratio, and its input layer supports pointer, keyboard and gamepad input. Those are useful capabilities, not proof of fairness or performance on every device. Keep the whole 4:3 board visible and test the actual control mapping. [Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager), [Input](https://docs.phaser.io/phaser/concepts/input)

## Verification performed

`node --test authoring/motion-lab/test-collection.mjs` passes **18 tests** covering starter defaults, earned variants, alternatives and conjunctions, scope filters/precedence, immutable updates, repeat delivery, conflicting IDs, best-result counting, visual-only fields, profile isolation and corrupt saves. This validates the collection evaluator. It does not validate the UI's storage handling, real device controls, production art or future game simulation.
