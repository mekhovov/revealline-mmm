/** Resolve the transitive, deduplicated file set; soundtrack groups have no game dependencies. */
export function downloadFiles(catalogue, ids) {
  if (
    !['revealline-offline-content.v1', 'revealline-offline-content.v2'].includes(catalogue?.format)
  )
    throw new Error('Unsupported offline catalogue.');
  const groups = new Map(catalogue.groups.map((group) => [group.id, group]));
  const files = new Map(catalogue.files.map((file) => [file.path, file]));
  const selected = new Map(),
    visited = new Set(),
    visiting = new Set();
  function visit(id, kind) {
    if (visiting.has(id)) throw new Error('Offline dependency cycle.');
    const group = groups.get(id);
    if (!group || (kind === 'gameplay' && group.kind !== 'gameplay'))
      throw new Error('Invalid offline group dependency.');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of group.requires) visit(dependency, group.kind);
    for (const path of group.files) {
      const file = files.get(path);
      if (!file || file.kind !== group.kind) throw new Error('Invalid offline file dependency.');
      const previous = selected.get(file.sha256);
      if (previous && previous.bytes !== file.bytes)
        throw new Error('Conflicting content identity.');
      selected.set(file.sha256, file);
    }
    visiting.delete(id);
    visited.add(id);
  }
  ids.forEach((id) => visit(id));
  return [...selected.values()];
}
