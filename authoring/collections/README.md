# Locally owned native collections

The eight selected native packs in `content/archive/supplemental/` are editable source inputs, with 20 missions in total. The Neon Mosaic and Equipment Workshop inputs contain only their selected Coupa level. No other community's pack or procedural generator is needed to reproduce these missions.

`compile.mjs` projects these packs into the runtime recipe format. It retains exact campaign, mission, revision, geometry, class and simulation values. `inputs.json` admits each source by its hash and exact ordered mission identities. `npm run verify:collections` checks all outputs against the shipped local recipes; CI runs this before publishing.

To change a collection, edit its local native pack, compile it with `compileCollection`, update its admitted input hash, and update the local recipe/catalog checksums. Then regenerate `app/` through `sync:upstream` and run the complete tests and build. A gameplay change requires an explicit content revision and save/replay migration decision. Do not silently reuse a prior revision for different geometry.

The older multi-theme assembly scripts are historical provenance. Their owner-specific excerpts remain under `content/archive/generator-fragments/`; their shared layout engines stay upstream. This native-source workflow replaces the app's dependence on those mixed producers. Artwork sources, prompts and provenance remain in the ownership receipts and archive. This is not evidence that the historical repository purge is complete.
