import {styleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext}from './style-evidence.mjs';
import {styleSingleQuoteRanges}from './style-single-quote-ranges.mjs';
import {sourceNameRanges}from './style-source-names.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
const form=/^\p{L}[\p{L}\p{M}]*(?:[-’'][\p{L}\p{M}]+)*$/u;
const clean=s=>s.replace(/’/gu,"'");
export function validateAuthority(data){
 if(!data||data.version!==1||!['Merriam-Webster','Office preference list'].includes(data.authority)||!Array.isArray(data.entries)||!data.entries.length||data.entries.length>500000)throw Error('Use an authority JSON file with version 1, authority, edition, source, permissions and ordered spelling entries.');
 for(const key of ['edition','source','permissions'])if(typeof data[key]!=='string'||!data[key].trim()||data[key].length>2000)throw Error('Authority '+key+' is required.');
 let count=0;const entries=data.entries.map((r,n)=>{
  if(!r||!Array.isArray(r.spellings)||!r.spellings.length||r.spellings.length>20||!r.spellings.every(s=>typeof s==='string'&&s.length<=150&&form.test(s)))throw Error('Invalid ordered spellings at entry '+(n+1)+'.');
  if(typeof r.entry!=='string'||!r.entry.trim()||r.entry.length>300)throw Error('Each entry needs its source identifier.');
  count+=r.spellings.length;if(count>1000000)throw Error('Authority exceeds the one-million-form limit.');
  const spellings=r.spellings.map(clean);if(new Set(spellings).size!==spellings.length)throw Error('Duplicate spelling at entry '+(n+1)+'.');
  return {entry:r.entry,spellings};
 });
 return {version:1,authority:data.authority,edition:data.edition.trim(),source:data.source.trim(),permissions:data.permissions.trim(),entries,...(/^[a-f0-9]{64}$/u.test(data.datasetId||'')?{datasetId:data.datasetId}:{})};
}
export function authorityIndex(data){
 const forms=new Set(),variants=new Map();
 for(const row of data?.entries||[]){for(const s of row.spellings)forms.add(s);for(const s of row.spellings.slice(1)){const rows=variants.get(s)||[];rows.total=(rows.total||0)+1;if(rows.length<20)rows.push({preferred:row.spellings[0],entry:row.entry});variants.set(s,rows);}}
 return {forms,variants};
}
export function authorityAccepts(index,word){
 const s=clean(word);if(index.forms.has(s))return true;
 return /^[A-Z][a-z]+$/u.test(s)&&index.forms.has(s.toLowerCase());
}
export function authorityPreferenceIssues(doc,references,data,{existingIssues=[]}={}){
 if(!data)return [];const index=authorityIndex(data),view=styleWordDivisionView(doc,{knownWords:new Set(index.variants.keys())}),d=view?.doc||doc,ctx=styleContext(d),original=originalBodyStyleContext(d),blocked=styleEvidenceGuard(d,ctx),names=sourceNameRanges(ctx.source),quotes=[...styleSingleQuoteRanges(ctx.source),...(original?[...original.literalRanges,...styleSingleQuoteRanges(original.source)]:[])],issues=[];
 for(const m of ctx.source.matchAll(/(?<![\p{L}\p{N}\p{M}_])\p{Ll}[\p{Ll}\p{M}]*(?:[-’'][\p{Ll}\p{M}]+)*(?![\p{L}\p{N}\p{M}_])/gu)){
  const rows=index.variants.get(clean(m[0]));if(!rows)continue;const start=m.index,end=start+m[0].length;
  if(ctx.at(start)==='Heading'||blocked(start,end)||cutsOriginalStyleWord(d,start)||cutsOriginalStyleWord(d,end)||names.some(r=>r.start<end&&r.end>start)||quotes.some(r=>r.start<end&&r.end>start))continue;
  const originalStart=view?view.toSource(start):start,originalEnd=view?view.toSource(end,true):end;if(existingIssues.some(i=>i.start<originalEnd&&i.end>originalStart))continue;
  const preferred=[...new Set(rows.map(r=>r.preferred))].slice(0,5),entries=rows.slice(0,5),totalEntries=rows.total||rows.length;
  issues.push({start,end,text:d.text.slice(start,end),matchText:m[0],suggestion:null,conditionalSuggestions:preferred,reviewSuggested:true,reviewKind:'imported-dictionary-preference',guideId:'lcb',guidePage:2,guidePrintedPage:String(references.lcb.pages[1].printedPage),rule:'Spelling and usage, item 2: imported authority',category:'Dictionary Preference Review',context:ctx.at(start),checkId:'imported-authority-'+(data.datasetId||'unidentified'),conflict:false,dictionaryEvidence:{authority:data.authority,edition:data.edition,source:data.source,datasetId:data.datasetId,entries,totalEntries},message:'Review Suggested: The installed '+data.authority+' '+data.edition+' list places '+preferred.map(s=>'“'+s+'”').join(' or ')+(totalEntries>5?' (a bounded sample from '+totalEntries+' source entries)':'')+' first in the listed entry/entries. Confirm the intended meaning and source entry before changing “'+m[0]+'”. Listed variants remain accepted spellings; no replacement is asserted. This imported dataset does not certify complete dictionary coverage.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:2,guidePrintedPage:String(references.lcb.pages[1].printedPage),rule:'Spelling and usage, item 2',preferred:null,ruleText:'LCB uses the first-listed spelling from the selected dictionary. Installed source: '+data.source+'; edition: '+data.edition+'. Source entries: '+entries.map(r=>r.entry).join(', ')+(totalEntries>5?' (additional entries not displayed)':'')}]});
 }
 return view?view.restore(issues):issues;
}
export function authorityStore(factory=globalThis.indexedDB){
 async function database(){if(!factory)throw Error('Offline authority storage is unavailable.');return new Promise((resolve,reject)=>{const r=factory.open('document-compare.authority.v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Offline authority storage could not open.'));});}
 async function transaction(mode,value,remove=false){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('data',mode),store=tx.objectStore('data'),r=mode==='readonly'?store.get('active'):remove?store.delete('active'):store.put(value,'active');let result;r.onsuccess=()=>{result=r.result};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('Offline authority data could not be saved/read; the previous installed data is retained.'));});}finally{db.close();}}
 return {load:async()=>{const d=await transaction('readonly');return d?validateAuthority(d):null;},save:async d=>{const valid=validateAuthority(d);await transaction('readwrite',valid);return valid;},remove:()=>transaction('readwrite',null,true)};
}
