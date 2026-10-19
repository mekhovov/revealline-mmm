# Round 08 — small characters, independent motion, earned appearances

The [live motion lab](http://127.0.0.1:8767/authoring/motion-lab/) now demonstrates animated propellers, three FPV bodies, characters for all four theme families, explicit inspect/equip controls and a working cosmetic collection evaluator. This remains an isolated design sandbox: movement and presentation work, while territory capture, enemies, lives and actual level wins await the [gameplay implementation plan](round-08-gameplay-plan.md).

## What to try

Use **Turn policy** above the arena to compare **Immediate** and **Grid center + buffer**. Switching resets and pauses the study and disables autoplay; hold an arrow/WASD key or a direction button to begin. Grid mode keeps the latest held direction until the next cell center, including reversals. Release all directions to stop and clear it. A queued turn gets a visible target marker. Autoplay follows its authored route and does not simulate human buffering. The setting is also configurable as `motion.turnPolicy` in the presentation presets.

For an obvious comparison, reduce Cruise speed to **3 cells/s**, move along a row, then hold a perpendicular direction before reaching the next center. Immediate turns at once; grid mode continues to the marked center first. Hold slow makes that waiting interval longer.

1. Keep Daybreak FPV at its default 1.25-cell body slot. In the enlarged inspection view, compare two, three and four blades, swept/tapered/paddle shapes and rotor radius. Slow inspection makes the individual blades readable while the board character stays small.
2. Inspect locked Skyline FPV. Its body is visible in inspection while the arena keeps the equipped character. Under Test progression, apply the first FPV clear fixture, then explicitly Equip Skyline.
3. Apply the clean relay fixture to unlock Night signal FPV. Save a choice for this context or the whole FPV theme; switch contexts to compare. A more-specific saved choice wins over a broader choice. Ownership and equipment survive reloads in the separate browser test profile.
4. Select each palette and use Apply family look to bring in its matching terrain family and starter/equipped character. Compare Microtile, Props and Hybrid with identical rectangles and movement.
5. Try the heritage, two retro and fictional spend fixtures. They demonstrate objective conditions and best-result stars across different levels. Reapplying a fixture cannot add progress twice. Reset test collection is available when you want to start over.
6. Use Local background for your own PNG, JPEG, WebP or GIF, then compare contain/cover and opacity. This preview uses the local file without editing, uploading or persisting it. Persistent media import and optional AI styling remain in the separate authoring workflow.

The [lab README](../authoring/motion-lab/README.md) explains keyboard/touch holds, pause, reduced motion, local file limits and exact manifest fields. The [viewport comparison](http://127.0.0.1:8767/docs/concepts/round-07-device-preview.html) embeds the current lab at five CSS sizes; it is not physical-device emulation.

## The current roster

There are **nine themed appearances plus a neutral fallback**: four themed starters, five earned variants and the neutral starter. Six separate body images supply these appearances; three earned treatments deliberately reuse a body with different attachments/effects. Five body images are new this round.

| Family | Starter | Earned example | Visual change |
|---|---|---|---|
| FPV FRONT | Daybreak FPV | Skyline FPV: one distinct FPV clear | Separate compact protected frame, individually positioned motor hubs |
| FPV FRONT | Daybreak FPV | Night signal FPV: clean relay objective, or three distinct FPV clears | Separate open dark frame and its own motor rig |
| UKRAINE ATLAS | Atlas bird | Falcon trim: heritage fragment objective | Shared bird body; alternate animated wing treatment |
| 1994 FOREVER | Tape runner | Vector trail: five best-result stars across levels, or three distinct clears | Shared craft body; alternate exhaust treatment |
| NAVI NETWORK | Spend Sprite | Audit pulse: resolve the fictional spend-case anomaly | Shared original helper body; alternate pulse/highlight treatment |

Spend Sprite is an original business helper concept, **not verified official Coupa Navi artwork**. Falcon trim is a name for a visual treatment, not a newly illustrated falcon species. Skyline and Night names confer no speed or stealth advantage. Current Ukrainian drone bodies use blue/yellow accents and no Z markings.

## Propellers and other animation

The FPV rig separates four motor hubs from blade count: the default has **three animated blades on each of four hubs**. Body, anchor positions, phase, spin direction, radius, blade shape, colors and speed response can be replaced independently. Real three-blade propellers are a useful visual reference, including Gemfan's [SBANG 4934](https://www.gemfanhobby.com/sbang-4934-pc-3-blade-props.html) and [Hurricane 5127](https://www.gemfanhobby.com/5127-hurricane-pc-3-blade.html); these references do not establish flight physics for the game.

The renderer now supports rotor, wing, thruster, pulse and blink components through **11 named recipes**. Movement direction and speed drive presentation without feeding body banking or attachment size back into controls. Visible rotor phase is sampled conservatively to reduce apparent reversal; it represents activity rather than physical RPM. Enlarged inspection, pause and reduced-motion states are part of the authoring review.

Live blade/shape/radius edits are temporary. To retain a reviewed change, edit [presentation presets](../authoring/motion-lab/presets.json). Collection identity and unlock rules live separately in [collection presets](../authoring/motion-lab/collection-presets.json). Existing bodies, anchors and attachment recipes are independently replaceable; new component behavior still needs a registered renderer and tests.

## A framework that can grow without confusing its layers

Keep five boundaries explicit:

| Layer | Current responsibility | Next integration |
|---|---|---|
| Game content contract | Versioned draft rules, roles, levels and capability declarations | Implement accepted registered rule primitives in a pure game kernel |
| Media library | Preserve originals, derivatives, hashes and semantic role bindings | Integrate approved media into a game loader/editor |
| Presentation manifest | Body sources, attachment rigs, recipes, palettes and terrain treatments | Production sprite exports, UI/audio bindings and renderer adapter |
| Collection evaluator | Eligibility, deterministic conditions, saved-choice resolution and duplicate-safe result evaluation | A real results adapter and a separate game save namespace |
| Authoring skills | Plan, generate/edit, bind and review assets with provenance | Repeat the same workflow for new packs and capabilities |

Eligibility can match game, theme, case, challenge, level and map. Omitted scope fields are wildcards. More constrained choices win; the documented field priority resolves equal specificity. Unlocking never automatically equips a character. Missing or unavailable art has a visible fallback; replacement art does not replace stable collection IDs.

The lab's six result fixtures are explicitly simulated. Mode flags and separate namespaces prevent accidental mixing; they do not authenticate user-editable local results. Future real rewards must originate from the game-result adapter with versioned content, ruleset and run identity. A new enemy or capture algorithm cannot be implemented merely by adding an image or a prompt.

## AI skills and applied examples

Eight project skills are installed locally: Theme Designer, Asset Creator, Background Stylist, Animation Director, Character Collection, Level Designer, Audio Director and Pack Reviewer. The [authoring guide](../authoring/README.md) is the entry point. The new [Character Collection skill](../authoring/skills/xonix-character-collection/SKILL.md) coordinates roster identity, eligibility, reward conditions, replacements and review; Animation Director owns attachment behavior.

The shared prompt CLI now offers **104 templates**, including [16 new collection/component examples](../authoring/prompts/round-08-character-collections.md). The five new body images are actual executed image-generation examples, bound to the lab. Template rendering by itself only produces instructions; it does not generate art or invoke AI. Uploaded-image styling remains an explicit authoring action that preserves originals and creates a reviewed derivative.

See the [asset review and prompt provenance](concepts/round-08-review.md), [authoring checks](../authoring/evaluations/round-08-authoring-checks.md) and [live-preview checks](../authoring/evaluations/round-08-preview-checks.md). The images are high-resolution transparent concepts with approximate attachment anchors, not finished small sprite atlases or a complete game asset set.

## Rules and challenges: the next useful step

Build the first territory loop after reviewing the detailed plan: one bouncer, a vulnerable cut, enemy-seeded capture, retained territory after failure, and three teaching boards. Start with FPV, then prove that swapping all four skins leaves the same recorded simulation unchanged. Keep specialist enemies, erosion, complex generators and the full editor for later increments with explicit acceptance cases.

The user selected **both immediate steering and buffered grid-center turning**, now configurable in the demo and planned in future rulesets. Immediate remains the initial preset; both need explicit trail rasterization and corner-contact semantics in the eventual territory kernel. The demo comparison changes movement policy without adding capture or enemies. Reloaded remains a reference for readable danger, image reveals and recovery feedback. Earned player characters are our extension, not a verified Reloaded mechanic.
