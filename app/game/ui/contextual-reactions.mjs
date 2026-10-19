const preference=()=>({snapshot:()=>({enabled:false,durable:true}),subscribe(listener){listener({enabled:false,durable:true});return()=>{}},set(){},dispose(){}});
export const reactionWarmupLineIds=()=>[];
export class ContextualReactionDirector {events(){return []}result(){return []}reset(){}suspend(){}resume(){}}
export function attachContextualReactions(){return Object.freeze({preferences:preference(),options:preference(),prepare:async()=>{},refresh(){},diagnostics:()=>({incidents:0,speaking:false}),events:()=>[],result:()=>[],reset(){},suspend(){},resume(){},dispose(){}})}
