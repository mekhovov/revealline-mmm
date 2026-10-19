import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSIC_SNAKE_LEVELS, CLASSIC_SNAKE_CHAPTERS } from '../app/game/snake/classic-catalogue.mjs';
import { prepareClassicSnakeLevel } from '../app/game/snake/classic-setup.mjs';
import { classicSnakeUsesVariableHazards } from '../app/game/snake/classic-core.mjs';
import { createClassicSnakeMatch, queueClassicSnakeMatchTurn, advanceClassicSnakeMatchTo, exportClassicSnakeMatch, restoreClassicSnakeMatch } from '../app/game/snake/classic-match.mjs';
import { createDestructionPreferences, createActorAppearancePreferences, runtimeActorArtRevision } from '../app/game/hunt/preferences.mjs';
import { JOURNEY_PROFILE_DATABASE } from '../app/game/profile-database.mjs';

test('every official Snake mission works in Solo, matched-board Versus and shared-board Team, including round restoration',()=>{
 assert.equal(CLASSIC_SNAKE_LEVELS.length,240);assert.equal(CLASSIC_SNAKE_CHAPTERS.length,35);
 for(const entry of CLASSIC_SNAKE_LEVELS) for(const mode of ['solo','versus','team']) {
  const level=prepareClassicSnakeLevel(entry);
  const match=createClassicSnakeMatch(level,{mode,seed:17,...(classicSnakeUsesVariableHazards(level)?{hazardSeed:23}:{})});
  assert.equal(match.runs.length,mode==='versus'?2:1,entry.id);
  assert.equal(match.runs[0].snakes.length,mode==='team'?2:1,entry.id);
  if(mode==='versus')assert.deepEqual(match.runs[0],match.runs[1]);
  for(let seat=0;seat<(mode==='solo'?1:2);seat++)queueClassicSnakeMatchTurn(match,seat,'down');
  advanceClassicSnakeMatchTo(match,1000);
  const saved=exportClassicSnakeMatch(match);
  const restored=restoreClassicSnakeMatch(saved,{level});
  assert.deepEqual(exportClassicSnakeMatch(restored),saved,`${entry.id}/${mode}`);
 }
});

test('saved preferences and explicit URL pins cannot restore prohibited presentation',()=>{
 const options={getStorage:()=>({getItem:()=>JSON.stringify({format:'DestructionPreferencesV1',brutal:true,blood:true,vocals:true})})};
 const effects=createDestructionPreferences(options);
 effects.set({brutal:true,blood:true,vocals:true});
 assert.deepEqual(effects.snapshot(),{brutal:false,blood:false,vocals:false,durable:true,revision:0});
 const actors=createActorAppearancePreferences(options);actors.set({cast:'tactical'});
 assert.equal(actors.snapshot().cast,'authored');
 assert.equal(runtimeActorArtRevision({href:'https://example.test/?artReview=industrial-roster-v3'}),null);
 assert.equal(JOURNEY_PROFILE_DATABASE,'revealline-mmm-journey-v1');
});


test('all shared presentation preferences stay clean even when old settings request global artwork',async()=>{
 const {createEncounterDisplayPreferences}=await import('../app/game/encounter-display-preferences.mjs');
 const {createReactionPreferences}=await import('../app/game/journey/reaction-preferences.mjs');
 const {installThemeHost}=await import('../app/game/presentation/theme-host.mjs');
 const read=()=>({getItem:()=>JSON.stringify({showRemains:true,enabled:true,familyId:'military',cast:'humanoid'})});
 const remains=createEncounterDisplayPreferences({getStorage:read});remains.set(true);assert.equal(remains.snapshot().showRemains,false);
 const reactions=createReactionPreferences({getStorage:read});reactions.choose(true);assert.equal(reactions.snapshot().enabled,false);
 const theme=installThemeHost({getStorage:read});theme.set({familyId:'military'});theme.setDefault({familyId:'military',revision:'r1'});
 assert.equal(theme.effectivePreferences().familyId,'coupa');assert.deepEqual(theme.availableThemeChoices(),[]);
});
