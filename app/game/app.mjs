import { installBrandedIsolation, assertBrandedLocation, assertBrandedPacks, denyBrandedImport } from './branded-isolation.mjs';
import { loadCompanyStartup } from './ui/company-startup.mjs';
import { createStudioPreviewSession } from './studio-preview-session.mjs';
import { editionDepartureDestinationAllowed } from './editions/departure-destination.mjs';
import { mountEditionSoloUI } from './ui/edition-solo.mjs';
import { focusEditionPresentationRecovery } from './ui/edition-presentation-recovery.mjs';
import { mountTitleCharacter } from './ui/title-character.mjs';
import {
  createEditionPracticeScenario,
  editionGuidePracticeURL,
  readEditionGuideSeed,
} from './ui/edition-controller-practice.mjs';
import { projectEditionGuideScenario } from './editions/selected-presentation.mjs';
import { installedPresentation, invalidateInstalledMigration } from './installed-app.mjs';
import { createGameWakeLock } from './ui/game-wake-lock.mjs';
import { localOfficialChapter } from './official-chapter-source.mjs';
import { localOfficialRecordingIds } from './official-downloads.mjs';
import {
  gameplayTuningDescription,
  gameplayDifficultyLabel,
  journeyPresetDescription,
  activeJourneyRules,
} from './ui/gameplay-copy.mjs';
import { contentText } from './i18n/content.mjs';
import { flightPictureFailure, flightPictureStatus } from './ui/flight-picture-copy.mjs';
import { profileWriterMessage } from './ui/profile-writer-copy.mjs';
import { milestoneName, achievementName, achievementDescription } from './ui/reward-copy.mjs';
import { soloControllerFlightHint } from './ui/controller-flight-copy.mjs';
import {
  t,
  localizedText,
  localizedAttribute,
  localizedOption,
  localizedMessage,
  render as renderMessage,
  onLocaleChange,
  formatNumber,
} from './i18n/index.mjs';
import {
  freshSoloVisualSelection,
  prepareFreshSoloVisualTheme,
} from './presentation/fresh-visual-theme.mjs';
import { attachMusicCredit } from './ui/music-credit.mjs';
import { soundtrackErrorText } from './ui/soundtrack-error-copy.mjs';
import { createTouchPreferences } from './touch-preferences.mjs';
import { createCharacterPresentations } from './character-presentations.mjs';
import { journeyFromPackCatalog, journeyMissionId } from './journey/catalog.mjs';
import { createJourneyAuthority } from './journey/authority.mjs';
import { createJourneyProfileStore } from './journey/profile.mjs';
import { attachJourneySaveNotice } from './ui/journey-save-notice.mjs';
import { createSoloPerformanceBinding } from './journey/performance-binding.mjs';
import { journeyPerformanceText } from './ui/journey-performance.mjs';
import { createJourneyPreferences } from './journey/preferences.mjs';
import { loadAuthoredJourneyRoute } from "./editions/standalone/route-loader.mjs";
import { DEFAULT_JOURNEY_ROUTES, resolveJourneyRequest } from './content-design/default-entry.mjs';
import {
  authoredJourneyModeHref,
  authoredJourneyUsesActorMaterials,
} from './content-design/mode-href.mjs';
import { attachJourneyReactions } from './ui/journey-reactions.mjs';
import { createSoloRouteHost } from './content-design/solo-route-host.mjs';
import { publishedRouteViews } from './content-design/published-journey.mjs';
import { journeyActorThemeCandidates } from './presentation/journey-actor-materials.mjs';
import { journeyDifficultyCatalog, journeyPreset } from './content-design/catalogs.mjs';
import { createCandidateFlightPictures } from './ui/candidate-flight-pictures.mjs';
import { attachJourneyChooser } from './ui/journey-chooser.mjs';
import {
  resolveInstalledMissionTarget,
  installedMissionExecutionIndex,
  resolveCampaignMissionTarget,
} from './mission-library/installed-target.mjs';
import { createInstalledMissionLibrary } from './mission-library/installed-library.mjs';
import {
  CLASSIC_RULES_ORIGINAL,
  projectClassicCurrentRulesEntry,
} from './mission-library/classic-current-rules.mjs';
import { journeyLibrarySource } from './mission-library/journey-source.mjs';
import { publishedJourneyLibrarySources } from './mission-library/published-routes.mjs';
import { combineJourneyLibrarySources } from './mission-library/cross-mode-journey.mjs';
import { trackMissionLibraryOpening } from './mission-library/opening-intent.mjs';
import { authoredMissionSuccessor } from './mission-library/authored-continuation.mjs';
import { librarySuccessor, retainedLibraryMission } from './mission-library/continuous-next.mjs';
import {
  journeyMissionDetails,
  authoredJourneyMissionTags,
} from './mission-library/journey-presentation.mjs';
import {
  createMissionLibrarySessionState,
  missionLibraryHref,
  readMissionLibraryHandoff,
  readMissionLibraryReady,
  readMissionLibraryReturn,
} from './mission-library/handoff.mjs';
import { createDuel } from './multiplayer.mjs';
import { createPresentationHost } from './presentation/host.mjs';
import {
  createReleasePictureDefaults,
  ReleasePictureWriteRequiredError,
} from './presentation/release-pictures.mjs';
import { createMissionPictureThumbnails } from './ui/mission-thumbnails.mjs';
import { drawResultPicture } from './ui/result-picture.mjs';
import { resultContinuationLabel } from './ui/result-continuation.mjs';
import { loadExternalCatalog, prepareExternalDownload } from './external-chapter-catalog.mjs';
import { createExternalChapterHost } from './external-chapter-host.mjs';
import { createExternalChapterBackup } from './external-chapter-backup.mjs';
import {
  SOURCE_EXTERNAL_CHAPTER,
  SOURCE_EXTERNAL_CHAPTERS,
  SOURCE_EXTERNAL_EDITIONS,
  sourceExternalChapter,
  prepareSourceExternalChapter,
} from "./editions/standalone/external-chapters.mjs";
import { validateMediaLibrary } from './media-library.mjs';
import { createPresentationPins } from './presentation-pins.mjs';
import { createFlightPresentationPins, retryFlightPresentationPins } from './flight-media-pins.mjs';
import {
  loadOptionalCatalog,
  prepareOptionalDownload,
  verifyOptionalInstalled,
} from './optional-chapters.mjs';
import { presentSourceChapter } from './ui/optional-chapter-presentation.mjs';
import { attachOptionalChaptersPanel } from './ui/optional-chapters-panel.mjs';
import { arcadeActionCapabilities } from './core/arcade-actions.mjs';
import {
  nextInputModality,
  showScreenControls,
  hasCompactArcadeArena,
  hasFieldWarningBand,
} from './input-presentation.mjs';
import { onNativeInactive, nativePlatform } from './platform.mjs';
import { createRun, stepRun, getSummary, CLASSES, FIXED_DT } from './core/index.mjs';
import { inspectCaptureSnapshot } from './core/capture-regions.mjs';
import { BoardPainter, boardPaintSizeForRun, boardPaintSizeForLevel } from './ui/render.mjs';
import { encounterView } from './ui/encounter-view.mjs';
import { foundationCompatibleView as classicView } from './ui/foundation-view.mjs';
import { terrainTransitionCaption } from './ui/terrain-feedback.mjs';
import { foundationReturnCaption } from './ui/foundation-feedback.mjs';
import { laneWarningCaption } from './ui/lane-presentation.mjs';
import { attachFlightInformation } from './ui/flight-information-host.mjs';
import { attachFlightDetails } from './ui/flight-information-details.mjs';
import { retryExplanation } from './ui/retry-view.mjs';
import {
  FIRST_FLIGHT_LESSONS,
  getFirstFlightLesson,
  resolveCourseRequest,
  createLessonScenario,
  captureLessonFacts,
  createLessonObserver,
} from './first-flight.mjs';
import { attachFirstFlightView } from './ui/first-flight-view.mjs';
import { retainFlightForFirstFlight } from './ui/first-flight-entry.mjs';
import { revealFirstFlightBoard } from './ui/first-flight-launch.mjs';
import { attachInput } from './ui/input.mjs';
import { resolveTouchControls } from './touch-controls.mjs';
import { attachFullscreen } from './ui/fullscreen.mjs';
import { editionThemeLabel } from './ui/edition-theme-label.mjs';
import { attachGameShell } from './ui/game-shell.mjs';
import { attachDemoHost } from './ui/demo-host.mjs';
import { createDemoLibrary } from './demo-library.mjs';
import { loadDemoSources } from './demo-sources.mjs';
import { demoIdentity } from './demo-catalog.mjs';
import { emitDemoEvents, updateDemoFeedback } from './demo-audio-feedback.mjs';
import { authoredModeDestinations } from './ui/authored-mode-routes.mjs';
import {
  mountWorkshopLinks,
  readWorkshopReturn,
  clearWorkshopReturn,
} from './ui/workshop-return.mjs';
import { attachFocusClearance } from './ui/focus-clearance.mjs';
import { createOperationStatus } from './ui/operation-status.mjs';
import { attachMissionPicker } from './ui/mission-picker.mjs';
import { fetchBundledChapter } from './chapter-download.mjs';
import { attachModalNavigation } from './ui/modal-navigation.mjs';
import { attachProfileRecoveryDialog } from './ui/profile-recovery-dialog.mjs';
import { createSoloRadioInput, SOLO_RADIO_PROFILE_KEY } from './ui/solo-radio-input.mjs';
import { mountControllerSetup } from './couch/controller-setup.mjs';
import { createControllerRouter } from './ui/controller-router.mjs';
import { attachControllerConfirmGuard } from './ui/controller-confirm-guard.mjs';
import { createControllerConfirmLifecycle } from './ui/controller-confirm-lifecycle.mjs';
import { attachControllerConfirmTrace } from './ui/controller-confirm-trace.mjs';
import {
  cancelControllerToggleBoost,
  controllerBoostAfterRecovery,
} from './ui/controller-boost-host.mjs';
import {
  attachControllerBoostSettings,
  renderControllerBoostCue,
} from './ui/controller-boost-settings.mjs';
import { attachControllerNavigation } from './ui/controller-navigation.mjs';
import { attachControllerReading } from './ui/controller-reading.mjs';
import { attachControllerPreview } from './ui/controller-preview.mjs';
import { attachPracticeNavigation } from './ui/practice-navigation.mjs';
import { createPracticeRenderFailure } from './ui/practice-render-failure.mjs';
import { readPracticeRemainsOverride } from './ui/practice-presentation.mjs';
import {
  attachControllerPracticeReturn,
  requestControllerPracticeExit,
} from './ui/controller-practice-exit.mjs';
import { playgroundTabBoundary } from './ui/playground-tab-boundary.mjs';
import { attachEnemyWorkshopReturn } from './ui/enemy-workshop-return.mjs';
import { attachEnemyGuide } from './ui/enemy-guide.mjs';
import { attachControllerSettings } from './ui/controller-settings.mjs';
import { controllerBindingLabels, controllerStickLabel } from './controller-bindings.mjs';
import { attachKeySettings } from './ui/key-settings.mjs';
import { attachQuickMusicControls } from './ui/quick-music-controls.mjs';
import { actionForKey, bindingLabels, keyLabel, resolveKeyBindings } from './key-bindings.mjs';
import { Soundscape, DEFAULT_TRACKS } from './ui/audio.mjs';
import { createAudioMaster } from './ui/audio-master.mjs';
import { createAudioPreferences } from './audio-preferences.mjs';
import { attachEncounterDisplayControls } from './ui/encounter-display-controls.mjs';
import { createDisplayPreferences } from './display-preferences.mjs';
import { createActorStylePreferences } from './actor-style-preferences.mjs';
import {
  prepareActorAppearanceLease,
  prepareRetainedActorAppearanceLease,
} from './presentation/actor-appearance-lease.mjs';
import { createJourneyVisualThemeIdentityAdapter } from './presentation/journey-visual-theme-identities.mjs';
import { prepareCampaignVisualThemeContext } from './presentation/visual-theme-identities.mjs';
import { verifyIndexedInstalledPack } from './mission-library/pack-identity.mjs';
import { attachMenuStyleControls } from './ui/menu-style-controls.mjs';
import { attachPreferenceRestoration } from './ui/preference-restoration.mjs';
import { settingsTabOwnsKey } from './ui/settings-panels.mjs';
import { attachPublishedAudio } from './ui/published-audio.mjs';
import { prepareSavedVisualTheme } from './presentation/saved-visual-theme.mjs';
import { createSoundtrackStore } from './soundtrack-store.mjs';
import { upgradeSoundtrackLibrary, setCatalogueTracks, SOUNDTRACK_MODES } from './soundtrack.mjs';
import { prepareSoundtrackLibrary } from './soundtrack-bundle.mjs';
import { createSoundtrackSource } from './soundtrack-source.mjs';
import { prepareOpeningTheme, usesOpeningThemeDefault } from './opening-soundtrack.mjs';
import {
  SOUNDTRACK_CATALOGUE,
  SOUNDTRACK_ARCHIVES,
  SOUNDTRACK_BUNDLED_ASSETS,
} from './content/soundtrack-catalogue.mjs';
import { createManagedMediaStore } from './managed-media-store.mjs';
import { createStillMediaStore } from './media-store.mjs';
import { createStoryMediaStore } from './story-media-store.mjs';
import { storyPinForTheme, validateFlightPresentationPinsForRun } from './flight-media-pins.mjs';
import { createStoryDialog } from './ui/story-dialog.mjs';
import { attachJourneyCollection } from './ui/journey-collection.mjs';
import { createFlightPictures } from './ui/flight-pictures.mjs';
import { acquireAuthoredPicture, acquirePresentationImage } from './ui/presentation-image.mjs';
import { createSessionReleasePictures } from './presentation/session-release-pictures.mjs';
import { createSessionPictureView } from './presentation/session-picture-view.mjs';
import {
  createPictureIdentityCatalog,
  createBackupPictureIdentityResolver,
} from './ui/picture-identity.mjs';
import { createSoundtrackPlayer } from './ui/soundtrack-player.mjs';
import { attachSoundtrackPanel } from './ui/soundtrack-panel.mjs';
import { availableCommunitySoundtrackStyles } from './community-soundtrack-styles.mjs';
import { attachLibraryPanel } from './ui/library-panel.mjs';
import { masteryFor, masteryText } from './ui/mastery-view.mjs';
import { createMasteryObserver, captureMasterySetup, captureMasteryFacts } from './mastery.mjs';
import { createMasteryAwards } from './mastery-awards.mjs';
import { createMasteryCatalog } from './mastery-catalog.mjs';
import { normalizedLevel } from './core/level.mjs';
import { canonicalJSON, dataIdentity } from './data-json.mjs';
import {
  emptyLibrary,
  loadLibrary,
  saveLibrary,
  progressFor,
  recordLibraryCompletion,
  campaignKey,
  updatePreferences,
  withMasteryRecords,
  withCinematicVolume,
  DEFAULT_CINEMATIC_VOLUME,
} from './library.mjs';
import {
  emptyPackLibrary,
  isOfficialPack,
  importPackLibrary,
  exportPackLibrary,
  preparePack,
  installPack,
  resolvePackCampaign,
} from './packs.mjs';
import {
  canAutoStartPackLaunch,
  canReconcilePackCommit,
  createPackCommitCoordinator,
  createPackLaunchGuard,
  preparePackCatalog,
  resolvePackLaunch,
} from './content-launch.mjs';
import {
  readAssetStore as readPersistentAssetStore,
  writeAssetStore as writePersistentAssetStore,
} from './storage.mjs';
import { suspendSession, restoreSession, saveSession, SESSION_STORAGE_BYTES } from './sessions.mjs';
import { createAttemptFilePreparer } from './attempt-file.mjs';
import { challengeCampaign } from './challenges.mjs';
import { createGalleryDifficultyResolver } from './gallery-difficulty.mjs';
import {
  applyGameplayTuning,
  createGameplayTuningController,
  matchRecordedGameplayTuning,
  recoverGameplayTuning,
} from './gameplay-tuning.mjs';
import { mountGameplayTuning } from './ui/gameplay-tuning.mjs';
import { savedFlightPreview } from './continuation.mjs';
import { createSelectionBookmark, resolveSelectionBookmark } from './selection-bookmark.mjs';
import { createModeReturn } from './mode-return.mjs';
import { createModeReturnV2 } from './mode-return-v2.mjs';
import { createExecutionCatalog } from './campaign-contexts.mjs';
import { resolveCampaignDifficulty } from './campaign-difficulty.mjs';
import {
  createDifficultyNavigation,
  difficultyCue,
  difficultyLabel as legacyDifficultyLabel,
  difficultyRuleComparison,
} from './difficulty-navigation.mjs';
import { missionBriefing } from './mission-brief.mjs';
import { claimProfileWriter } from './profile-writer.mjs';
import { commitBackup, recoverBackupImport } from './backup-storage.mjs';
import { attachOfflinePanel } from './ui/offline-panel.mjs';
import {
  attachInstallOfflinePanel,
  guardInstallOfflineBlur,
  installOfflineOwnsElement,
} from './ui/install-offline-panel.mjs';
import { createOfflineDownloadAccess } from './offline-download-access.mjs';
import { withOfflinePictureGate } from './ui/offline-picture-gate.mjs';
import {
  attachOfflineToolNavigation,
  attachOfflineModeNavigation,
} from './ui/offline-tool-navigation.mjs';
import { offlineAvailability } from './offline.mjs';
import { attachStorageRetention } from './ui/storage-retention.mjs';
import { emptyProgress, loadProgress, saveProgress, awardCompletion } from './progress.mjs';
import {
  downloadJSON,
  MASTERY_SCENARIO_VERSION,
  ENCOUNTER_SCENARIO_VERSION,
  scenarioMasteryCampaign,
} from './content.mjs';
import { prepareScenario } from './imports.mjs';
import { createRecorder, recordInput, exportReplay, MAX_REPLAY_TICKS } from './replay.mjs';
import { exportReplayPresentation } from './replay-presentation.mjs';

const $ = (id) => document.getElementById(id),
  show = (id, on) => ($(id).hidden = !on);
const getJSON = async (path) => {
  const r = await fetch(
    communityRouteFromURL(location.href) ? new URL(path, gameDocumentURL(location.href)) : path,
  );
  if (!r.ok) throw new Error(t('gameplay:couldNotLoad', { value1: path }));
  return r.json();
};
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
let startupEditionWriter = null;
let stopStartupEditionLocalization = () => {};
const timeLabel = (time) =>
  `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
// A valid tool return owns the normal native autofocus produced while the
// title is booting, but never a real key/pointer choice made during that wait.
// Track only deliberate input: programmatic/native dialog focus is expected.
const bootWorkshopInput = {
  active: new URLSearchParams(location.search).has('workshop'),
  interrupted: false,
};
const interruptBootWorkshop = () => {
  bootWorkshopInput.interrupted = true;
};
if (bootWorkshopInput.active)
  for (const type of ['keydown', 'pointerdown'])
    document.addEventListener(type, interruptBootWorkshop, { capture: true, once: true });
function retireBootWorkshopInput() {
  if (!bootWorkshopInput.active) return;
  bootWorkshopInput.active = false;
  for (const type of ['keydown', 'pointerdown'])
    document.removeEventListener(type, interruptBootWorkshop, { capture: true });
}
function preparationStatus(observer, message, stage, isCurrent = () => true) {
  if (!isCurrent()) return;
  try {
    observer?.({ status: 'preparing', message, stage, progress: null });
  } catch {
    // A status observer cannot alter content verification or a durable commit.
  }
}

try {
  assertBrandedLocation(location.href);
  const previewSession = createStudioPreviewSession(location.href);
  const profileStorage = () => previewSession?.storage ?? globalThis.localStorage;
  const profileSessionStorage = () => previewSession?.sessionStorage ?? globalThis.sessionStorage;
  const profileLocks = previewSession ? null : navigator.locks;
  const readAssetStore = previewSession?.readAsset ?? readPersistentAssetStore;
  const writeAssetStore = previewSession?.writeAsset ?? writePersistentAssetStore;
  globalThis.RevealLineBoot?.progress?.(t('interface:loadingMissionsAndFlightEquipment'));
  const contentFeedback = ['content-select-status', 'shell-featured-status']
    .map((id) => $(id))
    .filter(Boolean)
    .map((target) => ({ target, presenter: createOperationStatus(target), lease: null }));
  let attemptFiles = null,
    profileRecovery = null;
  installBrandedIsolation(document, window);
  const runtimeContent = await loadCompanyStartup();
  const editionLocalization = runtimeContent?.installLocalization?.();
  const stopEditionLocalization = () => editionLocalization?.dispose();
  stopStartupEditionLocalization = stopEditionLocalization;
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) stopEditionLocalization();
  });
  const themeLabel = (item) => editionThemeLabel(item, contentText(item, 'name'), runtimeContent);
  const [baseCampaign, themesFile, presets, baseClasses, packCatalogSource, archiveCatalogSource] =
    runtimeContent?.boot ??
    (await Promise.all([
      getJSON('content/campaign.json'),
      getJSON('content/themes.json'),
      getJSON('../authoring/motion-lab/presets.json'),
      getJSON('content/classes.json'),
      getJSON('content/packs/catalog.json'),
      getJSON('content/packs/archive-catalog.json'),
    ]));
  // Guide lessons keep the canonical catalog when a selected pack narrows flight themes.
  const guideThemes = themesFile.themes;
  const characterPresentations = createCharacterPresentations(presets);
  const packCatalog = runtimeContent
    ? { packs: [] }
    : preparePackCatalog({
        ...packCatalogSource,
        packs: [
          ...preparePackCatalog(packCatalogSource).packs,
          ...preparePackCatalog(archiveCatalogSource).packs,
        ],
      });
  let campaign = baseCampaign,
    classRegistry = baseClasses;
  campaign.classRecipes = classRegistry;
  const baseEntry = {
    campaign,
    classRecipes: classRegistry,
    themes: themesFile.themes,
    visualOverrides: {},
    levelVisuals: [],
    music: [],
    sourcePackId: null,
  };
  let activeEntry = baseEntry,
    packs = emptyPackLibrary();
  let chapterSnapshot = null;
  let installedEntries = [baseEntry],
    executionCatalog = createExecutionCatalog(installedEntries),
    masteryCatalog = createMasteryCatalog(
      runtimeContent ? [] : [{ campaign: baseEntry.campaign, sourcePackId: null }],
    );
  function prepareContentCatalog(nextPacks) {
    assertBrandedPacks(nextPacks);

    const entries = [
      baseEntry,
      ...nextPacks.packs.flatMap((pack) =>
        pack.campaigns.map((source) => resolvePackCampaign(pack, source.id)),
      ),
    ];
    const registrations = createMasteryCatalog(
      entries
        .filter((entry) => !runtimeContent || entry !== baseEntry)
        .map((entry) => ({
          campaign: entry.campaign,
          sourcePackId: entry.sourcePackId,
          ...(entry.sourcePackFormat
            ? { sourcePackFormat: entry.sourcePackFormat, masteries: entry.masteries }
            : {}),
        })),
    );
    return {
      packs: nextPacks,
      entries,
      executions: createExecutionCatalog(entries),
      registrations,
    };
  }
  function adoptContentCatalog(content) {
    attemptFiles?.invalidate();
    packs = content.packs;
    chapterSnapshot = content.chapterSnapshot ?? null;
    installedEntries = content.entries;
    executionCatalog = content.executions;
    masteryCatalog = content.registrations;
  }
  let buildVersion = document.documentElement.dataset.buildVersion;
  let buildSourceRevision = null;
  if (!buildVersion || buildVersion === '__REVEALLINE_VERSION__') buildVersion = 'dev';
  let isRelease = false;
  try {
    const info = await getJSON('build-info.json');
    buildVersion = info.version;
    if (typeof info.sourceRevision === 'string' && /^[0-9a-f]{40,64}$/.test(info.sourceRevision))
      buildSourceRevision = info.sourceRevision;
    isRelease = true;
  } catch {}
  if (isRelease) document.querySelectorAll('[data-source-only]').forEach((a) => (a.hidden = true));
  const versionLabel =
    buildVersion === 'dev'
      ? t('interface:dev')
      : `${/^\d/.test(buildVersion) ? 'v' : ''}${buildVersion}`;
  localizedText($('version'), () => versionLabel);
  localizedText($('landing-version'), () => t('gameplay:version', { value1: versionLabel }));
  const params = new URLSearchParams(location.search);
  let controllerTraceRoot = () => document.body;
  const controllerConfirmTrace = attachControllerConfirmTrace({
    getHost: () => controllerTraceRoot(),
    enabled: params.get('controllerTrace') === '1',
    version: versionLabel,
  });
  const libraryHandoff = readMissionLibraryHandoff(params);
  const libraryReady = readMissionLibraryReady(params);
  let courseRequest = resolveCourseRequest(params);
  const courseSession = !!courseRequest;
  const courseEmbedded = window.parent !== window;
  const courseTheme = themesFile.themes.find((item) => item.id === 'fpv') ?? runtimeContent?.theme;
  let scenario = null;
  if (courseRequest) {
    scenario = createLessonScenario(courseRequest.lessonId, {
      turnPolicy: courseRequest.turnPolicy || 'immediate',
      theme: courseTheme,
    });
  } else if (params.get('practice') === '1') {
    const raw = runtimeContent
      ? null
      : profileSessionStorage().getItem('revealline-mmm.playground.current');
    if (!runtimeContent && !raw)
      throw new Error(t('interface:thisPracticeTabHasNoConfigurationOpenThePlaygroundAnd'));
    const requested = runtimeContent
      ? createEditionPracticeScenario(runtimeContent, {
          missionId: params.get('edition-mission'),
          classId: params.get('class') ?? 'scout',
          turnPolicy: params.get('turn-policy') ?? 'immediate',
          difficulty: params.get('difficulty') ?? 'standard',
        })
      : JSON.parse(raw);
    if (runtimeContent) {
      const guideSeed = readEditionGuideSeed(params);
      if (guideSeed !== null) requested.settings.seed = guideSeed;
    }
    const prepared = await prepareScenario(requested, { classRecipes: classRegistry });
    scenario = prepared.scenario;
  }
  // Switching source maps inside an authored preview must not turn the same
  // session into an awarding game, even when the configured scenario is cleared.
  const practiceSession = !!scenario;
  const practiceRemains = readPracticeRemainsOverride(location.search, {
    practice: practiceSession && !courseSession,
  });
  const practiceRenderFailure = createPracticeRenderFailure({
    enabled: practiceSession,
    document,
    stop: () => {
      paused = true;
      document.body.dataset.flightState = 'paused';
      clearInput();
      input.destroy();
      controllerNavigation.destroy();
      controllerConfirmGuard.destroy();
      controllerPreview?.clear();
      gameWakeLock.setActive(false);
      suspendAudio();
    },
  });
  const journeyRequest = resolveJourneyRequest(params, {
    mode: 'solo',
    auxiliary: practiceSession,
  });
  let installOfflinePanel = null;
  const gameplayDownloads = runtimeContent
    ? null
    : createOfflineDownloadAccess({
        requestPackage: (request) => {
          if (!installOfflinePanel)
            throw new Error(t('interface:downloads.openInstallToPrepareChapter'));
          return installOfflinePanel.requestPackage(request);
        },
      });
  const authoredRoute =
    !practiceSession && (runtimeContent?.route ?? (await loadAuthoredJourneyRoute(journeyRequest)));
  const authoredJourney = !!authoredRoute;
  const candidateHost = authoredJourney
    ? await createSoloRouteHost(authoredRoute, {
        themes:
          runtimeContent?.themes ??
          (authoredJourneyUsesActorMaterials(authoredRoute.id)
            ? journeyActorThemeCandidates((await getJSON('content-design/themes.json')).themes, {
                includeOriginals: authoredRoute.preserveOriginalThemes === true,
              })
            : (await getJSON('content-design/themes.json')).themes),
        buildVersion,
        corePackIds: authoredRoute.corePackIds,
        optionalCampaignIds: authoredRoute.optionalCampaignIds,
        ...(!runtimeContent
          ? { ensurePackage: (groupId, options) => gameplayDownloads.ensure(groupId, options) }
          : {}),
      })
    : null;
  const journeyPreferences = authoredJourney
    ? createJourneyPreferences({ window, getStorage: () => profileStorage() })
    : null;
  // Legacy browsing reads the same next-attempt preset as receiving Journey
  // hosts, without changing Legacy rules or writing a preference.
  const browsingJourneyPreferences =
    journeyPreferences || createJourneyPreferences({ window, getStorage: () => profileStorage() });
  const gameplayTuning = createGameplayTuningController({
    eventTarget: window,
    ...(previewSession ? { storage: previewSession.storage } : {}),
  });
  let gameplayTuningPanel = null;
  const nextGameplayTuning = (entry = activeEntry) =>
    gameplayTuning.snapshot(
      entry?.difficulty && candidateHost?.owns(entry)
        ? entry.difficulty
        : browsingJourneyPreferences.snapshot().difficulty,
    );
  function difficultyLabel(entry) {
    return candidateHost?.owns(entry)
      ? gameplayDifficultyLabel(entry.difficulty)
      : legacyDifficultyLabel(entry);
  }
  const journeyEnabled = (params.get('journey') === '1' || authoredJourney) && !practiceSession;
  const journeySaveNotice = journeyEnabled ? attachJourneySaveNotice({ document }) : null;
  const journeyAuthority =
    journeyEnabled && !authoredJourney
      ? createJourneyAuthority({
          baseCampaign,
          pins: await getJSON('content/journey-campaign-pins.json'),
        })
      : null;
  const journeyCatalog =
    candidateHost?.catalog ??
    journeyFromPackCatalog(
      baseCampaign,
      runtimeContent ? packCatalog : preparePackCatalog(packCatalogSource),
    );
  let editionWriter = null,
    editionUI = null,
    journeyRewardsDurable = false;
  const journeyProfile = journeyEnabled
    ? createJourneyProfileStore({
        profileKey: authoredRoute?.profileKey,
        ...(candidateHost
          ? {
              acceptPerformanceBinding: createSoloPerformanceBinding({
                host: candidateHost,
                provider: runtimeContent,
              }),
            }
          : {}),
        ...(runtimeContent ? { canWrite: () => editionWriter?.writable === true } : {}),
        ...(previewSession?.journeyOptions(authoredRoute?.profileKey) ?? {}),
        onStatus: (status) => {
          journeyRewardsDurable = !previewSession && status.durable;
          journeySaveNotice.update(
            previewSession ? { ...status, durable: false, error: null } : status,
          );
        },
      })
    : null;
  if (journeyProfile) await journeyProfile.load();
  let collectionJourneyState =
    journeyProfile && candidateHost
      ? { profile: journeyProfile, catalog: journeyCatalog, editionId: authoredRoute.id }
      : null;
  let journeyChooser = null,
    libraryNextOperation = null,
    retainedLibraryOwner = null,
    unifiedLibrary = null,
    unifiedLibraryLoading = null,
    unifiedChooser = null,
    disposeUnifiedPreview = null,
    cancelUnifiedOpening = null,
    retiredJourneyChooser = null,
    unifiedOpenRevision = 0,
    unifiedLaunchRevision = 0,
    unifiedDisposed = false,
    journeySkipArmed = null,
    journeySkipDestination = null,
    librarySkipResolution = null,
    journeyLaunch = null;
  $('creator-tools').hidden = practiceSession;
  let packLaunchRequest = null,
    packLaunchError = '';
  if (!practiceSession && !authoredJourney && !libraryHandoff)
    try {
      packLaunchRequest = resolvePackLaunch(params, packCatalog);
    } catch (error) {
      packLaunchError = error.message;
    }
  const controllerPreviewRequested = practiceSession && params.get('controller-preview') === '1';
  if (
    window.parent !== window &&
    window.name === 'revealline-controller-practice' &&
    !controllerPreviewRequested
  )
    throw new Error(t('interface:returnToControllerPracticeAndChooseLoadPracticeToContinue'));
  const controllerPreview = attachControllerPreview({ enabled: controllerPreviewRequested });
  const practiceNavigation = attachPracticeNavigation({
    enabled: practiceSession,
    onBlocked: () =>
      warning(
        courseSession
          ? localizedMessage('interface:useEndCourseOrReturnToTheGameToLeave')
          : controllerPreviewRequested
            ? localizedMessage('interface:useTheControllerPracticePageSHeaderLinksToLeave')
            : localizedMessage('interface:useThePlaygroundPageSHeaderLinksToOpenThe'),
      ),
  });
  // Each archived release keeps its own profile schema, packs and save slot.
  // A portable complete backup transfers progress without changing older versions.
  const editionContext = runtimeContent?.context(isRelease ? buildVersion : 'dev');
  const channel = editionContext?.channel ?? (isRelease ? `release-${buildVersion}` : 'dev');
  const libraryKey = `revealline-mmm.library.${channel}.v1`;
  const packsKey = `revealline-mmm.packs.${channel}.v1`;
  // Candidate saves are revision-pinned and independent of Legacy/release slots.
  const sessionKey = authoredJourney
    ? authoredRoute.sessionKey
    : `revealline-mmm.suspended.${channel}.v1`;
  const packCommits = createPackCommitCoordinator({
    read: () => checkedChapters(),
    write: (value) => writeCheckedPacks(value),
    prepare: (snapshot) => contentFromChapters(snapshot),
    adopt: adoptContentCatalog,
    canAdopt: () =>
      canReconcilePackCommit({
        contentSwitchBusy,
        sessionBusy,
        backupBusy,
        persistenceReady,
        backupLocked: profileStorage().getItem(`${libraryKey}.backup-lock`) !== null,
        hidden: document.hidden,
      }),
    onReconciled: () => {
      refreshCampaigns();
      libraryPanel.refresh();
      contentStatus(t('interface:packStorageUpdatedYourNewerPlaySelectionWasKept'));
    },
    onError: (error) => {
      const message = t('gameplay:aCommittedPackChangeNeedsAReloadBeforeItCan', {
        value1: error.message,
      });
      contentStatus(message, true);
      // Persistent storage reconciliation is a system notice, not a flight event.
      warning(message, null, 'host.storage');
    },
  });
  globalThis.RevealLineBoot?.progress?.(t('interface:readingYourSavedFlightAndInstalledChapters'));
  const writer =
    previewSession?.writer ??
    (scenario
      ? {
          writable: false,
          get reason() {
            return t('interface:practiceKeepsItsSettingsInThisPreviewOpenTheSolo');
          },
          release() {},
        }
      : await claimProfileWriter(
          profileLocks,
          runtimeContent
            ? `revealline-mmm.company.${runtimeContent.editionId}.writer`
            : `${libraryKey}.writer`,
        ));
  editionWriter = writer;
  if (runtimeContent) startupEditionWriter = writer;
  let pictureManager = null;
  const getPictureManager = () =>
    (pictureManager ??= createManagedMediaStore({
      storyMedia: true,
      soundtrackCatalogue: true,
      ...(previewSession ? { indexedDB: null } : {}),
    }));
  const externalChapters =
    !previewSession && profileLocks?.request
      ? createExternalChapterHost({
          profileKey: libraryKey,
          packsKey,
          storage: profileStorage(),
          writer,
          getManagedStore: getPictureManager,
          registeredEntries: [baseEntry],
          knownDescriptors: SOURCE_EXTERNAL_CHAPTERS,
        })
      : null;
  const externalBackup = externalChapters
    ? createExternalChapterBackup({
        profileKey: libraryKey,
        packsKey,
        storage: profileStorage(),
        writer,
        getManagedStore: getPictureManager,
        registeredEntries: [baseEntry],
        knownDescriptors: SOURCE_EXTERNAL_CHAPTERS,
      })
    : null;
  async function inspectChapters({ signal } = {}) {
    if (externalChapters) return externalChapters.inspect({ signal });
    const values = await Promise.all([
      readAssetStore(`${libraryKey}.external-chapter-index.v1`),
      readAssetStore(`${libraryKey}.external-chapter-journal.v1`),
      readAssetStore(`${libraryKey}.backup-journal`),
    ]);
    if (values.some((value) => value !== null))
      throw new Error(t('interface:safeChapterRecoveryRequiresWebLocksStoredDataIsPreserved'));
    const raw = await readAssetStore(packsKey);
    return { status: 'checked', packs: raw ? await importPackLibrary(raw) : emptyPackLibrary() };
  }
  async function checkedChapters(options) {
    const snapshot = await inspectChapters(options);
    if (snapshot.status !== 'checked')
      throw new Error(
        t('gameplay:pendingRecoverTheExactFilesBeforeAdoptingStoredChaptersBoth', {
          value1: snapshot.reason,
        }),
      );
    return snapshot;
  }
  function contentFromChapters(snapshot) {
    return { ...prepareContentCatalog(snapshot.packs), chapterSnapshot: snapshot };
  }
  async function writeCheckedPacks(value) {
    const snapshot = await checkedChapters();
    if (!externalChapters) return writeAssetStore(packsKey, value);
    const review = await externalChapters.prepareMutation(snapshot, value ?? emptyPackLibrary());
    return externalChapters.commitMutation(review);
  }
  async function assertExternalBackupSupported(options) {
    if (candidateHost)
      throw new Error(t('interface:useTheOrdinaryGameForLegacyGameDataBackupsAuthored'));
    if (externalBackup) return externalBackup.assertSupported(options);
    const snapshot = await checkedChapters();
    if (snapshot.index?.chapters.length)
      throw new Error(t('interface:externalChapterBackupTransferIsNotSupportedInThisSource'));
  }
  let persistenceReady = writer.writable;
  let stopLocaleView = () => {};
  let handlePageHide = () => writer.release();
  window.addEventListener('pagehide', (event) => handlePageHide(event));
  const journalKey = `${libraryKey}.backup-journal`;
  async function writeLegacyBackupPacks(value) {
    // Legacy recovery owns this channel's writer and backup lock. V2 uses
    // the companion's native pack/index pair transaction, never this path.
    if (
      (await readAssetStore(`${libraryKey}.external-chapter-index.v1`)) !== null ||
      (await readAssetStore(`${libraryKey}.external-chapter-journal.v1`)) !== null
    )
      throw new Error(
        t('interface:externalChapterBackupRecoveryNeedsItsCompatibleAdapterStoredData'),
      );
    return writeAssetStore(packsKey, value);
  }
  const backupAdapters = () => ({
    externalBackup: externalBackup ?? undefined,
    storage: profileStorage(),
    readAsset: readAssetStore,
    writeAsset: (key, value) =>
      key === packsKey
        ? packCommits.commit(value, { writeValue: writeLegacyBackupPacks })
        : writeAssetStore(key, value),
    profileKey: libraryKey,
    packsKey,
    sessionKey: authoredJourney ? `revealline-mmm.suspended.${channel}.v1` : sessionKey,
    journalKey,
    commitProfile: (next, options) => {
      // The import lock is held here. Startup may have stopped at unreadable packs
      // before it could inspect the profile that this explicit replacement repairs.
      const current = loadLibrary(profileStorage(), libraryKey, { campaigns: [campaign] });
      return saveLibrary(profileStorage(), libraryKey, next, current.recovery, {
        ...options,
        baseline: libraryBaseline,
        generation: libraryGeneration,
      });
    },
  });
  let packWarning = !scenario && writer.reason ? () => profileWriterMessage(writer) : '';
  if (persistenceReady) {
    try {
      const chapters = await inspectChapters();
      if (chapters.status === 'recovery-required' && chapters.reason !== 'backup-recovery')
        throw new Error(
          t('gameplay:pendingUseTheExactPilotRecoveryFilesAmbiguousJournalsWere', {
            value1: chapters.reason,
          }),
        );
      const result = await recoverBackupImport(backupAdapters());
      if (!result.ok) persistenceReady = false;
      if (result.warning) packWarning = result.warning;
    } catch (e) {
      persistenceReady = false;
      packWarning = () => t('gameplay:storageRecovery', { value1: e.message });
    }
  }

  let loaded = { library: emptyLibrary(), warning: '', recovery: null, generation: 'legacy' };
  let storedStateAdopted = false;
  async function readSavedState() {
    const chapters = await checkedChapters();
    const read = () => {
      const content = contentFromChapters(chapters);
      const profile = loadLibrary(profileStorage(), libraryKey, {
        campaigns: content.executions.entries.map((entry) => entry.campaign),
      });
      return { content, profile };
    };
    return externalChapters ? externalChapters.withCurrent(chapters, read) : read();
  }
  try {
    const snapshot = await readSavedState();
    adoptContentCatalog(snapshot.content);
    loaded = snapshot.profile;
    storedStateAdopted = loaded.recovery === null;
  } catch (error) {
    persistenceReady = false;
    loaded.warning = t('gameplay:storedCollectionWasNotAdoptedThisSessionStartsWithBase', {
      value1: error.message,
    });
  }
  let libraryBaseline = loaded.library,
    libraryGeneration = loaded.generation || 'legacy';
  let library = loaded.library,
    progress = progressFor(library, campaign),
    recovery = loaded.recovery;
  const difficultyNavigation = createDifficultyNavigation();
  const selectionBookmark = createSelectionBookmark({
    storage: profileStorage(),
    key: `${libraryKey}.last-selection.v1`,
    canWrite: () =>
      !practiceSession &&
      !practice &&
      !scenario &&
      !courseSession &&
      !courseEntry &&
      persistenceReady &&
      storedStateAdopted &&
      writer.writable &&
      !backupBusy &&
      profileStorage().getItem(`${libraryKey}.backup-lock`) === null,
  });
  let returnStorage;
  try {
    returnStorage = profileSessionStorage();
  } catch {
    /* Team remains reachable without this hint. */
  }
  const modeReturn = createModeReturn({
    storage: returnStorage,
    baseURL: location.href,
    authority: { channel, version: buildVersion, sourceRevision: buildSourceRevision },
  });
  const modeReturnV2 = createModeReturnV2({
    storage: returnStorage,
    baseURL: location.href,
    authority: { channel, version: buildVersion, sourceRevision: buildSourceRevision },
  });
  const returnContext =
    !practiceSession &&
    !courseSession &&
    !packLaunchRequest &&
    !libraryHandoff &&
    storedStateAdopted
      ? new URLSearchParams(location.search).has('mode-return-v2')
        ? modeReturnV2.consume(location.search)
        : (() => {
            const selection = modeReturn.consume(location.search);
            return selection ? { selection, focus: 'team' } : null;
          })()
      : null;
  const returnedSelection = returnContext?.selection ?? null;
  const returnedMission = returnedSelection
    ? resolveSelectionBookmark(
        { ...returnedSelection, format: 'revealline-selection.v1' },
        {
          select: (key) => executionCatalog.select(key, library.preferences.campaignDifficulty),
          // A consumed, source-qualified return restores an exact selectable
          // mission in the unified library. Earned unlocks are not required and
          // no clear is invented; ordinary bookmark/Continue gates stay below.
          playable: () => true,
        },
      )
    : null;
  const exactReturn =
    returnedMission?.levelId === returnedSelection?.levelId &&
    returnedMission?.themeId === returnedSelection?.themeId &&
    !!returnedMission;
  const rememberedSelection = exactReturn
    ? returnedMission
    : !practiceSession &&
        !packLaunchRequest &&
        !libraryHandoff &&
        !packLaunchError &&
        storedStateAdopted
      ? resolveSelectionBookmark(selectionBookmark.read().selection, {
          select: (key) => executionCatalog.select(key, library.preferences.campaignDifficulty),
          playable: (entry, index) =>
            difficultyNavigation.playable(
              entry,
              library.campaigns,
              progressFor(library, entry.campaign),
              index,
            ),
        })
      : null;
  let difficultyDetailsFor = null;
  if (!practiceSession) {
    activeEntry = executionCatalog.select(
      campaignKey(baseEntry.campaign),
      library.preferences.campaignDifficulty,
    );
    if (rememberedSelection) activeEntry = rememberedSelection.entry;
    if (candidateHost)
      activeEntry = candidateHost.select(
        journeyCatalog.missions[0],
        journeyPreferences.snapshot().difficulty,
      );
    campaign = activeEntry.campaign;
    classRegistry = activeEntry.classRecipes;
    themesFile.themes = activeEntry.themes;
    progress = progressFor(library, campaign);
  }
  if (loaded.warning || packWarning) {
    localizedText($('save-warning'), () =>
      [loaded.warning, packWarning].map(renderMessage).filter(Boolean).join(' '),
    );
    show('save-warning', true);
  }
  const initialSelection = candidateHost
    ? { levelIndex: 0, overview: false }
    : difficultyNavigation.selection(activeEntry, library.campaigns, progress, {
        levelId: rememberedSelection?.levelId,
      });
  // Restored attempts already acquired their signal in the original session.
  // Keep this presentation identity separate from Pause and first-frame timing.
  const restoredSignalRuns = new WeakSet();
  let levelIndex = initialSelection.levelIndex,
    campaignOverview = !scenario && initialSelection.overview,
    theme = themesFile.themes[0],
    classId = 'scout',
    turnPolicy = 'immediate',
    seed = 1,
    bodyId = theme.player,
    run,
    runId,
    started = false,
    paused = true,
    demo = false,
    practice = practiceSession,
    accumulator = 0,
    handled = false,
    pendingAction = false,
    pendingPickup = false,
    pendingSwitch = null,
    saveSucceeded = true,
    recorder = null,
    recordingStopped = false,
    captionUntil = 0,
    runMessageCue = null,
    bodyWarning = '',
    lastReplay = null,
    lastReplayPresentation = null,
    replayFeedback = null,
    replayFocusClearance = null,
    missionReplacementFocusClearance = null,
    replayDownload = null,
    completionWarning = '',
    appearanceRewardIds = [],
    journeyBestResult = null,
    journeyPerformanceActive = true,
    celebrationActive = false,
    defeatActive = false,
    defeatPaused = false,
    defeatRemaining = 0,
    sessionBusy = false,
    restoreController = null,
    themeOverride = !!rememberedSelection?.themeId,
    musicOverride = false,
    masteryDefinition = null,
    masteryObserver = null,
    masteryAward = null,
    courseObserver = null,
    courseUnavailable = null,
    courseView = null,
    coursePhase = 'ready',
    courseEntry = null,
    courseEntryMessage = '',
    courseEntryHold = false,
    modeDeparture = null,
    missionReplacement = null,
    restartRequest = null,
    resultAttempt = null,
    resultAttemptEpoch = 0,
    worldAttempt = null,
    worldPlayEpoch = 0,
    modeDepartureHold = false,
    titleFlightHold = false,
    lastOwnedAttempt = null,
    contentSwitchBusy = false,
    backupBusy = false,
    flightDetails = null;
  const worldPlayIntents = new WeakMap();
  const journeyReactions = attachJourneyReactions();
  const flightInformation = attachFlightInformation({
    element: $('run-message'),
    getState: () => ({ started, paused }),
    writeWarning(message, cue) {
      runMessageCue = cue;
      $('run-message').dataset.cue = cue || '';
      const fullText = localizedText($('run-message'), message);
      captionUntil = (run?.time || 0) + 5;
      return { fullText, cue, expiresAt: captionUntil };
    },
  });
  const packLaunchGuard = createPackLaunchGuard();
  let demoHost = null;
  const demoLibrary = createDemoLibrary();
  const courseVisit = Object.create(null);
  const masteryAwards = createMasteryAwards({
    getGeneration: () => libraryGeneration,
    commit: (record) => {
      library = withMasteryRecords(library, [record]);
      return persistProfile().ok;
    },
    onStatus: (status) => {
      if (['earned', 'session'].includes(status.status)) libraryPanel.refreshMasteries();
      if (status.runId !== runId) return;
      masteryAward = status;
      refreshMastery();
      if (['earned', 'session', 'unavailable'].includes(status.status))
        localizedText($('mastery-announcement'), () => status.message);
    },
  });
  theme =
    themesFile.themes.find(
      (t) => t.id === (rememberedSelection?.themeId || library.preferences.themeId),
    ) || theme;
  classId = classRegistry.some((c) => c.id === library.preferences.classId)
    ? library.preferences.classId
    : classRegistry[0].id;
  turnPolicy = library.preferences.turnPolicy;
  bodyId = library.preferences.bodyId;
  if (candidateHost) {
    classId = 'scout';
    bodyId = theme.player;
  }
  if (courseRequest && !courseRequest.turnPolicy)
    scenario = createLessonScenario(courseRequest.lessonId, {
      turnPolicy: library.preferences.turnPolicy,
      theme: courseTheme,
    });
  if (scenario) {
    theme = scenario.theme;
    classId = scenario.settings.classId;
    turnPolicy = scenario.settings.turnPolicy;
    seed = scenario.settings.seed;
    bodyId = theme.player;
  }
  const audioMaster = createAudioMaster();
  const audioPreferences = createAudioPreferences({
    audioMaster,
    window,
    getStorage: () => profileStorage(),
    fallback: {
      muted: !library.preferences.musicEnabled,
      volume: library.preferences.masterVolume,
    },
    writable: () =>
      !practice && !courseSession && !courseEntry && persistenceReady && writer.writable,
    onWarning: (message) => {
      if (message) warning(message);
    },
  });
  const displayPreferences = createDisplayPreferences({
    window,
    matchMedia,
    getStorage: () => profileStorage(),
    legacyPreferences: library.preferences,
    writable: () =>
      !practice && !courseSession && !courseEntry && persistenceReady && writer.writable,
    onWarning: (message, key) => {
      localizedText($('display-preferences-status'), () => (key ? t(key) : message));
    },
  });
  const encounterDisplay = attachEncounterDisplayControls({
    document,
    window,
    getStorage: () => localStorage,
    writable: () =>
      !practice && !courseSession && !courseEntry && persistenceReady && writer.writable,
  });
  const stopDisplayView = displayPreferences.subscribe(applyDisplayPreferences);
  const actorPreferences = createActorStylePreferences({
    window,
    getStorage: () => profileStorage(),
    writable: () =>
      !practice && !courseSession && !courseEntry && persistenceReady && writer.writable,
    onWarning: (message) => {
      localizedText(
        $('menu-actor-note'),
        () => message || t('interface:appliesToNewMissionsAndNextRetryAndContinueKeep'),
      );
    },
  });
  let actorChangesReady = false;
  const stopActorView = actorPreferences.subscribe(({ actorStyle, revision }) => {
    $('menu-actor-style').value = runtimeContent ? 'campaign' : actorStyle;
    if (actorChangesReady && revision > 0) {
      if (titleFlight?.actorsFresh) cancelTitleFlight();
      cancelWorldAttempt();
      if (resultAttempt?.kind !== 'retry') cancelResultAttempt();
      cancelSkipForContentChange();
      if (!flightActorsReady && pictureResume !== null)
        cancelPictureStart({ preserveResult: true, preserveWorld: true });
    }
  });
  $('menu-actor-style').onchange = () => {
    actorPreferences.set({ actorStyle: $('menu-actor-style').value });
  };
  const displayRestoration = attachPreferenceRestoration({
    window,
    getSnapshot: () => displayPreferences.snapshot(),
    render: applyDisplayPreferences,
  });
  const menuStyle = attachMenuStyleControls({
    document,
    window,
    getStorage: () => profileStorage(),
    writable: () =>
      !practice && !courseSession && !courseEntry && persistenceReady && writer.writable,
  });
  const sound = new Soundscape({ persistentMusic: true, audioMaster });
  // The shared authority owns master attenuation; local music and effects keep their faders.
  sound.configure({ master: 1 });
  const compactCredit = attachMusicCredit({
    document,
    root: $('settings-panel-audio'),
    pauseButton: $('pause-button'),
    prefix: 'solo',
  });
  let musicPreviewState = null,
    musicPreviewRequest = 0;
  function renderMusicPreview() {
    $('overlay-next-song').disabled = !musicPreviewState?.queue?.length;
    if (!musicPreviewState) return;
    quickMusicControls?.render();
    const track = musicPreviewState.track;
    compactCredit.render(musicPreviewState, audioMaster.snapshot());
    const audible =
      musicPreviewState.playing &&
      !audioMaster.snapshot().muted &&
      audioMaster.snapshot().volume > 0 &&
      musicPreviewState.volume > 0;
    let source;
    try {
      source = new URL(track?.websites?.[0]?.url ?? track?.rights?.source);
    } catch {}
    for (const prefix of ['game-now-playing', 'shell-now-playing']) {
      const playing = $(prefix);
      playing.hidden = !audible || !track || track.kind === 'synth';
      localizedText($(`${prefix}-title`), () =>
        track ? `♫ ${track.title}${track.artist ? ` · ${track.artist}` : ''}` : '',
      );
      localizedAttribute(playing, 'title', () =>
        track?.fileName ? t('interface:soundtrack.originalFile', { file: track.fileName }) : '',
      );
      const website = $(`${prefix}-source`);
      website.hidden =
        !source ||
        !['https:', 'http:'].includes(source.protocol) ||
        !!source.username ||
        !!source.password;
      if (!website.hidden) website.href = source.href;
      else website.removeAttribute('href');
    }
    localizedText($('music-preview'), () =>
      ['blocked', 'error'].includes(musicPreviewState.status)
        ? t('interface:audioIsUnavailable')
        : musicPreviewState.playing
          ? audioMaster.snapshot().muted
            ? t('interface:playlistPlayingMasterSoundMuted')
            : t('interface:soundtrackPlaying')
          : t('interface:playSelectedPlaylist'),
    );
  }
  const renderMasterPreferences = ({ muted, volume }) => {
    $('master-volume').value = volume;
    $('sound-button').setAttribute(
      'aria-label',
      muted ? t('common:audio.unmute') : t('interface:muteSound'),
    );
    localizedText($('settings-master-mute'), () =>
      muted ? t('common:audio.unmute') : t('interface:muteSound'),
    );
    localizedText($('shell-sound'), () =>
      muted ? t('interface:soundOff') : t('interface:soundOn'),
    );
    $('shell-sound').setAttribute('aria-pressed', String(!muted));
    localizedText($('overlay-sound'), () =>
      muted ? t('interface:soundOff') : t('interface:soundOn'),
    );
    $('overlay-sound').setAttribute('aria-pressed', String(!muted));
    renderMusicPreview();
  };
  const stopMasterView = audioMaster.subscribe(renderMasterPreferences);
  const audioRestoration = attachPreferenceRestoration({
    window,
    getSnapshot: () => audioMaster.snapshot(),
    render: renderMasterPreferences,
  });
  let neutralResumeTick = false;
  let gameShell = null,
    missionPicker = null,
    enemyGuide = null,
    optionalWorlds = null;
  const demoAudioListeners = new Set();
  let demoAudioOperation = 0,
    demoAudioController = null;
  const notifyDemoAudio = () => {
    for (const listener of demoAudioListeners) listener();
  };
  let guideMusicWasPlaying = false;
  let soundtrackPlayer = null,
    quickMusicControls = null,
    soundtrackPanel = null,
    soundtrackStore = null;
  let soundtrackAssets = new Map(),
    soundtrackSuspended = false,
    soundtrackLibrary = null,
    soundtrackMenuGesture = false,
    soundtrackLastScene = null,
    soundtrackScene = 'menu';
  let authoredMusic = null,
    soundtrackGeneration = -1,
    soundtrackDisposed = false;
  const soundtrackLoad = new AbortController();
  // This edition explicitly adopts v4. All media adapters share its single ledger;
  // training keeps its existing legacy presentation and never creates picture pins.
  getPictureManager();
  const pictureStore = practice ? null : createStillMediaStore({ managedStore: pictureManager });
  const storyStore = practice ? null : createStoryMediaStore({ managedStore: pictureManager });
  const sessionPictures = createSessionReleasePictures();
  const protectSessionOriginals = (event) => {
    if (!sessionPictures.status().originals) return;
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', protectSessionOriginals);
  let flightVisualLease = null,
    freshVisualAttempt = false,
    pictureVisualController = null;
  let flightActorLease = null,
    flightActorsReady = false,
    actorJourneyIdentity = null,
    actorMissionIndex = null;
  const actorCustomPacks = new WeakSet();
  let flightPictures = null,
    picturePrewarm = null,
    pictureResume = null,
    pictureThemePending = null,
    pictureGeneration = 0;
  const picturePreparingMessage = localizedMessage(
    'interface:preparingTheChosenPictureFlightStaysPausedUntilItIs',
  );
  const savedFlightRestoredMessage = localizedMessage(
    'interface:savedFlightVerifiedAndRestoredPressResumeToContinue',
  );
  const preparationFeedback = createOperationStatus($('flight-preparation-status'));
  const themeFeedback = createOperationStatus($('theme-preparation-status'));
  let preparationOperation = null;
  function preparationButtonBusy(button, busy) {
    if (!button) return;
    // Keep the originating command focusable so keyboard/controller users never
    // fall onto a temporary Cancel control while its asynchronous work runs.
    button.disabled = false;
    if (busy) {
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('aria-busy', 'true');
      button.dataset.busy = 'true';
    } else {
      button.removeAttribute('aria-disabled');
      button.removeAttribute('aria-busy');
      delete button.dataset.busy;
    }
  }
  function clearPreparation() {
    preparationOperation = null;
    preparationFeedback.clear();
    $('flight-preparation-cancel').hidden = true;
  }
  function beginPreparation(message, cancel, stage = 'preparing', result = false) {
    const operation = { status: preparationFeedback.begin({ message, stage }), cancel, result };
    preparationOperation = operation;
    // Cancellation belongs to Back/Escape and navigation invalidation. Keep the
    // legacy hook non-visual for programmatic routing without adding a command.
    $('flight-preparation-cancel').hidden = true;
    return {
      update(status) {
        if (preparationOperation !== operation || status.status !== 'preparing') return;
        operation.status.update({
          message: () => flightPictureStatus(status),
          stage: status.stage,
          progress: status.progress ?? null,
        });
      },
      finish(message = '', state = 'ready') {
        if (preparationOperation !== operation) return;
        operation.status.finish({ message, state });
        preparationOperation = null;
        $('flight-preparation-cancel').hidden = true;
      },
    };
  }
  $('flight-preparation-cancel').onclick = () => {
    const operation = preparationOperation;
    if (!operation) return;
    const restoreFocus = document.activeElement === $('flight-preparation-cancel');
    if (operation.result) {
      operation.cancel({ restoreFocus });
      return;
    }
    operation.cancel();
    clearPreparation();
    preparationFeedback.begin({ message: '' }).finish({
      state: 'cancelled',
      message: t('interface:preparationCancelledYourFlightRemainsPaused'),
    });
    if (restoreFocus) $('start-button').focus({ preventScroll: true });
  };
  const storyDialog = createStoryDialog({
    audioMaster,
    readMedia: pictureMedia,
    settings: () => ({
      volume: library.cinematicVolume ?? DEFAULT_CINEMATIC_VOLUME,
      masterVolume: audioMaster.snapshot().volume,
      muted: audioMaster.snapshot().muted,
      reducedMotion: displayPreferences.snapshot().effectiveReducedEffects,
    }),
    saveVolume(volume) {
      if (practice || courseEntry)
        throw new Error(t('interface:trainingDoesNotChangeCinematicPreferences'));
      library = withCinematicVolume(library, volume);
      const saved = persistProfile();
      if (!saved.ok) throw new Error(saved.warning);
    },
    musicDucker: {
      acquire(factor) {
        return soundtrackPlayer?.acquireGain({ factor }).release ?? (() => {});
      },
    },
    neutralize: () => clearInput(),
  });
  const victoryStoryButton = document.createElement('button');
  victoryStoryButton.id = 'view-victory-story';
  localizedText(victoryStoryButton, () => t('interface:victoryStory'));
  victoryStoryButton.hidden = true;
  document.querySelector('.overlay-actions').append(victoryStoryButton);
  victoryStoryButton.onclick = () => {
    if (practice || run.status !== 'won' || completionWarning) return;
    cancelResultAttempt();
    const notify = flightInformation.captureWarning('host.story', { allowTerminal: true });
    try {
      const pins = validateFlightPresentationPinsForRun(flightPictures.pins(), {
        identityCatalog: flightPictures.identityCatalog,
        campaignKey: campaignKey(campaign),
        level: pictureLevelForRun(run, activeEntry),
        themeId: theme.id,
      });
      const pin = storyPinForTheme(pins, theme.id),
        backdrop = flightPictures.current();
      if (!pin || !backdrop || canonicalJSON(pin.picturePin) !== canonicalJSON(backdrop.pin))
        throw new Error(t('interface:thisAttemptSExactStoryPosterIsUnavailable'));
      const size = boardPaintSizeForLevel(run.level),
        args = { theme, level: run.level, seed, image: backdrop.image, fit: backdrop.fit, ...size };
      void storyDialog
        .open({
          pin,
          title: run.level.name,
          drawPoster(canvas) {
            canvas.width = size.width;
            canvas.height = size.height;
            new BoardPainter(presets).drawGallery(canvas.getContext('2d'), args);
          },
        })
        .catch((error) => notify(error.message));
    } catch (error) {
      notify(error.message);
    }
  };
  const legacyPictureButton = document.createElement('button');
  legacyPictureButton.id = 'picture-use-legacy';
  localizedText(legacyPictureButton, () => t('interface:useOriginalPackArtwork'));
  legacyPictureButton.hidden = true;
  document.querySelector('.overlay-actions').append(legacyPictureButton);
  let pictureRecovery = null;
  const pictureRecoveryButtons = [
    ['picture-export-data', t('interface:exportGameData'), () => libraryPanel.open('saves')],
    ['picture-reload', t('interface:reloadSavedProfile'), () => window.location.reload()],
  ].map(([id, label, action]) => {
    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.className = 'button secondary';
    localizedText(button, () => label);
    button.hidden = true;
    button.onclick = action;
    document.querySelector('.overlay-actions').append(button);
    return button;
  });
  function clearPictureRecovery() {
    pictureRecovery = null;
    for (const button of pictureRecoveryButtons) button.hidden = true;
  }
  async function pictureMedia({ signal } = {}) {
    if (!pictureStore) throw new Error(t('interface:practiceUsesItsOriginalArtwork'));
    return {
      store: pictureStore,
      storyStore,
      ...(await pictureStore.readPresentationMetadata({ signal })),
    };
  }
  function pictureIdentity(metadata) {
    return createPictureIdentityCatalog({ entries: installedEntries, metadata });
  }
  function pictureExecutionForEntry(entry) {
    if (!entry.classicRulesSourceCampaignKey) return entry;
    const original = entry.classicRulesPresentationCampaign;
    if (!original || campaignKey(original) !== entry.classicRulesSourceCampaignKey)
      throw new Error(t('interface:currentRulesPictureOwnershipDiffersFromItsInstalledOriginal'));
    const pictureEntry = createExecutionCatalog([{ campaign: original }]).select(
      entry.classicRulesSourceCampaignKey,
      entry.difficulty,
    );
    if (!pictureEntry)
      throw new Error(
        t('interface:currentRulesPictureDifficultyIsUnavailableInItsOriginalChapter'),
      );
    return pictureEntry;
  }
  function pictureLevelForRun(nextRun, entry, pictureEntry = pictureExecutionForEntry(entry)) {
    if (!entry.classicRulesSourceCampaignKey && !recoverGameplayTuning(nextRun.level))
      return nextRun.level;
    // Difficulty changes simulation, not the ownership of an original picture.
    const levels = pictureEntry.campaign.levels;
    const level = levels.find((item) => item.id === nextRun.levelId);
    if (!level) throw new Error(t('interface:pictureMissionIsUnavailableInItsInstalledOriginal'));
    return level;
  }
  function newFlightPictures({
    nextRun = run,
    nextRunId = runId,
    entry = activeEntry,
    nextThemeId = theme.id,
    pins,
    legacy = practice || entry.activity === 'challenge',
    explicitLegacy = false,
    candidatePicture = null,
  } = {}) {
    const pictureEntry = pictureExecutionForEntry(entry),
      pictureLevel = pictureLevelForRun(nextRun, entry, pictureEntry);
    const guarded = (owner) =>
      runtimeContent && candidateHost?.owns(entry)
        ? owner
        : withOfflinePictureGate(owner, async ({ signal }) => {
            if (candidateHost?.owns(entry)) {
              await gameplayDownloads.ensureMission(
                { routeId: authoredRoute.id, missionId: nextRun.levelId, mode: 'solo' },
                { signal, retain: true },
              );
              return;
            }
            const source =
              entry.classicRulesPresentationCampaign || entry.baseCampaign || entry.campaign;
            if (!entry.sourcePackId && campaignKey(source) === campaignKey(baseEntry.campaign))
              await gameplayDownloads.ensureClassic(null, { signal, retain: true });
            else if (
              entry.sourcePackId &&
              isOfficialPack(packs.packs.find((pack) => pack.id === entry.sourcePackId))
            )
              await gameplayDownloads.ensureClassic(entry.sourcePackId, { signal, retain: true });
          });
    if (candidateHost?.owns(entry)) {
      const manifest = entry.manifests.find((item) => item.level.id === nextRun.levelId);
      if (runtimeContent && manifest.background === null) {
        return createFlightPictures({
          context: {
            runId: nextRunId,
            executionKey: campaignKey(entry.campaign),
            levelId: nextRun.levelId,
            levelRevision: pictureLevel.revision,
            themeId: manifest.presentation.themeId,
          },
          level: pictureLevel,
          themeIds: entry.themes.map((item) => item.id),
          legacy: true,
        });
      }
      return guarded(
        createCandidateFlightPictures({
          context: {
            runId: nextRunId,
            executionKey: campaignKey(entry.campaign),
            levelId: nextRun.levelId,
            levelRevision: pictureLevel.revision,
            themeId: manifest.presentation.themeId,
          },
          asset: manifest.background,
          picture: candidatePicture,
        }),
      );
    }
    const authoredBackground =
      entry.levelVisuals?.find((item) => item.levelId === nextRun.level.id)?.visualOverrides
        ?.background ??
      entry.visualOverrides?.background ??
      null;
    return guarded(
      createFlightPictures({
        ...(authoredBackground
          ? {
              acquireLegacy: (_choice, options) =>
                acquireAuthoredPicture(authoredBackground, options),
            }
          : {}),
        context: {
          runId: nextRunId,
          executionKey: pictureEntry.executionKey || campaignKey(pictureEntry.campaign),
          levelId: nextRun.levelId,
          levelRevision: pictureLevel.revision,
          themeId: nextThemeId,
        },
        level: pictureLevel,
        themeIds: entry.themes.map((item) => item.id),
        identityCatalog: legacy ? null : pictureIdentity(),
        readMedia: pictureMedia,
        acquire: (request, options) =>
          sessionPictures.has(request.pin)
            ? sessionPictures.acquire(request.pin, options)
            : acquirePresentationImage(request, options),
        pins,
        legacy,
        explicitLegacy,
        prepareSelection: !legacy
          ? (options) =>
              releasePictures.prepareSelection({
                ...options,
                authoredBackground:
                  entry.levelVisuals?.find((row) => row.levelId === nextRun.level.id)
                    ?.visualOverrides?.background ??
                  entry.visualOverrides?.background ??
                  null,
              })
          : undefined,
        selectPins:
          !legacy && chapterSnapshot?.index?.chapters.some((d) => d.id === entry.sourcePackId)
            ? async ({ media, selection, explicitLegacy, signal }) => {
                const checked = await checkedChapters({ signal });
                const original = await externalChapters.authoredPicture(
                  checked,
                  {
                    executionKey: selection.executionKey,
                    levelId: selection.levelId,
                    levelRevision: selection.levelRevision,
                    themeId: nextThemeId,
                  },
                  { signal },
                );
                if (original.metadata.generation !== media.metadata.generation)
                  throw new Error(
                    t('interface:pictureChoicesChangedDuringChapterReadinessRetryThePausedFlight'),
                  );
                const current = createPresentationPins(selection);
                const fallback =
                  explicitLegacy || current.choices.some((choice) => choice.kind === 'legacy');
                const library = fallback
                  ? validateMediaLibrary(
                      {
                        ...media.metadata.document.library,
                        assignments: [
                          ...media.metadata.document.library.assignments.filter(
                            (assignment) =>
                              canonicalJSON(assignment.identity) !==
                              canonicalJSON(original.pin.identity),
                          ),
                          {
                            identity: original.pin.identity,
                            presentationId: original.pin.presentationId,
                            revision: original.pin.presentationRevision,
                          },
                        ],
                      },
                      { identityCatalog: selection.identityCatalog },
                    )
                  : selection.library;
                return createFlightPresentationPins(
                  {
                    ...selection,
                    library,
                    stillDocument: media.metadata.document,
                    storyDocument: media.story.document,
                  },
                  { signal },
                );
              }
            : undefined,
      }),
    );
  }
  function cancelPictureStart({
    retirePrewarm = false,
    preserveRecovery = false,
    preserveResult = false,
    preserveWorld = false,
  } = {}) {
    if (!preserveWorld) {
      // A newer navigation intent also retires an activation still downloading.
      ++worldPlayEpoch;
      cancelWorldAttempt();
    }
    if (!preserveResult) {
      cancelResultAttempt();
      journeyLaunch?.cancel?.();
    }
    // Opening a secondary dialog must not dismiss a settled recovery path.
    // A retry, new context or page retirement still cancels it unconditionally.
    const keepRecovery =
      preserveRecovery &&
      !retirePrewarm &&
      !preparationOperation &&
      !pictureThemePending &&
      pictureRecovery?.owner === flightPictures &&
      pictureRecovery?.run === run &&
      pictureRecovery?.themeId === theme.id;
    if (!keepRecovery) {
      clearPreparation();
      clearPictureRecovery();
      themeFeedback.clear();
    }
    $('theme-preparation-cancel').hidden = true;
    pictureGeneration++;
    if (pictureResume !== null || retirePrewarm) {
      flightPictures?.cancel();
      picturePrewarm = null;
    } else if (picturePrewarm) picturePrewarm.observe = null;
    pictureThemePending?.controller.abort();
    pictureVisualController?.abort();
    pictureVisualController = null;
    pictureResume = null;
    pictureThemePending = null;
  }
  function pictureFailure(error, notify) {
    if (error?.name === 'AbortError') return;
    const needsWriter = error instanceof ReleasePictureWriteRequiredError;
    pictureRecovery = needsWriter ? { owner: flightPictures, run, themeId: theme.id } : null;
    const message = () => flightPictureFailure(error, { paused: true });
    notify(message);
    // An unjoined prewarm has no launch lease to publish its terminal feedback.
    // Keep other preparation owners in charge of their existing presenter.
    if (pictureResume === null && !preparationOperation && !pictureThemePending)
      preparationFeedback.begin({ message }).finish({ message, state: 'error' });
    for (const button of pictureRecoveryButtons) button.hidden = !needsWriter;
    legacyPictureButton.hidden = !!candidateHost || needsWriter || started || practice;
    if (!started)
      localizedText($('start-button'), () =>
        needsWriter ? t('interface:checkPicture') : t('interface:retryPicture'),
      );
  }
  function warmPicture() {
    // New packages are transferred only after the player reviews their size.
    // Explicit Start below performs that check before acquiring any original.
    if (offlineAvailability().packageConsent) return;
    const owner = flightPictures;
    if (!owner || owner.ready(theme.id)) return;
    const notify = flightInformation.captureWarning('host.picture');
    const prewarm = { owner, themeId: theme.id, observe: null, latest: null, promise: null };
    picturePrewarm = prewarm;
    prewarm.promise = owner.ensure(theme.id, {
      onStatus(status) {
        if (picturePrewarm !== prewarm || owner !== flightPictures) return;
        prewarm.latest = status;
        prewarm.observe?.(status);
      },
    });
    void prewarm.promise
      .then(() => {
        if (picturePrewarm === prewarm && owner === flightPictures) refreshHUD();
      })
      .catch((error) => {
        if (picturePrewarm !== prewarm || owner !== flightPictures) return;
        picturePrewarm = null;
        pictureFailure(error, notify);
      });
  }
  legacyPictureButton.onclick = () => {
    if (started || practice || !flightPictures) return;
    cancelPictureStart();
    flightPictures.dispose();
    flightPictures = newFlightPictures({ explicitLegacy: true });
    legacyPictureButton.hidden = true;
    resume();
  };
  function soundtrackContext() {
    const edition = activeEntry.baseCampaignKey || campaignKey(campaign);
    const level = scenario?.level || (activeEntry.baseCampaign || campaign).levels[levelIndex];
    if (
      $('shell-home').open ||
      ($('shell-missions').open && $('shell-missions').dataset.view !== 'brief')
    )
      soundtrackScene = 'menu';
    else if (started && !paused) soundtrackScene = 'gameplay';
    return {
      scene: soundtrackScene,
      themeId: theme.id,
      campaignKey: edition,
      mapKey: JSON.stringify([edition, level.id, level.revision, theme.id]),
    };
  }
  function assignMusic(track, { atBoundary = true } = {}) {
    authoredMusic = track || null;
    if (soundtrackPlayer) soundtrackPlayer.setAuthoredTrack(authoredMusic);
    else if (track) sound.setTrack(track, { atBoundary });
  }
  function configureAudio(settings) {
    const { master: _master, ...local } = settings;
    if (!soundtrackPlayer) return sound.configure({ ...local, master: 1 });
    const { style: _style, music, ...mix } = local;
    sound.configure(mix);
    if (music !== undefined) soundtrackPlayer.setVolume(music);
  }
  async function activateAudio({ explicit = false } = {}) {
    if (!soundtrackPlayer) return sound.enable();
    if (soundtrackSuspended) {
      soundtrackSuspended = false;
      // Keep this synchronous with the tap/click that resumed the game. Safari
      // rejects a media play request if a lifecycle resume has crossed an await.
      const wasListening = soundtrackPlayer.snapshot().desired;
      const resumed = soundtrackPlayer.resume();
      if (wasListening) return resumed;
    }
    if (explicit || !soundtrackPlayer.snapshot().track) return soundtrackPlayer.play();
    // Ordinary Resume enables effects but keeps an intentional music-only Pause.
    return sound.enable();
  }
  function setMasterMuted(muted) {
    audioPreferences.setMuted(muted);
    // Only explicit player actions mirror the legacy preference. Playback promises never do.
    const saved = preferences({ musicEnabled: !audioMaster.snapshot().muted });
    const warning = audioPreferences.getWarning() || saved.warning || '';
    return { ok: !warning, warning };
  }
  function setMasterVolume(volume) {
    audioPreferences.setVolume(volume);
    const saved = preferences({ masterVolume: audioMaster.snapshot().volume });
    const warning = audioPreferences.getWarning() || saved.warning || '';
    return { ok: !warning, warning };
  }
  function suspendAudio() {
    soundtrackSuspended = true;
    if (soundtrackPlayer) soundtrackPlayer.suspend();
    else sound.suspend();
  }
  const soundtrackFeedback = createOperationStatus($('soundtrack-summary'));
  let soundtrackLoading = true,
    soundtrackOperation = soundtrackFeedback.begin({
      message: t('interface:loadingMusicLibrary'),
      stage: 'reading',
    });
  function soundtrackStatus(message, preparation = null) {
    if (preparation) {
      if (!soundtrackOperation) soundtrackOperation = soundtrackFeedback.begin(preparation);
      else soundtrackOperation.update(preparation);
    } else {
      (soundtrackOperation ?? soundtrackFeedback.begin({ message })).finish({ message });
      soundtrackOperation = null;
    }
  }
  async function initializeSoundtrack() {
    soundtrackLoading = false;
    soundtrackStatus('Campaign music ready.');
    return; // Dedicated editions use their authored procedural soundtrack.

    try {
      const catalogue = SOUNDTRACK_CATALOGUE;
      if (soundtrackDisposed) return;
      const source = createSoundtrackSource({
        catalogue,
        archives: SOUNDTRACK_ARCHIVES,
        bundled: SOUNDTRACK_BUNDLED_ASSETS,
        readLocal: (hash) => soundtrackAssets.get(hash),
        installedOnly: () => soundtrackLibrary?.listening?.installedOnly ?? false,
      });
      const audioElement = document.createElement('audio');
      if (typeof audioElement.play !== 'function')
        throw new Error(t('interface:thisBrowserDoesNotProvideFileAudioPlaybackBuiltIn'));
      soundtrackStore = createSoundtrackStore({ managedStore: pictureManager });
      soundtrackPlayer = createSoundtrackPlayer({
        localPlayback: installedPresentation(),
        localRecordingIds: await localOfficialRecordingIds(catalogue),
        catalogue,
        bundledTrackIds: SOUNDTRACK_BUNDLED_ASSETS.map(({ id }) => id),
        audioMaster,
        soundscape: sound,
        audioElement,
        readAsset: source.readAsset,
        onChange: (state) => {
          soundtrackPanel?.update(state);
          quickMusicControls?.render();
          notifyDemoAudio();
          musicPreviewState = state;
          renderMusicPreview();
          if (soundtrackLoading) return;
          const playbackMessage = state.error || state.notice;
          soundtrackStatus(
            playbackMessage
              ? () => soundtrackErrorText(playbackMessage)
              : state.preparation?.message ||
                  (state.track
                    ? `${state.track.title} · ${state.status}`
                    : t('interface:chooseAPlaylistOrImportMp3Songs')),
            state.preparation,
          );
        },
      });
      quickMusicControls = attachQuickMusicControls({
        document,
        prefix: 'solo',
        // The landing owns passive song metadata; transport lives in Audio.
        settingsRoot: $('settings-panel-audio'),
        snapshot: () => soundtrackPlayer?.snapshot(),
        getMaster: () => audioMaster.snapshot(),
        active: () =>
          !soundtrackDisposed && !enemyGuide?.practiceActive && !soundtrackPanel?.isOpen(),
        conflicts: (event) =>
          !!actionForKey(resolveKeyBindings(library.preferences.keyboardBindings), event),
        play: () => {
          cancelDemoAudio();
          soundtrackMenuGesture = true;
          const waking = soundtrackPlayer.wake();
          const playing = activateAudio({ explicit: true });
          return Promise.all([waking, playing]).then(([, result]) => result);
        },
        pause: () => {
          cancelDemoAudio();
          soundtrackMenuGesture = true;
          soundtrackPlayer.pause();
        },
        previous: () => {
          soundtrackMenuGesture = true;
          return soundtrackPlayer.previous();
        },
        next: () => {
          cancelDemoAudio();
          soundtrackMenuGesture = true;
          return soundtrackPlayer.next();
        },
        onError: (error) => soundtrackStatus(() => soundtrackErrorText(error)),
      });
      renderMusicPreview();
      soundtrackPlayer.setAuthoredTrack(authoredMusic);
      soundtrackPlayer.setContext(soundtrackContext());
      publishedAudio.setPlayer(soundtrackPlayer);
      if (soundtrackSuspended) soundtrackPlayer.suspend();
      soundtrackPanel = attachSoundtrackPanel({
        audioMaster,
        onMasterMuted: setMasterMuted,
        onMasterVolume: setMasterVolume,
        document,
        store: soundtrackStore,
        player: soundtrackPlayer,
        catalogue,
        availableStyles: availableCommunitySoundtrackStyles(
          runtimeContent?.selection.brand.id ?? null,
        ),
        bundled: SOUNDTRACK_BUNDLED_ASSETS,
        readAsset: source.readAsset,
        getContext: soundtrackContext,
        onLibrary: (_library, snapshot) => {
          if (soundtrackDisposed || snapshot.generation < soundtrackGeneration) return;
          soundtrackGeneration = snapshot.generation;
          soundtrackLibrary = _library;
          soundtrackAssets = new Map(snapshot.assets.map(({ sha256, blob }) => [sha256, blob]));
        },
        onError: (error) => soundtrackStatus(() => soundtrackErrorText(error)),
        onOpen: () => {
          pause(true);
          clearInput();
          $('settings-dialog').close();
        },
        onClose: () => {
          clearInput();
          $('settings-dialog').showModal();
          void storageRetention.refresh();
          $('soundtrack-open').focus();
        },
        onVolume: (value) => {
          $('music-volume').value = value;
          preferences({ musicVolume: value });
        },
        onPlayback: () => {
          soundtrackMenuGesture = true;
        },
        beforeAudio: () => {
          if (soundtrackSuspended) {
            soundtrackSuspended = false;
            return soundtrackPlayer.wake();
          }
        },
        settingsRoot: $('settings-panel-audio'),
      });
      // The studio owns persisted playlist selection. Keep the legacy genre selector
      // only for browsers that cannot attach the file-audio transport.
      $('music-select').closest('label').hidden = true;
      localizedText($('music-preview'), () => t('interface:playSelectedPlaylist'));
      $('soundtrack-open').disabled = false;
      $('soundtrack-open').onclick = () => soundtrackPanel.open();
      try {
        const snapshot = await soundtrackStore.read({ signal: soundtrackLoad.signal });
        soundtrackLoading = false;
        if (!soundtrackDisposed && snapshot.generation >= soundtrackGeneration) {
          soundtrackGeneration = snapshot.generation;
          soundtrackAssets = new Map(snapshot.assets.map(({ sha256, blob }) => [sha256, blob]));
          soundtrackLibrary = setCatalogueTracks(
            upgradeSoundtrackLibrary(snapshot.library),
            catalogue.tracks,
          );
          soundtrackPlayer.setLibrary(soundtrackLibrary, { publicStyles: snapshot.publicStyles });
          if (
            usesOpeningThemeDefault(soundtrackLibrary, {
              fresh: snapshot.generation === 0,
            })
          ) {
            // The exact core recording is allowed to load without blocking the
            // menu. Playback still waits for the first eligible browser gesture.
            void prepareOpeningTheme(soundtrackPlayer, soundtrackLibrary, { fresh: true });
          } else {
            // This does not play audio. It only makes a selected local MP3 ready
            // before the player taps Start or Play, which iOS requires.
            void soundtrackPlayer.prepare({ allowNetwork: false });
          }
        } else if (!soundtrackDisposed) {
          const state = soundtrackPlayer.snapshot();
          soundtrackStatus(
            state.preparation?.message ||
              (state.error
                ? () => soundtrackErrorText(state.error)
                : t('interface:musicLibraryReady')),
            state.preparation,
          );
        }
      } catch (error) {
        soundtrackLoading = false;
        if (!soundtrackDisposed)
          soundtrackStatus(() =>
            t('gameplay:customMusicStorageBuiltInPlaybackIsAvailableTheStudio', {
              value1: soundtrackErrorText(error),
            }),
          );
      }
    } catch (error) {
      soundtrackLoading = false;
      quickMusicControls?.dispose();
      quickMusicControls = null;
      soundtrackPanel?.dispose();
      soundtrackPlayer?.dispose();
      soundtrackStore?.close();
      soundtrackPlayer = null;
      publishedAudio.setPlayer(null);
      soundtrackPanel = null;
      sound.resumeMusic();
      $('soundtrack-open').disabled = true;
      $('music-select').closest('label').hidden = false;
      if (!soundtrackDisposed) soundtrackStatus(() => soundtrackErrorText(error));
    }
  }
  function cosmeticFeedback(id) {
    const presenter = createOperationStatus($(id));
    let operation = null;
    return {
      dispose: () => presenter.dispose(),
      update(status) {
        if (status.status === 'preparing') {
          if (!operation) operation = presenter.begin(status);
          else operation.update(status);
        } else {
          operation?.finish({
            message: status.status === 'error' ? status.message : '',
            state: status.status === 'error' ? 'error' : 'ready',
          });
          operation = null;
        }
      },
    };
  }
  const craftFeedback = cosmeticFeedback('craft-preparation-status');
  const presentationFeedback = cosmeticFeedback('presentation-preparation-status');
  let compiledPresentationWarning = '';
  function startRememberedMenuMusic(event) {
    if (
      !event.isTrusted ||
      soundtrackMenuGesture ||
      !soundtrackPlayer ||
      document.hidden ||
      audioMaster.snapshot().muted ||
      guideMusicWasPlaying ||
      soundtrackContext().scene !== 'menu'
    )
      return;
    if (
      demoHost?.active ||
      quickMusicControls?.contains(event.target) ||
      event.target?.closest?.(
        '#soundtrack-dialog, #sound-button, #music-preview, #soundtrack-open, #shell-music',
      )
    )
      return;
    if (
      event.type === 'keydown' &&
      !['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    )
      return;
    soundtrackMenuGesture = true;
    void activateAudio({ explicit: true }).then(
      (ok) => {
        if (!ok) soundtrackMenuGesture = false;
      },
      () => {
        soundtrackMenuGesture = false;
      },
    );
  }
  document.addEventListener('pointerdown', startRememberedMenuMusic);
  document.addEventListener('keydown', startRememberedMenuMusic);
  const painter = new BoardPainter(presets, {
    onAssetStatus: craftFeedback.update,
    onAsset: (message) => {
      const rig = visuals()?.player
        ? t('interface:customPlayerArtworkKeepsTheSelectedBodySRotorAnchors')
        : '';
      const copy = [message, rig, bodyWarning, compiledPresentationWarning]
        .filter(Boolean)
        .join(' ');
      localizedText($('asset-warning'), () => copy);
      show('asset-warning', !!copy);
    },
  });
  const titleCharacter = mountTitleCharacter({
    container: $('shell-home')?.querySelector('.home-content'),
    getCharacter: () => ({
      body: painter.body,
      recipe: painter.recipe,
      image: painter.image,
      bodyColor: painter.theme?.palette.player ?? '#80CAE8',
      accentColor: painter.theme?.palette.accent ?? '#FFFFFF',
    }),
  });
  // Published presentation is a separate cosmetic release. Loading it never
  // opens the local Asset Studio database or changes a flight's picture pins.
  let presentationHost = null,
    presentationSnapshot = null,
    pagePresentationSnapshot = null,
    presentationReady = Promise.resolve(null);
  try {
    if (!runtimeContent)
      presentationHost = createPresentationHost({
        skipTitleArtwork: true,
        baseURL: new URL('presentation/compiled/', gameDocumentURL(location.href)),
      });
    if (presentationHost)
      presentationReady = presentationHost
        .load({ onStatus: presentationFeedback.update })
        .then((snapshot) => {
          pagePresentationSnapshot = snapshot;
          if (!flightVisualLease) applyFlightPresentation();
          return snapshot;
        })
        .catch((error) => {
          if (error.name === 'AbortError') return null;
          compiledPresentationWarning = t(
            'interface:releaseArtworkIsUnavailableSourceArtworkIsShown',
          );
          painter.onAsset('');
          return null;
        });
  } catch {
    compiledPresentationWarning = t('interface:releaseArtworkIsUnavailableSourceArtworkIsShown');
  }
  const publishedAudio = attachPublishedAudio({
    sound,
    ready: presentationReady,
    getHost: () => flightVisualLease ?? presentationHost,
    allowMusic: () =>
      (theme.id === 'fpv' || theme.family === 'fpv') && !scenario?.music && !musicOverride,
  });
  function applyFlightPresentation() {
    const snapshot = flightVisualLease?.snapshot ?? pagePresentationSnapshot;
    if (snapshot) (flightVisualLease ?? presentationHost).apply(document.documentElement);
    presentationSnapshot = snapshot;
    painter.setPresentation(snapshot);
    menuStyle.setPresentation(snapshot);
    enemyGuide?.refreshPresentation();
    publishedAudio.setPresentation(snapshot);
    if (snapshot) {
      document.documentElement.dataset.presentationTheme = snapshot.resolved.theme.id;
      document.documentElement.dataset.presentationRevision = String(
        snapshot.resolved.theme.revision,
      );
      document.documentElement.dataset.presentationManifest = snapshot.manifestSha256;
    } else {
      delete document.documentElement.dataset.presentationRevision;
      delete document.documentElement.dataset.presentationManifest;
    }
  }
  function prepareFreshAttemptVisuals(entry, level, themeId, options) {
    if (practice || candidateHost?.owns(entry) || !freshSoloVisualSelection(entry, themeId))
      return Promise.resolve(null);
    return prepareFreshSoloVisualTheme(
      { entry, level, themeId, currentManifestSha256: pagePresentationSnapshot?.manifestSha256 },
      { baseURL: new URL('presentation/compiled/', gameDocumentURL(location.href)), ...options },
    );
  }
  async function actorContent(entry, level, themeId, { signal, retained = false } = {}) {
    if (practice || entry.activity === 'challenge') return null;
    if (candidateHost?.owns(entry)) {
      if (candidateHost.prepareVisualIdentity)
        return {
          scope: 'journey',
          content: await candidateHost.prepareVisualIdentity(
            {
              selection: entry,
              level,
              association: { editionId: authoredRoute.id, contentThemeId: themeId, mode: 'solo' },
            },
            { signal },
          ),
        };
      actorJourneyIdentity ??= createJourneyVisualThemeIdentityAdapter(authoredRoute.source, {
        mode: 'solo',
      });
      const adapter = await actorJourneyIdentity;
      return {
        scope: 'journey',
        content: await adapter.prepareHostSelection(
          {
            host: candidateHost,
            selection: entry,
            level,
            association: { editionId: authoredRoute.id, contentThemeId: themeId, mode: 'solo' },
          },
          { signal },
        ),
      };
    }
    let scope = null;
    if (!entry.sourcePackId && entry.baseCampaignKey === campaignKey(baseCampaign))
      scope = 'builtin';
    else if (entry.sourcePackId) {
      const installed = packs;
      const pack = installed.packs.find((item) => item.id === entry.sourcePackId);
      if (!pack) return null;
      if (actorCustomPacks.has(pack)) return null;
      actorMissionIndex ??= getJSON('content/mission-library-index.json').catch((error) => {
        actorMissionIndex = null;
        throw error;
      });
      let index;
      try {
        index = await actorMissionIndex;
      } catch (error) {
        if (retained || signal?.aborted) throw error;
        // This newly launched installed pack has not been accepted as an
        // official actor owner. Lack of authority must never grant FPV; keep
        // its already validated authored appearance available instead.
        localizedText($('menu-actor-note'), () =>
          t('interface:actorCompatibilityIsUnavailableThisInstalledPackKeepsItsAuthored'),
        );
        return null;
      }
      const row = index.missions.find(
        (item) =>
          item.packId === pack.id &&
          item.campaignKey === entry.baseCampaignKey &&
          item.levelId === level.id &&
          item.modes.includes('solo'),
      );
      if (!row || !(await verifyIndexedInstalledPack(pack, row))) return null;
      if (packs !== installed || signal?.aborted)
        throw new DOMException(t('interface:actorContentChangedDuringPreparation'), 'AbortError');
      scope = 'trusted-pack';
    }
    // Uploaded/modified packs retain authored rendering. A preference, matching
    // name or serialized pin cannot opt unknown content into this release.
    if (!scope) return null;
    return {
      scope,
      content: await prepareCampaignVisualThemeContext(
        {
          entry,
          level,
          association: { editionId: 'field-kit', contentThemeId: themeId, mode: 'solo' },
        },
        { signal },
      ),
    };
  }
  async function prepareAttemptActors(
    entry,
    level,
    themeId,
    { pin = undefined, style = actorPreferences.snapshot().actorStyle, ...options } = {},
  ) {
    if (pin === null) {
      if (runtimeContent && candidateHost?.owns(entry))
        throw new Error(t('interface:replay.missingCompanyArtworkReceipt'));
      return null;
    }
    if (runtimeContent && candidateHost?.owns(entry) && pin === undefined) style = 'campaign';
    const identity = await actorContent(entry, level, themeId, {
      ...options,
      retained: pin !== undefined,
    });
    if (!identity) {
      if (pin !== undefined)
        throw new Error(t('interface:thisContentHasNoAcceptedActorAppearanceOwner'));
      return null;
    }
    const acceptedIdentity =
      runtimeContent && candidateHost?.owns(entry)
        ? { ...identity, authoredPresentationSha256: runtimeContent.authoredPresentationSha256 }
        : identity;
    const dependencies = {
      baseURL: new URL('presentation/compiled/', gameDocumentURL(location.href)),
      currentManifestSha256: pagePresentationSnapshot?.manifestSha256 ?? null,
      ...options,
    };
    return pin === undefined
      ? prepareActorAppearanceLease({ ...acceptedIdentity, style }, dependencies)
      : prepareRetainedActorAppearanceLease({ ...acceptedIdentity, pin }, dependencies);
  }
  function adoptFlightActors(next, ready = true) {
    const prior = flightActorLease;
    flightActorLease = next;
    flightActorsReady = ready;
    if (prior !== next) prior?.release();
  }
  function adoptFlightVisualLease(next) {
    if (flightVisualLease === next) return true;
    const prior = flightVisualLease;
    flightVisualLease = next;
    try {
      applyFlightPresentation();
    } catch (error) {
      // The caller still owns `next` when presentation could not be committed.
      // Restore the prior owner before surfacing the adapter failure. A nested
      // adoption owns its own result and must not be overwritten here.
      if (flightVisualLease === next) {
        flightVisualLease = prior;
        applyFlightPresentation();
      } else {
        prior?.release();
      }
      throw error;
    }
    const current = flightVisualLease === next;
    prior?.release();
    return current;
  }
  const releasePictures = createReleasePictureDefaults({
    getHost: () => presentationHost,
    ready: () => presentationReady,
    executionCatalog: () => executionCatalog,
    readMedia: pictureMedia,
    sessionPictures,
    sessionOnly: () => !writer.writable,
    assertWritable() {
      if (!writer.writable) throw new ReleasePictureWriteRequiredError();
    },
    async commit(store, prepared, options) {
      if (!writer.writable) throw new ReleasePictureWriteRequiredError();
      const snapshot = await checkedChapters({ signal: options.signal });
      const write = () => {
        if (!writer.writable) throw new ReleasePictureWriteRequiredError();
        return store.commit(prepared, options);
      };
      return externalChapters
        ? externalChapters.withCurrent(snapshot, write, { signal: options.signal })
        : write();
    },
  });
  const missionThumbnails = createMissionPictureThumbnails({
    readMedia: pictureMedia,
    onUpdate: () => missionPicker?.sync(),
    render(picture, backdrop) {
      if (!backdrop && picture.visualOverrides?.background?.dataUrl)
        return picture.visualOverrides.background.dataUrl;
      const original = boardPaintSizeForLevel(picture.level),
        scale = Math.min(320 / original.width, 180 / original.height),
        canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(original.width * scale));
      canvas.height = Math.max(1, Math.round(original.height * scale));
      try {
        painter.drawGallery(canvas.getContext('2d'), {
          theme: picture.theme,
          level: picture.level,
          seed: picture.item.seed ?? 1,
          width: canvas.width,
          height: canvas.height,
          ...(backdrop ? { image: backdrop.image, fit: backdrop.fit } : {}),
        });
        return canvas.toDataURL('image/png');
      } finally {
        canvas.width = canvas.height = 0;
      }
    },
  });
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    painter.setPresentation(null);
    publishedAudio.close();
    presentationHost?.close();
  });
  applyDisplayPreferences(displayPreferences.snapshot());
  $('tap-steering').checked =
    library.preferences.tapSteering ?? matchMedia('(pointer: coarse)').matches;
  const touchPreferences = createTouchPreferences({
    ...(previewSession ? { storage: previewSession.storage } : {}),
    legacy: library.preferences.touchControls,
    onChange: () => {
      clearInput();
      syncAssistControls();
    },
  });
  syncAssistControls();
  refreshTextSize();
  $('music-select').value = library.preferences.musicGenre;
  $('master-volume').value = audioMaster.snapshot().volume;
  $('music-volume').value = library.preferences.musicVolume;
  $('sfx-volume').value = library.preferences.sfxVolume;
  $('terrain-select').value = library.preferences.style;
  $('settings-grid').checked = library.preferences.showGrid;
  $('match-class-appearance').checked = library.preferences.matchClassAppearance;
  configureAudio({
    style: library.preferences.musicGenre,
    master: library.preferences.masterVolume,
    music: library.preferences.musicVolume,
    sfx: library.preferences.sfxVolume,
  });
  if (scenario?.music) assignMusic(scenario.music);
  function warning(message, cue = null, role = 'host.unknown') {
    return flightInformation.warning(message, cue, role);
  }
  function dialogOpen() {
    return !!document.querySelector('dialog[open]');
  }
  const soloRadio = createSoloRadioInput({
    readPads: controllerPreview ? controllerPreview.readPads : () => navigator.getGamepads(),
    eventTarget: window,
    getScope: () => controllerScope(),
  });
  const controller = createControllerRouter({
    readPads: soloRadio.readPads,
    rawProfile: soloRadio.rawProfile,
    autoJoin: true,
    diagnostics: () => controllerConfirmTrace.enabled,
    navigationAliases: true,
    bindings: library.preferences.controllerBindings,
    boostMode: library.preferences.controllerBoostMode,
  });
  const controllerConfirmGuard = attachControllerConfirmGuard({
    confirmPressed: () => controller.menuConfirmPressed(),
    beforeNativeActivation: (event) => controllerConfirmLifecycle.beforeNativeActivation(event),
    onTrace: controllerConfirmTrace.record,
  });
  const controllerConfirmLifecycle = createControllerConfirmLifecycle({
    readConfirm: (options) => controller.readMenuConfirm(options),
    getContext: () => ({
      scope: controllerScope(),
      root: controllerMenuRoot(),
      focused: document.activeElement,
      active:
        !!controllerNavigation &&
        !document.hidden &&
        document.hasFocus() &&
        !enemyGuide?.ownsPracticeFocus(),
    }),
    navigation: {
      beginConfirm: (target) => controllerNavigation?.beginConfirm(target),
      commitConfirm: () => controllerNavigation?.commitConfirm(),
      cancelConfirm: () => controllerNavigation?.cancelConfirm(),
      confirmCurrent: () => controllerNavigation?.confirmCurrent(),
    },
    guard: controllerConfirmGuard,
    onTrace: controllerConfirmTrace.record,
  });
  let controllerLabels = controllerBindingLabels(library.preferences.controllerBindings),
    controllerDeviceId = '';
  let controllerFrame = null,
    controllerNavigation = null,
    controllerReading = null,
    controllerBoostSettings = null,
    controllerStatus = '',
    controllerPreviousScope = '',
    controllerInactive = false;
  let lastControllerModality = '';
  document.body.dataset.inputMode =
    navigator.maxTouchPoints > 0 || globalThis.matchMedia?.('(any-pointer: coarse)').matches
      ? 'touch'
      : 'keyboard';
  const modalNavigation = attachModalNavigation({
    getFallbackFocus: ({ dialog, top }) =>
      dialog.id === 'settings-dialog' && !top ? $('shell-menu') : null,
  });
  const controllerDialog = modalNavigation.topDialog;
  controllerTraceRoot = () => controllerDialog() || document.body;
  const controllerTraceToggle = $('controller-trace-enabled');
  controllerTraceToggle.checked = controllerConfirmTrace.enabled;
  controllerTraceToggle.addEventListener('change', () => {
    controllerConfirmTrace.setEnabled(controllerTraceToggle.checked);
  });
  function controllerMenuHint() {
    const b = controllerLabels.menu;
    return t('gameplay:stickDPadNavigateConfirmBackResume', {
      value1: b.confirm,
      value2: b.back,
      value3: b.menu,
      value4: library.preferences.controllerBindings
        ? ''
        : ' ' + t('common:controls.defaultMenuShortcuts'),
    });
  }
  function manualSupplyAvailable() {
    return (
      arcadeActionCapabilities(run?.level).manualPickup &&
      !!run?.ability.capacity &&
      !!run?.supplies?.length
    );
  }
  function craftSwitchAvailable() {
    return (
      !courseSession &&
      !courseEntry &&
      !campaignOverview &&
      !!run &&
      !['won', 'lost'].includes(run.status) &&
      run.classRecipes.length > 1 &&
      run.hangars.length > 0
    );
  }
  function controllerFlightHint() {
    return soloControllerFlightHint({
      labels: controllerLabels.flight,
      actions: arcadeActionCapabilities(run?.level),
      manualSupply: manualSupplyAvailable(),
      craftSwitch: craftSwitchAvailable(),
    });
  }
  function refreshControllerPrompts() {
    controllerDeviceId = controllerFrame?.assigned?.id ?? controllerDeviceId;
    controllerLabels = controllerBindingLabels(
      library.preferences.controllerBindings,
      controllerDeviceId,
    );
    localizedText($('controller-help'), () => {
      const b = controllerLabels.flight;
      return t('gameplay:connectAControllerAndReleaseItsControlsOnceBothSticks', {
        value1: t('gameplay:upDownLeftRight', {
          value1: b.up,
          value2: b.down,
          value3: b.left,
          value4: b.right,
          value5: controllerStickLabel(library.preferences.controllerBindings, 'flight'),
        }),
        value2: controllerFlightHint(),
        value3: controllerMenuHint(),
      });
    });
    localizedText($('controller-navigation-help'), () =>
      t('gameplay:controller.menuEditingHelp', { navigation: controllerMenuHint() }),
    );
    localizedText($('controller-ui-hint'), () =>
      controllerScope() === 'flight' ? controllerFlightHint() : controllerMenuHint(),
    );
    controllerReading?.refresh();
    controllerNavigation?.refreshReadingHint();
    refreshControllerBoostCue();
  }
  function refreshControllerBoostCue() {
    renderControllerBoostCue(
      $('controller-boost-cue'),
      controller.boostState(),
      controllerLabels.flight.boost,
      !!controllerFrame?.assigned &&
        controllerScope() === 'flight' &&
        run?.status === 'running' &&
        arcadeActionCapabilities(run?.level).manualBoost,
    );
  }
  function adoptControllerBoostMode({ force = false } = {}) {
    if (force || controller.boostState().mode !== library.preferences.controllerBoostMode) {
      controller.setBoostMode(library.preferences.controllerBoostMode);
      clearInput();
    }
    controllerBoostSettings?.refresh();
    refreshControllerBoostCue();
  }
  function controllerScope() {
    if (demoHost?.active) return demoHost.scope;
    const dialog = controllerDialog();
    if (dialog) return `modal:${dialog.id}`;
    if (courseBlocked()) return `course:${coursePhase}`;
    if (celebrationActive) return 'celebration';
    if (defeatActive) return 'defeat-presentation';
    if (run?.status === 'won') return $('show-result').hidden ? 'won' : 'picture';
    if (run?.status === 'lost') return 'lost';
    if (campaignOverview) return `overview:${campaign.id}`;
    if (!started) return `ready:${campaign.id}:${run?.levelId}`;
    return paused ? 'paused' : 'flight';
  }
  const availableFocusTarget = (element) =>
    !!element?.isConnected &&
    !element.disabled &&
    !element.closest('[hidden],[inert],[aria-hidden="true"]') &&
    element.getClientRects().length > 0 &&
    document.defaultView?.getComputedStyle(element).visibility !== 'hidden';
  function controllerFocus() {
    const dialog = controllerDialog();
    if (dialog) {
      if (dialog.id === 'shell-home') return gameShell?.primary();
      if (dialog.id === 'journey-chooser') return journeyChooser?.primary?.();
      if (dialog.id === 'hangar-dialog') return $('switch-class-select');
      if (dialog.id === 'collection-dialog')
        return (
          $('journey-picture-grid')?.querySelector('button') ||
          $('gallery-grid').querySelector('button') ||
          $('gallery-search')
        );
      return [...dialog.querySelectorAll('button,select,summary')].find(availableFocusTarget);
    }
    const scope = controllerScope();
    if (scope === 'celebration' || scope === 'defeat-presentation') return $('skip-celebration');
    if (scope === 'picture') return $('show-result');
    if (scope.startsWith('course:')) return $('overlay-read');
    if (courseSession && scope === 'won')
      return !$('first-flight-next').hidden ? $('first-flight-next') : $('retry-button');
    if (scope === 'won' || scope.startsWith('overview:')) return $('next-button');
    if (scope === 'lost') return $('retry-button');
    return $('start-button');
  }
  function controllerMenuRegion() {
    const dialog = controllerDialog();
    if (dialog) return dialog;
    if (!$('game-overlay').hidden)
      return courseSession ? $('game-overlay').closest('.arena-panel') : $('game-overlay');
    if (defeatActive || celebrationActive || (run?.status === 'won' && !$('show-result').hidden))
      return $('arena-shell');
    return document;
  }
  let controllerCompositeRegion = null;
  const controllerShellBar = document.querySelector('.shell-bar');
  function controllerMenuRoot() {
    if (installOfflinePanel?.frameFocused()) return null;
    const region = controllerMenuRegion();
    // Nonmodal overlays share navigation with the visible shell bar. The
    // accept predicate confines it to the overlay, shell and active lesson panel.
    controllerCompositeRegion =
      region !== document && !controllerDialog() && !courseBlocked() ? region : null;
    return controllerCompositeRegion ? document.body : region;
  }
  function controllerMenuAccepts(element) {
    return (
      (!controllerCompositeRegion ||
        controllerCompositeRegion.contains(element) ||
        (courseSession && $('first-flight-panel').contains(element)) ||
        !!controllerShellBar?.contains(element)) &&
      (!courseSession ||
        $('game-overlay').hidden ||
        !!controllerDialog() ||
        (!courseBlocked() && !!controllerShellBar?.contains(element)) ||
        $('game-overlay').contains(element) ||
        $('first-flight-panel').contains(element)) &&
      !element.matches(
        '[data-move],#stop-button,#boost-button,#action-button,#pickup-button,#pause-button',
      )
    );
  }
  function controllerBack() {
    if (demoHost?.active) {
      demoHost.close();
      return;
    }
    if (installOfflinePanel?.isOpen()) {
      installOfflinePanel.close();
      return;
    }
    const dialog = controllerDialog();
    if (dialog) {
      if (dialog.id === 'profile-recovery-dialog') {
        void profileRecovery.close();
        return;
      }
      if (dialog.id === 'enemy-guide-dialog') {
        enemyGuide.close();
        return;
      }
      if (dialog.id === 'library-dialog' && libraryPanel.cancelAttemptExport()) return;
      const transferCancel = $('transfer-cancel');
      if (
        dialog.id === 'library-dialog' &&
        transferCancel &&
        !transferCancel.hidden &&
        !transferCancel.disabled
      ) {
        transferCancel.click();
        return;
      }
      if (dialog.id === 'settings-dialog' && !$('cancel-key-capture').hidden) {
        $('cancel-key-capture').click();
        return;
      }
      // Follow the same cancellable lifecycle as Escape. Library transactions
      // may prevent cancellation; picture close restores its collection focus.
      if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
      else if (dialog.open)
        localizedText($('controller-ui-hint'), () =>
          t('interface:thisOperationIsStillInProgressUseItsCancelAction'),
        );
      return;
    }
    const scope = controllerScope();
    if (courseBlocked()) return;
    if (libraryNextOperation) {
      libraryNextOperation.cancel({ restoreFocus: true });
      return;
    }
    if (librarySkipResolution) {
      cancelSkipResolution({ restoreFocus: true });
      return;
    }
    if (resultAttempt) {
      cancelResultAttempt({ restoreFocus: true });
      return;
    }
    if (journeyLaunch && preparationOperation?.result) {
      $('flight-preparation-cancel').click();
      controllerFocus()?.focus({ preventScroll: true });
      return;
    }
    if (pictureResume !== null && preparationOperation?.cancel === cancelPictureStart) {
      // Back cancels only this launch owner, after any native modal has handled it.
      $('flight-preparation-cancel').click();
      $('start-button').focus({ preventScroll: true });
      return;
    }
    if (editionUI?.closeResultDetails?.()) return;
    if (scope === 'paused') resume();
    else if (scope === 'celebration' || scope === 'defeat-presentation')
      $('skip-celebration').click();
    else if (scope === 'picture') $('show-result').click();
    else controllerFocus()?.focus();
  }
  const input = attachInput({
    arena: $('game-canvas'),
    onPause: (force) => pause(force),
    continuousSteering: () => true,
    getTouchSettings: () => touchPreferences.snapshot(),
    touchEnabled: () => library.preferences.screenControls !== 'off',
    tapMode: () => $('tap-steering').checked,
    active: () =>
      !practiceRenderFailure.failed &&
      started &&
      !paused &&
      !courseBlocked() &&
      !courseEntryHold &&
      !dialogOpen() &&
      run?.status === 'running',
    onGamepad: (message) => localizedText($('input-status'), () => message),
    getBindings: () => library.preferences.keyboardBindings,
    readControllerCommand: () => controllerFrame?.flight,
    onClear: () => {
      cancelControllerToggleBoost(controller, controllerFrame);
      refreshControllerBoostCue();
    },
  });
  function readingPrompt({ scrollable }) {
    const mode = document.body.dataset.inputMode;
    const scroll = !scrollable
      ? t('interface:allTextIsVisible')
      : mode === 'controller' || mode === 'keyboard'
        ? t('interface:upDownScroll')
        : t('interface:scrollToRead');
    const exit =
      mode === 'controller'
        ? `${controllerLabels.menu.confirm} or ${controllerLabels.menu.back}`
        : mode === 'keyboard'
          ? t('interface:enterSpaceOrEscape')
          : t('interface:doneReading');
    return `${scroll} · ${exit} returns`;
  }
  function setInputModality(mode) {
    if (document.body.dataset.inputMode === mode) return;
    if (mode === 'controller') input.releaseLocalControls();
    else input.clearPhysical();
    document.body.dataset.inputMode = mode;
    refreshInputPresentation();
    controllerNavigation?.refreshReadingHint();
  }
  function refreshInputPresentation() {
    const chrome = hasCompactArcadeArena(run?.level) ? 'compact' : 'full';
    if (document.body.dataset.arenaChrome !== chrome) document.body.dataset.arenaChrome = chrome;
    const captions = hasFieldWarningBand(run?.level) ? 'warnings' : 'notices';
    if (document.body.dataset.fieldCaptions !== captions)
      document.body.dataset.fieldCaptions = captions;
    const visible = showScreenControls({
      preference: library.preferences.screenControls,
      modality:
        controllerFrame?.assigned?.mapping === '' &&
        !soloRadio.completeFlight(controllerFrame.assigned.index) &&
        (navigator.maxTouchPoints > 0 || globalThis.matchMedia?.('(any-pointer: coarse)').matches)
          ? 'touch'
          : document.body.dataset.inputMode,
      scope: controllerScope(),
      running: run?.status === 'running',
    });
    const next = visible ? 'shown' : 'hidden';
    if (document.body.dataset.screenControls !== next) document.body.dataset.screenControls = next;
  }
  controllerNavigation = attachControllerNavigation({
    getScope: controllerScope,
    getRoot: controllerMenuRoot,
    keyboard: true,
    ownsKeyboardEvent: (event) => {
      if (demoHost?.inputExclusive) return true;
      const dialog = $('settings-dialog'),
        cancel = $('cancel-key-capture');
      return (
        controllerDialog() === dialog &&
        (settingsTabOwnsKey(event, dialog) ||
          (!cancel.hidden && !cancel.disabled && dialog.contains(event.target)))
      );
    },
    onTabBoundary: ({ backward }) => {
      if (!controllerPreview || window.name !== 'revealline-controller-practice')
        return !controllerPreviewRequested
          ? playgroundTabBoundary({ window, suspend: suspendInteraction })
          : false;
      requestControllerPracticeExit({
        window,
        session: params.get('controller-session'),
        backward,
        beforeExit: suspendInteraction,
      });
      // A rejected or retired embedded handoff must not wrap focus back into a
      // stale child. The next deliberate boundary key may try the current lab.
      return true;
    },
    getDefaultFocus: controllerFocus,
    getReadingPrompt: readingPrompt,
    getControlLabels: () => ({
      directions: t('interface:directionControls'),
      confirm: controllerLabels.menu.confirm,
      back: controllerLabels.menu.back,
    }),
    accept: controllerMenuAccepts,
    onNativeInput: (event) => {
      controllerConfirmLifecycle.nativeInput(event);
      setInputModality(nextInputModality(document.body.dataset.inputMode, event));
      if (controllerScope() !== 'flight') controller.clear();
    },
    activateControl: (element) => controllerConfirmGuard.activate(element),
    onBack: controllerBack,
    onMenu: () => {
      if (installOfflinePanel?.isOpen()) {
        installOfflinePanel.close();
        return;
      }
      if (
        !courseBlocked() &&
        !dialogOpen() &&
        started &&
        paused &&
        !['won', 'lost'].includes(run?.status)
      )
        resume();
    },
    onHint: (message) => {
      localizedText($('controller-ui-hint'), () => message);
      controllerReading?.hint(message);
    },
    onReadingChange: (state) => controllerReading?.changed(state),
  });
  controllerReading = attachControllerReading({
    compactOverlay: !courseSession,
    additionalSurfaces: [
      [
        'help-reading',
        'help-read',
        localizedMessage('common:navigation.howToPlay'),
        'help-reading-unit',
      ],
      [
        'flight-details-reading',
        'flight-details-read',
        localizedMessage('interface:fieldDetails'),
        'flight-details-unit',
      ],
      [
        'collection-reading',
        'collection-read',
        localizedMessage('interface:achievementsAndAppearances'),
        'collection-reading-unit',
      ],
    ],
    getNavigation: () => controllerNavigation,
    getControlLabels: () => controllerLabels.menu,
    getReadingPrompt: readingPrompt,
    getScope: controllerScope,
    pause,
    onTransition: () => clearInput({ preserveNavigation: true }),
  });
  flightDetails = attachFlightDetails({
    read: flightInformation.read,
    pause,
    clearInput,
    topDialog: controllerDialog,
    canOpen: () =>
      started &&
      paused &&
      !courseBlocked() &&
      !campaignOverview &&
      !['won', 'lost'].includes(run?.status),
    onReadingChange: () => controllerReading.refresh(),
    getContext: () => {
      const capabilities = arcadeActionCapabilities(run.level),
        acceptedLevel = structuredClone(run.level),
        acceptedTheme = structuredClone(theme),
        coverage = run.level.goal.coverage * 100,
        stopOnCapture = run.rules.stopOnCapture,
        actions = [],
        acceptedKeys = resolveKeyBindings(library.preferences.keyboardBindings),
        acceptedController = structuredClone(library.preferences.controllerBindings),
        acceptedDevice = controllerDeviceId,
        actionKeys = (action) => ({
          keyboard: bindingLabels(acceptedKeys)[action],
          controller: controllerBindingLabels(acceptedController, acceptedDevice).flight[action],
        });
      if (capabilities.manualAbility) {
        const seconds = Math.max(0, run.ability.cooldownUntil - run.time),
          ammo = run.ability.ammo,
          capacity = run.ability.capacity;
        actions.push({
          label: () => contentText(acceptedTheme, 'labels.ability'),
          detail: () =>
            t('interface:flightDetails.ability', {
              ...actionKeys('ability'),
              seconds: formatNumber(seconds, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
              charges: capacity ? t('interface:flightDetails.charges', { ammo, capacity }) : '',
            }),
        });
      }
      if (manualSupplyAvailable())
        actions.push({
          label: localizedMessage('interface:supply'),
          detail: () => t('interface:flightDetails.supply', actionKeys('pickup')),
        });
      if (capabilities.manualBoost)
        actions.push({
          label: localizedMessage('common:controls.boost'),
          detail: () => t('interface:flightDetails.boost', actionKeys('boost')),
        });
      if (craftSwitchAvailable())
        actions.push({
          label: localizedMessage('interface:changeCraft'),
          detail: () => t('interface:flightDetails.hangar', actionKeys('hangar')),
        });
      const roles = new Map();
      for (const enemy of run.enemies) roles.set(enemy.type, (roles.get(enemy.type) || 0) + 1);
      return {
        mission: () => contentText(acceptedLevel, 'name'),
        goal: () =>
          t('interface:flightDetails.reveal', {
            coverage: formatNumber(coverage, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }),
          }),
        steering: () =>
          `${t('interface:flightDetails.steering')}${stopOnCapture ? ' ' + t('interface:closingACutStopsYourCraftChooseAFreshDirection') : ''}`,
        objectiveLabel: () => contentText(acceptedTheme, 'labels.objective'),
        actorRoles: [...roles].map(([type, count]) => ({ type, count })),
        actions,
      };
    },
  });
  const enemyWorkshopReturn = attachEnemyWorkshopReturn({
    enabled: practiceSession && !courseSession && !controllerPreviewRequested,
    onReturn: () => pause(true),
  });
  const controllerPracticeReturn = attachControllerPracticeReturn({
    enabled: !!controllerPreview,
    session: params.get('controller-session'),
    beforeExit: suspendInteraction,
  });
  enemyGuide = attachEnemyGuide({
    themes: guideThemes,
    catalogPracticeAvailable: !runtimeContent,
    getPresentation: () => presentationSnapshot,
    getThemeId: () => theme.id,
    getTurnPolicy: () => turnPolicy,
    getLevel: () => run?.level,
    getRunOptions: () =>
      run
        ? {
            seed: run.seed,
            classId: run.classId,
            classRecipes: run.classRecipes,
          }
        : undefined,
    getMissionTheme: () => theme,
    resolveEncounterPracticeURL: ({ scenario, returnURL }) =>
      runtimeContent
        ? editionGuidePracticeURL(runtimeContent, {
            scenario,
            returnURL,
            difficulty: activeEntry.difficulty || 'standard',
          })
        : null,
    loadImpactScenario: async () => {
      const source = await getJSON('content/scenarios/line-impact-demo.json');
      return runtimeContent
        ? projectEditionGuideScenario(source, {
            theme: runtimeContent.theme,
            classes: runtimeContent.boot[3],
          })
        : source;
    },
    onPractice: () => {
      clearInput();
      guideMusicWasPlaying = soundtrackPlayer?.snapshot().desired ?? sound.enabled;
      suspendAudio();
    },
    onReturn: () => {
      clearInput();
      if (!soundtrackDisposed && guideMusicWasPlaying && !document.hidden && document.hasFocus())
        activateAudio().catch(() => {});
      guideMusicWasPlaying = false;
    },
    onClose: () => {
      clearInput();
      if (!controllerDialog()) controllerFocus()?.focus({ preventScroll: true });
    },
    onRead: (request) => controllerNavigation.beginReading(request),
  });
  $('shell-guide').onclick = () => {
    pause(true);
    enemyGuide.open();
  };
  handlePageHide = (event) => {
    const demoActive = demoHost?.active;
    demoHost?.suspend();
    cancelUnifiedOpening?.();
    ++unifiedOpenRevision;
    ++unifiedLaunchRevision;
    // Suspend while this tab still owns the writer. A history-cache return
    // keeps its memory available for export without reclaiming stale storage.
    if (courseEntry) cancelCourseEntry();
    cancelModeDeparture({ close: true });
    cancelMissionReplacement();
    invalidateRestart(t('interface:restartCancelledWhenLeavingThisPage'));
    optionalWorlds?.close(false);
    invalidateContentSwitch();
    if (!demoActive) pause(true);
    masteryAwards.cancelAll();
    cancelRestore();
    cancelPictureStart({ retirePrewarm: true });
    missionThumbnails.cancel();
    clearInput();
    if (replayDownload) replayDownload.observed = false;
    replayFeedback?.clear();
    suspendAudio();
    writer.release();
    flightDetails.suspend();
    flightInformation.suspend();
    persistenceReady = false;
    controllerPreview?.clear();
    if (!event.persisted) {
      demoHost?.destroy();
      demoLibrary.dispose();
      stopLocaleView();
      editionUI?.dispose();
      titleCharacter?.dispose();
      touchPreferences.destroy();
      flightDetails.dispose();
      flightInformation.dispose();
      document.removeEventListener('pointerdown', startRememberedMenuMusic);
      document.removeEventListener('keydown', startRememberedMenuMusic);
      journeyReactions.dispose();
      soundtrackDisposed = true;
      soundtrackLoad.abort();
      quickMusicControls?.dispose();
      enemyGuide.dispose();
      optionalWorlds?.dispose();
      soundtrackPlayer?.dispose();
      soundtrackPanel?.dispose();
      stopMasterView();
      stopDisplayView();
      stopActorView();
      actorPreferences.dispose();
      compactCredit.dispose();
      audioRestoration.dispose();
      displayRestoration.dispose();
      displayPreferences.dispose();
      encounterDisplay.dispose();
      menuStyle.dispose();
      audioPreferences.dispose();
      audioMaster.dispose();
      soundtrackStore?.close();
      flightPictures?.dispose();
      flightVisualLease?.release();
      flightVisualLease = null;
      adoptFlightActors(null, false);
      candidateHost?.preparer.dispose();
      unifiedDisposed = true;
      unifiedChooser?.destroy();
      unifiedLibrary?.library.dispose();
      disposeUnifiedPreview?.();
      journeyPreferences?.dispose();
      gameplayTuningPanel?.dispose();
      gameplayTuning.dispose();
      if (browsingJourneyPreferences !== journeyPreferences) browsingJourneyPreferences.dispose();
      missionThumbnails.close();
      libraryPanel.dispose();
      window.removeEventListener('beforeunload', protectSessionOriginals);
      sessionPictures.dispose();
      pictureStore?.close();
      storyStore?.close();
      externalChapters?.close();
      externalBackup?.close();
      pictureManager?.close();
      controllerReading.destroy();
      controllerNavigation.destroy();
      controllerConfirmLifecycle.destroy();
      controllerConfirmGuard.destroy();
      controllerConfirmTrace.destroy();
      gameShell?.destroy();
      missionPicker?.destroy();
      modalNavigation.destroy();
      input.destroy();
      controller.destroy();
      controllerPreview?.destroy();
      controllerPracticeReturn.dispose();
      practiceNavigation.destroy();
      enemyWorkshopReturn.dispose();
      courseView?.destroy();
      for (const feedback of contentFeedback) feedback.presenter.dispose();
      preparationFeedback.dispose();
      themeFeedback.dispose();
      soundtrackFeedback.dispose();
      craftFeedback.dispose();
      presentationFeedback.dispose();
      replayFeedback?.dispose();
      replayFocusClearance?.destroy();
      missionReplacementFocusClearance?.destroy();
    }
  };
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    flightInformation.resume();
    restoreListening();
    controller.invalidate();
    clearInput();
    pause(true);
    localizedText($('save-warning'), () => t('interface:solo.sessionHistoryWarning'));
    show('save-warning', true);
    void packCommits.reconcile();
    if ($('settings-dialog').open) void storageRetention.refresh();
  });
  function refreshKeyPrompts() {
    const bindings = resolveKeyBindings(library.preferences.keyboardBindings);
    const labels = bindingLabels(bindings);
    const actions = arcadeActionCapabilities(run?.level);
    const description = () =>
      t('gameplay:tapADirectionToFlyTapAnotherToTurnUp', {
        value1: labels.up,
        value2: labels.down,
        value3: labels.left,
        value4: labels.right,
        value5: actions.manualAbility ? t('gameplay:ability', { value1: labels.ability }) : '',
        value6: manualSupplyAvailable() ? t('gameplay:supply2', { value1: labels.pickup }) : '',
        value7: actions.manualBoost ? t('gameplay:boost2', { value1: labels.boost }) : '',
        value8: craftSwitchAvailable() ? t('gameplay:changeCraft', { value1: labels.hangar }) : '',
        value9: labels.pause,
        value10: run?.rules.stopOnCapture
          ? ' ' + t('interface:closingACutStopsYourCraftTapAFreshDirection')
          : '',
      });
    localizedText($('keyboard-help'), description);
    localizedAttribute($('game-canvas'), 'aria-label', () =>
      t('gameplay:territoryCaptureGame', { value1: description() }),
    );
    for (const [id, action] of [
      ['action-button', 'ability'],
      ['pickup-button', 'pickup'],
      ['boost-button', 'boost'],
    ]) {
      localizedText($(id).querySelector('kbd'), () =>
        keyLabel(bindings.bindings[action][0]).replace('Left ', 'L ').replace('Right ', 'R '),
      );
      localizedAttribute($(id).querySelector('kbd'), 'title', () => labels[action]);
    }
    localizedText($('hangar-button'), () => t('gameplay:changeCraft2', { value1: labels.hangar }));
    $('stop-button').hidden = true;
    for (const button of document.querySelectorAll('[data-move]'))
      localizedAttribute(button, 'title', () =>
        t('gameplay:move', { value1: button.dataset.move, value2: labels[button.dataset.move] }),
      );
    if (!started && !campaignOverview)
      localizedText($('overlay-footnote'), () =>
        t('gameplay:tapADirectionToFlyPauses', {
          value1: actions.manualAbility
            ? t('interface:equipmentControlsAreInHowToPlay')
            : t('interface:bonusesActivateOnContact'),
          value2: labels.pause,
        }),
      );
  }
  const keySettings = attachKeySettings({
    continuousSteering: true,
    getBindings: () => library.preferences.keyboardBindings,
    setBindings: (value) => {
      preferences({ keyboardBindings: value });
      return saveSucceeded && !practice
        ? { ok: true }
        : {
            ok: false,
            warning: t('interface:keysChangedForThisSessionExportYourLibraryToRetain'),
          };
    },
    onChanged: () => {
      clearInput();
      refreshKeyPrompts();
    },
  });
  const controllerSettings = attachControllerSettings({
    continuousSteering: true,
    container: $('controller-settings-root'),
    getBindings: () => library.preferences.controllerBindings,
    onBeforeEdit: () => keySettings.refresh(),
    onApply: (value) => {
      preferences({ controllerBindings: value });
      controller.setBindings(library.preferences.controllerBindings);
      clearInput();
      refreshControllerPrompts();
      return saveSucceeded && !practice
        ? { ok: true }
        : {
            ok: false,
            warning: t('interface:controllerControlsChangedForThisSessionExportYourLibraryTo'),
          };
    },
  });
  const soloRadioSetup = mountControllerSetup({
    root: $('controller-settings-root'),
    session: soloRadio.session,
    solo: true,
    storageKey: SOLO_RADIO_PROFILE_KEY,
  });
  const storageRetention = attachStorageRetention({
    button: $('storage-retention-button'),
    status: $('storage-retention-status'),
    isOpen: () => $('settings-dialog').open,
  });
  window.addEventListener('pagehide', (event) => {
    storageRetention.close();
    if (!event.persisted) {
      storageRetention.destroy();
      keySettings.destroy();
      controllerSettings.destroy();
      soloRadioSetup.dispose();
      soloRadio.dispose();
      controllerBoostSettings.destroy();
    }
  });
  controllerBoostSettings = attachControllerBoostSettings({
    select: $('controller-boost-mode'),
    status: $('controller-boost-status'),
    getMode: () => library.preferences.controllerBoostMode,
    applyMode: (mode) => {
      pause(true);
      const saved = preferences({ controllerBoostMode: mode });
      adoptControllerBoostMode({ force: true });
      return saved;
    },
  });
  function clearInput({ preserveNavigation = false, resetDirection = false } = {}) {
    pendingAction = false;
    pendingPickup = false;
    pendingSwitch = null;
    controller.clear();
    controllerConfirmLifecycle.cancel('input-clear');
    controllerFrame = null;
    if (!preserveNavigation) controllerNavigation?.clear();
    if (resetDirection) input.clear();
    else input.clearPhysical();
    accumulator = 0;
  }
  function courseBlocked() {
    return (
      !!courseEntry || (courseSession && ['switching', 'leaving', 'ended'].includes(coursePhase))
    );
  }
  function refreshCourse() {
    if (!courseView) return;
    if (courseSession && !['switching', 'leaving', 'ended'].includes(coursePhase))
      coursePhase = !started
        ? 'ready'
        : ['won', 'lost'].includes(run?.status)
          ? 'review'
          : paused
            ? 'paused'
            : 'playing';
    const snapshot = courseSnapshot();
    if (courseSession && snapshot?.outcome === 'complete')
      courseVisit[courseRequest.lessonId] = 'complete';
    courseView.render({
      request: courseRequest,
      phase: coursePhase,
      snapshot,
      visit: courseVisit,
      error: snapshot?.error || '',
      embedded: courseEmbedded,
      entry: {
        available: !practice && !courseSession && !started && !courseEntry,
        helpAvailable: !practice && !courseSession,
        pending: !!courseEntry,
        message: courseEntryMessage,
      },
    });
    if (!courseSession) return;
    // Ended/transitioning embedded courses retain only their terminal reader.
    if (controllerShellBar) controllerShellBar.hidden = courseBlocked();
    const progressText = t('gameplay:lessonsThisVisit', {
      value1: Object.values(courseVisit).filter((value) => value === 'complete').length,
      value2: FIRST_FLIGHT_LESSONS.length,
    });
    if ($('campaign-progress').textContent !== progressText)
      localizedText($('campaign-progress'), () => progressText);
    const lesson = getFirstFlightLesson(courseRequest.lessonId);
    const task =
      coursePhase === 'ended'
        ? t('interface:courseEndedUseTheParentPageSGameLinkTo')
        : snapshot?.outcome === 'lost'
          ? t('interface:readTheLossExplanationThenRetryOrChooseAnotherLesson')
          : snapshot?.outcome === 'missed'
            ? t('interface:pictureRevealedRetryTheSuggestedExampleOrSkipIt')
            : snapshot?.outcome === 'complete'
              ? t('interface:lessonCompleteEnjoyThePictureOrChooseYourNextLesson')
              : snapshot?.available === false
                ? t('interface:guidanceIsUnavailableYouCanStillPlayRetrySkipOr')
                : lesson.steps.find((item) => item.id === snapshot?.stepId)?.instruction ||
                  lesson.summary;
    const text = `${task}${
      snapshot?.territoryKept && run?.status === 'respawning'
        ? ' ' + t('interface:yourUnfinishedLineWasCancelledEarlierSecuredTerritoryIsKept') + ''
        : ''
    }`;
    if ($('first-flight-task').textContent !== text)
      localizedText($('first-flight-task'), () => text);
  }
  function courseSnapshot() {
    if (courseObserver) return courseObserver.snapshot();
    if (!courseUnavailable) return null;
    return {
      ...courseUnavailable,
      outcome: run?.status === 'lost' ? 'lost' : run?.status === 'won' ? 'missed' : 'pending',
    };
  }
  function stopCourseGuidance() {
    courseUnavailable = {
      ...(courseObserver?.snapshot() || {
        lessonId: courseRequest.lessonId,
        steps: [],
      }),
      available: false,
      error: t('interface:guidanceIsUnavailableForThisAttemptYouCanStillPlay'),
    };
    courseObserver = null;
  }
  function cancelCourseEntry(message = t('interface:courseEntryCancelledYourFlightRemainsPaused')) {
    if (!courseEntry) return;
    courseEntry.controller.abort();
    courseEntry = null;
    courseEntryMessage = message;
    clearInput();
    refreshCourse();
  }
  async function enterFirstFlight() {
    denyBrandedImport();

    if (
      practice ||
      courseSession ||
      courseEntry ||
      modeDeparture ||
      missionReplacement ||
      restartRequest
    )
      return;
    attemptFiles?.invalidate();
    const ticket = {
      controller: new AbortController(),
      run,
      recorder,
      runId,
      generation: libraryGeneration,
      campaign,
    };
    courseEntry = ticket;
    courseEntryHold = true;
    cancelRestore();
    clearInput();
    paused = true;
    sound.pause();
    if (!$('help-dialog').open) $('help-dialog').showModal();
    courseEntryMessage = t('interface:preparingFirstFlightYourCurrentFlightStaysPaused');
    refreshCourse();
    $('first-flight-entry-cancel').focus({ preventScroll: true });
    const assertCurrent = () => {
      if (
        courseEntry !== ticket ||
        ticket.controller.signal.aborted ||
        run !== ticket.run ||
        recorder !== ticket.recorder ||
        runId !== ticket.runId ||
        campaign !== ticket.campaign ||
        libraryGeneration !== ticket.generation
      )
        throw new DOMException(t('interface:courseEntryWasCancelledByANewerChange'), 'AbortError');
    };
    try {
      if (started && ['running', 'respawning'].includes(run.status)) {
        await retainFlightForFirstFlight({
          run,
          recorder,
          campaign,
          campaignKey: campaignKey(campaign),
          themeId: theme.id,
          bodyId,
          runId,
          continuation: { direction: input.snapshotDirection() },
          presentationPins: flightPictures?.pins(),
          presentationLevel: campaign.levels.find((level) => level.id === run.levelId),
          ...(flightVisualLease ? { visualThemePin: flightVisualLease.pin() } : {}),
          ...(flightActorLease ? { actorAppearancePin: flightActorLease.pin() } : {}),
          mediaIdentityCatalog: flightPictures?.identityCatalog,
          storage: profileStorage(),
          sessionKey,
          assertCurrent,
          assertWritable: async () => {
            assertWriter();
            if (
              !storedStateAdopted ||
              recovery !== null ||
              (await readAssetStore(journalKey)) !== null
            )
              throw new Error(t('interface:storedDataNeedsRecoveryBeforeThisFlightCanBeRetained'));
          },
          withStorageLock: (work) => {
            if (!profileLocks?.request)
              throw new Error(
                t('interface:thisBrowserCannotRetainTheFlightSafelyBeforeNavigation'),
              );
            return profileLocks.request(
              `${libraryKey}.backup-lock`,
              { signal: ticket.controller.signal },
              work,
            );
          },
          signal: ticket.controller.signal,
          onProgress: ({ ticks, total }) => {
            if (courseEntry !== ticket) return;
            courseEntryMessage = t('gameplay:verifyingYourSavedFlightTicks', {
              value1: ticks,
              value2: total,
            });
            refreshCourse();
          },
        });
      }
      assertCurrent();
      const target = new URL(runtimeContent?.href() ?? './', location.href);
      target.searchParams.set('course', 'first-flight');
      target.searchParams.set('lesson', FIRST_FLIGHT_LESSONS[0].id);
      target.searchParams.set('turn-policy', turnPolicy);
      // Navigation lifecycle callbacks must not autosave again after the checked
      // handoff. Only an explicit resume/new attempt releases this save hold.
      location.assign(target.href);
    } catch (error) {
      if (courseEntry !== ticket) return;
      courseEntry = null;
      courseEntryHold = true;
      courseEntryMessage = t('gameplay:yourFlightRemainsPausedHereYouCanReturnToIt', {
        value1: error.message,
      });
      clearInput();
      refreshCourse();
      $('first-flight-help-enter').focus({ preventScroll: true });
    }
  }
  const catalogueHref = runtimeContent?.href() ?? (authoredRoute ? './?journey=legacy' : './');
  const catalogueLabel = () =>
    authoredRoute ? t('interface:legacyMissions2') : t('interface:newJourney');
  const librarySourceReturn = readMissionLibraryReturn(params, { mode: 'solo' });
  const librarySourceDestination = librarySourceReturn
    ? `${librarySourceReturn.mode === 'team' ? 'couch/relay-rescue.html' : 'couch/'}?${new URLSearchParams({ journey: librarySourceReturn.journey, return: 'solo' })}`
    : null;
  const modeDestinations = Object.freeze({
    ...(authoredModeDestinations('solo', authoredRoute?.id ?? 'legacy') ?? {
      team: 'couch/relay-rescue.html?journey=legacy&return=solo',
      versus: 'couch/?journey=legacy&return=solo',
    }),
    ...(librarySourceReturn ? { [librarySourceReturn.mode]: librarySourceDestination } : {}),
    catalogue: catalogueHref,
    library: './',
  });
  for (const kind of ['versus', 'team'])
    for (const id of [`shell-title-${kind}`, `shell-${kind}`])
      $(id)?.setAttribute('href', modeDestinations[kind]);
  if (authoredRoute) {
    localizedText($('shell-team'), () =>
      authoredRoute.id === DEFAULT_JOURNEY_ROUTES.solo
        ? t('common:counts.teamMissionsWithPlayers', { count: 12, players: 2 })
        : t('interface:separateTeamArenas2Players'),
    );
  }
  const modeLabel = (kind, destinationLabel = null, presentationId = undefined) =>
    presentationId !== undefined
      ? presentationId === null
        ? t('interface:soloDeparture.currentArtwork')
        : t('interface:soloDeparture.retainedArtwork')
      : (destinationLabel ??
        (kind === 'library'
          ? t('interface:selectedMission')
          : kind === 'catalogue'
            ? catalogueLabel()
            : kind === 'versus'
              ? t('interface:versus2')
              : t('interface:team')));
  const currentAuthoredModeRoute = () =>
    candidateHost?.owns(activeEntry) ? authoredRoute.id : null;
  const modeDestination = (ticket) =>
    ticket.destinationHref ||
    ticket.libraryHref ||
    (librarySourceReturn?.mode === ticket.kind && librarySourceDestination) ||
    authoredJourneyModeHref(ticket.journeyRouteId, ticket.kind) ||
    modeDestinations[ticket.kind];
  async function prepareModeDestination(ticket, destination = modeDestination(ticket)) {
    modeDepartureCurrent(ticket);
    if (runtimeContent) {
      if (!editionDepartureDestinationAllowed(runtimeContent, ticket, destination, location.href))
        throw new Error(t('interface:thisContentHasNoAcceptedActorAppearanceOwner'));
      modeDepartureCurrent(ticket);
      return;
    }
    await gameplayDownloads.ensureDestination(new URL(destination, location.href), {
      signal: ticket.controller.signal,
      // Only the unified library's authenticated import binding may choose an
      // unlisted mission. Its receiving host still validates the imported pack.
      runtimeOnly: ticket.libraryTarget?.collection === 'Custom',
    });
    modeDepartureCurrent(ticket);
  }
  function syncAuthoredModeLinks() {
    const href =
      (librarySourceReturn?.mode === 'versus' && librarySourceDestination) ||
      authoredJourneyModeHref(currentAuthoredModeRoute(), 'versus') ||
      modeDestinations.versus;
    for (const id of ['shell-versus', 'shell-title-versus']) $(id).setAttribute('href', href);
  }
  function prepareModeHint(ticket) {
    if (ticket.kind === 'library') {
      if (ticket.journeyRouteId || ticket.libraryMode === 'solo')
        return { token: null, href: ticket.libraryHref };
      const prepared =
        ticket.libraryMode === 'versus'
          ? modeReturnV2.prepare({
              origin: 'solo-missions',
              destination: 'versus',
              selection: ticket.selection,
            })
          : modeReturn.prepare(ticket.selection);
      return {
        token: prepared.token,
        href: missionLibraryHref({
          baseURL: location.href,
          currentMode: 'solo',
          mode: ticket.libraryMode,
          journey:
            ticket.libraryTarget.collection === 'Journey'
              ? ticket.libraryTarget.editionId
              : 'legacy',
          missionId: ticket.libraryTarget.id,
          sourceJourney: 'legacy',
          returnToken: prepared.token,
        }),
      };
    }
    if (librarySourceReturn?.mode === ticket.kind)
      return {
        token: null,
        href: new URL(modeDestination(ticket), gameDocumentURL(location.href)).href,
      };
    if (ticket.kind === 'catalogue')
      return {
        token: null,
        href: new URL(modeDestination(ticket), gameDocumentURL(location.href)).href,
      };
    // Authored progress and suspended attempts already have their own route.
    // Do not write a Legacy selection bookmark for a candidate execution.
    if (ticket.journeyRouteId)
      return {
        token: null,
        href: new URL(modeDestination(ticket), gameDocumentURL(location.href)).href,
      };
    return ticket.kind === 'versus'
      ? modeReturnV2.prepare({
          origin: 'solo-missions',
          destination: 'versus',
          selection: ticket.selection,
        })
      : modeReturn.prepare(ticket.selection);
  }
  function clearModeHint(ticket) {
    if (ticket.token)
      ((ticket.kind === 'library' ? ticket.libraryMode : ticket.kind) === 'versus'
        ? modeReturnV2
        : modeReturn
      ).clear(ticket.token);
  }
  function cancelModeDeparture({ close = false, restore = false, clearHint = false } = {}) {
    const ticket = modeDeparture;
    if (!ticket) return;
    ticket.controller.abort();
    modeDeparture = null;
    if (clearHint) clearModeHint(ticket);
    if (close && $('mode-leave-dialog').open) $('mode-leave-dialog').close();
    if (restore && ticket.libraryReady && !document.hidden && document.hasFocus?.() !== false) {
      if (!$('shell-home').open) $('shell-home').showModal();
      $('shell-demo')?.focus({ preventScroll: true });
      return;
    }
    if (
      restore &&
      ticket.kind === 'library' &&
      !document.hidden &&
      document.hasFocus?.() !== false
    ) {
      unifiedChooser?.restore();
      return;
    }
    if (
      restore &&
      (ticket.origin !== 'solo-title' || ticket.isCurrent()) &&
      !document.hidden &&
      document.hasFocus?.() !== false &&
      availableFocusTarget(ticket.opener)
    )
      ticket.opener.focus({ preventScroll: true });
    // As with First Flight, only explicit Resume/new attempt releases the save hold.
  }
  function modeSelection() {
    return {
      campaignKey: activeEntry.baseCampaignKey || campaignKey(campaign),
      levelId: campaign.levels[levelIndex].id,
      themeId: theme.id,
    };
  }
  function modeDepartureCurrent(ticket) {
    if (
      document.hidden ||
      document.hasFocus?.() === false ||
      modeDeparture !== ticket ||
      ticket.controller.signal.aborted ||
      (ticket.origin === 'solo-title' && !ticket.isCurrent()) ||
      (ticket.libraryTarget &&
        unifiedLibrary?.library.find(ticket.libraryTarget.id) !== ticket.libraryTarget) ||
      run !== ticket.run ||
      recorder !== ticket.recorder ||
      runId !== ticket.runId ||
      campaign !== ticket.campaign ||
      currentAuthoredModeRoute() !== ticket.journeyRouteId ||
      libraryGeneration !== ticket.generation ||
      canonicalJSON(modeSelection()) !== canonicalJSON(ticket.selection)
    )
      throw new Error(
        t('interface:soloDeparture.changed', {
          destination: modeLabel(ticket.kind, ticket.destinationLabel, ticket.presentationId),
        }),
      );
  }
  function modeDepartureMessage(ticket) {
    localizedText($('mode-leave-status'), () => {
      const flight = !ticket.unfinished
        ? t('interface:noUnfinishedFlightIsBeingReplaced')
        : ticket.savedRaw
          ? t('interface:yourPausedFlightWasSavedAndVerifiedContinueCanRestore')
          : t('interface:thisCurrentFlightIsSessionOnlyItRemainsPausedIn');
      const detail =
        ticket.kind === 'library'
          ? t('interface:soloDeparture.libraryDirect', {
              mission: contentText(ticket.libraryTarget, 'name'),
              fallback: ticket.fallback
                ? ' ' + t('interface:returnSelectionCouldNotBeSavedBackWillOpenThe')
                : '',
            })
          : ticket.kind === 'catalogue'
            ? ticket.presentationId !== undefined
              ? t('interface:soloDeparture.artwork', {
                  destination: modeLabel(
                    ticket.kind,
                    ticket.destinationLabel,
                    ticket.presentationId,
                  ),
                })
              : t('interface:soloDeparture.catalogue', {
                  destination: ticket.destinationLabel ?? catalogueLabel(),
                })
            : ticket.journeyRouteId
              ? t('interface:soloDeparture.journey', {
                  destination:
                    ticket.kind === 'team'
                      ? t('interface:soloDeparture.teamArenas')
                      : t('interface:versusWithItsOwnJourneyProgress'),
                })
              : ticket.origin === 'solo-title'
                ? t('interface:soloDeparture.titleReturn', {
                    destination: modeLabel(ticket.kind, ticket.destinationLabel),
                  })
                : ticket.fallback
                  ? t('interface:soloDeparture.fallbackReturn', {
                      destination: modeLabel(ticket.kind, ticket.destinationLabel),
                    })
                  : t('interface:soloDeparture.missionsReturn', {
                      destination: modeLabel(ticket.kind, ticket.destinationLabel),
                    });
      const failure = ticket.failure
        ? ' ' + t('interface:soloDeparture.saveUnverified', { error: ticket.failure })
        : '';
      return `${flight} ${detail}${failure}`;
    });
  }
  function unfinishedFlight() {
    return started && ['running', 'respawning'].includes(run?.status);
  }
  async function retainNavigationFlight(ticket, assertCurrent, onProgress) {
    const retained = await retainFlightForFirstFlight({
      run,
      recorder,
      campaign,
      campaignKey: campaignKey(campaign),
      themeId: theme.id,
      bodyId,
      runId,
      continuation: { direction: input.snapshotDirection() },
      presentationPins: flightPictures?.pins(),
      presentationLevel: campaign.levels.find((level) => level.id === run.levelId),
      ...(flightVisualLease ? { visualThemePin: flightVisualLease.pin() } : {}),
      ...(flightActorLease ? { actorAppearancePin: flightActorLease.pin() } : {}),
      mediaIdentityCatalog: flightPictures?.identityCatalog,
      storage: profileStorage(),
      sessionKey,
      signal: ticket.controller.signal,
      assertCurrent,
      assertWritable: async () => {
        assertWriter();
        const currentSaved = profileStorage().getItem(sessionKey);
        if (currentSaved !== null && currentSaved !== lastOwnedAttempt)
          throw new Error(t('interface:theSavedFlightIsNotThisTabSLastVerified'));
        if (!storedStateAdopted || recovery !== null || (await readAssetStore(journalKey)) !== null)
          throw new Error(t('interface:storedDataNeedsRecoveryBeforeThisFlightCanBeRetained'));
      },
      withStorageLock: (work) => {
        if (!profileLocks?.request)
          throw new Error(t('interface:checkedSavingIsUnavailableInThisBrowser'));
        return profileLocks.request(
          `${libraryKey}.backup-lock`,
          { signal: ticket.controller.signal },
          work,
        );
      },
      onProgress,
    });
    assertCurrent();
    const raw = profileStorage().getItem(sessionKey);
    if (!attemptReadbackMatches(raw, retained.session))
      throw new Error(t('interface:theCheckedSavedFlightChangedBeforeDepartureWasReady'));
    ticket.savedRaw = raw;
    lastOwnedAttempt = raw;
  }
  async function requestModeDeparture(
    kind,
    event,
    opener,
    {
      origin = 'solo-missions',
      isCurrent = null,
      libraryTarget = null,
      libraryMode = 'solo',
      libraryReady = false,
      editionId = null,
      presentationId = undefined,
    } = {},
  ) {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      (event.button !== undefined && event.button !== 0)
    )
      return;
    event.preventDefault();
    if (!Object.hasOwn(modeDestinations, kind)) return;
    const destinationEdition =
      editionId === null
        ? null
        : (runtimeContent?.currentCatalog ?? runtimeContent?.catalog).editions.find(
            (edition) =>
              edition.id === editionId && edition.brandId === runtimeContent.selection.brand.id,
          );
    const presentationChange = presentationId !== undefined;
    if (
      presentationChange &&
      (kind !== 'catalogue' ||
        !runtimeContent ||
        editionId !== null ||
        presentationId === runtimeContent.retainedPresentationId ||
        (presentationId !== null &&
          !runtimeContent.presentationHistory.some((item) => item.id === presentationId)))
    )
      return false;
    if (
      editionId !== null &&
      (kind !== 'catalogue' || !destinationEdition || editionId === runtimeContent.editionId)
    )
      return false;
    const destinationHref = destinationEdition
      ? runtimeContent.href({ edition: editionId, presentation: null })
      : presentationChange
        ? runtimeContent.href({ presentation: presentationId })
        : null;
    const destinationLabel = destinationEdition?.name ?? null;
    if (
      kind === 'library' &&
      (unifiedLibrary?.library.find(libraryTarget?.id) !== libraryTarget ||
        !libraryTarget?.modes.includes(libraryMode))
    )
      throw new Error(t('interface:thisMissionSelectionChangedRefreshTheLibrary'));
    if (
      !['solo-title', 'solo-missions'].includes(origin) ||
      (origin === 'solo-title' && (typeof isCurrent !== 'function' || !isCurrent()))
    )
      return;
    if (
      document.hidden ||
      document.hasFocus?.() === false ||
      modeDeparture ||
      missionReplacement ||
      restartRequest ||
      courseSession ||
      courseEntry ||
      practice ||
      sessionBusy ||
      contentSwitchBusy ||
      pictureThemePending ||
      backupBusy
    ) {
      warning(
        localizedMessage('interface:soloDeparture.finishCurrentOperation', {
          destination: modeLabel(kind, destinationLabel, presentationId),
        }),
      );
      return false;
    }
    const ticket = {
      kind,
      destinationHref,
      destinationLabel,
      destinationEditionId: destinationEdition?.id ?? null,
      presentationId,
      origin,
      isCurrent,
      opener,
      dialogShown: false,
      controller: new AbortController(),
      run,
      recorder,
      runId,
      campaign,
      generation: libraryGeneration,
      selection: modeSelection(),
      journeyRouteId: currentAuthoredModeRoute(),
      libraryTarget,
      libraryMode,
      libraryReady,
      libraryHref:
        kind === 'library'
          ? missionLibraryHref({
              baseURL: location.href,
              currentMode: 'solo',
              mode: libraryMode,
              journey: libraryTarget.collection === 'Journey' ? libraryTarget.editionId : 'legacy',
              missionId: libraryTarget.id,
              ready: libraryReady,
              sourceJourney: currentAuthoredModeRoute() || 'legacy',
            })
          : null,
      unfinished: unfinishedFlight(),
      savedRaw: null,
      fallback: false,
      pending: true,
    };
    modeDeparture = ticket;
    if (!ticket.unfinished && offlineAvailability().packageConsent) {
      try {
        await prepareModeDestination(ticket);
      } catch (error) {
        if (modeDeparture === ticket) {
          cancelModeDeparture({ restore: true, clearHint: true });
          if (error.name !== 'AbortError')
            warning(
              localizedMessage('interface:soloDeparture.openFailed', {
                destination: modeLabel(kind),
                error: error.message,
              }),
            );
        }
        return false;
      }
    }
    if (origin === 'solo-title' && !ticket.unfinished) {
      try {
        modeDepartureCurrent(ticket);
        location.href = new URL(modeDestination(ticket), gameDocumentURL(location.href)).href;
      } catch (error) {
        cancelModeDeparture({ restore: true });
        warning(
          localizedMessage('interface:soloDeparture.openFailed', {
            destination: modeLabel(kind, destinationLabel, presentationId),
            error: error.message,
          }),
        );
      }
      return;
    }
    if (!ticket.unfinished) {
      let prepared;
      try {
        prepared = prepareModeHint(ticket);
        ticket.token = prepared.token;
        modeDepartureCurrent(ticket);
        location.href = prepared.href;
        return;
      } catch {
        if (prepared) clearModeHint(ticket);
        if (modeDeparture !== ticket || ticket.controller.signal.aborted) return;
        ticket.fallback = true;
      }
    }
    if (ticket.unfinished) modeDepartureHold = true;
    pause(true);
    clearInput();
    $('mode-leave-confirm').disabled = true;
    localizedText($('mode-leave-status'), () =>
      ticket.unfinished
        ? t('interface:checkingTheSavedFlightBeforeLeavingYourCurrentFlightStays')
        : t('interface:checkingTheReturnToMissions'),
    );
    localizedText($('mode-leave-title'), () =>
      t('interface:soloDeparture.openTitle', {
        destination: modeLabel(kind, destinationLabel, presentationId),
      }),
    );
    localizedText($('mode-leave-confirm'), () =>
      t('interface:soloDeparture.leaveFor', {
        destination: modeLabel(kind, destinationLabel, presentationId),
      }),
    );
    ticket.dialogShown = true;
    try {
      $('mode-leave-dialog').showModal();
      $('mode-leave-stay').focus({ preventScroll: true });
    } catch (error) {
      cancelModeDeparture({ close: true, restore: true, clearHint: true });
      warning(localizedMessage('interface:soloDeparture.dialogFailed', { error: error.message }));
      return;
    }
    try {
      if (ticket.unfinished) {
        await retainNavigationFlight(
          ticket,
          () => modeDepartureCurrent(ticket),
          ({ ticks, total }) => {
            if (modeDeparture === ticket)
              localizedText($('mode-leave-status'), () =>
                t('interface:soloDeparture.verifyingSavedFlight', {
                  ticks,
                  total,
                }),
              );
          },
        );
      }
      modeDepartureCurrent(ticket);
    } catch (error) {
      if (modeDeparture !== ticket || ticket.controller.signal.aborted) return;
      ticket.savedRaw = null;
      ticket.failure = error.message;
    }
    if (modeDeparture !== ticket) return;
    ticket.pending = false;
    $('mode-leave-confirm').disabled = false;
    modeDepartureMessage(ticket);
  }
  $('shell-team').onclick = (event) => requestModeDeparture('team', event, $('shell-team'));
  $('shell-versus').onclick = (event) => requestModeDeparture('versus', event, $('shell-versus'));
  $('mode-leave-dialog').addEventListener('close', () => {
    if ($('mode-leave-dialog').open || !modeDeparture?.dialogShown) return;
    cancelModeDeparture({ restore: true, clearHint: true });
  });
  $('mode-leave-confirm').onclick = async () => {
    const ticket = modeDeparture;
    if (!ticket || ticket.pending) return;
    if (document.hidden || document.hasFocus?.() === false) {
      cancelModeDeparture({ close: true, clearHint: true });
      return;
    }
    ticket.pending = true;
    $('mode-leave-confirm').disabled = true;
    try {
      modeDepartureCurrent(ticket);
      if (ticket.savedRaw) {
        try {
          assertWriter();
          if (profileStorage().getItem(sessionKey) !== ticket.savedRaw)
            throw new Error(t('interface:savedFlightChanged'));
        } catch {
          ticket.savedRaw = null;
          modeDepartureMessage(ticket);
          $('mode-leave-status').textContent +=
            ' ' + t('interface:theSavedFlightChangedOrSavingBecameUnavailableReviewThis') + '';
          return;
        }
      }
      let destination = new URL(modeDestination(ticket), gameDocumentURL(location.href)).href;
      if (ticket.origin === 'solo-missions' && !ticket.fallback) {
        try {
          const prepared = prepareModeHint(ticket);
          ticket.token = prepared.token;
          destination = prepared.href;
        } catch {
          ticket.fallback = true;
          modeDepartureMessage(ticket);
          return;
        }
      }
      if (offlineAvailability().packageConsent) await prepareModeDestination(ticket, destination);
      if (ticket.savedRaw) {
        assertWriter();
        if (profileStorage().getItem(sessionKey) !== ticket.savedRaw)
          throw new Error(t('interface:savedFlightChanged'));
      }
      location.href = destination;
    } catch (error) {
      clearModeHint(ticket);
      if (modeDeparture === ticket && error.name !== 'AbortError')
        localizedText($('mode-leave-status'), () =>
          t('interface:soloDeparture.pausedError', { error: error.message }),
        );
    } finally {
      if (modeDeparture === ticket) {
        ticket.pending = false;
        $('mode-leave-confirm').disabled = false;
      }
    }
  };
  function cancelMissionReplacement() {
    const ticket = missionReplacement;
    if (!ticket) return;
    ticket.controller.abort();
    missionReplacement = null;
    if (ticket.installing) invalidateContentSwitch();
    // Keep the checked-save hold until explicit Resume or a new attempt.
  }
  function missionReplacementCurrent(ticket, { installed = false } = {}) {
    if (
      missionReplacement !== ticket ||
      ticket.controller.signal.aborted ||
      run !== ticket.run ||
      recorder !== ticket.recorder ||
      runId !== ticket.runId ||
      campaign !== ticket.campaign ||
      activeEntry !== ticket.entry ||
      libraryGeneration !== ticket.generation ||
      (!installed && packs !== ticket.packs) ||
      classId !== ticket.classId ||
      turnPolicy !== ticket.turnPolicy ||
      scenario !== ticket.scenario ||
      classRegistry !== ticket.classRegistry ||
      courseRequest?.lessonId !== ticket.lessonId ||
      courseBlocked() ||
      (ticket.launch &&
        (!ticket.launch.isCurrent() ||
          canonicalJSON(resolveMissionRequest(ticket.request).identity) !==
            ticket.targetIdentity)) ||
      canonicalJSON(modeSelection()) !== canonicalJSON(ticket.selection)
    )
      throw new Error(t('interface:theFlightOrAvailableMissionsChangedStayHereAndChoose'));
  }
  const libraryLaunchKinds = new Set(['library-installed', 'library-challenge', 'library-picture']);
  const isLibraryRequest = (request) => libraryLaunchKinds.has(request.kind);
  function requestLibraryLaunch(descriptor, launch) {
    if (
      !descriptor ||
      !libraryLaunchKinds.has(descriptor.kind) ||
      typeof descriptor.id !== 'string' ||
      descriptor.id.length > 512 ||
      !launch ||
      typeof launch.isCurrent !== 'function' ||
      typeof launch.onSelected !== 'function'
    )
      return Promise.reject(new Error(t('interface:thisLibraryLaunchIsUnavailable')));
    const request = { kind: descriptor.kind, id: descriptor.id };
    if (request.kind === 'library-picture') {
      if (typeof descriptor.recordIdentity !== 'string' || descriptor.recordIdentity.length > 8192)
        return Promise.reject(new Error(t('interface:thisEarnedPictureIdentityIsUnavailable')));
      request.recordIdentity = descriptor.recordIdentity;
    }
    if (!launch.isCurrent() || !availableFocusTarget(launch.opener)) return Promise.resolve(false);
    return requestMissionReplacement(request, launch.opener, launch);
  }
  function captureWorldPlay({ launch, signal }) {
    if (practice || courseSession || courseEntry || !storedStateAdopted || !persistenceReady)
      throw new Error(t('interface:returnToTheNormalGameAndResolveRecoveryBeforePlaying'));
    if (!launch?.isCurrent() || signal?.aborted)
      throw new DOMException(t('interface:chapterLaunchCancelled'), 'AbortError');
    const previous = worldAttempt,
      epoch = worldPlayEpoch;
    cancelWorldAttempt();
    if (worldAttempt || worldPlayEpoch !== epoch + (previous ? 1 : 0))
      throw new DOMException(t('interface:chapterLaunchSuperseded'), 'AbortError');
    const intent = {
      epoch: ++worldPlayEpoch,
      launch,
      signal,
      consumed: false,
      committed: null,
      run,
      recorder,
      runId,
      owner: flightPictures,
      entry: activeEntry,
      campaign,
      levelIndex,
      theme,
      themeOverride,
      seed,
      classId,
      turnPolicy,
      scenario,
      practice,
      started,
      generation: libraryGeneration,
      difficulty: library.preferences.campaignDifficulty,
      writable: writer.writable,
      persistenceReady,
      storedStateAdopted,
    };
    worldPlayIntents.set(launch, intent);
    // Keep the audio gesture before the download/readiness awaits.
    activateAudio().catch(() => {});
  }
  function assertWorldPlay(launch) {
    const intent = worldPlayIntents.get(launch);
    if (
      !intent ||
      intent.consumed ||
      intent.epoch !== worldPlayEpoch ||
      intent.signal?.aborted ||
      !launch.isCurrent() ||
      document.hidden ||
      !document.hasFocus() ||
      run !== intent.run ||
      recorder !== intent.recorder ||
      runId !== intent.runId ||
      flightPictures !== intent.owner ||
      activeEntry !== intent.entry ||
      campaign !== intent.campaign ||
      levelIndex !== intent.levelIndex ||
      theme !== intent.theme ||
      themeOverride !== intent.themeOverride ||
      seed !== intent.seed ||
      classId !== intent.classId ||
      turnPolicy !== intent.turnPolicy ||
      scenario !== intent.scenario ||
      practice !== intent.practice ||
      started !== intent.started ||
      libraryGeneration !== intent.generation ||
      library.preferences.campaignDifficulty !== intent.difficulty ||
      writer.writable !== intent.writable ||
      persistenceReady !== intent.persistenceReady ||
      storedStateAdopted !== intent.storedStateAdopted ||
      courseBlocked() ||
      courseEntry ||
      modeDeparture ||
      restartRequest ||
      contentSwitchBusy ||
      backupBusy ||
      sessionBusy ||
      pictureThemePending
    )
      throw new DOMException(
        t('interface:chapterLaunchCancelledYourCurrentFlightIsKept'),
        'AbortError',
      );
    return intent;
  }
  async function requestWorldPlay(
    pack,
    {
      signal,
      launch,
      onStatus,
      campaignId,
      levelId,
      levelRevision,
      rulesEdition,
      prepareOnly = false,
    },
  ) {
    assertWorldPlay(launch);
    if (signal?.aborted || (pack !== null && !packs.packs.includes(pack)))
      throw new Error(t('interface:installedContentChangedChoosePlayAgain'));
    const entry =
      pack === null ? baseEntry : resolvePackCampaign(pack, campaignId ?? pack.campaigns[0].id);
    const request = {
      kind: 'world-play',
      id: campaignKey(entry.campaign),
      sourcePackId: pack?.id ?? null,
      pack,
      ...(pack === null ? { baseEntry } : {}),
      launch,
      signal,
      onStatus,
      rulesEdition,
      prepareOnly,
      ...(levelId !== undefined ? { levelId } : {}),
      ...(levelRevision !== undefined ? { levelRevision } : {}),
    };
    const selected = await requestMissionReplacement(request, launch.opener, launch);
    if (!selected && launch.isCurrent()) {
      if (resolveMissionRequest(request).same)
        preparationStatus(
          onStatus,
          t('interface:thisChapterIsAlreadyActiveYourCurrentFlightIsKept'),
          'ready',
          launch.isCurrent,
        );
      else if (missionReplacement?.launch === launch)
        preparationStatus(
          onStatus,
          t('interface:reviewReplacePlayStayKeepsYourCurrentFlightPaused'),
          'ready',
          launch.isCurrent,
        );
    }
    return selected;
  }
  function cancelWorldAttempt() {
    const ticket = worldAttempt;
    if (!ticket) return;
    worldAttempt = null;
    ++worldPlayEpoch;
    ticket.controller.abort();
    ticket.visuals?.release();
    ticket.visuals = null;
    ticket.actors?.release();
    ticket.actors = null;
    const pictures = ticket.pictures;
    ticket.pictures = null;
    pictures?.dispose();
  }
  function worldAttemptCurrent(ticket) {
    if (
      worldAttempt !== ticket ||
      ticket.controller.signal.aborted ||
      actorPreferences.snapshot().revision !== ticket.actorChoice.revision
    )
      return false;
    try {
      if (assertWorldPlay(ticket.request.launch) !== ticket.intent) return false;
      if (ticket.replacement) missionReplacementCurrent(ticket.replacement);
      else if (missionReplacement) return false;
      const backupLock = profileStorage().getItem(`${libraryKey}.backup-lock`);
      const savedRaw = profileStorage().getItem(sessionKey);
      return (
        worldAttempt === ticket &&
        !ticket.controller.signal.aborted &&
        packs === ticket.packs &&
        (ticket.request.pack === null
          ? ticket.request.baseEntry === baseEntry
          : packs.packs.includes(ticket.request.pack)) &&
        backupLock === ticket.backupLock &&
        savedRaw === ticket.savedRaw &&
        assertWorldPlay(ticket.request.launch) === ticket.intent
      );
    } catch {
      return false;
    }
  }
  function assertWorldArtworkOwner(entry) {
    const key = campaignKey(entry.campaign);
    const presentation = (candidate, themeId) => ({
      theme: candidate.themes.find((item) => item.id === themeId),
      backgrounds: candidate.campaign.levels.map((level) => ({
        id: level.id,
        background:
          candidate.levelVisuals?.find((item) => item.levelId === level.id)?.visualOverrides
            ?.background ??
          candidate.visualOverrides?.background ??
          null,
      })),
      external:
        chapterSnapshot?.index?.chapters.find((item) => item.id === candidate.sourcePackId)?.id ??
        null,
    });
    for (const other of installedEntries) {
      if (other.sourcePackId === entry.sourcePackId || campaignKey(other.campaign) !== key)
        continue;
      for (const theme of entry.themes) {
        if (!other.themes.some((item) => item.id === theme.id)) continue;
        if (
          canonicalJSON(presentation(entry, theme.id)) !==
          canonicalJSON(presentation(other, theme.id))
        )
          throw new Error(
            t('interface:theseInstalledEditionsShareACampaignIdentityButHaveDifferent'),
          );
      }
    }
  }
  async function prepareWorldAttempt(request, replacement = null) {
    const intent = assertWorldPlay(request.launch);
    if (worldAttempt) return false;
    const target = resolveMissionRequest(request);
    assertWorldArtworkOwner(target.entry);
    const entry = createExecutionCatalog([target.entry]).select(
      campaignKey(target.entry.campaign),
      intent.difficulty,
    );
    if (!entry) throw new Error(t('interface:thisChapterDoesNotSupportTheSelectedDifficulty'));
    const selection = difficultyNavigation.selection(
      entry,
      library.campaigns,
      progressFor(library, entry.campaign),
    );
    const destinationIndex = installedMissionExecutionIndex(target, entry, selection.levelIndex);
    if (request.prepareOnly && !missionAvailable(destinationIndex, entry))
      throw new Error(t('interface:thatMissionIsUnavailableOrStillLocked'));
    const level = entry.campaign.levels[destinationIndex];
    const nextTheme =
      entry.themes.find((item) => item.id === (level.themeId || entry.campaign.themeId)) ||
      entry.themes[0];
    const nextClassId = entry.classRecipes.some((item) => item.id === classId)
      ? classId
      : entry.classRecipes[0].id;
    const options = { seed, turnPolicy, classId: nextClassId, classRecipes: entry.classRecipes };
    const ticket = {
      request,
      intent,
      actorChoice: actorPreferences.snapshot(),
      replacement,
      packs,
      controller: new AbortController(),
      pictures: null,
      savedRaw: null,
      backupLock: null,
    };
    worldAttempt = ticket;
    const cancel = () => {
      if (worldAttempt === ticket) cancelWorldAttempt();
    };
    const signals = [request.signal, replacement?.controller.signal].filter(Boolean);
    for (const signal of signals) signal.addEventListener('abort', cancel, { once: true });
    const assertCurrent = () => {
      if (!worldAttemptCurrent(ticket))
        throw new DOMException(
          t('interface:chapterLaunchCancelledYourCurrentFlightIsKept'),
          'AbortError',
        );
    };
    try {
      const assertOwner = () => {
        if (
          worldAttempt !== ticket ||
          ticket.controller.signal.aborted ||
          assertWorldPlay(request.launch) !== intent
        )
          throw new DOMException(t('interface:chapterLaunchSuperseded'), 'AbortError');
      };
      assertOwner();
      ticket.backupLock = profileStorage().getItem(`${libraryKey}.backup-lock`);
      assertOwner();
      ticket.savedRaw = profileStorage().getItem(sessionKey);
      assertOwner();
      assertCurrent();
      preparationStatus(
        request.onStatus,
        localizedMessage('interface:solo.preparingMission', {
          mission: contentText(level, 'name'),
        }),
        'preparing',
        () => worldAttemptCurrent(ticket),
      );
      assertCurrent();
      const nextRun = createRun(applyGameplayTuning(level, nextGameplayTuning(entry)), options);
      const nextRunId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const nextRecorder = createRecorder(nextRun.level, options, buildVersion);
      ticket.pictures = newFlightPictures({
        nextRun,
        nextRunId,
        entry,
        nextThemeId: nextTheme.id,
        legacy: false,
      });
      await ticket.pictures.ensure(nextTheme.id, {
        signal: ticket.controller.signal,
        onStatus: (status) =>
          preparationStatus(
            request.onStatus,
            () =>
              t('interface:picture.missionStatus', {
                name: contentText(level, 'name'),
                message: flightPictureStatus(status),
              }),
            status.stage,
            () => worldAttemptCurrent(ticket),
          ),
      });
      assertCurrent();
      ticket.visuals = await prepareFreshAttemptVisuals(entry, level, nextTheme.id, {
        signal: ticket.controller.signal,
        onStatus: request.onStatus,
      });
      assertCurrent();
      ticket.actors = await prepareAttemptActors(entry, level, nextTheme.id, {
        style: ticket.actorChoice.actorStyle,
        signal: ticket.controller.signal,
        onStatus: request.onStatus,
      });
      assertCurrent();
      const preparedAttempt = {
        kind: 'world-play',
        ticket,
        entry,
        levelIndex: destinationIndex,
        theme: nextTheme,
        classId: nextClassId,
        run: nextRun,
        runId: nextRunId,
        recorder: nextRecorder,
        pictures: ticket.pictures,
      };
      const adopted = prepare({ preparedAttempt });
      if (!adopted)
        throw new DOMException(
          t('interface:chapterLaunchCancelledYourCurrentFlightIsKept'),
          'AbortError',
        );
      return true;
    } catch (error) {
      if (intent.consumed) {
        contentStatus(t('interface:theChapterWasPreparedButCouldNotStartReviewThe'), true);
        throw new Error(t('errors:solo.preparationChanged', { error: error.message }));
      }
      throw error;
    } finally {
      for (const signal of signals) signal.removeEventListener('abort', cancel);
      if (worldAttempt === ticket) worldAttempt = null;
      ticket.visuals?.release();
      ticket.visuals = null;
      ticket.actors?.release();
      ticket.actors = null;
      const pictures = ticket.pictures;
      ticket.pictures = null;
      pictures?.dispose();
    }
  }
  function finishWorldPlay(request) {
    const intent = worldPlayIntents.get(request.launch);
    const prepared = intent?.committed;
    if (!prepared) return false;
    const current = () =>
      worldPlayEpoch === prepared.ticket.adoptionEpoch &&
      run === prepared.run &&
      runId === prepared.runId &&
      recorder === prepared.recorder &&
      flightPictures === prepared.pictures &&
      activeEntry === prepared.entry &&
      campaign === prepared.entry.campaign &&
      levelIndex === prepared.levelIndex &&
      theme === prepared.theme &&
      classId === prepared.classId &&
      !themeOverride &&
      seed === intent.seed &&
      turnPolicy === intent.turnPolicy &&
      packs === prepared.ticket.packs &&
      libraryGeneration === intent.generation &&
      library.preferences.campaignDifficulty === intent.difficulty &&
      writer.writable === intent.writable &&
      persistenceReady === intent.persistenceReady &&
      storedStateAdopted === intent.storedStateAdopted &&
      !started &&
      paused &&
      $('game-overlay').dataset.kind === 'ready' &&
      !practice &&
      !scenario &&
      !courseBlocked() &&
      !courseEntry &&
      !modeDeparture &&
      !missionReplacement &&
      !restartRequest &&
      !contentSwitchBusy &&
      !backupBusy &&
      !sessionBusy &&
      !pictureThemePending &&
      !document.hidden &&
      document.hasFocus();
    if (!current() || !request.launch.isCurrent()) return false;
    // The accepted attempt owns its decoded pictures before closing aborts the
    // panel's operation signal. Closing alone never authorizes a newer attempt.
    request.launch.onStarted();
    if (request.prepareOnly) {
      if (current()) request.launch.onSelected();
      return current();
    }
    if (current() && !dialogOpen()) resume();
    return started && run === prepared.run;
  }
  async function requestWorldLaunch(entry, launch, onStatus) {
    if (
      !entry ||
      !launch ||
      typeof launch.isCurrent !== 'function' ||
      typeof launch.onSelected !== 'function' ||
      !launch.isCurrent()
    )
      return Promise.resolve(false);
    // More worlds owns a temporarily disabled Choose during verification. Its
    // persistent launch lease, not Library's available-opener check, owns this
    // handoff. The same checked replacement gate retains the current flight.
    const request = { kind: 'library-installed', id: campaignKey(entry.campaign) };
    const selected = await requestMissionReplacement(request, launch.opener, launch);
    if (!selected && launch.isCurrent()) {
      const target = resolveMissionRequest(request);
      if (target.same)
        preparationStatus(
          onStatus,
          localizedMessage('interface:solo.alreadySelected', { target: target.title }),
          'ready',
          launch.isCurrent,
        );
      else if (missionReplacement?.launch === launch)
        preparationStatus(
          onStatus,
          t('interface:reviewTheChapterChoiceStayKeepsYourCurrentFlightPaused'),
          'ready',
          launch.isCurrent,
        );
    }
    return selected;
  }
  function isSetupRequest(request) {
    return ['class', 'steering', 'lesson'].includes(request.kind);
  }
  function restoreReplacementSelectors() {
    refreshContentSelectors();
    $('campaign-select').value = modeSelection().campaignKey;
    $('class-select').value = classId;
    $('turn-select').value = turnPolicy;
    if (courseSession) $('first-flight-select').value = courseRequest.lessonId;
  }
  function resolveMissionRequest(request) {
    if (request.kind === 'world-play') {
      const selection = {
        packs,
        pack: request.pack,
        sourcePackId: request.sourcePackId,
        campaignIdentity: request.id,
        levelId: request.levelId,
        levelRevision: request.levelRevision,
      };
      if (request.pack === null && request.baseEntry !== baseEntry)
        throw new Error(t('interface:thisBaseMissionChangedChoosePlayAgain'));
      const original =
        request.pack === null
          ? resolveCampaignMissionTarget({ ...selection, entry: baseEntry })
          : resolveInstalledMissionTarget(selection);
      const target = {
        ...original,
        entry: projectClassicCurrentRulesEntry(original.entry, request.rulesEdition),
      };
      return {
        ...target,
        same:
          !request.prepareOnly &&
          unfinishedFlight() &&
          activeEntry.sourcePackId === request.sourcePackId &&
          modeSelection().campaignKey === campaignKey(target.entry.campaign) &&
          (target.levelIndex === null || levelIndex === target.levelIndex),
      };
    }
    if (request.kind === 'library-installed') {
      const entry = installedEntries.find(
        (item) => item.sourcePackId && campaignKey(item.campaign) === request.id,
      );
      if (!entry) throw new Error(t('interface:thatExactInstalledCampaignIsNoLongerAvailable'));
      return {
        same:
          (entry.baseCampaignKey || campaignKey(entry.campaign)) === modeSelection().campaignKey,
        title: entry.campaign.title || entry.campaign.name || entry.campaign.id,
        entry,
        identity: {
          kind: request.kind,
          campaignKey: campaignKey(entry.campaign),
          sourcePackId: entry.sourcePackId,
        },
      };
    }
    if (request.kind === 'library-challenge') {
      const match = /^route-(\d{4}-\d\d-\d\d)-(daily|calm|expert)$/.exec(request.id);
      if (!match) throw new Error(t('interface:thatChallengeIsUnavailable'));
      const next = challengeCampaign(match[1], match[2], baseEntry.classRecipes);
      return {
        same: campaignKey(next) === modeSelection().campaignKey,
        title: next.name,
        entry: { ...baseEntry, campaign: next, activity: 'challenge' },
        identity: { kind: request.kind, campaignKey: campaignKey(next) },
      };
    }
    if (request.kind === 'library-picture') {
      const item = library.gallery.find((row) => row.key === request.id);
      if (!item || canonicalJSON(item) !== request.recordIdentity)
        throw new Error(t('interface:thatEarnedPictureChangedReopenItBeforeReplaying'));
      const picture = createGalleryDifficultyResolver(executionEntries()).picture(item);
      if (!picture)
        throw new Error(t('interface:reinstallThisPictureSExactCampaignBeforeReplaying'));
      const options = {
        levelId: item.levelId,
        themeId: item.themeId,
        seed: item.seed ?? 1,
        ...(picture.difficulty ? { difficulty: picture.difficulty } : {}),
      };
      return {
        same: false,
        title: t('interface:solo.replayMission', {
          mission: contentText(picture.level, 'name'),
        }),
        entry: picture.entry,
        options,
        identity: {
          kind: request.kind,
          recordIdentity: request.recordIdentity,
          campaignKey: campaignKey(picture.entry.campaign),
          ...options,
        },
      };
    }
    if (request.kind === 'lesson') {
      if (!courseSession) throw new Error(t('interface:firstFlightIsNotActive'));
      const lesson = getFirstFlightLesson(request.id);
      return { same: courseRequest.lessonId === lesson.id, title: lesson.title };
    }
    if (request.kind === 'class') {
      const recipe = (scenario?.classRecipes || classRegistry).find(
        (item) => item.id === request.id,
      );
      if (courseSession || !recipe) throw new Error(t('interface:thatStartingClassIsUnavailable'));
      return {
        same: classId === request.id,
        title: t('interface:solo.startingClass', { class: recipe.label }),
      };
    }
    if (request.kind === 'steering') {
      if (!['immediate', 'grid-center'].includes(request.id))
        throw new Error(t('interface:thatSteeringPolicyIsUnavailable'));
      return {
        same: turnPolicy === request.id,
        title: t('interface:solo.steering', {
          steering:
            request.id === 'immediate' ? t('interface:immediate') : t('interface:gridBuffer'),
        }),
      };
    }
    if (request.kind === 'level' || request.kind === 'card') {
      const index = campaign.levels.findIndex((level) => level.id === request.id);
      if (index < 0 || !missionAvailable(index))
        throw new Error(t('interface:thatMissionIsUnavailableOrStillLocked'));
      return {
        same: campaign.levels[levelIndex].id === request.id,
        title: campaign.levels[index].name,
      };
    }
    if (request.kind === 'campaign') {
      const entry = catalog().find((item) => campaignKey(item.campaign) === request.id);
      if (!entry) throw new Error(t('interface:thisCampaignIsNotInstalled'));
      return {
        same:
          (entry.baseCampaignKey || campaignKey(entry.campaign)) === modeSelection().campaignKey,
        title: entry.campaign.title || entry.campaign.name || entry.campaign.id,
        entry,
      };
    }
    if (request.kind === 'pack') {
      const pack = request.id
        ? packs.packs.find((item) => item.id === request.id) ||
          packCatalog.packs.find((item) => item.id === request.id)
        : null;
      if (request.id && !pack) throw new Error(t('interface:thisChapterIsUnavailable'));
      return {
        same: request.id
          ? activeEntry.sourcePackId === request.id
          : modeSelection().campaignKey === campaignKey(baseEntry.campaign),
        title:
          pack?.name ||
          baseEntry.campaign.title ||
          baseEntry.campaign.name ||
          baseEntry.campaign.id,
      };
    }
    throw new Error(t('interface:unknownMissionAction'));
  }
  async function applyMissionRequest(request, ticket = null) {
    const target = resolveMissionRequest(request);
    if (request.kind === 'world-play') return prepareWorldAttempt(request, ticket);
    if (isLibraryRequest(request)) {
      if (ticket) {
        missionReplacementCurrent(ticket);
        ticket.adopting = true;
      }
      selectEntry(target.entry, target.options);
      contentStatus(
        localizedMessage('interface:solo.missionSelectedDeploy', {
          mission: contentText(campaign.levels[levelIndex], 'name'),
        }),
      );
      return true;
    }
    if (request.kind === 'lesson') {
      selectCourseLesson(request.id);
      return true;
    }
    if (isSetupRequest(request)) {
      if (request.kind === 'class') classId = request.id;
      else turnPolicy = request.id;
      demo = false;
      preferences(request.kind === 'class' ? { classId } : { turnPolicy });
      if (courseSession) selectCourseLesson(courseRequest.lessonId);
      else prepare();
      return true;
    }
    if (request.kind === 'pack') {
      if (ticket) ticket.installing = true;
      return activatePack(request.id, {
        preserveCurrentRun: !!ticket,
        beforeSelect: ticket
          ? () => missionReplacementCurrent(ticket, { installed: true })
          : undefined,
      });
    }
    if (request.kind === 'campaign') {
      selectEntry(target.entry);
      contentStatus(localizedMessage('interface:solo.selectedReady', { target: target.title }));
    } else if (request.kind === 'level') return selectLevel(request.id);
    else {
      leavePractice();
      levelIndex = campaign.levels.findIndex((level) => level.id === request.id);
      prepare();
      rememberSelection();
      contentStatus(
        localizedMessage('interface:solo.missionSelectedDeploy', {
          mission: contentText(campaign.levels[levelIndex], 'name'),
        }),
      );
      if (!ticket) focusMission();
    }
    return true;
  }
  function missionReplacementMessage(ticket) {
    const play = ticket.request.kind === 'world-play' && !ticket.request.prepareOnly;
    const setup = isSetupRequest(ticket.request);
    const action = () =>
      isSetupRequest(ticket.request)
        ? courseSession
          ? t('interface:prepareFreshLesson')
          : t('interface:prepareFreshAttempt')
        : play
          ? t('interface:replacePlay')
          : t('interface:replace');
    localizedText($('mission-replace-status'), () => {
      const message = ticket.sessionOnly
        ? t(
            play
              ? 'interface:soloRecovery.sessionOnlyPlay'
              : 'interface:soloRecovery.sessionOnlyReplace',
            {
              attempt: courseSession
                ? t('interface:soloRecovery.lesson')
                : t('interface:soloRecovery.practiceAttempt'),
              action: action(),
            },
          )
        : ticket.savedRaw
          ? t(
              play
                ? 'interface:soloRecovery.savedPlay'
                : setup
                  ? 'interface:soloRecovery.savedSetup'
                  : 'interface:soloRecovery.savedSelection',
              { action: action() },
            )
          : t('interface:soloRecovery.unverified', { action: action() });
      const failure = ticket.failureKind
        ? t('interface:soloRecovery.saveChanged', { action: action() })
        : renderMessage(ticket.failure);
      return failure ? `${message} ${failure}` : message;
    });
  }
  async function requestMissionReplacement(request, opener, launch = null) {
    if (candidateHost && request.kind !== 'steering') {
      contentStatus(t('interface:useFindMissionsForThisAuthoredTestRouteItsScout'), true);
      refreshContentSelectors();
      return false;
    }
    // Only explicit player launch/selection adapters call this gate. Restore,
    // internal adoption and authored Hangar actions keep their contracts.
    const setup = isSetupRequest(request);
    if (
      missionReplacement ||
      modeDeparture ||
      restartRequest ||
      (courseSession && !setup) ||
      courseBlocked() ||
      sessionBusy ||
      contentSwitchBusy ||
      pictureThemePending ||
      backupBusy
    ) {
      restoreReplacementSelectors();
      return false;
    }
    let target;
    try {
      if (launch && !launch.isCurrent()) return false;
      target = resolveMissionRequest(request);
    } catch (error) {
      restoreReplacementSelectors();
      if (launch) throw error;
      contentStatus(error.message, true);
      return false;
    }
    if (setup && target.same) {
      restoreReplacementSelectors();
      return false;
    }
    if (!unfinishedFlight()) {
      if (launch && target.same) return false;
      const selected = await applyMissionRequest(request);
      if (selected && request.kind === 'world-play') finishWorldPlay(request);
      else if (selected && launch?.isCurrent()) launch.onSelected();
      return selected;
    }
    restoreReplacementSelectors();
    if (target.same) return false;
    // Practice retains its existing non-advertised selection behavior.
    if (practice && !setup && !launch) return applyMissionRequest(request);
    const ticket = {
      request:
        request.kind === 'world-play'
          ? request
          : {
              kind: request.kind,
              id: request.id,
              ...(request.kind === 'library-picture'
                ? { recordIdentity: request.recordIdentity }
                : {}),
            },
      opener,
      launch,
      targetIdentity: launch ? canonicalJSON(target.identity) : null,
      adopting: false,
      controller: new AbortController(),
      run,
      recorder,
      runId,
      campaign,
      entry: activeEntry,
      generation: libraryGeneration,
      packs,
      classId,
      turnPolicy,
      scenario,
      classRegistry,
      lessonId: courseRequest?.lessonId,
      sessionOnly: (setup || !!launch) && practice,
      selection: modeSelection(),
      savedRaw: null,
      pending: true,
      installing: false,
    };
    missionReplacement = ticket;
    modeDepartureHold = true;
    pause(true, { preserveWorld: request.kind === 'world-play' });
    clearInput();
    localizedText($('mission-replace-title'), () =>
      setup
        ? courseSession
          ? t('interface:prepareAFreshLesson')
          : t('interface:prepareAFreshAttempt')
        : t('interface:replaceThisFlight'),
    );
    localizedText($('mission-replace-confirm'), () =>
      setup
        ? courseSession
          ? t('interface:prepareFreshLesson')
          : t('interface:prepareFreshAttempt')
        : request.kind === 'world-play' && !request.prepareOnly
          ? t('interface:replacePlay')
          : t('interface:replace'),
    );
    localizedText(
      $('mission-replace-target'),
      () => `${scenario?.level.name || campaign.levels[levelIndex].name} → ${target.title}`,
    );
    localizedText($('mission-replace-status'), () =>
      t('interface:checkingTheSavedFlightYourCurrentFlightStaysPausedStay'),
    );
    $('mission-replace-confirm').disabled = true;
    $('mission-replace-dialog').showModal();
    $('mission-replace-stay').focus({ preventScroll: true });
    try {
      if (!ticket.sessionOnly)
        await retainNavigationFlight(
          ticket,
          () => missionReplacementCurrent(ticket),
          ({ ticks, total }) => {
            if (missionReplacement === ticket)
              localizedText($('mission-replace-status'), () =>
                t('interface:soloRecovery.verifyingSavedFlight', { ticks, total }),
              );
          },
        );
    } catch (error) {
      if (missionReplacement !== ticket || ticket.controller.signal.aborted) return false;
      ticket.savedRaw = null;
      ticket.failure = error.message;
    }
    if (missionReplacement !== ticket) return false;
    ticket.pending = false;
    $('mission-replace-confirm').disabled = false;
    missionReplacementMessage(ticket);
    return false;
  }
  missionReplacementFocusClearance = attachFocusClearance({
    container: $('mission-replace-dialog'),
    document,
  });
  $('mission-replace-dialog').addEventListener('close', () => {
    if ($('mission-replace-dialog').open) return;
    const ticket = missionReplacement;
    cancelMissionReplacement();
    if (ticket?.launch?.onCancelled?.({ dialog: $('mission-replace-dialog') }) === true) return;
    if ((!ticket?.launch || ticket.launch.isCurrent()) && availableFocusTarget(ticket?.opener))
      ticket.opener.focus({ preventScroll: true });
  });
  $('mission-replace-confirm').onclick = async () => {
    const ticket = missionReplacement;
    if (!ticket || ticket.pending) return;
    try {
      missionReplacementCurrent(ticket);
      resolveMissionRequest(ticket.request);
      if (ticket.savedRaw) {
        try {
          assertWriter();
          if (profileStorage().getItem(sessionKey) !== ticket.savedRaw)
            throw new Error(t('interface:savedFlightChanged'));
        } catch {
          ticket.savedRaw = null;
          ticket.failure = null;
          ticket.failureKind = 'save-changed';
          missionReplacementMessage(ticket);
          return;
        }
      }
      ticket.failure = null;
      ticket.failureKind = null;
      ticket.pending = true;
      // Keep the live escape action focused before disabling its opener.
      // Do not reclaim focus after a pointer choice or browser focus change.
      if (
        !document.hidden &&
        document.hasFocus() &&
        document.activeElement === $('mission-replace-confirm')
      )
        $('mission-replace-stay').focus({ preventScroll: true });
      $('mission-replace-confirm').disabled = true;
      localizedText($('mission-replace-status'), () =>
        isSetupRequest(ticket.request)
          ? t('interface:preparingTheRequestedFreshAttemptWithoutStartingIt')
          : t('interface:preparingTheSelectedMissionYourCurrentFlightStaysPausedUntil'),
      );
      const selected = await applyMissionRequest(ticket.request, ticket);
      if (missionReplacement !== ticket) return;
      missionReplacement = null;
      ticket.controller.abort();
      $('mission-replace-dialog').close();
      if (!selected) {
        if (availableFocusTarget(ticket.opener)) ticket.opener.focus({ preventScroll: true });
        return;
      }
      if (ticket.request.kind === 'world-play') finishWorldPlay(ticket.request);
      else if (ticket.launch) {
        if (ticket.launch.isCurrent()) ticket.launch.onSelected();
      } else if (ticket.request.kind === 'card') {
        // Missions remains the active parent, as for ordinary gallery selection.
        if ($('shell-missions').open)
          $('missions').querySelector('.selected')?.focus({ preventScroll: true });
        else focusMission();
      } else if (ticket.request.kind === 'lesson') $('start-button').focus({ preventScroll: true });
      else if (availableFocusTarget(ticket.opener)) ticket.opener.focus({ preventScroll: true });
    } catch (error) {
      if (missionReplacement !== ticket) return;
      ticket.pending = false;
      if (ticket.launch && ticket.adopting) {
        $('mission-replace-confirm').disabled = true;
        localizedText($('mission-replace-status'), () =>
          t('interface:soloRecovery.selectionFailed', { error: error.message }),
        );
      } else {
        ticket.failureKind = null;
        ticket.failure = localizedMessage('interface:soloRecovery.pausedError', {
          error: error.message,
        });
        $('mission-replace-confirm').disabled = false;
        missionReplacementMessage(ticket);
      }
    }
  };
  function selectCourseLesson(lessonId) {
    if (!courseSession || ['switching', 'leaving', 'ended'].includes(coursePhase)) return;
    getFirstFlightLesson(lessonId);
    coursePhase = 'switching';
    clearInput();
    sound.pause();
    courseRequest = { course: 'first-flight', lessonId, turnPolicy };
    scenario = createLessonScenario(lessonId, { turnPolicy, theme: courseTheme });
    classId = scenario.settings.classId;
    seed = scenario.settings.seed;
    theme = scenario.theme;
    bodyId = theme.player;
    practice = true;
    demo = false;
    coursePhase = 'ready';
    setTheme();
    prepare();
    $('start-button').focus({ preventScroll: true });
  }
  function nextCourseLesson(skip = false) {
    if (!courseSession || courseBlocked() || missionReplacement) return;
    const snapshot = courseSnapshot();
    if (!skip && snapshot?.outcome !== 'complete') return;
    if (skip && courseVisit[courseRequest.lessonId] !== 'complete')
      courseVisit[courseRequest.lessonId] = 'skipped';
    const index = FIRST_FLIGHT_LESSONS.findIndex((item) => item.id === courseRequest.lessonId);
    if (index + 1 < FIRST_FLIGHT_LESSONS.length)
      selectCourseLesson(FIRST_FLIGHT_LESSONS[index + 1].id);
    else leaveCourse();
  }
  function leaveCourse() {
    if (!courseSession || courseBlocked() || missionReplacement) return;
    clearInput();
    paused = true;
    sound.pause();
    celebrationActive = false;
    defeatActive = false;
    defeatPaused = false;
    defeatRemaining = 0;
    painter.skipCelebration?.();
    show('skip-celebration', false);
    show('show-result', false);
    if (courseEmbedded) {
      coursePhase = 'ended';
      show('game-overlay', true);
      $('game-overlay').dataset.kind = 'course-ended';
      show('pause-label', false);
      show('overlay-reading', true);
      show('overlay-footnote', true);
      show('overlay-menu', false);
      localizedText($('overlay-title'), () => t('interface:firstFlightEnded'));
      localizedText($('overlay-copy'), () =>
        t('interface:practiceAwardedNoProgressUseTheParentPageSGame'),
      );
      localizedText($('overlay-footnote'), () => '');
      for (const id of [
        'start-button',
        'retry-button',
        'next-button',
        'view-picture',
        'choose-mission',
        'result-medals',
        'retry-consequence',
      ])
        show(id, false);
      refreshCourse();
      controllerReading?.refresh();
      $('overlay-read').focus({ preventScroll: true });
    } else {
      coursePhase = 'leaving';
      refreshCourse();
      location.assign(runtimeContent?.href() ?? new URL('./', location.href).href);
    }
  }
  function challengeEntries() {
    const entries = [];
    for (const key of Object.keys(library.campaigns)) {
      const id = key.split('/')[0],
        match = /^route-(\d{4}-\d\d-\d\d)-(daily|calm|expert)$/.exec(id);
      if (match) {
        try {
          const c = challengeCampaign(match[1], match[2], baseClasses);
          entries.push({ ...baseEntry, campaign: c, activity: 'challenge' });
        } catch {}
      }
    }
    return entries;
  }
  function selectedCatalogEntry() {
    return {
      ...activeEntry,
      campaign: activeEntry.baseCampaign || activeEntry.campaign,
    };
  }
  function catalog() {
    const entries = new Map();
    for (const entry of [...installedEntries, ...challengeEntries(), selectedCatalogEntry()]) {
      const key = campaignKey(entry.campaign);
      if (!entries.has(key)) entries.set(key, entry);
    }
    return [...entries.values()];
  }
  function executionEntries() {
    // The installed execution catalog already owns immutable normalized entries.
    // Only dynamic routes need fresh identity validation; removed packs remain
    // archived records and cannot resolve a saved flight.
    const routes = new Map();
    for (const entry of [...challengeEntries(), selectedCatalogEntry()]) {
      if (
        entry.sourcePackId ||
        !/^route-\d{4}-\d\d-\d\d-(daily|calm|expert)$/.test(entry.campaign.id)
      )
        continue;
      const key = campaignKey(entry.campaign);
      if (!executionCatalog.find(key) && !routes.has(key)) routes.set(key, entry);
    }
    return [...(candidateHost?.entries ?? []), ...executionCatalog.entries, ...routes.values()];
  }
  function knownExecutionEntry(key) {
    if (typeof key !== 'string') return null;
    return (
      candidateHost?.entries.find(
        (entry) => candidateHost.owns(entry) && entry.executionKey === key,
      ) ?? executionCatalog.find(key)
    );
  }
  function currentSelection(options = {}) {
    if (candidateHost?.owns(activeEntry)) {
      const clears = journeyProfile.snapshot().clears.solo;
      const completed = campaign.levels.filter(
        (_, index) => clears[journeyMission(activeEntry, index)?.id],
      ).length;
      const index = campaign.levels.findIndex((level) => level.id === options.levelId);
      return {
        levelIndex: index < 0 ? 0 : index,
        overview: false,
        complete: completed === campaign.levels.length,
        completed,
        total: campaign.levels.length,
      };
    }
    return difficultyNavigation.selection(activeEntry, library.campaigns, progress, options);
  }
  function missionAvailable(index, entry = activeEntry) {
    if (journeyEnabled && journeyMission(entry, index)) return true;
    const selected =
      executionCatalog.select(
        entry.baseCampaignKey || campaignKey(entry.campaign),
        library.preferences.campaignDifficulty,
      ) || entry;
    const shared = difficultyNavigation.access(selected, library.campaigns);
    if (shared) return shared.levels[index]?.playable === true;
    return difficultyNavigation.playable(
      selected,
      library.campaigns,
      progressFor(library, selected.campaign),
      index,
    );
  }
  function availableBodies() {
    if (candidateHost?.owns(activeEntry))
      return new Set([
        ...activeEntry.themes.map((item) => item.player),
        ...(editionUI?.cosmeticBodies?.() ?? []),
      ]);
    return characterPresentations.availableBodies(
      difficultyNavigation.bodies(activeEntry, library.campaigns, progress),
    );
  }
  function currentAppearanceMilestones() {
    return difficultyNavigation.milestones(activeEntry, library.campaigns, progress);
  }
  function executionForEntry(entry, mode) {
    // Candidate editions are owned by their shared compiler, not the installed
    // Legacy pack catalog. Preserve that authority when restoring a saved preset.
    if (candidateHost?.owns(entry))
      return candidateHost.select(candidateHost.mission(entry, 0), mode);
    const baseKey = entry.baseCampaignKey || campaignKey(entry.campaign);
    if (entry.classicRulesSourceCampaignKey) {
      const authored = entry.sourcePackId
        ? installedEntries.find(
            (candidate) =>
              candidate.sourcePackId === entry.sourcePackId &&
              campaignKey(candidate.campaign) === entry.classicRulesSourceCampaignKey,
          )
        : campaignKey(baseEntry.campaign) === entry.classicRulesSourceCampaignKey
          ? baseEntry
          : null;
      if (!authored) throw new Error(t('interface:thisExactOriginalChapterIsNoLongerInstalled'));
      const projected = projectClassicCurrentRulesEntry(authored, entry.classicRulesEdition);
      return createExecutionCatalog([projected]).select(campaignKey(projected.campaign), mode);
    }
    if (!entry.sourcePackId) return executionCatalog.select(baseKey, mode) || entry;
    const authored = installedEntries.find(
      (candidate) =>
        candidate.sourcePackId === entry.sourcePackId &&
        campaignKey(candidate.campaign) === baseKey,
    );
    if (!authored)
      throw new Error(t('interface:thisExactChapterIsNoLongerInstalledChooseAnAvailable'));
    // Equal simulation identities may belong to different packs with distinct
    // presentation metadata. A difficulty projection must retain this owner.
    const shared = executionCatalog.select(baseKey, mode);
    if (shared?.sourcePackId === entry.sourcePackId) return shared;
    return createExecutionCatalog([authored]).select(baseKey, mode);
  }
  function applyNextDifficulty(mode = library.preferences.campaignDifficulty) {
    if (scenario || practice || courseSession) return;
    if (candidateHost?.owns(activeEntry)) {
      activeEntry = candidateHost.select(
        journeyMission(),
        journeyPreferences.snapshot().difficulty,
      );
      campaign = activeEntry.campaign;
      classRegistry = activeEntry.classRecipes;
      classId = 'scout';
      progress = progressFor(library, campaign);
      return;
    }
    const selected = executionForEntry(activeEntry, mode);
    if (!selected) return;
    activeEntry = selected;
    campaign = selected.campaign;
    classRegistry = selected.classRecipes;
    progress = progressFor(library, campaign);
  }
  function refreshDifficulty() {
    const nextPressure = gameplayTuning.snapshot(browsingJourneyPreferences.snapshot().difficulty);
    $('menu-difficulty').value = nextPressure.difficulty;
    $('menu-difficulty').disabled = contentSwitchBusy || backupBusy || sessionBusy;
    localizedText($('menu-difficulty-note'), () =>
      t('gameplay:tuning.menuNote', {
        difficulty: gameplayDifficultyLabel(nextPressure.difficulty),
        description: gameplayTuningDescription(nextPressure),
        admin: nextPressure.adminOverride ? t('interface:adminPlaytestNoNormalClearsOrAwards') : '',
        error: browsingJourneyPreferences.snapshot().error || gameplayTuning.status().error || '',
      }),
    );
    gameplayTuningPanel?.refresh();
    if (candidateHost?.owns(activeEntry)) {
      const next = journeyPreferences.snapshot();
      const catalogId =
        authoredRoute.source?.difficultyCatalogId ||
        authoredRoute.navigation.project.difficultyCatalogId;
      $('difficulty-select').replaceChildren(
        ...Object.keys(journeyDifficultyCatalog(catalogId).presets).map((id) =>
          localizedOption(() => gameplayDifficultyLabel(id), id),
        ),
      );
      $('difficulty-select').value = next.difficulty;
      $('difficulty-select').disabled = contentSwitchBusy || backupBusy || sessionBusy;
      const nextPreset = journeyPreset(next.difficulty, catalogId);
      localizedText($('difficulty-note'), () =>
        t('gameplay:tuning.flightNote', {
          current: gameplayDifficultyLabel(activeEntry.difficulty),
          next: gameplayDifficultyLabel(next.difficulty),
          rules: journeyPresetDescription(nextPreset, nextPressure.version),
          description: gameplayTuningDescription(nextPressure),
          error: next.error || '',
        }),
      );
      show('difficulty-details', false);
      const currentTuning = recoverGameplayTuning(run?.level);
      const currentPreset = journeyPreset(activeEntry.difficulty, catalogId);
      localizedText($('overlay-difficulty'), () =>
        t('gameplay:tuning.journeyNote', {
          difficulty: gameplayDifficultyLabel(activeEntry.difficulty),
          rules: activeJourneyRules(run, currentPreset, currentTuning?.version),
          motion: currentTuning
            ? t('gameplay:tuning.motion', {
                count: run.enemies.length,
                speed: formatNumber(run.level.rules.moveSpeed, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
                admin: currentTuning.adminOverride ? t('gameplay:tuning.adminBadge') : '',
              })
            : '',
        }),
      );
      show('overlay-difficulty', true);
      return;
    }
    const cue = difficultyCue({
      entry: activeEntry,
      nextMode: library.preferences.campaignDifficulty,
      started,
      recovering: sessionBusy,
      practice,
    });
    $('difficulty-select').value = library.preferences.campaignDifficulty;
    $('difficulty-select').disabled =
      !cue.available || courseSession || !!courseEntry || contentSwitchBusy || backupBusy;
    localizedText($('difficulty-note'), () =>
      t('gameplay:tuning.classicNote', {
        cue: difficultyCue({
          entry: activeEntry,
          nextMode: library.preferences.campaignDifficulty,
          started,
          recovering: sessionBusy,
          practice,
        }).copy,
        difficulty: gameplayDifficultyLabel(nextPressure.difficulty),
        description: gameplayTuningDescription(nextPressure),
      }),
    );
    const standard = executionCatalog.select(activeEntry.baseCampaignKey, 'standard'),
      gentle = executionCatalog.select(activeEntry.baseCampaignKey, 'gentle');
    show('difficulty-details', cue.available && !!standard && !!gentle);
    if (
      cue.available &&
      standard &&
      gentle &&
      (difficultyDetailsFor?.campaign !== standard.campaign ||
        difficultyDetailsFor?.levelIndex !== levelIndex)
    ) {
      $('difficulty-rule-details').replaceChildren(
        ...difficultyRuleComparison(
          standard.campaign.levels[levelIndex],
          gentle.campaign.levels[levelIndex],
        ).map((copy) => {
          const row = document.createElement('li');
          localizedText(row, () => copy);
          return row;
        }),
      );
      difficultyDetailsFor = { campaign: standard.campaign, levelIndex };
    }
    localizedText($('overlay-difficulty'), () =>
      cue.available ? t('gameplay:difficulty', { value1: cue.current, value2: cue.retry }) : '',
    );
    show('overlay-difficulty', cue.available);
  }
  function refreshCampaigns() {
    $('campaign-select').replaceChildren(
      ...catalog().map((e) =>
        localizedOption(
          () =>
            contentText(e.campaign, 'title') || contentText(e.campaign, 'name') || e.campaign.id,
          campaignKey(e.campaign),
        ),
      ),
    );
    $('campaign-select').value = activeEntry.baseCampaignKey || campaignKey(campaign);
    refreshContentSelectors();
  }
  function contentStatus(message, error = false, { busy = false, stage = 'preparing' } = {}) {
    for (const feedback of contentFeedback) {
      const options = { message, stage };
      if (busy && feedback.target.dataset.state === 'busy') feedback.lease.update(options);
      else {
        feedback.lease = feedback.presenter.begin(options);
        if (!busy) feedback.lease.finish({ message, state: error ? 'error' : 'ready' });
      }
      feedback.target.dataset.kind = error ? 'error' : 'status';
    }
  }
  function invalidateContentSwitch({ announce = false } = {}) {
    attemptFiles?.invalidate();
    const interrupted = contentSwitchBusy;
    packLaunchGuard.invalidate();
    contentSwitchBusy = false;
    $('pack-select').disabled = courseSession;
    $('level-select').disabled = courseSession;
    // Backup adoption shares this busy flag; it is not a pending pack launch.
    if (announce && interrupted && !backupBusy)
      contentStatus(t('interface:pendingPackLaunchCancelledYourNewerPlayChoiceIsKept'));
    else if (interrupted)
      for (const feedback of contentFeedback)
        if (feedback.target.dataset.state === 'busy') feedback.presenter.clear();
    return interrupted;
  }
  function refreshContentSelectors() {
    const installedIds = new Set(packs.packs.map((pack) => pack.id));
    const options = [
      localizedOption(
        () => t('gameplay:baseGameLevels', { value1: baseCampaign.levels.length }),
        '',
      ),
    ];
    for (const summary of packCatalog.packs) {
      const levels = summary.campaigns.reduce((total, item) => total + item.levels.length, 0);
      options.push(
        localizedOption(
          () =>
            `${contentText(summary, 'name')} · ${t('common:counts.levels', { count: levels })} · ${installedIds.has(summary.id) ? t('common:status.installed') : t('common:status.installOnSelect')}`,
          summary.id,
        ),
      );
    }
    for (const pack of packs.packs) {
      if (packCatalog.packs.some((item) => item.id === pack.id)) continue;
      const levels = pack.campaigns.reduce((total, item) => total + item.levels.length, 0);
      options.push(
        localizedOption(
          () =>
            t('gameplay:installed2', {
              value1: contentText(pack, 'name'),
              value2: levels,
              value3: levels === 1 ? 'level' : 'levels',
            }),
          pack.id,
        ),
      );
    }
    // Every adopted execution catalog compiles baseEntry first. Its owned key
    // already identifies the current base; selector repaint needs no raw-map validation.
    const baseKey = executionCatalog.entries[0].baseCampaignKey;
    const currentKey = activeEntry.baseCampaignKey || campaignKey(campaign);
    let selectedPack = activeEntry.sourcePackId || '';
    if (!activeEntry.sourcePackId && currentKey !== baseKey) {
      selectedPack = `campaign:${currentKey}`;
      options.push(
        localizedOption(
          () => contentText(campaign, 'title') || contentText(campaign, 'name') || campaign.id,
          selectedPack,
          true,
          true,
        ),
      );
    }
    $('pack-select').replaceChildren(...options);
    $('pack-select').value = selectedPack;
    $('level-select').replaceChildren(
      ...campaign.levels.map((level, index) => {
        const available = missionAvailable(index);
        return localizedOption(
          () =>
            `${String(index + 1).padStart(2, '0')} · ${contentText(level, 'name')}${available ? '' : ' · ' + t('common:status.locked')}`,
          level.id,
          false,
          index === levelIndex,
        );
      }),
    );
    for (const [index, option] of [...$('level-select').options].entries())
      option.disabled = !missionAvailable(index);
    $('level-select').value = campaign.levels[levelIndex].id;
    $('pack-select').disabled = courseSession || contentSwitchBusy;
    $('level-select').disabled = courseSession || contentSwitchBusy;
    refreshDifficulty();
  }
  function persistProfile({ mode = 'merge' } = {}) {
    if (courseSession || courseEntry)
      return { ok: false, warning: t('interface:trainingDoesNotSavePlayerLibraryChanges') };
    let saved;
    try {
      saved =
        persistenceReady && writer.writable
          ? saveLibrary(profileStorage(), libraryKey, library, recovery, {
              baseline: libraryBaseline,
              generation: libraryGeneration,
              mode,
            })
          : {
              ok: false,
              get warning() {
                return (
                  profileWriterMessage(writer) ||
                  t('interface:storageRecoveryMustFinishBeforeSavingExportYourSessionBefore')
                );
              },
            };
    } catch {
      saved = { ok: false, warning: t('interface:storageIsUnavailableExportYourPlayerLibrary') };
    }
    saveSucceeded = saved.ok;
    if (saved.ok) {
      recovery = null;
      library = saved.library;
      libraryBaseline = library;
      libraryGeneration = saved.generation;
      progress = progressFor(library, campaign);
      adoptControllerBoostMode();
    } else {
      localizedText($('save-warning'), () => saved.warning);
      show('save-warning', true);
    }
    refreshDifficulty();
    refreshTextSize();
    refreshScreenSteeringHand();
    return saved;
  }
  function preferences(patch) {
    if (courseEntry)
      return {
        ok: false,
        warning: t('interface:finishOrCancelTheCourseHandoffBeforeChangingSettings'),
      };
    library = updatePreferences(library, { ...library.preferences, ...patch });
    if (!practice) return persistProfile();
    refreshTextSize();
    refreshScreenSteeringHand();
    return {
      ok: false,
      warning: t('interface:practicePreferencesStayInThisSessionExportYourPlayerLibrary'),
    };
  }
  function cancelRestore() {
    if (restoreController) {
      restoreController.abort();
      clearPreparation();
    }
  }
  function rememberSelection() {
    const mission = journeyEnabled && journeyMission();
    if (mission && !practice && !scenario)
      journeyProfile.record({ type: 'select', mode: 'solo', missionId: mission.id });
    if (candidateHost?.owns(activeEntry)) return;
    return selectionBookmark.remember({
      campaignKey: activeEntry.baseCampaignKey || campaignKey(campaign),
      levelId: campaign.levels[levelIndex].id,
      themeId: theme.id,
    });
  }
  function journeyMission(entry = activeEntry, index = levelIndex) {
    if (candidateHost) return candidateHost.mission(entry, index);
    if (!journeyAuthority?.matches(entry)) return null;
    const authored = entry.baseCampaign || entry.campaign;
    const level = authored.levels[index];
    if (!level) return null;
    return journeyCatalog.find(
      journeyMissionId({
        packId: entry.sourcePackId ?? null,
        campaignId: authored.id,
        levelId: level.id,
      }),
    );
  }
  function journeyDestination() {
    const state = journeyProfile?.snapshot();
    const current = state && journeyCatalog.find(state.cursors.solo);
    return current && Object.hasOwn(state.clears.solo, current.id)
      ? nextJourneyMission(current.id) || current
      : current || (candidateHost ? journeyCatalog.missions[0] : null);
  }
  function journeySkipMission() {
    return journeyEnabled && !practice && !scenario && !courseSession && !campaignOverview
      ? journeyMission()
      : null;
  }
  function normalSoloSkipAvailable() {
    return (
      !practice &&
      !scenario &&
      !courseSession &&
      !campaignOverview &&
      !!run &&
      !!started &&
      ['running', 'respawning'].includes(run.status)
    );
  }
  function clearSkipConfirmation(message = '') {
    journeySkipArmed = null;
    journeySkipDestination = null;
    localizedText($('journey-skip'), () => t('interface:skipMission'));
    if (message) warning(message);
  }
  function cancelSkipForContentChange() {
    const armed = journeySkipArmed !== null;
    if (librarySkipResolution) cancelSkipResolution({ announce: false });
    if (armed) clearSkipConfirmation(localizedMessage('interface:solo.skipCancelledSetupChanged'));
  }
  function skipSnapshot() {
    return {
      run,
      recorder,
      runId,
      entry: activeEntry,
      campaign,
      levelIndex,
      theme,
      classId,
      seed,
      turnPolicy,
      difficulty: library.preferences.campaignDifficulty,
      journeyRevision: journeyPreferences?.snapshot().revision,
      actorRevision: actorPreferences.snapshot().revision,
      libraryGeneration,
      packs,
    };
  }
  function skipSnapshotCurrent(snapshot) {
    return (
      normalSoloSkipAvailable() &&
      paused &&
      snapshot?.run === run &&
      snapshot.recorder === recorder &&
      snapshot.runId === runId &&
      snapshot.entry === activeEntry &&
      snapshot.campaign === campaign &&
      snapshot.levelIndex === levelIndex &&
      snapshot.theme === theme &&
      snapshot.classId === classId &&
      snapshot.seed === seed &&
      snapshot.turnPolicy === turnPolicy &&
      snapshot.difficulty === library.preferences.campaignDifficulty &&
      snapshot.journeyRevision === journeyPreferences?.snapshot().revision &&
      snapshot.actorRevision === actorPreferences.snapshot().revision &&
      snapshot.libraryGeneration === libraryGeneration &&
      snapshot.packs === packs &&
      !document.hidden &&
      document.hasFocus?.() !== false
    );
  }
  function refreshJourneySkip() {
    const available = normalSoloSkipAvailable();
    show('journey-skip', available);
    if (!available) clearSkipConfirmation();
    else if (journeySkipDestination && !skipSnapshotCurrent(journeySkipDestination.snapshot))
      clearSkipConfirmation();
  }
  function nextJourneyMission(id) {
    return candidateHost ? candidateHost.next(id) : journeyCatalog.next(id);
  }
  function currentSoloLibraryMission(host) {
    const mission = journeyMission();
    if (mission) {
      const row = host.library
        .forMode('solo')
        .find(
          (item) =>
            item.collection === 'Journey' &&
            item.editionId === (authoredRoute?.id ?? DEFAULT_JOURNEY_ROUTES.solo) &&
            item.runtimeId === mission.id,
        );
      if (!row) throw new Error('The exact current Journey mission is unavailable.');
      return row;
    }
    return retainedLibraryMission(host.library, {
      mode: 'solo',
      levelId: campaign.levels[levelIndex].id,
      campaignKey: activeEntry.classicRulesSourceCampaignKey
        ? `${activeEntry.classicRulesSourceCampaignKey}::${activeEntry.classicRulesEdition}`
        : activeEntry.baseCampaignKey || campaignKey(campaign),
      sourcePackId: activeEntry.sourcePackId ?? null,
      rulesEdition: activeEntry.classicRulesEdition ?? CLASSIC_RULES_ORIGINAL,
      ...(retainedLibraryOwner?.entry === activeEntry ? retainedLibraryOwner : {}),
    });
  }
  function armSkip(destination) {
    journeySkipArmed = runId;
    journeySkipDestination = destination;
    localizedText($('journey-skip'), () => t('interface:confirmSkip'));
    warning(
      localizedMessage('interface:solo.universalSkipConfirm', {
        mission: destination.name,
      }),
    );
    $('journey-skip').focus({ preventScroll: true });
  }
  function cancelSkipResolution({ restoreFocus = false, announce = true } = {}) {
    const operation = librarySkipResolution;
    if (!operation) return;
    librarySkipResolution = null;
    operation.controller.abort();
    operation.feedback?.finish(
      announce ? t('interface:solo.skipCancelledCurrentFlightKept') : '',
      'cancelled',
    );
    preparationButtonBusy(operation.button, false);
    clearSkipConfirmation();
    if (restoreFocus && skipSnapshotCurrent(operation.snapshot) && !operation.button.hidden)
      operation.button.focus({ preventScroll: true });
  }
  async function resolveLibrarySkip() {
    if (librarySkipResolution || !normalSoloSkipAvailable()) return;
    pause(true);
    clearInput();
    const operation = {
      snapshot: skipSnapshot(),
      controller: new AbortController(),
      button: $('journey-skip'),
      feedback: null,
    };
    librarySkipResolution = operation;
    operation.feedback = beginPreparation(
      localizedMessage('interface:solo.findingNextMission'),
      ({ restoreFocus = false } = {}) => cancelSkipResolution({ restoreFocus }),
      'preparing',
      true,
    );
    preparationButtonBusy(operation.button, true);
    try {
      const host = await getUnifiedMissionLibrary();
      if (librarySkipResolution !== operation || !skipSnapshotCurrent(operation.snapshot)) {
        cancelSkipResolution({ announce: false });
        return;
      }
      await host.refreshInstalled();
      if (librarySkipResolution !== operation || !skipSnapshotCurrent(operation.snapshot)) {
        cancelSkipResolution({ announce: false });
        return;
      }
      const current = currentSoloLibraryMission(host);
      const next = librarySuccessor(host.library, current, 'solo', { wrap: true });
      if (!next) throw new Error(t('interface:solo.noOtherNormalMission'));
      librarySkipResolution = null;
      operation.feedback.finish();
      preparationButtonBusy(operation.button, false);
      armSkip({
        type: 'library',
        host,
        current,
        next,
        name: next.name,
        snapshot: operation.snapshot,
        skipped: journeySkipMission(),
      });
    } catch (error) {
      if (librarySkipResolution === operation && skipSnapshotCurrent(operation.snapshot)) {
        librarySkipResolution = null;
        operation.feedback.finish(
          localizedMessage('interface:solo.skipUnavailable', { error: error.message }),
          'error',
        );
        preparationButtonBusy(operation.button, false);
        clearSkipConfirmation();
        operation.button.focus({ preventScroll: true });
      }
    }
  }
  async function launchJourneyMission(mission, { kind = 'choose', skipped = null } = {}) {
    if (
      !journeyEnabled ||
      !mission ||
      journeyLaunch ||
      courseBlocked() ||
      backupBusy ||
      sessionBusy
    )
      return false;
    pause(true);
    clearInput();
    if (candidateHost) {
      const adopted = await prepareResultAttempt(kind, mission.levelIndex, null, mission);
      if (adopted && skipped)
        journeyProfile.record({ type: 'skip', mode: 'solo', missionId: skipped.id });
      return adopted;
    }
    const owner = { run, runId, mission, feedback: null, cancel: null };
    journeyLaunch = owner;
    const operation = packLaunchGuard.begin(packs);
    packCommits.markIntent();
    contentSwitchBusy = true;
    refreshContentSelectors();
    try {
      owner.cancel = ({ restoreFocus = false } = {}) => {
        if (journeyLaunch !== owner) return;
        journeyLaunch = null;
        invalidateContentSwitch();
        owner.feedback?.finish(
          t('interface:preparationCancelledYourCurrentFlightIsKept'),
          'cancelled',
        );
        if (restoreFocus) controllerFocus()?.focus({ preventScroll: true });
      };
      owner.feedback = beginPreparation(
        localizedMessage('interface:solo.preparingNextMission', {
          mission: contentText(mission, 'name'),
        }),
        owner.cancel,
        'preparing',
        true,
      );
      if (mission.packId)
        await ensureBundledPack(mission.packId, operation, { preserveCurrentRun: true });
      packLaunchGuard.assert(operation, packs);
      if (
        journeyLaunch !== owner ||
        run !== owner.run ||
        runId !== owner.runId ||
        document.hidden ||
        dialogOpen()
      )
        return false;
      const authored = installedEntries.find(
        (entry) =>
          entry.sourcePackId === mission.packId && entry.campaign.id === mission.campaignId,
      );
      if (!authored) throw new Error(t('interface:thisMissionIsUnavailableInTheCurrentEdition'));
      if (!journeyAuthority.matches(authored))
        throw new Error(
          t('interface:theInstalledCampaignDiffersFromThisJourneyEditionYourImported'),
        );
      const entry = executionForEntry(authored, library.preferences.campaignDifficulty);
      const index = entry.campaign.levels.findIndex((level) => level.id === mission.levelId);
      if (index < 0) throw new Error(t('interface:thisMissionIsUnavailableInTheCurrentEdition'));
      contentSwitchBusy = false;
      refreshContentSelectors();
      owner.feedback.finish();
      // The exact picture/result ticket now owns cancellation. Later pause,
      // navigation or lifecycle work must not revive the preceding pack owner.
      owner.cancel = null;
      if (journeyLaunch === owner) journeyLaunch = null;
      const adopted = await prepareResultAttempt(kind, index, entry);
      if (adopted && skipped)
        journeyProfile.record({ type: 'skip', mode: 'solo', missionId: skipped.id });
      return adopted;
    } catch (error) {
      if (
        journeyLaunch === owner &&
        packLaunchGuard.current(operation, packs) &&
        run === owner.run &&
        runId === owner.runId
      ) {
        owner.feedback?.finish(
          localizedMessage('interface:solo.prepareNextFailed', {
            mission: contentText(mission, 'name'),
          }),
          'error',
        );
        warning(localizedMessage('interface:solo.openNextFailed', { error: error.message }));
      }
      return false;
    } finally {
      owner.feedback?.finish();
      if (journeyLaunch === owner) journeyLaunch = null;
      if (packLaunchGuard.current(operation, packs)) {
        contentSwitchBusy = false;
        refreshContentSelectors();
        await packCommits.reconcile();
      }
    }
  }
  function selectEntry(
    entry,
    {
      levelId,
      themeId,
      seed: selectedSeed,
      restoreAdoption = false,
      contentSwitchTicket = null,
      difficulty,
    } = {},
  ) {
    if (courseSession || courseEntry)
      throw new Error(t('interface:endFirstFlightBeforeSelectingACampaign'));
    if (!entry) throw new Error(t('interface:thisCampaignIsNotInstalled'));
    if (difficulty !== undefined) {
      if (candidateHost?.owns(entry))
        journeyPreset(
          difficulty,
          authoredRoute.source?.difficultyCatalogId ||
            authoredRoute.navigation.project.difficultyCatalogId,
        );
      else resolveCampaignDifficulty(difficulty);
    }
    if (selectedSeed !== undefined) {
      if (!Number.isInteger(selectedSeed) || selectedSeed < 0 || selectedSeed > 0xffffffff)
        throw new Error(t('interface:pictureSeedIsInvalid'));
      seed = selectedSeed;
    }
    if (contentSwitchTicket) packLaunchGuard.assert(contentSwitchTicket, packs);
    else invalidateContentSwitch({ announce: true });
    if (!restoreAdoption) cancelRestore();
    themeOverride = !!themeId;
    musicOverride = false;
    scenario = null;
    practice = practiceSession;
    demo = false;
    entry = executionForEntry(
      entry,
      difficulty ?? (practiceSession ? 'standard' : library.preferences.campaignDifficulty),
    );
    activeEntry = entry;
    campaign = entry.campaign;
    classRegistry = entry.classRecipes;
    themesFile.themes = entry.themes;
    progress = progressFor(library, campaign);
    const selection = currentSelection({ levelId });
    levelIndex = selection.levelIndex;
    campaignOverview = !practice && selection.overview;
    if (!classRegistry.some((c) => c.id === classId)) classId = classRegistry[0].id;
    theme = entry.themes.find((t) => t.id === (themeId || campaign.themeId)) || entry.themes[0];
    bodyId = theme.player;
    $('theme-select').replaceChildren(
      ...entry.themes.map((t) => localizedOption(() => themeLabel(t), t.id)),
    );
    $('theme-select').value = theme.id;
    $('class-select').replaceChildren(
      ...classRegistry.map((c) => localizedOption(() => contentText(c, 'label'), c.id)),
    );
    const track = entry.music?.find((m) => m.id === campaign.musicId) || entry.music?.[0];
    if (track) {
      assignMusic(track);
      $('music-select').value = track.genre;
    } else assignMusic(DEFAULT_TRACKS.find((t) => t.genre === library.preferences.musicGenre));
    refreshCampaigns();
    prepare({ restoreAdoption, contentSwitchTicket, difficulty });
    if (!restoreAdoption) rememberSelection();
  }
  async function replacePackLibrary(
    next,
    { contentSwitchTicket = null, preserveCurrentRun = false } = {},
  ) {
    assertBrandedPacks(next);

    if (courseEntry) throw new Error(t('interface:cancelTheCourseHandoffBeforeChangingPacks'));
    attemptFiles?.invalidate();
    const ownsOperation = !contentSwitchTicket;
    const operation = contentSwitchTicket || packLaunchGuard.begin(packs);
    if (ownsOperation) {
      packCommits.markIntent();
      contentSwitchBusy = true;
      refreshContentSelectors();
    }
    try {
      const before = packs;
      if (
        preserveCurrentRun &&
        before.packs.some(
          (old) =>
            !isOfficialPack(old) &&
            JSON.stringify(next.packs.find((item) => item.id === old.id)) !== JSON.stringify(old),
        )
      )
        throw new Error(t('interface:installingAWorldMustPreserveEveryExistingPack'));
      packLaunchGuard.assert(operation, before);
      assertWriter();
      let content = prepareContentCatalog(next);
      if (!preserveCurrentRun || !paused) pause(true);
      cancelRestore();
      if (!preserveCurrentRun) masteryAwards.cancelAll();
      try {
        await packCommits.commit(exportPackLibrary(next), {
          beforeWrite: () => packLaunchGuard.assert(operation, packs),
        });
      } catch (error) {
        if (!packLaunchGuard.current(operation, packs)) throw error;
        throw new Error(
          t('gameplay:packStorageFailedPreviousInstalledPacksAreKept', { value1: error.message }),
        );
      }
      if (!packLaunchGuard.current(operation, before)) {
        await packCommits.noteStaleCommit();
        packLaunchGuard.assert(operation, packs);
      }
      content = contentFromChapters(await checkedChapters());
      packLaunchGuard.assert(operation, before);
      adoptContentCatalog(content);
      packLaunchGuard.advance(operation, before, packs);
      packCommits.acceptCurrent();
      if (
        !preserveCurrentRun &&
        activeEntry.sourcePackId &&
        !packs.packs.some((pack) => pack.id === activeEntry.sourcePackId)
      )
        selectEntry(baseEntry, { contentSwitchTicket: operation });
      else if (!preserveCurrentRun && activeEntry.sourcePackId) {
        const pack = packs.packs.find((item) => item.id === activeEntry.sourcePackId);
        const authoredId = activeEntry.baseCampaign?.id || campaign.id;
        selectEntry(
          resolvePackCampaign(
            pack,
            pack.campaigns.some((source) => source.id === authoredId)
              ? authoredId
              : pack.campaigns[0].id,
          ),
          { contentSwitchTicket: operation },
        );
      }
      refreshCampaigns();
    } finally {
      if (ownsOperation && packLaunchGuard.current(operation, packs)) {
        contentSwitchBusy = false;
        refreshContentSelectors();
        await packCommits.reconcile();
      }
    }
  }
  async function ensureBundledPack(packId, operation, { preserveCurrentRun = false } = {}) {
    const before = packs;
    packLaunchGuard.assert(operation, before);
    const installed = packs.packs.find((pack) => pack.id === packId);
    if (installed) return { pack: installed, installed: false };
    const summary = packCatalog.packs.find((pack) => pack.id === packId);
    if (!summary) throw new Error(t('interface:thisPackIsNotBundledWithTheCurrentBuild'));
    if (runtimeContent) throw new Error(t('interface:thisPackIsNotBundledWithTheCurrentBuild'));
    await gameplayDownloads.ensureClassic(packId);
    packLaunchGuard.assert(operation, packs);
    assertWriter();
    contentStatus(`Installing ${summary.name} on this device…`, false, {
      busy: true,
      stage: 'downloading',
    });
    const official = await packLaunchGuard.run(
      operation,
      before,
      () => packs,
      () => localOfficialChapter(packId),
    );
    if (official) {
      await replacePackLibrary(installPack(before, official), {
        contentSwitchTicket: operation,
        preserveCurrentRun,
      });
      return { pack: official, installed: true };
    }
    const source = await packLaunchGuard.run(
      operation,
      before,
      () => packs,
      () => fetchBundledChapter(summary),
    );
    const prepared = await packLaunchGuard.run(
      operation,
      before,
      () => packs,
      async () => {
        try {
          contentStatus(`Checking ${summary.name} and preparing its artwork…`, false, {
            busy: true,
            stage: 'verifying',
          });
          return await preparePack(source, { library: before });
        } catch (error) {
          if (error.message === 'JSON exceeds its byte budget.')
            throw new Error(t('interface:thisPackDoesNotFitTheInstalledLibraryS48'));
          throw error;
        }
      },
    );
    packLaunchGuard.assert(operation, packs);
    contentStatus(`Saving ${summary.name} on this device…`, false, { busy: true, stage: 'saving' });
    await replacePackLibrary(installPack(before, prepared.pack), {
      contentSwitchTicket: operation,
      preserveCurrentRun,
    });
    return { pack: prepared.pack, installed: true };
  }
  async function installSourceChapter(
    chapterId,
    files,
    { signal, download = false, onStatus, pictureReview } = {},
  ) {
    const notify = flightInformation.captureWarning('host.chapter', { allowTerminal: true });
    const descriptor = sourceExternalChapter(chapterId);
    if (practiceSession || courseEntry || !writer.writable)
      throw new Error(t('interface:openTheWritableGameToInstallThisChapter'));
    const operation = packLaunchGuard.begin(packs),
      before = packs;
    packCommits.markIntent();
    contentSwitchBusy = true;
    refreshContentSelectors();
    const cancel = () => {
      if (packLaunchGuard.current(operation, packs)) invalidateContentSwitch();
    };
    signal?.addEventListener('abort', cancel, { once: true });
    const report = (message, stage) =>
      preparationStatus(
        onStatus,
        message,
        stage,
        () => !signal?.aborted && packLaunchGuard.current(operation, packs),
      );
    let committed = false;
    try {
      report(
        download
          ? t('interface:downloadingAndVerifyingChapterOriginals')
          : t('interface:readingAndVerifyingChapterFiles'),
        download ? 'downloading' : 'verifying',
      );
      const prepared = download
        ? await prepareExternalDownload(descriptor.id, {
            signal,
            baseURL: new URL('../', gameDocumentURL(location.href)),
          })
        : await prepareSourceExternalChapter(files, { chapterId: descriptor.id, signal });
      packLaunchGuard.assert(operation, before);
      report(t('interface:checkingInstalledChaptersBeforeSaving'), 'verifying');
      const snapshot = await inspectChapters({ signal });
      if (snapshot.status !== 'checked' && snapshot.reason !== 'external-recovery')
        throw new Error(t('interface:backupAndMixedRecoveryMustBeResolvedBeforeThisChapter'));
      report(t('interface:savingTheVerifiedChapterAndOriginals'), 'saving');
      const installed = await externalChapters[
        snapshot.reason === 'external-recovery' ? 'recover' : 'install'
      ](prepared, { signal, pictureReview });
      committed = true;
      report(t('interface:verifyingTheSavedChapterIsReadyToPlay'), 'verifying');
      const next = await checkedChapters({ signal });
      await externalChapters.readiness(next, descriptor.id, { signal });
      packLaunchGuard.assert(operation, before);
      adoptContentCatalog(contentFromChapters(next));
      packLaunchGuard.advance(operation, before, packs);
      packCommits.acceptCurrent();
      if (snapshot.reason !== 'external-recovery' && !pictureReview) {
        try {
          await releasePictures.assignFreshChapter({
            descriptor: installed.descriptor,
            mediaGeneration: installed.mediaGeneration,
            identityCatalog: pictureIdentity(),
            signal,
            onStatus: (status) => report(status.message, status.stage),
          });
        } catch (error) {
          if (error.name !== 'AbortError')
            notify(
              `Chapter installed with its source originals. Field Kit defaults could not be saved: ${error.message}`,
            );
        }
      }
      // Recovery never silently re-enables profile writes from an unreadable baseline.
      // A clean reload adopts the preserved profile and saved flight together.
      refreshCampaigns();
    } catch (error) {
      if (committed) {
        void packCommits.noteStaleCommit();
        throw new Error(
          t('gameplay:theChapterInstallationCommittedReloadRecheckBeforeChoosingIt', {
            value1: error.message,
          }),
        );
      }
      throw error;
    } finally {
      signal?.removeEventListener('abort', cancel);
      if (packLaunchGuard.current(operation, packs)) {
        contentSwitchBusy = false;
        refreshContentSelectors();
        await packCommits.reconcile();
      }
    }
  }
  async function installOptionalChapter(summary, { signal, onStatus } = {}) {
    if (courseEntry || courseSession || practice)
      throw new Error(t('interface:returnFromPracticeBeforeInstallingWorlds'));
    const old = packs.packs.find((item) => item.id === summary.id);
    if (old) return verifyOptionalInstalled(old, summary, { signal });
    if (signal?.aborted) throw new DOMException(t('interface:downloadCancelled'), 'AbortError');
    cancelRestore();
    const operation = packLaunchGuard.begin(packs),
      before = packs;
    packCommits.markIntent();
    contentSwitchBusy = true;
    refreshContentSelectors();
    const cancelled = () => {
      if (packLaunchGuard.current(operation, packs)) invalidateContentSwitch();
    };
    signal?.addEventListener('abort', cancelled, { once: true });
    try {
      preparationStatus(
        onStatus,
        `Downloading and verifying ${summary.name}…`,
        'downloading',
        () => !signal?.aborted && packLaunchGuard.current(operation, packs),
      );
      const pack = await packLaunchGuard.run(
        operation,
        before,
        () => packs,
        () =>
          localOfficialChapter(summary.id).then(
            (official) =>
              official ||
              prepareOptionalDownload(summary, {
                library: before,
                signal,
                baseURL: new URL('../', gameDocumentURL(location.href)),
              }),
          ),
      );
      packLaunchGuard.assert(operation, packs);
      preparationStatus(
        onStatus,
        `Saving ${summary.name}…`,
        'saving',
        () => !signal?.aborted && packLaunchGuard.current(operation, packs),
      );
      await replacePackLibrary(installPack(before, pack), {
        contentSwitchTicket: operation,
        preserveCurrentRun: true,
      });
      return pack;
    } finally {
      signal?.removeEventListener('abort', cancelled);
      if (packLaunchGuard.current(operation, packs)) {
        contentSwitchBusy = false;
        refreshContentSelectors();
        await packCommits.reconcile();
      }
    }
  }
  async function activatePack(
    packId,
    { campaignId, levelId, announce = true, preserveCurrentRun = false, beforeSelect } = {},
  ) {
    let notify = flightInformation.captureWarning('host.chapter', { allowTerminal: true });
    attemptFiles?.invalidate();
    cancelRestore();
    const operation = packLaunchGuard.begin(packs);
    packCommits.markIntent();
    contentSwitchBusy = true;
    refreshContentSelectors();
    contentStatus(t('interface:preparingYourSelectedChapter'), false, { busy: true });
    try {
      if (!packId) {
        beforeSelect?.();
        selectEntry(baseEntry, { levelId, contentSwitchTicket: operation });
        if (announce)
          contentStatus(`Base game · ${campaign.levels[levelIndex].name} selected and ready.`);
        else contentStatus('');
        return operation;
      }
      const result = await ensureBundledPack(packId, operation, { preserveCurrentRun });
      packLaunchGuard.assert(operation, packs);
      const source = campaignId
        ? result.pack.campaigns.find((item) => item.id === campaignId)
        : result.pack.campaigns[0];
      if (!source) throw new Error(t('interface:thisPackCampaignIsUnavailable'));
      const entry = installedEntries.find(
        (item) => item.sourcePackId === result.pack.id && item.campaign.id === source.id,
      );
      if (!entry) throw new Error(t('interface:theInstalledPackCampaignCouldNotBeSelected'));
      beforeSelect?.();
      if (levelId) {
        const targetIndex = entry.campaign.levels.findIndex((level) => level.id === levelId);
        if (targetIndex < 0) throw new Error(t('interface:thisPackLevelIsUnavailable'));
        if (!missionAvailable(targetIndex, entry)) {
          if (!preserveCurrentRun) {
            selectEntry(entry, { contentSwitchTicket: operation });
            // This fallback deliberately accepted a different mission. Its immediate
            // locked-target explanation belongs to that new presentation owner.
            notify = flightInformation.captureWarning('host.chapter', { allowTerminal: true });
          }
          throw new Error(
            t('gameplay:isStillLockedTheNextAvailableLevelIsSelected', {
              value1: contentText(entry.campaign.levels[targetIndex], 'name'),
            }),
          );
        }
      }
      selectEntry(entry, { levelId, contentSwitchTicket: operation });
      if (announce)
        contentStatus(
          t('gameplay:selectedAndReady', {
            value1: result.installed
              ? t('gameplay:installed3', { value1: contentText(result.pack, 'name') })
              : '',
            value2: contentText(campaign.levels[levelIndex], 'name'),
          }),
        );
      else contentStatus('');
      return operation;
    } catch (error) {
      if (!packLaunchGuard.current(operation, packs)) return false;
      contentStatus(error.message, true);
      notify(error.message);
      return false;
    } finally {
      if (packLaunchGuard.current(operation, packs)) {
        contentSwitchBusy = false;
        refreshContentSelectors();
        await packCommits.reconcile();
      }
    }
  }
  function selectLevel(levelId) {
    const index = campaign.levels.findIndex((level) => level.id === levelId);
    if (index < 0 || !missionAvailable(index)) {
      refreshContentSelectors();
      contentStatus(t('interface:thatLevelIsStillLockedCompleteTheEarlierMissionsFirst'), true);
      return false;
    }
    invalidateContentSwitch();
    leavePractice();
    campaignOverview = false;
    levelIndex = index;
    prepare();
    rememberSelection();
    contentStatus(
      t('gameplay:selectedAndReady2', { value1: contentText(campaign.levels[levelIndex], 'name') }),
    );
    return true;
  }
  function savedAttempt() {
    try {
      const raw = profileStorage().getItem(sessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function refreshSavedFlight() {
    const saved = savedAttempt();
    // Preview only the requested identity. Known compiled content must not
    // rebuild the authored catalog (or unrelated historical challenges).
    const key = !practice && typeof saved?.campaignKey === 'string' ? saved.campaignKey : null;
    const known = knownExecutionEntry(key);
    const metadata = key && !known ? candidateHost?.executionMetadata?.(key) : null;
    const entries = known ? [known] : key && !metadata ? executionEntries() : [];
    const keyedEntries = entries.map((entry) => ({
      entry,
      campaign: entry.campaign,
      key:
        candidateHost?.owns(entry) || executionCatalog.find(entry.executionKey) === entry
          ? entry.executionKey
          : campaignKey(entry.campaign),
    }));
    const savedEntry = keyedEntries.find((row) => row.key === key)?.entry;
    const savedMode = metadata
      ? gameplayDifficultyLabel(metadata.difficulty)
      : difficultyLabel(savedEntry);
    const preview = practice
      ? null
      : savedFlightPreview(saved, [
          ...keyedEntries.map(({ key, campaign }) => ({ key, campaign })),
          ...(metadata ? [metadata] : []),
        ]);
    const atReady = !started && !practice;
    show('continue-saved', atReady && !!preview);
    show('continue-saved-note', atReady && !!preview);
    $('continue-saved').disabled = sessionBusy;
    localizedText($('continue-saved'), () =>
      sessionBusy ? t('interface:verifyingSavedFlight') : t('interface:loadSavedFlight'),
    );
    localizedText($('continue-saved-note'), () =>
      preview
        ? `${contentText(preview, 'title')}${savedMode ? ` · ${savedMode}` : ''}. ${preview.note}`
        : '',
    );
    localizedAttribute(
      $('continue-saved'),
      'title',
      () => preview?.title || t('interface:loadSavedFlight2'),
    );
  }
  function assertWriter() {
    if (courseSession) throw new Error(t('interface:trainingDoesNotWriteCampaignData'));
    if (!persistenceReady || !writer.writable)
      throw new Error(
        profileWriterMessage(writer) || t('interface:storageRecoveryMustFinishBeforeSaving'),
      );
    if (profileStorage().getItem(`${libraryKey}.backup-lock`) !== null)
      throw new Error(t('interface:aBackupIsBeingRestoredSavingResumesWhenItFinishes'));
  }
  function snapshotAttempt(savedAt) {
    if (practice || !recorder || !started || ['won', 'lost'].includes(run.status))
      throw new Error(t('interface:startAnUnfinishedCampaignFlightToSaveIt'));
    return suspendSession({
      run,
      recorder,
      presentationLevel: campaign.levels.find((level) => level.id === run.levelId),
      campaignKey: campaignKey(campaign),
      themeId: theme.id,
      bodyId,
      runId,
      savedAt,
      continuation: { direction: input.snapshotDirection() },
      presentationPins: flightPictures?.pins(),
      ...(flightVisualLease ? { visualThemePin: flightVisualLease.pin() } : {}),
      ...(flightActorLease ? { actorAppearancePin: flightActorLease.pin() } : {}),
    });
  }
  function currentBackupSession(savedAt) {
    if (candidateHost)
      throw new Error(t('interface:authoredTestFlightsUseSeparateStorageExportThisAttemptOr'));
    return started && recorder && !practice && !['won', 'lost'].includes(run.status)
      ? snapshotAttempt(savedAt)
      : savedAttempt();
  }
  function snapshotCurrentBackup(savedAt = new Date().toISOString()) {
    return externalBackup.snapshot(() => {
      if (contentSwitchBusy || sessionBusy || backupBusy)
        throw new Error(t('interface:finishThePendingContentOrSaveOperationBeforeExporting'));
      if (started && !paused && !['won', 'lost'].includes(run.status))
        throw new Error(t('interface:pauseTheCurrentFlightBeforePreparingGameData'));
      // Capture time belongs to this export, while all actual host contents are
      // read again after waits so resumed/replaced state cannot pass as unchanged.
      return { library, packs, session: currentBackupSession(savedAt) };
    });
  }
  function attemptReadbackMatches(raw, session) {
    return (
      typeof raw === 'string' &&
      raw.length <= SESSION_STORAGE_BYTES &&
      new TextEncoder().encode(raw).length <= SESSION_STORAGE_BYTES &&
      canonicalJSON(JSON.parse(raw)) === canonicalJSON(session)
    );
  }
  function persistAttempt(notify = true) {
    if (titleFlightHold)
      throw new Error(t('interface:explicitlyResumeTheVerifiedFlightBeforeSavingAgain'));
    if (modeDepartureHold)
      throw new Error(t('interface:returnToTheFlightAndExplicitlyResumeBeforeSavingAgain'));
    if (courseEntryHold)
      throw new Error(t('interface:theCourseHandoffKeepsThisFlightPausedResumeExplicitlyBefore'));
    assertWriter();
    const session = snapshotAttempt();
    let saved;
    try {
      saved = saveSession(profileStorage(), sessionKey, session);
    } catch {
      saved = { ok: false, warning: t('interface:storageIsUnavailableExportThisAttempt') };
    }
    if (saved.ok) {
      try {
        const raw = profileStorage().getItem(sessionKey);
        if (attemptReadbackMatches(raw, session)) lastOwnedAttempt = raw;
      } catch {
        /* A successful write result alone is not readback authority. */
      }
    }
    if (notify)
      warning(
        saved.ok
          ? localizedMessage('interface:flightSavedLoadItFromLibrarySavesWheneverYouReturn')
          : saved.warning,
      );
    return session;
  }
  function findCampaignEntry(key) {
    let entry =
      knownExecutionEntry(key) ?? executionEntries().find((e) => campaignKey(e.campaign) === key);
    if (!entry) {
      const match = /^route-(\d{4}-\d\d-\d\d)-(daily|calm|expert)\//.exec(key || '');
      if (match) {
        const c = challengeCampaign(match[1], match[2], baseClasses);
        const e = { ...baseEntry, campaign: c, activity: 'challenge' };
        if (campaignKey(c) === key) entry = e;
      }
    }
    return entry;
  }
  async function restoreAttempt(candidate, { beforeAdopt, onAdopted, onStatus, signal } = {}) {
    if (courseSession || courseEntry)
      throw new Error(t('interface:endFirstFlightBeforeLoadingACampaignFlight'));
    if (sessionBusy) throw new Error(t('interface:aFlightIsAlreadyBeingVerified'));
    if (signal?.aborted) throw new DOMException(t('interface:titleLaunchCancelled'), 'AbortError');
    invalidateContentSwitch();
    sessionBusy = true;
    refreshSavedFlight();
    cancelPictureStart();
    if (!paused) pause(true);
    clearInput();
    const controller = new AbortController();
    restoreController = controller;
    let feedback,
      stagedPictures = null,
      stagedVisuals = null,
      stagedActors = null;
    const abort = () => {
      controller.abort();
      // Title cancellation owns this field status too. Settle it immediately;
      // a pending decoder may finish later, after another action owns the UI.
      feedback?.finish(t('interface:preparationCancelledYourFlightRemainsPaused'), 'cancelled');
    };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      feedback = beginPreparation(
        t('interface:verifyingYourSavedFlight'),
        cancelRestore,
        'verifying',
      );
      onStatus?.({
        status: 'preparing',
        message: t('interface:verifyingYourSavedFlight'),
        stage: 'verifying',
      });
      await candidateHost?.ensureExecution?.(candidate?.campaignKey, {
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      const entry = findCampaignEntry(candidate?.campaignKey);
      if (!entry)
        throw new Error(
          candidateHost
            ? t('interface:thisAuthoredFlightNeedsItsOriginalTestEditionItsSaved')
            : t('interface:installTheMatchingCampaignPackBeforeLoadingThisFlight'),
        );
      if (candidateHost && !candidateHost.owns(entry))
        throw new Error(t('interface:openThisLegacyFlightInTheOrdinaryGameThisRoute'));
      const restored = await restoreSession(candidate, {
        campaign: entry.campaign,
        campaignKey: campaignKey(entry.campaign),
        signal: controller.signal,
        mediaIdentityCatalog: candidate?.presentationPins ? pictureIdentity() : undefined,
        masteryDefinition:
          masteryFor(campaignKey(entry.campaign), candidate?.replay?.level?.id, masteryCatalog) ??
          undefined,
      });
      if (controller.signal.aborted)
        throw new DOMException(
          t('interface:loadingWasCancelledYourNewerSelectionIsKept'),
          'AbortError',
        );
      if (restored.session.visualThemePin) {
        stagedVisuals = await prepareSavedVisualTheme(
          {
            pin: restored.session.visualThemePin,
            entry,
            currentManifestSha256: pagePresentationSnapshot?.manifestSha256,
          },
          {
            baseURL: new URL('presentation/compiled/', gameDocumentURL(location.href)),
            signal: controller.signal,
            onStatus(status) {
              feedback.update(status);
              onStatus?.(status);
            },
          },
        );
      }
      stagedActors = await prepareAttemptActors(
        entry,
        entry.campaign.levels.find((level) => level.id === restored.run.levelId),
        restored.session.themeId,
        {
          pin: restored.session.actorAppearancePin ?? null,
          signal: controller.signal,
          onStatus(status) {
            feedback.update(status);
            onStatus?.(status);
          },
        },
      );
      stagedPictures = newFlightPictures({
        nextRun: restored.run,
        nextRunId: restored.session.runId,
        entry,
        nextThemeId: restored.session.themeId,
        pins: restored.session.presentationPins,
        legacy: !restored.session.presentationPins,
      });
      await stagedPictures.ensure(restored.session.themeId, {
        signal: controller.signal,
        onStatus: (status) => {
          feedback.update(status);
          onStatus?.(status);
        },
      });
      if (controller.signal.aborted)
        throw new DOMException(t('interface:pictureRestoreCancelled'), 'AbortError');
      beforeAdopt?.();
      feedback.finish(savedFlightRestoredMessage);
      selectEntry(entry, {
        levelId: restored.run.levelId,
        themeId: restored.session.themeId,
        restoreAdoption: true,
        difficulty: entry.difficulty,
      });
      flightPictures?.dispose();
      flightPictures = stagedPictures;
      stagedPictures = null;
      run = restored.run;
      restoredSignalRuns.add(run);
      recorder = restored.recorder;
      runId = restored.session.runId;
      const informationOwner = flightInformation.adopt(run, runId);
      masteryDefinition = recoverGameplayTuning(run.level)
        ? null
        : masteryFor(campaignKey(campaign), run.levelId, masteryCatalog);
      masteryObserver = restored.masteryObserver ?? null;
      masteryAward = null;
      classId = run.classId;
      turnPolicy = run.turnPolicy;
      seed = run.seed;
      bodyId = presets.characters[restored.session.bodyId] ? restored.session.bodyId : theme.player;
      started = true;
      paused = true;
      localizedText($('pause-button'), () => '▶');
      handled = false;
      recordingStopped = false;
      clearInput();
      input.restoreDirection(restored.session.continuation?.direction ?? null);
      adoptFlightVisualLease(stagedVisuals);
      stagedVisuals = null;
      adoptFlightActors(stagedActors);
      stagedActors = null;
      setTheme();
      painter.setLevel?.(run.level, { seed });
      updateLoadout();
      overlay('pause');
      refreshHUD();
      flightInformation.commitWarning(
        informationOwner,
        savedFlightRestoredMessage,
        'restored',
        'host.restored',
      );
      const adopted = {
        run,
        recorder,
        runId,
        entry: activeEntry,
        campaign,
        theme,
        libraryGeneration,
      };
      onAdopted?.(adopted);
      return adopted;
    } catch (error) {
      if (controller.signal.aborted)
        throw new DOMException(
          t('interface:loadingWasCancelledYourNewerSelectionIsKept'),
          'AbortError',
        );
      feedback?.finish(`Saved flight unavailable: ${error.message}`, 'error');
      throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
      sessionBusy = false;
      stagedPictures?.dispose();
      stagedVisuals?.release();
      stagedActors?.release();
      if (restoreController === controller) restoreController = null;
      refreshSavedFlight();
      await packCommits.reconcile();
    }
  }
  let titleFlight = null;
  actorChangesReady = true;
  const titleFeedback = createOperationStatus($('shell-flight-status'));
  function cancelTitleFlight() {
    const ticket = titleFlight;
    if (!ticket) return;
    titleFlight = null;
    ticket.controller.abort();
    ticket.visuals?.release();
    ticket.visuals = null;
    ticket.actors?.release();
    ticket.actors = null;
    if (ticket.prewarm?.observe === ticket.observe) ticket.prewarm.observe = null;
    ticket.feedback.finish({
      state: 'cancelled',
      message: t('interface:preparationCancelledYourFlightRemainsPaused'),
    });
    $('shell-flight-cancel').hidden = true;
  }
  function titleFlightCurrent(ticket, expected = ticket) {
    return (
      titleFlight === ticket &&
      !ticket.controller.signal.aborted &&
      (!ticket.actorsFresh ||
        actorPreferences.snapshot().revision === ticket.actorChoice.revision) &&
      ticket.isCurrent() &&
      !document.hidden &&
      document.hasFocus() !== false &&
      !courseBlocked() &&
      !courseEntry &&
      !modeDeparture &&
      !missionReplacement &&
      !restartRequest &&
      !contentSwitchBusy &&
      !backupBusy &&
      !pictureThemePending &&
      run === expected.run &&
      recorder === expected.recorder &&
      runId === expected.runId &&
      activeEntry === expected.entry &&
      campaign === expected.campaign &&
      theme === expected.theme &&
      libraryGeneration === expected.libraryGeneration &&
      packs === ticket.packs &&
      writer.writable === ticket.writable &&
      persistenceReady === ticket.persistenceReady &&
      profileStorage().getItem(`${libraryKey}.backup-lock`) === ticket.backupLock &&
      profileStorage().getItem(sessionKey) === ticket.savedRaw
    );
  }
  async function launchTitleFlight(kind, { isCurrent, leave }) {
    if (
      !isCurrent() ||
      titleFlight ||
      sessionBusy ||
      contentSwitchBusy ||
      backupBusy ||
      courseSession ||
      practice ||
      courseEntry ||
      modeDeparture ||
      missionReplacement ||
      restartRequest ||
      pictureThemePending ||
      !run
    )
      return;
    const feedback = titleFeedback.begin({
      message: t('interface:preparingYourFlight'),
      stage: 'preparing',
    });
    const ticket = {
      controller: new AbortController(),
      actorChoice: actorPreferences.snapshot(),
      actorsFresh: kind !== 'continue' && !(started && !['won', 'lost'].includes(run.status)),
      feedback,
      isCurrent,
      run,
      recorder,
      runId,
      entry: activeEntry,
      campaign,
      theme,
      libraryGeneration,
      packs,
      savedRaw: null,
    };
    titleFlight = ticket;
    $('shell-flight-cancel').hidden = true;
    // The original activation unlocks audio; the persisted master gate is unchanged.
    void activateAudio().catch(() => {});
    try {
      ticket.savedRaw = profileStorage().getItem(sessionKey);
      ticket.writable = writer.writable;
      ticket.persistenceReady = persistenceReady;
      ticket.backupLock = profileStorage().getItem(`${libraryKey}.backup-lock`);
      if (ticket.backupLock !== null)
        throw new Error(t('interface:finishGameDataRecoveryBeforeContinuing'));
      const assertCurrent = () => {
        if (!titleFlightCurrent(ticket))
          throw new DOMException(
            t('interface:titleLaunchChangedYourFlightStaysPaused'),
            'AbortError',
          );
      };
      assertCurrent();
      let expected = ticket;
      ticket.observe = (status) => {
        if (titleFlightCurrent(ticket) && status.status === 'preparing') feedback.update(status);
      };
      const continuing = started && !['won', 'lost'].includes(run.status);
      if (!continuing && kind === 'continue') {
        if (!ticket.savedRaw)
          throw new Error(t('interface:theSavedFlightIsUnavailableOpenLibrarySavesToReview'));
        let candidate;
        try {
          candidate = JSON.parse(ticket.savedRaw);
        } catch {
          throw new Error(t('interface:theSavedFlightNeedsRecoveryOpenLibrarySavesItsBytes'));
        }
        expected = await restoreAttempt(candidate, {
          beforeAdopt: assertCurrent,
          onAdopted: () => {
            titleFlightHold = true;
          },
          onStatus: ticket.observe,
          signal: ticket.controller.signal,
        });
      } else {
        if (!continuing && ticket.savedRaw !== null)
          throw new Error(t('interface:aSavedFlightIsPresentChooseContinueOrReviewLibrary'));
        if (campaignOverview || ['won', 'lost'].includes(run.status)) {
          // The named Start is an explicit fresh attempt after a completed result.
          campaignOverview = false;
          prepare();
          Object.assign(ticket, {
            run,
            recorder,
            runId,
            entry: activeEntry,
            campaign,
            theme,
            libraryGeneration,
          });
        }
        const owner = flightPictures;
        if (!owner)
          throw new Error(t('interface:theMissionPictureIsUnavailableChooseTheMissionAgain'));
        ticket.prewarm =
          picturePrewarm?.owner === owner && picturePrewarm.themeId === theme.id
            ? picturePrewarm
            : null;
        if (ticket.prewarm) {
          ticket.prewarm.observe = ticket.observe;
          if (ticket.prewarm.latest) ticket.observe(ticket.prewarm.latest);
        }
        const pending =
          ticket.prewarm?.promise ??
          owner.ensure(theme.id, {
            signal: ticket.controller.signal,
            onStatus: ticket.observe,
          });
        const signal = ticket.controller.signal;
        let abort;
        try {
          await Promise.race([
            pending,
            new Promise((resolve, reject) => {
              abort = () =>
                reject(new DOMException(t('interface:titleLaunchCancelled'), 'AbortError'));
              signal.addEventListener('abort', abort, { once: true });
              if (signal.aborted) abort();
            }),
          ]);
        } finally {
          signal.removeEventListener('abort', abort);
        }
        if (owner !== flightPictures)
          throw new DOMException(t('interface:theChosenPictureChanged'), 'AbortError');
        assertCurrent();
        if (freshVisualAttempt && !flightVisualLease) {
          ticket.visuals = await prepareFreshAttemptVisuals(
            activeEntry,
            campaign.levels[levelIndex],
            theme.id,
            {
              signal: ticket.controller.signal,
              onStatus: ticket.observe,
            },
          );
        }
        if (!flightActorsReady) {
          ticket.actors = await prepareAttemptActors(
            activeEntry,
            campaign.levels[levelIndex],
            theme.id,
            {
              style: ticket.actorChoice.actorStyle,
              signal: ticket.controller.signal,
              onStatus: ticket.observe,
            },
          );
          ticket.actorsPrepared = true;
        }
      }
      if (!titleFlightCurrent(ticket, expected) || !flightPictures?.ready(theme.id))
        throw new DOMException(
          t('interface:titleLaunchChangedYourFlightStaysPaused'),
          'AbortError',
        );
      if (ticket.visuals) {
        adoptFlightVisualLease(ticket.visuals);
        ticket.visuals = null;
      }
      if (!titleFlightCurrent(ticket, expected))
        throw new DOMException(
          t('interface:titleLaunchChangedYourFlightStaysPaused'),
          'AbortError',
        );
      if (ticket.actorsPrepared) {
        adoptFlightActors(ticket.actors);
        ticket.actors = null;
      }
      if (!titleFlightCurrent(ticket, expected))
        throw new DOMException(
          t('interface:titleLaunchChangedYourFlightStaysPaused'),
          'AbortError',
        );
      feedback.finish({ message: '' });
      titleFlight = null;
      $('shell-flight-cancel').hidden = true;
      leave();
      resume();
    } catch (error) {
      if (titleFlight === ticket)
        feedback.finish({
          state: error.name === 'AbortError' ? 'cancelled' : 'error',
          message:
            error.name === 'AbortError'
              ? t('interface:preparationCancelledYourFlightRemainsPaused')
              : () => t('interface:solo.flightUnavailable', { error: error.message }),
        });
    } finally {
      ticket.visuals?.release();
      ticket.visuals = null;
      ticket.actors?.release();
      ticket.actors = null;
      if (ticket.prewarm?.observe === ticket.observe) ticket.prewarm.observe = null;
      if (titleFlight === ticket) {
        titleFlight = null;
        $('shell-flight-cancel').hidden = true;
      }
    }
  }
  function adoptPreferences() {
    const p = library.preferences;
    refreshTextSize();
    turnPolicy = p.turnPolicy;
    classId = classRegistry.some((c) => c.id === p.classId) ? p.classId : classRegistry[0].id;
    theme = themesFile.themes.find((t) => t.id === p.themeId) || theme;
    bodyId = p.bodyId;
    $('theme-select').value = theme.id;
    $('music-select').value = p.musicGenre;
    $('master-volume').value = audioMaster.snapshot().volume;
    $('music-volume').value = p.musicVolume;
    $('sfx-volume').value = p.sfxVolume;
    $('terrain-select').value = p.style;
    $('settings-grid').checked = p.showGrid;
    $('match-class-appearance').checked = p.matchClassAppearance;
    applyDisplayPreferences(displayPreferences.snapshot());
    $('tap-steering').checked = p.tapSteering ?? matchMedia('(pointer: coarse)').matches;
    syncAssistControls();
    keySettings.refresh();
    controller.setBindings(p.controllerBindings);
    controller.setBoostMode(p.controllerBoostMode);
    controllerSettings.refresh();
    controllerBoostSettings.refresh();
    clearInput();
    refreshKeyPrompts();
    refreshControllerPrompts();
    configureAudio({
      style: p.musicGenre,
      master: p.masterVolume,
      music: p.musicVolume,
      sfx: p.sfxVolume,
    });
    themeOverride = true;
    musicOverride = true;
    prepare();
  }
  attemptFiles = createAttemptFilePreparer({
    getState: () => ({
      run,
      recorder,
      runId,
      library,
      packs,
      started,
      paused,
      practice,
      courseActive: courseSession,
      courseEntry: !!courseEntry,
      recordingStopped,
      contentBusy: contentSwitchBusy,
      sessionBusy,
      backupBusy,
      hidden: document.hidden,
      themeId: theme.id,
      bodyId,
    }),
    snapshotCurrent: () => {
      pause(true);
      return snapshotAttempt();
    },
    resolveCampaign: (key) => findCampaignEntry(key)?.campaign,
    resolveMediaIdentityCatalog: () => pictureIdentity(),
    readStored: () => profileStorage().getItem(sessionKey),
    readBackupMarker: () => profileStorage().getItem(`${libraryKey}.backup-lock`),
    readJournal: () => readAssetStore(journalKey),
    withStorageLock: (work, signal) =>
      profileLocks?.request
        ? profileLocks.request(`${libraryKey}.backup-lock`, { signal }, work)
        : work(),
  });
  const libraryPanel = attachLibraryPanel({
    // Selected editions already scope their pack catalogue; omitted examples
    // must not trigger a request for the default game's unrelated catalogue.
    examplePackIndex: runtimeContent ? packCatalog : undefined,
    examplePacks: !runtimeContent,
    prepareCollectionProgress,
    focusMission,
    pictureMedia: async (options) =>
      createSessionPictureView(await pictureMedia(options), sessionPictures),
    sessionPictures,
    assertExternalBackupSupported,
    backupPreparation: externalBackup
      ? { prepareExternalChapters: externalBackup.prepareExternalChapters }
      : undefined,
    backupSnapshot: externalBackup ? snapshotCurrentBackup : undefined,
    backupSet: practice
      ? null
      : {
          edition: { version: buildVersion, channel, sourceRevision: buildSourceRevision },
          gameIdentity: () => {
            assertWriter();
            if (courseSession || courseEntry || contentSwitchBusy || sessionBusy || backupBusy)
              throw new Error(
                t('interface:finishTrainingOrThePendingContentSaveOperationBeforePreparing'),
              );
            if (!storedStateAdopted || !persistenceReady || !writer.writable)
              throw new Error(
                t(
                  'interface:resolveStorageRecoveryBeforePreparingAllInventoriesIndividualGameData',
                ),
              );
            if (started && !paused && !['won', 'lost'].includes(run.status))
              throw new Error(t('interface:pauseTheFlightBeforePreparingABackupSet'));
            return JSON.stringify({
              library,
              packs,
              session: currentBackupSession('2000-01-01T00:00:00.000Z'),
              runId,
              backupMarker: profileStorage().getItem(`${libraryKey}.backup-lock`),
            });
          },
          readContents: ({ savedAt }) =>
            externalBackup
              ? snapshotCurrentBackup(savedAt)
              : { library, packs, session: currentBackupSession(savedAt) },
          readMetadata: async (options) => (await pictureManager.usage(options)).generations,
          readStill: (options) => pictureStore.read(options),
          readStory: (options) => storyStore.exportInventory(options),
          // Byte recovery is available even when the audio player cannot initialize.
          catalogue: SOUNDTRACK_CATALOGUE,
          readAudioAsset: (hash, options) =>
            createSoundtrackSource({
              catalogue: SOUNDTRACK_CATALOGUE,
              archives: SOUNDTRACK_ARCHIVES,
              bundled: SOUNDTRACK_BUNDLED_ASSETS,
            }).readAsset(hash, { ...options, purpose: 'export' }),
          readAudio: (options) => pictureManager.readDomain('audio', options),
        },
    openStory: (request) => storyDialog.open(request),
    resolveMediaIdentityCatalog: (metadata) =>
      createBackupPictureIdentityResolver({
        baseEntries: [baseEntry],
        metadata,
      }),
    getReducedEffects: () => displayPreferences.snapshot().effectiveReducedEffects,
    profileTransfer: isRelease
      ? {
          storage: profileStorage(),
          readAsset: readAssetStore,
          lockManager: profileLocks,
          currentVersion: buildVersion,
          editionId: runtimeContent?.editionId,
          heldWriter: runtimeContent ? writer : undefined,
          installedApp: true,
          ...(externalBackup ? { readExternalSnapshot: externalBackup.readExternalSnapshot } : {}),
        }
      : null,
    get: () => ({
      library,
      packs,
      campaign,
      theme,
      bodyId,
      run,
      recorder,
      runId,
      presets,
      sourcePackId: activeEntry.sourcePackId,
    }),
    base: () => baseEntry,
    catalog,
    executionCatalog: executionEntries,
    getMasteryCatalog: () => masteryCatalog,
    select: selectEntry,
    requestLaunch: requestLibraryLaunch,
    pause: () => pause(true),
    saved: savedAttempt,
    attemptExportSource: () => attemptFiles.source(),
    prepareAttemptFile: (options) => {
      // Do not clear an actual pending pack/restore/backup operation to make an
      // export eligible. An otherwise idle queued autoplay loses its ticket.
      if (contentSwitchBusy || sessionBusy || backupBusy)
        throw new Error(t('interface:finishThePendingContentOrSaveOperationBeforeExporting'));
      invalidateContentSwitch();
      return attemptFiles.prepare(options);
    },
    currentSession: () => currentBackupSession(),
    canSnapshotBackup: () => storedStateAdopted,
    profileReplacementIdentity: () =>
      canonicalJSON({
        library,
        packs,
        libraryGeneration,
        runId,
        storedStateAdopted,
        persistenceReady,
        session: currentBackupSession('2000-01-01T00:00:00.000Z'),
        profile: profileStorage().getItem(libraryKey),
        saved: profileStorage().getItem(sessionKey),
        backupMarker: profileStorage().getItem(`${libraryKey}.backup-lock`),
      }),
    sessionNote: () =>
      [
        sessionPictures.status().originals
          ? t('interface:sessionOnlyPictureOriginalsAreNotIncludedInThisJson')
          : '',
        !storedStateAdopted
          ? t('interface:thisExportContainsTheCurrentSessionOnlyUnreadableStoredData')
          : '',
        started && !recorder
          ? t('interface:thisFlightNoLongerHasACompleteRecordingThePrevious')
          : '',
      ]
        .filter(Boolean)
        .join(' '),
    restore: restoreAttempt,
    checkProfileReplacement: () => {
      if (courseSession || courseEntry)
        throw new Error(t('interface:endFirstFlightBeforeReplacingPlayerData'));
    },
    beforeProfileReplacement: () => {
      invalidateInstalledMigration();
      if (courseSession || courseEntry)
        throw new Error(t('interface:endFirstFlightBeforeReplacingPlayerData'));
      invalidateContentSwitch();
      cancelRestore();
      masteryAwards.cancelAll();
    },
    setLibrary: (next) => {
      denyBrandedImport();
      if (courseSession || courseEntry)
        throw new Error(t('interface:endFirstFlightBeforeReplacingPlayerData'));
      invalidateContentSwitch();
      masteryAwards.cancelAll();
      library = next;
      progress = progressFor(library, campaign);
      const saved = persistProfile({ mode: 'replace' });
      const selection = currentSelection();
      levelIndex = selection.levelIndex;
      campaignOverview = !practice && selection.overview;
      adoptPreferences();
      return saved;
    },
    applyBackup: async (prepared) => {
      denyBrandedImport();
      if (courseSession || courseEntry)
        throw new Error(t('interface:endFirstFlightBeforeImportingABackup'));
      // Hold synchronously after the panel's final identity check, before any
      // preparation can yield and let a pending seal escape the Undo snapshot.
      const releaseAwards = masteryAwards.holdCommits();
      try {
        await assertExternalBackupSupported({ kind: 'backup' });
        backupBusy = true;
        invalidateContentSwitch();
        packCommits.markIntent();
        contentSwitchBusy = true;
        let committed = false;
        try {
          refreshContentSelectors();
          if (!writer.writable) throw new Error(profileWriterMessage(writer));
          if (!persistenceReady) {
            const recovered = await recoverBackupImport(backupAdapters());
            if (!recovered.ok) throw new Error(recovered.warning);
          } else assertWriter();
          pause(true);
          cancelRestore();
          const result = await commitBackup(prepared, backupAdapters());
          if (!result.ok) {
            if (result.recoveryRequired) persistenceReady = false;
            throw new Error(result.warning);
          }
          committed = true;
          masteryAwards.cancelAll();
          const checked = await checkedChapters();
          for (const descriptor of checked.index?.chapters ?? [])
            await externalChapters.readiness(checked, descriptor.id);
          const content = contentFromChapters(checked);
          persistenceReady = true;
          storedStateAdopted = true;
          saveSucceeded = true;
          if (result.warning) {
            localizedText($('save-warning'), () => result.warning);
            show('save-warning', true);
          } else show('save-warning', false);
          library = result.profile.library;
          libraryBaseline = library;
          libraryGeneration = result.profile.generation;
          recovery = null;
          adoptContentCatalog(content);
          packCommits.acceptCurrent();
          selectEntry(baseEntry);
          adoptPreferences();
          refreshCampaigns();
          return result;
        } catch (error) {
          if (committed) {
            persistenceReady = false;
            storedStateAdopted = false;
            void packCommits.noteStaleCommit();
            throw new Error(
              t('gameplay:gameDataCommittedReloadAndRestoreItsExactOriginalsBefore', {
                value1: error.message,
              }),
            );
          }
          throw error;
        } finally {
          backupBusy = false;
          contentSwitchBusy = false;
          refreshContentSelectors();
          await packCommits.reconcile();
        }
      } finally {
        // An uncertain rollback or failed adoption cannot authorize old-profile
        // writes. A verified unchanged failure resumes the same verifier jobs.
        let safeOriginal = persistenceReady && storedStateAdopted && writer.writable;
        try {
          safeOriginal =
            safeOriginal && profileStorage().getItem(`${libraryKey}.backup-lock`) === null;
        } catch {
          safeOriginal = false;
        }
        if (!safeOriginal) masteryAwards.cancelAll();
        releaseAwards();
      }
    },
    setPacks: replacePackLibrary,
  });
  courseView = attachFirstFlightView({
    onEnter: enterFirstFlight,
    onCancelEnter: () => cancelCourseEntry(),
    onNext: () => nextCourseLesson(),
    onSkip: () => nextCourseLesson(true),
    onSelect: (id) => requestMissionReplacement({ kind: 'lesson', id }, $('first-flight-select')),
    onExit: leaveCourse,
    getControlLabels: () => {
      const keys = bindingLabels(resolveKeyBindings(library.preferences.keyboardBindings));
      return {
        directions: t('gameplay:keysUpDownLeftRightTouchDirectionButtonsBelowThe', {
          value1: keys.up,
          value2: keys.down,
          value3: keys.left,
          value4: keys.right,
          value5: controllerStickLabel(library.preferences.controllerBindings, 'flight'),
        }),
        stop: t('gameplay:stopVisibleStopController', {
          value1: keys.stop,
          value2: controllerLabels.flight.stop,
        }),
        pause: t('gameplay:pauseVisiblePauseController', {
          value1: keys.pause,
          value2: controllerLabels.flight.pause,
        }),
      };
    },
  });
  $('help-dialog').addEventListener('cancel', (event) => {
    if (!courseEntry) return;
    event.preventDefault();
    cancelCourseEntry();
  });
  $('help-dialog').addEventListener('close', () => {
    if (courseEntry) cancelCourseEntry();
  });
  if (courseSession) {
    document.body.classList.add('first-flight-session');
    for (const id of [
      'library-button',
      'collection-button',
      'demo-button',
      'pack-select',
      'level-select',
      'campaign-select',
      'difficulty-select',
      'class-select',
      'theme-select',
      'hangar-button',
      'shell-packs',
      'shell-collection',
    ]) {
      $(id).disabled = true;
      $(id).hidden = true;
    }
  }
  $('library-dialog').addEventListener('close', () => {
    cancelRestore();
    attemptFiles.invalidate();
  });
  $('pack-select').onchange = async () => {
    const packId = $('pack-select').value;
    if (packId.startsWith('campaign:')) return;
    const opener =
      availableFocusTarget(document.activeElement) &&
      $('shell-missions').contains(document.activeElement)
        ? document.activeElement
        : $('pack-select');
    return requestMissionReplacement({ kind: 'pack', id: packId }, opener);
  };
  $('level-select').onchange = () =>
    requestMissionReplacement({ kind: 'level', id: $('level-select').value }, $('level-select'));
  $('campaign-select').onchange = () =>
    requestMissionReplacement(
      { kind: 'campaign', id: $('campaign-select').value },
      $('campaign-select'),
    );
  $('difficulty-select').onchange = () => {
    if ($('difficulty-select').disabled) return;
    if (candidateHost?.owns(activeEntry)) {
      journeyPreferences.choose($('difficulty-select').value);
      cancelResultAttempt();
      cancelSkipForContentChange();
      clearInput();
      if (!started && !sessionBusy) prepare();
      else refreshDifficulty();
      return;
    }
    const mode = resolveCampaignDifficulty($('difficulty-select').value);
    browsingJourneyPreferences.choose(mode);
    clearInput();
    preferences({ campaignDifficulty: mode });
    cancelResultAttempt();
    cancelSkipForContentChange();
    // Saving may merge a newer preference from another writer; use the actual
    // adopted library. A setting-only change never touches the suspended slot.
    if (!started && !sessionBusy) prepare();
    else refreshDifficulty();
  };
  $('menu-difficulty').onchange = () => {
    if ($('menu-difficulty').disabled) return;
    const difficulty = $('menu-difficulty').value;
    browsingJourneyPreferences.choose(difficulty);
    if (!candidateHost?.owns(activeEntry))
      preferences({ campaignDifficulty: difficulty === 'gentle' ? 'gentle' : 'standard' });
    cancelResultAttempt();
    cancelSkipForContentChange();
    cancelWorldAttempt();
    cancelTitleFlight();
    clearInput();
    if (!started && !sessionBusy && !contentSwitchBusy && !backupBusy) prepare();
    else refreshDifficulty();
  };
  gameplayTuningPanel = mountGameplayTuning({
    root: $('gameplay-tuning'),
    controller: gameplayTuning,
    getDifficulty: () => browsingJourneyPreferences.snapshot().difficulty,
  });
  gameplayTuning.subscribe(() => {
    cancelResultAttempt();
    cancelSkipForContentChange();
    cancelWorldAttempt();
    cancelTitleFlight();
    clearInput();
    if (!started && !sessionBusy && !contentSwitchBusy && !backupBusy) prepare();
    else refreshDifficulty();
  });
  $('save-attempt-button').onclick = () => {
    pause(true);
    try {
      persistAttempt();
    } catch (e) {
      warning(e.message);
    }
  };
  $('hangar-button').onclick = () => {
    if (!craftSwitchAvailable()) return;
    pause(true);
    $('switch-class-select').replaceChildren(
      ...run.classRecipes.map((c) => new Option(c.label, c.id)),
    );
    $('switch-class-select').value = run.activeClassId || classId;
    localizedText($('switch-description'), () => contentText(run.classRecipe, 'description'));
    localizedText($('switch-status'), () => t('interface:yourFlightIsPausedWhileChoosing'));
    $('hangar-dialog').showModal();
  };
  $('switch-class-select').onchange = () => {
    localizedText(
      $('switch-description'),
      () =>
        run.classRecipes.find((c) => c.id === $('switch-class-select').value)?.description || '',
    );
  };
  $('switch-class-button').onclick = () => {
    if (!craftSwitchAvailable()) return;
    const next = $('switch-class-select').value;
    $('hangar-dialog').close();
    resume();
    pendingSwitch = next;
  };
  document.addEventListener('keydown', (e) => {
    if (
      actionForKey(resolveKeyBindings(library.preferences.keyboardBindings), e) === 'hangar' &&
      craftSwitchAvailable() &&
      !e.repeat &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.target.closest(
        'input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[data-game-reading]',
      ) &&
      !dialogOpen()
    ) {
      e.preventDefault();
      $('hangar-button').click();
    }
  });
  $('skip-celebration').onclick = () => {
    if (defeatActive) {
      finishDefeatPresentation();
      return;
    }
    painter.skipCelebration?.();
    celebrationActive = false;
    show('skip-celebration', false);
    show('game-overlay', false);
    show('show-result', true);
  };
  function focusPauseToolReturn(id) {
    const target = $(id);
    if (controllerScope() === 'paused' && availableFocusTarget(target))
      target.focus({ preventScroll: true });
  }
  $('settings-button').onclick = () => {
    pause(true);
    // The persistent shell can open Settings while flight is running. Pausing
    // installs the Pause menu, so make its matching command the modal origin;
    // closing Settings then returns keyboard/controller focus to the surface
    // that now owns the attempt rather than the shell toolbar above it.
    focusPauseToolReturn('overlay-settings');
    syncAssistControls();
    controllerSettings.refresh();
    controllerBoostSettings.refresh();
    $('settings-dialog').showModal();
    $('settings-dialog').querySelector('[role="tab"][aria-selected="true"]')?.focus();
    profileRecovery.refresh();
    void storageRetention.refresh();
  };
  profileRecovery = attachProfileRecoveryDialog({
    currentVersion: buildVersion,
    editionId: runtimeContent?.editionId,
    heldWriter: runtimeContent ? writer : undefined,
    packaged: isRelease,
    resolveSourceVersion: async () => (await getJSON('build-config.json')).version,
    onOpen: () => clearInput(),
    unavailable: () => {
      if (practiceSession || courseEntry || courseEntryHold)
        return t('interface:storedProfileRecoveryIsAvailableFromOrdinarySoloSettings');
      if (contentSwitchBusy || sessionBusy || backupBusy)
        return t('interface:finishThePendingContentOrSaveOperationBeforeOpeningRecovery');
      if (
        [...document.querySelectorAll('dialog[open]')].some(
          (dialog) =>
            !['settings-dialog', 'shell-home', 'profile-recovery-dialog'].includes(dialog.id),
        )
      )
        return t('interface:closeTheOtherToolBeforeOpeningRecovery');
      return '';
    },
  });
  const offlinePanel = runtimeContent || previewSession ? null : attachOfflinePanel();
  installOfflinePanel =
    !runtimeContent && !previewSession && $('shell-offline')
      ? attachInstallOfflinePanel({
          document,
          window,
          downloadsURL: new URL('./downloads.html', import.meta.url),
          getWriter: () => ({ key: `${libraryKey}.writer`, lease: writer }),
          onOpen: () => {
            if (started && !paused) pause(true);
          },
          canActivate: () => !started && !sessionBusy && !backupBusy && !contentSwitchBusy,
          onStatus: (message) => {
            if ($('shell-offline-status')) $('shell-offline-status').textContent = message;
          },
        })
      : null;
  const stopOfflineToolNavigation =
    runtimeContent || previewSession
      ? () => {}
      : attachOfflineToolNavigation({
          document,
          window,
          access: gameplayDownloads,
          onError: (error) => warning(error.message, null, 'host.offline'),
        });
  const stopOfflineModeNavigation = runtimeContent
    ? () => {}
    : attachOfflineModeNavigation({
        document,
        window,
        access: gameplayDownloads,
        onError: (error) => warning(error.message, null, 'host.offline'),
      });
  if (installOfflinePanel && $('shell-offline'))
    $('shell-offline').onclick = () => installOfflinePanel.open();
  if ($('settings-offline'))
    $('settings-offline').onclick = (event) => {
      if (!installOfflinePanel) return;
      event.preventDefault();
      installOfflinePanel.open();
    };
  if (runtimeContent) {
    for (const id of [
      'offline-button',
      'offline-stop',
      'offline-status',
      'offline-optional-note',
      'offline-details',
      'shell-offline',
      'settings-offline',
    ])
      if ($(id)) $(id).hidden = true;
  }
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) {
      offlinePanel?.destroy();
      installOfflinePanel?.dispose();
      stopOfflineToolNavigation();
      stopOfflineModeNavigation();
    }
  });
  show('native-diagnostics', nativePlatform() === 'ios');
  function tuneMusic(event) {
    if (Number($('master-volume').value) !== audioMaster.snapshot().volume)
      setMasterVolume(Number($('master-volume').value));
    if (event?.target.id === 'music-select' && !soundtrackPlayer) {
      musicOverride = true;
      assignMusic(
        DEFAULT_TRACKS.find((t) => t.genre === $('music-select').value),
        { atBoundary: false },
      );
    }
    configureAudio({
      style: $('music-select').value,
      master: Number($('master-volume').value),
      music: Number($('music-volume').value),
      sfx: Number($('sfx-volume').value),
    });
    preferences({
      musicGenre: $('music-select').value,
      masterVolume: Number($('master-volume').value),
      musicVolume: Number($('music-volume').value),
      sfxVolume: Number($('sfx-volume').value),
    });
  }
  for (const id of ['music-select', 'master-volume', 'music-volume', 'sfx-volume'])
    $(id).onchange = tuneMusic;
  $('music-preview').onclick = async () => {
    const notify = flightInformation.captureWarning('host.music', { allowTerminal: true });
    const player = soundtrackPlayer,
      request = ++musicPreviewRequest;
    try {
      const ok = player
        ? await activateAudio({ explicit: true })
        : await sound.preview({ seconds: 4 });
      // The current player's notifications own its label, including cancellation
      // or a newer Pause/Play. A late gesture result must not overwrite them.
      if (player || soundtrackPlayer || request !== musicPreviewRequest) return;
      musicPreviewState = { playing: ok, status: ok ? 'playing' : 'error' };
      renderMusicPreview();
    } catch (e) {
      if (request === musicPreviewRequest) notify(e.message);
    }
  };
  $('settings-dialog').addEventListener('close', () => {
    if (!$('settings-dialog').open) storageRetention.close();
    sound.pause();
    controllerSettings.refresh();
    controllerBoostSettings.refresh();
  });
  $('match-class-appearance').onchange = () => {
    preferences({ matchClassAppearance: $('match-class-appearance').checked });
    setTheme();
  };
  $('terrain-select').onchange = () => {
    preferences({ style: $('terrain-select').value });
    setTheme();
  };
  $('screen-controls').onchange = () => {
    clearInput();
    preferences({ screenControls: $('screen-controls').value });
    syncAssistControls();
    refreshInputPresentation();
  };
  $('touch-side').onchange = () => {
    clearInput();
    const requested = $('touch-side').value,
      saved = preferences({
        screenSteeringHand: requested,
        touchControls: {
          ...touchPreferences.snapshot(),
          side: requested,
        },
      });
    touchPreferences.set(
      { ...touchPreferences.snapshot(), side: requested },
      { persist: !practice && !courseEntry },
    );
    syncAssistControls();
    const status = $('screen-steering-status');
    localizedText(
      status,
      () =>
        touchPreferences.warning() ||
        (saved.ok
          ? t('interface:steeringHandSaved')
          : resolveTouchControls(library.preferences.touchControls).side === requested
            ? t('interface:solo.steeringHandSessionSelected', { warning: saved.warning })
            : t('interface:solo.steeringHandUnchanged', { warning: saved.warning })),
    );
    status.hidden = false;
  };
  function refreshScreenSteeringHand() {
    touchPreferences.adoptLegacy(library.preferences.touchControls);
    const hand = touchPreferences.snapshot().side;
    $('touch-side').value = hand;
    document.body.dataset.screenSteeringHand = hand;
    document.body.dataset.touchSide = hand;
    const strip = document.querySelector('.play-controls'),
      steering = [
        strip.querySelector('#touch-surface'),
        strip.querySelector('.direction-controls'),
      ],
      actions = strip.querySelector('.ability-buttons'),
      ordered = hand === 'right' ? [actions, ...steering] : [...steering, actions];
    if (ordered.some((group, index) => strip.children[index] !== group)) {
      const focused = document.activeElement;
      // Match keyboard focus order to the visible side; reuse every existing control.
      strip.append(...ordered);
      if (ordered.some((group) => group.contains(focused))) focused.focus({ preventScroll: true });
    }
    localizedText($('screen-steering-status'), () => '');
    $('screen-steering-status').hidden = true;
  }
  $('text-size').onchange = () => changeDisplay({ textSize: $('text-size').value });
  for (const key of ['mode', 'size', 'opacity']) {
    $(`touch-${key}`).onchange = () => {
      clearInput();
      const next = {
        ...touchPreferences.snapshot(),
        [key]: key === 'opacity' ? Number($(`touch-${key}`).value) : $(`touch-${key}`).value,
      };
      preferences({ touchControls: next, screenSteeringHand: next.side });
      touchPreferences.set(next, { persist: !practice && !courseEntry });
      syncAssistControls();
      if (touchPreferences.warning()) {
        localizedText($('screen-steering-status'), () => touchPreferences.warning());
        $('screen-steering-status').hidden = false;
      }
    };
  }
  $('text-face').onchange = () => changeDisplay({ textFace: $('text-face').value });
  function applyDisplayPreferences(state) {
    $('text-size').value = state.textSize;
    document.body.dataset.textSize = state.textSize;
    $('text-face').value = state.textFace;
    document.body.dataset.textFace = state.textFace;
    $('reduced-effects').checked = state.reducedEffects;
    $('settings-reduced-effects').checked = state.reducedEffects;
    document.body.dataset.effects = state.effectiveReducedEffects ? 'reduced' : 'full';
    localizedText($('display-system-reduction'), () =>
      state.effectiveReducedEffects && !state.reducedEffects
        ? t('interface:systemReducedMotionIsActiveYourSavedReducedEffectsChoice')
        : '',
    );
  }
  function refreshTextSize() {
    // Current validated profile is a fallback only; shared/explicit intent wins.
    displayPreferences.adoptLegacy(library.preferences, {
      expectedRevision: displayPreferences.snapshot().revision,
    });
    applyDisplayPreferences(displayPreferences.snapshot());
  }
  function changeDisplay(patch) {
    const state = displayPreferences.set(patch);
    // Explicit Solo actions alone mirror the legacy profile through its writer.
    const saved = preferences({
      textFace: state.textFace,
      textSize: state.textSize,
      reducedEffects: state.reducedEffects,
    });
    localizedText($('display-preferences-status'), () =>
      displayPreferences.getWarningKey()
        ? t(displayPreferences.getWarningKey())
        : displayPreferences.getWarning() || saved.warning || '',
    );
  }
  $('settings-grid').onchange = () => preferences({ showGrid: $('settings-grid').checked });
  function syncAssistControls() {
    refreshScreenSteeringHand();
    $('settings-reduced-effects').checked = $('reduced-effects').checked;
    $('settings-tap-steering').checked = $('tap-steering').checked;
    $('screen-controls').value = library.preferences.screenControls;
    const touch = touchPreferences.snapshot();
    for (const key of ['mode', 'size', 'opacity']) $(`touch-${key}`).value = touch[key];
    document.body.dataset.touchMode = touch.mode;
    document.body.dataset.touchSide = touch.side;
    document.body.dataset.touchSize = touch.size;
    document.body.style.setProperty('--touch-opacity', touch.opacity);
    localizedText($('touch-instruction'), () =>
      touch.mode === 'swipe' ? t('interface:swipeToTurn') : t('interface:dragToSteer'),
    );
  }
  for (const id of ['reduced-effects', 'settings-reduced-effects']) {
    $(id).onchange = () => {
      changeDisplay({ reducedEffects: $(id).checked });
      syncAssistControls();
    };
  }
  function visuals() {
    return (
      scenario?.visualOverrides || {
        ...activeEntry.visualOverrides,
        ...activeEntry.levelVisuals?.find((v) => v.levelId === campaign.levels[levelIndex]?.id)
          ?.visualOverrides,
      }
    );
  }
  function painterVisuals() {
    const overrides = { ...visuals() };
    // The flight owns this already-decoded original. Do not load a second,
    // asynchronously replaceable copy through the renderer's fallback path.
    if (flightPictures?.current()?.image) delete overrides.background;
    return overrides;
  }
  function setTheme() {
    syncAuthoredModeLinks();
    if (library.preferences.matchClassAppearance) {
      const candidate = characterPresentations.recommendedBody(
        theme,
        run?.activeClassId || classId,
        theme.player,
      );
      bodyId =
        Object.hasOwn(presets.characters, candidate) &&
        (practice || availableBodies().has(candidate))
          ? candidate
          : 'neutral-marker';
    }
    bodyWarning = '';
    if (!Object.hasOwn(presets.characters, bodyId)) {
      bodyWarning = t('gameplay:bodyIsNotRegisteredUsingTheNeutralRigChooseA', { value1: bodyId });
      bodyId = 'neutral-marker';
    }
    for (const [name, value] of Object.entries({
      paper: theme.palette.paper,
      ink: theme.palette.ink,
      accent: theme.palette.accent,
      safe: theme.palette.safe,
      danger: theme.palette.danger,
    }))
      document.documentElement.style.setProperty(`--${name}`, value);
    localizedText(
      $('theme-caption'),
      () =>
        `${contentText(theme, 'name').toUpperCase()} / ${contentText(theme, 'subtitle').toUpperCase()}`,
    );
    localizedText($('score-label'), () => contentText(theme, 'labels.currency').toUpperCase());
    localizedText($('pickup-button').firstChild, () => contentText(theme, 'labels.supply') + ' ');
    localizedAttribute($('action-button'), 'title', () => contentText(theme, 'labels.ability'));
    localizedText(
      $('world-legend'),
      () =>
        `${contentText(theme, 'labels.enemy')} · ${contentText(theme, 'labels.boss')} · ${contentText(theme, 'labels.supply')}`,
    );
    localizedText($('footer-note'), () =>
      theme.id === 'coupa'
        ? t('interface:fictionalSpendManagementThemeOriginalHelperArtwork')
        : t('interface:originalWorldsMakeEveryLineCount'),
    );
    painter.style = scenario?.presentation?.style || library.preferences.style;
    updateBodies();
    painter.setLook(theme, bodyId, painterVisuals());
    if (runtimeContent && theme.soundtrack && !musicOverride) assignMusic(theme.soundtrack);
    soundtrackPlayer?.setContext(soundtrackContext());
  }
  function updateBodies() {
    const allowed = availableBodies();
    $('body-select').replaceChildren();
    for (const [id, body] of Object.entries(presets.characters)) {
      const option = localizedOption(
        () =>
          `${contentText(body, 'label')}${allowed.has(id) || practice ? '' : ' · ' + t('common:status.locked')}`,
        id,
      );
      option.disabled = !allowed.has(id) && !practice;
      $('body-select').append(option);
    }
    if (!allowed.has(bodyId) && !practice)
      bodyId =
        allowed.has(theme.player) && Object.hasOwn(presets.characters, theme.player)
          ? theme.player
          : 'neutral-marker';
    $('body-select').value = bodyId;
    const next = currentAppearanceMilestones().find((tier) => !tier.earned);
    localizedText($('appearance-hint'), () =>
      practice
        ? t('interface:previewAccessAllAppearancesAreAvailablePracticeGrantsNoCampaign')
        : next
          ? t('gameplay:differentMissionsInThisCampaignSeeCollectionForTheAppearances', {
              value1: milestoneName(next),
              value2: next.count,
              value3: next.target,
            })
          : t('interface:allChapterAppearancesAreAvailableInThisCampaignCosmeticsDo'),
    );
  }
  const bodyLabels = (ids) => ids.map((id) => contentText(presets.characters[id], 'label') || id);
  function paintAppearanceRewards(entry) {
    const selected = entry.campaign;
    localizedText($('appearance-campaign'), () =>
      t('gameplay:campaignAppearances', {
        value1: contentText(selected, 'title') || contentText(selected, 'name') || selected.id,
      }),
    );
    $('appearance-rewards').replaceChildren();
    for (const tier of difficultyNavigation.milestones(
      entry,
      library.campaigns,
      progressFor(library, selected),
    )) {
      const row = document.createElement('article');
      row.className = `appearance-reward${tier.earned ? ' earned' : ''}`;
      const thumbnail = document.createElement('img');
      localizedAttribute(thumbnail, 'alt', () => '');
      thumbnail.width = thumbnail.height = 64;
      const body = presets.characters[tier.bodyIds[0]];
      if (body?.src)
        thumbnail.src = new URL(`../authoring/motion-lab/${body.src}`, import.meta.url).href;
      const copy = document.createElement('div');
      const title = document.createElement('h4');
      localizedText(title, () => milestoneName(tier));
      const state = document.createElement('p');
      state.className = 'reward-progress';
      localizedText(state, () =>
        t(
          tier.earned ? 'interface:rewards.availableProgress' : 'interface:rewards.lockedProgress',
          { completed: Math.min(tier.count, tier.target), count: tier.target },
        ),
      );
      const names = document.createElement('p');
      localizedText(names, () => bodyLabels(tier.bodyIds).join(' · '));
      const detail = document.createElement('p');
      detail.className = 'reward-detail';
      const remaining = tier.target - tier.count;
      localizedText(detail, () =>
        tier.earned
          ? t('interface:availableInThisCampaign')
          : t('interface:rewards.remaining', { count: remaining }),
      );
      copy.append(title, state, names, detail);
      row.append(thumbnail, copy);
      $('appearance-rewards').append(row);
    }
    localizedText($('collection-note'), () =>
      practice
        ? t('interface:practicePreviewsEveryAppearanceWithoutEarningRewardsTheseRowsShow')
        : t('gameplay:appearancesBelongToThisCampaignCosmeticsDoNotChangeAbilities', {
            value1: difficultyLabel(entry)
              ? ' ' + t('interface:standardAndGentleShareMissionAndAppearanceUnlocks') + ''
              : '',
          }),
    );
  }
  function focusAppearance() {
    if ($('collection-dialog').open) $('collection-dialog').close();
    if (!practiceSession) {
      return openUnifiedMissions(document.activeElement, { focusSetup: 'body-select' });
    }
    gameShell?.openMissions();
    missionPicker?.revealSetup();
    $('body-select').focus({ preventScroll: true });
    $('body-select').scrollIntoView({ block: 'center', behavior: 'auto' });
  }
  function leavePractice() {
    if (courseSession || courseEntry) return;
    scenario = null;
    practice = practiceSession;
    demo = false;
    campaignOverview = false;
    theme = themesFile.themes.find((t) => t.id === theme.id) || themesFile.themes[0];
    if (!classRegistry.some((c) => c.id === classId)) classId = classRegistry[0].id;
    bodyId = availableBodies().has(bodyId) ? bodyId : theme.player;
    $('class-select').replaceChildren(
      ...classRegistry.map((c) => localizedOption(() => contentText(c, 'label'), c.id)),
    );
    $('theme-select').replaceChildren(
      ...themesFile.themes.map((t) => localizedOption(() => themeLabel(t), t.id)),
    );
    $('theme-select').value = theme.id;
    setTheme();
  }
  function paintMissions() {
    missionThumbnails.cancel();
    $('missions').replaceChildren();
    if (courseSession) {
      localizedText($('campaign-progress'), () =>
        t('gameplay:lessonsThisVisit', {
          value1: Object.values(courseVisit).filter((value) => value === 'complete').length,
          value2: FIRST_FLIGHT_LESSONS.length,
        }),
      );
      return;
    }
    const thumbnailTargets = [];
    campaign.levels.forEach((level, index) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `mission${index === levelIndex && !practice && !campaignOverview ? ' selected' : ''}`;
      b.disabled = !missionAvailable(index);
      b.dataset.level = String(index);
      // A gallery preview is earned with the picture. Unfinished missions use
      // a decorative concealed tile rather than publishing the hidden original.
      const earnedPicture =
        !!progress.clears[level.id] ||
        !!difficultyNavigation.access(activeEntry, library.campaigns)?.levels[index]?.completed;
      b.dataset.pictureState = earnedPicture ? 'unavailable' : 'concealed';
      thumbnailTargets.push({ button: b, level, earned: earnedPicture });
      localizedAttribute(b, 'aria-label', () =>
        t(b.disabled ? 'interface:missions.lockedLabel' : 'interface:missions.label', {
          number: index + 1,
          name: contentText(level, 'name'),
        }),
      );
      const number = document.createElement('span');
      number.className = 'number';
      localizedText(number, () => String(index + 1).padStart(2, '0'));
      const name = document.createElement('span');
      name.className = 'name';
      localizedText(name, () => contentText(level, 'name'));
      const medal = document.createElement('span');
      medal.className = 'medal';
      const reward = { 1: 'bronze', 2: 'silver', 3: 'gold' }[progress.clears[level.id]?.medals];
      if (reward) medal.dataset.presentationReward = reward;
      localizedText(medal, () =>
        progress.clears[level.id]
          ? '★'.repeat(progress.clears[level.id].medals)
          : difficultyNavigation.access(activeEntry, library.campaigns)?.levels[index]?.completed
            ? '✓'
            : b.disabled
              ? '—'
              : '↗',
      );
      b.append(number, name, medal);
      b.onclick = (event) => {
        const pending = requestMissionReplacement({ kind: 'card', id: level.id }, b);
        // The gallery's queued selection focus belongs to completed selection,
        // not the separate confirmation dialog that now owns input.
        if (missionReplacement) event.stopPropagation();
        return pending;
      };
      $('missions').append(b);
    });
    void missionThumbnails
      .refresh({
        library,
        entries: executionCatalog.entries,
        entry: activeEntry,
        themeId: theme.id,
        targets: thumbnailTargets,
      })
      .catch(() => {
        /* Preserve honest unavailable thumbnails. */
      });
    localizedText(
      $('campaign-progress'),
      () =>
        `${String(currentSelection().completed).padStart(2, '0')} / ${String(campaign.levels.length).padStart(2, '0')}${difficultyLabel(activeEntry) ? t('gameplay:medals', { value1: difficultyLabel(activeEntry) }) : ''}`,
    );
    refreshContentSelectors();
  }
  function updateLoadout() {
    const recipe =
      run?.classRecipe || (scenario?.classRecipes || classRegistry).find((c) => c.id === classId);
    localizedText($('class-description'), () => contentText(recipe, 'description'));
    const actions = arcadeActionCapabilities(run?.level);
    localizedText(
      $('action-button').firstChild,
      () => `${recipe.id === 'scout' ? t('interface:scan') : contentText(recipe, 'label')} `,
    );
    show('action-button', actions.manualAbility);
    show('pickup-button', manualSupplyAvailable());
    show('manual-equipment-help', actions.manualAbility);
    show('boost-button', actions.manualBoost);
    show('screen-boost-setting', actions.manualBoost);
    show('controller-boost-setting', actions.manualBoost);
    show('ability-state', actions.manualAbility);
    localizedText($('equipment-help'), () =>
      actions.manualAbility
        ? t('interface:thisEditionUsesManualEquipmentScoutScanRevealsNearbyObjectives')
        : t('interface:arcadeSteerAndCloseLinesTheMapSetsYourCraft'),
    );
    localizedText($('line-danger-help'), () =>
      run?.level.classic?.lineImpact
        ? t('interface:anEnemyStrikingYourUnfinishedLineSendsImpactsAlongIt')
        : t('interface:aFieldEnemyTouchingYourUnfinishedLineOrCrossingYour'),
    );
    refreshKeyPrompts();
    refreshControllerPrompts();
    $('class-select').value = classId;
    $('turn-select').value = turnPolicy;
  }
  function focusMission() {
    // Explicit content selection leaves the retained menus; passive Back does not.
    if ($('settings-dialog').open) $('settings-dialog').close();
    if ($('shell-workshop-dialog').open) $('shell-workshop-dialog').close();
    if ($('shell-home').open) $('shell-home').close();
    $('arena-shell').scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const target = campaignOverview ? $('next-button') : $('start-button');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }
  function currentBriefing() {
    if (courseSession) {
      const lesson = getFirstFlightLesson(courseRequest.lessonId);
      return {
        title: contentText(lesson, 'title'),
        copy: contentText(lesson, 'summary'),
        fullTitle: t('gameplay:firstFlight', { value1: contentText(lesson, 'title') }),
        fullBrief: [
          contentText(lesson, 'summary'),
          ...lesson.instructions.map((_, i) => contentText(lesson, `instructions.${i}`)),
          ...lesson.steps.map(
            (step) => `${contentText(step, 'label')}: ${contentText(step, 'instruction')}`,
          ),
        ].join('\n\n'),
        facts: t('interface:optionalTrainingScoutThreeLivesNoMissionDeadlineNoCampaign'),
        status: contentText(lesson, 'instructions.0'),
      };
    }
    return missionBriefing(scenario?.level || campaign.levels[levelIndex], {
      brief: scenario
        ? undefined
        : (editionLocalization?.briefFor(campaign.levels[levelIndex]) ??
          contentText(campaign, `briefs.${levelIndex}`)),
      objectiveLabel: contentText(theme, 'labels.objective'),
      classes: scenario?.classRecipes || classRegistry,
      intro:
        !practice &&
        !activeEntry.sourcePackId &&
        (activeEntry.baseCampaign || campaign).id === baseCampaign.id &&
        levelIndex === 0,
    });
  }
  function refreshMissionBrief() {
    const brief = currentBriefing();
    localizedText($('mission-brief-title'), () => brief.fullTitle);
    localizedText($('mission-brief-copy'), () => brief.fullBrief);
    localizedText($('mission-brief-facts'), () => brief.facts);
    refreshMastery();
    return brief;
  }
  function refreshMastery() {
    const visible = !!masteryDefinition && !campaignOverview;
    show('mastery-brief', visible);
    show('mastery-status', visible && $('game-overlay').hidden);
    const kind = $('game-overlay').dataset.kind;
    show('mastery-overlay', visible && ['ready', 'won', 'lost'].includes(kind));
    if (!visible) return;
    const preview = masteryObserver?.snapshot();
    for (const id of ['mastery-status', 'mastery-overlay']) {
      const text = masteryText(masteryDefinition, preview, {
        practice,
        award: masteryAward,
        compact: id === 'mastery-status',
      });
      if ($(id).textContent !== text) localizedText($(id), () => text);
    }
    localizedText($('mastery-brief'), () =>
      t('gameplay:optionalSealYourPictureAndNextMissionNeverDependOn', {
        value1: contentText(masteryDefinition, 'name'),
        value2: contentText(masteryDefinition, 'description'),
      }),
    );
  }
  const journeyBestLine = document.createElement('p');
  journeyBestLine.id = 'journey-best';
  journeyBestLine.className = 'micro-note';
  journeyBestLine.hidden = true;
  $('overlay-copy').after(journeyBestLine);
  function refreshJourneyBest() {
    const visible = $('game-overlay').dataset.kind === 'won' && journeyBestResult?.runId === runId;
    journeyBestLine.hidden = !visible;
    journeyBestLine.dataset.state = !visible
      ? 'hidden'
      : journeyBestResult.result.error && !Object.hasOwn(journeyBestResult.result, 'comparison')
        ? 'unavailable'
        : journeyBestResult.result.comparison
          ? 'comparison'
          : 'first';
    journeyBestLine.dataset.durable = String(visible && journeyBestResult.result.durable === true);
    localizedText(journeyBestLine, () =>
      visible ? journeyPerformanceText(journeyBestResult.result) : '',
    );
  }
  function overlay(kind, { preserveFocus = false } = {}) {
    if (practiceRenderFailure.failed) return;
    // Repeated suspension may repaint Pause, but does not own a new focus
    // choice. An inactive child must not pull focus back from its parent.
    const repeatedPause =
      kind === 'pause' && !$('game-overlay').hidden && $('game-overlay').dataset.kind === 'pause';
    const preservePauseFocus = preserveFocus || repeatedPause;
    drawResultPicture($('result-picture'), { kind, run, theme, seed, painter, flightPictures });
    $('game-overlay').dataset.kind = kind;
    refreshJourneyBest();
    show('pause-label', kind === 'pause');
    show('overlay-reading', kind !== 'pause');
    show('overlay-footnote', kind !== 'pause');
    $('game-overlay').dataset.intro = String(
      kind === 'ready' &&
        !practice &&
        !activeEntry.sourcePackId &&
        (activeEntry.baseCampaign || campaign).id === baseCampaign.id &&
        levelIndex === 0,
    );
    show('game-overlay', true);
    show('show-result', false);
    show('view-picture', kind === 'won');
    editionUI?.refresh();
    victoryStoryButton.hidden =
      kind !== 'won' ||
      practice ||
      !!completionWarning ||
      !flightPictures?.pins() ||
      !storyPinForTheme(flightPictures.pins(), theme.id);
    show('next-button', kind === 'won' || kind === 'campaign-complete');
    show('choose-mission', kind === 'campaign-complete');
    show('retry-button', kind === 'won' || kind === 'lost');
    show('start-button', kind === 'ready' || kind === 'pause');
    show('overlay-restart', kind === 'pause');
    show('overlay-missions', kind === 'pause');
    show('overlay-settings', kind === 'pause');
    show('overlay-sound', kind === 'pause');
    show('overlay-next-song', kind === 'pause');
    show('pause-mission-info', kind === 'pause' || (!courseSession && kind === 'ready'));
    if (kind === 'ready') $('pause-mission-info').open = true;
    else if (kind === 'pause' && !repeatedPause) $('pause-mission-info').open = false;
    show('overlay-field-details', kind === 'pause');
    show('overlay-brief', !courseSession && (kind === 'ready' || kind === 'pause'));
    show('result-medals', kind === 'won');
    show('retry-consequence', false);
    localizedText($('retry-consequence'), () => '');
    const newAppearance = kind === 'won' && !practice && appearanceRewardIds.length > 0;
    show('appearance-unlock', newAppearance);
    show('choose-appearance', newAppearance);
    localizedText($('appearance-unlock'), () =>
      newAppearance
        ? t('gameplay:newAppearancesFor', {
            value1: contentText(campaign, 'title') || contentText(campaign, 'name') || campaign.id,
            value2: bodyLabels(appearanceRewardIds).join(' · '),
          })
        : '',
    );
    localizedText($('overlay-eyebrow'), () =>
      practice
        ? t('interface:practiceNoCampaignRewards')
        : t('gameplay:mission', {
            value1: String(levelIndex + 1).padStart(2, '0'),
            value2: contentText(run.level, 'name').toUpperCase(),
          }),
    );
    if (kind === 'ready') {
      const brief = refreshMissionBrief();
      localizedText($('overlay-eyebrow'), () =>
        practice
          ? t('interface:practiceNoCampaignRewards')
          : t('gameplay:mission2', { value1: String(levelIndex + 1).padStart(2, '0') }),
      );
      localizedText($('overlay-title'), () =>
        $('game-overlay').dataset.intro === 'true'
          ? t('interface:clearAPathRevealAWorld2')
          : contentText(brief, 'title'),
      );
      localizedText($('overlay-copy'), () => brief.copy);
      localizedText($('start-button'), () => t('interface:startMission2'));
      if (
        !practice &&
        !Object.hasOwn(progress.clears, run.levelId) &&
        Object.keys(progress.clears).length
      )
        localizedText($('start-button'), () => t('interface:continueCampaign'));
      refreshKeyPrompts();
    }
    if (kind === 'campaign-complete') {
      const completion = currentSelection();
      const allCleared = completion.completed === completion.total;
      localizedText($('overlay-eyebrow'), () =>
        allCleared ? t('interface:campaignComplete') : t('interface:campaignEnd'),
      );
      localizedText($('overlay-title'), () =>
        allCleared ? t('interface:everyMissionRevealed') : t('interface:endOfThisCampaign'),
      );
      localizedText($('overlay-copy'), () =>
        t('interface:solo.campaignLibraryComplete', {
          campaign: contentText(campaign, 'title') || contentText(campaign, 'name') || campaign.id,
          count: completion.completed,
          total: completion.total,
        }),
      );
      localizedText($('next-button'), () => t('interface:viewCollection'));
      localizedText($('overlay-footnote'), () =>
        t('interface:yourEarnedPicturesAndBestResultsAreKept'),
      );
    }
    if (kind === 'pause') {
      localizedText($('overlay-title'), () => t('interface:paused'));
      localizedText($('overlay-copy'), () => '');
      localizedText($('start-button'), () => t('interface:resume'));
      localizedText($('overlay-footnote'), () => '');
    }
    if (kind === 'won') {
      localizedText($('overlay-title'), () => t('interface:aLittleMoreLight'));
      localizedText($('overlay-copy'), () =>
        t('gameplay:capturedPoints', {
          value1: formatNumber(run.coverage * 100, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }),
          value2: formatNumber(run.score),
          value3: timeLabel(run.time),
          value4: practice
            ? t('interface:practiceComplete')
            : candidateHost?.owns(activeEntry)
              ? previewSession
                ? t('interface:studioPreviewMissionComplete')
                : runtimeContent
                  ? t('interface:editionMissionComplete')
                  : authoredRoute.id === DEFAULT_JOURNEY_ROUTES.solo
                    ? t('interface:journeyMissionComplete')
                    : t('interface:authoredTestClearRecordedInJourneyProgressNoLegacyCollection')
              : completionWarning
                ? renderMessage(completionWarning)
                : saveSucceeded
                  ? t('interface:fullPictureAddedToYourCollection')
                  : sessionPictures.status().originals
                    ? t('interface:pictureCollectedForThisSessionExportGameDataAndSession')
                    : t('interface:pictureCollectedForThisSessionExportYourLibraryToKeep'),
        }),
      );
      if (recoverGameplayTuning(run.level)?.adminOverride)
        localizedText($('overlay-copy'), () =>
          t('interface:solo.adminPlaytestResult', {
            coverage: formatNumber(run.coverage * 100, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }),
          }),
        );
      localizedText($('result-medals'), () =>
        '★'.repeat(run.medal === 'gold' ? 3 : run.medal === 'silver' ? 2 : 1),
      );
      if (recoverGameplayTuning(run.level)?.adminOverride)
        localizedText($('result-medals'), () => '');
      const completedJourneyMission = journeyEnabled && !practice && !scenario && journeyMission();
      localizedText($('next-button'), () => {
        if (practice) return t('interface:tryItYourself');
        if (completedJourneyMission) {
          const next = nextJourneyMission(completedJourneyMission.id);
          return resultContinuationLabel(t, {
            browse: !next,
            browseKey: 'interface:browseMissions2',
            mission: next ? contentText(next, 'name') : '',
            campaign: next ? contentText(next, 'campaignTitle') : '',
            crossesCampaign:
              !!next &&
              (next.packId !== completedJourneyMission.packId ||
                next.campaignId !== completedJourneyMission.campaignId),
          });
        }
        if (!scenario && !courseSession) {
          const successor = authoredMissionSuccessor(activeEntry, levelIndex);
          if (!successor.atEnd)
            return resultContinuationLabel(t, {
              mission: contentText(campaign.levels[successor.levelIndex], 'name'),
            });
        }
        return t('interface:nextMission');
      });
      localizedText($('overlay-footnote'), () =>
        practice
          ? t('interface:demonstrationsAndImportedMapsDoNotGrantUnlocks')
          : run.medal === 'gold'
            ? t('interface:goldFastAndNoLivesLost')
            : t('interface:tryAnotherClassOrReturnForACleanFasterRoute'),
      );
    }
    if (kind === 'lost') {
      const explanation = retryExplanation(run, { practice });
      localizedText($('overlay-title'), () => t('interface:aNewLineAwaits'));
      localizedText($('overlay-copy'), () =>
        [
          explanation?.reason,
          t('gameplay:youRevealed', {
            value1: formatNumber(run.coverage * 100, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }),
          }),
          explanation?.tip,
        ]
          .filter(Boolean)
          .join(' '),
      );
      localizedText($('retry-button'), () => t('interface:tryAgain2'));
      localizedText($('retry-consequence'), () => explanation?.footnote || '');
      show('retry-consequence', !!explanation);
      localizedText($('overlay-footnote'), () => '');
    }
    if (courseSession) {
      const lesson = getFirstFlightLesson(courseRequest.lessonId);
      const snapshot = courseSnapshot();
      localizedText($('overlay-eyebrow'), () => t('interface:firstFlightOptionalTraining'));
      show('next-button', false);
      show('result-medals', false);
      if (kind === 'ready') {
        localizedText($('overlay-title'), () => contentText(lesson, 'title'));
        localizedText($('start-button'), () => t('interface:startLesson'));
        localizedText($('overlay-footnote'), () =>
          t('interface:takeYourTimeTrainingGrantsNoCampaignRewardsYouCan'),
        );
      } else if (kind === 'won') {
        localizedText($('overlay-title'), () =>
          snapshot?.outcome === 'complete'
            ? t('interface:lessonComplete')
            : t('interface:pictureRevealed'),
        );
        localizedText($('overlay-copy'), () =>
          snapshot?.outcome === 'complete'
            ? t('interface:youDemonstratedThisLessonInTheRealGameEnjoyThe')
            : t('interface:youRevealedThePictureButThisRouteDidNotDemonstrate'),
        );
        localizedText($('retry-button'), () => t('interface:repeatLesson'));
        localizedText($('overlay-footnote'), () =>
          t('interface:trainingResultsStayInThisVisitNoCampaignScoresPictures'),
        );
      }
    }
    refreshSavedFlight();
    refreshMastery();
    refreshCourse();
    refreshDifficulty();
    controllerReading?.refresh();
    if (!preservePauseFocus && !document.hidden && document.hasFocus() && !controllerDialog())
      controllerFocus()?.focus({ preventScroll: true });
  }
  function resultAttemptCurrent(ticket) {
    if (
      resultAttempt !== ticket ||
      ticket.controller.signal.aborted ||
      (ticket.kind !== 'retry' &&
        actorPreferences.snapshot().revision !== ticket.actorChoice.revision)
    )
      return false;
    // Storage adapters can reenter the host. Inspect ownership after those reads.
    const backupLock = profileStorage().getItem(`${libraryKey}.backup-lock`),
      savedRaw = profileStorage().getItem(sessionKey);
    return (
      resultAttempt === ticket &&
      !ticket.controller.signal.aborted &&
      !document.hidden &&
      document.hasFocus() &&
      !dialogOpen() &&
      !practice &&
      !scenario &&
      !courseSession &&
      !courseBlocked() &&
      !courseEntry &&
      !modeDeparture &&
      !missionReplacement &&
      !restartRequest &&
      !contentSwitchBusy &&
      !backupBusy &&
      !sessionBusy &&
      !pictureThemePending &&
      run === ticket.run &&
      recorder === ticket.recorder &&
      runId === ticket.runId &&
      flightPictures === ticket.owner &&
      activeEntry === ticket.entry &&
      campaign === ticket.campaign &&
      levelIndex === ticket.levelIndex &&
      theme === ticket.theme &&
      seed === ticket.seed &&
      turnPolicy === ticket.turnPolicy &&
      classId === ticket.classId &&
      themeOverride === ticket.themeOverride &&
      library.preferences.campaignDifficulty === ticket.difficulty &&
      journeyPreferences?.snapshot().revision === ticket.journeyRevision &&
      (ticket.kind !== 'next' || run.status === 'won') &&
      libraryGeneration === ticket.libraryGeneration &&
      packs === ticket.packs &&
      writer.writable === ticket.writable &&
      persistenceReady === ticket.persistenceReady &&
      backupLock === ticket.backupLock &&
      savedRaw === ticket.savedRaw
    );
  }
  function finishResultAttempt(ticket, message, state, restoreFocus = false) {
    if (resultAttempt !== ticket) return;
    resultAttempt = null;
    const epoch = ++resultAttemptEpoch;
    preparationButtonBusy(ticket.button, false);
    ticket.feedback?.finish(message, state);
    ticket.controller.abort();
    ticket.pictures?.dispose();
    ticket.visuals?.release();
    ticket.visuals = null;
    ticket.actors?.release();
    ticket.actors = null;
    if (
      restoreFocus &&
      resultAttemptEpoch === epoch &&
      !document.hidden &&
      document.hasFocus() &&
      !dialogOpen() &&
      run === ticket.run &&
      flightPictures === ticket.owner &&
      !ticket.button.hidden
    )
      ticket.button.focus({ preventScroll: true });
  }
  function cancelResultAttempt({ restoreFocus = false } = {}) {
    libraryNextOperation?.cancel({ restoreFocus });
    const cancellingSkip = resultAttempt?.kind === 'skip';
    if (resultAttempt)
      finishResultAttempt(
        resultAttempt,
        t('interface:preparationCancelledYourResultIsKept'),
        'cancelled',
        restoreFocus,
      );
    if (cancellingSkip) clearSkipConfirmation();
  }
  async function nextLibraryMission() {
    if (
      libraryNextOperation ||
      run?.status !== 'won' ||
      practice ||
      scenario ||
      courseSession ||
      dialogOpen() ||
      document.hidden
    )
      return;
    const previous = run,
      entry = activeEntry,
      index = levelIndex,
      epoch = resultAttemptEpoch,
      controller = new AbortController(),
      button = $('next-button'),
      cancelButton = $('flight-preparation-cancel');
    const operation = { cancel: null };
    libraryNextOperation = operation;
    let feedback;
    const current = () =>
      libraryNextOperation === operation &&
      !controller.signal.aborted &&
      run === previous &&
      activeEntry === entry &&
      levelIndex === index &&
      resultAttemptEpoch === epoch &&
      !document.hidden &&
      document.hasFocus?.() !== false &&
      !dialogOpen();
    const detach = () => {
      document.removeEventListener('focusin', changedFocus);
      document.removeEventListener('visibilitychange', lostForeground);
      window.removeEventListener('blur', windowBlur);
    };
    operation.cancel = ({ restoreFocus = false } = {}) => {
      if (libraryNextOperation !== operation) return;
      libraryNextOperation = null;
      detach();
      controller.abort();
      preparationButtonBusy(button, false);
      feedback?.finish(
        t('interface:preparationCancelledYourResultIsKeptChooseNextToRetry'),
        'cancelled',
      );
      if (
        restoreFocus &&
        run === previous &&
        !document.hidden &&
        document.hasFocus?.() !== false &&
        !dialogOpen()
      )
        button.focus({ preventScroll: true });
    };
    function changedFocus(event) {
      if (installOfflineOwnsElement(event.target)) return;
      if (![button, cancelButton, document.body, document.documentElement].includes(event.target))
        operation.cancel();
    }
    function lostForeground(event) {
      if (document.hidden || event.type === 'blur') operation.cancel();
    }
    const windowBlur = guardInstallOfflineBlur(lostForeground);
    try {
      feedback = beginPreparation(
        t('interface:findingTheNextMissionYourResultIsKept'),
        operation.cancel,
        'preparing',
        true,
      );
      preparationButtonBusy(button, true);
      button.focus({ preventScroll: true });
      document.addEventListener('focusin', changedFocus);
      document.addEventListener('visibilitychange', lostForeground);
      window.addEventListener('blur', windowBlur);
      const host = await getUnifiedMissionLibrary();
      if (!current()) return;
      await host.refreshInstalled();
      if (!current()) return;
      const row = currentSoloLibraryMission(host);
      const next = librarySuccessor(host.library, row, 'solo');
      if (!next) {
        feedback.finish(t('interface:endOfTheSoloMissionLibraryReplayOrChooseAnother'));
        return;
      }
      feedback.update({
        status: 'preparing',
        stage: 'preparing',
        message: () =>
          t('interface:solo.preparingResultMission', {
            mission: host.library.presentation(next).name,
          }),
      });
      if (host.library.availability(next, 'solo').state !== 'ready') {
        const ready = await host.library.prepare(next, { mode: 'solo', signal: controller.signal });
        if (!current()) return;
        if (ready.state !== 'ready')
          throw new Error(ready.reason || t('interface:theNextMissionIsNotReady'));
      }
      if (!current()) return;
      // Keep admission cancellable while adapters verify installed originals.
      // Transfer only immediately before their own guarded adoption/departure.
      const activation = libraryActivationContext();
      let transferred = false;
      const context = {
        ...activation,
        signal: controller.signal,
        isCurrent: () => activation.isCurrent() && (transferred || current()),
        continuation: true,
        onStatus: feedback.update,
        transferContinuation: () => {
          if (!current() || !activation.isCurrent()) return false;
          transferred = true;
          detach();
          libraryNextOperation = null;
          preparationButtonBusy(button, false);
          feedback.finish();
          button.focus({ preventScroll: true });
          return activation.isCurrent();
        },
      };
      const launched = await host.library.launch(next, { mode: 'solo', ...context });
      if (launched === false && !transferred && current())
        throw new Error(t('interface:theNextMissionCouldNotStart'));
      if (!controller.signal.aborted) feedback.finish();
    } catch (error) {
      if (run === previous && !controller.signal.aborted && !document.hidden) {
        feedback?.finish(
          `Could not prepare the next mission: ${error.message} Your result is kept. Choose Next to retry.`,
          'error',
        );
      }
    } finally {
      detach();
      if (libraryNextOperation === operation) libraryNextOperation = null;
      if (!libraryNextOperation && !resultAttempt) preparationButtonBusy(button, false);
      if (
        run === previous &&
        document.activeElement === cancelButton &&
        !document.hidden &&
        !dialogOpen()
      )
        button.focus({ preventScroll: true });
    }
  }
  async function launchLibrarySkip(destination) {
    if (
      libraryNextOperation ||
      journeySkipDestination !== destination ||
      journeySkipArmed !== runId ||
      !skipSnapshotCurrent(destination.snapshot) ||
      dialogOpen()
    )
      return;
    const controller = new AbortController(),
      button = $('journey-skip'),
      cancelButton = $('flight-preparation-cancel'),
      operation = { cancel: null };
    libraryNextOperation = operation;
    let feedback,
      transferred = false;
    const current = () =>
      libraryNextOperation === operation &&
      !controller.signal.aborted &&
      journeySkipDestination === destination &&
      journeySkipArmed === destination.snapshot.runId &&
      destination.host.library.find(destination.current.id) === destination.current &&
      destination.host.library.find(destination.next.id) === destination.next &&
      skipSnapshotCurrent(destination.snapshot) &&
      !dialogOpen();
    const detach = () => {
      document.removeEventListener('focusin', changedFocus);
      document.removeEventListener('visibilitychange', lostForeground);
      window.removeEventListener('blur', lostForeground);
    };
    operation.cancel = ({ restoreFocus = false } = {}) => {
      if (libraryNextOperation !== operation) return;
      libraryNextOperation = null;
      detach();
      controller.abort();
      preparationButtonBusy(button, false);
      feedback?.finish(t('interface:solo.skipCancelledRetry'), 'cancelled');
      const canRestore = skipSnapshotCurrent(destination.snapshot);
      clearSkipConfirmation();
      if (restoreFocus && canRestore && !button.hidden) button.focus({ preventScroll: true });
    };
    function changedFocus(event) {
      if (![button, cancelButton, document.body, document.documentElement].includes(event.target))
        operation.cancel();
    }
    function lostForeground(event) {
      if (document.hidden || event.type === 'blur') operation.cancel();
    }
    try {
      feedback = beginPreparation(
        localizedMessage('interface:solo.preparingNextMission', {
          mission: destination.next.name,
        }),
        operation.cancel,
        'preparing',
        true,
      );
      preparationButtonBusy(button, true);
      button.focus({ preventScroll: true });
      document.addEventListener('focusin', changedFocus);
      document.addEventListener('visibilitychange', lostForeground);
      window.addEventListener('blur', lostForeground);
      if (destination.host.library.availability(destination.next, 'solo').state !== 'ready') {
        const ready = await destination.host.library.prepare(destination.next, {
          mode: 'solo',
          signal: controller.signal,
        });
        if (!current()) return;
        if (ready.state !== 'ready')
          throw new Error(ready.reason || 'The destination mission is not ready.');
      }
      if (!current()) return;
      const activation = libraryActivationContext();
      const context = {
        ...activation,
        signal: controller.signal,
        continuation: true,
        skip: true,
        onStatus: feedback.update,
        isCurrent: () => activation.isCurrent() && (transferred || current()),
        transferContinuation: () => {
          if (!current() || !activation.isCurrent()) return false;
          transferred = true;
          detach();
          libraryNextOperation = null;
          preparationButtonBusy(button, false);
          feedback.finish();
          clearSkipConfirmation();
          return activation.isCurrent();
        },
        onSkipAdopt: () => {
          if (destination.skipped)
            journeyProfile?.record({
              type: 'skip',
              mode: 'solo',
              missionId: destination.skipped.id,
            });
          else unifiedChooser?.select(destination.next.id);
        },
      };
      const launched = await destination.host.library.launch(destination.next, {
        mode: 'solo',
        ...context,
      });
      if (launched === false && !transferred && current())
        throw new Error('The destination mission could not start.');
      if (!controller.signal.aborted) feedback.finish();
    } catch (error) {
      if (!transferred && skipSnapshotCurrent(destination.snapshot) && !controller.signal.aborted) {
        feedback?.finish(
          `Could not prepare ${destination.next.name}: ${error.message} Your current flight is kept. Choose Skip mission to retry.`,
          'error',
        );
        clearSkipConfirmation();
      }
    } finally {
      detach();
      if (libraryNextOperation === operation) libraryNextOperation = null;
      if (!libraryNextOperation && !resultAttempt) preparationButtonBusy(button, false);
      if (
        !transferred &&
        skipSnapshotCurrent(destination.snapshot) &&
        document.activeElement === cancelButton &&
        !document.hidden &&
        !dialogOpen()
      )
        button.focus({ preventScroll: true });
    }
  }
  async function prepareResultAttempt(
    kind,
    destinationIndex = levelIndex,
    destinationEntry = null,
    destinationMission = null,
  ) {
    if (resultAttempt?.kind === kind) return;
    const previousEpoch = resultAttemptEpoch,
      previous = resultAttempt;
    cancelResultAttempt();
    // Abort/disposal callbacks can start or retire a newer deliberate operation.
    if (resultAttempt || resultAttemptEpoch !== previousEpoch + (previous ? 1 : 0)) return;
    if (
      practice ||
      scenario ||
      courseSession ||
      courseBlocked() ||
      dialogOpen() ||
      document.hidden ||
      !document.hasFocus() ||
      (kind !== 'choose' && kind !== 'skip' && !['won', 'lost'].includes(run?.status)) ||
      (kind === 'choose' && (!journeyEnabled || !run || !paused)) ||
      (kind === 'skip' && (!normalSoloSkipAvailable() || !paused)) ||
      (kind === 'next' && run.status !== 'won')
    )
      return;
    const ticket = {
      kind,
      actorChoice: actorPreferences.snapshot(),
      controller: new AbortController(),
      button: $(
        kind === 'next' ? 'next-button' : kind === 'skip' ? 'journey-skip' : 'retry-button',
      ),
      run,
      recorder,
      runId,
      owner: flightPictures,
      entry: activeEntry,
      campaign,
      levelIndex,
      theme,
      seed,
      turnPolicy,
      classId,
      themeOverride,
      difficulty: library.preferences.campaignDifficulty,
      journeyRevision: journeyPreferences?.snapshot().revision,
      libraryGeneration,
      packs,
      writable: writer.writable,
      persistenceReady,
      backupLock: null,
      savedRaw: null,
      pictures: null,
      feedback: null,
    };
    resultAttempt = ticket;
    const epoch = ++resultAttemptEpoch;
    try {
      ticket.feedback = beginPreparation(
        kind === 'next'
          ? t('interface:preparingTheNextMission')
          : kind === 'skip'
            ? t('interface:solo.preparingSkip')
            : t('interface:preparingThisMissionAgain'),
        cancelResultAttempt,
        'preparing',
        true,
      );
      ticket.backupLock = profileStorage().getItem(`${libraryKey}.backup-lock`);
      if (resultAttempt !== ticket || resultAttemptEpoch !== epoch) return;
      ticket.savedRaw = profileStorage().getItem(sessionKey);
      if (resultAttempt !== ticket || resultAttemptEpoch !== epoch) return;
      if (!resultAttemptCurrent(ticket))
        throw new DOMException(t('interface:preparationCancelled'), 'AbortError');
      if (destinationMission) {
        await candidateHost.ensureMission?.(destinationMission, {
          signal: ticket.controller.signal,
        });
        if (!resultAttemptCurrent(ticket))
          throw new DOMException(t('interface:preparationCancelled'), 'AbortError');
        destinationEntry = candidateHost.select(
          destinationMission,
          journeyPreferences.snapshot().difficulty,
        );
        if (!destinationEntry)
          throw new Error(t('interface:thisMissionIsUnavailableInTheCurrentEdition'));
      }
      const entry =
          destinationEntry ||
          (candidateHost?.owns(activeEntry)
            ? candidateHost.select(journeyMission(), journeyPreferences.snapshot().difficulty)
            : null) ||
          executionForEntry(activeEntry, library.preferences.campaignDifficulty),
        level = entry.campaign.levels[destinationIndex],
        nextTheme =
          themeOverride && entry.themes.some((item) => item.id === theme.id)
            ? theme
            : entry.themes.find((item) => item.id === (level.themeId || entry.campaign.themeId)) ||
              entry.themes[0],
        nextClassId = candidateHost?.owns(entry)
          ? 'scout'
          : entry.classRecipes.some((item) => item.id === classId)
            ? classId
            : entry.classRecipes[0].id,
        options = { seed, turnPolicy, classId: nextClassId, classRecipes: entry.classRecipes };
      const ownedFocus = document.activeElement === ticket.button;
      ticket.feedback.update({
        status: 'preparing',
        stage: 'preparing',
        message: () =>
          t('interface:solo.preparingMission', { mission: contentText(level, 'name') }),
      });
      preparationButtonBusy(ticket.button, true);
      if (ownedFocus) ticket.button.focus({ preventScroll: true });
      if (!resultAttemptCurrent(ticket))
        throw new DOMException(t('interface:preparationCancelled'), 'AbortError');
      let candidateAttempt = null;
      if (candidateHost?.owns(entry)) {
        if (!runtimeContent)
          await gameplayDownloads.ensureMission(
            { routeId: authoredRoute.id, missionId: level.id, mode: 'solo' },
            { signal: ticket.controller.signal, retain: true },
          );
        if (!resultAttemptCurrent(ticket))
          throw new DOMException(t('interface:preparationCancelled'), 'AbortError');
        candidateAttempt = await candidateHost.preparer.prepare(
          {
            missionId: candidateHost.mission(entry, destinationIndex).id,
            difficulty: entry.difficulty,
            seed,
            turnPolicy,
          },
          {
            signal: ticket.controller.signal,
            onStatus: ticket.feedback.update,
            gameplayTuning: nextGameplayTuning(entry),
          },
        );
        if (!resultAttemptCurrent(ticket)) {
          if (candidateHost.preparer.current(candidateAttempt)) candidateHost.preparer.cancel();
          throw new DOMException(t('interface:preparationCancelled'), 'AbortError');
        }
        candidateHost.preparer.take(candidateAttempt);
        ticket.candidatePicture = candidateAttempt.picture;
      }
      const nextRun =
          candidateAttempt?.run ??
          createRun(applyGameplayTuning(level, nextGameplayTuning(entry)), options),
        nextRunId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        nextRecorder =
          candidateAttempt?.recorder ?? createRecorder(nextRun.level, options, buildVersion);
      const pins =
        kind === 'retry' && !candidateAttempt && !ticket.owner.legacy
          ? retryFlightPresentationPins(ticket.owner.pins(), {
              identityCatalog: pictureIdentity(),
              campaignKey: campaignKey(entry.campaign),
              level,
              themeId: nextTheme.id,
            })
          : undefined;
      ticket.pictures = newFlightPictures({
        nextRun,
        nextRunId,
        entry,
        nextThemeId: nextTheme.id,
        candidatePicture: candidateAttempt?.picture ?? null,
        ...(pins ? { pins } : {}),
        legacy: kind === 'retry' ? ticket.owner.legacy : undefined,
      });
      // Audio permission belongs to this explicit action, before storage or decoding.
      activateAudio().catch(() => {});
      await ticket.pictures.ensure(nextTheme.id, {
        signal: ticket.controller.signal,
        onStatus(status) {
          if (resultAttemptCurrent(ticket))
            ticket.feedback.update({
              ...status,
              message: () =>
                t('interface:picture.missionStatus', {
                  name: contentText(level, 'name'),
                  message: flightPictureStatus(status),
                }),
            });
        },
      });
      if (!resultAttemptCurrent(ticket))
        throw new DOMException(t('interface:preparationCancelled'), 'AbortError');
      if (kind !== 'retry') {
        ticket.visuals = await prepareFreshAttemptVisuals(entry, level, nextTheme.id, {
          signal: ticket.controller.signal,
          onStatus: ticket.feedback.update,
        });
        if (!resultAttemptCurrent(ticket))
          throw new DOMException(t('interface:preparationCancelled'), 'AbortError');
        ticket.actors = await prepareAttemptActors(entry, level, nextTheme.id, {
          style: ticket.actorChoice.actorStyle,
          signal: ticket.controller.signal,
          onStatus: ticket.feedback.update,
        });
        if (!resultAttemptCurrent(ticket))
          throw new DOMException(t('interface:preparationCancelled'), 'AbortError');
      }
      const preparedPictures = ticket.pictures;
      const adopted = prepare({
        preparedAttempt: {
          ticket,
          entry,
          levelIndex: destinationIndex,
          theme: nextTheme,
          classId: nextClassId,
          run: nextRun,
          runId: nextRunId,
          recorder: nextRecorder,
        },
      });
      // Disposal, renderer and focus callbacks may hand control to another surface.
      // A prepared flight does not authorize resuming that newer owner's attempt.
      if (
        adopted &&
        resultAttemptEpoch === ticket.adoptionEpoch &&
        run === nextRun &&
        runId === nextRunId &&
        recorder === nextRecorder &&
        flightPictures === preparedPictures &&
        activeEntry === entry &&
        campaign === entry.campaign &&
        levelIndex === destinationIndex &&
        theme === nextTheme &&
        seed === ticket.seed &&
        turnPolicy === ticket.turnPolicy &&
        classId === nextClassId &&
        themeOverride === ticket.themeOverride &&
        libraryGeneration === ticket.libraryGeneration &&
        library.preferences.campaignDifficulty === ticket.difficulty &&
        journeyPreferences?.snapshot().revision === ticket.journeyRevision &&
        packs === ticket.packs &&
        writer.writable === ticket.writable &&
        persistenceReady === ticket.persistenceReady &&
        !courseBlocked() &&
        !courseEntry &&
        !modeDeparture &&
        !missionReplacement &&
        !restartRequest &&
        !contentSwitchBusy &&
        !backupBusy &&
        !sessionBusy &&
        !pictureThemePending &&
        !document.hidden &&
        document.hasFocus() &&
        !dialogOpen()
      ) {
        resume();
        return started && !paused;
      }
    } catch (error) {
      if (resultAttempt === ticket) {
        const cancelled = error?.name === 'AbortError';
        if (!cancelled) {
          // Keep the original diagnostic local, outside player-facing feedback.
          try {
            console.warn(t('interface:missionPreparationFailed'), error);
          } catch {
            // Diagnostics must not interrupt recovery.
          }
        }
        // A diagnostic adapter can hand control to a newer deliberate action.
        if (resultAttempt !== ticket) return;
        const ownedFocus = document.activeElement === $('flight-preparation-cancel');
        finishResultAttempt(
          ticket,
          cancelled
            ? t('interface:preparationCancelledYourResultIsKept')
            : t('interface:couldNotPrepareThisMissionYourResultIsKeptTry'),
          cancelled ? 'cancelled' : 'error',
          ownedFocus,
        );
      }
    } finally {
      if (resultAttempt === ticket) cancelResultAttempt();
      ticket.pictures?.dispose();
      ticket.visuals?.release();
      ticket.visuals = null;
      ticket.actors?.release();
      ticket.actors = null;
      if (!ticket.adoptionEpoch) ticket.candidatePicture?.release();
    }
  }
  function prepare({
    restoreAdoption = false,
    contentSwitchTicket = null,
    difficulty,
    preparedAttempt = null,
    retainAttemptAppearance = false,
  } = {}) {
    if (practiceRenderFailure.failed) return false;
    if (courseEntry || (courseSession && ['leaving', 'ended'].includes(coursePhase))) return;
    if (preparedAttempt) {
      const current = () =>
        preparedAttempt.kind === 'world-play'
          ? worldAttemptCurrent(preparedAttempt.ticket)
          : resultAttemptCurrent(preparedAttempt.ticket);
      if (!current()) return false;
      invalidateContentSwitch({ announce: true });
      if (!current()) return false;
      cancelRestore();
      if (!current()) return false;
      storyDialog.close();
      if (!current()) return false;
      cancelPictureStart({ preserveResult: true, preserveWorld: true });
      if (!current()) return false;
      courseEntryHold = false;
      modeDepartureHold = false;
      titleFlightHold = false;
      courseEntryMessage = '';
      if (courseSession) coursePhase = 'ready';
    } else {
      attemptFiles?.invalidate();
      if (contentSwitchTicket) packLaunchGuard.assert(contentSwitchTicket, packs);
      else invalidateContentSwitch({ announce: true });
      courseEntryHold = false;
      modeDepartureHold = false;
      titleFlightHold = false;
      courseEntryMessage = '';
      if (courseSession) coursePhase = 'ready';
      if (!restoreAdoption) {
        cancelRestore();
        applyNextDifficulty(difficulty);
      }
      cancelPictureStart();
      storyDialog.close();
    }
    const retainedPins = retainAttemptAppearance && flightPictures?.pins();
    const retainedPictures =
      retainAttemptAppearance && flightPictures
        ? {
            // Restart can adopt a new difficulty context while keeping every
            // accepted picture/story choice, just like Retry from results.
            pins:
              retainedPins && !flightPictures.legacy
                ? retryFlightPresentationPins(retainedPins, {
                    identityCatalog: pictureIdentity(),
                    campaignKey: campaignKey(campaign),
                    level: campaign.levels[levelIndex],
                    themeId: theme.id,
                  })
                : retainedPins || undefined,
            legacy: flightPictures.legacy,
          }
        : null;
    const keepVisuals =
      restoreAdoption || retainAttemptAppearance || preparedAttempt?.ticket.kind === 'retry';
    freshVisualAttempt = !keepVisuals;
    let previousPictures = null,
      adoptedPictures = null;
    if (preparedAttempt) {
      const ticket = preparedAttempt.ticket;
      if (preparedAttempt.kind === 'world-play') {
        worldAttempt = null;
        ticket.intent.consumed = true;
        ticket.adoptionEpoch = ++worldPlayEpoch;
        ticket.intent.committed = preparedAttempt;
        if (ticket.replacement) ticket.replacement.adopting = true;
        themeOverride = false;
        musicOverride = false;
        scenario = null;
        practice = practiceSession;
        demo = false;
        classId = preparedAttempt.classId;
        themesFile.themes = preparedAttempt.entry.themes;
        bodyId = preparedAttempt.theme.player;
      } else {
        resultAttempt = null;
        ticket.adoptionEpoch = ++resultAttemptEpoch;
        preparationButtonBusy(ticket.button, false);
      }
      previousPictures = flightPictures;
      adoptedPictures = ticket.pictures;
      flightPictures = adoptedPictures;
      ticket.pictures = null;
      activeEntry = preparedAttempt.entry;
      campaign = activeEntry.campaign;
      classRegistry = activeEntry.classRecipes;
      classId = preparedAttempt.classId;
      themesFile.themes = activeEntry.themes;
      $('theme-select').replaceChildren(
        ...activeEntry.themes.map((t) => localizedOption(() => themeLabel(t), t.id)),
      );
      $('class-select').replaceChildren(...classRegistry.map((c) => new Option(c.label, c.id)));
      progress = progressFor(library, campaign);
      levelIndex = preparedAttempt.levelIndex;
      campaignOverview = false;
      theme = preparedAttempt.theme;
      if (preparedAttempt.kind === 'world-play') {
        $('theme-select').replaceChildren(
          ...activeEntry.themes.map((item) => localizedOption(() => themeLabel(item), item.id)),
        );
        $('theme-select').value = theme.id;
        $('class-select').replaceChildren(
          ...classRegistry.map((item) => new Option(item.label, item.id)),
        );
        const track =
          activeEntry.music?.find((item) => item.id === campaign.musicId) || activeEntry.music?.[0];
        assignMusic(
          track || DEFAULT_TRACKS.find((item) => item.genre === library.preferences.musicGenre),
        );
        if (track) $('music-select').value = track.genre;
        refreshCampaigns();
      }
    } else if (!restoreAdoption) {
      flightPictures?.dispose();
      flightPictures = null;
    }
    legacyPictureButton.hidden = true;
    completionWarning = '';
    appearanceRewardIds = [];
    journeyBestResult = null;
    celebrationActive = false;
    clearSkipConfirmation();
    defeatActive = false;
    defeatPaused = false;
    defeatRemaining = 0;
    localizedText($('skip-celebration'), () => t('interface:keepPicture'));
    sound.reset?.();
    painter.skipCelebration?.();
    show('skip-celebration', false);
    clearInput({ resetDirection: true });
    run =
      preparedAttempt?.run ||
      createRun(
        scenario || practice || courseSession || restoreAdoption
          ? scenario?.level || campaign.levels[levelIndex]
          : applyGameplayTuning(campaign.levels[levelIndex], nextGameplayTuning()),
        {
          seed,
          turnPolicy,
          classId,
          classRecipes: scenario?.classRecipes || classRegistry,
        },
      );
    runId = preparedAttempt?.runId || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    const informationOwner = flightInformation.adopt(run, runId);
    courseObserver = null;
    courseUnavailable = null;
    if (courseSession)
      try {
        courseObserver = createLessonObserver({
          lessonId: courseRequest.lessonId,
          runId,
          initial: captureLessonFacts(run, { runId }),
        });
      } catch {
        stopCourseGuidance();
      }
    const explicitPractice = [MASTERY_SCENARIO_VERSION, ENCOUNTER_SCENARIO_VERSION].includes(
      scenario?.format,
    );
    const observedCampaign = explicitPractice
      ? scenario.masteryDefinition
        ? scenarioMasteryCampaign(scenario, run.classRecipes)
        : null
      : scenario
        ? catalog()
            .map((entry) => entry.campaign)
            .find((entry) => {
              if (!masteryFor(campaignKey(entry), run.levelId, masteryCatalog)) return false;
              const map = entry.levels.find((level) => level.id === run.levelId);
              return (
                map &&
                canonicalJSON(normalizedLevel(map)) === canonicalJSON(run.level) &&
                canonicalJSON(entry.classRecipes) === canonicalJSON(run.classRecipes)
              );
            })
        : campaign;
    masteryDefinition =
      courseSession || recoverGameplayTuning(run.level)
        ? null
        : explicitPractice
          ? scenario.masteryDefinition
          : observedCampaign
            ? masteryFor(campaignKey(observedCampaign), run.levelId, masteryCatalog)
            : null;
    masteryObserver = null;
    masteryAward = null;
    localizedText($('mastery-announcement'), () => '');
    if (masteryDefinition)
      try {
        masteryObserver = createMasteryObserver({
          definition: masteryDefinition,
          setup: captureMasterySetup(run, {
            campaignId: observedCampaign.id,
            campaignKey: campaignKey(observedCampaign),
            runId,
            definition: masteryDefinition,
          }),
          initial: captureMasteryFacts(run, { runId, definition: masteryDefinition }),
        });
      } catch {
        masteryAward = {
          status: 'unavailable',
          message: t('interface:theOptionalGoalIsUnavailableForThisConfigurationYouCan'),
        };
      }
    const authoredLevel = scenario?.level || campaign.levels[levelIndex];
    if (!scenario && !themeOverride) {
      theme =
        themesFile.themes.find((t) => t.id === (authoredLevel.themeId || campaign.themeId)) ||
        themesFile.themes[0];
      if (
        library.preferences.matchClassAppearance ||
        !Object.hasOwn(presets.characters, bodyId) ||
        (!practice && !availableBodies().has(bodyId))
      )
        bodyId = theme.player;
      $('theme-select').value = theme.id;
    }
    if (!scenario && !musicOverride) {
      const track = activeEntry.music?.find(
        (m) => m.id === (authoredLevel.musicId || campaign.musicId),
      );
      if (track) {
        assignMusic(track);
        $('music-select').value = track.genre;
      }
    }
    if (scenario?.music) assignMusic(scenario.music);
    painter.setLevel?.(run.level, { seed });
    setTheme();
    started = false;
    paused = true;
    handled = false;
    recordingStopped = false;
    recorder =
      preparedAttempt?.recorder ||
      createRecorder(
        run.level,
        { seed, turnPolicy, classId, classRecipes: scenario?.classRecipes || classRegistry },
        buildVersion,
      );
    $('export-replay').disabled = !!replayDownload;
    captionUntil = 0;
    localizedText($('mode-caption'), () =>
      courseSession
        ? t('interface:firstFlightOptionalTraining')
        : practice
          ? t('interface:playgroundPractice')
          : `${campaign.title || campaign.name || campaign.id}${difficultyLabel(activeEntry) ? ` · ${difficultyLabel(activeEntry)}` : ''} · ${String(levelIndex + 1).padStart(2, '0')} / ${campaign.levels.length}`,
    );
    if (recoverGameplayTuning(run.level)?.adminOverride)
      $('mode-caption').textContent += ' ' + t('interface:adminPlaytestNoAwards') + '';
    localizedText($('campaign-name'), () =>
      courseSession
        ? t('interface:firstFlightLearnByPlaying')
        : t('gameplay:campaign', {
            value1: contentText(campaign, 'title') || contentText(campaign, 'name') || campaign.id,
          }),
    );
    updateLoadout();
    refreshMissionBrief();
    paintMissions();
    overlay(campaignOverview && !practice ? 'campaign-complete' : 'ready', {
      preserveFocus: !!preparedAttempt,
    });
    flightInformation.commitWarning(
      informationOwner,
      () =>
        courseSession
          ? contentText(getFirstFlightLesson(courseRequest.lessonId), 'instructions.0')
          : practice
            ? t('interface:practiceUsesTheSameSimulationCampaignAwardsAreDisabled')
            : campaignOverview
              ? t('interface:campaignCompleteViewYourCollectionOrChooseAMissionTo')
              : currentBriefing().status,
      null,
      'host.ready',
    );
    if (!restoreAdoption && !preparedAttempt) {
      flightPictures = newFlightPictures(retainedPictures ?? {});
      warmPicture();
    }
    previousPictures?.dispose();
    const preparedOwnershipCurrent = () =>
      !preparedAttempt ||
      ((preparedAttempt.kind === 'world-play'
        ? worldPlayEpoch === preparedAttempt.ticket.adoptionEpoch
        : resultAttemptEpoch === preparedAttempt.ticket.adoptionEpoch) &&
        run === preparedAttempt.run &&
        runId === preparedAttempt.runId &&
        recorder === preparedAttempt.recorder &&
        flightPictures === adoptedPictures &&
        activeEntry === preparedAttempt.entry &&
        campaign === preparedAttempt.entry.campaign &&
        levelIndex === preparedAttempt.levelIndex &&
        theme === preparedAttempt.theme &&
        classId === preparedAttempt.classId);
    // Commit a prepared visual owner only after the simulation, recorder,
    // pictures and campaign have transferred atomically. Presentation adapters
    // can re-enter the app, so a superseded ticket never clears or resumes over
    // the newer owner.
    if (!preparedOwnershipCurrent()) return false;
    if (!keepVisuals) {
      const pendingVisuals = preparedAttempt?.ticket.visuals ?? null;
      const visualStillCurrent = adoptFlightVisualLease(pendingVisuals);
      if (preparedAttempt) preparedAttempt.ticket.visuals = null;
      if (!visualStillCurrent || !preparedOwnershipCurrent()) return false;
      adoptFlightActors(preparedAttempt?.ticket.actors ?? null, !!preparedAttempt);
      if (preparedAttempt) preparedAttempt.ticket.actors = null;
      if (!preparedOwnershipCurrent()) return false;
    }
    refreshHUD();
    return true;
  }
  function resume({ alignCourseBoard = true, contentSwitchTicket = null } = {}) {
    if (practiceRenderFailure.failed) return;
    // A queued activation may arrive after blur even when the picture is cached.
    // Use actual foreground state: a fresh Resume need not wait for another frame.
    if (document.hidden || !document.hasFocus()) return;
    if (courseBlocked()) return;
    if (!run || (campaignOverview && !practice) || ['won', 'lost'].includes(run.status)) return;
    if (librarySkipResolution) cancelSkipResolution({ announce: false });
    if (journeySkipArmed !== null) {
      clearSkipConfirmation();
      warning(localizedMessage('interface:skipCancelledContinueThisMission'));
    }
    attemptFiles?.invalidate();
    if (contentSwitchTicket) packLaunchGuard.assert(contentSwitchTicket, packs);
    else invalidateContentSwitch({ announce: true });
    cancelRestore();
    // Enable audio on the original gesture, before any storage/decode await.
    // Master mute only gates output. It never discards a pending or paused playlist.
    activateAudio().catch(() => {});
    const needsFreshVisuals =
      freshVisualAttempt &&
      !flightVisualLease &&
      !practice &&
      !candidateHost?.owns(activeEntry) &&
      !!freshSoloVisualSelection(activeEntry, theme.id);
    const needsFreshActors = !practice && !flightActorsReady;
    if (!flightPictures?.ready(theme.id) || needsFreshVisuals || needsFreshActors) {
      if (pictureResume) return;
      clearPictureRecovery();
      const owner = flightPictures,
        ticket = ++pictureGeneration,
        selectedRun = run,
        selectedTheme = theme.id;
      const selectedEntry = activeEntry,
        selectedLevel = activeEntry.campaign.levels[levelIndex],
        actorChoice = actorPreferences.snapshot(),
        controller = new AbortController();
      let stagedVisuals = null,
        stagedActors = null;
      pictureVisualController = controller;
      pictureResume = ticket;
      paused = true;
      clearInput();
      warning(picturePreparingMessage, null, 'host.picture');
      const notify = flightInformation.captureWarning('host.picture');
      const feedback = beginPreparation(picturePreparingMessage, cancelPictureStart);
      const prewarm =
        picturePrewarm?.owner === owner && picturePrewarm.themeId === selectedTheme
          ? picturePrewarm
          : null;
      if (prewarm) {
        prewarm.observe = feedback.update;
        if (prewarm.latest) feedback.update(prewarm.latest);
      }
      const prepared = (async () => {
        if (!runtimeContent && candidateHost?.owns(selectedEntry))
          await gameplayDownloads.ensureMission(
            { routeId: authoredRoute.id, missionId: selectedLevel.id, mode: 'solo' },
            { signal: controller.signal, retain: true },
          );
        return (
          prewarm?.promise ??
          owner.ensure(selectedTheme, { signal: controller.signal, onStatus: feedback.update })
        );
      })();
      return prepared
        .then(async () => {
          if (needsFreshVisuals)
            stagedVisuals = await prepareFreshAttemptVisuals(
              selectedEntry,
              selectedLevel,
              selectedTheme,
              {
                signal: controller.signal,
                onStatus: feedback.update,
              },
            );
          if (needsFreshActors)
            stagedActors = await prepareAttemptActors(selectedEntry, selectedLevel, selectedTheme, {
              style: actorChoice.actorStyle,
              signal: controller.signal,
              onStatus: feedback.update,
            });
        })
        .then(() => {
          if (
            pictureResume === ticket &&
            pictureGeneration === ticket &&
            owner === flightPictures &&
            run === selectedRun &&
            theme.id === selectedTheme
          )
            feedback.finish(t('interface:flightAssetsReadyPressResumeToContinue'));
          if (
            pictureResume !== ticket ||
            pictureGeneration !== ticket ||
            owner !== flightPictures ||
            run !== selectedRun ||
            theme.id !== selectedTheme ||
            (needsFreshActors && actorPreferences.snapshot().revision !== actorChoice.revision) ||
            document.hidden ||
            !document.hasFocus() ||
            dialogOpen() ||
            courseBlocked()
          )
            return;
          if (stagedVisuals) {
            adoptFlightVisualLease(stagedVisuals);
            stagedVisuals = null;
          }
          if (needsFreshActors) {
            adoptFlightActors(stagedActors);
            stagedActors = null;
          }
          if (
            pictureResume !== ticket ||
            pictureGeneration !== ticket ||
            run !== selectedRun ||
            owner !== flightPictures
          )
            return;
          pictureResume = null;
          pictureVisualController = null;
          resume({ alignCourseBoard, contentSwitchTicket });
        })
        .catch((error) => {
          if (pictureResume === ticket) {
            feedback.finish(() => flightPictureFailure(error), 'error');
            pictureFailure(error, notify);
          }
        })
        .finally(() => {
          stagedVisuals?.release();
          stagedActors?.release();
          if (pictureVisualController === controller) pictureVisualController = null;
          if (pictureResume === ticket) pictureResume = null;
        });
    }
    pictureResume = null;
    // Readiness may finish while focus is elsewhere. Retire its Resume instruction
    // only when this explicit or still-owned activation actually starts the flight.
    clearPreparation();
    clearPictureRecovery();
    legacyPictureButton.hidden = true;
    clearInput();
    neutralResumeTick = true;
    courseEntryHold = false;
    modeDepartureHold = false;
    titleFlightHold = false;
    courseEntryMessage = '';
    if (!started) rememberSelection();
    started = true;
    paused = false;
    if (['restored', 'paused-resume'].includes(runMessageCue))
      warning(
        run.player.cutting
          ? localizedMessage('interface:flightResumedYourUnfinishedLineIsStillExposed')
          : localizedMessage('interface:flightResumed'),
        'resumed',
        'host.resumed',
      );
    if ($('run-message').textContent === renderMessage(picturePreparingMessage))
      warning(localizedMessage('interface:pictureReady'));
    activateAudio().catch(() => {});
    show('game-overlay', false);
    show('continue-saved-note', false);
    $('game-canvas').focus({ preventScroll: true });
    localizedText($('pause-button'), () => 'Ⅱ');
    refreshCourse();
    refreshHUD();
    if (courseSession && alignCourseBoard) revealFirstFlightBoard($('arena-shell'));
  }
  function finishDefeatPresentation() {
    if (!defeatActive) return;
    defeatActive = false;
    defeatPaused = false;
    defeatRemaining = 0;
    clearInput();
    show('skip-celebration', false);
    overlay('lost');
    warning(localizedMessage('interface:flightEndedReadTheDetailsOrTryAgain'));
    if (journeyEnabled && journeyMission() && !practice && !scenario)
      void prepareResultAttempt('retry');
  }
  function defeatEffectsRunning() {
    return (
      defeatActive && !defeatPaused && !document.hidden && document.hasFocus() && !dialogOpen()
    );
  }
  function advanceDefeatPresentation(dt) {
    if (!defeatEffectsRunning()) return;
    defeatRemaining = Math.max(0, defeatRemaining - Math.max(0, Math.min(0.1, dt)));
    if (defeatRemaining <= 1e-9) finishDefeatPresentation();
  }
  function pause(force, { preserveWorld = false } = {}) {
    if (practiceRenderFailure.failed) return;
    cancelPictureStart({ preserveRecovery: true, preserveWorld });
    if (courseBlocked()) {
      clearInput();
      paused = true;
      sound.pause();
      return;
    }
    if (defeatActive) {
      defeatPaused = true;
      clearInput();
      warning(localizedMessage('interface:defeatPresentationPausedChooseShowDefeatMenuWhenReady'));
      return;
    }
    if (celebrationActive) {
      sound.pause?.();
      return;
    }
    if (!started || ['won', 'lost'].includes(run?.status)) return;
    if (force !== true && paused) {
      resume();
      return;
    }
    clearInput();
    paused = true;
    sound.pause?.();
    if (runMessageCue === 'resumed')
      warning(
        run.player.cutting
          ? localizedMessage('interface:flightPausedYourUnfinishedLineIsKeptPressResumeTo')
          : localizedMessage('interface:flightPausedPressResumeToContinue'),
        'paused-resume',
        'host.paused',
      );
    if (
      !practice &&
      !courseEntryHold &&
      !modeDepartureHold &&
      !titleFlightHold &&
      recorder &&
      !sessionBusy
    ) {
      try {
        persistAttempt(false);
      } catch {}
    }
    overlay('pause');
    localizedText($('pause-button'), () => '▶');
    refreshHUD();
  }
  function refreshHUD() {
    if (practiceRenderFailure.failed) return;
    profileRecovery?.refresh();
    refreshJourneySkip();
    const reactionMission = journeySkipMission();
    journeyReactions.present({
      owned: !!reactionMission,
      mode: 'solo',
      outcome: run?.status,
      missionId: reactionMission?.id,
      ...(candidateHost?.owns(activeEntry) ? { feedback: activeEntry.campaignFeedback } : {}),
      encounter: !!run?.level.encounter,
      relays: !!run?.level.relayGates?.gates?.length,
    });
    show(
      'pause-button',
      started &&
        !paused &&
        !courseBlocked() &&
        !campaignOverview &&
        !celebrationActive &&
        !defeatActive &&
        !['won', 'lost'].includes(run.status),
    );
    localizedText($('shell-edition'), () =>
      courseSession
        ? t('interface:firstFlight2')
        : practice
          ? t('interface:practice')
          : !arcadeActionCapabilities(run?.level).manualAbility
            ? t('interface:arcadeEdition')
            : t('interface:tacticalEdition'),
    );
    document.body.dataset.pictureState = flightPictures?.ready(theme.id) ? 'ready' : 'pending';
    document.body.dataset.flightState =
      defeatActive || celebrationActive || (run.status === 'won' && !$('show-result').hidden)
        ? 'picture'
        : campaignOverview || ['won', 'lost'].includes(run.status)
          ? 'result'
          : !started
            ? 'briefing'
            : paused
              ? 'paused'
              : 'running';
    $('coverage').innerHTML = `${(run.coverage * 100).toFixed(1)}<small>%</small>`;
    $('coverage').setAttribute('aria-valuenow', (run.coverage * 100).toFixed(1));
    localizedAttribute($('coverage'), 'aria-valuetext', () =>
      t('gameplay:hud.coverageValue', {
        coverage: formatNumber(run.coverage * 100, { maximumFractionDigits: 1 }),
        target: Math.round(run.level.goal.coverage * 100),
      }),
    );
    $('coverage-bar').style.width = `${run.coverage * 100}%`;
    $('goal-marker').style.left = `${run.level.goal.coverage * 100}%`;
    localizedText($('target'), () =>
      t('gameplay:target', { value1: Math.round(run.level.goal.coverage * 100) }),
    );
    $('coverage').dataset.target = Number.isFinite(run.level.goal.coverage)
      ? ` / ${Math.round(run.level.goal.coverage * 100)}%`
      : '';
    localizedText($('lives'), () =>
      run.lives > 3 ? `◆ ×${run.lives}` : '◆ '.repeat(run.lives).trim() || '—',
    );
    localizedAttribute($('lives'), 'aria-label', () =>
      t('gameplay:hud.lives', { count: run.lives }),
    );
    $('lives').dataset.compactValue = `♥ ${run.lives}`;
    localizedText($('time'), () => timeLabel(run.time));
    localizedText($('score'), () => {
      // Keep raw score precision in the run/save/replay; only compact the HUD.
      const label = formatNumber(run.score, { useGrouping: false, maximumFractionDigits: 3 });
      return Number.isInteger(run.score) ? label.padStart(5, '0') : label;
    });
    const required = run.objectives.filter((o) => o.required),
      done = required.filter((o) => o.captured);
    localizedText($('objective-state'), () =>
      campaignOverview
        ? t('interface:chooseAMissionToReplay')
        : run.status === 'won'
          ? t('interface:targetReached')
          : run.status === 'lost'
            ? t('interface:retryWhenYouAreReady')
            : required.length
              ? `${contentText(theme, 'labels.objective')}: ${done.length} / ${required.length}`
              : t('interface:closeALineToRevealThePicture'),
    );
    localizedText($('flight-state'), () =>
      campaignOverview
        ? t('interface:campaignComplete3')
        : run.status === 'won'
          ? t('interface:missionComplete')
          : run.status === 'lost'
            ? t('interface:flightEnded')
            : run.status === 'respawning'
              ? t('interface:recovering')
              : !started
                ? t('interface:readyForLaunch')
                : paused
                  ? t('interface:paused')
                  : run.player.cutting
                    ? run.player.speed === 0
                      ? t('interface:lineExposedChooseATurn')
                      : t('interface:liveLineExposed')
                    : ['xonix-core.v6', 'xonix-core.v7', 'xonix-core.v8', 'xonix-core.v9'].includes(
                          run.ruleset,
                        )
                      ? t('interface:reclaimedGround')
                      : t('interface:safeGround'),
    );
    $('status-dot').style.background = run.player.cutting ? 'var(--danger)' : 'var(--safe)';
    localizedText($('ability-state'), () => {
      const left = Math.max(0, run.ability.cooldownUntil - run.time);
      const status =
        left > 0
          ? t('gameplay:hud.cooldown', {
              seconds: formatNumber(left, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
            })
          : run.ability.capacity && run.ability.ammo === 0
            ? t('interface:emptyRefillAtSupply')
            : t('common:status.ready');
      return run.ability.capacity
        ? t('gameplay:hud.charges', {
            status,
            ammo: run.ability.ammo,
            capacity: run.ability.capacity,
          })
        : status;
    });
    const canSwitchCraft = craftSwitchAvailable();
    $('hangar-button').disabled = !canSwitchCraft;
    show('hangar-button', canSwitchCraft);
    localizedText(
      $('loadout-note'),
      () =>
        t('interface:startingClassChangesBeginAFreshAttempt') +
        (canSwitchCraft ? ' ' + t('interface:useAHangarToSwitchDuringFlight') + '' : ''),
    );
    $('restart-button').disabled = defeatActive || courseBlocked() || campaignOverview;
    $('restart-button').hidden = !started || ['won', 'lost'].includes(run.status);
    refreshInputPresentation();
    $('pause-button').disabled = courseBlocked() || campaignOverview;
    $('save-attempt-button').disabled =
      !started || practice || ['won', 'lost'].includes(run.status);
    const near = run.hangars?.some(
      (h) => Math.hypot(h.x - run.player.x, h.y - run.player.y) <= h.radius,
    );
    localizedText($('hangar-state'), () =>
      courseSession
        ? t('interface:scoutFixedLessonCraftNoHangarsInTraining')
        : run.signal?.zoneIds?.length
          ? run.signal.resistant
            ? t('interface:fiberLinkSignalZoneBypassedLineRemainsVulnerable')
            : t('interface:signalInterferenceSlowerMovementOrDisabledEquipment')
          : canSwitchCraft
            ? t(
                near && !run.player.cutting
                  ? 'gameplay:hud.hangarAvailable'
                  : 'gameplay:hud.hangarReturn',
                { craft: contentText(run.classRecipe, 'label') },
              )
            : contentText(run.classRecipe, 'label'),
    );
    if (run.rules.timeLimitSeconds)
      localizedText($('time'), () => timeLabel(Math.max(0, run.rules.timeLimitSeconds - run.time)));
    const encounter = encounterView(run),
      classic = classicView(run);
    show('encounter-status', !!(encounter || classic) && !campaignOverview);
    $('encounter-status').dataset.kind = encounter ? 'encounter' : 'classic';
    localizedText(
      $('encounter-title'),
      () => contentText(encounter, 'title') || t('interface:classicField'),
    );
    localizedText($('encounter-instruction'), () => contentText(encounter, 'instruction') || '');
    show('encounter-instruction', !!encounter);
    localizedText($('classic-summary'), () => contentText(classic, 'summary') || '');
    show('classic-summary', !!classic);
    $('encounter-status').dataset.phase =
      encounter?.phase ||
      (classic?.enemies.some((enemy) => enemy.mode === 'warning') ? 'warning' : 'open');
    refreshMastery();
    refreshCourse();
    flightDetails?.reconcile();
  }
  function eventFeedback(events) {
    const ticket = flightInformation.begin(run, events);
    // capture.stopped follows cells.claimed in the same accepted closure. Keep
    // the rule explanation when adding the fresh-steering cue; do not replace it.
    const teachingCapture =
      journeyEnabled &&
      !practice &&
      (candidateHost ? activeEntry.campaignId === 'prologue' : levelIndex < 2);
    const captureTeaching = () => {
      const occupied = inspectCaptureSnapshot(run).components.filter((region) => region.retained);
      const anchors = occupied.flatMap((region) => region.enemyIds);
      return `Line secured. ${occupied.length} occupied region${occupied.length === 1 ? ' remains' : 's remain'}${anchors.length ? ` around ${anchors.slice(0, 3).join(', ')}${anchors.length > 3 ? ' and other field enemies' : ''}` : ''}. Empty regions fill; field enemies retain their regions.`;
    };
    const openedGates = events.filter((event) => event.type === 'relay.opened').length;
    const captureTerrain = [
      foundationReturnCaption(run, events),
      ...events
        .filter((event) => event.type === 'cells.claimed')
        .map((event) => terrainTransitionCaption(run, event)),
      openedGates
        ? `${openedGates} relay connector${openedGates === 1 ? '' : 's'} opened permanently. Reclaimed ground, not earned coverage.`
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    try {
      for (const [index, event] of events.entries()) {
        flightInformation.observeEvent(ticket, index, () => {
          if (index === 0)
            sound.events(events, run, theme, {
              bodyId: flightActorLease?.pin().style === 'fpv' ? `fpv-${run.activeClassId}` : bodyId,
              actorStyle: flightActorLease?.pin().style,
              resultContext: candidateHost?.owns(activeEntry)
                ? {
                    owned: !!journeySkipMission(),
                    mode: 'solo',
                    outcome: run?.status,
                    missionId: journeySkipMission()?.id,
                    feedback: activeEntry.campaignFeedback,
                  }
                : null,
            });
          if (event.type === 'class.switched') {
            updateLoadout();
            setTheme();
            warning(
              t('gameplay:nowFlyingChargesAndCooldownsArePreserved', {
                value1: run.classRecipe.label,
              }),
            );
          }
          if (event.type === 'class.rejected')
            warning(
              t('gameplay:cannotSwitchCraftReturnToSafeHangarGround', {
                value1: event.reason,
              }),
            );
          if (event.type === 'cells.claimed') {
            if (teachingCapture)
              warning([captureTeaching(), captureTerrain].filter(Boolean).join(' '), 'secured');
            else
              warning(
                [
                  t('gameplay:lineSecuredRevealed', {
                    value1: (run.coverage * 100).toFixed(1),
                    value2:
                      event.indices?.length < 50
                        ? ` ${t('interface:bothSidesMayStillContainAnEnemy')}`
                        : '.',
                  }),
                  captureTerrain,
                ]
                  .filter(Boolean)
                  .join(' '),
                'secured',
              );
          }
          if (
            event.type === 'cut.started' &&
            ['failure', 'secured', 'secured-stopped'].includes(runMessageCue) &&
            run.status === 'running' &&
            run.player.cutting
          )
            warning(
              t(
                ['xonix-core.v6', 'xonix-core.v7', 'xonix-core.v8', 'xonix-core.v9'].includes(
                  run.ruleset,
                )
                  ? 'gameplay:liveLineExposedReachReclaimedGroundToSecureIt'
                  : 'gameplay:liveLineExposedReachSafeGroundToSecureIt',
              ),
            );
          if (event.type === 'player.failed')
            warning(
              {
                'self-contact': t('interface:yourLineCrossedItselfChooseANewRoute'),
                'mission-timeout': t('interface:theMissionClockRanOutTryAFasterRoute'),
                'cut-timeout': t('interface:yourLiveLineStayedOpenTooLongMakeAShorter'),
                'cable-limit': t('interface:yourCableBudgetRanOutCloseAShorterLine'),
                'lethal-terrain': t('interface:aLethalFieldCaughtYourCraftEncloseItBeforeCrossing'),
              }[event.cause] || t('interface:yourLineWasCaughtTheTerritoryYouRevealedIsKept'),
              'failure',
            );
          if (event.type === 'lineImpact.seeded')
            warning(
              t(
                ['xonix-core.v6', 'xonix-core.v7', 'xonix-core.v8', 'xonix-core.v9'].includes(
                  run.ruleset,
                )
                  ? 'gameplay:lineStruckReachReclaimedGroundBeforeTheTravellingSparkCatches'
                  : 'interface:lineStruckReachSafeGroundBeforeTheTravellingSparkCatches',
              ),
            );
          if (event.type === 'lineImpact.arrived')
            warning(localizedMessage('interface:theTravellingImpactReachedYourCraftOneLifeLost'));
          if (event.type === 'shield.absorbed')
            warning(
              localizedMessage('interface:shieldAbsorbedTheHitYourUnfinishedLineIsCancelledNo'),
            );
          if (event.type === 'ability.rejected')
            warning(
              {
                empty: t('interface:noChargesLeftReturnToASupplyPadAndPress'),
                cooldown: t('interface:abilityIsRechargingWatchTheCooldownBesideYourControls'),
                'already-full': t('interface:yourSuppliesAreAlreadyFull'),
                'out-of-range': t('interface:moveOntoASupplyPadToPickUpACharge'),
              }[event.reason] || t('interface:abilityIsUnavailableRightNow'),
            );
          if (event.type === 'ability.used')
            warning(
              {
                scan: t('interface:hiddenObjectivesMarkedShortDirectionHintsShowWhereEnemiesAre'),
                'stun-field': t('interface:stunFieldPlacedNearbyMovingFieldEnemiesAreBrieflyHeld'),
                'slow-field': t('interface:slowFieldPlacedNearbyFieldEnemiesMoveAtQuarterSpeed'),
                shield: t('interface:shieldActiveOneEnemyContactCanCancelYourLineSafely'),
              }[event.primitive] ||
                t('gameplay:active', {
                  value1: theme.labels.ability,
                }),
            );
          if (event.type === 'pickup.collected')
            warning(localizedMessage('interface:suppliesReadyChooseYourNextOpportunity'));
          if (event.type === 'capture.stopped')
            warning(
              [
                teachingCapture
                  ? captureTeaching()
                  : t('gameplay:lineSecuredRevealed', {
                      value1: (run.coverage * 100).toFixed(1),
                      value2: '.',
                    }),
                captureTerrain,
                t('interface:tapADirectionToFlyAgain'),
              ]
                .filter(Boolean)
                .join(' '),
              'secured-stopped',
            );
          if (event.type === 'powerup.collected')
            warning(
              {
                'extra-life': event.gain
                  ? t('interface:extraLifeCollected')
                  : t('interface:lifePickupCollectedAlreadyAtTheNineLifeLimit'),
                'player-speed': t('interface:speedPickupFasterFlightForFiveSeconds'),
                'enemy-slow': t('interface:slowPickupEnemiesMoveAtHalfSpeedForSixSeconds'),
                'enemy-freeze': t('interface:freezePickupEnemiesAreHeldForThreeSecondsTerrainAnd'),
              }[event.kind] || t('interface:powerupCollected'),
            );
          if (event.type === 'rover.warning')
            warning(
              localizedMessage('interface:claimedGroundRoverWakingInOneSecondWatchTheMarked'),
            );
          if (event.type === 'rover.activated')
            warning(
              localizedMessage('interface:claimedGroundRoverActiveYourSecuredGroundStillHasA'),
            );
          if (event.type === 'erosion.warning')
            warning(localizedMessage('interface:theMarkedCapturedCellIsAboutToReopenWatchThe'));
          if (event.type === 'cells.eroded')
            warning(
              [
                t('interface:groundReopenedReclaimingItRestoresCoverageWithoutRepeatCapturePoints'),
                terrainTransitionCaption(run, event),
              ]
                .filter(Boolean)
                .join(' '),
            );
          if (
            event.type === 'encounter.stageChanged' ||
            event.type === 'encounter.phaseChanged' ||
            event.type === 'encounter.defeated'
          ) {
            const cue = encounterView(run);
            if (cue) warning(`${cue.title}. ${cue.instruction}`, 'encounter');
          }
          if (event.type === 'boss.warning')
            warning(laneWarningCaption(run, event, theme.labels.boss));
        });
      }
      painter.effectsFor(events, run);
      flightInformation.finish(ticket);
    } catch (error) {
      flightInformation.cancel(ticket);
      throw error;
    }
  }
  const gameWakeLock = createGameWakeLock();
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) {
      journeyPerformanceActive = false;
      journeyProfile?.performance.dispose();
    }
    if (event.persisted) gameWakeLock.setActive(false);
    else gameWakeLock.dispose();
  });
  function update(elapsed) {
    gameWakeLock.setActive(
      !demoHost?.active && started && !paused && run.status === 'running' && !document.hidden,
    );
    if (document.hidden || !document.hasFocus()) {
      if (!controllerInactive) {
        controllerInactive = true;
        clearInput();
        if (demoHost?.active) demoHost.foregroundLost();
        else pause(true);
      }
      return;
    }
    controllerInactive = false;
    // The isolated lesson owns its controller; the paused parent must not
    // sample the same pad or turn a child Confirm into a parent menu action.
    if (enemyGuide?.ownsPracticeFocus()) {
      clearInput();
      return;
    }
    enemyGuide?.update(elapsed, { reduced: displayPreferences.snapshot().effectiveReducedEffects });
    refreshInputPresentation();
    controllerConfirmTrace.syncHost();
    const scope = controllerScope();
    const controllerTime = performance.now();
    controllerFrame = controller.sample({
      scope: demoHost?.gameplayInputActive ? 'flight' : scope,
      spectator: demoHost?.active && !demoHost?.practiceArmed,
      timeMs: controllerTime,
      toggleBoostEligible: demoHost?.active
        ? demoHost.toggleBoostEligible
        : run?.status === 'running',
    });
    soloRadioSetup.refresh();
    refreshControllerBoostCue();
    const { status, assigned, disconnected } = controllerFrame;
    if (demoHost?.active) {
      const sampledFrame = controllerFrame,
        menuRoot = controllerMenuRoot(),
        gameplayInputActive = demoHost.gameplayInputActive;
      controllerConfirmLifecycle.sample(sampledFrame.confirmSnapshot);
      // A release can close Demo or change its scope. Keep the old frame out
      // of the newly focused screen, and leave Confirm to the shared owner.
      if (
        demoHost.active &&
        controllerScope() === scope &&
        controllerMenuRoot() === menuRoot &&
        demoHost.gameplayInputActive === gameplayInputActive
      ) {
        demoHost.controller({
          ...sampledFrame,
          ui: { ...sampledFrame.ui, confirm: false },
        });
        demoHost.update(elapsed);
      }
      return;
    }
    if (Object.values(controllerFrame.ui).some(Boolean)) demoHost?.activity();
    demoHost?.update(elapsed);
    if (demoHost?.active) return;
    const flightModality = JSON.stringify(controllerFrame.flight);
    if (
      status.code === 'joined' ||
      Object.values(controllerFrame.ui).some(Boolean) ||
      (flightModality !== lastControllerModality &&
        Object.values(controllerFrame.flight).some(Boolean))
    )
      setInputModality('controller');
    lastControllerModality = flightModality;
    if (status.message !== controllerStatus) {
      controllerStatus = status.message;
      localizedText($('input-status'), () =>
        status.code === 'disconnected' || assigned
          ? status.message
          : t('gameplay:keyboardTouch', { value1: status.message }),
      );
    }
    if (status.code === 'joined') refreshControllerPrompts();
    const connectionHint = $('controller-connection-hint');
    if (connectionHint.textContent !== status.message)
      localizedText(connectionHint, () => status.message);
    show('controller-ui-hint', !!assigned && scope !== 'flight');
    if (scope !== controllerPreviousScope) {
      controllerPreviousScope = scope;
      localizedText($('controller-ui-hint'), () =>
        scope === 'flight' ? controllerFlightHint() : controllerMenuHint(),
      );
      if (assigned && scope !== 'flight') controllerNavigation.engage();
    }
    if (status.code === 'joined' && scope !== 'flight') controllerNavigation.engage();
    const sampledFrame = controllerFrame;
    controllerConfirmLifecycle.sample(sampledFrame.confirmSnapshot);
    // Confirm alone is owned by the coordinator. Native-event probes never
    // consume the remaining router edges, which are dispatched once here.
    const confirmCommand = { ...sampledFrame.ui, confirm: false };
    if (disconnected) {
      clearInput();
      pause(true);
      warning(
        localizedMessage(
          'interface:controllerDisconnectedYourFlightIsPausedReleaseControlsAndPress',
        ),
      );
    } else {
      if (controllerScope() === scope) controllerNavigation.handle(confirmCommand);
      const flight = controllerFrame?.flight ?? {};
      const capabilities = arcadeActionCapabilities(run?.level);
      if (scope === 'flight' && (flight.stop || (flight.action && !capabilities.manualAbility))) {
        pause(true);
        clearInput();
      } else if (scope === 'flight' && flight.pickup && !capabilities.manualPickup) {
        pause(true);
        $('shell-guide').click();
        clearInput();
      } else if (flight.hangar) {
        if (craftSwitchAvailable()) $('hangar-button').click();
        else {
          pause(true);
          $('shell-packs').click();
        }
        clearInput();
      }
    }
    let controls = input.poll();
    pendingAction = pendingAction || controls.action;
    pendingPickup = pendingPickup || controls.pickup;
    const focus = document.activeElement;
    controllerPreview?.report({
      scope: controllerScope().slice(0, 160),
      focusedId: (focus?.id || '').slice(0, 160),
      focusedLabel: (
        focus?.getAttribute('aria-label') ||
        (focus?.matches('button,a,summary') ? focus.textContent : focus?.id) ||
        ''
      )
        .trim()
        .slice(0, 160),
      assigned: !!assigned,
      message: status.message.slice(0, 240),
    });
    if (
      !courseBlocked() &&
      !paused &&
      started &&
      flightPictures?.ready(theme.id) &&
      !dialogOpen() &&
      !['won', 'lost'].includes(run.status)
    ) {
      if (elapsed > 0.25) {
        pause(true);
        warning(
          localizedMessage('interface:pausedAfterALongFrameInterruptionResumeToContinueSafely'),
        );
        return;
      }
      accumulator += elapsed;
      while (accumulator + 1e-9 >= FIXED_DT && !['won', 'lost'].includes(run.status)) {
        const command = {
          direction: controls.direction,
          boost: controls.boost,
          action: pendingAction || controls.action,
          pickup: pendingPickup || controls.pickup,
          switchClass: pendingSwitch,
        };
        const resuming = neutralResumeTick;
        if (resuming) {
          command.boost = false;
          command.action = false;
          command.pickup = false;
          command.switchClass = null;
          neutralResumeTick = false;
        }
        if (!recordingStopped && recorder.ticks >= MAX_REPLAY_TICKS) {
          recordingStopped = true;
          recorder = null;
          $('export-replay').disabled = true;
          warning(localizedMessage('interface:the30MinuteReplayBudgetIsFullRecordingWasDiscarded'));
        }
        const beforeStatus = run.status;
        if (beforeStatus === 'respawning') {
          command.direction = null;
          command.boost = false;
          command.action = false;
          command.pickup = false;
          command.switchClass = null;
        }
        let lessonBefore = null;
        if (courseObserver)
          try {
            lessonBefore = captureLessonFacts(run, { runId });
          } catch {
            stopCourseGuidance();
          }
        stepRun(run, command, FIXED_DT);
        sound.feedback(true, theme, run, {
          bodyId: flightActorLease?.pin().style === 'fpv' ? `fpv-${run.activeClassId}` : bodyId,
          actorStyle: flightActorLease?.pin().style,
          command,
        });
        if (
          runMessageCue === 'secured-stopped' &&
          run.status === 'running' &&
          command.direction &&
          run.player.speed > 0
        )
          warning(localizedMessage('interface:flightMoving'), 'secured');
        controls = controllerBoostAfterRecovery({
          beforeStatus,
          run,
          controller,
          input,
          frame: controllerFrame,
          controls,
        });
        if (beforeStatus === 'respawning' || run.status === 'respawning') {
          input.clear();
          controller.clear();
          controls = { direction: null, boost: false, action: false, pickup: false };
        }
        if (run.events.some((event) => event.type === 'capture.stopped')) {
          // Record the closure tick unchanged; later substeps wait for a fresh gesture.
          input.clear();
          controller.clear();
          controllerFrame = null;
          controls = { direction: null, boost: false, action: false, pickup: false };
          pendingSwitch = null;
        }
        refreshControllerBoostCue();
        if (masteryObserver)
          try {
            masteryObserver.observe(
              captureMasteryFacts(run, { runId, definition: masteryDefinition }),
            );
          } catch {
            masteryObserver = null;
            masteryAward = {
              status: 'unavailable',
              message: t('interface:liveGoalTrackingIsUnavailableYourPictureProgressIsKept'),
            };
          }
        pendingAction = false;
        pendingPickup = false;
        if (!resuming) pendingSwitch = null;
        accumulator -= FIXED_DT;
        if (!recordingStopped)
          try {
            recordInput(recorder, command);
          } catch {
            recordingStopped = true;
            recorder = null;
            $('export-replay').disabled = true;
            warning(localizedMessage('interface:replayRecordingStoppedYouCanKeepPlayingStartANew'));
          }
        if (courseObserver)
          try {
            courseObserver.observe(lessonBefore, captureLessonFacts(run, { runId }));
          } catch {
            stopCourseGuidance();
          }
        eventFeedback(run.events);
      }
      if (!handled && ['won', 'lost'].includes(run.status)) {
        let journeyRewardFailure = null;
        handled = true;
        paused = true;
        clearInput();
        refreshCourse();
        if (run.status === 'won' && !practice && !recoverGameplayTuning(run.level)?.adminOverride) {
          void retainDemoRun(false);
          const mission = journeyEnabled && !scenario && journeyMission();
          if (mission) {
            const acceptedPicture = flightPictures?.current();
            const completion = {
              type: 'complete',
              mode: 'solo',
              missionId: mission.id,
              runId,
              gameplayId: dataIdentity({
                ruleset: run.ruleset,
                level: run.level,
                classes: run.classRecipes,
              }),
              difficulty: activeEntry.difficulty || 'standard',
              stars: run.medal === 'gold' ? 3 : run.medal === 'silver' ? 2 : 1,
              ...(candidateHost?.owns(activeEntry) &&
              flightPictures?.context.runId === runId &&
              flightPictures.context.levelId === run.levelId &&
              flightPictures.ready(theme.id) &&
              acceptedPicture
                ? {
                    picture: {
                      mode: 'solo',
                      editionId: authoredRoute.id,
                      missionId: mission.id,
                      campaignKey: campaignKey(activeEntry.campaign),
                      levelId: run.levelId,
                      levelRevision: String(flightPictures.context.levelRevision),
                      runId,
                      gameplayId: dataIdentity({
                        ruleset: run.ruleset,
                        level: run.level,
                        classes: run.classRecipes,
                      }),
                      difficulty: activeEntry.difficulty || 'standard',
                      name: mission.name,
                      campaignTitle: mission.campaignTitle,
                      themeId: flightPictures.context.themeId,
                      asset: acceptedPicture.assetRevision,
                    },
                  }
                : {}),
            };
            try {
              journeyProfile.record(completion);
            } catch (error) {
              // Presentation capacity/conflicts must not interrupt the legal
              // result or Next. Preserve the clear, never substitute its art.
              const { picture: _picture, ...receipt } = completion;
              try {
                journeyProfile.record(receipt);
              } catch {
                /* Existing stored data stays intact. */
              }
              journeyRewardFailure = localizedMessage(
                'interface:journeyPictures.soloRetainFailed',
                {
                  error: error.message,
                },
              );
            }
          }
          if (
            candidateHost?.owns(activeEntry) &&
            recorder &&
            !recordingStopped &&
            !recoverGameplayTuning(run.level)?.adminOverride
          ) {
            const acceptedMission = journeyMission();
            const acceptedRun = run,
              acceptedRunId = runId;
            const acceptedClear =
              acceptedMission && journeyProfile?.snapshot().clears.solo[acceptedMission.id];
            if (acceptedClear?.runId === acceptedRunId) {
              try {
                const replay = exportReplay(recorder, acceptedRun);
                void journeyProfile.performance
                  .capture({
                    mode: 'solo',
                    missionId: acceptedMission.id,
                    ...acceptedClear,
                    replay,
                  })
                  .then((result) => {
                    if (!journeyPerformanceActive || run !== acceptedRun || runId !== acceptedRunId)
                      return;
                    journeyBestResult = { runId: acceptedRunId, result };
                    refreshJourneyBest();
                  })
                  .catch(() => {
                    if (!journeyPerformanceActive || run !== acceptedRun || runId !== acceptedRunId)
                      return;
                    journeyBestResult = { runId: acceptedRunId, result: { error: 'unavailable' } };
                    refreshJourneyBest();
                  });
              } catch {
                /* Comparison is optional; the accepted clear and Next remain available. */
              }
            }
          }
          if (!candidateHost?.owns(activeEntry)) {
            const previousBodies = availableBodies();
            try {
              const result = getSummary(run);
              const tuning = recoverGameplayTuning(run.level);
              if (tuning) {
                const authored = campaign.levels.find((level) => level.id === run.levelId);
                if (tuning.adminOverride || !matchRecordedGameplayTuning(authored, run.level))
                  throw new Error(
                    t('interface:thisPlaytestDoesNotQualifyForAuthoredCollectionProgress'),
                  );
                // Normal pressure clears retain the original picture/collection owner.
                // Exact reconstruction also preserves restored native gp4 runs;
                // arbitrary replay revisions never reach the authored award path.
                result.revision = authored.revision;
              }
              library = recordLibraryCompletion(library, {
                campaign,
                result,
                runId,
                themeId: theme.id,
                bodyId,
                sourcePackId: activeEntry.sourcePackId,
                presentationPins: flightPictures?.pins(),
                mediaIdentityCatalog: flightPictures?.identityCatalog,
              });
            } catch (error) {
              completionWarning = localizedMessage(
                'gameplay:yourPictureIsOpenButTheCollectionCouldNotBe',
                {
                  value1: localizedMessage(
                    recorder
                      ? 'interface:exportThisReplayAndYourLibrary'
                      : 'interface:theReplayRecordingHasEndedExportYourLibrary',
                  ),
                },
              );
              localizedText(
                $('save-warning'),
                () => `${renderMessage(completionWarning)} ${error.message}`,
              );
              show('save-warning', true);
            }
            progress = progressFor(library, campaign);
            appearanceRewardIds = [...availableBodies()].filter((id) => !previousBodies.has(id));
            persistProfile();
            updateBodies();
            paintMissions();
            if (masteryDefinition && recorder && !completionWarning)
              try {
                void masteryAwards.submit(
                  {
                    replay: exportReplay(recorder, run),
                    campaign,
                    definition: masteryDefinition,
                    runId,
                    earnedAt: new Date().toISOString(),
                  },
                  { eligible: !practice },
                );
              } catch (error) {
                masteryAward = {
                  status: 'unavailable',
                  message: localizedMessage(
                    'gameplay:yourPictureIsCollectedTheSealCouldNotBeChecked',
                    { value1: error.message },
                  ),
                };
              }
            try {
              const old = JSON.parse(profileStorage().getItem(sessionKey));
              if (!completionWarning && saveSucceeded && old?.runId === runId) {
                assertWriter();
                profileStorage().removeItem(sessionKey);
              }
            } catch {}
          } else {
            paintMissions();
            try {
              const old = JSON.parse(profileStorage().getItem(sessionKey));
              if (old?.runId === runId) {
                assertWriter();
                profileStorage().removeItem(sessionKey);
              }
            } catch {}
          }
        }
        if (run.status === 'won') {
          if (recoverGameplayTuning(run.level)?.adminOverride)
            try {
              const old = JSON.parse(profileStorage().getItem(sessionKey));
              if (old?.runId === runId) {
                assertWriter();
                profileStorage().removeItem(sessionKey);
              }
            } catch {
              warning(localizedMessage('interface:playtestEndedButItsSavedSlotCouldNotBeCleared'));
            }
          painter.startCelebration?.({
            levelId: run.levelId,
            seed,
            reduced: displayPreferences.snapshot().effectiveReducedEffects,
          });
          celebrationActive = true;
          show('game-overlay', false);
          show('skip-celebration', true);
          show('show-result', false);
          warning(
            journeyRewardFailure ||
              localizedMessage('interface:pictureUnlockedAWholeWorldFromOneBraveLine'),
            null,
            'host.won',
          );
          if (journeyEnabled && journeyMission() && !practice) {
            celebrationActive = false;
            show('skip-celebration', false);
            overlay('won');
          }
        } else {
          defeatActive = true;
          defeatPaused = false;
          defeatRemaining = 0.65;
          show('game-overlay', false);
          show('show-result', false);
          localizedText($('skip-celebration'), () => t('interface:showDefeatMenu'));
          show('skip-celebration', true);
          $('skip-celebration').focus({ preventScroll: true });
          warning(
            localizedMessage('interface:lifeLostShowingTheFinalImpactChooseShowDefeatMenu'),
            null,
            'host.lost',
          );
        }
      }
    } else {
      pendingAction = false;
      pendingPickup = false;
    }
    if (celebrationActive && !painter.celebrationStatus?.active) {
      celebrationActive = false;
      show('skip-celebration', false);
      overlay('won');
    }
    sound.feedback(!paused && started, theme, run, {
      bodyId: flightActorLease?.pin().style === 'fpv' ? `fpv-${run.activeClassId}` : bodyId,
      actorStyle: flightActorLease?.pin().style,
    });
    storyDialog.syncSettings();
    if (soundtrackPlayer) {
      const context = soundtrackContext();
      if (context.scene !== soundtrackLastScene) {
        soundtrackLastScene = context.scene;
        soundtrackPlayer.setContext(context);
      }
      soundtrackPlayer.update(!paused && started, theme, run);
    } else sound.update(!paused && started, theme, run);
    if (!sound.previewActive && $('music-preview').textContent.startsWith('Playing'))
      localizedText($('music-preview'), () => t('interface:previewMusic'));
    refreshHUD();
  }
  for (const t of themesFile.themes)
    $('theme-select').append(localizedOption(() => themeLabel(t), t.id));
  if (scenario && !themesFile.themes.some((t) => t.id === theme.id))
    $('theme-select').append(localizedOption(() => themeLabel(theme), theme.id));
  $('theme-select').value = theme.id;
  $('theme-preparation-cancel').onclick = () => {
    const restoreFocus = document.activeElement === $('theme-preparation-cancel');
    cancelPictureStart();
    $('theme-select').value = theme.id;
    themeFeedback.begin({ message: '' }).finish({
      state: 'cancelled',
      message: t('interface:worldPreparationCancelledYourCurrentPictureIsKept'),
    });
    if (restoreFocus) $('theme-select').focus({ preventScroll: true });
  };
  for (const c of scenario?.classRecipes || classRegistry)
    $('class-select').append(localizedOption(() => contentText(c, 'label'), c.id));
  $('theme-select').onchange = async () => {
    if (courseSession || courseEntry) return;
    cancelRestore();
    cancelPictureStart();
    pause(true);
    if ((flightVisualLease || flightActorLease) && $('theme-select').value !== theme.id) {
      $('theme-select').value = theme.id;
      themeFeedback.begin({ message: '' }).finish({
        state: 'error',
        message: t('interface:thisSavedFlightKeepsItsOriginalWorldChooseANew'),
      });
      return;
    }
    const next =
      themesFile.themes.find((t) => t.id === $('theme-select').value) ||
      (scenario?.theme?.id === $('theme-select').value ? scenario.theme : themesFile.themes[0]);
    const notify = flightInformation.captureWarning('host.picture', { allowTerminal: true });
    const owner = flightPictures,
      controller = new AbortController(),
      ticket = ++pictureGeneration;
    let candidate = newFlightPictures({
      nextThemeId: next.id,
      pins: owner.pins(),
      legacy: owner.legacy,
    });
    pictureThemePending = { ticket, controller };
    const feedback = themeFeedback.begin({
      message: () =>
        t('interface:picture.preparingArtwork', { name: contentText(next, 'name') || next.id }),
      isCurrent: () => pictureThemePending?.ticket === ticket && !controller.signal.aborted,
    });
    $('theme-preparation-cancel').hidden = false;
    try {
      await candidate.ensure(next.id, {
        signal: controller.signal,
        onStatus: (status) => {
          if (status.status === 'preparing')
            feedback.update({ ...status, message: () => flightPictureStatus(status) });
        },
      });
      if (owner !== flightPictures || ticket !== pictureGeneration || document.hidden) return;
      flightPictures = candidate;
      candidate = null;
      owner.dispose();
      themeOverride = true;
      theme = next;
      bodyId = theme.player;
      setTheme();
      paintMissions();
      refreshMissionBrief();
      if (!started && !campaignOverview) overlay('ready');
      preferences({ themeId: theme.id, bodyId });
      rememberSelection();
      feedback.finish({
        message: () =>
          t('interface:solo.artworkReady', { name: contentText(next, 'name') || next.id }),
      });
    } catch (error) {
      if (owner === flightPictures && ticket === pictureGeneration && !controller.signal.aborted) {
        feedback.finish({
          message:
            error instanceof ReleasePictureWriteRequiredError
              ? error.message
              : () => t('interface:solo.worldArtworkUnavailable', { error: error.message }),
          state: 'error',
        });
        pictureFailure(error, notify);
      }
    } finally {
      candidate?.dispose();
      if (pictureThemePending?.ticket === ticket) {
        pictureThemePending = null;
        $('theme-preparation-cancel').hidden = true;
        $('theme-select').value = theme.id;
      }
    }
  };
  $('body-select').onchange = () => {
    if (courseEntry) return;
    cancelRestore();
    bodyWarning = '';
    bodyId = $('body-select').value;
    painter.setLook(theme, bodyId, painterVisuals());
    soundtrackPlayer?.setContext(soundtrackContext());
    preferences({ bodyId, matchClassAppearance: false });
    $('match-class-appearance').checked = false;
  };
  $('class-select').onchange = () =>
    requestMissionReplacement({ kind: 'class', id: $('class-select').value }, $('class-select'));
  $('turn-select').onchange = () =>
    requestMissionReplacement({ kind: 'steering', id: $('turn-select').value }, $('turn-select'));
  $('start-button').onclick = () => resume();
  $('continue-saved').onclick = async () => {
    const notify = flightInformation.captureWarning('host.restore', { allowTerminal: true });
    try {
      await restoreAttempt(savedAttempt());
      $('start-button').focus({ preventScroll: true });
    } catch (error) {
      if (error.name === 'AbortError') return;
      notify(`Saved flight was not loaded: ${error.message}`);
      // A new selection may have cancelled verification. Preserve its focus;
      // only recover focus lost when the loading button was disabled.
      if (!$('continue-saved').hidden && document.activeElement === document.body)
        $('continue-saved').focus({ preventScroll: true });
    }
  };
  $('choose-mission').onclick = () => {
    if (!practiceSession) {
      return openUnifiedMissions($('choose-mission'));
    }
    gameShell?.openMissions();
    const mission = $('missions').querySelector('button:not(:disabled)');
    mission?.focus();
    mission?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  };
  $('pause-button').onclick = () => pause();
  const restartDialog = $('restart-dialog');
  const restartCopy = $('restart-dialog-copy').textContent;
  function restartAvailable() {
    return (
      unfinishedFlight() &&
      !defeatActive &&
      !campaignOverview &&
      !courseBlocked() &&
      !courseEntry &&
      !modeDeparture &&
      !missionReplacement &&
      !sessionBusy &&
      !contentSwitchBusy &&
      !pictureThemePending &&
      !backupBusy &&
      !document.hidden &&
      document.hasFocus() !== false
    );
  }
  function invalidateRestart(message) {
    if (!restartRequest) return;
    restartRequest.cancelled = true;
    $('restart-confirm').disabled = true;
    localizedText($('restart-dialog-copy'), () =>
      t('interface:solo.restartInvalidated', { reason: renderMessage(message) }),
    );
  }
  function requestRestart(opener) {
    const top = controllerDialog();
    if (
      restartRequest ||
      !restartAvailable() ||
      !availableFocusTarget(opener) ||
      (top && !top.contains(opener))
    )
      return;
    // The choice itself neither saves nor replaces the attempt. Retain the same
    // hold through cancellation/pagehide until explicit Resume or a fresh run.
    modeDepartureHold = true;
    pause(true);
    const ticket = {
      opener,
      run,
      recorder,
      runId,
      campaign,
      entry: activeEntry,
      scenario,
      classId,
      turnPolicy,
      levelIndex,
      generation: libraryGeneration,
      cancelled: false,
    };
    restartRequest = ticket;
    localizedText($('restart-dialog-copy'), () => restartCopy);
    $('restart-confirm').disabled = false;
    try {
      restartDialog.showModal();
      $('restart-cancel').focus({ preventScroll: true });
    } catch (error) {
      restartRequest = null;
      warning(`Restart confirmation unavailable: ${error.message}. Your flight remains paused.`);
      if (availableFocusTarget(opener)) opener.focus({ preventScroll: true });
    }
  }
  $('restart-button').onclick = () => requestRestart($('restart-button'));
  $('overlay-restart').onclick = () => requestRestart($('overlay-restart'));
  restartDialog.addEventListener('close', () => {
    // A queued close from the preceding visit cannot cancel a reopened decision.
    if (restartDialog.open) return;
    const ticket = restartRequest;
    restartRequest = null;
    if (!ticket || document.hidden || document.hasFocus() === false) return;
    const top = controllerDialog();
    if (availableFocusTarget(ticket.opener) && (!top || top.contains(ticket.opener)))
      ticket.opener.focus({ preventScroll: true });
  });
  $('restart-confirm').onclick = () => {
    const ticket = restartRequest;
    if (!ticket || !restartDialog.open || ticket.cancelled) return;
    if (
      !restartAvailable() ||
      run !== ticket.run ||
      recorder !== ticket.recorder ||
      runId !== ticket.runId ||
      campaign !== ticket.campaign ||
      activeEntry !== ticket.entry ||
      scenario !== ticket.scenario ||
      classId !== ticket.classId ||
      turnPolicy !== ticket.turnPolicy ||
      levelIndex !== ticket.levelIndex ||
      libraryGeneration !== ticket.generation
    ) {
      invalidateRestart(t('interface:theFlightOrAvailableSetupChanged'));
      return;
    }
    // Only the explicitly confirmed handoff closes retained menu parents.
    restartRequest = null;
    restartDialog.close();
    if ($('shell-workshop-dialog').open) $('shell-workshop-dialog').close();
    if ($('shell-home').open) $('shell-home').close();
    demo = false;
    prepare({ retainAttemptAppearance: true });
    resume();
  };
  $('retry-button').onclick = () => {
    if (defeatActive || courseBlocked()) return;
    if (!practice && !scenario && !courseSession && ['won', 'lost'].includes(run?.status)) {
      void prepareResultAttempt('retry');
      return;
    }
    demo = false;
    prepare();
    resume();
  };
  $('view-picture').onclick = () => {
    if (run.status !== 'won') return;
    cancelResultAttempt();
    show('game-overlay', false);
    show('show-result', true);
    $('show-result').focus({ preventScroll: true });
  };
  $('show-result').onclick = () => {
    if (run.status === 'won') {
      overlay('won');
      $('view-picture').focus({ preventScroll: true });
    }
  };
  $('next-button').onclick = () => {
    if (courseBlocked()) return;
    if (courseSession) {
      nextCourseLesson();
      return;
    }
    if (journeyEnabled && !practice && !scenario && run?.status === 'won' && journeyMission()) {
      const next = nextJourneyMission(journeyMission().id);
      if (next) void launchJourneyMission(next, { kind: 'next' });
      else journeyChooser.open($('next-button'));
      return;
    }
    if (campaignOverview && !practice) {
      $('collection-button').click();
      return;
    }
    if (practice) {
      if (demo) {
        leavePractice();
        levelIndex = 0;
      }
    } else {
      if (run?.status !== 'won') return;
      const selection = authoredMissionSuccessor(activeEntry, levelIndex);
      if (!selection.atEnd && !scenario && run?.status === 'won') {
        return prepareResultAttempt('next', selection.levelIndex);
      }
      if (selection.atEnd && !scenario) {
        return nextLibraryMission();
      }
      cancelResultAttempt();
      campaignOverview = selection.atEnd;
      if (campaignOverview) {
        clearInput();
        sound.pause();
        paintMissions();
        overlay('campaign-complete');
        refreshHUD();
        $('next-button').focus({ preventScroll: true });
        return;
      }
      levelIndex = selection.levelIndex;
    }
    prepare();
    rememberSelection();
  };
  $('demo-button').onclick = () => void demoHost?.open();
  $('sound-button').onclick = () => setMasterMuted(!audioMaster.snapshot().muted);
  $('settings-master-mute').onclick = () => setMasterMuted(!audioMaster.snapshot().muted);
  $('shell-sound').onclick = () => setMasterMuted(!audioMaster.snapshot().muted);
  $('overlay-sound').onclick = () => setMasterMuted(!audioMaster.snapshot().muted);
  $('overlay-next-song').onclick = () => quickMusicControls?.perform('next');
  for (const id of ['tap-steering', 'settings-tap-steering']) {
    $(id).onchange = () => {
      clearInput();
      preferences({ tapSteering: $(id).checked });
      $('tap-steering').checked =
        library.preferences.tapSteering ?? matchMedia('(pointer: coarse)').matches;
      syncAssistControls();
    };
  }
  $('help-button').onclick = () => {
    pause(true);
    focusPauseToolReturn('start-button');
    $('help-dialog').showModal();
  };
  let collectionContextKey = null,
    collectionContexts = new Map();
  const collectionContextLabel = (entry) =>
    `${contentText(entry.campaign, 'title') || contentText(entry.campaign, 'name') || entry.campaign.id} · ${difficultyLabel(entry) || t('interface:challenge')}`;
  function paintCollectionProgress(entry) {
    const progress = progressFor(library, entry.campaign);
    const target = difficultyNavigation
      .milestones(entry, library.campaigns, progress)
      .find((tier) => tier.id === 'chapter-explorer').target;
    localizedText($('achievement-campaign'), () =>
      t('gameplay:campaignAchievements', { value1: collectionContextLabel(entry) }),
    );
    $('achievements').replaceChildren();
    for (const a of difficultyNavigation.achievements(entry, library.campaigns, progress)) {
      const row = document.createElement('div');
      row.className = `achievement${a.earned ? ' earned' : ''}`;
      const title = document.createElement('strong');
      localizedText(title, () => `${a.earned ? '◆' : '◇'} ${achievementName(a)}`);
      const copy = document.createElement('span');
      localizedText(
        copy,
        () =>
          `${achievementDescription(a, target)}${a.scope === 'shared' ? ' ' + t('interface:standardOrGentle') + '' : a.scope ? t('gameplay:results', { value1: difficultyLabel(entry) }) : ''}`,
      );
      row.append(title, copy);
      $('achievements').append(row);
    }
    paintAppearanceRewards(entry);
  }
  function prepareCollectionProgress() {
    const currentKey = campaignKey(campaign);
    const keys = new Set([
      currentKey,
      ...Object.keys(library.campaigns),
      ...library.gallery.map((item) => item.campaignKey),
    ]);
    collectionContexts = new Map(
      [...executionEntries(), activeEntry]
        .map((entry) => [campaignKey(entry.campaign), entry])
        .filter(([key]) => keys.has(key)),
    );
    // This is a view choice only. Unknown historical contexts stay archived;
    // names and theme IDs never authorize a replacement campaign.
    if (!collectionContexts.has(collectionContextKey)) {
      collectionContextKey =
        [...library.gallery]
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
          .find((item) => collectionContexts.has(item.campaignKey))?.campaignKey ?? currentKey;
    }
    $('collection-context').replaceChildren(
      ...[...collectionContexts].map(([key, entry]) =>
        localizedOption(() => collectionContextLabel(entry), key),
      ),
    );
    $('collection-context').value = collectionContextKey;
    paintCollectionProgress(collectionContexts.get(collectionContextKey));
  }
  $('collection-context').onchange = () => {
    if (!$('collection-dialog').open) return;
    const entry = collectionContexts.get($('collection-context').value);
    if (!entry) {
      $('collection-context').value = collectionContextKey;
      return;
    }
    collectionContextKey = $('collection-context').value;
    paintCollectionProgress(entry);
  };
  const journeyCollection = attachJourneyCollection({
    document,
    onPictureReady: (record) => editionUI?.pictureReady(record),
    getState: async () => {
      if (!collectionJourneyState) await getUnifiedMissionLibrary();
      return collectionJourneyState;
    },
  });
  $('collection-button').onclick = () => {
    if (courseSession || courseEntry) return;
    const opener = document.activeElement;
    storyDialog.close();
    pause(true);
    prepareCollectionProgress();
    libraryPanel.populateGallery();
    localizedText($('collection-back'), () =>
      opener?.closest('#settings-dialog')
        ? t('interface:backToSettings')
        : $('shell-home').open
          ? t('interface:backToMenu')
          : $('shell-missions').open
            ? t('interface:backToMissions2')
            : t('interface:backToTheField'),
    );
    // Pausing may focus Resume; native return belongs to this entry control.
    if (
      opener?.isConnected &&
      !opener.disabled &&
      !opener.closest('[hidden],[inert],[aria-hidden="true"]')
    )
      opener.focus({ preventScroll: true });
    $('collection-dialog').showModal();
    return journeyCollection.open();
  };
  $('choose-appearance').onclick = focusAppearance;
  $('collection-choose-appearance').onclick = focusAppearance;
  document.querySelectorAll('[data-close]').forEach(
    (b) =>
      (b.onclick = () => {
        if (b.dataset.close === 'help-dialog' && courseEntry) cancelCourseEntry();
        $(b.dataset.close).close();
      }),
  );
  replayFeedback = createOperationStatus($('replay-operation-status'));
  replayFocusClearance = attachFocusClearance({
    container: $('replay-dialog'),
    heading: $('replay-operation-rail'),
    document,
  });
  async function downloadCurrentReplay(replay) {
    const notify = flightInformation.captureWarning('host.replay', { allowTerminal: true });
    if (replayDownload) return;
    const operation = {
      run,
      observed: true,
      status: replayFeedback.begin({
        message: localizedMessage('interface:solo.preparingReplayDownload'),
        stage: 'downloading',
      }),
    };
    replayDownload = operation;
    $('export-replay').disabled =
      $('download-replay').disabled =
      $('download-raw-replay').disabled =
        true;
    try {
      const raw = replay.replay ?? replay;
      const exported = await downloadJSON(
        replay,
        `revealline-${raw.summary.levelId}-${replay.replay ? 'recorded-actors-' : ''}replay.json`,
      );
      if (operation.observed && $('replay-dialog').open) {
        operation.status.finish({ message: exported.message });
        if (operation.run === run)
          notify(
            t('gameplay:replayPreparedWithItsExactRulesInputsAndFinalState', {
              value1: exported.message,
            }),
          );
      }
    } catch (error) {
      if (operation.observed && $('replay-dialog').open)
        operation.status.finish({
          message: () => t('gameplay:replayDownload', { value1: error.message }),
          state: 'error',
        });
    } finally {
      if (replayDownload === operation) {
        replayDownload = null;
        if (!soundtrackDisposed) {
          $('export-replay').disabled = !recorder;
          $('download-replay').disabled = !lastReplay;
          $('download-raw-replay').disabled = !lastReplay;
        }
      }
    }
  }
  $('replay-dialog').addEventListener('close', () => {
    if ($('replay-dialog').open) return;
    if (replayDownload) replayDownload.observed = false;
    replayFeedback.clear();
  });
  $('export-replay').onclick = async () => {
    if (replayDownload) return;
    const notify = flightInformation.captureWarning('host.replay', { allowTerminal: true });
    try {
      if (!recorder) throw new Error(t('interface:startANewAttemptToRecordAReplay'));
      pause(true);
      const raw = exportReplay(recorder, run);
      const actorPin = flightActorLease?.pin();
      // The accepted attempt owns this pin. A newly selected preference must
      // never rewrite the appearance of an already recorded route.
      const recorded =
        actorPin?.style === 'fpv' || actorPin?.authoredPresentationSha256
          ? exportReplayPresentation({
              execution: {
                campaignKey: campaignKey(campaign),
                sourcePackId: activeEntry.sourcePackId ?? null,
              },
              actorAppearancePin: actorPin,
              replay: raw,
            })
          : null;
      lastReplay = raw;
      lastReplayPresentation = recorded;
      // Keep copied wrappers within the same aggregate budget as the compact
      // download; presentation indentation must not make a valid replay unloadable.
      $('replay-json').value = recorded ? JSON.stringify(recorded) : JSON.stringify(raw, null, 2);
      localizedText($('download-replay'), () =>
        recorded ? t('interface:downloadRecordedActors') : t('interface:downloadRawJson'),
      );
      $('download-raw-replay').hidden = !recorded;
      localizedText($('replay-appearance-note'), () =>
        recorded
          ? actorPin?.authoredPresentationSha256
            ? t('interface:replay.companyRecordingPinned')
            : t('interface:recordedFpvActorsArePinnedForReplayTheaterThisDoes')
          : t('interface:thisRecordingUsesTheOriginalSimulationOnlyFormatReplayTheater'),
      );
      $('replay-dialog').showModal();
      replayFocusClearance.refresh();
      await downloadCurrentReplay(recorded ?? raw);
    } catch (error) {
      notify(`Replay could not export: ${error.message}`);
    }
  };
  $('download-replay').onclick = () =>
    lastReplay && downloadCurrentReplay(lastReplayPresentation ?? lastReplay);
  $('download-raw-replay').onclick = () => lastReplay && downloadCurrentReplay(lastReplay);
  function suspendInteraction() {
    cancelUnifiedOpening?.();
    // Returning to focus must not revive a picker or launch requested before
    // the interruption, even when its asynchronous work finishes afterward.
    ++unifiedOpenRevision;
    ++unifiedLaunchRevision;
    // Menu and result screens also need a neutral gate. Their pause() path
    // deliberately returns early, and a hidden renderer may not tick at all.
    controllerInactive = true;
    cancelModeDeparture({ close: true });
    cancelTitleFlight();
    invalidateRestart(t('interface:restartCancelledWhenFocusChanged'));
    invalidateContentSwitch({ announce: true });
    if (courseEntry)
      cancelCourseEntry(t('interface:courseEntryCancelledWhenFocusChangedYourFlightRemainsPaused'));
    clearInput();
    controllerPreview?.clear();
    if (demoHost?.active) demoHost.foregroundLost();
    if (!demoHost?.backgroundAudio) suspendAudio();
    if (!demoHost?.active) pause(true);
  }
  onNativeInactive(suspendInteraction).catch((error) =>
    warning(`App lifecycle adapter unavailable: ${error.message}`, null, 'host.lifecycle'),
  );
  window.addEventListener('blur', guardInstallOfflineBlur(suspendInteraction));
  function restoreListening() {
    if (document.hidden || soundtrackDisposed || enemyGuide?.practiceActive) return;
    if (!soundtrackPlayer) {
      // The procedural fallback is used when file-audio setup is unavailable.
      // It still needs a fresh resume after an iOS lifecycle interruption.
      if (sound.enabled && sound.context?.state !== 'running') void sound.resume();
      return;
    }
    if (!soundtrackSuspended) return;
    soundtrackSuspended = false;
    void soundtrackPlayer.resume();
  }
  const restoreAudioOnGesture = (event) => {
    if (
      demoHost?.containsAudio(event.target) ||
      quickMusicControls?.contains(event.target) ||
      quickMusicControls?.handlesKey(event) ||
      document.hidden ||
      soundtrackDisposed ||
      enemyGuide?.practiceActive ||
      audioMaster.snapshot().muted
    )
      return;
    const listening = soundtrackPlayer?.snapshot();
    const blockedListening =
      event.isTrusted && listening?.desired && listening.status === 'blocked';
    if (soundtrackPlayer && (soundtrackSuspended || blockedListening))
      void activateAudio({ explicit: blockedListening });
    else if (!soundtrackPlayer && sound.enabled && sound.context?.state !== 'running')
      void sound.resume();
  };
  window.addEventListener('focus', restoreListening);
  document.addEventListener('pointerdown', restoreAudioOnGesture, { capture: true, passive: true });
  document.addEventListener('touchstart', restoreAudioOnGesture, { capture: true, passive: true });
  document.addEventListener('keydown', restoreAudioOnGesture, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      optionalWorlds?.close(false);
      suspendInteraction();
    } else {
      void packCommits.reconcile();
      restoreListening();
    }
  });
  setTheme();
  refreshCampaigns();
  prepare();
  let autoplayPackLaunch = null;
  if (rememberedSelection)
    contentStatus(
      t('gameplay:selectedContinueASavedFlightSeparately', {
        value1: contentText(campaign, 'title') || contentText(campaign, 'name') || campaign.id,
        value2: contentText(campaign.levels[levelIndex], 'name'),
      }),
    );
  if (packLaunchError) {
    contentStatus(packLaunchError, true);
    warning(packLaunchError);
  } else if (packLaunchRequest) {
    const selected = await activatePack(packLaunchRequest.packId, {
      campaignId: packLaunchRequest.campaignId,
      levelId: packLaunchRequest.levelId,
      announce: false,
    });
    if (selected) {
      if (packLaunchRequest.play)
        autoplayPackLaunch = {
          ticket: selected,
          run,
          entry: activeEntry,
          campaignKey: campaignKey(campaign),
          levelId: campaign.levels[levelIndex].id,
        };
      contentStatus(
        t('gameplay:selected', {
          value1: packLaunchRequest.packName,
          value2: packLaunchRequest.levelName,
          value3: autoplayPackLaunch
            ? t('interface:solo.startingNow')
            : ' ' + t('interface:andReady') + '',
        }),
      );
    }
  }
  stopLocaleView = onLocaleChange(() => {
    refreshKeyPrompts();
    refreshControllerPrompts();
    refreshMissionBrief();
    gameShell?.refreshLocale();
    refreshHUD();
    refreshCourse();
    if (!$('game-overlay').hidden) overlay($('game-overlay').dataset.kind);
  });
  refreshKeyPrompts();
  refreshControllerPrompts();
  class FieldScene extends Phaser.Scene {
    create() {
      this.boardSize = boardPaintSizeForRun(run);
      const { width, height } = this.boardSize;
      this.boardTexture = this.textures.createCanvas('field', width, height);
      document.documentElement.style.setProperty('--board-ratio', `${width} / ${height}`);
      document.documentElement.style.setProperty('--board-aspect', String(width / height));
      this.boardImage = this.add.image(0, 0, 'field').setOrigin(0);
      this.game.canvas.setAttribute('aria-hidden', 'true');
    }
    update(now, delta) {
      if (practiceRenderFailure.failed) return;
      if (globalThis.RevealLineBoot && document.documentElement.dataset.bootState !== 'ready')
        return;
      try {
        const dt = clamp(delta / 1000, 0, 1);
        update(dt);
        // The modal owns its visible board. Keep the covered ordinary renderer
        // and its presentation clock untouched until the demo hands back control.
        if (demoHost?.active) return;
        editionUI?.refresh();
        titleCharacter?.update(dt, {
          visible:
            !document.hidden && document.hasFocus() && controllerDialog() === $('shell-home'),
          reduced: displayPreferences.snapshot().effectiveReducedEffects,
        });
        const { width, height } = boardPaintSizeForRun(run);
        if (width !== this.boardSize.width || height !== this.boardSize.height) {
          this.boardTexture.setSize(width, height);
          this.boardImage.setSizeToFrame();
          this.scale.resize(width, height);
          this.cameras.main.setSize(width, height);
          this.boardSize = { width, height };
          document.documentElement.style.setProperty('--board-ratio', `${width} / ${height}`);
          document.documentElement.style.setProperty('--board-aspect', String(width / height));
        }
        painter.draw(this.boardTexture.context, run, Math.min(dt, 0.1), {
          actorAppearance: flightActorLease
            ? { style: flightActorLease.pin().style, snapshot: flightActorLease.snapshot }
            : null,
          textFace: displayPreferences.snapshot().textFace,
          // The texture is detached; only the displayed Phaser canvas has a CSS size.
          displayCSSWidth: this.game.canvas.clientWidth,
          paused,
          reduced: displayPreferences.snapshot().effectiveReducedEffects,
          fullReveal: run.status === 'won',
          showGrid: scenario?.presentation?.showGrid || library.preferences.showGrid,
          showCombatScrap: practiceRemains ?? encounterDisplay.snapshot().showRemains,
          backdrop: flightPictures?.current(),
          celebrationPaused: document.hidden || dialogOpen(),
          defeatEffectsRunning: defeatEffectsRunning(),
          signalReception:
            run.status === 'won'
              ? 'off'
              : run.status === 'lost'
                ? 'lost'
                : restoredSignalRuns.has(run)
                  ? 'off'
                  : started
                    ? 'playing'
                    : 'ready',
          signalEffectsRunning:
            run.status === 'lost'
              ? defeatEffectsRunning()
              : started && !paused && !document.hidden && document.hasFocus() && !dialogOpen(),
        });
        advanceDefeatPresentation(Math.min(dt, 0.1));
      } catch (error) {
        if (!practiceRenderFailure.fail(error)) throw error;
      }
    }
  }
  new Phaser.Game({
    type: Phaser.CANVAS,
    parent: 'game-canvas',
    width: boardPaintSizeForRun(run).width,
    height: boardPaintSizeForRun(run).height,
    backgroundColor: theme.palette.field,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    fps: { target: 60, forceSetTimeOut: false },
    scene: FieldScene,
    banner: false,
  });
  missionPicker = attachMissionPicker({
    archivedIds: runtimeContent
      ? []
      : preparePackCatalog(archiveCatalogSource).packs.map(({ id }) => id),
  });
  async function prepareLibraryClassic(row, { signal }) {
    if (runtimeContent) throw new Error(t('interface:thisPackIsNotBundledWithTheCurrentBuild'));
    await gameplayDownloads.ensureClassic(row.packId, { signal });
    if (row.source === 'external')
      return installSourceChapter(row.packId, null, { signal, download: true });
    if (row.source === 'optional') {
      const catalog = await loadOptionalCatalog({
        signal,
        baseURL: new URL('../', gameDocumentURL(location.href)),
      });
      const summary = catalog.packs.find((item) => item.id === row.packId);
      if (!summary) throw new Error(t('interface:thatOptionalChapterIsUnavailableInThisRelease'));
      return installOptionalChapter(summary, { signal });
    }
    if (row.source === 'base') return;
    if (contentSwitchBusy || backupBusy || sessionBusy)
      throw new Error(t('interface:finishTheCurrentOperationBeforeDownloadingAnotherChapter'));
    const operation = packLaunchGuard.begin(packs);
    packCommits.markIntent();
    contentSwitchBusy = true;
    const cancelled = () => {
      if (packLaunchGuard.current(operation, packs)) invalidateContentSwitch();
    };
    signal?.addEventListener('abort', cancelled, { once: true });
    try {
      if (signal?.aborted) throw new DOMException(t('interface:downloadCancelled'), 'AbortError');
      return await ensureBundledPack(row.packId, operation, { preserveCurrentRun: true });
    } finally {
      signal?.removeEventListener('abort', cancelled);
      if (packLaunchGuard.current(operation, packs)) {
        contentSwitchBusy = false;
        refreshContentSelectors();
        await packCommits.reconcile();
      }
    }
  }
  async function departLibraryMission(context) {
    if (context.isCurrent?.() === false) return false;
    const target = unifiedLibrary.library.find(context.libraryMissionId);
    if (!target) throw new Error('This exact mission selection is no longer available.');
    if (context.skip) {
      if (context.transferContinuation && !context.transferContinuation()) return false;
      location.href = missionLibraryHref({
        baseURL: location.href,
        currentMode: 'solo',
        mode: context.mode,
        journey: target.collection === 'Journey' ? target.editionId : 'legacy',
        missionId: target.id,
        sourceJourney: currentAuthoredModeRoute() || 'legacy',
      });
      context.onSkipAdopt?.();
      return true;
    }
    if (context.transferContinuation && !context.transferContinuation()) return false;
    const result = await requestModeDeparture('library', { preventDefault() {} }, $('shell-play'), {
      libraryTarget: target,
      libraryMode: context.mode,
      libraryReady: context.prepareOnly === true,
      ...(context.prepareOnly
        ? { origin: 'solo-title', isCurrent: context.intentCurrent ?? context.isCurrent }
        : {}),
    });
    return context.prepareOnly
      ? result !== false && modeDeparture?.libraryTarget === target
      : result;
  }
  async function launchLibraryClassic(pack, selection, context) {
    if (context.isCurrent?.() === false) return false;
    if (context.continuation && journeyEnabled && context.mode === 'solo') {
      // Validate the destination's exact picture before leaving this document.
      // No target run/progress is adopted by the Journey host.
      const source = pack === null ? baseEntry : resolvePackCampaign(pack, selection.campaignId);
      const authored = projectClassicCurrentRulesEntry(source, selection.rulesEdition);
      const entry = executionForEntry(authored, library.preferences.campaignDifficulty);
      const level = entry.campaign.levels.find((item) => item.id === selection.levelId);
      if (!level) throw new Error(t('interface:theExactNextMissionIsUnavailable'));
      const nextTheme =
        entry.themes.find((item) => item.id === (level.themeId || entry.campaign.themeId)) ||
        entry.themes[0];
      const options = {
        seed,
        turnPolicy,
        classId: entry.classRecipes[0].id,
        classRecipes: entry.classRecipes,
      };
      const pictures = newFlightPictures({
        nextRun: createRun(applyGameplayTuning(level, nextGameplayTuning(entry)), options),
        nextRunId: crypto.randomUUID(),
        entry,
        nextThemeId: nextTheme.id,
      });
      try {
        await pictures.ensure(nextTheme.id, { signal: context.signal, onStatus: context.onStatus });
        if (context.isCurrent?.() === false) return false;
        return departLibraryMission(context);
      } finally {
        pictures.dispose();
      }
    }
    if (journeyEnabled || context.mode !== 'solo') return departLibraryMission(context);
    if (context.skip) {
      const source = pack === null ? baseEntry : resolvePackCampaign(pack, selection.campaignId);
      const authored = projectClassicCurrentRulesEntry(source, selection.rulesEdition);
      const entry = executionForEntry(authored, library.preferences.campaignDifficulty);
      const nextIndex = entry.campaign.levels.findIndex((level) => level.id === selection.levelId);
      if (nextIndex < 0) throw new Error('The exact skipped-to mission is unavailable.');
      if (context.transferContinuation && !context.transferContinuation()) return false;
      const selected = await prepareResultAttempt('skip', nextIndex, entry);
      if (selected) {
        const row = unifiedLibrary.library.find(context.libraryMissionId);
        retainedLibraryOwner = {
          entry: activeEntry,
          ownerId: row.ownerId,
          editionId: row.editionId,
          campaignKey: JSON.parse(row.campaignKey)[2],
        };
        context.onSkipAdopt?.();
      }
      return selected;
    }
    if (context.continuation && run?.status === 'won') {
      const source = pack === null ? baseEntry : resolvePackCampaign(pack, selection.campaignId);
      const authored = projectClassicCurrentRulesEntry(source, selection.rulesEdition);
      const entry = executionForEntry(authored, library.preferences.campaignDifficulty);
      const nextIndex = entry.campaign.levels.findIndex((level) => level.id === selection.levelId);
      if (nextIndex < 0) throw new Error(t('interface:theExactNextMissionIsUnavailable'));
      if (context.transferContinuation && !context.transferContinuation()) return false;
      const selected = await prepareResultAttempt('next', nextIndex, entry);
      if (selected) {
        const row = unifiedLibrary.library.find(context.libraryMissionId);
        retainedLibraryOwner = {
          entry: activeEntry,
          ownerId: row.ownerId,
          editionId: row.editionId,
          campaignKey: JSON.parse(row.campaignKey)[2],
        };
      }
      return selected;
    }
    if ($('shell-home').open) $('shell-home').close();
    const revision = unifiedLaunchRevision;
    const launch = {
      opener: $('shell-play'),
      isCurrent: () =>
        revision === unifiedLaunchRevision &&
        !document.hidden &&
        document.hasFocus?.() !== false &&
        context.intentCurrent?.() !== false,
      onStarted: () => {
        const row = unifiedLibrary?.library.find(context.libraryMissionId);
        if (row)
          retainedLibraryOwner = {
            entry: activeEntry,
            ownerId: row.ownerId,
            editionId: row.editionId,
            campaignKey: JSON.parse(row.campaignKey)[2],
          };
        unifiedChooser?.close();
      },
      onSelected: () => {
        if (context.prepareOnly && !$('demo-dialog')?.open) focusMission();
      },
      onCancelled: () => {
        if (!launch.isCurrent() || document.hasFocus?.() === false) return false;
        if (context.prepareOnly) {
          if (!$('shell-home').open) $('shell-home').showModal();
          $('shell-demo')?.focus({ preventScroll: true });
          return true;
        }
        unifiedChooser?.restore();
        unifiedChooser?.reveal(context.libraryMissionId);
        return true;
      },
    };
    captureWorldPlay({ launch });
    const selected = await requestWorldPlay(pack, {
      launch,
      ...selection,
      prepareOnly: context.prepareOnly === true,
      onStatus: (status) => {
        if (launch.isCurrent())
          contentStatus(status.message, false, { busy: status.stage !== 'ready' });
      },
    });
    // An unfinished-flight replacement owns the pending action. Do not reopen
    // the library on top of its explicit Stay / Replace & play confirmation.
    return selected || missionReplacement?.launch === launch;
  }
  async function prepareDemoFresh(source, isCurrent) {
    const assertIntent = () => {
      if (!isCurrent() || document.hidden || document.hasFocus?.() === false)
        throw new DOMException(t('interface:preparationCancelled'), 'AbortError');
    };
    assertIntent();
    const entry = executionEntries().find(
      (item) => campaignKey(item.campaign) === campaignKey(source.entry.campaign),
    );
    const level = entry?.campaign.levels.find((item) => item.id === source.levelId);
    if (!level || demoIdentity(level, entry.classRecipes) !== source.identity)
      throw new Error(t('interface:thatExactInstalledCampaignIsNoLongerAvailable'));
    if (!missionAvailable(entry.campaign.levels.indexOf(level), entry)) return false;
    // A compiled Journey has a different preparation and progression owner.
    // The first source catalogue contains exact installed Classic originals.
    if (candidateHost?.owns(entry))
      throw new Error(t('interface:thisMissionBelongsToADifferentGameplayHostSelectIt'));
    const host = await getUnifiedMissionLibrary();
    assertIntent();
    const baseKey = entry.baseCampaignKey || campaignKey(entry.baseCampaign ?? entry.campaign);
    const row = host.library
      .forMode('solo')
      .find(
        (item) =>
          item.collection !== 'Journey' &&
          item.runtimeId === level.id &&
          JSON.parse(item.campaignKey)[2] === baseKey,
      );
    if (!row || host.library.availability(row, 'solo').state !== 'ready')
      throw new Error(t('interface:thisExactMissionEditionIsNotAvailableInSoloNo'));
    const context = libraryActivationContext(),
      revision = unifiedLaunchRevision;
    let handedOff = false;
    const intentCurrent = () =>
      revision === unifiedLaunchRevision &&
      (handedOff || isCurrent()) &&
      !document.hidden &&
      document.hasFocus?.() !== false;
    const selected = await host.library.launch(row, {
      mode: 'solo',
      ...context,
      prepareOnly: true,
      intentCurrent,
    });
    if (selected !== true || !intentCurrent())
      throw new DOMException(t('interface:preparationCancelled'), 'AbortError');
    // Once the checked replacement/departure dialog owns the action, closing
    // the demo must not invalidate its later explicit confirmation.
    handedOff = true;
    return true;
  }
  async function getUnifiedMissionLibrary() {
    if (unifiedLibrary) return unifiedLibrary;
    if (unifiedLibraryLoading) return unifiedLibraryLoading;
    unifiedLibraryLoading = (async () => {
      const index =
        runtimeContent?.missionIndex ?? (await getJSON('content/mission-library-index.json'));
      actorMissionIndex = Promise.resolve(index);
      const route = authoredRoute || (await loadAuthoredJourneyRoute(DEFAULT_JOURNEY_ROUTES.solo));
      const originalThemes =
        runtimeContent?.themes ?? (await getJSON('content-design/themes.json')).themes;
      const libraryThemes = authoredJourneyUsesActorMaterials(route.id)
        ? journeyActorThemeCandidates(originalThemes, {
            includeOriginals: route.preserveOriginalThemes === true,
          })
        : originalThemes;
      const views = publishedRouteViews(route);
      const host =
        candidateHost ||
        views?.solo ||
        (await createSoloRouteHost(route, {
          themes: libraryThemes,
          buildVersion,
          corePackIds: route.corePackIds,
          optionalCampaignIds: route.optionalCampaignIds,
          ...(!runtimeContent
            ? { ensurePackage: (groupId, options) => gameplayDownloads.ensure(groupId, options) }
            : {}),
        }));
      const profile = candidateHost
        ? journeyProfile
        : createJourneyProfileStore({
            profileKey: route.profileKey,
            ...(previewSession?.journeyOptions(route.profileKey) ?? {}),
          });
      if (!candidateHost) await profile.load();
      collectionJourneyState = { profile, catalog: host.catalog, editionId: route.id };
      const launchSolo = async (mission, context) => {
        if (context.isCurrent?.() === false) return false;
        if (!candidateHost || context.mode !== 'solo') {
          if (context.skip && context.mode === 'solo') {
            let validationHost = host,
              disposeValidationHost = false;
            if (!validationHost.preparer) {
              validationHost = await createSoloRouteHost(route, {
                themes: libraryThemes,
                buildVersion,
                corePackIds: route.corePackIds,
                optionalCampaignIds: route.optionalCampaignIds,
                ...(!runtimeContent
                  ? {
                      ensurePackage: (groupId, options) =>
                        gameplayDownloads.ensure(groupId, options),
                    }
                  : {}),
              });
              disposeValidationHost = true;
            }
            try {
              const candidate = await validationHost.preparer.prepare(
                {
                  missionId: mission.id,
                  difficulty: browsingJourneyPreferences.snapshot().difficulty,
                  seed,
                  turnPolicy,
                },
                { signal: context.signal, onStatus: context.onStatus },
              );
              if (context.isCurrent?.() === false) {
                if (validationHost.preparer.current(candidate)) validationHost.preparer.cancel();
                return false;
              }
              validationHost.preparer.cancel();
            } finally {
              if (disposeValidationHost) validationHost.preparer.dispose();
            }
          }
          return departLibraryMission(context);
        }
        if ($('shell-home').open) $('shell-home').close();
        if (context.transferContinuation && !context.transferContinuation()) return false;
        return launchJourneyMission(mission, {
          kind: context.skip ? 'skip' : context.continuation ? 'next' : 'choose',
          skipped: context.skip ? journeySkipMission() : null,
        });
      };
      let journeySources,
        spatialEditions = { dispose() {} };
      if (runtimeContent) {
        const manifestFor = (
          mission,
          difficulty = browsingJourneyPreferences.snapshot().difficulty,
        ) =>
          host
            .select(mission, difficulty)
            ?.manifests.find((manifest) => manifest.missionId === mission.levelId);
        const source = journeyLibrarySource({
          editionId: route.id,
          edition: route.id === DEFAULT_JOURNEY_ROUTES.solo ? 'New Journey' : route.label,
          editionLabel: () =>
            route.id === DEFAULT_JOURNEY_ROUTES.solo
              ? t('interface:newJourney')
              : contentText(route, 'label'),
          catalog: host.catalog,
          profile,
          details: (mission) => journeyMissionDetails(manifestFor(mission)),
          tags: (mission) => authoredJourneyMissionTags(mission, manifestFor(mission, 'standard')),
          card: (mission) => host.card(mission, browsingJourneyPreferences.snapshot().difficulty),
          launch: launchSolo,
        });
        journeySources = [source];
      } else if (views) {
        journeySources = publishedJourneyLibrarySources({
          route,
          views,
          soloHost: candidateHost,
          profile,
          difficulty: () => browsingJourneyPreferences.snapshot().difficulty,
          launchSolo,
          launchRemote: departLibraryMission,
        });
      } else {
        // Compile the other mode through its own validated runtime adapter. The
        // combined browsing identity never grants this Solo host Versus ownership.
        const { createCandidateVersusHost } = await import('./content-design/versus-host.mjs');
        const versusPreview = createCandidateVersusHost(route.source, {
          themes: libraryThemes,
          corePackIds: route.corePackIds,
          optionalCampaignIds: route.optionalCampaignIds,
        });
        const manifestFor = (
          mission,
          difficulty = browsingJourneyPreferences.snapshot().difficulty,
        ) =>
          host
            .select(mission, difficulty)
            ?.manifests.find((manifest) => manifest.missionId === mission.levelId);
        const source = journeyLibrarySource({
          editionId: route.id,
          edition: route.id === DEFAULT_JOURNEY_ROUTES.solo ? 'New Journey' : route.label,
          editionLabel: () =>
            route.id === DEFAULT_JOURNEY_ROUTES.solo
              ? t('interface:newJourney')
              : contentText(route, 'label'),
          catalog: host.catalog,
          profile,
          details: (mission) => journeyMissionDetails(manifestFor(mission)),
          tags: (mission) => authoredJourneyMissionTags(mission, manifestFor(mission, 'standard')),
          card: (mission) => host.card(mission, browsingJourneyPreferences.snapshot().difficulty),
          launch: launchSolo,
        });
        const versusSource = journeyLibrarySource({
          editionId: route.id,
          edition: route.id === DEFAULT_JOURNEY_ROUTES.solo ? 'New Journey' : route.label,
          editionLabel: () =>
            route.id === DEFAULT_JOURNEY_ROUTES.solo
              ? t('interface:newJourney')
              : contentText(route, 'label'),
          catalog: versusPreview.catalog,
          profile,
          details: (mission) =>
            journeyMissionDetails(
              versusPreview.manifest(mission, browsingJourneyPreferences.snapshot().difficulty),
            ),
          tags: (mission) => authoredJourneyMissionTags(mission, versusPreview.manifest(mission)),
          card: (mission) =>
            versusPreview.card(mission, browsingJourneyPreferences.snapshot().difficulty),
          launch: (_mission, context) => departLibraryMission(context),
        });
        const { createRemoteTeamLibrarySources } = await import(
          './mission-library/remote-team.mjs'
        );
        const teamSources = createRemoteTeamLibrarySources({
          launch: departLibraryMission,
          difficulty: () => browsingJourneyPreferences.snapshot().difficulty,
        });
        const { createSpatialNextEditionSources } = await import(
          './mission-library/spatial-next-editions.mjs'
        );
        spatialEditions = await createSpatialNextEditionSources({
          activeRouteId: route.id,
          originalThemes,
          difficulty: () => browsingJourneyPreferences.snapshot().difficulty,
          launch: departLibraryMission,
        });
        journeySources = [
          combineJourneyLibrarySources([
            { mode: 'solo', source },
            { mode: 'versus', source: versusSource },
          ]),
          ...spatialEditions.sources,
          ...teamSources,
        ];
      }
      const classicProjectionCache = new WeakMap();
      const classicRuntimeEntry = (row) => {
        const pack =
          row.source === 'base' ? null : packs.packs.find((item) => item.id === row.packId);
        const source =
          row.source === 'base'
            ? baseEntry
            : pack
              ? resolvePackCampaign(pack, row.campaignId)
              : null;
        if (!source) return null;
        if (!classicProjectionCache.has(source)) classicProjectionCache.set(source, new Map());
        const projections = classicProjectionCache.get(source);
        if (!projections.has(row.rulesEdition))
          projections.set(
            row.rulesEdition,
            projectClassicCurrentRulesEntry(source, row.rulesEdition),
          );
        return projections.get(row.rulesEdition);
      };
      const libraryRowRuntimeCampaignKey = (row) => {
        if (row.collection !== 'Classic') return JSON.parse(row.campaignKey)[2];
        const entry = classicRuntimeEntry(row);
        return entry ? campaignKey(entry.campaign) : null;
      };
      const selectedEditionPacks = runtimeContent ? emptyPackLibrary() : null;
      const result = await createInstalledMissionLibrary({
        getProjectSources: async () => {
          if (runtimeContent) return [];
          const { installedCreatorLibrarySources } = await import(
            './mission-library/creator-source.mjs'
          );
          try {
            return await installedCreatorLibrarySources();
          } catch (error) {
            contentStatus(
              `Creator campaigns could not be read: ${error.message} Open My creations to recover or reinstall them.`,
              true,
            );
            return [];
          }
        },
        index,
        journeySources,
        getPacks: () => selectedEditionPacks ?? packs,
        baseEntry,
        compatibility: ({ entry, level }) => {
          const supported = [];
          try {
            createRun(level, {
              classRecipes: entry.classRecipes,
              classId: entry.classRecipes[0].id,
            });
            supported.push('solo');
          } catch {}
          try {
            createDuel(level, {
              classRecipes: entry.classRecipes,
              classId: entry.classRecipes[0].id,
            });
            supported.push('versus');
          } catch {}
          return supported;
        },
        describe: ({ level }) => {
          const actual = normalizedLevel(level);
          return {
            rules: `${Math.round(actual.goal.coverage * 100)}% coverage · ${actual.rules.lives} lives · ${actual.rules.moveSpeed} cells/s · Authored rules`,
          };
        },
        prepareClassic: prepareLibraryClassic,
        availabilityExternal: (row, pack) => {
          if (!pack)
            return isRelease
              ? { state: 'download', bytes: row.download.bytes }
              : {
                  state: 'unavailable',
                  reason: t('interface:originalPictureDownloadIsAvailableInPublishedBuilds'),
                };
          const present = chapterSnapshot?.index?.chapters.some(
            (chapter) => chapter.id === row.packId,
          );
          return present
            ? { state: 'ready' }
            : {
                state: 'unavailable',
                reason: t('interface:installThisChapterWithItsOriginalPicturesInWorlds'),
              };
        },
        launchClassic: async (row, context) => {
          if (row.source === 'external') {
            const snapshot = await checkedChapters();
            await externalChapters.readiness(snapshot, row.packId);
            if (packs.packs.find((pack) => pack.id === row.packId) !== context.pack)
              throw new Error(t('interface:installedOriginalsChangedChoosePlayAgain'));
          }
          return launchLibraryClassic(context.pack, context.selection, context);
        },
        launchCustom: (binding, context) => {
          // The verified library classified this exact immutable prepared pack,
          // including same-ID modifications. Do not add an actor-download
          // dependency to its existing authored gameplay path.
          actorCustomPacks.add(binding.pack);
          return launchLibraryClassic(binding.pack, binding.selection, context);
        },
        progressClassic: (row) => {
          const entry = classicRuntimeEntry(row);
          return entry && library.campaigns[campaignKey(entry.campaign)]?.clears?.[row.levelId]
            ? t('interface:cleared')
            : '';
        },
        progressStateClassic: (row) => {
          const entry = classicRuntimeEntry(row);
          const clear =
            entry && library.campaigns[campaignKey(entry.campaign)]?.clears?.[row.levelId];
          return clear
            ? { state: 'completed', bestStars: clear.medals ?? null }
            : { state: 'new', bestStars: null };
        },
        progressCustom: (binding) =>
          library.campaigns[binding.selection.campaignKey]?.clears?.[binding.selection.levelId]
            ? t('interface:cleared')
            : '',
        progressStateCustom: (binding) => {
          const clear =
            library.campaigns[binding.selection.campaignKey]?.clears?.[binding.selection.levelId];
          return clear
            ? { state: 'completed', bestStars: clear.medals ?? null }
            : { state: 'new', bestStars: null };
        },
      });
      if (unifiedDisposed) {
        result.library.dispose();
        spatialEditions.dispose();
        if (!candidateHost) host.preparer?.dispose();
        throw new DOMException(t('interface:missionLibraryClosed'), 'AbortError');
      }
      disposeUnifiedPreview = () => {
        spatialEditions.dispose();
        if (!candidateHost) host.preparer?.dispose();
      };
      const state = createMissionLibrarySessionState({ mode: 'solo' });
      // Checked return restores the retained runtime independently of browsing.
      // Preserve the source chooser's validated filters/card; use its runtime
      // selection only as a fallback for older returns without browse state.
      // Neither UI state grants runtime ownership or launch authority.
      const returnedRow = exactReturn
        ? result.library.missions.find((row) => {
            if (!['Classic', 'Custom'].includes(row.collection) || !row.modes.includes('solo'))
              return false;
            const owner = JSON.parse(row.ownerId);
            const sourcePackId =
              owner[0] === 'classic' ? owner[2] : owner[0] === 'custom' ? owner[1] : undefined;
            return (
              row.runtimeId === returnedSelection.levelId &&
              libraryRowRuntimeCampaignKey(row) === returnedSelection.campaignKey &&
              sourcePackId === (activeEntry.sourcePackId ?? null) &&
              row.modes.includes('solo') &&
              result.library.availability(row, 'solo').state === 'ready'
            );
          })
        : null;
      retiredJourneyChooser?.destroy();
      retiredJourneyChooser = null;
      unifiedChooser = attachJourneyChooser({
        library: result.library,
        profile,
        goalPreferenceOptions: {
          editionId: runtimeContent?.editionId ?? 'default',
          getStorage: profileStorage,
        },
        ...(runtimeContent
          ? {
              supportedModes: runtimeContent.selection.edition.modes,
              availableCollectionsOnly: true,
              description: runtimeContent.selection.edition.name,
            }
          : {}),
        getCurrentId: () => {
          const mission = candidateHost && journeyMission();
          if (mission)
            return result.library.missions.find(
              (row) =>
                row.ownerId === `journey:${authoredRoute.id}` &&
                row.editionId === authoredRoute.id &&
                row.runtimeId === mission.id &&
                row.modes.includes('solo'),
            )?.id;
          try {
            return retainedLibraryMission(result.library, {
              mode: 'solo',
              levelId: campaign.levels[levelIndex].id,
              campaignKey: activeEntry.classicRulesSourceCampaignKey
                ? `${activeEntry.classicRulesSourceCampaignKey}::${activeEntry.classicRulesEdition}`
                : activeEntry.baseCampaignKey || campaignKey(campaign),
              sourcePackId: activeEntry.sourcePackId ?? null,
              rulesEdition: activeEntry.classicRulesEdition ?? CLASSIC_RULES_ORIGINAL,
              ...(retainedLibraryOwner?.entry === activeEntry ? retainedLibraryOwner : {}),
            })?.id;
          } catch {
            // Focus is a browsing hint, never authority to replace an unavailable edition.
            return null;
          }
        },
        readState: () =>
          state.read() ??
          (returnedRow
            ? {
                search: '',
                collection: '',
                campaign: '',
                mode: 'solo',
                selectedId: returnedRow.id,
                scroll: 0,
              }
            : null),
        writeState: state.write,
        launchContext: libraryActivationContext,
        onPause: () => {
          pause(true);
          clearInput();
          clearSkipConfirmation();
        },
        onReturn: (opener) => {
          clearInput();
          (availableFocusTarget(opener) ? opener : controllerFocus())?.focus({
            preventScroll: true,
          });
        },
      });
      if (!journeyPreferences)
        browsingJourneyPreferences.subscribe(() => unifiedChooser?.refresh());
      // Keep the native settings and their guarded handlers, but not the old
      // pack/level/campaign browser. Settings describe the current Solo host,
      // independently of the library's cross-mode browsing filter.
      const setup = $('mission-picker-setup');
      if (setup) {
        setup.querySelector('.mission-picker-setup-fields').append($('shell-mode-choice'));
        setup.classList.add('mission-library-setup');
        setup.open = false;
        localizedText(setup.querySelector('summary'), () => t('interface:currentSoloFlightSetup'));
        for (const id of ['pack-select', 'level-select', 'campaign-select'])
          $(id).closest('label').hidden = true;
        $('journey-chooser').querySelector('.journey-footer').append(setup);
      }
      unifiedLibrary = result;
      return result;
    })();
    try {
      return await unifiedLibraryLoading;
    } finally {
      unifiedLibraryLoading = null;
    }
  }
  function libraryActivationContext() {
    const revision = ++unifiedLaunchRevision;
    const snapshot = {
      run,
      recorder,
      runId,
      activeEntry,
      campaign,
      levelIndex,
      theme,
      classId,
      seed,
      turnPolicy,
      flightPictures,
      packs,
      libraryGeneration,
      difficulty: library.preferences.campaignDifficulty,
      journeyRevision: journeyPreferences?.snapshot().revision,
    };
    return {
      isCurrent: () =>
        revision === unifiedLaunchRevision &&
        !unifiedDisposed &&
        !document.hidden &&
        document.hasFocus?.() !== false &&
        paused &&
        snapshot.run === run &&
        snapshot.recorder === recorder &&
        snapshot.runId === runId &&
        snapshot.activeEntry === activeEntry &&
        snapshot.campaign === campaign &&
        snapshot.levelIndex === levelIndex &&
        snapshot.theme === theme &&
        snapshot.classId === classId &&
        snapshot.seed === seed &&
        snapshot.turnPolicy === turnPolicy &&
        snapshot.flightPictures === flightPictures &&
        snapshot.packs === packs &&
        snapshot.libraryGeneration === libraryGeneration &&
        snapshot.difficulty === library.preferences.campaignDifficulty &&
        snapshot.journeyRevision === journeyPreferences?.snapshot().revision,
    };
  }
  async function openUnifiedMissions(opener, options) {
    cancelUnifiedOpening?.();
    const revision = ++unifiedOpenRevision;
    // The picker may need its first metadata load. Retire post-adoption Next
    // intent immediately; a not-yet-mounted dialog cannot block its resume.
    ++resultAttemptEpoch;
    const parent = controllerDialog();
    const homeWasOpen = $('shell-home').open,
      oldRun = run,
      wasStarted = started;
    ++unifiedLaunchRevision;
    pause(true);
    clearInput();
    const feedback = document.createElement('span');
    feedback.id = 'mission-library-opening-status';
    feedback.className = 'micro-note';
    feedback.setAttribute('role', 'status');
    localizedText(feedback, () => t('interface:preparingMissions'));
    (opener?.isConnected ? opener : $('shell-play')).after(feedback);
    let failed = false;
    const cancel = () => {
      if (revision === unifiedOpenRevision) ++unifiedOpenRevision;
      opening.dispose();
      feedback.remove();
      if (cancelUnifiedOpening === cancel) cancelUnifiedOpening = null;
    };
    const opening = trackMissionLibraryOpening({
      onRetire: cancel,
    });
    cancelUnifiedOpening = cancel;
    try {
      const host = await getUnifiedMissionLibrary();
      // The installed-card refresh may move focus while it reconciles an owned
      // catalogue. Claim the still-current opener before that internal work;
      // newer input still retires the claim while the state/revision checks
      // below also reject replaced navigation and game state.
      if (!opening.claim()) return;
      await host.refreshInstalled();
      const openingCurrent = opening.current();
      opening.dispose();
      if (
        revision !== unifiedOpenRevision ||
        !openingCurrent ||
        unifiedDisposed ||
        document.hidden ||
        document.hasFocus?.() === false ||
        controllerDialog() !== parent ||
        $('shell-home').open !== homeWasOpen ||
        run !== oldRun ||
        started !== wasStarted ||
        !paused
      )
        return;
      unifiedChooser.open(opener, options);
      if (options?.focusSetup) {
        const setup = $('mission-picker-setup');
        const control = $(options.focusSetup);
        if (setup?.contains(control)) {
          setup.open = true;
          control.focus({ preventScroll: true });
          control.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
      }
    } catch (error) {
      if (revision === unifiedOpenRevision) {
        failed = true;
        localizedText(feedback, () => t('interface:missionsCouldNotLoadChooseMissionsToRetry'));
        warning(localizedMessage('interface:missionLibrary.openFailed', { error: error.message }));
      }
    } finally {
      opening.dispose();
      if (!failed) {
        feedback.remove();
        if (cancelUnifiedOpening === cancel) cancelUnifiedOpening = null;
      }
    }
  }
  if (journeyEnabled) {
    document.body.classList.add('journey-preview');
    show('journey-artwork-availability', !!candidateHost);
    if (authoredRoute?.id === DEFAULT_JOURNEY_ROUTES.solo)
      localizedText($('journey-artwork-availability'), () =>
        t('interface:missionPicturesNeedAConnectionFullDownloadsIncludeThem'),
      );
    localizedText($('shell-title-edition'), () =>
      candidateHost
        ? authoredRoute.id === DEFAULT_JOURNEY_ROUTES.solo
          ? t('interface:journey.menuMissionCount', { count: journeyCatalog.missions.length })
          : t('interface:journey.testEdition', {
              edition: contentText(authoredRoute, 'label').toLocaleUpperCase(),
            })
        : t('interface:journeyTechnicalTestPreview'),
    );
    journeyChooser = attachJourneyChooser({
      catalog: journeyCatalog,
      profile: journeyProfile,
      onChoose: (mission) => {
        // Browsing retains Home for Back. Only deliberate mission selection
        // leaves it before the staged preparation owns the next attempt.
        if ($('shell-home').open) $('shell-home').close();
        return launchJourneyMission(mission);
      },
      getCard: candidateHost
        ? (mission) => candidateHost.card(mission, journeyPreferences.snapshot().difficulty)
        : undefined,
      onPause: () => {
        pause(true);
        clearInput();
        clearSkipConfirmation();
      },
      onReturn: (opener) => {
        clearInput();
        (availableFocusTarget(opener) ? opener : controllerFocus())?.focus({ preventScroll: true });
      },
    });
    $('journey-chooser').querySelector('.journey-footer').append($('missions-catalogue'));
    refreshJourneySkip();
    $('journey-save-retry').onclick = () => void journeyProfile.flush();
    $('journey-save-export').onclick = async () => {
      if (previewSession) return;
      try {
        await downloadJSON(JSON.parse(journeyProfile.export()), journeyProfile.backupFilename);
      } catch (error) {
        localizedText($('journey-save-message'), () =>
          t('interface:journey.progressExportError', { error: error.message }),
        );
      }
    };
    if (previewSession) {
      $('journey-save-retry').hidden = true;
      $('journey-save-export').hidden = true;
    }
    window.addEventListener('online', () => void journeyProfile.flush());
  }
  $('journey-skip').onclick = () => {
    if (!normalSoloSkipAvailable()) return;
    if (journeySkipArmed !== null) {
      const destination = journeySkipDestination;
      if (
        journeySkipArmed !== runId ||
        !destination ||
        !skipSnapshotCurrent(destination.snapshot)
      ) {
        clearSkipConfirmation(localizedMessage('interface:solo.skipCancelledFlightChanged'));
        $('journey-skip').focus({ preventScroll: true });
        return;
      }
      if (destination.type === 'journey') {
        void launchJourneyMission(destination.mission, {
          kind: 'skip',
          skipped: destination.skipped,
        }).then((adopted) => {
          if (!adopted && journeySkipDestination === destination && !document.hidden)
            $('journey-skip').focus({ preventScroll: true });
        });
      } else void launchLibrarySkip(destination);
      return;
    }
    const mission = journeySkipMission(),
      next = mission && nextJourneyMission(mission.id);
    if (mission && next) {
      pause(true);
      clearInput();
      armSkip({
        type: 'journey',
        mission: next,
        name: next.name,
        skipped: mission,
        snapshot: skipSnapshot(),
      });
      return;
    }
    void resolveLibrarySkip();
  };
  if (journeyPreferences) {
    let preferenceRevision = journeyPreferences.snapshot().revision,
      exportSequence = 0;
    journeyPreferences.subscribe((snapshot) => {
      // Cross-tab intent updates the next attempt only. An old in-flight
      // preparation cannot adopt a now-stale preset after its pixels resolve.
      if (preferenceRevision !== snapshot.revision) {
        preferenceRevision = snapshot.revision;
        cancelResultAttempt();
        cancelSkipForContentChange();
      }
      exportSequence++;
      show('journey-preferences-recovery', !snapshot.durable);
      localizedText($('journey-preferences-message'), () => snapshot.error);
      refreshDifficulty();
      journeyChooser?.refresh();
    });
    $('journey-preferences-retry').onclick = () => {
      const restoreFocus = document.activeElement === $('journey-preferences-retry');
      const snapshot = journeyPreferences.retry();
      if (snapshot.durable && restoreFocus && availableFocusTarget($('difficulty-select')))
        $('difficulty-select').focus({ preventScroll: true });
    };
    $('journey-preferences-export').onclick = async () => {
      const ticket = ++exportSequence;
      try {
        const result = await downloadJSON(
          JSON.parse(journeyPreferences.export()),
          'revealline-journey-difficulty.json',
        );
        if (ticket === exportSequence && !$('journey-preferences-recovery').hidden)
          localizedText(
            $('journey-preferences-message'),
            () => `${journeyPreferences.snapshot().error} ${result.message}`,
          );
      } catch (error) {
        if (ticket === exportSequence && !$('journey-preferences-recovery').hidden)
          localizedText($('journey-preferences-message'), () =>
            t('interface:journey.preferenceExportError', { error: error.message }),
          );
      }
    };
  }
  optionalWorlds = attachOptionalChaptersPanel({
    onPlayActivation: captureWorldPlay,
    getLibrary: () => packs,
    getUsage: () => chapterSnapshot?.usage,
    sourceChapters:
      !practiceSession && !runtimeContent
        ? SOURCE_EXTERNAL_EDITIONS.map((edition) => {
            const { descriptor, name, description, mode, levels } = edition;
            return presentSourceChapter(edition, {
              id: descriptor.id,
              controlId:
                descriptor.id === SOURCE_EXTERNAL_CHAPTER.id ? 'source' : `source-${descriptor.id}`,
              name,
              description,
              mode,
              themeId: descriptor.themeId,
              levels,
              sourceOnly: !isRelease,
              bytes: descriptor.pack.bytes + descriptor.media.bytes,
              download: isRelease
                ? (options) =>
                    installSourceChapter(descriptor.id, null, { ...options, download: true })
                : null,
              backupSupported: !!externalBackup,
              async inspect({ signal }) {
                const snapshot = await inspectChapters({ signal });
                if (snapshot.status !== 'checked') return { status: snapshot.reason };
                const installed = snapshot.index.chapters.some((d) => d.id === descriptor.id);
                if (installed)
                  await externalChapters.readiness(snapshot, descriptor.id, { signal });
                return { status: installed ? 'installed' : 'absent' };
              },
              install: (files, options) => installSourceChapter(descriptor.id, files, options),
              async play({ signal, onStatus, launch }) {
                if (!storedStateAdopted || !persistenceReady)
                  throw new Error(t('interface:reloadAfterRecoveryBeforePlayingThisChapter'));
                const snapshot = await checkedChapters({ signal });
                await externalChapters.readiness(snapshot, descriptor.id, { signal });
                assertWorldPlay(launch);
                adoptContentCatalog(contentFromChapters(snapshot));
                const pack = packs.packs.find((item) => item.id === descriptor.id);
                return requestWorldPlay(pack, { signal, launch, onStatus });
              },
              async choose({ signal, onStatus, launch }) {
                if (!storedStateAdopted || !persistenceReady)
                  throw new Error(
                    t('interface:reloadAfterRecoveryToAdoptThePreservedProfileBeforeChoosing'),
                  );
                preparationStatus(
                  onStatus,
                  t('interface:checkingInstalledChapterOriginals'),
                  'verifying',
                  () => !signal?.aborted,
                );
                const snapshot = await checkedChapters({ signal });
                await externalChapters.readiness(snapshot, descriptor.id, { signal });
                if (signal.aborted || !launch?.isCurrent())
                  throw new DOMException(t('interface:chapterSelectionCancelled'), 'AbortError');
                // Reconcile only checked content; this does not replace the run.
                // The explicit selection below still requires Stay / Replace.
                adoptContentCatalog(contentFromChapters(snapshot));
                const pack = packs.packs.find((p) => p.id === descriptor.id);
                return requestWorldLaunch(
                  resolvePackCampaign(pack, pack.campaigns[0].id),
                  launch,
                  onStatus,
                );
              },
            });
          })
        : [],
    loadCatalog: async ({ signal }) => {
      if (runtimeContent) return { format: 'revealline-optional-chapters.v1', packs: [] };
      const options = { signal, baseURL: new URL('../', gameDocumentURL(location.href)) };
      if (isRelease) await loadExternalCatalog(options);
      return loadOptionalCatalog(options);
    },
    install: installOptionalChapter,
    playInstalled: (pack, options) => {
      if (SOURCE_EXTERNAL_EDITIONS.some(({ descriptor }) => descriptor.id === pack.id))
        throw new Error(t('interface:useThisChapterSExactOriginalPictureCard'));
      return requestWorldPlay(pack, options);
    },
    play: async (summary, options) => {
      const pack = packs.packs.find((item) => item.id === summary.id);
      if (!pack) throw new Error(t('interface:installThisChapterBeforePlaying'));
      await verifyOptionalInstalled(pack, summary, { signal: options.signal });
      return requestWorldPlay(pack, options);
    },
    chooseInstalled: async (pack, { signal, launch, onStatus }) => {
      if (courseEntry || courseSession || practice || !storedStateAdopted || !persistenceReady)
        throw new Error(t('interface:returnToTheNormalGameAndResolveRecoveryBeforeChoosing'));
      if (signal?.aborted)
        throw new DOMException(t('interface:worldSelectionCancelled'), 'AbortError');
      if (!packs.packs.includes(pack))
        throw new Error(t('interface:installedContentChangedRefreshTheChapterList'));
      // External originals always go through their descriptor/readiness card.
      if (SOURCE_EXTERNAL_EDITIONS.some(({ descriptor }) => descriptor.id === pack.id))
        throw new Error(t('interface:useThisChapterSExactOriginalPictureCard'));
      return requestWorldLaunch(resolvePackCampaign(pack, pack.campaigns[0].id), launch, onStatus);
    },
    choose: async (summary, { signal, onStatus, launch }) => {
      if (courseEntry || courseSession || practice)
        throw new Error(t('interface:returnFromPracticeBeforeChoosingAWorld'));
      const pack = packs.packs.find((item) => item.id === summary.id);
      if (!pack) throw new Error(t('interface:installThisWorldBeforeChoosingIt'));
      preparationStatus(
        onStatus,
        localizedMessage('interface:optionalChapters.verifying', { chapter: summary.name }),
        'verifying',
        () => !signal?.aborted,
      );
      await verifyOptionalInstalled(pack, summary, { signal });
      if (signal?.aborted)
        throw new DOMException(t('interface:worldSelectionCancelled'), 'AbortError');
      if (packs.packs.find((item) => item.id === summary.id) !== pack)
        throw new Error(t('interface:installedContentChangedChooseThisWorldAgain'));
      return requestWorldLaunch(resolvePackCampaign(pack, pack.campaigns[0].id), launch, onStatus);
    },
    onOpen: () => {
      pause(true);
      clearInput();
    },
    onClose: () => {
      clearInput();
      gameShell?.openHome();
    },
    onChosen: () => {
      clearInput();
      controllerReading.refresh();
      controllerFocus()?.focus({ preventScroll: true });
    },
    onRead: (request) => controllerNavigation.beginReading(request),
    onManage: () => {
      clearInput();
      libraryPanel.open('packs');
    },
  });
  if (!practiceSession) {
    retiredJourneyChooser = journeyChooser;
    journeyChooser = {
      open: openUnifiedMissions,
      primary: () => unifiedChooser?.primary(),
      refresh: () => unifiedChooser?.refresh(),
      close: () => unifiedChooser?.close(),
    };
  }
  gameShell = attachGameShell({
    keyboardNavigation: false, // The shared controller adapter also owns menu keys.
    training: courseSession,
    practiceReturn: $('controller-practice-return') || $('enemy-workshop-return'),
    focusBriefing: () => {
      clearInput();
      controllerReading.refresh();
      $('mission-brief-read').focus({ preventScroll: true });
      return true;
    },
    focusMissions: () => missionPicker?.focusSelectedChapter(),
    focusGame: () => controllerFocus()?.focus({ preventScroll: true }),
    pause,
    getTopDialog: controllerDialog,
    canContinue: () =>
      (started && !['won', 'lost'].includes(run?.status)) ||
      !$('continue-saved').hidden ||
      !!journeyCatalog.find(journeyProfile?.snapshot().cursors.solo),
    initial: !practice && !courseSession && !packLaunchRequest && !libraryHandoff,
    initialFocus: false, // The boot guard still hides the title until ready().
    titleDestination: () =>
      t('interface:journey.startDestination', {
        destination: contentText(journeyDestination() || campaign.levels[levelIndex], 'name'),
      }),
    titleContinueDestination: () =>
      !started || ['won', 'lost'].includes(run?.status)
        ? contentText(journeyDestination(), 'name')
        : undefined,
    onTitleStart: (options) => {
      const destination = journeyDestination();
      if (destination && !started && $('continue-saved').hidden) {
        if (!options.isCurrent()) return;
        options.leave();
        return launchJourneyMission(destination);
      }
      return launchTitleFlight('start', options);
    },
    onTitleContinue: (options) => {
      const destination = journeyDestination();
      if (
        destination &&
        (!started || ['won', 'lost'].includes(run?.status)) &&
        $('continue-saved').hidden
      ) {
        if (!options.isCurrent()) return;
        options.leave();
        return launchJourneyMission(destination);
      }
      return launchTitleFlight('continue', options);
    },
    onTitleCancel: cancelTitleFlight,
    onModeDeparture: requestModeDeparture,
    separateTeam: !!authoredRoute,
    onWorlds: () => optionalWorlds.open(),
    onMissions: !practiceSession
      ? (opener) =>
          journeyChooser.open(opener, {
            returnLabel: $('shell-home').open
              ? localizedMessage('interface:backToMenu')
              : localizedMessage('common:navigation.backToGame'),
          })
      : undefined,
  });
  function cancelDemoAudio() {
    ++demoAudioOperation;
    demoAudioController?.abort();
    demoAudioController = null;
  }
  const demoAudio = {
    snapshot: () => ({
      ...(soundtrackPlayer?.snapshot() ?? { status: 'unavailable', desired: false }),
      playbackAvailable: !!soundtrackPlayer,
      ...audioMaster.snapshot(),
      style: soundtrackLibrary?.listening?.mode ?? 'auto',
    }),
    subscribe(listener) {
      demoAudioListeners.add(listener);
      const unsubscribe = audioMaster.subscribe(listener);
      return () => {
        demoAudioListeners.delete(listener);
        unsubscribe();
      };
    },
    setMuted: setMasterMuted,
    setVolume: setMasterVolume,
    wake() {
      soundtrackMenuGesture = true;
      soundtrackSuspended = false;
      return soundtrackPlayer?.wake() ?? sound.enable();
    },
    play() {
      cancelDemoAudio();
      soundtrackMenuGesture = true;
      return soundtrackPlayer?.play() ?? sound.resumeMusic();
    },
    pause() {
      cancelDemoAudio();
      soundtrackMenuGesture = true;
      if (soundtrackPlayer) soundtrackPlayer.pause();
      else sound.pauseMusic();
    },
    next() {
      cancelDemoAudio();
      soundtrackMenuGesture = true;
      return soundtrackPlayer?.next();
    },
    async selectStyle(mode) {
      cancelDemoAudio();
      if (!SOUNDTRACK_MODES.includes(mode) || !soundtrackPlayer || !soundtrackStore)
        throw new Error(t('demo:audio.unavailable'));
      const operation = demoAudioOperation;
      const pending = new AbortController();
      demoAudioController = pending;
      const signal = pending.signal;
      const current = () =>
        !signal.aborted && operation === demoAudioOperation && !soundtrackDisposed;
      const saved = await soundtrackStore.read({ signal });
      const draft = structuredClone(upgradeSoundtrackLibrary(saved.library));
      draft.selection.playlistId = null;
      draft.listening.mode = mode;
      const prepared = await prepareSoundtrackLibrary(draft, saved.assets, {
        signal,
        catalogue: SOUNDTRACK_CATALOGUE,
      });
      if (!current()) return false;
      const committed = await soundtrackStore.commit(prepared, {
        signal,
        expectedGeneration: saved.generation,
      });
      // An atomic save remains authoritative even if a later Pause cancels playback.
      if (committed.generation >= soundtrackGeneration) {
        soundtrackGeneration = committed.generation;
        soundtrackLibrary = setCatalogueTracks(
          upgradeSoundtrackLibrary(committed.library),
          SOUNDTRACK_CATALOGUE.tracks,
        );
        soundtrackAssets = new Map(prepared.assets.map(({ sha256, blob }) => [sha256, blob]));
      }
      if (!soundtrackDisposed) {
        soundtrackPlayer?.setLibrary(soundtrackLibrary);
        notifyDemoAudio();
      }
      if (!current()) return false;
      await soundtrackPlayer.selectListening(soundtrackLibrary.listening);
      if (!current()) return false;
      return soundtrackPlayer.play();
    },
    cancelPending: cancelDemoAudio,
    setScene({ source, theme: demoTheme }) {
      const edition = source.entry.baseCampaignKey || campaignKey(source.entry.campaign);
      soundtrackPlayer?.setContext(
        {
          scene: 'gameplay',
          themeId: demoTheme.id,
          campaignKey: edition,
          mapKey: JSON.stringify([edition, source.level.id, source.level.revision, demoTheme.id]),
        },
        { deferUntilNextTrack: true },
      );
    },
    update({ active, theme: demoTheme, state, bodyId: demoBodyId }) {
      const currentTheme = demoTheme ?? theme,
        currentState = state ?? {};
      if (soundtrackPlayer) soundtrackPlayer.update(active, currentTheme, currentState);
      else sound.update(active, currentTheme, currentState);
      updateDemoFeedback(sound, {
        active,
        theme: currentTheme,
        state: currentState,
        bodyId: demoBodyId,
      });
    },
    events(events, state, demoTheme, { bodyId: demoBodyId, source } = {}) {
      emitDemoEvents(sound, events, state, demoTheme ?? theme, {
        bodyId: demoBodyId,
        source,
      });
    },
  };
  let demoReturnSettings = false;
  demoHost = attachDemoHost({
    presets,
    audio: demoAudio,
    getContext: () => ({
      entries: executionEntries(),
      library,
      preferences: library.preferences,
      themeId: theme.id,
      reduced: displayPreferences.snapshot().effectiveReducedEffects,
      controller: controllerFrame?.assigned,
      touchSettings: touchPreferences.snapshot(),
      tapSteering: $('tap-steering').checked,
    }),
    loadSources: ({ signal }) =>
      loadDemoSources({ entries: executionEntries(), library: demoLibrary, turnPolicy, signal }),
    readMedia: async (options) =>
      createSessionPictureView(await pictureMedia(options), sessionPictures),
    getJourneyPictureContext: ({ entry, level }) => {
      if (!candidateHost?.owns(entry)) return null;
      const index = entry.campaign.levels.findIndex((item) => item.id === level.id);
      return {
        editionId: authoredRoute.id,
        missionId: candidateHost.mission(entry, index)?.id,
        entries: candidateHost.entries,
        profile: journeyProfile.snapshot(),
        pictures: journeyProfile.pictures(),
      };
    },
    canOpen: () =>
      !practiceSession &&
      !courseSession &&
      !courseBlocked() &&
      !courseEntry &&
      !courseEntryHold &&
      !contentSwitchBusy &&
      !sessionBusy &&
      !backupBusy &&
      !titleFlight &&
      !modeDeparture &&
      !missionReplacement &&
      !restartRequest &&
      !pictureThemePending &&
      !document.hidden,
    canAutoStart: () =>
      $('shell-home').open &&
      controllerDialog()?.id === 'shell-home' &&
      (!started || ['won', 'lost'].includes(run.status)) &&
      !practiceSession &&
      !courseSession &&
      !courseBlocked() &&
      !courseEntry &&
      !courseEntryHold &&
      !contentSwitchBusy &&
      !sessionBusy &&
      !backupBusy &&
      !titleFlight &&
      !modeDeparture &&
      !missionReplacement &&
      !restartRequest &&
      !pictureThemePending &&
      storedStateAdopted &&
      recovery === null &&
      !document.hidden &&
      document.hasFocus(),
    onEnter: () => {
      clearInput();
      paused = true;
      if (started && !['won', 'lost'].includes(run.status)) overlay('pause');
      demoReturnSettings = $('settings-dialog').open;
      if (demoReturnSettings) $('settings-dialog').close();
      if ($('shell-home').open) $('shell-home').close();
    },
    onExit: ({ handoff, origin }) => {
      clearInput();
      sound.pause();
      if (handoff) {
        if (!controllerDialog()) $('start-button').focus({ preventScroll: true });
      } else {
        // Reopening the presentation must leave the suspended save unchanged.
        if (!$('shell-home').open) $('shell-home').showModal();
        gameShell?.refreshHome();
        if (demoReturnSettings && !$('settings-dialog').open) $('settings-dialog').showModal();
        (origin?.isConnected && origin.getClientRects().length ? origin : $('shell-options')).focus(
          {
            preventScroll: true,
          },
        );
      }
      soundtrackPlayer?.setContext(soundtrackContext(), { deferUntilNextTrack: true });
    },
    onFreshStart: (source, current) => prepareDemoFresh(source, current),
    clearInput,
    menu: (commands) => controllerNavigation.handle(commands),
    nativeConfirmOwned: (event) => {
      controllerConfirmLifecycle.beforeNativeActivation(event, { activated: true });
      return controllerConfirmGuard.owned();
    },
    canWrite: () => writer.writable && persistenceReady && !backupBusy,
    settingsKey: `revealline-mmm.demo.${channel}.v1`,
    setCollect: (enabled) => demoLibrary.setEnabled(enabled),
    clearRecordings: () => demoLibrary.clear(),
  });
  async function retainDemoRun(manual) {
    if (
      !recorder ||
      practice ||
      run.status !== 'won' ||
      recoverGameplayTuning(run.level)?.adminOverride
    ) {
      if (manual) $('demo-keep-status').textContent = t('demo:notKept');
      return;
    }
    try {
      const result = await demoLibrary.keep(exportReplay(recorder, run), {
        entry: activeEntry,
        practice: false,
        manual,
      });
      if (manual)
        $('demo-keep-status').textContent = t(result.saved ? 'demo:kept' : 'demo:notKept');
    } catch {
      if (manual) $('demo-keep-status').textContent = t('demo:cacheError');
    }
  }
  $('demo-keep').onclick = () => void retainDemoRun(true);
  $('shell-demo').hidden = practiceSession;
  $('demo-button').hidden = practiceSession;
  for (const id of ['shell-catalogue', 'missions-catalogue']) {
    const link = $(id);
    link.hidden = practiceSession;
    localizedText(link, () => t('interface:allMissions'));
    link.setAttribute('href', catalogueHref);
    link.onclick = (event) => {
      if (
        !practiceSession &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        return openUnifiedMissions(link, {
          returnLabel: $('shell-home').open
            ? t('interface:backToMenu2')
            : t('interface:backToBrief'),
        });
      }
      const parent = link.closest('dialog');
      void requestModeDeparture('catalogue', event, link, {
        origin: 'solo-title',
        isCurrent: () => parent?.open && parent.contains(link),
      });
    };
  }
  const workshopContext = new URL(gameDocumentURL(location.href));
  workshopContext.searchParams.set(
    'journey',
    authoredRoute?.id ?? (journeyEnabled ? '1' : 'legacy'),
  );
  mountWorkshopLinks({ document, href: workshopContext.href });
  editionUI = runtimeContent
    ? await mountEditionSoloUI({
        provider: runtimeContent,
        document,
        window,
        writer,
        version: isRelease ? buildVersion : 'DEV',
        previewSession,
        audioMaster,
        musicDucker: {
          acquire: (factor) => soundtrackPlayer?.acquireGain({ factor }).release ?? (() => {}),
        },
        pause: () => {
          storyDialog.close();
          pause(true);
          clearInput();
        },
        getRun: () => run,
        getRunId: () => runId,
        getRecorder: () => recorder,
        getJourneyProfile: () => journeyProfile?.snapshot() ?? null,
        getJourneyRevision: () => journeyProfile?.stateRevision() ?? 0,
        getJourneyDurable: () => journeyRewardsDurable,
        getReducedMotion: () => displayPreferences.snapshot().effectiveReducedEffects,
        motionPreferences: displayPreferences,
        onCosmeticBodiesChange: () => updateBodies(),
        onChooseCosmetic: () => focusAppearance(),
        onRecoverCosmetic: () => focusEditionPresentationRecovery({ document, shell: gameShell }),
        getPictureVisible: () =>
          run?.status === 'won' &&
          ((!$('game-overlay').hidden &&
            $('game-overlay').dataset.kind === 'won' &&
            !$('result-picture').hidden) ||
            ($('game-overlay').hidden && !$('show-result').hidden)),
        report: (message) => warning(message),
        onMissions: (opener) => openUnifiedMissions(opener),
        onEditionChange: (editionId, opener) =>
          requestModeDeparture('catalogue', { preventDefault() {} }, opener, {
            origin: 'solo-title',
            editionId,
            isCurrent: () => opener?.closest('dialog')?.open && document.contains(opener),
          }),
        getSavedPresentation: () => savedAttempt()?.actorAppearancePin?.authoredPresentationSha256,
        onPresentationChange: (presentationId, opener) =>
          requestModeDeparture('catalogue', { preventDefault() {} }, opener, {
            origin: 'solo-title',
            presentationId,
            isCurrent: () => opener?.closest('dialog')?.open && document.contains(opener),
          }),
      })
    : null;
  if (editionUI) {
    if (
      !library.preferences.matchClassAppearance &&
      library.preferences.bodyId !== bodyId &&
      availableBodies().has(library.preferences.bodyId)
    ) {
      bodyId = library.preferences.bodyId;
      painter.setLook(theme, bodyId, painterVisuals());
    }
    updateBodies();
  }
  attachFullscreen($('shell-fullscreen'), document, { allowInstallHelp: false });
  attachFullscreen($('overlay-fullscreen'), document, { allowInstallHelp: false });
  void initializeSoundtrack();
  if (autoplayPackLaunch)
    requestAnimationFrame(() => {
      const currentLevelId = campaign.levels[levelIndex]?.id;
      if (
        canAutoStartPackLaunch({
          current: packLaunchGuard.current(autoplayPackLaunch.ticket, packs),
          blocked: dialogOpen() || contentSwitchBusy || sessionBusy || document.hidden,
          started,
          paused,
          overlayKind: $('game-overlay').dataset.kind,
          run,
          expectedRun: autoplayPackLaunch.run,
          entry: activeEntry,
          expectedEntry: autoplayPackLaunch.entry,
          campaignKey: campaignKey(campaign),
          expectedCampaignKey: autoplayPackLaunch.campaignKey,
          levelId: currentLevelId,
          expectedLevelId: autoplayPackLaunch.levelId,
        })
      )
        resume({ contentSwitchTicket: autoplayPackLaunch.ticket });
    });
  const bootHome = controllerDialog() === $('shell-home');
  const bootFocus = document.activeElement;
  if (globalThis.RevealLineBoot) globalThis.RevealLineBoot.ready();
  else {
    document.querySelectorAll('[data-boot-inert]').forEach((element) => {
      element.inert = false;
      element.removeAttribute('aria-busy');
    });
    $('boot-status').hidden = true;
  }
  if (libraryHandoff && !practiceSession) {
    const revision = ++unifiedOpenRevision;
    const incomingRun = run,
      incomingStarted = started,
      incomingPrewarm = picturePrewarm?.promise;
    const opening = trackMissionLibraryOpening({
      onRetire: () => {
        if (revision === unifiedOpenRevision) ++unifiedOpenRevision;
      },
    });
    // Finish this owned incoming selection before normal boot focus runs. The
    // opening lease still retires on genuinely newer input or lost foreground.
    await (async () => {
      try {
        const host = await getUnifiedMissionLibrary();
        // The boot picture may still own a media-generation write. Finish it
        // before the requested mission prepares its distinct exact original.
        // Its failure is not authority to replace or reject the requested art.
        await incomingPrewarm?.catch(() => {});
        opening.dispose();
        if (
          revision !== unifiedOpenRevision ||
          !opening.current() ||
          run !== incomingRun ||
          started !== incomingStarted ||
          !paused ||
          document.hidden ||
          document.hasFocus?.() === false
        )
          return;
        const row = host.library.find(libraryHandoff);
        if (!row || !row.modes.includes('solo'))
          throw new Error(t('interface:thisExactMissionEditionIsNotAvailableInSoloNo'));
        if ((row.collection === 'Journey') !== !!candidateHost)
          throw new Error(t('interface:thisMissionBelongsToADifferentGameplayHostSelectIt'));
        if (host.library.availability(row, 'solo').state !== 'ready') {
          unifiedChooser.open($('shell-missions'));
          unifiedChooser.reveal(row.id);
          return;
        }
        const context = libraryActivationContext();
        const selected = await host.library.launch(row, {
          mode: 'solo',
          ...context,
          prepareOnly: libraryReady,
        });
        if (selected === false && revision === unifiedOpenRevision && context.isCurrent()) {
          unifiedChooser.open($('shell-missions'));
          unifiedChooser.reveal(row.id);
        }
      } catch (error) {
        if (revision === unifiedOpenRevision)
          warning(
            localizedMessage('interface:missionLibrary.requestedMissionFailed', {
              error: error.message,
            }),
          );
      } finally {
        opening.dispose();
      }
    })();
  }
  if (
    exactReturn &&
    !document.hidden &&
    document.hasFocus?.() !== false &&
    (document.activeElement === document.body || !availableFocusTarget(document.activeElement))
  ) {
    // This selector is lazy. Await its owned opening so normal boot focus does
    // not retire it; a real newer focus/visibility choice still cancels it.
    await openUnifiedMissions($('shell-play'), { returnLabel: t('interface:backToMenu2') });
  }
  const workshopReturn = readWorkshopReturn(location.search);
  const ownedWorkshopBootFocus =
    !bootWorkshopInput.interrupted &&
    $('shell-home').open &&
    $('shell-home').contains(document.activeElement);
  if (
    !practice &&
    !courseSession &&
    !packLaunchRequest &&
    !libraryHandoff &&
    !exactReturn &&
    workshopReturn &&
    !document.hidden &&
    document.hasFocus?.() !== false &&
    (document.activeElement === document.body ||
      !availableFocusTarget(document.activeElement) ||
      ownedWorkshopBootFocus) &&
    gameShell?.openWorkshop({ tool: workshopReturn.id })
  )
    clearWorkshopReturn(window);
  retireBootWorkshopInput();
  controllerReading?.refresh();
  // Boot removes the visibility guard synchronously. Do not refocus a hidden
  // placeholder or replace a deliberate choice made during that handoff.
  if (
    !document.hidden &&
    document.hasFocus?.() !== false &&
    (document.activeElement === document.body ||
      !availableFocusTarget(document.activeElement) ||
      (bootHome && controllerDialog() === $('shell-home') && document.activeElement === bootFocus))
  ) {
    const target = controllerFocus();
    if (availableFocusTarget(target)) target.focus({ preventScroll: true });
  }
  startupEditionWriter = null;
} catch (error) {
  stopStartupEditionLocalization();
  startupEditionWriter?.release();
  startupEditionWriter = null;
  retireBootWorkshopInput();
  globalThis.RevealLineBoot?.fail(error);
  localizedText($('overlay-title'), () => t('interface:theGameCouldNotLoad'));
  localizedText($('overlay-copy'), () => error.message);
  show('start-button', false);
  localizedText($('run-message'), () =>
    new URLSearchParams(location.search).has('course')
      ? t('interface:thisCourseCouldNotOpenUseRevealLineToReturn')
      : new URLSearchParams(location.search).get('practice') === '1'
        ? t('interface:openThePlaygroundAndChoosePlayConfigurationOrUseReveal')
        : t('interface:serveTheProjectThroughHttpAndCheckTheContentFiles'),
  );
  console.error(error);
}
import { communityRouteFromURL, gameDocumentURL } from './community-routes.mjs';
