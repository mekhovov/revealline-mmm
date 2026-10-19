import { remasterClassicSnakeEntry } from './classic-catalogue-remaster.mjs';
import {
  CLASSIC_SNAKE_OPERATION_CHAPTERS_B,
  CLASSIC_SNAKE_OPERATION_LEVELS_B,
} from './classic-catalogue-operations-b.mjs';
import {
  CLASSIC_SNAKE_OPERATION_CHAPTERS_A,
  CLASSIC_SNAKE_OPERATION_LEVELS_A,
} from './classic-catalogue-operations-a.mjs';
import { CLASSIC_SNAKE_V4_CHAPTERS, CLASSIC_SNAKE_V4_LEVELS } from './classic-catalogue-v4.mjs';
import { CLASSIC_SNAKE_V3_CHAPTERS, CLASSIC_SNAKE_V3_LEVELS } from './classic-catalogue-v3.mjs';
import { CLASSIC_SNAKE_V2_CHAPTERS, CLASSIC_SNAKE_V2_LEVELS } from './classic-catalogue-v2.mjs';

/**
 * Classic grid-Snake catalogue v1. Geometry is pinned from the forty-eight
 * original Snake Hunt layouts; the earlier capture campaigns remain unchanged.
 * These literal rectangles avoid coupling saved classic recipes to later edits
 * of the content-design compiler or its source campaign.
 */
const CHAPTER_ROWS = [
  [
    'first-coils',
    'First Coils',
    'Перші витки',
    'Turn one square at a time. Catch humanoids to grow, and leave space for your own tail.',
    'Повертайте по одній клітинці. Ловіть людей, щоб рости, і залишайте місце власному хвосту.',
  ],
  [
    'wide-turns',
    'Wide Turns',
    'Широкі повороти',
    'Read elbows and pockets before committing to a turn. A clear outer circuit offers another approach.',
    'Читайте вигини й кишені перед поворотом. Вільне зовнішнє коло дає змогу зайти з іншого боку.',
  ],
  [
    'island-circuits',
    'Island Circuits',
    'Кола навколо островів',
    'Guide a growing body around islands and staggered walls. Keep your next exit open.',
    'Ведіть зростаючий хвіст навколо островів і зміщених стін. Залишайте наступний вихід вільним.',
  ],
  [
    'moving-quarry',
    'Moving Quarry',
    'Рухлива здобич',
    'The lone humanoid now flees slowly. Intercept its next square instead of following every turn.',
    'Тепер єдина ціль повільно тікає. Перехоплюйте її наступну клітинку, замість повторювати всі повороти.',
  ],
  [
    'borderless-routes',
    'Borderless Routes',
    'Маршрути без меж',
    'Crossing an edge brings you to the opposite edge. Walls and snake bodies still block your way.',
    'Перетин краю переносить на протилежний бік. Стіни й тіла змій залишаються перешкодами.',
  ],
  [
    'chicanes',
    'Chicanes',
    'Шикани',
    'Weave through staggered obstacles. Later catches gradually increase speed; broad turns preserve room.',
    'Маневруйте між зміщеними перешкодами. Після кількох цілей швидкість поступово зростає; широкі повороти зберігають простір.',
  ],
  [
    'shared-circuits',
    'Shared Circuits',
    'Спільні кола',
    'Plan crossing lanes. Team shares one target and one goal; both snakes and their bodies occupy the same board.',
    'Плануйте перетини шляхів. У команді одна ціль і спільна мета; обидві змії та їхні хвости займають одне поле.',
  ],
  [
    'final-weave',
    'Final Weave',
    'Останнє плетіння',
    'Combine long bodies, islands, moving quarry and selected wrapping boards. Check each mission’s edge rule.',
    'Поєднайте довгі хвости, острови, рухливу здобич і вибрані поля з переходом через край. Перевіряйте правило меж кожної місії.',
  ],
];
const LAYOUT_ROWS = [
  [
    'snake-open-loop',
    'Open Loop',
    'Відкрита петля',
    'An empty board: make broad loops, catch the lone target and watch your tail grow.',
    'Порожнє поле: рухайтеся широкими петлями, ловіть єдину ціль і стежте за зростанням хвоста.',
    [[31, 16, 8, 3]],
  ],
  [
    'snake-two-landings',
    'Twin Islands',
    'Два острови',
    'Pass either side of the two islands. Change your approach when your tail occupies the shorter route.',
    'Обходьте два острови з будь-якого боку. Змінюйте підхід, коли хвіст займає коротший шлях.',
    [
      [22, 8, 8, 3],
      [43, 24, 8, 3],
    ],
  ],
  [
    'snake-first-baffle',
    'First Baffle',
    'Перша перегородка',
    'Round the short wall in open space; leave its narrow corner until your tail has passed.',
    'Огинайте коротку стіну на просторі; повертайте біля її кута, коли хвіст уже минув його.',
    [
      [33, 12, 3, 11],
      [15, 16, 6, 3],
    ],
  ],
  [
    'snake-offset-docks',
    'Offset Blocks',
    'Зміщені блоки',
    'Choose a different side of the offset blocks for the next catch.',
    'Після кожної цілі обирайте інший бік зміщених блоків.',
    [
      [37, 17, 10, 2],
      [17, 8, 6, 4],
      [49, 25, 6, 3],
    ],
  ],
  [
    'snake-room-to-follow',
    'Room to Follow',
    'Місце для хвоста',
    'The parallel walls split the middle. Use the open ends to give your body room to follow.',
    'Паралельні стіни розділяють центр. Користуйтеся відкритими кінцями, щоб хвіст міг пройти слідом.',
    [
      [27, 10, 2, 13],
      [43, 14, 2, 12],
      [33, 27, 7, 3],
    ],
  ],
  [
    'snake-first-circuit',
    'First Circuit',
    'Перше коло',
    'Link the gaps between three islands into a loop around the central wall.',
    'Поєднайте проходи між трьома островами в коло навколо центральної стіни.',
    [
      [35, 12, 3, 9],
      [16, 8, 6, 3],
      [49, 10, 6, 3],
      [32, 26, 8, 3],
    ],
  ],
  [
    'snake-open-elbow',
    'Open Elbow',
    'Відкритий вигин',
    'Enter the elbow from its open side, then turn outside its corner.',
    'Заходьте у вигин з відкритого боку, а повертайте за його зовнішнім кутом.',
    [
      [25, 10, 3, 15],
      [28, 22, 18, 3],
      [48, 10, 6, 3],
    ],
  ],
  [
    'snake-u-turn-yard',
    'U-turn Yard',
    'Двір для розвороту',
    'The U-shaped wall rewards a planned exit. Do not follow the target into a pocket without room to turn.',
    'Плануйте вихід із П-подібного двору. Не женіться за ціллю в кишеню без місця для розвороту.',
    [
      [24, 9, 3, 17],
      [27, 23, 20, 3],
      [47, 13, 3, 13],
      [32, 13, 7, 3],
    ],
  ],
  [
    'snake-staggered-elbows',
    'Staggered Elbows',
    'Зміщені вигини',
    'Alternate between the two elbows; the outside route lets your tail clear the middle.',
    'Чергуйте два вигини; зовнішній шлях дає хвосту час звільнити центр.',
    [
      [21, 7, 3, 13],
      [24, 17, 13, 3],
      [46, 16, 3, 13],
      [35, 26, 11, 3],
      [31, 7, 7, 3],
    ],
  ],
  [
    'snake-turning-pockets',
    'Turning Pockets',
    'Кишені для поворотів',
    'Three posts create small pockets. Approach them from the wider side.',
    'Три стовпи утворюють невеликі кишені. Заходьте в них із ширшого боку.',
    [
      [22, 10, 4, 7],
      [39, 19, 4, 8],
      [53, 8, 3, 10],
      [30, 24, 5, 3],
      [43, 8, 5, 3],
    ],
  ],
  [
    'snake-s-bend',
    'S-bend',
    'S-подібний вигин',
    'The offset bars form an S. Turn early enough to keep your body out of the next gap.',
    'Зміщені перегородки утворюють літеру S. Повертайте завчасно, щоб хвіст не зайняв наступний прохід.',
    [
      [18, 9, 27, 3],
      [31, 23, 25, 3],
      [18, 25, 6, 3],
      [50, 7, 6, 3],
    ],
  ],
  [
    'snake-elbow-exchange',
    'Elbow Exchange',
    'Перехід між вигинами',
    'Switch between opposed corners using the wide space around them.',
    'Переходьте між протилежними кутами через широкий простір навколо них.',
    [
      [18, 9, 3, 14],
      [21, 20, 10, 3],
      [50, 13, 3, 14],
      [40, 13, 10, 3],
      [33, 16, 5, 4],
    ],
  ],
  [
    'snake-long-island',
    'Long Island',
    'Довгий острів',
    'Circle the large island and choose which end offers a clear return.',
    'Обходьте великий острів і обирайте кінець із вільним шляхом назад.',
    [[27, 12, 18, 8]],
  ],
  [
    'snake-split-islands',
    'Split Islands',
    'Розділені острови',
    'The middle wall separates two islands. Compare the central gap with the outer circuit.',
    'Середня стіна розділяє два острови. Порівнюйте центральний прохід із зовнішнім колом.',
    [
      [35, 15, 2, 7],
      [20, 9, 8, 6],
      [45, 23, 8, 5],
    ],
  ],
  [
    'snake-bent-causeway',
    'Bent Causeway',
    'Вигнута дамба',
    'Treat the solid L-shaped island as a detour, not a shortcut.',
    'Суцільний Г-подібний острів потрібно обійти; скоротити шлях крізь нього не вдасться.',
    [
      [43, 8, 3, 10],
      [22, 14, 16, 3],
      [35, 17, 3, 10],
    ],
  ],
  [
    'snake-three-detours',
    'Three Detours',
    'Три об’їзди',
    'Pass alternating ends of the three staggered walls without folding back into your tail.',
    'Обходьте три зміщені стіни почергово з різних кінців, не повертаючись у власний хвіст.',
    [
      [19, 8, 4, 15],
      [34, 18, 4, 12],
      [51, 7, 4, 15],
      [28, 8, 6, 3],
      [43, 27, 6, 3],
    ],
  ],
  [
    'snake-inner-or-outer',
    'Inner or Outer',
    'Всередині чи зовні',
    'The inner courtyard is shorter; the outer loop leaves more room for a long body.',
    'Шлях усередині двору коротший, але зовнішнє коло дає довгому хвосту більше простору.',
    [
      [23, 9, 25, 3],
      [23, 12, 3, 13],
      [26, 25, 22, 3],
      [35, 17, 6, 3],
    ],
  ],
  [
    'snake-long-circuit',
    'Long Circuit',
    'Довге коло',
    'Use the corner islands to plan a full circuit around the central block.',
    'Сплануйте повне коло навколо центрального блока між кутовими островами.',
    [
      [32, 12, 7, 12],
      [17, 7, 6, 3],
      [49, 7, 6, 3],
      [18, 27, 6, 3],
      [48, 27, 6, 3],
    ],
  ],
  [
    'snake-forked-chase',
    'Forked Chase',
    'Погоня на розвилці',
    'The target flees one square at a time. Use the fork to approach from the other side.',
    'Ціль тікає по одній клітинці. Скористайтеся розвилкою, щоб зайти з іншого боку.',
    [
      [33, 9, 3, 18],
      [21, 17, 12, 3],
      [47, 16, 7, 3],
    ],
  ],
  [
    'snake-parallel-paths',
    'Parallel Paths',
    'Паралельні шляхи',
    'Intercept the runner at an open end of the parallel lanes.',
    'Перехопіть втікача біля відкритого кінця паралельних смуг.',
    [
      [24, 8, 3, 20],
      [45, 8, 3, 20],
      [33, 15, 6, 4],
    ],
  ],
  [
    'snake-crossroads',
    'Crossroads',
    'Перехрестя',
    'Four blocks leave a central crossing. Approach only while your next exit is clear.',
    'Чотири блоки утворюють центральне перехрестя. Заходьте в нього, коли наступний вихід вільний.',
    [
      [23, 9, 7, 5],
      [42, 9, 7, 5],
      [23, 23, 7, 5],
      [42, 23, 7, 5],
      [33, 16, 6, 3],
    ],
  ],
  [
    'snake-broken-divider',
    'Broken Divider',
    'Переривчаста стіна',
    'Use a gap in the divider to shorten the chase without trapping your own body.',
    'Скористайтеся розривом у стіні, щоб скоротити погоню й не затиснути власний хвіст.',
    [
      [34, 4, 3, 5],
      [34, 14, 3, 8],
      [34, 27, 3, 5],
      [19, 17, 6, 3],
      [48, 17, 6, 3],
    ],
  ],
  [
    'snake-runner-triangle',
    'Runner Triangle',
    'Трикутник утікача',
    'Three islands offer three approaches. Cut across the open side before the runner changes direction.',
    'Три острови дають три підходи. Перетніть відкритий бік, поки втікач не змінив напрямок.',
    [
      [26, 13, 3, 10],
      [43, 13, 3, 10],
      [31, 6, 9, 3],
      [17, 27, 7, 3],
      [48, 27, 7, 3],
    ],
  ],
  [
    'snake-cutoff-network',
    'Cutoff Network',
    'Мережа перехоплень',
    'Choose a bypass through the staggered walls to meet the runner ahead.',
    'Оберіть обхід між зміщеними стінами, щоб зустріти втікача попереду.',
    [
      [20, 8, 3, 17],
      [35, 16, 3, 13],
      [50, 7, 3, 15],
      [28, 7, 5, 3],
      [42, 27, 5, 3],
    ],
  ],
  [
    'snake-keep-the-tail',
    'Across the Edge',
    'Крізь край',
    'All four edges wrap. Cross one to approach the target from the opposite side.',
    'Усі чотири краї з’єднані. Перетніть один із них, щоб зайти до цілі з протилежного боку.',
    [
      [23, 9, 3, 15],
      [47, 13, 3, 15],
      [32, 15, 7, 5],
    ],
  ],
  [
    'snake-lighten-at-home',
    'Two Shores',
    'Два береги',
    'The two blocks are solid; use the wrapping edge to travel between their outer sides.',
    'Два блоки суцільні; переходьте між їхніми зовнішніми боками через край поля.',
    [
      [32, 10, 3, 14],
      [18, 18, 7, 3],
      [48, 9, 7, 3],
    ],
  ],
  [
    'snake-banking-steps',
    'Edge Steps',
    'Сходинки біля межі',
    'Step around the staggered islands, or cross an edge for a wider turn.',
    'Оминайте зміщені острови або перетинайте край, щоб повернути на більшому просторі.',
    [
      [38, 9, 3, 10],
      [18, 8, 6, 3],
      [29, 16, 6, 3],
      [43, 25, 6, 3],
    ],
  ],
  [
    'snake-persistent-hub',
    'Borderless Hub',
    'Вузол без меж',
    'Circle the central block and watch both sides of an edge before wrapping through it.',
    'Обходьте центральний блок і перевіряйте обидва боки краю, перш ніж перейти через нього.',
    [
      [20, 7, 3, 12],
      [49, 19, 3, 12],
      [31, 13, 9, 9],
    ],
  ],
  [
    'snake-two-return-rhythm',
    'Two-way Rhythm',
    'Двобічний ритм',
    'Alternate inside passes with wrapping routes around the two large islands.',
    'Чергуйте внутрішні проходи з переходами через край навколо двох великих островів.',
    [
      [33, 9, 3, 18],
      [17, 13, 7, 8],
      [49, 13, 7, 8],
    ],
  ],
  [
    'snake-return-weave',
    'Edge Weave',
    'Плетіння через край',
    'Connect the three islands with loops that cross the board boundary.',
    'Поєднуйте три острови петлями, що перетинають межу поля.',
    [
      [22, 10, 3, 13],
      [46, 14, 3, 13],
      [14, 26, 6, 3],
      [32, 7, 7, 3],
      [53, 8, 6, 3],
    ],
  ],
  [
    'snake-one-warning',
    'Single Chicane',
    'Одна шикана',
    'Edges are solid again. Pass the short obstacle and leave space for a second turn.',
    'Краї знову непрохідні. Оминіть коротку перешкоду й залиште місце для другого повороту.',
    [
      [34, 13, 3, 10],
      [20, 10, 7, 3],
      [45, 25, 7, 3],
    ],
  ],
  [
    'snake-warning-courtyard',
    'Open Courtyard',
    'Відкритий двір',
    'Enter the courtyard through its opening and choose an exit before the body arrives.',
    'Увійдіть у двір через відкритий бік і оберіть вихід, поки хвіст не підійшов.',
    [
      [23, 9, 25, 3],
      [23, 12, 3, 13],
      [45, 19, 3, 6],
      [32, 17, 7, 3],
    ],
  ],
  [
    'snake-crossed-sightlines',
    'Crossed Passages',
    'Перехресні проходи',
    'Offset walls create crossing approaches. Keep the next lane open as speed rises.',
    'Зміщені стіни утворюють перехресні підходи. Зберігайте наступну смугу вільною, коли швидкість зростає.',
    [
      [27, 8, 3, 14],
      [43, 17, 3, 12],
      [18, 26, 6, 3],
      [49, 7, 6, 3],
    ],
  ],
  [
    'snake-screened-approach',
    'Screened Approach',
    'Прихований підхід',
    'The horizontal bars require two turns. Approach from the wide end.',
    'Горизонтальні перегородки потребують двох поворотів. Заходьте з широкого кінця.',
    [
      [20, 11, 15, 3],
      [39, 22, 15, 3],
      [20, 25, 7, 3],
      [46, 8, 7, 3],
    ],
  ],
  [
    'snake-guarded-returns',
    'Twin Chicanes',
    'Подвійна шикана',
    'Plan both turns before entering the staggered passage between the islands.',
    'Сплануйте обидва повороти перед входом у зміщений прохід між островами.',
    [
      [30, 8, 3, 9],
      [40, 21, 3, 9],
      [16, 16, 7, 4],
      [50, 16, 7, 4],
    ],
  ],
  [
    'snake-garden-crossfire',
    'Garden Weave',
    'Садове плетіння',
    'Weave between the upper and lower islands, using the outer loop when the middle fills.',
    'Маневруйте між верхнім і нижнім островами; виходьте на зовнішнє коло, коли центр займає хвіст.',
    [
      [24, 10, 3, 15],
      [47, 10, 3, 15],
      [33, 7, 8, 3],
      [33, 27, 8, 3],
    ],
  ],
  [
    'snake-opposite-arrivals',
    'Opposite Arrivals',
    'Зустрічні підходи',
    'The two lanes suit opposite approaches. In Team, leave your partner an exit.',
    'Дві смуги зручні для зустрічних підходів. У команді залишайте партнеру вихід.',
    [
      [27, 9, 3, 17],
      [44, 9, 3, 17],
      [34, 15, 6, 4],
    ],
  ],
  [
    'snake-crossing-schedule',
    'Crossing Schedule',
    'Черговість перетину',
    'Four bars frame the crossing. In Team, take turns using the central lane.',
    'Чотири перегородки обрамляють перехрестя. У команді проходьте центральною смугою по черзі.',
    [
      [19, 11, 12, 3],
      [42, 11, 12, 3],
      [19, 24, 12, 3],
      [42, 24, 12, 3],
      [33, 17, 7, 3],
    ],
  ],
  [
    'snake-paired-loops',
    'Paired Loops',
    'Парні петлі',
    'Use opposite loops around the islands; meet only when the crossing is free.',
    'Використовуйте протилежні петлі навколо островів; сходьтеся лише на вільному перехресті.',
    [
      [22, 11, 3, 14],
      [48, 11, 3, 14],
      [15, 7, 6, 3],
      [52, 27, 6, 3],
      [33, 16, 7, 3],
    ],
  ],
  [
    'snake-shared-detour',
    'Shared Detour',
    'Спільний обхід',
    'The U-shaped detour has a narrow entrance and a broad outside return.',
    'П-подібний обхід має вузький вхід і широкий зовнішній шлях назад.',
    [
      [27, 9, 21, 3],
      [27, 12, 3, 14],
      [30, 26, 18, 3],
      [37, 17, 6, 3],
    ],
  ],
  [
    'snake-support-corridor',
    'Passing Corridor',
    'Коридор для проходу',
    'Choose the upper or lower passage around the walls; avoid a head-on meeting in Team.',
    'Оберіть верхній або нижній прохід навколо стін; у команді уникайте зустрічі голова в голову.',
    [
      [22, 8, 3, 19],
      [48, 8, 3, 19],
      [33, 7, 7, 3],
      [33, 27, 7, 3],
    ],
  ],
  [
    'snake-shared-circuit',
    'Shared Circuit',
    'Спільне коло',
    'Follow the offset openings as one circuit. Every Team catch grows the snake that caught it.',
    'Поєднайте зміщені проходи в одне коло. У команді від цілі росте змія, яка її спіймала.',
    [
      [20, 10, 3, 10],
      [34, 19, 3, 11],
      [49, 8, 3, 12],
      [28, 7, 6, 3],
      [43, 26, 6, 3],
    ],
  ],
  [
    'snake-long-opening',
    'Long Opening',
    'Довгий початок',
    'Build a long body around the central island while keeping both end passages clear.',
    'Вирощуйте довгий хвіст навколо центрального острова, залишаючи обидва крайні проходи вільними.',
    [
      [23, 10, 3, 17],
      [47, 8, 3, 17],
      [32, 14, 8, 6],
    ],
  ],
  [
    'snake-fork-and-warning',
    'Moving Fork',
    'Рухлива розвилка',
    'Intercept the fleeing target at the fork, then make a wide return around your body.',
    'Перехопіть утікача на розвилці, а потім широко обійдіть власний хвіст.',
    [
      [33, 7, 3, 21],
      [19, 17, 14, 3],
      [45, 10, 7, 3],
      [45, 25, 7, 3],
    ],
  ],
  [
    'snake-ordered-islands',
    'Borderless Islands',
    'Острови без меж',
    'This board wraps. Use its connected edges to circle the three islands.',
    'Краї цього поля з’єднані. Скористайтеся ними, щоб обходити три острови.',
    [
      [35, 13, 3, 9],
      [17, 8, 7, 4],
      [49, 9, 7, 4],
      [31, 26, 10, 3],
    ],
  ],
  [
    'snake-last-shedding-bank',
    'Final Hub',
    'Останній вузол',
    'The large central island leaves two approaches. Choose the one the fleeing target cannot quickly escape.',
    'Великий центральний острів залишає два підходи. Оберіть той, з якого втікач не зможе швидко вислизнути.',
    [
      [22, 8, 3, 18],
      [49, 11, 3, 18],
      [33, 14, 8, 7],
    ],
  ],
  [
    'snake-woven-gauntlet',
    'Woven Gauntlet',
    'Смуга плетіння',
    'Wrapping edges offer a bypass around the three staggered bars; do not meet your own tail there.',
    'Переходи через край дають обхід трьох зміщених перегородок; не зустріньте там власний хвіст.',
    [
      [18, 8, 16, 3],
      [39, 17, 16, 3],
      [20, 26, 16, 3],
      [44, 7, 7, 3],
      [23, 17, 7, 3],
    ],
  ],
  [
    'snake-final-weave',
    'Final Weave',
    'Останнє плетіння',
    'Solid edges, moving quarry and a long body: connect the staggered openings into your final circuit.',
    'Непрохідні краї, рухлива здобич і довгий хвіст: поєднайте зміщені проходи в останнє коло.',
    [
      [23, 8, 3, 12],
      [47, 16, 3, 12],
      [33, 14, 7, 3],
      [15, 26, 6, 3],
      [49, 6, 6, 3],
      [32, 26, 8, 3],
    ],
  ],
];

const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
};
const bilingual = (en, uk) => ({ en, uk });
const WIDTH = 24;
const HEIGHT = 18;

// Keep three unobstructed rows/columns around every obstacle layout. The
// complete band is ordinary floor: it offers room, never capture or immunity.
function projectWalls(rectangles, first) {
  if (first) return [];
  const occupied = new Set();
  for (const [sourceX, sourceY, sourceWidth, sourceHeight] of rectangles) {
    const x = Math.max(3, Math.min(WIDTH - 4, Math.round(sourceX / 3)));
    const y = Math.max(3, Math.min(HEIGHT - 4, Math.round(sourceY / 2)));
    const right = Math.min(WIDTH - 3, Math.max(x + 1, Math.round((sourceX + sourceWidth) / 3)));
    const bottom = Math.min(HEIGHT - 3, Math.max(y + 1, Math.round((sourceY + sourceHeight) / 2)));
    for (let cy = y; cy < bottom; cy++) {
      for (let cx = x; cx < right; cx++) occupied.add(cy * WIDTH + cx);
    }
  }
  return [...occupied]
    .sort((a, b) => a - b)
    .map((cell) => ({ x: cell % WIDTH, y: Math.floor(cell / WIDTH) }));
}

const FOUNDATION_CHAPTERS = freeze(
  CHAPTER_ROWS.map(([id, en, uk, descriptionEn, descriptionUk]) => ({
    id: 'classic-snake-' + id,
    title: bilingual(en, uk),
    description: bilingual(descriptionEn, descriptionUk),
  })),
);

const FOUNDATION_LEVELS = freeze(
  LAYOUT_ROWS.map(([sourceId, en, uk, descriptionEn, descriptionUk, rectangles], index) => {
    const chapterIndex = Math.floor(index / 6);
    const withinChapter = index % 6;
    const id = 'classic-' + sourceId;
    const wrap =
      chapterIndex === 4 || (chapterIndex === 7 && (withinChapter === 2 || withinChapter === 4));
    const originallyMoving = chapterIndex === 3 || (chapterIndex === 7 && withinChapter % 2 === 1);
    const revised = chapterIndex > 0 && !originallyMoving;
    // Alternate interception with deliberate body-routing missions. The opening
    // six remain a quiet introduction; later static catches no longer repeat
    // long quotas without introducing a new decision.
    const moving = originallyMoving || (revised && (withinChapter % 2 === 1 || chapterIndex === 7));
    const originalGoal =
      [8, 10, 12, 12, 14, 16, 16, 18][chapterIndex] + Math.floor(withinChapter / 2);
    const goal = revised
      ? moving
        ? Math.min(14, originalGoal - 2)
        : Math.max(8, originalGoal - 4)
      : originalGoal;
    const stepMs = [200, 190, 180, 180, 175, 180, 180, 175][chapterIndex];
    const speedupEvery = chapterIndex >= 5 ? 4 : 0;
    return {
      id,
      chapterId: FOUNDATION_CHAPTERS[chapterIndex].id,
      title: bilingual(en, uk),
      description: bilingual(
        descriptionEn +
          (revised && moving
            ? ' The target changes direction as it flees: cut off its next exit instead of following its trail.'
            : ''),
        descriptionUk +
          (revised && moving
            ? ' Ціль змінює напрямок утечі: перекрийте наступний вихід, а не повторюйте її шлях.'
            : ''),
      ),
      level: {
        version: 'classic-snake-level.v1',
        id,
        revision: revised ? '2' : '1',
        name: en,
        width: WIDTH,
        height: HEIGHT,
        walls: projectWalls(rectangles, index === 0),
        spawns: [
          { x: 5, y: 2, direction: 'right' },
          { x: WIDTH - 6, y: HEIGHT - 3, direction: 'left' },
        ],
        goal,
        stepMs,
        speedupEvery,
        minStepMs: speedupEvery ? 135 : stepMs,
        wrap,
        targetMovement: moving ? 'flee' : 'still',
        fleeEvery: moving ? (revised && chapterIndex < 3 ? 6 : withinChapter < 3 ? 5 : 4) : 3,
      },
    };
  }),
);

export const CLASSIC_SNAKE_CHAPTERS = freeze([
  ...FOUNDATION_CHAPTERS,
  ...CLASSIC_SNAKE_V2_CHAPTERS,
  ...CLASSIC_SNAKE_V3_CHAPTERS,
  ...CLASSIC_SNAKE_V4_CHAPTERS,
  ...CLASSIC_SNAKE_OPERATION_CHAPTERS_A,
  ...CLASSIC_SNAKE_OPERATION_CHAPTERS_B,
]);
export const CLASSIC_SNAKE_LEVELS = freeze(
  [
    ...FOUNDATION_LEVELS,
    ...CLASSIC_SNAKE_V2_LEVELS,
    ...CLASSIC_SNAKE_V3_LEVELS,
    ...CLASSIC_SNAKE_V4_LEVELS,
    ...CLASSIC_SNAKE_OPERATION_LEVELS_A,
    ...CLASSIC_SNAKE_OPERATION_LEVELS_B,
  ].map(remasterClassicSnakeEntry),
);
export const CLASSIC_SNAKE_CAMPAIGNS = freeze([
  {
    id: 'classic-continuous-operations-b-v1',
    title: bilingual('Operation Frontiers', 'Операційні рубежі'),
    description: bilingual(
      'Six chapters of signal smuggling, changing terrain, refuge interceptions, supplies and shared operations.',
      'Шість розділів із перевезенням під перешкодами, змінним рельєфом, перехопленнями укриттів, припасами та спільними операціями.',
    ),
    chapterIds: CLASSIC_SNAKE_OPERATION_CHAPTERS_B.map((chapter) => chapter.id),
  },
  {
    id: 'classic-continuous-operations-a-v1',
    title: bilingual('Continuous Operations', 'Безперервні операції'),
    description: bilingual(
      'Six chapters of linked deliveries, patrol dispatch and cable-held routes. Every clearance continues on the same board.',
      'Шість розділів зі зв’язаними доставками, керуванням патрулями та маршрутами, що утримуються кабелем. Кожен етап триває на тому самому полі.',
    ),
    chapterIds: CLASSIC_SNAKE_OPERATION_CHAPTERS_A.map((chapter) => chapter.id),
  },
  {
    id: 'classic-living-routes-v1',
    title: bilingual('Living Routes', 'Живі маршрути'),
    description: bilingual(
      'Twelve original missions: readable goals, partner interception and explicitly marked specialists.',
      'Дванадцять оригінальних місій: зрозумілі цілі, парні перехоплення й чітко позначені спеціалісти.',
    ),
    chapterIds: CLASSIC_SNAKE_V3_CHAPTERS.map((chapter) => chapter.id),
  },
  {
    id: 'classic-foundations-v1',
    title: bilingual('Classic', 'Класика'),
    description: bilingual(
      'The original forty-eight grid missions.',
      'Початкові сорок вісім місій на сітці.',
    ),
    chapterIds: FOUNDATION_CHAPTERS.map((chapter) => chapter.id),
  },
  {
    id: 'classic-pure-pursuit-v1',
    title: bilingual('Pure Pursuit', 'Чисте переслідування'),
    description: bilingual(
      'Twelve patrol and runner missions teach readable interception.',
      'Дванадцять місій із патрулями й бігунами навчають зрозумілого перехоплення.',
    ),
    chapterIds: CLASSIC_SNAKE_V2_CHAPTERS.slice(0, 2).map((chapter) => chapter.id),
  },
  {
    id: 'classic-tactical-routes-v1',
    title: bilingual('Tactical Routes', 'Тактичні маршрути'),
    description: bilingual(
      'Twelve missions combine warned sprints and timed route choices.',
      'Дванадцять місій поєднують ривки з попередженням і вибір маршруту за часом.',
    ),
    chapterIds: CLASSIC_SNAKE_V2_CHAPTERS.slice(2, 4).map((chapter) => chapter.id),
  },
  {
    id: 'classic-arcade-sorties-v1',
    title: bilingual('Arcade Sorties', 'Аркадні вильоти'),
    description: bilingual(
      'Twelve missions add automatic supplies, optional couriers and combined pursuit.',
      'Дванадцять місій додають автоматичні припаси, необов’язкових кур’єрів і поєднане переслідування.',
    ),
    chapterIds: CLASSIC_SNAKE_V2_CHAPTERS.slice(4, 6).map((chapter) => chapter.id),
  },
  ...CLASSIC_SNAKE_V4_CHAPTERS.slice(0, 3).map((chapter) => ({
    id: `${chapter.id}-v1`,
    title: chapter.title,
    description: chapter.description,
    chapterIds: [chapter.id],
  })),
  {
    id: 'classic-expeditions-v1',
    title: bilingual('Uncharted Circuits', 'Незвідані кола'),
    description: bilingual(
      'Twenty-four encounters: intercept across edges, exploit changing shortcuts, track unseen prey and combine your route skills.',
      'Двадцять чотири випробування: перехоплюйте через край, користуйтеся новими проходами, вистежуйте невидиму здобич і поєднуйте навички.',
    ),
    chapterIds: CLASSIC_SNAKE_V4_CHAPTERS.slice(3).map((chapter) => chapter.id),
  },
]);
export const CLASSIC_SNAKE_FEATURED = freeze(
  CLASSIC_SNAKE_CHAPTERS.map((chapter, index) => {
    const entry = CLASSIC_SNAKE_LEVELS.filter((level) => level.chapterId === chapter.id)[5];
    return {
      id: `classic-featured-${index + 1}`,
      chapterId: chapter.id,
      levelId: entry.id,
      seed: 4201 + index,
      title: entry.title,
      description: entry.description,
    };
  }),
);

export function classicSnakeLevel(id) {
  return CLASSIC_SNAKE_LEVELS.find((entry) => entry.id === id)?.level ?? null;
}
