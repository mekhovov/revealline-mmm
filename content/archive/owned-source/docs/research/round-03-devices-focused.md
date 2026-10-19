# Round 03 — one device contract, four visual families

Status: focused design proposal; no game, controls, accessibility measurements or hardware benchmarks have been implemented. Builds on [round-02 device research](round-02-devices.md). The four families are now the main Ukrainian FPV war theme, Ukrainian culture/history, 1980s/1990s nostalgia, and Coupa BSM + AI.

## Recommended responsive contract

The **entire provisional 4:3 game board remains visible and geometrically identical** within a given challenge. No scrolling camera, responsive enemy count, stretched cells, or changed movement speed. The HUD, controls, shell and intermission layout adapt around it. Alternate tall or panoramic boards, if adopted, are distinct challenge variants.

| Context | Layout contract |
| --- | --- |
| Portrait / narrow window | Compact HUD → full board → one-line objective → dedicated thumb-control deck. Tactical module choices and artwork inspection use separate intermission screens. |
| Wide touch screen | Compact HUD above a centered board; movement control to one side, any required action to the other. Controls stay outside the arena. Respect device insets and support mirrored controls. |
| Tablet | Same full board and thumb controls; larger intermission layout can place album, module and route context beside it. Do not put exclusive threat information here. |
| Keyboard/gamepad | Full board plus compact HUD; no touch deck unless requested. Offer the same settings, menu actions, album inspection and retry through the active device. |
| TV | Same board and content, larger text and focus indicators chosen for viewing distance. Do not spend extra pixels on tiny additional HUD statistics. |

All screen decisions use **actual usable size and current input**, not a device-name lookup. A tablet window can be narrow; an iPhone can have a controller. Rotating or resizing should preserve the run; pause and clear held-input state while rebuilding an unstable layout.

Representative layout fixtures: 320×568, 375×667, 390×844 and 430×932 CSS pixels for portrait; 667×375 and 844×390 for landscape; 768×1024 and 1024×768 for tablets; 1280×720 and 1440×900 for browser/laptop. These are indicative test rectangles, not claims about current model specifications. Test Steam Deck at its actual 1280×800 output, as well as a TV at 1080p. Native points, CSS pixels and physical pixels are not interchangeable.

### Smallest proposed viable composition

Use **320×480 CSS pixels of usable content area after browser/system/safe-area insets** as a compact layout hypothesis:

| Component | Proposed allocation |
| --- | --- |
| Outer padding | 12px on all sides |
| Header | 44px high: lives, capture progress and a 44px pause target |
| Gap | 8px |
| Full board | 296×222px, provisional 4:3 |
| Gap | 8px |
| Objective | 20px high; short current goal only |
| Gap | 8px |
| Control row | 132px high: four-way movement pad; one large action if final mechanics need it |

Total height is 466px. This leaves 14px spare within the proposed usable area. Each direction of a 3×3-style 132px pad can have a 44px target; the unused corner regions can assist forgiving directional selection, subject to testing. The optional action can be 56–64px and separated from the pad. Control targets do not imply that the in-board drone must be 44px wide: the drone is controlled indirectly.

This arithmetic proves only that rectangles fit. It does not prove legibility, comfort, adequate threat reaction time or correct touch hit regions. At this size, omit nonessential shell ornament and extra score statistics. Keep body text in a readable font; use pixel lettering for short titles. If enlarged text no longer fits a single objective line, move detail to pause/intermission and retain an understandable short objective during play. Do not shrink the control deck to protect decorative trim.

Apple recommends 44×44 pt for frequent game touch controls, safe placement and visible feedback. A 44 CSS-pixel proposal is our web design target; verify its real physical comfort. [Apple game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls).

## Four shells, one interaction model

| Family | Distinctive shell | Portrait personality | Larger-screen personality |
| --- | --- | --- | --- |
| **Main: Ukrainian FPV war** | Fictional field controller: matte graphite/navy, wheat-yellow status accents, restrained blue identification, small woven pull-tab | A compact field handset. Large simple drone/hostile silhouettes; calm controls; no realistic military telemetry clutter. | A signal-station frame with enough quiet space for the board. Mission planning happens between boards. |
| **Ukrainian culture/history** | Embroidered pocket atlas: warm paper, indigo or plum, culturally specific ornament in the frame | An atlas page inside a pocket console; tactile-looking corner stitching, clean inner board edge | A collector's atlas/light table; completed scenes have room for provenance, place, era and discovery captions. Keep regional motifs distinct. |
| **1980s/1990s nostalgia** | Handheld cartridge: aged ivory, charcoal plastic, colored buttons, optional translucent casing | A satisfying pocket game with cartridge-shaped pack covers and remembered hardware proportions | A restrained CRT/Amiga-style cabinet, cartridge shelf, or after-school desktop. Scanlines and curvature are independently optional. |
| **Coupa BSM + AI** | Navi console: clean cloud-blue interface, mint/cyan confirmation, calm invoice/map cards | A friendly operations handset. A short savings objective replaces military language; the main character uses verified supplied Navi/brand assets when available. | A clear operations console and client-world gallery; tactical choices become readable opportunity cards. Avoid imitating a dense business dashboard during live play. |

The Coupa console must remain a game. Small approvals tables, financial KPI tiles and chat panels would make the first screen harder to read without improving the core cut-and-reveal action. A generated Navi-like symbol is a placeholder until official source assets are verified.

## Main FPV readability critique

Observed in [round-01 art direction](../concepts/round-01-art-directions.png): the Ukrainian panel's graphite hostile drone/tank bodies sit close in value to the navy field, and several identifying details are tiny red highlights. The embroidered frame has stronger local contrast and more visual activity than some threats. At phone scale, the viewer may notice ornament before a moving enemy. The artwork is also vertically proportioned; it is not evidence that the recommended 4:3 arena fits.

Recommended revision:

1. Make the controllable drone a simple wheat/cobalt silhouette with a consistent light outline. Its directional cue must survive the smallest board. Explore roughly 14–18 displayed CSS-pixel width at the compact board as a visual hypothesis, not a finalized collision size.
2. Give enemy roles broad, different shapes and a clear warning-colored rim/accent: rotor threat, crawling boundary machine, stationary jammer. Do not rely on red eyes, miniature military labels or flag details to identify danger. Explore roughly 18–24px threat silhouettes at the smallest board; final sizes must agree with their collision geometry.
3. Give the live trail its own bright continuous treatment and safe boundaries a visibly different edge pattern. Test yellow/cyan/ivory assignments over both dark ground and bright reveal images; color names alone do not establish adequate contrast.
4. Keep the unrevealed area visually quiet. Lower grid contrast, sparse terrain marks and no decorative particles moving like enemies. Reveal artwork may contain vehicles, but inert pictured units must be clearly separated from active sprites by rendering treatment; otherwise the player cannot tell what is dangerous.
5. Put folk ornament on the outside case, pause screen and album. Use a clean inner board perimeter. This preserves Ukrainian identity while giving movement first priority.
6. Separate low-performance settings from rule difficulty. Effects can simplify without changing movement speed, threat count or score. All urgent cues must survive disabled glow, shake, sound and haptics.

## What a generated mockup can and cannot establish

A mockup can compare palette, shell character, broad silhouette choices, information hierarchy and the amount of screen given to artwork versus controls. It can help the user choose among the four families.

It cannot establish consistent pixel scale, accurate sprite dimensions, real hitboxes, valid fill geometry, touch target coordinates, native safe areas, readable text at physical size, directional latency, controller focus, accessible contrast over moving art, sustained frame timing, battery use or engine compatibility. Text, percentages and board boundaries in generated art can be inconsistent. A photorealistic phone bezel is not a device test.

The next design proof should therefore include a deliberately simple, dimensioned compact layout alongside any illustrated device presentation. Once implementation is approved, verify one real board on an older phone, with the same scene and threat silhouettes at actual size, before producing a large asset library.

Valve recommends 1280×800 for Steam Deck, readable controller-operated interfaces and text of at least 9 display pixels (12 recommended). Treat those as platform constraints, not a guarantee of comfortable gameplay. [Steamworks compatibility](https://partner.steamgames.com/doc/steamhardware/compat?l=english).
