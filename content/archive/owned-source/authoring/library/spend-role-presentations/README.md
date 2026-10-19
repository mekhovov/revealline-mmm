# Spend Network — seven helper-body source candidates

Seven original top-down helper machines use the existing game's ivory, blue, and gold Spend Network palette as art direction. Each retains an existing role ID and gains a proposed display name and fictional purpose for this source collection.

| Existing role | Proposed name | Narrative purpose only | Source silhouette | PNG bytes |
| --- | --- | --- | --- | ---: |
| scout | Savings Seeker | Finding savings | Pear-shaped lens helper | 390,919 |
| bomber | Value Dispatcher | Dispatching value | Connected triangular three-lobe parcel router | 751,704 |
| carrier | Supply Courier | Carrying supplies | Rectangular tray with two forward forks | 557,242 |
| interceptor | Waste Catcher | Intercepting waste | Slender kite/dart with short swept fins | 313,087 |
| fiber | Workflow Linker | Connecting workflows | Two open rings in a vertical figure-eight | 607,264 |
| impact | Flow Opener | Clearing bottlenecks | Broad front roller on a T-shaped utility body | 467,205 |
| trapper | Risk Cradle | Containing risk | Open horseshoe with blunt protective arms | 672,321 |

These names and purposes do not introduce or alter mechanics. The collection is source art on an isolated branch based on `e9928cdaad2f55d912aadd2ef25f635fb99e938c`; no registry, runtime, presets, abilities, collisions, build configuration, release assets, or existing IDs changed. Seven static originals are not seven finished animation rigs.

The seven PNGs total **3,759,742 bytes**. Each is **1254 × 1254 RGBA, 8 bits per channel**, although the requests specified 1024-square output. Every original came from a separate fresh text-only built-in `image_gen.imagegen` call. Exact prompts, tool output paths, PNG chunk checks, SHA-256 values, and APFS clone provenance are retained. No original was rewritten, flattened, cropped, resized, palette-reduced, background-removed, or otherwise edited.

The current palette and theme labels are pinned in [reference-theme.json](provenance/reference-theme.json). Coupa's official documentation describes Navi as conversational procurement/workflow guidance and Agent Studio as an environment for specialized agents. This supports the helper vocabulary as an interpretation; the inspected product-UI descriptions do not establish a mascot design. No official Navi likeness or copied product interface is claimed. [Coupa glossary](https://docs.coupa.com/en/coupa-glossary/overview/c), [Navi supplier assistance](https://docs.coupa.com/en/supplier-documentation/coupa-for-suppliers/the-coupa-supplier-portal-or-csp/answer-csp-related-questions-with-csp-supplier-assistance-agent). The retained [reference note](provenance/official-reference.json) records that indexed official text was available while direct opens redirected to an unsupported-browser page; no official image pixels were downloaded or used as generation inputs.

All seven complete source images were individually inspected with `view_image`. Their visible appendages fit the canvas. [Read-only alpha inspection](provenance/alpha-inspection.json) verifies real transparency, with all substantial bounds (alpha at least 128) inset. Most nonzero alpha values are near opaque rather than fully opaque; the modal value is 253 in every image. Many distinct RGBA values remain, so neither a strict palette count nor exact palette-color reproduction is asserted. Faint nonzero-alpha fringes reach a frame edge in Bomber, Impact, and Trapper.

Requested framing was not uniform: Scout has more padding and a smaller painted footprint; Bomber's 99-pixel side margin, Carrier's 106-pixel north margin, and Fiber's 48-pixel north margin fall below the requested 10%. The intact originals preserve these differences. Full findings are in [full-image-inspection.json](provenance/full-image-inspection.json).

[The inspection board](inspection/index.html) displays the unchanged images at 24, 32, and 56 CSS pixels over black and an existing Spend Circular Workshop reward-picture crop. North/East/South/West and Auto/Pixelated sampling are visible controls. Its `/scene.png` route reads the retained reserve illustration without making another copy; the background's generic reuse motif is separate from these body designs. [Native captures and findings](inspection/game-scale-receipt.json) retain North/Auto and settled East/Pixelated. The seven silhouettes are distinguishable on black, while the busy workshop scene conceals finer interiors. Scout reads noticeably smaller at24/32 because of its padding. Carrier, Fiber, Impact, and Trapper have distinct fork/ring/T/U shapes; ring-form heading is less immediate than the dart, forks, and roller. These limitations require later per-role sizing and movement review. The board is a static source comparison, with no gameplay, contact-size, performance, animation, or physical-device certification.

North is up. A later authoring pass could investigate a centered paint pivot, wheel or roller articulation, parcel-drum emphasis, ring/waist motion, and padded-arm motion. Those are proposals requiring their own anchors and validation; the current components are baked into single images. Runtime derivatives, decoded-memory budgets, per-role sizing, sampling, and movement readability remain separate future work.

Prompt variations deliberately change the silhouette: “large gold search lens in a compact pear-shaped helper,” “two open toroidal housings joined at a narrow waist,” and “thick padded horseshoe arms leaving a large north-facing gap.” The complete seven request texts, including framing and palette directions, are preserved under `prompts/`.

The total new-data allowance is 32 MiB for retained tool originals, eventual Git objects, and small inspection artifacts. Exclusive APFS workspace clones have distinct inodes but initially share data; their logical lengths are not exclusive-allocation measurements. Seven original lengths plus a raw same-size future Git allowance and a 2 MiB text/inspection reserve total **9,616,636 bytes** before final measured staging. No production build or test run is required for this source-only art collection.
