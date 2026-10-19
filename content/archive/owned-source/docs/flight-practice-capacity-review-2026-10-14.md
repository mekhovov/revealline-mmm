# Flight practice: retained-version capacity review

## Latest deployed-baseline update

The successful main deployment at `1a2e87d50` supplies a complete **920,119,188-byte**
site receipt. Its public manifest and eight generated files reconcile exactly.
Subtracting the **6,527-byte** empty practice directory avoids double-counting its
replacement. Fresh, twice-reproduced `f3b1b2c88` packages then give:

| Component                                     |          Bytes |
| --------------------------------------------- | -------------: |
| Deployed non-practice baseline                |    920,112,661 |
| Fresh immutable three-app generation          |     27,282,251 |
| Active stable launchers and pointers          |        521,358 |
| First-generation lower bound                  |    947,916,270 |
| Including a comparable retained generation    |    975,198,521 |
| Minimum reduction against the unchanged guard | **25,198,521** |

The [retained observation](flight-practice-qualification-20261014/deployed-capacity-f3b1b2c88.json)
records both source revisions, hashes and reconciliation. This is not a fabricated
build-inspector receipt: replacement populated-directory bytes and any changed
main-build outputs are excluded. Retention is an explicit sizing allowance, not
another allocated release. Final complete-site assembly remains required. This
lightweight measurement supersedes the sizing numbers below; those remain the
historical audit trail. No heavy local rebuild was needed after the earlier
inspection stopped under resource pressure.

## Result

The three apps cannot sustainably share the current main Pages footprint while
retaining a comparable previous generation under the existing **950,000,000-byte**
guard. No source, playable content, original download, stable URL, previous
version, review evidence or capacity guard was removed or weakened in this work.

The existing bundle tool now exposes a read-only `--capacity` mode. It counts
immutable package payloads, their manifests, active stable-launcher duplicates
and current pointers. It distinguishes actual retained versions from a planning
reserve. Under-budget results still say `requires-exact-build`; they never grant
publication approval. The existing publisher and complete-site inventory remain
authoritative.

## Measured evidence and limitations

All sizes below are decimal bytes, not compressed ZIP sizes.

The live `https://mekhovov.github.io/revealline/manifest.json` observed on
2026-10-14 identified source `f0ccfd37dbb432728997e42f44262aa851538e79`.
Its 473,022-byte manifest has SHA-256
`364b44b1222515e4b03109b99de8d9a3f9b92d96e5f1385f27add612acdd9346`.
It describes 3,195 payload files, plus the manifest itself. This is a hosted
manifest observation, **not** a fresh local build or an independently rehashed
whole hosted site.

Package figures come from the previously twice-built/admitted development
candidate at source `8718babd1827383a22596c5a0156b280a594929d`, in the
`candidate-with-sim` directory recorded in the continuation report. Their review
gates remain pending. The two sources are deliberately recorded separately;
this combination is sizing evidence, not a source-consistent release candidate.

| Component                                          |          Bytes |
| -------------------------------------------------- | -------------: |
| Main payload including its manifest                |    920,094,228 |
| Gym immutable package including manifest           |      3,618,524 |
| Flight Studio immutable package including manifest |      6,614,940 |
| World Studio immutable package including manifest  |     17,026,424 |
| Three active stable-launcher copies and pointers   |        520,670 |
| First-generation hosted lower bound                |    947,874,786 |
| Comparable previous-generation reserve             |     27,259,679 |
| Two-generation planned lower bound                 |    975,134,465 |
| Minimum over-budget amount                         | **25,134,465** |

The reserve is the earlier development candidate's aggregate immutable payload;
it is **not** an approved or allocated previous release. Both development
candidates use the same version number and must not be represented as distinct
published versions. Generated directory metadata, other hosted overlays, final
publication metadata and growth margin remain additional costs. A first
generation has at most 2,125,214 bytes left before those costs, which is too
narrow to establish safe updates.

For a planning example, keeping another **25,000,000 bytes** of growth/metadata
margin on top of current and comparable retained packages would require the main
payload to be at most **869,959,763 bytes**, or at least **50,134,465 bytes** below
this observation. This margin is a planning recommendation, not a new admission
rule or a claim that 25 MB covers every future release.

A current local no-write preparation was attempted at rebased source
`2e23fdca0ef616865a207603cff6c154acacc327`. It did not finish: after validating the
available build inputs, the soundtrack producer required omitted tracked files
under `docs/verification/music-publication-2026-09-21`. Only 395,610 bytes of
directly required tracked documentation were restored from sparse checkout
(the round-47 couch guide and FPV redesign baseline). No full-site output was
written. Before a fresh frozen inspection, hydrate the precise transitive
producer inputs and run from committed, stable source; do not label this failed
attempt a capacity pass or infer missing evidence.

## Why simple pruning is not a safe fix

The previously deployed source `595421060c718295611a8441fbe8dba1c3da88e4` was
also inspected through its hosted manifest before deployment advanced during
the audit:

- Exact hash-identical duplicate paths account for only **2,829,724 bytes** of
  theoretical excess. They include stable-app icons/fonts and content-addressed
  presentation assets whose distinct URLs are referenced. Even eliminating
  every duplicate could not close the gap, and URL/cache ownership must first
  be preserved.
- Documentation/test-looking paths account for **700,947 bytes across 30
  files**. These are primarily intentionally linked authoring/player documents
  and baseline screenshots, not a large accidentally shipped test tree.
- At the newer `f0ccfd37` observation, whitespace minification of hosted JSON
  whose local original hashes match the manifest would save at most
  **4,417,141 bytes**. The measurement excludes 64 generated/absent JSON files
  and one projected/changed JSON file. It is only a theoretical value: pinned
  original bytes, retained content-addressed names and validators would need
  explicit compatibility treatment. It is not approved savings.

The largest actual groups in the earlier hosted inventory were gameplay
content-design artwork (265,053,466 bytes), edition artwork (113,829,087 bytes),
content packs (72,213,536 bytes), original four-world chapter downloads
(44,479,519 bytes), and UI artwork (30,213,650 bytes). External chapter media and
authoring originals are also substantial. They are active content or promised
original downloads, not disposable diagnostics. The existing main Pages profile
already excludes archive-only groups and exclusive unused artwork.

## Recommended decision order

1. Keep this repeatable capacity preflight in the maintainer workflow now. It
   catches a known retention impossibility before expensive assembly or upload.
2. First quantify a wider **lossless PNG optimization** opportunity, using the
   trial below as evidence that it is worth investigating, not proof of enough
   savings. Keep source originals and their download contracts unchanged; identify
   where existing generated-runtime projection may safely update dependency
   hashes. Rebuild and re-admit affected runtime descriptors, and test color,
   alpha and old-client/retained-version behavior. Do not apply a blanket image
   rewrite or assume the sample savings scale across all content.
3. If compatible lossless optimization cannot save the measured gap **plus**
   metadata/growth margin, review a larger content-preserving distribution
   design. Candidate options are a versioned compressed-content transport with
   verified decoding, or moving immutable optional distributions to an
   explicitly approved existing archive/hosting arrangement. Neither is
   implemented or authorized here, and new hosting is not yet proven necessary.
   Compression needs changes to readers, hashes, offline caching and old-client
   compatibility; alternate hosting needs stable identities, cross-origin
   policy, availability and rollback tests. These are not a one-line pruning fix.
4. Rebuild all three packages from the final accepted SIM/source revision, record
   actual retained versions, run this preflight, then assemble and inventory the
   entire selected hosted site. Only that inventory can establish a capacity
   pass. Required human/device/release reviews remain independent.

Do not raise the guard, retire promised content, discard previous versions or
publish only a narrow first-generation fit to avoid this decision. Omitting the
capacity work risks an installation that cannot be safely upgraded, or a later
deployment that fails after release qualification.

## Read-only lossless PNG feasibility trial

The installed encoder was FFmpeg 9.0.2; `oxipng`, `optipng`, `pngcrush`,
`zopflipng` and `cwebp` were unavailable. No tool was installed. Five representative
large PNGs were read and recompressed entirely in memory. The trial used PNG
compression level 9 and mixed prediction, preserved the original IHDR and every
non-IDAT chunk (including color/profile metadata), and compared the exact decoded
RGBA byte buffers before/after. All five had matching decoded pixels and image
headers. Source files were not changed and no new image files were written.

| Representative source                                                        | Original bytes | Mixed-predictor result |      Difference |
| ---------------------------------------------------------------------------- | -------------: | ---------------------: | --------------: |
| `game/content-design/assets/team-partners-r1/split-orchards.png`             |      3,110,865 |              3,173,657 |   62,792 larger |
| `game/editions/assets/discovery/textile-light-diffuse-v1.png`                |      3,333,938 |              2,933,262 | 400,676 smaller |
| `game/editions/assets/coupa/choose-together-v1.png`                          |      3,209,122 |              3,253,019 |   43,897 larger |
| `game/ui/art/field-kit/prepared/title-hangar-v1.png`                         |        866,080 |                650,244 | 215,836 smaller |
| `authoring/library/ukraine-atlas-art/originals/petrykivka-sun-courtyard.png` |      3,286,349 |              3,363,328 |   76,979 larger |

The five originals total **13,806,354 bytes**. Choosing only the two smaller
mixed-predictor results would save **616,512 bytes**. A separate Node zlib level-9
trial on the existing PNG filtered-byte stream found a potential **436,546-byte**
IDAT saving for the textile image, better than mixed prediction; it did not
improve the other four. Combining the best measured options suggests about
**652,382 bytes (4.73%)** across this sample, before integration constraints.
This is a sample, not a whole-site saving estimate or an approved transformation.

Lossless pixel equality is not enough on its own: these images are referenced
by byte hashes, some represent promised downloadable originals, and some occur
inside exact media bundles. Keeping both an unchanged hosted original and a new
runtime projection can increase total hosting weight unless the original is
already required independently or the representation genuinely replaces a
redundant generated copy. Compatibility and complete final byte accounting
remain mandatory. The trial supports further targeted optimization research;
it does **not** establish that new hosting is mandatory, nor that recompression
alone will close the 25–50 MB gap.

### Wider bounded audit: 30 largest hosted PNGs

[Machine-readable receipt](flight-practice-publication-20261014/png-capacity-audit.json)
records the largest 30 hosted PNGs whose local source hashes match the live
`f0ccfd37` manifest: **90,551,929 input bytes**, **89,316,017 candidate bytes**,
and **1,235,912 bytes of measured potential savings**. No paths were missing or
hash-mismatched in this selection. This completed run used Node zlib level 9 with
the existing PNG row filters, not a claim about every possible PNG encoder.
Every candidate was decoded by a bounded RGB/RGBA8 decoder and compared with
the original pixel bytes; IHDR and every non-IDAT chunk also matched exactly.
Each input/candidate hash, size, method and pixel/header/metadata check is in the
receipt. Original bytes are retained whenever recompression would grow a file.

Only four files improved: the three textile-light images saved 436,546,
396,343 and 371,695 bytes, and `windbreak-weave.png` saved 31,328 bytes. The
other 26 have no measured saving with this method. Six inspected authoring
originals also appear as exact downloadable originals in external media
bundles; their parent/offset pins are included in the receipt. None of the
authoring-original candidates improved.

The four improving files are still **hash-pinned runtime inputs**, not approved
generated replacements. In particular, the textile bytes are asserted by
`game/company-campaigns/curriculum-textile-lighting.mjs`, the edition asset
catalogue, reward data and a retained edition snapshot. The crosswind asset is
pinned in authored-content descriptors. Substituting these PNGs under unchanged
hashes would fail the existing integrity contract. No such substitution was
made. Even if all four gains were compatibly integrated, this measured set
would leave **at least 23,898,553 bytes** of the modeled retention shortfall,
before other hosting overhead or growth margin.

Two earlier native-encoder audit attempts did not complete: FFmpeg intermittently
stalled and hit its explicit 60-second operation timeout (one after 27 images).
They produced no completed receipt and no images. The second run was stopped
after another stall. Native encoding is now an explicit optional diagnostic,
not a prerequisite for the bounded deterministic audit or its tests. The five
completed native trials above remain valid separate observations.

Reproduce the default audit without installing native tools:

```sh
node scripts/audit-practice-png-capacity.mjs --out /absolute/new/png-audit.json
node --test scripts/test-audit-practice-png-capacity.mjs
```

An installed, responsive FFmpeg can additionally be exercised with
`--with-ffmpeg`. That environment-dependent diagnostic is not part of the default
test suite. The five deterministic tests pass without skips: all five PNG row
filters in RGB and RGBA, exact alpha/pixels, source non-mutation, ancillary
metadata preservation, checksum/truncation rejection, unsupported-format
rejection and bounded audit arguments. A new report path is required; neither
command writes or overwrites image assets.

## Repeatable CLI recipe

Run the existing no-write inspector from a clean committed checkout with all
required source inputs present:

```sh
node scripts/inspect-default-build.mjs --out /absolute/new/core-inspection.json
```

The inspector's output must be a new file outside the checkout or in an ignored
location. It does not build an expanded site or grant release admission. Keep
its complete manifest; a manually copied total is not accepted by the capacity
command.

Create a small input document, for example `/absolute/new/practice-capacity.json`:

```json
{
  "format": "revealline-practice-capacity-input.v1",
  "coreInspection": "core-inspection.json",
  "releases": [
    {
      "directory": "current-candidate",
      "packageIds": ["civilian-flight", "civilian-fpv", "fpv-worlds"],
      "activePackageIds": ["civilian-flight", "civilian-fpv", "fpv-worlds"]
    },
    {
      "directory": "previous-release-artifacts",
      "packageIds": ["civilian-flight", "civilian-fpv", "fpv-worlds"],
      "activePackageIds": []
    }
  ],
  "reserveBytes": 25000000
}
```

Paths are relative to this input document, not the current shell. Each directory
must contain the existing `optional-packages.json` envelope and its pinned
manifest files. `packageIds` may select a subset; omission selects all packages
in that envelope. Each immutable ID/version may appear once, and an ID may have
only one active stable launcher. For a first release, omit the previous-release
row and put the explicitly modeled future-generation allowance in `reserveBytes`
along with any chosen growth margin. Do not invent version numbers or modify an
old envelope to manufacture a retained version.

```sh
node scripts/bundle-optional-practice.mjs --capacity /absolute/new/practice-capacity.json
```

Exit 1 with `cannot-fit` means even the known lower bound plus explicit reserve
exceeds the existing guard. Exit 0 with `requires-exact-build` means only that
this check did not prove impossibility; it does **not** mean ready to publish.
Manifest hashes and source identity are checked against their candidate
envelopes, but archive bodies and review gates are not re-admitted by this
sizing command. The existing release admission and publisher must still run.

## Verification

Seven focused capacity tests pass: active/retained accounting, reserve behavior,
boundary semantics, duplicate/conflicting identities, invalid and overflowing
counts, unsafe/missing file descriptors, relative configuration paths, tampered
manifest rejection and unknown active IDs. The suite is included in
`npm run practice:test`. Changed capacity and bundle modules pass ESLint and
Prettier. No live selector, release, hosting configuration or content contract
was changed.
