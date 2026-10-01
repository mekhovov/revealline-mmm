import { validateCompletionRewardPayload } from './model.mjs';

/** Deterministic, local presentation of an authored HTTPS address. No resolver,
 * shortener, telemetry, navigation or runtime image-import capability is used. */
export async function createRewardQrImage(input) {
  const payload = validateCompletionRewardPayload(input);
  if (payload.type !== 'url' || payload.qr !== true)
    throw new TypeError('This resource has no authored QR presentation.');
  const { qrcodegen } = await import('../vendor/qrcodegen-1.8.0.mjs');
  const { QrCode, QrSegment } = qrcodegen;
  const address = new URL(payload.url).href;
  const code = QrCode.encodeSegments(QrSegment.makeSegments(address), QrCode.Ecc.MEDIUM, 1, 12);
  // Four unmarked modules on every edge are part of the symbol, not a CSS margin.
  const size = code.size + 8;
  const squares = [];
  for (let y = 0; y < code.size; y++)
    for (let x = 0; x < code.size; x++)
      if (code.getModule(x, y)) squares.push(`M${x + 4},${y + 4}h1v1h-1z`);
  // Only validated numeric geometry enters this generated SVG. Authored text,
  // markup and URLs cannot become SVG elements, attributes or references.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><path d="${squares.join('')}" fill="black"/></svg>`;
  return Object.freeze({
    address,
    size,
    version: code.version,
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  });
}
