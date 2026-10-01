import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app');
const port = Number(process.env.PORT || 8779);
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    let relative = decodeURIComponent(url.pathname).replace(/^\/revealline-mmm(?=\/|$)/, '');
    if (relative.endsWith('/')) relative += 'index.html';
    const filename = path.resolve(root, `.${relative}`);
    if (!filename.startsWith(root + path.sep)) throw new Error('Outside app');
    const bytes = await fs.readFile(filename);
    response.writeHead(200, { 'content-type': types[path.extname(filename)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(bytes);
  } catch { response.writeHead(404, { 'content-type': 'text/plain' }); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Coupa app: http://127.0.0.1:${port}/revealline-mmm/`));
