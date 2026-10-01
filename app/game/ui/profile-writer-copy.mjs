import { t } from '../i18n/index.mjs';

const reasons = Object.freeze({
  unavailable: 'common:storage.writerUnavailable',
  occupied: 'common:storage.writerOccupied',
  'invalid-key': 'common:storage.writerInvalidKey',
  released: 'common:storage.writerReleased',
});

/** A presentation of the existing lease, never a lock request or save action. */
export function profileWriterMessage(writer) {
  return reasons[writer?.reasonCode] ? t(reasons[writer.reasonCode]) : writer?.reason || '';
}
