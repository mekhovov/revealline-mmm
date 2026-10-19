# Locally owned Coupa chapter generators

`files/` owns the five chapter definitions, 30 mission layouts, progression,
lessons, discovery rewards, lesson test fixtures, themes and character presets.
These are editable authoring sources, separate from the generated `app/` tree.
`inputs.json` retains the artwork revision ledger, asset descriptors and class
contracts used by the original chapter producer.

The original shared registries were split to keep only this community's data.
The six original edition identities remain in the authoring catalog for retained
content compatibility; the app still selects only `coupa-all`. The other five
edition startup files are checked against preserved originals in the authoring
archive and are not additional launch destinations.

Verify the local generators with a checkout containing the exact engine commit
recorded in `upstream.lock.json`:

```sh
npm run verify:authoring -- --source /path/to/revealline
```

To fetch just the pinned engine inputs from GitHub:

```sh
npm run verify:authoring -- --remote
```

The verifier stages local generators with generic engine modules read from
committed Git objects. It never reads uncommitted upstream changes, and missing
owned modules cannot fall back to the upstream community registry. It compares
all 48 generated JSON files with the current local content and preserved startup
files. JSON values must match exactly, retaining campaign, lesson, map and save
identities. The catalog's formatting is allowed to differ. The four lesson test
fixtures are also constructed and validated. CI runs this check before publishing.

For an intentional content update, review the authoring source and its generated
native project data together. Update revision and migration records when an
identity changes, then regenerate `app/` through the normal pinned extraction.
The verification command is read-only and does not silently publish edited data.

These generators cover the five primary chapters. Supplemental collection
generators and historical ownership migration remain separately tracked work;
the provenance excerpts under `content/archive/` are not executable replacements.
