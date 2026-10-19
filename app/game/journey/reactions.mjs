import { campaignResultLine } from './campaign-feedback.mjs';
import { ACTOR_REACTION_LINES, actorReactionLine } from '../hunt/actor-reactions.mjs';
const OVERFLIGHT_REACTION_LINES = [];
/** Original, non-blocking personality copy. No simulated facts, gameplay rules,
 * scores, requests to keep playing, or rewards are derived from these captions. */
export const JOURNEY_REACTIONS = Object.freeze({
  guide: Object.freeze({
    name: 'Guide',
    lines: Object.freeze([
      'A new piece of the world, brought into view.',
      'That picture was waiting for a line like yours.',
    ]),
  }),
  engineer: Object.freeze({
    name: 'Engineer',
    lines: Object.freeze([
      'A fine route through a complicated place.',
      'I like what you built between those edges.',
    ]),
  }),
  rival: Object.freeze({
    name: 'Rival',
    lines: Object.freeze([
      'Two boards. Two ways to find a line.',
      'Different routes, one shared view.',
    ]),
  }),
  sentinel: Object.freeze({
    name: 'Sentinel',
    lines: Object.freeze(['The last signal is yours.', 'Beyond the crown, the picture remains.']),
  }),
});

export const REACTION_NAMES_UK = Object.freeze({
  guide: 'Провідник',
  engineer: 'Інженер',
  rival: 'Суперник',
  sentinel: 'Вартовий',
});
export const REACTION_RESULTS_UK = Object.freeze({
  guide: Object.freeze([
    'Ще один куточок світу відкрито.',
    'Ця картина чекала саме на твій маршрут.',
  ]),
  engineer: Object.freeze([
    'Вдалий маршрут через складне місце.',
    'Мені подобається, що ви збудували між цими краями.',
  ]),
  rival: Object.freeze([
    'Два поля. Два способи знайти шлях.',
    'Різні маршрути — спільний краєвид.',
  ]),
  sentinel: Object.freeze(['Останній сигнал — твій.', 'За короною залишається картина.']),
});

/** IDs survive translation and recording replacements. This catalog is cosmetic. */
const incidentalCopy = {
  capture: [
    ['A little more of the picture.', 'Ще трохи картини відкрито.'],
    ['That route opened a new view.', 'Цей маршрут відкрив новий краєвид.'],
    ['Another piece comes into focus.', 'Ще одна частина стала чіткішою.'],
    ['There is room to breathe now.', 'Тепер є більше простору.'],
  ],
  elimination: [
    ['One patrol has gone quiet.', 'Один патруль уже замовк.'],
    ['That path has one less obstacle.', 'На цьому шляху стало на одну перешкоду менше.'],
    ['A clear line past that patrol.', 'Шлях повз той патруль вільний.'],
    ['The signal has faded.', 'Сигнал згас.'],
  ],
  recovery: [
    ['Back at the edge. Take your time.', 'Знову на краю. Не поспішай.'],
    ['A fresh route is waiting.', 'Попереду новий маршрут.'],
    ['There is another way through.', 'Є ще один шлях.'],
    ['Ready for the next line.', 'Можна прокладати наступну лінію.'],
  ],
  rescue: [
    ['Together again.', 'Знову разом.'],
    ['A helping hand makes a difference.', 'Допомога змінює справу.'],
    ['The team is back on its feet.', 'Команда знову в строю.'],
    ['That rescue opened another chance.', 'Цей порятунок дав ще один шанс.'],
  ],
};
export const REACTION_LINES = Object.freeze([
  ...Object.entries(JOURNEY_REACTIONS).flatMap(([speaker, entry]) => [
    ...entry.lines.map((en, variant) =>
      Object.freeze({
        id: `journey-reaction.v1/${speaker}/${variant}`,
        speaker,
        family: 'result',
        text: Object.freeze({ en, uk: REACTION_RESULTS_UK[speaker][variant] }),
      }),
    ),
    ...Object.entries(incidentalCopy).flatMap(([family, lines]) =>
      lines.map(([en, uk], variant) =>
        Object.freeze({
          id: `journey-incidental.v1/${speaker}/${family}/${variant}`,
          speaker,
          family,
          text: Object.freeze({ en, uk }),
        }),
      ),
    ),
  ]),
  ...ACTOR_REACTION_LINES,
  ...OVERFLIGHT_REACTION_LINES,
]);
const byId = new Map(REACTION_LINES.map((line) => [line.id, line]));
export function reactionLine(id, locale = 'en') {
  const actor = actorReactionLine(id, locale);
  if (actor) return actor;
  const line = byId.get(id);
  if (!line) return null;
  return {
    id,
    speaker: line.speaker,
    family: line.family,
    name: locale === 'uk' ? REACTION_NAMES_UK[line.speaker] : JOURNEY_REACTIONS[line.speaker].name,
    text: line.text[locale === 'uk' ? 'uk' : 'en'],
  };
}

/** Host-owned result context only. Never infer ownership from titles or URLs.
 * A finished race without a successful board is not a completion reaction. */
export function journeyResultReaction(context, locale = 'en') {
  const overflight = context?.presentation === 'overflight' && context.mode === 'solo';
  if (
    !context ||
    context.owned !== true ||
    !['solo', 'versus', 'team'].includes(context.mode) ||
    !['won', 'draw', ...(overflight ? ['lost'] : [])].includes(context.outcome) ||
    (context.outcome === 'draw' && context.mode !== 'versus') ||
    typeof context.missionId !== 'string' ||
    !context.missionId ||
    context.missionId.length > 512
  )
    return null;
  if (overflight)
    // This existing Engineer line and its exact recording fit a successful sortie.
    return reactionLine(
      context.outcome === 'won' ? 'journey-reaction.v1/engineer/0' : 'overflight-reaction.v1/lost',
      locale,
    );
  const authored = campaignResultLine(context, locale);
  if (authored) return Object.freeze(authored);
  const speaker =
    context.mode === 'versus'
      ? 'rival'
      : context.mode === 'team' || context.presentation === 'snake'
        ? 'engineer'
        : context.encounter === true
          ? 'sentinel'
          : context.mode === 'team' || context.relays === true
            ? 'engineer'
            : 'guide';
  const entry = JOURNEY_REACTIONS[speaker];
  // Stable across redraw, reload, retry and releases; no wall-clock/random choice.
  let variant = 0;
  for (const character of context.missionId)
    variant = (variant + character.codePointAt(0)) % entry.lines.length;
  return Object.freeze({
    id: `journey-reaction.v1/${speaker}/${variant}`,
    speaker,
    name: locale === 'uk' ? REACTION_NAMES_UK[speaker] : entry.name,
    text: locale === 'uk' ? REACTION_RESULTS_UK[speaker][variant] : entry.lines[variant],
  });
}
