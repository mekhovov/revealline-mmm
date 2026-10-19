// Exact pre-variety foundation recipes retained for saved attempts and recordings.
export const CLASSIC_SNAKE_FOUNDATION_V1_ARCHIVED_LEVELS = [
  {
    id: 'classic-snake-open-elbow',
    chapterId: 'classic-snake-wide-turns',
    title: {
      en: 'Open Elbow',
      uk: 'Відкритий вигин',
    },
    description: {
      en: 'Enter the elbow from its open side, then turn outside its corner.',
      uk: 'Заходьте у вигин з відкритого боку, а повертайте за його зовнішнім кутом.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-open-elbow',
      revision: '1',
      name: 'Open Elbow',
      width: 24,
      height: 18,
      walls: [
        {
          x: 8,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 13,
          y: 11,
        },
        {
          x: 14,
          y: 11,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 14,
          y: 12,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 10,
      stepMs: 190,
      speedupEvery: 0,
      minStepMs: 190,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-u-turn-yard',
    chapterId: 'classic-snake-wide-turns',
    title: {
      en: 'U-turn Yard',
      uk: 'Двір для розвороту',
    },
    description: {
      en: 'The U-shaped wall rewards a planned exit. Do not follow the target into a pocket without room to turn.',
      uk: 'Плануйте вихід із П-подібного двору. Не женіться за ціллю в кишеню без місця для розвороту.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-u-turn-yard',
      revision: '1',
      name: 'U-turn Yard',
      width: 24,
      height: 18,
      walls: [
        {
          x: 8,
          y: 5,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 14,
          y: 12,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 10,
      stepMs: 190,
      speedupEvery: 0,
      minStepMs: 190,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-staggered-elbows',
    chapterId: 'classic-snake-wide-turns',
    title: {
      en: 'Staggered Elbows',
      uk: 'Зміщені вигини',
    },
    description: {
      en: 'Alternate between the two elbows; the outside route lets your tail clear the middle.',
      uk: 'Чергуйте два вигини; зовнішній шлях дає хвосту час звільнити центр.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-staggered-elbows',
      revision: '1',
      name: 'Staggered Elbows',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 4,
        },
        {
          x: 10,
          y: 4,
        },
        {
          x: 11,
          y: 4,
        },
        {
          x: 12,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 15,
          y: 8,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 15,
          y: 10,
        },
        {
          x: 15,
          y: 11,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 12,
          y: 13,
        },
        {
          x: 13,
          y: 13,
        },
        {
          x: 14,
          y: 13,
        },
        {
          x: 15,
          y: 13,
        },
        {
          x: 12,
          y: 14,
        },
        {
          x: 13,
          y: 14,
        },
        {
          x: 14,
          y: 14,
        },
        {
          x: 15,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 11,
      stepMs: 190,
      speedupEvery: 0,
      minStepMs: 190,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-turning-pockets',
    chapterId: 'classic-snake-wide-turns',
    title: {
      en: 'Turning Pockets',
      uk: 'Кишені для поворотів',
    },
    description: {
      en: 'Three posts create small pockets. Approach them from the wider side.',
      uk: 'Три стовпи утворюють невеликі кишені. Заходьте в них із ширшого боку.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-turning-pockets',
      revision: '1',
      name: 'Turning Pockets',
      width: 24,
      height: 18,
      walls: [
        {
          x: 14,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 18,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 13,
          y: 10,
        },
        {
          x: 13,
          y: 11,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 10,
          y: 13,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 13,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 11,
      stepMs: 190,
      speedupEvery: 0,
      minStepMs: 190,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-s-bend',
    chapterId: 'classic-snake-wide-turns',
    title: {
      en: 'S-bend',
      uk: 'S-подібний вигин',
    },
    description: {
      en: 'The offset bars form an S. Turn early enough to keep your body out of the next gap.',
      uk: 'Зміщені перегородки утворюють літеру S. Повертайте завчасно, щоб хвіст не зайняв наступний прохід.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-s-bend',
      revision: '1',
      name: 'S-bend',
      width: 24,
      height: 18,
      walls: [
        {
          x: 17,
          y: 4,
        },
        {
          x: 18,
          y: 4,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 9,
          y: 5,
        },
        {
          x: 10,
          y: 5,
        },
        {
          x: 11,
          y: 5,
        },
        {
          x: 12,
          y: 5,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 14,
          y: 12,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 18,
          y: 12,
        },
        {
          x: 6,
          y: 13,
        },
        {
          x: 7,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 12,
      stepMs: 190,
      speedupEvery: 0,
      minStepMs: 190,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-elbow-exchange',
    chapterId: 'classic-snake-wide-turns',
    title: {
      en: 'Elbow Exchange',
      uk: 'Перехід між вигинами',
    },
    description: {
      en: 'Switch between opposed corners using the wide space around them.',
      uk: 'Переходьте між протилежними кутами через широкий простір навколо них.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-elbow-exchange',
      revision: '1',
      name: 'Elbow Exchange',
      width: 24,
      height: 18,
      walls: [
        {
          x: 6,
          y: 5,
        },
        {
          x: 6,
          y: 6,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 13,
          y: 7,
        },
        {
          x: 14,
          y: 7,
        },
        {
          x: 15,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 9,
          y: 10,
        },
        {
          x: 17,
          y: 10,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 17,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 12,
      stepMs: 190,
      speedupEvery: 0,
      minStepMs: 190,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-long-island',
    chapterId: 'classic-snake-island-circuits',
    title: {
      en: 'Long Island',
      uk: 'Довгий острів',
    },
    description: {
      en: 'Circle the large island and choose which end offers a clear return.',
      uk: 'Обходьте великий острів і обирайте кінець із вільним шляхом назад.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-long-island',
      revision: '1',
      name: 'Long Island',
      width: 24,
      height: 18,
      walls: [
        {
          x: 9,
          y: 6,
        },
        {
          x: 10,
          y: 6,
        },
        {
          x: 11,
          y: 6,
        },
        {
          x: 12,
          y: 6,
        },
        {
          x: 13,
          y: 6,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 9,
          y: 7,
        },
        {
          x: 10,
          y: 7,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 13,
          y: 7,
        },
        {
          x: 14,
          y: 7,
        },
        {
          x: 9,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 13,
          y: 8,
        },
        {
          x: 14,
          y: 8,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 13,
          y: 9,
        },
        {
          x: 14,
          y: 9,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 12,
      stepMs: 180,
      speedupEvery: 0,
      minStepMs: 180,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-split-islands',
    chapterId: 'classic-snake-island-circuits',
    title: {
      en: 'Split Islands',
      uk: 'Розділені острови',
    },
    description: {
      en: 'The middle wall separates two islands. Compare the central gap with the outer circuit.',
      uk: 'Середня стіна розділяє два острови. Порівнюйте центральний прохід із зовнішнім колом.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-split-islands',
      revision: '1',
      name: 'Split Islands',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 15,
          y: 13,
        },
        {
          x: 16,
          y: 13,
        },
        {
          x: 17,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 12,
      stepMs: 180,
      speedupEvery: 0,
      minStepMs: 180,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-bent-causeway',
    chapterId: 'classic-snake-island-circuits',
    title: {
      en: 'Bent Causeway',
      uk: 'Вигнута дамба',
    },
    description: {
      en: 'Treat the solid L-shaped island as a detour, not a shortcut.',
      uk: 'Суцільний Г-подібний острів потрібно обійти; скоротити шлях крізь нього не вдасться.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-bent-causeway',
      revision: '1',
      name: 'Bent Causeway',
      width: 24,
      height: 18,
      walls: [
        {
          x: 14,
          y: 4,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 9,
          y: 7,
        },
        {
          x: 10,
          y: 7,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 14,
          y: 7,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 9,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 14,
          y: 8,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 12,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 13,
      stepMs: 180,
      speedupEvery: 0,
      minStepMs: 180,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-three-detours',
    chapterId: 'classic-snake-island-circuits',
    title: {
      en: 'Three Detours',
      uk: 'Три об’їзди',
    },
    description: {
      en: 'Pass alternating ends of the three staggered walls without folding back into your tail.',
      uk: 'Обходьте три зміщені стіни почергово з різних кінців, не повертаючись у власний хвіст.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-three-detours',
      revision: '1',
      name: 'Three Detours',
      width: 24,
      height: 18,
      walls: [
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 9,
          y: 4,
        },
        {
          x: 10,
          y: 4,
        },
        {
          x: 17,
          y: 4,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 9,
          y: 5,
        },
        {
          x: 10,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 6,
          y: 6,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 17,
          y: 10,
        },
        {
          x: 6,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 12,
          y: 12,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
          y: 13,
        },
        {
          x: 11,
          y: 14,
        },
        {
          x: 12,
          y: 14,
        },
        {
          x: 14,
          y: 14,
        },
        {
          x: 15,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 13,
      stepMs: 180,
      speedupEvery: 0,
      minStepMs: 180,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-inner-or-outer',
    chapterId: 'classic-snake-island-circuits',
    title: {
      en: 'Inner or Outer',
      uk: 'Всередині чи зовні',
    },
    description: {
      en: 'The inner courtyard is shorter; the outer loop leaves more room for a long body.',
      uk: 'Шлях усередині двору коротший, але зовнішнє коло дає довгому хвосту більше простору.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-inner-or-outer',
      revision: '1',
      name: 'Inner or Outer',
      width: 24,
      height: 18,
      walls: [
        {
          x: 8,
          y: 5,
        },
        {
          x: 9,
          y: 5,
        },
        {
          x: 10,
          y: 5,
        },
        {
          x: 11,
          y: 5,
        },
        {
          x: 12,
          y: 5,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 13,
          y: 9,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 13,
        },
        {
          x: 10,
          y: 13,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
          y: 13,
        },
        {
          x: 13,
          y: 13,
        },
        {
          x: 14,
          y: 13,
        },
        {
          x: 15,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 14,
      stepMs: 180,
      speedupEvery: 0,
      minStepMs: 180,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-long-circuit',
    chapterId: 'classic-snake-island-circuits',
    title: {
      en: 'Long Circuit',
      uk: 'Довге коло',
    },
    description: {
      en: 'Use the corner islands to plan a full circuit around the central block.',
      uk: 'Сплануйте повне коло навколо центрального блока між кутовими островами.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-long-circuit',
      revision: '1',
      name: 'Long Circuit',
      width: 24,
      height: 18,
      walls: [
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 17,
          y: 4,
        },
        {
          x: 11,
          y: 6,
        },
        {
          x: 12,
          y: 6,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 6,
          y: 14,
        },
        {
          x: 7,
          y: 14,
        },
        {
          x: 16,
          y: 14,
        },
        {
          x: 17,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 14,
      stepMs: 180,
      speedupEvery: 0,
      minStepMs: 180,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-keep-the-tail',
    chapterId: 'classic-snake-borderless-routes',
    title: {
      en: 'Across the Edge',
      uk: 'Крізь край',
    },
    description: {
      en: 'All four edges wrap. Cross one to approach the target from the opposite side.',
      uk: 'Усі чотири краї з’єднані. Перетніть один із них, щоб зайти до цілі з протилежного боку.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-keep-the-tail',
      revision: '1',
      name: 'Across the Edge',
      width: 24,
      height: 18,
      walls: [
        {
          x: 8,
          y: 5,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 16,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 14,
      stepMs: 175,
      speedupEvery: 0,
      minStepMs: 175,
      wrap: true,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-lighten-at-home',
    chapterId: 'classic-snake-borderless-routes',
    title: {
      en: 'Two Shores',
      uk: 'Два береги',
    },
    description: {
      en: 'The two blocks are solid; use the wrapping edge to travel between their outer sides.',
      uk: 'Два блоки суцільні; переходьте між їхніми зовнішніми боками через край поля.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-lighten-at-home',
      revision: '1',
      name: 'Two Shores',
      width: 24,
      height: 18,
      walls: [
        {
          x: 11,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 11,
          y: 6,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 11,
          y: 11,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 14,
      stepMs: 175,
      speedupEvery: 0,
      minStepMs: 175,
      wrap: true,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-banking-steps',
    chapterId: 'classic-snake-borderless-routes',
    title: {
      en: 'Edge Steps',
      uk: 'Сходинки біля межі',
    },
    description: {
      en: 'Step around the staggered islands, or cross an edge for a wider turn.',
      uk: 'Оминайте зміщені острови або перетинайте край, щоб повернути на більшому просторі.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-banking-steps',
      revision: '1',
      name: 'Edge Steps',
      width: 24,
      height: 18,
      walls: [
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 13,
          y: 6,
        },
        {
          x: 13,
          y: 7,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 13,
          y: 8,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 13,
          y: 9,
        },
        {
          x: 14,
          y: 13,
        },
        {
          x: 15,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 15,
      stepMs: 175,
      speedupEvery: 0,
      minStepMs: 175,
      wrap: true,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-persistent-hub',
    chapterId: 'classic-snake-borderless-routes',
    title: {
      en: 'Borderless Hub',
      uk: 'Вузол без меж',
    },
    description: {
      en: 'Circle the central block and watch both sides of an edge before wrapping through it.',
      uk: 'Обходьте центральний блок і перевіряйте обидва боки краю, перш ніж перейти через нього.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-persistent-hub',
      revision: '1',
      name: 'Borderless Hub',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 10,
          y: 7,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 10,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 16,
          y: 13,
        },
        {
          x: 16,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 15,
      stepMs: 175,
      speedupEvery: 0,
      minStepMs: 175,
      wrap: true,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-two-return-rhythm',
    chapterId: 'classic-snake-borderless-routes',
    title: {
      en: 'Two-way Rhythm',
      uk: 'Двобічний ритм',
    },
    description: {
      en: 'Alternate inside passes with wrapping routes around the two large islands.',
      uk: 'Чергуйте внутрішні проходи з переходами через край навколо двох великих островів.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-two-return-rhythm',
      revision: '1',
      name: 'Two-way Rhythm',
      width: 24,
      height: 18,
      walls: [
        {
          x: 11,
          y: 5,
        },
        {
          x: 11,
          y: 6,
        },
        {
          x: 6,
          y: 7,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 18,
          y: 9,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 17,
          y: 10,
        },
        {
          x: 18,
          y: 10,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 11,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 16,
      stepMs: 175,
      speedupEvery: 0,
      minStepMs: 175,
      wrap: true,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-return-weave',
    chapterId: 'classic-snake-borderless-routes',
    title: {
      en: 'Edge Weave',
      uk: 'Плетіння через край',
    },
    description: {
      en: 'Connect the three islands with loops that cross the board boundary.',
      uk: 'Поєднуйте три острови петлями, що перетинають межу поля.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-return-weave',
      revision: '1',
      name: 'Edge Weave',
      width: 24,
      height: 18,
      walls: [
        {
          x: 11,
          y: 4,
        },
        {
          x: 12,
          y: 4,
        },
        {
          x: 18,
          y: 4,
        },
        {
          x: 19,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 19,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 15,
          y: 7,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 15,
          y: 8,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 15,
          y: 10,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 15,
          y: 11,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 5,
          y: 13,
        },
        {
          x: 6,
          y: 13,
        },
        {
          x: 15,
          y: 13,
        },
        {
          x: 5,
          y: 14,
        },
        {
          x: 6,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 16,
      stepMs: 175,
      speedupEvery: 0,
      minStepMs: 175,
      wrap: true,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-one-warning',
    chapterId: 'classic-snake-chicanes',
    title: {
      en: 'Single Chicane',
      uk: 'Одна шикана',
    },
    description: {
      en: 'Edges are solid again. Pass the short obstacle and leave space for a second turn.',
      uk: 'Краї знову непрохідні. Оминіть коротку перешкоду й залиште місце для другого повороту.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-one-warning',
      revision: '1',
      name: 'Single Chicane',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 15,
          y: 13,
        },
        {
          x: 16,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 16,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-warning-courtyard',
    chapterId: 'classic-snake-chicanes',
    title: {
      en: 'Open Courtyard',
      uk: 'Відкритий двір',
    },
    description: {
      en: 'Enter the courtyard through its opening and choose an exit before the body arrives.',
      uk: 'Увійдіть у двір через відкритий бік і оберіть вихід, поки хвіст не підійшов.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-warning-courtyard',
      revision: '1',
      name: 'Open Courtyard',
      width: 24,
      height: 18,
      walls: [
        {
          x: 8,
          y: 5,
        },
        {
          x: 9,
          y: 5,
        },
        {
          x: 10,
          y: 5,
        },
        {
          x: 11,
          y: 5,
        },
        {
          x: 12,
          y: 5,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 15,
          y: 10,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 15,
          y: 11,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 15,
          y: 12,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 16,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-crossed-sightlines',
    chapterId: 'classic-snake-chicanes',
    title: {
      en: 'Crossed Passages',
      uk: 'Перехресні проходи',
    },
    description: {
      en: 'Offset walls create crossing approaches. Keep the next lane open as speed rises.',
      uk: 'Зміщені стіни утворюють перехресні підходи. Зберігайте наступну смугу вільною, коли швидкість зростає.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-crossed-sightlines',
      revision: '1',
      name: 'Crossed Passages',
      width: 24,
      height: 18,
      walls: [
        {
          x: 9,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 17,
          y: 4,
        },
        {
          x: 9,
          y: 5,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 9,
          y: 7,
        },
        {
          x: 9,
          y: 8,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 14,
          y: 9,
        },
        {
          x: 9,
          y: 10,
        },
        {
          x: 14,
          y: 10,
        },
        {
          x: 14,
          y: 11,
        },
        {
          x: 14,
          y: 12,
        },
        {
          x: 6,
          y: 13,
        },
        {
          x: 7,
          y: 13,
        },
        {
          x: 14,
          y: 13,
        },
        {
          x: 6,
          y: 14,
        },
        {
          x: 7,
          y: 14,
        },
        {
          x: 14,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 17,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-screened-approach',
    chapterId: 'classic-snake-chicanes',
    title: {
      en: 'Screened Approach',
      uk: 'Прихований підхід',
    },
    description: {
      en: 'The horizontal bars require two turns. Approach from the wide end.',
      uk: 'Горизонтальні перегородки потребують двох поворотів. Заходьте з широкого кінця.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-screened-approach',
      revision: '1',
      name: 'Screened Approach',
      width: 24,
      height: 18,
      walls: [
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 17,
          y: 4,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 10,
          y: 6,
        },
        {
          x: 11,
          y: 6,
        },
        {
          x: 13,
          y: 11,
        },
        {
          x: 14,
          y: 11,
        },
        {
          x: 15,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 17,
          y: 11,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 14,
          y: 12,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 7,
          y: 13,
        },
        {
          x: 8,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 17,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-guarded-returns',
    chapterId: 'classic-snake-chicanes',
    title: {
      en: 'Twin Chicanes',
      uk: 'Подвійна шикана',
    },
    description: {
      en: 'Plan both turns before entering the staggered passage between the islands.',
      uk: 'Сплануйте обидва повороти перед входом у зміщений прохід між островами.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-guarded-returns',
      revision: '1',
      name: 'Twin Chicanes',
      width: 24,
      height: 18,
      walls: [
        {
          x: 10,
          y: 4,
        },
        {
          x: 10,
          y: 5,
        },
        {
          x: 10,
          y: 6,
        },
        {
          x: 10,
          y: 7,
        },
        {
          x: 5,
          y: 8,
        },
        {
          x: 6,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 5,
          y: 9,
        },
        {
          x: 6,
          y: 9,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 18,
          y: 9,
        },
        {
          x: 13,
          y: 11,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 13,
          y: 13,
        },
        {
          x: 13,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 18,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-garden-crossfire',
    chapterId: 'classic-snake-chicanes',
    title: {
      en: 'Garden Weave',
      uk: 'Садове плетіння',
    },
    description: {
      en: 'Weave between the upper and lower islands, using the outer loop when the middle fills.',
      uk: 'Маневруйте між верхнім і нижнім островами; виходьте на зовнішнє коло, коли центр займає хвіст.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-garden-crossfire',
      revision: '1',
      name: 'Garden Weave',
      width: 24,
      height: 18,
      walls: [
        {
          x: 11,
          y: 4,
        },
        {
          x: 12,
          y: 4,
        },
        {
          x: 13,
          y: 4,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 11,
          y: 14,
        },
        {
          x: 12,
          y: 14,
        },
        {
          x: 13,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 18,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-opposite-arrivals',
    chapterId: 'classic-snake-shared-circuits',
    title: {
      en: 'Opposite Arrivals',
      uk: 'Зустрічні підходи',
    },
    description: {
      en: 'The two lanes suit opposite approaches. In Team, leave your partner an exit.',
      uk: 'Дві смуги зручні для зустрічних підходів. У команді залишайте партнеру вихід.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-opposite-arrivals',
      revision: '1',
      name: 'Opposite Arrivals',
      width: 24,
      height: 18,
      walls: [
        {
          x: 9,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 9,
          y: 7,
        },
        {
          x: 15,
          y: 7,
        },
        {
          x: 9,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 15,
          y: 8,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 9,
          y: 10,
        },
        {
          x: 15,
          y: 10,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 15,
          y: 11,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 15,
          y: 12,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 16,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-crossing-schedule',
    chapterId: 'classic-snake-shared-circuits',
    title: {
      en: 'Crossing Schedule',
      uk: 'Черговість перетину',
    },
    description: {
      en: 'Four bars frame the crossing. In Team, take turns using the central lane.',
      uk: 'Чотири перегородки обрамляють перехрестя. У команді проходьте центральною смугою по черзі.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-crossing-schedule',
      revision: '1',
      name: 'Crossing Schedule',
      width: 24,
      height: 18,
      walls: [
        {
          x: 6,
          y: 6,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 14,
          y: 12,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 6,
          y: 13,
        },
        {
          x: 7,
          y: 13,
        },
        {
          x: 8,
          y: 13,
        },
        {
          x: 9,
          y: 13,
        },
        {
          x: 14,
          y: 13,
        },
        {
          x: 15,
          y: 13,
        },
        {
          x: 16,
          y: 13,
        },
        {
          x: 17,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 16,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-paired-loops',
    chapterId: 'classic-snake-shared-circuits',
    title: {
      en: 'Paired Loops',
      uk: 'Парні петлі',
    },
    description: {
      en: 'Use opposite loops around the islands; meet only when the crossing is free.',
      uk: 'Використовуйте протилежні петлі навколо островів; сходьтеся лише на вільному перехресті.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-paired-loops',
      revision: '1',
      name: 'Paired Loops',
      width: 24,
      height: 18,
      walls: [
        {
          x: 5,
          y: 4,
        },
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 17,
          y: 14,
        },
        {
          x: 18,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 17,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-shared-detour',
    chapterId: 'classic-snake-shared-circuits',
    title: {
      en: 'Shared Detour',
      uk: 'Спільний обхід',
    },
    description: {
      en: 'The U-shaped detour has a narrow entrance and a broad outside return.',
      uk: 'П-подібний обхід має вузький вхід і широкий зовнішній шлях назад.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-shared-detour',
      revision: '1',
      name: 'Shared Detour',
      width: 24,
      height: 18,
      walls: [
        {
          x: 9,
          y: 5,
        },
        {
          x: 10,
          y: 5,
        },
        {
          x: 11,
          y: 5,
        },
        {
          x: 12,
          y: 5,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
        {
          x: 9,
          y: 6,
        },
        {
          x: 9,
          y: 7,
        },
        {
          x: 9,
          y: 8,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 13,
          y: 9,
        },
        {
          x: 9,
          y: 10,
        },
        {
          x: 9,
          y: 11,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 13,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
          y: 13,
        },
        {
          x: 13,
          y: 13,
        },
        {
          x: 14,
          y: 13,
        },
        {
          x: 15,
          y: 13,
        },
        {
          x: 10,
          y: 14,
        },
        {
          x: 11,
          y: 14,
        },
        {
          x: 12,
          y: 14,
        },
        {
          x: 13,
          y: 14,
        },
        {
          x: 14,
          y: 14,
        },
        {
          x: 15,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 17,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-support-corridor',
    chapterId: 'classic-snake-shared-circuits',
    title: {
      en: 'Passing Corridor',
      uk: 'Коридор для проходу',
    },
    description: {
      en: 'Choose the upper or lower passage around the walls; avoid a head-on meeting in Team.',
      uk: 'Оберіть верхній або нижній прохід навколо стін; у команді уникайте зустрічі голова в голову.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-support-corridor',
      revision: '1',
      name: 'Passing Corridor',
      width: 24,
      height: 18,
      walls: [
        {
          x: 7,
          y: 4,
        },
        {
          x: 11,
          y: 4,
        },
        {
          x: 12,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 7,
          y: 13,
        },
        {
          x: 16,
          y: 13,
        },
        {
          x: 11,
          y: 14,
        },
        {
          x: 12,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 18,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-shared-circuit',
    chapterId: 'classic-snake-shared-circuits',
    title: {
      en: 'Shared Circuit',
      uk: 'Спільне коло',
    },
    description: {
      en: 'Follow the offset openings as one circuit. Every Team catch grows the snake that caught it.',
      uk: 'Поєднайте зміщені проходи в одне коло. У команді від цілі росте змія, яка її спіймала.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-shared-circuit',
      revision: '1',
      name: 'Shared Circuit',
      width: 24,
      height: 18,
      walls: [
        {
          x: 9,
          y: 4,
        },
        {
          x: 10,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 7,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 7,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 7,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 11,
          y: 12,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 14,
          y: 13,
        },
        {
          x: 15,
          y: 13,
        },
        {
          x: 11,
          y: 14,
        },
        {
          x: 14,
          y: 14,
        },
        {
          x: 15,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 18,
      stepMs: 180,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-long-opening',
    chapterId: 'classic-snake-final-weave',
    title: {
      en: 'Long Opening',
      uk: 'Довгий початок',
    },
    description: {
      en: 'Build a long body around the central island while keeping both end passages clear.',
      uk: 'Вирощуйте довгий хвіст навколо центрального острова, залишаючи обидва крайні проходи вільними.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-long-opening',
      revision: '1',
      name: 'Long Opening',
      width: 24,
      height: 18,
      walls: [
        {
          x: 16,
          y: 4,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 8,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 16,
          y: 7,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 11,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 8,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 8,
          y: 13,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 18,
      stepMs: 175,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: false,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-ordered-islands',
    chapterId: 'classic-snake-final-weave',
    title: {
      en: 'Borderless Islands',
      uk: 'Острови без меж',
    },
    description: {
      en: 'This board wraps. Use its connected edges to circle the three islands.',
      uk: 'Краї цього поля з’єднані. Скористайтеся ними, щоб обходити три острови.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-ordered-islands',
      revision: '1',
      name: 'Borderless Islands',
      width: 24,
      height: 18,
      walls: [
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 17,
          y: 5,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 10,
          y: 13,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 12,
          y: 13,
        },
        {
          x: 13,
          y: 13,
        },
        {
          x: 10,
          y: 14,
        },
        {
          x: 11,
          y: 14,
        },
        {
          x: 12,
          y: 14,
        },
        {
          x: 13,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 19,
      stepMs: 175,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: true,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
  {
    id: 'classic-snake-woven-gauntlet',
    chapterId: 'classic-snake-final-weave',
    title: {
      en: 'Woven Gauntlet',
      uk: 'Смуга плетіння',
    },
    description: {
      en: 'Wrapping edges offer a bypass around the three staggered bars; do not meet your own tail there.',
      uk: 'Переходи через край дають обхід трьох зміщених перегородок; не зустріньте там власний хвіст.',
    },
    level: {
      version: 'classic-snake-level.v1',
      id: 'classic-snake-woven-gauntlet',
      revision: '1',
      name: 'Woven Gauntlet',
      width: 24,
      height: 18,
      walls: [
        {
          x: 6,
          y: 4,
        },
        {
          x: 7,
          y: 4,
        },
        {
          x: 8,
          y: 4,
        },
        {
          x: 9,
          y: 4,
        },
        {
          x: 10,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 6,
          y: 5,
        },
        {
          x: 7,
          y: 5,
        },
        {
          x: 8,
          y: 5,
        },
        {
          x: 9,
          y: 5,
        },
        {
          x: 10,
          y: 5,
        },
        {
          x: 8,
          y: 9,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 13,
          y: 9,
        },
        {
          x: 14,
          y: 9,
        },
        {
          x: 15,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
        {
          x: 17,
          y: 9,
        },
        {
          x: 7,
          y: 13,
        },
        {
          x: 8,
          y: 13,
        },
        {
          x: 9,
          y: 13,
        },
        {
          x: 10,
          y: 13,
        },
        {
          x: 11,
          y: 13,
        },
        {
          x: 7,
          y: 14,
        },
        {
          x: 8,
          y: 14,
        },
        {
          x: 9,
          y: 14,
        },
        {
          x: 10,
          y: 14,
        },
        {
          x: 11,
          y: 14,
        },
      ],
      spawns: [
        {
          x: 5,
          y: 2,
          direction: 'right',
        },
        {
          x: 18,
          y: 15,
          direction: 'left',
        },
      ],
      goal: 20,
      stepMs: 175,
      speedupEvery: 4,
      minStepMs: 135,
      wrap: true,
      targetMovement: 'still',
      fleeEvery: 3,
    },
  },
];
