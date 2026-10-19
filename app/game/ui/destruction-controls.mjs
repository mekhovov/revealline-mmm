import { createDestructionPreferences } from '../hunt/preferences.mjs';
export function attachDestructionControls(){const preferences=createDestructionPreferences();return{element:null,snapshot:preferences.snapshot,dispose(){}}}
