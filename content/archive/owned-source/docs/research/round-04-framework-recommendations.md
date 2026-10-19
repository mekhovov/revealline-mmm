# Round 04 — a framework that can carry every approved theme

Research checked: 12 September 2026. This document proposes architecture and validation work; it does not claim that a game runtime, content editor, platform build or performance proof exists. It extends [the engine comparison](engine-and-framework.md) and [the four-family direction](../round-03-focused-direction.md).

**Recommendation: retain Phaser 4 + TypeScript provisionally, with a small territory-capture simulation and a content compiler that separates appearance from rules.** The key is to make the editable product a collection of game-specific content packs, not an unrestricted second game engine. Every approved visual family can use pixel characters over pixel, painted, photographic, ceramic, paper, vector-derived or layered reveal art. Goals and supported behavior combinations remain separately editable.

## What current Phaser supplies, and what we must build

Phaser supplies asset queues, image/atlas/Aseprite/audio loading, texture management, rendering, filters, scenes, pointer/keyboard/gamepad input and canvas scaling. Its asset-pack format is a convenient description of files to load. It is not a complete theme, campaign, objective, save-migration or image-authoring framework. [Loader](https://docs.phaser.io/phaser/concepts/loader), [Phaser Editor asset packs](https://docs.phaser.io/phaser-editor/v4/asset-pack-editor/intro), [input](https://docs.phaser.io/phaser/concepts/input).

We would build the territory simulation, deterministic objective evaluators, semantic asset binding, content validation/compiler, resource ownership, small editor, accessibility behavior, gallery/progression and platform adapters. These are our proposed responsibilities, not claims about engine features.

The official release page confirms Phaser **4.2.1**, dated 9 July 2026. Pin a tested version after the technical proof rather than treating an unversioned search result as an implementation contract. [Release](https://phaser.io/download/release/v4.2.1).

## Twelve engineering recommendations

### 1. Keep collision, capture and artwork in three different coordinate systems

**Proposal:** maintain an integer logical board for simulation, a fixed art-reference rectangle for image composition, and a responsive display rectangle for presentation. Explicit transforms connect them. Cropping an image, changing a sprite's pixel density or rotating the device must never change the logical board.

An invading vehicle painted into a background is scenery. A hostile moving vehicle is an entity with a behavior ID, footprint and visible role marker. A collectible painted motif becomes a gameplay objective only when the author places an explicit landmark in board coordinates. Never derive collision, capture quota or objective position from image colors at runtime.

This lets the same layout reveal a military panorama, a Petrykivka illustration, a cassette-room painting or a Coupa city without changing territory logic. It also avoids using visual GPU readback to determine gameplay. Phaser documents masks as rendering components, with no effect on physics/input. [Versioned mask component API](https://docs.phaser.io/api-documentation/4.0.0/namespace/gameobjects-components-mask).

### 2. Design the reveal around Phaser 4 filters; old BitmapMask advice is obsolete

**Verified version trap:** Phaser's conceptual Masks page still describes BitmapMask and WebGL GeometryMask behavior associated with Phaser 3. Current migration guidance says BitmapMask was removed; Phaser 4 uses a Mask filter in WebGL, while GeometryMask remains a Canvas path. Prefer current/versioned API and actual proof results. [Migration guide](https://phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know), [Phaser 4 mask component](https://docs.phaser.io/api-documentation/4.0.0/namespace/gameobjects-components-mask).

**Proposal:** compute captures in the simulation and update a low-resolution reveal texture only when captured territory changes. Keep the temporary open trail in a separate fast-changing overlay. Apply the reveal to the composed artwork layer, while player/enemies remain above it. Benchmark a shared artwork composition against separately masked layers before committing.

Phaser's Mask filter accepts a texture or a GameObject source; a GameObject source can update automatically, and internal versus external filters use different spaces. The API also exposes resolution scaling with explicit transform caveats. These capabilities need a small tested adapter, especially across resizing and context restoration. Do not promise a free Canvas fallback for a WebGL filter stack. [Mask API](https://docs.phaser.io/api-documentation/class/filters-mask), [versioned FilterList API](https://docs.phaser.io/api-documentation/4.0.0/class/gameobjects-components-filterlist).

### 3. Treat pixel art as an asset property, not a global restriction

**Verified:** texture filtering can be nearest or linear, and Phaser applies the setting to the entire texture, not individual atlas frames. Phaser 4 additionally exposes optional shader-supported smooth pixel-art interpolation. [Phaser 4 Texture API](https://docs.phaser.io/api-documentation/4.0.0/class/textures-texture).

**Proposal:** use distinct texture groups for crisp gameplay sprites, smoothly sampled reveal art, and interface text. Never pack smooth paintings and nearest-filtered characters into one atlas. The pixel overlay can retain a consistent art scale while the image beneath it has a different resolution or style.

Each art item should declare intended source density, sampling, aspect ratio, focal region and supported crops. Provide a fixed board crop plus a separate gallery view of the full original. A portrait painting should be letterboxed or receive an approved crop; it should not silently stretch or make the arena taller. Preserve the source file and create lightweight derivatives for thumbnails, gameplay and gallery views.

For strict retro packs, integer scaling is the preferred look where space permits. For awkward phone sizes, compare fractional nearest scaling with Phaser 4's smoothing option on actual pixels. Do not label every display configuration “pixel-perfect” before testing it.

### 4. Keep the whole board visible and let the interface reflow

Phaser's FIT mode preserves aspect ratio; RESIZE changes canvas size, while ENVELOP can extend beyond the target area. Those are rendering/layout tools, not a responsive game design. [Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager).

**Proposal:** keep the provisional 4:3 arena stable; arrange its containing region independently from menus and controls. Portrait phone: board over thumb deck. Landscape phone: board between control rails. Tablet/desktop: optional surrounding context. Ultrawide: extended background shell. The complete active perimeter and every gameplay hazard remain visible.

Use a small presentation layout service, with frontend DOM/CSS suitable for menus, authoring and galleries. It must explicitly coordinate controller focus and pause state with the canvas. Keep frame/HUD decoration removable on small screens. Rendering resolution and UI text size must be independently tunable; a crisp small sprite does not justify unreadable pixel text.

Treat a future panoramic or tall arena as a different level identity, not a resize mode. Save/replay scoring should identify board geometry. Validate safe-area handling, screen rotation, resize during an open cut and unchanged movement speed across display refresh rates.

### 5. Put semantic roles between generated art and gameplay

**Proposal:** behavior code speaks in stable roles such as player, roaming threat, perimeter threat, emitter, capturable landmark, safe boundary and open trail. Packs bind them to characters, animation tags, sounds, names, iconography and presentation recipes.

| Role | FPV main family | Ukraine Atlas | 80s–90s | Coupa/Navi |
| --- | --- | --- | --- | --- |
| Player | Ukrainian FPV quadcopter | Golden bird / stylus | Signal cursor / toy spacecraft | Approved Navi art or placeholder token |
| Roaming threat | Hostile military drone | Ink blot / thorn | Glitch sprite | Disruption cloud |
| Perimeter threat | Patrol marker | Cracking edge | Electric spark | Bottleneck token |
| Capturable emitter | Interference station | Ink source | Corrupt sector | Exception station |
| Landmark | Illustrated mission objective | Museum/cultural detail | Cartridge or cassette | Supplier/document station |
| Completed boundary | Bright signal / field marking | Stitch / wax contour | Arcade neon | Recovered connection |
| Gallery framing | Mission album | Illustrated atlas | Game/cassette library | Restored business city |

Allow body shape, sprite dimensions, palette, motion, UI frame, sound and gallery metaphor to differ. Keep collision footprints and threat markers explicit. A larger decorative rotor or glow should not secretly enlarge collision.

Animation roles need an authored fallback: for example, a static idle frame when a pack has no turn animation. A required threat silhouette or warning cue cannot simply disappear. This is our interface design, not a Phaser-provided theme system.

### 6. Compose objectives from bounded, inspectable primitives

**Proposal:** start with a small registry: capture percentage, capture marked areas, collect a count of tagged landmarks, survive a duration, finish before a timer, preserve lives and connect a supported pair/group of captured landmarks. Combine them with explicit all/any/sequence logic and bounded parameters. Preview the resulting objective as plain language.

Examples: FPV “capture enough territory and contain two interference stations”; Ukraine Atlas “reveal three marked details”; retro “finish within the timer with one large-cut medal”; Coupa “recover the three document landmarks and reconnect a supplier route.” Thresholds are content, while each evaluator is tested code.

Keep required win conditions, optional medals, expedition choices and unlock conditions separate. Separate “blocks region filling” from “triggers an effect when captured”; an emitter can be capturable without being an enemy that prevents capture. The editor should flag impossible combinations such as a required landmark permanently excluded from the board.

A truly new primitive needs a bounded extension plus an editor description. Do not put arbitrary executable expressions in downloaded packs or construct a general visual programming language before repeated real needs justify it. This limitation makes the framework maintainable.

### 7. Compile our content packs into Phaser loading instructions

**Verified:** Phaser asset packs organize loader configuration, and the loader supports more than images/audio, including script files. Asset keys enter shared caches and must be unique. [Loader](https://docs.phaser.io/phaser/concepts/loader), [asset pack editor](https://docs.phaser.io/phaser-editor/v4/asset-pack-editor/intro).

**Proposal:** the uploaded authoring pack should be our own small data/media format. A compiler resolves roles, references and derivatives and emits only supported media loader entries. Raw Phaser asset-pack JSON is an internal output, not the complete public authoring contract.

Record pack ID/version, authoring schema version, required runtime capabilities, dependencies, content hashes, attribution, locale, intended resource tier and quality fallbacks. Namespace asset and animation IDs by pack and revision. Resolve inheritance/overrides into one inspectable effective configuration so maintainers can understand why a board behaves a certain way.

Install/update as a complete revision, and switch themes at a safe scene boundary after required files are ready. An in-progress run should retain its resolved content revision. Keep save references stable through image/level renames. Runtime assets, application code and content revisions have different version lifecycles.

### 8. Budget decoded resources, not just download sizes

**Verified:** WebGL guidance recommends explicit memory estimates, smaller back buffers when needed, batching, and prompt resource release. Compressed web image file size is different from GPU texture memory. [MDN WebGL guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

**Proposal:** load a small shell, selected family essentials and one active board; use thumbnails for the rest of a collection. Prefetch at most the next likely board inside an agreed memory allowance. Put UI/common sprites in small atlases; keep large reveal images out of a collection-wide atlas so one board can unload without retaining every picture.

Arithmetic illustrates the issue: one RGBA8 2048×1536 texture is 12 MiB before possible additional copies, mipmaps or render targets. Three such layers use 36 MiB of base texture storage even when their downloads are small. A decoded two-minute stereo track at 48 kHz uses about 44 MiB of 32-bit sample data. These are estimates, not measurements of our game. [AudioBuffer format](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer).

Start the proof with one still reveal plus small ambient overlays. Profile decoded images/audio, framebuffers, peak transition memory, sustained temperature and resume behavior on the agreed oldest iPhone and an ordinary laptop. Do not set a final megabyte/FPS guarantee from marketing claims.

### 9. Make atmosphere scalable while keeping information complete

**Proposal:** each theme defines essential feedback separately from decorative effects. Essential cues include player position, safe ground, exposed trail, hazard silhouette and telegraph timing. These remain legible in low-effects, reduced-motion and muted modes.

The low-cost presentation can use a still picture, sprite animation, a small capture burst and one music mix. Enhanced tiers can add restrained ambient layers, light effects and adaptive stems. A reduced-effects profile must not alter enemy speed, reveal coverage or scoring. Reserve full-image celebration for the gallery/intermission when possible.

Phaser 4 supports filters broadly, but internal filters generally operate over smaller regions than external full-screen effects; filter cost varies and needs target-device testing. [Phaser 4 FilterList](https://docs.phaser.io/api-documentation/4.0.0/class/gameobjects-components-filterlist).

Phaser documents audio format selection, decoding and gesture-based audio unlocking. Use a clear initial interaction, independent music/effects controls and reliable pause/resume handling. Keep adaptive loops short and phase-aligned if tested; stream or separately load long gallery music when appropriate. A theme switch should not retain every previous soundtrack in decoded memory. [Audio](https://docs.phaser.io/phaser/concepts/audio).

### 10. Use Aseprite for repeatable finishing and exports

**Verified:** Aseprite supports command-line PNG/JSON export, atlas packing, layer/tag selection, padding, extrusion and trimming. Tags identify animation ranges. Phaser can import an Aseprite PNG/JSON pair and create animations from its tag metadata. [Aseprite CLI](https://www.aseprite.org/docs/cli/), [tags](https://www.aseprite.org/docs/tags/), [Phaser Aseprite importer](https://docs.phaser.io/api-documentation/class/loader-filetypes-asepritefile).

**Proposal:** retain editable source assets; use generated images as drafts/reference until the sprite grid, transparency, silhouette, pivot and animation consistency have been inspected. A visually convincing generated sprite-sheet picture is not automatically a usable atlas.

Define a small animation role vocabulary and export conventions. Preserve untrimmed logical frame size/pivot while allowing atlas trimming for storage. Avoid rotating atlas frames unless the tested importer path handles them correctly. Build reproducible exports from pinned settings, with padding/extrusion appropriate to sampling.

AI asset requests should carry role, native dimensions, palette/sampling, view angle, animation requirements, exact deliverables and real-size review fixtures. Prompts alone cannot guarantee identical characters, correct pixel grids or seamless animation; the authoring pipeline must inspect outputs before marking them ready.

### 11. Build the narrow editor first; add Tiled or LDtk only for actual map needs

| Choice | Verified strength | Recommended use here |
| --- | --- | --- |
| Small domain editor | We define the UX; nothing is supplied automatically | Primary workflow: choose family/image, crop, bind roles, paint safe/excluded cells, place landmarks/threats, select goals, tune parameters, preview, validate, export |
| Tiled | Custom properties/classes/enums and reusable object templates | Optional importer when designers need mature object placement, authored routes or tile-heavy scenery |
| LDtk | Integer grids, entity fields, automatic tile layers and separate level-file support | Optional importer if board painting and generated decorative tiling dominate authoring |
| Phaser Editor | Visual management of Phaser's asset-pack files | Supporting scene/media tool for frontend maintainers; it does not supply image-collection or territory-goal authoring |

Sources: [Tiled custom properties/types](https://doc.mapeditor.org/en/stable/manual/custom-properties/), [Tiled templates](https://doc.mapeditor.org/en/stable/manual/using-templates/), [LDtk IntGrid](https://ldtk.io/docs/general/intgrid-layers/), [LDtk entities](https://ldtk.io/docs/general/editor-components/entities/), [LDtk auto layers](https://ldtk.io/docs/general/auto-layers/), [LDtk JSON overview](https://ldtk.io/docs/game-dev/json-overview/), [Phaser Editor](https://docs.phaser.io/phaser-editor/v4/asset-pack-editor/intro).

**Proposal:** do not maintain three editors at launch. If an external editor is adopted, compile a deliberately limited subset into the same runtime board format. Keep reveal images, themes, campaigns and validation in the game-specific editor. Test import semantics such as offsets, IDs, templates and overrides; a JSON export does not guarantee equivalent game behavior.

Seeded generation belongs beside hand authoring. Generate logical terrain/objectives first, validate reachability and objective feasibility, then dress it with an image/theme. Let authors inspect and save a generated result. A repeatable seed establishes reproducibility, not enjoyment.

### 12. Make input and accessibility pack-independent capabilities

**Proposal:** keyboard, gamepad and touch translate into the same small action set. Packs provide visual button skins and optional flavor names; they do not redefine the meaning of movement, pause, confirm or cancel. Store remaps as player preferences outside content packs, and update prompts to match the active mapping.

Phaser receives pointer, keyboard and gamepad events, but menu focus, rebinding, four-way stick interpretation and cancellation of stuck input are application behavior we must provide. [Input](https://docs.phaser.io/phaser/concepts/input).

Offer clear silhouettes plus color, scalable text, reduced motion, controllable haptics, adjustable touch layouts and simple controls. Evaluate hold-versus-toggle drawing once the control model is decided. Full menus and galleries must work with the same input method used for play. Game Accessibility Guidelines specifically recommend remapping, well-spaced virtual controls and multiple cues for essential information. [Remapping](https://gameaccessibilityguidelines.com/allow-controls-to-be-remapped-reconfigured/), [guidelines](https://gameaccessibilityguidelines.com/full-list/).

Valve requires readable Deck UI and recommends adjustable text/contrast; its published minimum character height is 9 pixels at 1280×800, with 12 pixels preferred where possible. Treat that as a platform floor, not our aesthetic target. [Steam hardware compatibility](https://partner.steamgames.com/doc/steamhardware/compat?l=english).

## What “change without editing the main game” means

| Change requested | Intended workflow | Extension needed? |
| --- | --- | --- |
| Add 100 images in mixed styles | Import, derive thumbnails/board crops, add captions/unlocks, preview readability | No, if supported media formats/layer types |
| Replace FPV drone with bird or Navi character | Bind role art, pivots/animation tags, sound/UI tokens; preview hitbox | No |
| Add night, embroidered, ceramic or CRT treatment | Add a theme recipe using supported materials and effects | No |
| Change quota, enemy speed, lives or timers | Ruleset parameters and level overrides | No |
| Combine capture and landmark objectives | Select registered evaluators and composition | No |
| Add hand-painted or generated levels | Domain editor or supported map import; validate board | No |
| Add a wholly new economy or new enemy intelligence | Add a tested behavior/objective module and authoring fields | Yes, bounded module |
| Add arbitrary 3D worlds or a different core genre | Reassess product/engine scope | Outside this framework promise |

## Acceptance proof after design is ready

The first implementation proof should demonstrate the flexibility, rather than merely display four backgrounds:

1. One deterministic board/replay under all four families, including different player art, trail, hazards, music, menus and gallery framing. Identical rules produce identical capture outcomes.
2. Pixel, painted and vector-derived reveal art, with approved board crops, readable threats and a gallery that retains full-image composition.
3. One required composite goal, optional medals and one capturable emitter whose effect is distinct from fill-blocking enemies.
4. Full board on narrow portrait/landscape phones, resized desktop, 1280×800 handheld and ultrawide; rotation during an open cut does not alter simulation.
5. Keyboard-only, touch and controller play plus menus, rebinding, focus loss, pause/resume and controller disconnect.
6. Repeated board/theme changes without steadily growing resource use; late/missing assets and context restoration recover to a valid state.
7. A content revision update preserves existing gallery/saves, while in-progress runs retain their resolved rules. Browser storage can be evicted, so downloadable media caches and progress need distinct handling plus a recovery/export strategy. [Browser storage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
8. Editor-authored and generated boards pass the same validation as hand-authored examples. Invalid references, unavailable capabilities and impossible objectives produce useful author-facing messages.

No framework acceptance test above has been executed yet. They define the evidence required before scaling production of full asset families or declaring all target devices supported.
