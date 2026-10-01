# RevealLine MMM — Coupa community

An independent Coupa game derived from [RevealLine](https://github.com/mekhovov/revealline). It contains the existing `coupa-all` community journey: five Coupa chapters, 30 missions, their artwork, rewards, and optional learning activities. It runs as a static app on GitHub Pages.

**[Play the Coupa app](https://mekhovov.github.io/revealline-mmm/)**

The app has no community directory, other community campaigns, FPV simulator, public pack marketplace, or authoring application. Its entry point and content catalog are fixed to Coupa. The deterministic game engine and existing Coupa content identities come from upstream.

## Run and verify

```sh
npm ci
npm test
npm run build
npm run dev
```

Open `http://127.0.0.1:8779/revealline-mmm/`. The build copies the verified `app/` tree into `dist/`; Pages publishes that tree only. Normal builds are self-contained and do not download the upstream repository or use its deployed website.

## Adopt updates from the main game

`brand.config.json` defines this app's selected edition. `upstream.lock.json` records the exact upstream commit, input hashes, and generated output. `app/` is the selected runtime source and media produced by the upstream standalone-edition compiler, followed by the branded isolation projection. No unrelated upstream repository history is copied into this repository.

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

Keep general gameplay fixes in the upstream game. Keep this repository's changes in its brand configuration, extraction policy, and tests, then regenerate `app/`. This limits divergence and lets the same process import later engine fixes. Do not routinely hand-edit generated engine files.

Campaign, map, lesson, and asset identities are preserved. This preserves upstream's content and replay compatibility rules; it is not a promise that every historical replay works after a gameplay change. Coupa saves remain in the edition's namespace. Future brands need their own repository, selected edition, Pages path, isolation checks, and application/storage identity. Never combine their catalogs in a branded distribution.

A new upstream UI or content format can require a deliberate projection update. Automated checks enforce the release boundary; human playtesting still covers gameplay feel, art, audio, and device behavior.

## Deployment

Pushes to `main` run tests and verification, build the app, deploy to GitHub Pages, and verify the published commit in `deployment.json`. Pull requests run the build without deploying. `upstream.lock.json` identifies the game source separately from the dedicated repository's deployment commit.

The source content and artwork retain their upstream attribution and provenance. This community application does not perform live Coupa operations.
