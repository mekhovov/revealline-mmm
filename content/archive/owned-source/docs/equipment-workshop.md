# Equipment Workshop

This compact expansion demonstrates authored optional equipment goals across three visual themes. [equipment-workshop.json](../game/content/packs/equipment-workshop.json) is an explicit `xonix-pack.v2` document, 18,389 bytes after formatting. It contains three maps, seven unchanged equipment recipes, three procedural themes, three synthesized music tracks and three finite goal definitions. It embeds no images, copies none of the Homeward picture payloads, and needs no additional runtime dependency.

This is working source after frozen v0.8.0. A release label, browser playtest, or native-device certification is separate evidence.

| Map | Presentation and music | Ordinary clear | Optional equipment seal |
| --- | --- | --- | --- |
| `workshop-01` — Garden of Threads | Ukraine Atlas, heritage scene, bird character; ambient/Dorian “Woven Morning” | Both memory markers and 72% coverage | **Steady Thread**: with a signal-resistant class, close one cut containing at least eight distinct endpoint cells in active `broad-band` interference, then win without losing a life. Recommended: Fiber relay. |
| `workshop-02` — Neon Switchboard | 1994 Forever, arcade scene, retro craft; chiptune/minor “After-School Arcade” | Both cartridge markers and 68% coverage | **Power Circuit**: actually refill at `west-supply` and `south-supply`; close a cut through at least two suppressed cells in each emitter region; switch to Heavy carrier at `south-hangar`; win. Recommended: Light carrier, then Heavy carrier. |
| `workshop-03` — Clear Ledger | Spend Network, network scene, abstract Navi avatar; synthwave/major “Bright Balance” | Opportunity marker and 70% coverage within 35 seconds | **Safe Reconcile**: pulse from a live cut of at least three cells, actually stun `cable-cutter` with that pulse, return home, then win without losing a life. Recommended: Impact craft. |

The spend presentation is an original abstract project theme, not an official Coupa product or endorsement. Equipment remains fictional arcade behavior. A different body never changes a recipe's capability. All seven classes remain selectable; the seals are optional and do not block ordinary clears or picture rewards. The current procedural scenes are reusable theme artwork, not three new full-image reward paintings.

## Play and adapt

In the current solo app, open Library and select **Install equipment workshop**, or use **Install a pack file** with the JSON above. Select the Equipment Workshop campaign. The Playground can import that same file, select its maps and preview the matching explicit goal. Practice does not write earned progress.

The map layouts deliberately reuse Homeward Skies physics, spawn points, actors, signal zones, supply pads, hangars, capture targets and time/trail budgets. Only campaign/map identities and presentation metadata changed. The same legal inputs therefore exercise the same interactions while producing their own campaign, map and replay identities. Original Homeward content, proofs and earned records remain separate.

To create another chapter:

1. Copy the example JSON to a new file. Choose a new pack ID, campaign ID and map IDs; retarget every definition's `campaignId` and `levelId` together. Keep references such as `zoneId`, `padIds`, `hangarId`, `classId` and `actorId` tied to actual local content.
2. Change the names, palettes, scene, character bodies, music descriptors and briefs. Preserve a goal's required capabilities in the campaign's selected roster. `classIds` filters recipes in source recipe order; it does not reorder them.
3. Keep `masteries: []` to opt out explicitly, or include at most one supported definition per map. Use the existing three finite predicate families. There is no author script execution or arbitrary rule expression.
4. Inspect, import into the Playground, play both turning modes, and verify a qualifying route plus an ordinary or omitted-action control. If the layout changes, the old route is only a starting point, not proof of the new map.
5. For a shipped example, add its unique relative JSON path and matching ID to [the pack index](../game/content/packs/index.json), then validate/build. For external distribution, the standalone pack file can be imported without editing the shipped index.

Adding artwork later uses the existing `visualOverrides` and `levelVisuals` slots and their original limits. Do not put goal fields inside a level. Presentation fields already included in normalized level JSON affect that level's identity; changing only sidecar definitions does not change map/campaign identity, but changes the definition hash and how older earned seals are labeled. See [the pack contract](pack-mastery-contract.md) and [catalog contract](mastery-catalog-contract.md).

## Creator inspection command

From the project root with its supported Node runtime:

```sh
mise exec node@22.22.2 -- node scripts/game-cli.mjs inspect-goals --pack game/content/packs/equipment-workshop.json
mise exec node@22.22.2 -- node scripts/game-cli.mjs inspect-goals --pack game/content/packs/equipment-workshop.json --out .cache/workshop-inspection.json
mise exec node@22.22.2 -- npm run validate
mise exec node@22.22.2 -- npm run build -- --out .cache/workshop-build
```

`--out` creates a new report and refuses to overwrite any existing file. Choose a new report name for another inspection. Paths with spaces must be shell-quoted. Input is a regular JSON file bounded to the existing 24 MiB pack budget; malformed files and invalid references exit nonzero. The report contains no embedded media.

The JSON report format is `xonix-goal-inspection.v1`. It includes exact input bytes/SHA-256, filtered roster and campaign identities, map identities, effective themes/music, canonical selected definitions and definition hashes. `goalSource` distinguishes `authored`, `built-in-fallback` and `none`. Exact shipped Homeward v1 fallbacks remain visible; explicit empty v2 goals stay absent.

The checks intentionally say `structure: valid`, `references: valid`, `installedLibrary: not-checked`, `imageDecoding: not-run`, `solvability: not-tested`, and `awardAuthority: false`. This command checks local data and references, including required equipment providers. It neither simulates inputs nor imports content into a player's library. It cannot certify enjoyment, solvability, rendered media, or compatibility with an arbitrary installed collection. Actual installation retains complete image decoding and destination/dependency checks.

`validate` and `build` additionally inspect all shipped index entries and their combined goal registrations with the actual permanent base campaign/roster. Unsafe paths, mismatched/duplicate IDs, invalid definitions and incompatible same-board goal declarations fail before build output is replaced. Existing source trees without a pack index keep their prior build path. Current source has 12 base maps plus 16 indexed expansion maps across five packs, with six effective optional seals (three Homeward fallbacks and three authored workshop goals). The helper limits still bound the combined catalog; this does not enlarge installed-pack or offline budgets.

The exported Node APIs are `inspectGoals({packPath, root?})` and `validatePacks(root?)` in [game-cli.mjs](../scripts/game-cli.mjs). Inspection is read-only; the CLI alone owns optional report-file creation.

## Reproducible route evidence

```sh
mise exec node@22.22.2 -- node --test game/test/equipment-workshop.test.mjs scripts/test-inspect-goals.mjs scripts/test-game-cli.mjs
```

[Workshop tests](../game/test/equipment-workshop.test.mjs) feed only public fixed-step inputs into fresh runs, record new replays, verify their actual authoritative checkpoints, and pass completed attempts through the ordinary mastery verifier. They never mutate a run into a win or write player storage. Inputs come from the unchanged [Homeward proof fixture](../game/replays/homeward-routes.json), pinned at SHA-256 `63a77908b1ce98b480f9fd0431894e4f1d58ad56e4266ae0860206de564d8c1a`. The tests adapt map identity by creating a fresh recording against the new map; they do not reuse a stale checkpoint or alter old fixtures.

| Evidence at seed 1 | Immediate | Grid-center |
| --- | --- | --- |
| Garden: Fiber relay, qualifying | Win at tick 1305; best closed resistant cut 22 cells; 3 lives | Same |
| Garden: Interceptor ordinary control | Win at tick 3748; no seal | Win at tick 3751; no seal |
| Switchboard: Light/Heavy carrier, qualifying | Win at tick 1210; two actual refills, 3/4 suppressed-region cells, required hangar switch | Same |
| Switchboard: Interceptor ordinary control | Win at tick 1557; no seal | Win at tick 1567; no seal |
| Ledger: Impact craft, qualifying | Win at tick 1120; linked pulse/stun/return; 3 lives | Same |
| Ledger: Interceptor ordinary control | Win at tick 805; no seal | Same |
| Switchboard: omitted equipment inputs | Still running at tick 1210; no seal | Same |
| Ledger: omitted pulse | Win at tick 1120 with 2 lives; no seal | Same |

These are 16 deterministic input traces, represented by 18 workshop tests including content/practice checks. The two incomplete Switchboard controls show that omitting those actions changes this route; they are not evidence that an ordinary route is impossible. The separate ordinary-control wins demonstrate that it remains possible.

[Eleven CLI tests](../scripts/test-inspect-goals.mjs) cover inspection identity, fallback/opt-out behavior, filtered rosters, invalid references, byte/regular-file limits, no-overwrite reports, indexed checks, a real current-source build with offline inventory, and base-campaign conflict failure without replacing previous output. The 23 existing CLI regressions continue to cover older snapshot delegation, portable builds and output ownership. No browser/device playtest claim follows from these Node tests.
