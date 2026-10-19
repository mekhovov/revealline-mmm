// Authoring choices only. Nothing here reads or changes a live simulation.
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const ENEMY_THEMES = freeze(['fpv', 'ukraine', 'retro', 'coupa']);
export const ENEMY_STYLES = freeze(['microtile', 'hybrid', 'props']);
export const ENEMY_CATALOG = freeze([
  {
    type: 'bouncer',
    role: 'enemy',
    badge: 'diamond',
    label: 'Field hunter',
    domain: 'Hidden field',
    risk: 'Touches the player or unfinished line; its territory is retained during a capture.',
    motion: 'Reflects through the hidden field.',
    forms: ['Tracked tank', 'Embroidered beetle', 'Arcade invader', 'Stray invoice'],
  },
  {
    type: 'border-patrol',
    role: 'patrol',
    badge: 'frame',
    label: 'Border guard',
    domain: 'Outer border',
    risk: 'The outer safe border is not a shelter from this guard.',
    motion: 'Circles the original outer perimeter.',
    forms: ['Four-rotor patrol', 'Swift moth', 'Comet shuttle', 'Delivery parcel'],
  },
  {
    type: 'contour-patrol',
    role: 'contour',
    badge: 'corner',
    label: 'Contour crawler',
    domain: 'Claimed frontier',
    risk: 'Follows newly captured contours and can reach the player on secured ground.',
    motion: 'Follows the field/safe frontier; visibly rejoins after its route changes.',
    forms: ['Twin-rotor scout', 'Coiled serpent', 'Magnetic crawler', 'Audit cursor'],
  },
  {
    type: 'claimed-rover',
    role: 'rover',
    badge: 'feet',
    label: 'Ground rover',
    domain: 'Claimed ground',
    risk: 'Starts dormant; warns before waking when fully supported by claimed ground.',
    motion: 'Moves only through secured ground after activation.',
    forms: ['Wheeled patrol', 'Clockwork hare', 'Walking cabinet', 'Expense cart'],
  },
  {
    type: 'eroder',
    role: 'eroder',
    badge: 'bite',
    label: 'Territory eroder',
    domain: 'Hidden field / frontier',
    risk: 'Warns before reopening eligible captured cells; protected anchors stay intact.',
    motion: 'Reflects through the field and probes eligible secured edges.',
    forms: ['Ground auger', 'Thorn wheel', 'Saw disc', 'Budget shredder'],
  },
  {
    type: 'lane-boss',
    role: 'boss',
    badge: 'lane',
    label: 'Lane emitter',
    domain: 'Authored attack lane',
    risk: 'Telegraphs a timed lane attack. Cross during an opening.',
    motion: 'Stationary emitter; its lane timing is authored.',
    forms: ['Radar emitter', 'Storm gate', 'Laser pylon', 'Approval gate'],
  },
  {
    type: 'relay-sentinel',
    role: 'boss',
    badge: 'lock',
    label: 'Relay sentinel',
    domain: 'Staged encounter',
    risk: 'Requires its linked relay objective and a legitimate opening before release.',
    motion: 'Stationary linked core; encounter stages control its openings.',
    forms: ['Shielded relay', 'Sunflower keep', 'Core fortress', 'Policy vault'],
  },
]);
const records = new Map(ENEMY_CATALOG.map((record) => [record.type, record]));
export function enemyCatalogRecord(type) {
  return records.get(type) ?? null;
}
export function enemySkinId(type, theme) {
  if (!records.has(type) || !ENEMY_THEMES.includes(theme))
    throw new TypeError('Unknown enemy skin.');
  return `${type}.${theme}.v1`;
}
export function resolveEnemySkin(type, skinId) {
  if (!records.has(type) || typeof skinId !== 'string') return null;
  return ENEMY_THEMES.find((theme) => skinId === enemySkinId(type, theme)) ?? null;
}
export function emptyEnemyCatalogDraft(theme = 'fpv', style = 'hybrid') {
  return validateEnemyCatalogDraft({
    version: 'enemy-catalog-draft.v1',
    theme,
    style,
    entries: ENEMY_CATALOG.map(({ type }) => ({
      type,
      enabled: true,
      skinId: enemySkinId(type, theme),
    })),
  });
}
function data(value, keys) {
  if (
    !value ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length
  )
    throw new TypeError('Catalog choices must be plain data.');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(descriptors).length !== keys.length ||
    keys.some((key) => !descriptors[key] || !Object.hasOwn(descriptors[key], 'value'))
  )
    throw new TypeError('Unexpected catalog fields.');
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
}
export function validateEnemyCatalogDraft(input) {
  const draft = data(input, ['version', 'theme', 'style', 'entries']);
  if (
    draft.version !== 'enemy-catalog-draft.v1' ||
    !ENEMY_THEMES.includes(draft.theme) ||
    !ENEMY_STYLES.includes(draft.style) ||
    !Array.isArray(draft.entries) ||
    draft.entries.length !== ENEMY_CATALOG.length
  )
    throw new TypeError('Invalid enemy catalog draft.');
  const seen = new Set();
  draft.entries = ENEMY_CATALOG.map((_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(draft.entries, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value'))
      throw new TypeError('Catalog entries must be dense data.');
    const entry = data(descriptor.value, ['type', 'enabled', 'skinId']);
    if (
      !records.has(entry.type) ||
      seen.has(entry.type) ||
      typeof entry.enabled !== 'boolean' ||
      !resolveEnemySkin(entry.type, entry.skinId)
    )
      throw new TypeError('Invalid or duplicate enemy choice.');
    seen.add(entry.type);
    return entry;
  });
  return freeze(draft);
}
/** A generator consumes allowedTypes; a renderer consumes skins. Neither changes an existing level. */
export function enemyCatalogSelection(input) {
  const draft = validateEnemyCatalogDraft(input);
  return freeze({
    allowedTypes: draft.entries.filter((entry) => entry.enabled).map((entry) => entry.type),
    actorSkins: Object.fromEntries(draft.entries.map((entry) => [entry.type, entry.skinId])),
    style: draft.style,
  });
}
