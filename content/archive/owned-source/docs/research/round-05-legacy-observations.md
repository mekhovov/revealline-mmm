# Round 05 — direct inspection of legacy territory games

Research date: 12 September 2026. Scope: Xonix DOS, SeXoniX DOS, and Super Qix. This audit supplements [the earlier lineage report](xonix-and-xposed.md). It is design research, not a claim that every screenshot, release, or internet video has been inspected.

## Method and coverage

Video observations below come from rendered YouTube playback inspected in the in-app browser. Most are paused frames separated by five-second seeks; a few short intervals played normally between observations. **This is sampled temporal evidence, not continuous viewing of the complete videos.** No video or remote screenshot was downloaded. Ads and frames that had not yet updated after a seek were excluded. No claims about soundtrack, exact input latency, collision tolerances, or frame-perfect movement follow from this audit.

| Reference | Directly inspected coverage | What remains unverified |
|---|---|---|
| **Xonix gameplay (PC Game, 1984)**, Squakenet, uploaded 13 October 2014 | 16 timestamped gameplay frames: 0:10, 0:15, 0:20, 0:25, 0:30, 0:35, 0:49, 0:54, 0:59, 1:04, 1:09, 1:14, 1:19, 1:24, 1:29, 1:34, from an 8:11 recording. [Video](https://www.youtube.com/watch?v=zJCbKPNEnF8) | The exact DOS executable version, complete later-level progression, all failure conditions, and exact fill implementation. |
| **Arcade Longplay [1038] Super Qix**, World of Longplays / KAGE-008, uploaded 5 March 2024 | 16 timestamped frames: 0:53, 0:58, 1:03, 1:08, 1:13, 1:18, 1:23, 1:28, 1:33, 1:38, 1:43, 1:48, 5:58, 6:07, 29:53, 29:59, from a 59:47 player duration. [Video](https://www.youtube.com/watch?v=rmnB6ua-jnI) | Full normal/hard runs, complete powerup behavior, control-speed rules, and the complete capture algorithm. The uploader notes use of save states in many channel videos; this is not a benchmark of human difficulty. |
| **SeXoniX**, 1994 DOS, public LaunchBox gallery | Both public gallery thumbnails inspected; the gameplay still additionally opened at its native 320×200 resolution. [Gallery](https://gamesdb.launchbox-app.com/games/images/97727-sexonix), [gameplay still](https://images.launchbox-app.com/a0988e4f-756a-422d-9fd5-8ccc7f93e21c.png) | No SeXoniX gameplay video was successfully inspected. A title image is marked as a demo; do not assume its exact version covers every edition. |
| **SeXoniX**, MobyGames nine-image DOS gallery | Public screenshot captions and metadata read. Opening the image required date-of-birth verification. The form was not completed; gated images were not inspected. [Gallery](https://www.mobygames.com/game/31702/sexonix/screenshots/) | All nine Moby images remain unverified visually in this audit. Captions are contributor descriptions, not observations by us. |
| **Xonix 1.4 X11 reimplementation**, 1995 manual | Original project manual read via Debian's source archive. [Manual](https://sources.debian.org/src/xonix/1.4-13/xonix.man/) | This is explicitly a reimplementation; its algorithm and tuning cannot establish what the 1984 DOS executable or SeXoniX does. |

## Direct observations

### Xonix: a strong three-state visual grammar

At 0:10, the open board is black, captured terrain cyan, and the unfinished orthogonal trail magenta with a brighter tip. Small pale diamonds occupy open space; a dark outlined moving object occupies captured terrain. From 0:10 to 0:15, the `Xn` counter falls from three to two while `Full` remains 8%. The exact collision is between inspected frames. Captures then accumulate as irregular stepped terrain rather than predesigned rectangles. At 1:19 the HUD reads 72%; at 1:24, 74%. By 1:29 a new board reads 0%, score has increased, two lives remain, and four pale interior hazards are visible; the preceding board had three. [Timestamped footage](https://www.youtube.com/watch?v=zJCbKPNEnF8&t=10s)

The important distinction is **captured terrain versus unconditional safety**. A land-domain enemy is visibly present inside the cyan territory, so the safe/open shorthand must be taught carefully. The increasing obstruction comes from the geometry players create, even before adding authored terrain.

### Super Qix: readable action over a rewarding picture

At 0:58, a silver segmented perimeter surrounds a mostly plain blue field, with a bright marker, large green enemy, and skull sprites on the perimeter. At 1:03 the thin yellow unfinished trail contrasts with the field; completed boundaries are pale cyan. The bottom picture expands from 7% at 1:08 to 17% at 1:13, with yellow letter objects near accessible routes. At 1:33 the central castle becomes recognizable. At 1:43 the ratio is 83% with a remaining covered rectangle; by 1:48 the castle picture is fully visible while ratio still reads 83%. Thus the recorded reward sequence reveals more artwork than the capture quota itself. [Opening-stage sequence](https://www.youtube.com/watch?v=rmnB6ua-jnI&t=58s)

At 5:58–6:07 the Dragon stage uses green cover and red artwork; skulls appear on internal boundaries. At 29:53–29:59, the uploader's hard-mode chapter shows a red field and a collected `A` in the header. Repeated green silhouettes must not be counted as separate enemies without motion analysis; some may be afterimages. [Dragon](https://www.youtube.com/watch?v=rmnB6ua-jnI&t=358s), [hard-mode sample](https://www.youtube.com/watch?v=rmnB6ua-jnI&t=1793s)

### SeXoniX: mixed media was part of the lineage

The public gameplay still shows a photographic upper strip behind a saturated blue cover layer. A very narrow revealed vertical connector separates two larger covered lobes. Three tiny diamond-like hazards, a small square marker, a numeric score at the top, and thin colored perimeter indicators remain distinct from the photo. This is useful evidence that the genre's gameplay language does not require pixel-painted backgrounds. A still cannot establish speed, the connector's capture history, the meaning of each edge indicator, or whether an enclosed enemy blocks filling. [Gameplay still](https://images.launchbox-app.com/a0988e4f-756a-422d-9fd5-8ccc7f93e21c.png)

MobyGames' contributor captions describe a level start, a border enemy catching the player before moving, an initial large move, level-one completion, level two, and high scores. These are caption evidence only. [Caption index](https://www.mobygames.com/game/31702/sexonix/screenshots/)

No explicit artwork is copied into the project's concept boards or assets. The design lesson is gradual image discovery coupled to a clear arcade layer.

## Manual evidence: one exact algorithm, with a strict edition boundary

The 1995 X11 manual specifies two threat domains: yellow eaters cross filled terrain; flyers occupy empty terrain. Reaching filled ground completes the trail and fills adjacent empty regions containing no flyer. A flyer contacting the player or unfinished route costs a life. Completion requires 75% of the initially empty area. Its stated progression adds a flyer each level, a life every second level, and an eater every fifth. Arrow keys and a configurable default 50 ms movement step are documented. Those are facts about this port, not a tuning prescription or proof of original DOS behavior. [Source manual](https://sources.debian.org/src/xonix/1.4-13/xonix.man/)

The separate 1996 ZX Spectrum title **Sex Xonix** and a similarly named JVL touchscreen game appeared in searches. They should have separate reference records, not be merged into the 1994 DOS game. [ZX catalog](https://worldofspectrum.net/item/0013046/), [JVL manual listing](https://manualzilla.com/doc/5691508/operator-s-manual---jvl-ent)

## Recommendations for our game — design proposals, not historical facts

1. **Teach three simultaneous states.** Use a bright player and live trail, an unmistakable claimed-region boundary, and a subdued cover layer. Land becomes safe from one enemy class, not necessarily every enemy. Give line-following and open-field enemies different silhouettes and movement vocabularies.
2. **Make the completed picture a real reward.** On standard level victory, freeze hazards and show the complete artwork in a brief celebration; retain the achieved percentage for scoring. Then save the image to a gallery. An optional 90% or 95% mastery challenge should have its own clear goal, not withhold the basic art reward.
3. **Start with spatial decisions.** Initial levels should contrast a short border cut, an L-shaped route, a cross-board split, and a tight-corridor escape. Add timing hazards after the player understands closure. Simply multiplying enemy speed misses the strongest recurring lesson.
4. **Preserve gained territory on a life loss in the default arcade mode.** Reset only the unfinished trail, clearly identify the collision, briefly protect respawn, and keep the next attempt immediate. Campaign and challenge variants may use stricter failure rules if visibly declared.
5. **Use optional collection to redirect movement.** A collectible beyond a tempting route can create an interesting detour. Historical letters suggest regional symbols, unit patches, cassette labels, or fictional savings tokens. Avoid a required collectible that can become unreachable after capture.
6. **Separate image content from active objects.** Photographed vehicles, painted aircraft, illustrated flowers, and decorative logos never acquire collision automatically. Real enemies need an outline or marker consistently distinct from those background objects.
7. **Allow different cover palettes per chapter, with the same hierarchy.** A cobalt DOS field, charcoal signal interference, cream paper veil, or dark Coupa circuit mesh can all work. Artwork and cultural ornament should recede while the player draws; briefly intensify the artwork on a capture event.
8. **Do not copy legacy ambiguity.** Show the capture policy before the challenge and highlight what blocks a fill. The exact DOS/SeXoniX policies remain open questions. A recommended first prototype is the explicitly explainable empty-region policy from the X11 manual, compared with another policy in a controlled test, rather than falsely calling either an exact Reloaded clone.

### Concrete challenge sequence to discuss

| Proposed challenge | Decision it teaches | Family adaptation |
|---|---|---|
| First Signal | Complete one short cut, then a larger L route | Drone clears interference; Atlas uncovers a motif; retro boots a scene; Navi reveals a savings opportunity |
| Two Domains | Watch both interior motion and a border patrol | Open-field interceptor plus route crawler, with visible domain labels during teaching |
| Empty Pocket | Predict which partition satisfies the chosen fill policy | A single marked anchor threat makes the explanation concrete |
| The Detour | Trade safe percentage for an optional collectible | Patch, regional stamp, cassette token, or fictional savings badge |
| Narrow Return | Leave a safe return lane before making a long cut | A authored corridor changes timing without increasing base speed |
| One More Cut | Win at the normal quota, then offer a separate mastery replay | Complete gallery reward plus optional high-exposure medal |

These are level briefs. They should become validated content only once the corresponding runtime capabilities and capture policy exist.

## Contract and authoring consequences

- Model claimed terrain, active trail, mask coverage, gallery unlock, and enemy movement domain separately.
- Specify whether victory displays the entire artwork; do not conflate gallery visibility with the score's captured fraction.
- Add a collision/failure explanation event and declare progress preservation on life loss in the ruleset.
- Separate collectible acquisition by touch from collectible acquisition by enclosing its location.
- Keep active-object positions in level data, never inferred from image pixels or image generation prompts.
- Test tiny display sizes using an actual rendered board: the historical SeXoniX still shows how small indicators and photo details can compete.
- Record edition, source, observation type, timestamp, and confidence whenever an AI skill imports reference mechanics. A screenshot can constrain appearance; it cannot certify collision behavior.

## Remaining work that needs new evidence

Exact SeXoniX video behavior remains uninspected. The nine Moby screenshots need legitimate age verification before that source can be used. Original DOS fill behavior, the Super Qix powerup table, and frame-accurate input behavior remain uncertain. Testing the eventual prototype with keyboard, touch, and controllers will be more useful than assuming nostalgic difficulty was always fair.
