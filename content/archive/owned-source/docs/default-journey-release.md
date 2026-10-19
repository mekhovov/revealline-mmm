# Default Journey release — six-hour delivery

> **Current status:** use the
> [completed and remaining delivery plan](plan-status-2026-09-23.md) for released
> features, active promotion, prioritized remaining work and evidence limits.
> Dated “current” versions and “next” queues below are historical. Default
> Journey and unified-library delivery are complete; whole-game qualification
> is not. Update the linked status register after each public acceptance.

Approved scope resumed on 2026-09-22 at **14:13:56 UTC**. Feature scope freezes at
**15:43:56 UTC**; the public-delivery target is **20:13:56 UTC**. These are targets,
not permission to skip a failing gate. One publisher owns tags and Pages; at most
one successor is being prepared.

## Current release boundary

- **v0.83.0 is the accepted public baseline.** Source PR263 merged as
  `01b189f6427601a15cbb3eb1563b5f82eabbafa3`; selector PR271 merged as
  `e0f99c9642355aa3daf62ce3e551675b8c9d2e14`. Production run35775874062 deployed
  the frozen release. The publisher verified all3,809 files /613,866,928 bytes
  and basic public journeys. Extended manual/device checks remain open.
- The earlier v0.82.1 and all retained releases remain preserved. Historical
  implementation targets and evidence below are not current delivery claims.
- **v0.84.0 is allocated to Release B / PR268**, the unified mission selector.
  Its source includes accepted-main policy PR272 at `ce09a38c5`. This changes
  release test policy, not gameplay. Automated suites may be explicitly waived;
  source identity, validation, lint/format, build, immutable integrity, deployment
  and basic public acceptance remain mandatory. A skipped suite is not a pass.
- Default Solo/Versus/Team entry is now delivered. Unified browsing is the next
  release; its implementation is complete and final promotion is in progress.

## Feature contract and release notes

Queryless Solo and Versus enter `whole-spatial-v5`: **91 missions** (71 core,
12 optional Remixes and eight optional arc missions). Queryless Team enters
`team-spatial-originals-1`: **12 missions across five campaigns**. Returning
Legacy progress cannot redirect ordinary entry away from these defaults.

Start/Continue remain direct. Missions opens the selected Journey. Legacy remains
available through explicit `?journey=legacy` and visible catalogue controls,
with a New Journey return. Mode switching, Workshop return and interrupted
attempt departure preserve the resolved catalogue intent. Practice, courses,
explicit pack/campaign/level/play launches and historical return-token protocols
retain their own launch authority. Historical unknown, empty and duplicate
Journey parameter behavior remains bounded by each original host.

This release reuses existing Journey profile/session scopes and the reviewed
PR253/255 save-warning, Couch pause and initial-focus corrections. It adds no
mission/artwork, changes no simulation/difficulty/order, migrates no saves and
deletes no databases. Legacy awards are never granted to Journey completions.
The separate Shared Windows study is not a default catalogue.

Default menus use player-facing titles. Full human balance review is still open;
removing authoring terminology from menus is not a quality certification.
Original Journey pictures currently require online preparation; ordinary core
Offline preparation does not yet retain every Journey original. Full downloaded
distributions include the pictures. Keep this limitation visible and do not
claim comprehensive offline qualification.

## Acceptance ledger

Each item needs evidence for the final source and public build, not only a test
of an earlier candidate. Record failures and their corrections.

| Required check | Evidence category / completion boundary |
|---|---|
| Public root, direct Solo / Versus / Team show 91 / 91 / 12 | Native public UI plus exact version/source and selected asset-byte checks |
| Start launches first mission; Missions opens new catalogue | Keyboard UI and host regressions |
| Legacy campaigns/maps, installed content and return paths remain | Explicit Legacy fixtures; real catalogue/Workshop/mode return |
| Solo capture → loss/Retry → win/Next | Actual browser play plus deterministic host tests |
| Cross-campaign Next, optional-arc ending, final-core ending | Exact route/host regression and selected browser journey |
| Versus edition retention; Team first Next, revised-map transition and ending | Actual host play and selected native journey |
| Loading failure/retry/cancel cannot adopt stale content | Delayed host fixtures and visible status/escape behavior |
| Desktop, portrait and short landscape | Keyboard, browser touch and modeled controller recorded separately |
| Historical URLs, practice, courses and explicit pack launch | Existing behavior assertions with explicit Legacy fixtures |
| All six source gates, build, production reproduction/artifact integrity | PR family and merged exact-source qualification |

No fresh exhaustive 546-configuration Solo or Versus playthrough is claimed.
Physical controllers/touch, human balance and broad offline/lifecycle testing
remain separate follow-up gates.

## Delivery sequence and remaining work

Default-entry v0.83.0 is delivered. Finish and publish PR268/v0.84.0 next;
PR235 and unrelated follow-ups remain deferred. The historical targets were
implementation by T+60–90m, PR qualification by T+2–3.5h, merged
source/freeze by T+4–5.5h and public entry by T+5–6h. Fresh pipeline time is commonly
2.5–4.5h; a blocking rerun requires an immediate revised estimate.

The later approved follow-up places **Release B, a unified tagged selector,
immediately after A is publicly accepted**. It presents All (new first), Journey,
Classic and Custom in one browser, with content owner/revision-aware rows and
existing runtime dispatch. Preserve every current level and original ownership;
normal browsing must not download all media. It is separate from A's explicit
Legacy fallback and adds no simulation or artwork. Its implementation/review,
source qualification and public-delivery target is **7–11 hours from B's start**,
subject to the accepted mode-compatible inventory; no B source work is included
in A. Recovery and other queued features follow B, one release at a time.

After B, ship one independently verified item at a time. The following
ranges include expected release overhead from each item's start; they are not
additive commitments or guarantees.

| Priority | Remaining work | Estimate |
|---|---|---|
| Current delivery | PR268 / v0.84.0 unified tagged selector | Implementation complete; remaining build/release/publication queues determine ETA |
| After B | PR235 superseded PR-check cancellation | 2–4 hours |
| Next | PR252/257 backup preflight and Restore focus | 4–8 hours |
| Next | PR256 retained presentation/history recovery | 6–12 hours |
| Next | PR230/231 chapter retry, Replay restoration/navigation | 4–8 hours per feature |
| Next | Team presentation/roles/artwork stack, P08-A map parity | 1–3 days |
| Next | PR237/258/262 Studio toolbar/validation/Undo/Redo | 3–6 hours per release |
| Then | P03/P05 global Settings, sound, navigation/accessibility closure | 1–3 days |
| Then | P06/P07 unified catalogue, installation/endings, campaign offline | 2–4 days |
| Then | P04/P05 complete Studio/themes/exact restoration | 2–5 days |
| Then | P08-B/P02-B animation/audio qualification and listening | 1–3 days plus device/listening availability |
| Then | P09/P10 encounter/difficulty and Team qualification | 3–6 days |
| Deferred production | P11–P15 FPV, DroneAid, Atlas, Retro, Coupa | 3–7 days per first finished campaign slice; refine full scope first |
| Then | P16 Collection/learning/replay/legacy/supporting workflows | 2–4 days |
| Then | P17 independently reproduced community guide | 1–2 days |
| Final | P18 performance/accessibility/offline/physical-device qualification | 3–5 days after blockers close |

Keep all existing levels until later review. Online multiplayer, Deathmatch,
full Ukrainian translation, hosted administration and persistent co-op saves stay
deferred. Retarget dependent PRs before deleting parent branches.

## Workspace reconciliation

Implementation uses an isolated checkout of main `64ec9fd2` plus the reviewed
PR253/255 corrections. The original root remains on `677b0916` (v0.44.2), with all
five pre-existing staged soundtrack-related paths unchanged.

Read-only inventory found **397 dirty/untracked files (~1.05 GB)**: 26 exactly
match current main; 41 more match historical main blobs; 65 differ from current
main without an exact whole-blob history match; 265 are absent from current main.
The latter groups include mixed unfinished/stale work, supplied references,
research and local evidence. They require individual ownership review, not a bulk
commit or deletion. Field Kit CSS/boot match v0.45.0; presentation/runtime matches
v0.46.0. The root soundtrack catalogue is stale v1/zero tracks while main is v2/70
tracks. A dirty file is therefore not evidence of an undelivered feature.

## Maintainer verification prompt

“Verify ordinary queryless entry, not an authored preview URL: root/Solo/Versus/Team
must expose 91/91/12 missions with direct Start and visible Legacy/New Journey
switches. Exercise both catalogue intents across modes and Workshop, a saved
Continue, departure Stay/Leave, installed-pack and practice/course launch. Preserve
all simulation/art identities and custom data. Record first capture, loss/Retry,
win/Next, cross-campaign and ending cases, cancellation/failure and responsive input
checks. Run six gates plus build/production/artifact checks on exact source; publish
through the one release owner, audit deployed version/bytes and actually play the
ordinary public entry. Distinguish host, native, public, physical and balance evidence.”
