# Exact external chapter delivery

This successor source adds Fracture Lines in FPV Front, Ukraine Atlas, 1994 Forever and Spend Network to the eight existing external editions. Its four Arcade editions share three authored Fracture layouts and keep twelve distinct original reward pictures, separate progress, existing theme music and null stories. They preserve the exact level IDs, rules, seeds and class recipes; the theme copies add no geometry families. The preceding eight descriptors, sixteen paired bodies and five embedded optional entries remain exact. This is source adoption, not a new frozen or public release; published v0.36.0 and v0.37.0 remain separate delivery evidence.

[The registry](../game/external-chapter-source.mjs) owns all twelve full immutable descriptors. [The separate catalog](../game/content/external-worlds.json) uses `revealline-external-chapters.v1` and must equal that registry's exact titles, descriptions, identities and pair hashes. Catalogs, file names and installed names never introduce a trusted descriptor. Main game, backup recovery and same-channel Picture Workshop all use the same registry, including release channels. Existing saved and first-earned picture/story pins are resolved unchanged; a new edition never substitutes for an old receipt.

## Install and Choose

Opening More worlds loads small catalog metadata, never a picture body. In a built release, each external card offers an explicit **Download & install** action with the total pair size. The two requests stay within the current edition's same-origin directory, refuse redirects, bound streaming bytes to their exact declared sizes, and support Cancel. The same descriptor validates both the compact gameplay JSON and `.rlmedia` originals before the existing installer receives a prepared capability. No pointer is published before the existing counted original-media commit/journal.

Each external card leads with its mode, three pictures and a short route description, followed by **Download & install** and separate **Choose chapter** actions. The pilot's display name is **FPV Front · Pressure Pictures**; its descriptor and payload identity are unchanged. Native **Gameplay file** and **Exact picture originals** inputs remain available under the initially closed **Restore from files** disclosure, together with recovery and backup limitations. Closed recovery controls are skipped by keyboard/controller navigation; opening or closing the disclosure preserves file selection, and collapsing a focused recovery body returns focus to its summary. Choose the matching `pack.json` and `media.rlmedia`; files from another theme refuse. A source checkout does not generate or serve missing pairs on demand. Installed state and readiness are tracked independently for each card. Shared operation/focus handling prevents another card or late completion from taking over a pending action.

Install keeps the current paused flight and selection. **Choose chapter** is separate and selects the exact installed campaign only after readiness. If disabling the initiating action displaced native focus, the current operation returns focus to Choose after success or an available retry/recovery action after refusal or Cancel. It never activates Choose and respects deliberate navigation elsewhere; a late completed install cannot move focus after Back and reopening. Interrupted publication needs the same exact pair and an explicit recovery; mixed journals remain refused. Recovery from an unreadable startup baseline requires a reload before adopting the preserved profile. An unavailable original never falls back to generic artwork. Clear or replace a current Workshop assignment without changing the descriptor's authored original or historical saved pins.

There is no automatic eviction or existing-user embedded migration. The 48 MiB cap includes normalized pack JSON plus descriptor index; twelve packs remain the limit. Twelve external and five embedded catalog choices are seventeen possible packs, so the catalog does not promise they can all be installed together. Count, pack/index and media staging refusals preserve existing installations without eviction. Originals share the unchanged 256 MiB committed-plus-staged managed store with stills, audio and optional stories. Every physical row and reservation remains counted. Repeated installation conservatively reserves incoming originals, so a deduplicated final fit does not guarantee a staging fit. Ordinary removal and pack-only export stay refused for indexed content; explicit v2 game-data replacement and Undo use the reviewed [backup contract](external-chapter-backup.md).

## Explicit build boundary

[Build configuration](../game/build-config.json) separately opts in with `externalChapters: { format: 'revealline-external-distribution.v1', catalog: 'game/content/external-worlds.json' }`. [The build adapter](../scripts/external-distribution.mjs) imports the six compilers from the selected source tree and checks their complete descriptor plus each output's exact size/SHA against that tree's registry. Dispatch is by exact registered edition ID, including the three distinct FPV editions. All producer and original-art folders receive ordinary-file/symlink checks. All compilation happens before destination publication. An absent opt-in leaves old build behavior and bytes unchanged.

Only an explicit build emits these twenty-four bodies, once each in loose files, the full manifest and distribution ZIP:

| Edition                          | Gameplay JSON | Exact picture originals |
| -------------------------------- | ------------: | ----------------------: |
| `original-fpv-pressure-external` |       9,398 B |             8,037,391 B |
| `route-worlds-ukraine`           |       8,405 B |             8,825,887 B |
| `route-worlds-retro`             |       8,307 B |             7,589,633 B |
| `route-worlds-coupa`             |       8,317 B |             8,280,993 B |
| `sentinel-circuit-fpv`           |       9,238 B |             8,596,058 B |
| `sentinel-circuit-ukraine`       |       9,440 B |             8,175,624 B |
| `sentinel-circuit-retro`         |       9,404 B |             7,553,086 B |
| `sentinel-circuit-coupa`         |       9,427 B |             7,416,321 B |
| `fracture-lines-fpv`             |       9,708 B |             8,669,310 B |
| `fracture-lines-ukraine`         |       9,311 B |             8,734,108 B |
| `fracture-lines-retro`           |       9,393 B |             7,967,075 B |
| `fracture-lines-coupa`           |       9,345 B |             8,718,918 B |

The twenty-four paired bodies total 98,674,097 bytes: the existing sixteen remain 64,546,929 bytes and the new eight add 34,127,168 bytes. The thirty-six original PNGs total 98,421,735 bytes, including twelve Fracture originals totaling 34,040,565 bytes. These are source payload totals, not a measured site/ZIP size or available installed space.

Paths are `optional/external-chapters/<edition>/pack.json` and `optional/external-chapters/<edition>/media.rlmedia`. Generated pairs are not duplicated in tracked source. Raw art, prompts, provenance folders, source proofs and compilers remain outside the runtime payload. The full source retains them unchanged.

The small registry/catalog and compatible runtime are core assets. All twenty-four bodies are excluded from the core offline cache and from the old `optionalPacks` JSON metadata. The five legacy external JSON downloads plus existing indexed optional packs keep their prior offline behavior. External pictures become locally available through explicit installation into the managed store, not through a hidden service-worker download. This does not itself qualify stopped-server/browser persistence. The existing 64 MiB core limit and complete site/ZIP inventories remain measured gates; archive capacity is a separate deployment decision, never a reason to raise a cap silently.

The refreshed Route Choices player descriptions remove source-audit wording from mission briefings. Their three campaign keys and companion metadata hashes differ from the earlier unpublished source candidate; all nine original records and PNG bytes remain exact. Earlier preview artifacts and profiles are preserved as separate evidence. This change does not migrate or silently reinterpret those earlier source-preview identities. The first external publication uses the final matching registry and pairs.

## Review and acceptance

Focused tests exercise exact three-theme native selection, real legal Route Choices and Sentinel wins and first-earned posters, restart readiness, crossed-pair refusal, released-host explicit download, response/stream cancellation, metadata/path/hash refusal, exact explicit producer bytes and legacy build preservation. The real-build test now requires twenty-four bodies, core exclusions and unchanged legacy metadata; it has not been executed for this source-only admission. The full site/ZIP/core budget measurement remains a later gate. These use actual compilers, core, original bytes and storage adapters with finite DOM/IndexedDB and modeled image dimensions. They do not establish physical controllers, phone layout, browser quota/disk persistence, native downloads, offline readiness, cultural authenticity, human enjoyment or public release acceptance.

Before release, qualify the exact frozen source/build, every public body, real browser install → separate Choose → win → Collection, paused run and first-earned story preservation, native JSON plus original-bundle recovery, and cold installed availability. Keep prior failed attempts and evidence scope. An actual source result is not a public or device result.

## Preceding Sentinel theme source admission

The preceding Sentinel source qualification covered the eight exact registry/catalog authorities, all sixteen in-memory producer bodies, strict same-edition transport of each new theme, crossed originals/cancellation refusal and the unchanged twelve-pack refusal without eviction. The actual app harness installs only the three new themes by explicit Download, preserves an unrelated paused cut, requires separate Choose, completes one legal Sentinel route per theme, and retains distinct first-earned still/null-story pins through metadata backup and restart. DOM, IndexedDB and repeated image dimensions remain modeled. The route is reused to test identity and integration, not to claim new geometry or human play balance.

Raw Sentinel theme art, prompts, provenance, compact proofs and compiler sources remain outside the default runtime file list. Only the explicit distribution producer emits the six exact new pair bodies. No runtime generation, original duplication in core, old owner migration, movie, music composition or cap increase is introduced. Its frozen/public qualification belongs to the separate v0.37.0 delivery; it does not qualify this later Fracture adoption.

## Fracture source admission

[The Fracture host test](../game/test/fracture-chapter-host.test.mjs) exercises four explicit downloads that preserve an unrelated paused flight, separate Choose, a legal first-map win and exact first-earned still/null-story identity per owner. It also covers restart, the next unlocked mission, an unfinished saved line, and explicit v2 JSON recovery: a fresh profile first refuses missing originals without writes, then accepts the same metadata after downloading the exact four pairs. Import prepares the saved flight; explicit Continue loads its exact paused checkpoint and picture pin. [The distribution test](../game/test/fracture-chapter-distribution.test.mjs) keeps fixed fingerprints for the preceding eight authorities and checks all twenty-four in-memory bodies, four URL prefixes, crossed pairs, cancellation, and source-art exclusion. These are modeled source tests; execution receipts and the one retained candidate build remain separate acceptance gates.

The existing FPV compiler and [three-theme compiler](../authoring/library/fracture-theme-chapters/README.md) retain their previously qualified legal traces. This integration does not rerun or inflate that geometry proof. Art is scenic reward content, not collision geometry, historical reconstruction or product UI. The [separate production candidate](../authoring/production/register-fracture-themes.json) binds exact original IDs and owner identities while preserving existing work and planning slot IDs. Fracture layout assignments remain proposed; binding produced pictures does not approve map quality or human enjoyment. The actual model derives 48 produced picture works, 68 unbound picture cells, twelve proposed layout families, seventeen unassigned map slots and zero quality-approved maps. Those register totals include earlier cohorts; the runtime external catalog has thirty-six originals. The candidate is not silently selected by the production UI.

Validate it explicitly without changing the previous register:

```sh
node authoring/production/cli.mjs validate authoring/production/register-fracture-themes.json --previous authoring/production/register-sentinel-themes.json --files --json
```

No app, Couch, audio, storage, installer, worker algorithm or capacity change is needed for these registered owners. Browser install, native save/original recovery, Collection, offline persistence, layout/device acceptance and a future release remain separate gates.
