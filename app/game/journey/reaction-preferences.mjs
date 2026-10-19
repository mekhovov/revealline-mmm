export const JOURNEY_REACTION_PREFERENCES_KEY='revealline-mmm.journey-reactions.v1';
export function validateReactionPreferences(){return Object.freeze({format:'JourneyReactionPreferencesV1',enabled:false})}
export function createReactionPreferences(){
 const state=Object.freeze({enabled:false,durable:true,error:''});
 return Object.freeze({snapshot:()=>state,choose:()=>state,retry:()=>state,subscribe(listener){listener(state);return()=>{}},dispose(){}});
}
