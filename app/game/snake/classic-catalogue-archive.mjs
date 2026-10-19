import { CLASSIC_SNAKE_V4_LEVELS } from './classic-catalogue-v4.mjs';
import { CLASSIC_SNAKE_PURSUIT_V1_ARCHIVED_LEVELS } from './classic-catalogue-pursuit-v1-archive.mjs';
import { CLASSIC_SNAKE_OPERATION_LEVELS_A } from './classic-catalogue-operations-a.mjs';
import { CLASSIC_SNAKE_OPERATION_LEVELS_B } from './classic-catalogue-operations-b.mjs';
// Frozen official recipes. IDs alone never admit a recording.
import { CLASSIC_SNAKE_LOCAL_V1_ARCHIVED_LEVELS } from './classic-catalogue-signal-v1-archive.mjs';
import { CLASSIC_SNAKE_FOUNDATION_V1_ARCHIVED_LEVELS } from './classic-catalogue-foundation-v1-archive.mjs';
import { CLASSIC_SNAKE_FIELD_V3_ARCHIVED_LEVELS } from './classic-catalogue-field-v3-archive.mjs';
import { canonicalJSON, required } from '../data-json.mjs';
import { validateClassicSnakeLevel } from './classic-core.mjs';
import { prepareClassicSnakeLevel } from './classic-setup.mjs';
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const CLASSIC_SNAKE_ARCHIVED_LEVELS = freeze([
  {
    id: 'classic-field-signal-check',
    chapterId: 'classic-snake-signal-tactics',
    title: {
      en: 'Signal Check',
      uk: 'Перевірка сигналу',
    },
    description: {
      en: 'The antenna warns before four moves of signal loss. Memorize your route: the whole field disappears, but steering continues. Catch the jammer to restore reception.',
      uk: 'Антена попереджає перед чотирма ходами втрати сигналу. Запам’ятайте маршрут: усе поле зникне, але керування діє. Спіймайте глушник для відновлення прийому.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-signal-check',
      revision: '1',
      name: 'Signal Check',
      width: 24,
      height: 18,
      walls: [
        {
          x: 10,
          y: 5,
        },
        {
          x: 11,
          y: 5,
        },
        {
          x: 12,
          y: 5,
        },
        {
          x: 10,
          y: 6,
        },
        {
          x: 11,
          y: 6,
        },
        {
          x: 12,
          y: 6,
        },
        {
          x: 10,
          y: 7,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 4,
      stepMs: 200,
      speedupEvery: 0,
      minStepMs: 200,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
      objective: 'mission',
      targets: {
        maxActive: 1,
        required: [
          {
            kind: 'jammer',
            every: 3,
            at: {
              x: 20,
              y: 8,
            },
          },
          {
            kind: 'jammer',
            every: 3,
            at: {
              x: 3,
              y: 10,
            },
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-field-quiet-return',
    chapterId: 'classic-snake-signal-tactics',
    title: {
      en: 'Quiet Return',
      uk: 'Тихе повернення',
    },
    description: {
      en: 'Plan your return while reception is clear. During signal loss, steer from memory for four moves; enemies, walls and your cable are hidden.',
      uk: 'Плануйте повернення за чистого прийому. Під час втрати сигналу керуйте з пам’яті чотири ходи: вороги, стіни й кабель приховані.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-quiet-return',
      revision: '1',
      name: 'Quiet Return',
      width: 24,
      height: 18,
      walls: [
        {
          x: 8,
          y: 4,
        },
        {
          x: 9,
          y: 4,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 9,
          y: 5,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 9,
          y: 7,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 9,
          y: 8,
        },
        {
          x: 14,
          y: 10,
        },
        {
          x: 15,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 14,
          y: 11,
        },
        {
          x: 15,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 14,
          y: 12,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 6,
      stepMs: 200,
      speedupEvery: 0,
      minStepMs: 200,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
      objective: 'mission',
      targets: {
        maxActive: 1,
        required: [
          {
            kind: 'jammer',
            every: 3,
            at: {
              x: 20,
              y: 8,
            },
          },
          {
            kind: 'runner',
            every: 3,
          },
          {
            kind: 'jammer',
            every: 3,
            at: {
              x: 3,
              y: 10,
            },
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-field-signal-crossing',
    chapterId: 'classic-snake-signal-tactics',
    title: {
      en: 'Signal Crossing',
      uk: 'Сигнальний перехід',
    },
    description: {
      en: 'Memorize a safe crossing before the four-move blackout. The lane waits for reception to return, then gives a full new warning.',
      uk: 'Запам’ятайте безпечний перехід перед втратою сигналу на чотири ходи. Смуга чекає відновлення прийому й дає повне нове попередження.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-signal-crossing',
      revision: '1',
      name: 'Signal Crossing',
      width: 24,
      height: 18,
      walls: [
        {
          x: 9,
          y: 4,
        },
        {
          x: 10,
          y: 4,
        },
        {
          x: 11,
          y: 4,
        },
        {
          x: 9,
          y: 5,
        },
        {
          x: 10,
          y: 5,
        },
        {
          x: 11,
          y: 5,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 10,
          y: 6,
        },
        {
          x: 11,
          y: 6,
        },
        {
          x: 13,
          y: 11,
        },
        {
          x: 14,
          y: 11,
        },
        {
          x: 15,
          y: 11,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 14,
          y: 12,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 13,
          y: 13,
        },
        {
          x: 14,
          y: 13,
        },
        {
          x: 15,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 6,
      stepMs: 200,
      speedupEvery: 0,
      minStepMs: 200,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
      objective: 'mission',
      targets: {
        maxActive: 2,
        required: [
          {
            kind: 'jammer',
            every: 3,
            at: {
              x: 20,
              y: 8,
            },
          },
          {
            kind: 'lane',
            every: 3,
            at: {
              x: 5,
              y: 8,
            },
            lane: {
              axis: 'x',
              from: 5,
              to: 18,
            },
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-field-relay-airfield',
    chapterId: 'classic-snake-signal-tactics',
    title: {
      en: 'Relay Airfield',
      uk: 'Аеродром ретрансляторів',
    },
    description: {
      en: 'Remember the relay positions before signal loss, then time the crossing and unlock the sentinel. No lane starts an attack during the blackout.',
      uk: 'Запам’ятайте ретранслятори перед втратою сигналу, потім оберіть момент переходу й відкрийте вартового. Під час втрати сигналу смуга не починає атаку.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-relay-airfield',
      revision: '1',
      name: 'Relay Airfield',
      width: 24,
      height: 18,
      walls: [
        {
          x: 8,
          y: 4,
        },
        {
          x: 9,
          y: 4,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 9,
          y: 5,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 14,
          y: 11,
        },
        {
          x: 15,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 14,
          y: 12,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 14,
          y: 13,
        },
        {
          x: 15,
          y: 13,
        },
        {
          x: 16,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 6,
      stepMs: 200,
      speedupEvery: 0,
      minStepMs: 200,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
      objective: 'mission',
      targets: {
        maxActive: 2,
        required: [
          {
            kind: 'jammer',
            every: 3,
            at: {
              x: 20,
              y: 8,
            },
          },
          {
            kind: 'lane',
            every: 3,
            at: {
              x: 5,
              y: 8,
            },
            lane: {
              axis: 'x',
              from: 5,
              to: 18,
            },
          },
          {
            kind: 'relay',
            every: 3,
            at: {
              x: 12,
              y: 8,
            },
            relays: [
              {
                x: 3,
                y: 5,
              },
              {
                x: 20,
                y: 12,
              },
            ],
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-field-field-links',
    chapterId: 'classic-snake-field-mastery',
    title: {
      en: 'Field Links',
      uk: 'Польові зв’язки',
    },
    description: {
      en: 'Remember the marked wall and your next four turns before signal loss. New shots wait for the feed to return and a full warning.',
      uk: 'Запам’ятайте позначену стіну й наступні чотири повороти перед втратою сигналу. Нові постріли чекають відновлення прийому та повного попередження.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-field-links',
      revision: '1',
      name: 'Field Links',
      width: 24,
      height: 18,
      walls: [
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 6,
          y: 6,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 12,
          y: 6,
        },
        {
          x: 13,
          y: 6,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 13,
          y: 7,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 13,
          y: 8,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 13,
          y: 9,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 13,
          y: 10,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 6,
      stepMs: 200,
      speedupEvery: 0,
      minStepMs: 200,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
      objective: 'mission',
      targets: {
        maxActive: 2,
        required: [
          {
            kind: 'eroder',
            every: 3,
            at: {
              x: 11,
              y: 8,
            },
            breaks: [
              {
                x: 12,
                y: 8,
              },
            ],
          },
          {
            kind: 'jammer',
            every: 3,
            at: {
              x: 20,
              y: 8,
            },
          },
          {
            kind: 'guard',
            every: 3,
            at: {
              x: 6,
              y: 8,
            },
            heading: 'right',
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  ...CLASSIC_SNAKE_PURSUIT_V1_ARCHIVED_LEVELS,
  ...CLASSIC_SNAKE_LOCAL_V1_ARCHIVED_LEVELS,
  ...CLASSIC_SNAKE_FOUNDATION_V1_ARCHIVED_LEVELS,
  ...CLASSIC_SNAKE_FIELD_V3_ARCHIVED_LEVELS,
  ...CLASSIC_SNAKE_V4_LEVELS.filter((entry) =>
    [
      'classic-field-border-watch',
      'classic-field-contour-orbit',
      'classic-field-wake-watch',
      'classic-field-ricochet-line',
    ].includes(entry.id),
  ),
  ...[...CLASSIC_SNAKE_OPERATION_LEVELS_A, ...CLASSIC_SNAKE_OPERATION_LEVELS_B].filter((entry) =>
    ['classic-operation-pressure-elbow', 'classic-operation-loaded-excavation'].includes(entry.id),
  ),
]);

/** Archive authority belongs only to the built-in catalogue, never an installed pack. */
export function classicSnakeRecipeEntries(entry, { allowArchive = false } = {}) {
  return [
    entry,
    ...(allowArchive
      ? CLASSIC_SNAKE_ARCHIVED_LEVELS.filter((candidate) => candidate.id === entry.id)
      : []),
  ];
}

export function resolveClassicSnakeRecipeEntry(entry, recipe, setup, options) {
  const expected = canonicalJSON(validateClassicSnakeLevel(recipe));
  const accepted = classicSnakeRecipeEntries(entry, options).find(
    (candidate) =>
      canonicalJSON(validateClassicSnakeLevel(prepareClassicSnakeLevel(candidate, setup))) ===
      expected,
  );
  required(accepted, 'Snake recording recipe differs from its catalogue definition.');
  return accepted;
}
