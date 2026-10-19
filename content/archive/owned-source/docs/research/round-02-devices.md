# Round 02 — screens, controls and device identities

Research date: 12 September 2026. These are design proposals for discussion, not implemented or measured behavior. User steering: support all three motivations — arcade mastery, artwork discovery and tactical runs — while exploring more aesthetics and device sizes.

## Recommended direction

Use **one visible, stable board inside several responsive presentation layouts**. A provisional 4:3 board gives familiar arcade proportions while fitting phones, tablets, handhelds and desktop displays. Keep its full perimeter visible: a Xonix player needs to understand threats approaching the live trail from anywhere. Change the surrounding HUD and controls to suit the screen. Do not simply stretch a desktop screenshot onto a phone.

Combine the three replay motivations across time: choose a module or route before a board; execute precise cuts during the board; discover the finished picture and collectible details afterward. A phone should offer every mode. Larger screens can show more context simultaneously, without granting extra active-play information.

**Fairness is a design consequence, not a source claim:** adding rows, stretching cells, changing speed with rendered pixels, cropping the arena, or moving off-screen enemies changes risk and scoring. A competitive challenge must preserve board topology, enemy parameters, objectives and simulation timing across devices. If tall or panoramic boards become desirable, author them as explicit level variants with separate challenge identities and scores. Display scaling alone is fine. Separate rankings by actual assist/ruleset differences; do not assume touch and controller have equal difficulty before testing.

## Concrete screen proposals

The sizes below are representative viewport test fixtures, not a list of current hardware specifications. Browser chrome, split windows, zoom and safe-area insets change usable space. Native points, browser CSS pixels and physical display pixels are different units.

| Screen family | Layout proposal | Distinctive presentation and purpose |
| --- | --- | --- |
| Small portrait phone: 320×568 and 375×667 CSS-pixel fixtures | A compact status row, complete 4:3 board, one-line objective, then a generous control deck; pause above the board; no upgrade cards during live play | **Pocket arcade:** a virtual handheld with a patterned case. One board is a satisfying short session; tactical choices become a full-screen intermission. Controls never cover the live trail. |
| Larger portrait phone: 390×844 and 430×932 fixtures | Same hierarchy with more breathing room; larger controls and optional subtitle space; extra height can hold the current expedition module, without shrinking the board | **Collectible cartridge:** mission ends with a postcard sliding into an album. An optional one-handed control profile moves the thumb pad toward either hand. |
| Phone landscape: 667×375 and 844×390 fixtures | Complete board centered between two control rails; concise HUD above; left rail for four-way movement, right for draw/ability as selected by the final rules | **Signal handset:** vivid central screen, restrained blue/gold casing or Coupa calculator casing. Broad thumbs stay outside the arena. On the smallest landscape viewport, show fewer HUD details rather than tiny text. |
| Tablet: 768×1024, 1024×768 and resized-window fixtures | Large board; controls in lower corners; between boards, a side panel or two-page spread contains upgrades, discoveries and route context | **Collector's light table:** art feels worth keeping. Show the finished picture at a useful size, inspect original details, compare restored layers. Pencil can later help the editor; gameplay never requires it. |
| Laptop/browser: 1280×720 and 1440×900 fixtures | Board plus narrow mission rail; visible keyboard hints on demand; pause/settings navigable with keys; expanded album/editor when outside a mission | **1990s signal station:** tasteful pixel monitor frame and cartridge shelves. Space around the board provides optional narrative, not essential threat indicators hidden from smaller screens. |
| Desktop/wide: 1920×1080 and 2560×1440 fixtures | Enlarge the board to a comfortable size; align score and route information in the margins; avoid filling every gap with decoration | **Arcade cabinet:** strong typography, rich reveal art and restrained frame lighting. Optional art-first framing can replace the fictional cabinet. |
| Ultrawide: 2560×1080 fixture | Keep the canonical board centered; use remaining width for ambient art extension or quiet panels; no arena cropping or extra peripheral vision | **Panoramic diorama:** distant wheat, mountains, city windows or an album sleeve extend around the board. The extra imagery is decorative. |
| Steam Deck/PC handheld: 1280×800 display | Full board, clear top HUD, compact bottom controller prompts; hide virtual touch controls when using the gamepad; readable intermission cards | **Cartridge expedition:** quick resume, deliberate route choices, clean D-pad play. Add controller-accessible album zoom rather than microscopic detailed text. |
| TV with a connected PC/console-style device: 1920×1080 and 3840×2160 fixtures | Board dominates; large objective, lives and score; distant-view typography; all menus have unmistakable focus and controller operation | **Living-room gallery arcade:** the completed scene becomes a framed animated artwork. Optional later pass-the-controller missions could suit a shared couch session. This is a concept, not a commitment to multiplayer or native tvOS. |

### Proportions to use in the next visual mockups

- Portrait: upper status strip → complete landscape-shaped board → short objective → controls. The lower control deck is an intentional part of the nostalgic device identity, not wasted space.
- Landscape: left thumb rail → board → right action rail. Put artwork and score feedback inside the board or established HUD; no floating panels across moving enemies.
- Tablet/desktop: board → adjacent context panel; context collapses to intermission screens on phones.
- TV/Deck: board → minimal status → input prompts. Choose UI sizes for physical viewing distance, not resolution alone.

All themes should have their own shell treatment: embroidered handheld, carved folk-art frame, black-and-cyan signal station, calculator-like Coupa case, transparent-plastic Y2K handheld, or nautical chart folio. The game should still look good in a frame-free accessibility mode.

## Touch controls: compare two real candidates

**Recommended first candidate: a four-way thumb pad in a dedicated area.** It can have a floating origin inside that area, large directional sectors, a visible selected direction and subtle optional haptics. Cardinal movement matches Xonix's geometry. Test angular hysteresis to prevent a resting thumb from jittering between directions. Show the player/trail direction clearly. Whether lifting a thumb stops, continues, or changes drawing state must follow one explicit ruleset and be taught; it must not accidentally differ between devices.

**Second candidate: relative swipe steering.** A swipe in the control deck selects a cardinal direction, and a new swipe changes it. It gives the board more space and could work one-handed, but committing a turn only after a gesture threshold may feel late. Test it against the thumb pad on the same board and speed. Never advertise its precision before observing accidental turns, overshoots and failed reversals.

Avoid absolute finger-following as the baseline: a finger hides a small character, diagonal intent becomes ambiguous, and drawing an entire route can change the game from live navigation into path planning. A route-planning exploration mode could be interesting later, with its own rules and scoring. Do not silently provide it as a touch shortcut to a standard arcade challenge.

Prototype the final draw model separately: automatic drawing on leaving safety versus hold/toggle to arm a cut. Holding a second touch continuously could be tiring, especially one-handed. Offer equivalent control options where mechanics allow, and keep simultaneous-input requirements low. This decision remains open because the capture/movement rules are not yet approved.

Apple's current game-controls guidance recommends 44×44 pt for frequent touch controls, permits 28×28 pt for secondary controls, calls for visible/tactile press feedback, respects safe areas, and recommends expected controller labels and customizable keys. These are guidance inputs; our proposed primary pad is larger than a single minimum target. [Apple game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls).

## Keyboard, controller and interruptions

- Keyboard-only: arrows/WASD for cardinal movement, a clear draw/ability binding if needed, Escape to pause/back, Enter to confirm. Support remapping and persistent visible focus through title, pack selection, settings, gallery, results and editor. No hover-only explanation required to play.
- Controller: D-pad as the precision default; left stick with four-way interpretation as an option; familiar confirm/back/menu behavior; current-controller glyphs. Text entry needs an on-screen keyboard or a controller-compatible alternative.
- Input switching: detect the active input, change hints and virtual controls without changing the underlying rules. A mouse movement alone should not repeatedly steal focus from a gamepad.
- Interruptions: pause cleanly on app backgrounding, pointer cancellation or controller loss; reset held-input state; resume only after a clear ready action. Save expeditions at sensible checkpoints. Avoid continuing a dangerous cut while a browser tab is hidden.

Valve's current compatibility criteria require access to all content with default controller controls, correct glyphs and controller text entry. Deck supports 1280×800 or 1280×720; its smallest text must stay at least 9 display pixels high, with 12 recommended. Its review floor is 30 fps at 800p. We should aim higher for this precise arcade game, without presenting verification as guaranteed. [Steamworks compatibility](https://partner.steamgames.com/doc/steamhardware/compat?l=english).

The browser Gamepad API describes buttons, axes, mappings and connection state; this is not a guarantee that every controller/browser pair behaves identically. Test real pairs. [W3C Gamepad working draft](https://www.w3.org/TR/gamepad/). Browsers expose page visibility changes and throttle background work, supporting explicit pause/resume handling. [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

## Readability, scaling and accessibility

Keep game geometry and typography in separate rendering layers. Scale pixel art deliberately with nearest-neighbor filtering and stable alignment; do not force body text, instructions or dense upgrade descriptions into tiny pixel fonts. Use crisp pixel headlines and a more readable supporting font if needed. Integer art scaling gives consistent pixel widths when it fits; when it wastes too much small-screen space, compare supported intermediate scales on devices instead of claiming one universal solution. [MDN pixel-art rendering](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look).

The board's visual hierarchy must survive bright reveal art: darken or simplify the unrevealed field, provide a distinct player outline, distinguish live trail from safe boundary by pattern and shape as well as color, and keep embroidery/Petrykivka detail away from urgent small silhouettes. Make CRT, bloom, scanlines, flashes, shake and animated background intensity independent options. Essential threat information must remain with effects and sound disabled.

Apple recommends adaptive game menus, legible text, platform-appropriate interactions and accommodating camera housings/rounded corners. Its game guidance lists 17 pt default body text on iPhone/iPad; this is a useful starting reference, not a mapping to all browser CSS. [Apple designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games/).

For the browser UI, WCAG 2.2 AA's pointer target criterion is generally 24×24 CSS pixels with stated exceptions. Our game controls should be substantially more comfortable than that floor; aim at least 44×44 CSS pixels for ordinary touch actions and larger for movement. Check keyboard focus, contrast, non-color cues and reduced motion. This is a proposed accessibility direction, not a compliance claim. [WCAG target-size explanation](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [WCAG 2.2](https://www.w3.org/TR/wcag/).

For a full-bleed browser presentation, safe-area environment insets are available alongside viewport fitting. Pointer Events defines `touch-action` and pointer cancellation: scope gesture handling to gameplay controls so the rest of the interface retains ordinary browsing behavior. Test browser chrome expanding/collapsing, rotation, standalone launch and touch interruption. [WebKit safe areas](https://webkit.org/blog/7929/designing-websites-for-iphone-x/), [W3C Pointer Events](https://www.w3.org/TR/pointerevents/).

## Untested acceptance targets for a future playable proof

These are proposed benchmark gates and research questions. No implementation or device measurements exist yet.

| Area | Candidate target / measurement |
| --- | --- |
| Device baseline | Agree one older iPhone and one ordinary integrated-GPU laptop; include one actual Steam Deck and at least two controller families before claiming those experiences. Viewport screenshots cannot substitute for hardware testing. |
| Frame timing | Target stable 60 fps during normal play on the baseline devices; report frame-time distribution and worst capture bursts, not just an average. Test 20 minutes for heat/throttling before promising sustained behavior. |
| Input | Record missed turns, accidental reversals and end-to-end visible input latency for touch/D-pad/keyboard. Define the pass threshold after a short blind comparison instead of inventing a validated latency number now. |
| Touch comprehension | Players can find pause, make and close a cut, and explain how to stop/change direction without repeated coaching. Compare one-handed and two-handed profiles. |
| Small screens | Full active board visible; zero critical text truncation; player/trail/threats distinguishable over every approved image; controls stay outside system gesture zones. |
| Resize/rotation | Resize or rotate without changing the level geometry, resetting the run or carrying stale input into resumed play. Pause when layout changes would make active play unsafe. |
| Battery/memory/load | Measure cold first-play time, next-board delay, memory and battery impact with and without effects; choose budgets after real baseline data. Load only needed pack media, not the whole collection. |
| Gallery reward | After completing a picture, players can view it cleanly without HUD, inspect details with their input device, and continue a run or return to their album easily. |
| Replay | Observe voluntary retry, next-board selection and return after the art is already known; distinguish skill motivation, discovery motivation and tactical-choice motivation. Device comfort may change those results. |

## Recommended visuals for this round

1. The same Ukrainian scene in portrait phone, landscape phone, Steam Deck and laptop layouts, so adaptation is visible rather than claimed.
2. Portrait pocket-console shells in embroidered Ukrainian, transparent-plastic synthwave and Coupa calculator treatments.
3. Tablet collector album and TV gallery reward showing the finished art cleanly.
4. A separate exploratory tall-board concept marked **alternate challenge geometry**, to compare its stronger portrait image composition without implying score equivalence.

No new engine choice is necessary to explore these layouts. Their usability and performance should inform the later engine/platform proof.
