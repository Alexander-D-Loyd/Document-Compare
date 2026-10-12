import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const cases=[['The applicant can not submit the form.','can not','cannot',3],['The applicant shall submit a resume.','resume','résumé',5],['The office shall review the resumes.','resumes','résumés',5],['Course instructors’ curriculum vitae or resumes are retained.','resumes','résumés',5],['The waiting cue contains applicants.','cue','queue',5],['The defendant has pled not guilty.','pled','pleaded',4]];
test('LCB noun and negative-modal checks require an explicit grammatical cue',()=>{
 for(const [bad,term,preferred,page] of cases){
  const doc=makeDocument([bad],'Current'),found=wordChoiceIssues(doc,refs);assert.equal(found.length,1,bad);
  assert.equal(found[0].suggestion,preferred);assert.equal(doc.text.slice(found[0].start,found[0].end),term);
  assert.equal(wordChoiceIssues(makeDocument([bad.replace(term,preferred)],'Current'),refs).length,0);
  assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion===preferred),bad);
  assert.ok(refs.lcb.pages[page-1].text.includes(preferred.replace(/s$/,'')),preferred);
 }
});
test('negative-modal alternatives, verbs, literal names and source strikeouts remain protected',()=>{
 for(const t of ['The agency shall resume operations.','The service resumes tomorrow.','A cue to act is required.','The visual cue is provided.','The applicant can not only submit but also amend the form.','The applicant can not attend but submit a written response.','The applicant can not attend and still qualify.','The applicant can not attend if they choose.','The applicant can either attend or not attend.','The Resume Service is named.','The term “can not submit” is literal.','The term "waiting cue is" is literal.'])assert.equal(wordChoiceIssues(makeDocument([t],'Current'),refs).length,0,t);
 for(const [bad] of cases){const doc=makeDocument([bad],'Current'),found=wordChoiceIssues(doc,refs)[0];doc.struck=[{start:found.start,end:found.end}];assert.equal(wordChoiceIssues(doc,refs).length,0,bad);}
});
test('noun and modal checks keep whole offsets through printed margin wrapping',()=>{
 const doc=makeDocument(['line 1 The applicant can\nline 2 not submit the form.'],'Current'),i=wordChoiceIssues(doc,refs)[0];
 assert.equal(i.suggestion,'cannot');assert.equal(doc.text.slice(i.start,i.end),'can\nline 2 not');
});
