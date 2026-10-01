import { contentText } from '../i18n/content.mjs';
import { localizedMessage, localizedText, t, localizedAttribute } from '../i18n/index.mjs';
import {
  ENEMY_GUIDE_TOPICS,
  enemyGuideEntry,
  enemyGuidePracticeInstructions,
  createEnemyGuideScenario,
} from '../enemy-guide.mjs';
import { ENEMY_THEMES } from '../enemy-catalog.mjs';
import { isEncounterGuideTopic, encounterGuideAvailability } from '../encounter-guide.mjs';
import { prepareScenario } from '../imports.mjs';
import { createActorPresentation, drawPresentedActor } from './actor-presentation.mjs';
import { createEnemyBodyAssets } from './enemy-body-assets.mjs';
import { attachEnemyWorkshopReturnHost } from './enemy-workshop-return.mjs';
import { gameDocumentURL } from '../community-routes.mjs';
import { observePreviewReadiness } from '../studio/preview-readiness.mjs';

const HANDOFF = 'revealline-mmm.playground.current';
// Illustration size only; the sampled pose and its contact radius remain unchanged.
const PREVIEW_BODY_DIAMETER = 56;

/** Player-only guide. The caller owns flight pausing, music and the shared navigation router. */
export function attachEnemyGuide({
  document: doc = globalThis.document,
  window: host = globalThis.window,
  themes,
  getThemeId = () => 'fpv',
  getPresentation = () => null,
  getTurnPolicy = () => 'immediate',
  getLevel = () => null,
  getRunOptions = () => undefined,
  getMissionTheme = () => null,
  resolveEncounterPracticeURL = () => null,
  // Catalog lessons use the generic scenario handoff. Edition hosts admit only
  // their current-mission reconstruction and must opt out of this separate route.
  catalogPracticeAvailable = true,
  createBodyAssets = createEnemyBodyAssets,
  loadImpactScenario = async () => {
    const response = await fetch(
      new URL('../content/scenarios/line-impact-demo.json', import.meta.url),
    );
    if (!response.ok)
      throw new Error(t('interface:theImpactLessonIsUnavailableTryAgainWhenItsContent'));
    return response.json();
  },
  onPractice = () => {},
  onReturn = () => {},
  onClose = () => {},
  onRead = ({ region }) => region.focus(),
} = {}) {
  let disposed = false,
    busy = false,
    active = false,
    generation = 0,
    origin = null,
    previousHandoff = null,
    ownedHandoff = null,
    parentSuspended = false,
    suspendedTicket = null,
    launchController = null,
    practiceReadiness = null,
    stopPracticeReadiness = null,
    time = 0,
    pageVisible = true,
    previewPose = null,
    previewSettings = { paused: false, reduced: false };
  const poses = createActorPresentation();
  const node = (tag, id, text = '') => {
    const el = doc.createElement(tag);
    if (id) el.id = `enemy-guide-${id}`;
    if (text) localizedText(el, () => text);
    return el;
  };
  const button = (id, label, fn) => {
    const el = node('button', id, label);
    el.type = 'button';
    el.className = 'button secondary';
    el.onclick = fn;
    return el;
  };
  const select = (id, label, items) => {
    const wrap = node('label'),
      caption = node('span', null, label),
      el = node('select', id);
    for (const [value, text] of items) {
      const option = node('option', null, text);
      option.value = value;
      el.append(option);
    }
    wrap.append(caption, el);
    return { wrap, el };
  };
  const dialog = node('dialog', 'dialog');
  dialog.className = 'enemy-guide-dialog';
  dialog.setAttribute('aria-labelledby', 'enemy-guide-title');
  const title = node('h2', 'title', localizedMessage('interface:fieldGuide')),
    content = node('div', 'content'),
    status = node('p', 'status'),
    topic = select(
      'topic',
      t('interface:learnAbout'),
      ENEMY_GUIDE_TOPICS.map(({ id, label }) => [id, label]),
    ),
    appearance = select(
      'theme',
      t('interface:appearance'),
      ENEMY_THEMES.map((id) => [id, themes?.find((item) => item.id === id)?.name ?? id]),
    ),
    choices = node('div'),
    canvas = node('canvas', 'preview'),
    previewNote = node('p', 'preview-note'),
    artworkStatus = node('p', 'artwork-status'),
    summary = node('div', 'summary'),
    heading = node('h3', 'heading'),
    form = node('p', 'form'),
    spot = node('p', 'spot'),
    risk = node('p', 'risk'),
    action = node('p', 'try'),
    note = node('p', 'note');
  choices.className = 'enemy-guide-choices';
  choices.append(topic.wrap, appearance.wrap);
  canvas.width = 192;
  canvas.height = 112;
  localizedAttribute(canvas, 'aria-label', () =>
    t('interface:illustratedRolePreviewThePracticeLessonUsesActualGameTiming'),
  );
  summary.tabIndex = 0;
  summary.setAttribute('role', 'region');
  localizedAttribute(summary, 'aria-label', () =>
    t('interface:enemyRecognitionAndPracticeInstructions'),
  );
  summary.setAttribute('data-game-reading', '');
  const read = button('read', localizedMessage('interface:readGuide'), () =>
    onRead({ region: summary, origin: read, label: t('interface:fieldGuide') }),
  );
  const exercise = select('exercise', t('interface:impactExercise'), [
    ['observe', '1 · Observe the strike'],
    ['escape', '2 · Escape with Boost'],
  ]);
  const instructions = node('p', 'instructions');
  summary.append(heading, form, spot, risk, action, note, instructions);
  const previous = button('previous', '← Previous', () => changeTopic(-1)),
    next = button('next', localizedMessage('interface:next'), () => changeTopic(1)),
    play = button('play', localizedMessage('interface:playPractice'), launch),
    back = button('back', localizedMessage('common:actions.closeGuide'), close),
    actions = node('div');
  actions.className = 'enemy-guide-actions';
  actions.append(previous, next, play, back);
  artworkStatus.className = 'enemy-guide-status';
  artworkStatus.setAttribute('role', 'status');
  artworkStatus.hidden = true;
  previewNote.className = 'enemy-guide-status';
  content.append(
    choices,
    canvas,
    previewNote,
    artworkStatus,
    read,
    summary,
    exercise.wrap,
    actions,
  );
  const practice = node('div', 'practice'),
    practiceHint = node('p', 'practice-hint'),
    frame = node('iframe', 'frame'),
    returnButton = button(
      'return',
      localizedMessage('interface:returnToFieldGuide'),
      returnFromPractice,
    );
  practice.hidden = true;
  frame.hidden = true;
  localizedAttribute(frame, 'title', () => t('interface:rewardFreeFieldGuidePractice'));
  frame.setAttribute('allow', 'gamepad; autoplay');
  practice.append(practiceHint, frame, returnButton);
  status.setAttribute('role', 'status');
  status.className = 'enemy-guide-status';
  dialog.append(title, content, practice, status);
  doc.body.append(dialog);
  const context = canvas.getContext?.('2d'),
    bodyAssets = createBodyAssets({ changed: () => paintPreview() }),
    bridge = attachEnemyWorkshopReturnHost({
      window: host,
      frame,
      gameURL: new URL('.', gameDocumentURL(host.location.href)).href,
      returnTo: 'enemy-guide',
      onReturn: returnFromPractice,
    });
  function entry() {
    return enemyGuideEntry(topic.el.value, appearance.el.value);
  }
  function canonicalTheme(id = appearance.el.value) {
    return ENEMY_THEMES.includes(id) ? themes?.find((theme) => theme.id === id) : null;
  }
  function catalogPracticeReady() {
    return catalogPracticeAvailable === true && !!canonicalTheme();
  }
  function refreshAppearances() {
    const available = ENEMY_THEMES.filter(
      (id) => canonicalTheme(id) || compiledPreview(id, topic.el.value),
    );
    for (const option of appearance.el.children)
      option.disabled = !available.includes(option.value);
    if (!available.includes(appearance.el.value)) appearance.el.value = available[0] ?? 'fpv';
    appearance.el.disabled = busy || isEncounterGuideTopic(topic.el.value) || available.length < 2;
  }
  function previewPalette() {
    return (
      compiledPreview(appearance.el.value, topic.el.value)?.palette ?? canonicalTheme()?.palette
    );
  }
  function refresh() {
    refreshAppearances();
    const record = entry(),
      encounter = isEncounterGuideTopic(record.id),
      availability = encounter ? encounterGuideAvailability(record.id, getLevel()) : null,
      missingPreview = !encounter && record.id !== 'line-impact' && !previewPalette();
    canvas.hidden = encounter || missingPreview;
    localizedText(previewNote, () =>
      encounter
        ? t('interface:encounterGuide.previewNote')
        : missingPreview
          ? t('interface:guidePreviewUnavailable')
          : record.id === 'line-impact'
            ? t('interface:lineImpactDiagramPracticeUsesActualTiming')
            : t('interface:enlargedIllustrationCenterDotMarksContact'),
    );
    canvas.setAttribute('aria-label', previewNote.textContent);
    localizedText(heading, () => entry().label);
    localizedText(form, () => entry().form);
    localizedText(spot, () => t('interface:encounterGuide.spot', { text: entry().spot }));
    localizedText(risk, () => t('interface:encounterGuide.risk', { text: entry().risk }));
    localizedText(action, () => t('interface:encounterGuide.try', { text: entry().try }));
    localizedText(note, () => entry().note);
    exercise.wrap.hidden = record.id !== 'line-impact';
    localizedText(instructions, () =>
      !encounter && !catalogPracticeReady()
        ? t('interface:guideCatalogPracticeUnavailable')
        : [
            enemyGuidePracticeInstructions(record.id, exercise.el.value),
            availability ? t(`interface:encounterGuide.${availability.reason}`) : '',
          ]
            .filter(Boolean)
            .join(' '),
    );
    for (const el of [topic.el, exercise.el, previous, next, play]) el.disabled = busy;
    play.disabled = busy || (encounter ? !availability.available : !catalogPracticeReady());
    localizedText(play, () =>
      busy ? t('interface:preparingPractice') : t('interface:playPractice'),
    );
    update(0, previewSettings);
  }
  function changeTopic(delta) {
    if (busy || active || disposed) return;
    const index = ENEMY_GUIDE_TOPICS.findIndex(({ id }) => id === topic.el.value);
    topic.el.value =
      ENEMY_GUIDE_TOPICS[
        (index + delta + ENEMY_GUIDE_TOPICS.length) % ENEMY_GUIDE_TOPICS.length
      ].id;
    poses.reset();
    releasePreview();
    refresh();
  }
  topic.el.onchange = () => {
    poses.reset();
    releasePreview();
    refresh();
  };
  appearance.el.onchange = () => {
    poses.reset();
    releasePreview();
    refresh();
  };
  exercise.el.onchange = refresh;
  topic.el.value = ENEMY_GUIDE_TOPICS[0].id;
  appearance.el.value = 'fpv';
  exercise.el.value = 'observe';
  function restoreHandoff() {
    let failure = null;
    if (ownedHandoff !== null) {
      try {
        if (host.sessionStorage.getItem(HANDOFF) === ownedHandoff) {
          if (previousHandoff === null) host.sessionStorage.removeItem(HANDOFF);
          else host.sessionStorage.setItem(HANDOFF, previousHandoff);
        }
      } catch {
        failure = t('interface:practiceEndedItsTemporaryHandoffCouldNotBeRestored');
      }
    }
    ownedHandoff = null;
    previousHandoff = null;
    return failure;
  }
  function pausePracticeReadiness() {
    stopPracticeReadiness?.();
    stopPracticeReadiness = null;
  }
  function practiceReadinessCurrent(owner) {
    return (
      practiceReadiness === owner &&
      active &&
      owner.current() &&
      frame.src === owner.url &&
      frame.contentWindow === owner.window
    );
  }
  function recoverPracticeFocus() {
    const owner = practiceReadiness;
    if (!owner?.returnFocusPending) return;
    if (!practiceReadinessCurrent(owner) || doc.activeElement !== frame) {
      owner.returnFocusPending = false;
      return;
    }
    if (!pageVisible || doc.hidden || doc.hasFocus?.() === false) return;
    // A visible but inactive window may observe failure. Defer only the focus
    // handoff; a later navigation, reload or focus choice retires that request.
    owner.returnFocusPending = false;
    try {
      const child = frame.contentDocument;
      if (
        child !== owner.failedDocument ||
        child?.URL !== owner.url ||
        child.documentElement?.dataset.bootState !== 'failed'
      )
        return;
    } catch {
      return;
    }
    returnButton.focus({ preventScroll: true });
  }
  function resumePracticeReadiness() {
    pausePracticeReadiness();
    recoverPracticeFocus();
    const owner = practiceReadiness;
    if (!owner || owner.settled || !pageVisible || doc.hidden) return;
    const current = () => practiceReadinessCurrent(owner);
    if (!current()) return;
    let observedDocument;
    stopPracticeReadiness = observePreviewReadiness({
      expectedURL: owner.url,
      readDocument: () => (observedDocument = frame.contentDocument),
      isCurrent: () => current() && pageVisible && !doc.hidden,
      notify: (state) => {
        if (!current() || !pageVisible || doc.hidden || state === 'slow') return;
        // Settle at readiness: the running lesson owns its recovery controls.
        // A failed boot keeps its own detail and the exact temporary handoff.
        owner.settled = true;
        stopPracticeReadiness = null;
        if (state === 'failed') {
          localizedText(status, () => t('interface:enemyGuide.practiceBootFailed'));
          owner.failedDocument = observedDocument;
          owner.returnFocusPending = doc.activeElement === frame;
          recoverPracticeFocus();
        }
      },
    });
  }
  function stopPractice() {
    pausePracticeReadiness();
    practiceReadiness = null;
    active = false;
    frame.hidden = true;
    frame.src = 'about:blank';
    practice.hidden = true;
    content.hidden = false;
    const failure = restoreHandoff();
    if (parentSuspended) {
      parentSuspended = false;
      suspendedTicket = null;
      onReturn();
    }
    return failure;
  }
  function returnFromPractice() {
    if (disposed || !active) return;
    generation++;
    const failure = stopPractice();
    localizedText(
      status,
      () => failure ?? t('interface:practiceEndedYourCampaignRemainsPausedNoProgressWasAwarded'),
    );
    play.focus({ preventScroll: true });
    refresh();
  }
  async function launch() {
    if (disposed || busy || active || !dialog.open) return false;
    // Disabled controls are only presentation: reject stale/direct activation
    // before fetching, suspending the parent or touching its temporary handoff.
    if (!isEncounterGuideTopic(topic.el.value) && !catalogPracticeReady()) return false;
    const ticket = ++generation,
      selected = topic.el.value,
      selectedTheme = appearance.el.value,
      turnPolicy = getTurnPolicy(),
      encounter = isEncounterGuideTopic(selected),
      levelOwner = encounter ? getLevel() : null;
    const controller = new AbortController();
    launchController = controller;
    busy = true;
    localizedText(status, () => t('interface:preparingAnIsolatedLesson'));
    refresh();
    const current = () =>
      !disposed &&
      dialog.open &&
      ticket === generation &&
      (!encounter || getLevel() === levelOwner);
    try {
      // Own exact level/setup/theme before the first asynchronous preparation.
      // Replacing the loaded mission retires this launch; caller edits cannot
      // rewrite the already validated candidate.
      const candidate = encounter
        ? createEnemyGuideScenario({
            topic: selected,
            themeId: selectedTheme,
            turnPolicy,
            themes,
            encounterLevel: levelOwner,
            encounterTheme: getMissionTheme(),
            runOptions: getRunOptions(),
          })
        : null;
      const impactScenario = selected === 'line-impact' ? await loadImpactScenario() : null;
      if (!current()) return false;
      const prepared = await prepareScenario(
        candidate ??
          createEnemyGuideScenario({
            topic: selected,
            themeId: selectedTheme,
            turnPolicy,
            themes,
            impactScenario,
          }),
      );
      if (!current()) return false;
      const returnURL = bridge.launchURL(),
        resolvedURL = encounter
          ? resolveEncounterPracticeURL({
              scenario: prepared.scenario,
              returnURL,
            })
          : null,
        url = resolvedURL ?? returnURL;
      if (resolvedURL !== null && typeof resolvedURL !== 'string')
        throw new TypeError(t('interface:practiceMustRemainOnTheSameOrigin'));
      const checkedURL = new URL(url, host.location.href);
      if (
        !['http:', 'https:'].includes(checkedURL.protocol) ||
        checkedURL.origin !== new URL(host.location.href).origin
      )
        throw new TypeError(t('interface:practiceMustRemainOnTheSameOrigin'));
      parentSuspended = true;
      suspendedTicket = ticket;
      await onPractice({ signal: controller.signal, isCurrent: current });
      if (!current()) {
        if (suspendedTicket === ticket) stopPractice();
        return false;
      }
      if (resolvedURL === null) {
        previousHandoff = host.sessionStorage.getItem(HANDOFF);
        ownedHandoff = JSON.stringify(prepared.scenario);
        host.sessionStorage.setItem(HANDOFF, ownedHandoff);
      }
      active = true;
      content.hidden = true;
      practice.hidden = false;
      localizedText(practiceHint, () =>
        t('gameplay:pauseToRestartOrReturnToFieldGuide', {
          value1: enemyGuidePracticeInstructions(selected, exercise.el.value),
        }),
      );
      frame.src = checkedURL.href;
      frame.hidden = false;
      frame.focus();
      localizedText(status, () =>
        t('interface:practiceOnlyCampaignProgressAndSavedFlightsAreUnchanged'),
      );
      practiceReadiness = {
        current,
        url: checkedURL.href,
        window: frame.contentWindow,
        settled: false,
      };
      resumePracticeReadiness();
      return true;
    } catch (error) {
      if (current()) {
        stopPractice();
        localizedText(status, () => t('gameplay:practiceDidNotOpen', { value1: error.message }));
      }
      return false;
    } finally {
      if (launchController === controller) launchController = null;
      if (ticket === generation) {
        busy = false;
        if (!disposed) refresh();
      }
    }
  }
  function previewVisible() {
    return (
      !disposed &&
      dialog.open &&
      !dialog.hidden &&
      !content.hidden &&
      !active &&
      !busy &&
      pageVisible &&
      !doc.hidden &&
      doc.visibilityState !== 'hidden' &&
      !!context
    );
  }
  function releasePreview() {
    bodyAssets.clear();
    previewPose = null;
    localizedText(artworkStatus, () => '');
    artworkStatus.hidden = true;
  }
  function compiledPreview(themeId = previewPose?.themeId, type = previewPose?.type) {
    if (themeId !== 'fpv') return null;
    const snapshot = getPresentation();
    const sprite = snapshot?.image?.(`enemy.${type}`);
    return sprite ? { ...sprite, palette: snapshot.canvas.palette } : null;
  }
  function updatePreviewAssets() {
    if (compiledPreview()) bodyAssets.clear();
    else bodyAssets.update([previewPose]);
  }
  // A host snapshot change selects artwork for the existing sampled pose only.
  function refreshPresentation() {
    if (
      !previewVisible() ||
      topic.el.value === 'line-impact' ||
      isEncounterGuideTopic(topic.el.value)
    )
      return;
    // Re-evaluate available roles when the selected presentation becomes ready
    // or retires. A zero-delta refresh preserves the held cosmetic clocks.
    refresh();
  }
  // A decode completion repaints the sampled frame without advancing either clock.
  function paintPreview() {
    if (!previewVisible()) {
      releasePreview();
      return;
    }
    if (canvas.hidden) return;
    context.clearRect(0, 0, 192, 112);
    context.fillStyle = '#080d19';
    context.fillRect(0, 0, 192, 112);
    if (topic.el.value === 'line-impact') {
      context.fillStyle = '#56b9c5';
      context.fillRect(20, 51, 152, 2);
      context.fillRect(18, 43, 5, 18);
      context.fillStyle = '#fff0b2';
      context.fillRect(166, 45, 12, 12);
      const travel = previewSettings.reduced ? 20 : (time % 1) * 24;
      for (const x of [85 - travel, 100 + travel]) {
        context.fillStyle = '#ffbb67';
        context.fillRect(x - 3, 47, 6, 10);
        context.fillRect(x - 5, 50, 10, 4);
      }
      return;
    }
    const compiled = compiledPreview(),
      body = compiled ?? bodyAssets.current(previewPose),
      palette = compiled?.palette ?? canonicalTheme()?.palette;
    if (!palette) {
      canvas.hidden = true;
      releasePreview();
      localizedText(previewNote, () => t('interface:guidePreviewUnavailable'));
      return;
    }
    drawPresentedActor(
      context,
      { ...previewPose, diameter: PREVIEW_BODY_DIAMETER },
      palette,
      body?.image,
      compiled?.geometry,
      compiled ? null : body?.record,
    );
    localizedText(artworkStatus, () => (compiled ? '' : bodyAssets.status()));
    artworkStatus.hidden = !artworkStatus.textContent;
  }
  function update(dt = 0, { paused = false, reduced = false } = {}) {
    if (
      !previewVisible() ||
      isEncounterGuideTopic(topic.el.value) ||
      (topic.el.value !== 'line-impact' && !previewPalette())
    ) {
      releasePreview();
      return;
    }
    previewSettings = { paused, reduced };
    const snapshot =
      appearance.el.value === 'fpv' && topic.el.value !== 'line-impact' ? getPresentation() : null;
    const motionScale = snapshot?.image?.(`enemy.${topic.el.value}`)
      ? (snapshot.canvas.motionScale ?? 1)
      : 1;
    const motionDt = dt * motionScale;
    reduced = reduced || motionScale === 0;
    if (!paused && !reduced)
      time += Math.max(0, Math.min(0.1, Number.isFinite(motionDt) ? motionDt : 0));
    if (topic.el.value === 'line-impact') {
      releasePreview();
      paintPreview();
      return;
    }
    const actor = {
      id: 'guide-preview',
      type: topic.el.value,
      x: ['lane-boss', 'relay-sentinel'].includes(topic.el.value)
        ? 6
        : 6 + Math.sin(time * 2) * 0.6,
      y: ['lane-boss', 'relay-sentinel'].includes(topic.el.value)
        ? 3.5
        : 3.5 + Math.cos(time * 2) * 0.45,
      vx: 1,
      vy: -1,
      radius: 0.25,
    };
    previewPose = poses
      .sample([actor], {
        tick: Math.floor(time * 120),
        time,
        dt: motionDt,
        paused,
        reduced,
        themeId: appearance.el.value,
        style: 'hybrid',
        scale: 1.5,
      })
      .get(actor.id);
    updatePreviewAssets();
    paintPreview();
  }
  function open({ topic: selected } = {}) {
    if (disposed || busy || active) return false;
    if (selected) {
      enemyGuideEntry(selected);
      topic.el.value = selected;
    }
    const theme = getThemeId();
    appearance.el.value = ENEMY_THEMES.includes(theme) ? theme : 'fpv';
    releasePreview();
    if (!dialog.open) {
      origin = doc.activeElement;
      dialog.showModal();
    }
    localizedText(status, () =>
      t('interface:recognizeAThreatThenTryItPracticeNeverAwardsCampaign'),
    );
    refresh();
    topic.el.focus({ preventScroll: true });
    return true;
  }
  function close() {
    if (disposed || !dialog.open) return false;
    if (active) {
      returnFromPractice();
      return false;
    }
    generation++;
    busy = false;
    launchController?.abort();
    launchController = null;
    if (parentSuspended) stopPractice();
    releasePreview();
    dialog.close();
    if (origin?.isConnected && !origin.closest('[hidden]')) origin.focus({ preventScroll: true });
    onClose();
    return true;
  }
  const cancel = (event) => {
    event.preventDefault();
    close();
  };
  const visibility = () => {
    // Readiness can change while hidden, when presentation notifications must
    // not paint. Reconcile the selected role before the first visible repaint.
    if (previewVisible()) refresh();
    else releasePreview();
    resumePracticeReadiness();
  };
  const pageHide = () => {
    pageVisible = false;
    releasePreview();
    pausePracticeReadiness();
  };
  const pageShow = () => {
    pageVisible = true;
    visibility();
  };
  const closed = () => {
    if (!dialog.open) {
      releasePreview();
      pausePracticeReadiness();
      practiceReadiness = null;
    }
  };
  const focusChanged = () => {
    if (practiceReadiness?.returnFocusPending && doc.activeElement !== frame)
      practiceReadiness.returnFocusPending = false;
  };
  dialog.addEventListener('cancel', cancel);
  dialog.addEventListener('close', closed);
  doc.addEventListener('visibilitychange', visibility);
  doc.addEventListener('focusin', focusChanged);
  host.addEventListener('focus', recoverPracticeFocus);
  host.addEventListener('pagehide', pageHide);
  host.addEventListener('pageshow', pageShow);
  refresh();
  return {
    dialog,
    frame,
    open,
    close,
    update,
    refreshPresentation,
    get practiceActive() {
      return active;
    },
    ownsPracticeFocus: () => active && doc.activeElement === frame,
    dispose() {
      if (disposed) return;
      generation++;
      busy = false;
      launchController?.abort();
      launchController = null;
      stopPractice();
      disposed = true;
      releasePreview();
      bridge.dispose();
      dialog.removeEventListener('cancel', cancel);
      dialog.removeEventListener('close', closed);
      doc.removeEventListener('visibilitychange', visibility);
      doc.removeEventListener('focusin', focusChanged);
      host.removeEventListener('focus', recoverPracticeFocus);
      host.removeEventListener('pagehide', pageHide);
      host.removeEventListener('pageshow', pageShow);
      dialog.remove();
    },
  };
}
