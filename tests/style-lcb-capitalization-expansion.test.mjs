import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {capitalizationIssues} from '../app/style-capitalization.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs).filter(i=>i.checkId==='capitalization');
test('expanded source-listed names and descriptions preserve internal capitals',()=>{
 for(const [bad,good] of [['alzheimer’s Disease','Alzheimer’s disease'],['down Syndrome','Down syndrome'],['calworks Program','CalWORKs program'],['medi-cal Program','Medi-Cal program'],['medicaid Program','Medicaid program'],['mediterranean Fruit Fly','Mediterranean fruit fly'],['short-doyle Plan','Short-Doyle plan'],['e. Coli','E. coli'],['Vitamin c','vitamin C'],['Emergency Medical Technician ii','emergency medical technician II'],['Acquired Immunodeficiency Syndrome','acquired immunodeficiency syndrome']]){
  const found=check('The text concerns '+bad+'.');assert.ok(found.some(i=>i.suggestion===good),bad);assert.equal(check('The text concerns '+good+'.').length,0,good);
 }
});
test('formal numbered executive orders and named programs keep their explicit forms',()=>{
 assert.ok(check('An Executive Order applies.').some(i=>i.suggestion==='executive order'));
 for(const text of ['Executive Order No. 34 applies.','The Executive Order 34 applies.','The In-Home Supportive Services program applies.','The in-home supportive services apply.','The Superior Court of Los Angeles County acts.','Armed Services Committee members act.','A citation to a budget act includes all acts amending that budget act.','The In-Home Supportive Services (IHSS) program applies.','In-Home Supportive Services II (Ch. 445, Stats. 2000) applies.'])assert.equal(check(text).length,0,text);
 assert.ok(check('The budget act of 2026 applies.').some(i=>i.suggestion==='Budget Act'));
 assert.ok(check('The in-home supportive services (IHSS) program applies.').some(i=>i.suggestion==='In-Home Supportive Services'));
 assert.ok(check('The in-home supportive services Program applies.').some(i=>i.suggestion==='In-Home Supportive Services program'));
});
test('removed source text remains excluded from newly listed capitalization checks',()=>{
 const doc=makeDocument(['The vitamin c is present.'],'Current');doc.struck=[{start:4,end:13}];assert.equal(capitalizationIssues(doc,refs).length,0);
});
