import { assertBrandedLocation, installBrandedIsolation } from '../branded-isolation.mjs';
assertBrandedLocation(location.href);
installBrandedIsolation();
import { createRun, stepRun, releaseInputs, FIXED_DT } from '../core/index.mjs';
import { createRecorder, recordInput, recordRelease, exportReplay, verifyReplayAsync } from '../replay.mjs';
import { BoardPainter, boardPaintSizeForRun } from '../ui/render.mjs';
import { boundedJSON, canonicalJSON } from '../data-json.mjs';
import { blocksPlayInput } from '../ui/play-input.mjs';
import { mountCoupaPlayShell } from '../ui/coupa-play-shell.mjs';

await globalThis.RevealLineAccess?.ready;
const $ = id => document.getElementById(id);
const storageKey = 'revealline-mmm.collections.round.v1';
const progressKey = 'revealline-mmm.collections.progress.v1';
const cleanCopy = value => String(value).replace(/\b(?:FPV|Drone|craft)\b/gi, 'connection').replace(/\b(?:hunters|enemies)\b/gi, 'moving obstacles');
const root = new URL('../../', import.meta.url);
const sha = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
async function checkedFile(pin) {
  if (!/^game\/collections\/[a-z0-9/_.-]+$/i.test(pin.path) || pin.path.includes('..')) throw new Error('Invalid collection file.');
  const response=await fetch(new URL(pin.path,root));
  if(!response.ok) throw new Error('This collection is unavailable. Please retry.');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==pin.bytes || await sha(bytes)!==pin.sha256) throw new Error('This collection has changed. Reload before playing.');
  return bytes;
}
const response = await fetch(new URL('./catalog.json', import.meta.url));
if(!response.ok) throw new Error('The collection catalog is unavailable.');
const catalog = boundedJSON(await response.text(), {maxBytes:128*1024});
if(catalog.format!=='branded-native-catalog.v1')throw new Error('Unsupported collection catalog.');
const [presets,themeFile] = await Promise.all(['presets','themes'].map(async name=>{
 const r=await fetch(new URL(`../content/company-boot/coupa-all/${name}.json`,import.meta.url));if(!r.ok)throw new Error('Coupa presentation unavailable.');return r.json();
}));
const theme=themeFile.themes.find(item=>item.id==='coupa')??themeFile.themes[0];
const canvas=$('board'),context=canvas.getContext('2d');
const painter=new BoardPainter(presets);
const cache=new Map();
let shell=null,savedRound=false;
let progress={};try{progress=JSON.parse(localStorage.getItem(progressKey)||'{}')}catch{}
let selected=null,recipes=null,level=null,run=null,recorder=null,backdrop=null,paused=true,loading=false,direction=null,elapsed=0,lastTime=0,saveAge=0,revision=0;
$('motion').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
const notice=message=>{$('notice').textContent=message;};
const recipeLevels=recipe=>recipe.campaigns.flatMap(c=>c.levels);
async function loadRecipes(record){
 if(!cache.has(record.id)){
  const bytes=await checkedFile(record.recipe);
  const value=boundedJSON(new TextDecoder().decode(bytes),{maxBytes:4*1024*1024,maxNodes:150000,maxArray:4096});
  if(value.format!=='branded-native-collection.v1'||value.id!==record.id)throw new Error('Collection identity mismatch.');
  for(const item of recipeLevels(value))createRun(item,{classRecipes:value.classRecipes,classId:value.classRecipes[0].id});
  cache.set(record.id,value);
 }
 return cache.get(record.id);
}
function remember(){
 if(!run||loading)return;
 try{localStorage.setItem(storageKey,JSON.stringify({format:'coupa-collection-round.v1',collectionId:selected.id,recipeSha256:selected.recipe.sha256,replay:exportReplay(recorder,run)}));$('restore').hidden=false;savedRound=true;}
 catch{notice('This round is only saved for this session. Export it before closing.');}
}
function pause(){if(!run)return;paused=true;direction=null;elapsed=0;releaseInputs(run);recordRelease(recorder);remember();update();shell?.refresh();}
function update(){
 if(!run)return;
 $('status').textContent=`${run.status==='won'?'Collection complete!':run.status==='lost'?'Try another route.':paused?'Ready · press Start or Resume': 'Connecting…'} · ${Math.round(run.coverage*100)}% revealed · ${run.lives} lives · ${Math.floor(run.time)}s`;
 $('pause').textContent=paused?(run.tick?'Resume':'Start'):'Pause';$('pause').disabled=['won','lost'].includes(run.status);
 $('next').hidden=run.status!=='won'||recipeLevels(recipes).at(-1).id===level.id;
}
async function openLevel(record,id,restored=null){
 const ticket=++revision;pause();loading=true;notice('Preparing collection…');
 try{
  const source=await loadRecipes(record);const nextLevel=recipeLevels(source).find(item=>item.id===id);if(!nextLevel)throw new Error('This mission is not included.');
  const options={seed:restored?.options.seed??1,turnPolicy:'immediate',classId:source.classRecipes[0].id,classRecipes:source.classRecipes};
  let nextRun=createRun(nextLevel,options),nextRecorder=createRecorder(nextLevel,options,'coupa-collections-v1');
  if(restored){
   if(canonicalJSON(restored.level)!==canonicalJSON(nextRun.level)||canonicalJSON(restored.options)!==canonicalJSON(nextRecorder.options))throw new Error('This round does not match the included mission.');
   const checked=await verifyReplayAsync(restored);if(!checked.match)throw new Error('Round verification failed.');
   nextRun=checked.state;nextRecorder.segments=structuredClone(restored.segments);nextRecorder.ticks=restored.ticks;nextRecorder.releaseAfter=restored.releaseAfter;
  }
  const pin=record.images.find(item=>item.levelId===id);let image=null;
  if(pin){const bytes=await checkedFile(pin);image=await createImageBitmap(new Blob([bytes]));}
  if(ticket!==revision){image?.close();return;}
  backdrop?.image?.close();backdrop=image?{image,fit:pin.fit}:null;
  selected=record;$('collection').value=record.id;recipes=source;level=nextLevel;run=nextRun;recorder=nextRecorder;
  const size=boardPaintSizeForRun(run);canvas.width=size.width;canvas.height=size.height;
  painter.setLevel(level,{seed:run.seed});await painter.setLook(theme,'coupa-flower');
  await painter.prepare(context,run,{backdrop,showCombatScrap:false,brutal:false,blood:false});
  $('title').textContent=cleanCopy(level.name);$('briefing').textContent=`Reveal ${Math.round(level.goal.coverage*100)}%. Close your path to make a connection. Watch the moving obstacles and marked paths.`;
  $('library').hidden=true;$('play').hidden=false;paused=true;direction=null;elapsed=0;loading=false;notice('');update();remember();shell?.showPlay();
 }catch(error){loading=false;notice(error.message);}
}
async function showCollection(){
 const ticket=++revision;const record=catalog.collections.find(item=>item.id===$('collection').value);notice('Loading missions…');
 try{const source=await loadRecipes(record);if(ticket!==revision)return;
  $('missions').replaceChildren();for(const mission of recipeLevels(source)){
   const button=document.createElement('button');button.className='mission';button.textContent=`${progress[record.id+'/'+mission.id]?'✓ ':''}${cleanCopy(mission.name)}`;button.onclick=()=>openLevel(record,mission.id);$('missions').append(button);
  }
  $('progress').textContent=`${record.missions} missions · Solo · ${catalog.collections.length} Coupa collections`;notice('');
 }catch(error){notice(error.message);}
}
for(const record of catalog.collections){const option=new Option(cleanCopy(record.name),record.id);$('collection').append(option);}
$('collection').onchange=showCollection;await showCollection();
$('menu').onclick=()=>{pause();shell.showMissions();void showCollection();};
$('pause').onclick=()=>{if(!run||loading||['won','lost'].includes(run.status))return;if(paused){paused=false;lastTime=performance.now();update()}else pause();};
$('retry').onclick=()=>openLevel(selected,level.id);
$('next').onclick=()=>openLevel(selected,recipeLevels(recipes)[recipeLevels(recipes).findIndex(item=>item.id===level.id)+1].id);
$('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():$('play').requestFullscreen();
$('export').onclick=()=>{pause();try{const blob=new Blob([JSON.stringify({format:'coupa-collection-round.v1',collectionId:selected.id,recipeSha256:selected.recipe.sha256,replay:exportReplay(recorder,run)})],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='coupa-collection-round.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}catch(error){notice(error.message)}};
async function restore(text){try{const saved=boundedJSON(text,{maxBytes:32*1024*1024,maxNodes:500000,maxArray:250000});const record=catalog.collections.find(item=>item.id===saved.collectionId);if(saved.format!=='coupa-collection-round.v1'||!record||saved.recipeSha256!==record.recipe.sha256)throw new Error('This round belongs to a different collection revision.');await openLevel(record,saved.replay.level.id,saved.replay);}catch(error){notice(error.message)}}
try{savedRound=!!localStorage.getItem(storageKey);$('restore').hidden=!savedRound;}catch{}
$('restore').onclick=()=>{try{void restore(localStorage.getItem(storageKey));}catch(error){notice(error.message)}};
$('import').onchange=async event=>{const file=event.target.files[0];if(!file)return;pause();if(file.size>32*1024*1024){notice('The round file is too large.');return;}await restore(await file.text());event.target.value='';};
const keys={ArrowUp:'up',ArrowRight:'right',ArrowDown:'down',ArrowLeft:'left',w:'up',d:'right',s:'down',a:'left'};
window.addEventListener('keydown',event=>{if(blocksPlayInput(event,{blocked:shell?.blocksPlay(),hidden:$('play').hidden}))return;if(keys[event.key]){event.preventDefault();if(!paused&&!event.repeat)direction=keys[event.key];}else if([' ','Escape','p'].includes(event.key)){event.preventDefault();if(!event.repeat)$('pause').click();}});
for(const button of document.querySelectorAll('[data-direction]'))button.onpointerdown=event=>{event.preventDefault();if(!paused)direction=button.dataset.direction;};
let touch=null;canvas.style.touchAction='none';canvas.onpointerdown=event=>{touch={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);};canvas.onpointermove=event=>{if(!touch||paused)return;const x=event.clientX-touch.x,y=event.clientY-touch.y;if(Math.hypot(x,y)<12)return;direction=Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'down':'up';touch={x:event.clientX,y:event.clientY};};canvas.onpointerup=()=>{touch=null;};
window.addEventListener('pagehide',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);
let gamepadDirection=null,gamepadPause=false;
function frame(now){
 try{const dt=Math.min(.1,Math.max(0,(now-lastTime)/1000));lastTime=now;
  if(run&&!loading&&!$('play').hidden){
   const pad=navigator.getGamepads?.()[0];if(pad){const next=pad.buttons[12]?.pressed?'up':pad.buttons[13]?.pressed?'down':pad.buttons[14]?.pressed?'left':pad.buttons[15]?.pressed?'right':Math.abs(pad.axes[0])>.6?(pad.axes[0]>0?'right':'left'):Math.abs(pad.axes[1])>.6?(pad.axes[1]>0?'down':'up'):null;if(next&&next!==gamepadDirection&&!paused)direction=next;gamepadDirection=next;const pressed=!!pad.buttons[9]?.pressed;if(!shell?.blocksPlay()&&pressed&&!gamepadPause)$('pause').click();gamepadPause=pressed;}
   if(!paused&&!shell?.blocksPlay()){elapsed+=dt;while(elapsed>=FIXED_DT&&!['won','lost'].includes(run.status)){const input={direction};direction=null;recordInput(recorder,input);stepRun(run,input,FIXED_DT);elapsed-=FIXED_DT;}
    if(['won','lost'].includes(run.status)){if(run.status==='won'){progress[selected.id+'/'+level.id]=true;try{localStorage.setItem(progressKey,JSON.stringify(progress));}catch{notice('Progress could not be saved. Export this round.');}}pause();shell?.showResults();}
    saveAge+=dt;if(saveAge>2.5){remember();saveAge=0;}
   }
   painter.draw(context,run,paused?0:dt,{paused,reduced:$('motion').checked,backdrop,fullReveal:run.status==='won',brutal:false,blood:false,showCombatScrap:false});update();shell?.refresh();
  }
 }catch(error){paused=true;notice(error.message);}
 requestAnimationFrame(frame);
}shell=mountCoupaPlayShell({
  family:'collections',missions:$('library'),play:$('play'),settings:document.querySelector('aside'),notice:$('notice'),
  hasSavedRound:()=>!!run||savedRound,
  getState:()=>({phase:!run?'ready':['won','lost'].includes(run.status)?'results':paused?'paused':'playing',
    missionName:level?cleanCopy(level.name):'',mode:'Solo',summary:$('status').textContent,
    canNext:run?.status==='won'&&recipeLevels(recipes).at(-1).id!==level.id}),
  onStart:async()=>{const record=catalog.collections.find(item=>item.id===$('collection').value);
    try{const source=await loadRecipes(record);await openLevel(record,recipeLevels(source)[0].id);}catch(error){notice(error.message)}},
  onContinue:()=>{if(run){if(['won','lost'].includes(run.status))void openLevel(selected,level.id);else{paused=false;lastTime=performance.now();update();shell.showPlay()}}else $('restore').onclick()},
  onRetry:()=>selected&&openLevel(selected,level.id),onPause:pause,
  onNext:()=>openLevel(selected,recipeLevels(recipes)[recipeLevels(recipes).findIndex(item=>item.id===level.id)+1].id),
});
requestAnimationFrame(frame);
