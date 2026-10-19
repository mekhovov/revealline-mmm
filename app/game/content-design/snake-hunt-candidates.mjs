import { createOpeningCandidates } from './horizon-candidates.mjs';
import { COMBAT_ACTOR_CATALOG, freezeDesign } from './catalogs.mjs';
import { compileMapGeometry } from './map.mjs';
import { CELL } from '../core/registry.mjs';

export const SNAKE_HUNT_ROUTE_ID = 'snake-hunt-v1';
export const SNAKE_HUNT_PACK_ID = 'journey-snake-hunt';
const bilingual = (en, uk) => ({ en, uk });
const chapter = (id, name, uk, description, descriptionUk) => ({
  id,
  campaignId: `snake-${id}`,
  name,
  description,
  localizedName: bilingual(name, uk),
  localizedDescription: bilingual(description, descriptionUk),
});

export const SNAKE_HUNT_CHAPTERS = freezeDesign([
  chapter(
    'first-coils',
    'First Coils',
    'Перші витки',
    'Learn to grow a following body and leave room for its next turn. Contact and enclosure both clear targets.',
    'Навчіться вирощувати хвіст і залишати місце для наступного повороту. Цілі зараховуються і від дотику, і від захоплення території.',
  ),
  chapter(
    'wide-turns',
    'Wide Turns',
    'Широкі повороти',
    'Read elbows, pockets and switchbacks before the body reaches them. The shortest line is not always the easiest turn.',
    'Читайте вигини, кишені й серпантини, поки хвіст ще не дістався до них. Найкоротший шлях не завжди найзручніший для повороту.',
  ),
  chapter(
    'long-way-round',
    'Long Way Round',
    'Довга дорога навколо',
    'Keep a longer body moving around islands and staggered walls. Build returns without cutting across your own wake.',
    'Проведіть довгий хвіст між островами та зміщеними стінами. Створюйте шляхи повернення, не перетинаючи власний хвіст.',
  ),
  chapter(
    'interception-grounds',
    'Interception Grounds',
    'Майданчики перехоплення',
    'Use forks and parallel lanes to intercept fleeing humanoids. Optional catch chains reward a planned circuit.',
    'Перехоплюйте втікачів на розвилках і паралельних смугах. Необов’язкові серії винагороджують продуманий маршрут.',
  ),
  chapter(
    'safe-returns',
    'Safe Returns',
    'Безпечні повернення',
    'Compare persistent tails with missions that shed segments on a field-to-safe return. Choose when to bank your route.',
    'Порівняйте постійний хвіст із місіями, де повернення з поля на безпечну землю скидає сегменти. Обирайте момент повернення.',
  ),
  chapter(
    'crossfire-gardens',
    'Crossfire Gardens',
    'Сади перехресного вогню',
    'Route a growing body around fixed guard warnings. Keep a wide exit; effects never replace the warning line.',
    'Прокладайте шлях зростаючому хвосту повз попередження охоронців. Залишайте широкий вихід; ефекти не приховують лінію прицілу.',
  ),
  chapter(
    'shared-circuits',
    'Shared Circuits',
    'Спільні кола',
    'Plan crossings and opposite approaches. In Team, both bodies are hazards and every catch advances the shared goal.',
    'Плануйте перетини та зустрічні підходи. У командній грі обидва хвости небезпечні, а кожна спіймана ціль наближає спільну перемогу.',
  ),
  chapter(
    'final-weave',
    'Final Weave',
    'Останнє плетіння',
    'Combine long tails, deliberate returns, guards and optional ordered catches. Clear every target by either legal method.',
    'Поєднайте довгі хвости, продумані повернення, охоронців і необов’язковий порядок цілей. Приберіть усі цілі будь-яким із двох способів.',
  ),
]);

const rects = (rows = []) => rows.map(([x, y, w, h]) => ({ x, y, w, h }));
const stage = (chapterIndex, id, name, uk, route, routeUk, walls = [], foundations = []) => ({
  id: `snake-${id}`,
  campaignId: SNAKE_HUNT_CHAPTERS[chapterIndex].campaignId,
  chapterIndex,
  name,
  description: route,
  localizedName: bilingual(name, uk),
  localizedDescription: bilingual(route, routeUk),
  walls: rects(walls),
  foundations: rects(foundations),
});
// Forty-eight explicit layouts. No old map revision is relabelled, mirrored at
// launch or made harder merely by raising speed. Each layout has broad bypasses.
export const SNAKE_HUNT_STAGES = freezeDesign([
  stage(
    0,
    'open-loop',
    'Open Loop',
    'Відкрита петля',
    'Catch a nearby runner, then make a broad loop before approaching the next one.',
    'Спіймайте ближнього втікача, потім зробіть широку петлю перед наступною ціллю.',
    [],
    [[31, 16, 8, 3]],
  ),
  stage(
    0,
    'two-landings',
    'Two Landings',
    'Дві пристані',
    'Choose the upper or lower landing; leave your growing tail room to follow the return.',
    'Оберіть верхню чи нижню пристань і залиште зростаючому хвосту місце для повернення.',
    [],
    [
      [22, 8, 8, 3],
      [43, 24, 8, 3],
    ],
  ),
  stage(
    0,
    'first-baffle',
    'First Baffle',
    'Перша перегородка',
    'Pass the short wall on either side, then turn in open water instead of beside its tip.',
    'Обійдіть коротку стіну з будь-якого боку й повертайте на просторі, а не біля її краю.',
    [[33, 12, 3, 11]],
    [[15, 16, 6, 3]],
  ),
  stage(
    0,
    'offset-docks',
    'Offset Docks',
    'Зміщені причали',
    'Connect one offset dock and use a different exit for the next catch.',
    'З’єднайте один зі зміщених причалів і вирушайте до наступної цілі іншим виходом.',
    [[37, 17, 10, 2]],
    [
      [17, 8, 6, 4],
      [49, 25, 6, 3],
    ],
  ),
  stage(
    0,
    'room-to-follow',
    'Room to Follow',
    'Місце для хвоста',
    'Circle the middle wall pair; compare a contact catch with an enclosure from the outer rail.',
    'Обійдіть центральну пару стін і порівняйте дотик до цілі із захопленням від зовнішнього краю.',
    [
      [27, 10, 2, 13],
      [43, 14, 2, 12],
    ],
    [[33, 27, 7, 3]],
  ),
  stage(
    0,
    'first-circuit',
    'First Circuit',
    'Перше коло',
    'Plan a complete circuit through three landings and remove every humanoid.',
    'Прокладіть повне коло через три пристані й приберіть усіх гуманоїдів.',
    [[35, 12, 3, 9]],
    [
      [16, 8, 6, 3],
      [49, 10, 6, 3],
      [32, 26, 8, 3],
    ],
  ),
  stage(
    1,
    'open-elbow',
    'Open Elbow',
    'Відкритий вигин',
    'Use the open end of the L-shaped wall, leaving space for the body after your turn.',
    'Скористайтеся відкритим краєм Г-подібної стіни й залиште хвосту місце після повороту.',
    [
      [25, 10, 3, 15],
      [28, 22, 18, 3],
    ],
    [[48, 10, 6, 3]],
  ),
  stage(
    1,
    'u-turn-yard',
    'U-turn Yard',
    'Двір розвороту',
    'Enter the wide yard only after choosing which side will carry your return.',
    'Заходьте в широкий двір, лише обравши бік для повернення.',
    [
      [24, 9, 3, 17],
      [27, 23, 20, 3],
      [47, 13, 3, 13],
    ],
    [[32, 13, 7, 3]],
  ),
  stage(
    1,
    'staggered-elbows',
    'Staggered Elbows',
    'Зміщені вигини',
    'Alternate left and right passages; do not reverse into the body trailing behind you.',
    'Чергуйте лівий і правий проходи та не розвертайтеся у власний хвіст.',
    [
      [21, 7, 3, 13],
      [24, 17, 13, 3],
      [46, 16, 3, 13],
      [35, 26, 11, 3],
    ],
    [[31, 7, 7, 3]],
  ),
  stage(
    1,
    'turning-pockets',
    'Turning Pockets',
    'Кишені для повороту',
    'Use the broad pockets between posts to turn before chasing a runner into the next lane.',
    'Повертайте в широких кишенях між стовпами, перш ніж гнатися за втікачем у наступну смугу.',
    [
      [22, 10, 4, 7],
      [39, 19, 4, 8],
      [53, 8, 3, 10],
    ],
    [
      [30, 24, 5, 3],
      [43, 8, 5, 3],
    ],
  ),
  stage(
    1,
    's-bend',
    'S-bend',
    'Змійка',
    'Thread the staggered walls with wide turns, or take the longer outside circuit.',
    'Пройдіть між зміщеними стінами широкими поворотами або оберіть довший зовнішній шлях.',
    [
      [18, 9, 27, 3],
      [31, 23, 25, 3],
    ],
    [
      [18, 25, 6, 3],
      [50, 7, 6, 3],
    ],
  ),
  stage(
    1,
    'elbow-exchange',
    'Elbow Exchange',
    'Обмін вигинами',
    'Combine two elbows and a central landing; preserve an open route after each catch.',
    'Поєднайте два вигини та центральну пристань; після кожної цілі залишайте відкритий шлях.',
    [
      [18, 9, 3, 14],
      [21, 20, 10, 3],
      [50, 13, 3, 14],
      [40, 13, 10, 3],
    ],
    [[33, 16, 5, 4]],
  ),
  stage(
    2,
    'long-island',
    'Long Island',
    'Довгий острів',
    'Walk the longer body around the island before crossing your previous approach.',
    'Обведіть довгий хвіст навколо острова, перш ніж перетинати попередній підхід.',
    [],
    [[27, 12, 18, 8]],
  ),
  stage(
    2,
    'split-islands',
    'Split Islands',
    'Розділені острови',
    'Choose a gap or an outer shore; make the choice before the tail enters the gap.',
    'Оберіть протоку чи зовнішній берег до того, як хвіст увійде в протоку.',
    [[35, 15, 2, 7]],
    [
      [20, 9, 8, 6],
      [45, 23, 8, 5],
    ],
  ),
  stage(
    2,
    'bent-causeway',
    'Bent Causeway',
    'Вигнута дамба',
    'Use the bent landing as a safe return, then depart along an unoccupied side.',
    'Використайте вигнуту пристань для безпечного повернення й вирушайте з вільного боку.',
    [[43, 8, 3, 10]],
    [
      [22, 14, 16, 3],
      [35, 17, 3, 10],
    ],
  ),
  stage(
    2,
    'three-detours',
    'Three Detours',
    'Три обхідні шляхи',
    'Pick the order of three detours while the longer body occupies your earlier route.',
    'Оберіть порядок трьох обхідних шляхів, поки довгий хвіст займає попередній маршрут.',
    [
      [19, 8, 4, 15],
      [34, 18, 4, 12],
      [51, 7, 4, 15],
    ],
    [
      [28, 8, 6, 3],
      [43, 27, 6, 3],
    ],
  ),
  stage(
    2,
    'inner-or-outer',
    'Inner or Outer',
    'Всередині чи зовні',
    'Use the broad inner passage for a quick catch or bank a safer outer enclosure.',
    'Скористайтеся широким внутрішнім проходом для швидкого дотику або захопіть територію безпечнішим зовнішнім шляхом.',
    [
      [23, 9, 25, 3],
      [23, 12, 3, 13],
      [26, 25, 22, 3],
    ],
    [[35, 17, 6, 3]],
  ),
  stage(
    2,
    'long-circuit',
    'Long Circuit',
    'Довгий обхід',
    'Link the four landing corners and carry the full body through the remaining exits.',
    'З’єднайте чотири кутові пристані й проведіть увесь хвіст через вільні виходи.',
    [[32, 12, 7, 12]],
    [
      [17, 7, 6, 3],
      [49, 7, 6, 3],
      [18, 27, 6, 3],
      [48, 27, 6, 3],
    ],
  ),
  stage(
    3,
    'forked-chase',
    'Forked Chase',
    'Погоня на розвилці',
    'Choose a fork that intercepts the runner rather than copying every turn it takes.',
    'Оберіть розвилку для перехоплення втікача, а не повторюйте кожен його поворот.',
    [
      [33, 9, 3, 18],
      [21, 17, 12, 3],
    ],
    [[47, 16, 7, 3]],
  ),
  stage(
    3,
    'parallel-paths',
    'Parallel Paths',
    'Паралельні шляхи',
    'Travel the neighbouring lane and meet the runner at an open end.',
    'Рухайтеся сусідньою смугою й зустріньте втікача біля відкритого краю.',
    [
      [24, 8, 3, 20],
      [45, 8, 3, 20],
    ],
    [[33, 15, 6, 4]],
  ),
  stage(
    3,
    'crossroads',
    'Crossroads',
    'Перехрестя',
    'Reserve the middle crossing for a planned turn instead of a last-moment reversal.',
    'Залиште центральне перехрестя для запланованого повороту, а не раптового розвороту.',
    [
      [23, 9, 7, 5],
      [42, 9, 7, 5],
      [23, 23, 7, 5],
      [42, 23, 7, 5],
    ],
    [[33, 16, 6, 3]],
  ),
  stage(
    3,
    'broken-divider',
    'Broken Divider',
    'Перервана перегородка',
    'Select one of three divider gaps and reach it before the fleeing target.',
    'Оберіть один із трьох проходів у перегородці й дістаньтеся до нього раніше за ціль.',
    [
      [34, 4, 3, 5],
      [34, 14, 3, 8],
      [34, 27, 3, 5],
    ],
    [
      [19, 17, 6, 3],
      [48, 17, 6, 3],
    ],
  ),
  stage(
    3,
    'runner-triangle',
    'Runner Triangle',
    'Трикутник втікачів',
    'Use the three landing approaches as an interception circuit; ordered catches are a bonus.',
    'Використайте підходи до трьох пристаней для перехоплення; порядок цілей дає лише бонус.',
    [
      [26, 13, 3, 10],
      [43, 13, 3, 10],
    ],
    [
      [31, 6, 9, 3],
      [17, 27, 7, 3],
      [48, 27, 7, 3],
    ],
  ),
  stage(
    3,
    'cutoff-network',
    'Cutoff Network',
    'Мережа перехоплень',
    'Combine parallel lanes and open junctions, keeping the tail out of the next interception.',
    'Поєднайте паралельні смуги та відкриті розв’язки, не заводячи хвіст на наступний шлях перехоплення.',
    [
      [20, 8, 3, 17],
      [35, 16, 3, 13],
      [50, 7, 3, 15],
    ],
    [
      [28, 7, 5, 3],
      [42, 27, 5, 3],
    ],
  ),
  stage(
    4,
    'keep-the-tail',
    'Keep the Tail',
    'Збережіть хвіст',
    'Return to the central bank and notice that this mission keeps the full body.',
    'Поверніться на центральний берег: у цій місії хвіст зберігається повністю.',
    [
      [23, 9, 3, 15],
      [47, 13, 3, 15],
    ],
    [[32, 15, 7, 5]],
  ),
  stage(
    4,
    'lighten-at-home',
    'Lighten at Home',
    'Полегшення вдома',
    'Catch a target, then return from the field to safe ground to shed two segments.',
    'Спіймайте ціль, а потім поверніться з поля на безпечну землю, щоб скинути два сегменти.',
    [[32, 10, 3, 14]],
    [
      [18, 18, 7, 3],
      [48, 9, 7, 3],
    ],
  ),
  stage(
    4,
    'banking-steps',
    'Banking Steps',
    'Сходинки повернення',
    'Use each stepped landing as a deliberate shedding return, then choose a fresh exit.',
    'Використовуйте ступінчасті пристані для навмисного скидання хвоста й обирайте новий вихід.',
    [[38, 9, 3, 10]],
    [
      [18, 8, 6, 3],
      [29, 16, 6, 3],
      [43, 25, 6, 3],
    ],
  ),
  stage(
    4,
    'persistent-hub',
    'Persistent Hub',
    'Постійний хвіст у вузлі',
    'Choose opposite exits from the hub; returning here does not shorten the body.',
    'Оберіть протилежні виходи з вузла: повернення сюди не скорочує хвіст.',
    [
      [20, 7, 3, 12],
      [49, 19, 3, 12],
    ],
    [[31, 13, 9, 9]],
  ),
  stage(
    4,
    'two-return-rhythm',
    'Two-return Rhythm',
    'Ритм двох повернень',
    'Alternate the two wide banks and use their shedding returns to prepare the next crossing.',
    'Чергуйте два широкі береги й скидайте хвіст під час повернення перед наступним перетином.',
    [[33, 9, 3, 18]],
    [
      [17, 13, 7, 8],
      [49, 13, 7, 8],
    ],
  ),
  stage(
    4,
    'return-weave',
    'Return Weave',
    'Плетіння повернень',
    'Choose between a nearby shedding return and a longer chain of catches before banking.',
    'Оберіть близьке повернення зі скиданням хвоста чи довшу серію цілей перед поверненням.',
    [
      [22, 10, 3, 13],
      [46, 14, 3, 13],
    ],
    [
      [14, 26, 6, 3],
      [32, 7, 7, 3],
      [53, 8, 6, 3],
    ],
  ),
  stage(
    5,
    'one-warning',
    'One Warning',
    'Одне попередження',
    'Let the guard fix its aim, then move the body through a different wide exit.',
    'Дочекайтеся фіксації прицілу охоронця й проведіть хвіст через інший широкий вихід.',
    [[34, 13, 3, 10]],
    [
      [20, 10, 7, 3],
      [45, 25, 7, 3],
    ],
  ),
  stage(
    5,
    'warning-courtyard',
    'Warning Courtyard',
    'Двір під прицілом',
    'Read the fixed warning before entering the courtyard; retain an outside route for the tail.',
    'Прочитайте зафіксоване попередження перед входом у двір і залиште хвосту зовнішній шлях.',
    [
      [23, 9, 25, 3],
      [23, 12, 3, 13],
      [45, 19, 3, 6],
    ],
    [[32, 17, 7, 3]],
  ),
  stage(
    5,
    'crossed-sightlines',
    'Crossed Sightlines',
    'Перехресні приціли',
    'Separate the two guards by approaching from different heights, keeping a broad return.',
    'Розділіть двох охоронців підходами на різній висоті та залишайте широке повернення.',
    [
      [27, 8, 3, 14],
      [43, 17, 3, 12],
    ],
    [
      [18, 26, 6, 3],
      [49, 7, 6, 3],
    ],
  ),
  stage(
    5,
    'screened-approach',
    'Screened Approach',
    'Прикритий підхід',
    'Use the screen ends to change approach after a warning; do not fold the tail at the wall.',
    'Змінюйте підхід біля країв перегородок після попередження й не складайте хвіст біля стіни.',
    [
      [20, 11, 15, 3],
      [39, 22, 15, 3],
    ],
    [
      [20, 25, 7, 3],
      [46, 8, 7, 3],
    ],
  ),
  stage(
    5,
    'guarded-returns',
    'Guarded Returns',
    'Повернення під охороною',
    'Secure a landing before crossing a watched lane; guards and runners share the clear-all goal.',
    'Закріпіть пристань перед перетином смуги під прицілом; для перемоги потрібні і охоронці, і втікачі.',
    [
      [30, 8, 3, 9],
      [40, 21, 3, 9],
    ],
    [
      [16, 16, 7, 4],
      [50, 16, 7, 4],
    ],
  ),
  stage(
    5,
    'garden-crossfire',
    'Garden Crossfire',
    'Перехресний вогонь у саду',
    'Plan the outside loop around both warning lanes and choose contact or enclosure for the final guards.',
    'Прокладіть зовнішнє коло навколо двох ліній прицілу та приберіть останніх охоронців дотиком або захопленням.',
    [
      [24, 10, 3, 15],
      [47, 10, 3, 15],
    ],
    [
      [33, 7, 8, 3],
      [33, 27, 8, 3],
    ],
  ),
  stage(
    6,
    'opposite-arrivals',
    'Opposite Arrivals',
    'Зустрічні прибуття',
    'Take opposite approaches to the shared middle; in Team, wait until the other tail has passed.',
    'Підійдіть до спільного центру з протилежних боків; у команді дочекайтеся проходу хвоста партнера.',
    [
      [27, 9, 3, 17],
      [44, 9, 3, 17],
    ],
    [[34, 15, 6, 4]],
  ),
  stage(
    6,
    'crossing-schedule',
    'Crossing Schedule',
    'Черга на перехресті',
    'Cross the central opening in sequence; choose an outer detour when a body occupies it.',
    'Проходьте центральний отвір по черзі; якщо там хвіст, оберіть зовнішній обхід.',
    [
      [19, 11, 12, 3],
      [42, 11, 12, 3],
      [19, 24, 12, 3],
      [42, 24, 12, 3],
    ],
    [[33, 17, 7, 3]],
  ),
  stage(
    6,
    'paired-loops',
    'Paired Loops',
    'Парні петлі',
    'Begin with separate loops and meet at a clear landing after both approaches open.',
    'Почніть окремими петлями та зустріньтеся на вільній пристані, коли відкриються обидва підходи.',
    [
      [22, 11, 3, 14],
      [48, 11, 3, 14],
    ],
    [
      [15, 7, 6, 3],
      [52, 27, 6, 3],
      [33, 16, 7, 3],
    ],
  ),
  stage(
    6,
    'shared-detour',
    'Shared Detour',
    'Спільний обхід',
    'Choose who uses the inner detour first; the outer shore remains available to the other route.',
    'Оберіть, хто першим піде внутрішнім обходом; зовнішній берег залишається для іншого маршруту.',
    [
      [27, 9, 21, 3],
      [27, 12, 3, 14],
      [30, 26, 18, 3],
    ],
    [[37, 17, 6, 3]],
  ),
  stage(
    6,
    'support-corridor',
    'Support Corridor',
    'Коридор підтримки',
    'Keep separate exits around the guard corridor; Team Support and rescue remain available.',
    'Зберігайте окремі виходи біля коридору охоронців; командна підтримка та порятунок залишаються доступними.',
    [
      [22, 8, 3, 19],
      [48, 8, 3, 19],
    ],
    [
      [33, 7, 7, 3],
      [33, 27, 7, 3],
    ],
  ),
  stage(
    6,
    'shared-circuit',
    'Shared Circuit',
    'Спільне коло',
    'Divide the outer circuit, announce the middle crossing, and clear the shared finite population.',
    'Розділіть зовнішнє коло, узгодьте центральний перетин і приберіть усі спільні цілі.',
    [
      [20, 10, 3, 10],
      [34, 19, 3, 11],
      [49, 8, 3, 12],
    ],
    [
      [28, 7, 6, 3],
      [43, 26, 6, 3],
    ],
  ),
  stage(
    7,
    'long-opening',
    'Long Opening',
    'Довгий початок',
    'Start with a long body and choose an open circuit before the first catch adds more segments.',
    'Почніть із довгим хвостом і виберіть відкрите коло до того, як перша ціль додасть сегменти.',
    [
      [23, 10, 3, 17],
      [47, 8, 3, 17],
    ],
    [[32, 14, 8, 6]],
  ),
  stage(
    7,
    'fork-and-warning',
    'Fork and Warning',
    'Розвилка під прицілом',
    'Resolve the fork before the guard fires; a wide return is worth more than a rushed chain.',
    'Оберіть розвилку до пострілу охоронця; широке повернення важливіше за поспішну серію.',
    [
      [33, 7, 3, 21],
      [19, 17, 14, 3],
    ],
    [
      [45, 10, 7, 3],
      [45, 25, 7, 3],
    ],
  ),
  stage(
    7,
    'ordered-islands',
    'Ordered Islands',
    'Острови по порядку',
    'Try the suggested target order around the islands, or enclose any target to finish safely.',
    'Спробуйте запропонований порядок цілей навколо островів або захоплюйте будь-яку ціль для безпечного завершення.',
    [[35, 13, 3, 9]],
    [
      [17, 8, 7, 4],
      [49, 9, 7, 4],
      [31, 26, 10, 3],
    ],
  ),
  stage(
    7,
    'last-shedding-bank',
    'Last Shedding Bank',
    'Останній берег скидання',
    'Use the central return to shed four segments before tackling the remaining guard lanes.',
    'Скиньте чотири сегменти на центральному поверненні, перш ніж пройти решту смуг охоронців.',
    [
      [22, 8, 3, 18],
      [49, 11, 3, 18],
    ],
    [[33, 14, 8, 7]],
  ),
  stage(
    7,
    'woven-gauntlet',
    'Woven Gauntlet',
    'Плетене випробування',
    'Weave between the staggered screens with a long body; optional order never prevents a clear.',
    'Проведіть довгий хвіст між зміщеними перегородками; необов’язковий порядок не заважає перемозі.',
    [
      [18, 8, 16, 3],
      [39, 17, 16, 3],
      [20, 26, 16, 3],
    ],
    [
      [44, 7, 7, 3],
      [23, 17, 7, 3],
    ],
  ),
  stage(
    7,
    'final-weave',
    'The Final Weave',
    'Останнє плетіння',
    'Combine wide turns, guarded crossings and deliberate returns; remove every humanoid by contact or enclosure.',
    'Поєднайте широкі повороти, перетини під прицілом і продумані повернення; приберіть усіх гуманоїдів дотиком або захопленням.',
    [
      [23, 8, 3, 12],
      [47, 16, 3, 12],
      [33, 14, 7, 3],
    ],
    [
      [15, 26, 6, 3],
      [49, 6, 6, 3],
      [32, 26, 8, 3],
    ],
  ),
]);

const sharedCopy = {
  lesson: bilingual(
    'Your body follows your route and grows after every humanoid removed by contact or enclosure. Avoid your own trailing body; the capture line remains a separate rule.',
    'Хвіст повторює ваш маршрут і росте після кожного гуманоїда, прибраного дотиком або захопленням. Не врізайтеся у власний хвіст; лінія захоплення діє окремо.',
  ),
  counterplay: bilingual(
    'Plan a wide exit before turning. Humanoids flee, round keepers remain dangerous, and a return does not remove a tail unless this mission explicitly sheds segments.',
    'Плануйте широкий вихід перед поворотом. Гуманоїди тікають, круглі хранителі залишаються небезпечними, а повернення прибирає хвіст лише в місіях зі скиданням сегментів.',
  ),
  consequence: bilingual(
    'Remove every humanoid to finish. Enclosure and contact both count; percentage, catch chains and target order are not additional clear requirements.',
    'Приберіть усіх гуманоїдів для перемоги. Захоплення й дотик зараховуються однаково; відсоток території, серії та порядок цілей не є додатковими умовами.',
  ),
  mastery: bilingual(
    'Clear without a lost life, mixing contact and enclosure while keeping the tail clear of your next turn.',
    'Пройдіть без втрати життя, поєднуючи дотики й захоплення та звільняючи місце для наступного повороту.',
  ),
  teamRoute: bilingual(
    'In Team, choose separate departures and share the clear-all quota. Each pilot grows their own body.',
    'У команді обирайте окремі виходи та разом прибирайте всі цілі. Кожен пілот вирощує власний хвіст.',
  ),
  teamTail: bilingual(
    'In Team, your partner’s trailing body is also dangerous: schedule shared crossings and leave a rescue approach.',
    'У команді хвіст партнера теж небезпечний: узгоджуйте спільні перетини й залишайте підхід для порятунку.',
  ),
  selfTail: bilingual(
    'In Team, only your own trailing body is a tail hazard; keep separate routes to learn the geometry.',
    'У команді небезпечний лише власний хвіст; обирайте окремі маршрути, щоб вивчити геометрію.',
  ),
};

function bodyRecipe(chapterIndex, within, targetIds) {
  const initialLength = [2, 4, 8, 6, 10, 8, 10, 14][chapterIndex] + within;
  const growthPerCatch = [1, 1, 2, 2, 3, 2, 2, 3][chapterIndex];
  const bonus =
    chapterIndex === 0
      ? 'none'
      : (chapterIndex >= 3 && within >= 4) || (chapterIndex === 7 && within === 2)
        ? 'ordered'
        : 'chain';
  return {
    version: 'snake-hunt.v1',
    initialLength,
    growthPerCatch,
    maxLength: Math.min(64, initialLength + targetIds.length * growthPerCatch),
    shedOnReturn:
      chapterIndex === 4 ? [0, 2, 4, 0, 6, 3][within] : chapterIndex === 7 && within === 3 ? 4 : 0,
    friendlyTail: chapterIndex >= 6 ? 'team' : 'self',
    bonus,
    chainWindowTicks: 1200,
    order: bonus === 'ordered' ? [...targetIds] : [],
  };
}

// Authoring-time, deterministic clearance adjustment around the explicit map.
// Preferred points span four quadrants; a wall never silently swallows a target.
function placeActors(map, stageIndex, targetCount, guards) {
  const chapterIndex = Math.floor(stageIndex / 6);
  const geometry = compileMapGeometry(map);
  const occupied = [];
  const locate = ([px, py]) => {
    let best = null;
    for (let y = 3; y < 33; y++)
      for (let x = 3; x < 69; x++) {
        if (geometry.cells[y * 72 + x] !== CELL.FIELD) continue;
        if (
          [-1, 0, 1].some((dy) =>
            [-1, 0, 1].some((dx) => geometry.cells[(y + dy) * 72 + x + dx] !== CELL.FIELD),
          )
        )
          continue;
        const candidate = { x: x + 0.5, y: y + 0.5 };
        if (occupied.some((other) => Math.hypot(other.x - candidate.x, other.y - candidate.y) < 4))
          continue;
        const distance = (candidate.x - px) ** 2 + (candidate.y - py) ** 2;
        if (!best || distance < best.distance) best = { ...candidate, distance };
      }
    if (!best) throw new Error('Snake layout has no clear authored actor position.');
    const result = { x: best.x, y: best.y };
    occupied.push(result);
    return result;
  };
  const actors = [
    [8.5, 25.5],
    [63.5, 10.5],
  ].map((point, index) => ({
    id: `keeper-${index + 1}`,
    role: 'field-keeper',
    tier: 'measured',
    ...locate(point),
    heading: index ? [-1, 1] : [1, -1],
  }));
  const anchors = [
    [16.5, 8.5],
    [54.5, 26.5],
    [52.5, 8.5],
    [18.5, 27.5],
    [35.5, 7.5],
    [36.5, 29.5],
    [12.5, 17.5],
    [59.5, 18.5],
  ];
  for (let index = 0; index < targetCount; index++) {
    const isGuard = index >= targetCount - guards;
    const point = anchors[(index + (stageIndex % 4)) % anchors.length];
    actors.push({
      id: `target-${index + 1}`,
      role: isGuard ? 'optional-sentry' : 'optional-scout',
      tier: chapterIndex === 7 ? 'brisk' : chapterIndex >= 4 ? 'standard' : 'measured',
      ...locate(point),
      heading: index % 2 ? [-1, 0] : [1, 0],
    });
  }
  return actors;
}

export function snakeStageCopy(stage, { team = false } = {}) {
  const chapter = SNAKE_HUNT_CHAPTERS[stage.chapterIndex];
  const within = SNAKE_HUNT_STAGES.indexOf(stage) % 6;
  const targetCount = 4 + Math.floor(stage.chapterIndex / 2) + (within === 5 ? 1 : 0);
  const body = bodyRecipe(
    stage.chapterIndex,
    within,
    Array.from({ length: targetCount }, (_, i) => `target-${i + 1}`),
  );
  const recipe = bilingual(
    `Starts with capacity ${body.initialLength}; grows ${body.growthPerCatch} per catch, up to ${body.maxLength}. ${body.shedOnReturn ? `A field-to-safe return sheds up to ${body.shedOnReturn} segments.` : 'Returns retain the body.'}`,
    `Початкова місткість — ${body.initialLength}; кожна ціль додає ${body.growthPerCatch}, максимум — ${body.maxLength}. ${body.shedOnReturn ? `Повернення з поля на безпечну землю скидає до ${body.shedOnReturn} сегментів.` : 'Повернення зберігають хвіст.'}`,
  );
  const teamCopy = body.friendlyTail === 'team' ? sharedCopy.teamTail : sharedCopy.selfTail;
  return {
    routeDecision: bilingual(
      ...['en', 'uk'].map((locale) =>
        [
          stage.localizedDescription[locale],
          recipe[locale],
          ...(team ? [sharedCopy.teamRoute[locale], teamCopy[locale]] : []),
        ].join(' '),
      ),
    ),
    lesson: bilingual(
      ...['en', 'uk'].map(
        (locale) => `${chapter.localizedDescription[locale]} ${sharedCopy.lesson[locale]}`,
      ),
    ),
    counterplay: sharedCopy.counterplay,
    captureConsequence: sharedCopy.consequence,
    memorableMoment: stage.localizedDescription,
    mastery:
      body.bonus === 'ordered'
        ? bilingual(
            'Try the numbered target order for bonus points. Any contact or enclosure still clears that target; a missed order never blocks completion.',
            'Спробуйте прибирати пронумеровані цілі по порядку заради бонусу. Дотик або захоплення прибирає будь-яку ціль; порушення порядку не заважає завершенню.',
          )
        : body.bonus === 'chain'
          ? bilingual(
              'Try consecutive catches within ten seconds for a chain bonus. The main clear has no countdown.',
              'Спробуйте прибирати цілі з інтервалом до десяти секунд заради бонусу серії. Основна мета не має таймера.',
            )
          : sharedCopy.mastery,
  };
}

/** Brand-new gameplay maps with honestly retained Horizon artwork pins. The
 * images are scenery, not claims that these new obstacle layouts were depicted. */
export function createSnakeHuntCandidates({ artwork = true } = {}) {
  const opening = createOpeningCandidates({ artwork });
  const template = opening.missions[0];
  const source = {
    ...opening,
    id: 'snake-hunt-project',
    revision: 'snake-hunt-1',
    name: 'Snake Hunt',
    actorCatalogId: COMBAT_ACTOR_CATALOG.id,
    maps: [],
    missions: [],
    campaigns: SNAKE_HUNT_CHAPTERS.map((chapter, index) => ({
      format: 'CampaignDesignV1',
      id: chapter.campaignId,
      revision: '1',
      name: chapter.name,
      band: Math.min(4, 1 + Math.floor(index / 2)),
      missionIds: SNAKE_HUNT_STAGES.filter((stage) => stage.campaignId === chapter.campaignId).map(
        (stage) => stage.id,
      ),
    })),
    packs: [
      {
        format: 'PackDesignV1',
        id: SNAKE_HUNT_PACK_ID,
        revision: '1',
        name: 'Snake Hunt · eight chapters',
        campaignIds: SNAKE_HUNT_CHAPTERS.map((chapter) => chapter.campaignId),
      },
    ],
  };
  for (const [index, stage] of SNAKE_HUNT_STAGES.entries()) {
    const within = index % 6;
    const map = {
      format: 'MapDesignV1',
      id: `${stage.id}-map`,
      revision: '1',
      name: stage.name,
      width: 72,
      height: 36,
      walls: structuredClone(stage.walls),
      foundations: structuredClone(stage.foundations),
      terrain: [],
      spawns: [{ id: 'home', x: 8.5, y: 0.5 }],
    };
    const targetCount = 4 + Math.floor(stage.chapterIndex / 2) + (within === 5 ? 1 : 0);
    const guardCount = stage.chapterIndex < 5 ? 0 : within < 2 ? 1 : 2;
    const { format: _format, id: _id, revision: _revision, name: _name, ...geometry } = map;
    const actors = placeActors(geometry, index, targetCount, guardCount);
    const targets = actors
      .filter((actor) => actor.role !== 'field-keeper')
      .map((actor) => ({
        id: actor.id,
        kind: actor.role === 'optional-sentry' ? 'guard' : 'runner',
      }));
    const copy = snakeStageCopy(stage);
    source.maps.push(map);
    source.missions.push({
      ...structuredClone(template),
      id: stage.id,
      revision: '1',
      name: stage.name,
      map: { id: map.id, revision: map.revision },
      modes: ['solo', 'versus'],
      spawnId: 'home',
      actors,
      combat: { version: 'mission-combat.v1', enabled: true },
      hunt: { version: 'humanoid-hunt.v1', mode: 'hunt', quota: targets.length, targets },
      snake: bodyRecipe(
        stage.chapterIndex,
        within,
        targets.map((target) => target.id),
      ),
      coverage: 0.6,
      timeLimitSeconds: 0,
      presentation: {
        ...structuredClone(template.presentation),
        backgroundAssetId: artwork
          ? opening.missions[index % opening.missions.length].presentation.backgroundAssetId
          : null,
      },
      design: {
        ...Object.fromEntries(Object.entries(copy).map(([key, value]) => [key, value.en])),
        introduces: within === 0 ? [`snake-chapter-${stage.chapterIndex + 1}`] : [],
        practices: ['snake-body', 'humanoid-contact', 'enemy-seeded-closure'],
        combines:
          stage.chapterIndex >= 5
            ? ['snake-body', 'humanoid-guard']
            : ['snake-body', 'humanoid-contact'],
        durationSeconds: [45, 240],
        difficulty: {
          band: Math.min(4, 1 + Math.floor(stage.chapterIndex / 2)),
          planning: Math.min(4, 1 + Math.floor(stage.chapterIndex / 2)),
          execution: Math.min(4, 1 + Math.floor(stage.chapterIndex / 2)),
          threatDensity: guardCount ? 3 : 2,
          timePressure: 0,
          mechanicLoad: stage.chapterIndex >= 5 ? 3 : 2,
          coordination: 0,
        },
      },
    });
  }
  return source;
}

/** Native authored pairs for the existing identity-bound presentation catalog. */
export function snakeHuntTranslationPairs() {
  const pairs = [
    bilingual('Snake Hunt', 'Зміїне полювання'),
    bilingual('Snake Hunt · eight chapters', 'Зміїне полювання · вісім розділів'),
    bilingual('Team Snake Hunt', 'Командне зміїне полювання'),
    bilingual('Team Snake Hunt · eight chapters', 'Командне зміїне полювання · вісім розділів'),
  ];
  for (const chapter of SNAKE_HUNT_CHAPTERS)
    pairs.push(chapter.localizedName, chapter.localizedDescription);
  for (const stage of SNAKE_HUNT_STAGES) {
    pairs.push(
      stage.localizedName,
      stage.localizedDescription,
      ...Object.values(snakeStageCopy(stage)),
      ...Object.values(snakeStageCopy(stage, { team: true })),
    );
  }
  return [...new Map(pairs.map((pair) => [pair.en, pair])).values()];
}
