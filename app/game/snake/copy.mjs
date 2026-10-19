import { getLocale } from '../i18n/index.mjs';

const copy = {
  en: {
    title: 'Snake hunts',
    campaigns: 'Snake hunts · eight campaigns',
    tail: 'Tail',
    chain: 'Chain',
    bestChain: 'Best chain',
    bonus: 'Snake bonus',
    next: 'Next bonus target',
    caught: 'Caught',
    hint: 'Catch humanoids to grow your tail. Avoid crossing it, even on safe ground. Turns happen at cell centres.',
    goal: 'Touch or enclose every target. Capturing territory remains available to create new routes.',
    return: 'A completed cut sheds {amount} cells of tail capacity, down to the starting length.',
    persistent: 'Your tail stays after a completed cut. Plan a wide exit before turning back.',
    friendly: 'Both pilots must avoid both tails. Each target is counted once for the shared goal.',
    self: 'Each pilot avoids their own tail. Both pilots contribute to the same target count.',
    chainHelp:
      'Quick consecutive catches add a separate Snake bonus. Missing the window only resets the chain.',
    orderHelp:
      'Catch the numbered targets in order for a separate bonus. Any target still counts toward completion.',
    failure:
      'Your craft crossed a Snake tail. Its path is cleared; your catches and earned length are kept.',
    grid: 'Snake hunts use turns at cell centres.',
    clean: 'Humanoids stay visible with blood off. Brutality changes the effects only.',
  },
  uk: {
    title: 'Полювання-змійка',
    campaigns: 'Полювання-змійка · вісім кампаній',
    tail: 'Хвіст',
    chain: 'Серія',
    bestChain: 'Найкраща серія',
    bonus: 'Бонус змійки',
    next: 'Наступна бонусна ціль',
    caught: 'Спіймано',
    hint: 'Ловіть гуманоїдів, щоб подовжувати хвіст. Не перетинайте його навіть на безпечній землі. Повороти відбуваються в центрах клітинок.',
    goal: 'Торкніться або оточіть усі цілі. Захоплюйте територію, щоб створювати нові маршрути.',
    return:
      'Завершений розріз скорочує місткість хвоста на {amount} клітинок, але не нижче початкової довжини.',
    persistent:
      'Після завершеного розрізу хвіст залишається. Перед розворотом оберіть широкий вихід.',
    friendly:
      'Обидва пілоти уникають обох хвостів. Кожна ціль зараховується до спільної мети лише раз.',
    self: 'Кожен пілот уникає свого хвоста. Обидва поповнюють спільний лічильник цілей.',
    chainHelp:
      'Швидкі послідовні спіймані цілі дають окремий бонус змійки. Якщо не встигнути, обнуляється лише серія.',
    orderHelp:
      'Ловіть пронумеровані цілі за порядком для окремого бонусу. Будь-яка ціль усе одно наближає завершення.',
    failure:
      'Апарат перетнув хвіст змійки. Шлях хвоста очищено; спіймані цілі й зароблена довжина збережені.',
    grid: 'У полюванні-змійці повороти відбуваються в центрах клітинок.',
    clean: 'Гуманоїди залишаються видимими без крові. Жорстокість змінює лише ефекти.',
  },
};

export function snakeText(key, values = {}, locale = getLocale()) {
  let value = (copy[locale] ?? copy.en)[key] ?? copy.en[key] ?? key;
  for (const [name, replacement] of Object.entries(values))
    value = value.replaceAll(`{${name}}`, String(replacement));
  return value;
}

export function snakeBrief(level, { team = false } = {}) {
  const definition = level?.snake;
  if (!definition) return '';
  return [
    snakeText('hint'),
    definition.shedOnReturn
      ? snakeText('return', { amount: definition.shedOnReturn })
      : snakeText('persistent'),
    team ? snakeText(definition.friendlyTail === 'team' ? 'friendly' : 'self') : '',
    definition.bonus === 'chain'
      ? snakeText('chainHelp')
      : definition.bonus === 'ordered'
        ? snakeText('orderHelp')
        : '',
  ]
    .filter(Boolean)
    .join(' ');
}
