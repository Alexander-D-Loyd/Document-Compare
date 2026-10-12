// Selected source-noun spellings have ordinary noun + verb lookalikes.
// A determiner before "water courses" does not establish a compound noun in
// "The water courses through the ditch." Preserve independently established
// finite/causative verb uses; this is not unrestricted semantic parsing.
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
const determiners='(?:a|an|the|this|that|each|every|any|his|her|its|their|our|your)';
const adjectives='(?:(?:new|old|existing|public|private|local|main|small|large|specified|designated|affected|receiving|eligible)\\s+){0,2}';
const nouns='(?:pets?|children|child|patients?|persons?|people|families|family|accounts?|funds?|ditches|ditch|channels?|pipes?|rivers?|canals?|soil|ground|streams?|ponds?|lakes?|containers?)';
const nominal='(?:'+determiners+'\\s+)?'+adjectives+nouns;
const ending='\\s*(?:[.;!?)]|$)';
const flow=new RegExp('^\\s+(?:(?:freely|slowly|rapidly|naturally|downhill)\\s+)?(?:through|along|down|into|to|from|out\\s+of)\\s+'+nominal+ending,'i');
const freeFlow=/^\s*(?:(?:freely|slowly|rapidly|naturally|downhill)\s*)?(?:[.;!?)]|$)/i;
const care=new RegExp('^\\s+for\\s+'+nominal+ending,'i');
const fill=new RegExp('^\\s+(?:with\\s+'+nominal+'|'+nominal+')'+ending,'i');
const causative=new RegExp('\\b(?:let|lets|letting|make|makes|made|making|have|has|had|having|watch|watches|watched|watching|see|sees|saw|seeing|hear|hears|heard|hearing|feel|feels|felt|feeling)\\s+(?:(?:not|never|also|only)\\s+){0,2}'+determiners+'\\s+$','i');
const reverseWordsStart=(source,end)=>{let at=end;for(let n=0;n<4&&at>0;n++){while(at>0&&/\s/.test(source[at-1]))at--;while(at>0&&!/\s/.test(source[at-1]))at--;}return at;};
const ambiguousForms=new Set(['water courses','child care','water flow','cash flow','stream flow','land fill']);
export function listedNounVerbEvidence(ctx,start,end,variant){
 const sentence=ctx.sentenceAt(start),beforeStart=Math.max(sentence.start,reverseWordsStart(ctx.source,start)),before=ctx.source.slice(beforeStart,start),after=ctx.source.slice(end);
 const form=variant.replace(/[\s-]+/g,' ');
 if(form==='water courses'){const left=/^\s*the\s+$/i.exec(ctx.source.slice(sentence.start,start)),right=flow.exec(after);return left&&right?{start:sentence.start+left.index,end:end+right[0].length}:null;}
 const left=causative.exec(before);if(!left)return null;
 const right=form==='child care'?care.exec(after):['water flow','cash flow','stream flow'].includes(form)?freeFlow.exec(after)||flow.exec(after):form==='land fill'?fill.exec(after):null;
 return right?{start:beforeStart+left.index,end:end+right[0].length}:null;
}
export const listedNounVerbUse=(ctx,start,end,variant)=>!!listedNounVerbEvidence(ctx,start,end,variant);
export const NOUN_VERB_PROTECTION_SCOPE=' Selected original finite/causative verb constructions remain protective when their words or connecting spaces are struck or excluded; original text is consulted only to prevent a noun correction, never to create a finding. Reverse lexical discovery removes the old200-character preceding verb-cue limit. Complete original Unicode boundaries, literals, tables and unclassified ignored blocks remain protected. Unknown verb vocabulary and broader semantic roles remain manual.';
// An uncertain word may invalidate a confirmed verb reading without making a
// noun correction justified. Revisit the original body only for protection;
// it can never create a positive finding or alter the displayed source.
export function createListedNounVerbProtection(doc,ctx){
 const activeBlocked=styleEvidenceGuard(doc,ctx),unclassified=doc.blocks.filter(b=>b.ignored&&!b.formatting?.headerParts?.length),unknownHead=(start,end)=>{let lo=0,hi=unclassified.length;while(lo<hi){const mid=(lo+hi)>>1;if(unclassified[mid].end<=start)lo=mid+1;else hi=mid;}return lo<unclassified.length&&unclassified[lo].start<end;},valid=(e,blocked)=>e&&!cutsOriginalStyleWord(doc,e.start)&&!cutsOriginalStyleWord(doc,e.end)&&!unknownHead(e.start,e.end)&&!blocked(e.start,e.end);let originalCtx=null,originalBlocked=null,prepared=false;
 const prepare=()=>{prepared=true;originalCtx=originalBodyStyleContext(doc);if(originalCtx)originalBlocked=styleEvidenceGuard({...doc,struck:[],excluded:[]},originalCtx);};
 return (start,end,variant)=>{if(!ambiguousForms.has(variant.replace(/[\s-]+/g,' ')))return false;if(valid(listedNounVerbEvidence(ctx,start,end,variant),activeBlocked))return true;if(!prepared)prepare();return !!originalCtx&&!!valid(listedNounVerbEvidence(originalCtx,start,end,variant),originalBlocked);};
}
