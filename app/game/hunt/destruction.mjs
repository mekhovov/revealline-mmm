import { drawConnectionToken } from '../snake/coupa-art.mjs';
export function drawHumanoidPixelBody(ctx, actor={}){drawConnectionToken(ctx,0,0,16,actor,{warning:false,recovering:false})}
export function drawHuntRemains(){}
/** Bounded collection pulses contain no fragments, remains or organic effects. */
export function createHuntDestruction(){
 let owner=null,seen=new Set(),pulses=[];
 const reset=()=>{owner=null;seen.clear();pulses=[]};
 return Object.freeze({reset,setArtRevision:()=>false,reserveTransientPieces:()=>0,
 advance(view,dt,{key,paused=false,reduced=false,concealed=false}={}){
  if(owner!==key){reset();owner=key}
  if(paused)return;
  if(reduced||concealed){pulses=[];return}
  pulses=pulses.map(p=>({...p,age:p.age+Math.max(0,Math.min(.1,dt))})).filter(p=>p.age<.4);
  for(const [index,mark] of (view?.eliminations??[]).entries()){
   const id=mark.id??`${index}/${mark.x}/${mark.y}/${mark.tick}`;
   if(seen.has(id))continue;seen.add(id);
   if(Number.isFinite(mark.x)&&Number.isFinite(mark.y))pulses.push({x:mark.x,y:mark.y,age:0});
  }
  pulses=pulses.slice(-12);if(seen.size>256)seen=new Set([...seen].slice(-128));
 },
 snapshot:()=>({bursts:pulses.length,particles:0,envelopes:pulses.length,allocatedParticles:0,allocatedEnvelopes:12}),
 draw(ctx){ctx.save();for(const p of pulses){ctx.globalAlpha=1-p.age/.4;ctx.strokeStyle='#64d8f4';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x*16,p.y*16,3+p.age*22,0,Math.PI*2);ctx.stroke()}ctx.restore()}
 });
}
