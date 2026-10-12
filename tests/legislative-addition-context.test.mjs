import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';import {legislativeContext} from '../app/legislative-context.mjs';
import {officeDefinitionContext} from '../app/office-definition-context.mjs';
import {moneyFormIssues}from '../app/style-money-forms.mjs';import fs from 'node:fs';
const make=body=>makeDocument(['SEC. 1. '+body],'Current');
test('real added-code introductions with explicit relative placement establish codified money context',()=>{
 const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
 for(const intro of ['Section 1714.02 is added to the Civil Code, immediately following Section 1714.01, to read:','Section 33325.5 is added to the Education Code, immediately following Section 33325, to read:','Article 2 is added to the Code of Civil Procedure, immediately preceding Article 3, to read:']){
  const d=make(intro+'\nPay $5.'),ctx=legislativeContext(d);assert.equal(ctx.moneyAt(d.text.indexOf('$5')),'Codified',intro);assert.ok(moneyFormIssues(d,refs).some(i=>i.text==='$5'));
 }
});
test('relative-placement grammar requires intact complete explicit statutory directive',()=>{
 for(const intro of ['Section 1714.02 is added to the Civil Code, immediately following a review, to read:','Section 1714.02 is added to the Civil Code, immediately following Section 1714.01 if approved, to read:'])assert.equal(legislativeContext(make(intro+'\nPay $5.')).sections[0].kind,'Unknown');
 const text='Section 1714.02 is added to the Civil Code, immediately following Section 1714.01, to read:\nPay $5.';
 for(const field of ['struck','excluded']){const d=make(text),at=d.text.indexOf('following');d[field].push({start:at,end:at+9});assert.equal(legislativeContext(d).sections[0].kind,'Unknown',field);}
});
test('subdivision-labelled uncodified findings preserve monetary exceptions and codified priority',()=>{
 for(const prefix of ['(a) ','(1) ','(a) (1) ']){const d=make(prefix+'The Legislature finds and declares that the amount is $5.');assert.equal(legislativeContext(d).moneyAt(d.text.indexOf('$5')),'UncodifiedFindings');}
 const d=make('Section 123 is added to the Education Code, to read:\n123. (a) The Legislature finds and declares that the amount is $5.');assert.equal(legislativeContext(d).moneyAt(d.text.indexOf('$5')),'Codified');
 for(const field of ['struck','excluded']){const d=make('(a) The Legislature finds and declares that the amount is $5.'),at=d.text.indexOf('Legislature');d[field].push({start:at,end:at+11});assert.equal(legislativeContext(d).sections[0].kind,'Unknown');}
});
test('statutory addition before the code name is codified, including the actual AB116 introduction',()=>{
 const d=make('Section 1385.001 is added to the Health and Safety Code, to read:\n1385.001. For the purposes of this article: “Department” means the Department of Managed Health Care.');
 const ctx=legislativeContext(d);assert.equal(ctx.sections[0].kind,'Codified');assert.equal(ctx.moneyAt(d.text.indexOf('Department')),'Codified');assert.equal(officeDefinitionContext(d,ctx).sections[0].code,'health and safety code');
});
test('singular and plural legislative objects retain added-code context through hierarchy',()=>{
 for(const intro of ['Sections 101 and 102 are added to the Government Code, to read:','Article 2 (commencing with Section 200) is added to Chapter 1 of Part 2 of Division 2 of the Health and Safety Code, to read:','Chapter 4 (commencing with Section 400) is added to Division 2 of the Education Code, to read:','Part 2 is added to Division 1 of the Financial Code, to read:','Division 7 is added to the Code of Civil Procedure, to read:'])assert.equal(legislativeContext(make(intro+'\nThe department shall act.')).sections[0].kind,'Codified',intro);
});
test('mere code references, findings and unrelated uncodified provisions retain their roles',()=>{
 for(const body of ['Section 123 is mentioned in the Education Code. The agency shall act.','Section 123 is added to a training plan for this act.','The agency refers to Section 123 of the Education Code.','Section 123 is added to the Education Code if approved.'])assert.equal(legislativeContext(make(body)).sections[0].kind,'Unknown',body);
 assert.equal(legislativeContext(make('The Legislature finds and declares that the Education Code is relevant.')).sections[0].kind,'UncodifiedFindings');
 assert.equal(legislativeContext(make('Section 123 of the Education Code is amended to read:\nThe agency shall act.')).sections[0].kind,'Codified');
});
test('addition introduction preserves line/page source bounds with identified heads',()=>{
 const d=makeDocument(['SEC. 1. Section 123 is added to the Education','AB 9999 — 2 —\nline 1 Code, to read:\nline 2 The agency shall act.'],'Current');d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};assert.equal(legislativeContext(d).sections[0].kind,'Codified');
});
test('struck, literal, table and unknown ignored addition introductions cannot establish codification',()=>{
 const d=make('Section 123 is added former to the Education Code, to read:\nThe agency shall act.'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.equal(legislativeContext(d).sections[0].kind,'Unknown');
 const quoted=make('The literal "Section 123 is added to the Education Code, to read:" remains.');assert.equal(legislativeContext(quoted).sections[0].kind,'Unknown');
 const u=make('Section 123 is added to the Education\nunknown marker\nCode, to read:\nThe agency shall act.'),b=u.blocks.find(b=>b.text==='unknown marker');b.ignored=true;u.excluded.push({start:b.start,end:b.end});assert.equal(legislativeContext(u).sections[0].kind,'Unknown');
 const t=make('Section 123 is added to the Education\nCode, to read:\nThe agency shall act.');t.blocks[1].formatting={headerGaps:[1,2]};assert.equal(legislativeContext(t).sections[0].kind,'Unknown');
});
