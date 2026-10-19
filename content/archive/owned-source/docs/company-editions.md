# Company journeys

See [shared Solo implementation and acceptance boundaries](company-editions-shared-solo.md)
for the canonical host, selected tool pages and evidence required before qualification.

Company editions reuse Reveal / Line's deterministic simulation, renderer, replay verifier,
campaign compiler and Journey store. `game/company.html` is the edition entry point; the current
implementation connects company content to the canonical Solo host. All 14 editions have passed
shared-host startup and reproducible candidate compilation. Historical default content and the original Portuguese DroneAid pilot
keep separate content identities.

## Try a draft

Run `node scripts/game-cli.mjs serve --port 8768`, then open
`http://127.0.0.1:8768/game/company.html`. Choose a company and audience in the selector.
The generated catalog has 14 editions: six Coupa selections, the preserved three-mission
Portuguese DroneAid pilot, and seven Netherlands selections (the combined
`droneaid-nl-community` edition plus six individual chapters). The generator produces 101 JSON files.

For the next human review, use the [playtest packet](company-editions-playtest.md) and
[transfer practice page](../authoring/company-studio/playtest.html). The four practice tasks
change the fictional evidence and expected decisions without saving answers or earning
campaign progress. The user subsequently reported formative playtesting complete on 26 September 2026; final artwork and physical-device qualification remain separate.

The official Coupa flower spins once every two seconds with its enclosed transparent interior
filled by a render-time white backing. The Netherlands avatar uses the exact four propeller
paths extracted from the official Dutch logo, spinning twice per second. Original source
marks remain unchanged; reduced motion stops both rotations. Coupa uses paper tangles, missing-information clouds, stale fragments and backlog knots. DroneAid Netherlands uses six FPV quad families across all seven enemy roles, with four motors, a forward camera and animated propellers. Shared role badges, contact rings, warnings and enemy behaviour stay engine-owned. These are fictional game obstacles, not portrayals of workshop participants or recipients.

Five Coupa campaigns contain 30 distinct maps. Six DroneAid Netherlands campaigns add 36;
the three historical Portuguese maps remain available separately. All 66 current missions pin
`journey-trail-impact-v3`, `journey-actors-v9` and `journey-difficulty-v2`. The host applies its
normal `gameplay-pressure.v4` attempt recipe once; authoring does not bake it into geometry.
The historical pilot retains its exact earlier policy and source bytes.

Current content now uses genuine encounter progression, rather than repeating an
introductory enemy roster in every chapter. Coupa campaign windows are Bands 1–2,
4–5, 6–7, 8–9 and 11–12; Netherlands windows are 1–2, 3–4, 5–6, 7–8, 9–10 and
11–12. Each chapter introduces its assigned mechanic before combining it later.
The later chapters use moving frontier patrols, capture-activated roamers,
territory eroders, finite trail/heading locks, warning lanes, numbered return gates,
directional fields and shield/core encounters. These are the main Journey's
registered primitives. The 69 original wall/foundation topologies remain distinct;
new gates and directional fields are explicit authored geometry, never scenery rules.
Coupa campaign/pack/edition revisions advance to 4 and Netherlands to 2. Changed
mission and map revisions also advance; prior frozen releases retain their own pins.
Later standalone chapters are introductions to advanced mechanics, not novice
Band-1 courses. Their onboarding and pacing need human testing.

The Solo-first delivery contract offers the 24 fictional Coupa activities as optional bonuses
**after winning and viewing the revealed picture**. They do not block arcade progression.
Six are unscored culture reflections; 18 practice tasks use Inspect / Configure / Commit.
These are illustrative local records, not live Coupa operations. Historical replay/evidence
validation remains separate from the current bonus flow. Current shared-host tests and bounded
browser checks are recorded separately from human content and release qualification.

## Author and compile

The guided authoring page is `authoring/company-studio/index.html`. It edits a bounded source
packet and links the existing Asset Studio. Preview/export uses the Node compiler rather
than executing arbitrary uploaded code in the browser.

After verifying a compiled preview, step 06 records per-mission artwork observations against
that exact artifact and picture revision. Record the observer, actual viewport, motion and
scene state, then mark each check observed, issue or not observed. Export the observation
packet before closing the tab. Optional generation receipts expose matched inspection notes
and warnings without fetching original masters. Changing the source or verified artifact
preserves prior notes for export under their original binding; explicitly discard them before
starting a new artifact's record. These packets support final review but never grant approval.
Source and observation imports enforce byte limits while reading, before JSON parsing.

```sh
node scripts/produce-company-content.mjs
node scripts/produce-company-content.mjs --check
node scripts/compile-edition.mjs --catalog game/editions/catalog.json \
  --edition coupa-adventure --out .cache/coupa-candidate \
  --version 0.132.5 --offline-base-path /revealline/
```

The destination must not already exist. `game/company-campaigns/brands.mjs` and the authored
campaign/lesson modules are build inputs. Their generated JSON is checked in so a static
server can run the hub. The standalone player exports only the selected brand, campaigns,
lessons, approved assets and explicit runtime module dependencies. Source registries,
authoring history, other audiences and internal art provenance are excluded.
Supported runtime locales preserve generic engine messages; unrelated translation namespaces
and the legacy authored-content lookup are pruned. No runtime SVG importer was added.

`BrandPack` defines identity, allowed `themeIds` and asset/source references. The primary and
campaign themes supply distinct palettes, registered enemy recipes and procedural soundtracks.
Each mission selects its campaign theme; cosmetic differences do not alter engine behavior. `EditionManifest` selects
existing campaign projects and their boot content. The runtime catalog is an allowlist, not
a menu filter. Deep links cannot select omitted content.

`assets.json` is the public-byte inventory. `artwork.json` binds mission pictures to exact
hashes, revisions and dimensions in an immutable ledger. The authoring factory selects the highest positive integer revision for each picture ID and rejects duplicate revisions; retained presentations resolve their own exact embedded records. Artwork-only updates advance affected edition revisions and
asset identities, recompute exact execution/presentation hashes, and retain the previous selected
presentation. Unchanged gameplay, campaign and pack designs keep their revisions; logical Journey
progress remains compatible. Changed gameplay requires new gameplay identities and deliberate
progress migrations. Do not overwrite a published release.

## Persistence and restoration

The versioned context resolver keeps default installation keys compatible. New installation
channels, transfer journals and writer keys include edition plus engine release. Journey
progress and lesson mastery use stable logical edition keys; same-origin hub and standalone
views of that edition share them. Different audiences do not silently import one another's
records. Explicit backup/import transfers the same logical edition across origins.
Backups for other audiences are rejected; cross-audience migration is not implemented.

Solo attempts use `xonix-session.v6`, with the core replay, exact content reference and
pinned actor/picture presentation. Current-rules Classic projections use `xonix-session.v7`
to retain their exact original picture owner separately from the projected gameplay identity.
The original must already be installed; imported picture-source metadata is never installed
as campaign authority. Existing v1–v6 saves retain their formats and validation. Optional learning records have separate persistence and
backup; they do not change the attempt format or arcade progression. Restoration verifies
the replay and exact presentation before adopting the run. A missing older presentation
fails visibly rather than substituting new art. Keep its matching frozen release available.
Switching editions uses the shared departure flow: verify retention, then offer Stay/Leave.
A storage failure or occupied writer never silently discards the in-memory flight.

Only one tab writes an edition's progress. Other tabs can play without becoming a second
writer. Reduced-motion and other existing shared presentation preferences retain their
separate authority. Browser storage errors remain visible and export remains available.
An unreadable storage container disables durable writes rather than replacing unseen history.
Writer authority is checked again around asynchronous profile writes and recovery import.
Offline preparation has bounded timeouts, validates the exact edition/release receipt and can
repair an incomplete owned cache. An update waiting behind an open game asks the player to
close and reopen its tabs; it does not silently take control or erase another edition's cache.

Verified learning mastery stores its exact lesson/fixture revision, ordered actions and the
matching core replay. Hydration and import replay the simulation, evidence availability and
safe-checkpoint anchors. A saved `complete` flag has no authority. Rejected older records remain
in a bounded recovery journal for transfer to their matching release; they do not unlock new
lessons. Current optional learning export uses `revealline-edition-learning-backup.v1`,
carrying proof and recovery records for one exact logical edition with a 48 MiB import
budget. Inner replay, transcript, proof and recovery budgets remain independently enforced.
The historical company-player backup v2 is retained separately; it is not the Solo save format.

## Release sequence and gates

The current shipped-source and promotion batches are tracked in the
[28 September phase status](company-editions-phase-status-2026-09-28.md). Phases 1–6 are on main;
phase 7 is active. The public default v0.141.7 release contains the source changes, while the
standalone company selector remains empty until its separate approval and device gates pass.

The additive edition envelope must coexist with the default release format. Stable launchers
live at `editions/<id>/app/`; immutable sites live at
`editions/<id>/releases/<version>/site/`. Each edition has an explicit stable manifest identity,
separate service-worker scope and owned cache prefix. Storage is still origin-wide, so all
storage keys must remain scoped explicitly.

| Phase                   | Implemented                                                                                                    | Remaining acceptance                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1. Foundation           | Registries, player-only catalogues, exclusion reports and fixture editions                                     | Preserve compatibility as new packs enter                                                    |
| 2. Coupa slice          | Official flower, branded host, First Connection, pinned Continue/Retry and reduced motion                      | Final artifact visual review; formative playtest reported complete                           |
| 3. Independent editions | 14 editions compiled twice; downloaded artifacts independently checked                                         | Two actual OS-installed PWAs, update/rollback and device storage recovery                    |
| 4. Release admission    | Reproducible archives, whole-source eligibility, original ZIP-member admission and candidate CI                | A new freeze for every changed source revision                                               |
| 5. Learning/reuse       | 24 Coupa bonus activities, four transfer fixtures, six Netherlands chapters; user reports formative completion | Preserve any supplied observations separately from automated proofs                          |
| 6. Expansion            | 66 current maps and pictures plus three historical maps/pictures; 414 replay routes                            | Final artifact artwork/content review; preserve individual review records                    |
| 7. Promotion            | Evidence-bound delivery/selector tooling and rollback path                                                     | Approved evidence, release allocation, downloaded/deployed-byte verification and publication |

Candidate builds are not qualified releases. Public promotion requires the human and deployed
artifact gates below; private source must never enter a public source archive, evidence bundle
or GitHub release. Restrictive source checks run before the default source archive as well.
The Company runtime uses the shared 80 MiB / 2,000-file [package policy](company-package-capacity.md); ordinary core and artwork-pack limits remain unchanged. Measure the whole
hosted target against the GitHub Pages 1 GB limit before promotion.

### Candidate and promotion commands

Commit the reviewed source before building. The bundle command checks the actual Git commit,
tree and selected source blob hashes, compiles twice, compares archive bytes, then independently
inspects ZIP member names, CRCs, lengths and hashes. Outputs are immutable and never overwritten.

```sh
node scripts/bundle-editions.mjs \
  --editions coupa-all,droneaid-nl-community \
  --out .cache/company-candidate --base-path /revealline/
node scripts/publish-editions.mjs review-template \
  --bundle .cache/company-candidate --review .cache/edition-review.json
```

`Company edition candidates` runs on relevant pull requests and main changes, storing
the explicitly selected candidates as Actions artifacts for 14 days. The successful
14-edition runs and exact downloaded-byte receipts are recorded in the qualification log. The workflow now defaults to all 18 edition IDs; the command above builds only the two combined examples. It cannot publish releases. Each bundle
includes `editions.json`, standalone ZIPs, selected-source ZIPs, manifests, checksums and a
candidate verification receipt. The source ZIP is a selected input packet, not a full repository
checkout. The legacy full-source archive separately runs the public-source eligibility gate.

After the same source, double-build and archive-member checks, the existing job also uploads
`company-capacity-<commit>`, a separate metadata-only artifact bounded to 16 MiB. It contains
`capacity-inventory.json`, the exact envelope, candidate verification receipt, runtime manifests
and checksums. It does not include media, distribution ZIPs or source archives. The report's own
bytes are pinned by `checksums.json`, and every input manifest is pinned to the envelope and
the admitted source commit/tree. The complete candidate artifact remains separately available;
the report does not change its distribution or source archive bytes.

The capacity report gives each edition's exact immutable-site size, including its manifest,
and the additional stable launcher size using the publisher's shared pointer recipe. Its
aggregate assumes every candidate edition is hosted and active once; it is not a selected
deployment. Use individual rows to compare possible subsets. The report always states
`publicEligible: false`, `promotable: false`, and `completeHostedOutput: false`. Future default
output, retained editions, the generated hub and optional packages remain explicit unknowns.
There is no whole-site fit verdict, and downloading this packet does not reverify the omitted
ZIP bodies or establish human, device or publication evidence.

The review template starts with every gate **pending**. Reviewers supply public, approved,
hash-pinned evidence for automation, content, assets, human comprehension/pacing, accessibility,
two installed PWAs, update/rollback, storage/backup recovery and same-device performance.
Receipt structure and hashes provide traceability; they cannot establish the truth of a human
observation. Review these receipts through the repository's normal review process.

The qualification recorder exports one bounded record rather than a collection of manually
assembled gate files. After every edition gate is complete, compile that record into the existing
promotion schema and copy its exact bytes into the frozen bundle:

```sh
node docs/verification/compile-company-qualification.mjs \
  --bundle .cache/company-candidate \
  --qualification .cache/review-company-qualification-vX.Y.Z.json \
  --review .cache/edition-review.json
```

The command refuses incomplete coverage, changed envelope identity and existing outputs. It does
not allocate a version, upload an asset, alter a release or change the public selector. Deferred
human or device gates therefore remain a hard promotion boundary rather than an implicit waiver.

After those gates pass, `publish-editions.mjs verify` validates the exact bundle and evidence.
`upload-draft` additionally requires `--repository mekhovov/revealline`, an existing draft
release whose tag resolves to the bundle's engine commit and tree, and never replaces an asset.
It rereads every uploaded byte before producing a delivery receipt. The command does not create
tags or publish the draft. Allocate a new release version before promotion; a development
candidate using the current package version does not reserve or replace that release slot.

After the reviewed release is published, `sync-selector` downloads and verifies all artifacts
for the complete retained-plus-new selector, including the combined edition overlay budget,
and updates `publishing/pages-controller/editions.json` using `--selector` and
`--base-path /revealline/`. It preserves historical releases and selects one active launcher
per edition. Published-release checks resolve the explicit tag reference, and concurrent
selector edits abort the write without replacing another writer's changes. The existing sole
Pages publisher composes these verified edition files with
the default artifact and rechecks the combined 950 MB operational budget. Empty selection
preserves default publication. `editions/index.html` links the same standalone artifacts.

By default, `sync-selector` hosts every edition in the new envelope. An explicit `--editions`
chooses a nonempty subset from that exact envelope, without changing any ZIP or its review:

```sh
node scripts/publish-editions.mjs sync-selector \
  --bundle .cache/company-candidate --review .cache/edition-review.json \
  --editions social-drone-ua,victory-drones,ukraine-culture,fpv-learning \
  --selector publishing/pages-controller/editions.json \
  --repository mekhovov/revealline --base-path /revealline/
```

This example does not establish that those editions fit the future target. All envelope editions,
including omitted ones, must still pass the complete review, immutable tag and downloaded-byte
checks. Omitted new versions appear in the hub as explicit GitHub release ZIP downloads with
their exact byte size and SHA-256; they have no new hosted Play link. Existing versions' frozen
paths remain, and an omitted edition's existing active launcher is preserved. The selected
edition IDs determine hosted immutable files; changing only `activeEditionIds` does not save
their storage. A previously selected immutable version cannot be respecified to prune it.

Rollback changes the active edition selection to a retained version; it never rewrites frozen
release bytes or changes another edition's launcher. Use the verified local-selector command:

```sh
node scripts/publish-editions.mjs select-retained --version vX.Y.Z \
  --editions coupa-all --selector publishing/pages-controller/editions.json \
  --repository mekhovov/revealline --base-path /revealline/
```

It downloads and checks the retained published artifacts before writing the selected edition's
launcher choice. A failed check leaves the selector untouched. Review and deploy that selector
through the ordinary pipeline; this command does not publish or deploy. Additional distribution targets require
their own reviewed configuration. Restricted editions have no public promotion path.

### Whole-site capacity before publication

Per-edition asset budgets and ZIP sizes are not the complete deployed size. Count the default
site, all retained edition versions, stable launchers, the hub, optional packages and every
other generated route together. The main-only publisher retains its **950,000,000-byte** cap;
an edition overlay passing its own check does not qualify the combined target.

The small metadata packet from [candidate run 36447088737](https://github.com/mekhovov/revealline/actions/runs/36447088737)
was validated with `editionCapacityPacket`. It describes the **pre-rebase** source
`7acf6af53143c75f0ae99e09c25e326c1141c3e8`, tree
`03f97d6086490c3e60843e0292622c07a2066205`, candidate version `v0.142.0`.
It does not describe the later `v0.142.1` main merge or subsequent changes.
Artifact `10982502592` was 577,457 downloaded bytes (1,520,512 bytes of whitelisted metadata).
The 11,094-byte `capacity-inventory.json` SHA-256 is
`12e0c8d5f7bb4fa7fb5fcb4879857e3b52b450797ee531182658cf16a4b9cf0c`.

| Edition                   | Immutable site bytes | Active launcher bytes | Combined component bytes |
| ------------------------- | -------------------: | --------------------: | -----------------------: |
| `coupa-all`               |           60,368,706 |               237,387 |               60,606,093 |
| `droneaid-nl-community`   |           64,835,724 |                41,829 |               64,877,553 |
| `social-drone-ua`         |           25,064,550 |                12,721 |               25,077,271 |
| `victory-drones`          |           21,341,397 |                12,709 |               21,354,106 |
| `ukraine-culture`         |           39,573,383 |                12,761 |               39,586,144 |
| `fpv-learning`            |           32,319,419 |                12,685 |               32,332,104 |
| Four new editions alone   |          118,298,749 |                50,876 |              118,349,625 |
| All six rows              |          243,503,179 |               330,092 |              243,833,271 |
| All 18 candidate editions |          566,826,033 |             1,994,753 |              568,820,786 |

Immutable site totals include each runtime manifest. These component sums assume each listed
edition has one hosted immutable version and an active launcher. They exclude the hub,
previously retained versions, optional packages and other hosted files; they are not a selector.
The earlier published `v0.142.0` default manifest counted 740,350,558 content bytes
(excluding its own manifest). That older default is not a current capacity estimate.

The [committed default inspection summary](verification/evidence/discovery-2026-09-28-default-capacity.json)
records a successful preparation of `v0.142.1` at source
`8104e7bb0c4f52e4dc9bb1188b52361ac05cfc02`, tree
`93541d0836f368f3cf21e6c958167a76d358f414`. Its exact prepared default payload is
**795,373,867 bytes**: 794,976,856 content bytes across 2,150 manifest entries plus the
397,011-byte manifest. The manifest SHA-256 is
`a5a76dabec08d147982e726eafce2dc15c04ff1daff33f8aab9d8c60161d7a2c`.
The full 420,280-byte local inspection report is pinned by SHA-256
`4bd637d39d184da855285af43e4a5c6800ebf4f0a34cd75d8f5b42f2eb1bd47e`.
Normal build validation and source eligibility passed; no ZIP, expanded site or
reproducibility/publication receipt was produced.

Combining that measured default with the **older, different-head** edition packet above gives
only the following planning sums:

| Older edition components added | Combined component bytes | Gap to cap before uncounted components |
| ------------------------------ | -----------------------: | -------------------------------------: |
| Four new editions              |              913,723,492 |                             36,276,508 |
| Six selected editions          |            1,039,207,138 |                            -89,207,138 |
| All 18 editions                |            1,364,194,653 |                           -414,194,653 |

The four-edition gap is **not certified headroom**. These sums mix two source revisions and
omit retained edition versions, the hub, optional packages and other hosted routes. No subset
is cleared: exact frozen inputs from the selected release and the final combined publisher
inventory are still required.

A clean committed checkout can inspect its prospective default manifest without writing a
full expanded site or allocating its STORE ZIP:

```sh
node scripts/inspect-default-build.mjs --check-inputs
node scripts/inspect-default-build.mjs --out /tmp/revealline-default-capacity.json
```

The output path must be new and its parent must exist. Reports inside the checkout must be
Git-ignored. The preflight rejects missing committed files, including unreferenced originals
hidden by sparse-checkout flags, and reports the exact missing included-file byte count. It
never hydrates source. Required transitive producer inputs are subsequently validated by the
ordinary build preparation; the preflight's include count is not a complete hydration estimate.

`inspectBuildProject` and `buildProject` share one preparation path: reference, localization,
content, optional/download, soundtrack, snapshot and offline checks still run. The report
contains the exact prepared manifest, its SHA-256, and the payload byte total including
`manifest.json`. The wrapper binds the committed source/tree, verifies included originals
before and after preparation, and streams every available tracked original through its Git
blob hash, including compiler code and external/optional/soundtrack producer inputs outside
the runtime include list. Its available-source inventory also counts absent historical files;
required missing producer inputs remain errors in the normal preparation. It applies the
existing edition source-eligibility check and returns a hash of the written report. It does not write a ZIP, expanded site, release receipt or selector,
and makes no reproducibility or complete-hosted-output claim. The final publication inventory
below is still required. A source-only failure stops the report; no validation is skipped to
obtain a size.

The first committed inspection attempt at `a991ac3eacf0557556b7d86552ddcd359d1ee7b2`
(tree `ec5d0c0f7ae194c4849c311b57d807940e7d7c3c`) stopped at the ordinary reference gate:
three shared reward editors imported `authoring/company-studio/model.mjs`, which existed in
source but was absent from the default include list. No manifest report or size qualification
was produced. The default now admits that one validator module explicitly; it does not admit
the Company Studio folder or neighboring originals. The version and budgets are unchanged.
A regression verifies that merely having an authoring dependency on disk is insufficient,
and that admitting one module does not admit adjacent source files. A second attempt at
`3c829b56cb5d20b92bea610e7bf34a44c60dc98a` reached soundtrack preparation and stopped because
a tracked producer was absent from the sparse checkout. Four exact producer/evidence files
(73,370 bytes), including the conditionally loaded UA-FPV producer, were restored from HEAD;
the normal soundtrack preparation then verified all 71 catalogue tracks. Neither failed
attempt produced a report or size claim. The subsequent `8104e7bb0` inspection passed as
recorded above, with both failures preserved in the linked summary.

With reviewed frozen inputs and selectors available, the existing local staging commands are:

```sh
node publishing/pages-controller/publish.mjs build --preview
node publishing/pages-controller/publish.mjs verify-artifact --preview
```

They do not publish or allocate a release. They write `.cache/frozen-pages`, download the
selected original release assets, and require the existing exact metadata, qualification,
tag/source identities and edition/optional review evidence. The resulting
`artifact-receipt.json` lists every hosted path and `totalBytes`; the second command rereads
the complete staged output. Do not substitute candidates or fabricate pending review evidence
to run this ahead of admission. Candidate manifest sums are useful for planning; the publisher's
final exact combined inventory remains authoritative. The fast PR Pages authority check can
succeed without building this full artifact, so its success alone is not capacity evidence.

## Evidence and outstanding human gates

`game/test/fixtures/company-campaign-routes.json` contains 414 verified legal replay
proofs: 66 current and three historical missions, three difficulties, two steering policies, seed 1.
The independent six-check route suite replays the advanced content successor and
verifies actual connector openings and core releases, not only the earlier introductory maps.
Current runs include the exact default Journey tuning recipe; historical runs retain their
original recipe. All routes won with their required objectives and no life loss. Tests execute those routes and
pin exact discrete outcomes, complete board cells, objective flags and event/capture histories.
Raw checkpoint references retain their generating runtime metadata; a fresh independent
replay must match the full unrounded state and summary on the executing runtime.
Continuous terminal sub-tick time and enemy floating tails are not portable fixed goldens.
Strict saved-replay imports can reject incompatible math runtimes. This proves those routes are legal; it does not establish enjoyable
pacing, comprehension, learning transfer or coverage of every seed and input sequence.

Session tests cover active-cut continuation, release-input boundaries, mismatched edition/art,
tampered replay input, wrong mission and mismatched learning pins. Learning tests recompute
outcomes rather than trusting stored completion. Packaging tests reject disallowed assets,
hidden campaign data and corrupt dependency hashes. Offline tests simulate failed downloads
and cache ownership. Report test failures or absent fixtures explicitly, without waiving them
implicitly.

On 26 September 2026 the user reported human playtesting complete and requested the next
plan items. The formative gate is complete on that reported basis; no participant counts,
quotes or measured learning results were supplied or inferred. The recorded design decision
is to proceed with the current design and three-picture review batches. The first batch added
Choose Together, Repair the Draft and Scoped Access. The subsequent bulk change completes all
66 current candidate raster pictures (30 Coupa and 36 Netherlands), with three historical
Portuguese pictures preserved. All 57 new selections are opaque 2:1 PNG derivatives within
a 1 MiB per-image production target. Original generated masters remain outside the player
packet, referenced by exact hashes and portable paths in the generation receipts. This bulk
change stays in PR #615; it does not reserve a version or enqueue a public release.
Content accuracy, final asset approval, two real
installed PWAs, device storage recovery, a published-artifact rollback exercise and a final
same-device performance comparison remain promotion checks tied to the final artifact.

Art-only updates preserve stable mission IDs and gameplay manifests. Before changing art,
capture the affected edition's exact selected presentation with
`captureEditionPresentation` from `game/editions/retained-presentation.mjs`; keep the canonical
snapshot bytes, receipt, hash and media unchanged. Register only explicitly supported
snapshots in `EditionManifest.presentationHistory`, never a whole authoring registry. The
home recovery controls open the retained presentation explicitly through the same Solo
host; active-flight departure still verifies its save. Replay Theater acquires the exact
manifest picture and releases it on cancellation/replacement. Compilation admits only the
selected audience's history and its exact media dependencies. History counts against the
existing offline budget. An art update changes strict execution/presentation references,
while existing Journey completion remains under stable logical mission identities.

For subsequent art batches, capture history before changing registry inputs, retain generated
masters outside the public player dependency set, and review each exact derivative. Validate
complete receipts before writing them:

```sh
node scripts/import-company-art.mjs game/editions/art-prompts-coupa-bulk-02.json
# Add --write only after the complete selected batch is reviewed.
node scripts/produce-company-content.mjs
```

The importer validates authored mission identities, exact PNG hashes/dimensions, portable
master provenance, inspection records and the 1 MiB selection target. It refuses replacement
of an existing revision, duplicate mission registration within a batch, revision gaps and reused media paths. Omitted receipt revisions mean revision 1 for existing tooling; replacements explicitly specify the next integer revision and use a fresh path. Reimporting an older exact receipt is idempotent and does not roll back current selection. It does not certify
human artwork approval or change gameplay. Completed original/export inspections use explicit
states; prose alone cannot authorize an inspected source claim. Recorded native `sips` resize
commands must bind the exact master, selected output and dimensions. Register a complete batch in one catalogue update;
intermediate generation receipts can contain planned rows, which are deliberately rejected.
Keep immutable history JSON byte-for-byte and advance affected edition revisions once per
compiled batch. A source master is not a runtime dependency merely because it is cited in a
provenance receipt.

The completed bulk receipts link exact generated masters and selected files:
[Coupa](../game/editions/art-prompts-coupa-bulk-02.json),
[DroneAid workshops](../game/editions/art-prompts-droneaid-workshop-bulk-02.json), and
[DroneAid community scenes](../game/editions/art-prompts-droneaid-community-bulk-02.json).
Generation used the built-in image tool; exports preserve opaque RGB pixels with a
mechanical resize. Full bounded PNG decoding rejects incomplete, corrupt or transparent
selections before registration. Final artwork approval remains separate.

The FPV follow-up replaces all 36 current Netherlands pictures with practical carbon-frame
quad, goggle, component-bench and donation-case scenes. Its three revision-2 receipts are
[Workshop and Parts](../game/editions/art-prompts-droneaid-fpv-workshop-v2.json),
[Makers and Handoff](../game/editions/art-prompts-droneaid-fpv-makers-handoff-v2.json), and
[Support and Horizon](../game/editions/art-prompts-droneaid-fpv-community-v2.json).
The first workshop picture also supplies the current home hero. The new per-image target
is 384 KiB, using opaque 2:1 native-resized derivatives; the seven exact pre-FPV presentation
snapshots preserve the larger original pictures for saved runs. The offline cap remains
64 MiB. Brand revision 2 and Netherlands edition revision 4 are presentation changes;
campaign, mission, gameplay and logical progress identities stay unchanged. Coupa and the
historical Portuguese pilot retain their existing content. Research, composition decisions
and source boundaries are in [the FPV art direction](droneaid-fpv-art-direction.md).

The player verifies identity and shared presentation assets at startup. Reveal-only mission
pictures load through the exact per-attempt verifier when needed. Their complete catalogue,
publication eligibility, offline budget and historical pins remain authoritative; lazy
loading never authorizes a substitute picture. Images reused as a hero, actor body, explicit
edition root or shared dependency remain eager.

When CacheStorage is unavailable or full, verified online bytes can still support play.
Install, repair and offline verification remain strict: a failed cache operation cannot
produce an offline-ready receipt. Automated fault injection verifies these paths without
claiming real device storage or OS installation evidence.

The [qualification record](company-editions-validation.md) separates successful candidate
automation from unresolved historical tests and promotion gates. The [accessibility review](company-editions-accessibility.md)
records implemented mobile, focus and status fixes plus outstanding assistive-technology checks.
The [same-device review tool](verification/company-review.html) observes real player pages with
bounded, exportable measurements. It supports the current Solo host and historical company
player, with independent viewport width/height. Arm a measurement, then start/resume the
game normally; the observer never resumes it. The two hosts expose different preparation
endpoints, recorded in each observation, so do not compare them as identical timings.
It reports buffered resource entries, animation callback
intervals and approximate shared heap, not complete network traffic, renderer timings or a
memory-leak verdict. Every observation remains unqualified until reviewed.

The [qualification recorder](verification/company-qualification.html) captures the separate
human and device evidence against one immutable candidate. It validates exact envelope, source
and downloaded-artifact identity, all nine promotion gates per edition, actual-device constraints
and bounded scenario coverage. It starts with no passes and never edits the game, release metadata
or public selector.

## Sources and asset boundaries

The official flower comes from the [Coupa brand library](https://drive.google.com/drive/folders/1Bhq6KoBjES--iHt3gWZA2rhjo456Q9j6).
Current culture content follows [Life at Coupa](https://careers.coupa.com/en/life-at-coupa/):
Drive Success for #AllofUs, Build Tomorrow Together, Cultivate Belonging and Own our Results.
API concepts cite [current developer documentation](https://docs.coupa.com/en/developer-documentation/the-coupa-core-api/get-started-with-the-api).
No live endpoint, tenant policy or credentials are used.

The new `droneaid-nl` brand follows [DroneAid Netherlands](https://drone-aid.nl/nl): violet
`#4238EB`, yellow `#FFD62C`, light blue `#DCEBFD`, and its original propeller mark. These are
verified live-site tokens, not a discovered formal brand guide. The site uses KyivTypeSans;
that font is not redistributed because its license has not been established. The new pack
uses the host's existing font fallback. Workshop, collection and reporting activities inspire
fictional stories, not representations of actual deployments. The official site describes both
military support and humanitarian uses; the organization is not described here as exclusively civilian.

The historical `droneaid` brand still refers to the [Portugal regional identity](https://drone-aid.pt/en)
and [Germany's workshop context](https://drone-aid.de/). It is not silently relabelled as Dutch.
Its three scenes remain fictional and make no claim of proven wildfire deployment outcomes. Generated environments are illustrations,
not employee/event photographs. Getty/iStock material from Drive is not included. Poppins
ships with its [SIL Open Font License](https://github.com/google/fonts/tree/main/ofl/poppins).
Original research/private files stay outside this repository; only public derivatives and
publication-safe attribution belong in an edition.
