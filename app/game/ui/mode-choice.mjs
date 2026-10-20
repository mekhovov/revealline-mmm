import { setMenuIcon } from './native-menu-icons.mjs';
export function contextualAppearance(){return null;}
export function mountModeGuides(){return {closeMore:()=>false,dispose(){}};}
/** Existing Capture anchors retain their listeners and checked departure owners. */
export function mountModeChoices({root,current,actions,pause=()=>{}}){
  const order=['solo','versus','team','snake','collections'];
  if(!root||!order.includes(current))throw new Error('A supported mode and navigation container are required.');
  const doc=root.ownerDocument,created=[],listeners=[];
  root.classList.add('game-mode-choice');root.style.setProperty('--game-mode-count','5');
  root.dataset.menuScope='modes';root.dataset.menuLayout='horizontal';
  const labels={solo:'Solo',versus:'Versus',team:'Team',snake:'Snake',collections:'Collections'};
  const icons={solo:'link',versus:'controls',team:'collection',snake:'snake',collections:'collection'};
  for(const id of order){
    const action=id===current?doc.createElement('span'):(actions[id]??doc.createElement('a'));
    if(id===current){action.setAttribute('aria-current','page');created.push(action)}
    if(['snake','collections'].includes(id)&&id!==current){action.href=new URL('../'+id+'/index.html',import.meta.url).href;created.push(action)}
    if(!action.id)action.id=(root.id||'coupa-modes')+'-'+id;
    action.textContent=labels[id];action.classList.add('game-mode-choice-item');
    action.dataset.mode=id;action.dataset.gameMode=id;setMenuIcon(action,icons[id]);
    if(id!==current){action.addEventListener('click',pause);listeners.push(()=>action.removeEventListener('click',pause))}
    root.append(action);
  }
  const EventClass=doc.defaultView?.CustomEvent;
  if(EventClass)root.dispatchEvent(new EventClass('game-mode-choices-ready',{bubbles:true}));
  return {closeMore:()=>false,openSimulator:null,simulatorRoot:()=>null,simulatorPrimary:()=>null,closeSimulator:()=>false,
    dispose(){for(const cleanup of listeners)cleanup();for(const item of created)item.remove()}};
}
