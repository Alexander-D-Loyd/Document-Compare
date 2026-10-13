import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';
import {prepareOfflineLanguage,mapOfflineIssues,mergeOfflineGrammar,reviewOfflineLanguage}from '../app/offline-language.mjs';
import {jointStylisticIssues}from '../app/joint-style.mjs';
import {OFFLINE_MODIFIERS}from '../app/offline-rules.mjs';
import {CHECK_COVERAGE}from '../app/style-coverage.mjs';
import {listedModifierWitness}from './helpers/listed-modifier-witness.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>makeDocument(Array.isArray(t)?t:[t],'Current');
test('source-confirmed passive infinitive review preserves its exact phrase and validated conditional suggestion',()=>{
 const text='The county official is required compare the signature.',doc=make(text),p=prepareOfflineLanguage(doc),raw={...issue(p,'required compare'),engine:'spaCy',engineRule:'SPACY_REQUIRED_INFINITIVE_REVIEW',reviewSuggested:true,suggestion:'required to compare'},mapped=mapOfflineIssues(doc,p,[raw],'grammar');assert.equal(mapped.length,1);assert.equal(doc.text.slice(mapped[0].start,mapped[0].end),'required compare');assert.equal(mapped[0].engine,'spaCy');assert.equal(mapped[0].reviewSuggested,true);
 for(const altered of [{...raw,engine:'LanguageTool'},{...raw,reviewSuggested:false},{...raw,suggestion:'required to submit'}])assert.equal(mapOfflineIssues(doc,p,[altered],'grammar').length,0);
 for(const field of ['struck','excluded'])for(let at=0;at<text.length;at++){const bad=make(text);bad[field].push({start:at,end:at+1});assert.equal(mapOfflineIssues(bad,p,[raw],'grammar').length,0,field+' '+at);}
});
test('unrelated quoted sentence evidence does not create a local modifier fallback',()=>{
 for(const text of ['The agency must use high quality scanners described as "advanced".','The agency describes a "scanner" and requires high quality interfaces.',"The term 'sensor' applies to high quality scanners."]){
  const d=make(text),p=prepareOfflineLanguage(d),head=text.includes('interfaces')?'interfaces':'scanners',raw={...issue(p,'high quality','style',head),suggestion:'high-quality',engineRule:'LCB_HIGH_QUALITY_MODIFIER'},saved=JSON.stringify(d),mapped=mapOfflineIssues(d,p,[raw],'style');
  assert.deepEqual(mapped,[],text);assert.equal(JSON.stringify(d),saved);
  for(const field of ['struck','excluded'])for(const fragment of ['high','quality',head,' quality']){const bad=make(text),at=bad.text.indexOf(fragment);bad[field].push({start:at,end:at+1});assert.equal(mapOfflineIssues(bad,p,[raw],'style').length,0,field+' '+fragment);}
 }
 for(const text of ['The agency requires "high quality" scanners.','The agency requires high quality "scanners".','The agency requires high quality "optical" scanners.']){const d=make(text),p=prepareOfflineLanguage(d),raw={...issue(p,'high quality','style','scanners'),suggestion:'high-quality',engineRule:'LCB_HIGH_QUALITY_MODIFIER'};assert.equal(mapOfflineIssues(d,p,[raw],'style').length,0,text);}
 const d=make('The reports is available in the folder named "Reports".'),p=prepareOfflineLanguage(d);assert.equal(mapOfflineIssues(d,p,[issue(p,'is')],'grammar').length,0);
});
function issue(plan,term,kind='grammar',head='program'){
 const start=plan.text.indexOf(term),headStart=plan.text.indexOf(head,start+term.length);
 const value={start,end:start+term.length,evidenceStart:0,evidenceEnd:plan.text.length,suggestion:kind==='grammar'?'are':'data-processing',message:'Check agreement',engine:kind==='grammar'?'LanguageTool':'spaCy',engineRule:kind==='grammar'?'AGREEMENT_SENT_START':'LCB_DATA_PROCESSING_MODIFIER',head,headStart,headEnd:headStart+head.length};
 if(kind==='style')Object.assign(value,{reviewSuggested:false,attachmentMethod:'direct',modifierRoleEvidence:listedModifierWitness(plan,value)});return value;
}
test('offline grammar offsets preserve source line numbers wrapping and Unicode',()=>{
 const doc=make('line 1 The reports\nline 2 is available. 😀'),saved=JSON.stringify(doc),p=prepareOfflineLanguage(doc),raw=issue(p,'is');
 assert.deepEqual(mapOfflineIssues(doc,p,[raw],'grammar').map(i=>doc.text.slice(i.start,i.end)),['is']);assert.equal(JSON.stringify(doc),saved);assert.ok(!p.text.includes('line 1'));assert.ok(p.text.includes('😀'));
 const headed=make('ASSEMBLY BILL No. 9998\nThe people do enact as follows:\nline 1 The reports is available.'),q=prepareOfflineLanguage(headed);assert.ok(q.text.startsWith('The reports'));assert.equal(mapOfflineIssues(headed,q,[issue(q,'is')],'grammar').length,1);
});
test('source-aware engine mapping protects every part of sentence evidence',()=>{
 for(const field of ['struck','excluded'])for(const word of ['The','reports','is','available',' ']){const doc=make('The reports is available.'),at=doc.text.indexOf(word);doc[field].push({start:at,end:at+word.length});const p=prepareOfflineLanguage(doc);const start=p.text.indexOf('is');assert.deepEqual(mapOfflineIssues(doc,p,[{...issue(p,'is'),start,end:start+2}],'grammar'),[],field+' '+word);}
 const d=make('The reports is available.'),p=prepareOfflineLanguage(d);d.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(mapOfflineIssues(d,p,[issue(p,'is')],'grammar'),[]);
});
test('quotes running headings and name contexts stay separate from language evidence',()=>{
 for(const text of ['The title "The reports is available." applies.',"The title 'The reports is available.' applies.",'ASSEMBLY BILL No. 9998\nThe people do enact as follows:\nline 1 The reports are available.']){const p=prepareOfflineLanguage(make(text));assert.ok(!p.text.includes('reports is'));assert.ok(!p.text.includes('ASSEMBLY BILL'));}
});
test('printed data-processing candidates require complete direct source role proof',()=>{
 for(const head of ['program','system','practices','policies','agreement']){const d=make('The agency requires a data processing '+head+'.'),p=prepareOfflineLanguage(d),mapped=mapOfflineIssues(d,p,[issue(p,'data processing','style',head)],'style');assert.equal(mapped.length,1);const results=jointStylisticIssues(d,refs,{engineIssues:mapped}).filter(i=>i.suggestion==='data-processing');assert.equal(results.length,1,head);assert.equal(results[0].guideId,'lcb');assert.ok(results[0].references.some(r=>r.guideId==='lcb'&&r.guidePage===10));}
});
test('unknown engine rules invalid offsets apparent titles and incomplete attachments cannot add findings',()=>{
 const d=make('The agency requires a data processing program.'),p=prepareOfflineLanguage(d),raw=issue(p,'data processing','style');
 for(const bad of [{...raw,start:-1},{...raw,end:p.text.length+1},{...raw,evidenceStart:raw.end},{...raw,engineRule:'UNKNOWN'},{...raw,head:'Program'},{...raw,headStart:raw.headStart+1}])assert.deepEqual(mapOfflineIssues(d,p,[bad],'style'),[]);
 const x=make('The reports is available.'),q=prepareOfflineLanguage(x);assert.deepEqual(mapOfflineIssues(x,q,[{...issue(q,'is'),engineRule:'COMMA_PERIOD_CONFUSION'}],'grammar'),[]);
});
test('hard splits stay bounded without splitting a surrogate pair or inventing sentence completeness',()=>{
 const p=prepareOfflineLanguage(make('a'.repeat(10999)+'😀'+'b'.repeat(12000)+'. The reports is available.'));
 assert.ok(p.chunks.length>=3);assert.ok(p.chunks.every(c=>c.text.length<=11000&&!/[\uD800-\uDBFF]$/.test(c.text)));assert.equal(p.chunks.map(c=>c.text).join(''),p.text);assert.equal(p.chunks[0].completeEnd,false);assert.equal(p.chunks[1].completeStart,false);
});
test('malformed PDF font code units cannot crash engines or establish positive sentence evidence',()=>{
 const doc=make('A symbol \uDC81 remains. The reports is available. 😀'),source=doc.text,p=prepareOfflineLanguage(doc);
 assert.ok(!/[\uD800-\uDFFF]/u.test(p.text));assert.ok(p.text.includes('😀'));assert.equal(doc.text,source);
 const raw=issue(p,'is');raw.evidenceStart=p.text.indexOf('The reports');assert.equal(mapOfflineIssues(doc,p,[raw],'grammar').length,1);
 raw.evidenceStart=0;assert.deepEqual(mapOfflineIssues(doc,p,[raw],'grammar'),[]);
 for(const symbol of ['\uD800','\uDC00']){const x=make('The reports '+symbol+' is available.'),q=prepareOfflineLanguage(x);assert.ok(!/[\uD800-\uDFFF]/u.test(q.text));assert.deepEqual(mapOfflineIssues(x,q,[issue(q,'is')],'grammar'),[]);}
});
test('merged engine grammar preserves local corrections and stable ordering',()=>{
 const local=[{start:12,end:14,message:'Local',suggestion:'are'}],added=[{start:12,end:14,message:'Engine',suggestion:'are'},{start:4,end:7,message:'Other',suggestion:'has'}];const merged=mergeOfflineGrammar(local,added);assert.deepEqual(merged.map(i=>[i.id,i.message]),[[0,'Other'],[1,'Local']]);assert.equal(local[0].id,undefined);
});
test('fewer-less grammar protects legal numeric thresholds and financial subtraction contexts',()=>{
 for(const text of ['This paragraph shall not apply to any development of 10 units or less.','School districts have an average class enrollment of 24 pupils or less.','All revenues, less refunds, are deposited into the fund.','Programs are funded for 20 units or less of ADA.']){const doc=make(text),p=prepareOfflineLanguage(doc),raw={...issue(p,'less'),engineRule:'FEWER_LESS',suggestion:'fewer'};assert.deepEqual(mapOfflineIssues(doc,p,[raw],'grammar'),[],text);}
 const d=make('The agency received less applications.'),p=prepareOfflineLanguage(d);assert.equal(mapOfflineIssues(d,p,[{...issue(p,'less'),engineRule:'FEWER_LESS',suggestion:'fewer'}],'grammar').length,1);
});
test('engine unavailable failed and cancelled reviews do not silently claim a completed native check',async()=>{
 const doc=make('The reports is available.');assert.ok((await reviewOfflineLanguage(doc,'grammar','missing',{})).warning);assert.ok((await reviewOfflineLanguage(doc,'grammar','failure',{review:async()=>({error:'Unavailable'})})).warning);assert.equal((await reviewOfflineLanguage(doc,'grammar','cancelled',{review:async()=>({cancelled:true})})).cancelled,true);
});
test('runtime parser rules match the source-supported LCB registry',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../engines/language-config.json',import.meta.url)));assert.deepEqual(config.lcbModifiers,OFFLINE_MODIFIERS.map(({engineRule,phrase,preferred})=>({engineRule,phrase,preferred})));
 for(const rule of OFFLINE_MODIFIERS.filter(r=>r.page!==8))assert.ok(refs.lcb.pages[rule.page-1].text.includes(rule.preferred),rule.preferred);
});
test('listed parser modifiers retain exact selections citations and existing-rule precedence',()=>{
 for(const rule of OFFLINE_MODIFIERS)for(const head of ['program','practices','capabilities','criteria']){
  const doc=make('The agency requires '+rule.phrase+' '+head+'.'),p=prepareOfflineLanguage(doc),raw={...issue(p,rule.phrase,'style',head),engineRule:rule.engineRule,suggestion:rule.preferred},mapped=mapOfflineIssues(doc,p,[raw],'style');assert.equal(mapped.length,1,rule.phrase+' '+head);assert.equal(doc.text.slice(mapped[0].start,mapped[0].end),rule.phrase);
  const baseline=jointStylisticIssues(doc,refs).filter(i=>i.start===mapped[0].start&&i.end===mapped[0].end&&i.suggestion===rule.preferred),reviewed=jointStylisticIssues(doc,refs,{engineIssues:mapped}).filter(i=>i.start===mapped[0].start&&i.end===mapped[0].end&&i.suggestion===rule.preferred);assert.equal(reviewed.length,1,rule.phrase+' '+head);assert.equal(reviewed[0].guideId,'lcb');assert.ok(reviewed[0].references.some(r=>r.guideId==='lcb'));if(baseline.length)assert.deepEqual(reviewed[0],baseline[0],'Existing check must retain precedence: '+rule.phrase+' '+head);
 }
});
test('every original sentence cue and connector protects new parser modifiers from source damage',()=>{
 for(const rule of OFFLINE_MODIFIERS)for(const field of ['struck','excluded']){
  const text='The agency requires '+rule.phrase+' capabilities.';
  for(let at=0;at<text.length;at++){const doc=make(text),p=prepareOfflineLanguage(doc);doc[field].push({start:at,end:at+1});const raw={...issue(p,rule.phrase,'style','capabilities'),engineRule:rule.engineRule,suggestion:rule.preferred};assert.deepEqual(mapOfflineIssues(doc,p,[raw],'style'),[],rule.phrase+' '+field+' '+at);}
 }
});

test('complete printed modifier has precedence without an invented prefix or fallback',()=>{
 const d=make('The agency requires non work related capabilities.'),p=prepareOfflineLanguage(d),raw={...issue(p,'non work related','style','capabilities'),engineRule:'LCB_NON_WORK_RELATED_MODIFIER',suggestion:'non-work-related'};
 const baseline=jointStylisticIssues(d,refs);assert.ok(!baseline.some(i=>i.suggestion==='nonwork'));
 const mapped=mapOfflineIssues(d,p,[raw],'style'),reviewed=jointStylisticIssues(d,refs,{engineIssues:mapped});
 assert.equal(reviewed.filter(i=>i.suggestion==='non-work-related').length,1);assert.ok(!reviewed.some(i=>i.suggestion==='nonwork'));
 const full=reviewed.find(i=>i.suggestion==='non-work-related');assert.equal(d.text.slice(full.start,full.end),'non work related');assert.notEqual(full.reviewSuggested,true);assert.ok(full.references.some(r=>r.guidePage===12));
 assert.deepEqual(mapOfflineIssues(d,p,[{...raw,reviewSuggested:true,attachmentMethod:'noun-adjacent-review'}],'style'),[]);
});

test('listed modifier mapping preserves complete partial forms and capitalization',()=>{
 for(const [text,term,preferred]of [
  ['The agency requires a state of-the art instrument.','state of-the art','state-of-the-art'],
  ["The taxpayer filed a water's edge election.","water's edge",'water’s-edge'],
  ['High quality capabilities are required.','High quality','High-quality'],
  ['The agency serves the limited english proficient population.','limited english proficient','limited-English-proficient']
  ,['The agency serves the limited-english-proficient population.','limited-english-proficient','limited-English-proficient']
 ]){
  const rule=OFFLINE_MODIFIERS.find(r=>r.preferred.toLowerCase()===preferred.toLowerCase()),head=text.match(/(instrument|election|capabilities|population)\b/)[0],d=make(text),p=prepareOfflineLanguage(d),raw={...issue(p,term,'style',head),engineRule:rule.engineRule,suggestion:rule.preferred},mapped=mapOfflineIssues(d,p,[raw],'style');
  assert.equal(mapped.length,1,text);assert.equal(mapped[0].suggestion,preferred);assert.equal(d.text.slice(mapped[0].start,mapped[0].end),term);assert.equal(mapped[0].reviewSuggested,false);
 }
});

test('listed modifiers protect source exceptions titles complete forms and body dashes',()=>{
 for(const [text,term,form,head]of [
  ['The agency supports very low income households.','low income','low-income','households'],
  ['The agency supports extremely low income households.','low income','low-income','households'],
  ['The agency requires high—quality capabilities.','high-quality','high-quality','capabilities'],
  ['The agency requires high–quality capabilities.','high-quality','high-quality','capabilities'],
  ['The agency requires high-quality capabilities.','high-quality','high-quality','capabilities'],
  ['The agency requires high-\nquality capabilities.','high- quality','high-quality','capabilities'],
  ['The agency provides a cost-of-\nliving adjustment.','cost-of- living','cost-of-living','adjustment'],
  ['The agency requires High Quality capabilities.','High Quality','high-quality','capabilities'],
 ]){
  const rule=OFFLINE_MODIFIERS.find(r=>r.preferred===form),d=make(text),p=prepareOfflineLanguage(d),raw={...issue(p,term,'style',head),engineRule:rule.engineRule,suggestion:rule.preferred,reviewSuggested:true};assert.deepEqual(mapOfflineIssues(d,p,[raw],'style'),[],text);
 }
});

test('coverage describes exact catalogue witnesses and retired speculative fallbacks',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Offline language engines');assert.ok(row.text.includes('75'));assert.ok(row.text.includes('direct grammatical'));assert.ok(row.text.includes('disabled'));assert.ok(row.text.includes('no adjacent-noun or quotation fallback'));assert.ok(row.text.includes('full-rule'));
});
