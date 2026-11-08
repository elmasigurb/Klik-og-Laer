import { EXERCISE_RESULT_ADAPTERS } from './exerciseResultAdapters.mjs'

export const EXERCISE_RESULT_MESSAGE = 'klik-og-laer:exercise-result'
export const EXERCISE_RESULT_VERSION = 1
export const EXERCISE_COMPLETION_PERCENT = 80

const RESULT_KEYS = ['adapterFamily', 'adapterId', 'attemptId', 'completed', 'earned', 'exerciseId', 'final', 'frameId', 'htmlSignature', 'possible', 'type', 'version']
const ADAPTER_FAMILIES = new Set(EXERCISE_RESULT_ADAPTERS.map((adapter) => adapter.family))

export async function exerciseHtmlSignature(html) {
  if (!globalThis.crypto?.subtle) return ''
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(html))
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

export function getExerciseResultAdapterDefinition(exerciseId) {
  return EXERCISE_RESULT_ADAPTERS.find((adapter) => adapter.exerciseId === exerciseId) ?? null
}

export function getExerciseResultAdapter(exerciseId, htmlSignature) {
  const adapter = getExerciseResultAdapterDefinition(exerciseId)
  return adapter?.htmlSignature === htmlSignature ? adapter : null
}

export function resolveExerciseResultSnapshot(adapter, snapshot) {
  if (!adapter || !snapshot || snapshot.finalVisible !== true || typeof snapshot.scoreText !== 'string') return null
  const match = snapshot.scoreText.match(new RegExp(adapter.scorePattern, 'i'))
  if (!match) return null
  const earned = Number(match[1])
  const possible = adapter.possible
  if (!Number.isInteger(earned) || !Number.isInteger(possible) || possible < 1 || earned < 0 || earned > possible) return null
  const meetsThreshold = earned * 100 >= possible * EXERCISE_COMPLETION_PERCENT
  const completed = meetsThreshold && (!adapter.requiresAdditionalCompletion || snapshot.additionalCompletion === true)
  return { earned, possible, completed }
}

export function isTrustedExerciseResultMessage(event, frameWindow, frameId, exerciseId, htmlSignature) {
  if (!frameWindow || event.source !== frameWindow || event.origin !== 'null') return false
  const message = event.data
  if (!message || typeof message !== 'object' || Array.isArray(message)) return false
  const keys = Object.keys(message).sort()
  if (keys.length !== RESULT_KEYS.length || keys.some((key, index) => key !== RESULT_KEYS[index])) return false
  const adapter = getExerciseResultAdapter(exerciseId, htmlSignature)
  if (!adapter || message.type !== EXERCISE_RESULT_MESSAGE || message.version !== EXERCISE_RESULT_VERSION) return false
  if (message.frameId !== frameId || message.exerciseId !== exerciseId || message.htmlSignature !== htmlSignature || message.adapterId !== adapter.id || message.adapterFamily !== adapter.family) return false
  if (!ADAPTER_FAMILIES.has(message.adapterFamily) || message.final !== true || typeof message.completed !== 'boolean') return false
  if (typeof message.attemptId !== 'string' || !/^[a-zA-Z0-9-]{16,128}$/.test(message.attemptId)) return false
  if (!Number.isInteger(message.earned) || !Number.isInteger(message.possible) || message.possible !== adapter.possible || message.earned < 0 || message.earned > message.possible) return false
  const meetsThreshold = message.earned * 100 >= message.possible * EXERCISE_COMPLETION_PERCENT
  if (message.completed && !meetsThreshold) return false
  if (!adapter.requiresAdditionalCompletion && message.completed !== meetsThreshold) return false
  return true
}

export function buildExerciseResultBridge(frameId, parentOrigin, exerciseId, htmlSignature) {
  const adapter = getExerciseResultAdapter(exerciseId, htmlSignature)
  if (!adapter) return ''
  const resolveSnapshot = resolveExerciseResultSnapshot.toString()
  return `<script data-kl-result-bridge>(function(){
    "use strict";
    var bridgeScript=document.currentScript;
    var frameId=${JSON.stringify(frameId)};
    var parentOrigin=${JSON.stringify(parentOrigin)};
    var exerciseId=${JSON.stringify(exerciseId)};
    var htmlSignature=${JSON.stringify(htmlSignature)};
    var adapter=${JSON.stringify(adapter)};
    var type=${JSON.stringify(EXERCISE_RESULT_MESSAGE)};
    var version=${EXERCISE_RESULT_VERSION};
    var EXERCISE_COMPLETION_PERCENT=${EXERCISE_COMPLETION_PERCENT};
    var resolveSnapshot=${resolveSnapshot};
    var attemptId=createAttemptId();
    var emitted=false;
    var armed=true;
    var waitingForReset=false;
    var scheduled=false;
    function createAttemptId(){
      if(typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function")return crypto.randomUUID();
      var values=new Uint32Array(4);crypto.getRandomValues(values);return Array.prototype.map.call(values,function(value){return value.toString(36)}).join("-");
    }
    function visible(element){return !!element&&!element.hidden&&!element.classList.contains("hidden")&&getComputedStyle(element).display!=="none"&&getComputedStyle(element).visibility!=="hidden";}
    function evaluate(){
      scheduled=false;
      var finalElement=document.querySelector(adapter.finalSelector);
      var finalVisible=visible(finalElement);
      var scoreElement=document.querySelector(adapter.scoreSelector);
      var additionalCompletion=!adapter.requiresAdditionalCompletion||!!(finalElement&&finalElement.querySelector(adapter.additionalCompletionSelector));
      var result=resolveSnapshot(adapter,{finalVisible:finalVisible,scoreText:scoreElement?scoreElement.textContent||"":"",additionalCompletion:additionalCompletion});
      if(!result){if(waitingForReset||!finalVisible){armed=true;waitingForReset=false;}return;}
      if(waitingForReset)return;
      if(!armed||emitted)return;
      emitted=true;
      parent.postMessage({type:type,version:version,frameId:frameId,exerciseId:exerciseId,htmlSignature:htmlSignature,attemptId:attemptId,adapterId:adapter.id,adapterFamily:adapter.family,earned:result.earned,possible:result.possible,completed:result.completed,final:true},parentOrigin);
    }
    function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(evaluate);}
    function beginRetry(){attemptId=createAttemptId();emitted=false;armed=false;waitingForReset=true;schedule();}
    function start(){
      document.addEventListener("click",function(event){var target=event.target instanceof Element?event.target.closest(adapter.retrySelector):null;if(target)beginRetry();},true);
      if(typeof MutationObserver!=="undefined"&&document.documentElement){var observer=new MutationObserver(schedule);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});}
      addEventListener("load",schedule,true);schedule();
    }
    if(bridgeScript)bridgeScript.remove();
    if(document.readyState==="loading")addEventListener("DOMContentLoaded",start,{once:true});else start();
  })();<\/script>`
}
