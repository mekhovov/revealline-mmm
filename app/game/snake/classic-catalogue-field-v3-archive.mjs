// Exact official field recipes retained before the encounter expansion.
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const CLASSIC_SNAKE_FIELD_V3_ARCHIVED_LEVELS = freeze([
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
      revision: '3',
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
            signalProfile: 'local-burst-v2',
          },
          {
            kind: 'jammer',
            every: 3,
            at: {
              x: 3,
              y: 10,
            },
            signalProfile: 'local-burst-v2',
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
      revision: '3',
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
            signalProfile: 'local-burst-v2',
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
            signalProfile: 'local-burst-v2',
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-field-lane-window',
    chapterId: 'classic-snake-signal-tactics',
    title: {
      en: 'Lane Window',
      uk: 'Вікно смуги',
    },
    description: {
      en: 'Dashed marks warn before the lane turns solid. Cross during recovery, or use either permanent end bypass.',
      uk: 'Пунктир попереджає перед активацією смуги. Перетинайте її під час відновлення або обходьте з кінців.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-lane-window',
      revision: '1',
      name: 'Lane Window',
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
          x: 12,
          y: 4,
        },
        {
          x: 13,
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
          x: 12,
          y: 5,
        },
        {
          x: 13,
          y: 5,
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
            kind: 'lane',
            every: 3,
            at: {
              x: 18,
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
    id: 'classic-field-two-returns',
    chapterId: 'classic-snake-signal-tactics',
    title: {
      en: 'Two Returns',
      uk: 'Два обходи',
    },
    description: {
      en: 'Only the head is vulnerable to the active lane. Your trailing cable can pass safely.',
      uk: 'Активна смуга небезпечна лише для голови. Кабель позаду проходить безпечно.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-two-returns',
      revision: '1',
      name: 'Two Returns',
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
          x: 14,
          y: 10,
        },
        {
          x: 15,
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
          x: 14,
          y: 12,
        },
        {
          x: 15,
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
            kind: 'runner',
            every: 3,
          },
          {
            kind: 'lane',
            every: 3,
            at: {
              x: 18,
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
    id: 'classic-field-broadcast-check',
    chapterId: 'classic-snake-signal-tactics',
    title: {
      en: 'Broadcast Check',
      uk: 'Перевірка трансляції',
    },
    description: {
      en: 'This antenna disrupts the whole live feed. Follow its visible source through each short burst, then catch it to restore reception.',
      uk: 'Ця антена спотворює все поле наживо. Стежте за видимим джерелом під час коротких сплесків і ловіть його для відновлення прийому.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-broadcast-check',
      revision: '1',
      name: 'Broadcast Check',
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
              x: 19,
              y: 9,
            },
            signalProfile: 'broadcast-burst-v1',
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-field-quiet-channel',
    chapterId: 'classic-snake-signal-tactics',
    title: {
      en: 'Quiet Channel',
      uk: 'Тихий канал',
    },
    description: {
      en: 'Two antennas share one feed. Only one transmits at a time, with a guaranteed clear interval. Plan the next approach while the picture is clean.',
      uk: 'Дві антени ділять один ефір. Одночасно передає лише одна, а між сплесками є чистий інтервал. Плануйте наближення, поки зображення чітке.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-quiet-channel',
      revision: '1',
      name: 'Quiet Channel',
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
          x: 8,
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
            signalProfile: 'broadcast-burst-v1',
          },
          {
            kind: 'jammer',
            every: 3,
            at: {
              x: 3,
              y: 10,
            },
            signalProfile: 'broadcast-burst-v1',
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
      revision: '3',
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
            signalProfile: 'local-burst-v2',
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
      en: 'Broadcast bursts briefly distort the whole feed. Catch the visible antenna, then use clear intervals to reach both relays. No lane starts an attack during interference.',
      uk: 'Сплески трансляції ненадовго спотворюють усе поле. Спіймайте видиму антену й використовуйте чисті інтервали, щоб дістатися обох ретрансляторів. Під час перешкод смуга не починає атаку.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-relay-airfield',
      revision: '2',
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
            signalProfile: 'broadcast-burst-v1',
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
    id: 'classic-field-open-seam',
    chapterId: 'classic-snake-field-mastery',
    title: {
      en: 'Open Seam',
      uk: 'Відкритий шов',
    },
    description: {
      en: 'The marked wall opens after the eroder warns. No wall ever closes behind your cable.',
      uk: 'Позначена стіна відкриється після попередження руйнівника. Жодна стіна не закривається за кабелем.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-open-seam',
      revision: '1',
      name: 'Open Seam',
      width: 24,
      height: 18,
      walls: [
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
    id: 'classic-field-seam-return',
    chapterId: 'classic-snake-field-mastery',
    title: {
      en: 'Seam Return',
      uk: 'Обхід шва',
    },
    description: {
      en: 'Opening the marked edge creates a new turn pocket. Keep the permanent outer route as your fallback.',
      uk: 'Відкриття краю створює нову кишеню для повороту. Збережіть постійний зовнішній обхід.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-seam-return',
      revision: '1',
      name: 'Seam Return',
      width: 24,
      height: 18,
      walls: [
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
            kind: 'ricochet',
            every: 3,
            heading: 'right',
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-field-guard-line',
    chapterId: 'classic-snake-field-mastery',
    title: {
      en: 'Guard Line',
      uk: 'Лінія охоронця',
    },
    description: {
      en: 'The guard fixes its aim before firing. Dodge the marked next projectile cell; only your head can be hit.',
      uk: 'Охоронець фіксує приціл перед пострілом. Уникайте позначеної наступної клітини снаряда; небезпечний удар лише в голову.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-guard-line',
      revision: '1',
      name: 'Guard Line',
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
          x: 12,
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
            kind: 'guard',
            every: 3,
            at: {
              x: 6,
              y: 8,
            },
            heading: 'right',
          },
          {
            kind: 'guard',
            every: 3,
            at: {
              x: 18,
              y: 8,
            },
            heading: 'left',
          },
        ],
        bonus: null,
      },
      shutters: [],
      pickups: [],
    },
  },
  {
    id: 'classic-field-guard-return',
    chapterId: 'classic-snake-field-mastery',
    title: {
      en: 'Guard Return',
      uk: 'Обхід охоронця',
    },
    description: {
      en: 'Approach the guard from the side while its shot travels away. Catching it clears its remaining shots.',
      uk: 'Наближайтеся до охоронця збоку, поки постріл летить геть. Ловля прибирає його решту снарядів.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-guard-return',
      revision: '1',
      name: 'Guard Return',
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
          x: 12,
          y: 4,
        },
        {
          x: 13,
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
            kind: 'guard',
            every: 3,
            at: {
              x: 6,
              y: 8,
            },
            heading: 'right',
          },
          {
            kind: 'rover',
            every: 3,
          },
          {
            kind: 'guard',
            every: 3,
            at: {
              x: 18,
              y: 8,
            },
            heading: 'left',
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
      revision: '3',
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
            signalProfile: 'local-burst-v2',
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
  {
    id: 'classic-field-field-finale',
    chapterId: 'classic-snake-field-mastery',
    title: {
      en: 'Field Finale',
      uk: 'Фінал поля',
    },
    description: {
      en: 'Finish the circuit with clear warnings, permanent bypasses and a relay opening that stays unlocked.',
      uk: 'Завершіть коло з чіткими попередженнями, постійними обходами й незмінно відкритим ретранслятором.',
    },
    level: {
      version: 'classic-snake-level.v4',
      id: 'classic-field-field-finale',
      revision: '1',
      name: 'Field Finale',
      width: 24,
      height: 18,
      walls: [
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
          x: 4,
          y: 11,
        },
        {
          x: 5,
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
          x: 4,
          y: 12,
        },
        {
          x: 5,
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
      goal: 8,
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
          {
            kind: 'guard',
            every: 3,
            at: {
              x: 6,
              y: 8,
            },
            heading: 'right',
          },
          {
            kind: 'ricochet',
            every: 3,
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
