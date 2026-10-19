# Company edition phase status — 28 September 2026

This record separates shipped source, candidate evidence and public company-edition promotion.
The default Reveal Line v0.141.7 release is public. Its main source contains the Coupa and
DroneAid framework and campaigns, but `publishing/pages-controller/editions.json` still has an
empty release list. No standalone company edition is therefore claimed as publicly selected.

## Completed phases

| Phase                   | Result                                                                                                                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Framework foundation | Brand/edition registries, player projections, runtime catalogues, exclusion reports and fixture editions are on main.                                                                                                       |
| 2. Coupa vertical slice | The official flower presentation, whole-game Coupa UX, reduced motion and the first complete mission are on main.                                                                                                           |
| 3. Independent editions | Fourteen independently scoped PWA candidates compile reproducibly with stable identities, scoped workers and edition-aware persistence. Automated coexistence, interruption and rollback models pass.                       |
| 4. Release admission    | Additive edition envelopes, source eligibility, original ZIP-member validation and immutable candidate CI are on main.                                                                                                      |
| 5. Learning and reuse   | Twenty-four optional Coupa activities and the DroneAid Netherlands proof campaigns use shared engine mechanics and data-driven presentation. The user reported formative playtesting complete.                              |
| 6. Content expansion    | Thirty Coupa and thirty-six current DroneAid Netherlands missions have distinct maps and raster pictures; three Portuguese historical missions remain separate. All 414 route fixtures retain legal deterministic outcomes. |

PR #615 was merged through cumulative integration commit `b0d0a819c1` and is an ancestor of
main. Main `6fe52474b5b395a5c416bd388555d488db33f287`, tree
`282cb34616d7641ed9ca84465e228d11878d8495`, publishes the default v0.141.7 game.

Phase 7 evidence maintenance subsequently merged as PR #725 at main `4cb5e3199e`, tree
`d75300e6e5`. It does not change the published default game or populate the standalone edition
selector. Exact-main [candidate CI 36367544165](https://github.com/mekhovov/revealline/actions/runs/36367544165)
passed and uploaded artifact `10948100942` (725,315,513 GitHub-reported bytes).
The current maintenance base is main `c5885a1556`, tree `39bf58fda8`; exact-main
[candidate CI 36368498099](https://github.com/mekhovov/revealline/actions/runs/36368498099)
passed and uploaded artifact `10948975755` (725,315,743 GitHub-reported bytes).

## Post-merge technical evidence

[Company candidate CI 36363707594](https://github.com/mekhovov/revealline/actions/runs/36363707594)
passed on exact main. A separate local rebuild compiled all 14 editions twice and matched 57
artifact descriptors, 14 current and 26 retained presentation receipts. It excluded seven
generation receipts and 94 master-image references. The independent report contains
880,309,045 descriptor bytes and has SHA-256
`6a91c854023a1a3e62acfcfcc20833b26354bfb674c141fed0ec506a0c39424e`.

The downloaded Actions artifact `10946443625` is 725,315,644 bytes with SHA-256
`40c79ef021424ac1a7715088050f255d0d3b7ab45d0e85e70ba88aea18e968ea`,
matching GitHub metadata. All 57 independently rebuilt artifacts and all 58 downloaded
checksums match. Source eligibility admits 19,860 paths and 136 media assets. The receipt
SHA-256 is `900df7b12c0dde6e05472b3c3851354da54e2d4b0d8cb1b1e74ce680a5f3f2c7`.
The largest offline payload is `droneaid-nl-community` at 63,795,060 bytes / 602 files,
leaving 3,313,804 bytes below the unchanged 64 MiB limit.

This evidence establishes candidate integrity. The candidate remains `publicEligible:false`.

## Phase 7 release batches

1. **Evidence maintenance — current batch.** Bind main's exact candidate/download receipts and
   make desktop observations identify opening play, advanced encounters, picture reveals and
   edition-switch sequences. This changes review tooling and documentation only, so it does not
   allocate a product version or enter the serialized freeze lane.
2. **Human and device evidence — explicitly deferred.** Record final Coupa/DroneAid asset and
   content approval, actual assistive-technology/input results, and two OS-installed PWAs
   exercising offline launch, update, rollback, storage failure and backup transfer when this work
   resumes. Evidence must name the exact artifact. The bounded qualification recorder binds every
   observation to the envelope, source tree, downloaded artifact SHA-256, editions, device
   environment and required scenarios; missing or failed observations remain non-promotable.
   Meanwhile, the review compiler can be completed and tested without creating a passing review.
3. **Primary company promotion.** After every required gate passes, allocate one release root and
   freeze the exact source once. Upload all qualified edition archives, but initially select only
   `coupa-all` and `droneaid-nl-community` for Pages. Measure the complete hosted output against
   the 950,000,000-byte operational cap before changing the selector.
4. **Audience rollout.** Add the twelve campaign-specific editions through bounded selector-only
   maintenance batches, reusing the same immutable release assets. Admit each batch only when the
   assembled Pages total remains within the cap. A selector batch does not rebuild gameplay.
5. **Rollback and public-byte closure.** Exercise a published-artifact rollback for one edition,
   verify the other remains selected, then match downloaded release and deployed public bytes to
   the qualified receipts.

The release train is serial for product roots. Keep evidence and selector-only work separate from
runtime changes so those maintenance batches can merge without reserving another product version.
Do not append assets to the already published v0.141.7 release or overwrite any immutable bytes.
