/** New encounters use existing v4 rules. Every specialist station is authored
 * explicitly; no old recipe or spawn policy is reinterpreted. */
const bi = (en, uk) => ({ en, uk });
const point = ([x, y]) => ({ x, y });
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
function ring(x, y, width, height) {
  const cells = [];
  for (let dx = 0; dx < width; dx++) cells.push({ x: x + dx, y });
  for (let dy = 1; dy < height; dy++) cells.push({ x: x + width - 1, y: y + dy });
  for (let dx = width - 2; dx >= 0; dx--) cells.push({ x: x + dx, y: y + height - 1 });
  for (let dy = height - 2; dy > 0; dy--) cells.push({ x, y: y + dy });
  return cells;
}
const prey = (kind, goals) => ({ kind, every: 3, ...(goals ? { goals: goals.map(point) } : {}) });
const route = (kind, bounds) => ({ kind, every: 4, path: ring(...bounds) });
const radio = (at, broadcast = false) => ({
  kind: 'jammer',
  every: 3,
  at: point(at),
  signalProfile: broadcast ? 'broadcast-burst-v1' : 'local-burst-v2',
});
const guard = (at, heading) => ({ kind: 'guard', every: 3, at: point(at), heading });
const lane = (at, axis, from, to) => ({
  kind: 'lane',
  every: 3,
  at: point(at),
  lane: { axis, from, to },
});
const relay = (at, pads) => ({ kind: 'relay', every: 3, at: point(at), relays: pads.map(point) });
const eroder = (at, wall) => ({ kind: 'eroder', every: 3, at: point(at), breaks: [point(wall)] });
const ricochet = (heading) => ({ kind: 'ricochet', every: 3, heading });
const bays = [
  [3, 4],
  [20, 4],
  [20, 13],
  [3, 13],
];
const outer = [1, 1, 22, 16];
const starts = {
  west: [
    [3, 9, 'right'],
    [20, 9, 'left'],
  ],
  east: [
    [20, 6, 'left'],
    [3, 12, 'right'],
  ],
  north: [
    [12, 3, 'down'],
    [11, 14, 'up'],
  ],
  south: [
    [8, 14, 'up'],
    [16, 3, 'down'],
  ],
  diagonal: [
    [4, 3, 'right'],
    [19, 14, 'left'],
  ],
};
export const CLASSIC_SNAKE_EXPEDITION_CHAPTERS = freeze(
  [
    [
      'crossing-routes',
      'Crossing Routes',
      'Маршрути перехоплення',
      'Choose an interception and leave another way home.',
      'Обирайте перехоплення й залишайте інший шлях назад.',
    ],
    [
      'changing-shortcuts',
      'Changing Shortcuts',
      'Мінливі короткі шляхи',
      'Shutters, supplies and opened walls change the useful route.',
      'Заслінки, припаси й відкриті стіни змінюють вигідний маршрут.',
    ],
    [
      'hidden-signals',
      'Hidden Signals',
      'Приховані сигнали',
      'Prey keeps moving while reception hides it. Read the warning and plan a return.',
      'Здобич рухається навіть тоді, коли перешкоди її приховують. Читайте попередження й плануйте повернення.',
    ],
    [
      'expedition-circuits',
      'Expedition Circuits',
      'Експедиційні кола',
      'Distinct outposts and moving encounters reward a different approach each time.',
      'Різні пости й рухливі цілі щоразу потребують іншого підходу.',
    ],
  ].map(([id, en, uk, descriptionEn, descriptionUk]) => ({
    id: `classic-snake-${id}`,
    title: bi(en, uk),
    description: bi(descriptionEn, descriptionUk),
  })),
);

const rows = [
  {
    slug: 'orchard-fork',
    title: bi('Orchard Fork', 'Розвилка саду'),
    start: 'west',
    goal: 4,
    walls: [
      [8, 5, 3, 3],
      [15, 10, 3, 3],
    ],
    targets: [
      route('patroller', [7, 4, 5, 5]),
      prey('runner'),
      route('patroller', [14, 9, 5, 5]),
      prey('runner'),
    ],
    description: bi(
      'Cut across one island circuit or intercept the runner. Leave the other side free for your return.',
      'Зрізайте коло одного острова або перехоплюйте бігуна. Залиште інший бік вільним для повернення.',
    ),
  },
  {
    slug: 'switchback-courts',
    title: bi('Switchback Courts', 'Двори зміни курсу'),
    start: 'north',
    goal: 6,
    walls: [
      [6, 5, 2, 6],
      [8, 9, 2, 2],
      [16, 7, 2, 6],
      [14, 7, 2, 2],
    ],
    targets: [prey('switchback', bays), prey('refuge', bays)],
    description: bi(
      'Read the announced bay before entering a court. The open middle offers a second interception.',
      'Читайте позначену ціль перед входом у двір. Відкритий центр дає інше перехоплення.',
    ),
  },
  {
    slug: 'opposite-platforms',
    title: bi('Opposite Platforms', 'Протилежні майданчики'),
    start: 'diagonal',
    goal: 6,
    walls: [
      [11, 5, 2, 8],
      [5, 8, 3, 2],
      [16, 8, 3, 2],
    ],
    targets: [
      prey('pair', [
        [4, 5],
        [19, 5],
        [4, 12],
        [19, 12],
      ]),
    ],
    description: bi(
      'Meet the partners at either end of the divider. After the first catch, plan for the survivor’s escape.',
      'Зустрічайте пару з будь-якого кінця перегородки. Після першого дотику плануйте втечу партнера.',
    ),
  },
  {
    slug: 'boundary-exchange',
    title: bi('Boundary Exchange', 'Обмін через край'),
    start: 'south',
    goal: 6,
    wrap: true,
    walls: [
      [10, 0, 2, 5],
      [14, 13, 2, 5],
    ],
    targets: [prey('runner'), route('perimeter', [2, 6, 7, 9])],
    description: bi(
      'Cross an edge to get ahead of the runner, or meet the short patrol circuit. Your cable also returns across the seam.',
      'Перетинайте край, щоб випередити бігуна, або зустрічайте короткий патруль. Кабель теж повертається через край.',
    ),
  },
  {
    slug: 'mirror-returns',
    title: bi('Mirror Returns', 'Дзеркальні повернення'),
    start: 'east',
    goal: 6,
    walls: [
      [7, 4, 2, 7],
      [14, 9, 5, 2],
      [15, 4, 2, 2],
    ],
    targets: [
      ricochet('down'),
      prey('switchback', bays),
      ricochet('left'),
      prey('switchback', bays),
    ],
    description: bi(
      'Predict the reflected return while another target announces its next corner. Choose the approach that leaves your tail room.',
      'Передбачайте відбиття, поки інша ціль показує наступний кут. Обирайте підхід із місцем для хвоста.',
    ),
  },
  {
    slug: 'inner-outer-transfer',
    title: bi('Inner–Outer Transfer', 'Між двома колами'),
    start: 'north',
    goal: 6,
    walls: [
      [7, 6, 3, 4],
      [15, 6, 3, 4],
    ],
    targets: [route('contour', [6, 5, 5, 6]), route('patroller', [14, 5, 5, 6])],
    gates: [[[12, 8]]],
    description: bi(
      'Two moving circuits share a timed crossing. Intercept the nearer target or take the always-open outside return.',
      'Два рухливі кола з’єднані тимчасовим переходом. Перехоплюйте ближчу ціль або користуйтеся постійним обходом.',
    ),
  },
  {
    slug: 'shutter-split',
    title: bi('Shutter Split', 'Розділена заслінка'),
    start: 'west',
    goal: 6,
    walls: [
      [11, 3, 1, 5],
      [11, 10, 1, 5],
    ],
    gates: [
      [
        [11, 8],
        [11, 9],
      ],
    ],
    targets: [prey('runner'), prey('sprinter')],
    description: bi(
      'Take the brief middle opening or begin the longer return before the sprinter accelerates.',
      'Користуйтеся коротким відкриттям у центрі або починайте обхід до прискорення спринтера.',
    ),
  },
  {
    slug: 'pulse-detour',
    title: bi('Pulse Detour', 'Обхід за імпульсом'),
    start: 'south',
    goal: 6,
    walls: [
      [6, 5, 3, 3],
      [14, 9, 3, 3],
      [18, 4, 2, 2],
    ],
    targets: [prey('refuge', bays), prey('sprinter')],
    powers: [
      [
        'pulse',
        2,
        [
          [3, 14],
          [20, 3],
        ],
      ],
    ],
    description: bi(
      'The Pulse supply is off the shortest route. Spend the detour to freeze an interception, or keep chasing.',
      'Імпульс лежить осторонь короткого шляху. Обходьте за ним, щоб зупинити цілі, або продовжуйте перехоплення.',
    ),
  },
  {
    slug: 'tail-workshop',
    title: bi('Tail Workshop', 'Майстерня хвоста'),
    start: 'diagonal',
    goal: 8,
    walls: [
      [8, 4, 2, 6],
      [14, 8, 2, 5],
      [11, 11, 1, 2],
    ],
    targets: [prey('brace'), prey('runner')],
    powers: [
      [
        'reel',
        3,
        [
          [4, 12],
          [19, 4],
        ],
      ],
    ],
    description: bi(
      'Keep both turning yards open as your cable grows. Reel makes the inner shortcut usable again; catch braced prey during rest.',
      'Зберігайте обидва двори для поворотів. Котушка звільнить короткий шлях; броньовану ціль ловіть під час відпочинку.',
    ),
  },
  {
    slug: 'courier-overpass',
    title: bi('Courier Overpass', 'Перехід кур’єра'),
    start: 'east',
    goal: 10,
    walls: [
      [8, 4, 3, 4],
      [14, 10, 3, 3],
    ],
    targets: [route('patroller', [7, 3, 5, 6]), prey('runner')],
    courier: outer,
    powers: [
      [
        'pulse',
        3,
        [
          [4, 4],
          [19, 13],
        ],
      ],
    ],
    description: bi(
      'Couriers cross the outer route after four and eight catches. Take their optional detour without closing your next return.',
      'Кур’єри виходять на зовнішнє коло після чотирьох і восьми цілей. Обирайте додатковий обхід, зберігаючи шлях назад.',
    ),
  },
  {
    slug: 'breaking-bridge',
    title: bi('Breaking Bridge', 'Відкритий міст'),
    start: 'west',
    goal: 4,
    walls: [
      [12, 4, 1, 10],
      [6, 5, 2, 2],
    ],
    targets: [
      eroder([11, 6], [12, 6]),
      prey('refuge', bays),
      eroder([13, 11], [12, 11]),
      ricochet('up'),
    ],
    description: bi(
      'Each eroder opens a different marked notch. Let the shortcut form before catching it, or keep the permanent long way around.',
      'Кожен руйнівник відкриває інший позначений прохід. Дайте йому відкритися або користуйтеся постійним довгим обходом.',
    ),
  },
  {
    slug: 'clockwork-intercepts',
    title: bi('Clockwork Intercepts', 'Перехоплення за годинником'),
    start: 'south',
    goal: 8,
    walls: [
      [11, 4, 1, 4],
      [11, 10, 1, 4],
      [4, 5, 2, 3],
    ],
    gates: [[[11, 8]], [[11, 9]]],
    targets: [prey('shield'), prey('refuge', bays), prey('sprinter')],
    powers: [
      [
        'pulse',
        2,
        [
          [3, 13],
          [20, 4],
        ],
      ],
      [
        'reel',
        5,
        [
          [4, 3],
          [19, 14],
        ],
      ],
    ],
    description: bi(
      'Read two alternating openings. Flank the shield through one yard, then preserve a different route for the growing cable.',
      'Читайте два почергові відкриття. Обходьте щит через один двір, а для кабелю залишайте інший маршрут.',
    ),
  },
  {
    slug: 'edge-of-reception',
    title: bi('Edge of Reception', 'Межа прийому'),
    start: 'west',
    goal: 6,
    walls: [
      [9, 5, 2, 5],
      [15, 11, 3, 2],
    ],
    targets: [
      radio([18, 6]),
      prey('runner'),
      radio([4, 12]),
      prey('refuge', bays),
      radio([18, 14]),
      prey('runner'),
    ],
    description: bi(
      'The runner keeps moving when interference hides it. Skirt the six-cell circle for a clear approach, or follow the antenna beacon to end the burst.',
      'Бігун рухається, навіть коли перешкоди його приховують. Обходьте коло шести клітин або прямуйте до маячка антени.',
    ),
  },
  {
    slug: 'blind-bend',
    title: bi('Blind Bend', 'Невидимий поворот'),
    start: 'north',
    goal: 4,
    walls: [
      [7, 5, 2, 7],
      [14, 8, 5, 2],
    ],
    targets: [radio([18, 5]), prey('switchback', bays), radio([4, 12]), prey('refuge', bays)],
    description: bi(
      'Read the prey’s next bay before the warning ends. It can turn unseen; the long clear flank is a different interception.',
      'Читайте наступну ціль до кінця попередження. Здобич може повернути непомітно; чистий обхід дає інше перехоплення.',
    ),
  },
  {
    slug: 'moving-shadow',
    title: bi('Moving Shadow', 'Рухлива тінь'),
    start: 'east',
    goal: 6,
    walls: [
      [8, 4, 3, 7],
      [15, 10, 4, 2],
    ],
    targets: [
      radio([18, 13], true),
      route('perimeter', outer),
      radio([5, 12], true),
      prey('runner'),
      radio([19, 4], true),
      route('contour', [7, 3, 5, 9]),
    ],
    description: bi(
      'Broadcast hides moving enemies across the board. Remember the patrol’s route, take its next cut, or catch the antenna at its beacon.',
      'Трансляція приховує рухливих ворогів на всьому полі. Запам’ятайте патруль, зрізайте маршрут або ловіть антену за маячком.',
    ),
  },
  {
    slug: 'quiet-relay',
    title: bi('Quiet Relay', 'Тихий ретранслятор'),
    start: 'diagonal',
    goal: 4,
    walls: [
      [7, 5, 3, 4],
      [15, 9, 3, 4],
    ],
    targets: [
      radio([20, 5], true),
      relay(
        [12, 9],
        [
          [3, 12],
          [20, 12],
        ],
      ),
      prey('runner'),
      prey('refuge', bays),
    ],
    description: bi(
      'Disable the beacon first, or reach the two marked relay pads through a broadcast burst. The opened core stays available.',
      'Спершу вимкніть маячок або дістаньтеся двох позначених ретрансляторів під час перешкод. Ядро залишиться відкритим.',
    ),
  },
  {
    slug: 'clear-ground',
    title: bi('Clear Ground', 'Чиста ділянка'),
    start: 'south',
    goal: 6,
    wrap: true,
    walls: [
      [11, 0, 2, 6],
      [11, 10, 2, 8],
    ],
    targets: [
      radio([4, 6]),
      prey('sprinter'),
      radio([19, 12]),
      prey('runner'),
      radio([18, 6]),
      prey('refuge', bays),
    ],
    powers: [
      [
        'pulse',
        2,
        [
          [3, 13],
          [20, 4],
        ],
      ],
    ],
    description: bi(
      'Coverage also wraps across an edge. Leave the circle to reveal moving prey, or use Pulse for a stable short approach.',
      'Зона перешкод теж переходить через край. Виходьте з кола, щоб побачити здобич, або використовуйте імпульс.',
    ),
  },
  {
    slug: 'radio-chase',
    title: bi('Radio Chase', 'Радіопереслідування'),
    start: 'west',
    goal: 8,
    walls: [
      [8, 4, 2, 7],
      [15, 9, 2, 5],
    ],
    targets: [
      radio([19, 5], true),
      prey('runner'),
      radio([3, 13], true),
      prey('switchback', bays),
      radio([18, 13], true),
      prey('refuge', bays),
      prey('runner'),
      prey('sprinter'),
    ],
    powers: [
      [
        'reel',
        4,
        [
          [4, 4],
          [20, 14],
        ],
      ],
    ],
    description: bi(
      'Three different beacons interrupt the chase. Remove a source, keep an interception, or shorten the cable before the next crossing.',
      'Три різні маячки переривають гонитву. Прибирайте джерело, продовжуйте перехоплення або вкорочуйте кабель перед переходом.',
    ),
  },
  {
    slug: 'outpost-circuit',
    title: bi('Outpost Circuit', 'Коло застав'),
    start: 'north',
    goal: 6,
    walls: [
      [6, 5, 3, 3],
      [15, 5, 3, 3],
      [10, 10, 3, 3],
    ],
    targets: [
      guard([4, 6], 'right'),
      prey('runner'),
      guard([19, 11], 'up'),
      prey('refuge', bays),
      guard([6, 13], 'up'),
      guard([18, 3], 'down'),
    ],
    description: bi(
      'Every outpost faces a different approach. Cross behind a departing shot and keep a route toward the moving prey.',
      'Кожна застава має інший напрямок вогню. Проходьте за снарядом і залишайте маршрут до рухливої здобичі.',
    ),
  },
  {
    slug: 'crosswind-gates',
    title: bi('Crosswind Gates', 'Поперечні переходи'),
    start: 'diagonal',
    goal: 6,
    walls: [
      [7, 4, 2, 3],
      [15, 10, 2, 3],
    ],
    targets: [
      lane([4, 8], 'x', 4, 19),
      prey('runner'),
      lane([12, 4], 'y', 4, 13),
      prey('switchback', bays),
      lane([17, 11], 'y', 4, 13),
      prey('refuge', bays),
    ],
    description: bi(
      'Horizontal and vertical lanes change the useful crossing. Follow their warnings or choose an end bypass; only the head is vulnerable.',
      'Горизонтальні й вертикальні смуги змінюють вигідний перехід. Читайте попередження або обходьте кінці; небезпека лише для голови.',
    ),
  },
  {
    slug: 'relay-islands',
    title: bi('Relay Islands', 'Острови ретрансляторів'),
    start: 'east',
    goal: 6,
    walls: [
      [7, 5, 3, 4],
      [14, 10, 3, 3],
      [13, 4, 3, 2],
    ],
    gates: [[[12, 8]]],
    targets: [
      relay(
        [12, 9],
        [
          [3, 4],
          [20, 12],
        ],
      ),
      prey('refuge', bays),
      relay(
        [5, 12],
        [
          [12, 3],
          [20, 4],
        ],
      ),
      prey('switchback', bays),
      prey('runner'),
      prey('sprinter'),
    ],
    description: bi(
      'Two cores have different relay pairs. Pick the next pad route before your cable fills the shorter return.',
      'Два ядра мають різні пари ретрансляторів. Обирайте наступний шлях до того, як кабель займе короткий обхід.',
    ),
  },
  {
    slug: 'waking-junction',
    title: bi('Waking Junction', 'Живе перехрестя'),
    start: 'south',
    goal: 6,
    walls: [
      [5, 5, 2, 6],
      [11, 7, 3, 3],
      [16, 10, 3, 2],
    ],
    targets: [
      prey('rover'),
      prey('shield'),
      route('contour', [10, 6, 5, 5]),
      prey('runner'),
      prey('rover'),
      prey('refuge', bays),
    ],
    powers: [
      [
        'pulse',
        3,
        [
          [3, 4],
          [20, 13],
        ],
      ],
    ],
    description: bi(
      'Wake the rover from the route you want it to take. Then choose a shield flank or the next contour interception.',
      'Будіть ровер із потрібного напрямку. Потім обирайте обхід щита або наступне перехоплення на контурі.',
    ),
  },
  {
    slug: 'signal-workshop',
    title: bi('Signal Workshop', 'Майстерня сигналу'),
    start: 'west',
    goal: 6,
    walls: [
      [12, 4, 1, 4],
      [12, 10, 1, 4],
      [7, 12, 2, 2],
    ],
    targets: [
      eroder([11, 5], [12, 5]),
      radio([20, 12]),
      prey('runner'),
      guard([6, 5], 'down'),
      eroder([13, 12], [12, 12]),
      prey('refuge', bays),
    ],
    powers: [
      [
        'reel',
        3,
        [
          [4, 4],
          [19, 14],
        ],
      ],
    ],
    description: bi(
      'Open a new route, restore reception at the beacon, or catch prey before it crosses the workshop. Each specialist appears at a different post.',
      'Відкривайте шлях, відновлюйте прийом біля маячка або перехоплюйте здобич у майстерні. Кожен спеціаліст має окремий пост.',
    ),
  },
  {
    slug: 'four-routes-home',
    title: bi('Four Routes Home', 'Чотири шляхи додому'),
    start: 'north',
    goal: 8,
    walls: [
      [7, 5, 2, 3],
      [15, 5, 2, 3],
      [7, 11, 2, 3],
      [15, 11, 2, 3],
    ],
    gates: [[[12, 6]], [[12, 11]]],
    targets: [
      radio([20, 8], true),
      prey('runner'),
      relay(
        [18, 10],
        [
          [4, 5],
          [20, 13],
        ],
      ),
      lane([12, 8], 'x', 4, 19),
      prey('refuge', bays),
      guard([5, 12], 'up'),
      prey('switchback', bays),
      ricochet('left'),
    ],
    powers: [
      [
        'pulse',
        2,
        [
          [3, 13],
          [20, 4],
        ],
      ],
      [
        'reel',
        5,
        [
          [4, 4],
          [19, 14],
        ],
      ],
    ],
    description: bi(
      'Eight different encounters change the best way home. Keep an outside return while the shutters, broadcast and relay reward shorter routes.',
      'Вісім різних зустрічей змінюють шлях додому. Зберігайте зовнішній обхід, поки заслінки, перешкоди й ретранслятор відкривають коротші маршрути.',
    ),
  },
];

export const CLASSIC_SNAKE_EXPEDITION_LEVELS = freeze(
  rows.map((row, index) => {
    const id = `classic-expedition-${row.slug}`;
    const walls = new Map();
    for (const [x, y, width, height] of row.walls)
      for (let dy = 0; dy < height; dy++)
        for (let dx = 0; dx < width; dx++)
          walls.set(`${x + dx},${y + dy}`, { x: x + dx, y: y + dy });
    return {
      id,
      chapterId: CLASSIC_SNAKE_EXPEDITION_CHAPTERS[Math.floor(index / 6)].id,
      title: row.title,
      description: row.description,
      level: {
        version: 'classic-snake-level.v4',
        id,
        revision: '1',
        name: row.title.en,
        width: 24,
        height: 18,
        walls: [...walls.values()].sort((a, b) => a.y - b.y || a.x - b.x),
        spawns: starts[row.start].map(([x, y, direction]) => ({ x, y, direction })),
        goal: row.goal,
        stepMs: 200,
        speedupEvery: 0,
        minStepMs: 200,
        wrap: !!row.wrap,
        targetMovement: 'still',
        fleeEvery: 3,
        objective: 'mission',
        targets: {
          maxActive: 2,
          required: row.targets,
          bonus: row.courier ? { at: [4, 8], policy: route('courier', row.courier) } : null,
        },
        shutters: (row.gates ?? []).map((cells, i) => ({
          id: `shutter-${i + 1}`,
          cells: cells.map(point),
          phase: i * 24,
        })),
        pickups: (row.powers ?? []).map(([kind, at, pads]) => ({
          kind,
          at,
          pads: pads.map(point),
        })),
      },
    };
  }),
);
