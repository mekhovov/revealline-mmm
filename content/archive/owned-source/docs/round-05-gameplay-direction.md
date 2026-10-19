# Round 05 — authored arcade boards with collectible artwork

12 September 2026. Recommendation: keep FPV FRONT as the leading identity and build its design around short, authored territory puzzles. Classic arcade mastery, image discovery and tactical objectives remain the three motivations. This round revises design, prompts and authoring guidance; it does not start runtime implementation.

## What the inspection covered

All six located official Reloaded screenshots, all 20 screenshots in Lightfish's developer gallery, all three official AirXonix screenshots, two public SeXoniX gallery images, and sampled footage from nine videos: four Reloaded recordings, DOS Xonix, Super Qix, Lightfish, Fortix 2 and Mokoko X. The original Fortix manual provides additional documented mechanics.

This is a substantial selected audit, not every screenshot or video on the internet. No SeXoniX gameplay video was successfully inspected; its public still supports appearance and mixed-media conclusions only. Audio, controls and dynamic fairness have not been tested by playing.

| Evidence | Detailed record |
|---|---|
| Reloaded manual, early/late gameplay, official trailer | [Motion audit](research/round-05-reloaded-motion-audit.md) |
| Reloaded's complete located official still gallery | [Six-still audit](research/round-05-reloaded-stills.md) |
| DOS Xonix, Super Qix, SeXoniX | [Legacy observations](research/round-05-legacy-observations.md) |
| Lightfish, AirXonix, Fortix, Mokoko X | [Modern observations](research/round-05-modern-observations.md) |
| Editions and additional reference leads | [Source inventory](research/round-05-xposed-source-inventory.md) |

## Changes to the game design

**Give each board a spatial identity.** Chambers, offset gates, a comb, broken rings, broad spirals and asymmetric rooms should change the route decision. Reloaded and Lightfish provide direct examples of authored structures. Enemy speed is one tuning parameter; it should not carry the whole difficulty curve. The [twelve-level progression](../authoring/challenges/round-05-reference-adjustments.md) introduces one spatial or behavioral lesson at a time, then combines them.

**Separate three terrain meanings.** Solid walls block both sides; slow patches affect the player; lethal patches punish player contact while enemies pass through. Reloaded's manual establishes these distinctions. Our proposed rule makes slow/lethal patches claimable and neutralizes them when claimed; that post-capture policy is our choice, not a proven reference fact. This requires a terrain layer separate from artwork and occupancy.

**Teach four threat domains gradually.** Start with an open-field mover. Later introduce a frontier follower, an enemy on revealed ground, and a clearly warned territory eroder. Reloaded's manual identifies these roles; footage shows line enemies on newly formed internal contours. The current authoring catalog's outer-border patrol cannot represent that behavior. Claimed ground means the player can reconnect a cut there; it does not imply immunity to every future enemy class.

**Make the fill rule predictable.** Recommended first prototype: the already specified enemy-seeded policy. A closed cut claims regions containing no live field enemies; every current field enemy acts as an anchor. Boundary patrols do not anchor those regions. Independently selecting which future enemy roles anchor would require an extension; the current policy has no per-enemy selection flag. If enemies occupy both sides, the result must be explained instead of appearing broken. Compare the separately specified keep-largest policy during controlled playtests. Neither is presented as a verified copy of Reloaded's algorithm.

**Make substantial captures feel substantial.** Lightfish's inspected 28–29-second sequence closes a cut, reveals 43% and raises its multiplier from 1 to 6.5. Its tutorial ties large captures to possible powerups. Borrow the clear causal payoff: closure, reveal, affected objects, concise score explanation. Our bonus formula, cap and pickup schedule remain design choices. With erosion enabled, area scoring should count first-time captured cells so reopening/reclaiming cannot farm unlimited points.

**Give objectives a visible purpose.** Fortix provides the strongest reference for capturing something that changes the next decision. A relay can disable one linked threat, an Atlas landmark restore a route, a retro switch affect a circuit, and a Navi opportunity remove a fictional cost leak. Begin with capture markers and existing declared effects. Opening actual gates or changing terrain needs an extension. Contact pickups remain a different acquisition model; renaming a capture marker cannot implement them.

**Reward completion, then invite mastery.** On victory, stop threats and reveal the complete illustration while retaining the actual achieved percentage in the result. Both Reloaded's opening sequence and Super Qix's 83% celebration support this separation. Unlock the next ordinary stage through completion; use survival, speed and exceptional captures as optional replay medals. Reference speed thresholds vary by level, so our medal deadlines must be authored independently of any hard failure timer.

**Keep retries understandable.** The proposed default retains captured progress after losing a life, cancels the unfinished cut, explains the collision and provides a protected respawn. DOS Xonix footage shows retained percentage across a life loss. Exact respawn duration and last-tick collision/victory order are our unresolved implementation decisions. Avoid adding a traveling trail-strike pulse until it is deliberately selected and specified.

## Visual direction

The new [FPV gameplay study](concepts/round-05-gameplay-study.png) shifts emphasis toward a readable board: dark unrevealed space, modest foreground sprites, one active orthogonal cut, three differentiated terrain materials and enemy silhouettes tied to spatial roles. [Effective prompt and review](concepts/round-05-gameplay-prompt.md)

Keep the player brightest, the active route unmistakable, threats recognizable by shape, and the discovered scene rich but quieter during play. Reveal effects should not hide the active tip or an approaching enemy. Use real localized interface text in production. CRT scanlines, bloom, shake and rotor motion are optional presentation layers, never collision cues.

The military vehicles painted into the FPV picture are part of the fictional reveal scene. Live hostile sprites must have their own consistent outline, movement and hit cue. A vehicle in a photograph does not become an enemy because its pixels resemble one.

| Shared role | FPV FRONT | UKRAINE ATLAS | 1994 FOREVER | NAVI NETWORK |
|---|---|---|---|---|
| Emotional promise | Reclaim signal and expose invading military presence | Discover places, traditions and stories | Recover a vividly remembered era | Reveal fictional savings and better operations |
| Wall / slow / danger | Barrier / interference / marked danger | Stone / marsh or dense thread / thorn patch | Circuit block / tape drag / short circuit | Closed block / approval backlog / exception zone |
| Frontier follower | Hostile route crawler | Thorn runner | Circuit spark | Fee ticker |
| Erosion | Hostile interference | Unraveling shadow | Corrupted pixels | Reopening cost leak |
| Collection | Mission artwork and patches | Regional atlas and objects | Cartridge shelf and scenes | Customer network and discoveries |

These are alternative presentations of declared mechanics. Preserve regional specificity for Ukrainian cultural art and use a verified Coupa/Navi reference when selecting the final branded avatar. The current C-token remains a concept placeholder. Pixel, illustrated, photographic and scanned-art backgrounds stay independently replaceable.

## Devices and controls

The same challenge retains its full 4:3 board, coordinates, quota and simulation speed across screens. Portrait phone: arena above reachable controls. Landscape phone: use side space where available. Tablet: configurable touch placement. Desktop/Steam/TV: keyboard or controller focus throughout. Ultrawide: use spare width for gallery/context, not extra playable territory.

Cardinal steering, remapping, deliberate cut activation and a small turn buffer are proposed controls to evaluate. Compare touch D-pad and directional gestures on actual phones. No sampled video establishes the right dead zone, buffer duration or touch sensitivity. A simplified phone challenge is allowed as a separate challenge ID; rotation must never silently rebalance an existing leaderboard board.

## Framework and authoring consequences

The current v0.1 contract already separates themes, media, grids, goals and effects. It can describe varied wall layouts, quotas, capture markers and background styles. It cannot yet describe local terrain, frontier rerouting, claimed-space enemies, erosion, contact pickups, timed statuses or actual medal evaluation. None of its simulation primitives is implemented yet.

The [extension plan](../authoring/challenges/round-05-reference-adjustments.md) contains a 16-item support matrix, six bounded extensions, twelve level briefs, theme mappings and fourteen future acceptance cases. Keep proposed IDs outside valid pack manifests until schemas, semantics and runtime support exist together. This avoids promising unlimited no-code mechanics while preserving easy authoring inside supported behaviors.

Updated deliverables:

- [17 revised prompts](../authoring/prompts/round-05-adjustments.md), within the existing 56-template library.
- [Reference lessons for AI authors](../authoring/REFERENCE-LESSONS.md), linked from all five installed skills.
- [A new original visual study](concepts/round-05-gameplay-study.png), explicitly a concept, not a working screenshot or sprite atlas.
- [Verification record](../authoring/evaluations/round-05-verification.md) for the authoring changes.

## Recommended sequence after design agreement

First prove the core cut/fill explanation and precise steering. Next test one mixed-terrain board and one changing-contour board on keyboard, controller and touch. Add gallery payoff and independent medals, then trial the same boards under all four themes and multiple image media. Only then expand into the full twelve-level campaign, erosion variants, procedural recipes and the production asset collection.

The engagement hypothesis is voluntary replay driven by better cuts, satisfying reveals and unfinished personal mastery. Measure first successful capture, understandable deaths, successful retries and voluntary next-level/replay choices. These references suggest useful mechanisms; they do not prove retention or guarantee an addictive game.
