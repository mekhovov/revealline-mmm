# Spend Network mode artwork — 2026-09-29

Four original mode compositions extend the existing `coupa` / Spend Network world. Solo artwork remains unchanged. The approved coastal village (`game/ui/art/menu-scenes/coupa.webp`) and Navi player (`authoring/motion-lab/assets/navi-avatar.png`) supplied world and character references.

Versus uses two separate cyan/amber docking pedestals and inward-facing Navi pods. Team uses one shared dock, one cyan beacon and two connecting cables. Both retain Navi’s white rounded housing, navy face and cyan eyes. The landscape has a shaded left menu area; separately generated portraits move the characters into the lower half with room at the sides. They are not landscape crops. Team portrait received one image-generation refinement to darken its upper arch; the initial generated input is retained for reproducibility.

## Saved artwork and exact prompts

- Final original PNGs and prompt records: [coupa-mode-scenes-2026-09-29](../../authoring/library/menu-scenes/coupa-mode-scenes-2026-09-29/).
- Exact generation/refinement prompts, source hashes and reference hashes: [prompts.json](../../authoring/library/menu-scenes/coupa-mode-scenes-2026-09-29/prompts.json).
- Generator: **OpenAI built-in `image_gen`**, five calls: four initial compositions and one bounded Team portrait refinement. No CLI generation, stock images or procedural stand-in artwork.
- The retained `coupa-team-portrait-draft-v1.png` is an authoring reference only. It must not enter the runtime asset closure.

## Runtime encoding

Deterministic format conversion used Pillow 12.1.1 / libwebp 1.6.0: `image.save(path, format='WEBP', lossless=True, quality=100, method=6)`. In lossless mode, `quality=100` controls encoding effort. All four decoded RGBA pixel buffers match their original PNGs exactly; dimensions are unchanged. No cropping, resizing, retouching or lossy fallback was used.

| Runtime image                | Dimensions  | WebP bytes | With 147,343-byte atlas | SHA-256                                                            |
| ---------------------------- | ----------- | ---------: | ----------------------: | ------------------------------------------------------------------ |
| `coupa-versus.webp`          | 1536 × 1024 |  1,620,118 |               1,767,461 | `7c10b3469f5bbabd6a704abb0900f9c9afd1d8755b830f2f0229c3370cf051dd` |
| `coupa-versus-portrait.webp` | 941 × 1672  |  1,669,344 |               1,816,687 | `5e5aa3c392527b45757f4175639919544be598ad4140959f8c7297297e0af8e6` |
| `coupa-team.webp`            | 1536 × 1024 |  1,580,074 |               1,727,417 | `be7f79098d17957e598e7fd4a96004f2656a7459a08980b0bcd8ac757c30f136` |
| `coupa-team-portrait.webp`   | 941 × 1672  |  1,744,888 |               1,892,231 | `41c42fefb39048fd1dadd790ef14225275ca99333c8b6383e8fc09f9763d0de7` |

The maximum active image-plus-atlas payload is **1,892,231 bytes**, leaving **204,921 bytes** below the unchanged 2,097,152-byte limit. This is encoded network/storage size, not decoded GPU or browser memory.

## Integration handoff

The integration owner received `/private/tmp/coupa-mode-scene-integration-20260929.json`, including exact asset provenance, paths, dimensions, focal positions and separately authored landscape/portrait animation rectangles. The rectangles target the painted cloud wisps, lamp glass, open sea and ivy. They avoid animating the robots or building edges. Existing regional artwork motion supplies the timings and lifecycle: cloud 16 s, lamp 4.8 s, water 5.2 s, foliage 7 s, with staggered delays.

During integration, the portrait foliage rectangles moved from the cropped-out left ivy to the visible lower-right planters: Versus `(78, 85, 15, 10)` and Team `(80, 87, 12, 10)`, expressed as image-space percentages `(x, y, width, height)`. Other proposed regions and all image bytes stayed unchanged. The integrated catalogue is authoritative over the earlier temporary handoff spec.

The intended scope is `MENU_SCENE_COMPOSITIONS.coupa.versus/team`; the 18 world IDs and Solo scenes remain intact. Company Solo packages must exclude the four mode images. Shared catalogue, preparation pipeline, provenance and admission ledgers are owned by the integration batch, not this asset-only change.

## Automated integration and package boundaries

The shared Retro/Coupa scene cohort passed **69/69** tests. Normal source admission verified **187 runtime assets** after admitting the eight combined additions. An independent actual in-memory compilation passed for all **14 editions** on the frozen source: **835 captured inputs** remained stable, with a **574-file engine** set. All multiplayer scene images were excluded from those Solo editions. The largest final offline core was DroneAid at **66,781,145 bytes**, **327,719 bytes** below the unchanged 64 MiB cap. This is dependency and final-byte-budget evidence, not installed-offline or publication acceptance. The complete matrix is retained by the packaging batch; see the [parallel integration report](retro-mode-scenes-2026-09-29.md).

## Browser evidence

The parent thread ran `game/test/manual/portrait-motion-check.html?suite=coupa` through CUA in the in-app browser against source port **8985**. The final fixture passed **4/4**, selected the correct image in every case and measured changing pixels in all four authored regions. Inactive-host and reduced-motion checks stopped rendering in every case. The parent visually approved all four mode/orientation compositions.

The following values are transcribed from the observed fixture DOM report, not a saved raw framebuffer capture. Pixel pairs sample the production WebGL output approximately two seconds apart inside the fully weighted regions visible through the final crop. CSS entrance motion, the menu shade and receiver noise are outside that buffer and cannot account for these changes.

| Composition      | Viewport   | Changed cloud / lamp / water / foliage pixels | Browser callback median / p95 / max |
| ---------------- | ---------- | --------------------------------------------- | ----------------------------------- |
| Versus landscape | 1280 × 800 | 10,527 / 945 / 1,835 / 3,099                  | 8.3 / 10.2 / 10.3 ms                |
| Versus portrait  | 390 × 844  | 9,849 / 783 / 1,477 / 6,571                   | 8.3 / 9.7 / 10.1 ms                 |
| Team landscape   | 1280 × 800 | 14,550 / 1,107 / 1,856 / 4,750                | 8.3 / 9.8 / 10.4 ms                 |
| Team portrait    | 390 × 844  | 14,454 / 480 / 1,247 / 5,511                  | 8.3 / 9.9 / 10.3 ms                 |

Each row contains **120 `requestAnimationFrame` callback intervals** measured while artwork motion is active. Rendering remains capped at 30 fps. These intervals measure browser callbacks, not GPU work, phone performance or decoded memory.

### Actual Versus landing

At `/game/couch/?journey=legacy` on port 8985, the parent selected the First Signal tactical map, then Spend Network through Advanced setup. After the world load settled, Done and Back returned to the landing. At **1280 × 720**, the complete title, modes, four actions, fullscreen utility and footer fit, with both Navi pods beside the menu. At **390 × 844**, all controls fit without split labels; the characters were partly beneath the action scrim. This portrait check establishes usable controls and recognizable actors, not unobstructed artwork behind every action.

Both viewports selected the correct `coupa-versus` image: **1536 × 1024** landscape or **941 × 1672** portrait. The live scene reported `composition=coupa-versus`, `loaded=true`, `motion=on`, `renderer=webgl` and `running=true`. No gameplay was started. Team received the four-case production-renderer fixture coverage above; this batch did not separately inspect its actual landing host.

## Qualification boundaries

Completed: reference/original visual inspection, four lossless decoded-pixel comparisons, exact source/runtime hashes, unchanged dimensions, combined active-byte cap, four production-renderer motion/pause/reduced-motion cases, and actual Versus desktop/portrait landing checks. No physical-controller, phone GPU/memory, long-session animation-comfort, native-package or published-release qualification is claimed here.
