import { t } from '../i18n/index.mjs';
import { assetStudioHref, studioReturnLinks, isAssetStudioReturn } from './asset-studio-return.mjs';

/** Fixed standalone tools only. Child practice/session protocols have other owners. */
export const WORKSHOP_TOOLS = Object.freeze(
  [
    ['asset-studio', 'authoring/asset-studio/', 'shell-asset-studio'],
    ['playground', 'game/playground/', 'shell-playground'],
    ['enemy-catalog', 'authoring/enemy-catalog/', 'shell-enemy-catalog'],
    ['motion-lab', 'authoring/motion-lab/', 'shell-motion-lab'],
    ['still-media', 'authoring/still-media/', 'shell-still-media'],
    ['video-poster', 'authoring/video-poster/', 'shell-video-poster'],
    ['design-atlas', 'authoring/design-atlas/', 'shell-design-atlas'],
    ['replay-theater', 'game/replay-theater/', 'shell-replay-theater'],
    ['controller-lab', 'game/controller-lab/', 'shell-controller-lab'],
  ].map(([id, path, opener]) => Object.freeze({ id, path, opener })),
);
const tool = (id) => WORKSHOP_TOOLS.find((entry) => entry.id === id);

export function workshopToolHref(gameHref, id) {
  const entry = tool(id);
  if (!entry) throw new TypeError(t('interface:unknownWorkshopTool'));
  const studio = new URL(assetStudioHref(gameHref));
  const target = new URL(`../../${entry.path}`, studio);
  target.search = studio.search;
  return target.href;
}

export function workshopReturnLinks(toolHref, id) {
  if (!tool(id)) throw new TypeError(t('interface:unknownWorkshopTool'));
  const links = studioReturnLinks(toolHref);
  const workshop = new URL(links.workshop);
  workshop.searchParams.set('workshop', id);
  return Object.freeze({ game: links.game, workshop: workshop.href });
}

export function readWorkshopReturn(search) {
  const parameters = new URLSearchParams(search);
  const values = parameters.getAll('workshop');
  const entry = values.length === 1 && tool(values[0]);
  if (
    !entry ||
    ['enemy-workshop-session', 'practice-return', 'controller-preview', 'controller-session'].some(
      (name) => parameters.has(name),
    )
  )
    return null;
  // Reuse the established conflict/duplicate contract; no launch hint is adopted.
  parameters.set('workshop', 'asset-studio');
  return isAssetStudioReturn(parameters.toString()) ? entry : null;
}

export function clearWorkshopReturn(host) {
  try {
    const url = new URL(host.location.href);
    if (!readWorkshopReturn(url.search)) return;
    url.searchParams.delete('workshop');
    host.history.replaceState(host.history.state, '', url.href);
  } catch {
    // Menu navigation stays available when history is read-only.
  }
}

export function mountWorkshopLinks({ document: doc, href }) {
  for (const entry of WORKSHOP_TOOLS) {
    const link = doc.getElementById(entry.opener);
    if (link) link.href = workshopToolHref(href, entry.id);
  }
}

/** Runs independently of editor/media startup; never focuses or activates a link. */
export function mountToolReturnLinks({ document: doc, href, id }) {
  const links = workshopReturnLinks(href, id);
  for (const link of doc.querySelectorAll('[data-workshop-return]')) {
    const role = link.getAttribute('data-workshop-return');
    if (role !== 'game' && role !== 'workshop') continue;
    const target = links[role];
    link.href = target;
    link.removeAttribute('inert');
    link.inert = false;
    link.removeAttribute('aria-disabled');
  }
  for (const link of doc.querySelectorAll('a[data-workshop-tool]')) {
    const target = link.getAttribute('data-workshop-tool');
    if (!tool(target)) continue;
    link.href = workshopToolHref(links.game, target);
  }
}
