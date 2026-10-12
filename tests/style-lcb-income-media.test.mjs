import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {lcbRoleFormIssues} from '../app/style-lcb-role-forms.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {lcbExpressionIssues} from '../app/style-lcb-expressions.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('LCB higher and lower income modifiers follow the shared GPO comparative rule',()=>{
 assert.ok(refs.gpo.pages[115].text.includes('lower income group'));
 for(const prefix of ['higher','lower'])for(const head of ['households','families','residents','individuals','persons','people','workers','groups','brackets','communities','taxpayers','neighborhoods','areas']){
  const bad='Support '+prefix+'-income '+head+'.',doc=makeDocument([bad],'Current'),i=lcbRoleFormIssues(doc,refs)[0];assert.equal(i.suggestion,prefix+' income');assert.equal(bad.slice(i.start,i.end),prefix+'-income');assert.equal(lcbRoleFormIssues(makeDocument([bad.replace(prefix+'-income',prefix+' income')],'Current'),refs).length,0);assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion===prefix+' income'),bad);
 }
 for(const t of ['The lower-income formula is named.','The Higher-Income Households Program is named.','The term “higher-income groups” is literal.'])assert.equal(lcbRoleFormIssues(makeDocument([t],'Current'),refs).length,0,t);
});
test('CD-ROM has explicit device evidence and checks uppercase misspellings as well as lowercase',()=>{
 for(const bad of ['cdrom','cd rom','cd-rom','CDROM','Cd-rom']){
  const text='The '+bad+' drive is used.',doc=makeDocument([text],'Current'),i=wordChoiceIssues(doc,refs)[0];assert.equal(i.suggestion,'CD-ROM');assert.equal(text.slice(i.start,i.end),bad);assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion==='CD-ROM'),text);
 }
 for(const text of ['The CD-ROM drive is used.','The CDROM Service is named.','The cdrom label is quoted.','The term “cdrom drive” is literal.'])assert.equal(wordChoiceIssues(makeDocument([text],'Current'),refs).length,0,text);
});
test('mid-fiscal year is a whole listed phrase and preserves the fiscal-year noun',()=>{
 for(const bad of ['mid fiscal year','mid-fiscal-year','midfiscal year']){
  const text='The allocation changes at '+bad+'.',doc=makeDocument([text],'Current'),i=lcbExpressionIssues(doc,refs)[0];assert.equal(i.suggestion,'mid-fiscal year');assert.equal(text.slice(i.start,i.end),bad);assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion==='mid-fiscal year'));
 }
 for(const text of ['The allocation changes at mid-fiscal year.','The term “mid fiscal year” is literal.','The Mid Fiscal Year Act is named.'])assert.equal(lcbExpressionIssues(makeDocument([text],'Current'),refs).length,0,text);
});
