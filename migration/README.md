# Content ownership and migration receipts

The dedicated app owns its branded content and presentation. The shared RevealLine engine is imported at the exact revision in `upstream.lock.json`; `app/` remains generated. A normal app build uses only committed local inputs.

The playable catalog contains five primary chapters / 30 missions with Solo, Versus and Team; 240 official grid-Snake missions in those three modes; and eight supplemental collections / 20 Solo missions. SIM and Survivals are excluded. Historical authoring files do not create playable launch options or ship in the Pages artifact.

## Owned authoring

`authoring/company/` contains the five chapter generators and their lesson, reward, layout and presentation inputs. Its verifier reconstructs 48 JSON files using the pinned generic engine: all content values and identities match, and 47 files also reproduce the original bytes. The remaining catalog differs only in serialization. Ten owned test suites and two support files retain their original source provenance; the authoring checks include all 180 primary-chapter route proofs.

`authoring/collections/` compiles the eight locally owned native packs into all 20 supplemental recipes. The source packs, complete ordered mission list, output recipes and dependency hashes are checked. Existing mission numbers are retained by `level-numbering-receipt.json`: 47 previously numbered missions keep their numbers, and three previously unnumbered supplemental missions remain unnumbered.

Run these checks against a checkout containing the locked engine commit:

```sh
npm test
npm run build
npm run verify:authoring -- --source /path/to/revealline
npm run verify:collections
```

## Receipts

- `content-receipt.json` and `owned-source-receipt.json` retain the original runtime content and named authoring sources, including their Git blob IDs and SHA-256 hashes.
- `company-authoring-receipt.json` and `generator-fragment-receipt.json` record the executable local generators and the original mixed-generator excerpts.
- `mixed-source-receipt.json` accounts for 2,241 structured entries from 105 mixed files. Original JSON pointers and source hashes distinguish extracted records from the original complete artifacts.
- `code-fragment-receipt.json` records 146 excerpts from 71 source and documentation files.
- `additional-owned-source-receipt.json` preserves 230 complete source, authoring and evidence files. These include the earlier Navi and Spend Network material and mixed originals needed to document the ownership split.
- `presentation-source-receipt.json` records 165 extracted records covering 33 owned slots, 33 recipe revisions and their bindings.
- `owned-test-receipt.json` records the original owned regression suites and support files.
- `historical-owned-object-receipt.json` preserves 336 named historical file versions from the verified backup graph. Of these, 244 already exist byte-for-byte in local content; 92 additional objects occupy about 3 MB under `content/archive/historical-objects/`. Tests verify the original Git object identity, SHA-256 and length of every version.

Archived records retain their original bytes and claims as historical evidence. They are not current release certifications. Derived upstream records receive new hashes and explicit projection notes rather than reusing an original artifact's verification identity.

## Historical scope and remaining work

The historical-object receipt covers named ownership candidates from one preserved Git graph. It is not a claim that mixed files, every path alias, embedded archives, new remote commits or GitHub-hosted artifacts have all been migrated. The full Git backup and compact release backup are stored outside both repositories. Compact preservation retains full Git history, unique content and evidence, and one complete verified release instead of every duplicate release archive.

The original game's source cleanup is tracked separately in [RevealLine PR #1755](https://github.com/mekhovov/revealline/pull/1755). Historical rewriting, hosted artifact cleanup, pending-PR reconciliation and the final regeneration from rewritten upstream `main` remain separate steps. Original dirty worktrees must not be reset. A final migration report must distinguish repository-owner-controlled records from GitHub-owned PR references, cached objects and external copies.

`historical-asset-alias-receipt.json` records five artwork originals whose alternate historical filenames were found by exact byte identity. Each destination is verified locally; the receipt does not claim the original repository history has already been rewritten.
