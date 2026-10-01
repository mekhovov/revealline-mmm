import { required } from './data-json.mjs';
import { resolveSoundtrackLibrary, upgradeSoundtrackLibrary } from './soundtrack.mjs';

export const OPENING_THEME_TRACK_ID =
  'builtin.catalog.alexander-nakarada.carol-of-the-bells-metal-version';
export const OPENING_THEME_PLAYLIST_ID = 'builtin.album.ukrainian.shchedryk-opening';
const OPENING_THEME_FALLBACK_PLAYLIST_ID = 'builtin.all';

/** The new default is intentionally recognizable without replacing a saved
 * style, custom playlist, Recording mode or Installed-only choice. */
export function usesOpeningThemeDefault(value, { fresh = false } = {}) {
  const library = resolveSoundtrackLibrary(upgradeSoundtrackLibrary(value));
  return (
    fresh === true &&
    library.selection.playlistId === null &&
    library.listening.mode === 'ukrainian' &&
    library.listening.installedOnly === false &&
    library.listening.recordingMode === false
  );
}

/** Select and prepare the core recording without playing it. The host calls
 * this after storage adoption; the first eligible browser gesture owns Play. */
export async function prepareOpeningTheme(player, library, options) {
  required(
    typeof player?.selectPlaylist === 'function' &&
      typeof player?.prepare === 'function' &&
      typeof player?.snapshot === 'function',
    'Opening-theme preparation requires the soundtrack player.',
  );
  if (!usesOpeningThemeDefault(library, options)) return player.prepare({ allowNetwork: false });
  await player.selectPlaylist(OPENING_THEME_PLAYLIST_ID, {
    // Keep recovery with the transport because a muted first visit must defer
    // acquisition until a later Play gesture. A newer explicit selection
    // replaces this one-shot fallback before it can affect the user's choice.
    failureFallbackPlaylistId: OPENING_THEME_FALLBACK_PLAYLIST_ID,
  });
  if (player.snapshot().selection !== OPENING_THEME_PLAYLIST_ID) return false;
  return player.prepare({ allowNetwork: true });
}
