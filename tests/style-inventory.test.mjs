import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {styleRuleInventory,searchRuleInventory} from '../app/style-rule-inventory.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));

test('ordinary opening coverage identifies Digest boundaries competing body roles and source citation safeguards',()=>{
 const rows=styleRuleInventory(refs);for(const id of ['lcb-21-general-1','gpo-12.16']){const r=rows.find(r=>r.id===id);assert.equal(r.status,'Partially automated');assert.match(r.scope,/first sentence after the actual Digest heading/);assert.match(r.scope,/H\.R\.\/S\.R\./);assert.match(r.scope,/explicitly unresolved sentence\/label roles/);assert.match(r.scope,/not whole numeral-rule automation/);}const r=CHECK_COVERAGE.find(r=>r.title==='Ordinary integers at source sentence openings');assert.equal(r.status,'Conditional opening and Digest boundary review');assert.match(r.text,/Percentages require an intact finite clause/);
});

test('large numeric coverage preserves exact values and conditional source methods without full-rule claims',()=>{
 const rows=styleRuleInventory(refs);for(const id of ['lcb-21-general-1','lcb-21-bill-1','lcb-21-digest-1','gpo-12.16']){const row=rows.find(r=>r.id===id);assert.equal(row.status,'Partially automated');assert.match(row.scope,/9007199254740991/);assert.match(row.scope,/unresolved sentence\/label roles/);assert.match(row.scope,/not whole numeral-rule automation/);}
 for(const id of ['lcb-21-bill-4','lcb-21-digest-2','gpo-12.10']){const row=rows.find(r=>r.id===id);assert.equal(row.status,'Partially automated');assert.match(row.scope,/exact digit strings/);assert.match(row.scope,/no rounded value or invented very large word form/);}
 const grouping=rows.find(r=>r.id==='gpo-12.14');assert.equal(grouping.status,'Partially automated');assert.match(grouping.scope,/without a fifteen-digit cap/);assert.match(grouping.scope,/independently guarded/);assert.match(grouping.scope,/not universal number classification/);assert.ok(searchRuleInventory(refs,'exact source grouping').some(r=>r.id==='gpo-12.16'));
 assert.match(CHECK_COVERAGE.find(r=>r.title==='Quantity separators').text,/Every original digit is preserved/);assert.equal(CHECK_COVERAGE.find(r=>r.title==='Exact large integer values and openings').status,'Exact values and conditional opening review');
});
test('decimal opening coverage stays conditional and attaches to the actual general LCB and GPO rule passages',()=>{
 const rows=styleRuleInventory(refs),lcb=rows.find(r=>r.id==='lcb-21-general-1'),gpo=rows.find(r=>r.id==='gpo-12.16');for(const row of [lcb,gpo]){assert.ok(row);assert.equal(row.status,'Partially automated');assert.match(row.scope,/Complete unsigned decimal/);assert.match(row.scope,/no decimal wording or automatic replacement/);assert.match(row.scope,/contents labels/);assert.match(row.scope,/not full sentence parsing/);}assert.match(lcb.text,/Spell out all numbers/);assert.match(gpo.text,/beginning of a sentence/);const method=CHECK_COVERAGE.find(r=>r.title==='Complete sentence-opening decimal quantities');assert.equal(method.status,'Conditional sentence review');assert.match(method.text,/explicit finite predicate/);
});
test('proper-fraction opening coverage preserves partial status precise ownership and the mixed-fraction conflict exception',()=>{
 const rows=styleRuleInventory(refs);for(const id of ['lcb-21-general-1','lcb-21-bill-1','lcb-21-digest-1','gpo-12.16','gpo-12.26']){const row=rows.find(r=>r.id===id);assert.ok(row,id);assert.equal(row.status,'Partially automated');assert.match(row.scope,/Complete unsigned proper fractions/);assert.match(row.scope,/Existing precise Bill fraction corrections retain ownership/);assert.match(row.scope,/without floating-point rounding/);assert.match(row.scope,/GPO12.26 mixed-fraction figures and actual guide conflicts stay excluded/);assert.match(row.scope,/not full fraction or sentence automation/);}const method=CHECK_COVERAGE.find(r=>r.title==='Complete sentence-opening proper fractions');assert.equal(method.status,'Conditional fraction review');
});
test('LCB communication-head coverage records source gains and retained role exclusions',()=>{
 const row=styleRuleInventory(refs).find(r=>r.guide==='lcb'&&r.page===9&&r.text==='audiovideo');assert.ok(row);assert.match(row.scope,/communication\/communications/);assert.match(row.scope,/noun-only exceptions/);assert.equal(row.status,'Partially automated');const note=CHECK_COVERAGE.find(r=>r.title==='Communication modifier heads');assert.match(note.text,/Four independently inspected original AB1502/);assert.match(note.text,/without claiming a separate GPO/);
});
test('finite LCB role inventory exposes complete cue safeguards and independent alternatives',()=>{
 const rows=styleRuleInventory(refs);for(const word of ['inservice','man-made','weeklong','case law']){const row=rows.find(r=>r.guide==='lcb'&&r.text.startsWith(word)&&r.scope?.includes('100-character preceding window'));assert.ok(row,word);assert.match(row.scope,/intact complete modifier\/head/);assert.match(row.scope,/independently intact alternatives/);assert.match(row.scope,/unfamiliar syntax and meaning remain manual/);assert.equal(row.status,'Partially automated');}
 assert.ok(rows.some(r=>r.id==='lcb-2-office-2'&&r.text==='2. adviser, advisor'));
});

test('divided style word coverage retains true compound, exact-case custom term and authority limits',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Divided words in style checks');assert.ok(row);assert.match(row.text,/existing contextual checks/);assert.match(row.text,/original PDF text/);assert.match(row.text,/Listed compound hyphens/);assert.match(row.text,/first-listed dictionary authority/);assert.match(row.text,/Saved case-sensitive terms/);assert.match(row.text,/Unknown words/);assert.match(styleRuleInventory(refs).find(r=>r.id==='lcb-2-2').scope,/Full dictionary data/);
});

test('Supreme Court mapping describes selected state qualifiers with LCB priority and unresolved jurisdiction limits',()=>{
 const row=styleRuleInventory(refs).find(r=>r.id==='lcb-entry-20-supreme-court-u-s-and-state');assert.equal(row.status,'Partially automated');assert.equal(row.text,'Supreme Court (U.S. and state)');assert.match(row.scope,/United States/);assert.match(row.scope,/California\/Ohio/);assert.match(row.scope,/state-prefix and of-this\/that\/the-state/);assert.match(row.scope,/intact finite court predicate/);assert.match(row.scope,/including where GPO differs/);assert.match(row.scope,/Unresolved jurisdiction/);assert.match(row.scope,/Complete qualifier\/name evidence/);assert.match(row.scope,/Other variants, meanings and exceptions are not certified/);
});

test('compass coverage retains its printed principle and separate manual alignment example',()=>{
 const row=styleRuleInventory(refs).find(r=>r.id==='gpo-6.14');assert.equal(row.page,114);assert.equal(row.status,'Partially automated');assert.match(row.text,/three points are combined/);assert.match(row.text,/north-northeast/);assert.match(row.text,/south-southwest/);assert.match(row.text,/north-south alignment/);assert.match(row.scope,/Eight known/);assert.match(row.scope,/complete expression/);assert.match(row.scope,/north-south alignment example remain manual/);assert.match(row.scope,/does not certify every/);
});

test('source initialism coverage retains literal HUD limits and source pronunciation examples',()=>{
 const rows=styleRuleInventory(refs);for(const id of ['gpo-5.16','gpo-5.17','gpo-5.18']){const row=rows.find(r=>r.id===id);assert.equal(row.status,'Partially automated');assert.equal(row.page,108);assert.match(row.scope,/manual|unfamiliar/);assert.match(row.scope,/lettered references/);}
 const hud=rows.find(r=>r.id==='gpo-5.16');assert.match(hud.text,/an H-U-D directive/);assert.match(hud.text,/a HUD directive/);assert.match(hud.scope,/does not certify every/);
 assert.match(rows.find(r=>r.id==='gpo-5.18').scope,/BLS\/GAO\/WWW\/CIO\/UFO\/AEC\/NSC\/RFC/);
});

test('GPO10.6 retains its source rule and bounded two-endpoint unit scope',()=>{
 const row=styleRuleInventory(refs).find(r=>r.id==='gpo-10.6');assert.equal(row.page,277);assert.equal(row.status,'Partially automated');assert.match(row.text,/symbol set close up to figures/);assert.match(row.scope,/missing first endpoint/);assert.match(row.scope,/mixed-unit/);assert.match(row.scope,/Currency, temperature, longer series/);assert.match(row.scope,/does not certify every/);
});

test('GPO 6.38 has bounded fraction automation with its true printed rule and retained exceptions',()=>{
 const row=styleRuleInventory(refs).find(r=>r.id==='gpo-6.38');assert.equal(row.page,121);assert.equal(row.status,'Partially automated');assert.match(row.text,/omit it between the numerator and the denominator/);assert.match(row.scope,/line\/page wraps/);assert.match(row.scope,/internal-element hyphens/);assert.match(row.scope,/manual review/);assert.match(row.scope,/conflicts remain excluded/);
});
test('coverage inventory retains every nonempty source page and distinguishes source presence from automation',()=>{
 const items=styleRuleInventory(refs);assert.ok(items.length>500);
 for(const id of ['lcb','gpo'])for(const p of refs[id].pages.filter(p=>p.text.trim()))assert.ok(items.some(i=>i.guide===id&&(i.page===p.page||i.text.includes(p.text.trim().slice(0,40).replace(/\s+/g,' ')))),id+' page '+p.page);
 assert.ok(items.some(i=>i.id==='gpo-6.15'&&i.status==='Partially automated'));assert.ok(items.some(i=>i.status==='Not yet assessed'));
 assert.ok(items.some(i=>i.id==='gpo-8.8'&&i.text.includes('Possessive pronouns')));
 assert.equal(new Set(items.map(i=>i.id)).size,items.length);assert.ok(searchRuleInventory(refs,'LCB unit modifier').length>0);
});

test('LCB repeated rule numbers retain distinct general, bill and digest entries',()=>{
 const rows=styleRuleInventory(refs).filter(r=>r.id.startsWith('lcb-21-'));
 assert.equal(rows.length,12);assert.equal(new Set(rows.map(r=>r.id)).size,12);
 assert.ok(rows.some(r=>r.id==='lcb-21-bill-1'&&/fractions/.test(r.text)));
 assert.ok(rows.some(r=>r.id==='lcb-21-digest-1'&&/except the number one/.test(r.text)));
 assert.ok(styleRuleInventory(refs).some(r=>r.id==='lcb-17-7'&&r.status==='Partially automated'&&r.scope.includes('snapshot')));
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

test('compound personal pronoun coverage records supported emphatic roles and manual limits',()=>{
 const rule=styleRuleInventory(refs).find(r=>r.id==='gpo-6.13');assert.equal(rule.page,114);assert.equal(rule.status,'Partially automated');assert.match(rule.scope,/matching explicit pronoun subject/);assert.match(rule.scope,/Noun subjects, coordination, unknown predicates/);assert.match(rule.scope,/broader meaning still require manual review/);
});

test('directional capitalization coverage cites the exact agreeing example with geographic limits',()=>{
 const rule=styleRuleInventory(refs).find(r=>r.id==='gpo-3.23');assert.equal(rule.page,48);assert.equal(rule.status,'Partially automated');assert.match(rule.scope,/southern California/);assert.match(rule.scope,/GPO 3.22/);assert.match(rule.scope,/other unencoded geographic meanings remain manual/);
});

test('modifier coverage identifies printed forms and retired unlisted entry guesses',()=>{
 const rule=styleRuleInventory(refs).find(r=>r.id==='gpo-6.15');assert.equal(rule.status,'Partially automated');assert.match(rule.scope,/exact printed LCB\/GPO forms/);assert.match(rule.scope,/entry-level.*disabled/);assert.match(rule.scope,/specific complete noun evidence/);assert.match(rule.scope,/no whole-rule or accuracy certification/);
});

test('unlisted participle guesses are disabled while complete source conditions remain required',()=>{
 const rule=styleRuleInventory(refs).find(r=>r.id==='gpo-6.15');assert.equal(rule.status,'Partially automated');assert.match(rule.scope,/unlisted participle guesses/);assert.match(rule.scope,/Complete source, noun and role evidence/);assert.match(rule.scope,/Quoted bill-local forms/);
});

test('office definition scope records exact source bindings and unresolved hierarchy limits',()=>{
 const row=styleRuleInventory(refs).find(r=>r.id==='lcb-17-3');
 assert.equal(row.status,'Partially automated');assert.match(row.scope,/this-section/);assert.match(row.scope,/identical source code title/);assert.match(row.scope,/local conflicting definitions/);assert.match(row.scope,/article\/chapter\/subdivision boundaries/);assert.match(row.scope,/not an official code registry/);
 assert.ok(searchRuleInventory(refs,'this-code').some(r=>r.id===row.id));
});

test('LCB explicit unit definitions record full-symbol checks and finite name-role limits',()=>{
 const rows=styleRuleInventory(refs);for(const name of ['kilowatt','megawatt','megabyte']){
  const row=rows.find(r=>r.guide==='lcb'&&r.page===19&&r.text.startsWith(name+' ('));assert.equal(row.status,'Partially automated');assert.match(row.scope,/interletter spaces, dots and plural s/);assert.match(row.scope,/capacity\/output roles/);assert.match(row.scope,/remain manual/);
 }
 assert.ok(searchRuleInventory(refs,'interletter spaces').some(r=>r.guide==='lcb'&&r.page===19));
});

test('local office scopes expose supported ownership and coordination without claiming title semantics',()=>{
 const rows=styleRuleInventory(refs);for(const term of ['controller (local)','treasurer (local)']){const row=rows.find(r=>r.guide==='lcb'&&r.text===term);assert.equal(row.status,'Partially automated');assert.match(row.scope,/possessives/);assert.match(row.scope,/of\/for/);assert.match(row.scope,/coordination/);assert.match(row.scope,/ordinary plurals/);assert.match(row.scope,/remain manual/);}
 const court=rows.find(r=>r.guide==='lcb'&&r.text==='court (appearing alone)');assert.match(court.scope,/court\/courts/);assert.match(court.scope,/legal hierarchy remain manual/);assert.ok(searchRuleInventory(refs,'shared controller').some(r=>r.guide==='lcb'));
});
