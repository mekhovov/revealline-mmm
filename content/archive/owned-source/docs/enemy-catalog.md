# Enemy workshop and encounter feedback

Open `/authoring/enemy-catalog/` on the local development server, or the same route under an immutable release’s site. The current build configuration includes this authoring route. Source presence and an allowlist entry do not replace verification in the exact published artifact.

The workshop previews seven registered behavior roles, four original presentation families and three detail treatments. Choose a role, select its skin, enable/disable it for future generators, and Apply to save the catalog locally. Reload restores the last successfully saved choices. Export/import transfers a bounded 64 KiB JSON choice document; it does not pretend to contain custom image bytes or installed packs. Storage failure leaves the last saved choice set intact and reports the error.

**Try selected role** creates a new validated Classic scenario and opens the real game in practice mode. It uses the selected role's theme and chosen detail treatment, and offers the four classic contact pickups on the starting border. Border, contour and rover studies include a separate field seed because those roles do not own unrevealed territory. The relay study includes the required relay/core encounter. These are small behavior studies, not campaign replacements or measured reconstructions of XPOSED layouts. Practice does not award campaign progress. A selected role must be enabled before its study can open.

Keyboard Tab uses native dialog focus; arrows/Enter and the shared controller navigation adapter operate choices. A face button joins a standard controller, D-pad moves focus, South edits/accepts and East cancels an edit before leaving. Native operating-system file dialogs may still require keyboard/touch/mouse. The parent workshop stops polling while focus belongs to the practice iframe. Preview motion follows reduced-motion preferences; pause/hidden/lifecycle states hold its clock.

## Returning to the game

The standalone page keeps **Return to game** beside its existing workshop actions, including before startup finishes and when theme loading fails. It is a normal relative link to `../../game/`, so an immutable release or local edition returns to its own game entry. It does not restore the former Workshop menu or its opener, start or resume a flight, or automatically Apply unsaved authoring choices. Use Apply explicitly to keep those choices before leaving.

An untouched foreground visit opens the workshop automatically when registered themes are ready. If Return to game or another page control already has focus, or the player navigates, interacts, switches away, or hides the page during loading, readiness leaves the page and focus intact. Choose Open workshop explicitly to enter afterward. Returning to the foreground does not revive the retired automatic opening. Intent listeners retire with that opening. A terminal page departure removes startup listeners and prevents late theme responses from constructing controls, feedback or animation loops. A cached-page departure waits for restoration before finishing readiness or failure feedback, without reviving automatic opening; all startup listeners are removed when that attempt settles. Authoring drafts and explicit reload/Return recovery remain unchanged.

Back and Escape inside the catalog still close its dialog; they do not navigate away. When an untouched visit opened the catalog automatically, closing returns focus to the now-enabled Open workshop button, so forward page traversal can continue to Level playground and Return to game. Explicit opening retains its actual invoker. Only the current foreground close owns that restoration: an already closed panel, a reopened dialog, a newer close-listener focus choice or a child practice owner must not revive an earlier return target. The practice iframe retains its existing input and scoped Return to workshop bridge. The page's shared controller navigation can select Return to game after successful startup and once the dialog is closed; before startup completes or after it fails, the link remains an ordinary keyboard/pointer action.

The five page actions stay in their existing order: Open workshop, Level playground,
Return to Workshop, Return to game and Feedback comparison. They share a wrapping
layout with a 16px gap on both axes and at least 44px targets. That gap clears the
shared outward focus paint, including after Escape restores the Open action. Long
labels wrap without shrinking the chosen text size. Preserve all current language
and Workshop-return bindings when adapting earlier three-action proposals.

Layout review prompt: “At 320/390 portrait and 844 landscape, open the catalog,
move from Role to Presentation, then Escape. Verify the Open action owns visible
focus; Tab through enabled actions in their unchanged order, and all five when a
valid Workshop return context enables that link. Never remove its inert guard. Repeat in English
and Ukrainian, Theme/Plain and Standard/Large. Check target bounds and horizontal
overflow; record browser evidence separately from physical input and public play.”

Maintenance prompt: “Hold the real theme request, focus Return to game, then succeed; verify readiness and neutral controller frames retain that focus without opening a modal. Repeat with an untouched visit, existing Return focus, keyboard/pointer intent and leave/return during loading. Then hold and fail the request and verify Return to game is still a usable same-edition link without running authoring handlers. On an untouched ready visit, close through Escape and Back, verify Open workshop owns focus, then traverse forward to Level playground and Return to game. Repeat Back after choosing Return and preserve that newer focus. With an explicitly opened workshop, close through Back, reach the link by keyboard and modeled controller, and verify activation neither applies the draft nor writes player progress. Keep modal and practice input ownership intact. Check target size, focus visibility and actual navigation in portrait/short landscape separately from DOM tests.”

## Role contracts and art bindings

| Type             | Image slot | Fixed badge   | Purpose and risk                                                        | FPV / Ukraine / retro / business body                  |
| ---------------- | ---------- | ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `bouncer`        | `enemy`    | Diamond       | Hidden-field reflection; threatens the player/cut; field seed           | Tank / beetle / invader / invoice                      |
| `border-patrol`  | `patrol`   | Outer frame   | Circles the original perimeter; threatens secured ground                | Four-rotor craft / moth / shuttle / parcel             |
| `contour-patrol` | `contour`  | Nested corner | Follows changing captured contours; visibly rejoins a changed route     | Twin-rotor craft / serpent / crawler / audit cursor    |
| `claimed-rover`  | `rover`    | Feet          | Dormant until supported by claimed ground; warns before waking          | Wheeled patrol / hare / walking cabinet / expense cart |
| `eroder`         | `eroder`   | Bitten edge   | Warns before reopening eligible secured cells; protected anchors remain | Auger / thorn wheel / saw / shredder                   |
| `lane-boss`      | `boss`     | Parallel lane | Stationary timed lane emitter                                           | Radar / storm gate / laser pylon / approval gate       |
| `relay-sentinel` | `boss`     | Lock          | Linked staged core with an objective and opening requirement            | Relay / sunflower keep / fortress / policy vault       |

The seven silhouettes differ even with identical colors. Shape, fixed role color and the badge together identify risk. A frozen or dormant state does not replace the role's identity with a generic square. The actual collider stays marked at the simulation radius; cosmetic actor size remains independent. Existing user-owned image overrides still replace only the body and retain type badges, contact cores and state cues. Two boss types continue sharing the established `boss` image slot but keep distinct badges.

No source-game sprite, artwork, music or trademark logo was copied. FPV enemy forms depict fictional hostile military equipment without Z markings. Theme forms are original game abstractions, not measurements or representations of real combat capability. The visual problem was inspected in `docs/verification/round-34/frozen-game.jpg`: pale pickup plates and several shared actor outlines. Existing XPOSED reference evidence informs hierarchy and readability; current role behavior comes from the registered engine, documented in [Classic mechanics](classic-mechanics-design.md).

## Authoring and renderer interfaces

`game/enemy-catalog.mjs` exports immutable `ENEMY_CATALOG`, `emptyEnemyCatalogDraft(theme, style)`, `validateEnemyCatalogDraft(input)` and `enemyCatalogSelection(input)`.

The exact choice document is:

```json
{
  "version": "enemy-catalog-draft.v1",
  "theme": "fpv",
  "style": "hybrid",
  "entries": [{ "type": "bouncer", "enabled": true, "skinId": "bouncer.fpv.v1" }]
}
```

The example abbreviates the list: validation requires all seven roles exactly once. Each skin is `<registered type>.<fpv|ukraine|retro|coupa>.v1`; arbitrary skin names, executable fields, getters and duplicate roles are rejected. Inputs are copied and the validated result is deeply frozen.

`enemyCatalogSelection(draft)` returns `{allowedTypes, actorSkins, style}`. Future map generators consume `allowedTypes` when creating a **new authored edition**, then run ordinary geometry/content validation. An empty allowed set is valid as a catalog preference, but does not waive the level validator's requirements. This helper never filters an existing level or mutates a live run. Existing score/save/pack identity remains unchanged.

`BoardPainter.draw(..., {actorSkins})` accepts a cosmetic type-to-skin mapping; invalid selections fall back to the theme's registered family. Explicit image-slot overrides take precedence. `actorSkins`, catalog `enabled`, and `skinId` are **not accepted actor/pack/scenario fields**. The standalone single-role practice selects its theme through the existing scenario schema. Arbitrary mixed skins in published packs require a deliberate future presentation-schema extension; the workshop does not silently serialize unsupported data.

`attachEnemyCatalogPanel({document,initialDraft,onApplyDraft,onPreview,onExport,onError,onClose})` owns its dialog and exposes `open`, `close`, `update`, `snapshot`, `dispose` and `dialog`. Apply awaits the host save callback before advancing the saved baseline. Mutating actions disable controls during asynchronous work. The standalone host uses this seam for local storage, download and validated practice; other authoring hosts can provide their own persistence.

## Pickups, impacts and recovery

All four pickups use opaque dark plates and pixel glyphs: pink heart, gold double chevrons, violet hourglass, cyan snowflake. Ordinary desktop plates target at least 18 CSS pixels and phone plates at least 14, with a 56-logical-pixel cap. Uploaded pickup bodies retain a colored type badge. Timed effect chips read `run.tick`; enemy warning clocks read `classic.actorTick`. Short labels keep the time visible on phones. No presentation clock extends an effect.

`BoardPainter.effectsFor(events, run)` copies event-time coordinates immediately. The real solo/couch hosts should call it after each fixed step. Pickup positions resolve from the immutable pickup ID even after collection removes the item from the visible list. Failure/recovery uses `run.player` only when event and state ticks match; a batched replay without historical coordinates does not fabricate a wreck location. Explicit event x/y always wins. Older callers remain supported, with position-dependent feedback omitted if no reliable point exists.

Pickup bursts and labels, themed craft fragments, shield and ready cues remain in the bounded eight-effect queue for less than 0.7 seconds. Ordinary Pause holds their age; reduced effects keep static meaning and omit moving debris. The solo terminal-loss presentation is the one explicit exception: the world, recorded inputs and authoritative result are frozen while only the local failure effect advances for 0.65 rendered seconds, before Retry/Main menu appears. Each visible frame contributes at most 0.1 seconds; no background timer advances the sequence. Show defeat menu skips immediately with a fresh keyboard/controller command or pointer activation. Held Confirm cannot carry through into Retry. Pause, a dialog or focus loss holds the presentation; returning focus never resumes gameplay, and Show defeat menu remains the explicit exit. Nonterminal failures retain the existing simulation-driven recovery. FPV uses CRAFT LOST, Ukraine/retro LIFE LOST and business LINK LOST, each with −1 LIFE. Recovery's visible countdown reads `respawnAt - time`; the wreck stays at the copied contact point rather than moving to spawn. These effects cannot grant score, lives, items or achievements.

Optional `classic.lineImpact` comes from the registered core. Its at-most-48 live fronts are copied into the bounded `classicView` projection and drawn at their **current authoritative x/y** after the live trail. Forward and departure fronts have compact warm marks; no cosmetic interpolation, extrapolation, damage radius or second movement clock exists. Seed sparks are local cosmetic events. Clearing the core fronts on capture/recovery removes their markers. Reduced effects retain the hazard, and pause cannot move it.

## Verification and remaining release gates

Focused Node checks cover strict catalog data; all 28 role/theme studies validating and executing ordinary fixed-tick input; distinct body geometry before badges; independent custom images; dark four-glyph pickup plates; event coordinate ownership; actual pickup/timer projection; real line-impact contact and clearing; pause/authority invariance; modal save/import failure handling; and shared controller focus/edit/Back behavior. Existing actor, Classic, responsive-host, couch and replay-theater suites remain part of the affected set.

```sh
node --test game/test/defeat-presentation-host.test.mjs game/test/terminal-navigation.test.mjs game/test/enemy-catalog.test.mjs game/test/enemy-catalog-panel.test.mjs game/test/actor-presentation.test.mjs game/test/classic-presentation.test.mjs game/test/host-presentation-size.test.mjs game/test/couch-navigation.test.mjs game/test/replay-theater.test.mjs
```

Canvas commands, DOM and hardware are modeled in these checks. They do not certify raster beauty, native file dialogs, physical controllers, phone performance, a campaign win for every role or human comprehension. Before release, inspect the workshop and actual game at 306/390/600/1152 CSS-pixel arena widths, both turning policies, custom role imagery, pause/freeze, pickup collection, life loss, respawn, traveling impacts and reduced effects. Verify the already-allowlisted authoring route in the exact frozen artifact. Preserve previously published releases and their historical evidence unchanged. The Return/readiness correction has its own source, native and public acceptance records.
