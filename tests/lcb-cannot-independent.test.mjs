import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {wordChoiceIssues,LCB_CANNOT_MODAL_SCOPE} from '../app/style-word-choice.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=body=>makeDocument(['The people do enact as follows:\nline 1 '+body],'Current');
const owned=i=>i.rule==='Spelling and usage: cannot-negative-modal';
const check=(doc,joint=false)=>{const before=JSON.stringify(doc),found=(joint?jointStylisticIssues(doc,refs):wordChoiceIssues(doc,refs)).filter(owned);assert.equal(JSON.stringify(doc),before);for(const issue of found)assert.equal(doc.text.slice(issue.start,issue.end),issue.text);return found;};
const predicates=['apply','attend','authorize','collect','comply','continue','determine','exceed','grant','issue','obtain','participate','pay','perform','provide','receive','renew','require','submit','use'];

test('all twenty existing finite predicates retain one cannot spelling owner and both actual printed sources',()=>{
 assert.ok(refs.lcb.pages[2].text.includes('cannot'));assert.ok(refs.lcb.pages[8].text.includes('cannot'));
 for(const verb of predicates){const doc=make('The applicant can not '+verb+'.'),found=check(doc);assert.equal(found.length,1,verb);assert.equal(found[0].suggestion,'cannot');assert.equal(found[0].text,'can not');assert.deepEqual(found[0].references.map(r=>r.guidePage),[3,9]);assert.ok(!found[0].message.includes('expresses inability or prohibition'));assert.equal(check(make('The applicant cannot '+verb+'.')).length,0);}
 const doc=make('The applicant can not submit the form.'),found=check(doc,true);assert.equal(found.length,1);assert.ok(found[0].references.every(r=>r.sourcePassage?.text.includes('cannot')));assert.match(LCB_CANNOT_MODAL_SCOPE,/No unfamiliar/);
});

test('the only added predicate act requires a complete intact selected subject and terminal clause',()=>{
 for(const body of ['The agency can not act.','The board can not act;','The court can not act.','The applicant can not act.'])assert.equal(check(make(body),true).length,1,body);
 for(const body of ['can not act.','The novel can not act.','A person can not act.','The Agency can not act.','The agency can not Act.','The agency can not act upon the proposal.','The agency can not act-form.','The agency can not action.','The agency can not actα.','The unknown agency can not act.','The agency can not disclose the records.'])assert.equal(check(make(body)).length,0,body);
});

test('alternative, correlative and optional-action original wording stays protected even when its cue is masked',()=>{
 for(const body of ['The applicant can not only submit the form.','The applicant can not submit but instead retain the form.','The applicant can not submit or retain the form.','The applicant can not attend and still qualify.','The applicant can not attend if they choose.','The applicant can not attend if he prefers.','The applicant can not merely attend the hearing.','The applicant can not attend optionally.'])assert.equal(check(make(body),true).length,0,body);
 for(const [body,cue] of [['The applicant can not submit but instead retain the form.','but'],['The applicant can not submit or retain the form.','or'],['The applicant can not attend and still qualify.','still'],['The applicant can not attend if they choose.','choose'],['The applicant can not attend optionally.','optionally']])for(const field of ['struck','excluded']){const doc=make(body),start=doc.text.indexOf(cue);doc[field].push({start,end:start+cue.length});assert.equal(check(doc).length,0,body+' '+field);}
});

test('original double and single instructional quotation marks cannot manufacture can not eligibility when damaged',()=>{
 for(const marks of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const doc=make('The instruction shall insert '+marks[0]+'the applicant can not submit the form'+marks[1]+'.');assert.equal(check(doc,true).length,0);
  for(const field of ['struck','excluded'])for(const at of [doc.text.indexOf(marks[0]),doc.text.lastIndexOf(marks[1])]){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(check(bad,true).length,0,field+' '+marks.join(''));}
 }
 const quoted=make('“can not” means the exact term. The applicant can not submit the form.');assert.equal(check(quoted,true).length,0);assert.equal(check(make('The applicant can not submit the form.'),true).length,1,'Quoted authority must reset with the bill');
});

test('complete existing predicate evidence and new act subject cannot be fabricated from missing body characters',()=>{
 for(const body of ['The applicant can not submit the form.','The agency can not act.']){
  const doc=make(body),issue=check(doc)[0];assert.ok(issue);
  for(const field of ['struck','excluded'])for(let at=issue.evidenceStart;at<issue.evidenceEnd;at++){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(check(bad).length,0,field+' '+body+' '+at);}
 }
 for(const [body,cue] of [['The agency unknown can not act.','unknown'],['The applicant can unrelated not submit the form.','unrelated'],['The applicant can not unrelated submit the form.','unrelated']])for(const field of ['struck','excluded']){const doc=make(body),start=doc.text.indexOf(cue);doc[field].push({start,end:start+cue.length});assert.equal(check(doc).length,0,body);}
 for(const body of ['The applicant can not submitα.','The applicant can not submit-form.','The applicant can not submit.1.'])assert.equal(check(make(body)).length,0,body);
 const table=make('The applicant can not submit the form.');table.blocks.at(-1).formatting={headerGaps:[1,2]};assert.equal(check(table).length,0);
});

test('recognized physical page and margin divisions retain exact original can not and supporting act ranges',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The agency can','AB 224 — 2 —\nline 1 not act.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const found=check(doc,true);assert.equal(found.length,1);assert.equal(found[0].suggestion,'cannot');assert.ok(found[0].text.includes('\n'));assert.equal(doc.text.slice(found[0].evidenceStart,found[0].evidenceEnd).replace(/\s+/gu,' ').includes('The agency'),true);
 const missing=structuredClone(doc);missing.blocks.find(b=>b.text==='AB 224 — 2 —').formatting={};missing.blocks.find(b=>b.text==='AB 224 — 2 —').runningHead=false;missing.blocks.find(b=>b.text==='AB 224 — 2 —').layoutLabel=false;assert.equal(check(missing,true).length,0);
});
