# Round 27 gallery landscape follow-up

Date: 2026-09-12. This is a narrow presentation amendment to the illustrated Workshop iteration.

## Observed problem

The existing gallery stacks its metadata, title, picture and action row vertically. The original picture rule permits a height of `65svh`, while the dialog also reserves padding, heading margins and actions. At the observed 844 × 390 CSS-pixel Playground viewport, the picture bottom and footer actions therefore require dialog scrolling despite the available horizontal space.

The pre-change [Garden screenshot](screenshots/garden-landscape-gallery-observed.jpg) and [Ledger screenshot](screenshots/ledger-landscape-gallery-observed.jpg) show this condition. They are screenshots of the actual embedded preview; the parent page dimensions are not the preview dimensions. They do not establish physical touch-device behavior.

## Scoped implementation

In [game/style.css](../../../game/style.css), only the picture viewer at widths of at least 681 CSS pixels and heights of at most 500 CSS pixels receives a two-column layout. The open dialog places the full picture on the left and metadata, title, optional seals and three actions on the right. Its height uses the existing viewport and safe-area budget. The canvas retains `object-fit: contain`, so the 4:3 picture fits its available box without cropping or stretching.

The close button and each action retain a minimum 44-pixel height; the close button is also 44 pixels wide. Heading space reserves the close-button corner. Optional seal text can scroll within its remaining row. The layout is applied only to an open dialog, preserving native closed-dialog hiding and existing focus order. No HTML, renderer, gameplay, profile, pack or image bytes change.

The 320 × 640 portrait and 1280 × 720 desktop layouts remain outside this media query. Very short viewports, unusually long imported headings, text zoom and safe-area insets still need their own observation; this change does not promise that arbitrary content always fits without scrolling.

## Verification status

The parent agent reloaded the real page and checked the updated 844 × 390 preview. An independent visual review of all four resulting screenshots confirms that the full picture, title, close control, Play celebration, Replay mission and Back to collection are visible together:

- [Garden of Threads](screenshots/garden-landscape-gallery-fixed.jpg).
- [Neon Switchboard](screenshots/neon-landscape-gallery-fixed.jpg).
- [Clear Ledger](screenshots/ledger-landscape-gallery-fixed.jpg).
- [Copper Orchard](screenshots/homeward-landscape-gallery-fixed.jpg), including its existing Steady Signal seal text.

The pictures remain visibly complete and proportionate; the heading and actions do not overlap them. This resolves the observed landscape stacking issue for these four scenes. The earlier screenshots remain the pre-change evidence.

The [320 × 640 capture](screenshots/homeward-compact-gallery-after-css.jpg) and [1280 × 720 capture](screenshots/homeward-desktop-gallery-after-css.jpg) show the retained stacked layout outside the new media query. Both are parent-page screenshots whose outer viewport cuts off part of the embedded preview. That outer crop does not establish clipping inside the game frame, and these images alone do not prove that all compact or desktop actions fit without scrolling.

Source review and scoped formatting checks passed. No CSS-only unit tests were added or gameplay suites repeated for this follow-up. No new concrete rendering defect was found in these captures. This is source-browser evidence, not frozen-release, physical-device, text-zoom or full-animation certification.
