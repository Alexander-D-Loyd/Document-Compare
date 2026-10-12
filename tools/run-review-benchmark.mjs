import fs from 'node:fs';import crypto from 'node:crypto';import {createRequire}from 'node:module';import {fileURLToPath}from 'node:url';import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {grammarIssues}from '../app/grammar.mjs';import {workerWords}from '../tests/helpers/spelling-worker.mjs';import {reviewOfflineLanguage,mergeOfflineGrammar}from '../app/offline-language.mjs';
import {scoreFindings}from './accuracy-score.mjs';import {REVIEW_BENCHMARK_CASES,annotations}from './review-benchmark-cases.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords();
const results=[],cases=[...REVIEW_BENCHMARK_CASES],engines=process.argv.includes('--engines');let host,bridge;
if(engines){
 const {createEngineHost}=createRequire(import.meta.url)('../engine-host.cjs');host=createEngineHost({runtimeRoot:fileURLToPath(new URL('../engines/runtime/',import.meta.url))});bridge={review:(id,kind,chunks)=>host.review({id,kind,chunks})};
 // Expected spellings come directly from the uploaded manual's exact entries,
 // independently of the implementation's modifier catalogue.
 for(const page of refs.lcb.pages.filter(p=>p.page>=9&&p.page<=14))for(const entry of page.lexicalEntries||[]){
  const m=/^([\p{L}’']+(?:-[\p{L}’']+)+) \(u\.m\.\)$/u.exec(entry);if(!m)continue;
  const preferred=m[1],open=preferred.replaceAll('-',' ');
  for(const [variant,entries]of [[open,[[open,preferred]]],[preferred,[]]])cases.push({id:'manual-modifier-'+page.page+'-'+preferred+'-'+(entries.length?'violation':'compliant'),topic:'unit-modifiers',text:'The agency requires a '+variant+' program.',kind:'style',entries,exhaustive:true,origin:'Controlled fixture; uploaded LCB page '+page.page+' exact entry: '+entry});
 }
}
try{for(const row of cases){
 const doc=makeDocument(row.text.split('\f'),'Current',[],[],words),saved=JSON.stringify(doc);
 const native=engines?await reviewOfflineLanguage(doc,row.kind,'benchmark-'+results.length,bridge):{issues:[]};if(native.warning)throw Error(native.warning);
 const findings=(row.kind==='grammar'?mergeOfflineGrammar(grammarIssues(doc),native.issues):jointStylisticIssues(doc,refs,{includeReviewSuggestions:true,engineIssues:native.issues})).map(i=>({...i,kind:row.kind}));
 if(saved!==JSON.stringify(doc))throw Error('Review changed source: '+row.id);
 const score=scoreFindings(annotations(row),findings,{exhaustive:row.exhaustive});
 results.push({id:row.id,topic:row.topic,origin:row.origin,inputSHA256:crypto.createHash('sha256').update(row.text).digest('hex'),...score});
}}finally{host?.stop();}
const sum=key=>results.reduce((n,r)=>n+(Array.isArray(r[key])?r[key].length:r[key]),0),report={at:new Date().toISOString(),scope:'Fixed annotated controlled prose and protected contexts. Not human-annotated office precision/recall; PDF imports and OCR measured separately.',cases:results.length,expected:sum('expected'),detected:sum('detected'),missedCritical:sum('missedCritical'),incorrectSuggestions:sum('incorrectSuggestions'),falseCorrections:sum('falseCorrections'),reviewBurden:sum('reviewBurden'),duplicates:sum('duplicate'),results};
report.engines=engines;const output=process.argv.slice(2).find(a=>!a.startsWith('--'));if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,results:results.filter(r=>r.missed.length||r.incorrectSuggestions.length||r.falseCorrections.length||r.duplicate.length)},null,2));
if(report.missedCritical||report.incorrectSuggestions||report.falseCorrections)process.exitCode=1;
