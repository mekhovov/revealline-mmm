export const RUNNING_ENEMY_PREFERENCES_KEY='revealline-mmm.running-enemies.v1';
export const validateRunningEnemyPreferences=()=>({format:'RunningEnemyPreferencesV2',enabled:false,style:'original'});
export function createRunningEnemyPreferences(){const state=Object.freeze({enabled:false,style:'original',durable:true});return{snapshot:()=>state,set:()=>state,setStyle:()=>state,retry:()=>state,subscribe(listener){listener(state);return()=>{}},dispose(){}}}
