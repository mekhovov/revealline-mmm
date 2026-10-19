# SIM and community downloads

Implementation slice: 2026-10-02, `codex/sim-community-offline-20261002`.
Started from main `7ba34e68a`, then rebased onto `0ca7cd3d1` after the Pages
capacity correction merged. The original checkout and other agents' branches
were preserved. This is a release input, not a public-deployment receipt.

## Player flow

1. Open **Settings → Content & Offline → Install & offline play**.
2. Select individual communities and/or **SIM FPV · Flight simulator**.
   **Select all communities** selects every public community. **Select all games,
   communities, SIM & extras** selects the current playable catalogue in one step.
3. Review the displayed total and remaining bytes, then confirm the download.
   Selection alone never transfers a package. Verification and launcher preparation
   remain automatic after confirmation; interruption checkpoints remain reusable.
4. Use the **Play** link beside a prepared community or simulator. Community
   switching also remains under **Settings → Content & Offline → Communities**.
   SIM launched here has **Back to FPV / LINE** in its Settings.

The community directory also links directly to preparation with that community
selected. Public community Settings expose the same link. No new home-menu
controls are introduced, and normal online gameplay never requires preparation.
Play links remain usable when an experience has not been downloaded.

Soundtrack albums, historical archives and authoring tools are not selected by
the playable-content preset. Complete community rewards include their own media:
two listening activities reuse existing soundtrack hashes. This avoids duplicate
bytes but can increase the number of locally available recordings even without
selecting an album. Do not describe an all-community download as “zero MP3”.

## Dependency ownership and concurrent SIM development

`scripts/offline-experiences.mjs` derives community aggregates from
`COMMUNITY_ROUTES`: seven public routes covering eighteen company edition
descriptors. Each owner retains its existing artwork, content, reward-media and
save identity, and receives the shared/mode runtime dependencies it needs.
Missing members of an advertised community fail the build.

The SIM and flight-practice groups use the existing bundled-package builder's
validated dependency manifest, including shared dependencies outside their own
directory, vendor modules and generated worker. There is no hand-maintained
second SIM asset list. Missing dependencies fail the build. Hash-based storage
deduplicates shared files, and the legacy practice group remains readable.

An all-game selection now retains separately selected extras during preparation
and update selection restoration. This prevents SIM from being silently dropped
when the player selects all ordinary gameplay.

The SIM agent's unmerged mechanics, controls, graphics and curriculum work was
not copied into this branch. SIM source edits here are limited to a validated
return link and the startup declaration fix also present in PR #922 / #930.
The Flight practice directory PR #930 remains a separate publishing workstream.
When it is aggregated, reconcile its package policies and generated localization
bundle, retain one startup fix, and rebuild this catalogue from the final admitted
SIM manifests. Do not duplicate its launcher/package publication pipeline.

## Verification and boundaries

Automated suites: **WAIVED_SKIPPED_NOT_PASSED**, following
`publishing/test-policy.json`. Regression sources cover complete community
closures, shared hashes, missing SIM dependencies and update selection retention;
they were authored but not executed under the waiver.

Full localization generation, repository validation, lint and changed-file
formatting passed. The normal complete distribution was built in memory because
the host lacked space for another distribution directory plus ZIP. The preview
utility uses `prepareBuildProject`, including its normal validation. It is not
an alternative publisher or a way around release admission.

Browser evidence used the actual generated worker and official content store:

- A fresh selection of all seven communities and SIM displayed **198.8 MiB**,
  including the required starter/runtime/launcher. The verified selection became
  ready; all community and SIM rows reported ready.
- The bulk current-playable preset displayed **647.1 MiB**. It selected no
  soundtrack albums, archives or tooling and did not start a download.
- The preview server was terminated and a direct connection refused. Its CSP
  also disallowed external connection/media hosts; browser online status was
  not the offline oracle.
- Previously unvisited SIM loaded all eight built-in world choices and sixty
  challenges, started Lift and land, and advanced simulation time without
  console errors. An unvisited Open meadow free flight also rendered at
  390 × 844, armed with Touch selected, and advanced before being paused.
- The community directory opened offline with all seven Play/download routes.
  Coupa's First Connection mission started, responded to input and ran before
  pausing, without a preparation prompt or console error. Settings opened the
  community chooser; switching to DroneAid started Open the Doors offline, which
  ran for 48 seconds without console errors before being paused.

These browser observations used build
`59a00ad014543d2776422ec2cf6f5d8a3b652cd765e7ae81d56e50ea999eaa9f`.
Later edits clarify reward audio, narrow each owner's mode dependencies, and
expose preparation from community Settings. Final production-profile build
qualification is recorded below; the earlier screenshots are not evidence of
those subsequent edits or a deployed release.

Retained [browser build and request log](evidence/sim-community-20261002/browser-build-and-requests.txt),
[verified download state](evidence/sim-community-20261002/downloads-ready.jpg),
[SIM desktop](evidence/sim-community-20261002/sim-offline.jpg),
[SIM phone viewport](evidence/sim-community-20261002/sim-phone-offline.jpg),
[Coupa mission](evidence/sim-community-20261002/coupa-offline.jpg) and
[DroneAid mission](evidence/sim-community-20261002/droneaid-offline.jpg).

The final `main-pages` production-profile build passed on the rebased source:
build ID `dc7d5ce1c459541438502969ef5d334efa0d9e3b00ce68f32b0779297ea011a5`,
**950,112,942 payload bytes**, **65,083,999 core bytes**. See the
[generated inventory](evidence/sim-community-20261002/main-pages-inventory.json).
The core remains below 64 MiB. The payload exceeds main's 950,000,000-byte warning
threshold by 112,942 bytes, but remains below the 975,000,000-byte hard limit
adopted by main in PR #931. This branch changes neither limit. Controller files,
final assembled Pages capacity and immutable-release admission still require
their normal release checks. The fresh-origin browser verification of the final
community Settings link reached the password screen and remains pending unlock.

Physical iPhone/iPad, Android, desktop installed-icon, gamepad/radio, background
resume, storage eviction and full journey completion remain unqualified here.
The simulator still requires a browser/device with its existing WebGL 2 support.
Viewport checks do not establish universal device support. The latest main's
password screen was preserved; the main root return needs the user's normal
unlock. No password bypass was introduced for verification.

## Release

Queue as an input to the existing **v0.150.0 — Unified native experience**
milestone. Do not allocate a competing release number, merge the SIM stack,
upload packages or claim public availability from this change alone. Final
aggregate admission must rebuild the catalogue, check actual Pages capacity,
and retain the pending physical-device gates.
