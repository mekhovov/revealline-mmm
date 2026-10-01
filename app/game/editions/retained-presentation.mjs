import { boundedJSON, canonicalJSON, exactKeys, required } from '../data-json.mjs';
import { hashPresentationBytes } from '../presentation/bundle.mjs';
import { loadEditionBootstrap } from './bootstrap.mjs';
import {
  createEditionRuntimeCatalog,
  freezeEdition,
  resolveEditionAssets,
  validateEditionRuntimeCatalog,
} from './model.mjs';
import { projectEditionThemeSelection } from './selected-presentation.mjs';

export const RETAINED_EDITION_PRESENTATION_FORMAT = 'revealline-edition-presentation.v1';
const encoder = new TextEncoder();
const digest = (value) => hashPresentationBytes(encoder.encode(canonicalJSON(value)));
const pathsFor = (catalog) =>
  new Set([
    ...Object.values(catalog.editions[0].boot ?? {}),
    ...catalog.campaigns.flatMap((campaign) => [
      campaign.sourcePath,
      ...(campaign.lessonPath ? [campaign.lessonPath] : []),
      ...(campaign.rewardPath ? [campaign.rewardPath] : []),
      ...(campaign.localizationPath ? [campaign.localizationPath] : []),
    ]),
  ]);

/** Preserve the existing v2 receipt algorithm. A history descriptor grants no
 * alias: old receipts are recomputed from their exact selected original data. */
export async function editionPresentationSha256(bootstrap) {
  const projected = projectEditionThemeSelection({
    brand: bootstrap.selection.brand,
    projects: [bootstrap.source],
    themes: bootstrap.boot.themes,
  });
  return digest({
    editionId: bootstrap.selection.edition.id,
    themes: projected.themes,
    presets: bootstrap.boot.presets,
    ...(bootstrap.selection.campaigns.some((campaign) => campaign.heroAssetId)
      ? {
          campaignHeroes: bootstrap.selection.campaigns
            .filter((campaign) => campaign.heroAssetId)
            .map((campaign) => ({ campaignId: campaign.id, heroAssetId: campaign.heroAssetId }))
            .sort((a, b) =>
              a.campaignId < b.campaignId ? -1 : a.campaignId > b.campaignId ? 1 : 0,
            ),
        }
      : {}),
    // Preserve historical identities when no reward sidecar was authored.
    ...(bootstrap.rewards ? { rewards: bootstrap.rewards } : {}),
    ...(bootstrap.localizations ? { localizations: bootstrap.localizations } : {}),
    assets: resolveEditionAssets(bootstrap.catalog, {
      editionId: bootstrap.selection.edition.id,
    })
      .map(({ id, path, sha256, bytes }) => ({ id, path, sha256, bytes }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  });
}

/** Capture before editing source. This contains only selected JSON, never
 * authoring history or media bytes. Originals remain independently hash-pinned. */
export async function captureEditionPresentation(bootstrap) {
  const { selection } = bootstrap;
  const { presentationHistory: _history, ...edition } = selection.edition;
  const projected = projectEditionThemeSelection({
    brand: selection.brand,
    projects: [bootstrap.source],
    themes: bootstrap.boot.themes,
  });
  const catalog = createEditionRuntimeCatalog({
    publication: selection.edition.publication,
    defaultEditionId: edition.id,
    brands: [projected.brand],
    editions: [edition],
    campaigns: selection.campaigns,
    assets: resolveEditionAssets(bootstrap.catalog, { editionId: edition.id }),
  });
  const files = new Map();
  required(bootstrap.sources?.length === selection.campaigns.length, 'Snapshot sources missing.');
  selection.campaigns.forEach((campaign, index) => {
    files.set(campaign.sourcePath, bootstrap.sources[index]);
    if (campaign.lessonPath) files.set(campaign.lessonPath, bootstrap.lessons[campaign.id]);
    if (campaign.rewardPath) files.set(campaign.rewardPath, bootstrap.rewards[campaign.id]);
    if (campaign.localizationPath)
      files.set(campaign.localizationPath, bootstrap.localizations[campaign.id]);
  });
  for (const [name, path] of Object.entries(edition.boot))
    files.set(path, name === 'themes' ? projected.themes : bootstrap.boot[name]);
  const snapshot = {
    format: RETAINED_EDITION_PRESENTATION_FORMAT,
    editionId: edition.id,
    authoredPresentationSha256: await editionPresentationSha256(bootstrap),
    catalog,
    files: [...files].map(([path, data]) => ({ path, data })),
  };
  return (await validateRetainedPresentation(snapshot, { edition })).snapshot;
}

/** Both packaging and runtime use this closed reader. A historical presentation
 * may not widen the current audience, register another snapshot, or fetch JSON
 * from the current release to fill holes in its old immutable source. */
export async function validateRetainedPresentation(source, { edition } = {}) {
  const snapshot = boundedJSON(source, {
    maxBytes: 4 * 1024 * 1024,
    maxNodes: 100000,
    maxArray: 4096,
  });
  exactKeys(
    snapshot,
    ['format', 'editionId', 'authoredPresentationSha256', 'catalog', 'files'],
    'Retained presentation',
  );
  required(
    snapshot.format === RETAINED_EDITION_PRESENTATION_FORMAT &&
      /^[a-f0-9]{64}$/.test(snapshot.authoredPresentationSha256),
    'Invalid retained edition presentation.',
  );
  const catalog = validateEditionRuntimeCatalog(snapshot.catalog),
    retained = catalog.editions[0];
  required(
    edition &&
      catalog.editions.length === 1 &&
      catalog.brands.length === 1 &&
      retained.id === edition.id &&
      snapshot.editionId === edition.id &&
      !retained.presentationHistory?.length &&
      ['brandId', 'audience', 'publication'].every((key) => retained[key] === edition[key]) &&
      retained.campaignIds.length > 0 &&
      retained.campaignIds.every((id) => edition.campaignIds.includes(id)) &&
      canonicalJSON([...retained.modes].sort()) === canonicalJSON([...edition.modes].sort()) &&
      catalog.campaigns.length === retained.campaignIds.length,
    'Retained presentation differs from the selected audience.',
  );
  required(
    resolveEditionAssets(catalog, { editionId: edition.id }).length === catalog.assets.length,
    'Retained presentation contains unselected assets.',
  );
  const paths = pathsFor(catalog),
    files = new Map();
  required(Array.isArray(snapshot.files), 'Retained presentation JSON inventory is missing.');
  for (const item of snapshot.files) {
    exactKeys(item, ['path', 'data'], 'Retained JSON file');
    required(
      paths.has(item.path) && !files.has(item.path),
      'Retained presentation contains an undeclared or duplicate JSON input.',
    );
    files.set(item.path, item.data);
  }
  required(files.size === paths.size, 'Retained presentation JSON input is missing.');
  const base = 'https://edition.invalid/';
  const bootstrap = await loadEditionBootstrap({
    editionId: edition.id,
    contentBaseURL: base,
    catalogURL: `${base}edition-catalog.json`,
    allowMissing: false,
    fetcher: async (url) => {
      const target = new URL(url);
      required(target.origin === new URL(base).origin, 'Retained input escaped its snapshot.');
      const path = target.pathname.slice(1);
      const value = path === 'edition-catalog.json' ? catalog : files.get(path);
      required(value !== undefined, 'Retained input is not in its snapshot.');
      return { ok: true, text: async () => canonicalJSON(value) };
    },
  });
  for (const asset of bootstrap.source.assets)
    required(
      catalog.assets.some(
        (item) =>
          item.path === `game/${asset.path}` &&
          item.sha256 === asset.sha256 &&
          item.bytes === asset.bytes,
      ),
      'Retained campaign artwork is outside its selected original assets.',
    );
  required(
    (await editionPresentationSha256(bootstrap)) === snapshot.authoredPresentationSha256,
    'Retained presentation receipt differs from its exact source.',
  );
  return { snapshot: freezeEdition(snapshot), bootstrap };
}

async function readRetainedPresentation(
  descriptor,
  { edition, baseURL, fetcher = globalThis.fetch, signal } = {},
) {
  signal?.throwIfAborted();
  const response = await fetcher(new URL(descriptor.path, baseURL), { signal, redirect: 'error' });
  required(
    response?.ok && !response.redirected && response.body?.getReader,
    'This exact retained presentation is unavailable. Your original save is preserved.',
  );
  const reader = response.body.getReader(),
    bytes = new Uint8Array(descriptor.bytes);
  const cancel = () => reader.cancel().catch(() => {});
  signal?.addEventListener('abort', cancel, { once: true });
  let length = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      required(length + value.byteLength <= bytes.length, 'Retained presentation exceeds its pin.');
      bytes.set(value, length);
      length += value.byteLength;
    }
  } catch (error) {
    reader.cancel().catch(() => {});
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
  required(length === bytes.length, 'Retained presentation bytes are incomplete.');
  required(
    (await hashPresentationBytes(bytes)) === descriptor.sha256,
    'Retained presentation bytes differ from the registered original.',
  );
  const result = await validateRetainedPresentation(
    new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    { edition },
  );
  required(
    result.snapshot.authoredPresentationSha256 === descriptor.id,
    'Retained presentation identity differs from its registration.',
  );
  signal?.throwIfAborted();
  return result;
}

export async function loadRetainedPresentation(
  descriptor,
  { signal, timeoutMs = 20000, ...options } = {},
) {
  required(
    Number.isFinite(timeoutMs) &&
      timeoutMs > 0 &&
      timeoutMs <= 20000 &&
      Number.isSafeInteger(descriptor?.bytes) &&
      descriptor.bytes > 0 &&
      descriptor.bytes <= 4 * 1024 * 1024,
    'Invalid retained presentation read budget.',
  );
  const controller = new AbortController();
  let timer;
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const stopped = new Promise((_, reject) => {
    const cancelled = () =>
      reject(new DOMException('Retained presentation loading cancelled.', 'AbortError'));
    controller.signal.addEventListener('abort', cancelled, { once: true });
    if (controller.signal.aborted) cancelled();
    timer = setTimeout(() => {
      reject(
        new Error(
          'The retained presentation did not load in time. Your original save is preserved.',
        ),
      );
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      stopped,
      readRetainedPresentation(descriptor, { ...options, signal: controller.signal }),
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    controller.abort();
  }
}
