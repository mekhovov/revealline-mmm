const flower = new URL('../editions/assets/coupa/flower-blue.png', import.meta.url).href;
export const REACTION_PORTRAITS = Object.freeze(Object.fromEntries(['guide','engineer','rival','sentinel'].map(id => [id, Object.freeze({idle:flower,react:flower})])));
