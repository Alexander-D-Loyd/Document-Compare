import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {lcbContextualIssues} from '../app/lcb-contextual.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),target=d=>jointStylisticIssues(d,refs).filter(i=>/Hyphenation examples: (?:high-quality|non-English-speaking)/.test(i.rule));
test('source-observed educational adjective series supplies the complete noun head',()=>{
 const t='Funds support the implementation of high quality integrated academic, behavioral, and social-emotional learning practices in schools.',d=make(t),r=target(d);assert.deepEqual(r.map(i=>i.suggestion),['high-quality']);assert.equal(r[0].text,'high quality');assert.equal(r[0].guidePage,11);assert.equal(target(make(t.replace('high quality','high-quality'))).length,0);
});
test('a coordinated bilingual descriptor preserves the first complete language modifier',()=>{
 const t='Programs serve areas with concentrations of non-English speaking and bilingual households.',d=make(t),r=target(d);assert.deepEqual(r.map(i=>i.suggestion),['non-English-speaking']);assert.equal(r[0].text,'non-English speaking');assert.equal(r[0].guidePage,12);assert.equal(target(make(t.replace('non-English speaking','non-English-speaking'))).length,0);
});
test('selected two and three adjective orders retain full noun evidence and separate selected words',()=>{
 for(const ending of ['academic and behavioral learning practices','integrated behavioral, academic, and social-emotional learning practices','social-emotional or academic learning practices']){const d=make('The agency supports high quality '+ending+'.'),r=target(d);assert.equal(r.length,1,ending);assert.equal(r[0].text,'high quality');}
 for(const noun of ['households','workers','students']){const d=make('The agency serves non-English speaking and multilingual '+noun+'.'),r=target(d);assert.equal(r.length,1,noun);assert.equal(r[0].text,'non-English speaking');}
});
test('descriptor head needs complete independent nominal evidence and familiar exact terms',()=>{
 for(const t of ['The high quality integrated academic, behavioral, and social-emotional learning practices.','The high quality integrated unknown and academic learning practices apply.','The high quality academic and behavioral learning practicism applies.','The high quality academic and behavioral learning practicesα apply.','The High Quality Integrated Academic, Behavioral, and Social-Emotional Learning Practices Institute acts.','The non-English speaking and bilingual unknowns apply.','The non-English speaking and Bilingual Households Association acts.','The loan is short term and shall be repaid.'])assert.equal(target(make(t)).length,0,t);
});
test('all descriptors, the noun and the establishing cue stay protected against table, strike and unknown content',()=>{
 const texts=['The agency supports high quality integrated academic,\nbehavioral, and social-emotional learning practices.','The agency serves non-English speaking\nand bilingual households.'];for(const t of texts){const d=make(t);d.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(target(d).length,0);const s=make(t),start=s.text.indexOf(t.includes('academic')?'behavioral':'bilingual');s.struck=[{start,end:start+(t.includes('academic')?10:9)}];assert.equal(target(s).length,0);}
 const u=make('The agency supports high quality academic\nunknown marker\nand behavioral learning practices.'),b=u.blocks[1];b.ignored=true;u.excluded.push({start:b.start,end:b.end});assert.equal(target(u).length,0);assert.equal(target(make('The term "high quality integrated academic,\nbehavioral, and social-emotional learning practices" is literal.')).length,0);
});
test('identified page heads retain the full divided selected modifier, excluding the descriptors from its range',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The agency supports high','AB 9999 — 2 —\nline 1 quality integrated academic, behavioral, and social-emotional learning practices.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const r=target(d);assert.equal(r.length,1);assert.equal(r[0].text,d.text.slice(r[0].start,r[0].end));assert.equal(r[0].end,d.text.indexOf('quality integrated')+7);assert.ok(r[0].text.includes('AB 9999'));
});
test('an independent preceding cue survives a protected following predicate, with source ranges unchanged',()=>{
 const d=make('The agency supports high quality academic and behavioral learning practices\nare adopted.');d.blocks[1].formatting={headerGaps:[{},{}]};const before=JSON.stringify(d),r=lcbContextualIssues(d,refs).filter(i=>i.suggestion==='high-quality');assert.equal(r.length,1);assert.equal(r[0].text,'high quality');assert.equal(JSON.stringify(d),before);
});
test('coverage and source inventory retain the finite descriptor and independent evidence limits',()=>{
 const coverage=CHECK_COVERAGE.find(r=>r.title==='Qualified descriptor noun heads');assert.match(coverage.text,/complete independent nominal evidence/);assert.match(coverage.text,/not a general parser/);const entries=styleRuleInventory(refs).filter(r=>r.guide==='lcb'&&r.status==='Partially automated'&&/Selected two\/three distinct lowercase educational descriptor/.test(r.scope||''));assert.ok(entries.length>0);for(const r of entries)assert.match(r.scope,/unknown descriptors and semantic roles remain manual/);
});
