const SHA256 = /^[a-f0-9]{64}$/;
const REVISION = /^[a-f0-9]{40,64}$/;
const VERSION = /^v\d+\.\d+\.\d+$/;
const SAFE_ID = /^[a-z0-9][a-z0-9.-]{0,119}$/;

export const COMPANY_QUALIFICATION_GATES = Object.freeze([
  'automated-validation',
  'content-accuracy',
  'asset-review',
  'human-pacing-and-comprehension',
  'accessibility',
  'installed-pwa-isolation',
  'update-and-rollback',
  'storage-and-backup-recovery',
  'same-device-performance',
]);

export const COMPANY_GATE_SCENARIOS = Object.freeze({
  'automated-validation': Object.freeze(['exact-source-ci']),
  'content-accuracy': Object.freeze(['mission-copy', 'brand-claims', 'fictional-policy']),
  'asset-review': Object.freeze(['identity', 'mission-art', 'rights-attribution']),
  'human-pacing-and-comprehension': Object.freeze([
    'objective-comprehension',
    'threat-recognition',
    'action-consequence',
    'transfer',
  ]),
  accessibility: Object.freeze([
    'keyboard',
    'touch-or-controller',
    'reduced-motion',
    'screen-reader',
  ]),
  'installed-pwa-isolation': Object.freeze([
    'coupa-os-launch',
    'droneaid-os-launch',
    'concurrent-isolation',
  ]),
  'update-and-rollback': Object.freeze([
    'update-one',
    'rollback-one',
    'other-preserved',
    'interrupted-download-recovery',
  ]),
  'storage-and-backup-recovery': Object.freeze([
    'backup-export',
    'matching-import',
    'foreign-import-rejected',
    'storage-failure-recovery',
  ]),
  'same-device-performance': Object.freeze([
    'opening-play',
    'advanced-encounter',
    'picture-reveal',
    'edition-switch',
  ]),
});

export const COMPANY_GATE_SCENARIO_MINIMUMS = Object.freeze({
  'same-device-performance': Object.freeze({ 'edition-switch': 2 }),
});

const DEVICE_GATES = new Set([
  'accessibility',
  'installed-pwa-isolation',
  'update-and-rollback',
  'storage-and-backup-recovery',
  'same-device-performance',
]);
const INSTALLED_GATES = new Set([
  'installed-pwa-isolation',
  'update-and-rollback',
  'storage-and-backup-recovery',
]);
const CROSS_EDITION_GATES = new Set([
  'installed-pwa-isolation',
  'update-and-rollback',
  'storage-and-backup-recovery',
  'same-device-performance',
]);
const PRIMARY_EDITIONS = Object.freeze(['coupa-all', 'droneaid-nl-community']);
const REVIEW_STATUSES = new Set(['pending', 'passed', 'failed', 'unavailable']);
const OUTCOMES = new Set(['passed', 'failed', 'unavailable']);
const DEVICE_ENVIRONMENT_FIELDS = Object.freeze([
  'actualDevice',
  'assistiveTechnology',
  'browser',
  'device',
  'emulated',
  'input',
  'installedApp',
  'os',
  'viewport',
]);

const fail = (message) => {
  throw new TypeError(message);
};
const text = (value, maximum = 2000) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
const exactKeys = (value, keys, label) => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== [...keys].sort().join(',')
  )
    fail(`${label} has unsupported fields.`);
};
const date = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) &&
  Number.isFinite(Date.parse(value));

function validateEnvelope(envelope) {
  if (
    envelope?.format !== 'revealline-editions.v1' ||
    !VERSION.test(envelope.version) ||
    !REVISION.test(envelope.sourceRevision) ||
    !REVISION.test(envelope.sourceTree) ||
    !Array.isArray(envelope.editions) ||
    envelope.editions.length === 0 ||
    envelope.editions.length > 32
  )
    fail('Choose one complete frozen company-edition envelope.');
  const ids = envelope.editions.map((edition) => edition?.id);
  if (ids.some((id) => !SAFE_ID.test(id)) || new Set(ids).size !== ids.length)
    fail('The frozen envelope has invalid or duplicate edition IDs.');
  return ids;
}

function validateCandidate(envelope, candidate, envelopeSha256) {
  exactKeys(
    candidate,
    ['artifact', 'envelopeSha256', 'sourceRevision', 'sourceTree', 'version'],
    'Candidate binding',
  );
  exactKeys(candidate.artifact, ['bytes', 'id', 'name', 'sha256'], 'Candidate artifact');
  if (
    candidate.envelopeSha256 !== envelopeSha256 ||
    candidate.sourceRevision !== envelope.sourceRevision ||
    candidate.sourceTree !== envelope.sourceTree ||
    candidate.version !== envelope.version ||
    !SHA256.test(candidate.envelopeSha256) ||
    !Number.isSafeInteger(candidate.artifact.id) ||
    candidate.artifact.id <= 0 ||
    !Number.isSafeInteger(candidate.artifact.bytes) ||
    candidate.artifact.bytes <= 0 ||
    candidate.artifact.bytes > 2_000_000_000 ||
    candidate.artifact.name !== `company-candidate-${envelope.sourceRevision}` ||
    !SHA256.test(candidate.artifact.sha256)
  )
    fail('Qualification does not bind the exact immutable company candidate.');
}

function validateEnvironment(environment, gate, status) {
  if (!DEVICE_GATES.has(gate)) {
    if (environment !== null) fail('Non-device reviews must not imply a device observation.');
    return;
  }
  if (status !== 'passed' && environment === null) return;
  exactKeys(environment, DEVICE_ENVIRONMENT_FIELDS, 'Device environment');
  if (
    environment.actualDevice !== true ||
    environment.emulated !== false ||
    (INSTALLED_GATES.has(gate) && environment.installedApp !== true) ||
    !text(environment.os, 200) ||
    !text(environment.browser, 200) ||
    !text(environment.device, 200) ||
    !text(environment.viewport, 100) ||
    !text(environment.input, 200) ||
    typeof environment.assistiveTechnology !== 'string' ||
    environment.assistiveTechnology.length > 200
  )
    fail('Device evidence needs one actual, non-emulated environment with exact details.');
}

function validateObservation(observation, gate, status) {
  exactKeys(observation, ['expected', 'observed', 'outcome', 'scenario'], 'Observation');
  if (
    !COMPANY_GATE_SCENARIOS[gate].includes(observation.scenario) ||
    !OUTCOMES.has(observation.outcome) ||
    !text(observation.expected) ||
    !text(observation.observed)
  )
    fail('Qualification observation is incomplete or outside the selected gate.');
  if (status === 'passed' && observation.outcome !== 'passed')
    fail('A passed review cannot contain a failed or unavailable observation.');
}

function validateReview(review, editionIds, envelope) {
  exactKeys(
    review,
    [
      'automation',
      'editionIds',
      'environment',
      'gate',
      'id',
      'observations',
      'reviewedAt',
      'reviewer',
      'status',
      'summary',
    ],
    'Qualification review',
  );
  if (
    !/^review-[a-z0-9][a-z0-9.-]{0,112}$/.test(review.id) ||
    !COMPANY_QUALIFICATION_GATES.includes(review.gate) ||
    !REVIEW_STATUSES.has(review.status) ||
    !Array.isArray(review.editionIds) ||
    review.editionIds.length === 0 ||
    review.editionIds.length > editionIds.length ||
    new Set(review.editionIds).size !== review.editionIds.length ||
    review.editionIds.some((id) => !editionIds.includes(id)) ||
    !Array.isArray(review.observations) ||
    review.observations.length > 50 ||
    !text(review.summary)
  )
    fail('Qualification review identity or coverage is invalid.');
  if (review.status === 'passed') {
    if (!text(review.reviewer, 200) || !date(review.reviewedAt) || review.observations.length === 0)
      fail('Passed reviews require a named reviewer, time and observed result.');
  } else if (
    (review.reviewer !== '' && !text(review.reviewer, 200)) ||
    (review.reviewedAt !== '' && !date(review.reviewedAt))
  )
    fail('Pending review metadata is invalid.');
  validateEnvironment(review.environment, review.gate, review.status);
  review.observations.forEach((observation) =>
    validateObservation(observation, review.gate, review.status),
  );
  if (
    new Set(review.observations.map(({ scenario }) => scenario)).size !== review.observations.length
  )
    fail('One review entry cannot count the same scenario more than once.');
  if (CROSS_EDITION_GATES.has(review.gate) && review.status === 'passed') {
    for (const id of PRIMARY_EDITIONS)
      if (editionIds.includes(id) && !review.editionIds.includes(id))
        fail('Cross-edition device evidence must observe both primary company editions together.');
  }
  if (review.gate === 'automated-validation') {
    if (review.environment !== null) fail('Automated validation cannot claim a physical device.');
    if (review.status !== 'passed' && review.automation === null) return;
    exactKeys(review.automation, ['conclusion', 'runUrl', 'sourceRevision'], 'Automation receipt');
    if (
      review.automation.conclusion !== 'success' ||
      review.automation.sourceRevision !== envelope.sourceRevision ||
      !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/[1-9][0-9]*$/.test(
        review.automation.runUrl,
      )
    )
      fail('Automated validation must cite a successful exact-source Actions run.');
  } else if (review.automation !== null)
    fail('Human review gates cannot inherit an automation receipt.');
}

function selectCoherentCoverage(passedReviews, gate) {
  const groups = [];
  if (gate === 'same-device-performance') {
    const byEnvironment = new Map();
    for (const review of passedReviews) {
      const key = JSON.stringify(
        Object.fromEntries(
          DEVICE_ENVIRONMENT_FIELDS.map((field) => [field, review.environment[field]]),
        ),
      );
      if (!byEnvironment.has(key)) byEnvironment.set(key, []);
      byEnvironment.get(key).push(review);
    }
    groups.push(...byEnvironment.values());
  } else if (passedReviews.length > 0) groups.push(passedReviews);

  const candidates = (groups.length > 0 ? groups : [[]]).map((reviews) => {
    const observed = reviews
        .flatMap((review) => review.observations)
        .reduce((counts, observation) => {
          counts.set(observation.scenario, (counts.get(observation.scenario) ?? 0) + 1);
          return counts;
        }, new Map()),
      missingScenarios = [],
      deficit = COMPANY_GATE_SCENARIOS[gate].reduce((total, scenario) => {
        const minimum = COMPANY_GATE_SCENARIO_MINIMUMS[gate]?.[scenario] ?? 1,
          count = observed.get(scenario) ?? 0;
        if (count < minimum)
          missingScenarios.push(minimum === 1 ? scenario : `${scenario} (${count}/${minimum})`);
        return total + Math.max(0, minimum - count);
      }, 0);
    return { reviews, missingScenarios, deficit };
  });
  return candidates.reduce((best, candidate) =>
    candidate.deficit < best.deficit ? candidate : best,
  );
}

export function createCompanyQualificationRecord(envelope, candidate) {
  validateEnvelope(envelope);
  if (!SHA256.test(candidate?.envelopeSha256 ?? ''))
    fail('Compute the selected envelope SHA-256 before creating a qualification record.');
  validateCandidate(envelope, candidate, candidate.envelopeSha256);
  return {
    format: 'revealline-company-qualification.v1',
    candidate: structuredClone(candidate),
    reviews: [],
  };
}

/** Validate a reviewer-authored record and derive coverage. This never mutates
 * the record or changes an edition envelope's publicEligible state. */
export function validateCompanyQualificationRecord(envelope, record, { envelopeSha256 } = {}) {
  const editionIds = validateEnvelope(envelope);
  exactKeys(record, ['candidate', 'format', 'reviews'], 'Company qualification record');
  if (record.format !== 'revealline-company-qualification.v1')
    fail('Unsupported company qualification record.');
  validateCandidate(envelope, record.candidate, envelopeSha256);
  if (!Array.isArray(record.reviews) || record.reviews.length > 500)
    fail('Company qualification accepts at most 500 bounded review entries.');
  const ids = new Set();
  for (const review of record.reviews) {
    validateReview(review, editionIds, envelope);
    if (ids.has(review.id)) fail('Qualification review IDs must be unique.');
    ids.add(review.id);
  }
  const coverage = [];
  for (const editionId of editionIds)
    for (const gate of COMPANY_QUALIFICATION_GATES) {
      const reviews = record.reviews.filter(
          (review) => review.gate === gate && review.editionIds.includes(editionId),
        ),
        passed = reviews.filter((review) => review.status === 'passed'),
        { missingScenarios } = selectCoherentCoverage(passed, gate);
      let status = 'pending';
      if (reviews.some((review) => review.status === 'failed')) status = 'failed';
      else if (missingScenarios.length === 0) status = 'passed';
      else if (reviews.length > 0 && reviews.every((review) => review.status === 'unavailable'))
        status = 'unavailable';
      coverage.push({
        editionId,
        gate,
        status,
        missingScenarios,
        reviewIds: reviews.map(({ id }) => id),
      });
    }
  const counts = Object.fromEntries(
    ['passed', 'pending', 'failed', 'unavailable'].map((status) => [
      status,
      coverage.filter((row) => row.status === status).length,
    ]),
  );
  return Object.freeze({
    format: 'revealline-company-qualification-coverage.v1',
    candidate: structuredClone(record.candidate),
    editions: editionIds.length,
    gatesPerEdition: COMPANY_QUALIFICATION_GATES.length,
    total: coverage.length,
    counts,
    ready: counts.passed === coverage.length,
    coverage,
  });
}

/** Convert complete observed coverage into the existing promotion review schema.
 * The evidence descriptor must point to the exact qualification-record bytes that
 * were validated. Incomplete evidence never produces a promotion review. */
export function compileCompanyQualificationReview(
  envelope,
  record,
  { envelopeSha256, evidence } = {},
) {
  const report = validateCompanyQualificationRecord(envelope, record, { envelopeSha256 });
  if (!report.ready)
    fail('Company qualification is incomplete; promotion review output was not created.');
  exactKeys(
    evidence,
    ['approved', 'bytes', 'path', 'publication', 'sha256'],
    'Qualification evidence',
  );
  if (
    !/^review-[a-z0-9][a-z0-9.-]*\.json$/.test(evidence.path) ||
    evidence.publication !== 'public' ||
    evidence.approved !== true ||
    !Number.isSafeInteger(evidence.bytes) ||
    evidence.bytes <= 0 ||
    evidence.bytes > 8_000_000 ||
    !SHA256.test(evidence.sha256)
  )
    fail('Promotion review needs the exact bounded public qualification evidence file.');
  return {
    format: 'revealline-edition-review.v1',
    version: envelope.version,
    sourceRevision: envelope.sourceRevision,
    sourceTree: envelope.sourceTree,
    envelopeSha256,
    publication: 'public',
    editions: envelope.editions.map(({ id }) => ({
      id,
      gates: COMPANY_QUALIFICATION_GATES.map((gate) => {
        const passed = record.reviews.filter(
            (review) =>
              review.status === 'passed' && review.gate === gate && review.editionIds.includes(id),
          ),
          contributing = selectCoherentCoverage(passed, gate).reviews,
          reviewer = [...new Set(contributing.map(({ reviewer }) => reviewer))].sort().join('; '),
          reviewedAt = contributing
            .map(({ reviewedAt }) => reviewedAt)
            .sort()
            .at(-1);
        if (!text(reviewer, 500) || !date(reviewedAt))
          fail('Complete coverage must retain its exact reviewer identity and review time.');
        return {
          id: gate,
          status: 'passed',
          reviewer,
          reviewedAt,
          evidence: structuredClone(evidence),
        };
      }),
    })),
  };
}
