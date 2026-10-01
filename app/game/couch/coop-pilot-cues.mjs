import { contactCueUnderstroke } from '../ui/contact-cue.mjs';

/** Prepared pilot art stays visible inside its real contact footprint. The host
 * owns position and a separate numbered/shape identity badge. No animation or
 * visual body envelope may change this radius. Coordinates are logical cells. */
export function drawPreparedPilotContact(ctx, radius, color, cssCell, contactStyle) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#07111c';
  ctx.lineWidth = contactCueUnderstroke(contactStyle) / cssCell;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 / cssCell;
  ctx.stroke();
  ctx.restore();
}
