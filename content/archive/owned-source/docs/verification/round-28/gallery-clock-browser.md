# Gallery clock: source-browser follow-up

**The observed source celebration checks passed:** all four theme families showed their expected overlays after Play celebration, rapid restarts remained usable, reduced effects showed the clean completed picture, and the final console capture is empty. This is the unfrozen source served on port **8845**, displaying **v0.17.1 / DEV**, with `game/ui/library-panel.mjs` SHA-256 `2bef5afb93d5034b37143286321075cc5a3fa9d7c406c64f5f67c929f74c1eec`. The fix is intended for the later v0.18 integration; it does not alter or certify a repaired frozen v0.17.1.

Root installed Equipment Workshop and Homeward Skies and imported the existing source-final player library through public controls. It contains four pictures, ten scores and one Steady Signal seal. This gallery-only journey used the existing collection, without private state injection or new gameplay rewards.

## Visible celebration and restart checks

Root first pressed Play celebration for Garden of Threads and captured an [initial picture](../../../.cache/round-28/gallery-clock/browser/garden-first-frame.jpg) and a [later picture](../../../.cache/round-28/gallery-clock/browser/garden-later-frame.jpg). Those two static captures alone do not establish motion. Root then made two immediate restarts and another Play request with an intentional 700 ms capture delay.

Root switched pictures and requested the same delayed capture during each theme's celebration. Both Root and this report's author visually inspected the retained images:

| Picture / family                                                                                | Captured presentation                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [Garden of Threads / heritage](../../../.cache/round-28/gallery-clock/browser/garden-700ms.jpg) | Stitch/cross overlay on the original courtyard picture |
| [Neon Switchboard / 1990s](../../../.cache/round-28/gallery-clock/browser/neon-700ms.jpg)       | Neon particles over the computer-room picture          |
| [Clear Ledger / spend](../../../.cache/round-28/gallery-clock/browser/ledger-700ms.jpg)         | Connected square/checkmark nodes over the city picture |
| [Copper Orchard / FPV](../../../.cache/round-28/gallery-clock/browser/homeward-700ms.jpg)       | FPV celebration overlay over the orchard picture       |

The `700ms` filenames describe the requested capture delay, not measured rendering latency or an exact animation-frame count. These captures show effects during the celebrations; they do not record every stage or prove full browser-timeline completion.

Root checked Reduced effects through the normal UI, then replayed Copper Orchard. The [UI snapshot](../../../.cache/round-28/gallery-clock/browser/reduced.txt) records the checked preference, and the [reduced capture](../../../.cache/round-28/gallery-clock/browser/homeward-reduced-700ms.jpg) shows the completed picture without the FPV overlay. Root restored Reduced effects to unchecked afterward. The original pictures remain static PNGs; the effects are separate rendered overlays.

## Console and profile retention

Root inspected actual logs after each action group; no entries were observed. The retained [final console JSON](../../../.cache/round-28/gallery-clock/browser/console-final.json) is `[]`.

Root then used [Export player library](../../../.cache/round-28/gallery-clock/browser/retained.txt). The [retained JSON](../../../.cache/round-28/gallery-clock/browser/retained.library.json) is **8,927 bytes**, SHA-256 `2c50aefc3f377d937e4dccd82b365f1cb7ccc64856dfd7e66b3dec6f72a1e00b`. Independent byte comparison with the [original source-final export](../../../.cache/round-27/browser/observed/source-final.library.json) is exact: two campaign records, four pictures, ten scores, one seal, and Reduced effects false.

The [38-case focused source verification](gallery-clock.md) separately proves the first-frame regression, finite/capped progression, full deterministic finale completion, hidden-frame behavior and stale restart/close callback guards while keeping the strict validator unchanged. This browser journey did not inject timestamps, recreate the precise frozen timing, or exercise the backgrounding path. It establishes no physical-device, frame-rate or complete-animation-timeline guarantee. The [frozen v0.17.1 exception](../round-27-1/frozen-browser.md), its reports and current frozen-guide qualification remain preserved. No runtime, test, pack, source-image or existing evidence file was changed to write this report.
