# Chapter appearances

The source increment after v0.9.0 makes the existing cosmetic rewards attainable in short campaigns. Progress rules, integration tests and player-interface changes are implemented; this guide makes **no browser-verification claim** for the increment. Frozen v0.9.0 keeps its original behavior. The [accepted plan](round-20-player-polish-plan.md) records the rationale and interface acceptance checks.

## What a clear earns

Appearance access belongs to the selected campaign. Count each of its declared map IDs once, regardless of repeated wins, seed, class route or steering mode. Unknown map IDs and clears in another campaign do not contribute. All starter bodies remain available.

| Tier | Distinct clears needed | Existing appearances |
| --- | --- | --- |
| First clear | 1 | Skyline FPV, Fixed-wing body, Falcon trim, Vector trail, Audit pulse |
| Chapter explorer | The smaller of 4 and the campaign's map count | Night signal FPV, Delta interceptor |

A one-map campaign reaches both tiers on its first clear; a two-map campaign needs two clears for the final tier; Homeward Skies and Equipment Workshop need three. Campaigns with four or more maps retain the four-clear target. This policy applies to authored packs and generated one-map challenges too. No extra reward currency or repeated-login requirement is involved.

**These are cosmetic appearances.** Choosing one changes the body or its presentation effect, not the gameplay class, ability, ammunition, resistance, speed, collision or score rules. Falcon trim, Vector trail and Audit pulse reuse existing images with different animation effects; their names do not promise separate creature models or official company characters. The same chapter clear can unlock appearances without qualifying for an optional equipment seal.

Pathfinder uses the same final-tier target, with campaign-specific wording. Last light still means every map in that campaign is complete. In a three-map chapter both can become true together. They are derived ordinary-clear achievements, separate from replay-verified mastery records.

## Returning players and replay

A compatible profile with three existing Homeward clears already satisfies the new final tier when adopted by this source version. It requires no new win, rewritten clear, stored unlock field or inferred equipment seal. Import, reload, a gallery visit and terminal replay verification do not announce a new unlock. Frozen older releases retain their own four-clear policy and isolated profile channels; use the existing [explicit transfer workflow](continuity-transfer.md) to bring compatible progress forward.

Eligibility is recomputed from the current campaign's compatible progress after loading, import, Undo or pack reinstall. Selecting a fresh campaign can make an appearance unavailable there; returning to the completed campaign restores that access. Removing a pack retains its player records. Changed campaign content follows the existing campaign-identity rules rather than inheriting unrelated clears.

An already-cleared mission remains replayable even if an earlier mission has no clear. For example, a compatible profile containing only mission 2 can replay mission 2 and access mission 3 through the existing predecessor rule. It receives no fabricated mission-1 clear. Owning only mission 3 does not unlock an uncleared mission 2. Imported and backed-up clears use the same rule.

## Interface and save boundaries

**Collection → Campaign appearances** shows two reward rows with original thumbnails, preset names, availability and remaining mission counts. The tier display caps its numerator at the target; the underlying distinct-clear count remains unchanged. **Character appearance** has a corresponding campaign-progress hint. A newly crossed tier is named beside the completed picture. **Choose appearance** focuses the existing selector; it does not restart the completed flight or equip a body. Changing the selector uses the existing selection path, including turning off automatic class-appearance matching; it does not change the class itself. A one-map win names both tiers together without an extra compulsory reward screen.

The acknowledgement is only for an eligible live completion's before/after clear transition. Repeating a map or adopting an already-complete profile supplies no new transition. Practice and Controller practice may expose appearances for inspection as **preview access**, while granting no progress, gallery, score or cosmetic awards throughout that preview session. Couch results and Replay Theater do not award campaign rewards.

If a normal completion cannot be persisted, the existing session-only progress can still make its appearance available in that session and in an exported profile. The UI must retain the save warning and must not claim the reward was saved. Reloading the old stored profile restores its actual earlier eligibility. Existing [backup and recovery behavior](full-backup.md) remains unchanged.

## Maintainer contract

Use the helpers in [progress.mjs](../game/progress.mjs) with progress selected through `progressFor(library, campaign)`:

| API | Purpose |
| --- | --- |
| `appearanceMilestones(progress, campaign)` | Fresh rows with `id`, `name`, `bodyIds`, `count`, `target`, `earned`; count is not capped at target |
| `unlockedBodies(progress, campaign)` | Starter set plus earned tier bodies |
| `newAppearanceBodies(before, after, campaign)` | Newly available body IDs between two progress states; no event or award authority |
| `achievements(progress, campaign)` | Existing achievement IDs with the campaign-aware Pathfinder target |
| `canPlay(progress, campaign, index)` | Bounded integer mission access: first, own clear or predecessor clear |

Always pass campaign context in campaign UI and automatic-appearance fallback paths. The one-argument `unlockedBodies(progress)` remains an explicit legacy one/four-clear API. Projection validates the fields it consumes and the matching progress ID/revision; it does not replace campaign/core validation or choose the full library campaign key. Rows and sets are owned outputs, with no persistence side effects.

Keep progress `revealline-progress.v1`, library `xonix-library.v2`, mastery record v1, replay v3 and session v1 unchanged. Existing valid-library-v1 migration also remains unchanged. Do not add unlock fields to maps, recipes or portable profiles, and do not regenerate archived compatibility expectations. Core rules, campaign/board identities, score variants, seen-run IDs, pictures and mastery records stay intact.

[Projection tests](../game/test/appearance-milestones.test.mjs) cover 1/2/3/4/12-map thresholds, ownership, malformed consumed fields, duplicate/unknown IDs, repeat clears and mission access. [Integration tests](../game/test/chapter-reward-integration.test.mjs) use actual Homeward/Workshop routes in both steering modes, pinned frozen-v0.9 portable data, compatible profile adoption, mixed backups, pack removal/reinstall and refused writes. These checks establish data behavior; interface journeys, physical devices and player enjoyment require separate evidence. Use the [Round 20 prompts](../authoring/prompts/round-20-chapter-rewards.md) to extend or verify the feature without widening its schema.
