import { attachMenuScene } from '../../../game/ui/menu-scenes.mjs';

const root = document.getElementById('scene');
const context = { themeId: 'fpv', active: true };
const owner = attachMenuScene({ root, getContext: () => context });
const status = document.getElementById('status');
const result = document.getElementById('result');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const quantile = (values, p) => values[Math.min(values.length - 1, Math.floor(values.length * p))];
const heap = () =>
  performance.memory
    ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
      }
    : null;

async function measure(profile, reduced) {
  context.themeId = profile;
  context.reduced = reduced;
  owner.update();
  const art = root.querySelector('img');
  await art.decode();
  await delay(500);
  const scene = root.querySelector('.menu-scene');
  if (!document.hasFocus() || document.hidden || scene.dataset.running !== 'true')
    throw new Error('The fixture must be focused and visible.');
  const samples = [],
    longTasks = [];
  const observer =
    globalThis.PerformanceObserver && PerformanceObserver.supportedEntryTypes.includes('longtask')
      ? new PerformanceObserver((list) =>
          longTasks.push(...list.getEntries().map((entry) => entry.duration)),
        )
      : null;
  observer?.observe({ type: 'longtask', buffered: false });
  const before = heap();
  let previous;
  const started = performance.now();
  await new Promise((resolve) => {
    const frame = (timestamp) => {
      if (previous !== undefined) samples.push(timestamp - previous);
      previous = timestamp;
      if (performance.now() - started >= 6000) resolve();
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  observer?.disconnect();
  const sorted = samples.slice().sort((a, b) => a - b);
  return {
    profile,
    reduced,
    durationMs: performance.now() - started,
    focusedAtEnd: document.hasFocus(),
    hiddenAtEnd: document.hidden,
    sceneLoaded: scene.dataset.loaded,
    sceneRunning: scene.dataset.running,
    sceneMotion: scene.dataset.motion,
    samples: samples.length,
    meanIntervalMs: samples.reduce((a, b) => a + b, 0) / samples.length,
    p50IntervalMs: quantile(sorted, 0.5),
    p95IntervalMs: quantile(sorted, 0.95),
    maxIntervalMs: sorted.at(-1),
    intervalsOver34Ms: samples.filter((value) => value > 34).length,
    longTasks: longTasks.length,
    longestTaskMs: Math.max(0, ...longTasks),
    heapBefore: before,
    heapAfter: heap(),
    sourceWidth: art.naturalWidth,
    sourceHeight: art.naturalHeight,
    decodedRGBAEstimateBytes: art.naturalWidth * art.naturalHeight * 4,
    activeAnimations: scene
      .getAnimations({ subtree: true })
      .filter((animation) => animation.playState === 'running').length,
  };
}

document.getElementById('measure').onclick = async (event) => {
  event.currentTarget.disabled = true;
  result.textContent = '';
  const report = {
    kind: 'scene-only-chromium-raf-measurement',
    date: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    limitations:
      'Local browser rAF intervals and approximate JS heap only. Not actual display presentation, process/GPU memory, battery or physical-mobile performance. Other local validation jobs may be running.',
    measurements: [],
  };
  try {
    for (const [profile, reduced] of [
      ['fpv', false],
      ['coupa-spend-in-motion-theme', false],
      ['fpv', true],
    ]) {
      status.textContent = `${profile}: ${reduced ? 'reduced motion' : 'animated'}`;
      report.measurements.push(await measure(profile, reduced));
    }
    report.valid = report.measurements.every(
      (row) => row.focusedAtEnd && !row.hiddenAtEnd && row.sceneLoaded === 'true',
    );
    status.textContent = report.valid ? 'Complete' : 'Invalid: tab lost focus';
  } catch (error) {
    report.error = error.message;
    report.valid = false;
    status.textContent = 'Measurement failed';
  } finally {
    window.sceneMeasurement = report;
    result.textContent = JSON.stringify(report, null, 2);
    document.getElementById('measure').disabled = false;
  }
};
