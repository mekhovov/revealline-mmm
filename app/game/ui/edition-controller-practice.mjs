import { required, canonicalJSON } from '../data-json.mjs';
import { normalizedLevel } from '../core/level.mjs';
import { compileContentProject, resolveMission } from '../content-design/project.mjs';
import { applyGameplayTuning, resolveGameplayTuning } from '../gameplay-tuning.mjs';
import { entryScenario } from '../playground/model.mjs';

const projects = new WeakMap();
function selectedProject(provider) {
  required(provider?.kind === 'edition', 'Controller practice needs a selected edition.');
  if (!projects.has(provider)) projects.set(provider, compileContentProject(provider.route.source));
  return projects.get(provider);
}

/** Only the admitted audience's missions are exposed. A resolved scenario is
 * reconstructed in the child, never transferred through the shared Playground. */
export function editionPracticeChoices(provider, { difficulty = 'standard' } = {}) {
  resolveGameplayTuning(difficulty);
  const project = selectedProject(provider);
  return project.campaigns.flatMap((campaign) =>
    campaign.missionIds.map((missionId) => {
      const manifest = resolveMission(project, missionId, { difficulty });
      const theme = provider.themes.find((item) => item.id === manifest.presentation.themeId);
      required(theme, 'Practice mission theme is outside the selected edition.');
      return {
        missionId,
        levelId: missionId,
        label: `${campaign.name} / ${manifest.level.name}`,
        entry: {
          campaign: {
            version: 'xonix-campaign.v1',
            id: campaign.id,
            revision: campaign.revision,
            title: campaign.name,
            levels: [manifest.level],
          },
          themes: [theme],
          classRecipes: provider.boot[3],
        },
      };
    }),
  );
}

export function createEditionPracticeScenario(
  provider,
  { missionId, classId = 'scout', turnPolicy = 'immediate', difficulty = 'standard' } = {},
) {
  const choice = editionPracticeChoices(provider, { difficulty }).find(
    (item) => item.missionId === missionId,
  );
  required(choice, 'Practice mission is outside the selected edition.');
  required(
    choice.entry.classRecipes.some((recipe) => recipe.id === classId),
    'Practice class is outside the selected edition.',
  );
  required(['immediate', 'grid-center'].includes(turnPolicy), 'Unsupported practice steering.');
  const scenario = entryScenario(choice.entry, missionId, { classId, turnPolicy, seed: 1 });
  // The normal host deliberately does not retune imported practice scenarios.
  scenario.level = applyGameplayTuning(scenario.level, resolveGameplayTuning(difficulty));
  return scenario;
}

export function editionPracticePreviewURL(
  provider,
  {
    missionId,
    classId = 'scout',
    turnPolicy = 'immediate',
    difficulty = 'standard',
    controllerSession,
    revision = 1,
  } = {},
) {
  createEditionPracticeScenario(provider, { missionId, classId, turnPolicy, difficulty });
  required(/^[a-f0-9]{32}$/.test(controllerSession), 'Invalid controller practice session.');
  required(Number.isSafeInteger(revision) && revision > 0, 'Invalid practice revision.');
  return provider.href({
    practice: '1',
    'edition-mission': missionId,
    class: classId,
    'turn-policy': turnPolicy,
    difficulty,
    'controller-preview': '1',
    'controller-session': controllerSession,
    revision: String(revision),
  });
}

/** Only the existing Guide-return route may carry a retained uint32 seed.
 * Missing leaves the Controller Practice API's historical seed 1 untouched. */
export function readEditionGuideSeed(params) {
  if (!params.has('guide-seed')) return null;
  const one = (key) => params.getAll(key).length === 1 && params.get(key);
  const raw = one('guide-seed');
  required(
    one('practice') === '1' &&
      one('practice-return') === 'enemy-guide' &&
      /^[a-f0-9]{32}$/.test(one('enemy-workshop-session')) &&
      one('edition-mission') &&
      !params.has('controller-preview') &&
      typeof raw === 'string' &&
      /^(0|[1-9][0-9]{0,9})$/.test(raw) &&
      Number(raw) <= 0xffffffff,
    'Invalid edition Field Guide seed or return identity.',
  );
  return Number(raw);
}

/** Reconstruct only an admitted edition mission. Never transfer arbitrary
 * replacement rules across the edition boundary or tune an effective level twice. */
export function editionGuidePracticeURL(
  provider,
  { scenario, returnURL, difficulty = 'standard' },
) {
  const { classId, turnPolicy, seed } = scenario.settings,
    expected = createEditionPracticeScenario(provider, {
      missionId: scenario.level.id,
      classId,
      turnPolicy,
      difficulty,
    });
  required(
    canonicalJSON(normalizedLevel(expected.level)) ===
      canonicalJSON(normalizedLevel(scenario.level)) &&
      canonicalJSON(expected.classRecipes) === canonicalJSON(scenario.classRecipes),
    'Field Guide practice no longer matches the loaded edition rules or classes.',
  );
  required(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff, 'Invalid Field Guide seed.');
  const original = new URL(returnURL),
    url = new URL(
      provider.href({
        practice: '1',
        'practice-return': 'enemy-guide',
        'enemy-workshop-session': original.searchParams.get('enemy-workshop-session'),
        'edition-mission': scenario.level.id,
        class: classId,
        'turn-policy': turnPolicy,
        difficulty,
        'guide-seed': String(seed),
      }),
    );
  required(
    original.origin === url.origin &&
      ['http:', 'https:'].includes(original.protocol) &&
      original.searchParams.getAll('practice').length === 1 &&
      original.searchParams.get('practice') === '1' &&
      original.searchParams.getAll('practice-return').length === 1 &&
      original.searchParams.get('practice-return') === 'enemy-guide' &&
      original.searchParams.getAll('enemy-workshop-session').length === 1,
    'Field Guide practice needs its same-origin return identity.',
  );
  readEditionGuideSeed(url.searchParams);
  return url.href;
}
