import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbSourceReviewIssues,lcbSourceReviewRows} from '../app/style-lcb-source-review.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>lcbSourceReviewIssues(makeDocument([t],'Current'),refs);

test('unfamiliar heads and productive endings receive questions without guessed corrections',()=>{
 const doc=makeDocument(['The panel considers in kind thermotherapy and school based textiles. An asteroid related protocol applies.'],'Current');
 const before=JSON.stringify(doc),issues=lcbSourceReviewIssues(doc,refs);
 for(const term of ['in kind','school based','asteroid related'])assert.ok(issues.some(i=>i.matchText===term),term);
 for(const issue of issues){assert.equal(issue.suggestion,null);assert.equal(issue.reviewSuggested,true);assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.match(issue.message,/may be correct/);assert.ok(issue.references.every(r=>r.guideId==='lcb'));}
 assert.equal(JSON.stringify(doc),before);
});
test('competing printed noun and modifier roles remain a single explicit question',()=>{
 const found=check('Staff have full time obligations. The release is hands free.');
 assert.deepEqual(found.map(i=>i.matchText),['full time','hands free']);
 assert.ok(found[0].references.some(r=>r.rule==='full time'));
 assert.ok(found[0].references.some(r=>r.rule==='full-time (u.m.)'));
 assert.equal(check('The objects are accessories. This is an accessory.').length,0);
});
test('unlisted separated prefixes ask about the complete word without joining arbitrary roots',()=>{
 const found=check('A bi-astronomical and multi-galactic criterion is non-zoological and in-operable.');
 assert.deepEqual(found.map(i=>i.matchText),['bi-astronomical','multi-galactic','non-zoological','in-operable']);
 assert.ok(found.every(i=>i.suggestion===null));
 assert.equal(check('The books are in active use. A non sequitur and multi ply process are discussed.').length,0);
});
test('precise results own overlaps and desktop complete mode is explicit',()=>{
 const doc=makeDocument(['The board provides other in kind or cash assistance. An asteroid related protocol applies.'],'Current');
 const precise=reviewStyleIssues(doc,refs,{includeReviewSuggestions:true}),full=reviewStyleIssues(doc,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
 assert.deepEqual(full.filter(i=>i.matchText==='in kind'||i.text==='in kind').map(i=>i.suggestion),['in-kind']);
 assert.ok(full.some(i=>i.checkId==='lcb-source-form-review'&&i.matchText==='asteroid related'));
 assert.ok(!precise.some(i=>i.checkId==='lcb-source-form-review'));
 assert.equal(lcbSourceReviewIssues(doc,refs,{existingIssues:[{start:doc.text.indexOf('asteroid'),end:doc.text.indexOf('protocol')}]}).some(i=>i.matchText==='asteroid related'),false);
});
test('every source table row retains its exact page and text; full automation is not inferred',()=>{
 const rows=lcbSourceReviewRows(refs.lcb),lexical=rows.filter(r=>r.id.startsWith('lcb-source-'));
 assert.equal(lexical.length,663);
 for(const row of lexical)assert.ok(refs.lcb.pages.find(p=>p.page===row.page).lexicalEntries.includes(row.text),row.id);
 assert.equal(rows.filter(r=>r.page===15).length,47);
 assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
});
test('source quotes, names, identifiers, rhetorical dashes and headings are protected',()=>{
 for(const text of ['The terms “in kind” and ‘school based’ and \'full time\' are literal.','The School Based Institute has operated.','The in kindα protocol applies.','The asteroid—related protocol applies.','https://example.test/school-based/record'])assert.equal(check(text).length,0,text);
 const heading=makeDocument(['ASSEMBLY BILL\nSchool Based\nLEGISLATIVE COUNSEL’S DIGEST\nThis bill addresses school based textiles.\nThe people do enact as follows:\nStaff study in kind thermotherapy.'],'Current');
 assert.deepEqual(lcbSourceReviewIssues(heading,refs).map(i=>i.context),['Digest','Bill']);
});
test('every character of the candidate remains protected from strikes and unknown exclusions',()=>{
 for(const term of ['in kind','bi-astronomical','asteroid related']){
  const doc=makeDocument(['The panel studies '+term+' textiles.'],'Current'),start=doc.text.indexOf(term);
  assert.ok(lcbSourceReviewIssues(doc,refs).some(i=>i.matchText===term),term);
  for(let p=start;p<start+term.length;p++){
   const struck=structuredClone(doc);struck.struck=[{start:p,end:p+1}];
   assert.ok(!lcbSourceReviewIssues(struck,refs).some(i=>i.start<=p&&i.end>p),term+' struck '+p);
   const excluded=structuredClone(doc);excluded.excluded.push({start:p,end:p+1});
   assert.ok(!lcbSourceReviewIssues(excluded,refs).some(i=>i.start<=p&&i.end>p),term+' excluded '+p);
  }
 }
});
test('recognized margins and word divisions retain physical source selections',()=>{
 const doc=makeDocument(['line 1 The staff study school\nline 2 based textiles and in\nline 3 kind thermotherapy.'],'Current');
 const issues=lcbSourceReviewIssues(doc,refs);assert.deepEqual(issues.map(i=>i.matchText),['school based','in kind']);
 for(const i of issues)assert.equal(doc.text.slice(i.start,i.end),i.text);
 const split=makeDocument(['line 1 A hands-','line 1 free observation applies.'],'Current',[],[],new Set(['hands-free']));
 const found=lcbSourceReviewIssues(split,refs);assert.ok(found.length);for(const i of found)assert.equal(split.text.slice(i.start,i.end),i.text);
});
test('missing source witnesses do not manufacture authority',()=>{
 const changed=structuredClone(refs);changed.lcb.pages=changed.lcb.pages.filter(p=>p.page!==16);changed.lcb.pages.find(p=>p.page===11).lexicalEntries=changed.lcb.pages.find(p=>p.page===11).lexicalEntries.filter(e=>e!=='in-kind (u.m.)');
 assert.equal(lcbSourceReviewIssues(makeDocument(['The panel studies in kind textiles and asteroid related protocols.'],'Current'),changed).length,0);
 assert.deepEqual(lcbSourceReviewIssues(makeDocument(['An in kind protocol applies.'],'Current'),{}),[]);
});
test('directly established printed capitalization conditions do not generate repetitive questions',()=>{
 assert.deepEqual(check('The court shall apply Section 12 of this code in this state. This section governs the court.'),[]);
 assert.ok(check('The court of appeals shall act.').some(i=>i.references.some(r=>r.rule.includes('(U.S.)'))),'Jurisdiction remains an unresolved source condition.');
 assert.ok(check('This section 12 governs.').some(i=>i.matchText==='section'),'An observed number cannot borrow the standalone lowercase exception.');
});

test('printed internal capitals do not hide source-form variants or authorize larger names',()=>{
 for(const term of ['African-American','Asian-American','Mexican-American','limited-English-proficiency','limited english proficiency','conflict of interest code']){
  const text='The staff study '+term+' carefully.',found=check(text),i=found.find(i=>i.text===term);
  assert.ok(i,term);assert.equal(i.suggestion,null);assert.ok(i.references.some(r=>r.rule.toLowerCase().replace(/[ -]/gu,'')===term.toLowerCase().replace(/[ -]/gu,'')));
  const doc=makeDocument([text],'Current'),at=text.indexOf(term);for(const field of ['struck','excluded']){const d=structuredClone(doc);d[field].push({start:at+1,end:at+2});assert.ok(!lcbSourceReviewIssues(d,refs).some(i=>i.text===term));}
 }
 for(const text of ['The African-American Institute has operated.','The Limited English Proficiency Foundation has operated.','The staff study African American carefully.','The staff study limited English proficiency carefully.'])assert.deepEqual(check(text),[],text);
});

test('ordinary approved determiner phrases and Bill state references do not create repetitive questions',()=>{
 for(const text of ['The approved budget applies.','This adopted measure is effective.','The board has approved this report.','The state administers this law. The constitutional amendment is discussed separately.'])assert.deepEqual(check(text),[],text);
 assert.ok(check('The board approved protocol applies.').some(i=>i.text==='board approved'));
 const d=makeDocument(['ASSEMBLY CONSTITUTIONAL AMENDMENT\nThe people do enact as follows:\nThe state shall act.'],'ACA 1');assert.ok(lcbSourceReviewIssues(d,refs).some(i=>i.text==='state'));
});
test('intact numbered Schedule forms and ordinary lower-case schedule nouns settle their printed condition',()=>{
 for(const text of ['The funds in Schedule (1)(d) are available.','The allocation follows Schedule 12.','The payment schedule applies.','The schedule may provide an earlier transfer.'])assert.deepEqual(check(text),[],text);
 for(const text of ['The funds in schedule (1)(d) are available.','The funds in Schedule are available.','The funds in Schedule (1α) are available.'])assert.ok(check(text).some(i=>i.matchText.toLowerCase()==='schedule'),text);
 for(const field of ['struck','excluded']){const text='The funds in Schedule (1)(d) are available.',doc=makeDocument([text],'Current'),at=text.indexOf('(1)');for(let p=at;p<at+6;p++){const d=structuredClone(doc);d[field].push({start:p,end:p+1});assert.ok(lcbSourceReviewIssues(d,refs).some(i=>i.matchText==='Schedule'),field+' '+p);}const lower=makeDocument(['The funds in schedule 12 are available.'],'Current'),n=lower.text.indexOf('12');lower[field].push({start:n,end:n+2});assert.ok(lcbSourceReviewIssues(lower,refs).some(i=>i.matchText==='schedule'));}
 const physical=makeDocument(['line 1 The funds in Schedule\nline 2 (1)(d) are available.'],'Current');assert.deepEqual(lcbSourceReviewIssues(physical,refs),[]);
});
test('suspended source compounds stay whole and a medical adjective does not establish program identity',()=>{
 for(const text of ['The rent is paid in full.','The full cost is recovered.','The medical device is registered.','Medical information is confidential.'])assert.ok(!check(text).some(i=>/^(?:full|medical)$/iu.test(i.matchText)),text);
 for(const term of ['full or part time','full- or part time']){const text='The '+term+' thermotherapists are covered.',found=check(text);assert.ok(found.some(i=>i.matchText===term&&i.references.some(r=>r.rule==='full- or part-time (u.m.)')),term);assert.ok(!found.some(i=>i.matchText==='full'||i.matchText==='part time'));}
 for(const term of ['MediCal','medi-cal','Medi Cal'])assert.ok(check('The panel reviews '+term+' service.').some(i=>i.matchText===term),term);
});
