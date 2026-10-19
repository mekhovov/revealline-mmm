import { t, localizedText, localizedAttribute } from '../i18n/index.mjs';

function creatorURL(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      /(^|\.)(creativecommons\.org|opensource\.org|gnu\.org)$/i.test(url.hostname) ||
      /(^|\.)(license|licence)\./i.test(url.hostname) ||
      /\/(?:licen[sc]es?|terms(?:-of-[a-z-]+)?)(?:\/|$)/i.test(url.pathname)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Creator attribution only; licence and cultural-reference links remain separate. */
export function musicCreatorLinks(track) {
  if (!track) return [];
  const websites = Array.isArray(track.websites) ? track.websites : [];
  const isCreator = (site) =>
    /creator|artist|author|composer|performer|виконав|автор/i.test(site?.label ?? '');
  const candidateSite = (site) => ({ url: site?.url, label: track.artist });
  const candidates = [
    ...websites.filter(isCreator).map(candidateSite),
    ...(Array.isArray(track.sourceCredits)
      ? track.sourceCredits.map((credit) => ({
          url: credit?.rightsEvidenceURL,
          label: credit?.artist,
        }))
      : []),
    { url: track.rights?.source, label: track.artist },
    ...websites
      .filter(
        (site) =>
          !isCreator(site) &&
          !/licen[sc]e|\bcc\b|provenance|copyright|terms|ліценз|походження/i.test(
            site?.label ?? '',
          ),
      )
      .map(candidateSite),
  ];
  const seen = new Set(),
    links = [];
  for (const candidate of candidates) {
    const url = creatorURL(candidate.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push({
      url,
      label:
        typeof candidate.label === 'string' && candidate.label.trim()
          ? candidate.label.trim()
          : new URL(url).hostname,
    });
    if (links.length === 12) break;
  }
  return links;
}

const rendered = new WeakMap();

/** Reuse anchors on position ticks so keyboard focus is not destroyed. */
export function renderMusicCreatorLinks(
  container,
  track,
  {
    document: doc = container.ownerDocument ?? globalThis.document,
    label = () => t('common:music.creatorSource'),
    fallbackText = '',
    maxLinks = 12,
  } = {},
) {
  const links = musicCreatorLinks(track)
    .slice(0, maxLinks)
    .map((site) => ({
      ...site,
      text: typeof label === 'function' ? label(site) : label,
      description: t('common:music.creatorSourceNewTab', { artist: site.label }),
    }));
  const signature = JSON.stringify([links, fallbackText]);
  if (rendered.get(container) === signature) return links;
  rendered.set(container, signature);
  container.classList.add('music-creator-links');
  const existing = [...container.querySelectorAll('a')];
  const sameURLs =
    existing.length === links.length &&
    existing.every((link, i) => link.getAttribute('href') === links[i].url);
  if (!sameURLs) container.replaceChildren();
  container.hidden = !links.length && !fallbackText;
  if (!links.length) container.textContent = fallbackText;
  for (const [index, site] of links.entries()) {
    const link = sameURLs ? existing[index] : doc.createElement('a');
    link.setAttribute('href', site.url);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    localizedAttribute(link, 'aria-label', () =>
      t('common:music.creatorSourceNewTab', { artist: site.label }),
    );
    localizedAttribute(link, 'title', () =>
      t('common:music.creatorSourceNewTab', { artist: site.label }),
    );
    localizedText(link, () => (typeof label === 'function' ? label(site) : label));
    if (!sameURLs) container.append(link);
  }
  return links;
}
