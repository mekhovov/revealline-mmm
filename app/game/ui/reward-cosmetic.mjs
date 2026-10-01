import { required } from '../data-json.mjs';
import { t } from '../i18n/index.mjs';
import { validateCompletionRewardPayload } from '../rewards/model.mjs';
import { resolveRewardCosmetic } from '../rewards/cosmetics.mjs';
import { acquireRewardCosmeticImage } from '../rewards/cosmetic-image.mjs';
import { paintCharacter } from '../../authoring/motion-lab/render-character.mjs';
import { createAnimationState, advanceAnimation } from '../../authoring/motion-lab/animation.mjs';
import { startPreviewMotion } from './preview-motion.mjs';
import { bodyMotionPose } from './body-motion.mjs';

/** Shared earned/Studio cosmetic preview using the same body and animation
 * renderer. The only optional host action opens its existing appearance picker. */
export function mountRewardCosmetic({
  container,
  payload: input,
  registry,
  provider,
  locale = 'en',
  preview = false,
  window = globalThis.window,
  motionPreferences = null,
  signal,
  onChoose = null,
  onRecover = null,
  readLocalAsset,
  fetcher,
  decodeImage,
  ImageClass,
  acquire = acquireRewardCosmeticImage,
}) {
  const payload = validateCompletionRewardPayload(input);
  required(payload.type === 'cosmetic', 'Select a cosmetic discovery.');
  const doc = container.ownerDocument,
    tr = (key) => t('interface:rewardCosmetic.' + key, { lng: locale }),
    node = (tag, text) => {
      const value = doc.createElement(tag);
      if (text) value.textContent = text;
      return value;
    },
    root = node('section'),
    canvas = node('canvas'),
    status = node('p'),
    controls = node('div'),
    animate = node('button', tr('animate')),
    pause = node('button', tr('pause')),
    choose = node('button', tr('choose')),
    recover = node('button', tr('recover')),
    retry = node('button', tr('retry')),
    controller = new AbortController();
  root.setAttribute('data-reward-cosmetic', 'true');
  canvas.width = 320;
  canvas.height = 240;
  canvas.style.maxWidth = '100%';
  canvas.style.width = '20rem';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', payload.locales[locale].title);
  status.setAttribute('role', 'status');
  for (const [button, action] of [
    [animate, 'animate'],
    [pause, 'pause'],
    [choose, 'choose'],
    [recover, 'recover'],
    [retry, 'retry'],
  ]) {
    button.type = 'button';
    button.setAttribute('data-cosmetic-action', action);
  }
  controls.append(animate, pause, choose, recover, retry);
  root.append(canvas, controls, node('p', tr(preview ? 'preview' : 'note')), status);
  container.append(root);
  choose.hidden = preview || !onChoose;
  recover.hidden = retry.hidden = true;
  choose.disabled = animate.disabled = pause.disabled = true;
  let disposed = false,
    recipe,
    binding = null,
    stopMotion = null,
    elapsed = 0,
    animation = createAnimationState();
  const abort = () => dispose();
  signal?.addEventListener('abort', abort, { once: true });
  const alive = () => !disposed && !controller.signal.aborted;
  const showMotion = (motion) => {
    stopMotion?.();
    const ctx = canvas.getContext('2d');
    required(ctx, tr('unavailable'));
    stopMotion = startPreviewMotion({
      own: () => {},
      window,
      motion,
      preferences: motionPreferences,
      draw(dt, reduced) {
        if (!alive()) return;
        elapsed += dt;
        animation = advanceAnimation(
          animation,
          recipe.animation,
          { visualSpeed: 0, cruiseSpeed: 6 },
          dt,
          { paused: motion !== 'playing', reducedMotion: reduced },
        );
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pose = bodyMotionPose(recipe.body, { seconds: elapsed, reduced });
        paintCharacter(ctx, {
          body: recipe.body,
          recipe: recipe.animation,
          image: binding?.image ?? null,
          animation,
          colors: { body: '#80CAE8', accent: '#FFFFFF' },
          x: 160,
          y: 120,
          scale: 150 / Math.max(recipe.body.widthCells, recipe.body.heightCells),
          pixel: 1,
          heading: pose.heading,
          bank: pose.bank,
          reducedMotion: reduced,
          showRotors: true,
        });
      },
    });
  };
  const movement = (motion) => {
    if (!alive() || !recipe) return;
    try {
      showMotion(motion);
    } catch {
      status.textContent = tr('unavailable');
    }
  };
  animate.onclick = () => movement('playing');
  pause.onclick = () => movement('paused');
  choose.onclick = () => {
    if (alive() && !preview && recipe && !choose.disabled) onChoose?.(payload);
  };
  recover.onclick = () => {
    if (alive() && !preview) onRecover?.(payload);
  };
  let loading = false;
  const load = async () => {
    if (!alive() || loading) return false;
    loading = true;
    retry.hidden = true;
    try {
      recipe = resolveRewardCosmetic(registry, payload);
      status.textContent = tr('loading');
      binding = await acquire(recipe, {
        provider,
        signal: controller.signal,
        fetcher,
        readLocalAsset,
        decodeImage,
        ImageClass,
      });
      if (!alive()) {
        binding?.dispose();
        return false;
      }
      required(!recipe.image || binding?.image, 'The exact character image did not decode.');
      canvas.hidden = false;
      showMotion('paused');
      choose.disabled = animate.disabled = pause.disabled = false;
      status.textContent = tr('ready');
      return true;
    } catch {
      stopMotion?.();
      stopMotion = null;
      binding?.dispose();
      binding = null;
      if (alive()) {
        retry.hidden = false;
        canvas.hidden = true;
        status.textContent = tr('unavailable');
        recover.hidden = preview || !onRecover;
      }
      return false;
    } finally {
      loading = false;
    }
  };
  retry.onclick = () => load();
  const ready = load();
  function dispose() {
    if (disposed) return;
    disposed = true;
    controller.abort();
    stopMotion?.();
    binding?.dispose();
    signal?.removeEventListener('abort', abort);
    animate.onclick = pause.onclick = choose.onclick = recover.onclick = retry.onclick = null;
    root.remove();
  }
  if (signal?.aborted) dispose();
  return { ready, dispose };
}
