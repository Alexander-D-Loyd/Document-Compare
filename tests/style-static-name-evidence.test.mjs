import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {stylisticIssues,STYLE_RULES} from '../app/gpo-style.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),rules=STYLE_RULES.filter(r=>['3.3','3.18'].includes(r.rule)),check=d=>stylisticIssues(d,refs.gpo,rules,{dynamic:false});
test('generic source-match scope distinguishes matched spans from unproved noun roles and meaning',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete generic source-match evidence');assert.match(row.text,/does not supply dynamic modifier noun-head evidence/);const item=styleRuleInventory(refs).find(r=>r.id==='gpo-3.18');assert.equal(item.status,'Partially automated');assert.match(item.scope,/authentic organization identity remain manual/);const country=styleRuleInventory(refs).find(r=>r.id==='gpo-3.3');assert.equal(country.status,'Partially automated');assert.match(country.scope,/not universal proper-name coverage/);
});
test('a generic full-name fallback cannot use unknown excluded source words as spaces',()=>{
 for(const text of ['The united unknown states congress shall act.','The united unknown nations act.','The environmental unknown protection agency acts.','The department unknown of agriculture acts.']){const d=make(text),start=d.text.indexOf('unknown');d.excluded.push({start,end:start+7});assert.equal(check(d).length,0,text);assert.equal(jointStylisticIssues(d,refs).filter(i=>['3.3','3.18'].includes(i.rule)).length,0,text);}
});
test('original selected-name boundaries remain complete even when adjacent Unicode letters are hidden',()=>{
 for(const text of ['The αunited states act.','The united statesα act.','The united states\u0301 act.']){const d=make(text),at=/[α\u0301]/u.exec(d.text);d.excluded.push({start:at.index,end:at.index+at[0].length});assert.equal(check(d).length,0,text);}
});
test('known interior page labels preserve the complete generic country-name selection',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The united','AB 9999 — 2 —\nline 1 states act.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const before=JSON.stringify(d),r=check(d);assert.equal(r.length,1);assert.equal(r[0].suggestion,'United States');assert.equal(r[0].start,d.text.indexOf('united'));assert.equal(r[0].end,d.text.indexOf('states act')+6);assert.equal(JSON.stringify(d),before);
});
test('an intact country name keeps its independent correction outside uncertain constitutional identity',()=>{
 const d=make('The constitution unknown of the united states applies.'),at=d.text.indexOf('unknown');d.excluded.push({start:at,end:at+7});const r=jointStylisticIssues(d,refs);assert.deepEqual(r.map(i=>i.suggestion),['United States']);assert.equal(r[0].text,'united states');assert.equal(r[0].rule,'3.3');assert.equal(r[0].guidePage,41);
});
