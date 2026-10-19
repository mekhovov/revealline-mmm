import assert from 'node:assert/strict';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildTacticalChallenges, CHALLENGE_IDS } from '../tactical-challenges/build.mjs';
import { validatePack, PACK_LIMITS } from '../../../game/packs.mjs';
import { inspectImageDataUrl, CONTENT_LIMITS } from '../../../game/content.mjs';
import { campaignKey } from '../../../game/library.mjs';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const CHAPTER_ROOT = 'authoring/library/fpv-route-choices';
export const PACK_FILE = `${CHAPTER_ROOT}/packs/fpv-route-choices.json`;
export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const SOURCE_PINS = Object.freeze({
  'authoring/library/tactical-challenges/build.mjs':
    '5286b9ad70c9db945579c63bb1e57de9ccefc4e45f4af0ecb3636f5bb72c3457',
  'authoring/library/tactical-challenges/routes.json':
    'e8b9429a562a445025f03c5375eaab6dd3853bd73b29789859ee2dd2089f95f4',
  'authoring/library/four-worlds-chapters/verify-images.mjs':
    '100995d31bb65ed7797b0941988624cab76a2c37b297c81ec98ab8e16febcc34',
  'authoring/library/challenge-chapter-art/provenance.json':
    '4bea88060c4d5b8b6e484e6ba85afebe4b22ff315ab03c327b8916321caa9d18',
  'authoring/library/challenge-chapter-art/prompts.json':
    'c5de9cd5e54800529b94c84a5ff3fcab21730b87b5c1cc21363db7105752545b',
  'game/content/themes.json': '93582f7d9ba53753106df7b63928f086820fc0f68357d3c08f26c0b89fb84774',
  'game/content/classes.json': '2f776b0dfd099478ffe78465c7b602cd98896206a222a0ed7fd4405a4a643f84',
  'authoring/library/tactical-challenges/scenarios/challenge-crosswind-depot.json':
    '659f65e975d374b7ec6e493d9e2405d6f7bb1dae2e7f410731370be7a6badaf0',
  'authoring/library/tactical-challenges/scenarios/challenge-forked-approach.json':
    'aacad1980854527a20a57d1d6abcd6bf6d9adef3088b02a89e8aa6d541d419bc',
  'authoring/library/tactical-challenges/scenarios/challenge-signal-switchback.json':
    '8902ea649b427ef65145408f853d81e272bf7cc5627b5a2cc3cd8a3c835cc07c',
  'authoring/library/challenge-chapter-art/originals/crosswind-depot.png':
    'c7cd2e7d98ecea4b02a63a46da583e2cdd3bcfe627fb929c06235e39fca2ee04',
  'authoring/library/challenge-chapter-art/originals/signal-switchback.png':
    '2f454f321578454b79d6f01205b1e25ab2364d1d1cbb58fb98b9a8197f6ae345',
  'authoring/library/challenge-chapter-art/originals/split-signal-foundry.png':
    'dfc6398db48c897df00254f4516704b44b134a9bfbb4bd993d659996077f0749',
});
export const ASSIGNMENTS = Object.freeze([
  Object.freeze({
    sourceLevelId: 'challenge-forked-approach',
    levelId: 'route-choices-foundry',
    imageId: 'split-signal-foundry',
    name: 'Split Signal Foundry',
    classId: 'scout',
  }),
  Object.freeze({
    sourceLevelId: 'challenge-crosswind-depot',
    levelId: 'route-choices-depot',
    imageId: 'crosswind-depot',
    name: 'Crosswind Depot',
    classId: 'bomber',
  }),
  Object.freeze({
    sourceLevelId: 'challenge-signal-switchback',
    levelId: 'route-choices-switchback',
    imageId: 'signal-switchback',
    name: 'Signal Switchback',
    classId: 'fiber',
  }),
]);
const descriptions = [
  'Recommended: Scout. Tactical challenge: reveal 30%. Read the interceptor warning and choose either exit around the center barrier before closing at the bottom safe edge. Its locked target and travelling line-hit fronts make a stalled cable dangerous. Walls cannot close a cut. Manual equipment remains available; no supply charge is needed. This is an original route-choice study with fixed Standard grades, not a human-qualified difficulty rating.',
  'Recommended: Light carrier. Tactical challenge: reveal 45% and capture the visible western relay. Collect at home, fly Down about five cells, then place a stun field before the patrol crosses the cable. Without equipment, use the safe western edge, middle gate and two cuts. The field buys time; it does not deliver cargo. Standard has an eight-second cut limit; Gentle relaxes limits and slows the patrol.',
  'Recommended: Fiber relay. Tactical challenge: reveal 48% and capture the northern relay. Cross Right through the signal band. Scan reveals information there, but is not required to win. On Standard, signal resistance preserves speed and equipment while the eight-second and 76-cell cable limits still apply. An ordinary craft can take the safe northern rim and cut beyond the band. Gentle removes those cut limits; it is separate relaxed practice.',
];

export async function ordinaryFile(relative, expected, limit = PACK_LIMITS.maxBytes) {
  assert.ok(
    !path.isAbsolute(relative) && !relative.split('/').some((p) => !p || p === '.' || p === '..'),
  );
  let current = ROOT;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    assert.equal((await lstat(current)).isSymbolicLink(), false);
  }
  const info = await lstat(current);
  assert.ok(info.isFile() && info.size <= limit, 'Bounded ordinary chapter input.');
  const bytes = await readFile(current);
  assert.ok(bytes.length <= limit);
  if (expected) assert.equal(sha(bytes), expected, `Exact source: ${relative}`);
  return bytes;
}

export async function readRouteChoicesSources() {
  const raw = new Map();
  for (const [file, pin] of Object.entries(SOURCE_PINS))
    raw.set(
      file,
      await ordinaryFile(
        file,
        pin,
        file.endsWith('.png') ? CONTENT_LIMITS.maxImageBytes : 2 * 1024 * 1024,
      ),
    );
  const scenarios = CHALLENGE_IDS.map((id) =>
    JSON.parse(raw.get(`authoring/library/tactical-challenges/scenarios/${id}.json`)),
  );
  assert.deepEqual(scenarios, await buildTacticalChallenges());
  const provenance = JSON.parse(raw.get('authoring/library/challenge-chapter-art/provenance.json'));
  const prompts = JSON.parse(raw.get('authoring/library/challenge-chapter-art/prompts.json'));
  assert.equal(provenance.format, 'revealline-art-provenance.v1');
  assert.equal(prompts.format, 'revealline-art-prompts.v1');
  assert.deepEqual(
    provenance.images.map((i) => i.id),
    ASSIGNMENTS.map((a) => a.imageId),
  );
  assert.deepEqual(
    prompts.assets.map((i) => i.id),
    ASSIGNMENTS.map((a) => a.imageId),
  );
  const images = ASSIGNMENTS.map((assignment, index) => {
    const record = provenance.images[index],
      prompt = prompts.assets[index];
    assert.equal(record.file, `originals/${assignment.imageId}.png`);
    assert.equal(prompt.file, record.file);
    assert.ok(prompt.prompt.length > 0);
    const file = `authoring/library/challenge-chapter-art/${record.file}`,
      bytes = raw.get(file);
    assert.equal(bytes.length, record.bytes);
    assert.equal(sha(bytes), record.sha256);
    const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
    const header = inspectImageDataUrl(dataUrl);
    assert.equal(header.valid, true, header.errors.join('; '));
    assert.equal(header.width, record.width);
    assert.equal(header.height, record.height);
    assert.equal(header.width, header.height * 2);
    return { record, file, dataUrl };
  });
  assert.equal(new Set(images.map((i) => i.record.sha256)).size, 3);
  const theme = structuredClone(scenarios[0].theme);
  theme.subtitle = 'Route Choices · Tactical';
  const pack = {
    format: 'xonix-pack.v5',
    id: 'fpv-route-choices',
    version: '1.0.0',
    name: 'FPV Front · Route Choices — Tactical',
    description:
      'Optional Tactical teaching and challenge chapter: three distinct wide layouts with original scenic pictures. Choose around a warned interceptor, time a carrier field or take the equipment-free gate, and compare Fiber resistance with a longer safe-rim route. Manual equipment stays available. Fixed authored Standard grades; Gentle is relaxed practice. Original abstract game mechanics, not a completed Tactical mode or a human-qualified difficulty rating. Install explicitly; outside current catalogs and default downloads.',
    engine: 'xonix-core.v5',
    dependencies: [],
    metadata: {
      author: 'RevealLine',
      license: 'Original project content',
      rightsStatus:
        'Original AI-assisted project illustrations and authored abstract gameplay. Exact PNG/prompt provenance retained; no source-game artwork or real-airframe fidelity claim.',
    },
    themes: [theme],
    classRecipes: structuredClone(scenarios[0].classRecipes),
    campaigns: [
      {
        version: 'xonix-campaign.v1',
        id: 'fpv-route-choices',
        revision: '1',
        title: 'FPV Front · Route Choices — Tactical',
        themeId: 'fpv',
        classIds: scenarios[0].classRecipes.map((r) => r.id),
        levels: scenarios.map((s, index) => {
          const assignment = ASSIGNMENTS[index],
            level = structuredClone(s.level);
          assert.equal(level.id, assignment.sourceLevelId);
          level.id = assignment.levelId;
          level.revision = '1';
          level.name = assignment.name;
          level.themeId = 'fpv';
          // The separate source demo keeps its Arcade policy. This new Tactical map
          // deliberately exposes the unchanged registered manual equipment rules.
          if (index === 0) delete level.classic.arcadeActions;
          level.metadata = {
            title: assignment.name,
            description: descriptions[index],
            author: 'RevealLine',
            license: 'Original project content',
            rightsStatus:
              'Original layout study with a distinct campaign identity and original scenic picture. Gameplay geometry is independent of scenery.',
          };
          return level;
        }),
      },
    ],
    visualOverrides: {},
    levelVisuals: ASSIGNMENTS.map((assignment, index) => ({
      levelId: assignment.levelId,
      visualOverrides: {
        background: {
          dataUrl: images[index].dataUrl,
          name: assignment.name,
          fit: 'contain',
          metadata: {
            title: assignment.name,
            description:
              'Original scenic collectible for this Tactical route-choice map. Artwork is separate from playable actor geometry.',
            author: 'RevealLine · AI-assisted original artwork',
            license: 'Original project artwork',
            rightsStatus:
              'Exact original PNG; prompt and provenance retained under authoring/library/challenge-chapter-art. No resizing, recompression or image edits.',
          },
        },
      },
    })),
    music: [],
    masteries: [],
  };
  const checked = validatePack(pack);
  assert.equal(checked.valid, true, checked.errors.join('; '));
  assert.ok(Buffer.byteLength(JSON.stringify(pack)) <= PACK_LIMITS.maxBytes);
  const libraryBytes = Buffer.byteLength(
    JSON.stringify({ format: 'xonix-pack-library.v1', packs: [pack] }),
  );
  assert.ok(libraryBytes <= PACK_LIMITS.libraryBytes);
  return {
    pack,
    scenarios,
    sourceProof: JSON.parse(raw.get('authoring/library/tactical-challenges/routes.json')),
    images,
    libraryBytes,
  };
}
export function distributionFor(source) {
  const text = JSON.stringify(source.pack, null, 2) + '\n';
  return {
    format: 'revealline-optional-tactical-chapter.v1',
    distribution: 'manual-optional-import',
    includedInDefaultBuild: false,
    mode: 'Tactical',
    id: source.pack.id,
    version: source.pack.version,
    path: PACK_FILE,
    bytes: Buffer.byteLength(text),
    sha256: sha(text),
    normalizedBytes: Buffer.byteLength(JSON.stringify(source.pack)),
    normalizedSha256: sha(JSON.stringify(source.pack)),
    libraryBytes: source.libraryBytes,
    campaignKey: campaignKey({
      ...source.pack.campaigns[0],
      classRecipes: source.pack.classRecipes,
    }),
    themeId: 'fpv',
    maps: ASSIGNMENTS.map((assignment, index) => ({
      ...assignment,
      imageBytes: source.images[index].record.bytes,
      imageSha256: source.images[index].record.sha256,
      fit: 'contain',
    })),
    sourcePins: SOURCE_PINS,
  };
}
export async function buildRouteChoices({ write = false } = {}) {
  assert.equal(typeof write, 'boolean', 'Route Choices write flag must be boolean.');
  const source = await readRouteChoicesSources();
  const outputs = [
    [PACK_FILE, source.pack],
    [`${CHAPTER_ROOT}/distribution.json`, distributionFor(source)],
  ].map(([file, value]) => ({ file, bytes: Buffer.from(JSON.stringify(value, null, 2) + '\n') }));
  for (const output of outputs) assert.ok(output.bytes.length <= PACK_LIMITS.maxBytes);
  if (write)
    for (const output of outputs)
      await assert.rejects(lstat(path.join(ROOT, output.file)), { code: 'ENOENT' });
  for (const output of outputs)
    if (write) await writeFile(path.join(ROOT, output.file), output.bytes, { flag: 'wx' });
    else
      assert.deepEqual(
        await ordinaryFile(output.file),
        output.bytes,
        `Exact regenerated chapter: ${output.file}`,
      );
  return source;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--write'));
  const source = await buildRouteChoices({ write: args.length === 1 });
  console.log(JSON.stringify(distributionFor(source)));
}
