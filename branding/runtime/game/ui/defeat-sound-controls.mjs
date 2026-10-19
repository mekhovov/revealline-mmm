import { createDestructionPreferences } from '../hunt/preferences.mjs';
export function attachDefeatSoundControls(){const preferences=createDestructionPreferences();return{element:null,snapshot:preferences.snapshot,dispose(){}}}
