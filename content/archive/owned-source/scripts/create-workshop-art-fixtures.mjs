#!/usr/bin/env node
/** Public-input QA fixtures; no state injection, image editing or gameplay awards from artwork. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, lstat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRun, stepRun, releaseInputs, getSummary, FIXED_DT } from '../game/core/index.mjs';
import {
  createRecorder,
  recordInput,
  recordRelease,
  exportReplay,
  verifyReplay,
  authoritativeCheckpoint,
} from '../game/replay.mjs';
import {
  preparePack,
  resolvePackCampaign,
  scenarioFromPack,
  emptyPackLibrary,
  installPack,
} from '../game/packs.mjs';
import { CONTENT_LIMITS, inspectImageDataUrl } from '../game/content.mjs';
import { prepareScenario } from '../game/imports.mjs';
import {
  campaignKey,
  emptyLibrary,
  recordLibraryCompletion,
  exportLibrary,
  updatePreferences,
} from '../game/library.mjs';
import { suspendSession, restoreSession } from '../game/sessions.mjs';
import { exportBackup } from '../game/backup.mjs';
import { digest } from './verify-campaign.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const FORMAT = 'revealline-workshop-art-fixtures.v1';
const STAMP = '2026-09-12T16:00:00.000Z';
export const WORKSHOP_PREVIOUS_SHA256 =
  '91876d315417252a65a36b1a46f3f3e03737ec26ccc08224f52e9c376f76ea1a';
export const WORKSHOP_PROOF_SHA256 =
  '22886cf439f716db31333b3b6d9fae0478f8007aff734632badc7c2f38dc53c8';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (bytes) => JSON.parse(bytes.toString());
const metadataOnly = (pack) => ({ ...pack, version: '1.0.0', levelVisuals: [] });

/** Exact known-source/header adapter for Node transport checks. It does NOT decode PNG pixels. */
export async function loadWorkshopArtInputs(root = ROOT) {
  const read = (name) => readFile(path.join(root, name));
  const previousBytes = await read(
    'authoring/library/equipment-workshop/previous/equipment-workshop-1.0.0.json',
  );
  assert.equal(
    sha(previousBytes),
    WORKSHOP_PREVIOUS_SHA256,
    'The retained procedural edition must remain byte-identical.',
  );
  const currentBytes = await read('game/content/packs/equipment-workshop.json');
  const previousSource = json(previousBytes),
    currentSource = json(currentBytes);
  assert.equal(currentSource.version, '1.1.0', 'Generate the reviewed illustrated Workshop first.');
  assert.deepEqual(
    metadataOnly(currentSource),
    previousSource,
    'Artwork must not alter nonvisual content.',
  );
  assert.deepEqual(
    currentSource.levelVisuals.map((entry) => entry.levelId),
    ['workshop-01', 'workshop-02', 'workshop-03'],
  );
  const known = new Map(),
    images = [];
  for (const entry of currentSource.levelVisuals) {
    assert.deepEqual(Object.keys(entry.visualOverrides), ['background']);
    const background = entry.visualOverrides.background;
    const sourcePath = `authoring/library/equipment-workshop/backgrounds/${entry.levelId}.png`;
    const file = path.join(root, sourcePath),
      before = await lstat(file);
    assert.ok(
      before.isFile() && !before.isSymbolicLink(),
      'Artwork source must be a regular file.',
    );
    const bytes = await readFile(file),
      after = await lstat(file);
    for (const field of ['size', 'mtimeMs', 'ctimeMs', 'ino'])
      assert.equal(after[field], before[field]);
    assert.equal(
      background.dataUrl,
      `data:image/png;base64,${bytes.toString('base64')}`,
      'Embedded source bytes must be exact.',
    );
    assert.equal(background.fit, 'contain');
    const info = inspectImageDataUrl(background.dataUrl);
    assert.equal(info.valid, true, info.errors.join('; '));
    assert.equal(
      info.width * 3,
      info.height * 4,
      'Reviewed source must have actual 4:3 dimensions.',
    );
    known.set(background.dataUrl, info);
    images.push({
      levelId: entry.levelId,
      sourcePath,
      bytes: bytes.length,
      sha256: sha(bytes),
      width: info.width,
      height: info.height,
    });
  }
  assert.equal(
    new Set(images.map((image) => image.sha256)).size,
    3,
    'Three distinct source byte streams are required.',
  );
  const decodeImage = async (dataUrl) => {
    const info = known.get(dataUrl);
    assert.ok(
      info,
      'Only the exact selected original sources are accepted by this header adapter.',
    );
    return { naturalWidth: info.width, naturalHeight: info.height };
  };
  const previous = (await preparePack(previousSource, { decodeImage })).pack;
  const current = (await preparePack(currentSource, { decodeImage })).pack;
  const proofBytes = await read('game/replays/expansion-routes.json');
  assert.equal(
    sha(proofBytes),
    WORKSHOP_PROOF_SHA256,
    'Existing proof bytes must not be regenerated for art.',
  );
  const routes = json(proofBytes).routes.filter((route) => route.packId === current.id);
  assert.equal(routes.length, 6);
  assert.equal(new Set(routes.map((r) => `${r.levelId}/${r.turnPolicy}`)).size, 6);
  return {
    previous,
    current,
    previousBytes,
    currentBytes,
    routes,
    proofBytes,
    images,
    decodeImage,
  };
}

/** Execute an existing ordinary proof or its prefix using only public fixed-tick inputs. */
export function replayWorkshopRoute(pack, route, limit = route.expected.tick) {
  const { campaign } = resolvePackCampaign(pack, 'equipment-workshop');
  const level = campaign.levels.find((entry) => entry.id === route.levelId);
  assert.equal(digest(level), route.levelSha256);
  assert.equal(digest(campaign.classRecipes), route.classesSha256);
  const options = {
    classId: route.classId,
    classRecipes: campaign.classRecipes,
    seed: route.seed,
    turnPolicy: route.turnPolicy,
  };
  const run = createRun(level, options),
    recorder = createRecorder(level, options, 'round-27-legal-workshop-art');
  for (const segment of route.segments) {
    if (run.tick >= limit) break;
    if (segment.releaseBefore) {
      releaseInputs(run);
      recordRelease(recorder);
    }
    for (let tick = 0; tick < segment.ticks && run.tick < limit; tick++) {
      assert.ok(
        ['running', 'respawning'].includes(run.status),
        'Never record commands after a terminal state.',
      );
      stepRun(run, segment.input, FIXED_DT);
      recordInput(recorder, segment.input);
    }
  }
  assert.equal(run.tick, limit);
  const replay = exportReplay(recorder, run);
  assert.equal(verifyReplay(replay).match, true);
  if (limit === route.expected.tick) assert.deepEqual(replay.summary, route.expected);
  return { run, recorder, replay };
}

export async function createWorkshopArtFixtures({ root = ROOT, out, replace = false } = {}) {
  root = path.resolve(root);
  const base = path.join(root, '.cache/round-27/browser');
  out = path.resolve(
    out ?? path.join(base, `workshop-art-${new Date().toISOString().replace(/[^0-9]/g, '')}`),
  );
  assert.ok(
    out.startsWith(base + path.sep) && path.dirname(out) === base,
    'Output must be a new direct child of .cache/round-27/browser.',
  );
  for (let cursor = root; cursor !== out; ) {
    const part = path.relative(cursor, out).split(path.sep)[0];
    cursor = path.join(cursor, part);
    const info = await lstat(cursor).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    assert.ok(
      !info || (info.isDirectory() && !info.isSymbolicLink()),
      'Output ancestors must be real directories.',
    );
  }
  const oldInfo = await lstat(out).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  let oldManifest = null;
  if (oldInfo) {
    assert.ok(replace, 'Output exists; use --replace only for this generator’s owned fixture set.');
    const markerInfo = await lstat(path.join(out, 'manifest.json'));
    assert.ok(
      markerInfo.isFile() && !markerInfo.isSymbolicLink(),
      'Owned marker must be a regular file.',
    );
    oldManifest = json(await readFile(path.join(out, 'manifest.json')));
    assert.equal(oldManifest.format, FORMAT, 'Output is not an owned Workshop fixture directory.');
    assert.deepEqual(
      (await readdir(out)).sort(),
      [...oldManifest.files.map((file) => file.name), 'manifest.json'].sort(),
    );
    for (const file of oldManifest.files) {
      assert.equal(path.basename(file.name), file.name);
      const target = path.join(out, file.name),
        info = await lstat(target);
      assert.ok(info.isFile() && !info.isSymbolicLink());
      assert.equal(
        sha(await readFile(target)),
        file.sha256,
        'An existing fixture was edited; choose a new output directory.',
      );
    }
  }
  const source = await loadWorkshopArtInputs(root),
    { previous, current, routes, decodeImage } = source;
  const { campaign } = resolvePackCampaign(current, 'equipment-workshop');
  const { campaign: oldCampaign } = resolvePackCampaign(previous, 'equipment-workshop');
  assert.deepEqual(campaign, oldCampaign);
  const key = campaignKey(campaign),
    output = [],
    attempts = [];
  const push = (name, value, kind) =>
    output.push({ name, text: typeof value === 'string' ? value : JSON.stringify(value), kind });
  let library = updatePreferences(emptyLibrary(), {
    classId: 'interceptor',
    turnPolicy: 'immediate',
    tapSteering: true,
  });
  for (const route of routes) {
    const won = replayWorkshopRoute(previous, route),
      final = route.segments.at(-1);
    assert.ok(
      final.ticks >= 24 &&
        final.input.direction &&
        !final.input.action &&
        !final.input.pickup &&
        !final.input.switchClass,
      'Require an actual single-direction finishing interval.',
    );
    const near = replayWorkshopRoute(previous, route, route.expected.tick - 24);
    assert.equal(near.run.status, 'running');
    assert.ok(near.run.player.cutting && near.run.trail.length > 0);
    const scenario = scenarioFromPack(current, campaign.id, route.levelId, {
      classId: route.classId,
      turnPolicy: route.turnPolicy,
      seed: route.seed,
    });
    const checked = (await prepareScenario(scenario, { decodeImage })).scenario;
    const bodyId = checked.theme.classBodies[route.classId],
      runId = `round27-prefix-${route.levelId}-${route.turnPolicy}`;
    const session = suspendSession({
      run: near.run,
      recorder: near.recorder,
      campaignKey: key,
      themeId: scenario.theme.id,
      bodyId,
      runId,
      savedAt: STAMP,
    });
    const restored = await restoreSession(session, { campaign, campaignKey: key });
    assert.deepEqual(authoritativeCheckpoint(restored.run), session.replay.checkpoint);
    for (let ticks = 0; ticks < 24; ticks++) {
      stepRun(restored.run, final.input, FIXED_DT);
      recordInput(restored.recorder, final.input);
    }
    const finished = exportReplay(restored.recorder, restored.run);
    assert.deepEqual(finished.summary, won.replay.summary);
    assert.deepEqual(finished.checkpoint, won.replay.checkpoint);
    assert.equal(verifyReplay(finished).match, true);
    // Measure a simpler no-Boost button too; report its own honest checkpoint/time.
    const plain = await restoreSession(session, { campaign, campaignKey: key });
    let plainTicks = 0;
    while (plain.run.status === 'running' && plainTicks < 240) {
      stepRun(plain.run, { direction: final.input.direction }, FIXED_DT);
      recordInput(plain.recorder, { direction: final.input.direction });
      plainTicks++;
    }
    assert.equal(
      plain.run.status,
      'won',
      'No-Boost direction must actually finish before it is advertised.',
    );
    const plainReplay = exportReplay(plain.recorder, plain.run);
    assert.equal(verifyReplay(plainReplay).match, true);
    const stem = `${route.levelId}-${route.turnPolicy}`;
    push(`${stem}.scenario.json`, checked, 'actual-illustrated-practice-scenario');
    push(`${stem}.session.json`, session, 'old-legal-session-restored-against-new-art');
    attempts.push({
      levelId: route.levelId,
      turnPolicy: route.turnPolicy,
      seed: route.seed,
      initialClassId: route.classId,
      activeClassId: getSummary(near.run).activeClassId,
      scenarioFile: `${stem}.scenario.json`,
      sessionFile: `${stem}.session.json`,
      sourceLevelSha256: route.levelSha256,
      sourceRosterSha256: route.classesSha256,
      stoppedTick: near.run.tick,
      liveTrailCells: near.run.trail.length,
      stoppedCheckpoint: session.replay.checkpoint,
      finishInput: final.input,
      remainingTicks: 24,
      winningCheckpoint: finished.checkpoint,
      winningSummary: finished.summary,
      noBoostButton: {
        direction: final.input.direction,
        ticks: plainTicks,
        checkpoint: plainReplay.checkpoint,
        summary: plainReplay.summary,
      },
    });
    if (route.turnPolicy === 'immediate')
      library = recordLibraryCompletion(library, {
        campaign: oldCampaign,
        result: won.replay.summary,
        runId: `round27-old-${route.levelId}-${route.turnPolicy}`,
        themeId: scenario.theme.id,
        bodyId,
        sourcePackId: previous.id,
        completedAt: STAMP,
      });
  }
  assert.equal(library.gallery.length, 3);
  assert.equal(library.scores.length, 3);
  assert.equal(library.masteries.length, 0);
  push(
    'workshop-procedural-completed.library.json',
    exportLibrary(library),
    'legal-old-procedural-collection',
  );
  push(
    'workshop-procedural-completed.backup.json',
    await exportBackup(
      { library, packs: installPack(emptyPackLibrary(), previous), session: null },
      { decodeImage },
    ),
    'legal-old-procedural-backup',
  );
  const manifest = {
    format: FORMAT,
    generatedFrom:
      'Automated legal-input QA, not manual play. Existing ordinary proofs only; no state injection or invented seals.',
    timestampPolicy: `Fixed metadata ${STAMP}; not a playtest timestamp.`,
    previousPackSha256: sha(source.previousBytes),
    illustratedPackSha256: sha(source.currentBytes),
    ordinaryProofSha256: sha(source.proofBytes),
    campaignKey: key,
    images: source.images,
    imageValidation:
      'Exact original source bytes and headers; Node adapter is not PNG pixel decoding. Browser import must decode.',
    instructions:
      'Install the illustrated pack through Library. Load a session, explicitly Resume, then hold the indicated direction without Boost until the cut closes. Exact recorded checkpoint instead requires the listed Boost state for 24 ticks. Scenarios are non-awarding practice. Completed library/backup are legally simulated old-edition QA progress with no seals.',
    attempts,
    completed: { galleryPictures: 3, scores: 3, seals: 0, packVersion: previous.version },
    files: output.map(({ name, text, kind }) => ({
      name,
      kind,
      bytes: Buffer.byteLength(text),
      sha256: sha(text),
    })),
  };
  if (oldManifest)
    assert.deepEqual(
      oldManifest.files.map((f) => f.name).sort(),
      manifest.files.map((f) => f.name).sort(),
      'Replacement must keep the exact owned output set.',
    );
  await mkdir(out, { recursive: true });
  for (const { name, text } of output)
    await writeFile(path.join(out, name), text, { flag: replace ? 'w' : 'wx' });
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {
    flag: replace ? 'w' : 'wx',
  });
  return {
    out,
    files: output.length,
    campaignKey: key,
    images: source.images,
    attempts: attempts.map(({ levelId, turnPolicy, remainingTicks, noBoostButton }) => ({
      levelId,
      turnPolicy,
      remainingTicks,
      noBoostTicks: noBoostButton.ticks,
      direction: noBoostButton.direction,
    })),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let out,
    replace = false;
  while (args.length) {
    const flag = args.shift();
    if (flag === '--replace' && !replace) replace = true;
    else if (flag === '--out' && out === undefined && args[0] && !args[0].startsWith('--'))
      out = args.shift();
    else
      throw new Error(
        'Usage: node scripts/create-workshop-art-fixtures.mjs [--out .cache/round-27/browser/NAME] [--replace]',
      );
  }
  console.log(JSON.stringify(await createWorkshopArtFixtures({ out, replace }), null, 2));
}
