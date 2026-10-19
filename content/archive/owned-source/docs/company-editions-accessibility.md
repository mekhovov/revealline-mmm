# Company player accessibility review

This is an engineering review, not an accessibility certification or a human comprehension
result. The current company editions run `game/index.html` and the shared Solo controls.
`game/company.html` is a redirect; the earlier dedicated player review below is historical.

## Current shared Solo checks

Actual-focus automated checks verify arrow/letter steering after launch, Settings return,
explicit Resume and lost-focus recovery. A visibility-only interruption clears missed key
releases without accepting held repeats. Edition changes reuse the shared Stay/Leave dialog;
failed retention remains visible and cancellation restores the invoking selector.

The edition home controls now use the shared text-size tokens. A fresh, uncached
browser check measured Start, Missions and the edition selector at 16 px in Standard
and 20 px in Large; the 320 px document had no horizontal overflow, and keyboard
scrolling reached the retained-artwork recovery controls. Automated checks verify
that changing Large/Plain leaves the paused checkpoint and saved artwork receipt
unchanged, and that enlarged chrome triggers one bounded board remeasurement.

Optional learning now keeps import and save feedback in persistent `role="status"`
regions inside the Settings and lesson dialogs. Tests cover malformed and foreign
backups, read-only and quota failures, superseded imports and disposal. Independent
proofs still save out of order; an older completion cannot replace another lesson's
status. A save failure after closing the lesson retains a host warning naming that
lesson. The focused shared-host, learning, layout and default text-preference checks
passed. These tests establish DOM ownership and state preservation, not
screen-reader announcements on a physical device.

Bounded browser checks confirmed keyboard steering and Escape pause/resume. Native Tab
navigation scrolled the pause menu's last Watch first cut action into view at 1280 × 720.
The pause menu deliberately scrolls; offscreen actions in that scrollport are not evidence
that they are unreachable. The review helper distinguishes this from viewport overflow
without a scrollable ancestor. The canonical host has separate 390 × 844 and 844 × 390
viewport observations recorded in the shared Solo integration log.

These checks do not establish screen-reader support, physical-controller accessibility,
contrast over every artwork crop, zoom behavior or accessibility on every device. Those
remain pending human/device checks. The original token contrast results below belong to
the earlier brand palettes and must not qualify the newer Netherlands palette implicitly.

## Historical dedicated-player review

Historical scope: `game/company.css`, `game/company-player.mjs`, and the learning workbench.

| File                      | Component                   | Issue                                                                                                                    | WCAG Guideline                           | Severity | Recommendation                                                                                                        |
| ------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `game/company-player.mjs` | Campaign entry buttons      | Repeated “Enter journey” names did not identify the chosen campaign independently.                                       | 2.4.6 Headings and Labels                | Moderate | Fixed: accessible names include the campaign title and retain the visible label.                                      |
| `game/company-player.mjs` | Error feedback in dialogs   | The page-wide live region becomes inert while a modal is open; backup/import errors could be inaccessible in that modal. | 4.1.3 Status Messages                    | Moderate | Fixed: mirror asynchronous status into the open dialog, without closing it or resuming play.                          |
| `game/company.css`        | Narrow-screen pause/results | The absolute overlay could exceed the short canvas and clip its controls.                                                | 1.4.10 Reflow; 2.4.11 Focus Not Obscured | Moderate | Fixed: below 650 px, the panel flows below the canvas. Canvas geometry and simulation remain unchanged.               |
| `game/company.css`        | Touch controls and reading  | Compact navigation and close controls offered small targets; several secondary instructions were unnecessarily small.    | 2.5.8 Target Size (Minimum)              | Moderate | Fixed: buttons have at least 44 px height, close buttons at least 44 px width; labels and practice text are enlarged. |

The native dialogs retain modal focus behavior. Keyboard Enter opens Settings; Escape closes
it and returns focus to Settings. The mission stays paused and requires an explicit Start /
Return to play. The reduced-motion checkbox sets the existing shared preference and stops
logo motion; its original value was restored after the check. Workbench evidence and decisions
use real buttons, labels, selects, fieldsets and an untimed feedback region.

Browser observations on the local candidate, 2026-09-26:

- At a real 320 × 800 iframe viewport, the home and paused-game document width stayed at
  320 px and no visible controls exceeded the viewport or arena bounds.
- The checks above cover keyboard focus return and reduced-motion wiring. They do not
  replace screen-reader testing, controller/device testing or a human low-vision review.
- Missing presentation bytes produce a visible error and disabled Start; a second healthy
  tab can subsequently reserve saving. A simultaneous second healthy tab reports that it
  is session-only, keeping export available.

Static palette contrast against the brand ink is 16.24:1 (Coupa white), 9.70:1 (Coupa accent),
11.33:1 (Coupa safe), 7.91:1 (Coupa danger); DroneAid equivalents are 15.46:1, 9.39:1, 9.42:1,
and 8.44:1. These token checks do not establish contrast over every generated image or
gradient. Image-backed copy, focus at browser zoom, nonvisual gameplay access and assistive
technology behavior remain part of the release accessibility review.

Use `docs/verification/company-review.html` to repeat viewport, layout and timing
observations against a selected same-origin company player. The helper is excluded from
standalone edition runtime dependencies and cannot approve a release.
