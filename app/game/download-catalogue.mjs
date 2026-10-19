import { validateOfficialDownloadFile } from './official-downloads.mjs';

const kinds = new Set(['gameplay', 'soundtrack']);
const identity = (value) => typeof value === 'string' && value.length > 0 && value.length <= 200;

function catalogueIndex(catalogue) {
  if (
    !['revealline-offline-content.v1', 'revealline-offline-content.v2'].includes(catalogue?.format)
  )
    throw new Error(
      'Unsupported offline catalogue. Open Check for updates to load a compatible downloader.',
    );
  if (!Array.isArray(catalogue.groups) || !Array.isArray(catalogue.files))
    throw new Error('Invalid offline catalogue lists.');
  const groups = new Map(),
    files = new Map();
  for (const group of catalogue.groups) {
    if (
      !group ||
      !identity(group.id) ||
      !kinds.has(group.kind) ||
      (group.current !== undefined && typeof group.current !== 'boolean') ||
      !Array.isArray(group.requires) ||
      !Array.isArray(group.files)
    )
      throw new Error('Invalid offline package descriptor.');
    if (groups.has(group.id)) throw new Error(`Duplicate offline package identity: ${group.id}.`);
    groups.set(group.id, group);
  }
  for (const file of catalogue.files) {
    if (!file || typeof file.path !== 'string' || !file.path.length || !kinds.has(file.kind))
      throw new Error('Invalid offline file descriptor.');
    if (files.has(file.path)) throw new Error(`Duplicate offline file path: ${file.path}.`);
    files.set(file.path, file);
  }
  return { groups, files };
}

/** Iterative postorder traversal: shared dependencies are visited once, regardless of depth. */
function resolveFiles({ groups, files }, ids) {
  if (!Array.isArray(ids)) throw new Error('Invalid offline package selection.');
  const selected = new Map(),
    visited = new Set(),
    visiting = new Set();
  for (const id of ids) {
    const stack = [{ id }];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const group = groups.get(frame.id);
      if (!group || (frame.kind && group.kind !== frame.kind))
        throw new Error(`Invalid offline group dependency: ${frame.id}.`);
      if (visited.has(frame.id)) {
        stack.pop();
        continue;
      }
      if (frame.next === undefined) {
        if (visiting.has(frame.id)) throw new Error(`Offline dependency cycle: ${frame.id}.`);
        visiting.add(frame.id);
        frame.next = 0;
      }
      if (frame.next < group.requires.length) {
        stack.push({ id: group.requires[frame.next++], kind: group.kind });
        continue;
      }
      for (const path of group.files) {
        const file = files.get(path);
        if (!file || file.kind !== group.kind)
          throw new Error(`Invalid offline file dependency: ${path}.`);
        const previous = selected.get(file.sha256);
        if (previous && previous.bytes !== file.bytes)
          throw new Error('Conflicting content identity.');
        selected.set(file.sha256, file);
      }
      visiting.delete(frame.id);
      visited.add(frame.id);
      stack.pop();
    }
  }
  return [...selected.values()];
}

/** Admission shared by publication and the downloads screen, before storage or transfer. */
export function validateDownloadCatalogue(catalogue) {
  const index = catalogueIndex(catalogue);
  const hashes = new Map();
  for (const file of index.files.values()) {
    try {
      validateOfficialDownloadFile(file);
    } catch (error) {
      throw new Error(`Offline file ${file.path}: ${error.message}`, { cause: error });
    }
    // Recordings use virtual identities resolved by the rights-aware audio provider.
    // Other bodies use canonical, edition-relative paths, never external URLs.
    if (
      file.kind === 'soundtrack' && file.path.startsWith('soundtrack:')
        ? !identity(file.trackId) || file.path !== `soundtrack:${file.trackId}`
        : file.path.split('/').some((part) => !part || part === '.' || part === '..') ||
          /[\\%?#:\u0000-\u0020\u007f]/.test(file.path)
    )
      throw new Error(`Invalid offline file path: ${file.path}.`);
    const previous = hashes.get(file.sha256);
    if (previous !== undefined && previous !== file.bytes)
      throw new Error(`Conflicting content identity: ${file.path}.`);
    hashes.set(file.sha256, file.bytes);
  }
  // Include archives, tools and unselected music: every published choice must resolve.
  resolveFiles(index, [...index.groups.keys()]);
  if (catalogue.missions !== undefined && !Array.isArray(catalogue.missions))
    throw new Error('Invalid offline mission list.');
  for (const mission of catalogue.missions || []) {
    if (
      !mission ||
      !Array.isArray(mission.groups) ||
      !mission.groups.length ||
      mission.groups.some((id) => index.groups.get(id)?.kind !== 'gameplay')
    )
      throw new Error(`Invalid offline mission dependency: ${mission?.id}.`);
  }
  return catalogue;
}

/** Resolve the transitive, deduplicated file set without mixing gameplay and recordings. */
export function downloadFiles(catalogue, ids) {
  return resolveFiles(catalogueIndex(catalogue), ids);
}
