import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{makeDocument}from '../app/core.mjs';
import{lcbAnytimeAliasIssues,restoreAnytimeAliasEvidence}from '../app/style-lcb-anytime-alias.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),doc=body=>makeDocument(['The people do enact as follows:\nline 1 '+body],'Current'),check=body=>lcbAnytimeAliasIssues(doc(body),refs);
test('private alias draft uses only existing noun and finite timing-adverb roles',()=>{
 for(const [body,preferred]of [['The person applies at any-time.','any time'],['The person applies at any - time.','any time'],['The person may apply any-time.','anytime'],['The person applies any-time.','anytime'],['The agency has applied any-time.','anytime'],['The person withdrew any-time.','anytime'],['The person is applying any-time after noon.','anytime'],['The person is resigning any-time.','anytime'],['The person shall call any-time.','anytime']]){const d=doc(body),before=JSON.stringify(d),found=lcbAnytimeAliasIssues(d,refs);assert.equal(found.length,1,body);const i=found[0];assert.equal(i.suggestion,preferred);assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);for(const r of i.references)assert.equal(refs.lcb.pages[2].text.slice(r.sourcePassage.start,r.sourcePassage.end),r.sourcePassage.text);}
});
test('printed forms unknown roles noun modifiers names dashes and technical fragments remain quiet',()=>{
 for(const body of ['The person applies at any time.','The person may apply anytime.','The any-time employee applies.','Any-Time Program Act applies.','The person may submit any-time.','The apply any-time program is required.','The person shall apply any-time-code.','The person shall apply any-time/key.','The person shall apply any-timeα.','The person shall apply any-time\u0301.','The person shall apply any—time.','The person shall apply any–time.','The person works pre-at any-time.','The person shall apply any-time after-code.','The person shall apply any-time afterα.'])assert.deepEqual(check(body),[],body);
});
test('all original finite cue alias and ending characters are required',()=>{
 for(const body of ['The person applies at any-time.','The person may apply any-time after noon.']){const base=doc(body),[i]=lcbAnytimeAliasIssues(base,refs);assert.ok(i);for(const property of ['struck','excluded'])for(let at=i.evidenceStart;at<i.evidenceEnd;at++){const d=doc(body);d[property]=[{start:at,end:at+1}];assert.deepEqual(lcbAnytimeAliasIssues(d,refs),[],body+' '+property+' '+at);}}
 for(const property of ['struck','excluded'])for(const body of ['The person works pre-at any-time.','The person may apply any-time/key.','The person may apply any-time after-code.']){const d=doc(body),frag=body.includes('pre-')?'pre-':body.includes('/key')?'/key':'-code',at=d.text.indexOf(frag);d[property]=[{start:at,end:at+frag.length}];assert.deepEqual(lcbAnytimeAliasIssues(d,refs),[],property+' '+body);}
});
test('original quoted marks bill-local terms table and astral cue boundaries remain protected',()=>{
 for(const body of ['The text quotes “may apply any-time”.','The text quotes ‘may apply any-time’.','The phrase “any-time” appears. The person may apply any-time.','The person 𐐀may apply any-time.','The person may αapply any-time.'])assert.deepEqual(check(body),[],body);
 for(const property of ['struck','excluded'])for(const quote of ['“','”']){const d=doc('The text quotes “may apply any-time”.'),at=d.text.indexOf(quote);d[property]=[{start:at,end:at+1}];assert.deepEqual(lcbAnytimeAliasIssues(d,refs),[]);}
 const d=doc('The person may apply any-time.');d.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.deepEqual(lcbAnytimeAliasIssues(d,refs),[]);
});
test('margins evidence restoration single owner and source witnesses remain exact',()=>{
 const d=doc('The person may\nline 2 apply any-\nline 3 time.'),[i]=lcbAnytimeAliasIssues(d,refs);assert.ok(i);assert.equal(i.suggestion,'anytime');assert.match(i.text,/\nline 3/u);assert.equal(i.text,d.text.slice(i.start,i.end));const e=restoreAnytimeAliasEvidence(i.anytimeAliasEvidence,x=>x,d.text);assert.equal(e.term.text,i.text);assert.equal(e.sourceText,d.text.slice(e.start,e.end));assert.deepEqual(lcbAnytimeAliasIssues(d,refs,{existingIssues:[i]}),[]);
 const noSource=structuredClone(refs);noSource.lcb.pages[2].text='No printed anytime pair';assert.deepEqual(lcbAnytimeAliasIssues(d,noSource),[]);
});
