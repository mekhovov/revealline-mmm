import { t, localizedText } from '../i18n/index.mjs';
import { createOperationStatus } from './operation-status.mjs';

/** Standalone read-only controls; the injected reader exposes no write/restore operation. */
export function attachProfileRecoveryView({
  document: doc = globalThis.document,
  reader,
  createURL = (blob) => URL.createObjectURL(blob),
  revokeURL = (url) => URL.revokeObjectURL(url),
  onBack = () => {},
  supportedChannels = [],
  catalogIssue = '',
  presenter = createOperationStatus(doc.getElementById('profile-recovery-status')),
} = {}) {
  const $ = (id) => doc.getElementById(`profile-recovery-${id}`);
  let channels = [],
    review = null,
    active = null,
    serial = 0,
    closed = false,
    closing = null,
    url = null,
    originals = [],
    verified = null;
  const originalURLs = new Map();
  const supported = new Set(supportedChannels);
  const choice = () =>
    /^\d+$/.test($('original').value) ? originals[Number($('original').value)] : null;
  const status = (message, state = 'ready') => {
    const lease = active?.lease ?? presenter.begin({ message });
    lease.finish({ message, state });
  };
  const phase = (message) => active?.lease.update({ message });
  function clearDownload() {
    if (url) revokeURL(url);
    url = null;
    $('download').removeAttribute('href');
    $('download').hidden = true;
  }
  function clearOriginalDownload(id) {
    const previous = originalURLs.get(id);
    if (previous) revokeURL(previous);
    originalURLs.delete(id);
    $(id).removeAttribute('href');
    $(id).hidden = true;
  }
  function clearVerification() {
    verified = null;
    clearOriginalDownload('original-download');
    clearOriginalDownload('report-download');
    showOriginal();
  }
  function clearOriginals() {
    clearVerification();
    originals = [];
    $('original').replaceChildren();
    $('original').value = '';
    localizedText($('original-summary'), () => '');
  }
  function refresh() {
    $('find').disabled = !!active || closed;
    $('channel').disabled = !!active || closed || !channels.length;
    $('review').disabled = !!active || closed || !channels.length;
    $('export').disabled = !!active || closed || !review;
    $('cancel').disabled = !active;
    $('cancel').hidden = !active;
    $('originals-review').disabled =
      !!active || closed || !review || !supported.has(review.channel.id);
    $('original').disabled = !!active || closed || !originals.length;
    $('original-verify').disabled =
      !!active || closed || choice()?.availability !== 'available-unverified';
    $('original-file').disabled = !!active || closed || !verified;
    $('original-report').disabled = !!active || closed || !verified;
  }
  async function task(fn, { clearRaw = true, origin = null } = {}) {
    if (active || closed) return;
    const ownedOriginFocus =
      origin && doc.activeElement === origin && !doc.hidden && doc.hasFocus?.() !== false;
    const operation = {
      id: ++serial,
      controller: new AbortController(),
      returnFocusAllowed: true,
    };
    active = operation;
    operation.lease = presenter.begin({
      message: t('interface:checkingStoredProfileData'),
      isCurrent: () => !closed && active === operation,
    });
    if (clearRaw) clearDownload();
    refresh();
    // Disabling a focused action can make the browser move focus to body.
    // Hand it to the current Cancel only within this same foreground action.
    if (
      ownedOriginFocus &&
      active === operation &&
      !closed &&
      !doc.hidden &&
      doc.hasFocus?.() !== false &&
      [origin, doc.body].includes(doc.activeElement)
    )
      $('cancel').focus();
    const current = () => !closed && active === operation && !operation.controller.signal.aborted;
    try {
      await fn(operation.controller.signal, current);
    } catch (error) {
      if (current()) status(error.message, 'error');
    } finally {
      if (active === operation) {
        const hadCancelFocus = doc.activeElement === $('cancel');
        active = null;
        refresh();
        if (
          !closed &&
          !doc.hidden &&
          doc.hasFocus?.() !== false &&
          operation.returnFocusAllowed &&
          hadCancelFocus
        ) {
          const target =
            ownedOriginFocus && origin !== $('find') && !origin.disabled
              ? origin
              : $('review').disabled
                ? $('find')
                : $('review');
          target.focus();
        }
      }
    }
  }
  function cancel() {
    if (!active) return;
    if (doc.hidden || doc.hasFocus?.() === false) active.returnFocusAllowed = false;
    active.controller.abort();
    status(t('interface:checkCancelledStoredProfilesAreUnchanged'), 'cancelled');
  }
  function showReview(value) {
    const fields = [];
    fields.push(`Exact channel: ${value.channel.id}`);
    if (value.profile.status === 'valid-structure')
      fields.push(
        `${value.profile.completedLevels} completed levels · ${value.profile.pictures} pictures · ${value.profile.scores} scores`,
      );
    else fields.push(`Profile: ${value.profile.status.replaceAll('-', ' ')}`);
    fields.push(
      `Saved flight: ${value.saved.status.replaceAll('-', ' ')}. Flight inspection is unavailable here.`,
    );
    fields.push(t('interface:mediaAndOriginalAvailabilityHaveNotBeenInspected'));
    if (value.recoveryPending)
      fields.push(t('interface:pendingRecoveryDataIsPreservedThisScreenCannotRepairIt'));
    for (const issue of value.diagnostics) fields.push(`${issue.component}: ${issue.message}`);
    localizedText($('summary'), () => fields.join('\n'));
  }
  $('find').onclick = () =>
    task(
      async (signal, current) => {
        review = null;
        clearOriginals();
        phase(t('interface:findingExactProfileChannels'));
        const result = await reader.discover({ signal });
        if (!current()) return;
        channels = result.channels;
        $('channel').replaceChildren();
        for (const [index, channel] of channels.entries()) {
          const option = doc.createElement('option');
          option.value = String(index);
          localizedText(
            option,
            () =>
              `${channel.version ?? t('interface:development')} · ${channel.id}${channel.support === 'protected-unknown' ? ' · unverified channel' : ''}`,
          );
          $('channel').append(option);
        }
        $('channel').value = channels.length ? '0' : '';
        localizedText($('summary'), () =>
          result.diagnostics.map((item) => item.message).join('\n'),
        );
        status(
          channels.length
            ? `${channels.length} exact channels found. Choose one and review its stored values.`
            : t('interface:noSupportedProfileChannelsFoundOnThisOrigin'),
        );
      },
      { origin: $('find') },
    );
  $('channel').onchange = () => {
    if (active || closed) return;
    review = null;
    clearOriginals();
    clearDownload();
    localizedText($('summary'), () => '');
    status(t('interface:chooseReviewToInspectThisChannel'));
    refresh();
  };
  $('review').onclick = () =>
    task(
      async (signal, current) => {
        review = null;
        clearOriginals();
        const selected = channels[Number($('channel').value)];
        if (!selected) throw new Error(t('interface:chooseAnExactProfileChannel'));
        phase(t('interface:reviewingStoredValues'));
        const result = await reader.review(selected, { signal });
        if (!current()) return;
        review = result;
        showReview(result);
        status(t('interface:storedValuesReviewedProfileStructureIsCheckedSeparatelyFromMedia'));
      },
      { origin: $('review') },
    );
  $('export').onclick = () =>
    task(
      async (signal, current) => {
        phase(t('interface:recheckingTheReviewedProfileBeforeExport'));
        const result = await reader.exportStoredData(review, { signal });
        if (!current()) return;
        url = createURL(result.blob);
        if (!current()) {
          clearDownload();
          return;
        }
        $('download').href = url;
        $('download').download = result.filename;
        localizedText($('download'), () =>
          result.completeStoredSnapshot
            ? t('interface:downloadStoredProfileSnapshot')
            : t('interface:downloadIncompleteDiagnostic'),
        );
        $('download').hidden = false;
        status(
          result.completeStoredSnapshot
            ? t('interface:snapshotPreparedItContainsStoredProfileDataWithoutOriginalMedia')
            : t('interface:incompleteDiagnosticPreparedUnsupportedComponentsRemainInStorageAndAre'),
        );
        if (
          !doc.hidden &&
          doc.hasFocus?.() !== false &&
          [$('export'), $('cancel')].includes(doc.activeElement)
        )
          $('download').focus();
      },
      { origin: $('export') },
    );
  function showOriginal() {
    const selected = choice();
    for (const [index, option] of Array.from($('original').children).entries()) {
      const item = originals[index];
      localizedText(
        option,
        () =>
          `${item.asset.id} · ${
            verified && item === selected
              ? 'verified during review'
              : item.availability.replaceAll('-', ' ')
          }`,
      );
    }
    if (!selected) {
      localizedText($('original-summary'), () => '');
      return;
    }
    const { asset } = selected;
    localizedText(
      $('original-summary'),
      () =>
        `${asset.id} · ${asset.width} × ${asset.height} · ${asset.bytes} bytes\n` +
        `SHA-256: ${asset.sha256}\n${selected.references.length} stored presentation references. ` +
        (verified
          ? t('interface:imageBytesAndDimensionsVerifiedDuringThisReviewFilePreparation')
          : selected.availability === 'available-unverified'
            ? t('interface:bytesAreAvailableButHaveNotBeenVerified')
            : selected.availability === 'missing'
              ? t('interface:theOriginalFileIsMissingVerificationIsUnavailable')
              : t('interface:storedLengthDiffersVerificationIsUnavailable')),
    );
  }
  $('originals-review').onclick = () =>
    task(
      async (signal, current) => {
        clearOriginals();
        if (!review || !supported.has(review.channel.id))
          throw new Error(t('interface:noTrustedCatalogIsPackagedForThisExactChannelRaw'));
        phase(t('interface:checkingSharedOriginalMetadataAndExactChannelIdentity'));
        const result = await reader.reviewOriginals(review, { signal });
        if (!current()) return;
        originals = result.originals;
        for (const [index, item] of originals.entries()) {
          const option = doc.createElement('option');
          option.value = String(index);
          localizedText(
            option,
            () => `${item.asset.id} · ${item.availability.replaceAll('-', ' ')}`,
          );
          $('original').append(option);
        }
        $('original').value = originals.length ? '0' : '';
        showOriginal();
        status(
          `${originals.length} shared originals listed. These are not proof of pictures earned by this profile.` +
            (originals.length === 0
              ? ' ' + t('interface:builtInPicturesComeFromGameFilesAndAreNot') + ''
              : '') +
            (result.diagnostics.length
              ? ` ${result.diagnostics.length} stored media availability issues remain.`
              : ''),
        );
      },
      { clearRaw: false, origin: $('originals-review') },
    );
  $('original').onchange = () => {
    if (active || closed) return;
    clearVerification();
    showOriginal();
    refresh();
  };
  $('original-verify').onclick = () =>
    task(
      async (signal, current) => {
        clearVerification();
        const selected = choice();
        if (selected?.availability !== 'available-unverified')
          throw new Error(t('interface:chooseAnAvailableOriginalFile'));
        phase(t('interface:verifyingImageDecodingDimensionsHashingBytesAndRecheckingIdentity'));
        const result = await reader.verifyOriginal(selected, { signal });
        if (!current()) return;
        verified = result;
        showOriginal();
        status(t('interface:selectedImageVerifiedPrepareEitherFileThenActivateItsDownload'));
      },
      { clearRaw: false, origin: $('original-verify') },
    );
  function exportOriginal(component, id) {
    return task(
      async (signal, current) => {
        clearOriginalDownload(id);
        if (!verified)
          throw new Error(t('interface:verifyTheSelectedOriginalBeforePreparingAFile'));
        phase(t('interface:recheckingAndVerifyingFreshSelectedBytesBeforePreparingThisFile'));
        const result = await reader.exportOriginalComponent(verified, { component, signal });
        if (!current()) return;
        const next = createURL(result.blob);
        if (!current()) {
          revokeURL(next);
          return;
        }
        originalURLs.set(id, next);
        $(id).href = next;
        $(id).download = result.filename;
        $(id).hidden = false;
        status(t('interface:filePreparedActivateItsDownloadLinkToSaveItBrowser'));
        if (
          !doc.hidden &&
          doc.hasFocus?.() !== false &&
          [$('original-file'), $('original-report'), $('cancel')].includes(doc.activeElement)
        )
          $(id).focus();
      },
      {
        clearRaw: false,
        origin: $(component === 'original-file' ? 'original-file' : 'original-report'),
      },
    );
  }
  $('original-file').onclick = () => exportOriginal('original-file', 'original-download');
  $('original-report').onclick = () => exportOriginal('identity-report', 'report-download');
  $('cancel').onclick = cancel;
  const view = {
    cancel,
    close() {
      if (closing) return closing;
      closed = true;
      serial++;
      cancel();
      clearDownload();
      clearOriginals();
      refresh();
      closing = (async () => reader.close())();
      return closing;
    },
  };
  $('back').onclick = async () => {
    const lease = presenter.begin({ message: t('interface:closingRecoveryAndReleasingItsReads') });
    try {
      await view.close();
      await onBack();
    } catch (error) {
      lease.finish({
        message: `Recovery cleanup did not finish: ${error.message}`,
        state: 'error',
      });
    }
  };
  status(t('interface:chooseFindProfilesToInspectStoredChannelNames'));
  localizedText($('catalog-status'), () =>
    catalogIssue
      ? `Original verification unavailable: ${catalogIssue} Raw profile diagnostics remain available.`
      : `Original verification supports ${supportedChannels.join(', ') || 'no channels in this release'}. Other channels retain raw diagnostics only.`,
  );
  refresh();
  return view;
}
