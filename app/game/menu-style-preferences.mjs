export const MENU_STYLE_PREFERENCES_KEY='revealline-mmm.menu-style.v1';
export function createMenuStylePreferences(){
 const state=Object.freeze({palette:'auto',ornaments:'off',revision:0});
 return Object.freeze({snapshot:()=>state,set:()=>state,getWarning:()=>'',subscribe(listener){listener(state);return()=>{}},dispose(){}});
}
