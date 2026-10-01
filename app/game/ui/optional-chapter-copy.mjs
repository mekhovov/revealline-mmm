import { t } from '../i18n/index.mjs';

// Complete sentences retain each host's grammatical context; internal attempt
// names never become translated state or content identifiers.
const messages = Object.freeze({
  keptPaused: {
    flight: 'interface:chapters.keptPaused.flight',
    race: 'interface:chapters.keptPaused.race',
  },
  recoveryPlay: {
    flight: 'interface:chapters.recoveryPlay.flight',
    race: 'interface:chapters.recoveryPlay.race',
  },
  recoveryChoose: {
    flight: 'interface:chapters.recoveryChoose.flight',
    race: 'interface:chapters.recoveryChoose.race',
  },
  restoredPlay: {
    flight: 'interface:chapters.restoredPlay.flight',
    race: 'interface:chapters.restoredPlay.race',
  },
  restoredChoose: {
    flight: 'interface:chapters.restoredChoose.flight',
    race: 'interface:chapters.restoredChoose.race',
  },
  installedPair: {
    flight: 'interface:chapters.installedPair.flight',
    race: 'interface:chapters.installedPair.race',
  },
  picturesPlay: {
    flight: 'interface:chapters.picturesPlay.flight',
    race: 'interface:chapters.picturesPlay.race',
  },
  picturesChoose: {
    flight: 'interface:chapters.picturesChoose.flight',
    race: 'interface:chapters.picturesChoose.race',
  },
  picturesCancelled: {
    flight: 'interface:chapters.picturesCancelled.flight',
    race: 'interface:chapters.picturesCancelled.race',
  },
  cancellationRequested: {
    flight: 'interface:chapters.cancellationRequested.flight',
    race: 'interface:chapters.cancellationRequested.race',
  },
  operationCancelled: {
    flight: 'interface:chapters.operationCancelled.flight',
    race: 'interface:chapters.operationCancelled.race',
  },
  playInstructions: {
    flight: 'interface:chapters.playInstructions.flight',
    race: 'interface:chapters.playInstructions.race',
  },
  installInstructions: {
    flight: 'interface:chapters.installInstructions.flight',
    race: 'interface:chapters.installInstructions.race',
  },
  reopenPlay: {
    flight: 'interface:chapters.reopenPlay.flight',
    race: 'interface:chapters.reopenPlay.race',
  },
  reopenInstall: {
    flight: 'interface:chapters.reopenInstall.flight',
    race: 'interface:chapters.reopenInstall.race',
  },
  installedPlay: {
    flight: 'interface:chapters.installedPlay.flight',
    race: 'interface:chapters.installedPlay.race',
  },
  installedChoose: {
    flight: 'interface:chapters.installedChoose.flight',
    race: 'interface:chapters.installedChoose.race',
  },
});
export function chapterMessage(key, attempt = 'flight', values = {}) {
  const message = messages[key][attempt === 'race' ? 'race' : 'flight'];
  return () => t(message, typeof values === 'function' ? values() : values);
}
