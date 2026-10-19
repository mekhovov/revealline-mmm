/** Authored community art is loaded by the edition provider, never a global skin. */
export function mountPresentationPage({onStatus=()=>{}}={}){
 onStatus({status:'ready',stage:'ready',progress:1,message:''});
 return Object.freeze({ready:Promise.resolve(null),retry:async()=>null,current:()=>null,bindPainter:()=>()=>{},readAudio:async()=>null,readPicture:async()=>null,close(){}});
}
