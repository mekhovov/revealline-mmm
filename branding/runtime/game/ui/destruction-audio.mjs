export const DESTRUCTION_CATEGORIES=Object.freeze(['soft','armored','light','heavy','electronic']);
export const DESTRUCTION_CUES=Object.freeze(DESTRUCTION_CATEGORIES.map(id=>`destroy-${id}`));
export const HUMAN_REACTION_CUES=Object.freeze([]);
export const isHumanoidDestruction=()=>false;
export const destructionCategory=()=> 'electronic';
export function destructionSoundRecipe(){return {category:'electronic',name:'collect',gain:.1,priority:2,movement:false,rate:1,maxDuration:.15,cooldown:.08,tone:{from:660,to:990,duration:.12,gain:.03,type:'sine'},layers:[]}}
