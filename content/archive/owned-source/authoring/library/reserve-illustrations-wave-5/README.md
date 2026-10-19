# Reserve illustrations · wave 5

Four original reward-scene illustrations follow [wave 4](../reserve-illustrations-wave-4/README.md), bringing the selected reserve series to twenty works. They are art sources, adding no playable levels, runtime bindings, animation, pack or release.

| Theme | Original | Composition |
| --- | --- | --- |
| FPV Front | [Copper Canyon Flight](originals/fpv-copper-canyon-flight.png) | A complete four-rotor quad hovering over copper canyon layers and a distant waterfall, contrasting with Aurora Snowfield's still winter-night setting. |
| Ukraine Atlas | [Winter Sled Courtyard](originals/ukraine-winter-sled-courtyard.png) | A wooden sled, indigo blanket and red mittens in snow beside warm cottage windows, distinct from Autumn Footbridge's open woodland. |
| 1994 Forever | [Lavender Bowling Night](originals/retro-lavender-bowling-night.png) | A turquoise ball and coral/cream shoes against long maple-lane reflections and violet lights, distinct from Violet Laundrette's machines and rainy window. |
| Spend Network | [Raincatcher Rooftops](originals/spend-raincatcher-rooftops.png) | A deep-teal barrel, copper gutter and leafy rooftop terrace above the sea, distinct from Canal Parcel Crane's quay and cargo. |

The four selected PNGs total **9,718,112 bytes**. Each returned original is **1774 × 887, RGB, 8-bit**, exactly **2:1**. The requested 1536 × 768 size was a target; original pixels are retained without resizing, cropping, color conversion or local editing.

Four separate built-in `image_gen.imagegen` calls used the exact [prompts](prompts/) without reference images. All four outputs were selected, with no rejected variants or additional scenes. [Tool responses](provenance/tool-responses.json) and [original records](provenance/originals.json) preserve output paths, hashes and prompt identities. Tool originals remain intact; worktree PNGs are independent-inode APFS clones. The combined waves 4–5 budget counts both logical copies plus raw Git additions under **70 MiB**, without credit for sharing.

The author viewed every complete original at original resolution. PNG chunk CRCs, Pillow verification and full decoding passed. [png-inspect.py](provenance/png-inspect.py) repeats those manifest checks without changing pixels; it does not automate aesthetic review. The scenes use stepped shapes and rich color variation, rather than a certified fixed palette or uniform pixel lattice. Full-size canyon rocks, blanket fibers, rooftop plants and glossy reflections contain detail that compresses at small size.

One prompt deviation is retained explicitly: Copper Canyon Flight has a tiny illegible yellow decorative mark on the blue battery despite the requested blank surfaces. No recognizable company mark or readable wording was identified; this is not a claim that every surface is blank. The winter gate's small geometric cutouts and distant pointed roofs are invented decoration, not a documented regional or historical reconstruction. Bowling pin layout and drone hardware are illustrative rather than technical specifications. The raincatcher hose is round and coiled rather than the requested folded canvas form; the roof and plants meet scene edges while the main barrel remains complete.

The [comparison page](provenance/index.html) places each original beside wave 4 at **320 × 160 CSS pixels**, using complete original files. [serve.py](provenance/serve.py) exposes only the page and eight selected PNGs on loopback. Pass `--previous /absolute/path/to/reserve-illustrations-wave-4` to reuse prior originals. Native observations and unchanged captures are recorded in [inspection.json](provenance/inspection.json). The full-page export may be scaled down; the viewport captures retain the configured small-view composition.

FPV equipment is decorative, not an operational diagram. Ukraine architecture is fictional regional atmosphere, and retro equipment evokes a period without claiming a manufacturer. Spend Network depicts no real company or product. Runtime adoption remains false. Map crop, reveal-mask readability, reward timing, offline packaging and actual gameplay require separate validation.
