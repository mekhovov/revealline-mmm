import { paintCharacter } from '../../authoring/motion-lab/render-character.mjs';
import { createAnimationState, advanceAnimation } from '../../authoring/motion-lab/animation.mjs';
import { bodyMotionPose } from './body-motion.mjs';

/** A decorative title companion driven by the host's existing presentation
 * loop. It borrows the selected painter's decoded image and never loads media,
 * changes the equipped body, schedules frames or reads completion authority. */
export function mountTitleCharacter({ container, getCharacter, paint = paintCharacter }) {
  if (!container) return null;
  const canvas = container.ownerDocument.createElement('canvas');
  canvas.className = 'title-character';
  canvas.width = canvas.height = 384;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  const context = canvas.getContext?.('2d');
  if (!context) return null;
  container.prepend(canvas);
  let disposed = false,
    previous = null,
    wasVisible = false,
    lastReduced = false,
    animation = createAnimationState(),
    elapsed = 0,
    pending = 0;
  return {
    update(dt, { visible, reduced = false }) {
      if (disposed) return;
      if (!visible) {
        canvas.hidden = true;
        wasVisible = false;
        pending = 0;
        return;
      }
      const character = getCharacter();
      if (!character?.body || !character.recipe || (character.body.src && !character.image)) {
        canvas.hidden = true;
        wasVisible = false;
        return;
      }
      const changed =
        !previous ||
        ['body', 'recipe', 'image', 'bodyColor', 'accentColor'].some(
          (key) => character[key] !== previous[key],
        );
      const redraw = changed || !wasVisible || reduced !== lastReduced;
      if (changed) {
        animation = createAnimationState();
        elapsed = 0;
        pending = 0;
      }
      previous = character;
      wasVisible = true;
      lastReduced = reduced;
      canvas.hidden = false;
      if (reduced && !redraw) return;
      pending += Number.isFinite(dt) ? Math.min(0.05, Math.max(0, dt)) : 0;
      if (!redraw && pending < 1 / 30) return;
      const step = reduced ? 0 : pending;
      pending = 0;
      elapsed = (elapsed + step) % 3600;
      animation = advanceAnimation(
        animation,
        character.recipe,
        { visualSpeed: 0, cruiseSpeed: 6 },
        step,
        { reducedMotion: reduced },
      );
      context.clearRect(0, 0, 384, 384);
      const pose = bodyMotionPose(character.body, { seconds: elapsed, reduced });
      paint(context, {
        body: character.body,
        recipe: character.recipe,
        image: character.image ?? null,
        animation,
        colors: { body: character.bodyColor, accent: character.accentColor },
        x: 192,
        y: 192,
        scale: 200 / Math.max(character.body.widthCells, character.body.heightCells),
        pixel: 1,
        heading: pose.heading,
        bank: pose.bank,
        reducedMotion: reduced,
        showRotors: true,
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      previous = null;
      canvas.remove();
    },
  };
}
