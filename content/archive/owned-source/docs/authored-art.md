# Author pictures that survive play, packs and saves

A reveal picture can be a full illustration while the playable board, drone, hazards, cut and effects remain separate. Importing a picture changes presentation; it does not add a target, explosion, collider or ability. The same image can be played under different registered themes and rules without embedding gameplay into the artwork.

The current [Homeward Skies chapter](homeward-skies.md) demonstrates three original Ukrainian-inspired illustrations with preserved PNG sources and complete prompts. Its maps reuse the first three Fieldcraft geometry lessons under new chapter identities and artwork. This is an illustrated content chapter, not three new engine mechanics. Inspect the [source recipe](../authoring/library/homeward-skies/pack-source.json), [effective prompts and provenance](../authoring/library/homeward-skies/prompts.json), and generated runtime pack at `game/content/packs/homeward-skies.json`.

Current releases retain the second concrete source pipeline introduced in v0.17.1: [Equipment Workshop 1.1.0](../authoring/library/equipment-workshop/README.md) embeds original pictures for its existing heritage, 1990s and fictional spend-themed maps. Each selected PNG is 1448×1086; their combined originals total 8,330,027 bytes. The formatted runtime pack is **11,127,024 bytes**. Together with Homeward, this edition contains **six authored reward pictures across the unchanged 29 campaign maps**; the remaining 23 use procedural scenes. [Source browser review](verification/round-27/source-browser.md) covers partial play, completed pictures, returning collection records and the separate theme celebrations. The [frozen v0.17.1 browser report](verification/round-27-1/frozen-browser.md) records normal offline installation and later cached-picture/gameplay checks, together with the observed `Celebration dt must be finite and nonnegative` gallery-clock exception. Gallery celebration acceptance was incomplete in that frozen v0.17.1 run. The later [gallery-clock repair](verification/round-28/gallery-clock.md) is included in v0.18; its [four-theme source browser check](verification/round-28/gallery-clock-browser.md) records the corrected animation behavior. Static illustrations and animated gameplay/finale overlays remain separate.

## Import a supplied picture

1. Open the [Playground](../game/playground/index.html) and load the intended scenario or expansion. Keep a copy of the original file and record its source/rights status.
2. Choose the `background` role and import the local PNG, JPEG or WebP. The game validates its headers and fully decodes it before replacing the working image. Importing does not upload it or run an AI model.
3. Compare **contain** with **cover**. Contain retains the full composition; cover can crop outer subjects. These are drawing choices and preserve the original embedded bytes. Check partial reveals, bright/dark terrain and the full-picture ending at the intended screen sizes.
4. **Export scenario** preserves the current practice configuration. **Export map as expansion** creates an installable one-map pack. Install that pack through the main game's Library to earn progression and collect its picture. **Export loaded library** instead preserves the originally loaded campaigns; it does not fold unsaved map edits into them.

Imported images are static. PNG/JPEG/WebP files are limited to 4 MiB each, 8,192 pixels per side and 16 million pixels per image; combined scenario limits also apply. GIF, SVG, TGS, WEBM and animated PNG/WebP are not static-role inputs. Use the exact [eight-role contract and current limits](assets-and-configuration.md), including the separate player rig/padding constraints. A parsed image header is insufficient; the browser decode and rendered result must succeed.

Versioned `AssetRevisionV1` backgrounds also accept local `.png`, `.jpg`, `.jpeg` and `.webp` paths beneath `content-design/assets/` or `editions/assets/`. MIME comes from that exact path and must match the inspected bytes. The revision retains the original SHA-256, byte count and dimensions; importing, previewing and packaging never recompress it. Compact derivatives need a new immutable revision and their own source/rights record. Existing PNG records and their identities remain unchanged. Creator packages and Company Studio preserve these raster pins through export/import; edition compilation verifies selected and retained background bytes before packaging. Full browser decoding remains a separate runtime gate. No asset or offline budgets are increased.

Reviewed discovery scenes can be admitted with `node scripts/import-company-art.mjs RECEIPT.json --discovery-art --write`. Campaign-key and mission-reveal receipts retain the full prompt, exact master and selected derivative hashes, mechanical conversion record, source inspiration, English/Ukrainian descriptions and deferred human-review state. Corrective generations retain their input master and edit prompt. Admission rejects changed bytes, mismatched dimensions, unknown content identities and replacement of existing revisions. The selected image stays below the 1 MiB production target; normal asset and edition budgets still apply. Public campaign key art is selected separately with Company Studio's **Campaign key picture** control. Capturing the previous presentation and advancing affected pack/reward/edition revisions remains required before regenerating player content.

## Create optional art variations

Preserve supplied images by default. When styling or new art is requested, inspect the actual references and generate a separate output with its own asset ID. Record the complete effective prompt, parent source, tool route, actual dimensions and review findings. Keep a photograph or painting in its original medium unless the requested variant changes it. AI styling is an authoring action, not an automatic runtime upload feature.

Use [Background Stylist](../authoring/skills/xonix-background-stylist/SKILL.md) and [Asset Creator](../authoring/skills/xonix-asset-creator/SKILL.md). For a character body, keep independent propellers, anchors and reactive animation; a static replacement does not create new animation frames. Compare compact, detailed and hybrid appearances using the same geometry, class, seed and steering. Correct Ukrainian/hostile-military/neutral identity in the authoring record; current FPV art direction excludes Z markings. Decorative markings never establish a target's gameplay role.

Useful prompts to adapt:

> Keep my supplied Ukrainian town photograph unchanged. Import it as a background, compare contain and cover, and export a one-map expansion with the original bytes. Play the first cut and full reveal on portrait and landscape layouts; report actual decode and visual findings separately.

> Create a separate modern pixel-art derivative of my reference: crisp clustered pixels, restrained dithering, warm dawn light, a readable central subject and rewarding edge detail. Preserve the town's composition. Keep UI, drones and threats out of the background because the game renders them independently. Retain the original and record the full prompt and parent asset.

> Author a 1990s synth-arcade chapter with three distinct collectible scenes: an illuminated computer room, a rainy neon station and a dawn rooftop. Use the existing territory-capture rules and registered music descriptors. Produce one map-specific picture per level, retain sources and inspect the full reveal; do not imply the prompt created a new mechanic or licensed recording.

> Adapt the same chapter to an original Coupa-inspired Spend Network world: legible savings routes, warm celebratory light and a reusable avatar. Treat scores as fictional game points. Preserve capture geometry and independent actor roles, and avoid claiming official Coupa product behavior or actual customer savings.

## Maintain a reproducible illustrated chapter

The Homeward builder embeds each reviewed PNG byte for byte into its level's `visualOverrides.background` descriptor. It retains title, description and original-art metadata, chooses contain, and checks distinct source hashes. The original files and prompts stay outside the generated pack as maintainable source records.

```sh
# Read-only consistency check against the generated pack:
node scripts/build-homeward-pack.mjs

# After an intentional reviewed recipe/art change, rebuild its designated output:
node scripts/build-homeward-pack.mjs --write

# Verify the chapter's recorded route/ability comparisons:
node scripts/verify-homeward.mjs
```

The builder targets Homeward's existing files. To author another chapter, create a separate source directory and pack identity, then adapt the recipe/build step deliberately; do not overwrite Homeward to make an unrelated theme. Numerical rule or map changes require appropriate revision/identity changes and completion proofs. A visual source change also needs a pack-version decision and an in-game inspection; do not assume old collectible art updates are invisible to players.

The provenance file's “source-inspected; in-game review pending” entries record the generation-time review and remain unchanged. The separately dated [source review](verification/round-27/source-browser.md), [initial gallery-loading finding](verification/round-27/candidate-browser-initial.md), [v0.17.0 frozen offline failure](verification/round-27/frozen-offline-investigation.md) and [verified v0.17.1 browser journey](verification/round-27-1/frozen-browser.md) preserve the later findings without rewriting the original prompts.

For the existing Workshop's illustrated edition, use its separate [source recipe](../authoring/library/equipment-workshop/pack-source.json), [full prompts/provenance](../authoring/library/equipment-workshop/prompts.json), [preserved procedural v1.0.0 pack](../authoring/library/equipment-workshop/previous/equipment-workshop-1.0.0.json) and [Workshop builder](../scripts/build-workshop-pack.mjs):

```sh
# Default check is read-only; missing or stale output fails with guidance.
node scripts/build-workshop-pack.mjs

# Only after reviewing an intentional source/art change:
node scripts/build-workshop-pack.mjs --write
node scripts/build-workshop-pack.mjs
```

This builder allows only pack version `1.1.0` and the three generated `levelVisuals` additions over the preserved baseline. It embeds exact selected PNG bytes, checks distinct hashes and actual 4:3 dimensions, and rejects redirected files, unintended rule changes and budgets before replacing its designated output. It does not edit originals. Artwork creation or corrections use the image-generation/editing tool with retained parent sources; do not crop, quantize, resize or recompress accepted images through build scripts or image CLIs. Distinct hashes establish different bytes, not different or attractive compositions.

Workshop retains `xonix-pack.v2`, campaign/map IDs, normalized rules, roster, music and definitions; its campaign key remains `equipment-workshop/1/3fc2cf073da368b4`. Keep old proof bytes unchanged and verify the existing legal routes in both steering modes. No profile, replay, session, mastery or pack-schema migration is needed. The source recipe contains empty generated `levelVisuals`; the runtime output uses `[{levelId, visualOverrides: {background: {dataUrl, name, fit: 'contain', metadata}}}]`, with no `roles` wrapper.

Budgets remain 4 MiB raw and 6 MiB encoded characters per image, 20 MiB combined encoded artwork, 32 million combined pixels, 24 MiB per pack and 48 MiB installed library. Existing per-image dimension limits still apply. Report actual generated/installed/offline totals rather than silently raising limits; the static build's separate offline limit is 64 MiB and 2,000 files. Authoring originals are preserved outside the runtime distribution, whose pack carries the portable embeddings.

Build validation checks data and image headers. Installation separately performs sequential full image decoding. The chapter's route proofs cover registered gameplay behaviors, not human appeal or art quality. Inspect real first cuts, failures, ability effects, completion, gallery replay and mobile layouts. Keep those findings distinct from physical-device/controller tests.

Installed packs export their embedded originals. Complete backups and [earlier-release copying](continuity-transfer.md) preserve the installed pack together with progress, picture metadata and a saved flight. Removing a pack keeps earned records but can make its images unavailable until reinstallation. A same-ID replacement can deliberately change future rendering, so retain the prior source files and exported pack if the old edition must remain reproducible. See [library and expansion contracts](library-and-packs.md), [full backups](full-backup.md) and [versioning](versioning.md).

For a picture-only replacement, observe a previously earned procedural Workshop picture before and after installing 1.1.0. Existing collection records resolve the currently installed image; the update must not award another clear, duplicate a score, change a seal or require replaying the map. Reopen the collection, then check removal/reinstallation and complete-backup import/Undo through public controls. Finish each new picture using the existing legal scenario/session fixtures and inspect the real theme ending, Skip, reduced effects and gallery Replay. Check the unchanged Homeward FPV ending too: this validates four existing overlay families, not animation inside the paintings. Record browser decode, visual inspection and identity/byte checks as distinct evidence.
