// A distribution policy, never a cosmetic preference. Stored choices and URL
// pins cannot change the admitted characters or effects.
export const ENCOUNTER_VARIANTS=Object.freeze(['authored']);
export const ENCOUNTER_VARIANT_KEY='revealline-mmm.encounter-variant.v1';
export const DESTRUCTION_PREFERENCES_KEY='revealline-mmm.destruction.v1';
export const ENEMY_ARTWORK_PREFERENCES_KEY='revealline-mmm.enemy-art.v1';
const fixed=value=>{
 const state=Object.freeze({...value,durable:true,revision:0});
 return Object.freeze({snapshot:()=>state,set:()=>state,retry:()=>state,subscribe(listener){listener(state);return()=>{}},dispose(){}});
};
export const createEncounterVariantPreferences=()=>fixed({variant:'authored'});
export const createDestructionPreferences=()=>fixed({brutal:false,blood:false,vocals:false});
export const createActorAppearancePreferences=()=>fixed({cast:'authored'});
export const createEnemyArtworkPreferences=()=>fixed({style:'authored'});
export const sharedActorAppearance=createActorAppearancePreferences;
export const sharedEnemyArtwork=createEnemyArtworkPreferences;
export const runtimeActorArtRevision=()=>null;
export const actorArtReviewRevision=()=>null;
