import { campaignResultLine } from './campaign-feedback.mjs';
/** Original, non-blocking personality copy. No simulated facts, gameplay rules,
 * scores, requests to keep playing, or rewards are derived from these captions. */
export const JOURNEY_REACTIONS = Object.freeze({
  guide: Object.freeze({
    name: 'Guide',
    lines: Object.freeze([
      'A new piece of the world, brought into view.',
      'That picture was waiting for a line like yours.',
    ]),
  }),
  engineer: Object.freeze({
    name: 'Engineer',
    lines: Object.freeze([
      'A fine route through a complicated place.',
      'I like what you built between those edges.',
    ]),
  }),
  rival: Object.freeze({
    name: 'Rival',
    lines: Object.freeze([
      'Two boards. Two ways to find a line.',
      'Different routes, one shared view.',
    ]),
  }),
  sentinel: Object.freeze({
    name: 'Sentinel',
    lines: Object.freeze(['The last signal is yours.', 'Beyond the crown, the picture remains.']),
  }),
});

/** Host-owned result context only. Never infer ownership from titles or URLs.
 * A finished race without a successful board is not a completion reaction. */
export function journeyResultReaction(context, locale = 'en') {
  if (
    !context ||
    context.owned !== true ||
    !['solo', 'versus', 'team'].includes(context.mode) ||
    !['won', 'draw'].includes(context.outcome) ||
    (context.outcome === 'draw' && context.mode !== 'versus') ||
    typeof context.missionId !== 'string' ||
    !context.missionId ||
    context.missionId.length > 512
  )
    return null;
  const authored = campaignResultLine(context, locale);
  if (authored) return Object.freeze(authored);
  const speaker =
    context.mode === 'versus'
      ? 'rival'
      : context.encounter === true
        ? 'sentinel'
        : context.mode === 'team' || context.relays === true
          ? 'engineer'
          : 'guide';
  const entry = JOURNEY_REACTIONS[speaker];
  // Stable across redraw, reload, retry and releases; no wall-clock/random choice.
  let variant = 0;
  for (const character of context.missionId)
    variant = (variant + character.codePointAt(0)) % entry.lines.length;
  return Object.freeze({
    id: `journey-reaction.v1/${speaker}/${variant}`,
    speaker,
    name: entry.name,
    text: entry.lines[variant],
  });
}
