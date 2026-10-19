# Company edition performance observations

The review page now records one explicit scenario for every timing sample: opening play, advanced
encounter, picture reveal or edition switch. It also summarizes ready same-origin targets and
target transitions in the current review session. Scenario labels are bounded reviewer input;
target transitions establish only that two ready pages were observed. They do not establish
installed-app isolation, preserved storage or physical-device performance. Exported observations
remain `qualified:false`.

Use the existing [review page](verification/company-review.html) to compare two exact compiled
editions on the same desktop browser. This is a bounded engineering observation, not a phone,
OS-installed app or full-scene performance qualification. Final observations and exact artifact
descriptors are attached to the current PR; earlier receipts only attest to their original source.

The baseline for the next comparison is the independently downloaded and checked candidate
`6eff662a638bf26cfe13c0bdc433b12a3fde4954`. The candidate is the final clean commit integrating
main through `6bbe49762` and the shared soundtrack feedback fix. Both use the same current
mission pictures and gameplay identities. This comparison measures that integration; it does
not estimate the original pre-company game's performance or the effect of earlier artwork work.

## Method

- Reconstruct each sample from its exact Git input bytes with the existing compiler and
  normal `/revealline/` offline configuration. Verify each baseline archive descriptor against
  its independent freeze report. Match the candidate descriptors to its final freeze before
  accepting the comparison binding. Serve the original compiled files without player edits.
- Use `coupa-all` and `droneaid-nl-community`. Serve both samples through one disposable
  loopback review origin under separate comparison prefixes, with the same response headers.
  Prefixes are a browser-comparison convenience, not a claim about installation scopes.
- Use the same browser, viewport, input and sound/motion settings. Record the order and
  repeat baseline/candidate observations; do not silently discard a slow valid sample.
  No-store responses avoid HTTP cache reuse. They do not produce a fresh browser process,
  empty JavaScript caches or a production-network cold launch.
- Record load-to-menu and Start-to-running from visible public DOM state. Resource totals
  cover the browser's buffered Resource Timing entries only. They are not complete network
  traffic or a guarantee that every request was observed.
- Arm the 20-second interval observer, then start or resume normally. State the actual mission,
  movement and encounter coverage. Hidden, paused or focus-interrupted samples are discarded
  by the tool and remain in the exported log with their reason. A stationary initial scene
  with active enemies does not characterize every advanced encounter or completed picture.
- Report animation callback intervals, including observer overhead, as such. They are not
  isolated renderer execution times. Browser-provided heap, when available, is approximate
  and shared; repeated navigations alone cannot establish the absence of a memory leak.
- Save the raw observation log, exact build descriptors, sample order and a contextual
  screenshot. Keep `qualified: false` until an actual reviewer evaluates the evidence.

## Remaining performance qualification

Review the actual measured desktop results before deciding whether a change is a regression.
Repeat on target physical devices and exercise advanced encounters, image reveals and repeated
in-game company switching. Record before/after input conditions and any unavailable metrics.
Do not replace a missing device result with responsive viewport emulation or an automated
route proof. The installed-app and update/recovery matrix is in
[device qualification](company-editions-device-qualification.md).

Use separate 20-second records for at least one late Coupa encounter, one late Netherlands
encounter and one actual picture reveal. Then alternate the exact Coupa and Netherlands targets
at least twice and export the session summary. Preserve every valid slow sample. These desktop
records can close the previously ambiguous scene-labeling gap, while the same scenarios on target
physical devices remain a separate gate.
