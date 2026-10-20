export const COUPA_PALETTE = Object.freeze({field:'#071c47',alternate:'#102956',grid:'#4bb9df',text:'#fff',muted:'#91b9db',accent:'#ffdf70',safe:'#56d7ed',danger:'#ffad63'});
const ANGLES={up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2};
let flower=null,preparation=null;
/** Use the retained original brand asset, rather than approximating its petals. */
export function prepareCoupaHeadArt({ImageClass=globalThis.Image}={}){
  if(preparation)return preparation;
  if(!ImageClass)return Promise.resolve(null);
  preparation=new Promise(resolve=>{
    const image=new ImageClass();
    image.onload=()=>{flower=image;resolve(image)};
    image.onerror=()=>resolve(null);
    image.src=new URL('../editions/assets/coupa/flower-blue.png',import.meta.url).href;
  });
  return preparation;
}
export function drawCoupaHead(ctx,snake,ink,{timeMs=0,reduced=false}={}){
  const head=snake.body[0];
  ctx.save();ctx.translate((head.x+.5)*28,(head.y+.5)*28);
  ctx.fillStyle=snake.id?'#eee5ff':'#edfbff';
  ctx.strokeStyle=snake.id?'#d8b8ff':ink.edge;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(0,0,12.5,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.rotate(reduced?0:timeMs/8000);
  if(flower)ctx.drawImage(flower,-11,-11,22,22);
  else{ctx.fillStyle='#1565c0';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('C',0,1)}
  ctx.restore();ctx.save();ctx.translate((head.x+.5)*28,(head.y+.5)*28);ctx.rotate(ANGLES[snake.direction]??0);
  ctx.strokeStyle=snake.id?'#d8b8ff':'#64d8f4';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-4,-15);ctx.lineTo(0,-18);ctx.lineTo(4,-15);ctx.stroke();ctx.restore();
}
const SYMBOLS={still:'•',runner:'↗',sprinter:'»',jumper:'◇',wanderer:'~',guard:'⊓',jammer:'≋',lane:'↔',relay:'⊙',perimeter:'□',contour:'⌁',rover:'↗',ricochet:'⌃',eroder:'−'};
export function drawConnectionToken(ctx,x,y,size,options,state) {
  ctx.save();ctx.translate(x+size/2,y+size/2);ctx.scale(size/28,size/28);
  const warning=state.warning||state.active;
  ctx.strokeStyle=warning?'#ffdf70':'#64d8f4';ctx.fillStyle=state.recovering?'#58758e':'#f7fbff';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-8,-9);ctx.lineTo(3,-9);ctx.lineTo(9,-3);ctx.lineTo(9,9);ctx.lineTo(-8,9);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(3,-9);ctx.lineTo(3,-3);ctx.lineTo(9,-3);ctx.stroke();
  ctx.fillStyle='#0b3270';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(SYMBOLS[options.kind]??'◇',0,1);
  // Protected fronts and accepted movement direction remain distinct from
  // animation, including stationary targets and warning/recovery phases.
  ctx.rotate(ANGLES[options.heading]??0);ctx.strokeStyle=warning?'#ffdf70':'#56d7ed';
  ctx.lineWidth=options.kind==='guard'?4:2;ctx.beginPath();ctx.moveTo(-10,-12);ctx.lineTo(0,-14);ctx.lineTo(10,-12);ctx.stroke();
  if(warning){ctx.strokeStyle='#ffdf70';ctx.lineWidth=2;ctx.setLineDash([3,2]);ctx.strokeRect(-13,-13,26,26)}
  ctx.restore();
}
