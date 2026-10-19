import { operationActivationsMet } from './classic-routing-v5.mjs';
/** Read-only objective projection used by live boards, previews and compact replay. */
export function classicOperationMarkers(run) {
  const recipe = run.level.operation,
    state = run.operation;
  if (!recipe || !state) return [];
  const stage = recipe.stages[state.stage];
  if (!stage) return [];
  const delivered = (id) => state.parcels.some((p) => p.id === id && p.state === 'delivered');
  const ready =
    run.catches >= stage.catches &&
    stage.deliveries.every(delivered) &&
    operationActivationsMet(run, stage);
  const dockLabel = (id) => String.fromCharCode(65 + recipe.docks.findIndex((d) => d.id === id));
  const markers = [];
  for (const parcel of recipe.parcels) {
    if (!stage.deliveries.includes(parcel.id)) continue;
    const progress = state.parcels.find((p) => p.id === parcel.id);
    if (progress.state === 'waiting')
      markers.push({ kind: 'parcel', ...parcel.at, label: dockLabel(parcel.dockId) });
    if (progress.state === 'carried') {
      const snake = run.snakes.find((s) => s.id === progress.carrier);
      const index = state.parcels
        .filter((p) => p.state === 'carried' && p.carrier === progress.carrier)
        .findIndex((p) => p.id === parcel.id);
      const at = snake.body[Math.max(1, snake.body.length - 1 - index)];
      markers.push({ kind: 'attached', ...at, label: dockLabel(parcel.dockId) });
    }
  }
  for (const dock of recipe.docks) {
    const parcels = recipe.parcels.filter(
      (p) => p.dockId === dock.id && stage.deliveries.includes(p.id),
    );
    if (parcels.length)
      markers.push({
        kind: 'dock',
        ...dock.at,
        label: dockLabel(dock.id),
        ready: parcels.every((p) => delivered(p.id)),
      });
  }
  for (const group of recipe.switchyards ?? []) {
    const progress = state.switchyards.find((s) => s.id === group.id);
    for (const at of group.switches)
      markers.push({
        kind: 'switch',
        ...at,
        label: String(progress.selection + 1),
        ready: progress.selection === 1,
      });
    markers.push({
      kind: 'junction',
      ...group.routes[0][0],
      label: String(progress.selection + 1),
      ready: true,
    });
  }
  for (const group of recipe.plates ?? []) {
    const progress = state.plates.find((s) => s.id === group.id);
    for (const at of group.pads)
      markers.push({
        kind: 'plate',
        ...at,
        label: progress.held ? '=' : '≡',
        ready: progress.held,
      });
  }
  if (stage.exit) markers.push({ kind: 'exit', ...stage.exit, label: ready ? '→' : '·', ready });
  return markers;
}

/** Destination shape supplements letters and colour at small cell sizes. */
export function classicCargoShape(label = 'A') {
  return ['crate', 'drum', 'case', 'bundle'][Math.max(0, label.charCodeAt(0) - 65) % 4];
}
function cargo(ctx, shape, label, size, treatment) {
  const x = (28 - size) / 2,
    y = x;
  const paint = (ink, a, b, w, h) => {
    ctx.fillStyle = ink;
    ctx.fillRect(a, b, w, h);
  };
  const metal = treatment === 'night-arcade' ? '#8cd6d1' : '#dfc792';
  const surface =
    treatment === 'toybox' ? '#dfa865' : treatment === 'atmospheric-ruins' ? '#879178' : '#bf905e';
  // Handle, rims and straps describe cargo rather than another letter button.
  paint('#243839', x, y + 2, size, size - 2);
  if (shape === 'drum') {
    paint(surface, x + 2, y, size - 4, size);
    paint(metal, x + 1, y + 1, size - 2, 3);
    paint(metal, x + 1, y + size - 4, size - 2, 3);
    paint('#785a42', x + size - 5, y + 4, 2, size - 8);
  } else if (shape === 'case') {
    paint(metal, x + size / 2 - 3, y - 2, 6, 3);
    paint('#68918c', x + 1, y + 2, size - 2, size - 3);
    paint(metal, x + 1, y + 2, size - 2, 2);
    paint(metal, x + 2, y + size - 4, 3, 3);
    paint(metal, x + size - 5, y + size - 4, 3, 3);
  } else if (shape === 'bundle') {
    paint('#839366', x + 1, y + 1, size - 2, size - 2);
    paint(metal, x + 3, y, 2, size);
    paint(metal, x + size - 5, y, 2, size);
    paint('#aabe8a', x + 5, y + 2, size - 10, 2);
  } else {
    paint(surface, x + 1, y + 1, size - 2, size - 2);
    paint(metal, x + 1, y + 1, size - 2, 2);
    paint('#70513c', x + 3, y + 3, 2, size - 6);
    paint('#70513c', x + size - 5, y + 3, 2, size - 6);
    paint(metal, x + 1, y + size - 3, size - 2, 2);
  }
  paint('#243839', 10, 10, 8, 10);
  ctx.fillStyle = '#fff4d2';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 14, 15);
}

export function drawClassicOperation(
  ctx,
  run,
  { unit = 28, palette, boardStyle = 'living-circuit' } = {},
) {
  const ink = palette ?? { safe: '#a5d5ac', accent: '#e6c47d' };
  for (const marker of classicOperationMarkers(run)) {
    const x = marker.x * unit,
      y = marker.y * unit;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(unit / 28, unit / 28);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff1c5';
    if (marker.kind === 'parcel' || marker.kind === 'attached') {
      if (marker.kind === 'attached') {
        // Straps remain over the occupied cable cell; no trailing ghost parcel.
        ctx.fillStyle = '#d3bd81';
        ctx.fillRect(2, 12, 24, 3);
      }
      cargo(
        ctx,
        classicCargoShape(marker.label),
        marker.label,
        marker.kind === 'attached' ? 14 : 20,
        boardStyle,
      );
    } else {
      const readyInk = marker.ready ? ink.safe : ink.accent;
      ctx.strokeStyle = readyInk;
      ctx.setLineDash(marker.kind === 'exit' && !marker.ready ? [3, 3] : []);
      if (marker.kind === 'dock') {
        // Open receiving bay with matching parcel silhouette; never resembles a wall.
        ctx.fillStyle = '#334b4b';
        for (const edge of [1, 23]) ctx.fillRect(edge, 4, 4, 21);
        ctx.fillRect(1, 23, 26, 3);
        ctx.fillStyle = readyInk;
        ctx.fillRect(2, 4, 2, 6);
        ctx.fillRect(24, 4, 2, 6);
        ctx.globalAlpha = 0.38;
        cargo(ctx, classicCargoShape(marker.label), marker.label, 16, boardStyle);
        ctx.globalAlpha = 1;
        if (marker.ready) {
          ctx.fillStyle = '#183d31';
          ctx.fillRect(7, 9, 14, 13);
          ctx.fillStyle = '#d5efc3';
          ctx.font = 'bold 15px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', 14, 15);
        }
      } else if (marker.kind === 'plate') {
        ctx.fillStyle = '#455958';
        ctx.fillRect(1, 5, 26, 18);
        ctx.strokeRect(1, 5, 26, 18);
        for (let a = 5; a < 25; a += 6) {
          ctx.fillStyle = marker.ready ? '#bddab1' : '#879a83';
          ctx.fillRect(a, marker.ready ? 9 : 7, 3, 10);
        }
      } else if (marker.kind === 'switch') {
        ctx.fillStyle = '#344c4c';
        ctx.fillRect(3, 3, 22, 22);
        ctx.strokeRect(3, 3, 22, 22);
        ctx.fillStyle = '#172d33';
        ctx.fillRect(7, 11, 14, 6);
        ctx.fillStyle = '#d8d6aa';
        ctx.fillRect(marker.ready ? 16 : 7, 7, 4, 13);
        ctx.fillStyle = readyInk;
        ctx.fillRect(marker.ready ? 14 : 5, 5, 8, 5);
        ctx.fillStyle = '#e9edce';
        ctx.fillRect(marker.ready ? 15 : 6, 5, 5, 1);
      } else {
        ctx.beginPath();
        if (marker.kind === 'junction') {
          ctx.moveTo(14, 2);
          ctx.lineTo(26, 14);
          ctx.lineTo(14, 26);
          ctx.lineTo(2, 14);
          ctx.closePath();
        } else ctx.rect(2, 2, 24, 24);
        ctx.stroke();
        ctx.fillStyle = '#193338';
        ctx.fillRect(7, 7, 14, 14);
        ctx.fillStyle = marker.ready ? '#c1f7cf' : '#ffe3a6';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(marker.label, 14, 14);
      }
    }
    ctx.restore();
  }
}

export function drawClassicOperationLinks(ctx, run, { unit = 28, palette } = {}) {
  if (!run.level.operation) return;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = palette.accent;
  ctx.setLineDash([3, 5]);
  const line = (a, b) => {
    ctx.beginPath();
    ctx.moveTo((a.x + 0.5) * unit, (a.y + 0.5) * unit);
    ctx.lineTo((b.x + 0.5) * unit, (a.y + 0.5) * unit);
    ctx.lineTo((b.x + 0.5) * unit, (b.y + 0.5) * unit);
    ctx.stroke();
  };
  for (const group of run.level.operation.switchyards ?? []) {
    for (const at of group.switches) line(at, group.routes[0][0]);
    const state = run.operation.switchyards.find((s) => s.id === group.id);
    ctx.setLineDash([]);
    ctx.beginPath();
    group.routes[state.selection].forEach((p, i) => {
      if (i) ctx.lineTo((p.x + 0.5) * unit, (p.y + 0.5) * unit);
      else ctx.moveTo((p.x + 0.5) * unit, (p.y + 0.5) * unit);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([3, 5]);
  }
  for (const group of run.level.operation.plates ?? [])
    for (const at of group.pads) line(at, group.gates[0]);
  ctx.restore();
}
