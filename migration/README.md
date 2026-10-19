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
