# Round 08 authoring checks

Executed 12 September 2026 from the project root. This record covers the new character-collection skill, prompt integration, installation, existing authoring regressions, an in-memory check of the guide's simulated fixtures and a returning-player forward test. Asset generation/application, browser motion review and the collection module's full tests are separate workstreams; this record does not claim they were completed by these authoring checks.

## Delivered scope

- Added [Character Collection](../skills/xonix-character-collection/SKILL.md) with a focused [handoff reference](../skills/xonix-character-collection/references/collection-handoff.md). Its scope is stable roster identity, context eligibility, earned cosmetics, selection/fallback, actual asset exchange and distinct readiness evidence. Theme and individual animation production retain their own workflows.
- Extended [Animation Director](../skills/xonix-animation-director/SKILL.md) and its component recipe notes: hubs versus blades, configurable three-blade propellers, anchor/phase/spin/rate, sampled-motion aliasing, pause/reduced motion and independently cancelled wing/thruster/pulse components. Existing relevant skills route roster tasks to Character Collection.
- Added [16 collection templates](../prompts/round-08-character-collections.md) and integrated them into the shared CLI, for **104 total**: 56 base + 16 asset variations + 16 animation variants + 16 collection templates. Existing catalogs and their variable contracts were not edited.
- Updated the installer and kit/prompt guides for eight skills, the independent lab collection format, exact example IDs, shared-body variant honesty and simulated reward scope. No current content-pack/media contract or game runtime was changed by this task.

## Executed validation

| Check | Actual execution and scope | Result |
|---|---|---|
| Catalog structure | Loaded all four catalogs through `authoring/prompt.py`; checked unique IDs, unique declared variables and exact placeholder agreement | **104 records passed** |
| Full CLI rendering | A local Python harness invoked `python3 authoring/prompt.py render ID --set NAME=value` for every record; compared stdout with the renderer output and rejected unresolved delimiters | **104/104 passed** |
| Invalid CLI input | Nine cases below required exit 2, empty stdout and `Prompt error:` stderr | **9/9 passed** |
| Literal text | Rendered Unicode, a newline, literal `$HOME`, `$(do_not_run)`, backticks, single braces and multiple equals signs through a subprocess argument list | Preserved as text; no shell evaluation |
| Discovery | `python3 authoring/prompt.py list`; `show collection-03-three-blade-recipe` | 104 listed records; expected JSON returned |
| New-template scope | Checked lengths and `template_not_executed` state | 16 templates; shortest **142 words**; no template sent to a model |
| Official skill packaging | Skill Creator's `quick_validate.py` on all eight source skill folders | **8/8 passed** |
| Skill UI metadata | Parsed all eight `agents/openai.yaml` files; checked 25–64-character short descriptions and explicit `$skill-name` in each default prompt | **8/8 passed** |
| Authorized skill installation | `python3 authoring/install-skills.py --install` | Seven correct existing links retained; eighth installed |
| Draft packs | `python3 authoring/scripts/validate_pack.py` | **4/4 passed**; 41 assets remain planned |
| Pack validator regressions | `python3 authoring/scripts/validate_pack.py --self-test` | **27/27 passed** |
| Media regressions | `python3 -m unittest discover -s authoring/media -p 'test_*.py' -v` | **24/24 passed** |
| Guide fixture smoke check | `node --input-type=module` harness imported the actual collection evaluator and definitions; all state stayed in memory | Passed the cases below |
| Current recipe vocabulary | Compared the guide's named component recipes with `presets.json`; read actual field validation/rate handling in `animation.mjs` | All **11 documented recipe IDs** matched |
| Returning-player forward test | Temporary Node harness imported the actual module; isolated profiles exercised selection, replay, corruption, malformed inputs and namespace boundaries | **17/17 scenario checks passed**, plus the documented trust-limit probe below |

Negative CLI cases used `collection-08-context-selection` for missing variables, unknown variables, duplicate assignments, empty values, assignments without `=`, and unresolved delimiters inserted into a value. The remaining cases were an unknown prompt ID, unmatched family and unmatched asset type.

Official skill validation used `/tmp/xonix-skill-check-20260912/bin/python` and `/Users/oleksandr.mekhovov/.codex/skills/.system/skill-creator/scripts/quick_validate.py`. Skill Creator's initializer created the new folder and UI metadata; its placeholder instructions were replaced before validation. The validator establishes package structure/frontmatter, not a guarantee about future agent choices.

Installation created `/Users/oleksandr.mekhovov/.codex/skills/xonix-character-collection` as a symlink to the versioned source in this workspace. No existing path was overwritten. A client may need to refresh its skill catalog to discover the new name.

## Guide fixture check

Read the actual `collection-presets.json` and `collection.mjs`, then validated the definitions: **10 character IDs** (nine themed cosmetics plus the neutral marker), **six contexts**, **six fixtures**. Used a fresh `mode: lab` profile named `round08-authoring-check`; no save files or browser storage were written.

The smoke check established:

- Skyline FPV begins locked and cannot be equipped before its qualifying fixture.
- `fpv-first-clear`, `fpv-clean-map`, `atlas-heritage`, both retro clears and `navi-clean-case` together satisfy the five authored earned cosmetics.
- `retro-first-clear` alone leaves Vector trail locked; the distinct second level supplies the remaining best-result stars.
- Reapplying the first retro fixture is rejected and the event count remains six.
- All recorded events remain explicitly `simulated: true`.
- Unlocking Skyline FPV does not automatically equip it. Explicit equip resolves it in the FPV context; moving to the Navi context resolves the authored Navi starter and marks the FPV character unavailable there.

This checks that the prompt guide describes the evaluator's current examples accurately. It is not the module's complete regression suite, UI/browser interaction evidence, proof of real level completion or a production save/security assessment.

## Returning-player forward test

The follow-up scenario asked for an earned Ukrainian cosmetic on the correct map, a retained earned retro choice, visible unmet conditions and protection against duplicate/revised results or preview-to-game progress mixing. The read-only test used the new skill's workflow and the actual evaluator/definitions, with an isolated `returning-player-forward-test` lab profile. No browser automation, real profile, browser storage, collection code or repository data was changed.

The [temporary harness](/tmp/xonix-round08-forward-rupwpgmo/forward-test.mjs) and [JSON report](/tmp/xonix-round08-forward-rupwpgmo/report.json) were written outside the repository and executed with `node`. They may be cleaned up by the host later; the retained outcomes are recorded here. The inspected definitions had SHA-256 `d5452c0884ac581bc28c1bacd0e63dae00627ecd5a4592c8b6ec4b619ce87b52`.

All 17 scenario checks passed:

- A save round-trip retained the map-and-game-specific Falcon trim choice and the separate theme-scoped Vector trail choice. A different Ukrainian map or game selected the Atlas starter; repeated Atlas/retro context switching retained the intended choices.
- Unmet Night signal and Audit pulse conditions exposed current/target counts. Locked or removed saved selections fell back to eligible starters.
- Exact duplicate events, revised payloads sharing an event ID, and revised payloads sharing a run ID were rejected without mutating the prior profile. Legitimate new runs on one retro level kept only that level's best stars; changing map/challenge names on one FPV level did not inflate its distinct-clear count.
- Missing/unknown/malformed context fields and malformed IDs were rejected at the relevant input boundary. Null, undefined and malformed fixture profiles returned a consistent rejection after the module author's robustness update.
- Duplicate saved events/runs or duplicate equipped scopes were rejected on restore. A wrong-map clear did not satisfy the clean-relay condition.
- Simulated fixtures/results could not enter a game-mode profile through the normal API, and an unchanged lab save could not restore into the game namespace. Source definitions and the original in-memory profiles remained unchanged.

**Trust-limit probe:** deliberately rewriting the saved profile's mode and all event `simulated` flags allowed that structurally valid copy to restore as a game-shaped profile with earned ownership. This matches the documented trust boundary: the evaluator does not authenticate result facts or locally edited saves. Mode flags provide segregation, not a tamper-resistant production guarantee. Such a guarantee requires a trusted result/save adapter and versioned content/ruleset identities, which remain future game work. The probe created no actual production save or unlock.

No new concrete evaluator defect was found within that documented boundary. The skill, handoff and collection prompts `09` and `12` were clarified to prevent future agents from mistaking flag checks for authentication. The changed skill passed its official validator again, both changed prompts rendered successfully through the CLI, and catalog loading still validated all 104 records. The older Round 07 prompt guide now identifies 88 as its historical count and 104 as the current shared CLI total.

## Configurable turning follow-up

The user then requested both immediate and grid-center buffered turning as configurable demo choices. Animation Director, Level Designer, Pack Reviewer and Character Collection now preserve the authored turn mode and compare cosmetic changes against each mode's own movement baseline. They do not require identical paths across the two policies or silently normalize buffered movement to immediate turns. Exact queue, release, reversal, alignment and mode-switch semantics are taken from the current preview documentation and tests, not invented by these authoring instructions.

Updated Round 08 template IDs: `collection-07-exchange-asset`, `collection-08-context-selection`, `collection-11-applied-comparison`, `collection-12-collection-readiness`, `collection-13-cosmetics-and-stats`, `collection-14-gameplan-review`, and `collection-15-nonrotor-recipes`. IDs, declared variables and the 104-template total are unchanged. The collection guide and relevant skill references carry the same boundary: a cosmetic swap must not alter the selected movement policy or add unsupported movement fields to collection data.

Executed targeted checks after this edit: **7/7 changed templates rendered through the CLI**, their placeholder contracts matched, a missing-variable negative case rejected correctly, and catalog loading still validated **104 records**. All **four changed skills** passed the official Skill Creator validator again. A Markdown link audit checked **131 local references across 21 documents**, with every target resolving, including both Round 08 root documents.

This follow-up changed authoring guidance only. It did not edit or test the demo's turning implementation, assert its exact input semantics or broaden previous viewport/native-device evidence. The demo implementation and its motion regression tests belong to their own handoff.

## Remaining evidence boundaries

The prompt templates were validated and rendered as text only. No image, animation or audio was generated by this task. A new roster ID is not a new produced body image; Falcon trim, Vector trail and Audit pulse are explicitly described as shared-body treatments in the current definitions. Spend Sprite remains an original business helper, not an official Coupa/Navi character.

The authoring work preserves cosmetic versus gameplay boundaries and does not implement territory capture, collision, enemies, scoring, real progression or native-platform builds. Applied visual quality, actual three-blade/non-rotor playback, browser interaction and device results must use the corresponding asset and preview review records. The deeper [gameplay plan](../../docs/round-08-gameplay-plan.md) is a reviewable design document, not evidence of tested fun or retention.
