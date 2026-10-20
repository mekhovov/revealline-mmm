import { mountModePlayShell } from './mode-play-shell.mjs';
import { mountModeChoices } from './mode-choice.mjs';
import { attachModalNavigation } from './modal-navigation.mjs';
import { attachFullscreen } from './fullscreen.mjs';
import { setMenuIcon } from './native-menu-icons.mjs';

/** Community presentation around the same menu owner used by the main game.
 * The family host keeps its simulation, recordings, saves and explicit Resume. */
export function mountCoupaPlayShell({
  family, missions, play, settings, getState, hasSavedRound,
  onStart, onContinue, onRetry, onPause, onNext, sound = null, notice,
}) {
  const doc = play.ownerDocument;
  const flower = new URL('../editions/assets/coupa/flower-blue.png', import.meta.url).href;
  const wallpaper = new URL('../editions/assets/coupa/wallpaper-network-2024.png', import.meta.url).href;
  const game = new URL('../', import.meta.url);
  const label = family === 'snake' ? 'Snake' : 'Collections';
  const brand = doc.createElement('span');
  brand.className = 'coupa-wordmark';
  const mark = doc.createElement('img');
  mark.src = flower; mark.alt = ''; mark.className = 'coupa-wordmark-flower';
  const name = doc.createElement('span');
  name.textContent = 'Coupa Village';
  const subtitle = doc.createElement('small');
  subtitle.textContent = label;
  name.append(subtitle); brand.append(mark, name);
  const modes = doc.createElement('nav');
  modes.id = family + '-modes';
  mountModeChoices({
    root: modes, current: family, pause: onPause,
    actions: Object.fromEntries([
      ['solo', 'index.html?edition=coupa-all'],
      ['versus', 'couch/index.html?journey=coupa-all&return=solo'],
      ['team', 'couch/relay-rescue.html?journey=coupa-all&return=solo'],
    ].map(([id, href]) => {
      const link = doc.createElement('a');
      link.href = new URL(href, game).href;
      return [id, link];
    })),
  });
  let shell, previousView;
  const sync = () => {
    if (!shell) return;
    const state = getState();
    const view = {
      phase: state.phase,
      missionName: state.missionName || '',
      summary: state.summary || '',
      navigationContext: label + (state.mode ? ' · ' + state.mode : ''),
      canResume: hasSavedRound(),
      muted: !sound?.checked,
      pauseOpensMenu: true,
    };
    const motion = doc.getElementById('motion')?.checked ? 'off' : 'on';
    if (previousView?.motion === motion && Object.keys(view).every(key => previousView[key] === view[key])) return;
    previousView = { ...view, motion };
    shell.update(view);
    shell.elements.buttons.menu.setAttribute('aria-label', label + ' main menu');
    shell.elements.buttons.pause.textContent = state.phase === 'playing' ? 'Pause' : 'Pause menu';
    doc.body.dataset.coupaMotion = motion;
    result.textContent = state.summary || '';
  };
  const result = doc.createElement('p');
  result.className = 'coupa-result-summary';
  shell = mountModePlayShell({
    document: doc, idPrefix: 'coupa-' + family, modeName: label, locale: 'en',
    slots: { brand, modes, missions, play, settings, results: result },
    wordmarkURL: flower, artworkURL: wallpaper,
    homeLabels: { start: 'Play', missions: 'Select Mission' },
    actions: {
      start: onStart, continue: onContinue, resume: onContinue,
      retry: onRetry, pause: onPause, canResume: hasSavedRound,
      ...(sound ? { toggleSound() {
        sound.checked = !sound.checked;
        sound.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
      } } : {}),
    },
    services: { attachModalNavigation, attachFullscreen,
      setMenuIcon: (node, icon) => setMenuIcon(node, icon === 'menu' ? 'pause' : icon) },
    focusPlay: () => doc.getElementById('pause')?.focus({ preventScroll: true }),
    onSurfaceChange(surface) {
      if (!shell) return;
      const destination = shell.elements.content[surface] || shell.elements.stage;
      if (notice && notice.parentNode !== destination) destination.append(notice);
      if (surface === 'missions') missions.hidden = false;
      sync();
    },
  });
  shell.elements.root.classList.add('coupa-play-shell');
  shell.elements.buttons['mission-start'].hidden = true;
  shell.elements.buttons.menu.setAttribute('aria-label', label + ' main menu');
  shell.elements.header.querySelector('img')?.setAttribute('alt', '');
  shell.elements.title.querySelector('img')?.setAttribute('alt', '');
  const trails = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  trails.setAttribute('viewBox', '0 0 600 600');
  trails.setAttribute('aria-hidden', 'true');
  trails.classList.add('coupa-menu-trails');
  for (const pathData of ['M80 480V220H260V100H520V360H390V480H160', 'M150 520V300H330V170H560']) {
    const path = doc.createElementNS(trails.namespaceURI, 'path');
    path.setAttribute('d', pathData);
    trails.append(path);
  }
  shell.elements.home.prepend(trails);
  const next = doc.createElement('button');
  next.type = 'button'; next.className = 'button primary';
  next.textContent = 'Next mission'; next.onclick = onNext;
  shell.elements.content.results.append(next);
  const refresh = () => {
    sync();
    const hidden = !getState().canNext;
    if (next.hidden !== hidden) next.hidden = hidden;
  };
  doc.getElementById('motion')?.addEventListener('change', refresh);
  sound?.addEventListener('change', refresh);
  if (notice) {
    notice.classList.add('coupa-live-notice');
    shell.elements.content.home.append(notice);
  }
  doc.getElementById('arcade-loading')?.remove();
  // Header and footer of the old catalog are replaced by the shared shell.
  for (const node of doc.querySelectorAll('body > header, body > footer')) node.hidden = true;
  const parent = doc.querySelector('body > main');
  if (parent && !parent.children.length) parent.remove();
  refresh();
  return {
    refresh,
    blocksPlay: shell.blocksPlay,
    showPlay() { play.hidden = false; shell.enterPlay(); refresh(); },
    showMissions() { onPause(); missions.hidden = false; shell.open('missions'); },
    showHome() { onPause(); shell.openHome(); },
    showResults() { refresh(); shell.open('results'); },
    dispose: shell.dispose,
  };
}
