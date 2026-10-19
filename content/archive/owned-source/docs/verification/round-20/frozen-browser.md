# v0.10.0 frozen browser and offline check

Verified 2026-09-12 against tag `v0.10.0`, source commit `40ae9d23ad8737c4f77f9cc07923948133b7c09d`. The local QA server on port 8817 used the CLI from the extracted source archive, with the frozen `site/` as its root. Working Round 21 code was not served.

## Observed result

- Explicit offline preparation verified all **115 files**. Equipment Workshop installed through the normal library UI.
- The owned QA server was stopped; a connection attempt returned curl exit 7. The workspace server on 8767 was left running.
- Reloading the frozen game succeeded from its prepared cache. All subsequent imports, completion, collection and persistence checks happened with the 8817 server stopped.
- Imported a library containing two ordinary legal-input Workshop clears (Garden of Threads and Neon Switchboard, both silver, no seals), then the replay-backed Grid + buffer Clear Ledger session saved 24 ticks before its verified finish. These fixtures came from the public simulation and recording APIs; they are not claims of a complete manual playthrough.
- Resume and the visible Right control completed Clear Ledger at **73.1%, three lives, 11,740 points, gold**. Its Safe Reconcile equipment seal was earned.
- The final appearance message named Night signal FPV and Delta interceptor beside the picture. Collection showed three completed pictures, chapter progress **3 / 3**, and both last-tier appearances available. [Captured collection](screenshots/frozen-offline-collection.jpg).
- After another offline reload and selecting Equipment Workshop, both appearances remained available; the new-unlock message was empty. The campaign-complete state retained the three replayable maps.
- Normal UI library export retained **three pictures, three scores and one seal**. The exported JSON was 4,430 bytes, SHA256 `d17e57290dc2405af28d79029d5c8d63630a90504c7ed43caf4f431d4ed887f4`. This is separate from the source and candidate profiles.
- Browser error/warning log: empty. The owned QA tab was closed after export.

The saved player tab uses `http://127.0.0.1:8767/releases/v0.10.0/site/game/`, with Homeward Skies and Equipment Workshop installed through the UI. It starts ready for ordinary play and contains no imported QA rewards.

[Source browser checks](source-browser.md) cover out-of-order replayability, first/repeat/final appearance awards, cosmetic selection and compact layout. [Final candidate check](candidate-final.md) covers the corrected reward placement. [Independent integrity evidence](integrity-notes.md) verifies the source archive, ZIP, manifest, offline inventory and byte-identical rebuild, and preservation of all thirteen prior releases.

This is a same-browser local artifact check. It does not establish physical iPhone/controller behavior, public hosting, native store submission, or human enjoyment and retention.
