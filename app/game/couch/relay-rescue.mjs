await globalThis.RevealLineAccess?.ready;
import { COUCH_RESTORE_KEY } from './controller-restore.mjs';
import { createControllerSession } from './controller-session.mjs';
import { mountControllerSetup } from './controller-setup.mjs';
import { gameplayTuningDescription } from '../ui/gameplay-copy.mjs';
import {
  t,
  localizedText,
  localizedAttribute,
  localizedMessage,
  formatNumber,
  render as renderMessage,
  translateDOM,
  attachLanguageControls,
} from '../i18n/index.mjs';
import { contentText } from '../i18n/content.mjs';
import { coopGoalLabel, coopObjectiveLabel } from './coop-copy.mjs';
import { attachCouchTouch } from '../ui/couch-touch.mjs';
import { attachJourneyReactions } from '../ui/journey-reactions.mjs';
import { resultContinuationLabel } from '../ui/result-continuation.mjs';
import { attachJourneySaveCue } from '../ui/journey-save-cue.mjs';
import { attachJourneyModePictures } from '../ui/journey-mode-pictures.mjs';
import {
  createGameplayTuningController,
  applyGameplayTuning,
  resolveGameplayTuning,
} from '../gameplay-tuning.mjs';
import { mountGameplayTuning } from '../ui/gameplay-tuning.mjs';
import { createJourneyPreferences } from '../journey/preferences.mjs';
import { createActorStylePreferences } from '../actor-style-preferences.mjs';
import { prepareActorAppearanceLease } from '../presentation/actor-appearance-lease.mjs';
import { prepareTeamVisualThemeContext } from '../presentation/visual-theme-identities.mjs';
import { canonicalJSON, dataIdentity } from '../data-json.mjs';
import { attachCouchMusicHost } from './couch-music-host.mjs';
import { prepareTeamMusicContext } from './couch-music-context.mjs';
import { attachPublishedAudio } from '../ui/published-audio.mjs';
import { mountModeChoices } from '../ui/mode-choice.mjs';
import { prepareNativeMenus } from '../ui/native-menus.mjs';
import { authoredTeamReturn } from '../ui/authored-mode-routes.mjs';
import { resolveJourneyRequest } from '../content-design/default-entry.mjs';
import { attachOfflineModeNavigation } from '../ui/offline-tool-navigation.mjs';
import { offlineAvailability } from '../offline.mjs';
import {
  createCoop,
  startCoop,
  pauseCoop,
  resumeCoop,
  releaseCoopInputs,
  stepCoop,
  FIXED_DT,
} from '../coop/core.mjs';
import { COOP_PLAYTEST_CONFIGURATIONS } from '../coop/relay-yard.mjs';
import { COOP_STARTER_PACK, coopPackDestination } from '../coop/library.mjs';
import { COOP_PACK_MAX_BYTES } from '../coop/recipes.mjs';
import { attachCouchInput } from './couch-input.mjs';
import { createCoopPainter } from './coop-view.mjs';
import { coopCueOverflowEntries, hasCoopCueOverflow } from './coop-cue-overflow.mjs';
import { mountPresentationPage } from '../presentation/page.mjs';
import { createCoopPresentation } from './coop-presentation.mjs';
import {
  candidateTeamPictureFrame,
  createCandidateTeamPictures,
} from './candidate-team-pictures.mjs';
import {
  COOP_SUPPORTED_PICTURE_BINDINGS,
  COOP_HISTORICAL_IMPORT_PICTURE_POLICIES,
} from './coop-picture-bindings.mjs';
import { decodeCoopPicture } from './coop-picture-image.mjs';
import { createCoopPresentationImport } from './coop-import-source.mjs';
import { readPlayableTeamCampaign } from './creator-team-import.mjs';
import {
  createInstalledTeamAttemptSnapshot,
  createInstalledTeamCampaignStore,
} from '../creator/team-installed.mjs';
import {
  createCreatorTeamMediaPictureLease,
  creatorTeamMediaForLevel,
} from '../creator/team-media.mjs';
import { COOP_PRESENTATION_MIME } from '../coop/presentation-envelope.mjs';
import {
  coopFailureFeedback,
  coopRecoveryCause,
  coopRetryFeedback,
  coopRoamerCaption,
  coopFoundationReturnCaption,
} from './coop-feedback.mjs';
import { coopArenaGuidance } from './coop-briefing.mjs';
import {
  coopBonusView,
  coopBonusDetails,
  coopBonusLive,
  coopBonusCaption,
  teamBonusHelp,
} from './coop-bonus-view.mjs';
import { coopGroundContext } from './coop-ground.mjs';
import { terrainTransitionCaption } from '../ui/terrain-feedback.mjs';
import { createControllerRouter } from '../ui/controller-router.mjs';
import { attachControllerConfirmGuard } from '../ui/controller-confirm-guard.mjs';
import { attachControllerNavigation } from '../ui/controller-navigation.mjs';
import { playgroundTabBoundary } from '../ui/playground-tab-boundary.mjs';
import { attachControllerReading } from '../ui/controller-reading.mjs';
import { readingInputPrompt } from '../ui/reading-input-prompt.mjs';
import { nextInputModality } from '../input-presentation.mjs';
import { onNativeInactive, exportJSONFile } from '../platform.mjs';
import { createCoopCommandBatch, COOP_INPUT_CAPABILITIES } from '../coop/input-policy.mjs';
import { createOperationStatus } from '../ui/operation-status.mjs';
import { createAudioMaster } from '../ui/audio-master.mjs';
import { createAudioPreferences } from '../audio-preferences.mjs';
import { attachEncounterDisplayControls } from '../ui/encounter-display-controls.mjs';
import { createDisplayPreferences } from '../display-preferences.mjs';
import { attachMenuStyleControls } from '../ui/menu-style-controls.mjs';
import { attachPreferenceRestoration } from '../ui/preference-restoration.mjs';
import { attachSettingsPanels, settingsTabOwnsKey } from '../ui/settings-panels.mjs';
import { createTeamContextualTeaching } from './team-contextual-teaching.mjs';
import {
  attachInstallOfflinePanel,
  guardInstallOfflineBlur,
  installOfflineOwnsElement,
} from '../ui/install-offline-panel.mjs';
import {
  createOfflineDownloadAccess,
  isOfflinePackageRequired,
} from '../offline-download-access.mjs';

import { createTeamArenaPreference } from './team-arena-preference.mjs';
import { createMissionLibrary } from '../mission-library/library.mjs';
import { librarySuccessor } from '../mission-library/continuous-next.mjs';
import { attachMissionLibraryChooser } from '../ui/mission-library-chooser.mjs';
import {
  createMissionLibrarySessionState,
  missionLibraryHref,
  readMissionLibraryHandoff,
  readMissionLibraryReturn,
  isMissionLibrarySourceJourney,
} from '../mission-library/handoff.mjs';
import {
  teamJourneyLibrarySource,
  teamArenaLibrarySource,
  TEAM_LIBRARY_JOURNEY_EDITION,
} from '../mission-library/team-source.mjs';
import { trackMissionLibraryOpening } from '../mission-library/opening-intent.mjs';
import { attachTeamLibraryPreview, paintTeamPicturePreview } from './team-library-preview.mjs';

import { teamReturnHref } from '../mode-return.mjs';
import { releaseExplorerHref } from '../release-explorer.mjs';

const $ = (id) => document.getElementById(id);
// This host is loaded through the direct-tool launcher after parsing. Bind its
// complete static setup here as well as in the classic startup adapter so live
// switching remains complete in embedded and test hosts with no DOMContentLoaded handoff.
if (typeof document.createTextNode === 'function') translateDOM(document);
attachLanguageControls(document);
$('coop-release-explorer').href = releaseExplorerHref(
  globalThis.location?.href ?? document.baseURI ?? 'http://localhost/game/couch/relay-rescue.html',
);
const unclaimedFocus = (element) =>
  !element || element === document.body || element === document.documentElement;
// Capture before attached() can hide a deliberately focused loader recovery link.
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
globalThis.RevealLineToolLaunch?.attached();
document.documentElement.dataset.toolState = 'loading';
const bootStatus = createOperationStatus($('coop-boot'));
const bootDisplay = bootStatus.begin({
  message: t('interface:preparingTheTeamArena'),
  stage: 'preparing',
});
const names = () => [t('interface:sunflower2'), t('interface:skyline2')];
const clock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function picturePreparationText({ stage, status }, destination = null) {
  // The owning catch publishes recovery after the operation has failed. Reader
  // messages can contain diagnostics and must never become live-region text.
  if (status === 'error' || stage === 'error') return null;
  // A forwarded reader stage is not the lease's authenticated ready status.
  if (status === 'ready')
    return destination
      ? localizedMessage('gameplay:team.pictureDestinationReady', { name: destination })
      : localizedMessage('interface:teamPictureReadyStartRemainsASeparateAction');
  const keys = destination
    ? {
        downloading: 'gameplay:team.pictureDestinationDownloading',
        verifying: 'gameplay:team.pictureDestinationChecking',
        preparing: 'gameplay:team.pictureDestinationPreparing',
      }
    : {
        downloading: 'gameplay:team.pictureDownloading',
        verifying: 'gameplay:team.pictureChecking',
        preparing: 'gameplay:team.picturePreparing',
      };
  return localizedMessage(keys[stage] || keys.preparing, { name: destination });
}

export function bootCoop({
  candidateJourney = null,
  candidateProgress = null,
  candidatePreferences = null,
  candidateCaptureTeaching = null,
  candidateDifficulty = 'standard',
  candidateNotice = '',
  candidateEditionLabel = '',
} = {}) {
  // Consume native setup intent before applying saved defaults. Only an actual
  // difficulty edit changes the global preference; opening its selector does not.
  const earlySelection = globalThis.RevealLineTeamEntry?.take();
  // Entry links select a code-owned destination, never a supplied URL or referrer.
  // Older/direct links and ambiguous contexts retain the existing Versus return.
  const entryParams = new URL(location.href).searchParams;
  const incomingLibraryMission = readMissionLibraryHandoff(entryParams);
  const libraryReturn = readMissionLibraryReturn(entryParams, {
    mode: 'team',
  });
  const libraryEdition = resolveJourneyRequest(entryParams, {
    mode: 'team',
  });
  const returns = entryParams.getAll('return');
  const fromSolo = libraryReturn
    ? libraryReturn.mode === 'solo'
    : returns.length === 1 && returns[0] === 'solo';
  let returnStorage;
  try {
    returnStorage = sessionStorage;
  } catch {
    /* Fixed title fallback remains available. */
  }
  const authoredReturn = libraryReturn
    ? {
        solo: `../?journey=${libraryReturn.journey}`,
        versus: `./?journey=${libraryReturn.journey}`,
        origin: libraryReturn.mode,
      }
    : authoredTeamReturn(location.href);
  // Keep the actual host selection across mode changes, including rejected or
  // legacy launch intents. An authored return or valid save token still wins.
  const legacyEntry = !candidateJourney;
  const defaultJourney = Boolean(candidateJourney) && !entryParams.has('journey');
  const dedicatedEntry = candidateJourney && entryParams.get('journey') === "coupa-all";
  const homeHref = dedicatedEntry ? '../?edition=coupa-all' : authoredReturn?.solo ?? (legacyEntry ? '../?journey=legacy' : '../');
  const versusHref = dedicatedEntry ? './?journey=coupa-all' : authoredReturn?.versus ?? (legacyEntry ? './?journey=legacy' : './');
  const catalogueParams = new URLSearchParams();
  if (candidateJourney) catalogueParams.set('journey', 'legacy');
  if (returns.length === 1 && ['solo', 'versus'].includes(returns[0]))
    catalogueParams.set('return', returns[0]);
  const catalogueHref = `relay-rescue.html${catalogueParams.size ? `?${catalogueParams}` : ''}`;
  $('coop-catalogue').setAttribute('href', catalogueHref);
  localizedText($('coop-catalogue'), () =>
    candidateJourney ? t('interface:legacyArenas') : t('interface:newJourney2'),
  );
  $('coop-more-catalogue').setAttribute('href', catalogueHref);
  localizedText($('coop-more-catalogue'), () =>
    candidateJourney ? t('interface:legacyArenas') : t('interface:newJourney2'),
  );
  const returnHref = () => {
    // Mission identity and source navigation are independent. A checked Solo
    // return ticket remains stronger than the finite edition-navigation hint.
    if (libraryReturn) {
      if (libraryReturn.mode === 'solo' && libraryReturn.journey === 'legacy') {
        const checked = teamReturnHref({ href: location.href, storage: returnStorage });
        if (checked.startsWith('../?mode-return=')) return checked;
      }
      return authoredReturn[libraryReturn.mode];
    }
    const invalidLibraryHint =
      incomingLibraryMission &&
      ['journey-return', 'return-token-v2', 'mode-return', 'mode-return-v2', 'practice'].some(
        (key) => entryParams.has(key),
      );
    const destination =
      authoredReturn?.[authoredReturn.origin] ??
      (invalidLibraryHint
        ? fromSolo
          ? '../'
          : './'
        : teamReturnHref({ href: location.href, storage: returnStorage }));
    return legacyEntry && ['../', './'].includes(destination)
      ? `${destination}?journey=legacy`
      : destination;
  };
  $('coop-home').setAttribute('href', homeHref);
  $('coop-versus').setAttribute('href', versusHref);
  $('coop-race').setAttribute('href', returnHref());
  localizedText($('coop-race'), () =>
    fromSolo ? t('interface:backToSolo') : t('interface:raceMode'),
  );
  $('coop-solo').setAttribute('href', fromSolo ? returnHref() : homeHref);
  const arenaPreference = createTeamArenaPreference({
    pack: COOP_STARTER_PACK,
    getStorage: () => localStorage,
    onWarning: (message) => {
      localizedText($('coop-selection-status'), () => message);
      $('coop-selection-status').hidden = !message;
    },
  });
  const contextualTeaching = createTeamContextualTeaching({
    getStorage: () => localStorage,
  });
  let lastBuiltInArena = arenaPreference.current();
  const audioMaster = createAudioMaster();
  const audioPreferences = createAudioPreferences({
    audioMaster,
    window,
    getStorage: () => localStorage,
    onWarning: (message) => {
      localizedText($('coop-audio-status'), () => message);
    },
  });
  const renderMasterPreferences = ({ muted, volume }) => {
    localizedText($('coop-audio'), () =>
      muted ? t('common:audio.unmute') : t('interface:muteSound'),
    );
    localizedText($('coop-quick-sound'), () =>
      muted ? t('interface:soundOff') : t('interface:soundOn'),
    );
    $('coop-quick-sound').setAttribute('aria-pressed', String(!muted));
    $('coop-master-volume').value = volume;
  };
  const stopMasterView = audioMaster.subscribe(renderMasterPreferences);
  const audioRestoration = attachPreferenceRestoration({
    window,
    getSnapshot: () => audioMaster.snapshot(),
    render: renderMasterPreferences,
  });
  const toggleSound = () => audioPreferences.setMuted(!audioMaster.snapshot().muted);
  $('coop-audio').onclick = toggleSound;
  $('coop-quick-sound').onclick = toggleSound;
  $('coop-master-volume').onchange = () =>
    audioPreferences.setVolume(Number($('coop-master-volume').value));
  const closeAudio = () => {
    musicPublished?.close();
    music?.dispose();
    $('coop-audio').onclick = null;
    $('coop-quick-sound').onclick = null;
    $('coop-master-volume').onchange = null;
    stopMasterView();
    audioRestoration.dispose();
    audioPreferences.dispose();
    audioMaster.dispose();
  };
  let prepareDisplayReveal,
    displayLayoutVersion = 0;
  const displayPreferences = createDisplayPreferences({
    window,
    matchMedia,
    getStorage: () => localStorage,
    onWarning: (message, key) => {
      localizedText($('coop-display-status'), () => (key ? t(key) : message));
    },
  });
  const renderDisplayPreferences = (state) => {
    document.body.dataset.textFace = state.textFace;
    document.body.dataset.textSize = state.textSize;
    document.body.dataset.effects = state.effectiveReducedEffects ? 'reduced' : 'full';
    $('coop-text-face').value = state.textFace;
    $('coop-text-size').value = state.textSize;
    $('coop-reduced').checked = state.reducedEffects;
    localizedText($('coop-system-reduction'), () =>
      state.effectiveReducedEffects && !state.reducedEffects
        ? t('interface:systemReducedMotionIsActiveYourSavedReducedEffectsChoice')
        : '',
    );
  };
  const stopDisplayView = displayPreferences.subscribe((state) => {
    const reveal = prepareDisplayReveal?.(++displayLayoutVersion);
    renderDisplayPreferences(state);
    reveal?.();
  });
  const encounterDisplay = attachEncounterDisplayControls({
    document,
    window,
    getStorage: () => localStorage,
    prefix: 'coop-',
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
    prefix: 'coop-',
  });
  $('coop-text-face').onchange = () =>
    displayPreferences.set({ textFace: $('coop-text-face').value });
  $('coop-text-size').onchange = () =>
    displayPreferences.set({ textSize: $('coop-text-size').value });
  const closeDisplay = () => {
    stopDisplayView();
    displayRestoration.dispose();
    displayPreferences.dispose();
    encounterDisplay.dispose();
    menuStyle.dispose();
  };
  const painter = createCoopPainter($('coop-canvas'));
  const presentationPage = mountPresentationPage({ document, window });
  presentationPage.bindPainter(painter);
  // The branded build retains the authored Coupa picture while omitting the
  // main game's optional presentation release. Candidate picture ownership
  // still needs a stable theme identity for its exact-attempt checks.
  const dedicatedCoupaTeamPresentation = Object.freeze({
    resolved: Object.freeze({
      theme: Object.freeze({ id: 'fpv', revision: 1 }),
      collection: null,
    }),
  });
  void presentationPage.ready.then((snapshot) => {
    if (!disposed && snapshot) menuStyle.setPresentation(snapshot);
  });
  const batch = createCoopCommandBatch();
  let loopStopped = false;
  let run = null,
    attemptLevel = null,
    attemptPack = null,
    accumulator = 0,
    last = null,
    framePads = [],
    frame = null,
    disposed = false,
    generation = 0,
    departure = null;
  const departureDialog = $('coop-discard-dialog');
  const settingsDialog = $('coop-options');
  const earnedDialog = $('coop-earned-picture');
  const earnedCanvas = $('coop-earned-picture-canvas');
  let earnedOwner = null;
  const teamStoryVideo = $('coop-victory-story-video');
  let teamStoryOwner = null;
  function releaseTeamStory() {
    const owner = teamStoryOwner;
    teamStoryOwner = null;
    try {
      teamStoryVideo.pause?.();
    } catch {}
    teamStoryVideo.removeAttribute?.('src');
    teamStoryVideo.hidden = true;
    if (owner?.url) URL.revokeObjectURL(owner.url);
    $('coop-victory-story').hidden = true;
  }
  function currentTeamStory() {
    if (run?.status !== 'won' || !acceptedPicture?.teamMedia) return null;
    return creatorTeamMediaForLevel(acceptedPicture.teamMedia, run.level.id).story;
  }
  async function playTeamStory() {
    const story = currentTeamStory();
    if (!story) return;
    if (
      !teamStoryOwner ||
      teamStoryOwner.run !== run ||
      teamStoryOwner.generation !== generation ||
      teamStoryOwner.story !== story
    ) {
      releaseTeamStory();
      const url = URL.createObjectURL(story.blob);
      teamStoryOwner = { run, generation, story, url };
      teamStoryVideo.src = url;
      teamStoryVideo.hidden = false;
      $('coop-victory-story').hidden = false;
    }
    const owner = teamStoryOwner;
    localizedText($('coop-victory-story-status'), () => t('interface:team.victoryStoryStarting'));
    try {
      teamStoryVideo.currentTime = story.descriptor.startSeconds;
      await teamStoryVideo.play();
      if (teamStoryOwner !== owner) return;
      localizedText($('coop-victory-story-play'), () => t('interface:team.replayVictoryStory'));
      localizedText($('coop-victory-story-status'), () => t('interface:team.victoryStoryPlaying'));
    } catch {
      if (teamStoryOwner === owner)
        localizedText($('coop-victory-story-status'), () =>
          t('interface:team.victoryStoryPlaybackRefused'),
        );
    }
  }
  function skipTeamStory(messageText = () => t('interface:team.victoryStorySkipped')) {
    const story = currentTeamStory();
    try {
      teamStoryVideo.pause?.();
      if (story) teamStoryVideo.currentTime = story.descriptor.startSeconds;
    } catch {}
    localizedText($('coop-victory-story-play'), () => t('interface:team.replayVictoryStory'));
    localizedText($('coop-victory-story-status'), messageText);
  }
  teamStoryVideo.ontimeupdate = () => {
    const owner = teamStoryOwner;
    if (!owner || teamStoryVideo.currentTime < owner.story.descriptor.endSeconds) return;
    skipTeamStory(() => t('interface:team.victoryStoryComplete'));
  };
  teamStoryVideo.onerror = () => skipTeamStory(() => t('interface:team.victoryStoryUnavailable'));
  $('coop-victory-story-play').onclick = () => void playTeamStory();
  $('coop-victory-story-skip').onclick = () => skipTeamStory();
  let music = null,
    musicPublished = null,
    musicSelection = null;
  let settingsOwner = null,
    settingsVisit = 0,
    settingsPanels = null;
  let acceptedPicture = null,
    pictureSelection = null,
    pictureOperation = null,
    pictureSequence = 0,
    nextOperation = null,
    startPermitted = true;
  let foundationMessage = null;
  let journeySkip = null;
  const journeyReactions = attachJourneyReactions({ prefix: 'coop-' });
  let candidatePresetIntent = 0;
  let candidatePreferenceRestoration = null;
  const foreground = () => !document.hidden && document.hasFocus?.() !== false;
  const gameplayTuning = createGameplayTuningController({ eventTarget: window });
  const gameplayPreferences = candidatePreferences ?? createJourneyPreferences({ window });
  const actorPreferences = createActorStylePreferences({
    window,
    getStorage: () => localStorage,
    onWarning: () => renderActorStyle(),
  });
  const earlyDifficulty = earlySelection?.difficulty;
  if (earlyDifficulty?.changed && ['gentle', 'standard', 'expert'].includes(earlyDifficulty.value))
    gameplayPreferences.choose(earlyDifficulty.value);
  if (candidatePreferences) candidateDifficulty = gameplayPreferences.snapshot().difficulty;
  const attemptTuning = new WeakMap();
  const normalGameplayIdentities = new WeakMap();
  if (!candidatePreferences) $('coop-difficulty').value = gameplayPreferences.snapshot().difficulty;
  const gameplayTuningPanel = mountGameplayTuning({
    root: $('coop-gameplay-tuning'),
    controller: gameplayTuning,
    getDifficulty: () =>
      attemptLevel?.journeyDifficulty ??
      (run ? gameplayPreferences.snapshot().difficulty : $('coop-difficulty').value),
  });
  let inactive = !foreground();
  let pack = COOP_STARTER_PACK;
  let packArtworkSource = null;
  let installedTeamStore = null,
    installedTeamStorageError = null;
  try {
    installedTeamStore = createInstalledTeamCampaignStore();
  } catch (error) {
    installedTeamStorageError = error;
  }
  let discovery = null,
    discoveryOperation = null,
    discoveryStarted = null,
    discoveryPreviewSequence = 0,
    localDiscoveryPack = null,
    localDiscoveryRevision = 0;
  let missionLibrary = null,
    libraryChooser = null,
    libraryOpening = null,
    libraryLaunch = null,
    libraryLocalOwner = null,
    libraryRemoteJourney = null,
    libraryRemotePending = null,
    libraryOtherModes = null,
    libraryOtherModesPending = null,
    libraryOtherModesVisit = 0,
    libraryOtherModesCheckedVisit = -1,
    libraryOtherModesOpening = null,
    libraryOtherModesLoad = null,
    libraryOtherModesLifetime = new AbortController(),
    libraryPreview = null,
    libraryReturnFocus = true;
  const libraryRuntimeRows = new WeakMap();
  const libraryOtherSources = new Map();
  const installedTeamSourceIds = new Set();
  const installedTeamProgress = new Map();
  const installedTeamAttempts = new WeakMap();
  let installedTeamRows = [],
    installedTeamEditions = new Map(),
    installedTeamGeneration = -1,
    installedTeamLoading = null;
  const librarySession = createMissionLibrarySessionState({
    mode: 'team',
  });
  const libraryVisit = crypto.randomUUID();
  const discoveryRows = (sourcePack, artworkSource, prefix, teamMedia = null) =>
    sourcePack.levels.map((level) =>
      Object.freeze({
        key: `${prefix}/${level.id}`,
        get title() {
          return contentText(level, 'name');
        },
        get packName() {
          return contentText(sourcePack, 'name');
        },
        get sourceLabel() {
          return sourcePack === COOP_STARTER_PACK
            ? t('interface:starterArena')
            : t('interface:localPackThisVisit');
        },
        get goal() {
          return coopGoalLabel(level);
        },
        levelId: level.id,
        level,
        pack: sourcePack,
        artworkSource,
        teamMedia,
      }),
    );
  const starterDiscoveryRows = discoveryRows(COOP_STARTER_PACK, null, 'starter');
  const candidateDiscoveryRows =
    candidateJourney?.rows.map((row) =>
      Object.freeze({
        key: row.key,
        get title() {
          return contentText(row.level, 'name');
        },
        get packName() {
          return contentText(row.pack, 'name');
        },
        get sourceLabel() {
          return defaultJourney
            ? t('interface:teamJourneyOriginalArtwork')
            : t('interface:team.candidateJourneySource', {
                state: row.background
                  ? t('interface:originalArtCandidate')
                  : t('interface:geometryTest'),
              });
        },
        get goal() {
          return coopGoalLabel(row.level);
        },
        levelId: row.level.id,
        level: row.level,
        pack: row.pack,
        artworkSource: null,
        journeyRow: row,
      }),
    ) ?? [];
  const currentDiscoveryRows = () => [
    ...candidateDiscoveryRows.filter(
      (row) =>
        row.journeyRow.difficulty ===
        (acceptedPicture?.journeyRow?.difficulty ??
          selectedCandidateRow()?.difficulty ??
          candidateDifficulty),
    ),
    ...starterDiscoveryRows,
    ...installedTeamRows,
    ...(localDiscoveryPack?.rows ?? []),
  ];
  const artworkImports = createCoopPresentationImport();
  let importRequest = 0;
  const packStatus = createOperationStatus($('coop-pack-status'), { isCurrent: () => !disposed });
  const packPicker = $('coop-pack-file').closest('details');
  let importDisplay = null,
    importOperation = null,
    importDraft = null,
    importAdopting = null;
  function importControls() {
    if (disposed) return;
    const finishing = artworkImports.pending();
    $('coop-pack-file').disabled = finishing;
    $('coop-pack-retry').disabled = finishing;
  }
  function cancelImport({ forget = false } = {}) {
    const operation = importOperation;
    // Invalidate before abort, status, or focus callbacks can reenter the host.
    importOperation = null;
    importDisplay = null;
    importRequest++;
    const artworkDraft = importDraft?.kind === 'artwork' ? importDraft : null;
    if (artworkDraft && (operation || forget)) {
      artworkImports.cancel();
      if (artworkDraft.selection !== pictureSelection) artworkDraft.selection?.lease.dispose();
      artworkDraft.pack = null;
      artworkDraft.artworkSource = null;
      artworkDraft.selection = null;
      artworkDraft.cancelledRequest = importRequest;
    }
    if (operation) {
      operation.controller.abort();
      operation.focus.finish(null, false);
      operation.display.finish({
        state: 'detached',
        message: artworkDraft
          ? artworkImports.pending()
            ? t('interface:finishingCancelledArtworkValidationTheSelectedPackIsUnchanged')
            : t('interface:artworkImportCancelledTheSelectedPackIsUnchangedRetryPack')
          : t('interface:stoppedWaitingTheSelectedPackIsUnchangedRetryPackWhen'),
      });
    }
    if (forget && importDraft) {
      const draft = importDraft;
      importDraft = null;
      if (draft.selection !== pictureSelection) draft.selection?.lease.dispose();
    }
    $('coop-pack-cancel').hidden = true;
    $('coop-pack-retry').hidden = !importDraft;
    $('coop-pack-file').value = '';
    importControls();
    if (operation) pictureUI();
  }
  let knockdowns = [null, null];
  const cueOverflowAttempts = new WeakSet();
  let cueOverflowRun = null,
    cueOverflowKey = '';
  function updateCueOverflow() {
    const active = !loopStopped && !!run && ['running', 'paused'].includes(run.status),
      overflow = active && hasCoopCueOverflow(painter.cueLayout),
      admitted = active && (overflow || cueOverflowAttempts.has(run)),
      rail = $('coop-cue-overflow'),
      action = $('coop-field-details'),
      section = $('coop-field-details-section');
    if (cueOverflowRun !== run) {
      cueOverflowRun = run;
      cueOverflowKey = '';
      localizedText($('coop-cue-announcement'), () => '');
    }
    if (!active && $('coop-cue-announcement').textContent)
      localizedText($('coop-cue-announcement'), () => '');
    if (overflow && !cueOverflowAttempts.has(run)) {
      cueOverflowAttempts.add(run);
      localizedText($('coop-cue-announcement'), () => t('interface:team.cueOverflowNotice'));
    }
    rail.hidden = !admitted || !running();
    action.hidden = !admitted;
    section.hidden = !admitted;
    const destination = admitted && run.status === 'paused' ? $('coop-pause-core') : rail;
    if (action.parentNode !== destination) destination.append(action);
    const entries = admitted ? coopCueOverflowEntries(run) : [],
      key = JSON.stringify(entries);
    if (key !== cueOverflowKey) {
      cueOverflowKey = key;
      $('coop-field-details-list').replaceChildren(
        ...entries.map((entry) => {
          const item = document.createElement('li');
          item.dataset.entity = entry.id;
          item.textContent = `${entry.name}: ${entry.state}`;
          return item;
        }),
      );
      $('coop-cue-summary').textContent = entries
        .slice(0, 2)
        .map((entry) => `${entry.name}: ${entry.state.split(' · ')[0]}`)
        .join(' · ');
    }
  }
  function openCueDetails() {
    if (
      disposed ||
      inactive ||
      !foreground() ||
      !run ||
      !['flight', 'coop-paused'].includes(scope()) ||
      !cueOverflowAttempts.has(run)
    )
      return;
    const attempt = run,
      epoch = generation;
    if (running()) pause({ focus: false });
    if (
      disposed ||
      run !== attempt ||
      generation !== epoch ||
      run.status !== 'paused' ||
      loopStopped
    )
      return;
    $('coop-help').open = true;
    updateCueOverflow();
    controllerConfirmGuard.requireNeutral();
    const region = $('coop-help-reading');
    region.scrollTop = 0;
    navigation.beginReading({
      region,
      origin: $('coop-field-details'),
      exit: $('coop-help-reading-done'),
      label: t('interface:fieldDetails'),
      getLabel: () => t('interface:fieldDetails'),
    });
    region.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
  $('coop-field-details').onclick = openCueDetails;
  const selectedLevel = () =>
    pack.levels.find((level) => level.id === $('coop-level').value) || pack.levels[0];
  const selectedConfiguration = () =>
    COOP_PLAYTEST_CONFIGURATIONS.find((item) => item.id === $('coop-experiment').value) ||
    COOP_PLAYTEST_CONFIGURATIONS[0];
  let menuHint = '',
    reading = null,
    readingModality = 'pointer';
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
    navigation.refreshReadingHint();
  }
  const touchQuery = matchMedia('(any-pointer: coarse)');
  const tools = $('coop-tools');
  const journeyPictures =
    candidateJourney && candidateProgress
      ? attachJourneyModePictures({
          document,
          button: $('coop-journey-pictures'),
          mode: 'team',
          editionId: candidateProgress.editionId,
          catalog: candidateJourney.catalog,
          profile: candidateProgress,
        })
      : null;
  const modeChoices = $('coop-mode-actions');
  mountModeChoices({
    root: modeChoices,
    current: 'team',
    actions: { solo: $('coop-solo'), versus: $('coop-versus') },
  });
  let assignedSlots = [null, null];
  let input;
  const touchPads = [...document.querySelectorAll('.race-pad')];
  function showTouch() {
    const mode = $('coop-touch').value;
    for (const pad of touchPads) {
      const player = Number(pad.dataset.player);
      const visible =
        running() &&
        (mode === 'on' ||
          (mode === 'auto' &&
            touchQuery.matches &&
            (assignedSlots[player] === null || !controllerSession.completeFlight(player))));
      if (!pad.hidden && !visible) input?.clearPhysical(player);
      pad.hidden = !visible;
      pad.closest('.control-card').dataset.touchVisible = String(visible);
    }
    const visible = touchPads.some((pad) => !pad.hidden);
    $('coop-controls').hidden = !visible;
    document.body.dataset.coopTouch = visible ? 'visible' : 'hidden';
  }
  function placeTools(paused) {
    const modeDestination = $(paused ? 'coop-pause-modes' : 'coop-lobby-modes');
    if (modeChoices.parentNode !== modeDestination) modeDestination.append(modeChoices);
    modeChoices.hidden = running();
    const destination = $(paused ? 'coop-pause-tools' : 'coop-lobby-tools');
    if (tools.parentNode !== destination) destination.append(tools);
    // A retained attempt cannot depart from inside Settings. Keep the journey
    // switch reachable on Pause/Results, then return it to native lobby Extras.
    const catalogueDestination = paused
      ? tools
      : $('coop-menu').classList.contains('native-landing')
        ? $('coop-settings-panel-extras')
        : tools;
    if ($('coop-catalogue').parentNode !== catalogueDestination)
      catalogueDestination.append($('coop-catalogue'));
    const pauseCore = $('coop-pause-core'),
      help = $('coop-help'),
      settings = $('coop-settings-open'),
      sound = $('coop-quick-sound'),
      pausedAttempt = paused && run?.status === 'paused';
    pauseCore.hidden = !pausedAttempt;
    if (pausedAttempt) {
      pauseCore.append(help);
      pauseCore.append(settings);
      pauseCore.append(sound);
      pauseCore.append($('coop-home-paused'));
    } else if (paused) {
      // Results still own these tools. The landing page is hidden while the
      // completed attempt is retained, so it cannot host their only entry.
      tools.append(help, settings, sound);
    } else {
      if ($('coop-menu').classList.contains('native-landing')) {
        $('coop-settings-panel-extras').append(help);
        const actions = $('coop-menu').querySelector('.native-menu-actions');
        actions.append(settings, sound);
      } else {
        tools.append(help, settings, sound);
      }
    }
    // Failed saves are operational recovery, so Pause and Results keep their
    // live actions visible. The lobby gives them a stable home under Data.
    const recoveryDestination = paused ? tools : $('coop-settings-panel-data');
    if (recoveryDestination)
      for (const id of ['coop-journey-save', 'coop-journey-preferences'])
        recoveryDestination.append($(id));
    tools.hidden = running();
    if (tools.hidden) {
      $('coop-help').open = false;
    }
    if (tools.hidden || paused) $('coop-more').open = false;
    showTouch();
  }
  function back() {
    if (installOfflinePanel?.isOpen()) {
      installOfflinePanel.close();
      return;
    }
    if (music?.root()) {
      music.back();
      return;
    }
    if (journeyPictures?.root()) {
      journeyPictures.close();
      return;
    }
    if (settingsDialog.open) {
      closeSettings();
      return;
    }
    if (earnedDialog.open) {
      closeEarnedPicture();
      return;
    }
    if (departure) {
      cancelDeparture();
      return;
    }
    if (discovery?.isOpen()) {
      discovery.back();
      return;
    }
    if (nextOperation) {
      cancelNext({ restore: true });
      return;
    }
    if (pictureOperation) {
      cancelPicture();
      return;
    }
    if (importDisplay) {
      stopWaiting();
      return;
    }
    const pauseCore = $('coop-pause-core'),
      details =
        document.activeElement?.closest('details') ||
        (!run
          ? $('coop-menu').querySelector('details[open]')
          : pauseCore.querySelector('details[open]') || tools.querySelector('details[open]'));
    if (
      details?.open &&
      (pauseCore.contains(details) ||
        tools.contains(details) ||
        (!run && $('coop-menu').contains(details)))
    ) {
      details.open = false;
      details.querySelector('summary')?.focus({ preventScroll: true });
    } else if (run?.status === 'paused') primary().focus({ preventScroll: true });
    else if (run) lobby();
    else $('coop-race').click();
  }
  const running = () => run?.status === 'running';
  const installOfflinePanel = $('coop-offline-main')
    ? attachInstallOfflinePanel({
        document,
        window,
        downloadsURL: new URL('../downloads.html', import.meta.url),
        onOpen: () => {
          if (running()) pause({ focus: false });
        },
        canActivate: () => !run,
        onStatus: (message) => {
          if ($('coop-offline-status')) $('coop-offline-status').textContent = message;
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
    onError: (error) => message(error.message),
  });
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) detachModeDownloads();
  });
  for (const id of ['coop-offline-main', 'coop-offline'])
    if ($(id)) $(id).onclick = () => installOfflinePanel?.open();
  const scope = () =>
    installOfflinePanel?.isOpen()
      ? 'coop-install-offline'
      : music?.root()
        ? 'coop-music-library'
        : journeyPictures?.root()
          ? 'coop-journey-pictures'
          : settingsDialog.open
            ? `coop-settings:${settingsPanels?.selected() || 'display'}`
            : earnedDialog.open
              ? 'coop-earned-picture'
              : departure
                ? 'coop-discard'
                : discovery?.isOpen()
                  ? 'coop-discovery'
                  : running()
                    ? 'flight'
                    : run
                      ? `coop-${run.status}`
                      : 'coop-lobby';
  const primary = () =>
    installOfflinePanel?.isOpen()
      ? $('install-offline-downloads')
      : music?.root()
        ? music.primary()
        : journeyPictures?.root()
          ? journeyPictures.primary()
          : settingsDialog.open
            ? settingsPanels?.primary() || $('coop-settings-close')
            : earnedDialog.open
              ? $('coop-picture-return')
              : departure
                ? $('coop-discard-stay')
                : discovery?.isOpen()
                  ? discovery.primary()
                  : nextOperation
                    ? $('coop-next-cancel')
                    : importOperation
                      ? $('coop-pack-cancel')
                      : pictureOperation
                        ? pictureOperation.passive
                          ? $('coop-optional-setup-toggle')
                          : $('coop-picture-cancel')
                        : !run && pictureSelection?.state !== 'ready'
                          ? $('coop-picture-retry')
                          : !run
                            ? $('coop-start')
                            : run.status === 'paused' && !loopStopped
                              ? $('coop-resume')
                              : run.status === 'won' && !loopStopped
                                ? teamDestination()?.next
                                  ? $('coop-next')
                                  : $('coop-discovery-paused')
                                : $('coop-retry');
  // Preference updates can reflow a focused select beyond the Settings scroller
  // without a window resize. Keep only that current action visible, never focus
  // it again or resume. Initial display application runs before this owner exists.
  prepareDisplayReveal = (revision) => {
    const target = document.activeElement,
      panel = settingsDialog,
      attempt = run,
      epoch = generation,
      owner = settingsOwner;
    const current = () =>
      !disposed &&
      foreground() &&
      run === attempt &&
      generation === epoch &&
      settingsOwner === owner &&
      displayLayoutVersion === revision &&
      !departure &&
      !panel.hidden &&
      panel.open &&
      panel.contains(target) &&
      document.activeElement === target;
    if (!current() || !visibleAction(target) || !current()) return null;
    return () => {
      if (!current() || !visibleAction(target) || !current()) return;
      const rect = target.getBoundingClientRect(),
        bounds = panel.getBoundingClientRect(),
        width = document.documentElement.clientWidth || window.innerWidth,
        height = document.documentElement.clientHeight || window.innerHeight,
        left = Math.max(0, bounds.left + panel.clientLeft) + 8,
        top = Math.max(0, bounds.top + panel.clientTop) + 8,
        right = Math.min(width, bounds.left + panel.clientLeft + panel.clientWidth) - 8,
        bottom = Math.min(height, bounds.top + panel.clientTop + panel.clientHeight) - 8;
      if (
        ![rect.left, rect.top, rect.right, rect.bottom, left, top, right, bottom].every(
          Number.isFinite,
        ) ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        right <= left ||
        bottom <= top ||
        (rect.left >= left && rect.right <= right && rect.top >= top && rect.bottom <= bottom)
      )
        return;
      // Layout/style reads can publish a newer action. Recheck ownership after
      // the last such read and leave its focus, scroll and game status alone.
      if (!current() || !visibleAction(target) || !current()) return;
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    };
  };
  const couchTouch = attachCouchTouch({
    controls: $('coop-touch').parentElement,
    clear: () => input?.clearPhysical(),
  });
  const controllerSession = createControllerSession({
    restoreKey: COUCH_RESTORE_KEY,
    onLoss: () => {
      pause();
      clear();
    },
  });
  const controllerSetup = mountControllerSetup({
    root: $('coop-settings-panel-controls'),
    session: controllerSession,
  });
  input = attachCouchInput({
    controllerSession,
    getTouchSettings: () => couchTouch.snapshot(),
    ...COOP_INPUT_CAPABILITIES,
    arena: $('coop-canvas'),
    active: running,
    continuousSteering: () => true,
    getGamepads: () => framePads,
    onPause: () => pause(),
    onPads: (count, slots) => {
      assignedSlots = slots;
      showTouch();
      const text = () =>
        t('interface:team.controllersConnected', {
          count,
          hint: menuHint ? ` · ${menuHint}` : '',
        });
      if ($('coop-pads').textContent !== text()) localizedText($('coop-pads'), text);
    },
  });
  const router = createControllerRouter({
    readPads: () => controllerSession.frame().menuPads,
    autoJoin: true,
    eventTarget: null,
  });
  const controllerConfirmGuard = attachControllerConfirmGuard({
    confirmPressed: () => router.menuConfirmPressed() || controllerSession.frame().confirmHeld,
  });
  const menuMasthead = $('coop-home').closest('.masthead');
  let compositeMenu = false;
  const navigation = attachControllerNavigation({
    onTabBoundary: () => playgroundTabBoundary({ window, suspend: () => suspend() }),
    getScope: scope,
    getRoot: () => {
      if (installOfflinePanel?.frameFocused()) return null;
      const modal =
        installOfflinePanel?.root() ||
        music?.root() ||
        journeyPictures?.root() ||
        (settingsDialog.open
          ? settingsDialog
          : earnedDialog.open
            ? earnedDialog
            : departure
              ? departureDialog
              : discovery?.isOpen()
                ? $('journey-chooser')
                : null);
      // Pause/results restore the visible masthead alongside the overlay.
      // Keep their common root while excluding gameplay and hidden lobby UI.
      compositeMenu = !modal && !!run;
      return modal || $('coop-app');
    },
    accept: (element) =>
      !element.closest('.race-pad') &&
      (!compositeMenu || $('coop-overlay').contains(element) || !!menuMasthead?.contains(element)),
    getDefaultFocus: primary,
    keyboard: true,
    ownsKeyboardEvent: (event) => !music?.root() && settingsTabOwnsKey(event, settingsDialog),
    nativeReadingScroll: true,
    getReadingPrompt: readingPrompt,
    onNativeInput: (event) => setReadingModality(nextInputModality(readingModality, event)),
    activateControl: (element) => controllerConfirmGuard.activate(element),
    onBack: back,
    onMenu: () => {
      if (
        installOfflinePanel?.isOpen() ||
        music?.root() ||
        journeyPictures?.root() ||
        settingsDialog.open ||
        earnedDialog.open ||
        departure ||
        discovery?.isOpen() ||
        nextOperation ||
        run?.status === 'paused'
      )
        back();
    },
    onHint: (message, context) => {
      if (
        context?.kind === 'reading' &&
        ['coop-help-reading', 'coop-data-reading'].includes(context.regionId)
      ) {
        menuHint = '';
        const hint = $(`${context.regionId}-hint`);
        if (hint.textContent !== message) localizedText(hint, () => message);
      } else menuHint = message;
    },
    onReadingChange: (state) => reading?.changed(state),
  });
  reading = attachControllerReading({
    getNavigation: () => navigation,
    getScope: scope,
    getReadingPrompt: readingPrompt,
    revealOnResize: true,
    surfaceDefinitions: [
      [
        'coop-help-reading',
        'coop-help-read',
        localizedMessage('interface:relayRescueControls'),
        'coop-help-unit',
      ],
      [
        'coop-data-reading',
        'coop-data-read',
        localizedMessage('interface:teamGameData'),
        'coop-data-unit',
      ],
    ],
  });
  let revealingMenuResize = false;
  function revealMenuAction(event) {
    if (revealingMenuResize || event.target !== window) return;
    revealingMenuResize = true;
    try {
      const target = document.activeElement,
        panel = $(run ? 'coop-overlay' : 'coop-menu'),
        attempt = run,
        epoch = generation,
        visit = settingsVisit;
      const current = () =>
        !disposed &&
        !inactive &&
        foreground() &&
        run === attempt &&
        (!attempt || run.status === 'paused') &&
        generation === epoch &&
        settingsVisit === visit &&
        !settingsDialog.open &&
        !earnedDialog.open &&
        !discovery?.isOpen() &&
        !departure &&
        !panel.hidden &&
        panel.contains(target) &&
        document.activeElement === target;
      // Resize owns no opener or future focus. The reading adapter owns its
      // separate text region; only the current lobby or paused action is considered here.
      if (
        !current() ||
        !target?.matches('button,a[href],select,input,textarea,summary') ||
        !visibleAction(target) ||
        !current()
      )
        return;
      const rect = target.getBoundingClientRect(),
        bounds = panel.getBoundingClientRect(),
        width = document.documentElement.clientWidth || window.innerWidth,
        height = document.documentElement.clientHeight || window.innerHeight,
        left = Math.max(0, bounds.left + panel.clientLeft) + 8,
        top = Math.max(0, bounds.top + panel.clientTop) + 8,
        right = Math.min(width, bounds.left + panel.clientLeft + panel.clientWidth) - 8,
        bottom = Math.min(height, bounds.top + panel.clientTop + panel.clientHeight) - 8;
      if (
        ![rect.left, rect.top, rect.right, rect.bottom, left, top, right, bottom].every(
          Number.isFinite,
        ) ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        right <= left ||
        bottom <= top ||
        (rect.left >= left && rect.right <= right && rect.top >= top && rect.bottom <= bottom)
      )
        return;
      // Reserve the focus ring inside the current menu's visible bounds. Recheck after the final
      // style read: a newer focus, dialog, attempt or lifecycle vetoes this reveal.
      if (!current() || !visibleAction(target) || !current()) return;
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    } finally {
      revealingMenuResize = false;
    }
  }
  window.addEventListener('resize', revealMenuAction);
  function clear() {
    controllerSession.clear();
    input.clear();
    batch.release();
    router.clear();
    navigation.clear();
    if (run) releaseCoopInputs(run);
    accumulator = 0;
  }
  const nativeMenu = prepareNativeMenus({
    document,
    mode: 'team',
    getSceneContext: () => ({
      themeId: acceptedPicture?.request?.themeId ?? 'fpv',
      active: !running(),
    }),
  });
  settingsPanels = attachSettingsPanels({
    root: settingsDialog,
    document,
    beforeSelect: () => clear(),
  });
  const settingsCurrent = (owner) =>
    !disposed &&
    settingsOwner === owner &&
    settingsVisit === owner.visit &&
    run === owner.run &&
    generation === owner.generation &&
    foreground();
  music = attachCouchMusicHost({
    document,
    root: $('coop-settings-panel-audio'),
    prefix: 'coop',
    quickAfter: ['coop-start', 'coop-resume'],
    canControl: () => !disposed && !inactive,
    getScene: () => (run ? 'gameplay' : 'menu'),
    audioMaster,
    audioPreferences,
    canOpen: () => !!settingsOwner && settingsDialog.open && settingsCurrent(settingsOwner),
    getOwner: () => settingsOwner,
    onOpen: () => clear(),
    onClose: () => clear(),
  });
  if (music) {
    musicPublished = attachPublishedAudio({
      sound: music.sound,
      ready: presentationPage.ready,
      getHost: () => presentationPage,
      cues: true,
      allowMusic: () =>
        !acceptedPicture?.artworkSource && (acceptedPicture?.request.themeId ?? 'fpv') === 'fpv',
    });
    musicPublished.setPlayer(music.player);
  }
  function acceptMusic(selection, { play = false } = {}) {
    if (!music || !selection || acceptedPicture !== selection || !run || loopStopped || disposed)
      return;
    if (musicSelection !== selection) {
      musicSelection = selection;
      if (selection.musicContext) music.setContext(selection.musicContext);
      else {
        music.contextPending(selection.request.themeId, selection.musicError || undefined);
        void selection.musicReady?.then((context) => {
          if (disposed || musicSelection !== selection || acceptedPicture !== selection) return;
          if (context) music.setContext(context);
          else
            music.contextPending(
              selection.request.themeId,
              selection.musicError ||
                t('interface:exactMissionMusicAssignmentsAreUnavailableGlobalAndThemePlaylists'),
            );
        });
      }
    }
    if (play) void music.start();
  }
  function openSettings({ difficulty = false } = {}) {
    cancelNext();
    const opener = $('coop-settings-open');
    if (
      disposed ||
      departure ||
      settingsDialog.open ||
      earnedDialog.open ||
      !foreground() ||
      !visibleAction(opener)
    )
      return;
    discovery?.close({ restore: false });
    const owner = { opener, run, generation, visit: ++settingsVisit, restore: true };
    settingsOwner = owner;
    // Lobby preparation stays owned by its existing operation; opening Settings
    // must not call pause(), which also cancels that preparation.
    if (running()) pause({ focus: false });
    else clear();
    if (!settingsCurrent(owner) || !visibleAction(opener)) {
      if (settingsOwner === owner) settingsOwner = null;
      return;
    }
    if (difficulty) {
      settingsPanels.select('coop-settings-tab-gameplay');
      settingsDialog.setAttribute(
        'data-settings-view',
        $('coop-difficulty').disabled ? 'categories' : 'panel',
      );
    }
    settingsDialog.showModal();
    const active = document.activeElement;
    if (
      settingsCurrent(owner) &&
      settingsDialog.open &&
      (unclaimedFocus(active) ||
        active === opener ||
        active === settingsDialog ||
        active === $('coop-settings-close'))
    ) {
      const target =
        difficulty && visibleAction($('coop-difficulty'))
          ? $('coop-difficulty')
          : settingsPanels.primary();
      if (visibleAction(target) && settingsCurrent(owner) && document.activeElement === active)
        target.focus({ preventScroll: true });
    }
  }
  function closeSettings({ restore = true } = {}) {
    if (!settingsDialog.open) return;
    if (settingsOwner) settingsOwner.restore = restore && foreground();
    settingsDialog.close();
  }
  const settingsClosed = () => {
    // A queued close from an earlier visit has no authority over a reopened one.
    if (settingsDialog.open) return;
    const owner = settingsOwner;
    if (!owner) return;
    const restore = owner.restore && settingsCurrent(owner);
    settingsOwner = null;
    const closedVisit = ++settingsVisit;
    const currentReturn = () =>
      !disposed &&
      !settingsDialog.open &&
      !settingsOwner &&
      settingsVisit === closedVisit &&
      run === owner.run &&
      generation === owner.generation &&
      foreground();
    navigation.clear();
    router.clear();
    discoveryControls();
    if (!restore || !currentReturn() || !visibleAction(owner.opener) || !currentReturn()) return;
    const active = document.activeElement;
    if (active !== owner.opener && (unclaimedFocus(active) || settingsDialog.contains(active)))
      owner.opener.focus({ preventScroll: true });
  };
  const cancelSettings = (event) => {
    event.preventDefault();
    closeSettings();
  };
  const settingsKeydown = (event) => {
    // Keep the native cancel default away from the window flight Escape hook.
    // Document capture still gives an active controller editor first refusal.
    if (event.key === 'Escape') event.stopPropagation();
  };
  $('coop-settings-open').onclick = openSettings;
  $('coop-settings-close').onclick = () => closeSettings();
  settingsDialog.addEventListener('cancel', cancelSettings);
  settingsDialog.addEventListener('close', settingsClosed);
  settingsDialog.addEventListener('keydown', settingsKeydown);
  const earnedCurrent = (owner) =>
    !disposed &&
    earnedOwner === owner &&
    run === owner.run &&
    generation === owner.generation &&
    acceptedPicture === owner.picture &&
    foreground();
  function openEarnedPicture() {
    cancelNext();
    const opener = $('coop-view-picture');
    if (
      disposed ||
      inactive ||
      !foreground() ||
      settingsDialog.open ||
      earnedDialog.open ||
      departure ||
      loopStopped ||
      run?.status !== 'won' ||
      !acceptedPicture?.binding?.image ||
      !visibleAction(opener)
    )
      return;
    discovery?.close({ restore: false });
    const owner = { run, generation, picture: acceptedPicture, opener, restore: true };
    earnedOwner = owner;
    try {
      // Borrow the exact accepted original; no decoder, lease or award is created.
      const context = earnedCanvas.getContext('2d');
      if (!context) throw new Error(t('interface:pictureCanvasUnavailable'));
      earnedCanvas.width = 1152;
      earnedCanvas.height = 576;
      context.imageSmoothingEnabled = false;
      context.drawImage(owner.picture.binding.image, 0, 0, 1152, 576);
      if (!earnedCurrent(owner)) return;
      localizedText($('coop-earned-picture-title'), () =>
        t('interface:team.sharedPictureTitle', {
          mission: contentText(attemptLevel || run.level, 'name'),
        }),
      );
      navigation.clear();
      router.clear();
      earnedDialog.showModal();
      const active = document.activeElement;
      if (
        earnedCurrent(owner) &&
        earnedDialog.open &&
        (unclaimedFocus(active) ||
          active === opener ||
          active === earnedDialog ||
          active === $('coop-picture-return'))
      )
        $('coop-picture-return').focus({ preventScroll: true });
    } catch {
      if (earnedOwner === owner) {
        earnedOwner = null;
        earnedCanvas.width = earnedCanvas.height = 0;
        message(localizedMessage('interface:pictureViewUnavailableYourEarnedResultIsUnchanged'));
      }
    }
  }
  function closeEarnedPicture({ restore = true } = {}) {
    if (!earnedDialog.open) return;
    if (earnedOwner) earnedOwner.restore = restore && foreground();
    earnedDialog.close();
  }
  const earnedClosed = () => {
    if (earnedDialog.open) return;
    const owner = earnedOwner;
    if (!owner) return;
    const restore = owner.restore && earnedCurrent(owner);
    earnedOwner = null;
    earnedCanvas.width = earnedCanvas.height = 0;
    navigation.clear();
    router.clear();
    const active = document.activeElement;
    if (
      restore &&
      !disposed &&
      !earnedDialog.open &&
      !earnedOwner &&
      run === owner.run &&
      generation === owner.generation &&
      foreground() &&
      visibleAction(owner.opener) &&
      (unclaimedFocus(active) || earnedDialog.contains(active))
    ) {
      owner.opener.focus({ preventScroll: true });
      if (document.activeElement === owner.opener)
        owner.opener.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  };
  const earnedCancelled = (event) => {
    event.preventDefault();
    closeEarnedPicture();
  };
  $('coop-view-picture').onclick = openEarnedPicture;
  $('coop-picture-return').onclick = () => closeEarnedPicture();
  earnedDialog.addEventListener('close', earnedClosed);
  earnedDialog.addEventListener('cancel', earnedCancelled);
  earnedDialog.addEventListener('keydown', settingsKeydown);
  function message(text, { foundationPlayers = [], coach = null } = {}) {
    foundationMessage = foundationPlayers.length
      ? {
          run,
          positions: foundationPlayers.map((id) => ({
            id,
            x: run.players[id].x,
            y: run.players[id].y,
          })),
        }
      : null;
    if (coach) $('coop-message').dataset.coach = coach;
    else delete $('coop-message').dataset.coach;
    localizedText($('coop-message'), typeof text === 'function' ? text : () => text);
  }
  function rescueMessage(event) {
    return () =>
      t('interface:team.playerNeedsRescue', {
        cause: coopFailureFeedback(run, event).cause,
        player: names()[event.player],
        alternative: run.config.advancedCooperation
          ? ' ' + t('interface:orCapture2NewTerritory')
          : '',
      });
  }
  function overlay({ focus = true } = {}) {
    const reactionRow = acceptedPicture?.journeyRow;
    journeyReactions.present({
      owned: !!candidateJourney?.owns(reactionRow),
      mode: 'team',
      outcome: run?.status,
      missionId: reactionRow?.mission?.id,
      feedback: candidateJourney?.owns(reactionRow) ? reactionRow.campaignFeedback : null,
    });
    const show = run && !running();
    $('coop-overlay').hidden = !show;
    placeTools(Boolean(show));
    $('coop-pause').disabled = !running();
    difficultyControls();
    const skipDestination = journeyNavigation();
    $('coop-journey-skip').hidden = !running() || !skipDestination?.next;
    $('coop-journey-skip-confirm').hidden =
      !['paused', 'lost'].includes(run?.status) || !skipDestination?.next || loopStopped;
    localizedText($('coop-journey-skip-confirm'), () =>
      journeySkip?.run === run && journeySkip.generation === generation
        ? t('interface:confirmSkip')
        : t('interface:skipMission'),
    );
    discoveryControls();
    if (!show) return;
    const won = run.status === 'won',
      lost = run.status === 'lost';
    const destination = won && !loopStopped ? teamDestination() : null;
    $('coop-next').hidden = !destination?.next && !destination?.error;
    localizedText($('coop-next'), () =>
      destination?.next
        ? resultContinuationLabel(t, {
            mission: contentText(destination.next, 'name'),
            campaign: destination.nextRow?.mission
              ? contentText(destination.nextRow.mission, 'campaignTitle')
              : '',
            crossesCampaign: destination.crossesCampaign === true,
          })
        : t('interface:nextArena'),
    );
    localizedText($('coop-lobby'), () =>
      lost ? t('interface:changeDifficulty') : t('interface:changeSetup'),
    );
    $('coop-resume').hidden = won || lost;
    $('coop-view-picture').hidden = !won || loopStopped || !acceptedPicture?.binding?.image;
    let story = null;
    try {
      story = won && !loopStopped ? currentTeamStory() : null;
    } catch {
      story = null;
    }
    if (
      !story ||
      (teamStoryOwner &&
        (teamStoryOwner.run !== run ||
          teamStoryOwner.generation !== generation ||
          teamStoryOwner.story !== story))
    )
      releaseTeamStory();
    $('coop-victory-story').hidden = !story;
    if (story) {
      localizedText($('coop-victory-story-description'), () => story.descriptor.description);
      if (!teamStoryOwner) {
        localizedText($('coop-victory-story-play'), () => t('interface:team.playVictoryStory'));
        localizedText($('coop-victory-story-status'), () =>
          t('interface:team.victoryStoryOptional'),
        );
      }
    }
    localizedText($('coop-overlay-kicker'), () =>
      won
        ? t('interface:aWorldYouRevealedTogether')
        : lost
          ? t('interface:oneMoreSharedPlan')
          : t('interface:paused3'),
    );
    localizedText($('coop-overlay-title'), () =>
      won
        ? t('interface:youBroughtItHome')
        : lost
          ? t('interface:yourNextRouteStartsHere')
          : t('interface:bothPlayersPaused'),
    );
    const completionCopy = destination?.libraryEnd
      ? t('interface:endOfTheTeamMissionLibraryBrowseTeamArenasOr')
      : destination?.journey
        ? t('interface:endOfTheTeamJourneyTestRouteBrowseAMission')
        : t('interface:endOfThisPackBrowseTeamArenasToChooseYour');
    localizedText($('coop-overlay-copy'), () =>
      won
        ? [
            t('interface:team.resultCoverage', {
              coverage: formatNumber(run.coverage * 100, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
              time: clock(run.time),
            }),
            t('interface:team.resultJointCuts', { count: formatNumber(run.team.jointCuts) }),
            t('interface:team.resultRescues', { count: formatNumber(run.team.rescues) }),
            t('interface:team.resultInterceptions', {
              count: formatNumber(run.team.interceptions),
            }),
            destination?.next
              ? t('interface:team.nextArenaResult', {
                  mission: contentText(destination.next, 'name'),
                })
              : destination?.error
                ? t('interface:theNextMissionIsUnavailableYourResultAndPictureAre')
                : destination?.final
                  ? completionCopy
                  : t('interface:browseTeamArenasOrRetryThisChallenge'),
          ].join(' ')
        : lost
          ? coopRetryFeedback(run, knockdowns.filter(Boolean))
          : t('interface:releaseYourControlsThenChooseResumeTogether'),
    );
    if (focus) primary().focus({ preventScroll: true });
  }
  function render() {
    if (!run) return;
    localizedText(
      $('coop-stage'),
      () =>
        `${attemptTuning.get(run)?.adminOverride ? '' + t('interface:adminPlaytest') + ' ' : ''}${contentText(attemptLevel || run.level, 'name').toUpperCase()}`,
    );
    const bonusView = coopBonusView(run),
      bonusLive = coopBonusLive(bonusView);
    localizedText($('coop-bonus-live'), () => coopBonusLive(bonusView));
    $('coop-bonus-live').hidden = !bonusLive;
    $('coop-bonus-details').hidden = !bonusView || run.status !== 'paused';
    localizedText(
      $('coop-bonus-detail-state'),
      () => coopBonusDetails(bonusView) || t('interface:noPickupOrEffectWindowActive'),
    );
    localizedText($('coop-bonus-help'), () => (bonusView ? teamBonusHelp() : ''));
    painter.paint(run, {
      reduced: displayPreferences.snapshot().effectiveReducedEffects,
      textFace: displayPreferences.snapshot().textFace,
      textSize: displayPreferences.snapshot().textSize,
      picture: acceptedPicture?.binding ?? null,
      actorAppearance: acceptedPicture?.actorAppearance ?? null,
      pictureLevel: attemptTuning.get(run)?.pictureLevel ?? run.level,
    });
    updateCueOverflow();
    const coverage = run.coverage * 100;
    localizedText(
      $('coop-coverage'),
      () => `${formatNumber(coverage, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
    );
    $('coop-coverage').dataset.target = run.level.goal.coverage
      ? ` / ${Math.round(run.level.goal.coverage * 100)}%`
      : '';
    $('coop-progress').value = coverage;
    localizedText($('coop-reserves'), () =>
      t('gameplay:team.reserves', { count: run.team.reserves }),
    );
    localizedText($('coop-clock'), () => clock(run.time));
    const strongholds = run.strongholds.filter((item) => run.level.goal.cores?.includes(item.id));
    const stronghold = strongholds.find((item) => !item.defeated);
    $('coop-objective').dataset.kind = stronghold ? 'stronghold' : 'coverage';
    localizedText($('coop-objective'), () => coopObjectiveLabel(run));
    const finished = run.status === 'won' || run.status === 'lost';
    const groundContext = coopGroundContext(run.level);
    for (const player of run.players) {
      localizedText($('coop-state-' + player.id), () =>
        finished
          ? run.status === 'won'
            ? t('interface:objectiveComplete')
            : t('interface:attemptEnded')
          : player.status === 'downed'
            ? run.team.reserves === 0
              ? t('interface:downFreeRescueAvailable')
              : t('gameplay:team.rescueSeconds', {
                  seconds: formatNumber(Math.max(0, Math.ceil(player.downedUntil - run.time))),
                })
            : player.cutting
              ? t('interface:lineExposed')
              : player.graceUntil > run.time
                ? t('gameplay:team.recoveryShield', { context: groundContext })
                : t('gameplay:team.onGround', { context: groundContext }),
      );
      localizedAttribute($('coop-state-' + player.id), 'data-compact', () =>
        finished
          ? run.status === 'won'
            ? t('interface:complete')
            : t('interface:ended')
          : player.status === 'downed'
            ? run.team.reserves === 0
              ? t('interface:freeRescue')
              : t('gameplay:team.rescueCompact', {
                  seconds: formatNumber(Math.max(0, Math.ceil(player.downedUntil - run.time))),
                })
            : player.cutting
              ? t('interface:exposed')
              : player.graceUntil > run.time
                ? t('interface:shielded')
                : groundContext === 'reclaimed'
                  ? t('interface:reclaimed')
                  : t('interface:safe'),
      );
      const recharge = Math.max(0, (player.support?.readyAt || 0) - run.time);
      const supportRole = () =>
        player.supportRole === 'interceptor'
          ? t('interface:interceptor')
          : player.supportRole === 'disruptor'
            ? t('interface:disruptor')
            : t('interface:support');
      $('coop-charge-' + player.id).dataset.supportRole = player.supportRole;
      $('coop-support-' + player.id).dataset.supportRole = player.supportRole;
      localizedText($('coop-charge-' + player.id), () =>
        finished
          ? t('interface:resultsReady')
          : player.status === 'downed'
            ? t('interface:crawlToYourPartner')
            : player.rescue
              ? t('interface:holdSupportRescuing')
              : recharge > 0
                ? t('gameplay:team.supportSeconds', {
                    role: supportRole(),
                    seconds: formatNumber(recharge, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }),
                  })
                : t('gameplay:team.supportReady', { role: supportRole() }),
      );
      localizedAttribute($('coop-charge-' + player.id), 'data-compact', () =>
        finished
          ? t('interface:results2')
          : player.status === 'downed'
            ? t('interface:crawlToAlly')
            : player.rescue
              ? t('interface:holdRescue')
              : recharge > 0
                ? t('gameplay:team.supportCompact', {
                    role: supportRole(),
                    seconds: formatNumber(recharge, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }),
                  })
                : t('gameplay:team.supportReady', { role: supportRole() }),
      );
      localizedText($('coop-support-' + player.id), () =>
        finished
          ? `${names()[player.id]}: ${run.status === 'won' ? t('interface:objectiveCompleteChooseAnotherArenaOrRetry') : t('interface:attemptEndedChooseRetryOrChangeSetup')}`
          : player.rescue
            ? t('gameplay:team.rescuing', {
                percent: formatNumber(
                  Math.min(100, Math.floor((run.time - player.rescue.startedAt) * 100)),
                ),
              })
            : player.status === 'downed'
              ? t('gameplay:team.crawl', { context: groundContext })
              : recharge > 0
                ? t('gameplay:team.supportRecharging', {
                    role: supportRole(),
                    seconds: formatNumber(recharge, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }),
                  })
                : player.supportRole === 'interceptor'
                  ? t('interface:interceptorReadyTapNearATravellingImpactHoldNearbyTo')
                  : player.supportRole === 'disruptor'
                    ? t('interface:disruptorReadyTapNearMovingEnemiesHoldNearbyToRescue')
                    : t('interface:supportReadyTapToCoverHoldNearbyToRescue'),
      );
    }
  }
  // This focus lifetime is local to one picture action. Native disabling may
  // move its opener to BODY; a later deliberate choice or loss of foreground
  // permanently vetoes the completion handoff.
  function pictureFocus(origin, initial = false, selectionCurrent = null) {
    let moved = inactive || !foreground(),
      retired = false,
      pending = null,
      handoff = null;
    const beforeScope = scope(),
      selection = pictureSelection,
      attempt = run,
      epoch = generation,
      visit = settingsVisit;
    const started =
      document.activeElement === origin &&
      (visibleAction(origin) || (initial && unclaimedFocus(origin)));
    const observe = (event) => {
      if (installOfflineOwnsElement(event.target)) return;
      if (
        !unclaimedFocus(event.target) &&
        event.target !== origin &&
        event.target !== pending &&
        event.target !== handoff
      )
        moved = true;
    };
    const lost = (event) => {
      if (installOfflineOwnsElement(event?.target)) return;
      moved = true;
    };
    const windowBlur = guardInstallOfflineBlur(lost);
    const hidden = () => {
      if (document.hidden) lost();
    };
    document.addEventListener('focusin', observe);
    document.addEventListener('pointerdown', lost, true);
    document.addEventListener('keydown', lost, true);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', windowBlur);
    window.addEventListener('pagehide', lost);
    const owns = () =>
      !retired &&
      !disposed &&
      !inactive &&
      started &&
      !moved &&
      foreground() &&
      (selectionCurrent ? selectionCurrent() : pictureSelection === selection) &&
      run === attempt &&
      generation === epoch &&
      settingsVisit === visit &&
      scope() === beforeScope &&
      (document.activeElement === origin ||
        document.activeElement === pending ||
        document.activeElement === handoff ||
        unclaimedFocus(document.activeElement));
    const close = () => {
      retired = true;
      document.removeEventListener('focusin', observe);
      document.removeEventListener('pointerdown', lost, true);
      document.removeEventListener('keydown', lost, true);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('blur', windowBlur);
      window.removeEventListener('pagehide', lost);
    };
    const direct = (target, remember = false) => {
      try {
        if (!owns() || !visibleAction(target) || !owns()) return;
        if (remember) pending = target;
        handoff = target;
        if (document.activeElement !== target) target.focus({ preventScroll: true });
        const focused = () => owns() && document.activeElement === target;
        if (!focused() || !visibleAction(target) || !focused()) return;
        const rect = target.getBoundingClientRect(),
          width = document.documentElement.clientWidth || window.innerWidth,
          height = document.documentElement.clientHeight || window.innerHeight;
        if (
          ![rect.left, rect.top, rect.right, rect.bottom, width, height].every(Number.isFinite) ||
          rect.width <= 0 ||
          rect.height <= 0 ||
          width <= 16 ||
          height <= 16 ||
          (rect.left >= 8 && rect.top >= 8 && rect.right <= width - 8 && rect.bottom <= height - 8)
        )
          return;
        if (!focused() || !visibleAction(target) || !focused()) return;
        target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      } catch {
        // A browser focus/reveal failure must not prevent the picture reader
        // from starting or strand its existing Cancel/Retry operation.
        close();
      } finally {
        handoff = null;
      }
    };
    return {
      current: owns,
      pending(target) {
        direct(target, true);
      },
      finish(target, current = true) {
        if (typeof target === 'function') {
          // Successful navigation retains its existing focus/scroll contract.
          const allowed = current && owns();
          close();
          if (allowed) target();
          return;
        }
        try {
          if (current) direct(target);
        } finally {
          close();
        }
      },
    };
  }
  function focusPreparedStart(selection, epoch) {
    const target = $('coop-start'),
      visit = settingsVisit,
      beforeScope = scope();
    if (!visibleAction(target)) return;
    target.focus({ preventScroll: true });
    const owns = () =>
      !disposed &&
      !inactive &&
      foreground() &&
      !run &&
      pictureSelection === selection &&
      generation === epoch &&
      settingsVisit === visit &&
      scope() === beforeScope &&
      document.activeElement === target &&
      visibleAction(target);
    const reveal = () => {
      if (!owns()) return;
      const rect = target.getBoundingClientRect(),
        width = document.documentElement.clientWidth || window.innerWidth,
        height = document.documentElement.clientHeight || window.innerHeight;
      if (
        ![rect.left, rect.top, rect.right, rect.bottom, width, height].every(Number.isFinite) ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        width <= 16 ||
        height <= 16 ||
        (rect.left >= 8 && rect.top >= 8 && rect.right <= width - 8 && rect.bottom <= height - 8)
      )
        return;
      if (owns())
        target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    };
    setTimeout(reveal, 0);
  }
  let previewBinding = null,
    previewState = 'preparing',
    pictureMessage = '';
  function clearPicturePreview() {
    previewBinding = null;
    const canvas = $('coop-preview-canvas');
    canvas.hidden = true;
    // Reset pixels without obtaining a second image or releasing the shared lease.
    // Preview failure must not interrupt the original lease's terminal cleanup.
    try {
      canvas.width = 576;
      return true;
    } catch {
      return false;
    }
  }
  function picturePreview({ retry = false } = {}) {
    if (run) return;
    const selection = pictureSelection,
      binding = selection?.state === 'ready' ? selection.binding : null,
      canvas = $('coop-preview-canvas'),
      message = $('coop-preview-message'),
      level = selection?.pack.levels.find((level) => level.id === selection.levelId),
      name = contentText(level, 'name');
    localizedText($('coop-preview-caption'), () =>
      level?.journeyDifficulty && !selection.artworkSource && !selection.journeyRow?.background
        ? t('gameplay:team.previewGeometry', { name: contentText(level, 'name') })
        : name
          ? t('gameplay:team.previewTeaser', { name: contentText(level, 'name') })
          : t('gameplay:team.previewUnnamed'),
    );
    if (binding && previewBinding === binding && !retry) return;
    const cleared = clearPicturePreview();
    message.hidden = false;
    if (binding) {
      previewBinding = binding;
      try {
        if (!cleared) throw new Error(t('interface:previewCanvasUnavailable'));
        const context = canvas.getContext('2d');
        if (!context) throw new Error(t('interface:previewCanvasUnavailable'));
        if (
          !paintTeamPicturePreview(context, binding.image, canvas.width, canvas.height, {
            isCurrent: () =>
              !disposed && !run && pictureSelection === selection && selection.binding === binding,
          })
        )
          return;
        canvas.hidden = false;
        message.hidden = true;
        previewState = 'ready';
      } catch {
        previewState = 'unavailable';
        localizedText(message, () => t('interface:artworkPreviewUnavailable'));
      }
    } else {
      previewState = selection?.state ?? 'empty';
      if (previewState === 'ready') previewState = 'procedural';
      localizedText(message, () =>
        previewState === 'procedural'
          ? t('interface:proceduralArenaNoPicturePreview')
          : previewState === 'preparing'
            ? t('interface:preparingArtwork')
            : t('interface:noArtworkReady'),
      );
    }
    $('coop-picture-preview').dataset.state = previewState;
  }
  function pictureUI(messageText) {
    picturePreview();
    const busy = Boolean(pictureOperation),
      ready = pictureSelection?.state === 'ready',
      retryPreview = !run && ready && previewState === 'unavailable';
    $('coop-start').disabled =
      !startPermitted || !ready || busy || Boolean(importOperation || importAdopting);
    $('coop-picture-cancel').hidden = !busy;
    $('coop-picture-retry').hidden = busy || (ready && !retryPreview);
    localizedText($('coop-picture-retry'), () =>
      retryPreview
        ? t('common:preview.retry')
        : pictureSelection?.downloadRequired
          ? t('interface:downloadPlay')
          : t('interface:retryPicture2'),
    );
    $('coop-picture-status').dataset.state = busy
      ? 'preparing'
      : (pictureSelection?.state ?? 'cancelled');
    if (messageText) pictureMessage = messageText;
    localizedText($('coop-picture-status'), () =>
      retryPreview
        ? t('gameplay:team.previewUnavailableAfterReady', {
            message: renderMessage(pictureMessage),
          })
        : pictureMessage,
    );
    discoveryControls();
  }
  function retirePicture() {
    const operation = pictureOperation;
    pictureOperation = null;
    operation?.controller.abort();
    operation?.focus.finish(null, false);
    if (pictureSelection && pictureSelection !== acceptedPicture) pictureSelection.lease?.dispose();
    pictureSelection = null;
    clearPicturePreview();
  }
  function cancelPicture({ restore = true } = {}) {
    const operation = pictureOperation;
    if (!operation) return;
    // Explicit Cancel creates fresh focus intent, including after prior Tab.
    const focus = restore ? pictureFocus(document.activeElement) : null;
    pictureOperation = null;
    operation.controller.abort();
    operation.focus.finish(null, false);
    if (!operation.retention) pictureSelection.state = 'cancelled';
    pictureUI(
      localizedMessage(
        operation.retention
          ? 'interface:teamPictureReadyStartRemainsASeparateAction'
          : 'interface:pictureLoadingCancelledRetryPictureWhenYouAreReady',
      ),
    );
    focus?.finish(operation.retention ? $('coop-start') : $('coop-picture-retry'));
  }
  function newPictureSelection(
    recipe,
    sourcePack,
    pinnedPack = sourcePack,
    artworkSource = null,
    installedEditionId = null,
    teamMedia = null,
  ) {
    // Only code-owned exact recipes join this route. An imported pack with the
    // same IDs (or even the same bytes) keeps its independent local ordering.
    const journeyRow =
      candidateJourney?.rows.find(
        (row) =>
          row.pack === sourcePack &&
          row.difficulty === recipe.options.difficulty &&
          JSON.stringify(row.level) === JSON.stringify(recipe.level),
      ) ?? null;
    const selection = {
      sourcePack,
      journeyRow,
      artworkSource,
      installedEditionId,
      teamMedia,
      pack: structuredClone(pinnedPack),
      levelId: recipe.level.id,
      request: {
        pack: structuredClone(pinnedPack),
        levelId: recipe.level.id,
        themeId: artworkSource?.receipt.theme.id ?? 'fpv',
        attemptId: `team-${++pictureSequence}`,
        ...(artworkSource ? { artworkSource } : {}),
      },
      lease: teamMedia
        ? createCreatorTeamMediaPictureLease(teamMedia, { decodeImage: decodeCoopPicture })
        : journeyRow?.background && !artworkSource
          ? createCandidateTeamPictures({
              row: journeyRow,
              owns: candidateJourney.owns,
              getSnapshot: () => dedicatedCoupaTeamPresentation,
            })
          : createCoopPresentation({
              bindings: COOP_SUPPORTED_PICTURE_BINDINGS,
              historicalImportPolicy: COOP_HISTORICAL_IMPORT_PICTURE_POLICIES,
              getSnapshot: presentationPage.current,
              readPicture: presentationPage.readPicture,
              decodeImage: decodeCoopPicture,
            }),
      binding: null,
      actorAppearance: null,
      downloadRequired: false,
      state: 'new',
    };
    // Ownership, not matching IDs/bytes, authorizes this cosmetic overlay.
    // Imported packs and artwork bundles retain their original presentation.
    const eligible = !artworkSource && sourcePack === COOP_STARTER_PACK;
    if (eligible) {
      const pictures = selection.lease,
        style = actorPreferences.snapshot().actorStyle;
      let actors = null,
        pending = null,
        visit = 0,
        closed = false;
      selection.lease = Object.freeze({
        async select(request) {
          if (closed) throw new Error(t('interface:teamAppearanceSelectionIsDisposed'));
          pending?.abort();
          const controller = new AbortController(),
            ticket = ++visit,
            cancel = () => controller.abort();
          pending = controller;
          request.signal?.addEventListener('abort', cancel, { once: true });
          if (request.signal?.aborted) cancel();
          const check = () => {
            if (closed || ticket !== visit || controller.signal.aborted)
              throw new DOMException(
                t('interface:teamAppearancePreparationCancelled'),
                'AbortError',
              );
          };
          let staged = null;
          try {
            check();
            const binding = await pictures.select({
              ...request,
              signal: controller.signal,
              onStatus: (status) => {
                if (
                  !closed &&
                  ticket === visit &&
                  !controller.signal.aborted &&
                  status.status !== 'ready'
                )
                  request.onStatus?.(status);
              },
            });
            check();
            if (!actors) {
              const content = await prepareTeamVisualThemeContext(
                {
                  pack: selection.pack,
                  level: selection.pack.levels.find((level) => level.id === selection.levelId),
                  association: {
                    editionId: 'actor-style-v1',
                    contentThemeId: selection.request.themeId,
                    mode: 'team',
                  },
                },
                { signal: controller.signal },
              );
              check();
              staged = await prepareActorAppearanceLease(
                { style, content, scope: 'team-pack' },
                {
                  baseURL: new URL('../presentation/compiled/', location.href),
                  signal: controller.signal,
                  currentManifestSha256: presentationPage.current()?.manifestSha256 ?? null,
                },
              );
              check();
              actors = staged;
              staged = null;
              selection.actorAppearance = Object.freeze({ style, snapshot: actors.snapshot });
            }
            request.onStatus?.({ stage: 'ready', status: 'ready' });
            check();
            return binding;
          } finally {
            staged?.release();
            request.signal?.removeEventListener('abort', cancel);
            if (pending === controller) pending = null;
          }
        },
        confirm(request) {
          if (closed || pending || !actors)
            throw new Error(t('interface:theExactTeamActorsAreNotReadyRetryPreparation'));
          actors.pin();
          return pictures.confirm(request);
        },
        dispose() {
          if (closed) return;
          closed = true;
          visit++;
          pending?.abort();
          pending = null;
          actors?.release();
          actors = null;
          selection.actorAppearance = null;
          pictures.dispose();
        },
      });
    }
    if (music) {
      const level = structuredClone(recipe.level);
      selection.musicReady = Promise.resolve()
        .then(() =>
          prepareTeamMusicContext({
            pack: selection.pack,
            level,
            themeId: selection.request.themeId,
          }),
        )
        .then(
          (context) => {
            selection.musicContext = context;
            return context;
          },
          (error) => {
            selection.musicError = localizedMessage('interface:team.musicAssignmentsUnavailable', {
              error: error.message,
            });
            return null;
          },
        );
    }
    return selection;
  }
  const retainedTeamSelections = new WeakSet();
  async function ensureTeamPicturePackage(
    selection,
    { signal, prompt = true, retain = false } = {},
  ) {
    if (
      selection.journeyRow &&
      !selection.artworkSource &&
      candidateJourney?.owns(selection.journeyRow)
    ) {
      await gameplayDownloads.ensureMission(
        { routeId: libraryEdition, missionId: selection.journeyRow.mission.levelId, mode: 'team' },
        { signal, prompt, retain },
      );
    } else if (retain) await gameplayDownloads.ensure('runtime:team', { signal, prompt, retain });
    signal?.throwIfAborted();
    if (retain) retainedTeamSelections.add(selection);
  }
  function preparePicture({
    retry = false,
    origin = document.activeElement,
    initial = false,
    passive = false,
    onPrepared = null,
  } = {}) {
    if (disposed || departure || importDisplay || running()) return Promise.resolve();
    if (importAdopting) {
      // A synchronous setup callback can reset the pack while adoption unwinds.
      // Do not prepare against its tentative owner; keep only the newer intent.
      const request = importRequest,
        selectedPack = pack,
        levelId = $('coop-level').value;
      return Promise.resolve().then(() => {
        if (request !== importRequest || pack !== selectedPack || $('coop-level').value !== levelId)
          return;
        return preparePicture({ retry, origin, initial, passive });
      });
    }
    if (!retry || !pictureSelection) {
      retirePicture();
      const sourcePack = run ? (acceptedPicture?.journeyRow?.pack ?? attemptPack) : pack;
      pictureSelection = newPictureSelection(
        currentRecipe(),
        sourcePack,
        sourcePack,
        run ? (acceptedPicture?.artworkSource ?? null) : packArtworkSource,
        run
          ? (acceptedPicture?.installedEditionId ?? null)
          : localDiscoveryPack?.pack === pack
            ? (localDiscoveryPack.installedEditionId ?? null)
            : null,
      );
    }
    const selection = pictureSelection;
    if (pictureOperation) return pictureOperation.promise;
    const passivePreparation = passive || document.documentElement.dataset.toolState !== 'ready',
      focus = pictureFocus(origin, initial || passivePreparation),
      controller = new AbortController();
    const operation = {
      selection,
      controller,
      focus,
      run,
      generation,
      passive: passivePreparation,
    };
    pictureOperation = operation;
    selection.state = 'preparing';
    const current = () =>
      !disposed &&
      pictureOperation === operation &&
      pictureSelection === selection &&
      !controller.signal.aborted &&
      run === operation.run &&
      generation === operation.generation;
    pictureUI(localizedMessage('interface:preparingTheExactTeamPicture'));
    // Initial preparation is passive: do not turn the first controller Confirm
    // into Cancel. Deliberate selector/retry work still exposes and focuses its
    // owned cancellation action.
    if (!passivePreparation && origin !== $('coop-start')) focus.pending($('coop-picture-cancel'));
    operation.promise = (async () => {
      try {
        const snapshot = await (retry ? presentationPage.retry() : presentationPage.ready);
        // The original ready observer already handles first load. A recovered
        // shared page also updates global appearance, even after picture Cancel.
        if (retry && !disposed && snapshot && snapshot === presentationPage.current())
          menuStyle.setPresentation(snapshot);
        if (!current()) return;
        await ensureTeamPicturePackage(selection, {
          signal: controller.signal,
          prompt: !passivePreparation,
        });
        if (!current()) return;
        const binding = await selection.lease.select({
          ...selection.request,
          signal: controller.signal,
          onStatus: (status) => {
            if (!current()) return;
            const text = picturePreparationText(status);
            if (text) pictureUI(text);
          },
        });
        if (!current()) return;
        selection.binding = binding;
        selection.downloadRequired = false;
        selection.state = 'ready';
        pictureOperation = null;
        if (onPrepared?.(selection, focus) === true) {
          focus.finish(null, false);
          return;
        }
        pictureUI(localizedMessage('interface:teamPictureReadyStartRemainsASeparateAction'));
        focus.finish(
          run
            ? $('coop-retry')
            : () => {
                if (visibleAction($('coop-start'))) focusPreparedStart(selection, generation);
                else {
                  const fallback = $('coop-app').querySelector('a[href]');
                  if (visibleAction(fallback)) fallback.focus({ preventScroll: true });
                  else navigation.focusAvailable();
                }
              },
        );
      } catch (error) {
        if (!current()) return;
        try {
          console.error(t('interface:teamPicturePreparationFailed'), error);
        } catch {}
        if (!current()) return;
        selection.downloadRequired =
          isOfflinePackageRequired(error) ||
          (error?.name === 'AbortError' && selection.downloadRequired);
        selection.state = 'error';
        pictureOperation = null;
        pictureUI(
          localizedMessage('interface:teamPictureUnavailableRetryPictureOrChooseAnotherArena'),
        );
        focus.finish($('coop-picture-retry'));
      } finally {
        focus.finish(null, false);
      }
    })();
    return operation.promise;
  }
  $('coop-picture-cancel').onclick = () => cancelPicture();
  $('coop-picture-retry').onclick = () => {
    if (!run && pictureSelection?.state === 'ready' && previewState === 'unavailable') {
      const focus = pictureFocus($('coop-picture-retry'));
      picturePreview({ retry: true });
      pictureUI();
      focus.finish(
        previewState === 'ready' ? () => navigation.focusAvailable() : $('coop-picture-retry'),
      );
      return;
    }
    if (!pictureSelection?.downloadRequired) return preparePicture({ retry: true });
    const selection = pictureSelection,
      attempt = run,
      epoch = generation,
      recipe = currentRecipe();
    return preparePicture({
      retry: true,
      onPrepared(prepared, actionFocus) {
        if (
          prepared !== selection ||
          run !== attempt ||
          generation !== epoch ||
          pictureSelection !== selection ||
          disposed ||
          inactive ||
          !foreground() ||
          !actionFocus?.current()
        )
          return false;
        // The package panel returns to the temporary Cancel control. Publish
        // readiness and transfer this same admitted action to Start before the
        // retention gate; hiding a focused Cancel must not strand the launch.
        pictureUI(localizedMessage('interface:teamPictureReadyStartRemainsASeparateAction'));
        actionFocus.pending($('coop-start'));
        if (document.activeElement !== $('coop-start')) return false;
        start(recipe);
        return true;
      },
    });
  };
  // Follow the accepted content snapshot. Imports retain their own order and
  // recipes even when IDs match built-ins or a source catalogue later changes.
  function journeyNavigation() {
    if (
      acceptedPicture?.state !== 'ready' ||
      acceptedPicture.pack !== attemptPack ||
      acceptedPicture.levelId !== attemptLevel?.id ||
      !candidateJourney?.owns(acceptedPicture.journeyRow)
    )
      return null;
    const row = acceptedPicture.journeyRow;
    if (JSON.stringify(row.level) !== JSON.stringify(attemptLevel)) return null;
    const destination = candidateJourney.destination(row);
    return {
      ...destination,
      journey: true,
      row,
      nextRow: destination.next,
      next: destination.next?.level ?? null,
    };
  }
  function teamDestination() {
    if (
      run?.status !== 'won' ||
      acceptedPicture?.state !== 'ready' ||
      acceptedPicture.pack !== attemptPack ||
      acceptedPicture.levelId !== attemptLevel?.id
    )
      return null;
    const authored = candidateJourney?.owns(acceptedPicture.journeyRow)
      ? journeyNavigation()
      : coopPackDestination(attemptPack, attemptLevel);
    if (
      authored?.next ||
      !authored?.final ||
      (candidateJourney && libraryEdition !== TEAM_LIBRARY_JOURNEY_EDITION) ||
      entryParams.has('practice')
    )
      return authored;
    try {
      const library = getTeamLibrary();
      const matches = library.forMode('team').filter((mission) => {
        const row = libraryRuntimeRows.get(mission)?.();
        return (
          row?.pack === acceptedPicture.sourcePack &&
          row.levelId === acceptedPicture.levelId &&
          JSON.stringify(row.level) === JSON.stringify(attemptLevel)
        );
      });
      if (matches.length !== 1)
        throw new Error(t('interface:theCompletedTeamMissionNoLongerHasOneExactLibrary'));
      const next = librarySuccessor(library, matches[0], 'team');
      if (!next) return { ...authored, libraryEnd: true };
      const row = libraryRuntimeRows.get(next)?.();
      if (!row || !currentDiscoveryRows().includes(row))
        throw new Error(t('interface:theNextExactTeamMissionIsUnavailableInThisEdition'));
      if (library.availability(next, 'team').state !== 'ready')
        throw new Error(t('interface:theNextExactTeamMissionIsNotReady'));
      return { next: row.level, nextDiscoveryRow: row, final: false };
    } catch (error) {
      return { next: null, final: false, error };
    }
  }
  function nextStatus(text) {
    const owner = nextOperation,
      attempt = run,
      epoch = generation;
    const current = () =>
      !disposed && nextOperation === owner && run === attempt && generation === epoch;
    if (!current()) return;
    localizedText($('coop-next-status'), () => text);
    if (!current()) return;
    $('coop-next-status').hidden = !text;
    if (!current()) return;
    $('coop-next-cancel').hidden = !owner;
    if (current()) $('coop-next').setAttribute('aria-busy', String(Boolean(owner)));
  }
  function cancelNext({ restore = false, announce = true } = {}) {
    const operation = nextOperation;
    if (!operation) return;
    // Invalidate before abort/release/native-focus callbacks can reenter.
    nextOperation = null;
    operation.detach();
    try {
      if (announce && !disposed)
        nextStatus(
          operation.skipped
            ? t('interface:skipCancelledYourAttemptAndPictureAreStillHere')
            : t('interface:nextArenaCancelledYourResultAndPictureAreStillHere'),
        );
    } finally {
      operation.controller.abort();
      operation.selection.lease?.dispose();
    }
    if (
      disposed ||
      !announce ||
      nextOperation ||
      run !== operation.run ||
      generation !== operation.generation ||
      acceptedPicture !== operation.picture ||
      settingsVisit !== operation.settingsVisit ||
      settingsDialog.open ||
      earnedDialog.open ||
      departure
    )
      return;
    if (restore && run === operation.run && generation === operation.generation && foreground())
      operation.action.focus({ preventScroll: true });
  }
  async function nextArena({ skipRow = null } = {}) {
    const navigation = skipRow ? journeyNavigation() : teamDestination(),
      destination = navigation?.next;
    if (navigation?.error) {
      nextStatus(t('interface:theNextMissionIsUnavailableYourResultAndPictureAre'));
      return;
    }
    if (
      !destination ||
      disposed ||
      inactive ||
      !foreground() ||
      loopStopped ||
      nextOperation ||
      discovery?.isOpen() ||
      settingsDialog.open ||
      earnedDialog.open ||
      departure ||
      (skipRow && (navigation.row !== skipRow || !['paused', 'lost'].includes(run?.status)))
    )
      return;
    const recipe = freshRecipe(structuredClone(destination), currentRecipe().options);
    const nextDiscoveryRow = navigation.nextDiscoveryRow;
    const nextPack = nextDiscoveryRow?.pack ?? navigation.nextRow?.pack;
    const selection = newPictureSelection(
      recipe,
      nextPack ?? acceptedPicture.sourcePack,
      nextPack ?? attemptPack,
      nextDiscoveryRow
        ? nextDiscoveryRow.artworkSource
        : navigation.nextRow
          ? null
          : acceptedPicture.artworkSource,
      nextDiscoveryRow?.installedEditionId ?? acceptedPicture.installedEditionId ?? null,
    );
    const rememberBuiltIn = selection.sourcePack === COOP_STARTER_PACK;
    const operation = {
      run,
      generation,
      picture: acceptedPicture,
      pack: attemptPack,
      settingsVisit,
      selection,
      skipped: skipRow,
      action: $(skipRow ? 'coop-journey-skip-confirm' : 'coop-next'),
      status: run.status,
      controller: new AbortController(),
      detach: () => {},
    };
    const current = () =>
      nextOperation === operation &&
      !disposed &&
      !inactive &&
      foreground() &&
      run === operation.run &&
      generation === operation.generation &&
      acceptedPicture === operation.picture &&
      attemptPack === operation.pack &&
      run.status === operation.status &&
      !loopStopped &&
      !settingsDialog.open &&
      !earnedDialog.open &&
      !departure &&
      !operation.controller.signal.aborted;
    let rolledBack = false,
      adoptedGeneration = null;
    const adopted = (candidate) =>
      !disposed &&
      run === candidate &&
      generation === adoptedGeneration &&
      acceptedPicture === selection &&
      settingsVisit === operation.settingsVisit &&
      running() &&
      !inactive &&
      foreground() &&
      !settingsDialog.open &&
      !earnedDialog.open &&
      !departure;
    nextOperation = operation;
    const focusChanged = (event) => {
      if (installOfflineOwnsElement(event.target)) return;
      if (event.target !== operation.action && event.target !== $('coop-next-cancel')) cancelNext();
    };
    document.addEventListener('focusin', focusChanged);
    operation.detach = () => document.removeEventListener('focusin', focusChanged);
    try {
      nextStatus(() =>
        t(
          skipRow
            ? 'interface:team.preparingAttemptDestination'
            : 'interface:team.preparingResultDestination',
          { mission: contentText(destination, 'name') },
        ),
      );
      if (!current()) return;
      $('coop-next-cancel').focus({ preventScroll: true });
      await presentationPage.ready;
      if (!current()) return;
      await ensureTeamPicturePackage(selection, {
        signal: operation.controller.signal,
        retain: true,
      });
      if (!current()) return;
      selection.binding = await selection.lease.select({
        ...selection.request,
        signal: operation.controller.signal,
        onStatus: (status) => {
          if (!current()) return;
          const text = picturePreparationText(status, destination.name);
          if (text) nextStatus(text);
        },
      });
      if (!current()) return;
      selection.binding = selection.lease.confirm(selection.request);
      selection.state = 'ready';
      const candidate = createTunedCoop(recipe);
      startCoop(candidate);
      if (!current()) return;
      // First paint is tested while the completed attempt still owns its image.
      painter.paint(candidate, {
        reduced: displayPreferences.snapshot().effectiveReducedEffects,
        textFace: displayPreferences.snapshot().textFace,
        picture: selection.binding,
        actorAppearance: selection.actorAppearance,
        pictureLevel: attemptTuning.get(candidate).pictureLevel,
      });
      if (!current()) {
        if (!disposed && run === operation.run) render();
        return;
      }
      clear();
      if (!current()) return;
      const previous = {
        run,
        level: attemptLevel,
        pack: attemptPack,
        setupPack: pack,
        artworkSource: packArtworkSource,
        picture: acceptedPicture,
        selection: pictureSelection,
        knockdowns,
        last,
        accumulator,
        arena: $('coop-level').value,
        difficulty: $('coop-difficulty').value,
        configuration: $('coop-experiment').value,
        lastBuiltInArena,
      };
      // No callbacks between the final check and reference publication.
      run = candidate;
      attemptLevel = recipe.level;
      attemptPack = selection.pack;
      acceptedPicture = pictureSelection = selection;
      adoptedGeneration = ++generation;
      nextOperation = null;
      operation.detach();
      knockdowns = [null, null];
      last = null;
      accumulator = 0;
      beginInstalledTeamAttempt(candidate, selection);
      try {
        if (rememberBuiltIn) lastBuiltInArena = destination.id;
        if (nextPack) {
          packArtworkSource = selection.artworkSource;
          showPack(nextPack, destination.id, () => adopted(candidate));
          if (!adopted(candidate)) return;
        }
        $('coop-level').value = destination.id;
        $('coop-difficulty').value = candidate.difficulty;
        const configuration = COOP_PLAYTEST_CONFIGURATIONS.find((item) =>
          ['jointCuts', 'assistCaptures', 'advancedCooperation'].every(
            (key) => item[key] === candidate.config[key],
          ),
        );
        if (configuration) $('coop-experiment').value = configuration.id;
        nextStatus('');
        localizedText($('coop-stage'), () => contentText(candidate.level, 'name').toUpperCase());
        $('coop-progress').max = candidate.level.goal.coverage
          ? candidate.level.goal.coverage * 100
          : 100;
        overlay({ focus: false });
        render();
        if (!adopted(candidate)) return;
        setupNote({ level: attemptLevel, experiment: candidate.config });
      } catch (error) {
        if (adopted(candidate) && settingsVisit === operation.settingsVisit) {
          rolledBack = true;
          run = previous.run;
          attemptLevel = previous.level;
          attemptPack = previous.pack;
          acceptedPicture = previous.picture;
          pictureSelection = previous.selection;
          knockdowns = previous.knockdowns;
          last = previous.last;
          accumulator = previous.accumulator;
          generation++;
          lastBuiltInArena = previous.lastBuiltInArena;
          if (nextPack) {
            packArtworkSource = previous.artworkSource;
            const epoch = generation;
            showPack(
              previous.setupPack,
              previous.arena,
              () =>
                run === previous.run &&
                generation === epoch &&
                acceptedPicture === previous.picture,
            );
            if (
              run !== previous.run ||
              generation !== epoch ||
              acceptedPicture !== previous.picture
            )
              return;
          }
          $('coop-level').value = previous.arena;
          $('coop-difficulty').value = previous.difficulty;
          $('coop-experiment').value = previous.configuration;
          setupNote({ level: attemptLevel, experiment: run.config });
          localizedText($('coop-stage'), () =>
            contentText(attemptLevel || run.level, 'name').toUpperCase(),
          );
          $('coop-progress').max = run.level.goal.coverage ? run.level.goal.coverage * 100 : 100;
          overlay({ focus: false });
        }
        throw error;
      }
      if (adopted(candidate) && rememberBuiltIn) arenaPreference.choose(destination.id);
      if (acceptedPicture !== previous.picture && pictureSelection !== previous.picture)
        previous.picture.lease?.dispose();
      if (!adopted(candidate)) return;
      candidateProgress?.started(selection.journeyRow, candidate, {
        ...attemptTuning.get(candidate),
        skipped: skipRow,
        picture: earnedTeamPicture(selection, selection.binding),
      });
      if (!adopted(candidate)) return;
      message(() =>
        t('interface:team.arenaReadyDirections', {
          mission: contentText(destination, 'name'),
        }),
      );
      input.focus();
    } catch (error) {
      const failed = nextOperation === operation;
      const recovery = {
        owner: nextOperation,
        generation,
        settingsVisit,
        focus: document.activeElement,
      };
      const ownsRecovery = () =>
        !disposed &&
        !operation.controller.signal.aborted &&
        nextOperation === recovery.owner &&
        generation === recovery.generation &&
        run === operation.run &&
        acceptedPicture === operation.picture &&
        attemptPack === operation.pack &&
        settingsVisit === recovery.settingsVisit &&
        document.activeElement === recovery.focus;
      if (!(failed || rolledBack) || !ownsRecovery()) return;
      // Logging is an external callback: Cancel or a newer action must remain
      // authoritative when it returns, including after an adoption rollback.
      try {
        console.error(t('interface:teamNextArenaPreparationFailed'), error);
      } catch {}
      if (!ownsRecovery()) return;
      if (failed) {
        nextOperation = null;
        operation.detach();
      }
      // A cancelled/stale completion must not overwrite a newer action/status.
      if (
        (failed || rolledBack) &&
        !disposed &&
        run === operation.run &&
        acceptedPicture === operation.picture &&
        !nextOperation
      ) {
        nextStatus(() =>
          t(
            skipRow
              ? 'interface:team.startAttemptDestinationFailed'
              : 'interface:team.startResultDestinationFailed',
            { mission: contentText(destination, 'name') },
          ),
        );
        try {
          render();
        } catch {
          /* The retained result still offers recovery. */
        }
        if (
          !nextOperation &&
          run === operation.run &&
          acceptedPicture === operation.picture &&
          foreground() &&
          !settingsDialog.open &&
          !earnedDialog.open
        )
          operation.action.focus({ preventScroll: true });
      }
    } finally {
      if (nextOperation === operation) cancelNext();
      operation.detach();
      if (acceptedPicture !== selection && pictureSelection !== selection)
        selection.lease?.dispose();
      if (
        adoptedGeneration !== null &&
        acceptedPicture !== operation.picture &&
        pictureSelection !== operation.picture
      )
        operation.picture.lease?.dispose();
    }
  }
  $('coop-next').onclick = () => void nextArena();
  $('coop-next-cancel').onclick = () => cancelNext({ restore: true });

  function cancelJourneySkip() {
    if (!journeySkip) return;
    journeySkip = null;
    if (!disposed) overlay({ focus: false });
  }
  function skipJourney() {
    const destination = journeyNavigation();
    if (
      !destination?.next ||
      disposed ||
      inactive ||
      !foreground() ||
      loopStopped ||
      nextOperation ||
      discovery?.isOpen() ||
      settingsDialog.open ||
      earnedDialog.open ||
      departure ||
      !['running', 'paused', 'lost'].includes(run?.status)
    )
      return;
    if (
      journeySkip?.run === run &&
      journeySkip.generation === generation &&
      journeySkip.picture === acceptedPicture
    ) {
      const row = journeySkip.row;
      journeySkip = null;
      localizedText($('coop-journey-skip-confirm'), () => t('interface:skipMission'));
      void nextArena({ skipRow: row });
      return;
    }
    const attempt = run,
      epoch = generation;
    pause({ focus: false });
    if (
      disposed ||
      run !== attempt ||
      generation !== epoch ||
      !foreground() ||
      inactive ||
      settingsDialog.open ||
      earnedDialog.open ||
      departure ||
      discovery?.isOpen()
    )
      return;
    journeySkip = { run, generation, picture: acceptedPicture, row: destination.row };
    localizedText($('coop-journey-skip-confirm'), () => t('interface:confirmSkip'));
    localizedText($('coop-overlay-copy'), () =>
      t('interface:team.skipConfirm', {
        mission: contentText(destination.next, 'name'),
      }),
    );
    $('coop-journey-skip-confirm').focus({ preventScroll: true });
  }
  const skipFocusChanged = (event) => {
    if (event.target !== $('coop-journey-skip-confirm')) cancelJourneySkip();
  };
  document.addEventListener('focusin', skipFocusChanged);
  $('coop-journey-skip').onclick = skipJourney;
  $('coop-journey-skip-confirm').onclick = skipJourney;

  function canOpenDiscovery() {
    return (
      !disposed &&
      !inactive &&
      foreground() &&
      !running() &&
      !departure &&
      !settingsDialog.open &&
      !earnedDialog.open &&
      !nextOperation &&
      !pictureOperation &&
      !importOperation &&
      !importAdopting &&
      !artworkImports.pending() &&
      !discoveryOperation
    );
  }
  function discoveryControls() {
    for (const id of ['coop-discovery-open', 'coop-discovery-paused']) {
      const button = $(id);
      if (button) button.disabled = !canOpenDiscovery();
    }
  }
  function cancelDiscoveryPreparation(operation = discoveryOperation) {
    if (!operation || operation.cancelled) return;
    operation.cancelled = true;
    operation.libraryOwner?.controller.abort();
    if (discoveryOperation === operation) discoveryOperation = null;
    operation.detach();
    if (departure?.kind === 'discovery' && departure.operation === operation)
      closeDeparture(departure, { restore: false });
    operation.controller.abort();
    if (operation.selection !== acceptedPicture && operation.selection !== pictureSelection)
      operation.selection.lease.dispose();
    discoveryControls();
  }
  async function prepareDiscoveryPreview(row, { signal, isCurrent, onStatus = () => {} }) {
    const aborted = () =>
      new DOMException(t('interface:teamPreviewIsNoLongerCurrent'), 'AbortError');
    if (!currentDiscoveryRows().includes(row) || signal.aborted || !isCurrent()) throw aborted();
    const owner = {
      run,
      generation,
      picture: acceptedPicture,
      selection: pictureSelection,
      pack,
      artworkSource: packArtworkSource,
      localPack: localDiscoveryPack,
      settingsVisit,
      importRequest,
      loopStopped,
      level: $('coop-level').value,
      difficulty: $('coop-difficulty').value,
      configuration: $('coop-experiment').value,
    };
    const request = {
      pack: structuredClone(row.pack),
      levelId: row.levelId,
      themeId: row.artworkSource?.receipt.theme.id ?? 'fpv',
      attemptId: `team-preview-${++discoveryPreviewSequence}`,
      ...(row.artworkSource ? { artworkSource: row.artworkSource } : {}),
    };
    let released = false,
      snapshot = null;
    const check = () => {
      if (
        released ||
        signal.aborted ||
        !isCurrent() ||
        disposed ||
        inactive ||
        !foreground() ||
        running() ||
        !discovery?.isOpen() ||
        !currentDiscoveryRows().includes(row) ||
        row.level.id !== row.levelId ||
        !row.pack.levels.includes(row.level) ||
        run !== owner.run ||
        generation !== owner.generation ||
        acceptedPicture !== owner.picture ||
        pictureSelection !== owner.selection ||
        pack !== owner.pack ||
        packArtworkSource !== owner.artworkSource ||
        localDiscoveryPack !== owner.localPack ||
        settingsVisit !== owner.settingsVisit ||
        importRequest !== owner.importRequest ||
        loopStopped !== owner.loopStopped ||
        $('coop-level').value !== owner.level ||
        $('coop-difficulty').value !== owner.difficulty ||
        $('coop-experiment').value !== owner.configuration ||
        settingsDialog.open ||
        earnedDialog.open ||
        departure ||
        discoveryOperation ||
        nextOperation ||
        pictureOperation ||
        importOperation ||
        importAdopting ||
        released ||
        signal.aborted
      )
        throw aborted();
    };
    const leaseOptions = {
      bindings: COOP_SUPPORTED_PICTURE_BINDINGS,
      historicalImportPolicy: COOP_HISTORICAL_IMPORT_PICTURE_POLICIES,
      getSnapshot() {
        check();
        const current = presentationPage.current();
        check();
        if (current !== snapshot) throw aborted();
        return current;
      },
      readPicture: presentationPage.readPicture,
      decodeImage: decodeCoopPicture,
    };
    const lease =
      row.journeyRow?.background && !row.artworkSource
        ? createCandidateTeamPictures({
            row: row.journeyRow,
            owns: candidateJourney.owns,
            getSnapshot: leaseOptions.getSnapshot,
          })
        : createCoopPresentation(leaseOptions);
    const release = () => {
      if (released) return;
      released = true;
      signal.removeEventListener('abort', release);
      // This preview owns its decoder only. The current attempt and the opaque
      // imported source retain their separate owners throughout browsing.
      lease.dispose();
    };
    const confirm = () => {
      try {
        check();
        // Revalidate the live row as well as the captured request: matching IDs
        // cannot authorize a changed pack or an expired local artwork owner.
        const binding = lease.confirm({ ...request, pack: row.pack, signal });
        check();
        return binding.image;
      } catch (error) {
        release();
        throw error;
      }
    };
    signal.addEventListener('abort', release, { once: true });
    try {
      check();
      await presentationPage.ready;
      check();
      snapshot = presentationPage.current();
      check();
      await ensureTeamPicturePackage(row, { signal, prompt: false });
      check();
      await lease.select({
        ...request,
        signal,
        onStatus(status) {
          try {
            check();
          } catch {
            return;
          }
          const text = picturePreparationText(status);
          if (text) onStatus(text);
        },
      });
      const image = confirm();
      return Object.freeze({ image, confirm, release });
    } catch (error) {
      release();
      throw error;
    }
  }
  async function activateDiscovery(
    row,
    { signal, isCurrent, onStatus, opener, restored = null, teamMedia = null },
  ) {
    if (!canOpenDiscovery() || !currentDiscoveryRows().includes(row))
      throw new DOMException(t('interface:arenaSelectionIsNoLongerCurrent'), 'AbortError');
    const recipe = freshRecipe(structuredClone(row.level), {
      ...currentRecipe().options,
      ...(row.journeyRow ? { difficulty: row.journeyRow.difficulty } : {}),
      ...(restored
        ? {
            seed: restored.run.seed,
            difficulty: restored.snapshot.difficulty,
            ...restored.run.config,
          }
        : {}),
    });
    const selection = newPictureSelection(
      recipe,
      row.pack,
      row.pack,
      row.artworkSource,
      row.installedEditionId ?? null,
      teamMedia ?? row.teamMedia ?? null,
    );
    const previous = {
      run,
      generation,
      level: attemptLevel,
      attemptPack,
      picture: acceptedPicture,
      selection: pictureSelection,
      pack,
      artworkSource: packArtworkSource,
      localPack: localDiscoveryPack,
      settingsVisit,
      importRequest,
      loopStopped,
      knockdowns,
      last,
      accumulator,
      lastBuiltInArena,
      pictureMessage,
      arena: $('coop-level').value,
      difficulty: $('coop-difficulty').value,
      configuration: $('coop-experiment').value,
      menuHidden: $('coop-menu').hidden,
      playHidden: $('coop-play').hidden,
      playing: document.body.classList.contains('playing'),
    };
    const operation = {
      selection,
      libraryOwner: libraryLaunch,
      controller: new AbortController(),
      cancelled: false,
      detach: () => {},
    };
    let candidate = null,
      publishedGeneration = null,
      completed = false;
    const current = () =>
      discoveryOperation === operation &&
      !operation.cancelled &&
      !disposed &&
      !inactive &&
      foreground() &&
      !signal.aborted &&
      !operation.controller.signal.aborted &&
      isCurrent() &&
      currentDiscoveryRows().includes(row) &&
      run === previous.run &&
      generation === previous.generation &&
      attemptLevel === previous.level &&
      attemptPack === previous.attemptPack &&
      acceptedPicture === previous.picture &&
      pictureSelection === previous.selection &&
      pack === previous.pack &&
      packArtworkSource === previous.artworkSource &&
      localDiscoveryPack === previous.localPack &&
      settingsVisit === previous.settingsVisit &&
      importRequest === previous.importRequest &&
      loopStopped === previous.loopStopped &&
      $('coop-level').value === previous.arena &&
      $('coop-difficulty').value === previous.difficulty &&
      $('coop-experiment').value === previous.configuration &&
      !settingsDialog.open &&
      !earnedDialog.open &&
      !pictureOperation &&
      !importOperation &&
      !importAdopting &&
      !nextOperation &&
      (!departure || (departure.kind === 'discovery' && departure.operation === operation));
    const check = () => {
      if (!current())
        throw new DOMException(
          t('interface:arenaPreparationCancelledYourCurrentArenaIsKept'),
          'AbortError',
        );
    };
    const abort = () => cancelDiscoveryPreparation(operation);
    const moved = (event) => {
      if (
        ![
          opener,
          $('coop-discovery-dialog'),
          $('journey-chooser'),
          $('coop-discovery-cancel'),
          document.body,
          document.documentElement,
        ].includes(event.target) &&
        !(
          departure?.kind === 'discovery' &&
          departure.operation === operation &&
          departureDialog.contains(event.target)
        )
      )
        abort();
    };
    operation.detach = () => {
      signal.removeEventListener('abort', abort);
      document.removeEventListener('focusin', moved);
    };
    discoveryOperation = operation;
    signal.addEventListener('abort', abort, { once: true });
    document.addEventListener('focusin', moved);
    if (signal.aborted) abort();
    const ownsPublished = () =>
      !disposed &&
      run === candidate &&
      generation === publishedGeneration &&
      acceptedPicture === selection &&
      pictureSelection === selection;
    const accepted = () =>
      ownsPublished() &&
      discoveryOperation === operation &&
      !operation.cancelled &&
      !signal.aborted &&
      isCurrent() &&
      !inactive &&
      foreground() &&
      settingsVisit === previous.settingsVisit &&
      !settingsDialog.open &&
      !earnedDialog.open &&
      !departure &&
      pack === row.pack &&
      packArtworkSource === row.artworkSource &&
      running();
    const rollback = () => {
      if (!ownsPublished()) return;
      run = previous.run;
      attemptLevel = previous.level;
      attemptPack = previous.attemptPack;
      acceptedPicture = previous.picture;
      pictureSelection = previous.selection;
      pack = previous.pack;
      packArtworkSource = previous.artworkSource;
      loopStopped = previous.loopStopped;
      knockdowns = previous.knockdowns;
      last = previous.last;
      accumulator = previous.accumulator;
      lastBuiltInArena = previous.lastBuiltInArena;
      const epoch = ++generation;
      const owns = () => !disposed && generation === epoch && run === previous.run;
      $('coop-difficulty').value = previous.difficulty;
      $('coop-experiment').value = previous.configuration;
      showPack(previous.pack, previous.arena, owns);
      if (!owns()) return;
      document.body.classList.toggle('playing', previous.playing);
      $('coop-menu').hidden = previous.menuHidden;
      $('coop-play').hidden = previous.playHidden;
      pictureUI(previous.pictureMessage);
      if (!owns()) return;
      if (run) {
        localizedText($('coop-stage'), () =>
          contentText(attemptLevel || run.level, 'name').toUpperCase(),
        );
        $('coop-progress').max = run.level.goal.coverage ? run.level.goal.coverage * 100 : 100;
      }
      overlay({ focus: false });
    };
    try {
      check();
      onStatus(
        t('interface:team.preparingArena', {
          mission: contentText(row, 'title'),
        }),
      );
      check();
      await presentationPage.ready;
      check();
      await ensureTeamPicturePackage(selection, {
        signal: operation.controller.signal,
        retain: true,
      });
      check();
      selection.binding = await selection.lease.select({
        ...selection.request,
        signal: operation.controller.signal,
        onStatus: (status) => {
          if (!current()) return;
          const text = picturePreparationText(status);
          if (text) onStatus(t('interface:team.currentArenaAvailable', { status: text }));
        },
      });
      check();
      selection.binding = selection.lease.confirm(selection.request);
      selection.state = 'ready';
      if (restored) {
        if (restored.snapshot.levelId !== row.levelId)
          throw new Error('Saved Team attempt belongs to another installed mission.');
        candidate = restored.run;
        attemptTuning.set(candidate, {
          pictureLevel: recipe.level,
          adminOverride: false,
          gameplayId: restored.snapshot.gameplayId,
          tuning: restored.snapshot.tuning,
        });
      } else candidate = createTunedCoop(recipe);
      startCoop(candidate);
      check();
      if (previous.run?.status === 'paused') {
        const replace = await new Promise((resolve) => {
          const ticket = {
            kind: 'discovery',
            opener,
            run,
            generation,
            operation,
            resolve,
            current,
          };
          departure = ticket;
          localizedText($('coop-discard-title'), () => t('interface:startAnotherTeamArena'));
          localizedText($('coop-discard-copy'), () =>
            t(
              installedTeamAttempts.get(run)?.durable
                ? 'interface:team.replaceAttemptSaved'
                : 'interface:team.replaceAttempt',
              {
                mission: contentText(row, 'title'),
              },
            ),
          );
          localizedText($('coop-discard-confirm'), () => t('interface:replacePlay'));
          try {
            departureDialog.showModal();
            $('coop-discard-stay').focus({ preventScroll: true });
            if (!current()) closeDeparture(ticket, { restore: false });
          } catch (error) {
            closeDeparture(ticket, { restore: false });
            throw error;
          }
        });
        check();
        if (!replace) {
          onStatus(t('interface:yourTeamAttemptIsKeptChoosePlayWhenYouAre'));
          return false;
        }
      }
      check();
      selection.binding = selection.lease.confirm(selection.request);
      painter.paint(candidate, {
        reduced: displayPreferences.snapshot().effectiveReducedEffects,
        textFace: displayPreferences.snapshot().textFace,
        picture: selection.binding,
        actorAppearance: selection.actorAppearance,
        pictureLevel: attemptTuning.get(candidate).pictureLevel,
      });
      check();
      clear();
      check();
      // Publish the validated core, exact picture and setup together. No callbacks
      // run between the last guard and these reference assignments.
      run = candidate;
      attemptLevel = recipe.level;
      attemptPack = selection.pack;
      acceptedPicture = pictureSelection = selection;
      pack = row.pack;
      packArtworkSource = row.artworkSource;
      publishedGeneration = ++generation;
      loopStopped = false;
      knockdowns = [null, null];
      last = null;
      accumulator = 0;
      beginInstalledTeamAttempt(candidate, selection, restored);
      if (row.pack === COOP_STARTER_PACK) lastBuiltInArena = row.levelId;
      try {
        $('coop-difficulty').value = candidate.difficulty;
        const configuration = COOP_PLAYTEST_CONFIGURATIONS.find((item) =>
          ['jointCuts', 'assistCaptures', 'advancedCooperation'].every(
            (key) => item[key] === candidate.config[key],
          ),
        );
        if (configuration) $('coop-experiment').value = configuration.id;
        showPack(row.pack, row.levelId, accepted);
        if (!accepted())
          throw new DOMException(t('interface:arenaActivationChanged'), 'AbortError');
        document.body.classList.add('playing');
        $('coop-menu').hidden = true;
        $('coop-play').hidden = false;
        localizedText($('coop-stage'), () => contentText(candidate.level, 'name').toUpperCase());
        $('coop-progress').max = candidate.level.goal.coverage
          ? candidate.level.goal.coverage * 100
          : 100;
        pictureUI(localizedMessage('interface:teamPictureReady'));
        overlay({ focus: false });
        render();
        if (!accepted())
          throw new DOMException(t('interface:arenaActivationChanged'), 'AbortError');
        setupNote({ level: attemptLevel, experiment: candidate.config });
        message(() =>
          t(
            restored
              ? 'interface:team.arenaRestoredDirections'
              : 'interface:team.arenaReadyDirections',
            { mission: contentText(row.level, 'name') },
          ),
        );
        if (!accepted())
          throw new DOMException(t('interface:arenaActivationChanged'), 'AbortError');
      } catch (error) {
        rollback();
        throw error;
      }
      completed = true;
      discoveryOperation = null;
      operation.detach();
      discoveryStarted = {
        run: candidate,
        generation: publishedGeneration,
        picture: selection,
        sourcePack: row.pack,
        levelId: row.levelId,
      };
      for (const old of new Set([previous.picture, previous.selection]))
        if (old && old !== acceptedPicture && old !== pictureSelection) old.lease?.dispose();
      if (run === candidate && running() && foreground() && !disposed)
        candidateProgress?.started(selection.journeyRow, candidate, {
          ...attemptTuning.get(candidate),
          picture: earnedTeamPicture(selection, selection.binding),
        });
      return run === candidate && running() && foreground() && !disposed;
    } finally {
      if (discoveryOperation === operation) discoveryOperation = null;
      operation.detach();
      if (departure?.kind === 'discovery' && departure.operation === operation)
        closeDeparture(departure, { restore: false });
      if (acceptedPicture !== selection && pictureSelection !== selection)
        selection.lease.dispose();
      if (!completed && !disposed && run === previous.run && acceptedPicture === previous.picture) {
        try {
          render();
        } catch {
          /* Keep the retained recovery surface available. */
        }
      }
      discoveryControls();
    }
  }
  const libraryDifficulty = () =>
    acceptedPicture?.journeyRow?.difficulty ??
    selectedCandidateRow()?.difficulty ??
    candidateDifficulty;
  function libraryStatus(text, state = 'ready') {
    localizedText($('coop-discovery-status'), () => text);
    $('coop-discovery-status').dataset.state = state;
  }
  function registerTeamSource(source, resolve) {
    const rows = missionLibrary.register(source);
    rows.forEach((row, index) => libraryRuntimeRows.set(row, () => resolve(source.entries[index])));
  }
  const installedDifficultyLabel = (value) =>
    ({
      gentle: t('interface:gentle'),
      standard: t('interface:standard'),
      expert: t('interface:expert'),
    })[value] ?? value;
  const installedPresetLabel = (value) =>
    value === 'full' ? t('interface:fullTeamwork') : t('interface:jointCutsOrdinaryCover');
  function installedProgressText(row) {
    const progress = installedTeamProgress.get(row.installedEditionId),
      receipt = progress?.clears?.[row.levelId],
      saved = progress?.attempts?.[row.levelId];
    if (saved)
      return t('interface:missionLibrary.team.resumeSavedAttempt', {
        difficulty: installedDifficultyLabel(saved.difficulty),
        preset: installedPresetLabel(saved.presetId),
      });
    return receipt
      ? `${t('interface:missionLibrary.team.installedClear', {
          difficulty: installedDifficultyLabel(receipt.difficulty),
          preset: installedPresetLabel(receipt.presetId),
        })}${receipt.reward ? ` · ${t('interface:pictureEarned')}` : ''}`
      : t('interface:missionLibrary.team.notClearedInstalledEdition');
  }
  function installedProgressState(row) {
    const clears = installedTeamProgress.get(row.installedEditionId)?.clears;
    return {
      state: Object.hasOwn(clears ?? {}, row.levelId) ? 'completed' : 'new',
      // Installed Team v1 receipts record exact clears, but no star grade.
      bestStars: null,
    };
  }
  async function launchInstalledTeamRow(edition, row, context) {
    if (
      !installedTeamStore ||
      installedTeamEditions.get(edition.editionId) !== edition ||
      !context.isCurrent()
    )
      return false;
    context.onStatus(
      t('interface:missionLibrary.team.verifyingInstalledEdition', {
        edition: edition.editionId.slice(0, 12),
      }),
    );
    const loaded = await installedTeamStore.load(edition.editionId, {
      signal: context.signal,
    });
    if (
      !context.isCurrent() ||
      installedTeamEditions.get(edition.editionId) !== edition ||
      canonicalJSON(loaded.prepared.pack) !== canonicalJSON(edition.pack)
    )
      throw new Error(t('interface:missionLibrary.team.installedEditionChanged'));
    const saved = installedTeamProgress.get(edition.editionId)?.attempts?.[row.levelId],
      restored = saved
        ? await installedTeamStore.restoreAttempt(edition.editionId, row.levelId, {
            signal: context.signal,
          })
        : null;
    if (!context.isCurrent()) return false;
    return launchTeamLibraryRow(row, { ...context, restored, teamMedia: loaded.media });
  }
  async function includeInstalledTeamCampaigns() {
    if (!installedTeamStore) return;
    if (installedTeamLoading) return installedTeamLoading;
    const loading = (async () => {
      try {
        const inventory = await installedTeamStore.inventory();
        if (disposed || installedTeamLoading !== loading) return;
        if (inventory.generation === installedTeamGeneration) return;
        for (const sourceId of installedTeamSourceIds) missionLibrary?.remove(sourceId);
        installedTeamSourceIds.clear();
        installedTeamRows = [];
        installedTeamEditions = new Map(
          inventory.editions.map((edition) => [edition.editionId, edition]),
        );
        installedTeamProgress.clear();
        for (const edition of inventory.editions) {
          installedTeamProgress.set(edition.editionId, edition.progress);
          const rows = discoveryRows(edition.pack, null, `installed-${edition.editionId}`).map(
            (row) =>
              Object.freeze({
                ...row,
                installedEditionId: edition.editionId,
                get sourceLabel() {
                  return t('interface:missionLibrary.team.installedEdition', {
                    edition: edition.editionId.slice(0, 12),
                  });
                },
              }),
          );
          installedTeamRows.push(...rows);
          const sourceId = `team-installed:${edition.editionId}`;
          installedTeamSourceIds.add(sourceId);
          registerTeamSource(
            teamArenaLibrarySource({
              rows,
              sourceId,
              editionId: edition.editionId,
              edition: () =>
                t('interface:missionLibrary.team.editionLabel', {
                  campaign: edition.pack.name,
                  edition: edition.editionId.slice(0, 12),
                }),
              collection: 'Custom',
              isCurrent: (row) =>
                installedTeamEditions.get(edition.editionId) === edition && rows.includes(row),
              progress: installedProgressText,
              progressState: installedProgressState,
              launch: (row, context) => launchInstalledTeamRow(edition, row, context),
            }),
            (row) => row,
          );
        }
        if (
          libraryLocalOwner?.installedEditionId &&
          installedTeamSourceIds.has(`team-installed:${libraryLocalOwner.installedEditionId}`)
        ) {
          if (libraryLocalOwner.librarySourceId)
            missionLibrary.remove(libraryLocalOwner.librarySourceId);
          libraryLocalOwner = null;
          getTeamLibrary();
        }
        installedTeamGeneration = inventory.generation;
        installedTeamStorageError = null;
      } catch (error) {
        if (error?.name !== 'AbortError') installedTeamStorageError = error;
      }
    })();
    installedTeamLoading = loading;
    try {
      await loading;
    } finally {
      if (installedTeamLoading === loading) installedTeamLoading = null;
    }
  }
  function retireLibraryLaunch() {
    const owner = libraryLaunch;
    libraryLaunch = null;
    owner?.detach();
    owner?.controller.abort();
    cancelDiscoveryPreparation();
    if (departure?.kind === 'discovery' && !departure.operation)
      closeDeparture(departure, { restore: false });
    $('coop-discovery-cancel').hidden = true;
    if (owner) libraryStatus(t('interface:preparationCancelledYourTeamAttemptIsKept'));
  }
  function finishLibraryStart(started) {
    if (discoveryStarted !== started) return;
    discoveryStarted = null;
    clear();
    const current = () =>
      Boolean(started) &&
      !disposed &&
      foreground() &&
      !inactive &&
      run === started.run &&
      generation === started.generation &&
      acceptedPicture === started.picture &&
      running() &&
      !discovery.isOpen() &&
      !settingsDialog.open &&
      !earnedDialog.open &&
      !departure;
    const focus = document.activeElement;
    if (
      current() &&
      started.sourcePack === COOP_STARTER_PACK &&
      pack === COOP_STARTER_PACK &&
      arenaPreference.current() !== started.levelId
    )
      arenaPreference.choose(started.levelId);
    if (current() && document.activeElement === focus) input.focus();
    discoveryControls();
  }
  function teamLibraryContext() {
    retireLibraryLaunch();
    libraryPreview?.close();
    const owner = {
      controller: new AbortController(),
      opener: document.activeElement,
      detach: () => {},
    };
    libraryLaunch = owner;
    const current = () =>
      libraryLaunch === owner &&
      !owner.controller.signal.aborted &&
      !disposed &&
      !inactive &&
      foreground();
    // The initiating click/Enter may still be bubbling. Subsequent unrelated
    // input retires admission without stealing its focus or reopening the picker.
    const newerInput = (event) => {
      if (departure?.kind === 'discovery' && departureDialog.contains(event.target)) return;
      if (event.target === $('coop-discovery-cancel')) return;
      retireLibraryLaunch();
    };
    const newerFocus = (event) => {
      if (
        [
          owner.opener,
          $('coop-discovery-cancel'),
          document.body,
          document.documentElement,
        ].includes(event.target)
      )
        return;
      newerInput(event);
    };
    queueMicrotask(() => {
      if (!current()) return;
      for (const type of ['keydown', 'pointerdown', 'click'])
        document.addEventListener(type, newerInput, true);
      document.addEventListener('focusin', newerFocus, true);
    });
    owner.detach = () => {
      for (const type of ['keydown', 'pointerdown', 'click'])
        document.removeEventListener(type, newerInput, true);
      document.removeEventListener('focusin', newerFocus, true);
    };
    return {
      signal: owner.controller.signal,
      isCurrent: current,
      opener: owner.opener,
      onStatus: (text) => {
        if (current()) libraryStatus(text, 'busy');
      },
    };
  }
  async function launchTeamLibraryRow(row, context) {
    if (!context.isCurrent()) return false;
    const owner = libraryLaunch;
    const cancel = $('coop-discovery-cancel');
    cancel.hidden = false;
    cancel.focus({ preventScroll: true });
    if (document.activeElement !== cancel || !context.isCurrent()) {
      retireLibraryLaunch();
      return false;
    }
    try {
      const accepted = await activateDiscovery(row, context);
      if (accepted && libraryLaunch === owner && context.isCurrent()) {
        const started = discoveryStarted;
        owner.detach();
        libraryLaunch = null;
        cancel.hidden = true;
        libraryStatus(
          () =>
            t(
              context.restored
                ? 'interface:team.arenaRestoredPlayingTogether'
                : 'interface:team.arenaPlayingTogether',
              { mission: contentText(row.level, 'name') },
            ),
          'ready',
        );
        finishLibraryStart(started);
      } else if (libraryLaunch === owner && context.isCurrent())
        libraryStatus(t('interface:yourTeamAttemptIsKeptChoosePlayWhenReady'));
      return accepted;
    } catch (error) {
      if (context.isCurrent())
        libraryStatus(
          () =>
            t('interface:team.arenaPreparationFailed', {
              mission: contentText(row.level, 'name'),
            }),
          'error',
        );
      throw error;
    } finally {
      if (libraryLaunch === owner) {
        cancel.hidden = true;
        owner.detach();
      }
    }
  }
  async function launchRemoteTeamRow(row, context) {
    return launchRemoteLibraryMission(context);
  }
  async function launchRemoteLibraryMission(context) {
    const row = missionLibrary.find(context.libraryMissionId);
    if (!row || !row.modes.includes(context.mode) || !context.isCurrent()) return false;
    const href = missionLibraryHref({
      baseURL: location.href,
      currentMode: 'team',
      mode: context.mode,
      journey: row.collection === 'Journey' ? row.editionId : 'legacy',
      missionId: context.libraryMissionId,
      sourceJourney: candidateJourney
        ? isMissionLibrarySourceJourney(libraryEdition, 'team')
          ? libraryEdition
          : undefined
        : 'legacy',
    });
    const attempt = run,
      epoch = generation;
    const current = () => context.isCurrent() && run === attempt && generation === epoch;
    if (!current()) return false;
    if (unfinished()) {
      const replace = await new Promise((resolve) => {
        const ticket = {
          kind: 'discovery',
          opener: context.opener,
          run,
          generation,
          operation: null,
          current,
          resolve,
        };
        departure = ticket;
        localizedText($('coop-discard-title'), () =>
          t('interface:team.openModeMission', {
            mode:
              context.mode === 'team'
                ? t('interface:team')
                : context.mode === 'solo'
                  ? t('interface:solo2')
                  : t('interface:versus2'),
          }),
        );
        localizedText($('coop-discard-copy'), () =>
          t(
            installedTeamAttempts.get(run)?.durable
              ? 'interface:team.openOriginalAttemptSaved'
              : 'interface:team.openOriginalAttempt',
            { mission: contentText(row, 'name') },
          ),
        );
        localizedText($('coop-discard-confirm'), () => t('interface:replacePlay'));
        departureDialog.showModal();
        $('coop-discard-stay').focus({ preventScroll: true });
      });
      if (!replace || !current()) return false;
    }
    if (!current()) return false;
    if (context.confirmInventory && !(await context.confirmInventory())) return false;
    if (!current() || missionLibrary.find(context.libraryMissionId) !== row) return false;
    if (offlineAvailability().packageConsent)
      await gameplayDownloads.ensureDestination(href, {
        signal: context.signal,
        runtimeOnly: row.collection === 'Custom',
      });
    if (!current() || missionLibrary.find(context.libraryMissionId) !== row) return false;
    location.assign(href);
    return true;
  }
  function getTeamLibrary() {
    if (!missionLibrary) {
      missionLibrary = createMissionLibrary();
      if (candidateJourney)
        registerTeamSource(
          teamJourneyLibrarySource({
            journey: candidateJourney,
            editionId: libraryEdition,
            edition:
              libraryEdition === TEAM_LIBRARY_JOURNEY_EDITION
                ? t('interface:teamJourney')
                : `Team Journey · ${libraryEdition} · ${
                    candidateJourney.rows.some((row) => row.background)
                      ? t('interface:originalArtTestVisualQualificationPending')
                      : t('interface:geometryTestHumanValidationPending')
                  }`,
            progress: candidateProgress,
            gameplayIdentity: normalGameplayIdentity,
            difficulty: libraryDifficulty,
            launch: (row, context) =>
              launchTeamLibraryRow(
                candidateDiscoveryRows.find((entry) => entry.journeyRow === row),
                context,
              ),
          }),
          (mission) =>
            candidateDiscoveryRows.find(
              (entry) => entry.journeyRow === candidateJourney.row(mission, libraryDifficulty()),
            ),
        );
      registerTeamSource(
        teamArenaLibrarySource({ rows: starterDiscoveryRows, launch: launchTeamLibraryRow }),
        (row) => row,
      );
    }
    if (libraryLocalOwner !== localDiscoveryPack) {
      if (libraryLocalOwner?.librarySourceId)
        missionLibrary.remove(libraryLocalOwner.librarySourceId);
      libraryLocalOwner = localDiscoveryPack;
      if (localDiscoveryPack) {
        const owner = localDiscoveryPack;
        if (!installedTeamSourceIds.has(`team-installed:${owner.installedEditionId}`)) {
          owner.librarySourceId = `team-custom:${libraryVisit}:${localDiscoveryRevision}`;
          registerTeamSource(
            teamArenaLibrarySource({
              rows: owner.rows,
              sourceId: owner.librarySourceId,
              editionId: `${owner.pack.id}@${owner.pack.revision}`,
              edition: () =>
                t('interface:missionLibrary.team.visitEdition', { campaign: owner.pack.name }),
              collection: 'Custom',
              isCurrent: (row) => localDiscoveryPack === owner && owner.rows.includes(row),
              launch: launchTeamLibraryRow,
            }),
            (row) => row,
          );
        }
      }
    }
    return missionLibrary;
  }
  async function includeCurrentTeamJourney() {
    if (candidateJourney || libraryRemoteJourney) return;
    libraryRemotePending ??= Promise.all([
      import('../content-design/team-host.mjs'),
      import('../content-design/team-cultural-specialist-v2-originals.mjs'),
    ])
      .then(
        ([{ createCandidateTeamHost }, { createTeamCulturalSpecialistV2OriginalCandidates }]) => {
          if (disposed) return;
          const source = createTeamCulturalSpecialistV2OriginalCandidates();
          libraryRemoteJourney = createCandidateTeamHost(source, {
            corePackIds: source.packs.map((item) => item.id),
          });
          // This browsing-only owner has no profile writer and cannot create a run
          // in the Legacy host. The receiving Journey resolves the exact opaque ID.
          registerTeamSource(
            teamJourneyLibrarySource({
              journey: libraryRemoteJourney,
              launch: launchRemoteTeamRow,
            }),
            () => null,
          );
        },
      )
      .catch((error) => {
        libraryRemotePending = null;
        throw error;
      });
    await libraryRemotePending;
  }
  function retireOtherModesOpening() {
    const opening = libraryOtherModesOpening;
    libraryOtherModesOpening = null;
    opening?.dispose();
    if (!opening || libraryChooser?.state().mode === 'team') return;
    localizedText($('coop-library-remote-status'), () =>
      t('interface:loadingInterruptedRetryWhenReady'),
    );
    $('coop-library-remote-retry').hidden = false;
    $('coop-library-remote-retry').removeAttribute('aria-disabled');
  }
  function mountTeamLibrary() {
    if (libraryChooser) return;
    libraryChooser = attachMissionLibraryChooser({
      document,
      library: getTeamLibrary(),
      mode: 'team',
      getCurrentId: () =>
        missionLibrary.missions.find((row) => {
          const bound = libraryRuntimeRows.get(row)?.();
          return (
            (bound?.pack === pack && bound.level === selectedLevel()) ||
            (localDiscoveryPack?.installedEditionId &&
              bound?.installedEditionId === localDiscoveryPack.installedEditionId &&
              bound.levelId === selectedLevel().id)
          );
        })?.id,
      readState: librarySession.read,
      writeState: librarySession.write,
      launchContext: teamLibraryContext,
      onPause() {
        retireLibraryLaunch();
        discoveryStarted = null;
        clear();
        libraryStatus(t('interface:chooseAMissionYourCurrentTeamAttemptIsKeptUntil'));
        discoveryControls();
      },
      onReturn(opener) {
        retireOtherModesOpening();
        retireLibraryLaunch();
        libraryPreview?.close();
        clear();
        if (libraryReturnFocus && !disposed && foreground() && visibleAction(opener))
          opener.focus({ preventScroll: true });
        discoveryControls();
      },
    });
    const dialog = $('journey-chooser');
    const statusGroup = document.createElement('div');
    statusGroup.id = 'coop-library-status';
    const chooserStatus = $('journey-chooser-status');
    // Keep one status grid row; remote feedback must not expand the action footer.
    dialog.replaceChildren(
      ...[...dialog.children].map((child) => (child === chooserStatus ? statusGroup : child)),
    );
    const remoteFeedback = document.createElement('div');
    remoteFeedback.id = 'coop-library-remote-feedback';
    remoteFeedback.hidden = true;
    const remoteStatus = document.createElement('p');
    remoteStatus.id = 'coop-library-remote-status';
    remoteStatus.setAttribute('role', 'status');
    remoteStatus.hidden = true;
    const remoteRetry = document.createElement('button');
    remoteRetry.id = 'coop-library-remote-retry';
    remoteRetry.type = 'button';
    localizedText(remoteRetry, () => t('common:actions.retry'));
    remoteRetry.setAttribute('aria-label', t('interface:retrySoloAndVersusMissionLoading'));
    remoteRetry.hidden = true;
    remoteFeedback.append(remoteStatus, remoteRetry);
    statusGroup.append(chooserStatus, remoteFeedback);
    function trackRemoteLibraryView(onRetire) {
      const visit = libraryOtherModesVisit,
        mode = libraryChooser.state().mode;
      let retired = false;
      const current = () =>
        !retired &&
        !disposed &&
        dialog.open &&
        foreground() &&
        libraryOtherModesVisit === visit &&
        libraryChooser.state().mode === mode;
      const listeners = [
        [document, 'focusin', outside],
        [document, 'pointerdown', outside],
        [document, 'click', outside],
        [document, 'keydown', key],
        [document, 'visibilitychange', hidden],
        [window, 'blur', windowBlur],
        [window, 'pagehide', retire],
        [dialog, 'cancel', retire],
        [dialog, 'close', retire],
        [$('journey-mode'), 'change', retire],
      ];
      function dispose() {
        for (const [target, type, listener] of listeners)
          target.removeEventListener(type, listener, true);
      }
      function retire() {
        if (retired) return;
        retired = true;
        dispose();
        onRetire();
      }
      function outside(event) {
        if (!dialog.contains(event.target)) retire();
      }
      function key(event) {
        if (event.key === 'Escape' || !dialog.contains(event.target)) retire();
      }
      function hidden() {
        if (document.hidden) retire();
      }
      function windowBlur(event) {
        // Capturing listeners also see a select/input losing focus inside the
        // chooser. Only the window itself losing focus ends this read-only view.
        if (event.target === window) retire();
      }
      // This is an already-open read-only view, not an automatic opening or
      // launch intent. Search and filters remain usable while rows arrive.
      for (const [target, type, listener] of listeners)
        target.addEventListener(type, listener, true);
      return { current, dispose };
    }
    async function includeOtherModes() {
      libraryOtherModesOpening?.dispose();
      libraryOtherModesOpening = null;
      remoteStatus.hidden = libraryChooser.state().mode === 'team';
      remoteFeedback.hidden = remoteStatus.hidden;
      if (
        !remoteStatus.hidden &&
        document.activeElement === previewButton &&
        dialog.open &&
        foreground()
      )
        $('journey-mode').focus({ preventScroll: true });
      previewButton.hidden = !remoteStatus.hidden;
      remoteRetry.hidden = remoteStatus.hidden || document.activeElement !== remoteRetry;
      remoteRetry.setAttribute('aria-disabled', 'true');
      if (remoteStatus.hidden || libraryOtherModesCheckedVisit === libraryOtherModesVisit) return;
      const opening = trackRemoteLibraryView(() => {
        if (libraryOtherModesOpening !== opening) return;
        localizedText(remoteStatus, () => t('interface:loadingInterruptedRetryWhenReady'));
        remoteRetry.removeAttribute('aria-disabled');
        remoteRetry.hidden = libraryChooser.state().mode === 'team';
      });
      libraryOtherModesOpening = opening;
      localizedText(remoteRetry, () => t('common:actions.retry'));
      localizedText(remoteStatus, () => t('interface:loadingSoloAndVersusMissionMetadata'));
      try {
        libraryOtherModesPending ??= import('../mission-library/remote-solo-versus.mjs')
          .then(async ({ createRemoteSoloVersusLibrarySources }) => {
            let channel = 'dev';
            if (document.querySelector('meta[name="revealline-offline"]')) {
              const response = await fetch(new URL('../build-info.json', location.href), {
                signal: libraryOtherModesLifetime.signal,
              });
              if (!response.ok) throw new Error(t('interface:theExactReleaseChannelIsUnavailable'));
              channel = `release-${(await response.json()).version}`;
            }
            return createRemoteSoloVersusLibrarySources({
              baseURL: new URL('../', location.href),
              launch: launchRemoteLibraryMission,
              difficulty: libraryDifficulty,
              signal: libraryOtherModesLifetime.signal,
              installed: { channel },
            });
          })
          .then((owner) => {
            if (disposed) {
              owner.dispose();
              throw new DOMException(t('interface:missionBrowsingClosed'), 'AbortError');
            }
            libraryOtherModes = owner;
            return owner;
          })
          .catch((error) => {
            libraryOtherModesPending = null;
            throw error;
          });
        const owner = await libraryOtherModesPending;
        if (
          libraryOtherModesOpening !== opening ||
          !opening.current() ||
          !dialog.open ||
          libraryChooser.state().mode === 'team' ||
          !foreground() ||
          disposed
        )
          return;
        // A cached owner may have completed after an earlier opening retired.
        // Recheck raw installed metadata before this visit publishes its rows.
        await owner.refresh({ signal: libraryOtherModesLifetime.signal });
        if (
          libraryOtherModesOpening !== opening ||
          !opening.current() ||
          !dialog.open ||
          libraryChooser.state().mode === 'team' ||
          !foreground() ||
          disposed
        )
          return;
        opening.dispose();
        const sources = owner.sources;
        const owned = new Set(sources.map((source) => source.id));
        for (const id of libraryOtherSources.keys())
          if (!owned.has(id)) {
            missionLibrary.remove(id);
            libraryOtherSources.delete(id);
          }
        for (const source of sources)
          if (libraryOtherSources.get(source.id) !== source) {
            missionLibrary.register(source);
            libraryOtherSources.set(source.id, source);
          }
        // Even unchanged owners may have lost readiness (storage failure or
        // expired paired-media proof). Do not leave their old Play labels up.
        libraryChooser.refresh();
        libraryOtherModesCheckedVisit = owner.state().ready ? libraryOtherModesVisit : -1;
        localizedText(remoteStatus, () =>
          owner.state().ready
            ? t('interface:allMissionsLoadedDownloadsStayHerePlayOpensTheExact')
            : t('interface:journeyAndBaseReadyInstalledContentUnavailableRetry'),
        );
        remoteStatus.setAttribute('aria-description', owner.state().reason || '');
        remoteStatus.title = owner.state().reason || '';
        remoteRetry.hidden = owner.state().ready;
        if (!owner.state().ready) remoteRetry.removeAttribute('aria-disabled');
        localizedText(remoteRetry, () =>
          owner.state().ready ? t('interface:loaded') : t('common:actions.retry'),
        );
      } catch (error) {
        if (libraryOtherModesOpening === opening && opening.current() && dialog.open) {
          localizedText(remoteStatus, () =>
            t('interface:team.otherModesUnavailable', { error: error.message }),
          );
          remoteRetry.hidden = false;
          remoteRetry.removeAttribute('aria-disabled');
        }
      } finally {
        opening.dispose();
        if (libraryOtherModesOpening === opening) libraryOtherModesOpening = null;
      }
    }
    libraryOtherModesLoad = includeOtherModes;
    $('journey-mode').addEventListener('change', includeOtherModes);
    remoteRetry.onclick = includeOtherModes;
    const previewButton = document.createElement('button');
    previewButton.id = 'coop-library-preview';
    previewButton.type = 'button';
    localizedText(previewButton, () => t('interface:selectAMissionToPreview'));
    dialog.querySelector('.journey-footer').append(previewButton);
    dialog.append($('coop-discovery-preview'));
    libraryPreview = attachTeamLibraryPreview({
      document,
      dialog,
      button: previewButton,
      panel: $('coop-discovery-preview'),
      canvas: $('coop-discovery-preview-canvas'),
      title: $('coop-discovery-preview-title'),
      status: $('coop-discovery-preview-status'),
      retry: $('coop-discovery-preview-retry'),
      selection() {
        const selected = missionLibrary.find(libraryChooser.state().selectedId);
        if (!selected || libraryChooser.state().mode !== 'team') return null;
        const row = libraryRuntimeRows.get(selected)?.();
        return row && currentDiscoveryRows().includes(row) ? { row } : null;
      },
      prepare: prepareDiscoveryPreview,
    });
  }
  discovery = {
    isOpen: () => Boolean($('journey-chooser')?.open),
    primary: () => libraryChooser?.primary() ?? $('coop-discovery-open'),
    async open(opener) {
      if (!canOpenDiscovery()) return;
      libraryOpening?.dispose();
      const opening = trackMissionLibraryOpening({ document });
      libraryOpening = opening;
      getTeamLibrary();
      try {
        await Promise.all([includeCurrentTeamJourney(), includeInstalledTeamCampaigns()]);
        if (libraryOpening !== opening || !opening.current() || !canOpenDiscovery()) return;
        opening.dispose();
        libraryOpening = null;
        mountTeamLibrary();
        ++libraryOtherModesVisit;
        libraryChooser.open(opener);
        libraryPreview.refresh();
        if (installedTeamStorageError)
          libraryStatus(
            () =>
              t('interface:missionLibrary.team.installedCampaignsUnavailable', {
                error: installedTeamStorageError.message,
              }),
            'error',
          );
        void libraryOtherModesLoad();
      } catch (error) {
        if (opening.current() && !disposed) {
          $('coop-discovery-status').dataset.state = 'error';
          localizedText($('coop-discovery-status'), () =>
            t('interface:team.libraryUnavailable', { error: error.message }),
          );
        }
      } finally {
        opening.dispose();
      }
    },
    close({ restore = true } = {}) {
      retireOtherModesOpening();
      libraryOpening?.dispose();
      libraryOpening = null;
      libraryReturnFocus = restore;
      if (discovery.isOpen()) libraryChooser.close();
      libraryReturnFocus = true;
      retireLibraryLaunch();
      libraryPreview?.close();
    },
    back: () => discovery.close(),
    cancel() {
      retireOtherModesOpening();
      libraryOpening?.dispose();
      libraryOpening = null;
      retireLibraryLaunch();
      libraryPreview?.close();
    },
    dispose() {
      discovery.cancel();
      libraryOtherModesLifetime.abort();
      libraryOtherModes?.dispose();
      libraryReturnFocus = false;
      libraryPreview?.dispose();
      libraryChooser?.destroy();
      missionLibrary?.dispose();
      $('coop-discovery-cancel').onclick = null;
    },
  };
  // Preparation feedback remains visible after the shared chooser closes. The
  // accepted attempt and imported source are not moved into the browsing owner.
  tools.append($('coop-discovery-status'), $('coop-discovery-cancel'));
  $('coop-discovery-cancel').onclick = () => {
    retireLibraryLaunch();
    libraryStatus(t('interface:preparationCancelledYourTeamAttemptIsKept'));
    if (canOpenDiscovery()) libraryChooser?.restore();
  };
  $('coop-discovery-open').onclick = () => discovery.open($('coop-discovery-open'));
  $('coop-discovery-paused').onclick = () => discovery.open($('coop-discovery-paused'));

  function freshRecipe(level, options) {
    return {
      level,
      options,
      tuning: gameplayTuning.snapshot(level.journeyDifficulty ?? options.difficulty),
    };
  }
  function normalGameplayIdentity(row) {
    if (!candidateJourney.owns(row)) return null;
    if (!normalGameplayIdentities.has(row))
      normalGameplayIdentities.set(
        row,
        dataIdentity({
          ruleset: row.pack.ruleset,
          level: applyGameplayTuning(row.level, resolveGameplayTuning(row.difficulty)),
        }),
      );
    return normalGameplayIdentities.get(row);
  }
  function createTunedCoop(recipe) {
    const level = applyGameplayTuning(recipe.level, recipe.tuning);
    const next = createCoop(level, recipe.options);
    attemptTuning.set(next, {
      pictureLevel: recipe.level,
      adminOverride: recipe.tuning.adminOverride,
      gameplayId: dataIdentity({ ruleset: next.ruleset, level }),
      tuning: recipe.tuning,
    });
    return next;
  }
  function earnedTeamPicture(selection, binding) {
    const row = selection?.journeyRow;
    if (!row || !candidateJourney?.owns(row) || !binding) return null;
    const asset = candidateTeamPictureFrame(
      binding,
      row.level,
      dedicatedCoupaTeamPresentation,
    );
    if (!asset) return null;
    return {
      editionId: candidateProgress?.editionId,
      campaignKey: row.executionKey,
      themeId: selection.request.themeId,
      asset,
    };
  }
  function currentRecipe() {
    if (run)
      return freshRecipe(structuredClone(attemptLevel), {
        seed: run.seed,
        difficulty: attemptLevel.journeyDifficulty ?? gameplayPreferences.snapshot().difficulty,
        ...run.config,
      });
    const experiment = selectedConfiguration();
    const level = selectedLevel();
    return freshRecipe(level, {
      seed: 17,
      difficulty: level.journeyDifficulty ?? $('coop-difficulty').value,
      jointCuts: experiment.jointCuts,
      assistCaptures: experiment.assistCaptures,
      advancedCooperation: experiment.advancedCooperation,
    });
  }
  function retainTeamStart(recipe, prepared, selection) {
    const origin = visibleAction(document.activeElement) ? document.activeElement : primary();
    origin.focus({ preventScroll: true });
    const controller = new AbortController(),
      focus = pictureFocus(
        origin,
        false,
        () => (run ? acceptedPicture : pictureSelection) === selection,
      ),
      operation = { selection, controller, focus, run, generation, retention: true };
    const current = () =>
      !disposed &&
      !inactive &&
      foreground() &&
      !controller.signal.aborted &&
      run === operation.run &&
      generation === operation.generation &&
      (run ? acceptedPicture : pictureSelection) === selection &&
      !departure &&
      !discovery?.isOpen() &&
      !earnedDialog.open;
    pictureOperation = operation;
    pictureUI(localizedMessage('interface:preparingTheExactTeamPicture'));
    focus.pending($('coop-picture-cancel'));
    operation.promise = (async () => {
      try {
        await ensureTeamPicturePackage(selection, { signal: controller.signal, retain: true });
        if (pictureOperation !== operation || !current() || !focus.current()) return;
        pictureOperation = null;
        pictureUI();
        focus.finish(origin);
        // Starting remains synchronous once the exact retained closure is ready.
        // A newer selection, blur, Cancel or focus choice never starts this recipe.
        if (current() && document.activeElement === origin) start(recipe, prepared);
      } catch (error) {
        if (pictureOperation !== operation || !current()) return;
        pictureOperation = null;
        pictureUI(
          localizedMessage('gameplay:team.pictureAttemptUnchanged', { error: error.message }),
        );
      } finally {
        if (pictureOperation === operation) {
          pictureOperation = null;
          pictureUI();
        }
        focus.finish(null, false);
      }
    })();
    return operation.promise;
  }
  function start(recipe = currentRecipe(), prepared = null) {
    cancelJourneySkip();
    cancelNext();
    nextStatus('');
    if (
      disposed ||
      inactive ||
      departure ||
      discovery?.isOpen() ||
      earnedDialog.open ||
      pictureOperation ||
      importOperation ||
      importAdopting ||
      (!run && !startPermitted) ||
      !foreground()
    )
      return;
    const selection = run ? acceptedPicture : pictureSelection;
    if (!selection || selection.state !== 'ready') return;
    if (selection.levelId !== recipe.level.id) return;
    if (offlineAvailability().packageConsent && !retainedTeamSelections.has(selection))
      return retainTeamStart(recipe, prepared, selection);
    // Confirmation rechecks exact snapshot/asset identity before changing either
    // the core or its accepted image. Same-attempt Retry reuses that exact lease.
    const binding = selection.lease?.confirm(selection.request) ?? null;
    // Validate a fresh core before releasing the old reference. A failed retry
    // must leave the paused/stopped attempt available on this page.
    // The core's live level shares enemy objects with its mutable threat state.
    // Keep the validated starting level separately for an exact fresh Retry.
    const startingLevel = structuredClone(recipe.level);
    const next = prepared || createTunedCoop(recipe);
    const rememberVisibleArena =
      !run && pack === COOP_STARTER_PACK && arenaPreference.current() !== startingLevel.id;
    cancelImport({ forget: true });
    $('coop-pack-file').value = '';
    clear();
    knockdowns = [null, null];
    const level = next.level;
    run = next;
    attemptLevel = startingLevel;
    attemptPack = selection.pack;
    const previousPicture = acceptedPicture;
    acceptedPicture = selection;
    acceptedPicture.binding = binding;
    if (pictureSelection && pictureSelection !== selection) retirePicture();
    pictureSelection = selection;
    if (previousPicture && previousPicture !== selection) previousPicture.lease?.dispose();
    pictureUI(() =>
      binding
        ? t('interface:teamPictureIsReadyForThisAttempt')
        : t('interface:proceduralTeamArenaIsReadyForThisAttempt'),
    );
    generation++;
    startCoop(run);
    beginInstalledTeamAttempt(run, selection);
    document.body.classList.add('playing');
    $('coop-menu').hidden = true;
    $('coop-play').hidden = false;
    localizedText($('coop-stage'), () => contentText(level, 'name').toUpperCase());
    $('coop-progress').max = level.goal.coverage ? level.goal.coverage * 100 : 100;
    const guidance = () => coopArenaGuidance(next.level, next.config);
    supportGuidance(guidance, level);
    const openingCue = contextualTeaching.opening(guidance());
    message(
      () => {
        const start = guidance().startMessage;
        return openingCue ? `${start} ${t(openingCue.key, openingCue.values)}` : start;
      },
      {
        coach: openingCue?.kind,
      },
    );
    overlay();
    try {
      render();
    } catch (error) {
      stopArena(error);
      return;
    }
    if (rememberVisibleArena && !disposed && run === next && running() && foreground())
      arenaPreference.choose(startingLevel.id);
    if (!disposed && run === next && running() && foreground())
      acceptMusic(selection, { play: true });
    if (!disposed && run === next && running() && foreground())
      candidateProgress?.started(selection.journeyRow, next, {
        ...attemptTuning.get(next),
        picture: earnedTeamPicture(selection, binding),
      });
    if (disposed || run !== next || !running() || !foreground()) return;
    input.focus();
    if (loopStopped) {
      loopStopped = false;
      last = null;
    }
  }
  function pause({ focus = true } = {}) {
    discovery?.cancel();
    cancelNext();
    cancelPicture({ restore: false });
    if (!running()) return;
    persistInstalledTeamAttempt(run, acceptedPicture, { force: true });
    pauseCoop(run);
    clear();
    overlay({ focus });
    try {
      render();
    } catch (error) {
      stopArena(error, { focus });
    }
  }
  function stopArena(error, { focus = true } = {}) {
    discovery?.cancel();
    cancelNext();
    // Never repaint while handling a painter failure. Any destructive decision
    // is cancelled before showing the stopped attempt's recovery actions.
    loopStopped = true;
    updateCueOverflow();
    music?.suspend();
    closeEarnedPicture({ restore: false });
    cancelPicture({ restore: false });
    if (running()) pauseCoop(run);
    clear();
    cancelDeparture({ restore: false });
    overlay({ focus: false });
    $('coop-resume').hidden = true;
    localizedText($('coop-overlay-title'), () => t('interface:theArenaNeedsAFreshStart'));
    localizedText($('coop-overlay-copy'), () =>
      t('interface:thisAttemptIsStoppedAndCannotResumeRetryResetsIt'),
    );
    if (focus && !document.hidden && document.hasFocus?.() !== false)
      primary().focus({ preventScroll: true });
    localizedText($('coop-boot'), () => t('interface:team.arenaStopped', { error: error.message }));
    message(t('interface:team.arenaStoppedAction', { error: error.message }));
    console.error(error);
  }
  function resume() {
    if (
      disposed ||
      inactive ||
      !foreground() ||
      departure ||
      discovery?.isOpen() ||
      settingsDialog.open ||
      run?.status !== 'paused' ||
      loopStopped
    )
      return;
    cancelPicture({ restore: false });
    clear();
    resumeCoop(run);
    if (music) void music.start();
    last = null;
    overlay();
    input.focus();
    const downed = run.players.find((player) => player.status === 'downed');
    message(
      downed
        ? rescueMessage(knockdowns[downed.id] ?? { type: 'player.downed', player: downed.id })
        : localizedMessage('interface:chooseFreshDirectionsWhenYouAreReady'),
    );
  }
  // This synchronous handoff owns only the return from an attempt to its lobby.
  // Do not let focus/layout callbacks revive it after a newer action or lifecycle.
  function lobbyFocus(revealDifficulty = false) {
    const origin = document.activeElement,
      epoch = generation + 1,
      visit = settingsVisit;
    let target = null,
      moved = inactive || !foreground();
    const lose = () => {
      moved = true;
    };
    const focusChanged = (event) => {
      if (!unclaimedFocus(event.target) && event.target !== origin && event.target !== target)
        lose();
    };
    const blurred = (event) => {
      if (event.target === window) lose();
    };
    const hidden = () => {
      if (document.hidden) lose();
    };
    const observers = [
      [document, 'focusin', focusChanged],
      [document, 'keydown', lose],
      [document, 'pointerdown', lose],
      [document, 'visibilitychange', hidden],
      [window, 'blur', blurred],
      [window, 'pagehide', lose],
    ];
    for (const [node, type, callback] of observers) node.addEventListener(type, callback, true);
    const current = () =>
      !moved &&
      !disposed &&
      !inactive &&
      foreground() &&
      !run &&
      generation === epoch &&
      settingsVisit === visit &&
      !settingsDialog.open &&
      !departure &&
      !$('coop-menu').hidden;
    return {
      finish() {
        target = primary();
        const owns = () =>
          current() &&
          primary() === target &&
          (document.activeElement === origin ||
            document.activeElement === target ||
            unclaimedFocus(document.activeElement));
        if (!owns() || !visibleAction(target) || !owns()) return;
        if (revealDifficulty && settingsDialog.contains($('coop-difficulty'))) {
          openSettings({ difficulty: true });
          if (!owns()) return;
        }
        if (document.activeElement !== target) target.focus({ preventScroll: true });
        const focused = () =>
          current() && primary() === target && document.activeElement === target;
        if (!focused() || !visibleAction(target) || !focused()) return;
        const rect = target.getBoundingClientRect(),
          width = document.documentElement.clientWidth || window.innerWidth,
          height = document.documentElement.clientHeight || window.innerHeight;
        if (
          ![rect.left, rect.top, rect.right, rect.bottom, width, height].every(Number.isFinite) ||
          rect.width <= 0 ||
          rect.height <= 0 ||
          width <= 16 ||
          height <= 16 ||
          (rect.left >= 8 && rect.top >= 8 && rect.right <= width - 8 && rect.bottom <= height - 8)
        )
          return;
        if (!focused() || !visibleAction(target) || !focused()) return;
        target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      },
      cancel() {
        for (const [node, type, callback] of observers)
          node.removeEventListener(type, callback, true);
      },
    };
  }
  function lobby({ revealDifficulty = false } = {}) {
    discovery?.close({ restore: false });
    cancelNext();
    nextStatus('');
    if (disposed || departure) return;
    if (revealDifficulty) $('coop-optional-setup').open = true;
    const focus = lobbyFocus(revealDifficulty);
    try {
      cancelImport({ forget: true });
      clear();
      const retainedPicture = acceptedPicture;
      retirePicture();
      acceptedPicture = null;
      run = null;
      updateCueOverflow();
      attemptLevel = null;
      attemptPack = null;
      generation++;
      document.body.classList.remove('playing');
      $('coop-play').hidden = true;
      $('coop-menu').hidden = false;
      showPackStatus();
      difficultyControls();
      placeTools(false);
      if (
        retainedPicture?.sourcePack === pack &&
        retainedPicture.artworkSource === packArtworkSource &&
        retainedPicture.levelId === selectedLevel().id
      ) {
        pictureSelection = retainedPicture;
        pictureUI(localizedMessage('interface:teamPictureReadyStartRemainsASeparateAction'));
      } else {
        retainedPicture?.lease?.dispose();
        void preparePicture();
      }
      focus.finish();
    } finally {
      focus.cancel();
    }
  }
  const unfinished = () => run && ['running', 'paused'].includes(run.status);
  const departureLabelKeys = {
    setup: 'interface:discardAndChangeSetup',
    retry: 'interface:discardAndRetry',
    return: 'interface:discardAndLeave',
    home: 'interface:discardAndLeave',
    versus: 'interface:discardAndGoToVersus',
    catalogue: 'interface:discardAndSwitchJourney',
  };
  function visibleAction(element) {
    return (
      element?.isConnected &&
      !element.disabled &&
      !element.closest('[hidden],[inert],[aria-hidden="true"]') &&
      element.getClientRects().length > 0 &&
      document.defaultView?.getComputedStyle(element)?.visibility !== 'hidden'
    );
  }
  function closeDeparture(ticket, { restore = true } = {}) {
    if (!ticket || departure !== ticket) return;
    ticket.downloadController?.abort();
    departure = null;
    if (departureDialog.open) departureDialog.close();
    navigation.clear();
    if (ticket.kind === 'discovery') {
      const resolve = ticket.resolve;
      ticket.resolve = null;
      resolve?.(false);
      return;
    }
    if (restore && !disposed && !document.hidden && document.hasFocus?.() !== false) {
      // Both the pause panel and its visible masthead are navigable owners.
      // Stay returns to the exact opener without resuming either player.
      const origin =
        $('coop-overlay').contains(ticket.opener) || menuMasthead?.contains(ticket.opener)
          ? ticket.opener
          : primary();
      (visibleAction(origin) ? origin : primary()).focus({ preventScroll: true });
    }
  }
  function cancelDeparture(options) {
    closeDeparture(departure, options);
  }
  function requestDeparture(kind, opener, { revealDifficulty = false } = {}) {
    discovery?.close({ restore: false });
    cancelNext();
    if (
      disposed ||
      departure ||
      settingsDialog.open ||
      earnedDialog.open ||
      pictureOperation ||
      !Object.hasOwn(departureLabelKeys, kind)
    )
      return;
    if (!unfinished()) {
      if (kind === 'setup') lobby({ revealDifficulty });
      else if (kind === 'retry') {
        try {
          start();
        } catch (error) {
          pictureUI(
            localizedMessage('gameplay:team.pictureAttemptUnchanged', { error: error.message }),
          );
        }
      }
      return;
    }
    const ticket = { kind, opener, run, generation, recipe: currentRecipe() };
    departure = ticket;
    pause();
    if (departure !== ticket) return; // A paint fault cancelled this decision.
    // Already-paused and faulted attempts also shed stale UI/flight input.
    clear();
    localizedText($('coop-discard-title'), () => t('interface:discardThisTeamAttempt'));
    localizedText(
      $('coop-discard-copy'),
      () =>
        `${t(
          installedTeamAttempts.get(run)?.durable
            ? 'interface:team.savedCheckpointDiscard'
            : 'interface:thisUnfinishedAttemptIsNotSavedDiscardingItLosesIts',
        )} ${
          loopStopped
            ? t('interface:stayKeepsThisStoppedAttemptOnScreenItCannotResume')
            : t('interface:stayKeepsBothPlayersPausedResumeTogetherRemainsASeparate')
        } ${
          kind === 'retry'
            ? t('interface:discardAndRetryStartsThisSameArenaAgainFromThe')
            : kind === 'setup'
              ? t('interface:discardAndChangeSetupClearsThisAttemptWithoutStartingAnother')
              : kind === 'catalogue'
                ? t('interface:discardAndSwitchJourneyOpensTheOtherTeamCatalogueAnd')
                : t('interface:discardAndLeaveReturnsToTheLinkedModeAndLoses')
        }`,
    );
    localizedText($('coop-discard-confirm'), () => t(departureLabelKeys[kind]));
    try {
      departureDialog.showModal();
      $('coop-discard-stay').focus({ preventScroll: true });
    } catch (error) {
      closeDeparture(ticket);
      message(
        t(
          loopStopped
            ? 'interface:team.confirmationUnavailableStopped'
            : 'interface:team.confirmationUnavailablePaused',
          { error: error.message },
        ),
      );
    }
  }
  $('coop-discard-stay').onclick = () => cancelDeparture();
  $('coop-discard-confirm').onclick = async () => {
    const ticket = departure;
    if (!ticket || disposed || ticket.run !== run || ticket.generation !== generation) return;
    if (ticket.downloadController) return;
    if (document.hidden || document.hasFocus?.() === false) {
      cancelDeparture({ restore: false });
      return;
    }
    if (ticket.kind === 'discovery') {
      const resolve = ticket.resolve;
      ticket.resolve = null;
      const accepted = ticket.current();
      closeDeparture(ticket, { restore: false });
      resolve?.(accepted && ticket.current());
      return;
    }
    // Keep creation/validation failure inside the old attempt's confirmation.
    let prepared;
    try {
      if (ticket.kind === 'retry') {
        prepared = createTunedCoop(ticket.recipe);
      }
      const destination =
        ticket.kind === 'return'
          ? new URL(returnHref(), location.href).href
          : ticket.kind === 'home'
            ? new URL(homeHref, location.href).href
            : ticket.kind === 'versus'
              ? new URL(versusHref, location.href).href
              : ticket.kind === 'catalogue'
                ? new URL(catalogueHref, location.href).href
                : null;
      if (destination && offlineAvailability().packageConsent) {
        const controller = new AbortController();
        ticket.downloadController = controller;
        await gameplayDownloads.ensureDestination(destination, { signal: controller.signal });
        if (
          controller.signal.aborted ||
          disposed ||
          departure !== ticket ||
          ticket.run !== run ||
          ticket.generation !== generation
        )
          return;
      }
      closeDeparture(ticket, { restore: false });
      if (ticket.kind === 'setup') lobby();
      else if (ticket.kind === 'retry') start(ticket.recipe, prepared);
      else location.assign(destination);
    } catch (error) {
      if (error.name === 'AbortError') return;
      message(t('interface:team.replaceFailed', { error: error.message }));
      if (departure === ticket)
        localizedText($('coop-discard-copy'), () =>
          t(
            installedTeamAttempts.get(run)?.durable
              ? 'interface:team.attemptStillHereSaved'
              : 'interface:team.attemptStillHere',
            { error: error.message },
          ),
        );
      else primary().focus({ preventScroll: true });
    } finally {
      if (departure === ticket) ticket.downloadController = null;
    }
  };
  departureDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    cancelDeparture();
  });
  departureDialog.addEventListener('close', () => {
    if (!departureDialog.open) cancelDeparture();
  });
  departureDialog.addEventListener('keydown', (event) => {
    // Native cancel owns Escape here. The window flight listener would prevent
    // that default even while paused; keep this exception local to the dialog.
    if (event.key === 'Escape') event.stopPropagation();
  });
  for (const [id, kind] of [
    ['coop-race', 'return'],
    ['coop-home', 'home'],
    ['coop-solo', fromSolo ? 'return' : 'home'],
    ['coop-versus', 'versus'],
    ['coop-catalogue', 'catalogue'],
  ])
    $(id).addEventListener('click', (event) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        (event.button !== undefined && event.button !== 0)
      )
        return;
      cancelNext();
      $(id).setAttribute(
        'href',
        kind === 'return'
          ? returnHref()
          : kind === 'versus'
            ? versusHref
            : kind === 'catalogue'
              ? catalogueHref
              : homeHref,
      );
      if (departure || pictureOperation) {
        event.preventDefault();
        return;
      }
      if (!unfinished()) return;
      event.preventDefault();
      requestDeparture(kind, $(id));
    });
  const suspend = () => {
    if (disposed) return;
    cancelJourneySkip();
    music?.suspend();
    discovery?.cancel();
    cancelDiscoveryPreparation();
    if (settingsOwner) settingsOwner.restore = false;
    inactive = true;
    cancelImport();
    pause({ focus: false });
    cancelDeparture({ restore: false });
    // Losing foreground also retires menu ownership while already paused.
    // A reader or held menu repeat must not outlive this lifecycle boundary.
    controllerConfirmGuard.requireNeutral();
    clear();
    framePads = [];
    last = null;
  };
  const returned = () => {
    if (disposed || !foreground()) return;
    // visibilitychange also resets native echo state before this handler runs.
    // Re-establish the lifecycle neutral gate so a controller still held while
    // returning cannot suppress the first deliberate keyboard action after release.
    controllerConfirmGuard.requireNeutral();
    inactive = false;
    last = null;
    if (music && !loopStopped) void music.resume();
    discoveryControls();
  };
  const hidden = () => {
    if (document.hidden) suspend();
    else returned();
  };
  const windowBlur = guardInstallOfflineBlur(suspend);
  window.addEventListener('blur', windowBlur);
  window.addEventListener('focus', returned);
  document.addEventListener('visibilitychange', hidden);
  function events() {
    const feedbackRow = acceptedPicture?.journeyRow;
    music?.sound.events(
      run.events,
      run,
      { family: acceptedPicture?.request.themeId ?? 'fpv' },
      {
        mode: 'team',
        actorStyle: acceptedPicture?.actorAppearance?.style,
        resultContext: candidateJourney?.owns(feedbackRow)
          ? {
              owned: true,
              mode: 'team',
              outcome: run.status,
              missionId: feedbackRow.mission.id,
              feedback: feedbackRow.campaignFeedback,
            }
          : null,
      },
    );
    painter.observe(run);
    const terminalMessage =
      run.status === 'won'
        ? t('interface:teamObjectiveCompleteYourSharedResultIsReady')
        : run.status === 'lost'
          ? t('interface:teamAttemptEndedChooseRetryOrChangeSetup')
          : null;
    // The final step still owns its input cleanup, but its live region must
    // not announce instructions for an attempt that has ended.
    let latestAnnouncement = null;
    const announce = (text, options) => {
      if (!terminalMessage) {
        latestAnnouncement = { text, options };
        message(text, options);
      }
    };
    // Only this owned instructional cue expires on movement. A later threat,
    // bonus, rescue or menu message revokes ownership in message() above.
    if (
      foundationMessage?.run === run &&
      foundationMessage.positions.some(
        ({ id, x, y }) => run.players[id].x !== x || run.players[id].y !== y,
      )
    )
      announce(t('interface:chooseYourNextRouteCloseCutsOnReclaimedGround'));
    const captureTeaching = candidateCaptureTeaching?.(
      acceptedPicture?.journeyRow,
      run,
      run.events,
    );
    const foundationCaption = coopFoundationReturnCaption(run);
    const foundationPlayers = run.events
      .filter((event) => coopFoundationReturnCaption(run, [event]))
      .map((event) => event.player);
    const captureCaption = [
      captureTeaching,
      foundationCaption,
      ...run.events
        .filter((event) => event.type === 'cells.claimed')
        .map((event) => terrainTransitionCaption(run, event)),
    ]
      .filter(Boolean)
      .join(' ');
    // Revivals clear stored knockdowns below. Preserve this step's observed
    // causes first, so immediate shared recovery cannot erase its own reason.
    const recoveryFailures = [...knockdowns];
    for (const event of run.events)
      if (event.type === 'player.downed') recoveryFailures[event.player] = event;
    for (const event of run.events) {
      if (event.type === 'cells.claimed' && captureCaption)
        announce(captureCaption, { foundationPlayers });
      if (event.type === 'cut.closed') {
        input.clearPlayer(event.player);
        batch.release(event.player);
      }
      const roamerCaption = coopRoamerCaption(event);
      if (roamerCaption) announce(roamerCaption);
      const bonusCaption = coopBonusCaption(event, names());
      if (bonusCaption) announce(bonusCaption);
      if (event.type === 'cut.joint')
        announce(
          captureTeaching
            ? t('interface:team.jointCutTeaching', { teaching: captureTeaching })
            : t('interface:jointCutBothLinesAreBankedChooseYourNextRoute'),
        );
      if (event.type === 'player.downed') {
        knockdowns[event.player] = event;
        input.clearPlayer(event.player);
        batch.release(event.player);
        announce(rescueMessage(event));
      }
      if (event.type === 'player.revived') {
        const cause =
          event.reason === 'reserve'
            ? coopRecoveryCause(run, [recoveryFailures[event.player]])
            : '';
        knockdowns[event.player] = null;
        input.clearPlayer(event.player);
        batch.release(event.player);
        announce(() =>
          t('interface:team.playerBack', {
            cause: cause ? `${cause} ` : '',
            player: names()[event.player],
            reserve: event.reason === 'reserve' ? ' ' + t('interface:oneTeamReserveUsed') : '',
          }),
        );
      }
      if (event.type === 'team.recovery') {
        const cause = coopRecoveryCause(run, recoveryFailures);
        announce(() => t('interface:team.bothCraftBack', { cause: cause ? `${cause} ` : '' }));
      }
      if (event.type === 'shield.disabled')
        announce(t('interface:bothAnchorsSecuredNowCaptureTheExposedCoreInA'));
      if (event.type === 'core.defeated')
        announce(t('interface:strongholdDefeatedItsEmitterAndTravellingSparksAreGone'));
      if (event.type === 'support.pulse') {
        if (event.interceptedImpacts?.length)
          announce(() => t('interface:team.sparkIntercepted', { player: names()[event.player] }));
        else if (event.slowedEnemies?.length)
          announce(() => t('interface:team.pressureSlowed', { player: names()[event.player] }));
      }
      if (event.type === 'rescue.completed') {
        input.clearPlayer(event.player);
        batch.release(event.player);
        announce(() => t('interface:team.partnerRescued', { player: names()[event.player] }));
      }
      if (event.type === 'rescue.cancelled' && event.requiresFreshSteering) {
        input.clearPlayer(event.player);
        batch.release(event.player);
        announce(t('interface:rescueInterruptedChooseAFreshDirectionOrHoldSupportNearby'));
      }
    }
    // Terminal presentation suppresses coaching, but the teaching memory must
    // still observe the final authoritative events. A Support pulse can share
    // the winning step and must not become an obsolete prompt on Retry.
    const observedCue = contextualTeaching.observe(
      run.events,
      coopArenaGuidance(run.level, run.config),
    );
    const coachCue = terminalMessage ? null : observedCue;
    if (coachCue) {
      message(
        () => {
          const announcement =
            typeof latestAnnouncement?.text === 'function'
              ? latestAnnouncement.text()
              : latestAnnouncement?.text;
          const teaching = t(coachCue.key, coachCue.values);
          return announcement ? `${announcement} ${teaching}` : teaching;
        },
        { ...(latestAnnouncement?.options ?? {}), coach: coachCue.kind },
      );
    }
    if (terminalMessage) message(terminalMessage);
  }
  const installedPreset = (completedRun) =>
    COOP_PLAYTEST_CONFIGURATIONS.find((candidate) =>
      ['jointCuts', 'assistCaptures', 'advancedCooperation'].every(
        (key) => candidate[key] === completedRun.config[key],
      ),
    );
  function installedPictureReward(picture) {
    const choice = picture?.binding?.choice,
      asset = choice?.picture;
    if (
      choice?.kind !== 'image' ||
      !asset ||
      typeof asset.sha256 !== 'string' ||
      !Number.isSafeInteger(asset.bytes) ||
      !Number.isSafeInteger(asset.width) ||
      !Number.isSafeInteger(asset.height)
    )
      return undefined;
    return {
      kind: 'picture',
      sourceKind: choice.sourceKind ?? 'registered-original',
      sha256: asset.sha256,
      bytes: asset.bytes,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
    };
  }
  function beginInstalledTeamAttempt(currentRun, picture, restored = null) {
    const editionId = picture?.installedEditionId,
      setup = installedPreset(currentRun),
      tuning = attemptTuning.get(currentRun);
    if (
      !installedTeamStore ||
      !editionId ||
      !['full', 'joint'].includes(setup?.id) ||
      !tuning ||
      tuning.adminOverride
    )
      return;
    const progress = installedTeamProgress.get(editionId),
      record = {
        editionId,
        levelId: currentRun.level.id,
        attemptId: restored?.snapshot.attemptId ?? `${libraryVisit}:${picture.request.attemptId}`,
        gameplayId: tuning.gameplayId,
        presetId: setup.id,
        tuning: tuning.tuning,
        segments: structuredClone(restored?.snapshot.segments ?? []),
        generation: restored?.generation ?? progress?.generation,
        lastQueuedTick: restored?.snapshot.checkpoint.tick ?? -1,
        chain: Promise.resolve(),
        failure: null,
        durable: Boolean(restored),
      };
    installedTeamAttempts.set(currentRun, record);
    if (!restored) persistInstalledTeamAttempt(currentRun, picture, { force: true });
  }
  function appendInstalledTeamCommands(currentRun, commands) {
    const record = installedTeamAttempts.get(currentRun);
    if (!record) return;
    const copied = structuredClone(commands),
      previous = record.segments.at(-1);
    if (previous && canonicalJSON(previous.commands) === canonicalJSON(copied)) previous.ticks++;
    else record.segments.push({ ticks: 1, commands: copied });
  }
  function installedAttemptSnapshot(currentRun, record) {
    return createInstalledTeamAttemptSnapshot({
      editionId: record.editionId,
      attemptId: record.attemptId,
      gameplayId: record.gameplayId,
      presetId: record.presetId,
      run: currentRun,
      tuning: record.tuning,
      segments: record.segments,
    });
  }
  function persistInstalledTeamAttempt(currentRun, picture, { force = false } = {}) {
    const record = installedTeamAttempts.get(currentRun);
    if (
      !record ||
      record.failure ||
      currentRun.status !== 'running' ||
      (!force && currentRun.tick - record.lastQueuedTick < 600)
    )
      return;
    const savedRun = installedAttemptSnapshot(currentRun, record);
    record.lastQueuedTick = savedRun.checkpoint.tick;
    record.chain = record.chain.then(async () => {
      if (record.failure) return null;
      try {
        const progress = await installedTeamStore.recordAttempt(savedRun, {
          expectedGeneration: record.generation,
        });
        record.generation = progress.generation;
        record.durable = true;
        installedTeamProgress.set(record.editionId, progress);
        libraryChooser?.refresh();
        return progress;
      } catch (error) {
        record.failure = error;
        if (!disposed && run === currentRun && acceptedPicture === picture)
          message(`Team attempt remains on screen but could not be saved: ${error.message}`);
        return null;
      }
    });
  }
  function clearInstalledTeamAttempt(currentRun, picture) {
    const record = installedTeamAttempts.get(currentRun);
    if (!record || record.failure) return;
    record.chain = record.chain.then(async () => {
      if (record.failure) return null;
      try {
        const progress = await installedTeamStore.clearAttempt({
          editionId: record.editionId,
          levelId: record.levelId,
          attemptId: record.attemptId,
          expectedGeneration: record.generation,
        });
        record.generation = progress.generation;
        installedTeamProgress.set(record.editionId, progress);
        libraryChooser?.refresh();
        return progress;
      } catch (error) {
        record.failure = error;
        if (!disposed && run === currentRun && acceptedPicture === picture)
          message(`Ended Team attempt could not clear its saved checkpoint: ${error.message}`);
        return null;
      }
    });
  }
  function persistInstalledTeamCompletion(completedRun, picture, epoch) {
    const editionId = picture?.installedEditionId;
    const setup = installedPreset(completedRun),
      tuning = attemptTuning.get(completedRun),
      record = installedTeamAttempts.get(completedRun);
    if (
      !installedTeamStore ||
      !editionId ||
      !['full', 'joint'].includes(setup?.id) ||
      !record ||
      record.failure
    )
      return;
    const savedRun = installedAttemptSnapshot(completedRun, record);
    record.chain = record.chain.then(async () => {
      if (record.failure) return null;
      return installedTeamStore.recordCompletion({
        editionId,
        levelId: completedRun.level.id,
        runId: record.attemptId,
        gameplayId: tuning.gameplayId,
        difficulty: completedRun.difficulty,
        presetId: setup.id,
        attempt: savedRun,
        reward: installedPictureReward(picture),
        expectedGeneration: record.generation,
      });
    });
    void record.chain.then(
      (progress) => {
        if (!progress) return;
        record.generation = progress.generation;
        installedTeamProgress.set(editionId, progress);
        libraryChooser?.refresh();
        if (
          !disposed &&
          run === completedRun &&
          generation === epoch &&
          acceptedPicture === picture
        )
          nextStatus(t('interface:missionLibrary.team.progressSaved'));
      },
      (error) => {
        record.failure = error;
        if (
          !disposed &&
          run === completedRun &&
          generation === epoch &&
          acceptedPicture === picture
        )
          nextStatus(
            t('interface:missionLibrary.team.progressSaveFailed', { error: error.message }),
          );
      },
    );
  }
  function update(now) {
    if (disposed) return;
    if (inactive || !foreground()) {
      if (!inactive) suspend();
      frame = requestAnimationFrame(update);
      return;
    }
    try {
      acceptMusic(acceptedPicture);
      if (!loopStopped) {
        music?.sound.feedback(
          running(),
          { family: acceptedPicture?.request.themeId ?? 'fpv' },
          run,
          { mode: 'team', actorStyle: acceptedPicture?.actorAppearance?.style },
        );
        music?.update(running(), { family: acceptedPicture?.request.themeId ?? 'fpv' });
      }
      let readError = null;
      try {
        if (typeof navigator.getGamepads !== 'function') throw new Error('Gamepad API unavailable');
        framePads = [...navigator.getGamepads()];
      } catch (error) {
        framePads = [];
        readError = error;
      }
      framePads = controllerSession.sample(framePads, { active: running(), error: readError }).pads;
      controllerSetup.refresh();
      input.poll();
      const routed = router.sample({ scope: scope(), timeMs: now });
      controllerConfirmGuard.observe(routed.confirmHeld || controllerSession.frame().confirmHeld);
      if (!running()) {
        if (routed.status.code === 'joined' || Object.values(routed.ui).some(Boolean))
          setReadingModality('controller');
        if (routed.status.code === 'joined') navigation.engage();
        navigation.handle(routed.ui);
      }
      const elapsed = last === null ? 0 : (now - last) / 1000;
      last = now;
      if (running() && elapsed > 0.25) pause();
      if (running()) {
        accumulator += elapsed;
        while (accumulator + 1e-9 >= FIXED_DT && running()) {
          const commands = batch.consume(input.consume());
          appendInstalledTeamCommands(run, commands);
          stepCoop(run, commands, FIXED_DT);
          music?.sound.feedback(true, { family: acceptedPicture?.request.themeId ?? 'fpv' }, run, {
            mode: 'team',
            actorStyle: acceptedPicture?.actorAppearance?.style,
            commands,
          });
          accumulator -= FIXED_DT;
          events();
          if (running()) persistInstalledTeamAttempt(run, acceptedPicture);
          if (!running()) {
            const finishedAttempt = run,
              epoch = generation;
            if (run.status === 'won') {
              candidateProgress?.complete(run);
              persistInstalledTeamCompletion(run, acceptedPicture, epoch);
            } else clearInstalledTeamAttempt(run, acceptedPicture);
            if (disposed || run !== finishedAttempt || generation !== epoch) break;
            clear();
            overlay();
          }
        }
      }
      if (!loopStopped) render();
    } catch (error) {
      stopArena(error);
    }
    frame = requestAnimationFrame(update);
  }
  $('coop-start').onclick = () => requestDeparture('retry', $('coop-start'));
  $('coop-retry').onclick = () => requestDeparture('retry', $('coop-retry'));
  $('coop-resume').onclick = resume;
  $('coop-pause').onclick = pause;
  $('coop-lobby').onclick = () => {
    const changeDifficulty = run?.status === 'lost';
    requestDeparture('setup', $('coop-lobby'), {
      revealDifficulty: changeDifficulty,
    });
  };
  $('coop-home-paused').onclick = () => requestDeparture('home', $('coop-home-paused'));
  function supportGuidance(guidance, level) {
    localizedText($('coop-support-help'), () => guidance().supportText);
    localizedText($('coop-help-support'), () =>
      t('gameplay:team.supportHelp', {
        context: coopGroundContext(level),
        support: guidance().supportText,
      }),
    );
  }
  function selectedCandidateRow() {
    const level = selectedLevel();
    return candidateJourney?.rows.find((row) => row.pack === pack && row.level === level) ?? null;
  }
  function difficultyControls(level = selectedLevel()) {
    // Compiled Journey packs are immutable preset editions. Changing this menu
    // selects a newly compiled owned edition, never re-projects imported bytes.
    $('coop-difficulty').disabled =
      Boolean(level.journeyDifficulty) &&
      (Boolean(run) || !candidatePreferences || !selectedCandidateRow());
    if (level.journeyDifficulty) $('coop-difficulty').value = level.journeyDifficulty;
    gameplayTuningPanel?.refresh();
  }
  function setupNote({ level = selectedLevel(), experiment = selectedConfiguration() } = {}) {
    difficultyControls(level);
    const guidance = () => coopArenaGuidance(level, experiment);
    localizedText($('coop-closure-help'), () =>
      t('gameplay:team.closeLoop', { context: coopGroundContext(level) }),
    );
    localizedText($('coop-intro'), () =>
      experiment.jointCuts
        ? t('interface:startWithASmallLoopCoverEachOtherThenMeet')
        : t('gameplay:team.independentIntro', { context: coopGroundContext(level) }),
    );
    localizedText($('coop-cut-title'), () =>
      experiment.jointCuts ? t('interface:joinWhenReady') : t('interface:bringEachLineHome'),
    );
    localizedText($('coop-cut-help'), () =>
      experiment.jointCuts
        ? t('interface:steerBothMovingHeadsTogetherToBankASharedCut')
        : t('gameplay:team.independentCut', { context: coopGroundContext(level) }),
    );
    localizedText($('coop-threat-title'), () => guidance().threatTitle);
    localizedText($('coop-threat-help'), () => guidance().threatText);
    supportGuidance(guidance, level);
    $('coop-stronghold-help').hidden = !guidance().showStrongholds;
    localizedText($('coop-stronghold-title'), () => guidance().strongholdTitle);
    localizedText($('coop-stronghold-copy'), () => guidance().strongholdText);
    localizedText($('coop-menu-goal'), () => coopGoalLabel(level));
    localizedText($('coop-briefing-title'), () => guidance().briefingTitle);
    localizedText($('coop-stage'), () => contentText(level, 'name').toUpperCase());
    refreshGameplayTuningNote(level, experiment);
    localizedText($('coop-setup-note'), () =>
      experiment.advancedCooperation
        ? t('interface:capturesRechargeBothPlayersSupportAndCanRescueADowned')
        : t('interface:comparisonSupportRefillsOnItsTimerRescueByHoldingSupport'),
    );
  }
  function refreshGameplayTuningNote(
    level = selectedLevel(),
    experiment = selectedConfiguration(),
  ) {
    const difficulty = level.journeyDifficulty ?? gameplayPreferences.snapshot().difficulty;
    localizedText($('coop-level-note'), () =>
      t('gameplay:tuning.teamNote', {
        guidance: coopArenaGuidance(level, experiment).levelNote,
        description: gameplayTuningDescription(gameplayTuning.snapshot(difficulty)),
      }),
    );
  }
  function showPackStatus() {
    const candidate = candidateJourney?.rows.find((row) => row.pack === pack);
    const label = () =>
      t('interface:team.packStatus', {
        pack: contentText(pack, 'name'),
        count: pack.levels.length,
        artwork: packArtworkSource ? ` · ${t('interface:team.localArtwork')}` : '',
        validation: candidate
          ? defaultJourney
            ? ` · ${t('interface:team.originalArtwork')}`
            : ` · ${
                candidate.background
                  ? t('interface:originalArtCandidate')
                  : t('interface:geometryTest')
              } · ${t('interface:team.notHumanValidated')}`
          : '',
      });
    packStatus.begin({ message: label }).finish({ message: label });
  }
  function showPack(next, preferred = next.levels[0].id, isCurrent = () => true) {
    if (disposed || !isCurrent()) return;
    pack = next;
    const owns = () => !disposed && pack === next && isCurrent();
    $('coop-level').replaceChildren(
      ...pack.levels.map((level) => {
        const option = document.createElement('option');
        option.value = level.id;
        localizedText(option, () =>
          t(level.goal.cores ? 'gameplay:team.challengeCore' : 'gameplay:team.challengeTerritory', {
            name: contentText(level, 'name'),
          }),
        );
        return option;
      }),
    );
    if (!owns()) return;
    $('coop-level').value = preferred;
    if (!owns()) return;
    showPackStatus();
    if (!owns()) return;
    $('coop-pack-reset').hidden = pack === COOP_STARTER_PACK;
    if (owns()) setupNote();
  }
  async function prepareImport(draft, { retry = false, origin = document.activeElement } = {}) {
    if (
      disposed ||
      inactive ||
      !foreground() ||
      run ||
      pictureOperation ||
      departure ||
      importOperation ||
      importAdopting ||
      artworkImports.pending() ||
      importDraft !== draft
    )
      return;
    const request = ++importRequest,
      controller = new AbortController(),
      focus = pictureFocus(
        origin,
        false,
        () => importDraft === draft || pictureSelection === draft.selection,
      );
    const current = () =>
      !disposed &&
      request === importRequest &&
      importOperation === operation &&
      importDraft === draft &&
      !run &&
      !controller.signal.aborted;
    const display = packStatus.begin({
      message: draft.pack
        ? t('interface:preparingTheImportedTeamPicture')
        : t('interface:readingTheSelectedTeamPack'),
      stage: draft.pack ? 'preparing' : 'reading',
    });
    const operation = { draft, controller, focus, display };
    importOperation = operation;
    importDisplay = display;
    let committed = false;
    $('coop-pack-cancel').hidden = false;
    $('coop-pack-retry').hidden = true;
    try {
      pictureUI();
      if (!draft.pack) {
        if (draft.kind === 'artwork') {
          display.update({
            message: t('interface:checkingTheTeamArtworkBundle'),
            stage: 'verifying',
          });
          if (!current()) return;
          let source;
          try {
            const preparation = artworkImports.prepare(draft.file, {
              signal: controller.signal,
              onProgress: ({ stage, index, total }) => {
                if (!current()) return;
                display.update({
                  message:
                    stage === 'checking-picture'
                      ? t('interface:team.checkingLocalArtwork', {
                          index: index + 1,
                          total,
                        })
                      : stage === 'ready'
                        ? t('interface:localArtworkValidatedPreparingTheSelectedArena')
                        : t('interface:checkingTeamArenasAndArtwork'),
                  stage: 'verifying',
                });
              },
            });
            importControls();
            source = await preparation;
          } finally {
            importControls();
          }
          if (!current()) return;
          draft.artworkSource = source;
          draft.pack = source.pack;
        } else {
          display.update({
            message: t('interface:checkingTeamArenasAndRules'),
            stage: 'verifying',
          });
          if (!current()) return;
          const playable = await readPlayableTeamCampaign(draft.file, {
            signal: controller.signal,
          });
          if (!current()) return;
          draft.pack = playable.pack;
          draft.creatorCampaign = playable.prepared;
          draft.teamMedia = playable.media ?? null;
          if (playable.prepared && installedTeamStore) {
            display.update({
              message: t('interface:missionLibrary.team.installingVerifiedEdition'),
              stage: 'verifying',
            });
            try {
              const installed = await installedTeamStore.install(
                playable.media ?? playable.prepared,
                {
                  signal: controller.signal,
                },
              );
              if (!current()) return;
              draft.installedEditionId = installed.editionId;
              installedTeamGeneration = -1;
            } catch (error) {
              if (error?.name === 'AbortError') throw error;
              draft.installError = error;
            }
          }
        }
        if (!packPicker.open) {
          cancelImport();
          return;
        }
        draft.selection = newPictureSelection(
          { level: draft.pack.levels[0] },
          draft.pack,
          draft.pack,
          draft.artworkSource,
          draft.installedEditionId,
          draft.teamMedia,
        );
      }
      display.update({
        message: t('interface:preparingTheImportedTeamPictureTheSelectedPackStaysAvailable'),
        stage: 'preparing',
      });
      if (!current()) return;
      const snapshot = await (retry ? presentationPage.retry() : presentationPage.ready);
      if (retry && !disposed && snapshot && snapshot === presentationPage.current())
        menuStyle.setPresentation(snapshot);
      if (!current()) return;
      const selection = draft.selection;
      const binding = await selection.lease.select({
        ...selection.request,
        signal: controller.signal,
        onStatus: (status) => {
          if (!current()) return;
          const text = picturePreparationText(status);
          if (text)
            display.update({
              message: t('interface:team.selectedPackUnchanged', { status: text }),
              stage: 'preparing',
            });
        },
      });
      if (!current()) return;
      if (!packPicker.open) {
        cancelImport();
        return;
      }
      selection.lease.confirm(selection.request);
      const previous = {
        pack,
        artworkSource: packArtworkSource,
        selection: pictureSelection,
        level: $('coop-level').value,
        message: pictureMessage,
        difficulty: $('coop-difficulty').value,
      };
      const proposedPack = draft.pack,
        proposedArtwork = draft.artworkSource;
      selection.binding = binding;
      selection.state = 'preparing';
      const rollback = () => {
        if (
          committed ||
          pictureSelection !== selection ||
          pack !== proposedPack ||
          packArtworkSource !== proposedArtwork ||
          run ||
          disposed
        )
          return;
        pictureSelection = previous.selection;
        packArtworkSource = previous.artworkSource;
        $('coop-difficulty').value = previous.difficulty;
        showPack(previous.pack, previous.level);
        pictureUI(previous.message);
      };
      // Publish the validated pack and prepared image together. Keep the previous
      // image alive until the new setup has rendered successfully. No Start can
      // use the tentative selection, including from a reentrant DOM callback.
      const ownsCommitted = () =>
        committed &&
        !disposed &&
        request === importRequest &&
        !run &&
        !importOperation &&
        !importDraft &&
        pictureSelection === selection &&
        pack === proposedPack &&
        packArtworkSource === proposedArtwork;
      pictureSelection = selection;
      importAdopting = operation;
      try {
        packArtworkSource = draft.artworkSource;
        showPack(draft.pack, undefined, current);
        if (!current()) {
          rollback();
          return;
        }
        selection.state = 'ready';
        pictureUI(() =>
          draft.artworkSource
            ? t('interface:localArtworkReadyStartRemainsASeparateAction')
            : draft.installedEditionId
              ? t('interface:missionLibrary.team.campaignInstalled')
              : draft.creatorCampaign
                ? t('interface:missionLibrary.team.campaignSessionOnly', {
                    error:
                      (draft.installError ?? installedTeamStorageError)?.message ??
                      t('interface:missionLibrary.team.storageUnavailable'),
                  })
                : t('interface:importedTeamPictureReadyStartRemainsASeparateAction'),
        );
        if (!current()) {
          rollback();
          return;
        }
        if ($('coop-level').value !== selection.levelId)
          throw new Error(t('interface:theSelectedArenaChangedDuringImportRetryThePack'));
        // Commit and relinquish the old operation without callbacks between
        // them. Once the old source is retired, rollback is no longer valid.
        if (draft.artworkSource) artworkImports.commit(draft.artworkSource);
        else artworkImports.retire(localDiscoveryPack?.artworkSource ?? previous.artworkSource);
        localDiscoveryPack = {
          pack: draft.pack,
          artworkSource: draft.artworkSource,
          installedEditionId: draft.installedEditionId ?? null,
          teamMedia: draft.teamMedia ?? null,
          rows: discoveryRows(
            draft.pack,
            draft.artworkSource,
            `local-${++localDiscoveryRevision}`,
            draft.teamMedia ?? null,
          ).map((row) =>
            Object.freeze({
              ...row,
              installedEditionId: draft.installedEditionId ?? null,
              teamMedia: draft.teamMedia ?? null,
            }),
          ),
        };
        committed = true;
        importOperation = null;
        importDisplay = null;
        importDraft = null;
        importAdopting = null;
      } catch (error) {
        rollback();
        throw error;
      } finally {
        if (importAdopting === operation) importAdopting = null;
        // Reset or disposal can replace the tentative setup inside a host
        // callback. The previous image then has no visible owner to retire it.
        if (
          !current() &&
          pictureSelection !== previous.selection &&
          acceptedPicture !== previous.selection
        )
          previous.selection?.lease?.dispose();
        if (
          (importDraft !== draft || draft.selection !== selection) &&
          pictureSelection !== selection &&
          acceptedPicture !== selection
        )
          selection.lease.dispose();
        // Cancellation restores a usable previous setup after the synchronous
        // Start guard is released. A successful adoption renders below instead.
        if (!committed && !disposed && pictureSelection === previous.selection) pictureUI();
      }
      if (!ownsCommitted()) return;
      $('coop-pack-cancel').hidden = true;
      $('coop-pack-retry').hidden = true;
      $('coop-pack-file').value = '';
      if (!ownsCommitted()) return;
      pictureUI();
      if (ownsCommitted()) focus.finish($('coop-start'));
    } catch (error) {
      if (!current()) return;
      importOperation = null;
      importDisplay = null;
      const detail = String(error.message).trim();
      packStatus.begin({ message: t('interface:teamPackUnavailable') }).finish({
        state: 'error',
        message: t('interface:team.packUnchanged', {
          error: `${detail}${/[.!?]$/.test(detail) ? '' : '.'}`,
        }),
      });
      $('coop-pack-cancel').hidden = true;
      $('coop-pack-retry').hidden = false;
      pictureUI();
      focus.finish($('coop-pack-retry'));
    } finally {
      focus.finish(null, false);
      if (request === importRequest) $('coop-pack-file').value = '';
      importControls();
      if (
        !disposed &&
        draft.kind === 'artwork' &&
        !artworkImports.pending() &&
        importDraft === draft &&
        draft.cancelledRequest === importRequest &&
        !importOperation
      )
        packStatus.begin({ message: t('interface:artworkImportCancelled') }).finish({
          state: 'detached',
          message: t('interface:artworkImportCancelledTheSelectedPackIsUnchangedRetryPack'),
        });
    }
  }
  $('coop-pack-file').onchange = () => {
    if (artworkImports.pending()) {
      $('coop-pack-file').value = '';
      return;
    }
    const file = $('coop-pack-file').files?.[0];
    cancelImport({ forget: true });
    if (!file || run || pictureOperation || departure || disposed) return;
    const kind =
      file.type === COOP_PRESENTATION_MIME || /\.rlteam$/i.test(file.name ?? '')
        ? 'artwork'
        : 'json';
    const draft = {
      file,
      kind,
      pack: null,
      artworkSource: null,
      creatorCampaign: null,
      installedEditionId: null,
      installError: null,
      selection: null,
    };
    importDraft = draft;
    localizedText($('coop-pack-cancel'), () =>
      kind === 'artwork' ? t('interface:cancelImport') : t('common:actions.stopWaiting'),
    );
    return importAdopting
      ? Promise.resolve().then(() => prepareImport(draft))
      : prepareImport(draft);
  };
  $('coop-pack-retry').onclick = () => {
    if (importDraft && !artworkImports.pending())
      return prepareImport(importDraft, { retry: true });
  };
  function stopWaiting() {
    cancelImport();
    $('coop-pack-file').value = '';
    $(artworkImports.pending() ? 'coop-level' : 'coop-pack-file').focus({ preventScroll: true });
  }
  $('coop-pack-cancel').onclick = stopWaiting;
  const pickerToggled = () => {
    if (!packPicker.open) cancelImport();
  };
  packPicker.addEventListener('toggle', pickerToggled);
  $('coop-pack-reset').onclick = () => {
    if (run || departure || pictureOperation || disposed) return;
    cancelImport({ forget: true });
    const previousArtwork = artworkImports.current();
    localDiscoveryPack = null;
    packArtworkSource = null;
    showPack(COOP_STARTER_PACK, lastBuiltInArena);
    void preparePicture();
    artworkImports.retire(previousArtwork);
  };
  $('coop-level').onchange = () => {
    if (run || departure || disposed) return;
    cancelImport({ forget: true });
    if (pack === COOP_STARTER_PACK) {
      lastBuiltInArena = selectedLevel().id;
      arenaPreference.choose(lastBuiltInArena);
    }
    setupNote();
    return preparePicture();
  };
  $('coop-experiment').onchange = setupNote;
  $('coop-difficulty').onchange = () => {
    const previous = selectedCandidateRow(),
      requested = $('coop-difficulty').value;
    if (!selectedLevel().journeyDifficulty && !run && !departure && !disposed && foreground()) {
      gameplayPreferences.choose(requested);
      gameplayTuningPanel?.refresh();
      return;
    }
    if (!previous || !candidatePreferences || run || departure || disposed || !foreground()) {
      difficultyControls();
      return;
    }
    const row = candidateJourney.row(previous.mission, requested);
    if (!row) {
      difficultyControls();
      return;
    }
    const ticket = ++candidatePresetIntent,
      previousPack = pack;
    const current = () =>
      !disposed && !run && !departure && foreground() && ticket === candidatePresetIntent;
    cancelImport({ forget: true });
    if (!current() || pack !== previousPack) return;
    candidateDifficulty = requested;
    candidatePreferences.choose(requested);
    if (!current() || pack !== previousPack) return;
    // Retire the old preset before publishing new setup. Reentrant Start must
    // never pair a new compiled level with the previous edition's image lease.
    retirePicture();
    if (!current() || pack !== previousPack) return;
    pictureUI(localizedMessage('interface:preparingTheSelectedJourneyDifficulty'));
    if (!current() || pack !== previousPack) return;
    packArtworkSource = null;
    showPack(row.pack, row.level.id, current);
    if (!current() || pack !== row.pack) return;
    return preparePicture();
  };
  // The classic entry owns intent before the select becomes interactive.
  // Without that evidence, retain native setup rather than override a choice.
  const validArena = (id) => COOP_STARTER_PACK.levels.some((level) => level.id === id);
  if (!earlySelection || earlySelection.claimed) {
    const selected = earlySelection?.changed ? earlySelection.value : $('coop-level').value;
    lastBuiltInArena = validArena(selected) ? selected : COOP_STARTER_PACK.levels[0].id;
    if (earlySelection?.changed && validArena(selected)) arenaPreference.choose(selected);
  }
  // Keep the existing option nodes and an already-correct native value while a
  // player may have the platform's selector open during module preparation.
  if (incomingLibraryMission) {
    const mission = getTeamLibrary().find(incomingLibraryMission);
    const row = mission && libraryRuntimeRows.get(mission)?.();
    if (!row || !currentDiscoveryRows().includes(row))
      throw new Error(t('interface:theRequestedTeamMissionIsUnavailableInThisEditionOr'));
    showPack(row.pack, row.levelId);
    if (row.pack === COOP_STARTER_PACK) lastBuiltInArena = row.levelId;
  } else if (candidateJourney && !earlySelection?.claimed) {
    const first = candidateJourney.catalog.missions.find((mission) =>
      candidateJourney.isCore(mission.id),
    );
    const row =
      candidateProgress?.initial(candidateDifficulty) ??
      candidateJourney.row(first, candidateDifficulty);
    showPack(row.pack, row.level.id);
  } else if ($('coop-level').value !== lastBuiltInArena) $('coop-level').value = lastBuiltInArena;
  showPackStatus();
  setupNote();
  function renderActorStyle() {
    $('coop-actor-style').value = actorPreferences.snapshot().actorStyle;
    localizedText(
      $('coop-actor-style-note'),
      () =>
        t('gameplay:team.actorStyleNext') +
        (actorPreferences.getWarning() ? ` ${actorPreferences.getWarning()}` : ''),
    );
  }
  let actorRevision = actorPreferences.snapshot().revision;
  const stopActorView = actorPreferences.subscribe((snapshot) => {
    renderActorStyle();
    if (snapshot.revision === actorRevision) return;
    actorRevision = snapshot.revision;
    cancelNext({ announce: false });
    cancelDiscoveryPreparation();
    if (!disposed && !run && !departure && !importOperation && !importAdopting && !importDisplay)
      void preparePicture();
  });
  $('coop-actor-style').onchange = () =>
    actorPreferences.set({ actorStyle: $('coop-actor-style').value });
  gameplayTuning.subscribe(() => refreshGameplayTuningNote());
  if (!candidatePreferences)
    gameplayPreferences.subscribe((snapshot) => {
      if (!run && !selectedLevel().journeyDifficulty)
        $('coop-difficulty').value = snapshot.difficulty;
      gameplayTuningPanel?.refresh();
      refreshGameplayTuningNote();
    });
  $('coop-touch').value = 'auto';
  $('coop-touch').onchange = () => {
    input.clearPhysical();
    showTouch();
    if (running()) input.focus();
  };
  const touchChanged = () => showTouch();
  touchQuery.addEventListener?.('change', touchChanged);
  placeTools(false);
  $('coop-reduced').onchange = () => {
    displayPreferences.set({ reducedEffects: $('coop-reduced').checked });
    if (running()) input.focus();
  };
  let unsubscribeNative = () => {};
  onNativeInactive(suspend)
    .then((unsubscribe) => {
      if (disposed) unsubscribe();
      else unsubscribeNative = unsubscribe;
    })
    .catch((error) => console.error(t('interface:nativeLifecycleUnavailable'), error));
  const dispose = () => {
    if (disposed) return;
    $('coop-field-details').onclick = null;
    installOfflinePanel?.dispose();
    stopActorView();
    actorPreferences.dispose();
    $('coop-actor-style').onchange = null;
    discoveryStarted = null;
    discovery?.dispose();
    cancelDiscoveryPreparation();
    $('coop-discovery-open').onclick = null;
    $('coop-discovery-paused').onclick = null;
    $('coop-home-paused').onclick = null;
    cancelNext({ announce: false });
    $('coop-next').onclick = null;
    $('coop-next-cancel').onclick = null;
    $('coop-journey-skip').onclick = null;
    $('coop-journey-skip-confirm').onclick = null;
    document.removeEventListener('focusin', skipFocusChanged);
    // Retire dialog callbacks before native close or preference disposal can
    // reenter. No terminal cleanup restores focus or resumes the attempt.
    settingsOwner = null;
    settingsVisit++;
    earnedOwner = null;
    $('coop-view-picture').onclick = null;
    $('coop-picture-return').onclick = null;
    earnedDialog.removeEventListener('close', earnedClosed);
    earnedDialog.removeEventListener('cancel', earnedCancelled);
    earnedDialog.removeEventListener('keydown', settingsKeydown);
    if (earnedDialog.open) earnedDialog.close();
    releaseTeamStory();
    earnedCanvas.width = earnedCanvas.height = 0;
    $('coop-settings-open').onclick = null;
    $('coop-settings-close').onclick = null;
    settingsDialog.removeEventListener('cancel', cancelSettings);
    settingsDialog.removeEventListener('close', settingsClosed);
    settingsDialog.removeEventListener('keydown', settingsKeydown);
    settingsPanels.destroy();
    nativeMenu?.destroy();
    if (settingsDialog.open) settingsDialog.close();
    // The shared page may already have retired its painter snapshot. Stop the
    // core without repainting during terminal cleanup. BFCache uses suspend.
    if (running()) pauseCoop(run);
    cancelImport({ forget: true });
    cancelDeparture({ restore: false });
    retirePicture();
    acceptedPicture?.lease?.dispose();
    acceptedPicture = null;
    artworkImports.dispose();
    packArtworkSource = null;
    localDiscoveryPack = null;
    presentationPage.close();
    closeAudio();
    closeDisplay();
    journeyReactions.dispose();
    journeyPictures?.dispose();
    arenaPreference.dispose();
    installedTeamStore?.close();
    installedTeamStore = null;
    candidateProgress?.dispose();
    candidatePreferences?.dispose();
    if (!candidatePreferences) gameplayPreferences.dispose();
    gameplayTuningPanel?.dispose();
    gameplayTuning.dispose();
    candidatePreferenceRestoration?.dispose();
    importRequest++;
    disposed = true;
    packStatus.dispose();
    packPicker.removeEventListener('toggle', pickerToggled);
    cancelAnimationFrame(frame);
    clear();
    couchTouch.destroy();
    controllerSetup.dispose();
    controllerSession.dispose();
    input.destroy();
    controllerConfirmGuard.destroy();
    router.destroy();
    reading.destroy();
    navigation.destroy();
    touchQuery.removeEventListener?.('change', touchChanged);
    window.removeEventListener('resize', revealMenuAction);
    window.removeEventListener('blur', windowBlur);
    window.removeEventListener('focus', returned);
    window.removeEventListener('pageshow', returned);
    document.removeEventListener('visibilitychange', hidden);
    unsubscribeNative();
  };
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) {
      dispose();
      return;
    }
    cancelImport();
    suspend();
  });
  window.addEventListener('pageshow', returned);
  const journeySaveCue = attachJourneySaveCue({
    document,
    target: $('coop-pause'),
    action: $('coop-journey-save-options'),
    announcement: $('coop-journey-save-announcement'),
    onOpen() {
      if (disposed || running()) return;
      const target = $('coop-journey-save').hidden ? primary() : $('coop-journey-save-retry');
      if (visibleAction(target)) target.focus();
    },
  });
  function attachJourneyRecovery(owner, prefix, labelKey, filename) {
    let exportSequence = 0;
    owner?.subscribe(({ ready = true, durable, error }) => {
      if (disposed) return;
      if (prefix === 'coop-journey-save') journeySaveCue.update({ ready, durable, error });
      const notice = $(prefix),
        focus = document.activeElement,
        ownedFocus = !notice.hidden && notice.contains(focus),
        attempt = run,
        epoch = generation;
      notice.hidden = !ready || durable || !error;
      if (disposed) return;
      localizedText($(`${prefix}-message`), () =>
        error ? t('interface:team.sessionOnly', { label: t(labelKey), error }) : '',
      );
      if (
        ownedFocus &&
        notice.hidden &&
        !disposed &&
        foreground() &&
        !running() &&
        run === attempt &&
        generation === epoch &&
        (document.activeElement === focus || unclaimedFocus(document.activeElement))
      ) {
        const target = primary();
        if (visibleAction(target)) target.focus({ preventScroll: true });
      }
    });
    $(`${prefix}-retry`).onclick = () => {
      if (!disposed) {
        exportSequence++;
        void owner?.retry();
      }
    };
    $(`${prefix}-export`).onclick = async () => {
      if (disposed || !owner) return;
      const ticket = ++exportSequence;
      try {
        const result = await exportJSONFile(JSON.parse(owner.export()), filename);
        if (!disposed && ticket === exportSequence && !$(prefix).hidden)
          localizedText($(`${prefix}-message`), () =>
            t('interface:team.sessionOnlyResult', {
              label: t(labelKey),
              result: renderMessage(result.message),
            }),
          );
      } catch (error) {
        if (!disposed && ticket === exportSequence && !$(prefix).hidden)
          localizedText($(`${prefix}-message`), () =>
            t('interface:team.exportFailed', { error: error.message }),
          );
      }
    };
  }
  attachJourneyRecovery(
    candidateProgress,
    'coop-journey-save',
    'interface:teamJourneyProgress',
    candidateProgress?.backupFilename ?? 'revealline-journey-progress.json',
  );
  attachJourneyRecovery(
    candidatePreferences,
    'coop-journey-preferences',
    'interface:journeyDifficulty',
    'revealline-journey-difficulty.json',
  );
  candidatePreferenceRestoration = candidatePreferences
    ? attachPreferenceRestoration({
        window,
        getSnapshot: () => (run ? attemptLevel : selectedLevel()),
        render: (level) => {
          if (!disposed) difficultyControls(level);
        },
      })
    : null;
  $('coop-start').disabled = false;
  localizedText($('coop-start'), () => t('interface:startTogether'));
  localizedText($('coop-advanced-note'), () => {
    if (defaultJourney) return t('interface:couch.originalPicturesConnection');
    if (!candidateJourney) return '';
    const edition = renderMessage(candidateEditionLabel);
    return t(
      candidateJourney.rows.some((row) => row.background)
        ? 'interface:couch.teamArtTest'
        : 'interface:couch.teamGeometryTest',
      {
        count: candidateJourney.catalog.missions.length,
        edition: edition ? `${edition} · ` : '',
        notice: candidatePreferences ? '' : renderMessage(candidateNotice),
      },
    ).trim();
  });
  bootDisplay.finish({
    message: () =>
      candidateJourney
        ? t('interface:couch.teamJourneyNotice', {
            count: candidateJourney.catalog.missions.length,
          })
        : t('interface:twoPlayersOneScreenASharedVictory'),
  });
  document.documentElement.dataset.toolState = 'ready';
  startPermitted = !$('coop-start').disabled;
  let handoffOpening = null;
  const incomingAutoStart =
    incomingLibraryMission && initialFocusPending && !earlySelection?.claimed;
  const handoffPack = pack,
    handoffLevel = $('coop-level').value,
    handoffGeneration = generation;
  const preparation = preparePicture({
    initial: initialFocusPending,
    passive: true,
    origin: initialFocusPending ? document.activeElement : null,
    onPrepared(selection) {
      if (
        !incomingLibraryMission ||
        !handoffOpening?.current() ||
        disposed ||
        inactive ||
        !foreground() ||
        run ||
        departure ||
        settingsDialog.open ||
        discovery.isOpen() ||
        generation !== handoffGeneration ||
        pack !== handoffPack ||
        $('coop-level').value !== handoffLevel ||
        pictureSelection !== selection ||
        selection.levelId !== handoffLevel
      )
        return false;
      handoffOpening.dispose();
      try {
        start();
      } catch (error) {
        pictureUI(localizedMessage('gameplay:team.pictureCouldNotStart', { error: error.message }));
      }
      return Boolean(run);
    },
  });
  if (incomingAutoStart) handoffOpening = trackMissionLibraryOpening({ document });
  void preparation.finally(() => handoffOpening?.dispose());
  if (
    initialFocusPending &&
    !pictureOperation &&
    unclaimedFocus(document.activeElement) &&
    foreground()
  )
    navigation.focusAvailable();
  initialFocusPending = false;
  frame = requestAnimationFrame(update);
  return { dispose };
}

try {
  document.addEventListener('focusin', initialFocusChoice, true);
  document.addEventListener('visibilitychange', initialVisibility);
  window.addEventListener('blur', initialWindowBlur);
  const journeyRequest = resolveJourneyRequest(new URL(location.href).searchParams, {
    mode: 'team',
  });
  let candidateEntry;
  if (journeyRequest === "coupa-all") {
    const { createStandaloneTeamEntry } = await import('../editions/standalone/team-entry.mjs');
    candidateEntry = await createStandaloneTeamEntry(journeyRequest);
  } else if (
    [
      'team-greybox',
      'team-originals',
      'team-pressure-originals-1',
      'team-spatial-originals-1',
      'team-trail-impact-originals-1',
      'team-specialist-originals-1',
      'team-complete-specialist-originals-1',
      'team-cultural-specialist-originals-1',
      'team-cultural-specialist-originals-2',
    ].includes(journeyRequest)
  ) {
    const { createTeamGreyboxEntry } = await import('../content-design/team-entry.mjs');
    candidateEntry = await createTeamGreyboxEntry({
      artwork: journeyRequest === 'team-originals',
      pressure: journeyRequest === 'team-pressure-originals-1',
      spatial: journeyRequest === 'team-spatial-originals-1',
      impact: journeyRequest === 'team-trail-impact-originals-1',
      specialist: journeyRequest === 'team-specialist-originals-1',
      reviewedSpecialists: journeyRequest === 'team-complete-specialist-originals-1',
      culturalSpecialists: journeyRequest === 'team-cultural-specialist-originals-1',
      culturalSpecialistsV2: journeyRequest === 'team-cultural-specialist-originals-2',
      reviewCopy: new URL(location.href).searchParams.has('journey'),
    });
  } else if (
    ['team-timed-originals', 'team-window-spatial-1', 'team-depot-spatial-1'].includes(
      journeyRequest,
    )
  ) {
    const { createTeamTimedEntry } = await import('../content-design/team-timed-entry.mjs');
    candidateEntry = await createTeamTimedEntry({
      spatial: journeyRequest === 'team-window-spatial-1',
      depot: journeyRequest === 'team-depot-spatial-1',
    });
  }
  bootCoop(candidateEntry);
} catch (error) {
  document.documentElement.dataset.toolState = 'error';
  bootDisplay.finish({
    state: 'error',
    message: localizedMessage('interface:team.startFailed', { error: error.message }),
  });
  console.error(error);
} finally {
  initialFocusPending = false;
  document.removeEventListener('focusin', initialFocusChoice, true);
  document.removeEventListener('visibilitychange', initialVisibility);
  window.removeEventListener('blur', initialWindowBlur);
}
