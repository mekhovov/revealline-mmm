await globalThis.RevealLineAccess?.ready;
import { COUCH_RESTORE_KEY } from './controller-restore.mjs';
import { createControllerSession } from './controller-session.mjs';
import { mountControllerSetup } from './controller-setup.mjs';
import { boardPlacement } from '../ui/feedback-cues.mjs';
import {
  gameplayTuningDescription,
  gameplayStatusLabel,
  gameplayStatsLabel,
  gameplayDifficultyLabel,
  journeyPresetDescription,
} from '../ui/gameplay-copy.mjs';
import { contentText } from '../i18n/content.mjs';
import { t, localizedText, localizedOption, localizedMessage, render } from '../i18n/index.mjs';
import { attachCouchTouch } from '../ui/couch-touch.mjs';
import { mountPresentationPage } from '../presentation/page.mjs';
import { createCouchShell } from './couch-shell.mjs';
import { createMissionStartCue } from './start-cue.mjs';
import { attachJourneyReactions } from '../ui/journey-reactions.mjs';
import { attachJourneySaveCue } from '../ui/journey-save-cue.mjs';
import { attachJourneyModePictures } from '../ui/journey-mode-pictures.mjs';
import { createBoardFootprints } from './board-footprint.mjs';
import { readVersusSoloReturnToken } from '../mode-return-v2.mjs';
import { prepareCouchChapter } from './couch-chapter.mjs';
import { isOfficialPack } from '../packs.mjs';
import { createCouchInstalledChapters } from './couch-installed-chapters.mjs';
import { createCouchStaticPictures } from './couch-static-pictures.mjs';
import { createCandidateCouchPictures } from './candidate-pictures.mjs';
import { acquireCandidatePicture, isCandidatePictureFor } from '../content-design/picture.mjs';
import { creatorArtworkLoader } from '../creator/bundle.mjs';
import { createCreatorStore } from '../creator/installed.mjs';
import { creatorProfileKey } from '../creator/runtime.mjs';
import { installedCreatorLibrarySources } from '../mission-library/creator-source.mjs';
import { createCandidateVersusHost } from '../content-design/versus-host.mjs';
import {
  journeyActorThemeCandidates,
  createJourneyActorTheme,
  journeyActorThemeMaterial,
} from '../presentation/journey-actor-materials.mjs';
import { loadAuthoredJourneyRoute } from "../editions/standalone/route-loader.mjs";
import { attachOfflineModeNavigation } from '../ui/offline-tool-navigation.mjs';
import { offlineAvailability } from '../offline.mjs';
import { DEFAULT_JOURNEY_ROUTES, resolveJourneyRequest } from '../content-design/default-entry.mjs';
import { authoredJourneyUsesActorMaterials } from '../content-design/mode-href.mjs';
import { createJourneyPreferences } from '../journey/preferences.mjs';
import {
  createGameplayTuningController,
  applyGameplayTuning,
  resolveGameplayTuning,
} from '../gameplay-tuning.mjs';
import { mountGameplayTuning } from '../ui/gameplay-tuning.mjs';
import { journeyDifficultyCatalog, journeyPreset } from '../content-design/catalogs.mjs';
import { createJourneyProfileStore } from '../journey/profile.mjs';
import { attachJourneyChooser } from '../ui/journey-chooser.mjs';
import { createMetadataInstalledMissionLibrary } from '../mission-library/metadata-installed-library.mjs';
import { createMissionLibraryInventory } from '../mission-library/installed-inventory.mjs';
import { materializeMissionPack } from '../mission-library/materialize-pack.mjs';
import { createExternalChapterInventoryReader } from '../external-chapter-pointer.mjs';
import { libraryMissionId } from '../mission-library/library.mjs';
import { librarySuccessor, retainedLibraryMission } from '../mission-library/continuous-next.mjs';
import { trackMissionLibraryOpening } from '../mission-library/opening-intent.mjs';
import { journeyLibrarySource } from '../mission-library/journey-source.mjs';
import { combineJourneyLibrarySources } from '../mission-library/cross-mode-journey.mjs';
import {
  journeyMissionDetails,
  authoredJourneyMissionTags,
} from '../mission-library/journey-presentation.mjs';
import {
  createMissionLibrarySessionState,
  missionLibraryHref,
  readMissionLibraryHandoff,
  readMissionLibraryIntent,
  readMissionLibraryReturn,
} from '../mission-library/handoff.mjs';
import { createCouchChapterInstaller } from './couch-chapter-install.mjs';
import { loadOptionalCatalog } from '../optional-chapters.mjs';
import { createRun } from '../core/index.mjs';
import { normalizedLevel } from '../core/level.mjs';
import { boundedJSON, dataIdentity, exactKeys } from '../data-json.mjs';
import { downloadJSON } from '../content.mjs';
import { arcadeActionCapabilities } from '../core/arcade-actions.mjs';
import { onNativeInactive } from '../platform.mjs';
import {
  createDuel,
  stepDuel,
  pauseDuel,
  resumeDuel,
  DUEL_PROTOCOL,
  UNTIMED_DUEL_PROTOCOL,
} from '../multiplayer.mjs';
import { FIXED_DT, releaseInputs } from '../core/index.mjs';
import { attachCouchInput } from './couch-input.mjs';
import { createControllerRouter } from '../ui/controller-router.mjs';
import { attachControllerConfirmGuard } from '../ui/controller-confirm-guard.mjs';
import { attachControllerNavigation } from '../ui/controller-navigation.mjs';
import { playgroundTabBoundary } from '../ui/playground-tab-boundary.mjs';
import { attachControllerReading } from '../ui/controller-reading.mjs';
import { attachEncounterHelp } from '../ui/encounter-help.mjs';
import { readingInputPrompt } from '../ui/reading-input-prompt.mjs';
import { nextInputModality } from '../input-presentation.mjs';
import { BoardPainter, boardPaintSizeForLevel } from '../ui/render.mjs';
import { encounterView } from '../ui/encounter-view.mjs';
import { Soundscape, DEFAULT_TRACKS } from '../ui/audio.mjs';
import { createAudioMaster } from '../ui/audio-master.mjs';
import { createAudioPreferences } from '../audio-preferences.mjs';
import { attachEncounterDisplayControls } from '../ui/encounter-display-controls.mjs';
import { createDisplayPreferences } from '../display-preferences.mjs';
import { createActorStylePreferences } from '../actor-style-preferences.mjs';
import { prepareActorAppearanceLease } from '../presentation/actor-appearance-lease.mjs';
import { createJourneyVisualThemeIdentityAdapter } from '../presentation/journey-visual-theme-identities.mjs';
import { prepareCampaignVisualThemeContext } from '../presentation/visual-theme-identities.mjs';
import { createExecutionCatalog } from '../campaign-contexts.mjs';
import { verifyIndexedInstalledPack } from '../mission-library/pack-identity.mjs';
import { prepareMissionLibraryIndex } from '../mission-library/classic-source.mjs';
import {
  CLASSIC_RULES_ORIGINAL,
  classicRulesCampaignIdentity,
  projectClassicCurrentRulesLevel,
} from '../mission-library/classic-current-rules.mjs';
import { attachMenuStyleControls } from '../ui/menu-style-controls.mjs';
import { attachPreferenceRestoration } from '../ui/preference-restoration.mjs';
import { settingsTabOwnsKey } from '../ui/settings-panels.mjs';
import { attachPublishedAudio } from '../ui/published-audio.mjs';
import {
  attachInstallOfflinePanel,
  guardInstallOfflineBlur,
  installOfflineOwnsElement,
} from '../ui/install-offline-panel.mjs';
import {
  createOfflineDownloadAccess,
  isOfflinePackageRequired,
} from '../offline-download-access.mjs';
import { ensureVersusEntryPackage } from './versus-package-readiness.mjs';
import { attachCouchMusicHost } from './couch-music-host.mjs';
import { soloCompatibleMusicContext } from './couch-music-context.mjs';
import { campaignKey } from '../library.mjs';
import { createCharacterPresentations } from '../character-presentations.mjs';
import { emptyProgress, unlockedBodies } from '../progress.mjs';
import { createOperationStatus } from '../ui/operation-status.mjs';
import { foundationReturnCaption } from '../ui/foundation-feedback.mjs';
import { releaseExplorerHref } from '../release-explorer.mjs';
import { resultContinuationLabel } from '../ui/result-continuation.mjs';
const $ = (id) => document.getElementById(id);
$('race-release-explorer').href = releaseExplorerHref(
  globalThis.location?.href ?? document.baseURI ?? 'http://localhost/game/couch/',
);
const unclaimedFocus = (element) =>
  !element || element === document.body || element === document.documentElement;
// Capture before attached() can hide a deliberately chosen loader recovery link.
let initialFocusPending =
  unclaimedFocus(document.activeElement) && !document.hidden && document.hasFocus?.() !== false;
const initialFocusChoice = (event) => {
  if (!unclaimedFocus(event.target)) initialFocusPending = false;
};
const initialFocusLost = () => {
  initialFocusPending = false;
};
const initialWindowBlur = guardInstallOfflineBlur(initialFocusLost);
const initialVisibility = () => {
  if (document.hidden) initialFocusLost();
};
const audioMaster = createAudioMaster();
const audioPreferences = createAudioPreferences({
  audioMaster,
  window,
  getStorage: () => localStorage,
  onWarning: (message) => {
    localizedText($('race-audio-status'), () => message);
  },
});
const renderMasterPreferences = ({ muted, volume }) => {
  localizedText($('race-audio'), () =>
    muted ? t('common:audio.unmute') : t('interface:muteSound'),
  );
  localizedText($('race-quick-sound'), () =>
    muted ? t('interface:soundOff') : t('interface:soundOn'),
  );
  $('race-quick-sound').setAttribute('aria-pressed', String(!muted));
  $('race-master-volume').value = volume;
};
const stopMasterView = audioMaster.subscribe(renderMasterPreferences);
const audioRestoration = attachPreferenceRestoration({
  window,
  getSnapshot: () => audioMaster.snapshot(),
  render: renderMasterPreferences,
});
$('race-audio').onclick = () => audioPreferences.setMuted(!audioMaster.snapshot().muted);
$('race-quick-sound').onclick = () => audioPreferences.setMuted(!audioMaster.snapshot().muted);
$('race-master-volume').onchange = () =>
  audioPreferences.setVolume(Number($('race-master-volume').value));
const displayPreferences = createDisplayPreferences({
  window,
  matchMedia,
  getStorage: () => localStorage,
  onWarning: (message, key) => {
    localizedText($('race-display-status'), () => (key ? t(key) : message));
  },
});
const renderDisplayPreferences = (state) => {
  document.body.dataset.textFace = state.textFace;
  document.body.dataset.textSize = state.textSize;
  document.body.dataset.effects = state.effectiveReducedEffects ? 'reduced' : 'full';
  $('race-text-face').value = state.textFace;
  $('race-text-size').value = state.textSize;
  $('race-reduced').checked = state.reducedEffects;
  localizedText($('race-system-reduction'), () =>
    state.effectiveReducedEffects && !state.reducedEffects
      ? t('interface:systemReducedMotionIsActiveYourSavedReducedEffectsChoice')
      : '',
  );
};
const stopDisplayView = displayPreferences.subscribe(renderDisplayPreferences);
const encounterDisplay = attachEncounterDisplayControls({
  document,
  window,
  getStorage: () => localStorage,
  prefix: 'race-',
});
const displayRestoration = attachPreferenceRestoration({
  window,
  getSnapshot: () => displayPreferences.snapshot(),
  render: renderDisplayPreferences,
});
const menuStyle = attachMenuStyleControls({
  document,
  window,
  getStorage: () => localStorage,
  prefix: 'race-',
});
const actorPreferences = createActorStylePreferences({
  window,
  getStorage: () => localStorage,
  onWarning: (message) => {
    localizedText($('race-actor-style-status'), () => message);
  },
});
const stopActorView = actorPreferences.subscribe(({ actorStyle }) => {
  $('race-actor-style').value = actorStyle;
});
$('race-actor-style').onchange = () =>
  actorPreferences.set({ actorStyle: $('race-actor-style').value });
$('race-text-face').onchange = () =>
  displayPreferences.set({ textFace: $('race-text-face').value });
$('race-text-size').onchange = () =>
  displayPreferences.set({ textSize: $('race-text-size').value });
$('race-reduced').onchange = () =>
  displayPreferences.set({ reducedEffects: $('race-reduced').checked });
globalThis.RevealLineToolLaunch?.attached();
document.documentElement.dataset.toolState = 'loading';
const bootStatus = createOperationStatus($('boot-status'));
const bootDisplay = bootStatus.begin({
  message: t('interface:preparingBothBoards'),
  stage: 'reading',
});
let bootFailed = false;
let bootFinished = false;
function finishBoot() {
  if (bootFinished) return;
  bootFinished = true;
  document.querySelectorAll('[data-boot-inert]').forEach((element) => {
    element.inert = false;
    element.removeAttribute('aria-busy');
  });
  if (!bootFailed) {
    bootDisplay.clear();
    $('boot-return').hidden = true;
  }
}

const artworkLifetime = new AbortController();
const presentationFeedback = createOperationStatus($('race-presentation-status'));
let presentationOperation = null;
const presentationPage = mountPresentationPage({
  onStatus(status) {
    if (status.status === 'preparing') {
      if (!presentationOperation) presentationOperation = presentationFeedback.begin(status);
      else presentationOperation.update(status);
    } else {
      // This branded build deliberately omits the main game's optional
      // presentation release and keeps the authored Coupa artwork.
      presentationOperation?.finish({ state: 'ready', message: '' });
      presentationOperation = null;
    }
  },
});
// Cosmetic menu choice follows this same accepted release; it owns no board lease.
presentationPage.ready.then((snapshot) => menuStyle.setPresentation(snapshot)).catch(() => {});
let featured,
  installed,
  staticPictures,
  creatorStore,
  publishedAudio,
  publishedPlayer,
  pageSound,
  music,
  boardFootprints,
  candidateJourney,
  journeyPreferences,
  journeyPictures;
const creatorProfiles = new Map(),
  creatorVersusEditions = new Map(),
  creatorVersusOwners = new WeakMap();
// Read-only fallback for remote Journey cards when this host runs Classic rules.
const browsingJourneyPreferences = createJourneyPreferences({ window });
const gameplayTuning = createGameplayTuningController({ eventTarget: window });
let gameplayTuningPanel;
const releaseArtwork = (event) => {
  if (event.persisted) return;
  stopMasterView();
  stopDisplayView();
  stopActorView();
  actorPreferences.dispose();
  audioRestoration.dispose();
  displayRestoration.dispose();
  displayPreferences.dispose();
  encounterDisplay.dispose();
  menuStyle.dispose();
  audioPreferences.dispose();
  artworkLifetime.abort();
  publishedAudio?.close();
  music?.dispose();
  if (!music) publishedPlayer?.dispose();
  void pageSound?.dispose();
  audioMaster.dispose();
  presentationPage.close();
  presentationFeedback.dispose();
  featured?.dispose();
  installed?.dispose();
  staticPictures?.dispose();
  for (const owner of creatorVersusEditions.values()) owner.pictures?.dispose();
  creatorStore?.close();
  journeyPreferences?.dispose();
  journeyPictures?.dispose();
  browsingJourneyPreferences.dispose();
  gameplayTuningPanel?.dispose();
  gameplayTuning.dispose();
  boardFootprints?.dispose();
  window.removeEventListener('pagehide', releaseArtwork);
};
window.addEventListener('pagehide', releaseArtwork);
const json = async (url) => {
  const r = await fetch(url, { signal: artworkLifetime.signal });
  if (!r.ok) throw new Error(t('gameplay:couldNotLoad', { value1: url }));
  return r.json();
};
try {
  document.addEventListener('focusin', initialFocusChoice, true);
  document.addEventListener('visibilitychange', initialVisibility);
  window.addEventListener('blur', initialWindowBlur);
  window.addEventListener('pagehide', initialFocusLost);
  const [campaign, registry, themes, presets] = await Promise.all([
    json('../content/campaign.json'),
    json('../content/classes.json'),
    json('../content/themes.json'),
    json('../../authoring/motion-lab/presets.json'),
  ]);
  const characterPresentations = createCharacterPresentations(presets);
  const baseEntry = {
    campaign: { ...campaign, classRecipes: registry },
    classRecipes: registry,
    themes: themes.themes,
    visualOverrides: {},
    levelVisuals: [],
    music: [],
    sourcePackId: null,
  };
  const authoredRoute = await loadAuthoredJourneyRoute(
    resolveJourneyRequest(new URL(location.href).searchParams, {
      mode: 'versus',
    }),
    { fullSource: true },
  );
  const authoredJourney = !!authoredRoute;
  const libraryHandoff = readMissionLibraryHandoff(new URL(location.href).searchParams),
    libraryIntent = readMissionLibraryIntent(new URL(location.href).searchParams);
  let incomingContinuation = null;
  if (libraryHandoff) {
    const values = new URL(location.href).searchParams.getAll('versus-next');
    if (values.length) {
      if (values.length !== 1)
        throw new TypeError(t('interface:duplicateVersusContinuationSettings'));
      const value = boundedJSON(values[0], {
        maxBytes: 4096,
        maxNodes: 24,
        maxDepth: 2,
      });
      exactKeys(
        value,
        ['mission', 'format', 'turnPolicy', 'seconds', 'difficulty', 'tap', 'slots'],
        t('interface:versusContinuation'),
      );
      if (
        value?.mission === libraryHandoff &&
        ['single', 'first-to-two'].includes(value.format) &&
        ['immediate', 'grid-center'].includes(value.turnPolicy) &&
        [30, 90, 180].includes(value.seconds) &&
        ['gentle', 'standard', 'expert'].includes(value.difficulty) &&
        typeof value.tap === 'boolean' &&
        Array.isArray(value.slots) &&
        value.slots.length === 2 &&
        value.slots.every(
          (slot) =>
            slot === null ||
            (Number.isInteger(slot) &&
              slot >= 0 &&
              (slot <= 255 || (slot >= 1024 && slot <= 3071))),
        ) &&
        (value.slots[0] === null || value.slots[0] !== value.slots[1])
      )
        incomingContinuation = value;
      else throw new TypeError(t('interface:versusContinuationSettingsDoNotMatchThisExactMission'));
    }
  }
  if (incomingContinuation) {
    $('race-format').value = incomingContinuation.format;
    $('race-turn').value = incomingContinuation.turnPolicy;
    $('race-time').value = String(incomingContinuation.seconds);
    $('race-tap').checked = incomingContinuation.tap;
    browsingJourneyPreferences.choose(incomingContinuation.difficulty);
  }
  const librarySourceReturn = readMissionLibraryReturn(new URL(location.href).searchParams, {
    mode: 'versus',
  });
  let journeyProfile = null,
    displayedProgressProfile = null,
    journeyChooser = null,
    journeySkipArmed = null,
    missionLibrary = null,
    missionLibraryLoading = null,
    libraryInventory = null,
    libraryInventoryNotice = '',
    libraryInstaller = null,
    libraryInstallerFactory = null,
    librarySoloPreview = null,
    spatialEditionOwner = null,
    libraryOpenEpoch = 0,
    libraryDecision = null,
    libraryLaunchController = null,
    libraryIncomingController = null;
  const libraryExternalProofs = new Map(),
    libraryExternalSelections = new Map();
  const journeySessionId = authoredJourney ? crypto.randomUUID() : null;
  const journeySaveCue = attachJourneySaveCue({
    document,
    target: $('race-pause'),
    action: $('race-journey-save-options'),
    announcement: $('race-journey-save-announcement'),
    onOpen() {
      if (shell.scope() !== 'main') return;
      const target = $('race-journey-save').hidden ? $('race-start') : $('race-journey-save-retry');
      if (!target.disabled && !target.hidden) target.focus();
    },
  });
  let journeyThemeSources;
  const originalThemeLabels = new WeakMap();
  const chapterLabel = (entry) =>
    entry.mission
      ? contentText(entry.mission, 'campaignTitle')
      : contentText(entry.pictureEntry?.campaign, 'title') || entry.chapter;
  const themeLabel = (theme) => {
    if (authoredRoute?.id !== DEFAULT_JOURNEY_ROUTES.versus) return contentText(theme, 'name');
    if (!originalThemeLabels.has(theme)) {
      const material = journeyActorThemeMaterial(theme.id);
      const original = journeyThemeSources?.find((source) => source.id === material?.sourceThemeId);
      originalThemeLabels.set(
        theme,
        original && dataIdentity(createJourneyActorTheme(original)) === dataIdentity(theme)
          ? original
          : theme,
      );
    }
    return contentText(originalThemeLabels.get(theme), 'name');
  };
  if (authoredJourney) {
    journeyThemeSources = (await json('../content-design/themes.json')).themes;
    document.body.classList.add('candidate-journey');
    candidateJourney = createCandidateVersusHost(authoredRoute.source, {
      themes: authoredJourneyUsesActorMaterials(authoredRoute.id)
        ? journeyActorThemeCandidates(journeyThemeSources, {
            includeOriginals: authoredRoute.preserveOriginalThemes === true,
          })
        : journeyThemeSources,
      corePackIds: authoredRoute.corePackIds,
      optionalCampaignIds: authoredRoute.optionalCampaignIds,
    });
    journeyPreferences = createJourneyPreferences({ window });
    if (incomingContinuation) journeyPreferences.choose(incomingContinuation.difficulty);
    $('race-journey-note').hidden = false;
    localizedText($('race-journey-note'), () =>
      authoredRoute.id === DEFAULT_JOURNEY_ROUTES.versus
        ? t('interface:couch.journeyNotice', { count: candidateJourney.catalog.missions.length })
        : t('interface:couch.journeyTestNotice', { route: authoredRoute.label.toUpperCase() }),
    );
    $('race-journey-difficulty-field').hidden = false;
    $('race-journey-difficulty').replaceChildren(
      ...Object.keys(
        journeyDifficultyCatalog(authoredRoute.source.difficultyCatalogId).presets,
      ).map((id) => localizedOption(() => gameplayDifficultyLabel(id), id)),
    );
    $('race-journey-difficulty').value = journeyPreferences.snapshot().difficulty;
    journeyProfile = createJourneyProfileStore({
      profileKey: authoredRoute.profileKey,
      onStatus: (status) => presentProgressStatus(journeyProfile, status),
    });
    displayedProgressProfile = journeyProfile;
    await journeyProfile.load();
    journeyPictures = attachJourneyModePictures({
      document,
      button: $('race-journey-pictures'),
      mode: 'versus',
      editionId: authoredRoute.id,
      catalog: candidateJourney.catalog,
      profile: journeyProfile,
    });
    $('race-journey-controls').hidden = false;
  }
  const maps = candidateJourney
    ? [...candidateJourney.rows]
    : campaign.levels.map((level) => ({
        key: level.id,
        chapter: campaign.title,
        level,
        classes: registry,
        themes: themes.themes,
        visualOverrides: {},
        defaultThemeId: level.themeId || campaign.themeId,
        track: null,
        pictureEntry: baseEntry,
        musicCampaignKey: campaignKey(campaign),
        authoredBackground: null,
      }));
  let featuredSource,
    featuredStatus = '';
  if (!candidateJourney)
    try {
      bootDisplay.update({
        message: t('interface:loadingTheFeaturedChapter'),
        stage: 'downloading',
      });
      featuredSource = await json('../content/packs/fpv-arcade-r5.json');
    } catch (error) {
      if (artworkLifetime.signal.aborted || error.name === 'AbortError') throw error;
      featuredStatus = t(
        'interface:featuredPressureLinesDownloadUnavailableBaseMapsAndCheckedInstalled',
      );
    }
  if (featuredSource !== undefined) {
    bootDisplay.update({
      message: t('interface:checkingFeaturedMapsAndOriginalPictures'),
      stage: 'verifying',
    });
    featured = await prepareCouchChapter(featuredSource, {
      signal: artworkLifetime.signal,
    });
    const featuredCampaign = featured.resolved.campaign;
    maps.unshift(
      ...featuredCampaign.levels.map((level) => ({
        key: `shipped/${featured.pack.id}/${featuredCampaign.id}/${level.id}`,
        chapter: featuredCampaign.title,
        level,
        classes: featured.resolved.classRecipes,
        themes: featured.resolved.themes,
        defaultThemeId: level.themeId || featuredCampaign.themeId,
        track:
          featured.resolved.music.find(
            (track) => track.id === (level.musicId || featuredCampaign.musicId),
          ) || null,
        // The one decoded original below is shared by both boards, not reloaded by each painter.
        visualOverrides: Object.fromEntries(
          Object.entries({
            ...featured.resolved.visualOverrides,
            ...featured.resolved.levelVisuals.find((v) => v.levelId === level.id)?.visualOverrides,
          }).filter(([role]) => role !== 'background'),
        ),
        backdrop: featured.backdrop(level.id),
        pictureEntry: featured.resolved,
        sourcePackId: featured.pack.id,
        musicCampaignKey: featured.resolved.baseCampaignKey || campaignKey(featuredCampaign),
        authoredBackground:
          featured.resolved.levelVisuals.find((v) => v.levelId === level.id)?.visualOverrides
            ?.background ||
          featured.resolved.visualOverrides.background ||
          null,
      })),
    );
  }
  const shippedMaps = [...maps];
  staticPictures = candidateJourney
    ? createCandidateCouchPictures({ owns: candidateJourney.owns })
    : createCouchStaticPictures({
        entries: [baseEntry, ...(featured ? [featured.resolved] : [])],
        presentationPage,
      });
  async function creatorProfile(editionId) {
    if (!creatorProfiles.has(editionId)) {
      let profile;
      profile = createJourneyProfileStore({
        profileKey: creatorProfileKey(editionId),
        onStatus: (status) => presentProgressStatus(profile, status),
      });
      creatorProfiles.set(editionId, profile);
      await profile.load();
    }
    return creatorProfiles.get(editionId);
  }
  function activeProgressProfile() {
    return displayedProgressProfile;
  }
  function showProgressProfileFor(entry) {
    const owner = creatorVersusOwners.get(entry),
      profile = owner
        ? creatorProfiles.get(owner.prepared.editionId)
        : candidateJourney?.owns(entry)
          ? journeyProfile
          : null;
    displayedProgressProfile = profile;
    if (profile) presentProgressStatus(profile, profile.status());
    else {
      journeySaveCue.update({ ready: true, durable: true, error: null });
      $('race-journey-save').hidden = true;
      localizedText($('race-journey-save-message'), '');
    }
  }
  function presentProgressStatus(profile, { ready, durable, error }) {
    if (!profile || profile !== activeProgressProfile()) return;
    const unsaved = journeySaveCue.update({ ready, durable, error }),
      notice = $('race-journey-save');
    notice.hidden = !unsaved && !notice.contains(document.activeElement);
    localizedText($('race-journey-save-message'), () =>
      error
        ? t('interface:couch.sessionProgress', { error })
        : ready && durable
          ? t('interface:journeyRaceProgressSavedLocallyYouCanContinuePlaying')
          : '',
    );
  }
  function creatorVersusOwner(prepared) {
    let owner = creatorVersusEditions.get(prepared.editionId);
    if (owner) {
      let restored = false;
      for (const row of owner.rows)
        if (!maps.includes(row)) {
          maps.push(row);
          restored = true;
        }
      if (restored) showMaps();
      return owner;
    }
    const content = prepared.manifest.content,
      host = createCandidateVersusHost(content.project, {
        themes: content.themes,
        corePackIds: [content.packId],
      }),
      provenance = new Map(
        (Array.isArray(content.provenance) ? content.provenance : [content.provenance]).map(
          (row) => [row.missionId, row],
        ),
      ),
      rows = host.rows.map((row) =>
        Object.freeze({
          ...row,
          key: `creator/${prepared.editionId}/${row.key}`,
          creatorEditionId: prepared.editionId,
          creatorRuntimeSeed: provenance.get(row.mission.levelId)?.runtimeSeed,
        }),
      ),
      owned = new Set(rows),
      pictures = createCandidateCouchPictures({
        owns: (row) => owned.has(row),
        acquire: (asset, options) =>
          acquireCandidatePicture(asset, {
            ...options,
            loadArtwork: creatorArtworkLoader(prepared),
          }),
      });
    owner = Object.freeze({ prepared, host, rows, pictures });
    creatorVersusEditions.set(prepared.editionId, owner);
    for (const row of rows) creatorVersusOwners.set(row, owner);
    maps.push(...rows);
    showMaps();
    return owner;
  }
  const pictureOwner = (entry) =>
    shippedMaps.includes(entry)
      ? staticPictures
      : (creatorVersusOwners.get(entry)?.pictures ?? installed);
  const qualifiedVersusEntry = (entry) =>
    Boolean(candidateJourney?.owns(entry) || creatorVersusOwners.has(entry));
  function creatorVersusContinuation(entry) {
    const owner = creatorVersusOwners.get(entry),
      mission = owner?.host.next(entry.mission.id);
    if (!mission) return null;
    return {
      owner,
      mission,
      entry: owner.rows.find(
        (candidate) => candidate.mission === mission && candidate.difficulty === entry.difficulty,
      ),
    };
  }
  const cancelAllPictures = () => {
    staticPictures.cancel();
    for (const owner of creatorVersusEditions.values()) owner.pictures.cancel();
  };
  let installedStatus = candidateJourney
      ? authoredRoute.id === DEFAULT_JOURNEY_ROUTES.versus
        ? localizedMessage('interface:openAllMissionsForJourneyEarlierMissionsAndInstalledChapters')
        : localizedMessage('interface:couch.testRoute', { route: authoredRoute.label })
      : localizedMessage('interface:installedChaptersHaveNotBeenChecked'),
    installedRefreshPending = false,
    contentChannel = null;
  try {
    const channel = document.querySelector('meta[name="revealline-offline"]')
      ? `release-${(await json('../build-info.json')).version}`
      : 'dev';
    contentChannel = channel;
    if (!candidateJourney) {
      installed = createCouchInstalledChapters({
        channel,
        registeredEntries: [baseEntry],
        presentationPage,
      });
      bootDisplay.update({
        message: t('interface:checkingInstalledChaptersAndPictures'),
        stage: 'verifying',
      });
      const rows = await installed.refresh({
        signal: artworkLifetime.signal,
        onStatus: (status) => bootDisplay.update(status),
      });
      maps.push(...rows);
      installedStatus = rows.length
        ? localizedMessage('interface:couch.installedMaps', { count: rows.length })
        : localizedMessage('interface:openAllMissionsToDownloadCompatibleChaptersThenChoosePlay');
    }
  } catch (error) {
    installedStatus = localizedMessage('gameplay:installedChaptersUnavailable', {
      value1: error.message,
    });
  }
  if (artworkLifetime.signal.aborted)
    throw new DOMException(t('interface:couchArtworkLoadingCancelled'), 'AbortError');
  const mode = (level) =>
    arcadeActionCapabilities(level).manualAbility ? t('interface:tactical') : t('interface:arcade');
  function showMaps() {
    $('race-level').replaceChildren(
      ...maps
        .filter((row) =>
          candidateJourney
            ? row.difficulty === journeyPreferences.snapshot().difficulty
            : !creatorVersusOwners.has(row) ||
              row.difficulty === browsingJourneyPreferences.snapshot().difficulty,
        )
        .map((m) =>
          localizedOption(
            () => `${chapterLabel(m)} · ${contentText(m.level, 'name')} · ${mode(m.level)}`,
            m.key,
          ),
        ),
    );
  }
  showMaps();
  const journeyCursor = candidateJourney?.catalog.find(journeyProfile?.snapshot().cursors.versus);
  const initialJourneyMission =
    journeyCursor && Object.hasOwn(journeyProfile.snapshot().clears.versus, journeyCursor.id)
      ? (candidateJourney.next(journeyCursor.id) ?? journeyCursor)
      : (journeyCursor ?? candidateJourney?.catalog.missions[0]);
  $('race-level').value = candidateJourney
    ? candidateJourney.row(initialJourneyMission, journeyPreferences.snapshot().difficulty).key
    : maps[0].key;
  for (const item of themes.themes)
    $('race-theme').append(localizedOption(() => themeLabel(item), item.id));
  for (const c of registry)
    $('race-class').append(localizedOption(() => contentText(c, 'label'), c.id));
  const painters = [new BoardPainter(presets), new BoardPainter(presets)];
  const foundationCaptions = new WeakMap();
  for (const painter of painters) presentationPage.bindPainter(painter);
  const sound = (pageSound = new Soundscape({
    persistentMusic: true,
    audioMaster,
  }));
  sound.configure({ master: 1 });
  music = attachCouchMusicHost({
    document,
    root: $('race-settings-panel-audio'),
    prefix: 'race',
    quickAfter: ['race-start'],
    canControl: () => !disposed && !inactive,
    getScene: ({ scene }) =>
      !match || shell?.scope() === 'setup' ? 'menu' : match.status === 'ready' ? scene : 'gameplay',
    audioMaster,
    audioPreferences,
    soundscape: sound,
    canOpen: () =>
      !disposed &&
      !inactive &&
      !document.hidden &&
      document.hasFocus() &&
      shell?.scope() === 'options',
    getOwner: () => `${generation}:${shell?.scope()}`,
    onOpen: () => clear(),
    onClose: () => {
      clear();
      updateMenu();
    },
  });
  publishedPlayer = music?.player ?? null;
  publishedAudio = attachPublishedAudio({
    sound,
    ready: presentationPage.ready,
    getHost: () => presentationPage,
    allowMusic: () =>
      (theme?.id === 'fpv' || theme?.family === 'fpv') && !selectedMapKey?.startsWith('installed/'),
  });
  publishedAudio.setPlayer(publishedPlayer);
  let neutralResumeTick = false;
  let startCue = null,
    pendingStartCue = null;
  const freeBodies = characterPresentations.availableBodies(
    unlockedBodies(emptyProgress(campaign), campaign),
  );
  function bodyFor(theme, classId) {
    if (candidateJourney) return theme.player;
    const candidate = characterPresentations.recommendedBody(theme, classId);
    return Object.hasOwn(presets.characters, candidate) && freeBodies.has(candidate)
      ? candidate
      : freeBodies.has(theme.player)
        ? theme.player
        : 'neutral-marker';
  }
  let selectedMapKey = null;
  const contexts = [0, 1].map((i) => $(`race-canvas-${i}`).getContext('2d'));
  const touchPads = [...document.querySelectorAll('.race-pad')];
  const touchActions = touchPads.map((pad) =>
    [...pad.querySelectorAll('button')].filter((button) => button.dataset.action),
  );
  boardFootprints = createBoardFootprints([0, 1].map((i) => $(`race-canvas-${i}`)));
  let boardLayoutKey = null;
  let match,
    theme,
    backdrop = null,
    contentReady = true,
    contentBusy = false,
    contentError = null,
    contentDownloadRequired = false,
    contentController = null,
    contentScope = null,
    accumulator = 0,
    last = 0,
    won = [0, 0],
    finished = false,
    generation = 0,
    raceSequence = 0,
    roundRecipe = null,
    actorLease = null,
    actorAppearance = null,
    nextAttempt = null,
    libraryContinuation = null,
    libraryCompleteMatch = null,
    currentLibrarySelection = null,
    preparedFocusMatch = null,
    startIntentEpoch = 0,
    framePads = [],
    frameReadError = null,
    slots = [null, null],
    assignmentsChanged = false,
    pendingPadLoss = false,
    menuOwner = null,
    menuHint = '',
    menuGate = '',
    menuStatus = t('interface:releaseControlsThenPressAFaceButtonOrMenuTo'),
    menuScope = null,
    inactive = false,
    disposed = false,
    frameId = null,
    stopNative = () => {};
  function hideStartCue() {
    startCue = null;
    $('race-start-cue').hidden = true;
    delete $('race-start-cue').dataset.kind;
    delete $('race-start-cue').dataset.phase;
    $('race-start-cue-label').textContent = '';
  }
  function beginStartCue(kind) {
    startCue = { owner: match, generation, cue: createMissionStartCue(kind), released: false };
    pendingStartCue = null;
    $('race-start-cue').hidden = false;
    $('race-start-cue').dataset.kind = kind;
    $('race-start-cue-label').textContent = kind === 'retry' ? t('interface:ready2') : '3';
    clear({ resetDirection: true });
  }
  function advanceStartCue(now) {
    if (!startCue) return { active: false, blocksPlay: false, released: false };
    if (
      startCue.owner !== match ||
      startCue.generation !== generation ||
      match.status !== 'running'
    ) {
      hideStartCue();
      return { active: false, blocksPlay: false, released: false };
    }
    const state = startCue.cue.sample(now);
    if (state.active) {
      $('race-start-cue-label').textContent =
        state.label === 'READY'
          ? t('interface:ready2')
          : state.label === 'GO'
            ? t('interface:startCueGo')
            : state.label;
      $('race-start-cue').dataset.phase = String(state.phase);
    }
    let released = false;
    if (!state.blocksPlay && !startCue.released) {
      startCue.released = true;
      released = true;
      // Menu Confirm, touch and movement held through the cue are not gameplay input.
      clear({ resetDirection: true });
      neutralResumeTick = true;
    }
    if (!state.active) hideStartCue();
    return { ...state, released };
  }
  function activateAcceptedMatch({ owner, ownerGeneration, cue = null, owns }) {
    const current = () =>
      !disposed &&
      match === owner &&
      generation === ownerGeneration &&
      ['ready', 'paused'].includes(match.status) &&
      owns();
    if (!current()) return false;
    clear({ resetDirection: cue !== null });
    if (!current()) return false;
    resumeDuel(match, { preserveContinuation: true });
    if (cue) beginStartCue(cue);
    else {
      pendingStartCue = null;
      neutralResumeTick = true;
    }
    showProgressProfileFor(roundRecipe.entry);
    // Race effects are independent of the music transport and its readiness.
    void sound.enable();
    if (music) void music.start();
    localizedText($('race-message'), () => t('interface:makeYourLineCountFirstClearWins'));
    updateMenu();
    input.focus();
    return match === owner && generation === ownerGeneration && match.status === 'running';
  }
  const preparationStatus = createOperationStatus($('race-preparation'), {
    isCurrent: () => !disposed,
  });
  const journeyReactions = attachJourneyReactions({ prefix: 'race-' });
  let preparationDisplay = null;
  let actorJourneyIdentity = null,
    actorMissionIndex = null;
  const readActorMissionIndex = () =>
    (actorMissionIndex ??= json('../content/mission-library-index.json')
      .then(prepareMissionLibraryIndex)
      .catch((error) => {
        actorMissionIndex = null;
        throw error;
      }));
  function showActorNotice(recipe) {
    localizedText(
      $('race-actor-style-status'),
      () =>
        actorPreferences.getWarning() ||
        recipe.actorNotice ||
        t('interface:appliesToANewRaceOrNextMissionResumeAnd'),
    );
  }
  const actorExecutionOwners = new WeakMap();
  async function prepareActors(recipe, { signal, onStatus, reader = installed } = {}) {
    const row = recipe.entry;
    recipe.actorNotice = '';
    // Creator editions retain their compiled authored actors. Their immutable
    // .rlpack owns no release actor-presentation authority.
    if (creatorVersusOwners.has(row)) return null;
    let content, scope;
    if (candidateJourney?.owns(row)) {
      // Coupa multiplayer keeps the campaign's compiled actor geometry. It has
      // no dependency on the main game's separate cosmetic release bundle.
      return null;
      actorJourneyIdentity ??= createJourneyVisualThemeIdentityAdapter(authoredRoute.source, {
        mode: 'versus',
      });
      content = await (
        await actorJourneyIdentity
      ).prepareHostSelection(
        {
          host: candidateJourney,
          selection: row,
          level: row.level,
          association: {
            editionId: authoredRoute.id,
            contentThemeId: recipe.theme.id,
            mode: 'versus',
          },
        },
        { signal },
      );
      scope = 'journey';
    } else {
      let entry, pack;
      if (row.pictureEntry === baseEntry || (featured && row.pictureEntry === featured.resolved)) {
        if (!actorExecutionOwners.has(row.pictureEntry))
          actorExecutionOwners.set(
            row.pictureEntry,
            createExecutionCatalog([row.pictureEntry]).select(
              campaignKey(row.pictureEntry.campaign),
              'standard',
            ),
          );
        entry = actorExecutionOwners.get(row.pictureEntry);
        pack = row.pictureEntry === baseEntry ? null : featured.pack;
        scope = row.pictureEntry === baseEntry ? 'builtin' : null;
      } else {
        ({ entry, pack } = reader.presentationOwner(row));
      }
      if (pack) {
        let index;
        try {
          index = await readActorMissionIndex();
        } catch (error) {
          if (signal?.aborted || recipe.actorPresentation) throw error;
          // Missing optional authority never grants FPV ownership. A fresh
          // unknown pack remains playable through its validated authored path.
          // Accepted FPV pins and later actor asset/hash failures stay strict.
          recipe.actorNotice = t('interface:fpvEligibilityCouldNotBeCheckedForThisChapterIts');
          return null;
        }
        const original = index.missions.find(
          (item) =>
            item.packId === pack.id &&
            item.campaignKey === entry.baseCampaignKey &&
            item.levelId === row.level.id &&
            item.modes.includes('versus'),
        );
        if (!original || !(await verifyIndexedInstalledPack(pack, original))) return null;
        scope = 'trusted-pack';
      }
      // Unknown/modified packs retain authored actors; names and IDs grant no authority.
      if (!scope) return null;
      content = await prepareCampaignVisualThemeContext(
        {
          entry,
          level: row.level,
          association: { editionId: 'field-kit', contentThemeId: recipe.theme.id, mode: 'versus' },
        },
        { signal },
      );
    }
    return prepareActorAppearanceLease(
      {
        content,
        scope,
        style: recipe.actorStyle,
        ...(recipe.actorPresentation ? { presentation: recipe.actorPresentation } : {}),
      },
      {
        baseURL: new URL('../presentation/compiled/', location.href),
        signal,
        onStatus,
        currentManifestSha256: presentationPage.current()?.manifestSha256 ?? null,
      },
    );
  }
  function publishActors(next) {
    if (next === actorLease) return () => {};
    const previous = actorLease;
    actorLease = next;
    actorAppearance = next
      ? Object.freeze({ style: next.pin().style, snapshot: next.snapshot })
      : null;
    return () => {
      if (previous !== next) previous?.release();
    };
  }
  function showAcceptedSetup() {
    if (!roundRecipe) return;
    $('race-level').value = roundRecipe.entry.key;
    $('race-theme').value = roundRecipe.theme.id;
    $('race-class').value = roundRecipe.classId;
    $('race-turn').value = roundRecipe.turnPolicy;
    $('race-time').value = String(roundRecipe.seconds);
    $('race-format').value = roundRecipe.format;
  }
  let menuRouter, navigation, shell, reading;
  let readingModality = 'pointer';
  const readingPrompt = ({ scrollable }) =>
    readingInputPrompt({
      modality: readingModality,
      scrollable,
      controls: { confirm: t('common:controls.south'), back: t('common:controls.east') },
    });
  function setReadingModality(modality) {
    if (readingModality === modality) return;
    readingModality = modality;
    reading?.refresh();
    navigation?.refreshReadingHint();
  }
  $('race-tap').checked = incomingContinuation?.tap ?? matchMedia('(pointer: coarse)').matches;

  function clear({ resetDirection = false } = {}) {
    if (resetDirection) input.clear();
    else input.clearPhysical();
    accumulator = 0;
    controllerSession.clear();
    menuRouter?.clear();
    navigation?.clear();
    if (match?.status === 'running') menuScope = 'flight';
    menuHint = '';
  }
  function actionFocus(origin) {
    const foreground = () => !document.hidden && document.hasFocus(),
      startedHere = document.activeElement === origin && foreground(),
      scope = shell.scope();
    let moved = false,
      shifting = false,
      pendingTarget = null;
    const observe = (event) => {
      if (installOfflineOwnsElement(event.target)) return;
      if (
        !shifting &&
        ![origin, pendingTarget, document.body, document.documentElement].includes(event.target)
      )
        moved = true;
    };
    const hidden = () => {
      if (!foreground()) moved = true;
    };
    const blurred = guardInstallOfflineBlur(() => {
      moved = true;
    });
    const owns = (current) =>
      current &&
      !disposed &&
      startedHere &&
      !moved &&
      foreground() &&
      shell.scope() === scope &&
      [origin, pendingTarget, document.body, document.documentElement].includes(
        document.activeElement,
      );
    const available = (target) =>
      target?.isConnected &&
      !target.disabled &&
      !target.closest('[hidden],[inert]') &&
      target.getClientRects().length > 0;
    document.addEventListener('focusin', observe);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', blurred);
    const close = () => {
      document.removeEventListener('focusin', observe);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('blur', blurred);
    };
    const restore = (target, current, { retain = false } = {}) => {
      if (!retain) close();
      try {
        if (owns(current) && available(target)) target.focus({ preventScroll: true });
      } catch (error) {
        close();
        throw error;
      }
    };
    restore.close = close;
    restore.pending = (target, current) => {
      if (!owns(current) || !available(target)) return;
      // This transfer belongs to the action, not to a new user choice. Later
      // navigation or foreground loss still relinquishes completion focus.
      pendingTarget = target;
      shifting = true;
      try {
        target.focus({ preventScroll: true });
      } finally {
        shifting = false;
      }
    };
    restore.current = owns;
    return restore;
  }
  function cancelContent() {
    if (libraryContinuation) {
      const selected = libraryContinuation.kind === 'selection';
      libraryContinuation.controller.abort();
      libraryContinuation = null;
      cancelLibraryDecision();
      if (!nextAttempt) {
        contentBusy = false;
        preparationDisplay?.finish({ state: 'cancelled', message: '' });
        preparationDisplay = null;
        localizedText($('race-message'), () =>
          selected
            ? t('interface:missionSelectionCancelledYourCurrentRaceAndPictureAreKept')
            : t('interface:nextMissionCancelledResultsAreKeptChooseNextMissionTo'),
        );
        updateMenu();
        return;
      }
    }
    if (!contentBusy) return;
    preparationDisplay?.finish({ state: 'cancelled', message: '' });
    preparationDisplay = null;
    contentController?.abort();
    const retainedResult = nextAttempt?.previous === match;
    if (retainedResult) {
      nextAttempt.lease?.cancel();
      installed?.cancel();
      showAcceptedSetup();
    } else {
      installed?.clear();
      backdrop = null;
    }
    cancelAllPictures();
    contentBusy = false;
    contentReady = retainedResult;
    contentDownloadRequired = false;
    contentError = retainedResult
      ? () =>
          t('interface:couch.continuationPictureLoadingCancelled', {
            action: continuationAction(),
          })
      : localizedMessage('interface:pictureLoadingCancelledRetryWhenYouAreReady');
    if (installedRefreshPending) {
      installedRefreshPending = false;
      installedStatus = localizedMessage(
        'interface:installedChapterCheckCancelledRefreshWhenReady',
      );
    }
    localizedText($('race-message'), () => contentError);
    updateMenu();
  }
  $('race-picture-cancel').onclick = () => {
    const restoreFocus = actionFocus($('race-picture-cancel')),
      selected = libraryContinuation?.kind === 'selection';
    cancelContent();
    restoreFocus(
      selected
        ? $('race-journey-find')
        : match.status === 'finished'
          ? $('race-start')
          : $('race-chapter-retry'),
      selected || !!contentError,
    );
  };
  function setupRecipe() {
    const entry = maps.find((m) => m.key === $('race-level').value);
    const classId = qualifiedVersusEntry(entry)
      ? 'scout'
      : entry.classes.some((c) => c.id === $('race-class').value)
        ? $('race-class').value
        : entry.classes[0].id;
    const themeId =
      selectedMapKey !== entry.key && entry.defaultThemeId
        ? entry.defaultThemeId
        : $('race-theme').value;
    const preference = actorPreferences.snapshot();
    return {
      entry,
      classId,
      theme: entry.themes.find((t) => t.id === themeId) || entry.themes[0],
      seed: entry.creatorRuntimeSeed ?? (candidateJourney ? 1 : 2026),
      turnPolicy: $('race-turn').value,
      seconds: qualifiedVersusEntry(entry) ? 0 : Number($('race-time').value),
      format: $('race-format').value === 'first-to-two' ? 'first-to-two' : 'single',
      actorStyle: preference.actorStyle,
      actorPreferenceRevision: preference.revision,
    };
  }
  function prepare() {
    const configured = setupRecipe();
    // Menu changes stage a complete replacement, keeping both accepted boards
    // and their actors usable if either picture or actor acquisition fails.
    if (match && contentReady)
      return prepareNext(configured.entry, document.activeElement, {
        configured,
        fresh: true,
      }).then((prepared) => {
        // Menu preparation does not transfer an activation into startRace.
        // Its focus observers must end here even though the new pair is ready.
        prepared?.releaseFocus();
        return !!prepared;
      });
    nextAttempt?.lease?.cancel();
    nextAttempt = null;
    preparedFocusMatch = null;
    preparationStatus.clear();
    preparationDisplay = null;
    contentController?.abort();
    installed?.clear();
    cancelAllPictures();
    contentController = new AbortController();
    contentScope = shell?.scope() || 'main';
    contentError = null;
    contentDownloadRequired = false;
    contentBusy = false;
    contentReady = false;
    clear({ resetDirection: true });
    const entry = maps.find((m) => m.key === $('race-level').value);
    const classId = qualifiedVersusEntry(entry)
      ? 'scout'
      : entry.classes.some((c) => c.id === $('race-class').value)
        ? $('race-class').value
        : entry.classes[0].id;
    $('race-class').replaceChildren(
      ...entry.classes
        .filter((c) => !qualifiedVersusEntry(entry) || c.id === 'scout')
        .map((c) => localizedOption(() => contentText(c, 'label'), c.id)),
    );
    $('race-class').value = classId;
    const themeId =
      selectedMapKey !== entry.key && entry.defaultThemeId
        ? entry.defaultThemeId
        : $('race-theme').value;
    selectedMapKey = entry.key;
    backdrop = entry.backdrop || null;
    theme = entry.themes.find((t) => t.id === themeId) || entry.themes[0];
    $('race-theme').replaceChildren(
      ...entry.themes.map((t) => localizedOption(() => themeLabel(t), t.id)),
    );
    $('race-theme').value = theme.id;
    roundRecipe = {
      entry,
      theme,
      classId,
      seed: entry.creatorRuntimeSeed ?? (candidateJourney ? 1 : 2026),
      turnPolicy: $('race-turn').value,
      seconds: qualifiedVersusEntry(entry) ? 0 : Number($('race-time').value),
      format: $('race-format').value === 'first-to-two' ? 'first-to-two' : 'single',
      actorStyle: configured.actorStyle,
      actorPreferenceRevision: configured.actorPreferenceRevision,
    };
    $('race-format').value = roundRecipe.format;
    match = createRound(roundRecipe);
    generation = ++raceSequence;
    if (candidateJourney)
      journeyProfile.record({
        type: 'select',
        mode: 'versus',
        missionId: entry.mission.id,
      });
    paintRound(roundRecipe);
    finished = false;
    localizedText($('race-start'), () =>
      roundRecipe.format === 'single' ? t('interface:startRace') : t('interface:startRound'),
    );
    return loadPreparedPicture(entry);
  }
  function createRound(recipe) {
    const creatorOwned = creatorVersusOwners.has(recipe.entry);
    recipe.tuning ??= creatorOwned
      ? resolveGameplayTuning(
          recipe.entry.difficulty ?? browsingJourneyPreferences.snapshot().difficulty,
        )
      : gameplayTuning.snapshot(
          recipe.entry.difficulty ?? browsingJourneyPreferences.snapshot().difficulty,
        );
    const rulesLevel = projectClassicCurrentRulesLevel(
      recipe.entry.level,
      recipe.rulesEdition,
      recipe.entry.musicCampaignKey,
    );
    // Qualified creator evidence is bound to the exact compiled installed
    // level. Global tuning would create a different, unverified simulation.
    recipe.runtimeLevel = creatorOwned
      ? rulesLevel
      : applyGameplayTuning(rulesLevel, recipe.tuning);
    return createDuel(
      recipe.runtimeLevel,
      {
        seed: recipe.seed,
        turnPolicy: recipe.turnPolicy,
        classId: recipe.classId,
        classRecipes: recipe.entry.classes,
      },
      {
        seconds: recipe.seconds,
        protocol: qualifiedVersusEntry(recipe.entry) ? UNTIMED_DUEL_PROTOCOL : DUEL_PROTOCOL,
      },
    );
  }
  function paintRound(recipe) {
    showActorNotice(recipe);
    const { entry, theme, classId } = recipe,
      level = entry.level,
      { width, height } = boardPaintSizeForLevel(level);
    for (const player of [0, 1]) {
      const canvas = $(`race-canvas-${player}`);
      canvas.width = width;
      canvas.height = height;
    }
    boardFootprints.refresh();
    sound.reset();
    if (publishedPlayer) publishedPlayer.setAuthoredTrack(entry.track || DEFAULT_TRACKS[0]);
    else sound.setTrack(entry.track || DEFAULT_TRACKS[0], { atBoundary: true });
    if (music) {
      const key =
        entry.musicCampaignKey ||
        (entry.pictureEntry &&
          (entry.pictureEntry.baseCampaignKey || campaignKey(entry.pictureEntry.campaign)));
      if (key)
        music.setContext(
          soloCompatibleMusicContext({
            campaignKey: key,
            level,
            themeId: theme.id,
          }),
        );
      else {
        music.contextPending(theme.id);
        music.report(
          new Error(t('interface:missionMusicAssignmentIsUnavailableUntilThisContentIdentityIs')),
        );
      }
    }
    painters.forEach((p) => {
      p.setLook(theme, bodyFor(theme, classId), entry.visualOverrides);
      p.setLevel?.(level, { seed: recipe.seed });
      p.skipCelebration?.();
    });
  }
  async function ensureVersusPackage(entry, options, reader = installed) {
    return ensureVersusEntryPackage(entry, {
      options,
      packageConsent: offlineAvailability().packageConsent,
      creatorOwnerFor: (row) => creatorVersusOwners.get(row),
      candidateJourney,
      authoredRouteId: authoredRoute?.id,
      shippedMaps,
      downloads: gameplayDownloads,
      reader,
      isOfficialPack,
    });
  }
  function loadPreparedPicture(entry, { prompt = false, preserveDownloadOnCancel = false } = {}) {
    contentReady = false;
    contentBusy = true;
    contentError = null;
    contentDownloadRequired = false;
    const staticEntry = shippedMaps.includes(entry),
      owner = pictureOwner(entry),
      message = staticEntry
        ? t('interface:checkingThisMapAndPreparingTheSamePictureForBoth')
        : t('interface:checkingThisChapterAndLoadingItsOriginalPicture');
    localizedText($('race-message'), () => message);
    updateMenu();
    const selectedRun = match,
      ticket = generation,
      controller = contentController;
    const current = () =>
      !disposed && !controller.signal.aborted && match === selectedRun && ticket === generation;
    const display = preparationStatus.begin({
      message,
      stage: 'verifying',
      isCurrent: current,
    });
    preparationDisplay = display;
    return (async () => {
      let nextActors = null,
        adoptedActors = false;
      try {
        await ensureVersusPackage(entry, { signal: controller.signal, prompt });
        if (!current()) return false;
        const image = await owner.select(entry, {
          themeId: theme.id,
          raceId: ticket,
          signal: controller.signal,
          onStatus: (status) => display.update(status),
        });
        if (disposed || controller.signal.aborted || match !== selectedRun || ticket !== generation)
          return false;
        nextActors = await prepareActors(roundRecipe, {
          signal: controller.signal,
          onStatus: (status) => display.update(status),
        });
        if (!current()) return false;
        const retireActors = publishActors(nextActors);
        adoptedActors = true;
        backdrop = image;
        contentReady = true;
        retireActors();
        showActorNotice(roundRecipe);
        localizedText($('race-message'), () =>
          [staticEntry ? featuredStatus : '', image?.notice, t('interface:couch.readyFirstClear')]
            .filter(Boolean)
            .join(' '),
        );
        display.finish({ message: '' });
        return true;
      } catch (error) {
        if (disposed || controller.signal.aborted || match !== selectedRun || ticket !== generation)
          return false;
        contentDownloadRequired =
          isOfflinePackageRequired(error) ||
          (preserveDownloadOnCancel && error?.name === 'AbortError');
        contentError = localizedMessage(
          staticEntry
            ? 'interface:couch.mapPictureOrActorAppearanceCouldNotLoad'
            : 'interface:couch.chapterCouldNotLoad',
          { error: error.message },
        );
        localizedText($('race-message'), () => contentError);
        display.finish({ state: 'error', message: '' });
        return false;
      } finally {
        if (!adoptedActors) nextActors?.release();
        if (!disposed && controller === contentController && !controller.signal.aborted) {
          contentBusy = false;
          updateMenu();
        }
      }
    })();
  }
  function continuationAction() {
    if (
      candidateJourney &&
      nextAttempt?.recipe.entry.mission !== undefined &&
      nextAttempt.recipe.entry.mission !== roundRecipe.entry.mission
    )
      return t('interface:nextMission2');
    if (creatorVersusContinuation(roundRecipe.entry)) return t('interface:nextMission2');
    return roundRecipe.format === 'single' || won.some((n) => n >= 2)
      ? t('interface:rematch')
      : t('interface:nextRound2');
  }
  async function prepareNext(
    destination = null,
    focusOrigin = $('race-start'),
    { configured = null, fresh = false, rulesEdition, ownsStart = null } = {},
  ) {
    const target = destination ?? roundRecipe.entry;
    const sameMission =
      target === roundRecipe.entry ||
      (candidateJourney?.owns(target) &&
        candidateJourney.owns(roundRecipe.entry) &&
        target.mission.id === roundRecipe.entry.mission.id);
    fresh ||= !sameMission || match.status === 'ready';
    const preference = actorPreferences.snapshot();
    const baseRecipe =
      configured ??
      (target === roundRecipe.entry
        ? roundRecipe
        : {
            ...roundRecipe,
            entry: target,
            theme:
              target.themes.find((item) => item.id === target.defaultThemeId) || target.themes[0],
            classId: qualifiedVersusEntry(target)
              ? 'scout'
              : target.classes.some((item) => item.id === roundRecipe.classId)
                ? roundRecipe.classId
                : target.classes[0].id,
            seed: target.creatorRuntimeSeed ?? (candidateJourney ? 1 : roundRecipe.seed),
            seconds: qualifiedVersusEntry(target) ? 0 : roundRecipe.seconds,
          });
    const recipe = {
      ...baseRecipe,
      ...(rulesEdition === undefined ? {} : { rulesEdition }),
      actorStyle: fresh ? preference.actorStyle : roundRecipe.actorStyle,
      actorPreferenceRevision: fresh ? preference.revision : roundRecipe.actorPreferenceRevision,
      actorPresentation: fresh ? null : (actorLease?.pin().presentation ?? null),
      tuning: creatorVersusOwners.has(target)
        ? resolveGameplayTuning(
            target.difficulty ?? browsingJourneyPreferences.snapshot().difficulty,
          )
        : gameplayTuning.snapshot(
            target.difficulty ?? browsingJourneyPreferences.snapshot().difficulty,
          ),
    };
    if (
      !nextAttempt ||
      nextAttempt.previous !== match ||
      nextAttempt.previousRecipe !== roundRecipe ||
      configured ||
      nextAttempt.recipe.actorStyle !== recipe.actorStyle ||
      nextAttempt.recipe.actorPreferenceRevision !== recipe.actorPreferenceRevision ||
      nextAttempt.recipe.entry !== target ||
      dataIdentity(nextAttempt.recipe.tuning) !== dataIdentity(recipe.tuning)
    ) {
      nextAttempt?.lease?.cancel();
      nextAttempt = {
        previous: match,
        previousGeneration: generation,
        previousRecipe: roundRecipe,
        recipe,
        freshActors: fresh,
        journeyRevision: journeyPreferences?.snapshot().revision,
        match: createRound(recipe),
        raceId: ++raceSequence,
        resetWins:
          target !== roundRecipe.entry ||
          roundRecipe.format === 'single' ||
          won.some((n) => n >= 2),
        lease: null,
      };
    }
    const restoreFocus = actionFocus(focusOrigin),
      attempt = nextAttempt,
      { entry } = attempt.recipe,
      owner = pictureOwner(entry);
    contentController?.abort();
    const controller = new AbortController();
    contentController = controller;
    contentScope = shell.scope();
    contentBusy = true;
    contentError = null;
    let adopted = false;
    const current = () =>
      !disposed &&
      (!ownsStart || (ownsStart() && restoreFocus.current(true))) &&
      !controller.signal.aborted &&
      contentController === controller &&
      nextAttempt === attempt &&
      journeyPreferences?.snapshot().revision === attempt.journeyRevision &&
      (!attempt.freshActors ||
        actorPreferences.snapshot().revision === attempt.recipe.actorPreferenceRevision) &&
      roundRecipe === attempt.previousRecipe &&
      match === attempt.previous &&
      generation === attempt.previousGeneration;
    const display = preparationStatus.begin({
      message: () =>
        t('interface:couch.preparingContinuation', {
          action: continuationAction().toLowerCase(),
          mission: contentText(attempt.recipe.entry.level, 'name'),
        }),
      stage: 'verifying',
      isCurrent: () =>
        current() ||
        (adopted &&
          !disposed &&
          !controller.signal.aborted &&
          controller === contentController &&
          match === attempt.match &&
          roundRecipe === attempt.recipe &&
          generation === attempt.raceId),
    });
    preparationDisplay = display;
    updateMenu();
    restoreFocus.pending($('race-picture-cancel'), current());
    let lease = null,
      nextActors = null,
      ownsNextActors = false,
      prepared = null;
    try {
      await ensureVersusPackage(entry, {
        signal: controller.signal,
        prompt: !configured,
        retain: !configured,
      });
      if (!current()) return null;
      lease = await owner.stage(entry, {
        themeId: attempt.recipe.theme.id,
        raceId: attempt.raceId,
        signal: controller.signal,
        onStatus: (status) => display.update(status),
      });
      if (!current()) return null;
      attempt.lease = lease;
      if (
        !attempt.freshActors &&
        entry === roundRecipe.entry &&
        attempt.recipe.theme.id === roundRecipe.theme.id
      )
        nextActors = actorLease;
      else {
        nextActors = await prepareActors(attempt.recipe, {
          signal: controller.signal,
          onStatus: (status) => display.update(status),
        });
        ownsNextActors = true;
      }
      if (!current()) return null;
      await lease.confirm({ onStatus: (status) => display.update(status) });
      if (!current()) return null;
      const retirePrevious = lease.commit();
      const retireActors = publishActors(nextActors);
      // Publish only plain references before cleanup can call back into the page.
      match = attempt.match;
      if (
        currentLibrarySelection?.match === attempt.previous &&
        attempt.recipe.entry === attempt.previousRecipe.entry
      )
        currentLibrarySelection = { ...currentLibrarySelection, match };
      roundRecipe = attempt.recipe;
      theme = attempt.recipe.theme;
      selectedMapKey = attempt.recipe.entry.key;
      $('race-level').value = selectedMapKey;
      preparedFocusMatch = match;
      backdrop = lease.picture;
      generation = attempt.raceId;
      finished = false;
      if (attempt.resetWins) won = [0, 0];
      nextAttempt = null;
      adopted = true;
      retirePrevious();
      retireActors();
      if (
        disposed ||
        controller.signal.aborted ||
        controller !== contentController ||
        match !== attempt.match
      )
        return null;
      clear({ resetDirection: true });
      // Only the adopted, still-owned continuation may replace these controls.
      // A failed/cancelled picture keeps the previous map and theme choices.
      $('race-theme').replaceChildren(
        ...entry.themes.map((item) => localizedOption(() => themeLabel(item), item.id)),
      );
      $('race-theme').value = attempt.recipe.theme.id;
      $('race-class').replaceChildren(
        ...entry.classes
          .filter((item) => !qualifiedVersusEntry(entry) || item.id === 'scout')
          .map((item) => localizedOption(() => contentText(item, 'label'), item.id)),
      );
      $('race-class').value = attempt.recipe.classId;
      paintRound(attempt.recipe);
      if (candidateJourney)
        journeyProfile.record({
          type: 'select',
          mode: 'versus',
          missionId: attempt.recipe.entry.mission.id,
        });
      localizedText($('race-start'), () =>
        roundRecipe.format === 'single' ? t('interface:startRace') : t('interface:startRound'),
      );
      localizedText($('race-message'), () =>
        [lease.picture?.notice, t('interface:bothBoardsUseThePreparedNextPictureStartWhenYou')]
          .filter(Boolean)
          .join(' '),
      );
      contentReady = true;
      display.finish({ message: '' });
      prepared = {
        match,
        controller,
        ownsAction: () => restoreFocus.current(true),
        releaseFocus: restoreFocus.close,
      };
      return prepared;
    } catch (error) {
      if (current()) {
        contentDownloadRequired = false;
        contentError = () => {
          const retryAction = continuationAction();
          return t('interface:couch.continuationPictureOrActorsCouldNotBePrepared', {
            actionLower: retryAction.toLocaleLowerCase(),
            retryAction,
          });
        };
        localizedText($('race-message'), () => contentError);
        display.finish({ state: 'error', message: '' });
        console.warn(t('interface:nextPicturePreparationFailed'), error);
      }
      return null;
    } finally {
      if (!adopted && ownsNextActors) nextActors?.release();
      lease?.cancel();
      if (attempt.lease === lease) attempt.lease = null;
      if (!disposed && controller === contentController && !controller.signal.aborted) {
        if (!adopted) showAcceptedSetup();
        if (
          !adopted &&
          attempt.freshActors &&
          actorPreferences.snapshot().revision !== attempt.recipe.actorPreferenceRevision
        ) {
          preparationStatus.clear();
          preparationDisplay = null;
          contentDownloadRequired = false;
          contentError = t('interface:actorChoiceChangedBothPreviousBoardsAreKeptChooseStart');
          localizedText($('race-message'), () => contentError);
        }
        contentBusy = false;
        updateMenu();
      }
      const mayFocus = !disposed && controller === contentController && !controller.signal.aborted;
      if (prepared && focusOrigin !== $('race-start'))
        restoreFocus.pending($('race-start'), mayFocus);
      else restoreFocus($('race-start'), mayFocus, { retain: !!prepared });
    }
  }
  function pause() {
    // Suspend and controller-loss paths also pass here. Picture preparation
    // may finish, but an interrupted gesture no longer authorizes a start.
    startIntentEpoch++;
    if (startCue) {
      pendingStartCue = {
        kind: startCue.cue.kind,
        owner: startCue.owner,
        generation: startCue.generation,
      };
      hideStartCue();
    }
    sound.pause();
    if (!match || match.status === 'finished') return;
    pauseDuel(match, { preserveContinuation: true });
    clear();
    if (match.status === 'paused') {
      localizedText($('race-start'), () =>
        roundRecipe.format === 'single' ? t('interface:resumeRace') : t('interface:resumeRound'),
      );
      localizedText($('race-message'), () =>
        t('interface:bothPlayersArePausedResumeWhenEveryoneIsReady'),
      );
    }
    updateMenu();
  }
  async function startRace(
    destination = null,
    { rulesEdition, focusOrigin = null, libraryStart = null } = {},
  ) {
    // A confirmed library selection may originate from Settings. Its captured
    // scope remains authoritative through preparation; ordinary Start/Retry
    // still belong to main, and the running-state update leaves Settings only
    // after the exact prepared match has been accepted.
    const startScope = shell.scope(),
      libraryAdmission =
        destination &&
        libraryStart?.isCurrent() === true &&
        libraryStart.attempt?.scope === startScope;
    if (
      disposed ||
      contentBusy ||
      (!contentReady && !destination) ||
      document.hidden ||
      !document.hasFocus() ||
      match.status === 'running' ||
      (libraryStart && !libraryAdmission) ||
      (startScope !== 'main' && !(startScope === 'options' && libraryAdmission))
    )
      return;
    // A ready preview is not a resumed attempt. A preference changed after its
    // picture was prepared is admitted only by a newly staged, equal-board race.
    if (
      match.status === 'ready' &&
      !destination &&
      (roundRecipe.actorStyle !== actorPreferences.snapshot().actorStyle ||
        dataIdentity(roundRecipe.tuning) !==
          dataIdentity(
            gameplayTuning.snapshot(
              roundRecipe.entry.difficulty ?? browsingJourneyPreferences.snapshot().difficulty,
            ),
          ))
    )
      destination = roundRecipe.entry;
    const acceptedEntry = roundRecipe?.entry,
      acceptedStatus = match.status,
      pendingCue =
        !destination &&
        pendingStartCue?.owner === match &&
        pendingStartCue.generation === generation
          ? pendingStartCue.kind
          : null,
      requestedRetry =
        focusOrigin === $('race-retry') ||
        (acceptedStatus === 'finished' && destination && destination.key === acceptedEntry?.key),
      requestedCue =
        pendingCue ||
        (requestedRetry
          ? 'retry'
          : acceptedStatus === 'ready' || acceptedStatus === 'finished' || destination
            ? 'mission'
            : null),
      intent = ++startIntentEpoch,
      ownsStartIntent = () =>
        !disposed && intent === startIntentEpoch && !document.hidden && document.hasFocus();
    let nextConfirmed = false,
      nextFocus = null;
    if (match.status === 'ready' && !destination) {
      const start = $('race-start'),
        previousRun = match,
        previousGeneration = generation,
        previousController = contentController;
      if (!start.isConnected || start.closest('[hidden],[inert]') || !start.getClientRects().length)
        return;
      // Touch activation need not focus a button. Admit this click before
      // acquiring its lease; later focus choices still revoke permission to start.
      start.focus({ preventScroll: true });
      if (
        !ownsStartIntent() ||
        document.activeElement !== start ||
        match !== previousRun ||
        generation !== previousGeneration ||
        contentController !== previousController ||
        contentBusy ||
        shell.scope() !== startScope
      )
        return;
    }
    if (match.status === 'finished' || destination) {
      // An exact library destination prepares its own picture. A failed unused
      // opener must not gate it; use an enabled, visible action as the focus
      // origin until the new attempt makes Start available again.
      const start =
          focusOrigin ||
          (libraryAdmission
            ? $(startScope === 'options' ? 'race-library-switch' : 'race-chapters')
            : destination && !contentReady
              ? $('race-library-switch')
              : $('race-start')),
        previousRun = match,
        previousGeneration = generation,
        previousController = contentController;
      if (!start.isConnected || start.closest('[hidden],[inert]') || !start.getClientRects().length)
        return;
      // Touch activation need not focus a button in every browser. This admitted
      // action owns its initial focus, never a later user choice or background return.
      start.focus({ preventScroll: true });
      if (
        !ownsStartIntent() ||
        document.activeElement !== start ||
        match !== previousRun ||
        generation !== previousGeneration ||
        contentController !== previousController ||
        contentBusy ||
        shell.scope() !== startScope
      )
        return;
      const prepared = await prepareNext(destination, start, {
        rulesEdition,
        ownsStart: libraryAdmission ? ownsStartIntent : null,
      });
      // Preparation may finish after blur, but only this uninterrupted foreground
      // action may start it. Installed pictures pass the same confirmation boundary.
      if (
        !prepared ||
        !prepared.ownsAction() ||
        !ownsStartIntent() ||
        match !== prepared.match ||
        contentController !== prepared.controller ||
        prepared.controller.signal.aborted ||
        shell.scope() !== startScope
      ) {
        prepared?.releaseFocus();
        return;
      }
      nextFocus = prepared;
      nextConfirmed = true;
    }
    const entry = maps.find((row) => row.key === selectedMapKey),
      selectedRun = match,
      ticket = generation;
    if (match.status === 'ready' && !nextConfirmed) {
      const restoreFocus = actionFocus($('race-start'));
      contentBusy = true;
      const controller = contentController,
        ownsReadyStart = () =>
          ownsStartIntent() &&
          restoreFocus.current(true) &&
          controller === contentController &&
          !controller.signal.aborted &&
          match === selectedRun &&
          ticket === generation &&
          match.status === 'ready' &&
          shell.scope() === startScope;
      const display = preparationStatus.begin({
        message: t('interface:confirmingThePreparedPictureBeforeStarting'),
        stage: 'verifying',
        isCurrent: () =>
          !disposed &&
          !controller.signal.aborted &&
          controller === contentController &&
          match === selectedRun &&
          ticket === generation,
      });
      preparationDisplay = display;
      updateMenu();
      try {
        if (offlineAvailability().packageConsent) {
          await ensureVersusPackage(entry, { signal: controller.signal, retain: true });
          if (!ownsReadyStart()) return;
        }
        const confirmation = pictureOwner(entry).confirm(entry, {
          raceId: ticket,
          signal: controller.signal,
          onStatus: (status) => display.update(status),
        });
        if (confirmation?.then) {
          // Start owns this preparation through launch. Keep focus with that
          // deliberate action so a held or repeated Confirm cannot become Cancel.
          await confirmation;
        }
        if (!ownsReadyStart()) return;
        // Keep ownership live through completion UI and input cleanup. Either
        // can produce a newer choice before the final launch boundary below.
        nextFocus = {
          ownsAction: ownsReadyStart,
          releaseFocus: restoreFocus.close,
        };
      } catch (error) {
        if (
          !disposed &&
          match === selectedRun &&
          ticket === generation &&
          controller === contentController &&
          !controller.signal.aborted
        ) {
          contentReady = false;
          contentDownloadRequired = isOfflinePackageRequired(error);
          contentError = shippedMaps.includes(entry)
            ? localizedMessage('interface:couch.preparedPictureCouldNotBeConfirmed', {
                error: error.message,
              })
            : localizedMessage('gameplay:refreshInstalledChaptersInRaceSetupBeforeStarting', {
                value1: error.message,
              });
          localizedText($('race-message'), () => contentError);
          display.finish({ state: 'error', message: '' });
        }
        return;
      } finally {
        if (
          !disposed &&
          match === selectedRun &&
          ticket === generation &&
          controller === contentController &&
          !controller.signal.aborted
        ) {
          if (!contentError) display.finish({ message: '' });
          contentBusy = false;
          updateMenu();
        }
        restoreFocus(
          $('race-chapter-retry'),
          contentError &&
            ownsStartIntent() &&
            match === selectedRun &&
            ticket === generation &&
            controller === contentController &&
            !controller.signal.aborted,
          { retain: !!nextFocus },
        );
      }
    }
    try {
      if (!contentReady || disposed) return false;
      return activateAcceptedMatch({
        owner: match,
        ownerGeneration: generation,
        cue: requestedCue,
        owns: () => ownsStartIntent() && (!nextFocus || nextFocus.ownsAction()),
      });
    } finally {
      nextFocus?.releaseFocus();
    }
  }

  $('race-start').onclick = () => {
    if (libraryContinuation) return;
    if (match.status === 'finished' && creatorVersusContinuation(roundRecipe.entry))
      return continueMission($('race-start'));
    return startRace(
      candidateJourney && match.status === 'finished'
        ? candidateJourney.row(roundRecipe.entry.mission, journeyPreferences.snapshot().difficulty)
        : null,
    );
  };
  $('race-chapter-retry').onclick = async () => {
    if (disposed || contentBusy || match.status !== 'ready') return;
    const retry = $('race-chapter-retry'),
      downloadAndPlay = contentDownloadRequired,
      restoreFocus = actionFocus(retry);
    preparationStatus.clear();
    contentController?.abort();
    contentController = new AbortController();
    contentScope = shell.scope();
    const entry = maps.find((row) => row.key === selectedMapKey);
    // Retry the same untouched attempt and picture choice; only setup changes
    // establish a new race identity and may resolve a new assignment.
    const controller = contentController,
      ready = loadPreparedPicture(entry, {
        prompt: true,
        preserveDownloadOnCancel: downloadAndPlay,
      });
    restoreFocus.pending(
      $('race-picture-cancel'),
      controller === contentController && !controller.signal.aborted,
    );
    try {
      const prepared = await ready,
        current =
          prepared &&
          controller === contentController &&
          !controller.signal.aborted &&
          match.status === 'ready';
      if (downloadAndPlay && current && restoreFocus.current(true)) {
        const start = $('race-start');
        restoreFocus.pending(start, true);
        if (document.activeElement === start) {
          restoreFocus.close();
          return startRace(null, { focusOrigin: start });
        }
      }
      return prepared;
    } finally {
      restoreFocus(
        contentReady ? $('race-start') : $('race-chapter-retry'),
        controller === contentController && !controller.signal.aborted,
      );
    }
  };
  $('race-installed-refresh').onclick = async () => {
    if (disposed || contentBusy || match.status !== 'ready' || !installed) return;
    const restoreFocus = actionFocus($('race-installed-refresh'));
    contentController?.abort();
    contentController = new AbortController();
    let focusController = contentController;
    const controller = contentController,
      oldKey = selectedMapKey,
      oldEntry = maps.find((row) => row.key === oldKey);
    contentBusy = true;
    contentReady = false;
    contentScope = shell.scope();
    if (!shippedMaps.includes(oldEntry)) backdrop = null;
    installedRefreshPending = true;
    installedStatus = localizedMessage('interface:checkingInstalledChapters');
    const display = preparationStatus.begin({
      message: installedStatus,
      stage: 'verifying',
      isCurrent: () => !disposed && !controller.signal.aborted && controller === contentController,
    });
    preparationDisplay = display;
    updateMenu();
    try {
      const rows = await installed.refresh({
        signal: controller.signal,
        onStatus: (status) => display.update(status),
      });
      if (disposed || controller.signal.aborted || controller !== contentController) return;
      maps.splice(0, maps.length, ...shippedMaps, ...rows);
      // Preserve a missing selection as unavailable; never silently switch its owner.
      if (!maps.some((row) => row.key === oldKey)) maps.push(oldEntry);
      showMaps();
      $('race-level').value = oldKey;
      installedRefreshPending = false;
      installedStatus = rows.length
        ? localizedMessage('interface:couch.installedMapCount', { count: rows.length })
        : localizedMessage('interface:openAllMissionsToDownloadCompatibleChaptersThenChoosePlay');
      const ready = prepare();
      focusController = contentController;
      await ready;
    } catch (error) {
      if (disposed || controller.signal.aborted || controller !== contentController) return;
      installedRefreshPending = false;
      contentDownloadRequired = false;
      contentError = localizedMessage('gameplay:installedChaptersUnavailable', {
        value1: error.message,
      });
      installedStatus = contentError;
      localizedText($('race-message'), () => contentError);
      display.finish({ state: 'error', message: '' });
    } finally {
      if (controller === contentController) installedRefreshPending = false;
      if (!disposed && controller === contentController && !controller.signal.aborted) {
        contentBusy = false;
        updateMenu();
      }
      restoreFocus(
        $('race-installed-refresh'),
        focusController === contentController && !focusController.signal.aborted,
      );
    }
  };
  $('race-pause').onclick = () => {
    if (shell.scope() === 'review') shell.back();
    else pause();
  };
  onNativeInactive(suspend)
    .then((stop) => {
      if (disposed) stop();
      else stopNative = stop;
    })
    .catch((error) => {
      if (!disposed)
        localizedText($('race-message'), () =>
          t('gameplay:appLifecycleAdapterUnavailable', { value1: error.message }),
        );
    });
  for (const id of ['race-level', 'race-class', 'race-turn', 'race-time', 'race-format'])
    $(id).onchange = () => {
      if (match?.status !== 'ready' || disposed) return;
      won = [0, 0];
      return prepare();
    };
  $('race-theme').onchange = () => {
    if (match?.status !== 'ready' || disposed) return;
    return prepare();
  };
  $('race-tap').onchange = clear;
  function refreshGameplayTuningNote() {
    const difficulty = (journeyPreferences || browsingJourneyPreferences).snapshot().difficulty;
    const tuning = gameplayTuning.snapshot(difficulty);
    const preset =
      candidateJourney && journeyPreset(difficulty, authoredRoute.source.difficultyCatalogId);
    localizedText($('race-journey-difficulty-note'), () =>
      t('gameplay:tuning.raceNote', {
        difficulty: gameplayDifficultyLabel(difficulty),
        description: gameplayTuningDescription(tuning),
        rules: preset
          ? journeyPresetDescription(preset, tuning.version)
          : t('interface:authoredLivesAndObjectivesStayUnchanged'),
      }),
    );
  }
  if (candidateJourney) {
    let preferenceRevision = journeyPreferences.snapshot().revision,
      preferenceExportSequence = 0;
    journeyPreferences.subscribe((snapshot) => {
      if (snapshot.revision !== preferenceRevision) {
        preferenceRevision = snapshot.revision;
        startIntentEpoch++;
        cancelContent();
        nextAttempt?.lease?.cancel();
        nextAttempt = null;
      }
      $('race-journey-difficulty').value = snapshot.difficulty;
      refreshGameplayTuningNote();
      gameplayTuningPanel?.refresh();
      preferenceExportSequence++;
      $('race-journey-preferences-recovery').hidden = snapshot.durable;
      localizedText($('race-journey-preferences-message'), () => snapshot.error);
      journeyChooser?.refresh();
      showMaps();
      $('race-level').value = candidateJourney.row(
        roundRecipe?.entry.mission ?? initialJourneyMission,
        snapshot.difficulty,
      ).key;
    });
    $('race-journey-preferences-retry').onclick = () => {
      const restoreFocus = document.activeElement === $('race-journey-preferences-retry');
      const snapshot = journeyPreferences.retry();
      if (snapshot.durable && restoreFocus && !document.hidden && document.hasFocus())
        $('race-journey-difficulty').focus({ preventScroll: true });
    };
    $('race-journey-preferences-export').onclick = async () => {
      const ticket = ++preferenceExportSequence;
      try {
        const result = await downloadJSON(
          JSON.parse(journeyPreferences.export()),
          'revealline-journey-difficulty.json',
        );
        if (ticket === preferenceExportSequence && !$('race-journey-preferences-recovery').hidden)
          localizedText(
            $('race-journey-preferences-message'),
            () => `${journeyPreferences.snapshot().error} ${result.message}`,
          );
      } catch (error) {
        if (ticket === preferenceExportSequence && !$('race-journey-preferences-recovery').hidden)
          localizedText($('race-journey-preferences-message'), () =>
            t('interface:couch.preferenceExportError', { error: error.message }),
          );
      }
    };
    $('race-journey-difficulty').onchange = () => {
      journeyPreferences.choose($('race-journey-difficulty').value);
      showMaps();
      $('race-level').value = candidateJourney.row(
        roundRecipe.entry.mission,
        journeyPreferences.snapshot().difficulty,
      ).key;
      if (match.status === 'ready' && !contentBusy) void prepare();
    };
    const chooseMission = async (mission, skipped = null) => {
      if (!mission || contentBusy || disposed) return;
      const entry = candidateJourney.row(mission, journeyPreferences.snapshot().difficulty);
      if (!entry) return;
      pause();
      const previous = match;
      await startRace(entry);
      if (skipped && match !== previous && roundRecipe.entry === entry)
        journeyProfile.record({
          type: 'skip',
          mode: 'versus',
          missionId: skipped.id,
        });
    };
    $('race-journey-find').onclick = () => openMissionLibrary($('race-journey-find'));
    $('race-journey-skip').onclick = () => {
      if (contentBusy) return;
      const next = candidateJourney.next(roundRecipe.entry.mission.id);
      if (!next) return openMissionLibrary($('race-journey-skip'));
      if (journeySkipArmed !== match) {
        pause();
        journeySkipArmed = match;
        localizedText($('race-journey-skip'), () => t('interface:confirmSkip'));
        localizedText($('race-message'), () =>
          t('interface:couch.skipConfirm', { mission: contentText(next, 'name') }),
        );
        return;
      }
      journeySkipArmed = null;
      void chooseMission(next, roundRecipe.entry.mission);
    };
  }
  $('race-journey-save-retry').onclick = () => void activeProgressProfile()?.flush();
  $('race-journey-save-export').onclick = async () => {
    const profile = activeProgressProfile();
    if (!profile) return;
    try {
      await downloadJSON(JSON.parse(profile.export()), profile.backupFilename);
    } catch (error) {
      localizedText($('race-journey-save-message'), () =>
        t('interface:couch.progressExportError', { error: error.message }),
      );
    }
  };
  $('race-journey-next').onclick = () => continueMission();
  $('race-journey-find').onclick = () => openMissionLibrary($('race-journey-find'));
  if (!candidateJourney) {
    $('race-journey-difficulty-field').hidden = false;
    $('race-journey-difficulty').replaceChildren(
      ...['gentle', 'standard', 'expert'].map((id) =>
        localizedOption(() => gameplayDifficultyLabel(id), id),
      ),
    );
    browsingJourneyPreferences.subscribe((snapshot) => {
      const creatorEntry = creatorVersusOwners.has(roundRecipe?.entry) ? roundRecipe.entry : null;
      $('race-journey-difficulty').value = creatorEntry?.difficulty ?? snapshot.difficulty;
      refreshGameplayTuningNote();
      $('race-journey-preferences-recovery').hidden = snapshot.durable;
      localizedText($('race-journey-preferences-message'), () => snapshot.error);
      gameplayTuningPanel?.refresh();
    });
    $('race-journey-difficulty').onchange = () => {
      const creatorEntry = creatorVersusOwners.has(roundRecipe?.entry) ? roundRecipe.entry : null;
      if (creatorEntry) {
        $('race-journey-difficulty').value = creatorEntry.difficulty;
        return;
      }
      browsingJourneyPreferences.choose($('race-journey-difficulty').value);
    };
    $('race-journey-preferences-retry').onclick = () => browsingJourneyPreferences.retry();
    $('race-journey-preferences-export').onclick = () =>
      downloadJSON(
        JSON.parse(browsingJourneyPreferences.export()),
        'revealline-journey-difficulty.json',
      );
  }
  gameplayTuningPanel = mountGameplayTuning({
    root: $('race-gameplay-tuning'),
    controller: gameplayTuning,
    getDifficulty: () => (journeyPreferences || browsingJourneyPreferences).snapshot().difficulty,
  });
  gameplayTuning.subscribe(refreshGameplayTuningNote);
  const couchTouch = attachCouchTouch({
    controls: $('race-touch-0').closest('.race-fields'),
    clear: () => input?.clearPhysical(),
  });
  const controllerSession = createControllerSession({
    restoreKey: COUCH_RESTORE_KEY,
    onLoss: () => {
      pendingPadLoss = true;
      pause();
      clear();
    },
  });
  const controllerSetup = mountControllerSetup({
    root: $('race-settings-panel-controls'),
    session: controllerSession,
  });
  const input = attachCouchInput({
    controllerSession,
    initialSlots: incomingContinuation?.slots ?? [null, null],
    getTouchSettings: () => couchTouch.snapshot(),
    continuousSteering: () => true,
    getGamepads: readCachedPads,
    active: () => match?.status === 'running',
    tapMode: () => $('race-tap').checked,
    onPause: pause,
    onAcceptedInput: (player, source) => shell?.observe(player, source),
    onStop: (player) => {
      if (match) releaseInputs(match.runs[player]);
    },
    onPads: (count, nextSlots) => {
      assignmentsChanged = nextSlots.some((slot, i) => slot !== slots[i]);
      slots = [...nextSlots];
      const message = () =>
        t('interface:multiplayerControllers.assigned', {
          count,
          players: slots
            .map((slot, i) =>
              t('gameplay:player', {
                value1: i + 1,
                value2:
                  slot === null
                    ? t('interface:keyboardTouch')
                    : t('gameplay:padSlot', { value1: slot }),
              }),
            )
            .join(' · '),
        });
      if ($('race-pad-status').textContent !== message())
        localizedText($('race-pad-status'), message);
    },
  });
  let soloReturnStorage;
  try {
    soloReturnStorage = sessionStorage;
  } catch {
    /* The fixed Solo title route remains available. */
  }
  const encounterHelp = attachEncounterHelp({
    root: $('race-encounter-help'),
    getLevels: () => match?.runs?.map((run) => run.level) ?? [],
  });
  shell = createCouchShell({
    controllerNeedsTouch: (seat) => slots[seat] !== null && !controllerSession.completeFlight(seat),
    getSceneContext: () => ({
      themeId: theme?.id ?? 'fpv',
      active: match?.status !== 'running',
    }),
    authoredRoute: authoredRoute?.id ?? 'legacy',
    coarse: matchMedia('(pointer: coarse)').matches,
    getDepartureState: () => ({ match, generation }),
    onLeaveRequest: pause,
    onMissions: openMissionLibrary,
    getSoloReturnToken: () =>
      !libraryHandoff ||
      (librarySourceReturn?.mode === 'solo' && librarySourceReturn.journey === 'legacy')
        ? readVersusSoloReturnToken({
            href: location.href,
            storage: soloReturnStorage,
          })
        : null,
    getSoloJourneyRoute: () =>
      librarySourceReturn?.mode === 'solo'
        ? librarySourceReturn.journey
        : candidateJourney?.owns(roundRecipe?.entry)
          ? authoredRoute.id
          : null,
    getTeamJourneyRoute: () =>
      librarySourceReturn?.mode === 'team' ? librarySourceReturn.journey : null,
    onTransition: ({ to, back = false } = {}) => {
      ++libraryOpenEpoch;
      cancelLibraryDecision();
      clear();
      if (back || to !== contentScope) cancelContent();
      if (to === 'help') encounterHelp.refresh();
    },
    onNewMatch: () => {
      if (match?.status === 'running' || disposed) return;
      won = [0, 0];
      prepare();
      contentScope = 'setup';
    },
    onRetry: () => {
      if (match?.status !== 'paused' || disposed) return;
      void startRace(roundRecipe.entry, { focusOrigin: $('race-retry') });
    },
  });

  function catalogueAttempt() {
    return {
      match,
      generation,
      recipe: roundRecipe,
      backdrop,
      won,
      scope: shell.scope(),
      startEpoch: startIntentEpoch,
    };
  }
  function catalogueAttemptCurrent(attempt) {
    return (
      !disposed &&
      !document.hidden &&
      document.hasFocus() &&
      match === attempt.match &&
      generation === attempt.generation &&
      roundRecipe === attempt.recipe &&
      backdrop === attempt.backdrop &&
      won === attempt.won &&
      shell.scope() === attempt.scope &&
      startIntentEpoch === attempt.startEpoch &&
      match.status !== 'running'
    );
  }
  function libraryContext() {
    const attempt = catalogueAttempt();
    let retired = false;
    return {
      attempt,
      retire: () => {
        retired = true;
      },
      isCurrent: () => !retired && catalogueAttemptCurrent(attempt),
    };
  }
  async function continueMission(origin = $('race-journey-next')) {
    if (
      disposed ||
      contentBusy ||
      libraryContinuation ||
      match.status !== 'finished' ||
      document.hidden ||
      !document.hasFocus() ||
      shell.scope() !== 'main'
    )
      return;
    const authoredNext = candidateJourney?.owns(roundRecipe.entry)
      ? candidateJourney.next(roundRecipe.entry.mission.id)
      : null;
    if (authoredNext) {
      await startRace(candidateJourney.row(authoredNext, journeyPreferences.snapshot().difficulty));
      return;
    }
    origin.focus({ preventScroll: true });
    const creatorNext = creatorVersusContinuation(roundRecipe.entry);
    if (creatorNext) {
      if (!creatorNext.entry) throw new Error('The exact next creator mission is unavailable.');
      await startRace(creatorNext.entry, { focusOrigin: origin });
      if (roundRecipe.entry === creatorNext.entry)
        currentLibrarySelection = {
          match,
          id: libraryMissionId({
            owner: `creator:${creatorNext.owner.prepared.editionId}`,
            edition: creatorNext.owner.prepared.editionId,
            campaign: creatorNext.mission.campaignId,
            mission: creatorNext.mission.levelId,
            revision: creatorNext.owner.prepared.manifest.content.project.missions.find(
              (mission) => mission.id === creatorNext.mission.levelId,
            ).revision,
          }),
        };
      return;
    }
    if (candidateJourney) return openMissionLibrary(origin);
    const restore = actionFocus(origin),
      context = libraryContext(),
      operation = { controller: new AbortController(), previous: match },
      current = () =>
        libraryContinuation === operation &&
        !operation.controller.signal.aborted &&
        context.isCurrent() &&
        restore.current(true);
    libraryContinuation = operation;
    contentBusy = true;
    const display = preparationStatus.begin({
      message: t('interface:preparingNextMissionYourResultAndPictureAreKept'),
      stage: 'reading',
      isCurrent: current,
    });
    preparationDisplay = display;
    updateMenu();
    restore.pending($('race-picture-cancel'), true);
    try {
      const { library } = await getMissionLibrary();
      if (!current()) return;
      const entry = roundRecipe.entry;
      const rulesEdition = roundRecipe.rulesEdition ?? CLASSIC_RULES_ORIGINAL;
      const row =
        currentLibrarySelection?.match === match
          ? library.find(currentLibrarySelection.id)
          : candidateJourney
            ? library.missions.find(
                (item) =>
                  item.ownerId === `journey:${authoredRoute.id}` &&
                  item.runtimeId === entry.mission.id &&
                  item.modes.includes('versus'),
              )
            : retainedLibraryMission(library, {
                mode: 'versus',
                levelId: entry.level.id,
                campaignKey: classicRulesCampaignIdentity({
                  campaignKey: entry.musicCampaignKey,
                  rulesEdition,
                }),
                sourcePackId: entry.sourcePackId ?? entry.pictureEntry?.sourcePackId ?? null,
                rulesEdition,
              });
      if (!row) throw new Error(t('interface:theExactCurrentMissionEditionIsUnavailable'));
      let next = librarySuccessor(library, row, 'versus');
      if (!next) {
        libraryCompleteMatch = match;
        localizedText($('race-message'), () =>
          t('interface:versusLibraryCompleteRematchOrChooseAllMissionsWheneverYou'),
        );
        return;
      }
      const targetId = next.id;
      display.update({
        message: () =>
          t('interface:couch.preparingNextMission', { mission: contentText(next, 'name') }),
        stage: 'verifying',
      });
      const prepared = await library.prepare(next, {
        mode: 'versus',
        signal: operation.controller.signal,
      });
      if (!current() || prepared.state === 'cancelled') return;
      // Installation may rebuild rows. Re-resolve only this exact qualified edition.
      next = library.find(targetId);
      if (!next || library.availability(next, 'versus').state !== 'ready')
        throw new Error(t('interface:theExactNextMissionIsNotReady'));
      contentBusy = false;
      display.finish({ message: '' });
      updateMenu();
      restore($('race-start'), true);
      if (!context.isCurrent() || operation.controller.signal.aborted) return;
      const started = await library.launch(next, {
        mode: 'versus',
        ...context,
        continuousNext: true,
      });
      if (started === false && context.isCurrent() && !operation.controller.signal.aborted)
        throw new Error(t('interface:theNextMissionCouldNotStart'));
    } catch (error) {
      if (context.isCurrent() && !operation.controller.signal.aborted)
        localizedText($('race-message'), () =>
          t('interface:couch.nextMissionError', { error: error.message }),
        );
    } finally {
      display.finish({ message: '' });
      if (preparationDisplay === display) preparationDisplay = null;
      if (!disposed && libraryContinuation === operation) {
        libraryContinuation = null;
        if (match === operation.previous) contentBusy = false;
        updateMenu();
      }
      if (disposed) restore.close();
      else
        restore(
          $('race-journey-next').hidden ? $('race-start') : $('race-journey-next'),
          context.isCurrent() && !operation.controller.signal.aborted,
        );
    }
  }
  function cancelLibraryDecision() {
    libraryDecision?.finish(false);
    libraryLaunchController?.abort();
    libraryLaunchController = null;
  }
  async function confirmLibraryReplacement(context, title) {
    if (!context.isCurrent()) return false;
    if (match.status !== 'paused') return true;
    if (libraryDecision) return false;
    const dialog = document.createElement('dialog');
    dialog.id = 'race-library-replace';
    dialog.className = 'race-chapter-replace field-kit-panel';
    const heading = document.createElement('h2');
    heading.id = 'race-library-replace-title';
    dialog.setAttribute('aria-labelledby', heading.id);
    localizedText(heading, () => title);
    const copy = document.createElement('p');
    localizedText(copy, () => t('interface:stayKeepsBothPausedBoardsAndThisSeriesReplacePlay'));
    const stay = document.createElement('button'),
      replace = document.createElement('button');
    stay.id = 'race-library-stay';
    localizedText(stay, () => t('interface:stay'));
    stay.type = 'button';
    replace.id = 'race-library-play';
    localizedText(replace, () => t('interface:replacePlay'));
    replace.type = 'button';
    dialog.append(heading, copy, stay, replace);
    document.body.append(dialog);
    return new Promise((resolve) => {
      const decision = {
        finish(accepted) {
          if (libraryDecision !== decision) return;
          libraryDecision = null;
          if (dialog.open) dialog.close();
          dialog.remove();
          resolve(accepted && context.isCurrent());
        },
      };
      libraryDecision = decision;
      stay.onclick = () => decision.finish(false);
      replace.onclick = () => decision.finish(true);
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        decision.finish(false);
      });
      dialog.showModal();
      stay.focus();
      if (!context.isCurrent()) decision.finish(false);
    });
  }
  async function departLibraryMission(context, confirmInventory = null) {
    if (!context.isCurrent()) return false;
    const row = missionLibrary.library.find(context.libraryMissionId);
    if (!row || !row.modes.includes(context.mode))
      throw new Error(t('interface:theSelectedMissionChangedRefreshTheLibrary'));
    let href = missionLibraryHref({
      baseURL: location.href,
      currentMode: 'versus',
      mode: context.mode,
      journey: row.collection === 'Journey' ? row.editionId : 'legacy',
      missionId: row.id,
      sourceJourney: authoredRoute?.id ?? 'legacy',
    });
    if (context.mode === 'versus') {
      const destination = new URL(href, location.href);
      destination.searchParams.set(
        'versus-next',
        JSON.stringify({
          mission: row.id,
          format: roundRecipe.format,
          turnPolicy: roundRecipe.turnPolicy,
          seconds: Number($('race-time').value),
          tap: $('race-tap').checked,
          slots: [...slots],
          difficulty: (journeyPreferences || browsingJourneyPreferences).snapshot().difficulty,
        }),
      );
      href = destination.href;
    }
    if (!(await confirmLibraryReplacement(context, `Open ${row.name}?`))) return false;
    if (!context.isCurrent() || missionLibrary.library.find(row.id) !== row) return false;
    if (confirmInventory && !(await confirmInventory())) return false;
    if (!context.isCurrent() || missionLibrary.library.find(row.id) !== row) return false;
    if (offlineAvailability().packageConsent)
      await gameplayDownloads.ensureDestination(href, {
        signal: context.signal,
        runtimeOnly: row.collection === 'Custom',
      });
    if (!context.isCurrent() || missionLibrary.library.find(row.id) !== row) return false;
    location.href = href;
    return true;
  }
  async function launchLibrarySelection(pack, selection, context) {
    if (!context.isCurrent()) return false;
    if (candidateJourney || context.mode !== 'versus') {
      if (context.mode === 'versus') return preflightLibraryDeparture(pack, selection, context);
      return departLibraryMission(context);
    }
    if (!pack) {
      const entry = shippedMaps.find(
        (row) =>
          row.pictureEntry === baseEntry &&
          row.level.id === selection.levelId &&
          String(row.level.revision) === String(selection.levelRevision),
      );
      if (!entry) throw new Error(t('interface:thisExactBaseMissionIsUnavailable'));
      if (!(await confirmLibraryReplacement(context, `Play ${entry.level.name}?`))) return false;
      if (!context.isCurrent()) return false;
      await startRace(entry, {
        rulesEdition: selection.rulesEdition,
        libraryStart: context.continuousNext ? null : context,
      });
      const started = roundRecipe.entry === entry && match.status === 'running';
      if (started) currentLibrarySelection = { match, id: context.libraryMissionId };
      return started;
    }
    const controller = new AbortController();
    libraryLaunchController = controller;
    const captureFocus = () =>
      trackMissionLibraryOpening({
        onRetire: () => {
          context.retire();
          controller.abort();
        },
      });
    let focus = captureFocus(),
      staged;
    const current = () =>
      context.isCurrent() &&
      focus.current() &&
      !controller.signal.aborted &&
      libraryLaunchController === controller;
    try {
      staged = await stageCataloguePack(pack, {
        signal: controller.signal,
        selection,
        attempt: context.attempt,
        isCurrent: current,
        onStatus: (status) => {
          if (context.isCurrent()) localizedText($('race-message'), () => status.message);
        },
      });
      if (!current()) return false;
      // The explicit decision temporarily owns focus; afterwards confirmation
      // receives a new lease so a later toolbar action cannot start this race.
      focus.dispose();
      const title =
        missionLibrary.library.find(context.libraryMissionId)?.name || 'selected mission';
      if (!(await confirmLibraryReplacement(context, `Play ${title}?`))) return false;
      focus = captureFocus();
      await staged.confirm();
      if (!current()) return false;
      const adopted = staged.adopt(current);
      if (!adopted?.current() || !focus.current() || controller.signal.aborted) return false;
      focus.dispose();
      const started = adopted.start();
      if (started) currentLibrarySelection = { match, id: context.libraryMissionId };
      return started;
    } finally {
      focus.dispose();
      staged?.dispose();
      if (libraryLaunchController === controller) libraryLaunchController = null;
    }
  }
  async function preflightLibraryDeparture(pack, selection, context) {
    const controller = new AbortController();
    libraryLaunchController = controller;
    const captureFocus = () =>
      trackMissionLibraryOpening({
        onRetire: () => {
          context.retire();
          controller.abort();
        },
      });
    let focus = captureFocus();
    const current = () =>
      context.isCurrent() &&
      focus.current() &&
      !controller.signal.aborted &&
      libraryLaunchController === controller;
    const onStatus = (status) => {
      if (current()) {
        context.preparationFeedback?.update(status);
        localizedText($('race-message'), () => status.message);
      }
    };
    let owner = null,
      staged = null;
    try {
      if (pack) {
        staged = await stageCataloguePack(pack, {
          signal: controller.signal,
          selection,
          attempt: {
            ...context.attempt,
            recipe: {
              ...context.attempt.recipe,
              seconds: Number($('race-time').value),
            },
          },
          isCurrent: current,
          onStatus,
        });
      } else {
        const level = baseEntry.campaign.levels.find(
          (level) =>
            level.id === selection.levelId &&
            String(level.revision) === String(selection.levelRevision),
        );
        if (!level || campaignKey(baseEntry.campaign) !== selection.campaignKey)
          throw new Error(t('interface:thisExactBaseMissionIsUnavailable'));
        const theme =
          baseEntry.themes.find(
            (item) => item.id === (level.themeId || baseEntry.campaign.themeId),
          ) || baseEntry.themes[0];
        // A separate owner verifies the destination without replacing either
        // source board or committing the target into the Journey picture owner.
        owner = createCouchStaticPictures({
          entries: [baseEntry],
          presentationPage,
        });
        staged = await owner.stage(
          { level, pictureEntry: baseEntry },
          {
            themeId: theme.id,
            raceId: ++raceSequence,
            signal: controller.signal,
            onStatus,
          },
        );
      }
      if (!current()) return false;
      await staged.confirm({ onStatus });
      if (!current()) return false;
      // Stay/Replace owns focus while deciding; authenticate again under the
      // accepted decision before navigating to the exact retained edition.
      focus.dispose();
      return await departLibraryMission(context, async () => {
        focus = captureFocus();
        if (context.inventory)
          await libraryInventory.confirm(context.inventory, {
            signal: controller.signal,
          });
        return current();
      });
    } finally {
      focus.dispose();
      staged?.cancel?.();
      staged?.dispose?.();
      owner?.dispose();
      if (libraryLaunchController === controller) libraryLaunchController = null;
    }
  }
  async function launchPreparedLibrarySelection(
    metadataPack,
    selection,
    context,
    externalRow = null,
  ) {
    if (!candidateJourney || context.mode !== 'versus' || context.continuousNext)
      return launchMetadataSelection(metadataPack, selection, context, externalRow);
    if (!context.isCurrent() || contentBusy || libraryContinuation) return false;
    const operation = {
      controller: new AbortController(),
      previous: match,
      kind: 'selection',
    };
    libraryContinuation = operation;
    contentBusy = true;
    const current = () =>
      libraryContinuation === operation &&
      !operation.controller.signal.aborted &&
      context.isCurrent();
    const selected = missionLibrary.library.find(context.libraryMissionId);
    const display = preparationStatus.begin({
      message: () =>
        t('interface:couch.preparingSelectedMission', {
          mission: selected ? contentText(selected, 'name') : t('interface:selectedMission'),
        }),
      stage: 'verifying',
      isCurrent: current,
    });
    preparationDisplay = display;
    updateMenu();
    // The activated card has closed. Keep one reachable action while its exact
    // destination is verified; the input lease starts at this Cancel control.
    $('race-picture-cancel').focus({ preventScroll: true });
    try {
      return await launchMetadataSelection(
        metadataPack,
        selection,
        { ...context, preparationFeedback: display },
        externalRow,
      );
    } finally {
      display.finish({ message: '' });
      if (preparationDisplay === display) preparationDisplay = null;
      if (!disposed && libraryContinuation === operation) {
        libraryContinuation = null;
        contentBusy = false;
        updateMenu();
      }
    }
  }
  async function launchMetadataSelection(metadataPack, selection, context, externalRow = null) {
    if (!metadataPack) return launchLibrarySelection(null, selection, context);
    if (!context.isCurrent()) return false;
    const controller = new AbortController();
    libraryLaunchController = controller;
    const focus = trackMissionLibraryOpening({
      onRetire: () => {
        context.retire();
        controller.abort();
      },
    });
    const current = () =>
      context.isCurrent() &&
      focus.current() &&
      libraryLaunchController === controller &&
      !controller.signal.aborted;
    try {
      if (context.mode !== 'versus') {
        await libraryInventory.confirm(context.inventory, {
          signal: controller.signal,
        });
        if (!current()) return false;
        focus.dispose();
        return await departLibraryMission(context, async () => {
          const acceptedInput = trackMissionLibraryOpening({
            onRetire: () => {
              context.retire();
              controller.abort();
            },
          });
          try {
            await libraryInventory.confirm(context.inventory, {
              signal: controller.signal,
            });
            return (
              context.isCurrent() &&
              acceptedInput.current() &&
              !controller.signal.aborted &&
              libraryLaunchController === controller
            );
          } finally {
            acceptedInput.dispose();
          }
        });
      }
      const pack = await materializeMissionPack({
        inventory: libraryInventory,
        metadata: context.inventory,
        metadataPack,
        signal: controller.signal,
        inspect: async ({ signal }) => {
          const result = externalRow
            ? await missionInstaller().inspectExternal(externalRow, { signal })
            : await missionInstaller().inspect({ signal });
          if (externalRow && !result.ready) throw new Error(result.reason);
          return result;
        },
      });
      if (!current()) return false;
      // Existing staging owns the next input lease, both boards, exact picture
      // and Stay/Replace. No metadata object becomes runtime ownership.
      focus.dispose();
      return launchLibrarySelection(pack, selection, context);
    } finally {
      focus.dispose();
      if (libraryLaunchController === controller) libraryLaunchController = null;
      refreshLibraryWarning();
    }
  }
  function refreshLibraryWarning() {
    const notice = $('race-library-inventory-status');
    if (notice)
      localizedText(notice, () => libraryInventory?.state().reason || libraryInventoryNotice);
  }
  function missionInstaller() {
    return (libraryInstaller ??= libraryInstallerFactory());
  }
  async function launchInstalledCreatorVersus(prepared, mission, context) {
    if (!context.isCurrent() || context.mode !== 'versus') return false;
    const owner = creatorVersusOwner(prepared),
      exactMission = owner.host.catalog.missions.find(
        (candidate) =>
          candidate.id === mission.id &&
          candidate.campaignId === mission.campaignId &&
          candidate.levelId === mission.levelId,
      ),
      entry = owner.rows.find(
        (candidate) =>
          candidate.mission === exactMission &&
          candidate.difficulty === browsingJourneyPreferences.snapshot().difficulty,
      );
    if (!entry) throw new Error('This exact creator mission is unavailable in Versus.');
    if (!(await confirmLibraryReplacement(context, `Play ${mission.name}?`))) return false;
    if (!context.isCurrent()) return false;
    await startRace(entry, { libraryStart: context.continuousNext ? null : context });
    const started = roundRecipe.entry === entry && match.status === 'running';
    if (started) currentLibrarySelection = { match, id: context.libraryMissionId };
    return started;
  }
  async function getMissionLibrary() {
    if (missionLibrary) return missionLibrary;
    if (missionLibraryLoading) return missionLibraryLoading;
    missionLibraryLoading = (async () => {
      const index = await readActorMissionIndex();
      const route =
        authoredRoute ||
        (await loadAuthoredJourneyRoute(DEFAULT_JOURNEY_ROUTES.versus, { fullSource: true }));
      const originalThemes = (await json('../content-design/themes.json')).themes;
      const libraryThemes = authoredJourneyUsesActorMaterials(route.id)
        ? journeyActorThemeCandidates(originalThemes, {
            includeOriginals: route.preserveOriginalThemes === true,
          })
        : originalThemes;
      const preview =
        candidateJourney ||
        createCandidateVersusHost(route.source, {
          themes: libraryThemes,
          corePackIds: route.corePackIds,
          optionalCampaignIds: route.optionalCampaignIds,
        });
      const { createCandidateSoloHost } = await import('../content-design/solo-host.mjs');
      librarySoloPreview = createCandidateSoloHost(route.source, {
        themes: libraryThemes,
        corePackIds: route.corePackIds,
        optionalCampaignIds: route.optionalCampaignIds,
      });
      const profile = journeyProfile || createJourneyProfileStore({ profileKey: route.profileKey });
      if (!journeyProfile) await profile.load();
      const { createRemoteTeamLibrarySources } = await import('../mission-library/remote-team.mjs');
      const teamSources = createRemoteTeamLibrarySources({
        launch: departLibraryMission,
        difficulty: () => (journeyPreferences || browsingJourneyPreferences).snapshot().difficulty,
      });
      const { createSpatialNextEditionSources } = await import(
        '../mission-library/spatial-next-editions.mjs'
      );
      spatialEditionOwner = await createSpatialNextEditionSources({
        activeRouteId: route.id,
        originalThemes,
        difficulty: () => (journeyPreferences || browsingJourneyPreferences).snapshot().difficulty,
        launch: departLibraryMission,
      });
      // Browsing must survive a denied storage getter. Only deliberate verified
      // installation/Play constructs this independent writer/decoder service.
      libraryInstallerFactory ??= () =>
        createCouchChapterInstaller({
          channel: contentChannel,
          registeredEntries: [baseEntry],
          missionIndex: index,
          baseURL: new URL('../../', location.href),
        });
      if (!libraryInventory) {
        let reader = null;
        // Capability failures belong to the inventory's unavailable state, not
        // the whole mission library. Keep the strict reader and retry its real
        // construction on refresh; never classify unknown storage as empty.
        const getReader = () =>
          (reader ??= createExternalChapterInventoryReader({
            profileKey: `revealline-mmm.library.${contentChannel}.v1`,
            packsKey: `revealline-mmm.packs.${contentChannel}.v1`,
          }));
        libraryInventory = await createMissionLibraryInventory({
          reader: {
            snapshot: (options) => getReader().snapshot(options),
            confirm: (snapshot, options) => getReader().confirm(snapshot, options),
            close: () => reader?.close(),
          },
        });
      }
      if (disposed || artworkLifetime.signal.aborted) {
        libraryInventory.close();
        spatialEditionOwner.dispose();
        throw new DOMException(t('interface:missionLibraryClosed'), 'AbortError');
      }
      await refreshLibraryInventory();
      const result = await createMetadataInstalledMissionLibrary({
        index,
        baseEntry,
        getInventory: libraryInventory.getInventory,
        journeySources: [
          combineJourneyLibrarySources([
            {
              mode: 'versus',
              source: journeyLibrarySource({
                editionId: route.id,
                edition: route.id === DEFAULT_JOURNEY_ROUTES.versus ? 'New Journey' : route.label,
                catalog: preview.catalog,
                profile,
                details: (mission) =>
                  journeyMissionDetails(
                    preview.manifest(
                      mission,
                      (journeyPreferences || browsingJourneyPreferences).snapshot().difficulty,
                    ),
                  ),
                tags: (mission) => authoredJourneyMissionTags(mission, preview.manifest(mission)),
                card: (mission) =>
                  preview.card(
                    mission,
                    (journeyPreferences || browsingJourneyPreferences).snapshot().difficulty,
                  ),
                launch: async (mission, context) => {
                  if (!context.isCurrent()) return false;
                  if (!candidateJourney || context.mode !== 'versus')
                    return departLibraryMission(context);
                  const entry = candidateJourney.row(
                    mission,
                    journeyPreferences.snapshot().difficulty,
                  );
                  if (!(await confirmLibraryReplacement(context, `Play ${mission.name}?`)))
                    return false;
                  if (!context.isCurrent()) return false;
                  await startRace(entry, { libraryStart: context.continuousNext ? null : context });
                  const started = roundRecipe.entry === entry && match.status === 'running';
                  if (started)
                    currentLibrarySelection = {
                      match,
                      id: context.libraryMissionId,
                    };
                  return started;
                },
              }),
            },
            {
              mode: 'solo',
              source: journeyLibrarySource({
                editionId: route.id,
                edition: route.id === DEFAULT_JOURNEY_ROUTES.versus ? 'New Journey' : route.label,
                catalog: librarySoloPreview.catalog,
                profile,
                details: (mission) =>
                  journeyMissionDetails(
                    librarySoloPreview
                      .select(
                        mission,
                        (journeyPreferences || browsingJourneyPreferences).snapshot().difficulty,
                      )
                      ?.manifests.find((item) => item.missionId === mission.levelId),
                  ),
                tags: (mission) =>
                  authoredJourneyMissionTags(
                    mission,
                    librarySoloPreview
                      .select(mission, 'standard')
                      ?.manifests.find((item) => item.missionId === mission.levelId),
                  ),
                card: (mission) =>
                  librarySoloPreview.card(
                    mission,
                    (journeyPreferences || browsingJourneyPreferences).snapshot().difficulty,
                  ),
                launch: (_mission, context) => departLibraryMission(context),
              }),
            },
          ]),
          ...spatialEditionOwner.sources,
          ...teamSources,
        ],
        compatibility: ({ entry, level }) => {
          const modes = [];
          try {
            createRun(level, {
              classRecipes: entry.classRecipes,
              classId: entry.classRecipes[0].id,
            });
            modes.push('solo');
          } catch {}
          try {
            createDuel(level, {
              classRecipes: entry.classRecipes,
              classId: entry.classRecipes[0].id,
            });
            modes.push('versus');
          } catch {}
          return modes;
        },
        describe: ({ level }) => {
          const actual = normalizedLevel(level);
          return {
            rules: `${Math.round(actual.goal.coverage * 100)}% coverage · ${actual.rules.lives} lives · ${actual.rules.moveSpeed} cells/s · Authored rules`,
          };
        },
        availabilityClassic: (row, pack) => {
          if (!libraryInventory.state().ready)
            return {
              state: 'unavailable',
              reason: libraryInventory.state().reason,
            };
          if (row.source === 'external' && pack) {
            const proof = libraryExternalProofs.get(row.packId);
            return proof?.inventory === libraryInventory.getInventory() &&
              proof.epoch === libraryOpenEpoch
              ? { state: 'ready' }
              : {
                  state: 'unavailable',
                  retry: true,
                  reason: t(
                    'interface:installedOriginalsNeedCheckingRetryVerifiesThemWithoutDownloading',
                  ),
                };
          }
          return pack
            ? { state: 'ready' }
            : {
                state: 'download',
                bytes: row.download?.bytes ?? row.sourceFile.bytes,
              };
        },
        availabilityCustom: () =>
          libraryInventory.state().ready
            ? { state: 'ready' }
            : { state: 'unavailable', reason: libraryInventory.state().reason },
        prepareClassic: async (row, { signal }) => {
          await gameplayDownloads.ensureClassic(row.packId, { signal });
          if (!libraryInventory.state().ready) throw new Error(libraryInventory.state().reason);
          const epoch = libraryOpenEpoch;
          let installed;
          if (row.source === 'external') {
            installed = libraryInventory.getInventory().packs.some((pack) => pack.id === row.packId)
              ? await missionInstaller().inspectExternal(row, { signal })
              : await missionInstaller().installExternal(row, { signal });
          } else if (['bundled', 'archived'].includes(row.source))
            installed = await missionInstaller().installIndexed(row, {
              signal,
            });
          else {
            if (row.source !== 'optional')
              throw new Error(t('interface:thisChapterHasNoTrustedDownload'));
            const catalog = await loadOptionalCatalog({
              signal,
              baseURL: new URL('../../', location.href),
            });
            const summary = catalog.packs.find((item) => item.id === row.packId);
            if (!summary)
              throw new Error(t('interface:thisExactChapterIsUnavailableInThePublishedCatalogue'));
            installed = await missionInstaller().install(summary, { signal });
          }
          // A durable commit remains real after cancellation. Read-only refresh
          // never adopts a match; it prevents stale download/ownership claims.
          await refreshLibraryInventory({
            signal: installed.committed ? artworkLifetime.signal : signal,
          });
          if (row.source === 'external') {
            if (!installed.ready) {
              libraryInventoryNotice = installed.reason;
              refreshLibraryWarning();
              throw new Error(installed.reason);
            }
            if (!signal.aborted && epoch === libraryOpenEpoch && libraryInventory.state().ready)
              libraryExternalProofs.set(row.packId, {
                inventory: libraryInventory.getInventory(),
                epoch,
              });
            libraryInventoryNotice = '';
            refreshLibraryWarning();
          }
        },
        launchClassic: (row, context) =>
          launchPreparedLibrarySelection(
            context.metadataPack,
            context.selection,
            context,
            row.source === 'external' ? row : null,
          ),
        launchCustom: (binding, context) =>
          launchPreparedLibrarySelection(binding.pack, binding.selection, context),
      });
      try {
        creatorStore ??= createCreatorStore();
        const sources = await installedCreatorLibrarySources({
          store: creatorStore,
          profileForEdition: creatorProfile,
          launchVersus: launchInstalledCreatorVersus,
        });
        for (const source of sources) result.library.register(source);
      } catch (error) {
        libraryInventoryNotice = [
          libraryInventoryNotice,
          `Creator campaigns could not be read: ${error.message}`,
        ]
          .filter(Boolean)
          .join(' ');
      }
      if (disposed || artworkLifetime.signal.aborted) {
        result.library.dispose();
        spatialEditionOwner.dispose();
        throw new DOMException(t('interface:missionLibraryClosed'), 'AbortError');
      }
      const state = createMissionLibrarySessionState({ mode: 'versus' });
      journeyChooser = attachJourneyChooser({
        library: result.library,
        profile,
        mode: 'versus',
        getCurrentId: () => {
          if (currentLibrarySelection?.match === match) return currentLibrarySelection.id;
          const entry = roundRecipe.entry;
          const rulesEdition = roundRecipe.rulesEdition ?? CLASSIC_RULES_ORIGINAL;
          if (candidateJourney?.owns(entry))
            return result.library.missions.find(
              (item) =>
                item.ownerId === `journey:${authoredRoute.id}` &&
                item.editionId === authoredRoute.id &&
                item.runtimeId === entry.mission.id &&
                item.modes.includes('versus'),
            )?.id;
          try {
            return retainedLibraryMission(result.library, {
              mode: 'versus',
              levelId: entry.level.id,
              campaignKey: classicRulesCampaignIdentity({
                campaignKey: entry.musicCampaignKey,
                rulesEdition,
              }),
              sourcePackId: entry.sourcePackId ?? entry.pictureEntry?.sourcePackId ?? null,
              rulesEdition,
            })?.id;
          } catch {
            // An unavailable retained edition cannot block browsing other missions.
            return null;
          }
        },
        readState: state.read,
        writeState: state.write,
        launchContext: libraryContext,
        onPause: () => {
          journeySkipArmed = null;
          pause();
        },
        onReturn: (opener) => {
          clear();
          if (!document.hidden && document.hasFocus() && opener?.isConnected)
            opener.focus({ preventScroll: true });
        },
      });
      for (const row of index.missions.filter((item) => item.source === 'external')) {
        const id = libraryMissionId({
          owner: JSON.stringify(['classic', 'external', row.packId]),
          edition: row.sourceFile.sha256,
          campaign: row.campaignKey,
          mission: row.levelId,
          revision: row.levelRevision,
        });
        if (result.library.find(id)) libraryExternalSelections.set(id, row);
      }
      const inventoryNotice = document.createElement('p');
      inventoryNotice.id = 'race-library-inventory-status';
      inventoryNotice.setAttribute('role', 'status');
      const statusRow = document.createElement('div'),
        status = $('journey-chooser-status');
      statusRow.id = 'race-library-status';
      status.after(statusRow);
      statusRow.append(status, inventoryNotice);
      refreshLibraryWarning();
      if (!journeyPreferences)
        browsingJourneyPreferences.subscribe(() => journeyChooser?.refresh());
      missionLibrary = result;
      return result;
    })();
    try {
      return await missionLibraryLoading;
    } finally {
      missionLibraryLoading = null;
    }
  }
  async function openMissionLibrary(opener) {
    if (disposed || contentBusy || document.hidden || !document.hasFocus()) return;
    const visit = ++libraryOpenEpoch;
    pause();
    const context = libraryContext();
    const previousMessage = $('race-message').textContent;
    const preparingMessage = t('interface:preparingMissionsYourCurrentRaceIsKept');
    localizedText($('race-message'), () => preparingMessage);
    const opening = trackMissionLibraryOpening({
      onRetire: () => {
        if (visit === libraryOpenEpoch) ++libraryOpenEpoch;
        if ($('race-message').textContent === preparingMessage)
          localizedText($('race-message'), () => previousMessage);
      },
    });
    try {
      const owner = await getMissionLibrary();
      if (visit !== libraryOpenEpoch || !opening.current() || !context.isCurrent()) return;
      await refreshLibraryInventory();
      if (visit !== libraryOpenEpoch || !opening.current() || !context.isCurrent()) return;
      // Installed-card reconciliation may move focus as part of this owned
      // request. Claim the opener before that internal refresh; newer input
      // still retires the claim while visit/context checks reject replaced state.
      if (!opening.claim()) return;
      if (libraryInventory.state().ready) await owner.refreshInstalled();
      const openingCurrent = opening.current();
      opening.dispose();
      if (visit !== libraryOpenEpoch || !openingCurrent || !context.isCurrent()) return;
      journeyChooser.open(opener, { returnLabel: 'Back to race' });
    } catch (error) {
      if (visit === libraryOpenEpoch && context.isCurrent())
        localizedText($('race-message'), () =>
          t('interface:couch.libraryError', { error: error.message }),
        );
    } finally {
      opening.dispose();
      if ($('race-message').textContent === preparingMessage)
        localizedText($('race-message'), () => previousMessage);
    }
  }
  async function refreshLibraryInventory({ signal = artworkLifetime.signal } = {}) {
    libraryExternalProofs.clear();
    try {
      await libraryInventory.refresh({ signal });
    } catch (error) {
      if (disposed || artworkLifetime.signal.aborted || error.name === 'AbortError') throw error;
      // Controller retires current authority without deleting stored bytes or
      // existing Custom cards. Only a checked refresh may reconcile the rows.
    } finally {
      refreshLibraryWarning();
    }
  }
  async function stageCataloguePack(
    pack,
    { signal, onStatus, attempt, isCurrent, selection = null },
  ) {
    const tuning = gameplayTuning.snapshot(browsingJourneyPreferences.snapshot().difficulty);
    const actorPreference = actorPreferences.snapshot();
    const candidateReader = createCouchInstalledChapters({
      channel: contentChannel,
      registeredEntries: [baseEntry],
      presentationPage,
    });
    let lease = null,
      nextActors = null,
      nextStatic = null,
      adopted = false;
    const check = () => {
      if (
        !isCurrent() ||
        signal.aborted ||
        actorPreferences.snapshot().revision !== actorPreference.revision
      )
        throw new DOMException(
          t('interface:chapterPreparationCancelledTheCurrentRaceIsKept'),
          'AbortError',
        );
    };
    const cleanup = () => {
      if (adopted) return;
      lease?.cancel();
      nextActors?.release();
      candidateReader.dispose();
      nextStatic?.dispose();
    };
    try {
      check();
      const rows = await candidateReader.refresh({
        signal,
        onStatus,
        expectedPack: pack,
      });
      check();
      const entry = rows.find(
        (row) =>
          row.sourcePackId === pack.id &&
          (!selection ||
            (row.musicCampaignKey === selection.campaignKey &&
              row.level.id === selection.levelId &&
              String(row.level.revision) === String(selection.levelRevision))),
      );
      if (!entry) throw new Error(t('interface:thisChapterHasNoCompatibleVersusMissions'));
      const classId = entry.classes.some((item) => item.id === attempt.recipe.classId)
        ? attempt.recipe.classId
        : entry.classes[0].id;
      const nextTheme =
        entry.themes.find((item) => item.id === entry.defaultThemeId) || entry.themes[0];
      const recipe = {
        entry,
        theme: nextTheme,
        classId,
        turnPolicy: attempt.recipe.turnPolicy,
        seconds: attempt.recipe.seconds,
        format: attempt.recipe.format,
        seed: attempt.recipe.seed,
        tuning,
        actorStyle: actorPreference.actorStyle,
        actorPreferenceRevision: actorPreference.revision,
        rulesEdition: selection?.rulesEdition,
      };
      const nextMatch = createRound(recipe),
        raceId = ++raceSequence;
      lease = await candidateReader.stage(entry, {
        themeId: nextTheme.id,
        raceId,
        signal,
        onStatus,
      });
      check();
      nextActors = await prepareActors(recipe, { signal, onStatus, reader: candidateReader });
      check();
      nextStatic = createCouchStaticPictures({
        entries: [baseEntry, ...(featured ? [featured.resolved] : [])],
        presentationPage,
      });
      check();
      return {
        async confirm() {
          check();
          await ensureVersusPackage(entry, { signal, retain: true }, candidateReader);
          check();
          await lease.confirm({ onStatus });
          check();
        },
        adopt(ownsActivation) {
          check();
          if (!ownsActivation()) return null;
          const retire = lease.commit();
          check();
          const previousReader = installed,
            previousStatic = staticPictures,
            previousController = contentController;
          const retireActors = publishActors(nextActors);
          // Publish the entire accepted attempt before any DOM or retirement callback.
          installed = candidateReader;
          staticPictures = nextStatic;
          match = nextMatch;
          generation = raceId;
          roundRecipe = recipe;
          selectedMapKey = entry.key;
          theme = nextTheme;
          backdrop = lease.picture;
          won = [0, 0];
          finished = false;
          nextAttempt = null;
          preparedFocusMatch = match;
          contentController = new AbortController();
          contentReady = true;
          contentBusy = false;
          contentError = null;
          contentDownloadRequired = false;
          contentScope = 'main';
          maps.splice(0, maps.length, ...shippedMaps, ...rows);
          adopted = true;
          const acceptedController = contentController;
          const accepted = () =>
            !disposed &&
            !document.hidden &&
            document.hasFocus() &&
            match === nextMatch &&
            generation === raceId &&
            roundRecipe === recipe &&
            backdrop === lease.picture &&
            installed === candidateReader &&
            contentController === acceptedController &&
            !acceptedController.signal.aborted &&
            startIntentEpoch === attempt.startEpoch &&
            match.status === 'ready' &&
            shell.scope() === attempt.scope;
          previousController?.abort();
          retire();
          retireActors();
          previousReader?.dispose();
          previousStatic?.dispose();
          if (accepted()) {
            showMaps();
            $('race-level').value = entry.key;
            $('race-class').replaceChildren(
              ...entry.classes.map((item) =>
                localizedOption(() => contentText(item, 'label'), item.id),
              ),
            );
            $('race-class').value = classId;
            $('race-theme').replaceChildren(
              ...entry.themes.map((item) => localizedOption(() => themeLabel(item), item.id)),
            );
            $('race-theme').value = nextTheme.id;
            paintRound(recipe);
            localizedText($('race-start'), () =>
              recipe.format === 'single' ? t('interface:startRace') : t('interface:startRound'),
            );
            localizedText($('race-message'), () =>
              t('interface:couch.sharedPictureReady', {
                chapter: chapterLabel(entry),
                mission: contentText(entry.level, 'name'),
              }),
            );
            installedStatus = localizedMessage('interface:couch.installedMapCount', {
              count: rows.length,
            });
            updateMenu();
          }
          return {
            current: accepted,
            start() {
              return activateAcceptedMatch({
                owner: nextMatch,
                ownerGeneration: raceId,
                cue: 'mission',
                owns: () => accepted() && !$('journey-chooser')?.open,
              });
            },
          };
        },
        dispose: cleanup,
      };
    } catch (error) {
      cleanup();
      throw error;
    }
  }
  $('race-chapters').onclick = () => {
    if (disposed || contentBusy || match.status === 'running') return;
    return openMissionLibrary($('race-chapters'));
  };

  const installOfflinePanel = $('race-offline')
    ? attachInstallOfflinePanel({
        document,
        window,
        downloadsURL: new URL('../downloads.html', import.meta.url),
        onOpen: () => {
          if (match.status === 'running') pause();
        },
        canActivate: () => match.status === 'ready' && !contentBusy,
        onStatus: (message) => {
          if ($('race-offline-status')) $('race-offline-status').textContent = message;
        },
      })
    : null;
  const gameplayDownloads = createOfflineDownloadAccess({
    requestPackage: (request) => installOfflinePanel.requestPackage(request),
  });
  const detachModeDownloads = attachOfflineModeNavigation({
    document,
    window,
    access: gameplayDownloads,
    onError: (error) => {
      $('race-message').textContent = error.message;
    },
  });
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) detachModeDownloads();
  });
  if ($('race-offline')) $('race-offline').onclick = () => installOfflinePanel.open();

  function couchScope() {
    if (music?.root()) return 'couch-music-library';
    const modal = [...document.querySelectorAll('dialog[open]')].at(-1);
    if (modal) return `couch:${modal.id}`;
    return match?.status === 'running'
      ? 'flight'
      : `couch:${match?.status || 'loading'}:${generation}:${shell?.scope() || 'main'}`;
  }
  function readCachedPads() {
    if (frameReadError) throw frameReadError;
    return framePads;
  }
  function readAssignedMenuPads() {
    // Keep sparse browser positions. The router also receives the physical index.
    if (frameReadError) throw frameReadError;
    return controllerSession.frame().menuPads;
  }
  function capturePads() {
    framePads = [];
    frameReadError = null;
    try {
      if (typeof navigator.getGamepads !== 'function')
        throw new Error(t('interface:gamepadApiUnavailable'));
      const pads = navigator.getGamepads();
      const count = Number.isInteger(pads?.length) ? Math.max(0, Math.min(32, pads.length)) : 0;
      framePads = Array.from({ length: count }, (_, i) => pads[i] || null);
    } catch (error) {
      frameReadError = error || new Error(t('interface:controllerReadFailed'));
    }
    const sample = controllerSession.sample(framePads, {
      active: match?.status === 'running',
      error: frameReadError,
    });
    framePads = sample.pads;
    controllerSetup.refresh();
  }

  function focusPrimaryAction() {
    if (!match || match.status === 'running' || disposed) return;
    shell.focus();
    navigation.engage();
    menuHint = t('interface:chooseThePrimaryActionWithSouthWhenEveryoneIsReady');
    updateMenu();
  }
  function refreshBoardLayout() {
    // Observer-capable hosts receive the actual arena content box. The fallback
    // must notice every changing HUD label that can consume the arena's space.
    const layoutKey = JSON.stringify([
      $('race-boards').hidden,
      ...touchPads.map((pad) => pad.hidden),
      document.body.dataset.textSize,
      document.body.dataset.textFace,
      ...(boardFootprints.observesResize
        ? []
        : [0, 1].flatMap((i) => [
            $(`racer-stats-${i}`).textContent,
            $(`racer-state-${i}`).textContent,
            $(`racer-input-${i}`).textContent,
            $(`racer-capture-${i}`).hidden,
            $(`racer-capture-${i}`).textContent,
            $(`racer-encounter-${i}`).hidden,
            $(`racer-encounter-title-${i}`).textContent,
            $(`racer-encounter-instruction-${i}`).textContent,
            ...(touchPads[i].hidden
              ? []
              : touchActions[i].flatMap((button) => [
                  button.hidden,
                  button.hidden ? '' : button.textContent,
                ])),
          ])),
    ]);
    if (layoutKey !== boardLayoutKey) {
      boardLayoutKey = layoutKey;
      boardFootprints.refresh();
    }
  }
  function updateMenu() {
    if (!match || disposed) return;
    const completedBoards = match.runs.filter((run) => run.status === 'won').length;
    journeyReactions.present({
      owned: !!candidateJourney?.owns(roundRecipe?.entry),
      mode: 'versus',
      outcome:
        match.status === 'finished' && completedBoards
          ? completedBoards === 2
            ? 'draw'
            : 'won'
          : null,
      missionId: roundRecipe?.entry?.mission?.id,
      feedback: candidateJourney?.owns(roundRecipe?.entry)
        ? roundRecipe.entry.campaignFeedback
        : null,
    });
    const running = match.status === 'running';
    $('race-journey-controls').hidden = !!shell && shell.scope() !== 'main' && !running;
    $('race-journey-next').hidden = match.status !== 'finished' || libraryCompleteMatch === match;
    $('race-journey-next').disabled = contentBusy || !!libraryContinuation;
    localizedText($('race-journey-next'), () => {
      if (!candidateJourney?.owns(roundRecipe.entry)) return t('interface:nextMission2');
      const current = roundRecipe.entry.mission,
        next = candidateJourney.next(current.id);
      return resultContinuationLabel(t, {
        browse: !next,
        mission: next ? contentText(next, 'name') : '',
        campaign: next ? contentText(next, 'campaignTitle') : '',
        crossesCampaign:
          !!next && (next.packId !== current.packId || next.campaignId !== current.campaignId),
      });
    });
    $('race-journey-skip').hidden = !candidateJourney || match.status === 'finished';
    $('race-journey-find').disabled = contentBusy || !!libraryContinuation;
    if (candidateJourney) {
      $('race-journey-skip').hidden = match.status === 'finished';
      $('race-journey-skip').disabled = contentBusy;
      localizedText($('race-journey-skip'), () =>
        journeySkipArmed === match ? t('interface:confirmSkip') : t('interface:skipMission'),
      );
      $('race-journey-find').disabled = contentBusy;
    }
    $('race-message').hidden = contentBusy;
    $('race-installed-status').hidden = contentBusy;
    $('race-start').disabled = running || contentBusy || !contentReady;
    $('race-journey-difficulty').disabled =
      contentBusy || Boolean(creatorVersusOwners.has(roundRecipe.entry));
    $('race-chapters').disabled = running || contentBusy;
    $('race-chapter-retry').hidden = !contentError || match.status !== 'ready';
    $('race-chapter-retry').disabled = contentBusy;
    localizedText($('race-chapter-retry'), () =>
      contentDownloadRequired ? t('interface:downloadPlay') : t('interface:retryPicture2'),
    );
    $('race-picture-cancel').hidden = !contentBusy && !libraryContinuation;
    $('race-installed-refresh').disabled = match.status !== 'ready' || contentBusy || !installed;
    localizedText($('race-installed-status'), () =>
      [featuredStatus, installedStatus].filter(Boolean).map(render).join(' '),
    );
    $('race-pause').disabled = !running;
    $('race-menu-release').hidden = running || !menuOwner;
    $('race-menu-release').disabled = running || !menuOwner;
    const entry = maps.find((m) => m.key === selectedMapKey);
    // The transaction's first Ready update belongs to its retained action
    // lease, including an update reentered from prior-image cleanup.
    const focusTransition = match !== preparedFocusMatch;
    preparedFocusMatch = null;
    shell?.update({
      match,
      won,
      format: roundRecipe.format,
      contentBusy,
      focusTransition,
      summary: () =>
        `${roundRecipe.tuning.adminOverride ? t('interface:adminPlaytest') + ' ' : ''}${roundRecipe.format === 'first-to-two' ? t('interface:firstToTwo') : t('interface:oneRace')} · ${contentText(entry.level, 'name')}`,
    });
    $('race-time-field').hidden = qualifiedVersusEntry(roundRecipe.entry);
    // Reconcile deliberate layout transitions immediately, including browsers
    // without ResizeObserver. Ordinary frames only compare cheap state values.
    refreshBoardLayout();
    const owner = menuOwner ? slots.indexOf(menuOwner.index) : -1;
    const text = running
      ? shell.controllerHint()
      : t('gameplay:keyboardAndTouchRemainAvailable', {
          value1:
            owner >= 0
              ? t('gameplay:playerControllerHasTheMenuSouthSelectsEastCancelsMenu', {
                  value1: owner + 1,
                })
              : menuStatus,
          value2: menuGate ? ` ${menuGate}` : '',
          value3: menuHint ? ` ${menuHint}` : '',
        });
    if ($('race-menu-status').textContent !== text)
      localizedText($('race-menu-status'), () => text);
  }
  menuRouter = createControllerRouter({
    readPads: readAssignedMenuPads,
    autoJoin: true,
    eventTarget: null,
  });
  const controllerConfirmGuard = attachControllerConfirmGuard({
    confirmPressed: () => menuRouter.menuConfirmPressed() || controllerSession.frame().confirmHeld,
  });
  const menuIds = new Set([
    'race-offline',
    'install-offline-close',
    'install-offline-install',
    'install-offline-downloads',
    'race-coop',
    'race-start',
    'race-retry',
    'race-optional-setup-toggle',
    'race-chapters',
    'race-journey-next',
    'race-journey-skip',
    'race-journey-find',
    'race-journey-pictures',
    'race-journey-difficulty',
    'race-journey-preferences-retry',
    'race-journey-preferences-export',
    'race-journey-save-retry',
    'race-journey-save-options',
    'race-journey-save-export',
    'race-chapter-retry',
    'race-picture-cancel',
    'race-installed-refresh',
    'race-focus',
    'race-options',
    'race-quick-sound',
    'race-settings-tab-controls',
    'race-settings-tab-audio',
    'race-settings-tab-display',
    'race-settings-tab-data',
    'race-data-read',
    'race-data-reading-done',
    'race-data-reading',
    'race-help',
    'race-home',
    'race-more-toggle',
    'race-optional-setup-toggle',
    'race-more-home',
    'race-more-about',
    'race-release-explorer',
    'race-solo-return',
    'race-library-switch',
    'race-level',
    'race-actor-style',
    'race-theme',
    'race-class',
    'race-turn',
    'race-time',
    'race-format',
    'race-setup-back',
    'race-touch-0',
    'race-touch-1',
    'race-tap',
    'race-reduced',
    'race-enemy-remains',
    'race-enemy-remains-retry',
    'race-journey-reactions-enabled',
    'race-journey-reactions-retry',
    'race-text-face',
    'race-text-size',
    'race-menu-palette',
    'race-menu-ornaments',
    'race-audio',
    'race-master-volume',
    'race-menu-release',
    'race-options-back',
    'race-help-back',
    'race-help-read',
    'race-help-reading-done',
    'race-help-reading',
    'race-review',
    'race-pause',
    'race-confirm-back',
    'race-confirm-reset',
    'race-leave-back',
    'race-leave',
    'race-library-stay',
    'race-library-play',
  ]);
  navigation = attachControllerNavigation({
    onTabBoundary: () => playgroundTabBoundary({ window, suspend }),
    getScope: couchScope,
    getRoot: () =>
      installOfflinePanel?.frameFocused()
        ? null
        : music?.root() ||
          [...document.querySelectorAll('dialog[open]')].at(-1) ||
          // Find/Next sit beside the main panel for Legacy and installed missions
          // too. The existing allowlist excludes all live-board controls.
          (shell.scope() === 'main' ? $('couch-app') : shell.root()),
    getDefaultFocus: () =>
      installOfflinePanel?.isOpen()
        ? $('install-offline-downloads')
        : libraryDecision
          ? $('race-library-stay')
          : music?.root()
            ? music.primary()
            : journeyPictures?.root()
              ? journeyPictures.primary()
              : $('journey-backup')?.open
                ? $('journey-backup-export')
                : $('journey-chooser')?.open
                  ? journeyChooser?.primary() || $('journey-search')
                  : shell.primary(),
    keyboard: true,
    nativeReadingScroll: true,
    ownsKeyboardEvent: (event) =>
      !music?.root() && settingsTabOwnsKey(event, $('race-options-panel')),
    accept: (element) =>
      !!element.closest('[data-menu-scope]') ||
      music?.contains(element) ||
      (element.tagName === 'A' &&
        !!element.closest('#race-music-now-playing, #race-music-menu-now-playing')) ||
      element.hasAttribute('data-language-select') ||
      menuIds.has(element.id) ||
      !!element.closest(
        '#journey-chooser, #journey-backup, #race-gameplay-tuning, [data-journey-mode-pictures], .multiplayer-controllers',
      ),
    getControlLabels: () => ({
      directions: t('interface:dPadLeftStick'),
      confirm: t('common:controls.south'),
      back: t('common:controls.east'),
    }),
    getReadingPrompt: readingPrompt,
    onNativeInput: (event) => setReadingModality(nextInputModality(readingModality, event)),
    activateControl: (element) => controllerConfirmGuard.activate(element),
    onBack: () =>
      installOfflinePanel?.isOpen()
        ? installOfflinePanel.close()
        : libraryDecision
          ? libraryDecision.finish(false)
          : music?.root()
            ? music.back()
            : journeyPictures?.root()
              ? journeyPictures.close()
              : $('journey-backup')?.open
                ? $('journey-backup-back').click()
                : $('journey-chooser')?.open
                  ? journeyChooser.close()
                  : shell.back(),
    onMenu: () =>
      installOfflinePanel?.isOpen()
        ? installOfflinePanel.close()
        : libraryDecision
          ? libraryDecision.finish(false)
          : music?.root()
            ? music.back()
            : journeyPictures?.root()
              ? journeyPictures.close()
              : $('journey-backup')?.open
                ? $('journey-backup-back').click()
                : $('journey-chooser')?.open
                  ? journeyChooser.close()
                  : shell.back(),
    onHint: (message, context) => {
      if (
        context?.kind === 'reading' &&
        ['race-help-reading', 'race-data-reading'].includes(context.regionId)
      ) {
        menuHint = '';
        const hint = $(`${context.regionId}-hint`);
        if (hint.textContent !== message) localizedText(hint, () => message);
      } else menuHint = message;
      updateMenu();
    },
    onReadingChange: (state) => reading?.changed(state),
  });
  reading = attachControllerReading({
    getNavigation: () => navigation,
    getScope: couchScope,
    getReadingPrompt: readingPrompt,
    revealOnResize: true,
    surfaceDefinitions: [
      [
        'race-help-reading',
        'race-help-read',
        localizedMessage('interface:couchControls'),
        'race-help-unit',
      ],
      [
        'race-data-reading',
        'race-data-read',
        localizedMessage('interface:versusGameData'),
        'race-data-unit',
      ],
    ],
  });
  $('race-menu-release').onclick = () => {
    if (match.status === 'running' || !menuOwner) return;
    controllerSession.menu(null);
    menuRouter.invalidate();
    menuOwner = null;
    clear();
    menuStatus = t('interface:menuControllerReleasedReleaseControlsThenPressAFaceButton');
    updateMenu();
    shell.focus();
  };
  function sampleMenu(now) {
    const scope = couchScope();
    // Even Ready can lose or reassign a pad without changing the duel status.
    // Clear before sampling so that this frame cannot claim a new menu owner.
    if (assignmentsChanged || pendingPadLoss) menuRouter.clear();
    const result = menuRouter.sample({ scope, timeMs: now });
    // Joining consumes the controller edge as assignment, but Steam may still
    // mirror that same physical press as a delayed native Enter/click.
    controllerConfirmGuard.observe(result.confirmHeld || controllerSession.frame().confirmHeld);
    if (result.status.code === 'joined' || Object.values(result.ui).some(Boolean))
      setReadingModality('controller');
    const released = !menuOwner && result.disconnected;
    menuOwner = result.assigned;
    menuGate =
      menuOwner && ['joined', 'waiting-neutral'].includes(result.status.code)
        ? t('interface:releaseControllerButtonsAndTheMovementStickToContinue')
        : '';
    if (result.disconnected) {
      shell.cancelDeparture();
      clear();
      if (!released) menuStatus = result.status.message;
      updateMenu();
      return;
    }
    menuStatus = frameReadError
      ? t('interface:controllerAccessIsUnavailable')
      : controllerSession.state().devices.some((device) => !device.profile)
        ? t('interface:multiplayerControllers.needsSetup')
        : result.status.message;
    if (assignmentsChanged || pendingPadLoss) {
      shell.cancelDeparture();
      clear();
      updateMenu();
      return;
    }
    if (menuOwner && result.status.code === 'joined') {
      menuScope = scope;
      focusPrimaryAction();
    } else if (scope !== menuScope) {
      menuScope = scope;
      // Native input can already own a reader in this screen before the next
      // controller poll. Sync retires stale scopes without clearing that newer owner.
      navigation.sync();
    } else {
      navigation.handle(result.ui);
    }
    updateMenu();
  }
  function suspend() {
    if (libraryContinuation) cancelContent();
    ++libraryOpenEpoch;
    libraryIncomingController?.abort();
    cancelLibraryDecision();
    if (disposed) return;
    shell?.cancelDeparture();
    pause();
    if (music) music.suspend();
    else sound.suspend();
    clear();
    framePads = [];
    frameReadError = null;
    last = 0;
    inactive = true;
  }
  const hidden = () => {
    if (document.hidden) suspend();
  };
  const nativeMenuInput = () => {
    if (!disposed && match?.status !== 'running') {
      // Relinquishing DOM focus alone does not stop the router's held repeats.
      // Preserve native focus until a fresh neutral-and-press controller gesture.
      menuRouter.clear();
      menuHint = '';
    }
  };
  const disconnected = (event) => {
    if (slots.includes(event.gamepad?.index)) {
      menuRouter.disconnect(event.gamepad.index);
      pendingPadLoss = true;
      suspend();
    }
  };
  const pagehide = (event) => {
    suspend();
    if (event.persisted) return;
    installOfflinePanel?.dispose();
    contentController?.abort();
    disposed = true;
    actorLease?.release();
    actorLease = null;
    actorAppearance = null;
    journeyChooser?.destroy();
    journeyPictures?.dispose();
    missionLibrary?.library.dispose();
    spatialEditionOwner?.dispose();
    libraryInstaller?.dispose();
    libraryInventory?.close();
    librarySoloPreview?.preparer.dispose();
    preparationStatus.dispose();
    couchTouch.destroy();
    journeyReactions.dispose();
    controllerSetup.dispose();
    controllerSession.dispose();
    input.destroy();
    controllerConfirmGuard.destroy();
    menuRouter.destroy();
    reading.destroy();
    encounterHelp.dispose();
    navigation.destroy();
    shell.destroy();
    stopNative();
    cancelAnimationFrame(frameId);
    window.removeEventListener('blur', windowBlur);
    window.removeEventListener('gamepaddisconnected', disconnected);
    window.removeEventListener('pagehide', pagehide);
    document.removeEventListener('visibilitychange', hidden);
    document.removeEventListener('pointerdown', nativeMenuInput, true);
    document.removeEventListener('keydown', nativeMenuInput, true);
  };
  const windowBlur = guardInstallOfflineBlur(suspend);
  window.addEventListener('blur', windowBlur);
  window.addEventListener('gamepaddisconnected', disconnected);
  window.addEventListener('pagehide', pagehide);
  document.addEventListener('visibilitychange', hidden);
  document.addEventListener('pointerdown', nativeMenuInput, true);
  document.addEventListener('keydown', nativeMenuInput, true);
  function frame(now) {
    if (disposed) return;
    const available = !document.hidden && document.hasFocus();
    if (!available && !inactive) suspend();
    if (available && inactive) {
      inactive = false;
      last = 0;
      if (music) void music.resume();
    }
    const cueState = advanceStartCue(now);
    const dt = cueState.released ? 0 : last ? Math.max(0, (now - last) / 1000) : 0;
    last = now;
    const wasRunning = match.status === 'running';
    if (available) {
      assignmentsChanged = false;
      capturePads();
      input.poll();
      if (!wasRunning) sampleMenu(now);
      if (wasRunning || match.status === 'running')
        controllerConfirmGuard.observe(
          menuRouter.menuConfirmPressed(controllerSession.frame().menuPads) ||
            controllerSession.frame().confirmHeld,
        );
      pendingPadLoss = false;
    }
    if (available && wasRunning && match.status === 'running' && !cueState.blocksPlay) {
      if (dt > 0.25) pause();
      else {
        accumulator += dt;
        while (accumulator + 1e-9 >= FIXED_DT && match.status === 'running') {
          const before = match.runs.map((r) => r.tick);
          const beforeStatus = match.runs.map((r) => r.status);
          const commands = input.consume().map((command, i) =>
            beforeStatus[i] === 'respawning'
              ? {
                  direction: null,
                  boost: false,
                  action: false,
                  pickup: false,
                }
              : neutralResumeTick
                ? { ...command, boost: false, action: false, pickup: false }
                : command,
          );
          stepDuel(match, commands);
          match.runs.forEach((run, i) =>
            sound.feedback(true, theme, run, {
              board: i,
              mode: 'versus',
              command: commands[i],
              actorStyle: actorAppearance?.style,
              placement: boardPlacement(contexts[i].canvas),
            }),
          );
          neutralResumeTick = false;
          for (let i = 0; i < 2; i++)
            if (
              beforeStatus[i] === 'respawning' ||
              match.runs[i].status === 'respawning' ||
              match.runs[i].events.some((event) => event.type === 'capture.stopped')
            )
              input.clearPlayer(i);
          accumulator -= FIXED_DT;
          for (let i = 0; i < 2; i++)
            if (match.runs[i].tick !== before[i]) {
              painters[i].effectsFor(match.runs[i].events, match.runs[i]);
              sound.events(match.runs[i].events, match.runs[i], theme, {
                board: i,
                mode: 'versus',
                actorStyle: actorAppearance?.style,
                placement: boardPlacement(contexts[i].canvas),
              });
              const run = match.runs[i],
                caption = foundationReturnCaption(run);
              if (caption)
                foundationCaptions.set(
                  run,
                  localizedMessage(
                    'interface:foundationReachedCloseFutureCutsHerePermanentReclaimedGroundAdds',
                  ),
                );
              else if (run.player.speed > 0 || run.status !== 'running')
                foundationCaptions.delete(run);
            }
        }
      }
    }
    if (match.status === 'finished' && !finished) {
      sound.events(
        [
          {
            type: 'run.completed',
            tick: Math.max(...match.runs.map((run) => run.tick)),
            status: 'won',
          },
        ],
        match,
        theme,
        {
          board: 'duel-result',
          resultContext: candidateJourney?.owns(roundRecipe?.entry)
            ? {
                owned: true,
                mode: 'versus',
                outcome: match.runs.filter((r) => r.status === 'won').length === 2 ? 'draw' : 'won',
                missionId: roundRecipe.entry.mission.id,
                feedback: roundRecipe.entry.campaignFeedback,
              }
            : null,
        },
      );
      finished = true;
      clear();
      if (match.winner !== null) won[match.winner]++;
      let journeyRewardFailure = null;
      if (
        candidateJourney &&
        !roundRecipe.tuning.adminOverride &&
        match.runs.some((run) => run.status === 'won')
      ) {
        const runId = `${journeySessionId}:${generation}`,
          gameplayId = dataIdentity({
            ruleset: match.ruleset,
            level: roundRecipe.runtimeLevel,
            classes: roundRecipe.entry.classes,
          }),
          acceptedPicture =
            backdrop && isCandidatePictureFor(roundRecipe.entry.asset, backdrop) ? backdrop : null,
          completion = {
            type: 'complete',
            mode: 'versus',
            missionId: roundRecipe.entry.mission.id,
            runId,
            difficulty: roundRecipe.entry.difficulty,
            gameplayId,
            ...(acceptedPicture
              ? {
                  picture: {
                    mode: 'versus',
                    editionId: authoredRoute.id,
                    missionId: roundRecipe.entry.mission.id,
                    campaignKey: roundRecipe.entry.musicCampaignKey,
                    levelId: roundRecipe.entry.level.id,
                    levelRevision: String(roundRecipe.entry.level.revision),
                    runId,
                    gameplayId,
                    difficulty: roundRecipe.entry.difficulty,
                    name: roundRecipe.entry.mission.name,
                    campaignTitle: roundRecipe.entry.mission.campaignTitle,
                    themeId: roundRecipe.theme.id,
                    asset: acceptedPicture.assetRevision,
                  },
                }
              : {}),
          };
        try {
          journeyProfile.record(completion);
        } catch (error) {
          const { picture: _picture, ...receipt } = completion;
          try {
            journeyProfile.record(receipt);
          } catch {
            /* Existing stored progress stays intact. */
          }
          journeyRewardFailure = localizedMessage('interface:journeyPictures.versusRetainFailed', {
            error: error.message,
          });
        }
      }
      const creatorOwner = creatorVersusOwners.get(roundRecipe.entry);
      if (
        creatorOwner &&
        !roundRecipe.tuning.adminOverride &&
        match.runs.some((run) => run.status === 'won')
      ) {
        const profile = creatorProfiles.get(creatorOwner.prepared.editionId),
          manifest = creatorOwner.host.manifest(
            roundRecipe.entry.mission,
            roundRecipe.entry.difficulty,
          ),
          runId = crypto.randomUUID(),
          gameplayId = `${creatorOwner.prepared.editionId}:${manifest.simulationIdentity}`,
          acceptedPicture = isCandidatePictureFor(roundRecipe.entry.asset, backdrop)
            ? backdrop
            : null,
          missionId = roundRecipe.entry.mission.levelId,
          completion = {
            type: 'complete',
            mode: 'versus',
            missionId,
            runId,
            difficulty: roundRecipe.entry.difficulty,
            gameplayId,
            ...(acceptedPicture
              ? {
                  picture: {
                    mode: 'versus',
                    editionId: creatorOwner.prepared.editionId,
                    missionId,
                    campaignKey: roundRecipe.entry.musicCampaignKey,
                    levelId: roundRecipe.entry.level.id,
                    levelRevision: String(roundRecipe.entry.level.revision),
                    runId,
                    gameplayId,
                    difficulty: roundRecipe.entry.difficulty,
                    name: roundRecipe.entry.mission.name,
                    campaignTitle: roundRecipe.entry.mission.campaignTitle,
                    themeId: roundRecipe.theme.id,
                    asset: acceptedPicture.assetRevision,
                  },
                }
              : {}),
          };
        const settlement = profile.recordWithReceiptFallback(completion);
        journeyChooser?.refresh();
        void settlement
          .then((result) => {
            journeyChooser?.refresh();
            if (result.durable && !result.fallback) return;
            if (activeProgressProfile() !== profile) return;
            const warning = localizedMessage('interface:journeyPictures.versusRetainFailed', {
              error: result.error || t('errors:journey.saveFailed'),
            });
            journeyRewardFailure = warning;
            if (!$('race-message').textContent.includes(warning))
              localizedText($('race-message'), `${$('race-message').textContent} ${warning}`);
          })
          .catch((error) => {
            if (activeProgressProfile() !== profile) return;
            const warning = localizedMessage('interface:journeyPictures.versusRetainFailed', {
              error: error.message,
            });
            journeyRewardFailure = warning;
            if (!$('race-message').textContent.includes(warning))
              localizedText($('race-message'), `${$('race-message').textContent} ${warning}`);
          });
      }
      const name = () =>
        match.winner === 0
          ? t('interface:sunflower2')
          : match.winner === 1
            ? t('interface:skyline2')
            : t('interface:bothPlayers');
      const series = roundRecipe.format === 'first-to-two';
      const reason = () =>
        ({
          'First clear': t('interface:couch.firstClearReason'),
          'Time — coverage, then lives, then score': t('interface:couch.timeReason'),
          'Both flights ended': t('interface:couch.bothEndedReason'),
        })[match.reason] || match.reason;
      localizedText($('race-message'), () => {
        const winner =
          match.winner === null
            ? t('interface:draw')
            : series
              ? t('interface:couch.roundWinner', { name: name() })
              : t('interface:couch.raceWinner', { name: name() });
        const matchResult =
          series && won.some((n) => n >= 2)
            ? ` ${t('interface:couch.matchWinner', { name: name() })}`
            : '';
        const next =
          candidateJourney?.owns(roundRecipe.entry) &&
          !candidateJourney.next(roundRecipe.entry.mission.id)
            ? series && !won.some((n) => n >= 2)
              ? t('interface:continueWithNextRoundOrBrowseMissions')
              : candidateJourney.isCore(roundRecipe.entry.mission.id)
                ? t('interface:couch.mainJourneyEnd')
                : t('interface:couch.optionalJourneyEnd')
            : t('interface:chooseNextMissionToContinueOrKeepPlayingThisMission');
        return `${winner}. ${reason()}.${matchResult} ${next}${journeyRewardFailure ? ` ${journeyRewardFailure}` : ''}`;
      });
      localizedText($('race-start'), () => {
        const creatorNext = creatorVersusContinuation(roundRecipe.entry);
        return `${continuationAction()}: ${contentText(
          creatorNext?.mission ?? roundRecipe.entry.level,
          'name',
        )}`;
      });
      painters.forEach((p, i) => {
        if (match.runs[i].status === 'won')
          p.startCelebration?.({
            levelId: match.runs[i].levelId,
            seed: roundRecipe.seed,
            reduced: displayPreferences.snapshot().effectiveReducedEffects,
          });
      });
    }
    localizedText($('series-score'), () => `${won[0]} : ${won[1]}`);
    const left =
      match.limitTicks === null
        ? null
        : Math.max(0, Math.ceil((match.limitTicks - match.tick) / 120));
    localizedText($('race-clock'), () =>
      left === null
        ? t('interface:noCountdown')
        : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`,
    );
    $('race-clock').dataset.compact = left === null ? '∞' : $('race-clock').textContent;
    for (let i = 0; i < 2; i++) {
      const run = match.runs[i];
      const returnCaption = foundationCaptions.get(run) || '',
        returnRegion = $(`racer-capture-${i}`);
      localizedText(returnRegion, returnCaption);
      returnRegion.hidden = !returnCaption || match.status === 'finished';
      localizedText($(`racer-stats-${i}`), () => gameplayStatsLabel(run));
      localizedText($(`racer-state-${i}`), () =>
        gameplayStatusLabel(match.status === 'running' ? run.status : match.status),
      );
      const cue = encounterView(run),
        group = $(`racer-encounter-${i}`),
        title = $(`racer-encounter-title-${i}`),
        instruction = $(`racer-encounter-instruction-${i}`);
      group.hidden = !cue;
      if (cue) {
        localizedText(title, () => {
          const title = encounterView(run)?.title || '';
          return match.status === 'paused'
            ? `${t('interface:paused2')} ${title}`
            : match.status === 'ready'
              ? `${t('interface:ready')} ${title}`
              : match.status === 'finished'
                ? roundRecipe.format === 'single'
                  ? t('interface:couch.raceEndedCue', { title })
                  : t('interface:couch.roundEndedCue', { title })
                : title;
        });
        localizedText(instruction, () =>
          match.status === 'finished' && !['won', 'lost'].includes(run.status)
            ? roundRecipe.format === 'single'
              ? t('interface:couch.frozenRaceCut', { cells: cue.cutCells, minimum: cue.min })
              : t('interface:couch.frozenRoundCut', { cells: cue.cutCells, minimum: cue.min })
            : encounterView(run)?.instruction || '',
        );
        group.dataset.phase = cue.phase;
      } else {
        localizedText(title, () => '');
        localizedText(instruction, () => '');
        delete group.dataset.phase;
      }
    }
    // Both HUDs, including shell-owned input/equipment labels, settle before
    // one signature-gated fallback measurement and either board draw.
    updateMenu();
    for (let i = 0; i < 2; i++) {
      const run = match.runs[i];
      painters[i].draw(contexts[i], run, Math.min(dt, 0.1), {
        displayCSSWidth: boardFootprints.width(i),
        showCombatScrap: encounterDisplay.snapshot().showRemains,
        textFace: displayPreferences.snapshot().textFace,
        paused: match.status !== 'running',
        reduced: displayPreferences.snapshot().effectiveReducedEffects,
        fullReveal: run.status === 'won',
        celebrationPaused: document.hidden,
        backdrop,
        actorAppearance,
      });
    }
    match.runs.forEach((run, i) =>
      sound.feedback(match.status === 'running', theme, run, {
        board: i,
        mode: 'versus',
        actorStyle: actorAppearance?.style,
        placement: boardPlacement(contexts[i].canvas),
      }),
    );
    (music || sound).update(
      match.status === 'running',
      theme,
      match.runs.find((r) => !['won', 'lost'].includes(r.status)) || match.runs[0],
    );
    frameId = requestAnimationFrame(frame);
  }
  const initialPreparation = prepare(),
    initialMatch = match,
    initialGeneration = generation;
  frameId = requestAnimationFrame(frame);
  // Install the usable lobby before waiting for its required picture. Cancel
  // and Back stay reachable; only Start waits for this exact preparation.
  finishBoot();
  document.documentElement.dataset.toolState = 'ready';
  const incomingEpoch = libraryHandoff ? ++libraryOpenEpoch : null,
    incomingController = (libraryIncomingController = libraryHandoff
      ? new AbortController()
      : null),
    incomingOpening = libraryHandoff
      ? trackMissionLibraryOpening({
          onRetire: () => {
            if (incomingEpoch === libraryOpenEpoch) ++libraryOpenEpoch;
            incomingController.abort();
          },
        })
      : null;
  const initialReady = await initialPreparation;
  if (libraryHandoff) {
    const epoch = incomingEpoch,
      context = libraryContext(),
      opening = incomingOpening;
    try {
      const owner = await getMissionLibrary();
      if (epoch === libraryOpenEpoch && opening.current() && context.isCurrent()) {
        const row = owner.library.find(libraryHandoff);
        if (!row || !row.modes.includes('versus'))
          throw new Error(t('interface:thisExactMissionEditionIsUnavailableInVersusNoDifferent'));
        if ((row.collection === 'Journey') !== !!candidateJourney)
          throw new Error(t('interface:thisMissionBelongsToADifferentGameplayHostChooseIt'));
        const paired = libraryExternalSelections.get(row.id);
        if (
          libraryIntent !== 'select' &&
          paired &&
          libraryInventory.state().ready &&
          libraryInventory.getInventory().packs.some((pack) => pack.id === paired.packId)
        ) {
          // Incoming Play is deliberate. Check installed paired originals under
          // its original opening lease, never download or choose a substitute.
          await owner.library.prepare(row, {
            mode: 'versus',
            signal: incomingController.signal,
          });
          if (epoch !== libraryOpenEpoch || !opening.current() || !context.isCurrent())
            throw new DOMException(t('interface:requestedMissionCancelled'), 'AbortError');
        }
        // The metadata request relinquishes input before the exact launch or
        // chooser adopts focus. Later staged work owns its own cancellation.
        opening.dispose();
        if (
          libraryIntent === 'select' ||
          owner.library.availability(row, 'versus').state !== 'ready'
        ) {
          // A mode choice reveals this exact row. Only its explicit Play action
          // may prepare/adopt a replacement or start either simulation.
          journeyChooser.open($('race-chapters'));
          journeyChooser.reveal(row.id);
        } else {
          const started = await owner.library.launch(row, {
            mode: 'versus',
            ...context,
          });
          if (started === false && epoch === libraryOpenEpoch && context.isCurrent()) {
            journeyChooser.open($('race-chapters'));
            journeyChooser.reveal(row.id);
          }
        }
      }
    } catch (error) {
      if (epoch === libraryOpenEpoch && context.isCurrent())
        localizedText($('race-message'), () =>
          t('interface:couch.requestedMissionError', { error: error.message }),
        );
    } finally {
      opening.dispose();
      if (libraryIncomingController === incomingController) libraryIncomingController = null;
      incomingController.abort();
    }
  }
  const start = $('race-start');
  if (
    initialFocusPending &&
    initialReady &&
    !disposed &&
    !artworkLifetime.signal.aborted &&
    match === initialMatch &&
    generation === initialGeneration &&
    match.status === 'ready' &&
    contentReady &&
    !contentBusy &&
    shell.scope() === 'main' &&
    unclaimedFocus(document.activeElement) &&
    !document.hidden &&
    document.hasFocus?.() !== false &&
    start.isConnected &&
    !start.disabled &&
    !start.closest('[hidden],[inert],[aria-hidden="true"]') &&
    start.getClientRects().length > 0 &&
    document.defaultView?.getComputedStyle(start)?.visibility !== 'hidden'
  )
    shell.focus(start);
} catch (error) {
  document.documentElement.dataset.toolState = 'error';
  bootFailed = true;
  bootDisplay.finish({
    state: 'error',
    message: localizedMessage('gameplay:theRaceCouldNotLoad', { value1: error.message }),
  });
  releaseArtwork({ persisted: false });
  $('race-start').disabled = true;
  localizedText($('race-message'), () =>
    t('gameplay:theRaceCouldNotLoad', { value1: error.message }),
  );
} finally {
  initialFocusPending = false;
  document.removeEventListener('focusin', initialFocusChoice, true);
  document.removeEventListener('visibilitychange', initialVisibility);
  window.removeEventListener('blur', initialWindowBlur);
  window.removeEventListener('pagehide', initialFocusLost);
  finishBoot();
}
