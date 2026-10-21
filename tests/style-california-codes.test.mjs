import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {CALIFORNIA_CODES,searchCaliforniaCodes} from '../app/data/california-codes.mjs';
import {californiaCodeIssues} from '../app/style-california-codes.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const doc=text=>makeDocument([text],'Current');
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const run=text=>{const d=doc(text),before=JSON.stringify(d),issues=californiaCodeIssues(d);assert.equal(JSON.stringify(d),before);for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);return issues;};
test('all 29 supplied name/shorthand pairs are immutable and separately searchable',()=>{
 assert.equal(CALIFORNIA_CODES.length,29);assert.equal(new Set(CALIFORNIA_CODES.map(e=>e.name)).size,29);assert.equal(new Set(CALIFORNIA_CODES.map(e=>e.shorthand)).size,29);
 assert.ok(Object.isFrozen(CALIFORNIA_CODES)&&CALIFORNIA_CODES.every(Object.isFrozen));
 assert.deepEqual(searchCaliforniaCodes('fac'),[{name:'Food and Agricultural Code',shorthand:'FAC'}]);assert.equal(searchCaliforniaCodes('Public').length,3);assert.deepEqual(searchCaliforniaCodes('missing'),[]);
});
for(const {name,shorthand}of CALIFORNIA_CODES){
 test('exact names and shorthand: '+shorthand,()=>{
  for(const text of [`Section 100 of the ${name} applies.`,`${name} § 100 applies.`,`${shorthand} 100 applies.`,`${name} - ${shorthand}`,`${name} (${shorthand})`,`${name} ${shorthand}`])assert.deepEqual(run(text),[],text);
  const names=run(`Section 100 of the ${name.toLowerCase()} applies.`);assert.equal(names.length,1);assert.equal(names[0].suggestion,name);assert.equal(names[0].checkId,'california-codes-name');
  const shorts=run(`${shorthand.toLowerCase()} § 100 applies.`);assert.equal(shorts.length,1);assert.equal(shorts[0].suggestion,shorthand);assert.equal(shorts[0].checkId,'california-codes-shorthand');
 });
}
test('unlisted complete titles and shorthand are explicit review findings without invented replacements',()=>{
 for(const text of ['Section 12 of the Goverment Code applies.','goverment code § 12.','The Public Health Code applies.','Section 12 of the public health code applies.','Health & Safety Code § 12.','Code of Civil Procedures § 12.','Cal. XYZ 12.','XYZ § 12.','Section 12 of XYZ applies.']){
  const issues=run(text);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,null,text);assert.equal(issues[0].reviewSuggested,true);assert.match(issues[0].message,/not an exact/);
 }
});
test('wrong known or unknown paired shorthand is checked against its full name',()=>{
 for(const separator of [' - ',' — ',' ('])for(const short of ['CIV','XYZ','gov']){
  const text='Government Code'+separator+short+(separator===' ('?')':''),[i]=run(text);assert.ok(i,text);assert.equal(i.text,short);assert.equal(i.suggestion,'GOV');assert.equal(i.codeSource.pairedWith,'Government Code');
 }
});
test('punctuation inside the shorthand is significant; separator punctuation is not',()=>{
 assert.equal(run('Gov. § 12.')[0].suggestion,'GOV');assert.equal(run('Government Code (GOV.)')[0].suggestion,'GOV');
 assert.deepEqual(run('Government Code—GOV'),[]);assert.deepEqual(run('Government Code – GOV'),[]);
 assert.deepEqual(run('Government Code-GOV'),[]);
 assert.deepEqual(run('government code-gov').map(i=>i.suggestion),['Government Code','GOV']);
 for(const text of ['G.O.V. § 12.','H&S § 12.']){const [i]=run(text);assert.ok(i,text);assert.equal(i.suggestion,null);}
 assert.equal(run('Government Code (G.O.V.)')[0].suggestion,'GOV');
 assert.deepEqual(run('Government Code (Section 12).'),[]);
 assert.deepEqual(run('Fund Code (e.g., 0044 is an account).'),[]);
 for(const text of ['42 U.S.C. § 1983.','H.R. 1 applies.','P.L. 104-193 applies.'])assert.deepEqual(run(text),[],text);
});
test('ordinary acronyms, generic code references and foreign/federal titles are not California mismatches',()=>{
 for(const text of ['The FAM program shall act.','The CIV shall act.','Use a code of conduct.','The building code applies.','AB 100 and SB 200 apply.','42 USC § 1983.','Nevada Civil Code § 100.','United States Code § 12.','The Uniform Commercial Code applies.','The Municipal Code applies.','In accordance with Section 12 of the Government Code.','The State of California do enact as follows.','The California State Auditor shall act.','Reference Code (indicates the item). Fund Code (the account).'])assert.deepEqual(run(text),[],text);
});
test('complete original title and shorthand endpoints cannot be manufactured from removed text',()=>{
 for(const property of ['struck','excluded']){
  const d=doc('The government Code applies. gov § 12.'),s=d.text.indexOf('gov §');d[property]=[{start:4,end:14},{start:s,end:s+3}];assert.deepEqual(californiaCodeIssues(d),[],property);
  const x=doc('Health and old Safety Code § 12.');const start=x.text.indexOf('old');x[property]=[{start,end:start+3}];assert.deepEqual(californiaCodeIssues(x),[],property+' interior');
 }
 for(const text of ['αgovernment Code § 12.','government Codeé § 12.','pre-government Code § 12.','key/gov § 12.','gov_1 § 12.'])assert.deepEqual(run(text),[],text);
});
test('quoted citations are checked even though ordinary LCB wording exceptions protect quotations',()=>{
 const issues=run('The text states “civil code” and “gov § 12.”');assert.deepEqual(issues.map(i=>i.suggestion),['Civil Code','GOV']);
});
test('physical margin and page whitespace is ignored while exact source offsets remain intact',()=>{
 const d=makeDocument(['line 1 Section 12 of the health and','line 1 safety code applies.'],'Current'),before=d.text,[i]=californiaCodeIssues(d);assert.ok(i);assert.equal(i.suggestion,'Health and Safety Code');assert.equal(d.text.slice(i.start,i.end),i.text);assert.match(i.text,/line 1/);assert.equal(d.text,before);
 assert.deepEqual(run('line 1 Section 12 of the Public Con-\nline 2 tract Code applies.'),[]);
 assert.deepEqual(run('Notwithstanding Public Contract Code Section 12.'),[]);
});
test('joint worker path retains user-list evidence and restores recognized divided words',()=>{
 const text='line 1 Section 12 of the govern-\nline 2 ment code applies. gov § 12.',d=doc(text),start=text.indexOf('govern-'),second=text.indexOf('ment');d.wrappedWords=[{word:'government',parts:['govern','ment'],spans:[{start,end:start+6},{start:second,end:second+4}],start,end:second+4,recognized:true}];
 const before=JSON.stringify(d),issues=reviewStyleIssues(d,refs).filter(i=>i.guideId==='california-codes');assert.equal(issues.length,2);assert.deepEqual(issues.map(i=>i.suggestion),['Government Code','GOV']);for(const i of issues){assert.equal(text.slice(i.start,i.end),i.text);assert.match(i.reviewTask,/supplied list/);assert.equal(i.references[0].guideId,'california-codes');assert.equal(i.references[0].guidePage,undefined);}assert.equal(JSON.stringify(d),before);
});
test('the additional list keeps independent LCB provisions and reports an unlisted title as review only',()=>{
 const d=doc('See subchapter 2 of the California Code of Regulations.'),base=jointStylisticIssues(d,refs),combined=reviewStyleIssues(d,refs);
 assert.deepEqual(combined.filter(i=>i.guideId!=='california-codes').map(({id,...i})=>i),base.map(({id,...i})=>i));
 const codes=combined.filter(i=>i.guideId==='california-codes');assert.equal(codes.length,1);assert.equal(codes[0].matchText,'Code of Regulations');assert.equal(codes[0].suggestion,null);assert.equal(codes[0].reviewSuggested,true);
 const civil=reviewStyleIssues(doc('Section 12 of the civil code applies.'),refs);assert.equal(civil.filter(i=>i.suggestion==='Civil Code').length,1);
 assert.equal(run('The Code of Federal Regulations Subchapter 7 applies.').length,0);
});
