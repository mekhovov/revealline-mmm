import { boardPaintSizeForLevel } from './render.mjs';
import { presentationPicturePins } from '../flight-media-pins.mjs';

/** One still from this completed attempt. No media lookup or new presentation pin. */
export function drawResultPicture(canvas, { kind, run, theme, seed, painter, flightPictures }) {
  canvas.hidden = true;
  canvas.width = canvas.height = 0;
  if (kind !== 'won' || run?.status !== 'won') return false;
  const backdrop = flightPictures?.current();
  // Old sessions and explicitly legacy worlds have no managed image slot.
  // A missing still pin must never be replaced with the latest default.
  if (flightPictures && !backdrop && !flightPictures.legacy) {
    try {
      const pins = flightPictures.pins?.();
      const choice =
        pins &&
        presentationPicturePins(pins).choices.find((entry) => entry.identity.themeId === theme.id);
      if (!flightPictures.ready?.(theme.id) || choice?.kind !== 'legacy') return false;
    } catch {
      return false;
    }
  }
  const image = backdrop?.image || painter.images?.background || painter.background;
  if (!image) return false;
  const size = boardPaintSizeForLevel(run.level),
    scale = Math.min(1, 640 / size.width);
  canvas.width = Math.round(size.width * scale);
  canvas.height = Math.round(size.height * scale);
  try {
    painter.drawGallery(canvas.getContext('2d'), {
      theme,
      level: run.level,
      seed,
      image,
      fit: backdrop?.fit || painter.overrides?.background?.fit || 'cover',
      width: canvas.width,
      height: canvas.height,
    });
    canvas.hidden = false;
    return true;
  } catch {
    canvas.width = canvas.height = 0;
    return false;
  }
}
