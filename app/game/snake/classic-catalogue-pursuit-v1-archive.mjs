// Exact pre-audit recipes. Retained for recordings and imported verified records.
export const CLASSIC_SNAKE_PURSUIT_V1_ARCHIVED_LEVELS = [
  {
    id: 'classic-pursuit-oval-intercept',
    chapterId: 'classic-snake-patrol-routes',
    title: {
      en: 'Oval Intercept',
      uk: 'Перехоплення на овалі',
    },
    description: {
      en: 'Cut across the open side of the island instead of following the patrol.',
      uk: 'Перетинайте відкритий бік острова, замість повторювати маршрут патруля.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-oval-intercept',
      revision: '1',
      name: 'Oval Intercept',
      width: 24,
      height: 18,
      walls: [
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
          x: 12,
          y: 6,
        },
        {
          x: 13,
          y: 6,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 9,
          y: 7,
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
        {
          x: 13,
          y: 7,
        },
        {
          x: 14,
          y: 7,
        },
        {
          x: 9,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
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
          x: 14,
          y: 8,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
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
          x: 14,
          y: 9,
        },
        {
          x: 9,
          y: 10,
        },
        {
          x: 10,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 13,
          y: 10,
        },
        {
          x: 14,
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
      goal: 8,
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
            kind: 'patroller',
            every: 4,
            path: [
              {
                x: 8,
                y: 5,
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
                x: 12,
                y: 5,
              },
              {
                x: 13,
                y: 5,
              },
              {
                x: 14,
                y: 5,
              },
              {
                x: 15,
                y: 5,
              },
              {
                x: 15,
                y: 6,
              },
              {
                x: 15,
                y: 7,
              },
              {
                x: 15,
                y: 8,
              },
              {
                x: 15,
                y: 9,
              },
              {
                x: 15,
                y: 10,
              },
              {
                x: 15,
                y: 11,
              },
              {
                x: 14,
                y: 11,
              },
              {
                x: 13,
                y: 11,
              },
              {
                x: 12,
                y: 11,
              },
              {
                x: 11,
                y: 11,
              },
              {
                x: 10,
                y: 11,
              },
              {
                x: 9,
                y: 11,
              },
              {
                x: 8,
                y: 11,
              },
              {
                x: 8,
                y: 10,
              },
              {
                x: 8,
                y: 9,
              },
              {
                x: 8,
                y: 8,
              },
              {
                x: 8,
                y: 7,
              },
              {
                x: 8,
                y: 6,
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
    id: 'classic-pursuit-split-yard',
    chapterId: 'classic-snake-patrol-routes',
    title: {
      en: 'Split Yard',
      uk: 'Розділений двір',
    },
    description: {
      en: 'The divider has two ends. Choose the nearer return before the patrol rounds it.',
      uk: 'Перегородка має два кінці. Оберіть ближчий обхід, перш ніж ціль її обігне.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-split-yard',
      revision: '1',
      name: 'Split Yard',
      width: 24,
      height: 18,
      walls: [
        {
          x: 11,
          y: 4,
        },
        {
          x: 12,
          y: 4,
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
          x: 11,
          y: 6,
        },
        {
          x: 12,
          y: 6,
        },
        {
          x: 4,
          y: 7,
        },
        {
          x: 5,
          y: 7,
        },
        {
          x: 6,
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
        {
          x: 4,
          y: 8,
        },
        {
          x: 5,
          y: 8,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
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
      goal: 8,
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
            kind: 'patroller',
            every: 4,
            path: [
              {
                x: 10,
                y: 3,
              },
              {
                x: 11,
                y: 3,
              },
              {
                x: 12,
                y: 3,
              },
              {
                x: 13,
                y: 3,
              },
              {
                x: 13,
                y: 4,
              },
              {
                x: 13,
                y: 5,
              },
              {
                x: 13,
                y: 6,
              },
              {
                x: 13,
                y: 7,
              },
              {
                x: 13,
                y: 8,
              },
              {
                x: 13,
                y: 9,
              },
              {
                x: 13,
                y: 10,
              },
              {
                x: 13,
                y: 11,
              },
              {
                x: 13,
                y: 12,
              },
              {
                x: 13,
                y: 13,
              },
              {
                x: 13,
                y: 14,
              },
              {
                x: 12,
                y: 14,
              },
              {
                x: 11,
                y: 14,
              },
              {
                x: 10,
                y: 14,
              },
              {
                x: 10,
                y: 13,
              },
              {
                x: 10,
                y: 12,
              },
              {
                x: 10,
                y: 11,
              },
              {
                x: 10,
                y: 10,
              },
              {
                x: 10,
                y: 9,
              },
              {
                x: 10,
                y: 8,
              },
              {
                x: 10,
                y: 7,
              },
              {
                x: 10,
                y: 6,
              },
              {
                x: 10,
                y: 5,
              },
              {
                x: 10,
                y: 4,
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
    id: 'classic-pursuit-island-clock',
    chapterId: 'classic-snake-patrol-routes',
    title: {
      en: 'Island Clock',
      uk: 'Острівний годинник',
    },
    description: {
      en: 'Four approaches meet the island circuit. Cross between the corner blocks.',
      uk: 'Чотири підходи ведуть до кола навколо острова. Проходьте між кутовими блоками.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-island-clock',
      revision: '1',
      name: 'Island Clock',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 4,
        },
        {
          x: 6,
          y: 4,
        },
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
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
        {
          x: 13,
          y: 7,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
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
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
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
          x: 10,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 13,
          y: 10,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 18,
          y: 12,
        },
        {
          x: 17,
          y: 13,
        },
        {
          x: 18,
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
      goal: 10,
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
            kind: 'patroller',
            every: 4,
            path: [
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
                x: 12,
                y: 6,
              },
              {
                x: 13,
                y: 6,
              },
              {
                x: 14,
                y: 6,
              },
              {
                x: 14,
                y: 7,
              },
              {
                x: 14,
                y: 8,
              },
              {
                x: 14,
                y: 9,
              },
              {
                x: 14,
                y: 10,
              },
              {
                x: 14,
                y: 11,
              },
              {
                x: 13,
                y: 11,
              },
              {
                x: 12,
                y: 11,
              },
              {
                x: 11,
                y: 11,
              },
              {
                x: 10,
                y: 11,
              },
              {
                x: 9,
                y: 11,
              },
              {
                x: 9,
                y: 10,
              },
              {
                x: 9,
                y: 9,
              },
              {
                x: 9,
                y: 8,
              },
              {
                x: 9,
                y: 7,
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
    id: 'classic-pursuit-passing-bays',
    chapterId: 'classic-snake-patrol-routes',
    title: {
      en: 'Passing Bays',
      uk: 'Кишені для об’їзду',
    },
    description: {
      en: 'Side bays let your tail clear the long patrol lane before you return.',
      uk: 'Бічні кишені дають хвосту звільнити довгий шлях патруля до вашого повернення.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-passing-bays',
      revision: '1',
      name: 'Passing Bays',
      width: 24,
      height: 18,
      walls: [
        {
          x: 4,
          y: 6,
        },
        {
          x: 5,
          y: 6,
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
          x: 11,
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
          x: 17,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 19,
          y: 6,
        },
        {
          x: 4,
          y: 7,
        },
        {
          x: 5,
          y: 7,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
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
        {
          x: 13,
          y: 7,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 19,
          y: 7,
        },
        {
          x: 4,
          y: 11,
        },
        {
          x: 5,
          y: 11,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 13,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 19,
          y: 11,
        },
        {
          x: 4,
          y: 12,
        },
        {
          x: 5,
          y: 12,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 18,
          y: 12,
        },
        {
          x: 19,
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
      goal: 10,
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
            kind: 'patroller',
            every: 4,
            path: [
              {
                x: 3,
                y: 9,
              },
              {
                x: 4,
                y: 9,
              },
              {
                x: 5,
                y: 9,
              },
              {
                x: 6,
                y: 9,
              },
              {
                x: 7,
                y: 9,
              },
              {
                x: 8,
                y: 9,
              },
              {
                x: 9,
                y: 9,
              },
              {
                x: 10,
                y: 9,
              },
              {
                x: 11,
                y: 9,
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
                x: 14,
                y: 9,
              },
              {
                x: 15,
                y: 9,
              },
              {
                x: 16,
                y: 9,
              },
              {
                x: 17,
                y: 9,
              },
              {
                x: 18,
                y: 9,
              },
              {
                x: 19,
                y: 9,
              },
              {
                x: 20,
                y: 9,
              },
              {
                x: 21,
                y: 9,
              },
              {
                x: 21,
                y: 10,
              },
              {
                x: 21,
                y: 11,
              },
              {
                x: 21,
                y: 12,
              },
              {
                x: 21,
                y: 13,
              },
              {
                x: 21,
                y: 14,
              },
              {
                x: 20,
                y: 14,
              },
              {
                x: 19,
                y: 14,
              },
              {
                x: 18,
                y: 14,
              },
              {
                x: 17,
                y: 14,
              },
              {
                x: 16,
                y: 14,
              },
              {
                x: 15,
                y: 14,
              },
              {
                x: 14,
                y: 14,
              },
              {
                x: 13,
                y: 14,
              },
              {
                x: 12,
                y: 14,
              },
              {
                x: 11,
                y: 14,
              },
              {
                x: 10,
                y: 14,
              },
              {
                x: 9,
                y: 14,
              },
              {
                x: 8,
                y: 14,
              },
              {
                x: 7,
                y: 14,
              },
              {
                x: 6,
                y: 14,
              },
              {
                x: 5,
                y: 14,
              },
              {
                x: 4,
                y: 14,
              },
              {
                x: 3,
                y: 14,
              },
              {
                x: 3,
                y: 13,
              },
              {
                x: 3,
                y: 12,
              },
              {
                x: 3,
                y: 11,
              },
              {
                x: 3,
                y: 10,
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
    id: 'classic-pursuit-crossroads',
    chapterId: 'classic-snake-patrol-routes',
    title: {
      en: 'Crossroads',
      uk: 'Перехрестя',
    },
    description: {
      en: 'The patrol revisits the centre from two loops. Intercept a crossing, then leave.',
      uk: 'Патруль повертається в центр із двох петель. Перехопіть на перетині й виходьте.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-crossroads',
      revision: '1',
      name: 'Crossroads',
      width: 24,
      height: 18,
      walls: [
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 17,
          y: 4,
        },
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 5,
          y: 6,
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
          x: 5,
          y: 7,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
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
          x: 17,
          y: 10,
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
          x: 17,
          y: 11,
        },
        {
          x: 5,
          y: 12,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
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
          x: 17,
          y: 12,
        },
        {
          x: 5,
          y: 13,
        },
        {
          x: 6,
          y: 13,
        },
        {
          x: 7,
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
      goal: 10,
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
            kind: 'patroller',
            every: 4,
            path: [
              {
                x: 11,
                y: 9,
              },
              {
                x: 10,
                y: 9,
              },
              {
                x: 9,
                y: 9,
              },
              {
                x: 8,
                y: 9,
              },
              {
                x: 7,
                y: 9,
              },
              {
                x: 6,
                y: 9,
              },
              {
                x: 5,
                y: 9,
              },
              {
                x: 4,
                y: 9,
              },
              {
                x: 3,
                y: 9,
              },
              {
                x: 3,
                y: 8,
              },
              {
                x: 3,
                y: 7,
              },
              {
                x: 3,
                y: 6,
              },
              {
                x: 3,
                y: 5,
              },
              {
                x: 3,
                y: 4,
              },
              {
                x: 3,
                y: 3,
              },
              {
                x: 4,
                y: 3,
              },
              {
                x: 5,
                y: 3,
              },
              {
                x: 6,
                y: 3,
              },
              {
                x: 7,
                y: 3,
              },
              {
                x: 8,
                y: 3,
              },
              {
                x: 9,
                y: 3,
              },
              {
                x: 10,
                y: 3,
              },
              {
                x: 11,
                y: 3,
              },
              {
                x: 11,
                y: 4,
              },
              {
                x: 11,
                y: 5,
              },
              {
                x: 11,
                y: 6,
              },
              {
                x: 11,
                y: 7,
              },
              {
                x: 11,
                y: 8,
              },
              {
                x: 11,
                y: 9,
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
                x: 14,
                y: 9,
              },
              {
                x: 15,
                y: 9,
              },
              {
                x: 16,
                y: 9,
              },
              {
                x: 17,
                y: 9,
              },
              {
                x: 18,
                y: 9,
              },
              {
                x: 19,
                y: 9,
              },
              {
                x: 20,
                y: 9,
              },
              {
                x: 20,
                y: 10,
              },
              {
                x: 20,
                y: 11,
              },
              {
                x: 20,
                y: 12,
              },
              {
                x: 20,
                y: 13,
              },
              {
                x: 20,
                y: 14,
              },
              {
                x: 19,
                y: 14,
              },
              {
                x: 18,
                y: 14,
              },
              {
                x: 17,
                y: 14,
              },
              {
                x: 16,
                y: 14,
              },
              {
                x: 15,
                y: 14,
              },
              {
                x: 14,
                y: 14,
              },
              {
                x: 13,
                y: 14,
              },
              {
                x: 12,
                y: 14,
              },
              {
                x: 11,
                y: 14,
              },
              {
                x: 11,
                y: 13,
              },
              {
                x: 11,
                y: 12,
              },
              {
                x: 11,
                y: 11,
              },
              {
                x: 11,
                y: 10,
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
    id: 'classic-pursuit-inner-shortcut',
    chapterId: 'classic-snake-patrol-routes',
    title: {
      en: 'Inner Shortcut',
      uk: 'Внутрішній зріз',
    },
    description: {
      en: 'The outside patrol is longer than the broken inner ring. Use its openings.',
      uk: 'Зовнішній маршрут довший за розірване внутрішнє кільце. Користуйтеся проходами.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-inner-shortcut',
      revision: '1',
      name: 'Inner Shortcut',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 5,
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
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
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
      goal: 10,
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
            kind: 'patroller',
            every: 4,
            path: [
              {
                x: 5,
                y: 3,
              },
              {
                x: 6,
                y: 3,
              },
              {
                x: 7,
                y: 3,
              },
              {
                x: 8,
                y: 3,
              },
              {
                x: 9,
                y: 3,
              },
              {
                x: 10,
                y: 3,
              },
              {
                x: 11,
                y: 3,
              },
              {
                x: 12,
                y: 3,
              },
              {
                x: 13,
                y: 3,
              },
              {
                x: 14,
                y: 3,
              },
              {
                x: 15,
                y: 3,
              },
              {
                x: 16,
                y: 3,
              },
              {
                x: 17,
                y: 3,
              },
              {
                x: 18,
                y: 3,
              },
              {
                x: 19,
                y: 3,
              },
              {
                x: 19,
                y: 4,
              },
              {
                x: 19,
                y: 5,
              },
              {
                x: 19,
                y: 6,
              },
              {
                x: 19,
                y: 7,
              },
              {
                x: 19,
                y: 8,
              },
              {
                x: 19,
                y: 9,
              },
              {
                x: 19,
                y: 10,
              },
              {
                x: 19,
                y: 11,
              },
              {
                x: 19,
                y: 12,
              },
              {
                x: 19,
                y: 13,
              },
              {
                x: 19,
                y: 14,
              },
              {
                x: 18,
                y: 14,
              },
              {
                x: 17,
                y: 14,
              },
              {
                x: 16,
                y: 14,
              },
              {
                x: 15,
                y: 14,
              },
              {
                x: 14,
                y: 14,
              },
              {
                x: 13,
                y: 14,
              },
              {
                x: 12,
                y: 14,
              },
              {
                x: 11,
                y: 14,
              },
              {
                x: 10,
                y: 14,
              },
              {
                x: 9,
                y: 14,
              },
              {
                x: 8,
                y: 14,
              },
              {
                x: 7,
                y: 14,
              },
              {
                x: 6,
                y: 14,
              },
              {
                x: 5,
                y: 14,
              },
              {
                x: 5,
                y: 13,
              },
              {
                x: 5,
                y: 12,
              },
              {
                x: 5,
                y: 11,
              },
              {
                x: 5,
                y: 10,
              },
              {
                x: 5,
                y: 9,
              },
              {
                x: 5,
                y: 8,
              },
              {
                x: 5,
                y: 7,
              },
              {
                x: 5,
                y: 6,
              },
              {
                x: 5,
                y: 5,
              },
              {
                x: 5,
                y: 4,
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
    id: 'classic-pursuit-open-intercept',
    chapterId: 'classic-snake-escape-lines',
    title: {
      en: 'Open Intercept',
      uk: 'Відкрите перехоплення',
    },
    description: {
      en: 'Asymmetric cover changes the runner’s escape. Approach from the open side.',
      uk: 'Несиметричне укриття змінює шлях втечі бігуна. Заходьте з відкритого боку.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-open-intercept',
      revision: '1',
      name: 'Open Intercept',
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
          x: 8,
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
          x: 8,
          y: 6,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 8,
          y: 7,
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
          x: 17,
          y: 10,
        },
        {
          x: 18,
          y: 10,
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
          x: 17,
          y: 11,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
          y: 13,
        },
        {
          x: 11,
          y: 14,
        },
        {
          x: 12,
          y: 14,
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
      goal: 12,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-blind-corner',
    chapterId: 'classic-snake-escape-lines',
    title: {
      en: 'Blind Corner',
      uk: 'Сліпий кут',
    },
    description: {
      en: 'A tall elbow hides the shorter route. Keep the second exit available.',
      uk: 'Великий вигин приховує коротший шлях. Залишайте другий вихід доступним.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-blind-corner',
      revision: '1',
      name: 'Blind Corner',
      width: 24,
      height: 18,
      walls: [
        {
          x: 9,
          y: 3,
        },
        {
          x: 10,
          y: 3,
        },
        {
          x: 9,
          y: 4,
        },
        {
          x: 10,
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
          x: 9,
          y: 6,
        },
        {
          x: 10,
          y: 6,
        },
        {
          x: 9,
          y: 7,
        },
        {
          x: 10,
          y: 7,
        },
        {
          x: 9,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 9,
          y: 10,
        },
        {
          x: 10,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 13,
          y: 10,
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
          x: 17,
          y: 10,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
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
          x: 16,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 3,
          y: 13,
        },
        {
          x: 4,
          y: 13,
        },
        {
          x: 5,
          y: 13,
        },
        {
          x: 6,
          y: 13,
        },
        {
          x: 3,
          y: 14,
        },
        {
          x: 4,
          y: 14,
        },
        {
          x: 5,
          y: 14,
        },
        {
          x: 6,
          y: 14,
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
      goal: 12,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-zigzag-exit',
    chapterId: 'classic-snake-escape-lines',
    title: {
      en: 'Zigzag Exit',
      uk: 'Зигзаг виходу',
    },
    description: {
      en: 'Alternating walls reach opposite edges. Cut through the middle gaps.',
      uk: 'Почергові стіни сягають протилежних країв. Проходьте крізь центральні проміжки.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-zigzag-exit',
      revision: '1',
      name: 'Zigzag Exit',
      width: 24,
      height: 18,
      walls: [
        {
          x: 8,
          y: 0,
        },
        {
          x: 9,
          y: 0,
        },
        {
          x: 8,
          y: 1,
        },
        {
          x: 9,
          y: 1,
        },
        {
          x: 8,
          y: 2,
        },
        {
          x: 9,
          y: 2,
        },
        {
          x: 8,
          y: 3,
        },
        {
          x: 9,
          y: 3,
        },
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
          x: 15,
          y: 9,
        },
        {
          x: 16,
          y: 9,
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
          x: 3,
          y: 11,
        },
        {
          x: 4,
          y: 11,
        },
        {
          x: 5,
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
          x: 3,
          y: 12,
        },
        {
          x: 4,
          y: 12,
        },
        {
          x: 5,
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
          x: 15,
          y: 13,
        },
        {
          x: 16,
          y: 13,
        },
        {
          x: 15,
          y: 14,
        },
        {
          x: 16,
          y: 14,
        },
        {
          x: 15,
          y: 15,
        },
        {
          x: 16,
          y: 15,
        },
        {
          x: 15,
          y: 16,
        },
        {
          x: 16,
          y: 16,
        },
        {
          x: 15,
          y: 17,
        },
        {
          x: 16,
          y: 17,
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
      goal: 12,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-broken-ring',
    chapterId: 'classic-snake-escape-lines',
    title: {
      en: 'Broken Ring',
      uk: 'Розірване кільце',
    },
    description: {
      en: 'Two unequal gaps connect inside and outside. Change sides to intercept.',
      uk: 'Два нерівні проходи сполучають внутрішній і зовнішній простір. Змінюйте бік для перехоплення.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-broken-ring',
      revision: '1',
      name: 'Broken Ring',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 4,
        },
        {
          x: 8,
          y: 4,
        },
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
          x: 12,
          y: 4,
        },
        {
          x: 13,
          y: 4,
        },
        {
          x: 14,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 7,
          y: 13,
        },
        {
          x: 8,
          y: 13,
        },
        {
          x: 9,
          y: 13,
        },
        {
          x: 10,
          y: 13,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
          y: 13,
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
      goal: 12,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-border-cutoff',
    chapterId: 'classic-snake-escape-lines',
    title: {
      en: 'Border Cutoff',
      uk: 'Зріз через край',
    },
    description: {
      en: 'Edges wrap. Cross the border to get ahead of a runner in the offset lanes.',
      uk: 'Краї переносять на протилежний бік. Випереджайте бігуна переходом між зміщеними смугами.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-border-cutoff',
      revision: '1',
      name: 'Border Cutoff',
      width: 24,
      height: 18,
      walls: [
        {
          x: 14,
          y: 0,
        },
        {
          x: 15,
          y: 0,
        },
        {
          x: 14,
          y: 1,
        },
        {
          x: 15,
          y: 1,
        },
        {
          x: 14,
          y: 2,
        },
        {
          x: 15,
          y: 2,
        },
        {
          x: 14,
          y: 3,
        },
        {
          x: 15,
          y: 3,
        },
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 14,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
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
          x: 14,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 18,
          y: 10,
        },
        {
          x: 19,
          y: 10,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 19,
          y: 11,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 18,
          y: 12,
        },
        {
          x: 19,
          y: 12,
        },
        {
          x: 6,
          y: 13,
        },
        {
          x: 7,
          y: 13,
        },
        {
          x: 18,
          y: 13,
        },
        {
          x: 19,
          y: 13,
        },
        {
          x: 18,
          y: 14,
        },
        {
          x: 19,
          y: 14,
        },
        {
          x: 18,
          y: 15,
        },
        {
          x: 19,
          y: 15,
        },
        {
          x: 18,
          y: 16,
        },
        {
          x: 19,
          y: 16,
        },
        {
          x: 18,
          y: 17,
        },
        {
          x: 19,
          y: 17,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 11,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 12,
      stepMs: 200,
      speedupEvery: 0,
      minStepMs: 200,
      wrap: true,
      targetMovement: 'still',
      fleeEvery: 3,
      objective: 'mission',
      targets: {
        maxActive: 1,
        required: [
          {
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-three-way-escape',
    chapterId: 'classic-snake-escape-lines',
    title: {
      en: 'Three-way Escape',
      uk: 'Три шляхи втечі',
    },
    description: {
      en: 'Three broad junctions offer different escape loops. Turn toward the next exit.',
      uk: 'Три широкі розвилки дають різні петлі втечі. Повертайте до наступного виходу.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-three-way-escape',
      revision: '1',
      name: 'Three-way Escape',
      width: 24,
      height: 18,
      walls: [
        {
          x: 10,
          y: 0,
        },
        {
          x: 11,
          y: 0,
        },
        {
          x: 10,
          y: 1,
        },
        {
          x: 11,
          y: 1,
        },
        {
          x: 10,
          y: 2,
        },
        {
          x: 11,
          y: 2,
        },
        {
          x: 10,
          y: 3,
        },
        {
          x: 11,
          y: 3,
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
          x: 10,
          y: 5,
        },
        {
          x: 11,
          y: 5,
        },
        {
          x: 15,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 19,
          y: 8,
        },
        {
          x: 20,
          y: 8,
        },
        {
          x: 21,
          y: 8,
        },
        {
          x: 22,
          y: 8,
        },
        {
          x: 23,
          y: 8,
        },
        {
          x: 0,
          y: 9,
        },
        {
          x: 1,
          y: 9,
        },
        {
          x: 2,
          y: 9,
        },
        {
          x: 3,
          y: 9,
        },
        {
          x: 4,
          y: 9,
        },
        {
          x: 5,
          y: 9,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 18,
          y: 9,
        },
        {
          x: 19,
          y: 9,
        },
        {
          x: 20,
          y: 9,
        },
        {
          x: 21,
          y: 9,
        },
        {
          x: 22,
          y: 9,
        },
        {
          x: 23,
          y: 9,
        },
        {
          x: 0,
          y: 10,
        },
        {
          x: 1,
          y: 10,
        },
        {
          x: 2,
          y: 10,
        },
        {
          x: 3,
          y: 10,
        },
        {
          x: 4,
          y: 10,
        },
        {
          x: 5,
          y: 10,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
          y: 13,
        },
        {
          x: 11,
          y: 14,
        },
        {
          x: 12,
          y: 14,
        },
        {
          x: 11,
          y: 15,
        },
        {
          x: 12,
          y: 15,
        },
        {
          x: 11,
          y: 16,
        },
        {
          x: 12,
          y: 16,
        },
        {
          x: 11,
          y: 17,
        },
        {
          x: 12,
          y: 17,
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
      goal: 12,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-first-dash',
    chapterId: 'classic-snake-burst-timing',
    title: {
      en: 'First Dash',
      uk: 'Перший ривок',
    },
    description: {
      en: 'Watch the warning in the long straight. The side bays leave room to circle.',
      uk: 'Стежте за попередженням на довгій прямій. Бічні кишені залишають місце для кола.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-first-dash',
      revision: '1',
      name: 'First Dash',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 6,
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
          x: 8,
          y: 6,
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
          x: 12,
          y: 6,
        },
        {
          x: 13,
          y: 6,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 5,
          y: 7,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
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
        {
          x: 13,
          y: 7,
        },
        {
          x: 14,
          y: 7,
        },
        {
          x: 15,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 5,
          y: 11,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
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
          x: 16,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 5,
          y: 12,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
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
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 18,
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
      goal: 14,
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
            kind: 'sprinter',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-corner-pause',
    chapterId: 'classic-snake-burst-timing',
    title: {
      en: 'Corner Pause',
      uk: 'Пауза за рогом',
    },
    description: {
      en: 'The large right-angle route gives a second approach during the sprint recovery.',
      uk: 'Великий прямокутний маршрут дає другий підхід, поки спринтер відпочиває.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-corner-pause',
      revision: '1',
      name: 'Corner Pause',
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
          x: 17,
          y: 4,
        },
        {
          x: 18,
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
          x: 17,
          y: 5,
        },
        {
          x: 18,
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
          x: 17,
          y: 6,
        },
        {
          x: 18,
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
          x: 8,
          y: 9,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 9,
          y: 10,
        },
        {
          x: 10,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 13,
          y: 10,
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
          x: 17,
          y: 10,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
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
          x: 16,
          y: 11,
        },
        {
          x: 17,
          y: 11,
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
      goal: 14,
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
            kind: 'sprinter',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-alternating-straights',
    chapterId: 'classic-snake-burst-timing',
    title: {
      en: 'Alternating Straights',
      uk: 'Почергові прямі',
    },
    description: {
      en: 'An S circuit alternates long straights. Leave the inner corner for your tail.',
      uk: 'S-подібне коло чергує довгі прямі. Залишайте внутрішній кут для хвоста.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-alternating-straights',
      revision: '1',
      name: 'Alternating Straights',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 4,
        },
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 8,
          y: 4,
        },
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
          x: 12,
          y: 4,
        },
        {
          x: 13,
          y: 4,
        },
        {
          x: 14,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 17,
          y: 4,
        },
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
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
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 5,
          y: 6,
        },
        {
          x: 6,
          y: 6,
        },
        {
          x: 5,
          y: 7,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 5,
          y: 8,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 5,
          y: 9,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
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
          x: 14,
          y: 9,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 9,
          y: 10,
        },
        {
          x: 10,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 13,
          y: 10,
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
          x: 17,
          y: 10,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 16,
          y: 13,
        },
        {
          x: 17,
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
      goal: 14,
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
            kind: 'sprinter',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-staggered-cover',
    chapterId: 'classic-snake-burst-timing',
    title: {
      en: 'Staggered Cover',
      uk: 'Зміщені укриття',
    },
    description: {
      en: 'Offset islands interrupt straight approaches. Use the diagonal spaces between them.',
      uk: 'Зміщені острови переривають прямі підходи. Користуйтеся діагональними проміжками.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-staggered-cover',
      revision: '1',
      name: 'Staggered Cover',
      width: 24,
      height: 18,
      walls: [
        {
          x: 4,
          y: 4,
        },
        {
          x: 5,
          y: 4,
        },
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 4,
          y: 5,
        },
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 4,
          y: 6,
        },
        {
          x: 5,
          y: 6,
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
          x: 11,
          y: 7,
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
          x: 14,
          y: 7,
        },
        {
          x: 11,
          y: 8,
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
          x: 14,
          y: 8,
        },
        {
          x: 11,
          y: 9,
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
          x: 14,
          y: 9,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 19,
          y: 11,
        },
        {
          x: 20,
          y: 11,
        },
        {
          x: 4,
          y: 12,
        },
        {
          x: 5,
          y: 12,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 18,
          y: 12,
        },
        {
          x: 19,
          y: 12,
        },
        {
          x: 20,
          y: 12,
        },
        {
          x: 4,
          y: 13,
        },
        {
          x: 5,
          y: 13,
        },
        {
          x: 6,
          y: 13,
        },
        {
          x: 18,
          y: 13,
        },
        {
          x: 19,
          y: 13,
        },
        {
          x: 20,
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
      goal: 14,
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
            kind: 'sprinter',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-crossing-bursts',
    chapterId: 'classic-snake-burst-timing',
    title: {
      en: 'Crossing Bursts',
      uk: 'Перехресні ривки',
    },
    description: {
      en: 'Two loops meet at an open crossing. Choose which of the two targets to intercept.',
      uk: 'Дві петлі сходяться на відкритому перехресті. Обирайте, яку з двох цілей перехопити.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-crossing-bursts',
      revision: '1',
      name: 'Crossing Bursts',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 4,
        },
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 8,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 17,
          y: 4,
        },
        {
          x: 18,
          y: 4,
        },
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 5,
          y: 6,
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
          x: 8,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 5,
          y: 11,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
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
          x: 17,
          y: 11,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 5,
          y: 12,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
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
          x: 17,
          y: 12,
        },
        {
          x: 18,
          y: 12,
        },
        {
          x: 5,
          y: 13,
        },
        {
          x: 6,
          y: 13,
        },
        {
          x: 7,
          y: 13,
        },
        {
          x: 8,
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
        {
          x: 17,
          y: 13,
        },
        {
          x: 18,
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
      goal: 14,
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
            kind: 'sprinter',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-long-way-round',
    chapterId: 'classic-snake-burst-timing',
    title: {
      en: 'Long Way Round',
      uk: 'Довгий обхід',
    },
    description: {
      en: 'A central barrier reaches the lower edge. Intercept through the broad upper return.',
      uk: 'Центральна перегородка сягає нижнього краю. Перехоплюйте через широкий верхній обхід.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-long-way-round',
      revision: '1',
      name: 'Long Way Round',
      width: 24,
      height: 18,
      walls: [
        {
          x: 11,
          y: 5,
        },
        {
          x: 12,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 19,
          y: 5,
        },
        {
          x: 20,
          y: 5,
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
          x: 17,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 19,
          y: 6,
        },
        {
          x: 20,
          y: 6,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 3,
          y: 8,
        },
        {
          x: 4,
          y: 8,
        },
        {
          x: 5,
          y: 8,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 3,
          y: 9,
        },
        {
          x: 4,
          y: 9,
        },
        {
          x: 5,
          y: 9,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
          y: 13,
        },
        {
          x: 11,
          y: 14,
        },
        {
          x: 12,
          y: 14,
        },
        {
          x: 11,
          y: 15,
        },
        {
          x: 12,
          y: 15,
        },
        {
          x: 11,
          y: 16,
        },
        {
          x: 12,
          y: 16,
        },
        {
          x: 11,
          y: 17,
        },
        {
          x: 12,
          y: 17,
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
      goal: 14,
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
            kind: 'sprinter',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-first-shutter',
    chapterId: 'classic-snake-route-windows',
    title: {
      en: 'First Shutter',
      uk: 'Перша заслінка',
    },
    description: {
      en: 'The warning marks a closing shortcut. The outside loop always stays open.',
      uk: 'Попередження позначає короткий шлях, що закривається. Зовнішнє коло завжди відкрите.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-first-shutter',
      revision: '1',
      name: 'First Shutter',
      width: 24,
      height: 18,
      walls: [
        {
          x: 10,
          y: 4,
        },
        {
          x: 11,
          y: 4,
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
          x: 10,
          y: 6,
        },
        {
          x: 11,
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
          x: 10,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 10,
          y: 13,
        },
        {
          x: 11,
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
      goal: 14,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
            {
              x: 10,
              y: 8,
            },
            {
              x: 11,
              y: 8,
            },
            {
              x: 10,
              y: 9,
            },
            {
              x: 11,
              y: 9,
            },
          ],
          phase: 0,
        },
      ],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-split-corridor',
    chapterId: 'classic-snake-route-windows',
    title: {
      en: 'Split Corridor',
      uk: 'Розділений коридор',
    },
    description: {
      en: 'The gated middle competes with two unequal permanent routes.',
      uk: 'Центральний шлях із заслінкою змагається з двома нерівними постійними обходами.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-split-corridor',
      revision: '1',
      name: 'Split Corridor',
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
          x: 8,
          y: 5,
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
          x: 12,
          y: 5,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
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
          x: 8,
          y: 6,
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
          x: 12,
          y: 6,
        },
        {
          x: 13,
          y: 6,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
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
          x: 16,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
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
          x: 16,
          y: 12,
        },
        {
          x: 17,
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
      goal: 14,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
            {
              x: 11,
              y: 8,
            },
            {
              x: 12,
              y: 8,
            },
            {
              x: 11,
              y: 9,
            },
            {
              x: 12,
              y: 9,
            },
          ],
          phase: 0,
        },
      ],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-offset-windows',
    chapterId: 'classic-snake-route-windows',
    title: {
      en: 'Offset Windows',
      uk: 'Зміщені вікна',
    },
    description: {
      en: 'Two shutters are out of phase. Follow the open detour instead of waiting in place.',
      uk: 'Дві заслінки працюють у різних фазах. Ідіть відкритим обходом, замість чекати на місці.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-offset-windows',
      revision: '1',
      name: 'Offset Windows',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 4,
        },
        {
          x: 8,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 15,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 15,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
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
          x: 7,
          y: 13,
        },
        {
          x: 8,
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
      goal: 14,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
            {
              x: 7,
              y: 7,
            },
            {
              x: 8,
              y: 7,
            },
            {
              x: 7,
              y: 8,
            },
            {
              x: 8,
              y: 8,
            },
          ],
          phase: 0,
        },
        {
          id: 'shutter-2',
          cells: [
            {
              x: 15,
              y: 10,
            },
            {
              x: 16,
              y: 10,
            },
            {
              x: 15,
              y: 11,
            },
            {
              x: 16,
              y: 11,
            },
          ],
          phase: 24,
        },
      ],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-clockwork-ring',
    chapterId: 'classic-snake-route-windows',
    title: {
      en: 'Clockwork Ring',
      uk: 'Кільце за розкладом',
    },
    description: {
      en: 'Timed radial cuts shorten a ring with a permanently open circumference.',
      uk: 'Тимчасові радіальні зрізи вкорочують кільце з постійно відкритим зовнішнім колом.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-clockwork-ring',
      revision: '1',
      name: 'Clockwork Ring',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 5,
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
          x: 10,
          y: 5,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
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
      goal: 14,
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
            kind: 'patroller',
            every: 4,
            path: [
              {
                x: 5,
                y: 3,
              },
              {
                x: 6,
                y: 3,
              },
              {
                x: 7,
                y: 3,
              },
              {
                x: 8,
                y: 3,
              },
              {
                x: 9,
                y: 3,
              },
              {
                x: 10,
                y: 3,
              },
              {
                x: 11,
                y: 3,
              },
              {
                x: 12,
                y: 3,
              },
              {
                x: 13,
                y: 3,
              },
              {
                x: 14,
                y: 3,
              },
              {
                x: 15,
                y: 3,
              },
              {
                x: 16,
                y: 3,
              },
              {
                x: 17,
                y: 3,
              },
              {
                x: 18,
                y: 3,
              },
              {
                x: 19,
                y: 3,
              },
              {
                x: 19,
                y: 4,
              },
              {
                x: 19,
                y: 5,
              },
              {
                x: 19,
                y: 6,
              },
              {
                x: 19,
                y: 7,
              },
              {
                x: 19,
                y: 8,
              },
              {
                x: 19,
                y: 9,
              },
              {
                x: 19,
                y: 10,
              },
              {
                x: 19,
                y: 11,
              },
              {
                x: 19,
                y: 12,
              },
              {
                x: 19,
                y: 13,
              },
              {
                x: 19,
                y: 14,
              },
              {
                x: 18,
                y: 14,
              },
              {
                x: 17,
                y: 14,
              },
              {
                x: 16,
                y: 14,
              },
              {
                x: 15,
                y: 14,
              },
              {
                x: 14,
                y: 14,
              },
              {
                x: 13,
                y: 14,
              },
              {
                x: 12,
                y: 14,
              },
              {
                x: 11,
                y: 14,
              },
              {
                x: 10,
                y: 14,
              },
              {
                x: 9,
                y: 14,
              },
              {
                x: 8,
                y: 14,
              },
              {
                x: 7,
                y: 14,
              },
              {
                x: 6,
                y: 14,
              },
              {
                x: 5,
                y: 14,
              },
              {
                x: 5,
                y: 13,
              },
              {
                x: 5,
                y: 12,
              },
              {
                x: 5,
                y: 11,
              },
              {
                x: 5,
                y: 10,
              },
              {
                x: 5,
                y: 9,
              },
              {
                x: 5,
                y: 8,
              },
              {
                x: 5,
                y: 7,
              },
              {
                x: 5,
                y: 6,
              },
              {
                x: 5,
                y: 5,
              },
              {
                x: 5,
                y: 4,
              },
            ],
          },
        ],
        bonus: null,
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
            {
              x: 11,
              y: 5,
            },
            {
              x: 12,
              y: 5,
            },
          ],
          phase: 0,
        },
        {
          id: 'shutter-2',
          cells: [
            {
              x: 11,
              y: 12,
            },
            {
              x: 12,
              y: 12,
            },
          ],
          phase: 24,
        },
      ],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-boundary-detour',
    chapterId: 'classic-snake-route-windows',
    title: {
      en: 'Boundary Detour',
      uk: 'Обхід від краю',
    },
    description: {
      en: 'An edge-reaching wall interrupts the old outer circuit. Take the inner return.',
      uk: 'Стіна від краю перериває зовнішнє коло. Скористайтеся внутрішнім обходом.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-boundary-detour',
      revision: '1',
      name: 'Boundary Detour',
      width: 24,
      height: 18,
      walls: [
        {
          x: 11,
          y: 0,
        },
        {
          x: 12,
          y: 0,
        },
        {
          x: 11,
          y: 1,
        },
        {
          x: 12,
          y: 1,
        },
        {
          x: 11,
          y: 2,
        },
        {
          x: 12,
          y: 2,
        },
        {
          x: 11,
          y: 3,
        },
        {
          x: 12,
          y: 3,
        },
        {
          x: 11,
          y: 4,
        },
        {
          x: 12,
          y: 4,
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
          x: 18,
          y: 6,
        },
        {
          x: 19,
          y: 6,
        },
        {
          x: 20,
          y: 6,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 19,
          y: 7,
        },
        {
          x: 20,
          y: 7,
        },
        {
          x: 3,
          y: 8,
        },
        {
          x: 4,
          y: 8,
        },
        {
          x: 5,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 3,
          y: 9,
        },
        {
          x: 4,
          y: 9,
        },
        {
          x: 5,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
          y: 13,
        },
        {
          x: 11,
          y: 14,
        },
        {
          x: 12,
          y: 14,
        },
        {
          x: 11,
          y: 15,
        },
        {
          x: 12,
          y: 15,
        },
        {
          x: 11,
          y: 16,
        },
        {
          x: 12,
          y: 16,
        },
        {
          x: 11,
          y: 17,
        },
        {
          x: 12,
          y: 17,
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
      goal: 14,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
            {
              x: 11,
              y: 6,
            },
            {
              x: 12,
              y: 6,
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
          phase: 0,
        },
      ],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-return-junction',
    chapterId: 'classic-snake-route-windows',
    title: {
      en: 'Return Junction',
      uk: 'Розвилка повернення',
    },
    description: {
      en: 'Three junctions and two timed shortcuts reward planning the return before the catch.',
      uk: 'Три розвилки й два тимчасові зрізи винагороджують план повернення ще до дотику.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-return-junction',
      revision: '1',
      name: 'Return Junction',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
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
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 5,
          y: 6,
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
          x: 8,
          y: 6,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 5,
          y: 11,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 9,
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
          x: 16,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 5,
          y: 12,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
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
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 18,
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
      goal: 14,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
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
              x: 13,
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
              x: 13,
              y: 6,
            },
          ],
          phase: 0,
        },
        {
          id: 'shutter-2',
          cells: [
            {
              x: 10,
              y: 11,
            },
            {
              x: 11,
              y: 11,
            },
            {
              x: 12,
              y: 11,
            },
            {
              x: 13,
              y: 11,
            },
            {
              x: 10,
              y: 12,
            },
            {
              x: 11,
              y: 12,
            },
            {
              x: 12,
              y: 12,
            },
            {
              x: 13,
              y: 12,
            },
          ],
          phase: 24,
        },
      ],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-first-pulse',
    chapterId: 'classic-snake-field-supplies',
    title: {
      en: 'First Pulse',
      uk: 'Перший імпульс',
    },
    description: {
      en: 'Touch the pulse in the open bay to pause target movement for eight steps.',
      uk: 'Торкніться імпульсу у відкритій кишені, щоб зупинити цілі на вісім кроків.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-first-pulse',
      revision: '1',
      name: 'First Pulse',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 5,
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
          x: 7,
          y: 6,
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
          x: 7,
          y: 7,
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
          x: 15,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 17,
          y: 10,
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
          x: 17,
          y: 11,
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
          x: 17,
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
      goal: 16,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [
        {
          at: 2,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-pursuit-cable-service',
    chapterId: 'classic-snake-field-supplies',
    title: {
      en: 'Cable Service',
      uk: 'Змотування кабелю',
    },
    description: {
      en: 'The reel removes four tail cells, down to four. Both visual styles use the same rule.',
      uk: 'Котушка прибирає чотири клітинки хвоста, але залишає щонайменше чотири. Правило однакове для обох стилів.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-cable-service',
      revision: '1',
      name: 'Cable Service',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
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
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 5,
          y: 6,
        },
        {
          x: 5,
          y: 7,
        },
        {
          x: 5,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
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
          x: 18,
          y: 8,
        },
        {
          x: 5,
          y: 9,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
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
          x: 18,
          y: 9,
        },
        {
          x: 18,
          y: 10,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 5,
          y: 12,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
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
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 18,
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
      goal: 16,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [
        {
          at: 2,
          kind: 'reel',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-pursuit-choose-the-detour',
    chapterId: 'classic-snake-field-supplies',
    title: {
      en: 'Choose the Detour',
      uk: 'Обери обхід',
    },
    description: {
      en: 'A side supply bay costs a detour. Decide whether space or interception matters now.',
      uk: 'Бічна кишеня з припасами потребує обходу. Обирайте між простором і перехопленням.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-choose-the-detour',
      revision: '1',
      name: 'Choose the Detour',
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
          x: 8,
          y: 5,
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
          x: 12,
          y: 5,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
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
          x: 8,
          y: 6,
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
          x: 12,
          y: 6,
        },
        {
          x: 13,
          y: 6,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 19,
          y: 7,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 19,
          y: 8,
        },
        {
          x: 18,
          y: 9,
        },
        {
          x: 19,
          y: 9,
        },
        {
          x: 18,
          y: 10,
        },
        {
          x: 19,
          y: 10,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
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
          x: 16,
          y: 11,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
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
      goal: 16,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [
        {
          at: 2,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
        {
          at: 6,
          kind: 'reel',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-pursuit-courier-crossing',
    chapterId: 'classic-snake-field-supplies',
    title: {
      en: 'Courier Crossing',
      uk: 'Перехід кур’єра',
    },
    description: {
      en: 'The courier is optional: 250 points and growth, without required-catch credit. It does not expire.',
      uk: 'Кур’єр необов’язковий: 250 очок і приріст хвоста, без заліку основної цілі. Він не зникає за таймером.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-courier-crossing',
      revision: '1',
      name: 'Courier Crossing',
      width: 24,
      height: 18,
      walls: [
        {
          x: 11,
          y: 4,
        },
        {
          x: 12,
          y: 4,
        },
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
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
          x: 5,
          y: 6,
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
          x: 8,
          y: 6,
        },
        {
          x: 5,
          y: 7,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 8,
          y: 7,
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
          x: 17,
          y: 10,
        },
        {
          x: 18,
          y: 10,
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
          x: 17,
          y: 11,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
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
          x: 17,
          y: 12,
        },
        {
          x: 18,
          y: 12,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
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
      goal: 16,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: {
          at: [4, 8],
          policy: {
            kind: 'courier',
            every: 4,
            path: [
              {
                x: 1,
                y: 1,
              },
              {
                x: 2,
                y: 1,
              },
              {
                x: 3,
                y: 1,
              },
              {
                x: 4,
                y: 1,
              },
              {
                x: 5,
                y: 1,
              },
              {
                x: 6,
                y: 1,
              },
              {
                x: 7,
                y: 1,
              },
              {
                x: 8,
                y: 1,
              },
              {
                x: 9,
                y: 1,
              },
              {
                x: 10,
                y: 1,
              },
              {
                x: 11,
                y: 1,
              },
              {
                x: 12,
                y: 1,
              },
              {
                x: 13,
                y: 1,
              },
              {
                x: 14,
                y: 1,
              },
              {
                x: 15,
                y: 1,
              },
              {
                x: 16,
                y: 1,
              },
              {
                x: 17,
                y: 1,
              },
              {
                x: 18,
                y: 1,
              },
              {
                x: 19,
                y: 1,
              },
              {
                x: 20,
                y: 1,
              },
              {
                x: 21,
                y: 1,
              },
              {
                x: 22,
                y: 1,
              },
              {
                x: 22,
                y: 2,
              },
              {
                x: 22,
                y: 3,
              },
              {
                x: 22,
                y: 4,
              },
              {
                x: 22,
                y: 5,
              },
              {
                x: 22,
                y: 6,
              },
              {
                x: 22,
                y: 7,
              },
              {
                x: 22,
                y: 8,
              },
              {
                x: 22,
                y: 9,
              },
              {
                x: 22,
                y: 10,
              },
              {
                x: 22,
                y: 11,
              },
              {
                x: 22,
                y: 12,
              },
              {
                x: 22,
                y: 13,
              },
              {
                x: 22,
                y: 14,
              },
              {
                x: 22,
                y: 15,
              },
              {
                x: 22,
                y: 16,
              },
              {
                x: 21,
                y: 16,
              },
              {
                x: 20,
                y: 16,
              },
              {
                x: 19,
                y: 16,
              },
              {
                x: 18,
                y: 16,
              },
              {
                x: 17,
                y: 16,
              },
              {
                x: 16,
                y: 16,
              },
              {
                x: 15,
                y: 16,
              },
              {
                x: 14,
                y: 16,
              },
              {
                x: 13,
                y: 16,
              },
              {
                x: 12,
                y: 16,
              },
              {
                x: 11,
                y: 16,
              },
              {
                x: 10,
                y: 16,
              },
              {
                x: 9,
                y: 16,
              },
              {
                x: 8,
                y: 16,
              },
              {
                x: 7,
                y: 16,
              },
              {
                x: 6,
                y: 16,
              },
              {
                x: 5,
                y: 16,
              },
              {
                x: 4,
                y: 16,
              },
              {
                x: 3,
                y: 16,
              },
              {
                x: 2,
                y: 16,
              },
              {
                x: 1,
                y: 16,
              },
              {
                x: 1,
                y: 15,
              },
              {
                x: 1,
                y: 14,
              },
              {
                x: 1,
                y: 13,
              },
              {
                x: 1,
                y: 12,
              },
              {
                x: 1,
                y: 11,
              },
              {
                x: 1,
                y: 10,
              },
              {
                x: 1,
                y: 9,
              },
              {
                x: 1,
                y: 8,
              },
              {
                x: 1,
                y: 7,
              },
              {
                x: 1,
                y: 6,
              },
              {
                x: 1,
                y: 5,
              },
              {
                x: 1,
                y: 4,
              },
              {
                x: 1,
                y: 3,
              },
              {
                x: 1,
                y: 2,
              },
            ],
          },
        },
      },
      shutters: [],
      pickups: [
        {
          at: 2,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-pursuit-shared-supply',
    chapterId: 'classic-snake-field-supplies',
    title: {
      en: 'Shared Supply',
      uk: 'Спільні припаси',
    },
    description: {
      en: 'Two loops meet at a supply junction. In Team, a pulse helps both heads; a reel shortens its collector.',
      uk: 'Дві петлі сходяться біля припасів. У команді імпульс допомагає обом, а котушка вкорочує хвіст того, хто її взяв.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-shared-supply',
      revision: '1',
      name: 'Shared Supply',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 5,
          y: 6,
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
          x: 8,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 5,
          y: 7,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 15,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 5,
          y: 8,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
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
          x: 15,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 5,
          y: 9,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
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
          x: 15,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 18,
          y: 9,
        },
        {
          x: 5,
          y: 10,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 8,
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
          x: 17,
          y: 10,
        },
        {
          x: 18,
          y: 10,
        },
        {
          x: 5,
          y: 11,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
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
          x: 17,
          y: 11,
        },
        {
          x: 18,
          y: 11,
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
      goal: 16,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [
        {
          at: 2,
          kind: 'reel',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
        {
          at: 6,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-pursuit-last-offer',
    chapterId: 'classic-snake-field-supplies',
    title: {
      en: 'Last Offer',
      uk: 'Остання пропозиція',
    },
    description: {
      en: 'Courier offers follow required catches four and eight. Continue the main route if you prefer.',
      uk: 'Кур’єри пропонуються після четвертої та восьмої основної цілі. За бажанням продовжуйте головний маршрут.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-last-offer',
      revision: '1',
      name: 'Last Offer',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 4,
        },
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 17,
          y: 4,
        },
        {
          x: 18,
          y: 4,
        },
        {
          x: 19,
          y: 4,
        },
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 19,
          y: 5,
        },
        {
          x: 5,
          y: 6,
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
          x: 17,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 19,
          y: 6,
        },
        {
          x: 5,
          y: 7,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 19,
          y: 7,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 19,
          y: 8,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 18,
          y: 9,
        },
        {
          x: 19,
          y: 9,
        },
        {
          x: 10,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 13,
          y: 10,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 13,
          y: 11,
        },
        {
          x: 4,
          y: 12,
        },
        {
          x: 5,
          y: 12,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 4,
          y: 13,
        },
        {
          x: 5,
          y: 13,
        },
        {
          x: 6,
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
      goal: 16,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: {
          at: [4, 8],
          policy: {
            kind: 'courier',
            every: 4,
            path: [
              {
                x: 1,
                y: 1,
              },
              {
                x: 2,
                y: 1,
              },
              {
                x: 3,
                y: 1,
              },
              {
                x: 4,
                y: 1,
              },
              {
                x: 5,
                y: 1,
              },
              {
                x: 6,
                y: 1,
              },
              {
                x: 7,
                y: 1,
              },
              {
                x: 8,
                y: 1,
              },
              {
                x: 9,
                y: 1,
              },
              {
                x: 10,
                y: 1,
              },
              {
                x: 11,
                y: 1,
              },
              {
                x: 12,
                y: 1,
              },
              {
                x: 13,
                y: 1,
              },
              {
                x: 14,
                y: 1,
              },
              {
                x: 15,
                y: 1,
              },
              {
                x: 16,
                y: 1,
              },
              {
                x: 17,
                y: 1,
              },
              {
                x: 18,
                y: 1,
              },
              {
                x: 19,
                y: 1,
              },
              {
                x: 20,
                y: 1,
              },
              {
                x: 21,
                y: 1,
              },
              {
                x: 22,
                y: 1,
              },
              {
                x: 22,
                y: 2,
              },
              {
                x: 22,
                y: 3,
              },
              {
                x: 22,
                y: 4,
              },
              {
                x: 22,
                y: 5,
              },
              {
                x: 22,
                y: 6,
              },
              {
                x: 22,
                y: 7,
              },
              {
                x: 22,
                y: 8,
              },
              {
                x: 22,
                y: 9,
              },
              {
                x: 22,
                y: 10,
              },
              {
                x: 22,
                y: 11,
              },
              {
                x: 22,
                y: 12,
              },
              {
                x: 22,
                y: 13,
              },
              {
                x: 22,
                y: 14,
              },
              {
                x: 22,
                y: 15,
              },
              {
                x: 22,
                y: 16,
              },
              {
                x: 21,
                y: 16,
              },
              {
                x: 20,
                y: 16,
              },
              {
                x: 19,
                y: 16,
              },
              {
                x: 18,
                y: 16,
              },
              {
                x: 17,
                y: 16,
              },
              {
                x: 16,
                y: 16,
              },
              {
                x: 15,
                y: 16,
              },
              {
                x: 14,
                y: 16,
              },
              {
                x: 13,
                y: 16,
              },
              {
                x: 12,
                y: 16,
              },
              {
                x: 11,
                y: 16,
              },
              {
                x: 10,
                y: 16,
              },
              {
                x: 9,
                y: 16,
              },
              {
                x: 8,
                y: 16,
              },
              {
                x: 7,
                y: 16,
              },
              {
                x: 6,
                y: 16,
              },
              {
                x: 5,
                y: 16,
              },
              {
                x: 4,
                y: 16,
              },
              {
                x: 3,
                y: 16,
              },
              {
                x: 2,
                y: 16,
              },
              {
                x: 1,
                y: 16,
              },
              {
                x: 1,
                y: 15,
              },
              {
                x: 1,
                y: 14,
              },
              {
                x: 1,
                y: 13,
              },
              {
                x: 1,
                y: 12,
              },
              {
                x: 1,
                y: 11,
              },
              {
                x: 1,
                y: 10,
              },
              {
                x: 1,
                y: 9,
              },
              {
                x: 1,
                y: 8,
              },
              {
                x: 1,
                y: 7,
              },
              {
                x: 1,
                y: 6,
              },
              {
                x: 1,
                y: 5,
              },
              {
                x: 1,
                y: 4,
              },
              {
                x: 1,
                y: 3,
              },
              {
                x: 1,
                y: 2,
              },
            ],
          },
        },
      },
      shutters: [],
      pickups: [
        {
          at: 2,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
        {
          at: 6,
          kind: 'reel',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-pursuit-patrol-into-sprint',
    chapterId: 'classic-snake-combined-pursuit',
    title: {
      en: 'Patrol into Sprint',
      uk: 'Від патруля до ривка',
    },
    description: {
      en: 'Alternate predictable patrols and warned sprints around two nested circuits.',
      uk: 'Чергуйте передбачувані патрулі й ривки з попередженням навколо двох вкладених кіл.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-patrol-into-sprint',
      revision: '1',
      name: 'Patrol into Sprint',
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
          x: 8,
          y: 5,
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
          x: 12,
          y: 5,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 6,
          y: 6,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
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
          x: 17,
          y: 8,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
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
          x: 17,
          y: 9,
        },
        {
          x: 17,
          y: 10,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
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
          x: 16,
          y: 12,
        },
        {
          x: 17,
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
      goal: 18,
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
            kind: 'patroller',
            every: 4,
            path: [
              {
                x: 1,
                y: 1,
              },
              {
                x: 2,
                y: 1,
              },
              {
                x: 3,
                y: 1,
              },
              {
                x: 4,
                y: 1,
              },
              {
                x: 5,
                y: 1,
              },
              {
                x: 6,
                y: 1,
              },
              {
                x: 7,
                y: 1,
              },
              {
                x: 8,
                y: 1,
              },
              {
                x: 9,
                y: 1,
              },
              {
                x: 10,
                y: 1,
              },
              {
                x: 11,
                y: 1,
              },
              {
                x: 12,
                y: 1,
              },
              {
                x: 13,
                y: 1,
              },
              {
                x: 14,
                y: 1,
              },
              {
                x: 15,
                y: 1,
              },
              {
                x: 16,
                y: 1,
              },
              {
                x: 17,
                y: 1,
              },
              {
                x: 18,
                y: 1,
              },
              {
                x: 19,
                y: 1,
              },
              {
                x: 20,
                y: 1,
              },
              {
                x: 21,
                y: 1,
              },
              {
                x: 22,
                y: 1,
              },
              {
                x: 22,
                y: 2,
              },
              {
                x: 22,
                y: 3,
              },
              {
                x: 22,
                y: 4,
              },
              {
                x: 22,
                y: 5,
              },
              {
                x: 22,
                y: 6,
              },
              {
                x: 22,
                y: 7,
              },
              {
                x: 22,
                y: 8,
              },
              {
                x: 22,
                y: 9,
              },
              {
                x: 22,
                y: 10,
              },
              {
                x: 22,
                y: 11,
              },
              {
                x: 22,
                y: 12,
              },
              {
                x: 22,
                y: 13,
              },
              {
                x: 22,
                y: 14,
              },
              {
                x: 22,
                y: 15,
              },
              {
                x: 22,
                y: 16,
              },
              {
                x: 21,
                y: 16,
              },
              {
                x: 20,
                y: 16,
              },
              {
                x: 19,
                y: 16,
              },
              {
                x: 18,
                y: 16,
              },
              {
                x: 17,
                y: 16,
              },
              {
                x: 16,
                y: 16,
              },
              {
                x: 15,
                y: 16,
              },
              {
                x: 14,
                y: 16,
              },
              {
                x: 13,
                y: 16,
              },
              {
                x: 12,
                y: 16,
              },
              {
                x: 11,
                y: 16,
              },
              {
                x: 10,
                y: 16,
              },
              {
                x: 9,
                y: 16,
              },
              {
                x: 8,
                y: 16,
              },
              {
                x: 7,
                y: 16,
              },
              {
                x: 6,
                y: 16,
              },
              {
                x: 5,
                y: 16,
              },
              {
                x: 4,
                y: 16,
              },
              {
                x: 3,
                y: 16,
              },
              {
                x: 2,
                y: 16,
              },
              {
                x: 1,
                y: 16,
              },
              {
                x: 1,
                y: 15,
              },
              {
                x: 1,
                y: 14,
              },
              {
                x: 1,
                y: 13,
              },
              {
                x: 1,
                y: 12,
              },
              {
                x: 1,
                y: 11,
              },
              {
                x: 1,
                y: 10,
              },
              {
                x: 1,
                y: 9,
              },
              {
                x: 1,
                y: 8,
              },
              {
                x: 1,
                y: 7,
              },
              {
                x: 1,
                y: 6,
              },
              {
                x: 1,
                y: 5,
              },
              {
                x: 1,
                y: 4,
              },
              {
                x: 1,
                y: 3,
              },
              {
                x: 1,
                y: 2,
              },
            ],
          },
          {
            kind: 'sprinter',
            every: 3,
          },
          {
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-runner-at-the-window',
    chapterId: 'classic-snake-combined-pursuit',
    title: {
      en: 'Runner at the Window',
      uk: 'Бігун біля вікна',
    },
    description: {
      en: 'A runner can change direction near the timed shortcut. Leave the long ring open.',
      uk: 'Бігун може змінити напрямок біля тимчасового зрізу. Залишайте довге кільце відкритим.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-runner-at-the-window',
      revision: '1',
      name: 'Runner at the Window',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 4,
        },
        {
          x: 8,
          y: 4,
        },
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
          x: 12,
          y: 4,
        },
        {
          x: 13,
          y: 4,
        },
        {
          x: 14,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 17,
          y: 4,
        },
        {
          x: 18,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 7,
          y: 8,
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
          x: 18,
          y: 10,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 18,
          y: 12,
        },
        {
          x: 7,
          y: 13,
        },
        {
          x: 8,
          y: 13,
        },
        {
          x: 9,
          y: 13,
        },
        {
          x: 10,
          y: 13,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
          y: 13,
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
        {
          x: 16,
          y: 13,
        },
        {
          x: 17,
          y: 13,
        },
        {
          x: 18,
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
      goal: 18,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
            {
              x: 7,
              y: 9,
            },
            {
              x: 7,
              y: 10,
            },
          ],
          phase: 0,
        },
      ],
      pickups: [
        {
          at: 2,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-pursuit-border-relay',
    chapterId: 'classic-snake-combined-pursuit',
    title: {
      en: 'Border Relay',
      uk: 'Естафета через край',
    },
    description: {
      en: 'Wrap between offset chicanes. Both targets remain ordinary catchable humanoids.',
      uk: 'Переходьте через край між зміщеними шиканами. Обидві цілі — звичайні гуманоїди для перехоплення.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-border-relay',
      revision: '1',
      name: 'Border Relay',
      width: 24,
      height: 18,
      walls: [
        {
          x: 14,
          y: 0,
        },
        {
          x: 15,
          y: 0,
        },
        {
          x: 14,
          y: 1,
        },
        {
          x: 15,
          y: 1,
        },
        {
          x: 14,
          y: 2,
        },
        {
          x: 15,
          y: 2,
        },
        {
          x: 14,
          y: 3,
        },
        {
          x: 15,
          y: 3,
        },
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 14,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
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
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 17,
          y: 10,
        },
        {
          x: 18,
          y: 10,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 18,
          y: 12,
        },
        {
          x: 17,
          y: 13,
        },
        {
          x: 18,
          y: 13,
        },
        {
          x: 17,
          y: 14,
        },
        {
          x: 18,
          y: 14,
        },
        {
          x: 17,
          y: 15,
        },
        {
          x: 18,
          y: 15,
        },
        {
          x: 17,
          y: 16,
        },
        {
          x: 18,
          y: 16,
        },
        {
          x: 17,
          y: 17,
        },
        {
          x: 18,
          y: 17,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 12,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 18,
      stepMs: 200,
      speedupEvery: 0,
      minStepMs: 200,
      wrap: true,
      targetMovement: 'still',
      fleeEvery: 3,
      objective: 'mission',
      targets: {
        maxActive: 2,
        required: [
          {
            kind: 'runner',
            every: 3,
          },
          {
            kind: 'sprinter',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-forked-interception',
    chapterId: 'classic-snake-combined-pursuit',
    title: {
      en: 'Forked Interception',
      uk: 'Перехоплення на розвилці',
    },
    description: {
      en: 'Two targets share three return routes. Commit only after checking your growing tail.',
      uk: 'Дві цілі ділять три шляхи повернення. Обирайте напрямок після перевірки зростаючого хвоста.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-forked-interception',
      revision: '1',
      name: 'Forked Interception',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 0,
        },
        {
          x: 8,
          y: 0,
        },
        {
          x: 7,
          y: 1,
        },
        {
          x: 8,
          y: 1,
        },
        {
          x: 7,
          y: 2,
        },
        {
          x: 8,
          y: 2,
        },
        {
          x: 7,
          y: 3,
        },
        {
          x: 8,
          y: 3,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 8,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
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
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 19,
          y: 7,
        },
        {
          x: 20,
          y: 7,
        },
        {
          x: 21,
          y: 7,
        },
        {
          x: 22,
          y: 7,
        },
        {
          x: 23,
          y: 7,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 19,
          y: 8,
        },
        {
          x: 20,
          y: 8,
        },
        {
          x: 21,
          y: 8,
        },
        {
          x: 22,
          y: 8,
        },
        {
          x: 23,
          y: 8,
        },
        {
          x: 0,
          y: 9,
        },
        {
          x: 1,
          y: 9,
        },
        {
          x: 2,
          y: 9,
        },
        {
          x: 3,
          y: 9,
        },
        {
          x: 4,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 0,
          y: 10,
        },
        {
          x: 1,
          y: 10,
        },
        {
          x: 2,
          y: 10,
        },
        {
          x: 3,
          y: 10,
        },
        {
          x: 4,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
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
          x: 15,
          y: 13,
        },
        {
          x: 16,
          y: 13,
        },
        {
          x: 15,
          y: 14,
        },
        {
          x: 16,
          y: 14,
        },
        {
          x: 15,
          y: 15,
        },
        {
          x: 16,
          y: 15,
        },
        {
          x: 15,
          y: 16,
        },
        {
          x: 16,
          y: 16,
        },
        {
          x: 15,
          y: 17,
        },
        {
          x: 16,
          y: 17,
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
      goal: 18,
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
            kind: 'runner',
            every: 3,
          },
          {
            kind: 'sprinter',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-pursuit-supply-circuit',
    chapterId: 'classic-snake-combined-pursuit',
    title: {
      en: 'Supply Circuit',
      uk: 'Коло припасів',
    },
    description: {
      en: 'Supply detours and a yielding shutter share one circuit. The optional courier never blocks completion.',
      uk: 'Обходи за припасами й заслінка ділять одне коло. Необов’язковий кур’єр не заважає завершенню.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-supply-circuit',
      revision: '1',
      name: 'Supply Circuit',
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
          x: 8,
          y: 5,
        },
        {
          x: 9,
          y: 5,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
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
          x: 8,
          y: 6,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 13,
          y: 6,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 17,
          y: 10,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
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
          x: 16,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
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
          x: 16,
          y: 12,
        },
        {
          x: 17,
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
      goal: 18,
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
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: {
          at: [4, 8],
          policy: {
            kind: 'courier',
            every: 4,
            path: [
              {
                x: 1,
                y: 1,
              },
              {
                x: 2,
                y: 1,
              },
              {
                x: 3,
                y: 1,
              },
              {
                x: 4,
                y: 1,
              },
              {
                x: 5,
                y: 1,
              },
              {
                x: 6,
                y: 1,
              },
              {
                x: 7,
                y: 1,
              },
              {
                x: 8,
                y: 1,
              },
              {
                x: 9,
                y: 1,
              },
              {
                x: 10,
                y: 1,
              },
              {
                x: 11,
                y: 1,
              },
              {
                x: 12,
                y: 1,
              },
              {
                x: 13,
                y: 1,
              },
              {
                x: 14,
                y: 1,
              },
              {
                x: 15,
                y: 1,
              },
              {
                x: 16,
                y: 1,
              },
              {
                x: 17,
                y: 1,
              },
              {
                x: 18,
                y: 1,
              },
              {
                x: 19,
                y: 1,
              },
              {
                x: 20,
                y: 1,
              },
              {
                x: 21,
                y: 1,
              },
              {
                x: 22,
                y: 1,
              },
              {
                x: 22,
                y: 2,
              },
              {
                x: 22,
                y: 3,
              },
              {
                x: 22,
                y: 4,
              },
              {
                x: 22,
                y: 5,
              },
              {
                x: 22,
                y: 6,
              },
              {
                x: 22,
                y: 7,
              },
              {
                x: 22,
                y: 8,
              },
              {
                x: 22,
                y: 9,
              },
              {
                x: 22,
                y: 10,
              },
              {
                x: 22,
                y: 11,
              },
              {
                x: 22,
                y: 12,
              },
              {
                x: 22,
                y: 13,
              },
              {
                x: 22,
                y: 14,
              },
              {
                x: 22,
                y: 15,
              },
              {
                x: 22,
                y: 16,
              },
              {
                x: 21,
                y: 16,
              },
              {
                x: 20,
                y: 16,
              },
              {
                x: 19,
                y: 16,
              },
              {
                x: 18,
                y: 16,
              },
              {
                x: 17,
                y: 16,
              },
              {
                x: 16,
                y: 16,
              },
              {
                x: 15,
                y: 16,
              },
              {
                x: 14,
                y: 16,
              },
              {
                x: 13,
                y: 16,
              },
              {
                x: 12,
                y: 16,
              },
              {
                x: 11,
                y: 16,
              },
              {
                x: 10,
                y: 16,
              },
              {
                x: 9,
                y: 16,
              },
              {
                x: 8,
                y: 16,
              },
              {
                x: 7,
                y: 16,
              },
              {
                x: 6,
                y: 16,
              },
              {
                x: 5,
                y: 16,
              },
              {
                x: 4,
                y: 16,
              },
              {
                x: 3,
                y: 16,
              },
              {
                x: 2,
                y: 16,
              },
              {
                x: 1,
                y: 16,
              },
              {
                x: 1,
                y: 15,
              },
              {
                x: 1,
                y: 14,
              },
              {
                x: 1,
                y: 13,
              },
              {
                x: 1,
                y: 12,
              },
              {
                x: 1,
                y: 11,
              },
              {
                x: 1,
                y: 10,
              },
              {
                x: 1,
                y: 9,
              },
              {
                x: 1,
                y: 8,
              },
              {
                x: 1,
                y: 7,
              },
              {
                x: 1,
                y: 6,
              },
              {
                x: 1,
                y: 5,
              },
              {
                x: 1,
                y: 4,
              },
              {
                x: 1,
                y: 3,
              },
              {
                x: 1,
                y: 2,
              },
            ],
          },
        },
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
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
          ],
          phase: 0,
        },
      ],
      pickups: [
        {
          at: 2,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
        {
          at: 6,
          kind: 'reel',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-pursuit-final-airfield',
    chapterId: 'classic-snake-combined-pursuit',
    title: {
      en: 'Final Airfield',
      uk: 'Фінальний аеродром',
    },
    description: {
      en: 'Three courtyards connect through open bypasses and two shutters. Choose targets and supplies without rushing a closed route.',
      uk: 'Три двори сполучені відкритими обходами й двома заслінками. Обирайте цілі та припаси, не поспішайте на закритий шлях.',
    },
    level: {
      version: 'classic-snake-level.v2',
      id: 'classic-pursuit-final-airfield',
      revision: '1',
      name: 'Final Airfield',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 0,
        },
        {
          x: 8,
          y: 0,
        },
        {
          x: 7,
          y: 1,
        },
        {
          x: 8,
          y: 1,
        },
        {
          x: 7,
          y: 2,
        },
        {
          x: 8,
          y: 2,
        },
        {
          x: 7,
          y: 3,
        },
        {
          x: 8,
          y: 3,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 8,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
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
        {
          x: 15,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 15,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
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
          x: 7,
          y: 13,
        },
        {
          x: 8,
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
        {
          x: 15,
          y: 14,
        },
        {
          x: 16,
          y: 14,
        },
        {
          x: 15,
          y: 15,
        },
        {
          x: 16,
          y: 15,
        },
        {
          x: 15,
          y: 16,
        },
        {
          x: 16,
          y: 16,
        },
        {
          x: 15,
          y: 17,
        },
        {
          x: 16,
          y: 17,
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
      goal: 18,
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
            kind: 'runner',
            every: 3,
          },
          {
            kind: 'sprinter',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
            {
              x: 7,
              y: 6,
            },
            {
              x: 8,
              y: 6,
            },
            {
              x: 7,
              y: 7,
            },
            {
              x: 8,
              y: 7,
            },
            {
              x: 7,
              y: 8,
            },
            {
              x: 8,
              y: 8,
            },
          ],
          phase: 0,
        },
        {
          id: 'shutter-2',
          cells: [
            {
              x: 15,
              y: 9,
            },
            {
              x: 16,
              y: 9,
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
              x: 15,
              y: 11,
            },
            {
              x: 16,
              y: 11,
            },
          ],
          phase: 24,
        },
      ],
      pickups: [
        {
          at: 2,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
        {
          at: 6,
          kind: 'reel',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 14,
            },
            {
              x: 3,
              y: 14,
            },
            {
              x: 20,
              y: 3,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-living-refuge-bays',
    chapterId: 'classic-snake-twin-intercepts',
    title: {
      en: 'Refuge Bays',
      uk: 'Затишні кишені',
    },
    description: {
      en: 'The refuge seeker announces its next bay. Cut across the open middle instead of following it.',
      uk: 'Шукач укриття показує наступну кишеню. Зрізайте через відкритий центр, замість бігти слідом.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-refuge-bays',
      revision: '1',
      name: 'Refuge Bays',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 5,
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
          x: 7,
          y: 6,
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
          x: 7,
          y: 7,
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
          x: 15,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 17,
          y: 10,
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
          x: 17,
          y: 11,
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
          x: 17,
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
      goal: 8,
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
            kind: 'refuge',
            every: 3,
            goals: [
              {
                x: 3,
                y: 4,
              },
              {
                x: 20,
                y: 13,
              },
              {
                x: 20,
                y: 4,
              },
              {
                x: 3,
                y: 13,
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
    id: 'classic-living-switchback-yard',
    chapterId: 'classic-snake-twin-intercepts',
    title: {
      en: 'Switchback Yard',
      uk: 'Двір зміни курсу',
    },
    description: {
      en: 'The scarf runner signals its next exit before committing. Intercept from the opposite return.',
      uk: 'Бігун із шарфом показує наступний вихід перед рухом. Перехоплюйте з протилежного обходу.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-switchback-yard',
      revision: '1',
      name: 'Switchback Yard',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 4,
        },
        {
          x: 8,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 8,
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
        {
          x: 7,
          y: 8,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 16,
          y: 9,
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
          x: 15,
          y: 11,
        },
        {
          x: 16,
          y: 11,
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
      goal: 10,
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
            kind: 'switchback',
            every: 3,
            goals: [
              {
                x: 3,
                y: 8,
              },
              {
                x: 12,
                y: 3,
              },
              {
                x: 20,
                y: 8,
              },
              {
                x: 12,
                y: 14,
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
    id: 'classic-living-rendezvous-crossing',
    chapterId: 'classic-snake-twin-intercepts',
    title: {
      en: 'Rendezvous Crossing',
      uk: 'Перехрестя зустрічі',
    },
    description: {
      en: 'Two partners seek one meeting place. Each catch counts once; the survivor becomes a runner.',
      uk: 'Двоє партнерів шукають місце зустрічі. Кожен дотик рахується один раз; уцілілий стає бігуном.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-rendezvous-crossing',
      revision: '1',
      name: 'Rendezvous Crossing',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 5,
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
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 7,
          y: 6,
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
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 7,
          y: 7,
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
          x: 14,
          y: 7,
        },
        {
          x: 15,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 9,
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
          x: 16,
          y: 11,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
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
      goal: 10,
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
            kind: 'pair',
            every: 3,
            goals: [
              {
                x: 3,
                y: 9,
              },
              {
                x: 20,
                y: 9,
              },
              {
                x: 12,
                y: 4,
              },
              {
                x: 12,
                y: 14,
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
    id: 'classic-living-cable-cutoff',
    chapterId: 'classic-snake-twin-intercepts',
    title: {
      en: 'Cable Cutoff',
      uk: 'Кабельний заслін',
    },
    description: {
      en: 'Two offset passages turn your cable into a temporary barrier. Leave a return lane before herding the prey.',
      uk: 'Два зміщені проходи перетворюють кабель на тимчасову перешкоду. Залиште шлях повернення перед загоном цілі.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-cable-cutoff',
      revision: '1',
      name: 'Cable Cutoff',
      width: 24,
      height: 18,
      walls: [
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
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
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
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
          x: 16,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 10,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 13,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 17,
          y: 10,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 16,
          y: 13,
        },
        {
          x: 17,
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
      goal: 12,
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
            kind: 'refuge',
            every: 3,
            goals: [
              {
                x: 3,
                y: 5,
              },
              {
                x: 12,
                y: 4,
              },
              {
                x: 20,
                y: 12,
              },
              {
                x: 12,
                y: 14,
              },
            ],
          },
          {
            kind: 'switchback',
            every: 3,
            goals: [
              {
                x: 3,
                y: 5,
              },
              {
                x: 12,
                y: 4,
              },
              {
                x: 20,
                y: 12,
              },
              {
                x: 12,
                y: 14,
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
    id: 'classic-living-return-pincer',
    chapterId: 'classic-snake-twin-intercepts',
    title: {
      en: 'Return Pincer',
      uk: 'Обхідні лещата',
    },
    description: {
      en: 'Pair goals alternate across the long divider. In Team, use separate returns and keep both cables clear.',
      uk: 'Цілі пари чергуються по боках довгої перегородки. У команді використовуйте різні обходи й бережіть обидва кабелі.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-return-pincer',
      revision: '1',
      name: 'Return Pincer',
      width: 24,
      height: 18,
      walls: [
        {
          x: 11,
          y: 4,
        },
        {
          x: 12,
          y: 4,
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
          x: 11,
          y: 6,
        },
        {
          x: 12,
          y: 6,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 5,
          y: 8,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 5,
          y: 9,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 18,
          y: 9,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
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
      goal: 12,
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
            kind: 'pair',
            every: 3,
            goals: [
              {
                x: 3,
                y: 8,
              },
              {
                x: 20,
                y: 8,
              },
              {
                x: 8,
                y: 14,
              },
              {
                x: 15,
                y: 3,
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
    id: 'classic-living-twin-intercepts',
    chapterId: 'classic-snake-twin-intercepts',
    title: {
      en: 'Twin Intercepts',
      uk: 'Подвійні перехоплення',
    },
    description: {
      en: 'Refuge seekers, runners and switchbacks share three courtyards. Choose a different approach for each intention.',
      uk: 'Шукачі укриття, бігуни й майстри зміни курсу ділять три двори. Обирайте підхід за наміром кожного.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-twin-intercepts',
      revision: '1',
      name: 'Twin Intercepts',
      width: 24,
      height: 18,
      walls: [
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
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
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
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
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 16,
          y: 9,
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
          x: 15,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
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
          x: 6,
          y: 13,
        },
        {
          x: 7,
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
      goal: 14,
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
            kind: 'refuge',
            every: 3,
            goals: [
              {
                x: 3,
                y: 4,
              },
              {
                x: 3,
                y: 13,
              },
              {
                x: 12,
                y: 4,
              },
              {
                x: 12,
                y: 13,
              },
              {
                x: 20,
                y: 4,
              },
              {
                x: 20,
                y: 13,
              },
            ],
          },
          {
            kind: 'runner',
            every: 3,
          },
          {
            kind: 'switchback',
            every: 3,
            goals: [
              {
                x: 3,
                y: 4,
              },
              {
                x: 3,
                y: 13,
              },
              {
                x: 12,
                y: 4,
              },
              {
                x: 12,
                y: 13,
              },
              {
                x: 20,
                y: 4,
              },
              {
                x: 20,
                y: 13,
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
    id: 'classic-living-shield-window',
    chapterId: 'classic-snake-moving-windows',
    title: {
      en: 'Shield Window',
      uk: 'Вікно щита',
    },
    description: {
      en: 'Specialist: the marked shield front is fatal. Catch from the side or rear; a warned turn keeps its old facing until complete.',
      uk: 'Спеціаліст: позначений перед щита смертельний. Ловіть збоку чи ззаду; під час попередження щит зберігає старий напрямок.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-shield-window',
      revision: '1',
      name: 'Shield Window',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 6,
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
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 7,
          y: 7,
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
          x: 15,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 7,
          y: 8,
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
          x: 15,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 9,
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
          x: 17,
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
      goal: 8,
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
            kind: 'shield',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-living-brace-break',
    chapterId: 'classic-snake-moving-windows',
    title: {
      en: 'Brace Break',
      uk: 'Пауза броні',
    },
    description: {
      en: 'Specialist: warning and burst are protected. Catch during the long recovery, when the armor visibly opens.',
      uk: 'Спеціаліст: попередження й ривок захищені. Ловіть під час довгого відпочинку, коли броня видимо відкривається.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-brace-break',
      revision: '1',
      name: 'Brace Break',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 5,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
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
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 5,
          y: 6,
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
          x: 8,
          y: 6,
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
          x: 12,
          y: 6,
        },
        {
          x: 13,
          y: 6,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 5,
          y: 11,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 18,
          y: 11,
        },
        {
          x: 5,
          y: 12,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 18,
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
      goal: 10,
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
            kind: 'brace',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-living-shutter-flank',
    chapterId: 'classic-snake-moving-windows',
    title: {
      en: 'Shutter Flank',
      uk: 'Фланг заслінки',
    },
    description: {
      en: 'The center shortcut opens beside the shield. Take the permanent outer return when either danger blocks the approach.',
      uk: 'Центральний зріз відкривається біля щита. Обирайте постійний зовнішній обхід, коли підхід небезпечний.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-shutter-flank',
      revision: '1',
      name: 'Shutter Flank',
      width: 24,
      height: 18,
      walls: [
        {
          x: 11,
          y: 4,
        },
        {
          x: 12,
          y: 4,
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
          x: 11,
          y: 6,
        },
        {
          x: 12,
          y: 6,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 5,
          y: 8,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 5,
          y: 9,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 18,
          y: 9,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
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
      goal: 12,
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
            kind: 'shield',
            every: 3,
          },
          {
            kind: 'runner',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
            {
              x: 11,
              y: 8,
            },
            {
              x: 12,
              y: 8,
            },
            {
              x: 11,
              y: 9,
            },
            {
              x: 12,
              y: 9,
            },
          ],
          phase: 0,
        },
      ],
      pickups: [],
    },
  },
  {
    id: 'classic-living-frozen-opening',
    chapterId: 'classic-snake-moving-windows',
    title: {
      en: 'Frozen Opening',
      uk: 'Завмерле вікно',
    },
    description: {
      en: 'Pulse freezes the current armor state, not just movement. Collect it during recovery to extend the safe catch window.',
      uk: 'Імпульс зупиняє поточний стан броні, а не лише рух. Візьміть його під час відпочинку, щоб подовжити безпечне вікно.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-frozen-opening',
      revision: '1',
      name: 'Frozen Opening',
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
          x: 8,
          y: 5,
        },
        {
          x: 9,
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
          x: 8,
          y: 6,
        },
        {
          x: 9,
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
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
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
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
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
          x: 17,
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
          x: 17,
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
          x: 17,
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
      goal: 12,
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
            kind: 'brace',
            every: 3,
          },
          {
            kind: 'switchback',
            every: 3,
            goals: [
              {
                x: 3,
                y: 4,
              },
              {
                x: 20,
                y: 4,
              },
              {
                x: 20,
                y: 13,
              },
              {
                x: 3,
                y: 13,
              },
            ],
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [
        {
          at: 2,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 13,
            },
            {
              x: 3,
              y: 13,
            },
            {
              x: 20,
              y: 4,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-living-supply-flanks',
    chapterId: 'classic-snake-moving-windows',
    title: {
      en: 'Supply Flanks',
      uk: 'Припаси на флангах',
    },
    description: {
      en: 'Refuge goals and shield flanks compete with supply detours. Reel frees space, but cannot undo a collision.',
      uk: 'Цілі укриття й фланги щита змагаються з обходами за припасами. Котушка звільняє місце, але не скасовує зіткнення.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-supply-flanks',
      revision: '1',
      name: 'Supply Flanks',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 6,
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
          x: 8,
          y: 6,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 5,
          y: 7,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
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
          x: 14,
          y: 7,
        },
        {
          x: 15,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
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
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 14,
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
      goal: 14,
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
            kind: 'shield',
            every: 3,
          },
          {
            kind: 'refuge',
            every: 3,
            goals: [
              {
                x: 3,
                y: 4,
              },
              {
                x: 20,
                y: 4,
              },
              {
                x: 20,
                y: 13,
              },
              {
                x: 3,
                y: 13,
              },
            ],
          },
          {
            kind: 'sprinter',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [
        {
          at: 2,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 13,
            },
            {
              x: 3,
              y: 13,
            },
            {
              x: 20,
              y: 4,
            },
          ],
        },
        {
          at: 6,
          kind: 'reel',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 13,
            },
            {
              x: 3,
              y: 13,
            },
            {
              x: 20,
              y: 4,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'classic-living-living-airfield',
    chapterId: 'classic-snake-moving-windows',
    title: {
      en: 'Living Airfield',
      uk: 'Живий аеродром',
    },
    description: {
      en: 'Two timed crossings link specialist and ordinary prey. Read each silhouette, choose a safe return, then commit.',
      uk: 'Два тимчасові переходи поєднують спеціалістів і звичайну здобич. Читайте силуети, обирайте безпечний обхід і дійте.',
    },
    level: {
      version: 'classic-snake-level.v3',
      id: 'classic-living-living-airfield',
      revision: '1',
      name: 'Living Airfield',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 4,
        },
        {
          x: 8,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 15,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 15,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 7,
          y: 13,
        },
        {
          x: 8,
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
      goal: 16,
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
            kind: 'refuge',
            every: 3,
            goals: [
              {
                x: 3,
                y: 4,
              },
              {
                x: 20,
                y: 4,
              },
              {
                x: 20,
                y: 13,
              },
              {
                x: 3,
                y: 13,
              },
              {
                x: 12,
                y: 4,
              },
              {
                x: 12,
                y: 13,
              },
            ],
          },
          {
            kind: 'shield',
            every: 3,
          },
          {
            kind: 'switchback',
            every: 3,
            goals: [
              {
                x: 3,
                y: 4,
              },
              {
                x: 20,
                y: 4,
              },
              {
                x: 20,
                y: 13,
              },
              {
                x: 3,
                y: 13,
              },
              {
                x: 12,
                y: 4,
              },
              {
                x: 12,
                y: 13,
              },
            ],
          },
          {
            kind: 'brace',
            every: 3,
          },
        ],
        bonus: null,
      },
      shutters: [
        {
          id: 'shutter-1',
          cells: [
            {
              x: 7,
              y: 7,
            },
            {
              x: 8,
              y: 7,
            },
            {
              x: 7,
              y: 8,
            },
            {
              x: 8,
              y: 8,
            },
            {
              x: 7,
              y: 9,
            },
            {
              x: 8,
              y: 9,
            },
          ],
          phase: 0,
        },
        {
          id: 'shutter-2',
          cells: [
            {
              x: 15,
              y: 10,
            },
            {
              x: 16,
              y: 10,
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
              x: 15,
              y: 12,
            },
            {
              x: 16,
              y: 12,
            },
          ],
          phase: 24,
        },
      ],
      pickups: [
        {
          at: 2,
          kind: 'pulse',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 13,
            },
            {
              x: 3,
              y: 13,
            },
            {
              x: 20,
              y: 4,
            },
          ],
        },
        {
          at: 6,
          kind: 'reel',
          pads: [
            {
              x: 3,
              y: 4,
            },
            {
              x: 20,
              y: 13,
            },
            {
              x: 3,
              y: 13,
            },
            {
              x: 20,
              y: 4,
            },
          ],
        },
      ],
    },
  },
];
