import { t, localizedMessage } from '../i18n/index.mjs';

/** Optional authoring controls. The existing panel owns every draft, save and media operation. */
export function createSoundtrackAuthoringView({
  node,
  input,
  button,
  options,
  row,
  section,
  advancedSection,
  genreNames,
  catalogue,
  download,
  actions,
}) {
  const tracksSelect = input('tracks', localizedMessage('interface:tracks'), {
    tag: 'select',
    size: '7',
  });
  const fileInput = input('mp3-files', localizedMessage('interface:addMp3Files'), {
    type: 'file',
    accept: '.mp3,audio/mpeg',
    multiple: '',
  });
  const importButton = button(
    'import-mp3',
    localizedMessage('interface:importSelectedMp3s'),
    actions.importButton,
  );
  const collectionTitle = input('collection-title', localizedMessage('interface:playlistTitle'), {
    maxlength: '120',
  });
  const collectionGenre = input(
    'collection-genre',
    localizedMessage('interface:primaryMusicFamily'),
    { tag: 'select' },
  );
  options(collectionGenre.element, [['', t('interface:unclassified')], ...genreNames]);
  const collectionFiles = input('collection-files', localizedMessage('interface:addMp3Files'), {
    type: 'file',
    accept: '.mp3,audio/mpeg',
    multiple: '',
  });
  const collectionFolder = input(
    'collection-folder',
    localizedMessage('interface:chooseMp3Folder'),
    {
      type: 'file',
      accept: '.mp3,audio/mpeg',
      multiple: '',
      webkitdirectory: '',
      directory: '',
    },
  );
  const collectionSummary = node('p', 'collection-summary', '', {
    class: 'micro-note',
    role: 'status',
    'aria-live': 'polite',
  });
  const reviewCollection = button(
    'review-collection',
    localizedMessage('interface:reviewAsPlaylist'),
    actions.reviewCollection,
  );
  const savePlayCollection = button(
    'save-play-collection',
    localizedMessage('interface:saveCollectionAndPlay'),
    actions.savePlayCollection,
  );
  const trackTitle = input('track-title', localizedMessage('interface:trackTitle'), {
    maxlength: '120',
  });
  const trackArtist = input('track-artist', localizedMessage('interface:artist'), {
    maxlength: '160',
  });
  const rightsKind = input('rights-kind', localizedMessage('interface:sourceDeclaration'), {
    tag: 'select',
  });
  options(rightsKind.element, [
    ['personal', t('interface:personalLocalUpload')],
    ['original', t('interface:originalWork')],
    ['licensed', t('interface:licensedWork')],
  ]);
  const rightsCredit = input('rights-credit', localizedMessage('interface:credit'), {
    maxlength: '280',
  });
  const rightsLicense = input('rights-license', localizedMessage('interface:licensePermission'), {
    maxlength: '280',
  });
  const rightsSource = input('rights-source', localizedMessage('interface:sourceProvenance'), {
    maxlength: '1024',
  });
  const trackGenre = input('track-genre', localizedMessage('interface:primaryMusicFamily'), {
    tag: 'select',
  });
  const trackFusion = input('track-fusion', localizedMessage('interface:fusionWith'), {
    tag: 'select',
  });
  options(trackGenre.element, [['', t('interface:unclassified')], ...genreNames]);
  options(trackFusion.element, [['', t('interface:noSecondFamily')], ...genreNames]);
  const trackRole = input('track-role', localizedMessage('interface:useIn'), { tag: 'select' });
  options(trackRole.element, [
    ['any', t('interface:anyScene')],
    ['menu', t('interface:menus')],
    ['gameplay', t('interface:gameplay')],
    ['intense', t('interface:finalesHighIntensity')],
  ]);
  const trackEnergy = input('track-energy', localizedMessage('interface:energy1Calm5Intense'), {
    type: 'number',
    min: '1',
    max: '5',
  });
  const trackThemes = input(
    'track-themes',
    localizedMessage('interface:worldsCommaSeparatedRetroFpvUkraineCoupa'),
    { maxlength: '160' },
  );
  const tagFields = section(
    t('interface:musicalCharacter'),
    trackGenre.field,
    trackFusion.field,
    trackRole.field,
    trackEnergy.field,
    trackThemes.field,
  );
  tagFields.hidden = !catalogue;
  const trackInfo = node('p', 'track-info', '', { class: 'micro-note' });
  const trackSources = node('div', 'track-sources');
  const downloadTrack = button(
    'download-track',
    localizedMessage('interface:prepareOriginalMp3Download'),
    actions.downloadTrack,
  );
  const discoveryRecording = button(
    'discovery-recording',
    localizedMessage('interface:soundtrack.discoveryRecording'),
    actions.discoveryRecording,
  );
  const applyTrack = button(
    'apply-track',
    localizedMessage('interface:applyTrackDetailsToDraft'),
    actions.applyTrack,
  );
  const deleteTrack = button(
    'delete-track',
    localizedMessage('interface:removeTrackFromDraft'),
    actions.deleteTrack,
  );
  const audition = node('audio', 'audition', null, {
    controls: '',
    preload: 'metadata',
    'aria-label': localizedMessage('interface:importedTrackAudition'),
  });

  audition.hidden = true;
  const auditionButton = button(
    'audition-track',
    localizedMessage('interface:auditionMp3'),
    actions.auditionButton,
  );
  const stopAuditionButton = button(
    'stop-audition',
    localizedMessage('interface:finishAudition'),
    actions.stopAuditionButton,
  );
  const auditionSeek = input('audition-seek', localizedMessage('interface:auditionPosition'), {
    type: 'range',
    min: '0',
    max: '0',
    step: '0.5',
  });
  const auditionVolume = input('audition-volume', localizedMessage('interface:auditionVolume'), {
    type: 'range',
    min: '0',
    max: '1',
    step: '0.05',
  });
  const toggleAudition = button(
    'toggle-audition',
    localizedMessage('interface:pauseAudition'),
    actions.toggleAudition,
  );
  const auditionStatus = node('p', 'audition-status');
  const auditionSources = node('div', 'audition-sources');

  const auditionControls = section(
    localizedMessage('interface:auditionControls'),
    row(toggleAudition),
    auditionSeek.field,
    auditionVolume.field,
  );
  auditionControls.hidden = true;
  const tracksSection = advancedSection(
    'library',
    t('interface:addEditMusic'),
    t('interface:uploadMp3sEditCreditsAndAuditionTracks'),
    node('p', null, localizedMessage('interface:batchImportKeepsOriginalMp3BytesEachFileMustBe'), {
      class: 'micro-note',
    }),
    section(
      t('interface:privateCollectionQuickAdd'),
      node('p', null, localizedMessage('interface:privateCollectionQuickAddDescription'), {
        class: 'micro-note',
      }),
      collectionTitle.field,
      collectionGenre.field,
      collectionFiles.field,
      collectionFolder.field,
      row(reviewCollection, savePlayCollection),
      collectionSummary,
    ),
    fileInput.field,
    importButton,
    tracksSelect.field,
    trackInfo,
    trackSources,
    downloadTrack,
    discoveryRecording,
    node('p', null, localizedMessage('interface:soundtrack.discoveryHelp'), {
      class: 'micro-note',
    }),
    trackTitle.field,
    trackArtist.field,
    rightsKind.field,
    rightsCredit.field,
    rightsLicense.field,
    rightsSource.field,
    tagFields,
    row(applyTrack, deleteTrack),
    auditionStatus,
    auditionSources,
    row(auditionButton, stopAuditionButton),
    audition,
    auditionControls,
  );
  const playlistsSelect = input('playlists', localizedMessage('interface:playlists'), {
    tag: 'select',
    size: '5',
  });
  const playlistTitle = input('playlist-title', localizedMessage('interface:playlistTitle'), {
    maxlength: '120',
  });
  const order = input('order', localizedMessage('interface:playbackOrder'), { tag: 'select' });
  options(order.element, [
    ['ordered', t('interface:inOrder')],
    ['shuffle', t('interface:shuffleWithoutRepeatsUntilEveryEntryPlayed')],
  ]);
  const repeat = input('repeat', localizedMessage('interface:repeat'), { tag: 'select' });
  options(repeat.element, [
    ['all', t('interface:repeatAll')],
    ['one', t('interface:repeatOne')],
    ['off', t('interface:stopAtTheEnd')],
  ]);
  const entries = input('entries', localizedMessage('interface:playlistEntries'), {
    tag: 'select',
    size: '7',
  });
  const addTrack = input('add-track', localizedMessage('interface:trackToAdd'), { tag: 'select' });
  const createPlaylist = button(
    'create-playlist',
    localizedMessage('interface:newPlaylistWithSelectedTrack'),
    actions.createPlaylist,
  );
  const clonePlaylist = button(
    'clone-playlist',
    localizedMessage('interface:cloneSelectedPlaylist'),
    actions.clonePlaylist,
  );
  const applyPlaylist = button(
    'apply-playlist',
    localizedMessage('interface:applyPlaylistDetailsToDraft'),
    actions.applyPlaylist,
  );
  const appendEntry = button(
    'add-entry',
    localizedMessage('interface:addSelectedTrack'),
    actions.appendEntry,
  );

  const up = button('entry-up', localizedMessage('interface:moveEntryUp'), actions.up);
  const down = button('entry-down', localizedMessage('interface:moveEntryDown'), actions.down);
  const removeEntry = button(
    'remove-entry',
    localizedMessage('interface:removeSelectedEntry'),
    actions.removeEntry,
  );
  const deletePlaylist = button(
    'delete-playlist',
    localizedMessage('interface:removePlaylistFromDraft'),
    actions.deletePlaylist,
  );
  const playlistSection = advancedSection(
    'playlists',
    t('interface:createPlaylists'),
    t('interface:orderShuffleAndRepeatYourOwnSelections'),
    playlistsSelect.field,
    row(createPlaylist, clonePlaylist),
    playlistTitle.field,
    order.field,
    repeat.field,
    applyPlaylist,
    entries.field,
    row(up, down, removeEntry),
    addTrack.field,
    appendEntry,
    deletePlaylist,
  );
  const scope = input('scope', localizedMessage('interface:assignSelectedPlaylistTo'), {
    tag: 'select',
  });
  options(scope.element, [
    ['global', t('interface:wholeGame')],
    ['theme', t('interface:currentTheme')],
    ['campaign', t('interface:currentCampaignEdition')],
    ['map', t('interface:currentMapEdition')],
  ]);
  const key = node('p', 'context-key', '', { class: 'micro-note' });
  const assignments = input('assignments', localizedMessage('interface:savedDraftedAssignments'), {
    tag: 'select',
    size: '4',
  });
  const assign = button(
    'assign',
    localizedMessage('interface:assignPlaylistToThisContext'),
    actions.assign,
  );
  const unassign = button(
    'unassign',
    localizedMessage('interface:removeSelectedAssignment'),
    actions.unassign,
  );
  const assignmentSection = advancedSection(
    'assignments',
    t('interface:matchMusicToWorlds'),
    t('interface:mapCampaignAndThemeAssignments'),
    node(
      'p',
      null,
      localizedMessage('interface:theseExactEditionKeysComeFromTheGameChooseAutomatic'),
      { class: 'micro-note' },
    ),
    scope.field,
    key,
    assign,
    assignments.field,
    unassign,
  );
  const bundleInput = input(
    'bundle-file',
    localizedMessage('interface:soundtrackRecoveryOrAlbumFileRlsound'),
    {
      type: 'file',
      accept: '.rlsound,application/octet-stream',
    },
  );
  const bundleImport = button(
    'import-bundle',
    localizedMessage('interface:reviewBackupAsReplacementDraft'),
    actions.bundleImport,
  );
  const bundleExport = button(
    'export-bundle',
    localizedMessage('interface:prepareSavedLibraryBackupRlsound'),
    actions.bundleExport,
  );
  const shareImport = button(
    'add-share',
    localizedMessage('interface:addAlbumFileToDraft'),
    actions.shareImport,
  );
  const shareExport = button(
    'export-share',
    localizedMessage('interface:prepareSelectedPlaylistAsAlbum'),
    actions.shareExport,
  );
  shareImport.hidden = !catalogue;
  shareExport.hidden = !catalogue;
  // A real link allows the browser's native keyboard/touch download behavior.
  // Injected native adapters receive their own button, invoked before any await.
  const bundleDownload = node(
    typeof download === 'function' ? 'button' : 'a',
    'download-prepared',
    localizedMessage('interface:downloadPreparedBackup'),
    { class: 'button secondary', ...(typeof download === 'function' ? { type: 'button' } : {}) },
  );
  bundleDownload.onclick = actions.bundleDownload;
  const discardBackup = button(
    'discard-backup',
    localizedMessage('interface:discardPreparedCopy'),
    actions.discardBackup,
  );
  const backupInfo = node('p', 'backup-info', '', { class: 'micro-note' });
  const backupReady = node('div', 'backup-ready', null, { class: 'soundtrack-backup-ready' });
  backupReady.append(backupInfo, row(bundleDownload, discardBackup));
  const transferSection = advancedSection(
    'backup',
    t('interface:backupsAlbumFiles'),
    t('interface:importExportAndRestoreRlsoundFiles'),
    node(
      'p',
      null,
      localizedMessage(
        'interface:thisSeparateSoundtrackFileContainsPermittedPersonalInstalledAndExplicitly',
      ),
      { class: 'micro-note' },
    ),
    row(bundleExport),
    backupReady,
    bundleInput.field,
    bundleImport,
    shareImport,
    shareExport,
  );
  return {
    tracksSelect,
    fileInput,
    collectionTitle,
    collectionGenre,
    collectionFiles,
    collectionFolder,
    collectionSummary,
    savePlayCollection,
    trackTitle,
    trackArtist,
    rightsKind,
    rightsCredit,
    rightsLicense,
    rightsSource,
    trackGenre,
    trackFusion,
    trackRole,
    trackEnergy,
    trackThemes,
    trackInfo,
    trackSources,
    downloadTrack,
    discoveryRecording,
    applyTrack,
    deleteTrack,
    audition,
    auditionButton,
    stopAuditionButton,
    auditionSeek,
    auditionVolume,
    toggleAudition,
    auditionStatus,
    auditionSources,
    auditionControls,
    tracksSection,
    playlistsSelect,
    playlistTitle,
    order,
    repeat,
    entries,
    addTrack,
    applyPlaylist,
    appendEntry,
    up,
    down,
    removeEntry,
    deletePlaylist,
    playlistSection,
    scope,
    key,
    assignments,
    assign,
    unassign,
    assignmentSection,
    bundleInput,
    bundleExport,
    bundleDownload,
    discardBackup,
    backupInfo,
    backupReady,
    transferSection,
  };
}
