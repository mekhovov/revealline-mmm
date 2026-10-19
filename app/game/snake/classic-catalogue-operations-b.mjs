import {
  bi,
  at,
  stage,
  activate,
  parcel,
  dock,
  plate,
  prey,
  jammer,
  lane,
  guard,
  junction,
  patrol,
  freeze,
  operationMission,
} from './classic-operation-recipes.mjs';

// Each encounter is authored. Helpers expand literal geometry; they never choose
// a tactical decision, palette or target using an ID hash or random generator.
const chapters = [
  [
    'signal-smugglers',
    'Signal Smugglers',
    'Контрабандисти сигналу',
    'Carry a route in memory, or restore reception before committing.',
    'Запам’ятайте маршрут або відновіть прийом перед вирішальним поворотом.',
    'relay',
    'summit-listening-posts',
    'tracks',
  ],
  [
    'breaking-ground',
    'Breaking Ground',
    'Нові проходи',
    'Choose whether a marked demolition is worth waiting for.',
    'Оберіть, чи варто чекати на позначений пролом.',
    'quarry',
    'excavation-terraces',
    'court',
  ],
  [
    'refuge-labyrinths',
    'Refuge Labyrinths',
    'Лабіринти укриттів',
    'Read an announced destination and reach its other entrance.',
    'Читайте оголошену ціль і діставайтеся іншого входу.',
    'orchard',
    'conservatory-courts',
    'rows',
  ],
  [
    'supply-gambits',
    'Supply Gambits',
    'Гамбіти припасів',
    'Trade a detour for a clear feed, shorter cable or safer delivery.',
    'Обмінюйте обхід на чистий сигнал, коротший кабель або безпечну доставку.',
    'freight',
    'supply-crane-bays',
    'bays',
  ],
  [
    'twin-operations',
    'Twin Operations',
    'Парні операції',
    'Coordinate two routes; every mission also works with one head.',
    'Узгоджуйте два маршрути; кожна місія доступна й одній голові.',
    'relay',
    'paired-observatory-courts',
    'court',
  ],
  [
    'living-citadels',
    'Living Citadels',
    'Живі цитаделі',
    'Build a route through moving prey, changing shortcuts and a final extraction.',
    'Прокладіть шлях через рухливу здобич, змінні зрізи й фінальну евакуацію.',
    'quarry',
    'reclaimed-citadel',
    'rows',
  ],
];
export const CLASSIC_SNAKE_OPERATION_CHAPTERS_B = freeze(
  chapters.map(([slug, en, uk, de, du, scene, mood, zoning]) => ({
    id: `classic-snake-${slug}`,
    title: bi(en, uk),
    description: bi(de, du),
    composition: { scene, mood, zoning },
  })),
);
const rows = [];
function add(chapter, slug, en, uk, de, du, config) {
  const world = CLASSIC_SNAKE_OPERATION_CHAPTERS_B.find(
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
          world.scene === 'relay'
            ? 'receiver-lights'
            : world.scene === 'orchard'
              ? 'irrigation'
              : 'equipment-lights',
      },
    }),
  );
}
const bays = [
  [3, 4],
  [20, 4],
  [20, 13],
  [3, 13],
];
const refuge = (goals = bays) => prey('refuge', 3, goals);
const turner = (goals = bays) => prey('switchback', 3, goals);
const pair = (goals = bays) => prey('pair', 3, goals);
const erosion = (x, y, bx, by) => ({
  kind: 'eroder',
  every: 3,
  at: at(x, y),
  breaks: [at(bx, by)],
});
const ricochet = (heading = 'right') => ({ kind: 'ricochet', every: 3, heading });
const relay = (x, y, pads) => ({
  kind: 'relay',
  every: 3,
  at: at(x, y),
  relays: pads.map((p) => at(...p)),
});
const supply = (kind, n, pads = bays) => ({ at: n, kind, pads: pads.map((p) => at(...p)) });
const hold = (id) => activate('plate', id);
const route = (id) => activate('switchyard', id);

add(
  'signal-smugglers',
  'silent-parcel',
  'Silent Parcel',
  'Тихий пакунок',
  'Take the parcel around the local circle, or catch the antenna before crossing its center. Deliver before the far-side extraction.',
  'Пронесіть пакунок навколо локального кола або спіймайте антену перед проходом через центр. Доставте вантаж до евакуації на іншому боці.',
  {
    walls: [
      [10, 5, 3, 3],
      [10, 11, 3, 3],
    ],
    targets: [jammer(18, 8), prey()],
    active: 2,
    parcels: [parcel('a', 7, 4), parcel('b', 17, 12)],
    docks: [dock('a', 4, 13)],
    stages: [stage('delivery', 1, null, ['a', 'b']), stage('clear', 2, at(20, 3))],
  },
);
add(
  'signal-smugglers',
  'ridge-reception',
  'Ridge Reception',
  'Прийом на хребті',
  'A narrow central ridge separates two antennas. Clear the near source, use the opposite flank, then take the moving target to the summit exit.',
  'Вузький центральний хребет розділяє дві антени. Приберіть ближню, обійдіть інший фланг і перехопіть рухливу ціль перед виходом.',
  {
    walls: [
      [11, 4, 2, 10],
      [5, 10, 3, 2],
    ],
    targets: [jammer(6, 7), jammer(18, 10), turner()],
    active: 2,
    stages: [stage('near', 1, at(4, 13)), stage('summit', 3, at(20, 4))],
  },
);
add(
  'signal-smugglers',
  'broadcast-freight',
  'Broadcast Freight',
  'Вантаж у перешкодах',
  'Broadcast can hide the runner anywhere. Load two parcels on opposite sides; restore reception or memorize the broad return to their shared dock.',
  'Трансляція може приховати бігуна будь-де. Візьміть два пакунки з різних боків; відновіть прийом або запам’ятайте широкий шлях до спільного доку.',
  {
    walls: [
      [7, 6, 3, 4],
      [15, 7, 3, 4],
    ],
    targets: [jammer(20, 6, true), prey()],
    active: 2,
    parcels: [parcel('a', 4, 5), parcel('b', 20, 13)],
    docks: [dock('a', 12, 14)],
    stages: [stage('cargo', 1, null, ['a', 'b']), stage('rendezvous', 2, at(12, 3))],
  },
);
{
  const g = junction('radio-route', 1, 12, 8, [[5, 8]], 4, 3, 4, 3);
  add(
    'signal-smugglers',
    'unseen-dispatch',
    'Unseen Dispatch',
    'Невидиме відправлення',
    'Select the patrol’s next branch before broadcast hides it. The switch and junction stay readable; catch the source if you lose the route.',
    'Оберіть наступну гілку патруля до втрати зображення. Важіль і розвилка залишаються видимими; спіймайте джерело, якщо втратите маршрут.',
    {
      walls: [
        [9, 6, 2, 1],
        [14, 10, 2, 1],
      ],
      targets: [jammer(20, 8, true), patrol(g), prey()],
      active: 2,
      switchyards: [g],
      stages: [
        stage('dispatch', 1, at(5, 13), [], [route(g.id)]),
        stage('intercept', 3, at(19, 4)),
      ],
    },
  );
}
add(
  'signal-smugglers',
  'clear-side-channel',
  'Clear Side Channel',
  'Чистий бічний канал',
  'The clear wrapping edge is shorter than the covered middle. Carry one delivery across the seam, then approach a different local source from outside its circle.',
  'Чистий край із переходом коротший за середину під перешкодами. Перенесіть вантаж через край, потім наблизьтеся до іншого джерела з-за його кола.',
  {
    wrap: true,
    walls: [
      [8, 4, 2, 9],
      [15, 6, 2, 8],
    ],
    targets: [jammer(12, 4), prey(), jammer(19, 12), refuge()],
    active: 2,
    parcels: [parcel('a', 2, 6), parcel('b', 21, 11, 'b')],
    docks: [dock('a', 21, 5), dock('b', 3, 12)],
    stages: [stage('seam', 2, null, ['a']), stage('return', 4, at(5, 9), ['b'])],
  },
);
add(
  'signal-smugglers',
  'pulse-rendezvous',
  'Pulse Rendezvous',
  'Зустріч під імпульсом',
  'One catch releases Pulse in a side bay. Use it to carry both parcels through broadcast, or eliminate the antenna and save the detour.',
  'Перше перехоплення відкриває імпульс у бічній кишені. Використайте його для двох пакунків під перешкодами або приберіть антену й заощадьте обхід.',
  {
    walls: [
      [8, 7, 8, 2],
      [5, 11, 2, 3],
    ],
    targets: [jammer(18, 5, true), refuge(), prey()],
    active: 2,
    pickups: [
      supply('pulse', 1, [
        [3, 7],
        [20, 12],
      ]),
    ],
    parcels: [parcel('a', 7, 4), parcel('b', 17, 13)],
    docks: [dock('a', 4, 13)],
    stages: [stage('clearance', 1, at(20, 3)), stage('cargo', 3, at(12, 12), ['a', 'b'])],
  },
);
{
  const p = plate('receiver', [[6, 9]], [[12, 8]]);
  add(
    'signal-smugglers',
    'receiver-bridge',
    'Receiver Bridge',
    'Міст приймача',
    'Your cable holds the receiver shortcut open. During the burst the gate remains visible, so trust the marked route while choosing which unseen prey to intercept.',
    'Кабель утримує зріз приймача відкритим. Під час перешкод ворота видимі: тримайтеся позначеного шляху, обираючи перехоплення невидимої здобичі.',
    {
      walls: [
        [12, 4, 1, 4],
        [12, 9, 1, 5],
      ],
      targets: [jammer(18, 8), prey(), refuge()],
      active: 2,
      plates: [p],
      stages: [stage('bridge', 1, at(18, 13), [], [hold(p.id)]), stage('return', 3, at(5, 4))],
    },
  );
}
add(
  'signal-smugglers',
  'summit-blackbird',
  'Summit Blackbird',
  'Дрізд на вершині',
  'A local approach becomes a broadcast return. The lane cannot newly arm during interference; use its visible recovery to finish the second delivery.',
  'Локальний підхід змінюється поверненням під трансляцією. Смуга не почне нову атаку під перешкодами; використайте її видиме відновлення для другої доставки.',
  {
    walls: [
      [9, 5, 2, 3],
      [14, 10, 3, 2],
    ],
    targets: [jammer(19, 5), prey(), jammer(4, 12, true), lane(18, 9, 'y', 4, 13)],
    active: 2,
    parcels: [parcel('a', 6, 6), parcel('b', 20, 12, 'b')],
    docks: [dock('a', 4, 14), dock('b', 19, 3)],
    stages: [
      stage('approach', 1, null, ['a']),
      stage('return', 3, null, ['b']),
      stage('summit', 4, at(12, 8)),
    ],
  },
);

add(
  'breaking-ground',
  'first-notch',
  'First Notch',
  'Перший пролом',
  'The marked stone can break open, but the outer path is always safe. Choose whether to wait for the shortcut before catching its eroder.',
  'Позначений камінь може відкрити прохід, але зовнішній шлях завжди безпечний. Вирішіть, чи чекати на зріз перед перехопленням руйнівника.',
  {
    walls: [
      [12, 5, 1, 8],
      [6, 10, 3, 2],
    ],
    targets: [erosion(11, 8, 12, 8), prey()],
    stages: [stage('survey', 1, at(18, 8)), stage('return', 2, at(5, 5))],
  },
);
add(
  'breaking-ground',
  'loaded-excavation',
  'Loaded Excavation',
  'Вантажні розкопки',
  'Loading lengthens the cable before the stone passage opens. Deliver around the wide end, or use the new notch after the warning.',
  'Вантаж подовжує кабель до відкриття кам’яного проходу. Обійдіть широкий край або використайте новий пролом після попередження.',
  {
    walls: [[11, 4, 2, 10]],
    targets: [erosion(10, 8, 11, 8), refuge(), prey()],
    active: 2,
    parcels: [parcel('a', 6, 5), parcel('b', 6, 12)],
    docks: [dock('a', 19, 9)],
    stages: [stage('load', 1, null, ['a', 'b']), stage('survey', 3, at(4, 14))],
  },
);
add(
  'breaking-ground',
  'stepped-masonry',
  'Stepped Masonry',
  'Ступінчаста кладка',
  'Two breaks alter different corners of a stepped island. Follow the runner around its end rather than expecting either opening to be ready.',
  'Два проломи змінюють різні кути ступінчастого острова. Обходьте його край за бігуном, не покладаючись на готовність проходів.',
  {
    walls: [
      [10, 5, 4, 2],
      [12, 7, 2, 5],
      [8, 11, 4, 2],
    ],
    targets: [erosion(9, 6, 10, 6), prey(), erosion(14, 9, 13, 9), turner()],
    active: 2,
    stages: [stage('upper', 2, at(18, 4)), stage('lower', 4, at(5, 13))],
  },
);
add(
  'breaking-ground',
  'survey-seam',
  'Survey Seam',
  'Шов розвідки',
  'Wrapping offers an immediate detour; demolition offers a later central cut. Choose a different route for the loaded return.',
  'Перехід через край дає негайний обхід, а руйнування — майбутній центральний зріз. Оберіть інший шлях для повернення з вантажем.',
  {
    wrap: true,
    walls: [
      [8, 4, 1, 10],
      [16, 4, 1, 10],
    ],
    targets: [erosion(7, 9, 8, 9), prey(), erosion(17, 6, 16, 6)],
    active: 2,
    parcels: [parcel('a', 4, 7), parcel('b', 19, 11)],
    docks: [dock('a', 12, 13)],
    stages: [stage('survey', 1, at(12, 4)), stage('freight', 3, at(3, 12), ['a', 'b'])],
  },
);
{
  const p = plate('cut-stone', [[6, 10]], [[12, 8]]);
  add(
    'breaking-ground',
    'temporary-permanent',
    'Temporary and Permanent',
    'Тимчасове й постійне',
    'The plate opens a temporary doorway; the eroder opens a permanent notch elsewhere. Release the cable route only after choosing your return.',
    'Плита відкриває тимчасові двері, а руйнівник — постійний пролом деінде. Відпускайте кабельний маршрут після вибору повернення.',
    {
      walls: [
        [12, 4, 1, 4],
        [12, 9, 1, 5],
        [7, 5, 2, 2],
      ],
      targets: [erosion(11, 11, 12, 11), prey(), refuge()],
      active: 2,
      plates: [p],
      stages: [stage('door', 1, at(18, 12), [], [hold(p.id)]), stage('notch', 3, at(5, 4))],
    },
  );
}
add(
  'breaking-ground',
  'ricochet-quarry',
  'Ricochet Quarry',
  'Кар’єр рикошетів',
  'A reflected hunter changes its route when a marked barrier disappears. Keep the open outer arc for your second delivery.',
  'Рикошетний мисливець змінює маршрут після зникнення позначеної перешкоди. Залишайте зовнішню дугу відкритою для другої доставки.',
  {
    walls: [
      [8, 6, 6, 1],
      [14, 6, 1, 7],
      [5, 11, 3, 2],
    ],
    targets: [erosion(10, 5, 10, 6), ricochet(), prey()],
    active: 2,
    parcels: [parcel('a', 6, 4), parcel('b', 18, 12, 'b')],
    docks: [dock('a', 19, 4), dock('b', 4, 14)],
    stages: [stage('arc', 1, null, ['a']), stage('reflection', 3, at(11, 13), ['b'])],
  },
);
add(
  'breaking-ground',
  'restored-arch',
  'Restored Arch',
  'Відновлена арка',
  'Visit both relay pads around the arch before catching its core. The side demolition helps the cargo return but is never required for escape.',
  'Обійдіть арку через дві панелі ретранслятора перед перехопленням ядра. Бічний пролом допомагає повернути вантаж, але не є єдиним виходом.',
  {
    walls: [
      [8, 5, 1, 8],
      [8, 5, 9, 1],
      [16, 5, 1, 8],
    ],
    targets: [
      relay(12, 8, [
        [6, 8],
        [18, 8],
      ]),
      erosion(7, 10, 8, 10),
      prey(),
    ],
    active: 2,
    parcels: [parcel('a', 10, 10), parcel('b', 14, 10)],
    docks: [dock('a', 12, 14)],
    stages: [stage('arch', 1, null, ['a', 'b']), stage('exit', 3, at(20, 4))],
  },
);
add(
  'breaking-ground',
  'garden-breaches',
  'Garden Breaches',
  'Проломи саду',
  'Three distinct notches and moving prey change the useful approach between stages. Clear the northern terrace, make the delivery, then leave through the south.',
  'Три різні проломи й рухлива здобич змінюють підхід між етапами. Очистіть північну терасу, доставте вантаж і вийдіть на півдні.',
  {
    walls: [
      [7, 6, 4, 1],
      [13, 6, 4, 1],
      [10, 10, 5, 1],
    ],
    targets: [
      erosion(8, 5, 8, 6),
      refuge(),
      erosion(15, 7, 15, 6),
      erosion(12, 11, 12, 10),
      prey(),
    ],
    active: 2,
    parcels: [parcel('a', 4, 8), parcel('b', 20, 9)],
    docks: [dock('a', 12, 13)],
    stages: [
      stage('north', 1, at(12, 3)),
      stage('delivery', 3, null, ['a', 'b']),
      stage('south', 5, at(5, 14)),
    ],
  },
);

add(
  'refuge-labyrinths',
  'glasshouse-intentions',
  'Glasshouse Intentions',
  'Наміри в оранжереї',
  'The seeker marks its next refuge across the glasshouse. Cut through the central aisle, then return outside before your cable fills it.',
  'Шукач позначає наступне укриття за оранжереєю. Зріжте через центральну алею, потім поверніться зовні, доки кабель не заповнив її.',
  {
    walls: [
      [7, 5, 2, 7],
      [15, 5, 2, 7],
    ],
    targets: [refuge()],
    stages: [stage('near', 1, at(12, 4)), stage('far', 3, at(12, 13))],
  },
);
add(
  'refuge-labyrinths',
  'orchard-forks',
  'Orchard Forks',
  'Розвилки саду',
  'A refuge seeker and a switchback announce different exits. Deliver to the middle dock before choosing which fork to intercept next.',
  'Шукач укриття й мінливий бігун оголошують різні виходи. Доставте вантаж у середній док перед вибором наступної розвилки.',
  {
    walls: [
      [8, 6, 1, 7],
      [8, 6, 7, 1],
      [15, 6, 1, 3],
    ],
    targets: [refuge(), turner(), prey()],
    active: 2,
    parcels: [parcel('a', 5, 5), parcel('b', 19, 12)],
    docks: [dock('a', 12, 11)],
    stages: [stage('delivery', 1, null, ['a', 'b']), stage('fork', 3, at(19, 4))],
  },
);
add(
  'refuge-labyrinths',
  'paired-shelters',
  'Paired Shelters',
  'Парні укриття',
  'Two partners seek one shelter; catching the first changes the survivor’s behavior. Rendezvous on the other side after each pair.',
  'Двоє партнерів шукають спільне укриття; перше перехоплення змінює поведінку вцілілого. Зустрічайтеся з іншого боку після кожної пари.',
  {
    walls: [
      [10, 4, 3, 4],
      [10, 10, 3, 4],
      [5, 8, 2, 2],
    ],
    targets: [pair()],
    active: 2,
    stages: [stage('east', 2, at(19, 8)), stage('west', 4, at(4, 8))],
  },
);
{
  const p = plate('hedge-door', [[5, 9]], [[12, 8]]);
  add(
    'refuge-labyrinths',
    'held-hedge',
    'Held Hedge',
    'Утримувана огорожа',
    'Hold the hedge doorway with your cable while the seeker changes bays. The outer garden remains open if your tail releases the plate.',
    'Утримуйте двері огорожі кабелем, поки шукач змінює кишеню. Зовнішній сад лишається відкритим, якщо хвіст відпустить плиту.',
    {
      walls: [
        [12, 4, 1, 4],
        [12, 9, 1, 5],
        [6, 5, 3, 2],
      ],
      targets: [refuge(), turner(), refuge()],
      active: 2,
      plates: [p],
      stages: [stage('hold', 1, at(18, 12), [], [hold(p.id)]), stage('garden', 3, at(5, 4))],
    },
  );
}
add(
  'refuge-labyrinths',
  'seedling-spiral',
  'Seedling Spiral',
  'Спіраль саджанців',
  'Two open-ended elbows offer a short inward delivery and a broad outward escape. The refuge intention may favor the opposite loop.',
  'Два відкриті вигини дають коротку доставку всередину й широкий вихід назовні. Намір шукача може вимагати протилежного кола.',
  {
    walls: [
      [7, 5, 9, 1],
      [7, 5, 1, 7],
      [11, 9, 7, 1],
      [17, 9, 1, 5],
    ],
    targets: [
      refuge([
        [4, 4],
        [19, 6],
        [14, 12],
        [4, 13],
      ]),
      turner(),
    ],
    active: 2,
    parcels: [parcel('a', 10, 7), parcel('b', 14, 11)],
    docks: [dock('a', 20, 14)],
    stages: [stage('seedlings', 1, null, ['a', 'b']), stage('outside', 4, at(4, 4))],
  },
);
add(
  'refuge-labyrinths',
  'garden-seam',
  'Garden Seam',
  'Край саду',
  'Read the destination across a wrapping edge. A cross-board delivery is short, but the cable arriving behind you can block the obvious interception.',
  'Читайте ціль за краєм із переходом. Доставка через край коротка, але кабель позаду може перекрити очевидне перехоплення.',
  {
    wrap: true,
    walls: [
      [7, 4, 2, 10],
      [16, 6, 2, 7],
    ],
    targets: [refuge(), turner()],
    active: 2,
    parcels: [parcel('a', 2, 7), parcel('b', 21, 12, 'b')],
    docks: [dock('a', 21, 6), dock('b', 3, 13)],
    stages: [stage('outbound', 1, null, ['a']), stage('home', 4, at(12, 9), ['b'])],
  },
);
add(
  'refuge-labyrinths',
  'quiet-conservatory',
  'Quiet Conservatory',
  'Тиха оранжерея',
  'Local interference hides a seeker after its destination warning. Leave the circle to confirm the route, or take the source beacon on the way to the dock.',
  'Локальні перешкоди приховують шукача після оголошення цілі. Вийдіть із кола для перевірки маршруту або заберіть джерело дорогою до доку.',
  {
    walls: [
      [9, 5, 2, 4],
      [14, 10, 3, 2],
    ],
    targets: [jammer(19, 9), refuge(), turner()],
    active: 2,
    parcels: [parcel('a', 6, 5), parcel('b', 18, 13)],
    docks: [dock('a', 4, 12)],
    stages: [stage('listen', 1, at(12, 4)), stage('delivery', 3, at(12, 14), ['a', 'b'])],
  },
);
add(
  'refuge-labyrinths',
  'three-garden-returns',
  'Three Garden Returns',
  'Три повернення садом',
  'Deliver into three different courts. Each stage releases a new parcel; refuge, switchback and sprinting prey demand different interceptions between docks.',
  'Доставляйте в три різні двори. Кожен етап відкриває новий пакунок; шукачі, мінливі бігуни й спринтери вимагають різних перехоплень.',
  {
    walls: [
      [7, 5, 2, 6],
      [12, 9, 3, 2],
      [17, 4, 1, 4],
    ],
    targets: [refuge(), turner(), prey('sprinter')],
    active: 2,
    parcels: [parcel('a', 4, 6), parcel('b', 12, 5, 'b'), parcel('c', 20, 12, 'c')],
    docks: [dock('a', 11, 13), dock('b', 20, 4), dock('c', 4, 13)],
    stages: [
      stage('west', 1, null, ['a']),
      stage('east', 2, null, ['b']),
      stage('home', 4, at(12, 14), ['c']),
    ],
  },
);

add(
  'supply-gambits',
  'pulse-loading-bay',
  'Pulse Loading Bay',
  'Вантажна кишеня імпульсу',
  'The first catch releases Pulse off the delivery line. Take it to freeze the runner while loaded, or use the clear outside return.',
  'Перше перехоплення відкриває імпульс осторонь доставки. Заморозьте бігуна під вантажем або скористайтеся вільним зовнішнім обходом.',
  {
    walls: [
      [9, 5, 5, 2],
      [9, 11, 5, 2],
    ],
    targets: [prey(), prey('sprinter')],
    active: 2,
    pickups: [supply('pulse', 1, [[4, 9]])],
    parcels: [parcel('a', 7, 4), parcel('b', 17, 13)],
    docks: [dock('a', 19, 8)],
    stages: [stage('offer', 1, at(6, 12)), stage('freight', 3, at(4, 4), ['a', 'b'])],
  },
);
add(
  'supply-gambits',
  'reel-before-return',
  'Reel Before Return',
  'Котушка перед поверненням',
  'Cargo length and catch growth share the narrow return. Reel removes ordinary tail but preserves carried parcels; unload before taking the tight inner corner.',
  'Вантаж і зростання хвоста ділять вузьке повернення. Котушка прибирає звичайний хвіст, зберігаючи пакунки; розвантажтеся перед тісним внутрішнім кутом.',
  {
    walls: [
      [8, 5, 1, 8],
      [8, 12, 9, 1],
      [16, 7, 1, 5],
    ],
    targets: [refuge(), prey()],
    active: 2,
    pickups: [
      supply('reel', 2, [
        [19, 12],
        [4, 5],
      ]),
    ],
    parcels: [parcel('a', 11, 7), parcel('b', 13, 10)],
    docks: [dock('a', 20, 5)],
    stages: [stage('load', 2, null, ['a', 'b']), stage('return', 4, at(4, 13))],
  },
);
add(
  'supply-gambits',
  'cold-window',
  'Cold Window',
  'Холодне вікно',
  'Pulse can hold a braced enemy in its current state. Collect it during recovery; delivery remains possible around the other side if its armor is closed.',
  'Імпульс утримує поточний стан броньованого ворога. Візьміть його під час відпочинку; якщо броня закрита, доставка доступна з іншого боку.',
  {
    walls: [
      [10, 5, 4, 3],
      [10, 11, 4, 2],
    ],
    targets: [prey('brace'), prey(), prey('brace')],
    active: 2,
    pickups: [
      supply('pulse', 1, [
        [5, 8],
        [19, 8],
      ]),
    ],
    parcels: [parcel('a', 6, 4), parcel('b', 18, 13)],
    docks: [dock('a', 12, 9)],
    stages: [stage('window', 1, null, ['a']), stage('return', 3, at(4, 14), ['b'])],
  },
);
add(
  'supply-gambits',
  'radio-spares',
  'Radio Spares',
  'Запчастини радіо',
  'Pulse competes with a direct antenna interception. Restore reception before approaching the switchback, then unload on the clear west side.',
  'Імпульс конкурує з прямим перехопленням антени. Відновіть прийом перед мінливим бігуном, потім розвантажтеся на чистому західному боці.',
  {
    walls: [
      [11, 5, 2, 8],
      [5, 10, 3, 2],
    ],
    targets: [jammer(18, 8, true), turner(), prey()],
    active: 2,
    pickups: [
      supply('pulse', 1, [
        [4, 7],
        [20, 13],
      ]),
    ],
    parcels: [parcel('a', 19, 4), parcel('b', 18, 12)],
    docks: [dock('a', 4, 13)],
    stages: [stage('signal', 1, at(6, 4)), stage('spares', 3, at(12, 14), ['a', 'b'])],
  },
);
{
  const p = plate('service-door', [[6, 9]], [[12, 8]]);
  add(
    'supply-gambits',
    'short-cable-long-door',
    'Short Cable, Long Door',
    'Короткий кабель, довгі двері',
    'Reel frees turning space but can release a cable-held doorway sooner. Choose the bypass before collecting the supply, then carry the second parcel back.',
    'Котушка звільняє місце для повороту, але може раніше відпустити кабельні двері. Оберіть обхід перед припасом і поверніть другий пакунок.',
    {
      walls: [
        [12, 4, 1, 4],
        [12, 9, 1, 5],
      ],
      targets: [prey(), refuge()],
      active: 2,
      plates: [p],
      pickups: [supply('reel', 1, [[18, 12]])],
      parcels: [parcel('a', 5, 5), parcel('b', 19, 13, 'b')],
      docks: [dock('a', 19, 4), dock('b', 4, 13)],
      stages: [stage('door', 1, null, ['a'], [hold(p.id)]), stage('return', 4, at(5, 8), ['b'])],
    },
  );
}
add(
  'supply-gambits',
  'freight-flank',
  'Freight Flank',
  'Вантажний фланг',
  'Shield facing makes the short cargo approach dangerous. Pulse does not remove its front; use a side flank or deliver along the longer open bay.',
  'Напрямок щита робить короткий вантажний підхід небезпечним. Імпульс не прибирає фронт: обійдіть збоку або доставте через довшу відкриту кишеню.',
  {
    walls: [
      [7, 6, 3, 4],
      [14, 6, 3, 4],
    ],
    targets: [prey('shield'), refuge(), prey()],
    active: 2,
    pickups: [supply('pulse', 1)],
    parcels: [parcel('a', 5, 4), parcel('b', 19, 13)],
    docks: [dock('a', 12, 12)],
    stages: [stage('flank', 1, at(12, 4)), stage('dock', 3, at(4, 14), ['a', 'b'])],
  },
);
add(
  'supply-gambits',
  'two-offers-one-route',
  'Two Offers, One Route',
  'Дві пропозиції, один шлях',
  'A Pulse offer follows the first catch; Reel follows the third. Their opposite bays pull you away from staged deliveries, so decide which detour still matters.',
  'Імпульс з’являється після першого перехоплення, котушка — після третього. Протилежні кишені відводять від доставок: вирішіть, який обхід ще корисний.',
  {
    walls: [
      [8, 4, 2, 5],
      [14, 9, 2, 5],
    ],
    targets: [prey('sprinter'), refuge(), prey()],
    active: 2,
    pickups: [supply('pulse', 1, [[4, 12]]), supply('reel', 3, [[20, 5]])],
    parcels: [parcel('a', 6, 5), parcel('b', 18, 12, 'b')],
    docks: [dock('a', 19, 3), dock('b', 4, 14)],
    stages: [stage('first-offer', 2, null, ['a']), stage('second-offer', 5, at(12, 8), ['b'])],
  },
);
add(
  'supply-gambits',
  'last-train-home',
  'Last Train Home',
  'Останній поїзд додому',
  'The freight finale links a warned lane, a broadcast source and two supply detours. Finish the west delivery before the east parcel becomes available.',
  'Вантажний фінал поєднує смугу з попередженням, джерело трансляції та два обходи за припасами. Завершіть західну доставку до появи східного пакунка.',
  {
    walls: [
      [9, 5, 2, 3],
      [14, 10, 3, 2],
    ],
    targets: [lane(5, 8, 'x', 5, 18), prey(), jammer(19, 12, true), refuge(), prey('brace')],
    active: 2,
    pickups: [
      supply('pulse', 1, [
        [3, 7],
        [21, 9],
      ]),
      supply('reel', 3, [
        [3, 11],
        [21, 7],
      ]),
    ],
    parcels: [parcel('a', 4, 5), parcel('b', 20, 13, 'b')],
    docks: [dock('a', 7, 13), dock('b', 19, 3)],
    stages: [
      stage('west', 1, null, ['a']),
      stage('east', 3, null, ['b']),
      stage('home', 5, at(12, 14)),
    ],
  },
);

add(
  'twin-operations',
  'shared-manifest',
  'Shared Manifest',
  'Спільний маніфест',
  'Two docks accept different parcels. In Team, each carrier can take a flank; either head may finish the central extraction after both deliveries.',
  'Два доки приймають різні пакунки. У команді кожен носій може взяти фланг; будь-яка голова завершує центральну евакуацію після двох доставок.',
  {
    walls: [
      [10, 5, 4, 3],
      [10, 10, 4, 3],
    ],
    targets: [pair()],
    active: 2,
    parcels: [parcel('a', 5, 6), parcel('b', 19, 11, 'b')],
    docks: [dock('a', 5, 13), dock('b', 19, 4)],
    stages: [stage('manifest', 2, at(12, 9), ['a', 'b'])],
  },
);
{
  const g = junction(
    'twin-dispatch',
    0,
    12,
    8,
    [
      [5, 7],
      [19, 9],
    ],
    4,
    3,
    4,
    3,
  );
  add(
    'twin-operations',
    'opposed-levers',
    'Opposed Levers',
    'Протилежні важелі',
    'Two levers control one departure. Simultaneous Team contact toggles once; coordinate the next patrol branch before leaving for opposite rendezvous points.',
    'Два важелі керують одним відправленням. Одночасний дотик у команді перемикає один раз; узгодьте гілку патруля перед протилежними зустрічами.',
    {
      walls: [
        [9, 6, 2, 1],
        [14, 10, 2, 1],
      ],
      targets: [patrol(g), prey()],
      active: 2,
      switchyards: [g],
      stages: [stage('west', 1, at(4, 13), [], [route(g.id)]), stage('east', 3, at(20, 4))],
    },
  );
}
{
  const a = plate('west', [[5, 8]], [[10, 8]]),
    b = plate('east', [[19, 9]], [[14, 8]]);
  add(
    'twin-operations',
    'two-held-doors',
    'Two Held Doors',
    'Двоє утримуваних дверей',
    'Each plate controls a different door. Visit both during the operation; Team can hold them together, while Solo can use the permanently open ends.',
    'Кожна плита керує іншими дверима. Відвідайте обидві; команда може тримати їх разом, а соло має постійно відкриті краї.',
    {
      walls: [
        [10, 4, 1, 4],
        [10, 9, 1, 5],
        [14, 4, 1, 4],
        [14, 9, 1, 5],
      ],
      targets: [refuge(), prey()],
      active: 2,
      plates: [a, b],
      stages: [
        stage('doors', 2, at(12, 13), [], [hold(a.id), hold(b.id)]),
        stage('exit', 3, at(12, 3)),
      ],
    },
  );
}
add(
  'twin-operations',
  'opposite-loads',
  'Opposite Loads',
  'Протилежні вантажі',
  'Four parcels cross two docks. Share the turning yards rather than the same center lane; unloading one carrier does not shorten the other cable.',
  'Чотири пакунки перетинають два доки. Діліть поворотні двори, а не одну центральну смугу; розвантаження одного носія не вкорочує інший кабель.',
  {
    walls: [
      [8, 5, 2, 7],
      [15, 6, 2, 7],
    ],
    targets: [prey(), refuge()],
    active: 2,
    parcels: [
      parcel('a', 4, 5),
      parcel('b', 5, 12),
      parcel('c', 19, 5, 'b'),
      parcel('d', 20, 12, 'b'),
    ],
    docks: [dock('a', 20, 8), dock('b', 4, 9)],
    stages: [stage('west-load', 1, null, ['a', 'b']), stage('east-load', 3, at(12, 8), ['c', 'd'])],
  },
);
add(
  'twin-operations',
  'shared-frequency',
  'Shared Frequency',
  'Спільна частота',
  'Either Team head can activate the local circle on the shared feed. Keep one approach clear while the other carries the parcels toward the antenna.',
  'Будь-яка командна голова активує локальне коло спільного зображення. Зберігайте один підхід чистим, поки інша несе пакунки до антени.',
  {
    walls: [
      [10, 5, 3, 4],
      [10, 11, 3, 2],
    ],
    targets: [jammer(18, 8), turner(), refuge(), prey()],
    active: 2,
    parcels: [parcel('a', 5, 5), parcel('b', 6, 12)],
    docks: [dock('a', 20, 13)],
    stages: [stage('delivery', 1, null, ['a', 'b']), stage('reception', 4, at(4, 14))],
  },
);
add(
  'twin-operations',
  'staggered-rendezvous',
  'Staggered Rendezvous',
  'Почергові зустрічі',
  'Three stage exits alternate corners without resetting the board. A partner can arrive as the final requirement completes; no forced second entry is needed.',
  'Три виходи етапів чергують кути без скидання поля. Партнер може прибути в мить виконання останньої умови; повторний вхід не потрібен.',
  {
    walls: [
      [8, 5, 3, 3],
      [14, 10, 3, 3],
      [12, 7, 1, 3],
    ],
    targets: [refuge(), turner(), prey()],
    active: 2,
    stages: [
      stage('north', 1, at(20, 3)),
      stage('south', 3, at(3, 14)),
      stage('center', 5, at(12, 12)),
    ],
  },
);
add(
  'twin-operations',
  'relay-partners',
  'Relay Partners',
  'Партнери ретранслятора',
  'Split the two relay pads or visit them on one long loop. The shield stays open, leaving time for both parcel deliveries before extraction.',
  'Розділіть дві панелі ретранслятора або відвідайте їх одним довгим колом. Щит лишається відкритим, даючи час доставити обидва пакунки.',
  {
    walls: [
      [8, 6, 2, 5],
      [15, 6, 2, 5],
    ],
    targets: [
      relay(12, 8, [
        [5, 8],
        [19, 8],
      ]),
      refuge(),
      prey(),
    ],
    active: 2,
    parcels: [parcel('a', 5, 4), parcel('b', 19, 13, 'b')],
    docks: [dock('a', 12, 13), dock('b', 12, 4)],
    stages: [stage('partners', 1, null, ['a', 'b']), stage('extraction', 3, at(4, 14))],
  },
);
add(
  'twin-operations',
  'summit-coordination',
  'Summit Coordination',
  'Координація на вершині',
  'Opposite warning lanes, shared cargo and switching prey divide attention. Deliver into each safe yard before the final central rendezvous.',
  'Протилежні смуги з попередженням, спільний вантаж і мінлива здобич ділять увагу. Доставте в кожен безпечний двір перед центральною зустріччю.',
  {
    walls: [
      [9, 5, 2, 3],
      [14, 10, 2, 3],
    ],
    targets: [lane(5, 8, 'x', 5, 18), turner(), lane(18, 5, 'y', 5, 13), refuge()],
    active: 2,
    parcels: [parcel('a', 4, 4), parcel('b', 20, 13, 'b')],
    docks: [dock('a', 5, 13), dock('b', 19, 4)],
    stages: [
      stage('west', 1, null, ['a']),
      stage('east', 3, null, ['b']),
      stage('summit', 4, at(12, 9)),
    ],
  },
);

{
  const g = junction('citadel-route', 0, 12, 8, [[5, 8]], 4, 3, 4, 3);
  add(
    'living-citadels',
    'citadel-dispatch',
    'Citadel Dispatch',
    'Маршрут цитаделі',
    'Select a patrol route through the reclaimed machine court. Deliver after the first interception, then choose an exit across the remaining loop.',
    'Оберіть маршрут патруля через відновлений машинний двір. Доставте після першого перехоплення й оберіть вихід через інше коло.',
    {
      walls: [
        [9, 6, 2, 1],
        [14, 10, 2, 1],
      ],
      targets: [patrol(g), refuge()],
      active: 2,
      switchyards: [g],
      parcels: [parcel('a', 4, 5), parcel('b', 20, 12)],
      docks: [dock('a', 5, 13)],
      stages: [
        stage('route', 1, null, [], [route(g.id)]),
        stage('delivery', 3, at(19, 4), ['a', 'b']),
      ],
    },
  );
}
{
  const p = plate('citadel-door', [[5, 9]], [[12, 8]]);
  add(
    'living-citadels',
    'stone-cable',
    'Stone Cable',
    'Кам’яний кабель',
    'A held door and an eroded notch offer two different short routes. Carry the cargo through one and reserve the other for the long cable’s return.',
    'Утримувані двері й пролом дають два різні короткі шляхи. Пронесіть вантаж одним, зберігаючи інший для повернення довгого кабелю.',
    {
      walls: [
        [12, 4, 1, 4],
        [12, 9, 1, 5],
        [7, 5, 2, 2],
      ],
      targets: [erosion(11, 11, 12, 11), refuge(), prey()],
      active: 2,
      plates: [p],
      parcels: [parcel('a', 6, 8), parcel('b', 19, 12)],
      docks: [dock('a', 19, 4)],
      stages: [stage('door', 1, null, [], [hold(p.id)]), stage('cargo', 3, at(4, 13), ['a', 'b'])],
    },
  );
}
add(
  'living-citadels',
  'citadel-reception',
  'Citadel Reception',
  'Прийом цитаделі',
  'Broadcast and a relay core divide the approach. You can restore the image first or follow the visible relay pads while the moving prey remains hidden.',
  'Трансляція й ядро ретранслятора ділять підхід. Відновіть зображення або йдіть видимими панелями, поки рухлива здобич прихована.',
  {
    walls: [
      [8, 5, 2, 7],
      [15, 5, 2, 7],
    ],
    targets: [
      jammer(20, 8, true),
      relay(12, 8, [
        [5, 8],
        [19, 12],
      ]),
      refuge(),
      prey(),
    ],
    active: 2,
    stages: [
      stage('reception', 1, at(4, 13)),
      stage('relay', 3, at(12, 4)),
      stage('exit', 4, at(20, 14)),
    ],
  },
);
add(
  'living-citadels',
  'furnace-terrace',
  'Furnace Terrace',
  'Тераса печі',
  'A projectile guard and lane own different approaches to the terrace. Use their existing warnings to deliver two parcels; the outside corners stay available.',
  'Стрілець і смуга контролюють різні підходи до тераси. Доставте два пакунки за їхніми попередженнями; зовнішні кути лишаються доступними.',
  {
    walls: [
      [9, 5, 2, 3],
      [14, 10, 3, 2],
    ],
    targets: [guard(5, 8, 'right'), prey(), lane(18, 5, 'y', 5, 13), prey('brace')],
    active: 2,
    parcels: [parcel('a', 4, 4), parcel('b', 20, 12, 'b')],
    docks: [dock('a', 6, 13), dock('b', 19, 3)],
    stages: [
      stage('west', 1, null, ['a']),
      stage('east', 3, null, ['b']),
      stage('terrace', 4, at(12, 8)),
    ],
  },
);
add(
  'living-citadels',
  'border-citadel',
  'Border Citadel',
  'Прикордонна цитадель',
  'Wrapping, reflected prey and a changing stone cut create three ways across. Choose the one your carried parcels and trailing cable still fit through.',
  'Перехід через край, рикошетна здобич і змінний кам’яний зріз дають три шляхи. Оберіть той, куди ще поміщаються вантаж і кабель.',
  {
    wrap: true,
    walls: [
      [8, 4, 1, 10],
      [15, 5, 2, 8],
    ],
    targets: [erosion(7, 8, 8, 8), ricochet(), turner(), prey()],
    active: 2,
    parcels: [parcel('a', 3, 6), parcel('b', 20, 11)],
    docks: [dock('a', 12, 13)],
    stages: [
      stage('border', 1, at(21, 4)),
      stage('load', 3, null, ['a', 'b']),
      stage('home', 4, at(4, 13)),
    ],
  },
);
{
  const g = junction('garden-route', 0, 12, 8, [[5, 7]], 4, 3, 4, 3),
    p = plate('garden-gate', [[19, 8]], [[6, 12]]);
  add(
    'living-citadels',
    'garden-machinery',
    'Garden Machinery',
    'Механізми саду',
    'Patrol dispatch and a cable-held side gate are independent. Open one route while planning the other; neither activation changes enemy contact rules.',
    'Керування патрулем і бічні кабельні ворота незалежні. Відкривайте один шлях, плануючи інший; активації не змінюють правила дотику до ворога.',
    {
      walls: [
        [9, 6, 2, 1],
        [14, 10, 2, 1],
        [6, 10, 1, 2],
        [6, 13, 1, 2],
      ],
      targets: [patrol(g), refuge(), prey('shield')],
      active: 2,
      switchyards: [g],
      plates: [p],
      stages: [
        stage('dispatch', 1, at(19, 4), [], [route(g.id)]),
        stage('gate', 3, at(4, 13), [], [hold(p.id)]),
      ],
    },
  );
}
add(
  'living-citadels',
  'three-court-delivery',
  'Three-Court Delivery',
  'Доставка трьома дворами',
  'Each dock completes a different stage: clear a local antenna, flank armor, then carry the last parcel past a guard. Supplies remain optional.',
  'Кожен док завершує інший етап: приберіть локальну антену, обійдіть броню, пронесіть останній пакунок повз стрільця. Припаси необов’язкові.',
  {
    walls: [
      [7, 5, 2, 6],
      [12, 9, 3, 2],
      [17, 5, 1, 4],
    ],
    targets: [jammer(20, 10), prey('shield'), refuge(), guard(4, 8, 'right'), prey()],
    active: 2,
    pickups: [
      supply('pulse', 1, [
        [3, 7],
        [21, 9],
      ]),
      supply('reel', 3, [
        [3, 11],
        [21, 7],
      ]),
    ],
    parcels: [parcel('a', 4, 5), parcel('b', 12, 5, 'b'), parcel('c', 20, 13, 'c')],
    docks: [dock('a', 11, 13), dock('b', 20, 4), dock('c', 4, 13)],
    stages: [
      stage('signal', 1, null, ['a']),
      stage('armor', 3, null, ['b']),
      stage('guard', 5, at(12, 14), ['c']),
    ],
  },
);
{
  const p = plate('last-door', [[5, 9]], [[12, 8]]);
  add(
    'living-citadels',
    'living-citadel-finale',
    'Living Citadel Finale',
    'Фінал живої цитаделі',
    'Restore reception, deliver across a held door, then choose the last extraction around a warned lane. Four specialist approaches replace repeated catches at one post.',
    'Відновіть прийом, доставте через утримувані двері й оберіть фінальний вихід навколо смуги з попередженням. Чотири різні підходи замінюють повтори одного поста.',
    {
      walls: [
        [12, 4, 1, 4],
        [12, 9, 1, 5],
        [7, 5, 2, 2],
        [17, 10, 2, 2],
      ],
      targets: [
        jammer(19, 5, true),
        refuge(),
        erosion(11, 11, 12, 11),
        lane(5, 14, 'x', 5, 20),
        prey('brace'),
        prey(),
      ],
      active: 2,
      plates: [p],
      parcels: [parcel('a', 5, 5), parcel('b', 20, 13, 'b')],
      docks: [dock('a', 19, 8), dock('b', 4, 14)],
      pickups: [
        supply('pulse', 1, [
          [3, 7],
          [21, 9],
        ]),
        supply('reel', 3, [
          [3, 11],
          [21, 7],
        ]),
      ],
      stages: [
        stage('reception', 1, at(4, 13)),
        stage('crossing', 3, null, ['a'], [hold(p.id)]),
        stage('home', 6, at(12, 14), ['b']),
      ],
    },
  );
}
export const CLASSIC_SNAKE_OPERATION_LEVELS_B = freeze(rows);
