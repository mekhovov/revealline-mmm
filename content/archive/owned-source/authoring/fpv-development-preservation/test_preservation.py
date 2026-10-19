import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import base64
import copy

from pack import safe_relative, privacy_hold, pack_part
from verify_upload import restore_part
from restore import link_target, restore
from build_index import build
from verify_published import verify_plan
from github_dependencies import git_identity, manifest_tree


class PreservationTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix='preservation-check-'))

    def test_refuses_traversal_and_private_browser_history(self):
        for path in ['../outside', '/absolute', 'a/../../outside', 'a\\outside']:
            with self.assertRaises(ValueError):
                safe_relative(path)
        self.assertTrue(privacy_hold('capture/IndexedDB/records'))
        self.assertTrue(privacy_hold('coupa/private.json'))
        self.assertTrue(privacy_hold('codex-history.json'))
        self.assertIsNone(privacy_hold('game/live-session.mjs'))

    def test_real_part_roundtrip_and_tampered_header_refusal(self):
        source, stage, receipts = [self.root / x for x in ['source', 'parts', 'receipts']]
        for p in [source, stage, receipts]:
            p.mkdir()
        raw = b'actual preservation boundary\0' * 1000
        path = source / 'original.bin'
        path.write_bytes(raw)
        # Give the immutable fixture an explicit stable timestamp on SMB shares.
        os.utime(path, ns=(1_500_000_000_000_000_000, 1_500_000_000_000_000_000))
        sha = hashlib.sha256(raw).hexdigest()
        row = {'path': path.name, 'bytes': len(raw), 'sha256': sha,
               'mtime_ns': path.stat().st_mtime_ns, 'mode': 0o644}
        plan = [{'sha256': sha, 'bytes': len(raw), 'candidates': [row]}]
        receipt = pack_part(source, stage, receipts, 1, plan)
        result = restore_part(Path(receipt['archive']), self.root / 'restored', receipt['partManifest'])
        self.assertEqual(result['members'], 1)
        self.assertEqual((self.root / 'restored/objects' / sha).read_bytes(), raw)
        bad = dict(receipt['partManifest'], number=2)
        with self.assertRaisesRegex(ValueError, 'header differs'):
            restore_part(Path(receipt['archive']), self.root / 'bad-header', bad)
        with self.assertRaises(FileExistsError):
            restore_part(Path(receipt['archive']), self.root / 'restored', receipt['partManifest'])

    def test_refuses_source_changed_since_inventory(self):
        source, stage, receipts = [self.root / x for x in ['source', 'parts', 'receipts']]
        for p in [source, stage, receipts]:
            p.mkdir()
        path = source / 'original.bin'
        path.write_bytes(b'original')
        os.utime(path, ns=(1_500_000_000_000_000_000, 1_500_000_000_000_000_000))
        row = {'path': path.name, 'bytes': 8, 'sha256': hashlib.sha256(b'original').hexdigest(),
               'mtime_ns': path.stat().st_mtime_ns, 'mode': 0o644}
        path.write_bytes(b'replaced')
        with self.assertRaisesRegex(ValueError, 'unchanged source'):
            pack_part(source, stage, receipts, 1,
                      [{'sha256': row['sha256'], 'bytes': 8, 'candidates': [row]}])
        self.assertFalse((receipts / 'part-0001-local.json').exists())

    def test_rewrites_internal_links_and_reports_external_or_traversing_links(self):
        source = '/old/source'
        self.assertEqual(link_target('a/link', '/old/source/maps/file', source), ('maps/file', None))
        self.assertEqual(link_target('a/link', '../maps/file', source), ('maps/file', None))
        for value in ['/outside/private', '../../outside', '/old/source/a/../../outside']:
            target, reason = link_target('a/link', value, source)
            self.assertIsNone(target)
            self.assertTrue(reason)

    def test_restores_relative_files_and_refuses_existing_output(self):
        cache = self.root / 'cache'
        cache.mkdir()
        raw = b'portable bytes'
        sha = hashlib.sha256(raw).hexdigest()
        asset = {'assetId': 1, 'sha256': sha, 'bytes': len(raw)}
        (cache / ('asset-1-' + sha)).write_bytes(raw)
        index = {'format': 'FPVPreservationIndex.v1', 'repo': 'example/example', 'sourceRoot': '/old/source',
                 'coverageComplete': True,
                 'parts': {}, 'directAssets': {sha: asset},
                 'files': [{'path': 'maps/example.bin', 'bytes': len(raw), 'sha256': sha,
                            'mode': 0o644, 'mtime_ns': 1_000_000_000}],
                 'symlinks': [{'path': 'shortcut', 'target': '/old/source/maps/example.bin'}]}
        destination = self.root / 'portable'
        result = restore(index, cache, destination, self.root / 'restore-receipt.json')
        self.assertTrue(result['complete'])
        self.assertEqual((destination / 'maps/example.bin').read_bytes(), raw)
        self.assertEqual((destination / 'shortcut').read_bytes(), raw)
        self.assertFalse((destination / 'shortcut').readlink().is_absolute())
        with self.assertRaises(FileExistsError):
            restore(index, cache, destination, self.root / 'repeat.json')

    def test_refuses_malicious_part_header_and_cache_symlink_parent(self):
        bad = {'format': 'FPVCASPart.v1', 'number': 1,
               'objects': [{'member': '../outside', 'sha256': 'a' * 64, 'bytes': 1}]}
        with self.assertRaisesRegex(ValueError, 'Unsafe'):
            restore_part(self.root / 'unused.zst', self.root / 'bad', bad)
        actual = self.root / 'actual-cache'
        actual.mkdir()
        link = self.root / 'cache-link'
        link.symlink_to(actual)
        index = {'format': 'FPVPreservationIndex.v1', 'parts': {}, 'files': [], 'repo': 'example/example'}
        with self.assertRaisesRegex(ValueError, 'symlink'):
            restore(index, link / 'child', self.root / 'output', self.root / 'receipt.json')

    def test_partial_inventory_never_claims_complete_restore(self):
        index = {'format': 'FPVPreservationIndex.v1', 'parts': {}, 'files': [], 'repo': 'example/example',
                 'coverageComplete': False, 'inventoryComplete': False}
        result = restore(index, self.root / 'cache', self.root / 'partial', self.root / 'receipt.json')
        self.assertFalse(result['complete'])

    def test_unresolved_internal_link_keeps_restore_incomplete(self):
        index = {'format': 'FPVPreservationIndex.v1', 'parts': {}, 'files': [], 'repo': 'example/example',
                 'coverageComplete': True, 'sourceRoot': '/old/root',
                 'symlinks': [{'path': 'missing-dependency', 'target': '/old/root/not-in-backup'}]}
        result = restore(index, self.root / 'cache', self.root / 'partial', self.root / 'receipt.json')
        self.assertFalse(result['complete'])
        self.assertEqual(len(result['unresolvedInternalLinks']), 1)

    def test_index_reuses_verified_objects_but_holds_unreviewed_duplicate_content(self):
        sha = hashlib.sha256(b'same bytes').hexdigest()
        rows = [{'kind': 'file', 'path': path, 'bytes': 10, 'sha256': sha, 'mode': 420,
                 'mtime_ns': 100, 'review': []} for path in ['safe.bin', 'coupa/unreviewed.bin']]
        inventory, state, catalogue, direct = [self.root / x for x in ['inventory.jsonl', 'state.json', 'catalogue.json', 'library.json']]
        inventory.write_text(''.join(json.dumps(r) + '\n' for r in rows))
        state.write_text(json.dumps({'complete': False}))
        catalogue.write_text(json.dumps({'releases': []}))
        direct.write_text(json.dumps({'archives': [{'preserved': True, 'serverDigest': 'sha256:' + sha,
            'sha256': sha, 'bytes': 10, 'serverBytes': 10, 'assetID': 123, 'assetName': 'original',
            'assetURL': 'https://example.invalid/original', 'fullReadback': {'sha256': sha, 'bytes': 10}}]}))
        result = build([inventory], state, [], [direct], catalogue, '/old/root')
        self.assertEqual(len(result['held']), 2)
        self.assertEqual(len(result['files']), 0)
        approved = [{'path': 'coupa/unreviewed.bin', 'sha256': sha, 'decision': 'allow-app-archive'}]
        result = build([inventory], state, [], [direct], catalogue, '/old/root', approved)
        self.assertEqual(len(result['files']), 2)
        self.assertEqual(len(result['directAssets']), 1)
        self.assertFalse(result['coverageComplete'])
        state.write_text(json.dumps({'complete': True}))
        result = build([inventory], state, [], [direct], catalogue, '/old/root', approved)
        self.assertFalse(result['coverageComplete'])  # A primary walk alone is not the final inventory set.
        result = build([inventory], state, [], [direct], catalogue, '/old/root', approved, True)
        self.assertTrue(result['coverageComplete'])

    def test_exact_clearance_and_active_reservation_do_not_claim_durability(self):
        source = self.root / 'source'
        (source / 'coupa').mkdir(parents=True)
        original = source / 'coupa/public-app.bin'
        original.write_bytes(b'public app')
        sha = hashlib.sha256(b'public app').hexdigest()
        row = {'kind': 'file', 'path': 'coupa/public-app.bin', 'bytes': 10, 'sha256': sha,
               'mtime_ns': original.stat().st_mtime_ns, 'mode': 420, 'review': []}
        inventory = self.root / 'inventory.jsonl'
        inventory.write_text(json.dumps(row) + '\n')
        known, library, reserved, clearance = [self.root / x for x in ['known.json', 'library.json', 'reserved.json', 'clearance.json']]
        known.write_text('{}')
        library.write_text('{"archives": []}')
        reserved.write_text(json.dumps([sha]))
        clearance.write_text(json.dumps({'rows': [{'path': row['path'], 'sha256': sha, 'decision': 'allow-app-archive'}]}))
        stage, receipts = self.root / 'parts', self.root / 'receipts'
        subprocess.run(['python3', str(Path(__file__).parent / 'pack.py'), '--manifest', str(inventory),
                        '--source-root', str(source), '--stage', str(stage), '--receipts', str(receipts),
                        '--release-index', str(known), '--library-preflight', str(library),
                        '--reserved-digests', str(reserved), '--clearances', str(clearance)], check=True,
                       stdout=subprocess.PIPE, text=True)
        result = json.loads((receipts / 'batch.json').read_text())
        self.assertEqual(result['reservedForActiveBatchObjects'], 1)
        self.assertEqual(result['held'], [])
        self.assertEqual(result['uniqueObjectsToPack'], 0)
        self.assertFalse(result['finalCoverageClaimed'])
        self.assertFalse(list(stage.iterdir()))

    def test_rejects_nonzero_payload_after_tar_terminator(self):
        raw = b'expected object'
        sha = hashlib.sha256(raw).hexdigest()
        header = {'format': 'FPVCASPart.v1', 'number': 1,
                  'objects': [{'sha256': sha, 'bytes': len(raw), 'member': 'objects/' + sha}]}
        archive = self.root / 'trailing.tar.zst'
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w', format=tarfile.USTAR_FORMAT) as tar:
            for name, content in [('part-manifest.json', json.dumps(header).encode()), ('objects/' + sha, raw)]:
                member = tarfile.TarInfo(name)
                member.size = len(content)
                tar.addfile(member, io.BytesIO(content))
        with archive.open('xb') as output:
            subprocess.run(['zstd', '-q', '-c'], input=stream.getvalue() + b'unplanned payload after TAR EOF',
                           stdout=output, check=True)
        with self.assertRaisesRegex(ValueError, 'trailing'):
            restore_part(archive, self.root / 'restored', header)

    def test_final_index_rejects_corrupt_middle_and_unclosed_final_rows(self):
        inventory, state, catalogue = [self.root / x for x in ['inventory.jsonl', 'state.json', 'catalogue.json']]
        state.write_text(json.dumps({'complete': True}))
        catalogue.write_text(json.dumps({'releases': []}))
        valid = json.dumps({'kind': 'excluded', 'path': 'reproducible-dependency', 'reason': 'pinned lockfile'})
        for text in [valid + '\n{corrupt interior}\n' + valid + '\n',
                     valid + '\n{"kind":"file","path":', valid]:
            inventory.write_text(text)
            with self.assertRaisesRegex(ValueError, 'manifest'):
                build([inventory], state, [], [], catalogue, '/old/root', inventory_set_final=True)
        inventory.write_text(valid + '\n')
        # SMB may publish a write's fresh timestamp after close; freeze immutable fixture metadata.
        os.utime(inventory, ns=(1_500_000_000_000_000_000, 1_500_000_000_000_000_000))
        result = build([inventory], state, [], [], catalogue, '/old/root', inventory_set_final=True)
        self.assertTrue(result['coverageComplete'])

    def test_cloud_plan_requires_every_source_check_exactly_once(self):
        sha = hashlib.sha256(b'known').hexdigest()
        header = {'format': 'FPVCASPart.v1', 'number': 1,
                  'objects': [{'sha256': sha, 'bytes': 5, 'member': 'objects/' + sha}]}
        check = {'path': 'packages/original.zip', 'sha256': sha, 'bytes': 5,
                 'sourceBeforeAndAfterSHA256Match': True}
        plan = {'format': 'FPVCASPartPublished.v1', 'repo': 'mekhovov/revealline',
                'releaseId': 414505790, 'partManifest': header, 'sourceChecks': [check],
                'sha256': 'a' * 64, 'assetId': 1, 'bytes': 100,
                'assetName': 'fpv-cas-' + 'a' * 64 + '.tar.zst'}
        verify_plan(plan)
        for checks in [[], [check, check], [dict(check, sourceBeforeAndAfterSHA256Match=False)],
                       [dict(check, path='../outside')], [dict(check, bytes=6)]]:
            with self.assertRaises(ValueError):
                verify_plan(dict(plan, sourceChecks=checks))
        with self.assertRaisesRegex(ValueError, 'Unsafe published asset'):
            verify_plan(dict(plan, assetId='../../other-endpoint'))
        inventory, state, catalogue, pending = [self.root / x for x in ['inventory.jsonl', 'state.json', 'catalogue.json', 'pending.json']]
        inventory.write_text('')
        state.write_text('{"complete":true}')
        catalogue.write_text('{"releases":[]}')
        pending.write_text(json.dumps(plan))
        with self.assertRaisesRegex(ValueError, 'Unverified CAS receipt'):
            build([inventory], state, [pending], [], catalogue, '/old/root', inventory_set_final=True)

    def test_reviewed_git_dependency_restores_link_and_refuses_mismatch(self):
        raw = b'known published GitHub dependency'
        row = {'path': 'delivery.json', 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
               'gitBlobSHA1': git_identity('blob', raw), 'mode': '100644'}
        tree, _ = manifest_tree([row])
        dep = {'linkPath': 'review/link', 'originalTargetExact': '/outside/unavailable/subtree',
               'targetWithinRoot': '_github-review-dependencies/test', 'repo': 'example/example',
               'commit': 'b' * 40, 'subtree': 'published/subtree', 'treeGitSHA1': tree, 'files': [row]}
        index = {'format': 'FPVPreservationIndex.v1', 'repo': 'example/example', 'sourceRoot': '/old/root',
                 'parts': {}, 'files': [], 'coverageComplete': True,
                 'symlinks': [{'path': dep['linkPath'], 'target': dep['originalTargetExact']}],
                 'githubLinkDependencies': [dep]}

        def api(*args):
            endpoint = args[-1]
            if '/contents/' in endpoint:
                return [{'name': 'delivery.json', 'sha': row['gitBlobSHA1'], 'type': 'file'}]
            return {'encoding': 'base64', 'sha': row['gitBlobSHA1'], 'content': base64.b64encode(raw).decode()}

        with patch('github_dependencies.gh_json', side_effect=api):
            result = restore(index, self.root / 'cache', self.root / 'output', self.root / 'receipt.json')
        self.assertTrue(result['complete'])
        self.assertEqual(result['githubDependencyFileCount'], 1)
        self.assertEqual((self.root / 'output/review/link/delivery.json').read_bytes(), raw)
        self.assertFalse((self.root / 'output/review/link').readlink().is_absolute())
        bad = copy.deepcopy(index)
        bad['githubLinkDependencies'][0]['originalTargetExact'] = '/different/source'
        with patch('github_dependencies.gh_json') as request:
            with self.assertRaisesRegex(ValueError, 'exact captured link'):
                restore(bad, self.root / 'unused-cache', self.root / 'bad-map', self.root / 'unused.json')
            request.assert_not_called()
        bad = copy.deepcopy(index)
        bad['githubLinkDependencies'][0]['files'][0]['sha256'] = hashlib.sha256(b'different').hexdigest()
        with patch('github_dependencies.gh_json', side_effect=api):
            with self.assertRaisesRegex(ValueError, 'Downloaded Git blob bytes differ'):
                restore(bad, self.root / 'wrong-cache', self.root / 'wrong-blob', self.root / 'wrong.json')


if __name__ == '__main__':
    unittest.main()
