import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {workerWords}from './helpers/spelling-worker.mjs';
import {createdPublicEntityRecords,createdPublicEntityCreationIssues,createdPublicEntityReferenceIssues,createdPublicEntityProtectionRanges}from '../app/style-created-public-entities.mjs';
import {CHECK_COVERAGE}from '../app/style-coverage.mjs';
const words=await workerWords(),doc=text=>makeDocument([text],'Current',[],[],words),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const clause='The Regional Transportation Accountability Council is hereby established. ',tail='Funding shall support the regional transportation accountability council.';
test('intact public-entity creation forms retain whole names and complete witnesses',()=>{
 for(const [text,name]of [[clause,'Regional Transportation Accountability Council'],['There is hereby created the Office of Regional Transportation.','Office of Regional Transportation'],['There is established, within the Department of Regional Services, the Office of Health Care Affordability.','Office of Health Care Affordability'],['There is hereby established the Public Transportation Authority within the Department of Regional Services.','Public Transportation Authority'],['The Department of Regional Services is created within the Public Transportation Agency.','Department of Regional Services']]){const [r]=createdPublicEntityRecords(doc(text));assert.ok(r,text);assert.equal(r.name,name);assert.equal(text.slice(r.start,r.end),r.text);assert.equal(text.slice(r.evidenceStart,r.evidenceEnd),r.declarationText);assert.equal(r.sourceKind,'Document-local public-entity creation');}
});
test('later lowercased complete names receive full source-backed null-suggestion review',()=>{
 const text=clause+tail,[i]=createdPublicEntityReferenceIssues(doc(text),refs);assert.ok(i);assert.equal(i.text,'regional transportation accountability council');assert.equal(i.suggestion,null);assert.equal(i.rule,'Capitalization, item 1');assert.equal(i.titleCaseEvidence.length,4);assert.equal(text.slice(i.titleWitness.start,i.titleWitness.end),i.titleWitness.text);assert.equal(i.titleWitness.name,'Regional Transportation Accountability Council');assert.ok(i.references.every(r=>r.preferred===null&&r.rule==='Capitalization, item 1'));
});
test('lowercased creation names are reviewable but cannot supply preferred capitalization to later uses',()=>{
 const text='The Regional transportation Accountability Council is hereby established. '+tail,d=doc(text),[i]=createdPublicEntityCreationIssues(d,refs);assert.ok(i);assert.equal(i.suggestion,null);assert.equal(i.text,'Regional transportation Accountability Council');assert.equal(createdPublicEntityReferenceIssues(d,refs).length,0);assert.ok(createdPublicEntityCreationIssues(doc('The Clean-energy Transportation Council is hereby established.'),refs).length);assert.ok(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).some(i=>i.checkId==='lcb-created-public-entity-creation-review'));
});
test('generic bodies and merely possible past continued or incomplete creation wording remain clear',()=>{
 for(const text of ['The advisory council is hereby established.','The local public agency is established.','The Office of Regional Services was established.','The Office of Regional Services may be established.','The Office of Regional Services shall be established.','The Office of Regional Services is continued.','The Office of Regional Services is hereby established to provide services.','There is hereby established within the department a program to serve the public.','The funds of the Regional Transportation Council are established.'])assert.equal(createdPublicEntityRecords(doc(text)).length,0,text);
});
test('digest historical conditional quoted and instructional creation clauses are not witnesses',()=>{
 for(const text of ['LEGISLATIVE COUNSEL’S DIGEST\n'+clause+'The people do enact as follows:\n'+tail,'The previous statute provides '+clause+tail,'If funding is available, '+clause+tail,'The report states “'+clause.trim()+'” '+tail,'The report quotes ‘'+clause.trim()+'’ '+tail,'Insert: '+clause+tail])assert.equal(createdPublicEntityRecords(doc(text)).length,0,text);
});
test('every establishing title and creation-predicate character must remain intact',()=>{
 const text=clause+tail;for(const property of ['struck','excluded'])for(const fragment of ['The','Regional',' ','Transportation','Council','is hereby','established']){const d=doc(text),start=text.indexOf(fragment);d[property]=[{start,end:start+fragment.length}];assert.equal(createdPublicEntityRecords(d).length,0,property+' '+fragment);assert.equal(createdPublicEntityReferenceIssues(d,refs).length,0);}
 for(const d of [doc(clause+tail),doc(clause+tail)]){d.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(createdPublicEntityRecords(d).length,0);}
});
test('source table creation and Unicode partial names cannot manufacture name evidence',()=>{
 for(const text of ['The Regional Transportation Council is hereby established........20\n'+tail,'αThe Regional Transportation Council is hereby established. '+tail,'The Regional Transportation Councilα is hereby established. '+tail])assert.equal(createdPublicEntityRecords(doc(text)).length,0,text);
});
test('earlier larger different historical renamed and quoted later names remain protected',()=>{
 for(const name of ['regional transportation accountability','emergency regional transportation accountability council','regional transportation accountability council advisory committee','regional transportation advisory council'])assert.equal(createdPublicEntityReferenceIssues(doc(clause+'Funding shall support the '+name+'.'),refs).length,0,name);
 for(const text of [tail+' '+clause,clause+'The old statute named the regional transportation accountability council.',clause+'The Regional Transportation Accountability Council is renamed the Public Safety Council. '+tail,clause+'The report quotes “regional transportation accountability council”.'])assert.equal(createdPublicEntityReferenceIssues(doc(text),refs).length,0,text);
});
test('conflicting capitalization witnesses and damaged later references cannot establish preference',()=>{
 assert.equal(createdPublicEntityReferenceIssues(doc(clause+'The Regional transportation Accountability Council is hereby established. '+tail),refs).length,0);
 for(const property of ['struck','excluded']){const d=doc(clause+tail),start=d.text.lastIndexOf('transportation');d[property]=[{start,end:start+14}];assert.equal(createdPublicEntityReferenceIssues(d,refs).length,0);}
 const d=doc(clause+tail),start=d.text.lastIndexOf('transportation');assert.equal(createdPublicEntityReferenceIssues(d,refs,{existingIssues:[{start,end:start+14,suggestion:'Transportation'}]})[0].titleCaseEvidence.length,3);
});
test('intact grammatical hyphens and genuine PDF word divisions retain complete original evidence',()=>{
 const text='The Clean-Energy Transportation Council is hereby established. Funding shall support the Clean-energy Transportation Council.',[i]=createdPublicEntityReferenceIssues(doc(text),refs);assert.ok(i);assert.equal(i.titleCaseEvidence[0].canonical,'Energy');assert.equal(text.slice(i.titleCaseEvidence[0].start,i.titleCaseEvidence[0].end),'energy');
 const wrapped='The Community Transpor-\ntation Council is hereby established. Funding shall support the community transpor-\ntation council.',d=doc(wrapped),before=JSON.stringify(d),[r]=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-created-public-entity-reference-review');assert.ok(r);assert.equal(wrapped.slice(r.start,r.end),r.text);assert.equal(wrapped.slice(r.titleWitness.start,r.titleWitness.end),r.titleWitness.text);assert.equal(wrapped.slice(r.titleWitness.evidenceStart,r.titleWitness.evidenceEnd),r.titleWitness.declarationText);assert.equal(JSON.stringify(d),before);
});
test('source names protect contained lexical guesses while precise unrelated checks remain eligible',()=>{
 const text='The Data Sharing Accountability Council is hereby established. Funding shall support the data sharing accountability council. A data sharing agreement applies.',d=doc(text),start=text.indexOf('data sharing'),engine={start,end:start+12,text:'data sharing',engineRule:'LCB_DATA_SHARING_MODIFIER',suggestion:'data-sharing'};
 assert.ok(createdPublicEntityProtectionRanges(d,refs).some(r=>r.start<=start&&r.end>=engine.end));const all=jointStylisticIssues(d,refs,{engineIssues:[engine],includeReviewSuggestions:true});assert.ok(all.some(i=>i.checkId==='lcb-created-public-entity-reference-review'));assert.equal(all.filter(i=>i.start===start&&i.suggestion==='data-sharing').length,0);assert.ok(all.some(i=>i.text==='data sharing'&&i.start>engine.end));
});
test('desktop method coverage and a frozen comparison baseline expose exact scope',()=>{
 const text=clause+tail,d=doc(text);assert.ok(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).some(i=>i.checkId==='lcb-created-public-entity-reference-review'));assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeCreatedPublicEntities:false}).filter(i=>i.checkId?.startsWith('lcb-created-public-entity-')).length,0);assert.ok(CHECK_COVERAGE.some(c=>c.title==='Source-created departments and agencies'&&c.page===17&&c.text.includes('do not update')));
});
