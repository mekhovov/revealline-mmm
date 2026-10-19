export function contextualAppearance(){return null;}
export function mountModeGuides(){return {closeMore:()=>false,dispose(){}};}
/** Preserve the host's existing capture-mode actions and expose one local family. */
export function mountModeChoices({root,current,actions,pause=()=>{}}){
  if(!root)throw new Error('A mode navigation container is required.');
  const doc=root.ownerDocument,created=[];
  const labels={solo:'Solo',versus:'Versus',team:'Team',snake:'Snake',collections:'Collections'};
  for(const id of ['solo','versus','team','snake','collections']){
    const action=id===current?doc.createElement('button'):(actions[id]??doc.createElement('a'));
    if(id===current){action.type='button';action.setAttribute('aria-current','page');created.push(action)}
    if(['snake','collections'].includes(id)&&id!==current){action.href=new URL(`../${id}/index.html`,import.meta.url).href;created.push(action)}
    action.textContent=labels[id];action.classList.add('game-mode-choice');action.dataset.mode=id;
    action.onclick=id===current?null:pause;root.append(action);
  }
  return {closeMore:()=>false,openSimulator:null,simulatorRoot:()=>null,simulatorPrimary:()=>null,closeSimulator:()=>false,dispose(){for(const item of created)item.remove()}};
}
