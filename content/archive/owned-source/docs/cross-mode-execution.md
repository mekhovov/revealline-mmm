# Reveal Line cross-mode execution register

> **Current whole-product status:** [completed and remaining delivery](delivery-status.md).
> Use that dated rollup for current priorities, release status and acceptance limits.
> The older checkpoints below retain their historical scope.

> **Current status:** use the
> [30 September plan and source audit](plan-status-2026-09-30.md).
> Immutable v0.142.3, current main and active source inputs have separate
> acceptance boundaries. Historical release queues below are not today’s
> execution order. Whole-game and physical-device qualification remain open.

## Original whole-game phases: remaining-work crosswalk

The later Xposed Journey contract reuses P00–P15 for different gameplay phases.
Its phase numbers are **not** the original whole-game P00–P18 identifiers below.
Keep both scopes traceable; a Journey phase acceptance does not automatically
close UI, presentation, community-production or physical-device requirements.
The linked current plan controls near-term priority; this table preserves the
original programme's unfinished obligations. Estimates are conditional ranges
from an item's start, not simultaneous commitments or an overall completion date.

| Original phase / area | Status | Remaining acceptance | Planning range after start |
| --- | --- | --- | --- |
| P00/P01 baseline and loading | Initial scope accepted; regression closure open | New async paths acknowledge activation; delayed, cancelled, failed and stale work preserves state. | Within owning features |
| P02 / P03 / P05 sound, Settings, navigation, accessibility | Partly released | All screens/modes, actual opener restoration, consistent mute/labels, EN/UA fonts, 44px targets, Large/Plain text, zoom, responsive focus and input prompts. | 1–3 days |
| P06/P07 catalogue and progression | Default entry and library released; closure open | Every compatible campaign, safe Download & play, retained Retry/Next, optional/final endings, campaign-specific offline readiness and repair. | 2–4 days |
| P08-A existing map presentation | Partial; see current queue | Genuine shared decoded assets and approved art in Solo/Versus/Team; no missing required roles; full boards and both players' controls; imported coverage/stronghold paths. | 1–3 days |
| P04/P05 Studio and complete themes | Partial | Genuine cross-mode previews, immutable history, complete collection binding, exact Retry/restoration, bounded byte-preserving bundles and FPV/Ukrainian benchmark. | 2–5 days |
| P08-B/P02-B feedback and audio | Partial | Countdown/loss/capture/rescue/results readability, reduced effects, actual soundtrack listening and cross-mode parity. | 1–3 days plus listening/device access |
| P09 encounter/difficulty benchmark | Partial; pressure and motion increments delivered/in progress | Deterministic optional encounters, readable counterplay, difficulty fairness, historical saves/replays and human playtest findings. | 3–6 days together with P10 |
| P10 Team encounters | Unfinished qualification | Separate 36-case matrix; Support, rescue, strongholds and two-player readability preserved. | Included in benchmark estimate |
| P11–P15 themed production | Partial source content; production allocation unresolved | Map accepted missions to FPV, DroneAid, culture/history, Retro and Coupa; complete design cards, branding/art/audio, meaningful variety and independent campaign releases. | 3–7 days for a first finished campaign slice; whole programme not estimable until inventory reconciliation |
| P16 remaining workflows | Partial | Collection/records/mastery, learning, replay, legacy categories, supporting pages and published help/link closure. | 2–4 days |
| P17 community creation guide | Unfinished | Independent fresh-workspace creation → install → play → recovery trial; current prompts/templates and release instructions. | 1–2 days |
| P18 whole-game qualification | Unfinished | Performance, storage/download budgets, accessibility, real devices/controllers, offline/lifecycle and complete public journeys; no unresolved required acceptance. | 3–5 days after blockers close |

## Historical execution register

The original text below is retained without rewriting. Its release status and
queue order are superseded by the linked current delivery plan.
## Historical integration checkpoint — 23 September 2026 (v0.85 delivery state)

v0.85.0 recovery was published and publicly accepted at this cutoff. PR256 was then a draft retained-presentation successor rebased onto that accepted source; that integration did not allocate a release or accept its remaining qualification. The superseding [current plan](plan-status-2026-09-23.md) now controls release status and queue order. Each feature still requires final source/version, qualification and public verification.

The earlier checkpoints below are retained as historical evidence, including the original [default Journey plan](default-journey-release.md). They do not describe the current publication queue.

## Current priority — 2026-09-22 default Journey delivery

The [six-hour default Journey release plan](default-journey-release.md) is the
current delivery register. v0.82.0 was the accepted public baseline at start;
v0.82.1 has passed exact-source qualification and is being published. The one
successor, reserved v0.83.0, makes the existing 91 Solo/Versus and 12 Team missions
the ordinary default while keeping explicit Legacy access. No new production,
save migration or unrelated queued feature is on this critical path. The later
approved Release B unified tagged selector follows A public acceptance immediately;
queued recovery/Studio/presentation work follows B. See the current plan for scope
and the7–11-hour B estimate.

Earlier checkpoints below retain their original evidence and dates. Their “next”
versions/order are historical, not the current publication queue. Full programme,
human-balance, physical-device and comprehensive offline gates remain open.


## Current delivery — v0.76.1 publicly verified; v0.77.0 device candidate

**Public default: [v0.76.1](https://mekhovov.github.io/revealline/releases/v0.76.1/site/game/).**
Frozen source `17bd1965a2979489f5a163de13dc23c47c5b538d`, source PR208 and
publication PR210 are accepted. Pages run35551436420 / deployment6560099093 passed.
The independent public audit matched **4,130 files / 864,317,088 bytes**. Public
boot and the 776-file core offline preparation passed. These checks do not complete
physical-device or enjoyment gates.

**Next candidate: v0.77.0 shared handheld play.** Solo, Versus and Team share touch
steering and preferences, with separate fingers for couch seats. Compact HUDs and
visible-viewport fitting preserve the complete arena without requiring fullscreen.
Required encounter instructions and event notices retain separate readable space;
short staged landscape boards are consequently smaller than ordinary Arcade boards.
Modeled controller Start, Retry, Next and pause journeys pass. They do not reproduce
or certify the reported physical Steam Deck failure. Real Safari browser bars, safe
areas, touch/controller hardware and remaining whole-mode journeys stay open.

Exact unversioned source `3da14c7eea9ea57ba74b200bf88627b8bf983a10` passed hosted
preflight, build and all four test shards in run35565825740. The versioned source,
frozen artifacts and public acceptance still require qualification. See the
[device implementation and retained evidence](shared-device-play.md). Later Team,
Studio, campaign and soundtrack candidates remain outside this release cutoff.

| Priority | Programme work | Current boundary |
|---|---|---|
| 1 | Release shared handheld controls and compact layouts | v0.77.0 candidate; unversioned source CI passed; versioned qualification, freeze and public journeys pending. |
| 2 | Finish native navigation, shared readability and actor parity | Partial; all modes, complete input journeys, actual playing scale and responsive layouts remain. |
| 3 | Action feedback, fair challenge and rewards | Partial; readable warnings/counters, loss causes, Retry/Next/stories and human playtests remain. |
| 4 | Music, creation, discovery and campaign production | Partial; auditioned media, complete asset coverage, real installation/transfer/recovery and the revised XPOSED Journey programme remain. |
| 5 | Supporting workflows and reproducible authoring | Partial; full fresh-workspace examples, current skills and data-recovery acceptance remain. |
| 6 | Full browser qualification | Partial; physical touch/controllers, listening, offline/lifecycle, ordinary-device performance and human assessment remain. |
| Later | Native stores and network multiplayer | Separate deferred gates. |

The approved [XPOSED Journey plan](xposed-journey-plan.md) supersedes the earlier
132-mission allocation: 242 Solo candidates, 12 finale Remixes and 12 purpose-built
Team missions are an authoring backlog, not delivered content or a minimum release
count. Each mission still needs its own playability and quality acceptance.

No complete programme phase is closed by these bounded corrections. Older reports
below retain their observation time and are not the current public acceptance record.

<details>
<summary>Historical v0.69.3 / v0.70 integration checkpoint</summary>

## Current delivery — v0.69.3 publicly verified; music/navigation integration continues

**Public default: [v0.69.3](https://mekhovov.github.io/revealline/releases/v0.69.3/site/game/).** Source PR193 and publisher PR199 are merged. Pages35523602476 / deployment6555180412 passed. All **3,867 files / 698,856,066 bytes** matched with zero failures/retries. Both complete source families passed **7,018 tests / 561 files on Node20.19.6**, not a two-runtime matrix.

Actual public story restore now focuses enabled Review, and Escape returns to its opener. Start/Pause/menu, nested Collection/library return, saved Continue, optional chapter installation/replacement and Stay preserving the paused flight passed. The pending Replace interval was too brief to observe publicly; retain its delayed local native/regression evidence separately. [Exact observations and limits](verification/public-v0693/README.md).

**Next candidate: v0.70.0 shared music and navigation.** It integrates the accepted publication cutoff, shared MP3 work, the nine-tool Workshop return/embedded Playground fixes, Studio readiness and keyboard boundaries, authored Solo/Versus entry with separate Team framing, and truthful first-time Start. The integrated Missions Back and successor-caption corrections now pass42/42 focused Node20.19.5 checks. Native title/chooser/backup return, a legal first win and truthful successor Continue, and checked Solo → Versus → Solo continuation passed on exact runtime41d0b908. [Evidence and limits](verification/journey-return-v070/README.md). Exact-source qualification of `4bb553d0` failed in both hosted families (35525568313 and35525562872):7,302/7,313 tests passed,11 failed per family. Preflight, production reproduction/readiness and ordinary build passed, but they do not qualify the failed source. Corrections keep static game exits available in all nine Workshop tools, model the missing native-dialog fixture boundary and include the new return dependencies in miniature builds. The integrated focused cohorts pass55/55 and58/58 on Node20.19.5, with native failed-script keyboard exits separately observed. [Failure and correction evidence](verification/workshop-boot-correction-v070/README.md). The final corrected source still needs complete qualification, freeze and public deployment. Separate later caption/More chapters Back/DOM-test optimization and new chapter candidates remain outside this release cutoff.

| Next order | Work | Current boundary |
|---|---|---|
| 1 | Finish shared music/native-navigation delivery | Candidate integration; verify original-byte media, interruption, menu return and exact final source. |
| 2 | Shared readability and actor/picture parity | Partial; real playing scale, all modes, EN/UA and device coverage remain. |
| 3 | Action feedback, fair challenge and rewards | Partial; warnings/counters, loss causes, Retry/Next/stories and human playtests remain. |
| 4 | Creation, discovery and production campaigns | Partial/candidate; full creation/install/export/recovery and complete art/audio gates remain. |
| 5 | Supporting workflows and reproducible authoring | Partial; fresh-workspace end-to-end example and current documentation/skills remain. |
| 6 | Browser qualification | Partial; physical controllers/touch, listening, offline/lifecycle, ordinary-device performance and enjoyment remain. |
| Later | Native stores and network multiplayer | Separate deferred gates. |

Archive37 preserves original v0.69.1 and v0.69.2 with their recorded scope limitations. No parent programme phase closes because of these patches. Later Journey chapter candidates are not accepted production content. Legacy Missions' selected-mission description can remain stale after a chapter change; record it as a navigation/presentation follow-up while the actual flight and save remain correct. Stable phase IDs and accepted history below are retained.


</details>

<details>
<summary>Previous v0.69.2 accepted cutoff — retained history</summary>

## Current delivery — v0.69.2 publicly verified; v0.69.3 integrating

**Public default and scoped correction baseline: [v0.69.2](https://mekhovov.github.io/revealline/releases/v0.69.2/site/game/).** Source PR191 and publisher PR195 are merged. Pages run35519111558 / deployment6554333402 passed. All **3,841 files / 698,693,223 bytes** matched with zero failures/retries. Both complete source families passed **7,011 tests / 561 files on Node20.19.6**; this is not a two-runtime matrix.

Actual public Pause keyboard checks passed at568×320,844×390 and390×844 with Plain/Large text. Focused Resume/Main menu actions remain fully visible without horizontal overflow. Explicit Resume/Pause and title→Workshop→Replay Theater→Back passed. Replay picture status remains mounted and polite/atomic when empty; audible screen-reader and missing-picture announcement checks are not claimed. [Evidence and limitations](verification/public-v0692/README.md).

**Next candidate:** v0.69.3 / PR193 preserves focus after story restore and moves focus to Stay before disabling a pending Replace confirmation. It now integrates this accepted publisher cutoff; the final integrated source needs its own full gates and immutable/public release. Earlier source-only passes do not qualify it. The nine-tool Workshop return and embedded Playground keyboard-boundary corrections remain a separate follow-on candidate.

**Following priority:** shared custom music and Border content; complete native navigation/readability, actor/picture parity, action feedback, fair challenge, rewards, creation tools and production campaigns. Journey Signal/Neon/Rover and their pictures remain candidate content. Archive37 now retains original v0.69.1 with its scoped session-only native limitation; all historical routes remain preserved.

No parent programme phase is complete because of these patches. Full input/mode journeys, physical controllers/touch, offline/custom-media recovery, listening, finished content and human challenge/enjoyment gates remain open. Stable phase IDs below keep their own acceptance criteria; Journey chapter IDs do not replace them.


</details>

<details>
<summary>Previous v0.69.1 accepted cutoff — retained history</summary>

## Current delivery — v0.69.1 publicly verified; scoped fixes continue

**Public default and scoped recovery baseline: [v0.69.1](https://mekhovov.github.io/revealline/releases/v0.69.1/site/game/).** Source PR188 merged with the qualified tree; publisher PR194 merged as `648271c9`. Pages run35515392949 / deployment6553644915 passed. The complete public inventory matched **3,815 files / 698,529,682 bytes** with zero final failures and one retained HTTP503 retry. Both complete source families passed **7,009 tests across 560 files on Node20.19.6**; this is not a two-runtime matrix.

Actual keyboard recovery passed: retained-picture conflict → Cancel → exact download opener; retry → keep existing pictures → install; Play → Stay → the same paused First Signal checkpoint; explicit Replace → Orchard Crossing; saved Continue cancellation → settled title feedback and Continue focus; explicit retry → the intended flight. The last retry included elapsed active play, so it is not evidence of a preserved paused timer. Initial session-only profile ownership and stale route observations remain retained, with corrected attribution and successful normal reload separately recorded. [Original observations and acceptance boundaries](verification/public-v0691/README.md).

**Corrections remain candidates:** v0.69.2 / PR191 fixes short-landscape pause clearance and Replay picture status. v0.69.3 / PR193 fixes story-restore focus and moves focus to the available Stay action before disabling a pending Replace confirmation. Local/scoped checks do not substitute for each final integrated source's complete gates, immutable release, Pages deployment and public journeys. The Studio return correction is reviewed for a follow-on navigation delivery; the eight other external Workshop return paths still require implementation.

**Next in order:** release v0.69.2, then v0.69.3; promote shared custom music and Border candidates; continue navigation/presentation and actor parity, action feedback, fair challenge, rewards and creation tools. Journey Signal/Neon/Rover candidates and their art remain unaccepted production content. Archive36 now retains original v0.68.2 and v0.69.0; archive37 is being prepared for original v0.69.1. All historical routes and their scoped limitations remain authoritative.

No parent programme phase is marked complete by these patches. Full mode/input journeys, physical controllers and touch, browser offline/custom-media recovery, listening, finished content and human challenge/enjoyment gates remain open. The stable phase tables below retain their own acceptance criteria; Journey chapter IDs do not replace them.


</details>

<details>
<summary>Previous v0.69.0 deployed cutoff — retained history</summary>

## Current delivery — v0.69.0 deployed; native corrections under verification

**Public default is [v0.69.0](https://mekhovov.github.io/revealline/releases/v0.69.0/site/game/). Scoped accepted baseline remains v0.68.2 while the newly found continuation issue is corrected.** Publisher PR189 merged as `cb55248a`; Pages run35509763892/deployment6552582851 succeeded. Full public HTTP verification matched **3,789 files / 698,351,359 bytes**, zero failures/retries. Frozen game source remains `5178c434` / tree `8e1becb4`, with both complete 6,983-test/560-file hosted families on Node20.19.6. No immutable release has been overwritten.

Native keyboard First return win → full picture → results → Next passed. Reload identified Choose your share, and explicit Load restored its 0% / three lives / zero score / 3:43 paused state. Immediate Escape after title Continue exposed stale field preparation feedback; this is retained as a failed observation. At 844×390 with Large/Plain text, the pause Main menu focus border is slightly clipped; keyboard activation works. These gaps prevent full native-phase acceptance despite the successful file audit. [Observations and correction evidence](verification/title-restore-cancellation/README.md).

**v0.69.1 remains an unpublished candidate in PR188.** It preserves retained picture assignments during original-media recovery, adds responsive recovery focus handling, and now settles title-abort feedback and retains Continue focus. Recovery passed84 focused tests; title cancellation passed50 tests in two complete files on Node20.19.5. Final exact-source hosted gates, immutable release publication and public retesting remain required. Earlier candidate runs retain their own source identities and cannot qualify these latest changes.

**Next in order:** finish and publish the recovery/cancellation patch; close the separate paused-overlay clearance issue; integrate and qualify shared custom music; continue native navigation and consistent presentation, actor/picture parity, action feedback, fair challenge, rewards and authoring. Campaign expansion follows those quality gates. Shared music and P03 encounter/authoring candidates are not accepted production content. Archive36 append PR2 is prepared but not deployed; existing original v0.68.2 archive evidence remains unchanged. Full offline/media recovery, physical device/controller, audible listening and human challenge/enjoyment gates remain open. Stable programme phase statuses below remain partial/queued; no parent phase is marked complete by this scoped correction.


</details>

<details>
<summary>Previous v0.69.0 publication cutoff — retained history</summary>

## Current delivery — v0.69.0 qualified and published; Pages verification pending

**Accepted public baseline remains [v0.68.2](https://mekhovov.github.io/revealline/releases/v0.68.2/site/game/) until the v0.69.0 selector deployment and public journeys pass.** The Journey foundation is source-qualified at `5178c434` / tree `8e1becb4`, source PR184 merged as `01c1fbb5` with the exact qualified tree. Both complete hosted families passed **6,983 tests across 560 files on Node 20.19.6**. Frozen original source/distribution and offline bindings passed inspection; release392405261 has nine verified assets and the GitHub Latest pointer. These are source/release gates, not full-phase or physical-device acceptance.

Journey adds versioned direction-only Arcade, authored candidates and Studio exports, untimed Versus and Team foundations while retaining legacy identities. The scoped local keyboard continuation/capture-stop/Pause observations remain distinct from the pending public acceptance. Stable programme phase IDs below remain unchanged; the Journey P01 foundation workstream does not close every programme P01/P03/P06 requirement.

**Archive36 is verified:** original v0.68.2, archive PR1 / `a0f67a3f`, deployment6552182155; all **729 files / 313,829,048 bytes** matched with zero failures. This is a new archive with zero prior accepted paths. Native keyboard entry, saved Continue and explicit Pause passed. The existing retained-picture conflict remains an explicit limitation. [Evidence](../publishing/pages-controller/evidence/archive-36/README.md).

**Next, in order:** finish actual v0.69.0 Pages verification; qualify the separate retained-picture recovery correction (PR188, candidate0.69.1) and responsive focus correction; finish shared custom music qualification; continue native navigation, actor/picture parity, feedback, fair challenge, rewards and creation tools before bulk campaigns. The recovery candidate passed 84 focused tests and an actual Cancel → retry → keep pictures keyboard journey, but is not included in v0.69.0. Music and new Team terrain remain independently tested candidates. Full browser/device, listening, production-content and human-playtest gates remain open.

</details>

<details>
<summary>Previous v0.68.2 acceptance cutoff — retained history</summary>

## Current delivery — v0.68.2 scoped public verification complete

**Public default: [v0.68.2](https://mekhovov.github.io/revealline/releases/v0.68.2/site/game/).**
Publisher PR183 merged `67b86e00`; Pages35501817965/deployment6551163081 passed the
full3,660-file/645,883,268-byte audit with zero failures/retries. Native keyboard
checks passed same-current-chapter preservation, deliberate different-chapter
Replace and Stay with visible state/focus retained. [Evidence and limits](verification/current-chapter-v0682/public/README.md).
This accepts that named correction only; P03/P06 remain partial.

**Open P06 finding:** external Pressure Pictures installation refused a retained
picture-binding conflict and preserved existing media/flight. Diagnose and offer
a recoverable explicit resolution; do not overwrite or relax identity guards.

**Next:** qualify Journey candidate `041f1a71` (PR184, unpublished0.69.0), including
Arcade action authority, saved-edition recovery, explicit untimed Versus and legacy
reference identities; then qualify shared custom music composition. Forty-seven
focused correction tests pass on Node20.19.5 and22.22.2. Full source gates and public
acceptance remain required. The music composition is a candidate, not a shipped
feature. The final Journey source now incorporates the v0.68.2 publisher and
acceptance record `1a1ec94c`; runtime, tests, authorship inputs and package versions
remain byte-identical to `041f1a71`. Its earlier full runs remain precursor evidence;
the integrated commit requires its own complete qualification.
[Final-runtime native continuation observation](verification/journey-current-integration-native.json)
retains the actual observed source separately from this documentation merge. Continue actor/presentation parity, action feedback, fair challenge, rewards
and authoring according to the stable phase tables below.

</details>

<details>
<summary>Previous v0.68.2 publication cutoff — retained history</summary>

## Current delivery — v0.68.2 qualified; Pages verification pending

**Accepted public baseline remains [v0.68.1](https://mekhovov.github.io/revealline/releases/v0.68.1/site/game/) until the new selector deployment passes its public checks.** The v0.68.2 original release is published as release 392361562, tag object `222c5f1e`, source `aadd855e` / tree `02080a77`. Source PR179 merged as `8114a4da` with the identical tree. Both complete hosted families passed **6,753 tests across 518 files on Node 20.19.6**, and the original source/distribution/offline bindings passed hosted inspection. The actual upload consumer verified all seven metadata assets and the two original payloads. No physical-device, listening or full-phase claim follows from those checks.

The correction keeps an unfinished Solo chapter's exact paused cut, picture, profile and saved continuation when its own More worlds Play action is selected. Different chapters retain checked Stay/Replace. The original failed full run and corrected expectation remain retained. Final deployed same-chapter and different-chapter keyboard checks are still required; P03/P06 remain partial.

**Archive35 append is verified:** PR2 / `36994813`, deployment `6550582822`, retains original v0.68.0 and v0.68.1. All **1,455 files / 627,648,506 bytes** passed the public byte audit with no failures or retries. All 726 old immutable release paths are unchanged; only the landing index changes among the 729 prior paths. Keyboard root → title → saved Continue → Pause passed for both versions, with their known limitations retained. [Archive evidence](../publishing/pages-controller/evidence/archive-35/append-v0681/README.md).

**Next, in order:** finish the v0.68.2 publisher and actual public acceptance; reconcile the stable Journey candidate with current host fixes; integrate the shared custom-music candidate (PR182, 593 focused tests and native MP3 transport checks, not a public release); continue presentation, feedback, challenge, rewards, authoring and qualification. The remaining phase IDs and their partial status stay unchanged. Five source-file conflicts in the Journey integration have prepared resolutions, but syntax checks alone do not accept that integration.

<details>
<summary>Previous v0.68.1 acceptance and preparation cutoff — retained history</summary>

## Current delivery — v0.68.1 publicly verified

**Public default: [v0.68.1](https://mekhovov.github.io/revealline/releases/v0.68.1/site/game/).** Publisher PR180 merged as `5d54b938`; deployment `6550183682` passed all 3,635 public files / 645,730,399 bytes with zero failures/retries. Native keyboard verification covers Settings Close/tabs at 844×390 and 390×844 with Plain/Large text, visible fallback focus, saved Continue → correct paused caption and About → Team Start/Pause. [Original evidence and scope](verification/player-menus-v0681/public/README.md). This closes the named menu-correction scope, not the complete navigation/presentation phases.

v0.68.0's same-chapter More worlds issue persists in v0.68.1. Stay preserves the run; v0.68.2 corrects the unnecessary replacement. P03/P06 remain partial.

**v0.68.1 is published and source-qualified.** PR178 merged as `49cef024`; its tree equals immutable source `276cbba3` / tree `3fa643a6`. Both final full hosted families passed 6,752 tests / 518 files on Node 20.19.6. Release 392336219 retains nine verified assets. Its corrections keep Settings Close/tabs reachable, restore visible focus, accurately describe Pause/Resume and provide accessible About mode entry. The local 171-test/ten-file cohort and keyboard/responsive observations remain distinct from full suites and the separate public verification above.

**Historical retention:** Archive35 PR1 deployed original v0.68.0 at `b603b1d1`, deployment `6550067348`; all 729 files / 313,820,502 bytes passed public checks. Keyboard root → saved Continue → Pause passed. Stale pause text and the known same-chapter issue remain explicit limitations in the immutable archive.

**Next, in order:**

1. v0.68.1 scoped public gate is complete. Preserve its immutable assets, previous release routes and remaining limitations.
2. Complete v0.68.2 qualification (PR179), fixing same-chapter selection without replacing or rewriting the paused run. First full runs for `45ed925e` failed an obsolete offline test expectation; correction `dfdd2687` passes its complete 15-test file on Node 20/22. Fresh exact-source full qualification and public acceptance remain pending.
3. Continue Journey Solo/Versus and Team foundation acceptance. The five shared-music packets are now composed against `aadd855e` in an isolated candidate: **593/593 tests across 38 files on Node 20.19.5**, lint/format and native two-MP3 import, ordered playback, cross-mode library and focus checks pass. [Integration evidence and remaining gates](verification/couch-music-integration/README.md). Allocate its release version only after final composition; full source, listening, offline and public acceptance remain open.
4. Continue presentation/actor parity, readable action feedback, fair challenge, rewards, authoring/content and complete browser qualification. Physical controllers/touch, listening, actual offline recovery and human difficulty assessment remain separate gates.

The authoritative phase table below retains its stable IDs and partial statuses. Each scoped release has a source PR, immutable version, publisher PR and actual public verification. Native stores and online multiplayer remain later.

</details>

<details>
<summary>Previous v0.68/v0.68.1 preparation cutoff — retained history</summary>

## v0.68.1 menu correction — local verification, release pending

The separate v0.68.1 correction backports persistent Solo Settings Close/tabs, visible focus fallback after responsive changes, accurate Pause/Resume captions and About’s Team mode entry. It preserves the qualified v0.68 simulation and campaign identities. The v0.69 Journey foundation remains a separate candidate.

The integrated correction passed **171 focused tests in ten files on Node 20.19.5**, changed-source lint/format checks and native keyboard observations: Plain/Large settings at 390×844 and 844×390, visible Game menu fallback after a hidden opener, saved-flight caption changes, and About → Team. These are local checks, not full source qualification or public acceptance. [Scope, observations and remaining gates](player-menu-v0681.md).

Next: complete v0.68 publisher PR177 and its actual public verification, then qualify this exact correction source and publish its own immutable release. Parent navigation/presentation phases and physical input, listening, offline and human-playtest gates remain open.

## v0.68 release delivery — source accepted, public gate pending

Source PR170 merged as `47169c9f`; the merge tree equals qualified source `5598d562` / tree `4cca352f`. Both final hosted families passed **6,738 tests across 518 files on Node 20.19.6**, with source/production gates, ordinary build and frozen inspection. The source combines chapter discovery with Journey, safe current-flight replacement, concealed Team previews, level-specific guidance and Studio audio lifecycle. This is a named P06/P03 integration delivery, not completion of those parent phases.

The publication selector below is prepared for v0.68.0. Actual Pages deployment, complete public inventory and affected native journeys remain required before this becomes the accepted public baseline. Preserve the accepted v0.67 report below. Its original release is additionally retained by archive-34 append commit `fc3377b2`, deployment `6549129296`: all **1,436 files / 627,342,489 bytes** matched, including every old immutable release path.

Next scoped corrections are committed separately in Journey P01 PR172: persistent Settings Close/tabs on short screens, visible focus fallback after responsive layout changes, and an accurate paused flight cue. Foundation media/preparation, backup and difficulty work remain candidates. The later shared MP3/playlist, actor motion, encounters, campaign production and final hardware/listening/offline/human gates retain their order. No passed automated suite closes a physical or human gate.

## Current delivery — 20 September 2026, v0.67 verified publication

**Latest scoped public release: [v0.67.0 Journey technical preview](https://mekhovov.github.io/revealline/releases/v0.67.0/site/game/?journey=1).** PR169 supplies frozen source `6a42faca`; PR174 merged publisher `555f0979`. Pages run `35487668271` and deployment `6548787815` passed. The complete actual public audit verified **3,573 files / 645,190,134 bytes**, zero failures/retries. All 105 release records and 34 archive admissions remain. [Acceptance and original evidence](../publishing/pages-controller/delivery/evidence/journey-p00/v0670-public/README.md) distinguish public bytes from native input and outstanding gates.

Keyboard Start/clear/Next, two-step Skip and cancellation, search/cross-campaign selection, reload/Continue and retained v0.66 entry passed. First Signal recorded 52.2%, 8,160 points and three lives. Portrait cards/Back were readable; short-landscape geometry passed, but its compositor screenshot was not accepted as a visual baseline. **Journey P00 and the full programme remain incomplete.** Physical devices, audible listening, offline/lifecycle, performance and human playtesting are still required. The default entry retains the legacy interface; `?journey=1` selects the preview.

### Prioritized continuation

1. **v0.68 discovery/navigation delivery:** candidate `4690fedd` passed both full source families, each 6,738 tests / 518 files on Node 20.19.6, ordinary build and exact frozen inspection. Finish integration against the new publisher cutoff, final attachment-consumer checks, source PR170/release publication and actual public journeys. Prior failed sources stay failed; frozen inspection alone is not release acceptance.
2. **Journey foundations and early Border encounters:** P01 candidate PR172 and stacked P02 draft PR175 remain separately scoped. Registry/Studio restore and seven greybox encounters have focused evidence; artwork, full routes, authoring integration, balance and human gates remain. Keep provisional v0.69/v0.70 distinct from the accepted v0.67 preview.
3. **Shared music and supporting navigation:** integrate the reviewed Couch music host with its 592-test focused Node 20/22 cohort, then actual transfer/listening/offline qualification. The five-path About candidate adds Team and removes stale counts; 33 focused tests per Node 20/22 and local keyboard/responsive checks passed. Neither candidate is publicly shipped.
4. **Presentation and campaign completion:** continue actor parity/action feedback, fair challenge and rewards, then media/content production and full qualification in the approved Journey plan. The inactive motion-format candidate does not count as delivered animation. Bulk art remains gated by capacity and the gameplay benchmark.
5. **Release maintenance:** upgrade obsolete action runtimes using reviewed immutable pins, preserving the explicit game runtime and frozen tags. [Primary-source research](../publishing/pages-controller/delivery/evidence/journey-p00/v0670-public/release-maintenance-research.md) records current action compatibility and caching changes. Do not alter ongoing/frozen qualification.

The [Journey plan](xposed-journey-plan.md) owns the new campaign allocation and P00–P15 sequence. Historical cross-mode IDs retain their meanings: P00/P01/P02-A accepted; P02-B/P03–P09/P16–P18 partial; complete Team encounters and production campaigns remain pending. Native stores and online multiplayer stay separate. Each completed delivery receives its own reviewed commit/version, immutable release, Pages deployment and actual acceptance.

### v0.68 publication integration cutoff

The v0.68 candidate now incorporates publisher `555f0979` and the reviewed v0.67 public evidence from PR176 (`465918ad`). Only this execution register conflicted; both prior reports are retained below. Runtime, tests, campaign/asset identities and package/build versions remain byte-identical to `4690fedd`. Its passing 6,738-test families and frozen inspection remain precursor evidence for that exact source. The combined commit requires new complete qualification and its own freeze before release; no original artifact or published tag is replaced. PR176 must pass and merge before this source PR.

<details>
<summary>Previous v0.68 source register cutoff — retained verbatim</summary>

## Current delivery — 20 September 2026

**Accepted public baseline: [v0.66.0 Team and Studio update](https://mekhovov.github.io/revealline/releases/v0.66.0/site/game/).** Its scoped public acceptance covers exact Team artwork through Start/win/picture/Next/Retry, both-seat rescue presentation previews, full Solo/Versus/Team Studio previews, and saved asset-history Bind/Undo/Redo/Reset. The accepted publisher is `7b898a7b`, frozen game source `dae39ba7` and release `392248530`. Pages run `35480159218` passed; the public audit verified **3,533 files / 644,953,790 bytes with zero failures or retries**. [PR173](https://github.com/mekhovov/revealline/pull/173) preserves the acceptance evidence without changing the deployed source. These named features are complete; their larger P03/P04/P05/P07/P08/P18 phases remain open.

**Journey v0.67.0 source is qualified and merged, but not yet publicly accepted at this cutoff.** [PR169](https://github.com/mekhovov/revealline/pull/169) merged as `0c38826f`, preserving frozen source `6a42faca` / tree `ca86b288`. Both complete hosted families passed **6,568 tests across 505 files on Node 20.19.6**, plus source/production/build and frozen verification. The preview remains opt-in through `?journey=1`. Its immutable release, Pages deployment and public journey acceptance must finish before it replaces the accepted baseline.

### Delivery order

1. **Publish and accept Journey v0.67.0.** Verify the actual deployed Start, direct Next, two-step Skip, mission search and stable Continue, preserving the separately qualified historical simulation. Local exact-source checks do not substitute for public acceptance.
2. **Qualify and publish Discovery v0.68.0.** Compose Solo/Versus/Team chapter discovery, registered Training return, visible busy Cancel, native Escape, concealed Team previews, content-specific Team guidance and Studio master-audio lifecycle with the accepted Journey source. The first `e8a588da` full suites failed; keep their evidence and qualify this new integrated source afresh. Runtime composition preserves exact source-pack artwork, both cancellation owners and Practice containment. Broader P06 installation/recovery remains partial.
3. **Finish shared music and actor presentation.** Couch music-library/playlist/session adapters and compiled actor motion are tested candidates, not shipped completion. Finish real host integration, original MP3 transfer and offline playback, listening, motion readability, historical asset compatibility and actual browser journeys before separate versioned releases.
4. **Continue navigation, challenge, rewards and authoring.** Complete remaining P03/P05 player journeys, P08 readable action feedback, P09 fair encounters and P07 rewards, then supporting P04/P06 tools and P10 Team encounters. Qualify each named delivery independently; do not wait for bulk content to fix a demonstrated player issue.
5. **Expand campaigns only through the approved Journey programme.** The [Xposed-led Journey plan](xposed-journey-plan.md) owns its P00–P15 sequence and twelve-campaign allocation. The earlier four-FPV/four-DroneAid and 132-mission targets are historical. Candidate counts are not a minimum shipping quota or accepted content.
6. **Complete browser qualification before store/network expansion.** Finish supporting workflows, reproducible authoring, device/performance/accessibility, real audio/offline recovery, physical touch/controllers and human gameplay review. Native stores and online multiplayer retain separate gates.

### Cross-mode phase status

Journey P00–P15 and the established cross-mode phase IDs below are distinct workstreams. Complete means accepted in the named scope; a candidate, passing subset or merged source is not public acceptance.

| Phase | Status | Remaining work |
|---|---|---|
| P00 — Integration baseline | Complete, v0.55 | Preserve historical execution and media identities. |
| P01 — Loading feedback | Complete, v0.57.4 | Apply the accepted contract to every new screen. |
| P02 — Sound and music | A complete, v0.58.1; B partial | Publish Studio follow-up; finish cross-mode custom MP3s, playlists, original-byte backup/offline use and album listening. |
| P03 — Native navigation | In progress | Finish all keyboard/controller/touch journeys and exact Back/focus ownership. |
| P04 — Creation framework | Partial | v0.66 previews/history accepted; finish full edit/export/import/play and original recovery. |
| P05 — Readable presentation | In progress | Complete EN/UA, all modes, zoom, reduced effects and device readability. |
| P06 — Discovery/install | In progress | Qualify v0.68 scope; finish capacity, replacement/removal and interrupted installation. |
| P07 — Rewards/continuation | Partial | Imported-Team continuation accepted; finish other Next/Retry, stories and Collection replay. |
| P08 — Art and feedback | A/B partial | Finish motion/role/scale readability and trail, loss, pickup and live Support/rescue feedback. |
| P09 — Challenge/intelligence | Partial | Fair pressure, encounter warnings/counters, deterministic replay and playtest tuning. |
| P10 — Team encounters | Queued | First Connection/Relay Yard variants and the complete two-player encounter matrix. |
| P11–P15 — Earlier campaign allocations | Superseded for new production | Follow the approved Journey campaign plan; retain historical releases and compatibility. |
| P16 — Supporting workflows | Partial | Collection, scores, replay, learning, restoration and legacy workflows. |
| P17 — Reproducible authoring | Partial | Fresh-workspace create/install/play/export/recover example, guides, skills and CLI. |
| P18 — Browser qualification | Partial evidence | Full regression, ordinary-device performance, physical inputs, audible media/offline/lifecycle and human playtests. |
| Native stores / online multiplayer | Deferred | Independent packaging, platform lifecycle, hardware and network gates. |

Every completed feature still requires related hunk-reviewed commits, a new immutable version, source PR, qualified frozen assets, publication-selector PR, Pages deployment and affected public journeys. Retain previous releases and rollback. v0.66 source-original download completion, live held rescue, physical hardware, actual 200% zoom, audible listening, offline runtime and encounter difficulty are not established by its scoped native observations.

</details>

<details>
<summary>Previous v0.67 publication proposal — retained verbatim</summary>

## Current delivery — 20 September 2026, v0.67 publication

**Accepted public baseline: [v0.66.0](https://mekhovov.github.io/revealline/releases/v0.66.0/site/game/).** Its Team artwork ownership, actor-state previews and cross-mode Studio/history scope passed; all 3,533 public files / 644,953,790 bytes were verified. Full phases and hardware/audio/offline acceptance remain open.

**v0.67.0 Journey technical preview:** source `6a42faca` / tree `ca86b288` passed both full hosted families, each 6,568 tests / 505 files on Node 20.19.6. PR169 merged; the immutable tag and stable release 392287575 retain all nine verified assets. Corrected hosted upload 35484727077 passed after a retained evidence-ZIP layout failure. The Pages selector in this change proposes v0.67.0; actual deployment, full public-byte audit and native Journey acceptance remain pending. Do not mark the parent Journey phase complete from this proposal.

**v0.66.0 preservation:** Archive34 source `68d29403`, deployment `6548389224`, retains all 716 public files / 313,634,855 bytes with zero failed requests. Keyboard verification covers Solo first win, Next, Pause, saved mode leave, Team start and pause. The other 33 archives remain unchanged.

### Prioritized continuation

1. Finish v0.67 Pages deployment, verify every public byte and the actual Journey Start/clear/Next/Skip/Continue flow; update acceptance only afterward.
2. Finish exact-source v0.68 qualification of `4690fedd` (PR170): combined Journey/discovery owner resolution, Practice containment, concealed previews, Team guidance and Studio audio corrections. Both final suites are running; earlier failed candidates stay failed.
3. Review and integrate the sealed shared Couch music host after v0.68. The focused 592-test Node 20/22 matrix and native menu/import/Save/focus evidence are candidate checks, not release or listening acceptance.
4. Continue the approved Journey plan’s registry/Studio foundations, then benchmark gameplay, actor parity/action feedback, fair challenge, rewards, optional media/content and full qualification in that plan’s order. Bulk art remains gated by capacity and the gameplay benchmark.

The [Journey plan](xposed-journey-plan.md) owns new campaign counts and its P00–P15 sequence. Historical cross-mode IDs below retain their original meanings: P00/P01/P02-A accepted; P02-B/P03–P09/P16–P18 partial; Team encounters and bulk campaigns still require their complete gates. Native-store certification and online multiplayer remain separate. Each independently completed delivery needs a scoped commit/version, original release, Pages deployment and acceptance.

</details>

<details>
<summary>Previous register cutoff — retained history, not current acceptance</summary>


## Journey redesign authority — 20 September 2026

The approved [Xposed-led Journey plan](xposed-journey-plan.md) now owns the new
campaign redesign, its twelve-campaign allocation and P00–P15 delivery sequence.
The four FPV/four DroneAid and 132-mission allocations below are historical, not
instructions for new Journey production. Existing release identities, evidence,
unrelated in-flight deliveries and compatibility obligations remain intact.
Journey P00 is an isolated 0.67.0 technical preview; it is not yet released or
fully validated. This does not relabel the historical cross-mode phases below.

## Current delivery — 20 September 2026

**The scoped [v0.66.0 Team/Studio release is publicly accepted](https://mekhovov.github.io/revealline/releases/v0.66.0/site/game/).**
Its [acceptance record](../publishing/pages-controller/delivery/evidence/cross-mode-p04/v0660-public/root-acceptance.json)
binds frozen source `dae39ba7`, actual publisher `7b898a7b`, Pages run `35480159218`
and deployment `6547558688`. All 3,533 public files / 644,953,790 bytes matched,
without failures or retries. Scoped original-byte Team import, earned picture,
Next/Retry and Studio preview/history journeys passed. Original-download completion,
physical input, live held rescue, audio listening, offline behavior, balance and
whole parent-phase validation are explicitly not claimed. v0.65.0 remains preserved
through Archive33; its earlier scoped acceptance is retained below.

Acceptance-only PR173 merged as `cc049190` with tree `761b9210`, identical to its
reviewed evidence head `5ddddd87`. This evidence merge did not redeploy Pages;
the actual accepted public deployment remains bound to `7b898a7b`.

Journey P00 PR169, source `6a42faca`, is undergoing fresh exact-source verification
for 0.67.0 after its capture-caption correction and accepted-publication integration.
Discovery PR170 follows as 0.68.0; P01 foundations/Studio PR172 is provisionally
0.69.0 and is not released. Parent cross-mode P03/P04/P05/P06/P07/P08/P18 and all
remaining Journey obligations stay open. No earlier green source receipts qualify
later edits, and automated feasibility does not prove enjoyment.

<details>
<summary>Historical v0.66.0 prepared-delivery cutoff — retained verbatim</summary>

**Play the accepted [v0.65.0 imported-Team continuation update](https://mekhovov.github.io/revealline/releases/v0.65.0/site/game/).** Ordinary import, the first win, earned-picture viewing with exact focus return, Next, the final win and same-arena Retry passed on the actual public release. The [scoped acceptance record](../publishing/pages-controller/delivery/evidence/cross-mode-p07/v0650-public/README.md) combines that keyboard journey with all **3,500 deployed files / 644,685,649 bytes**, zero failures and zero retries. **P07-TEAM-IMPORTED-CONTINUATION is Complete; P03/P07/P08/P18 remain open.** The owned enemy-free fixture proves navigation, not encounter difficulty or live rescue.

The accepted publisher is `e6e269ea` / tree `7e96a3c4`, selecting frozen source `57fdc39a` / tree `b71a23d6` and release `392203520`. Pages run `35474519516`, deployment `6546633515` and the final release/tag/nine-asset readbacks agree. [Archive33 v0.64.3 preservation](../publishing/pages-controller/evidence/archive-33/initial-v0643/root-acceptance.json) is already accepted; its [additive v0.65.0 preservation](../publishing/pages-controller/evidence/archive-33/append-v0650/root-acceptance.json) is now accepted for all 1,421 files / 627,143,902 bytes, with unchanged earlier release bytes and scoped keyboard continuation. This does not establish offline, hardware or encounter-balance acceptance. Existing archive routes and originals stay retained.

### Next deliveries

1. **Publish and verify Team/Studio v0.66.0.** Exact final source `dae39ba7` / tree `e003212f` passed both hosted families, each **6,541 tests across 501 files on Node 20.19.6**, the six source gates, production/readiness, ordinary build and frozen inspection. [PR166](https://github.com/mekhovov/revealline/pull/166) merged with the identical tree. Annotated tag `991bfc31` and stable release `392248530` retain all nine verified original assets; upload run `35475685648` and its reconciled receipt passed. The feature includes original-byte Team artwork, pilot states, Solo/Versus/Team Studio previews and approved history Undo/Redo/Save/Reload. Archive33 append acceptance and stable promotion passed; canonical stable metadata remains byte-identical. The enabled publisher, complete public-byte checks and affected public journeys remain required. v0.65.0 stays the accepted baseline until those gates pass.
2. **Continue separately qualified content-discovery sources.** Earlier [PR169](https://github.com/mekhovov/revealline/pull/169) owns v0.67.0. The later all-mode P06 work in [PR170](https://github.com/mekhovov/revealline/pull/170) is coordinated as v0.68.0 after the v0.67.0 Levels delivery; its exact source allocation and qualification remain separate. Both source merges are held during this v0.66 publisher delivery. Their runtime changes are not part of this publisher. Discovery source `e8a588da` failed both original hosted families (22 failures each); preserve those receipts and qualify the corrected integration afresh. No final source qualification or public acceptance is inferred here. Preserve observed Training, Escape, busy-focus and layout failures with their separately tested corrections; finish exact-source qualification and affected public journeys before marking their scope complete.

### Phase status

Complete means accepted within the named release scope. Partial/In progress means required work remains; candidate preparation does not close a phase.

| Phase                              | Status                         | Remaining delivery                                                                                                       |
| ---------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| P00 — Integration baseline         | Complete, v0.55                | Preserve compatibility.                                                                                                  |
| P01 — Loading feedback             | Complete, v0.57.4              | Apply the contract to new screens.                                                                                       |
| P02 — Sound and music              | A complete, v0.58.1; B partial | Cross-mode MP3/mixed playlists, transfer/offline use and the 24-track listening gate.                                    |
| P03 — Native navigation            | In progress                    | Workshop recovery accepted; finish all menus, focus returns and keyboard/controller/touch journeys.                      |
| P04 — Creation framework           | Partial                        | Publish Team/Studio work; prove edit/export/import/play and original-byte recovery.                                      |
| P05 — Readable presentation        | In progress                    | HUD and Replay fixes accepted; finish EN/UA, all modes, zoom and reduced-effects coverage.                               |
| P06 — Discovery/install            | Partial                        | Discoverable compatible content, capacity, replacement/removal and interrupted-install recovery.                         |
| P07 — Rewards/continuation         | Partial                        | Imported-Team continuation accepted; finish other Retry/Next paths, full-picture rewards, stories and Collection replay. |
| P08 — Art and feedback             | A/B partial                    | Role silhouettes, scale/heading and clear trail, impact, loss, pickup and Support/rescue feedback.                       |
| P09 — Challenge/intelligence       | Partial                        | Fair pressure, readable warnings, encounter tuning and deterministic replay/checkpoints.                                 |
| P10 — Team encounters              | Queued                         | First Connection/Relay Yard variants and the two-player encounter matrix.                                                |
| P11 — FPV campaigns                | Queued, 0/4 accepted           | Four campaigns × twelve finished missions.                                                                               |
| P12 — DroneAid campaigns           | Queued, 0/4 accepted           | Four campaigns × twelve finished missions.                                                                               |
| P13 — Ukrainian culture            | Queued                         | Twelve reviewed Living Atlas missions.                                                                                   |
| P14 — Retro arcade                 | Queued                         | Twelve After School Arcade missions.                                                                                     |
| P15 — Spend management             | Queued                         | Twelve Spend in Motion missions.                                                                                         |
| P16 — Supporting workflows         | Partial                        | Collection, scores, replay, learning, restore and legacy workflows.                                                      |
| P17 — Reproducible authoring       | Partial                        | Fresh-workspace create/install/play/export/recover example; guides, skills and CLI examples.                             |
| P18 — Browser qualification        | Partial evidence               | Complete regression, performance, accessibility, audio/offline/lifecycle, real hardware and human playtests.             |
| Native stores / online multiplayer | Deferred                       | Separate platform and network gates.                                                                                     |

**Execution order after these deliveries:** P03/P05 → P08-A/P08-B → P09/P07 → P02-B → P04/P06 → P10 → P11–P15 → P16/P17 → P18. Independently complete supporting fixes may ship earlier. The 132 new campaign missions remain a backlog target; bulk production follows the three-level gameplay and presentation benchmark.

The accepted imported-Team journey is desktop keyboard/visible-controls scope; its owned enemy-free fixture proves flow. Physical controllers/touch, phone/short-landscape/200% zoom, audible listening, offline acceptance, Team two-core encounters and held rescue remain open. Every independently completed feature still needs its own related commit, versioned release, Pages deployment and scoped public acceptance.

</details>

<details>
<summary>Historical v0.65.0 selector current-summary cutoff — retained verbatim</summary>

## Current delivery — 20 September 2026

**Play the accepted [v0.64.3 Workshop recovery update](https://mekhovov.github.io/revealline/releases/v0.64.3/site/game/).** If another game owns saved media, the Workshop explains the refusal; after that game closes, deliberate Reload restores editing and visible focus without losing the originals. The [scoped acceptance record](../publishing/pages-controller/delivery/evidence/cross-mode-p03/v0643-public/README.md) joins the actual keyboard recovery journey with verification of every deployed main file. **P03-WORKSHOP-01 is Complete; P03 and P05 remain In progress.**

[Archive33 preservation](../publishing/pages-controller/evidence/archive-33/initial-v0643/root-acceptance.json) is separately accepted for v0.64.3. The earlier HUD and Replay releases remain retained. Archive acceptance, source qualification and main feature acceptance each keep their own evidence and limits.

### Next three deliveries

1. **Deploy and verify imported-Team continuation v0.65.0.** [The stable release](https://github.com/mekhovov/revealline/releases/tag/v0.65.0) now preserves all nine verified originals from frozen source `57fdc39a` / tree `b71a23d6`. Metadata and the reviewed Pages selector are prepared. Hosted deployment, complete public-byte checks and an actual public imported picture → win → Next/Retry journey still remain. Until those pass, v0.64.3 remains the accepted playable baseline. Enemy-free native flow proves navigation only; encounter balance and held rescue remain separate.
2. **Prepare the qualified Team/Studio v0.66.0 release.** Final source `dae39ba7` / tree `e003212f` passed both complete hosted families: each has 6,541 passing tests across 501 files on Node 20.19.6, plus the six source gates, production/readiness and ordinary build. Its own freeze passed independent inspection. [PR166](https://github.com/mekhovov/revealline/pull/166) merged as `ce8c72ed` with the identical tree. Preserve the scoped native evidence, finish its separate release package and verify its actual public journeys after v0.65.0 acceptance. The earlier ad57 result remains precursor evidence; v0.66.0 is not publicly accepted.
3. **Qualify chapter discovery and Training return.** The P06 Solo/Versus composition and Team discovery candidate are prepared for integration. Actual keyboard checks exposed chapter-dialog Escape and busy-focus issues; separately tested corrections retain those failed observations. Corrected native Escape passes, while busy-focus verification remains open. Retain the original Training failure and its scoped corrected return-to-guide observation. Complete the affected composition checks, source allocation and real combined player journeys before publication. Broader installation/recovery remains open.

### Phase status

Complete means accepted within the named release scope. Partial/In progress means required work remains; candidate preparation does not close a phase.

| Phase | Status | Remaining delivery |
|---|---|---|
| P00 — Integration baseline | Complete, v0.55 | Preserve compatibility. |
| P01 — Loading feedback | Complete, v0.57.4 | Apply the contract to new screens. |
| P02 — Sound and music | A complete, v0.58.1; B partial | Cross-mode MP3/mixed playlists, transfer/offline use and the 24-track listening gate. |
| P03 — Native navigation | In progress | Workshop recovery accepted; finish all menus, focus returns and keyboard/controller/touch journeys. |
| P04 — Creation framework | Partial | Publish Team/Studio work; prove edit/export/import/play and original-byte recovery. |
| P05 — Readable presentation | In progress | HUD and Replay fixes accepted; finish EN/UA, all modes, zoom and reduced-effects coverage. |
| P06 — Discovery/install | Partial | Discoverable compatible content, capacity, replacement/removal and interrupted-install recovery. |
| P07 — Rewards/continuation | Partial | Imported-Team delivery; reliable Retry/Next, full-picture rewards, stories and Collection replay. |
| P08 — Art and feedback | A/B partial | Role silhouettes, scale/heading and clear trail, impact, loss, pickup and Support/rescue feedback. |
| P09 — Challenge/intelligence | Partial | Fair pressure, readable warnings, encounter tuning and deterministic replay/checkpoints. |
| P10 — Team encounters | Queued | First Connection/Relay Yard variants and the two-player encounter matrix. |
| P11 — FPV campaigns | Queued, 0/4 accepted | Four campaigns × twelve finished missions. |
| P12 — DroneAid campaigns | Queued, 0/4 accepted | Four campaigns × twelve finished missions. |
| P13 — Ukrainian culture | Queued | Twelve reviewed Living Atlas missions. |
| P14 — Retro arcade | Queued | Twelve After School Arcade missions. |
| P15 — Spend management | Queued | Twelve Spend in Motion missions. |
| P16 — Supporting workflows | Partial | Collection, scores, replay, learning, restore and legacy workflows. |
| P17 — Reproducible authoring | Partial | Fresh-workspace create/install/play/export/recover example; guides, skills and CLI examples. |
| P18 — Browser qualification | Partial evidence | Complete regression, performance, accessibility, audio/offline/lifecycle, real hardware and human playtests. |
| Native stores / online multiplayer | Deferred | Separate platform and network gates. |

**Execution order after these deliveries:** P03/P05 → P08-A/P08-B → P09/P07 → P02-B → P04/P06 → P10 → P11–P15 → P16/P17 → P18. Independently complete supporting fixes may ship earlier. The 132 new campaign missions remain a backlog target; bulk production follows the three-level gameplay and presentation benchmark.

The accepted Workshop journey is desktop keyboard/visible-controls scope. Physical controllers/touch, phone/short-landscape/200% zoom, audible listening, offline acceptance, Team two-core encounters and held rescue remain open. Every independently completed feature still needs its own related commit, versioned release, Pages deployment and scoped public acceptance.

</details>

<details>
<summary>Historical dae39 current-summary cutoff — retained verbatim</summary>

## Current delivery — 19 September 2026

**Play the accepted [v0.64.2 HUD update](https://mekhovov.github.io/revealline/releases/v0.64.2/site/game/).** Large/Plain flight counters now fit short landscape while keeping the complete arena and Pause button available. Rotation preserves the paused attempt until explicit Resume. The [scoped acceptance record](../publishing/pages-controller/delivery/evidence/cross-mode-p05/v0642-public/README.md) contains the release, test, public-audit and native evidence. This completes **P05-HUD-01**, not the whole presentation or navigation phase.

**Next is Workshop recovery v0.64.3.** Its source is qualified and merged, and its stable release preserves all nine verified assets. Publication PR167 merged as `666c68a6f842da7cdac22c542e56f5e2910380e7`; Pages run `35469057384` passed for that selector; full public-byte and native acceptance remain pending. A successful Reload clears the matching read-failure notice and restores focus to Reload without losing saved originals. Stable publication and Archive32 retention are complete. Full public-byte verification and the affected public recovery journey are still required. **P03-WORKSHOP-01 remains Verification; P03 and P05 remain In progress.**

### Next three deliveries

1. **Publish and verify Workshop recovery:** keep the accepted HUD edition in Archive32 and the stable Workshop assets intact; deploy the reviewed selector; verify the deployed inventory and real keyboard failure → Reload → recovery journey.
2. **Publish imported-Team continuation v0.65.0:** exact source `57fdc39aa78683f6de479eb77f810f60e7c6756a` passed both complete hosted families and frozen inspection, and source PR163 merged as `90ce831ee9e9a0b89195c252dd7aebf19298c03f` with the same tree `b71a23d6c2474da72ef379793c811e7097b0a156`. Its final package passed independent review; annotated tag `74721a379e648f796e58a01fadf193f2467c2375` and draft release `392203520` now retain all nine verified original assets. The draft remains unpublished until Workshop public acceptance. Stable publication, Pages and public imported picture → win → Next/Retry remain required. The enemy-free native flow proves navigation only; encounter balance and held rescue remain separate.
3. **Integrate and qualify Team/Studio v0.66.0:** [source PR166](https://github.com/mekhovov/revealline/pull/166) contains the combined pilot states, custom artwork and Studio history changes. Pre-integration source `ad57ad68d9d77a1e607ae35ee64698cfaa8522b8` passed manual run `35466091019` and PR run `35466091517`, each with **6,541 passing tests across 501 files on Node 20.19.6**. Source/production/build gates passed, and the manual run produced the frozen artifact. Those original results remain precursor evidence. Incorporate the actual merged PR167 publisher without changing the feature runtime, assets or version, resolve this register, then qualify and freeze the exact final integrated source through both complete hosted families. Only that final freeze proceeds to inspection and release. Native/public checks remain required; no v0.66.0 release is accepted.

### Team/Studio integration scope

The v0.66.0 feature adds original-byte Team artwork envelopes with exact level/picture identity, consistent downed/recovery/rescue presentation, actual Solo/Versus/Team Studio previews, and approved slot-history binding with Undo, Redo, Save and Reload. Simulation schemas, scoring and collision identity remain unchanged. Its feature and publisher branches share one changed path: this execution register. The integration uses actual PR167 main merge `666c68a6f842da7cdac22c542e56f5e2910380e7`, whose tree `aad495dabe764e42cea285ddcc70951858d3a055` equals reviewed publisher `f43dd3e1f5925e874d60b021a507c279c7992d87`. All 37 other feature postimages and all 30 other publisher postimages must remain exact. Version `0.66.0` stays allocated and unpublished.

The earlier Studio and enemy-free Team browser observations retain their sealed-preview scope. They do not certify the integrated source, encounter balance, live rescue, physical input, audio or offline behavior. Final hunk review, both complete source families, production/readiness, build, frozen inspection, related native checks, immutable release and public acceptance remain delivery gates. The completed ad57 freeze and unissued inspection request are retained as historical preparation and must not be dispatched as the final integrated release.

### Phase status

Complete means accepted within the named release scope. Partial/In progress means required work remains; candidate preparation does not close a phase.

| Phase | Status | Remaining delivery |
|---|---|---|
| P00 — Integration baseline | Complete, v0.55 | Preserve compatibility. |
| P01 — Loading feedback | Complete, v0.57.4 | Apply the contract to new screens. |
| P02 — Sound and music | A complete, v0.58.1; B partial | Cross-mode MP3/mixed playlists, transfer/offline use and the 24-track listening gate. |
| P03 — Native navigation | In progress | Workshop publication; all menus, focus returns and keyboard/controller/touch journeys. |
| P04 — Creation framework | Partial | Integrate prepared Studio work; prove edit/export/import/play and original-byte recovery. |
| P05 — Readable presentation | In progress | HUD and Replay fixes accepted; finish EN/UA, all modes, zoom and reduced-effects coverage. |
| P06 — Discovery/install | Partial | Discoverable compatible content, capacity, replacement/removal and interrupted-install recovery. |
| P07 — Rewards/continuation | Partial | Imported-Team delivery; reliable Retry/Next, full-picture rewards, stories and Collection replay. |
| P08 — Art and feedback | A/B partial | Role silhouettes, scale/heading and clear trail, impact, loss, pickup and Support/rescue feedback. |
| P09 — Challenge/intelligence | Partial | Fair pressure, readable warnings, encounter tuning and deterministic replay/checkpoints. |
| P10 — Team encounters | Queued | First Connection/Relay Yard variants and the two-player encounter matrix. |
| P11 — FPV campaigns | Queued, 0/4 accepted | Four campaigns × twelve finished missions. |
| P12 — DroneAid campaigns | Queued, 0/4 accepted | Four campaigns × twelve finished missions. |
| P13 — Ukrainian culture | Queued | Twelve reviewed Living Atlas missions. |
| P14 — Retro arcade | Queued | Twelve After School Arcade missions. |
| P15 — Spend management | Queued | Twelve Spend in Motion missions. |
| P16 — Supporting workflows | Partial | Collection, scores, replay, learning, restore and legacy workflows. |
| P17 — Reproducible authoring | Partial | Fresh-workspace create/install/play/export/recover example; guides, skills and CLI examples. |
| P18 — Browser qualification | Partial evidence | Complete regression, performance, accessibility, audio/offline/lifecycle, real hardware and human playtests. |
| Native stores / online multiplayer | Deferred | Separate platform and network gates. |

**Execution order after the three deliveries:** P03/P05 → P08-A/P08-B → P09/P07 → P02-B → P04/P06 → P10 → P11–P15 → P16/P17 → P18. Independently complete supporting fixes may ship earlier. The 132 new campaign missions remain a backlog target. Bulk production follows the three-level gameplay and presentation benchmark.

Physical controllers/touch, 200% zoom, audible listening, offline acceptance, Team two-core encounters and held rescue remain open. Desktop viewport checks do not qualify physical devices. Every completed feature still needs its related commit, versioned release, Pages deployment and scoped public acceptance.

</details>

## Historical records — preserved snapshots, not current status

Everything below retains its original bytes and describes its recorded cutoff. Earlier uses of “current”, “pending” or “next” are historical and are superseded by the summary above. The exact source, failed attempts, qualification, release and acceptance identities remain available without treating an older candidate as today's status.

### Team/Studio ad57 source snapshot — retained verbatim

**Current accepted public baseline, 19 September 2026: [v0.64.2 — short-landscape HUD](https://mekhovov.github.io/revealline/releases/v0.64.2/site/game/).** Root accepted publisher `2abd779766cd6d4b217b93a10575ed55d2d5547a`, Pages run `35450648405` and deployment `6542316588` after the complete public audit passed **3,450 files / 644,370,153 bytes**, with zero failures or retries. Scoped desktop-browser acceptance covers the complete 600×400 Large/Plain Tactical and wide Arcade arena, readable HUD and 44px Pause, portrait pause preservation and keyboard chapter Stay. Physical input, audio, offline and 200% zoom remain outside that acceptance. Archive32's v0.64.2 append has a successful deployment; its complete public audit and root acceptance remain separate and pending at this checkpoint. Workshop v0.64.3 and imported-Team v0.65.0 retain their separate qualification/publication gates.

**P04/P08 — cross-mode artwork authoring, Team pilot presentation and approved slot history: Verification; v0.66.0 source candidate allocated, not publicly accepted.** The 34-path feature composition now has exact preimage parity with imported-Team source `57fdc39aa78683f6de479eb77f810f60e7c6756a` (tree `b71a23d6c2474da72ef379793c811e7097b0a156`). It adds local Team artwork envelopes, original-byte export and exact level/picture identity; consistent downed, recovery and rescue presentation; actual Solo/Versus/Team Studio previews; and binding of approved historical slot revisions with Undo, Redo, Save and Reload. Historical gameplay schemas, reserved namespaces, scoring and collision identity remain unchanged. Related guides and AI skills are included. The v0.65.0 source checkpoint passed both exact-57fd source runs (35463018934 and 35462983393) and frozen inspection run 35465591136; PR163 merged as 90ce831ee9e9a0b89195c252dd7aebf19298c03f with the same b71a23d6 tree. This successor still requires its own complete qualification and public acceptance.

**Focused checks retain their original scope:** before the history correction, the 32-path composition passed 686 tests across 42 complete files per runtime, in 41+1 disjoint segments on Node 20.19.5 and Node 22.22.2. The original missing-Prettier load refusals remain retained. The six-path history integration produces 34 total changed paths and passed **83 tests across eight complete affected files on each runtime**, plus 18 static checks and independent composition review. Its full 743-input source set and original donor packets stayed unchanged. These overlapping cohorts are not added together and do not replace final intended-source qualification.

**Scoped native evidence:** the ordinary Team file chooser rejected corrupt artwork while retaining the accepted selection; replacement packs preserved per-level picture identity through keyboard win → picture → Next → second win → Retry. Those wins used an owned enemy-free flow fixture and do not establish combat or difficulty. Actual Solo, Versus and Team Studio renderers showed saved/draft actors, downed/recovery/rescue states and the complete arena in the reviewed desktop/portrait layouts. The later same-origin history test bound approved `field-kit@2`, observed a distinct unsaved draft, restored the saved custom body with Undo, reapplied the approved body with Redo, saved atomically, reloaded the exact approved revision and reset a later custom draft to that saved revision. It retained the source original as Download-only. This is actual desktop-browser authoring evidence on the sealed overlay, not final-source/public, physical touch/controller, audible/offline or live rescue acceptance.

**Remaining delivery gates:** final hunk-level integration, both complete exact-source hosted families, production/readiness and build, frozen inspection, reviewed immutable release, Pages deployment and affected public/native acceptance. P03/P04/P05/P07/P08/P17/P18 remain partial. Live Team rescue/encounter balance, complete import/export/recovery UI, saved Team flights, devices and full accessibility/media coverage remain open. Retained cosmetic observations include the generic Hunter hint on an enemy-free fixture and doubled punctuation in a corrupt-art error.

**Historical checkpoints below retain their original cutoff. Their “current”, “next” and “pending” wording is not this successor's current acceptance state.**

### Shared pre-integration history — retained verbatim

**Current accepted public baseline, 19 September 2026: [v0.64.1 — readable Replay JSON](https://mekhovov.github.io/revealline/releases/v0.64.1/site/game/).** [Publication PR164](https://github.com/mekhovov/revealline/pull/164) delivered publisher `95575953e9601c2ee018e9803ea6f90db9d93e20` (tree `6a21170770cd7341abe423c88228a9424f80a5e9`); Pages run `35445356978` deployed as `6541328289`, success status `18562945129`. The complete public audit verified **3,425 files / 644,219,286 bytes**, with one resolved transient HTTP 503 retry, zero final failures and no uninspected files. Fresh release/tag/deployment authorities and the exact current bytes reconcile. Scoped native acceptance covers real keyboard play → Workshop → Replay → copy → close/focus restoration, Standard/Theme 16px text with 24px line height, Large/Plain 20px text with 30px line height, and 390×844 ↔ 600×400 rotation preserving text and focus. Download was requested but filesystem delivery was not confirmed. This closes the named Replay-readability delivery; P03/P05/P08/P18, physical controls, 200% zoom, audible/offline and whole-game acceptance remain open.

**Previous accepted checkpoint, 19 September 2026: [v0.64.0 — Team field presentation](https://mekhovov.github.io/revealline/releases/v0.64.0/site/game/).** [Publication PR162](https://github.com/mekhovov/revealline/pull/162) delivered publisher `5807df71aa612636e574f66f0df99bf09506cbeb`; Pages run `35439057940` deployed as `6540160635`. The complete public audit passed **3,400 files / 644,070,167 bytes**, without failures, retries or uninspected paths. Fresh authority checks confirmed the release and deployment. Scoped desktop-browser acceptance covers Team terrain/trails and artwork, the complete 600×400 Large/Plain arena, keyboard Start/Pause/Help/Back/Settings/explicit Resume, Solo smoke and the previous v0.63.0 archive entry. This does not close P03, P05, P08 or P18.

**v0.64.1 qualification and retained history:** exact source `8ae70850db00777eb9afb233ff8a881fc26714f0` passed both complete hosted families, each **6,275 tests / 486 files on Node 20.19.6**, plus source, production and build gates. Its immutable release has nine verified original assets. The accepted publisher retains all 100 catalog entries and 31 admitted archives. Archive31's accepted v0.63.0/v0.64.0 inventory remains 1,420 files / 627,122,610 bytes. Source qualification, complete public-byte reconciliation and the scoped native record retain separate authority and limitations.

**HUD release published; Pages selection pending — v0.64.2:** exact source `adbfcb94037b8a38d49b9650e7f8a83c7face1db` passed both hosted families, each **6,275 tests / 486 files on Node 20.19.6**. Stable latest release `392067660`, tag object `fe1f350eaca309d740d02ab621fe68395dfb13e4`, has all nine unchanged assets reconciled to the frozen originals. This publisher candidate adds four exact metadata/qualification bodies and the 101st catalog entry, preserving every earlier row. Archive32 is now accepted for v0.64.1: repository `1377207652`, infrastructure `50909e7cf38916fe7d3e2e7eb79339bb49ae80b9`, tree `b11d49db3eb2e7416bc5d8b0b6f01f8084911345`, Pages run `35446915477`, deployment `6541593688`. Independent audit `35447542918` verified **712 files / 313,567,687 bytes**, with zero failed bodies or retries; fresh final authorities and root acceptance retain scoped native keyboard win/picture, Pause/details/Resume, Replay/focus and explorer routing. The candidate selector is enabled for required production validation and publisher review. **HUD Pages deployment, complete public-byte audit and affected native acceptance remain pending; the accepted main public baseline remains v0.64.1.** Stable release publication and prior archive acceptance do not close those HUD gates.

**Following deliveries:** Workshop recovery v0.64.3 ([source PR161](https://github.com/mekhovov/revealline/pull/161)) has merged qualified source and draft release `392074105` with nine uploaded assets; it is not a stable published or publicly accepted edition. Imported-Team Next/Retry/picture preparation remains the separate **v0.65.0 candidate** in [source PR163](https://github.com/mekhovov/revealline/pull/163). Its original `cbd950ab` full qualification failed four test assertions, retained separately. Corrected exact source `45f4d0f2a89cd2d5625517303bac3244a62c1ba6` (tree `f6ec6f8c0cf6ab4f976761133935ffc02889f486`) now passes both complete hosted families, each **6,354 tests / 492 files on Node 20.19.6**, plus source, production, build and freeze gates. Actual frozen inspection run `35445998526` and independent reconciliation passed all 704 manifest rows and 658 offline-inventory rows; this is frozen-byte evidence, not browser offline or public acceptance. Final v0.65.0 qualification and its seven small assets/nine descriptors now pass independent package review; the 193-member evidence archive, 24 exact source copies and 538 native-to-final production identities reconcile. A later source-native keyboard test imported an authored two-level flow fixture through the ordinary file chooser, earned a Joint Cut win, opened the full picture, restored result focus, advanced to the second arena, won its final result without Next and retried the same selected arena. That enemy-free fixture qualifies the continuation journey only; the two-core encounter, held rescue, difficulty and public player journeys remain open. Source integration and immutable publication are still pending. The custom Team artwork reader/resolver/host proposal against this source has 530/530 affected tests on each of Node 20 and 22 plus independent review; it has no allocated version or public acceptance. No later candidate is claimed as publicly delivered.

**Remaining acceptance:** Team two-core encounter playthrough, held Support rescue, real controllers/touch, zoom, actual audio/offline checks and human playtests remain open. Public initial-picture failure/retry/cancellation was not exercised in the v0.64.0 native pass; exact-source and precursor evidence retain their separate scope. Replay readability is now accepted within its scope. Prioritize the HUD and Workshop corrections, then imported-Team continuation, while retaining the broader phase order below. Older candidate and qualification paragraphs below preserve their historical cutoff where this current status supersedes them.

**Imported-Team source integration checkpoint — original candidate wording retained; superseded by the current status above:**

**P08-A-IMPORT-01 / P07-TEAM-IMPORT-01 — imported Team picture, Next and Retry: Verification; v0.65.0 candidate, not accepted.** This isolated candidate starts from Workshop source `7a9985ec00168b99a86c1d5db0457343ca18ffae` and integrates the sealed historical-import, ordered Next and retained Retry work once. Validated historical Team packs outside exact-binding namespaces prepare the existing approved FPV revision 32/null-collection wide picture before adoption. Pack and picture replace the previous selection atomically; Cancel, failure and late completion preserve the current playable selection. Next resolves the retained authored itinerary, and Retry retains the accepted mission, settings and artwork. Starter namespaces keep exact authored bindings, historical gameplay schemas remain closed, and only the literal built-in source owner updates arena memory. [Import contract and prompts](team-import-artwork.md); [ordered results](team-ordered-results.md).

**Integrated focused verification:** All 405 tests across 27 affected files passed on each of Node 20.19.5 and Node 22.22.2 with zero failures, cancellations, skips or todos. Related runtime/test/guide formatting, lint and independent 23-path integration review passed. The first Node 20 attempt stopped at the shared disk reserve before completion; its original log is retained separately and is not a pass. The earlier 398-case and separate seven-case cohorts remain precursor evidence. Coordinator hunk review, exact committed source gates, native imported coverage/multiple-stronghold win → Next → Retry, offline re-import, immutable release and public acceptance remain required. No test totals are combined across precursors. Custom-art envelopes, other themes/collections, saved Team flights, campaign expansion and full P03/P07/P08/P18 acceptance remain open. The separate custom-art candidate is excluded from this delivery. Earlier Team/Replay/HUD/Workshop checkpoints below retain their original scopes.

**Historical v0.62.1 checkpoint — original wording retained; superseded by the current baseline above:**

**Current public baseline, 19 September 2026: [v0.62.1 — Missions navigation](https://mekhovov.github.io/revealline/releases/v0.62.1/site/game/).** [Publication PR154](https://github.com/mekhovov/revealline/pull/154) merged `3abc9b8d8a61280fd3070ffb3fa926328d14aefb` (tree `38a121d6309cb3e7ab860fbd4659837835521e20`); Pages run `35427535988` deployed as `6538129092`, success status `18555712674`. The complete public audit passed all 3,338 files / 643,669,109 bytes in 3,338 HTTP attempts, with zero failures, retries or uninspected paths. Post-audit authorities confirmed the release, tag, nine assets, publisher and deployment unchanged. [Scoped public acceptance](../publishing/pages-controller/delivery/evidence/cross-mode-p03/v0621-public/README.md).

**Previous accepted checkpoint, v0.62.0:** [Source PR151](https://github.com/mekhovov/revealline/pull/151), exact source `72b6845e101850a4ee34df66656dae3c7ad87f5f`, passed 6,094 tests across 476 files in each of two complete hosted families; both used Node 20.19.6. The six source gates, production checks and ordinary build passed. Public desktop-browser play covered a Solo win and earned picture; Versus One race, First to two ending 2–0, Next, and Rematch cancellation that preserved results before a fresh start; Team default entry, Start, Pause/Settings return and 600×400 Plain/Large rotation, plus a legal 5.3% capture followed by a line loss. Public Team win→Next remains open; its qualified source-native win/Next/failure/cancellation evidence is separate. Keyboard popup selection still needs review; observed selects supplied the playtest configurations. P03/P05/P07/P08/P18 remain open, including physical controls, foreground lifecycle, listening and offline checks. Its [dated public evidence](../publishing/pages-controller/delivery/evidence/cross-mode-p03/v0620-public/README.md) remains unchanged and is not a new v0.62.1 cross-mode playtest.

**Source-qualified release: [v0.62.1 Missions navigation](missions-navigation.md).** Source `9f04273a09dd23d44236c1715d62cfa460171e24` passed 6,184 tests across 478 files in each of two complete hosted families, both on Node 20.19.6, together with the six source gates, production checks and ordinary build. [Source PR153](https://github.com/mekhovov/revealline/pull/153) merged as `36e1355f43243174c6e6b972d4b0b6aded1d60b9` with the same tree `2c35f299f981aba98929ba9ac01addbfe8b48d63`. Its combined R4 preview covers corrected Missions heading/card clearance and inline/direct Brief focus and reading journeys; the earlier 284-case Node 20/22 cohort remains separate precursor evidence.

**v0.62.1 scoped public acceptance:** the immutable release, Pages deployment, complete deployed-byte audit and affected native-browser journeys are accepted. Keyboard play covered Missions chapter expansion, horizontal card focus and 390×844/600×400 clearance; Brief reading/Done/Back and paused restoration; and a legal Solo win → full picture → Next. The attempted public Next cancellation arrived after the destination settled and is not cancellation evidence. Source qualification and scoped public acceptance do not close P03/P05 or establish physical-controller/touch, Team win→Next, full audio/offline/lifecycle or the complete readability matrix.

**Source-qualified and publicly accepted: v0.63.0 — paused Field details (scoped P03/P05 feature).** Exact source `3e47f60b9f9b4c5088410536d649ff595b2667eb` passed 6,234 tests across 483 files in each of two complete hosted families, both on Node 20.19.6, plus the six source gates, production checks and ordinary build. [Source PR155](https://github.com/mekhovov/revealline/pull/155) merged as `eca7f1a90e6f5526d8de3f669751e11c239edbbd` with the same tree `fd0138c0e5f71b8b25368878c1948f5bef14255d`. The original frozen artifact and all 703 game files passed inspection; the final source package has independent review. The immutable [v0.63.0 release](https://github.com/mekhovov/revealline/releases/tag/v0.63.0), all nine assets, Pages deployment, full public-byte audit and recorded Field details keyboard/layout journeys are accepted. This closes the named feature delivery, not P03 or P05.

**Field details scope and evidence:** the new read-only view groups the current mission, actors, line danger, bonuses, authored actions and recent messages behind Pause. It preserves both steering modes, existing live HUD controls and explicit Resume. The generation-owned guidance rejects stale asynchronous completions before caption writes. Review caught and corrected an unintended import-finally assignment that retired the Details host; mounted regression covers import, Undo, failed commit and both page lifecycles. The earlier 66/66 Node 20 typed/host cohort, 35/35 Node 20/22 backup and adjacent-host cohort, and actual `558d4524` browser record retain their original identities; they are not added to the complete hosted counts. The later `3e47f60b` correction changes only the visible Pause-order test. Native Read → text → Done → Back, paused-opener restoration and 600×400/390×844 geometry are scoped observations, not physical-controller/touch or complete responsive acceptance. Related [ownership guidance](flight-information.md), skills and prompts travel with the feature. This delivery does not replace the compact HUD or close P03/P05.

**Retained failed qualification, v0.63.0 precursor:** source `558d45243237a516661fddad4dcc63611542287d` failed one stale controller-practice Pause-order assertion in each complete hosted family: [manual 35427439200](https://github.com/mekhovov/revealline/actions/runs/35427439200) and [PR 35427560374](https://github.com/mekhovov/revealline/actions/runs/35427560374), each 6,233 passes / one failure. The corrected test follows the actual visible Field details entry before Restart while retaining focus and pause assertions; it does not call a hidden handler or alter runtime behavior. Original failed run/job/log records are retained separately from the passing `3e47f60b` qualification and are never counted as successful gates.

**Next release candidate: v0.64.0 — Team terrain, trails and artwork recovery (P08-A/P03).** Pre-integration source `c3f39ab3caa60f33f645608aaa240ff5056f5022` passed 6,275 tests across 486 files in each of its two hosted families, both on Node 20.19.6: [manual 35429456608](https://github.com/mekhovov/revealline/actions/runs/35429456608) and [PR 35431766230](https://github.com/mekhovov/revealline/actions/runs/35431766230). Its frozen inspection also passed. [Source PR156](https://github.com/mekhovov/revealline/pull/156) incorporates the accepted main revision recorded below; the **exact final integrated source must pass complete qualification before freezing, publication and public Team acceptance**. The pre-integration results do not substitute for that gate. The intended scope is terrain/trail presentation, complete-arena short-landscape layout and initial-artwork retry ownership; P08-A remains partial.

**Team feature scope and retained precursor observations:** Shared prepared wall tiles and outlined player trails preserve exact simulation geometry. Active short-landscape layout retains the full arena and visible touch targets. Retry picture can recover a failed initial presentation load without automatically starting a game. Related tests, guides and maintainer prompts are integrated; precursor cohorts pass 286/286 plus a separate 38/38 win/Next cohort on each of Node 20 and 22. Native previews cover both arenas' initial picture failure/retry, cancellation, legal captures, downed states and Large-text layouts at 600×400, 844×390 and 390×844. The portrait downed view has four pixels of bottom overflow with all controls visible. Actual held-Support rescue, earned Team win→Next, final combined native/source/public qualification and physical devices remain open. This is a bounded feature candidate, not completion of any parent phase.

**Team integration checkpoint:** this candidate incorporates accepted-main `145f58c2941e40c5bc56da044e5647465ea41a96` once. The only overlapping path is this current register; all Team runtime, test, guide, skill and version postimages remain identical to the qualified `c3f39ab3` precursor. The combined source requires fresh complete qualification, frozen inspection and public acceptance; predecessor results are not relabelled.

**Following correction: v0.64.1 — readable Replay JSON (P05).** Pre-integration source `e770866a058d8bcb27c4fbfff28d066a72fbf67e` changes the Solo Replay export/import text area to the shared control-text size while retaining its monospace face and line height. Its retained [manual source run 35430795516](https://github.com/mekhovov/revealline/actions/runs/35430795516) completed successfully. The **exact final integrated source must pass complete qualification before freezing, publication and public acceptance**. Earlier source results, focused checks and native Standard/Large observations remain separate from that gate and from public, zoom and physical-device qualification. Replay validation, navigation, stored records and simulation identity are unchanged.

**Replay correction integration:** v0.64.1 now incorporates final Team source `7c9d34f7011a904b9c100f66884a19808666315a` and the accepted v0.63.0 public documentation. Its reviewed runtime change remains the shared 16px Standard / 20px Large sizing for Solo Workshop → Export replay, retaining monospace, readonly bytes, download ownership and return focus. The earlier two complete host files (5/5 on each of Node 20 and 22) and development-source native checks of all four text combinations, 390×844/600×400, scrolling, copying, resize and Escape retain their precursor scope. The exact integrated source still requires complete source qualification and its own immutable/public release. It must follow accepted Team publication; browser zoom and physical devices remain open.

**P05-HUD-01 — narrow Solo active-flight counters: Verification; v0.64.2 candidate.** The proposed two-row 521–680px short-landscape HUD preserves selected text, all stats, 44px actions and complete arena geometry. Exact `3e47f60b` plus the CSS-only override passed the retained desktop-browser checks: Large/Plain 600×400 with hidden/shown D-pad, 521/680 boundaries, portrait 390×844 and Standard/Theme floating stick. The Large arena shrinks to about 382.59×191.30 at 600×400; play comfort, longer values, zoom and physical controls remain open. This source integrates those identical CSS bytes onto integrated Replay source `8ae70850` with its newer guidance intact. [Scoped guide and originals](device-controls.md#narrow-solo-flight-counters--p05-hud-correction). The version is allocated; public acceptance remains pending: finish exact final integrated-source qualification, release/public-byte verification and affected native journeys after Team and Replay. P03/P05 remain incomplete.

**P03-WORKSHOP-01 — Still Media read recovery and focus: Verification; v0.64.3 candidate.** A verified current Reload clears only its matching failed-opening host notice and restores the invoking Reload action after final synchronization enables it. Initial open, reopen, repeated failure, newer input and lifecycle retirement retain their existing ownership. This integrates the reviewed two runtime postimages and corresponding tests onto HUD source `be0fe652`, preserving Team/Replay/HUD guidance. The unchanged-R2 red cohort retained six native-disabled-blur model failures; the corrected host/panel pair passed 73/73 on each of Node 20.19.5 and 22.22.2. These overlapping precursor counts are not complete qualification totals. Actual keyboard writer-lock failure → release → Reload and Escape/reopen passed for the two-runtime preview; 600×400 visibility passed, while the immediate portrait screenshot remains inconclusive. [Contract and original observations](still-media-workshop.md#recovering-an-open-workshop-after-a-read-failure). Exact final integrated-source qualification, frozen inspection, public bytes and affected native acceptance remain pending after Team, Replay and HUD. P03 and the broader creation/device phases stay incomplete.

**Prioritized remaining work:** the order below is the current execution sequence; a feature release does not close its parent phase.

1. **Team v0.64.0:** qualify the exact final integrated source, then freeze, publish and complete public acceptance for terrain, trails, artwork recovery and the complete arena in short landscape. Public Team win → Next remains required.
2. **Replay v0.64.1:** qualify the exact final integrated source, then freeze, publish and complete public acceptance for readable JSON export/import text at Standard/Large sizes.
3. **Finish P03/P05:** resolve active-flight Large HUD crowding and Workshop reload status; complete player-menu focus, keyboard/controller/touch journeys, EN/UA, Plain/Large, zoom and reduced-effects coverage. Field details is accepted only within its recorded scope.
4. **P08-A → P08-B:** complete actor/artwork parity, recognizable roles and actual playing sizes; then finish clear trail, impact, capture, loss/recovery, pickup and Support/rescue feedback.
5. **P09 → P07:** tune fair enemy pressure and readable encounters; finish reliable Retry/Next, full-picture rewards, optional stories and Collection replay.
6. **P02-B:** complete cross-mode MP3/mixed playlists, transfer and offline playback, and actual listening for the 24-track collection.
7. **P04 → P06:** complete creation/edit/export/import/play workflows, then compatible discovery, installation, replacement and recovery within existing capacity limits.
8. **P10 → P11–P15:** finish Team encounters; then the 132-mission campaign programme after the three-level benchmark passes its gameplay and presentation quality gate.
9. **P16/P17:** complete supporting workflows, recovery, guides, skills and an independently reproduced authoring example. Independently complete supporting fixes may ship earlier.
10. **P18:** complete browser regression, performance, accessibility, media/offline/lifecycle recovery, real-device/controller checks and human playtests. Native stores and network multiplayer remain later, separate gates.

| Phase | Current status | Next completion requirement |
|---|---|---|
| P00 — Integration baseline | Complete within v0.55.0 scope | Preserve compatibility in later releases. |
| P01 — Loading feedback | Complete within v0.57.4 scope | Apply its state/focus/cancellation contract to new screens. |
| P02-A — Master sound controls | Complete within v0.58.1 scope | Keep later cross-mode regressions separate from music/content acceptance. |
| P03 — Native navigation | In progress | Finish all player and supporting-screen journeys, focus returns and input ownership; test physical controller/touch separately. |
| P05 — Shared readable presentation | In progress | Publish the qualified readability fixes; complete Team, EN/UA glyphs, Large/Plain, zoom and reduced-effects matrix. |
| P08-A — Artwork and actor parity | Partial | Team picture delivery accepted within scope; finish role silhouettes, scale and heading across all modes/detail treatments. |
| P08-B — Action feedback | Partial | Complete coherent trails, impact propagation, capture/loss/recovery, bonuses and Support/rescue feedback. |
| P09 — Challenge and intelligence | Partial | Tune fair pressure and warnings; complete versioned patrol/carrier/shooter encounters and deterministic replay/checkpoint gates. |
| P07 — Rewards and continuation | Partial | Preserve completed results through transitions and offer an unobscured full-picture reward; finish stories and Collection replay. |
| P02-B — Music experience | Partial | Finish cross-mode uploaded/mixed playlists, real transfer/offline checks and the 24-track listening gate. |
| P04 — Creation framework | Partial | Complete actual edit/export/import/play examples, history, registries and original-byte recovery. |
| P06 — Discovery and installation | Partial | Complete compatible catalog, capacity, safe replacement/removal and interrupted-install journeys. |
| P10 — Team encounters | Queued | Complete First Connection/Relay Yard variants and separate two-player encounter/readability matrix. |
| P11-A–D — FPV campaigns | Queued; 0/4 accepted | Four individually released campaigns, twelve complete missions each. |
| P12-A–D — DroneAid campaigns | Queued; 0/4 accepted | Four individually released campaigns, twelve complete missions each. |
| P13 — Ukrainian culture | Queued | Twelve Living Atlas missions with cultural/historical and visual review. |
| P14 — Retro arcade | Queued | Twelve After School Arcade missions with distinct art, encounters and music. |
| P15 — Spend management | Queued | Twelve Spend in Motion missions with understandable noncombat goals. |
| P16 — Supporting workflows | Partial | Complete Collection, scores, replay, learning, restore and legacy workflows. |
| P17 — Reproducible authoring | Partial | Independently create/install/play/export/recover an example in a fresh workspace; maintain skills and bounded CLI examples. |
| P18 — Browser qualification | Partial evidence | Complete regression, performance, real device/controller, accessibility, audio/offline recovery and human playtests. |
| Native stores; network multiplayer | Deferred | Separate signing/store/hardware and authoritative network/reconnect gates. |

**Execution order remains:** finish P03/P05 corrections → P08-A → P08-B → P09 → P07 → P02-B → P04 → P06 → P10 → P11–P15 → P16/P17 → P18. The three-level benchmark remains the quality gate before bulk campaign production. Supporting fixes may ship sooner when they are independently complete; this does not close their parent phase.

**Content accounting remains explicit:** accepted content records still show 15/29 picture families (60/116 pictures), 1/12 victory stories and 40 reserve source illustrations. The 56 complete animated character sets and 24 auditioned tracks remain unfinished. The 132 new Solo missions are a programme target, not delivered content. Source art, generated candidates and test scenarios do not count as accepted campaigns.

**Current review findings:** narrow active-flight Large HUD crowding and Workshop reload status remain separate corrections. Missions card/heading clearance, horizontal card focus and Brief reading/Done/Back are accepted within the observed v0.62.1 public scope. Field details reading order and the recorded responsive keyboard journeys are accepted in public v0.63.0; wider navigation/readability gates remain open. Team short-landscape/terrain/trail and initial-artwork recovery belong to the separate v0.64.0 candidate; Replay JSON sizing belongs to v0.64.1. Public Team win→Next, actor readability and the wider responsive/input matrix remain open. Earlier Team picture and recovery observations retain their dated scopes. New notices must preserve input ownership and readable focus, following [Xbox navigation guidance](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112) and [W3C status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

**Delivery rule:** every completed phase or named subphase has scoped hunk review, applicable skills/docs/tests, a new unused game version, an exact final-source qualification, source PR, immutable release, publication PR, full public-file audit and affected real player journeys. Archive/controller-only maintenance preserves the original game version. Build success, a merged PR or an uploaded artifact alone is not public acceptance. Keep original failures and historical reports unchanged; update this current checkpoint when new acceptance is recorded.

**Additional open checks:** final integrated-source qualification and public acceptance for the Team and Replay candidates; narrow active-flight Large HUD clearance; complete shipped Enemy Workshop public journeys; and compatible P04/P06 history-capacity work without relaxing immutable-history bounds. Field details is accepted within its recorded v0.63.0 scope. Full audio/offline/lifecycle, EN/UA readability, zoom and physical-controller/touch checks remain outside that scoped acceptance. Horizontal forward-Tab mission-card focus keeps its separately recorded v0.62.1 keyboard evidence.

## Historical source and acceptance checkpoints

### Publication checkpoint before v0.61.24 public acceptance — 19 September 2026

The following publication statements retain main’s original preacceptance cutoff verbatim. References to “current”, “pending” and “next” in this historical block are not the live baseline or the approved execution order above. The scoped v0.61.24 acceptance recorded above supersedes the pending public gate only.

**Current scoped public checkpoint (19 September 2026): v0.61.23 is accepted within the recorded Still Media correction.** Source `2f1074a37ade9c731ea7be37a6e56e533b51d1ac` is selected by publisher `8783cbd6fcd0b02ba1d14bae09b16595a4166055`. The release coordinator reports successful [Pages run 35396835006](https://github.com/mekhovov/revealline/actions/runs/35396835006), verification of all 3,255 files / 642,999,818 bytes, and the scoped native owned-draft rotation and opener-return journey. Committed [exact-source qualification](https://github.com/mekhovov/revealline/blob/8783cbd6fcd0b02ba1d14bae09b16595a4166055/publishing/pages-controller/evidence/current-v06123/source-qualification.json) separately records passing source gates. This does not establish complete navigation, presentation or whole-phase acceptance.

**Current published correction: v0.61.24 — narrow Solo Pause columns; Pages acceptance pending.** Qualified source `bb8cd8ea8af0cbec6af7e633c05d1bec78815938` retains `fpv@32`; [source PR #149](https://github.com/mekhovov/revealline/pull/149) is merged. [Manual qualification 35404392904](https://github.com/mekhovov/revealline/actions/runs/35404392904) and [PR qualification 35403877032](https://github.com/mekhovov/revealline/actions/runs/35403877032) each passed 5,925 tests across 466 files on Node 20.19.6, with the source/production/build gates passed. The original frozen source and all 694 game files were inspected, all nine immutable attachments independently reviewed, and [v0.61.24](https://github.com/mekhovov/revealline/releases/tag/v0.61.24) published as stable Latest. Both earlier `58643e0c` failures remain retained; their stale label expectation was corrected without changing runtime behavior. This publisher change selects the new release, but deployed-byte and actual Pause-menu acceptance remain pending; v0.61.23 remains the last accepted public scope until they pass.

**Retention and next corrections:** Archive29 preserves v0.61.23 with all 702 public files verified and a scoped keyboard/media journey. Its publisher admission is committed separately and keeps the current selector unchanged. The next source candidates address narrow Large-text HUD clipping and Couch Ready → Start losing the player's newer focus choice. Their proposal checks do not qualify the integrated source or close P03/P05.

**Completion order and limits:** P00, P01 and P02-A retain their accepted scopes. P03/P05/P07/P08/P18 remain open. Finish complete input journeys and readable presentation before action feedback, challenge and bulk content. Separate source-preview backlog includes horizontal forward-Tab mission-card focus and Replay JSON text sizing; Team ownership/footer/HUD and actor readability still need integrated release/public gates. The HUD history-capacity issue needs compatible P04/P06 work without relaxing immutable-history bounds. Enemy Workshop is shipped and requires its public journey, not an exclusion assumption. The content ledger remains 15/29 map families, 60/116 pictures and 1/12 victory stories; reserve art is not installed content. Listening, offline/recovery, zoom, hardware and human playtest gates remain open. [Historical v0.61.9 phase table, queue and next work](../publishing/pages-controller/delivery/evidence/cross-mode-p05/public-review-v0619/planning/progress-and-next.md).

The dated records below are preserved history; this header does not promote their scope or close later gates.


### Opening queue recorded on 18 September 2026

**Current checkpoint (18 September 2026): v0.61.9 public bytes are accepted; the native focus gate remains open.** Root verified all 3,153 files / 642,265,836 bytes and fresh release/deployment authorities. One HTTP 503 recovered on retry, with no final failures or skips. Scoped Large/Plain adoption, draft/preview continuity and opener return passed, but 1.765625 px of the external picker outline clips after landscape → portrait. This fails the project's complete-outline quality gate; it is not proof of a WCAG minimum violation. Full feature/native and whole-phase acceptance remain false. [Scoped report and originals](../publishing/pages-controller/delivery/evidence/cross-mode-p05/public-review-v0619/README.md).

**Prior accepted scope and current queue:** v0.61.8 remains the prior scoped accepted public baseline. Archive26 preserves v0.61.7 and v0.61.8 in its accepted scope. Enemy startup-close v0.61.20 and Team picture viewer v0.61.21 have accepted source packages but no public acceptance. Actor v0.61.22 source `17e0a455` passes both full 5,922-test / 466-file families and frozen inspection; final source-package assembly/root review remains pending. Its earlier production/test failures and limited runtime-overlay native evidence remain separate. Planned v0.61.23 composes the focus-scrollport correction on that source; at this cutoff it is uncommitted and composed tests are running. Nine source-preview rotation cases do not repair immutable public v0.61.9.

### Earlier source and acceptance records

**Current implementation authority (17 September 2026):** [revised whole-game execution plan](whole-game-ux-plan.md). Motion v0.60.5 is accepted within its recorded scope. Settings v0.60.6 is merged and qualified, with its own release/public gate pending. P03/P05 remain implementing. The dated text below is retained history and must not be used as the current phase ordering or release status.

Approved scope: **consistent maps and presentation across Solo, Versus and Team**, followed by complete edition production. This register implements the user's revised P00–P18 plan. It supersedes earlier phase ordering, not historical release evidence or ownership. Updated 17 September 2026.

**P01 is accepted as immutable v0.57.4. P02-A is accepted within its scoped public sound-control gate as immutable v0.58.1. P03 remains implementing; whole-phase acceptance is incomplete.** P00 remains accepted as immutable v0.55.0. The [P01 acceptance](../publishing/pages-controller/delivery/evidence/cross-mode-p01/public-v0574/completion-r8/acceptance.json) and [P02-A acceptance](../publishing/pages-controller/delivery/evidence/cross-mode-p02-a/public-v0581/acceptance.json) bind their exact sources, public bytes and scoped native evidence separately. **The current accepted public release is v0.60.5, within the Motion correction; full P03/P05 remain `implementing`.** Its [v0.60.5 scoped acceptance](https://github.com/mekhovov/revealline/blob/b7eb5b433147f88c7d238951116396aa3c757a50/publishing/pages-controller/delivery/evidence/cross-mode-p05/public-v0605/planning/progress-and-next.md) is retained by merged PR #99 (`b7eb5b433147f88c7d238951116396aa3c757a50`). The [historical Recovery v0.60.4 acceptance](../publishing/pages-controller/delivery/evidence/cross-mode-p03/public-v0604/planning/progress-and-next.md) remains retained by merged PR #92. The [preceding accepted progress and remaining phases](../publishing/pages-controller/delivery/evidence/cross-mode-p05/public-v0603/planning/progress-and-next.md) remain retained by merged acceptance PR #89 with their dated scope. Studio/Replay v0.60.0, Team v0.60.1 and Production/Viewport v0.60.3 retain their accepted scopes.

## Current scoped release and pending successors

**[Public v0.60.5](https://mekhovov.github.io/revealline/releases/v0.60.5/site/game/) is accepted for Motion reading, preview/default-image behavior and setup recovery.** Exact source `a336f18306a425f6575b77a3017056d32155043f` passed **5,582 tests per hosted family**. The complete public audit verified **2,790 files / 639,724,180 bytes**, with zero failed attempts or retries. This preserves the separate source-workspace authoring and public-runtime evidence boundaries; it does not close full P03/P05, hardware or assistive-technology gates.

Settings v0.60.6 source `9c89f997cdbf0c8266fa65247832dcf2281d61ba` passed both hosted families at **5,673 tests each**, freeze and inspection. PR #94 merged into main `7db26c148cced9b51315dc24902569234061b17d`; its annotated tag and draft release `391034651` exist. Its own release publication, deployment and public acceptance remain pending.

Replay v0.60.7 and navigation/backup v0.60.8 inherited a stale production ledger; their initial exact-source attempts stopped before tests or freeze. The [reviewed metadata repair](verification/cross-mode/replay-disabled-actions/recipe-review.md) is composed. Later qualification exposed stale Team picture bindings that still required `fpv@26` while the compiled snapshot was `fpv@27`; the superseded 0.60.7–0.60.9 runs were cancelled after that regression was identified. The [Team compatibility correction](team-picture-bindings.md#current-revision-compatibility-correction) now composes the two reviewed revision pins and one stale actor-test expectation, preserving all picture and sprite identities. Its four complete affected files pass **86/86 on Node 20 and Node 22**. Fresh full qualification of each final source remains pending; failed and cancelled attempts are not passes. The separate Motion slider-label correction retains **38/38 on both runtimes** and scoped isolated Chromium range, recipe and layout evidence. These checks do not establish CUA, physical-device, assistive-technology or public acceptance.

**Next feature candidate: v0.61.0 — Solo result continuation (P07-A1).** The reviewed ten-path proposal is composed on corrected v0.60.9 source `628e95daf403082768cdcf900a8ea1d1ef4629a2`; this candidate is under source qualification and is not an accepted release. Next prepares the destination while retaining the completed result and picture, then starts it after the explicit action. Cancel or failure preserves that result. Retry retains its exact picture/story choices, and newer dialogs or mission selections keep input ownership. The proposal’s nine complete host/unit files passed **101/101 on Node 20 and Node 22**, including storage failure/reentry and post-adoption callbacks. These receipts bind the predecessor proposal on `cc161f7d`, not qualification of this new composition. The separate friendly-error correction passed its complete 16-case host file on both runtimes; those checks overlap the earlier cohort and are not additive. Earlier genuine browser checks preserved results through Next failure/cancellation, but Retry after story playback timed out once and later showed variable acquisition latency. No source cause or performance fix is established. The exact composed ordinary-browser Retry/story journey, full source gates, immutable publication and public verification remain open. P07, P03 and P05 remain incomplete; no new artwork, enemy behavior, campaign content or physical-device acceptance is included. See [Solo result continuation](solo-result-continuation.md).

## Preceding P05 scoped delivery

**[Public v0.60.3](https://mekhovov.github.io/revealline/releases/v0.60.3/site/game/) is accepted within its supporting-tool correction scope.** Source `a13ab970222498d7c5fa7f62f9fc04fe436979d5`, source PR #87 and publication PR #88 passed both hosted families at **5,482 tests across 436 files each**. Pages run `35227819123` passed the complete **2,730-file / 639,313,374-byte** public audit with no failed files and one successful transient retry. The authoring tools remain source-workspace routes, excluded from the public runtime; public checks covered ordinary Solo win/Next/Pause/Settings/Playground, Team setup/return and retained-release/Explorer navigation. Team setup is not a Team win. These scoped results do not close P03/P05, hardware, zoom or offline gates.

Preceding v0.60.2 public observations cover shared reading preferences, History Back body/selector agreement, held virtual input, last Undo with unchanged preview, byte-identical 862,703-byte pack import/export and malformed-import recovery, explicit preview play, a practice win, Retry and Pause/Resume. The [browser record](../publishing/pages-controller/delivery/evidence/cross-mode-p05/public-v0602/native/observations.json) keeps physical input, 200% zoom, complete style/EN/UA coverage, BFCache, fresh offline/migration and whole-phase acceptance separate. The historical History Back mismatch is corrected; old candidate notes below retain their original cutoff.

The [Production/Viewport source browser record](verification/cross-mode/p05-authoring-hosts/README.md) retains failure/slow recovery, foreground focus, shared preferences, all preview sizes and selected-original/Back preservation. Those original candidate-time cutoffs remain historical and do not override the scoped v0.60.3 acceptance above.

## Historical accepted release: Recovery reading and navigation

**[Public v0.60.4](https://mekhovov.github.io/revealline/releases/v0.60.4/site/game/) is accepted within its Recovery correction scope.** Source `d77ea4f5c2aeccf2ba3bdf483a3f25531f8095b6`, source PR #90 and publication PR #91 passed both hosted families at **5,511 tests across 438 files each**. Pages run `35239952497`, publisher `1298acb1dbdef3a96b5a690c171fee754794c26c` and deployment `6506175017` bind the **2,755-file / 639,467,460-byte** public audit: zero failed files and one successful retry. The root acceptance original has SHA-256 `1b361a78f7e7880cdd42d3f3ca43889241dbce218996c92a46bb4805589ea8ef`; acceptance PR #92 merged as `a53d646153fc9dfb2d8f152fdc9dbde607782777`.

Earlier profiles uses shared reading settings, keeps Back/Reload available during startup, preserves current action focus through Find/Review/prepared export, and repairs explicit Back/history return. The [Recovery record](verification/cross-mode/p03-recovery-reading/README.md) retains the **89/89** precursor and **92/92** history-return successor per runtime, original failures and scoped source-native checks. Public checks used mixed keyboard and semantic actions on actual same-origin profiles. Downloaded export bytes, historical originals, forced public failures, actual BFCache admission, fresh offline/migration, physical inputs and broad zoom/browser qualification remain open. Recovery remains a direct troubleshooting URL; no Library entry, restore scope or gameplay change was added.

## Historical Motion source-candidate evidence

The following preparation and failed-qualification paragraphs retain their original cutoff. Final source `a336f183` subsequently passed both full families and the v0.60.5 public gate recorded above; none of these earlier pending statements is current.

The [Motion record](verification/cross-mode/p05-motion-reading/README.md) covers shared reading, startup focus, readable stage labels and a static APNG default preview. The composed d77 candidate passed **181/181** across 15 whole files per runtime before review found a missing actionable preset-failure retry. An authored Retry link now remains outside the locked study without taking focus. The corrected **v0.60.5 candidate passes 183/183 across the same 15 complete files on Node 20.19.5 and 22.22.2**, with 208 unchanged pinned inputs per run. The failing retry discriminator and first successor test attempt are retained separately; these overlapping cohorts must not be summed.

The earlier blue APNG default failure and scoped red-poster native correction remain retained. Effective reduced effects stayed active in that predecessor native record; full-effects, pending native upload races, BFCache and physical input remain open. The retry successor includes main ancestry `a53d646153fc9dfb2d8f152fdc9dbde607782777`. A scoped local preset-503 → keyboard Retry → ready journey now passes; the first Return timed out with a browser disconnection and was rechecked before retrying. The check used ten runtime overlays on an a13 Git scaffold, with semantic text-size selection; it is not a built/public or physical-device check. Committed hosted qualification, immutable release and public verification remain pending. **P03/P05 remain implementing**; the approved phase order, separate Team full-picture correction and **132 future Solo missions** are unchanged.

**Historical failed qualification.** The first full v0.60.5 qualification of source `40fe4a31f89efc6686b841f4f0de7fdc17874c72` found the same stale Workshop integration assertion in both shard-four runs: it expected Motion's retired generic text-size marker. Each complete family recorded 5,581 passes and this single failure; the manual freeze was skipped. The correction requires Motion's dedicated shared-preference owner and shipped modules while rejecting the old marker; no production runtime changes are needed. [Original failed-job logs and diagnosis](verification/cross-mode/p05-motion-reading/hosted-40fe-failure/diagnosis.json) remain retained. The corrected source requires fresh complete qualification; the 183-case focused cohort is not a replacement for that gate.

## Current P03 continuation evidence

A supplementary actual v0.60.2 Chromium keyboard journey recorded on **17 September 2026 at 11:54 UTC** created a saved Solo flight through play, cancelled visible title **Cancel preparation**, returned focus to Continue, entered Team without starting, selected First Connection, and returned to Solo. Explicit Continue restored the matching Relay Orchard checkpoint from before cancellation: **52.2%, 8,660 points, three lives, relay 1/1 and 0:14**, then resumed as requested. The earlier missed cancellation window, ambiguous locator and ready-label lookup timeout remain separate preliminary attempts, not diagnosed game failures.

This closes that ordinary observed cancellation/Team-return journey only. It does not prove native late-decode rejection, busy-cleanup refusal timing, Team victory, Collection pagination, offline/migration or physical input. The two P03 test-only regressions cover Team won-terminal ownership and the more precise cancelled-restore/late-rejection race. Their earlier scoped cohorts passed **3/3** and **37/37** per Node runtime; these are 40 modeled checks, not 80 distinct checks. Both test files are already integrated byte-identically in accepted v0.60.3 and the current source, and that release’s hosted qualification includes them. They found no runtime defect and do not establish the remaining native timing or winning journeys. A saved original is read from IndexedDB and decoded as a local blob: delaying its old HTTP URL cannot substitute for this native cancellation boundary. Continue with genuine pagination, Team terminal results and remaining decision/lifecycle/recovery journeys; **P03 and P05 stay open**.

## Retained P02-A accepted scope

The following v0.58.1 figures and candidate notes retain their recorded cutoff; the current v0.60.2 delivery is recorded above.

v0.58.1 source `c93019a344f6f4c6ac03940c77ea09c81122d911`, tree `f6055cbcba92d45ef1da2b5d16e7e4f1158c8d2a`, passed both complete hosted families at **4,333/4,333 tests each**, the six source gates, production reproduction/readiness and the ordinary frozen build. Publication PR #71 merged as `a1a5d0c5295196024af1a158c53acedc2f817c1a`, tree `71798f41b597138a6a0fbf40624d949b5cf90324`. Deployment `6474632693` passed the complete **2,530-file / 637,630,752-byte** public audit. The [immutable playable release](https://mekhovov.github.io/revealline/releases/v0.58.1/site/game/) and its acceptance record retain the public correction's scope.

The correction keeps Team's permanent visual-feedback-only explanation separate from transient storage warnings after successful sound edits and recovery. P02-A's scoped source/public acceptance does not complete P02-B playlists/content, acoustic listening, full offline-media playback or physical-device qualification. Story natural-end/Skip focus remains part of the unqualified P03 composition; its independent candidate evidence is not public acceptance.

## Retained v0.60.0 P05 scoped delivery

The following two paragraphs retain their publication-time wording; the current release and later accepted corrections are recorded above.

**Current public release: [v0.60.0](https://mekhovov.github.io/revealline/releases/v0.60.0/site/game/).** Frozen source `170508f11dd41204b7e24917a823f21701c15961`, tree `287ea0fddf97f594af0ce9eba452a24dc5f507c7`, passed both complete hosted families at 5,399 tests each and the applicable source/production/build gates. Source [PR #78](https://github.com/mekhovov/revealline/pull/78) and publisher [PR #79](https://github.com/mekhovov/revealline/pull/79) are merged. Publisher `0d1f8a281a3c01768e69ac7a7de05094d03f0ee7`, Pages run `35196541650`, deployment `6498129383` passed the complete 2,649-file / 638,838,205-byte public audit, retaining one failed HTTP attempt and its successful retry with no failed, skipped or uninspected files. After-audit authorities remained unchanged.

The [delivery record](../publishing/pages-controller/delivery/evidence/cross-mode-p05/public-v0600/README.md) and [progress report](../publishing/pages-controller/delivery/evidence/cross-mode-p05/public-v0600/planning/progress-and-next.md) bind actual Studio font selection, shared Plain/Large preferences, Replay Jump/completion focus, unchanged paused tick, no progress awarded, and current/retained v0.59.1 route observations. This accepts the named Studio/Replay slice only. P03's remaining navigation/lifecycle matrix, full P05 typography and supporting routes, offline use, physical devices and human playtesting remain open. Team already imports the shared display/menu/picture adapters; its focused-action reflow and live-control clearance correction remains a future candidate pending final composition, qualification and public release.

<a id="current-p03-feature-delivery"></a>

## Retained v0.59.1 P03 feature delivery

The following two paragraphs retain v0.59.1's accepted scope and publication-time wording. They do not redefine the current public version.

**Current public release: [v0.59.1](https://mekhovov.github.io/revealline/releases/v0.59.1/site/game/). Its Controller Practice correction is accepted within its scoped public gate; P03 remains `implementing`.** Source `206c4b9bdd7bc53aecf818f85a1cbf680814a4e5`, tree `8c999d0d381b4a8c57bb153512d341377aee210d`, passed both complete hosted families at **5,340/5,340 tests each**, all six source gates, production reproduction/readiness and ordinary frozen build. Source PR #75 and publisher PR #76 are merged. Publisher `5419c020b79b9712f5986699c76f2df9d0f981d0`, tree `5c61a9299b59b3803289e7353e5880432cc0f83d`, Pages run `35184596982` and deployment `6496059255` passed the **2,618-file / 638,635,105-byte** public audit with zero failures or retries.

The [scoped acceptance](../publishing/pages-controller/delivery/evidence/cross-mode-p03/public-v0591/acceptance.json), [public keyboard observations](../publishing/pages-controller/delivery/evidence/cross-mode-p03/public-v0591/native/observations.md) and [remaining progress register](../publishing/pages-controller/delivery/evidence/cross-mode-p03/public-v0591/planning/progress-and-next.md) distinguish public bytes from player journeys. Observed Controller Practice Ready/paused menu exits release held input, preserve explicit Resume and retain actual dialog containment. The current release explorer reaches retained v0.59.0 through Archive14. Offline installation completed 630/630 files (55,840,845 bytes); disconnected operation, complete lifecycle/save migration, physical input and the remaining P03 journeys stay open. The Studio candidate below is not part of that accepted patch.

### Retained v0.59.0 delivery and v0.59.1 preparation

The following paragraphs retain their earlier publication-time wording. The v0.59.1 acceptance above governs that historical correction; current public status is in the opening section. Pending statements below remain attached to their original observations.

**Current public release: [v0.59.0](https://mekhovov.github.io/revealline/releases/v0.59.0/site/game/). P03 remains `implementing`.** Source `76dc4bf36baec11ce4dff6ca49773d3b9d6c0ae5` passed both complete hosted test families at **5,322/5,322**, all six source gates, production reproduction/readiness and ordinary build. Source PR #73 and publisher PR #74 are merged. Publisher `2f6a563cbd3ff47c56b40aa7269fb48ca26f2838`, Pages run `35179241725`, deployment `6495159317` passed the complete **2,591-file / 638,479,286-byte** public audit with zero failures or retries. All 68 earlier catalog entries and nine immutable release assets remain unchanged.

The [public evidence](../publishing/pages-controller/delivery/evidence/cross-mode-p03/public-v0590/completion.json) and [native observations](../publishing/pages-controller/delivery/evidence/cross-mode-p03/public-v0590/native/observations.md) distinguish source qualification, public bytes and actual keyboard journeys. Observed public journeys include key remapping, a real Solo win, story replay/Skip, Collection and a single matching score, Versus/Team Help and Options, and explicit Stay/Discard departure. Offline installation completed 629/629 files (55,835,359 bytes) for the current build. This does **not** qualify disconnected operation, every player screen, physical devices/controllers or whole P03.

**Next correction: v0.59.1 — Controller Practice keyboard exit.** The isolated correction lets Tab/Shift+Tab leave either end of the embedded nonmodal menu, releases held virtual input and keeps play paused. Repeated Pause updates no longer move the selected focus or reclaim focus after the player leaves the frame. Real dialogs retain containment. The [correction record](verification/cross-mode/p03/practice-exit/README.md) retains the exact 11-path candidate, 160/160 affected tests on each of Node 20 and 22, independent review and real browser observations. Full final-source qualification, immutable release and public patch checks are pending; v0.59.0 remains the public default.

The following development observations retain their original candidate status and failure history. Their later qualification is recorded above; they do not redefine the current public version.

The composed host fixes retain newer Help ownership when a delayed controller poll catches up, and clear Team's reader/held input on backgrounding even when already paused. Actual local keyboard journeys cover Solo wins/Collection/Library, live-cut pause and mission reading, mission setup including Grid + buffer, Team reading/options/departure and Versus setup/pause/results/Next. The [source-browser observations](verification/cross-mode/p03/native/observations.md) identify the actual served fpv25 inputs and inline-only screenshot limitation. Native foreground loss/return, physical touch/controller and complete remaining screen coverage are still open.

Canonical production preserves published P01/P02, the measured fpv25 source stage and its fpv26 review successor, with all 127 original payloads unchanged. The [scoped recipe review](verification/cross-mode/p03/recipe-review.md) and [verification record](verification/cross-mode/p03/README.md) distinguish the corrected 11/11 production-history checks, final Team 205/205 on each runtime, earlier overlapping cohorts and retained failures. These are development checks, not the final release total. No source or public result from v0.58.1 qualifies this candidate.

The `124f58df` integration attempt failed its full source tests: both families reported 5,251/5,292 passing, with 40 leaf failures across sixteen files plus one parent summary. Its manual freeze was skipped. The [host-flow correction record](verification/cross-mode/p03/host-flow/README.md) tracks fixture updates for the implemented menu and explicit-decision contracts, retaining all gameplay/save assertions and failed observations. The correction record lists completed local whole-file checks and their distinct Node 22 retest boundary. Fresh final-source qualification remains required; v0.58.1 stays the public baseline.

The next source, `39eaea27`, also failed full qualification: both families reported **5,282/5,292 passing**, with the same ten chapter-preparation timeouts across four files. Its preflights and ordinary PR build passed, but freeze was skipped and no release artifact was produced. The [navigation recovery correction](verification/cross-mode/p03/navigation-recovery/README.md) retains those originals, adds bounded operation-specific timing/state diagnostics, and fixes a separately reproduced late-Resume race while the page is hidden or unfocused. The in-app tab-selection attempt did not establish document focus loss and remains unaccepted evidence. These corrections require another complete exact-source qualification; they do not advance P03 or replace public v0.58.1.

The More worlds correction also remains part of this unaccepted candidate. The original same-chapter reset and cross-chapter bypass were reproduced before correction. All three Choose adapters now share the checked flight-replacement gate; same-chapter selection preserves the run. See [the selection contract](more-worlds-flight-selection.md). Focus, failed-save and stale-operation checks are distinct from full source and public qualification.

Review of committed `c9ef8a9c` found another cancellation boundary: Stay during pending save verification left the originating Choose disabled. Three actual-host regressions reproduced it; the successor releases only its own parent operation before returning focus. Its additional cases cover newer work and already-moved focus. Ordinary c9 keyboard observation verifies same-chapter preservation, settled Stay and explicit Replace at Ready; it does not prove early cancellation, physical input or public acceptance. The pinned browsing label is corrected to **Chapter in view** so installing a card cannot be mistaken for selecting its campaign.

The c9 hosted chapter failures also require four fixture corrections: Fracture, Countercurrent, Route Worlds and Sentinel theme tests must make an explicit Stay/Replace decision when replacing an unfinished cut. A fresh app choosing its already selected Route Worlds campaign must preserve that run. These corrections retain the original artwork, metadata, legal win routes and reward assertions, without widening existing waits. The [early-Stay and chapter verification record](verification/cross-mode/p03/early-stay/README.md) separates baseline failures, scoped retests and pending final-source qualification. None advances the public baseline beyond v0.58.1.

Committed `0e9437e0` exposed a keyboard-remapping regression before publication: Settings → Controls → Keyboard controls → Left hand → Change Move up → ArrowUp cancelled capture, moved focus to the preset and left W unchanged. The [key-capture correction record](verification/cross-mode/p03/key-capture/README.md) retains the actual keyboard browser failure and three composed-host regressions that failed before the change. Shared navigation now yields only to the current capture owner. All five affected files pass **153/153 on Node 20 and Node 22**; corrected native keyboard checks cover assignment, invalid keys, cancellation and a paused exposed flight, with inline-only screenshots and no physical-controller claim. Fresh qualification of the corrected committed source and public verification remain pending. This is still the unreleased v0.59.0 candidate, with P03 implementing and public v0.58.1 unchanged; no result bound to 0e qualifies its successor.

The approved remaining order is unchanged: P03 → P05 → P08-A → P08-B → P09 → P07 → P02-B → P04 → P06 → P10 → P11–P15 campaigns → P16 → P17 → P18. Native distribution and online multiplayer retain separate later gates. After this feature's public gate passes, record its exact source, PR, URL and observed journeys here while keeping P03's outstanding acceptance work visible.

## Retained release and correction history

The paragraphs in this section retain their release-time observations and pending states. They do not supersede the accepted P01/P02-A status above or relabel historical failures as passes.

**Historical v0.58.0 public review and v0.58.1 preparation.**

v0.58.0 source `c113a348ae69bd013b67f0d22a5391d604253545`, tree `7cdb91b4cdbf89256f4e0d430f0ec79f4a7e9486`, passed both complete hosted families at 4,332/4,332 tests, all six source gates, production reproduction/readiness and the ordinary frozen build. Source PR #62 and publication PR #69 are merged. Pages revision `1167291e27773ef076ed64b6e06ba7c0339423a0`, run `35052821808`, deployment `6473320472` passed the complete 2,505-file / 637,489,480-byte public audit with no failures, retries or skips. Those completed gates remain bound to v0.58.0.

The deployed sound journeys verify master settings, paused playlist/MP3 audition, two independently controlled Studio native previews, Versus pause, Team preference adoption, actual earned victory/Collection story and reload. Independent review found that Team's permanent visual-feedback-only explanation disappears after a successful sound edit because it shares the transient warning node. The [v0.58.1 correction](../publishing/pages-controller/delivery/evidence/cross-mode-p02-a/team-notice-v0581/README.md) separates that permanent paragraph from storage warnings and passes its complete focused file on Node 20 and 22. Native rechecking is pending because browser controls were unavailable at the recorded attempt. P02-A remains unaccepted until the correction passes its own source and public gates. Story natural-end/Skip focus loss is retained for P03/P07; no acoustic-listening, full offline-media or physical-device acceptance is claimed.

The immutable v0.57.4 correction is published from source `856850ce8d4597c1fb6e8bb28ddb8a63db337a8c`, tree `4cd7f24680af174ea35773d28e07e54e5f39e01f`. Both complete hosted families pass 4,256/4,256 across 378 test files; all six source gates, production reproduction/readiness and frozen artifact checks pass. Publisher `9c955f767b68a1d948e5db3a5c5fc42f2346c0c2`, run `35037951446`, deployment `6470855889` serves all 2,476 verified public files / 637,238,456 bytes without a failed, skipped or retried HTTP row.

The public online journey verifies pending-launch Escape, persisted Explorer Back, the exact missing picture owner, visible recovery reason, Export → Library → Escape with restored Export focus, portrait/landscape recovery controls, direct product Reload and paused saved Continue. Online native Prepare and Verify complete for the actual 609-file / 55,473,406-byte inventory; the read-only observer timeout and authorized continuation remain separate evidence. The genuine retained old MAIN versioned v0.57.3 profile reaches Archive17 through normal worker retirement and bridge navigation with its recorded save, picture pins and observed store endpoints preserved. Cold Continue and explicit Resume/Pause retain their scoped R7 evidence.

After disk recovery, the separate R8 completion used the same genuine profile in two new owned processes. Native cached Prepare and explicit Verify each completed 609/609 on build `e14cab22ffd6eef0489f90da616663e56eb0c43df8a036b5aac385bee5c05ae7` while the refusal proxy blocked networking. The restored process received a real uncached, out-of-scope HTTP 404. All four observed raw saved/storage/database endpoints were exactly equal; no new flight ran in R8. Both browsers and the proxy are closed. The [additive completion archive](../publishing/pages-controller/delivery/evidence/cross-mode-p01/public-v0574/completion-r8/record.json) preserves these originals without changing the earlier failed attempts, capacity stop or sealed pending review.

The correction records below retain their original release-time status. They do not supersede the current status above or relabel earlier failures as passes.

**Historical P02-A preparation — shared master sound.** The user approved the audited player-experience-first sequence on 15 September. The isolated `codex/p02a-p01-integration` preparation composes P02 candidate `ac644a99eebb2fef049458f6abf69fa626f81983` with the frozen P01 source `7945c6d07714d41cee9b6f848059b8dc18aed86c`, preserving P02's 0.58.0 version and the incoming source fixes and utility. This is preparatory composition, not accepted P01 or qualified P02. Final P02 qualification and publication remain gated on P01 public acceptance and then the exact final P02 source. Its [implementation and acceptance contract](shared-master-audio.md) distinguishes implemented code from browser, audible and device acceptance. The [P01 composition record](verification/cross-mode/p02-a/p01-composition/README.md) retains 178/178 focused checks on each Node runtime and 40 offline utility checks, separately from full qualification and public acceptance. The subsequent `86e381a` merge incorporates main publication history `016b14a` without changing non-controller source. Its [final composition record](verification/cross-mode/p02-a/final-composition/README.md) adds twelve scoped browser observations of master controls, transport and cross-mode preference persistence. These remain local evidence; final intended-source qualification and P01/P02 acceptance are outstanding.

**Historical v0.57.2.** The immutable correction was published from source `cc9f8ffcc3be246f53ca0df7f068476d8401d040`, with publisher `d0288c502620bfa7a4a0861fbdbce1a60be183c5`. Both full hosted test families pass 4,228/4,228, alongside the six gates, production reproduction/readiness and frozen build/artifact verification. The complete public audit verifies 2,426 files / 636,869,407 bytes; one transient HTTP 503 succeeds on its bounded retry. Its [public browser review](verification/cross-mode/p01/public-v0572.md) records passing export, controller focus and cold offline restoration checks, with evidence limits preserved. Browser Back from Explorer also exposed a required picture-writer recovery defect. P01 remains unaccepted; these historical checks cannot qualify the composed P02 source.

The earlier v0.57.2 candidates remain recorded: a [production JSON accounting correction](verification/cross-mode/p01/production-json-capacity.md) passed 224 focused checks; the subsequent [Library-capacity fixture correction](verification/cross-mode/p01/mastery-library-capacity-fixture.md) established actual combined-byte overflow and passed 60 focused checks. Those candidates do not replace the final exact-source qualification or its public findings.

**Historical P02-A candidate:** checkpoint `f235ce7894d91e02f0631833e1ba215c8e9b5b99` [composes published v0.57.4](p02-p01-v0574-composition.md), retaining accepted P01 source `856850ce`, its immutable `fpv@23` history and all original payloads, then generating `fpv@24` for shared-master audio. The final integration includes accepted-main `0684ddbfe978e95f2b6ddcd02b4f9e0f70a4190d`; that range changes only current documentation and publication-controller history. Version 0.58.0 remains a candidate. The frozen candidate completed 22 focused files on each supported Node runtime; the separate presentation inventory file awaits hosted qualification because its inputs exceed the finite worktree budget. The mute-command successor passes five complete files (79/79 on both Nodes), and the coherent-status successor passes two complete host files (20/20 on both Nodes). Their separately bound semantic native follow-up verifies changing-name commands and paused transport. P01 acceptance is complete; final P02 committed-source/build/reproduction/readiness, frozen-artifact and public gates remain pending. Historical source and browser receipts retain their exact source boundaries.

**Historical incoming P01 status snapshot, before v0.57.4 acceptance.**

> **Release gate: P01 — loading feedback.** Verified public baseline remains **v0.57.1**, source `4c85277ac7393eeeabab035387d4d4ae8734aba1`: its accepted records report 4,187 tests and 2,398 deployed files. P00 remains accepted in v0.55.0. The separate P01 task reports v0.57.3 source `7945c6d07714d41cee9b6f848059b8dc18aed86c` deployed and all 2,451 inventory files checked. Its final recovery journey exposed Export → Back losing the Reload action; a new patch is in verification. P01 remains incomplete. Deployment or an uploaded artifact alone does not close it.

**Historical incoming P02-A delivery snapshot, before final source integration and public acceptance.**

> **Next delivery: P02-A — shared master sound.** Candidate `ac644a9` passed its six hosted source jobs, 4,291/4,291 tests, reproduction/readiness and ordinary build; draft source PR #62 remains unmerged. Internal composition `cbc09f7` includes the then-current P01 source and publication baseline, with separately recorded focused source/browser checks. The newer P01 recovery correction is not included. Integrate the accepted successor and qualify the final exact source before freezing or publishing. Its [implementation and acceptance contract](shared-master-audio.md) keeps source, browser, audible and device evidence separate.

Approved delivery order: **P01 → P02-A → P03 → P05 → P08-A → P08-B → P09 → P07 → P02-B → P04 → P06 → P10 → P11-A–D → P12-A–D → P13 → P14 → P15 → P16 → P17 → P18**. Native stores and online multiplayer stay deferred. The early presentation phases use compatible registry entries and read-only Team adapters; complete Studio expansion stays in P04.

**Historical v0.57.0–v0.57.1.** P01's initial v0.57.0 release passed its six source gates, all 4,185 tests and the complete 2,373-file public audit. Its public portrait check exposed an offline label that pushed count/Stop below the viewport. The immutable v0.57.1 correction passed all 4,187 tests, the six gates, production/build/artifact checks, the complete 2,398-file public audit and the bounded public offline journey. Its [public correction record](../publishing/pages-controller/delivery/evidence/cross-mode-p01/public-v0571/README.md) accepts that independently shipped feature. P01 remains unaccepted while Library operation visibility, craft feedback behind Flight setup and remaining distinct loading hosts are completed. Preserve all earlier releases and failed observations; P02-A public acceptance remains gated.

The [P01 loading contract](presentation-loading.md) documents the implemented shared presenter, operation ownership and required regression cases. It applies to later phases; phase acceptance remains separate from this implementation description.

**Historical v0.57.3.** The immutable correction was published from source `7945c6d07714d41cee9b6f848059b8dc18aed86c`, with publisher `016b14af6b42d27de1f194c1ac5d48f7a0b3eaa9`. Both hosted families pass 4,246 tests and all six gates; production, frozen artifacts and 2,451 public files / 637,028,197 bytes are verified. Its scoped public authoring and older-save Copy/Undo/recovery checks pass with recorded limits. The public history journey additionally found that Export's Library return removes the still-needed Reload action. That finding led to the now-deployed [v0.57.4 recovery-return correction](verification/cross-mode/p01/picture-recovery-return.md). Its current acceptance status is stated above. Completed v0.57.3 results and failed observations remain attached to their original source.

The released v0.57.2 feature covers [Library feedback](verification/cross-mode/p01/library-operation-visibility.md), [Missions craft feedback](verification/cross-mode/p01/craft-operation-visibility.md) and [Controller Apply](verification/cross-mode/p01/controller-apply-focus.md). The next corrective source adds [file-dialog cancellation and replay access](verification/cross-mode/p01/native-file-dialog-cancel.md) plus [picture preparation after browser history](verification/cross-mode/p01/history-picture-return.md). Earlier overlap/focus failures remain evidence; corrected native observations and source tests are scoped to their exact candidates. A new patch requires its own version, commit, full qualification, immutable release and public verification.

The remaining authoring and recovery checks exposed additional concrete defects before the next patch: offscreen Playground generation/replay/child-readiness feedback, hidden or disabled pending Music audition controls, and an older collection Copy that omitted an explicitly empty external index. The [Playground correction](verification/cross-mode/p01/playground-operation-feedback.md) retains its original failed native runs; the [transfer correction](verification/cross-mode/p01/legacy-transfer-index.md) retains the actual published refusal, unchanged failed-Copy data and 77 passing focused checks. The [Music correction](verification/cross-mode/p01/music-pending-audition.md) passes 38 focused checks, and [recovery verification labels](verification/cross-mode/p01/recovery-verification-copy.md) pass 58. Corrected native authoring checks cover actual portrait and landscape viewport geometry; earlier mismatched captures retain their limits. These fixes remain subject to exact-source release and public qualification.

P05 must also resolve the existing short-landscape Settings header edge reported in the [recovery-layout review](verification/cross-mode/p01/recovery-layout-recipe-review.md): the button extends 1.3 pixels above the viewport, so its full-rectangle pointer check refuses it. P01 recovery actions themselves pass Standard/Large geometry; the finding is not a claim that every header action is already qualified.

P01's finite loading-feedback acceptance is complete. Exact-source qualification, immutable publication, the full public-byte audit, online recovery, cold verification/restoration and genuine versioned historical-route migration retain their separate proof categories. The completed v0.57.3 authoring and older-collection Copy/Undo checks, picture/story restoration, authentic earned capture, five-link backup readiness and Studio image/bundle paths retain their original evidence and limits. No physical-device, controller-hardware or P02–P18 acceptance is inferred.

## Baseline and preservation

The starting user checkout was `codex/fpv-redesign` at `677b091681d424198de17c6f7e864795d2618880`, with mixed staged, unstaged and untracked work. Its index, binary patches and 201 changed/reference files (629,522,202 logical bytes) were preserved locally at `.cache/cross-mode/p00-preservation-20260915T051513Z` in that checkout. `preservation.json` records each file's SHA-256. The original checkout remains untouched.

Implementation uses the separate `codex/cross-mode-p00` worktree. The initial integration cutoff is main `5595b63243cdb7ec64f5d97c0e5e485b6c1fda0a`. The first rebase result is `3f8930e`:

| Original work                                      | Disposition and reason                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `4c9ae09` design atlas                             | Equivalent atlas, fonts and evidence are already upstream via `fc789c7`; retain newer main improvements.                                                     |
| `76b0498` gesture audio and `677b091` iPhone audio | Already upstream; Git dropped equivalent changes during rebase.                                                                                              |
| `912a0f7` fullscreen/PWA                           | Retain display-mode detection, lifecycle listeners, manifest/Apple metadata and adapter tests. Keep current main responsive styles and version files.        |
| Old fullscreen CSS                                 | Do not adopt HUD-over-arena positioning, hidden status or 10px telemetry. P03/P08-A qualify layout against the current control-clearance contract.           |
| Four staged audio reversions                       | Unstaged restorations cancel them exactly. Do not stage the stale reversions.                                                                                |
| Older presentation/compiler/Studio drafts          | Preserve locally; current main contains later implementations and stronger validation. Reconcile useful missing work individually within its assigned phase. |
| Reference and concept files                        | Preserve as research/source material; do not automatically publish as runtime art. The untracked title PNG duplicates the upstream original.                 |

At the original inventory cutoff the source package was v0.53.0 and the latest published stable observed was v0.52.0. v0.53.0 was already tagged and v0.54.0 had a concurrent candidate in PR #49. Neither version was reused: P00 allocated v0.55.0 after checking remote tags, and subsequently completed its release and public acceptance recorded above.

Production reproduction exposed a stale ledger on the integration cutoff. P00 adopts the six production files from PR #49 source `1af33851e93ee95110de20cc73622ed43d85a4da`: generator, production-history test, source bundle and three compiled JSON files. Review confirmed preservation of all 948 historical asset records, 16 theme revisions, one collection and 127 original asset blobs. The repair appends 34 asset and two theme revisions and pins reviewed motion/effect approvals to exact source fingerprints. Earlier checks on that candidate do not qualify the combined P00 source. The inventory remains a faithful pre-repair baseline; final receipts record the adopted delta.

After PR #49 merged, P00 integrated main `a6406ed` through a normal merge, preserving the first P00 candidate `9a9fc8f` and inventory commit `3f8930e` as reachable history. Only the three version files conflicted; P00 retains v0.55.0. Runtime, content and production bytes remain identical to `9a9fc8f`. The final merge receives fresh exact-source gates; earlier candidate checks remain scoped evidence. Release coordination assigns the separate player-library/Team-controls candidate to v0.56.0, without including its unfinished work in P00. Reconcile that incoming release before changing its affected surfaces in later phases.

The [source inventory](verification/cross-mode/p00/inventory.md) and [machine-readable inventory](verification/cross-mode/p00/inventory.json) distinguish embedded originals, external originals, release-art bindings and intentional procedural scenes. Source counts do not establish browser or physical-device coverage.

## Phase and acceptance register

Statuses are `queued`, `implementing`, `reviewing`, `qualifying`, `deployed`, `accepted`. A required failure blocks advancement. Post-publication corrections require a new patch release; frozen bytes and tags are immutable.

| Phase | Status       | Independently releasable deliverable                                                                                                            | Blocking acceptance                                                                                                                                               |
| ----- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P00   | accepted     | Preserve and integrate relevant work; inventory screens, maps, content paths, assets and compatibility.                                         | Reproducible baseline, preserved historical saves/art/releases, every requirement assigned below; exact-source and public release proof.                          |
| P01   | accepted     | Immediate loading feedback across boot, launch, download, preparation, recovery, media and Studio.                                              | Accepted in v0.57.4; retain the scoped slow/failure/cancel/retry/cached/stale completion and state-preservation evidence.                                         |
| P02-A | accepted     | Shared master mute and volume for existing output paths; explicit controls across modes and previews.                                           | Scoped public gate accepted in v0.58.1, including the permanent Team sound explanation. P02-B media/content, listening and physical-device gates remain separate. |
| P03   | implementing | Integrating Single player, Couch Versus and Couch Team entry, lobbies, reading, focus and explicit Back/Resume with accepted P01/P02-A history. | v0.59.1 scoped release accepted. Finish the remaining keyboard/touch/controller, lifecycle, recovery and device journeys before whole-phase acceptance.          |
| P05   | implementing | Shared typography and supporting screens; v0.60.0 Studio/Replay, v0.60.1 Team and v0.60.2 Practice/Playground and v0.60.3 Production/Viewport scopes accepted; Motion v0.60.5 accepted within its recorded scope; Settings v0.60.6 qualified, public acceptance pending. | Actual EN/UA glyphs, contrast, Large/Plain text, zoom, focus, reduced motion and affected screens. |
| P08-A | implementing | Complete existing map presentation parity, imported Team rendering, Versus art resolution and canvas fit.                                       | All ten map-consistency gates below. Existing Team maps cannot wait for P10.                                                                                      |
| P08-B | queued       | Countdown, cut/capture, loss/recovery, Support/rescue, objective/HUD feedback and reduced effects.                                              | Readability in motion, unchanged historical outcomes, performance and responsive checks.                                                                          |
| P09   | queued       | Versioned auxiliary patrols/carriers/shooters, difficulty, defeat, telegraphs, remains and replay/checkpoints.                                  | Small deterministic compatibility slice before bulk content.                                                                                                      |
| P07   | queued       | Direct Retry/Next, clear endings, one-race Versus tours, optional first-to-two and Team order.                                                  | No duplicate scoring; failed Next retains results; named successors; independent Solo progress.                                                                   |
| P02-B | queued       | Complete custom MP3s and mixed playlists in advertised modes; finished synth/chiptune/rock/metal collection.                                    | Actual track listening, transfer, offline playback, missing/corrupt recovery and mode parity; candidate album is not accepted content.                            |
| P04   | queued       | Five-edition registry, explicit Team slots, cross-mode Studio previews, bindings, editing/history/prompts/bundles.                              | Real upload/edit/save/export/import, exact byte round trip, invalid/stale/capacity/atomic failure handling.                                                       |
| P06   | queued       | Unified compatible-content catalogue, controlled installation and shared art preparation.                                                       | Every campaign selectable; correct Download & play; failure/staleness preserves selected content and saved flight.                                                |
| P10   | queued       | Encounter variants of First Connection and Relay Yard.                                                                                          | Separate 36-case Team matrix; Support/rescue/stronghold/two-player readability.                                                                                   |
| P11-A | queued       | FPV First Contact, twelve missions.                                                                                                             | Complete first-edition assets and compatible modes; campaign production/playability/progression/public gates.                                                     |
| P11-B | queued       | FPV Crossing Lines, twelve missions.                                                                                                            | Same independent campaign gates.                                                                                                                                  |
| P11-C | queued       | FPV Signal Pressure, twelve missions.                                                                                                           | Same independent campaign gates.                                                                                                                                  |
| P11-D | queued       | FPV Last Relay, twelve missions.                                                                                                                | Same independent campaign gates.                                                                                                                                  |
| P12-A | queued       | DroneAid Community Connections, twelve missions.                                                                                                | Complete brand/animated logo/poster and mode assets; Support framing and campaign gates.                                                                          |
| P12-B | queued       | DroneAid Supply Corridors, twelve missions.                                                                                                     | Support framing and independent campaign gates.                                                                                                                   |
| P12-C | queued       | DroneAid Contested Signal, twelve missions.                                                                                                     | Clearly labelled Combat framing and independent campaign gates.                                                                                                   |
| P12-D | queued       | DroneAid Return Signal, twelve missions.                                                                                                        | Clearly labelled Combat framing and independent campaign gates.                                                                                                   |
| P13   | queued       | Living Atlas, twelve culture/history missions.                                                                                                  | Complete edition, cultural/art review, variety, applicable modes and release checks.                                                                              |
| P14   | queued       | After School Arcade, twelve Retro missions.                                                                                                     | Complete edition, distinct encounters/art/audio, cross-mode and release checks.                                                                                   |
| P15   | queued       | Spend in Motion, twelve Coupa missions.                                                                                                         | Complete edition, clear noncombat semantics, cross-mode and release checks.                                                                                       |
| P16   | queued       | Collection, settings/data/recovery, learning, replay, workshops, supporting pages and legacy categories.                                        | Full navigation/state coverage; originals and historical content preserved.                                                                                       |
| P17   | queued       | Community guide, prompts, templates, compatibility and release workflow.                                                                        | Independent fresh-workspace example created, installed, played and recovered.                                                                                     |
| P18   | queued       | Full cross-phase/edition/content/accessibility/performance/offline/public regression.                                                           | No unresolved required content, slot or acceptance item.                                                                                                          |

Queued means phase acceptance is outstanding; it does not erase delivered foundations. The audited baseline retains partial saves/scores/Collection/backups, 15 of 29 map families (60 of 116 pictures), one of twelve stories, incomplete animated presentation sets, five synthesized runtime recipes, thirteen authoring skills, and partial Versus/Team play. Forty reserve originals are accepted as source art, not installed missions. Another three picture families and the 24-track album are candidates. The 132 new Solo missions remain a production backlog; bulk production follows the three-level gameplay benchmark.

P18 retains a measured long-session memory and animation soak, including explicit teardown of every test-owned browser and renderer after verification. A browser left running after a completed historical verification establishes a test-lifecycle cleanup gap; it does not establish a leak in the current game. These remaining performance checks do not expand P02-A acceptance.

**Historical P03 integration.** The first merge brings held candidate `1f3b9995af43879d54fb7b0053846f0723e2e069` into the accepted v0.58.1 publication baseline. This is active source composition, not a qualified result. Preserve the accepted Team audio explanation and shared master authority, then compose the separately retained Couch reading successor and minimal story-disposal extension. Derive final Team presentation fingerprints from the actual composed source; do not substitute historical theme bindings or carry forward candidate test totals as current proof.

**Historical source-candidate scope.** The following P03/P05/P08/P07 notes preserve earlier implementation and verification work. References to a then-current baseline, pending P01/P02 gates, draft PRs or excluded successors describe only those recorded cutoffs.

P03-A through P03-M, including A1/A2 and the R3/R5 corrections, are internal work packages within approved **P03**, not separately accepted public phases. At the retained `353033a` checkpoint they were composed as: named Title Start/Continue, checked Title/Missions mode departures, Library launch decisions, common Couch mode choices, initial Ready focus, nested dialogs, setup/restart decisions and training choices. Their earlier tests/native records retain their original scope; this composition is not a new full-source qualification. The accepted public baseline at that historical cutoff was v0.57.1. These source results do not qualify the active P03 integration or its public/device gates.

## Retained independent source work awaiting phase acceptance

The retained [gameplay/presentation composition](gameplay-presentation-composition.md) starts at `356401f9`, including the Collection imported-growth return correction, and adds narrow Team HUD `61fb43b3`, Team actors `d30f883d` and retained-Results Next `99f33086`. The rows and candidate paragraphs below retain their original cutoff; their earlier exclusions of HUD, actors or the Next transaction are superseded for this source candidate. Its exact 19-file pair passes 414/414 on both runtimes. Scoped native review confirms portrait Team Options/Resume and Versus failed/cancelled/retained Next behavior, while the actual 760×351 Team clipping failure remains open. The [composition evidence](verification/cross-mode/gameplay-presentation-composition/README.md) retains the initial 400/414 missing-input diagnostic and both operator timing misses. Current-P02 integration requires exact Team snapshot/asset rebinding and new authority/native checks; the historical fpv19/null binding is not current-registry acceptance. Phase acceptance and publication remain separate.

These are historical source milestones, not the active backlog or a second acceptance register. **P02-A is now accepted at the scoped v0.58.1 public gate stated above**; its older awaiting-acceptance row records only the earlier candidate cutoff. P03 commit `29a98c0e` is an earlier navigation checkpoint, not the final source of the active integration. Pending statements, draft PR state and integration exclusions below apply only to their named earlier sources. The current phase table remains authoritative, and historical receipts remain immutable.

| Phase | Committed source candidates                                                                                                                                                                                                                                                          | Remaining before phase acceptance                                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P02-A | `ac644a9`, draft PR #62; internal composition `cbc09f7` with shared master controls and scoped browser/output checks.                                                                                                                                                                | Integrate the accepted P01 successor, qualify final source, freeze and verify the public release.                                                                                                                                   |
| P03   | Earlier P03 navigation checkpoint `29a98c0e` includes A–M/A1/A2/R3/R5, operation and row focus, pager `0368f58f` and gallery return `7fedeef`; this internal composition also includes Couch transition/order `2c61981b` and its coherent-native documentation successor `90e8bc81`. | Qualify the combined exact source, then integrate the accepted P01/P02 history and complete source/build/public/offline and physical-input qualification.                                                                           |
| P05   | P05-A `3f934b7`, P05-B `fcc4032` and static composition `063ff5d6` retain shared display/menu preferences, label gutters and the Team pause-row spacing; this internal composition adds current-action resize checkpoint `657ac7b5`.                                                 | Qualify the combined source and affected journeys; finish broader responsive/zoom, contrast, preference-failure and actual-device checks.                                                                                           |
| P08-A | Static composition `063ff5d6` and Team host `d3ff0bc1` are included together here, retaining the two canonical original-image bindings and the read-only painter/lease with their original scoped records.                                                                           | Qualify this exact combined source; actor work and P07 Next transaction remain separate. Complete edition/import parity, full Team completion/rescue journeys, all required arena identities and final public/device qualification. |

The incoming P03 checkpoint’s [combined Library evidence](verification/cross-mode/p03-pager-gallery-integration/README.md) records 201/201 on each Node runtime and nine native keyboard observations, with the incomplete predecessor and fixture correction retained separately. Those results qualify only that checkpoint’s stated scope; they do not include the Couch, resize or Team additions composed here. Test totals and browser observations are not added across candidates.

The five source transition gaps from the retained P03 audit are implemented in this composition. Workshop Restart and course choice entered at `4397b36`; A1/A2 checked mode routes, R3 Library launch decisions, R5 Ready focus and the Title/common-lobby work follow in the historical records below. M preserves all 51 incoming non-register/skill files exactly; its only integration conflicts append the register and maintainer skill. Its 366/366 checks on each Node runtime and 19 native observations remain candidate evidence, not additive combined totals. Root's actual nonempty-cut capture, checked Team departure and explicit saved Continue demonstrate that browser journey; the final Continue screenshot shows an already completed result, not an exact restored position. The later composed record below now supplies the combined complete-file coverage, installed-pack native launch and integrated route/focus journey. Its source identity and failures remain distinct from M’s earlier result. Physical input and public/offline acceptance remain separate.

This internal source composition combines exact parents `29a98c0e`, `90e8bc81`, `657ac7b5` and `d3ff0bc1`. All runtime bodies are inherited from those candidates. The terminal Couch departure fixture clears obsolete briefs beside its substituted test level; the shared prompt, maintainer guidance and this register combine independent text. Historical receipts retain their original source and coverage. Combined checks are pending; no P01/P02/publication, Team actor or P07 transaction successor is included. This is not phase acceptance or a release.

## P07 bounded retained-Results checkpoint

The isolated [Next transaction candidate](retained-next-results.md), based on `90e8bc8`, retains the completed Versus duel, results, wins and original while a separate next picture is prepared and confirmed. Failed or cancelled preparation leaves keyboard View available. Adoption publishes the new duel before retiring the prior image; successful automatic Start requires the original live action through final callbacks. Background completion and installed Next remain Ready for a fresh Start. Twelve complete files passed 246/246 on each supported Node runtime with unchanged inputs; the original failed run and intermediate corrections remain separate evidence. Five held06 desktop native recorders cover actual normal Next, failure retention, Help/New-match cancellation and direct Cancel, with corrected labels and inconclusive captures explicitly retained. The friendly-message successor passed both affected whole host files, 46/46 each; its separate two-observation native message/diagnostic check also passed, with retained Results and matching source bodies. This internal correction does not change phase status, versions, Solo progress, Team order or the remaining complete P07 progression gates.

## P03-A actual-opener candidate

This isolated source candidate keeps Workshop and its parent menu open beneath Scores & saves and How to play. Closing either child by its button, Escape or controller Back returns focus to its actual Workshop opener; another Back returns to the menu. A paused flight stays paused with its checkpoint intact. Successful explicit Library play/challenge selection or saved-flight loading instead closes both retained parents before focusing the chosen or restored flight; it still does not implicitly start or resume it.

Existing Solo and Versus Team links now declare a code-owned return context. Team's visible lobby return link and lobby Escape/controller Back use that same destination. Direct, unknown or ambiguous contexts retain the existing Versus fallback; supplied URLs and browser history are not return authority. This is a cross-document return, not restoration of the previous page's exact menu/focus or an automatic Resume. Team's paused Back still focuses Resume together without leaving or starting play.

This candidate does not accept all P03: native/public qualification, entry redesign, integrated lobby, departure confirmations and broader progression remain separate work. Root-reported follow-ups include confirming replacement of an unfinished Solo flight and preserving a meaningful focus target when a story ends and Pause becomes Replay; neither behavior is changed here. Existing direct-flight dialog openers and explicit flight starts keep their current behavior.

## P03-B initial-focus candidate

The Solo title's initial focus handoff waits until boot has revealed the game, chooses a visible enabled control, and preserves an already meaningful focus choice. A saved flight exposes Continue without loading or resuming it. Hidden lesson controls stay hidden; a disabled primary action falls back to the next available menu control. Background pages do not claim focus. Native qualification remains pending for this candidate.

Exact cross-document Missions/opener restoration and unfinished-flight departure confirmation remain separate work; P03-A's code-owned Solo/Versus destination does not preserve the old document's menu state.

## P03-C Solo Missions → Team return candidate

A deliberate Team entry from Solo Missions retains a bounded one-use tab record with exact installed campaign, mission and theme identities. Team Back uses only the fixed Solo route. Once Solo is ready, a compatible record reopens Missions and Mode with the Team link focused; it never installs content, loads a saved flight, resumes play or changes player progress. Missing, expired, consumed, ambiguous or incompatible records fall back to the visible title. Release records bind the build's source revision, version and channel; source previews with no build revision are limited to their origin/version/channel and are not frozen-source proof.

An unfinished Solo flight pauses before the departure check. The existing checked flight-retention helper verifies replay/checkpoint and actual storage readback under the backup lock. Stay, Escape and controller Back return to the Team opener without resuming. Leave stays unavailable while checking. A failed check remains in Solo and warns that leaving may lose the session-only attempt; only a subsequent explicit Leave permits departure. An externally changed saved slot is preserved, and a later changed slot invalidates the earlier saved claim. The save hold lasts through pagehide and ends at explicit Resume or a new attempt. A post-write failure cannot claim the older slot is unchanged.

Ready and finished attempts keep direct Team entry when the return record is available. If tab storage is unavailable, a separate explicit Leave choice uses the fixed Team → Solo-title fallback; return metadata never blocks Team permanently. This isolated candidate still needs native and integrated release qualification. Confirmation when starting a different mission, browser-history restoration, Versus departure redesign, integrated mode lobbies and story transport focus are separate slices.

## P03-E Team initial-focus candidate

After Team enables Start and reports ready, an untouched foreground page chooses its visible enabled default through the shared navigation filter. This is a one-shot keyboard focus handoff, without enabling controller ownership or starting play. A deliberate preload or late focus choice, loader recovery control, background page or failed boot prevents automatic focus. Hidden, disabled, inert and closed-disclosure controls cannot be selected; later frames and focus returns do not retry the handoff. Existing lobby, pause, Back and Resume behavior is preserved. [Scoped desktop keyboard evidence](verification/cross-mode/p03-e/README.md) records fresh Start focus, explicit play, Escape to Resume and Change setup focus. Preload/error/background cases remain host-test evidence; physical controller/touch and integrated qualification are still open.

## P03-F modal Tab-boundary candidate

The active modal keeps Tab inside its visible eligible first/last boundary in both directions. Interior movement stays with native controls, including file inputs and reading regions; negative tab indices, hidden controls and inactive nested parents are excluded. This change does not activate controls, commit drafts or resume play. Source-host tests cover actual story controls and nested Collection/picture return. [Scoped native evidence](verification/cross-mode/p03-f/README.md) now covers both boundaries in Collection, picture and story, unchanged interior controls and nested Escape returns. Root's earlier BODY-focus failure remains retained separately. Integrated release and physical-device qualification are still open.

## P03-G unfinished-mission replacement candidate

The four interactive Solo entry points—mission card, Level, Campaign and Pack selection (including chapter cards)—ask before replacing a started running/recovering flight, including paused and restored attempts. Selecting the same live mission/campaign/chapter is a no-op. The current selectors stay on the actual flight while one Stay/Replace prompt owns input; repeated changes do not queue more prompts. A ready or terminal attempt keeps its direct selection behavior. Programmatic restore, replay and Library adoption retain their existing contracts.

The prompt pauses and holds autosave before reusing P03-C's checked replay, writer, backup-lock and bounded readback protections. Stay, Escape and controller Back preserve the queued turn and return to the actual opener without Resume. Replace remains disabled while checking. An unverified save warns that replacement may lose this attempt; a changed saved slot requires another deliberate Replace and is not overwritten. Pack download/install preserves the old run and recorder until the final guarded selection; cancelling or failing that preparation does not reset the flight. Pack metadata may already have committed before a later check fails, so this is not a rollback promise.

The [G source and native record](verification/cross-mode/p03-g/README.md) separates 101/101 tests on each Node runtime from root’s desktop keyboard journeys. The confirmation currently leaves excessive blank space at full height; P05 should fit this prompt to its content. G is an internal P03 candidate, not public or physical-device acceptance. At the G boundary, Starting class and Steering still called `prepare()` on live attempts; H below addresses that separate starting-setup path. Settings must not silently convert a live run; starting equipment belongs to a fresh attempt, while the authored Tactical Hangar remains an in-flight action. G does not change those paths, Library scenario launches, Team Change setup or the broader mode-entry design.

## P03-H starting-setup candidate

Starting class and Steering now share G's single confirmation owner. A changed setup for an unfinished ordinary flight restores the displayed current value and asks Stay / Prepare fresh attempt; it never changes live replay identity. Same values do nothing, and ready/terminal attempts retain direct preparation. Preferences are applied only after deliberate confirmation. G mission replacement, H setup and Team departure cannot own concurrent prompts; the ticket also captures starting class, policy, scenario/roster and lesson identity.

Ordinary attempts reuse the checked retention/readback and changed-slot reconfirmation already described for G. Stay preserves the queued turn and explicit Resume boundary. The defensive lesson steering handler asks Prepare fresh lesson without saving campaign progress or the suspended flight; First Flight class stays fixed. Current course menus do not expose Immediate/Grid: the selector lives in the inaccessible course Missions deck. The supported course entry carries the selected policy in its URL; the in-course handler is host coverage only. Practice starting setup uses the same explicit session-only loss warning. Authored Tactical Hangar actions still change the active craft through their existing safe core command, independently of starting setup.

This is internal P03 source work: eight complete files passed 132/132 on Node 22 and 132/132 on Node 20, including 26 new starting-setup host cases. [Scoped native evidence](verification/cross-mode/p03-h/README.md) covers ordinary class/steering Stay and Prepare, exact focus, saved-flight restore and real course return. It used the separately reviewed P05 compact CSS overlay; that stylesheet is not part of H. Integrated release and physical-device qualification remain pending. This does not accept the overall phase. Course selection/Skip/Retry, Library scenario launch and Team Change setup remain distinct departure journeys. No core, replay schema, saved format, content, audio or producer change is included.

## P03-I Team departure candidate

The isolated [Team departure work](team-departure.md) adds an explicit Stay /
discard choice before Change setup, Retry or either same-tab header departure
can replace an unfinished Team attempt. Team progress remains in this page only;
this does not add a saved Team format. Stay preserves the normal paused-input
boundary, and terminal/no-attempt actions retain their direct paths. Native
dialog Escape is handled locally so the existing flight listener cannot prevent
the dialog's cancellation. Four complete affected test files pass 152/152 on each
Node runtime; the [scoped desktop native record](verification/cross-mode/p03-i/README.md)
checks Stay, Retry, setup, 50px actions and header pointer requests with keyboard
confirmation. Paused header keyboard access remains a documented gap requiring
in-panel destination actions. This is an internal P03 work package, not phase or
release acceptance. The isolated branch starts at P03-G and does not include the
separate P03-H starting-setup implementation.

## P03-R1 Workshop Restart candidate

The existing native Restart decision now serves both the paused overlay and Workshop’s Sound & game extras. Stay paused, Escape and controller Back preserve the current attempt and restore the actual visible opener. The decision holds autosave without making a new saved-flight claim. Only explicit Restart closes its retained Workshop/title parents before the existing fresh-attempt preparation and start path. Terminal Retry remains direct.

A captured request refuses competing content/save/course/mission decisions and rechecks the current run, recorder and setup before confirmation. Leaving or losing foreground invalidates the shown decision; returning cannot reuse its destructive intent. A queued old close cannot cancel a new visit. Picture loading/failure and its existing interruption guard remain authoritative after a confirmed restart.

This is an internal P03 candidate based on `3253189`, not a version or phase acceptance. Root’s predecessor observation found immediate reset from Workshop without confirmation and a ready field hidden beneath that retained modal. The [R1 evidence](verification/cross-mode/p03-r1/README.md) separates 145/145 tests on each Node runtime from 14 native keyboard observations of both Restart openers. Integration, public and physical-device gates remain open. Outgoing mode links, Library launch adapters, course lesson selection and the approved mode-entry composition remain separate work; no core, saved format, P01 operation, producer or artwork changes are included.

## P03 mode-departure A1 candidate

The isolated [A1 mode-departure work](mode-departure.md) shares Versus's existing
Stay/discard screen across the fixed Solo and Team routes, binding the decision
to the actual match and generation. Team gains Solo/Versus actions inside its
active paused/results panel using I's existing owner, without widening the
navigation root or adding saved Team state. Ready/terminal links stay direct;
Stay never resumes. This source candidate is based on integrated H/I at `f61a249`.
Seven complete affected files pass 211/211 on each Node runtime. The
[scoped desktop native record](verification/cross-mode/p03-mode-a1/README.md)
checks Versus → Team and both Team in-panel keyboard destinations, paused Stay
and explicit discard; it does not certify physical devices or all return/fault
paths. Initial Versus focus remains R5. This work does not yet include the separate
P08 picture host, Solo outgoing retention, title Start/Continue or integrated
Couch lobby work, and does not accept P03 as a phase or release.

## Player flow and feedback contract

- Title offers Single player, Couch Versus (separate-board race) and Couch Team (shared arena). Solo starts/continues in one activation. Ready Couch players choose a mode and Start from one integrated lobby. Future online/Deathmatch remain deferred, without nonfunctional menu choices.
- Campaign browsing combines installed and downloadable compatible content. Show every mission without medal locks; six desktop cards, two tablet columns, one narrow-phone column. Browsing/downloading does not replace an unfinished Solo save. Starting a different unfinished mission explains replacement.
- Return to the actual opener and restore focus. Returning never implicitly resumes. Preserve explicit Resume, opaque pause, controller ownership, release/neutral-input gates, reconnect and independent Solo progress.
- Default Versus is one race; optional first-to-two counts wins, not draws. An in-memory tour awards one point per mission win; rematch replaces its earlier result. Next prepares before discarding results. Name the successor mission/campaign or completion destination. Team progression stays in memory.
- Every asynchronous action acknowledges immediately, before its first await or long work. Use operation identity, truthful phases, measured progress only where available, retry/cancel and stale-completion protection. A long task may say “Still preparing”; elapsed time alone is not failure. Keep Sound/Back reachable where safe; atomic final saves say “Finishing save”.
- One master mute authority governs Web Audio and HTML audio/video, including Studio and stories. Mute is distinct from transport pause and lifecycle suspension. Retain volume, position and explicit pause; late promises cannot unmute. Use truthful On/Off/Enabling/Blocked states and gesture-safe retry. Do not steal the existing M movement binding.
- Standard/Large and Theme/Plain fonts remain. Controls have at least 44 CSS pixels; prefer 48. Touch controls stay outside playable cells. Reduce decoration/reflow before reducing readability. Motion is interruptible; reduced effects preserve all gameplay cues.

## Presentation, Studio and artwork contract

Keep Phaser, navigation infrastructure and deterministic simulations. Presentation does not change collision, campaign identity or score authority. Evolve the existing registry with versioned `PresentationTheme`, `AssetSlotSpec`, `AssetRevision`, `AssetCollection` and `ThemeBundle`; retain historical readers and immutable records. Resolve shared defaults → theme → collection → local draft. Draft storage must not write player saves or the media database.

Each slot specifies stable identity, type, modes/screens/elements/states, preview, purpose, geometry/dimensions, palette, alpha, density, bounds, pivot/rotors, animation/recipe, bytes, accessibility, provenance, history, dependencies and generated variation/edit/collection prompts. Cover fonts, sounds, images, icons and procedural/component recipes. Required incomplete collections cannot publish.

Studio must show native/enlarged/transparent/animated and real-screen Solo, left/right Versus and Team previews, current/draft comparison and all affected screens. Support uploads, token/palette/crop/scale/pivot/rotor/frame editing, immutable revisions, atomic collection replacement, reset/undo and bounded `.rltheme` import/export with provenance and exact bytes. The single-layer editor (≤128×128) supports pencil, eraser, fill, eyedropper, line/rectangle, selection/move, flip/rotate, palette replacement, grid, undo/redo. Large painting and multilayer animation remain external. Browser uploads only become public through the release workflow.

Production sizes: terrain/HUD glyphs 16²; actions 24²; rewards 32²; compact actors 32²; detailed actors/bosses 64²; nine-slice frames 24²; title 960×540 plus portrait; 4:3 reveal 768×576; 2:1 reveal 1152×576. Keep originals and validate derivatives. Preserve procedural rotors and test at actual play size. Original pixels, silhouettes, contrast and consistent role cues take priority over decorative glow.

Shared binding resolves **exact content identity/revision, edition, collection and artwork revision**, never only level name/ID. Preserve pinned saved/earned and authenticated installed originals. Fresh compatible Solo and Versus attempts use the same approved release-art resolver. Mission preview, progressive reveal, results and Retry retain the prepared binding. Image fitting is separate from board sizing: no stretching/cropping gameplay. Required art failures offer visible recovery; approved training/legacy/import procedural scenes are explicit registered art, not silent substitutes.

Team extends its read-only painter with `setPresentation(snapshot)` and prepared map art, sharing drawing primitives without adapting Team state into Solo simulation. First Connection and Relay Yard keep their 72×36 boards/mechanics and receive original 1152×576 orchard/field and industrial/radio-yard pictures. Each edition provides both arena variants; they are not extra missions. Decorative structures cannot imply collision. Old strict Team level formats receive no extra fields; new custom art uses a versioned presentation envelope. Old imports receive approved generic theme art; invalid required custom art fails visibly.

Team slots cover both numbered/shape-coded players (normal/cutting/downed/crawling/rescuing/recovery), hunter warning/charge/recovery, distinct drifter, available/captured anchors, shielded/exposed/secured cores, emitter warning/travelling spark, Support pulse/slow, rescue progress, joint capture and team recovery. Colour alone cannot identify a player. Support must not look like Scan; anchors must not look like ordinary pickups.

Typography: local Handjet 600, square ELSH=2/ELGR=1, static display ≥40px; Exo 2 UI 18/16/14px, weights 400–600; IBM Plex Mono 500 telemetry. Validate actual shipped WOFF2 English/Ukrainian glyphs including Ґґ Єє Іі Її, apostrophes and realistic strings at 200% zoom. Keep real translation-ready text outside images; full Ukrainian translation is deferred.

Default FPV Ukrainian blue/yellow: ink `#071527`, panels `#10243E`, text `#F6F3E8`, muted `#A8B8CC`, focus `#67AAFF`, player/cut `#FFD64A`, decorative blue `#0057B7`, shaped danger `#FF7169`. Optional red/black textile collection keeps readable functional cues. Ornaments are Off/Subtle/Rich menu decoration, away from critical text/play. Partner identity is an independent compatible collection, not indiscriminate logo recolouring. DroneAid uses its researched brand assets, optimized animation plus still/reduced-motion poster and legible contrast; the 150-frame original must not become an unbounded raw atlas.

## Map-consistency gate (P08-A)

1. Same compatible Solo/Versus mission/edition resolves identical approved fresh art; pinned originals survive.
2. Inspect both Team arenas initially, partially and fully revealed: anchors, core/shield, hunters, Support, downed/rescue/recovery.
3. Verify decoded image bindings and loaded asset revisions, not only similar colours.
4. Exercise imported coverage/multi-stronghold maps, approved generic art, invalid custom art, stale preparation and cancellation.
5. Distinguish both players without colour; warnings work over light/dark art.
6. Whole board, critical HUD and two sets of controls remain usable together; canvas boxes match 4:3/2:1 geometry.
7. Keyboard-only, touch-only and supported controller-only navigation, rotation/reconnect/neutral gates, explicit pause/resume and Retry.
8. ≥44px touch targets, Large/Plain text, reduced motion and zoom.
9. Historical results remain identical for two arenas × three difficulties × three teamwork policies.
10. Deployed Team prepares and plays offline, with required assets and no Solo-save/progress writes.

Inventory covers all 15 static Versus maps (twelve First Signal × four themes plus three fixed-FPV Pressure Lines = 51 combinations), every published/installable Versus entry, two starter Team arenas, imported coverage/multi-stronghold maps and every later edition/campaign automatically. An image absent from pack JSON may be an authenticated external original; classify by its full resolution path.

## Encounters and campaign production boundaries

Retain 132 new Solo missions: four twelve-mission FPV campaigns, four twelve-mission DroneAid campaigns, Living Atlas twelve, After School Arcade twelve and Spend in Motion twelve. Each campaign receives its own version/deployment. Its first edition includes complete shared branding and compatible Solo/Versus/Team presentation. Team's two encounter variants are additional, separately counted. Do not claim all Solo missions support Team automatically.

Gentle/Standard/Hard, optional encounters, labelled combat, reduced effects, mechanical alternatives and optional remains remain required. Cosmetic choices never alter physics. Preserve clean original art; remains are optional attempt/result/earned overlays. No new attack button, homing projectiles, online or Deathmatch.

Auxiliary patrol/carrier/shooter roles use explicit field/safe/both domains and do not seed capture. Contact and exact newly captured cells defeat once. Keep deterministic seeds, checkpoints/replays, lethal-event ordering and bounded rewards. Limits: twelve auxiliaries/twenty-four actors; three shooters; two reserved-or-active projectiles. Fixed aim telegraphs: 1.2s Gentle, 0.9s Standard/Hard; cooldown 12–16/8–12/6–10s; projectile 2 cells/s, 3s TTL, blocked by walls. Stable ready arbitration, clear defeated owners' shots and newly captured shots, stun cancels aim, freeze holds clocks. No posthumous fire or duplicate reward. First three missions introduce no shooter; at most two shooter missions per twelve. Introduce one unfamiliar role at a time.

Team Support preserves its six-cell pulse and 1.5s slow, cancels aim/intercepts projectiles without a free defeat, and retains existing rescue/grace/stronghold semantics. Fair target allocation and shared capture count each actor once. No Solo awards/resources from Team. Qualify 792 Solo difficulty/encounter configurations, explicitly selected Versus cases, and the separate 36-case Team encounter matrix. These are targets, not completed tests.

Xposed's 64 supplied screenshots include 48 numbered references. Reimagine their layout/feedback using original art; screenshots do not prove undocumented mechanics. Human runners, shooting or persistent remains are original proposed mechanics, not claimed observed Xposed behavior. DroneAid Support/Combat, Ukrainian culture, Retro and spend management need distinct readable role semantics. Social Drone UA/Victory Drones receive tested guide/templates here; additional full production is future work.

## Compatibility and capacity

Keep presentation outside simulation/campaign hashes. Allocate the next unused schema versions only after inspecting current dispatch; never mutate historical validators, checkpoints or proof fixtures. Preserve historical Team's strict level imports, independent Solo progress and no persistent co-op saves. Starting-safe regions/new encounter fields require explicit new-version validation and unchanged legacy outcomes.

Retain current budgets unless a separately reviewed requirement explicitly changes them: core offline 64 MiB; main Pages 950 MB; archive 800 MB; media 256 MiB; twelve installed packs, 24 MiB each/48 MiB aggregate; library 4 MiB/512 contexts; save 2 MiB. Current Journey P02 theme manifest 5 MiB (bounded extension from 4 MiB, [measured full-replacement evidence](verification/journey-p02-music-recipe.md)); bundle 32 MiB, asset 4 MiB, 512 slots, 2,048 revisions, 1,024 themes, 128 collections, image side 1,920/pixels 2,073,600 remain unchanged. Old editions keep their original limits. Plan context/recovery capacity before producing all campaigns. A proposed budget is not permission to bypass a validator.

## Release and evidence protocol

For every row: **implement → review → test → fix → retest → stage related hunks → synchronize version → commit → qualify exact source → freeze → deploy → verify public play → accept**. Use the next unused minor for a phase/campaign and patch for a smaller correction. Synchronize package, lockfile root/top-level and build-config. Inspect staged bytes; never stage unrelated preserved drafts. Update relevant docs, skills and copyable prompts in the same feature.

Six mandatory source gates:

```text
npm test
npm run lint
npm run format:check
npm run format:native:check
npm run validate
node --check authoring/motion-lab/app.js
```

Also require applicable production reproduction/readiness, ordinary build, artifact integrity, relevant browser journeys and public/offline checks. Record exact source identity before/after. Hosted test shards must cover the same full npm test set; partial/focused tests do not replace it. A merge or later source change needs its own qualification.

Use the existing [Pages release procedure](../.cursor/skills/deploy-release-pages/SKILL.md), immutable source snapshot and main-only publisher. Keep game source SHA distinct from publication revision. Preserve original ZIPs/tags/metadata, all historical routes, complete byte audits and failed-attempt evidence. A queued run or artifact is not deployment. Public version/source identity, every deployed manifest body and actual play must agree before acceptance.

Each phase receipt records phase, version, source SHA/tree, publishing SHA, immutable test URL, source/artifact checks, asset hashes/bytes, browser/input/viewports, failures/corrections and public/offline evidence. Keep **inventory, modeled input, actual browser interaction, visual inspection and physical hardware** as separate evidence categories. Never infer physical-device success from responsive screenshots. Required unavailable checks remain outstanding.

Deferred: online multiplayer, Deathmatch, full Ukrainian translation, hosted administration, persistent co-op saves and unlisted community campaign production.

### P03-K — training lesson choice candidate

The visible course selector uses the existing fresh-attempt decision: Stay preserves the paused lesson; Prepare adopts the named lesson at Ready, without writing campaign data. Same selection is inert; Skip/Return cannot bypass an open decision. [Source and native evidence](verification/cross-mode/p03-k/README.md): 106/106 in seven complete test files on Node 20 and 22, plus 13 desktop keyboard observations. This is an internal source candidate based on `f61a249`, not P03 completion or a new public release. J Restart and mode-entry integration, Library launch parity and final input/device journeys remain required.

### P03 mode entry A2 — Solo Missions to Versus candidate

A2 extends A1 from `c7f4faae318d58eacab140c1b2913e620e15efb7`: the visible Solo Missions Versus link shares the checked Team departure owner, actual-opener Stay, paused save hold and truthful fallback. A separate bounded same-tab v2 token returns to the exact installed Missions selection after ready; v1 Team bytes remain unchanged and no return adopts/resumes a saved flight. Blur/hidden/pagehide cancel delayed departure authority. The [source contract](mode-departure.md#a2--solo-missions-to-versus-and-same-tab-return) records scope and integration obligations. Fourteen complete affected files pass 355/355 on each of Node 20 and 22. Independent source review and the scoped desktop native journey are closed: 18 keyboard observations and four PNGs cover nondefault return selection/focus, verified-save warning/Stay and explicit departure, then a separate paused saved restore. [Retained evidence](verification/cross-mode/p03-mode-a2/README.md) preserves corrected intent labels, host-only exact state, R5 and separate TitleB limitations. P03 remains implementing; R3 Library, title Start/Continue, coherent Couch lobby and combined P08/R5/source/public/device gates remain separate.

### P03-R3 — Library interactive launch candidate

Installed campaign Play, dated challenge Launch and earned-picture Replay flight now request the existing Solo replacement decision. An unfinished ordinary flight is paused and checked through the same save/readback and newer-writer guards; practice is explicitly session-only. Stay returns to the actual Library/picture opener. Deliberate Replace prepares a ready target and closes only the originating menu stack, without Resume. Same installed/challenge selection is inert; Replay flight deliberately creates a fresh attempt, including when its mission is already selected.

The host resolves a finite code-owned descriptor and rechecks its originating Library visit or picture generation, exact earned record, campaign, level, theme, seed and difficulty before adoption. Blur, hidden state and pagehide retire launch intent; returning requires Stay and a fresh foreground request. This epoch does not cancel picture/media preparation. It does not change raw internal selection, saved-flight restore, backup/export, P01 operation status or import cancellation. A failure after approved selection does not claim the previous flight was restored. Replay flight retains its existing fresh-preparation artwork behavior: current authored artwork is used; exact earned-original replay bytes remain a P08-A/P07 acceptance item. Collection viewing and backup remain pinned to their existing earned originals.

[Retained R3 evidence](verification/cross-mode/p03-r3/README.md) separates the original eight-file 157/157 pair from the final four-file foreground 87/87 pair and the separate 10/10 difficulty compatibility pair, each on Node 20 and 22; overlapping counts are not summed. Root observed 22 desktop keyboard steps and three screenshots covering an actually earned picture Replay and challenge Stay/Replace through nested parents. Native paused attempts showed 0:00; exact cut/checkpoint, newer-slot and background behavior remain host-test evidence. Installed-pack native, physical input and final A1/A2/Title/P05/P08 composition are still separate. This is an internal P03 candidate, not a new accepted phase, version or P03 completion; public/offline and physical qualification remain required.

## P03 title Start/Continue work package

The [title continuation contract](title-start-continuation.md) replaces the extra title-to-Missions deployment step with one deliberate Start for the named current mission. Continue prefers a retained run, otherwise verifies the captured saved flight before explicit Resume; generic Library/Load remains paused. Cancellation, changed saves and backgrounding retire the request. Status/Cancel stay inside the title and cleanup preserves newer focus. Terminal Start remains actionable. The [scoped candidate evidence](verification/cross-mode/p03-title-entry/README.md) retains 187/187 checks on each Node runtime and 15 final desktop keyboard observations, separately from earlier failures and native source pins. The preferred Arcade entry, three-mode title/common Couch lobby, final integration and device/public qualification remain open; this is not another accepted phase.

### P03 R5 — current-P03 Ready focus candidate

The [minimal adaptation and evidence](verification/cross-mode/p03-r5-adaptation/README.md) extends exact A2 source `c5bccfc` with one Couch runtime change. It preserves initial loading until preparation completes, clears boot inertness, then offers one untouched foreground Start focus under exact readiness/identity guards. Fourteen applicable R5 cases and seven complete affected files pass 211/211 on both Node 20 and 22; the P08-only required-picture case and old 141-test/native result remain separately scoped. Independent source review and the scoped native journey are closed: nine desktop keyboard observations and two PNGs cover fresh Start, explicit play/Pause and retired automatic focus after a deliberate loading Back choice. Loading cleanup removes Back and leaves BODY until a fresh Tab; this is not a claim that its missing element stays focused. P03 remains implementing; this is not the full Couch lobby, P08 integration, release or public/device acceptance.

### P03 common Couch mode-row candidate

The [shared mode presenter](common-couch-lobby.md) places Solo, Versus and Team in the same order using the existing guarded destination anchors; the current mode is a static label. Team moves that same row between lobby and active pause/results panel and hides it during play. [Scoped evidence](verification/cross-mode/p03-lobby/README.md) retains 261/261 in seven complete files on each Node runtime, 14 desktop keyboard observations, final computed card styles and the earlier sparse-input/Tab-order failures. This candidate starts at A2/R3 `1f53e82`; R5, Title mode entry, wider Team P05/P08 presentation, composition and device/public qualification remain separate. It does not close the phase or allocate a version.

## P03-M — Title three-mode entry candidate

The [Title mode contract](title-mode-entry.md) adds a current Solo label and real Versus/Team links through the existing checked departure owner. Title uses fixed `return=solo` destinations without a return hint; Back opens Title, while Missions v1/v2 exact-selection returns remain unchanged. Pending Title Start/Continue is cancelled before departure; busy restore cleanup remains authoritative. Unfinished attempts retain checked-save/Stay/explicit-Leave behavior, actual-opener focus and no automatic Resume. The shared presenter comes from P03-L; M owns only Solo host/shell/markup and the necessary foreground guard in generic modal restoration.

This is an internal P03 work package from `5aceb1b`, not a public phase or version. [M evidence](verification/cross-mode/p03-m/README.md) separates eleven-file 366/366 passes on each Node runtime from root’s 19 desktop keyboard observations and six original PNGs. The full combined-source, P05/P08, responsive, public/offline and physical-device gates remain open. The First Signal default is unchanged.

### P03 completed-operation focus correction

The [bounded correction and evidence](verification/cross-mode/p03-operation-focus/README.md) restores the actual connected chapter/Library Install opener only while its operation owns focus. Descendant element blur is distinct from true page blur. Automatic completion respects newer focus; actual focused Cancel captures fresh same-dialog return intent before abort, with cleanup/lifecycle and detached-commit guards intact. Seven complete files pass 188/188 on each Node runtime. Root's final nine desktop keyboard observations/three PNGs cover actual three-Tab Cancel, delayed Tab-to-summary/no-steal and both ordinary completions. Historical failures and corrected intent labels remain retained.

The [composed navigation record](verification/cross-mode/p03-composed/README.md) now qualifies `d0925c0`: Node 20 passed all 767 checks in 35 complete files. Node 22 has passing coverage for the same scope through 34 unchanged complete files plus the final complete 27-case operation-focus file after exact missing-fixture intake; this is not one passing 35-file command. All 284 final input hashes stayed unchanged. The earlier 47-event desktop journey and separate final focus correction retain distinct source identities. Recreated pack-row focus and Score/Collection pager focus remain active follow-ups; full integration and hosted/public/physical qualification remain open. No phase or version is closed.

### P03 remaining Library row and pager focus

The isolated installed-row candidate extends the [operation focus contract](operation-focus.md#installed-pack-removal) only for Remove from device. Its logical return follows the actual settled pack identity and captured row order, with same-dialog focus/currentness guards; durable Stop waiting remains detached. Four complete files pass 108/108 on each Node runtime. The [eight-event desktop record](verification/cross-mode/p03-library-row-focus/README.md) verifies successful middle/last/sole removal and nested Back, with four inspected PNGs. Failure, detached writes, changed versions and background remain host-test cases. This candidate is based on `d0925c0`; it does not retroactively change the composed-source gate or close P03.

Score and Collection pagination remain a separate P03 item. Prefer retaining the existing Previous/Next controls and updating their page state instead of recreating them. Preserve the same logical action if enabled, otherwise the opposite enabled action at a boundary, and the corresponding search field when pagination collapses. Collection paging can await picture metadata, so a later focus/input choice, dialog change or backgrounding must retire any automatic handoff. Keep its existing gallery-view return behavior and qualify delayed metadata separately. This item is not included in the Remove-row source change.

### P03 stable Score and Collection pagers

The isolated [pager correction](operation-focus.md#score-and-collection-paging) keeps Previous/Next elements and their current callbacks. An owned disabled action moves to the opposite enabled action, then the matching search field when no pager action remains. Automatic Collection refresh transfers the existing focus lease, including its retired state, while exact metadata generation/model and foreground checks prevent stale or newer-focus handoffs. The fixed-target and Remove-row contracts stay unchanged.

This package starts at `87f0f49`, which integrates the row correction with `7958a28`'s newer composed guidance. Its [retained evidence](verification/cross-mode/p03-library-pagers/README.md) preserves the initial live-lease transfer failure and two reproduced obsolete Main menu fixture expectations. Native fixture import, asynchronous host checks and final-source/public/device qualification remain separate. The adjacent picture-view close/return correction is outside this pager source. Preserve later main guidance, including `ec288a4`'s observed-action prompt, when composing.

The pager predecessor's nine-file pair passed 177 cases on each runtime, but native event 13 found that restored Next remained below the viewport after Collection grew back to a full page. The 16-event/six-PNG record remains a visibility failure. A narrow optional reveal successor now handles both changed and unchanged focused pager targets, with callback/currentness checks and no new permission for retired leases. Its final nine-file pair passes 188/188 on each runtime; the corrected 13-event/seven-PNG native record passes the observed desktop page-growth, endpoint, Search and Back journeys. Six post-native HTTP/local inputs remain exact. Preserve the predecessor failure; this is an internal checkpoint, not complete P03, public or device acceptance.

## P05 integration onto final P03 — scoped candidate

The [shared display integration](shared-display-preferences.md#current-p03-integration) composes only the five approved P05 commits onto `3acce1941116d18f9e86dcfa26dea463433cd3b2`. It retains the current Title/Missions/Library departure owners, Team discard and captured recipe, common mode rows and one display lifetime per host. Existing P05 native/font/confirmation evidence remains historical. The [new scoped record](verification/cross-mode/p05-p03-integration/README.md) retains the fourteen-file supported-runtime results and 17 desktop keyboard observations, with the original and corrected Options preview sources separate. Responsive, zoom, real system/storage-event, physical-device and final public qualification remain open; Large is a preset, not a 200% scaling claim. Later P03 operation-focus corrections require a distinct composition. P03's final source is qualified separately by its owner. This integration does not complete P05, add P08 presentation, change the First Signal default or allocate a version.

## P05-B — menu palette and static ornaments candidate

The [menu appearance contract](menu-appearance.md) extends exact P05-A `3f934b7` with menu-only Automatic/Ukrainian colours and Off/Subtle/Rich ornaments in Solo, Versus and Team. A separate strict two-field origin-local record leaves display, audio, profiles, authored theme/art identities and simulation unchanged. The existing Options owner keeps Text style first. Static, noninteractive decoration covers late player dialogs through a page-owned observer; original frame borders remain bound while opaque Ukrainian menu interiors preserve functional state colours. Source/token contrast checks and finite host tests remain distinct from actual computed/native layout, system/storage, zoom, physical-device and public qualification. P03 operation-focus and P08 composition are separate; no version, producer approval or phase completion is claimed.

[Scoped B evidence](verification/cross-mode/p05-b/README.md) retains the original 205/205 whole-eight-file pair, the corrected whole-two-file 22/22 pair and final test-label-only whole-file 12/12 pair without adding overlapping counts. Original desktop Rich stripes crossed Versus/Team content (12 events/eight PNGs); a CSS-only gutter successor cleared sampled text/focus bounds and retained paused Off/Subtle/Options behavior (six events/five PNGs). Team pause action/mode-row vertical spacing remains open alongside responsive/zoom, broader state/text combinations, real system/storage and physical-device checks. The two native sources and original failure bytes remain separate; this closes only the reviewed B candidate scope, not P05.

## P03 — Couch shell visible-focus candidate

The [local Couch focus correction](couch-visible-focus.md) starts at combined P05-B/P08 static `063ff5d`. The shell requests nearest/auto reveal only while the same action, screen, root, status and foreground remain current after focus callbacks; final result content is installed first. The final complete shell/navigation pair passes 44/44 on each Node runtime, with all 524 admitted physical inputs unchanged. Its overlapping predecessor pair is retained separately. [Scoped native evidence](verification/cross-mode/p03-couch-visible-focus/README.md) observes first Results, explicit Next and board-return focus in actual DOM geometry, while retaining the original offscreen failures. Full responsive visual acceptance remains incomplete because overridden-viewport screenshots have unresolved bands/edge duplication; normal reset captures are distinct. Resize-only already-focused lobby Start visibility remains a P05 follow-up. No Team/arena/simulation owner or version changes, full phase acceptance, physical-device/zoom or public qualification are claimed.

A later [coherent six-sample Couch supplement](verification/cross-mode/p03-couch-visible-focus/clean-native/README.md) closes the observed first-Results and board-return/full-arena checks at actual 844×390 and 390×844, DPR1, on unchanged `2c61981`. Earlier distorted samples and their unresolved cause remain preserved. This docs-only addition does not cover resize-only lobby focus, all layouts/devices, actual browser zoom or phase/public acceptance.

## P05 — current Couch focus after resize candidate

The [isolated resize correction](couch-resize-focus.md) starts at the committed Couch transition/order source `2c61981`. It synchronously reveals the actual focused eligible action after Window resize only when outside the viewport and still owned by the current foreground screen; it neither refocuses nor changes the round. The final complete resize/shell/navigation pair passes 64/64 per Node runtime, separately from the retained 63/63 predecessor pair and modeled final-style-read failure. Eleven final native observations and eight inspected JPGs confirm the same current Start, Help Read controls and paused Resume through normal, 844×390 and 390×844 viewports, including Plain/Large/Ukrainian/Rich. The source-bound browser record confirms focus and displayed pause, while exact checkpoints remain host evidence. This does not replace the historical capture diagnostic, complete P05 or establish zoom, device, Team, final integration or public acceptance.

### P08 Team picture host checkpoint

The [Team host integration](team-picture-host.md) adopts the reviewed two-row binding/painter/lease onto exact P05-B/static `063ff5d`. It preserves Team discard and captured recipe, explicit Start/Resume, common mode rows and shared display/menu/audio owners. Required starter preparation keeps candidate and accepted attempt/image lifetimes separate; Cancel or refusal does not silently substitute procedural artwork or revive Start. Only the exact complete starter authority and fpv revision 19/null snapshot use the approved Orchard/Foundry derivatives. Later accepted revisions require requalification; no artwork, mission, registry or schema is added.

[Retained evidence](verification/cross-mode/p08-team-host/README.md) separates twelve complete-file scopes totaling 273 cases per runtime from the prior 195-case unwired checkpoint. Node 22 uses eleven unchanged passing files plus the corrected complete picture-host file; its initial fixture failure and two product regressions remain retained. Normal native nine events/seven JPEGs observe actual 4.6% partial capture, Retry, paused Stay and explicit discard. Delayed native nine events/six JPEGs observe required loading, Cancel, explicit Retry, newer Help focus and explicit Start; only the exact Foundry GET has a declared six-second delay. Fifteen HTTP/local inputs remain exact before and after each run. The missed first Cancel and failed unboosted opening are actual observation limits, not successful cancellation or a completed Team route. Full native wins, joint/rescue proof, actor parity, later P03/P02 composition, device and public/offline gates remain open. This internal checkpoint does not complete P08 or allocate a release.

### P03 Collection records-return successor

The settled combined-source growth journey exposed an inherited Library-close bridge: it re-entered Collection and left the restored Flight records action below the viewport after importing 25 fixture completions. The isolated [records-return candidate](collection-records-return.md) replaces only that bridge with a read-only refresh owner. Preserve exact opener/visit/model/population authority, independent pager/picture owners and no additional Pause/save. The predecessor def1186e native failure and its source pins remain immutable. Source/host qualification and corrected native visibility are separate gates; this addition does not complete a phase or include HUD, actors, P07 or release work.

The [internal full-composition checkpoint](verification/cross-mode/cross-mode-source-composition/README.md) retains four direct source parents (29a98c0e, 90e8bc81, 657ac7b5, d3ff0bc1). Its predecessor def1186e passed 39 complete files at 760/760 per runtime. The Collection successor ebcf47cc separately passed eight complete files at 177/177 and one Field Kit file at 7/7 per runtime; these overlapping source cohorts are not additive acceptance totals. Root's fresh import-growth repeat passed with the same Records action visible after settlement and all 27 source response pins exact. Historical ENOSPC, fixture and native failure records remain lossless. This is the entire inherited composition plus the narrow fix, not an eight-file-only delivery. HUD/actors/P07 and P01/P02 final composition, exact-source CI/build/public gates and remaining phase/device work stay separate.

### P03 device-aware reading prompts

The [reading prompt successor](reading-input-prompts.md) on exact gameplay checkpoint `1f3b9995` corrects keyboard reading that still advertised controller buttons. Solo now selects keyboard Enter/Space/Escape, current mapped controller labels, or touch/mouse Done reading copy. A current-reading-only refresh handles the first modality-changing key without re-entering reading, changing focus or performing a game/save/audio action. Generic controller defaults and existing handlers remain unchanged.

Three complete affected files passed 78/78 on each supported Node runtime with all 230 inputs unchanged. The initial native-Enter fixture omission and the corrected real wrong-copy failure remain distinct in the [retained source evidence](verification/cross-mode/p03-reading-prompts/README.md). Guidance appended afterward is not part of the tested input snapshot. No native prompt observation, physical device, whole-suite, final P01/P02 composition or phase/public acceptance is claimed.

A separate [native reading supplement](verification/cross-mode/p03-reading-prompts/native/README.md) now records the unchanged `6727d83e` checkpoint through actual keyboard and pointer Mission brief actions: truthful hints, first-key switching and Read-focus restoration while paused. Five records and three root-inspected JPGs retain the initial unresolved accessibility/DOM route ambiguity; twelve before/after HTTP responses match the checkpoint. This closes only that bounded observation, not physical controller/touch, scrollable reading, full Help, responsive/zoom, exact save/checkpoint, current P02 composition or phase/public gates. The earlier model-only record stays immutable.

## P05 supporting-screen readability

**Qualification correction:** initial source `02127f1` failed one hosted held-boot Replay test before its cold module graph entered startup. The [retained correction](verification/cross-mode/p05-supporting-readability/startup-correction/README.md) uses the actual held-fetch boundary and drains imports during cleanup; production is unchanged. All eight affected files pass 57/57 on each supported runtime. At that correction cutoff, fresh complete hosted families were still required and v0.59.1 remained public. Corrected source `170508f1` subsequently passed its own complete qualification and scoped v0.60.0 public gate; the original failure remains retained.

**Status: v0.60.0 Studio/Replay scope accepted; full P05 remains implementing.** This named delivery began from acceptance merge `10df6751b0f31d3f8ed68ee0132c830b6eefbec8`, with accepted v0.59.1 game source `206c4b9bdd7bc53aecf818f85a1cbf680814a4e5`. It composes the reviewed Studio font/cache, Interface and inventory-focus work with Replay's display adapter and the shared persisted-return correction. Read the [behavior and research notes](supporting-screen-readability.md), [Studio guide](asset-studio.md#studio-interface--readability-candidate) and [shared authority](shared-display-preferences.md#studio-adapter--scoped-readability-candidate). Full P05 remains incomplete.

Both routes use one shared display record, without replacing original media, dirty drafts, sprite history or replay identity. The Studio preview owns only its frames and subscriptions; selected-file specimens keep their exact font identity. Persisted return refreshes shared settings/system reduction while retaining denied-save local intent. The integration preserves the newer practice correction and main's accepted release evidence.

The nineteen deduplicated core test files passed151 reported checks, and the complete Solo/Team/Versus display-host file passed nine reported checks (eight leaves plus one parent), on Node20.19.5 and22.22.2. All795 captured inputs stayed unchanged. The added actual-Studio regression preserved prepared original bytes, selected row/focus, dirty sprites and denied-save intent through modeled persisted return. Explicit formatting passed for21 changed source/test paths. See [retained evidence](verification/cross-mode/p05-supporting-readability/README.md). These are integrated candidate results, not a sum of overlapping historical candidates or final release qualification.

Native Replay testing found three corrections: Jump to playback did not transfer keyboard focus, completing playback disabled the focused Play/Step action without handing focus to Restart, and shared CSS overrode the intended readout size. All three are integrated; predecessor failures remain retained. Completed Play's amber disabled styling remains a separate component-state follow-up. Static review also found and corrected Studio textarea whitespace, preserving multiline prompts and evidence. Those corrections completed final-source qualification and the scoped v0.60.0 public-byte/browser gate linked in the [current progress report](../publishing/pages-controller/delivery/evidence/cross-mode-p05/public-v0600/planning/progress-and-next.md). The reported native scope does not qualify physical input, disconnected operation or all supporting screens. Future corrections require their own exact-source and public gates.

The broader P03 device/lifecycle matrix stays open. P04 picture-context repairs, cold Back filter/selection coherence and focus after successful mutation commands disable their trigger remain separate. Other supporting-screen adapters, full art parity and physical qualification remain in their approved phases.

</details>

</details>

</details>
