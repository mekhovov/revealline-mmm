import { installedPresentation } from '../installed-app.mjs';

const controllers = new WeakMap();
export function captureInstallPrompt(win = globalThis.window) {
  if (!win?.addEventListener) return null;
  if (controllers.has(win)) return controllers.get(win);
  let prompt = null;
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());
  win.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    prompt = event;
    notify();
  });
  win.addEventListener('appinstalled', () => {
    prompt = null;
    notify();
  });
  const controller = Object.freeze({
    available: () => Boolean(prompt),
    installed: () => installedPresentation(win, win.navigator),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async request() {
      if (!prompt) return { outcome: 'unavailable' };
      const event = prompt;
      prompt = null;
      notify();
      await event.prompt();
      return event.userChoice ? await event.userChoice : { outcome: 'requested' };
    },
  });
  controllers.set(win, controller);
  return controller;
}

export function installInstructions(navigatorRef = globalThis.navigator) {
  const agent = navigatorRef?.userAgent || '';
  const appleMobile =
    /iPad|iPhone|iPod/.test(agent) || (/Macintosh/.test(agent) && navigatorRef?.maxTouchPoints > 1);
  if (appleMobile)
    return {
      platform: 'apple-mobile',
      steps: [
        'Tap Share in Safari.',
        'Choose Add to Home Screen, enable Open as Web App if offered, then tap Add.',
        'Open the new FPV / LINE icon, then choose your offline download inside the app.',
      ],
      note: 'Safari and the Home Screen app have separate game storage. Download inside the app you will use. Export and import a complete backup to bring your browser progress.',
    };
  if (/Macintosh/.test(agent) && /Safari/.test(agent) && !/Chrome|Chromium|Edg/.test(agent))
    return {
      platform: 'safari-desktop',
      steps: [
        'Open Safari’s File menu.',
        'Choose Add to Dock, then open FPV / LINE from the Dock.',
      ],
      note: 'Installing the icon and downloading game content are separate. Your download choice is verified automatically.',
    };
  return {
    platform: 'browser',
    steps: [
      'Use Install app when your browser offers it.',
      'Otherwise open the browser menu and look for Install app or Add to Home Screen. You can also keep playing here.',
    ],
    note: 'This browser may not support app installation. Downloaded gameplay still works offline in a supported browser.',
  };
}

// The packaged page imports this before the game host finishes starting.
captureInstallPrompt();
