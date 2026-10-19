# Round 27 — corrected candidate offline browser check

Date: 2026-09-12. Candidate **0.17.0-gallery-candidate**, build ID `b593b45e9cd6f0f00ea037862d2e010333f82a6d5514836598efa325b85ea306`.

**Pass within the observed scope:** the corrected candidate reopened offline, displayed the selected original gallery artwork, completed a saved Immediate flight and retained the expected public profile after another offline reload. It is a working-tree candidate, not yet a frozen release. The [initial candidate report](candidate-browser-initial.md) and its stale-image screenshots remain unchanged.

## Actual serving and offline navigation

The candidate was served by the actual production CLI on port 8838, execution session 71861. The retained [HTTP response](../../../.cache/round-27/gallery-candidate-browser/response-headers.txt) records status 200, HTML MIME type, `no-cache`, `nosniff`, the production Content Security Policy, Referrer Policy and Permissions Policy. This verifies the local response, not a public host's configuration.

The visible offline verification reported **135 / 135 files**, **31,764,926 bytes**, and no missing or corrupt entries. Its [ready snapshot](../../../.cache/round-27/gallery-candidate-browser/offline-ready.txt) includes the exact candidate version/build ID. The operator stopped that server and a curl connection check was refused with exit code 7.

The browser then navigated the **same page** to the game URL with the server stopped, causing an actual offline document load. This was not a fresh second tab. Workshop and Homeward had been installed, and the source's exported profile of four pictures, ten scores and one seal had been imported through the public UI. Cache retention and those already prepared local data are prerequisites of this observation; it does not demonstrate first-time installation without a connection.

## Correct selected artwork

The operator repeated Clear Ledger → Copper Orchard. The [first captured Copper Orchard frame](../../../.cache/round-27/gallery-candidate-browser/homeward-first-frame.jpg) already contains the correct orchard/lake painting, rather than the preceding canal city. The later [ready screenshot](../../../.cache/round-27/gallery-candidate-browser/homeward-offline-ready.jpg) and [DOM snapshot](../../../.cache/round-27/gallery-candidate-browser/homeward-offline-ready.txt) confirm that selected picture and its Steady Signal line. The [preceding Ledger capture](../../../.cache/round-27/gallery-candidate-browser/ledger-offline-ready.jpg) preserves the transition's source.

This check addresses the concrete stale-pixels defect observed in the initial candidate. It did not deliberately stall decode or force an image error in the browser; deferred/rejected decode and stale-request behavior are covered by the separate scoped tests. It also does not establish that a loading status must visibly appear on a fast successful decode.

Garden's Play celebration control was clicked and observed about 700 ms later in the [celebration capture](../../../.cache/round-27/gallery-candidate-browser/garden-offline-celebration.jpg). The [Neon ready view](../../../.cache/round-27/gallery-candidate-browser/neon-offline-ready.jpg) shows its correct arcade-room artwork. These are static captures of actual actions, not measurements of the complete animation timeline.

The screenshots are **1280 × 720**. Copper Orchard's full painting is visible, but the bottom of its action row is partially clipped before the button interaction scrolls it into view. This report does not claim that all actions are simultaneously unclipped at every viewport. The observed artwork-selection correction is distinct from that existing vertical scrolling behavior.

## Actual completion and retained records

The legal `workshop-01-immediate` saved prefix was loaded through the normal file flow. The [loaded snapshot](../../../.cache/round-27/gallery-candidate-browser/offline-loaded-immediate.txt) shows Garden of Threads paused at **38.9%**, **6,590 points**, three lives, one of two memories and 0:58 remaining. The verifier left the flight paused and the player explicitly chose Resume.

Normal Right input completed the cut and mission at **74.1%**, **12,590 points**, **three lives** and **two memories**. The [win snapshot](../../../.cache/round-27/gallery-candidate-browser/offline-win-immediate.txt) and [screenshot](../../../.cache/round-27/gallery-candidate-browser/offline-win-immediate.jpg) record the result. **0:58 is the remaining mission countdown**, not elapsed completion time. The ordinary Interceptor route correctly left optional Steady Thread unearned. No private-state mutation or invented win was used; browser input duration is not a claim of final tick equality with an automated proof.

After another same-page offline reload, Export player library produced the retained [public JSON](../../../.cache/round-27/gallery-candidate-browser/offline-retained.library.json), accompanied by its [UI snapshot](../../../.cache/round-27/gallery-candidate-browser/offline-retained.txt). It contains **four pictures, ten distinct scored run IDs and one Steady Signal seal**. Reusing the original attempt ID did not add a duplicate result. The ten records remain three old Workshop runs, six Workshop browser runs and one Homeward Fiber run; the sole seal still belongs to Homeward Copper Orchard. The export's SHA-256 is `2c50aefc3f377d937e4dccd82b365f1cb7ccc64856dfd7e66b3dec6f72a1e00b`, matching the imported source profile exactly.

## Verification scope

Both captured console results, [before reload](../../../.cache/round-27/gallery-candidate-browser/console-before-reload.json) and [after reload](../../../.cache/round-27/gallery-candidate-browser/console-after-reload.json), are empty arrays. They record those observations, not continuous monitoring of every earlier session.

The [loading follow-up](source-gallery-loading-followup.md) passed **25 scoped tests, including six new cases**, plus lint, formatting, validation and a fresh candidate build. The earlier **1,550-test full suite was not rerun** on the later loading-guard source; those scopes remain separate. This browser report performs no additional source gates and changes no runtime or prior evidence.

These results support acceptance of this corrected candidate for the recorded local offline/gallery/save journeys. Final Git freeze, archived-byte integrity and frozen-release offline checks remain separate steps. No public deployment, physical touch/controller behavior, native execution, universal viewport fit or human enjoyment is established here.
