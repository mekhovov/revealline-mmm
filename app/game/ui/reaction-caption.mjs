import { REACTION_PORTRAITS } from '../journey/reaction-portraits.mjs';

// Historical result adapters retain their accepted-result authority. Contextual
// audio can share the result without becoming a second DOM presentation owner.
const resultOwners = new WeakSet();
export function claimJourneyReactionCaption(node) {
  resultOwners.add(node);
  return () => resultOwners.delete(node);
}
export const journeyOwnsReactionCaption = (node) => resultOwners.has(node);

export function reactionCaptionText(line, locale = 'en') {
  if (!line) return '';
  const player = locale === 'uk' ? 'Гравець' : 'Player';
  const board = Number.isInteger(line.board) ? `${player} ${line.board + 1}` : '';
  const contributor = Number.isInteger(line.player) ? `${player} ${line.player + 1}` : '';
  const identity = [line.name, board, contributor && contributor !== board ? contributor : '']
    .filter(Boolean)
    .join(' · ');
  return `${identity ? `${identity} — ` : ''}${line.text}`;
}

export function renderResultReactionCaption(node, line, options, enabled, locale = 'en') {
  node.classList.add('reaction-result-caption');
  node.hidden = !enabled || !options.subtitles || !line;
  const text = reactionCaptionText(line, locale);
  if (node.textContent !== text) node.textContent = text;
  // Result surfaces also have legacy footnote rules; the explicit caption
  // preference takes precedence without exposing a hidden parent surface.
  node.style.display = node.hidden ? 'none' : 'block';
  node.style.fontSize = `${options.scale}rem`;
  node.style.lineHeight = '1.45';
  node.style.color = 'var(--fk-text, #f1f5fa)';
  node.style.background = options.background ? 'var(--fk-panel, #172126)' : 'transparent';
  node.style.setProperty('--reaction-caption-size', `${options.scale}rem`);
  node.dataset.reactionBackground = String(options.background);
  if (line?.speaker) {
    node.dataset.reactionSpeaker = line.speaker;
    node.style.setProperty(
      '--reaction-portrait',
      `url("${(REACTION_PORTRAITS[line.speaker] ?? REACTION_PORTRAITS.guide).idle}")`,
    );
  } else {
    delete node.dataset.reactionSpeaker;
    node.style.removeProperty('--reaction-portrait');
  }
}
