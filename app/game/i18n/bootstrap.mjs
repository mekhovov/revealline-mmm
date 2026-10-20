// Classic-script compatible: launch recovery must also work without ES modules.
(() => {
  const host = globalThis;
  if (host.RevealLineI18n) return;
  const engine = host.i18next.createInstance();
  const storageKey = 'revealline-mmm.locale.v1';
  const locales = ["en"];
  const listeners = new Set();
  const beforeListeners = new Set();
  const bindings = new WeakMap();
  const textNodes = new WeakMap();
  const richBindings = new WeakMap();
  const elements = new Set();
  let explicit = null;
  const normalizeLocale = (value) => {
    if (typeof value !== 'string') return null;
    try {
      const language = Intl.getCanonicalLocales(value)[0]?.split('-')[0];
      return locales.includes(language) ? language : null;
    } catch {
      return null;
    }
  };
  function detectLocale(navigatorRef = host.navigator) {
    const preferred = Array.isArray(navigatorRef?.languages) ? navigatorRef.languages : [];
    for (const value of [...preferred, navigatorRef?.language]) {
      const locale = normalizeLocale(value);
      if (locale) return locale;
    }
    return 'en';
  }
  function savedLocale() {
    try {
      const value = host.localStorage?.getItem(storageKey);
      return locales.includes(value) ? value : null;
    } catch {
      return null;
    }
  }
  explicit = savedLocale();
  let activeLocale = explicit || detectLocale();
  const numberFormats = new Map();
  const dateFormats = new Map();
  function formatter(cache, Type, locale, options) {
    const key = `${locale}:${JSON.stringify(options ?? {})}`;
    let value = cache.get(key);
    if (!value) {
      value = new Type(locale, options);
      // Callers may provide arbitrary display options. Retain only a small set.
      if (cache.size >= 64) cache.delete(cache.keys().next().value);
      cache.set(key, value);
    }
    return value;
  }
  engine.use({
    type: 'formatter',
    init() {},
    format: (value, _format, locale) =>
      typeof value === 'number' && Number.isFinite(value)
        ? formatter(numberFormats, Intl.NumberFormat, locale, { maximumFractionDigits: 20 }).format(
            value,
          )
        : value,
  });
  engine.init({
    lng: activeLocale,
    fallbackLng: 'en',
    supportedLngs: locales,
    resources: host.RevealLineTranslations,
    defaultNS: 'interface',
    keySeparator: false,
    initAsync: false,
    returnNull: false,
    returnEmptyString: false,
    // All values are written to text nodes/attributes, never interpreted as HTML.
    interpolation: {
      escapeValue: false,
      alwaysFormat: true,
    },
  });
  for (const [namespace, messages] of Object.entries({"errors":{"loadingFlightSystems":"Loading your game…","flightOnHold":"Unable to open the game.","stillPreparingYourArcadeYouCanWaitReloadOrUse":"Still preparing your game. You can wait or reload. Your saved progress is unchanged."},"interface":{"loadingMissionsAndFlightEquipment":"Loading your missions…","oneSharedArenaSunflowerIsMarked1AndSkylineIs":"One shared arena. Player 1 is marked 1 and Player 2 is marked 2.","couchCoOp":"TEAM","closingACutStopsYourCraftChooseAFreshDirection":"Closing a cut stops your marker; choose a fresh direction.","closingACutStopsYourCraftTapAFreshDirection":"Closing a cut stops your marker; tap a fresh direction to move again.","tapADirectionToFlyAgain":"Tap a direction to move again.","tapADirectionToFlyTapAnotherToTurn":"Tap a direction to move. Tap another to turn.","enemyGuide.practiceInstructions":"{{advice}} Move with direction taps; Pause when you want to inspect. Closing a cut stops your marker; tap a fresh direction to move again. Retry starts the same lesson."},"gameplay":{"brief.closingACutStopsYourCraftTapAFreshDirection":"Closing a cut stops your marker. Tap a fresh direction to move again.","tapADirectionToFlyTapAnotherToTurnUp":"Tap a direction to move. Tap another to turn. Up {{value1}}; down {{value2}}; left {{value3}}; right {{value4}}; {{value5}}{{value6}}{{value7}}{{value8}}pause {{value9}}. Releasing a direction keeps you moving.{{value10}}","tapADirectionToFlyPauses":"Tap a direction to move. {{value1}} {{value2}} pauses.","lineSecuredRevealedTapADirectionToFlyAgain":"Line secured. {{value1}}% revealed. Tap a direction to move again.","tuning.motion_one":"{{count}} hazard · {{speed}} cells/s{{admin}}.","tuning.motion_other":"{{count}} hazards · {{speed}} cells/s{{admin}}."},"demo":{"tipStop":"Closing a cut stops the marker in this chapter. Give a new direction for the next move."}}))
    engine.addResourceBundle('en', namespace, messages, true, true);
  const t = (key, values = {}) => engine.t(key, values);
  // Content adapters run during our synchronous refresh. Keep the requested
  // supported locale authoritative while i18next finishes its own resolution.
  const getLocale = () => activeLocale;
  const messageTag = Symbol('localized-message');
  const message = (key, values = {}) => ({
    [messageTag]: true,
    key,
    values,
    toString: () => t(key, values),
    [Symbol.toPrimitive]: () => t(key, values),
  });
  const render = (value) => {
    if (typeof value === 'function') return render(value());
    if (value?.[messageTag]) return t(value.key, value.values);
    return value == null ? '' : String(value);
  };
  function bind(element, field, value) {
    if (!element) return '';
    let fields = bindings.get(element);
    if (!fields) {
      fields = new Map();
      bindings.set(element, fields);
      elements.add(new WeakRef(element));
    }
    if (field === 'textContent' && richBindings.has(element)) {
      // A host may replace a static rich caption after resolving the active mode.
      // That accepted binding owns subsequent locale changes, including remounts.
      richBindings.get(element)?.();
      richBindings.set(element, null);
    }
    fields.set(field, value);
    return apply(element, field, value, true);
  }
  function apply(element, field, value, assigning = false) {
    const text = render(value);
    if (field === 'textContent') {
      // Keep native gesture targets intact, but retain the newly accepted producer.
      // The first DOM binding still establishes ownership before controls are appended.
      if (
        assigning &&
        element.textContent === text &&
        (textNodes.has(element) ||
          !element.ownerDocument?.createTextNode ||
          typeof element.append !== 'function')
      )
        return text;
      // A label may acquire a select, icon or input after its caption is bound.
      // Language changes update the owned text node, preserving those controls.
      const owned = textNodes.get(element)?.deref();
      if (!assigning && textNodes.has(element)) {
        if (owned?.parentNode === element) owned.textContent = text;
      } else if (element.ownerDocument?.createTextNode && typeof element.append === 'function') {
        element.textContent = '';
        const node = element.ownerDocument.createTextNode(text);
        element.append(node);
        textNodes.set(element, new WeakRef(node));
      } else if (element.textContent !== text) element.textContent = text;
    } else if (element.getAttribute(field) !== text) element.setAttribute(field, text);
    return text;
  }
  const localizedText = (element, value) => bind(element, 'textContent', value);
  const localizedAttribute = (element, name, value) => bind(element, name, value);
  function localizedOption(label, ...args) {
    const option = new host.Option('', ...args);
    localizedText(option, label);
    return option;
  }
  function translateDOM(root = host.document) {
    if (!root?.querySelectorAll) return;
    const nodes = [
      ...(root.matches?.('[data-i18n]') ? [root] : []),
      ...root.querySelectorAll('[data-i18n]'),
    ];
    for (const node of nodes) {
      const key = node.getAttribute('data-i18n');
      const attribute = node.getAttribute('data-i18n-attribute');
      if (attribute) localizedAttribute(node, attribute, () => t(key));
      else localizedText(node, () => t(key));
    }
    for (const attribute of [
      'aria-label',
      'title',
      'placeholder',
      'alt',
      'content',
      'data-menu-label',
    ]) {
      for (const node of root.querySelectorAll(`[data-i18n-${attribute}]`))
        localizedAttribute(node, attribute, () => t(node.getAttribute(`data-i18n-${attribute}`)));
    }
    for (const node of root.querySelectorAll('[data-i18n-rich]')) {
      if (richBindings.has(node)) continue;
      const key = node.getAttribute('data-i18n-rich');
      const slots = new Map(
        [...node.children].map((child) => [
          child.getAttribute('data-i18n-slot'),
          new WeakRef(child),
        ]),
      );
      const reference = new WeakRef(node);
      const update = () => {
        const node = reference.deref();
        if (!node) {
          unsubscribe();
          return;
        }
        if ([...slots.values()].some((slot) => slot.deref()?.parentNode !== node)) {
          unsubscribe();
          return;
        }
        const parts = t(key).split(/(\[\[[a-zA-Z0-9]+\]\])/g);
        node.replaceChildren(
          ...parts.map(
            (part) =>
              slots.get(part.slice(2, -2))?.deref() || node.ownerDocument.createTextNode(part),
          ),
        );
      };
      const unsubscribe = onLocaleChange(update);
      richBindings.set(node, unsubscribe);
      update();
    }
  }
  function refresh() {
    const document = host.document;
    const focus = document?.activeElement;
    const selection =
      focus && typeof focus.selectionStart === 'number'
        ? [focus.selectionStart, focus.selectionEnd, focus.selectionDirection]
        : null;
    const scroll = [...(document?.querySelectorAll('*') || [])]
      .filter((node) => node.scrollTop || node.scrollLeft)
      .map((node) => [node, node.scrollTop, node.scrollLeft]);
    // Translating content above the viewport can make the browser's scroll
    // anchoring counteract the positions restored below. Suppress it only for
    // this synchronous layout update, then restore each authored declaration.
    const anchors = scroll
      .filter(([node]) => typeof node.style?.getPropertyValue === 'function')
      .map(([node]) => [
        node.style,
        node.style.getPropertyValue('overflow-anchor'),
        node.style.getPropertyPriority?.('overflow-anchor') || '',
      ]);
    for (const [style] of anchors) style.setProperty('overflow-anchor', 'none', 'important');
    try {
      // A reading controller may pin valid ownership before translated text changes.
      // Its returned finalizer accepts only that same owner after the whole refresh.
      const finalize = [...beforeListeners]
        .map((callback) => callback(getLocale()))
        .filter((callback) => typeof callback === 'function');
      try {
        if (host.document) host.document.documentElement.lang = getLocale();
        for (const ref of elements) {
          const element = ref.deref();
          if (!element) {
            elements.delete(ref);
            continue;
          }
          // Retired cards may still be retained by an asynchronous owner. Their
          // producers must not read a stale library or revive detached controls.
          if (element.isConnected === false) continue;
          for (const [field, value] of bindings.get(element) || []) apply(element, field, value);
        }
        for (const callback of listeners) callback(getLocale());
      } finally {
        for (const callback of finalize) callback();
      }
      for (const select of host.document?.querySelectorAll('[data-language-select]') || [])
        select.value = getLocale();
      if (focus?.isConnected && document.activeElement !== focus)
        focus.focus({ preventScroll: true });
      if (selection && focus?.setSelectionRange) focus.setSelectionRange(...selection);
      // Commit translated geometry while anchoring is disabled.
      document?.documentElement?.getBoundingClientRect?.();
      for (const [node, top, left] of scroll) {
        node.scrollTop = top;
        node.scrollLeft = left;
      }
    } finally {
      for (const [style, value, priority] of anchors) {
        if (value) style.setProperty('overflow-anchor', value, priority);
        else style.removeProperty('overflow-anchor');
      }
    }
  }
  function setLocale(locale, { persist = true } = {}) {
    if (!locales.includes(locale)) throw new RangeError('Unsupported locale.');
    let saved = false;
    if (persist) {
      explicit = locale;
      try {
        host.localStorage.setItem(storageKey, locale);
        saved = host.localStorage.getItem(storageKey) === locale;
      } catch {
        /* A session choice remains usable even when persistence is unavailable. */
      }
    }
    activeLocale = locale;
    engine.changeLanguage(locale);
    refresh();
    return { locale, saved };
  }
  function onLocaleChange(callback, { before = false } = {}) {
    const target = before ? beforeListeners : listeners;
    target.add(callback);
    return () => target.delete(callback);
  }
  function attachLanguageControls(root = host.document) {
    if (!root?.querySelectorAll) return;
    for (const mount of root.querySelectorAll('[data-language-control]')) {
      if (mount.querySelector('[data-language-select]')) continue;
      const doc = mount.ownerDocument;
      const label = doc.createElement('label');
      const caption = doc.createElement('span');
      localizedText(caption, () => t('common:language.label'));
      const select = doc.createElement('select');
      select.setAttribute('data-language-select', '');
      if (mount.id) select.id = `${mount.id}-select`;
      for (const [value, name] of [
        ['en', 'English'],
        ['uk', 'Українська'],
      ]) {
        const option = doc.createElement('option');
        option.value = value;
        option.textContent = name;
        option.lang = value;
        select.append(option);
      }
      select.value = getLocale();
      const status = doc.createElement('span');
      status.setAttribute('role', 'status');
      status.className = 'locale-storage-status';
      select.addEventListener('change', () => {
        const result = setLocale(select.value);
        localizedText(status, () => (result.saved ? '' : t('common:language.sessionOnly')));
      });
      label.append(caption, select);
      mount.append(label, status);
    }
  }
  host.addEventListener?.('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    explicit = savedLocale();
    setLocale(explicit || detectLocale(), { persist: false });
  });
  host.addEventListener?.('languagechange', () => {
    if (!explicit) setLocale(detectLocale(), { persist: false });
  });
  host.RevealLineI18n = Object.freeze({
    t,
    message,
    render,
    getLocale,
    setLocale,
    onLocaleChange,
    normalizeLocale,
    detectLocale,
    localizedText,
    localizedAttribute,
    localizedOption,
    translateDOM,
    attachLanguageControls,
    formatNumber: (value, options) =>
      formatter(numberFormats, Intl.NumberFormat, getLocale(), options).format(value),
    formatDate: (value, options) =>
      formatter(dateFormats, Intl.DateTimeFormat, getLocale(), options).format(value),
  });
  const mount = () => {
    translateDOM();
    attachLanguageControls();
    refresh();
  };
  if (host.window === host && host.document?.readyState === 'loading') {
    host.document.documentElement.lang = getLocale();
    host.document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else if (host.window === host && host.document) mount();
})();
