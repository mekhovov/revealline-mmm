import { getLocale, onLocaleChange } from '../i18n/index.mjs';

const copy = {
  en: {
    label: 'Mono effects and voices',
    help: 'Combines game effects, menu sounds and character voices into both channels. Music and videos keep their original audio.',
    inactive: 'Applies when game sound starts.',
    mono: 'Effects and voices are mixed into both channels.',
    unsupported: 'This browser could not confirm the requested channel setting.',
    saved: 'Saved',
    retry: 'Retry saving',
    full: 'Session only: browser storage is full.',
    blocked: 'Session only: browser storage is blocked.',
    unavailable: 'Session only: browser storage is unavailable.',
    unconfirmed: 'Session only: the browser did not confirm the saved choice.',
    preserved: 'Session only: an unreadable or newer saved choice was kept.',
  },
  uk: {
    label: 'Моно для ефектів і голосів',
    help: 'Поєднує ігрові ефекти, звуки меню та голоси персонажів в обох каналах. Музика й відео зберігають початкове звучання.',
    inactive: 'Діятиме, коли почнеться ігровий звук.',
    mono: 'Ефекти й голоси поєднано в обох каналах.',
    unsupported: 'Цей браузер не підтвердив вибране налаштування каналів.',
    saved: 'Збережено',
    retry: 'Зберегти повторно',
    full: 'Лише в цьому сеансі: сховище браузера заповнене.',
    blocked: 'Лише в цьому сеансі: сховище браузера заблоковане.',
    unavailable: 'Лише в цьому сеансі: сховище браузера недоступне.',
    unconfirmed: 'Лише в цьому сеансі: браузер не підтвердив збереження вибору.',
    preserved: 'Лише в цьому сеансі: нечитабельний або новіший збережений вибір залишено без змін.',
  },
};
let serial = 0;

/** One presentation setting; neither opening nor changing it starts playback. */
export function mountGameplayAudioControls({
  output,
  container,
  document: doc = container?.ownerDocument ?? globalThis.document,
  idPrefix = 'gameplay-audio',
} = {}) {
  if (
    !output ||
    !container ||
    !doc?.createElement ||
    container.querySelector('[data-gameplay-audio]')
  )
    return () => {};
  const group = doc.createElement('div'),
    label = doc.createElement('label'),
    enabled = doc.createElement('input'),
    title = doc.createElement('span'),
    help = doc.createElement('p'),
    status = doc.createElement('p'),
    retry = doc.createElement('button');
  const id = `${idPrefix}-${++serial}`;
  group.dataset.gameplayAudio = '';
  group.style.display = 'grid';
  group.style.gap = '0.5rem';
  group.style.minWidth = '0';
  label.style.display = 'flex';
  label.style.alignItems = 'center';
  label.style.gap = '0.6rem';
  enabled.type = 'checkbox';
  enabled.id = `${id}-enabled`;
  enabled.style.width = 'auto';
  enabled.style.flexShrink = '0';
  enabled.style.margin = '0';
  help.id = `${id}-help`;
  status.id = `${id}-status`;
  help.style.margin = status.style.margin = '0';
  help.style.overflowWrap = status.style.overflowWrap = 'anywhere';
  enabled.setAttribute('aria-describedby', `${help.id} ${status.id}`);
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  retry.type = 'button';
  retry.style.whiteSpace = 'normal';
  label.append(enabled, title);
  group.append(label, help, status, retry);
  container.append(group);
  let state = output.snapshot(),
    edited = false,
    disposed = false;
  const render = () => {
    if (disposed) return;
    const words = copy[getLocale()] ?? copy.en;
    const restoreFocus = retry === doc.activeElement && state.durable;
    enabled.checked = state.monoEffects;
    title.textContent = words.label;
    help.textContent = words.help;
    retry.textContent = words.retry;
    retry.hidden = !state.pending;
    const runtime =
      state.status === 'unsupported'
        ? words.unsupported
        : state.monoEffects
          ? (words[state.status] ?? '')
          : '';
    const persistence = state.durable
      ? edited
        ? words.saved
        : ''
      : (words[state.reason] ?? words.unavailable);
    status.textContent = [runtime, persistence].filter(Boolean).join(' ');
    status.hidden = !status.textContent;
    if (restoreFocus) enabled.focus();
  };
  const change = () => {
    edited = true;
    output.choose(enabled.checked);
  };
  const retrySave = () => {
    edited = true;
    output.retry();
  };
  enabled.addEventListener('change', change);
  retry.addEventListener('click', retrySave);
  const stop = output.subscribe((next) => {
    state = next;
    render();
  });
  const stopLocale = onLocaleChange(render);
  return () => {
    if (disposed) return;
    disposed = true;
    stop();
    stopLocale();
    enabled.removeEventListener('change', change);
    retry.removeEventListener('click', retrySave);
    group.remove();
  };
}
