# Round 14 — returning players, picture rewards and safe continuity

Research checked **12 September 2026**. This is a bounded recommendation pass, not an engagement study or an implementation report. Eight primary sources were checked. Historical patch notes describe particular changes; their current availability does not make those changes newly released. No new gameplay footage was watched or audio auditioned this round, and no artwork was copied.

The strongest immediate improvement is a reliable answer to **“What was I doing, and what can I play next?”** Pair it with a visible picture collection and explicit transfer from an earlier release. More currencies or longer reward sequences would not solve the present continuity gaps.

## Evidence already established; do not repeat the investigation

The [Round 06 observations](round-06-reloaded-observations.md) and [Round 07 UI/motion audit](round-07-reloaded-ui-motion.md) remain the direct XPOSED RELOADED evidence. In the previously inspected [Pack 6 recording](https://www.youtube.com/watch?v=-qG4k6dkd-c), gallery → picture preview → the same gallery is visible at **0:00, 0:03 and 0:05**. The gallery carries level identity, medals and scores. At **2:33–2:45.5**, completion leads to an unobstructed picture, medals, score and next/restart/menu actions. Roughly twelve seconds of observed presentation is a reference cadence, not proof that it cannot be skipped.

Earlier samples establish authored 70/80/90-percent quotas, level-specific speed medals, and continued play after a medal timer expires. They do not establish a universal capture formula, save/continue policy or difficulty menu. Recorded pack-star gates coexist with purchase actions and an apparently exceptional entitlement; do not copy them as an unquestioned mandatory grind. The 2016 XPOSED and 2023 SWITCHED editions remain separate evidence. We use only non-explicit arcade interaction details and original game artwork.

## Fresh primary-source findings

All links below were accessed on the research date. The direct PlayStation product URL initially timed out; its official concept page loaded successfully.

| Primary source                                                                                          | Verified statement                                                                                                                                                                                                                | Application to this game — design inference                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [XPOSED RELOADED — PlayStation publisher listing](https://store.playstation.com/en-us/concept/10002881) | The publisher presents rectangle enclosure, picture exposure, a completion quota and further level-pack unlocks. It is the 2021 PS4 release.                                                                                      | Make pictures and the next available board the main progression vocabulary. The listing supplies no retention statistics or proof of automatic continuation.                                 |
| [Celeste — official changelog](https://www.celestegame.com/changelog.html)                              | Changes include a Return-to-Map hint with the furthest-checkpoint picture, removal of “Give Up” submenu labels, skippable stat tallying, and assist speed not slowing deaths/cutscenes.                                           | Show where Continue leads; describe leaving neutrally; keep results skippable and presentation timing independent of difficulty.                                                             |
| [Dead Cells — Update 25, Practice Makes Perfect](https://deadcells.com/patchnotes/25)                   | The developer explicitly targets returning players with a training room and world map. Optional Aspects ease play while excluding specified boss-cell/flawless-achievement unlocks.                                               | Offer encounter rehearsal and disclose the exact consequence of a rule variant before launch. Do not infer that every assist in Dead Cells has those same restrictions.                      |
| [Dead Cells — Update 31, Boss Rush](https://deadcells.com/patchnotes/31)                                | Separate stages combine three or five tiered bosses, with distinct modified versions; progress earns customizable statue parts.                                                                                                   | Keep high-pressure sequences optional and give them an identifiable cosmetic/set reward. A boss stage should differ through readable patterns, not just a larger speed multiplier.           |
| [Steamworks — Stats and Achievements](https://partner.steamgames.com/doc/features/achievements)         | Achievements support descriptions and progress stats. The documentation recommends milestone notifications and saving at appropriate transitions, with completion callbacks.                                                      | Announce newly earned goals once, show progress toward the next goal and distinguish a local save from a prepared/session-only reward. This game has no Steam achievement integration.       |
| [MDN — Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)                   | Named locks coordinate participating contexts within one origin. Work holds the lock until its callback/promise finishes. `ifAvailable` reports a busy lock through a null callback argument.                                     | Use cooperative, fail-fast source access for release copying. A busy source is an understandable state, not a reason to steal its saving lease.                                              |
| [MDN — localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)              | Storage belongs to an origin; HTTP and HTTPS differ. Access may throw `SecurityError`; `file:` behavior is undefined. Private-session data is removed when its private session ends.                                              | Explain where this collection lives. Earlier paths on the same origin can be eligible for inspection, whereas another browser or native origin requires a portable file.                     |
| [WebKit — Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)          | WebKit documents best-effort storage, quota failures and origin-level eviction. Storage estimates are not guarantees; persistence requests depend on browser policy. Its described Storage API support starts with Safari/iOS 17. | Keep backup export useful even after storage failure. Feature-detect persistence requests and never call local storage a cloud backup or promise the iOS 15.4 target has Safari 17 behavior. |

## Baseline inspected before recommending changes

The frozen [v0.3.0 application](../../releases/v0.3.0/site/game/app.mjs) initializes `levelIndex` to zero. Its last-level action says “Back to first signal” and wraps to level one. A suspended-flight flow, gallery, original theme celebrations and local best-result records already exist. The [progress module](../../releases/v0.3.0/site/game/progress.mjs) gates a level on the preceding clear, keeps best results and exposes five achievements. The [challenge generator](../../releases/v0.3.0/site/game/challenges.mjs) already offers daily, calm and expert variants; these are not yet a global difficulty menu for every campaign.

Release profiles intentionally use separate keys. The writer lease and backup journal already protect participating writes. Recommendations below extend these foundations; they do not claim that returning-player UI or cross-release copying is already implemented. The root task is implementing those separately.

## Changes worth doing now

### 1. Make Continue a concrete, reversible choice

| Returning state                  | Main action                   | Supporting information                                                                                            |
| -------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Valid suspended attempt          | **Continue saved flight**     | Campaign, mission, class, achieved coverage and an explanation that restoration stays paused.                     |
| Clears exist; no active save     | **Continue: [next mission]**  | Next accessible uncleared board, a small image/mission card, and completed/total count.                           |
| Current campaign completed       | **View completed collection** | Completion state plus explicit replay, another campaign and optional mastery choices.                             |
| Earlier-release collection found | **Review earlier progress**   | Source version and content summary before any destination change.                                                 |
| No usable progress               | **Start first mission**       | Short controls and first objective; missing/unreadable data is described separately from a genuinely new profile. |

Choose the next board with `canPlay` plus actual clears, not highest array index or total stars. Preserve a deliberate mission selection; do not switch the board while someone is configuring a run. When every board is cleared, do not silently restart the campaign. A saved-flight card must not auto-resume movement or audio after loading.

**Acceptance:** reopen with levels 1–3 cleared → level 4 is offered; reopen with an interrupted level 2 attempt → its explicit saved-flight action remains available; complete the campaign → completion/collection is shown; rejected restoration retains the current session and an actionable explanation. Previewing a picture and returning restores gallery page, selection and focus.

### 2. Reward the picture, then show one useful next goal

Keep the existing clear-picture ending. Add a small result distinction: **new picture**, **new personal best**, or **replay complete**. Show a named missed target, such as “Clean flight: finish without losing a life,” rather than a generic demand to improve. A first clear already unlocks continuation; perfection should remain an optional reason to return.

The gallery should show campaign/set completion, earned pictures and an explicit replay action. Missing pack artwork should retain its earned record and explain which content is needed. A locked thumbnail can promise a subject or chapter without revealing the complete illustration. On a phone, show the artwork first and place actions below it; preserve the full-board aspect ratio rather than shrinking controls with the image.

**Acceptance:** repeated completion does not duplicate gallery entries or replay old unlock toasts; skipped/reduced-effects finales expose the same picture and information; failed persistence says “Collected for this session” and keeps export available. No “saved” claim precedes successful storage.

### 3. Give campaigns an ending and achievements a readable moment

On a new terminal completion, compare before/after achievement state and show only newly earned items, with their conditions. On imported old progress, list ownership without pretending the player just earned it in the current run. A modest milestone indicator such as **3 / 4 different missions** is more actionable than an unexplained locked icon.

After the final mission, offer an optional campaign overview: completed set, outstanding mastery targets, picture viewing and another world. Retain existing finale timing; the improvement is a clear finished state. Proposed original themes are a restored Ukrainian night skyline, an assembled heritage embroidery, a retro cabinet attract screen, and a Spend Network scene with illuminated savings nodes. These are presentation ideas, not historical claims or newly supplied assets.

**Acceptance:** final completion awards once; replay does not relock anything; Back returns to a usable collection screen; one deliberate input skips the presentation without also starting a new run. Every essential reward statement remains visible without audio.

## Difficulty and boss pacing: next authored iteration

Use the existing calm/expert challenge routes as the immediate optional choices, accurately labeled as separate challenges. Do not call them “campaign difficulty” until campaign variants, result identities and saves support that behavior. A future named assist should state its actual changes and comparison category; preserve picture/ordinary-clear access while distinguishing mastery records when rules differ. Input remapping, touch layout and reduced effects are presentation/accessibility settings and should not change competitive identity by themselves.

For an authored four-board chapter, test **teach a pattern → combine it with known terrain → offer a relief/alternate route → stage a boss encounter**. This ordering is our proposal, not a universal formula from Dead Cells. Introduce a boss warning in safe space before it can threaten a live cut, then expose its lane or cadence and recovery window. Rehearsal should use the same registered behavior but be explicitly practice with no campaign award. A later boss remix can combine learned patterns; it need not accelerate every object.

**Acceptance:** a newcomer can identify the boss warning and a safe response after one rehearsal; retry does not require replaying an unrelated chapter; speed-medal expiry changes medal feedback without implying failure unless the authored mission has a separate hard deadline. Daily boards remain available after their date; no streak loss is introduced.

## Explicit earlier-release copy: UX and preservation contract

These are engineering recommendations for this game's existing storage model, not claims that a browser offers a multi-store transaction automatically.

1. **Discover without modifying.** Inspect known release namespaces on the current origin. Show source release, compatible campaign/clear/picture counts, installed-pack presence and whether a recoverable flight exists. An unreadable or pending-recovery source is a warning, never an empty collection to copy over the destination.
2. **Review the exact scope.** State **Copy from vX into vY** and show whether the current collection is replaced. Preferences and unfinished-flight handling must be explicit. An older build remains usable with its existing data. This is a copy, not continuous sync or a merge of unrelated progress histories.
3. **Acquire before applying.** Keep the destination writer lease; obtain the source's cooperating writer reservation without waiting indefinitely, and coordinate its backup snapshot. Re-read/validate the source under those guards when Copy is activated. Do not rely on an earlier preview, raw-key enumeration or a UI disabled state as concurrency protection. If the source is busy, say **“Close the vX game tab, then try Copy again.”** Use no lock stealing.
4. **Validate and commit as a unit.** Reuse bounded backup/image/replay validation and destination journal handling. A pending source journal should direct the player to repair/export from that release, without silently recovering or altering it during discovery. On destination failure, retain the previous destination, report recovery status and preserve an exportable candidate. Only show success after the coordinated commit and adoption finish.
5. **Acknowledge source/version limits.** Older clients that do not implement the writer protocol cannot be made cooperative by naming a lock now. Unsupported schemas or missing dependencies require an explicit backup path, not changing version tags or dropping records. The current origin cannot scan another browser's or native wrapper's storage.

Show **Saved on this device**, **Session only**, or **Copy needs attention** near the continuation UI. Offer complete backup export after a successful transfer and when persistence fails. Browser persistence requests, where supported, can supplement that flow; they do not establish off-device recovery. Do not translate WebKit's overall-origin quota into a larger localStorage/profile allowance—the game's own bounded formats remain authoritative.

**Acceptance matrix:** source open → no writes and clear retry guidance; source changes after preview → fresh review/validation; corrupt source → destination unchanged; valid source with unreadable destination → explicit repair replacement, with no fictitious Undo snapshot; quota failure midway → recoverable destination and visible error; duplicate Copy → no doubled awards; cancelled review → no changes; different origin → export/import instructions; copied saved flight → paused restoration only. Verify the original release's raw profile, packs and session bytes are unchanged after both success and failure.

## Evidence for deciding whether this helped

Run short returning-player sessions with explicit consent; no covert analytics are needed. Ask a player to find their next board, inspect a previously earned picture, identify a missed mastery goal, distinguish a medal timer from a deadline, and explain what Copy will replace. Record wrong turns, lost selection, accidental launches and unclear save messages. Treat faster task completion and fewer mistakes as usability evidence only; voluntary repeat play still requires actual play sessions. No source above proves a retention gain for this game.

Prioritize continuation and safe copying first, then reward/ending clarity, then a measured boss/difficulty content pass. No runtime files, media, skills or release artifacts were changed by this research task.
