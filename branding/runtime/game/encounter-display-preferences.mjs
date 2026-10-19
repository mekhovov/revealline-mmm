// Branded presentation cannot be overridden by saved choices or imports.
export const ENCOUNTER_DISPLAY_PREFERENCES_KEY='revealline-mmm.encounter-display.v1';
export function createEncounterDisplayPreferences(){
 const state=Object.freeze({showRemains:false,durable:true,warningKey:'',revision:0});
 return Object.freeze({snapshot:()=>state,set:()=>state,retry:()=>state,subscribe(listener){listener(state);return()=>{}},dispose(){}});
}
