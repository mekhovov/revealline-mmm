import { canonicalJSON } from './data-json.mjs';
import {
  SOUNDTRACK_FORMAT_V3,
  freezeSoundtrack,
  resolveSoundtrackCatalogue,
  resolveSoundtrackLibrary,
  soundtrackPlaylists,
  soundtrackRecoveryPlan,
} from './soundtrack.mjs';

/** Online catalogue discovery is not ownership. Only exact trusted, unused,
 * uninstalled pins may be omitted; user originals and explicit references stay.
 * This does not alter the strict import/offline preparation rights boundary. */
export function portableSoundtrackLibrary(value, { catalogue } = {}) {
  const library = resolveSoundtrackLibrary(value);
  if (library.format !== SOUNDTRACK_FORMAT_V3 || catalogue === undefined) return library;
  const trusted = resolveSoundtrackCatalogue(catalogue),
    pins = new Map(trusted.tracks.map((track) => [track.id, canonicalJSON(track)])),
    retained = new Set([
      ...library.installedTrackIds,
      ...library.referenceOnlyTrackIds,
      // Restricted references cost metadata only and retain their existing
      // conservative recovery meaning even before the first export.
      ...soundtrackRecoveryPlan(library, { catalogue: trusted }).referenceOnlyTrackIds,
      ...library.playlists.flatMap((playlist) => playlist.trackIds),
    ]),
    selected = new Set([
      library.selection.playlistId,
      ...library.assignments.map((assignment) => assignment.playlistId),
    ]);
  for (const playlist of soundtrackPlaylists(library))
    if (selected.has(playlist.id)) for (const id of playlist.trackIds) retained.add(id);
  const catalogTracks = library.catalogTracks.filter(
    (track) => retained.has(track.id) || pins.get(track.id) !== canonicalJSON(track),
  );
  return catalogTracks.length === library.catalogTracks.length
    ? library
    : resolveSoundtrackLibrary({ ...library, catalogTracks });
}

/** Shared export/preflight plan. An omitted online pin is not a restricted
 * reference and never receives permission to omit an owned original. */
export function soundtrackPortableRecoveryPlan(value, { catalogue } = {}) {
  const initial = resolveSoundtrackLibrary(value),
    library = portableSoundtrackLibrary(initial, { catalogue }),
    retained = new Set((library.catalogTracks ?? []).map((track) => track.id)),
    omittedCatalogueTrackIds = (initial.catalogTracks ?? [])
      .filter((track) => !retained.has(track.id))
      .map((track) => track.id),
    plan = soundtrackRecoveryPlan(library, { catalogue }),
    onlineNotice = omittedCatalogueTrackIds.length
      ? `${omittedCatalogueTrackIds.length} unused online catalogue recordings are not included. They can be discovered again from a game edition that provides the same trusted catalogue; their audio is not saved in this backup.`
      : '';
  return freezeSoundtrack({
    ...plan,
    library,
    omittedCatalogueTrackIds,
    notice: [plan.notice, onlineNotice].filter(Boolean).join(' '),
  });
}
