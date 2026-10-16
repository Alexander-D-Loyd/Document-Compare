import {styleContext} from './style-context.mjs';
import {LCB_SPELLING_VARIANTS} from './style-lcb-spellings.mjs';
import {LCB_ROLE_FORMS} from './style-lcb-role-forms.mjs';
import {LCB_EXPRESSION_FORMS} from './style-lcb-expressions.mjs';
import {STYLE_RULES} from './gpo-style.mjs';
import compoundIndex from './data/style-division-compounds.json' with {type:'json'};
import {isCommonLexicalRoot} from './lcb-prefix-candidates.mjs';
// A review-only view. The reader's recognized complete words, plus finite
// already-checked spelling variants, can reach every contextual style check.
// Neither source characters, comparison tokens nor PDF formatting are edited.
const variants=new Set([...LCB_SPELLING_VARIANTS,...LCB_ROLE_FORMS,...LCB_EXPRESSION_FORMS,...STYLE_RULES].flatMap(r=>typeof r.variant==='string'?r.variant.match(/\p{L}+/gu)||[]:[]).map(w=>w.toLowerCase()));
const compounds=new Set(compoundIndex.records.map(r=>r.word));
const compoundLength=Math.max(...compoundIndex.records.map(r=>r.word.length));
const knownPart=word=>[word,word.replace(/s$/,''),word.replace(/ed$/,''),word.replace(/ed$/,'e'),word.replace(/ing$/,''),word.replace(/ing$/,'e')].some(isCommonLexicalRoot);
function rangeQuery(rows){
 const merged=[];for(const r of [...rows].sort((a,b)=>a.start-b.start)){const last=merged.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else merged.push({start:r.start,end:r.end});}
 return (start,end)=>{let lo=0,hi=merged.length;while(lo<hi){const mid=(lo+hi)>>1;if(merged[mid].end<=start)lo=mid+1;else hi=mid;}return !!merged[lo]&&merged[lo].start<end;};
}
export function styleWordDivisionView(doc,{knownWords=null,knownWordsOnly=false,includeLiterals=false,includeTables=false,preserveRemainingWords=false}={}){
 if(!doc.wrappedWords?.length)return null;
 const candidates=doc.wrappedWords.filter(w=>typeof w.word==='string'&&(knownWordsOnly?knownWords?.has(w.word.toLowerCase()):w.recognized||variants.has(w.word.toLowerCase())||knownWords?.has(w.word.toLowerCase())));
 if(!candidates.length)return null;
 const ctx=styleContext(doc),gaps=[],accepted=[],struck=rangeQuery(doc.struck||[]),literal=rangeQuery(ctx.literalRanges);
 const blocksAt=(start,end)=>{let lo=0,hi=doc.blocks.length;while(lo<hi){const mid=(lo+hi)>>1;if(doc.blocks[mid].end<=start)lo=mid+1;else hi=mid;}const found=[];for(let n=lo;n<doc.blocks.length&&doc.blocks[n].start<end;n++)found.push(doc.blocks[n]);return found;};
 const unknownExcluded=rangeQuery((doc.excluded||[]).filter(r=>!blocksAt(r.start,r.end).some(b=>(b.margin&&r.start>=b.start&&r.end<=b.start+b.margin.length)||((b.runningHead||(b.ignored&&b.formatting?.headerParts?.length))&&r.start===b.start&&r.end===b.end))));
 let acceptedEnd=-1;
 for(const w of [...candidates].sort((a,b)=>a.start-b.start)){
  if(!Array.isArray(w.spans)||w.spans.length<2||w.spans.length!==w.parts?.length||w.word!==w.parts.join(''))continue;
  const beforeCompound=/(\p{L}+(?:-\p{L}+)*-)$/u.exec(ctx.source.slice(Math.max(0,w.start-compoundLength),w.start)),afterCompound=/^(-\p{L}+(?:-\p{L}+)*)/u.exec(ctx.source.slice(w.end,w.end+compoundLength));
  if(compounds.has(((beforeCompound?.[0]||'')+w.parts.join('-')+(afterCompound?.[0]||'')).toLowerCase()))continue;
  // A saved unknown solid term alone cannot decide that two familiar words
  // have a discretionary rather than grammatical compound hyphen.
  if(!w.recognized&&!variants.has(w.word.toLowerCase())&&w.parts.every(p=>knownPart(p.toLowerCase())))continue;
  if(w.start!==w.spans[0].start||w.end!==w.spans.at(-1).end||w.start<acceptedEnd||struck(w.start,w.end)||(!includeLiterals&&literal(w.start,w.end))||unknownExcluded(w.start,w.end))continue;
  const bodyBlocks=blocksAt(w.start,w.end);
  if(bodyBlocks.some(b=>(!includeTables&&ctx.tableAt(b.start))||(b.ignored&&(!b.formatting?.headerParts?.length||b.start<=w.start||b.end>=w.end))))continue;
  if(w.spans.some((s,n)=>!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<0||s.end>doc.text.length||s.end<=s.start||doc.text.slice(s.start,s.end)!==w.parts[n]||ctx.source.slice(s.start,s.end)!==w.parts[n]||!/^\p{L}+$/u.test(w.parts[n])))continue;
  const candidate=w.spans.slice(0,-1).map((s,n)=>({start:s.end,end:w.spans[n+1].start}));
  if(candidate.some(r=>r.end<=r.start||!/^[-\u00ad\u2010][ \t]*\n\s*$/u.test(ctx.source.slice(r.start,r.end))))continue;
  // Masking an arbitrary excluded body fragment cannot manufacture a word.
  // Only printed margins and explicitly identified running heads may bridge.
  gaps.push(...candidate);accepted.push(w);acceptedEnd=w.end;
 }
 if(!gaps.length)return null;
 gaps.sort((a,b)=>a.start-b.start);const chunks=[];let cursor=0,removed=0;
 for(const g of gaps){chunks.push(doc.text.slice(cursor,g.start));g.at=g.start-removed;removed+=g.end-g.start;g.removed=removed;cursor=g.end;}
 chunks.push(doc.text.slice(cursor));const text=chunks.join('');
 const toSource=(index,end=false)=>{let lo=0,hi=gaps.length;while(lo<hi){const mid=(lo+hi)>>1;if(end?gaps[mid].at<index:gaps[mid].at<=index)lo=mid+1;else hi=mid;}return index+(lo?gaps[lo-1].removed:0);};
 const toView=index=>{let lo=0,hi=gaps.length;while(lo<hi){const mid=(lo+hi)>>1;if(gaps[mid].start<=index)lo=mid+1;else hi=mid;}const g=gaps[lo-1];return g?(index<g.end?g.at:index-g.removed):index;};
 const range=r=>({...r,start:toView(r.start),end:toView(r.end)}),ranges=rows=>(rows||[]).map(range).filter(r=>r.end>r.start);
 const blocks=doc.blocks.map(b=>{const start=toView(b.start),end=toView(b.end);return {...b,start,end,text:text.slice(start,end),margin:text.slice(start,toView(b.start+(b.margin?.length||0)))};}).filter(b=>b.end>b.start);
 // An outer review can join body words while an independently guarded child
 // review later joins its own literal/table words. Keep only unresolved,
 // nonoverlapping source words and translate every part into this view.
 // Index accepted spans once; repeated child reviews can contain thousands
 // of wrapped words. Keep the original predicate for malformed endpoints.
 const acceptedAt=preserveRemainingWords?rangeQuery(accepted):null;
 const remaining=preserveRemainingWords?(doc.wrappedWords||[]).filter(w=>!(Number.isFinite(w.start)&&Number.isFinite(w.end)?acceptedAt(w.start,w.end):accepted.some(a=>a.start<w.end&&a.end>w.start))).map(w=>({...range(w),spans:(w.spans||[]).map(range)})):[];
 const view={...doc,text,blocks,excluded:ranges(doc.excluded),comparisonExcluded:ranges(doc.comparisonExcluded),struck:ranges(doc.struck),tokens:ranges(doc.tokens),effectiveTokens:ranges(doc.effectiveTokens),wrappedWords:remaining};
 const restore=issues=>issues.map(i=>{const start=toSource(i.start),end=toSource(i.end,true),joined=accepted.filter(w=>w.start<end&&w.end>start);return {...i,start,end,text:joined.length?doc.text.slice(start,end):i.text,matchText:i.matchText||i.text,...(joined.length?{sourceWordDivisions:joined.map(w=>({word:w.word,start:w.start,end:w.end,spans:w.spans.map(s=>({...s}))}))}:{})};});
 return {doc:view,restore,words:accepted.map(w=>({word:w.word,start:w.start,end:w.end})),toSource,toView};
}
