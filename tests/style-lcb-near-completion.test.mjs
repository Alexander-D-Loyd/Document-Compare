import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {contractionIssues,CONTRACTION_FORMS} from '../app/style-contractions.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const selected=doc=>jointStylisticIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs).filter(i=>i.guideId==='lcb'&&['Preferred spelling','Contractions'].includes(i.category));
test('LCB adviser and judgment preferences include regular plurals and source-preserving possessive nouns',()=>{
 for(const [variant,preferred]of [['advisors','advisers'],['judgements','judgments'],["advisors’",'advisers'],["judgements’",'judgments'],["advisor’s",'adviser'],["judgement’s",'judgment']]){
  const text='The '+variant+' authority applies.',d=makeDocument([text],'Current'),issues=selected(d);assert.equal(issues.length,1,variant);assert.equal(issues[0].suggestion,preferred);assert.equal(d.text.slice(issues[0].start,issues[0].end),variant.replace(/[’']s?$|[’']$/u,''));
  assert.equal(selected(text.replace(variant,variant.replace(/advisors?/,'adviser'+(variant.startsWith('advisors')?'s':'')).replace(/judgements?/,'judgment'+(variant.startsWith('judgements')?'s':'')))).length,0);
 }
});
test('plural office preferences do not restyle names, literals, unknown derivatives or damaged word suffixes',()=>{
 for(const text of ['The Board of Advisors shall meet.','The term “advisors” means the listed persons.','The term "judgements" is quoted.','The judgemental clause applies.','The advisorsé identifier applies.','The advisors\u0301 identifier applies.'])assert.equal(selected(text).length,0,text);
 const text='The advisorsx shall report.',d=makeDocument([text],'Current');d.struck=[{start:text.indexOf('x'),end:text.indexOf('x')+1}];assert.equal(selected(d).length,0);
});
test('contractions retain complete original Unicode word boundaries',()=>{
 for(const form of CONTRACTION_FORMS)for(const affix of ['\u0301','é','2','_']){
  for(const text of [affix+form.form+' applies.',form.form+affix+' applies.'])assert.equal(contractionIssues(makeDocument([text],'Current'),refs).length,0,text);
 }
});
test('source deletion or exclusion cannot manufacture a contraction token at either edge',()=>{
 for(const form of ["can't","she's","'tis","they'd've"]){
  for(const before of [true,false])for(const kind of ['struck','excluded']){
   const text=before?'x'+form+' applies.':form+'x applies.',d=makeDocument([text],'Current'),start=before?0:form.length;
   d[kind]=[...(d[kind]||[]),{start,end:start+1}];assert.equal(contractionIssues(d,refs).length,0,JSON.stringify({form,before,kind}));
   assert.equal(selected(d).filter(i=>i.category==='Contractions').length,0,'Joint review must not restore a rejected contraction');
  }
 }
});
test('a contraction in a wrapped quotation remains literal source copy',()=>{
 const text='The quoted text reads "a clause\ncan’t apply" to the stated example.';
 assert.equal(contractionIssues(makeDocument([text],'Current'),refs).length,0);
 assert.equal(selected(text).length,0);
});
test('valid contraction findings preserve exact words, explicit alternatives and independent source evidence',()=>{
 const text='She’s eligible. They’d’ve applied. The contractors’ work applies.',d=makeDocument([text],'Current'),issues=contractionIssues(d,refs);
 assert.deepEqual(issues.map(i=>i.text),['She’s','They’d’ve']);assert.deepEqual(issues[0].alternatives,['She is','She has']);assert.deepEqual(issues[1].alternatives,['They would have']);
 assert.ok(issues.every(i=>d.text.slice(i.start,i.end)===i.text));assert.equal(selected(d).filter(i=>i.category==='Contractions').length,2);
});
