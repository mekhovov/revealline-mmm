# Round 27 gallery loading follow-up

Date: 2026-09-12. This is a source fix after the earlier candidate review; previous candidate bytes and reports remain unchanged.

## Observed mismatch and cause

The parent agent's offline candidate check captured [Copper Orchard with Clear Ledger's city image](../../../.cache/round-27/candidate-browser/offline-homeward.jpg). The screenshot was taken immediately after choosing the next picture. Its Copper Orchard title and Steady Signal metadata belong to the selected record, while the canvas still contains the previously viewed illustration. This image is evidence of the loading defect, not evidence that the Copper Orchard artwork rendered correctly.

Source inspection confirms the boundary: `openPicture()` updated the title and opened the dialog before awaiting `drawPicture()` and the new image's asynchronous decode. The reused canvas remained visible during that interval. Existing generation checks prevented a late older decode from repainting a newer selection, but did not hide pixels already present before the new decode started.

## Implemented behavior

[library-panel.mjs](../../../game/ui/library-panel.mjs) now hides the canvas with `visibility: hidden` and `aria-hidden` before opening the next picture, preserving its layout box and the short-landscape grid. A `role="status"` metadata line reports Loading picture; `aria-busy` identifies the pending dialog. Celebration and Replay are disabled and their handlers also check an owned readiness flag. Back and Close retain their existing behavior.

Only a successful draw for the still-selected, open generation makes the canvas visible and enables the two actions. The theme and medal metadata are restored unchanged. Failed decoding keeps old pixels hidden, ends the busy state and explains how to retry. Closing or choosing another picture invalidates pending success and failure callbacks without moving focus or reopening a dialog.

Celebration preparation also catches rejected setup and checks that an authored background actually loaded. A failed reload leaves the already displayed completed picture available instead of starting a procedural fallback celebration. A successful retry clears the earlier failure message and restores the theme and medal before starting. It does not alter the renderer's loading pipeline.

No HTML, CSS, artwork, core, pack format, profile data or frozen release was changed for this follow-up. The changed tests are [gallery-focus.test.mjs](../../../game/test/gallery-focus.test.mjs) and the minimal style-capable DOM adapter in [gallery-reduced-effects.test.mjs](../../../game/test/gallery-reduced-effects.test.mjs).

## Primary-source rationale

Accessed 2026-09-12. The [HTML Standard's image decoding contract](https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-decode) specifies asynchronous decoding, promise completion and rejection, with an example that publishes an image after decoding. Our application of that contract is to publish the selected canvas only after its own successful draw; the selected-view generation remains an application responsibility.

The [W3C explanation of status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) identifies `role=status` as a technique for exposing application state without moving focus. The implementation supplies that role and visible loading/error text. Actual screen-reader announcement timing has not been tested here.

## Verification

The two focused suites pass **25/25** Node tests: 19 gallery lifecycle tests and 6 effective reduced-effects tests. Six lifecycle cases are new: deferred replacement hides the prior picture; stale success cannot enable a pending selection; stale rejection cannot overwrite a ready selection; current rejection can close and retry; rejected celebration setup remains recoverable; and a missing reloaded illustration cannot start a procedural celebration. The existing delayed-decode focus test now uses the enabled Close control while Replay is intentionally disabled.

These tests exercise the real panel handlers with controlled asynchronous decode promises. They do not decode PNG pixels or measure browser layout. Scoped lint and formatting checks are the follow-up source checks; real browser reload, rapid navigation and corrected offline captures are still pending and must be recorded separately before claiming candidate acceptance.
