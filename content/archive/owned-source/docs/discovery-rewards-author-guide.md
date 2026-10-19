# Authoring discoveries and campaign finales

This guide describes the implemented shared reward and authoring capabilities.
See the [implementation ledger](discovery-rewards-phase-status.md) for completed
work, validation and remaining phases.

Rewards use the existing company edition, campaign and Journey framework. They
present accepted wins; they do not change movement, enemies, scoring or mission
unlock rules. Editions without a reward sidecar continue to work as before.

## 1. Author a reward in Company Studio

Start the repository development server:

```sh
node scripts/game-cli.mjs serve --port 8768
```

Open `http://127.0.0.1:8768/authoring/company-studio/`. Select an edition, or use
**Import catalog or draft** to open an existing source packet. The two built-in
pilot campaigns are **Spend in Motion** and **Workshop Lights** in the
Netherlands DroneAid edition. For the current example → try → later-application
sequence, use **Community Connections**, **Ideas into Understanding**, **Threads
Across Ukraine** or **Meet the Aircraft**; each uses six existing arcade missions.

1. Open **05 / Learning & rewards**, then select the campaign.
2. If needed, choose **Add a reward sidecar to this campaign**. This adds an empty
   JSON array and a declared `rewardPath` to the local authoring draft. It does
   not create a reward or choose a completion rule.
3. Expand **Create a knowledge reward**. Explicitly choose either **Win one
   selected mission** or **Win every mission in this campaign**. The first option
   also requires selecting the mission. There is no preselected rule.
4. Supply the title, locked teaser and discovery paragraph in both English and
   Ukrainian. Choose **Add to JSON draft**.
5. Review **Versioned reward JSON**. Add accurate source references, additional
   paragraphs or supported payloads as needed. The builder starts with an empty
   source list; it does not invent citations.
6. Choose **Validate & apply rewards**. Unapplied JSON cannot be exported as a
   complete source draft. Validation checks campaign ownership, exact gameplay
   bindings and asset admission as well as syntax.

Changes remain in the tab until **Export source draft**. Export before closing
the authoring tab. A source draft contains authored data; it is not a player
progress backup or a published release.

For current result summaries, use one mission discovery per mission and one
campaign finale. Bundle related content into that reward's `payloads`; Collection
can display every declared reward, but the compact results summary selects the
first matching mission reward and campaign finale.

### Completion rules and revisions

The builder derives exact eligible gameplay identities from the selected source
and the three supported difficulties. It applies the same shared pressure rules
as Solo. Do not substitute a mission title, map filename or raw manifest identity
for a generated binding.

The JSON `requirements.missions` lists distinct authored mission IDs, each with
its accepted `{ difficulty, gameplayId }` bindings. A campaign requiring six
missions stays locked at 5/6 if any one is missing, even when the last mission is
already complete. Skipping a mission and viewing a replay do not supply a win.

Advanced authors can restrict a mission to a subset of the already valid
difficulty bindings. The compiler rejects invented identities and missions
outside the selected content. Keep the difficulty promise explicit in the
teaser. `requirements.learning` can require exact selected lessons, fixtures and content identities; use the explicit assignment checklist or the same JSON references. A required lesson’s mission must also be explicitly selected. `requirements.mastery` supports the registered `journey-no-loss-win@1` predicate through its explicit mission checklist; it requires an accepted replay-verified no-life-lost attempt and does not certify real-world skill. See [verified learning rewards](discovery-learning-rewards.md).

The catalogue and compiler understand broader versioned reward structures; that
does not make every planned predicate or viewer available. The authoring controls cover single-mission wins, selected mission sets, all-mission finales and optional exact learning requirements.

Give every reward a stable ID and string revision. Keep the requirement set
promised to an existing player intact. The player retains the first accepted
definition for that reward ID, including its original payload references. Use a
new ID for a genuinely different offer; do not reuse an old ID to impose more
missions on existing players. Advance affected edition content revisions and
retain prior presentations before publishing changed content. Do not overwrite
existing frozen releases or retained snapshots.

Learning assignments remain optional after-win activities in the current game.
A reward is an automatic collectible when its accepted requirements are met;
there is no separate Claim step and no requirement to read it before continuing.

## 2. Supported payloads and exact media

Every payload has a unique `id`, a supported `type` and localized `en`/`uk` copy.
The JSON editor preserves the full structure through source export/import.

| Type          | Required authored content                                                                                       | Current player behaviour                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `knowledge`   | Localized `title`, `paragraphs`; optional `sources` containing `title` and HTTPS `url`                          | Untimed text with explicit source links                    |
| `image`       | `asset: { assetId, sha256 }`; localized `title` and `alt`                                                       | Exact verified raster image and **Save this picture**      |
| `url`         | HTTPS `url`; localized `title`; optional `qr: true`                                                             | Readable destination and explicit **Open resource** link   |
| `public-code` | `code`, `issuer`; localized `title` and `terms`; optional HTTPS `termsUrl` and `expiresOn` in `YYYY-MM-DD` form | Code, issuer, terms and supplied expiry displayed together |

Only an issuer's real public offer should be presented as a coupon. Codes are
shareable and inspectable in downloaded files; there is no secure redemption,
unique-code service or single-use guarantee. The displayed expiry is information
from the author, not an automated redemption check. An expired offer does not
erase an earned discovery.

URL destinations and source pages open only after a player action. They require
network access; keep the useful explanation inside the offline knowledge
payload too. Executable embeds, non-HTTPS links and credentials in URLs are
rejected.

Images must use an existing admitted **PNG, JPEG or WebP** entry with an exact
asset ID and SHA-256. Declare the asset in the owning campaign's `assetIds` and
provide its bytes, hash, publication classification and dependencies in the
catalogue. Selecting an image from some other campaign does not admit it to this
one. The compiler checks the selected asset closure and the image's exact hash.
Use the established asset import workflow; do not set approval flags merely to
bypass validation.

Keep the locked teaser independent of the reward image. The shared editor now supports exact separate [preview artwork](reward-teaser-artwork.md), including bilingual descriptions and local hash-verified preview. Locked player cards show
the authored teaser without fetching or revealing the image or final link.
Maintain meaningful Ukrainian and English alternative text.

Audio/video rewards use the shared native media adapter, exact asset hashes,
localized captions/transcripts and explicit Play. See [media authoring](discovery-media-rewards.md).
The registered inspect/compare atlas supplies untimed cards and prediction feedback;
see [exploration authoring](discovery-exploration.md). Earned discoveries can be
saved as static printable HTML with exact available pictures, transcripts and sources.
Author previews are clearly marked and cannot serve as player completion evidence.

The shared [optional character adapter](discovery-cosmetic-rewards.md) now supports exact registered bodies through Company and Level/Campaign Studio.

Asset Studio and Picture Workshop now offer an [exact raster handoff](discovery-asset-handoff.md) to the shared reward controls, including captured video posters. New originals still need the existing source and rights admission.

The shared editor also accepts [exact soundtrack originals](discovery-audio-handoff.md),
[ordered listening collections](discovery-audio-groups.md), and [complete video clips](discovery-video-handoff.md)
with exact posters, bilingual transcripts and captions. Picture Workshop hands off the complete inspected clip;
its playback range does not silently trim the original.

The four showcases have [verified application bonuses](discovery-learning-rewards.md)
through the canonical lesson verifier. The separate FPV package has
[typed practice discoveries](discovery-practice-rewards.md), authored through
[Course Studio](civilian-fpv-authoring.md), with its own course and proof admission.
The Company/Level Studio arcade controls do not import simulator courses or grant
practice completion. Player/compiler admission rejects unsupported payloads and
unregistered predicates. Existing game media, characters and soundtracks retain
their independent authoring paths. Registered [campaign result feedback](campaign-feedback.md)
is editable and previewable through the shared discovery controls.

### Edit the teaching sequence without changing the finale

In Company Studio, **05 / Learning & rewards → Add a lesson sidecar** creates the
missing lesson file when necessary. Select a mission and edit the guided bilingual
objective, worked-example evidence, different application situation, options,
corrective feedback and sources. **Stage lesson draft** updates the JSON buffer;
**Validate & apply lessons** validates and applies it to the source draft. A changed
lesson needs new lesson and fixture revisions. Any reward requiring its previous
exact fixture must be reviewed explicitly; applying lessons never silently moves
that reward's requirements.

Use the wrong/alternative, supported/reflective, incomplete and **Resume current
preview** actions before exporting. They run the same bounded workbench without
player storage. For an unscored reflection, describe the consequence of each choice
rather than marking a personal value correct. In **Interactive discovery atlas**,
guided bilingual cards and **Add a later-application question** use the shared
[atlas workflow](discovery-exploration.md); atlas predictions are untimed practice,
not verified lesson evidence.

Keep the six-win finale separate from an optional application reward. The latter
can require those six wins plus the exact final lesson; changing an example or
adding a bonus must not add a condition to an existing finale. Edit built-in
showcases through their source modules and generator, or export an independent
Studio draft; do not maintain competing edits to generated JSON.

## 3. Preview, export and whole-game checks

In **05 / Learning & rewards**, choose a reward, language and preview state:

- **Locked** uses no completed missions.
- **One required mission missing** omits the last declared requirement. For a
  one-mission reward, this is still 0/1.
- **All requirements complete** supplies synthetic matching wins and selected exact learning completions.

Choose **Preview current JSON**. This validates the draft and projects counts;
the eligible state shows knowledge, source/resource links, code terms, available
images and the shared interactive/native media viewers. A printable text preview
is available in both authoring surfaces. Missing exact assets stay explicitly
unavailable. It never writes a Journey profile, earned receipt or Collection entry.

Then apply the JSON and export the source draft. From the repository root, a
Coupa Adventure example is:

```sh
node scripts/company-studio.mjs import-draft --file /absolute/path/coupa-adventure-draft.json --workspace .cache/coupa-rewards-source
node scripts/company-studio.mjs validate --workspace .cache/coupa-rewards-source --edition coupa-adventure
node scripts/company-studio.mjs preview --workspace .cache/coupa-rewards-source --edition coupa-adventure --out dist/company-previews/coupa-rewards-preview
```

Use a **new workspace and output directory** for each import/build; these commands
do not overwrite existing outputs. For externally prepared assets, add
`--media-root /absolute/path/to/media-workspace` to `import-draft`. The draft's
media is copied only when its bytes match the admitted inventory.

Open **06 / Whole-game preview**, import
`dist/company-previews/coupa-rewards-preview.report.json`, and use its verified
preview action while the development server serves the repository. Output under
`dist/` is visible to the server; hidden `.cache/` output is not a browser preview
destination. Editing the source invalidates an earlier preview report.

For a standalone compiled directory, use a fresh output name:

```sh
node scripts/company-studio.mjs export --workspace .cache/coupa-rewards-source --edition coupa-adventure --out dist/company-exports/coupa-rewards-candidate
```

For a complete authoring check, use a disposable profile and serve that compiled
candidate independently. Win with ordinary game controls, open the optional
activity directly from the initial won result, try an incorrect decision, then
correct it. Confirm **Next/Retry** stays available. Reopen the earned picture and
discovery from **Collection**, check both languages and sources, and confirm a
revisit does not create another receipt or a new verified lesson completion.
Temporarily unavailable exact media must keep its recovery message until the same
original bytes return; do not replace it with a similar image.

This player check is distinct from **06 / Whole-game preview**: the Studio-launched
preview explicitly uses fresh in-memory progress and does not read, save, import
or export a player's Journey or rewards. Guided fixture and reward previews also
cannot supply completion evidence. The automated chain is covered by
`game/test/showcase-studio-playthrough.test.mjs`; its modeled DOM/canvas boundaries
do not establish physical touch/controller, layout or learning effectiveness.

The export command produces a candidate and report, not a ZIP release or publication. Leave
release version allocation, frozen archives and promotion to the existing release
pipeline. For checked-in built-in content, edit the authoring source and regenerate
through `scripts/produce-company-content.mjs`; do not maintain a generated sidecar
by hand alongside a conflicting generator.

## 4. What players see, save and recover

The ready/results surface shows the mission promise, then an earned discovery and
the campaign-finale count after an accepted win. **Explore discovery** opens the
untimed reader. **Open campaign exhibit** is available when the finale is earned.
Next/Retry retains its usual action; reward reading is optional.

**Collection → Discoveries & campaign exhibits** keeps teasers and progress for
locked rewards and opens earned ones. Opening the reader pauses the game and
clears movement input. The shared language preference selects English or
Ukrainian copy. Reduced motion removes reward entrance movement.

In **Settings → Data → Discovery collection backup**, players can choose **Export
discoveries** and **Import matching discoveries**. This versioned backup contains
the exact reward promises and earned receipts. It is separate from the existing
Journey backup: keep both when transferring progress. Importing a discovery
collection does not create mission wins, scores or other gameplay authority.

Storage uses the stable logical edition ID, not the engine release number. A hub
and standalone view can share it on the same origin when they identify the same
edition. Different audience editions—including an aggregate edition and its
single-campaign edition—have separate progress even if they share content.
Discovery import rejects a different edition ID. Across origins, export/import
is explicit and still requires the matching logical edition.

Discovery imports also require compatible exact promises for overlapping reward IDs. If the
destination already registered a different revision, import reports a conflict and leaves both
collections unchanged; it never reports success after dropping the backup's earned picture.
The check also runs inside the durable transaction, so a concurrent tab cannot silently change
the result. Failed durable imports leave the existing session intact; keep the original backup
and retry when saving is available.

For a conflicting cross-version transfer, preserve both backups and open the backup's matching
frozen release on a separate disposable profile/origin. Import its Discovery and Journey backups
there, then follow the supported update path with the registered retained presentation. Do not
clear an existing collection or edit a backup to force the merge. The `v1` format label alone is
not a promise that every older executable understands later optional payload features; use a
reader that supports the backup. Unsupported old readers must not substitute newer artwork or
overwrite their unreadable stored collection.

If saving is unavailable, the game identifies discoveries as available in the
current tab and offers export. A session-only discovery is not proof that the
underlying Journey win was saved; preserve both backups before leaving.

A collection-capacity warning is different from unavailable browser storage. A valid import can
be saved while newly earned local receipts would exceed the fixed collection-format limit. The
reader preserves the committed collection and keeps those exact local receipts for retry in the
current tab, without adding a partial subset to the collection. They are **not included in the
Discovery export** until they fit. Preserve Journey and optional-learning backups, along with the
original imported file, before leaving. These are separate accepted-evidence authorities; a
Journey backup alone cannot reconstruct every learning reward. Use a compatible reader and
the exact required evidence and presentations for recovery. Deleting browser files does not increase this format limit. Explicit Retry
save rechecks the bounded collection; unchanged gameplay refreshes do not repeatedly retry it.

Image viewers verify the earned asset ID and hash. When that exact artwork is
missing, the reward and its text remain retained and a recovery message appears.
Restore the matching edition release or original artwork snapshot. A newer image
with a similar name is not silently substituted. Reward backups contain
references and text, not the original image bytes; keep the matching release or
approved media archive available for recovery.

## 5. Publication checks

Use public or otherwise audience-approved material. Record authoritative sources
for factual claims, keep generated illustrations distinct from historical
objects, and respect individual licences and permissions. A publicly accessible
logo or photograph is not automatically redistributable. Authoring convenience
does not approve source rights, factual accuracy, route quality or artwork.

Before qualification, review the compiler's selected dependencies, exclusions,
source eligibility and retained history. Omitted campaigns, private research,
unrelated assets and rejected artwork must not enter player packages, published
source archives or evidence bundles. Public codes are deliberately shareable
content, not secrets hidden by the locked UI.

Keep the **64 MiB / 2,000-file** core offline budget, the **32 MiB** edition-asset
ceiling and any stricter importer limits. A compiled preview is not automatic
permission to publish or a waiver of outstanding qualification. Human and
physical-device evidence remains deferred and must be reported as such.

## Resource and QR rewards

Level/Campaign Studio and Company Studio share a resource editor. Select an existing reward with explicit win requirements, choose or add its resource, provide English/Ukrainian titles and an HTTPS address, and optionally enable QR. Preview does not earn progress. Apply creates a new payload revision and rebinds exact author references without changing promised wins or gameplay. Existing sidecar import/export carries the same fields.

QR addresses are limited to 256 serialized UTF-8 bytes so the result stays readable. Collection and author previews generate the code locally only after Show QR; the same code is included in the printable offline document. The visible full address and resource link remain available. QR presentation never opens a URL, shortens an address or contacts a QR service. Existing URL rewards without the optional `qr` flag behave as before.

Project Nayuki QR Code generator 1.8.0 is pinned with its upstream checksum, MIT notice and one documented ES-module export. Generated SVG geometry is built exclusively from numeric QR cells; this does not add support for importing SVG artwork. A reference symbol was independently decoded with macOS CoreImage. Six focused checks cover exact vendor bytes, bounded addresses, quiet zones, authoring and 20 disposal cycles. A local Node run measured 10.55 ms cold generation and 2.32 ms p95 over 20 warm generations at a 250-byte address; these measurements are not frame-time or phone-camera evidence.

## Campaign Collection exhibits

The campaign discovery metadata selects a route, gallery or mosaic layout. Company Studio and Level/Campaign Studio preserve this field through preview and export. Collection offers one campaign at a time using the canonical mission order, with a separate campaign-finale card. This is a projection of existing promises and earned receipts, not another completion store.

Show collected pictures is explicit. Locked cards never fetch final images. At most twelve exact earned thumbnails are retained, with two verification requests in flight; every reward still opens in the full reader. Changing campaign, hiding pictures or closing Collection cancels pending work and releases object URLs. Missing exact art keeps its text and recovery action.

The shared More menu also offers optional flight practice when an admitted package is published. Opening it fetches only the bounded launcher catalogue; starting a package remains explicit and uses a separate installation. Authoring or previewing a practice package cannot grant Journey wins. See [optional package candidate delivery](optional-package-candidates.md).

## Learning profiles

The shared discovery editor offers three bilingual reading profiles for an existing knowledge section. Fill the heading and one to four short paragraphs for Schools & families, New to the subject, and Explore further. Separate paragraphs with a blank line. These are optional exploration prompts; keep essential explanations, safety information and sources in the common section, which remains visible for every choice.

Preview uses the same native reader as Collection and never records a win. Apply creates a new reward revision and updates exact authored references without editing requirements or gameplay. JSON import/export retains the variants. Printable offline discoveries include all three labelled versions. Older rewards without profiles continue to render their original common explanation.

## Local timing observations

Open `docs/verification/journey-performance.html` from the development server, choose an edition, and load the review game. After reaching the intended menu, play or result scene, select **Observe 30 seconds**. Keep the same scene and viewport for the baseline and candidate. The JSON log includes p95 frame intervals, supported long-task counters and optional heap snapshots. Hidden pages and interrupted samples are discarded. The observer never drives gameplay and is omitted from release output. These measurements are local observations; use matched repeated samples plus browser traces before asserting the 5% regression or 50 ms reward-rendering targets.

The game home keeps the primary play, Campaigns, Collection and Settings actions clear. **More → Choose a world** changes the selected edition through the existing save/leave handoff. More also contains original-artwork recovery and source attribution. If a saved flight already needs a registered older presentation, its recovery action appears directly on home. These paths use the same pause, input and save protections as other Solo navigation.
