import { required } from '../data-json.mjs';
import { t } from '../i18n/index.mjs';

const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
export const creatorAbort = (signal) => {
  if (signal?.aborted) throw new DOMException(t('errors:creator.operationCancelled'), 'AbortError');
};
export function ownCreatorBlob(source, maxBytes, label = t('interface:file')) {
  let size;
  try {
    size = nativeSize.call(source);
  } catch {
    throw new TypeError(t('errors:creator.nativeBlobRequired', { label }));
  }
  required(size > 0 && size <= maxBytes, t('errors:creator.blobByteBudget', { label }));
  return Blob.prototype.slice.call(source, 0, size);
}
export async function creatorSHA256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
}
export function imageDataURL(bytes, mime) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return `data:${mime};base64,${btoa(binary)}`;
}
