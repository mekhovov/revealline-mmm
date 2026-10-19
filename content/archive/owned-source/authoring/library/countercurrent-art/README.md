# Countercurrent reward-art candidates

Open the [review gallery](index.html) for twelve small previews, each linked to its full original. The [manifest](manifest.json) fixes independent cell IDs, original paths and hashes; [full prompts](prompts.json), [tool results](generation-results.json) and [provenance](provenance.json) preserve generation and observations. No reference image was supplied, and no original was cropped, stretched, resampled or re-encoded.

| -------------- | ---------------------------- | ----------------------------- | ---------------------------- | --------------------------- |
| Offset Docks   | Lanterns at the Offset Piers | The Boatbuilders’ Morning     | Records across the Canal     | The Shared Receiving Courts |
| Sandbar Braid  | The Four Sandbar Relays      | Four Gardens beside the River | Last Platforms of Summer     | Four Workshops, One Garden  |
| Crossing Watch | Two Quiet Signal Posts       | The Ferry Lights Return       | After-Hours Rooftop Exchange | The Two Caretaker Houses    |

The [layout cues](layout-briefs.json) preserve the separately authored source-layout hash and three finite obstacle silhouettes: opposite hooks, four staggered bars, and two unequal islands. The pictures echo those large forms in perspective. Scenic piers, paths and bridges are not collision geometry; Crossing Watch’s dynamic warning lanes are deliberately absent. Art adds no gameplay proof or new geometry family.

## Verification and review derivatives

```sh
node authoring/library/countercurrent-art/verify.mjs
```

The verifier reuses the existing bounded full RGB8 PNG decoder: every chunk CRC, chunk order, bounded inflate and scanline filter is checked, alongside dimensions, source hashes, full prompt hashes, the exact twelve-cell set, ordinary-file inventory and protected dependencies. `--tool-originals` additionally compares workspace copies with the local default tool outputs. Initial `--record --tool-originals` writes an exclusive receipt; an existing receipt is never overwritten. Portable verification requires no access to default generator files.

The [derivative record](derivatives.json) describes twelve **384 × 192 JPEG review copies**, 483,255 bytes total. Original aspect is preserved without cropping; nearest-neighbor Canvas sampling retains the pixel clusters, followed by quality-90 JPEG encoding. These small previews are not substitutes for future reward originals. The generator decodes every JPEG through the existing Canvas library and records its pixel hash. Portable verification checks its exact bytes, JPEG structure and source associations; it does not claim cross-platform encoder determinism.

To make a separate review set with the existing optional Canvas tooling:

```sh
node authoring/library/countercurrent-art/render-previews.mjs \
  --canvas-module /absolute/path/to/@napi-rs/canvas/index.js \
  --out /absolute/new/review-directory
```

The output must be new and outside the source folder. It contains twelve JPEGs, a labeled contact sheet and a derivative record. The first buffer-loader attempt rejected the PNG’s embedded C2PA SVG icon; that failed attempt remains in authoring cache. Loading the same unchanged local PNG path through Canvas succeeded, without stripping provenance or altering originals.

## Independent replacement

Replace one cell through a fresh original generation and visual review, retain the previous original and prompt evidence, then update that cell’s manifest/provenance/tool record and explicit verifier pin. Regenerate its review derivative in a new output directory and record the input/output hashes. A changed pixel body is a new candidate; never relabel an existing saved or earned original as the replacement. Runtime compilation, descriptor/owner identity, original availability, partial reveal, gameplay and device acceptance require a separate adoption slice. This batch provides no animation or human-quality certification.
