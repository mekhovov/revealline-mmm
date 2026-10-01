import { t } from '../i18n/index.mjs';
import { createRewardQrImage } from '../rewards/qr.mjs';

/** Shared player/author preview. It receives no earning or navigation capability. */
export function mountRewardQr({ container, payload, locale = 'en', signal }) {
  const document = container.ownerDocument;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = t('interface:completionRewards.showQr', { lng: locale });
  button.setAttribute('aria-expanded', 'false');
  const picture = document.createElement('img');
  picture.hidden = true;
  picture.alt = t('interface:completionRewards.qrAlt', { lng: locale, url: payload.url });
  picture.style.width = 'min(100%, 20rem)';
  picture.style.height = 'auto';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  container.append(button, picture, status);
  let disposed = false,
    pending = false;
  button.onclick = async () => {
    if (disposed || pending) return;
    if (!picture.hidden) {
      picture.hidden = true;
      picture.removeAttribute('src');
      button.textContent = t('interface:completionRewards.showQr', { lng: locale });
      button.setAttribute('aria-expanded', 'false');
      status.textContent = '';
      return;
    }
    pending = true;
    button.setAttribute('aria-busy', 'true');
    try {
      const image = await createRewardQrImage(payload);
      if (disposed || signal?.aborted) return;
      picture.src = image.src;
      picture.hidden = false;
      button.textContent = t('interface:completionRewards.hideQr', { lng: locale });
      button.setAttribute('aria-expanded', 'true');
      status.textContent = t('interface:completionRewards.qrNote', { lng: locale });
    } catch {
      if (!disposed) {
        status.textContent = t('interface:completionRewards.qrUnavailable', { lng: locale });
      }
    } finally {
      pending = false;
      if (!disposed) button.removeAttribute('aria-busy');
    }
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    button.onclick = null;
    picture.removeAttribute('src');
    button.remove();
    picture.remove();
    status.remove();
    signal?.removeEventListener('abort', dispose);
  }
  signal?.addEventListener('abort', dispose, { once: true });
  if (signal?.aborted) dispose();
  return { dispose };
}
