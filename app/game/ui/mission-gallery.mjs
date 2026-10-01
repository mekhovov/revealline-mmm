import { localizedText } from '../i18n/index.mjs';
import { fieldKitCopy } from './field-kit-copy.mjs';
import { captureOperationFocus } from './operation-focus.mjs';

/** Artwork-first presentation of the host's existing mission buttons and locks. */
export function attachMissionGallery({ document: doc = globalThis.document, missions } = {}) {
  if (!missions) return null;
  const copy = (key) => fieldKitCopy(key, doc.documentElement?.lang || 'en');
  const make = (tag, className, text) => {
    const node = doc.createElement(tag);
    node.className = className;
    if (text) localizedText(node, () => text);
    return node;
  };
  const pager = make('nav', 'mission-gallery-pages'),
    previous = make('button', 'button secondary', copy('navigation.previousPage')),
    status = make('span', 'field-kit-secondary'),
    next = make('button', 'button secondary', copy('navigation.nextPage'));
  pager.setAttribute('aria-label', copy('missions.pages'));
  previous.type = next.type = 'button';
  status.setAttribute('role', 'status');
  pager.append(previous, status, next);
  missions.after(pager);
  missions.classList.add('mission-gallery');
  const tiles = new Map();
  let page = 0,
    selectedKey = '',
    selectionFocus = null,
    destroyed = false;
  function sync() {
    if (destroyed) return;
    const buttons = [...missions.children].filter((node) => node.tagName === 'BUTTON');
    const selected = buttons.findIndex((node) => node.classList.contains('selected'));
    const key = `${buttons.map((node) => node.querySelector('.name')?.textContent).join('|')}::${selected}`;
    if (key !== selectedKey) {
      selectedKey = key;
      page = Math.floor(Math.max(0, selected) / 6);
    }
    page = Math.min(page, Math.max(0, Math.ceil(buttons.length / 6) - 1));
    for (const [button, { tile }] of tiles)
      if (!buttons.includes(button)) {
        tile.remove();
        tiles.delete(button);
      }
    buttons.forEach((button, index) => {
      button.hidden = Math.floor(index / 6) !== page;
      button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
      const signature = `${button.disabled}:${button.dataset.pictureState}:${button.dataset.missionArtwork ?? ''}`;
      const old = tiles.get(button);
      if (old?.signature === signature) return;
      old?.tile.remove();
      const tile = make('span', 'mission-gallery-art'),
        label = make(
          'span',
          'mission-gallery-state',
          button.disabled
            ? copy('missions.locked')
            : button.dataset.pictureState === 'earned'
              ? copy('missions.earned')
              : button.dataset.pictureState === 'unavailable'
                ? copy('missions.unavailable')
                : button.dataset.pictureState === 'loading'
                  ? copy('missions.loading')
                  : copy('missions.concealed'),
        );
      if (!button.disabled && button.dataset.pictureState === 'loading') {
        const signal = make('span', 'operation-status-signal');
        signal.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 3; i++) signal.append(make('i', ''));
        label.append(signal);
        label.classList.add('operation-status');
        label.dataset.state = 'busy';
      }
      tile.setAttribute('aria-hidden', 'true');
      tile.dataset.scene = String(index % 3);
      if (
        button.dataset.pictureState === 'earned' &&
        /^data:image\/(?:png|jpeg|webp);base64,/u.test(button.dataset.missionArtwork || '')
      ) {
        const picture = make('img', 'mission-gallery-picture');
        picture.alt = '';
        picture.loading = 'lazy';
        picture.decoding = 'async';
        picture.src = button.dataset.missionArtwork;
        tile.append(picture);
      }
      tile.append(label);
      button.append(tile);
      tiles.set(button, { tile, signature });
    });
    pager.hidden = buttons.length <= 6;
    previous.disabled = page === 0;
    next.disabled = (page + 1) * 6 >= buttons.length;
    localizedText(status, () => `${page + 1} / ${Math.max(1, Math.ceil(buttons.length / 6))}`);
  }
  const move = (delta) => {
    page += delta;
    sync();
    // Keep focus on a usable paging action when the current one becomes disabled.
    (delta > 0 && next.disabled
      ? previous
      : delta < 0 && previous.disabled
        ? next
        : delta > 0
          ? next
          : previous
    ).focus();
  };
  previous.onclick = () => move(-1);
  next.onclick = () => move(1);
  const chosen = (event) => {
    const button = event.target?.closest?.('button');
    if (!button || button.disabled || !missions.contains(button)) return;
    selectionFocus?.lease.cancel();
    // Capture before the host's handler rebuilds cards and detaches the clicked
    // artwork/status subtree. A later focus choice or dialog still wins.
    selectionFocus = {
      event,
      lease: captureOperationFocus(button, {
        document: doc,
        resolveTarget: () => {
          const selected = missions.querySelector('.selected');
          return selected?.dataset.level === button.dataset.level ? selected : null;
        },
      }),
    };
  };
  const finishChosen = (event) => {
    const owner = selectionFocus;
    if (!owner || owner.event !== event) return;
    // Native dispatch may checkpoint microtasks between listener callbacks.
    // Queue only after the target handler, using the captured event/opener
    // rather than looking up an artwork node that is now detached.
    queueMicrotask(() => {
      if (destroyed || selectionFocus !== owner) return;
      sync();
      if (destroyed || selectionFocus !== owner) return;
      selectionFocus = null;
      owner.lease.restore();
    });
  };
  missions.addEventListener('click', chosen, true);
  missions.addEventListener('click', finishChosen);
  const Observer = doc.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  const observer = typeof Observer === 'function' ? new Observer(sync) : null;
  // Watch replacement of host-owned controls, never our tile or hidden attributes.
  observer?.observe(missions, { childList: true });
  sync();
  return {
    sync,
    destroy() {
      destroyed = true;
      selectionFocus?.lease.cancel();
      selectionFocus = null;
      observer?.disconnect();
      missions.removeEventListener('click', chosen, true);
      missions.removeEventListener('click', finishChosen);
      for (const [button, { tile }] of tiles) {
        button.hidden = false;
        tile.remove();
      }
      pager.remove();
      missions.classList.remove('mission-gallery');
    },
  };
}
