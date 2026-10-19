# Round 04 — reusable art direction, asset production and prompt workflows

Researched 12 September 2026. This is an authoring-system recommendation and a working prompt library, not evidence that a game, sprite set or audio pack has been built.

## Recommendation

Treat each theme as a complete art direction and content package, with **separate gameplay, artwork, UI and audio contracts**. The first theme stays Ukrainian FPV military: its reveal pictures contain fictional invading Russian military forces. Culture/history, 1980s–1990s nostalgia and Coupa BSM/AI are peer families. New reveal-image styles can be added inside any family without changing the simulation.

The important distinction is between the **pixel-art game language** and the **reveal-art medium**. Crisp player silhouettes, distinct enemy roles, an unmistakable active path and a readable boundary can remain stable above pixel illustration, flat graphic art, painting or photographic imagery. Style diversity is a strength when those active layers remain distinguishable. This is a design recommendation to prove with composites and playtests, not a measured result.

The current pack contract calls pixel images `pixel-art`, vector-like/painterly images `illustration`, photographs `photograph` and scans `scanned-art`. A specific medium such as watercolor belongs in the art brief; it is not a new enum value. User-requested subjects and media override example defaults in the prompts.

The [56-prompt catalog](../../authoring/prompts/catalog.json) and [selection guide](../../authoring/prompts/README.md) cover a complete family plus the practical work of adding and revising content. No prompt is considered executed simply because it is saved. There are 32 family-specific examples and 24 shared authoring/editing/review examples.

## Research findings and practical consequences

| Verified source finding | Recommendation for this project |
| --- | --- |
| Aseprite can import a sprite sheet with explicit offset, sprite width/height and padding, and export selected layers or tagged frames. [Sprite-sheet documentation](https://www.aseprite.org/docs/sprite-sheet/) | Require deliberate frame geometry. A generated montage needs reconstruction and inspection before being sliced. |
| Aseprite tags identify animations and support forward, reverse and ping-pong playback. [Tags documentation](https://www.aseprite.org/docs/tags/) | Name neutral animation states in the contract; preserve them when replacing a theme's avatar. |
| Aseprite slices carry bounds, optional nine-slice information and a pivot; their information can be exported in JSON. [Slices documentation](https://www.aseprite.org/docs/slices/) | Use explicit pivots and stretchable UI panel metadata rather than baking all UI into one screen-sized picture. |
| Aseprite's CLI exposes batch exports, PNG/JSON sheet outputs, tag/slice metadata, palette conversion, padding and extrusion. [CLI documentation](https://www.aseprite.org/docs/cli/) | Preserve editable sources and a repeatable export recipe. Inspect the installed version before executing; choose trimming only when the consumer supports offsets. |
| Aseprite documents the timeline, frame timing and animation preview as part of animation work. [Animation documentation](https://www.aseprite.org/docs/animation/) | Timing is authored data, not something to infer from the visual spacing of an AI contact sheet. |
| Eastward's co-founder describes developing a lively world from an early pixel-art concept, with strong color direction and discovery beyond the setting's decay. [Developer account on Nintendo](https://www.nintendo.com/en-ca/whatsnew/how-the-developers-began-making-then-remaking-eastward/) | Give each family a coherent visual premise and small discoverable details. For FPV, military presence remains the active reveal subject while light, architecture and environment keep the scenes visually rich. |
| UNESCO describes Petrykivka through fantastic flowers and other natural elements rooted in local observation. [Petrykivka](https://ich.unesco.org/en/RL/petrykivka-decorative-painting-as-a-phenomenon-of-the-ukrainian-ornamental-folk-art-00893?lang=en) | Make an original contemporary botanical adaptation with references; avoid treating every floral pattern as interchangeable Ukrainian folk art. |
| UNESCO describes Kosiv ceramics' contour drawing, green/yellow coloring and figurative scenes tied to Hutsul life. [Kosiv ceramics](https://ich.unesco.org/en/RL/tradition-of-kosiv-painted-ceramics-01456?RL=01456) | A Kosiv pack should have its own cream ground, contour/material language and scenes, with a separate source trail. |
| UNESCO and the Crimean Tatar organization ALEM describe Örnek as a meaningful symbol system transmitted by practitioners. [UNESCO](https://ich.unesco.org/en/RL/ornek-a-crimean-tatar-ornament-and-knowledge-about-it-01601?RL=01601), [ALEM](https://www.ornek-crimea.com/about-ornek-en) | Give Örnek its own chapter and reference notes. Do not randomly combine symbols and then claim a documented meaning. |
| Official Coupa documentation distinguishes Navi conversational assistance and Navi Agent Studio's environment for specialized business-process agents. [Coupa glossary](https://docs.coupa.com/en/coupa-glossary/overview/c) | Let the business theme include planning, connections and helpful agents. Describe arcade effects as metaphors, keep the C-token placeholder explicit and use supplied official art when selected. |

The recommendations above are project-specific inferences from these primary sources. They are not claims that the cited tools or artists endorse the game.

## A production pipeline that can support all four families

### 1. Theme bible and a small keeper set

Start with a concise art bible: emotional premise, palette roles, reveal-art medium, player silhouette, each hazard role, UI materials, typography needs, music direction, and the shape of the collection. Generate a small comparison set, select one visual keeper, and use that image as the identity reference for controlled edits.

A named game's entire style is too vague as a reusable production specification. Translate references into observable properties: hard clustered edges, limited high-value accents, warm versus cool depth separation, sparse ambient movement, readable silhouettes, original tracker instrumentation. The family-specific prompts already do this.

### 2. Semantic presentation roles

Keep roles such as `player`, `activeTrail`, `safeBoundary`, `fillBlocker`, `optionalObjective`, `warning`, `success` and `inactiveDecoration` explicit in the visual contract. Exact identifiers belong to the framework's schema; these names express the intended division.

A hostile armored vehicle painted into FPV reveal art is background artwork. A bright moving hostile icon is a collision-bearing game entity. A stationary emitter may be capturable without blocking region fill, depending on the declared rule. The art must teach those differences with shape and behavior, not only color.

The same roles can become a golden bird and ink disturbances, a toy spacecraft and glitches, or a C-token and business-process friction. Changing skin must not silently change the role's danger, hitbox or rule behavior.

### 3. Reveal artwork and its metadata

Store the complete reveal image separately from the mask, capture boundaries, active trail, enemies, HUD and text. Give every image an asset ID, intended crop, focal anchors, sampling choice, chapter tags and gallery metadata. Preserve the uploaded original. Use normalized coordinates for crop/focal metadata so higher-resolution replacements remain traceable.

A reveal pack can have one medium or intentionally mix media. Pixel-art images use their chosen source grid; photographic and painterly images need suitable sampling and size budgets. Both are composited behind the same active game layer. Do not bake the default fog or half-finished game state into the actual reveal image.

Make separate gameplay and gallery presentations: quiet enough during play, richer when inspected after completion. Optional ambient layers can enliven the collection, but should have a static fallback and remain separate from collision data. An animated window light does not turn its building into an enemy.

### 4. Characters, states and export

Generate a character design, then a motion/state plan, then controlled keyframe studies. Fixed canvas, consistent pivot, explicit direction and a stable silhouette should precede export. Test appearance at its intended play size, not only enlarged on an art board.

Use real editable sprite sources for final cleanup and animation. Tags, frame durations and slice pivots form part of the export contract; the rendering consumer needs those fields or an explicit translation. Aseprite is a practical authoring tool for this handoff, not a requirement that every frontend engineer become a pixel artist. [Aseprite tags](https://www.aseprite.org/docs/tags/), [slices](https://www.aseprite.org/docs/slices/).

One generated sheet with twenty attractive poses is not automatically a valid atlas. Inspect cell size, empty borders, alpha, consistency, duplicate/missing frames, clipping and pivot drift. Never let an avatar's decorative shadow or rotor sparkle change its collision shape.

### 5. Menus, touch controls and typography

Author visual panel skins, icons, frame pieces and decorative art separately from live text and control layout. Nine-slice panels are an available way to reuse material edges while the panel grows. [Aseprite slices](https://www.aseprite.org/docs/slices/).

Mockups can show a field-controller shell, linen atlas, fictional software library or a friendly business console. A separate measured fixture must prove the same whole arena survives phone portrait, landscape, tablet, handheld, laptop and TV layouts. Generated device pictures are visual studies, and their shape requests need measurement. The earlier round already observed inaccurate board ratios in generated art.

Typography should cover Ukrainian glyphs and real localized strings; generated image lettering stays a placeholder. Controller focus, larger labels and touch hit areas belong to the UI implementation/layout contract. They are not guaranteed by a beautiful menu image.

### 6. Music is a separate production stream

Every family has an original soundtrack brief with a shared event mapping: leave safety, expose trail, close cut, capture objective, take hit, finish level and unlock an image. Compose foundation, tension and success stems with synchronized boundaries. Actual rendering, loop joins, dynamic range and speaker/headphone listening need audio tools and review.

The saved briefs do not create sound. The audio-execution prompt explicitly requests real audio tools when available and a concrete composer handoff otherwise. This distinction makes the workflow reusable without pretending the image generator produces music.

### 7. Content, generation and framework boundaries

Art generation prompts can author image-pack ideas. Level-design prompts must work against the actual supported enemy, objective, effect and generator catalogs. They may combine supported primitives, but a prompt cannot make an unknown mechanic available merely by naming it.

Separate image IDs from level IDs. The same picture should support a gentle first-closure lesson, a speed run, a survival board or an optional-objective challenge. Conversely, the same deterministic geometry should be previewable under every theme and reveal-art medium. This makes art replacement testable without changing difficulty.

A future deterministic level generator needs declared seeds, generator/ruleset versions, bounded parameters and rejection checks. The current schema’s optional generation field records recipe provenance only; it still requires a materialized grid and entities and does not execute a generator. A generated level recipe is a proposal until simulation and playtesting show it is reachable and interesting. Decorative picture content should not be used as hidden enemy positions or collision geometry.

### 8. Review and revision history

Save the exact prompt, resolved variables, input roles and actual tool/output metadata. Keep numbered revisions, accepted sources and a short note explaining what changed. The included [run-record template](../../authoring/prompts/run-record.template.json) supports that record without assuming which provider or model was used.

Review in four separate categories:

- **Structure:** references, files, dimensions, animation names, metadata and schema compatibility.
- **Presentation:** actual-size player/trail visibility, scene/hazard confusion, UI readability, effect intensity and crop quality.
- **Content accuracy:** historical/source detail, Ukrainian copy and supplied brand identity.
- **Behavior:** working controls, fair challenge, correct fill, frame timing, loading and platform support—only once a real game exists.

This round can validate the library and authoring contracts. Runtime performance and the replay appeal of these mechanics remain future evidence.

## Most valuable next art experiments

1. A fixed main-theme board over the same military illustration in pixel art, clean graphic illustration, gouache and cinematic miniature styling. Change only presentation and evaluate the cost of keeping active information readable.
2. One accepted FPV drone reconstructed as a small real sprite with a short rotor loop, all cardinal directions and explicit pivot. This exposes the gap between concept quality and real game size early.
3. The identical mask and enemy fixture in the four approved families, including the hardest bright artwork cases: snow, ceramic cream, CRT glow and ivory Coupa panels.
4. A tiny three-image chapter with one easy, one medium and one optional-objective board to test whether image discovery and tactical choice reinforce precise cutting.

These are recommended design proofs before scaling to hundreds of backgrounds and a complete production asset set. They preserve the user's accepted breadth while giving the team concrete evidence about its consistency.
