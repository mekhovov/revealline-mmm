# Round 27 gallery loading: source-browser acceptance

Date: 2026-09-12. This addendum covers the reloaded working source after the [gallery loading fix](gallery-loading.md). It leaves earlier candidate artifacts and reports intact. The final rebuilt candidate is still pending; these observations are not frozen-release acceptance.

## Observed public UI journey

The parent agent reloaded the source page and used the actual collection and gallery controls. An independent visual review inspected the resulting captures:

1. Opened Garden of Threads and played its celebration, then waited approximately 650 ms. [The captured frame](../../../.cache/round-27/gallery-loading-browser/solo-garden-celebration-final.jpg) shows the correct garden illustration with stitch effects, its title and gallery actions.
2. Opened Neon Switchboard and waited approximately 450 ms. [The ready view](../../../.cache/round-27/gallery-loading-browser/solo-neon-ready-final.jpg) shows the matching nighttime room illustration.
3. Opened Clear Ledger and then Copper Orchard without an intervening wait, followed by approximately 450 ms for the final view. [Copper Orchard now shows its orchard artwork](../../../.cache/round-27/gallery-loading-browser/solo-homeward-ready-final.jpg), with the matching title and Steady Signal seal. The [DOM capture](../../../.cache/round-27/gallery-loading-browser/solo-homeward-ready-final.txt) also records enabled gallery actions and focus on Close. The previous candidate's title/image mismatch is preserved as defect evidence in the linked loading-fix report.
4. Activated Replay mission. The [resulting mission view](../../../.cache/round-27/gallery-loading-browser/solo-gallery-replay-ready.txt) is Copper Orchard at Ready: 0.0% revealed, three lives and score 00000. Start mission has focus; playback did not automatically start a flight.

The [ready-state inspection](../../../.cache/round-27/gallery-loading-browser/source-first-inspection.json) records Copper Orchard, restored `FPV Front / GOLD` metadata, a visible canvas, `aria-busy="false"` and both actions enabled. The [captured source console](../../../.cache/round-27/gallery-loading-browser/source-console.json) is empty.

## Layout observations and evidence limits

The parent-visible preview controls and readout show requested and reported 844 × 390 and 320 × 640 CSS-pixel viewports. The [landscape Garden view](../../../.cache/round-27/gallery-loading-browser/landscape-garden-ready.jpg) and [landscape Copper Orchard view](../../../.cache/round-27/gallery-loading-browser/landscape-homeward-ready.jpg) show the full correct picture beside title, close control and all three actions; Copper Orchard's seal also fits.

The later [compact Garden celebration capture](../../../.cache/round-27/gallery-loading-browser/compact-garden-celebration.jpg) includes the whole embedded frame and shows its picture, title, close control and three actions together. The earlier [compact ready capture](../../../.cache/round-27/gallery-loading-browser/compact-garden-ready.jpg) is cut off by the outer parent viewport. That earlier outer crop is not evidence of clipping inside the game frame.

The saved [landscape geometry JSON](../../../.cache/round-27/gallery-loading-browser/landscape-geometry.json), captured at `2026-09-12T16:27:08.950Z`, is a fresh capture from this journey and reports an 844 × 390 viewport with 11 flight targets. The screenshot showing the retained-capture notice preceded the later Capture activation and JSON read. Those measured targets are the flight controls beneath the open gallery overlay; their rectangles do not establish unobscured access through the modal or certify physical-device interaction. The gallery layout conclusions above come from the visible picture and dialog controls in the new screenshots.

The automation did not resolve the brief loading interval before decoding finished within its call. It did not inject decode failures or game state through the browser. Deferred loading, stale completions, error recovery and celebration retry remain covered by the separately reported **25 focused Node tests**, including six new lifecycle cases; those tests are not additional browser observations. No tests were rerun for this addendum.

The source collection showed six cards—three Homeward pictures and three Workshop pictures—rather than the earlier four-picture profile. This follow-up does not establish when that difference arose, compare profile bytes or claim preservation of the earlier profile. The exercised scope was gallery viewing and celebration plus explicit Replay mission selection; it was not a storage or award audit. No physical controller, touch hardware, screen reader, text zoom or full-animation timing claim is made.

No new concrete picture or layout mismatch was found in the independently inspected settled captures. Candidate rebuild and its own browser/offline checks remain separate acceptance steps.
