import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compileAssetRevision } from '../content-design/assets.mjs';
import { compileContentProject, resolveMission } from '../content-design/project.mjs';
import { createContentExecutionCatalog } from '../content-design/execution.mjs';
import { createCompanyProject } from '../company-campaigns/content.mjs';
import { resolveEditionAssets } from '../editions/model.mjs';
import { validateRetainedPresentation } from '../editions/retained-presentation.mjs';

const root = new URL('../../', import.meta.url);
const json = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const [catalog, artwork, sources, prompts] = await Promise.all(
  [
    'game/editions/catalog.json',
    'game/editions/artwork.json',
    'game/editions/asset-sources.json',
    'game/editions/art-prompts-post-playtest-01.json',
  ].map(json),
);
const batch = [
  ['coupa-source-to-pay', 'coupa-foundations', 'coupa-choose-together-v1'],
  ['coupa-product-operations', 'coupa-operations', 'coupa-repair-the-draft-v1'],
  ['coupa-developer-integration', 'coupa-developers', 'coupa-scoped-access-v1'],
];

test('post-playtest pictures retain exact original PNG bytes, dimensions and generation prompts', async () => {
  for (const [campaign, , id] of batch) {
    const missionId = `${campaign}-02`,
      asset = catalog.assets.find((entry) => entry.id === id),
      picture = compileAssetRevision(artwork.find((entry) => entry.id === `${missionId}-picture`)),
      source = sources.assets.find((entry) => entry.id === id),
      prompt = prompts.assets.find((entry) => entry.id === missionId);
    assert.ok(asset && source && prompt, `Complete source provenance for ${id}`);
    const data = await readFile(new URL(asset.path, root));
    assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(data.length, asset.bytes);
    assert.equal(data.length, picture.bytes);
    assert.equal(data.length, source.bytes);
    assert.ok(data.length <= 4 * 1024 * 1024);
    const hash = createHash('sha256').update(data).digest('hex');
    assert.equal(hash, asset.sha256);
    assert.equal(hash, picture.sha256);
    assert.equal(hash, source.sha256);
    assert.equal(`game/${picture.path}`, asset.path);
    assert.equal(source.path, asset.path);
    assert.equal(data.readUInt32BE(16), picture.width);
    assert.equal(data.readUInt32BE(20), picture.height);
    assert.equal(picture.width, 1774);
    assert.equal(picture.height, 887);
    assert.equal(picture.review, 'candidate');
    assert.equal(source.rights, 'generated-original');
    assert.equal(source.source, prompts.tool);
    assert.equal(source.prompt, prompt.prompt);
    assert.equal(source.derivation, 'Original generated PNG bytes, unchanged.');
    assert.deepEqual(asset.dependencies, []);
    assert.equal(source.publication, 'public');
  }
});

test('new mission pictures enter only their campaign and combined edition asset selections', async () => {
  const ids = new Set(batch.map(([, , id]) => id));
  for (const edition of catalog.editions) {
    const selected = resolveEditionAssets(catalog, { editionId: edition.id });
    const expected = batch
      .filter(([campaign]) => edition.campaignIds.includes(campaign))
      .map(([, , id]) => id)
      .sort();
    assert.deepEqual(
      selected
        .filter((asset) => ids.has(asset.id))
        .map((asset) => asset.id)
        .sort(),
      expected,
      edition.id,
    );
  }
  for (const [campaign, , id] of batch) {
    const descriptor = catalog.campaigns.find((entry) => entry.id === campaign);
    const project = await json(descriptor.sourcePath);
    const mission = project.missions.find((entry) => entry.id === `${campaign}-02`);
    assert.equal(mission.presentation.backgroundAssetId, `${campaign}-02-picture`);
    assert.ok(descriptor.assetIds.includes(id));
    assert.ok(!catalog.brands.find((brand) => brand.id === 'coupa').assetIds.includes(id));
  }
});

test('picture additions preserve all gameplay manifests but correctly change strict presentation execution keys', () => {
  const addedIds = new Set(batch.map(([campaign]) => `${campaign}-02-picture`));
  const previousArt = artwork.filter((entry) => !addedIds.has(entry.id));
  for (const [campaignId] of batch) {
    const previousSource = createCompanyProject({
      brandId: 'coupa',
      campaignId,
      artwork: previousArt,
    });
    const currentSource = createCompanyProject({ brandId: 'coupa', campaignId, artwork });
    const previous = compileContentProject(previousSource),
      current = compileContentProject(currentSource);
    for (const difficulty of ['gentle', 'standard', 'expert'])
      for (const mission of previousSource.missions) {
        const options = { mode: 'solo', difficulty };
        const before = resolveMission(previous, mission.id, options),
          after = resolveMission(current, mission.id, options);
        assert.deepEqual(after.level, before.level, `${mission.id}/${difficulty}`);
        assert.equal(after.simulationIdentity, before.simulationIdentity);
      }
    const before = createContentExecutionCatalog(previousSource),
      after = createContentExecutionCatalog(currentSource);
    assert.equal(before.entries.length, after.entries.length);
    for (let i = 0; i < before.entries.length; i++)
      assert.notEqual(
        before.entries[i].executionKey,
        after.entries[i].executionKey,
        'Strict saved presentation restoration requires its retained source snapshot',
      );
  }
});

test('the first artwork batch retains its four exact original public snapshots through later updates', async () => {
  const affected = ['coupa-all', ...batch.map(([, editionId]) => editionId)].sort();
  const registered = affected.map((id) => catalog.editions.find((edition) => edition.id === id));
  assert.ok(registered.every((edition) => edition?.presentationHistory?.length));
  const newIds = new Set(batch.map(([, , id]) => id));
  for (const edition of registered) {
    const descriptor = edition.presentationHistory.find(
      (item) => item.path === `game/editions/retained/${edition.id}.json`,
    );
    assert.ok(
      descriptor,
      'The first artwork snapshot remains registered independently of later snapshots.',
    );
    assert.deepEqual(Object.keys(descriptor).sort(), ['bytes', 'id', 'path', 'sha256']);
    const bytes = await readFile(new URL(descriptor.path, root));
    assert.equal(bytes.length, descriptor.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), descriptor.sha256);
    const { snapshot } = await validateRetainedPresentation(JSON.parse(bytes), { edition });
    assert.equal(snapshot.authoredPresentationSha256, descriptor.id);
    assert.equal(snapshot.editionId, edition.id);
    assert.equal(snapshot.catalog.editions[0].revision, 4);
    assert.ok(edition.revision > snapshot.catalog.editions[0].revision);
    assert.ok(snapshot.catalog.assets.every((asset) => !newIds.has(asset.id)));
    for (const original of snapshot.catalog.assets) {
      const current = catalog.assets.find((asset) => asset.id === original.id);
      assert.ok(current, `Original ${original.id} remains available`);
      for (const key of ['path', 'sha256', 'bytes', 'publication'])
        assert.equal(current[key], original[key], `${original.id}.${key}`);
    }
  }
});
