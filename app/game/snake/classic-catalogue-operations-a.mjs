import {
  bi,
  at,
  stage,
  activate,
  parcel,
  dock,
  plate,
  prey,
  lane,
  guard,
  junction,
  patrol,
  freeze,
  operationMission,
} from './classic-operation-recipes.mjs';

// Authored Release A; each recipe has accepted Solo/Team proofs at all supported paces.
const chapters = [
  [
    'switchyard-pursuit',
    'Switchyard Pursuit',
    'Переслідування на розвилках',
    'Route a patrol, then choose where to intercept it.',
    'Спрямуйте патруль, а тоді оберіть місце перехоплення.',
    'freight',
    'dispatch-platforms',
    'tracks',
  ],
  [
    'cable-foundry',
    'Cable Foundry',
    'Кабельна ливарня',
    'Use the cable you leave behind to hold a route open.',
    'Утримуйте шлях відкритим за допомогою залишеного кабелю.',
    'workshop',
    'cable-assembly',
    'bays',
  ],
  [
    'loaded-routes',
    'Loaded Routes',
    'Вантажні маршрути',
    'Choose when to load, when to unload and where to turn.',
    'Обирайте, коли завантажитися, розвантажитися та повернути.',
    'orchard',
    'glasshouse-deliveries',
    'rows',
  ],
  [
    'split-horizons',
    'Split Horizons',
    'Розділені горизонти',
    'Use wrapping edges and staged rendezvous to change your approach.',
    'Змінюйте підхід через краї поля та поетапні місця зустрічі.',
    'harbor',
    'tidal-rendezvous',
    'quays',
  ],
  [
    'crossfire-works',
    'Crossfire Works',
    'Цех перехресного вогню',
    'Finish each clearance while keeping warned attack lanes readable.',
    'Виконуйте кожен етап, стежачи за попередженнями на смугах атаки.',
    'workshop',
    'furnace-courts',
    'court',
  ],
  [
    'extraction-circuit',
    'Extraction Circuit',
    'Коло евакуації',
    'Link delivery, pursuit and a safe final approach.',
    'Поєднуйте доставку, переслідування та безпечний фінальний підхід.',
    'harbor',
    'pump-station-circuit',
    'quays',
  ],
];
export const CLASSIC_SNAKE_OPERATION_CHAPTERS_A = freeze(
  chapters.map(([slug, en, uk, de, du, scene, mood, zoning]) => ({
    id: `classic-snake-${slug}`,
    title: bi(en, uk),
    description: bi(de, du),
    composition: { scene, mood, zoning },
  })),
);
const rows = [];
function add(chapter, slug, en, uk, de, du, config) {
  const world = CLASSIC_SNAKE_OPERATION_CHAPTERS_A.find(
    (c) => c.id === `classic-snake-${chapter}`,
  ).composition;
  rows.push(
    operationMission(chapter, {
      slug,
      title: bi(en, uk),
      description: bi(de, du),
      ...config,
      composition: {
        version: 1,
        ...world,
        landmark: slug,
        ambient:
          world.scene === 'harbor'
            ? 'dock-lights'
            : world.scene === 'orchard'
              ? 'irrigation'
              : 'equipment-lights',
      },
    }),
  );
}
const switchGoal = (id, count = 1) => activate('switchyard', id, count);
const plateGoal = (id, count = 1) => activate('plate', id, count);
const bays = [
  [3, 4],
  [20, 4],
  [20, 13],
  [3, 13],
];

// Switchyard Pursuit: next-departure choice -> asymmetric loops -> interception windows -> dual dispatch.
{
  const g = junction('dispatch', 0, 12, 8, [
    [6, 8],
    [19, 6],
  ]);
  add(
    'switchyard-pursuit',
    'first-dispatch',
    'First Dispatch',
    'Перший маршрут',
    'Touch a lever. Its number selects the patrol’s next departure at the diamond. Cut across the selected loop to intercept.',
    'Торкніться важеля. Його номер обирає наступну гілку патруля на ромбі. Зріжте обране коло для перехоплення.',
    {
      walls: [
        [9, 5, 2, 2],
        [14, 10, 2, 2],
      ],
      targets: [patrol(g)],
      switchyards: [g],
      stages: [stage('dispatch', 2, at(20, 12), [], [switchGoal(g.id)])],
    },
  );
}
{
  const g = junction('long-short', 0, 11, 8, [[6, 9]], 6, 2, 2, 5);
  add(
    'switchyard-pursuit',
    'long-and-short',
    'Long and Short',
    'Довге й коротке',
    'A wide upper loop and a tall lower loop meet at one junction. Choose the departure that leaves room for your return.',
    'Широке верхнє й високе нижнє кола сходяться на розвилці. Оберіть гілку, що залишає місце для повернення.',
    {
      walls: [
        [6, 7, 4, 1],
        [12, 10, 1, 2],
        [17, 6, 2, 4],
      ],
      targets: [patrol(g)],
      switchyards: [g],
      stages: [
        stage('outbound', 1, at(18, 4), [], [switchGoal(g.id)]),
        stage('return', 3, at(4, 13)),
      ],
    },
  );
}
{
  const g = junction(
    'platform',
    0,
    12,
    9,
    [
      [3, 9],
      [21, 8],
    ],
    5,
    4,
    5,
    3,
  );
  add(
    'switchyard-pursuit',
    'platform-cut',
    'Platform Cut',
    'Зріз платформи',
    'The patrol takes the platform edge. Cross the clear centre before its next lap instead of following its tail.',
    'Патруль іде краєм платформи. Перетніть вільний центр до наступного кола, замість іти слідом.',
    {
      walls: [
        [8, 6, 3, 2],
        [14, 10, 3, 1],
        [4, 6, 1, 3],
      ],
      targets: [patrol(g)],
      switchyards: [g],
      stages: [stage('cut', 3, at(18, 14), [], [switchGoal(g.id)])],
    },
  );
}
{
  const g = junction('rendezvous', 0, 12, 8, [[5, 10]], 4, 3, 5, 4);
  add(
    'switchyard-pursuit',
    'courier-gap',
    'Courier Gap',
    'Проміжок кур’єра',
    'Redirect the patrol while a runner changes the useful interception. Clear both before crossing the upper rendezvous.',
    'Спрямуйте патруль, поки бігун змінює вигідне місце перехоплення. Спіймайте обох до верхньої точки зустрічі.',
    {
      walls: [
        [9, 6, 2, 1],
        [14, 10, 2, 1],
        [19, 5, 1, 3],
      ],
      targets: [patrol(g), prey('runner', 3)],
      active: 2,
      switchyards: [g],
      stages: [stage('rendezvous', 4, at(13, 3), [], [switchGoal(g.id)])],
    },
  );
}
{
  const west = junction('west', 0, 8, 8, [[3, 8]], 3, 3),
    east = junction('east', 1, 17, 8, [[21, 8]], 3, 3);
  add(
    'switchyard-pursuit',
    'twin-dispatch',
    'Twin Dispatch',
    'Подвійне керування',
    'Each lever owns a different junction. Redirect both patrols, then reserve one crossing for the growing cable.',
    'Кожен важіль керує окремою розвилкою. Спрямуйте обидва патрулі та залиште один перехід для кабелю.',
    {
      walls: [
        [6, 6, 1, 1],
        [10, 10, 1, 1],
        [15, 6, 1, 1],
        [19, 10, 1, 1],
      ],
      targets: [patrol(west), patrol(east)],
      active: 2,
      switchyards: [west, east],
      stages: [
        stage('dispatch', 1, null, [], [switchGoal('west'), switchGoal('east')]),
        stage('intercept', 4, at(12, 14)),
      ],
    },
  );
}
{
  const g = junction(
    'edge',
    0,
    12,
    8,
    [
      [2, 8],
      [21, 8],
    ],
    5,
    4,
    5,
    4,
  );
  add(
    'switchyard-pursuit',
    'edge-express',
    'Edge Express',
    'Крайовий експрес',
    'Wrap from the distant lever to the opposite approach. The patrol stays on its marked track; only your approach uses the edge.',
    'Перейдіть через край від дальнього важеля на протилежний підхід. Патруль залишається на колії; край змінює лише ваш маршрут.',
    {
      wrap: true,
      walls: [
        [8, 5, 2, 2],
        [14, 10, 2, 2],
        [4, 10, 1, 4],
      ],
      targets: [patrol(g)],
      switchyards: [g],
      stages: [stage('east', 1, at(22, 4), [], [switchGoal('edge')]), stage('west', 3, at(1, 13))],
    },
  );
}
{
  const g = junction('window', 0, 12, 8, [[5, 8]], 4, 4);
  add(
    'switchyard-pursuit',
    'shutter-transfer',
    'Shutter Transfer',
    'Перехід крізь заслінку',
    'Route the patrol before entering the shutter court. A broad outer bypass remains available when the centre closes.',
    'Спрямуйте патруль перед входом у двір заслінок. Коли центр закриється, залишається широкий зовнішній обхід.',
    {
      walls: [
        [9, 5, 2, 2],
        [14, 10, 2, 2],
        [18, 5, 1, 2],
        [18, 10, 1, 3],
      ],
      shutters: [{ id: 'loading-door', cells: [at(18, 7), at(18, 8), at(18, 9)], phase: 0 }],
      targets: [patrol(g)],
      switchyards: [g],
      stages: [stage('transfer', 3, at(21, 8), [], [switchGoal('window')])],
    },
  );
}
{
  const g = junction(
    'return',
    0,
    11,
    8,
    [
      [4, 8],
      [20, 8],
    ],
    4,
    4,
    5,
    3,
  );
  add(
    'switchyard-pursuit',
    'last-departure',
    'Last Departure',
    'Останнє відправлення',
    'Complete an upper interception, then change the dispatch again for the lower return. The second stage uses the same longer cable.',
    'Завершіть верхнє перехоплення, а тоді знову змініть гілку для нижнього повернення. Другий етап проходьте з тим самим довшим кабелем.',
    {
      walls: [
        [8, 5, 2, 2],
        [13, 9, 2, 1],
        [18, 11, 2, 2],
      ],
      targets: [patrol(g), prey('sprinter', 3)],
      active: 2,
      switchyards: [g],
      stages: [
        stage('departure', 2, at(18, 3), [], [switchGoal('return')]),
        stage('homeward', 5, at(4, 14), [], [switchGoal('return', 2)]),
      ],
    },
  );
}

// Cable Foundry: learn occupancy, then choose between short gates and always-open bypasses.
add(
  'cable-foundry',
  'first-pressure',
  'First Pressure',
  'Перша плита',
  'Hold the striped pad with your cable and cross the shortcut. The outer route stays open, and an occupied gate yields.',
  'Утримуйте смугасту плиту кабелем і перетніть короткий шлях. Зовнішній обхід відкритий завжди, а зайняті ворота не зачиняються.',
  {
    walls: [
      [10, 4, 1, 4],
      [10, 9, 1, 5],
    ],
    plates: [plate('copper', [[7, 8]], [[10, 8]])],
    stages: [
      stage('cross', 0, at(14, 8), [], [plateGoal('copper')]),
      stage('return', 1, at(4, 12)),
    ],
  },
);
add(
  'cable-foundry',
  'near-and-far',
  'Near and Far',
  'Близько й далеко',
  'Two pads control one gate. Decide whether to hold it on approach or use the far pad for a quick return.',
  'Дві плити керують одними воротами. Утримуйте їх на підході або використайте дальню плиту для швидкого повернення.',
  {
    walls: [
      [12, 4, 1, 4],
      [12, 10, 1, 4],
    ],
    plates: [
      plate(
        'shared',
        [
          [8, 8],
          [16, 9],
        ],
        [
          [12, 8],
          [12, 9],
        ],
      ),
    ],
    stages: [stage('far', 1, at(20, 9), [], [plateGoal('shared')]), stage('near', 3, at(3, 9))],
  },
);
add(
  'cable-foundry',
  'pressure-elbow',
  'Pressure Elbow',
  'Поворот під тиском',
  'The pad sits before an elbow. Leave a cable segment on it while turning toward the gate; circling outside is safer when long.',
  'Плита стоїть перед поворотом. Залиште на ній ланку кабелю, повертаючи до воріт; із довгим хвостом безпечніше обійти зовні.',
  {
    walls: [
      [9, 5, 5, 1],
      [13, 6, 1, 4],
      [13, 11, 1, 3],
    ],
    plates: [plate('elbow', [[9, 9]], [[13, 10]])],
    stages: [stage('elbow', 2, at(18, 7), [], [plateGoal('elbow')]), stage('clear', 3, at(5, 13))],
  },
);
add(
  'cable-foundry',
  'double-pressure',
  'Double Pressure',
  'Подвійний тиск',
  'Open two independent shortcuts. Their pads share no timer; choose which side to secure before crossing the central court.',
  'Відкрийте два незалежні проходи. Плити мають окремі таймери; оберіть, який бік підготувати перед переходом через центр.',
  {
    walls: [
      [8, 5, 1, 3],
      [8, 9, 1, 4],
      [16, 4, 1, 4],
      [16, 10, 1, 3],
    ],
    plates: [
      plate('west', [[5, 8]], [[8, 8]]),
      plate(
        'east',
        [[12, 9]],
        [
          [16, 8],
          [16, 9],
        ],
      ),
    ],
    stages: [
      stage('doors', 1, at(20, 8), [], [plateGoal('west'), plateGoal('east')]),
      stage('return', 3, at(3, 12)),
    ],
  },
);
add(
  'cable-foundry',
  'heavy-crossing',
  'Heavy Crossing',
  'Важкий перехід',
  'Collect both parcels before unloading beyond the gate. Added length can hold the plate longer, but narrows your turn.',
  'Зберіть обидві посилки перед розвантаженням за воротами. Довший кабель довше тримає плиту, але звужує поворот.',
  {
    walls: [
      [13, 4, 2, 3],
      [13, 10, 2, 4],
    ],
    plates: [
      plate(
        'load',
        [[10, 8]],
        [
          [13, 7],
          [14, 7],
          [13, 8],
          [14, 8],
          [13, 9],
          [14, 9],
        ],
      ),
    ],
    parcels: [parcel('one', 8, 3), parcel('two', 8, 12)],
    docks: [dock('a', 19, 8)],
    stages: [
      stage('delivery', 0, null, ['one', 'two'], [plateGoal('load')]),
      stage('light-return', 1, at(5, 13)),
    ],
  },
);
add(
  'cable-foundry',
  'runner-valve',
  'Runner Valve',
  'Клапан бігуна',
  'A runner chooses its own escape while you manage the pressure door. Open space outside the machine gives a second interception.',
  'Бігун сам обирає втечу, поки ви керуєте дверима. Відкритий простір навколо машини дає інше перехоплення.',
  {
    walls: [
      [10, 5, 2, 3],
      [10, 10, 2, 3],
      [16, 6, 3, 2],
    ],
    plates: [
      plate(
        'valve',
        [
          [7, 9],
          [15, 9],
        ],
        [
          [10, 8],
          [11, 8],
          [10, 9],
          [11, 9],
        ],
      ),
    ],
    targets: [prey('switchback', 3, bays)],
    stages: [stage('pursuit', 4, at(20, 13), [], [plateGoal('valve')])],
  },
);
add(
  'cable-foundry',
  'edge-pressure',
  'Edge Pressure',
  'Крайова плита',
  'The closed gate is not your only crossing. Wrap around the board to reach the far pad and reopen the direct route.',
  'Закриті ворота — не єдиний перехід. Перейдіть через край до дальньої плити й відкрийте прямий шлях.',
  {
    wrap: true,
    walls: [
      [11, 3, 2, 5],
      [11, 10, 2, 5],
    ],
    plates: [
      plate(
        'edge',
        [
          [7, 8],
          [17, 9],
        ],
        [
          [11, 8],
          [12, 8],
          [11, 9],
          [12, 9],
        ],
      ),
    ],
    stages: [stage('cross', 1, at(21, 4), [], [plateGoal('edge')]), stage('back', 3, at(2, 13))],
  },
);
add(
  'cable-foundry',
  'assembly-return',
  'Assembly Return',
  'Повернення зі складання',
  'Deliver to opposite sides of two gates, then regroup in the centre. In Team, either cable can hold a pad for the other pilot.',
  'Доставте вантаж по різні боки двох воріт і зберіться в центрі. У команді будь-який кабель може втримати плиту для напарника.',
  {
    walls: [
      [8, 4, 1, 4],
      [8, 10, 1, 3],
      [16, 4, 1, 3],
      [16, 9, 1, 5],
    ],
    plates: [
      plate(
        'left',
        [[5, 9]],
        [
          [8, 8],
          [8, 9],
        ],
      ),
      plate(
        'right',
        [[19, 8]],
        [
          [16, 7],
          [16, 8],
        ],
      ),
    ],
    parcels: [parcel('left-load', 5, 5, 'b'), parcel('right-load', 19, 12, 'a')],
    docks: [dock('a', 4, 12), dock('b', 20, 5)],
    stages: [
      stage(
        'assembly',
        2,
        null,
        ['left-load', 'right-load'],
        [plateGoal('left'), plateGoal('right')],
      ),
      stage('home', 4, at(12, 9)),
    ],
  },
);

// Loaded Routes: cargo is temporary length, not an extra catch quota.
add(
  'loaded-routes',
  'orchard-post',
  'Orchard Post',
  'Садова пошта',
  'Carry two parcels to dock A, then extract. Unloading removes only their temporary cable segments.',
  'Віднесіть дві посилки до доку A та евакуюйтеся. Розвантаження прибирає лише тимчасові ланки кабелю.',
  {
    walls: [[10, 7, 4, 3]],
    parcels: [parcel('one', 9, 2), parcel('two', 18, 5)],
    docks: [dock('a', 18, 12)],
    stages: [stage('post', 0, null, ['one', 'two']), stage('return', 2, at(5, 12))],
  },
);
add(
  'loaded-routes',
  'split-delivery',
  'Split Delivery',
  'Розділена доставка',
  'Two docks take different parcels. Choose a loop that matches the letters without folding the cable across your return.',
  'Два доки приймають різні посилки. Оберіть коло за літерами, не перекриваючи кабелем зворотний шлях.',
  {
    walls: [
      [10, 5, 2, 3],
      [12, 10, 2, 3],
    ],
    parcels: [
      parcel('one', 8, 3, 'a'),
      parcel('two', 4, 9, 'b'),
      parcel('three', 19, 8, 'a'),
      parcel('four', 16, 14, 'b'),
    ],
    docks: [dock('a', 4, 14), dock('b', 20, 3)],
    stages: [
      stage('freight', 1, null, ['one', 'two', 'three', 'four']),
      stage('meet', 2, at(12, 3)),
    ],
  },
);
add(
  'loaded-routes',
  'glasshouse-elbow',
  'Glasshouse Elbow',
  'Поворот оранжереї',
  'Load outside the glasshouse, unload before the narrow elbow, then pursue the runner around its open side.',
  'Завантажтеся зовні оранжереї, розвантажтеся перед вузьким поворотом і перехопіть бігуна з відкритого боку.',
  {
    walls: [
      [8, 5, 7, 2],
      [13, 7, 2, 5],
    ],
    parcels: [parcel('one', 5, 5), parcel('two', 5, 11)],
    docks: [dock('a', 10, 10)],
    stages: [stage('unload', 0, null, ['one', 'two']), stage('pursue', 3, at(18, 12))],
  },
);
add(
  'loaded-routes',
  'two-harvests',
  'Two Harvests',
  'Два врожаї',
  'Only the current harvest is collectable. Finish the north delivery before the southern parcels activate on the same growing route.',
  'Збирати можна лише поточний урожай. Завершіть північну доставку, щоб активувати південні посилки на тому самому маршруті.',
  {
    walls: [
      [8, 6, 3, 2],
      [15, 10, 3, 2],
    ],
    parcels: [
      parcel('north-one', 8, 3, 'a'),
      parcel('north-two', 18, 4, 'a'),
      parcel('south-one', 5, 12, 'b'),
      parcel('south-two', 16, 14, 'b'),
    ],
    docks: [dock('a', 20, 7), dock('b', 4, 14)],
    stages: [
      stage('north', 1, null, ['north-one', 'north-two']),
      stage('south', 3, at(12, 14), ['south-one', 'south-two']),
    ],
  },
);
add(
  'loaded-routes',
  'refuge-cargo',
  'Refuge Cargo',
  'Вантаж біля схованок',
  'Deliver while refuge prey changes bays. Your dock is fixed; its safe destination is not. Choose which task to finish on each pass.',
  'Доставляйте вантаж, поки здобич змінює схованки. Ваш док нерухомий, її ціль — ні. Обирайте завдання на кожен прохід.',
  {
    walls: [
      [7, 6, 2, 5],
      [15, 6, 2, 5],
    ],
    targets: [prey('refuge', 3, bays)],
    parcels: [parcel('one', 11, 4), parcel('two', 12, 13)],
    docks: [dock('a', 20, 9)],
    stages: [stage('refuge', 3, null, ['one', 'two']), stage('exit', 4, at(3, 9))],
  },
);
add(
  'loaded-routes',
  'irrigation-shortcut',
  'Irrigation Shortcut',
  'Іригаційний прохід',
  'The loaded cable holds an irrigation gate. Deliver beyond it, then decide whether your shortened return should use the bypass.',
  'Завантажений кабель утримує іригаційні ворота. Доставте вантаж за них і вирішіть, чи повертатися коротшим кабелем через обхід.',
  {
    walls: [
      [12, 5, 1, 3],
      [12, 10, 1, 4],
    ],
    plates: [
      plate(
        'irrigation',
        [[9, 9]],
        [
          [12, 8],
          [12, 9],
        ],
      ),
    ],
    parcels: [parcel('one', 6, 5), parcel('two', 6, 12)],
    docks: [dock('a', 18, 9)],
    stages: [
      stage('watering', 1, null, ['one', 'two'], [plateGoal('irrigation')]),
      stage('return', 2, at(4, 9)),
    ],
  },
);
add(
  'loaded-routes',
  'border-harvest',
  'Border Harvest',
  'Урожай на краю',
  'Parcels lie on opposite edges. Wrapping can shorten the delivery, but your own cable still follows through the boundary.',
  'Посилки лежать на протилежних краях. Перехід через край скорочує доставку, але ваш кабель теж проходить крізь межу.',
  {
    wrap: true,
    walls: [
      [8, 6, 3, 6],
      [15, 6, 2, 3],
    ],
    parcels: [parcel('one', 1, 8), parcel('two', 22, 9)],
    docks: [dock('a', 12, 4)],
    stages: [stage('edge-load', 1, null, ['one', 'two']), stage('home', 3, at(12, 14))],
  },
);
add(
  'loaded-routes',
  'harvest-rendezvous',
  'Harvest Rendezvous',
  'Зустріч після врожаю',
  'Complete two deliveries in sequence, then meet at the centre after the last pursuit. In Team, split the cargo but leave a shared crossing.',
  'Виконайте дві доставки послідовно та зустріньтеся в центрі після останнього перехоплення. У команді поділіть вантаж, залишивши спільний перехід.',
  {
    walls: [
      [7, 5, 3, 3],
      [14, 10, 3, 3],
      [12, 5, 2, 1],
    ],
    targets: [prey('runner'), prey('sprinter')],
    active: 2,
    parcels: [
      parcel('one', 4, 5, 'a'),
      parcel('two', 19, 12, 'a'),
      parcel('three', 19, 5, 'b'),
      parcel('four', 4, 12, 'b'),
    ],
    docks: [dock('a', 12, 14), dock('b', 12, 3)],
    stages: [
      stage('first-load', 1, null, ['one', 'two']),
      stage('second-load', 3, null, ['three', 'four']),
      stage('meet', 5, at(12, 8)),
    ],
  },
);

// Split Horizons: the edge changes a tactical route, not just the board palette.
add(
  'split-horizons',
  'harbor-clearances',
  'Harbor Clearances',
  'Портові дозволи',
  'Catch, cross the harbour, then catch again. Use the wrapping edge to approach each extraction from a different side.',
  'Спіймайте ціль, перетніть гавань і спіймайте ще одну. Переходьте через край для іншого підходу до кожної точки евакуації.',
  {
    wrap: true,
    walls: [
      [9, 5, 3, 4],
      [15, 10, 3, 3],
    ],
    stages: [stage('survey', 1), stage('cross', 1, at(2, 9)), stage('return', 3, at(21, 9))],
  },
);
add(
  'split-horizons',
  'seam-parcels',
  'Seam Parcels',
  'Посилки на межі',
  'The docks sit across the edge from their parcels. A short delivery leaves you facing the longer final interception.',
  'Доки стоять за краєм навпроти посилок. Коротка доставка готує вас до довшого фінального перехоплення.',
  {
    wrap: true,
    walls: [
      [6, 6, 2, 5],
      [16, 6, 2, 5],
    ],
    parcels: [parcel('one', 1, 5, 'a'), parcel('two', 22, 12, 'b')],
    docks: [dock('a', 22, 5), dock('b', 1, 12)],
    stages: [stage('seam', 1, null, ['one', 'two']), stage('centre', 3, at(12, 9))],
  },
);
add(
  'split-horizons',
  'north-south',
  'North to South',
  'З півночі на південь',
  'Cross the upper edge for the first rendezvous; a lower machine island changes the return to the next arrow.',
  'Перейдіть через верхній край до першої зустрічі; нижній машинний острів змінює повернення до наступної стрілки.',
  {
    wrap: true,
    walls: [
      [7, 6, 10, 2],
      [10, 11, 4, 3],
    ],
    targets: [prey('pair', 3, bays)],
    active: 2,
    stages: [stage('south', 2, at(4, 16)), stage('north', 4, at(19, 1))],
  },
);
add(
  'split-horizons',
  'offset-quays',
  'Offset Quays',
  'Зміщені причали',
  'The quays block a straight chase. Intercept a changing refuge from the opposite edge, then use the open central waterline.',
  'Причали перекривають пряме переслідування. Перехопіть здобич з іншого краю та скористайтеся вільною центральною смугою.',
  {
    wrap: true,
    walls: [
      [5, 4, 3, 7],
      [16, 8, 3, 6],
    ],
    targets: [prey('refuge', 3, bays)],
    stages: [stage('west', 2, at(3, 13)), stage('east', 4, at(20, 5))],
  },
);
add(
  'split-horizons',
  'tidal-door',
  'Tidal Door',
  'Припливні ворота',
  'An occupied pad opens a middle crossing. Compare that route with a wrap around the edge before committing your cable.',
  'Зайнята плита відкриває центральний перехід. Порівняйте його з переходом через край, перш ніж прокласти кабель.',
  {
    wrap: true,
    walls: [
      [11, 4, 2, 4],
      [11, 10, 2, 4],
    ],
    plates: [
      plate(
        'tide',
        [[8, 9]],
        [
          [11, 8],
          [12, 8],
          [11, 9],
          [12, 9],
        ],
      ),
    ],
    stages: [stage('out', 1, at(20, 9), [], [plateGoal('tide')]), stage('back', 3, at(4, 4))],
  },
);
{
  const g = junction(
    'quay',
    0,
    12,
    8,
    [
      [2, 8],
      [21, 8],
    ],
    4,
    4,
  );
  add(
    'split-horizons',
    'quay-dispatch',
    'Quay Dispatch',
    'Керування причалом',
    'Reach either lever through the edge, then intercept on the selected quay loop. The junction itself never wraps.',
    'Дістаньтеся будь-якого важеля через край та перехопіть патруль на обраному колі причалу. Сама розвилка не переходить через край.',
    {
      wrap: true,
      walls: [
        [9, 5, 2, 2],
        [14, 10, 2, 2],
        [5, 11, 1, 3],
      ],
      targets: [patrol(g)],
      switchyards: [g],
      stages: [stage('route', 3, at(12, 14), [], [switchGoal('quay')])],
    },
  );
}
add(
  'split-horizons',
  'lighten-at-sea',
  'Lighten at Sea',
  'Розвантаження в морі',
  'Collect the near load, deliver across the seam, then collect the far load. Each delivery opens space for the next tight return.',
  'Зберіть ближній вантаж, доставте його через межу, а тоді візьміть дальній. Кожне розвантаження звільняє місце для наступного повороту.',
  {
    wrap: true,
    walls: [
      [8, 5, 2, 7],
      [15, 6, 2, 7],
    ],
    parcels: [parcel('one', 4, 6, 'a'), parcel('two', 20, 11, 'b')],
    docks: [dock('a', 21, 6), dock('b', 3, 11)],
    stages: [
      stage('out', 1, null, ['one']),
      stage('back', 2, null, ['two']),
      stage('meet', 3, at(12, 8)),
    ],
  },
);
add(
  'split-horizons',
  'horizon-relay',
  'Horizon Relay',
  'Естафета горизонтів',
  'Three arrows alternate the useful edge. Keep one lane free for the partner and one for the cable you carried through the previous crossing.',
  'Три стрілки змінюють вигідний край. Залишайте смугу для напарника та смугу для кабелю з попереднього переходу.',
  {
    wrap: true,
    walls: [
      [6, 5, 3, 4],
      [15, 9, 3, 4],
      [11, 7, 2, 3],
    ],
    targets: [prey('runner'), prey('switchback', 3, bays)],
    active: 2,
    stages: [
      stage('west', 1, at(1, 6)),
      stage('south', 3, at(12, 16)),
      stage('east', 5, at(22, 11)),
    ],
  },
);

// Crossfire Works: existing warned lanes/projectiles combined with continuous goals.
add(
  'crossfire-works',
  'furnace-permit',
  'Furnace Permit',
  'Дозвіл печі',
  'Clear the first runner before crossing the furnace lane. The emitter is catchable; the outside route avoids its marked attack.',
  'Спіймайте першого бігуна перед переходом через смугу печі. Випромінювач можна знищити; зовнішній шлях обходить позначену атаку.',
  {
    walls: [
      [9, 5, 3, 2],
      [15, 10, 3, 2],
    ],
    targets: [prey(), lane(4, 8, 'x', 4, 19)],
    active: 2,
    stages: [stage('permit', 1, at(18, 4)), stage('clearance', 3, at(6, 13))],
  },
);
add(
  'crossfire-works',
  'coolant-cargo',
  'Coolant Cargo',
  'Вантаж охолодження',
  'Take coolant around the marked lane to its dock. Deliver before taking the final runner so your cable is shorter during pursuit.',
  'Обнесіть охолоджувач навколо смуги атаки до доку. Розвантажтеся перед фінальним бігуном, щоб переслідувати з коротшим кабелем.',
  {
    walls: [
      [10, 5, 2, 2],
      [10, 10, 2, 3],
    ],
    targets: [lane(4, 8, 'x', 4, 19), prey(), prey('sprinter')],
    active: 1,
    parcels: [parcel('one', 6, 4), parcel('two', 6, 12)],
    docks: [dock('a', 19, 12)],
    stages: [stage('coolant', 1, null, ['one', 'two']), stage('return', 3, at(19, 4))],
  },
);
add(
  'crossfire-works',
  'watch-the-aim',
  'Watch the Aim',
  'Стеж за прицілом',
  'A guard warns before firing. Cross behind its aim, complete the upper clearance, then return by the other side of the machinery.',
  'Вартовий попереджає перед пострілом. Перетніть шлях позаду прицілу, завершіть верхній етап і поверніться з іншого боку машин.',
  {
    walls: [
      [8, 6, 3, 2],
      [15, 10, 3, 2],
    ],
    targets: [guard(12, 8, 'up'), prey(), prey('switchback', 3, bays), prey('sprinter')],
    active: 2,
    stages: [stage('upper', 2, at(20, 4)), stage('lower', 4, at(4, 13))],
  },
);
add(
  'crossfire-works',
  'pressure-flank',
  'Pressure Flank',
  'Обхід під тиском',
  'The pressure shortcut approaches the lane from its flank. Hold it with the cable or take the permanent bypass during a warning.',
  'Короткий шлях через плиту підходить до смуги збоку. Утримуйте його кабелем або йдіть постійним обходом під час попередження.',
  {
    walls: [
      [10, 4, 1, 3],
      [10, 10, 1, 4],
      [16, 5, 2, 2],
    ],
    plates: [
      plate(
        'flank',
        [[7, 9]],
        [
          [10, 7],
          [10, 8],
          [10, 9],
        ],
      ),
    ],
    targets: [lane(14, 8, 'x', 12, 21), prey(), prey('sprinter')],
    active: 2,
    stages: [stage('flank', 2, at(20, 12), [], [plateGoal('flank')]), stage('return', 3, at(4, 5))],
  },
);
add(
  'crossfire-works',
  'crossing-orders',
  'Crossing Orders',
  'Наказ на перехід',
  'One lane attacks across, the next attacks down. Each clearance changes which side is safe to approach.',
  'Перша смуга атакує поперек, наступна — вниз. Кожен етап змінює безпечний бік підходу.',
  {
    walls: [
      [7, 5, 2, 2],
      [15, 11, 2, 2],
    ],
    targets: [lane(4, 8, 'x', 4, 19), lane(12, 4, 'y', 4, 13)],
    active: 1,
    stages: [stage('across', 1, at(19, 5)), stage('down', 2, at(5, 13))],
  },
);
add(
  'crossfire-works',
  'guarded-transfer',
  'Guarded Transfer',
  'Доставка під охороною',
  'Deliver to two sides of the guard. Cargo does not absorb shots; watch the aim marker and choose a return with room for the longer cable.',
  'Доставте вантаж по різні боки вартового. Посилки не захищають від пострілів; стежте за прицілом і залишайте місце довшому кабелю.',
  {
    walls: [
      [9, 5, 2, 2],
      [14, 11, 2, 2],
    ],
    targets: [guard(12, 9, 'left'), prey('sprinter'), prey(), prey('sprinter')],
    active: 2,
    parcels: [parcel('one', 5, 5, 'a'), parcel('two', 19, 12, 'b')],
    docks: [dock('a', 19, 5), dock('b', 5, 12)],
    stages: [stage('transfer', 2, null, ['one', 'two']), stage('extract', 4, at(12, 3))],
  },
);
{
  const g = junction('furnace', 0, 12, 8, [[5, 9]], 3, 3);
  add(
    'crossfire-works',
    'furnace-switch',
    'Furnace Switch',
    'Перемикач печі',
    'Redirect the patrol away from the marked firing approach. Its track stays safe to touch; the guard’s projectile does not.',
    'Спрямуйте патруль подалі від прицілу. Контакт із патрулем безпечний, а з пострілом вартового — ні.',
    {
      walls: [
        [10, 6, 1, 1],
        [14, 10, 1, 1],
        [18, 5, 1, 3],
      ],
      targets: [patrol(g), guard(20, 10, 'left')],
      active: 2,
      switchyards: [g],
      stages: [stage('dispatch', 3, at(5, 13), [], [switchGoal('furnace')])],
    },
  );
}
add(
  'crossfire-works',
  'works-clearance',
  'Works Clearance',
  'Зачистка цеху',
  'Carry the coolant, clear the two warned posts, then extract at the loading bay. Each stage keeps the same cable and accepted hazard timing.',
  'Доставте охолоджувач, знищіть два пости з попередженням та евакуюйтеся з вантажного майданчика. Етапи зберігають той самий кабель і час атак.',
  {
    walls: [
      [7, 5, 3, 2],
      [15, 11, 3, 2],
      [11, 6, 2, 1],
    ],
    targets: [
      lane(4, 9, 'x', 4, 19),
      guard(19, 5, 'down'),
      prey(),
      prey('sprinter'),
      prey('refuge', 3, bays),
    ],
    active: 2,
    parcels: [parcel('one', 5, 4), parcel('two', 18, 13)],
    docks: [dock('a', 12, 13)],
    stages: [
      stage('coolant', 1, null, ['one', 'two']),
      stage('clear', 4, at(20, 9)),
      stage('loading', 5, at(3, 9)),
    ],
  },
);

// Extraction Circuit: combine familiar tools without a separate briefing between stages.
add(
  'extraction-circuit',
  'dock-permission',
  'Dock Permission',
  'Дозвіл доку',
  'Complete the dock delivery, then open the extraction by catching the runner. The arrow announces when both requirements are met.',
  'Завершіть доставку до доку та спіймайте бігуна, щоб відкрити евакуацію. Стрілка показує готовність обох умов.',
  {
    walls: [[9, 6, 5, 3]],
    parcels: [parcel('one', 6, 4), parcel('two', 18, 12)],
    docks: [dock('a', 18, 4)],
    stages: [stage('dock', 1, at(5, 12), ['one', 'two'])],
  },
);
add(
  'extraction-circuit',
  'two-landings',
  'Two Landings',
  'Два причалювання',
  'The first landing activates the second delivery. Use the open channel between pump islands for your longer return.',
  'Перше причалювання активує другу доставку. Поверніться довшим кабелем через відкритий канал між насосними островами.',
  {
    walls: [
      [7, 5, 3, 4],
      [15, 9, 3, 4],
    ],
    parcels: [parcel('one', 5, 11, 'a'), parcel('two', 19, 6, 'b')],
    docks: [dock('a', 18, 13), dock('b', 5, 4)],
    stages: [stage('south', 1, at(12, 14), ['one']), stage('north', 3, at(12, 3), ['two'])],
  },
);
add(
  'extraction-circuit',
  'pump-return',
  'Pump Return',
  'Повернення до насоса',
  'Hold the pump gate, unload beyond it, then extract through the other side. Either Team pilot may reach the final arrow after shared delivery.',
  'Утримайте насосні ворота, розвантажтеся за ними та евакуюйтеся з іншого боку. Після спільної доставки фінальної стрілки може дістатися будь-який пілот.',
  {
    walls: [
      [11, 4, 2, 4],
      [11, 10, 2, 4],
    ],
    plates: [
      plate(
        'pump',
        [
          [8, 9],
          [16, 8],
        ],
        [
          [11, 8],
          [12, 8],
          [11, 9],
          [12, 9],
        ],
      ),
    ],
    parcels: [parcel('one', 5, 5), parcel('two', 5, 12)],
    docks: [dock('a', 19, 9)],
    stages: [
      stage('pump', 1, null, ['one', 'two'], [plateGoal('pump')]),
      stage('return', 3, at(4, 9)),
    ],
  },
);
{
  const g = junction('loading', 0, 12, 8, [[4, 9]], 4, 4);
  add(
    'extraction-circuit',
    'loading-dispatch',
    'Loading Dispatch',
    'Маршрут завантаження',
    'Choose the patrol’s branch before collecting its clearance. Deliver two parcels and finish at the opposite loading bay.',
    'Оберіть гілку патруля перед перехопленням. Доставте дві посилки та завершіть маршрут на протилежному майданчику.',
    {
      walls: [
        [9, 5, 2, 2],
        [14, 10, 2, 2],
      ],
      targets: [patrol(g), prey()],
      active: 2,
      switchyards: [g],
      parcels: [parcel('one', 5, 5), parcel('two', 19, 12)],
      docks: [dock('a', 20, 5)],
      stages: [
        stage('dispatch', 1, null, [], [switchGoal('loading')]),
        stage('loading', 3, at(4, 13), ['one', 'two']),
      ],
    },
  );
}
add(
  'extraction-circuit',
  'harbor-window',
  'Harbor Window',
  'Вікно гавані',
  'A shutter changes the middle approach while you deliver. The edge wraps, so waiting is a choice rather than the only route.',
  'Заслінка змінює центральний підхід під час доставки. Через край можна перейти, тож чекати не обов’язково.',
  {
    wrap: true,
    walls: [
      [10, 4, 2, 4],
      [10, 10, 2, 4],
    ],
    shutters: [
      { id: 'harbor-door', cells: [at(10, 8), at(11, 8), at(10, 9), at(11, 9)], phase: 16 },
    ],
    parcels: [parcel('one', 6, 5), parcel('two', 6, 12)],
    docks: [dock('a', 18, 9)],
    stages: [stage('delivery', 1, null, ['one', 'two']), stage('extract', 3, at(4, 9))],
  },
);
add(
  'extraction-circuit',
  'relay-load',
  'Relay Load',
  'Вантаж ретранслятора',
  'Touch both linked relay pads to catch the shielded post, then complete the delivery. Relay switches and parcels never count as enemy catches.',
  'Торкніться обох зв’язаних плит, щоб знищити захищений пост, а тоді завершіть доставку. Перемикачі та посилки не зараховуються як вороги.',
  {
    walls: [
      [9, 5, 2, 3],
      [14, 10, 2, 3],
    ],
    targets: [
      { kind: 'relay', every: 3, at: at(12, 8), relays: [at(5, 8), at(19, 8)] },
      prey(),
      prey('sprinter'),
    ],
    active: 2,
    parcels: [parcel('one', 5, 4), parcel('two', 19, 13)],
    docks: [dock('a', 12, 14)],
    stages: [stage('link', 2, null, ['one', 'two']), stage('clear', 3, at(12, 3))],
  },
);
add(
  'extraction-circuit',
  'outbound-inbound',
  'Outbound, Inbound',
  'Туди й назад',
  'Deliver one load before the return cargo activates. A moving pair keeps the central crossing busy; reserve an exit before turning.',
  'Доставте перший вантаж, щоб активувати зворотний. Рухлива пара займає центральний перехід; залиште вихід перед поворотом.',
  {
    walls: [
      [7, 5, 2, 7],
      [16, 6, 2, 7],
    ],
    targets: [prey('pair', 3, bays)],
    active: 2,
    parcels: [parcel('one', 4, 4, 'a'), parcel('two', 20, 13, 'b')],
    docks: [dock('a', 20, 4), dock('b', 4, 13)],
    stages: [
      stage('outbound', 1, null, ['one']),
      stage('inbound', 3, null, ['two']),
      stage('exit', 4, at(12, 9)),
    ],
  },
);
add(
  'extraction-circuit',
  'harbor-homecoming',
  'Harbor Homecoming',
  'Повернення в гавань',
  'Two cargo stages share a pressure shortcut. Finish the last pursuit, then bring either Team pilot home without crossing the partner’s cable.',
  'Два вантажні етапи користуються одним проходом через плиту. Завершіть переслідування та приведіть будь-якого пілота додому, не перетнувши кабель напарника.',
  {
    walls: [
      [11, 5, 2, 3],
      [11, 10, 2, 3],
      [6, 9, 2, 2],
      [17, 6, 2, 2],
    ],
    plates: [
      plate(
        'home',
        [
          [8, 8],
          [16, 9],
        ],
        [
          [11, 8],
          [12, 8],
          [11, 9],
          [12, 9],
        ],
      ),
    ],
    parcels: [
      parcel('one', 5, 5, 'a'),
      parcel('two', 19, 12, 'a'),
      parcel('three', 19, 5, 'b'),
      parcel('four', 5, 12, 'b'),
    ],
    docks: [dock('a', 20, 9), dock('b', 4, 8)],
    targets: [prey(), prey('sprinter')],
    active: 2,
    stages: [
      stage('out', 1, null, ['one', 'two'], [plateGoal('home')]),
      stage('back', 3, null, ['three', 'four']),
      stage('home', 5, at(12, 3)),
    ],
  },
);
export const CLASSIC_SNAKE_OPERATION_LEVELS_A = freeze(rows);
