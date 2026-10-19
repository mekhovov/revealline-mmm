# Reserve illustration catalog

Open [the authoring gallery](index.html) to choose among the 40 selected originals: ten each for FPV Front, Ukraine Atlas, 1994 Forever and the fictional Spend Network. These are source reserves, not earned pictures, released levels, installed packs or animations. No game or profile state is read or changed.

Choose a theme, then an illustration, or use Previous / Next. The native select lists and buttons are keyboard focusable. Only the selected original is requested; there are no image thumbnails, image preloads, resized files or copied originals. The image fits the page without cropping. Download original PNG preserves its bytes. The generation prompt, any cleanup prompt, provenance and wave notes are explicit links; the notes preserve requested-versus-observed differences and visual-review limits.

The two unselected Wave 2 outputs remain untouched in Git. They are recorded separately in the manifest and are excluded from both the chooser and this server's image routes. Wave 7's displayed **Apricot Tape Workshop** title retains its original cassette-named source ID and prompt. Wave 10 has owner-approved full-size visual inspection; its native 320 × 160 comparison remains unverified.

## Validate and preview without checking out images

From the repository root, run:

```sh
python3 authoring/library/reserve-illustrations-catalog/catalog.py
python3 authoring/library/reserve-illustrations-catalog/catalog.py --serve
```

The second command prints an available loopback URL. It serves this small catalog and an explicit, bounded list of controller UI modules, styles and fonts from the worktree, plus the 103 unique selected source/text references from the pinned Git objects, on demand. It has no directory listing or filesystem fallback. It does not write image files, create disk caches, build a site, connect to a network service or change a Git ref. Each requested source body is checked against its recorded length and SHA-256 before delivery. HEAD requests check route metadata without reading PNG bodies. Use Ctrl-C to stop this owned server.

Run `python3 authoring/library/reserve-illustrations-catalog/test_catalog.py` to check the current controller dependency closure and live HTTP byte/MIME behavior. The server rejects unlisted repository files and traversal paths. Changing a UI import requires reviewing its explicit route entry in `catalog.py`; no image directory is added to that list.

A full checkout can also use an ordinary repository HTTP server at `authoring/library/reserve-illustrations-catalog/index.html`. Opening through `file://` may block the JSON/module fetch; use HTTP. The sparse preview requires Git object availability for the pinned source commit. It intentionally refuses missing or mismatched references rather than substituting another original.

## Identity and scope

[manifest.json](manifest.json) binds every original, prompt, provenance record and wave note to its repository path, byte length, Git blob and SHA-256 at source commit `091936e27c3b9f1c061081ca93827014a927d963`. The manifest derives from the committed 40-work inventory and each wave's selected records. Original SHA-256 and dimensions come from those inspection records; the validator checks all Git modes, blob IDs and lengths and rehashes the linked text files. It does **not** decode or reread all 92,797,189 PNG bytes. The two unselected outputs are preserved separately.

Validation of records, references and HTTP headers is distinct from native interaction, visual review, runtime adoption and release verification. The owner reviewed this catalog in a native browser: all 40 selections/four themes were present; controlled select changes and keyboard Previous/Next worked; four unique Wave 10 images completed at 1774 × 887 with one IMG observed each. An actual Tidal Mosaic Observatory download matched its 2,350,777-byte committed original and SHA-256; the following Tab focused Read generation prompt. A rapid sequence selected Spend twice, so this is not an exhaustive linear keyboard journey. Existing full-size and per-wave observations retain their own scope; no physical-device, runtime-install, award or release qualification is added.

To extend the catalog later, first commit the approved source cohort and its selected inventory. Rebind the catalog's source revision and regenerate its metadata from those exact records; preserve earlier originals and prompt/provenance history. Merely listing a source here never registers it in a game pack.
