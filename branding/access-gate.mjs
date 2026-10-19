(async () => {
  const host = globalThis;
  const doc = host.document;
  // Community entries replace the document with the shared game host. The
  // Window and Document survive document.write(), but their root is new.
  if (!doc || host.RevealLineAccess?.documentElement === doc.documentElement) return;
  const documentElement = doc.documentElement;

  const meta = (name) => doc.querySelector(`meta[name="${name}"]`)?.content || '';
  const config = Object.freeze({
    id: meta('revealline-access-id'),
    title: meta('revealline-access-title') || 'RevealLine',
    salt: meta('revealline-access-salt'),
    verifier: meta('revealline-access-verifier'),
    iterations: 150000,
  });
  const storageKey = `revealline.access.${config.id}.v1`;
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  let resolveScriptsReady;
  const scriptsReady = new Promise((resolve) => {
    resolveScriptsReady = resolve;
  });
  const access = Object.freeze({
    ready,
    scriptsReady,
    storageKey,
    documentElement,
  });
  host.RevealLineAccess = access;
  const current = () => doc.documentElement === documentElement && host.RevealLineAccess === access;

  const storage = {
    read() {
      try {
        return host.localStorage?.getItem(storageKey) || '';
      } catch {
        return '';
      }
    },
    write(value) {
      try {
        host.localStorage?.setItem(storageKey, value);
      } catch {
        // Private browsing and hardened storage policies may make remembering unavailable.
      }
    },
  };
  // Protected HTML keeps executable scripts inert until the shared unlock succeeds.
  // Restore attributes (including currentScript data) and parser order; modules and
  // deferred classics run after the ordinary classics, once the document is ready.
  const scriptLabel = (script) => {
    if (!script.src) return 'inline module';
    try {
      const url = new URL(script.src, doc.baseURI);
      // Keep credentials, query strings, fragments and inline data out of diagnostics.
      if (['https:', 'http:', 'file:'].includes(url.protocol)) return url.pathname.slice(0, 200);
    } catch {
      // A malformed URL must still leave a usable recovery action.
    }
    return 'external script';
  };
  const startPage = async () => {
    const scripts = [...doc.querySelectorAll('script[data-access-type]')];
    const deferred = (node) => node.dataset.accessType === 'module' || node.hasAttribute('defer');
    const ordered = [...scripts.filter((node) => !deferred(node)), ...scripts.filter(deferred)];
    for (const [index, original] of ordered.entries()) {
      if (!current()) return;
      const script = doc.createElement('script');
      for (const { name, value } of original.attributes) {
        if (!['type', 'data-access-type'].includes(name)) script.setAttribute(name, value);
      }
      if (original.dataset.accessType) script.type = original.dataset.accessType;
      script.async = false;
      script.textContent = original.textContent;
      const loaded =
        script.src || script.type === 'module'
          ? new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = () =>
                reject(
                  new Error(
                    `Could not load script ${index + 1} of ${ordered.length}: ${scriptLabel(script)}. Reload the page to try again.`,
                  ),
                );
            })
          : Promise.resolve();
      original.replaceWith(script);
      await loaded;
    }
    if (current()) resolveScriptsReady(true);
  };
  const unlock = () => {
    if (!current()) return;
    documentElement.dataset.accessState = 'unlocked';
    resolveReady(true);
    doc.dispatchEvent(new CustomEvent('revealline-access-unlocked', { detail: { id: config.id } }));
    startPage().catch((error) => {
      if (!current()) return;
      documentElement.dataset.accessState = 'failed';
      const recovery = doc.createElement('section');
      recovery.id = 'access-gate';
      recovery.className = 'access-gate';
      recovery.setAttribute('role', 'alert');
      const card = doc.createElement('div');
      card.className = 'access-gate-card';
      const title = doc.createElement('h1');
      title.textContent = 'The page could not load';
      const message = doc.createElement('p');
      message.textContent = String(error?.message || 'Reload the page to try again.').slice(0, 400);
      const reload = doc.createElement('button');
      reload.type = 'button';
      reload.textContent = 'Reload page';
      reload.addEventListener('click', () => {
        if (!current() || reload.disabled) return;
        reload.disabled = true;
        // Earlier scripts may have executed. Restart the document, never the script list.
        host.location.reload();
      });
      card.append(title, message, reload);
      recovery.append(card);
      doc.body.prepend(recovery);
      reload.focus();
    });
  };

  if (doc.readyState === 'loading')
    await new Promise((resolve) =>
      doc.addEventListener('DOMContentLoaded', resolve, { once: true }),
    );
  if (!current()) return;

  if (config.id && config.salt && config.verifier && storage.read() === config.verifier) {
    unlock();
    return;
  }

  const gate = doc.createElement('section');
  gate.id = 'access-gate';
  gate.className = 'access-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-labelledby', 'access-gate-title');
  const form = doc.createElement('form');
  form.className = 'access-gate-card';
  const eyebrow = doc.createElement('p');
  eyebrow.className = 'access-gate-eyebrow';
  eyebrow.textContent = config.title;
  const title = doc.createElement('h1');
  title.id = 'access-gate-title';
  title.textContent = 'Password required';
  const copy = doc.createElement('p');
  copy.textContent =
    'Enter the password once on this device. This browser will remember a successful unlock.';
  const label = doc.createElement('label');
  label.textContent = 'Password';
  const input = doc.createElement('input');
  input.type = 'password';
  input.name = 'password';
  input.required = true;
  input.autocomplete = 'current-password';
  input.autocapitalize = 'none';
  input.spellcheck = false;
  label.append(input);
  const button = doc.createElement('button');
  button.type = 'submit';
  button.dataset.uiAction = 'primary';
  button.textContent = 'Unlock';
  const status = doc.createElement('p');
  status.className = 'access-gate-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  form.append(eyebrow, title, copy, label, button, status);
  gate.append(form);
  doc.body.prepend(gate);

  const decode = (value) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return Uint8Array.from(host.atob(padded), (character) => character.charCodeAt(0));
  };
  const matches = (actual, expected) => {
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index++)
      difference |= actual[index] ^ expected[index];
    return difference === 0;
  };
  const derive = async (password) => {
    const key = await host.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    return new Uint8Array(
      await host.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          hash: 'SHA-256',
          salt: decode(config.salt),
          iterations: config.iterations,
        },
        key,
        256,
      ),
    );
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;
    input.disabled = true;
    status.textContent = 'Checking…';
    try {
      if (!config.id || !config.salt || !config.verifier || !host.crypto?.subtle)
        throw new Error('Password protection is unavailable in this browser.');
      const actual = await derive(input.value);
      if (!current()) return;
      if (!matches(actual, decode(config.verifier))) {
        input.value = '';
        status.textContent = 'That password is not correct.';
        input.disabled = false;
        button.disabled = false;
        input.focus();
        return;
      }
      storage.write(config.verifier);
      status.textContent = 'Unlocked.';
      unlock();
      gate.remove();
    } catch (error) {
      status.textContent = error?.message || 'The app could not be unlocked.';
      input.disabled = false;
      button.disabled = false;
      input.focus();
    }
  });
  input.focus();
})();
