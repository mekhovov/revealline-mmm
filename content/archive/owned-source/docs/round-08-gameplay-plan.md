# Round 08 — from the motion lab to a playable territory game

This plan is for review before starting the real game. Round 08 adds character selection, cosmetic-unlock evaluation, presentation studies and both configurable steering modes to the lab. **Territory capture, enemies, lives, actual medals and playable level completion remain unimplemented.** A simulated reward button is a test fixture, not a completed mission.

The next useful build is a small, polished Xonix slice: a bright, precise player opens a trail, reconnects to safe ground, exposes a satisfying region of an original picture, survives readable danger and chooses another image. Start with the Ukrainian FPV theme, then run the identical levels with Ukrainian cultural, retro and business presentation. Richer enemy roles and content tools follow once that loop is understandable and enjoyable.

## Boundaries we keep

The [current pack contract](../authoring/CONTRACT.md) is a validated design format. The [media authoring tools](../authoring/media/README.md) preserve originals and derivatives. The motion lab is a presentation sandbox. The new [collection evaluator](../authoring/motion-lab/collection.mjs) is a working, pure preview module. None is already the missing game runtime, and they should not be joined by undocumented assumptions.

The game kernel will own positions, live trails, ownership, contacts, timers, goals and results. Presentation will own bodies, propellers, palettes, microtiles, detailed props, reveal pictures, particles, audio and menu animation. A character named Skyline FPV or Audit pulse will have the same movement and collision footprint as the starter. Different stats would require a separately selected, versioned ruleset, a visible description and separate challenge comparisons.

Authors can change existing rule parameters and art bindings without changing kernel code. A new fill algorithm, enemy behavior, timed effect or unlock primitive still requires a registered implementation, schema and meaningful tests. “Data-driven” does not mean arbitrary new behavior can emerge from an image or prompt.

## First playable slice: explicit proposed rules

These are our proposed rules, not a reconstruction of Reloaded's undisclosed internals. [Round 06](research/round-06-reloaded-observations.md) supports both a trail-only closure and a later broad fill, but does not identify every fill anchor. [Round 07](research/round-07-reloaded-ui-motion.md) establishes useful feedback sequences without measuring input latency.

| Part | Proposed first-slice rule |
|---|---|
| Board | One 48×36 authoring grid, whole 4:3 arena visible on every device. One-cell permanent outer safe border. No scrolling, camera shake or art-dependent collision. |
| Coverage | Denominator is the number of non-wall interior cells at level start. Outer safe border and fixed walls are excluded. Current claimed interior cells, including successfully secured trail cells, form the numerator. Display actual current/target coverage; full-picture victory presentation does not pretend the player captured 100%. |
| Movement | Cardinal travel, immediate speed/stop changes from the normalized input command, and turn timing selected by the configured policy below. Body rotation, banking, propeller blur and large artwork never feed back into motion. Use one authored gameplay speed for every cosmetic and device within a ruleset. |
| Cut | Leaving safe ground with the authored cut action starts a vulnerable trail. Proposed accessible default: automatic cut on entry; optional hold-to-cut is a separately explained control preference. Releasing movement stops the player, but a live trail remains vulnerable. |
| Turning modes | Support **both** immediate orthogonal turning and grid-center buffered turning, selectable in the demo and configurable in future rulesets. Immediate remains the default. The buffered mode exposes its pending command and uses movement distance, not body rotation, to reach a legal turning point. |
| Self-contact | Contact with any older unfinished trail segment loses one life. Ignore only the immediately adjacent segment needed for ordinary forward motion. Reversing over a live cut is therefore dangerous; teach this before a cramped map. |
| Closure | Returning to pre-existing safe/claimed ground closes the trail. Touching a wall blocks movement and does not complete a cut. A dangerous contact at the same instant as closure wins the tie: lose the life and cancel that trail. |
| Fill | Use existing `fill.enemy-seeded.v1`: treat a valid closed trail as claimed, flood remaining unclaimed non-wall cells by four-neighbor connectivity, and claim components containing no live field-enemy anchor. Keep components with anchors. Enemies on both sides can yield only the secured trail; explain this outcome visually. |
| Enemy seed | First slice has regular field bouncers only. Their current center cell is the fill anchor; collision is resolved before closure so no enemy can occupy the just-claimed trail. Outer-border patrols, if later introduced, do not anchor interior regions. |
| Lives | Start with three lives as a tuning hypothesis. One failure removes the current cut and retains already claimed territory. Use a fixed, visibly marked respawn site with a short grace state; no grace-based cutting until it ends. Exact recovery/grace durations are prototype parameters, not measured Reloaded rules. |
| Goal | Author 65%, 70% and 72% targets for the three teaching levels below. Completion is committed once. No hard countdown in these first stages; a separate optional medal clock never ends the run at zero. |
| Score | Award area score only for cells captured for the first time during the run. Objectives pay once. Reopening/reclaiming territory later cannot farm ordinary area score. Cosmetic selection awards no score. |

The user has selected **both configurable turning modes** and requested that both be available in the demo for testing. Keep immediate orthogonal steering as the default and retain buffered turning throughout the future runtime, authoring format and test suite.

| Demo mode | Future versioned policy name | Required behavior |
|---|---|---|
| `immediate` | `input.turn-immediate.v1` | Accept the active cardinal direction on the next simulation update, including while between authored grid centers. Stop immediately when movement is released. Decorative facing may catch up without steering or slowing the player. |
| `grid-center` | `input.turn-grid-center.v1` | Record the active requested turn, continue along the current axis until its next legal grid center, then spend any remaining movement distance in the new direction. Show the buffer explicitly; a released/replaced input must not leave a ghost turn. Stop input still acts immediately. |

These versioned names describe the **planned game contract**; they are not newly registered capabilities in the existing v0.1 pack catalog. The motion demo uses `motion.turnPolicy` in its own presentation configuration. A mode change resets and pauses at a known comparison start and clears held/buffered input, avoiding an unexplained snap from a previous mode's fractional position. Mode changes do not grant or erase collection rewards.

The agreed demo convention places cell centers at `n + 0.5`. Grid mode offsets the existing comparison route by half a cell, and selecting either mode resets and pauses the study. In grid mode, every direction change—including reversal—waits for a center. The latest currently held cardinal command replaces the previous request; releasing it falls back to the most recently still-held direction, or stops if none remains. Releasing all movement stops immediately between centers and clears the request. Restarting there continues along the retained travel axis until the next legal center, then applies the still-held new direction. There is no delayed tap command kept after release. Autoplay follows its center-aligned route directly, while manual controls exercise the buffer.

Grid-mode travel limits use the outer cell centers: `0.5…47.5` horizontally and `0.5…35.5` vertically. An outward input stops there; a new turn or reversal can apply at that valid center. Immediate mode retains the prior demo's `0.8…47.2` / `0.8…35.2` clamp. Record this small boundary difference when comparing the demo policies; neither limit depends on the cosmetic image. The eventual territory kernel must specify its own consistent safe-border/center contract rather than inheriting these preview bounds accidentally.

Before implementing the territory kernel, specify geometry for **both** policies: where grid centers lie, which movements may reverse between centers, how buffered requests are replaced/cancelled, and how a stopped fractional position resumes. Immediate-mode subcell corners require an exact trail rasterization rule, including corner-touch ownership and collision. Buffered mode requires exact center-crossing detection and leftover-distance handling. Neither renderer pixels nor an animation frame may determine these outcomes. Demo motion tests validate steering only; they do not establish a complete territory rasterization or capture algorithm.

Future level/ruleset metadata, replay headers and terminal result identity must record the selected versioned turn policy. Daily challenges, speed-medal thresholds and leaderboards compare runs with the same mode, or visibly separate the categories. The same seed/map is useful for a side-by-side control comparison, but different turn policies need not produce the same path from the same command timing. A general cosmetic clear may count a level once across both modes; a mode-specific mastery reward needs an explicit supported criterion and identity, not a hidden assumption.

For `fill.enemy-seeded.v1`, a level with no remaining live field anchors can claim all connected remaining components at the next valid closure. If that is too generous for a particular objective mode, use a different explicit rule rather than quietly retaining the largest region. The existing `fill.keep-largest.v1` remains a separate selectable mode with its own row-major tie rule and comparisons.

## Time, contacts and commit order

Use a pure TypeScript simulation tick at a proposed **60 Hz**, with stable actor IDs and integer/fixed-point grid coordinates. Keep fractional travel remainders rather than rounding every frame. The rendering scene consumes snapshots and may interpolate decoration, while the visible live-cut head stays aligned with authoritative state. A fixed tick alone is not proof of determinism; seeded randomness, stable iteration order, collision tie-breaking and serialized input are also required.

Do not rely on endpoint overlap. Sweep the moving player core and enemies across their travelled segments against terrain, each other and the live trail; this catches a fast enemy crossing a cut between tick endpoints. Proposed initial player core radius is 0.2 cell, shown by a debug overlay. The 1.25-cell FPV body and its rotor discs are decoration. Enemy radii and velocities belong in their behavior data. Numerical tolerances must be centralized and tested at exact corners.

Each active tick has this documented order:

1. Expire statuses whose end tick has arrived; read the normalized input command for this tick.
2. Compute intended actor movement and swept contacts against the previous committed topology. Order contacts by time of impact and stable actor ID. Apply at most one player life loss per tick.
3. On player failure, remove that unfinished trail and enter recovery. Suppress its closure, capture and same-contact rewards. Existing territory and already granted objectives persist.
4. If a surviving trail closes, commit its cells, run the selected fill, and rebuild the safe frontier. Never run a second competing fill inside a particle or renderer callback.
5. Apply one-time enclosed objective effects. Later contact pickups remain a distinct event path; resolve eligible contacts in a stable order, with timed changes affecting subsequent ticks.
6. When erosion is eventually added, apply its explicit ownership reversals and rebuild affected topology before evaluating current coverage. Do not briefly award a win on an intermediate image mask.
7. Update first-capture score, objective states and active tick time; evaluate completion/defeat once; emit immutable events for the renderer and results adapter.

For simultaneous terminal conditions, failure prevents a same-instant cut reward. If a future ruleset allows completion while losing the final life, give that alternative an explicit contract and tests. Do not introduce it through incidental callback order.

The scene adapter should consume ordinary slow frames in bounded simulation substeps. A long interruption should enter pause/recovery rather than advancing the player through unseen danger. Pause freezes active-play clocks and statuses; background tabs and disconnected controls clear held input. Measure behavior at 10/20/30/60/120 rendered frames per second and after interruption. Do not make richer art slow the simulation or change the medal opportunity. The existing lab's variable substeps are useful presentation tests, but do not constitute this fixed-tick kernel.

## Three authored levels before the twelve-level campaign

Start with these shapes from the [earlier curriculum](../authoring/challenges/round-05-reference-adjustments.md). The longer twelve-level plan remains a backlog of progressively introduced behaviors.

| Stage | Spatial design | Teaching and review |
|---|---|---|
| First Cut | Broad open field, one bouncer, no fixed interior walls | Compare a shallow strip and a rectangular pocket. Show where the enemy prevents a fill. Reach 65%; reveal an inviting original FPV scene. |
| Staggered Gates | Three short wall bars alternating left/right, generous passages and open ends | Walls block both actors. Two bouncers and a 70% target add route timing without a cramped maze. |
| Twin Courtyards | Two open C-shaped wall groups with opposite entrances; a wide central passage | Reach 72% and enclose one named objective. Teach an objective independently of a contact pickup. |

Generate the same recorded input/state trace with all four theme families and both compact tiles and detailed/hybrid props. Compare a photograph, illustration and pixel-art reveal beneath the same board. At each successful closure, foreground boundaries must still explain which ground is safe and where the next cut can begin.

The later curriculum adds a slow crossing, interrupted lethal ring, contour patrol, claimed-space visitor, eroding edge, supply detour and combined geometry. Gate each new behavior with a small acceptance level and a clear tutorial cue. New speed/count settings alone are not sufficient map variety. Seeded generation comes after authored reference levels and a validator that checks connectivity, objective reachability, corridor widths and spawn margins; those checks still cannot prove dynamic solvability or fun.

## Terrain and enemy extensions: choose honestly

The Reloaded manual directly establishes player-only slow and lethal fields, walls blocking both actor groups, a normal field threat, a line patrol, an exposed-ground threat and a large diamond that destroys exposed territory. [Manual at 0:55](https://www.youtube.com/watch?v=SKKvpZ2DvUY&t=55s). Round 06 directly observed erosion and a pickup activating on player contact after enclosure. These capabilities are absent from the current pack/runtime implementation; preserve that boundary.

| Extension | Proposed rule for our game | Remaining reference uncertainty |
|---|---|---|
| Slow/lethal fields | Separate terrain-effect masks; enemies ignore their player-only effects. Propose deactivation when their cell becomes claimed. | Captured terrain artwork disappears in inspected Reloaded samples; its post-capture collision/effect lifecycle was not tested. |
| Walls | Keep permanent walls excluded from coverage in the first slice. A later “buried/removed on capture” policy would be a distinct rule with changed topology and denominator decisions. | Disappearing wall artwork does not prove collision removal. |
| Contour patrol | Versioned behavior over the current claimed/unclaimed edge graph; stable branch tie, update after fill/erosion, no arbitrary teleport. | Exact Reloaded branch choice and relocation are unknown. The current outer-border patrol ID cannot be silently repurposed. |
| Claimed-space enemy | Legal claimed-cell spawn with warning and escape margin; no interior fill anchoring. | Exact activation thresholds and all visual enemy variants remain unresolved. |
| Eraser | Bounded, telegraphed reopening; current coverage decreases, first-capture score does not repeat. Never reopen permanent borders/walls or erase already earned objective rewards. | Exact reference area radius, cooldown, coverage rounding and rescue policy are unknown. |
| Four pickups | Contact collection: life, enemy slowdown, player boost, enemy freeze. Explicit caps, durations, stacking and spawn policy. Freeze is an intentional zero speed, not an invalid multiplier. | Manual names are known; durations, stack behavior and spawn algorithm are not. |

An erosion specification must also resolve what happens when the player's supporting safe cell reopens. Proposed first acceptance case: move to the nearest remaining safe node by a documented deterministic rule with a warning/grace state, or prevent reopening inside a protected player margin. Pick one before implementing the eraser; a renderer cannot improvise the answer. Until then, leave erosion out of playable levels.

## Character collection and result-event integration

Working now: [10 cosmetic definitions, six context presets and six simulated result fixtures](../authoring/motion-lab/collection-presets.json), with [18 evaluator tests](../authoring/motion-lab/test-collection.mjs). Four themed starters plus the neutral marker are available immediately. Earned FPV bodies and shared-body bird, retro and business variants have inspectable conditions. Unlocking is a deliberate reward; equipping remains the player's choice.

Context selectors support `gameId`, `themeId`, `caseId`, `challengeId`, `levelId` and `mapId`. Omitted fields are wildcards. More constraints win; equal specificity is map → level → challenge → case → theme → game. Resolve eligible saved selections first, then authored defaults, then the global neutral starter. Artwork failure uses the renderer's visual fallback while preserving the selected semantic character and movement state.

The preview result record is deliberately complete:

```json
{
  "version": "1.0.0",
  "id": "fixture-fpv-first-clear.v1",
  "runId": "preview-fpv-first-clear.v1",
  "type": "run.completed.v1",
  "simulated": true,
  "context": {
    "gameId": "reveal-lab",
    "themeId": "fpv-front",
    "caseId": "campaign",
    "challengeId": "first-flight",
    "levelId": "fpv-l01",
    "mapId": "open-corner"
  },
  "result": {
    "outcome": "won",
    "stars": 2,
    "coverage": 0.72,
    "livesLost": 1,
    "durationMs": 75000,
    "objectives": []
  }
}
```

Exact duplicate event delivery is ignored; conflicting content under an existing event ID is rejected. The run ID independently prevents multiple terminal records for the same run. Distinct level clear counts use `(gameId, themeId, levelId)`, so changing only a map or challenge cannot manufacture more collection progress. Star totals use the best qualifying result per level, not a sum of replays. AND conditions and OR alternatives are data, with explicit unmet counts.

The module does not authenticate results or write storage. UI storage belongs to an isolated lab profile and must surface failures. Unknown versions/corrupt saves require a visible warning and preservation of the old raw data. Do not import a lab profile into the first real game. The future production results adapter needs a new namespace plus pack/content/ruleset/**turn-policy**/seed/replay identity and a tested migration contract before release. The current preview result schema above does not accept an extra turn-policy field; extend/version the production contract rather than inserting unsupported fields into lab fixtures.

For real results, store completion, no-lives-lost and speed-medal IDs explicitly. Decide whether medals may be accumulated across different attempts; the lab's `stars` criterion currently takes the highest **single qualifying result** total, so it must not be relabeled as a union of medal flags without a versioned change. Main path progression should follow first clears; optional mastery and collection routes can reward revisiting levels. Avoid paid/random unlocks, daily streak pressure and replay-count farming.

Proposed kernel event vocabulary: `cut.started`, `trail.updated`, `player.failed`, `player.respawned`, `cut.closed`, `cells.claimed`, `objective.captured`, `cells.reopened`, `pickup.collected`, `status.expired` and one terminal `run.completed`. Each includes run ID, tick and stable entity/cell identifiers as appropriate. Only the terminal adapter creates a collection result. Animation callbacks and UI buttons cannot manufacture production completions.

## Incremental implementation sequence after review

| Increment | Concrete deliverable | Acceptance gate |
|---|---|---|
| 1. Rule/engine proof | Pinned Phaser + TypeScript shell, pure grid kernel, one open board, debug view, normalized input, both versioned turning modes and replay recorder | Verify each mode's turn/buffer/release behavior, explicit rasterization, fill examples, swept trail contact, pause and fixed topology on desktop browser and one physical iPhone. |
| 2. Complete arcade loop | All three teaching boards, lives/respawn, actual coverage, first-capture score, one objective, finish/retry/next actions | Collision/closure ties, stable seed replay, no impossible spawns, correct one-time terminal event; users can explain a trail-only closure. |
| 3. Art and collection bridge | Four skins, image preview/gallery, microtile/prop/hybrid modes, actual results adapter and separate game save | Same input → same simulation across skins; art failure fallback; no lab rewards in game data; first-clear reward and retry flows work by keyboard/touch/gamepad. |
| 4. Specialist rules | Add one terrain/enemy/status primitive at a time with a tutorial board and schema capability | Resolve lifecycle questions above, test contours/erosion/status timing, keep first-capture score safe from farming. |
| 5. Authoring product | Visual map editing, pack validation, asset import/preview, deterministic generator recipes and difficulty review tools | Round-trip source preservation, local-file safety, meaningful invalid-map errors, reproducible materialized layouts, backward compatibility. |
| 6. Distribution proof | Browser release candidate, then chosen iOS/desktop wrappers and store integration | Real-device frame pacing, thermal/memory/startup budget, safe areas, audio unlock, controller focus, save migrations and packaging checks. |

Use Phaser as the presentation/input shell, provisionally continuing the [existing engine recommendation](research/engine-and-framework.md). Its Scene update hook is a place to call our kernel; Arcade Physics fixed stepping is not a replacement for our ownership and tie rules. FIT can preserve the arena ratio, and pointer/keyboard/gamepad APIs supply inputs to our adapter. Pin and test the release and renderer features actually used. [Scene](https://docs.phaser.io/api-documentation/class/scene), [Arcade timestep](https://docs.phaser.io/api-documentation/class/physics-arcade-world#fixedstep), [Scale](https://docs.phaser.io/phaser/concepts/scale-manager), [Input](https://docs.phaser.io/phaser/concepts/input)

No release date, low-end device guarantee or Steam/iOS readiness is implied by the shell choice. Set the target-device floor and budgets when the proof begins; test a modest phone before adding more full-screen effects. Avoid turning gallery-only artwork into texture memory that must stay resident during play.

## Meaningful acceptance cases

- A closed cut with enemies on one side fills only the empty component; enemies on both sides preserve both components and claim only the cut. Multiple disconnected empty pockets, exact corner touches and a zero-anchor case produce fixed expected cell sets.
- A fast enemy crossing the middle of an unfinished cut between endpoints causes exactly one failure. Closing on the same contact instant does not award territory or a completion. Self-crossing, reversal, walls and borders have explicit outcomes.
- Within **each selected turn policy**, the same input ticks and seed yield identical ownership, actor positions, lives, goals and terminal result across 10–120 rendering FPS, all cosmetic choices and reduced effects. Body rotation and asset load time cannot affect the kernel. Different modes are separate control-policy comparisons, not an invariance assertion.
- Immediate mode turns between centers without waiting for body facing. Grid-center mode waits only for its documented turning point, carries leftover distance through the corner, replaces queued commands deterministically and cancels stale turns on release. Mode switching resets to its comparison start and clears the buffer without changing cosmetic progress.
- Pause, hidden tab, lost keyboard focus, released touch capture and gamepad disconnect clear held inputs without moving the player or advancing active-play statuses while paused. Device controls never crop or cover a legal turn.
- A failed trail disappears while older territory remains; respawn is visible; running out of the optional medal clock leaves the mission playable. Reduced effects preserve the information of death and victory without large zooms or bursts.
- Real result delivery twice awards progress once; a lost result or wrong scope does not satisfy a clean challenge. Corrupt storage produces a visible recovery state, and simulated fixture data never enters game progress.
- Missing art uses a visible fallback; replacing a body, rotor recipe, background, tile or detailed prop does not change geometry. Compact and hybrid views must expose the same navigable openings at phone size.

These are future simulation/device acceptance cases. The current collection and motion-demo tests do not implement the territory game. Review both demo control modes alongside the presentation and collection, then begin Increment 1 as a clearly scoped playable build with both policies retained.
