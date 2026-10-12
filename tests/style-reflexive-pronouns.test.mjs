import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {REFLEXIVE_FORMS} from '../app/style-reflexive-pronouns.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>jointStylisticIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs).filter(i=>i.checkId==='reflexive-pronouns');

test('listed reflexive pronouns are joined only within recognized constructions',()=>{
 for(const [variant,preferred] of REFLEXIVE_FORMS){
  const doc=makeDocument(['Act by '+variant+'.'],'Current');const found=check(doc);assert.equal(found.length,1,variant);assert.equal(found[0].suggestion,preferred);assert.equal(found[0].references[0].rule,'6.13');assert.equal(doc.text.slice(found[0].start,found[0].end),variant);
  assert.equal(check('Act by '+preferred+'.').length,0);
 }
 assert.equal(check('The person shall identify him self as the applicant.').length,1);
 assert.equal(check('A person may protect her self from harm.').length,1);
});

test('literal and nonpronoun self uses, titles, tables, headings and strikeouts stay protected',()=>{
 for(const text of ['A person has one self.','Protect her self assessment records.','The term “act by him self” is literal.','Self: her self is a definition.','Act by Him Self Trust.','The person shall represent the self.','The report identifies a concept of self.','Budget Act of 2026\nAct by him self................... 1000','Act by him self.\nLEGISLATIVE COUNSEL’S DIGEST\nAn act.\nThe people do enact as follows:\nA rule applies.'])assert.equal(check(text).length,0,text);
 const text='Act by him self.';const doc=makeDocument([text],'Current');doc.struck=[{start:0,end:text.length}];assert.equal(check(doc).length,0);
});

test('wrapped pronouns retain original text offsets',()=>{
 const doc=makeDocument(['line 1 The person must identify him\nline 2 self as an applicant.'],'Current');const found=check(doc);assert.equal(found.length,1);assert.equal(found[0].suggestion,'himself');assert.equal(found[0].text,doc.text.slice(found[0].start,found[0].end));
});

test('matching explicit pronoun subjects support selected emphatic roles',()=>{
 const cases=[['She her self is responsible.','herself'],['He him self shall act.','himself'],['It it self has an effect.','itself'],['I my self am responsible.','myself'],['We our selves are responsible.','ourselves'],['They them selves may apply.','themselves'],['Thou thy self art responsible.','thyself'],['You your self are responsible.','yourself'],['You your selves must act.','yourselves']];
 for(const [text,wanted] of cases){const doc=makeDocument([text],'Current'),found=check(doc);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,wanted);assert.match(found[0].message,/matching explicit pronoun subject/);assert.equal(found[0].text,doc.text.slice(found[0].start,found[0].end));assert.equal(found[0].guidePage,114);assert.equal(check(text.replace(found[0].text,wanted)).length,0);}
 assert.equal(check('The board shall act; (a) she her self may apply.').length,1);
 assert.equal(check('The rule is as follows: we our selves must act.').length,1);
});

test('emphatic pronoun checks protect uncertain subjects, noun selves and literal contexts',()=>{
 for(const text of ['She him self shall act.','He her self shall act.','I our selves shall act.','We my self shall act.','They them selves is responsible.','She her self assessment is required.','They them selves reports are required.','She her self governs the body.','The person him self shall act.','They and we our selves may act.','One one self shall act.','A concept of my self is described.','The term “she her self shall act” is literal.','The term "she her self shall act" is literal.','The term "she her\nline 2 self shall act" is literal.','She HER SELF shall act.','She her-\nline 2 self shall act.'])assert.equal(check(text).length,0,text);
 const text='She her self shall act.';const doc=makeDocument([text],'Current');doc.struck=[{start:4,end:12}];assert.equal(check(doc).length,0);
 const header=makeDocument([text+'\nLEGISLATIVE COUNSEL’S DIGEST\nA bill.\nThe people do enact as follows:\nA rule.'],'Current');assert.equal(check(header).length,0);
});

test('emphatic selections bridge only identified interior running heads',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 She her\n97','AB 121 — 2 —\nline 1 self shall act.'],'Current');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};
 const found=check(doc);assert.equal(found.length,1);assert.equal(found[0].suggestion,'herself');assert.equal(found[0].start,doc.text.indexOf('her'));assert.equal(found[0].end,doc.text.indexOf('self')+4);assert.equal(found[0].text,doc.text.slice(found[0].start,found[0].end));
 for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={};assert.equal(check(doc).length,0);
});
