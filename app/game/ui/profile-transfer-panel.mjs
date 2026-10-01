import { localizedMessage, localizedText, t, localizedAttribute } from '../i18n/index.mjs';
import { reviewInstalledMigration, recordInstalledMigration } from '../installed-app.mjs';
import { discoverProfileTransfers, prepareProfileTransfer } from '../profile-transfer.mjs';

/** Explicit same-origin release copy. Source validation is read-only; all target
 * mutations use the library panel's existing complete-backup transaction. */
export function attachProfileTransferPanel({
  api,
  container,
  backupOptions,
  task,
  applyPrepared,
  setStatus,
}) {
  if (!api.profileTransfer) return null;
  const node = (tag, text, attrs = {}) => {
    const element = document.createElement(tag);
    if (text) localizedText(element, () => text);
    for (const [key, value] of Object.entries(attrs)) {
      if (['aria-label', 'title', 'placeholder', 'alt'].includes(key))
        localizedAttribute(element, key, value);
      else element.setAttribute(key, value);
    }
    return element;
  };
  const details = node('details', null, { id: 'profile-transfer' });
  const summary = node('summary', localizedMessage('interface:bringProgressFromAnEarlierRelease'));
  const explanation = node(
    'p',
    localizedMessage('interface:copyACollectionSavedByAnEarlierReleaseInThis2'),
    { id: 'transfer-explanation', class: 'micro-note' },
  );
  const source = node('select', null, {
    id: 'transfer-source',
    'aria-label': localizedMessage('interface:earlierRelease'),
  });
  const review = node('button', localizedMessage('interface:reviewSavedProgress'), {
    id: 'transfer-review',
    type: 'button',
    class: 'button secondary',
  });
  const copy = node('button', localizedMessage('interface:copyReviewedProgress'), {
    id: 'transfer-copy',
    type: 'button',
    class: 'button primary',
  });
  const cancel = node('button', localizedMessage('interface:cancelCheck'), {
    id: 'transfer-cancel',
    type: 'button',
    class: 'button secondary',
    hidden: '',
  });
  const preview = node('p', null, { id: 'transfer-preview' });
  const status = node('p', null, { id: 'transfer-status', role: 'status' });
  const fallback = node(
    'p',
    localizedMessage('interface:anotherBrowserAddressDeviceOrNativeAppNeedsExportGame'),
    { class: 'micro-note' },
  );
  details.append(summary, explanation, source, review, copy, cancel, preview, status, fallback);
  container.append(details);
  const report =
    setStatus ||
    ((message) => {
      localizedText(status, () => message);
    });
  let reviewed = null,
    checking = false,
    controller = null,
    checkSerial = 0;

  function showPreview(value) {
    const p = { ...value.preview, missingPackIds: [...value.preview.missingPackIds] },
      sourceVersion = value.source.version,
      currentVersion = api.profileTransfer.currentVersion;
    localizedText(preview, () =>
      t('gameplay:completedMapsPicturesScoreRecordsCampaignsPacks', {
        value1: sourceVersion,
        value2: currentVersion,
        value3: p.completedLevels,
        value4: p.pictures,
        value5: p.scores,
        value6: p.campaigns,
        value7: p.packs,
        value8: p.hasSession
          ? t('interface:profileTransfer.savedFlight')
          : t('interface:profileTransfer.noSavedFlight'),
        value9: p.profileAbsent
          ? '' + t('interface:thisReleaseHasASavedFlightButNoSavedPlayer') + ' '
          : '',
        value10: p.missingPackIds.length
          ? t('gameplay:someCollectedPicturesNeedRemovedPacksTheirRecordsWillBe', {
              value1: p.missingPackIds.join(', '),
            })
          : '',
      }),
    );
  }
  function refresh() {
    if (checking) return;
    try {
      const selected = source.value;
      const candidates = discoverProfileTransfers(api.profileTransfer);
      source.replaceChildren(
        ...candidates.map(({ id, version, legacy, channel }) => {
          const duplicateVersion = candidates.filter((c) => c.version === version).length > 1;
          const option = node('option', () =>
            t('gameplay:needsReview', {
              value1: version,
              value2: legacy
                ? t('interface:profileTransfer.legacySuffix')
                : duplicateVersion
                  ? ` (${channel})`
                  : '',
            }),
          );
          option.value = id;
          return option;
        }),
      );
      if (candidates.some((c) => c.id === selected)) source.value = selected;
      if (reviewed?.source.id !== source.value) {
        reviewed = null;
        localizedText(preview, () => '');
      }
      source.disabled = review.disabled = !candidates.length;
      copy.disabled = !reviewed;
      if (!candidates.length)
        report(localizedMessage('interface:noCompatibleEarlierCollectionWasFoundAtThisAddressUse'));
    } catch (error) {
      source.disabled = review.disabled = copy.disabled = true;
      report(error.message, 'error');
    }
  }
  source.onchange = () => {
    reviewed = null;
    localizedText(preview, () => '');
    report(localizedMessage('interface:reviewThisSourceBeforeCopying'));
    copy.disabled = true;
  };
  cancel.onclick = () => {
    controller?.abort();
    report(
      localizedMessage('interface:checkCancelledWaitingForItsCurrentReadToSettle'),
      'cancelled',
    );
  };
  async function check(andCopy) {
    await task('transfer-status', async (operation) => {
      const request = ++checkSerial;
      checking = true;
      controller = operation.controller;
      cancel.hidden = false;
      cancel.disabled = false;
      operation.phase(
        localizedMessage('interface:checkingTheEarlierCollectionImagesAndSavedFlight'),
      );
      try {
        const options = await backupOptions();
        operation.check();
        const fresh = await prepareProfileTransfer(source.value, {
          ...api.profileTransfer,
          ...options,
          signal: controller.signal,
        });
        operation.check();
        const unchanged =
          reviewed &&
          reviewed.source.id === fresh.source.id &&
          reviewed.fingerprint === fresh.fingerprint;
        reviewed = fresh;
        showPreview(fresh);
        if (!andCopy || !unchanged) {
          report(
            andCopy
              ? localizedMessage('interface:theSourceChangedSinceYourReviewTheSummaryIsUpdated')
              : localizedMessage(
                  'interface:verifiedCopyReplacesThisReleaseSCollectionWithTheReviewed',
                ),
          );
          return;
        }
        controller = null;
        cancel.disabled = true;
        cancel.hidden = true;
        operation.phase(localizedMessage('interface:preparingTheVerifiedCollectionCopy'));
        const installedReview = api.profileTransfer.installedApp
          ? await reviewInstalledMigration(
              fresh.source.version,
              api.profileTransfer.currentVersion,
              api.profileTransfer,
            )
          : null;
        const result = await applyPrepared(fresh.prepared, operation, {
          verifySource: async () => {
            operation.phase(
              localizedMessage('interface:recheckingTheEarlierReleaseBeforeReplacement'),
            );
            const latest = await prepareProfileTransfer(fresh.source.id, {
              ...api.profileTransfer,
              ...options,
              signal: operation.signal,
            });
            operation.check();
            if (latest.fingerprint !== fresh.fingerprint) {
              reviewed = latest;
              showPreview(latest);
              throw new Error(
                t('interface:theEarlierReleaseChangedDuringReplacementReviewNothingWasCopied'),
              );
            }
          },
        });
        operation.check();
        await recordInstalledMigration(installedReview, api.profileTransfer);
        const sourceVersion = fresh.source.version,
          undoMessage = result.undo
            ? 'interface:undoGameDataImportRestoresThePreviousCollection'
            : 'interface:thePreviousCollectionCouldNotFormAVerifiedBackupUndo',
          hasSession = fresh.preview.hasSession,
          warning = result.warning || '';
        report(
          () =>
            `${t('interface:profileTransfer.copiedFrom', { version: sourceVersion })} ${t(undoMessage)} ${hasSession ? t('interface:yourSavedFlightIsReadyToLoadPaused') : ''} ${warning}`,
        );
        reviewed = null;
      } finally {
        if (request === checkSerial) {
          controller = null;
          cancel.hidden = true;
          cancel.disabled = true;
          checking = false;
        }
      }
    });
  }
  review.onclick = () => check(false);
  copy.onclick = () => check(true);
  refresh();
  return { refresh };
}
