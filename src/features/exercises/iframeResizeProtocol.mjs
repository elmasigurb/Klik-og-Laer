export const EXERCISE_RESIZE_MESSAGE = 'klik-og-laer:exercise-resize'
export const EXERCISE_RESIZE_VERSION = 1
export const MIN_EXERCISE_HEIGHT = 240
export const MAX_EXERCISE_HEIGHT = 30000

export function isTrustedResizeMessage(event, frameWindow, frameId) {
  if (!frameWindow || event.source !== frameWindow || event.origin !== 'null') return false
  const message = event.data
  if (!message || typeof message !== 'object' || Array.isArray(message)) return false
  const keys = Object.keys(message).sort()
  if (keys.length !== 4 || keys.join(',') !== 'frameId,height,type,version') return false
  if (message.type !== EXERCISE_RESIZE_MESSAGE || message.version !== EXERCISE_RESIZE_VERSION || message.frameId !== frameId) return false
  return Number.isInteger(message.height) && message.height >= MIN_EXERCISE_HEIGHT && message.height <= MAX_EXERCISE_HEIGHT
}

export function buildResizableExerciseDocument(html, frameId, parentOrigin) {
  const safeFrameId = JSON.stringify(frameId)
  const safeParentOrigin = JSON.stringify(parentOrigin)
  const bridge = `<meta name="viewport" content="width=device-width, initial-scale=1"><style data-kl-touch-bridge>button,input,select,textarea{touch-action:manipulation}input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),select,textarea{font-size:max(16px,1em)!important}</style><script data-kl-resize-bridge>(function(){
    "use strict";
    var bridgeScript=document.currentScript;
    var frameId=${safeFrameId};
    var parentOrigin=${safeParentOrigin};
    var type=${JSON.stringify(EXERCISE_RESIZE_MESSAGE)};
    var version=${EXERCISE_RESIZE_VERSION};
    var scheduled=false;
    function measure(){
      scheduled=false;
      var root=document.documentElement;
      var body=document.body;
      if(!root||!body)return;
      var height=Math.ceil(Math.max(root.scrollHeight,root.offsetHeight,root.clientHeight,body.scrollHeight,body.offsetHeight,body.clientHeight));
      if(Number.isInteger(height)&&height>=${MIN_EXERCISE_HEIGHT}&&height<=${MAX_EXERCISE_HEIGHT}) parent.postMessage({type:type,version:version,frameId:frameId,height:height},parentOrigin);
    }
    function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(measure);}
    function start(){
      schedule();
      if(typeof ResizeObserver!=="undefined"){var resizeObserver=new ResizeObserver(schedule);resizeObserver.observe(document.documentElement);if(document.body)resizeObserver.observe(document.body);}
      if(typeof MutationObserver!=="undefined"&&document.documentElement){var mutationObserver=new MutationObserver(schedule);mutationObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});}
      addEventListener("load",schedule,true);
      addEventListener("resize",schedule);
      if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule).catch(function(){});
    }
    if(bridgeScript)bridgeScript.remove();
    if(document.readyState==="loading")addEventListener("DOMContentLoaded",start,{once:true});else start();
  })();<\/script>`
  const doctype = html.match(/^\s*<!doctype[^>]*>/i)
  if (!doctype) return `${bridge}${html}`
  return `${html.slice(0, doctype[0].length)}${bridge}${html.slice(doctype[0].length)}`
}
