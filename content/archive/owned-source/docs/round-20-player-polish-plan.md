# Round 20 — attainable chapter rewards

**Recommendation: make the existing chapter cosmetic milestones attainable, show their exact progress, and acknowledge new appearances beside the completed picture.** This is one bounded player-facing iteration after v0.9. It gives a player a useful reward from completing an existing short chapter, using artwork and progression already present. This plan was accepted after v0.9.0 was frozen. The chapter reward and out-of-order replayability changes are implemented in the v0.10.0 working source; browser and release evidence is recorded separately.

Audit and primary sources accessed **12 September 2026**. The code snapshot includes the pending Equipment Workshop example. [Public release guidance](public-release.md) still identifies its preserved v0.8 evidence separately; pending source content is not evidence of a frozen v0.9 artifact. This pass inspected code and documentation text, with no new video, audio, physical controller or device inspection.

## Why this increment first

| Candidate                                | Verified current gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Recommendation                                                                                                                                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reachable chapter rewards                | [`unlockedBodies(progress)`](../game/progress.mjs) requires four distinct map clears for `fpv-night` and `delta-interceptor`. Pathfinder also requires four. Night Shift, Living Threads, Homeward Skies and the pending Equipment Workshop each have only three maps. Progress is selected per campaign; clears in another chapter do not supply the missing fourth map.                                                                                                                             | **Implement now.** Correct a concrete reward dead end and expose existing attractive bodies. No new simulation, achievement ledger, imported predicate or asset production is needed.                                                           |
| Controller reading and hold alternatives | The [navigation adapter](../game/ui/controller-navigation.mjs) focuses native controls and scrolls the focused control into view. Its selector excludes the scrollable `[data-game-reading]` region. Keyboard reading is guarded, but a controller has no explicit text-reading mode. The [controller layout](../game/controller-bindings.mjs) has maps/sticks/dead zones, without hold/toggle preferences. Local touch-button tap steering does not make sampled controller direction/boost latched. | Next input-focused iteration. These are meaningful accessibility gaps, not evidence that remapping is complete accessibility. Adding safe latches and reading scope needs its own input/lifecycle work. Do not quietly combine it with rewards. |
| Two-stage sentinel                       | The [earlier design](round-15-mastery-plan.md) requires an additional victory condition, vulnerability/defeat state and new version dispatch. Current `lane-boss` remains its existing warning/active/idle actor. The plan's mastery portion has since advanced; its proposed boss and version vocabulary are not the current pack acceptance contract.                                                                                                                                               | Schedule a separate playable encounter after a revised compatibility design. A caption or reused lane boss cannot truthfully deliver the proposed stages. It is substantially larger than this polish increment.                                |

The choice is a practical judgment from the current defect and implementation boundary, not a measured estimate of retention. A player should finish Homeward, find the promised appearance available, and immediately understand how to use it.

## Exact proposed behavior

Keep the **current campaign-local scope**. The collection already says “Campaign achievements”; extend that wording to cosmetics. Do not silently create global ownership across unrelated campaign identities.

Use the number of distinct cleared maps in the actual campaign. The first appearance tier stays at one clear. The final tier and Pathfinder use **`min(4, campaign.levels.length)`**. Accept only valid nonempty campaigns, and count their declared map IDs once. Repeating a map, switching its seed/class or playing both steering policies is still one distinct clear.

| Campaign length | First tier | Final tier / Pathfinder | Result                                                                        |
| --------------- | ---------- | ----------------------- | ----------------------------------------------------------------------------- |
| 1               | 1          | 1                       | Completing a one-map campaign unlocks both existing cosmetic groups together. |
| 2               | 1          | 2                       | Finish both maps.                                                             |
| 3               | 1          | 3                       | Finish all three chapter maps.                                                |
| 4 or more       | 1          | 4                       | Preserve the current four-clear requirement.                                  |

Apply this consistently to authored campaigns and generated one-map challenges. A short campaign therefore gives cosmetic access sooner; that is an explicit policy choice. Cosmetics provide no score, resistance, ammunition or ability advantage. Avoid hidden exemptions for “easy” packs or a new grind counter. If future competitive progression needs different eligibility, that is a separate rules/persistence design.

The current first-tier bodies remain Skyline FPV (`fpv-racer`), Fixed-wing body, Falcon trim, Vector trail and Audit pulse. Final-tier bodies remain Night signal FPV and Delta interceptor. Preserve every starter. Use the actual preset labels and assets; this increment does not invent new bird, business or military models.

Pathfinder's description becomes context-specific: “Complete 3 different missions in this campaign” for Homeward, or four for First Signal/Fieldcraft. Last light remains full-campaign completion. On a three-map chapter both achievements can become true together; this warrants one combined acknowledgement, not two compulsory reward screens. These broad achievements are currently derived from clears, not stored mastery certificates. Do not issue an equipment seal from this change.

## Small interface, visible result

In the existing Collection dialog, add two compact reward rows with names, a static thumbnail, the criterion, current count and state. Put a short corresponding hint beside the appearance selector; a disabled option saying only “locked” is insufficient. Avoid adding another long paragraph to the ready/pause overlay.

```text
CAMPAIGN APPEARANCES · HOMEWARD SKIES

First clear       Available · 1 / 1
Skyline FPV, Fixed-wing body, Falcon trim, Vector trail, Audit pulse

Chapter explorer  2 / 3 different missions
Night signal FPV + Delta interceptor
Finish one more mission in this campaign.

[Close]
```

On a real new clear that crosses a tier, keep the completed picture and existing Continue/View picture actions. Add one short static line: **“New appearances for Homeward Skies: Night signal FPV and Delta interceptor.”** A “Choose appearance” action may open the existing selection surface; it must not auto-equip, restart the flight or dismiss the picture. The player's chosen body remains selected until an explicit choice changes it. Choosing a body through the existing path continues to disable automatic class-appearance matching, while behavior stays tied to the actual gameplay class.

For a returning player whose saved three-map chapter is already complete, the derived tier is available immediately after loading that compatible profile. Show the ordinary available state rather than replaying a supposedly new reward celebration. A repeated clear, gallery visit, imported profile or restored terminal recording must not emit another “new appearance” event. No durable notification-history schema is necessary: derive the live transition from the before/after clear state of this completion, and render ordinary state on adoption.

When persistence fails, availability follows the existing session-only progress with a truthful export/save warning. Do not announce “saved” before the profile write succeeds. Practice, Controller practice, couch and Replay Theater remain non-awarding. Practice may continue to offer all bodies for inspection; label that availability as preview access.

Switching campaigns retains existing local eligibility: a body available in a completed chapter can be locked in a fresh one, and the old chapter's access returns when selected again. Say **“Available in this campaign”**, not “permanently owned everywhere.” Changing this behavior to a global wardrobe could be useful later, but it would require a separate ownership policy and backup/import design.

## Implementation and preservation boundaries

Introduce one pure milestone projection taking **both progress and campaign**, shared by the appearance selector, class-appearance fallback, Collection and result feedback. A plausible API is `appearanceMilestones(progress, campaign)` plus a campaign-aware `unlockedBodies(progress, campaign)`; exact names are an implementation choice. If the old one-argument API is retained, its legacy four-clear behavior must be explicit, and every main-app path must pass campaign context. Update the couch starter lookup deliberately; do not unlock earned bodies there by accident.

Keep `revealline-progress.v1`, player-library v2 and mastery-record v1 unchanged. Do not rewrite clears, gallery items, seen-run IDs, per-setup variants, prior records or archived releases. Preserve every four-plus-map result and unlock. Derive the newly reachable short-chapter tier from existing ordinary clears, which are sufficient evidence for this cosmetic rule. They remain insufficient evidence for Steady Signal or any equipment seal.

Do not add unlock fields to normalized levels or class recipes: that would change existing campaign/board hashes. Core movement, fill, collision, capture quotas, medals, class switching, replay checkpoints, restore behavior and pack v1/v2 acceptance stay unchanged. No new rewards currency, random drop, repeated-login requirement, claim button or forced retry.

## Focused acceptance set

1. **Actual short chapter:** complete Homeward's three existing maps under normal inputs. At two clears the final tier is locked with `2 / 3`; after the third it is available. Equipping either body changes its rendered appearance and keeps the actual class, speed and collision unchanged. Repeat under the other steering mode without counting duplicate map IDs twice.
2. **Policy boundaries:** valid campaigns of lengths 1, 2, 3, 4 and 12 produce the stated targets. Unknown IDs do not contribute. One-map completion can cross both tiers once. The four-plus-map policy and starter set retain their old outcomes.
3. **Returning player:** an existing complete three-map profile opens with available bodies and truthful criterion text, without another win, inferred equipment seal or unsolicited celebration. Changing chapters explains the local scope and preserves both chapters' clear records.
4. **Save and replacement:** reload, complete backup round trip, explicit Undo, removed/reinstalled pack and session-only write refusal retain their established data behavior. Eligibility recomputes from the currently adopted compatible campaign/progress. Old earned mastery records are byte-preserved.
5. **One live transition:** a new clear yields one reward line; a duplicate completion, replay verification, picture browsing and profile adoption yield none. Practice remains unable to update the library in memory or storage throughout source/map selection.
6. **Usable result:** keyboard and simulated controller can reach Continue, View picture, Choose appearance and Close without entering a text field. At 320×640 portrait, 844×390 landscape and 1280×720, names wrap without horizontal scrolling and primary actions remain reachable. Reward controls use at least the existing 44 CSS-pixel target size. Reduced effects and muted audio retain the same named availability.
7. **Compatibility:** use existing representative frozen replay/session identity checks without regenerating expectations. Run focused progression, appearance/UI and relevant library/backup tests, then the normal release gates. The new reward behavior—not just another passing validation report—must be demonstrated in the playable shell.

These tests can verify eligibility and interaction. They do not certify touch comfort, assistive technology, physical pads, native iOS/macOS or human enjoyment. The [public-release matrix](public-release.md#scope-of-readiness) remains the authority for those target-specific limits; no new host, account, Steam achievement or store submission is proposed.

## Primary guidance and its limits

| Source inspected                                                                                                                                     | Published guidance / feature                                                                                                               | Application here (design inference)                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Microsoft [XAG 109: Objective clarity](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109), updated 4 March 2026 | Make objectives reviewable, show concrete prerequisite progress and allow players to suppress distracting unrelated notifications.         | Name the chapter-local target and display `2 / 3`; acknowledge the reward at the completed picture, without another mandatory modal or live-flight notification stream.               |
| Valve [Steamworks: Stats and Achievements](https://partner.steamgames.com/doc/features/achievements), current undated documentation                  | Achievement metadata separates name/description from a progress statistic; guidance suggests progress notifications at significant points. | Use one shared criterion/count and a meaningful tier transition. This is a UI lesson only: Steamworks is not being integrated, and local imported data is not a platform achievement. |
| Microsoft [XAG 107: Input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107), updated 4 March 2026             | Remapping alone does not remove duration/complexity barriers; it recommends digital alternatives and toggle/auto-hold options.             | Preserve the hold-alternative gap as real follow-up work. The reward dialog itself must use ordinary single presses and add no simultaneous or sustained input.                       |
| Microsoft [XAG 112: UI navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112), updated 4 March 2026     | Navigation should remain consistent across screens, reflow with layout changes, and provide a clear way back without trapping focus.       | Reuse the existing Collection and appearance controls, with a short readable reward row. Do not claim this solves controller scrolling of long mission text.                          |

These pages were retrieved as public text; linked example images and videos were not independently inspected in this pass. Guidance supports clarity and access, not a proven retention mechanism. A useful later playtest asks a returning player which appearance is available, what remains to earn the next one, and whether changing appearance changes its ability. Correct answers and an unforced choice to continue are more informative than calling the system addictive.
