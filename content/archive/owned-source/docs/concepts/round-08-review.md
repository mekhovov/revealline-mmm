# Round 08 — applied body assets and provenance

Five new transparent body images are bound to the motion lab. The existing Daybreak body remains unchanged. The renderer adds separately configurable blades, wings, thrusters or helper effects; those moving components are not baked into these body files.

| Bound original | Dimensions | Fully transparent pixels | Applied role |
|---|---:|---:|---|
| [Skyline FPV](../../authoring/motion-lab/assets/fpv-racer.png) | 1312 × 1199 RGBA | 1,075,623 | Compact guarded frame; four independently anchored propellers |
| [Night signal FPV](../../authoring/motion-lab/assets/fpv-night.png) | 1254 × 1254 RGBA | 1,256,921 | Open dark frame; separate motor positions and night recipe |
| [Atlas bird](../../authoring/motion-lab/assets/ukrainian-bird.png) | 1145 × 1374 RGBA | 1,383,501 | Original folk-inspired swallow body; moving wings supplied separately |
| [Tape runner](../../authoring/motion-lab/assets/retro-craft.png) | 1223 × 1286 RGBA | 1,213,516 | Original retro craft; separate twin exhaust effects |
| [Spend Sprite](../../authoring/motion-lab/assets/navi-avatar.png) | 1254 × 1254 RGBA | 1,148,113 | Original business helper; separate pulse/highlight animation |

The alpha channel and dimensions were inspected read-only with Pillow. Each accepted image was visually inspected before binding. Originals were copied byte-for-byte into the asset directory; no programmatic image cleanup, recoloring or transparency extraction was applied. Six body files support nine themed appearances through shared-body treatments; neither a new palette nor a recipe is counted as a new body illustration.

## Generation record

[Initial generation prompts](round-08-generated-prompts.json) contain five requested jobs and their native output paths. The bird, craft and helper outputs were accepted. The first two reference-based FPV edits produced **RGB images with a baked checkerboard**, so those two outputs were rejected and are not bound to the lab.

[FPV correction prompts](round-08-fpv-correction-prompts.json) record two further image-tool transparency correction attempts, also rejected as RGB, followed by two accepted fresh text-only generations. The accepted Skyline and Night images are new original concepts, not pixel-identical edits of the original Daybreak body. Keeping the failed attempts in the prompt record is intentional provenance, not a claim that their files are usable assets.

Generated-image native paths in those JSON records identify the source files; the bound project copies are the durable review targets above. Existing [Daybreak source](round-07-fpv-body.png) and its [bound copy](../../authoring/motion-lab/assets/fpv-body.png) remain the earlier accepted image.

## Art and animation review

The FPV concepts have readable four-arm silhouettes, compact central batteries/camera cues and blue/yellow Ukrainian accents. Skyline's circular guards are static structural body art; each guard receives its own animated blade overlay. Night has a wider open motor layout, so it uses different anchors and radius. There are no Z markings on these current bodies.

The Atlas bird uses original decorative motifs rather than claiming an exact historical regional artifact. Falcon trim currently changes the wing treatment of the same body. The retro craft is an original arcade-inspired silhouette; Vector trail changes exhaust. Spend Sprite and Audit pulse are original helper treatments, not verified Coupa/Navi character assets.

The live inset shows the small body enlarged independently of the arena. At the default 1.25-cell slot, the body is only about 8–18 CSS pixels in the checked layouts; transparent padding and non-square source fitting reduce occupied pixels further. Large-source detail cannot be assumed to survive that reduction. Production still needs intentional low-resolution exports, pixel-grid cleanup, blade/hub contrast review, exact attachment alignment and physical-phone playtests.

Current terrain remains independently selectable material diagrams in microtile, prop and hybrid modes. This round adds player bodies and component animation, not finished terrain/enemy/UI/audio/marketing asset packs. [Preview checks](../../authoring/evaluations/round-08-preview-checks.md) distinguish actual browser checks from future production requirements.
