# Reserve illustrations · wave 4

Four original reward-scene illustrations follow [wave 3](../reserve-illustrations-wave-3/README.md), bringing the selected reserve series to sixteen works. This is an art source cohort: it adds no playable levels, runtime bindings, animation, pack or release.

| Theme | Original | Composition |
| --- | --- | --- |
| FPV Front | [Aurora Snowfield](originals/fpv-aurora-snowfield.png) | A complete four-rotor quad on snowy rock, dark pines and broad turquoise aurora; a winter night counterpart to Basalt Beacon's evening observatory. |
| Ukraine Atlas | [Autumn Footbridge](originals/ukraine-autumn-footbridge.png) | A timber bridge, russet cloak and golden woodland over a clear stream, distinct from Apricot Glasshouse's still-life foreground. |
| 1994 Forever | [Violet Laundrette](originals/retro-violet-laundrette.png) | Cream round-window machines and a yellow basket against rainy violet windows, distinct from Poolside Mixtape's outdoor leisure scene. |
| Spend Network | [Canal Parcel Crane](originals/spend-canal-parcel-crane.png) | A complete wooden crane and suspended plain crate over turquoise water, distinct from Copper Kettle Bazaar's market display. |

The four selected PNGs total **10,310,923 bytes**. Each returned original is **1774 × 887, RGB, 8-bit**, exactly **2:1**. The requested 1536 × 768 size was a target; all returned pixels are retained without resizing, cropping, color conversion or local editing.

Four separate built-in `image_gen.imagegen` calls used the exact [prompts](prompts/), without reference images. All four outputs were selected, with no rejected variants or hidden extra scenes. [Tool responses](provenance/tool-responses.json) and [original records](provenance/originals.json) retain source paths, hashes and prompt identities. The tool originals remain intact; independent-inode APFS clones supply this worktree. Storage accounting conservatively includes both logical copies and raw Git additions under the combined waves 4–5 **70 MiB** cap.

The author viewed every complete local original at original resolution. PNG signatures/chunk CRCs, Pillow verification and full decoding passed. [png-inspect.py](provenance/png-inspect.py) repeats those manifest checks without editing pixels. It does not automate aesthetic review. These are pixel-art-inspired scenes with stepped shapes and rich color variation, not a certified fixed palette or uniform pixel lattice. The bridge has particularly fine foliage and water texture. The laundrette's third machine and peripheral plants reach the right edge; its basket and three round windows remain recognizable. Background buildings and foliage are intentionally cropped by the scene boundaries. No legible branding or lettering was observed.

The [comparison page](provenance/index.html) places each original beside wave 3 at **320 × 160 CSS pixels**, using the complete original files. [serve.py](provenance/serve.py) exposes only that page and eight selected PNGs on loopback; pass `--previous /absolute/path/to/reserve-illustrations-wave-3` to reuse retained prior originals. No older PNG is duplicated in this cohort. Native observations and unchanged captures are recorded separately in [inspection.json](provenance/inspection.json).

The Ukraine setting is fictional regional atmosphere; retro hardware evokes a period without claiming a manufacturer. FPV equipment is decorative, not an operational diagram. Spend Network is fictional and makes no real company or product claim. Runtime adoption remains false. Map crop, reveal-mask readability, reward timing, offline packaging and actual gameplay require their own validation.
