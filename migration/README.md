# Coupa ownership migration

This directory records the migration from RevealLine. It is not included in the Pages artifact.

- `content-receipt.json`: original selected edition files, content identities, Git blobs and SHA-256 hashes at upstream `cdbda99ac881eb9cac62d536543d9078b92ac081` (v0.151.1).
- `supplemental-receipt.json`: eight native 2D collections, 20 selected missions, recipes and source artwork. The mixed Neon Mosaic and Equipment Workshop archives retain only the owned level entries. `content/archive/` is authoring/provenance material, never a runtime import catalog.
- `upstream-inventory.json`: current-tree ownership **candidates**, including names, textual references, exact-byte matches and embedded archives. This is not a deletion list; mixed registries and archives require individual disposition.

The app uses the upstream deterministic engine and official Snake recipes. Local inputs own the five Coupa chapters, supplemental recipes, artwork, menu scenes, actor adapters and interface policy. Existing chapter and mission identities are unchanged. Multiplayer uses the retained standalone edition projection. Supplemental native missions retain their original geometry and class recipes and are currently exposed in Solo. Snake retains all 240 official recipes and supports Solo, matched-board Versus and shared-board Team. No SIM or Survivals runtime is published.

Verification covers every official Snake recipe in each of the three modes, export/restoration, all 20 supplemental recipes with replay verification, all 30 original missions and their two-player host admission, storage boundaries, retained presentation identities, and every published dependency/hash. Browser verification includes locked entry points, mode startup/pause, terminal Snake results/restoration, expansion content and settings/network audits. The current password verifier and app-specific storage namespace are retained.

## Sequencing and remaining history work

The dedicated deployment must be verified before removing original-game content. Current-source removal, full authoring/history preservation, remote ref cutover, release/artifact cleanup, pending PR reconciliation, and synchronization against cleaned upstream are subsequent migration steps. Do not treat this app update or the candidate inventory as proof that historical removal is complete.

Backup material and remote-ref/PR snapshots live outside both repositories on the Mac mini share. A local Git bundle preserves the original local graph, and a separate full remote mirror is being prepared. Original dirty worktrees are not reset or deleted. Historical rewriting must operate on a separate mirror, retain the old-to-new commit map outside the cleaned repository, and check expected remote refs before publication.

## Current-source preservation receipts

`owned-source-receipt.json` accounts for every named ownership candidate in the migration inventory, reusing identical live inputs and archiving the other originals under `content/archive/owned-source/`. SHA-256 and original Git blob checks verify those copies. `generator-fragment-receipt.json` preserves owner-specific data and code excerpts from mixed generators without turning the other communities' generators into app dependencies. These excerpts are provenance, not a claim that all mixed registries have been split or that historical extraction is complete. The runnable app still consumes its local native content files through the pinned shared compiler.

The first application update was merged in PR #5 at `432ca959b6e5b6c88627ae716595476bd2d99593`. Its CI tests and build passed. The initial private-repository deployment hit the account's Actions artifact quota and Pages plan restriction. The owner then explicitly authorized making this repository public. [Deployment run 39275226323](https://github.com/mekhovov/revealline-mmm/actions/runs/39275226323) published `9fc0e2aa223f90a286d1ac4307473e759e7c91c5`, and live browser checks passed for the password gate, capture Solo/Versus/Team, Snake's three modes and save restoration, all 20 supplemental missions, clean settings and asset requests. The first cold capture load exceeded a 20-second readiness wait; all modes passed with a longer loading allowance. No gameplay change was required.

## Runnable chapter authoring

`authoring/company/` now contains executable local generators for the five primary chapters, their lessons and rewards. `company-authoring-receipt.json` records the source and local hashes. `npm run verify:authoring` reconstructs 48 JSON files using only these owned generators plus pinned generic engine helpers; all JSON values retain their original identities, and 47 files also reproduce the original bytes. The catalog differs only in serialization. The four original lesson test fixtures remain valid. This advances the mixed-generator split; supplemental generators, unnamed ownership dependencies and historical migration still require completion.

## Native collection authoring

`authoring/collections/` treats the eight locally preserved native packs as editable source, replacing reliance on mixed upstream theme assembly scripts. Its compiler retains all 20 selected mission recipes and identities. CI verifies each admitted source hash, the exact ordered mission list and complete generated recipe values against the local shipped files. The older producer excerpts remain provenance; current upstream mixed-registry removal and historical migration are still outstanding.

`level-numbering-receipt.json` preserves the 47 previously assigned mission display numbers. The other three supplemental missions had no shared-registry number and retain that behavior. The dedicated app owns this small registry, so retiring its entries upstream cannot renumber local missions or expose another community through the registry.
