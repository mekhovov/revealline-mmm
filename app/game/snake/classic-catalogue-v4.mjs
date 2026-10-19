/** Additive authored encounters. Historical level recipes remain byte-for-byte unchanged. */
import {
  CLASSIC_SNAKE_EXPEDITION_CHAPTERS,
  CLASSIC_SNAKE_EXPEDITION_LEVELS,
} from './classic-catalogue-expeditions.mjs';
const bilingual = (en, uk) => ({ en, uk });
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const cell = ([x, y]) => ({ x, y });
function rectanglePath(x, y, w, h) {
  const path = [];
  for (let dx = 0; dx < w; dx++) path.push({ x: x + dx, y });
  for (let dy = 1; dy < h; dy++) path.push({ x: x + w - 1, y: y + dy });
  for (let dx = w - 2; dx >= 0; dx--) path.push({ x: x + dx, y: y + h - 1 });
  for (let dy = h - 2; dy > 0; dy--) path.push({ x, y: y + dy });
  return path;
}
function wallsFor(rectangles) {
  const cells = new Map();
  for (const [x, y, w, h] of rectangles)
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++) cells.set(`${x + dx},${y + dy}`, { x: x + dx, y: y + dy });
  return [...cells.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}
const jammer = (at = [20, 8], signalProfile = 'local-burst-v2') => ({
  kind: 'jammer',
  every: 3,
  at: cell(at),
  signalProfile,
});
const lane = (at = [5, 8]) => ({
  kind: 'lane',
  every: 3,
  at: cell(at),
  lane: { axis: 'x', from: 5, to: 18 },
});
const relay = (
  at = [12, 8],
  pads = [
    [6, 8],
    [18, 8],
  ],
) => ({ kind: 'relay', every: 3, at: cell(at), relays: pads.map(cell) });
const perimeter = () => ({ kind: 'perimeter', every: 4, path: rectanglePath(1, 1, 22, 16) });
const contour = () => ({ kind: 'contour', every: 4, path: rectanglePath(8, 5, 8, 8) });
const rover = () => ({ kind: 'rover', every: 3 });
const ricochet = () => ({ kind: 'ricochet', every: 3, heading: 'right' });
const eroder = () => ({ kind: 'eroder', every: 3, at: cell([11, 8]), breaks: [cell([12, 8])] });
const guard = (at = [6, 8], heading = 'right') => ({
  kind: 'guard',
  every: 3,
  at: cell(at),
  heading,
});
const runner = () => ({ kind: 'runner', every: 3 });
export const CLASSIC_SNAKE_V4_CHAPTERS = freeze([
  {
    id: 'classic-snake-signal-tactics',
    title: bilingual('Signal Tactics', 'Тактика сигналу'),
    description: bilingual(
      'Ten missions teach local and broadcast interference, warned lanes and linked relays.',
      'Десять місій навчають локальним і загальним перешкодам, попередженим смугам і пов’язаним ретрансляторам.',
    ),
  },
  {
    id: 'classic-snake-patrol-frontiers',
    title: bilingual('Patrol Frontiers', 'Межі патруля'),
    description: bilingual(
      'Six missions introduce perimeter patrols, contour routes and waking rovers.',
      'Шість місій знайомлять із патрулями периметра, контурними маршрутами та пробудженням роверів.',
    ),
  },
  {
    id: 'classic-snake-field-mastery',
    title: bilingual('Field Mastery', 'Майстерність поля'),
    description: bilingual(
      'Eight missions combine reflected routes, opening walls and warned projectiles.',
      'Вісім місій поєднують відбиті маршрути, відкриття стін і попереджені постріли.',
    ),
  },
  ...CLASSIC_SNAKE_EXPEDITION_CHAPTERS,
]);
// Each introduction isolates its new idea. Mastery adds geometry before combining mechanics.
const first = [
  [
    'signal-check',
    'Signal Check',
    'Перевірка сигналу',
    [[10, 5, 3, 3]],
    [jammer(), jammer([3, 10])],
    4,
    'The antenna warns before a short burst distorts its six-cell zone. Skirt the zone or catch the visible jammer to clear it. Each retry has a fresh signal rhythm.',
    'Антена попереджає перед коротким спотворенням у зоні шести клітин. Обходьте зону або ловіть видимий глушник. Кожна нова спроба має інший ритм перешкод.',
  ],
  [
    'quiet-return',
    'Quiet Return',
    'Тихе повернення',
    [
      [8, 4, 2, 5],
      [14, 10, 3, 3],
    ],
    [jammer(), runner(), jammer([3, 10])],
    6,
    'Use the clear ground outside the jammer zone, then approach during recovery. The antenna stays visible through interference.',
    'Користуйтеся чистою ділянкою поза зоною глушника й наближайтеся під час відновлення. Антена залишається видимою крізь перешкоди.',
  ],
  [
    'lane-window',
    'Lane Window',
    'Вікно смуги',
    [[10, 4, 4, 2]],
    [lane(), lane([18, 8])],
    4,
    'Dashed marks warn before the lane turns solid. Cross during recovery, or use either permanent end bypass.',
    'Пунктир попереджає перед активацією смуги. Перетинайте її під час відновлення або обходьте з кінців.',
  ],
  [
    'two-returns',
    'Two Returns',
    'Два обходи',
    [
      [9, 4, 2, 3],
      [14, 10, 2, 4],
    ],
    [lane(), runner(), lane([18, 8])],
    6,
    'Only the head is vulnerable to the active lane. Your trailing cable can pass safely.',
    'Активна смуга небезпечна лише для голови. Кабель позаду проходить безпечно.',
  ],
  [
    'relay-key',
    'Relay Key',
    'Ключ ретранслятора',
    [
      [10, 4, 4, 2],
      [10, 11, 4, 2],
    ],
    [relay()],
    1,
    'Touch both diamond relays, then catch the opened sentinel. Relays do not grow your cable; the opening stays available.',
    'Торкніться обох ромбів, потім ловіть відкритого вартового. Ретранслятори не подовжують кабель; вікно не закривається.',
  ],
  [
    'linked-courts',
    'Linked Courts',
    'Пов’язані двори',
    [
      [8, 4, 2, 3],
      [14, 11, 2, 3],
      [4, 11, 2, 2],
    ],
    [
      relay(
        [12, 8],
        [
          [4, 5],
          [20, 12],
        ],
      ),
    ],
    1,
    'Visit the two courts before approaching the locked core. Leave a clear route back to the center.',
    'Відвідайте обидва двори перед наближенням до замкненого ядра. Залиште вільний шлях до центру.',
  ],
  [
    'broadcast-check',
    'Broadcast Check',
    'Перевірка трансляції',
    [[7, 6, 3, 4]],
    [jammer([19, 9], 'broadcast-burst-v1')],
    4,
    'This antenna disrupts the whole live feed. Follow its visible source through each short burst, then catch it to restore reception.',
    'Ця антена спотворює все поле наживо. Стежте за видимим джерелом під час коротких сплесків і ловіть його для відновлення прийому.',
  ],
  [
    'quiet-channel',
    'Quiet Channel',
    'Тихий канал',
    [
      [6, 4, 3, 3],
      [15, 10, 3, 4],
    ],
    [jammer([20, 8], 'broadcast-burst-v1'), jammer([3, 10], 'broadcast-burst-v1'), runner()],
    6,
    'Two antennas share one feed. Only one transmits at a time, with a guaranteed clear interval. Plan the next approach while the picture is clean.',
    'Дві антени ділять один ефір. Одночасно передає лише одна, а між сплесками є чистий інтервал. Плануйте наближення, поки зображення чітке.',
  ],
  [
    'signal-crossing',
    'Signal Crossing',
    'Сигнальний перехід',
    [
      [9, 4, 3, 3],
      [13, 11, 3, 3],
    ],
    [jammer(), lane()],
    6,
    'Route around the local interference. The lane waits for the burst to end, then gives a full new warning before attacking.',
    'Обходьте локальні перешкоди. Смуга чекає завершення сплеску й дає повне нове попередження перед атакою.',
  ],
  [
    'relay-airfield',
    'Relay Airfield',
    'Аеродром ретрансляторів',
    [
      [8, 4, 2, 3],
      [14, 11, 3, 3],
    ],
    [
      jammer([20, 8], 'broadcast-burst-v1'),
      lane(),
      relay(
        [12, 8],
        [
          [3, 5],
          [20, 12],
        ],
      ),
    ],
    6,
    'Broadcast bursts briefly distort the whole feed. Catch the visible antenna, then use clear intervals to reach both relays. No lane starts an attack during interference.',
    'Сплески трансляції ненадовго спотворюють усе поле. Спіймайте видиму антену й використовуйте чисті інтервали, щоб дістатися обох ретрансляторів. Під час перешкод смуга не починає атаку.',
  ],
];
const patrols = [
  [
    'border-watch',
    'Border Watch',
    'Варта кордону',
    [[10, 6, 4, 5]],
    [perimeter()],
    6,
    'The patrol follows the outer circuit. Cut across the empty interior to intercept it.',
    'Патруль рухається зовнішнім колом. Перетинайте відкритий центр для перехоплення.',
  ],
  [
    'border-cutoff',
    'Border Cutoff',
    'Перехоплення на кордоні',
    [
      [7, 5, 3, 3],
      [14, 10, 3, 3],
    ],
    [perimeter(), runner()],
    8,
    'Alternate perimeter interceptions with open-field catches. Leave your outer return clear.',
    'Чергуйте перехоплення на периметрі з ловлею в полі. Залиште зовнішній обхід вільним.',
  ],
  [
    'contour-orbit',
    'Contour Orbit',
    'Контурна орбіта',
    [[9, 6, 6, 6]],
    [contour()],
    6,
    'The crawler circles the island. Wait at the next corner instead of following its heels.',
    'Повзун обходить острів. Чекайте за наступним кутом, замість бігти слідом.',
  ],
  [
    'contour-transfer',
    'Contour Transfer',
    'Контурний перехід',
    [
      [9, 6, 6, 6],
      [3, 5, 2, 3],
    ],
    [contour(), perimeter()],
    8,
    'Inner and outer circuits require different shortcuts. Both patrols yield when your cable blocks their next cell.',
    'Внутрішнє й зовнішнє кола потребують різних зрізів. Обидва патрулі чекають, якщо кабель перекриває наступну клітину.',
  ],
  [
    'wake-watch',
    'Wake Watch',
    'Пильне пробудження',
    [[10, 5, 3, 4]],
    [rover()],
    6,
    'The dormant rover warns when you approach, then follows your position. Its body is always safe to catch.',
    'Сплячий ровер попереджає про наближення, потім прямує до вас. Його завжди безпечно ловити.',
  ],
  [
    'wake-courtyard',
    'Wake Courtyard',
    'Двір пробудження',
    [
      [7, 5, 3, 5],
      [15, 8, 2, 5],
    ],
    [rover(), perimeter()],
    8,
    'Wake the rover from an open approach, then meet the outer patrol on a different return.',
    'Будіть ровер з відкритого боку, потім зустрічайте зовнішній патруль на іншому обході.',
  ],
];
const mastery = [
  [
    'ricochet-line',
    'Ricochet Line',
    'Лінія відбиття',
    [[9, 5, 2, 6]],
    [ricochet()],
    6,
    'This target reflects when blocked. Predict the return along its straight instead of chasing it.',
    'Ціль відбивається від перешкод. Передбачайте повернення вздовж прямої, замість переслідування.',
  ],
  [
    'ricochet-yard',
    'Ricochet Yard',
    'Двір відбиття',
    [
      [7, 5, 2, 5],
      [15, 9, 3, 3],
    ],
    [ricochet(), rover()],
    8,
    'Use island corners to intercept reflected routes while the rover announces its approach.',
    'Використовуйте кути островів для перехоплення, поки ровер оголошує наближення.',
  ],
  [
    'open-seam',
    'Open Seam',
    'Відкритий шов',
    [[12, 6, 2, 5]],
    [eroder(), runner()],
    4,
    'The marked wall opens after the eroder warns. No wall ever closes behind your cable.',
    'Позначена стіна відкриється після попередження руйнівника. Жодна стіна не закривається за кабелем.',
  ],
  [
    'seam-return',
    'Seam Return',
    'Обхід шва',
    [
      [12, 5, 3, 7],
      [5, 11, 3, 2],
    ],
    [eroder(), ricochet()],
    6,
    'Opening the marked edge creates a new turn pocket. Keep the permanent outer route as your fallback.',
    'Відкриття краю створює нову кишеню для повороту. Збережіть постійний зовнішній обхід.',
  ],
  [
    'guard-line',
    'Guard Line',
    'Лінія охоронця',
    [
      [10, 4, 3, 3],
      [10, 10, 3, 3],
    ],
    [guard(), guard([18, 8], 'left')],
    4,
    'The guard fixes its aim before firing. Dodge the marked next projectile cell; only your head can be hit.',
    'Охоронець фіксує приціл перед пострілом. Уникайте позначеної наступної клітини снаряда; небезпечний удар лише в голову.',
  ],
  [
    'guard-return',
    'Guard Return',
    'Обхід охоронця',
    [
      [10, 4, 4, 3],
      [8, 11, 3, 3],
    ],
    [guard(), rover(), guard([18, 8], 'left')],
    6,
    'Approach the guard from the side while its shot travels away. Catching it clears its remaining shots.',
    'Наближайтеся до охоронця збоку, поки постріл летить геть. Ловля прибирає його решту снарядів.',
  ],
  [
    'field-links',
    'Field Links',
    'Польові зв’язки',
    [
      [12, 6, 2, 5],
      [6, 5, 2, 2],
    ],
    [eroder(), jammer(), guard()],
    6,
    'Keep the marked wall in view and skirt the interference zone. New shots wait until reception recovers and a full warning is shown.',
    'Тримайте позначену стіну в полі зору й обходьте зону перешкод. Нові постріли чекають відновлення прийому й повного попередження.',
  ],
  [
    'field-finale',
    'Field Finale',
    'Фінал поля',
    [
      [9, 5, 3, 2],
      [13, 11, 4, 3],
      [4, 11, 2, 2],
    ],
    [
      lane(),
      relay(
        [12, 8],
        [
          [3, 5],
          [20, 12],
        ],
      ),
      guard(),
      ricochet(),
    ],
    8,
    'Finish the circuit with clear warnings, permanent bypasses and a relay opening that stays unlocked.',
    'Завершіть коло з чіткими попередженнями, постійними обходами й незмінно відкритим ретранслятором.',
  ],
];
const refugeGoals = [
  [3, 4],
  [20, 4],
  [20, 13],
  [3, 13],
].map(cell);
const refuge = () => ({ kind: 'refuge', every: 3, goals: refugeGoals });
const switchback = () => ({ kind: 'switchback', every: 3, goals: refugeGoals });
const verticalLane = (at) => ({
  kind: 'lane',
  every: 3,
  at: cell(at),
  lane: { axis: 'y', from: 4, to: 13 },
});
const notch = (at, wall) => ({ kind: 'eroder', every: 3, at: cell(at), breaks: [cell(wall)] });
// Distinct accepted stations replace catch-quota loops. Older exact recipes
// live in the field archive; a current revision never reinterprets a recording.
const revised = {
  'signal-check': {
    goal: 2,
    description: bilingual(
      'Two antennas teach local reception. Enemies disappear during a burst; skirt the circle or catch the source at its beacon.',
      'Дві антени навчають локальному прийому. Під час перешкод вороги зникають; обходьте коло або ловіть джерело за маячком.',
    ),
  },
  'quiet-return': {
    maxActive: 2,
    spawns: [
      { x: 5, y: 2, direction: 'right' },
      { x: 5, y: 15, direction: 'right' },
    ],
    targets: [
      jammer(),
      { kind: 'patroller', every: 4, path: rectanglePath(17, 12, 5, 4) },
      runner(),
      refuge(),
      runner(),
      switchback(),
    ],
    description: bilingual(
      'Prey keeps arriving while the antenna survives. Read its route before the warning ends, leave coverage, or take the long approach to the beacon.',
      'Поки антена працює, прибуває нова здобич. Читайте маршрут до кінця попередження, виходьте із зони або обирайте довший шлях до маячка.',
    ),
  },
  'lane-window': {
    goal: 3,
    targets: [lane(), lane([18, 11]), verticalLane([6, 5])],
    description: bilingual(
      'Three different crossings teach horizontal and vertical warnings. Use the recovery window or a permanent end bypass.',
      'Три різні переходи навчають горизонтальним і вертикальним попередженням. Проходьте під час відновлення або обходьте кінці.',
    ),
  },
  'two-returns': {
    goal: 4,
    maxActive: 2,
    targets: [lane(), runner(), verticalLane([18, 5]), refuge()],
    description: bilingual(
      'A moving target changes which lane return is useful. Cross during recovery; only the head is vulnerable.',
      'Рухлива ціль змінює вигідний обхід смуги. Перетинайте під час відновлення; небезпека лише для голови.',
    ),
  },
  'broadcast-check': {
    goal: 3,
    targets: [
      jammer([19, 9], 'broadcast-burst-v1'),
      jammer([4, 12], 'broadcast-burst-v1'),
      jammer([17, 4], 'broadcast-burst-v1'),
    ],
    description: bilingual(
      'Visit three different broadcast posts. Bursts hide enemy bodies across the board; each antenna beacon still marks a source you can catch.',
      'Відвідайте три різні пости трансляції. Перешкоди приховують ворогів на всьому полі; маячок кожної антени позначає джерело, яке можна спіймати.',
    ),
  },
  'quiet-channel': {
    targets: [
      jammer([20, 8], 'broadcast-burst-v1'),
      runner(),
      jammer([3, 10], 'broadcast-burst-v1'),
      switchback(),
      jammer([20, 4], 'broadcast-burst-v1'),
      refuge(),
    ],
    description: bilingual(
      'Prey keeps moving and can turn unseen during broadcast. Plan from the clear feed, follow a beacon, or intercept before the next warning.',
      'Під час трансляції здобич рухається й може непомітно повернути. Плануйте за чистим зображенням, прямуйте до маячка або перехоплюйте до попередження.',
    ),
  },
  'signal-crossing': {
    targets: [jammer(), runner(), lane(), jammer([3, 12]), verticalLane([18, 5]), refuge()],
    description: bilingual(
      'Each source and lane has a different approach. Moving prey disappears during interference; new lane attacks wait for clear reception and a full warning.',
      'Кожне джерело й смуга мають інший підхід. Здобич зникає під час перешкод; нові атаки чекають чистого прийому й повного попередження.',
    ),
  },
  'relay-airfield': {
    targets: [
      jammer([20, 8], 'broadcast-burst-v1'),
      runner(),
      relay(
        [12, 8],
        [
          [3, 5],
          [20, 12],
        ],
      ),
      lane(),
      relay(
        [18, 5],
        [
          [4, 12],
          [20, 4],
        ],
      ),
      refuge(),
    ],
    description: bilingual(
      'Two cores use different relay pairs. Clear the broadcast beacon or plan the pad route before enemies disappear; openings stay available.',
      'Два ядра мають різні пари ретрансляторів. Приберіть маячок трансляції або плануйте шлях до зникнення ворогів; ядра залишаться відкритими.',
    ),
  },
  'open-seam': {
    goal: 2,
    rectangles: [[12, 6, 1, 5]],
    description: bilingual(
      'Let one eroder open the marked shortcut, then intercept the runner. The permanent outside route remains available.',
      'Дайте руйнівнику відкрити позначений прохід, потім перехоплюйте бігуна. Постійний зовнішній обхід залишається доступним.',
    ),
  },
  'seam-return': {
    goal: 4,
    maxActive: 2,
    rectangles: [
      [12, 5, 1, 8],
      [5, 11, 3, 2],
    ],
    targets: [notch([11, 6], [12, 6]), ricochet(), notch([13, 10], [12, 10]), refuge()],
    description: bilingual(
      'Two different marked notches change the return route. Intercept moving prey through an opening or keep the longer bypass.',
      'Два різні позначені проходи змінюють шлях назад. Перехоплюйте рухливу здобич через отвір або користуйтеся довшим обходом.',
    ),
  },
  'guard-line': {
    goal: 3,
    targets: [guard(), guard([18, 8], 'left'), guard([4, 12], 'up')],
    description: bilingual(
      'Three guards face different approaches. Cross behind a departing shot and catch each post from the side.',
      'Три охоронці дивляться в різні боки. Проходьте за снарядом і ловіть кожен пост збоку.',
    ),
  },
  'guard-return': {
    maxActive: 2,
    targets: [guard(), rover(), guard([18, 8], 'left'), rover(), guard([4, 12], 'up'), runner()],
    description: bilingual(
      'Rovers share the approaches to three different guards. Choose a safe flank while keeping your next interception open.',
      'Ровери ділять підходи з трьома різними охоронцями. Обирайте безпечний обхід, залишаючи наступне перехоплення відкритим.',
    ),
  },
  'field-links': {
    rectangles: [
      [12, 6, 1, 5],
      [6, 5, 2, 2],
    ],
    targets: [
      jammer(),
      { kind: 'patroller', every: 4, path: rectanglePath(17, 12, 5, 4) },
      eroder(),
      guard([6, 10], 'up'),
      notch([13, 6], [12, 6]),
      refuge(),
    ],
    description: bilingual(
      'Open two different routes while moving prey shares local interference. The antenna beacon and attack warnings remain visible when enemies disappear.',
      'Відкривайте два різні маршрути, поки рухлива здобич потрапляє під локальні перешкоди. Маячок антени й попередження видно навіть тоді, коли вороги зникають.',
    ),
  },
  'field-finale': {
    targets: [
      lane(),
      relay(
        [12, 8],
        [
          [3, 5],
          [20, 12],
        ],
      ),
      guard(),
      ricochet(),
      verticalLane([18, 4]),
      relay(
        [4, 7],
        [
          [3, 12],
          [20, 4],
        ],
      ),
      guard([20, 13], 'up'),
      runner(),
    ],
    pickups: [
      {
        at: 4,
        kind: 'reel',
        pads: [
          [3, 4],
          [20, 4],
          [3, 14],
          [20, 14],
        ].map(cell),
      },
    ],
    description: bilingual(
      'Eight encounters use distinct posts, relay pairs and lane directions. Take Reel when the growing cable makes the short return harder.',
      'Вісім зустрічей мають різні пости, пари ретрансляторів і напрямки смуг. Беріть котушку, коли кабель ускладнює короткий обхід.',
    ),
  },
};
function entries(rows, chapter) {
  return rows.map(([slug, en, uk, rectangles, targets, goal, enBrief, ukBrief]) => {
    const id = `classic-field-${slug}`;
    const change = revised[slug];
    const previousRevision = targets.some((target) => target.signalProfile === 'local-burst-v2')
      ? 3
      : slug === 'relay-airfield'
        ? 2
        : 1;
    return {
      id,
      chapterId: CLASSIC_SNAKE_V4_CHAPTERS[chapter].id,
      title: bilingual(en, uk),
      description: change?.description ?? bilingual(enBrief, ukBrief),
      level: {
        version: 'classic-snake-level.v4',
        id,
        revision: String(previousRevision + (change ? 1 : 0)),
        name: en,
        width: 24,
        height: 18,
        walls: wallsFor(change?.rectangles ?? rectangles),
        spawns: change?.spawns ?? [
          { x: 5, y: 2, direction: 'right' },
          { x: 18, y: 15, direction: 'left' },
        ],
        goal: change?.goal ?? goal,
        stepMs: 200,
        speedupEvery: 0,
        minStepMs: 200,
        wrap: false,
        targetMovement: 'still',
        fleeEvery: 3,
        objective: 'mission',
        targets: {
          maxActive:
            change?.maxActive ??
            ([
              'signal-crossing',
              'relay-airfield',
              'field-links',
              'field-finale',
              'quiet-channel',
            ].includes(slug)
              ? 2
              : 1),
          required: change?.targets ?? targets,
          bonus: null,
        },
        shutters: [],
        pickups: change?.pickups ?? [],
      },
    };
  });
}
export const CLASSIC_SNAKE_V4_INITIAL_LEVELS = freeze(entries(first, 0));
export const CLASSIC_SNAKE_V4_PATROL_LEVELS = freeze(entries(patrols, 1));
export const CLASSIC_SNAKE_V4_MASTERY_LEVELS = freeze(entries(mastery, 2));
export const CLASSIC_SNAKE_V4_LEVELS = freeze([
  ...CLASSIC_SNAKE_V4_INITIAL_LEVELS,
  ...CLASSIC_SNAKE_V4_PATROL_LEVELS,
  ...CLASSIC_SNAKE_V4_MASTERY_LEVELS,
  ...CLASSIC_SNAKE_EXPEDITION_LEVELS,
]);
