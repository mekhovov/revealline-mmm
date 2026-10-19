// Development-only observer. Not in build-config.json's release include list.
// It reads DOM presentation and browser timing, never engine state or inputs.
const frame = document.querySelector('#game');
const status = document.querySelector('#status');
const log = document.querySelector('#log');
const records = [];
// Detailed records are bounded, but ending/replacing a sample must never erase
// its worst frame or turn a pause after a stall into a successful observation.
const observerTotals = {
  samples: 0,
  partialSamples: 0,
  observedFrames: 0,
  maxFrameIntervalMs: 0,
  over33ms: 0,
  over50ms: 0,
  over100ms: 0,
  over250ms: 0,
};
const sampleButton = document.querySelector('#sample');
const editionSelect = document.querySelector('#edition');
const multiplayerTarget = document.querySelector('#multiplayer-target');
const sampleScope = document.querySelector('#sample-scope');
const finales = {
  team: {
    aurora: 'expedition-homecoming',
    sentinel: 'citadel-shared-crown',
    fracture: 'coastal-repair-pact',
  },
  versus: {
    aurora: 'expedition-decider',
    sentinel: 'crown-photo-finish',
    fracture: 'unbroken-finish',
  },
};
const editionIds = new Set([
  '',
  'coupa-all',
  'droneaid-nl-community',
  'social-drone-ua',
  'victory-drones',
  'ukraine-culture',
  'fpv-learning',
]);
let dispose = () => {};
const report = (record) => {
  if (record.action === 'Frame sample') {
    observerTotals.samples++;
    if (record.partial) observerTotals.partialSamples++;
    const intervals = record.frameIntervals;
    if (intervals) {
      observerTotals.observedFrames += intervals.count;
      observerTotals.maxFrameIntervalMs = Math.max(
        observerTotals.maxFrameIntervalMs,
        intervals.maxMs ?? 0,
      );
      for (const threshold of ['over33ms', 'over50ms', 'over100ms', 'over250ms'])
        observerTotals[threshold] += intervals[threshold] ?? 0;
    }
  }
  record.observerTotals = { ...observerTotals };
  records.push(record);
  if (records.length > 100) records.shift();
  log.textContent = JSON.stringify(records, null, 2);
  status.textContent = `${record.action}: ${record.outcome}${record.ms == null ? '' : ` · ${record.ms.toFixed(1)} ms`}`;
};
const shown = (node) =>
  !!node && !node.closest('[hidden], [inert]') && node.getClientRects().length > 0;
const enabled = (node) => shown(node) && !node.disabled;
const actions = new Map([
  ['shell-continue', 'Continue'],
  ['shell-featured', 'Play'],
  ['shell-catalogue', 'Open mission library'],
  ['missions-catalogue', 'Open mission library'],
  ['race-journey-find', 'Open mission library'],
  ['start-button', 'Start/resume'],
  ['next-button', 'Next'],
  ['retry-button', 'Retry'],
  ['restart-confirm', 'Confirmed restart'],
  ['race-start', 'Start/rematch'],
  ['race-journey-next', 'Next'],
  ['coop-start', 'Start'],
  ['coop-resume', 'Resume'],
  ['coop-retry', 'Retry'],
  ['coop-next', 'Next'],
  ['coop-discovery', 'Open mission library'],
  ['coop-discovery-paused', 'Open mission library'],
]);

document.querySelector('#load').addEventListener('click', () => {
  dispose();
  const mode = document.querySelector('#mode').value;
  const edition =
    mode === 'solo' && editionIds.has(editionSelect?.value) ? editionSelect.value : '';
  if (sampleButton) sampleButton.disabled = true;
  const path =
    mode === 'solo'
      ? '../../game/'
      : mode === 'team'
        ? '../../game/couch/relay-rescue.html'
        : '../../game/couch/';
  const target = multiplayerTarget?.value;
  const expedition = mode !== 'solo' && (target === 'expedition' || finales[mode]?.[target]);
  const route = `${mode === 'team' ? 'team' : 'duel'}-expedition-v1`;
  let requestedMission = null,
    requestedMissionName = null;
  let query = `journey=${expedition ? route : mode === 'team' ? 'team-cultural-specialist-originals-2' : '1'}${edition ? `&edition=${encodeURIComponent(edition)}` : ''}`;
  if (finales[mode]?.[target]) {
    const prefix = mode;
    const pack = `${prefix}-expedition-${target}-pack`;
    // Duel's exact environment contracts split these two families into owned
    // runtime campaigns. The library handoff must name the finale's real owner.
    const part =
      mode === 'versus' ? ({ aurora: '-part-5', fracture: '-part-3' }[target] ?? '') : '';
    const campaign = `${prefix}-expedition-${target}${part}`;
    const mission = `candidate/${pack}/${campaign}/${prefix}-${finales[mode][target]}`;
    requestedMission = mode === 'team' ? `${prefix}-${finales[mode][target]}` : mission;
    requestedMissionName = finales[mode][target]
      .split('-')
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(' ');
    const identity = JSON.stringify([
      `journey:${route}`,
      route,
      JSON.stringify(['candidate', pack, campaign]),
      mission,
      '',
    ]);
    query += `&library-mission=${encodeURIComponent(identity)}&library-intent=select`;
  }
  const began = performance.now();
  let attached = false,
    abandoned = false;
  const abandon = (outcome) => {
    if (abandoned || attached) return;
    abandoned = true;
    clearTimeout(loadTimer);
    document.removeEventListener('visibilitychange', loadVisibility);
    window.removeEventListener('pagehide', loadPagehide);
    report({
      action: 'Load to playable menu',
      mode,
      outcome,
      ms: null,
      elapsedMs: performance.now() - began,
    });
  };
  const loadVisibility = () => {
    if (document.hidden) abandon('visibility changed before load; sample discarded');
  };
  const loadPagehide = () => abandon('page left before load; sample discarded');
  const loadTimer = setTimeout(() => abandon('navigation timeout; not a passing sample'), 30000);
  document.addEventListener('visibilitychange', loadVisibility);
  window.addEventListener('pagehide', loadPagehide);
  dispose = () => abandon('navigation/disposal before load; sample discarded');
  frame.onload = () => {
    if (abandoned) return;
    if (attached) {
      dispose();
      report({ action: 'Frame navigation', mode, outcome: 'observer detached; load a new sample' });
      return;
    }
    attached = true;
    clearTimeout(loadTimer);
    document.removeEventListener('visibilitychange', loadVisibility);
    window.removeEventListener('pagehide', loadPagehide);
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!doc || !win) {
      report({
        action: 'Load to playable menu',
        mode,
        outcome: 'same-origin game unavailable',
        ms: null,
      });
      return;
    }
    const finite = (value) => (Number.isFinite(value) ? value : null);
    const activeControl = (owner) => {
      const node = owner.activeElement;
      return node ? { id: node.id || null, tag: node.tagName || null } : null;
    };
    const focusSnapshot = () => ({
      atMs: win.performance.now(),
      outer: {
        hidden: Boolean(document.hidden),
        visibility: document.visibilityState ?? null,
        focused: document.hasFocus?.() ?? null,
        activeControl: activeControl(document),
      },
      game: {
        hidden: Boolean(doc.hidden),
        visibility: doc.visibilityState ?? null,
        focused: doc.hasFocus?.() ?? null,
        activeControl: activeControl(doc),
      },
      accessState: doc.documentElement.dataset.accessState ?? null,
      toolState: doc.documentElement.dataset.toolState ?? null,
      controls: Object.fromEntries(
        (mode === 'team'
          ? [
              'coop-start',
              'coop-resume',
              'coop-play',
              'coop-canvas',
              'coop-overlay',
              'coop-picture-status',
              'coop-selection-status',
              'coop-options',
              'coop-discovery-dialog',
              'coop-discard-dialog',
              'coop-earned-picture',
            ]
          : ['race-start', 'race-pause', 'race-boards', 'race-preparation']
        ).map((id) => {
          const node = doc.getElementById(id);
          return [
            id,
            node
              ? {
                  shown: shown(node),
                  disabled: Boolean(node.disabled),
                  state: node.dataset?.state ?? null,
                  open: typeof node.open === 'boolean' ? node.open : null,
                }
              : null,
          ];
        }),
      ),
    });
    const focusEvents = [];
    const recordFocus = (type, trusted = null) => {
      focusEvents.push({ type, trusted, ...focusSnapshot() });
      if (focusEvents.length > 32) focusEvents.shift();
    };
    const focusin = (event) => recordFocus('focusin', event.isTrusted ?? null);
    const focused = (event) => recordFocus('focus', event?.isTrusted ?? null);
    doc.addEventListener('focusin', focusin);
    win.addEventListener('focus', focused);
    const browserSnapshot = () => {
      const nav = win.performance.getEntriesByType('navigation')[0];
      const paints = Object.fromEntries(
        win.performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime]),
      );
      const memory = win.performance.memory;
      return {
        navigation: nav
          ? {
              responseStartMs: finite(nav.responseStart),
              domInteractiveMs: finite(nav.domInteractive),
              domContentLoadedMs: finite(nav.domContentLoadedEventEnd),
              loadEventEndMs: finite(nav.loadEventEnd),
            }
          : null,
        paint: {
          firstPaintMs: finite(paints['first-paint']),
          firstContentfulPaintMs: finite(paints['first-contentful-paint']),
        },
        jsHeap: memory
          ? {
              supported: true,
              usedBytes: finite(memory.usedJSHeapSize),
              totalBytes: finite(memory.totalJSHeapSize),
              limitBytes: finite(memory.jsHeapSizeLimit),
            }
          : { supported: false },
      };
    };
    const mediaSnapshot = () => {
      const canvases = [...(doc.querySelectorAll?.('canvas') ?? [])].map((node) => ({
        id: node.id,
        width: node.width,
        height: node.height,
        rgbaBackingEstimateBytes: node.width * node.height * 4,
      }));
      const images = [...(doc.querySelectorAll?.('img') ?? [])].filter(
        (node) => node.complete && node.naturalWidth > 0,
      );
      const resources = win.performance.getEntriesByType('resource');
      return {
        canvases,
        canvasRGBAEstimateBytes: canvases.reduce(
          (sum, node) => sum + node.rgbaBackingEstimateBytes,
          0,
        ),
        domImageCount: images.length,
        domImageRGBAEstimateBytes: images.reduce(
          (sum, node) => sum + node.naturalWidth * node.naturalHeight * 4,
          0,
        ),
        imageResourceBodyBytes: resources
          .filter((row) => /\.(png|jpe?g|webp|avif)(\?|$)/i.test(row.name))
          .reduce((sum, row) => sum + (row.decodedBodySize || 0), 0),
        decodedMediaMemory: {
          supported: false,
          reason:
            'Browser exposes no complete decoded image, audio or GPU allocation counter here. Pixel estimates exclude off-DOM textures, copies and drivers; resource body bytes are compressed media, not decoded pixel memory.',
        },
      };
    };
    const hudSnapshot = () =>
      Object.fromEntries(
        (mode === 'team'
          ? [
              'coop-stage',
              'coop-clock',
              'coop-coverage',
              'coop-reserves',
              'coop-state-0',
              'coop-state-1',
              'coop-charge-0',
              'coop-charge-1',
            ]
          : [
              'race-clock',
              'racer-stats-0',
              'racer-stats-1',
              'racer-state-0',
              'racer-state-1',
              'series-score',
            ]
        ).map((id) => [id, doc.getElementById(id)?.textContent ?? null]),
      );
    let stopSample = () => {};
    const sample = () => {
      stopSample();
      const activeOnly = sampleScope?.value === 'active';
      const focusAtArm = focusSnapshot();
      if (activeOnly && !requestedMissionMatches()) {
        report({
          action: 'Frame sample',
          mode,
          edition,
          scope: 'active',
          mission: mission(),
          requestedMission,
          requestedMissionName,
          outcome: 'requested mission not selected; sample not armed',
          observedFrames: 0,
          focusAtArm,
          focusAtFinish: focusSnapshot(),
        });
        status.textContent = `Choose ${requestedMissionName} in game before observing.`;
        return;
      }
      if (document.hidden || doc.hidden) {
        report({
          action: 'Frame sample',
          mode,
          edition,
          outcome: 'hidden page; sample discarded',
          focusAtArm,
          focusAtFinish: focusSnapshot(),
        });
        return;
      }
      let beganAt = null,
        before,
        mediaBefore,
        hudBefore,
        sampledMission,
        beforeResources,
        previous = null,
        sampleRaf,
        observer,
        sampleTimer,
        stopped = false,
        taskSupported = false;
      const intervals = [],
        tasks = [],
        activity = [];
      const intervalTotals = {
        count: 0,
        totalMs: 0,
        maxMs: 0,
        over33ms: 0,
        over50ms: 0,
        over100ms: 0,
        over250ms: 0,
      };
      const recordInterval = (ms) => {
        if (!Number.isFinite(ms) || ms < 0) return;
        intervalTotals.count++;
        intervalTotals.totalMs += ms;
        intervalTotals.maxMs = Math.max(intervalTotals.maxMs, ms);
        if (ms > 33.34) intervalTotals.over33ms++;
        if (ms > 50) intervalTotals.over50ms++;
        if (ms > 100) intervalTotals.over100ms++;
        if (ms > 250) intervalTotals.over250ms++;
        if (intervals.length < 10000) intervals.push(ms);
      };
      let lastActivityAt = -Infinity;
      const inputs = {
        player1Keydowns: 0,
        player2Keydowns: 0,
        trustedKeydowns: 0,
        untrustedKeydowns: 0,
      };
      const input = (event) => {
        if (
          beganAt === null ||
          ![
            'KeyW',
            'KeyA',
            'KeyS',
            'KeyD',
            'KeyQ',
            'KeyE',
            'ShiftLeft',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Slash',
            'Enter',
            'ShiftRight',
          ].includes(event.code)
        )
          return;
        inputs[
          event.code.startsWith('Key') || event.code === 'ShiftLeft'
            ? 'player1Keydowns'
            : 'player2Keydowns'
        ]++;
        inputs[event.isTrusted ? 'trustedKeydowns' : 'untrustedKeydowns']++;
      };
      const collectTasks = (entries) => {
        for (const entry of entries)
          if (
            beganAt !== null &&
            entry.startTime >= beganAt &&
            Number.isFinite(entry.duration) &&
            tasks.length < 2000
          )
            tasks.push(entry.duration);
      };
      const finish = (reason) => {
        if (stopped) return;
        // A timeout can run before the next animation frame observes a pause
        // or focus change. Recheck the same conditions at the final boundary.
        if (!reason && activeOnly && (!foreground() || !running() || mission() !== sampledMission))
          reason = 'active play, mission or focus changed; sample discarded';
        const endedAt = win.performance.now();
        const finalIntervalIncomplete = beganAt !== null && previous !== null && endedAt > previous;
        if (finalIntervalIncomplete) recordInterval(endedAt - previous);
        stopped = true;
        win.cancelAnimationFrame(sampleRaf);
        clearTimeout(sampleTimer);
        if (observer) {
          collectTasks(observer.takeRecords());
          observer.disconnect();
        }
        doc.removeEventListener('visibilitychange', sampleVisibility);
        document.removeEventListener('visibilitychange', sampleVisibility);
        doc.removeEventListener('keydown', input, true);
        if (sampleButton) sampleButton.disabled = false;
        if (beganAt === null) {
          report({
            action: 'Frame sample',
            mode,
            edition,
            scope: activeOnly ? 'active' : 'visible',
            outcome: reason || 'no active frames; sample discarded',
            partial: true,
            observedFrames: 0,
            mission: mission(),
            requestedMission,
            focusAtArm,
            focusAtFinish: focusSnapshot(),
            focusEvents: focusEvents.filter((event) => event.atMs >= focusAtArm.atMs),
          });
          return;
        }
        const partial = Boolean(reason) || intervals.length < 60;
        // Legacy outcome wording remains compatible with existing reports;
        // "discarded" now means excluded from qualification, not lost evidence.
        const sorted = [...intervals].sort((a, b) => a - b);
        const percentile = (fraction) => sorted[Math.ceil(sorted.length * fraction) - 1] ?? null;
        report({
          action: 'Frame sample',
          mode,
          edition,
          mission: sampledMission,
          requestedMission,
          scope: activeOnly ? 'active' : 'visible',
          outcome:
            reason ||
            (partial
              ? 'too few frames; sample discarded'
              : 'passive desktop sample; compare equivalent baseline before qualification'),
          partial,
          finalIntervalIncomplete,
          observedFrames: intervalTotals.count,
          durationMs: beganAt === null ? 0 : win.performance.now() - beganAt,
          frameIntervals: {
            ...intervalTotals,
            retainedCount: intervals.length,
            percentilesCoverWholeSample: intervalTotals.count === intervals.length,
            medianMs: percentile(0.5),
            p95Ms: percentile(0.95),
            p99Ms: percentile(0.99),
          },
          longTasks: taskSupported
            ? {
                supported: true,
                count: tasks.length,
                over50Ms: tasks.filter((t) => t > 50).length,
                maxMs: tasks.length ? Math.max(...tasks) : 0,
              }
            : { supported: false },
          viewport: { width: win.innerWidth, height: win.innerHeight, dpr: win.devicePixelRatio },
          environment: {
            userAgent: win.navigator?.userAgent ?? null,
            hardwareConcurrency: win.navigator?.hardwareConcurrency ?? null,
            pageUrl: win.location?.href ?? null,
            buildVersion: doc.documentElement.dataset.buildVersion ?? null,
          },
          inputs,
          focusAtArm,
          focusAtFinish: focusSnapshot(),
          focusEvents: focusEvents.filter((event) => event.atMs >= focusAtArm.atMs),
          activity,
          hudBefore,
          hudAfter: hudSnapshot(),
          browserBefore: before,
          browserAfter: browserSnapshot(),
          mediaBefore,
          mediaAfter: mediaSnapshot(),
          newResourceEntries:
            beganAt === null
              ? null
              : win.performance.getEntriesByType('resource').length - beforeResources,
        });
      };
      const beginSample = () => {
        clearTimeout(sampleTimer);
        beganAt = win.performance.now();
        before = browserSnapshot();
        mediaBefore = mediaSnapshot();
        hudBefore = hudSnapshot();
        sampledMission = mission();
        beforeResources = win.performance.getEntriesByType('resource').length;
        try {
          if (win.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) {
            observer = new win.PerformanceObserver((list) => collectTasks(list.getEntries()));
            observer.observe({ type: 'longtask', buffered: false });
            taskSupported = true;
          }
        } catch {
          observer?.disconnect();
          observer = null;
        }
        sampleTimer = setTimeout(() => finish(), 30000);
      };
      const foreground = () => !document.hidden && !doc.hidden && doc.hasFocus?.() !== false;
      const sampleVisibility = () => {
        if (document.hidden || doc.hidden) finish('visibility changed; sample discarded');
      };
      const sampleTick = () => {
        if (stopped) return;
        if (activeOnly && beganAt === null) {
          if (!requestedMissionMatches()) {
            finish('requested mission changed before play; sample discarded');
            status.textContent = `Choose ${requestedMissionName} in game before observing.`;
            return;
          }
          if (foreground() && running()) beginSample();
        } else if (activeOnly && (!foreground() || !running() || mission() !== sampledMission)) {
          // This can be the very callback delayed by the pause-causing stall.
          // Capture its interval before testing eligibility for a full sample.
          if (previous !== null) recordInterval(win.performance.now() - previous);
          previous = win.performance.now();
          finish('active play, mission or focus changed; sample discarded');
          return;
        }
        if (beganAt !== null) {
          const now = win.performance.now();
          // Bounded DOM observations preserve real cutting/support/score labels
          // without exposing or mutating the engine. They are included overhead.
          if (now - lastActivityAt >= 500 && activity.length < 120) {
            activity.push({ atMs: now - beganAt, hud: hudSnapshot() });
            lastActivityAt = now;
          }
          if (previous !== null) recordInterval(now - previous);
          previous = now;
        }
        sampleRaf = win.requestAnimationFrame(sampleTick);
      };
      doc.addEventListener('visibilitychange', sampleVisibility);
      document.addEventListener('visibilitychange', sampleVisibility);
      doc.addEventListener('keydown', input, true);
      if (sampleButton) sampleButton.disabled = true;
      if (activeOnly) {
        status.textContent =
          'Armed. Start or resume in the game and play for 30 seconds. Pause/results retain a partial sample.';
        sampleTimer = setTimeout(
          () => finish('no foreground play within 60 seconds; sample discarded'),
          60000,
        );
      } else beginSample();
      sampleRaf = win.requestAnimationFrame(sampleTick);
      stopSample = () => finish('navigation/disposal; sample discarded');
    };
    if (sampleButton) {
      sampleButton.disabled = false;
      sampleButton.addEventListener('click', sample);
    }
    let pending = null,
      raf,
      attemptTimer,
      cancelled = false;
    const byId = (id) => doc.getElementById(id);
    const mission = () =>
      mode === 'solo'
        ? byId('level-select')?.value
        : mode === 'team'
          ? byId('coop-level')?.value
          : byId('race-level')?.value.split('/').slice(0, -1).join('/');
    // Native Duel selectors may append difficulty/encounter variants. Only
    // that suffix is allowed; a different mission may never satisfy a preset.
    const requestedMissionMatches = () =>
      !requestedMission ||
      mission() === requestedMission ||
      (mode === 'versus' && mission()?.startsWith(`${requestedMission}/`));
    const running = () =>
      mode === 'solo'
        ? doc.body.dataset.flightState === 'running' && doc.body.dataset.pictureState === 'ready'
        : mode === 'team'
          ? // Desktop/handheld CSS may make #coop-play display:contents. Its
            // actual canvas has the visible box; hidden/inert ancestors still veto it.
            enabled(byId('coop-pause')) &&
            shown(byId('coop-canvas')) &&
            !shown(byId('coop-overlay'))
          : enabled(byId('race-pause')) &&
            byId('race-pause').textContent.trim() === 'Pause' &&
            shown(byId('race-boards'));
    const libraryReady = () => {
      const chooser = byId('journey-chooser');
      const card = byId('journey-cards')?.querySelector?.('.journey-card:not(:disabled)');
      return chooser?.open === true && enabled(card);
    };
    const fail = (outcome) => {
      if (!pending) return;
      clearTimeout(attemptTimer);
      report({
        action: pending.action,
        mode,
        outcome,
        ms: null,
        elapsedMs: performance.now() - pending.started,
        mission: mission(),
        trustedActivation: pending.trustedActivation,
        focusAtActivation: pending.focusAtActivation,
        focusAtFinish: focusSnapshot(),
      });
      pending = null;
    };
    const begin = (
      action,
      started = performance.now(),
      trustedActivation = null,
      expectedMission = null,
    ) => {
      fail('superseded');
      const statusIds =
        action === 'Load to playable menu'
          ? []
          : mode === 'team'
            ? ['coop-picture-status', 'coop-selection-status']
            : mode === 'versus'
              ? ['race-preparation']
              : ['Continue', 'Play'].includes(action)
                ? ['shell-flight-status', 'flight-preparation-status']
                : ['flight-preparation-status'];
      pending = {
        action,
        started,
        readyFrames: 0,
        trustedActivation,
        focusAtActivation: focusSnapshot(),
        fromMission: mission(),
        expectedMission,
        statuses: statusIds.map((id) => ({
          id,
          previous: byId(id)?.dataset.state,
          sawBusy: false,
        })),
      };
      attemptTimer = setTimeout(
        () => fail('timeout; not a passing sample'),
        Math.max(0, 30000 - (performance.now() - started)),
      );
    };
    const click = (event) => {
      const button = event.target.closest?.('button');
      if (!button || !enabled(button)) return;
      if (
        [
          'flight-preparation-cancel',
          'shell-flight-cancel',
          'race-picture-cancel',
          'coop-picture-cancel',
          'coop-next-cancel',
        ].includes(button.id)
      ) {
        fail('cancelled by player; sample discarded');
        return;
      }
      let action = actions.get(button.id);
      if (['coop-start', 'coop-resume', 'race-start'].includes(button.id))
        recordFocus(`activate:${button.id}`, event.isTrusted ?? null);
      if (
        ['journey-skip', 'race-journey-skip'].includes(button.id) &&
        /confirm/i.test(button.textContent)
      )
        action = 'Confirmed skip';
      if (
        button.id === 'next-button' &&
        /end of sequence|view collection|journey complete/i.test(button.textContent)
      )
        return;
      if (button.dataset.missionId) action = 'Choose mission';
      // Keyboard/controller navigation can legitimately activate a button with
      // .click(). Keep the distinction in the evidence, do not invent inputs.
      if (action)
        begin(
          action,
          performance.now(),
          event.isTrusted,
          mode === 'solo' ? button.dataset.missionId?.split('/').at(-1) : button.dataset.missionId,
        );
    };
    const visibility = () => {
      recordFocus('visibilitychange');
      if (document.hidden || doc.hidden) fail('visibility changed; sample discarded');
    };
    doc.addEventListener('click', click, true);
    doc.addEventListener('visibilitychange', visibility);
    document.addEventListener('visibilitychange', visibility);
    const pagehide = () => fail('page left; sample discarded');
    const blur = (event) => {
      recordFocus('blur', event?.isTrusted ?? null);
      fail('game focus left; sample discarded');
    };
    win.addEventListener('pagehide', pagehide);
    win.addEventListener('blur', blur);
    window.addEventListener('pagehide', pagehide);
    begin('Load to playable menu', began);
    const tick = () => {
      if (cancelled) return;
      if (pending) {
        const menu =
          mode === 'solo'
            ? enabled(byId('shell-continue')) || enabled(byId('shell-featured'))
            : mode === 'team'
              ? enabled(byId('coop-start'))
              : enabled(byId('race-start'));
        const targetMatches = pending.expectedMission
          ? mission() === pending.expectedMission
          : !['Next', 'Confirmed skip'].includes(pending.action) ||
            mission() !== pending.fromMission;
        const boot = doc.documentElement.dataset[mode === 'solo' ? 'bootState' : 'toolState'];
        const ready =
          boot === 'ready' &&
          (pending.action === 'Load to playable menu'
            ? menu
            : pending.action === 'Open mission library'
              ? libraryReady()
              : running() && targetMatches);
        const failed = pending.statuses.find((status) => {
          const state = byId(status.id)?.dataset.state;
          if (state === 'busy') status.sawBusy = true;
          return (
            ['error', 'cancelled', 'detached'].includes(state) &&
            (status.sawBusy || state !== status.previous)
          );
        });
        if (['failed', 'error'].includes(boot)) fail('game boot failed; sample discarded');
        else if (failed) fail(`preparation ${byId(failed.id).dataset.state}; sample discarded`);
        else if (performance.now() - pending.started > 30000) fail('timeout; not a passing sample');
        else if (ready && !document.hidden && !doc.hidden) {
          if (++pending.readyFrames >= 2) {
            const resources = win.performance.getEntriesByType('resource');
            report({
              action: pending.action,
              mode,
              outcome: 'two consecutive animation-frame readiness observations',
              ms: performance.now() - pending.started,
              mission: mission(),
              trustedActivation: pending.trustedActivation,
              ...(pending.action === 'Load to playable menu'
                ? {
                    resourcesAtReady: resources.length,
                    transferBytesAtReady: resources.reduce((n, r) => n + r.transferSize, 0),
                    jsDecodedBytesAtReady: resources
                      .filter((r) => /\.(mjs|js)(\?|$)/.test(r.name))
                      .reduce((n, r) => n + r.decodedBodySize, 0),
                    cssDecodedBytesAtReady: resources
                      .filter((r) => /\.css(\?|$)/.test(r.name))
                      .reduce((n, r) => n + r.decodedBodySize, 0),
                    zeroTransferEntries: resources.filter((r) => r.transferSize === 0).length,
                    viewport: {
                      width: win.innerWidth,
                      height: win.innerHeight,
                      dpr: win.devicePixelRatio,
                    },
                    browserAtReady: browserSnapshot(),
                    mediaAtReady: mediaSnapshot(),
                  }
                : {}),
            });
            clearTimeout(attemptTimer);
            pending = null;
          }
        } else pending.readyFrames = 0;
      }
      raf = win.requestAnimationFrame(tick);
    };
    raf = win.requestAnimationFrame(tick);
    report({
      action: 'Navigation timing',
      mode,
      outcome: 'browser entries; no device qualification',
      browserAtFrameLoad: browserSnapshot(),
      resourcesAtFrameLoad: win.performance.getEntriesByType('resource').length,
    });
    dispose = () => {
      fail('navigation/disposal; sample discarded');
      stopSample();
      sampleButton?.removeEventListener('click', sample);
      cancelled = true;
      win.cancelAnimationFrame(raf);
      doc.removeEventListener('click', click, true);
      doc.removeEventListener('focusin', focusin);
      win.removeEventListener('focus', focused);
      doc.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('visibilitychange', visibility);
      win.removeEventListener('pagehide', pagehide);
      win.removeEventListener('blur', blur);
      window.removeEventListener('pagehide', pagehide);
    };
  };
  frame.src = `${path}?${query}`;
  status.textContent = `Loading ${mode}…`;
});
