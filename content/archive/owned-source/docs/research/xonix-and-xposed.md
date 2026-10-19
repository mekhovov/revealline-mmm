# Xonix, XPOSED RELOADED, and territory-reveal design research

Research date: 12 September 2026. This is a research and discussion artifact, not an implementation specification. Facts below distinguish publisher statements, direct screenshot observations, critic reports, and design hypotheses. No game executable was run and no full gameplay video was watched; all screenshots described were visually inspected through the in-app browser.

> **Round 05 update:** The [direct motion/manual audit](round-05-reloaded-motion-audit.md) and [reinspected six-image gallery](round-05-reloaded-stills.md) supersede earlier uncertainty below about four Reloaded pickup effects, the three special terrain meanings, four documented enemy roles and its Unity loading logo. Sampled gameplay shows both 80% and 90% quotas, 60- and 150-second speed conditions, and internal contour enemies. Its exact fill algorithm remains unverified. The historical text below records the earlier evidence state; use [the latest direction](../round-05-gameplay-direction.md) for current proposals.

## Exact reference and edition boundaries

The user's reference resolves to **XPOSED RELOADED**, published by **Somequest Sp. z o. o.**, released for **PlayStation 4 on 25 November 2021** according to the US PlayStation Store. It is single-player, supports DualShock 4 vibration, and is playable on PS5 through backward compatibility. Its publisher describes a Xonix-inspired game in which orthogonal enclosures reveal background pictures, sufficient exposed area completes a stage, and players unlock further level packs. The catalog includes free and paid Deciphered editions and separately sold packs; these listings do not establish exactly which content each install contains. [Official PlayStation listing](https://store.playstation.com/en-us/concept/10002881/)

This is distinct from **XPOSED** (the earlier 2016 PS4 game). **XPOSED SWITCHED** is a related 2023 Switch release. MobyGames groups Reloaded and Switched together, while the Nintendo listing credits Mass Creation and gives 20 January 2023. Avoid presenting them as mechanically identical without comparison. [Series catalog](https://gamefaqs.gamespot.com/games/franchise/8014-xposed), [MobyGames](https://www.mobygames.com/game/198273/xposed-reloaded/), [Nintendo listing](https://www.nintendo.com/us/store/products/xposed-switched-switch/)

The word “exclusive” is best understood as the user's reference to the PS4 title; we have not established a permanent contractual platform exclusivity. The related Switch edition makes a broader franchise-exclusive claim misleading.

## What is confirmed about Reloaded itself

| Finding | Evidence and confidence |
|---|---|
| Reveal pictures by enclosing territory; complete an exposure quota; unlock packs | Publisher statement, high confidence. |
| Three stars measure completion, preserving all lives, and speed | Direct official screenshot. For the pictured first level the speed goal is 60 seconds; do not assume that threshold applies to every level. |
| HUD tracks lives, progress against a quota, score, and time | Direct official screenshots. Multiple examples display a quota of 80. This is evidence for those pictured levels, not proof of a universal quota. |
| Replay and next-level actions are directly available on results screen | Official screenshot shows menu, restart, and play-next actions. |
| Some packs contain 12 levels | Publisher DLC descriptions independently confirm 12 for Pack 2 and Pack 6. |
| Powerups, stars, repeat respawning, enemies on lines, slowdown areas, death fields exist | The trophy list explicitly names them. Exact implementations remain unverified. |
| Repeated rectangular hazard patterns, maze-like layouts, and irregular revealed contours | Direct screenshot observations. This is more than an empty board with bouncing enemies. |

Sources: [results screenshot](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/Yppqw545Pp2aocZZaDvKTy7i.jpg), [first board screenshot](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/QPOHlGsdNIjhbrYJDSYz2Qcj.jpg), [Pack 2](https://store.playstation.com/en-us/product/UP2538-CUSA28099_00-XRLP000000000002), [Pack 6](https://store.playstation.com/en-us/product/UP2538-CUSA28099_00-XRLP000000000006), [trophy list](https://gamefaqs.gamespot.com/ps4/341076-xposed-reloaded/trophies).

Trophies include reaching at least 90% exposure, defeating four on-line enemies in one level, collecting 200 powerups, collecting 50/100/150 stars, respawning 100 times, completing a level under ten seconds, spending 500 seconds on slowdown terrain, and covering 5,000 death fields. These reveal several intended mastery goals beyond simple completion, but do not prove how often players pursue them. [Trophy list](https://gamefaqs.gamespot.com/ps4/341076-xposed-reloaded/trophies)

## Visual inspection of all six official Reloaded screenshots

These are Sony-hosted marketing screenshots, displayed in [Deku Deals' screenshot gallery](https://www.dekudeals.com/items/xposed-reloaded). This gives a direct look at the game, but not moving footage or a full gallery audit.

1. **Hazard text board:** a near-black field, extremely thin electric-blue perimeter, bright cyan-blue orthogonal trail, glowing yellow trail tip. Red cross-shaped pixels spell a warning in the board. Cyan spiky sprites sit on boundary routes; yellow enemies have magenta particle tails. A narrow blue/magenta HUD stretches across the top. [Screenshot 1](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/QPOHlGsdNIjhbrYJDSYz2Qcj.jpg)
2. **Labyrinth:** repeated red hazardous tiles create two maze spirals. The revealed area exposes a blue-purple cosmic illustration; edges advance in a rigid grid. Bright particles and a large reddish effect emphasize a collision or action, whose precise trigger cannot be inferred from a still. [Screenshot 2](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/teX3IQ9yRNS2DdwoBifhLH9P.jpg)
3. **Results:** three large glowing magenta stars; blue level number, yellow completion text, oversized yellow score, a small high-score banner. The three goals and immediate restart/next actions make achievement legible. [Screenshot 3](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/Yppqw545Pp2aocZZaDvKTy7i.jpg)
4. **Central danger emblem:** a red pixel skull in the middle, rings of blue and red tile arrangements, small bright round enemies, and a partly uncovered cool-toned picture behind the board. [Screenshot 4](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/RHn0BDRR82Q9HI2nF23Jjra9.jpg)
5. **Geometric neighborhood:** cyan rectangular walls, red lethal corridors, a blue player-slow tiled horizontal band, tiny magenta moving sprites, and an L-shaped glowing player trail. Repeated modules give the layout a authored puzzle identity. [Screenshot 5](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/JkIpUJlOqIs6NBX8dkt1CoQ8.jpg)
6. **Dense obstacle field:** alternating red and blue tile motifs, numerous glowing ring-shaped enemies, and a very small revealed foothold near the bottom. The visual difficulty comes from local space and traffic, not solely speed. [Screenshot 6](https://image.api.playstation.com/vulcan/ap/rnd/202111/0311/L21TiNXoxEvV6Z9khJfkh3NK.jpg)

**Art-direction conclusion (our judgment):** Reloaded offers a useful neon arcade presentation vocabulary: black negative space, luminous paths, chunky LED typography, simple bright sprites, emphatic win screens. It is not evidence for one unified, richly illustrated modern pixel-art world. A new game can retain its readable arcade layer while giving backgrounds, menus, character animation, and music a coherent cultural identity.

## What the related Switch edition adds to the evidence

The Nintendo publisher description explicitly lists **three terrain types, four randomly appearing powerups, eight enemy types, and 48 levels**. Those counts belong to **Switched**, not automatically to Reloaded. [Nintendo](https://www.nintendo.com/us/store/products/xposed-switched-switch/)

Two independent critic accounts converge on an important design lesson:

- eShopperReviews praises varied enemy/hazard combinations, including lasers, bomb turrets, slowdown fields and seeking projectiles. It describes neon 1980s visuals and energetic synthesized music. The critic found the mix of background subjects incoherent and reported unintended turns and self-collision caused by imprecise-feeling controls. This is one reviewer's experience, not a measured input-latency test. [Review, February 2024](https://eshopperreviews.com/2024/02/26/xposed-switched-for-nintendo-switch-review/)
- The Game Slush Pile describes progressively harder picture groups and three-star goals. Its primary criticism is that the capture rule feels inconsistent: dividing a board sometimes appears to reveal only the line, and the tutorial does not sufficiently explain why. It also reports hazards that reclaim territory. Do not infer the actual capture algorithm from the author's uncertainty. [Review, May 2023](https://gameslushpile.com/2023/05/09/xposed-switched-switch-review/)

**Design response:** predictable steering and immediately understandable capture rules are first-class features. Before expanding content, test whether a player can correctly predict which area will fill. Consider a low-key preview of the candidate region, a clear blocker icon for protected enemies, and a brief explanation after a failed enclosure. Decorative backgrounds must never camouflage the player, active trail, projectiles, or safety boundary.

## Lineage and useful variations

| Game / period | Source-backed contribution | What to borrow conceptually |
|---|---|---|
| **Qix, 1981** | Taito's official retrospective describes a marker claiming territory while evading free-moving Qix and line-following Sparx. Atari's original manual documents fast/slow drawing, vulnerable unfinished trails, and a fuse that punishes hesitation. | The foundational decision: a safe small cut or a dangerous large enclosure; two distinct threat domains. |
| **Xonix, 1984 DOS** | Historical catalogs credit Ilan Rav (also transliterated Raab) and Dani Katz. AxySoft's own explanation of its predecessor describes balls moving within the open field and cutting away empty areas. | Extremely legible grid rules, compact sessions, a modest technical footprint. Exact original author spelling and version distinctions should be verified from an original title screen before publication. |
| **Super Qix, 1987** | Historical references identify a sequel using image-reveal backgrounds, prior to the adult-themed branch. | Picture discovery can be a general-audience reward. |
| **Volfied, 1989** | The official rerelease describes piloting Monotros, reclaiming territory from aliens, an 80% victory threshold, and vulnerability while the barrier is off. | Give the cursor a character identity and the capture loop a world-level purpose. This is a particularly good precedent for a drone theme. |
| **Gals Panic, 1990** | Museum/history sources describe a Qix-like arcade game built around revealing pictures, with enemies and bonuses. | Reveal anticipation can strengthen the otherwise abstract geometry loop. Our use can be landscape restoration, story illustration, collectible art, or visual transformation. |
| **SeXoniX, 1994 DOS** | Historical catalogs identify Daisy Field Software Development Group's adult-themed Xonix variation. Its distinguishing reward is exposing pictures rather than filling a flat color; one catalog reports no saved progress. | Preserve curiosity and collection; improve retry pacing and save progress. Adult imagery is unnecessary to the design principle. |
| **AirXonix, 2000-era** | AxySoft describes a flying device, balls on open terrain, mines on filled terrain, time limits, life/score/time/slowdown bonuses, five game types and over 80 levels. | A flying avatar already fits the genre. Different terrain domains can support different enemy behavior; powerups vary route incentives. |
| **Fortix, Steam 2010** | Nemesys describes fencing off battlefield space, acquiring catapults/powerups, besieging castles and reclaiming land; 22 increasingly difficult levels and online scores. | Objective capture can be more meaningful than percent alone: enclose a relay, reclaim a landmark, acquire an ability. |
| **Lightfish, 2011** | Eclipse Games advertises two modes, 10 enemy types, 45 levels, original soundtrack and score challenges, in an undersea theme. | A coherent environmental theme can bind enemy silhouettes, particle effects, sounds, and image discovery. |
| **Mokoko X, 2022** | NAISU explicitly names Qix/Volfied/Gals Panic as influences. It has 32 boss stages, three difficulties, and a shield that depletes if the player stops claiming territory; drawing disables safety. | Boss personalities, authored challenges and an anti-camping resource can create variety, if explained and tuned fairly. |

Sources for lineage:

- [Taito on Qix](https://www.taito.co.jp/en/mob/topics/14971)
- [Original Atari Qix manual transcription](https://www.atarihq.com/5200/manuals/qix.html)
- [Xonix historical catalog](https://www.old-games.org/games/xonix)
- [Qix and sequels historical overview](https://en.wikipedia.org/wiki/Qix) — secondary, useful for chronology; no claim of exhaustive coverage.
- [Volfied official rerelease](https://www.nintendo.com/us/store/products/arcade-archives-volfied-switch/)
- [Gals Panic museum entry](https://www.arcade-museum.com/Videogame/gals-panic)
- [SeXoniX historical catalog](https://www.databaze-her.cz/hry/sexonix/)
- [AxySoft AirXonix](https://www.axysoft.com/airxonix/)
- [Fortix publisher description](https://store.steampowered.com/app/45400/Fortix/?l=english)
- [Lightfish publisher description](https://store.steampowered.com/app/116120/Lightfish/?l=english)
- [Mokoko X publisher description](https://store.steampowered.com/app/1785000/Mokoko_X/?l=english)

## What is likely to make players return

These are **design hypotheses**, derived from the structure of the games, not empirical retention findings. No cohort retention, session-frequency data, sales breakdown, or player interviews for Reloaded were located.

1. **Tension followed by a large visual payoff:** an exposed trail creates temporary vulnerability; reaching safety converts it into an immediately visible gain.
2. **Self-authored tactics:** the player chooses the route and size of the cut, so improvement feels personal rather than a fixed solution being memorized.
3. **Curiosity:** the partially revealed image suggests what comes next. A deliberate composition can make each captured zone reveal a meaningful detail.
4. **Mastery at several levels:** completion lets a casual player continue; speed, survival, exposure, score and optional objectives provide replay targets for experts.
5. **Combinatorial variety:** familiar hazards in new arrangements teach different timing and route planning without introducing a new rule every stage.
6. **Identity and collection:** completing a regional image set, earning a patch, restoring a world map, or hearing the full track can give progress emotional meaning.
7. **Low retry friction:** a clear cause of failure, fast restart, and retained unlocks encourage a voluntary next attempt.

The central risk is **frustration that feels unearned**: accidental reverse inputs, unreadable enemy movement, invisible capture blockers, overwhelming effects, or a quota that forces repetitive tiny cuts. These should be treated as design failures rather than evidence that the game is satisfyingly difficult.

## Three discussion directions for the new game

### A. Classic arcade, with exceptional feel

Preserve one board, orthogonal movement, trail vulnerability and area completion. Add authored terrain patterns, one optional active ability, three mastery medals and a collectible gallery. A Ukrainian drone draws a bright signal trail through interference to reveal beautiful Ukrainian scenes; hostile forces are represented by clear fictionalized military equipment silhouettes. The Coupa version swaps the avatar, enemy vocabulary, scenery, effects and goals while retaining the rules. This is the clearest baseline for testing controls and visual payoff.

### B. Reclamation, where the picture becomes the level

Each board depicts a place under a graphic interference layer. Enclosing a relay or landmark activates it, changes the local hazard pattern, and reveals part of a narrative scene. Capture order becomes a small strategic puzzle. In the Coupa version, reclaiming zones reconnects customer operations, removes waste, and illuminates a thriving stylized city. This direction has the strongest opportunity for a distinctive identity, but requires more authored content and rules clarity.

### C. Short arcade expeditions

String together several short boards; choose one temporary modifier between them. A daily seeded challenge and alternate route choices create replay without needing a permanent statistical grind. This can complement A or B later, but it should not obscure whether the core territory game feels good on its own.

**Recommendation for discussion:** use A as the control and capture foundation, aim for B as the emotional and visual identity, and keep C as an optional later mode. None of these is approved for implementation yet.

## Questions that deserve prototype evidence later

- Does enclosing a space capture the empty side, the smaller side, every region without a special anchor enemy, or a region selected by the player? Choose one explicit policy before generating levels.
- Should capturing a hostile object remove it, disable its influence, or leave it in an isolated pocket? This materially changes strategy.
- Is the revealed image a reward behind the board, an active tactical map, or a before/after transformation? Each asks for different artwork.
- Which player errors are legitimate challenge, and which should input buffering prevent? Keyboard, analog stick and touch must feel deliberate.
- Can a newcomer explain a failed cut without consulting a manual?
- Does a second play remain interesting after the image is known? If not, stars, route objectives or alternate challenge seeds need to carry replay.
- Which two or three enemies produce genuinely different decisions? Do not expand to eight types simply because a reference game lists eight.

## Explicitly unverified

Reloaded's complete enemy taxonomy; exact four-powerup effects; full soundtrack, composer and looping structure; all unlock thresholds; exact fill algorithm; complete pack-to-image mapping; whether the free edition contains only the first pack or different restrictions; accessibility options; input timing; save behavior; controller mappings; procedural generation; engine; measured popularity and retention. A future focused video or hands-on audit should resolve only those that affect the chosen design.
