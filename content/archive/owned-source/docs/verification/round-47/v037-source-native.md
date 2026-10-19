# v0.37 source and native preview evidence

Recorded 2026-09-14 before v0.37 exact-source gates. The numeric `0.37.0`
development preview at `http://127.0.0.1:8964/game/` used runtime
`a7d1e48bd78af21ddd69d82c049311d34830346d`. It integrates Collection context
selection and three Sentinel theme chapters, bringing the optional external
catalog to eight entries. This note records bounded desktop browser play and
separate source production. v0.37 is not frozen or deployed.

Later source work includes the Tactical caption correction and `1e678c0`, which
aligns the app fallback, package and README to v0.37. These changes do not extend
the earlier browser window. v0.36 PR #12 merged at `8cb1c2a`, preserving frozen
`fb6a199a` runtime through test-only `c7405894`; main run `34787519108` is deploying
at this checkpoint. v0.35 remains the latest verified public milestone until the
v0.36 public inventory and live-site acceptance close.

## Actual desktop journeys

Root used ordinary browser keyboard actions, read-only DOM inspection and saved
screenshots; no game state, clock or storage was injected. Each new pair downloaded
through More worlds, followed by a separate explicit Choose. The opening missions
completed with capture stops, full reward views and distinct Collection ownership:

| Theme         | Opening mission            | Coverage |  Score | Lives |    Time | Medal |
| ------------- | -------------------------- | -------: | -----: | ----: | ------: | ----- |
| Ukraine Atlas | Courtyard of quiet craft   |    62.9% | 14,900 |     3 |  9.86 s | Gold  |
| 1994 Forever  | The radio-repair courtyard |    45.2% | 10,850 |     3 | 23.34 s | Gold  |
| Spend Network | The shared inventory court |    62.9% | 14,900 |     3 |  9.88 s | Gold  |

Collection retained all three rewards with one difficulty label each. Separate
settled native reads establish Retro then Ukraine chapter-progress selection while
the Spend Network flight stayed paused at 24.9% / 6,200 / three lives / 2:54,
opportunity 1. Viewing another chapter did not switch or resume the flight.

The Spend Network replay was explicitly paused with a visible unfinished horizontal
cut at 0% / 0 / three lives / 2:59. Navigating to `about:blank`, reopening the game
and choosing Continue restored the same visible line while paused. Explicit Resume
continued its saved rightward movement; a later Up command and Pause yielded
24.9% / 6,200 / three lives / 2:54, opportunity 1. Collection still contained all
three rewards after reopening. The input chronology is root-observed, not an
independently captured raw input-event stream.

## Receipt corrections and limits

Evidence paths below are relative to the original checkout, not this worktree:

| Record                                                 | SHA-256                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `.cache/round47/v037-native-browser/receipt.json`      | `4b02dce86639e57a2503d1dab55e6900300f421c6210393c97123b761e32b18f` |
| `.cache/round47/v037-native-browser/peer-runtime.json` | `94f7ee86d5dd3002556c2efca08a143c317f792a93721456049111875d02c95a` |
| Retained `receipt-initial.json` in that directory      | `2a2cc1874a2351a33cad6c4e612e0fc2de65e430d292a5cc2a98a3537f138ec9` |

The independent peer checked 63 native evidence files, 15 source/runtime pins and
15 built-runtime pins, and viewed eight screenshots. Its development-manifest read
records 300 bodies / 226,201,314 bytes; that read was not another complete artifact
or ZIP audit.

Retained unsuccessful probes remain part of the record. The first
`0.37.0-preview` build at port 8963 was refused by the exact profile-channel contract;
the numeric preview uses the supported contract. The preliminary `retro-win`
capture shows 26.5% progress, not completion. Earlier return-to-Ukraine and Home/Tab
probes did not establish the requested selection. Only the later settled
Space → ArrowUp → Enter results support the accepted progress-selection claim.
The error history retains the 8963 exception; no 8964 error was observed, so the
combined history is not reported as empty.

Retained `.png` screenshot filenames contain JPEG bytes. Encoded images were
1280 × 720 or 1031 × 968; the later read browser viewport was 1031 × 967. These are
desktop observations, not device-size certification or exact decoded-original
pixel comparisons. The evidence covers three opening wins, not all nine new theme
missions, offline/stopped-server use, physical phone/controller input, measured
performance, listening, human balance or enjoyment.

## Remaining couch-shell gap

Root opened the actual canonical v0.34 couch lobby. Its banner, native-select setup
and permanently visible control strips for both players still form a separate
shell from solo. `git diff v0.34.0 HEAD -- game/couch` is empty at source `1e678c0`,
so this remains a current P1/P7 gap. The original-checkout snapshot
`.cache/round47/archive033-034-native/034-canonical-couch-lobby.txt` has SHA-256
`e56e79d3a414635cb076eac84bbcd6a65d8318145d78e1a3f3cfed95e233e171`;
its accompanying screenshot has
`33b1363f015f70d8c7cf395b09cecaabb03ba017a368da8e0e14ecfbb1712d06`.

Immediately after v0.37 qualification, bring couch lobby/setup, pause, results and
return into the shared shell with controller-accessible navigation and device-aware
controls, preserving two independent player inputs. This takes priority over bulk
content expansion. The observation covers a lobby launch only; it does not qualify
a full match, physical controllers or all native menus.

## Source production and counts

The [Sentinel theme compiler](../../../authoring/library/sentinel-theme-chapters/README.md)
binds nine unchanged originals to three reused Sentinel layouts. Its 168 modeled
contexts contain 96 wins, 48 life-loss controls and 24 unfinished controls; the nine
PNGs total 23,108,412 bytes. These modeled results remain separate from the three
browser opening wins above.

The integrated eight-entry catalog contains 24 unique external originals totaling
64,381,170 PNG bytes and sixteen compact-pack/media bodies totaling 64,546,929
bytes. The old five v0.36 descriptors remain exact. The unchanged production
candidate snapshot contains **36/116 produced originals, nine layout families,
80 unbound picture cells and zero quality-approved maps**. Historical originals,
reused artwork, source files and runtime payloads have different counting bases.

[Fracture Lines](../../../authoring/library/fracture-lines/README.md) is separate
source work: three geometry candidates at `43a69d6`, three preserved FPV originals
at `f565d333`, and the [illustrated compiler](../../../authoring/library/fracture-lines-chapter/README.md)
at `653be06`. Its three 1774 × 887 PNGs contain 8,656,868 original bytes; the exact
9,708-byte pack plus 8,669,310-byte media body totals 8,679,018 bytes. The new authored
owner is `fracture-lines-fpv/1/8f79476cc9cf6221`; old saved/earned owners remain
separate and each new story choice is explicitly null.

Fracture reuses its retained Standard/Gentle, Immediate/Grid Buffer controls:
48 route contexts plus six separate game-over controls, 121,942 ticks and
204 saved boundaries (192 nonempty suffixes and 12 respawning endpoint restores).
The compiler's seven focused tests passed on Node20 and Node22; its final
cache-directory fixture correction passed the affected output test on each, with
six intentional Node20 filter skips. The subsequent README command fix was
format-only. The initial Gentle owner-revision comparison failures and the two
test-fixture failures remain preserved. Current worktree evidence is
`.cache/fracture-lines-chapter/final-check-3/verification.json`
(`0ac09c42e90f3dbaf696160208b31a4038bef72b97bfe5526a9ff8abd7b1aa17`)
and `peer-runtime.json`
(`71bd5930d24393457d8cc1fb600d01638fa910ed6fa7e165d93e6d12aa4eef6f`).

Fracture's source pictures and exact bindings are complete; runtime registration,
installation, public downloads, native chapter play and production-snapshot
adoption are not. Its three layouts and pictures therefore do not alter the
36-picture/nine-family candidate or quality-approved count. No Expert, video,
animation or new soundtrack is claimed.

## Continuing from this evidence

Use the [round-47 research](../../research/round-47-collection-and-production.md)
and [campaign/input/reward decisions](../../research/round-46-campaign-input-and-reward.md)
as reference context. That research separately identifies two reopened reference
stills and published guidance; it does not turn stills into continuous motion or
audio observations. New Fracture layouts are original extensions, not claimed
reproductions of exact reference behavior.

The [shared project-skill workflow](../../feature-delivery-workflow.md#production-register-intake),
[production CLI](../../../authoring/production/README.md) and
[intake prompts](../../../authoring/prompts/production-intake.md) preserve immutable
owners, originals, prior snapshots and explicit assessment stages. Their source
view remains a read-only authoring aid, not an additional public runtime feature.
Do not raise the 48 MiB pack/index budget, 256 MiB managed-media budget or
12-installed-pack cap; eight external plus five legacy choices do not promise
all thirteen fit together. Preserve explicit Download/Choose and capacity refusal
without auto-eviction. Complete v0.37 exact-source, frozen, remaining native,
offline and public gates under the [production plan](../../production-plan.md).
