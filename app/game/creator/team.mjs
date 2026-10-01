import { boundedJSON, canonicalJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import { createCoop, getCoopSummary, startCoop, stepCoop } from '../coop/core.mjs';
import {
  buildCoopPack,
  COOP_PACK_MAX_BYTES,
  COOP_RECIPE_VERSION,
  COOP_PACK_RECIPE_VERSION,
  validateCoopPack,
} from '../coop/recipes.mjs';
import { readCoopPack } from '../coop/library.mjs';

export const CREATOR_TEAM_TEMPLATE_VERSION = 'creator-team-layouts.v1';
export const CREATOR_TEAM_PROVENANCE_FORMAT = 'revealline-creator-team-provenance.v1';
export const CREATOR_TEAM_EVIDENCE_FORMAT = 'revealline-creator-team-evidence.v1';
export const CREATOR_TEAM_PORTABLE_FORMAT = 'revealline-creator-team-portable.v1';
export const CREATOR_TEAM_PORTABLE_MIME = 'application/vnd.revealline.team+json';
export const CREATOR_TEAM_INPUT_POLICY = 'direction-boost-support-v1';

export const CREATOR_TEAM_TEMPLATES = freezeDesign([
  {
    id: 'coverage',
    name: 'Mirrored crossing',
    objective: 'Both pilots close meaningful cuts until shared coverage is reached.',
    spawns: 'Opposite outside borders at the same height.',
  },
  {
    id: 'stronghold',
    name: 'Relay pincer',
    objective: 'Each pilot banks an anchor before both close the exposed relay core.',
    spawns: 'Opposite outside borders with mirrored pillar approaches.',
  },
]);

/** Only presets with exact route evidence are advertised for generated Team
 * packs. The legacy host's Individual cuts experiment remains available for
 * historical packs, but this registry makes no completion claim for it. */
export const CREATOR_TEAM_PRESETS = freezeDesign([
  {
    id: 'full',
    label: 'Full teamwork',
    options: { jointCuts: true, assistCaptures: true, advancedCooperation: true },
  },
  {
    id: 'joint',
    label: 'Joint cuts and ordinary cover',
    options: { jointCuts: true, assistCaptures: true, advancedCooperation: false },
  },
]);

const difficulties = ['gentle', 'standard', 'expert'];
const preparedCampaigns = new WeakSet();
const command = (direction = null, support = false) => ({
  direction,
  boost: true,
  support,
});
const templateIds = new Set(CREATOR_TEAM_TEMPLATES.map(({ id }) => id));
const stableId = (value) => typeof value === 'string' && /^[a-z][a-z0-9-]{0,55}$/.test(value);
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Team qualification cancelled.', 'AbortError');
};

function teamLevelRecipe(template, id, name) {
  return {
    version: COOP_RECIPE_VERSION,
    template,
    id,
    revision: 1,
    name,
  };
}

/** Team generation owns a separate cooperative registry. The seed chooses the
 * campaign order among bounded authored layouts; it never converts or mutates
 * a Solo/Versus map. */
export function generateCreatorTeamCampaign({ id, name, seed = 0 } = {}) {
  required(stableId(id), 'Team campaign ID must be a short lowercase identifier.');
  required(
    typeof name === 'string' && name.trim().length > 0 && name.length <= 80,
    'Team campaign name is required.',
  );
  required(Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffffffff, 'Invalid Team seed.');
  const templates = [...CREATOR_TEAM_TEMPLATES];
  if (seed % 2) templates.reverse();
  const levels = templates.map((template) =>
    teamLevelRecipe(template.id, `${id}-${template.id}`, `${name} · ${template.name}`),
  );
  const pack = buildCoopPack({
    version: COOP_PACK_RECIPE_VERSION,
    id,
    revision: 1,
    name,
    levels,
  });
  const provenance = {
    format: CREATOR_TEAM_PROVENANCE_FORMAT,
    templateVersion: CREATOR_TEAM_TEMPLATE_VERSION,
    generationSeed: seed,
    packId: id,
    packName: name,
    levels: templates.map((template, index) => ({
      levelId: pack.levels[index].id,
      templateId: template.id,
      variantId: 'mirrored-v1',
    })),
  };
  return freezeDesign({ pack, provenance });
}

export function validateCreatorTeamCampaign(packSource, provenanceSource) {
  const pack = boundedJSON(packSource, {
    maxBytes: COOP_PACK_MAX_BYTES,
    maxNodes: 50000,
    maxDepth: 20,
    maxArray: 1024,
  });
  const validation = validateCoopPack(pack);
  required(validation.valid, validation.errors.join(' '));
  const provenance = boundedJSON(provenanceSource, {
    maxBytes: 64 * 1024,
    maxNodes: 1000,
    maxDepth: 8,
    maxArray: 32,
  });
  exactKeys(
    provenance,
    ['format', 'templateVersion', 'generationSeed', 'packId', 'packName', 'levels'],
    'Team generation provenance',
  );
  required(
    provenance.format === CREATOR_TEAM_PROVENANCE_FORMAT &&
      provenance.templateVersion === CREATOR_TEAM_TEMPLATE_VERSION &&
      Number.isSafeInteger(provenance.generationSeed) &&
      provenance.generationSeed >= 0 &&
      provenance.generationSeed <= 0xffffffff &&
      provenance.packId === pack.id &&
      provenance.packName === pack.name &&
      Array.isArray(provenance.levels) &&
      provenance.levels.length === pack.levels.length,
    'Team provenance does not match this generated pack.',
  );
  for (const [index, row] of provenance.levels.entries()) {
    exactKeys(row, ['levelId', 'templateId', 'variantId'], 'Team template selection');
    required(
      row.levelId === pack.levels[index].id &&
        templateIds.has(row.templateId) &&
        row.variantId === 'mirrored-v1',
      'Team template selection does not match authored campaign order.',
    );
    const expected = buildCoopPack({
      version: COOP_PACK_RECIPE_VERSION,
      id: pack.id,
      revision: pack.revision,
      name: pack.name,
      levels: [teamLevelRecipe(row.templateId, pack.levels[index].id, pack.levels[index].name)],
    }).levels[0];
    required(
      canonicalJSON(expected) === canonicalJSON(pack.levels[index]),
      'Team layout differs from its qualified bounded template.',
    );
  }
  return freezeDesign({ pack, provenance });
}

function createTrial(level, difficulty, preset, { coverDrifters = true } = {}) {
  const run = startCoop(createCoop(level, { seed: 17, difficulty, ...preset.options })),
    log = [],
    events = [],
    release = new Set();
  function tick(directions) {
    const inputs = directions.map((direction, seat) => {
      if (release.delete(seat)) return command();
      const player = run.players[seat];
      const support =
        player.support.readyAt <= run.time &&
        (run.enemies.some(
          (enemy) =>
            enemy.active !== false &&
            ((coverDrifters && enemy.type === 'drifter') ||
              ['warning', 'commit'].includes(enemy.phase)) &&
            Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 5.9,
        ) ||
          run.impacts.some(
            (impact) => Math.hypot(impact.x - player.x, impact.y - player.y) <= 5.9,
          ));
      return command(direction, support);
    });
    stepCoop(run, inputs);
    log.push(inputs);
    events.push(...structuredClone(run.events));
    for (const event of run.events)
      if (['cut.closed', 'player.downed', 'player.revived'].includes(event.type))
        release.add(event.player);
  }
  function stage(directions, finished, limit = 1800) {
    let ticks = 0;
    while (!finished() && run.status === 'running' && ticks++ < limit)
      tick(typeof directions === 'function' ? directions(run) : directions);
    return finished() && !events.some((event) => event.type === 'player.downed');
  }
  const toward = (axis, targets) =>
    run.players.map((player, seat) =>
      Math.abs(player[axis] - targets[seat]) <= 0.051
        ? null
        : player[axis] < targets[seat]
          ? axis === 'x'
            ? 'right'
            : 'down'
          : axis === 'x'
            ? 'left'
            : 'up',
    );
  const at = (axis, targets) =>
    run.players.every((player, seat) => Math.abs(player[axis] - targets[seat]) <= 0.051);
  return { run, log, events, stage, toward, at };
}

function playCoverage(level, difficulty, preset) {
  // Let the lower patrols leave the intended capture before the first join.
  // Slowing them here changes which side retains field and invalidates the route.
  const trial = createTrial(level, difficulty, preset, { coverDrifters: false });
  const { run, stage, toward, at } = trial;
  if (
    !stage(
      () => toward('y', [12.5, 12.5]),
      () => at('y', [12.5, 12.5]),
    )
  )
    return trial;
  if (!stage(['right', 'left'], () => run.claimedCount > 0)) return trial;
  if (
    !stage(
      () => toward('x', [26.5, 45.5]),
      () => at('x', [26.5, 45.5]),
    )
  )
    return trial;
  if (!stage(['down', 'down'], () => run.players.every((player) => player.y >= 34.99)))
    return trial;
  if (
    !stage(
      () => toward('y', [22.5, 22.5]),
      () => at('y', [22.5, 22.5]),
    )
  )
    return trial;
  const upper = run.claimedCount;
  if (!stage(['right', 'left'], () => run.claimedCount > upper)) return trial;
  if (
    !stage(
      () => toward('x', [26.5, 45.5]),
      () => at('x', [26.5, 45.5]),
    )
  )
    return trial;
  if (
    !stage(
      () => toward('y', [26.5, 26.5]),
      () => at('y', [26.5, 26.5]),
    )
  )
    return trial;
  const lower = run.claimedCount;
  stage(['right', 'left'], () => run.status === 'won' || run.claimedCount > lower);
  return trial;
}

function playStronghold(level, difficulty, preset) {
  const trial = createTrial(level, difficulty, preset);
  const { run, stage, toward, at } = trial;
  if (
    !stage(
      () => toward('y', [12.5, 12.5]),
      () => at('y', [12.5, 12.5]),
    )
  )
    return trial;
  if (!stage(['right', 'left'], () => run.claimedCount > 0)) return trial;
  if (
    !stage(
      () => toward('x', [23.5, 48.5]),
      () => at('x', [23.5, 48.5]),
    )
  )
    return trial;
  if (!stage(['up', 'up'], () => run.strongholds[0].anchors.every((anchor) => anchor.captured)))
    return trial;
  if (
    !stage(
      () => toward('y', [6.5, 6.5]),
      () => at('y', [6.5, 6.5]),
    )
  )
    return trial;
  stage(['right', 'left'], () => run.status === 'won');
  return trial;
}

function qualificationResult(level, templateId, difficulty, preset) {
  const played =
    templateId === 'coverage'
      ? playCoverage(level, difficulty, preset)
      : playStronghold(level, difficulty, preset);
  const closes = [0, 1].map(
    (seat) =>
      played.events.filter((event) => event.type === 'cut.closed' && event.player === seat).length,
  );
  required(
    played.run.status === 'won' &&
      played.events.every((event) => event.type !== 'player.downed') &&
      closes.every((count) => count > 0) &&
      played.events.some(
        (event) =>
          event.type === 'cut.joint' &&
          event.players.length === 2 &&
          event.players[0] === 0 &&
          event.players[1] === 1,
      ),
    `Generated Team route failed for ${level.id}/${difficulty}/${preset.id}.`,
  );
  if (templateId === 'coverage')
    required(played.run.coverage >= level.goal.coverage, 'Team coverage goal was not reached.');
  else
    required(
      played.run.strongholds.every((stronghold) => stronghold.defeated) &&
        played.events.some((event) => event.type === 'shield.disabled') &&
        played.events.some((event) => event.type === 'core.defeated'),
      'Team stronghold sequence was not completed.',
    );
  return freezeDesign({
    format: CREATOR_TEAM_EVIDENCE_FORMAT,
    kind: 'automated',
    check: 'two-contributor-feasibility',
    levelId: level.id,
    templateId,
    templateVersion: CREATOR_TEAM_TEMPLATE_VERSION,
    difficulty,
    presetId: preset.id,
    inputPolicy: CREATOR_TEAM_INPUT_POLICY,
    seed: 17,
    tick: played.run.tick,
    coverage: played.run.coverage,
    contributions: closes,
    jointCuts: played.events.filter((event) => event.type === 'cut.joint').length,
    inputIdentity: dataIdentity(played.log),
    terminalIdentity: dataIdentity({
      summary: getCoopSummary(played.run),
      cells: [...played.run.cells],
    }),
  });
}

/** Verify every level against every difficulty and every advertised generated
 * Team preset. Each result requires legal cuts from both seats. */
export async function verifyCreatorTeamCampaign(packSource, provenanceSource, { signal } = {}) {
  abort(signal);
  const { pack, provenance } = validateCreatorTeamCampaign(packSource, provenanceSource);
  const results = [];
  for (const [index, level] of pack.levels.entries())
    for (const difficulty of difficulties)
      for (const preset of CREATOR_TEAM_PRESETS) {
        results.push(
          qualificationResult(level, provenance.levels[index].templateId, difficulty, preset),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
        abort(signal);
      }
  return freezeDesign(results);
}

export function createCreatorTeamAttempt(packSource, levelId, difficulty, presetId) {
  const validation = validateCoopPack(packSource);
  required(validation.valid, validation.errors.join(' '));
  const level = packSource.levels.find((candidate) => candidate.id === levelId);
  const preset = CREATOR_TEAM_PRESETS.find((candidate) => candidate.id === presetId);
  required(
    level && difficulties.includes(difficulty) && preset,
    'Choose a qualified Team attempt.',
  );
  return startCoop(createCoop(level, { seed: 17, difficulty, ...preset.options }));
}

export function creatorTeamSuccessor(packSource, levelId) {
  const validation = validateCoopPack(packSource);
  required(validation.valid, validation.errors.join(' '));
  const index = packSource.levels.findIndex((level) => level.id === levelId);
  required(index >= 0, 'Choose a level from this Team campaign.');
  return packSource.levels[index + 1] ?? null;
}

export async function prepareCreatorTeamCampaign(pack, provenance, options = {}) {
  const validated = validateCreatorTeamCampaign(pack, provenance);
  const evidence = await verifyCreatorTeamCampaign(validated.pack, validated.provenance, options);
  const prepared = freezeDesign({ ...validated, evidence });
  preparedCampaigns.add(prepared);
  return prepared;
}

export function exportCreatorTeamCampaign(prepared) {
  required(preparedCampaigns.has(prepared), 'Prepare this exact Team campaign before export.');
  const text = canonicalJSON({
    format: CREATOR_TEAM_PORTABLE_FORMAT,
    pack: prepared.pack,
    provenance: prepared.provenance,
    evidence: prepared.evidence,
  });
  required(
    new TextEncoder().encode(text).length <= COOP_PACK_MAX_BYTES,
    'Team export is too large.',
  );
  return new Blob([text], { type: CREATOR_TEAM_PORTABLE_MIME });
}

export async function importCreatorTeamCampaign(source, options = {}) {
  const blob = source instanceof Blob ? source : new Blob([source]);
  required(
    blob.size > 0 && blob.size <= COOP_PACK_MAX_BYTES,
    'Choose a Team campaign under 1 MiB.',
  );
  const document = boundedJSON(await blob.text(), {
    maxBytes: COOP_PACK_MAX_BYTES,
    maxNodes: 50000,
    maxDepth: 20,
    maxArray: 1024,
  });
  exactKeys(document, ['format', 'pack', 'provenance', 'evidence'], 'portable Team campaign');
  required(document.format === CREATOR_TEAM_PORTABLE_FORMAT, 'Unsupported Team campaign format.');
  // Reuse the public pack reader so transfer cannot bypass its strict parser.
  const pack = readCoopPack(canonicalJSON(document.pack));
  const prepared = await prepareCreatorTeamCampaign(pack, document.provenance, options);
  required(
    canonicalJSON(prepared.evidence) === canonicalJSON(document.evidence),
    'Team campaign evidence differs from current verification.',
  );
  return prepared;
}
