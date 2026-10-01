import { CLASSES } from './core/registry.mjs';
import { validateScenario } from './content.mjs';
import {
  validateEnemyCatalogDraft,
  enemyCatalogRecord,
  resolveEnemySkin,
} from './enemy-catalog.mjs';

/** A new practice edition, not a replacement for any campaign/pack level. */
export function createEnemyCatalogScenario(type, input, themes) {
  const draft = validateEnemyCatalogDraft(input),
    entry = draft.entries.find((item) => item.type === type),
    record = enemyCatalogRecord(type);
  if (!entry?.enabled || !record)
    throw new Error('Enable this role before creating its practice scenario.');
  const theme = themes.find((item) => item.id === resolveEnemySkin(type, entry.skinId));
  if (!theme) throw new Error('The selected registered theme is unavailable.');
  const enemy = {
    bouncer: { x: 42.5, y: 18.5, vx: 4, vy: 3 },
    'border-patrol': { x: 18.5, y: 0.5, speed: 4, clockwise: true },
    'contour-patrol': { edge: { x: 20, y: 1, side: 'north' }, speed: 4, clockwise: true },
    'claimed-rover': { x: 12.5, y: 7.5, vx: 3, vy: 2 },
    eroder: { x: 10.5, y: 8.5, vx: -3, vy: -2 },
    'lane-boss': {
      x: 42.5,
      y: 18.5,
      axis: 'vertical',
      warningSeconds: 1.2,
      activeSeconds: 1,
      period: 5,
      laneWidth: 1.2,
    },
    'relay-sentinel': { x: 56.5, y: 18.5 },
  }[type];
  const level = {
    version: 'xonix-level.v4',
    id: `catalog-${type}`,
    revision: '1',
    name: `Enemy workshop: ${record.label}`,
    width: 72,
    height: 36,
    spawn: { x: 6.5, y: 0.5 },
    goal: { coverage: 0.55 },
    enemies: [{ id: 'studied-enemy', type, ...enemy }],
    objectives: [],
    encounter: null,
    classic: {
      version: 'classic.v1',
      terrain: [],
      powerups: ['extra-life', 'player-speed', 'enemy-slow', 'enemy-freeze'].map((kind, i) => ({
        id: `pickup-${i}`,
        kind,
        x: 8.5 + i * 2,
        y: 0.5,
      })),
    },
  };
  if (['border-patrol', 'contour-patrol', 'claimed-rover'].includes(type))
    level.enemies.push({ id: 'field-seed', type: 'bouncer', x: 55.5, y: 25.5, vx: 2, vy: 2 });
  if (type === 'relay-sentinel') {
    level.objectives = [
      { id: 'relay', x: 12.5, y: 8.5, required: true },
      { id: 'core', x: 56.5, y: 18.5, required: true },
    ];
    level.encounter = {
      version: 'xonix-encounter.v1',
      kind: 'relay-sentinel',
      enemyId: 'studied-enemy',
      shieldObjectiveId: 'relay',
      coreObjectiveId: 'core',
      minReleaseCutCells: 8,
      initialDelayTicks: 240,
      transitionTicks: 60,
      shielded: { warningTicks: 120, activeTicks: 120, restTicks: 360 },
      exposed: { warningTicks: 120, activeTicks: 120, openTicks: 480 },
      laneWidth: 1.2,
    };
  }
  const scenario = {
    format: 'xonix-playground.v5',
    level,
    theme: structuredClone(theme),
    classRecipes: structuredClone(CLASSES),
    masteryDefinition: null,
    settings: { classId: 'scout', seed: 1, turnPolicy: 'immediate' },
    presentation: { style: draft.style, showGrid: false },
    visualOverrides: {},
  };
  const result = validateScenario(scenario);
  if (!result.valid) throw new Error(result.errors.join('\n'));
  return scenario;
}
