import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {CALIFORNIA_ENTITIES}from '../app/data/california-entities.mjs';import {lcbEntityIdentityReviewIssues}from '../app/style-lcb-review-entity-identity.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current'),extra=text=>{const d=doc(text);return lcbEntityIdentityReviewIssues(d,refs,{existingIssues:jointStylisticIssues(d,refs)});};

test('missing and substituted particles have complete bounded snapshot identity review',()=>{
 for(const name of ['Department of California Highway Patrol','Department for the California Highway Patrol','Commissioner of California Highway Patrol']){
  const text='The '+name+' shall act.',found=extra(text);assert.equal(found.length,1,name);assert.equal(found[0].text,name);assert.equal(found[0].suggestion,null);assert.equal(found[0].reviewSuggested,true);assert.equal(found[0].entityMatches[0].name,name.startsWith('Commissioner')?'Commissioner of the California Highway Patrol':'Department of the California Highway Patrol');assert.equal(text.slice(found[0].start,found[0].end),name);
 }
});

test('singular plural and transposed distinctive wording retain exact local-list witnesses',()=>{
 for(const name of ['Department of Consumer Affair','Department of Consumers Affairs','Department of Affairs Consumer','Legislative Attorney’s Office','State Department of State Hospital']){const found=extra('The '+name+' shall act.');assert.equal(found.length,1,name);assert.equal(found[0].text,name);assert.equal(found[0].suggestion,null);assert.ok(found[0].entityMatches[0].citation);assert.ok(CALIFORNIA_ENTITIES.entries.some(e=>e.name===found[0].entityMatches[0].name&&e.citation===found[0].entityMatches[0].citation));}
});

test('all exact eligible registered names remain clear with capitalization left to existing method',()=>{
 for(const entry of CALIFORNIA_ENTITIES.entries.filter(e=>e.checkEligible)){assert.equal(lcbEntityIdentityReviewIssues(doc('The '+entry.name+' shall act.'),refs).length,0,entry.name);assert.equal(lcbEntityIdentityReviewIssues(doc('The '+entry.name.toLowerCase()+' shall act.'),refs).length,0,entry.name+' case');}
 const found=jointStylisticIssues(doc('The department of consumer affairs shall act.'),refs);assert.ok(found.some(i=>i.checkId==='california-entities'&&i.suggestion==='Department of Consumer Affairs'));
});

test('unknown generic short and distant institutional names do not become missing-list errors',()=>{
 for(const text of ['A reporting commission shall retain records.','The California Imaginary Services Agency shall act.','The Imaginary Department of Consumer Affairs shall act.','The Department for Imaginary Services shall act.','The commissioner shall act.','The state agency shall act.','The California Unknown Public Ideas Department shall act.','All California students attending public community colleges and universities shall receive assistance.','Public community colleges and universities shall report annually.'])assert.equal(lcbEntityIdentityReviewIssues(doc(text),refs).length,0,text);
});

test('longer subordinate and extended official names retain their different identity',()=>{
 for(const name of ['Department of Consumer Affairs Advisory Committee','Department of Consumer Affairs Foundation','Department of California Highway Patrol Advisory Committee','Department of California Highway Patrol Foundation','Legislative Attorney’s Office Foundation','California State Auditor’s Office Advisory Committee'])assert.equal(lcbEntityIdentityReviewIssues(doc('The '+name+' shall act.'),refs).length,0,name);
});

test('explicit creation rename and full-name definition protect only the relevant named entity',()=>{
 for(const text of ['The Department of Community Affairs is established.','There is hereby established the Department of Community Affairs.','The California Housing Finance Bureau is created.','The Department of Community Affairs is renamed the Department of Local Reporting.','“Department of Community Affairs” means the entity established by this section. The Department of Community Affairs shall act.','The act establishes the Department of Community Affairs. The Department of Community Affairs shall act.'])assert.equal(lcbEntityIdentityReviewIssues(doc(text),refs).length,0,text);
 for(const text of ['The Department of California Highway Patrol establishes procedures.','The Department of California Highway Patrol establishes the Office of Traffic Assistance.','The Department of California Highway Patrol contains a newly established Office of Traffic Assistance.','“Office” means a reporting body. The Department of California Highway Patrol shall act.']){const found=lcbEntityIdentityReviewIssues(doc(text),refs);assert.ok(found.some(i=>i.text==='Department of California Highway Patrol'),text);}
});

test('source quotes headings tables and original word boundaries stay protected',()=>{
 for(const text of ['The term “Department of California Highway Patrol” is literal.','The term ‘Department of California Highway Patrol’ is literal.','The term \'Department of California Highway Patrol\' is literal.','Department of California Highway Patrol................30','Department of California Highway Patrol\nLEGISLATIVE COUNSEL’S DIGEST\nThe bill applies.','αDepartment of California Highway Patrol shall act.','Department of California Highway Patrolα shall act.'])assert.equal(lcbEntityIdentityReviewIssues(doc(text),refs).length,0,text);
});

test('every original name word and connecting span is intact evidence',()=>{
 const text='The Department for the California Highway Patrol shall act.';
 for(const fragment of ['Department','for','the California','Highway','Patrol']){const d=doc(text),start=d.text.indexOf(fragment);d.struck=[{start,end:start+fragment.length}];assert.equal(lcbEntityIdentityReviewIssues(d,refs).length,0,fragment);}
 const d=doc(text),start=d.text.indexOf(' for ');d.excluded.push({start,end:start+5});assert.equal(lcbEntityIdentityReviewIssues(d,refs).length,0);
});

test('recognized line and page word divisions retain the full original institutional name',()=>{
 const d=makeDocument(['The Depart-','AB 192 — 2 —\nline 1 ment of California Highway Patrol shall act.'],'Current',[],[],new Set(['department'])),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const found=lcbEntityIdentityReviewIssues(d,refs);assert.equal(found.length,1);assert.equal(found[0].text,'Depart-\nAB 192 — 2 —\nline 1 ment of California Highway Patrol');assert.equal(d.text.slice(found[0].start,found[0].end),found[0].text);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(lcbEntityIdentityReviewIssues(d,refs).length,0);
});

test('registry snapshot metadata and explicit ambiguity never assert a replacement',()=>{
 const [issue]=extra('The Legislative Attorney’s Office shall act.');assert.equal(issue.entitySource.file,'California Entities.docx');assert.match(issue.entitySource.sha256,/^[a-f0-9]{64}$/);assert.ok(issue.message.includes('historical names'));assert.ok(issue.message.includes('does not establish an error'));assert.equal(issue.references[0].preferred,null);assert.equal(issue.references[0].ruleText,'Verify entities with the California Entities list on the OLC Intranet.');
});
