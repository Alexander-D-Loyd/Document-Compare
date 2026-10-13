import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {workerWords}from './helpers/spelling-worker.mjs';import {officialHeadTitleReviewIssues}from '../app/style-official-head-titles.mjs';import {CHECK_COVERAGE}from '../app/style-coverage.mjs';
const words=await workerWords(),doc=text=>makeDocument([text],'Current',[],[],words),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const entity='Department of Finance',named='The director John Smith of the '+entity+' shall act.',creation='The Regional Transportation Accountability Council is hereby established. ';
test('registry-backed head immediately before named person retains complete source phrase and both guide rules',()=>{
 const [i]=officialHeadTitleReviewIssues(doc(named),refs);assert.ok(i);assert.equal(i.text,'director John Smith of the Department of Finance');assert.equal(i.suggestion,null);assert.equal(i.officialHeadEvidence.person,'John Smith');assert.equal(i.officialHeadEvidence.entityName,entity);assert.equal(i.officialHeadEvidence.registry.sourceFile,'California Entities.docx');assert.deepEqual(i.references.map(r=>r.guideId),['lcb','gpo']);assert.ok(i.references.every(r=>r.preferred===null));assert.equal(i.references[1].rule,'3.36');assert.equal(named.slice(i.start,i.end),i.text);
});
test('complete head/entity title immediately preceding person provides the supported alternate order',()=>{
 const text='The executive director of the Department of Finance John Smith shall act.',[i]=officialHeadTitleReviewIssues(doc(text),refs);assert.ok(i);assert.equal(i.text,'executive director of the Department of Finance John Smith');assert.equal(i.officialHeadEvidence.namePosition,'Full head/entity title immediately precedes person');assert.equal(i.officialHeadEvidence.sourcePerson,'John Smith');assert.equal(text.slice(i.officialHeadEvidence.entityStart,i.officialHeadEvidence.entityEnd),entity);
});
test('earlier source-created unfamiliar entity supplies a creation witness without registry or appointment authority',()=>{
 const text=creation+'The executive director Jane Doe of the regional transportation accountability council shall act.',[i]=officialHeadTitleReviewIssues(doc(text),refs);assert.ok(i);assert.equal(i.officialHeadEvidence.witnessKind,'Earlier intact entity creation');assert.equal(i.officialHeadEvidence.creation.name,'Regional Transportation Accountability Council');assert.equal(i.officialHeadEvidence.registry,undefined);assert.equal(text.slice(i.officialHeadEvidence.creation.evidenceStart,i.officialHeadEvidence.creation.evidenceEnd),i.officialHeadEvidence.creation.declarationText);assert.ok(i.message.includes('does not establish'));
});
test('selected role qualifiers and a middle initial retain their entire name and lowercased title words',()=>{
 const text='The acting deputy director John J. Smith of the Department of Finance shall act.',[i]=officialHeadTitleReviewIssues(doc(text),refs);assert.ok(i);assert.equal(i.officialHeadEvidence.person,'John J. Smith');assert.deepEqual(i.officialHeadEvidence.roleEvidence.map(r=>r.text),['acting','deputy','director']);assert.equal(i.text,'acting deputy director John J. Smith of the Department of Finance');
});
test('generic unnamed head titles honor differing guide policy and remain unflagged',()=>{
 for(const text of ['The director of the Department of Finance shall act.','The chairperson of the State Water Resources Control Board shall act.','The president of the University of California shall act.','The director shall act.','The director of the local agency shall act.'])assert.equal(officialHeadTitleReviewIssues(doc(text),refs).length,0,text);
});
test('lowercase all-uppercase incomplete or source-label words do not supply a personal-name cue',()=>{
 for(const text of ['The director program services of the Department of Finance shall act.','The director JOHN SMITH of the Department of Finance shall act.','The director John of the Department of Finance shall act.','The director of the Department of Finance, John Smith, shall act.','The director John Smith Act of the Department of Finance shall act.'])assert.equal(officialHeadTitleReviewIssues(doc(text),refs).length,0,text);
});
test('correct role capitalization and precise full-title corrections retain precedence without concealing entity-only corrections',()=>{
 assert.equal(officialHeadTitleReviewIssues(doc(named.replace('director','Director')),refs).length,0);
 const d=doc(named),at=named.indexOf('director'),body=named.indexOf(entity);assert.equal(officialHeadTitleReviewIssues(d,refs,{existingIssues:[{start:at,end:at+8,suggestion:'Director'}]}).length,0);assert.equal(officialHeadTitleReviewIssues(d,refs,{existingIssues:[{start:body,end:body+entity.length,suggestion:entity}]}).length,1);
 const text='The Executive director John Smith of the Department of Finance shall act.',[i]=officialHeadTitleReviewIssues(doc(text),refs);assert.ok(i);assert.deepEqual(i.officialHeadEvidence.roleEvidence.map(r=>r.text),['director']);
});
test('unknown larger later-only or substantively different entities do not manufacture official titles',()=>{
 for(const text of ['The director John Smith of the Department of Unknown Affordability shall act.','The director John Smith of the Department of Finance Advisory Committee shall act.','The director John Smith of the Department for Finance shall act.','The director John Smith of the Emergency Department of Finance shall act.','The director John Smith of the Regional Transportation Accountability Council shall act. '+creation])assert.equal(officialHeadTitleReviewIssues(doc(text),refs).length,0,text);
});
test('every head connector name and entity character is required as original intact evidence',()=>{
 for(const property of ['struck','excluded'])for(const fragment of ['director','John','Smith',' of the ','Department',' Finance']){const d=doc(named),start=named.indexOf(fragment);d[property]=[{start,end:start+fragment.length}];assert.equal(officialHeadTitleReviewIssues(d,refs).length,0,property+' '+fragment);}
 const text=creation+'The director Jane Doe of the Regional Transportation Accountability Council shall act.';for(const property of ['struck','excluded']){const d=doc(text),start=text.indexOf('is hereby');d[property]=[{start,end:start+9}];assert.equal(officialHeadTitleReviewIssues(d,refs).length,0);}
});
test('quoted table and heading phrases retain source protections',()=>{
 for(const text of ['The report quotes “director John Smith of the Department of Finance”.','The report quotes ‘director John Smith of the Department of Finance’.','director John Smith of the Department of Finance...........20\n'])assert.equal(officialHeadTitleReviewIssues(doc(text),refs).length,0,text);
 const d=doc(named);d.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(officialHeadTitleReviewIssues(d,refs).length,0);
});
test('partial qualifier chains and malformed Unicode or compound-role boundaries stay protected',()=>{
 for(const text of ['The senior acting assistant deputy director John Smith of the Department of Finance shall act.','The deputy-director John Smith of the Department of Finance shall act.','The αdirector John Smith of the Department of Finance shall act.','The director John Smith of the Department of Financeα shall act.'])assert.equal(officialHeadTitleReviewIssues(doc(text),refs).length,0,text);
});
test('divided role and entity words restore all nested source coordinates without altering original text',()=>{
 const text='A require-\nment applies. The direc-\ntor John Smith of the Depart-\nment of Finance shall act.',d=doc(text),before=JSON.stringify(d),[i]=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-official-head-title-review');assert.ok(i);const e=i.officialHeadEvidence;assert.equal(text.slice(i.start,i.end),i.text);assert.equal(text.slice(e.headStart,e.headEnd),e.sourceHead);assert.equal(text.slice(e.entityStart,e.entityEnd),e.sourceEntity);assert.equal(text.slice(e.personStart,e.personEnd),e.sourcePerson);assert.ok(e.sourceHead.includes('direc-\ntor'));assert.ok(e.sourceEntity.includes('Depart-\nment'));for(const r of e.roleEvidence)assert.equal(text.slice(r.start,r.end),r.text);assert.equal(JSON.stringify(d),before);
});
test('divided creation witness and overlapping entity review preserve complete source ranges independently',()=>{
 const text='The Community Transpor-\ntation Council is hereby established. The director Jane Doe of the community transpor-\ntation council shall act.',d=doc(text),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}),i=all.find(i=>i.checkId==='lcb-official-head-title-review');assert.ok(i);assert.ok(all.some(i=>i.checkId==='lcb-created-public-entity-reference-review'));const e=i.officialHeadEvidence;assert.equal(text.slice(e.creation.start,e.creation.end),e.creation.text);assert.equal(text.slice(e.creation.evidenceStart,e.creation.evidenceEnd),e.creation.declarationText);assert.equal(text.slice(e.entityStart,e.entityEnd),e.sourceEntity);assert.ok(e.sourceEntity.includes('transpor-\ntation'));
});
test('method coverage and frozen baseline flag describe reader dependence and preserve independent precise results',()=>{
 const d=doc(named),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.ok(all.some(i=>i.checkId==='lcb-official-head-title-review'));assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeOfficialHeadReview:false}).filter(i=>i.checkId==='lcb-official-head-title-review').length,0);assert.ok(CHECK_COVERAGE.some(c=>c.title==='Named officials in complete entity titles'&&c.text.includes('GPO3.37')));
});
