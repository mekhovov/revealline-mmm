/** Reuse only genuine pillarbox space; never take width away from the game image. */
export function demoInfoPlacement({ width, height, aspect, textFactor = 1 }) {
  if (width <= 600 || height <= 0 || aspect <= 0) return { layout: 'rows', margin: 0 };
  const spare = Math.floor(width - height * aspect);
  const minimum = 180 * textFactor;
  if (spare / 2 - 8 >= minimum) return { layout: 'margins', margin: Math.floor(spare / 2) - 8 };
  if (spare - 16 >= minimum) return { layout: 'side', margin: spare - 16 };
  return { layout: 'rows', margin: 0 };
}

export function attachDemoLayout({ document: doc, dialog, canvas }) {
  const view = doc.defaultView;
  const header = dialog.querySelector?.('.demo-header');
  if (!view?.ResizeObserver || !header) return { refresh() {}, dispose() {} };
  let disposed = false;
  function refresh() {
    if (disposed || !dialog.open) return;
    const css = view.getComputedStyle(dialog);
    const padding = (key) => parseFloat(css[key]) || 0;
    const width = dialog.clientWidth - padding('paddingLeft') - padding('paddingRight');
    const height =
      dialog.clientHeight -
      padding('paddingTop') -
      padding('paddingBottom') -
      header.getBoundingClientRect().height -
      padding('rowGap');
    const { layout, margin } =
      dialog.dataset.details === 'open'
        ? { layout: 'rows', margin: 0 }
        : demoInfoPlacement({
            width,
            height,
            aspect: canvas.width / canvas.height,
            textFactor: parseFloat(css.getPropertyValue('--demo-text-factor')) || 1,
          });
    if (dialog.dataset.infoLayout !== layout) dialog.dataset.infoLayout = layout;
    const value = `${margin}px`;
    if (dialog.style.getPropertyValue('--demo-info-margin') !== value) {
      dialog.style.setProperty('--demo-info-margin', value);
    }
  }
  const resize = new view.ResizeObserver(refresh);
  resize.observe(dialog);
  resize.observe(header);
  const changes = new view.MutationObserver(refresh);
  changes.observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
  changes.observe(dialog, { attributes: true, attributeFilter: ['open', 'data-details'] });
  refresh();
  return {
    refresh,
    dispose() {
      disposed = true;
      resize.disconnect();
      changes.disconnect();
    },
  };
}
