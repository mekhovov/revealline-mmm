# Initial Coupa extraction verification

Source: RevealLine `main`, commit `e870684598ca2767e24320573caff400eb930f46`, version 0.142.4. The source checkout's uncommitted changes were not used.

The final generated artifact contains 678 files and five Coupa chapters (30 missions). All 16 automated tests passed, as did artifact verification and the Pages build. The artifact verifier checks content ownership, current and retained asset hashes, module/resource dependencies, output inventory and projection provenance. Runtime tests boot the actual content provider and exercise blocked selectors, pack imports, storage readers, learning records and profile recovery. Sync tests ensure existing edits, additions and deletions cannot be silently overwritten.

The final app reproduced byte-for-byte from the pinned source with `sync:upstream -- --check` using local committed Git objects. The separate hosted reproducibility workflow checks remote fetching on a clean runner.

Browser smoke testing covered startup, the five-chapter/30-mission chooser, starting First Connection, movement and capture (score and coverage increased), pause/resume controls, return home, saved Continue after reload, cleaned settings and a live Coupa mission demo. A foreign FPV edition URL was rejected and its recovery link returned to Coupa.

This is an initial test release. Automated checks and a browser smoke test do not establish full campaign completion, mobile/gamepad hardware coverage, audio quality or human learning outcomes.
