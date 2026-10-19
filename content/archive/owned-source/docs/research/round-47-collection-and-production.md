# Collection, presentation and production follow-up

Reviewed 2026-09-13 during v0.36 qualification. The frozen release and PR #12 are separate from this next source work. This note adds concrete follow-ups to the active production plan; it does not declare the complete game finished.

## Reference and platform checks

The [official XPOSED Reloaded description](https://store.playstation.com/en-us/concept/10002881) still emphasizes revealing pictures, unlocking packs, simple controls and demanding levels. Our next content should preserve that short, understandable loop. It is not evidence of exact steering timing, enemy intelligence or sound design.

I reopened two existing local reference images: [Pack 1 at 4:33](evidence/round-05/reloaded-pack1-0433.png) and [the manual at 0:50](evidence/round-05/reloaded-manual-0050.png). The board image visibly has a thin upper HUD, black concealed territory, distinct cyan wall tiles, dense blue slow-field marks and bright pink enemies with trailing particles. The manual separates slow/lethal/wall terrain and four different enemy domains. These stills support visual and role comparisons; no new continuous footage or audio was inspected. They cannot establish animation cadence or exact movement speeds.

[Valve's current compatibility guidance](https://partner.steamgames.com/doc/steamhardware/compat) requires controller access to all content without a settings detour, input-appropriate prompts and controller-operable text entry when required. It discourages a separate launcher. For Deck it recommends 1280×800 or 1280×720, adjustable readable text and aiming above its minimum character height. Our browser testing at 1280×720 is useful layout evidence, not physical Deck qualification. Keep the project's 60 fps target separate from Valve's minimum acceptance criteria.

## Observed issues and immediate source work

1. **Collection context.** The frozen browser showed `Standard · Standard` on a single-difficulty picture card. After reopening, a Sentinel picture appeared beside First Signal achievements. Give earned results one clear difficulty label and provide an explicit chapter-progress view. Looking at another chapter must not select it for the current flight, resume play or change saved/earned ownership.
2. **Production visibility.** The new source-only register exposes the incomplete matrix and missing checks. Actual keyboard filtering, an unbound slot, exact-original preview, Clear, Back and reload were exercised. Preview must remain a read-only inspection; neither a decoded PNG nor a generated file qualifies a finished map, story, character set or soundtrack.
3. **Next nine pictures.** Nine new Sentinel theme candidates were visually inspected and preserved unchanged. Ukrainian craft, retro repair/rail scenes and fictional spend-network settings extend the three existing Sentinel compositions. Bind them through exact new chapter/theme owners and validate partial reveal, full reward, Collection and recovery before advertising them as playable. They add no new routing geometry.
4. **Compact flight presentation.** A repeated game title in the flight header adds little information. In a later focused presentation pass, show useful chapter/mode context or remove the duplicate, and compare HUD/arena space against the reference. Preserve readable text, visible objectives, keyboard focus, touch safe areas and the complete arena; do not remove a warning merely to gain screen space.

## Qualification order

Finish v0.36's frozen/offline, PR/CI, published-byte and real public-browser gates first. Then integrate the source register, new themed chapter compiler and Collection correction into the next reviewed milestone. Keep per-theme pictures, layout families, shared rigs, actual animations and finished music counted independently. Continue the wider P6 content, P7 device/browser, P8 native distribution and later P9 online work under the existing plan.

The source preview currently reports 27 unique registered pictures, nine proposed layout families, 56 presentation handles sharing six rigs, one story and five synth recipes. The nine new unbound image files are a separate produced batch until their authoring adoption is recorded. No physical touch/controller or human challenge verdict is inferred from these counts.

# Input follow-up and preview qualification

The September 13 follow-up rechecked [Xbox Accessibility Guideline 107](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107) and the [simple-controls guideline](https://gameaccessibilityguidelines.com/ensure-controls-are-as-simple-as-possible-or-provide-a-simpler-alternative/). Both support retaining simple digital alternatives. The project decision remains tap-to-steer, explicit Pause/Resume, single-action menu navigation and complete keyboard alternatives to pointer actions. These recommendations do not establish XPOSED's exact timings.

Actual historical-browser comparison found v0.33's ready briefing excludes the visible header from keyboard focus scope; its title-menu Collection entry works. That scope was already corrected in v0.34, and the correction remains in v0.36/current source. Native v0.34 Collection activation from the header passed during archive preparation. Preserve the historical release rather than applying its defect to the current plan.

The first v0.37 development build used `0.37.0-preview`, accepted by the generic build-label validator but refused by the external chapter profile-channel contract. Its launch evidence is retained. Game previews that use this chapter store must currently use the supported numeric version format or the ordinary source-development channel. A build alone is not a successful game launch; verify the actual title before claiming a playable preview.

## Touch presentation follow-up

Reviewed 2026-09-14: [Apple's WWDC26 touch-game session](https://developer.apple.com/videos/play/wwdc2026/358/) recommends adapting controls to the available actions, meaningful action icons, large touch regions and visible press feedback. Its examples remove unavailable actions and respect device safe areas. This review read the published transcript; it did not inspect or listen to the full video.

For RevealLine, retain the complete arena and separate touch control space. Hide the steering pad when touch is not the active input, while keeping touch reachable when a controller disconnects. Arcade's automatic pickups must not produce manual Scan/Supply/Boost buttons. Tactical may expose only its authored available actions, with the correct role icon and clear cooldown/effect state. Do not transplant the session's analog sprint example: automatic speed changes would violate our authored Arcade rules. Test switching devices while paused, after returning from Settings, and during recovery; no switch may resume flight or create a stale direction.

The three new Fracture illustrations remain source art. Their machinery is scenery, not a collision or behavior declaration. The current candidate's status and actual three-opening-mission browser results are recorded in [the production plan](../production-plan.md); this note's earlier counts remain the historical pre-adoption snapshot.
