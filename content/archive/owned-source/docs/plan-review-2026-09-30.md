# Reveal Line: completed work and remaining programme

> **Historical review — 1 October:** use the [plain-language remaining work and priority choices](plan-priorities-2026-10-01.md). It updates merged/public/queued status, explains benefits and deferral costs, and distinguishes the proposed core-game-first refinement from the still-approved A → B → C order. The dated record below is preserved history.

Reviewed 30 September 2026, 18:49 UTC. This is the current explanation and priority
map for the character/game-feel and player-first plans. Earlier dated batch
records remain evidence, not today's task list. The [daily register](plan-status-2026-09-30.md)
retains integration history; the [character contract](character-game-feel-plan.md)
and [player-screen contract](player-first-ux-execution.md) retain requirements.

## Current position

**The core systems are substantially implemented. The programme is not yet fully
accepted.** Most remaining work is finishing selected production assets,
integrating bounded corrections, and checking the combined experience. It would
be wasteful to rebuild the existing rotors, encounter engine, comparison tools
or artwork packet system.

| Evidence boundary                | Observed state                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latest immutable GitHub release  | [v0.142.3](https://github.com/mekhovov/revealline/releases/tag/v0.142.3), published 29 September at 01:34 UTC. Existing tags and bytes stay unchanged.                                                                                                                                                                                                                                                                                          |
| Public continuous-main build     | Root HTML advertises v0.142.4. Both [deployment metadata](https://mekhovov.github.io/revealline/main-deployment.json) and [game metadata](https://mekhovov.github.io/revealline/game/build-info.json) identify `09a43d83351af276f184293ed3c72261575ed8bc`; [Pages run 36759567741](https://github.com/mekhovov/revealline/actions/runs/36759567741) succeeded. This review checked metadata, not a new complete playthrough or full byte audit. |
| Newer integrated source          | Main advanced to `60407a7ce4b4592372e66ef1961f3aa85562cefd` with compact-landing PR854 at 18:48 UTC; its Pages run was in progress at the snapshot. Do not describe that follow-up as publicly verified yet.                                                                                                                                                                                                                                    |
| Character programme              | All 24 bounded actor batches in [PR761](https://github.com/mekhovov/revealline/pull/761) are integrated. A batch is not an entire phase or a production-art approval.                                                                                                                                                                                                                                                                           |
| Current actor/recovery successor | [PR868](https://github.com/mekhovov/revealline/pull/868), head `4e54771316c817b2ad831ad47e47627966861644`, is pushed and held. It is not merged or publicly delivered.                                                                                                                                                                                                                                                                          |
| Scheduling                       | [Milestone 57](https://github.com/mekhovov/revealline/milestone/57), “v0.150.0 — Unified native experience,” groups owner inputs. Its name is not a published version or a guaranteed release date.                                                                                                                                                                                                                                             |

Use these labels consistently: **integrated source**, **pushed/held**, **prepared
art candidate**, **publicly verified**, and **remaining/deferred acceptance**.
Successful export, a merged PR, metadata coverage and public gameplay each prove
different things.

## Completed implementation

### Current content and player foundations

- Ordinary Journey entry exposes 91 Solo missions, the same 91 missions in Versus,
  and 12 Team missions. These are **194 mode/mission owners**, not 194 unique new
  missions. Legacy, installed and imported routes remain separate coverage paths.
- The player-first source foundations exist: shared menu input ownership,
  Journey rewards/completed artwork, mission gallery, compact mode entry,
  deliberate Pause/Resume and terminal Retry, countdown/continuation, Settings,
  Help, Collection and return-focus handling. Current owner PRs continue closing
  specific defects; this is not whole-UX or physical-device certification.
- Current-mission Guide lessons, exact practice entry, failed-practice recovery,
  Team rescue/downed guidance and localized score/feedback corrections are
  integrated. Practice does not award campaign progress.

### Characters and motion

- Shared rotors have per-hub position, radius, direction and phase. Clock handling
  covers pause, freeze and reduced effects. Community quads use counterrotation
  and mirrored blade handedness; surface accents no longer share unsuitable
  timing with ordinary travel/rotor motion.
- Team Hunters face the locked warning destination and then actual charge
  direction. Recovery, freeze and downed states retain their intended visual
  meaning. Player numbers/shapes and contact cues remain distinct from artwork.
- All seven new V6 drone body candidates can be compared using their actual class
  setup in existing missions. The 14 native 32/64-pixel PNGs total 6,240 bytes.
  **They remain optional review assets, not selected production replacements.**
  See [the roster evidence](verification/actor-batch-15/README.md).

### Encounters, artwork and authoring

- Pursuit and interception already exist in current authored missions. Optional
  scout/sentry editing, live presentation, exact Solo practice, replay/Retry
  support, rule-derived lessons and optional cosmetic remains are implemented.
  Scout/sentry has no authored default placement in the inspected inventory;
  exposing the shared remains preference in Team does not add Team combat.
- Workshop, Poltava courtyard and Synevyr-inspired sources and separately
  identified board derivatives exist. The corrected Poltava source and board
  retain their parents. The revision-7 nine-file packet preserves 17,884,748
  payload bytes and six parent relationships. It has actual import, preparation,
  preview and export/reimport evidence. It is **not approved production artwork**.
- Studio/Motion Lab can edit rotor anchors/radius/direction/phase and existing
  wing/thruster/pulse/blink properties. Bounded `.rlart` packets preserve originals,
  references, hashes, derivative history and collection-level pixel-art versus
  explicitly chosen photographic treatment. Native-size and retained-parent
  comparison already exist; another comparison tool is not needed to finish the
  first cohort.
- Game Feel Lab and the three-mission playable benchmark exist, including retained
  artwork/Retry and independent feedback comparison. Formal human sessions remain
  unperformed and last in the approved order.

Historical focused/browser evidence remains attributed to its exact source and
date. No historical test total is presented as a fresh passing suite.

## Remaining items, purpose and priority

### P0 — Finish delivery of prepared corrections

**Work:** reconcile current owner inputs onto accepted main, resolve each exact
candidate's build/capacity/provenance defects, and verify the actual public
destination. PR868 contains the ordinary Sentry projectile-loss explanation,
refreshed FPV104 coverage, and exact fpv38/50 Team import restoration through
picture, theme, audio, preview, Retry and disposal. It reuses 124 existing exact
asset dependencies per historical manifest. Newer ambiguous historical lineages
still need an explicit identity decision; a revision range is not sufficient.

**Benefit:** already-written improvements reach players without corrupting old
artwork or blocking unrelated ready changes. **If delayed:** source improvements
remain absent from ordinary play and old imported content can still fail. This
is delivery work, not another broad redesign.

**Done when:** the integrated candidate meets the active non-waived gates; public
metadata/affected bytes and relevant ordinary play agree with that exact source.
Immutable publication, where scheduled, has separate frozen evidence.

### A — Finish current characters and reliable play (C3 + necessary C0/C1/C6)

**Work:** finish common player/enemy bodies and their state/scale/contrast checks;
adopt only reviewed larger-propeller/body candidates. Repair the registered
`enemy.border-patrol` rig, which still has zero metadata anchors in the FPV104
report despite a runtime fallback. Check four headings, tiny sizes, board edges,
bright/dark pictures, freeze/downed/recovery and both Team identities. Complete
the current Home/Pause/input corrections through their existing owners.

C0's inventory is implemented, but its comparable frame-time, decoded-image
memory and download baseline is still incomplete. Capture that bounded baseline
before evaluating a new production roster; repeat the wider checks in C7. New
real-world-inspired vehicle silhouettes can fill existing visual roles without
silently introducing attacks, collision rules or competitive advantages.

**Benefit:** drones look like connected working machines, threat states are
readable, and the player can reliably Start, Pause and Retry. **If skipped:**
correct rotation alone will not solve the user's small-propeller/proportion
complaint, and fallback rigs can conceal unfinished asset metadata.

**Done when:** selected production rigs/bodies and exact revisions work through
Solo, both Versus boards and Team, including retained attempts; the agreed
responsive/input cases have evidence. Existing safe corrections can ship before
every sprite is complete. Production-art adoption stays deferred while review is
deferred; that does not block independent source fixes.

### B — Finish meaningful optional encounter variety (C4)

**Work:** qualify the existing pursuit, interception, scout/sentry and selected
combinations across supported difficulty and steering configurations. Check that
warnings expose a useful decision and recovery opportunity at ordinary speed.
Extend the existing teaching and mission variants where needed; do not create a
second encounter engine. Keep variants opt-in and preserve original simulation,
record, save and replay identities. Team encounter expansion is a separate slice,
not implied by Solo support.

**Benefit:** missions ask different questions—close early, reroute after a lock,
cross during a safe interval, or stay near a partner—without surprising the player
with unexplained rules. **If expansion is delayed:** current missions still work,
but variety is narrower. **If qualification is skipped:** combined threats may be
unfair or communicate the wrong counterplay.

**Done when:** the chosen variants have clear teaching and readable states,
deterministic/replay evidence under the restored test policy, and a scoped
fairness review. The formal comparative C2 pilot is not required to implement
independent B corrections.

### C — Finish one Ukrainian/FPV artwork cohort (first C5 slice)

**Work:** finish native pixel clusters where needed, cultural/composition checks,
actor/background contrast, fit and explicit mission/theme bindings for the
workshop, Poltava courtyard and Synevyr-inspired scenes. Preserve the clean
originals and accepted historical pins. The sources, derivatives and necessary
tools already exist.

**Benefit:** this is the boundary that turns prepared pictures into coherent
ordinary gameplay. **If deferred:** the tools continue to show candidates, while
players keep the current approved pictures. Valid hashes/export alone cannot
establish visual quality or cultural accuracy.

**Done when:** one cohort is approved and bound to suitable existing missions;
preview, reveal, result, Retry, Continue and Collection use the exact accepted
versions in applicable modes. **Production/cultural review is currently deferred
by the user, so no adoption date is promised.** Broader communities follow this
finished example rather than multiply unreviewed candidates.

### Required tools first; broader tools and communities later (C6 / remaining C5)

**Work:** carry only necessary validation, recipe-reader, provenance and export
changes with A/B/C. Extend moving parts/state editing when a real consuming asset
requires it. Then independently reproduce a fresh-workspace community workflow:
create → import → install → play → export → recover. Finish specialized creator
input/recovery routes and subsequent DroneAid, cultural, Retro and Coupa cohorts.

**Benefit:** communities can reproduce the result safely instead of relying on
hidden local knowledge. **If postponed:** the existing game remains playable, but
new communities need manual help and wider theme consistency remains unfinished.
Broad editor expansion should not displace fixing current play or finishing the
first art cohort.

### C7 / UX6 — Qualify the combined game

**Work:** exercise complete Solo/Versus/Team journeys, historical/installed/imported
content, backup and exact-art restoration, offline failure/update/recovery,
terrain/equipment/effects/preview consistency, and real memory/frame-time costs.
Include EN/UK, Large/Plain text, meaningful 200% zoom, reduced effects, portrait,
short landscape, 1280×800, controller reconnect and touch. Physical controller,
Steam Deck and phone evidence must remain separate from modeled/browser input.

**Benefit:** catches failures between individually implemented features.
**If skipped:** it is not supportable to claim “works across every mode/device”;
updates, missed input, offline gaps or budget regressions may reach players.

**Done when:** required journeys and content paths have current attributable
evidence, defects are corrected, and public bytes/play match the accepted source.
Current metadata inventories are a checklist, not a substitute for these checks.

### C2 — Formal game-feel comparison and player sessions, last

**Work:** use the existing benchmark, complete any relevant audio/haptic comparison,
and run two consented short rounds with at least three newcomers and three
experienced players. Check unaided start, threat/loss understanding, readable
captures and voluntary Retry/Next, then record and act on the findings.

**Benefit:** establishes whether the result actually feels better to people.
**If delayed:** implementation can continue, but there is no human evidence for
improved enjoyment or replayability. Session length alone is not a retention
study. This remains last by explicit user priority, not a hidden gate on all A/B/C
development.

## Remaining earlier whole-game commitments

UX0–UX5 are mostly source foundations with continuing corrections; UX6 acceptance
is still open. Keep the earlier map/theme parity, campaign-specific offline
dependencies, backup/media/history recovery, audio listening, complete community
creation guide and broader campaign production in the backlog. They are not
erased by the character programme or completed by a working gallery.

The original **132-new-mission / 792-Solo-configuration / 36-Team-configuration**
targets need reconciliation against accepted campaign identities and actual
qualification. The 91/91/12 current-entry inventory does not prove those targets
are fulfilled, nor does it justify authoring an assumed numerical difference.
No bulk mission production is added to the immediate A/B/C completion path.

Online multiplayer, Deathmatch, full Ukrainian translation, hosted administration
and persistent co-op sessions remain deferred. Native-feeling browser controls
are not Steam certification or a signed platform release.

## Queue, blockers and evidence limits

At the snapshot, the following are existing inputs rather than new phases:

| Owner inputs                                                | Remaining boundary                                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| PR868 actor recovery                                        | Held; candidate-specific capacity and production fingerprint reconciliation before admission. |
| PR846 / PR857 role galleries                                | Current input/motion ownership; PR857 is draft/held.                                          |
| PR862 FPV review, PR866 Demo controls, PR867 mission footer | Integration and public verification of player/input corrections.                              |
| PR858 optional audio, PR869 offline projection              | Correct failure behavior and exact optional dependency accounting.                            |
| PR863 / PR870 prepared-source readers                       | Owned artwork/title inspection and recovery; PR870 is draft/held.                             |
| PR856 Demo variety                                          | Held preparation input; do not infer admission from a green check.                            |
| PR871 controller delivery plan                              | Documentation input.                                                                          |

PR853 offline launch and PR854 compact landing are now merged; old paragraphs
calling them unimplemented or open are superseded. PR lists change quickly; the
publisher rechecks exact heads before admission.

**Specific held-candidate findings:** PR868's build at `deb4a4e97e1d395eacb39c1ddd07dd99086010dc`
produced 951,900,757 bytes, **1,900,757 over** the 950,000,000-byte Pages ceiling
before publication metadata. The production-generator check reported a stale
revision ledger. Two formatting failures belonged to unchanged base files
(`game/editions/runtime-assets.json`, `scripts/edition-offline.mjs`). These are
that candidate's recorded findings, not a claim that every later main build is
blocked. Recompute after integration; preserve historical production approvals
and exact original bytes. See the [pushed candidate evidence](https://github.com/mekhovov/revealline/blob/4e54771316c817b2ad831ad47e47627966861644/docs/verification/actor-recovery-20260930/README.md).

**Test policy:** automated full and focused suites are
`WAIVED_SKIPPED_NOT_PASSED` under the [active waiver](focused-test-waiver-20260930.md).
The repair owner must restore required execution through a reviewed policy
change. Source identity, localization, provenance, runtime dependencies, build,
capacity and asset integrity remain required. This increases regression risk;
neither passing CI nor historical totals remove that limitation.

**Coverage limits:** FPV104 reports 194 owners, 631 placements, 125 distinct actor
bindings, 103 reveal artworks and 335 compiled slots. Its mixed-record disposition
queue is Keep 228 / Repair 15 / Review 332 / Replace 0, with five unknown scopes
and no visual approval. These are not 575 broken sprites or 15 confirmed gameplay
bugs. The inventory refresh is in PR868, not yet main. Broader route coverage,
hardware, listening, cultural approval and human fairness remain separate work.

## Batch order and planning ranges

Continue **A → B → C**, with required C6 support alongside; broader cohorts/tools
follow, then C7/UX6 and finally C2. Necessary fault, compatibility and byte checks
travel with each feature rather than waiting for C7. Production review stays
deferred until explicitly resumed. No additional permission is needed for already
authorized independent implementation.

| Work                                                   | Remaining effort range after its dependencies are available | Constraint                                                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Current correction batch / delivery repair             | 4–12 engineering hours                                      | Low confidence until current aggregate capacity and fingerprints are reproduced; publication time is additional. |
| A roster/state completion                              | 2–4 working days                                            | Excludes deferred art approval and unavailable physical-device review.                                           |
| B bounded encounter qualification                      | 2–4 working days                                            | Starts from existing behaviors; automated evidence depends on test-policy restoration, fairness on reviewers.    |
| First C cohort completion                              | 1–3 working days after review resumes                       | Preparation is done; approval/adoption has no calendar ETA while deferred.                                       |
| Required C6 follow-ups and independent community trial | 1–3 working days                                            | Scope only actual A/B/C dependencies and the fresh-workspace trial.                                              |
| Each later edition/community cohort                    | 2–4 working days for a bounded cohort                       | Campaign-wide production requires its own accepted inventory and estimate.                                       |
| C7 / UX6 cumulative qualification                      | 4–7 working days plus device availability                   | Defect correction can extend this range; do not equate this with exhaustive human mission balance.               |
| C2 pilot                                               | 1–2 session/analysis days after recruitment                 | Recruitment/reviewer availability has no committed date.                                                         |

These are revised planning ranges, not measured remaining-duration guarantees or
an additive commitment to finish the whole programme immediately. Owner work can
overlap. Keep one publisher, preserve unrelated work and all immutable releases,
and group compatible verified source in bounded batches. Do not hold a ready fix
for optional tooling or silently include unapproved artwork. After each admission,
update exact source, public destination, evidence limits and the next boundary.
