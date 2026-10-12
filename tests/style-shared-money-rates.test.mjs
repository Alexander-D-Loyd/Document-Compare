import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {sharedModifierIssues} from '../app/style-shared-modifiers.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current');
test('the explicit GPO money-rates head produces a complete term-series correction',()=>{
 assert.ok(refs.gpo.pages[116].text.includes('long- and short-term money rates'));
 for(const phrase of ['long and short-term','long and short term','long- and short term']){
  const d=make('The agency provides '+phrase+' money rates.'),before=JSON.stringify(d),r=jointStylisticIssues(d,refs);
  assert.equal(r.length,1,phrase);assert.equal(r[0].text,phrase);assert.equal(r[0].suggestion,'long- and short-term');assert.equal(r[0].checkId,'shared-modifiers');assert.equal(JSON.stringify(d),before);
 }
 assert.equal(jointStylisticIssues(make('The agency provides long- and short-term money rates.'),refs).length,0);
});
test('money-rate support requires both complete source words and protected supporting evidence',()=>{
 for(const tail of ['money ratesα','money rates\u0301','money rates2','money rates_','moneyα rates','money assets','money is available'])assert.equal(sharedModifierIssues(make('The long and short-term '+tail+'.'),refs).length,0,tail);
 const d=make('The long and short-term money rates are available.'),at=d.text.indexOf('money');d.struck=[{start:at,end:at+5}];assert.equal(sharedModifierIssues(d,refs).length,0);
 const e=make('The long and short-term money unknown rates are available.'),start=e.text.indexOf('unknown');e.excluded.push({start,end:start+7});assert.equal(sharedModifierIssues(e,refs).length,0);
 for(const t of ['The title "long and short-term money rates" is literal.','The long and short-term money\nrates........100'])assert.equal(sharedModifierIssues(make(t),refs).length,0);
});
test('a money-rate head across known source page labels retains only the complete modifier selection',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The long and short term money','AB 9999 — 2 —\nline 1 rates are available.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const r=jointStylisticIssues(d,refs);assert.equal(r.length,1);assert.equal(r[0].text,'long and short term');assert.equal(r[0].suggestion,'long- and short-term');assert.equal(r[0].end,d.text.indexOf(' money'));
 const e=make('The long and short term money\nunknown marker\nrates are available.'),b=e.blocks[1];b.ignored=true;e.excluded.push({start:b.start,end:b.end});assert.equal(sharedModifierIssues(e,refs).length,0);
});
