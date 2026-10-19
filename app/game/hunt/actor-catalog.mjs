/** Shared identities, not a grant of gameplay capability. Native engines must
 * accept a versioned policy before an actor can enter an attempt. */
export const ACTOR_CATALOG_VERSION = 'humanoid-actors.v1';
export const ACTOR_ART_REVISION = 'overhead-field-kit.v2';
export const ACTOR_ART_BUDGET = Object.freeze({
  decodedBytes: 64 * 1024 * 1024,
  compactDecodedBytes: 32 * 1024 * 1024,
  sharedBoards: 2,
});
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export const ACTOR_CASTS = freeze([
  { id: 'tactical', name: { en: 'Field kit', uk: 'Польове спорядження' }, accessory: 'field-kit' },
  {
    id: 'rivals',
    name: { en: 'Worn field kit', uk: 'Зношене польове спорядження' },
    accessory: 'mixed-kit',
  },
  { id: 'arcade', name: { en: 'Winter kit', uk: 'Зимове спорядження' }, accessory: 'winter-kit' },
]);
export const ACTOR_STATES = Object.freeze([
  'idle',
  'walk',
  'notice',
  'flee',
  'warning',
  'burst',
  'recover',
  'blocked',
  'caught',
]);

const descriptions = [
  [
    'lookout',
    'Lookout',
    'Спостерігач',
    'binoculars',
    false,
    ['Watches a post.', 'Спостерігає за постом.'],
    ['Binoculars rise while the lookout scans.', 'Під час огляду піднімає бінокль.'],
    [
      'Approach directly. This introductory target does not flee.',
      'Наближайтеся прямо. Ця навчальна ціль не тікає.',
    ],
  ],
  [
    'patroller',
    'Patroller',
    'Патрульний',
    'cap',
    false,
    ['Completes a circuit or shuttle route.', 'Проходить коло або маршрут туди й назад.'],
    [
      'A patrol pack, measured steps and the body heading identify the route.',
      'Патрульний рюкзак, рівні кроки та поворот тіла показують напрямок маршруту.',
    ],
    [
      'Intercept a crossing; a blocked patrol waits.',
      'Перехопіть на перетині; заблокований патруль чекає.',
    ],
  ],
  [
    'runner',
    'Runner',
    'Бігун',
    'light-jacket',
    false,
    ['Seeks space away from nearby players.', 'Шукає простір подалі від гравців.'],
    [
      'Looks back, then commits to a short escape.',
      'Озирається, потім виконує короткий ривок утечі.',
    ],
    [
      'Cut off the next opening instead of following directly.',
      'Перекрийте наступний вихід замість переслідування слідом.',
    ],
  ],
  [
    'sprinter',
    'Sprinter',
    'Спринтер',
    'headset',
    false,
    ['Reaches an open straight for a burst.', 'Шукає пряму ділянку для ривка.'],
    [
      'A light headset and crouched warning precede the dash; breathing marks recovery.',
      'Легка гарнітура та присідання попереджають про ривок; важке дихання означає відпочинок.',
    ],
    [
      'Predict the straight dash and catch the recovery.',
      'Передбачте прямий ривок і перехопіть під час відпочинку.',
    ],
  ],
  [
    'courier',
    'Courier',
    'Кур’єр',
    'satchel',
    false,
    [
      'Visits delivery checkpoints for an optional reward.',
      'Відвідує пункти доставки заради необов’язкової нагороди.',
    ],
    [
      'A bouncing satchel and parcel symbol distinguish the bonus target.',
      'Сумка та символ пакунка позначають бонусну ціль.',
    ],
    [
      'Choose a safe interception; ordinary completion does not require the courier.',
      'Оберіть безпечне перехоплення; кур’єр не потрібен для звичайного завершення.',
    ],
  ],
  [
    'guard',
    'Guard',
    'Охоронець',
    'helmet',
    false,
    [
      'Defends a post with warned shots in Capture combat.',
      'Захищає пост попередженими пострілами в бойових місіях захоплення.',
    ],
    [
      'A helmet and locked aim precede each shot.',
      'Шолом та зафіксоване прицілювання позначають постріл.',
    ],
    [
      'Evade the shot and touch the body during an opening.',
      'Ухиліться від пострілу й торкніться тіла у вдалий момент.',
    ],
  ],
  [
    'refuge-seeker',
    'Refuge seeker',
    'Шукач укриття',
    'hood',
    false,
    [
      'Commits to a reachable shelter and briefly rests there.',
      'Прямує до доступного укриття й ненадовго відпочиває там.',
    ],
    [
      'A hood and pointing gesture announce the selected goal.',
      'Каптур та жест указують на обрану ціль.',
    ],
    [
      'Intercept the shelter approach; shelter gives no invulnerability.',
      'Перехопіть біля укриття; воно не дає невразливості.',
    ],
  ],
  [
    'switchback',
    'Switchback',
    'Маневрувальник',
    'scarf',
    false,
    [
      'Escapes through an announced alternative exit.',
      'Тікає через заздалегідь показаний інший вихід.',
    ],
    [
      'A scarf and fork symbol introduce a committed direction change.',
      'Шарф і розгалужена стрілка попереджають про зміну напрямку.',
    ],
    [
      'Read the next direction and cover that exit.',
      'Стежте за наступним напрямком і перекрийте цей вихід.',
    ],
  ],
  [
    'rendezvous-pair',
    'Rendezvous pair',
    'Пара для зустрічі',
    'paired-badge',
    false,
    ['Two actors seek a shared meeting point.', 'Двоє прямують до спільного місця зустрічі.'],
    [
      'Paired radio packs and greeting gestures identify the partners.',
      'Парні радіорюкзаки та вітальні жести позначають напарників.',
    ],
    [
      'Separate their routes; each counts once, and the survivor becomes a Runner.',
      'Розділіть їхні маршрути; кожен зараховується один раз, а вцілілий стає Бігуном.',
    ],
  ],
  [
    'shield-bearer',
    'Shield bearer',
    'Щитоносець',
    'shield',
    true,
    [
      'Keeps its front protected while committing to a heading.',
      'Тримає фронт захищеним і дотримується обраного напрямку.',
    ],
    [
      'A solid shield marks the hazardous front; a hollow arrow warns of its next turn.',
      'Суцільний щит позначає небезпечний фронт; порожня стрілка попереджає про поворот.',
    ],
    [
      'Touch a side or the rear. The exact side boundary is exposed; enclosure also works in Capture.',
      'Торкніться збоку або ззаду. Межа бічної сторони відкрита; у захопленні також діє оточення.',
    ],
  ],
  [
    'brace-trooper',
    'Brace trooper',
    'Броньований спринтер',
    'opening-armor',
    true,
    [
      'Braces for a burst, then opens its armor to recover.',
      'Закриває броню для ривка, потім відкриває її на відпочинок.',
    ],
    [
      'Closed armor during warning and burst is hazardous; split panels mark recovery.',
      'Закрита броня під час попередження та ривка небезпечна; відкриті панелі позначають відпочинок.',
    ],
    [
      'Catch the open recovery. Pulse freezes the visible armor state; it does not open it.',
      'Перехопіть під час відкритого відпочинку. Імпульс фіксує поточний стан броні, а не відкриває її.',
    ],
  ],
  [
    'relay-warden',
    'Relay warden',
    'Вартовий ретранслятора',
    'command-radio',
    true,
    [
      'Holds a native Capture relay or stronghold objective.',
      'Утримує ціль ретранслятора або фортеці в режимі захоплення.',
    ],
    [
      'A command radio pack and relay indicators show its objective role.',
      'Командний радіорюкзак та індикатори ретранслятора позначають роль цілі.',
    ],
    [
      'Follow the mission’s relay or stronghold rules; this is not ordinary contact prey.',
      'Виконуйте правила ретранслятора або фортеці; це не звичайна контактна ціль.',
    ],
  ],
];

const engines = (capture, snake, flight) => ({ capture, snake, flight });
const supported = (policy, requires = []) => ({ policy, requires });
// Required policies are intentionally namespaced. Catalogue presence, costume
// and field-guide text never upgrade a historical recipe or imply an adapter.
const capabilities = {
  lookout: engines(null, supported('stationary'), supported('ground-patrol', ['stationary-route'])),
  patroller: engines(
    supported('authored-patrol', ['successor-recipe']),
    supported('patroller'),
    supported('ground-patrol'),
  ),
  runner: engines(
    supported('humanoid-runner'),
    supported('runner'),
    supported('ground-pursuit', ['successor-recipe']),
  ),
  sprinter: engines(
    supported('burst-pursuit', ['successor-recipe']),
    supported('sprinter'),
    supported('ground-burst', ['successor-recipe']),
  ),
  courier: engines(
    supported('optional-courier', ['successor-recipe', 'bonus-objective']),
    supported('courier', ['bonus-objective']),
    supported('optional-courier', ['successor-recipe', 'bonus-objective']),
  ),
  guard: engines(supported('humanoid-guard', ['projectiles']), null, null),
  'refuge-seeker': engines(
    supported('refuge', ['successor-recipe', 'goal-waypoints']),
    supported('refuge', ['successor-recipe', 'goal-waypoints']),
    supported('ground-refuge', ['successor-recipe', 'goal-waypoints']),
  ),
  switchback: engines(
    supported('switchback', ['successor-recipe']),
    supported('switchback', ['successor-recipe']),
    supported('ground-switchback', ['successor-recipe']),
  ),
  'rendezvous-pair': engines(
    supported('rendezvous', ['successor-recipe', 'pair']),
    supported('pair', ['successor-recipe', 'pair']),
    supported('ground-rendezvous', ['successor-recipe', 'pair']),
  ),
  'shield-bearer': engines(
    supported('directional-shield', ['successor-recipe', 'specialist-opt-in']),
    supported('shield', ['successor-recipe', 'specialist-opt-in']),
    supported('ground-shield', ['successor-recipe', 'specialist-opt-in']),
  ),
  'brace-trooper': engines(
    supported('brace', ['successor-recipe', 'specialist-opt-in']),
    supported('brace', ['successor-recipe', 'specialist-opt-in']),
    supported('ground-brace', ['successor-recipe', 'specialist-opt-in']),
  ),
  'relay-warden': engines(
    supported('relay-stronghold', ['native-boss-objective', 'specialist-opt-in']),
    null,
    null,
  ),
};

export const ACTOR_FAMILIES = freeze(
  descriptions.map(([id, en, uk, accessory, specialist, goal, tell, counter]) => ({
    id,
    name: { en, uk },
    accessory,
    specialist,
    contact: id === 'relay-warden' ? 'native-objective' : specialist ? 'conditional' : 'instant',
    guide: {
      en: { goal: goal[0], tell: tell[0], counter: counter[0] },
      uk: { goal: goal[1], tell: tell[1], counter: counter[1] },
    },
    capabilities: capabilities[id],
    reactionIds: ['notice', 'caught'].map((event) => `${ACTOR_CATALOG_VERSION}/${id}/${event}`),
  })),
);

const aliases = freeze({
  still: 'lookout',
  refuge: 'refuge-seeker',
  pair: 'rendezvous-pair',
  shield: 'shield-bearer',
  brace: 'brace-trooper',
  warden: 'relay-warden',
});
const families = new Map(ACTOR_FAMILIES.map((entry) => [entry.id, entry]));
// Uniform wardrobes are presentation only. Family equipment remains the primary
// identifier; soft webbing never implies the specialist's protected contact.
const wardrobes = {
  tactical: {
    coat: '#778665',
    light: '#b0bb8c',
    dark: '#45553f',
    pants: '#576647',
    trim: '#a0a17a',
    camo: '#536248',
    patch: '#b9ac84',
    glove: '#857c5e',
    edge: '#d2d3ac',
  },
  rivals: {
    coat: '#958560',
    light: '#c8b88a',
    dark: '#5d6047',
    pants: '#5f6850',
    trim: '#b3a078',
    camo: '#716949',
    patch: '#706b56',
    glove: '#9b815f',
    edge: '#e0d1aa',
  },
  arcade: {
    coat: '#d4d9cc',
    light: '#f4f2df',
    dark: '#697564',
    pants: '#aab4a4',
    trim: '#8c987e',
    camo: '#939d8b',
    patch: '#a3af9e',
    glove: '#6f786a',
    edge: '#edeedd',
  },
};
// Tiny accents keep all families distinguishable without replacing equipment
// silhouettes with rainbow uniforms.
const familyTrim = {
  lookout: '#b0a078',
  patroller: '#a4af87',
  runner: '#89976b',
  sprinter: '#b2a782',
  courier: '#b89967',
  guard: '#94a183',
  'refuge-seeker': '#7c9981',
  switchback: '#ae9270',
  'rendezvous-pair': '#9aacaa',
  'shield-bearer': '#9ba8a0',
  'brace-trooper': '#b2a287',
  'relay-warden': '#b9b38c',
};

export const ACTOR_VISUALS = freeze(
  ACTOR_FAMILIES.flatMap((family) =>
    ACTOR_CASTS.map((cast) => {
      const wardrobe = wardrobes[cast.id];
      return {
        id: `${ACTOR_CATALOG_VERSION}/${family.id}/${cast.id}`,
        family: family.id,
        cast: cast.id,
        material: 'flesh',
        accessory: family.accessory,
        castAccessory: cast.accessory,
        artRevision: ACTOR_ART_REVISION,
        palette: {
          ...wardrobe,
          ink: '#192820',
          skin: '#cba984',
          skinLight: '#e3c29b',
          trim: familyTrim[family.id],
        },
        detailPixels: 32,
        compactPixels: 16,
        decodedBytes: 0,
      };
    }),
  ),
);
const visuals = new Map(ACTOR_VISUALS.map((entry) => [entry.id, entry]));

export function resolveActorFamily(id) {
  if (typeof id !== 'string') return null;
  const candidate = Object.hasOwn(aliases, id) ? aliases[id] : id;
  return families.has(candidate) ? candidate : null;
}
export function actorDefinition(id) {
  return families.get(resolveActorFamily(id)) ?? null;
}
export function actorVisual(id, cast = 'rivals') {
  if (visuals.has(id)) return visuals.get(id);
  const family = resolveActorFamily(id);
  if (!family || !ACTOR_CASTS.some((entry) => entry.id === cast)) return null;
  return visuals.get(`${ACTOR_CATALOG_VERSION}/${family}/${cast}`) ?? null;
}
export function actorFieldGuide(id, locale = 'en') {
  const entry = actorDefinition(id);
  if (!entry) return null;
  const language = locale === 'uk' ? 'uk' : 'en';
  return Object.freeze({
    id: entry.id,
    name: entry.name[language],
    specialist: entry.specialist,
    contact: entry.contact,
    ...entry.guide[language],
  });
}
export function actorCapability(id, engine) {
  const entry = actorDefinition(id);
  return entry && Object.hasOwn(entry.capabilities, engine) ? entry.capabilities[engine] : null;
}

/** Accepted failure feedback; optional identity refines advice without changing rules. */
export function specialistFailureCopy(family, locale = 'en') {
  const uk = locale === 'uk';
  if (['shield', 'shield-bearer'].includes(family))
    return {
      reason: uk
        ? 'Ви торкнулися захищеного боку щита.'
        : 'You touched the protected shield front.',
      tip: uk
        ? 'Обійдіть щит збоку чи ззаду, або оточіть ціль. Стрілка показує захищений напрямок.'
        : 'Approach from the side or rear, or enclose the target. The arrow marks the protected front.',
    };
  if (['brace', 'brace-trooper'].includes(family))
    return {
      reason: uk ? 'Ви торкнулися закритої броні.' : 'You touched closed armor.',
      tip: uk
        ? 'Дочекайтеся відкритої броні під час відновлення, або оточіть ціль. Замороження не відкриває броню.'
        : 'Wait for exposed recovery, or enclose the target. Freezing does not open armor.',
    };
  return {
    reason: uk ? 'Захищений контакт зупинив ваш апарат.' : 'Protected armor stopped your craft.',
    tip: uk
      ? 'Заходьте до Щита збоку чи ззаду. Броньований ривок уразливий під час відновлення. Оточення долає обох.'
      : 'Catch Shield from the side or rear; catch Brace during recovery. Enclosure defeats either.',
  };
}
