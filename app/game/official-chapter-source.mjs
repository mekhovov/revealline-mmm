import { createOfficialDownloads } from './official-downloads.mjs';
import { prepareOfficialPack } from './packs.mjs';

/** Only files present in the generated, release-owned catalogue can become official references. */
export async function localOfficialChapter(
  id,
  {
    baseURL = new URL('../', import.meta.url),
    decodeImage,
    fetch: request = globalThis.fetch,
  } = {},
) {
  if (!globalThis.caches || !globalThis.document?.querySelector('meta[name="revealline-offline"]'))
    return null;
  const response = await request(new URL('offline-content.json', baseURL));
  if (!response.ok) return null;
  const catalogue = await response.json();
  if (catalogue.format !== 'revealline-offline-content.v1') return null;
  const group = catalogue.groups.find((item) => item.id === `chapter:${id}`);
  const file = catalogue.files.find(
    (item) => group?.files.includes(item.path) && item.path.endsWith('.json'),
  );
  if (!file) return null;
  const blob = await createOfficialDownloads().read(file.sha256);
  if (!blob) return null;
  const source = JSON.parse(await blob.text());
  const prepared = await prepareOfficialPack(
    { id, version: source.version, bytes: file.bytes, sha256: file.sha256 },
    { decodeImage },
  );
  return prepared.pack;
}
