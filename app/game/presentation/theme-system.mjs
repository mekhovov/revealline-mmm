import {
  boundedJSON,
  canonicalJSON,
  exactKeys,
  required,
  dataIdentity,
  stableId,
} from '../data-json.mjs';

const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const idPattern = /^[a-z][a-z0-9-]{0,63}$/;
const colorPattern = /^#[0-9a-f]{6}$/i;
export const THEME_TOKEN_NAMES = freeze([
  'ink',
  'panel',
  'panelRaised',
  'text',
  'muted',
  'line',
  'controlLine',
  'accent',
  'amber',
  'hazard',
  'safe',
]);
export const PAIRED_THEME_TOKEN_NAMES = freeze([
  'onAccent',
  'selection',
  'onSelection',
  'input',
  'inputText',
  'link',
  'focus',
  'onHazard',
  'onSafe',
]);
export const COMPONENT_ROLES = freeze([
  'panel',
  'dialog',
  'toolbar',
  'button',
  'input',
  'tab',
  'slot',
  'tooltip',
  'progress',
  'hud',
  'table',
  'inspector',
  'checkbox',
  'radio',
  'slider',
  'scrollbar',
  'notification',
  'primary',
  'danger',
]);
export const SEMANTIC_CUES = freeze({
  selected: { symbol: '✓', label: 'Selected', shape: 'check' },
  blocked: { symbol: '—', label: 'Unavailable', shape: 'bar' },
  warning: { symbol: '!', label: 'Warning', shape: 'triangle' },
  error: { symbol: '×', label: 'Error', shape: 'cross' },
  objective: { symbol: '◇', label: 'Active objective', shape: 'diamond' },
  complete: { symbol: '✓', label: 'Completed', shape: 'check' },
  orientation: { symbol: '↑', label: 'Front', shape: 'chevron' },
});

const baseTokens = {
  ink: '#070914',
  panel: '#11152b',
  panelRaised: '#1a2040',
  text: '#f7f4ff',
  muted: '#b9bed6',
  line: '#66709b',
  controlLine: '#7ee7ff',
  accent: '#7ee7ff',
  amber: '#ffcf5a',
  hazard: '#ff718e',
  safe: '#a7d9b4',
};
const industrialTokens = {
  ink: '#171b19',
  panel: '#292e29',
  panelRaised: '#393f36',
  text: '#f0e9d7',
  muted: '#bdc3b2',
  line: '#737c69',
  controlLine: '#d9b665',
  accent: '#ebc879',
  amber: '#ebc879',
  hazard: '#ff9987',
  safe: '#bed7a4',
};
const fonts = {
  ui: "'Field Kit UI', 'Exo 2', sans-serif",
  mono: "'Field Kit Mono', 'IBM Plex Mono', monospace",
  display: "'Field Kit Display', 'Handjet', sans-serif",
};
const theme = (id, name, tokens, texture = true, fixture = false) => ({
  format: 'InterfaceTheme.v1',
  id,
  revision: 'r1',
  name,
  tokens,
  fonts: id === 'dos' ? { ui: fonts.mono, mono: fonts.mono, display: fonts.mono } : { ...fonts },
  texture,
  surface: id === 'dos' ? 'flat' : 'bevel',
  fixture,
  provenance: {
    author: 'RevealLine',
    license: 'project-original',
    source: 'procedural-materials-v1',
  },
});
const RETAINED_INTERFACE_THEMES = freeze([
  theme('legacy', 'Existing appearance', baseTokens, false),
  theme('industrial-workshop', 'Industrial Workshop', industrialTokens),
  theme(
    'windows-classic',
    'Windows Classic specimen',
    {
      ink: '#c0c0c0',
      panel: '#c0c0c0',
      panelRaised: '#dedede',
      text: '#121212',
      muted: '#424242',
      line: '#656565',
      controlLine: '#000080',
      accent: '#000080',
      amber: '#654000',
      hazard: '#8e1010',
      safe: '#17551d',
    },
    false,
    true,
  ),
  theme(
    'dos',
    'DOS specimen',
    {
      ink: '#000020',
      panel: '#000040',
      panelRaised: '#000060',
      text: '#ffffff',
      muted: '#cccccc',
      line: '#bbbbbb',
      controlLine: '#ffff55',
      accent: '#ffff55',
      amber: '#ffff55',
      hazard: '#ffaaaa',
      safe: '#aaffaa',
    },
    false,
    true,
  ),
]);
const RETAINED_THEME_FAMILIES = freeze([
  {
    format: 'ThemeFamily.v1',
    id: 'legacy',
    revision: 'r1',
    name: 'Existing appearance',
    interface: { id: 'legacy', revision: 'r1' },
    arcade: null,
    sim: null,
  },
  {
    format: 'ThemeFamily.v1',
    id: 'industrial-workshop',
    revision: 'r1',
    name: 'Industrial Workshop',
    interface: { id: 'industrial-workshop', revision: 'r1' },
    arcade: { id: 'industrial-workshop', revision: 'r1' },
    sim: { id: 'industrial-workshop', revision: 'r1' },
  },
  {
    format: 'ThemeFamily.v1',
    id: 'vyshyvanka',
    revision: 'r1',
    name: 'Vyshyvanka',
    interface: { id: 'vyshyvanka', revision: 'r1' },
    arcade: { id: 'vyshyvanka', revision: 'r1' },
    sim: { id: 'vyshyvanka', revision: 'r1' },
  },
]);
// Source palettes are adapted into explicit semantic pairs; ANSI slots are never game roles.
export const derivePairedThemeTokens = (tokens) => {
  const on = (background) =>
    contrastRatio('#ffffff', background) > contrastRatio('#17191b', background)
      ? '#ffffff'
      : '#17191b';
  return {
    ...tokens,
    onAccent: on(tokens.accent),
    selection: tokens.accent,
    onSelection: on(tokens.accent),
    input: tokens.ink,
    inputText: tokens.text,
    link: ['ink', 'panel', 'panelRaised'].every(
      (surface) => contrastRatio(tokens.accent, tokens[surface]) >= 4.5,
    )
      ? tokens.accent
      : tokens.text,
    focus: tokens.controlLine,
    onHazard: on(tokens.hazard),
    onSafe: on(tokens.safe),
  };
};
const productionTheme = (
  id,
  name,
  colors,
  {
    texture = true,
    surface = 'bevel',
    revision = 'r1',
    source = 'original-materials-v2',
    focus,
  } = {},
) => ({
  ...theme(id, name, { ...derivePairedThemeTokens(colors), ...(focus ? { focus } : {}) }, texture),
  format: 'InterfaceTheme.v2',
  revision,
  surface,
  materialStyle: {
    'industrial-workshop': 'steel',
    vyshyvanka: 'linen',
    'dnipro-porcelain': 'porcelain',
    tryzub: 'brass',
    'windows-classic': 'classic',
    dos: 'terminal',
    'orchard-workshop': 'wood',
    'neon-ruins': 'composite',
    'pocket-lcd': 'lcd',
    'copper-observatory': 'copper',
    'sakura-station': 'sakura',
    'obsidian-reliquary': 'brass',
    'deep-space': 'composite',
    'moonlit-grove': 'wood',
    'ember-foundry': 'steel',
    'polar-relay': 'steel',
    'military-field': 'steel',
  }[id],
  provenance: { author: 'RevealLine', license: 'project-original', source },
});
const ukrainianSource = (name) =>
  `swarmshared/da1c1f3c4b985ead2b8d306c9d883cb0dbcd1521/themes/palettes/${name}.json; original game adaptation`;
const RETAINED_PRODUCTION_INTERFACE_THEMES = freeze([
  { ...RETAINED_INTERFACE_THEMES[0], revision: 'r2', name: 'Classic Field Kit' },
  productionTheme(
    'industrial-workshop',
    'Industrial Workshop',
    {
      ink: '#17191b',
      panel: '#272b2e',
      panelRaised: '#363c40',
      text: '#f3eddd',
      muted: '#c4c1b6',
      line: '#50585d',
      controlLine: '#8f989c',
      accent: '#e6b85c',
      amber: '#e6b85c',
      hazard: '#ff9987',
      safe: '#bed7a4',
    },
    { revision: 'r2' },
  ),
  productionTheme(
    'vyshyvanka',
    'Vyshyvanka',
    {
      ink: '#0f0f12',
      panel: '#1a1a20',
      panelRaised: '#2a2a35',
      text: '#e0dcd0',
      muted: '#b8b4a8',
      line: '#5d4a4a',
      controlLine: '#cfac9d',
      accent: '#f48686',
      amber: '#ecc17a',
      hazard: '#ffb099',
      safe: '#b8d69c',
    },
    { source: ukrainianSource('vyshyvanka') },
  ),
]);
export const BUILTIN_INTERFACE_THEMES = freeze([
  { ...RETAINED_PRODUCTION_INTERFACE_THEMES[0], revision: 'r3', name: 'Signal Blue' },
  { ...RETAINED_PRODUCTION_INTERFACE_THEMES[1], revision: 'r3', name: 'Flight Deck' },
  productionTheme('military-field', 'Military Field', {
    ink: '#121811',
    panel: '#232c20',
    panelRaised: '#343f2d',
    text: '#f0efdc',
    muted: '#bbc5ad',
    line: '#58664c',
    controlLine: '#a9b992',
    accent: '#e5ca85',
    amber: '#e5ca85',
    hazard: '#ff9c86',
    safe: '#b1d5a5',
  }),
  productionTheme('ember-foundry', 'Ember Foundry', {
    ink: '#171311',
    panel: '#2b2420',
    panelRaised: '#3b312a',
    text: '#f8ecd9',
    muted: '#cebeac',
    line: '#625045',
    controlLine: '#ae9180',
    accent: '#f0a266',
    amber: '#edc377',
    hazard: '#ffa18e',
    safe: '#b4cda0',
  }),
  productionTheme('polar-relay', 'Polar Relay', {
    ink: '#10191e',
    panel: '#202e36',
    panelRaised: '#2e414c',
    text: '#eaf2ee',
    muted: '#b9ced6',
    line: '#536d7a',
    controlLine: '#92b2c0',
    accent: '#91d5e3',
    amber: '#efc07a',
    hazard: '#ffa595',
    safe: '#b4d8bf',
  }),
  productionTheme(
    'vyshyvanka',
    'Vyshyvanka',
    {
      ink: '#08090a',
      panel: '#121314',
      panelRaised: '#1c1d1e',
      text: '#f3eade',
      muted: '#c5b9ae',
      line: '#54413d',
      controlLine: '#867671',
      accent: '#d3222a',
      amber: '#deb363',
      hazard: '#ff9c7e',
      safe: '#aac989',
    },
    {
      revision: 'r2',
      focus: '#d3222a',
      source: 'Original red-thread/near-black game adaptation; geometric textile motifs only',
    },
  ),
  productionTheme(
    'dnipro-porcelain',
    'Dnipro Porcelain',
    {
      ink: '#f3f7fb',
      panel: '#e8f0f7',
      panelRaised: '#ffffff',
      text: '#122040',
      muted: '#425774',
      line: '#b2c6d5',
      controlLine: '#5c7695',
      accent: '#0057b7',
      amber: '#76500b',
      hazard: '#9c2929',
      safe: '#235b39',
    },
    { source: ukrainianSource('dnipro') },
  ),
  productionTheme(
    'tryzub',
    'Tryzub',
    {
      ink: '#0a1628',
      panel: '#122040',
      panelRaised: '#1a3060',
      text: '#e8e4d8',
      muted: '#c0bca8',
      line: '#46577a',
      controlLine: '#b6a66d',
      accent: '#f0c040',
      amber: '#f8d870',
      hazard: '#ffb099',
      safe: '#bed7a4',
    },
    { source: ukrainianSource('tryzub') },
  ),
  productionTheme(
    'windows-classic',
    'Desktop 98',
    {
      ink: '#008888',
      panel: '#c0c0c0',
      panelRaised: '#dedede',
      text: '#000000',
      muted: '#282828',
      line: '#808080',
      controlLine: '#000080',
      accent: '#000080',
      amber: '#654000',
      hazard: '#8e1010',
      safe: '#17551d',
    },
    { texture: false, revision: 'r2' },
  ),
  productionTheme(
    'dos',
    'DOS Navigator',
    {
      ink: '#000020',
      panel: '#000040',
      panelRaised: '#000060',
      text: '#ffffff',
      muted: '#cccccc',
      line: '#7777aa',
      controlLine: '#ffff55',
      accent: '#ffff55',
      amber: '#ffff55',
      hazard: '#ffaaaa',
      safe: '#aaffaa',
    },
    { texture: false, surface: 'flat', revision: 'r2' },
  ),
  productionTheme('orchard-workshop', 'Orchard Workshop', {
    ink: '#f3e6c7',
    panel: '#e5d3a1',
    panelRaised: '#f6ebd0',
    text: '#302b22',
    muted: '#5c4834',
    line: '#9b805b',
    controlLine: '#705739',
    accent: '#365226',
    amber: '#77421d',
    hazard: '#9b3028',
    safe: '#365226',
  }),
  productionTheme('neon-ruins', 'Neon Ruins', {
    ink: '#141827',
    panel: '#222b42',
    panelRaised: '#30384f',
    text: '#e5eef2',
    muted: '#b6c8d4',
    line: '#59637d',
    controlLine: '#a49ec9',
    accent: '#67d8ca',
    amber: '#f3ca8d',
    hazard: '#f19bac',
    safe: '#aad99b',
  }),
  productionTheme('pocket-lcd', 'Pocket LCD', {
    ink: '#dce5bb',
    panel: '#cbd7a4',
    panelRaised: '#b9c991',
    text: '#24321f',
    muted: '#435236',
    line: '#82936a',
    controlLine: '#4a603b',
    accent: '#324c2a',
    amber: '#485b2f',
    hazard: '#445327',
    safe: '#395033',
  }),
  productionTheme('copper-observatory', 'Copper Observatory', {
    ink: '#09191c',
    panel: '#102c30',
    panelRaised: '#1b3d41',
    text: '#f6ead4',
    muted: '#c7c1ac',
    line: '#52666a',
    controlLine: '#d99767',
    accent: '#e0a373',
    amber: '#e9bc76',
    hazard: '#ffac95',
    safe: '#aacdae',
  }),
  productionTheme('sakura-station', 'Sakura Station', {
    ink: '#fbf6ef',
    panel: '#f1e6df',
    panelRaised: '#fffaf4',
    text: '#352a39',
    muted: '#685360',
    line: '#b9a5ac',
    controlLine: '#765567',
    accent: '#9d304b',
    amber: '#755414',
    hazard: '#a2302c',
    safe: '#346344',
  }),
  productionTheme('obsidian-reliquary', 'Obsidian Reliquary', {
    ink: '#0b0a0d',
    panel: '#191619',
    panelRaised: '#272127',
    text: '#eee5d4',
    muted: '#bcb1a6',
    line: '#54464e',
    controlLine: '#a28f76',
    accent: '#d2b16d',
    amber: '#d2b16d',
    hazard: '#f09697',
    safe: '#a6b998',
  }),
  productionTheme('deep-space', 'Deep Space', {
    ink: '#080e18',
    panel: '#111d2c',
    panelRaised: '#1b2b3f',
    text: '#e5eff5',
    muted: '#afc0cf',
    line: '#425366',
    controlLine: '#839eb5',
    accent: '#99d5ed',
    amber: '#f0b17b',
    hazard: '#ff9d91',
    safe: '#a8cfb5',
  }),
  productionTheme('moonlit-grove', 'Moonlit Grove', {
    ink: '#09110e',
    panel: '#14231c',
    panelRaised: '#22352b',
    text: '#e6ece1',
    muted: '#b3c2b4',
    line: '#496252',
    controlLine: '#829c86',
    accent: '#c0b6e2',
    amber: '#d0c999',
    hazard: '#edac9b',
    safe: '#a5c798',
  }),
]);
export const BUILTIN_THEME_FAMILIES = freeze(
  BUILTIN_INTERFACE_THEMES.map((entry) =>
    entry.id === 'legacy'
      ? {
          ...RETAINED_THEME_FAMILIES[0],
          revision: entry.revision,
          name: entry.name,
          interface: { id: entry.id, revision: entry.revision },
        }
      : {
          format: 'ThemeFamily.v1',
          id: entry.id,
          revision: entry.revision,
          name: entry.name,
          interface: { id: entry.id, revision: entry.revision },
          arcade: {
            id: entry.id,
            revision: ['industrial-workshop', 'vyshyvanka'].includes(entry.id) ? 'r2' : 'r1',
          },
          sim: { id: entry.id, revision: 'r1' },
        },
  ),
);
export const APPLICATION_THEME_FAMILY = 'industrial-workshop';
// Current selections first; retained immutable revisions remain available to
// recordings, authored defaults and first-paint projections.
export const INSTALLED_THEME_FAMILIES = freeze([
  ...BUILTIN_THEME_FAMILIES,
  ...RETAINED_PRODUCTION_INTERFACE_THEMES.filter((entry) =>
    ['legacy', 'industrial-workshop'].includes(entry.id),
  ).map((entry) => ({
    format: 'ThemeFamily.v1',
    id: entry.id,
    revision: entry.revision,
    name: entry.name,
    interface: { id: entry.id, revision: entry.revision },
    arcade: entry.id === 'legacy' ? null : { id: entry.id, revision: 'r2' },
    sim: entry.id === 'legacy' ? null : { id: entry.id, revision: 'r1' },
  })),
  ...RETAINED_THEME_FAMILIES.filter(
    (retained) =>
      !BUILTIN_THEME_FAMILIES.some(
        (current) => current.id === retained.id && current.revision === retained.revision,
      ),
  ),
]);
/** Context selects only an admitted cosmetic family, never campaign content. */
export function resolveThemeFamilySelection({ familyId = 'follow-game', appearanceDefault } = {}) {
  const explicit = familyId !== 'follow-game';
  const requested = explicit
    ? { familyId }
    : (appearanceDefault ?? { familyId: APPLICATION_THEME_FAMILY });
  const family = getThemeFamily(requested.familyId, requested.revision);
  return freeze({
    family: family ?? getThemeFamily(APPLICATION_THEME_FAMILY),
    requested,
    source: explicit ? 'personal' : appearanceDefault ? 'context' : 'application',
    fallbackReason: family
      ? null
      : `Theme unavailable: ${requested.familyId}${requested.revision ? '@' + requested.revision : ''}`,
  });
}
/** Bounded serialization contract, independently versioned from .rltheme ZIPs. */
export function validateThemeFamily(input) {
  const value = boundedJSON(input, { maxBytes: 4096, maxNodes: 40, maxDepth: 4, maxArray: 1 });
  exactKeys(
    value,
    ['format', 'id', 'revision', 'name', 'interface', 'arcade', 'sim'],
    'theme family',
  );
  required(
    value.format === 'ThemeFamily.v1' && idPattern.test(value.id),
    'Unsupported theme family',
  );
  required(/^r[1-9][0-9]{0,8}$/.test(value.revision), 'Invalid family revision');
  required(
    typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 80,
    'Invalid family name',
  );
  for (const kind of ['interface', 'arcade', 'sim']) {
    const ref = value[kind];
    if (kind !== 'interface' && ref === null) continue;
    exactKeys(ref, ['id', 'revision'], `${kind} revision reference`);
    required(
      idPattern.test(ref.id) && /^r[1-9][0-9]{0,8}$/.test(ref.revision),
      `Invalid ${kind} revision reference`,
    );
  }
  return freeze(value);
}

export function getThemeFamily(id, revision) {
  return (
    INSTALLED_THEME_FAMILIES.find(
      (item) => item.id === id && (!revision || item.revision === revision),
    ) ?? null
  );
}
export function getInterfaceTheme(id, revision) {
  return (
    [
      ...BUILTIN_INTERFACE_THEMES,
      ...RETAINED_INTERFACE_THEMES,
      ...RETAINED_PRODUCTION_INTERFACE_THEMES,
    ].find((item) => item.id === id && (!revision || item.revision === revision)) ?? null
  );
}

export function validateInterfaceTheme(input) {
  const value = boundedJSON(input, { maxBytes: 16384, maxNodes: 200, maxDepth: 5, maxArray: 40 });
  exactKeys(
    value,
    [
      'format',
      'id',
      'revision',
      'name',
      'tokens',
      'fonts',
      'surface',
      'texture',
      'fixture',
      'provenance',
      ...(value.format === 'InterfaceTheme.v2' ? ['materialStyle'] : []),
    ],
    'interface theme',
  );
  required(
    ['InterfaceTheme.v1', 'InterfaceTheme.v2'].includes(value.format) && idPattern.test(value.id),
    'Unsupported interface theme',
  );
  required(/^r[1-9][0-9]{0,8}$/.test(value.revision), 'Invalid interface revision');
  required(
    typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 80,
    'Invalid interface name',
  );
  const names =
    value.format === 'InterfaceTheme.v1'
      ? THEME_TOKEN_NAMES
      : [...THEME_TOKEN_NAMES, ...PAIRED_THEME_TOKEN_NAMES];
  exactKeys(value.tokens, names, 'theme tokens');
  for (const name of names)
    required(colorPattern.test(value.tokens[name]), `Invalid theme color: ${name}`);
  if (value.materialStyle !== undefined)
    required(
      [
        'steel',
        'linen',
        'porcelain',
        'brass',
        'classic',
        'terminal',
        'wood',
        'composite',
        'lcd',
        'copper',
        'sakura',
      ].includes(value.materialStyle),
      'Invalid material style',
    );
  exactKeys(value.fonts, ['ui', 'mono', 'display'], 'theme fonts');
  for (const name of ['ui', 'mono', 'display'])
    required(
      typeof value.fonts[name] === 'string' && /^[a-zA-Z0-9 ',.-]{1,160}$/.test(value.fonts[name]),
      'Invalid font stack',
    );
  required(['flat', 'bevel'].includes(value.surface), 'Invalid surface style');
  required(
    typeof value.texture === 'boolean' && typeof value.fixture === 'boolean',
    'Invalid theme capabilities',
  );
  exactKeys(value.provenance, ['author', 'license', 'source'], 'theme provenance');
  for (const name of ['author', 'license', 'source'])
    required(
      typeof value.provenance[name] === 'string' &&
        value.provenance[name].length > 0 &&
        value.provenance[name].length <= 200,
      'Theme provenance required',
    );
  return freeze(value);
}

export function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    required(colorPattern.test(hex), 'Contrast requires opaque RGB colors');
    const values = [1, 3, 5]
      .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  };
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Texture is confined to the six-pixel frame. The quiet center has an exact
// contrast value, and scales without stretching wear into the reading surface.
function material(color, light, textured, family = 'industrial-workshop', accent = light) {
  if (textured && ['industrial-workshop', 'steel'].includes(family)) {
    // Machined rim: the six-pixel slice owns all wear and fasteners. The
    // center is quiet and untextured, including when a renderer uses fill.
    const rim = `<path d="M1 46V1h45M3 42V3h39" stroke="${light}" opacity=".55" fill="none"/><path d="M46 1v45H1M44 5v39H5" stroke="#10130f" opacity=".85" fill="none"/><path d="M8 2h5m12 0h8M2 17v8m43 7v7M13 45h8m10 0h6" stroke="${light}" opacity=".22"/>`;
    const screws = [
      [4, 4],
      [44, 4],
      [4, 44],
      [44, 44],
    ]
      .map(
        ([x, y]) =>
          `<path d="M${x - 1} ${y - 1}h3v3h-3z" fill="${light}" opacity=".6"/><path d="M${x - 1} ${y}h3" stroke="#10130f" opacity=".8"/>`,
      )
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" shape-rendering="crispEdges"><path fill="${color}" d="M0 0h48v48H0z"/>${rim}${screws}</svg>`;
    return {
      source: `data:image/svg+xml,${encodeURIComponent(svg)}`,
      slice: 6,
      fill: true,
      repeat: 'repeat',
      fallback: color,
    };
  }
  const grain = textured
    ? `<path d="M8 2h5m9 1h8M2 14v7m43 6v8M12 45h9" stroke="${light}" opacity=".25"/><path d="M4 4h2v2H4zm38 0h2v2h-2zM4 42h2v2H4zm38 0h2v2h-2z" fill="${light}" opacity=".6"/>`
    : '';
  const motif = !textured
    ? ''
    : ['vyshyvanka', 'linen'].includes(family)
      ? `<path d="M10 2l2 2 2-2 2 2 2-2m12 0l2 2 2-2 2 2 2-2M10 44l2 2 2-2 2 2 2-2m12 0l2 2 2-2 2 2 2-2" stroke="${accent}" fill="none"/>`
      : ['dnipro-porcelain', 'porcelain'].includes(family)
        ? `<path d="M8 3q4-3 8 0t8 0t8 0t8 0M8 45q4-3 8 0t8 0t8 0t8 0" stroke="${accent}" opacity=".55" fill="none"/>`
        : ['orchard-workshop', 'wood'].includes(family)
          ? `<path d="M8 2h30M12 4h18M8 44h28M17 46h19" stroke="${accent}" opacity=".35"/>`
          : ['neon-ruins', 'composite'].includes(family)
            ? `<path d="M2 12V2h10m24 44h10V36" stroke="${accent}" fill="none"/>`
            : ['tryzub', 'brass'].includes(family)
              ? `<path d="M18 2l6 3 6-3M18 46l6-3 6 3" stroke="${accent}" fill="none"/>`
              : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" shape-rendering="crispEdges"><path fill="${color}" d="M0 0h48v48H0z"/><path d="M1 47V1h46" stroke="${light}" fill="none"/><path d="M47 1v46H1" stroke="#10130f" fill="none"/>${grain}${motif}</svg>`;
  return {
    source: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    slice: 6,
    fill: true,
    repeat: 'repeat',
    fallback: color,
  };
}

// Finish variants are derived consumer behavior, not serialized theme assets.
// A candidate's explicit interface basis follows independently of its world/art
// family. Missing, incompatible or unavailable bases retain the shared finish.
function materialVariant(source, interfaceBasis) {
  const style = source.materialStyle ?? source.id;
  const installed = getInterfaceTheme(source.id, source.revision);
  const base =
    installed ??
    (source.id.startsWith('candidate-') && interfaceBasis
      ? getInterfaceTheme(interfaceBasis.interfaceId, interfaceBasis.interfaceRevision ?? 'r1')
      : null);
  const variants = {
    'obsidian-reliquary': 'brass',
    'deep-space': 'composite',
    'moonlit-grove': 'wood',
    'ember-foundry': 'steel',
    'polar-relay': 'steel',
  };
  return base && variants[base.id] === style ? base.id : style;
}

/** Pure renderer input. Never resolves or replaces course/level media. */
export function resolvePresentation({
  familyId = 'legacy',
  themeFamily,
  interfaceId,
  interfaceTheme,
  interfaceBasis,
  accessibility = {},
  density = 'player',
  ornaments = 'subtle',
} = {}) {
  const family = themeFamily ? validateThemeFamily(themeFamily) : getThemeFamily(familyId);
  required(family, 'Unknown theme family');
  const source = interfaceTheme
    ? validateInterfaceTheme(interfaceTheme)
    : getInterfaceTheme(
        interfaceId ?? family.interface.id,
        interfaceId ? undefined : family.interface.revision,
      );
  required(
    source,
    `Interface revision unavailable: ${family.interface.id}@${family.interface.revision}`,
  );
  if (!interfaceTheme && !interfaceId)
    required(
      source.revision === family.interface.revision,
      `Interface revision unavailable: ${family.interface.id}@${family.interface.revision}`,
    );
  required(['player', 'studio'].includes(density), 'Invalid interface density');
  required(['off', 'subtle', 'rich'].includes(ornaments), 'Invalid ornaments');
  const a = {
    highContrast: accessibility.highContrast === true,
    opaqueHud: accessibility.opaqueHud === true,
    textFace: accessibility.textFace === 'plain' ? 'plain' : 'pixel',
    textSize: ['large', 'extra-large'].includes(accessibility.textSize) ? 'large' : 'standard',
    reducedEffects:
      accessibility.effectiveReducedEffects === true || accessibility.reducedEffects === true,
    coarsePointer: accessibility.coarsePointer === true,
  };
  const tokens = {
    ...derivePairedThemeTokens({ ...baseTokens, ...source.tokens }),
    ...source.tokens,
  };
  if (a.highContrast)
    Object.assign(tokens, {
      ink: '#000000',
      panel: '#000000',
      panelRaised: '#121212',
      text: '#ffffff',
      muted: '#dddddd',
      line: '#dddddd',
      controlLine: '#fff28a',
      accent: '#fff28a',
      amber: '#fff28a',
      hazard: '#ffa8a8',
      safe: '#c5ffc5',
      onAccent: '#000000',
      selection: '#fff28a',
      onSelection: '#000000',
      input: '#000000',
      inputText: '#ffffff',
      link: '#fff28a',
      focus: '#fff28a',
      onHazard: '#000000',
      onSafe: '#000000',
    });
  const textured = source.texture && ornaments !== 'off' && !a.highContrast;
  const resolvedFonts = { ...source.fonts };
  if (a.textFace === 'plain') {
    resolvedFonts.ui = "'Field Kit UI', 'Exo 2', sans-serif";
    resolvedFonts.display = resolvedFonts.ui;
  }
  const targetSize = density === 'studio' && !a.coarsePointer && a.textSize !== 'large' ? 32 : 44;
  const materials = {
    panel: material(
      tokens.panel,
      tokens.line,
      textured,
      source.materialStyle ?? source.id,
      tokens.accent,
    ),
    raised: material(
      tokens.panelRaised,
      tokens.line,
      textured,
      source.materialStyle ?? source.id,
      tokens.accent,
    ),
    inset: material(
      tokens.input,
      tokens.line,
      textured,
      source.materialStyle ?? source.id,
      tokens.accent,
    ),
    primary: material(
      tokens.accent,
      tokens.onAccent,
      textured,
      source.materialStyle ?? source.id,
      tokens.onAccent,
    ),
  };
  const recipe = (background, foreground, border = tokens.controlLine) => ({
    background,
    foreground,
    icon: foreground,
    border,
  });
  const components = Object.fromEntries(
    COMPONENT_ROLES.map((role) => {
      const background =
        role === 'primary'
          ? tokens.accent
          : role === 'danger'
            ? tokens.hazard
            : ['input', 'slot', 'progress', 'hud'].includes(role)
              ? tokens.input
              : ['button', 'tab', 'checkbox', 'radio', 'slider', 'scrollbar'].includes(role)
                ? tokens.panelRaised
                : tokens.panel;
      const foreground =
        role === 'primary' ? tokens.onAccent : role === 'danger' ? tokens.onHazard : tokens.text;
      return [
        role,
        {
          material:
            role === 'primary'
              ? 'primary'
              : ['input', 'slot', 'progress'].includes(role)
                ? 'inset'
                : role === 'button'
                  ? 'raised'
                  : 'panel',
          minTarget: targetSize,
          states: {
            default: recipe(background, foreground),
            hover: recipe(background, foreground, tokens.focus),
            pressed:
              role === 'danger'
                ? recipe(tokens.hazard, tokens.onHazard, tokens.hazard)
                : recipe(tokens.selection, tokens.onSelection),
            disabled: recipe(tokens.panel, tokens.muted),
            loading: recipe(background, foreground),
          },
          selection: {
            ...recipe(tokens.selection, tokens.onSelection),
            color: tokens.selection,
            cue: 'selected',
          },
          validation: { color: tokens.hazard, cue: 'error' },
          focus: { color: tokens.focus, width: 3, offset: 3 },
        },
      ];
    }),
  );
  const resolved = {
    format: 'ResolvedPresentation.v2',
    familyId: family.id,
    familyRevision: family.revision,
    interfaceId: source.id,
    revision: source.revision,
    tokens,
    fonts: resolvedFonts,
    materials,
    components,
    accessibility: a,
    density,
    ornaments,
    textured,
    surface: a.highContrast ? 'flat' : source.surface,
    materialStyle: source.materialStyle ?? source.id,
    materialVariant: materialVariant(source, interfaceBasis),
    targetSize,
    colorScheme:
      contrastRatio('#000000', tokens.panel) > contrastRatio('#ffffff', tokens.panel)
        ? 'light'
        : 'dark',
    spacing: [4, 8, 12, 16, 24, 32],
    iconSizes: [16, 24, 32, 48],
    cues: SEMANTIC_CUES,
    sampling: { interface: 'nearest', arcade: 'nearest', sim: 'mipmapped' },
    dependencies: [],
    diagnostics: [],
  };
  return freeze({ ...resolved, identity: dataIdentity(resolved) });
}

export function validatePresentationCoverage(resolved) {
  const errors = [],
    warnings = [];
  for (const role of COMPONENT_ROLES)
    if (!resolved.components?.[role]) errors.push(`Missing component role: ${role}`);
  const target = resolved.accessibility.highContrast ? 7 : 4.5;
  for (const surface of ['ink', 'panel', 'panelRaised']) {
    const ratio = contrastRatio(resolved.tokens.text, resolved.tokens[surface]);
    if (ratio < target) errors.push(`Text contrast on ${surface}: ${ratio.toFixed(2)} < ${target}`);
    if (contrastRatio(resolved.tokens.link, resolved.tokens[surface]) < target)
      errors.push(`Link contrast on ${surface} is below ${target}:1`);
    if (contrastRatio(resolved.tokens.muted, resolved.tokens[surface]) < 3)
      errors.push(`Inactive text contrast on ${surface} is below 3:1`);
  }
  for (const [role, component] of Object.entries(resolved.components)) {
    for (const [state, pair] of Object.entries(component.states)) {
      const minimum = state === 'disabled' ? 3 : target;
      if (contrastRatio(pair.foreground, pair.background) < minimum)
        errors.push(`${role}/${state} foreground contrast is below ${minimum}:1`);
    }
  }
  for (const surface of ['panel', 'panelRaised']) {
    if (contrastRatio(resolved.tokens.muted, resolved.tokens[surface]) < target)
      errors.push(`Supporting text contrast on ${surface} is below ${target}:1`);
  }
  if (resolved.interfaceId === 'legacy')
    warnings.push('Existing artwork remains owned by its legacy presentation.');
  return freeze({ valid: errors.length === 0, errors, warnings, roles: COMPONENT_ROLES.length });
}

const canvasFontCache = new WeakMap();
/** Interface typography is independent from arcade sprite/material selection. */
export function canvasInterfaceFonts(resolved) {
  if (
    !resolved ||
    (resolved.interfaceId === 'legacy' &&
      resolved.revision === 'r1' &&
      !resolved.accessibility.highContrast)
  )
    return null;
  required(
    ['ResolvedPresentation.v1', 'ResolvedPresentation.v2'].includes(resolved.format),
    'Expected a resolved interface',
  );
  if (!canvasFontCache.has(resolved))
    canvasFontCache.set(
      resolved,
      freeze({
        ui: resolved.fonts.ui,
        numeric: resolved.fonts.mono,
      }),
    );
  return canvasFontCache.get(resolved);
}

export function presentationThemeVariables(resolved) {
  const kebab = (value) => value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return Object.fromEntries([
    ...Object.entries(resolved.tokens).map(([name, value]) => [`--iw-${kebab(name)}`, value]),
    ...Object.entries(resolved.components).flatMap(([role, component]) =>
      Object.entries(component.states).flatMap(([state, pair]) =>
        Object.entries(pair).map(([name, value]) => [`--iw-${role}-${state}-${name}`, value]),
      ),
    ),
    ...Object.entries(resolved.fonts).map(([name, value]) => [`--iw-font-${name}`, value]),
    ...Object.entries(resolved.materials).map(([name, value]) => [
      `--iw-material-${name}`,
      `url("${value.source}")`,
    ]),
    ['--iw-color-scheme', resolved.colorScheme],
    ['--iw-target', `${resolved.targetSize}px`],
    ['--iw-text-size', resolved.accessibility.textSize === 'large' ? '20px' : '16px'],
  ]);
}

/** Scoped DOM adapter also used by Studio specimens; does not rebuild controls. */
export function applyResolvedPresentation(element, resolved) {
  required(element?.style && element?.dataset, 'Presentation needs a styled element');
  const before = new Map(),
    owned = presentationThemeVariables(resolved);
  const attributes = {
    interfaceTheme: resolved.interfaceId,
    // Only the original pinned adapter delegates paint to the former UI skin.
    // Current Signal Blue is a complete, fixed semantic palette.
    themeStyled: String(
      resolved.interfaceId !== 'legacy' ||
        resolved.revision !== 'r1' ||
        resolved.accessibility.highContrast,
    ),
    themeFamily: resolved.familyId,
    themeContrast: resolved.accessibility.highContrast ? 'high' : 'normal',
    themeTexture: resolved.textured ? 'on' : 'off',
    themeSurface: resolved.surface,
    themeMaterial: resolved.materialStyle ?? resolved.interfaceId,
    themeFinish: resolved.materialVariant ?? resolved.materialStyle ?? resolved.interfaceId,
    themeHud:
      resolved.accessibility.opaqueHud || resolved.accessibility.highContrast ? 'opaque' : 'normal',
    themeMotion: resolved.accessibility.reducedEffects ? 'reduced' : 'full',
    themeDensity: resolved.density,
    themeTextSize: resolved.accessibility.textSize,
    themeIdentity: resolved.identity,
  };
  const previousAttributes = new Map(
    Object.keys(attributes).map((name) => [name, element.dataset[name]]),
  );
  for (const [name, value] of Object.entries(owned)) {
    before.set(name, [
      element.style.getPropertyValue(name),
      element.style.getPropertyPriority?.(name) ?? '',
    ]);
    element.style.setProperty(name, value);
  }
  Object.assign(element.dataset, attributes);
  return () => {
    for (const [name, value] of Object.entries(owned)) {
      if (element.style.getPropertyValue(name) !== value) continue;
      const [prior, priority] = before.get(name);
      if (prior) element.style.setProperty(name, prior, priority);
      else element.style.removeProperty(name);
    }
    for (const [name, value] of Object.entries(attributes)) {
      if (element.dataset[name] !== value) continue;
      const prior = previousAttributes.get(name);
      if (prior === undefined) delete element.dataset[name];
      else element.dataset[name] = prior;
    }
  };
}

// Shared preference authority travels with the contract in bounded optional packages.

export const LEGACY_THEME_PREFERENCES_KEY = 'revealline-mmm.theme-family.v1';
export const THEME_PREFERENCES_KEY = 'revealline-mmm.appearance.v2';
export const DEFAULT_THEME_PREFERENCES = Object.freeze({
  familyId: 'follow-game',
  arcadeArt: 'follow-game',
  highContrast: false,
  opaqueHud: false,
  ornaments: 'theme',
});
const fields = Object.keys(DEFAULT_THEME_PREFERENCES);
export function validateThemePreferences(value, complete = true) {
  if (!value || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    throw new TypeError('Theme preferences must be plain data.');
  const keys = Reflect.ownKeys(value);
  if (
    !keys.length ||
    keys.some((key) => !fields.includes(key)) ||
    (complete && keys.length !== fields.length)
  )
    throw new TypeError('Unsupported theme preference fields.');
  const result = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value'))
      throw new TypeError('Theme preferences require ordinary values.');
    const item = descriptor.value;
    const valid =
      key === 'familyId'
        ? item === 'follow-game' || (typeof item === 'string' && idPattern.test(item))
        : key === 'arcadeArt'
          ? ['authored', 'follow-game'].includes(item)
          : key === 'ornaments'
            ? ['theme', 'off', 'subtle', 'rich'].includes(item)
            : typeof item === 'boolean';
    if (!valid) throw new TypeError(`Invalid theme preference: ${key}`);
    result[key] = item;
  }
  return result;
}
/** Self-contained, bounded migration shared with the generated first-paint bootstrap.
 * Reads never write, including unknown themes retained for a later installation. */
export function resolveStoredAppearance({ appearance, legacyTheme, legacyMenu } = {}) {
  const parse = (raw) => {
    try {
      return typeof raw === 'string' && raw.length <= 2048 ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const valid = (v, modern) =>
    v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).length === (modern ? 5 : 4) &&
    typeof v.familyId === 'string' &&
    /^[a-z][a-z0-9-]{0,63}$/.test(v.familyId) &&
    ['authored', 'follow-game'].includes(v.arcadeArt) &&
    typeof v.highContrast === 'boolean' &&
    typeof v.opaqueHud === 'boolean' &&
    (!modern || ['theme', 'off', 'subtle', 'rich'].includes(v.ornaments));
  const current = parse(appearance);
  if (valid(current, true)) return current;
  const old = parse(legacyTheme),
    menu = parse(legacyMenu);
  const ornaments = ['off', 'subtle', 'rich'].includes(menu?.ornaments) ? menu.ornaments : 'theme';
  if (valid(old, false)) return { ...old, ornaments };
  // Font, size and motion are shared accessibility choices, not theme intent.
  // Saving one must not switch a fresh profile to a legacy theme on navigation.
  const existing = menu && ['auto', 'ukrainian'].includes(menu.palette);
  return {
    familyId: existing ? 'legacy' : 'follow-game',
    arcadeArt: existing ? 'authored' : 'follow-game',
    highContrast: false,
    opaqueHud: false,
    ornaments,
  };
}
const decode = (raw) => {
  try {
    return typeof raw === 'string' && raw.length <= 2048
      ? validateThemePreferences(JSON.parse(raw))
      : null;
  } catch {
    return null;
  }
};

/** Independent cosmetic intent. Reading never writes or changes legacy records. */
export function createThemePreferences({
  window: win = globalThis.window,
  getStorage = () => globalThis.localStorage,
  writable = () => true,
  onWarning = () => {},
} = {}) {
  let disposed = false,
    unsaved = false,
    warning = '';
  const listeners = new Set();
  const read = () => {
    try {
      const storage = getStorage(),
        raw = storage?.getItem(THEME_PREFERENCES_KEY);
      return {
        storage,
        raw,
        value:
          decode(raw) ??
          resolveStoredAppearance({
            appearance: raw,
            legacyTheme: storage?.getItem(LEGACY_THEME_PREFERENCES_KEY),
            legacyMenu: storage?.getItem('revealline-mmm.menu-style.v1'),
          }),
      };
    } catch {
      return { storage: null, value: null };
    }
  };
  let state = Object.freeze({ ...(read().value ?? DEFAULT_THEME_PREFERENCES), revision: 0 });
  const data = () => Object.fromEntries(fields.map((key) => [key, state[key]]));
  const notice = (message) => {
    warning = message;
    try {
      onWarning(message);
    } catch {
      /* A status observer cannot undo intent. */
    }
  };
  const apply = (next) => {
    state = Object.freeze({ ...next, revision: state.revision + 1 });
    const errors = [];
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      try {
        listener(state);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Theme observers could not update.');
    return state;
  };
  const persist = () => {
    try {
      const allowed = writable();
      if (disposed) return;
      if (!allowed) {
        unsaved = true;
        notice('Theme applies to this session; saving is disabled here.');
        return;
      }
      const storage = getStorage();
      if (disposed) return;
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(THEME_PREFERENCES_KEY, JSON.stringify(data()));
      unsaved = false;
      notice('');
    } catch {
      unsaved = true;
      notice('Theme applies to this session, but could not be saved.');
    }
  };
  const receive = (event) => {
    if (disposed || unsaved || event.key !== THEME_PREFERENCES_KEY) return;
    const current = read();
    if (current.value && event.storageArea === current.storage && event.newValue === current.raw)
      apply(current.value);
  };
  const restored = (event) => {
    if (disposed || unsaved || !event.persisted) return;
    const current = read();
    if (current.value && fields.some((key) => current.value[key] !== state[key]))
      apply(current.value);
  };
  win?.addEventListener?.('storage', receive);
  win?.addEventListener?.('pageshow', restored);
  return Object.freeze({
    snapshot: () => state,
    subscribe(listener) {
      if (disposed) throw new Error('Theme preferences are disposed.');
      if (typeof listener !== 'function' || listeners.has(listener))
        throw new TypeError('New theme listener required.');
      listeners.add(listener);
      try {
        listener(state);
      } catch (error) {
        listeners.delete(listener);
        throw error;
      }
      return () => listeners.delete(listener);
    },
    set(patch) {
      if (disposed) throw new Error('Theme preferences are disposed.');
      const next = { ...data(), ...validateThemePreferences(patch, false) };
      try {
        apply(next);
      } finally {
        if (!disposed) persist();
      }
      return state;
    },
    applyComplete(familyId) {
      const next = {
        ...data(),
        ...validateThemePreferences(
          { familyId, arcadeArt: 'follow-game', ornaments: 'theme' },
          false,
        ),
      };
      try {
        apply(next);
      } finally {
        if (!disposed) persist();
      }
      try {
        if (writable())
          getStorage()?.setItem(
            'revealline-mmm.fpv.appearance.v1',
            JSON.stringify({
              format: 'SimAppearancePreferences.v1',
              interface: 'follow-game',
              world: 'follow-game',
            }),
          );
      } catch {
        notice('Theme applies here, but SIM appearance could not be saved.');
      }
      return state;
    },
    getWarning: () => warning,
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      win?.removeEventListener?.('storage', receive);
      win?.removeEventListener?.('pageshow', restored);
    },
  });
}

// Pure SIM collection contracts are shared with offline Studio; renderer source stays optional.
export const SIM_MODEL_ROLES = Object.freeze([
  'drone',
  'gate',
  'marker',
  'landing-pad',
  'vehicle',
  'enemy',
  'obstacle',
  'scenery',
]);
export const SIM_MATERIAL_ROLES = Object.freeze([
  'steel',
  'rubber',
  'copper',
  'concrete',
  'enamel',
  'timber',
  'grass',
]);
export const SIM_EFFECT_ROLES = Object.freeze([
  'playerPulse',
  'hostilePulse',
  'ghost',
  'ghostEmissive',
  'trail',
  'goalOutline',
  'goalActive',
  'goalComplete',
  'goalInactive',
  'goalGlow',
  'goalGlowInactive',
  'goalEmissive',
  'goalBadge',
  'directionArrow',
]);
const freezeCollection = (value) => {
  for (const child of Object.values(value))
    if (child && typeof child === 'object') freezeCollection(child);
  return Object.freeze(value);
};

/** Source descriptors are plain, bounded data; validation does not install code or assets. */
export function validateSimVisualCollection(input) {
  const value = boundedJSON(input, {
    maxBytes: 16 * 1024,
    maxNodes: 160,
    maxDepth: 4,
    maxArray: 16,
    maxString: 256,
  });
  exactKeys(
    value,
    [
      'format',
      'id',
      'revision',
      'profileId',
      'models',
      'assets',
      'materials',
      'effects',
      'provenance',
    ],
    'SIM visual collection',
  );
  required(value.format === 'SimVisualCollection.v1', 'Unsupported SIM visual collection format.');
  required(stableId(value.id), 'Invalid SIM visual collection identity.');
  required(
    typeof value.revision === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(value.revision),
    'Invalid SIM visual collection revision.',
  );
  required(value.profileId === null || stableId(value.profileId), 'Invalid SIM profile binding.');
  for (const [name, roles] of [
    ['models', SIM_MODEL_ROLES],
    ['assets', SIM_MODEL_ROLES],
    ['materials', SIM_MATERIAL_ROLES],
  ]) {
    exactKeys(value[name], roles, `SIM collection ${name}`);
    for (const role of roles)
      required(
        name === 'assets'
          ? /^builtin:[a-z0-9-]{1,64}$/.test(value[name][role] ?? '')
          : stableId(value[name][role]),
        `Missing or invalid SIM ${name} role: ${role}.`,
      );
  }
  exactKeys(value.effects, SIM_EFFECT_ROLES, 'SIM collection effects');
  for (const role of SIM_EFFECT_ROLES)
    required(
      Number.isInteger(value.effects[role]) &&
        value.effects[role] >= 0 &&
        value.effects[role] <= 0xffffff,
      `Missing or invalid SIM effect role: ${role}.`,
    );
  exactKeys(value.provenance, ['kind', 'source', 'credit'], 'SIM collection provenance');
  required(value.provenance.kind === 'original-procedural', 'Unsupported SIM source provenance.');
  required(
    typeof value.provenance.source === 'string' &&
      /^[a-zA-Z0-9_./-]+\.mjs$/.test(value.provenance.source) &&
      !value.provenance.source.startsWith('/') &&
      !value.provenance.source.split('/').includes('..'),
    'Invalid SIM source path.',
  );
  required(
    typeof value.provenance.credit === 'string' && value.provenance.credit.trim().length > 0,
    'Missing SIM source credit.',
  );
  return freezeCollection(value);
}
const materialBindings = (prefix) =>
  Object.fromEntries(SIM_MATERIAL_ROLES.map((role) => [role, `${prefix}-${role}`]));
const authoredEffects = {
  playerPulse: 0x8ce4e3,
  hostilePulse: 0xf7b071,
  ghost: 0x95e9ef,
  ghostEmissive: 0x247880,
  trail: 0x95e9ef,
  goalOutline: 0x8beafc,
  goalActive: 0xe8f1a7,
  goalComplete: 0x95aa9e,
  goalInactive: 0x7fa9b4,
  goalGlow: 0xa8e9dd,
  goalGlowInactive: 0x89c9c5,
  goalEmissive: 0x82e1d5,
  goalBadge: 0xa5e7d4,
  directionArrow: 0xe8eab0,
};
const workshopEffects = {
  ...authoredEffects,
  playerPulse: 0x9bcfc5,
  hostilePulse: 0xefb079,
  ghost: 0xa2cad8,
  ghostEmissive: 0x365e69,
  trail: 0xa2cad8,
  goalOutline: 0x9ac5cd,
  goalActive: 0xffd284,
  goalGlow: 0xe8b45c,
  goalGlowInactive: 0x8abbb7,
  goalEmissive: 0xb4823b,
  goalBadge: 0xe8b45c,
  directionArrow: 0xead7ab,
};
const workshopModels = {
  drone: 'service-quad',
  gate: 'inspection-frame',
  marker: 'numbered-beacon',
  'landing-pad': 'riveted-service-pad',
  vehicle: 'utility-rover',
  enemy: 'service-rig',
  obstacle: 'authored-volume',
  scenery: 'modular-perimeter',
};
const workshopAssets = {
  drone: 'builtin:workshop-quad',
  gate: 'builtin:workshop-gate',
  marker: 'builtin:workshop-beacon',
  'landing-pad': 'builtin:workshop-pad',
  vehicle: 'builtin:workshop-rover',
  enemy: 'builtin:workshop-sentry',
  obstacle: 'builtin:workshop-obstacle-surface',
  scenery: 'builtin:workshop-perimeter',
};
export const SIM_COLLECTION_PALETTES = freeze({
  'military-field': {
    sky: 0xa8b4b1,
    fog: 0xbac1b0,
    ground: 0x647451,
    wall: 0x717861,
    accent: 0xe5ca85,
    warm: 0xf0dc9d,
  },
  'ember-foundry': {
    sky: 0x6c625b,
    fog: 0x83796d,
    ground: 0x6d6456,
    wall: 0x51453d,
    accent: 0xf0a266,
    warm: 0xedc377,
  },
  'polar-relay': {
    sky: 0x8ba9b6,
    fog: 0xa1bac2,
    ground: 0x687c7e,
    wall: 0x425e6e,
    accent: 0x91d5e3,
    warm: 0xefc07a,
  },
  vyshyvanka: {
    sky: 0x3d4552,
    fog: 0x3d4552,
    ground: 0x666455,
    wall: 0x35353d,
    accent: 0xe06060,
    warm: 0xe0dcd0,
  },
  'dnipro-porcelain': {
    sky: 0xa6c6df,
    fog: 0xb5ccd9,
    ground: 0x7e998e,
    wall: 0xdfebf1,
    accent: 0x0057b7,
    warm: 0xe4c878,
  },
  tryzub: {
    sky: 0x384967,
    fog: 0x384967,
    ground: 0x606955,
    wall: 0x263c62,
    accent: 0xf0c040,
    warm: 0xe8e4d8,
  },
  'windows-classic': {
    sky: 0x78adbb,
    fog: 0x90afb5,
    ground: 0x7b9483,
    wall: 0xb9bfc5,
    accent: 0x3434a0,
    warm: 0xd2be7c,
  },
  dos: {
    sky: 0x182139,
    fog: 0x182139,
    ground: 0x465162,
    wall: 0x27395a,
    accent: 0xffff55,
    warm: 0xb2d9e5,
  },
  'orchard-workshop': {
    sky: 0x9fbead,
    fog: 0xb6c2a6,
    ground: 0x73865a,
    wall: 0xaf996e,
    accent: 0xf0d7a0,
    warm: 0xc4865c,
  },
  'neon-ruins': {
    sky: 0x242f4c,
    fog: 0x38415b,
    ground: 0x505b64,
    wall: 0x353f55,
    accent: 0x67d8ca,
    warm: 0xf17d91,
  },
  'pocket-lcd': {
    sky: 0xafbc91,
    fog: 0xb8c49c,
    ground: 0x71835d,
    wall: 0xaebd8f,
    accent: 0x324c2a,
    warm: 0xd8e2b2,
  },
  'copper-observatory': {
    sky: 0x647c80,
    fog: 0x788d8b,
    ground: 0x606960,
    wall: 0x24464a,
    accent: 0xe0a373,
    warm: 0xeee0bf,
  },
  'sakura-station': {
    sky: 0xd5c7ce,
    fog: 0xe3d8d7,
    ground: 0x7f9276,
    wall: 0xe9dcd5,
    accent: 0x9d304b,
    warm: 0xdfb895,
  },
  'obsidian-reliquary': {
    sky: 0x423c48,
    fog: 0x544b55,
    ground: 0x514c50,
    wall: 0x322d37,
    accent: 0xd2b16d,
    warm: 0xdccdb6,
  },
  'deep-space': {
    sky: 0x334358,
    fog: 0x46566b,
    ground: 0x4b5864,
    wall: 0x28394d,
    accent: 0x99d5ed,
    warm: 0xf0b17b,
  },
  'moonlit-grove': {
    sky: 0x384b43,
    fog: 0x4b6058,
    ground: 0x4e6553,
    wall: 0x2c4437,
    accent: 0xc0b6e2,
    warm: 0xcbd4bf,
  },
});
const collectionEffectFinishes = {
  'ember-foundry': {
    playerPulse: 0xc3dba8,
    hostilePulse: 0xffa18e,
    ghost: 0xb9cfcc,
    ghostEmissive: 0x496764,
    trail: 0xb9cfcc,
    goalComplete: 0xb4cda0,
    goalInactive: 0x9c8675,
    goalGlowInactive: 0x9c8675,
  },
  'polar-relay': {
    playerPulse: 0xc2e5df,
    hostilePulse: 0xffa595,
    ghost: 0xa7cfe2,
    ghostEmissive: 0x3b677d,
    trail: 0xa7cfe2,
    goalComplete: 0xb4d8bf,
    goalInactive: 0x7b9eac,
    goalGlowInactive: 0x7b9eac,
  },
  'pocket-lcd': {
    playerPulse: 0xd8e2b2,
    hostilePulse: 0x324c2a,
    ghost: 0x799261,
    ghostEmissive: 0x34482b,
    trail: 0x799261,
    goalComplete: 0x607a46,
    goalInactive: 0x819572,
    goalGlowInactive: 0x819572,
  },
  'copper-observatory': {
    playerPulse: 0xb1dbcf,
    hostilePulse: 0xeb977a,
    ghost: 0xa2c8c3,
    ghostEmissive: 0x36595b,
    trail: 0xa2c8c3,
    goalComplete: 0xaacdae,
    goalInactive: 0x879c9b,
    goalGlowInactive: 0x879c9b,
  },
  'sakura-station': {
    playerPulse: 0x546f5a,
    hostilePulse: 0xa2302c,
    ghost: 0x796185,
    ghostEmissive: 0x44334d,
    trail: 0x796185,
    goalComplete: 0x346344,
    goalInactive: 0x927d88,
    goalGlowInactive: 0x927d88,
  },
  'obsidian-reliquary': {
    playerPulse: 0xe5d8b7,
    hostilePulse: 0xdf8d97,
    ghost: 0xc3b5ca,
    ghostEmissive: 0x55415b,
    trail: 0xc3b5ca,
    goalComplete: 0xa6b998,
    goalInactive: 0x8c7884,
    goalGlowInactive: 0x8c7884,
  },
  'deep-space': {
    playerPulse: 0xc6ebf7,
    hostilePulse: 0xf0b17b,
    ghost: 0x9bb6d2,
    ghostEmissive: 0x35526f,
    trail: 0x9bb6d2,
    goalComplete: 0xa8cfb5,
    goalInactive: 0x728aa3,
    goalGlowInactive: 0x728aa3,
  },
  'moonlit-grove': {
    playerPulse: 0xd3e1c9,
    hostilePulse: 0xedac9b,
    ghost: 0xc0b6e2,
    ghostEmissive: 0x4a4668,
    trail: 0xc0b6e2,
    goalComplete: 0xa5c798,
    goalInactive: 0x7b9383,
    goalGlowInactive: 0x7b9383,
  },
};
export const BUILTIN_SIM_VISUAL_COLLECTIONS = Object.freeze(
  Object.fromEntries(
    [
      {
        id: 'authored',
        profileId: null,
        models: Object.fromEntries(SIM_MODEL_ROLES.map((role) => [role, `authored-${role}`])),
        assets: Object.fromEntries(
          SIM_MODEL_ROLES.map((role) => [role, `builtin:authored-${role}`]),
        ),
        materials: materialBindings('authored'),
        effects: authoredEffects,
      },
      {
        id: 'industrial-workshop',
        profileId: 'industrial-workshop',
        models: workshopModels,
        assets: workshopAssets,
        materials: materialBindings('workshop'),
        effects: workshopEffects,
      },
      ...Object.entries(SIM_COLLECTION_PALETTES).map(([id, palette]) => ({
        id,
        profileId: id,
        models:
          id === 'military-field'
            ? { ...workshopModels, vehicle: 'field-utility-car', enemy: 'field-soldier' }
            : workshopModels,
        assets:
          id === 'military-field'
            ? {
                ...workshopAssets,
                vehicle: 'builtin:military-utility-car',
                enemy: 'builtin:military-field-soldier',
              }
            : workshopAssets,
        materials: materialBindings(id),
        effects: {
          ...workshopEffects,
          ...collectionEffectFinishes[id],
          goalActive: palette.accent,
          goalGlow: palette.accent,
          goalEmissive: palette.accent,
          goalBadge: palette.accent,
          directionArrow: palette.warm,
        },
      })),
    ].map((descriptor) => [
      descriptor.id,
      validateSimVisualCollection({
        format: 'SimVisualCollection.v1',
        revision: 'r1',
        ...descriptor,
        provenance: {
          kind: 'original-procedural',
          source: 'optional-practice/civilian-fpv/world-visuals.mjs',
          credit: 'Project-authored procedural source art; no third-party game assets.',
        },
      }),
    ]),
  ),
);

export function resolveSimVisualCollection({ collectionId = 'authored', revision = 'r1' } = {}) {
  const requested = Object.freeze({ collectionId, revision }),
    candidate = Object.hasOwn(BUILTIN_SIM_VISUAL_COLLECTIONS, collectionId)
      ? BUILTIN_SIM_VISUAL_COLLECTIONS[collectionId]
      : null,
    available = candidate?.revision === revision;
  return Object.freeze({
    requested,
    collection: available ? candidate : BUILTIN_SIM_VISUAL_COLLECTIONS.authored,
    fallbackReason: available
      ? null
      : candidate
        ? 'revision-unavailable'
        : 'collection-unavailable',
  });
}

/** Resolve from the effective pinned profile, including authored replay fallbacks. */
export function resolveSimEffects(profile) {
  return resolveSimVisualCollection({
    collectionId: profile?.id ?? 'authored',
    revision: profile?.revision ?? 'r1',
  }).collection.effects;
}

// Curated interface candidates: closed, immutable data with installed art dependencies.
export const THEME_PREVIEW_LIMIT = 64 * 1024;
export const candidateIdentity = (source, basis, theme) => {
  const content = { ...theme };
  delete content.id;
  delete content.revision;
  return `candidate-${dataIdentity({ source, basis, interface: content })}`;
};
export function validateThemeCandidate(input) {
  const value = boundedJSON(input, {
    maxBytes: THEME_PREVIEW_LIMIT,
    maxNodes: 600,
    maxDepth: 8,
    maxArray: 40,
  });
  exactKeys(
    value,
    ['format', 'source', 'basis', 'family', 'interfaceTheme', 'simDependency'],
    'theme candidate',
  );
  required(
    ['ThemeCandidate.v1', 'ThemeCandidate.v2'].includes(value.format),
    'Unsupported theme candidate.',
  );
  exactKeys(value.source, ['id', 'revision'], 'candidate source');
  required(
    stableId(value.source.id) &&
      Number.isSafeInteger(value.source.revision) &&
      value.source.revision > 0,
    'Invalid candidate source identity.',
  );
  const legacy = value.format === 'ThemeCandidate.v1';
  exactKeys(
    value.basis,
    legacy
      ? ['familyId', 'interfaceId']
      : ['familyId', 'familyRevision', 'interfaceId', 'interfaceRevision'],
    'candidate basis',
  );
  if (!legacy)
    required(
      /^r[1-9][0-9]{0,8}$/.test(value.basis.familyRevision) &&
        /^r[1-9][0-9]{0,8}$/.test(value.basis.interfaceRevision),
      'Invalid candidate basis revision.',
    );
  const builtin = getThemeFamily(value.basis.familyId, legacy ? 'r1' : value.basis.familyRevision),
    base = getInterfaceTheme(
      value.basis.interfaceId,
      legacy ? 'r1' : value.basis.interfaceRevision,
    );
  required(builtin && base, 'Unavailable candidate basis.');
  value.family = validateThemeFamily(value.family);
  value.interfaceTheme = validateInterfaceTheme(value.interfaceTheme);
  required(
    value.interfaceTheme.format === base.format,
    'Candidate interface format differs from its basis.',
  );
  required(
    value.family.interface.id === value.interfaceTheme.id &&
      value.family.interface.revision === value.interfaceTheme.revision,
    'Candidate interface binding differs.',
  );
  required(
    value.family.id === candidateIdentity(value.source, value.basis, value.interfaceTheme) &&
      value.family.id === value.interfaceTheme.id &&
      value.family.name === value.interfaceTheme.name &&
      value.family.revision === 'r1' &&
      value.interfaceTheme.revision === 'r1',
    'Candidate content identity differs.',
  );
  for (const kind of ['arcade', 'sim'])
    required(
      canonicalJSON(value.family[kind]) === canonicalJSON(builtin[kind]),
      `Candidate ${kind} binding differs.`,
    );
  if (builtin.sim === null) required(value.simDependency === null, 'Unexpected SIM dependency.');
  else {
    exactKeys(value.simDependency, ['kind', 'collection'], 'SIM builtin dependency');
    required(
      value.simDependency.kind === 'installed-engine-builtin',
      'SIM resources must be installed engine builtins.',
    );
    const collection = validateSimVisualCollection(value.simDependency.collection);
    required(
      collection.id === builtin.sim.id &&
        collection.revision === builtin.sim.revision &&
        canonicalJSON(collection) === canonicalJSON(BUILTIN_SIM_VISUAL_COLLECTIONS[collection.id]),
      'SIM builtin dependency differs from the installed engine.',
    );
    value.simDependency.collection = collection;
  }
  return freeze(value);
}

/** Drafts may remain incomplete; registration/publication is a readable-theme gate. */
export function validateCuratedThemeQuality(input) {
  const candidate = validateThemeCandidate(input);
  for (const highContrast of [false, true]) {
    const report = validatePresentationCoverage(
      resolvePresentation({
        themeFamily: candidate.family,
        interfaceTheme: candidate.interfaceTheme,
        interfaceBasis: candidate.basis,
        accessibility: { highContrast },
      }),
    );
    required(
      report.valid,
      `Theme is not ready for community use: ${report.errors.slice(0, 3).join('; ')}`,
    );
  }
  return candidate;
}

/** Shared sparse-publisher admission. No campaign/compiler/DOM imports; every
 * admitted custom record is closed data backed by exact installed dependencies. */
export function validateCuratedAppearanceInventory(catalog, { selectedOnly = false } = {}) {
  catalog = boundedJSON(catalog, { maxBytes: 4 * 1024 * 1024, maxNodes: 100000, maxArray: 4096 });
  required(
    catalog.appearanceThemes === undefined || catalog.format === 'revealline-edition-catalog.v3',
    'Curated appearances require catalog v3.',
  );
  const input = boundedJSON(catalog.appearanceThemes ?? [], {
    maxBytes: 4 * 1024 * 1024,
    maxNodes: 40000,
    maxDepth: 10,
    maxArray: 64,
  });
  required(Array.isArray(input) && input.length <= 64, 'Invalid curated appearance inventory.');
  const themes = input.map((raw) => {
    const candidate = validateThemeCandidate(raw);
    required(
      candidate.format === 'ThemeCandidate.v2',
      'Curated themes require exact version pins.',
    );
    return candidate;
  });
  required(
    new Set(themes.map((row) => row.family.id)).size === themes.length,
    'Duplicate curated appearance identity.',
  );
  const pins = [...(catalog.brands ?? []), ...(catalog.campaigns ?? [])]
    .map((row) => row.appearanceDefault)
    .filter(Boolean);
  if (selectedOnly) {
    for (const candidate of themes) validateCuratedThemeQuality(candidate);
    for (const candidate of themes)
      required(
        pins.some(
          (pin) =>
            pin.familyId === candidate.family.id && pin.revision === candidate.family.revision,
        ),
        'Unselected curated appearance leaked into publication.',
      );
    for (const pin of pins)
      required(
        getThemeFamily(pin.familyId, pin.revision) ||
          themes.some(
            (row) => row.family.id === pin.familyId && row.family.revision === pin.revision,
          ),
        'Appearance default dependency unavailable in this publication.',
      );
  }
  return freeze(themes);
}

const contextPrefix = 'revealline-mmm.curated-appearance-context.v1.';
/** Bounded cosmetic handoff to the separately packaged SIM. This is
 * not a player theme installation and never touches preference or proof stores. */
export function saveAppearanceContext(storage, input, { now = Date.now(), shared = false } = {}) {
  const candidate = validateThemeCandidate(input);
  const key = shared
    ? `${contextPrefix}handoff`
    : `${contextPrefix}${candidate.family.id}@${candidate.family.revision}`;
  storage.setItem(
    key,
    canonicalJSON({
      format: 'CuratedAppearanceContext.v1',
      expires: now + 30 * 60 * 1000,
      candidate,
    }),
  );
  return candidate.family;
}
export function loadAppearanceContext(storage, ref, { now = Date.now(), consume = false } = {}) {
  if (
    !ref ||
    !/^candidate-[a-z0-9-]+$/.test(ref.familyId ?? '') ||
    ref.familyId.length > 64 ||
    !/^r[1-9][0-9]{0,8}$/.test(ref.revision ?? '')
  )
    return null;
  try {
    const key = consume
      ? `${contextPrefix}handoff`
      : `${contextPrefix}${ref.familyId}@${ref.revision}`;
    const raw = storage?.getItem(key);
    if (typeof raw !== 'string' || raw.length > THEME_PREVIEW_LIMIT + 256) return null;
    const packet = boundedJSON(raw, {
      maxBytes: THEME_PREVIEW_LIMIT + 256,
      maxNodes: 640,
      maxDepth: 10,
      maxArray: 40,
    });
    exactKeys(packet, ['format', 'expires', 'candidate'], 'appearance context');
    required(
      packet.format === 'CuratedAppearanceContext.v1' &&
        Number.isSafeInteger(packet.expires) &&
        packet.expires >= now &&
        packet.expires <= now + 30 * 60 * 1000,
      'Expired appearance context.',
    );
    const candidate = validateThemeCandidate(packet.candidate);
    required(
      candidate.family.id === ref.familyId && candidate.family.revision === ref.revision,
      'Appearance context pin differs.',
    );
    if (consume) storage.removeItem(key);
    return candidate;
  } catch {
    return null;
  }
}

export function createThemeBootstrapSeed(input) {
  const candidate = validateThemeCandidate(input);
  const family = candidate.family;
  const resolve = (ornaments) =>
    resolvePresentation({
      themeFamily: family,
      interfaceTheme: candidate.interfaceTheme,
      interfaceBasis: candidate.basis,
      ...(ornaments ? { ornaments } : {}),
    });
  const resolved = resolve();
  const all = presentationThemeVariables(resolved);
  const variables = Object.fromEntries(
    Object.entries(all).filter(
      ([key]) =>
        !key.startsWith('--iw-material-') &&
        !/-(default|hover|pressed|disabled|loading)-/.test(key),
    ),
  );
  const materials = (value) =>
    Object.fromEntries(
      Object.entries(presentationThemeVariables(value)).filter(([key]) =>
        key.startsWith('--iw-material-'),
      ),
    );
  return {
    familyId: family.id,
    variables,
    material: materials(resolved),
    quietMaterial: materials(resolve('off')),
    textured: resolved.textured,
    surface: resolved.surface,
    revision: family.revision,
    materialStyle: resolved.materialStyle,
    materialVariant: resolved.materialVariant,
  };
}

// Successful curated context survives same-origin auxiliary navigation only.
export const ACCEPTED_APPEARANCE_CONTEXT_KEY = 'revealline-mmm.accepted-appearance-context.v1';
export function saveAcceptedAppearance(storage, input, { now = Date.now() } = {}) {
  const candidate = validateThemeCandidate(input);
  storage?.setItem(
    ACCEPTED_APPEARANCE_CONTEXT_KEY,
    canonicalJSON({
      format: 'AcceptedAppearanceContext.v1',
      expires: now + 30 * 60 * 1000,
      candidate,
      seed: createThemeBootstrapSeed(candidate),
    }),
  );
}
export function loadAcceptedAppearance(storage, { now = Date.now() } = {}) {
  try {
    const raw = storage?.getItem(ACCEPTED_APPEARANCE_CONTEXT_KEY);
    if (typeof raw !== 'string' || raw.length > 128 * 1024) return null;
    const packet = boundedJSON(raw, {
      maxBytes: 128 * 1024,
      maxNodes: 1600,
      maxDepth: 10,
      maxArray: 40,
    });
    exactKeys(packet, ['format', 'expires', 'candidate', 'seed'], 'accepted appearance context');
    required(
      packet.format === 'AcceptedAppearanceContext.v1' &&
        Number.isSafeInteger(packet.expires) &&
        packet.expires >= now &&
        packet.expires <= now + 30 * 60 * 1000,
      'Expired accepted appearance context.',
    );
    const candidate = validateThemeCandidate(packet.candidate);
    required(
      canonicalJSON(packet.seed) === canonicalJSON(createThemeBootstrapSeed(candidate)),
      'Accepted appearance seed differs from its candidate.',
    );
    return candidate;
  } catch {
    return null;
  }
}
