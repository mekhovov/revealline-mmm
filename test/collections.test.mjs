import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRun, stepRun, releaseInputs, FIXED_DT } from '../app/game/core/index.mjs';
import { createRecorder, recordInput, recordRelease, exportReplay, verifyReplay } from '../app/game/replay.mjs';
const json=async path=>JSON.parse(await readFile(new URL('../app/'+path,import.meta.url),'utf8'));
test('all locally owned collection recipes retain their engine rules and verified resume state',async()=>{
 const catalog=await json('game/collections/catalog.json');let count=0;
 for(const record of catalog.collections){
  const raw=await readFile(new URL('../app/'+record.recipe.path,import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'),record.recipe.sha256);
  const source=JSON.parse(raw);
  for(const campaign of source.campaigns)for(const level of campaign.levels){
   count++;const options={classRecipes:source.classRecipes,classId:source.classRecipes[0].id,seed:71};
   const run=createRun(level,options),recorder=createRecorder(level,options,'test');
   for(let i=0;i<120&&!['won','lost'].includes(run.status);i++){const input={direction:i===0?'up':null};recordInput(recorder,input);stepRun(run,input,FIXED_DT);}
   assert.ok(run.tick>0,level.id);
   releaseInputs(run);recordRelease(recorder);
   const saved=exportReplay(recorder,run);const checked=verifyReplay(saved);
   assert.equal(checked.match,true,level.id);assert.equal(checked.state.tick,run.tick);
  }
 }
 assert.equal(catalog.collections.length,8);assert.equal(count,20);
});
