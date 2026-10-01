import { boundedJSON, exactKeys, required, stableId } from '../data-json.mjs';

export const CAMPAIGN_FEEDBACK_FORMAT = 'revealline-campaign-feedback.v1';
// Original fixed synth phrases. These are presentation recipes, not schedules
// for simulation events; authoring cannot change their duration or gain.
export const VICTORY_MOTIFS = Object.freeze({
  'bright-return-v1': Object.freeze([0, 4, 7, 12, 7, 12]),
  'open-horizon-v1': Object.freeze([0, 5, 7, 12, 14, 12]),
  'shared-spark-v1': Object.freeze([0, 4, 9, 7, 12, 16]),
});
const checked = new WeakMap();
export function validateCampaignFeedback(input) {
  const value = boundedJSON(input, { maxBytes: 8192, maxNodes: 32, maxArray: 4, maxString: 240 });
  exactKeys(value, ['format', 'revision', 'lines', 'victoryMotif'], 'Campaign feedback');
  required(
    value.format === CAMPAIGN_FEEDBACK_FORMAT && stableId(value.revision),
    'Invalid campaign feedback format or revision.',
  );
  required(Object.hasOwn(VICTORY_MOTIFS, value.victoryMotif), 'Choose a registered victory motif.');
  exactKeys(value.lines, ['en', 'uk'], 'Campaign feedback languages');
  for (const locale of ['en', 'uk']) {
    const lines = value.lines[locale];
    required(
      Array.isArray(lines) &&
        lines.length > 0 &&
        lines.length <= 4 &&
        lines.every(
          (line) =>
            typeof line === 'string' &&
            line.trim().length > 0 &&
            line.length <= 240 &&
            !/[\u0000-\u001f\u007f-\u009f]/u.test(line),
        ),
      'Use one to four short result lines in each language.',
    );
    Object.freeze(lines);
  }
  required(
    value.lines.en.length === value.lines.uk.length,
    'Result translations must have matching variants.',
  );
  Object.freeze(value.lines);
  Object.freeze(value);
  checked.set(value, value);
  return value;
}
/** Context is supplied by the host's accepted current mission. Imported flags
 * never select an owner; this is a pure presentation projection, not evidence. */
export function acceptedCampaignFeedback(context) {
  if (
    !context ||
    context.owned !== true ||
    !['solo', 'versus', 'team'].includes(context.mode) ||
    !['won', ...(context.mode === 'versus' ? ['draw'] : [])].includes(context.outcome) ||
    typeof context.missionId !== 'string' ||
    !context.missionId ||
    context.missionId.length > 512 ||
    !context.feedback
  )
    return null;
  try {
    if (Object.isFrozen(context.feedback) && checked.has(context.feedback))
      return checked.get(context.feedback);
    const value = validateCampaignFeedback(context.feedback);
    if (
      Object.isFrozen(context.feedback) &&
      Object.isFrozen(context.feedback.lines) &&
      ['en', 'uk'].every((locale) => Object.isFrozen(context.feedback.lines[locale]))
    )
      checked.set(context.feedback, value);
    return value;
  } catch {
    return null;
  }
}
export function campaignResultLine(context, locale = 'en') {
  const value = acceptedCampaignFeedback(context);
  if (!value) return null;
  let variant = 0;
  for (const character of context.missionId)
    variant = (variant + character.codePointAt(0)) % value.lines.en.length;
  return {
    id: `campaign-feedback/${value.revision}/${variant}`,
    text: value.lines[locale === 'uk' ? 'uk' : 'en'][variant],
    name: '',
    speaker: 'campaign',
  };
}
export function campaignVictoryMotif(context) {
  const value = acceptedCampaignFeedback(context);
  return value ? VICTORY_MOTIFS[value.victoryMotif] : null;
}
