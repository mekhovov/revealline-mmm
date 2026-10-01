import { canonicalJSON, required } from '../data-json.mjs';
import {
  STILL_ASSET_FORMAT,
  MEDIA_PRESENTATION_FORMAT,
  MEDIA_LIMITS,
  validateStillAsset,
  validateMediaLibrary,
} from '../media-library.mjs';
import { storedStillHashes } from '../media-storage-record.mjs';
import { validateExternalChapter } from '../external-chapter.mjs';
import { CURRENT_PICTURES } from './current-pictures.mjs';
import { CURRENT_PICTURE_BASELINES } from './current-picture-baselines.mjs';
import { inspectImageDataUrl } from '../content.mjs';
import { validateAssetRevision } from './model.mjs';
import { hashPresentationBytes } from './bundle.mjs';

const owners = new Map(
  CURRENT_PICTURES.filter((row) => row.owner.themeId === 'fpv').map((row) => [
    canonicalJSON(row.owner),
    row,
  ]),
);
const abort = (signal) => {
  if (signal?.aborted)
    throw new DOMException('Picture default preparation cancelled.', 'AbortError');
};
const same = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const notice = (onStatus, signal, stage, message) => {
  if (signal?.aborted) return;
  try {
    onStatus?.({ status: 'preparing', stage, message, progress: null });
  } catch {}
};
const baselines = new Map(CURRENT_PICTURE_BASELINES.map((row) => [row.id, row]));

export class ReleasePictureWriteRequiredError extends Error {
  constructor() {
    super(
      'This session cannot save a new picture. Export current game data before reloading to prepare it. Previously saved flights and originals are kept.',
    );
    this.name = 'ReleasePictureWriteRequiredError';
  }
}

/** Same gameplay identity does not prove the embedded picture is still the
 * shipped original: an imported pack may deliberately replace its background. */
export async function matchesReleasePictureBaseline(identity, background, { signal } = {}) {
  abort(signal);
  const row = owners.get(canonicalJSON(identity)),
    baseline = row && baselines.get(row.id);
  if (!baseline) return false;
  if (!background) return baseline.kind === 'procedural' || baseline.kind === 'external';
  if (
    !baseline.image ||
    (background.fit ?? 'cover') !== baseline.fit ||
    typeof background.dataUrl !== 'string'
  )
    return false;
  const header = inspectImageDataUrl(background.dataUrl),
    expected = baseline.image;
  if (
    !header.valid ||
    header.mime !== expected.mime ||
    header.width !== expected.width ||
    header.height !== expected.height
  )
    return false;
  const binary = atob(background.dataUrl.split(',')[1]);
  if (binary.length !== expected.bytes) return false;
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    hash = await hashPresentationBytes(bytes);
  abort(signal);
  return hash === expected.sha256;
}

/** Only the code-owned exact current owner map may choose a release picture.
 * Imported themes never supply campaign ownership or a fetch URL. */
export function releasePictureForIdentity(snapshot, identity) {
  const row = owners.get(canonicalJSON(identity));
  if (!row) return null;
  const assets = snapshot?.resolved?.assets,
    exact = assets?.[row.id],
    generic =
      row.dimensions[1] === 576
        ? row.dimensions[0] === 768
          ? 'scene.reveal.legacy'
          : row.dimensions[0] === 1152
            ? 'scene.reveal.wide'
            : null
        : null,
    slotId = !exact || exact.kind === 'recipe' ? generic : row.id,
    raw = slotId && assets?.[slotId];
  if (!raw || raw.kind !== 'image') return null;
  const asset = validateAssetRevision(raw),
    file = asset.file,
    frame = asset.geometry.frame;
  required(
    ['image/png', 'image/jpeg', 'image/webp'].includes(file.mime) &&
      file.bytes <= MEDIA_LIMITS.assetBytes &&
      file.width <= MEDIA_LIMITS.posterWidth &&
      file.height <= MEDIA_LIMITS.posterHeight &&
      frame.x === 0 &&
      frame.y === 0 &&
      frame.width === file.width &&
      frame.height === file.height,
    'A release picture must be a complete bounded PNG/JPEG/WebP original.',
  );
  if (slotId !== row.id && (file.width !== row.dimensions[0] || file.height !== row.dimensions[1]))
    return null;
  return Object.freeze({ slotId, label: row.label, identity: row.owner, asset });
}

async function records(choice, previous) {
  const file = choice.asset.file,
    assetId = `fk-art-${file.sha256}`,
    presentationId = `fk-picture-${await hashPresentationBytes(
      new TextEncoder().encode(
        canonicalJSON({
          identity: choice.identity,
          sha256: file.sha256,
          fit: 'contain',
          sampling: 'nearest',
        }),
      ),
    )}`;
  let asset = previous.assets.find((row) => row.id === assetId);
  if (asset) {
    required(
      ['sha256', 'bytes', 'mime', 'width', 'height'].every((key) => asset[key] === file[key]),
      'Release picture asset identity conflicts with retained history.',
    );
  } else
    asset = validateStillAsset({
      format: STILL_ASSET_FORMAT,
      id: assetId,
      ...file,
      provenance: {
        kind: 'original',
        credit: choice.asset.provenance.creator.slice(0, 512),
        source: `Published Field Kit original. ${choice.asset.provenance.source}`.slice(0, 2048),
      },
    });
  let presentation = previous.presentations.find(
    (row) => row.id === presentationId && row.revision === 1,
  );
  if (presentation) {
    required(
      same(presentation.identity, choice.identity) &&
        same(presentation.poster, { assetId, fit: 'contain', sampling: 'nearest' }) &&
        presentation.story === null,
      'Release picture presentation conflicts with retained history.',
    );
  } else
    presentation = {
      format: MEDIA_PRESENTATION_FORMAT,
      id: presentationId,
      revision: 1,
      identity: choice.identity,
      poster: { assetId, fit: 'contain', sampling: 'nearest' },
      story: null,
      description: `${choice.label}. ${choice.asset.description}`.slice(0, 2048),
    };
  return {
    choice,
    asset,
    presentation,
    assignment: { identity: choice.identity, presentationId, revision: 1 },
  };
}

/** Durable originals use the established still ledger, export and CAS paths.
 * New attempts append history only; the chosen default is an in-memory selection.
 * A just-completed chapter install may additionally assign its exact new owners. */
export function createReleasePictureDefaults({
  getHost,
  ready = async () => {},
  executionCatalog,
  readMedia,
  assertWritable = () => {},
  sessionPictures = null,
  sessionOnly = () => false,
  commit = (store, prepared, options) => store.commit(prepared, options),
}) {
  required(
    typeof getHost === 'function' &&
      typeof executionCatalog === 'function' &&
      typeof readMedia === 'function' &&
      typeof sessionOnly === 'function',
    'Release pictures need the current host and still catalog.',
  );
  async function source(signal, onStatus) {
    abort(signal);
    notice(onStatus, signal, 'preparing', 'Preparing the published picture choices…');
    await ready();
    abort(signal);
    const host = getHost(),
      snapshot = host?.current();
    return { host, snapshot };
  }
  async function materialize({
    media,
    choices,
    host,
    snapshot,
    signal,
    onStatus,
    persistBindings = false,
  }) {
    abort(signal);
    if (!choices.length) return { media, library: media.metadata.document.library };
    notice(onStatus, signal, 'verifying', 'Checking the exact published picture identities…');
    const previous = media.metadata.document.library,
      additions = await Promise.all(choices.map((choice) => records(choice, previous))),
      library = {
        ...previous,
        assets: [...previous.assets],
        presentations: [...previous.presentations],
        assignments: [...previous.assignments],
      };
    abort(signal);
    for (const row of additions) {
      if (!library.assets.some((asset) => asset.id === row.asset.id))
        library.assets.push(row.asset);
      if (!library.presentations.some((p) => p.id === row.presentation.id && p.revision === 1))
        library.presentations.push(row.presentation);
      if (persistBindings)
        library.assignments = [
          ...library.assignments.filter((entry) => !same(entry.identity, row.assignment.identity)),
          row.assignment,
        ];
    }
    if (!same(library, previous)) {
      // Only an explicit, already-known writer-unavailable policy may choose
      // session history. A failed durable write never falls back here.
      if (!persistBindings && sessionPictures && sessionOnly() === true) {
        let stage;
        try {
          const selected = validateMediaLibrary(
            {
              ...library,
              assignments: [
                ...library.assignments.filter(
                  (entry) =>
                    !additions.some((row) => same(row.assignment.identity, entry.identity)),
                ),
                ...additions.map((row) => row.assignment),
              ],
            },
            { identityCatalog: choices[0].identityCatalog, previous },
          );
          const accepted = new Set(
            sessionPictures.metadata().document.library.assets.map((asset) => asset.sha256),
          );
          const originals = new Map();
          for (const row of additions) {
            abort(signal);
            required(host.current() === snapshot, 'Release picture changed during preparation.');
            if (accepted.has(row.asset.sha256) || originals.has(row.asset.sha256)) continue;
            notice(onStatus, signal, 'downloading', 'Downloading the published picture original…');
            const original = await host.readPicture(row.choice.slotId, {
              snapshot,
              signal,
              onStatus,
            });
            abort(signal);
            required(
              host.current() === snapshot && same(original.asset, row.choice.asset),
              'Release picture changed during preparation.',
            );
            originals.set(row.asset.sha256, { sha256: row.asset.sha256, blob: original.blob });
          }
          notice(onStatus, signal, 'verifying', 'Verifying picture originals for this session…');
          stage = await sessionPictures.stage(
            additions.map(({ choice: { slotId, label, identity, asset }, ...row }) => ({
              ...row,
              choice: { slotId, label, identity, asset },
            })),
            [...originals.values()],
            { executionCatalog: executionCatalog(), signal },
          );
          abort(signal);
          required(host.current() === snapshot, 'Release picture changed during preparation.');
          return { media, library: selected, stage };
        } catch (error) {
          stage?.discard();
          throw error;
        }
      }
      // Existing exact originals can be selected read-only after a history
      // return. Missing history needs the current writer before any download.
      assertWritable();
      const blobs = new Map();
      notice(onStatus, signal, 'reading', 'Reading retained picture originals…');
      for (const hash of storedStillHashes(media.metadata.document)) {
        abort(signal);
        const blob = await media.store.readBlob(hash, { signal });
        required(
          blob,
          'A retained picture original is missing; restore it before adding a default.',
        );
        blobs.set(hash, { sha256: hash, blob });
      }
      for (const row of additions) {
        if (blobs.has(row.asset.sha256)) continue;
        notice(onStatus, signal, 'downloading', 'Downloading the published picture original…');
        const original = await host.readPicture(row.choice.slotId, { snapshot, signal, onStatus });
        abort(signal);
        required(
          same(original.asset, row.choice.asset),
          'Release picture changed during preparation.',
        );
        blobs.set(row.asset.sha256, { sha256: row.asset.sha256, blob: original.blob });
      }
      notice(onStatus, signal, 'verifying', 'Verifying picture originals before storage…');
      const prepared = await media.store.prepare(library, [...blobs.values()], {
        executionCatalog: executionCatalog(),
        previous: media.metadata.document,
        signal,
      });
      abort(signal);
      required(host.current() === snapshot, 'Release picture changed before storage.');
      const expectedGeneration = media.metadata.generation;
      notice(onStatus, signal, 'saving', 'Finishing picture save…');
      await commit(media.store, prepared, { expectedGeneration, signal });
      // Durable completion is not rollback: cancellation may leave unused history,
      // but the attempt checks ownership before adopting any new pin.
      notice(onStatus, signal, 'verifying', 'Confirming the saved picture choices…');
      media = await readMedia({ signal });
      required(
        media.metadata.generation === expectedGeneration + 1,
        'Picture choices changed after storage; retry the paused attempt.',
      );
    }
    abort(signal);
    const current = media.metadata.document.library;
    return {
      media,
      library: validateMediaLibrary(
        {
          ...current,
          assignments: [
            ...current.assignments.filter(
              (entry) => !additions.some((row) => same(row.assignment.identity, entry.identity)),
            ),
            ...additions.map((row) => row.assignment),
          ],
        },
        { identityCatalog: choices[0].identityCatalog, previous: current },
      ),
    };
  }
  return Object.freeze({
    async prepareSelection({ media, selection, signal, onStatus, authoredBackground = null }) {
      const identities = selection.themeIds
        .map((themeId) =>
          selection.identityCatalog.resolve({
            executionKey: selection.executionKey,
            levelId: selection.levelId,
            levelRevision: selection.levelRevision,
            themeId,
          }),
        )
        .filter(
          (identity) =>
            identity?.themeId === 'fpv' &&
            !media.metadata.document.library.assignments.some((entry) =>
              same(entry.identity, identity),
            ),
        );
      if (!identities.length) return { media, library: selection.library };
      notice(onStatus, signal, 'verifying', 'Checking the original picture’s release identity…');
      const eligible = [];
      for (const identity of identities)
        if (await matchesReleasePictureBaseline(identity, authoredBackground, { signal }))
          eligible.push(identity);
      if (!eligible.length) return { media, library: selection.library };
      const { host, snapshot } = await source(signal, onStatus);
      const choices = eligible
        .map((identity) => releasePictureForIdentity(snapshot, identity))
        .filter(Boolean)
        .map((choice) => ({ ...choice, identityCatalog: selection.identityCatalog }));
      return materialize({ media, choices, host, snapshot, signal, onStatus });
    },
    /** Invoke only after a fresh successful install, never recovery/import. The
     * install's exact generation fences manual changes and unrelated writers. */
    async assignFreshChapter({
      descriptor: candidate,
      mediaGeneration,
      identityCatalog,
      signal,
      onStatus,
    }) {
      const descriptor = validateExternalChapter(candidate);
      if (descriptor.themeId !== 'fpv') return false;
      const { host, snapshot } = await source(signal, onStatus);
      if (!snapshot) return false;
      notice(onStatus, signal, 'reading', 'Reading the installed chapter’s picture choices…');
      const media = await readMedia({ signal });
      required(
        media.metadata.generation === mediaGeneration,
        'Fresh chapter picture generation changed.',
      );
      const choices = [];
      for (const original of descriptor.originals) {
        const identity = {
          baseCampaignKey: descriptor.campaignKey,
          levelId: original.levelId,
          levelRevision: original.levelRevision,
          themeId: descriptor.themeId,
        };
        const assignment = media.metadata.document.library.assignments.find((row) =>
          same(row.identity, identity),
        );
        required(
          assignment?.presentationId === original.presentationId && assignment.revision === 1,
          'Fresh chapter assignment changed; retain the explicit choice.',
        );
        const choice = releasePictureForIdentity(snapshot, identity);
        if (choice) choices.push({ ...choice, identityCatalog });
      }
      if (!choices.length) return false;
      await materialize({
        media,
        choices,
        host,
        snapshot,
        signal,
        onStatus,
        persistBindings: true,
      });
      return true;
    },
  });
}
