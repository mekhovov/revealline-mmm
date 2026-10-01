import { t } from '../i18n/index.mjs';

export function flightPictureFailure(error, { paused = false } = {}) {
  if (error?.name === 'ReleasePictureWriteRequiredError') return t('errors:picture.writeRequired');
  return paused ? t('errors:picture.unavailablePaused') : t('errors:picture.unavailable');
}

export function flightPictureStatus(status) {
  return status.messageKey ? t(status.messageKey) : status.message;
}
