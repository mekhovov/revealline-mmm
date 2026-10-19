# Round 27 — initial candidate offline browser check

Date: 2026-09-12. Candidate **0.17.0-format-candidate**, build ID `589100977e9f3e2b155e366e13b954db0c37804f163a1c1d6121b0af2b430c8e`.

**Offline opening, collection access and a saved-flight completion passed in this candidate. A stale gallery image was also observed, so this is not final presentation acceptance.** The initial candidate and all raw captures remain evidence of that mixed result. A corrected candidate requires separate verification before freezing; a later successful image decode does not erase the earlier defect.

## Offline preparation and fresh opening

The visible Verify offline files control reported ready with **135 / 135 files verified**, **31,763,286 bytes**, and empty missing/corrupt lists. The [offline-ready snapshot](../../../.cache/round-27/candidate-browser/offline-ready.txt) includes the exact version and build ID above. Cache availability remains conditional on the browser retaining its storage.

The operator then stopped the local candidate server on port 8837, execution session 9028. A subsequent curl connection check was refused with exit code 7. A fresh game tab could open using the prepared offline files. This is a stopped-local-server check, not an emulated physical-device or general network-failure certification.

The initial fresh tab displayed the existing another-tab/session-only warning while the original game tab still owned the writer lease. The operator closed that original tab and reloaded the fresh tab a second time, resolving the warning. Collection viewing while the warning was present is read-only evidence; it is not evidence that those earlier actions persisted progress. The later restored-flight journey occurred after this recovery of the normal tab lifecycle.

## Four collection pictures and the decode defect

The candidate profile showed four collected pictures. All four were opened through collection controls. Retained captures include [Garden](../../../.cache/round-27/candidate-browser/offline-garden.jpg), [Neon](../../../.cache/round-27/candidate-browser/offline-neon.jpg), [Clear Ledger](../../../.cache/round-27/candidate-browser/offline-ledger.jpg), and the [initial Copper Orchard view](../../../.cache/round-27/candidate-browser/offline-homeward.jpg). The [import snapshot](../../../.cache/round-27/candidate-browser/collection-import.txt) records four pictures and one equipment seal. The existing Garden celebration was also exercised; its [captured frame](../../../.cache/round-27/candidate-browser/offline-garden-celebration.jpg) does not by itself establish the complete animation duration.

The initial `offline-homeward.jpg` visibly pairs the **Copper Orchard** title and Steady Signal metadata with the **previous Clear Ledger canal-city image**. It must not be presented as a correct Homeward picture or complete four-picture visual pass. The observed transition exposes a stale-image presentation problem while the newly selected image decodes asynchronously.

After decode, the [later Copper Orchard screenshot](../../../.cache/round-27/candidate-browser/offline-homeward-after-decode.jpg) shows the correct orchard/lake landscape under that title, and the [later DOM snapshot](../../../.cache/round-27/candidate-browser/offline-homeward-after-decode.txt) records the completed-picture image and collection actions. The operator inspected this later image. Thus the Homeward bytes remained accessible offline, but the early display was misleading. These two captures concern different points in the journey; the later capture was taken after the Neon completion below and is not an immediate-before/after timing measurement. The gallery loading presentation is being corrected separately before the next candidate.

## Actual saved Grid-center completion

The supplied `workshop-02-grid-center.session.json` was generated from the existing legal ordinary route, stopped at **tick 1543** with a live cut. That tick is input-fixture metadata, not a browser HUD time. Loading it through the public saved-file flow reconstructed Neon Switchboard and left it paused: **33.2%**, **5,600 points**, **three lives**, one of two cartridges, and **0:52 remaining**. The [loaded snapshot](../../../.cache/round-27/candidate-browser/offline-loaded-grid.txt) explicitly says that the saved flight was verified and restored and requires Resume.

After explicit Resume and normal direction input, the level completed at **72.2%**, **12,080 points**, **three lives**, and two of two cartridges. The [win snapshot](../../../.cache/round-27/candidate-browser/offline-win-grid.txt) and [win screenshot](../../../.cache/round-27/candidate-browser/offline-win-grid.jpg) record that result. The HUD's **0:51 is remaining mission time**, not elapsed play time. A later result snapshot reports `0:13` elapsed. The optional Power Circuit seal remained unearned on this ordinary Interceptor route.

This was a real replay-backed restoration followed by gameplay inputs; it did not inject a win or mutate private simulation state. The browser hold duration is not a claim of final per-tick equality with the automated proof. This single Grid-center completion also does not replace the source's broader two-policy route evidence or prove every map offline.

## Scope and follow-up

The captured [console result](../../../.cache/round-27/candidate-browser/console.json) is an empty array. That is the result returned at the observation, not an assertion that every prior session was continuously monitored.

No source gates were rerun for this report, and no runtime, release or historical evidence was edited. The functional offline checks pass within the stated scope; the stale gallery image remains a concrete initial-candidate failure awaiting a new build and recheck. Public hosting, native execution, physical touch/controller behavior, storage eviction, universal viewport fit and player satisfaction are outside this evidence.
