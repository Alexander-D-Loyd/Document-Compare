import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {lcbNumberRelationReviewIssues} from '../app/style-lcb-review-number-relations.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>{const doc=makeDocument([text],'Current');return lcbNumberRelationReviewIssues(doc,refs,{existingIssues:jointStylisticIssues(doc,refs)});};

test('unfamiliar repeated-count heads close the independently observed numeral gap',()=>{
 const text='The laboratory receives three zygotes, four zygotes, and 10 zygotes.',doc=makeDocument([text],'Current');
 assert.equal(jointStylisticIssues(doc,refs).length,0);
 const found=check(text);assert.deepEqual(found.map(i=>[i.matchText,i.conditionalSuggestion]),[['three','3'],['four','4']]);
 for(const issue of found){assert.equal(issue.suggestion,null);assert.equal(issue.reviewSuggested,true);assert.equal(issue.confidence,'Review Suggested');assert.equal(issue.relationshipEvidence.head,'zygotes');assert.match(issue.message,/Confirm their relationship/);assert.equal(text.slice(issue.start,issue.end),issue.text);assert.deepEqual(issue.references.map(r=>r.rule),['Numerals: Bill, item 3','12.5']);}
});

test('shared unfamiliar noun heads and direct and/or/to spreads receive conditional review',()=>{
 for(const [text,terms]of [['The laboratory receives three, four, or 10 zygotes.',['three','four']],['The laboratory receives three and four and 10 zygotes.',['three','four']],['The laboratory receives three to 10 zygotes.',['three']],['The laboratory receives three through 10 zygotes.',['three']]])assert.deepEqual(check(text).map(i=>i.matchText),terms,text);
});

test('correct figures, all-small written counts, different expressions and sentence openings remain clear',()=>{
 for(const text of ['The laboratory receives 3 zygotes, 4 zygotes, and 10 zygotes.','The laboratory receives three zygotes, four zygotes, and five zygotes.','The laboratory receives three zygotes, four embryos, and 10 cells.','Three zygotes, four zygotes, and 10 zygotes arrive.','The laboratory receives 16 months, or two or three years.'])assert.equal(check(text).length,0,text);
});

test('already precise same-noun count corrections retain ownership',()=>{
 assert.equal(check('The agency receives three permits, four permits, and 10 permits.').length,0);
 const doc=makeDocument(['The laboratory receives three zygotes, four zygotes, and 10 zygotes.'],'Current'),start=doc.text.indexOf('three');
 const existing=[{start,end:start+5,suggestion:'3'}];
 assert.deepEqual(lcbNumberRelationReviewIssues(doc,refs,{existingIssues:existing}).map(i=>i.matchText),['four']);
});

test('decimals, signed expressions, fractions and partial original words cannot establish count relationships',()=>{
 for(const text of ['The laboratory receives three zygotes and -10 zygotes.','The laboratory receives three zygotes and 10.5 zygotes.','The laboratory receives three zygotes and 10/12 zygotes.','The laboratory receives three zygotes and 10α zygotes.','The laboratory receives one hundred and two zygotes.'])assert.equal(check(text).length,0,text);
});

test('canonical scale-and-remainder counts remain one count rather than a made-up series',()=>{
 assert.deepEqual(check('The laboratory receives three zygotes and one hundred and two zygotes.').map(i=>i.matchText),['three']);
 assert.equal(check('The laboratory receives one hundred and two zygotes.').length,0);
 assert.equal(check('The laboratory receives one hundred and two hundred zygotes.').length,0);
});

test('legal identifiers and digest guide disagreements remain protected',()=>{
 for(const text of ['Sections three, four, and 10 apply to zygotes.','Article 3 and 10 apply.','LEGISLATIVE COUNSEL’S DIGEST\nThe laboratory receives three zygotes, four zygotes, and 10 zygotes.'])assert.equal(check(text).length,0,text);
});

test('every establishing connector and head is protected against source damage',()=>{
 const text='The laboratory receives three zygotes and 10 zygotes.';
 for(const fragment of ['three',' and ','10','zygotes']){
  const doc=makeDocument([text],'Current'),start=doc.text.indexOf(fragment);doc.struck=[{start,end:start+fragment.length}];
  assert.equal(lcbNumberRelationReviewIssues(doc,refs).length,0,fragment);
 }
 const doc=makeDocument([text],'Current'),start=doc.text.indexOf(' and ');doc.excluded.push({start,end:start+5});
 assert.equal(lcbNumberRelationReviewIssues(doc,refs).length,0);
});

test('an independently intact remaining relationship survives a removed unrelated member',()=>{
 const doc=makeDocument(['The laboratory receives three zygotes, four zygotes, and 10 zygotes.'],'Current'),start=doc.text.indexOf('three');doc.struck=[{start,end:start+5}];
 assert.deepEqual(lcbNumberRelationReviewIssues(doc,refs).map(i=>i.matchText),['four']);
});

test('quotes, tables and named capitalized heads remain protected',()=>{
 for(const text of ['The phrase “three zygotes, four zygotes, and 10 zygotes” is quoted.','three zygotes, four zygotes, and 10 zygotes........20','The laboratory receives three Zygotes, four Zygotes, and 10 Zygotes.'])assert.equal(check(text).length,0,text);
});

test('recognizable page heads and word divisions keep complete original count evidence',()=>{
 const doc=makeDocument(['line 1 The laboratory receives three zygotes, four zygotes, and','AB 192 — 2 —\nline 1 10 zygotes.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const found=lcbNumberRelationReviewIssues(doc,refs);assert.deepEqual(found.map(i=>i.matchText),['three','four']);
 for(const issue of found){assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.ok(doc.text.slice(issue.relationshipEvidence.start,issue.relationshipEvidence.end).includes(head.text));}
 const divided=makeDocument(['The laboratory receives thir-','ty zygotes and four zygotes.'],'Current',[],[],new Set(['thirty']));
 assert.deepEqual(lcbNumberRelationReviewIssues(divided,refs).map(i=>i.matchText),['four']);
});

test('qualified repeated counts preserve the complete noun phrase as reader evidence',()=>{
 for(const text of ['The laboratory receives three eligible zygotes and 10 eligible zygotes.','The laboratory receives three new zygotes, four new zygotes, and 10 new zygotes.','The laboratory receives three, four, or 10 eligible zygotes.','The laboratory requires that three eligible zygotes and 10 eligible zygotes arrive.']){
  const found=check(text);assert.ok(found.length);assert.deepEqual(found.map(i=>i.matchText),text.includes('four')?['three','four']:['three']);
  for(const i of found){assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.match(i.relationshipEvidence.head,/^(eligible|new) zygotes$/);assert.ok(text.slice(i.relationshipEvidence.start,i.relationshipEvidence.end).endsWith(i.relationshipEvidence.head));}
 }
});

test('different or incomplete qualified expressions cannot supply a count relationship',()=>{
 for(const text of ['The laboratory receives three eligible zygotes and 10 ineligible zygotes.','The laboratory receives three new zygotes and 10 new embryos.','The laboratory receives three eligible zygotes within 10 days.','The laboratory receives three otherwise eligible zygotes and 10 otherwise eligible zygotes.','The laboratory receives three new eligible zygotes and 10 new eligible zygotes.','The laboratory receives three new and 10 new.','The laboratory receives three and 10 new zygotes-like structures.','Three eligible zygotes and 10 eligible zygotes arrive.','The laboratory receives three, four, or 10 new selected zygotes.','The laboratory requires three, four, or 10 eligible zygotes proliferating rapidly.'])assert.equal(check(text).length,0,text);
});

test('qualified count evidence survives recognized page heads but rejects damaged modifiers',()=>{
 const doc=makeDocument(['line 1 The laboratory receives three eligible zygotes and','AB 192 — 2 —\nline 1 10 eligible zygotes.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const found=lcbNumberRelationReviewIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].relationshipEvidence.head,'eligible zygotes');assert.ok(doc.text.slice(found[0].relationshipEvidence.start,found[0].relationshipEvidence.end).includes(head.text));
 for(const kind of ['struck','excluded']){const damaged=makeDocument(['The laboratory receives three eligible zygotes and 10 eligible zygotes.'],'Current'),start=damaged.text.indexOf('eligible');damaged[kind].push({start,end:start+8});assert.equal(lcbNumberRelationReviewIssues(damaged,refs).length,0);}
 const divided=makeDocument(['The laboratory receives three eli-\ngible zygotes and 10 eligible zygotes.'],'Current',[],[],new Set(['eligible'])),issue=lcbNumberRelationReviewIssues(divided,refs)[0];assert.ok(issue);assert.ok(divided.text.slice(issue.relationshipEvidence.start,issue.relationshipEvidence.end).includes('eli-\ngible'));assert.equal(divided.text.slice(issue.start,issue.end),'three');
 for(const kind of ['struck','excluded']){const damaged=makeDocument(['The laboratory requires three eligible zygotes and 10 eligible zygotes arrive.'],'Current'),start=damaged.text.indexOf('arrive');damaged[kind].push({start,end:start+6});assert.equal(lcbNumberRelationReviewIssues(damaged,refs).length,0);}
});
