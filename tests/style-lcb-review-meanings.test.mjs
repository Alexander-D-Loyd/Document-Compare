import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {wordChoiceIssues} from '../app/style-word-choice.mjs';
import {lcbSemanticReviewIssues,LCB_MEANING_REVIEW_FAMILIES} from '../app/style-lcb-review-meanings.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const check=text=>lcbSemanticReviewIssues(makeDocument([text],'Current'),refs);

test('unfamiliar legislative contexts receive source-grounded review without an asserted correction',()=>{
 const text='The commission must device its regional allocation framework. The organization shall forgo an unexpected benefit. A discrete release protocol applies to confidential material. The utility shall insure continuity of service.';
 const precise=wordChoiceIssues(makeDocument([text],'Current'),refs);
 assert.equal(precise.length,0,'These controls establish the existing finite checker gap');
 const found=check(text);
 assert.deepEqual(found.map(i=>i.matchText),['device','forgo','discrete','insure']);
 for(const issue of found){assert.equal(issue.confidence,'Review Suggested');assert.equal(issue.reviewSuggested,true);assert.equal(issue.reviewKind,'meaning');assert.equal(issue.suggestion,null);assert.equal(issue.conflict,false);assert.equal(issue.references.length,2);assert.match(issue.message,/may be correct/);assert.equal(text.slice(issue.start,issue.end),issue.text);}
 assert.deepEqual(found.at(-1).references.map(r=>[r.guidePage,r.rule]),[[3,'ensure (guarantee)'],[4,'insure (relating to insurance)']]);
});

test('correct but unresolved meanings are review candidates rather than fabricated violations',()=>{
 const text='The tenant occupies the property. A principal is responsible for the school. Staff may send the record forward. The guarantee remains valid. The stationery is stored safely.';
 assert.equal(wordChoiceIssues(makeDocument([text],'Current'),refs).length,0);
 assert.deepEqual(check(text).map(i=>[i.matchText,i.suggestion]),[['tenant',null],['principal',null],['forward',null],['guarantee',null],['stationery',null]]);
});

test('all 22 independently specified source distinctions have a useful review trigger',()=>{
 const terms=['advice','anytime','biannual','born','canvass','capitol','compliment','devise','discreet','ensure','forego','foreword','guaranty','internment','inurn','ordnance','preemptory','prospective','principle','stationary','tenet','therefor'];
 const text='Review '+terms.join(', ')+'.',found=check(text);
 assert.deepEqual(found.map(i=>i.matchText),terms);
 assert.equal(new Set(found.map(i=>i.checkId)).size,22);
 assert.equal(LCB_MEANING_REVIEW_FAMILIES.length,22);
 for(const issue of found)for(const ref of issue.references)assert.ok(refs.lcb.pages[ref.guidePage-1].lexicalEntries.includes(ref.rule),ref.rule);
});

test('selected inflections and line-spanning any time keep full original selections',()=>{
 const doc=makeDocument(['line 1 The policies involve canvassed districts, devised standards,\nline 2 insured risks, principal schools, and any\nline 3 time remaining.'],'Current');
 const found=lcbSemanticReviewIssues(doc,refs);
 assert.deepEqual(found.map(i=>i.matchText),['canvassed','devised','insured','principal','any time']);
 assert.equal(found.at(-1).text,'any\nline 3 time');
 for(const issue of found)assert.equal(doc.text.slice(issue.start,issue.end),issue.text);
});

test('existing precise findings retain precedence over the reader-review fallback',()=>{
 const doc=makeDocument(['The board must advice the applicant. Staff purchase stationary supplies. An unknown principal relationship remains.'],'Current');
 const precise=wordChoiceIssues(doc,refs);
 assert.deepEqual(precise.map(i=>i.suggestion),['advise','stationery']);
 const found=lcbSemanticReviewIssues(doc,refs,{existingIssues:precise});
 assert.deepEqual(found.map(i=>i.matchText),['principal']);
 assert.deepEqual(precise.map(i=>i.suggestion),['advise','stationery']);
});

test('complete Unicode words and compound components are preserved',()=>{
 const text='A megadevice, deviceα, αdevice, device\u0301, dispositif, capital-based plan, nonprincipal position, and principal-related claim exist. One principle applies.';
 assert.deepEqual(check(text).map(i=>i.matchText),['principle']);
 const doc=makeDocument(['xdevice applies.'],'Current');doc.struck=[{start:0,end:1}];
 assert.equal(lcbSemanticReviewIssues(doc,refs).length,0,'Masking an adjoining letter must not manufacture an intact word');
});

test('source quotations, headings, apparent names, source strikes and unknown exclusions stay protected',()=>{
 assert.equal(check('The text “principal relationship” and ‘stationary protocol’ and \'device\' are quoted.').length,0);
 assert.equal(check('The Principal Institute and Stationary Protocol Corporation exist.').length,0);
 const heading=makeDocument(['ASSEMBLY BILL\nPrincipal Analysis\nLEGISLATIVE COUNSEL’S DIGEST\nThis bill establishes a principal relationship.\nThe people do enact as follows:\nA device is required.'],'Current');
 assert.deepEqual(lcbSemanticReviewIssues(heading,refs).map(i=>[i.matchText,i.context]),[['principal','Digest'],['device','Bill']]);
 const doc=makeDocument(['A device relationship is relevant.'],'Current'),start=doc.text.indexOf('device');
 doc.struck=[{start:start+2,end:start+3}];assert.equal(lcbSemanticReviewIssues(doc,refs).length,0);
 doc.struck=[];doc.excluded.push({start:start+2,end:start+3});assert.equal(lcbSemanticReviewIssues(doc,refs).length,0);
});

test('tables and known source names are protected while nearby prose remains reviewable',()=>{
 const doc=makeDocument(['principal........20\nA device relationship remains.'],'Current');
 assert.deepEqual(lcbSemanticReviewIssues(doc,refs).map(i=>i.matchText),['device']);
 const name=makeDocument(['Special Olympics of Northern and Southern California.'],'Current');
 assert.equal(lcbSemanticReviewIssues(name,refs).length,0);
});

test('recognized word divisions across a page boundary retain every source fragment',()=>{
 const doc=makeDocument(['line 1 The princi-','line 1 pal relationship remains.'],'Current',[],[],new Set(['principal']));
 assert.ok(doc.wrappedWords.some(w=>w.word==='principal'));
 const found=lcbSemanticReviewIssues(doc,refs);assert.equal(found.length,1);
 assert.equal(found[0].matchText,'principal');assert.equal(found[0].text,'princi-\nline 1 pal');assert.equal(found[0].sourceWordDivisions.length,1);
 assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
});

test('a missing or changed guide witness cannot manufacture authority',()=>{
 const changed=structuredClone(refs);changed.lcb.pages[2].lexicalEntries=changed.lcb.pages[2].lexicalEntries.filter(s=>s!=='device (contrivance)');
 assert.equal(lcbSemanticReviewIssues(makeDocument(['The device relationship remains.'],'Current'),changed).length,0);
 assert.equal(lcbSemanticReviewIssues(makeDocument(['The principal relationship remains.'],'Current'),{}).length,0);
});

test('reader review never bridges an unknown excluded fragment into a meaning phrase',()=>{
 const doc=makeDocument(['The policy applies at any X time.'],'Current'),start=doc.text.indexOf('X');
 doc.excluded.push({start,end:start+1});
 assert.equal(lcbSemanticReviewIssues(doc,refs).length,0);
 const wrapped=makeDocument(['The princi-','pal relationship remains.'],'Current',[],[],new Set(['principal']));
 const gap=wrapped.text.indexOf('-');wrapped.struck=[{start:gap,end:gap+1}];
 assert.equal(lcbSemanticReviewIssues(wrapped,refs).length,0);
});

test('existing source selections continue to outrank a page-divided review term',()=>{
 const doc=makeDocument(['The princi-','pal relationship remains.'],'Current',[],[],new Set(['principal']));
 const divided=doc.wrappedWords.find(w=>w.word==='principal'),existing=[{start:divided.start,end:divided.end,suggestion:'principal'}];
 assert.equal(lcbSemanticReviewIssues(doc,refs,{existingIssues:existing}).length,0);
 assert.equal(existing[0].start,divided.start);assert.equal(existing[0].end,divided.end);
});

test('all source annotations are preserved verbatim, including different-page distinctions',()=>{
 const found=check('The agency shall review a prospective perspective, the ordinance, and the ordnance.');
 const future=found.find(i=>i.matchText==='prospective');
 assert.deepEqual(future.references.map(r=>[r.rule,r.guidePage]),[['perspective (view)',4],['prospective (expected)',5]]);
 const military=found.find(i=>i.matchText==='ordnance');
 assert.deepEqual(military.references.map(r=>r.rule),['ordinance (a law set forth by a governmental authority)','ordnance (military supplies, including weapons)']);
 assert.ok(!found.some(i=>typeof i.suggestion==='string'));
});
