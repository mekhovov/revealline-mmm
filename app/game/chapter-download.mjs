const kept = 'Your current flight and installed chapters are kept.';

function downloadError(message, cause) {
  const error = new Error(message, { cause });
  error.code = 'chapter-download';
  return error;
}

/** Read one already-validated catalog entry. Preparation, installation and stale-work guards stay with the host. */
export async function fetchBundledChapter(summary, { fetch: request = globalThis.fetch } = {}) {
  let response;
  try {
    response = await request(`content/packs/${summary.path}`);
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw downloadError(
      `Chapter download unavailable: ${summary.name}. Connect to the internet, then choose this chapter again to download it. Already-installed chapters can still be selected offline. ${kept}`,
      error,
    );
  }
  if (!response.ok)
    throw downloadError(
      `Chapter download unavailable: ${summary.name} (HTTP ${response.status}). While online, choose this chapter again to retry the download. ${kept}`,
    );
  try {
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw downloadError(
      `The download for ${summary.name} could not be read. While online, choose this chapter again to retry the download. ${kept}`,
      error,
    );
  }
}
