import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {numeralIssues} from '../app/style-numerals.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const issues=text=>numeralIssues(makeDocument([text],'Current'),refs),corrections=text=>issues(text).filter(i=>!i.matchesPrimary);
test('quantities differ from citations, labels, dates and decimal identifiers',()=>{
 const text='The term is 1 year under Article 1, Section 1, and Sections 1 to 5, inclusive. Chapter 2 and Part 3 apply. On January 1, 2027, paragraph (1) of Section 527.1 applies.';
 const found=corrections(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['1','one']]);assert.equal(text.slice(found[0].start,found[0].end),'1');assert.equal(found[0].conflict,true);assert.equal(found[0].context,'Bill');assert.ok(found[0].references.some(r=>r.guideId==='gpo'));
 assert.equal(corrections('The term begins on 2027-01-01.').length,0);assert.deepEqual(corrections('The term begins on January one.').map(i=>i.suggestion),['1']);
 assert.equal(corrections('Use Judicial Council Form I.D. 100. 42 U.S.C. 1983 applies.').length,0);
});
test('different numerical expressions and money do not force a duration into figures',()=>{
 const text='Imprisonment is limited to 1 year, by a fine of one thousand dollars ($1,000), or both. The board has 3 people and 10 dollars ($10).';
 assert.deepEqual(corrections(text).map(i=>i.suggestion),['one','three']);
 assert.deepEqual(corrections('A conviction within 10 years carries not exceeding one year in jail.').map(i=>i.text),[]);
 assert.equal(corrections('The board grants 2 orders and 12 orders.').length,0);
 assert.deepEqual(corrections('The board grants two orders and 12 orders.').map(i=>i.suggestion),['2']);
 assert.deepEqual(corrections('The board grants 2 orders and 12 days.').map(i=>i.suggestion),['two']);
 assert.equal(corrections('The term is 1, 2, 3, or 10 years.').length,0);
 assert.deepEqual(corrections('The term is one, two, three, or 10 years.').map(i=>i.suggestion),['1','2','3']);
});
test('digest and bill context carry different cardinal and ordinal rules',()=>{
 const text='LEGISLATIVE COUNSEL’S DIGEST\nThe bill requires two requests, 1 permit, and a third hearing.\nThe people do enact as follows:\nThe office requires 2 requests, 1 permit, and a 3rd hearing.';
 assert.deepEqual(corrections(text).map(i=>[i.text,i.suggestion,i.context]),[['two','2','Digest'],['1','one','Digest'],['third','3rd','Digest'],['2','two','Bill'],['1','one','Bill'],['3rd','third','Bill']]);
 assert.equal(corrections('LEGISLATIVE COUNSEL’S DIGEST\nA third party may submit a form.').length,0);
 assert.equal(corrections('The Fourteenth Amendment to the United States Constitution applies.').length,0);
});
test('sentence starts, figures-only contexts and monetary phrases are handled independently',()=>{
 assert.deepEqual(corrections('12 people attend. The office grants eleven requests.').map(i=>i.suggestion),['Twelve','11']);
 assert.equal(corrections('The rate is 0.5 percent, the ratio is 1:5, and grades 1 to 6 apply. The hearing begins at 3 a.m. It costs ten dollars ($10).').length,0);
 assert.deepEqual(corrections('The rate is five percent. Grade seven pupils attend.').map(i=>i.suggestion),['5','7']);
 assert.equal(corrections('The ratio is 1 in 10. The ratio is one in five. The term is 1/2 year or 1½ years.').length,0);
 assert.equal(corrections('LEGISLATIVE COUNSEL’S DIGEST\nA device operates per second for three and one-half hours.').length,0);
 assert.deepEqual(corrections('The ratio is one in ten.').map(i=>i.suggestion),['1','10']);
});
test('numbered wrapping and source strikeouts preserve offsets and exclude removed quantities',()=>{
 const doc=makeDocument(['line 1 The term is 1\nline 2 year under Section 1.'],'Current');let found=numeralIssues(doc,refs).filter(i=>!i.matchesPrimary);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),'1');
 doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(numeralIssues(doc,refs).filter(i=>!i.matchesPrimary).length,0);
});
