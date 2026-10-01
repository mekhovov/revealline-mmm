import { t } from '../i18n/index.mjs';
import { contentText } from '../i18n/content.mjs';

// Worker reports retain their canonical diagnostics. Resolve presentation from
// protocol identities, including older workers that only report an outcome.
const messages = Object.freeze({
  bundled: 'interface:offline.bundled',
  development: 'interface:offline.development',
  unsupported: 'interface:offline.unsupported',
  connecting: 'interface:offline.connecting',
  checking: 'interface:offline.checking',
  downloading: 'interface:offline.downloading',
  saving: 'interface:offline.saving',
  verifying: 'interface:offline.verifying',
  ready: 'interface:offline.ready',
  waiting: 'interface:offline.waiting',
  coreVerified: 'interface:offline.coreVerified',
  stillRunning: 'interface:offline.stillRunning',
  unconfirmed: 'interface:offline.unconfirmed',
  prepareFirst: 'interface:offline.prepareFirst',
  downloadFailed: 'errors:offline.downloadFailed',
  workerChanged: 'errors:offline.workerChanged',
  workerMismatch: 'errors:offline.workerMismatch',
  differentBuild: 'errors:offline.differentBuild',
  unconfirmedBuild: 'errors:offline.unconfirmedBuild',
  verificationFailed: 'errors:offline.verificationFailed',
});
const outcomes = Object.freeze({
  ready: 'interface:offline.coreVerified',
  waiting: 'interface:offline.waiting',
  'still-running': 'interface:offline.stillRunning',
  unconfirmed: 'interface:offline.unconfirmed',
  'not-ready': 'errors:offline.verificationFailed',
  error: 'errors:offline.downloadFailed',
});
export function offlineStatusText(status) {
  const key =
    messages[status.messageCode] ||
    (['preparing', 'checking'].includes(status.status)
      ? messages[status.stage]
      : outcomes[status.status]);
  const message = key ? t(key) : (status.reason ?? status.summary ?? status.message ?? '');
  return status.verified > 0
    ? t('interface:offline.verifiedSummary', {
        message,
        verified: t('interface:offline.verifiedFiles', { count: status.verified }),
      })
    : message;
}
export function offlineErrorText(error) {
  return t(messages[error?.offlineCode] || 'errors:offline.downloadFailed');
}
export function offlineOptionalText(availability) {
  // Injected/legacy availability providers may supply their own authored note.
  if (!Array.isArray(availability.optionalPacks)) return availability.note ?? '';
  const parts = [];
  if (availability.optionalPacks.length)
    parts.push(
      t('interface:offline.optionalPacks', {
        count: availability.optionalPacks.length,
        names: availability.optionalPacks.map((pack) => contentText(pack, 'name')).join(', '),
      }),
    );
  if (availability.optionalArtwork)
    parts.push(
      t('interface:offline.optionalArtwork', {
        name: t(
          availability.optionalArtwork.name === 'Opening Journey artwork'
            ? 'interface:offline.openingArtwork'
            : 'interface:offline.journeyArtwork',
        ),
      }),
    );
  return parts.join(' ');
}
