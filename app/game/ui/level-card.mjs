const starCount = (value) => (value === null || value === undefined ? null : Number(value));

const SLOT_TAGS = Object.freeze({
  campaignHeading: 'span',
  meta: 'span',
  number: 'span',
  position: 'span',
  title: 'strong',
  campaign: 'span',
  progressGroup: 'span',
  progress: 'span',
  stars: 'span',
  status: 'span',
  preview: 'span',
  check: 'span',
});

const classNames = (...values) => values.filter(Boolean).join(' ');

/**
 * Creates the common semantic card skeleton used by the mission library and
 * company journeys. Host class aliases keep their layouts brandable without
 * allowing either host to drift into a different information hierarchy.
 */
export function createLevelCardView({ document, className = '', classes = {} }) {
  if (!document?.createElement) throw new TypeError('A document is required for a level card.');
  const element = (slot) => {
    const result = document.createElement(SLOT_TAGS[slot]);
    result.className = classNames(
      `level-card-${slot.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      classes[slot],
    );
    return result;
  };
  const button = document.createElement('button');
  button.type = 'button';
  button.className = classNames('level-card', className);
  const view = Object.fromEntries(Object.keys(SLOT_TAGS).map((slot) => [slot, element(slot)]));
  view.campaignHeading.setAttribute('role', 'heading');
  view.campaignHeading.setAttribute('aria-level', '3');
  view.preview.setAttribute('aria-hidden', 'true');
  view.check.setAttribute('aria-hidden', 'true');
  view.check.textContent = '✓';
  view.meta.append(view.number, view.position);
  view.progressGroup.append(view.progress, view.stars);
  button.append(
    view.campaignHeading,
    view.meta,
    view.title,
    view.campaign,
    view.progressGroup,
    view.status,
    view.preview,
    view.check,
  );
  return Object.freeze({ button, ...view });
}

/** Shared, presentation-only level-card state for the core and company hosts. */
export function levelCardPresentation({
  globalLevelNumber = null,
  campaignLevelNumber,
  campaignLevelCount,
  collection = 'Journey',
  progressState = { state: 'new', bestStars: null },
}) {
  if (
    !(
      globalLevelNumber === null ||
      (Number.isSafeInteger(globalLevelNumber) && globalLevelNumber > 0)
    ) ||
    !Number.isSafeInteger(campaignLevelNumber) ||
    campaignLevelNumber < 1 ||
    !Number.isSafeInteger(campaignLevelCount) ||
    campaignLevelCount < campaignLevelNumber
  )
    throw new TypeError('Level-card numbering is invalid.');
  const bestStars = starCount(progressState.bestStars);
  if (
    !['new', 'skipped', 'completed'].includes(progressState.state) ||
    !(bestStars === null || [1, 2, 3].includes(bestStars))
  )
    throw new TypeError('Level-card progress is invalid.');
  return Object.freeze({
    globalLevelNumber,
    globalLabel: globalLevelNumber === null ? collection : `#${globalLevelNumber}`,
    campaignLabel: `${campaignLevelNumber}/${campaignLevelCount}`,
    completed: progressState.state === 'completed',
    progressState: progressState.state,
    bestStars,
    stars: bestStars === null ? '☆☆☆' : `${'★'.repeat(bestStars)}${'☆'.repeat(3 - bestStars)}`,
  });
}

/** Applies host-independent visual state without replacing the card node. */
export function applyLevelCardPresentation(view, presentation) {
  if (!view?.button || !view.stars) throw new TypeError('A level-card view is required.');
  view.button.dataset.completionState = presentation.progressState;
  view.button.dataset.bestStars =
    presentation.bestStars === null ? '' : String(presentation.bestStars);
  view.button.dataset.levelNumber =
    presentation.globalLevelNumber === null ? '' : String(presentation.globalLevelNumber);
  view.stars.textContent = presentation.stars;
  return view;
}
