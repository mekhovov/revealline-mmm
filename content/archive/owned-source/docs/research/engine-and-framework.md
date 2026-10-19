# Engine and configurable game framework research

Research date: 12 September 2026. This is a design proposal, not an implementation or a benchmark. Official documentation and project-maintainer sources were consulted. Recommendations and architecture below are our engineering judgments, distinguished from verified platform facts.

## Recommendation to discuss

**Provisional first choice: Phaser 4 + TypeScript for the game, with a browser-based content editor built using familiar frontend tools.** Start with browser distribution, preserve iPhone and desktop packaging paths, and test a real iPhone early. Use Capacitor for an App Store build and Electron for Windows/macOS/Linux builds if those releases are confirmed.

This fits this particular combination: a lightweight 2D territory-capture game, frontend engineers maintaining it, externally replaceable content, and fast browser play. Phaser explicitly supports JavaScript/TypeScript, desktop/mobile browsers, and third-party packaging for iOS and Steam. Its input system handles keyboard, touch, mouse and gamepads. [Phaser overview](https://docs.phaser.io/phaser/getting-started/what-is-phaser), [input documentation](https://docs.phaser.io/phaser/concepts/input).

The current official release list shows **Phaser 4.2.1, released 9 July 2026**. A new project should evaluate current Phaser 4 rather than assuming Phaser 3 is the latest. Phaser 4 replaced its WebGL renderer, so older custom-shader and pipeline plugins need explicit compatibility checks. Do not choose a version until the small performance and packaging proof is run. [Official releases](https://phaser.io/download/phaser4), [Phaser 3 versus 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4).

Choose **Godot with GDScript** instead if a full visual game editor and native desktop/mobile releases become more important than frontend-language familiarity and instant browser distribution. Choose **GDevelop** if visual event authoring by non-programmers is the dominant requirement. Construct is another credible visual-authoring choice, particularly when its commercial tooling and Steam integration justify a subscription.

## Comparison against this brief

| Option | Verified capabilities | Fit and tradeoff for this game |
|---|---|---|
| Phaser + TypeScript | 2D web framework, JS/TS; separate visual editor; input and asset-loading APIs; third-party app wrappers | Best fit for frontend maintainers and a custom pack/editor product. We own game architecture and authoring UX. Native packaging and storefront services remain separate work. |
| Godot + GDScript | Integrated editor; 2D engine; desktop/mobile/web export; MIT license | Strong alternative for a native game studio workflow. Adds Godot-specific concepts and a new language. Browser has more constraints than its native exports. |
| GDevelop | Open-source engine; visual events; optional JavaScript; web, desktop, Android and iOS publishing paths | Strongest route when non-programmers must change event logic themselves. Our custom territory kernel and pack format still need deliberate engineering; export services have plan distinctions. |
| Construct 3 | Browser-based tooling; HTML5, mobile via Cordova, desktop wrappers; Steamworks plugin | Practical visual-authoring route with commercial licensing. More dependence on vendor project/runtime/editor conventions than a TypeScript application. |

Sources: [Phaser](https://docs.phaser.io/phaser/getting-started/what-is-phaser), [Phaser Editor](https://docs.phaser.io/phaser-editor), [Godot features](https://docs.godotengine.org/en/stable/about/list_of_features.html), [Godot license](https://godotengine.org/license/), [GDevelop publishing and plans](https://gdevelop.io/game-makers), [GDevelop JavaScript API](https://docs.gdevelop.io/), [Construct exports](https://www.construct.net/en/make-games/manuals/construct-3/overview/publishing-projects), [Construct licensing](https://www.construct.net/en/make-games/buy-construct).

No reliable performance comparison can be inferred from engine marketing. All four can plausibly support this 2D design; target-device measurements must settle minimum requirements, memory, battery impact and input latency.

## Godogen: relevant, but a different decision

The exact linked repository is an **AI game-generation workflow**, not a runtime engine. Its current README describes publishing a new game repository for one of three engines: Godot, Bevy or Babylon.js, with Claude Code or Codex. The Godot path uses C#/.NET, Bevy uses Rust, and Babylon.js uses TypeScript/Vite. It also orchestrates asset generation and inspects a running game or recording. Its prerequisites include external API keys; its unattended rendering/capture workflow can benefit from a GPU server. [Godogen repository](https://github.com/htdt/godogen).

The critical mismatch: **Godot 4 C# projects currently cannot export to the web.** The linked generator's default Godot path therefore does not satisfy the browser requirement as described. Godot itself remains viable through GDScript; changing the generator's language/workflow would be extra work. Its Babylon.js path uses familiar TypeScript but is not the most direct match for this 2D brief. [Godot web-export limitations](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).

We can borrow the useful workflow—short spec, build, run, inspect, iterate—without adopting its engine choice or depending on its asset services. AI generation does not replace maintainable architecture, coherent art direction, source asset ownership, human playtesting or device validation. No generator was installed or executed during this research.

## Platform reality

| Delivery target | Proposed route | Work that remains |
|---|---|---|
| Desktop browser | Phaser build on HTTPS static hosting | Loading/caching, audio unlock, keyboard-only menus, saves and browser QA |
| iPhone browser | Responsive web game; optional installable PWA | Safari testing, touch controls, safe areas, rotation, resume behavior and persistent-save handling |
| iPhone App Store | Capacitor iOS project containing the web game | Xcode, signing, native lifecycle integration, store assets and review |
| Windows/macOS/Linux | Electron package | Installers, updates, platform signing requirements, memory measurements |
| Steam | Desktop packages uploaded through Steamworks | Store release work; optional achievements/cloud/controller integration; Steam Deck testing |

Capacitor's official games page explicitly discusses HTML5 games, including Phaser. Current iOS documentation uses WKWebView, supports iOS 15+, and requires Xcode 26+. Electron embeds Chromium and Node.js and produces desktop apps from web technologies; that embedded runtime adds a footprint we should measure. [Capacitor games](https://capacitorjs.com/docs/guides/games), [Capacitor iOS](https://capacitorjs.com/docs/ios), [Electron introduction](https://www.electronjs.org/docs/latest/).

Publishing a web game on Steam with Electron is a demonstrated path documented by Phaser. Steam-specific features need additional integration: for example, the third-party `steamworks.js` bridge targets Electron/NW.js. Its native binaries and compatibility become dependencies we must maintain, rather than assuming Phaser provides Steamworks. Construct's official Steamworks plugin exposes a defined subset of services and supports specified desktop exporters. [Phaser Steam article](https://phaser.io/news/2025/03/publishing-web-games-on-steam-with-electron), [steamworks.js repository](https://github.com/ceifa/steamworks.js), [Construct Steamworks plugin](https://www.construct.net/en/make-games/addons/1105/steamworks/documentation).

Godot's browser export requires WebAssembly and WebGL 2 using its Compatibility renderer. Single-threaded export is the default and improves macOS/iOS compatibility; native mobile exports perform better. Its web audio sample mode has effect limitations. Godot iOS export requires macOS and Xcode too. An engine does not eliminate Apple's toolchain. [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html), [Godot iOS export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_ios.html).

For budgeting, Apple lists its standard Developer Program at USD 99 per membership year (or local currency), and Valve lists a USD 100 Steam Direct fee per app, recoupable after USD 1,000 adjusted gross revenue. These are publishing costs, separate from engine licenses, hardware and development. Recheck at release. [Apple membership](https://developer.apple.com/programs/whats-included/), [Steam Direct fee](https://partner.steamgames.com/doc/gettingstarted/appfee).

## The flexible framework: the practical promise

**New themes, art, image collections, levels, challenges, balance changes and combinations of supported behaviors can be authored without changing the game kernel. Truly new behavior primitives require a small code extension.** Promising arbitrary future mechanics with zero code would mean building a general-purpose programming environment, increasing maintenance rather than reducing it.

Separate the system into five parts:

1. **Game simulation.** An engine-independent TypeScript module owns grid occupancy, safe ground, open trails, enemy movement, collisions, capture completion, scoring and seeded randomness. Use explicit tick timing and deterministic rules. A general rigid-body physics engine is unnecessary for grid territory capture.
2. **Presentation.** Phaser draws the board, reveal mask, sprites, particles, lighting and animation; an audio layer reacts to simulation events. The renderer reads state but does not decide which cells were captured.
3. **Content packs.** Versioned, validated data defines themes, images, levels, progression, parameters and combinations of registered behaviors. Packs use semantic roles, so `player`, `hazard`, `safeBoundary`, `captureBurst`, `dangerMusic` are replaceable without theme-specific branches in the simulation.
4. **Authoring tools.** A browser editor imports assets, paints levels, edits objectives and schedules, tunes parameters, generates seeded levels and previews the real runtime. Same schema and validation as the shipped game.
5. **Platform adapters.** Saves, downloadable content, haptics, purchases, achievements, cloud services and device lifecycle hooks sit behind interfaces. The browser game remains functional when a platform service is absent.

This architecture is a proposal, not a built-in Phaser feature. Phaser does provide asset loading for images, atlases, sprite sheets, audio, fonts, JSON and asset packs, including loading after startup. [Phaser loader](https://docs.phaser.io/phaser/concepts/loader).

### Content that should be editable

| Artifact | Content |
|---|---|
| Theme | Palette, typography, sprites/animations, boundaries, reveal material, effects, UI style, soundtrack/stems, sound cues, language and marketing art references |
| Image collection | Reveal image, thumbnail, crop/focal point, attribution/license metadata, accessibility description, optional visual layers and unlock metadata |
| Ruleset | Required capture percentage, speed, open-trail rules, lives, timer, capture-area selection, scoring, power-up pool and supported behavior parameters |
| Level | Board shape, preclaimed cells, obstacles, spawns, routes, timed events, image, objectives and overrides |
| Campaign/challenge pack | Level order, unlock criteria, medals, daily seeds, difficulty curve, rewards and compatible rulesets |
| Behavior recipe | Supported movement/attack primitives combined with bounded conditions, durations, targets and parameters |
| Package manifest | Stable ID, version, schema version, compatible runtime version, dependencies, content hashes, locales and asset budgets |

The Ukrainian FPV theme and the Coupa/Navi theme should be two configurations of these roles. A jammer can map to a budget-draining anomaly; a restored image can map to a revealed savings opportunity. If the Coupa version needs fundamentally different money-economy logic, give it a different ruleset rather than disguising extra mechanics as art.

Keep content packs as data and media, not arbitrary downloaded JavaScript. Require declared behavior IDs and schema validation; preserve last-known-good versions. This supports understandable editing, stable saves, compatible updates and predictable review of changes.

### Editor scope and build order

Start with a small editor focused on this game: image import/crop, palette and sprite-role assignment, board painting, enemy placement, objective sliders, preview/restart, undo/redo, validation, and import/export of a pack. Add seeded generation with explicit constraints and playable previews. A generator must reject invalid maps; it cannot guarantee fun without playtests.

Phaser Editor can accelerate menus and authored scenes; it exposes readable Phaser code. Tiled offers tile layers, objects and custom properties, making it useful if map editing grows complex. Neither automatically supplies this game's reveal-mask, danger, image-pack and challenge-authoring workflow. Evaluate these as supporting tools, not substitutes for the small domain editor. [Phaser Editor](https://docs.phaser.io/phaser-editor), [Tiled introduction](https://doc.mapeditor.org/en/stable/manual/introduction/).

## Validation before committing to an engine

After the visual/gameplay direction is agreed, build one narrow technical proof containing one board, one reveal image, one enemy, one capture effect and all three control schemes. Package this same content for browser and iPhone before producing a full asset library or broad framework.

Acceptance targets to agree with the user (proposals, not measured results):

- Stable 60 FPS on an agreed older iPhone and an integrated-GPU laptop; defined reduced-effects mode if needed.
- Prompt local input response and consistent movement at 30/60/120 Hz displays.
- Clear board and readable controls on phone; keyboard and controller navigation across all menus.
- A modest initial download, with image/music packs loaded on demand; explicit texture-memory limits.
- Same recorded seed/input sequence produces the same capture results; save/reload and suspend/resume preserve valid state.
- Hot-swapping the Ukrainian and Coupa theme changes all intended art/audio/UI without editing the simulation.
- Editor-generated packs run in the shipped runtime, and corrupt/incompatible packs fail with actionable errors.

Meaningful simulation tests should cover connected-region capture around multiple enemies, self-intersecting trails, simultaneous collisions/capture, corner contacts, unfillable islands, initial safe cells, pause/resume, and generated-map reachability. Include real-device visual/input/audio checks; compile success alone is insufficient.

Decision gate: keep Phaser if this proof meets the device budget and content-authoring goals. Prefer Godot/GDScript if native delivery, richer editor tooling or measured runtime behavior outweigh frontend familiarity. Prefer GDevelop/Construct if authoring arbitrary event logic visually is more valuable than owning a conventional TypeScript codebase.

## Risks and decision reversal conditions

An adversarial review leaves Phaser as the provisional recommendation but **does not establish that its wrappers satisfy the low-end requirement**. The target device floor and resource budgets remain undefined.

- **Desktop footprint is a real tradeoff.** Electron bundles Chromium/Node; a very small pixel-art game still carries that runtime. Treat it as a convenient distribution candidate, not a lightweight-native promise. If installer size, idle memory, startup time or battery use miss the agreed budget even with a minimal game, reassess the desktop shell or choose a native engine. Browser-first remains useful independently. Electron's maintainers explicitly call for profiling memory, CPU and disk use; no fixed overhead or FPS estimate is established here. [Electron architecture](https://www.electronjs.org/docs/latest/), [performance guidance](https://www.electronjs.org/docs/latest/tutorial/performance).
- **Capacitor does not convert the renderer into native game code.** Its WKWebView route preserves web-runtime constraints. Test reveal effects, input, sustained play and resume behavior in the actual packaged app. If those fail on the agreed oldest iPhone after targeted optimization, compare a Godot native proof before committing. Current Capacitor's iOS 15 minimum also excludes older operating systems; choose the supported device floor explicitly. [Capacitor iOS](https://capacitorjs.com/docs/ios).
- **Development and publishing requirements differ from player requirements.** Browser development can use ordinary frontend tools, but iOS publication still needs a supported Mac/Xcode setup or equivalent build access. Avoid claiming every distribution target needs no specialist knowledge or equipment.
- **Phaser 4 ecosystem compatibility is unproven for our selected effects.** If an essential shader/editor/plugin is unsupported, use an engine-native solution, change that effect or compare engines; do not silently depend on Phaser 3 examples. The important choice is the supported feature set, not the newest version number.
- **Custom editor scope can reverse the recommendation.** If users must create entirely new rules through visual events from day one, evaluate GDevelop/Construct before constructing an elaborate rule language. A configurable set of known mechanics is a much smaller product.
- **A native engine is not a universal browser cure.** Godot/GDScript is worth comparing for native runtime goals; its web export has its own restrictions. A switch must meet both browser and native acceptance criteria.

Primary-source recheck: the individual [Phaser v4.2.1 release page](https://phaser.io/download/release/v4.2.1) independently confirms 9 July 2026. Godogen's actual engine guides—not only its README—specify [Godot 4 .NET/C#](https://github.com/htdt/godogen/blob/master/engines/godot.md), [Babylon.js/Vite/TypeScript](https://github.com/htdt/godogen/blob/master/engines/babylon.md), and [Bevy/Rust](https://github.com/htdt/godogen/blob/master/engines/bevy.md). Godot's [current web-export page](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) still states that Godot 4 C# cannot export to web. No runtime benchmarks, installs or implementation were performed.
