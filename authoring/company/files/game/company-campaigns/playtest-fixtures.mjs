/** Authoring-only transfer tasks. Never included in an edition or awarded Journey mastery. */
import { freezeDesign } from '../content-design/catalogs.mjs';
import { dataIdentity } from '../data-json.mjs';
import { companyLessonForMission } from './lessons.mjs';
import { validateCompanyLesson } from './learning.mjs';

const record = (id, title, ...lines) => ({ id, title, lines });
const field = (id, label, values, expected, explanation) => ({
  id,
  label,
  options: values.map((value) => ({ value, label: value })),
  expected,
  explanation,
});
function transfer(id, baseMissionId, content) {
  const base = companyLessonForMission(baseMissionId);
  return {
    id,
    baseMissionId,
    baseLessonRevision: base.revision,
    baseLessonIdentity: dataIdentity(base),
    lesson: validateCompanyLesson({
      ...structuredClone(base),
      ...content,
      id: `${id}-lesson`,
      missionId: id,
      revision: '1',
      fixtureRevision: '1',
      notice:
        'Fictional offline transfer task for a facilitated playtest. No live actions, certification or campaign progress.',
    }),
  };
}

export const COMPANY_PLAYTEST_FIXTURES = freezeDesign([
  transfer('playtest-culture-connection', 'coupa-inside-village-01', {
    title: 'Connect across schedules',
    brief:
      'A new fictional teammate works different hours. Choose a first connection and explain how you would check that the approach helped them.',
    records: [
      record(
        'schedule',
        'Teammate’s note',
        '“I cannot attend this week’s live introduction. A short written introduction would help me start.”',
        'The teammate has shared no other personal circumstances.',
      ),
      record(
        'routes',
        'Available routes',
        'You can send a short role-and-question introduction now, or ask which written format would help most.',
        'Either route can leave a way to reply later without requiring a live meeting.',
      ),
    ],
    fields: [
      {
        id: 'connection',
        label: 'First connection',
        expected: null,
        explanation: 'There is no scored personality or values assessment.',
        options: [
          {
            value: 'Send a short introduction and invite a later reply',
            label: 'Send a short introduction and invite a later reply',
            consequence:
              'This provides useful context immediately; ask afterward whether the format helped and leave the reply time flexible.',
          },
          {
            value: 'Ask which written format would help most',
            label: 'Ask which written format would help most',
            consequence:
              'This checks the teammate’s preference first; include enough context in your question so they can answer without another meeting.',
          },
        ],
      },
    ],
    success:
      'Connection approach reflected on. Follow up with the teammate; belonging is not scored.',
  }),
  transfer('playtest-foundations-requirement', 'coupa-source-to-pay-01', {
    title: 'Prepare a different workshop',
    brief:
      'Build the requirement from the new workshop brief. Explain which evidence changed your answer from the first mission.',
    records: [
      record(
        'need',
        'Repair workshop brief',
        'Twelve learners will share six workstations in pairs. All six electronics kits are already owned.',
        'Each workstation needs one reusable case. Cases must arrive by 4 November for setup; the workshop is 6 November.',
      ),
      record(
        'offer',
        'Unsolicited offer',
        'A supplier offers twelve additional electronics kits arriving 8 November.',
        'The organizer has not requested replacement kits.',
      ),
    ],
    fields: [
      field(
        'item',
        'Required item',
        ['Electronics kit', 'Reusable case'],
        'Reusable case',
        'The kits already exist. Buying more would leave the six workstations without the requested cases.',
      ),
      field(
        'quantity',
        'Required quantity',
        ['12', '6'],
        '6',
        'The requirement is one case per shared workstation, not one per learner. Twelve would double the stated need.',
      ),
      field(
        'needBy',
        'Required arrival',
        ['8 November', '4 November'],
        '4 November',
        'The 8 November offer arrives after the workshop. Preserve the 4 November setup deadline.',
      ),
    ],
    success:
      'Requirement prepared: six reusable cases by 4 November; the existing kits are retained.',
  }),
  transfer('playtest-operations-owner', 'coupa-product-operations-01', {
    title: 'Change the role, change the task',
    role: 'Department approver',
    brief:
      'Use the new role assignment to choose work. Explain why the requester’s task from the earlier mission is not yours in this case.',
    records: [
      record(
        'role',
        'Your role in this case',
        'You are the department approver assigned to R-405. Its supporting quote is ready for your review.',
        'This exercise chooses the review task only. The quote still needs assessment before any approval decision.',
      ),
      record(
        'tasks',
        'Task board',
        'R-301: delivery address missing; assigned to requester Lee.',
        'INV-77: approved notification; no task assigned to you.',
        'R-405: supporting quote ready; assigned to you as department approver.',
      ),
    ],
    fields: [
      field(
        'record',
        'Open record',
        ['R-301', 'INV-77', 'R-405'],
        'R-405',
        'R-301 belongs to requester Lee. Opening your R-405 review keeps each task with its assigned owner.',
      ),
      field(
        'action',
        'Work to perform',
        ['Complete delivery address', 'Review supporting quote'],
        'Review supporting quote',
        'The address task is assigned elsewhere. Assess the quote before deciding on approval; being assigned a review is not automatic authorization.',
      ),
    ],
    success: 'R-405 review selected. No approval has been granted by choosing the task.',
  }),
  transfer('playtest-developers-resource', 'coupa-developer-integration-01', {
    title: 'Read a different business object',
    brief:
      'Plan a read of an existing invoice. Explain which part of the first mission’s request plan stays the same and which must change.',
    records: [
      record(
        'requirement',
        'Support lookup',
        'Read the status of one known invoice, INV-808. Do not create, resubmit or update an invoice.',
        'The supplier’s name is included as background context; the requested result is the invoice status.',
      ),
      record(
        'resources',
        'Resource notes',
        'Invoice records belong to invoices. Supplier profiles belong to suppliers.',
        'GET reads existing records. POST attempts to create a new record.',
      ),
    ],
    fields: [
      field(
        'resource',
        'Resource',
        ['suppliers', 'invoices'],
        'invoices',
        'A supplier profile cannot answer the requested invoice-status lookup. Choose the invoice resource even though a supplier is mentioned.',
      ),
      field(
        'method',
        'Operation',
        ['GET', 'POST'],
        'GET',
        'The business object changed, but this is still a read. POST would attempt a create the support task never requested.',
      ),
    ],
    success: 'Local plan: GET the known invoice. No request was sent and no invoice was created.',
  }),
]);

/** Participant view deliberately omits answers, coaching feedback and completion copy. */
export function companyPlaytestTask(id) {
  const fixture = COMPANY_PLAYTEST_FIXTURES.find((entry) => entry.id === id);
  if (!fixture) throw new TypeError('Unknown company transfer task.');
  const { title, role, brief, notice, records, fields, kind } = fixture.lesson;
  return freezeDesign({
    id,
    title,
    role,
    brief,
    notice,
    kind,
    records,
    fields: fields.map(({ id, label, options }) => ({
      id,
      label,
      options: options.map(({ value, label }) => ({ value, label })),
    })),
  });
}
