# Company artwork engineering review

This review describes candidate engineering observations made on 27 September 2026.
It is not final human artwork, brand, content, accessibility or release approval. The
user-reported formative playtest remains complete. No artwork bytes or revisions were
changed by the original review. The immutable follow-up correction is recorded below.

## Inspection coverage

All 66 current mission exports (30 Coupa, 36 DroneAid Netherlands) were checked against
their selected paths, hashes, byte sizes and dimensions, then inspected at native size in
groups of no more than three. The local inventory and per-image notes are retained in
`.cache/artwork-engineering-review/inventory.json` and `native-notes.json`.
These development records are not player dependencies or promotion receipts.

Twenty static browser observations cover 16 distinct missions through the shared
BoardPainter, exact selected artwork and canonical compiled mission/tuning. Where a
partial state is reported, it comes from the pinned legal-route replay. Each observation
records the selected picture revision/hash, tick, coverage and screenshot in
`.cache/artwork-engineering-review/browser-observations.json`. The diagnostic does not
write player progress. These views are reduced-motion, paused illustrations of specific
states, not interactive human runs or continuous moving-trail contrast tests.

The 320-pixel cases use a 320 by 160 CSS-pixel board in a desktop browser. They do not
represent physical-phone input, display or assistive-technology results. In the inspected
states, frontier/wall boundaries, warning bands and objective markers remained visually
distinguishable. This qualitative observation does not establish a measured contrast
ratio or coverage of every reveal state.

## Findings and remaining review

Three older Coupa revision-1 exports use taller 1280 by 853 compositions and an illustrated
people style: Inside the Village 01, From Need to Value 01 and A Day in Coupa 01. Their
960-pixel gallery and 320-pixel partial views retain the principal fountain/community,
market/bridge and connected-workroom subjects under the game's cover crop. They are not
stretched. The style difference from newer environmental scenes remains visible and
should be included in the final human consistency review; native dimensions alone are
not a reason to regenerate them.

The ten existing generation-receipt warnings were revisited in partial views:

| Missions | Detail retained for final review |
| --- | --- |
| Spend in Motion 03; Inside the Village 03 | Central sculpture/table occupies intended quiet space. |
| From Need to Value 05; Connect the Network 03 | Decorative ledger/paper marks must remain scenery, not readable task evidence. |
| Connect the Network 05 and 06 | Miniature architecture, trays and ornaments add competing detail. |
| Workshop Lights 06 | Deliberately dark evening composition. |
| Parts in Motion 03 revision 2 | A rear-right propeller tip is clipped at the picture edge. |
| Parts in Motion 04 | Physical cutting-mat grid could compete with gameplay cells. |
| Signals of Support 01 | A foreground propeller approaches the reserved objective area. |

Parts in Motion 03 revision 2, SHA-256
`196aad09cc2e99b5bdd53f45fcd434f3bcab3352a31345de6bf73055f953f721`,
was also inspected in its full gallery composition. The four motors, frame and camera
remain readable, but the rear-right blade tip reaches the right border. The minor
composition defect was confirmed by the original review. Its correction therefore had to
append a new immutable picture revision and preserve the existing presentation for saved
runs and replays.

That correction is now implemented as revision 3. The selected 640×320 opaque derivative,
SHA-256 `adf0812ac70f18b45b716ba1067f56c963ed24205f6a21ca0fccb0f50e1401e2`,
keeps all four motors and every propeller blade inside the image with clean edge margin.
The exact revision-2 combined and campaign presentations were captured before registration.
A 1280×720 registered-source run checked the initial reveal and a legal 3.6% capture with
the shared terrain, objective, player and enemy overlays. The crop defect is resolved in the
current candidate; final human approval and narrow physical-device review remain pending.

Additional partial views cover Makers Together 06, Careful Handoff 06 and Shared Horizon
06, completing at least one static view from each of the six Netherlands campaign actor
families. These observations supplement the native inspection; they do not mean every
mission was examined with overlays or that all actor animation was qualified.

## Approval boundary

Generated pictures remain fictional illustrative environments. They are not documentary
photos of Coupa employees, DroneAid volunteers, real deliveries or deployment outcomes.
Scenery does not supply actionable drone assembly procedures or tenant-specific Coupa
policies. The earlier sourced content/provenance records remain authoritative for origin
and permitted packaging; this visual review creates no new redistribution permission.

Final review still needs normal-motion readability, human brand/content approval of the
selected final artifacts, physical-device accessibility and the installed-app checks in
[the device runbook](company-editions-device-qualification.md). No approval flag, public
selector, release version or image ledger was changed by this inspection.
