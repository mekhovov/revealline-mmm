# Assets and configuration in the playable game

The [playground](http://127.0.0.1:8768/game/playground/) edits real game data and starts the same simulation in practice mode. Its importer accepts `xonix-playground.v1` scenarios and, through the level-import control, explicit `xonix-level.v1` levels. This is separate from the [legacy draft-pack contract](../authoring/CONTRACT.md), [media library](../authoring/media/README.md) and [motion lab](../authoring/motion-lab/README.md). Those tools retain their own formats and validators; no automatic pack compiler connects them.

## Change the appropriate data

| Data | Actual location / format | What it controls |
|---|---|---|
| Campaign | [campaign.json](../game/content/campaign.json), `xonix-campaign.v1` | Ordered explicit levels and campaign presentation |
| Level | Embedded `xonix-level.v1`; [core contract](../game/core/README.md) | Fixed 48 × 36 geometry, spawn, walls, enemies, objectives, supplies, coverage and supported rule values |
| Themes | [themes.json](../game/content/themes.json), `xonix-themes.v1` wrapper | Palette, labels, registered scene/shape choices and default body ID |
| Classes | [classes.json](../game/content/classes.json), bare recipe array | Registered ability primitive, capacity, cooldown, duration, radius and optional slow factor |
| Scenario | `xonix-playground.v1`; [validator](../game/content.mjs) | One level/theme, seed, class, steering, optional custom recipes, image overrides and presentation |
| Character presentation | [presets.json](../authoring/motion-lab/presets.json) | Body files, display dimensions, rotor anchors and animation component recipes shared by the playable renderer |

The playable theme IDs are `fpv`, `ukraine`, `retro` and `coupa`; their family labels are `fpv`, `atlas`, `retro` and `navi`. Historical prompt families such as `fpv-front` and `navi-network` are prompt-selection vocabulary, not a replacement for these runtime IDs. Start from actual exported data before changing a format.

A scenario requires `format`, `level`, `theme`, `settings` and `visualOverrides`. `settings` has `classId`, `turnPolicy` (`immediate` or `grid-center`) and a uint32 `seed`. Optional `classRecipes` carries a complete validated registry; omitted recipes use the caller's default registry. Optional `presentation` contains `style` (`microtile`, `props` or `hybrid`) and boolean `showGrid`. Current style differences are deliberately modest: compact versus decorated wall rendering, with independent grid visibility. They do not change terrain behavior or register a new shader.

Theme scenes currently accept `dawn`, `heritage`, `arcade` or `network`; actor shape selectors accept `tank`, `drone`, `radar`, `moth`, `spark`, `orb`, `cube`, `flower` or `core`. Some share the renderer's geometric fallback. Palette entries are six-digit hex colors and labels are bounded plain text. A valid new body identifier is not proof its image/rig exists; use a registered preset and inspect the loaded result.

## Eight replaceable image roles

Choose a role and local image in the playground, then **Play configuration**. The file stays local; import performs no AI styling or internet upload. Clearing an override restores the authored default.

| Role | Visible use | Current framing |
|---|---|---|
| `background` | Picture beneath the territory mask; full picture at victory | `cover` by default, or `contain` |
| `player` | Selected avatar's body image | Contained inside that body's preset dimensions; existing attachments remain |
| `enemy` | Field bouncers | Drawn into a 20 × 20 logical-pixel rectangle |
| `patrol` | Outer-border patrols | Drawn into a 20 × 20 logical-pixel rectangle |
| `boss` | Lane-boss body | Drawn into a 32 × 32 logical-pixel rectangle; warning lane stays separate |
| `objective` | Uncaptured visible objective marker | 16 × 16 logical pixels, with the separate objective cue |
| `supply` | Supply marker | 16 × 16 logical pixels |
| `wall` | Each permanent wall tile | 16 × 16 logical pixels per tile |

These pixels refer to the 768 × 576 logical canvas, before responsive scaling. Image descriptors accept `{dataUrl, name?, fit?, metadata?}`. **Only the background currently consumes `fit`.** Other object roles use the fixed framing above; their accepted `fit` field does not implement independent cropping. Nonsquare enemy/marker images can look stretched. Prepare a separately reviewed square derivative if needed; do not alter the original to hide that limitation.

`contain` keeps the whole background with unused space filled by the field color. `cover` fills the arena and can hide outer image content. The source bytes are unchanged in both cases; framing is a draw operation. There is no focal-point/protected-region crop editor in this runtime. A source with important edge content should first be compared with `contain`. The board currently uses nearest sampling for background/object images; it does not expose a per-background smooth-photo filtering option. Player sampling follows its body preset.

## Preserve sources and inspect imports

Keep the original image and its provenance. A local file is embedded as base64 in an exported scenario without re-encoding its pixels. Optional style changes use a separate derived file and record parent source, effective prompt, tool, actual dimensions and visual review through [Background Stylist](../authoring/skills/xonix-background-stylist/SKILL.md) or the [media library](../authoring/media/README.md). A scenario export is a portable local copy, not an archival provenance database or rights clearance.

The [content validator](../game/content.mjs) checks media headers before browser decoding. The [import preparation step](../game/imports.mjs) validates the entire candidate, copies accepted JSON, normalizes optional level arrays/default recipes, decodes every override and checks decoded dimensions against its header. Callers replace the active scenario only after preparation succeeds. An unreadable image must not replace the last valid configuration. A valid header alone is insufficient evidence of a usable image.

Current import limits:

| Boundary | Limit |
|---|---|
| Static image formats | PNG, JPEG or WebP; embedded base64, no remote image URL |
| Original image bytes | 4 MiB per image |
| Encoded image text | 6 MiB per image, 20 MiB combined |
| Dimensions | At most 8,192 pixels on either side and 16 million pixels per image |
| Combined decoded dimensions | At most 32 million pixels across overrides |
| Scenario file picker | 22 MiB before reading |
| Non-image JSON | 64 KiB counted text, 10,000 values, nesting depth 12, arrays up to 256 items |

Animated PNG/WebP, GIF, SVG, TGS and WEBM are not accepted as static game-role imports. Header structure, base64, dimensions and successful browser decoding are separate checks; they do not establish alpha quality, correct art, rights or a safe performance budget on every phone. Stay well below these ceilings for routine iteration. Browser session storage can reject a large otherwise-valid scenario; export it to a local file and use smaller derived artwork for a preview.

Optional metadata accepts `title`, `description`, `author`, `sourceUrl`, `license` and `rightsStatus` with bounded text; `sourceUrl` must be HTTP(S). Scenario, theme, level and image records can carry the supported metadata. Unknown descriptor fields and executable/prototype-related data are rejected. Unknown rights remain unknown; a copied license string is not verification.

## Body and rig alignment

Replacing `player` keeps the chosen body's existing dimensions, rotor/wing/thruster/pulse recipe and anchors. Anchors are normalized around the center of the actual contained source rectangle, **including transparent padding**. Different padding or proportions can move drawn propellers away from their hubs even when the image fits the box. The importer warns about inherited anchors; it does not automatically infer or repair them.

Inspect the body at normal game size, turning, boosting, paused and with reduced effects. If the source needs new anchors, author a reviewed presentation preset and component recipe using [Animation Director](../authoring/skills/xonix-animation-director/SKILL.md) and the [motion lab's documented units](../authoring/motion-lab/README.md). Three blades per propeller is independent of the number of hubs. A picture, body width, blade count or cosmetic banking never changes the gameplay collider or steering policy.

## Rules and themes stay separate

The playable class registry has seven recipes using five primitives: `scan`, `stun-field`, `shield`, `slow-field` and `impact-pulse`. Bomber and Carrier share the stun primitive with different capacity; Fiber relay uses scan with signal resistance, while Impact craft recalls an unfinished cut without awarding territory. The historical ability lab's ten classes, five primitives, radio/fiber experiments and collection fixtures have a separate contract. Do not copy unsupported lab fields into the playable registry or call a decorative weapon, antenna or spool a working ability.

Class values are fictional cells/seconds for an arcade challenge, not real equipment performance. A new primitive, enemy algorithm, capture rule or loadout capability needs code, validation, contact-order decisions and meaningful tests. Supported numerical changes stay data. Class revision and the core's `loadoutHash` distinguish gameplay setups; changing the displayed body must not modify them. Preserve the authored steering policy when comparing cosmetics and test both policies when changing movement logic.

For FPV art, retain explicit Ukrainian, hostile military and neutral identity in the authoring record, with no Z markings in current concepts. Do not infer allegiance from a shared vehicle silhouette or make civilian nationality a threat role. Ukrainian culture, retro and business worlds keep their own imagery; fictional business points are not actual savings or an official Coupa claim.

## Review a configuration

Export a scenario, import it again, and play its first cut, closure, failure/recovery, objective, ability and victory where applicable. Compare before/after artwork with the same level, seed, class and steering. Check trail tiles, actor silhouettes and full-arena visibility at intended sizes. Structural validation and browser viewport frames do not prove arbitrary map solvability, human appeal or physical-device performance.

Use [development commands](development.md), [core semantics](../game/core/README.md), [replays](replays.md), [deployment](deployment.md) and [versioning](versioning.md) for code and release changes. The [implementation plan](round-10-implementation-plan.md) and [reference/import research](research/round-10-reference-and-import.md) record the current direction and evidence. [Runtime Maintainer](../authoring/skills/xonix-runtime-maintainer/SKILL.md) routes AI changes to the actual runtime; the 124 [shared prompt templates](../authoring/prompts/README.md) remain adaptable briefs, not a universal executable schema.

## Paste and inspect a complete pack

The Playground’s **Complete pack JSON** section can show the current full scenario or apply a pasted one, including embedded artwork. It uses the same validation, decoding and atomic adoption as file imports. The last valid pack remains intact when input fails, and Undo restores the whole prior pack. The editor updates selectors to identify imported/generated configurations. File inputs remain the practical path for large embedded images; an automation tool’s paste limit is separate from the game’s documented import budgets.
