import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {lcbSuffixBoundaryReviewIssues,LCB_SUFFIX_REVIEW_FAMILIES}from '../app/style-lcb-review-affix-boundaries.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current'),review=text=>{const d=doc(text);return lcbSuffixBoundaryReviewIssues(d,refs,{existingIssues:jointStylisticIssues(d,refs)});};

test('bounded suffix hyphens receive only contextual review with both guide witnesses',()=>{
 for(const word of ['citizen-ship','child-hood','state-hood','length-wise','care-ful','spoon-ful','home-less','meat-less','aware-ness','govern-ment']){const text='The '+word+' requirement applies.',found=review(text);assert.equal(found.length,1,word);assert.equal(found[0].text,word);assert.equal(found[0].suggestion,null);assert.equal(found[0].reviewSuggested,true);assert.equal(found[0].confidence,'Review Suggested');assert.deepEqual(found[0].references.map(r=>r.rule),['Hyphenation, item 5','6.30']);assert.ok(found[0].references.every(r=>r.preferred===null));assert.equal(text.slice(found[0].start,found[0].end),word);}
});
test('complete family forms and supported plurals preserve complete original tokens',()=>{
 for(const [suffix,roots]of Object.entries(LCB_SUFFIX_REVIEW_FAMILIES))for(const root of roots.split(' ')){const bad=root+'-'+suffix,d=doc('The '+bad+' applies.'),before=JSON.stringify(d);assert.equal(lcbSuffixBoundaryReviewIssues(d,refs).length,1,bad);assert.equal(lcbSuffixBoundaryReviewIssues(doc('The '+root+suffix+' applies.'),refs).length,0);assert.equal(JSON.stringify(d),before);}
 for(const word of ['member-ships','child-hoods','agree-ments']){const [issue]=review('The '+word+' apply.');assert.equal(issue.text,word);assert.equal(issue.affixEvidence.plural,true);}
});
test('prefix exceptions and specific closed open or hyphenated compounds keep their methods',()=>{
 for(const word of ['ex-governor','quasi-judicial','self-control','self-hood','self-same','bell-like','Scotland-like','ground-water','wild-land','multi-ply','certificate-holder','forest-land','state-park-land','water-borne','community-wide','data-sharing'])assert.equal(lcbSuffixBoundaryReviewIssues(doc('The '+word+' provision applies.'),refs).length,0,word);
});
test('ordinary grammatical compound and independent suffix words stay outside morphological cues',()=>{
 for(const text of ['The American-flag ship arrives.','The cargo-ship is described.','The citizen-owned ship arrives.','The child-size hood is required.','The cost-effective plan applies.','The citizenship-based certification applies.','The pre-citizen-ship rule applies.','The ship-wise review applies.','The citizen - ship phrase is literal.','The citizen—ship phrase is literal.','The citizen–ship phrase is literal.','The unknownroot-ship rule applies.'])assert.equal(lcbSuffixBoundaryReviewIssues(doc(text),refs).length,0,text);
});
test('supported compound continuations select the whole source while retaining grammatical hyphens',()=>{
 for(const word of ['citizen-ship-based','child-hood-related','member-ship-based-required']){const [issue]=review('The '+word+' certification applies.');assert.equal(issue.text,word);assert.equal(issue.suggestion,null);assert.ok(issue.message.includes('remaining compound hyphens'));assert.ok(issue.affixEvidence.compoundTail);}
 for(const word of ['citizen-ship-unfamiliar','citizen-ship-based-unfamiliar'])assert.equal(lcbSuffixBoundaryReviewIssues(doc('The '+word+' rule applies.'),refs).length,0,word);
});
test('actual line and page word divisions and hanging compound hyphens are accepted',()=>{
 for(const text of ['The citizen-\nship requirement applies.','The child-\nhood applies.','The length-\nwise direction applies.','The pre-\ncitizen-ship requirement applies.','The citizen-ship\n-related requirement applies.','The citizen- and member-ship rules apply.'])assert.equal(lcbSuffixBoundaryReviewIssues(doc(text),refs).length,0,text);
 const d=makeDocument(['The citizen-','AB 192 — 2 —\nline 1 ship applies.'],'Current',[],[],new Set(['citizenship']));assert.equal(lcbSuffixBoundaryReviewIssues(d,refs).length,0);
});
test('quotes apparent official names headings and table rows retain source protections',()=>{
 for(const text of ['The term “citizen-ship” is quoted.','The term ‘citizen-ship’ is quoted.','The term \'citizen-ship\' is quoted.','The Citizen-ship Fund applies.','The Citizen-Ship Foundation applies.','The Citizen-ship shall act.','CITIZEN-SHIP\nLEGISLATIVE COUNSEL’S DIGEST\nThe bill applies.','citizen-ship..................30'])assert.equal(lcbSuffixBoundaryReviewIssues(doc(text),refs).length,0,text);
 assert.equal(lcbSuffixBoundaryReviewIssues(doc('Citizen-ship is required.'),refs).length,1);
 assert.equal(lcbSuffixBoundaryReviewIssues(doc('line 1 Citizen-ship shall be documented.'),refs).length,1);
});
test('whole original roots suffixes separators and Unicode boundaries are required',()=>{
 const text='The citizen-ship applies.';for(const fragment of ['citizen','-','ship'])for(const property of ['struck','excluded']){const d=doc(text),start=d.text.indexOf(fragment);d[property]=[{start,end:start+fragment.length}];assert.equal(lcbSuffixBoundaryReviewIssues(d,refs).length,0,property+' '+fragment);}
 for(const text of ['The αcitizen-ship applies.','The citizen-shipα applies.','The citizen-ship2 applies.','The citizen-ship_value applies.'])assert.equal(lcbSuffixBoundaryReviewIssues(doc(text),refs).length,0,text);
 const d=doc('The child‐hood applies.'),[issue]=lcbSuffixBoundaryReviewIssues(d,refs);assert.equal(issue.text,'child‐hood');assert.equal(issue.affixEvidence.separator,'‐');
});
test('literal URL email path and separated compound identifiers stay protected',()=>{
 for(const text of ['The file is https://example.org/citizen-ship.','Use www.citizen-ship.org for the record.','Send to citizen-ship@example.org.','Read records/citizen-ship for the key.','The pre- citizen-ship field applies.','The citizen-ship - based certification applies.'])assert.equal(lcbSuffixBoundaryReviewIssues(doc(text),refs).length,0,text);
});
test('existing precise or conflict findings own all overlapping suffix evidence',()=>{
 const d=doc('The citizen-ship applies.'),start=d.text.indexOf('citizen-ship');for(const existing of [{start,end:start+12,suggestion:'citizenship',checkId:'precise'},{start:start+7,end:start+8,conflict:true,checkId:'conflict'}])assert.equal(lcbSuffixBoundaryReviewIssues(d,refs,{existingIssues:[existing]}).length,0);
});
