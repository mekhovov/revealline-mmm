/** Small host adapter; game rules and replay inputs remain platform independent. */
export function nativePlatform(locationRef = globalThis.location) {
  try {
    const url = new URL(locationRef?.href);
    if (url.username || url.password || url.port) return null;
    if (url.protocol === 'revealline:' && url.hostname === 'app') return 'desktop';
    if (url.protocol === 'capacitor:' && url.hostname === 'localhost') return 'ios';
  } catch {}
  return null;
}
// Matches the compact complete-backup envelope; presentation whitespace is not added.
// Includes the existing enemy-statistics member in complete backups. Keep the
// native bridge envelope in sync; this does not change individual import limits.
export const MAX_EXPORT_BYTES = 88 * 1024 * 1024 + 40960;
let bridgePromise;
export const MAX_TEXT_EXPORT_BYTES = 1024 * 1024;
function iosBridge() {
  // This module exists only in a verified iOS stage, bundled from pinned official plugins.
  return (bridgePromise ??= import(new URL('../native/bridge.mjs', import.meta.url).href));
}
export async function exportJSONFile(
  value,
  name,
  {
    locationRef = globalThis.location,
    documentRef = globalThis.document,
    URLImpl = globalThis.URL,
    BlobImpl = globalThis.Blob,
    loadBridge = iosBridge,
    schedule = globalThis.setTimeout,
  } = {},
) {
  if (
    typeof name !== 'string' ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,179}\.json$/.test(name) ||
    name.includes('..')
  )
    throw new Error('Export needs a simple .json filename.');
  const text = JSON.stringify(value);
  if (text === undefined) throw new Error('Nothing to export.');
  if (new TextEncoder().encode(text).length > MAX_EXPORT_BYTES)
    throw new Error('Export exceeds the portable file budget.');
  if (nativePlatform(locationRef) === 'ios') return (await loadBridge()).exportJSON({ text, name });
  const url = URLImpl.createObjectURL(new BlobImpl([text], { type: 'application/json' }));
  try {
    const anchor = documentRef.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
  } finally {
    // Native Save dialogs can stay open longer than a second. Keep the blob alive briefly.
    schedule(() => URLImpl.revokeObjectURL(url), 60000);
  }
  return {
    status: 'requested',
    message:
      'Download requested. Check your downloads or Save dialog; the JSON remains available here to copy.',
  };
}

/** Plain CLI/preset text is inert data; native hosts share a bounded .txt file. */
export async function exportTextFile(
  text,
  name,
  {
    locationRef = globalThis.location,
    documentRef = globalThis.document,
    URLImpl = globalThis.URL,
    BlobImpl = globalThis.Blob,
    loadBridge = iosBridge,
    schedule = globalThis.setTimeout,
  } = {},
) {
  if (
    typeof name !== 'string' ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}\.txt$/.test(name) ||
    name.includes('..')
  )
    throw new Error('Export needs a simple .txt filename.');
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_TEXT_EXPORT_BYTES)
    throw new Error('Text export exceeds its 1 MiB limit.');
  if (nativePlatform(locationRef) === 'ios') {
    const bridge = await loadBridge();
    if (typeof bridge.exportText !== 'function')
      throw new Error('Text export is unavailable in this app version. Copy the text instead.');
    return bridge.exportText({ text, name });
  }
  const url = URLImpl.createObjectURL(new BlobImpl([text], { type: 'text/plain;charset=utf-8' }));
  try {
    const anchor = documentRef.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
  } finally {
    schedule(() => URLImpl.revokeObjectURL(url), 60000);
  }
  return {
    status: 'requested',
    message:
      'Download requested. Check your downloads or Save dialog; the text remains available here to copy.',
  };
}
/** iOS lifecycle is explicit; web/Electron already use visibility and focus events. */
export async function onNativeInactive(
  callback,
  { locationRef = globalThis.location, loadBridge = iosBridge } = {},
) {
  if (nativePlatform(locationRef) !== 'ios') return () => {};
  return (await loadBridge()).onInactive(callback);
}
