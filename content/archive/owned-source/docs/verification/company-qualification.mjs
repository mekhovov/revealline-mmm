import {
  COMPANY_GATE_SCENARIOS,
  COMPANY_QUALIFICATION_GATES,
  createCompanyQualificationRecord,
  validateCompanyQualificationRecord,
} from './company-qualification-model.mjs';

const $ = (id) => document.getElementById(id);
const DEVICE_GATES = new Set([
  'accessibility',
  'installed-pwa-isolation',
  'update-and-rollback',
  'storage-and-backup-recovery',
  'same-device-performance',
]);
const PRIMARY_EDITIONS = new Set(['coupa-all', 'droneaid-nl-community']);
let envelope = null;
let envelopeSha256 = '';
let record = null;

const hex = (bytes) =>
  [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
const digest = async (bytes) => hex(await crypto.subtle.digest('SHA-256', bytes));
const parseFile = async (file) => {
  const bytes = await file.arrayBuffer();
  return { bytes, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
};
const setMessage = (message, error = false) => {
  $('binding').textContent = message;
  $('binding').style.borderColor = error ? '#ff8f91' : '#7fc8ff';
};
const chosen = (container) =>
  [...container.querySelectorAll('input[type=checkbox]:checked')].map(({ value }) => value);

function renderGate() {
  const gate = $('gate').value;
  $('scenarios').replaceChildren(
    ...COMPANY_GATE_SCENARIOS[gate].map((scenario) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = scenario;
      label.append(input, document.createTextNode(scenario));
      return label;
    }),
  );
  $('environment-fields').hidden = !DEVICE_GATES.has(gate);
  $('automation-fields').hidden = gate !== 'automated-validation';
}

function renderEditions() {
  $('editions').replaceChildren(
    ...envelope.editions.map(({ id }) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = id;
      label.append(input, document.createTextNode(id));
      return label;
    }),
  );
}

function renderCoverage() {
  if (!record) return;
  const report = validateCompanyQualificationRecord(envelope, record, { envelopeSha256 });
  $('coverage').textContent = report.ready
    ? `READY FOR PROMOTION REVIEW: ${report.counts.passed}/${report.total} edition gates have complete observed scenarios.`
    : `NOT READY: ${report.counts.passed}/${report.total} passed; ${report.counts.pending} pending; ${report.counts.failed} failed; ${report.counts.unavailable} unavailable.`;
  $('coverage').style.borderColor = report.ready ? '#b9ed5a' : '#ffcf70';
  $('coverage-body').replaceChildren(
    ...report.coverage.map((row) => {
      const tr = document.createElement('tr');
      for (const value of [
        row.editionId,
        row.gate,
        row.status,
        row.missingScenarios.join(', ') || '—',
      ]) {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      }
      return tr;
    }),
  );
  $('review-section').hidden = false;
  $('coverage-section').hidden = false;
}

async function loadEnvelope() {
  try {
    const file = $('envelope').files[0];
    if (!file) return;
    const parsed = await parseFile(file);
    envelope = parsed.value;
    envelopeSha256 = await digest(parsed.bytes);
    record = null;
    renderEditions();
    setMessage(
      `Envelope ${envelope.version ?? 'unknown'} · ${envelope.sourceRevision ?? 'unknown'} · SHA-256 ${envelopeSha256}`,
    );
    $('review-section').hidden = true;
    $('coverage-section').hidden = true;
  } catch (error) {
    envelope = null;
    record = null;
    setMessage(error.message, true);
  }
}

function startRecord() {
  try {
    if (!envelope) throw new TypeError('Choose the exact frozen envelope first.');
    record = createCompanyQualificationRecord(envelope, {
      envelopeSha256,
      sourceRevision: envelope.sourceRevision,
      sourceTree: envelope.sourceTree,
      version: envelope.version,
      artifact: {
        id: Number($('artifact-id').value),
        name: `company-candidate-${envelope.sourceRevision}`,
        bytes: Number($('artifact-bytes').value),
        sha256: $('artifact-sha').value.trim().toLowerCase(),
      },
    });
    renderCoverage();
    setMessage('Exact candidate bound. Add only observations made against these bytes.');
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function importRecord() {
  try {
    if (!envelope)
      throw new TypeError('Choose its exact frozen envelope before importing a record.');
    const file = $('record-file').files[0];
    if (!file) return;
    const parsed = await parseFile(file);
    validateCompanyQualificationRecord(envelope, parsed.value, { envelopeSha256 });
    record = parsed.value;
    const artifact = record.candidate.artifact;
    $('artifact-id').value = artifact.id;
    $('artifact-bytes').value = artifact.bytes;
    $('artifact-sha').value = artifact.sha256;
    renderCoverage();
    setMessage(`Imported ${record.reviews.length} exact-candidate review entries.`);
  } catch (error) {
    setMessage(error.message, true);
  }
}

function environmentFor(gate, status) {
  if (!DEVICE_GATES.has(gate) || status !== 'passed') return null;
  return {
    actualDevice: $('actual-device').checked,
    installedApp: $('installed-app').checked,
    emulated: $('emulated').checked,
    os: $('os').value.trim(),
    browser: $('browser').value.trim(),
    device: $('device').value.trim(),
    viewport: $('viewport').value.trim(),
    input: $('input').value.trim(),
    assistiveTechnology: $('assistive').value.trim(),
  };
}

function addReview() {
  try {
    if (!record) throw new TypeError('Bind an exact candidate before recording observations.');
    const gate = $('gate').value;
    const status = $('review-status').value;
    const scenarios = status === 'pending' ? [] : chosen($('scenarios'));
    const reviewedAt = $('reviewed-at').value ? new Date($('reviewed-at').value).toISOString() : '';
    const review = {
      id: `review-${crypto.randomUUID()}`,
      editionIds: chosen($('editions')),
      gate,
      status,
      reviewer: $('reviewer').value.trim(),
      reviewedAt,
      summary: $('summary').value.trim(),
      environment: environmentFor(gate, status),
      automation:
        gate === 'automated-validation' && status === 'passed'
          ? {
              conclusion: 'success',
              runUrl: $('run-url').value.trim(),
              sourceRevision: envelope.sourceRevision,
            }
          : null,
      observations: scenarios.map((scenario) => ({
        scenario,
        expected: $('expected').value.trim(),
        observed: $('observed').value.trim(),
        outcome: status === 'passed' ? 'passed' : status === 'failed' ? 'failed' : 'unavailable',
      })),
    };
    record.reviews.push(review);
    try {
      renderCoverage();
    } catch (error) {
      record.reviews.pop();
      throw error;
    }
    setMessage(`Recorded ${review.id}. The derived coverage remains authoritative.`);
  } catch (error) {
    setMessage(error.message, true);
  }
}

function exportRecord() {
  try {
    validateCompanyQualificationRecord(envelope, record, { envelopeSha256 });
    const blob = new Blob([`${JSON.stringify(record, null, 2)}\n`], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `review-company-qualification-${record.candidate.version}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  } catch (error) {
    setMessage(error.message, true);
  }
}

$('gate').replaceChildren(
  ...COMPANY_QUALIFICATION_GATES.map((gate) => {
    const option = document.createElement('option');
    option.value = option.textContent = gate;
    return option;
  }),
);
$('gate').addEventListener('change', renderGate);
$('envelope').addEventListener('change', loadEnvelope);
$('record-file').addEventListener('change', importRecord);
$('start').addEventListener('click', startRecord);
$('add').addEventListener('click', addReview);
$('export').addEventListener('click', exportRecord);
$('clear').addEventListener('click', () => {
  if (!record) return;
  record.reviews = [];
  renderCoverage();
});
$('primary').addEventListener('click', () => {
  for (const input of $('editions').querySelectorAll('input'))
    input.checked = PRIMARY_EDITIONS.has(input.value);
});
$('all').addEventListener('click', () => {
  for (const input of $('editions').querySelectorAll('input')) input.checked = true;
});
renderGate();
