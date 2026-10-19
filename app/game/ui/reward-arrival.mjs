// Keep the final capture in its original place before enlarging the reward.
// Reduced motion removes movement, never this time to appreciate the result.
export const REWARD_BOARD_SECONDS = 2.4;
export const REWARD_STORY_SECONDS = 3.8;
export const REWARD_TRANSITION_MS = 650;
// Let the completely uncovered picture breathe after the burst, then give the
// player enough time to read the result before the next mission begins.
export const REWARD_SETTLED_SECONDS = 1.2;
export const RESULT_AUTO_ADVANCE_SECONDS = 4;

export function advanceRewardAge(age, seconds, paused = false) {
  return paused ? age : age + Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, 0.1));
}

export function animateRewardArrival(element, from, reduced = false) {
  if (reduced || !element?.animate || !from?.width || !from?.height) return;
  const to = element.getBoundingClientRect();
  if (!to.width || !to.height) return;
  const ratio = (element.naturalWidth || element.width) / (element.naturalHeight || element.height);
  const fitWidth =
    Number.isFinite(ratio) && ratio > 0 ? Math.min(to.width, to.height * ratio) : to.width;
  const fitHeight = Number.isFinite(ratio) && ratio > 0 ? fitWidth / ratio : to.height;
  const scale = Math.min(from.width / fitWidth, from.height / fitHeight);
  const x = from.left + from.width / 2 - (to.left + to.width / 2);
  const y = from.top + from.height / 2 - (to.top + to.height / 2);
  return element.animate(
    [
      { transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: 0.8 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    ],
    { duration: REWARD_TRANSITION_MS, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  );
}
