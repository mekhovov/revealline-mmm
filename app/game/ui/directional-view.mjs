import { t } from '../i18n/index.mjs';
import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { CELL, DIRECTIONS } from '../core/registry.mjs';
import { isDirectionalRuleset } from '../core/versions.mjs';
import { compileDirectionalZones, DIRECTIONAL_FIELD_RULES } from '../core/directional-fields.mjs';

const own = (value, key) => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  required(
    descriptor && Object.hasOwn(descriptor, 'value'),
    t('interface:expectedOwnDirectionalVisualData'),
  );
  return descriptor.value;
};
const typedLength = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  'length',
).get;
const visualBounds = Object.freeze({
  width: 72,
  height: 36,
  cells: Object.freeze(Array(2592).fill(CELL.FIELD)),
  terrain: Object.freeze(Array(2592).fill(0)),
});

/** Bounded detached view. It cannot steer, publish, reveal cells or change speed. */
export function directionalView(run) {
  try {
    if (!isDirectionalRuleset(own(run, 'ruleset'))) return null;
    required(
      own(run, 'width') === 72 && own(run, 'height') === 36,
      t('interface:unsupportedDirectionalBoard'),
    );
    const definition = boundedJSON(own(own(run, 'level'), 'directionalFields'), {
      maxBytes: 16384,
      maxNodes: 512,
      maxDepth: 4,
      maxArray: 32,
    });
    exactKeys(definition, ['version', 'zones'], 'directional visual definition');
    required(
      definition.version === DIRECTIONAL_FIELD_RULES.version,
      t('interface:unsupportedDirectionalRecipe'),
    );
    const zones = compileDirectionalZones(definition.zones, visualBounds),
      cells = own(run, 'cells');
    required(
      Object.getPrototypeOf(cells) === Uint8Array.prototype && typedLength.call(cells) === 2592,
      t('interface:expectedOwnedBoardCells'),
    );
    const visible = [],
      fields = [];
    for (const zone of zones) {
      let activeCells = 0;
      for (const index of zone.cells) {
        required(cells[index] <= CELL.WALL, t('interface:invalidOwnership'));
        if (cells[index] !== CELL.FIELD) continue;
        activeCells++;
        visible.push(
          Object.freeze({ x: index % 72, y: Math.floor(index / 72), direction: zone.direction }),
        );
      }
      fields.push(Object.freeze({ id: zone.id, direction: zone.direction, activeCells }));
    }
    return Object.freeze({ fields: Object.freeze(fields), cells: Object.freeze(visible) });
  } catch {
    return null;
  }
}

/** Static outlined arrows stay below trail/actors. No motion or color-only cue. */
export function drawDirectionalFields(ctx, view, size = 16) {
  if (!view?.cells.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const cell of view.cells) {
    const { x: dx, y: dy } = DIRECTIONS[cell.direction];
    const x = (cell.x + 0.5) * size,
      y = (cell.y + 0.5) * size,
      arm = size * 0.28;
    ctx.beginPath();
    ctx.moveTo(x - dx * arm, y - dy * arm);
    ctx.lineTo(x + dx * arm, y + dy * arm);
    ctx.moveTo(x + dx * arm * 0.1 - dy * arm * 0.7, y + dy * arm * 0.1 + dx * arm * 0.7);
    ctx.lineTo(x + dx * arm, y + dy * arm);
    ctx.lineTo(x + dx * arm * 0.1 + dy * arm * 0.7, y + dy * arm * 0.1 - dx * arm * 0.7);
    ctx.strokeStyle = '#10201c';
    ctx.lineWidth = Math.max(2.5, size * 0.22);
    ctx.stroke();
    ctx.strokeStyle = '#cfe4d4';
    ctx.lineWidth = Math.max(1, size * 0.085);
    ctx.stroke();
  }
  ctx.restore();
}
