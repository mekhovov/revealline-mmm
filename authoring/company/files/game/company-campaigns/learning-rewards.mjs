import { required } from '../data-json.mjs';
import { completionLearningReference } from '../rewards/learning.mjs';

export const COMPANY_LEARNING_REWARD_CAMPAIGN_IDS = Object.freeze(['coupa-source-to-pay']);

/** Optional, exact-fixture discovery. Its accepted learning evidence comes from
 * the existing replay verifier, never from this authoring factory. */
export function createCompanyLearningRewards({ definition, missionBindings, lessons }) {
  if (!COMPANY_LEARNING_REWARD_CAMPAIGN_IDS.includes(definition.id)) return [];
  const missionId = 'coupa-source-to-pay-01';
  const mission = missionBindings.find((entry) => entry.levelId === missionId);
  const lesson = lessons.find((entry) => entry.missionId === missionId);
  required(
    definition.brandId === 'coupa' &&
      definition.missionIds.includes(missionId) &&
      mission?.campaignId === definition.id &&
      lesson?.campaignId === definition.id,
    'Learning discovery needs its exact selected mission and lesson.',
  );
  return [
    {
      format: 'revealline-completion-reward.v1',
      id: `${missionId}-learning-discovery`,
      revision: '1',
      brandId: definition.brandId,
      campaignId: definition.id,
      scope: { kind: 'mission', id: missionId },
      locales: {
        en: {
          title: 'A need before an offer',
          teaser:
            'Optional discovery: win Find the Need and complete its fictional workbench to open a new requirement puzzle.',
        },
        uk: {
          title: 'Спочатку потреба, потім пропозиція',
          teaser:
            'Додаткове відкриття: переможіть у місії «Знайдіть потребу» та завершіть її вигадану вправу, щоб відкрити нову задачу про вимоги.',
        },
      },
      requirements: {
        missions: [{ missionId, bindings: structuredClone(mission.bindings) }],
        learning: [completionLearningReference(lesson)],
        mastery: [],
      },
      payloads: [
        {
          id: `${missionId}-requirement-guide`,
          type: 'knowledge',
          locales: {
            en: {
              title: 'Keep the need visible',
              paragraphs: [
                'In the fictional workshop, twelve learners needed twelve electronics kits by 12 October. An unsolicited offer for ten camera cases arriving later could not replace that requirement. Your workbench result kept item, quantity and date tied to the original evidence.',
                'Try another fictional situation: a library hosts eight readers on 20 November and needs one reading lamp for each by 18 November. A supplier offers six desk mats arriving on 21 November. Before comparing offers, state the required item, quantity and date. Which parts of the offer conflict with the need?',
                'A useful answer is eight reading lamps by 18 November: the offered item, quantity and arrival date all differ. This optional reflection is not scored or saved as another learning completion. It is a fictional example, not a universal Coupa policy or product certification.',
              ],
              sources: structuredClone(lesson.sources),
            },
            uk: {
              title: 'Не втрачайте початкову потребу',
              paragraphs: [
                'У вигаданій майстерні дванадцятьом учасникам були потрібні дванадцять наборів електроніки до 12 жовтня. Пропозиція десяти футлярів для камер із пізнішою доставкою не могла замінити цю вимогу. У вправі ви пов’язали предмет, кількість і дату з початковими даними.',
                'Спробуйте іншу вигадану ситуацію: 20 листопада бібліотека приймає вісім читачів і потребує по одній лампі для кожного до 18 листопада. Постачальник пропонує шість настільних килимків із доставкою 21 листопада. Перш ніж порівнювати пропозиції, назвіть потрібний предмет, кількість і дату. Які частини пропозиції суперечать потребі?',
                'Корисна відповідь — вісім ламп для читання до 18 листопада: предмет, кількість і дата доставки в пропозиції відрізняються. Це додаткове запитання не оцінюється й не зберігається як нове завершене навчання. Приклад вигаданий і не є універсальним правилом Coupa чи підтвердженням кваліфікації.',
              ],
              sources: structuredClone(lesson.sources),
            },
          },
        },
      ],
    },
  ];
}
