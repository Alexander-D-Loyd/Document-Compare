import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {styleRuleInventory,searchRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('coverage inventory retains every nonempty source page and distinguishes source presence from automation',()=>{
 const items=styleRuleInventory(refs);assert.ok(items.length>500);
 for(const id of ['lcb','gpo'])for(const p of refs[id].pages.filter(p=>p.text.trim()))assert.ok(items.some(i=>i.guide===id&&(i.page===p.page||i.text.includes(p.text.trim().slice(0,40).replace(/\s+/g,' ')))),id+' page '+p.page);
 assert.ok(items.some(i=>i.id==='gpo-6.15'&&i.status==='Partially automated'));assert.ok(items.some(i=>i.status==='Not yet assessed'));
 assert.ok(items.some(i=>i.id==='gpo-8.8'&&i.text.includes('Possessive pronouns')));
 assert.equal(new Set(items.map(i=>i.id)).size,items.length);assert.ok(searchRuleInventory(refs,'LCB unit modifier').length>0);
});

test('LCB repeated rule numbers retain distinct general, bill and digest entries',()=>{
 const rows=styleRuleInventory(refs).filter(r=>r.guide==='lcb'&&r.page===21);
 assert.equal(rows.length,10);assert.equal(new Set(rows.map(r=>r.id)).size,10);
 assert.ok(rows.some(r=>r.id==='lcb-21-bill-1'&&/fractions/.test(r.text)));
 assert.ok(rows.some(r=>r.id==='lcb-21-digest-1'&&/except the number one/.test(r.text)));
 assert.ok(styleRuleInventory(refs).some(r=>r.id==='lcb-17-7'&&r.status==='Manual review required'));
});

test('audited GPO production rules stay searchable with explicit exclusions and manual-review reasons',()=>{
 const rows=styleRuleInventory(refs).filter(r=>/^gpo-1\./.test(r.id));assert.equal(rows.length,22);
 assert.equal(rows.filter(r=>r.status==='Not applicable to legislative prose').length,18);
 assert.equal(rows.filter(r=>r.status==='Manual review required').length,4);
 assert.ok(rows.every(r=>r.scope.length>50));assert.equal(rows.find(r=>r.id==='gpo-1.7').status,'Manual review required');
 assert.ok(searchRuleInventory(refs,'chemical symbols').some(r=>r.id==='gpo-1.6'));
});

test('GPO examples remain attached to their governing rule in coordinate reading order',()=>{
 const rows=styleRuleInventory(refs),open=rows.find(r=>r.id==='gpo-6.16'),predicate=rows.find(r=>r.id==='gpo-6.17');
 assert.ok(open.text.includes('ground water levels'));assert.ok(!predicate.text.includes('ground water levels'));assert.ok(predicate.text.includes('duties were price fixing'));
 assert.ok(refs.gpo.pages[114].flowText.indexOf('6.16.')<refs.gpo.pages[114].flowText.indexOf('ground water levels'));
 assert.equal(rows.filter(r=>/^gpo-\d+\./.test(r.id)).length,783);
});

test('last numbered rules do not absorb unnumbered examples from the following chapter',()=>{
 const rows=styleRuleInventory(refs),last=rows.filter(r=>/^gpo-3\./.test(r.id)).at(-1);assert.ok(last.text.length<10000);assert.ok(!last.text.includes('5. Spelling'));
 assert.ok(rows.some(r=>r.title.includes('Capitalization Examples')&&r.id.startsWith('gpo-page-')));
});

test('punctuation chapter accounts for 153 numbered rules with explicit limits and conflict policy',()=>{
 const rows=styleRuleInventory(refs).filter(r=>/^gpo-8\./.test(r.id));assert.equal(rows.length,153);
 assert.ok(rows.every(r=>r.status!=='Not yet assessed'&&r.scope.length>50));
 assert.equal(rows.find(r=>r.id==='gpo-8.9').status,'Partially automated');
 assert.equal(rows.find(r=>r.id==='gpo-8.47').status,'Manual review required');
 assert.ok(rows.find(r=>r.id==='gpo-8.139').scope.includes('excluded'));
});

test('numeral chapter distinguishes tested checks, semantic limits and excluded guide conflicts',()=>{
 const rows=styleRuleInventory(refs).filter(r=>/^gpo-12\./.test(r.id));assert.equal(rows.length,29);
 assert.ok(rows.every(r=>r.status!=='Not yet assessed'&&r.scope.length>50));
 assert.equal(rows.find(r=>r.id==='gpo-12.14').status,'Partially automated');
 assert.ok(rows.find(r=>r.id==='gpo-12.26').scope.includes('excluded'));
});

test('discrete lexical source entries reflect implemented contextual word-choice checks',()=>{
 const rows=styleRuleInventory(refs);const advice=rows.find(r=>r.id==='lcb-entry-3-advice-n');
 assert.equal(advice.status,'Partially automated');assert.ok(advice.scope.includes('grammar cue'));
 assert.ok(advice.scope.includes('Other variants, meanings and exceptions'));
});

test('symbol and italic inventories distinguish narrow text checks from unverified typography',()=>{
 const rows=styleRuleInventory(refs);
 for(const [chapter,count] of [[10,18],[11,16]]){const group=rows.filter(r=>r.id.startsWith('gpo-'+chapter+'.'));assert.equal(group.length,count);assert.ok(group.every(r=>r.status!=='Not yet assessed'&&r.scope.length>50));}
 assert.equal(rows.find(r=>r.id==='gpo-10.3').status,'Partially automated');
 assert.ok(rows.find(r=>r.id==='gpo-11.16').scope.includes('font'));
});

test('table chapter preserves explicit geometry limits while recording the narrow amount-cell check',()=>{
 const rows=styleRuleInventory(refs).filter(r=>r.id.startsWith('gpo-13.'));assert.equal(rows.length,123);assert.ok(rows.every(r=>r.status!=='Not yet assessed'&&r.scope.length>50));
 assert.equal(rows.find(r=>r.id==='gpo-13.101').status,'Partially automated');
 assert.equal(rows.find(r=>r.id==='gpo-13.65').status,'Manual review required');
 assert.ok(rows.find(r=>r.id==='gpo-13.29').scope.includes('whole-column'));
});

test('leaderwork, footnotes and address rules retain source-specific context and geometry limits',()=>{
 const rows=styleRuleInventory(refs);
 for(const [chapter,count] of [[14,20],[15,31],[16,28]]){const group=rows.filter(r=>r.id.startsWith('gpo-'+chapter+'.'));assert.equal(group.length,count);assert.ok(group.every(r=>r.status!=='Not yet assessed'&&r.scope.length>50));}
 assert.equal(rows.find(r=>r.id==='gpo-14.1').status,'Partially automated');
 assert.equal(rows.find(r=>r.id==='gpo-16.28').status,'Not applicable to legislative prose');
 assert.ok(rows.find(r=>r.id==='gpo-15.18').scope.includes('footnote'));
});

test('verified source glyphs are readable in guide search as well as rule-flow extraction',()=>{
 for(const field of ['text','flowText']){
  assert.ok(refs.gpo.pages[329][field].includes('Russell Senate Office Building'));
  assert.ok(refs.gpo.pages[415][field].includes('Master Chief Petty Officer'));
  assert.ok(refs.gpo.pages[424][field].includes('Andre´ Carson'));
  assert.ok(refs.gpo.pages[433][field].includes('confirmation'));
 }
 assert.ok(searchRuleInventory(refs,'Russell Senate Office Building').length);
 assert.equal(refs.gpo.pages.length,475);
});

test('unnumbered geologic guidance and differently numbered report-format instructions keep authentic identities',()=>{
 const rows=styleRuleInventory(refs),report=rows.filter(r=>r.id.startsWith('gpo-report-format-'));
 assert.equal(report.length,14);assert.ok(report.every(r=>r.page>=439&&r.page<=441&&r.status==='Not applicable to legislative prose'));
 assert.ok(report.find(r=>r.id==='gpo-report-format-14').text.includes('signed'));
 assert.ok(report.find(r=>r.id==='gpo-report-format-3').text.includes('Letters'));
 assert.equal(rows.find(r=>r.id==='gpo-geologic-formal').status,'Partially automated');
 assert.ok(rows.find(r=>r.id==='gpo-physiographic-names').scope.includes('class'));
 assert.ok(!rows.some(r=>r.id==='gpo-20.1'));
});

test('all numbered chapter-rule entries have an explicit scope including compounding-list interpretation',()=>{
 const rows=styleRuleInventory(refs),numbered=rows.filter(r=>/^gpo-\d+\./.test(r.id));assert.equal(numbered.length,783);assert.ok(numbered.every(r=>r.status!=='Not yet assessed'&&r.scope.length>50));
 const examples=numbered.filter(r=>r.id.startsWith('gpo-7.'));assert.equal(examples.length,13);assert.ok(examples.find(r=>r.id==='gpo-7.12').scope.includes('hierarchy'));
 assert.equal(examples.find(r=>r.id==='gpo-7.8').status,'Manual review required');
});

test("last compounding instruction ends before the source dictionary",()=>{
 const rows=styleRuleInventory(refs),rule=rows.find(r=>r.id==='gpo-7.13');assert.ok(rule.text.length<3000);assert.ok(!rule.text.includes('ground#water'));assert.ok(rows.some(r=>r.id==='gpo-page-127'));
});
test('expanded grouping and semicolon scopes are searchable without claiming full automation',()=>{
 const rows=styleRuleInventory(refs);
 assert.match(rows.find(r=>r.id==='gpo-12.14').scope,/malformed/);
 const series=rows.find(r=>r.id==='gpo-8.148');assert.equal(series.status,'Partially automated');assert.match(series.scope,/General independent clauses/);
 assert.ok(searchRuleInventory(refs,'headcount').some(r=>r.id==='gpo-12.14'));
});
