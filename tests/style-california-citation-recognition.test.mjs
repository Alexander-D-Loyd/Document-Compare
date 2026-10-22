import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {californiaCitationReview} from '../app/style-california-citations.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>({...makeDocument([text],'Current'),styleDocumentType:'opinion'});
const check=doc=>californiaCitationReview(typeof doc==='string'?make(doc):doc,refs,{includeContextReview:true});
const forms=[
 ['42 U.S.C. § 1983','federal-code'],['Cal. Code Regs., tit. 14, § 925.4','california-regulation'],
 ['Cal. Rules of Court, rule 8.204(a)','california-rules'],['32 C.F.R. § 581.3(c)(5) (1997)','federal-regulation'],
 ['Sen. Bill No. 123 (1993-1994 Reg. Sess.) section 1','california-legislative'],
 ['Alpha v. Beta, supra, 12 Cal.4th at p. 3','case-california'],
 ['Alpha v. Beta (D.Cal. 1998) 2 F.R.D. 3','case-federal-trial'],
 ['Alpha v. Beta (9th Cir. 1998) 2 F.3d 1, 3','case-federal-appeal'],
 ['Alpha v. Beta (1776) 2 All E.R. 1, 3','case-english'],
 ['Alpha (1998) 2 Cal. P.U.C. 3','case-administrative'],
 ['2 Ops.Cal.Atty.Gen. 3 (1998)','case-attorney-general'],
 ['2 F.R.D. 3','case-federal-trial'],['Cal. Const., art. IV, § 1','constitution']
];
test('abbreviated full short and standalone citation structures receive whole source-specific tasks',()=>{
 for(const [term,family]of forms){
  const text=term+' governs.',doc=make(text),before=JSON.stringify(doc),found=check(doc).issues;
  assert.equal(found.length,1,term);assert.equal(found[0].text,term);assert.ok(found[0].citationContextReview?.some(f=>f.id===family),term+' '+family);
  assert.equal(found[0].suggestion,null);assert.equal(doc.text.slice(found[0].start,found[0].end),term);assert.equal(JSON.stringify(doc),before);
  for(const f of ['struck','excluded'])for(let p=0;p<term.length;p++){const d=structuredClone(doc);d[f].push({start:p,end:p+1});assert.deepEqual(check(d).issues,[],f+' '+p+' '+term);}
  assert.deepEqual(check('“'+term+'”').issues,[],term+' quoted');
 }
});
test('federal court designations belong to the complete citation and do not become California case tasks',()=>{
 const term='Alpha v. Beta (D.Cal. 1998) 2 F.R.D. 3',found=check(term).issues;
 assert.equal(found.length,1);assert.equal(found[0].text,term);
 assert.ok(!found[0].citationContextReview.some(f=>f.id==='case-california'));
 assert.ok(found[0].citationContextReview.some(f=>f.id==='case-federal-trial'));
});
test('all citation coordinates stay figures while surrounding prose quantities retain independent checks',()=>{
 for(const [term]of forms){
  for(const enclosing of [false,true]){
   const text=(enclosing?'(See '+term+'.)':term)+' governs the 2 employees.',at=text.lastIndexOf('2 employees'),d=make(text),found=reviewStyleIssues(d,refs,{includeCompleteLcbReview:true,includeReviewSuggestions:true});
   const corrections=found.filter(i=>i.checkId==='numerals');assert.deepEqual(corrections.map(i=>[i.start,i.suggestion]),[[at,'two']],term+' '+enclosing);
   assert.ok(!found.some(i=>i.checkId==='lcb-sentence-number-review'),term+' no invented numerical relationship');
  }
 }
 const text='(See 1 Witkin, California Criminal Law (2d ed. 1988) § 13, p. 17.) governs the 2 employees.',found=reviewStyleIssues(make(text),refs,{includeCompleteLcbReview:true,includeReviewSuggestions:true});
 assert.deepEqual(found.filter(i=>i.checkId==='numerals').map(i=>[i.text,i.suggestion]),[['2','two']]);
});
test('unknown reporter series get identification review without borrowing source-unprinted typography',()=>{
 const term='Alpha v. Beta (1998) 2 Zzz. 3',found=check(term).issues;assert.equal(found.length,1);assert.equal(found[0].text,term);
 assert.ok(found[0].citationContextReview.some(f=>f.id==='case-general'));assert.equal(found[0].suggestion,null);
 const database='Alpha v. Beta (D.Cal. 1998) 1998 WL 12345',db=check(database).issues;assert.equal(db.length,1);assert.ok(db[0].citationContextReview.some(f=>f.id==='electronic-source'));
});
test('physical court/year wrapping and literal document-type separation remain intact',()=>{
 const text='The source Alpha v. Beta (D.Cal.\n1998) 2 F.R.D. 3 governs.',d=make(text),found=check(d).issues;
 assert.equal(found.length,1);assert.equal(found[0].text,'Alpha v. Beta (D.Cal.\n1998) 2 F.R.D. 3');
 for(const type of ['bill','resolution'])assert.deepEqual(check({...d,styleDocumentType:type}).issues,[]);
 for(const text of ['The annual report is due in 1998.','The source is https://example.test/2.F.R.D.3.','The office uses 2 widgets.'])assert.deepEqual(check(text).issues,[],text);
});
test('pending docket-only and source-incomplete full cases stay explicit reader tasks',()=>{
 for(const term of ['Alpha v. Beta (D.Cal. Sept. 1, 1998, No. C98-123)','Alpha v. Beta (1998)','Alpha v. Beta 2 F.R.D. 3']){
  const found=check(term).issues;assert.equal(found.length,1,term);assert.equal(found[0].text,term);assert.equal(found[0].suggestion,null);assert.ok(found[0].citationContextReview.some(f=>f.id==='case-general'),term);
 }
 const found=check('Alpha v. Beta, 2 F.R.D. 3 (1998)').issues;assert.equal(found.length,1);assert.match(found[0].message,/year parenthetical/);assert.ok(found[0].citationContextReview.some(f=>f.id==='case-federal-trial'));
});
test('unknown and incomplete sources have one whole review owner without manufactured fragment corrections',()=>{
 const examples=[['(Mystery Code, § 51.)','unknown-family'],['12 ZZZ. 3','unknown-family'],['Smith, supra, at p. 3','unknown-family'],['(Civ. Code § 51','unbalanced-parenthetical'],['(Civ. Code § 51, '+('additional citation context '.repeat(115))+'.)','oversized-parenthetical']];
 for(const [term,kind]of examples){
  const d=make(term),before=JSON.stringify(d),found=check(d).issues;assert.equal(found.length,1,kind);assert.equal(found[0].text,term);assert.equal(found[0].checkId,'california-citation-unresolved-review');assert.equal(found[0].citationRecoveryKind,kind);assert.equal(found[0].suggestion,null);assert.equal(found[0].citationContextReview[0].id,'unclassified-citation');assert.equal(JSON.stringify(d),before);
  for(const f of ['struck','excluded'])for(const p of [0,1,Math.floor(term.length/2),term.length-1]){const bad=structuredClone(d);bad[f].push({start:p,end:p+1});assert.deepEqual(check(bad).issues,[],f+' '+kind+' '+p);}
  assert.deepEqual(check('“'+term+'”').issues,[],kind+' literal');
 }
 const text='(1 Able, The 3 Categories of Example Law (2d ed. 1776) p. 2, 2 employees.)',found=reviewStyleIssues(make(text),refs,{includeCompleteLcbReview:true,includeReviewSuggestions:true});
 assert.equal(found.filter(i=>i.checkId==='california-citation-unresolved-review').length,1);
 assert.deepEqual(found.filter(i=>i.checkId==='numerals').map(i=>[i.start,i.suggestion]),[[text.lastIndexOf('2 employees'),'two']]);
 assert.ok(!found.some(i=>i.checkId==='lcb-sentence-number-review'));
});
