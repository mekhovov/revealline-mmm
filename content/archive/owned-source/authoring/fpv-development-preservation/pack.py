#!/usr/bin/env python3
"""Pack cleared manifest objects; all payload staging remains in a fresh chosen directory."""
import argparse
import hashlib
import io
import json
import math
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import stat
import tarfile
import time


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        while data := f.read(4 * 1024 * 1024):
            h.update(data)
    return h.hexdigest()


def safe_relative(value):
    p = PurePosixPath(value)
    if not value or p.is_absolute() or '..' in p.parts or '\\' in value or '\0' in value:
        raise ValueError('Unsafe manifest path')
    return p


def privacy_hold(path):
    parts = PurePosixPath(path).parts
    if any(p.lower() in {'.aws', '.ssh', '.gnupg', '.codex', '.claude', 'coupa',
                          'indexeddb', 'local storage', 'session storage', 'cookies',
                          'login data', 'history'} for p in parts):
        return 'private-system-or-browser-data-name'
    if re.search(r'coupa|(?:codex|claude).*history|history.*(?:codex|claude)|browser[-_ ]?profile', path, re.I):
        return 'private-history-or-profile-name'
    return None


def rows(path, require_final_newline=False):
    with Path(path).open() as f:
        for number, line in enumerate(f, 1):
            if require_final_newline and not line.endswith('\n'):
                raise ValueError('Final manifest row lacks its closing newline: %s:%d' % (path, number))
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError('Malformed manifest JSON row: %s:%d' % (path, number)) from exc
            if not isinstance(row, dict) or row.get('kind') not in {
                    'file', 'symlink', 'excluded', 'git-checkout', 'error', 'unstable'}:
                raise ValueError('Unsupported manifest row kind: %s:%d' % (path, number))
            yield row


def load_clearances(path):
    if not path:
        return []
    data = json.loads(Path(path).read_text())
    entries = data['rows'] if isinstance(data, dict) else data
    return [x for x in entries if x.get('decision') == 'allow-app-archive']


class CheckedReader:
    def __init__(self, raw):
        self.raw, self.hash, self.bytes = raw, hashlib.sha256(), 0

    def read(self, size=-1):
        data = self.raw.read(size)
        self.hash.update(data)
        self.bytes += len(data)
        return data


def member(name, size):
    t = tarfile.TarInfo(name)
    t.size, t.mode, t.mtime, t.uid, t.gid = size, 0o444, 0, 0, 0
    t.uname = t.gname = ''
    return t


def source_candidate(root, candidates):
    for r in candidates:
        p = root.joinpath(*safe_relative(r['path']).parts)
        try:
            s = p.stat(follow_symlinks=False)
            if not stat.S_ISREG(s.st_mode):
                continue
            if s.st_size == r['bytes'] and s.st_mtime_ns == r['mtime_ns']:
                return p, s, r
        except OSError:
            continue
    raise ValueError('No unchanged source candidate: ' + candidates[0]['path'])


def pack_part(root, stage, receipts, number, objects):
    header = {'format': 'FPVCASPart.v1', 'number': number,
              'objects': [{'sha256': x['sha256'], 'bytes': x['bytes'],
                           'member': 'objects/' + x['sha256']} for x in objects]}
    header_bytes = (json.dumps(header, separators=(',', ':')) + '\n').encode()
    archive = stage / ('part-%04d.tar.zst' % number)
    verifies = []
    with archive.open('xb') as output:
        process = subprocess.Popen(['zstd', '-q', '-3', '-T1', '-c'], stdin=subprocess.PIPE, stdout=output)
        try:
            with tarfile.open(fileobj=process.stdin, mode='w|', format=tarfile.USTAR_FORMAT,
                              copybufsize=4 * 1024 * 1024) as tar:
                tar.addfile(member('part-manifest.json', len(header_bytes)), io.BytesIO(header_bytes))
                started = time.monotonic()
                for x in objects:
                    source, before, record = source_candidate(root, x['candidates'])
                    with source.open('rb') as raw:
                        checked = CheckedReader(raw)
                        tar.addfile(member('objects/' + x['sha256'], x['bytes']), checked)
                    after_write = source.stat()
                    if checked.bytes != x['bytes'] or checked.hash.hexdigest() != x['sha256']:
                        raise ValueError('Source changed while packing: ' + record['path'])
                    after_hash = digest(source)
                    after = source.stat()
                    if after_hash != x['sha256'] or any(s.st_size != x['bytes'] or s.st_mtime_ns != before.st_mtime_ns
                                                       for s in [after_write, after]):
                        raise ValueError('Source changed after packing: ' + record['path'])
                    verifies.append({'path': record['path'], 'sha256': x['sha256'], 'bytes': x['bytes'],
                                     'sourceBeforeAndAfterSHA256Match': True, 'mtimeNs': before.st_mtime_ns})
                    if len(verifies) % 100 == 0:
                        print(json.dumps({'event': 'pack-progress', 'part': number,
                                          'checkedObjects': len(verifies), 'totalPartObjects': len(objects),
                                          'elapsedSeconds': round(time.monotonic() - started, 1)}), flush=True)
            process.stdin.close()
            if process.wait() != 0:
                raise RuntimeError('zstd failed')
        except BaseException:
            process.stdin.close()
            process.terminate()
            process.wait()
            raise
    sha = digest(archive)
    receipt = {'format': 'FPVCASPartLocal.v1', 'number': number, 'archive': str(archive),
               'bytes': archive.stat().st_size, 'sha256': sha, 'partManifest': header,
               'sources': verifies, 'uploaded': False, 'readbackVerified': False}
    with (receipts / ('part-%04d-local.json' % number)).open('x') as f:
        json.dump(receipt, f, indent=2)
        f.write('\n')
    print(json.dumps({'event': 'packed', 'part': number, 'objects': len(objects),
                      'rawObjectBytes': sum(x['bytes'] for x in objects),
                      'compressedBytes': receipt['bytes'], 'sha256': sha}), flush=True)
    return receipt


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--manifest', required=True)
    p.add_argument('--source-root', required=True)
    p.add_argument('--stage', required=True)
    p.add_argument('--receipts', required=True)
    p.add_argument('--release-index', required=True)
    p.add_argument('--library-preflight', required=True)
    p.add_argument('--max-raw', type=int, default=1_350_000_000)
    p.add_argument('--exclude-digests')
    p.add_argument('--clearances')
    p.add_argument('--reserved-digests', help='Objects owned by an active pack batch; not a durability claim')
    a = p.parse_args()
    root, stage, receipts = Path(a.source_root), Path(a.stage), Path(a.receipts)
    stage.mkdir()
    receipts.mkdir()
    known = json.loads(Path(a.release_index).read_text())
    library = {x['sha256']: x for x in json.loads(Path(a.library_preflight).read_text())['archives']}
    if a.exclude_digests:
        library.update({x: {} for x in json.loads(Path(a.exclude_digests).read_text())})
    reserved = set(json.loads(Path(a.reserved_digests).read_text())) if a.reserved_digests else set()
    snapshot = list(rows(a.manifest))
    clearance_rows = load_clearances(a.clearances)
    cleared = {(r['path'], r['sha256']) for r in clearance_rows}
    held = {r['sha256'] for r in snapshot if r.get('kind') == 'file' and
            (r.get('review') or privacy_hold(r['path'])) and (r['path'], r['sha256']) not in cleared}
    groups, skipped, reused = {}, [], []
    for r in snapshot:
        if r.get('kind') != 'file':
            continue
        safe_relative(r['path'])
        sha = r['sha256']
        if sha in held:
            skipped.append({'path': r['path'], 'sha256': sha,
                            'review': r.get('review') or [privacy_hold(r['path']) or 'same-sha-as-held-row']})
            continue
        matches = [x for x in known.get(sha, []) if x['bytes'] == r['bytes']]
        if sha in library or matches:
            reused.append({'path': r['path'], 'sha256': sha, 'bytes': r['bytes'],
                           'libraryOwned': sha in library, 'releaseMatches': matches})
            continue
        g = groups.setdefault(sha, {'sha256': sha, 'bytes': r['bytes'], 'candidates': []})
        if g['bytes'] != r['bytes']:
            raise ValueError('SHA/size mismatch')
        g['candidates'].append(r)
    used = set()
    # Earlier successful local packs are never overwritten; only new content is packed.
    for old in receipts.parent.glob('batch-*/part-*-local.json'):
        for x in json.loads(old.read_text())['partManifest']['objects']:
            used.add(x['sha256'])
    objects = [g for sha, g in sorted(groups.items()) if sha not in used and sha not in reserved]
    manifest_record = {'format': 'FPVPackBatch.v1', 'sourceManifest': str(a.manifest),
                       'snapshotRows': len(snapshot), 'held': skipped, 'reused': reused,
                       'uniqueObjectsToPack': len(objects), 'uniqueBytesToPack': sum(x['bytes'] for x in objects),
                       'previouslyPackedObjects': len(used), 'finalCoverageClaimed': False}
    manifest_record['reservedForActiveBatchObjects'] = len(set(groups) & reserved)
    manifest_record['reviewClearances'] = clearance_rows
    if a.clearances:
        manifest_record['clearanceReceiptSHA256'] = digest(a.clearances)
    with (receipts / 'batch.json').open('x') as f:
        json.dump(manifest_record, f, indent=2)
        f.write('\n')
    number, part, estimated = 1, [], 20_480
    for x in objects:
        # Payload + header + its part-manifest entry, with conservative padding.
        needed = math.ceil(x['bytes'] / 512) * 512 + 1536
        if needed > a.max_raw:
            raise ValueError('Large-object chunking required before packing: ' + x['candidates'][0]['path'])
        if part and estimated + needed > a.max_raw:
            pack_part(root, stage, receipts, number, part)
            number, part, estimated = number + 1, [], 20_480
        part.append(x)
        estimated += needed
    if part:
        pack_part(root, stage, receipts, number, part)
    print(json.dumps({'event': 'batch-complete', 'parts': number if part else number - 1,
                      'objects': len(objects), 'heldRows': len(skipped), 'reusedRows': len(reused),
                      'finalCoverageClaimed': False}), flush=True)


if __name__ == '__main__':
    main()
