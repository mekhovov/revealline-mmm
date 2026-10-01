# Branded app boundaries

This repository contains one isolated Coupa app. Read README.md before editing the extraction pipeline.

- `app/` is generated from a pinned RevealLine commit and the reviewed projection in `scripts/isolate-brand.mjs`. Make engine changes upstream, or change the projection and regenerate; do not silently overwrite hand-edited generated files.
- Keep the selected upstream campaign, lesson, artwork, replay, and save identities. Repository branding is independent of content identity.
- Do not add default-game content, other communities, FPV SIM, authoring/store pages, or links back to those applications.
- Every upstream update must pass `npm test` and `npm run build`. Projection mismatches must fail rather than falling back to the full game.
- Pages deploys only the verified `app/` content from `main`, never a whole upstream checkout. Pull requests run checks without deploying.
