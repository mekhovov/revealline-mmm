import { TOKEN_DEFAULTS } from './model.mjs';
import { presentationCSSVariables } from './runtime.mjs';

// Menu chrome only. These immutable records are not authored theme, collection,
// asset or canvas revisions and never replace a release's resolved snapshot.
export const NEON_ARCADE_MENU_STYLE = Object.freeze({
  id: 'neon-arcade.menu',
  revision: 1,
  tokens: Object.freeze({
    ink: '#070914',
    panel: '#11152b',
    panelRaised: '#1a2040',
    text: '#f7f4ff',
    muted: '#b9bed6',
    line: '#66709b',
    controlLine: '#7ee7ff',
    cyan: '#7ee7ff',
    amber: '#ffcf5a',
    hazard: '#ff718e',
  }),
  decorative: '#b76cff',
});

export const FPV_FIELD_KIT_MENU_STYLE = Object.freeze({
  id: 'fpv.field-kit-menu',
  revision: 1,
  tokens: Object.freeze({
    ink: '#071527',
    panel: '#10243e',
    panelRaised: '#10243e',
    text: '#f6f3e8',
    muted: '#a8b8cc',
    line: '#a8b8cc',
    controlLine: '#67aaff',
    cyan: '#67aaff',
    amber: '#ffd64a',
    hazard: '#ff7169',
  }),
  decorative: '#0057b7',
});
// Retained source API for older diagnostics; current UI calls this FPV Field Kit.
export const UKRAINIAN_MENU_STYLE = FPV_FIELD_KIT_MENU_STYLE;

const menuColors = Object.freeze([
  'bg',
  'panel',
  'panel-raised',
  'text',
  'muted',
  'line',
  'control-line',
  'cyan',
  'amber',
  'hazard',
]);

export function menuStyleVariables() {
  const entries = [
    ['neon', NEON_ARCADE_MENU_STYLE],
    ['field-kit', FPV_FIELD_KIT_MENU_STYLE],
  ].flatMap(([prefix, style]) => {
    const colors = presentationCSSVariables({
      tokens: { ...TOKEN_DEFAULTS, ...style.tokens },
      assets: {},
    });
    return [
      ...menuColors.map((name) => [`--rl-menu-${prefix}-${name}`, colors[`--fk-${name}`]]),
      [`--rl-menu-${prefix}-decorative`, style.decorative],
    ];
  });
  return Object.freeze(Object.fromEntries(entries));
}

export function resolveMenuStyle({ palette, ornaments }) {
  if (!['auto', 'ukrainian'].includes(palette)) throw new TypeError('Invalid menu palette.');
  if (!['off', 'subtle', 'rich'].includes(ornaments))
    throw new TypeError('Invalid menu ornaments.');
  return Object.freeze({
    // The retained v1 storage values now name two explicit UI skins. They are
    // independent of the selected campaign presentation and actor appearance.
    palette: palette === 'ukrainian' ? 'field-kit' : 'neon',
    ornaments,
  });
}
