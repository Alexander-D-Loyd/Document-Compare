import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {lcbReferenceChainIssues,lcbConstitutionalReferenceReviewIssues,lcbStructuralReferenceReviewIssues,lcbCoordinatedReferenceReviewIssues,lcbReferenceIdentityProtectionRanges} from '../app/style-lcb-review-reference-chains.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current');
const extra=text=>jointStylisticIssues(doc(text),refs).filter(i=>['numerals','lcb-reference-chain','lcb-named-amendment'].includes(i.checkId));

test('plural legal references fill every independently identified missing chain member',()=>{
 for(const [text,expected]of [['Sections one and two of the Government Code apply.',['one','two']],['Sections one or two of the Government Code apply.',['one','two']],['Sections one, two, and three of the Government Code apply.',['one','two','three']],['Sections one to four, inclusive, of the Government Code apply.',['one','four']],['Sections one through four of the Government Code apply.',['one','four']],['Sections 1 and two of the Government Code apply.',['two']],['Paragraphs one and two of subdivision (a) apply.',['one','two']]]){
  const found=extra(text);assert.deepEqual(found.map(i=>i.text),expected,text);
  for(const issue of found){if(issue.checkId==='lcb-reference-chain'){assert.equal(issue.confidence,'Rule check');assert.equal(issue.reviewSuggested,false);assert.ok(issue.references.some(r=>r.rule==='12.7'));}assert.equal(text.slice(issue.start,issue.end),issue.text);}
 }
});

test('existing precise findings retain precedence over standalone chain candidates',()=>{
 const d=doc('Sections one and two of the Government Code apply.'),start=d.text.indexOf('one');
 assert.deepEqual(lcbReferenceChainIssues(d,refs,{existingIssues:[{start,end:start+3,checkId:'numerals'}]}).map(i=>i.text),['two']);
});

test('canonical complete cardinals, mixed decimal identifiers and parentheses retain their structure',()=>{
 assert.deepEqual(lcbReferenceChainIssues(doc('Sections one hundred and two(a), 104.5, and two hundred three(b)(1) apply.'),refs).map(i=>[i.text,i.suggestion]),[['one hundred and two','102'],['two hundred three','203']]);
 assert.equal(extra('Section 4999.200 of the Business and Professions Code applies.').length,0);
 assert.equal(extra('Sections 1, 2, and 3 of the Government Code apply.').length,0);
});

test('ordinary quantities, unknown terminal nouns and unrelated clauses do not inherit a reference scope',()=>{
 for(const text of ['The section provides one permit and two notices.','Section 1 governs two permits and three notices.','Sections 1 and two requests remain.','The chapter includes one division and two sections.','Sections one, two requests, and three notices remain.'])assert.equal(lcbReferenceChainIssues(doc(text),refs).length,0,text);
});

test('full chain labels and connectors are evidence protected against strikes and unknown exclusions',()=>{
 const text='Sections one and two of the Government Code apply.';
 for(const fragment of ['Sections',' and ','two']){const d=doc(text),start=d.text.indexOf(fragment);d.struck=[{start,end:start+fragment.length}];assert.equal(lcbReferenceChainIssues(d,refs).filter(i=>i.text==='two').length,0,fragment);}
 const d=doc(text),start=d.text.indexOf(' and ');d.excluded.push({start,end:start+5});assert.equal(lcbReferenceChainIssues(d,refs).filter(i=>i.text==='two').length,0);
});

test('source literals, tables, malformed numbers and original Unicode fragments remain protected',()=>{
 for(const text of ['The term “Sections one and two” is literal.','Sections one and two...................20','Sections one two and three apply.','Sections oneα and two apply.','Sections 1.2.3α and two apply.'])assert.equal(lcbReferenceChainIssues(doc(text),refs).length,0,text);
});

test('constitutional Article identity is reviewed rather than incorrectly converted to Arabic',()=>{
 for(const text of ['Article thirteen B of the California Constitution applies.','Article 13 B of the California Constitution applies.','Article 1 of the United States Constitution applies.']){
  const d=doc(text),found=lcbConstitutionalReferenceReviewIssues(d,refs);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,null);assert.equal(found[0].reviewSuggested,true);assert.deepEqual(found[0].supersedesCheckIds,['numerals']);assert.equal(found[0].references[0].ruleText,'Article XIII B.');assert.equal(lcbReferenceChainIssues(d,refs).length,0);
 }
 assert.equal(lcbConstitutionalReferenceReviewIssues(doc('Article XIII B of the California Constitution applies.'),refs).length,0);
 assert.equal(lcbConstitutionalReferenceReviewIssues(doc('Article 13 of the Government Code applies.'),refs).length,0);
});

test('the exact named Fourteenth Amendment example has a source-backed precise correction',()=>{
 assert.deepEqual(extra('The 14th Amendment to the United States Constitution applies.').map(i=>[i.text,i.suggestion]),[['14th','Fourteenth']]);
 for(const text of ['The Fourteenth Amendment to the United States Constitution applies.','The 14th application receives review.','The 14th amendment to the contract applies.','The term “14th Amendment to the United States Constitution” is quoted.'])assert.equal(extra(text).length,0,text);
});

test('subdivision identity uncertainty remains separate from precise figure changes',()=>{
 const d=doc('Subdivisions one and two of Section 123 apply.');
 assert.equal(lcbReferenceChainIssues(d,refs).length,0);
 assert.deepEqual(lcbStructuralReferenceReviewIssues(d,refs).map(i=>[i.text,i.suggestion,i.reviewSuggested]),[['one',null,true],['two',null,true]]);
 assert.equal(lcbStructuralReferenceReviewIssues(doc('Subdivisions (a) and (b) of Section 123 apply.'),refs).length,0);
 assert.equal(lcbStructuralReferenceReviewIssues(doc('The section establishes one subdivision and two permits.'),refs).length,0);
});

test('printed margins and known interior heads retain every reference member selection',()=>{
 const d=makeDocument(['line 1 Sections one and','AB 192 — 2 —\nline 1 two of the Government Code apply.'],'Current'),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 assert.deepEqual(lcbReferenceChainIssues(d,refs).map(i=>[i.text,i.suggestion]),[['one','1'],['two','2']]);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(lcbReferenceChainIssues(d,refs).filter(i=>i.text==='two').length,0);
});

test('recognized number word divisions retain full source highlights',()=>{
 const d=makeDocument(['Sections one and twen-','line 1 ty-three of the Government Code apply.'],'Current',[],[],new Set(['twenty']));
 const found=lcbReferenceChainIssues(d,refs);assert.deepEqual(found.map(i=>i.suggestion),['1','23']);assert.equal(found[1].text,'twen-\nline 1 ty-three');assert.equal(d.text.slice(found[1].start,found[1].end),found[1].text);
});

test('singular coordinated structural labels get review while permitted or alternatives stay clear',()=>{
 for(const text of ['Chapter 12, 38, and 189 of the Statutes of 2023 applies.','Section 123 and 124 apply.','Chapter 12 to 38 of the Statutes of 2023 applies.']){
  const found=lcbCoordinatedReferenceReviewIssues(doc(text),refs);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,null);assert.equal(found[0].reviewSuggested,true);assert.equal(found[0].conditionalSuggestion,found[0].text+'s');
 }
 for(const text of ['Section 123 or 124 applies.','Chapter 12, 38, or 189 of the Statutes of 2023 applies.','Chapters 12, 38, and 189 of the Statutes of 2023 apply.','The chapter applies to 12 permits and 38 requests.','Section 123 governs 124 requests and 189 permits.','The literal “Chapter 12 and 38” is a name.'])assert.equal(lcbCoordinatedReferenceReviewIssues(doc(text),refs).length,0,text);
});

test('unsafe Arabic identity corrections are protected independently of review visibility',()=>{
 const d=doc('Article thirteen B of the California Constitution applies. Subdivisions one and two of Section 123 apply.');
 const protectedRanges=lcbReferenceIdentityProtectionRanges(d,refs);
 assert.deepEqual(protectedRanges.map(r=>[d.text.slice(r.start,r.end),r.supersedesCheckIds]),[['thirteen',['numerals']],['one',['numerals']],['two',['numerals']]]);
 assert.equal(lcbReferenceIdentityProtectionRanges(doc('Article 13 of the Government Code applies.'),refs).length,0);
});
