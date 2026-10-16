import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{makeDocument}from '../app/core.mjs';
import{jointStylisticIssues}from '../app/joint-style.mjs';
import{lcbFullDateLayoutIssues,restoreFullDateLayoutEvidence}from '../app/style-lcb-full-date-layout.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),doc=body=>makeDocument(['The people do enact as follows:\nline 1 '+body],'Current'),check=body=>lcbFullDateLayoutIssues(doc(body),refs);
test('private date draft corrects only comma/spacing in complete temporal dates',()=>{
 for(const [body,expected]of [['The law applies after April 1 2001.','April 1, 2001'],['The law applies after April 1,2001.','April 1, 2001'],['The law applies after april 1,2001.','april 1, 2001'],['On April 1 2001 the agency shall act.','April 1, 2001,'],['The form is dated February 29 2000.','February 29, 2000'],['The form applies as of October 31 2006, unless extended.','October 31, 2006']]){const d=doc(body),before=JSON.stringify(d),[i]=lcbFullDateLayoutIssues(d,refs);assert.ok(i,body);assert.equal(i.suggestion,expected);assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);assert.equal(refs.lcb.pages[6].text.slice(i.references[0].sourcePassage.start,i.references[0].sourcePassage.end),i.references[0].sourcePassage.text);}
});
test('correct dates invalid dates unproved roles and technical identifiers remain quiet',()=>{
 for(const body of ['The law applies after April 1, 2001.','On April 1, 2001, the agency acts.','The law applies after April 31 2001.','The law applies after February 29 2001.','The law applies after April 0 2001.','The law applies after April 1 01.','The law applies after April 12001.','The person April 1 2001 acts.','The law applies after April 1 2001-code.','The law applies after April 1 2001/key.','The law applies after April 1 2001α.','The law applies pre-after April 1 2001.','The law applies after April 1 2001 Act.','The law applies after April 1 2001 applies-code.','The law applies after April 1 2001 appliesα.'])assert.deepEqual(check(body),[],body);
});
test('complete date evidence rejects every struck or excluded supporting character',()=>{
 const body='The law applies after April 1 2001 unless extended.',base=doc(body),[i]=lcbFullDateLayoutIssues(base,refs);assert.ok(i);for(const property of ['struck','excluded'])for(let at=i.evidenceStart;at<i.evidenceEnd;at++){const d=doc(body);d[property]=[{start:at,end:at+1}];assert.deepEqual(lcbFullDateLayoutIssues(d,refs),[],property+' at '+at);}
 for(const property of ['struck','excluded']){const d=doc('The law applies pre-after April 1 2001.');const at=d.text.indexOf('pre-');d[property]=[{start:at,end:at+4}];assert.deepEqual(lcbFullDateLayoutIssues(d,refs),[]);}
});
test('quoted authority literal boundaries tables titles and unfamiliar Unicode cues protect dates',()=>{
 for(const body of ['The text quotes “after April 1 2001”.','The text quotes ‘after April 1 2001’.','The text quotes "after April 1 2001".','The phrase “April 1 2001” appears. The law applies after April 1 2001.','The law applies αafter April 1 2001.','The law applies 𐐀after April 1 2001.'])assert.deepEqual(check(body),[],body);
 for(const property of ['struck','excluded'])for(const quote of ['“','”']){const d=doc('The text quotes “after April 1 2001”.'),at=d.text.indexOf(quote);d[property]=[{start:at,end:at+1}];assert.deepEqual(lcbFullDateLayoutIssues(d,refs),[]);}
 const d=doc('The law applies after April 1 2001.');d.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.deepEqual(lcbFullDateLayoutIssues(d,refs),[]);
});
test('known PDF margins preserve physical date selection and nested restoration',()=>{
 const d=doc('The law applies after April 1\nline 2 2001.'),[i]=lcbFullDateLayoutIssues(d,refs);assert.ok(i);assert.match(i.text,/\nline 2/u);assert.equal(i.suggestion,'April 1, 2001');const e=restoreFullDateLayoutEvidence(i.fullDateLayoutEvidence,(x)=>x,d.text);assert.equal(e.date.text,i.text);assert.equal(e.temporalCue.text,d.text.slice(e.temporalCue.start,e.temporalCue.end));assert.deepEqual(lcbFullDateLayoutIssues(d,refs,{existingIssues:[i]}),[]);
 const noSource=structuredClone(refs);noSource.lcb.pages[6].text='No printed date witness';assert.deepEqual(lcbFullDateLayoutIssues(d,noSource),[]);
});
test('independent month capitalization coexists while an actual full-date layout owner suppresses duplication',()=>{
 const d=doc('The law applies after april 1 2001.'),existing=jointStylisticIssues(d,refs).filter(i=>i.checkId!=='lcb-full-date-layout'),month=existing.find(i=>i.text==='april'&&i.suggestion==='April');assert.ok(month,'Actual current production independently owns month capitalization');const found=lcbFullDateLayoutIssues(d,refs,{existingIssues:existing});assert.equal(found.length,1);assert.equal(found[0].suggestion,'april 1, 2001');assert.equal(month.suggestion,'April');
 assert.deepEqual(lcbFullDateLayoutIssues(d,refs,{existingIssues:[{...found[0],checkId:'punctuation',rule:'Punctuation: Full dates'}]}),[]);
 assert.equal(lcbFullDateLayoutIssues(d,refs,{existingIssues:[{...found[0],checkId:'capitalization',rule:'Month capitalization'}]}).length,1,'Overlapping independent rules do not own missing punctuation');
});
