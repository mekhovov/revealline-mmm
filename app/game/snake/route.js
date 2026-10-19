// Route the unreleased Snake entry to its classic grid edition. The original
// capture-based implementation and its saves remain available by explicit opt-in.
(() => {
  const params = new URL(globalThis.location.href).searchParams;
  if (
    params.getAll('journey').length !== 1 ||
    params.get('journey') !== 'snake-hunt-v1' ||
    params.get('snake-style') === 'capture'
  )
    return;
  const script = document.currentScript;
  const url = new URL('./play.html', script.src);
  url.searchParams.set('mode', script.dataset.mode || 'solo');
  for (const key of ['lang', 'level'])
    if (params.getAll(key).length === 1) url.searchParams.set(key, params.get(key));
  globalThis.RevealLineSnakeRedirect = true;
  globalThis.location.replace(url.href);
})();
