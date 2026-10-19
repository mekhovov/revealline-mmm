// Frozen official local-burst-v1 recipes. Exact data, not ID aliases, owns old recordings.
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const CLASSIC_SNAKE_LOCAL_V1_ARCHIVED_LEVELS = freeze([
  {
    id: 'classic-field-signal-check',
    chapterId: 'classic-snake-signal-tactics',
    title: {
      en: 'Signal Check',
      uk: 'Перевірка сигналу',
    },
    description: {
      en: 'The antenna warns before a short burst distorts its six-cell zone. Skirt the zone or catch the visible jammer to clear it. Each retry has a fresh signal rhythm.',
      uk: 'Антена попереджає перед коротким спотворенням у зоні шести клітин. Обходьте зону або ловіть видимий глушник. Кожна нова спроба має інший ритм перешкод.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-signal-check',
      revision: '2',
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
            signalProfile: 'local-burst-v1',
          },
          {
            kind: 'jammer',
            every: 3,
            at: {
              x: 3,
              y: 10,
            },
            signalProfile: 'local-burst-v1',
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
      en: 'Use the clear ground outside the jammer zone, then approach during recovery. The antenna stays visible through interference.',
      uk: 'Користуйтеся чистою ділянкою поза зоною глушника й наближайтеся під час відновлення. Антена залишається видимою крізь перешкоди.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-quiet-return',
      revision: '2',
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
            signalProfile: 'local-burst-v1',
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
            signalProfile: 'local-burst-v1',
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
      en: 'Route around the local interference. The lane waits for the burst to end, then gives a full new warning before attacking.',
      uk: 'Обходьте локальні перешкоди. Смуга чекає завершення сплеску й дає повне нове попередження перед атакою.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-signal-crossing',
      revision: '2',
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
            signalProfile: 'local-burst-v1',
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
    id: 'classic-field-field-links',
    chapterId: 'classic-snake-field-mastery',
    title: {
      en: 'Field Links',
      uk: 'Польові зв’язки',
    },
    description: {
      en: 'Keep the marked wall in view and skirt the interference zone. New shots wait until reception recovers and a full warning is shown.',
      uk: 'Тримайте позначену стіну в полі зору й обходьте зону перешкод. Нові постріли чекають відновлення прийому й повного попередження.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-field-links',
      revision: '2',
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
            signalProfile: 'local-burst-v1',
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
]);
