export const ACTOR_STYLES=Object.freeze(['campaign']);
export const DEFAULT_ACTOR_STYLE='campaign';
export const resolveActorStyle=()=> 'campaign';
// Historical actor choices remain readable; their gameplay identity is unchanged.
export function resolveActorStyleForBoundary({boundary}={}){return Object.freeze({requested:'campaign',actorStyle:'campaign',source:['launch','next'].includes(boundary)?'preference':'retained',deferred:false})}
