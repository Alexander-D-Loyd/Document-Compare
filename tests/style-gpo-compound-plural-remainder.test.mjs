import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {compoundPluralIssues} from '../app/style-compound-plurals.mjs';
import {GPO_58_SOURCE_FORMS,GPO_58_REMAINDER_VARIANTS} from '../app/data/gpo-compound-plural-source.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>compoundPluralIssues(makeDocument([text],'Current'),refs);
test('all 55 physical GPO 5.8 rows retain the printed plural-word identity and stay quiet',()=>{
 assert.equal(GPO_58_SOURCE_FORMS.length,55);assert.deepEqual(Object.fromEntries(['first','middle','last'].map(position=>[position,GPO_58_SOURCE_FORMS.filter(r=>r.position===position).length])),{first:35,middle:4,last:16});
 const text=refs.gpo.pages[102].text.replace(/\s+/gu,' ');
 for(const r of GPO_58_SOURCE_FORMS){assert.ok(text.includes(r.form),r.form);assert.equal(check('The '+r.form+' are eligible.').length,0,r.form);}
});
test('the additional exact first and middle-word variants have one complete selection and source citation',()=>{
 for(const r of GPO_58_REMAINDER_VARIANTS){const text='The '+r.variant+' are eligible.',found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,r.preferred);assert.equal(found[0].text,r.variant);assert.equal(found[0].guidePage,103);assert.equal(text.slice(found[0].start,found[0].end),r.variant);}
 assert.equal(check('One chargé d’affaires is appointed. A sergeant at arms is appointed.').length,0);
 assert.equal(check("Two chargé d'affaires are appointed.")[0].suggestion,"chargés d'affaires");
});
test('every original source or plural-cue character is required under both removal channels',()=>{
 for(const r of GPO_58_REMAINDER_VARIANTS){
  const text='The '+r.variant+' are eligible.',[finding]=check(text);
  for(let i=finding.evidenceStart;i<finding.evidenceEnd;i++)for(const channel of ['struck','excluded']){
   const doc=makeDocument([text],'Current');doc[channel].push({start:i,end:i+1});assert.equal(compoundPluralIssues(doc,refs).length,0,r.variant+' '+channel+' '+i);
  }
 }
});
test('quoted source, defined terms, names, headings and unknown source remain protected',()=>{
 for(const r of GPO_58_REMAINDER_VARIANTS){
  assert.equal(check('The “'+r.variant+'” are eligible.').length,0);
  assert.equal(check('The term “'+r.variant+'” means the staff. The '+r.variant+' are eligible.').length,0);
  assert.equal(check('The '+r.variant+' Council is established.').length,0);
 }
});
