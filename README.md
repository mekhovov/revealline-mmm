# RevealLine MMM — Coupa community

An independent Coupa game derived from [RevealLine](https://github.com/mekhovov/revealline). It contains the five existing Coupa chapters (30 missions) with Solo, Versus and Team, 240 official grid-Snake missions in those three modes, and 20 additional Solo missions across eight Coupa collections. The original chapter artwork, rewards, learning activities and compatible save identities are retained. It runs as a static app on GitHub Pages.

**[Play the Coupa app](https://mekhovov.github.io/revealline-mmm/)**

The app has no community directory, other community campaigns, FPV simulator, public pack marketplace, or authoring application. Its entry point and content catalog are fixed to Coupa. The deterministic game engine is pinned upstream. Coupa content and presentation inputs are owned locally in this repository; SIM and Survivals are excluded.

## Run and verify

```sh
npm ci
npm test
npm run build
npm run dev
```

Open `http://127.0.0.1:8779/revealline-mmm/`. The build copies the verified `app/` tree into `dist/`; Pages publishes that tree only. Normal builds are self-contained and do not download the upstream repository or use its deployed website.

## Adopt updates from the main game

`brand.config.json` defines this app's selected edition. `upstream.lock.json` records the exact upstream commit, input hashes, and generated output. `app/` is the selected runtime source and media produced by the upstream standalone-edition compiler, followed by the branded isolation projection. The compiler combines the pinned engine with the locally owned `content/catalog.json`, `content/files/`, and `branding/runtime/` inputs. The lock covers their exact bytes as well as every generated output. Supplemental content and menu scenes have explicit manifests and checksum admission. Updates requiring a different compiler interface fail closed.

To prepare an update locally:

```sh
git switch -c codex/upstream-update
npm run sync:upstream -- --ref main
npm test
npm run build
```

For a specific upstream commit or an existing local checkout:

```sh
npm run sync:upstream -- --source ../go_test --ref UPSTREAM_COMMIT_SHA
```

The importer reads committed Git objects; local uncommitted upstream changes are never copied. It refuses to overwrite modified generated files. Unrecognized upstream structures fail the projection rather than restoring unrelated features. Review the generated diff and playtest before committing and merging the update.

The **Verify pinned upstream extraction** workflow reproduces the committed app from its exact remote source commit without changing it. The **Prepare upstream update** workflow performs the extraction and verification and opens a pull request. It never merges an update. GitHub must allow Actions to create pull requests for this optional workflow; the local commands work independently.

## Compatibility and future brands

Keep general gameplay fixes in the upstream game. Keep this repository's content in `content/`, presentation adapters in `branding/runtime/`, and extraction rules in `scripts/`, then regenerate `app/`. This limits divergence and lets the same process import later engine fixes. Do not routinely hand-edit generated engine files.

The five chapter generators and their lesson, reward, layout and presentation inputs are owned in [`authoring/company/`](authoring/company/README.md). CI reconstructs their native content using the pinned generic engine and checks it against the retained local identities before deployment.

The eight supplemental collections use locally owned native pack inputs and the compiler in [`authoring/collections/`](authoring/collections/README.md). `npm run verify:collections` reproduces all 20 shipped recipes without any upstream branded input.

The Coupa landing presentation lives in `branding/coupa-landing.css` and `branding/coupa-landing.html`. The projection applies these files, the official Coupa wallpaper, and the rotating flower without changing the campaign or its artwork pins. These inputs are hashed in the extraction lock and reapplied on upstream updates. Decorative motion follows the game's animation preference, reduced-motion settings, and menu visibility.

Campaign, map, lesson, and asset identities are preserved. This preserves upstream's content and replay compatibility rules; it is not a promise that every historical replay works after a gameplay change. Coupa saves remain in the dedicated app namespace. Snake and Collections use separate verified round envelopes; exported rounds only restore against included recipes. The branded renderer and preference adapters force clean effects independently of saved settings. Future brands need their own repository, selected edition, Pages path, isolation checks, and application/storage identity. Never combine their catalogs in a branded distribution.

A new upstream UI or content format can require a deliberate projection update. Automated checks enforce the release boundary; human playtesting still covers gameplay feel, art, audio, and device behavior.

## Deployment

Pushes to `main` run tests and verification, build the app, deploy to GitHub Pages, and verify the published commit in `deployment.json`. Pull requests run the build without deploying. `upstream.lock.json` identifies the game source separately from the dedicated repository's deployment commit.

The source content and artwork retain their upstream attribution and provenance. This community application does not perform live Coupa operations.

Nineteen original production checkpoint oracles are preserved in `content/archive/production-oracle-originals/`, with exact byte and Git identities in `migration/production-oracle-originals-receipt.json`. They document the original historical artifacts before the shared engine's catalog migration and stay outside the playable build.

The compact archive inventory in `migration/embedded-upstream-20261020-receipt.json` preserves 42 unique embedded originals from 21 later upstream evidence archives, accounting for all 354 observed member paths. Exact affected archives are backed up separately; the compressed original records in this repository retain their own byte identities and remain outside the playable build.

Eleven original packed catalogs, recovery records and replay-diagnostic inputs are preserved in `content/archive/packed-localization-20261020/`. Their exact Git and byte identities are recorded in `migration/packed-localization-originals-receipt.json`; derived upstream fixtures cannot be mistaken for these originals. All preserved records stay outside the playable build.

Public issue, comment and release originals affected by the migration are preserved in `content/archive/hosted-migration-provenance-20261020/`. The receipt in `migration/hosted-provenance-originals-receipt.json` records their exact hashes and the original historical intake record. These provenance records stay outside the playable app.

Eight generated native chapter package originals from historical releases are retained in `content/archive/release-native-originals-20261020/`, with exact published paths, release tags and hashes in `migration/native-release-originals-receipt.json`. They preserve the original package identities without exposing historical launch routes in the app.
