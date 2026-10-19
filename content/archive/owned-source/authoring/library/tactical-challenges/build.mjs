import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { CLASSIC_VERSIONS } from '../../../game/core/versions.mjs';
import { prepareScenario } from '../../../game/imports.mjs';

const root = new URL('../../../', import.meta.url);
export const SOURCE_PINS = Object.freeze({
  'game/content/themes.json': '93582f7d9ba53753106df7b63928f086820fc0f68357d3c08f26c0b89fb84774',
  'game/content/classes.json': '2f776b0dfd099478ffe78465c7b602cd98896206a222a0ed7fd4405a4a643f84',
});
export const CHALLENGE_IDS = Object.freeze([
  'challenge-forked-approach',
  'challenge-crosswind-depot',
  'challenge-signal-switchback',
]);
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const wall = (x, y, w, h) => ({ x, y, w, h });
const field = (id, x, y, vx, vy) => ({ id, type: 'bouncer', x, y, vx, vy, radius: 0.25 });

export async function buildTacticalChallenges() {
  const inputs = {};
  for (const [path, hash] of Object.entries(SOURCE_PINS)) {
    const bytes = await readFile(new URL(path, root));
    assert.equal(sha256(bytes), hash, `Reviewed source changed: ${path}`);
    inputs[path] = JSON.parse(bytes);
  }
  const theme = inputs['game/content/themes.json'].themes.find((item) => item.id === 'fpv');
  assert.ok(theme);
  const recipes = inputs['game/content/classes.json'];
  const specs = [
    {
      name: 'Forked Approach',
      classId: 'scout',
      coverage: 0.3,
      spawn: { x: 36.5, y: 0.5 },
      description:
        'Recommended: Scout, direction-only Arcade. Reveal 30%. The center barrier blocks a straight crossing: read the interceptor warning, choose either side exit, then reconnect at the bottom border. Its target is locked; the line-hit fronts still threaten an unfinished cut. No manual Scan, Supply or Boost. Walls are not safe reconnect ground. Procedural placeholder artwork; original challenge study, not a finished chapter.',
      walls: [wall(24, 14, 24, 2), wall(7, 22, 2, 7), wall(61, 6, 2, 7)],
      enemies: [field('fork-interceptor', 47.5, 8.5, -3, 1)],
      classic: {
        arcadeActions: { version: 'arcade-actions.v1' },
        lineImpact: { version: 'line-impact.v1', speed: 4 },
        enemyPressure: {
          version: 'enemy-pressure.v1',
          actors: [
            {
              id: 'fork-interceptor',
              mode: 'head-intercept',
              senseRadius: 24,
              scanTicks: 24,
              warningTicks: 60,
              commitTicks: 240,
              cooldownTicks: 300,
              leadTicks: 36,
            },
          ],
        },
      },
      objectives: [],
      supplies: [],
      signalZones: [],
      rules: {
        cutTimeLimitSeconds: 9,
        maxTrailCells: 90,
        timeLimitSeconds: 30,
        timeMedals: [9, 18],
      },
    },
    {
      name: 'Crosswind Depot',
      classId: 'bomber',
      coverage: 0.45,
      spawn: { x: 36.5, y: 0.5 },
      description:
        'Recommended: Light carrier. Reveal 45% and capture the western relay. Collect a charge at home; fly Down about five cells, then place a stun field before the patrol reaches your cable. Empty or unused equipment cannot stop that crossing. A slower equipment-free route uses the western gate and more than one cut. Permanent staggered walls divide the corridors. Procedural placeholder artwork; an original Tactical study, not a delivery mechanic.',
      walls: [wall(20, 4, 2, 10), wall(20, 22, 2, 10), wall(52, 12, 2, 16)],
      enemies: [field('depot-crosser', 40.5, 5.5, -2, 0)],
      classic: {},
      objectives: [{ id: 'depot-relay', x: 18.5, y: 26.5, required: true, hidden: false }],
      supplies: [{ id: 'depot-supply', x: 36.5, y: 0.5, radius: 2 }],
      signalZones: [],
      rules: {
        cutTimeLimitSeconds: 8,
        maxTrailCells: 80,
        timeLimitSeconds: 45,
        timeMedals: [9, 22],
      },
    },
    {
      name: 'Signal Switchback',
      classId: 'fiber',
      coverage: 0.48,
      spawn: { x: 0.5, y: 18.5 },
      description:
        'Recommended: Fiber relay. Reveal 48% and capture the northern relay. Cross Right through the interference band and Scan there; Fiber keeps its speed and equipment, but its live cable still has an eight-second and 76-cell limit. A long downward dogleg breaks that cable. An ordinary craft can instead travel around the safe northern rim and cut outside the band. Walls shape the upper pockets and lower approach. Procedural placeholder artwork; an original Tactical route study.',
      walls: [wall(10, 8, 2, 8), wall(24, 24, 18, 2), wall(51, 5, 2, 9)],
      enemies: [field('switchback-patrol', 55.5, 29.5, 1, 0.5)],
      classic: {},
      objectives: [{ id: 'switchback-relay', x: 18.5, y: 8.5, required: true, hidden: true }],
      supplies: [],
      signalZones: [
        {
          id: 'switchback-band',
          x: 18,
          y: 1,
          w: 18,
          h: 34,
          speedFactor: 0.25,
          disableBoost: true,
          lockAbility: true,
        },
      ],
      rules: {
        cutTimeLimitSeconds: 8,
        maxTrailCells: 76,
        timeLimitSeconds: 45,
        timeMedals: [11, 25],
      },
    },
  ];
  const scenarios = [];
  for (const [i, spec] of specs.entries()) {
    const level = {
      version: CLASSIC_VERSIONS.levelVersion,
      id: CHALLENGE_IDS[i],
      revision: '1',
      name: spec.name,
      width: 72,
      height: 36,
      encounter: null,
      classic: { version: 'classic.v1', terrain: [], powerups: [], ...spec.classic },
      spawn: spec.spawn,
      walls: spec.walls,
      enemies: spec.enemies,
      objectives: spec.objectives,
      supplies: spec.supplies,
      signalZones: spec.signalZones,
      hangars: [],
      goal: { coverage: spec.coverage },
      rules: {
        lives: 1,
        moveSpeed: 10,
        boostMultiplier: 1.5,
        graceSeconds: 0,
        respawnSeconds: 0.1,
        stopOnCapture: true,
        ...spec.rules,
      },
      metadata: { description: spec.description },
    };
    const candidate = {
      format: 'xonix-playground.v5',
      level,
      theme: structuredClone(theme),
      classRecipes: structuredClone(recipes),
      settings: { classId: spec.classId, turnPolicy: 'immediate', seed: 1 },
      visualOverrides: {},
      masteryDefinition: null,
    };
    await prepareScenario(candidate);
    scenarios.push(candidate);
  }
  return scenarios;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.slice(2).join(' ') !== '--write')
    throw new Error('Use --write for new scenario output only.');
  const scenarios = await buildTacticalChallenges();
  const directory = new URL('scenarios/', import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const scenario of scenarios)
    await writeFile(
      new URL(`${scenario.level.id}.json`, directory),
      `${JSON.stringify(scenario, null, 2)}\n`,
      { flag: 'wx' },
    );
  process.stdout.write(`Prepared ${scenarios.length} original challenge studies.\n`);
}
