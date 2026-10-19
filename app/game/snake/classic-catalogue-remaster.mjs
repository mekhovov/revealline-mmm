/** Authored tactical revisions. These are gameplay recipes, not cosmetic variants. */
const line = (x, y, dx, dy, length) =>
  Array.from({ length }, (_, n) => ({ x: x + dx * n, y: y + dy * n }));
const route = (...legs) => legs.flat();
export const CLASSIC_REMASTER_REVISIONS = Object.freeze({
  'classic-operation-pressure-elbow': {
    tactics: [{ policyIndex: 0, route: line(14, 6, 0, 1, 8) }],
    en: 'The runner commits along the east side of the elbow. Hold the shortcut with your cable to intercept its next endpoint, or take the permanent outer approach.',
    uk: 'Бігун рухається вздовж східного боку вигину. Утримуйте зріз кабелем для перехоплення біля наступного кінця маршруту або йдіть постійним зовнішнім обходом.',
    reason:
      'Keep all three catches, but put their committed route beyond the pressure door: the pad now changes an interception decision rather than merely satisfying an unrelated visit counter.',
  },
  'classic-operation-orchard-post': {
    tactics: [{ policyIndex: 0, route: route(line(6, 5, 1, 0, 12), line(17, 6, 0, 1, 6)) }],
    en: 'Carry two parcels to dock A. The runner commits around the glasshouse’s open side: unload, then cut across to its next corner.',
    uk: 'Доставте дві посилки до доку A. Бігун рухається вздовж відкритого боку теплиці: розвантажтеся й зріжте шлях до його наступного кута.',
    reason:
      'Replace an unconstrained random chase after delivery with a committed L-shaped interception around the glasshouse; unloading creates the useful short return.',
  },
  'classic-operation-runner-valve': {
    tactics: [{ policyIndex: 0, route: route(line(6, 4, 1, 0, 9), line(14, 5, 0, 1, 8)) }],
    en: 'The switchback commits around the valve’s east side. Hold the shortcut with your cable to intercept, or meet its return outside the machinery.',
    uk: 'Бігун зі зміною напряму обходить клапан зі сходу. Утримуйте короткий шлях кабелем для перехоплення або зустріньте його на зовнішньому поверненні.',
    reason:
      'The pressure door now cuts an actual committed prey route instead of competing with an unrelated free-roaming chase.',
  },
  'classic-operation-refuge-cargo': {
    tactics: [{ policyIndex: 0, route: route(line(10, 5, 0, 1, 7), line(11, 11, 1, 0, 4)) }],
    en: 'The refuge seeker commits through the aisle between the two glasshouses. Deliver outside the east wall, then choose which end of the aisle to intercept.',
    uk: 'Шукач укриття рухається проходом між двома теплицями. Доставте вантаж за східну стіну й оберіть край проходу для перехоплення.',
    reason:
      'Give the refuge a coherent aisle route: the fixed east dock and two interception ends compete for the same loaded return.',
  },
  'classic-operation-north-south': {
    tactics: [{ policyIndex: 0, route: route(line(5, 4, 1, 0, 14), line(18, 5, 0, 1, 10)) }],
    en: 'The pair takes opposite approaches around the long quay. Cross the wrapping edge to intercept one end, then reserve the other return for the survivor.',
    uk: 'Пара обходить довгу набережну з протилежних боків. Перейдіть через край для одного перехоплення й залиште інше повернення для вцілілого.',
    reason:
      'Complementary committed endpoints make wrapping a deliberate interception shortcut rather than simply a shorter trip to an exit arrow.',
  },
  'classic-operation-silent-parcel': {
    tactics: [{ policyIndex: 0, route: line(18, 8, 0, 1, 4) }],
    en: 'The antenna changes posts only while reception is clear. Catch it during recovery or carry the parcels outside its circle; every new burst still warns first.',
    uk: 'Антена змінює позицію лише за чистого сигналу. Спіймайте її під час відновлення або пронесіть вантаж поза колом; перед кожним імпульсом є попередження.',
    reason:
      'A recovery-only mobile source changes the useful cargo approach while keeping warning and transmission positions committed.',
  },
  'classic-operation-watch-the-aim': {
    tactics: [{ policyIndex: 0, route: line(12, 8, 1, 0, 3) }],
    en: 'The guard changes posts only after its shot clears. Read the fresh aim warning before crossing, then use the opposite return for the next clearance.',
    uk: 'Охоронець змінює позицію лише після завершення пострілу. Прочитайте нове попередження прицілу перед перетином і поверніться іншим боком.',
    reason:
      'A short recovery-only patrol prevents camping one safe flank while preserving full fresh warning and the outside bypass.',
  },
  'classic-operation-freight-flank': {
    tactics: [{ policyIndex: 0, route: line(12, 5, 0, 1, 6) }],
    en: 'The shield commits along the gap between freight bays. Approach its side, then carry the load around a wider return before unloading at the southern dock.',
    uk: 'Щит рухається проходом між вантажними платформами. Зайдіть збоку, а тоді несіть вантаж широким поверненням до південного доку.',
    reason:
      'Constrain the shield to the actual cargo aisle so facing and loaded turning room produce a repeatable, readable flanking decision.',
  },
  'classic-operation-harvest-rendezvous': {
    tactics: [{ policyIndex: 1, route: route(line(5, 9, 1, 0, 14), line(18, 8, 0, -1, 4)) }],
    en: 'Deliver the north and south harvests before meeting in the centre. The sprinter commits across the clear aisle: bait its burst, then cross during recovery.',
    uk: 'Доставте північний і південний врожаї перед зустріччю в центрі. Спринтер рухається вільним проходом: спровокуйте ривок і перетніть шлях під час відновлення.',
    reason:
      'A committed cross-aisle sprint gives the two deliveries a shared timing decision instead of adding another unconstrained chase at the end.',
  },
});

export const CLASSIC_EDITORIAL_REVISIONS = Object.freeze({
  'classic-field-border-watch': {
    goal: 3,
    en: 'Three perimeter interceptions teach the outer circuit. Cut across the clear interior; the next mission combines this route with a runner.',
    uk: 'Три перехоплення навчають зовнішнього кола. Зрізайте через вільну середину; наступна місія поєднує цей маршрут із бігуном.',
    reason:
      'A single unchanged 72-cell perimeter policy repeated six times without a second decision. Three catches teach approach, interception and a longer-cable return; Border Cutoff retains eight mixed-policy catches.',
  },
  'classic-field-contour-orbit': {
    goal: 3,
    en: 'Make three interceptions around the island. Take the next cut instead of following the crawler’s heels; the following mission adds an outer patrol.',
    uk: 'Зробіть три перехоплення навколо острова. Зрізайте шлях замість переслідування повзуна; наступна місія додає зовнішній патруль.',
    reason:
      'The 28-cell island loop repeats one unchanged contour policy with no supplies, speed changes or stages. Match the three-catch introductory rhythm of Oval Intercept, before Contour Transfer adds a second circuit.',
  },
  'classic-field-wake-watch': {
    goal: 3,
    en: 'Wake three rovers from open approaches, then intercept their announced movement. Their bodies are always safe to catch.',
    uk: 'Розбудіть трьох роверів із відкритих підходів і перехопіть їхній оголошений рух. Їхні тіла завжди безпечно ловити.',
    reason:
      'Six identical rover policies repeated the wake-and-intercept lesson after it was established. Three preserve learning and cable growth; Wake Courtyard keeps eight alternating rover and perimeter encounters.',
  },
  'classic-field-ricochet-line': {
    goal: 3,
    en: 'Read three reflected returns along the straight. Intercept ahead of the target; the next yard adds a waking rover.',
    uk: 'Прочитайте три відбиті повернення вздовж прямої. Перехоплюйте ціль попереду; наступний двір додає ровера, що прокидається.',
    reason:
      'One horizontal-reflection policy repeated six catches with unchanged cover and speed. Three keep a first read, correction and confirmation before Ricochet Yard combines reflections with a rover.',
  },
  'classic-operation-loaded-excavation': {
    removeWalls: [{ x: 12, y: 8 }],
    en: 'Load before approaching the marked stone. Its far side is already recessed: let demolition open the remaining cell for a direct delivery, or take the always-open outer route.',
    uk: 'Завантажтеся перед підходом до позначеного каменю. За ним уже є заглиблення: дочекайтеся руйнування останньої клітинки для прямої доставки або скористайтеся постійним зовнішнім обходом.',
    reason:
      'The original two-cell-thick wall stayed sealed after its sole marked cell broke. A far-side recess makes the promised demolition shortcut real while retaining the loaded outer bypass.',
  },
});

export const CLASSIC_REMASTER_PROTOTYPES = Object.freeze([
  { id: 'open', levelId: 'classic-snake-open-loop', mode: 'solo' },
  { id: 'dense', levelId: 'classic-pursuit-crossing-bursts', mode: 'solo' },
  { id: 'cargo', levelId: 'classic-operation-orchard-post', mode: 'solo' },
  { id: 'wrap', levelId: 'classic-snake-keep-the-tail', mode: 'solo' },
  { id: 'signal', levelId: 'classic-field-quiet-return', mode: 'solo' },
  { id: 'team-gate', levelId: 'classic-operation-assembly-return', mode: 'team' },
]);

export function remasterClassicSnakeEntry(entry) {
  const editorial = CLASSIC_EDITORIAL_REVISIONS[entry.id];
  if (editorial)
    return {
      ...entry,
      description: { en: editorial.en, uk: editorial.uk },
      level: {
        ...entry.level,
        revision: 'editorial-pacing-1',
        ...(editorial.goal === undefined ? {} : { goal: editorial.goal }),
        walls: entry.level.walls.filter(
          (wall) =>
            !(editorial.removeWalls || []).some((cell) => cell.x === wall.x && cell.y === wall.y),
        ),
      },
    };
  const revision = CLASSIC_REMASTER_REVISIONS[entry.id];
  if (!revision) return entry;
  return {
    ...entry,
    description: { en: revision.en, uk: revision.uk },
    level: {
      ...entry.level,
      version: 'classic-snake-level.v6',
      revision: 'tactical-remaster-1',
      tactics: revision.tactics,
    },
  };
}
