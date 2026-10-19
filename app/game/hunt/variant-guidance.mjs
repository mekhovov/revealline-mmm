import { getLocale } from '../i18n/index.mjs';
import { missionBriefing } from '../mission-brief.mjs';
import { coopGoalLabel } from '../couch/coop-copy.mjs';

const copy = {
  en: {
    route:
      'Choose short returns and inspect the current enemy positions before leaving safe ground.',
    teamRoute:
      'Plan separate approaches or a shared enclosure, keeping a return route available for both pilots.',
    off: 'There are no optional patrols or humanoid targets in this variant.',
    patrol:
      'Optional patrol bodies can be removed while cutting. Sentries warn before firing at an exposed craft.',
    hunt: 'Touch or enclose humanoids to remove them. No attack button is needed; targets do not respawn.',
    bonus: 'Hunt eliminations are optional for completing this mission.',
    ordinary:
      'Ordinary enemies remain dangerous. Follow the visible hazards and keep a return route available.',
    guards:
      'Ordinary enemies remain dangerous. Move away from fixed guard warnings; removing a guard clears its shots.',
    capture: 'Closing a cut reclaims its line and eligible regions, creating new return routes.',
    points:
      'Contact earns 100 Hunt points and enclosure earns 50. These points are separate from territory score.',
    optional:
      'Capture provides return routes and can remove enclosed targets; no capture percentage or other objective is required to finish this Hunt.',
    mastery: 'Complete this variant without losing a life.',
    huntMastery:
      'Complete this variant without losing a life, choosing contact when its extra points justify the route.',
    teamMastery: 'Complete this variant without a knockdown.',
    teamHuntMastery:
      'Complete this variant without a knockdown, with both pilots contributing a capture or Hunt elimination.',
  },
  uk: {
    route:
      'Обирайте короткі повернення й перевіряйте розташування ворогів перед виходом із безпечної зони.',
    teamRoute:
      'Плануйте окремі підходи або спільне оточення, залишаючи шлях повернення для обох пілотів.',
    off: 'У цьому варіанті немає додаткових патрулів або гуманоїдів.',
    patrol:
      'Тіла додаткових патрулів можна знищувати під час прокладання лінії. Вартові попереджають перед пострілом у незахищений корабель.',
    hunt: 'Торкайтеся гуманоїдів або захоплюйте їхню ділянку, щоб знищити їх. Кнопка атаки не потрібна; цілі не відроджуються.',
    bonus: 'Для завершення цієї місії знищувати цілі полювання необов’язково.',
    ordinary:
      'Звичайні вороги залишаються небезпечними. Стежте за видимими загрозами й залишайте шлях повернення.',
    guards:
      'Звичайні вороги залишаються небезпечними. Ухиляйтеся від зафіксованого прицілу охоронців; знищення охоронця прибирає його постріли.',
    capture: 'Замикання лінії захоплює її та доступні ділянки, створюючи нові шляхи повернення.',
    points:
      'Дотик дає 100 балів полювання, захоплення — 50. Ці бали рахуються окремо від балів за територію.',
    optional:
      'Захоплення створює шляхи повернення й може прибирати оточені цілі; для завершення цього полювання не потрібні певний відсоток захоплення чи інші цілі.',
    mastery: 'Завершіть цей варіант без втрати життя.',
    huntMastery:
      'Завершіть цей варіант без втрати життя, обираючи дотик, коли додаткові бали виправдовують маршрут.',
    teamMastery: 'Завершіть цей варіант без збиття корабля.',
    teamHuntMastery:
      'Завершіть цей варіант без збиття корабля; обидва пілоти мають захопити територію або знищити ціль полювання.',
  },
};

/** Guidance belongs to the selected playable edition, while its source lesson,
 * execution key and immutable preparation manifest keep their original identity. */
export function encounterVariantDesign(manifest, variant) {
  if (!manifest || variant === 'authored') return manifest?.design;
  const level = manifest.level,
    team = manifest.mode === 'team',
    hunt = level.classic?.hunt ?? level.hunt,
    words = copy[getLocale()] ?? copy.en,
    goalLabel = team ? coopGoalLabel(level) : missionBriefing(level).goal,
    goal = /[.!?]$/.test(goalLabel) ? goalLabel : `${goalLabel}.`,
    guards = (level.classic?.combatPatrols ?? level.combatPatrols)?.actors?.some(
      (actor) => actor.role === 'sentry',
    ),
    consequence = hunt
      ? `${words.points}${hunt.mode === 'hunt' ? ` ${words.optional}` : ''}`
      : words.capture;
  return Object.freeze({
    ...manifest.design,
    routeDecision: `${goal} ${team ? words.teamRoute : words.route}`,
    lesson: `${goal} ${hunt ? words.hunt : variant === 'patrol' ? words.patrol : words.off}${hunt?.mode === 'bonus' ? ` ${words.bonus}` : ''}`,
    counterplay: guards && hunt ? words.guards : words.ordinary,
    captureConsequence: consequence,
    memorableMoment: consequence,
    mastery: team
      ? hunt
        ? words.teamHuntMastery
        : words.teamMastery
      : hunt
        ? words.huntMastery
        : words.mastery,
  });
}

const manifests = new WeakMap();
export function encounterVariantManifest(manifest, variant) {
  if (!manifest || variant === 'authored') return manifest;
  let editions = manifests.get(manifest);
  if (!editions) manifests.set(manifest, (editions = new Map()));
  const key = `${variant}/${getLocale()}`;
  if (!editions.has(key))
    editions.set(
      key,
      Object.freeze({ ...manifest, design: encounterVariantDesign(manifest, variant) }),
    );
  return editions.get(key);
}
