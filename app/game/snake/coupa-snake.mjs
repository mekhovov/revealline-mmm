import { assertBrandedLocation, installBrandedIsolation } from '../branded-isolation.mjs';
assertBrandedLocation(location.href);
installBrandedIsolation();
import { CLASSIC_SNAKE_LEVELS as LEVELS, CLASSIC_SNAKE_CHAPTERS as CHAPTERS, CLASSIC_SNAKE_CAMPAIGNS as CAMPAIGNS } from './classic-catalogue.mjs';
import { createClassicSnakeMatch, queueClassicSnakeMatchTurn, advanceClassicSnakeMatchTo, exportClassicSnakeMatch, restoreClassicSnakeMatch } from './classic-match.mjs';
import { prepareClassicSnakeLevel } from './classic-setup.mjs';
import { classicSnakeUsesVariableHazards } from './classic-core.mjs';
import { createClassicSnakeRecords } from './classic-records.mjs';
import { drawClassicBoard } from './classic-view.mjs';
import { classicOperationStatus } from './classic-operation-status.mjs';
import { boundedJSON } from '../data-json.mjs';
import { blocksPlayInput } from '../ui/play-input.mjs';
import { mountCoupaPlayShell } from '../ui/coupa-play-shell.mjs';
import { prepareCoupaHeadArt } from './coupa-art.mjs';

await globalThis.RevealLineAccess?.ready;
await prepareCoupaHeadArt();
const $=id=>document.getElementById(id);
const STORAGE='revealline-mmm.snake.round.v1', PREFS='revealline-mmm.snake.controls.v1';
const MODES=['solo','versus','team'], PACES=['slow','normal','fast'];
// Gameplay identities and recipe bytes remain upstream-owned. Only displayed
// copy is translated into the community's abstract connection vocabulary.
export function communityCopy(value) {
  return String(value?.en ?? value ?? '').replace(/humanoids?|soldiers?/gi,'connection tokens').replace(/pilots?/gi,'player').replace(/hunters?/gi,'moving token')
    .replace(/enemies/gi,'tokens').replace(/enemy/gi,'token').replace(/FPV|drone/gi,'connection')
    .replace(/tactical/gi,'strategic').replace(/sorties/gi,'circuits').replace(/smugglers/gi,'couriers')
    .replace(/smuggling/gi,'routing').replace(/citadels/gi,'networks').replace(/quarry/gi,'tokens')
    .replace(/ammunition|ammo/gi,'supplies').replace(/military/gi,'community');
}
const notice=message=>$('notice').textContent=message;
const records=createClassicSnakeRecords({onWarning:()=>notice('Progress is kept for this session. Export your round before closing if saving is unavailable.')});
await records.read();
let match=null,entry=null,level=null,pace='normal',paused=true,finished=false,lastFrame=0,lastSaved=0,clock=0;
let soundContext=null,previousCatches=0;
let shell=null,savedRound=false;
const reducedMedia=matchMedia('(prefers-reduced-motion: reduce)');
try {
  const prefs=JSON.parse(localStorage.getItem(PREFS)??'{}');
  if(MODES.includes(prefs.mode))$('mode').value=prefs.mode;
  if(PACES.includes(prefs.pace))$('pace').value=prefs.pace;
  $('motion').checked=prefs.reduced===true;
  $('sound').checked=prefs.sound===true;
} catch {}
function preferences(){try{localStorage.setItem(PREFS,JSON.stringify({mode:$('mode').value,pace:$('pace').value,reduced:$('motion').checked,sound:$('sound').checked}))}catch{}}
for(const id of ['mode','pace','motion','sound'])$(id).addEventListener('change',preferences);
function option(select,value,label){const el=document.createElement('option');el.value=value;el.textContent=label;select.append(el)}
for(const campaign of CAMPAIGNS)option($('campaign'),campaign.id,communityCopy(campaign.title));
$('campaign').value='classic-foundations-v1';
$('catalog-count').textContent=`· ${LEVELS.length} missions · ${CHAPTERS.length} chapters`;
function chapters(){
  const campaign=CAMPAIGNS.find(row=>row.id===$('campaign').value);
  $('chapter').replaceChildren();
  for(const chapter of CHAPTERS.filter(row=>campaign.chapterIds.includes(row.id)))option($('chapter'),chapter.id,communityCopy(chapter.title));
  missions();
}
function missions(){
  $('missions').replaceChildren();
  const entries=LEVELS.filter(row=>row.chapterId===$('chapter').value);
  for(const [index,row] of entries.entries()){
    const button=document.createElement('button');button.className='mission';button.dataset.mission=row.id;
    const number=document.createElement('small');number.textContent=`${String(index+1).padStart(2,'0')} · ${records.cleared(row.id)?'✓ Complete':'Ready to connect'}`;
    const title=document.createElement('strong');title.textContent=communityCopy(row.title);
    const description=document.createElement('span');description.textContent=communityCopy(row.description);
    button.append(number,title,description);button.onclick=()=>start(row);
    if(row.id===entry?.id)button.setAttribute('aria-current','true');
    $('missions').append(button);
  }
  $('progress').textContent=`${LEVELS.filter(row=>records.cleared(row.id)).length} of ${LEVELS.length} missions completed. All missions are available to explore.`;
}
$('campaign').onchange=chapters;$('chapter').onchange=missions;chapters();
function makeBoards(){
  $('boards').replaceChildren();
  for(let i=0;i<match.runs.length;i++){
    const figure=document.createElement('figure'),caption=document.createElement('figcaption'),canvas=document.createElement('canvas');
    caption.id=`score-${i}`;canvas.id=`board-${i}`;canvas.setAttribute('aria-label',match.options.mode==='team'?'Shared team board':`Player ${i+1} board`);
    figure.append(caption,canvas);$('boards').append(figure);
    let touch;
    canvas.onpointerdown=e=>{touch={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)};
    canvas.onpointerup=e=>{if(!touch)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;if(Math.max(Math.abs(dx),Math.abs(dy))>12)turn(i,Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up')};
  }
  $('touch-controls').replaceChildren();
  for(let seat=0;seat<(match.options.mode==='solo'?1:2);seat++){
    const pad=document.createElement('div');pad.className='pad';pad.setAttribute('aria-label',`Player ${seat+1} controls`);
    for(const [direction,symbol] of [['up','↑'],['left','←'],['down','↓'],['right','→']]){
      const button=document.createElement('button');button.textContent=symbol;button.setAttribute('aria-label',`Player ${seat+1} ${direction}`);button.onpointerdown=e=>{e.preventDefault();turn(seat,direction)};pad.append(button);
    }$('touch-controls').append(pad);
  }
}
function showPlay(){
  $('library').hidden=true;$('play').hidden=false;$('restore').hidden=true;
  $('mode-label').textContent=match.options.mode==='versus'?'VERSUS · MATCHED BOARDS':match.options.mode==='team'?'TEAM · SHARED BOARD':'SOLO';
  $('mission-title').textContent=communityCopy(entry.title);$('briefing').textContent=communityCopy(entry.description);
  paused=true;finished=match.status==='finished';lastFrame=0;clock=0;previousCatches=match.runs.reduce((n,r)=>n+r.catches,0);
  $('pause').textContent=finished?'Round complete':'Start';$('pause').disabled=finished;$('next').hidden=!finished;
  makeBoards();draw();shell?.showPlay();$('pause').focus({preventScroll:true});
}
function start(row){
  entry=row;pace=$('pace').value;level=prepareClassicSnakeLevel(row,{pace});
  const options={mode:$('mode').value,seed:17};
  if(classicSnakeUsesVariableHazards(level))options.hazardSeed=crypto.getRandomValues(new Uint32Array(1))[0];
  match=createClassicSnakeMatch(level,options);void records.visit(row.id);showPlay();save();
}
function snapshot(){return {format:'coupa-snake-round.v1',levelId:entry.id,pace,match:exportClassicSnakeMatch(match)}}
function save(){if(!match)return;try{localStorage.setItem(STORAGE,JSON.stringify(snapshot()));savedRound=true}catch{notice('Saving is unavailable. Export your round to keep it.')}shell?.refresh()}
function restore(source){
  const value=boundedJSON(source,{maxBytes:8*1024*1024,maxNodes:250000,maxDepth:32,maxString:100000});
  if(value.format!=='coupa-snake-round.v1'||!PACES.includes(value.pace))throw new Error('This is not a supported Coupa Snake round.');
  const found=LEVELS.find(row=>row.id===value.levelId);if(!found)throw new Error('This mission is not included.');
  const prepared=prepareClassicSnakeLevel(found,{pace:value.pace});
  const restored=restoreClassicSnakeMatch(value.match,{level:prepared});
  if(!MODES.includes(restored.options.mode))throw new Error('This mode is unavailable.');
  entry=found;pace=value.pace;level=prepared;match=restored;$('mode').value=match.options.mode;$('pace').value=pace;
  $('campaign').value=CAMPAIGNS.find(c=>c.chapterIds.includes(found.chapterId)).id;chapters();$('chapter').value=found.chapterId;missions();showPlay();
}
try{savedRound=!!localStorage.getItem(STORAGE);$('restore').hidden=!savedRound}catch{}
$('restore').onclick=()=>{try{restore(localStorage.getItem(STORAGE));notice('Saved round restored and paused.')}catch(error){notice(error.message)}};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>8*1024*1024)throw new Error('Round file is too large.');restore(await file.text());save();notice('Round restored and paused.')}catch(error){notice(error.message)}e.target.value=''};
$('export').onclick=()=>{if(!match)return;setPaused(true);const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot())],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='coupa-snake-round.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
function setPaused(value){if(!match||finished)return;paused=value;lastFrame=0;$('pause').textContent=paused?'Resume':'Pause';save();draw()}
$('pause').onclick=()=>setPaused(!paused);
$('retry').onclick=()=>start(entry);
$('menu').onclick=()=>{setPaused(true);missions();shell.showMissions()};
$('next').onclick=()=>start(LEVELS[(LEVELS.findIndex(row=>row.id===entry.id)+1)%LEVELS.length]);
$('fullscreen').onclick=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void $('play').requestFullscreen?.()};
function turn(seat,direction){if(!match||finished||$('play').hidden||paused)return;queueClassicSnakeMatchTurn(match,seat,direction)}
const keys={ArrowUp:[0,'up'],ArrowDown:[0,'down'],ArrowLeft:[0,'left'],ArrowRight:[0,'right'],w:[1,'up'],s:[1,'down'],a:[1,'left'],d:[1,'right']};
document.addEventListener('keydown',e=>{
  if(blocksPlayInput(e,{blocked:shell?.blocksPlay(),hidden:$('play').hidden}))return;
  if([' ','Escape'].includes(e.key)){e.preventDefault();if(!e.repeat)setPaused(!paused);return}
  const input=keys[e.key]??keys[e.key.toLowerCase()];if(input){e.preventDefault();turn(match?.options.mode==='solo'?0:input[0],input[1])}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true)});
window.addEventListener('pagehide',()=>{setPaused(true);save()});
window.addEventListener('blur',()=>setPaused(true));
const gamepadStates=new Map();
function controllers(){
  for(const [seat,pad] of [...(navigator.getGamepads?.()??[])].filter(Boolean).slice(0,2).entries()){
    const pressed=pad.buttons[9]?.pressed===true;
    const direction=pad.buttons[12]?.pressed||pad.axes[1]<-.55?'up':pad.buttons[13]?.pressed||pad.axes[1]>.55?'down':pad.buttons[14]?.pressed||pad.axes[0]<-.55?'left':pad.buttons[15]?.pressed||pad.axes[0]>.55?'right':null;
    const before=gamepadStates.get(seat)??{};
    if(!shell?.blocksPlay()&&pressed&&!before.pressed)setPaused(!paused);
    if(!shell?.blocksPlay()&&direction&&direction!==before.direction)turn(seat,direction);
    gamepadStates.set(seat,{pressed,direction});
  }
}
function collectionSound(){
  if(!$('sound').checked)return;
  try{soundContext??=new (window.AudioContext??window.webkitAudioContext)();void soundContext.resume();const oscillator=soundContext.createOscillator(),gain=soundContext.createGain();oscillator.connect(gain);gain.connect(soundContext.destination);oscillator.type='sine';oscillator.frequency.setValueAtTime(660,soundContext.currentTime);oscillator.frequency.exponentialRampToValueAtTime(990,soundContext.currentTime+.1);gain.gain.setValueAtTime(.045,soundContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,soundContext.currentTime+.16);oscillator.start();oscillator.stop(soundContext.currentTime+.17)}catch{}
}
async function finish(){
  finished=true;paused=true;$('pause').disabled=true;$('pause').textContent='Round complete';$('next').hidden=false;save();
  const proof=exportClassicSnakeMatch(match), completedMatch=match, completedEntry=entry, completedLevel=level;
  draw();shell?.showResults();
  for(const run of completedMatch.runs)try{await records.remember(run,{mode:completedMatch.options.mode,chapterId:completedEntry.chapterId,level:completedLevel,match:proof,policy:completedMatch.options.policy})}catch{notice('This round could not be saved to progress. You can still export it.')}
  if(match===completedMatch)draw();
}
function draw(){
  if(!match)return;
  const reduced=$('motion').checked||reducedMedia.matches;
  match.runs.forEach((run,index)=>{
    const canvas=$(`board-${index}`);if(!canvas)return;
    drawClassicBoard(canvas,run,{chapterId:entry.chapterId,reduced,flight:{timeMs:clock},pixelRatio:devicePixelRatio,cssWidth:canvas.clientWidth});
    const record=records.get(run,match.options.mode,match.options.policy);
    $(`score-${index}`).textContent=`${match.options.mode==='team'?'Together':`Player ${index+1}`} · ${run.catches} connections · ${run.score} points${record?.rating?.stars?` · ${'★'.repeat(record.rating.stars)}`:''}`;
  });
  const operation=classicOperationStatus(match.runs[0]);
  const result=match.result;
  $('status').textContent=finished?(match.options.mode==='versus'?`Round complete · ${result==='draw'?'Draw':result==='p2'?'Player 2 wins':'Player 1 wins'}`:match.runs[0].status==='won'?'Connections complete. Well done!':'Route closed. Try another path.'):
    `${paused?'Paused · Press Start or Resume. ':''}${communityCopy(operation)||`Collect ${match.runs[0].level.goal} connection tokens. Keep your path clear.`}`;
}
function frame(now){
  controllers();
  if(match&&!$('play').hidden){
    if(!paused&&!finished&&!shell?.blocksPlay()){
      const delta=lastFrame?Math.min(100,now-lastFrame):0;clock+=delta;
      advanceClassicSnakeMatchTo(match,match.elapsedMs+delta);
      const catches=match.runs.reduce((sum,run)=>sum+run.catches,0);if(catches>previousCatches)collectionSound();previousCatches=catches;
      if(match.status==='finished')void finish();
      if(now-lastSaved>2500){save();lastSaved=now}
    }
    draw();shell?.refresh();lastFrame=now;
  }
  requestAnimationFrame(frame);
}shell=mountCoupaPlayShell({
  family:'snake',missions:$('library'),play:$('play'),settings:document.querySelector('aside'),notice:$('notice'),sound:$('sound'),
  hasSavedRound:()=>!!match||savedRound,
  getState:()=>({phase:!match?'ready':finished?'results':paused?'paused':'playing',missionName:entry?communityCopy(entry.title):'',
    mode:$('mode').selectedOptions[0].textContent,summary:$('status').textContent,canNext:finished}),
  onStart:()=>start(entry??LEVELS.find(row=>row.chapterId===$('chapter').value)),
  onContinue:()=>{if(match){if(finished)start(entry);else{setPaused(false);shell.showPlay()}}else $('restore').onclick()},
  onRetry:()=>entry&&start(entry),onPause:()=>setPaused(true),
  onNext:()=>start(LEVELS[(LEVELS.findIndex(row=>row.id===entry.id)+1)%LEVELS.length]),
});
requestAnimationFrame(frame);
