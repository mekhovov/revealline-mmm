export const INDUSTRIAL_ARCADE_COLLECTION=Object.freeze({id:'coupa',revision:'r1',roles:[]});
export const INDUSTRIAL_ARCADE_PALETTE=Object.freeze({ink:'#071c47',paper:'#ffffff',accent:'#4bb9df'});
export const getArcadeCollection=()=>null;
export const selectedArcadeCollection=()=>null;
export const getArcadePalette=()=>INDUSTRIAL_ARCADE_PALETTE;
export const industrialTexturePixels=image=>image;
export function createArcadeAdapter(){return{resolve:snapshot=>snapshot?.brandPolicy==='coupa-clean-v1'?snapshot:null,clear(){},setEnvironment:()=>false,setReviewRevision:()=>false,resourceSnapshot:()=>({canvases:0,pixels:0,rgbaBytesEstimate:0,lost:0})}}
