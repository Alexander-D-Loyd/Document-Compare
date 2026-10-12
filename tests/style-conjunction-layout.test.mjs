import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {contractionIssues} from '../app/style-contractions.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('LCB and/or check handles slash spacing and printed line wrapping as one finding',()=>{
 for(const form of ['and/or','and /or','and/ or','and / or','and\n/\nor']){
  const d=makeDocument(['The applicants '+form+' residents qualify.'],'Current'),issues=jointStylisticIssues(d,refs).filter(i=>i.rule==='Spelling and usage, item 4');assert.equal(issues.length,1,form);assert.equal(issues[0].suggestion,'or');assert.equal(d.text.slice(issues[0].start,issues[0].end),form);
 }
 const d=makeDocument(['line 1 The applicants and\nline 2 / or residents qualify.'],'Current');assert.equal(jointStylisticIssues(d,refs).filter(i=>i.rule==='Spelling and usage, item 4').length,1);
});
test('conjunction checks preserve literal words, titles, removed text and lexical boundaries',()=>{
 for(const t of ['The applicants or residents qualify.','The term “and / or” is literal.','The term "and / or" is literal.','The brand/origin applies.','The And/Or Foundation is named.'])assert.equal(jointStylisticIssues(makeDocument([t],'Current'),refs).filter(i=>i.rule==='Spelling and usage, item 4').length,0,t);
 const d=makeDocument(['The applicants and / or residents qualify.'],'Current');d.struck=[{start:15,end:23}];assert.equal(jointStylisticIssues(d,refs).filter(i=>i.rule==='Spelling and usage, item 4').length,0);
});
test('contraction matching requires complete Unicode tokens and preserves unfamiliar suffixes',()=>{
 for(const t of ["The xdon't identifier applies.","The don'té identifier applies.","The contractor's work applies.","The unknown it's've label applies.","The term “'tis required” is literal."])assert.equal(contractionIssues(makeDocument([t],'Current'),refs).length,0,t);
 for(const t of ["Where'd the agency proceed?","The agency might've proceeded.","The agency says ’tis required."]){const d=makeDocument([t],'Current'),issues=contractionIssues(d,refs);assert.equal(issues.length,1,t);assert.equal(d.text.slice(issues[0].start,issues[0].end),issues[0].text);}
});
