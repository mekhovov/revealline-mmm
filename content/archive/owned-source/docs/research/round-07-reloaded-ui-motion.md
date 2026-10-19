# Round 07 — Reloaded interface, animation and visual rhythm

Inspected 12 September 2026. XPOSED RELOADED is the principal interaction reference. This audit examines the parts that make its simple rules feel like a finished arcade game: gallery focus, picture rewards, readable moving cuts, impact effects, quick recovery and sequential results. It extends the [Round 06 mechanics observations](round-06-reloaded-observations.md), with new close samples and one additional gameplay recording. Recommendations below use original theme art and are proposals, not implemented features or measured retention findings.

## Sources and limits

- [Lentarian — Pack 6, Level 7](https://www.youtube.com/watch?v=-qG4k6dkd-c), approximately 2:47: gallery/preview at 0:00–0:05, board entry at 0:06–0:11, victory at 2:33–2:46.
- [Lord Parker — Settings & Gameplay LPOS](https://www.youtube.com/watch?v=SKKvpZ2DvUY), approximately 5:32: title, settings and gallery around 0:28–1:08, supplementing earlier manual and gameplay inspection.
- [The Foreseen Arcade — PlayStation 4 Gameplay](https://www.youtube.com/watch?v=HEM9_sQGRJQ), approximately 9:15, published 16 May 2025: newly sampled this round. Coarse samples locate early boards; close samples at 2:28.0–2:29.8 isolate a life loss and respawn. Later samples verify play continuing after the timer reaches zero.
- [Official Sony-hosted Reloaded trailer](https://vulcan.dl.playstation.net/img/rnd/202111/0915/4oOD4otPZbCJhoRuPgCBMugh.mp4): the defeat layout around 0:20. Its edited montage cannot establish continuous death-to-menu timing.
- This round's fresh web search reconfirmed the [official PlayStation listing](https://store.playstation.com/en-sa/concept/10002881), whose description emphasizes exposing pictures, progressively unlocking packs and simple controls. Store claims do not establish actual input responsiveness.

Public videos were decoded locally using the already authorized analysis workflow. The newly inspected Foreseen recording required no account, cookies or access bypass. Twenty-seven unaltered source frames are retained in [evidence/round-07](evidence/round-07); working frames and videos remain outside the project. These are reference evidence, not game assets. No full recording was watched continuously, no audio was auditioned, and no executable or input device was tested. Decimal times identify frame samples. Approximate durations below are differences between observed samples, not exact engine timings.

## The gallery makes the collection visible

At **0:00**, Lentarian's gallery shows six thumbnails in three columns and two rows. The selected card has bright cyan corner brackets; each card carries its level number, three medal positions and a high score. Global stars sit at the upper left, pack navigation at the top, and controller actions at the bottom. At **0:03**, the selected pier picture fills the screen. At **0:05**, the same gallery and selection return. The visible hold-to-preview prompt and this sequence directly demonstrate a picture-inspection flow, rather than merely suggesting one. [Gallery](evidence/round-07/reloaded-pack6-0000-0.png), [full-picture preview](evidence/round-07/reloaded-pack6-0003-0.png), [return](evidence/round-07/reloaded-pack6-0005-0.png)

Parker's **1:06** frame shows completed pictures above unknown pictures represented by question marks. At **1:08**, a lower group has moved into the visible area and Level 4 is selected. Thus six visible cards are a viewport, not a six-level pack limit. [First rows](evidence/round-07/reloaded-parker-0066-0.png), [lower rows](evidence/round-07/reloaded-parker-0068-0.png)

**Recommendation:** make our pack gallery an image collection with clear selected-state brackets, earned medals and a direct replay action. Preserve the selected level and scroll position after preview or play. Use a toggleable preview on touch; a press-and-hold interaction can remain an optional controller shortcut. Retain unknown-image mystery where the pack calls for it, while showing enough theme artwork to explain why a new pack is appealing. Desktop can use three columns; smaller portrait layouts should reflow cards and controls rather than shrink the whole console page.

## Small menus, strong focus, useful settings

Parker **1:02** shows only Start and Settings beside the large logo. The selected row becomes white over a magenta highlight, while the unselected row remains cyan. Decorative imagery occupies the other side of the screen with a scanline treatment. At **0:32**, settings expose separate music and sound toggles, brightness, gamma, a small picture preview and a How to Play entry. [Main menu](evidence/round-07/reloaded-parker-0062-0.png), [settings](evidence/round-07/reloaded-parker-0032-0.png)

**Recommendation:** keep the first menu focused on Play/Continue, Packs and Settings, with theme art supplying character. Every keyboard/controller focus state should have a shape and contrast change, not only a color change. Provide an in-context picture preview for visual settings. Add our own reduced-effects and readable-HUD options; their presence in Reloaded has not been established. Keep decorative scanlines and glow adjustable so they cannot erase fine paths or small text.

## The moving cut is the principal visual instrument

The recorded playfield is roughly twice as wide as it is tall, under a thin HUD strip. At 1280×720 capture size, the normal player core is only approximately 12–18 pixels across, with glow and sparse spark particles extending farther. An active cut is roughly one small terrain-cell width. Larger diamond enemies are visibly broader. These are approximate rendered sizes, not measured collision boxes or source sprite dimensions.

During the **0:11** Pack 6 sample, the player's yellow core sits at the leading end of a bright vertical cut. Older trail sections cool toward cyan, while the head stays warm. The faint local grid helps place turns. Once a route is secured, the loud active line gives way to a thin cyan contour and the newly revealed image. The [Round 06 capture pair](round-06-reloaded-observations.md#one-board-two-different-capture-outcomes) shows that handoff. [Active cut](evidence/round-07/reloaded-pack6-0011-0.png)

Enemy trails show recent movement direction, while local impact bursts identify collisions and erased territory. This makes a tiny actor legible through motion and contrast. The bright leading point is more useful to steering than a large decorative character alone. The footage does not reveal steering latency, input buffering, analog thresholds or touch fairness.

**Recommendation:** preserve a bright, unambiguous player center, directional motion particles, a distinct unfinished trail and a calmer completed frontier in every theme. Draw critical paths and warning boundaries above detailed props. Separate a character's decorative silhouette, glow and shadow from its gameplay footprint, and make that footprint understandable. A detailed drone or Coupa mascot should retain the same routing clarity as its compact icon version. Avoid covering the head or the next turn with exhaust, confetti, sparks or a prop's roof.

## The timer is not automatically a failure deadline

Foreseen's **3:00** red-moon board shows TIME 00:00, three lives and 55/80. At **3:30**, the same board remains playable, with one life, a new active cut and 75/80. The later cat board also continues at zero; at **6:00**, its result awards completion but leaves the 90-second condition unearned. This directly establishes that reaching zero does not automatically end these runs. [Zero-time play](evidence/round-07/reloaded-foreseen-180.png), [continued progress](evidence/round-07/reloaded-foreseen-210.png), [later completion without the speed medal](evidence/round-07/reloaded-foreseen-360.png)

The HUD groups lives, coverage, score and time in a stable order. Coverage has both a segmented bar and a current/target fraction, so progress is readable without translating a bar length into the quota.

**Recommendation:** label a speed-medal countdown as a medal opportunity. When it expires, change its state without implying the mission has failed. If a future challenge has a genuine failure timer, distinguish it explicitly. Keep current/target coverage prominent, with honest achieved coverage separate from the full-picture reward. On phones, reflow the HUD into two short rows while preserving its reading order and visible playfield.

## Life loss gives feedback without discarding the whole run

The new Foreseen sequence isolates a failed cut:

| Video time | Observed state |
|---|---|
| **2:28.1** | Player and pink field enemy converge near the end of an unfinished L-shaped cut. Five lives; 29/80; score 1,248. |
| **2:28.2** | Lives become four. The active L-cut disappears, and a local orange/red impact effect starts. |
| **2:28.5–2:29.0** | Red square particles spread around a growing skull at the collision location. Existing revealed geometry, coverage and score persist. Enemies continue moving. |
| **2:29.4** | Player reappears near the bottom center with a gold spawn effect, approximately 1.2 seconds after the life-loss sample. |
| **2:29.8–2:30.0** | The spawn effect clears and the avatar is again visible on the border; a later sample shows movement. The timer has continued counting down. |

[Before collision](evidence/round-07/reloaded-foreseen-0148-1.png), [life loss and removed trail](evidence/round-07/reloaded-foreseen-0148-2.png), [particle ring](evidence/round-07/reloaded-foreseen-0148-5.png), [skull](evidence/round-07/reloaded-foreseen-0149-0.png), [respawn](evidence/round-07/reloaded-foreseen-0149-4.png)

The selected contact occurs near the avatar; it does not isolate a remote enemy strike far along a trail or prove a traveling strike pulse. Reappearance time also does not measure the exact instant controls resume, or any invulnerability period. Rings briefly appearing around other enemies must not be mistaken for newly identified enemy classes.

The official trailer's defeat screen has a large red skull, the level number and direct Menu/Restart actions. The cut immediately before it belongs to an edited montage, so no continuous restart latency is claimed. [Defeat layout](evidence/round-07/reloaded-trailer-0020-0.png)

**Recommendation:** clearly remove the failed trail, retain earned territory where the rules allow, mark the failure location and show the respawn location as two different events. Keep the camera stable through failure. Offer a direct restart on full defeat and a clear retry shortcut, while protecting against accidental activation during play. The approximately one-second recovery beat is a useful reference to test; it is not proof that this timing is optimal for our controls.

## Victory is a sequence of distinct rewards

Pack 6's closer samples give the following approximate cadence:

| Video time | Presentation beat |
|---|---|
| **2:33.0 → 2:33.5** | Last cut closes and coverage changes from 67/70 to 70/70. |
| **2:34.5** | Covered regions turn translucent blue while the HUD fades; the background becomes the focal image. |
| **2:35.0 → 2:38.0** | The complete picture is unobstructed and expands toward the screen edges. |
| **2:38.5** | Results crossfade over the picture, including the first awarded star. |
| **2:39.5 → 2:40.5** | Further stars arrive with a large transient star shape and glow, then settle into the three positions. |
| **2:41.5 → 2:45.0** | The score counts upward. Captions explain stages such as lives saved and seconds remaining. |
| **By 2:45.5** | Final 9,833 score, new-high-score banner and Menu/Restart/Play Next controls are visible together. |

[Quota reached](evidence/round-07/reloaded-pack6-0153-5.png), [board fade](evidence/round-07/reloaded-pack6-0154-5.png), [picture presentation](evidence/round-07/reloaded-pack6-0155-0.png), [results crossfade](evidence/round-07/reloaded-pack6-0158-5.png), [star arrival](evidence/round-07/reloaded-pack6-0159-5.png), [settled stars](evidence/round-07/reloaded-pack6-0160-5.png), [lives bonus caption](evidence/round-07/reloaded-pack6-0163-0.png), [time bonus caption](evidence/round-07/reloaded-pack6-0164-0.png), [final actions](evidence/round-07/reloaded-pack6-0165-5.png)

This recorded sequence takes roughly **12 seconds from the observed quota frame to visible final actions**. It does not prove that the sequence cannot be skipped. Some text briefly fragments in sampled frames; this audit does not establish whether every such dropout is an intended effect or a recording/decoding artifact. No recommendation depends on copying it.

**Recommendation:** retain the ordering—earned territory, complete artwork, medals, understandable bonuses, next action. Give the first clear a generous picture moment, then let repeat players advance quickly. Candidate timings for our own prototype are 0.25–0.5 seconds for capture emphasis, 1.5–2.5 seconds for first-clear picture appreciation, 0.2–0.35 seconds between medal arrivals and 0.6–1.0 seconds for score tallying. These are proposed values to test, not Reloaded measurements. Make final actions available early and allow a deliberate input to finish the animation without accidentally starting another run. Reduced-effects mode should preserve the information while removing large zooms and particle bursts.

## Support compact tiles and detailed props without changing the reading rules

Reloaded's compact repeated terrain patterns are particularly good at describing narrow corridors. Our richer art can add recognizable places and objects while preserving that clarity. A theme should support all three presentation approaches:

| Approach | Best use | Required visual discipline |
|---|---|---|
| **Compact repeated tiles** | Dense late-game patterns, small screens, puzzle-like motifs | Crisp cell rhythm, recognizable terrain symbols and connected boundary strokes. Detail must survive at normal play size. |
| **Detailed props** | Showcase missions, wide boards, strong scene identity | Props sit on legible terrain footprints. Decoration never implies a traversable gap where collision blocks movement, or hides a real gap. |
| **Hybrid** | Recommended default: compact functional terrain plus selected memorable props | The same route, danger mask and ownership contour remain readable when props are enabled or disabled. Preserve space around the active player and cut. |

For the FPV theme, compact barriers and interference symbols can share gameplay roles with more detailed fortifications, equipment silhouettes and landscape props. Ukrainian cultural packs can pair woven or carved tile motifs with gates, woodland and village details. Retro packs can use bright arcade tiles with cassette-era kiosks or neon machinery. Coupa packs can pair ledger-like cells and risk symbols with original stylized office or platform props. These are fictional visual mappings; they do not add mechanics merely because an object looks functional.

Keep a common hierarchy across all four families: **player and live cut first; imminent hazards and traversable boundaries second; collectible/status cues third; revealed artwork and atmosphere behind them**. Theme changes may alter texture, silhouette, palette and reward pictures, while danger remains identifiable by shape and behavior as well as color. A beautiful revealed background is not a promise of safety: the already verified exposed-ground and contour enemies still matter.

## Review criteria for the next concept iteration

Before implementation, compare a compact and detailed/hybrid rendering of the same board on desktop and phone. A reviewer should be able to locate the player, identify the unfinished trail, read the quota, distinguish a wall from a slowdown field, find the next legal turn and understand a failed cut without a text explanation. Show one gallery/preview flow, one local capture, one death/respawn and one complete victory sequence with original theme art. Include the fast-repeat and reduced-effects variants so polish does not become waiting or visual obstruction.

No game code, prompts, skills or production assets were edited in this audit. Restart input timing, real controller/touch responsiveness, audio design, exact particle budgets and actual player engagement remain to be tested in our own prototype.
