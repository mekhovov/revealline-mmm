import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'dist');
await fs.rm(destination, { recursive: true, force: true });
await fs.cp(path.join(root, 'app'), destination, { recursive: true });
await fs.writeFile(path.join(destination, '.nojekyll'), '');
let revision = 'local';
try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
await fs.writeFile(path.join(destination, 'deployment.json'), JSON.stringify({
  format: 'revealline-brand-deployment.v1', repository: 'mekhovov/revealline-mmm',
  revision, brand: 'coupa', edition: 'coupa-all', play: 'game/',
}, null, 2) + '\n');
console.log(`Built Coupa app at ${destination}`);
