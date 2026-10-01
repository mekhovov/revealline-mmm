import {
  createLearningAttempt,
  reduceLearningAttempt,
  validateCompanyLesson,
  verifyLearningAttempt,
} from './learning.mjs';
import { getLocale, onLocaleChange, t } from '../i18n/index.mjs';
import { localizeCompanyLesson, localizeLearningFeedback } from './lesson-localization.mjs';

let sequence = 0;

/** Host opens this only at a safe, paused boundary. No core state is changed. */
export function mountCompanyWorkbench(
  container,
  {
    lesson: input,
    attempt: initial,
    onChange = () => {},
    onClose = () => {},
    anchor = null,
    evidence = null,
  },
) {
  const lesson = validateCompanyLesson(input);
  const tr = (key, values) => t('interface:learningWorkbench.' + key, values);
  const checked = verifyLearningAttempt(lesson, initial ?? createLearningAttempt(lesson));
  if (!checked.valid) throw new TypeError(checked.reason);
  const document = container.ownerDocument;
  const prefix = `company-workbench-${++sequence}`;
  let attempt = checked.attempt;
  let active = true;
  let root;
  const pinned = attempt.simulationIdentity !== null;
  const currentEvidence = () => (typeof evidence === 'function' ? evidence() : evidence);
  const element = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  };
  const button = (label, control, handler) => {
    const node = element('button', 'company-workbench-button', label);
    node.type = 'button';
    node.setAttribute('data-control', control);
    node.addEventListener('click', handler);
    return node;
  };
  function apply(action) {
    if (!active) return;
    const facts = pinned ? currentEvidence() : null;
    if (
      pinned &&
      (!facts?.boundary ||
        (action.type === 'inspect' && !facts.availableRecordIds.includes(action.recordId)))
    )
      return;
    const boundary = pinned ? facts.boundary : typeof anchor === 'function' ? anchor() : anchor;
    attempt = reduceLearningAttempt(lesson, attempt, { ...action, anchor: boundary });
    render();
    if (action.type === 'commit') root.querySelector('[data-feedback]')?.focus();
    onChange(attempt);
  }
  function render() {
    const copy = localizeCompanyLesson(lesson, getLocale());
    const facts = pinned ? currentEvidence() : null;
    const safe = !pinned || !!facts?.boundary;
    const focused = root?.contains(document.activeElement)
      ? document.activeElement?.dataset?.control
      : null;
    const feedbackFocused = root?.querySelector('[data-feedback]') === document.activeElement;
    root = element('section', 'company-workbench');
    root.dataset.lessonId = lesson.id;
    root.setAttribute('aria-labelledby', `${prefix}-title`);
    const title = element('h2', 'company-workbench-title', copy.title);
    title.id = `${prefix}-title`;
    root.append(
      title,
      element(
        'p',
        'company-workbench-role',
        `${copy.role} · ${tr(lesson.kind === 'reflection' ? 'reflection' : 'practice')}`,
      ),
      element('p', 'company-workbench-brief', copy.brief),
      element('p', 'company-workbench-notice', copy.notice),
    );
    const evidenceSection = element('section', 'company-workbench-evidence');
    evidenceSection.append(element('h3', null, tr('inspect')));
    if (pinned)
      evidenceSection.append(
        element(
          'p',
          'company-workbench-evidence-status',
          safe
            ? tr('evidence', {
                count: facts.availableRecordIds.length,
                total: lesson.records.length,
              })
            : tr('safeGround'),
        ),
      );
    for (const record of copy.records) {
      const card = element('article', 'company-workbench-record');
      const available = !pinned || facts?.availableRecordIds.includes(record.id);
      const inspected = attempt.inspected.includes(record.id);
      const inspect = button(
        !available
          ? tr('recover', { title: record.title })
          : inspected
            ? tr('inspected', { title: record.title })
            : tr('inspectRecord', { title: record.title }),
        `inspect-${record.id}`,
        () => {
          if (!inspected) apply({ type: 'inspect', recordId: record.id });
        },
      );
      inspect.disabled = attempt.status === 'complete' || !available || !safe;
      inspect.setAttribute('aria-expanded', String(inspected && available));
      card.append(inspect);
      if (inspected && available)
        for (const line of record.lines) card.append(element('p', null, line));
      evidenceSection.append(card);
    }
    root.append(evidenceSection);
    const configure = element('fieldset', 'company-workbench-configuration');
    configure.append(element('legend', null, tr('configure')));
    configure.disabled = attempt.status === 'complete' || !safe;
    for (const field of copy.fields) {
      const row = element('div', 'company-workbench-field');
      const label = element('label', null, field.label);
      label.htmlFor = `${prefix}-${field.id}`;
      const select = element('select', 'company-workbench-select');
      select.required = true;
      select.id = label.htmlFor;
      select.setAttribute('data-control', `field-${field.id}`);
      const placeholder = element('option', null, tr('choose'));
      placeholder.value = '';
      placeholder.disabled = true;
      select.append(placeholder);
      for (const option of field.options) {
        const item = element('option', null, option.label);
        item.value = option.value;
        select.append(item);
      }
      select.value = attempt.configuration[field.id] ?? '';
      select.addEventListener('change', () =>
        apply({ type: 'configure', fieldId: field.id, value: select.value }),
      );
      row.append(label, select);
      configure.append(row);
    }
    root.append(configure);
    const feedback = element('div', 'company-workbench-feedback');
    feedback.setAttribute('data-feedback', '');
    feedback.setAttribute('tabindex', '-1');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    for (const line of localizeLearningFeedback(lesson, attempt, getLocale(), tr))
      feedback.append(element('p', null, line));
    root.append(feedback);
    const controls = element('div', 'company-workbench-controls');
    const commit = button(tr(attempt.status === 'complete' ? 'complete' : 'commit'), 'commit', () =>
      apply({ type: 'commit' }),
    );
    if (attempt.status === 'complete' && lesson.kind === 'reflection')
      commit.textContent = tr('reflectionSaved');
    commit.disabled = attempt.status === 'complete' || !safe;
    controls.append(
      commit,
      button(tr('return'), 'close', () => {
        if (active) onClose(attempt);
      }),
    );
    root.append(controls);
    const references = element('details', 'company-workbench-sources');
    references.append(
      element('summary', null, tr('sources', { date: lesson.sourceReviewedAt })),
      element('p', null, tr('sourceNote')),
    );
    for (const source of lesson.sources) {
      const row = element('p');
      const link = element('a', null, source.title);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      row.append(link);
      references.append(row);
    }
    root.append(references);
    container.replaceChildren(root);
    if (feedbackFocused) root.querySelector('[data-feedback]')?.focus();
    else if (focused) {
      const control = root.querySelector(`[data-control="${focused}"]`);
      if (!control?.disabled) control?.focus();
      else root.querySelector('[data-control="close"]')?.focus();
    }
  }
  render();
  const stopLocale = onLocaleChange(() => {
    if (active) render();
  });
  return Object.freeze({
    getAttempt: () => attempt,
    destroy() {
      active = false;
      stopLocale();
      root.remove();
    },
  });
}
