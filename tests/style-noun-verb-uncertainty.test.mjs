import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {listedNounIssues} from '../app/style-listed-nouns.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>listedNounIssues(d,refs),cases=[['The agency shall let the child care for the pets.','child care','pets'],['The water courses through the ditch.','water courses','ditch'],['The staff shall let the cash flow slowly.','cash flow','slowly'],['The agency shall let the land fill with soil.','land fill','soil']];
test('uncertain complete source verb constructions do not become positive compound-noun findings',()=>{
 for(const [text,term,word]of cases)for(const field of ['struck','excluded']){const d=make(text),at=text.indexOf(word)+1;d[field].push({start:at,end:at+1});const saved=JSON.stringify(d);assert.equal(check(d).length,0,text+' '+field);assert.ok(!jointStylisticIssues(d,refs).some(i=>i.checkId==='listed-nouns'),text+' combined');assert.equal(JSON.stringify(d),saved);}
});
test('uncertain original connecting spaces and preceding causal words preserve ambiguous verb protection',()=>{
 for(const [text,term]of cases)for(const field of ['struck','excluded']){const d=make(text),at=text.indexOf(term)+term.length;d[field].push({start:at,end:at+1});assert.equal(check(d).length,0,text+' right gap '+field);}
 for(const [text]of cases.filter(c=>c[0].includes('let')))for(const field of ['struck','excluded']){const d=make(text),at=text.indexOf('let')+1;d[field].push({start:at,end:at+1});assert.equal(check(d).length,0,text+' causal word '+field);}
});
test('an independently intact compound noun head still receives its correction',()=>{
 for(const [text,term,good,last]of [['The agency shall let the child care program lapse.','child care','childcare','lapse'],['The agency shall let the land fill program lapse.','land fill','landfill','lapse'],['The agency shall let the cash flow analysis proceed.','cash flow','cashflow','proceed'],['The agency reviews the water courses program.','water courses','watercourses','program']]){const d=make(text);if(last!=='program'){const at=text.indexOf(last)+1;d.struck.push({start:at,end:at+1});}const r=check(d);assert.equal(r.length,1,text);assert.equal(r[0].suggestion,good);assert.equal(d.text.slice(r[0].start,r[0].end),term);assert.equal(check(make(text.replace(term,good))).length,0);}
});
test('known long page gaps retain the whole finite verb protection without a200-character cutoff',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The agency shall let','AB 9999 — '+('recognized page label '.repeat(15))+'2 —\nline 1 the child care for the pets.']),b=d.blocks.find(b=>b.page===2&&!b.margin);b.ignored=true;b.layoutLabel=true;b.formatting={headerParts:[{}]};d.excluded.push({start:b.start,end:b.end});const saved=JSON.stringify(d);assert.equal(check(d).length,0);assert.equal(JSON.stringify(d),saved);
});
test('complete original verb boundaries cannot invent a known domain word from a masked Unicode suffix',()=>{
 for(const [text,,word]of cases)for(const suffix of ['α','\u0301']){const at=text.indexOf(word)+word.length,d=make(text.slice(0,at)+suffix+text.slice(at));d.excluded.push({start:at,end:at+suffix.length});const r=check(d);assert.equal(r.length,1,text+suffix+' finite domain does not match original token');}
});
test('protection context is refreshed after uncertainty changes on the same document',()=>{
 const d=make('The child care program is required.');assert.equal(check(d).length,1);const at=d.text.indexOf('child')+1;d.struck.push({start:at,end:at+1});assert.equal(check(d).length,0);d.struck=[];assert.equal(check(d).length,1);
});

test('searchable coverage distinguishes conservative verb protection from positive evidence and semantic certification',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete listed noun evidence');assert.ok(row);for(const word of ['only to prevent','never to create','old200-character','Unknown verb vocabulary'])assert.ok(row.text.includes(word),word);
 const record=styleRuleInventory(refs).find(r=>r.guide==='lcb'&&r.text?.includes('childcare')&&r.scope?.includes('only to prevent'));assert.ok(record);assert.equal(record.status,'Partially automated');
});
