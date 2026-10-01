import { assertBrandedLocation } from './branded-isolation.mjs';
import { editionOfflinePackageId } from './editions/offline-package-id.mjs';
import { loadEditionBootstrap } from './editions/bootstrap.mjs';
import { verifyEditionAssets } from './editions/assets.mjs';
import { resolveEditionAssets } from './editions/model.mjs';
import { editionIdentityId, editionPublicSlug, resolveEditionContext } from './edition-context.mjs';
import {
  communityEntryURL,
  communityHref,
  communityRouteFromURL,
  gameDocumentURL,
} from './community-routes.mjs';
import { required } from './data-json.mjs';
import { validateCompletionRewards } from './rewards/model.mjs';
import { isStudioPreview, STUDIO_PREVIEW_PARAMETER } from './studio-preview-session.mjs';
import { projectEditionThemeSelection } from './editions/selected-presentation.mjs';
import { installEditionLocalization } from './editions/localization-runtime.mjs';
import {
  editionPresentationSha256,
  loadRetainedPresentation,
} from './editions/retained-presentation.mjs';

/** Only reveal-only originals may wait for the existing per-attempt verifier.
 * Keep the complete allowlist, budget and receipt authoritative even when these
 * bytes are not needed to open the menu. Shared hero/body/dependency uses win. */
export function editionStartupAssetIds(bootstrap) {
  const { catalog, selection, source, boot } = bootstrap;
  const assets = resolveEditionAssets(catalog, { editionId: selection.edition.id });
  required(
    assets.reduce((sum, asset) => sum + asset.bytes, 0) <= 64 * 1024 * 1024,
    'Presentation exceeds its offline budget.',
  );
  for (const asset of assets) {
    required(
      asset.approved === true,
      `Presentation asset is unavailable in this edition: ${asset.id}.`,
    );
    required(
      selection.edition.publication !== 'public' || asset.publication === 'public',
      `Presentation asset is not public: ${asset.id}.`,
    );
  }
  const revealIds = new Set();
  for (const mission of source.missions) {
    const id = mission.presentation.backgroundAssetId;
    if (id === null) continue;
    const pin = source.assets.find((asset) => asset.id === id);
    const declared = pin && assets.find((asset) => asset.path === `game/${pin.path}`);
    required(
      declared && declared.sha256 === pin.sha256 && declared.bytes === pin.bytes,
      'Mission artwork differs from the selected edition asset closure.',
    );
    revealIds.add(declared.id);
  }
  const protectedIds = new Set([
    ...selection.brand.assetIds,
    ...(selection.edition.assetIds ?? []),
  ]);
  // validateEditionPresentation has already bounded and admitted every body
  // path. Preserve its renderer-relative convention when protecting reuse.
  const bodyPaths = new Set(
    Object.values(boot.presets.characters)
      .filter((body) => body.src !== null)
      .map((body) => new URL(body.src, 'https://edition.invalid/authoring/motion-lab/').pathname),
  );
  const eager = new Set(
    assets
      .filter(
        (asset) =>
          !revealIds.has(asset.id) || protectedIds.has(asset.id) || bodyPaths.has(`/${asset.path}`),
      )
      .map((asset) => asset.id),
  );
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  for (const id of eager) for (const dependency of byId.get(id).dependencies) eager.add(dependency);
  return Object.freeze([...eager]);
}

/** Content and presentation are inputs to the ordinary Solo host. An edition
 * never owns an update loop, difficulty implementation or input controller. */
export async function loadRuntimeContentProvider({
  locationRef = globalThis.location,
  documentRef = globalThis.document,
  fetcher = globalThis.fetch,
  verifyAssets = verifyEditionAssets,
  ensurePackage = async () => {},
  signal,
} = {}) {
  signal?.throwIfAborted();
  const sourceURL = assertBrandedLocation(locationRef.href);
  const compiled = documentRef.documentElement.dataset.editionId;
  const community = compiled ? null : communityRouteFromURL(sourceURL);
  const url = compiled
    ? sourceURL
    : community
      ? communityEntryURL(sourceURL)
      : gameDocumentURL(sourceURL);
  const selector = url.searchParams.get('edition') ?? compiled;
  const requested = selector ? editionIdentityId(selector) : selector;
  if (!requested && url.searchParams.get('company') !== '1') return null;
  if (compiled)
    required(requested === compiled, 'This installed edition cannot load another audience.');
  const rootURL = new URL('../', url);
  const read = (url, options) => fetcher(url, { ...options, signal });
  const currentBootstrap = await loadEditionBootstrap({
    fetcher: read,
    catalogURL: new URL(compiled ? '../edition-catalog.json' : 'editions/catalog.json', url).href,
    contentBaseURL: rootURL.href,
    editionId: requested ?? undefined,
    campaignId: url.searchParams.get('campaign') ?? undefined,
    allowMissing: false,
  });
  required(
    !community || currentBootstrap.selection.brand.id === community.brandId,
    'This community address cannot open another company edition.',
  );
  const retainedPresentationId = url.searchParams.get('presentation');
  const history = currentBootstrap.selection.edition.presentationHistory ?? [];
  const retained = retainedPresentationId
    ? history.find((record) => record.id === retainedPresentationId)
    : null;
  required(
    !retainedPresentationId || retained,
    'This exact presentation is not registered for the selected edition. Your original save is preserved.',
  );
  const bootstrap = retained
    ? (
        await loadRetainedPresentation(retained, {
          edition: currentBootstrap.selection.edition,
          baseURL: rootURL,
          fetcher: read,
          signal,
        })
      ).bootstrap
    : currentBootstrap;
  required(bootstrap.boot, 'This edition is missing its Solo startup catalogs.');
  signal?.throwIfAborted();
  const startupIds = editionStartupAssetIds(bootstrap);
  if (!compiled)
    await ensurePackage(
      editionOfflinePackageId(bootstrap.selection.edition.id, retainedPresentationId),
      {
        signal,
        retain: true,
        requiresAssets:
          resolveEditionAssets(bootstrap.catalog, { editionId: bootstrap.selection.edition.id })
            .length > 0,
      },
    );
  signal?.throwIfAborted();
  await verifyAssets(bootstrap, {
    baseURL: rootURL,
    fetcher: read,
    signal,
    ids: startupIds,
  });
  signal?.throwIfAborted();
  const { route } = bootstrap;
  const projected = projectEditionThemeSelection({
    brand: bootstrap.selection.brand,
    projects: [bootstrap.source],
    themes: bootstrap.boot.themes,
  });
  const selection = { ...bootstrap.selection, brand: projected.brand };
  const catalog = {
    ...bootstrap.catalog,
    brands: bootstrap.catalog.brands.map((brand) =>
      brand.id === projected.brand.id ? projected.brand : brand,
    ),
  };
  const theme = projected.themes.themes.find((item) => item.id === selection.brand.themeId);
  required(theme, 'This edition is missing its selected presentation.');
  const authoredPresentationSha256 = await editionPresentationSha256(bootstrap);
  signal?.throwIfAborted();
  const selectedAssets = new Map(
    resolveEditionAssets(catalog, { editionId: selection.edition.id }).map((asset) => [
      asset.id,
      asset,
    ]),
  );
  const assetURL = (id) => {
    const asset = selectedAssets.get(id);
    required(asset, 'This edition does not contain the requested artwork.');
    return new URL(asset.path, rootURL).href;
  };
  return Object.freeze({
    kind: 'edition',
    editionId: selection.edition.id,
    authoredPresentationSha256,
    retainedPresentationId,
    presentationHistory: history,
    currentCatalog: currentBootstrap.catalog,
    selection,
    catalog,
    // Keep the preview host's incompatible envelope untouched. Canonical Solo
    // uses its own versioned save reader while logical Journey progress stays
    // on the existing edition profile key.
    route: Object.freeze({ ...route, sessionKey: `${route.sessionKey}.solo-v2` }),
    legacySessionKey: route.sessionKey,
    theme,
    bootstrap,
    rootURL: rootURL.href,
    themes: projected.themes.themes,
    lessons: Object.values(bootstrap.lessons).flat(),
    rewards: validateCompletionRewards(Object.values(bootstrap.rewards ?? {}).flat()),
    installLocalization: () => installEditionLocalization(bootstrap),
    // The canonical host owns and augments its boot data; the immutable source
    // registry must remain untouched for session/presentation identities.
    boot: ['campaign', 'themes', 'presets', 'classes', 'packs', 'archives'].map((name) =>
      structuredClone(name === 'themes' ? projected.themes : bootstrap.boot[name]),
    ),
    missionIndex: Object.freeze({ format: 'revealline-mission-library-index.v1', missions: [] }),
    context(version) {
      return resolveEditionContext({
        editionId: selection.edition.id,
        version: version === 'dev' ? 'DEV' : version,
      });
    },
    assetURL,
    href(parameters = {}) {
      const destinationId =
        parameters.edition == null ? selection.edition.id : editionIdentityId(parameters.edition);
      const destination = currentBootstrap.catalog.editions.find(
        (edition) => edition.id === destinationId && edition.brandId === selection.brand.id,
      );
      required(destination, 'This edition cannot navigate to another company.');
      const friendly =
        !compiled && communityHref(url, { brandId: selection.brand.id, editionId: destinationId });
      const target = friendly || new URL('index.html', url);
      if (!friendly) {
        target.search = '';
        target.searchParams.set('edition', editionPublicSlug(destinationId));
      }
      if (
        retainedPresentationId &&
        (!parameters.edition || editionIdentityId(parameters.edition) === selection.edition.id)
      )
        target.searchParams.set('presentation', retainedPresentationId);
      for (const [key, value] of Object.entries(parameters))
        if (key === 'edition') continue;
        else if (value != null) target.searchParams.set(key, value);
        else target.searchParams.delete(key);
      if (isStudioPreview(url.href)) target.searchParams.set(STUDIO_PREVIEW_PARAMETER, '1');
      return target.href;
    },
  });
}
