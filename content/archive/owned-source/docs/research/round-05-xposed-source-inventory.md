# Round 05 — XPOSED source inventory and edition cross-check

Research date: 12 September 2026. This inventory supplements [the first research pass](xonix-and-xposed.md). It identifies accessible media and checks textual evidence. Video URLs and duration metadata are **not** evidence that the footage has been watched; direct viewing findings belong in the companion visual audit. Search coverage is broad, not a claim to have located every upload on the internet.

**Direct-video update later in this same round:** the Reloaded tutorial was subsequently inspected in XR-V3 at 00:45–00:55. It directly names four powerups and three special field roles, and explains four enemy roles. This supersedes the earlier source-search uncertainties recorded below. See the [postscript](#direct-video-postscript) and [contract/challenge adjustments](../../authoring/challenges/round-05-reference-adjustments.md).

## Edition boundaries

| Edition | Identity established | Why the distinction matters |
|---|---|---|
| XPOSED | PS4, Somequest; European release 14 December 2016, US release 17 December 2019 | A 2020 gameplay upload can show the original game, not Reloaded. The earlier shorthand “2016” is the European release. |
| XPOSED RELOADED | PS4, Somequest, 25 November 2021; free and Deciphered catalog variants | The primary requested reference. Its screenshots and trophies establish actual features; a store bundle may share gameplay media with another edition. |
| XPOSED SWITCHED | Switch, Mass Creation, 20 January 2023 | Publisher explicitly advertises 3 terrain types, 4 powerups, 8 enemy types and 48 levels. Do not silently transfer those counts to Reloaded. |

Sources: [XPOSED regional release table](https://gamefaqs.gamespot.com/ps4/202873-xposed/data), [Reloaded official listing](https://store.playstation.com/en-us/concept/10002881/), [Switched official listing](https://www.nintendo.com/us/store/products/xposed-switched-switch/). MobyGames combines Reloaded and Switched under an alternate-name entry; that catalog convention does not establish identical rules or level counts.

## Gameplay and video inventory

Durations below were read from YouTube watch-page `lengthSeconds` metadata, not inferred from titles. Some pages include two values one second apart; durations are approximate in those cases. No downloaded media is included in this repository.

| ID | Edition / publisher | URL | Length | Intended inspection value |
|---|---|---|---|---|
| XR-V1 | Reloaded — official store preview | [Sony-hosted trailer](https://vulcan.dl.playstation.net/img/rnd/202111/0915/4oOD4otPZbCJhoRuPgCBMugh.mp4) | Not measured here | Official animated overview; primary source for appearance and range of layouts. |
| XR-V2 | Reloaded — Dr.Gejmer; search still shows former channel label Bokanidja x Kazekge | [Full GAME / Guide / WALKTHROUGH](https://www.youtube.com/watch?v=LpG8PEnX4X0), uploaded 27 November 2021 | About 1:28:08 | Longest substantial footage located; potentially menus, tutorials, successive boards, retries and unlocks. The title alone does not establish complete all-pack coverage. |
| XR-V3 | Reloaded — Lord Parker | [Settings & Gameplay LPOS](https://www.youtube.com/watch?v=SKKvpZ2DvUY), uploaded 22 December 2021 | 5:32 | Highest-priority short source for settings, controller prompts and early rules. |
| XR-V4 | Reloaded — The Foreseen Arcade | [PlayStation 4 Gameplay](https://www.youtube.com/watch?v=HEM9_sQGRJQ), uploaded 16 May 2025 | 9:15 | Independent gameplay sample; useful cross-check for version or rule differences. |
| XR-V5 | Reloaded — Lentarian | [Level 1 in 10 Seconds / REVELATION trophy](https://www.youtube.com/watch?v=OICFNabJEMY), uploaded 6 December 2021 | About 0:27 | Excellent compact test of efficient opening cuts, filling and the score/result transition. Actual completion time must be read in-frame. |
| X-V1 | Original XPOSED — Video Chums | [Xposed Gameplay — PS4](https://www.youtube.com/watch?v=4r08J0gciyk), uploaded 7 January 2020 | About 9:18 | Compare original to Reloaded; especially boundary traffic, trail strikes, powerups and HUD. |
| XS-V1 | Switched — Nintendo-hosted gallery video | [Official trailer MP4](https://assets.nintendo.com/video/upload/store/software/switch/70010000060160/Video/b6209df315fdbf5215dbaabead0ac1cdd2663d13d56cac898fc4145503a58aa8.mp4) | 39.84 seconds | Verified HTTP 200 and video/mp4; CDN metadata gives 1280×720, 29.97 fps. Page data marks this asset as video, even though its JSON-LD `contentUrl` mistakenly uses an image delivery path. |
| XS-V2 | Switched — Rushed Reviews | [Xposed Switched Review](https://www.youtube.com/watch?v=YLd3vgU6_WE), uploaded 23 January 2023 | About 1:07 | Short independent comparison; does not substitute for sustained gameplay. |

The original Video Chums URL is independently linked by the publisher's [video index](https://videochums.com/videos) and the [GameFAQs media entry](https://gamefaqs.gamespot.com/ps4/202873-xposed/videos/1188677).

**Avoid a false extra trailer:** `https://vulcan.dl.playstation.net/img/rnd/202111/1822/1BB1uP90iDMJ3p8rbX7HWn6F.mp4` appears in the Reloaded concept-page data, but its parent product is **Campfire in the Mountains Dynamic Theme Bundle**. It is a console-theme preview, not proof of another gameplay mechanic. The bundle also references XR-V1.

Nintendo's Switched video asset identifier is `/store/software/switch/70010000060160/Video/b6209df315fdbf5215dbaabead0ac1cdd2663d13d56cac898fc4145503a58aa8`; its declared `resourceType` is `video`. Use the visible gallery or verified delivery URL rather than treating a broken JSON-LD image URL as missing footage.

## Screenshot collections

### Reloaded: complete six-image official set located

These six URLs are tagged `SCREENSHOT` in the official concept-page product data. Repeated appearances under the free game, Deciphered edition and bundles are duplicate media, not additional distinct screenshots. The first pass visually inspected them; this pass reconfirmed the source and deduplicated identities.

| ID | First-pass visual description | Direct official image |
|---|---|---|
| XR-S1 | Hazard lettering; cyan boundary and trail | [Image](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/QPOHlGsdNIjhbrYJDSYz2Qcj.jpg) |
| XR-S2 | Red double-spiral maze; cosmic reveal | [Image](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/teX3IQ9yRNS2DdwoBifhLH9P.jpg) |
| XR-S3 | Results with three stars and replay/next actions | [Image](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/Yppqw545Pp2aocZZaDvKTy7i.jpg) |
| XR-S4 | Central skull and rings of terrain | [Image](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/RHn0BDRR82Q9HI2nF23Jjra9.jpg) |
| XR-S5 | Repeated rectangular islands and corridors | [Image](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/JkIpUJlOqIs6NBX8dkt1CoQ8.jpg) |
| XR-S6 | Dense blue/red tile motifs and many enemies | [Image](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/L21TiNXoxEvV6Z9khJfkh3NK.jpg) |

The [Deku Deals gallery](https://www.dekudeals.com/items/xposed-reloaded) mirrors this six-image set. Sony page cover/banner/master art and avatar advertising are not counted as gameplay screenshots.

### Original XPOSED

The [2016 PlayStation Country review](https://www.playstationcountry.com/xposed-ps4/) contains separately captured gameplay photographs with filenames dating 17–19 December 2016. Candidate full-size images include:

- [20161219204414](https://www.playstationcountry.com/wp-content/uploads/2016/12/XPOSED_20161219204414.jpg)
- [20161217174205](https://www.playstationcountry.com/wp-content/uploads/2016/12/XPOSED_20161217174205.jpg)
- [20161219195814](https://www.playstationcountry.com/wp-content/uploads/2016/12/XPOSED_20161219195814.jpg)
- [20161219172332](https://www.playstationcountry.com/wp-content/uploads/2016/12/XPOSED_20161219172332.jpg)
- [20161217180808](https://www.playstationcountry.com/wp-content/uploads/2016/12/XPOSED_20161217180808.jpg)

These were located through page HTML, not visually classified in this inventory. Resize variants and `/wordpress/` aliases should not be counted twice.

### Switched

The [Nintendo gallery](https://www.nintendo.com/us/store/products/xposed-switched-switch/) presents eight items: cover/key art, video and six screenshots. [Deku Deals](https://www.dekudeals.com/items/xposed-switched) and [ntower](https://www.ntower.de/galerie/26936-xposed-switched/) mirror six screenshots. The [Game Slush Pile review](https://gameslushpile.com/2023/05/09/xposed-switched-switch-review/) offers additional critic captures. Those images need per-frame visual comparison before claiming they differ from marketing art.

## Mechanics evidence: what can and cannot be resolved from text

### Three terrain types and four powerups

The count of three terrain types and four powerups is a **Switched publisher statement**, without names or exact effects. Reloaded trophies explicitly refer to slowdown terrain and death fields. Combining these into “normal + slowdown + lethal” is a plausible taxonomy, but remains an inference until the tutorial or actual behavior confirms it.

The original 2016 review explicitly reports three temporary effects: increased player speed, slower enemies and frozen enemies. It does not name a fourth effect. An extra-life pickup would be plausible genre convention, but this research did **not** establish it and it must not enter a reference taxonomy as fact.

### Enemy classes and capture semantics

Eight enemy types are advertised for **Switched**. Reviewers report lasers, bomb turrets, seekers, several bouncing enemies and boundary followers; no authoritative list of eight named classes was located. These may overlap behavior categories rather than represent a one-to-one roster.

The original 2016 critic describes enemies striking an unfinished trail and sending a lethal pulse toward the player, with a chance to reach safety first. The same critic says motion continues once the player leaves safety. Both observations must be verified separately in Reloaded before copying them into its confirmed rules. [2016 review](https://www.playstationcountry.com/xposed-ps4/)

A Switched critic reports that some completed cuts reveal only a line, and guesses that hazards may block filling. This is evidence of **poor rule legibility for that player**, not proof of an inconsistent or random algorithm. Another critic describes rich combinations of lasers, bomb turrets, slow fields and seeking missiles, but also unintended turns/self-collision. [Game Slush Pile](https://gameslushpile.com/2023/05/09/xposed-switched-switch-review/), [eShopperReviews](https://eshopperreviews.com/2024/02/26/xposed-switched-for-nintendo-switch-review/)

**Open capture questions:** Does a region fill only if no area enemy remains? Do fixed turrets or terrain act as anchors? Can two occupied sides leave only the completed trail? Does covering a boundary follower remove it? What reopens territory, and is that a projectile effect or a separate enemy? None should be resolved by the appearance of a still image alone.

### Stars, packs and progression

The official Reloaded result screenshot establishes stars for completing the stage, retaining lives and meeting a speed target. The displayed target is level-specific. The trophy list includes 90% exposure, four defeated on-line enemies in one stage, 200 pickups, star totals, repeated respawns, sub-ten-second completion and cumulative interaction with slowdown/death terrain. [Reloaded trophies](https://gamefaqs.gamespot.com/ps4/341076-xposed-reloaded/trophies)

Two independent 2021 community accounts agree that Reloaded's free progression requires perfect three-star results to unlock later packs; one says six packs of 12, with each pack requiring 36 additional stars. Paid packs provide an alternate unlock. Initial “only first level is free” comments are directly contradicted by people reporting progress. This should be treated as strongly corroborated **community evidence**, with exact thresholds and edition differences still checked against menu footage. [Launch discussion](https://www.reddit.com/r/PS5/comments/r2plzq/free_to_play_xposed_reloaded_ps4_a_tribute_to_the/), [trophy difficulty discussion](https://www.playstationtrophies.org/forum/topic/327063-estimated-trophy-difficulty-and-time-to-100/)

The Switched official page also lists touch-screen support; it does not document whether that means gameplay steering, menus, or both. A Spanish reviewer reports a gallery, audio/language/how-to-play options and category-based image selection. These are useful inspection targets, not a complete control specification. [Nintendo](https://www.nintendo.com/us/store/products/xposed-switched-switch/), [Analizando Mac](https://analizandomac.blogspot.com/2023/02/analizamos-xposed-switched.html)

## Recommendations to carry into the design audit

These are design judgments, not measured retention findings:

1. Prioritize the short speed-clear clip and early tutorial/settings footage to determine the core cut rule before drawing conclusions from late-game visual complexity.
2. Observe successful and unsuccessful cuts on the **same** board, recording enemies, fixed hazards, terrain and connectivity before/after. A montage alone cannot establish filling rules.
3. Borrow the clarity of the three mastery goals, but let ordinary completion advance the main campaign. Perfect clears can reward expert routes, variants and cosmetics; mandatory perfection can turn one difficult star into a progression wall.
4. Preserve the two threat domains—open field and safe-boundary traffic—if observed. They create distinct decisions without requiring excessive enemy counts.
5. Give each hazard one readable spatial or timing purpose. Separate lethal terrain, slow terrain, live bullets, open-region anchor enemies and decorative background objects in art and in data.
6. Treat a delayed trail-strike pulse as an explicit candidate mechanic. If adopted, expose its speed/delay and escape condition in the rules contract; do not quietly turn all trail contact into immediate death.
7. Keep the clean neon gameplay layer while replacing unrelated background collections with intentional chapters for FPV FRONT, UKRAINE ATLAS, 1994 FOREVER and NAVI NETWORK.

No standalone manual, complete named enemy compendium or publisher capture-algorithm specification was located by the source search. The directly viewed in-game tutorial subsequently resolved several of these gaps as recorded below; the exact fill algorithm remains open.

## Direct-video postscript

The parent agent subsequently inspected moving Reloaded footage, and this agent independently inspected both saved tutorial frames. These findings are specific to Reloaded and do not depend on Switched's feature counts:

- At [00:45](https://www.youtube.com/watch?v=SKKvpZ2DvUY&t=45s), the four pickups give an extra life, reduce enemy movement speed, increase player movement speed, or freeze enemies. Controller diagrams show left stick and D-pad support. Stars unlock additional levels. [Saved tutorial frame](evidence/round-05/reloaded-manual-0045.png).
- At [00:55](https://www.youtube.com/watch?v=SKKvpZ2DvUY&t=55s), the three special field roles are **slowdown, lethal, and wall**. The first two affect the player but not enemies; walls block both. Four enemy roles shown are ordinary, exposed-ground-destroying, line-patrolling and exposed-ground-wandering. This establishes those four roles without proving that no other enemy classes exist. [Saved tutorial frame](evidence/round-05/reloaded-manual-0055.png).
- Parent inspection of [Pack 1 at 02:16](https://www.youtube.com/watch?v=8L3PwVcvg40&t=136s) observes patrols along internal contours, beyond the outer border. At [04:33](https://www.youtube.com/watch?v=8L3PwVcvg40&t=273s), the target is 90%. At [13:40](https://www.youtube.com/watch?v=8L3PwVcvg40&t=820s), level 8 results show a 150-second speed target, reinforcing that quota and speed targets are level-authored.
- Parent inspection of XR-V3 at 00:10 observes a Unity startup splash. Reloaded's engine is therefore directly identified as Unity; this historical fact does not by itself change our web-first engine recommendation.

The fourth pickup is no longer unknown. The three field roles are not “normal + slow + lethal.” Earlier research should cite this update when using either detail. Pickup strength/duration/stacking, lethal-field capture semantics, erosion extent and the precise fill algorithm still require behavioral evidence or explicit new-game design choices.
