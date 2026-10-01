import { canonicalJSON, required } from './data-json.mjs';
import { freezeProfileData } from './profile-channel-json.mjs';
import {
  EXTERNAL_CHAPTER_LIMITS,
  abortExternalChapter,
  emptyExternalChapterIndex,
  externalChapterHash,
  validateExternalChapter,
  validateExternalChapterIndex,
} from './external-chapter.mjs';
import { createExecutionCatalog } from './campaign-contexts.mjs';
import { createPictureIdentityCatalog } from './ui/picture-identity.mjs';
import { snapshotPictureChoice } from './presentation-pins.mjs';
import {
  PACK_LIMITS,
  emptyPackLibrary,
  exportPackLibrary,
  importPackLibrary,
  resolvePackCampaign,
} from './packs.mjs';

const bytes = (value) =>
  new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).length;

/** Pure trusted registry and pack/original metadata checks. No storage factory or access. */
export function createExternalRecoveryCatalog({
  registeredEntries = [],
  knownDescriptors = [],
  decodeImage,
  check = abortExternalChapter,
} = {}) {
  const contents = new WeakSet();
  const bases = createExecutionCatalog(registeredEntries).entries.filter(
    (e) => e.difficulty === 'standard',
  );
  required(
    Array.isArray(knownDescriptors) &&
      knownDescriptors.length <= EXTERNAL_CHAPTER_LIMITS.catalogChoices,
    'Provide a bounded trusted external descriptor registry.',
  );
  const known = new Map();
  for (const input of knownDescriptors) {
    const descriptor = validateExternalChapter(input);
    required(!known.has(descriptor.id), 'Duplicate trusted external descriptor.');
    known.set(descriptor.id, descriptor);
  }
  async function catalog(rawPacks, rawIndex, signal) {
    const index =
      rawIndex === null ? emptyExternalChapterIndex() : validateExternalChapterIndex(rawIndex);
    const packs =
      rawPacks === null ? emptyPackLibrary() : await importPackLibrary(rawPacks, { decodeImage });
    check(signal);
    required(
      bytes(exportPackLibrary(packs)) + (rawIndex === null ? 0 : bytes(index)) <=
        PACK_LIMITS.libraryBytes,
      'Packs plus descriptor index exceed the unchanged 48 MiB budget.',
    );
    for (const descriptor of known.values()) {
      if (packs.packs.some((pack) => pack.id === descriptor.id))
        required(
          index.chapters.some((entry) => entry.id === descriptor.id),
          'The known external edition needs its descriptor index; compact JSON alone is not install authority.',
        );
    }
    for (const descriptor of index.chapters) {
      const expected = known.get(descriptor.id);
      required(
        expected && canonicalJSON(expected) === canonicalJSON(descriptor),
        'Installed descriptor differs from the trusted external edition.',
      );
      const pack = packs.packs.find((entry) => entry.id === descriptor.id);
      required(
        pack &&
          bytes(JSON.stringify(pack)) === descriptor.pack.bytes &&
          (await externalChapterHash(JSON.stringify(pack))) === descriptor.pack.sha256,
        'External descriptor gameplay differs from the installed pack.',
      );
      check(signal);
      required(
        pack.format === 'xonix-pack.v5' &&
          pack.version === '1.0.0' &&
          pack.campaigns.length === 1 &&
          pack.campaigns[0].levels.length === 3 &&
          pack.themes.length === 1 &&
          pack.themes[0].id === descriptor.themeId &&
          pack.levelVisuals.length === 0 &&
          Object.keys(pack.visualOverrides).length === 0 &&
          pack.dependencies.length === 0,
        'External gameplay differs from the supported fresh-edition contract.',
      );
    }
    const entries = [
      ...bases,
      ...packs.packs.flatMap((pack) =>
        pack.campaigns.map((campaign) => resolvePackCampaign(pack, campaign.id)),
      ),
    ];
    const executions = createExecutionCatalog(entries);
    for (const descriptor of index.chapters)
      required(
        executions.select(descriptor.campaignKey, 'standard')?.sourcePackId === descriptor.id,
        'External authored owner differs from its descriptor.',
      );
    const usage = Object.freeze({
      packBytes: bytes(exportPackLibrary(packs)),
      indexBytes: rawIndex === null ? 0 : bytes(index),
      limit: PACK_LIMITS.libraryBytes,
    });
    const result = freezeProfileData({ packs, index, entries, executions, usage });
    contents.add(result);
    return result;
  }
  function closure(content, metadata) {
    required(contents.has(content), 'Use this trusted registry’s catalog result.');
    const identityCatalog = createPictureIdentityCatalog({ entries: content.entries, metadata });
    const pins = new Map();
    for (const descriptor of content.index.chapters) {
      const chapterPins = descriptor.originals.map((original) => {
        const identity = {
          baseCampaignKey: descriptor.campaignKey,
          levelId: original.levelId,
          levelRevision: original.levelRevision,
          themeId: descriptor.themeId,
        };
        required(
          identityCatalog.has(identity),
          'External poster owner differs from the retained authored map.',
        );
        const presentation = metadata.document.library.presentations.find(
          (item) => item.id === original.presentationId && item.revision === 1,
        );
        const asset = metadata.document.library.assets.find((item) => item.id === original.assetId);
        required(
          presentation &&
            canonicalJSON(presentation.identity) === canonicalJSON(identity) &&
            presentation.poster.assetId === original.assetId &&
            presentation.poster.fit === 'contain' &&
            presentation.poster.sampling === 'nearest' &&
            presentation.story === null,
          'External authored presentation is missing or differs. Restore its exact originals.',
        );
        required(
          asset &&
            ['sha256', 'bytes', 'mime', 'width', 'height'].every(
              (key) => asset[key] === original[key],
            ),
          'External original metadata is missing or differs.',
        );
        return snapshotPictureChoice({
          kind: 'still',
          identity,
          presentationId: original.presentationId,
          presentationRevision: 1,
          assetId: original.assetId,
          sha256: original.sha256,
        });
      });
      pins.set(descriptor.id, chapterPins);
    }
    return { identityCatalog, pins };
  }

  return Object.freeze({ catalog, closure });
}
