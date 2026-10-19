export const BATTLEFIELD_GROUND_KEY='revealline-mmm.ground.v1';
export const BATTLEFIELD_GROUND_CHOICES=Object.freeze(['authored']);
export function createBattlefieldGroundPreferences(){const state=Object.freeze({world:'authored',durable:true});return{snapshot:()=>state,set:()=>state,subscribe(listener){listener(state);return()=>{}},dispose(){}}}
export const sharedBattlefieldGround=createBattlefieldGroundPreferences;
export const battlefieldGroundAllowed=()=>false;
export function createBattlefieldGroundSurface(){return{prepare:()=>null,clear(){},resourceSnapshot:()=>({canvases:0,pixels:0,rgbaBytesEstimate:0,lost:0})}}
export const paintBattlefieldGroundSpan=()=>false;
