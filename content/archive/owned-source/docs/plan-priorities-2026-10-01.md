# Reveal Line: remaining work explained for reprioritization

> **Historical snapshot:** this document records the 1 October review against its pinned main revision. Its queue, deployment, PR-status and recommendation statements are preserved as dated evidence, not current instructions.

Reviewed **1 October 2026, 22:30 CEST (Europe/Berlin)** against main
`955c539a757c08c534c9038500785b20e64abb36` and fresh GitHub/public metadata.
This is a historical decision aid and dated status update, not new gameplay qualification.
It supersedes queue and recommendation statements in the
[30 September actor review](plan-review-2026-09-30.md), while retaining its
implementation evidence and the [whole-product scope](delivery-status.md).

## The decision in plain language

**Recommendation: finish the existing game before expanding it further.** The
highest-value result is that someone can start easily, understand the drone and
threats, enjoy a few genuinely different missions, keep their rewards and choose
Retry or Next without friction. More tools, music or mission counts will not
compensate for failures in that loop.

**Already approved:** A (characters and reliable play) → B (optional challenge
variety) → C (first Ukrainian/FPV art cohort), with necessary tools alongside;
formal player comparison C2 stays last. Production-art review remains deferred.

**Proposed refinement for user review:** put immediate player/release defects
first, keep the drone corrections prominent, combine B with a small level-quality
and default-adoption batch, then finish one artwork cohort. Keep offline/save/input
safeguards with each release. Broader simulator expansion, community tooling,
extra campaigns and optional mastery can follow. This proposal does not cancel
existing owner work, authorize unreviewed candidate adoption or lift any deferral.

## What has actually been completed

| Area                   | Completed capability                                                                                                                                                                                                                                  | What is not being claimed                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Normal game entry      | Default Journey entry, Solo/Versus/Team, mission browsing, progression and legacy routes exist. Current selectors still choose `whole-spatial-v25` for Solo/Versus and `team-cultural-specialist-originals-2` for Team.                               | Every newer candidate edition is the default, or every mission is finally balanced.                                 |
| Menus and continuation | Shared input ownership, compact Home/Pause, Settings/Help return paths, deliberate Retry, countdown, named continuation and reward/Collection foundations exist. Further compact selector, Demo Confirm, rotation and landing corrections are merged. | Every device/input combination is certified or all remaining reward-screen refinements are merged.                  |
| Characters             | Shared rotor direction/phase/radius handling, pause/freeze clocks, Team Hunter facing/recovery and player identity/contact cues are integrated. All 24 actor batches are merged.                                                                      | All new seven-class bodies or bigger-propeller candidates are selected production assets.                           |
| Challenge systems      | Pursuit/interception, optional scout/sentry, timed bonuses, terrain/relay mechanics, exact practice, teaching and replay foundations exist.                                                                                                           | Placing more of them necessarily makes missions fair or interesting.                                                |
| Art and tools          | Seven native drone body candidates; workshop, Poltava and Synevyr sources/derivatives; Motion Lab, bounded artwork packets, provenance, retained originals and comparison/import/export exist.                                                        | Candidates are approved, or creating another tool is required to publish the first cohort.                          |
| Audio/offline          | Shared audio and optional soundtrack foundations, failed-recording recovery, optional-media verification and recent update/settings work are integrated.                                                                                              | Full listening, every offline recovery path or every physical device is accepted.                                   |
| Optional FPV simulator | World framework, Academy/woodland/courtyard demonstrations, sector timing, radio-world input/setup and shared native-style simulator UI are integrated.                                                                                               | The capture game and optional simulator are the same completion scope, or all challenges/real radios are qualified. |
| Planning/preservation  | Previous plan PR876 merged; historical assets/source and accepted content identities remain preserved.                                                                                                                                                | Every old branch should be replayed, or every planned scope is finished.                                            |

Merged since the prior review include #846/#857 role galleries, #858 audio
recovery, #866 Demo Confirm, #867/#884 selector changes, #869 offline verification,
#870 prepared-title reader, #856 Demo variety, #892 sector timing, #893 updater/
Settings and #899/#901/#904 simulator input/setup/UI. These are integration facts;
old documents may still say “open.” Fresh public metadata matches main, but this
review has not replayed all those flows in the browser.

## Ten remaining work packages

The labels below describe outcomes, not ten new engines or ten mandatory PRs.
Small compatible fixes may ship together. Recommended priorities are proposals
for rebalancing; the existing approved sequence remains in force until changed.

### 1. Make starting, playing and continuing dependable

**Recommended priority: first. Maps to A and remaining UX0–UX5 corrections.**

Finish proven faults in Start/preparation/cancel ownership, keyboard/controller
Confirm, touch layout, Pause/Resume, result/picture/Collection and named Next.
Deliver already-prepared narrow fixes through the publisher. Inspect WIP #910
before calling it ready; #906's retained victory picture is an open refinement,
not an already delivered result. Preserve the previous attempt when replacement
loading fails. Check the normal path before advanced/admin routes.

**What players gain:** fewer clicks, no accidental cancellation or restart, clear
success and an obvious next action. **Without it:** players may quit before the
art or challenge improvements matter. **Finished means:** a bounded real journey
from Start through failure/Retry and win/Next works with the relevant input and
responsive states; no lost result, duplicate reward or carried Confirm.

Reconcile PR868's tiny Sentry loss explanation separately if its heavier
historical-import dependencies continue holding it. A correct explanation should
not wait for unrelated new art. Do not merge its stale branch without current
source checks.

### 2. Make the drones and enemies look convincingly alive

**Recommended priority: first visual work. Maps to A / C1 / C3.**

Finish readable bodies, larger attached propellers, motor proportions and
recognizable enemy silhouettes. Select and adopt reviewed revisions; inspect
20/24/32-pixel sizes, four headings, board edges, bright/dark artwork, pause,
freeze, warning, charge and recovery. Other roles need their appropriate wing,
wheel, track or thrust response rather than a drone animation applied everywhere.
Preserve distinct Team identities and the
real contact point. The last FPV104 inventory still lists the registered border
patrol without rotor anchors despite a renderer fallback; recheck and repair that
specific rig rather than replacing the rotor system.

**What players gain:** the improvement they explicitly asked for—machines that
look coherent and threats whose actions are visible. **Without it:** rotor code
can be technically correct while the craft still looks small, awkward or static.
**Finished means:** the chosen production bodies/rigs work through ordinary play
and retained attempts in applicable modes. Collision, scores and handling do not
change because a body looks larger.

The seven candidate bodies are already available. Production review is deferred;
source repairs may continue, but candidate approval cannot be inferred. If the
user wants a visible art result soon, the smallest review to resume is one common
drone plus a representative enemy, then expand the accepted treatment.

### 3. Make a few levels more interesting, then make them easy to find

**Recommended priority: next gameplay work. Maps to B / C4 and Levels R1–R5.**

Use existing threats, terrain and bonuses to create genuinely different choices,
not simply higher speeds or more enemies. Start with a small cohort such as
Cooling loop, Pressure ladder and Switchback exchange. Check viable approaches,
Gentle/Standard/Expert pacing, both steering contracts and whether the main
mechanic matters during ordinary play. A known legal scripted route is not proof
that normal players will find it enjoyable. For Team, check that partners help
one another rather than independently clearing easy halves.

Then explicitly select which reviewed successor becomes normal entry and preserve
old editions. Current default v25 does not automatically include registered v38
changes. Do not blindly promote all later revisions while review is deferred.

**What players gain:** reasons to change tactics and try again; improvements they
can encounter without special URLs. **Without it:** additional content can feel
repetitive or remain hidden in review/archive paths. **Finished means:** a small
cohort has distinct decisions, readable counterplay, preserved replay/progression
identity and an explicit, honestly labelled selection/adoption decision.

This is mostly level design and qualification of existing mechanics. Team combat
expansion is separate; a shared cosmetic preference does not implement it.

### 4. Put the first coherent Ukrainian artwork into ordinary play

**Recommended priority: after the small gameplay cohort, or parallel preparation.
Maps to C / first C5 cohort.**

Finish pixel cleanup, regional/cultural details, composition, background contrast
and mission bindings for the workshop, Poltava courtyard and Synevyr-inspired
scenes. Their originals, board derivatives and import/export workflow already
exist. Keep real-world material reference-only unless reuse permission is recorded;
photographic reveals remain an explicit community choice.

**What players gain:** recognizable Ukrainian/community identity and attractive
reveal rewards throughout the same visual language. **Without it:** candidates
remain in authoring previews and ordinary play retains the existing pictures.
**Finished means:** approved pictures resolve consistently through mission preview,
reveal, win, Retry, Continue and Collection while old earned originals remain exact.

**Currently deferred:** production/cultural review. There is no adoption date
while that deferral remains. A small representative cohort is a better next
investment than generating dozens of additional unreviewed pictures.

### 5. Protect progress, offline play and updates

**Recommended priority: essential safeguards alongside the above; broad matrix
later. Maps to history/backup/offline work and C7 / UX6.**

Verify that selected missions actually have their advertised pictures/audio
available offline; partial downloads have useful repair; updates and cancellation
retain the current run; backups accurately describe their media scope; restore
and imported historical themes keep exact originals. PR868 specifically restores
fpv38/50 Team imports, not every possible old theme revision. Ambiguous lineages
need explicit identity decisions rather than silent replacements.

**What players gain:** trust that their rewards and play session survive a lost
connection or update. **Without it:** the game may work on a good connection but
fail during travel, storage recovery or older-content use. **Finished means:**
interruption, offline relaunch, update and restore are exercised with actual
selected dependencies. A downloaded shell alone is not complete offline play.

Pair small checks with each changed feature. Keep the larger compatibility,
performance, accessibility and physical-device matrix as a distinct final
qualification effort. The wider pass includes terrain, pickups, objective markers, effects and previews
across modes, not just actor sprites. Current automated suites are waived, not
passed; restoring
the suite policy and repairing deferred failures remains owned validation work.

### 6. Make sound helpful and comfortable

**Recommended priority: targeted comfort/reliability work; extra recordings later.**

Existing mute, playback, spatial cues and recovery are implemented. Review a
representative capture, warning, loss, menu and Team scene at ordinary volume;
check that important cues can be heard without fatigue or clipping, and honor
mute/reduced preferences through late loading and updates. Resolve verified
content-rights/feed issues in the existing owner lane (#897); #914 proposes the
updated audio-specific priorities. Do not count those open PRs as merged.

**What players gain:** clearer danger and satisfying feedback without annoying
repetition. **Without it:** working audio may still tire players or mask useful
information. **Finished means:** scoped listening and lifecycle evidence for the
selected mix; hardware/headphone checks remain separately attributable. A larger
soundtrack library is optional and not required to finish this pass.

### 7. Finish selected FPV training/racing improvements

**Recommended priority: secondary to the core game unless training is the primary
product goal. This is the optional simulator, not the territory-capture engine.**

Current input/setup/UI, basic demonstrations and timing exist. Open work includes
Warehouse/Stadium/Container Yard demonstrations (#894/#895/#896), personal-best
ghost (#913), guided school (#905) and stick-response illustration (#907).
Further world/drone presentation, coaching, authoring and real radio/device
qualification remain. Preserve the owner's stacked dependencies and evidence.

**What players gain:** clearer learning and a richer practice/racing product.
**Without expansion:** the core Solo/Versus/Team game still works; the simulator
has a narrower learning/replay offering. **Finished means:** selected lessons or
recordings actually teach/complete, controls match the advertised input, and
results/replays remain exact. Sixty challenge definitions are not sixty polished,
human-qualified experiences. Keep hardware handling defects high priority even
if optional ghost or new-world features wait.

### 8. Make communities able to create and maintain their own editions

**Recommended priority: required fixes with current content; broader tooling later.
Maps to C6, community workflow and later C5 cohorts.**

Finish specialized editor/input/recovery gaps only when they block a real asset
or collection. Prepared-reveal reader #863 is still open. Independently try the
full fresh-workspace workflow: create → export → install → play → recover.
Document supported formats, retained references, permissions and the exact
release boundary. Community branding and any hosted service need their own
review/environment; browser authoring does not publish a public game by itself.

**What creators gain:** a repeatable process without developer intervention.
**Without it:** the existing game remains usable, but each community needs manual
help and inconsistent packages are more likely. **Finished means:** an independent
example completes that entire workflow and its recovery paths. Do not build more
panels merely because artwork review is deferred.

### 9. Expand campaigns, rewards and editions only after the first cohort works

**Recommended priority: later expansion, not a missing-engine emergency.**

Finish distinct campaign progression, optional mastery definitions and broader
DroneAid/cultural/Retro/Coupa content where the accepted inventory requires it.
New packs (#883), Random play (#898), noise-free picture preview (#908) and wider
reward/learning enrichment are discrete features, not proof core completion is
blocked. Already-prepared independent work can still be admitted safely; this
recommendation concerns new effort, not discarding finished contributions.

**What players gain:** more replay goals and community-specific experiences.
**Without expansion:** there is less breadth, but improving current missions can
still make the game substantially better. **Finished means:** each added cohort
has distinct decisions, meaningful rewards and intentional normal discovery.
Avoid filling a numerical quota with alternate backgrounds or duplicate missions.
Complete edition/theme collections also require compatible actors, terrain, HUD,
effects and retained-theme restoration; three new reveal pictures alone do not
complete the original theme-framework promise.

Keep content counts separate: current Journey has 91 Solo/Versus missions and 12
Team missions; the separate Discovery programme records 108 missions, 18 finales
and 12 assisted drills. Those counts are not additive evidence for the original
132-new-mission / 792-Solo / 36-Team acceptance targets. Reconcile exact scope and
identities before commissioning more content or claiming a numerical shortfall.

### 10. Find out whether people actually enjoy the improved game

**Recommended priority: last formal study, as already approved. Maps to C2.**

Use the existing three-mission benchmark with three newcomers and three experienced
players in two short consented rounds. Observe whether they start unaided,
understand losses and threats, try another approach and voluntarily Retry/Next.
Compare the same gameplay with optional feedback enabled/disabled. Record and act
on problems rather than treating time played as proof of enjoyment.

**What it brings:** evidence that the changes help real players, beyond attractive
screenshots and scripted completions. **Without it:** the implementation can ship
with accurately bounded evidence, but improved enjoyment/retention remains an
assumption. **Finished means:** the sessions, findings and resulting corrections
are recorded. This does not make every small browser check or fairness correction
wait for the formal study.

## What is blocked, and what can proceed

- **Current Pages is succeeding:** deployment [36917518659](https://github.com/mekhovov/revealline/actions/runs/36917518659)
  and both public metadata records identify `955c539a7`; package label remains
  v0.142.4. Latest tagged release remains v0.142.3. This review did not perform new
  public gameplay or a complete byte audit. The current Pages entry includes the
  intentional password gate from #912; sharing a testing URL also requires access.
- **Do not repeat yesterday's global blockage:** main now has rolling-publication
  capacity work. The current workflow still enforces 950,000,000 bytes. PR868's
  older 951,900,757-byte result and stale production ledger remain historical
  candidate findings, not a failed measurement of today's main. Its branch is now
  conflicting and held/outside the active fastline milestone; it needs current
  reconciliation and gates under the publisher, not an unconditional merge.
- **Validation debt persists:** the committed suite policy is waived. Old passing
  runs and individual owner receipts do not become a fresh complete-main pass.
  Build/source/asset integrity requirements still apply; no tests were run in this
  planning review.
- **Review and environment availability are different:** production-art review is
  deferred; hardware, listening and human evidence have their own uncompleted or
  deferred scopes. Independent source corrections do not need to wait for those.
- **One publisher, parallel owners:** admitted compatible fixes can ship together;
  optional content and creator work must not hold an unrelated player fix. Keep
  current stack relationships and immutable originals. This plan allocates no new
  version and does not change release policy.

Online multiplayer, Deathmatch, full Ukrainian translation, hosted administration
and persistent co-op saves remain outside the immediate approved programme.
Native desktop/iOS packaging and community hosting are separate environment and
release projects, not prerequisites for improving the browser game.

## Recommended next batches and decision choices

| Batch                                            | Recommended outcome                                                                                                                                          | Why now                                                                    | What stays outside it                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1 — dependable play                              | Finish the ready player-flow corrections, explicit loss feedback and required recovery/input/source checks. Separate incompatible old-import work if needed. | Removes friction before asking players to judge content or artwork.        | New enemy systems, bulk art and extra music.                                |
| 2 — convincing actors + a small challenge cohort | Repair the known rig/visual issues; prepare the minimal art decision; improve a few mission decisions and decide their normal visibility.                    | Addresses the user's concrete drone complaint and repetitive-play concern. | A whole-roster approval by assumption, blind promotion of every v38 change. |
| 3 — one coherent visual cohort                   | Adopt the first reviewed Ukrainian/FPV scenes with exact pins and all affected player paths.                                                                 | Demonstrates a complete repeatable result before broader communities.      | Resuming deferred production review without the user's choice.              |
| Later                                            | Broader devices/offline, community reproduction, selected simulator/content expansion, and finally C2.                                                       | Extends a solid core instead of multiplying unfinished surfaces.           | Claims of complete device/human qualification without evidence.             |

These batches are suggested groupings, not mandatory extra PRs. Small save,
input, dependency and accessibility safeguards accompany each affected feature.
The earlier effort ranges remain rough estimates, not countdowns. Do not start a
new “2–4 days” clock on every plan review. Refresh an item's estimate after its
next exact scope/dependencies are selected; no calendar ETA exists for a review
that remains deferred or hardware/participants that are unavailable.

Three useful choices for the user:

1. **Core-game-first (recommended):** dependable Solo/Versus/Team, convincing
   drones, a few better missions, then the first artwork cohort. Optional simulator
   breadth and broad creator expansion are lower priority.
2. **FPV-training-first:** prioritize radio setup, coaching, school and successful
   demonstrations; reduce near-term core campaign/art expansion. This changes the
   primary product emphasis, not merely the order of two fixes.
3. **Visual/community-showcase-first:** prioritize a small drone/scene approval and
   finished Ukrainian/community presentation; accept slower challenge expansion.
   This requires explicitly resuming the necessary narrow production review.

The recommendation is option 1. The user can also specify exceptions, such as
“core first, but finish the beginner school already in review.” Until a choice is
made, preserve A → B → C, the C2-last decision and all existing review deferrals.
