import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbRoleFormIssues} from '../app/style-lcb-role-forms.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>lcbRoleFormIssues(makeDocument([text],'Current'),refs);
const pairs=[['case-law','case law',9],['collective-bargaining','collective bargaining',9],['end-use','end use',10],['life-cycle','life cycle',11],['off-ramp','off ramp',12],['parking-lot','parking lot',12],['power-of-attorney','power of attorney',13],['vice-chairperson','vice chairperson',14]];

test('listed LCB compound nouns are checked in explicit modal objects and imperative objects',()=>{
 for(const [variant,preferred,page] of pairs){
  assert.ok(refs.lcb.pages[page-1].text.includes(preferred));
  for(const text of [`The agency shall retain ${variant}.`,`The agency may not reject ${variant} under this section.`,`Provide ${variant}.`]){
   const issues=check(text);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,preferred,text);
   assert.equal(text.slice(issues[0].start,issues[0].end),variant,text);
   assert.equal(check(text.replace(variant,preferred)).length,0);
   assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion===preferred),text);
  }
 }
});

test('determined nouns with clause-ending punctuation retain source-listed noun forms',()=>{
 for(const [variant,preferred] of pairs)for(const tail of ['.', '; the record remains valid.', ', and the record remains valid.', ' under this section.']){
  const text=`The agency reviews the ${variant}${tail}`,issues=check(text);
  assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,preferred);
  assert.equal(check(text.replace(variant,preferred)).length,0);
 }
});

test('unit modifiers, uncertain verbs, names, literals and removed compound nouns remain protected',()=>{
 for(const text of [
  'The agency shall retain life-cycle analysis.',
  'The agency shall provide end-use rights.',
  'The agency shall retain case-law research.',
  'The agency shall reject parking-lot design.',
  'The agency shall require full-time, temporary workers.',
  'The agency shall provide the full-time, part-time, or temporary staff.',
  'The agency shall require full-time: temporary workers.',
  'The agency shall loan-shark.',
  'The worker plans to loan-shark.',
  'The agency might have reviewed case-law.',
  'The Case-Law Institute shall act.',
  'The term “shall retain case-law” is literal.',
  'The term "Provide case-law." is literal.',
  'The agency shall retain case-law.............100',
 ])assert.equal(check(text).length,0,text);
 assert.equal(check('The passage calls the instruction Provide'+' '.repeat(93)+'case-law.').length,0,'Clipping context cannot invent an imperative sentence boundary');
 const doc=makeDocument(['The agency shall retain case-law.'],'Current');doc.struck=[{start:24,end:32}];assert.equal(lcbRoleFormIssues(doc,refs).length,0);
});

test('noun-object checks preserve printed margin and page offsets without including their noun complement',()=>{
 const first=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\nThe People of the State of California do enact as follows:\nline 1 Provide case-law.'],'Current');
 assert.equal(lcbRoleFormIssues(first,refs)[0]?.suggestion,'case law','The enacting boundary starts the body imperative');
 const doc=makeDocument(['line 1 The agency shall retain case-','line 1 law under this section.'],'Current');
 assert.equal(lcbRoleFormIssues(doc,refs).length,0,'A permanent hyphen split across a page remains an uncertain source reading here');
 const wrapped=makeDocument(['line 1 The agency shall retain power\nline 2 of-attorney under this section.'],'Current'),issue=lcbRoleFormIssues(wrapped,refs)[0];
 assert.equal(issue.suggestion,'power of attorney');assert.equal(wrapped.text.slice(issue.start,issue.end),'power\nline 2 of-attorney');
 const boundary=makeDocument(['line 1 The agency shall retain','line 1 case-law under this section.'],'Current'),i=lcbRoleFormIssues(boundary,refs)[0];
 assert.equal(i.suggestion,'case law');assert.equal(boundary.text.slice(i.start,i.end),'case-law');
});
