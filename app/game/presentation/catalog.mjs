import { TEAM_ENEMY_SLOTS, teamEnemyInheritance } from '../couch/coop-enemy-slots.mjs';
import { TEAM_PILOT_STATES } from '../couch/coop-pilot-slots.mjs';
import { FORMATS, TOKEN_DEFAULTS, freezePresentation, validateThemeBundle } from './model.mjs';
import { CURRENT_PICTURES } from './current-pictures.mjs';

export const SCREEN_IDS = Object.freeze([
  'boot',
  'title',
  'missions',
  'briefing',
  'hangar',
  'flight',
  'pause',
  'results',
  'collection',
  'picture',
  'story',
  'settings',
  'soundtrack',
  'library',
  'recovery',
  'worlds',
  'guide',
  'first-flight',
  'couch',
  'replay',
  'controller-practice',
  'studio',
  'about',
  'credits',
  'privacy',
  'archive',
]);
const all = [...SCREEN_IDS];
const basicStates = [
  'default',
  'hover',
  'focus',
  'pressed',
  'selected',
  'disabled',
  'loading',
  'error',
];
const rows = [];
function slot(id, label, group, recipe, dimensions, screens, options = {}) {
  const kinds = options.kinds ?? ['image', 'recipe'];
  const prompt =
    options.prompt ??
    `Create one original FPV Field Kit ${label.toLowerCase()} for slot ${id}. Use a restrained pixel-art style with deliberate square clusters, deep ink #070B12, panel #101923, warm text #F3F0DB, cyan #78DCE8, amber #F4BF62, hazard #F07879 and success #9DBB7A. ${dimensions ? `Export exactly ${dimensions[0]} by ${dimensions[1]} pixels as PNG.` : 'This is a registered presentation component; describe the bounded visual settings.'} Keep real text and functional gameplay cues separate. Preserve the slot purpose and every listed requirement. Do not reproduce reference game artwork, logos or lettering. Save the original and a separate derivative with the complete effective prompt and actual export dimensions; a prompt is not proof of a valid asset.`;
  rows.push({
    format: FORMATS.slot,
    id,
    revision: 1,
    label,
    group,
    screens,
    kinds,
    recipes: [recipe],
    required: options.required ?? true,
    dimensions: dimensions ? { width: dimensions[0], height: dimensions[1] } : null,
    alpha: options.alpha ?? (kinds.includes('image') ? 'required' : 'either'),
    sampling: 'nearest',
    states: options.states ?? ['default'],
    requirements: options.requirements ?? [
      'Keep functional text separate from artwork.',
      'Preserve gameplay geometry and input behavior.',
      'Review the actual-size preview on light and dark backgrounds.',
    ],
    prompt,
    budget: {
      maxBytes:
        options.maxBytes ??
        (group === 'screens' || group === 'pictures' || group === 'audio'
          ? 4 * 1024 * 1024
          : group === 'fonts'
            ? 2 * 1024 * 1024
            : 128 * 1024),
    },
    palette: [
      '#070b12',
      '#101923',
      '#f3f0db',
      '#78dce8',
      '#f4bf62',
      '#f07879',
      '#9dbb7a',
      '#a5b2bb',
    ],
    geometry: dimensions
      ? {
          frame: { x: 0, y: 0, width: dimensions[0], height: dimensions[1] },
          pivot: { x: 0.5, y: 0.5 },
          occupiedBounds: options.occupiedBounds ?? null,
          rotorAnchors: options.rotorAnchors ?? [],
          nineSlice: ['ui.panel.v1', 'ui.button.v1', 'ui.input.v1', 'ui.meter.v1'].includes(recipe)
            ? { left: 8, top: 8, right: 8, bottom: 8 }
            : null,
        }
      : null,
    dependencies: options.dependencies ?? [],
    owner: options.owner ?? null,
  });
}
for (const [id, label, recipe] of [
  ['panel', 'Panel frame', 'ui.panel.v1'],
  ['dialog', 'Dialog frame', 'ui.panel.v1'],
  ['tooltip', 'Tooltip frame', 'ui.panel.v1'],
  ['toast', 'Status message frame', 'ui.panel.v1'],
])
  slot(`ui.${id}`, label, 'ui', recipe, [24, 24], all, {
    states: basicStates,
    requirements: [
      'Use a 24×24 nine-slice frame with 8-pixel corners.',
      'Keep the content center quiet and text-free.',
      'Focus and error meaning must remain visible without color.',
    ],
  });
for (const id of ['primary', 'secondary', 'danger', 'icon', 'tab', 'chip'])
  slot(`ui.button.${id}`, `${id} button`, 'ui', 'ui.button.v1', [24, 24], all, {
    states: basicStates,
  });
for (const id of ['checkbox', 'radio', 'toggle', 'slider', 'select', 'text', 'scrollbar'])
  slot(
    `ui.input.${id}`,
    `${id} control`,
    'ui',
    'ui.input.v1',
    [24, 24],
    ['settings', 'studio', 'library', 'missions'],
    { states: basicStates },
  );
for (const id of ['coverage', 'progress', 'time', 'ability', 'volume'])
  slot(
    `ui.meter.${id}`,
    `${id} meter`,
    'ui',
    'ui.meter.v1',
    [24, 24],
    ['flight', 'settings', 'results', 'studio'],
  );
slot('ui.focus', 'Focus brackets', 'ui', 'ui.focus.v1', [24, 24], all, {
  states: ['focus', 'selected'],
});
slot('ui.cursor', 'Selection cursor', 'ui', 'ui.cursor.v1', [16, 16], all);
for (const id of [
  'menu',
  'back',
  'close',
  'play',
  'pause',
  'retry',
  'settings',
  'audio',
  'music',
  'fullscreen',
  'save',
  'load',
  'download',
  'upload',
  'copy',
  'check',
  'warning',
  'info',
  'lock',
  'offline',
  'trash',
  'undo',
  'redo',
  'keyboard',
  'controller',
  'touch',
])
  slot(`icon.${id}`, `${id} icon`, 'icons', 'ui.icon.v1', [24, 24], all);
for (const id of ['life', 'score', 'time', 'coverage', 'signal', 'connection'])
  slot(
    `hud.${id}`,
    `${id} status glyph`,
    'hud',
    'ui.icon.v1',
    [16, 16],
    ['flight', 'couch', 'replay'],
  );
for (const id of ['gold', 'silver', 'bronze', 'mastery', 'unlock'])
  slot(
    `reward.${id}`,
    `${id} reward`,
    'rewards',
    'ui.icon.v1',
    [32, 32],
    ['results', 'collection', 'hangar'],
  );
for (const id of ['up', 'right', 'down', 'left', 'boost', 'ability', 'confirm', 'cancel'])
  slot(
    `control.${id}`,
    `${id} input glyph`,
    'controls',
    'ui.icon.v1',
    [24, 24],
    ['flight', 'couch', 'controller-practice', 'settings'],
  );
for (const id of [
  'title',
  'missions',
  'hangar',
  'results',
  'collection',
  'settings',
  'couch',
  'studio',
])
  slot(`screen.${id}.background`, `${id} backdrop`, 'screens', 'scene.menu.v1', [960, 540], [id], {
    alpha: 'opaque',
    requirements: [
      'Decorative scene only; no baked text, buttons or tactical telemetry.',
      'Keep the central content safe area quiet.',
      'Review desktop and portrait framing without distorting the image.',
    ],
  });
slot(
  'screen.title.portrait',
  'Portrait title backdrop',
  'screens',
  'scene.menu.v1',
  [540, 960],
  ['title'],
  {
    alpha: 'opaque',
    requirements: [
      'Compose for portrait; do not stretch the landscape title.',
      'Keep real title/menu text and controls separate.',
      'Respect top/bottom safe areas and the menu content zone.',
    ],
  },
);
slot(
  'scene.reveal.legacy',
  'Legacy reveal picture',
  'pictures',
  'scene.reveal.v1',
  [768, 576],
  ['flight', 'picture'],
  {
    alpha: 'opaque',
    requirements: [
      'Use exact 4:3 framing for 48×36-cell arenas.',
      'Keep live actors, capture lines and HUD out of the background.',
      'Assign through the exact picture owner; saved and earned originals retain their pins.',
    ],
  },
);
slot(
  'scene.reveal.wide',
  'Wide reveal picture',
  'pictures',
  'scene.reveal.v1',
  [1152, 576],
  ['flight', 'picture'],
  {
    alpha: 'opaque',
    requirements: [
      'Use exact 2:1 framing for 72×36-cell arenas.',
      'Keep live actors, capture lines and HUD out of the background.',
      'Assign through the exact picture owner; saved and earned originals retain their pins.',
    ],
  },
);
for (const id of ['scout', 'bomber', 'carrier', 'interceptor', 'fiber', 'impact', 'trapper']) {
  const hubs = (
    id === 'carrier'
      ? [
          [0.3, 0.2],
          [0.7, 0.2],
          [0.2, 0.5],
          [0.8, 0.5],
          [0.3, 0.8],
          [0.7, 0.8],
        ]
      : [
          [0.25, 0.25],
          [0.75, 0.25],
          [0.25, 0.75],
          [0.75, 0.75],
        ]
  ).map(([x, y]) => ({ x, y, radius: 0.12, blades: 3 }));
  for (const [treatment, size] of [
    ['compact', 32],
    ['detailed', 64],
  ])
    slot(
      `player.${id}.${treatment}`,
      `${id} ${treatment} body`,
      'players',
      'actor.player.v1',
      [size, size],
      ['flight', 'hangar', 'couch'],
      {
        occupiedBounds: { x: 0.125, y: 0.125, width: 0.75, height: 0.75 },
        rotorAnchors: hubs,
        dependencies: [`player.${id}.rotors`],
        requirements: [
          'North-facing body with real alpha, center pivot and no baked propeller blades.',
          `Keep ${id === 'carrier' ? 'six' : 'four'} explicit motor hubs; rotor anchors use the full source rectangle.`,
          'Review at 20, 24 and 32 CSS pixels; cosmetic size never changes the contact radius.',
        ],
      },
    );
  slot(
    `player.${id}.rotors`,
    `${id} rotor recipe`,
    'motion',
    'actor.rotors.v1',
    null,
    ['flight', 'hangar', 'couch'],
    {
      kinds: ['recipe'],
      requirements: [
        'Use the existing registered procedural rotor renderer.',
        'Three blades per hub; hub count and blade count are independent.',
        'Pause and reduced effects preserve readable silhouettes.',
      ],
    },
  );
}
for (const id of [
  'bouncer',
  'border-patrol',
  'contour-patrol',
  'claimed-rover',
  'eroder',
  'lane-boss',
  'relay-sentinel',
])
  slot(
    `enemy.${id}`,
    `${id} body`,
    'enemies',
    'actor.enemy.v1',
    id.includes('boss') || id === 'relay-sentinel' ? [64, 64] : [32, 32],
    ['flight', 'guide', 'couch'],
    {
      requirements: [
        'North-facing square image with real alpha.',
        'Keep contact-center, threat-role and direction cues separately drawn.',
        'A body replacement never changes movement, collision, score or difficulty.',
      ],
    },
  );
for (const id of TEAM_ENEMY_SLOTS)
  slot(
    id,
    `Team ${id === 'team.enemy.drifter' ? 'drifter' : `hunter ${id.split('.').at(-1)}`} body`,
    'enemies',
    'team.enemy.v1',
    [32, 32],
    ['couch', 'studio'],
    {
      required: false,
      dependencies: [teamEnemyInheritance(id)],
      prompt: `Original FPV pixel art: ${id}, 32×32 transparent PNG. Follow palette, geometry and all role requirements.`,
      requirements: [
        'North-facing, binary alpha, crisp pixels; no text, target lines, glow or background.',
        'Distinct drifter; consistent hunter silhouette. Real hunter phases: patrol, warning, commit→charge, recovery.',
        'The team.enemy.v1 recipe inherits the declared body image, not its Solo behavior.',
        'Keep contact, warning, phase and Support cues game-owned. Geometry and optional rotors are cosmetic; preserve all mechanics.',
        'Review both arenas, matching scenes, native32px, playing scale and reduced effects. Label inactive states honestly.',
      ],
    },
  );
for (const id of ['wall', 'slow', 'lethal'])
  slot(
    `terrain.${id}`,
    `${id} terrain tile`,
    'terrain',
    'terrain.tile.v1',
    [16, 16],
    ['flight', 'studio'],
    {
      alpha: 'either',
      requirements: [
        'Keep the entire 16×16 cell footprint visible.',
        'Differentiate material by pattern and shape as well as color.',
        'Do not change traversability or affected actor types.',
      ],
    },
  );
for (const id of ['objective', 'supply', 'life', 'speed', 'slow', 'freeze'])
  slot(
    `pickup.${id}`,
    `${id} pickup`,
    'pickups',
    'pickup.icon.v1',
    id === 'objective' || id === 'supply' ? [16, 16] : [24, 24],
    ['flight', 'guide'],
  );
for (const state of ['available', 'captured'])
  slot(
    `team.anchor.${state}`,
    `${state} Team relay anchor`,
    'objectives',
    'team.anchor.v1',
    [24, 24],
    ['couch', 'studio'],
    {
      required: false, // Historical themes keep their recorded appearance until explicitly upgraded.
      requirements: [
        'Team relay anchor only: never an ordinary pickup or a Support action.',
        'Export a centered 24×24 transparent frame with pivot (0.5, 0.5).',
        'The game draws the fixed square boundary and anchor label above this decoration.',
        'Do not bake letters, numbers or capture checkmarks into the artwork.',
        'Artwork never changes anchor location, capture rules or collision geometry.',
        'Inspect available and captured anchors in Relay Yard; preserve distinction without color alone.',
      ],
    },
  );
for (const state of ['shielded', 'exposed', 'secured'])
  slot(
    `team.core.${state}`,
    `${state} Team relay core`,
    'objectives',
    'team.core.v1',
    [64, 64],
    ['couch', 'studio'],
    {
      required: false,
      requirements: [
        'Team relay-core body only: not an ordinary enemy, pickup or player.',
        'Export a centered 64×64 transparent frame with pivot (0.5, 0.5); keep every attachment inside it.',
        'Give shielded, exposed and secured states distinct silhouettes or surface treatment, not color alone.',
        'The game draws the fixed state ring, center cue and SHIELD/CAPTURE/SECURED labels above the body.',
        'No embedded text or logos. Do not imply an attack, hitbox or mechanic that the arena does not have.',
        'Artwork cannot change anchor capture, core exposure, Support, rescue, timing or collision geometry.',
        'Inspect Relay Yard initial, exposed-core and completed scenarios. Victory artwork replaces the board in normal results.',
      ],
    },
  );
for (const [id, label, size] of [
  ['team.support.pulse', 'Team Support pulse', 64],
  ['team.enemy.slowed', 'Team slowed enemy decoration', 24],
])
  slot(id, label, 'effects', 'team.support.v1', [size, size], ['couch', 'studio'], {
    required: false,
    requirements: [
      `Export a centered ${size}×${size} transparent frame with pivot (0.5, 0.5).`,
      'Support is a nearby team assist, not Scan, damage, capture or invulnerability.',
      'Use sparse pixel decoration, no text, background, sweep, blur or baked glow.',
      'Keep actors, trails and warnings readable. The game limits decoration opacity and retains fixed functional rings and labels.',
      'Pulse artwork clips to the existing radius. Artwork changes no radius, duration, cooldown, slowdown, rescue priority or collision.',
      'Inspect Support pulse in First Connection and Relay Yard, Paused, Play preview and Reduced effects. Inactive states are not drawn.',
    ],
  });
for (const [id, label, size] of [
  ['team.emitter.warning', 'Team emitter warning target', 24],
  ['team.emitter.spark', 'Team travelling spark', 16],
])
  slot(id, label, 'effects', 'team.emitter.v1', [size, size], ['couch', 'studio'], {
    required: false,
    requirements: [
      `Export a centered ${size}×${size} transparent frame with pivot (0.5, 0.5).`,
      'Emitter warning marks an actual exposed-trail target. The spark travels on that trail; it is not a homing projectile or a new attack.',
      'Use sparse crisp pixels. No text, background, blur, baked glow or extra targets.',
      'The game retains the warning line, fixed target square and spark center/outline above artwork.',
      'Artwork changes no warning time, target, speed, collision, Support interception or clearing rules.',
      'Inspect Relay Yard Emitter warning and Travelling spark scenes, with reduced effects and actual-size previews.',
    ],
  });
for (const [id, label] of [
  ['team.rescue.progress', 'Team contact rescue'],
  ['team.player.recovery', 'Team player recovery'],
])
  slot(id, label, 'effects', 'team.rescue.v1', [32, 32], ['couch', 'studio'], {
    required: false,
    requirements: [
      'Export a centered 32×32 transparent frame with pivot (0.5, 0.5).',
      'Use sparse corner pixels and an empty center; decoration appears underneath actor bodies, numbers, shapes and status labels.',
      'Contact rescue decorates the rescuer, not the downed target. Its percentage uses the actual one-second contact-rescue timer.',
      'Player recovery is temporary grace after revival, not a shield pickup or Support pulse. The fixed dashed ring remains game-owned.',
      'No text, background, blur, baked glow, progress painted into the image or new mechanical claims.',
      'Artwork changes no rescue eligibility, duration, cancellation, reserves, grace, collision or input-release rules.',
      'Inspect both Rescuing player and Player recovered scenes, normal/reduced effects, paused/play and Native size.',
    ],
  });
for (const [id, label] of [
  ['team.capture.joint', 'Team joint capture'],
  ['team.recovery', 'Team reserve recovery'],
])
  slot(id, label, 'effects', 'team.outcome.v1', [32, 32], ['couch', 'studio'], {
    required: false,
    requirements: [
      'Centered32×32 transparent badge, pivot(0.5,0.5), crisp sparse pixels; no text, background or glow.',
      'Joint capture marks an actual joined cut. Team recovery marks both craft revived using one team reserve. No extra reward or new ability.',
      'The engine retains player numbers, distinct shapes and outcome text; critical warnings take placement priority.',
      'One second of active game time, paused with the run. Reduced effects keeps a static badge and the same meaning/timing.',
      'Review actual command-earned scenes in both arenas and native size; victory artwork remains unobscured.',
    ],
  });
for (const seat of [1, 2])
  for (const state of TEAM_PILOT_STATES)
    for (const [treatment, size] of [
      ['compact', 32],
      ['detailed', 64],
    ])
      slot(
        `team.pilot.p${seat}.${state}.${treatment}`,
        `Team player ${seat} ${state} ${treatment} body`,
        'players',
        'team.pilot.v1',
        [size, size],
        ['couch', 'studio'],
        {
          required: false,
          occupiedBounds: { x: 0.125, y: 0.125, width: 0.75, height: 0.75 },
          rotorAnchors: [
            [0.25, 0.25],
            [0.75, 0.25],
            [0.25, 0.75],
            [0.75, 0.75],
          ].map(([x, y]) => ({ x, y, radius: 0.12, blades: 3 })),
          dependencies: [`player.scout.${treatment}`, 'player.scout.rotors'],
          requirements: [
            `North-facing ${size}×${size} transparent body for Player ${seat}, state ${state}. No baked propellers, labels, numbers or effects.`,
            'The default team.pilot.v1 recipe explicitly inherits the matching shared Scout body. Uploads replace only this seat/state/treatment.',
            'Keep four bounded motor hubs and the approved silhouette. Pivots and rotor anchors are visual geometry; they never change collision or movement.',
            'Downed and crawling freeze rotors. Crawling follows actual displacement; rescue and recovery preserve real input/state rules.',
            'The game retains number plus circle/diamond identity, contact center, trails, rescue progress and recovery cues above artwork.',
            'Compact applies below480 CSS pixels or Microtile style; detailed otherwise. Inspect the matching Team state and actual-size20/24/32 CSS-pixel readability.',
          ],
        },
      );
for (const id of ['active', 'secured', 'head'])
  slot(`trail.${id}`, `${id} trail`, 'effects', 'trail.signal.v1', null, ['flight', 'couch'], {
    kinds: ['recipe'],
  });
slot('effect.capture', 'Capture pulse', 'effects', 'effect.capture.v1', null, ['flight'], {
  kinds: ['recipe'],
  requirements: [
    'Draw only inside the actual newly captured cells.',
    'Keep active trails and hazards above decorative effects.',
    'Reduced motion removes the animated sweep.',
  ],
});
for (const id of ['failure', 'victory', 'pickup', 'shield', 'respawn', 'pressure'])
  slot(
    `effect.${id}`,
    `${id} feedback`,
    'effects',
    'effect.feedback.v1',
    null,
    ['flight', 'results', 'couch'],
    { kinds: ['recipe'] },
  );
for (const [id, family, recipe] of [
  ['display', 'Handjet', 'font.handjet.v1'],
  ['ui', 'Exo 2', 'font.exo2.v1'],
  ['numeric', 'IBM Plex Mono', 'font.ibm-plex-mono.v1'],
])
  slot(`font.${id}`, `${family} ${id} font`, 'fonts', recipe, null, all, {
    kinds: ['font', 'recipe'],
    requirements: [
      'Support English and the full Ukrainian alphabet including Ґґ Єє Іі Її.',
      'Retain the license and source record.',
      id === 'display'
        ? 'Use only at large display sizes; do not use for body text.'
        : 'Review complete words, numerals and long localized labels.',
    ],
  });
for (const id of ['focus', 'confirm', 'cancel', 'capture', 'failure', 'victory', 'pickup'])
  slot(`audio.${id}`, `${id} audio cue`, 'audio', 'audio.ui.v1', null, all, {
    kinds: ['audio', 'recipe'],
    requirements: [
      'Use original or appropriately licensed audio.',
      'Playback follows existing volume, mute and user-activation preferences.',
      'Sound cannot be the only way to understand state.',
    ],
  });
slot('audio.music', 'Theme music', 'audio', 'audio.music.v1', null, ['title', 'flight', 'couch'], {
  kinds: ['audio', 'recipe'],
});
for (const picture of CURRENT_PICTURES)
  slot(
    picture.id,
    picture.label,
    'pictures',
    'scene.reveal.v1',
    picture.dimensions,
    ['flight', 'picture', 'collection', 'studio'],
    {
      alpha: 'opaque',
      owner: picture.owner,
      required: picture.owner.themeId === 'fpv',
      requirements: [
        'This slot records the exact current map/world owner, not permission to rewrite a saved original.',
        'Register a new asset/presentation revision; preserve saved flights and first-earned picture pins.',
        'Keep gameplay geometry, active actors, text and trails outside the picture asset.',
      ],
    },
  );

export const ASSET_SLOTS = freezePresentation(rows);
export function createDefaultThemeBundle() {
  const assets = ASSET_SLOTS.map((entry) => ({
    format: FORMATS.asset,
    id: `${entry.id}.default`,
    revision: 1,
    kind: 'recipe',
    description: entry.id.startsWith('team.')
      ? `${entry.label}: registered recipe; no new art.`
      : `${entry.label}: registered baseline component; no new raster or audio production is claimed.`,
    provenance: {
      creator: 'Reveal Line',
      source: 'Existing runtime presentation and Field Kit specification',
      license: entry.id.startsWith('team.')
        ? 'Project-authored component'
        : 'Project-authored component; bundled font licenses remain separate',
      prompt: entry.id.startsWith('team.') ? 'Existing recipe; no generated art.' : entry.prompt,
      parent: null,
    },
    file: null,
    recipe: { id: entry.recipes[0] },
    geometry: null,
    quality: { stage: 'source', evidence: [] },
  }));
  return validateThemeBundle({
    format: FORMATS.bundle,
    id: 'field-kit',
    revision: 1,
    slots: structuredClone(ASSET_SLOTS),
    assets,
    themes: [
      {
        format: FORMATS.theme,
        id: 'base',
        revision: 1,
        name: 'Field Kit',
        parent: null,
        tokens: { ...TOKEN_DEFAULTS },
        bindings: Object.fromEntries(
          ASSET_SLOTS.map((entry, i) => [entry.id, { id: assets[i].id, revision: 1 }]),
        ),
      },
      {
        format: FORMATS.theme,
        id: 'fpv',
        revision: 1,
        name: 'FPV Field Kit',
        parent: { id: 'base', revision: 1 },
        tokens: {},
        bindings: {},
      },
    ],
    collections: [],
    selection: {
      base: { id: 'base', revision: 1 },
      theme: { id: 'fpv', revision: 1 },
      collection: null,
    },
  });
}
