# RevealLine — completed and remaining delivery

> **3 October implementation update:** [Unified gameplay and industrial art](unified-industrial-plan.md) records the newly approved priorities, bounded budget increases, implemented scope and remaining art/device gates.

> **Historical review — 1 October:** use the [plain-language remaining work and priority choices](plan-priorities-2026-10-01.md). It updates merged/public/queued status, explains benefits and deferral costs, and distinguishes the proposed core-game-first refinement from the still-approved A → B → C order. The dated record below is preserved history.

Updated **30 September 2026, 20:51 CEST (Europe/Berlin)**.
Source review: `09a43d83351af276f184293ed3c72261575ed8bc`, with the subsequent
landing merge `60407a7ce4b4592372e66ef1961f3aa85562cefd` checked separately.
This is the whole-product status rollup. The dated source, character, Levels,
audio and native-menu ledgers remain the detailed evidence for their own scopes.

## 1. Current result

**The game has substantial working systems and many completed fixes. The full
production programme is not complete.** Source integration, continuous Pages,
immutable releases and full player acceptance are different states.

| Surface                                                                                  | Verified at this checkpoint                                                             | What it means                                                                                                                         |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Main                                                                                     | `60407a7ce4b4592372e66ef1961f3aa85562cefd`                                              | Compact landing/Settings PR #854 is merged.                                                                                           |
| [Live browser game](https://mekhovov.github.io/revealline/game/)                         | `main-09a43d83351a`; package label `0.142.4`                                            | Newer main source is deployed independently of immutable releases. Metadata matched; no current gameplay was exercised in this audit. |
| Next continuous deployment                                                               | [60407a7 run](https://github.com/mekhovov/revealline/actions/runs/36761191625), running | A successful preceding deploy does not certify the newer commit.                                                                      |
| [Latest immutable release](https://github.com/mekhovov/revealline/releases/tag/v0.142.3) | **v0.142.3**, published 29 September                                                    | Still the most recent frozen GitHub release.                                                                                          |
| [Current planning milestone](https://github.com/mekhovov/revealline/milestone/57)        | **v0.150.0**, no due date                                                               | An assigned target, not a published or accepted version.                                                                              |

Public identity sources: [deployment manifest](https://mekhovov.github.io/revealline/main-deployment.json),
[game build identity](https://mekhovov.github.io/revealline/game/build-info.json)
and [configuration](https://mekhovov.github.io/revealline/game/build-config.json).
The reviewed immutable selector still selects v0.142.3.
The release coordinator owns cumulative merges, version allocation, freezing and publication.

Status vocabulary:

- **Released scope:** an identified historical release and its recorded acceptance.
- **Merged source:** present on main; final integrated/public acceptance may remain.
- **Open input:** pushed PR awaiting its own review, gates or integration.
- **Partial:** foundations exist, but the stated completion condition is unmet.
- **Deferred:** deliberately later or waiting for an explicit review/environment.

A green source check, a source-only gallery, an archived branch or a successful
file download does not close an entire gameplay phase.

## 2. Completed source and bounded deliverables

The morning queue in the older September 30 register is historical.
In particular, #825 and the previously local Pause work are no longer pending
in that form. The following are now integrated source:

| Area                              | Completed result                                                                                                                                                        | Representative merged PRs                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup and native menus          | Ready handoff restored; compact Pause and universal Solo Skip; current-menu Confirm checks; compact landing retains Settings.                                           | [#816](https://github.com/mekhovov/revealline/pull/816), [#831](https://github.com/mekhovov/revealline/pull/831), [#823](https://github.com/mekhovov/revealline/pull/823), [#854](https://github.com/mekhovov/revealline/pull/854)                                                                                                                                                                                                                                     |
| Levels                            | Cooling loop v38 restored, extra Standard routes and further Gentle/Expert route evidence added. Existing editions and records remain distinct.                         | [#820](https://github.com/mekhovov/revealline/pull/820), [#829](https://github.com/mekhovov/revealline/pull/829), [#860](https://github.com/mekhovov/revealline/pull/860)                                                                                                                                                                                                                                                                                              |
| Team play                         | Rescue explanation survives downed-player Resume; difficulty/import tuning, compact teaching, text-size dependencies and Resume scenarios improved.                     | [#828](https://github.com/mekhovov/revealline/pull/828), [#834](https://github.com/mekhovov/revealline/pull/834), [#838](https://github.com/mekhovov/revealline/pull/838), [#839](https://github.com/mekhovov/revealline/pull/839), [#843](https://github.com/mekhovov/revealline/pull/843), [#845](https://github.com/mekhovov/revealline/pull/845)                                                                                                                   |
| Characters and feedback           | The 24 actor batches are integrated, with additional Team guidance and Enemy Workshop focus/readability corrections.                                                    | [#761](https://github.com/mekhovov/revealline/pull/761), [#852](https://github.com/mekhovov/revealline/pull/852)                                                                                                                                                                                                                                                                                                                                                       |
| Audio and radio                   | Spatial audio restored; six Synth/Metal recordings added; saved styles and explicit radio deselection integrated.                                                       | [#817](https://github.com/mekhovov/revealline/pull/817), [#830](https://github.com/mekhovov/revealline/pull/830), [#837](https://github.com/mekhovov/revealline/pull/837), [#861](https://github.com/mekhovov/revealline/pull/861)                                                                                                                                                                                                                                     |
| Demo                              | Visible-frame continuity, iPhone replay compatibility and broader humanized variety integrated.                                                                         | [#821](https://github.com/mekhovov/revealline/pull/821), [#841](https://github.com/mekhovov/revealline/pull/841), [#847](https://github.com/mekhovov/revealline/pull/847)                                                                                                                                                                                                                                                                                              |
| Creator tools                     | Guide sections/documents stay in owned readers; gallery navigation, cancellation and source viewing improved; cached Company drafts and Discovery suspension recovered. | [#815](https://github.com/mekhovov/revealline/pull/815), [#827](https://github.com/mekhovov/revealline/pull/827), [#832](https://github.com/mekhovov/revealline/pull/832), [#833](https://github.com/mekhovov/revealline/pull/833), [#836](https://github.com/mekhovov/revealline/pull/836), [#840](https://github.com/mekhovov/revealline/pull/840), [#848](https://github.com/mekhovov/revealline/pull/848), [#849](https://github.com/mekhovov/revealline/pull/849) |
| Offline and packaging foundations | Optional extras separated from starter downloads; cached FPV launch recovered; iOS sound-credit source staging corrected.                                               | [#818](https://github.com/mekhovov/revealline/pull/818), [#822](https://github.com/mekhovov/revealline/pull/822), [#853](https://github.com/mekhovov/revealline/pull/853), [#859](https://github.com/mekhovov/revealline/pull/859)                                                                                                                                                                                                                                     |
| Preservation and plan             | Earlier local-source audit and missing-proposal records are on main; historical source remains recoverable without wholesale replay.                                    | [#825](https://github.com/mekhovov/revealline/pull/825), [#828](https://github.com/mekhovov/revealline/pull/828)                                                                                                                                                                                                                                                                                                                                                       |

These are concrete completed slices, not a declaration that every device,
character state, tool or campaign is accepted.

## 3. Original player feedback: implemented versus still open

| Requirement                                     | Implemented foundation                                                                                                             | Remaining acceptance                                                                                                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuous movement and stop after a cut        | Capture-stop, fresh-input recovery, Immediate and Grid + buffer; old replay semantics retained.                                    | Current all-mode press/release, held-input, load/Resume and pending-turn matrix; real touch/controller checks.                                                                         |
| More interesting enemies and challenge          | Collision-driven ordinary courses, authored pressure, terrain/bonuses, optional pursuit/sentry roles and complete-route examples.  | Fairness across presets/seeds; readable counters; long safe cuts, inactive threats and tedious quota tails; human playtests. Do not substitute a blanket speed increase for this work. |
| Animated, distinct, readable actors             | Shared directional rendering, rotors, body/contact separation, effects and Team cues; seven-class FPV candidates exist.            | Full roster/state review at actual playing size, explicit approved body adoption and cultural/pixel/contrast review.                                                                   |
| Better trails, line impacts and failure/bonuses | Travelling impacts and capture/loss/pickup/recovery foundations exist.                                                             | Cross-mode and reduced-effects consistency; every effect explains the event without covering the arena.                                                                                |
| Native menus and consistent controls            | Shared Home/Pause/lobbies, contextual touch foundations, compact layouts, exact Back/focus and many keyboard/virtual-pad journeys. | Complete mouse-free and touch-only journeys, actual Steam Deck Confirm, iPhone safe areas/browser bars/lifecycle, zoom and forced colors.                                              |
| Pictures, stories, packs and reward library     | Local image/video creation, bounded media editing, portable packs, installed custom modes and retained earned-media ownership.     | Real codec/mobile coverage, quota/corruption stress, complete win → story → Collection → offline recovery; independent pack reproduction.                                              |
| Continuous music, MP3s and playlists            | Streaming/catalogue, custom uploads, playlists and optional offline infrastructure are present.                                    | Full listening, warning audibility, small-speaker/mono output, cross-mode interruptions, cold offline and unresolved volume observations.                                              |

The reported “Only static PNG/JPEG bytes are supported · Retry” item still lacks
a newer explicit closure receipt in the inspected feedback register. That is a
missing acceptance record, not proof that the current build reproduces it.

## 4. Content accounting and visibility

- Last retained ordinary public/browser counts: **91 Solo choices, 91 Versus
  choices and 12 Team missions**. Solo and Versus reuse campaign content; these
  are not 194 unique new maps. This audit did not recount every current install.
- The source Journey breakdown is **71 core + 12 Remixes + 8 optional studies**.
  Default Solo/Versus remains **v25**. Restoring and qualifying v38 does not
  automatically promote it to default play.
- The [Xposed Journey contract](xposed-journey-plan.md) supersedes the old
  132-mission allocation. **242 Solo candidates + 12 finale Remixes + 12 Team**
  is an authoring backlog, not shipped content or a minimum release quota.
- **18 source editions** exist. Social Drone UA, Victory Drones, Ukraine: Living
  Culture and FPV Learning are source-only additions with shared FPV fallback
  presentation; they are not four finished accepted branded campaigns.
- **40 Reserve originals** remain source artwork, excluded from normal runtime
  distribution. They are not 40 additional playable levels.
- The newer game soundtrack catalogue contains **77 recordings**, with scoped
  public catalogue/transport evidence. That is not full-track human listening.
  **0/36 original compositions are approved**; original production remains paused.
  Private uploads are not automatically admitted for public redistribution.
- Old library totals and the original targets of 116 pictures, 12 stories and
  56 complete animated presentation sets are not current accepted-completion counts.

This distinction explains why a merged source gallery, reserve illustration or
candidate level may not appear as a new default mission.

## 5. Remaining original phases

The original whole-game **P00–P18** identifiers below differ from the later
Journey P00–P15. Do not close one programme using another programme's numbering.

| Phase                               | Status                                                         | Definition of done still outstanding                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P00 baseline                        | Initial scope complete; cumulative qualification partial       | Each integrated source keeps compatible saves, records, content and build identities.                                                                                   |
| P01 loading                         | Initial scope complete; new-path closure partial               | Every delayed, failed, cancelled and stale operation retains state and correct opener/focus.                                                                            |
| P02-A sound authority               | Historical scope delivered; current regression closure partial | Mute/volume remain authoritative across every current mode, preview, video and late playback promise.                                                                   |
| P03 native navigation               | Partial                                                        | Start → selection → briefing → flight → Pause → Help/Settings → Back → explicit Resume with every advertised input; no mouse-only dead end.                             |
| P05 readable presentation           | Partial                                                        | EN/UK, Plain/Large, reduced effects, 200% zoom and supported high-contrast behavior across player and tool surfaces.                                                    |
| P08-A art/actor parity              | Partial                                                        | Correct original artwork and recognizable actors in Solo/Versus/Team; whole arena, clear roles and actual-scale readability.                                            |
| P08-B action feedback               | Partial                                                        | Trails, impacts, capture, destruction/recovery, bonuses, rescue and victory consistently explain events across modes.                                                   |
| P09 challenge                       | Partial                                                        | Complete legal routes and readable counterplay across advertised presets/seeds; replay/checkpoint compatibility and human fairness.                                     |
| P07 rewards/continuation            | Partial                                                        | Retry/Next/endings/story paths preserve results and ownership, recover from failures and never duplicate awards.                                                        |
| P02-B music experience              | Partial                                                        | Custom/built-in/mixed playlists in every advertised mode; actual transfer/offline/interruption recovery and listening acceptance.                                       |
| P04 creation framework              | Partial                                                        | Real create/edit/preview/export/import/play/recovery with exact original bytes and complete cross-mode previews.                                                        |
| P06 discovery/install               | Partial                                                        | Compatible content can be found, installed, replaced, removed and recovered within limits without losing the working game or run.                                       |
| P10 Team encounters                 | Partial                                                        | Full separate Team matrix, complementary routes, Support/rescue, clear two-player state and physical inputs.                                                            |
| P11–P15 themed production           | Partial; revised allocation                                    | Finished FPV/DroneAid/Ukrainian/Retro/Coupa campaign slices with approved art, sound, design variety, progression and their own release evidence.                       |
| P16 supporting workflows            | Partial                                                        | Collection, records, saves, replay, learning, legacy content and complete media/history/help recovery.                                                                  |
| P17 reproducible authoring          | Unfinished acceptance                                          | An independent fresh workspace creates, installs, plays, exports and recovers a pack using maintained guides, skills and CLI.                                           |
| P18 whole-game qualification        | Unfinished                                                     | Cumulative performance/memory, accessibility, storage/media/offline/lifecycle, public journeys, physical devices and human assessment.                                  |
| Native stores / network multiplayer | Deferred, separate gates                                       | Reviewed native payload, stage/build/sign/device/store acceptance; authoritative online sessions/reconnect for networking. Couch play remains part of the browser game. |

## 6. Near-term delivery order

Prioritize finishing the current game over expanding tools and campaign counts.

1. **Integrate and publish ready bounded source.** Finish the open native-input,
   Demo, media/offline and reader fixes below. Resolve each candidate's real gate
   failures, retain its source identity and verify the actual deployed journeys.
   Do not hold a ready browser subset for unrelated native packaging or art.
2. **Complete current roster and reliable native play (A / C3).** Close current
   character-state, layout, input and return defects at actual playing size.
   Preserve the approved imagery while doing this.
3. **Complete optional encounters and difficulty evidence (B / C4).** Finish
   full-route controls/seeds, readable counters and Team combinations. Expert
   Cooling loop and Switchback still lack established complete routes in the
   current Levels record; unsuccessful probes are not proof of impossibility.
4. **Finish one coherent Ukrainian/FPV cohort (C / C5) with necessary C6 tools.**
   Prepare sources and precise authoring support. Production/cultural/native-pixel
   review is deferred at the user's request, not passed. No silent replacement
   of earned originals or default edition promotion.
5. **Complete C7 / UX6 and original P18 across the whole content set.**
   Run complete player journeys, offline/update/recovery, frame-time/memory and
   accessibility checks; qualify real touch/controllers and browser lifecycle.
6. **Formal comparison and player sessions (C2) last.** Use actual newcomers and
   experienced players; record satisfaction, comprehension and fairness. No
   automated route or attractive screenshot proves replay value.
7. Continue broader media/community production when rights and environments are
   ready; expand campaigns and native/online distribution through separate gates.

### Current pushed inputs

Queue observed at 20:49 CEST, with #872’s target confirmed at 20:51 CEST.
Later source heads need their own checks. “Ready” below
means a successful observed source admission check, not merge/public acceptance.

| Work                                  | Open inputs                                                                                                                                                                                                                        | Remaining gate                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ukraine gallery and source readers    | [#846](https://github.com/mekhovov/revealline/pull/846), [#857](https://github.com/mekhovov/revealline/pull/857), [#863](https://github.com/mekhovov/revealline/pull/863), [#870](https://github.com/mekhovov/revealline/pull/870) | Complete exact-source checks; #857/#870 remain intentionally draft; preview/input/lifecycle evidence is not production art approval. |
| Selector and Demo controls            | [#867](https://github.com/mekhovov/revealline/pull/867), [#866](https://github.com/mekhovov/revealline/pull/866)                                                                                                                   | Finish candidate and current-host journeys, including Confirm release and portrait/landscape transitions.                            |
| FPV review and audio failure recovery | [#862](https://github.com/mekhovov/revealline/pull/862), [#858](https://github.com/mekhovov/revealline/pull/858)                                                                                                                   | Source admission observed ready; final candidate/public and physical/listening evidence remain.                                      |
| Demo pacing                           | [#856](https://github.com/mekhovov/revealline/pull/856)                                                                                                                                                                            | Hold remains; reconcile cancelled capacity run rather than treating cancellation as a pass.                                          |
| Older Team imports/projectile loss    | [#868](https://github.com/mekhovov/revealline/pull/868)                                                                                                                                                                            | Draft: resolve provenance and full Pages capacity blockers below.                                                                    |
| Offline verification                  | [#869](https://github.com/mekhovov/revealline/pull/869)                                                                                                                                                                            | Complete exact-source checks and real installation/recovery; fixture repair alone is not installed-offline proof.                    |
| Planning records                      | [#871](https://github.com/mekhovov/revealline/pull/871), [#872](https://github.com/mekhovov/revealline/pull/872)                                                                                                                   | Reconcile documentation on current main; do not delay verified player fixes for these records.                                       |

## 7. Blockers and acceptance limits

| Concern                          | Exact scope and next action                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Team candidate budget/provenance | #868 reports **951,900,757 bytes**, exceeding the **950,000,000-byte** Pages ceiling by **1,900,757 before metadata**, and a stale generated revision ledger. Correct scope/provenance and reproduce exact bytes. This blocks that candidate, not proof of a current deployed-site failure.                                                                                    |
| Native payload capacity          | [#865](https://github.com/mekhovov/revealline/issues/865): **949,537,804 bytes** versus **805,306,368 bytes (768 MiB)**, **144,231,436 over**. Review distribution scope/capacity without silently deleting assets or raising the guard to pass; then stage and verify. Desktop/iOS compilation and hardware follow separately.                                                |
| Tight optional-edition headroom  | The older Company size failure is superseded by passing later compiles. #854 reports 18/18 with only **124,505 bytes** under the 64 MiB cap for the largest output. #869 reports **1,220,046 bytes** headroom for its largest mandatory cache. These are different inventories; neither certifies all installations.                                                           |
| Release administration           | Current inputs target v0.150.0, but the active-release variable still names v0.142.4 and the milestone retains older predecessor wording. Coordinator must reconcile final publication metadata; this alone is not proof continuous Pages is broken.                                                                                                                           |
| Test policy                      | Automated suites are temporarily waived and must be reported **WAIVED_SKIPPED_NOT_PASSED**. Keep source identity, validation, localization, generated-source/provenance, build/capacity and startup requirements. Final whole-game qualification remains open.                                                                                                                 |
| Production and human review      | Artwork/cultural/production review is deferred. Actual listening, balance/play sessions, iPhone/Steam Deck/other hardware and accessibility acceptance cannot be inferred from synthetic input or resized desktop screens.                                                                                                                                                     |
| Independent creation/community   | Example downloads and domain validation do not establish browser install/recovery. Community still needs a chosen live environment, DNS/TLS/proxy/mail/accounts/storage and an actual external two-user flow. This is distinct from online multiplayer.                                                                                                                        |
| Retained feedback/history        | [#813](https://github.com/mekhovov/revealline/issues/813), [#824](https://github.com/mekhovov/revealline/issues/824) and [#826](https://github.com/mekhovov/revealline/issues/826) need final scoped receipts. Enemy wrapping/Still Media assertions and Discovery suspension have merged; older Team compatibility and complete Studio history return are not thereby closed. |

### Effort ranges, not release-date promises

The current milestone has no due date and the publisher has unresolved gates.
There is no defensible calendar ETA for a complete public/native game.

Existing owner estimates, measured from each workstream's start:

| Workstream                                   | Planning effort and dependency                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Current roster/reliable play                 | 3–5 working days; release only independently verified slices.                    |
| Encounter combinations                       | 3–5 working days; separate full-route evidence is 1–3 days in small batches.     |
| Unresolved Expert routes                     | 2–6 hours per bounded authoring pass, with unsuccessful cases reported honestly. |
| First Ukrainian/FPV cohort                   | 2–4 working days once deferred review can resume.                                |
| Broad technical/player-journey qualification | 4–7 working days plus required device availability.                              |
| Independent creator reproduction             | 1–2 working days once the selected inputs/environment are stable.                |
| Formal player comparison                     | 2–3 working days plus actual participant availability.                           |

These ranges overlap and are not an additive overall deadline. Re-estimate after
each accepted batch; complete native-store, community-hosting and online work
requires separate environment and scope decisions.

## 8. Tracking and delivery discipline

Each item records: scope, status, exact source/PR, acceptance evidence, remaining
issue and playable URL. Use **Proposed → Ready → In progress → Verification →
Complete**; complete means its own stated delivery gate has passed.

- Review related hunks, preserve other owners' edits, commit and push each
  reviewable slice. Reuse or create the correct scoped PR and existing target.
- Keep one release coordinator. Do not independently bump competing versions or
  merge historical recovery branches just to make old working trees clean.
- Qualify the actual final source after integration. Historical focused results
  and waived jobs cannot be relabelled as current passes.
- Publish immutable artifacts, deploy, verify the public version/inventory and
  affected journeys, then update this rollup. Preserve rollback and prior records.
- Required skills, prompts, validators and guides travel with the feature they
  describe; independent reproduction is still a separate P17 gate.
- This planning review ran no game suite, full build or gameplay audit.
  It inspected source, GitHub status, retained evidence and small public metadata.

## Evidence and detailed owner ledgers

- [Original phase crosswalk and history](cross-mode-execution.md)
- [Player-first UX contract](player-first-ux-execution.md)
- [Xposed Journey contract](xposed-journey-plan.md)
- [Scoped September 30 source/actor register](plan-status-2026-09-30.md)
- [Levels and route evidence](plan-status-2026-09-30-levels.md)
- [Character/game-feel plan](character-game-feel-plan.md)
- [Native menus and Creator evidence](native-menu-plan-status.md)
- [Soundtrack public receipt](verification/soundtrack-public-20260930/README.md)
- [Recorded feedback](player-feedback-register-2026-09-23.md)
