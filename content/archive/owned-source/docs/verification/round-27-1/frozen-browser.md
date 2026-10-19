# Round 27.1 — frozen v0.17.1 offline browser journey

**Offline preparation, offline content installation, flight continuation and profile retention passed in the recorded journey. Gallery celebration acceptance remains incomplete:** the main-game console captured a celebration timing exception. The screenshots show the correct artwork, but this is not a clean-console or complete-animation pass.

This report covers the exact frozen `v0.17.1` release, source `efd5fe025a9fe3f1688a11f1be9400018f8e793d`. The [independent archive audit](integrity-notes.md) confirms its final tested normal worker, all 343 source inputs and exact archived-CLI rebuild. Unlike the earlier diagnostic copies, this build enforces ordinary install/activate readiness. Its first public Prepare attempt reported **135 / 135 files**, **31,764,790 bytes**, no missing/corrupt entries, and build `49e3361dfc09d58c0aa8c8b63f06f505306d8354c2c6482ddec537406b78ba45`: [ready snapshot](../../../.cache/round-27-1/frozen-browser/offline-ready.txt).

## Server shutdown and first offline content installation

Root served `releases/v0.17.1/site` through the root production CLI on port **8844**, session **93567**. The retained [HTTP response](../../../.cache/round-27-1/frozen-browser/response-headers.txt) has status 200, HTML MIME type, no-cache, nosniff, production CSP, Referrer Policy and Permissions Policy. The server was then stopped. The [connection check](../../../.cache/round-27-1/frozen-browser/server-stopped.json) records curl exit **7**, connection refusal at **2026-09-12T17:08:52.409463+00:00**, and the stopped session.

Root navigated the game URL again in the **same tab**, causing an offline document load. **Only after shutdown**, Equipment Workshop and Homeward Skies were installed through Library: [Workshop installed](../../../.cache/round-27-1/frozen-browser/workshop-installed-offline.txt), [both packs installed](../../../.cache/round-27-1/frozen-browser/both-packs-installed-offline.txt). Thus this checks first installation of those bundled packs into the player library while offline, using previously prepared shipped files. It does not demonstrate obtaining uncached content without a connection.

The original player library was then imported through the public Save JSON flow: [import snapshot](../../../.cache/round-27-1/frozen-browser/profile-imported-offline.txt). It contains two campaign records, four pictures, ten scores and one Homeward Steady Signal seal. No private storage mutation was used to create progress for this journey.

## Artwork and legal flight continuation

Root opened all four pictures; the report author also inspected their saved screenshots. Each title has its expected original artwork: [Garden of Threads](../../../.cache/round-27-1/frozen-browser/garden-celebration-offline.jpg), [Neon Switchboard](../../../.cache/round-27-1/frozen-browser/neon-offline.jpg), [Clear Ledger](../../../.cache/round-27-1/frozen-browser/ledger-offline.jpg), and [Copper Orchard](../../../.cache/round-27-1/frozen-browser/homeward-offline.jpg). Garden's Play celebration control was pressed before its static capture; that image does not establish an animation timeline, and the exception below prevents calling celebration successful. At **1280 × 720**, Copper Orchard's picture, title and seal are visible, but its bottom action row is partly clipped before native scrolling. This is not an all-actions-visible claim.

The existing legal [workshop-01-immediate.session.json](../../../.cache/round-27/browser/workshop-art-20260912154036973/workshop-01-immediate.session.json) prefix was imported through Save JSON while offline. The [restored state](../../../.cache/round-27-1/frozen-browser/immediate-loaded-offline.txt) is paused at **38.9%**, **6,590 points**, **three lives**, one of two memories and **0:58 remaining**. Root explicitly chose Resume and used the normal Move right control.

The mission finished at **74.1%**, **12,590 points**, **three lives** and **two memories**: [result text](../../../.cache/round-27-1/frozen-browser/immediate-win-offline.txt), [full-page screenshot](../../../.cache/round-27-1/frozen-browser/immediate-win-offline.jpg). The result displays **0:31 elapsed**; the HUD's **0:58** is the remaining mission countdown. Optional Steady Thread stayed unearned. This was a public-input continuation of a verified saved prefix, not an injected win, and the browser input duration is not a claim of exact final replay ticks. The full-page capture includes a large blank area; the numerical result above is supported by the DOM snapshot, not a claim that the screenshot proves every action initially fits in one viewport.

After another offline reload, Root used Export player library: [public export snapshot](../../../.cache/round-27-1/frozen-browser/retained.txt). The [retained JSON](../../../.cache/round-27-1/frozen-browser/retained.library.json) is **8,927 bytes**, SHA-256 `2c50aefc3f377d937e4dccd82b365f1cb7ccc64856dfd7e66b3dec6f72a1e00b`. Independent decoding of the Save JSON string in the import snapshot confirms byte-for-byte equality with this export: **two campaigns, four pictures, ten scores and one seal**, with no additional result or reward. Reusing the recorded attempt ID remained idempotent.

## First offline Playground visit

The first Playground visit occurred in a **fresh second tab after shutdown**. Its real solo preview loaded the Landscape preset at **844 × 390 child CSS pixels**: [snapshot](../../../.cache/round-27-1/frozen-browser/landscape-offline.txt), [reviewed screenshot](../../../.cache/round-27-1/frozen-browser/landscape-offline.jpg), and [geometry capture](../../../.cache/round-27-1/frozen-browser/landscape-geometry.json).

The geometry's actual `capturedAt` is **2026-09-12T17:11:50.260Z**, after the recorded connection refusal. It reports all **11 flight targets** present, visible, enabled and inside the child viewport, minimum **44 × 44**, with no target/arena intersections or horizontal page overflow. The **353.33 × 264.99** arena lies wholly inside the child viewport; the screenshot also shows Read details and Start mission. The parent displays the preview at approximately **83.77% scale**: the reported dimensions are child CSS pixels, not the displayed screenshot's physical target size. The child document is 398 pixels tall, so no claim of zero vertical overflow is made. This fine-pointer browser capture does not emulate coarse input or establish touch comfort, safe-area behavior or every later state.

## Recorded exception and limits

Both [main-game console before reload](../../../.cache/round-27-1/frozen-browser/console-before-reload.json) and [console after reload](../../../.cache/round-27-1/frozen-browser/console-after-reload.json) contain the **same single timestamped error**, at **2026-09-12T17:10:40.835Z**:

```text
TypeError: Celebration dt must be finite and nonnegative
  at advanceCelebration (game/ui/celebration.mjs:29:11)
  at BoardPainter.draw (game/ui/render.mjs:217:26)
  at frame (game/ui/library-panel.mjs:634:22)
```

These two retained captures repeat one event; they do not prove two independent failures. The [Playground console](../../../.cache/round-27-1/frozen-browser/console-playground.json) is empty. The exception does not erase the observed successful offline file verification, pack installation, win and exact profile retention, but it prevents a clean-console or successful-celebration claim. This report records the symptom, not an established cause or repair.

The frozen v0.17.0 installation failure and all diagnostic evidence remain unchanged in the [earlier investigation](../round-27/frozen-offline-investigation.md). This report adds no runtime edits or new browser actions. It establishes no public-host readiness, physical controller/touch result, native execution, universal layout fit or player-enjoyment certification.
