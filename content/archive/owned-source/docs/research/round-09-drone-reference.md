# Round 09 — Ukrainian and Russian drone references for an original arcade game

Research accessed **12 September 2026**. This is a curated inventory of **33 records: 32 named platform/model references and one linked modification**, not an exhaustive inventory or a claim to have inspected every photograph or video. The [machine-readable catalog](../../authoring/catalogs/round-09-drone-references.json) supplies a source claim, evidence category, access date, operator qualification and caveat for every record. All records are `reference-only`; none registers a gameplay class.

The useful design result is a **composable fleet**, rather than one aircraft per mechanic: an airframe silhouette, a role module, a communication presentation, a fictional ruleset and a theme can vary independently. Public equipment names identify research references; production game art and behavior remain original. No real operational performance is used to tune the game.

## What the sources change

- **Heavy does not mean six or eight rotors.** Reactive Drone currently identifies Kazhan 620 as four-motor and 630 as six-motor. Use configurable rotor anchors and body proportions. [Reactive Drone comparison](https://kazhan.ua/uk/)

- **FPV does not mean quadcopter.** Ukraine’s intelligence service identifies Molniya as an airplane-type FPV aircraft. FPV is a control/view description; fixed-wing belongs on the airframe axis. [DIU Molniya report](https://gur.gov.ua/en/content/war-sanctions-zavdiaky-chomu-litaiut-rosiiski-fpv-kryla-molnyia-ta-analoh-orlanu-fenyks.html)

- **Fiber is a link option.** Khizhak REBOFF and Baton Optik are named fiber-linked FPV families. The spool and filament can be recognizable optional attachments; they do not force a new airframe, ability or real-world behavior. [MoD REBOFF announcement](https://mod.gov.ua/news/stijki-do-vorozhogo-reb-ukrayinski-droni-na-optovolokni-hizhak-reboff), [MoD Baton Optik announcement](https://mod.gov.ua/news/znishhuye-tehniku-navit-za-30-kilometriv-novi-droni-baton-optik-popovnili-arsenal-sil-oboroni)

- **One body can have several purposes.** Queen Hornet is described as a carrier, bomber and relay platform; PD-2 offers fixed-wing and VTOL configurations of the same aircraft. Roles and presentation must not be locked to a single skin. [Wild Hornets FAQ](https://wildhornets.com/en/frequently-asked-questions), [PD-2 product](https://ukrspecsystems.com/drones/pd-2-uas)

- **Origin and operator are separate facts.** DJI is a civilian Chinese manufacturer. Ukrainian procurement names its product families, while CNAS documents DJI-family use by both armies. That does not prove every exact DJI model or configuration is used by both. [DJI statement](https://www.dji.com/media-center/announcements/dji-statement-on-the-us-department-of-defense-chinese-military-companies-list), [MoD procurement](https://mod.gov.ua/en/news/the-ministry-of-defence-contracted-a-record-number-of-multirotor-drones-for-the-front), [CNAS report](https://s3.us-east-1.amazonaws.com/files.cnas.org/documents/CNAS-Report-Defense-Ukraine-Drones-Final.pdf)

- **A family name is not a frozen specification.** Geran-2 has an Iranian Shahed-136 lineage and Russian production history. Do not silently merge all later Geran variants with the historical reference. [US DIA evidence](https://www.govinfo.gov/content/pkg/GOVPUB-D5_200-PURL-gpo212630/pdf/GOVPUB-D5_200-PURL-gpo212630.pdf), [DIU production report](https://gur.gov.ua/en/content/my-shukaiemo-de-same-rosiia-vyhotovliaie-shakhedy-vadym-skibitskyi)

## Curated reference index

The right column is **fictional arcade design**, not a description of real weapons. The complete JSON preserves maker, origin, qualified operators, role, link option, status and caveats. Named model variants are counted as separate records, not as unrelated airframe families.

| Reference | Evidence and public role | Original arcade translation |
|---|---|---|
| [Wild Hornet Strike](https://wildhornets.com/en/fpv-drone-with-10-inch-propellers-analog) | Maker: FPV strike product | Charge dash: spend one arcade charge to clear a marked gate; keep the normal player collision footprint. |
| [Queen Hornet](https://wildhornets.com/en/queen-hornet-17-inch-fpv-drone) | Maker: multirole carrier/drop/relay | Courier: collect a glowing capsule, carry it above the cut line, and drop on a marked tile; a relay badge may be a separate module. |
| [STING](https://wildhornets.com/en/sting-interceptor) | Maker: FPV interceptor | Interceptor pulse: tag one roaming arcade hazard and show a brief ring; control speed stays chosen by the ruleset. |
| [Vampire](https://mod.gov.ua/en/news/the-vampire-a-drone-that-terrifies-enemies-and-assists-ukrainians) | MoD: heavy drop/cargo system and aid delivery | Night courier: retrieve and deliver bright aid parcels; one readable cargo silhouette remains visible over backgrounds. |
| [R18](https://aerorozvidka.ngo/) | Developer and maker: octocopter; multiple roles | Eight-petal carrier: a distinctive rotor rhythm with the same logical player footprint; deliver one collectible. |
| [Kazhan 620 / E620](https://kazhan.ua/uk/) | Maker: four-motor heavy model | Compact lifter: a four-rotor cargo variant, with crane-like attachment animation on pickup/drop. |
| [Kazhan 630 / E630](https://kazhan.ua/uk/) | Maker: six-motor heavy model | Six-petal lifter: alternate attachment spacing and idle rhythm; no hidden cargo or speed advantage from the skin. |
| [Nemesis Heavy Bomber Mark 3.5](https://www.uforce.com/air-platforms) | Maker and MoD: heavy reusable platform | Support carrier: pick one mission module before a level, then show its status using a single large badge. |
| [Khizhak REBOFF / Хижак REBOFF](https://mod.gov.ua/news/stijki-do-vorozhogo-reb-ukrayinski-droni-na-optovolokni-hizhak-reboff) | MoD: fiber-linked family supplied to brigades | Filament cutter: optional glowing trail styling; a tether challenge is a separate explicit arcade rule. |
| [Baton Optik / Батон Оптик](https://mod.gov.ua/news/znishhuye-tehniku-navit-za-30-kilometriv-novi-droni-baton-optik-popovnili-arsenal-sil-oboroni) | MoD: updated fiber-linked model authorized | Ribbon courier: a second filament visual recipe; optional route puzzle only when the ruleset explicitly enables it. |
| [Linza](https://mod.gov.ua/en/news/tactical-reconnaissance-and-strike-missions-key-facts-about-the-ukrainian-linza-uav-to-be-co-produced-with-germany) | MoD: camera/drop platform and production partnership | Survey courier: one scanner ring can reveal objective hints; a separate capsule slot supports delivery challenges. |
| [PD-2](https://ukrspecsystems.com/drones/pd-2-uas) | Maker: fixed-wing / VTOL configurations | Survey glider: scan through an authored lane; a VTOL visual recipe changes hover animation only unless rules differ explicitly. |
| [SHARK-D](https://ukrspecsystems.com/drones/shark-uas) | Maker: surveillance aircraft in Ukrainian service | Survey ribbon: deliberate sweep animation highlights a hidden collectible for a short fictional window. |
| [Leleka-100](https://deviro.ua/) | Maker: reconnaissance family and named model | Map reader: reveal a small preview window of the background without claiming territory. |
| [Raybird / ACS-3 family](https://skyeton.com/) | Maker: survey aircraft with Ukrainian use | Panorama scout: reveal the next art fragment while traversing a route; animation does not steer the player. |
| [Shvidun / Швидун](https://mod.gov.ua/en/news/one-of-the-most-effective-interceptors-against-shahed-drones-what-is-known-about-the-ukrainian-made-shvidun-drone) | MoD: winged interceptor already operating | Sky guardian: clear one marked airborne hazard, with an optional return-to-hub animation. |
| [SHRIKE](https://www.pravda.com.ua/eng/articles/2026/02/10/8020316/) | Manufacturer interview: FPV product | Sprint charm: alternate compact body for the same charge-dash recipe. |
| [Orlan-10](https://odin.t2com.army.mil/WEG/Asset/Orlan-10_Russian) | US Army / DIU: Russian reconnaissance family | Observer hazard: patrol an authored loop and briefly outline a danger zone before it activates. |
| [Orlan-30](https://war-sanctions.gur.gov.ua/en/components/companies?kc=&page=18&per-page=12) | DIU / exporter: Russian reconnaissance model | Patient observer: a second patrol rhythm and a visible scanner sweep; difficulty is authored independently. |
| [ZALA Z-16](https://zala-aero.com/) | Maker: reconnaissance aircraft; field reports attributed | Contour observer: follows a distinct curved patrol lane and broadcasts an easily seen warning arc. |
| [Supercam S350](https://supercam.aero/catalog/supercam-s350) | Maker / DIU: surveillance model | Wide observer: a broad scan warning sweeps over unrevealed cells without changing collision geometry. |
| [Skat 350 M](https://rostec.ru/media/news/bespilotniki-kalashnikova-zainteresovali-strany-blizhnego-vostoka/) | State industry / maker: flying-wing survey platform | Wing watcher: wide predictable crossings create route-planning pressure between safe stops. |
| [Lancet family](https://zala-aero.com/news/zala-na-dsa-2026-eksportnaya-versiya-ruk-lanczet-e-v-polnoj-boevoj-komplektaczii/) | Maker / research: distinct one-way family variants | Telegraphed dart: stop, flash direction, then move along a committed arcade line; no homing or real tactics implied. |
| [Geran-2 / Shahed-136 lineage](https://www.govinfo.gov/content/pkg/GOVPUB-D5_200-PURL-gpo212630/pdf/GOVPUB-D5_200-PURL-gpo212630.pdf) | DIA / DIU: design lineage and production | Delta wave: a slow readable lane-crossing hazard with a large warning silhouette and no real target association. |
| [Gerbera](https://gur.gov.ua/en/content/herbery-z-fanery-ta-inozemnoi-elektroniky-detali-budovy-cherhovoho-rosiiskoho-drona) | DIU: multiple configurations; origin assessment attributed | Echo hazard: looks distinct from real threats through pattern as well as color; a reveal action identifies it. |
| [Molniya](https://gur.gov.ua/en/content/war-sanctions-zavdiaky-chomu-litaiut-rosiiski-fpv-kryla-molnyia-ta-analoh-orlanu-fenyks.html) | DIU: airplane-type FPV | Straight runner: a visibly committed crossing line with a long warning, balanced in game units. |
| [Knyaz Vandal Novgorodsky / KVN](https://gur.gov.ua/en/content/warsanctions-hur-opryliudniuie-nachynku-rosiiskoho-bpla-kniaz-vieshchii-olieh.html) | DIU: named maker and fiber-linked FPV type | Filament rival: draws an original luminous warning thread; any tether penalty is an optional arcade rule. |
| [Piranha-10](https://war-sanctions.gur.gov.ua/ru/uav/446) | DIU catalog: named FPV product; deployment scale unverified | Small dart rival: one of several art variations sharing the same readable attack cue. |
| [DJI Mavic 3](https://www.dji.com/lt/newsroom/news/dji-mavic-3-release) | Civilian camera quad; exact operator qualifiers in JSON | Camera scout: preview a patch of art or mark a collectible without capturing it. |
| [DJI Matrice 300 RTK](https://www.dji.com/support/product/matrice-300) | Civilian industrial quad; Ukrainian model/family references | Survey lifter: a large camera-shell skin and optional scanner badge; never infer a larger hitbox from its supports. |
| [DroneHunter F700 / deployed DroneHunter family](https://fortemtech.com/products/dronehunter-f700/) | Maker: net product; deployed-family version caveat | Net guardian: a short-lived lattice pauses one roaming arcade hazard; the net icon visibly counts down. |
| [Volk-18](https://vpk.name/news/524669_zamglavy_koncerna_almaz-antei_nashi_novye_razrabotki_otvety_na_ugrozy_aviabezopasnosti.html) | Maker interview / specialist report: tests and demonstrator | Net rival: telegraph a square lattice on one lane, then briefly close that lane using explicit game timing. |
| [Queen Hornet rifle modification](https://t.me/s/wild_hornets?after=1722) | Maker: tested modification; later use claim attributed | Pulse carrier: animated emitter pops a harmless geometric obstacle; no real firearm shape, recoil or aiming model is required. |

## Gun and net references: confidence boundaries

**Queen Hornet rifle modification:** the maker’s [public post 1726](https://t.me/wild_hornets/1726), readable in the [public channel page](https://t.me/s/wild_hornets?after=1722), describes a unit modification being prepared/tested. A [later report](https://euromaidanpress.com/2024/11/24/ukraines-largest-fpv-drone-makes-history-with-first-ever-assault-rifle-combat-use/) attributes a field-use claim to the manufacturer. This audit did not independently verify the footage or establish broad deployment. It is one configuration of the existing platform. A fictional pulse-emitter attachment captures the silhouette difference without importing real weapon operation.

**DroneHunter:** Fortem explicitly [announced supplying the DroneHunter family to Ukraine in 2022](https://fortemtech.com/press-releases/2022-05-16-fortem-deploys-man-portable-counter-uas-solution-in-ukraine/). Its [current F700 page](https://fortemtech.com/products/dronehunter-f700/) describes net capture. The product page is useful for the category; it does not establish that current specifications match every delivered Ukrainian unit. The arcade proposal is a short-lived lattice that pauses one abstract hazard.

**Volk-18:** a [manufacturer executive interview preserved by VPK.name](https://vpk.name/news/524669_zamglavy_koncerna_almaz-antei_nashi_novye_razrabotki_otvety_na_ugrozy_aviabezopasnosti.html) describes a net interceptor undergoing tests in 2021. [Defense Express](https://defence-ua.com/news/zbivali_z_drobovika_lovili_sitkoju_teper_budut_taraniti_v_rf_stvorili_chergovij_bpla_vinischuvach_droniv_foto-2844.html) identifies a demonstrator. This is a prototype/test reference here, not a verified Russian battlefield net fleet. The original TASS page was not readable through this browsing tool, so the republication is labeled explicitly.

## A modular art and challenge vocabulary

| Independent axis | Authoring choices | Boundary |
|---|---|---|
| Airframe | Open quad, camera quad, heavy quad, hexacopter, octocopter, long-wing aircraft, flying wing/delta, winged interceptor | Name every art layout; a generic heavy body is not automatically a historical model. |
| Attachment | Camera eye, cargo cradle, visible capsule, relay badge, spool, lattice emitter, fictional pulse emitter | Attachments are drawable components; their presence does not grant a rule. |
| Communication presentation | Ordinary indicator, filament indicator, fictional relay badge | Fiber belongs here; do not label an aircraft immune to game hazards because of a real link claim. |
| Arcade action | Preview art, carry/drop, pulse, temporarily pause one hazard, checkpoint dash | Define effects in tiles/ticks and version the ruleset independently. |
| Movement policy | Immediate turn or grid-center buffered turn | Existing selected policy remains authoritative; body art must not add steering lag. |
| Theme | Ukrainian defense, Ukrainian cultural atlas, retro cabinet, Spend Sprite business | The same action can use an original drone, bird, spacecraft or helper. |

For example, **carry/drop** can move an aid capsule in the defense theme, a museum fragment in the Ukrainian atlas, a glowing cartridge in the retro theme and a savings token in the business theme. **Scan** can preview a route, illuminate embroidery, reveal an arcade bonus or identify a fictional spend anomaly. **Net** can become a woven lattice, pixel cage or workflow hold. These are original game metaphors; this research creates no claims about Coupa product functionality.

A compact tile mode needs a readable center, four or six clear anchor dots and one role symbol. A detailed prop mode may add body supports, cameras and attachments. A hybrid mode should preserve the compact center and action cue while drawing larger art above it. Cargo, rotors, wings and trails must never silently move or resize the logical collision footprint. For large screens, the inspection view can explain the full original body; for small screens, action readability takes priority over resemblance. These are recommendations for review, not newly implemented rendering guarantees.

## What to add to the design next

1. Start the ability comparison with **scan, carry/drop, short pulse and short net hold**. Their effects are easy to see and can be tested independently of territory capture. Keep the actual Xonix cut-and-fill kernel outside this research change.
2. Offer body selection separately from role selection. A visible compatibility table may restrict art attachment placement, but a model name must not secretly determine speed, damage, quota, cooldown or rewards.
3. Give every active module a clear state: ready, carrying/active, recovering and unavailable. A pickup/drop action should visibly change the attached capsule, and a net should show its remaining fictional duration.
4. Use at most one primary action at a time in the first comparison demo. Broader module combinations, carrier-spawn loops and decoy rules can wait until the core cut loop is enjoyable.
5. Persist loadout choices separately from cosmetic ownership. Versioned rulesets and challenge/result identities must record gameplay-affecting choices, including turn policy. Reference IDs stay research metadata.

## Audit limits and maintenance

This round checked public product pages, official announcements, agency inventories, manufacturer interviews and selected corroborating research. It did not measure flight motion, count fleet deployments, independently authenticate combat clips or test real equipment. Silhouette descriptions are family-level design cues; particularly rounded shells, fin accents, scanner colors and animation rhythms are art proposals. Sources often contain marketing, changing configurations and partisan effectiveness claims; those claims were not used for balance.

The JSON `status` records evidence type, **not** an automatic fielding judgment. `fieldUseEvidence` and `caveats` carry that distinction. A codification announcement is weaker deployment evidence than an explicit statement that systems are operating. A maker’s claim stays attributed; a catalog entry alone does not establish prevalence. Unverified operator/model matches remain qualified. No payload amounts, ranges, endurance, frequencies, explosive details, real targeting tactics or deployment procedures were copied into the catalog.

The catalog is deliberately separate from runtime presets, collection definitions and ability rules. To add another reference, supply a stable research ID and a narrow source claim, preserve the origin/operator distinction, label model/configuration relationships and state what remains unverified. Original assets can then cite the reference without copying its imagery or inheriting its claimed real capabilities.
