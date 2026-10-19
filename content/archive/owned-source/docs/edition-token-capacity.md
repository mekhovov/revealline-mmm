# Lossless edition token-spacing compaction

At main `8896c4976afec6991c0a34b31ccf28e50dfebf96`, the ordinary
`droneaid-nl-community` build exceeded the existing 64 MiB limit: 887 files /
67,324,907 bytes, an overage of 216,043 bytes. Recent shared appearance code
increased the runtime closure; the largest existing image/audio assets had not
changed. The repair keeps all content and the existing 2,000-file / 64 MiB guard.

The existing `scripts/edition-code-indentation.mjs` projection now removes
redundant ASCII spaces/tabs between lexical ranges as well as indentation. It
runs on distribution copies only. It preserves every token, comment (including
licenses), literal, Unicode whitespace, BOM and line terminator. Conservative
separators prevent words, operators and numeric member access joining into new
tokens. Every changed module must retain the identical Acorn syntax tree and
exact token/comment slices; any mismatch fails the build. Keeping line
terminators preserves automatic semicolon insertion. Vendor and source-mapped
files are excluded; unchanged buffers keep their original identity. Existing
exports and build wiring are retained.

Application source modules, media bytes, data values, publication permissions,
versions and package limits remain intact. Generated artifact manifests and offline
worker identities are rebuilt normally from the resulting distribution bytes.
One expected output string in the existing qualification script is updated;
no new unit coverage is introduced.

## Evidence

[The bound receipt](evidence/edition-token-capacity-verification.json) records
all 18 ordinary editions compiled sequentially in memory. All pass. The formerly
failing edition now has 887 files / **67,045,468 bytes**: **279,439 bytes saved**,
with **63,396 bytes of headroom**. Continued growth still needs normal checks.
All 1,324 bound inputs remained stable during the run. Every one of the 792
engine inputs passed the projection/idempotence check; actual compilation also
runs ordinary content, media and code-closure validation.

The three existing functional checks pass, covering templates, regular
expressions, continued strings, comments/licenses, ASI, BOM/Unicode line
terminators, vendor/source-map exclusions and unchanged data/media buffers.
Syntax, ESLint and Prettier checks pass. This is working-tree build evidence;
frozen committed-input, ZIP/reproducibility, CI and protected publication remain
separate qualification gates. It makes no browser, hardware or human acceptance
claim.

## Reproduce without large output directories

Run from the repository root:

```sh
node --check scripts/edition-code-indentation.mjs
node --test scripts/test-edition-code-indentation.mjs
node_modules/.bin/eslint scripts/edition-code-indentation.mjs scripts/test-edition-code-indentation.mjs
node_modules/.bin/prettier --check scripts/edition-code-indentation.mjs scripts/test-edition-code-indentation.mjs
node --input-type=module <<'NODE'
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import {
  collectEditionEngineFiles, collectEditionSelectedFiles, compileEdition,
} from './scripts/compile-edition.mjs';
const root = process.cwd();
const catalog = JSON.parse(await fs.readFile('game/editions/catalog.json'));
const version = 'v' + JSON.parse(await fs.readFile('package.json')).version;
const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const engine = await collectEditionEngineFiles({ root });
const ids = [
  'coupa-all', 'coupa-adventure', 'coupa-culture', 'coupa-foundations',
  'coupa-operations', 'coupa-developers', 'droneaid-community',
  'droneaid-nl-community', 'droneaid-nl-workshop-lights',
  'droneaid-nl-parts-in-motion', 'droneaid-nl-signals-of-support',
  'droneaid-nl-careful-handoff', 'droneaid-nl-makers-together',
  'droneaid-nl-shared-horizon', 'social-drone-ua', 'victory-drones',
  'ukraine-culture', 'fpv-learning',
];
for (const id of ids.sort()) {
  const selected = await collectEditionSelectedFiles({
    catalog, editionIds: [id], read: (name) => fs.readFile(name),
  });
  const result = await compileEdition({
    catalog, editionIds: [id], files: new Map([...engine, ...selected]),
    enginePaths: [...engine.keys()], version, sourceRevision,
    offline: { basePath: '/revealline/' },
  });
  const bytes = [...result.files.values()].reduce((sum, value) => sum + value.length, 0);
  console.log(JSON.stringify({ id, files: result.files.size, bytes, headroom: 67108864 - bytes }));
}
NODE
```
