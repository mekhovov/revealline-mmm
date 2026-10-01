(() => {
  const host = globalThis;
  const doc = host.document;
  if (!doc || host.RevealLineAccess) return;

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
  host.RevealLineAccess = Object.freeze({ ready, storageKey });

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
  const unlock = () => {
    doc.documentElement.dataset.accessState = 'unlocked';
    resolveReady(true);
    doc.dispatchEvent(new CustomEvent('revealline-access-unlocked', { detail: { id: config.id } }));
  };

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
  copy.textContent = 'Enter the password once on this device. This browser will remember a successful unlock.';
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
    for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
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
        { name: 'PBKDF2', hash: 'SHA-256', salt: decode(config.salt), iterations: config.iterations },
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
      if (!matches(await derive(input.value), decode(config.verifier))) {
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
