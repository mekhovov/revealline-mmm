# Round 02 — arcade skill, picture discovery, and tactical expeditions

Research date: 12 September 2026. Status: design proposals for discussion, not an implementation specification. The user selected **all three motivations** from round 01 and requested more device, screen-size, aesthetic, and theme exploration. This note develops the gameplay side; no code or production assets have been created for it.

## Recommendation

Make one recognizable territory-cutting game with three layers operating at different timescales:

- **During a cut:** read enemy movement, commit to a route, and close it safely. This is the skill layer.
- **After a successful cut or board:** discover artwork, wake a tiny scene, hear another part of the music, and keep a collectible. This is the discovery layer.
- **Between boards:** select a route and one temporary module that changes the next decisions. This is the tactical layer.

The same successful cut can serve all three: it demonstrates timing, reveals the image, and captures a useful objective. The player should not need to read upgrade cards while dodging enemies. Keep the immediate control vocabulary to movement, drawing/commit if the chosen control model needs it, and at most one optional active ability.

The three pillars are a user preference; the modes, durations, upgrade limits, and rules below are recommendations requiring visual review and later playtesting. There is no measured retention evidence for this proposal or for XPOSED RELOADED in our research.

## What primary sources contribute

| Source-backed finding | Design inference for this game |
| --- | --- |
| Taito describes Qix as claiming enclosed territory while evading the free-moving Qix and the line-following Sparx. | Keep field threats and boundary threats visually distinct; choosing when to leave and return to the border is enough to create the basic tension. [Taito retrospective](https://www.taito.co.jp/en/mob/topics/14971) |
| The official Volfied rerelease describes piloting Monotros, reclaiming a home world, reaching 80%, and avoiding contact with the ship or unfinished lines while its barrier is off. | A flying protagonist and a reclamation story fit this genre naturally. The cited 80% is Volfied's rule, not an approved quota for our game. [Publisher description](https://www.nintendo.com/us/store/products/arcade-archives-volfied-switch/) |
| Fortix's publisher describes fencing off battlefield territory, collecting catapults and powerups, besieging fortresses, and restoring the land. | Territory can contain tactically useful objects, giving cuts a purpose beyond percentage. We should distinguish an object's capture effect from the flood-fill rule. [Nemesys publisher page](https://store.steampowered.com/app/45400/Fortix/) |
| Supergiant describes Hades runs as combinations of powers, different challenges, and further story discoveries. Its FAQ discusses difficulty modifiers, permanent progression, and optional engagement with the narrative. | A repeated action loop can support both build variety and persistent discovery; our application should remain much smaller than Hades. [Developer FAQ, updated July 2025](https://www.supergiantgames.com/blog/hades-faq/) |
| Dead Cells' official site pairs demanding repeated action with nonlinear paths, new level unlocks, and secrets. | Branching routes and optional secrets can supply variation without adding controls to every moment. This does not establish that permadeath is suitable for this project. [Developer site](https://dead-cells.com/) |

These are structural precedents, not evidence that copying them produces popularity or a specific return rate. Hades and Dead Cells are action references; their combat density is not a target for this game.

## Three concrete mode structures

### 1. Arcade Sprint — the best immediate entry point

Choose a picture and a board, make cuts, reach the quota, receive the full reveal, and choose retry or next. Aim initially at roughly **60–120 seconds of successful play per board**, as a tuning hypothesis. Use a fixed seed and fixed tools for score challenges, so improvement comes from the route and execution.

- First success unlocks the artwork and the next board.
- Optional medals reward survival, fast completion, and a single bold capture. The exact third medal can vary by board.
- Players can retry immediately with the previous route briefly shown on the results screen, outside live play.
- The new art remains interesting on first completion; score, route mastery, and alternate objectives must carry repeat play after the picture is known.

**Visual:** the board is the dominant element; a tiny quota meter, life indicators, one objective icon, and one ability icon are sufficient. Results briefly become a large collectible postcard with score and medals in a margin.

**Best fit:** browser visits, a short phone break, practice on a controller, and asynchronous score challenges.

### 2. Living Atlas — the strongest identity

Choose a location or themed collection; restore a few meaningful landmarks across a small authored chapter. A single board can be a **2–4 minute** session target, with chapters spread over multiple sessions. Capturing the lighthouse restores the beam, enclosing a village square lights its windows, or recovering a savings hub wakes the surrounding client city. Basic completion reveals the whole collectible artwork; optional landmarks add animation, a short fact/story card, or a music layer.

- Each chapter combines mastery and discovery, with light strategic capture order.
- The player sees only one active optional objective, even if a chapter has several possible discoveries.
- Collection progress persists. Failed attempts need not remove art already earned on earlier boards.
- Avoid requiring players to comb every last 1% of a board to enjoy its complete artwork. The last fragments may hold optional medals, not the only satisfying ending.

**Visual:** an illustrated atlas, cassette shelf, stamp album, embroidered travel book, or Coupa city map can replace the generic level grid. Each theme supplies its own album metaphor while using the same collection structure.

**Best fit:** tablet, laptop, family/shared-screen play, and slower phone sessions. This is the best place for Ukrainian places, regional motifs, cultural notes, and animated scenery.

### 3. Signal Expedition — the strongest build experimentation

Choose a route through **4–6 short boards**, aiming at **10–18 minutes** in total as an early hypothesis. After each board, pause completely and choose one of three clearly described temporary modules. Preview the next board's enemy family, reward, and one special condition before choosing a branch.

- Cap the early design at three passive module slots and one active slot. Replacement creates an understandable choice without a large inventory.
- Use compact branching: safer art route, harder score route, or an optional objective route.
- An expedition loss ends its temporary build. Previously earned artwork and discovered collection entries stay collected.
- Save and suspend between boards; interruption recovery must also be tested during a live board. A phone should not require an uninterrupted 18-minute commitment.
- A shared seed can become an optional challenge with an archive. It should not require daily attendance to keep a streak or avoid losing content.

**Visual:** route choices are presented as three collectible cards or mission tiles. The live board returns to the same quiet HUD used in Arcade Sprint; build details are expanded only at a safe menu.

**Best fit:** controller/Steam Deck, laptop, desktop, and a longer phone session. All modes remain available on all supported devices; device labels are suggested entry points, not restrictions.

### How they belong to one game

All three modes share movement, territory simulation, enemy roles, input mappings, art collections, and rendering. They differ in board sequencing, available modules, objectives, score rules, and persistence. An Arcade Sprint may use an Atlas location; an Expedition may sample validated boards from that same collection with alternate hazards. A player should recognize the controls immediately when switching modes.

## Nine territory-specific upgrade and objective ideas

Everything in this table is an original proposal. Numeric strengths and durations deliberately remain undefined until movement and board sizes are tested.

| # | Idea | What changes in the player's decision | Readable tradeoff or constraint | Possible theme treatments |
| --- | --- | --- | --- | --- |
| 1 | **Boundary glide — passive module** | Move faster on already safe territory, making another departure point more attractive. | No speed increase while drawing; it does not make a dangerous cut automatically safe. | Drone transit boost; folk-art bird following a stitch; Coupa express route. |
| 2 | **Long-cut capacitor — passive module** | Closing a sufficiently long unbroken cut restores some active-ability charge. | Benefit arrives only on successful closure; failure gives no refund. Use distance rather than arbitrary button activity. | Signal battery; singing-thread spool; savings momentum. |
| 3 | **Echo preview — active module** | Briefly show a short prediction of deterministic enemy movement before committing. | One limited charge and a clearly labeled short horizon; unpredictable enemies must not show a false certain future. | Recon echo; firefly glimmers; Navi forecast. |
| 4 | **Boundary decoy — active module** | Place one temporary lure on an existing safe edge to redirect a compatible boundary follower. | Only that enemy role responds; the lure cannot redraw geometry or secretly attract every threat. | Signal beacon; folk charm; fictional duplicate-alert lure. |
| 5 | **Insulated spool — passive module** | Survive one eligible collision with a live trail, allowing a bold cut once. | A large visible shield indicator disappears; eligibility and outcome must be clear. Avoid combining many invisible protections. | Shielded signal; protective thread; contingency reserve. |
| 6 | **Closure pulse — passive module** | Capturing a sufficiently large new area briefly slows nearby compatible roaming threats. | The pulse happens after the region is validly captured; it cannot change which region fills. | Signal wave; expanding floral ring; efficiency wave. |
| 7 | **Silence the relay — objective** | Prioritize a stationary emitter whose capture disables a clearly drawn hazard zone. | The emitter is capturable and never a hidden fill blocker. Its zone and shutdown effect are previewed. | Fictional invading jammer; thorn lantern; cost-leak server. |
| 8 | **Twin discovery — optional objective** | Include two marked landmarks within the newly captured cells of one successful closure. | Both markers must genuinely lie inside captured territory; merely drawing around them is insufficient. | Two radio markers; bird-and-flower pair; duplicate invoice pair. |
| 9 | **Restore the route — chapter objective** | Recover three landmarks, with a choice of order that changes local obstacles. | The final objective is explicit; captured landmark effects never silently rewrite the capture policy. | Bridge, mill, lighthouse; three seasonal motifs; procurement, payment, delivery hubs. |

Suggested first visual comparison: **boundary glide + silence the relay**, **long-cut capacitor + twin discovery**, and **echo preview + restore the route**. They create respectively positioning, risk-taking, and planning styles without extra weapons or complex combat. Module names and themes should change through content packs; the behavior identifier remains shared.

## Capture policy must remain separate from objective effects

The fill policy answers **which cells become safe when a trail closes**. A captured device effect answers **what happens to an object after its cells become safe**. Artwork revelation answers **how those safe cells are presented**. These are three separate steps.

For a first rules storyboard, a candidate is: after a valid closure, newly separated regions without a designated roaming blocker become captured. The moving blockers need a unmistakable shared visual mark. Stationary relays, landmarks, pickups, and decorative artwork are not blockers. If blockers remain on both sides, the outcome must be explained visually; this potentially unsatisfying case needs comparison with alternative policies before choosing the rule.

Example: the player cuts a corner containing a relay while the roaming blocker remains outside. The corner fills according to the capture rule. The relay then switches off its hazard, and the newly visible lighthouse begins to animate. The relay itself does not decide whether the corner fills.

Do not imply that this is XPOSED RELOADED's verified rule. Round 01 left its exact fill algorithm unresolved. Do not let upgrades, theme artwork, device orientation, or a screenshot composition accidentally invent inconsistent fill rules.

## Adaptive music and image rewards

Use a small number of synchronized stems that tell the player what changed. These are proposed arrangements, not analysis of an existing game's audio implementation.

| Play state | Sound | Image/animation |
| --- | --- | --- |
| Safe traversal | Sparse rhythm, warm bass, a clear ambient identity. | Quiet border movement; the hidden artwork suggests one inviting focal point. |
| Leaving safety | Add a short rhythmic figure and trail tone. | A luminous path with a contrasting core, readable over every theme. |
| An extended cut | Introduce restrained tension/harmony, without requiring music to hear danger. | The trail endpoint stays dominant; never cover it with particles. |
| Closure | Give immediate confirmation, then resolve the musical phrase on the next suitable beat. | Fill sweeps through valid cells; ornament forms at the safe boundary. Input confirmation is immediate even if flourish timing is musical. |
| Landmark restored | Add a local sound and one musical voice. | Windmill turns, birds appear, window lights switch on, or a customer-city district wakes. |
| Board complete | Brief original melodic cadence; optional full arrangement in the gallery. | Finished artwork holds long enough to enjoy, with a prompt to continue and the option to stay. |

For KALYNA, explore tracker drums, FM bass, original bandura-like plucks and sopilka-like melody. For VYRIY, try softer percussion, plucked strings and airy call-and-response. For COUPA QUEST, try a polished electronic groove whose separate parts join as waste is removed. These are new soundtrack briefs, not instructions to copy recordings.

Layered reveal rewards can include a complete postcard, animated gallery version, unlocked soundtrack stem, pixel vignette, theme border, and a collectible patch. A pack should decide which rewards exist. A short optional gallery note can identify the artist or cultural reference. Avoid turning every small cut into a pop-up reward.

## Device and session adaptations

These are gameplay/UI proposals, not claims that any platform implementation has been tested. The detailed responsive-layout study is maintained separately.

| Context | Session structure and information | Important consequence |
| --- | --- | --- |
| Small portrait phone | One compact board, quota and life indicators above, controls outside the playfield; next/retry visible after completion. | A canonical near-square board can remain fully visible. Put beautiful tall composition in the album and margins rather than cropping active hazards. |
| Landscape phone | Controls in side gutters; board centered; temporary details collapsed. | Fingers should not cover the moving trail or a required return route. |
| Tablet | Larger board at the same world scale; an optional side panel for the current objective and collection illustration. | More screen area improves comfort and art display; it should not add enemies or unfairly expose extra simulation space. |
| Laptop/desktop | Keyboard-first navigation; full results and route comparison; a side panel for optional build details. | Hover may enhance explanations, but every action and explanation must work with keyboard/controller. |
| Steam Deck/handheld PC | Large controller prompts, immediate resume, short between-board choices. | Inspect actual-size text and sprites at handheld viewing distance; a desktop screenshot is insufficient. |
| TV/controller | Large simple HUD, spacious results, readable threats from a distance. | Decorative grain, fine borders and tiny numbers must not be essential for understanding. |
| Ultrawide browser | Center the same gameplay board; use side space for art, album context or restrained ambience. | Extra width should not silently change a scored board's geometry or challenge. |

Responsive presentation should first preserve one board's geometry. Later, portrait-specific or panoramic boards can be separately authored variants with their own challenge identity. A different aspect ratio can change cut lengths and enemy travel, so it should not be treated as a cosmetic resize in competitive scoring.

Input candidates to compare in a later playable proof: a fixed four-way touch pad, a floating cardinal pad, and swipe-to-turn with visible direction buffering. A touch hold/commit option may help prevent accidental departure; its behavior must match the selected keyboard/controller drawing rule. Touch reliability is unresolved until tested with real thumbs and failure cases. Audio and haptics should reinforce visible cues, and both should be optional.

## Next visual iteration to request

1. The same dramatic closure in three identities: KALYNA, VYRIY, and COUPA QUEST. Show safe territory, live trail, a marked blocker, and a capturable relay as distinct roles.
2. One scene before capture, during the cut, immediately after closure, and in the completed animated-gallery concept.
3. The same board on a small portrait phone, landscape handheld, tablet, desktop, and distant TV view. Preserve gameplay geometry and demonstrate different framing.
4. An Expedition choice screen with only three modules, each a short sentence and one clear icon.

The next question is aesthetic and experiential: which combinations feel like a world the user wants to inhabit repeatedly? There is enough direction to produce more visual studies; this does not authorize game implementation yet.
