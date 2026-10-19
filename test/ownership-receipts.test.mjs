import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const json=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
test('every named ownership candidate is preserved with its original Git blob and byte hash',async()=>{
 const inventory=await json('migration/upstream-inventory.json'),receipt=await json('migration/owned-source-receipt.json');
 const expected=inventory.items.filter(row=>row.reasons.includes('named-ownership-candidate')).map(row=>row.path).sort();
 assert.deepEqual(receipt.items.map(row=>row.sourcePath).sort(),expected);
 for(const row of receipt.items){
  assert.ok(row.destination.startsWith('content/'));assert.ok(!row.destination.split('/').includes('..'));
  const bytes=await readFile(new URL(row.destination,root));
  assert.equal(bytes.length,row.bytes,row.sourcePath);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.sourcePath);
  assert.equal(createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex'),row.sourceGitBlob,row.sourcePath);
 }
});
