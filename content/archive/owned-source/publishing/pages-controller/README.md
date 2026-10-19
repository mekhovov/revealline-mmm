# Frozen Pages publication controller

## Current hosting policy — 2026-09-27

Future releases use only `mekhovov/revealline`. Do not create, allocate, append, deploy or admit a `revealline-archive-XX` repository as a release step. Historical archive deployment and per-PR publication are not prerequisites.

Publish the exact qualified current game on the main Pages site and keep original immutable ZIPs, manifests, checksums and source evidence in the main repository's GitHub Releases. Unarchived historical editions become explicitly download-only, not broken Play links. Existing accepted archive links, repositories, tags, assets, saved data and evidence remain unchanged; their frozen registry is compatibility history, not a recurring remote-admission gate. Do not delete or republish them.

Keep current-source qualification, reviewed selector, protected-main checks, frozen independent inspection, bounded extraction, full artifact/public-byte verification, latest-release validation and scoped player acceptance. Preserve explicit test waivers as SKIPPED. The main Pages budget remains 950,000,000 bytes; exceeding it requires a new reviewed decision, not another repository or a raised limit. See [main-repository publishing policy](../../docs/main-repository-publishing.md).


This directory publishes one explicitly selected immutable game and the semantic release explorer. It does not rebuild historical games or change their release records, tags, assets, original workers, saved-data keys or ZIP files. The `retainedReleaseCount: 5` policy selects five stable releases globally in numeric semantic-version order, including the current release during an explicit rollback. Explicit testing and comparison routes remain addressable but are excluded from the public selector. Existing `retainedReleasesPerMajor` configurations retain their legacy behavior, including `"all"`; exactly one retention field must be present. Global counts support integers 1 through 100. Historical tags, releases, assets, archives and evidence remain preserved. The frozen legacy allocation/admission hashes and accepted record pins preserve already published archive links without recurring archive evidence or remote authority work. The 1,024-entry catalog and shared maximum of 128 archive shards/admissions remain bounded. New archive allocations, admissions and repositories are prohibited by the active hosting policy. The 800,000,000-byte archive and 950,000,000-byte main budgets are unchanged. Root and `/game/` select the current release. Previously admitted historical entries keep their canonical links; unarchived historical entries are download-only from main GitHub Releases.

The publishing controller commit is different from `gameSourceRevision`. For example, v0.42.0 is frozen source `e9928cdaad2f55d912aadd2ef25f635fb99e938c`; the main merge `f56ce9d98f0ce5d77a8f3c7dc310bf1a7e6b795c` was its publishing controller. The same distinction applies here. Infrastructure changes do not increment a frozen game version.

The accepted main edition is **[v0.65.0 — imported Team continuation](https://mekhovov.github.io/revealline/releases/v0.65.0/site/game/)**. Its [scoped acceptance](delivery/evidence/cross-mode-p07/v0650-public/README.md) verifies ordinary import, both wins, earned-picture focus, Next and same-arena Retry, plus all **3,500 main files / 644,685,649 bytes** with no failures or retries. It closes P07-TEAM-IMPORTED-CONTINUATION only. Parent P03/P07/P08/P18, physical input, responsive Team, live rescue/balance and audio/offline gates remain open. The durable original audit and final authorities are retained alongside the small acceptance summaries.

**v0.66.0 is a source-qualified stable release; public acceptance remains pending.** Frozen source `dae39ba7` / tree `e003212f`, tag `991bfc31` and release `392248530` preserve all nine verified assets. Both source families passed 6,541 tests across 501 files on Node 20.19.6, all required source/production/build gates and independent inspection. The catalog adds its 104th record while preserving all 103 old rows and exact metadata. Canonical stable metadata and qualification bytes match their verified originals; all nine asset descriptors remain unchanged. The publisher is based only on accepted main `e6e269ea` / tree `7e96a3c4`; it excludes the separate PR169/PR170 runtime sources.

**Archive33 now preserves both v0.64.3 and v0.65.0.** Its [accepted append](evidence/archive-33/append-v0650/root-acceptance.json) covers all 1,421 files / 627,143,902 bytes without failed requests or retries, preserved earlier release bytes and scoped keyboard journeys. The allocation keeps all 33 archives and every historical route; only Archive33's current admission changes. No Archive34 repository is required. Stable promotion passed; the reviewed selector, Pages and complete public/native v0.66 acceptance remain separate gates. The accepted game is still v0.65.0. See the [current execution register](../../docs/cross-mode-execution.md).

<details>
<summary>Historical v0.65.0 selector-preparation summary — retained verbatim</summary>

The accepted main edition is **[v0.64.3 — Workshop recovery](https://mekhovov.github.io/revealline/releases/v0.64.3/site/game/)**. Its [scoped acceptance](delivery/evidence/cross-mode-p03/v0643-public/README.md) verifies the actual keyboard refusal → Reload → recovery journey and all **3,475 main files / 644,520,592 bytes**, with zero failures or retries. It closes P03-WORKSHOP-01 only; P03, P05 and broader device, audio/offline and gameplay gates remain open.

**Archive33's v0.64.3 preservation is accepted and prepared for this successor admission.** Its [root record](evidence/archive-33/initial-v0643/root-acceptance.json) binds all 712 files / 313,572,608 bytes, scoped native evidence and fresh authorities. Archive32 continues to preserve Replay v0.64.1 and HUD v0.64.2. The next composition preserves all 32 earlier admissions/allocations and 102 existing catalog rows; it adds Archive33's exact evidence rather than rewriting earlier releases.

**As of 20 September 2026, imported-Team v0.65.0 is published stable; Pages acceptance remains pending.** Frozen source `57fdc39a` / tree `b71a23d6`, tag `74721a37` and [release 392203520](https://github.com/mekhovov/revealline/releases/tag/v0.65.0) retain all nine verified original assets. Metadata sync and the reviewed selector are prepared; hosted Pages deployment and actual public verification remain required. The publisher is based on merged v0.66 source `ce8c72ed` / tree `e003212f` while selecting the immutable v0.65 game; it must not rebuild or change either release's version or assets. Final v0.66 source `dae39ba7` passed both complete hosted families (6,541 tests across 501 files each on Node 20.19.6), all required source/build gates and independent frozen inspection. Its release/public acceptance remains separate and pending. See the [current execution register](../../docs/cross-mode-execution.md).

</details>

<details>
<summary>Historical v0.64.3 selector-preparation summary — retained verbatim</summary>

The accepted public baseline is **v0.64.2 — short-landscape HUD**, publisher `2abd779766cd6d4b217b93a10575ed55d2d5547a`. Its complete public audit verified 3,450 files / 644,370,153 bytes with no failed bodies or retries; scoped native acceptance is retained in the [HUD evidence](delivery/evidence/cross-mode-p05/v0642-public/README.md).

**Workshop v0.64.3 is a stable release; this candidate enables its Pages selector.** Exact source `7a9985ec00168b99a86c1d5db0457343ca18ffae` / tree `4a5960488f4c19fc8fbd6e784c612b8bdb81596e` passed both complete hosted families, each 6,302 tests across 486 files on Node 20.19.6, plus source/production/build and frozen inspection. Stable release `392074105` preserves all nine verified assets; canonical latest and tag readbacks match their exact descriptors. The four metadata/qualification bodies are unchanged originals. The catalog appends its 102nd entry while preserving all 101 historical records. The source revision remains independent of this publisher commit and concurrent imported-Team integration.

**Archive32's append is accepted.** Infrastructure `2ff124892905eda499e7b1fb29729f092a253ecb`, tree `12407d538821769350a37679ec0d214b99b77a98`, run `35464701544` and deployment `6544867176` preserve Replay v0.64.1 and HUD v0.64.2. The complete public audit verified **1,421 files / 627,136,217 bytes** in 1,421 attempts with zero failures or retries, preserving all 709 prior Replay release rows and both support files. [Root acceptance](evidence/archive-32/append-v0642/root-acceptance.json) joins that audit with scoped native keyboard journeys and fresh deployment authorities. All old Archive32 originals remain as reference history; the other 31 admissions and allocations are unchanged. The enabled selector is still an isolated publisher candidate: hosted checks, Pages deployment, the complete main public-byte audit and the Workshop keyboard failure → Reload → same-dialog recovery journey remain pending. Parent phases, physical controls, audio/offline, encounter/rescue balance and zoom remain open. See the [execution register](../../docs/cross-mode-execution.md).

</details>

## Inputs and admission

`catalog.json` pins the original bytes of every release record, manifest and ZIP checksum, plus each annotated tag object and peeled source commit. `metadata/` contains those exact small original files. Neither formatting nor regeneration may rewrite them. Every catalog tag object and peeled source must still agree before publication. New uncataloged tags may exist; they do not become catalog entries or bypass the highest published stable release guard.

`sync-release-metadata.mjs` prepares new metadata only. It validates the original record/manifest/ZIP-checksum chain and the complete requested batch plus selected qualification before writing. Existing pins and files are immutable; an identical request changes neither bytes nor modification times. The helper normalizes paths, refuses symlink or stale-input changes, uses an exclusive preparation lock and no-clobber writes, and rolls back its own newly published files after a failed batch. Preserve these checks and review any refusal; never run this preparation helper during deployment.

The current selector separately pins its published source-qualification receipt. All six gates must have passed for that exact game commit/tree, and hosted publication verifies the identical receipt from its GitHub Release. A missing gate, changed body or mismatched source tree refuses publication. The first public native/offline check of a newly published current edition remains a post-deployment acceptance task; it cannot precede the edition's first public availability.

Before an archive append, run `node archive-tag-fetch.mjs --source-lock <archive/source-lock.json> --workflow <archive/.github/workflows/deploy.yml>` from this directory. It checks every source-lock cohort against the archive template's direct `jobs/build/steps` explicit same-tag fetch refs in an unconditional named step with `working-directory: source`. Missing refs, another destination, conditional steps and dynamic shell cannot establish coverage. This local check performs no fetch and does not prove hosted execution, tag identity, byte preservation or native acceptance. Keep the actual hosted checks and the original failed attempt. The [deployment skill](../../.cursor/skills/deploy-release-pages/SKILL.md) gives the repository-root command and complete release gate.

`allocations.json` reserves archive ownership independently of the selected current version. Ordinary historical entries use admitted archive routes. An explicitly reviewed `testingRoutes` entry may expose a frozen comparison edition before its native admission; it never becomes the root default. Direct version URLs receive the same metadata bridges as explorer links. All original catalog metadata and pins remain preserved and validated. The current version is always excluded from that overlay. Reserved future versions do not fabricate release entries. Archive01–05 keep their existing ownership; 06 holds v0.41/v0.44, 07 v0.45/v0.46, 08 v0.47/v0.48, 09 v0.49/v0.50, 10 v0.42, 11 v0.51, 12 v0.52, and 13 v0.54/v0.55.

Each admission pins its infrastructure commit, successful Pages deployment and retained evidence. Validation compares every frozen asset, original manifest, record and ZIP checksum against the archive's complete accepted HTTP inventory. The HTTP report must cover that inventory without missing or failed files. Hosted runs also confirm that each archive's main commit and successful deployment still match the admission.

Every retained modern edition must reach the main live catalog through its actual title **Release explorer** action. A shared archive index is publication infrastructure: preserve an obsolete list under `legacy/`, then use the reviewed accessible redirect/fallback instead of freezing misleading “Current” text. Keep every canonical edition body, original tag and metadata pin unchanged. Verify the native title → explorer → main catalog → Back journey as well as the complete revised HTTP inventory; a byte-perfect obsolete index does not pass this gate. See the [archive explorer review and AI prompt](delivery/archive-explorer-review.md).

Browser admission is a review record tied to pinned native evidence. It does not turn an HTTP hash audit into a playthrough. Older unchanged editions retain their earlier scoped acceptance and known limitations. New redesign editions each need actual public play/offline acceptance. The original receipts retain timeouts, writer contention, unavailable legacy pictures and other limits. Archive07 now retains both v0.45/v0.46 canonical browser and offline admissions, including their first preparation timeouts and successful normal retries. Evidence files are copied unchanged; links inside historical notes describe their original evidence locations.

Archive08 now admits the exact v0.47/v0.48 freezes and their native play, Studio and offline checks. Its HTTP evidence retains the first 760 successful bodies and 13 transport failures, then independently reconciles the 13 successful retries against the same 773-file inventory. The original failure and retry receipts remain attached. Browser evidence retains all ordinary offline preparation timeouts and successful offered retries. Those receipts establish the archive admission independently of a later current-edition selection.

Archive11 preserves v0.51.0 from its original release ZIP. Its public audit verifies all 620 files and 323,017,169 bytes without failures or retries. Native evidence verifies online mission installation, keyboard capture, pause/resume and saved-flight restoration. Two uninterrupted offline preparation attempts timed out after an initial interrupted attempt; disconnected reload was not tested. This admission is scoped to historical online preservation and does not claim offline acceptance.

Archive10's later deployment retains v0.42.0 and an additional v0.51.0 copy. Its successor admission preserves the earlier evidence and pins the complete 976-file, 633,532,427-byte audit plus scoped native journeys at infrastructure `55019541f8210ccef70f09cc04885f0debf1c4a7`. Independent review reconciled every retained HTTP observation with both original manifests; 18 fresh probes corroborated the unchanged deployment. Those probes are not a new full audit or offline acceptance. Main allocations still route v0.42.0 to archive10 and v0.51.0 to archive11.

Archive13 preserves v0.54.0 from its original release ZIP. Its public audit verifies all 652 files / 312,209,411 bytes. Automated Chromium interaction verifies online capture, Retry, explicit pause/resume, saved-flight restoration, and offline reload/play after an offered preparation retry verified all 600 core files. The initial preparation timeout remains recorded for P01. Native evidence is limited to accepted source-format and desktop/iOS/tooling tests; physical-device testing is not claimed.

The earlier v0.58.0 selector preparation (P02-A shared master audio) used frozen source `c113a348ae69bd013b67f0d22a5391d604253545`. Its exact original published metadata and six-gate source qualification are pinned without changing release assets. The four small published metadata and qualification bodies match the reviewed release-attachment hashes; all nine GitHub Release asset identities were verified before this selector preparation. For every selector, public byte, browser and offline acceptance are separately scoped post-deployment checks. P00 and P01 acceptance records remain under `delivery/evidence/`.

Archive13 now preserves v0.54 and v0.55 at infrastructure `58b21ebeff3c2d8e8ca37d5b7764f8203b8824ed`, deployment `6454910731`. Its complete 1,303-file / 624,422,286-byte public inventory passed without failures or retries. The added release-explorer bridge fixes the real game link; root exercised keyboard navigation through both archived titles, alongside scoped v0.55 online capture/save/load. The predecessor 404 and historical offline evidence remain recorded. This successor browser admission does not claim a new disconnected archive test or physical-device certification.

Archive17 now preserves v0.57.3 and v0.57.4 at infrastructure `d92391c40a1757de0497c2b7709c0a4925318e5a`, deployment `6472983959`. Its complete 1,323-file / 625,323,826-byte public audit passed without failed files, retries or skips. All 660 predecessor v0.57.3 payload rows remain exact; its native observations keep their original infrastructure and scope. New canonical v0.57.4 evidence covers an installed mission, an actual cut/capture, explicit pause/resume and re-pause. The native addendum records unresolved CSS viewport changes and final body focus: screenshot pixel dimensions are not viewport measurements. This admission claims historical online preservation, with no new offline, full keyboard, touch, physical-controller or responsive-layout acceptance. Original receipts, local inspection corrections, native captures and the addendum are retained separately under `evidence/archive-17/append-v0574/`.

## Build and publication

The workflow requires 8 GiB free on the hosted runner. No npm installation or historical source rebuild is needed.

1. Validate the main-only selector, current qualification, metadata and immutable tag pins. Preserve the frozen legacy registry; do not request archive authorities.
2. Download only the selected original `distribution.zip` from the code-owned GitHub Release URL. Verify its exact SHA, every bounded safe member, CRC, length and SHA before promoting the extracted current graph. Links, duplicate members, traversal, unexpected files and altered original manifests are refused.
3. Copy the complete current graph only under `releases/V/site/`, retaining its original worker. At root, retain only the frozen `manifest.json` evidence and the bounded webmanifest/icon compatibility files, then generate the existing self-contained current-entry aliases and retirement worker. The root `release.json` is a compatibility projection whose Play link points at that canonical graph and whose Download link points at the immutable GitHub Release ZIP; the versioned frozen record remains unchanged. Runtime code, pictures, optional downloads and `offline-cache.json` are not duplicated at root. Neither worker forces activation or deletes storage. The separate `catalog-ui/` graph remains explicit.
4. Derive retained historical HTML bridge paths and worker existence from authenticated original manifests. The pure bridge generators are the existing `scripts/pages-archive.mjs` protocol. No historical payload reads or placeholder bodies are used. ZIPs remain on their original GitHub Releases.
5. Style only the mutable release catalog using the selected current graph's own presentation assets. `catalog.mjs` preserves the P6 catalog helper behavior from `scripts/release-catalog.mjs` and `publishedReleaseIndex`; it is infrastructure code so that the final catalog can be published before the source integration merges. Earlier releases without the presentation bundle use the readable fallback.
6. Hash the full resulting artifact, enforce the 950,000,000-byte main cap, and independently reread all files against the receipt before upload. The artifact and receipt bind the controller commit/tree separately from the frozen game source.

An existing output is never overwritten. Failed preparation cannot receive a verified receipt or be deployed. ZIP extraction stages its own output and removes only that newly created staging directory on failure. A failed later assembly may retain an incomplete new artifact directory for inspection; retry in a fresh workflow workspace.

The receipt identifies `single-canonical-with-root-metadata-v1` and lists every
duplicated compatibility file with its original size and hash. Root
`manifest.json` describes the immutable canonical graph, as declared by
`current-entry-routing.json`; it is not an inventory of root aliases. Existing
root-installed web apps keep their webmanifest and fixed icon URLs. An old root
runtime's uncached non-HTML request is not redirected or substituted with another
edition's body. Its old cached bodies and saved data are not deleted; current
HTML navigation selects the canonical release. This layout does not promise
continued uncached operation of obsolete root-scoped sessions. See the
[bounded correction and remaining checks](delivery/single-current-graph.md).

The publisher deploys only `refs/heads/main` through the existing `github-pages` environment.
Its concurrency waits for an earlier frozen publication. Source pull requests retain main's
preflight, provenance checks, all four test shards and ordinary build in a separate non-cancelling
group. The legacy workflow has no Pages upload/deploy route. Its release/manual entry reads the
selector from `main` and dispatches the sole publisher there; it never invokes a current-only test
runner from a historical release. Historical tags retain their own workflow files, so retry those
through a main dispatch. No environment protection policy is changed.

Actual publication must select the highest published stable semantic version, ignoring drafts and
prereleases. The policy runs during each hosted artifact check and again after any protected
deployment wait. Older release events are skipped; a newer event whose tag lacks a matching enabled
selector fails without changing configuration. An optional dispatch `release_tag` must match exactly.
PR previews are explicitly non-publishable and must still use a valid selector for their pinned catalog and retention policy.

## Updating the selector

Freeze and qualify the exact game candidate first. Preserve all earlier metadata files and tag identities. Append new original metadata and pins, retain current frozen/source evidence, then change `currentVersion` and set `deploymentEnabled: true` in a reviewed publishing commit. Do not enable a deployment merely because schema checks pass. After deployment, audit every published byte and run current main play/offline plus retained-entry journeys; the build receipt does not claim that public acceptance. Check an existing scoped offline installation separately from fresh navigation through its historical bridge. The installed worker may still serve original bytes; that does not establish the bridge or canonical archive behavior in a fresh profile.

Focused checks:

```sh
node --test publishing/pages-controller/*.test.mjs
python3 -m unittest discover -s publishing/pages-controller -p 'test_*.py' -v
node publishing/pages-controller/publish.mjs verify --preview
```

`--preview` omits the final browser/deployment-enable requirement and always produces a non-publishable receipt. The workflow never uploads or deploys PR preview artifacts as Pages. The build and receipt verification commands use a fresh `.cache/frozen-pages/` directory; committed inputs and a clean checkout are required.

## Delivery evidence updates

The [delivery record](delivery/README.md) is publication metadata. Changes confined to `delivery/**` retain pull-request preview checks but are excluded from the publisher's main push trigger. This prevents completing an acceptance report from starting a new deployment that would need another report. The exclusion follows the positive controller path pattern and does not suppress a mixed commit that changes the selector, workflow or other publication inputs. Immutable game source and release artifacts remain unchanged.

## Archive18 preservation: v0.58.0

Archive18 preserves the original v0.58.0 release for historical online play when another edition becomes current. Its admitted infrastructure commit is `b83acdd80f0aaa35a72cff8c6b861250e894b1d7`, tree `69b9a690589500ea78b240ae242efb7309474730`, deployment `6474004290`. The original ZIP extraction and complete public HTTP audit verified all **665 files / 312,702,795 bytes**, without failed, retried or skipped files. The existing v0.58.0 catalog metadata and source revision remain unchanged.

The scoped native review covers the title, existing saved-flight restoration paused until explicit Resume, flight, a clock-expired result, retry, pause, audio settings and return to title. Original captures and the review are retained under `evidence/archive-18/native/`; the browser-admission record binds them to the exact archive deployment. This is historical online preservation, not a new phase acceptance, victory test, offline qualification, physical touch/controller test or audible listening pass. The historical v0.58.0 Team notice defect is preserved; this admission does not claim the v0.58.1 correction.
