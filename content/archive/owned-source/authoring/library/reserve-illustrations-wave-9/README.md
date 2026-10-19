# Reserve illustrations · wave 9

Four new reward illustrations follow [wave 8](../reserve-illustrations-wave-8/README.md). They are source artwork without runtime bindings, new levels, animation, packs or releases.

| Theme | Original | Composition |
| --- | --- | --- |
| FPV Front | [Snowglass Rooftop](originals/fpv-snowglass-rooftop.png) | An amber greenhouse and compact scenic drone contrast with a snowy lavender city. |
| Ukraine Atlas | [Spring Painted Ferry](originals/ukraine-spring-painted-ferry.png) | A turquoise painted ferry and diagonal ramp sit among blossoms and calm blue reflections. |
| 1994 Forever | [Rainlight Pinball Hall](originals/retro-rainlight-pinball-hall.png) | Three colored cabinets illuminate a rainy midnight interior. |
| Spend Network | [Sunroof Market House](originals/spend-sunroof-market-house.png) | A yellow produce and parcel hall sits beneath a broad blue solar-panel roof. |

The four original PNGs total **7,893,602 bytes**. All are **1774 × 887, RGB, 8-bit**, exactly **2:1**. The requested 1536 × 768 dimensions and restrained three-shade materials were targets. Stepped contours and broad focal shapes coexist with many colors, detailed reflections and soft light variation; these are not certified limited-palette sprites.

Four separate built-in `image_gen.imagegen` calls used the exact [prompts](prompts/) without reference images. All four outputs were selected; no variants were discarded or pixels edited. [Tool responses](provenance/tool-responses.json) preserve the returned paths. Tool originals remain unchanged, and workspace files are independent-inode APFS clones with matching SHA-256. [Original records](provenance/originals.json) bind each prompt, output, dimension and observation.

The author viewed every complete original at original resolution. PNG chunk CRCs, Pillow verification and full decoding passed. The read-only [inspector](provenance/png-inspect.py) can repeat the checks. Wave9 paused after its first preserved original when capacity fell below the initial 3.5 GB admission floor. Root then revised admission to **3.46 GB**, retaining the **3.40 GB** reserve and **36 MiB** total-wave budget; subsequent fresh checks passed. The first image was never regenerated. The budget counts tool originals, workspace files, raw Git additions and cache evidence without clone-sharing credit.

The Snowglass drone has an enclosed body and partially obscured rotor geometry: it is fictional scenic equipment, not a verified four-visible-rotor FPV or engineering reference. Ferry decoration is invented folk-inspired geometry, not an authenticated historic vessel or regional pattern; some baskets are open despite the prompt's closed-basket request. The pinball cabinets have abstract backboards and illustrative playfields, with the right cabinet reaching the frame edge. Solar panels, cart and market architecture are scenic motifs, not technical specifications. A generic sun emblem is retained. No recognizable brand, legible title, copied game artwork or gore was identified in the inspected originals.

The [comparison page](provenance/index.html) displays complete images beside wave 8 at **320 × 160 CSS pixels**. The finite loopback [server](provenance/serve.py) exposes only that page and eight selected PNGs; `--previous /absolute/path/to/reserve-illustrations-wave-8` reuses prior originals without copying them. Root confirmed all eight images fully loaded and inspected both viewport regions, approving the new works as source illustrations. The author viewed all three unmodified captures. [Inspection metadata](provenance/inspection.json) binds the captures and scope. The full-page export is scaled down; viewport captures show the configured small-view composition. Warm/cold contrast and scene variety remain readable with the stated geometry qualifications.

This wave brings the source series to **36 selected illustrations**. Map crops, reveal masks, reward timing, offline packaging and gameplay acceptance remain separate work.
