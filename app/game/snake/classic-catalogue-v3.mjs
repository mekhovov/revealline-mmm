/** Original authored living-prey layouts. Historical v1/v2 geometry is untouched. */
const bilingual = (en, uk) => ({ en, uk });
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const CLASSIC_SNAKE_V3_CHAPTERS = freeze([
  {
    id: 'classic-snake-twin-intercepts',
    title: bilingual('Twin Intercepts', 'Подвійні перехоплення'),
    description: bilingual(
      'Read refuge goals, announced turns and rendezvous pairs. Ordinary prey is always safe to catch.',
      'Читайте цілі укриття, оголошені повороти й зустрічі пар. Звичайну здобич завжди безпечно ловити.',
    ),
  },
  {
    id: 'classic-snake-moving-windows',
    title: bilingual('Moving Windows', 'Рухливі вікна'),
    description: bilingual(
      'Specialist challenges: shields block the front, braced targets open during rest. Read the danger marker before contact.',
      'Випробування зі спеціалістами: щити закривають перед, броня відкривається під час відпочинку. Читайте знак небезпеки перед дотиком.',
    ),
  },
]);
const rows = [
  {
    slug: 'refuge-bays',
    en: 'Refuge Bays',
    uk: 'Затишні кишені',
    enBrief:
      'The refuge seeker announces its next bay. Cut across the open middle instead of following it.',
    ukBrief:
      'Шукач укриття показує наступну кишеню. Зрізайте через відкритий центр, замість бігти слідом.',
    walls: [
      [7, 5, 3, 3],
      [15, 10, 3, 3],
    ],
    kinds: ['refuge'],
    goal: 8,
    goals: [
      [3, 4],
      [20, 13],
      [20, 4],
      [3, 13],
    ],
  },
  {
    slug: 'switchback-yard',
    en: 'Switchback Yard',
    uk: 'Двір зміни курсу',
    enBrief:
      'The scarf runner signals its next exit before committing. Intercept from the opposite return.',
    ukBrief:
      'Бігун із шарфом показує наступний вихід перед рухом. Перехоплюйте з протилежного обходу.',
    walls: [
      [7, 4, 2, 5],
      [15, 9, 2, 5],
      [11, 7, 2, 3],
    ],
    kinds: ['switchback'],
    goal: 10,
    goals: [
      [3, 8],
      [12, 3],
      [20, 8],
      [12, 14],
    ],
  },
  {
    slug: 'rendezvous-crossing',
    en: 'Rendezvous Crossing',
    uk: 'Перехрестя зустрічі',
    enBrief:
      'Two partners seek one meeting place. Each catch counts once; the survivor becomes a runner.',
    ukBrief:
      'Двоє партнерів шукають місце зустрічі. Кожен дотик рахується один раз; уцілілий стає бігуном.',
    walls: [
      [7, 5, 3, 3],
      [14, 5, 3, 3],
      [7, 11, 3, 2],
      [14, 11, 3, 2],
    ],
    kinds: ['pair'],
    two: true,
    goal: 10,
    goals: [
      [3, 9],
      [20, 9],
      [12, 4],
      [12, 14],
    ],
  },
  {
    slug: 'cable-cutoff',
    en: 'Cable Cutoff',
    uk: 'Кабельний заслін',
    enBrief:
      'Two offset passages turn your cable into a temporary barrier. Leave a return lane before herding the prey.',
    ukBrief:
      'Два зміщені проходи перетворюють кабель на тимчасову перешкоду. Залиште шлях повернення перед загоном цілі.',
    walls: [
      [6, 4, 2, 7],
      [16, 7, 2, 7],
      [10, 9, 4, 2],
    ],
    kinds: ['refuge', 'switchback'],
    two: true,
    goal: 12,
    goals: [
      [3, 5],
      [12, 4],
      [20, 12],
      [12, 14],
    ],
  },
  {
    slug: 'return-pincer',
    en: 'Return Pincer',
    uk: 'Обхідні лещата',
    enBrief:
      'Pair goals alternate across the long divider. In Team, use separate returns and keep both cables clear.',
    ukBrief:
      'Цілі пари чергуються по боках довгої перегородки. У команді використовуйте різні обходи й бережіть обидва кабелі.',
    walls: [
      [11, 4, 2, 10],
      [5, 8, 3, 2],
      [16, 8, 3, 2],
    ],
    kinds: ['pair'],
    two: true,
    goal: 12,
    goals: [
      [3, 8],
      [20, 8],
      [8, 14],
      [15, 3],
    ],
  },
  {
    slug: 'twin-intercepts',
    en: 'Twin Intercepts',
    uk: 'Подвійні перехоплення',
    enBrief:
      'Refuge seekers, runners and switchbacks share three courtyards. Choose a different approach for each intention.',
    ukBrief:
      'Шукачі укриття, бігуни й майстри зміни курсу ділять три двори. Обирайте підхід за наміром кожного.',
    walls: [
      [6, 4, 2, 5],
      [6, 12, 2, 2],
      [15, 4, 2, 2],
      [15, 9, 2, 5],
      [10, 7, 3, 2],
    ],
    kinds: ['refuge', 'runner', 'switchback'],
    two: true,
    goal: 14,
    goals: [
      [3, 4],
      [3, 13],
      [12, 4],
      [12, 13],
      [20, 4],
      [20, 13],
    ],
  },
  {
    slug: 'shield-window',
    en: 'Shield Window',
    uk: 'Вікно щита',
    enBrief:
      'Specialist: the marked shield front is fatal. Catch from the side or rear; a warned turn keeps its old facing until complete.',
    ukBrief:
      'Спеціаліст: позначений перед щита смертельний. Ловіть збоку чи ззаду; під час попередження щит зберігає старий напрямок.',
    walls: [
      [7, 6, 3, 5],
      [15, 6, 3, 5],
    ],
    kinds: ['shield'],
    goal: 8,
  },
  {
    slug: 'brace-break',
    en: 'Brace Break',
    uk: 'Пауза броні',
    enBrief:
      'Specialist: warning and burst are protected. Catch during the long recovery, when the armor visibly opens.',
    ukBrief:
      'Спеціаліст: попередження й ривок захищені. Ловіть під час довгого відпочинку, коли броня видимо відкривається.',
    walls: [
      [5, 5, 14, 2],
      [5, 11, 8, 2],
      [16, 11, 3, 2],
    ],
    kinds: ['brace'],
    goal: 10,
  },
  {
    slug: 'shutter-flank',
    en: 'Shutter Flank',
    uk: 'Фланг заслінки',
    enBrief:
      'The center shortcut opens beside the shield. Take the permanent outer return when either danger blocks the approach.',
    ukBrief:
      'Центральний зріз відкривається біля щита. Обирайте постійний зовнішній обхід, коли підхід небезпечний.',
    walls: [
      [11, 4, 2, 4],
      [11, 10, 2, 4],
      [5, 8, 2, 2],
      [17, 8, 2, 2],
    ],
    kinds: ['shield', 'runner'],
    two: true,
    goal: 12,
    gates: [
      [
        [11, 8],
        [12, 8],
        [11, 9],
        [12, 9],
      ],
    ],
  },
  {
    slug: 'frozen-opening',
    en: 'Frozen Opening',
    uk: 'Завмерле вікно',
    enBrief:
      'Pulse freezes the current armor state, not just movement. Collect it during recovery to extend the safe catch window.',
    ukBrief:
      'Імпульс зупиняє поточний стан броні, а не лише рух. Візьміть його під час відпочинку, щоб подовжити безпечне вікно.',
    walls: [
      [6, 5, 4, 3],
      [14, 10, 4, 3],
      [11, 6, 2, 2],
    ],
    kinds: ['brace', 'switchback'],
    two: true,
    goal: 12,
    supplies: ['pulse'],
    goals: [
      [3, 4],
      [20, 4],
      [20, 13],
      [3, 13],
    ],
  },
  {
    slug: 'supply-flanks',
    en: 'Supply Flanks',
    uk: 'Припаси на флангах',
    enBrief:
      'Refuge goals and shield flanks compete with supply detours. Reel frees space, but cannot undo a collision.',
    ukBrief:
      'Цілі укриття й фланги щита змагаються з обходами за припасами. Котушка звільняє місце, але не скасовує зіткнення.',
    walls: [
      [5, 6, 5, 2],
      [14, 6, 5, 2],
      [9, 11, 6, 2],
    ],
    kinds: ['shield', 'refuge', 'sprinter'],
    two: true,
    goal: 14,
    supplies: ['pulse', 'reel'],
    goals: [
      [3, 4],
      [20, 4],
      [20, 13],
      [3, 13],
    ],
  },
  {
    slug: 'living-airfield',
    en: 'Living Airfield',
    uk: 'Живий аеродром',
    enBrief:
      'Two timed crossings link specialist and ordinary prey. Read each silhouette, choose a safe return, then commit.',
    ukBrief:
      'Два тимчасові переходи поєднують спеціалістів і звичайну здобич. Читайте силуети, обирайте безпечний обхід і дійте.',
    walls: [
      [7, 4, 2, 3],
      [7, 10, 2, 4],
      [15, 4, 2, 6],
      [15, 13, 2, 1],
      [11, 7, 2, 3],
    ],
    kinds: ['refuge', 'shield', 'switchback', 'brace'],
    two: true,
    goal: 16,
    supplies: ['pulse', 'reel'],
    goals: [
      [3, 4],
      [20, 4],
      [20, 13],
      [3, 13],
      [12, 4],
      [12, 13],
    ],
    gates: [
      [
        [7, 7],
        [8, 7],
        [7, 8],
        [8, 8],
        [7, 9],
        [8, 9],
      ],
      [
        [15, 10],
        [16, 10],
        [15, 11],
        [16, 11],
        [15, 12],
        [16, 12],
      ],
    ],
  },
];
function wallsFor(rectangles) {
  const cells = new Map();
  for (const [x, y, width, height] of rectangles)
    for (let row = y; row < y + height; row++)
      for (let column = x; column < x + width; column++)
        cells.set(`${column},${row}`, { x: column, y: row });
  return [...cells.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}
const pads = [
  [3, 4],
  [20, 13],
  [3, 13],
  [20, 4],
].map(([x, y]) => ({ x, y }));
export const CLASSIC_SNAKE_V3_LEVELS = freeze(
  rows.map((row, index) => {
    const id = `classic-living-${row.slug}`;
    return {
      id,
      chapterId: CLASSIC_SNAKE_V3_CHAPTERS[Math.floor(index / 6)].id,
      title: bilingual(row.en, row.uk),
      description: bilingual(row.enBrief, row.ukBrief),
      level: {
        version: 'classic-snake-level.v3',
        id,
        revision: '2',
        name: row.en,
        width: 24,
        height: 18,
        walls: wallsFor(row.walls),
        spawns: [
          { x: 5, y: 2, direction: 'right' },
          { x: 18, y: 15, direction: 'left' },
        ],
        goal: [4, 5, 6, 6, 6, 9, 4, 5, 6, 6, 9, 12][index],
        stepMs: 200,
        speedupEvery: 0,
        minStepMs: 200,
        wrap: false,
        targetMovement: 'still',
        fleeEvery: 3,
        objective: 'mission',
        targets: {
          maxActive: row.two ? 2 : 1,
          required: row.kinds.map((kind) => ({
            kind,
            every: 3,
            ...(['refuge', 'switchback', 'pair'].includes(kind)
              ? { goals: row.goals.map(([x, y]) => ({ x, y })) }
              : {}),
          })),
          bonus: null,
        },
        shutters: (row.gates ?? []).map((cells, i) => ({
          id: `shutter-${i + 1}`,
          cells: cells.map(([x, y]) => ({ x, y })),
          phase: i * 24,
        })),
        pickups: (row.supplies ?? []).map((kind, i) => ({ at: 2 + i * 4, kind, pads })),
      },
    };
  }),
);
