/** Authored pursuit expansion. No v1 recipe is reconstructed or rebalanced here. */
const bilingual = (en, uk) => ({ en, uk });
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const WIDTH = 24;
const HEIGHT = 18;
const chapterRows = [
  [
    'patrol-routes',
    'Patrol Routes',
    'Маршрути патрулів',
    'Read a walking route and take the shorter interception line.',
    'Читайте маршрут цілі й обирайте коротший шлях перехоплення.',
  ],
  [
    'escape-lines',
    'Escape Lines',
    'Шляхи відступу',
    'Runners react to nearby heads. Use junctions and open return paths.',
    'Бігуни реагують на близькі голови. Користуйтеся розвилками й відкритими шляхами повернення.',
  ],
  [
    'burst-timing',
    'Burst Timing',
    'Ритм ривків',
    'A visible warning precedes every short sprint. Intercept during recovery.',
    'Перед кожним коротким ривком є видиме попередження. Перехоплюйте під час відпочинку.',
  ],
  [
    'route-windows',
    'Route Windows',
    'Вікна маршруту',
    'Timed shutters open shortcuts; a permanent route always remains.',
    'Тимчасові заслінки відкривають короткі шляхи; постійний обхід завжди доступний.',
  ],
  [
    'field-supplies',
    'Field Supplies',
    'Польові припаси',
    'Touch supplies to pause targets or shorten your tail. Couriers are optional.',
    'Торкайтеся припасів, щоб призупинити цілі або вкоротити хвіст. Кур’єри необов’язкові.',
  ],
  [
    'combined-pursuit',
    'Combined Pursuit',
    'Поєднане переслідування',
    'Combine interception, route timing and supplies with no more than two targets.',
    'Поєднуйте перехоплення, ритм маршрутів і припаси; одночасно цілей не більше двох.',
  ],
];

// Rectangles are authored directly in grid cells. Later boundary-reaching walls
// deliberately break the old catalogue's universal open outer band.
const rows = [
  [
    'oval-intercept',
    'Oval Intercept',
    'Перехоплення на овалі',
    'Cut across the open side of the island instead of following the patrol.',
    'Перетинайте відкритий бік острова, замість повторювати маршрут патруля.',
    [[9, 6, 6, 5]],
    [
      [8, 5],
      [15, 5],
      [15, 11],
      [8, 11],
    ],
  ],
  [
    'split-yard',
    'Split Yard',
    'Розділений двір',
    'The divider has two ends. Choose the nearer return before the patrol rounds it.',
    'Перегородка має два кінці. Оберіть ближчий обхід, перш ніж ціль її обігне.',
    [
      [11, 4, 2, 10],
      [4, 7, 3, 2],
    ],
    [
      [10, 3],
      [13, 3],
      [13, 14],
      [10, 14],
    ],
  ],
  [
    'island-clock',
    'Island Clock',
    'Острівний годинник',
    'Four approaches meet the island circuit. Cross between the corner blocks.',
    'Чотири підходи ведуть до кола навколо острова. Проходьте між кутовими блоками.',
    [
      [10, 7, 4, 4],
      [5, 4, 2, 2],
      [17, 12, 2, 2],
    ],
    [
      [9, 6],
      [14, 6],
      [14, 11],
      [9, 11],
    ],
  ],
  [
    'passing-bays',
    'Passing Bays',
    'Кишені для об’їзду',
    'Side bays let your tail clear the long patrol lane before you return.',
    'Бічні кишені дають хвосту звільнити довгий шлях патруля до вашого повернення.',
    [
      [4, 6, 4, 2],
      [11, 6, 3, 2],
      [17, 6, 3, 2],
      [4, 11, 4, 2],
      [11, 11, 3, 2],
      [17, 11, 3, 2],
    ],
    [
      [3, 9],
      [21, 9],
      [21, 14],
      [3, 14],
    ],
  ],
  [
    'crossroads',
    'Crossroads',
    'Перехрестя',
    'The patrol revisits the centre from two loops. Intercept a crossing, then leave.',
    'Патруль повертається в центр із двох петель. Перехопіть на перетині й виходьте.',
    [
      [5, 5, 3, 3],
      [15, 10, 3, 3],
      [15, 4, 3, 2],
      [5, 12, 3, 2],
    ],
    [
      [11, 9],
      [3, 9],
      [3, 3],
      [11, 3],
      [11, 9],
      [20, 9],
      [20, 14],
      [11, 14],
    ],
  ],
  [
    'inner-shortcut',
    'Inner Shortcut',
    'Внутрішній зріз',
    'The outside patrol is longer than the broken inner ring. Use its openings.',
    'Зовнішній маршрут довший за розірване внутрішнє кільце. Користуйтеся проходами.',
    [
      [7, 5, 10, 1],
      [7, 12, 10, 1],
      [7, 6, 1, 2],
      [7, 10, 1, 2],
      [16, 6, 1, 2],
      [16, 10, 1, 2],
    ],
    [
      [5, 3],
      [19, 3],
      [19, 14],
      [5, 14],
    ],
  ],
  [
    'open-intercept',
    'Open Intercept',
    'Відкрите перехоплення',
    'Asymmetric cover changes the runner’s escape. Approach from the open side.',
    'Несиметричне укриття змінює шлях втечі бігуна. Заходьте з відкритого боку.',
    [
      [6, 5, 3, 3],
      [15, 10, 4, 2],
      [11, 13, 2, 2],
    ],
  ],
  [
    'blind-corner',
    'Blind Corner',
    'Сліпий кут',
    'A tall elbow hides the shorter route. Keep the second exit available.',
    'Великий вигин приховує коротший шлях. Залишайте другий вихід доступним.',
    [
      [9, 3, 2, 8],
      [9, 10, 9, 2],
      [3, 13, 4, 2],
    ],
  ],
  [
    'zigzag-exit',
    'Zigzag Exit',
    'Зигзаг виходу',
    'Alternating walls reach opposite edges. Cut through the middle gaps.',
    'Почергові стіни сягають протилежних країв. Проходьте крізь центральні проміжки.',
    [
      [8, 0, 2, 9],
      [15, 9, 2, 9],
      [3, 11, 3, 2],
    ],
  ],
  [
    'broken-ring',
    'Broken Ring',
    'Розірване кільце',
    'Two unequal gaps connect inside and outside. Change sides to intercept.',
    'Два нерівні проходи сполучають внутрішній і зовнішній простір. Змінюйте бік для перехоплення.',
    [
      [7, 4, 10, 1],
      [7, 13, 10, 1],
      [7, 5, 1, 4],
      [7, 11, 1, 2],
      [16, 5, 1, 2],
      [16, 10, 1, 3],
    ],
  ],
  [
    'border-cutoff',
    'Border Cutoff',
    'Зріз через край',
    'Edges wrap. Cross the border to get ahead of a runner in the offset lanes.',
    'Краї переносять на протилежний бік. Випереджайте бігуна переходом між зміщеними смугами.',
    [
      [6, 4, 2, 10],
      [14, 0, 2, 7],
      [18, 10, 2, 8],
    ],
    null,
    { wrap: true, secondSpawn: [11, 15] },
  ],
  [
    'three-way-escape',
    'Three-way Escape',
    'Три шляхи втечі',
    'Three broad junctions offer different escape loops. Turn toward the next exit.',
    'Три широкі розвилки дають різні петлі втечі. Повертайте до наступного виходу.',
    [
      [10, 0, 2, 6],
      [0, 9, 7, 2],
      [15, 8, 9, 2],
      [11, 13, 2, 5],
    ],
  ],
  [
    'first-dash',
    'First Dash',
    'Перший ривок',
    'Watch the warning in the long straight. The side bays leave room to circle.',
    'Стежте за попередженням на довгій прямій. Бічні кишені залишають місце для кола.',
    [
      [5, 6, 14, 2],
      [5, 11, 14, 2],
    ],
  ],
  [
    'corner-pause',
    'Corner Pause',
    'Пауза за рогом',
    'The large right-angle route gives a second approach during the sprint recovery.',
    'Великий прямокутний маршрут дає другий підхід, поки спринтер відпочиває.',
    [
      [8, 4, 2, 8],
      [8, 10, 10, 2],
      [17, 4, 2, 3],
    ],
  ],
  [
    'alternating-straights',
    'Alternating Straights',
    'Почергові прямі',
    'An S circuit alternates long straights. Leave the inner corner for your tail.',
    'S-подібне коло чергує довгі прямі. Залишайте внутрішній кут для хвоста.',
    [
      [5, 4, 13, 2],
      [5, 5, 2, 5],
      [6, 9, 12, 2],
      [16, 10, 2, 4],
    ],
  ],
  [
    'staggered-cover',
    'Staggered Cover',
    'Зміщені укриття',
    'Offset islands interrupt straight approaches. Use the diagonal spaces between them.',
    'Зміщені острови переривають прямі підходи. Користуйтеся діагональними проміжками.',
    [
      [4, 4, 4, 3],
      [11, 7, 4, 3],
      [18, 11, 3, 3],
      [4, 12, 3, 2],
    ],
  ],
  [
    'crossing-bursts',
    'Crossing Bursts',
    'Перехресні ривки',
    'Two loops meet at an open crossing. Choose which of the two targets to intercept.',
    'Дві петлі сходяться на відкритому перехресті. Обирайте, яку з двох цілей перехопити.',
    [
      [5, 4, 4, 3],
      [15, 4, 4, 3],
      [5, 11, 4, 3],
      [15, 11, 4, 3],
    ],
    null,
    { two: true },
  ],
  [
    'long-way-round',
    'Long Way Round',
    'Довгий обхід',
    'A central barrier reaches the lower edge. Intercept through the broad upper return.',
    'Центральна перегородка сягає нижнього краю. Перехоплюйте через широкий верхній обхід.',
    [
      [11, 5, 2, 13],
      [3, 8, 4, 2],
      [17, 5, 4, 2],
    ],
  ],
  [
    'first-shutter',
    'First Shutter',
    'Перша заслінка',
    'The warning marks a closing shortcut. The outside loop always stays open.',
    'Попередження позначає короткий шлях, що закривається. Зовнішнє коло завжди відкрите.',
    [
      [10, 4, 2, 4],
      [10, 10, 2, 4],
    ],
    null,
    {
      gates: [
        [
          [10, 8],
          [11, 8],
          [10, 9],
          [11, 9],
        ],
      ],
    },
  ],
  [
    'split-corridor',
    'Split Corridor',
    'Розділений коридор',
    'The gated middle competes with two unequal permanent routes.',
    'Центральний шлях із заслінкою змагається з двома нерівними постійними обходами.',
    [
      [6, 5, 12, 2],
      [6, 11, 12, 2],
      [11, 7, 2, 1],
      [11, 10, 2, 1],
    ],
    null,
    {
      gates: [
        [
          [11, 8],
          [12, 8],
          [11, 9],
          [12, 9],
        ],
      ],
    },
  ],
  [
    'offset-windows',
    'Offset Windows',
    'Зміщені вікна',
    'Two shutters are out of phase. Follow the open detour instead of waiting in place.',
    'Дві заслінки працюють у різних фазах. Ідіть відкритим обходом, замість чекати на місці.',
    [
      [7, 4, 2, 3],
      [7, 9, 2, 5],
      [15, 4, 2, 6],
      [15, 12, 2, 2],
    ],
    null,
    {
      gates: [
        [
          [7, 7],
          [8, 7],
          [7, 8],
          [8, 8],
        ],
        [
          [15, 10],
          [16, 10],
          [15, 11],
          [16, 11],
        ],
      ],
    },
  ],
  [
    'clockwork-ring',
    'Clockwork Ring',
    'Кільце за розкладом',
    'Timed radial cuts shorten a ring with a permanently open circumference.',
    'Тимчасові радіальні зрізи вкорочують кільце з постійно відкритим зовнішнім колом.',
    [
      [7, 5, 4, 1],
      [13, 5, 4, 1],
      [7, 12, 4, 1],
      [13, 12, 4, 1],
      [7, 6, 1, 2],
      [7, 10, 1, 2],
      [16, 6, 1, 6],
    ],
    [
      [5, 3],
      [19, 3],
      [19, 14],
      [5, 14],
    ],
    {
      gates: [
        [
          [11, 5],
          [12, 5],
        ],
        [
          [11, 12],
          [12, 12],
        ],
      ],
      patrol: true,
    },
  ],
  [
    'boundary-detour',
    'Boundary Detour',
    'Обхід від краю',
    'An edge-reaching wall interrupts the old outer circuit. Take the inner return.',
    'Стіна від краю перериває зовнішнє коло. Скористайтеся внутрішнім обходом.',
    [
      [11, 0, 2, 6],
      [11, 8, 2, 2],
      [11, 13, 2, 5],
      [3, 8, 3, 2],
      [18, 6, 3, 2],
    ],
    null,
    {
      gates: [
        [
          [11, 6],
          [12, 6],
          [11, 7],
          [12, 7],
        ],
      ],
    },
  ],
  [
    'return-junction',
    'Return Junction',
    'Розвилка повернення',
    'Three junctions and two timed shortcuts reward planning the return before the catch.',
    'Три розвилки й два тимчасові зрізи винагороджують план повернення ще до дотику.',
    [
      [5, 5, 5, 2],
      [14, 5, 5, 2],
      [5, 11, 5, 2],
      [14, 11, 5, 2],
      [11, 8, 2, 2],
    ],
    null,
    {
      gates: [
        [
          [10, 5],
          [11, 5],
          [12, 5],
          [13, 5],
          [10, 6],
          [11, 6],
          [12, 6],
          [13, 6],
        ],
        [
          [10, 11],
          [11, 11],
          [12, 11],
          [13, 11],
          [10, 12],
          [11, 12],
          [12, 12],
          [13, 12],
        ],
      ],
      two: true,
    },
  ],
  [
    'first-pulse',
    'First Pulse',
    'Перший імпульс',
    'Touch the pulse in the open bay to pause target movement for eight steps.',
    'Торкніться імпульсу у відкритій кишені, щоб зупинити цілі на вісім кроків.',
    [
      [7, 5, 3, 3],
      [15, 10, 3, 3],
    ],
    null,
    { supplies: ['pulse'] },
  ],
  [
    'cable-service',
    'Cable Service',
    'Змотування кабелю',
    'The reel removes four tail cells, down to four. Both visual styles use the same rule.',
    'Котушка прибирає чотири клітинки хвоста, але залишає щонайменше чотири. Правило однакове для обох стилів.',
    [
      [5, 5, 14, 1],
      [5, 12, 14, 1],
      [5, 6, 1, 4],
      [18, 8, 1, 4],
      [10, 8, 4, 2],
    ],
    null,
    { supplies: ['reel'] },
  ],
  [
    'choose-the-detour',
    'Choose the Detour',
    'Обери обхід',
    'A side supply bay costs a detour. Decide whether space or interception matters now.',
    'Бічна кишеня з припасами потребує обходу. Обирайте між простором і перехопленням.',
    [
      [6, 5, 11, 2],
      [6, 11, 11, 2],
      [6, 7, 2, 2],
      [18, 7, 2, 4],
    ],
    null,
    { supplies: ['pulse', 'reel'] },
  ],
  [
    'courier-crossing',
    'Courier Crossing',
    'Перехід кур’єра',
    'The courier is optional: 250 points and growth, without required-catch credit. It does not expire.',
    'Кур’єр необов’язковий: 250 очок і приріст хвоста, без заліку основної цілі. Він не зникає за таймером.',
    [
      [5, 5, 4, 3],
      [15, 10, 4, 3],
      [11, 4, 2, 2],
      [11, 12, 2, 2],
    ],
    null,
    { courier: true, supplies: ['pulse'] },
  ],
  [
    'shared-supply',
    'Shared Supply',
    'Спільні припаси',
    'Two loops meet at a supply junction. In Team, a pulse helps both heads; a reel shortens its collector.',
    'Дві петлі сходяться біля припасів. У команді імпульс допомагає обом, а котушка вкорочує хвіст того, хто її взяв.',
    [
      [5, 5, 4, 7],
      [15, 5, 4, 7],
      [10, 8, 4, 2],
    ],
    null,
    { supplies: ['reel', 'pulse'], two: true },
  ],
  [
    'last-offer',
    'Last Offer',
    'Остання пропозиція',
    'Courier offers follow required catches four and eight. Continue the main route if you prefer.',
    'Кур’єри пропонуються після четвертої та восьмої основної цілі. За бажанням продовжуйте головний маршрут.',
    [
      [5, 4, 3, 4],
      [10, 10, 4, 3],
      [17, 4, 3, 6],
      [4, 12, 3, 2],
    ],
    null,
    { courier: true, supplies: ['pulse', 'reel'] },
  ],
  [
    'patrol-into-sprint',
    'Patrol into Sprint',
    'Від патруля до ривка',
    'Alternate predictable patrols and warned sprints around two nested circuits.',
    'Чергуйте передбачувані патрулі й ривки з попередженням навколо двох вкладених кіл.',
    [
      [6, 5, 12, 1],
      [6, 12, 12, 1],
      [6, 6, 1, 4],
      [17, 8, 1, 4],
      [10, 8, 4, 2],
    ],
    null,
    { mixed: true, two: true },
  ],
  [
    'runner-at-the-window',
    'Runner at the Window',
    'Бігун біля вікна',
    'A runner can change direction near the timed shortcut. Leave the long ring open.',
    'Бігун може змінити напрямок біля тимчасового зрізу. Залишайте довге кільце відкритим.',
    [
      [7, 4, 12, 1],
      [7, 13, 12, 1],
      [7, 5, 1, 4],
      [7, 11, 1, 2],
      [18, 5, 1, 2],
      [18, 10, 1, 3],
      [12, 8, 2, 2],
    ],
    null,
    {
      gates: [
        [
          [7, 9],
          [7, 10],
        ],
      ],
      supplies: ['pulse'],
    },
  ],
  [
    'border-relay',
    'Border Relay',
    'Естафета через край',
    'Wrap between offset chicanes. Both targets remain ordinary catchable humanoids.',
    'Переходьте через край між зміщеними шиканами. Обидві цілі — звичайні гуманоїди для перехоплення.',
    [
      [6, 4, 2, 9],
      [14, 0, 2, 6],
      [17, 10, 2, 8],
      [11, 8, 2, 2],
    ],
    null,
    { wrap: true, two: true, secondSpawn: [12, 15] },
  ],
  [
    'forked-interception',
    'Forked Interception',
    'Перехоплення на розвилці',
    'Two targets share three return routes. Commit only after checking your growing tail.',
    'Дві цілі ділять три шляхи повернення. Обирайте напрямок після перевірки зростаючого хвоста.',
    [
      [7, 0, 2, 6],
      [15, 12, 2, 6],
      [0, 9, 5, 2],
      [18, 7, 6, 2],
      [11, 6, 2, 6],
    ],
    null,
    { two: true },
  ],
  [
    'supply-circuit',
    'Supply Circuit',
    'Коло припасів',
    'Supply detours and a yielding shutter share one circuit. The optional courier never blocks completion.',
    'Обходи за припасами й заслінка ділять одне коло. Необов’язковий кур’єр не заважає завершенню.',
    [
      [6, 5, 4, 2],
      [13, 5, 5, 2],
      [6, 11, 12, 2],
      [6, 7, 2, 2],
      [16, 8, 2, 3],
    ],
    null,
    {
      gates: [
        [
          [10, 5],
          [11, 5],
          [12, 5],
          [10, 6],
          [11, 6],
          [12, 6],
        ],
      ],
      courier: true,
      supplies: ['pulse', 'reel'],
    },
  ],
  [
    'final-airfield',
    'Final Airfield',
    'Фінальний аеродром',
    'Three courtyards connect through open bypasses and two shutters. Choose targets and supplies without rushing a closed route.',
    'Три двори сполучені відкритими обходами й двома заслінками. Обирайте цілі та припаси, не поспішайте на закритий шлях.',
    [
      [7, 0, 2, 6],
      [7, 9, 2, 5],
      [15, 4, 2, 5],
      [15, 12, 2, 6],
      [10, 7, 3, 2],
    ],
    null,
    {
      gates: [
        [
          [7, 6],
          [8, 6],
          [7, 7],
          [8, 7],
          [7, 8],
          [8, 8],
        ],
        [
          [15, 9],
          [16, 9],
          [15, 10],
          [16, 10],
          [15, 11],
          [16, 11],
        ],
      ],
      supplies: ['pulse', 'reel'],
      two: true,
    },
  ],
];

function wallsFor(rectangles) {
  const cells = new Map();
  for (const [x, y, width, height] of rectangles)
    for (let row = y; row < y + height; row++)
      for (let column = x; column < x + width; column++)
        cells.set(`${column},${row}`, { x: column, y: row });
  return [...cells.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}
function cycle(corners) {
  const cells = [];
  for (let index = 0; index < corners.length; index++) {
    let [x, y] = corners[index];
    const [endX, endY] = corners[(index + 1) % corners.length];
    if (x !== endX && y !== endY) throw new Error('Patrol corners must be axis-aligned.');
    while (x !== endX || y !== endY) {
      cells.push({ x, y });
      x += Math.sign(endX - x);
      y += Math.sign(endY - y);
    }
  }
  return cells;
}
const outerRoute = [
  [1, 1],
  [22, 1],
  [22, 16],
  [1, 16],
];
const pads = [
  { x: 3, y: 4 },
  { x: 20, y: 14 },
  { x: 3, y: 14 },
  { x: 20, y: 3 },
];
export const CLASSIC_SNAKE_V2_CHAPTERS = freeze(
  chapterRows.map(([id, en, uk, enBrief, ukBrief]) => ({
    id: `classic-snake-${id}`,
    title: bilingual(en, uk),
    description: bilingual(enBrief, ukBrief),
  })),
);
// Quotas preserve supplies and long-body finales without repeating a teaching
// encounter fourteen times. Each row is an authored six-mission progression.
const pursuitGoals = [
  [3, 4, 4, 5, 5, 6],
  [5, 5, 6, 6, 7, 8],
  [5, 5, 6, 6, 7, 8],
  [6, 6, 7, 7, 8, 8],
  [8, 8, 8, 10, 8, 10],
  [9, 8, 10, 10, 10, 12],
];
export const CLASSIC_SNAKE_V2_LEVELS = freeze(
  rows.map(([slug, en, uk, enBrief, ukBrief, rectangles, route, options = {}], index) => {
    const chapter = Math.floor(index / 6),
      within = index % 6;
    const walls = wallsFor(rectangles),
      occupied = new Set(walls.map(({ x, y }) => `${x},${y}`));
    const path = cycle(route ?? outerRoute);
    let required =
      chapter === 0 || options.patrol
        ? [{ kind: 'patroller', every: 4, path }]
        : chapter === 2
          ? [{ kind: 'sprinter', every: 3 }]
          : [{ kind: 'runner', every: 3 }];
    if (options.mixed)
      required = [
        { kind: 'patroller', every: 4, path },
        { kind: 'sprinter', every: 3 },
        { kind: 'runner', every: 3 },
      ];
    else if (chapter === 5 && options.two)
      required = [
        { kind: 'runner', every: 3 },
        { kind: 'sprinter', every: 3 },
      ];
    // The first two patrols teach one route. Later patrol encounters return
    // from the opposite end, forcing a fresh interception instead of camping
    // the same spawn. Both paths retain precisely the accepted walkable loop.
    const returnPatrol = chapter === 0 && within >= 2;
    if (returnPatrol) {
      const halfway = Math.floor(path.length / 2);
      const reversed = [...path.slice(halfway), ...path.slice(0, halfway)].reverse();
      required = [...required, { kind: 'patroller', every: 4, path: reversed }];
    }
    const mixedRecovery = chapter === 2 && within >= 3;
    if (mixedRecovery) required = [...required, { kind: 'runner', every: 3 }];
    const id = `classic-pursuit-${slug}`;
    return {
      id,
      chapterId: CLASSIC_SNAKE_V2_CHAPTERS[chapter].id,
      title: bilingual(en, uk),
      description: bilingual(
        enBrief +
          (returnPatrol
            ? ' The next patrol returns from the opposite side: change your interception.'
            : mixedRecovery
              ? ' Runners alternate with sprinters; check which movement warning applies.'
              : ''),
        ukBrief +
          (returnPatrol
            ? ' Наступний патруль повертається з протилежного боку: змініть перехоплення.'
            : mixedRecovery
              ? ' Бігуни чергуються зі спринтерами; стежте за відповідним попередженням руху.'
              : ''),
      ),
      level: {
        version: 'classic-snake-level.v2',
        id,
        revision: '2',
        name: en,
        width: WIDTH,
        height: HEIGHT,
        walls,
        spawns: [
          { x: 5, y: 2, direction: 'right' },
          {
            x: options.secondSpawn?.[0] ?? 18,
            y: options.secondSpawn?.[1] ?? 15,
            direction: 'left',
          },
        ],
        goal: pursuitGoals[chapter][within],
        stepMs: 200,
        speedupEvery: 0,
        minStepMs: 200,
        wrap: options.wrap ?? false,
        targetMovement: 'still',
        fleeEvery: 3,
        objective: 'mission',
        targets: {
          maxActive: options.two || options.courier ? 2 : 1,
          required,
          bonus: options.courier
            ? { at: [4, 8], policy: { kind: 'courier', every: 4, path } }
            : null,
        },
        shutters: (options.gates ?? []).map((cells, i) => ({
          id: `shutter-${i + 1}`,
          cells: cells.map(([x, y]) => ({ x, y })),
          phase: i * 24,
        })),
        pickups: (options.supplies ?? []).map((kind, i) => ({
          at: 2 + i * 4,
          kind,
          pads: pads.filter(({ x, y }) => !occupied.has(`${x},${y}`)),
        })),
      },
    };
  }),
);
