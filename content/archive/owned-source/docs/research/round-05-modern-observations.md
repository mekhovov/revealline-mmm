# Round 05: directly inspected territory-capture references

Research date: 12 September 2026. This document records actual visible evidence and proposed design changes. It does not certify a playable build or claim that every video on the web was watched.

## Inspection scope and method

- **Lightfish:** all **20 screenshots** linked from the developer's gallery were visually inspected at their full 1280×720 source size in the browser. Also inspected the developer-linked **52.85-second trailer**, sampling gameplay frames at 13.11, 18.11, 23.11, 28.11, 29.11, 34.11 and 44.11 seconds. The 28.11→29.11 sequence was advanced by 30 individual video-frame steps, not inferred from unrelated stills. Other samples are trailer cuts and must not be read as one continuous run.
- **AirXonix:** all **three screenshots** linked on AxySoft's product page were visually inspected, plus the publisher's rules. No AirXonix video was inspected in this subtask.
- **Fortix 2:** inspected the Nemesys Games trailer at 20.86, 25.86, 30.86, 35.86, 40.86 and 45.86 seconds. The browser reported a 60.88-second duration. These are sampled frames, not a complete campaign walkthrough. Read the original **Fortix** manual separately; its details are not automatically attributed to the sequel.
- **Mokoko X:** inspected the official ID@Xbox launch trailer, including gameplay frames at 25.01, 30.01, 35.01 and 40.01 seconds; also sampled its introduction. Read the publisher-provided Xbox rules. This is a selected comparison, not a complete enemy audit.
- Original Fortix and Fortix 2 Steam pages reported region-unavailable in the browser. Publicly indexed publisher text, the official Fortix manual, and the separately published official trailer were available. No location, account, or age settings were changed. No executable was run and no remote media was downloaded to bypass display restrictions.

Source labels below: **observed** means visibly inspected image/frame/UI; **documented** means publisher instructions; **proposal** means our design judgment. Playback was inspected visually through browser screenshots; music quality and sound timing were not audited by listening.

## Lightfish: the clearest new evidence for a rewarding large capture

The developer's [gallery and trailer link](https://www.eclipse-games.net/LightFish.html) provide unusually useful tutorial and progression screens, alongside gameplay. The [developer-linked trailer](https://www.youtube.com/watch?v=JP3GyqV-bEU) is hosted by Eduardo Jimenez, the channel linked from Eclipse Games' own site.

### Screenshot inventory

The numbers are the developer's filenames, not our guessed level numbers.

| Screenshot | Directly observed detail | Implication for our design |
|---|---|---|
| [01](https://www.eclipse-games.net/Images/LightFish/Screenshot01.jpg) | Fish silhouette, luminous logo, and both controller-button and keyboard start/exit hints. | Present the active input vocabulary without requiring a mouse. |
| [02](https://www.eclipse-games.net/Images/LightFish/Screenshot02.jpg) | Purple L-shaped wall, open field, thin perimeter and separate HUD for percentage, lives, time, multiplier and score. | A authored obstacle changes the cut problem while the rules stay familiar. |
| [03](https://www.eclipse-games.net/Images/LightFish/Screenshot03.jpg) | Very narrow captured inlet; dense enemies and circular effects near its tip; only 1% captured. | Tiny progress alone is not the desired reward rhythm. |
| [04](https://www.eclipse-games.net/Images/LightFish/Screenshot04.jpg) | Large captured region, magenta destruction fragments, x5.00 and a +4.00 popup. | Make the cause and value of a successful cut visible. |
| [05](https://www.eclipse-games.net/Images/LightFish/Screenshot05.jpg) | A staircase of purple blocks, matching stepped captured contour, long yellow active trail. | Staircases can teach route planning without random clutter. |
| [06](https://www.eclipse-games.net/Images/LightFish/Screenshot06.jpg) | Isolated orange blocks, x2 pickup, fish and threats clustered beside an existing boundary. | Place tempting pickups near meaningful routing decisions. |
| [07](https://www.eclipse-games.net/Images/LightFish/Screenshot07.jpg) | A long orange horizontal bar separates upper and lower space. | One strong barrier can give a level a memorable identity. |
| [08](https://www.eclipse-games.net/Images/LightFish/Screenshot08.jpg) | Offset orange pillars; a yellow dogleg trail reaches toward the top boundary. | Offset obstacles test steering and the decision to add another turn. |
| [09](https://www.eclipse-games.net/Images/LightFish/Screenshot09.jpg) | Several distinct organism silhouettes and ring-shaped effects; captured corner has a different tint. | Enemy silhouettes should carry more information than color alone. |
| [10](https://www.eclipse-games.net/Images/LightFish/Screenshot10.jpg) | Large ring threats, orange pillars and a long exposed vertical trail. | Distinguish an enemy's visible influence from its small core. Exact ring collision behavior is unverified. |
| [11](https://www.eclipse-games.net/Images/LightFish/Screenshot11.jpg) | Two horizontal bands display white snowflake symbols, not merely a blue tint. | Terrain state needs a recognizable pattern as well as color. |
| [12](https://www.eclipse-games.net/Images/LightFish/Screenshot12.jpg) | Mixed orange and snowflake pillars; bright white fragments along a fresh capture. | Vary obstacle combinations; keep destruction effects out of the remaining threat lanes. |
| [13](https://www.eclipse-games.net/Images/LightFish/Screenshot13.jpg) | Tall narrow arena with different horizontal bands above and below a thin claimed corridor. | Arena topology can create a new challenge; device resizing must not silently change it. |
| [14](https://www.eclipse-games.net/Images/LightFish/Screenshot14.jpg) | Similar narrow composition at a later state, with a broad captured lower section. | A level thumbnail should communicate its topology. These two stills do not prove temporal sequence. |
| [15](https://www.eclipse-games.net/Images/LightFish/Screenshot15.jpg) | Repeated columns alternate orange and snowflake segments. | Terrain combinations can create deliberately positioned crossing opportunities. Their timing is not measurable from this still. |
| [16](https://www.eclipse-games.net/Images/LightFish/Screenshot16.jpg) | A roughly symmetric arrangement of purple structures, orange bars and white blocks. | Symmetry helps players parse a harder authored challenge. |
| [17](https://www.eclipse-games.net/Images/LightFish/Screenshot17.jpg) | Isolated mixed blocks, a long L-shaped trail, an x2 pickup and a gold-colored entity in claimed territory. | Occupied and claimed regions may have distinct threat roles; exact entity identity remains unverified. |
| [18](https://www.eclipse-games.net/Images/LightFish/Screenshot18.jpg) | Win and high-score messages; game/time/lives components and difficulty factor are displayed over the board. Some counters are zero in this still. | Results should explain the score. Do not copy these captured intermediate numbers as final arithmetic. |
| [19](https://www.eclipse-games.net/Images/LightFish/Screenshot19.jpg) | Nine level thumbnails, differing star completion, selected map title, best rating and high score; keyboard navigation hints. | Show unfinished mastery next to familiar level silhouettes for easy replay selection. |
| [20](https://www.eclipse-games.net/Images/LightFish/Screenshot20.jpg) | Tutorial explicitly explains larger-area rewards, multiplier and five powerup types. | This is stronger evidence than guessing mechanics from colored effects. |

### What the tutorial actually establishes

**Observed instructions:** area size contributes to points; a sufficiently large capture may generate a powerup. Defeating enemies or walls raises the multiplier, while dying resets it to x1. The listed powerups increase the multiplier, slow enemies, add a life, grant temporary invulnerability, or add time in Time Trial. The displayed text does not specify the spawn threshold, probability, effect durations, or multiplier formula. [Tutorial screenshot 20](https://www.eclipse-games.net/Images/LightFish/Screenshot20.jpg)

### Timestamped motion evidence

| Trailer position | What is visible |
|---|---|
| [13.11 s](https://www.youtube.com/watch?v=JP3GyqV-bEU&t=13s) | An orange near-enclosure, a narrow captured path, 32% against a 75% target, and enemies in the remaining region. |
| [18.11 s](https://www.youtube.com/watch?v=JP3GyqV-bEU&t=18s) | Large captured left region, 49%, x4.50 and +3.50, with an x2 collectible still in open space. |
| [23.11 s](https://www.youtube.com/watch?v=JP3GyqV-bEU&t=23s) | Alternating orange and snowflake columns; a multi-turn captured corridor runs between them. |
| [28.11→29.11 s](https://www.youtube.com/watch?v=JP3GyqV-bEU&t=28s) | At 28.11, the fish is near the end of a long vertical active trail, with 0%, x1.00 and score 0. By 29.11 it reaches the upper boundary; the right region changes to captured tint, percentage becomes 43%, multiplier becomes x6.50, score becomes 121842, and fragments appear across that side. Enemies remain on the left. The exact score calculation is unknown. |
| [34.11 s](https://www.youtube.com/watch?v=JP3GyqV-bEU&t=34s) | Tall arena with several kinds of horizontal obstacles and a thin captured branch; the trailer labels Adventure and Time Trial. |
| [44.11 s](https://www.youtube.com/watch?v=JP3GyqV-bEU&t=44s) | A wide captured section alongside orange pillars and an x2 pickup; this is a different trailer excerpt, not continuity with the prior level. |

**Proposal:** prioritize a clear, substantial capture payoff: closure confirmation → affected objects respond → region reveals → score explanation appears. The single sampled transition supports the existence of this payoff; it does not prove an optimal animation duration or an entire fill algorithm. The commercial soundtrack label does not establish any particular musical style without listening.

## Fortix: meaningful objects can make capture order tactical

The original [Fortix manual](https://cdn.akamai.steamstatic.com/steam/apps/45400/manuals/fortix_PC_manual_WEB.pdf?t=1447353028), PDF pages 2–4, documents the following: an enclosure creates a new baseline; capturing halberd triggers activates catapults against towers, while towers can also be enclosed directly. Dragons must be enclosed. Grass, water and swamp alter speed; walls are impassable. Some creatures pursue only after the player leaves safety, while bats travel on the baseline. Separate powerups can freeze towers/projectiles or monsters. These are **documented original-Fortix mechanics**, not direct observations of their timing. The manual also offers achievements for large captures and capturing multiple triggers together.

This is a valuable precedent for our **capture an objective → change the local challenge** idea. It provides a reason to choose a strategically valuable small enclosure even when a larger empty enclosure is available. The two decisions can coexist: maximize immediate area, or improve the next opportunity.

### Fortix 2: direct trailer observations

[Nemesys Games trailer](https://www.youtube.com/watch?v=suOE3Ds8qxk), discovered through the [archived link directory](https://wiki.ubuntuusers.de/Archiv/Spiele/Fortix_2/). The channel name was verified in the browser.

| Time | Observed scene |
|---|---|
| [20.86 s](https://www.youtube.com/watch?v=suOE3Ds8qxk&t=20s) | The knight extends a bright line from a baseline across an illustrated landscape; a catapult is already visible nearby. |
| [25.86 s](https://www.youtube.com/watch?v=suOE3Ds8qxk&t=25s) | A red exposed trail, a starred ruined structure and nearby creatures create a visibly risky route. |
| [30.86 s](https://www.youtube.com/watch?v=suOE3Ds8qxk&t=30s) | A newly enclosed region is bright green beside muted land; a twofold combo and 2,500-point popup are visible. |
| [35.86 s](https://www.youtube.com/watch?v=suOE3Ds8qxk&t=35s) | A lava-world board contains fortified walls, an electric-looking gate segment, catapults, flying projectiles and a yellow key near the knight. |
| [40.86 s](https://www.youtube.com/watch?v=suOE3Ds8qxk&t=40s) | A narrow path threads between several structures inside a diamond-shaped fortress. |
| [45.86 s](https://www.youtube.com/watch?v=suOE3Ds8qxk&t=45s) | A gate-key capture message and reward appear while multiple colored keys and separate strongholds remain on the board. |

These trailer samples visibly establish **objectives, keys, segmented architecture and combo feedback**. They do not independently establish the exact key-to-gate mapping, targeting rules, or whether every turret remains active inside captured land.

**Proposal:** introduce one optional objective per early level, then combine two. A relay disabling one clearly linked hazard is a better first lesson than a full inventory of keys, towers and upgrades. Later mastery can reward two linked objectives in one capture.

## AirXonix: a flying avatar fits, but perspective has costs

The [official rules](https://www.axysoft.com/airxonix/) distinguish balls in open space from mines in filled space, limit level time, and describe life, score, time and slowdown bonuses. The flying avatar is explicitly part of the publisher's design.

- [Screenshot 1](https://www.axysoft.com/airxonix/1.jpg): a small rotor craft, large striped balls, pink spiked objects, outlined bonus symbols, irregular filled areas and a tiled floor. Height and cast shadows communicate a toy-like 3D world.
- [Screenshot 2](https://www.axysoft.com/airxonix/2.jpg): a water-like arena, a stepped perimeter and a highly visible segmented cream-colored trail with two right-angle turns. The avatar's shadow is offset from its apparent position.
- [Screenshot 3](https://www.axysoft.com/airxonix/3.jpg): the remaining playfield is divided into several pockets and connected lanes. The craft trails cream segments beside a spherical threat; pink spiked objects appear on the filled perimeter.

**Proposal:** borrow the craft's immediate identity and the trail's clear segmentation for FPV FRONT. Keep the authoritative collision plane top-down. Decorative rotor movement, shadow and altitude bob can add life, but they must not shift the apparent cell the player occupies. A 3D camera compresses distant cells and complicates precise touch steering; that is a design inference, not a measured defect in AirXonix.

## Mokoko X: readable portraits and reward logs, excessive chrome for phones

The publisher's [Xbox description](https://www.xbox.com/en-US/games/store/mokoko-x/9pgjk7m3p4rp) documents a shield that drains while the player waits and disables during drawing. Difficulty changes enemies, shield and required area. Treat this as an optional pressure rule; it does not need to be the default for discovery-oriented play.

The [official Xbox trailer](https://www.youtube.com/watch?v=1KnM7g0Rlmg) was visually inspected at these gameplay samples:

- **25.01 s:** a portrait-oriented playfield is framed by wide information rails. The left rail records small/medium/huge capture rewards, the right shows life and shield bars, percentage, score and effects. A thin vertical capture edge separates fully revealed illustration from an opaque colored silhouette layer. Question-mark boxes occupy the remaining field.
- **30.01 s:** a large pirate-themed central enemy and smaller boats appear around an exposed red trail, with visible projectile dots. The reward log also records life loss.
- **35.01 s:** a large health pickup, renewed green shield bar, and bonus messages appear over a partially revealed scene. The exact causality among these simultaneous effects is not established by one frame.
- **40.01 s:** a different enemy family, geometric formations of question-mark boxes, a central irregular revealed window, and a large-area reward. Repeated enemy motifs make each chapter recognizable.

**Proposal:** use a concise event log to explain why a capture paid out or a player died. On phones, collapse it into one short message outside the arena; the trailer's wide rails consume too much space to copy literally. Make the obscuring layer configurable independently of artwork. An image may begin as a dark silhouette, graphic interference, opaque curtain or tinted scene, while identical capture rules govern the reveal.

## Specific adjustments recommended for our game

These are proposed defaults and authoring requirements, not newly implemented behaviors.

| Change | Evidence behind it | Four-theme translation |
|---|---|---|
| Reward substantial captures with a capped score bonus and occasional earned pickup. Define probability and seed explicitly. | Lightfish tutorial and observed 43% capture; Mokoko's size-labeled reward log. | Drone supplies; cultural collectible fragments; arcade multiplier; fictional savings bonus. |
| Let certain captured objects alter one clearly linked hazard. | Original Fortix manual and sequel key/catapult scenes. | Disable interference relay; restore a landmark gateway; activate arcade switch; resolve a costly workflow bottleneck. |
| Maintain distinct open-field, boundary-following and stationary ranged threats. Teach them separately. | AirXonix rules, original Fortix manual, and visible turret/projectile compositions. | Theme supplies appearance and vocabulary; movement/collision roles remain explicit data. |
| Add obstacle grammar: bar, offset pillars, staircase, paired chambers, narrow bridge, symmetric fortress. | Lightfish's complete gallery and Fortix 2 trailer. | Pattern shapes can echo embroidery or circuits without turning decorative pixels into collision data. |
| Separate classic percentage victory, objective victory and optional anti-camping pressure. | AirXonix area play, Fortix objectives, Mokoko shield rules. | Same artwork can support different challenges with separate identifiers and scores. |
| Show the capture chain in order and provide a compact explanation of scoring. | Lightfish closure sequence and tutorial; Fortix combo; Mokoko log. | Clear capture, reveal, objective and reward effects in each theme's language. |
| Preserve source-art richness while protecting active-trail contrast and enemy silhouettes. | Lightfish's faint backdrop versus luminous entities; Mokoko opaque reveal layer; Fortix before/after tint. | Pixel scenes, photographs, paintings and illustrations use configurable masks and overlays. |
| Make level selection a readable gallery of topology, art progress and unearned medals. | Lightfish screenshot 19. | Regional atlas, mission board, cartridge shelf or customer network. |

The highest-priority unresolved rule remains the **fill policy**. None of these sampled videos justifies claiming that all games use the same empty-side, smaller-side or protected-enemy algorithm. Our rules should explicitly identify which objects prevent filling and which objects are affected after filling. Do not assume that every visible enemy acts as an anchor simply because it is an enemy.

## Suggested first challenge sequence

1. A broad empty rectangle and one open-field mover: teach leaving and returning to safety.
2. A central bar: demonstrate that the route can bend while preserving the same capture rule.
3. A larger optional cut with a clearly previewed reward: teach risk/reward.
4. One boundary follower: teach that safe territory and safe position are different concepts in this ruleset.
5. One linked objective and one stationary hazard: teach capture order.
6. Two chambers and an optional double-objective capture: combine learned ideas.
7. A chapter finale with a familiar enemy family and one new modifier; record speed/survival/route mastery separately.

For FPV FRONT, the scene can reveal a fictional invading Russian military position while capturing signal-control objectives changes live arcade threats. The illustrated vehicles, live enemies and objective icons must remain separate layers. Ukraine Atlas can reveal historically sourced places and crafts; 1994 Forever can reveal rooms, arcades and space-art scenes; Navi Network can reveal a fictional customer operation while captures remove waste or reconnect services. These translations preserve the user's distinct goals rather than flattening all themes into cosmetic recolors.

## What still requires hands-on testing

Input buffering, reversal prevention, analog dead zones, touch ergonomics, exact hazard timing, whether score bonuses remain interesting after artwork is known, and whether players predict the filled region correctly. The inspected commercial media shows design possibilities; it provides no retention experiment, no measured input latency and no evidence that copying every feature improves our game.
