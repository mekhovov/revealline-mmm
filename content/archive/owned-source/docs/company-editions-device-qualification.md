# Company edition device qualification

Current Company candidates use the [80 MiB complete-package policy](company-package-capacity.md)
and [optional actor voice packs](company-actor-voices.md). Historical 64 MiB artifact
receipts below remain valid only for their original bytes. The new candidates need
fresh device/offline observations; successful build admission does not fill these rows.

This is the executable check list for the remaining installation, offline and recovery work.
It does not reopen formative playtesting: the user reported that complete on 26 September 2026. It does not certify artwork, hardware or a public release. Record an observed result
for the exact artifact; leave an unrun case pending.

The historical maintenance checkpoint below is v0.141.7 commit `c5885a1556`, tree `39bf58fda8`.
See the [current phase ledger](discovery-rewards-phase-status.md) for later source revisions
and scoped candidate results; they do not retroactively qualify these device scenarios.
[Candidate CI 36368498099](https://github.com/mekhovov/revealline/actions/runs/36368498099)
passed on that exact main commit and uploaded Actions artifact `10948975755`, named
`company-candidate-c5885a15561a88331c5566c5312392c4e5d8daf5`, with GitHub-reported size
725,315,743 bytes. The artifact remains a candidate and does not retroactively populate the
physical-device rows below. A reviewer must download it and record its independently computed
SHA-256 before using it for device evidence.

Use the [qualification recorder](verification/company-qualification.html) to bind observations
to the frozen `editions.json`, the complete downloaded artifact and its exact main source. The
recorder starts every gate pending, requires actual non-emulated device details for device claims,
requires both primary editions for cross-edition checks, and exports a public-review candidate.
It does not approve or publish anything. The final product release will have a different immutable
version/envelope, so observations must either be repeated against that envelope or explicitly
remain preliminary.

Human and physical-device observations are intentionally deferred. Leave their recorder rows
pending until that work resumes. Technical preparation may continue, but the promotion compiler
will produce no `edition-review.json` while any required scenario remains incomplete.

## Evidence available

The following independently checked historical candidate is commit
`6eff662a638bf26cfe13c0bdc433b12a3fde4954`, tree
`0e210fe8915b5ee49fda1ae202504f19ef197740`, candidate version `v0.141.6`.
[Candidate CI 36273633044](https://github.com/mekhovov/revealline/actions/runs/36273633044)
passed the separate company (267), review-tool (16), actor/replay (54), persistence/offline
(41), publishing/source-format Node (80) and Python (63) cohorts. These are separate,
potentially overlapping cohorts, not a unique-test total.

Downloaded artifact `10917115281` is 721,012,887 bytes, SHA-256
`005af54c8c098d48ac8e68cb1715107f36b00c0489a0f3c643dc1e36104454e0`.
All 57 independently built artifact descriptors and 58 downloaded checksums match, with
14 current and 24 retained presentation receipts. The frozen source receipt admits 19,449
paths and 135 assets. The largest offline inventory is 62,977,888 bytes, leaving 4,130,976
bytes under the unchanged 64 MiB cap. These receipts do not qualify subsequent merges.

| Area                          | Passed evidence and its scope                                                                                                                                                               | Remaining observation                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installation identity         | Generated manifests have distinct stable edition IDs, exact icons, scoped launchers and immutable release worker paths.                                                                     | Install Coupa and Netherlands editions as two real OS apps; close the browser and launch both from the OS. Desktop and phone results must name their actual device.                                       |
| Offline completeness          | Generated-worker tests check every byte, reject corrupt/overlong downloads and enforce 64 MiB / 2,000 files. Earlier desktop browser cache reloads succeeded with the local server stopped. | Repeat the offline launch and mission/tool checks on the final frozen artifact in each target installed browser.                                                                                          |
| Update and rollback           | Tests keep the previous selection through interruption, waiting workers and failed verification; explicit rollback preserves both versions.                                                 | Observe two distinct frozen versions on one origin, then offline rollback. A published-artifact rollback remains a separate deployment check.                                                             |
| Edition isolation             | Worker/message ownership, stable writer leases, backup audience checks and selector tests pass.                                                                                             | Run both installed editions together, update only one and confirm the other's selection, progress and offline files remain usable. These namespaces are not a security boundary against same-origin code. |
| Storage and backup            | Fault injection covers denied reads, quota/write failures, interrupted transactions, exact exports and rejected foreign/corrupt imports.                                                    | Recover actual exported progress, saved flight and optional-learning records on a second disposable origin/profile. Actual browser eviction or quota exhaustion is unobserved.                            |
| Historical presentation       | Source/player receipts and exact picture pins match; tests restore retained pictures and preserve the active replay after failed replacement.                                               | Continue a retained-art flight and replay its original picture in the final installed artifact; no silent substitution of current art.                                                                    |
| Discovery recovery            | Component tests preserve first-earned receipts, reject foreign backups, resolve registered exact historical media and cancel late image/media loads.                                        | Exercise the Discovery recovery extension below against two frozen versions. Actual installed-app missing-media recovery and reward rollback remain pending.                                              |
| Performance and accessibility | Responsive desktop observations and bounded observer/tests are recorded separately.                                                                                                         | Final same-device baseline/candidate measurements, physical touch/controller use and assistive-technology checks. A desktop viewport is not phone evidence.                                               |

On 27 September, read-only local inspection found Safari 27.0
(`21625.1.29.18.28`) installed on macOS 26.7. Apple's documentation supports Add to Dock web
apps on macOS Sonoma 14 and later, so this machine meets that documented prerequisite.
[Safari web apps on Mac](https://support.apple.com/en-ie/104996) have website data separate
from Safari; browser-tab preparation must not stand in for verification inside the installed
app. Native `getApp('Safari')` inspection returned **Computer Use permissions are not granted**.
This blocks native automation at present; it does not mean Safari is absent or installation is
unsupported. No site installation, browser setting, cache or user profile was changed. A usable
native control surface and exact frozen local server are required before executing those steps.

## Repeatable automated checks

After the main merge is resolved, run from the repository root. These use disposable test
stores and generated workers; they do not install apps or touch a player's browser storage.
On the working tree after main merge `f67252755`, this exact command passed 80 tests with
zero failures or skips. It is a focused compatibility result, not a new frozen artifact.

```sh
node --test \
  scripts/test-edition-offline.mjs \
  game/test/edition-offline-client.test.mjs \
  game/test/company-storage.test.mjs \
  game/test/installed-app.test.mjs \
  game/test/profile-transfer.test.mjs \
  game/test/profile-channel-reader.test.mjs \
  publishing/edition-promotion.test.mjs
```

The worker cases include partial download repair, unavailable cache storage, checked online
fallback, foreign-client repair and preservation of the retained edition. Client cases include
abort, timeout, waiting registration and disposal. Storage tests distinguish inaccessible data
from empty data. Promotion tests verify the complete retained selector, exact tag/commit/tree,
archive and evidence bytes, and preserve concurrent selector edits. A green run establishes
these injected conditions only; do not exhaust the workstation's disk to simulate device quota.

Discovery-specific component checks can be repeated separately:

```sh
node --test \
  game/test/completion-reward-store.test.mjs \
  game/test/completion-reward-media.test.mjs \
  game/test/edition-rewards.test.mjs \
  game/test/reward-media.test.mjs \
  game/test/reward-audio-groups.test.mjs
```

These fixtures cover exact receipts and imports, missing or corrupt retained media, late
completion after closing, and bounded native-media/URL ownership. They do not exercise a
real installed app, a published-artifact rollback, browser eviction or native decoder memory.
The [desktop observer](discovery-desktop-observations.md) measures separate public UI cycles;
stable connected counts do not replace these recovery cases or prove detached-resource release.

## Same-device local runbook

Use one disposable browser profile and one loopback origin for coexistence/update checks.
Use another loopback port or disposable profile for backup recovery. Keep the hostname fixed:
`localhost` and `127.0.0.1` are different origins. Keep real player profiles and unrelated
service workers untouched. Browser preparation and app installation are distinct actions.

1. **Stage original bytes.** Choose two independently verified frozen versions, A and B,
   containing `coupa-all` and `droneaid-nl-community`. For each selected distribution, verify
   its envelope descriptor and inspect the ZIP with `inspectEditionZip` against the matching
   manifest. Stage its original members under
   `/revealline/editions/<id>/releases/<version>/site/`. Copy the selected frozen `app/`
   launcher to `/revealline/editions/<id>/app/`; only its `current.json` points to
   `../releases/<version>/site/`, as in the publisher. Verify every frozen staged file again.
   Do not relabel a ZIP, edit its build metadata, or put different builds at the same version
   path. If only one verified version is available, mark the real update/rollback case pending.

2. **Serve on loopback.** With the verified tree staged at `.cache/company-device-site`, run:

   ```sh
   node scripts/game-cli.mjs serve \
     --root .cache/company-device-site --host 127.0.0.1 --port 0
   ```

   Use the allocated port printed by the server; do not replace an existing development
   server. Open `/revealline/editions/coupa-all/app/` on that origin and the corresponding
   `droneaid-nl-community/app/` address. Both must name their own edition. From **Check
   available edition**, open version A. In Settings → data, choose **Prepare this edition
   for offline play**. Only after verification enables it, choose **Use this edition in
   the installed app**. Record edition, version, build ID, worker scope and inventory bytes.

3. **Observe real installation separately.** If the browser exposes an install action,
   install both stable launcher addresses and record their distinct OS entries and icons.
   Close their browser windows and reopen each through its OS entry. A normal tab or the
   in-app browser does not satisfy this row. An unavailable install affordance remains a
   recorded capability limit; it is not fixed by changing production manifests speculatively.
   Repeat **Prepare this edition for offline play** and **Use this edition in the installed
   app** inside each installed window. Record its actual progress/storage state; do not assume
   it inherits the Safari tab's caches or saves.

4. **Check offline and ownership.** Create different progress in each edition and export
   it. Stop only the loopback server, reopen both launchers, then use the prepared missions,
   retained-art selection, Controller Practice and Replay Theater. Explicit optional music
   downloads are checked only if prepared separately; they are not part of the core offline
   promise. With the server still stopped, **Check available edition** may report unavailable
   while the installed game and previous selection remain usable. Restart the same server.

5. **Exercise A → B → A.** Keep the other edition on A. Point only the first edition's
   local launcher at B and open B through **Check available edition**. Preparation alone
   must leave A selected. After B verifies, explicitly select it and reopen the stable
   launcher. Record B as active and A as previous. **Open previous edition**, prepare/verify
   it and select A again. Confirm the other edition still opens A offline and neither
   audience's progress was replaced. Exercise interruption by stopping the local server
   during a fresh B preparation, then retry after restarting; do not clear A's cache.

6. **Check recovery without erasing the source.** Export Journey progress and **Settings →
   Data → Discovery collection backup → Export discoveries** separately. Also export the saved
   attempt, optional learning and any separate picture data the UI requires; record which
   export contains which data. A Discovery backup retains exact promises and receipts; it
   does not create Journey wins or contain the original image/audio/video bytes. Keep the
   matching frozen release. A stored-profile diagnostic is not automatically an
   importable complete backup. Import into the matching edition on the second disposable
   origin/profile. Confirm the recorded mission, progression and exact presentation restore.
   In the other audience, attempt the same import and confirm rejection leaves its existing
   records unchanged. A changed-art flight must offer its exact retained snapshot. A replay
   made on a different math runtime may fail strict checkpoints; retain the original and
   record the rejection instead of accepting a substitute. Run the Discovery recovery
   extension below for earned rewards and their separately retained media.

7. **Record bounded failures.** Close a tab during preparation or import, reopen and retry.
   Confirm errors are visible and the earlier verified selection/export still works. If real
   storage eviction, denial or exhaustion is not deliberately exercised in this disposable
   profile, mark it unobserved; the automated fault-injection result remains separate.

8. **Keep evidence scoped.** Record date, actual OS/browser versions, device, viewport/input,
   origin, both commit/tree/version/build IDs, artifact SHA-256, steps, observed result and
   failure/recovery result. Attach only publication-safe screenshots/exports. Do not turn a
   normal tab, emulated viewport or automated fixture into an installed-device result.

## Discovery recovery extension — pending observations

A [bounded desktop observation](discovery-desktop-observations.md#exact-earned-image-failure-and-restoration) on exact `61a315090` now covers image denial and restoration with byte-identical Discovery exports. It uses one unchanged artifact and no installed app; it does not complete the A/B, transfer, native-media or physical-device protocol below.

Use the same frozen A/B artifacts and disposable origins as the runbook. Both versions must
support the selected logical edition and reward format, and B must declare A's retained
presentation when its artwork changed. Do not manufacture wins, alter a receipt, edit frozen
files or replace an asset at an immutable path. Human and physical-device execution remains
deferred; the following instructions are a protocol, not evidence that these cases ran.

1. **Establish an earned reference on A.** Win an ordinary mission through normal controls
   and open its image discovery in Collection. For native-media recovery, additionally use
   a legitimately earned recording with its poster/captions/transcript. Export both Journey
   and Discovery backups. Record the logical edition, reward ID/revision, receipt identity,
   exact asset IDs/SHA-256 pins, and whether each save is durable. Preserve the exported bytes;
   a session-only save must not be reported as a successful reload test.

2. **Transfer both authorities.** On the second disposable origin/profile, import the matching
   Journey backup through its existing control and choose **Import matching discoveries** for
   the Discovery backup. Compare the exported receipt identities and mission progress after
   import, then open the discovery. As a separate check in a fresh destination, importing only
   the Discovery backup must not manufacture a Journey win or score. A foreign audience/edition
   import must show a rejection and leave that destination's prior exports unchanged.
   Also try an older backup after the destination has registered a newer promise for the same
   discovery. The v1 store cannot retain two different promises under one reward ID: it must
   reject the import explicitly, keep both the current collection and original backup, and
   offer recovery with the matching release in a separate profile. A success message with
   missing old receipts is a failure. This is distinct from updating an existing installation,
   which retains its earlier promises.

3. **Keep A's promise after updating to B.** Follow the existing A → B activation steps,
   leaving the other edition on A. Reopen the earned discovery and export its backup again.
   Its original reward revision, requirements and exact media pins must remain unchanged;
   B's replacement artwork must not silently appear in that earned receipt. Record which
   registered retained snapshot supplies the old asset. Preparation alone must not change
   the active installation or the saved receipt.

4. **Observe a bounded missing-media failure.** In the disposable test environment only,
   close the viewer and use available browser request blocking or a reviewed task-local fault
   proxy to deny one exact earned-media request. Keep the frozen files unchanged and leave
   unrelated requests and storage available. Reopen the discovery and record that the selected
   request actually failed: a response supplied by an offline cache means this fault was not
   exercised. If exact request blocking is unavailable, leave this case pending rather than
   clearing the entire installation or changing asset pins. The viewer must retain its earned
   status and useful text, show the unavailable-media recovery state, and avoid substituting a
   current image or unrelated recording. Back must remain usable, followed by Next/Retry after
   closing the reader. Export again
   and compare the original receipt identity and payload pins, not merely the visible title.

5. **Restore the original and retry.** Remove only that request block, verify the original
   response against its frozen SHA-256, and reopen the viewer or explicitly choose Play for a
   recording. The exact image/recording must recover without rewinning or creating a second
   receipt; native media must not autoplay. Close the viewer during a separately delayed
   request, then allow the request to finish: no late image, playback or overlay may return.
   This checks visible cancellation, not detached decoder allocations.

6. **Return to A and preserve the other edition.** Follow **Open previous edition** and the
   existing verification/selection flow. Reopen A's earned discovery and compare its exported
   receipt with step 1, including exact media pins. Verify the other edition still has its
   own selection, Journey progress and Discovery backup. If a B-only reward or newer format
   cannot be displayed by A, record its explicit recovery limitation and preserve the B backup;
   do not discard it or count silent substitution as a successful rollback. An installed-app
   observation and a published-artifact rollback each require their own recorded environment.

For every case retain artifact/source bindings, the before/after backup hashes, exact affected
asset pin, failed and restored request evidence, and the observed UI outcome. Keep backups and
diagnostics private unless reviewed for publication. A completed local browser exercise may
support its exact desktop environment; it does not populate deferred physical-device or release
promotion gates automatically.

The existing `installed-pwa-isolation`, `update-and-rollback`, `storage-and-backup-recovery`
and `same-device-performance` gates consume reviewed evidence bound to the final envelope.
This document does not populate those gates, allocate a release version, change the published
selector or authorize publication. Use the existing review/promotion process once the actual
observations and the remaining artifact-specific reviews are complete.
