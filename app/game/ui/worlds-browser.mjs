import { t } from '../i18n/index.mjs';
import { required } from '../data-json.mjs';

export const WORLD_THEMES = Object.freeze([
  ['fpv', 'FPV Front'],
  ['ukraine', 'Ukraine Atlas'],
  ['retro', '1994 Forever'],
  ['coupa', 'Spend Network'],
]);
const legacyModes = new Map([
  ['original-fpv-pressure', 'Arcade'],
  ['original-ukraine-atlas', 'Arcade'],
  ['original-retro-1994', 'Arcade'],
  ['original-spend-network', 'Arcade'],
  ['fpv-route-choices', 'Tactical'],
]);
export const legacyWorldMode = (id) => legacyModes.get(id) ?? 'Other';
export function installedWorldMode(pack) {
  const levels = pack.campaigns?.flatMap((campaign) => campaign.levels) ?? [];
  if (!levels.length) return 'Other';
  if (levels.every((level) => level.classic?.arcadeActions?.version === 'arcade-actions.v1'))
    return 'Arcade';
  if (levels.every((level) => !level.classic?.arcadeActions)) return 'Tactical';
  return 'Other';
}

/** View-only projection. It never resolves owners, starts work or persists state. */
export function browseWorlds(
  entries,
  { theme = '', mode = '', page = 0, size = 4, pinned = null } = {},
) {
  required(Array.isArray(entries) && entries.length <= 60, t('interface:tooManyWorldChoices'));
  required([2, 4].includes(size), t('interface:worldPagesContainTwoOrFourCards'));
  required(Number.isSafeInteger(page) && page >= 0, t('interface:invalidWorldPage'));
  required(
    typeof theme === 'string' && ['', 'Arcade', 'Tactical', 'Other'].includes(mode),
    t('interface:invalidWorldFilter'),
  );
  const keys = new Set();
  for (const entry of entries) {
    required(
      typeof entry.key === 'string' && !keys.has(entry.key),
      t('interface:duplicateWorldChoice'),
    );
    keys.add(entry.key);
  }
  const held = entries.find((entry) => entry.key === pinned);
  const filtered = entries.filter(
    (entry) =>
      (!theme || entry.themeId === theme || entry.themeIds?.includes(theme)) &&
      (!mode || entry.mode === mode),
  );
  const remaining = filtered.filter((entry) => entry !== held);
  const slots = size - (held ? 1 : 0);
  const pages = Math.max(1, Math.ceil(remaining.length / slots));
  const current = Math.min(page, pages - 1);
  return Object.freeze({
    page: current,
    pages,
    total: filtered.length,
    pinned: held?.key ?? null,
    visible: Object.freeze([
      ...(held ? [held.key] : []),
      ...remaining.slice(current * slots, (current + 1) * slots).map((entry) => entry.key),
    ]),
  });
}
