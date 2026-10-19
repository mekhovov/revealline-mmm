# Learning journeys and FPV: review and priority choices

> **Historical snapshot:** this document records the 1 October 2026 planning review. Queue, deployment, pull-request status, release, capacity and recommendation statements below are dated evidence, not current instructions or current repository status.

Reviewed **1 October 2026 (Europe/Berlin)** against main
`955c539a7` and the identified open PRs below. This is the current planning view
for the company/discovery and revised Phase 2 → 3 → 4 → 6 work. It supersedes
current-status claims in the [discovery ledger](discovery-rewards-phase-status.md)
and [historical flight ledger](polished-flight-delivery.md). Earlier evidence
remains historical evidence; this review does not rerun it.

**Decision status: proposed priorities for user review.** The user asked for an
explanation and rebalance, not implementation in this turn. Existing approvals
and deferred reviews remain in place. No new scope, release-policy change,
mandatory learning gate or deadline is approved by this document.

## 1. Recommendation in plain language

Put the next effort into **helping a new player succeed with what already exists**:
finish integrating the guided beginner experience, explain what to change after a
flight, and make improvement visible. In parallel, prepare one stable combined
build for dependable installation and release. Defer additional campaign counts
and advanced creator features until the basic player journey is convincing.

This changes the previous priority proposal: full Flight Studio completion moves
behind player learning unless creating custom courses is the user's immediate
business goal. Qualification remains necessary before claiming a supported release;
it should not become a reason to benchmark every intermediate commit.

Three alternative orders are available:

| User's immediate goal                                 | Recommended next order                                                                  | Tradeoff                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Players understand and enjoy flight practice          | R1 beginner journey → R2 useful flight advice → R3 comparison/examples; R7/R8 alongside | Best direct player benefit; advanced creator features arrive later.                   |
| Authors create and share their own learning campaigns | R1 integration → R5 authoring/portable rewards → R7/R8; then R2/R3                      | Better creator leverage, but beginners still receive less useful feedback.            |
| Ship the current feature set sooner                   | Set a narrow release selection → R7/R8; carry unfinished R2/R5 forward explicitly       | Earlier dependable distribution; do not describe the full original scope as complete. |

These are choices about product emphasis, not three separate rewrites. Existing
PRs should be reused whichever order is chosen.

## 2. What already exists

“Implemented” means code/data exist. “Observed” means a named check covered a
particular build and scenario. “Released” means those exact artifacts completed
the publication process. These statuses must not be used interchangeably.

### Arcade campaigns and rewards

| Family                       | Campaigns | Arcade missions |
| ---------------------------- | --------: | --------------: |
| Coupa                        |         5 |              30 |
| DroneAid Netherlands         |         6 |              36 |
| Historical DroneAid Portugal |         1 |               3 |
| Social Drone UA              |         2 |              12 |
| Victory Drones               |         2 |              12 |
| Ukraine: Living Culture      |         6 |              36 |
| FPV Learning                 |         8 |              48 |

The last four rows deliver the planned **18 campaigns / 108 arcade missions**.
The company campaigns are additional. The 108 mission maps and pictures are
nonidentical authored content; counts do not establish human-confirmed quality.
Their mission artwork remains marked candidate. Do not create more missions to
fill an already-completed numerical target.

The discovery catalogue has **108 first-win discoveries, 18 six-win finales and
four optional application bonuses**. Four showcase campaigns have six missions
each and **12 interactive workbenches total**, on missions 2, 4 and 6. Those
workbenches cover workshop handoffs, fair comparisons, museum object labels and
aircraft component relationships. Most other discoveries are pictures and concise
explanations, not full interactive lessons. EN/UK content and reading profiles exist.

Coupa has 24 lesson definitions across its learning campaigns. Explicit discovery
reward sidecars for older company campaigns have pilot coverage, including Spend
in Motion and Workshop Lights; universal coverage is not claimed.

Shared rules, responsive play, expedition map/list, immediate Next/Retry, brief
reduced-motion-aware reveals, Collection, exact earned reward revisions and the
existing lesson/asset/reward editors are implemented. The underlying arcade
simulation stays shared across brands. A six-win finale still requires six distinct
wins; optional learning bonuses do not silently become compulsory progression.

Sources: [edition catalogue](../game/editions/catalog.json),
[campaign content](../game/content/company-campaigns/),
[reward framework](../game/rewards/model.mjs),
[reference assets](../game/company-campaigns/curriculum-reference-assets.mjs).

### Flight practice: distinguish the three experiences

| Experience                                       | What it is for                                                                | Current implementation                                                                                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conceptual Control Lab / historical overhead gym | Understand which control affects which movement                               | Existing teaching aids; preserved separately.                                                                                                                           |
| Original first-person Academy, `civilian-fpv`    | Learn throttle, attitude, momentum, braking and routes                        | 12 drills; Self-level/manual throttle and Acro; 24 mode-specific demonstrations; verified replays; twelve-distinct-completion Notebook finale and all-Acro distinction. |
| Expanded World Studio, `fpv-worlds`              | Apply and explore skills in larger environments, playlists and custom courses | 60 challenges including the original 12; eight worlds; creator/import/export; best-route display, sector timing and checkpoint practice.                                |

The expanded World Studio is a later, separate package. Its 60 challenges are
not 60 additional arcade missions. Authored challenges are not automatically
polished, tuned or human-accepted production levels.

New work merged since the previous review includes:

- Native-style Fly lobby, world selection, playlists, Workshop and Library;
  shared fonts/art/icons, immediate result actions and mobile-sized EN/UK views.
- Guided radio setup, fullscreen HUD and control recovery across simulator views.
- Optional sound: shared menu cues and World Studio motor/ambient/action audio.
  “Add simulator sound from scratch” is no longer an open task.
- World Studio compact/expanded/setup-only stick display; Academy currently has
  compact/expanded only. The remaining hide option is a small parity issue.
- Verified personal-best line and sector comparison, with practice of the largest
  time loss or longest section. Animated ghost work is already in an open PR.
- World Studio live objective editing, undo/redo, GLB/glTF imports, portable packs,
  themes and exact revision recovery. There is no need to rebuild a creator.

Main contains **56 demonstration records**: 24 Academy plus 16 woodland and 16
courtyard. The expanded target is 120, one per challenge/mode. Warehouse, stadium
and container work is in open PRs; examples included in an integration receipt
must not be counted as merged main content. The outstanding main count is 64,
subject to rechecking those branches before assigning new work.

Sources: [World Studio status](fpv-worlds-implementation.md),
[native UI evidence](fpv-native-sim-ui-verification.json),
[sector implementation](../optional-practice/civilian-fpv/flight-sectors.mjs),
[World Studio runtime](../optional-practice/civilian-fpv/world-app.mjs).

### Radio evidence: correct the earlier blanket statement

USB-radio support exists. The [TX15 record](tx15-radio-verification.md) includes
user-confirmed physical flight, arm/disarm and reset in a source-checkout browser.
That evidence is real and should not be erased by saying all hardware is untested.
It does not qualify every model, firmware, operating system, browser or final
package. Recent native UI checks use controlled Gamepad fixtures, not new physical
hardware acceptance. Broader physical-device review remains deferred.

### Current integration and release snapshot

- Prior plan [#880](https://github.com/mekhovov/revealline/pull/880), replay/observers
  [#862](https://github.com/mekhovov/revealline/pull/862), radio work and native UI
  [#904](https://github.com/mekhovov/revealline/pull/904) are merged.
- [#905](https://github.com/mekhovov/revealline/pull/905): 14-lesson bilingual
  beginner Flight School, open at `ab6ac896917d0a6cf67c0f7ae59df298ca9ff425`.
- [#907](https://github.com/mekhovov/revealline/pull/907): live drone-response
  schematic, open at `e4c9c5db3ab4998bac4e7d715f5c737f8eef33a6`.
- [#913](https://github.com/mekhovov/revealline/pull/913): optional verified
  personal-best animated ghost, open at `9bb0a566098f0b786c648c0bcc2dbf7c62b529fd`;
  stacked on [#896](https://github.com/mekhovov/revealline/pull/896).
- Demonstration inputs [#894](https://github.com/mekhovov/revealline/pull/894),
  [#895](https://github.com/mekhovov/revealline/pull/895) and #896 are open at this
  checkpoint. Their descriptions are delivery claims, not fresh qualification here.
- Latest immutable GitHub release observed remains
  [v0.142.3](https://github.com/mekhovov/revealline/releases/tag/v0.142.3).
  Both dedicated [edition](../publishing/pages-controller/editions.json) and
  [optional-package](../publishing/pages-controller/optional-packages.json)
  promotion selectors still have empty release arrays. Rolling main, candidates,
  source merge and immutable standalone promotion remain distinct.

## 3. Remaining items explained for a product decision

Priority meanings: **P1** next player-value work; **P2** useful follow-up;
**P3** optional expansion. **Release gate** must be satisfied for the selected
publication claim. Relative effort describes scope, not a time estimate.

### R1 — Finish one understandable beginner journey

**Recommended P1; Phase 6, connected to Phases 2–4.** Integrate and review the
existing Flight School and response-overlay PRs rather than rebuilding them.
Confirm a clear route from the game to setup, first lift, pause/explanation,
retry, progress and the next lesson. Check the latest compact-menu placement;
current shared menu source puts Simulator/Practice in Settings → Extras.

**What the player gains:** an answer to “what do I do now?” and a visual link
between moving a stick and the aircraft's response. This is especially valuable
before Acro, where centred sticks do not level the aircraft.

**If deferred:** free practice still works, but newcomers must discover the
controls and learning order themselves. That can make a capable simulator feel
pointless or frustrating. Existing pending features remain unavailable in main.

**Done when:** the compiled beginner route works in EN/UK through the current
input owners; explanation pauses safely; only real practice earns completion;
ordinary retry/continue/reload preserves progress. Controlled input checks do not
claim broader physical-radio compatibility. Effort: medium integration, less than
a new teaching framework. Do not remove free access to the existing drills.

### R2 — Explain one useful thing to change after each attempt

**Recommended P1; Phase 6.** Add feedback derived from the actual flight, such as
“you reached the landing area but descended too quickly; start reducing descent
earlier.” This is an example of intended copy, not current implemented advice.
Select one evidenced observation and one next action instead of overwhelming the
player with statistics. Cover failed as well as successful attempts.

**What already works:** World Studio reports sectors and offers focused practice;
Academy has static lessons and analysis values such as height range and landing
speed. The missing layer interprets those measurements for learning.

**What the player gains:** retries have a purpose. A player can change a specific
input and see whether it helped, rather than repeating the same mistake.

**If deferred:** flight and rewards remain functional; learning depends more on
external explanations and trial and error. This is a larger learning gap than
missing decorative assets.

**Done when:** advice is recomputed from bounded recorded evidence, useful in both
modes, available on review, and honest when evidence cannot identify a cause.
Failed attempts can be analyzed without being accepted as completed reward proofs.
No physics, scoring tolerances or duplicate progress store changes. Effort: medium.

### R3 — Make improvement visible and examples complete

**Recommended P2 after R1/R2; Phase 6.** Keep the existing best-route and sector
comparison; integrate #913's optional moving ghost. Refresh demonstration coverage
from the existing branches, then fill genuine gaps for the selected worlds.
The original twelve-drill Academy already has examples in both modes.

**What the player gains:** “this was my earlier line; here is where I now turn or
brake differently,” plus a correct example when a route is hard to understand.
The ghost is a visual reference and never a collision object or power advantage.

**If deferred:** replays, static best routes and timing still support improvement.
This is valuable motivation, but it is not necessary to make the simulator work.
Missing World Studio examples make those particular challenges harder to learn;
they do not mean the original Academy is incomplete.

**Done when:** comparisons use compatible course/model/mode/response identities,
remain opt-in and release resources when hidden. Demonstrations replay through
real rules and never earn player progress. All 120 examples belong to the expanded
World Studio production target; a smaller clearly selected release may precede
that milestone. Effort: small-to-medium integration, then content work per world.

### R4 — Finish comfort, identity and selected artwork polish

**Recommended P2 for small comfort fixes; P3 for broad art expansion; Phases 2/5/6.**
Keep the delivered sound/fullscreen/interface work. Add Academy's missing setup-only
stick option if needed; check controls, board edges, focus and reduced motion on
selected layouts. Improve a few high-value reveal/home scenes and community marks
with source/rights records instead of commissioning another complete catalogue.
The four new topic/community editions currently use original presentation markers;
official logo/icon bindings are not yet present.

**What the player gains:** a cleaner screen, stronger identity and more memorable
wins. Better art can improve curiosity; it does not by itself improve understanding.

**If deferred:** current artwork, sound and controls remain available. The risk is
uneven presentation and some avoidable clutter, not missing core gameplay.

**Done when:** selected art/cues survive preview/export/import and normal play,
remain readable on small screens, respect audio/motion settings and retain exact
attribution. Do not imply endorsement or reclassify candidate art as human-approved.
Effort: small for a preference, variable for original production art.

### R5 — Let authors build complete learning/reward experiences

**Recommended P2, promoted to P1 if custom authoring is the immediate goal;
Phases 2/6.** Finish gaps in the existing Studio contracts: authored teaching cues,
explicit supported modes for new custom courses, and selected image/audio/cosmetic
reward dependencies that travel with an exported course. The older Academy reward
bundle currently accepts knowledge payloads only; a 3D editor does not close that
gap. Reuse World Studio and shared reward/media authorities.

**What an author gains:** create, preview and share a course with its explanation,
example and reward without asking for engine changes. This supports future
companies and communities more directly than adding another hardcoded campaign.

**If deferred:** built-in courses and World Studio editing still work. Rich custom
learning rewards need developer involvement or stay within the existing text-only
Academy bundle. Ordinary players do not lose existing rewards.

**Done when:** edit → preview → export/import → compiled install → ordinary win →
Collection/Notebook revisit preserves languages, exact assets, modes and promises.
Keep the original twelve courses available in both modes. JSON demonstration
import/export already exists; a visual recorder is optional convenience, not a
missing mandatory feature. Effort: medium-to-large because portability and old
saves matter as much as the editor controls.

### R6 — Deepen selected arcade learning and company rewards

**Recommended P3 until the player loop is settled; Phases 4/5.** Add meaningful
activities and later application to selected existing missions; extend older
Coupa/DroneAid reward pilots where useful. No new 108-mission quota is required.

**What the player gains:** a reveal can become something to inspect, compare or
apply, rather than only a picture with text. Older company campaigns gain more
consistent discovery rewards.

**If deferred:** all authored missions remain playable and the existing finales
work. Some content remains a light discovery experience rather than practice that
demonstrates understanding. That limitation should be stated accurately.

**Done when:** each batch of up to three missions has a useful wrong-answer
explanation, a different later fixture where appropriate, sources, EN/UK content,
and working reward/authoring transfer. Preserve optional application bonuses and
already-promised six-win finales. Effort: recurring content/design work; scope it
by audience benefit, not by making every mission multimedia.

### R7 — Check the combined build protects controls, saves and smooth play

**Release gate; continuous Phase 7.** “Qualification” means checking the exact
version players will receive after the separate changes are combined. It does not
mean building another game or repeating every check on every commit.

There are four concrete parts:

- **Complete journeys:** first launch, ordinary win, reward, Next, revisit, and
  Studio export/import. Benefit: features work together. Deferral risk: individual
  demos pass while the real player route fails.
- **Compatibility and replay:** preserve old course identities, saved rewards and
  radio profiles; verify recordings across the targeted runtimes. Benefit: updates
  do not erase work or change what a recorded win means. Deferral risk: lost or
  incorrectly accepted progress.
- **Responsiveness and cleanup:** measure frame pacing and input/UI stalls, then
  repeated scene/results/media changes. Benefit: smooth control after sustained
  play. Deferral risk: stutters or growing resource use; older small samples cannot
  qualify the larger new World Studio.
- **Install/offline/update/recovery:** check two packages coexist, interrupted
  updates keep the working version, rollback retains data, and uninstall affects
  only its own installation. Benefit: a dependable app-like experience. Deferral
  risk: a preview works online but the installed game breaks or loses progress.

Existing observations and installed-PWA evidence reduce repeated work when their
scope and bytes still match. They do not establish universal success for current
source. The native UI receipt explicitly marks release qualification false.
Effort: medium-to-large, concentrated on one selected stable candidate.

The repository currently waives automated suites: **WAIVED_SKIPPED_NOT_PASSED**.
This review runs none. Build, formatting/lint, identity, source/license inventory,
package admission and publication checks remain mandatory. Restore suites only
through the reviewed policy process; do not claim their absence as a pass.

### R8 — Deliver the selected version and verify what users actually receive

**Release gate for publication; Phase 7.** The publisher freezes a known source,
creates reproducible archives, selects what is hosted, uploads it, then checks the
actual download/site and recovery path. A PR merge is only the input to this work.

**What the player gains:** one dependable link/install/update with identifiable
version and preserved progress. **If deferred:** source and candidate previews can
be used, but the newest merged features are not necessarily in the immutable
release or dedicated standalone launcher.

Keep Academy at 8 MiB/64 files; World Studio has its separately admitted 16 MiB/96
executable/source policy. Preserve core 64 MiB/2,000 files and edition-asset 32 MiB
limits. Use the current publisher's exact complete-output capacity check, including
recent rolling-main size/access changes; do not reuse old overage guesses or raise
limits as part of this plan. Publication remains in the main repository.

**Done when:** frozen inputs, original downloaded bytes, selected dependencies,
source eligibility, installation identity and rollback match recorded evidence.
The current dedicated promotion gates also require human pacing/learning and asset
review. Keeping those reviews deferred permits technical work and previews, but
cannot produce a passed human-review receipt. Before dedicated promotion, complete
that review or obtain an explicit separate policy decision. This plan changes no
policy. Effort: release coordination plus final artifact verification.

### R9 — Human comprehension, artwork and broader physical-device review

**Deferred by the user; retained visibly, not a next implementation batch.** Watch
unfamiliar players attempt the lessons, check whether they can explain what they
learned, review pacing/art, and exercise named real radios/devices on the packaged
build. Retain the existing TX15 confirmation as narrow positive evidence.

**What this adds:** confidence that the game is understandable and comfortable,
and that a stated hardware combination works outside simulated inputs.
**If deferred:** software can continue, but learning effectiveness, medal tuning,
art approval and universal hardware compatibility remain unproven. Promotion's
explicit human-review requirements still need a later decision as described in R8.
No new physical testing is requested by this plan update.

## 4. Phase summary and proposed delivery batches

| Original phase              | Current status                                                     | Remaining items                                                     |
| --------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 0 Baseline                  | Established, refreshed here                                        | Refresh changed source and dependency inventory per selected batch. |
| 1 Rewards                   | Shared foundation implemented                                      | Preserve promises during R5/R6/R7.                                  |
| 2 Game feel/authoring       | Shared shell and native FPV redesign implemented                   | R1 integration, R4 small polish, R5 full learning-reward authoring. |
| 3 Four slices               | Implemented; six missions per showcase exceed the original three   | R7 integrated acceptance; R9 remains deferred.                      |
| 4 Finales/control lab       | Four showcases/finales, application activities and lab implemented | R7 current-build acceptance; optional R6 enrichment.                |
| 5 Expansion                 | 18 campaigns/108 missions authored                                 | R4/R6 quality/depth; no missing numerical quota.                    |
| 6 Simulator                 | Academy implemented; expanded World Studio delivered in main       | R1/R2 learning, R3 pending comparison/examples, R5 authoring gaps.  |
| 7 Qualification/publication | Partial, source-specific evidence exists                           | R7/R8; R9 boundaries reported honestly.                             |

Proposed player-first batches, awaiting reprioritization:

1. **Learn a first flight:** reuse R1 pending PRs; add R2 bounded flight advice;
   include only small R4 parity fixes. Review the complete beginner route.
2. **See improvement:** integrate R3 existing comparison/demo inputs; fill genuine
   selected-world example gaps. Finish targeted current-build compatibility and
   performance observations while content settles.
3. **Create and deepen:** R5 rich portable authoring, then selected R6 lessons/art.
   Move this batch earlier only if creator use is the immediate priority.
4. **Publish each agreed stable milestone:** R7/R8 accompany the batches; no need
   to wait for optional R6 expansion to ship a clearly scoped milestone, subject
   to the existing review/promotion policy.

Use existing owner PRs and their dependencies; do not recreate #905/#907/#913 or
rewrite their history to force an artificial single PR. Combine compatible new
work in one integration batch before freezing. Avoid appending features to a head
already under final qualification. The release owner controls merge order,
versions, publication and which frozen candidate is selected. A documentation-only
plan update does not reserve a new product version.

Later extensions remain outside the original learning delivery: broader wireless
transport qualification, aircraft-specific emulation, imported Betaflight rates,
live aircraft connections and native branded app packaging. Expanded worlds are
already implemented separately and must no longer be listed as wholly absent.
