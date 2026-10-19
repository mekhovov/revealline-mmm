# Sentinel Relay

Sentinel Relay is a one-map, two-stage picture-reveal encounter. Its fictional signal machine changes from horizontal stripes to vertical stripes after you capture its shield relay. The final opening can release the whole remaining picture. It uses the same movement and equipment as other missions.

The [portable pack](../game/content/packs/sentinel-relay.json) includes four existing original procedural themes and seven classes, with no downloaded image or audio files. Its source and ten reusable authoring prompts live in [the authoring folder](../authoring/library/sentinel-relay/README.md). This guide describes the implemented source recipe; browser presentation, native behavior and physical-device evidence belong to the associated release verification, not the route tests below.

## Play the two stages

**First, capture the shield relay.** It is the visible objective near the upper-left of the field. Draw a cut back to safe ground so the relay falls inside claimed territory. The sentinel keeps its own region covered. Its horizontal warning locks a row before the stripe activates; it does not continue following you. Return to safe ground before an active stripe touches you or your unfinished cut.

**Then, close a cut while the core is open.** After a short transition, the sentinel warns vertically, activates that stripe, then opens its core for four seconds. Close a cut containing at least eight distinct new field cells during the opening. Those are the current unfinished trail's cells; earlier cuts, safe ground and the area filled automatically do not count. Closing too early or with a shorter cut still claims its ordinary territory, but does not release the core. A missed opening always repeats.

**Isolation is another finish.** If normal captures leave at most eight unclaimed field cells, the core is isolated. Return to safe ground with no active cut and wait for an opening. The remaining region releases automatically once the craft is running normally; contact, redeployment and recovery cannot count as a safe finish. This prevents earlier captures from leaving too little space for an eight-cell trail. It still requires the relay and the first complete stage-2 attack.

The two objectives remain required even after the 75% quota. The sentinel is the sole field seed, so either release genuinely claims the rest of the board. You do not need to fly into or geometrically surround the core. The occupied core cell remains dangerous until release.

Lives start at three. An ordinary life loss discards the unfinished cut while retaining captured territory, the relay and current stage. Restart begins again. There is no mission, individual-cut or cable-length deadline here. Pause and saved-flight suspension freeze the phase; openings continue through ordinary respawn once simulation resumes.

## Controls and equipment

Default keyboard controls are arrows/WASD to steer, `X` to stop, `E` for equipment, `R` to collect supplies, Shift for boost, `G` for the hangar and Escape/`P` to pause. Settings can remap them; follow the current on-screen binding labels. Both Immediate and Grid-center steering are supported. Touch controls and an assigned controller supply the same game commands; a controller first requires neutral input and a deliberate join. See [controls](controls.md) and [controller navigation](controller-navigation.md).

No boost, pickup, equipment use or class switch is required to finish this map. All seven ordinary class routes have been recorded in both steering modes.

| Class         | Its actual equipment here                                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scout         | Scan shows existing information. The two encounter objectives are already visible; scanning does not open the core.                                                                       |
| Light carrier | Collect one charge at the home supply pad and drop a stun field. If it covers the sentinel, it suppresses active stripe contact while the normal phase clock continues.                   |
| Heavy carrier | Carries two charges for the same field effect. Extra capacity does not lengthen an opening or change the cut threshold.                                                                   |
| Interceptor   | Its brief shield can absorb one eligible contact, discard the cut and recover without a life loss. It cannot turn that discarded cut into a capture.                                      |
| Fiber relay   | Uses scan and resists actual signal zones. This map has no signal zone, so there is no special resistance advantage; its live trail is still vulnerable.                                  |
| Impact craft  | Releases its existing short-range stun pulse, abandons the live cut and redeploys. Suppression may cover the sentinel; neither the pulse nor redeployment counts as a successful closure. |
| Trapper       | Its field slows moving field enemies. The stationary sentinel's stage clock is unaffected, so this equipment offers no special advantage in this particular encounter.                    |

Stun affects the stripe, not the sentinel's body or live-trail contact. Decorative aircraft, ornaments or mascots never change these effects. Use the home hangar for an accepted class switch; the starting-class selector describes the next run's starting setup.

## What has been proved

[sentinel-routes.json](../game/replays/sentinel-routes.json) stores 20 legal input traces and their exact replay-v4 summaries/checkpoints. Every command was stepped through the public core; no fixture assigns cells, stage or `won`. The tests read those fixed expectations rather than regenerating them.

| Route                           | Both steering policies | Result                                                                                      |
| ------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| Ordinary, each of seven classes | 14 traces              | Tick 1,792, about 14.93 seconds, three lives, timed release using 13 new live cells         |
| Miss two openings, then finish  | Two Scout traces       | Tick 3,400, about 28.33 seconds, three lives                                                |
| Narrow the region, then isolate | Two Scout traces       | Tick 4,084, about 34.03 seconds, three lives; final one-cell reveal is not a fabricated cut |
| Take a lane contact and recover | Two Scout traces       | Tick 2,596, about 21.63 seconds, two lives; captured relay and territory persist            |

The ordinary route captures the relay at tick 1,084. Its transition ends with the stage-2 warning at 1,265, stripe activation is 1,505, and the first opening starts at 1,589. Ten additional saved-prefix checks cover transition, warning, active stripe, opening and a live cut, in both modes, then reproduce the same final checkpoint.

The source's 30/60-second medal thresholds give room beyond the ordinary recorded route; they are optional targets, not failure deadlines. These reachability results do not measure enjoyment, first-attempt difficulty, audio quality, accessibility or device performance. No new optional mastery seal is attached to this map. Ordinary completion uses the existing picture, local score and chapter-appearance rules.

## Reuse or tune the encounter

The source file [`proposedpack-source.json`](../authoring/library/sentinel-relay/proposedpack-source.json) owns the runtime recipe. The name identifies the editable source; the document is a real pack-v3 candidate, not another import format. It includes `fpv`, `ukraine`, `retro` and `coupa` themes without duplicating the map. Change the selected presentation to reuse Ukrainian dawn, heritage ornament, neon arcade or the original business network scene. Existing theme effects are separate from phase state; a theme's labels must not imply different rules or official branding.

Use the ten [finite prompt recipes](../authoring/library/sentinel-relay/prompts.json) for four reskins, a future background proposal, ordinary proofs, missed windows, isolation, save/reskin verification and bounded pacing revision. These are authoring examples, not commands the runtime executes and not new CLI catalog IDs. The background prompt has not been executed; it is not a generated or reviewed asset.

Run from the repository root:

```sh
node authoring/library/sentinel-relay/record-proofs.mjs
node --test game/test/sentinel-playthrough.test.mjs
```

The first command is read-only verification of the source, runtime pack and 20 routes. After deliberately editing this source's simulation data, revise its content identity as appropriate, then use `node authoring/library/sentinel-relay/record-proofs.mjs --write` to validate and prove all routes before replacing the two owned output files. It may fail when an edited layout invalidates a route; adapt and review legal inputs rather than forcing a result. It does not change the pack index, player storage or old release archives. Do not use it to regenerate frozen expectations.

Level v2/core v3/replay v4 is an explicit new pair. Pack v3 requires `masteries: []`; playground v3 requires `masteryDefinition: null`. The staged descriptor is bounded to exactly two schedules and one sentinel at an interior cell center, as the sole field seed. Initial delay, transition and warning/active/rest/open durations use integer ticks. The minimum release length also determines isolation's remaining-field threshold. Other field enemies, arbitrary behavior graphs, new ability strings and staged-boss mastery predicates are unsupported.

Preserve old level-v1/core-v2/replay-v3 normalization and checkpoint bytes. Changing a theme image cannot covertly change the encounter. Changing timing, geometry or the minimum changes simulation content and its identity; retain prior pictures and records as historical data rather than relabeling them. Saved flights and backups must use the shared validated replay/pack path, including import cancellation and Undo. Refer to the [encounter plan](round-21-boss-encounter-plan.md) for the design rationale and broader acceptance matrix.
