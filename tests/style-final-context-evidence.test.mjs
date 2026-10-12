import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {finalLcbContextIssues} from '../app/style-lcb-final-contexts.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {LCB_MAPPED_CONTEXTS} from '../app/lcb-mapped-contexts.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>finalLcbContextIssues(d,refs);
const cases=[['The budget bill for fiscal year 2025-26 shall apply.','2025-26','Budget Bill'],['The California State controller Jane Doe shall act.','State','Controller'],['The California State treasurer Jane Doe shall act.','Jane Doe','Treasurer'],['The general fund of the State of California shall retain reserves.','State of California','General Fund'],['A Constitutional Clause prohibits the action.','prohibits','constitutional clause'],['The East Los Angeles portion of the city is described.','portion of the city','east Los Angeles'],['Each Regular Session of the Legislature shall convene.','Legislature','regular session'],['Each member elected to the California Legislature shall act.','elected to the California Legislature','Member']];
test('the complete supporting referent or role cannot bridge struck wording',()=>{
 for(const [text,evidence,suggestion]of cases){const d=make(text);assert.ok(check(d).some(i=>i.suggestion===suggestion),text);const start=d.text.indexOf(evidence);d.struck=[{start,end:start+evidence.length}];assert.equal(check(d).length,0,text);const w=make(text),gap=start-1;assert.equal(w.text[gap],' ');w.struck=[{start:gap,end:gap+1}];assert.equal(check(w).length,0,text+' struck evidence gap');}
});
test('interior and lookahead table rows cannot establish the contextual capitalization referent',()=>{
 for(const [text,evidence]of cases){const at=text.indexOf(evidence),d=make(text.slice(0,at)+'\n'+text.slice(at));d.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.equal(check(d).length,0,text);}
});
test('unknown ignored or excluded fragments cannot manufacture a complete source referent',()=>{
 for(const [text,evidence]of cases){const at=text.indexOf(evidence),d=make(text.slice(0,at)+'\nunknown marker\n'+text.slice(at)),b=d.blocks.find(b=>b.text==='unknown marker');b.ignored=true;d.excluded.push({start:b.start,end:b.end});assert.equal(check(d).length,0,text);const e=make(text.slice(0,at)+'unknown '+text.slice(at)),start=e.text.indexOf('unknown ');e.excluded.push({start,end:start+8});assert.equal(check(e).length,0,text);}
});
test('full source word boundaries reject extended predicate and jurisdiction tokens',()=>{
 for(const text of ['A Constitutional Clause prohibitsα the action.','Each Regular Session of the Legislature shallα convene.','Each member elected to the California Legislature shallα act.','The general fund of the State of Californiaα applies.','The California State controller Jane Doe shallα act.'])assert.equal(check(make(text)).length,0,text);
});
test('known page labels preserve the exact term selection and do not mutate source metadata',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The general fund of the State of','AB 9999 — 2 —\nline 1 California shall retain reserves.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const before=JSON.stringify(d),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),['General Fund']);assert.equal(r[0].text,'general fund');assert.equal(JSON.stringify(d),before);
});
test('protected contextual referent evidence leaves an independent numeral review active',()=>{
 const d=make('The general fund of the State\nof California has 3 public members.');const start=d.text.indexOf('of California');d.struck=[{start,end:start+13}];assert.equal(check(d).length,0);assert.ok(jointStylisticIssues(d,refs).some(i=>i.text==='3'&&i.suggestion==='three'));
});
test('unrelated excluded wording does not suppress independently intact state-title evidence',()=>{
 const d=make('unknown marker\nThe California State controller Jane Doe shall act.'),b=d.blocks[0];b.ignored=true;d.excluded.push({start:b.start,end:b.end});const before=JSON.stringify(d);assert.deepEqual(check(d).map(i=>i.suggestion),['Controller']);assert.equal(JSON.stringify(d),before);
});
test('mapped source entries and searchable coverage retain complete evidence and semantic limits',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Explicit contextual capitalization evidence');assert.match(row.text,/complete matched referent/);assert.match(row.text,/legal status remain manual/);assert.ok(LCB_MAPPED_CONTEXTS.slice(0,11).every(r=>/complete matched context/.test(r.scope)));const records=styleRuleInventory(refs).filter(r=>r.guide==='lcb'&&/formerly lookahead-only/.test(r.scope||''));assert.ok(records.length);assert.ok(records.every(r=>r.status==='Partially automated'));
});
