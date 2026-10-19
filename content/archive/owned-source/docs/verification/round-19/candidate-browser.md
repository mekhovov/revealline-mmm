# Round 19 packaged candidate

Observed 12 September 2026 in the Codex in-app browser at the owned origin `http://127.0.0.1:8812/game/`. The build came from the [tested source inventory](source-inputs.json), used label `v0.9.0-rc1`, and had no committed source revision. It is candidate evidence, separate from the subsequent immutable release.

The build contained **118 manifest assets**. Its distribution ZIP SHA-256 was `80c8643a94102511f7a36bcc73f3c50f6847b794bb71e4c5f2e7aabeec860e23`. The server returned HTTP 200 with the configured content security and MIME-sniffing headers. The player installed Equipment Workshop through the ordinary expansion control.

## Three playable goals

Each attempt imported a suspended session through the actual Saves & loads file picker. The fixtures were generated using public run, input recording, suspension and restore APIs against the shipped Workshop maps. They stopped 24 ticks before their expected win; they did not inject a completed state. The browser resumed each attempt and supplied the final direction using tap steering. These are replay-prefix-plus-live-input checks, not three manually flown complete routes.

| Map               | Steering and equipment                    | Live final input | Result                                  | Saved seal     |
| ----------------- | ----------------------------------------- | ---------------- | --------------------------------------- | -------------- |
| Clear Ledger      | Immediate; Impact craft                   | Right            | 73.1%, three lives, 11,740 points, gold | Safe Reconcile |
| Garden of Threads | Grid + buffer; Fiber                      | Right            | 74.1%, three lives, 12,590 points, gold | Steady Thread  |
| Neon Switchboard  | Immediate; Light carrier to Heavy carrier | Up               | 71.1%, three lives, 11,910 points, gold | Power Circuit  |

Clear Ledger's completed picture opened in the gallery with its actual class, steering policy and seal. The final Collection showed all three themed cards and the full-chapter Last light achievement. [The picture view](screenshots/candidate-clear-ledger.jpg) and [completed Workshop collection](screenshots/candidate-workshop-collection.jpg) preserve the visible results. Their procedural backgrounds are existing render styles, not newly commissioned paintings.

The exported player profile was **5,817 bytes**, SHA-256 `b211d62d881dd01be33451a506cf2aa159672b81e4e630438751232195e4a1c6`, containing exactly **three pictures, three scores and three seals**. Counts and the local evidence path appear in [profile-checks.json](profile-checks.json). Sampled browser warnings and errors were empty.

One QA click incorrectly assumed the main View picture button opened a modal; it actually hides the results overlay to expose the board. Closing a gallery picture returns to Collection. Following those existing navigation paths worked without a product change. The review also identified the pre-existing four-clear cosmetic/Pathfinder threshold as unreachable within a three-map chapter; that is planned as the next player-polish increment rather than described as fixed here.

Source authoring, replacement, archival, preview isolation and measured viewport evidence are recorded in [source-browser.md](source-browser.md). This candidate check does not certify physical touch/controllers, native hosts, network play, arbitrary pack solvability or human enjoyment. Offline frozen-artifact verification follows separately.
