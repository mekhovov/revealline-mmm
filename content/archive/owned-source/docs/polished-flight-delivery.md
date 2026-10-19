# Polished journeys and real-radio flight: delivery ledger

> **2026-09-30 continuation:** Phases 2–4 and the twelve-drill Phase 6 framework
> are implemented. The review-controls follow-up fixes focused-control pause,
> delivers actual 0.5× replay, and binds runtime/retention diagnostics to frozen
> artifacts. See [current batch and remaining priorities](verification/fpv-review-controls-20260930.md).
> Earlier branch, PR and evidence references below are historical, not the current
> release queue or final-head qualification. Human/device evidence remains deferred.

This supersedes claims that the assisted overhead gym completes the immersive
flight-simulator phase. The historical `civilian-flight` / `assisted-gym.v1` stays
unchanged. New first-person flight belongs to the separate `civilian-fpv` package.

For the current source status and remaining release work, see the
[30 September FPV offline continuation](verification/fpv-offline-navigation-20260930.md).
The older PR/queue references below are retained delivery history. PR #822 has
merged; this continuation starts from refreshed main and uses a new bounded input.

## Order and compatibility

Deliver Phase 2 → 3 → 4 → 6, with qualification in every batch, through integration
PR #758 while open. The branch integrates main `321408a3c` (v0.142.4 mission-selector and star-progress changes),
preserving both immutable source lineages in merge ancestry. Controller fixes from
PRs #775/#778 and the production-provenance continuation from #785 remain included. It is a scheduled input to **v0.150.0 — Unified native
experience**, alongside #783; it is not a second promoted release root.
Keep 18 campaigns, 108 arcade missions, English/Ukrainian, shared arcade simulation,
and every already-published reward promise. Human learning, artwork and physical
radio testing remain explicitly deferred. Passing synthetic inputs is not hardware
qualification. Release coordination owns versions and production promotion.

| Batch          | Deliverable                                                                        | Current integration state                                          |
| -------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A / 2          | Shared screen polish, practice discovery, guided lesson and atlas editing          | Implemented                                                        |
| B / 3          | First three polished missions in each of four existing showcase campaigns          | Implemented                                                        |
| C / 4          | Six missions per showcase, different application fixtures, control lab             | Implemented                                                        |
| D / 6          | USB-radio diagnostics, arbitrary channels, calibration, separate response profiles | Implemented; physical devices unverified                           |
| E / 6          | First-person model, Self-level/manual throttle and Acro, representative drills     | Implemented; portable numeric fixtures pass                        |
| F / 6          | Twelve drills, typed practice rewards, notebook and studio round trips             | Implemented                                                        |
| Continuous / 7 | Reproducible archives, portable proofs, lifecycle/performance, admission           | In progress; final integration, performance and publication remain |

## Acceptance contracts

- Every UI path retains immediate Next/Retry, uncropped board edges, neutral input
  while reading, visible focus and reduced-motion equivalence. Presentation cannot
  change simulation or accepted replay results.
- The four showcases are Community Connections, Ideas into Understanding, Threads
  Across Ukraine and Meet the Aircraft. Each has an explained example, a bounded
  attempt with corrective feedback, and later application to a different fixture.
  The six-win finales remain unchanged; application bonuses are separate.
- Guided Studio edits must preview, export/import, compile, play and reopen in
  Collection. Preview sessions never earn. Preserve exact sources/media revisions.
- USB-radio profiles separate stick diagrams (Modes 1–4), channel calibration and
  flight-response curves. Accept standard/unmapped devices, reordered/reversed axes,
  full-travel throttle and optional latched switches. One movement source owns input.
  Disconnect/replacement/blur/profile change freezes, clears live input and requires
  explicit recovery; airborne recovery requires control pickup, never automatic arm.
- The new model uses deterministic bounded integer state, fixed steps, stable
  collision order, directional swept gate tests and consecutive holds. Centered Acro
  stops commanded rotation without levelling or cancelling momentum. Self-level
  levels attitude while throttle and momentum remain meaningful.
- Twelve distinct verified drills in either allowed mode unlock the main notebook;
  all twelve in Acro unlock a separate distinction. No invented arcade wins. Attempts
  pin model, course, mode and response identities; imports reverify bounded transcripts.
- Node, Chromium, Firefox and WebKit must match before portable proofs are admitted.
  Twenty scene/retry cycles and context loss must release resources and freeze safely.
- Preserve 8 MiB/64-file optional runtime **and source** limits, core 64 MiB/2,000
  files, edition assets 32 MiB and the existing hosted cap. Admit only selected
  Three.js 0.186.1 files and MIT licence. Historical package policies remain intact.

## Research used

The user-approved design follows [IES worked-example/application guidance](https://ies.ed.gov/ncee/wwc/PracticeGuide/1),
[PhET constrained exploration](https://phet.colorado.edu/publications/prst-per-2010.pdf),
[EdgeTX joystick mapping](https://manual.edgetx.org/edgetx-how-to/joystick-mapping-information-for-game-developers),
[EdgeTX independent stick mode/channel order](https://manual.edgetx.org/color-radios/radio-settings/radio-settings),
[VelociDrone replay/coaching examples](https://www.velocidrone.com/downloads/VelociDroneManual.pdf),
and [deterministic mathematics considerations](https://rapier.rs/docs/user_guides/javascript/determinism/).
These inform implementation; they do not prove learning effectiveness or real-flight transfer.

## Implemented in the integration branch

- **A / Phase 2:** Shared Home/Controller Lab practice discovery and explicit
  loopback-only testing links; guided Company lesson and atlas editing, missing
  sidecar creation, wrong/correct/resume previews. The existing 800 ms reveal and
  immediate Next/Retry remain unchanged. The arcade core has no diff.
- **B/C / Phases 3–4:** All 24 existing showcase missions have bilingual learning
  progression. Ten additional bounded lessons, two optional community application
  bonuses and the Met's cleared second textile object are added. Four exact
  pre-update presentations retain old promises; existing six-win finales and the
  two older application bonuses remain intact. The complete catalogue stays at
  108 missions. Ukraine's selected assets remain under 22 MB and the 32 MiB cap.
- **D / Phase 6:** Explicit USB-device selection, raw channels, guided measured
  calibration, independent Modes 1–4 diagrams, full-travel throttle, optional
  switches, response curves and validated profile transfer. Failure/disconnection
  freezes input; fresh arm transitions and airborne control pickup are enforced.
- **E / Phase 6:** Separate Three.js first-person gym/field, integer quaternion
  flight model, manual-throttle Self-level/Acro, cameras, stick display, 24 verified
  teaching examples, slow review and readable failure/capability recovery.
- **F / Phase 6:** Twelve ordered drills, exact practice transcripts, shared v2
  reward definitions/receipts, twelve-distinct finale and separate all-Acro
  distinction, persistent notebook, cosmetic presentation and course Studio.
  Demonstration, authoring and replay sessions cannot earn. Custom course imports
  preserve reward metadata and require new revisions for changed requirements.
  Long proof verification yields in batches of at most 200 simulation ticks.
  Imports can be cancelled, including during storage hydration; explicit cancellation
  or notebook disposal prevents late writes or playback. Hiding the dialog alone
  does not dispose its notebook. Immediate Retry preserves the completed attempt while
  its single cooperative notebook admission finishes.
- **Continuous / Phase 7:** Trusted new-package policy, selected pinned upstream
  renderer/licence, historical gym compatibility, full runtime/source caps and CI
  selection of both optional packages. Production selection is unchanged.

### Evidence and remaining qualification

The [portable numeric fixture receipt](verification/evidence/fpv-portability-2026-09-28.json)
compares 24 demonstrations and two 3,000-tick stress sequences with intermediate
state checkpoints in Node, Chromium, Firefox and WebKit. Source hashes identify
exact tested modules. That receipt is not physical-radio or learning evidence.

The [compiled runtime observation](verification/evidence/fpv-runtime-2026-09-28.json)
binds every runtime file and the observation harness. Twenty drill/reset cycles
return to the same registered geometry/material/texture and renderer counts.
Four desktop/tablet/phone layouts remain inside horizontal and vertical viewport
bounds. A live WebGL context loss freezes an active attempt. Application-owned
resources are disposed and the GL context is lost; Three's remaining shared lookup
texture accounting entry is recorded, not concealed or claimed as a measured leak.
The final eight-second headless final-circuit observation records p95 frame interval
16.7 ms, maximum 116.7 ms and no observed long-task entries. The isolated long frame
is retained in the receipt; p95 alone does not establish stall-free play. This is a
scoped development-machine observation, not a matched arcade regression benchmark
or a full retained-memory qualification.

Focused suites cover reward compatibility, 11/12 locking, corrupt/foreign proofs,
failed saves, calibration inversion and replacement, background input, Studio
round trips, boundary mathematics and independent optional-package admission.
The initial priority-batch company run passes **919/919** checks and the complete optional
practice cohort passes **144/144**, with no skips or cancellations. The earlier
company run exposed an obsolete positional lesson fixture; it now selects the
unchanged lesson explicitly. Changed-file formatting/lint and English/Ukrainian
localization validation pass. The content generator verifies 186 exports; source
eligibility checks include 294 admitted assets.

The [local package admission receipt](verification/evidence/fpv-package-integration-2026-09-28.json)
records two byte-identical builds and complete runtime/source inventories. The new
package has **50 runtime files / 2,747,250 bytes**, with **52 source files / 2,761,642
bytes**. The old gym retains its exact pre-parameterization archive hash. This
integration exercise uses explicitly synthetic commit/tree bindings and is
non-promotable; frozen current-commit admission remains required.

### Follow-up qualification and fixes

The `c1a62377a` [candidate receipt](verification/evidence/discovery-2026-09-28-candidate-c1a62377a.json)
confirms eighteen double-built editions, both frozen optional packages, exact
downloaded artifact hashes, original-member admission and committed-input checks.
All candidate jobs passed. The separate hosted job tests the Community service;
it is not evidence of optional-PWA publication. Pages is held because PR #758 has
no immutable release slot; the product build is skipped by that release gate.

The [installation observation](verification/evidence/optional-installation-c1a62377a.json)
installs both Chrome PWAs, explicitly opens standalone launcher windows, prepares
and reopens both games offline, rejects a truncated dependency, and preserves a
verified proof when restoring a previous pointer or uninstalling the other app.
Seven state transitions pass, and both temporary apps/profile are cleaned up.
These are exact frozen candidate bytes on one isolated Chrome environment. The
rollback fixtures use the same payload at alternate local version paths, so they
do not qualify a real historical-model migration. [Method and limits](optional-installation-observer.md).

The full guided Studio → source/media export/import → compilation → ordinary
keyboard win → wrong/correct activity → Collection regression exposed two defects.
Collection now resolves a lesson using the actual composite Journey mission ID
and exact gameplay binding. Optional activities are also available directly from
the initial winning result when its earned picture is displayed. Neither fix
changes arcade simulation, result navigation or earning authority.

The [retention diagnostic](verification/evidence/fpv-retention-2026-09-28.json)
found that course-button handlers retained the flight scene after disposal. Those
handlers are now cleared, including after language changes. Two consecutive
twenty-cycle intervals keep the measured DOM/listener and named object cohorts
stable; the second interval's total shallow heap change is negative. After disposal,
the scene, renderer, application frame/paint closures and owned CanvasTextures no
longer appear in the captured heap. Library scratch/prototype objects remain
explicitly recorded. This forced-GC diagnostic does not measure exclusive retained
memory, native allocations, GPU bytes or natural frame pacing.

The follow-up regression run passes **921/921 company checks**, **145/145 optional
practice checks**, and **5/5 heap-analyzer checks**. The analyzer checks are now part
of the regular practice CI command. Formatting/lint and unchanged generated content
validation pass; public source eligibility includes 294 admitted assets. The
arcade core and historical gym source have no changes in this follow-up.

### Final input guard and capacity follow-up

The clean `d22621010` optional packages were built twice and independently admitted.
The downloaded CI artifact's twelve files match the local bundle byte for byte;
the same seven installation/recovery checks pass on those frozen bytes. FPV's
runtime is **50 files / 2,747,465 bytes**, and its complete source is **52 files /
2,761,859 bytes**, before the subsequent input-guard fix below.

The [default-capacity observation](verification/evidence/default-capacity-d22621010.json)
records **799,088,673 bytes** for the prepared default payload, including its
manifest. With both optional runtimes and stable launcher originals, the known
lower bound is **802,052,737 bytes**. This leaves **147,947,263 bytes** below the
950 MB hosting cap before company editions, generated pointers/hubs, root metadata
and retained versions. This is one preparation, not a frozen default archive,
whole-site admission or permission to raise a cap. Sparse inputs and producers were
restored from their exact committed blobs; historical dirty work was untouched.

The completed `d22621010` candidate CI passes for all eighteen editions and both
optional packages. The [verified capacity packet](verification/evidence/company-capacity-d22621010.json)
puts the same-source known lower bound at **924,295,263 bytes** for the default,
optional packages and four new editions; **1,049,938,753 bytes** with Coupa All and
DroneAid NL Community added; or **1,375,885,332 bytes** for all eighteen editions.
The latter two already exceed the unchanged cap. Four editions leave only
**25,704,737 bytes** before the omitted components. Larger selections require
separate configured targets or download-only packages; complete hosted admission
and release selection are still required.

Live-input fault injection reproduced a queued-animation edge case: after a
300 ms main-thread block, an old rAF timestamp could admit one ordinary simulation
tick before the next callback paused. The guard now checks the actual monotonic
callback-execution gap as well as animation timestamps. It resets both clocks at
the existing ownership, resume and reset boundaries. Flight-model mathematics,
accepted transcript rules and renderer timing remain unchanged. A regression
covers both modes and keyboard/radio ownership, no extra recorded step, neutral
keyboard resume and radio control pickup. The complete practice suite passes
**151/151** checks with no skips; the earlier **921/921** company result covers
unchanged arcade/edition code.

The [input observation](verification/evidence/fpv-input-2026-09-29.json) retains the
initial failed assertion, the confirmed stale-callback traces and the corrected
four-case run. Both 300 ms fault placements now add zero simulation/recorded steps
in both modes and input owners, with explicit recovery preserved. The corrected
natural windows report p95 callback intervals of 16.7–16.8 ms, maximum 83.4 ms and
no observed long-task entries; the earlier 250 ms sample is also retained. These
are first-person field rendering with active ground-yaw inputs, not airborne
navigation. The synthetic radio is a Gamepad API fixture, and input timing is a
model-observation proxy, not USB or input-to-photon latency. The evidence pins
exact fixed runtime bytes from a dirty worktree; it is not frozen-release,
physical-device or matched 5% regression qualification.

At that checkpoint, publication work still included fresh candidates for follow-up code changes,
complete same-source hosted-target capacity/admission, production promotion and
real version/public rollback. Desktop frame-pacing/input-stall benchmarking and
broader memory/device qualification remain distinct from the bounded observations.
Human comprehension, pacing, artwork and physical-radio/device evidence stays
**deferred and unverified**. The proposed macOS/Windows browser/device matrix is a
qualification target, not a list of proven compatible transmitters.

### Rebase and candidate recovery batch

All 31 integration commits were rebased onto main `a5859df784314556072f9215f9b293962e4f2ea4`
without changing the historical dirty checkout. Studio conflict resolution retains
main's spatial-review tools alongside the discovery editor and preserves both
English/Ukrainian translation sets. The generated locale catalogue matches its
merged sources. The shared arcade core has no diff from main. On clean rebased
`9105025316c21bfe749ea8617dbb2220fd2b5530`, all **921 company checks** and
**151 practice checks** pass, with no skips or failures. All seven source hashes
in the earlier four-runtime numeric fixture receipt still match.

The earlier `308745195` candidate CI completed successfully for all eighteen
editions and both optional packages. That result stays bound to its original
source. The rebased optional packages were frozen twice and admitted independently:
FPV remains **50 runtime files / 2,748,040 bytes**, with **52 source files /
2,762,434 bytes**. The old gym remains **29 runtime files / 178,540 bytes**.
Neither package exceeds its existing 8 MiB/64-file limits.

The [clean rebased default inspection](verification/evidence/default-capacity-910502531.json)
found a new publication blocker: prepared
content is **800,592,677 bytes**, which exceeds the unchanged **800,000,000-byte**
archive-content ceiling by **592,677 bytes**. Including its **402,023-byte** manifest,
the payload is **800,994,700 bytes**. Preparation alone is not archive admission.
This is one source-verified inspection, not two reproducible default archives or
a whole hosted-site qualification. Earlier capacity totals remain historical and
must not be combined with the new candidate as though they were one source.

The author guides now describe the delivered simulator, four application bonuses,
existing no-loss mastery predicate, actual JSON/file transfer routes and separate
course/reward revisions. Custom course preview, practice proof import and reward
schema support do not grant publication admission or fabricate arcade progress.

The installation observer now accepts an independently admitted previous frozen
bundle and requires different versions, commits, trees and archive hashes. It
stages each candidate's exact launcher, pins both sources even in failed reports,
and requires two genuinely standalone launcher windows. The
[distinct-candidate observation](verification/evidence/optional-installation-910502531.json)
passes seven transitions from `d22621010` / v0.142.1 to `910502531` / v0.142.2:
offline coexistence, update, rejected truncated download, rollback, and removal
of the other package. Exported flight proofs and separately stored radio/response
profiles remain byte-identical. The mapping is explicitly synthetic and unverified.
The changed files are `app.mjs`, the worker and package manifest; this tests a real
candidate code update, not an arbitrary model/schema migration or public rollback.

A minimal packaging fix emits only generated `offline-inventory.json` as compact
JSON. It preserves the inventory data, every asset and historical record, source
string whitespace and normal manifest hashing. The **39 focused build/offline
publication/inspector checks pass**, including complete parsed-inventory equivalence
and original-byte preservation. Formatting, lint and independent review pass.
The next clean-source inspection must measure the reduction before this closes
the archive-size blocker.

The [matched arcade observation](verification/evidence/arcade-performance-2026-09-29.json)
compares the exact `1106ec0ac` FPV edition with frozen `910502531` on the same
machine and browser. Two unprofiled pairs run in opposite order. All four
play/results comparisons meet the scoped 5% p95 target with **0% measured change**:
active play is **16.7 ms**, and corresponding results are **16.7 or 16.8 ms**.
The candidate's **50 ms** maximum result frame remains in the report. An unpaired
valid sample and harness setup/route failures are retained, not selected away.
Twenty ordinary earned-result/viewer cycles per build retain stable connected
DOM/media counts within that build; the richer candidate starts with more nodes.
These are neither detached-retainer nor decoded-media memory measurements.

The separate first-win traces do **not** close the 50 ms reward-work target.
Baseline/current callbacks take **70.131 / 71.348 ms**, mostly inside Phaser's
animation callback containing gameplay and result work. Timeline-only traces
cannot assign exclusive reward cost. Unprofiled results also retain page-wide
long tasks. Further attribution is required; this batch does not waive that gate
or infer performance across all editions, devices or input hardware.

The legacy three-argument installation observer also passes all seven transitions
with its narrower same-payload fixtures. The new observer rejects equal candidate
versions before loading browser automation. Generated company content verifies
**186 exports**, and source eligibility verifies **294 admitted assets**.

### Complete archive sizing follow-up

The [clean `440cdb749` inspection](verification/evidence/default-capacity-440cdb749.json)
measures an exact **1,055,508-byte** reduction from inventory compaction. All
**2,177 manifest paths** remain; **2,153 files** are byte-identical and the other
24 are generated catalogue/cache/worker, build information and HTML build-ID
injections. Content falls to **799,537,169 bytes**, plus a **402,023-byte** manifest.
However, the existing STORE ZIP writer adds **378,300 bytes** of exact name/header
overhead, projecting an **800,317,492-byte** archive: still **317,492 bytes** over
the unchanged archive gate. No large ZIP or public qualification was produced.

The follow-up compacts generated `offline-content.json` at both initial emission
and final refresh. It retains the same catalogue builder, finalizer, schema,
records, strings, revisions and download dependencies. The extended real-build
regression compares against the existing catalogue authority, resolves every group
through the runtime download reader, and checks exact catalogue hashes in the
outer manifest and offline cache. All **39 focused checks**, formatting and lint
pass. The final clean-source inspection must establish complete archive headroom;
passing the manifest-content bound alone is insufficient.

Both `440cdb749` candidate CI jobs pass, including all eighteen double-built
editions and both optional packages. The downloaded optional artifact's GitHub
digest and all twelve original members independently match the local double-built
pair, with normal admission passing. These results remain pinned to that source.
The independently checked [small capacity packet](verification/evidence/company-capacity-440cdb749.json)
puts the same-source default, optional packages and four new editions at a known
**925,227,325-byte** hosted lower bound. Six editions exceed the 950 MB cap before
remaining hosting overhead; all eighteen reach **1,377,100,782 bytes**. Four still
need complete target admission, including root metadata, hubs and retained releases.
No large archive download, deployment change or cap increase is implied.

### Results and save-validation follow-up

The [CPU diagnostic](verification/evidence/arcade-cpu-attribution-2026-09-29.json)
attributes avoidable work to repeated campaign geometry normalization and repeated
UTF-8 encoding during stored reward validation. These sampled stacks explain where
to optimize; their estimated contributions are not exclusive wall-clock costs.
The original profiled long tasks remain in the evidence.

Saved-flight lookup now resolves an already-owned compiled campaign directly.
Dynamic routes still receive fresh identity validation, and catalogue deduplication
retains its first-entry semantics without repeated nested geometry traversal.
The real-host regression observes **80 authored map reads before and zero after**
across twenty pause/continue cycles, with identical restored checkpoints and image
pins. A separate dynamic-route test checks changed revisions and exact recovery.

JSON validation reuses encoded lengths of repeated short strings within one call,
bounded to 512 entries. It still validates every external graph, descriptor, byte
budget, cycle and prototype. It never trusts a previous object's identity or a
caller-supplied freeze. All **73 focused parser/reward/store/practice checks** pass,
including Unicode and exact byte-boundary cases. These checks now join regular
company and practice CI through the parser test file.

The [updated portable fixture observation](verification/evidence/fpv-portability-wrapper-2026-09-29.json)
includes the changed parser among eight exact source pins. All **26 unchanged
fixtures** agree across Node, Chrome, Firefox and WebKit, including intermediate
checkpoints and the two 3,000-tick sequences. Served bytes match Node before and
after the run. This is source-pinned working-tree numeric evidence; frozen-artifact,
performance and physical-radio qualification remain separate.

The reusable `scripts/observe-discovery-runtime.mjs` accepts an explicit Playwright
module, bounded plan and new output directory. It verifies original edition ZIP
members, manifest/source bindings and the reviewed Frame 01 gameplay identity,
then uses ordinary keyboard/UI actions. Twenty result/viewer cycles are optional;
unprofiled timings and CPU/timeline diagnostics are separate modes. Failures and
exact instrumentation bytes are retained. The server uses minimal no-store/nosniff
headers; this observation does not claim production cache/CSP equivalence. Its seven
source/server checks and seventeen existing observer checks pass, and the new test
joins company CI. Success is finalized only after owned observer, browser and
server cleanup; cleanup failures and any original measurement error remain recorded.

The follow-up practice suite passes **165 checks**. The broad company run records
**935 passes and three timeout cancellations** during concurrent local work; all
three affected cases pass in a subsequent isolated four-check cohort without
changing their assertions or timeout bounds. The initial report is retained rather
than relabelled as a clean full-suite run. Compatibility review also corrects old
host-test session-format literals and waits for actual asynchronous startup.
All 22 picture-host checks pass; fixture-owned JSON download leases are explicitly
retired at teardown, with the two export cases rerun successfully. This cleanup
does not change production download lifetime or gameplay.

### Frozen performance batch `83706c992`

Both candidate CI jobs pass at `83706c9924e3972b106966a9bfffe542d1fde5e3`, including
all eighteen reproducible editions and both optional packages. The
[downloaded optional archive](verification/evidence/optional-package-download-83706c992.json)
matches all twelve original local bundle members and passes ordinary admission.
FPV remains **50 runtime files / 2,748,526 bytes** and **52 source files /
2,762,920 bytes**, below the unchanged optional-package limits.

The [default sizing receipt](verification/evidence/default-capacity-83706c992.json)
preserves all **2,177 paths** and verifies source hashes before and after preparation.
Content is **797,852,718 bytes**; including the manifest and the existing STORE ZIP
writer's exact headers/names projects **798,633,041 bytes**, leaving **1,366,959
bytes** below the unchanged 800 MB archive limit. Compared with `440cdb749`,
2,151 files are byte-identical; catalogue compaction saves 1,685,754 bytes and the
app/parser changes add 1,303 bytes. This is exact candidate sizing, not a produced
default ZIP hash, independent extraction or merged-main publication qualification.

The [fresh installation observation](verification/evidence/optional-installation-83706c992.json)
passes all seven transitions from frozen `d226` v0.142.1 to `83706c992` v0.142.2.
Two actual Chrome standalone apps preserve verified proof and synthetic controller
profile exports through update, failed download, offline rollback and removal of
the other app. The owned apps, profile and server are cleaned up. Physical radio
operation and arbitrary model migrations remain unverified.

Before timing, a browser import preflight identified a missing passive observer
dependency in the new measurement server. The corrected tool serves and hashes
the complete two-module instrumentation closure, rejects collisions with player
files, and serves no unrelated repository files. The new HTTP-closure regression
and existing observer tests pass (**25 checks**), and an isolated Chrome import
passes with no errors. Frozen game files remain unchanged; the measurement-tool
hash is recorded separately from the observed artifact source.

Current publication follows the main-repository-only policy in
[the release train](release-train.md): admit selected content on main Pages and
keep omitted editions as original GitHub Release downloads. Do not allocate new
archive repositories or raise the 950 MB cap. Candidate observations do not replace
merged-main source qualification, complete hosted admission or deployed-byte checks.

The independently checked [current CI packet](verification/evidence/company-capacity-83706c992.json)
records **945 company checks and 165 practice checks passing**, with no failures,
cancellations or skips. The selected FPV edition descriptors match the local frozen
build. Same-source default, optional packages and four new editions have a hosted
lower bound of **923,549,058 bytes**; six editions already exceed the cap. Remaining
root/hub/pointer and retained-output costs still require complete admission.

The [new matched browser observation](verification/evidence/arcade-performance-83706c992.json)
uses original `1106ec0ac` and frozen `83706c992` in opposite-order pairs. All four
comparisons meet the scoped 5% p95 target: active/results changes are **+0.60% /
−0.60%** for pair A and **0% / 0%** for pair B. Both twenty-cycle viewer observations
complete. Candidate A retains a **60 ms** page task and **66.7 ms** maximum frame;
candidate B records no page-wide long task. No sample is discarded. Resource timing
snapshots stop at the browser's 250-entry buffer and are explicitly incomplete;
they do not establish cold-start requests or production-cache behavior.

The separate diagnostic has an inclusive **64.939 ms** first-win task, including
a **59.507 ms** Phaser callback. Sample support identifies overlapping reward,
state-composition and mission-selector normalization work; it is not exclusive
wall-clock attribution. No asynchronous save task exceeds 50 ms in this trace,
but the exclusive reward-work gate remains unverified. Across separate forced-GC
checkpoints after 0/20/40 viewer cycles, renderer document/node/listener counts
remain **2 / 12,809 / 998**. Heap increases by **623,716 bytes**, so whole-heap
stability is not claimed. Native/decoder/GPU memory and all-edition behavior remain
outside this observation. All owned browser and server resources were closed.

### Selector follow-up

The first-win trace also showed the mission selector deriving the base campaign's
identity again from raw geometry. It now uses the adopted execution catalogue's
existing base identity; dynamic active routes still receive fresh validation.
No completion, unlock, difficulty or gameplay rule changes. The actual-host
regression observes one raw geometry reread before this change and zero after a
win, Gentle mission selection and English/Ukrainian label changes. Two targeted
host checks and six exact-thumbnail checks pass, with independent review and
changed-file lint/format checks. A new frozen observation is required before
attributing a frame-time or long-task improvement to this follow-up.

### Frozen selector batch `c807542ef`

The [combined candidate receipt](verification/evidence/candidate-admission-c807542ef.json)
binds the selected FPV edition and both optional packages to exact source
`c807542ef4840ce739beb7af86424488f7508772` and tree
`6be6aa62a151a6d32638f46f8fa08aad1b9cbaaf`. Each is built twice with identical
outputs and admitted from its original archive members. The FPV edition ZIP is
**33,282,781 bytes**. Compared with `83706c992`, 682 listed runtime files are
identical; only `game/app.mjs` and four generated build/cache metadata files differ.
No paths are added or removed. Optional FPV remains **50 runtime files /
2,748,526 bytes**; the historical gym remains **29 files / 179,026 bytes**.
This selected candidate check does not repeat default or complete-site admission.

The [completed CI observation](verification/evidence/candidate-ci-c807542ef.json)
records **947 company checks and 165 practice checks passing** at this exact source,
with no failures, cancellations or skips. All eighteen company editions and both
optional packages pass reproducible candidate compilation and original-member
checks. The raw job log is retained with its hash; these are candidate checks, not
merged-main source qualification or public deployment.

The priority-plan audit finds no new unimplemented Phase 2–4 or 6 feature. Its
test scope remains precise: the full Studio-to-Collection host regression uses
one reusable synthetic edition. The four real showcases separately validate 24
bilingual learning beats, 12 lessons, retained promises and maps. These checks do
not establish native-browser/controller/touch walkthroughs of all four editions.
Course Studio's previews cannot earn, and custom-course publication still requires
registered sources, demonstrations and package admission.

The [selector follow-up observation](verification/evidence/arcade-selector-c807542ef.json)
retains three ordinary arcade attempts: an enemy caught the first route, and the
other two won. The successful timeline's largest task is **41.539 ms**; the separate
CPU diagnostic's first-win task is **49.061 ms**. An earlier **190.296 ms** task
overlapping the measurement boundary remains recorded; it has no sampled reward
ancestry. Seven selector samples have no campaign-key normalization beneath them.
These scoped observations support the narrow optimization, without establishing a
new matched 5% result or a universal exclusive reward-work limit. Separate closed
viewer checkpoints at 0/20/40 cycles each retain seven main-realm image instances.
Blob/data indirection prevents exact asset attribution; whole-heap/native/GPU
stability is not inferred. Failed routes and the corrected header-proxy preflight
are preserved alongside the accepted observations.

The [frozen simulator first-completion observation](verification/evidence/fpv-first-completion-c807542ef.json)
adds the previously missing airborne path: a bounded adaptive driver uses trusted
keyboard events and read-only state observations to complete Lift and land on its
first attempt. All fifty original package members match their served hashes under
production-style headers. Ordinary Notebook verification and saving accept the
practice proof; its exported bytes remain identical after reload. Next opens drill
2 disarmed. Retry is visibly enabled, but this observation does not click it.

Across 578 active-flight intervals, p95 and maximum are **16.8 ms**. The complete
window keeps a **266.7 ms** gap after the accepted save and before the Notebook
click; its cause is unestablished. The maximum recorded timeline slice is
**22.120 ms** for Next, and the Notebook click takes **4.088 ms**. No Long Task
entries are observed, but the trace omits top-level RunTask/CPU/GPU categories, so
this is not whole-task attribution. Screenshots, reload and cleanup occur after
measurement. All owned resources are closed. This is automated software evidence,
not a human or physical-radio test.

### Remaining release work

1. Preserve #758 as one scheduled v0.150.0 input while release coordination owns
   promotion. Reconcile its overlapping shell, Journey, localization, Studio and
   compiler changes with #783 once, preserving current Confirm ownership. The
   selector release and already reserved v0.143.0–v0.149.0 releases precede this
   milestone. Assignment does not grant artifact admission or advance a version.
2. Qualify the exact merged-main source, produce and independently inspect the full
   default archive, and admit the complete selected hosting graph under its cap.
   Candidate projections and selected-package checks do not substitute for this.
   The branch's audio/UI review is closed by scoped continuations through
   canonical production102 and exact retained preview101–103 below. Recheck final integrated fingerprints and
   append reviewed successors if integration changes those inputs; unchanged
   asset payloads alone never approve different runtime behavior.
3. Complete final-source performance/request and retained-resource review, retaining
   the unexplained post-completion frame gap and unverified broader ownership claims.
   The three additional showcase journeys now have real ordinary-win, bilingual
   discovery/Collection and narrow-layout observations below. Social and Victory
   complete cleanup. Ukraine now completes the frozen Firefox walkthrough and all
   owned cleanup below; its earlier Chrome timeout remains failed. Chrome lifecycle,
   matched performance and retained-resource qualification still need their own
   evidence; connected-node counts are not a substitute. Later application and
   six-win finales are outside these browser walkthroughs.
4. Publish original qualified artifacts through the configured main repository,
   verify downloaded and public bytes, and exercise the real published rollback.
   Omitted editions remain explicit original GitHub Release downloads.

Human learning, artwork and physical-radio/device evidence remains explicitly
deferred. It is not replaced by automated completion counts or synthetic controls.

### Request and publication boundaries

The [additional untimed request audit](verification/evidence/edition-request-audit-c807542ef.json)
records 551 requests and no failed admitted runtime member. Its two 404s are a
browser favicon request and the shared Library's omitted example-pack index.
The older preflight's two unidentified errors remain unidentified. The new check
also records a blocked optional soundtrack catalogue: applying public self-only
CSP on loopback differs from the existing preview policy for that origin. Its
overall result remains failed; this does not establish a deployed-CSP defect or
authorize relaxing the production policy.

The example-index request is an actionable edition-boundary defect. Library now
accepts an explicit example catalogue, and an edition supplies its already scoped
catalogue. Default play keeps its original fetch and example-install path. Two
actual-host regressions cover the empty edition and a successful default example
installation. No extra catalogue asset, import permission, brand branch or security
policy change is introduced.

Publication admission has a separate 950,000,000-byte **additive release** cap.
At exact `83706c992`, all eighteen edition originals total **1,144,220,158 bytes**.
Both optional packages and their envelopes bring the known lower bound to
**1,150,183,839 bytes**, before approved reviews and their referenced evidence.
Choosing fewer hosted editions cannot reduce the publisher's full-envelope reads.
All eighteen must therefore not be offered as one upload batch under current policy.

A compatible proposed first publication contains the four new learning editions,
`coupa-all` and `droneaid-nl-community`, plus both optional packages. That historical
source's originals and canonical subset envelopes total **501,633,944 bytes** before
review/evidence. Hosting is selected independently; all six plus default already
exceed the hosted cap. The other twelve editions need a later coordinator-owned
publication batch. Every batch requires its own exact envelope review and complete
budget check; these historical totals allocate no version and qualify no future
artifact. The feature changes remain combined in the existing integration PR.

Use the existing `bundle-editions --editions` command for each selected cohort;
it produces a complete selected envelope and fresh reproducibility receipts.
Filtering the all-eighteen metadata packet is planning only. Each immutable release
has one `editions.json`, so the six- and twelve-edition cohorts require separate
coordinator-owned releases, not two replacements of that asset in one release.
Include actual review and evidence descriptors in the preflight before upload;
unproduced evidence bytes remain unknown rather than counting as zero.

The edition and optional-package upload paths now share a metadata-only preflight
against the same additive cap. It counts the unique union of existing draft assets
and all proposed originals, envelopes, reviews and evidence; matching shared files
count once. Conflicting pins, additive/core-name collisions and mixed source
contracts fail before uploading. Both paths recheck refreshed inventories through
completion. Original-byte and review admission still run separately and retain
their authority; passing this budget check does not qualify a release.

All **118 focused publishing checks** pass, including exact-cap/one-byte-over,
deduplication/conflict, companion-envelope and no-upload-on-overflow cases. The
initial three new CLI fixture failures came from mock newline escaping; corrected
fixtures and the retained earlier log are distinguished from the clean final run.
Independent review, formatting and lint pass. The combined Library/selector/
thumbnail cohort passes **9 checks** after the edition request fix. Final-source
candidate CI follows the combined commit; no version, selector or release changed.

### Repeatable qualification batch and production-provenance rebase

The [completed `64b5a6c42` CI/capacity receipt](verification/evidence/candidate-ci-capacity-64b5a6c42.json)
records **952 company checks and 167 practice checks passing**, plus the separate
bounded publishing/authoring cohorts. All eighteen editions and both optional
packages passed candidate compilation and original-member checks. The small
capacity packet's GitHub digest and all 22 metadata members were verified locally;
omitted edition archive bodies were not downloaded. These results remain bound to
`64b5a6c42`, not the later rebase or observation-tool commits.

Planning from the exact `64b5a6c42` packet puts the six-edition publication at **501,860,432 bytes**,
the other twelve at **654,948,170 bytes**, and all eighteen at **1,150,863,303 bytes**,
including the exact optional originals/envelope but before review/evidence or other
draft assets. All eighteen exceed the unchanged 950 MB additive cap. The six/twelve
subset envelopes are serialization projections only; rebuild each selected cohort
through the existing bundler for its coordinator-owned release. Default archives,
complete hosted output, retained versions and final review costs remain unqualified.

The shared arcade observer now optionally uses `headerPolicy: "packaged-preview"`.
It imports the existing server policy, checks exact served headers, records bounded
CSP violations and includes the policy in comparison identity. Historical minimal
plans retain their behavior. The [frozen browser observation](verification/evidence/discovery-preview-policy-64b5a6c42.json)
retains a first route caught by an enemy, followed by an ordinary win and twenty
decoded reward-viewer cycles. Connected DOM/media counts stayed constant, no CSP
violations or application errors were observed, and owned cleanup succeeded.
Concurrent builds were active: these timings are not a quiet matched benchmark.
The packaged-preview soundtrack-origin exception is not deployed public-origin
qualification.

The reusable [FPV completion observer](fpv-completion-observer.md) separates genuine
flight/proof/Retry behavior, passive timing, bounded trace capture and cleanup.
Trace overflow or failure preserves a partial and cannot suppress the functional
checks. The [exact frozen-package run](verification/evidence/fpv-completion-portable-64b5a6c42.json)
completed one 493-tick airborne attempt, then a 1,001.8 ms passive post-save window
before opening Notebook or Retry. Retry returned to flight-01 disarmed with zero
commands, and proof bytes remained identical after Retry and reload. The complete
trace's maximum inclusive completion/passive tasks were **4.433/0.942 ms**; all
owned cleanup succeeded. This loaded-machine diagnostic neither explains the
earlier 266.7 ms gap nor establishes exclusive reward cost or hardware performance.

The offline discovery heap analyzer reuses the existing bounded V8 parser while
preserving the flight analyzer's output. It binds one artifact, document, isolate
and instrumentation set to warm/20/40 snapshots with real closed-view checkpoints.
The [descriptive capture](verification/evidence/discovery-2026-09-29-retention-64b5a6c42.json)
completed an ordinary win and forty decoded viewer cycles: all 73 selected cohort
counts stayed constant, including fourteen named reward closures; detached nodes
remained 16. Total shallow heap grew **815,656 bytes**, so whole-heap or exclusive
retained-memory stability is not claimed. Chrome exited but the driver stalled
during cleanup; only the owned process was terminated, with the failure and forced
cleanup retained. Raw heaps remain private; public output omits their object strings
and retaining paths. A temporary source-postcheck interruption during rebase is
retained separately from the later successful hash comparison of the listed
observation instrumentation; it does not qualify every rebased runtime input.

All 39 integration commits rebased onto `b5ab06e125` without conflicts or changed
patches. The shared arcade core still matches main. The new observer/analyzer
cohort passes **48 checks**, and its new tests join the existing company/practice
CI commands. The four showcase protocol candidates remain preparation for the
next browser batch; no additional campaigns, simulation branches, release roots,
caps or published reward promises changed.

The [post-rebase production-review diagnostic](verification/evidence/production-review-gap-2ba974146.json)
retains the initial broad check (187/209 passing, 22 missing-input failures).
Restoring 81 exact committed sparse inputs, 8,224,734 bytes, removed those missing
files without changing tracked content. The two affected suites then passed
**30/34 checks**: all 15 recipe-source checks and 15 of 19 production-history
checks. Four current-production/review checks remain failed. The branch changes
`game/app.mjs`, `game/ui/audio.mjs` and `game/ui/soundtrack-panel.mjs` beyond the
immutable reviewed audio inputs; all 28 exact-main inputs still match that review.
This is an open release gate, not an inherited upstream failure or a waived test.
The final integrated source needs an actual scoped continuation review and the
existing append-only production flow. Historical review records, producer rules
and assertions remain unchanged.

The cleanup follow-up then closes an observer failure-containment gap. Bounded
failure diagnostics now reach owned cleanup even when the renderer never answers;
each cleanup operation has a deadline and separate start/outcome evidence. CDP
detachment precedes browser shutdown. A timeout or failed journal cannot suppress
later server cleanup or replace the primary error with success. The
[combined observer/analyzer cohort](verification/evidence/observation-tools-c80b09d89.json)
passes **55 checks** after this change; independent review and focused rerun pass.
These are tooling regressions, not a new browser/heap capture or proof that the
original driver hang is cured. Before the final audio continuation, explicitly
cover published-cue precedence over authored victory motifs and cancellation or
disposal during discovery-recording preparation; the scoped source audit identified
those two compositions as missing targeted evidence, not demonstrated defects.

### Current-source continuation and showcase rehearsals — 29 September

The source implementation remains complete for priority batches A–F: four polished
six-mission showcases, USB-radio setup, the separate twelve-drill first-person
simulator, and shared reward/Studio integration. Phase7 remains qualification and
coordinated publication; human learning, artwork and physical-device evidence stays
deferred. No new release root, version, cap or campaign promise is introduced.

The branch rebased onto `6a67d6dbfe` without conflicts; all 41 existing patches are
unchanged. The preceding remote candidate run36508987834 passed 964 company tests
and cancelled one real Journey/Retry host test at its 60-second bound. That test
now renders at 30 Hz while preserving 120 Hz physics, its original tick budget, actual
keyboard/save/replay path and an independently stepped authoritative checkpoint.
The focused host/performance cohort passes 21 checks without increasing the timeout
or changing runtime simulation.

The scoped [audio software review](verification/discovery-audio-continuation-2026-09-29/review.json)
adds the 22 missing behavioral/media-validation inputs to the existing 28-source
fingerprint. Published-cue precedence, authored fallback, pending original export
cancellation, master ownership and isolated preview preferences have targeted
composition coverage. The 130-check composition cohort passes; a separate initial
145-check owner cohort had 144 passes and one malformed HTTP fixture. Correcting
that fixture and explicitly checking 503/retry produces 22/22 soundtrack-host passes.
The earlier failure is retained, rather than counted as a green full rerun.

Production101 at immutable `d541946f4` is preserved as an
[audited intermediate checkpoint](verification/evidence/discovery-production101-checkpoint-2026-09-29.json):
eight reviewed audio53 successors and 24 source-stage UI23 successors. The producer
correctly detected the branch's existing WebP import extension, so the initial
audio-only expectation was not met. A separate
[WebP software review](verification/discovery-webp-ui-continuation-2026-09-29/review.json)
verifies the exact seven UI inputs and 60 focused host/media tests. Only full-frame
static WebP admission and its error copy changed; limits, hashes, cancellation and
downstream complete decoding remain enforced. Production102 appends 24 reviewed
UI24 successors. All 132 original payloads and every previous production record
remain immutable; current coverage is 99 source/236 reviewed/0 missing slots. Review
approval here is scoped software evidence, not human artwork or release approval.

The [showcase observer](discovery-desktop-observations.md) now has explicit Social
Drone UA, Victory Drones and Ukraine protocols alongside the existing FPV path.
They use ordinary public controls and accepted wins, inspect exact bilingual
discovery copy, reopen Collection, retain the locked finale and exercise Retry/Next.
Routes remain experimental until rehearsed against an exact frozen artifact.
Its 22 automated checks pass; browser outcomes and final current-source production
checks follow in the next checkpoint below.

The complete production-history/source cohort now passes **38/38**, including
current UI/audio source authentication, immutable production100/101 reconstruction,
source mutation rejection and the exact 101→102 transition. Reproduction passes,
and the committed 102 ledger reports all **194 required slots reviewed**. These
are declaration/source gates, not fresh human visual acceptance.

The broader company run passes **969/971**, with two actual Team-result failures
and no cancellations. They exposed a real compatibility gap: production 102 had
no explicit legacy Team picture association. The
[association follow-up](verification/evidence/discovery-team-picture102-2026-09-29.json)
adds current 102 and retains 100 with identical Orchard/Foundry hashes, dimensions
and geometry. The finite policy count changes 42→43; its 42 KiB byte budget,
picture limits and package limits stay unchanged. Revisions 98, source-stage 101
and unknown 103 remain rejected. The full five-file follow-up passes **156/156**,
including both unchanged failing result tests and actual starts/verified leases
for every retained 58–97, 99, 100 revision. Four direct association suites now run
with the company candidate job. The full 971-check run is retained as failed; this
focused repair is not presented as a fresh all-green full rerun.

The association modules are outside the explicit production recipe source groups.
They require their own finite mapping review and newly frozen source; they do not
change reviewed audio/UI inputs or require another production revision. The normal
producer reproduction check confirms unchanged 102 output after the repair.

The first three-edition build from `db8e45e0e` was cancelled before admission after
the Team gap was found. A delivery-ledger edit had also occurred during that run,
so it cannot prove an unchanged-source build. No archive or qualification receipt
is claimed from it. A fresh clean-source build follows the committed repair.

The repaired clean `4689753f6` source produced three frozen showcase editions:
Social Drone UA, Victory Drones and Ukraine. All three reproduce byte for byte
across two builds and pass original ZIP-member, source and offline admission.
The [candidate receipt](verification/evidence/showcase-candidates-4689753f6.json)
pins each archive, manifest and presentation receipt. They are private candidates
using the existing package version, not new published v0.142.3 release assets.

Browser rehearsal found two observer navigation assumptions that did not match the
shared Library/shell: mission IDs are complete Library tuples, and the narrow
header exposes Collection through Menu → Gallery. The runner now derives exact
aliases from the admitted campaign source, uses only visible native controls and
checks return to the won result. No gameplay code or frozen archive changed.
Cleanup now independently closes the owned page and context before the browser;
each existing 10-second deadline remains enforced and recorded. Earlier failed
attempts remain failed even when later captures succeed.

The [functional browser receipt](verification/evidence/showcase-functional-4689753f6.json)
retains all ten captures. Social02 and Victory01 complete two ordinary wins of
their first mission, eleven observed phases, exact English desktop and Ukrainian
portrait discoveries, Collection reopen, locked campaign promises, Retry, Next
and every owned cleanup operation. Ukraine07 completes the same functional flow
with no application or CSP errors, but its browser-close operation exceeds the
unchanged 10-second deadline; the overall observation remains failed. Earlier
selector, navigation, route and shutdown failures remain separately recorded.
These are three first-mission flows, not new six-win finale, later-application,
physical-controller, touch or quiet-performance evidence.

The two revised keyboard candidates add safe route margins, with exact shared-core
feasibility checks under bounded input timing variation. The final observer cohort
passes **28/28**; no runtime gameplay or frozen archive changed. Ukraine06's final
immediate read was still running, while its later diagnostic screenshot displayed
a genuine win. Its failed observation remains retained rather than retroactively
accepted. Independent review checked exact public Library selection, native narrow
navigation, cleanup failure containment and all candidate archive/source member pins.

The [blank-browser diagnostic](verification/evidence/discovery-chrome-close-diagnostic-2026-09-29.json)
reproduces a 10-second shutdown timeout without the game: the owned Chrome parent
exits normally, but inherited process stdio does not finish before Playwright's
close promise is due. Updater activity on that pipe is a supported lead, not proof
of the precise cause of every showcase timeout. An immediate blank close and real
Social/Victory cleanup succeed. No timeout, launch option, simulation or public
release gate was relaxed. Final integrated CI, matched performance/retention,
complete default/hosting admission and coordinated publication/rollback remain
Phase 7 work; human and physical-device evidence remains deferred.

### Firefox startup and historical Gentle attempts

The completed [`336a7b58b` candidate CI receipt](verification/evidence/candidate-ci-capacity-336a7b58b.json)
records **1,131 company checks and 179 optional-practice checks passing**, with
separate publishing/authoring groups also green. Eighteen editions reproduce twice
in CI. The 22-member capacity metadata packet was downloaded and independently
validated; the two optional packages were downloaded and re-admitted from their
original ZIP members. Edition archive bodies were not all downloaded locally.
These results belong to that exact commit, before the Firefox correction below.
The known additive publication projections remain 501,860,432 bytes for the six
priority editions plus both optional packages, 654,948,170 for the other twelve
plus both packages, and 1,150,863,303 for all eighteen plus both packages. Reviews,
evidence and other draft assets remain additional; no complete-budget claim is made.

Functional showcase observation now supports an explicitly selected, already
installed Firefox build. Its launcher/package/version pins and separate settings
identity do not supply Chrome performance evidence. Public boot failures retain
bounded visible diagnostics, while the existing boot/cleanup deadlines remain
unchanged. The old frozen Ukraine archive fails in Firefox146 with “Reward gameplay
binding differs from the selected mission”; its owned browser/context/page/server
all close successfully. The failed result remains retained.

The cause is native two-component `Math.hypot` rounding in initial Gentle enemy
normalization: 33 of the 108 Ukraine mission/difficulty identities differ by one
floating-point bit between Firefox and the published Node/V8 calculation. Fresh
v4 tuning now spells out that published arithmetic order. Historical v1–v3 dispatch,
core simulation, content identities and reward definitions remain unchanged. A
single-module overlay restores all 108 published identities and all six campaign/
43 reward bootstrap bindings in Node, Chrome and Firefox; that diagnostic is not a
frozen-artifact or full simulation-portability qualification.

An independently reproduced old Firefox gp4 attempt still verifies its replay but
would fail source matching after the fresh-normalization change alone. Restoration
therefore reconstructs both the published calculation and this runtime's historical
native gp4 calculation, accepting only an exact whole-level match from the installed
source. Replay/options/class validation, original picture pins, admin exclusion and
learning evidence remain enforced. New attempts and compiled reward bindings use
the published calculation. This preserves same-runtime native gp4 history; it does
not claim cross-engine portability for every older floating-point replay.

The real Ukraine Studio chain now edits guided lesson metadata, retains exact
source/media pins through authoring export/import and compilation, wins two ordinary
missions through the shared host, recovers from a wrong decision, records the
correct Ukrainian learning interaction once, and reopens its discovery in
Collection. Both Studio playthrough tests pass. This is a modeled DOM/raster host
check; interrupted workbench reload, player-backup transfer, human comprehension
and physical devices are outside that evidence.

The [compatibility receipt](verification/evidence/gameplay-tuning-firefox-compatibility-2026-09-29.json)
records **88/88** focused checks, including historical and
current tuning, replay/collision fixtures, generic/continuous/company sessions,
performance validation, and normal/admin Collection behavior. A real Solo host
restores the original Firefox diagnostic save, wins through ordinary input and
saves the authored picture without changing the recorded simulation. The combined
Studio and observer rerun passes **38/38** after the runtime correction.

Because the app is an explicitly reviewed audio input, the minimal Collection
compatibility change receives a separate scoped software continuation. Production
103 [checkpoint](verification/evidence/discovery-production103-checkpoint-2026-09-29.json)
appends eight audio54 successors; UI24 and every earlier record/payload remain
unchanged. The independently pinned production102 oracle comes from committed
`336a7b58b`, before the new writer. The finite Team association advances to103 and
explicitly retains102, while unknown104, unreviewed98 and source-stage101 remain
rejected. The exact association row limit increases to44; byte budgets do not change.
This source review does not approve human listening, artwork, physical devices or
publication.

The production-history/source cohort passes **40/40** checks, and the normal
producer reproduces103 exactly. Its archive is 8,492,839 bytes with 2670 assets,
104 themes and 132 original payloads totaling 4,009,342 bytes. The compiled Studio
payload remains below its existing 5 MiB limit. Focused source eligibility passes;
clean-source candidate and complete default/hosted admission remain separate.

The current/retained Team association and result cohort passes **158/158** checks,
including exact102 restoration and actual starts for every supported retained
revision. Unknown104 remains rejected before media reads.

The clean `28fbe1583` [frozen Ukraine receipt](verification/evidence/showcase-firefox-28fbe1583.json)
closes the Firefox first-mission walkthrough. The edition reproduces twice and
passes original runtime/source ZIP-member admission. Its distribution is 42,182,913
bytes, SHA-256 `4f96e42b882eb15bfc1f73eeead8972bc48746956c93e157b9b347f1cb956254`.
Firefox 146.0.1 boots successfully and completes two ordinary wins, eleven phases,
English 1280×633 and Ukrainian 390×844 discovery/Collection views, Retry and Next.
There are no application/CSP errors; observer, page, context, browser and server
all close within the unchanged deadlines. The 73-file capture inventory pins 3,899,936
bytes. This is one distinct mission, not a six-win finale or later application.

The same clean source's default inspector stops on 131 missing committed inputs
(total 250,442,007 bytes) in this sparse checkout. No files were hydrated and no
current default inspection report was produced. The earlier default-size receipt
remains historical; it cannot establish this source's capacity. Full default and
hosting admission require the complete release checkout. Frozen Firefox success
does not resolve Chrome's earlier shutdown or substitute for quiet performance,
retained-memory, physical-device or human review. The source remains one scheduled
PR #758 input to the coordinator-owned v0.150.0 integration and publication.

### Latest-main compatibility and interrupted learning — 29 September

The main321 integration resolves two real identity collisions. Published and
preview presentation101 are different immutable records; their complete original
runtime manifests are retained by hash. Canonical production102 appends a scoped
merged-source continuation to published main101, while the preview101–103 bundle
remains independently authenticated. All 132 original payloads stay unchanged.
Team's finite picture policy admits published101 only with its exact manifest;
preview source-stage101 and unreviewed98 still cannot borrow that association.
See the [lineage inventory and source review](verification/discovery-main321-reconciliation/README.md).

Published main and the preview also issued different Journey backup.v4 shapes.
Import distinguishes their explicit stars/performance sidecars and rejects ambiguous
objects. New enriched backups use v5 and retain both sidecars atomically; plain
v1–v3 exports keep their existing format. Pinned historical writers exercise import,
rollback, cancellation, failed writes and lease loss. The combined Journey groups
pass **94/94** checks. No accepted clear or earned promise is invented or rewritten.

Optional lesson choices now persist by exact edition, lesson/fixture and gameplay
identity. Reload opens a labelled practice draft with replayed choices and feedback;
it cannot reconstruct lost arcade authority. At a current accepted won result an
explicit fresh attempt uses the existing verified replay. Collection can repeat
practice without earning. Learning backup v2 retains these drafts separately from
verified proofs and still accepts v1. Failed writes remain visibly session-only;
corrupt originals are preserved. The original reload-loss bug was reproduced before
the fix; **44/44** draft, proof, host and locale checks pass, with independent review.
These modeled-host checks do not establish human comprehension or physical input.

The [previous db4 candidate run](verification/evidence/candidate-ci-db4b2c8e8.json)
finished with **1,149 passed, one cancelled** company check: the real Threads Studio
playthrough exceeded its 60-second test deadline under the parallel cohort. Both
optional packages passed their independent CI job. No company candidate archive
was produced by that failed run. The showcase file now runs explicitly before the
parallel company cohort, with unchanged 30/60-second test deadlines and assertions.
Its isolated local rerun passes **2/2**, including Threads in 28.42 seconds; fresh CI
still must verify the new scheduling on its runner.

Company generation/source eligibility verifies **186 files and 294 eligible assets**.
Production history/retention/source checks pass **52/52**, and the normal producer
reproduces canonical102 exactly. The final Team history/policy cohort passes **141/141**, including manifest
mutation during reads/decoding and invalid Start/Retry contexts. Its earlier failure
was a test adapter that omitted the published101 hash; that adapter now copies the
complete prepared snapshot. A selector/host cohort initially passed116/117; the one
failure was an absent committed Team artwork file in the sparse checkout. Exact
committed originals were restored for its focused rerun; no artwork bytes changed. All 50 reviewed
audio source inputs were independently rehashed. These are software checks, not new
listening or artwork approval.

A separate CI job now inspects the complete clean default checkout and uploads a
small source-bound dependency/capacity report. It uses the existing inspector and
limits, without creating a second full archive. The four new exact runtime pins add
4,900,684 bytes; after current metadata reductions, compiled output grows 4,877,674
bytes from db4. Against the historical default's 1,366,959-byte headroom, this is a
rough 3.51 MB overage before other source changes. This is a planning delta, not a
current whole-build measurement. Read-only inspection found no safe formatting-only
reduction sufficient to cover it: existing generated offline catalogues and Studio
provenance are already compact, while historical bytes cannot be silently changed.

Remaining release work, in order:

1. Qualify this merged batch, including the new complete-checkout capacity job.
2. Resolve default capacity through an explicit, verified packaging change; retain
   original histories and all existing core/edition/optional/hosted limits.
3. Reconcile the final coordinator-owned source with #783; qualify its selected
   release and hosting cohorts. All 18 editions still cannot enter one additive
   release envelope under 950 MB. Keep one integration PR and split release cohorts.
4. Finish final-source performance/request, retained-resource, published installation
   and rollback evidence, then verify downloaded/deployed original bytes before promotion.

Human learning, artwork and physical-radio/device evidence remains deferred by the
user. PR #758 remains a held input to the v0.150.0 aggregate; this batch does not
allocate a new version, publish an artifact or bypass the queue.
