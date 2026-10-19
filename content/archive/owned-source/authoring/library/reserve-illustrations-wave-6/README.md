# Reserve illustrations · wave 6

Four original reward-scene illustrations follow [wave 5](../reserve-illustrations-wave-5/README.md). They remain source illustrations: no runtime binding, playable level, animation, pack or release is added.

| Theme | Original | Composition |
| --- | --- | --- |
| FPV Front | [Saffron Balloon Meadow](originals/fpv-saffron-balloon-meadow.png) | A prominent four-rotor quad over a golden meadow, with three dawn balloons and a distant lake, distinct from the preceding copper canyon. |
| Ukraine Atlas | [Bluebell Watermill](originals/ukraine-bluebell-watermill.png) | A large timber wheel and curved blue stream among spring flowers, distinct from the preceding snowy sled courtyard. |
| 1994 Forever | [Sunset Bumper Pavilion](originals/retro-sunset-bumper-pavilion.png) | A plum-and-turquoise car and sunset reflections beneath an open fairground canopy, distinct from the preceding indoor bowling lanes. |
| Spend Network | [Coral Dawn Bakery](originals/spend-coral-dawn-bakery.png) | A bread cart between a glowing oven and an open coastal doorway, distinct from the preceding rooftop raincatcher. |

The four original PNGs total **11,104,428 bytes**. Each returned image is **1774 × 887, RGB, 8-bit**, exactly **2:1**. The requested 1536 × 768 dimensions were a target; every returned original is retained unchanged, without resizing, cropping or color conversion.

Four separate built-in `image_gen.imagegen` calls used the exact [prompts](prompts/) without reference images. All four outputs were selected; there were no rejected variants. [Original records](provenance/originals.json) and [tool responses](provenance/tool-responses.json) preserve source paths, hashes and prompt identities. Workspace PNGs are independent-inode APFS clones; all tool originals remain intact. The wave's **36 MiB** budget counts tool originals, worktree files, raw Git additions and cache evidence without credit for shared storage. Admission requires fresh free space of at least **2.8 GB**, retaining **2.7 GB** for other work.

The author viewed each complete original at original resolution. PNG chunk CRCs, Pillow verification and full decoding passed; the read-only [inspector](provenance/png-inspect.py) repeats those checks against the manifest. The scenes use stepped silhouettes and rich pixel shading, not a certified fixed palette or uniform pixel grid. Dense grass, masonry, water and reflected light contain details that compress at small display size.

Observed qualifications are retained: the quad occupies more than the requested quarter-width target; its illustrated equipment is not a technical specification. The mill cloth is invented geometric decoration and the architecture is fictional regional atmosphere. The bumper car's tall pole and pavilion extend to the scene edge. The bakery cart's front wheel nearly meets the bottom edge; the oven is partly outside the frame, and a cat and coastal view are extra generated details. No legible wording or recognizable company mark was identified in the full-size review. This does not establish brand clearance or historical authenticity.

The [comparison page](provenance/index.html) displays complete originals beside wave 5 at **320 × 160 CSS pixels**. The finite loopback [server](provenance/serve.py) exposes only that page and eight selected PNGs. Pass `--previous /absolute/path/to/reserve-illustrations-wave-5` to reuse the prior originals without copying them. Root reviewed all four new subjects at that configured size and approved them as source illustrations; the author also viewed all three unchanged native captures. [inspection.json](provenance/inspection.json) retains their hashes and qualifications. The full-page export is scaled down; top and bottom viewport captures show the configured small-view composition. The meadow quad is an enclosed-body scenic drone illustration, not a specific real FPV/type reference or a compact sprite.

Map crop, reveal-mask readability, reward timing, offline packaging and actual gameplay require separate validation. This accepted wave brings the source series to twenty-four selected works; illustration count is not a playable-content count.
