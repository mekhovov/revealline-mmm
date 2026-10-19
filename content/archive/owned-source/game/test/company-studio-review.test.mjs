import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  STUDIO_REVIEW_CHECKS,
  createStudioReviewContext,
  studioReviewPacket,
  validateStudioReviewPacket,
  studioGenerationNotes,
} from '../../authoring/company-studio/review-model.mjs';
import { REPORT_FORMAT, STUDIO_REPORT_CHECKS } from '../../authoring/company-studio/model.mjs';

const json = async (path) =>
  JSON.parse(await readFile(new URL(`../../${path}`, import.meta.url), 'utf8'));
async function fixture(editionId = 'droneaid-nl-community') {
  const catalog = await json('game/editions/catalog.json');
  const edition = catalog.editions.find(({ id }) => id === editionId);
  const campaigns = catalog.campaigns.filter(({ id }) => edition.campaignIds.includes(id));
  const files = new Map(
    await Promise.all(
      [
        edition.boot.themes,
        ...campaigns.flatMap(({ sourcePath, lessonPath }) => [
          sourcePath,
          ...(lessonPath ? [lessonPath] : []),
        ]),
      ].map(async (path) => [path, await json(path)]),
    ),
  );
  const report = {
    format: REPORT_FORMAT,
    editionId,
    brandId: edition.brandId,
    name: edition.name,
    summary: {
      campaigns: campaigns.length,
      missions: 36,
      lessons: 0,
      assets: 1,
      runtimeFiles: 1,
      runtimeBytes: 1000,
    },
    admittedPaths: ['game/company.html'],
    excluded: { editionIds: [], brandIds: [], campaignIds: [], assetIds: [] },
    checks: STUDIO_REPORT_CHECKS,
    artifact: { path: 'edition-build.json', bytes: 1234, sha256: 'a'.repeat(64) },
    previewURL: '/dist/preview/game/company.html',
  };
  return {
    context: createStudioReviewContext({ catalog, editionId, files, report }),
    catalog,
    files,
    report,
  };
}
const observation = (context) => ({
  missionId: context.missions[0].id,
  picture: context.missions[0].picture,
  observer: 'Synthetic observer fixture',
  observedAt: '2026-09-26T12:00:00.000Z',
  viewport: { width: 1280, height: 720 },
  motion: 'standard',
  sceneState: 'initial',
  checks: STUDIO_REVIEW_CHECKS.map(({ id }, index) => ({
    id,
    status: index ? 'not-observed' : 'observed',
    notes: index ? '' : 'Synthetic test observation, not a real artwork review.',
  })),
  notes: '',
});

test('review context selects all 36 current FPV pictures and keeps culture sources distinct', async () => {
  const { context } = await fixture();
  assert.equal(context.missions.length, 36);
  assert.deepEqual(
    context.missions
      .filter(({ picture }) => picture.revision === '3')
      .map(({ id, picture }) => [id, picture.path]),
    [
      [
        'droneaid-nl-parts-in-motion-03',
        'editions/assets/droneaid-nl/artwork-v3/droneaid-nl-parts-in-motion-03.png',
      ],
    ],
  );
  assert(
    context.missions
      .filter(({ picture }) => picture.revision !== '3')
      .every(({ picture }) => picture.revision === '2' && picture.path.includes('/artwork-v2/')),
  );
  assert(
    context.missions.every(({ sources }) =>
      sources.some(({ url }) => url === 'https://drone-aid.nl/en'),
    ),
  );
  assert(Object.isFrozen(context.missions[0].picture));
  const { context: culture } = await fixture('coupa-culture');
  assert.equal(culture.missions.length, 6);
  assert(culture.missions.every(({ notice }) => notice.includes('Fictional, offline training')));
  assert(
    culture.missions.every(({ sources }) =>
      sources.some(({ url }) => url === 'https://careers.coupa.com/en/life-at-coupa/'),
    ),
  );
});

test('explicit observations roundtrip with exact artifact and picture pins without approval fields', async () => {
  const { context } = await fixture();
  const row = observation(context),
    packet = studioReviewPacket(context, [row]);
  assert.deepEqual(validateStudioReviewPacket(JSON.stringify(packet), context), packet);
  assert.equal(packet.purpose, 'manual-observations-not-approval');
  assert.equal(packet.observations[0].checks[1].status, 'not-observed');
  const partial = { ...row, sceneState: 'partial' };
  assert.equal(studioReviewPacket(context, [row, partial]).observations.length, 2);
});

test('review import rejects stale artifacts, wrong pictures, foreign missions, duplicates and invented approval', async () => {
  const { context } = await fixture();
  const original = studioReviewPacket(context, [observation(context)]);
  const mutations = [
    (packet) => {
      packet.artifact.sha256 = 'b'.repeat(64);
    },
    (packet) => {
      packet.editionId = 'coupa-all';
    },
    (packet) => {
      packet.observations[0].missionId = 'foreign-01';
    },
    (packet) => {
      packet.observations[0].picture.revision = '1';
    },
    (packet) => {
      packet.observations[0].picture.sha256 = 'b'.repeat(64);
    },
    (packet) => {
      packet.observations.push(structuredClone(packet.observations[0]));
    },
    (packet) => {
      packet.approved = true;
    },
    (packet) => {
      packet.observations[0].checks[0].status = 'approved';
    },
    (packet) => {
      packet.observations[0].checks[0].notes = '';
    },
    (packet) => {
      packet.observations[0].checks[4] = {
        id: 'reduced-motion',
        status: 'observed',
        notes: 'No reduced mode selected',
      };
    },
    (packet) => {
      packet.observations[0].viewport.width = 9000;
    },
    (packet) => {
      packet.observations[0].notes = 'x'.repeat(4001);
    },
  ];
  for (const mutate of mutations) {
    const packet = structuredClone(original);
    mutate(packet);
    assert.throws(() => validateStudioReviewPacket(packet, context));
  }
  assert.throws(
    () => validateStudioReviewPacket(' '.repeat(2 * 1024 * 1024 + 1), context),
    /budget/i,
  );
});

test('generation notes skip exact superseded pictures and expose current warnings without master access', async () => {
  const { context } = await fixture();
  const notes = (
    await Promise.all(
      [
        'game/editions/art-prompts-droneaid-fpv-workshop-v2.json',
        'game/editions/art-prompts-droneaid-fpv-makers-handoff-v2.json',
        'game/editions/art-prompts-droneaid-fpv-community-v2.json',
        'game/editions/art-prompts-droneaid-fpv-crop-fix-v3.json',
      ].map(json),
    )
  ).flatMap((receipt) => studioGenerationNotes(receipt, context));
  assert.equal(notes.length, 36);
  assert.deepEqual(
    notes
      .filter(({ warning }) => warning)
      .map(({ missionId }) => missionId)
      .sort(),
    [
      'droneaid-nl-parts-in-motion-04',
      'droneaid-nl-signals-of-support-01',
      'droneaid-nl-workshop-lights-06',
    ],
  );
  assert(!JSON.stringify(notes).includes('$CODEX_HOME'));
  const { context: coupa } = await fixture('coupa-all');
  assert.equal(
    studioGenerationNotes(await json('game/editions/art-prompts-coupa-bulk-02.json'), coupa).length,
    22,
  );
});

test('generation note import rejects changed selected bytes, duplicate rows and unsafe source links', async () => {
  const { context } = await fixture();
  const original = await json('game/editions/art-prompts-droneaid-fpv-workshop-v2.json');
  for (const mutate of [
    (receipt) => {
      receipt.assets[0].selected.sha256 = 'b'.repeat(64);
    },
    (receipt) => {
      receipt.assets[0].revision = 1;
    },
    (receipt) => {
      receipt.assets.push(receipt.assets[0]);
    },
    (receipt) => {
      receipt.sourceReferences = ['javascript:alert(1)'];
    },
    (receipt) => {
      receipt.assets[0].review.compositionNote = 'x'.repeat(8001);
    },
  ]) {
    const receipt = structuredClone(original);
    mutate(receipt);
    assert.throws(() => studioGenerationNotes(receipt, context));
  }
});
