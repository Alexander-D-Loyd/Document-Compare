import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {prepareOfflineLanguage,mapOfflineIssues}from '../app/offline-language.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {mixedCountListReviewIssues}from '../app/style-mixed-count-lists.mjs';
const model=JSON.parse(fs.readFileSync(new URL('./fixtures/mixed-count-model.json',import.meta.url))),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),id='lcb-mixed-count-list-review',clone=x=>structuredClone(x);
function run(row,doc=makeDocument([row.text],'Current')){const plan=prepareOfflineLanguage(doc);assert.equal(plan.text,row.text);const saved=JSON.stringify(doc),mapped=mapOfflineIssues(doc,plan,clone(row.issues),'style'),all=jointStylisticIssues(doc,refs,{engineIssues:mapped,includeReviewSuggestions:true});assert.equal(JSON.stringify(doc),saved);return {doc,plan,mapped,all,found:all.filter(i=>i.checkId===id)};}
test('a complete comma/conjunction list supplies one conditional question with all quantities and witnesses',()=>{
 for(const k of [0,7,14,18]){const {doc,mapped,found}=run(model.rows[k]);assert.ok(mapped.length>=1);assert.equal(found.length,1);const i=found[0];assert.equal(i.suggestion,null);assert.equal(i.confidence,'Review Suggested');assert.ok(i.message.includes('uncertain apposition'));assert.ok(i.references.every(r=>r.preferred===null));assert.equal(i.mixedCountListEvidence.members.length,k===7?4:3);for(const r of [...i.mixedCountListEvidence.counts,...i.mixedCountListEvidence.paths.flat(),...i.mixedCountListEvidence.markers.flat()]){assert.equal(doc.text.slice(r.start,r.end),r.text);assert.equal(doc.text.slice(r.headStart,r.headEnd),r.headText);}for(const m of i.mixedCountListEvidence.members)assert.equal(doc.text.slice(m.start,m.end),m.sourceText);assert.equal(jointStylisticIssues(doc,refs,{engineIssues:mapped}).filter(i=>i.checkId===id).length,0);}
});
test('unfinished lists, ordinary apposition, distinct clauses, units and unsupported per-unit qualifiers stay protected',()=>{
 for(const k of [8,9,10,11,12,13,15])assert.equal(run(model.rows[k]).found.length,0,model.rows[k].text);
});
test('every character of the original list sentence protects unknown exclusions and strikes, including unused member text',()=>{
 const row=model.rows[0],base=run(row);for(const field of ['struck','excluded'])for(let at=0;at<base.doc.text.length;at++){const d=makeDocument([row.text],'Current');d[field].push({start:at,end:at+1});assert.equal(mapOfflineIssues(d,base.plan,clone(row.issues),'style').length,0,field+' '+at);}
});
test('all list members and separators are mandatory; source-correct endpoints cannot repair a missing interior role',()=>{
 const row=model.rows[7],{doc,plan}=run(row),mutations=[p=>p.members.splice(1,1),p=>p.counts.splice(1,1),p=>p.paths.splice(1,1),p=>p.markers.splice(1,1),p=>p.separators.splice(1,1),p=>p.members[1].sourceText='10',p=>p.paths[2].pop(),p=>p.markers[3][0].dep='punct',p=>p.counts[1].headStart=0,p=>p.paths[1][0].dep='dobj',p=>p.members[2].lemma='unknown',p=>p.separators[1].end++,p=>p.separators[1].text=' and ',p=>p.members[1]=null,p=>p.paths[1]=null,p=>p.counts[1]=null];for(const mutate of mutations){const i=clone(row.issues[0]);mutate(i.mixedCountListEvidence);assert.equal(mapOfflineIssues(doc,plan,[i],'style').length,0);}
});
test('the full final conjunction witness is required and cannot be replaced by earlier comma evidence',()=>{
 const row=model.rows[0],{doc,plan}=run(row),i=clone(row.issues[0]),proof=i.mixedCountListEvidence;proof.markers.at(-1)[0]=clone(proof.markers[1][0]);assert.equal(mapOfflineIssues(doc,plan,[i],'style').length,0);
});
test('selected count/peer must be actual members, with a complete validated count and matching role',()=>{
 const row=model.rows[0],{doc,plan}=run(row);for(const delta of [{suggestion:'2'},{conditionalSuggestion:'3'},{peerStart:0},{headLemma:'child'},{engine:'LanguageTool'},{reviewSuggested:false}])assert.equal(mapOfflineIssues(doc,plan,[{...clone(row.issues[0]),...delta}],'style').length,0);
});
test('recognized split noun and known page head retain the entire list and all nested original source coordinates',()=>{
 const row=model.rows[0],d=makeDocument(['The office shall employ two wo-','AB 192 — 2 —\nline 1 men, 12 men, and 15 children.'],'Current',[],[],new Set(['women'])),header=d.blocks.find(b=>b.text==='AB 192 — 2 —');header.formatting={headerParts:[{start:0,end:header.text.length,anchor:'left'}]};const {found}=run(row,d);assert.equal(found.length,1);const proof=found[0].mixedCountListEvidence;
 for(const r of [...proof.counts,...proof.paths.flat(),...proof.markers.flat()]){assert.equal(d.text.slice(r.start,r.end),r.text);assert.equal(d.text.slice(r.headStart,r.headEnd),r.headText);}for(const s of proof.separators)assert.equal(d.text.slice(s.start,s.end),s.text);
});
test('an identified interior header at a list separator is layout rather than an extra numerical member',()=>{
 const row=model.rows[0],d=makeDocument(['The office shall employ two women,','AB 192 — 2 —\nline 1 12 men, and 15 children.'],'Current'),header=d.blocks.find(b=>b.text==='AB 192 — 2 —');header.formatting={headerParts:[{start:0,end:header.text.length,anchor:'left'}]};const {found}=run(row,d);assert.equal(found.length,1);assert.ok(found[0].mixedCountListEvidence.separators[0].text.includes(header.text));
});
test('existing precise or conditional owners stay first, duplicate peers are collapsed, and corrupt mapped proofs fail safely',()=>{
 const {doc,mapped}=run(model.rows[0]),i=mapped[0];assert.equal(mixedCountListReviewIssues(mapped,doc,refs).length,1);assert.equal(mixedCountListReviewIssues(mapped,doc,refs,{existingIssues:[{start:i.start,end:i.end}]}).length,0);for(const proof of [null,{members:null},{members:[],counts:[],paths:[],markers:[],separators:[]}])assert.equal(mixedCountListReviewIssues([{...i,mixedCountListEvidence:proof}],doc,refs).length,0);
});
test('whole source quotes, digest context and a recognized leader table remain protected',()=>{
 const row=model.rows[0];for(const prefix of ['LEGISLATIVE COUNSEL’S DIGEST\n','The office quotes “']){const text=prefix+row.text+(prefix.includes('quotes')?'”':''),d=makeDocument([text],'Current'),p=prepareOfflineLanguage(d),offset=p.text.indexOf(row.text),visit=x=>{if(Array.isArray(x))return x.map(visit);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,['start','end','headStart','headEnd','peerStart','peerEnd','peerHeadStart','peerHeadEnd','evidenceStart','evidenceEnd'].includes(k)&&Number.isInteger(v)?v+offset:visit(v)]));return x;};assert.equal(mapOfflineIssues(d,p,row.issues.map(visit),'style').length,0);}
 const text=row.text+'........20.',d=makeDocument([text],'Current'),p=prepareOfflineLanguage(d);assert.equal(mapOfflineIssues(d,p,clone(row.issues),'style').length,0);
});
