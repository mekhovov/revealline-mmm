# FPV development payload preservation

This backup preserves development packages, evidence, failed packages and other inventoried app payloads. It does not promote a package to the player, repair public storage, certify performance or replace the separate source Git/ref/WIP preservation audit. The GitHub release remains a draft backup in the public `mekhovov/revealline` repository.

Each source file is identified by size and SHA-256. Identical file content is stored once while every original relative path, file mode and modification time remains in the final index. Original package archives already preserved by the library qualification lane are referenced directly. Other pre-existing release assets are identified by their server digest and must pass authenticated download verification during restoration.

`pack.py` reads a root-produced JSONL inventory and packs safe objects into a new, exclusive directory. It checks the chosen source against the inventory before reading it, hashes the actual bytes written, then fully rehashes the original and checks size/time again. It refuses changed sources, unsafe relative paths and unreviewed policy flags. Exact reviewed exceptions require matching both path and SHA-256. Private browser/history/system names and Coupa names remain held unless that exact app object was cleared. Failed or partial outputs are retained.

Parts are deterministic regular-file-only TAR streams compressed with Zstandard. Each contains a sealed object manifest and `objects/<sha256>` entries. The default estimated uncompressed part cap is 1,350,000,000 bytes, below 1.5 GiB. A single object above the budget is refused for explicit chunk handling, never silently omitted.

`verify_upload.py` uploads a completed part under its full content digest without overwrite. It requires the GitHub server size/digest to match, downloads the entire asset with authentication into a fresh external directory, then restores and hashes every member. Links, devices, unsafe names, duplicate or unexpected members, changed headers and missing objects are refused. Only the resulting verified receipt can enter `build_index.py`.

For large parts, the normal PR workflow `FPV preservation readback` can execute the same full readback and strict restore on a fresh GitHub runner through `verify_published.py`. Its committed published-part plan contains the sealed size/digest/header and every original source check. A server-only plan is not a verified receipt. Workflow defaults and plan discovery have read permission. The verifier job requires `contents: write` solely for visibility of the draft backup release; it is restricted to this same-repository preservation branch and PR #1552. Its token is exposed only to the readback step, whose API operations are GET-only. It builds or runs no app, makes no repository/release/settings mutation, and deletes no source or original evidence. Successful small cloud receipts must be copied into durable Git/backup records before Actions retention expires.

`verify_upload.py --published-plan-output <fresh-plan.json>` stops after successful server digest verification and emits that pending plan instead of a success receipt. This permits authenticated readback/member restoration to run in cloud. The default `--receipt-output` path still completes full local readback and restoration; choose exactly one output mode. The index accepts only verified receipts, never pending plans.

`build_index.py` joins the primary and supplemental inventories, verified CAS receipts, the verified original-archive manifest and the existing release digest catalogue. It never reads source payloads. Missing objects, unreviewed records, conflicting inventory rows, errors, unstable files or an incomplete root inventory prevent its coverage-complete field. Git checkout and exclusion records remain explicit. An interim index is a progress report, not a completion receipt.

Coverage completion also requires `--inventory-set-final`, which may be supplied only after the root audit confirms that all primary, flat-file, ignored-payload and final-delta manifests are included. A completed primary walk alone does not establish that complete input set. Active-batch reservations avoid duplicate packing and never count as uploaded or verified coverage.

Malformed JSON rows and unsupported row kinds always refuse processing, including an interior corrupt row. Final index inputs must end every row with a newline and remain the same size, modification time and file identity while read and hashed. A writer's partial trailing row must finish before another packing attempt; it is never silently discarded.

## Portable restoration

The restore utility requires Python 3.10+, `zstd`, the GitHub CLI, authenticated read access, the final index, and these Python files in one directory. Choose fresh output and cache directories on any disk; the old volume is not required. Paths below are examples, not fixed locations:

```sh
python3 restore.py \
  --index /chosen/backup/preservation-index.json \
  --cache /chosen/disk/new-restore-cache \
  --restore-root /chosen/disk/new-restored-payload \
  --receipt /chosen/backup/new-restore-receipt.json
```

The cache may reuse an existing asset only after its entire size and hash match. Restoration refuses an existing output directory and symlinks in cache/output ancestors. Every restored logical file is checked while writing and fully rehashed afterward. Original modes and modification times are applied after byte verification.

Before creating the destination or downloading payloads, restoration measures free space on the chosen cache and output filesystems. Its conservative estimate includes compressed assets, all extracted CAS members, logical copies, Git dependency caches and copies, metadata allowance and a 2 GiB free-space reserve. It refuses insufficient space without clearing the runner or changing disks. A fresh cloud runner's measured capacity must pass this gate before a full restore is attempted.

`portable_restore_check.py` is the full qualification entry point. It refuses a partial or unconfirmed index, checks the entire path/type/link graph before downloading, then actually restores every file and reviewed Git dependency in one fresh tree. It verifies applied modes and timestamps and resolves every created link to the exact reviewed within-root terminal. Its receipt separates inventoried-payload restoration from the overall source/dependency/disconnect decision:

`indexSHA256` binds the entire index, including all logical file records. `linkDispositionsSHA256` hashes only the checked link-disposition records. Historical receipts used the name `pathAndLinkGraphSHA256` for that same link-only digest; those receipts remain retained and must not be interpreted as a digest of all file nodes.

```sh
python3 portable_restore_check.py --index /chosen/backup/preservation-index.json \
  --work /chosen/disk/fresh-full-restore --receipt /chosen/backup/full-portable-restore.json
```

The scoped `FPV preservation portable restore` cloud workflow runs only after a root-confirmed complete final index is committed under the final-index receipt directory. Its standard runner uses the same pre-download space gate and GET-only draft-release access on this repository's exact preservation branch and PR #1552. It uploads only a small verification summary, without payloads or the old absolute external target.

For the separately reviewed public payloads outside the original staging directory, `multi_restore_check.py` accepts a strict `FPVPublicPayloadRestoreSet.v1` rollup. It requires `rootConfirmedPublicInputSet: true` and exactly two named index bindings: `staging` to `preservation-index.json` with source root `/Volumes/alex/CodexMigrationStaging`, and `extra-volume-app` to `extra-volume-app-index.json` with source root `/Volumes/alex`. Each binding contains the exact index byte SHA-256. Both indexes must independently pass the final-input, coverage and full link-graph gates. The indexes and old receipts are not rewritten, and arbitrary source-path fields or parent traversal are not supported.

The two trees restore into separate named directories under one fresh work root. A common cache reuses assets only after the existing strict full hash/member checks. A combined disk estimate counts the union of cached assets and extracted parts plus both logical trees, metadata and the reserve before any download. Each per-index restore also rechecks free space. In shared-cache mode, exact-size existing regular cache files receive capacity credit because exclusive caches are never rewritten; this does not establish content trust, and every asset/member/Git blob must still pass its original full hash checks before reuse. Standalone restoration keeps its original conservative estimate. The public rollup cannot qualify separate private-origin payloads or source Git recovery, and overall disconnect safety remains false. Its manifest must contain only the root-approved public split; private source/payload/hash rows must stay at their respective private origins. New within-volume links require selected terminal-file closure in that same index; the rollup does not bypass unresolved links by reaching into a sibling tree.

```sh
python3 multi_restore_check.py --rollup /chosen/backup/preservation-rollup.json \
  --work /chosen/disk/fresh-public-restore-set --receipt /chosen/backup/full-public-restore-set.json
```

The cloud workflow selects this mode when the approved `preservation-rollup.json` exists beside both indexes. Without a rollup, a standalone staging restore remains a staging-only receipt.

If a full restore does not fit, `bounded_restore.py` creates an exact deterministic path partition plan from the same index. Each fresh runner downloads only the parts or direct assets required by its assigned paths and applies the same byte, mode and timestamp checks. Its plan covers each logical path exactly once and checks the complete path/type/link graph; its collection refuses missing, duplicate or mismatched receipts. A separate empty-marker layout probe recreates and resolves every relative link under one chosen root, explicitly without claiming to have materialized payload bytes there. Partition receipts disclose that no one-shot payload materialization occurred and cannot establish overall disconnect safety. Choose a fresh path for each plan, work directory and receipt:

```sh
python3 bounded_restore.py --index /chosen/backup/preservation-index.json \
  --create-plan --plan /chosen/backup/restore-partitions.json
python3 bounded_restore.py --index /chosen/backup/preservation-index.json \
  --plan /chosen/backup/restore-partitions.json --partition partition-0000 \
  --work /chosen/disk/fresh-partition-0000 --receipt /chosen/backup/partition-0000.json
python3 bounded_restore.py --index /chosen/backup/preservation-index.json \
  --probe-links --work /chosen/disk/fresh-link-layout --receipt /chosen/backup/link-layout.json
```

Within-root absolute symlinks are rewritten to relative links under the selected restore root. Relative links escaping that root and absolute targets outside the historical source root are reported and not recreated. Dangling or looping internal links are also reported. `--defer-external-dependencies` permits a reviewed partial restoration to exit successfully, but never changes a false completion field into a true one. Source Git checkouts must be recovered through the separate source preservation manifest and Git bundles/branches; this tool never claims overall disconnect safety.

A separately reviewed GitHub subtree can close an exact outside-root link without recreating its old absolute target. Supply its matching `--github-link-mapping` and `--github-link-coverage` receipts when creating the index. The importer requires both reviewed receipts to bind the SHA-256 of the exact captured link target, a fully tracked clean file manifest, matching counts and the reviewed Git tree identity. The pinned commit and subtree must also have an exact published binding in the coverage receipt. Restoration confirms the subtree against the pinned commit, downloads every Git blob, checks its Git identity, byte length and SHA-256, then exclusively copies and rehashes it under the reviewed relative dependency destination. The leaf link becomes relative only after all dependency files verify. Unknown links continue to be reported and held open.

Reproducible excluded package-manager dependencies should be installed using the corresponding recovered lockfile and pinned version. The root audit's local dependency repair receipt records the `gltf-validator` dependency and its verified internal replacement. No restored app should depend on the historical external share path; unresolved link/dependency records must be closed by the overall audit before disconnect is declared safe.

## Verification

Use a fresh external temporary parent for the regression suite:

```sh
TMPDIR=/chosen/external/test-stage python3 -m unittest -v test_preservation
```

The tests exercise real TAR/Zstandard pack and restore, changed-source refusal, destination refusal, part-header tampering, traversal/private-name holds, exact exception handling, duplicate-content reuse, cache symlink refusal and incomplete inventory semantics. Test directories and failed outputs are intentionally retained for inspection.

Do not publish any additional source object merely because an archive tool can read it. The root inventory review, exact policy clearances, source provenance, authenticated per-asset readback and final full relative-path restore are independent required receipts.
