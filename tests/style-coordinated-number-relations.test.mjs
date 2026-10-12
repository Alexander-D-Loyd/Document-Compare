import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {prepareOfflineLanguage,mapOfflineIssues}from '../app/offline-language.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {coordinatedNumberRelationReviewIssues,COORDINATED_NUMBER_RELATION_RULE}from '../app/style-coordinated-number-relations.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/coordinated-count-model.json',import.meta.url))),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const clone=x=>structuredClone(x),id='lcb-coordinated-number-relation-review';
function run(row,doc=makeDocument([row.text],'Current')){const plan=prepareOfflineLanguage(doc);assert.equal(plan.text,row.text);const mapped=mapOfflineIssues(doc,plan,clone(row.issues),'style'),all=jointStylisticIssues(doc,refs,{engineIssues:mapped,includeReviewSuggestions:true});return {doc,plan,mapped,all,findings:all.filter(i=>i.checkId===id)};}
test('different nominal head coordination yields conditional questions with complete role witnesses',()=>{
 for(const [n,row]of fixture.rows.slice(0,6).entries()){const {doc,mapped,findings}=run(row);assert.equal(mapped.length,n===5?2:1);assert.equal(findings.length,n===5?2:1);for(const i of findings){assert.equal(i.suggestion,null);assert.equal(i.confidence,'Review Suggested');assert.ok(i.message.includes('does not prove meaning'));assert.ok(i.references.every(r=>r.preferred===null));for(const r of [...i.coordinationEvidence.counts,...i.coordinationEvidence.paths.flat(),...i.coordinationEvidence.markers.flat()]){assert.equal(doc.text.slice(r.start,r.end),r.text);assert.equal(doc.text.slice(r.headStart,r.headEnd),r.headText);}}
 assert.equal(jointStylisticIssues(doc,refs,{engineIssues:mapped}).filter(i=>i.checkId===id).length,0);}
});
test('different quantity classes remain questions, while known time, legal, rate and separate-clause controls stay protected',()=>{
 for(const n of [6,7,8,11,12,13,15])assert.equal(run(fixture.rows[n]).findings.length,0,fixture.rows[n].text);
 for(const n of [9,10]){const found=run(fixture.rows[n]).findings;assert.equal(found.length,1);assert.equal(found[0].suggestion,null);}
});
test('complete counts cannot turn a small suffix, decimal, fraction, signed expression or numeral word fragment into a selection',()=>{
 const base=fixture.rows[0];
 for(const [from,to]of [['two','twenty two'],['two','minus two'],['two','twofold'],['10','-10'],['10','10.5'],['10','10/15'],['10','10%'],['10','10α']]){
  const text=base.text.replace(from,to),d=makeDocument([text],'Current'),p=prepareOfflineLanguage(d),raw=clone(base.issues[0]),delta=to.length-from.length,at=base.text.indexOf(from);
  // Preserve deliberately partial token selections while moving subsequent
  // witnesses; the independent whole-expression guard must reject them.
  const shift=x=>x>at?x+delta:x,visit=x=>{if(Array.isArray(x))return x.map(visit);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,['start','end','headStart','headEnd','peerStart','peerEnd','peerHeadStart','peerHeadEnd','evidenceStart','evidenceEnd'].includes(k)&&Number.isInteger(v)?shift(v):visit(v)]));return x;};
  const bad=visit(raw);if(from==='two'){bad.start=p.text.indexOf('two');bad.end=bad.start+3;bad.coordinationEvidence.counts[0].start=bad.start;bad.coordinationEvidence.counts[0].end=bad.end;}else {bad.peerStart=p.text.indexOf('10');bad.peerEnd=bad.peerStart+2;bad.coordinationEvidence.counts[1].start=bad.peerStart;bad.coordinationEvidence.counts[1].end=bad.peerEnd;}
  assert.equal(mapOfflineIssues(d,p,[bad],'style').length,0,text);
 }
});
test('every source sentence character protects strikes and unknown exclusions including bridge whitespace',()=>{
 const row=fixture.rows[4],base=run(row);for(const field of ['struck','excluded'])for(let at=0;at<base.doc.text.length;at++){const d=makeDocument([row.text],'Current');d[field].push({start:at,end:at+1});assert.equal(mapOfflineIssues(d,base.plan,clone(row.issues),'style').length,0,field+' '+at);}
});
test('missing, forged, detached or cyclic coordination proof is rejected without a replacement',()=>{
 const row=fixture.rows[5],{doc,plan}=run(row),base=row.issues[0],mutations=[i=>i.coordinationEvidence=null,i=>i.coordinationEvidence.paths=[],i=>i.coordinationEvidence.counts[0]=null,i=>i.coordinationEvidence.paths[1][0].dep='dobj',i=>i.coordinationEvidence.paths[1][0].pos='VERB',i=>i.coordinationEvidence.paths[1][0].headStart=i.coordinationEvidence.paths[1][0].start,i=>i.coordinationEvidence.paths[1].push(clone(i.coordinationEvidence.paths[1][0])),i=>i.coordinationEvidence.markers[1].pop(),i=>i.coordinationEvidence.markers[1][0].text='but',i=>i.coordinationEvidence.paths[1].at(-1).lemma='invented',i=>i.coordinationEvidence.counts[0].headStart=0,i=>i.peerHeadLemma=i.headLemma,i=>i.suggestion='2',i=>i.conditionalSuggestion='9'];
 for(const mutate of mutations){const i=clone(base);mutate(i);assert.equal(mapOfflineIssues(doc,plan,[i],'style').length,0);}
});
test('each protected unit family independently rejects a syntactically coordinated pair',()=>{
 const row=fixture.rows[8];
 for(const unit of ['day','year','dollar','cent','percent','grade','degree','pound','acre','kilowatt','megabyte','milliliter']){
  const text=row.text.replace('years',unit+'s'),raw=clone(row.issues[0]),delta=unit.length+1-5,oldAt=row.text.indexOf('years'),shift=x=>x>oldAt?x+delta:x;
  const visit=x=>{if(Array.isArray(x))return x.map(visit);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,['start','end','headStart','headEnd','peerStart','peerEnd','peerHeadStart','peerHeadEnd','evidenceStart','evidenceEnd'].includes(k)&&Number.isInteger(v)?shift(v):visit(v)]));return x;};const i=visit(raw);i.head=unit+'s';i.headLemma=unit;
  for(const r of [...i.coordinationEvidence.counts,...i.coordinationEvidence.paths.flat(),...i.coordinationEvidence.markers.flat()]){if(r.text==='years'){r.text=unit+'s';r.lemma=unit;}if(r.headText==='years')r.headText=unit+'s';}
  const d=makeDocument([text],'Current'),p=prepareOfflineLanguage(d);assert.equal(mapOfflineIssues(d,p,[i],'style').length,0,unit);
 }
});
test('recognized word and page divisions restore every noun path, count and coordinator location',()=>{
 const row=fixture.rows[0],doc=makeDocument(['The office shall employ two wo-','AB 192 — 2 —\nline 1 men and 10 men.'],'Current',[],[],new Set(['women'])),header=doc.blocks.find(b=>b.text==='AB 192 — 2 —');header.formatting={headerParts:[{start:0,end:header.text.length,anchor:'left'}]};const {findings}=run(row,doc);assert.equal(findings.length,1);
 for(const r of [...findings[0].coordinationEvidence.counts,...findings[0].coordinationEvidence.paths.flat(),...findings[0].coordinationEvidence.markers.flat()]){assert.equal(doc.text.slice(r.start,r.end),r.text);assert.equal(doc.text.slice(r.headStart,r.headEnd),r.headText);}assert.ok(findings[0].coordinationEvidence.paths[0][0].text.includes(header.text));
});
test('prior precise and reader selections own counts before the new method; duplicate peers do not create duplicate questions',()=>{
 const row=fixture.rows[0],{doc,mapped}=run(row),i=mapped[0];assert.equal(coordinatedNumberRelationReviewIssues([i,i],doc,refs).length,1);assert.equal(coordinatedNumberRelationReviewIssues([i],doc,refs,{existingIssues:[{start:i.start,end:i.end,suggestion:'2'}]}).length,0);
 const result=run(fixture.rows[14]);assert.ok(result.all.some(i=>i.text==='ten'&&i.suggestion==='10'));assert.equal(result.findings.length,1);assert.equal(result.findings[0].text,'two');
});
test('corrupted already-mapped payloads cannot become style findings or crash the checker',()=>{
 const {doc,mapped}=run(fixture.rows[0]),base=mapped[0];for(const mutate of [i=>i.relationshipEvidence=null,i=>i.relationshipEvidence.members[0].value=9,i=>i.coordinationEvidence=null,i=>i.coordinationEvidence.paths[1][0].headText='bad']){const i=clone(base);mutate(i);assert.equal(coordinatedNumberRelationReviewIssues([i],doc,refs).length,0);}
});
test('malformed nested proof stays rejected when a recognized word-division view must restore source locations',()=>{
 const {mapped}=run(fixture.rows[0]),d=makeDocument(['The of-\nfice shall employ two women and 10 men.'],'Current',[],[],new Set(['office']));
 for(const proof of [{counts:null,paths:[],markers:[]},{counts:[null],paths:[null],markers:[]},{counts:[],paths:[],markers:[]}])assert.equal(jointStylisticIssues(d,refs,{engineIssues:[{...mapped[0],coordinationEvidence:proof}],includeReviewSuggestions:true}).filter(i=>i.checkId===id).length,0);
});
