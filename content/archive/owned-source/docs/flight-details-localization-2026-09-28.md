# Delivery audit and Flight Details language correction — 28 September 2026

## Published and completed

The verified public baseline remains [v0.141.7](https://mekhovov.github.io/revealline/releases/v0.141.7/site/game/), frozen source `efbb3882b4edd447c8e9f60ed60c536a956d78f3`. Its retained deployment audit covers 2,223 files / 757,762,788 bytes with zero final failures. This entry did not rerun that inventory or certify physical devices.

The original whole-game phase meanings come from the [cross-mode execution register](cross-mode-execution.md#original-whole-game-phases-remaining-work-crosswalk). Journey and company plans reuse phase numbers; their source milestones must not be mistaken for acceptance of the original phases.

| Accepted original slice | Accepted scope |
| --- | --- |
| P00 — integration | v0.55.0 foundation; subsequent cumulative releases preserve compatibility |
| P01 — loading feedback | v0.57.4 scope; new loading journeys inherit its cancellation, focus and stale-result rules |
| P02-A — master sound | v0.58.1 scope; later cross-mode/device regressions still need their own evidence |

Saves, scores, Collection, replay, native-style menus, shared touch steering, configurable actors, packs, playlists and couch modes have published implementations. Their existence does **not** close the larger original phases below.

## Implemented, awaiting integration/publication

- [PR724](https://github.com/mekhovov/revealline/pull/724), exact `7e8bcca181dc5047dd978739fbea4d6c64fc2a4c`: shared touch release/cancellation recovery. The reviewed branch is unchanged; 143/143 scoped owner tests and a separate 68/68 coordinator subset are recorded. It is not a new public release.
- This branch, based on main `c5885a15561a88331c5566c5312392c4e5d8daf5`: P05/P03 Flight Details EN/UK correction. Typed roles, objectives, pressure/erosion/lane clocks, bonuses, equipment and encounter explanations translate from the accepted paused snapshot. Generic controller and modifier-key names derive from captured bindings/device identity. Original notices and custom authored content remain exact. A language switch preserves the reader, focus, scroll, owner and checkpoint; Back remains paused.
- The existing mounted controller fixture now continues from the host's actual monotonic clock and supplies the configured neutral rearm interval. The old fixture failed against unchanged main as well. Production input protection is unchanged.

This correction belongs to the **following compatible batch**, not a silent expansion of the coordinator's reviewed aggregate. It allocates no version and claims no deployment. The source PR must retain all concurrent translation additions and regenerate `game/i18n/catalogs.mjs` from the reconciled resources. Changing `game/app.mjs` also requires the coordinator's applicable exact-source presentation/audio continuation checks even though no audio behavior changes here.

## Remaining original phases

| Phase | Status | Remaining acceptance |
| --- | --- | --- |
| P02-B — music | Partial | Cross-mode transport, real custom-media transfer/offline/recovery, rights and complete listening; PR716 successor is under reconciliation |
| P03 — navigation | Partial | Every return/Resume and full keyboard/controller/touch journey; public touch fix and physical Confirm qualification |
| P04 — creation | Partial | Independent upload/create/edit/export/import/play; history and failed-operation recovery |
| P05 — readable presentation | Partial | Remaining live EN/UK parity, Team consistency, Large/Plain text, zoom and contrast |
| P06 — discovery/install | Partial | Effective ownership inventory; install/update/remove, interruption, capacity and offline proof |
| P07 — rewards/continuation | Partial | Complete actual win/loss/Next/story/Collection journeys without duplicate awards |
| P08-A — artwork/actors | Partial | All required roles, heading/scale, compact/detailed sets and complete cross-mode boards |
| P08-B — action feedback | Partial | Cut/impact/capture/loss/bonus/Support/rescue clarity and reduced-effects equivalents |
| P09 — challenge/intelligence | Partial | Fair current-speed routes, deterministic encounter/replay proof and human balance review |
| P10 — Team encounters | Partial | Support/rescue/shared-objective and two-player encounter/readability matrix |
| P11-A–D / P12-A–D — FPV/DroneAid campaigns | Unclosed programme | Reconcile accepted mission inventory with the original campaign obligations; finish complete reviewed campaigns |
| P13 / P14 / P15 — Culture/Retro/Spend | Unclosed programme | Complete reviewed thematic campaigns with artwork, actors, sound, progression and rewards |
| P16 — supporting workflows | Partial | Collection, records, replay, restore, custom-media and legacy journeys |
| P17 — reproducible authoring | Partial | Independent fresh-workspace create → install → play → export → recover |
| P18 — browser qualification | Incomplete | Cumulative regression, performance, accessibility, media/offline recovery, real devices and human playtests |
| Native stores / online multiplayer | Deferred | Separate platform/signing/hardware and authoritative session/reconnect gates |

Do not reuse historical 15/29 picture families, 60/116 pictures or “0/4 campaigns” as current counts. The [company source record](company-editions-phase-status-2026-09-28.md) records 30 Coupa and 36 current DroneAid missions, but that does not imply standalone public selection, physical-device acceptance or closure of original P11–P15. Candidate counts and ownership records are not public mission counts.

## Next batches and release concerns

1. **Finish the existing coordinated aggregate.** Review its exact cumulative source, preserve PR ancestry, regenerate shared catalogs/presentation derivatives and pass the applicable final guards before allocating/publishing the next immutable release. PR729 includes PR726; stacked content/localization inputs must be integrated only once.
2. **Integrate this bounded Flight Details correction.** Reconcile onto the accepted aggregate, retain its focused evidence and run affected host tests there. Do not rewrite PR724 while it is under review.
3. **Close public acceptance gaps.** Verify the published entry, affected input and reader journeys, and authorized gameplay/offline checks against the exact release. Then use the UX6 acceptance matrix for the aggregate. Browser modeling is not real iPhone or Steam Deck testing.
4. **Finish content ownership and package efficiency.** Use effective inventory and measured bundle sizes before expanding downloads. Finish campaign benchmarks and human/device review before declaring the production programme complete.

The release coordinator owns merge/version/freeze/Pages actions. New compatible fixes are prepared as small PRs; an open PR or green unit suite does not mean the game is deployed. At the 02:22 UTC queue check, 18 PRs were open, including several stacked inputs and separate company/tooling work. This is a time-stamped queue observation, not a commitment to include all 18 in one release.

Timing is gate-based: this correction is ready for source review after its focused checks; publication depends on cumulative reconciliation, release checks and deployment. No reliable calendar ETA exists for the full remaining content/device programme. The current host has about 1 GiB free disk space; use bounded source work and existing dependencies, without large downloads, installs or a full checkout. No user files are deleted to create room.

## Verification and boundaries

See [the retained evidence](verification/flight-details-localization-2026-09-28/README.md). Original-runtime regression failures are retained separately from the corrected run. Encounter formatting retains both historical encounter versions and all phase/loss/defeat/freeze behavior. The shared catalog is decoded and compared against the complete locale source resources.

Full repository suites, production reproduction/readiness, ordinary build, browser visuals, audible listening, physical input, public playback and offline qualification were **not run for this branch**. The established full-suite waiver is not a passing result. These remain the appropriate coordinator/qualification gates. Runtime-maintainer guidance now includes captured locale facts, flat catalog keys and the full reader regression prompt.
