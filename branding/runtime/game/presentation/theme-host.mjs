/** Fixed community interface. Authored campaign artwork remains owned by the
 * edition provider; global preferences cannot replace it or its character set. */
export class ThemePreparationTimeoutError extends Error {}
const state=Object.freeze({familyId:'coupa',familyRevision:'r1',ornaments:'off',arcadeCollection:null});
const preferences=Object.freeze({snapshot:()=>state,subscribe(listener){listener(state);return()=>{}},set:()=>state,applyComplete:()=>state,getWarning:()=>'',dispose(){}});
export function installThemeHost(){
 let disposed=false;
 return Object.freeze({preferences,ready:Promise.resolve(null),preparing:false,whenReady:async()=>null,snapshot:()=>null,effectivePreferences:()=>state,
  setDefault(){},setThemes(){},availableFamilies:()=>[],availableThemeChoices:()=>[],
  async prepareDefault(){let used=false;return Object.freeze({commit(){if(used||disposed)return false;used=true;return true}})},
  applyComplete(){},set:()=>state,refresh:async()=>null,getWarning:()=>'',setInterface(){},
  subscribe(){return()=>{}},subscribeStatus(listener){listener('');return()=>{}},dispose(){disposed=true},
 });
}
