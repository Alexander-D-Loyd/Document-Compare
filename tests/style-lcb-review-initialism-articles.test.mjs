import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbInitialismArticleReviewIssues} from '../app/style-lcb-review-initialism-articles.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const run=(text,options={})=>{const doc=makeDocument([text],'Current');return {doc,issues:lcbInitialismArticleReviewIssues(doc,refs,options)};};
test('unknown separated initials receive conditional sound review and whole selections',()=>{
 for(const phrase of ['a X.D.R.','a X-D-R','a X\u2010D\u2010R','A X.D.R.','an B.D.R.','An B-D-R','a X. D. R.']){
  const {doc,issues}=run('The office requires '+phrase+' assessment.');assert.equal(issues.length,1,phrase);assert.equal(issues[0].text,phrase);assert.equal(doc.text.slice(issues[0].start,issues[0].end),phrase);assert.equal(issues[0].suggestion,null);assert.equal(issues[0].reviewSuggested,true);assert.deepEqual(issues[0].references.map(r=>r.guideId),['lcb','gpo']);
 }
});
test('correct spoken-letter articles and unknown undivided acronyms remain clear',()=>{
 for(const phrase of ['an X.D.R.','a B-D-R','an M.F.R.','a XDR','an BDR','a XDR assessment and an BDR notice'])assert.equal(run('The office requires '+phrase+' assessment.').issues.length,0,phrase);
});
test('known word-pronounced acronyms retain their established exception even dotted',()=>{
 for(const phrase of ['a N.A.S.A.','an N.A.S.A.','a F-E-M-A','a N.A.T.O.','an U.N.E.S.C.O.','a H.U.D.','an H.U.D.'])assert.equal(run('The office requires '+phrase+' directive.').issues.length,0,phrase);
});
test('structural identifiers, label ranges and units are not article errors',()=>{
 for(const text of ['Type A X.D.R. applies.','Section A X.D.R. applies.','The office uses a X.D.R.-12 identifier.','The office reads a F-F range.','The office uses a F.F. measurement.','The office uses a X.D.R./2 code.','The office uses a X.D.R. A. label.'])assert.equal(run(text).issues.length,0,text);
});
test('quotes, headings, struck source and unknown exclusions cannot supply evidence',()=>{
 for(const text of ['The form says “a X.D.R. assessment.”','The form says \'a X.D.R. assessment.\'','A X.D.R. ASSESSMENT'])assert.equal(run(text).issues.length,0,text);
 const {doc}=run('The office requires a X.D.R. assessment.'),start=doc.text.indexOf('X.D.R.');
 for(const key of ['struck','excluded']){const changed={...doc,[key]:[{start:start+1,end:start+2}]};assert.equal(lcbInitialismArticleReviewIssues(changed,refs).length,0);}
});
test('partial letter chains, case damage and hard intra-initial breaks remain clear',()=>{
 for(const phrase of ['a X.\nD.R.','a X-\nD-R','a X.d.R.','a X-D-R-12','a X.D.R.X.D.R.X.D.R.','a X.D.R.\uFFFD'])assert.equal(run('The office requires '+phrase+' assessment.').issues.length,0,phrase);
});
test('existing precise findings take precedence without changing source',()=>{
 const {doc}=run('The office requires a X.D.R. assessment.'),saved=JSON.stringify(doc),start=doc.text.indexOf('a X.D.R.'),end=start+'a X.D.R.'.length;
 assert.equal(lcbInitialismArticleReviewIssues(doc,refs,{existingIssues:[{start,end,suggestion:'an X.D.R.'}]}).length,0);assert.equal(JSON.stringify(doc),saved);
});
