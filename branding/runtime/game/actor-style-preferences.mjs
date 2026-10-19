export const ACTOR_STYLE_PREFERENCES_KEY='revealline-mmm.actor-style.v1';
export function createActorStylePreferences(){const state=Object.freeze({actorStyle:'campaign'});return{snapshot:()=>state,set:()=>state,subscribe(listener){listener(state);return()=>{}},getWarning:()=>'',dispose(){}}}
