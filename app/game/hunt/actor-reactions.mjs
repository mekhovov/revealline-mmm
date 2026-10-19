import { ACTOR_CATALOG_VERSION, actorDefinition, resolveActorFamily } from './actor-catalog.mjs';

/** Original optional copy. Selection is deterministic and carries no simulated
 * facts. Hosts must use their existing incidental-reaction budget and priority.
 * Recordings can replace these IDs without changing recipes or locales. */
const copy = {
  lookout: [
    ['Something on the horizon.', 'Щось на обрії.'],
    ['A little too close!', 'Трохи заблизько!'],
  ],
  patroller: [
    ['One more round.', 'Ще одне коло.'],
    ['Off the beaten path!', 'Зійшли зі звичного шляху!'],
  ],
  runner: [
    ['Room for one more turn.', 'Є місце ще для одного повороту.'],
    ['You found the shortcut!', 'Ви знайшли коротший шлях!'],
  ],
  sprinter: [
    ['Deep breath. Ready.', 'Глибокий вдих. Готово.'],
    ['Out of breath!', 'Забракло подиху!'],
  ],
  courier: [
    ['A parcel with a destination.', 'Пакунок має свою адресу.'],
    ['Delivery interrupted!', 'Доставку перервано!'],
  ],
  guard: [
    ['Keeping an eye on the crossing.', 'Стежу за переходом.'],
    ['A gap in the watch!', 'Прогалина у варті!'],
  ],
  'refuge-seeker': [
    ['That corner looks promising.', 'Той кут виглядає вдало.'],
    ['The long way was shorter!', 'Довгий шлях виявився коротшим!'],
  ],
  switchback: [
    ['A different way around.', 'Є інший обхід.'],
    ['A turn ahead of me!', 'Ви на поворот попереду!'],
  ],
  'rendezvous-pair': [
    ['Meet you at the crossing.', 'Зустрінемось на перетині.'],
    ['A change of meeting place!', 'Місце зустрічі змінилося!'],
  ],
  'shield-bearer': [
    ['Facing the next crossing.', 'Повертаюся до наступного переходу.'],
    ['Caught from another angle!', 'Перехоплено з іншого боку!'],
  ],
  'brace-trooper': [
    ['Brace. Breathe. Go.', 'Зібратися. Вдихнути. Рушати.'],
    ['You read the rhythm!', 'Ви вловили ритм!'],
  ],
  'relay-warden': [
    ['Listening for the next signal.', 'Чекаю наступного сигналу.'],
    ['The signal has changed hands.', 'Сигнал перейшов до інших рук.'],
  ],
};

export const ACTOR_REACTION_LINES = Object.freeze(
  Object.entries(copy).flatMap(([actor, lines]) =>
    lines.map(([en, uk], index) =>
      Object.freeze({
        id: `${ACTOR_CATALOG_VERSION}/${actor}/${index === 0 ? 'notice' : 'caught'}`,
        speaker: actor,
        family: index === 0 ? 'notice' : 'caught',
        priority: 'incidental',
        text: Object.freeze({ en, uk }),
      }),
    ),
  ),
);
const byId = new Map(ACTOR_REACTION_LINES.map((line) => [line.id, line]));

export function actorReactionLine(id, locale = 'en') {
  const line = byId.get(id);
  if (!line) return null;
  const language = locale === 'uk' ? 'uk' : 'en';
  return Object.freeze({
    ...line,
    name: actorDefinition(line.speaker).name[language],
    text: line.text[language],
  });
}

export function actorEventReaction(family, event, locale = 'en') {
  const id = resolveActorFamily(family);
  if (!id || !['notice', 'caught'].includes(event)) return null;
  return actorReactionLine(`${ACTOR_CATALOG_VERSION}/${id}/${event}`, locale);
}
