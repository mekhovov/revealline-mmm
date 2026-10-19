import { drawConnectionToken } from '../snake/coupa-art.mjs';
export const INDUSTRIAL_ACTOR_SAMPLES=Object.freeze({});
export const OVERHEAD_ACTOR_SAMPLES=Object.freeze({});
export const INDUSTRIAL_ROSTER_SAMPLES=Object.freeze({});
export const OVERHEAD_ACTOR_ART_REVISION='coupa-connections-v1';
export const INDUSTRIAL_ROSTER_ART_REVISION='coupa-connections-v1';
export function drawHuntActor(ctx,x,y,size,pose=0,options={}){drawConnectionToken(ctx,x,y,size,options,{warning:['warning','windup','prepare'].includes(options.phase),recovering:options.phase==='rest'})}
