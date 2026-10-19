# Round 04 — a reusable content system

12 September 2026. The four theme families and the three motivations—arcade mastery, discovering art, and tactical choices—remain the approved direction. This round turns the authoring requirements into usable skills, prompts, contracts and checks. It does not start the playable game.

## Recommendation

Use one small capture simulation with independently editable **theme**, **reveal-art collection**, **ruleset**, **level** and **campaign**. Keep device layout and player accessibility/input preferences outside theme packs. Phaser 4 with TypeScript remains the provisional runtime choice for frontend maintainability and browser delivery; native wrappers and exports must pass a small device proof before we promise the full platform list.

The newest research has a practical implementation consequence: Phaser 4 removed BitmapMask in favor of Mask filters, and texture filtering applies to an entire texture. Build a narrow mask adapter and separate crisp pixel atlases from smooth photographic/painted artwork. These are verified API constraints; performance remains to be measured. [Phaser migration](https://phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know), [Texture API](https://docs.phaser.io/api-documentation/4.0.0/class/textures-texture).

## More variety within the approved families

These are original proposed chapter directions. Their visual properties and rewards can be authored now; their play appeal is a hypothesis.

| Family | Strong next variations | Discoveries and challenges |
|---|---|---|
| FPV FRONT — main | Daybreak Front: wheat/olive pixel scenes; Night Signal: rain/navy/amber; Steel Horizon: copper rail yards; Winter Signal: snow/charcoal; Field Notebook: drawn military illustrations | Reveal fictional invading Russian military equipment in distinct parts of a scene; capture relay markers; choose between safe coverage and optional objectives; read threats under difficult bright/dark backgrounds |
| UKRAINE ATLAS | Petrykivka Garden; Carpathian watercolor; Kosiv cream/green/yellow ceramics; a separately researched Örnek chapter; Ukrainian modernist city posters; archival-photo collections with sourced captions | Collect motifs, landmarks and chapter images; calmer exploration or precise timed routes; learn through optional gallery detail |
| 1994 FOREVER | After-School Desktop; Warm Arcade; FM Space Opera; Cassette Summer; Demoscene Night; DOS Expedition | Collect disks and postcards; chase score and route efficiency; unlock music/art variations and replay an identical challenge with a new presentation |
| NAVI NETWORK | Paper Circuit; Blue-Hour Supplier City; Savings Garden; Invoice Maze; AI Observatory; Supply Constellation | Capture cost-leak markers, score fictional savings and clear pressure modifiers; reserve genuinely ordered connections and new agent-assistance behavior for explicit extensions |

Petrykivka's floral language and Kosiv's contour/green-yellow ceramic tradition warrant distinct briefs, rather than a generic mixture of motifs. The proposed chapters derive from those documented properties. [UNESCO Petrykivka](https://ich.unesco.org/en/RL/petrykivka-decorative-painting-as-a-phenomenon-of-the-ukrainian-ornamental-folk-art-00893), [UNESCO Kosiv](https://ich.unesco.org/en/RL/tradition-of-kosiv-painted-ceramics-01456?RL=01456).

For Coupa, current company material emphasizes agent building, orchestration and connections; those suggest richer chapter metaphors than collecting money alone. Our game concepts are fictional interpretations, not representations of actual platform outcomes. [Coupa's June 2026 announcement](https://www.prnewswire.com/news-releases/coupas-agentic-momentum-fuels-results-in-q1-fy27-302804904.html).

## How much flexibility the first contract demonstrates

| Requirement | Concrete authoring support today | Future runtime/editor proof |
|---|---|---|
| Different families, characters and moods | Theme palette, labels, semantic asset roles, animation metadata, planned audio and original custom families | Load/swap a complete theme and clean up its resources |
| Images in many styles | Pixel art, illustration including watercolor/graphic art, photographs, scanned art; source references, crop/focal/protected-region metadata | Real imports, decoding, derived exports, filtering and partial-reveal readability |
| Multiple goals and challenges | 14 specified primitives: 2 fill policies, 4 goals, 2 enemies, 4 effects and 2 modifiers; goal `all`/`any` composition | Deterministic behavior, meaningful difficulty and fair event ordering |
| Editable/generated levels | Explicit grid/entities/markers; static reachability and simple objective feasibility; optional generation provenance | Editor and generator that materialize and simulate valid levels |
| Multiple screens and inputs | Fixed 4:3 arena contract; proposed responsive surrounding UI and shared input actions | Same replay on portrait/landscape phones, resized browser, tablet, handheld, desktop and TV |
| AI-assisted production | Five skills, 56 prompt templates, 28 variations, exact-run record and local prompt browser | Repeated inspected sprite/audio/background production through available tools |
| Maintainability | Versioned data/capabilities, local references, planned/ready gate, readable validation errors | Compiler, save migrations, cache updates, rollback and real platform builds |

The first catalog is intentionally finite. A true pursuing enemy, ordered supplier reconnection, arbitrary upgrade economy or a new fill algorithm requires a small implemented primitive with parameters and tests. No JSON schema or prompt can remove that engineering work.

The narrow editor should be designed around the actual tasks: select/upload images → preserve originals and crop → choose theme → place markers/enemies → choose goals → preview → validate/export. Tiled/LDtk imports can follow if board authoring needs their features. [Tiled custom properties](https://doc.mapeditor.org/en/stable/manual/custom-properties/), [LDtk IntGrid](https://ldtk.io/docs/general/intgrid-layers/).

## Concrete first implementation sequence after design review

1. **Rules proof:** settle the baseline fill policy and death/completion ties; build deterministic cuts, collision, capture, objectives and replay. Prove that markers affect objectives after capture rather than secretly changing fill.
2. **Presentation proof:** use the same authoritative board and replay across all four families and at least three artwork media. Compare captured cells, actor positions and outcomes, not only screenshots. Finish one real drone sprite loop and one reveal image before scaling production.
3. **Device proof:** test complete menus and play with keyboard, touch and controller on an ordinary phone, browser and handheld/desktop target. Preserve the full arena on rotation and resize; measure frame time and decoded memory during repeated theme switches.
4. **Authoring proof:** build the smallest import/crop/level/objective editor, export through this contract, and add a constrained seeded generator. Improve errors using actual author feedback.
5. **Replay proof:** playtest short sessions for first-cut understanding, failures, voluntary retries and next-level choices. Tune the three motivations using evidence, then expand art and audio collections.

These are ordered evidence gates rather than a promise of a zero-code general-purpose engine. Each completed slice should leave the content format and authoring skills easier to use.

## What was created and checked

Open the [authoring kit](../authoring/README.md) for commands and examples. Its [verification record](../authoring/evaluations/round-04-verification.md) separates actual local checks from future runtime tests. The [new concept board](concepts/round-04-theme-system.png) demonstrates visual breadth; its differing boundaries and aspect ratios mean it is not evidence of an identical rendered arena.
